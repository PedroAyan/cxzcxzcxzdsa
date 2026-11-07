Controles adicionados: setas giram em passos de 30 graus; +/− aproximam a câmera da prévia e alteram a escala virtual no encontro (0,4× a 2,5×). A posição do encontro permanece fixa. Os controles do encontro ficam desativados até Mew aparecer; reiniciar restaura a escala.

# Modelo substituído pelo ZIP enviado — 06/11/2026

O modelo exibido agora vem do arquivo `Wii U - Super Smash Bros. for Wii U - Pokemon - Mew.zip` enviado pelo usuário. Fonte informada: [Mew / The Models Resource](https://models.spriters-resource.com/wii_u/supersmashbrosforwiiu/asset/291872/), publicação de Ploaj, conteúdo identificado como Super Smash Bros. for Wii U. Não é um modelo original criado neste projeto; não se atribui a ele automaticamente a licença CC do upload separado no Sketchfab.

A conversão preserva a geometria e a textura PNG, com 2.230 vértices, 3.358 triângulos e 34 ossos. Normais foram suavizadas nas costuras, a cauda foi curvada e o enquadramento da prévia foi ajustado. A animação Idle de seis segundos foi criada no projeto: 15 canais de rotação para tronco, pescoço, cabeça, braços e cadeia da cauda. Não foram inventadas piscadas que o arquivo não possui. O GLB embute a textura e o esqueleto (aproximadamente 323 KB). O USDZ embute a textura e a deformação amostrada em 61 instantes (aproximadamente 3,45 MB), sem depender de suporte ao esqueleto no visualizador externo.

Para reproduzir a conversão, instale numpy, scipy e usd-core e execute `python scripts/importar-mew.py "CAMINHO_DO_ZIP"`. O ZIP original permanece na área de trabalho. Os geradores `gerar-mew.py` e `gerar-mew-usdz.py` pertencem ao boneco demonstrativo anterior: executá-los sobrescreve o modelo atual. As descrições antigas de geometria, cinco canais e piscadas nas seções abaixo são históricas e não descrevem o arquivo novo.

Validação: prévia real carregada no navegador, textura e pose inspecionadas, controle de pausa verificado. Os testes de orientação continuam passando. Verificação física de câmera/sensores e animação no Quick Look continua pendente.

# Modo principal atualizado — câmera e orientação

O botão principal agora abre a câmera na página e pede orientação no gesto inicial (incluindo a permissão de movimento do iOS). Não usa Quick Look, hit-test ou reconhecimento de mesa. Mew aparece uma única vez a cerca de 20 graus ao lado da direção inicial e executa o clip Idle. A rotação do celular altera a câmera 3D, sem reposicionar o personagem para acompanhar a tela. A distância de 1,3 unidade e o deslocamento vertical são virtuais, não medidas do ambiente. O vídeo usa recorte para preencher a tela e FOV aproximado: não há calibração óptica nem oclusão. Caminhar não muda a perspectiva; sensores podem apresentar deriva.

Sem sensores válidos em 10 segundos, o encontro encerra e explica o problema. Sensores interrompidos ocultam o modelo em vez de deixá-lo preso à tela. Encerrar ou sair da página libera câmera, listener e ciclo de renderização. Pausa de animação permanece disponível. O modo de orientação inicia animado; a preferência de movimento reduzido continua aplicada à prévia.

Use HTTPS no celular e permita câmera e movimento. A alternativa manual abre o visualizador do aparelho e continua exigindo superfície. O modo espacial anterior fica disponível por `?obj=mew&modo=superficie`; as seções abaixo descrevem esse modo e os arquivos compartilhados.

Validação física do modo novo em iPhone e Android está pendente. Código local não significa publicação. Referência dos eixos: https://www.w3.org/TR/orientation-event/ .

# Mundo de bolso — encontro de Mew em RA

Protótipo web estático com prévia 3D e um encontro espacial em WebXR. A leitura de QR code continua a cargo da câmera ou do leitor do celular; o endereço aceita `?obj=mew`. Não há mapa, GPS, login nem backend.

**[Abrir a página publicada do Mew](https://pedroayan.github.io/cxzcxzcxzdsa/?obj=mew)**

O GitHub Pages deste repositório publica a raiz de `main`. Cada atualização pode levar alguns minutos para aparecer no endereço acima.

## Executar localmente

Na pasta do projeto, inicie um servidor estático:

```powershell
python -m http.server 8000
```

Abra `http://localhost:8000/?obj=mew`. `localhost` é aceito como contexto seguro para desenvolvimento. Para testar no celular, hospede a pasta em HTTPS; o endereço HTTP da rede local não dá ao navegador o acesso necessário à câmera e ao WebXR.

Não há etapa de build. A página carrega Three.js 0.187.0 e `<model-viewer>` 4.4.0 de CDNs com versão fixa; portanto, precisa de conexão para carregar as bibliotecas. Não são usadas chaves nem serviços pagos.

## Como o encontro funciona

Ao tocar em **Iniciar encontro em RA**, o código chama `navigator.xr.requestSession("immersive-ar")`. A câmera só entra em uso nessa chamada. O WebXR exige hit-test, referência `local-floor` e controles HTML sobre a câmera. O hit-test consulta o centro da imagem e espera uma interseção com um plano aproximadamente horizontal. O primeiro resultado dentro da janela local escolhida pelo protótipo coloca Mew automaticamente; não há botão de posicionamento nem reposicionamento quadro a quadro.

O filtro do protótipo aceita normais com componente vertical acima de 0,91 e ponto entre 0,35 m e 2,0 m de distância horizontal do início da sessão. Esses valores definem onde o código procura; não são uma promessa de precisão métrica. O resultado depende do rastreamento do aparelho, da luz e de detalhes visuais no ambiente. Sem plano válido, Mew não aparece.

Depois do surgimento, o modelo mantém a transformação obtida no espaço `local-floor` da sessão. A página não move o personagem para acompanhar a câmera. O WebXR fornece poucos sinais uniformes de perda de rastreamento: o protótipo avisa quando uma pose deixa de existir ou quando a posição fica marcada como estimada, e nunca prende Mew ao visor para mascarar isso. Um aparelho pode, contudo, apresentar deriva sem uma notificação explícita; a posição não é persistida depois de encerrar a sessão.

O arquivo entrega o clip `Idle` de 6 segundos com respiração do tronco, movimento de cabeça e cauda e piscadas. WebXR e a prévia repetem o ciclo; o botão permite pausar e retomar. A animação inicia pausada quando o sistema pede movimento reduzido. Os pés continuam no plano de apoio. A geometria do personagem tem aproximadamente 38 cm de altura, conforme os limites do modelo e sua escala glTF; isso descreve o arquivo, não a precisão com que o aparelho medirá o ambiente.

## Suporte e alternativas

O encontro automático usa WebXR Hit Test, padrão do W3C. O suporte é verificado em tempo de execução com `isSessionSupported("immersive-ar")`, e a sessão ainda pode ser negada pelo aparelho ou por permissões. Hoje, o caminho prático é Chrome em aparelho Android compatível com ARCore e com os módulos necessários de WebXR. Isso não significa suporte a todos os modelos Android ou navegadores móveis; esta implementação não foi testada fisicamente em Android.

O Safari no iPhone não oferece `immersive-ar` do WebXR. A página entrega `models/mew.usdz` animado ao Quick Look como alternativa: o visualizador do sistema reconhece a superfície, mas a pessoa coloca o modelo com um toque. A interface da página não controla a âncora, os controles ou a câmera depois que o Quick Look abre. A Apple documenta animações em Quick Look; o clip exportado tem menos de 10 segundos e foi feito para repetir. O arquivo e os canais foram inspecionados localmente, mas a reprodução e a colocação ainda precisam de validação em iPhone.

No Android ou em outro navegador que indique suporte ao visualizador do aparelho, a alternativa abre Scene Viewer. Ela também requer posicionamento manual e fica fora do controle do site; não é apresentada como o encontro WebXR automático.

O SDK Universal AR da Zappar oferece Instant World Tracking em navegadores móveis, incluindo Safari, mas requer conta e uso sob os termos e planos proprietários do fornecedor. Não foi incluído sem licença/conta aprovada para este projeto; além disso, o caminho WebAR tem fluxo de colocação controlado pelo SDK. O MindAR atual é voltado a rastreamento de imagem e rosto, e AR.js a marcadores, imagens e localização — não substituem o hit-test de uma superfície livre. O 8th Wall anunciou o encerramento do serviço: desde 28/02/2026 não aceita novas edições e a hospedagem existente termina em 28/02/2027, então não é uma base adequada para um projeto novo.

Referências técnicas consultadas em novembro de 2026:

- [W3C — WebXR Hit Test](https://www.w3.org/TR/webxr-hit-test-1/)
- [W3C — WebXR Device API e recursos de sessão](https://www.w3.org/TR/webxr/)
- [Apple — AR Quick Look](https://developer.apple.com/documentation/arkit/previewing-a-model-with-ar-quick-look)
- [Apple — exemplos de animação em Quick Look](https://developer.apple.com/augmented-reality/quick-look/)
- [WebKit — suporte a WebXR na plataforma Apple](https://bugs.webkit.org/show_bug.cgi?id=309550)
- [Zappar — distribuição WebAR e limites de rastreamento](https://docs.zap.works/general/distribution-methods/)
- [8th Wall — encerramento anunciado](https://forum.8thwall.com/t/important-changes-to-8th-wall-business/8578)
- [Three.js — GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)
- [model-viewer — documentação](https://modelviewer.dev/docs/)

## Arquivos do modelo

- `models/mew.glb`: fonte da prévia 3D, WebXR e Scene Viewer; inclui o clip `Idle`.
- `models/mew.usdz`: versão animada usada por Quick Look no iPhone.
- `scripts/gerar-mew.py`: gera o GLB, sem baixar modelos ou texturas.
- `scripts/gerar-mew-usdz.py`: converte a geometria e os canais de animação do GLB para USDZ usando OpenUSD local.
- `scripts/requirements-usdz.txt`: dependência OpenUSD usada pelo conversor.

Para regenerar os arquivos depois de editar o gerador:

```powershell
python .\scripts\gerar-mew.py
python -m pip install -r .\scripts\requirements-usdz.txt
python .\scripts\gerar-mew-usdz.py
```

Para trocar o personagem, substitua `models/mew.glb` e `models/mew.usdz` juntos e mantenha uma animação glTF. Se usar o gerador USDZ, instale OpenUSD; o processo produz uma entrada binária USDC dentro do pacote para evitar uma cópia textual grande da geometria.

## Verificação pendente

Correção local em 06/11/2026: o ciclo WebXR agora chama `renderer.render` em todos os quadros com sessão ativa, inclusive durante procura e recuperação. Antes, a posição era calculada sem desenhar a cena. Ao encerrar, remove o personagem da cena, encerra o mixer e libera a sombra exclusiva, evitando duplicação no próximo encontro. A orientação de procura usa a posição relativa à câmera; em perda de pose o modelo é ocultado até recuperar o rastreamento, preservando sua posição.

A tela do Quick Look com “Mova o iPhone para iniciar” mostra a etapa de reconhecimento, ainda sem colocação confirmada. Mova devagar sobre uma superfície iluminada com detalhes visuais. O site não consegue retirar essa etapa nem controlar a posição dentro do Quick Look. Para o encontro automático em Safari/iPhone, esta implementação continua incompleta: seria necessário integrar outra solução de rastreamento compatível ou um aplicativo nativo. Não foi adicionada uma simulação por sobreposição.

O bloco JSON do GLB foi lido localmente e contém o clip `Idle` com cinco canais. O USDZ abre pelo OpenUSD e contém 35 amostras de tempo distribuídas por cinco atributos animados. Essa verificação confirma a estrutura dos arquivos, mas não comprova o carregamento no navegador nem a reprodução no Quick Look.

Falta testar o fluxo completo em pelo menos um iPhone e um Android compatível: permissões, superfície automática no WebXR, saída e retorno ao campo de visão, caminhada ao redor, perda/recuperação de rastreamento, pausa da animação, encerramento e reinício. No iPhone, testar separadamente Quick Look, o ponto manual e o loop animado. Não declarar suporte físico a nenhuma plataforma antes desses testes.
