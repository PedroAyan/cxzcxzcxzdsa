import assert from 'node:assert/strict';
import * as THREE from '../.cache/ra-assets/node_modules/three/build/three.module.js';
import { CHARACTERS, placeBirthday } from '../birthday.js';
import { createOrientationEncounter } from '../orientation.js';

let clock=1000, listener, loop, stopped=0, renders=0, completed=0;
Object.defineProperty(globalThis,'performance',{value:{now:()=>clock},configurable:true});
globalThis.window={addEventListener(_name,fn){listener=fn;},removeEventListener(){listener=null;},orientation:0};
globalThis.screen={orientation:{angle:0}};
globalThis.DeviceOrientationEvent={requestPermission:async()=>'granted'};
const track={stop(){stopped++;},addEventListener(){}};
Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track],getVideoTracks:()=>[track]})}},configurable:true});
const camera=new THREE.PerspectiveCamera(60,414/749,.01,30), scene=new THREE.Scene();
const runtime={THREE,camera,scene,cloneModel:s=>s.clone(true),renderer:{setAnimationLoop(fn){loop=fn;},render(){renders++;}}};
const templates=CHARACTERS.map(item=>({...item,gltf:{scene:new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial()),animations:[]}}));
let birthday, latestProgress;
const encounter=createOrientationEncounter({runtime,video:{play:async()=>{},pause(){}},status(){},tick(){},
  place(_t,_v,forward){birthday=placeBirthday(runtime,templates,forward);return birthday.root;},
  progress(count,total){latestProgress=[count,total];},complete(){completed++;},end(message){throw Error(message);}
});
function face(anchor){clock+=1000;listener({alpha:Math.atan2(-anchor.position.x,-anchor.position.z)*180/Math.PI,beta:80,gamma:0});loop(clock);}
await encounter.start();listener({alpha:0,beta:80,gamma:0});loop(clock);
const saved=birthday.root.userData.characters.map(anchor=>anchor.position.clone());
for(const anchor of birthday.root.userData.characters){face(anchor);clock+=1000;loop(clock);}
assert.equal(birthday.root.userData.collected.size,0,'Só olhar para os sete não coleta automaticamente');
assert.equal(completed,0,'O quiz não abre antes dos cliques');
clock+=3000;loop(clock);
const rect={left:20,top:35,width:414,height:749};
assert.equal(encounter.collectAt(200,300,rect),null,'Sem sensores válidos o toque é ignorado');
for(const [i,anchor] of birthday.root.userData.characters.entries()){
  face(anchor);
  const p=anchor.position.clone().add(new THREE.Vector3(0,anchor.userData.centerHeight,0)).project(camera);
  const before=renders;
  const hit=encounter.collectAt(rect.left+(p.x+1)*rect.width/2,rect.top+(1-p.y)*rect.height/2,rect);
  assert.equal(hit,anchor,'O clique nas coordenadas de tela atinge o modelo correto');
  assert.equal(anchor.visible,false,'O personagem some imediatamente');
  assert.ok(renders>before,'Renderiza a remoção sem esperar o próximo quadro');
  assert.equal(birthday.root.userData.collected.size,i+1);
  assert.equal(birthday.collectCharacter(anchor),null,'Não coleta o mesmo personagem duas vezes');
  assert.deepEqual(anchor.position,saved[i],'Os outros pontos continuam fixos');
}
assert.deepEqual(latestProgress,[7,7]);assert.equal(completed,1);
clock+=1000;loop(clock);assert.equal(completed,1,'Conclusão dispara uma única vez');
assert.equal(encounter.collectSelected(),null,'Não há coleta adicional após completar');
encounter.stop();birthday.dispose();assert.equal(stopped,1);assert.equal(scene.children.length,0);
assert.equal(encounter.collectAt(200,300,rect),null,'Não coleta após encerrar');
const fresh=placeBirthday(runtime,templates,new THREE.Vector3(0,0,-1));
assert.equal(fresh.root.userData.collected.size,0);assert.ok(fresh.root.children.every(c=>c.visible),'Novo encontro restaura os sete');fresh.dispose();
console.log('OK: coleta por raycast, nenhum recolhimento automático, remoção imediata, contagem sem duplicação, conclusão única e reinício.');
