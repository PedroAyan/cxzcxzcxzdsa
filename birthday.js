export const CHARACTERS = [
  { id: 'mew', name: 'Mew', path: 'models/mew.glb', size: 0.45 },
  { id: 'melody', name: 'My Melody', path: 'modelos-aniversario/my_melody_from_sanrio.glb', size: 0.5 },
  { id: 'rick', name: 'Rick Sanchez', path: 'modelos-aniversario/rick_sanchez.glb', size: 0.7 },
  { id: 'coraline', name: 'Coraline', path: 'modelos-aniversario/coraline.glb', size: 0.65 },
  { id: 'sakura', name: 'Flor de sakura', path: 'modelos-aniversario/stylized_cherry_blossom_flower.glb', size: 0.5 },
  { id: 'sylveon', name: 'Sylveon', path: 'modelos-aniversario/sylveon.glb', size: 0.6 },
  { id: 'umbreon', name: 'Umbreon', path: 'modelos-aniversario/umbreon.glb', size: 0.6 },
];

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
      const clip = item.gltf.animations.find(a => a.name.toLowerCase() === 'idle') ?? item.gltf.animations[0];
      if (clip) {
        const mixer = new THREE.AnimationMixer(model);
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
  root.userData.revealMessage = camera => {
    if (message || !runtime.birthdayFont || !runtime.TextGeometry) return;
    message = createBirthdayMessage(runtime);
    const direction = camera.getWorldDirection(new THREE.Vector3());
    direction.y = 0;
    if (direction.lengthSq() < 0.04) direction.copy(forward);
    message.position.copy(direction.normalize().multiplyScalar(1.25));
    message.position.y = 0.12;
    message.rotation.y = Math.atan2(-message.position.x, -message.position.z);
    root.add(message);
  };
  runtime.scene.add(root);
  return {
    root,
    update(delta) { mixers.forEach(m => m.update(delta)); },
    dispose() {
      message?.traverse(node => {
        node.geometry?.dispose();
        if (Array.isArray(node.material)) node.material.forEach(m => m.dispose());
        else node.material?.dispose();
      });
      mixers.forEach(m => { m.stopAllAction(); m.uncacheRoot(m.getRoot()); });
      runtime.scene.remove(root);
      root.clear();
    },
  };
}

export function createBirthdayMessage({ THREE, TextGeometry, birthdayFont }) {
  const group = new THREE.Group();
  group.name = 'Mensagem de aniversário 3D';
  for (const [text, y, color] of [['Feliz', 0.14, 0xffc85c], ['aniversário!', -0.12, 0xff7eac]]) {
    const geometry = new TextGeometry(text, {
      font: birthdayFont, size: 0.18, depth: 0.035, curveSegments: 6,
      bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2,
    });
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    geometry.translate(-(bounds.min.x + bounds.max.x) / 2, 0, 0);
    const face = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.15 });
    const edge = new THREE.MeshStandardMaterial({ color: 0xa64268, roughness: 0.5 });
    const mesh = new THREE.Mesh(geometry, [face, edge]);
    mesh.position.y = y;
    group.add(mesh);
  }
  // Cabe na visão vertical de um celular sem perder o volume das letras.
  const box = new THREE.Box3().setFromObject(group);
  group.scale.setScalar(0.78 / box.getSize(new THREE.Vector3()).x);
  return group;
}
