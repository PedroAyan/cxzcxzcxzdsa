// Gera versões animadas para a web sem alterar os GLB enviados pelo usuário.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NodeIO } from '../.cache/ra-assets/node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../.cache/ra-assets/node_modules/@gltf-transform/extensions/dist/index.js';
import { prune } from '../.cache/ra-assets/node_modules/@gltf-transform/functions/dist/index.js';
import * as THREE from '../.cache/ra-assets/node_modules/three/build/three.module.js';

const sources = {
  melody: 'my_melody_from_sanrio.glb', rick: 'rick_sanchez.glb', coraline: 'coraline.glb',
  sakura: 'stylized_cherry_blossom_flower.glb', sylveon: 'sylveon.glb', umbreon: 'umbreon.glb',
  piano: 'my_sweet_piano_plushie_with_bones.glb',
};
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const out = new URL('../models/aniversario/', import.meta.url);
await mkdir(out, { recursive: true });
const report = [];
const duration = 6;
const times = Float32Array.from({ length: 181 }, (_, i) => i * duration / 180);
const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

function addChannel(doc, clip, input, node, path, type, values) {
  const output = doc.createAccessor(`${node.getName()}-${path}`).setType(type)
    .setArray(new Float32Array(values)).setBuffer(doc.getRoot().listBuffers()[0]);
  const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
  clip.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(sampler));
}

function addRotation(doc, clip, input, name, offsets) {
  const node = doc.getRoot().listNodes().find(n => n.getName() === name);
  if (!node) throw new Error(`Osso ausente: ${name}`);
  const rest = new THREE.Quaternion().fromArray(node.getRotation());
  const values = Array.from(times).flatMap(t => rest.clone().multiply(new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(...offsets(t * 2 * Math.PI / duration)))).normalize().toArray());
  addChannel(doc, clip, input, node, 'rotation', 'VEC4', values);
}

function animateRig(doc, id, input) {
  for (const gentle of [false, true]) {
    const clip = doc.createAnimation(gentle ? 'Idle suave' : 'Idle');
    const amount = gentle ? 0.25 : 1;
    const rotate = (name, fn) => addRotation(doc, clip, input, name, t => fn(t).map(v => v * amount));
    if (id === 'rick') {
      rotate('DEF-spine.003_3', t => [0.018 * Math.sin(2 * t), 0, 0.012 * Math.sin(t)]);
      rotate('DEF-spine.006_0', t => [0.045 * Math.sin(2 * t), 0.065 * Math.sin(t), 0.035 * Math.sin(t)]);
      if (!gentle) {
        // Aceno lento: sobe o braço, move a mão e volta à pose de descanso.
        rotate('DEF-upper_arm.L_229', t => [0, 0, -0.7 * (1 - Math.cos(t)) / 2]);
        rotate('DEF-forearm.L_227', t => [0.55 * (1 - Math.cos(t)) / 2, 0, 0]);
        rotate('DEF-hand.L_225', t => [0, 0, 0.23 * Math.sin(3 * t) * (1 - Math.cos(t)) / 2]);
      }
    } else if (id === 'piano') {
      if (!gentle) for (const node of doc.getRoot().listNodes().filter(n => /hair[A-C]_00_physics/.test(n.getName()))) {
        rotate(node.getName(), t => [0.05 * Math.sin(2 * t), 0, 0.085 * Math.sin(t)]);
      }
    } else {
      rotate('Head_056', t => [0.045 * Math.sin(t), 0.065 * Math.sin(t), 0.025 * Math.sin(2 * t)]);
      if (!gentle) {
        for (const [name, sign] of [['LEar1_060', 1], ['REar1_081', -1]]) {
          rotate(name, t => [0, 0.07 * Math.sin(2 * t), sign * 0.085 * Math.sin(t)]);
        }
        for (let i = 1; i <= 4; i++) rotate(`Tail${i}_0${16 + i}`, t => [0, 0.095 * Math.sin(t), 0.05 * Math.sin(2 * t)]);
        for (const node of doc.getRoot().listNodes().filter(n => /^[LR]Feeler[BCH][1-8]_/.test(n.getName()))) {
          rotate(node.getName(), t => [0, 0.025 * Math.sin(t), 0.025 * Math.sin(2 * t)]);
        }
      }
    }
  }
}

function sceneBounds(doc) {
  const box = new THREE.Box3();
  for (const node of doc.getRoot().listNodes()) {
    const matrix = new THREE.Matrix4().fromArray(node.getWorldMatrix());
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
      const position = primitive.getAttribute('POSITION');
      for (let i = 0; i < position.getCount(); i++) box.expandByPoint(new THREE.Vector3()
        .fromArray(position.getElement(i, [])).applyMatrix4(matrix));
    }
  }
  return box;
}

