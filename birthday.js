export const CHARACTERS = [
  { id: 'mew', name: 'Mew', path: 'models/mew.glb', size: 0.36 },
  { id: 'melody', name: 'My Melody', path: 'models/aniversario/melody.glb', size: 0.4 },
  { id: 'piano', name: 'My Sweet Piano', path: 'models/aniversario/piano.glb', size: 0.4 },
  { id: 'rick', name: 'Rick Sanchez', path: 'models/aniversario/rick.glb', size: 0.56 },
  { id: 'coraline', name: 'Coraline', path: 'models/aniversario/coraline.glb', size: 0.52 },
  { id: 'sylveon', name: 'Sylveon', path: 'models/aniversario/sylveon.glb', size: 0.48 },
];

// Posições no arco frontal e duas mais baixas na frente. Nunca atrás
// da direção inicial; sorteia apenas quem ocupa cada posição.
export function arrangeCharacters(items, random = Math.random) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const lowerCount = items.length >= 4 ? 2 : 0;
  const upperCount = items.length - lowerCount;
  return shuffled.map((item, i) => {
    const lower = i >= upperCount;
    const index = lower ? i - upperCount : i;
    const count = lower ? lowerCount : upperCount;
    const halfArc = (lower ? 14 : 45) * Math.PI / 180;
    const angle = (count > 1 ? -halfArc + index * 2 * halfArc / (count - 1) : 0) + (random() - 0.5) * 0.04;
    return { item, angle, height: lower ? -1.2 : -0.45, distance: lower ? 2.8 : 2.6 };
  });
}

export function placeBirthday(runtime, templates, forward) {
  const { THREE, cloneModel } = runtime;
  const root = new THREE.Group();
  const mixers = [];
  const characters = [];
  try {
    for (const { item, angle, height, distance } of arrangeCharacters(templates)) {
      const anchor = new THREE.Group();
      anchor.position.copy(forward).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).multiplyScalar(distance);
      anchor.position.y = height;
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
        mixers.push({ mixer, anchor });
      }
    }
  } catch (error) {
    mixers.forEach(({ mixer }) => { mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot()); });
    throw error;
  }
  root.userData.characters = characters;
  const collected = new Set();
  root.userData.collected = collected;
  const raycaster = new THREE.Raycaster();
  let disposed = false;

  function collectCharacter(character) {
    if (disposed || !root.visible || !characters.includes(character) || !character.visible
      || collected.has(character.userData.id)) return null;
    character.visible = false;
    collected.add(character.userData.id);
    if (root.userData.selected === character) root.userData.selected = null;
    return character;
  }

  function pickCharacter(clientX, clientY, camera, rect) {
    if (disposed || !root.visible || rect.width <= 0 || rect.height <= 0
      || clientX < rect.left || clientY < rect.top || clientX > rect.left + rect.width
      || clientY > rect.top + rect.height) return null;
    const available = characters.filter(character => character.visible && !collected.has(character.userData.id));
    camera.updateWorldMatrix(true, false);
    root.updateMatrixWorld(true);
    // O volume de seleção acompanha a pose atual dos modelos com esqueleto.
    for (const character of available) character.traverse(node => {
      if (!node.isSkinnedMesh) return;
      node.computeBoundingBox();
      node.boundingBox.getBoundingSphere(node.boundingSphere ??= new THREE.Sphere());
    });
    const point = new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1,
      1 - (clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(point, camera);
    const availableSet = new Set(available);
    for (const hit of raycaster.intersectObjects(available, true)) {
      let node = hit.object;
      while (node && !availableSet.has(node)) node = node.parent;
      if (node) return node;
    }
    return null;
  }

  root.userData.collectCharacter = collectCharacter;
  root.userData.pickCharacter = pickCharacter;
  runtime.scene.add(root);
  return {
    root,
    collectCharacter,
    pickCharacter,
    update(delta) {
      if (!runtime.animationPaused) for (const { mixer, anchor } of mixers) if (anchor.visible) mixer.update(delta);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      mixers.forEach(({ mixer }) => { mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot()); });
      runtime.scene.remove(root);
      root.clear();
    },
  };
}
