import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import * as THREE from '../.cache/ra-assets/node_modules/three/build/three.module.js';
import { CHARACTERS, arrangeCharacters, placeBirthday } from '../birthday.js';
import { NodeIO } from '../.cache/ra-assets/node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../.cache/ra-assets/node_modules/@gltf-transform/extensions/dist/index.js';
import { FontLoader } from '../.cache/ra-assets/node_modules/three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from '../.cache/ra-assets/node_modules/three/examples/jsm/geometries/TextGeometry.js';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const report = [];
for (const item of CHARACTERS) {
  const bytes = await readFile(new URL('../' + item.path, import.meta.url));
  const doc = await io.readBinary(bytes);
  assert.ok(doc.getRoot().listMeshes().length > 0);
  assert.ok(doc.getRoot().listTextures().every(t => t.getImage()?.length > 0));
  report.push({ name: item.name, bytes: bytes.length, meshes: doc.getRoot().listMeshes().length, animations: doc.getRoot().listAnimations().length });
}
for (let n = 0; n < 100; n++) {
  const layout = arrangeCharacters(CHARACTERS);
  assert.equal(new Set(layout.map(p => p.item.id)).size, 7);
  for (let i = 1; i < layout.length; i++) assert.ok(layout[i].angle - layout[i - 1].angle > 0.7);
  assert.ok(2 * Math.PI - layout.at(-1).angle + layout[0].angle > 0.7);
}
const scene = new THREE.Scene();
const templates = CHARACTERS.map(item => {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 100, 30));
  mesh.position.set(30, 20, -10);
  group.add(mesh);
  return { ...item, gltf: { scene: group, animations: [] } };
});
for (let n = 0; n < 3; n++) {
  const encounter = placeBirthday({ THREE, scene, cloneModel: s => s.clone(true) }, templates, new THREE.Vector3(0,0,-1));
  assert.equal(encounter.root.children.length, 7);
  for (const anchor of encounter.root.children) {
    assert.ok(Math.abs(Math.hypot(anchor.position.x, anchor.position.z) - 1.7) < 1e-6);
    anchor.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(anchor);
    assert.ok(Math.abs(bounds.min.y + 0.45) < 1e-5);
    assert.ok(bounds.getSize(new THREE.Vector3()).length() < 1);
  }
  encounter.dispose();
  encounter.dispose();
  assert.equal(scene.children.length, 0, 'Nenhum convidado duplicado após reiniciar');
}
await writeFile(new URL('../modelos-aniversario/verificacao-integracao.json', import.meta.url), JSON.stringify(report, null, 2));
const fontJSON = JSON.parse(await readFile(new URL('../models/fonts/helvetiker_bold.typeface.json', import.meta.url), 'utf8'));
assert.ok(fontJSON.glyphs['á'], 'Fonte contém o acento de aniversário');
const greeting = placeBirthday({ THREE, scene, cloneModel: s => s.clone(true), TextGeometry, birthdayFont: new FontLoader().parse(fontJSON) }, templates, new THREE.Vector3(0,0,-1));
assert.equal(greeting.root.children.length,7, 'Mensagem oculta antes de concluir');
const camera = new THREE.PerspectiveCamera();
greeting.root.userData.revealMessage(camera);
const text = greeting.root.children.at(-1);
assert.equal(text.name,'Mensagem de aniversário 3D');
assert.equal(text.children.length,2);
text.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(text);
assert.ok(bounds.getSize(new THREE.Vector3()).z > 0.01, 'Letras têm volume real');
const fixedPosition = text.position.clone();
camera.rotation.y = Math.PI;
greeting.root.userData.revealMessage(camera);
assert.deepEqual(text.position,fixedPosition, 'Mensagem fica na direção inicial ao virar a câmera');
assert.equal(greeting.root.children.length,8,'Mensagem não se duplica');
let disposed=0;text.children[0].geometry.addEventListener('dispose',()=>disposed++);
greeting.dispose();assert.equal(disposed,1);assert.equal(scene.children.length,0);
console.log('OK: texto extrudado com acento, revelação única, posição fixa e descarte da geometria.');
console.log('OK: sete GLB, texturas embutidas, 100 sorteios sem sobreposição, escala, ponto de apoio e limpeza em três encontros.');