// Arquivos sem esqueleto recebem deformação do próprio modelo. As máscaras são
// contínuas e deixam a região dos pés imóvel; rosto e acessórios se movem juntos.
function deform(id, shape, point, box) {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const h = (point.y - box.min.y) / size.y;
  const p = point.clone();
  if (id === 'sakura') {
    const radius = Math.hypot(p.x - center.x, p.z - center.z);
    p.y += size.x * 0.025 * smooth(size.x * 0.12, size.x * 0.45, radius);
    return p;
  }
  if (shape === 0) {
    const breath = smooth(0.18, 0.4, h) * (1 - smooth(0.66, 0.79, h));
    p.x += (p.x - center.x) * 0.018 * breath;
    p.z += (p.z - center.z) * 0.018 * breath;
    p.y += size.y * 0.003 * breath;
    return p;
  }
  const sign = shape % 2 ? 1 : -1;
  if (id === 'umbreon' && shape >= 3) {
    const tail = smooth(0.22, 0.55, -(p.z - center.z) / size.z) * smooth(0.12, 0.3, h);
    p.x += size.y * 0.075 * tail * sign;
    return p;
  }
  const roundHead = id === 'melody' || id === 'piano';
  const head = id === 'umbreon'
    ? smooth(0.48, 0.68, h) * smooth(0.05, 0.25, (p.z - center.z) / size.z)
    : smooth(roundHead ? 0.46 : 0.67, roundHead ? 0.65 : 0.82, h);
  const pivot = new THREE.Vector3(center.x, box.min.y + size.y * (roundHead ? 0.57 : 0.72), center.z);
  p.sub(pivot).applyAxisAngle(new THREE.Vector3(0, 1, 0), sign * 0.12 * head)
    .applyAxisAngle(new THREE.Vector3(0, 0, 1), sign * 0.04 * head).add(pivot);
  if (id === 'melody' || id === 'umbreon') p.x += sign * size.y * 0.018 * smooth(0.78, 1, h);
  return p;
}

function animateMorphs(doc, id, input) {
  const box = sceneBounds(doc);
  const count = id === 'sakura' ? 1 : id === 'umbreon' ? 5 : 3;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const world = new THREE.Matrix4().fromArray(node.getWorldMatrix());
    const inverse = world.clone().invert();
    for (const primitive of mesh.listPrimitives()) {
      const position = primitive.getAttribute('POSITION');
      const normal = primitive.getAttribute('NORMAL');
      for (let shape = 0; shape < count; shape++) {
        const positions = new Float32Array(position.getCount() * 3);
        const deltas = new Float32Array(positions.length);
        for (let i = 0; i < position.getCount(); i++) {
          const local = new THREE.Vector3().fromArray(position.getElement(i, []));
          const changed = deform(id, shape, local.clone().applyMatrix4(world), box).applyMatrix4(inverse);
          changed.toArray(positions, i * 3);
          changed.sub(local).toArray(deltas, i * 3);
        }
        const target = doc.createPrimitiveTarget(`Movimento ${shape + 1}`).setAttribute('POSITION', doc.createAccessor()
          .setType('VEC3').setArray(deltas).setBuffer(position.getBuffer()));
        if (normal) {
          // Recalcula só a diferença das normais para preservar a iluminação ao deformar.
          const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3));
          const index = primitive.getIndices();
          if (index) geometry.setIndex(new THREE.BufferAttribute(index.getArray(), 1));
          geometry.computeVertexNormals();
          const normals = geometry.getAttribute('normal').array;
          for (let i = 0; i < normals.length; i++) normals[i] -= normal.getArray()[i];
          target.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(normals).setBuffer(position.getBuffer()));
          geometry.dispose();
        }
        primitive.addTarget(target);
      }
    }
    mesh.setWeights(Array(count).fill(0));
    node.setWeights(Array(count).fill(0));
    for (const gentle of [false, true]) {
      let clip = doc.getRoot().listAnimations().find(a => a.getName() === (gentle ? 'Idle suave' : 'Idle'));
      clip ??= doc.createAnimation(gentle ? 'Idle suave' : 'Idle');
      const values = Array.from(times).flatMap(t => {
        const phase = t * 2 * Math.PI / duration;
        const breath = (1 - Math.cos(2 * phase)) / 2 * (gentle ? 0.4 : 1);
        if (count === 1) return [breath];
        const look = gentle ? 0 : Math.sin(phase);
        const weights = [breath, Math.max(0, look), Math.max(0, -look)];
        if (count === 5) weights.push(Math.max(0, look), Math.max(0, -look));
        return weights;
      });
      addChannel(doc, clip, input, node, 'weights', 'SCALAR', values);
    }
  }
}

for (const [id, filename] of Object.entries(sources)) {
  const original = await readFile(new URL('../modelos-aniversario/' + filename, import.meta.url));
  const doc = await io.readBinary(original);
  if (id === 'melody') {
    const base = doc.getRoot().listNodes().find(n => n.getName() === 'base_428');
    if (!base) throw new Error('Base verde da My Melody não encontrada.');
    const remove = node => { node.listChildren().forEach(remove); node.dispose(); };
    remove(base);
    await doc.transform(prune({ keepLeaves: true }));
  }
  const input = doc.createAccessor('Tempos Idle').setType('SCALAR').setArray(times).setBuffer(doc.getRoot().listBuffers()[0]);
  if (doc.getRoot().listSkins().length) animateRig(doc, id, input);
  else animateMorphs(doc, id, input);
  if (id === 'piano') animateMorphs(doc, id, input);
  const bytes = await io.writeBinary(doc);
  await writeFile(new URL(id + '.glb', out), bytes);
  report.push({ id, source: filename, sourceSHA256: createHash('sha256').update(original).digest('hex'), bytes: bytes.length,
    animations: doc.getRoot().listAnimations().map(a => ({ name: a.getName(), channels: a.listChannels().length })),
    duration, greenBaseRemoved: id === 'melody' ? true : undefined });
  console.log(`${id}: ${bytes.length} bytes, Idle e Idle suave`);
}
await writeFile(new URL('preparacao.json', out), JSON.stringify(report, null, 2) + '\n');
