import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../.cache/ra-assets/node_modules/three/build/three.module.js';
import { GLTFLoader } from '../.cache/ra-assets/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from '../.cache/ra-assets/node_modules/three/examples/jsm/utils/SkeletonUtils.js';
import { CHARACTERS, placeBirthday } from '../birthday.js';

// O teste numérico não precisa de um decodificador de imagens. Só a cópia em
// memória omite os materiais; geometria, ossos, morphs e animações são os reais.
function geometryOnly(bytes) {
  const length = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.subarray(20, 20 + length).toString());
  json.materials = json.materials.map(m => ({ name: m.name }));
  delete json.textures;
  delete json.images;
  const body = Buffer.from(JSON.stringify(json));
  const pad = (4 - body.length % 4) % 4;
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + body.length + pad + bytes.length - 20 - length, 8);
  header.writeUInt32LE(body.length + pad, 12); header.writeUInt32LE(0x4e4f534a, 16);
  return Buffer.concat([header, body, Buffer.alloc(pad, 32), bytes.subarray(20 + length)]);
}

function vertices(scene) {
  scene.updateMatrixWorld(true);
  const points = [];
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
      points.push(mesh.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(mesh.matrixWorld));
    }
  });
  return points;
}

const templates = [];
for (const item of CHARACTERS) {
  const bytes = geometryOnly(await readFile(new URL('../' + item.path, import.meta.url)));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length), '');
  templates.push({ ...item, gltf });
  const rest = vertices(gltf.scene), bounds = new THREE.Box3().setFromPoints(rest);
  const size = bounds.getSize(new THREE.Vector3()), extent = size.length();
  const movement = [];
  for (const clip of gltf.animations) {
    const mixer = new THREE.AnimationMixer(gltf.scene);
    mixer.clipAction(clip).play();
    let maximum = 0;
    for (const time of [0.75, 1.5, 3, 4.5, 6]) {
      mixer.setTime(time);
      const current = vertices(gltf.scene);
      for (let i = 0; i < current.length; i++) {
        const delta = current[i].distanceTo(rest[i]) / extent;
        maximum = Math.max(maximum, delta);
        if (time === 6) assert.ok(delta < 1e-5, `${item.name}: ciclo retorna à pose inicial`);
        if (!['mew','sakura'].includes(item.id) && rest[i].y < bounds.min.y + size.y * 0.12) {
          assert.ok(delta < 1e-5, `${item.name}: apoio dos pés preservado`);
        }
      }
    }
    assert.ok(maximum > 1e-5, `${item.name}: ${clip.name} deforma os vértices`);
    movement.push(maximum);
    mixer.stopAllAction(); mixer.uncacheRoot(gltf.scene);
  }
  if (movement.length > 1) assert.ok(movement[1] < movement[0] * 0.7, `${item.name}: movimento reduzido é mais suave`);
}

const scene = new THREE.Scene();
const runtime = { THREE, scene, cloneModel: clone, animationPaused: false };
const encounter = placeBirthday(runtime, templates, new THREE.Vector3(0, 0, -1));
const anchors = encounter.root.children.map(node => node.position.clone());
const rest = vertices(encounter.root);
assert.ok(rest.every(point=>point.z<0),'Geometria de todos os modelos fica à frente da direção inicial');
encounter.update(1.5);
const animated = vertices(encounter.root);
assert.ok(animated.every(point=>point.z<0),'A animação também permanece na metade frontal');
assert.ok(animated.some((p, i) => p.distanceTo(rest[i]) > 1e-4), 'O encontro reproduz os clips nas instâncias clonadas');
encounter.root.children.forEach((node, i) => assert.deepEqual(node.position, anchors[i], 'Âncoras fixas'));
runtime.animationPaused = true; encounter.update(1);
assert.deepEqual(vertices(encounter.root), animated, 'Pausa congela todos os modelos');
encounter.dispose(); encounter.dispose(); assert.equal(scene.children.length, 0);
console.log('OK: sete modelos deformam no GLTFLoader real; ciclos contínuos, pés fixos, movimento reduzido, instâncias animadas e pausa conjunta.');
