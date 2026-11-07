import { createOrientationEncounter } from './orientation.js';

const OBJETO = {
  id: "mew",
  nome: "Mew",
  descricao: "Uma pequena criatura de olhos azuis e cauda comprida.",
  glb: new URL("./models/mew.glb?v=mew-original-1", import.meta.url).href,
  usdz: new URL("./models/mew.usdz?v=mew-original-1", import.meta.url).href
};

const MODEL_VIEWER_MODULE = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.4.0/model-viewer.min.js";
const params = new URLSearchParams(window.location.search);
const experiencia = document.querySelector("#experiencia");
const paginaInvalida = document.querySelector("#objeto-invalido");
const viewer = document.querySelector("#visualizador");
const loading = document.querySelector("#carregando");
const viewerCaption = document.querySelector("#estado-visualizador");
const arButton = document.querySelector("#botao-ra");
const manualArButton = document.querySelector("#botao-ra-manual");
const arNote = document.querySelector("#aviso-ra");
const previewAnimationButton = document.querySelector("#botao-animacao-preview");
const objectLink = document.querySelector("#endereco-objeto");
const copyButton = document.querySelector("#copiar-link");
const copyStatus = document.querySelector("#estado-copia");
const xrCanvas = document.querySelector("#xr-canvas");
const xrOverlay = document.querySelector("#xr-overlay");
const xrHud = xrOverlay.querySelector(".xr-hud");
const xrStatus = document.querySelector("#xr-estado");
const xrHint = document.querySelector("#xr-dica");
const xrPauseButton = document.querySelector("#xr-pausar");
const xrEndButton = document.querySelector("#xr-encerrar");

const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
const requestedId = params.get("obj");
const objectIsValid = requestedId === null || requestedId === OBJETO.id;

if (!objectIsValid) {
  experiencia.hidden = true;
  document.querySelector(".how-it-works").hidden = true;
  document.querySelector(".object-link").hidden = true;
  paginaInvalida.hidden = false;
  document.title = "Objeto não encontrado — Mundo de bolso";
} else {
  initializeExperience();
}

