import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import * as THREE from '../.cache/ra-assets/node_modules/three/build/three.module.js';
import { CHARACTERS, FINAL_MESSAGE, FINAL_NOTE, arrangeCharacters, placeBirthday } from '../birthday.js';
import { NodeIO } from '../.cache/ra-assets/node_modules/@gltf-transform/core/dist/index.js';
import { ALL_EXTENSIONS } from '../.cache/ra-assets/node_modules/@gltf-transform/extensions/dist/index.js';
import { FontLoader } from '../.cache/ra-assets/node_modules/three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from '../.cache/ra-assets/node_modules/three/examples/jsm/geometries/TextGeometry.js';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const preparation = JSON.parse(await readFile(new URL('../models/aniversario/preparacao.json', import.meta.url), 'utf8'));
const report = [];
assert.equal(CHARACTERS.length,7,'O encontro exige somente os sete personagens');
assert.ok(!CHARACTERS.some(item=>item.id==='sakura'),'A flor não participa da descoberta');
for (const item of CHARACTERS) {
  const bytes = await readFile(new URL('../' + item.path, import.meta.url));
  const doc = await io.readBinary(bytes);
  assert.ok(doc.getRoot().listMeshes().length > 0);
  assert.ok(doc.getRoot().listTextures().every(t => t.getImage()?.length > 0));
  assert.ok(doc.getRoot().listAnimations().some(a => a.getName().toLowerCase() === 'idle'), `${item.name} tem Idle no próprio GLB`);
  if (item.id !== 'mew') {
    assert.ok(doc.getRoot().listAnimations().some(a => a.getName() === 'Idle suave'));
    const provenance = preparation.find(p => p.id === item.id);
    const source = await readFile(new URL('../modelos-aniversario/' + provenance.source, import.meta.url));
    assert.equal(createHash('sha256').update(source).digest('hex'), provenance.sourceSHA256, 'Original preservado');
    for (const clip of doc.getRoot().listAnimations()) {
      for (const channel of clip.listChannels()) {
        const sampler = channel.getSampler(), values = sampler.getOutput().getArray();
        const frames = sampler.getInput().getCount(), stride = values.length / frames;
        assert.equal(sampler.getInput().getScalar(frames - 1), 6);
        for (let i = 0; i < stride; i++) assert.ok(Math.abs(values[i] - values.at(i - stride)) < 1e-5, 'Ciclo sem salto');
      }
    }
    if (item.id === 'melody') {
      assert.ok(!doc.getRoot().listNodes().some(n => n.getName().startsWith('base_428')));
      assert.ok(!doc.getRoot().listMaterials().some(m => m.getName() === 'pasto'), 'Chão verde removido');
    }
    if (!doc.getRoot().listSkins().length && item.id !== 'sakura') {
      const points=[];const box=new THREE.Box3();
      for(const node of doc.getRoot().listNodes()) for(const p of node.getMesh()?.listPrimitives()??[]) {
        const pos=p.getAttribute('POSITION'),matrix=new THREE.Matrix4().fromArray(node.getWorldMatrix());
        for(let i=0;i<pos.getCount();i++) { const v=new THREE.Vector3().fromArray(pos.getElement(i,[])).applyMatrix4(matrix);box.expandByPoint(v);points.push({p,i,y:v.y}); }
      }
      const floor=box.min.y+box.getSize(new THREE.Vector3()).y*0.12;
      for(const {p,i,y} of points.filter(p=>p.y<floor)) for(const target of p.listTargets()) {
        assert.ok(new THREE.Vector3().fromArray(target.getAttribute('POSITION').getElement(i,[])).length()<1e-5, 'Pés não deslizam');
      }
    }
  }
  report.push({ name: item.name, bytes: bytes.length, meshes: doc.getRoot().listMeshes().length, animations: doc.getRoot().listAnimations().length });
}
for (let n = 0; n < 100; n++) {
  const layout = arrangeCharacters(CHARACTERS);
  assert.equal(new Set(layout.map(p => p.item.id)).size, CHARACTERS.length);
  assert.ok(layout.every(p=>Math.abs(p.angle)<Math.PI/2),'Nenhum item atrás da direção inicial');
  assert.equal(layout.filter(p=>p.height<-.8).length,2,'Dois itens mais baixos na frente');
  for(const height of new Set(layout.map(p=>p.height))){
    const row=layout.filter(p=>p.height===height).sort((a,b)=>a.angle-b.angle);
    for(let i=1;i<row.length;i++)assert.ok(row[i].angle-row[i-1].angle>0.3,'Itens da mesma altura ficam separados');
  }
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
  const forward=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),n*2.1);
  const encounter = placeBirthday({ THREE, scene, cloneModel: s => s.clone(true) }, templates, forward);
  assert.equal(encounter.root.children.length, CHARACTERS.length);
  for (const anchor of encounter.root.children) {
    assert.ok(anchor.position.dot(forward)>0,'Fica à frente qualquer que seja a direção inicial');
    const distance=Math.hypot(anchor.position.x,anchor.position.z);
    assert.ok(distance>=2.4&&distance<=3,'Personagens ficam mais distantes');
    anchor.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(anchor);
    assert.ok(Math.abs(bounds.min.y-anchor.position.y)<1e-5);
    assert.ok(bounds.getSize(new THREE.Vector3()).length() < 1);
    assert.ok(bounds.getSize(new THREE.Vector3()).length()/distance<0.26,'O modelo ocupa uma parte menor do campo de visão');
  }
  encounter.dispose();
  encounter.dispose();
  assert.equal(scene.children.length, 0, 'Nenhum convidado duplicado após reiniciar');
}
await writeFile(new URL('../modelos-aniversario/verificacao-integracao.json', import.meta.url), JSON.stringify(report, null, 2));
const fontJSON = JSON.parse(await readFile(new URL('../models/fonts/helvetiker_bold.typeface.json', import.meta.url), 'utf8'));
assert.ok(fontJSON.glyphs['á'], 'Fonte contém o acento de aniversário');
const greeting = placeBirthday({ THREE, scene, cloneModel: s => s.clone(true), TextGeometry, birthdayFont: new FontLoader().parse(fontJSON) }, templates, new THREE.Vector3(0,0,-1));
assert.equal(greeting.root.children.length,CHARACTERS.length, 'Mensagem oculta antes de concluir');
const camera = new THREE.PerspectiveCamera();
greeting.root.userData.revealMessage(camera);
const text = greeting.root.children.at(-1);
assert.equal(text.name,'Mensagem para Camila 3D');
assert.deepEqual(text.children.map(child=>child.name), [...FINAL_MESSAGE,...FINAL_NOTE].filter(Boolean), 'Texto completo e nenhum fundo');
assert.ok(text.children.every(child=>child.material[0].color.getHex()===0xffa9d3), 'Fonte rosa');
greeting.setMessageVisible(false);assert.equal(text.visible,false,'Oculta cópia 3D durante a leitura na tela');
greeting.setMessageVisible(true);assert.equal(text.visible,true,'Retoma a mensagem 3D ao voltar aos personagens');
text.updateMatrixWorld(true);
const bounds = new THREE.Box3().setFromObject(text);
assert.ok(bounds.getSize(new THREE.Vector3()).z > 0.005, 'Letras têm volume real');
for (const [width,height] of [[280,1000],[320,740],[375,667],[414,749],[896,414]]) {
  camera.fov=60;camera.aspect=width/height;camera.updateProjectionMatrix();
  greeting.resizeMessage(camera);text.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(text);
  for(const x of [box.min.x,box.max.x]) for(const y of [box.min.y,box.max.y]) for(const z of [box.min.z,box.max.z]) {
    const projected=new THREE.Vector3(x,y,z).project(camera);
    assert.ok(Math.abs(projected.x)<=0.85&&Math.abs(projected.y)<=0.85, `Mensagem cabe em ${width}×${height}`);
  }
}
const fixedPosition = text.position.clone();
camera.rotation.y = Math.PI;
greeting.root.userData.revealMessage(camera);
assert.deepEqual(text.position,fixedPosition, 'Mensagem fica na direção inicial ao virar a câmera');
assert.equal(greeting.root.children.length,CHARACTERS.length+1,'Mensagem não se duplica');
let disposed=0;text.children[0].geometry.addEventListener('dispose',()=>disposed++);
greeting.dispose();assert.equal(disposed,1);assert.equal(scene.children.length,0);
console.log('OK: mensagem rosa para Camila, recado completo, fundo transparente, revelação única, posição fixa e descarte.');
console.log('OK: sete GLB sem a flor, texturas, 100 sorteios sem sobreposição, modelos menores e mais distantes, apoio e limpeza.');
console.log('OK: animações embutidas, ciclos contínuos, movimento reduzido, pés fixos, originais preservados, My Melody sem chão verde e texto em cinco formatos de tela.');
