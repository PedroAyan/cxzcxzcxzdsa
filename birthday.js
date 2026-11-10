export const CHARACTERS = [
  { id: 'mew', name: 'Mew', path: 'models/mew.glb', size: 0.45 },
  { id: 'melody', name: 'My Melody', path: 'models/aniversario/melody.glb', size: 0.5 },
  { id: 'piano', name: 'My Sweet Piano', path: 'models/aniversario/piano.glb', size: 0.5 },
  { id: 'rick', name: 'Rick Sanchez', path: 'models/aniversario/rick.glb', size: 0.7 },
  { id: 'coraline', name: 'Coraline', path: 'models/aniversario/coraline.glb', size: 0.65 },
  { id: 'sakura', name: 'Flor de sakura', path: 'models/aniversario/sakura.glb', size: 0.5 },
  { id: 'sylveon', name: 'Sylveon', path: 'models/aniversario/sylveon.glb', size: 0.6 },
  { id: 'umbreon', name: 'Umbreon', path: 'models/aniversario/umbreon.glb', size: 0.6 },
];

const MESSAGE_DISTANCE = 1.05;
export const FINAL_MESSAGE = [
  'gatinha miau miau',
];
export const FINAL_NOTE = [
  'se quiser q eu te de algo',
  'fica calada ou me xinga tipo',
  '"vai tomar no cu pedro"',
  '',
  'se nao quiser fala te amo',
  'meu dono nao vivo sem o pedro etc',
];

function fitBirthdayMessage(message, camera) {
  // Reserva margens nas duas direções, inclusive ao girar a tela.
  const viewHeight = 2 * (MESSAGE_DISTANCE - 0.05) * Math.tan(camera.fov * Math.PI / 360);
  message.scale.setScalar(Math.min(viewHeight * camera.aspect * 0.8 / message.userData.baseWidth,
    viewHeight * 0.64 / message.userData.baseHeight));
}

// Setores separados: sorteia quem ocupa cada direção, sem sobrepor os modelos.
export function arrangeCharacters(items, random = Math.random) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map((item, i) => ({ item, angle: Math.PI / 9 + i * 2 * Math.PI / items.length + (random() - 0.5) * 0.16 }));
}

export function placeBirthday(runtime, templates, forward) {
  const { THREE, cloneModel } = runtime;
  const root = new THREE.Group();
  const mixers = [];
  const characters = [];
  try {
    for (const { item, angle } of arrangeCharacters(templates)) {
      const anchor = new THREE.Group();
      anchor.position.copy(forward).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).multiplyScalar(1.7);
      anchor.position.y = -0.45;
      anchor.rotation.y = Math.atan2(-anchor.position.x, -anchor.position.z);
      const model = cloneModel(item.gltf.scene);
      const holder = new THREE.Group();
      holder.add(model);
      holder.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(holder);
      const size = bounds.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(longest) || longest <= 0) throw new Error(`Modelo inválido: ${item.name}`);
      const center = bounds.getCenter(new THREE.Vector3());
      model.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
      holder.scale.setScalar(item.size / longest);
      anchor.add(holder);
      root.add(anchor);
      anchor.userData.name = item.name;
      anchor.userData.id = item.id;
      anchor.userData.centerHeight = size.y * item.size / longest / 2;
      characters.push(anchor);
      const clip = (runtime.reducedMotion && item.gltf.animations.find(a => a.name === 'Idle suave'))
        || item.gltf.animations.find(a => a.name.toLowerCase() === 'idle') || item.gltf.animations[0];
      if (clip) {
        const mixer = new THREE.AnimationMixer(model);
        if (runtime.reducedMotion && clip.name !== 'Idle suave') mixer.timeScale = 0.35;
        mixer.clipAction(clip).play();
        mixers.push(mixer);
      }
    }
  } catch (error) {
    mixers.forEach(m => { m.stopAllAction(); m.uncacheRoot(m.getRoot()); });
    throw error;
  }
  root.userData.characters = characters;
  root.userData.found = new Set();
  let message = null;
  let messageVisible = true;
  root.userData.revealMessage = camera => {
    if (message) return message;
    if (!runtime.birthdayFont || !runtime.TextGeometry) return null;
    message = createBirthdayMessage(runtime);
    // Captura a pose completa uma única vez. Nivelar a direção escondia as
    // letras quando o último personagem era encontrado com o celular inclinado.
    camera.updateWorldMatrix(true, false);
    const direction = camera.getWorldDirection(new THREE.Vector3());
    camera.getWorldPosition(message.position).addScaledVector(direction, MESSAGE_DISTANCE);
    camera.getWorldQuaternion(message.quaternion);
    fitBirthdayMessage(message, camera);
    message.visible = messageVisible;
    root.add(message);
    return message;
  };
  runtime.scene.add(root);
  let disposed = false;
  return {
    root,
    update(delta) { if (!runtime.animationPaused) mixers.forEach(m => m.update(delta)); },
    resizeMessage(camera) { if (message) fitBirthdayMessage(message, camera); },
    setMessageVisible(visible) { messageVisible = visible; if (message) message.visible = visible; },
    dispose() {
      if (disposed) return;
      disposed = true;
      const materials = new Set();
      message?.traverse(node => {
        node.geometry?.dispose();
        if (Array.isArray(node.material)) node.material.forEach(m => materials.add(m));
        else if (node.material) materials.add(node.material);
      });
      materials.forEach(material => material.dispose());
      mixers.forEach(m => { m.stopAllAction(); m.uncacheRoot(m.getRoot()); });
      runtime.scene.remove(root);
      root.clear();
    },
  };
}

export function createBirthdayMessage({ THREE, TextGeometry, birthdayFont }) {
  const group = new THREE.Group();
  group.name = 'Mensagem para Camila 3D';
  let y = 0;
  const face = new THREE.MeshStandardMaterial({ color: 0xffa9d3, roughness: 0.65, metalness: 0 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xb73d77, roughness: 0.7 });
  const lines = [...FINAL_MESSAGE.map(text => ({ text, size: 0.065, lineHeight: 0.092, block: 'principal' })),
    ...FINAL_NOTE.map(text => ({ text, size: 0.047, lineHeight: 0.069, block: 'recado' }))];
  for (const [index, { text, size, lineHeight, block }] of lines.entries()) {
    if (index === FINAL_MESSAGE.length) y -= 0.055;
    if (!text) { y -= lineHeight * 0.6; continue; }
    const geometry = new TextGeometry(text, {
      font: birthdayFont, size, depth: 0.018, curveSegments: 4,
      bevelEnabled: true, bevelSize: 0.0007, bevelThickness: 0.0007, bevelSegments: 1,
    });
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    geometry.translate(-(bounds.min.x + bounds.max.x) / 2, 0, 0);
    const mesh = new THREE.Mesh(geometry, [face, edge]);
    mesh.name = text;
    mesh.userData.block = block;
    mesh.position.y = y;
    group.add(mesh);
    y -= lineHeight;
  }
  // Apenas as letras: nenhum painel, plano ou fundo atrás da mensagem.
  const box = new THREE.Box3().setFromObject(group);
  const centerY = box.getCenter(new THREE.Vector3()).y;
  group.children.forEach(mesh => { mesh.position.y -= centerY; });
  group.userData.baseWidth = box.getSize(new THREE.Vector3()).x;
  group.userData.baseHeight = box.getSize(new THREE.Vector3()).y;
  group.scale.setScalar(0.65 / group.userData.baseWidth);
  return group;
}