function initializeExperience() {
  const objectUrl = new URL(window.location.href);
  objectUrl.search = "";
  objectUrl.hash = "";
  objectUrl.searchParams.set("obj", OBJETO.id);

  document.querySelector("#nome-objeto").textContent = OBJETO.nome;
  document.querySelector("#descricao-objeto").textContent = OBJETO.descricao;
  document.title = `${OBJETO.nome} — Mundo de bolso`;
  objectLink.textContent = objectUrl.toString();
  viewer.setAttribute("src", OBJETO.glb);
  viewer.setAttribute("ios-src", OBJETO.usdz);

  let modelIsLoaded = false;
  let previewHasAnimation = false;
  let webxrSupported = false;
  let webxrReady = false;
  let webxrLoadError = null;
  let externalArAvailable = false;
  let externalArIsActive = false;
  let previewIsPaused = prefersReducedMotion;
  let encounterIsActive = false;
  let arRuntimePromise = null;
  let arRuntime = null;
  let xrSession = null;
  let hitTestSource = null;
  let viewerSpace = null;
  let referenceSpace = null;
  let placedRoot = null;
  let placedMixer = null;
  let animationClip = null;
  let trackingWasAvailable = true;
  let recoveryMessageUntil = 0;
  let lastFrameTime = 0;
  let orientationEncounter = null;
  const surfaceMode = params.get('modo') === 'superficie';

  function setArNote(message, isError = false) {
    arNote.textContent = message;
    arNote.classList.toggle("is-error", isError);
  }

  function setViewerCaption(message) {
    viewerCaption.textContent = message;
  }

  function setXrStatus(message, hint = "", isError = false) {
    if (xrStatus.textContent !== message) xrStatus.textContent = message;
    if (xrHint.textContent !== hint) xrHint.textContent = hint;
    xrHud.classList.toggle("is-error", isError);
  }

  function updateArControls() {
    if (encounterIsActive) {
      arButton.disabled = true;
      arButton.textContent = "Encontro em andamento";
      manualArButton.hidden = true;
      return;
    }

    if (!surfaceMode) {
      const supported = window.isSecureContext && navigator.mediaDevices?.getUserMedia && 'DeviceOrientationEvent' in window;
      arButton.disabled = !supported || !webxrReady;
      arButton.textContent = webxrReady ? 'Iniciar encontro em RA' : webxrLoadError ? 'Encontro indisponível' : 'Preparando encontro…';
      manualArButton.hidden = !externalArAvailable;
      setArNote(!supported ? 'Câmera e orientação indisponíveis. Abra em HTTPS no Safari ou Chrome do celular.'
        : webxrLoadError ? 'Não foi possível carregar o encontro. Confira a conexão e recarregue a página.'
        : 'Sem procurar mesa: permita câmera e movimento, depois vire o celular para encontrar Mew. A direção fica fixa; sua caminhada não é rastreada.');
      return;
    }

    if (webxrSupported) {
      arButton.textContent = "Iniciar encontro em RA";
      arButton.disabled = !webxrReady;
      manualArButton.hidden = !externalArAvailable;

      if (webxrReady) {
        setArNote("Este navegador oferece WebXR imersivo. Depois do toque, a câmera rastreia o ambiente e posiciona Mew automaticamente sobre uma superfície horizontal próxima. No iPhone, use a alternativa manual do aparelho.");
      } else if (webxrLoadError) {
        setArNote("Não foi possível preparar o modelo animado para o encontro. Confira o GLB e a conexão; a prévia 3D continua disponível.", true);
      } else {
        setArNote("Preparando o modelo animado para o encontro em RA…");
      }
      return;
    }

    manualArButton.hidden = true;
    arButton.disabled = !externalArAvailable;
    arButton.textContent = externalArAvailable ? "Abrir RA manual do aparelho" : "RA de superfície indisponível";

    if (!window.isSecureContext) {
      setArNote("A câmera e o rastreamento espacial exigem HTTPS ou localhost. A prévia 3D continua disponível.", true);
    } else if (externalArAvailable) {
      setArNote("Este navegador não oferece o encontro WebXR automático. A alternativa abre o visualizador do aparelho: você posiciona Mew com um toque e o visualizador controla a câmera. No iPhone, o USDZ inclui a animação, mas essa opção não equivale ao encontro automático.");
    } else {
      setArNote("Este navegador ou aparelho não oferece WebXR de superfície nem um visualizador de RA compatível. Use a prévia 3D; ela não é um encontro ancorado.");
    }
  }

  function updateExternalArAvailability() {
    externalArAvailable = modelIsLoaded && viewer.canActivateAR === true;
    updateArControls();
  }

  function setPreviewAnimationPaused(paused) {
    previewIsPaused = paused;
    if (previewHasAnimation) {
      if (paused) viewer.pause();
      else viewer.play();
    }
    previewAnimationButton.textContent = paused ? "Reproduzir animação da prévia" : "Pausar animação da prévia";
  }

  function updateXrPauseButton() {
    xrPauseButton.textContent = arRuntime?.animationPaused
      ? "Reproduzir animação"
      : "Pausar animação";
    xrPauseButton.setAttribute("aria-pressed", String(Boolean(arRuntime?.animationPaused)));
  }

  async function detectWebXRSupport() {
    if (!window.isSecureContext || !navigator.xr || typeof navigator.xr.isSessionSupported !== "function") return false;
    try {
      return await navigator.xr.isSessionSupported("immersive-ar");
    } catch {
      return false;
    }
  }

  async function loadThreeRuntime() {
    if (arRuntimePromise) return arRuntimePromise;

    arRuntimePromise = (async () => {
      const [THREE, { GLTFLoader }, { clone }] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/utils/SkeletonUtils.js")
      ]);

      const gltf = await new GLTFLoader().loadAsync(OBJETO.glb);
      if (!gltf.scene || gltf.scene.getObjectByProperty("isMesh", true) === undefined) {
        throw new Error("O GLB não contém uma cena 3D válida.");
      }
      if (!Array.isArray(gltf.animations) || gltf.animations.length === 0) {
        throw new Error("O GLB não contém uma animação para o encontro.");
      }

      animationClip = gltf.animations.find((clip) => clip.name.toLowerCase() === "idle") ?? gltf.animations[0];
      arRuntime = createThreeScene(THREE, gltf.scene, clone);
      return arRuntime;
    })();

    return arRuntimePromise;
  }

  function createThreeScene(THREE, modelTemplate, cloneModel) {
    const renderer = new THREE.WebGLRenderer({
      canvas: xrCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType("local-floor");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 30);
    scene.add(new THREE.HemisphereLight(0xf4f6ff, 0x748176, 2.1));

    const sunlight = new THREE.DirectionalLight(0xfff1d8, 2.2);
    sunlight.position.set(-2.5, 4, 2.8);
    scene.add(sunlight);

    const reticleGroup = new THREE.Group();
    reticleGroup.matrixAutoUpdate = false;
    reticleGroup.visible = false;
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.095, 40),
      new THREE.MeshBasicMaterial({ color: 0xf0d68b, transparent: true, opacity: 0.9, side: THREE.DoubleSide })
    );
    reticle.rotation.x = -Math.PI / 2;
    reticle.position.y = 0.004;
    reticleGroup.add(reticle);
    scene.add(reticleGroup);

    return {
      THREE,
      renderer,
      scene,
      camera,
      modelTemplate,
      cloneModel,
      reticleGroup,
      animationPaused: prefersReducedMotion
    };
  }

  function getHitTransform(result, activeReferenceSpace) {
    try {
      return result.getPose(activeReferenceSpace)?.transform ?? null;
    } catch {
      return null;
    }
  }

  function makePlacedCharacter(transform, viewerTransform) {
    const { THREE, scene, cloneModel, modelTemplate } = arRuntime;
    const hitMatrix = new THREE.Matrix4().fromArray(transform.matrix);
    const position = new THREE.Vector3().setFromMatrixPosition(hitMatrix);
    const normal = new THREE.Vector3(0, 1, 0).transformDirection(hitMatrix);
    const cameraMatrix = new THREE.Matrix4().fromArray(viewerTransform.matrix);
    const cameraPosition = new THREE.Vector3().setFromMatrixPosition(cameraMatrix);

    const cameraDirection = cameraPosition.clone().sub(position);
    let facing = cameraDirection.clone().addScaledVector(normal, -cameraDirection.dot(normal));
    if (facing.lengthSq() < 0.0001) facing.set(0, 0, 1).applyQuaternion(new THREE.Quaternion().setFromRotationMatrix(hitMatrix));
    facing.normalize();
    const right = new THREE.Vector3().crossVectors(normal, facing).normalize();
    const orientationMatrix = new THREE.Matrix4().makeBasis(right, normal, facing);

    const anchor = new THREE.Group();
    anchor.position.setFromMatrixPosition(hitMatrix);
    anchor.quaternion.setFromRotationMatrix(orientationMatrix);

    const model = cloneModel(modelTemplate);
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty() || !Number.isFinite(bounds.min.y)) {
      throw new Error("Não foi possível calcular o ponto de apoio do modelo.");
    }
    model.position.y -= bounds.min.y;
    anchor.add(model);

    const modelSize = bounds.getSize(new THREE.Vector3());
    const contactShadow = new THREE.Mesh(
      new THREE.CircleGeometry(Math.max(modelSize.x, modelSize.z) * 0.42, 40),
      new THREE.MeshBasicMaterial({ color: 0x162d2b, transparent: true, opacity: 0.18, depthWrite: false })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.003;
    anchor.add(contactShadow);

    scene.add(anchor);
    placedRoot = anchor;
    xrHud.classList.add("is-placed");
    document.querySelectorAll('[data-encounter]').forEach(button => { button.disabled = false; });
    placedMixer = new THREE.AnimationMixer(model);
    const action = placedMixer.clipAction(animationClip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
    return anchor;
  }

  function setEncounterPlaced() {
    recoveryMessageUntil = performance.now() + 1600;
    setXrStatus(
      "Mew apareceu no ponto reconhecido.",
      "Mova-se e olhe para os lados para encontrá-lo. O ponto fica fixo durante esta sessão."
    );
  }

  function updateXrFrame(_time, frame) {
    if (!xrSession || !frame || !arRuntime) return;
    // Desenhe também nos caminhos de procura e recuperação, que retornam cedo.
    updateEncounterFrame(_time, frame);
    arRuntime.renderer.render(arRuntime.scene, arRuntime.camera);
  }

  function updateEncounterFrame(_time, frame) {
    if (!xrSession || !frame || !arRuntime) return;

    const now = performance.now();
    const delta = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.08) : 0;
    lastFrameTime = now;
    if (placedMixer && !arRuntime.animationPaused) placedMixer.update(delta);

    const activeReferenceSpace = arRuntime.renderer.xr.getReferenceSpace() ?? referenceSpace;
    if (!activeReferenceSpace) return;

    const viewerPose = frame.getViewerPose(activeReferenceSpace);
    if (!viewerPose) {
      if (placedRoot) placedRoot.visible = false;
      if (trackingWasAvailable) {
        trackingWasAvailable = false;
        setXrStatus(
          "Rastreamento espacial interrompido.",
          "Segure o celular e mova-o devagar até a câmera recuperar a posição. Mew não será preso ao visor.",
          true
        );
      }
      return;
    }
    if (placedRoot) placedRoot.visible = !viewerPose.emulatedPosition;

    if (viewerPose.emulatedPosition && placedRoot) {
      setXrStatus(
        "O rastreamento de posição está instável.",
        "Mew continua no ponto guardado, mas a posição da câmera pode estar sendo estimada. Mova o celular devagar para recuperar o rastreamento.",
        true
      );
    } else if (!trackingWasAvailable) {
      trackingWasAvailable = true;
      recoveryMessageUntil = now + 1800;
      setXrStatus("Rastreamento recuperado.", "Mew continua no mesmo ponto do ambiente.");
    }

    if (!hitTestSource || placedRoot) {
      if (placedRoot && now >= recoveryMessageUntil && !viewerPose.emulatedPosition) {
        const { THREE } = arRuntime;
        const cameraMatrix = new THREE.Matrix4().fromArray(viewerPose.transform.matrix);
        const relative = placedRoot.position.clone().applyMatrix4(cameraMatrix.invert());
        const view = viewerPose.views[0];
        const projected = view ? relative.clone().applyMatrix4(new THREE.Matrix4().fromArray(view.projectionMatrix)) : null;
        const visible = relative.z < 0 && projected && Math.abs(projected.x) < 0.9 && Math.abs(projected.y) < 0.9;
        const direction = relative.z >= 0
          ? "Olhe para trás, girando o celular devagar."
          : Math.abs(projected?.x ?? 0) > 0.9
            ? (relative.x < 0 ? "Vire o celular para a esquerda." : "Vire o celular para a direita.")
            : (relative.y < 0 ? "Aponte o celular um pouco para baixo." : "Aponte o celular um pouco para cima.");
        setXrStatus(visible ? "Mew está à sua frente." : "Procure Mew ao redor.",
          visible ? "Aproxime-se ou caminhe ao redor. Mew permanece nesse ponto do ambiente." : direction);
      }
      return;
    }

    const hits = frame.getHitTestResults(hitTestSource);
    let validHit = null;
    let validTransform = null;
    const cameraPosition = new arRuntime.THREE.Vector3().setFromMatrixPosition(
      new arRuntime.THREE.Matrix4().fromArray(viewerPose.transform.matrix)
    );

    for (const hit of hits) {
      const transform = getHitTransform(hit, activeReferenceSpace);
      if (!transform) continue;

      const matrix = new arRuntime.THREE.Matrix4().fromArray(transform.matrix);
      const normal = new arRuntime.THREE.Vector3(0, 1, 0).transformDirection(matrix);
      if (normal.y < 0.91) continue;

      const position = new arRuntime.THREE.Vector3().setFromMatrixPosition(matrix);
      const horizontalDistance = Math.hypot(position.x - cameraPosition.x, position.z - cameraPosition.z);
      if (horizontalDistance < 0.35 || horizontalDistance > 2.0) continue;

      validHit = hit;
      validTransform = transform;
      break;
    }

    if (!validHit) {
      arRuntime.reticleGroup.visible = false;
      if (xrStatus.textContent !== "Procurando uma superfície horizontal…") {
        setXrStatus(
          "Procurando uma superfície horizontal…",
          "Aponte para uma mesa ou para o chão bem iluminado, a uma distância próxima, e mova o celular devagar."
        );
      }
      return;
    }

    arRuntime.reticleGroup.matrix.fromArray(validTransform.matrix);
    arRuntime.reticleGroup.matrixWorldNeedsUpdate = true;
    arRuntime.reticleGroup.visible = true;

    try {
      makePlacedCharacter(validTransform, viewerPose.transform);
      arRuntime.reticleGroup.visible = false;
      setEncounterPlaced();
    } catch (error) {
      arRuntime.reticleGroup.visible = false;
      webxrLoadError = error;
      setXrStatus("Não foi possível posicionar o modelo.", "Encerre o encontro e confira o arquivo 3D antes de tentar novamente.", true);
    }
  }

  function cleanUpXrSession() {
    orientationEncounter?.stop();
    orientationEncounter = null;
    if (arRuntime?.renderer) arRuntime.renderer.setAnimationLoop(null);
    if (placedMixer) {
      placedMixer.stopAllAction();
      placedMixer.uncacheRoot(placedMixer.getRoot());
    }
    if (placedRoot) {
      arRuntime.scene.remove(placedRoot);
      // Geometria do modelo é compartilhada com o template; só a sombra é exclusiva.
      const shadow = placedRoot.children[1];
      shadow?.geometry?.dispose();
      shadow?.material?.dispose();
    }
    if (hitTestSource) {
      try { hitTestSource.cancel(); } catch { /* A sessão pode já ter encerrado o recurso. */ }
    }
    hitTestSource = null;
    viewerSpace = null;
    referenceSpace = null;
    xrSession = null;
    placedMixer = null;
    placedRoot = null;
    xrHud.classList.remove("is-placed");
    xrHud.querySelector("details").open = false;
    document.querySelectorAll('[data-encounter]').forEach(button => { button.disabled = true; });
    encounterIsActive = false;
    lastFrameTime = 0;
    trackingWasAvailable = true;
    recoveryMessageUntil = 0;

    if (arRuntime?.reticleGroup) arRuntime.reticleGroup.visible = false;
    xrOverlay.hidden = true;
    document.body.classList.remove("xr-active");
    setXrStatus("Encontro encerrado.", "A câmera foi liberada. Você pode iniciar outro encontro.");
    updateArControls();
  }

  function onXrSessionEnded(event) {
    if (xrSession && event.target !== xrSession) return;
    cleanUpXrSession();
  }

  function describeXrError(error) {
    if (error?.name === "NotAllowedError") {
      return "O acesso à câmera ou ao rastreamento foi negado ou cancelado. Libere a permissão nas configurações do navegador e tente novamente.";
    }
    if (error?.name === "NotSupportedError") {
      return "Este navegador não oferece os recursos necessários de RA de superfície. Use o visualizador manual do aparelho, se disponível, ou a prévia 3D.";
    }
    if (error?.name === "SecurityError") {
      return "O navegador bloqueou o acesso seguro à câmera. Abra esta página por HTTPS ou localhost.";
    }
    if (error?.name === "InvalidStateError") {
      return "Outra sessão de RA ainda está aberta. Encerre-a e tente novamente.";
    }
    return "Não foi possível iniciar o encontro. Confira a conexão, a permissão da câmera e o suporte do aparelho.";
  }

  async function startWebXrEncounter() {
    if (!webxrSupported || !webxrReady || !arRuntime) return;

    encounterIsActive = true;
    updateArControls();
    xrOverlay.hidden = false;
    document.body.classList.add("xr-active");
    setXrStatus("Aguardando permissão da câmera…", "A câmera só é usada dentro desta sessão de RA.");

    let requestedSession = null;
    try {
      // Esta chamada ocorre diretamente no gesto do botão para preservar a ativação do navegador.
      const sessionPromise = navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test", "local-floor", "dom-overlay"],
        domOverlay: { root: xrOverlay }
      });
      requestedSession = await sessionPromise;
      xrSession = requestedSession;
      xrSession.addEventListener("end", onXrSessionEnded, { once: true });
      xrSession.addEventListener("visibilitychange", () => {
        if (xrSession?.visibilityState === "hidden") {
          setXrStatus("Sessão de RA pausada pelo aparelho.", "Volte ao navegador para continuar; o ponto de Mew não foi apagado.");
        }
      });

      await arRuntime.renderer.xr.setSession(xrSession);
      referenceSpace = await xrSession.requestReferenceSpace("local-floor");
      viewerSpace = await xrSession.requestReferenceSpace("viewer");
      hitTestSource = await xrSession.requestHitTestSource({ space: viewerSpace, entityTypes: ["plane"] });

      if (!xrSession.domOverlayState) {
        throw new Error("O navegador não disponibilizou controles sobre a imagem da câmera.");
      }

      arRuntime.animationPaused = prefersReducedMotion;
      arRuntime.renderer.setAnimationLoop(updateXrFrame);
      updateXrPauseButton();
      setXrStatus(
        "Reconheça o ambiente.",
        "Mova o celular devagar até surgir o indicador sobre uma superfície horizontal próxima. Mew aparecerá nesse ponto."
      );
    } catch (error) {
      if (requestedSession && !requestedSession.ended) {
        try { await requestedSession.end(); } catch { /* A sessão pode ter terminado ao falhar a inicialização. */ }
      }
      cleanUpXrSession();
      setArNote(describeXrError(error), true);
      setViewerCaption("A prévia 3D continua disponível.");
    }
  }

  function openManualAr() {
    if (!modelIsLoaded || viewer.canActivateAR !== true) return;
    externalArIsActive = true;
    setViewerCaption("No visualizador, mova o celular devagar apontando para o chão iluminado. Enquanto aparecer ‘Mova o iPhone para iniciar’, Mew é apenas uma prévia. Aguarde reconhecer a superfície e então posicione-o; depois mova a câmera para vê-lo no ambiente.");
    viewer.activateAR();
  }

  viewer.addEventListener("progress", (event) => {
    const progress = Math.round((event.detail.totalProgress || 0) * 100);
    loading.textContent = progress > 0 ? `Carregando o modelo 3D… ${progress}%` : "Carregando o modelo 3D…";
  });

  viewer.addEventListener("load", () => {
    modelIsLoaded = true;
    loading.hidden = true;
    const animations = viewer.availableAnimations ?? [];
    previewHasAnimation = animations.length > 0;
    previewAnimationButton.hidden = !previewHasAnimation;

    if (previewHasAnimation) {
      viewer.animationName = animations.find((name) => name.toLowerCase() === "idle") ?? animations[0];
      setPreviewAnimationPaused(prefersReducedMotion);
    }

    setViewerCaption(previewHasAnimation
      ? "Arraste para girar e use dois dedos para aproximar. A animação pode ser pausada."
      : "Arraste para girar e use dois dedos para aproximar.");
    updateExternalArAvailability();
  });

  viewer.addEventListener("error", () => {
    modelIsLoaded = false;
    loading.hidden = false;
    loading.classList.add("is-error");
    loading.textContent = "Não foi possível carregar o modelo. Verifique o arquivo e recarregue a página.";
    setViewerCaption("O arquivo GLB da criatura não carregou.");
    updateExternalArAvailability();
  });

  viewer.addEventListener("ar-status", (event) => {
    const status = event.detail.status;

    if (status === "session-started") {
      externalArIsActive = true;
      setViewerCaption("Visualizador externo aberto. Siga as instruções do aparelho para posicionar Mew manualmente.");
    } else if (status === "object-placed") {
      setViewerCaption("Mew foi colocado manualmente pelo visualizador do aparelho; esta alternativa é separada do encontro WebXR automático.");
    } else if (status === "failed") {
      externalArIsActive = false;
      setViewerCaption("O visualizador de RA não abriu. Verifique as permissões do aparelho.");
      setArNote("A alternativa de RA do aparelho falhou. A prévia 3D continua disponível.", true);
      updateArControls();
    } else if (status === "not-presenting" && externalArIsActive) {
      externalArIsActive = false;
      setViewerCaption("Você voltou do visualizador externo. A câmera foi liberada pelo aparelho.");
      updateExternalArAvailability();
    }
  });

  viewer.addEventListener("ar-tracking", (event) => {
    if (!externalArIsActive) return;
    setViewerCaption(event.detail.status === "tracking"
      ? "O visualizador externo reconheceu o ambiente. Posicione Mew manualmente; a página não controla essa etapa."
      : "O visualizador externo está procurando superfícies. Mova o celular devagar.");
  });

  previewAnimationButton.addEventListener("click", () => {
    setPreviewAnimationPaused(!previewIsPaused);
  });

  arButton.addEventListener("click", () => {
    if (!surfaceMode) {
      if (encounterIsActive || !webxrReady) return;
      encounterIsActive = true;
      updateArControls();
      xrOverlay.hidden = false;
      document.body.classList.add('xr-active');
      setXrStatus('Preparando câmera e movimento…', 'Permita o acesso para iniciar sem reconhecer superfícies.');
      orientationEncounter = createOrientationEncounter({
        runtime: arRuntime,
        video: document.querySelector('#camera-encontro'),
        status: setXrStatus,
        place: makePlacedCharacter,
        tick: delta => { if (!arRuntime.animationPaused) placedMixer?.update(delta); },
        end: message => { cleanUpXrSession(); setArNote(message, true); arButton.focus(); }
      });
      orientationEncounter.start();
      arRuntime.animationPaused = false;
      updateXrPauseButton();
      xrEndButton.focus();
    }
    else if (webxrSupported) startWebXrEncounter();
    else openManualAr();
  });

  manualArButton.addEventListener("click", openManualAr);

  document.querySelectorAll('[data-preview]').forEach(button => {
    button.addEventListener('click', () => {
      if (!modelIsLoaded) return;
      const orbit = viewer.getCameraOrbit();
      const action = button.dataset.preview;
      const theta = orbit.theta + (action === 'left' ? -1 : action === 'right' ? 1 : 0) * Math.PI / 6;
      const radius = Math.max(0.45, Math.min(3, orbit.radius * (action === 'in' ? 0.85 : action === 'out' ? 1 / 0.85 : 1)));
      viewer.cameraOrbit = `${theta}rad ${orbit.phi}rad ${radius}m`;
    });
  });
  viewer.addEventListener('load', () => {
    document.querySelectorAll('[data-preview]').forEach(button => { button.disabled = false; });
  });
  document.querySelectorAll('[data-encounter]').forEach(button => {
    button.addEventListener('click', () => {
      if (!placedRoot) return;
      const action = button.dataset.encounter;
      if (action === 'left' || action === 'right') {
        placedRoot.rotateY((action === 'left' ? -1 : 1) * Math.PI / 6);
      } else {
        const size = Math.max(0.4, Math.min(2.5, placedRoot.scale.x * (action === 'in' ? 1.15 : 1 / 1.15)));
        placedRoot.scale.setScalar(size);
      }
    });
  });

  xrPauseButton.addEventListener("click", () => {
    if (!arRuntime) return;
    arRuntime.animationPaused = !arRuntime.animationPaused;
    updateXrPauseButton();
  });

  xrEndButton.addEventListener("click", async () => {
    if (xrSession && !xrSession.ended) {
      try { await xrSession.end(); } catch { cleanUpXrSession(); }
    } else {
      cleanUpXrSession();
    }
  });

  window.addEventListener("resize", () => {
    if (!arRuntime) return;
    arRuntime.renderer.setSize(window.innerWidth, window.innerHeight, false);
    arRuntime.camera.aspect = window.innerWidth / window.innerHeight;
    arRuntime.camera.updateProjectionMatrix();
  });

  window.addEventListener("pagehide", () => {
    if (orientationEncounter) cleanUpXrSession();
    if (xrSession && !xrSession.ended) xrSession.end().catch(() => {});
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && orientationEncounter) {
      cleanUpXrSession();
      setArNote('Encontro encerrado ao sair da página. Toque em iniciar para abrir a câmera novamente.');
    }
  });

  async function loadModelViewer() {
    try {
      await import(MODEL_VIEWER_MODULE);
      await customElements.whenDefined("model-viewer");
      if (viewer.loaded) {
        modelIsLoaded = true;
        const animations = viewer.availableAnimations ?? [];
        previewHasAnimation = animations.length > 0;
        previewAnimationButton.hidden = !previewHasAnimation;
        if (previewHasAnimation) {
          viewer.animationName = animations.find((name) => name.toLowerCase() === "idle") ?? animations[0];
          setPreviewAnimationPaused(prefersReducedMotion);
        }
        loading.hidden = true;
        setViewerCaption(previewHasAnimation
          ? "Arraste para girar e use dois dedos para aproximar. A animação pode ser pausada."
          : "Arraste para girar e use dois dedos para aproximar.");
        updateExternalArAvailability();
      }
    } catch {
      loading.hidden = false;
      loading.classList.add("is-error");
      loading.textContent = "O visualizador 3D não carregou. Verifique a conexão e recarregue a página.";
      setViewerCaption("A prévia 3D precisa carregar o visualizador da página.");
      updateExternalArAvailability();
    }
  }

  async function prepareEncounter() {
    webxrSupported = await detectWebXRSupport();
    if (surfaceMode && !webxrSupported) {
      updateArControls();
      return;
    }

    try {
      await loadThreeRuntime();
      webxrReady = true;
    } catch (error) {
      webxrLoadError = error;
    }
    updateArControls();
  }

  copyButton.addEventListener("click", async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(objectUrl.toString());
      } else {
        const temporaryInput = document.createElement("textarea");
        temporaryInput.value = objectUrl.toString();
        temporaryInput.setAttribute("readonly", "");
        temporaryInput.style.position = "fixed";
        temporaryInput.style.opacity = "0";
        document.body.append(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand("copy");
        temporaryInput.remove();
        if (!copied) throw new Error("Não foi possível copiar o link.");
      }

      copyStatus.textContent = "Link copiado. Use a URL publicada em HTTPS para criar o QR code.";
    } catch {
      copyStatus.textContent = "Não foi possível copiar. Selecione e copie o endereço exibido.";
    }
  });

  updateArControls();
  loadModelViewer();
  prepareEncounter();
}
