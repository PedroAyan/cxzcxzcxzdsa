// Conversão dos eixos do aparelho para a câmera traseira (Three.js, Y para cima).
export function cameraQuaternion(THREE, event, screenAngle = 0) {
  const radians = Math.PI / 180;
  return new THREE.Quaternion()
    .setFromEuler(new THREE.Euler(event.beta * radians, event.alpha * radians, -event.gamma * radians, 'YXZ'))
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2))
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -screenAngle * radians));
}

export function createOrientationEncounter({ runtime, video, status, place, tick, end }) {
  const { THREE, camera, renderer, scene } = runtime;
  let active = false, stream = null, root = null, sensor = null;
  let lastSensor = 0, previous = 0, timer = null;
  const onSensor = (event) => {
    if (![event.alpha, event.beta, event.gamma].every(Number.isFinite)) return;
    sensor = { alpha: event.alpha, beta: event.beta, gamma: event.gamma };
    lastSensor = performance.now();
  };
  function stop() {
    active = false;
    clearTimeout(timer);
    window.removeEventListener('deviceorientation', onSensor);
    renderer.setAnimationLoop(null);
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    video.pause();
    video.srcObject = null;
    video.hidden = true;
  }
  async function start() {
    active = true;
    try {
      // A permissão de sensores precisa ser pedida antes de qualquer await no gesto.
      const permission = typeof DeviceOrientationEvent.requestPermission === 'function'
        ? DeviceOrientationEvent.requestPermission() : Promise.resolve('granted');
      if (await permission !== 'granted') throw new Error('Permita movimento e orientação para procurar Mew girando o celular.');
      if (!active) return;
      window.addEventListener('deviceorientation', onSensor);
      const requested = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
      if (!active) { requested.getTracks().forEach(track => track.stop()); return; }
      stream = requested;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => { if (active) end('A câmera foi interrompida. Inicie outro encontro.'); });
      video.srcObject = stream;
      video.hidden = false;
      await video.play();
      if (!active) return;
      camera.position.set(0, 0, 0);
      camera.fov = 60;
      camera.updateProjectionMatrix();
      runtime.animationPaused = false;
      status('Aponte o celular à sua frente.', 'Aguardando a orientação do aparelho. Não é necessário reconhecer uma mesa.');
      timer = setTimeout(() => { if (active && !root) end('O aparelho não forneceu orientação. Confira a permissão de movimento e abra no Safari ou Chrome.'); }, 10000);
      renderer.setAnimationLoop((now) => {
        if (!active) return;
        const delta = previous ? Math.min((now - previous) / 1000, 0.08) : 0;
        previous = now;
        if (!sensor || now - lastSensor > 2500) {
          if (root) root.visible = false;
          renderer.render(scene, camera);
          if (root) status('Aguardando os sensores.', 'Mova o celular devagar para recuperar a orientação.');
          return;
        }
        camera.quaternion.copy(cameraQuaternion(THREE, sensor, screen.orientation?.angle ?? window.orientation ?? 0));
        camera.updateMatrixWorld(true);
        if (!root) {
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
          forward.y = 0;
          if (forward.lengthSq() < 0.04) { status('Levante o celular.', 'Aponte à sua frente para iniciar o encontro.'); return; }
          // Uma única direção por encontro, ligeiramente ao lado da mira inicial.
          forward.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 9);
          const position = forward.multiplyScalar(1.3);
          position.y = -0.35;
          root = place({ matrix: new THREE.Matrix4().makeTranslation(position.x, position.y, position.z).elements }, { matrix: camera.matrixWorld.elements });
          // Sem plano detectado, não desenhe uma sombra que sugira apoio real.
          if (root.children[1]) root.children[1].visible = false;
          clearTimeout(timer);
        }
        root.visible = true;
        tick(delta);
        const relative = root.position.clone().add(new THREE.Vector3(0, 0.19, 0)).applyMatrix4(camera.matrixWorldInverse);
        const projected = relative.clone().applyMatrix4(camera.projectionMatrix);
        const visible = relative.z < 0 && Math.abs(projected.x) < 0.9 && Math.abs(projected.y) < 0.9;
        const hint = relative.z >= 0 ? 'Olhe para trás.' : Math.abs(projected.x) > 0.9
          ? (relative.x < 0 ? 'Vire para a esquerda.' : 'Vire para a direita.')
          : (relative.y < 0 ? 'Aponte um pouco para baixo.' : 'Aponte um pouco para cima.');
        status(visible ? 'Você encontrou Mew!' : 'Procure Mew ao redor.', visible
          ? 'Ele anima em uma direção fixa. Este modo não rastreia sua caminhada nem reconhece o chão.' : hint);
        renderer.render(scene, camera);
      });
    } catch (error) {
      if (active) end(error.name === 'NotAllowedError' ? 'Permita a câmera e o movimento nas configurações do navegador e tente novamente.' : error.message || 'Não foi possível abrir a câmera.');
    }
  }
  return { start, stop };
}
