import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from '../.cache/ra-assets/node_modules/three/build/three.module.js';
import { FontLoader } from '../.cache/ra-assets/node_modules/three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from '../.cache/ra-assets/node_modules/three/examples/jsm/geometries/TextGeometry.js';
const source = await readFile(new URL('../orientation.js', import.meta.url), 'utf8');
const {cameraQuaternion, createOrientationEncounter} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const initial = cameraQuaternion(THREE, {alpha:0,beta:90,gamma:0});
const initialForward = new THREE.Vector3(0,0,-1).applyQuaternion(initial);
assert.ok(initialForward.distanceTo(new THREE.Vector3(0,0,-1)) < 1e-6);
const target = new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI/9).multiplyScalar(1.3);
const project = q => target.clone().applyQuaternion(q.clone().invert()).applyMatrix4(new THREE.Matrix4().makePerspective(-.03,.03,.05,-.05,.1,30));
assert.ok(Math.abs(project(initial).x) > .1, 'Spawn is offset from center');
const turned = cameraQuaternion(THREE, {alpha:100,beta:90,gamma:0});
const relative = target.clone().applyQuaternion(turned.clone().invert());
assert.ok(relative.z > 0 || Math.abs(project(turned).x) > 1, 'Turning removes character from view');
assert.ok(project(cameraQuaternion(THREE,{alpha:0,beta:90,gamma:0})).distanceTo(project(initial)) < 1e-6, 'Returning restores direction');
const landscape = cameraQuaternion(THREE,{alpha:0,beta:90,gamma:0},90);
assert.ok(new THREE.Vector3(0,0,-1).applyQuaternion(landscape).distanceTo(initialForward) < 1e-6);
let listener, loop, stops=0, placed=0;
globalThis.window = {addEventListener(_,fn){listener=fn;},removeEventListener(){listener=null;},orientation:0};
globalThis.screen = {orientation:{angle:0}};
globalThis.DeviceOrientationEvent = {requestPermission:async()=> 'granted'};
const track = {stop(){stops++;}, addEventListener(){}};
Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track],getVideoTracks:()=>[track]})}},configurable:true});
const camera = new THREE.PerspectiveCamera(60,1,.01,30);
const runtime = {THREE,camera,scene:{},renderer:{setAnimationLoop(fn){loop=fn;},render(){}}};
const video = {play:async()=>{},pause(){},hidden:true};
const root = new THREE.Group();
const encounter = createOrientationEncounter({runtime,video,status(){},place(transform){placed++; root.position.setFromMatrixPosition(new THREE.Matrix4().fromArray(transform.matrix));return root;},tick(){},end(message){throw Error(message);}});
await encounter.start();
listener({alpha:0,beta:90,gamma:0}); loop(performance.now());
const saved = root.position.clone();
listener({alpha:100,beta:90,gamma:0}); loop(performance.now());
assert.equal(placed,1); assert.deepEqual(root.position,saved);
loop(performance.now()+3000); assert.equal(root.visible,false);
listener({alpha:0,beta:90,gamma:0}); loop(performance.now()); assert.equal(root.visible,true);
encounter.stop(); encounter.stop();
assert.equal(stops,1);assert.equal(loop,null);assert.equal(listener,null);assert.equal(video.srcObject,null);
console.log('OK: orientation, landscape, off-center spawn, turn away/return, fixed target, sensor interruption, camera cleanup.');
const { CHARACTERS, placeBirthday } = await import('../birthday.js');
let clock = 1000;
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock }, configurable: true });
const font = new FontLoader().parse(JSON.parse(await readFile(new URL('../models/fonts/helvetiker_bold.typeface.json', import.meta.url), 'utf8')));
const multiRuntime = { ...runtime, scene: new THREE.Scene(), cloneModel: s => s.clone(true), TextGeometry, birthdayFont: font };
const templates = CHARACTERS.map(item => ({ ...item, gltf: { scene: new THREE.Mesh(new THREE.BoxGeometry(1,1,1)), animations: [] } }));
let birthday, lastStatus;
const multi = createOrientationEncounter({ runtime: multiRuntime, video, status(message){lastStatus=message;},
  place(_t,_v,forward){birthday=placeBirthday(multiRuntime,templates,forward);return birthday.root;}, tick(){}, end(message){throw Error(message);} });
await multi.start();
listener({alpha:0,beta:90,gamma:0});loop(clock);
const positions = birthday.root.userData.characters.map(child => child.position.clone());
for (const anchor of birthday.root.userData.characters) {
  const alpha = Math.atan2(-anchor.position.x, -anchor.position.z) * 180 / Math.PI;
  for (let step=0;step<12;step++) { clock+=70;listener({alpha,beta:65,gamma:0});loop(clock); }
}
assert.equal(birthday.root.userData.found.size,CHARACTERS.length);
assert.equal(lastStatus,'Você encontrou todos!');
birthday.root.userData.characters.forEach((child,i)=>assert.deepEqual(child.position,positions[i]));
const message = birthday.root.children.find(child => child.name === 'Mensagem para Camila 3D');
assert.ok(message, 'Concluir os oito cria as letras reais, além de atualizar o status');
message.updateMatrixWorld(true);
for (const line of message.children) {
  const box = line.geometry.boundingBox;
  for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) {
    const p = new THREE.Vector3(x,y,z).applyMatrix4(line.matrixWorld).project(camera);
    assert.ok(Math.abs(p.x)<0.85 && Math.abs(p.y)<0.85 && Math.abs(p.z)<1, 'Mensagem inteira visível ao concluir com o celular inclinado');
  }
}
const messagePosition=message.position.clone(), messageRotation=message.quaternion.clone();
clock+=70;listener({alpha:150,beta:65,gamma:0});loop(clock);
assert.deepEqual(message.position,messagePosition, 'A mensagem não segue a câmera depois da revelação');
assert.ok(message.quaternion.equals(messageRotation));
assert.equal(birthday.root.children.length,CHARACTERS.length+1, 'Conclusão não duplica a mensagem');
clock+=3000;loop(clock);assert.equal(birthday.root.visible,false);
multi.stop();birthday.dispose();assert.equal(multiRuntime.scene.children.length,0);
globalThis.DeviceOrientationEvent.requestPermission=async()=> 'denied';
let denial='';const denied=createOrientationEncounter({runtime,video,status(){},place(){},tick(){},end(message){denial=message;}});
await denied.start();assert.match(denial,/Permita movimento/);denied.stop();
console.log('OK: oito descobertas, letras reais inteiras ao concluir com celular inclinado, posição fixa, sensores interrompidos e permissão negada.');
