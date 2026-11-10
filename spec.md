# Especificação atual — ajustes de 10/11/2026

Encontrar os oito itens do modo principal, incluindo My Sweet Piano, revela o texto para Camila e o recado abaixo dele. O conteúdo está em `FINAL_MESSAGE` e `FINAL_NOTE` de `birthday.js`. Usar letras 3D rosas sobre fundo transparente, sem painel. Enquadrar os dois blocos na largura e na altura disponíveis, com letras menores no recado. A mensagem continua em uma posição virtual fixa escolhida ao concluir; redimensionar a tela só ajusta sua escala.

Os oito GLB de exibição devem conter animação real, com pausa conjunta e alternativa suave para movimento reduzido. Preservar os pés e as posições do encontro durante o ciclo. My Melody deve aparecer sem a base verde. Preservar os arquivos fornecidos e gerar os derivados por `scripts/preparar-aniversario.mjs`, em `models/aniversario/`.

Os testes locais cobrem os oito itens, deformação real dos modelos, continuidade, pausa, apoio, ausência da base verde, conteúdo rosa sem fundo e cinco proporções de tela. Conferir também a aparência no navegador. A experiência de câmera/orientação em aparelho físico e qualquer nova publicação exigem evidência própria. Estes requisitos substituem as descrições de sete itens, ausência de animações nos outros modelos e texto Feliz aniversário presentes no histórico abaixo.

---
# Mensagem 3D — 10/11/2026

A conclusão dos sete itens agora revela letras extrudadas Feliz aniversário! no ambiente, em rosa e dourado. A mensagem surge uma única vez à frente da direção horizontal da câmera na conclusão, em uma posição virtual fixa; não acompanha a câmera. Não há ancoragem no chão nem rastreamento de caminhada. O painel apenas informa que todos foram encontrados.

A fonte Helvetiker Bold veio do repositório three.js r187; licença em models/fonts/LICENSE.txt. Foi acrescentado o glifo á a partir do a para preservar o português. A geometria e os materiais exclusivos são liberados ao encerrar. Fonte indisponível impede a preparação do encontro e permite tentar novamente.

Validação: testes de volume das letras, acento, revelação única, posição fixa e descarte passaram, assim como os testes existentes. Mensagem renderizada e inspecionada no navegador. Teste físico em celular continua pendente.

---
# Atualização — surpresa de aniversário, 10/11/2026

O modo principal agora carrega sete itens: Mew e os seis GLB fornecidos pelo usuário em modelos-aniversario. Em cada sessão, sorteia os itens entre sete setores ao redor da direção inicial, com pequena variação angular e distância virtual de 1,7 unidade. Os modelos são ajustados por suas dimensões; nenhuma posição é recalculada para acompanhar o visor. O usuário encontra cada item enquadrando seu centro por pelo menos 0,6 segundo. Ao encontrar os sete, aparece Feliz aniversário. Controles de giro e escala afetam o item visível mais central; pausa afeta os clips existentes. Só Mew tem animação nos arquivos atuais. O Sylveon veio com fitas esticadas em pose aberta.

Este escopo substitui a limitação anterior de um personagem no modo principal. Continua sem rastreamento de caminhada ou reconhecimento de chão. O modo opcional de superfície e o visualizador externo permanecem somente com Mew. A prévia da página também continua sendo do Mew.

Carregamento exige os sete arquivos; em falha oferece nova tentativa e libera recursos carregados na tentativa incompleta. Templates ficam em cache durante a página; instâncias e mixers são removidos ao encerrar. Negar câmera ou sensores encerra o encontro, e sair da página libera a câmera. Os GLB originais do usuário não foram alterados.

Validação local: sete arquivos relidos com texturas, 100 sorteios sem sobreposição, escala e apoio de modelos com origem deslocada, três ciclos sem duplicações; orientação simulada encontrou os sete e mostrou a mensagem final, manteve as posições, ocultou o grupo sem sensores e tratou permissão negada. Os sete modelos foram visualizados no navegador; a página real carregou o runtime e habilitou Iniciar surpresa em RA. Não houve teste físico em iPhone/Android.

Verificação: node scripts/testar-aniversario.mjs e node scripts/testar-orientacao.mjs. As dependências de teste ficam em .cache/ra-assets (three@0.187.0, @gltf-transform/core e @gltf-transform/extensions). O site continua estático e usa as bibliotecas das CDNs já configuradas.

---
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
