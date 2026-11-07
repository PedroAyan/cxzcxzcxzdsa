# Atualização de escopo — 06/11/2026

A pedido do usuário, o modo principal passa a ser câmera com orientação, sem reconhecimento de superfície. O personagem 3D animado permanece em uma direção escolhida uma vez por encontro; girar o celular o tira do campo de visão. Não há rastreamento de translação, ancoragem em chão ou medição de distância real. As exigências abaixo de superfície e caminhada se aplicam somente ao modo opcional `?obj=mew&modo=superficie`. Essa decisão substitui os requisitos incompatíveis do escopo anterior. Não prometer equivalência ao rastreamento espacial do Pokémon GO.

# Especificação — encontro de personagem em RA na web

## Resultado esperado

A pessoa abre o site no celular e inicia um encontro. Após autorizar a câmera e reconhecer o ambiente, um personagem animado surge em uma posição próxima. Ao apontar a câmera para esse lugar, ela o vê integrado ao ambiente, como em um encontro de RA de Pokémon GO. Ao olhar para outro lado ele sai da imagem; ao voltar, continua no mesmo ponto.

A prévia 3D centralizada e a simples abertura de visualizador externo são alternativas, não prova de entrega do encontro. Esta especificação define o comportamento desejado; não afirma que já exista.

## Significado de proximidade

No protótipo, “perto de mim” significa uma posição no espaço local rastreado pela câmera, preferencialmente sobre superfície horizontal a curta distância da posição inicial da pessoa. Documentar a distância pretendida e os limites de medição. Não inventar distâncias ou precisão.

Não há mapa, surgimento por GPS, personagem distribuído pelo bairro nem posição compartilhada entre pessoas. Não solicitar geolocalização para simular esse encontro local. Localização geográfica exige especificação própria.

## Fluxo principal

1. Abrir a URL HTTPS pelo navegador ou QR code, podendo identificar o personagem com ?obj=mew. A leitura do QR fica com a câmera padrão do celular.
2. Apresentar o botão **Iniciar encontro em RA**, explicando que usará a câmera.
3. Após o toque, solicitar apenas permissões necessárias e iniciar câmera e rastreamento.
4. Orientar a mover o celular devagar para reconhecer uma superfície horizontal. Aguardar posição espacial válida.
5. Escolher automaticamente uma posição próxima válida e criar um único personagem nesse ponto. Se a tecnologia exigir toque para colocar, oferecer essa alternativa explicitamente, sem afirmar surgimento automático.
6. Permitir procurar o personagem movendo o celular. Quando estiver fora do campo de visão, orientar a procura com base na posição relativa realmente conhecida.
7. Manter o personagem no ambiente com animações de espera em repetição. A pessoa pode se aproximar fisicamente e observar outros ângulos.
8. Permitir encerrar a câmera e iniciar outro encontro. Escolher outro ponto apenas nessa ação, nunca em cada quadro ou movimento.
9. Sem suporte ao encontro completo, explicar a limitação e oferecer prévia 3D ou colocação pelo visualizador do aparelho, identificando a alternativa.

## Requisitos funcionais

- Usar posição e orientação no ambiente independentes da câmera, com rastreamento espacial adequado. Manter âncora ou referência espacial durante a sessão conforme a tecnologia.
- O personagem não acompanha a câmera, não fica permanentemente centralizado e não é uma imagem sobreposta ao vídeo.
- Reconhecer superfície horizontal para apoio. Não exigir mesa específica nem usar o QR como marcador de ancoragem.
- Manter escala física definida pelo arquivo e documentar dimensões. Não apresentar aproximação como medida exata.
- Incluir ciclo real de animação com respiração e movimento de cabeça ou cauda; piscadas podem complementar. Preservar o ponto de apoio sem deslizar os pés.
- A animação deve existir no arquivo entregue à experiência. auto-rotate e CSS no contêiner não substituem animação do personagem.
- Respeitar movimento reduzido na prévia e oferecer pausa onde a plataforma permitir. Documentar limites de visualizadores externos.
- Na perda de rastreamento, informar recuperação da posição. Não prender silenciosamente o personagem ao visor nem reposicioná-lo continuamente para mascarar a perda.
- Encerrar recursos de câmera ao sair e permitir nova tentativa sem personagens duplicados.
- Tratar carregamento, câmera negada ou ocupada, sensores negados ou ausentes, superfície não encontrada, perda de rastreamento, link inválido, arquivo indisponível e incompatibilidade.
- Usar interface responsiva para celular, instruções curtas, foco visível, áreas de toque confortáveis e áreas seguras do aparelho.

