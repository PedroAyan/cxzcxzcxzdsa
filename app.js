const OBJETO_DEMO = {
  id: "mew",
  nome: "Mew",
  descricao: "Uma pequena criatura de olhos azuis e cauda comprida.",
  glb: "./models/mew.glb",
  usdz: ""
};
const MODEL_VIEWER_MODULE = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.4.0/model-viewer.min.js";

const params = new URLSearchParams(window.location.search);
const experiencia = document.querySelector("#experiencia");
const paginaInvalida = document.querySelector("#objeto-invalido");
const viewer = document.querySelector("#visualizador");
const loading = document.querySelector("#carregando");
const viewerCaption = document.querySelector("#estado-visualizador");
const arButton = document.querySelector("#botao-ra");
const arNote = document.querySelector("#aviso-ra");
const objectLink = document.querySelector("#endereco-objeto");
const copyButton = document.querySelector("#copiar-link");
const copyStatus = document.querySelector("#estado-copia");

const requestedId = params.get("obj");
const objectIsValid = requestedId === null || requestedId === OBJETO_DEMO.id;

if (!objectIsValid) {
  experiencia.hidden = true;
  document.querySelector(".how-it-works").hidden = true;
  document.querySelector(".object-link").hidden = true;
  paginaInvalida.hidden = false;
  document.title = "Objeto não encontrado — Mundo de bolso";
} else {
  const objectId = requestedId ?? OBJETO_DEMO.id;
  const objectUrl = new URL(window.location.href);
  objectUrl.search = "";
  objectUrl.hash = "";
  objectUrl.searchParams.set("obj", objectId);

  document.querySelector("#nome-objeto").textContent = OBJETO_DEMO.nome;
  document.querySelector("#descricao-objeto").textContent = OBJETO_DEMO.descricao;
  document.title = `${OBJETO_DEMO.nome} — Mundo de bolso`;
  objectLink.textContent = objectUrl.toString();
  viewer.setAttribute("src", OBJETO_DEMO.glb);

  // Quando houver uma versão USDZ, preencha OBJETO_DEMO.usdz para o Quick Look.
  if (OBJETO_DEMO.usdz) viewer.setAttribute("ios-src", OBJETO_DEMO.usdz);

  let modelIsLoaded = false;
  let arSessionIsActive = false;

  function updateArAvailability() {
    if (!modelIsLoaded) {
      arButton.disabled = true;
      arButton.textContent = "Preparando RA…";
      return;
    }

    const canActivate = viewer.canActivateAR === true;
    arButton.disabled = !canActivate;
    arButton.textContent = canActivate ? "Ver em RA" : "RA indisponível";
    arNote.classList.remove("is-error");

    if (canActivate) {
      arNote.textContent = "Ao iniciar, o visualizador do aparelho usará a câmera para encontrar a superfície. Se negar a permissão, libere-a nas configurações.";
    } else {
      arNote.textContent = "A RA não está disponível neste aparelho ou navegador. Gire e amplie a prévia 3D acima; para RA, abra este link em HTTPS num navegador compatível.";
    }
  }

  viewer.addEventListener("progress", (event) => {
    const progress = Math.round((event.detail.totalProgress || 0) * 100);
    loading.textContent = progress > 0 ? `Carregando o modelo 3D… ${progress}%` : "Carregando o modelo 3D…";
  });

  viewer.addEventListener("load", () => {
    modelIsLoaded = true;
    loading.hidden = true;
    viewerCaption.textContent = "Arraste para girar e use dois dedos para aproximar.";
    updateArAvailability();
  });

  viewer.addEventListener("error", () => {
    modelIsLoaded = false;
    arButton.disabled = true;
    arButton.textContent = "Modelo indisponível";
    loading.hidden = false;
    loading.classList.add("is-error");
    loading.textContent = "Não foi possível carregar o modelo. Verifique a conexão e recarregue a página.";
    viewerCaption.textContent = "O arquivo GLB da criatura não carregou.";
    arNote.textContent = "A prévia 3D e a RA precisam que o arquivo do modelo esteja acessível.";
    arNote.classList.add("is-error");
  });

  arButton.addEventListener("click", () => {
    if (!modelIsLoaded || viewer.canActivateAR !== true) return;

    // A chamada fica síncrona no gesto do botão, como exigido por WebXR.
    viewer.activateAR();
    viewerCaption.textContent = "Mova o celular devagar sobre uma mesa bem iluminada.";
  });

  viewer.addEventListener("ar-status", (event) => {
    const status = event.detail.status;

    if (status === "session-started") {
      arSessionIsActive = true;
      arButton.disabled = true;
      viewerCaption.textContent = "Mova o celular devagar até o visualizador reconhecer a mesa.";
    } else if (status === "object-placed") {
      viewerCaption.textContent = "Objeto posicionado. Toque novamente para reposicionar ou use os gestos para ajustar.";
    } else if (status === "failed") {
      arSessionIsActive = false;
      updateArAvailability();
      arNote.classList.add("is-error");
      arNote.textContent = "A RA não abriu. Se você negou o acesso à câmera, permita-o nas configurações do navegador e tente novamente.";
      viewerCaption.textContent = "Você ainda pode girar e ampliar o modelo em 3D.";
    } else if (status === "not-presenting" && arSessionIsActive) {
      arSessionIsActive = false;
      updateArAvailability();
      viewerCaption.textContent = "A prévia em 3D continua disponível.";
    }
  });

  viewer.addEventListener("ar-tracking", (event) => {
    if (event.detail.status === "tracking") {
      viewerCaption.textContent = "Superfície reconhecida. Toque na mesa para posicionar.";
    } else {
      viewerCaption.textContent = "Mova o celular devagar sobre a mesa para ajudar o rastreamento.";
    }
  });

  async function loadViewerLibrary() {
    try {
      await import(MODEL_VIEWER_MODULE);
      await customElements.whenDefined("model-viewer");
      updateArAvailability();
    } catch {
      modelIsLoaded = false;
      arButton.disabled = true;
      arButton.textContent = "Visualizador indisponível";
      loading.hidden = false;
      loading.classList.add("is-error");
      loading.textContent = "O visualizador 3D não carregou. Verifique a conexão e recarregue a página.";
      viewerCaption.textContent = "A prévia 3D precisa carregar o visualizador da página.";
      arNote.classList.add("is-error");
      arNote.textContent = "Sem o visualizador, a RA também não pode ser iniciada.";
    }
  }

  loadViewerLibrary();

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

      copyStatus.textContent = "Link copiado. Use a URL publicada em HTTPS para gerar o QR code.";
    } catch {
      copyStatus.textContent = "Não foi possível copiar. Selecione e copie o endereço exibido.";
    }
  });
}