## Direção técnica

Inspecionar o projeto antes de escolher a implementação. Avaliar WebXR com rastreamento e detecção de superfície e, se necessário, uma solução de WebAR que entregue o comportamento nos navegadores pretendidos. Conferir suporte atual, manutenção, licença, hospedagem e condições do SDK antes de adotá-lo.

O model-viewer pode continuar na prévia 3D. Seus modos de RA devem ser avaliados pelo comportamento entregue: sua presença no código não prova surgimento automático, controle do encontro ou animação em todas as plataformas. Scene Viewer e Quick Look podem abrir interfaces externas e limitar o controle do site.

Preparar GLB/glTF animado e USDZ animado quando a alternativa iOS exigir esse formato. Verificar preservação das animações na exportação e conversão. Não declarar paridade Android/iPhone sem evidência física.

Se um navegador não permitir o encontro completo, documentar exatamente o comportamento disponível e oferecer alternativa identificada. Não chamar uma sobreposição sem rastreamento de RA de superfície nem afirmar ancoragem sem verificar.

Referências iniciais a consultar na implementação:

- [Documentação do model-viewer](https://modelviewer.dev/docs/)
- [WebXR Hit Test — W3C](https://www.w3.org/TR/webxr-hit-test-1/)
- [AR Quick Look — Apple](https://developer.apple.com/documentation/arkit/previewing-a-model-with-ar-quick-look)

## Conteúdo e limites

Um personagem substituível e um encontro por vez. Reutilizar o modelo demonstrativo existente ou criatura original simples. Não baixar recursos aleatórios de Pokémon nem extrair código ou arquivos de Pokémon GO; reproduzir a experiência com implementação própria.

Sem leitor de QR embutido, login, catálogo, captura, batalha, multiplayer, mapa ou backend obrigatório. Não incluir serviços pagos ou credenciais sem autorização. Manter acesso HTTPS, inclusive em hospedagem estática quando a solução permitir.

## Critérios de aceite

1. O link do QR abre o personagem correto em um celular.
2. A câmera só é solicitada após **Iniciar encontro em RA**.
3. Em aparelho com suporte completo, uma superfície é reconhecida e o personagem surge automaticamente em um ponto próximo válido. A alternativa manual é identificada como tal.
4. Girar o celular para longe retira o personagem da imagem; voltar permite encontrá-lo no mesmo ponto, dentro dos limites de rastreamento.
5. Andar lateralmente muda o ângulo observado; aproximar-se muda o tamanho aparente pela perspectiva. O personagem não segue a câmera nem é centralizado continuamente.
6. A animação de espera é executada na experiência entregue. Modelo imóvel ou câmera orbitando o modelo não satisfaz esse requisito.
7. Perda de rastreamento tem estado explícito e recuperação coerente, sem troca silenciosa para objeto preso ao visor.
8. Encerrar e reiniciar libera a câmera e cria outro encontro sem duplicação.
9. Aparelho sem suporte recebe explicação e acesso à prévia 3D. Alternativas externas não são apresentadas como encontro completo.
10. A interface funciona em tela pequena e orienta cada etapa.

## Evidências de conclusão

Relatar separadamente código implementado, arquivos publicados, testes de navegador e testes físicos. Registrar aparelho, sistema, navegador, modo de RA e resultado dos critérios de posicionamento e animação.

Testar pelo menos um iPhone e um Android antes de prometer suporte completo aos dois. Sem testes físicos, registrar validação em aparelho como pendente. Publicar uma página ou exibir um modelo em desktop não comprova esses critérios.
