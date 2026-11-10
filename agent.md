# Escopo atual — ajustes de 10/11/2026

O modo principal contém seis personagens, incluindo My Sweet Piano, fornecida na Área de Trabalho. A flor de sakura e o Umbreon foram retirados do encontro. Todos os personagens têm animação nos GLB de exibição; os derivados ficam em `models/aniversario/`, e os originais permanecem em `modelos-aniversario/`. A base verde da My Melody foi removida somente do derivado. `scripts/preparar-aniversario.mjs` reproduz os arquivos e registra hashes dos originais. Mantenha a animação dos personagens com o apoio dos pés e as posições virtuais fixas; ofereça pausa e use Idle suave quando houver preferência por movimento reduzido.

A coleta agora exige tocar no personagem ou usar o botão Coletar com um personagem enquadrado. Só olhar não coleta. O personagem tocado some imediatamente, cada id conta uma vez e a contagem mostra coletados. Usar raycast na geometria real, inclusive nos modelos com esqueleto, com coordenadas relativas ao canvas e sem coletar durante arrasto ou perda dos sensores.

Ao coletar os seis, abrir “parabens gatinha” e “quiz para saber se vc merece algo”. `quiz.js` contém as quatro perguntas, opções e respostas fornecidas pelo usuário. A primeira resposta certa é “vai se fuder pedro”, conforme a opção escrita. Exigir as quatro respostas antes do resultado; pelo menos um acerto libera “parabens meu amor voce acertou todas”, com “pode abrir o valorant” na linha de baixo. Zero acertos permite tentar o quiz novamente sem recoletar os personagens. O quiz substitui a frase e as letras 3D anteriores. Preservar texto rosa, fundo transparente, opções legíveis no celular e reiniciar tudo ao encerrar o encontro.

Distribuir quatro personagens num arco frontal de aproximadamente 45 graus para cada lado, e dois mais baixos na frente. Os tamanhos foram reduzidos em 20% e as distâncias virtuais passaram a 2,6 e 2,8 unidades para facilitar o enquadramento. Nenhum deve surgir atrás da direção inicial. Manter as posições fixas e sortear quem ocupa cada uma. As alturas são virtuais, sem reconhecimento ou ancoragem em chão real.

No encontro, mostrar a contagem de personagens coletados. Manter posição e animação dos personagens restantes; os coletados ficam ocultos e sem avançar suas animações.

Na área principal, mostrar somente o título Mew e as opções. Manter os avisos de erro e incompatibilidade quando necessários; não reintroduzir os textos explicativos removidos dessa área.

Verificação: `node scripts/testar-aniversario.mjs`, `node scripts/testar-animacoes.mjs`, `node scripts/testar-orientacao.mjs`, `node scripts/testar-coleta.mjs` e `node scripts/testar-quiz.mjs`. Verificar no navegador toque, desaparecimento, coleta dos seis, quatro perguntas, zero acertos com nova tentativa e um acerto liberando o presente. Testes físicos de câmera/sensores continuam pendentes; não afirmar publicação sem realizá-la.


Ao liberar a mensagem final de sucesso, disparar uma única explosão de confetes em formato de corações, nos rosas #f9d9dc e #f6b8b9 da referência. O efeito dura cerca de 1,5 segundo, fica atrás do texto, não bloqueia toques e se limpa ao terminar ou encerrar o encontro. Com movimento reduzido, mostrar seis corações parados nas laterais, animando apenas a opacidade.

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

# Instruções do projeto

## Objetivo

Implementar um encontro de personagem em realidade aumentada em um site para celular, inspirado em Pokémon GO. O personagem surge em uma posição próxima no ambiente; a pessoa o encontra apontando a câmera para esse lugar. Ele permanece nesse ponto quando o celular se move e executa animações de espera. Leia spec.md antes de implementar.

## Regras obrigatórias

- Preserve o projeto existente. Interface e documentação em português do Brasil.
- Mantenha entrada por URL HTTPS e QR code lido pela câmera padrão. Não crie leitor de QR no site.
- Solicite câmera e sensores apenas após a pessoa tocar em **Iniciar encontro em RA**.
- Use rastreamento espacial e uma posição no ambiente independente da câmera. Ao olhar para outro lado, o personagem sai do enquadramento; ao voltar, continua no mesmo lugar.
- Modelo permanentemente centralizado, imagem sobre o vídeo, rotação automática da prévia e CSS no contêiner não satisfazem o encontro em RA.
- Escolha automaticamente um ponto próximo válido após reconhecer uma superfície horizontal. Não coloque o personagem antes de obter uma posição espacial válida. Posicionamento por toque pode ser alternativa explicitamente identificada.
- Inclua animações reais no modelo: respiração e movimento de cabeça ou cauda, podendo acrescentar piscadas. Preserve a posição do encontro e o ponto de apoio durante a animação.
- Escolha a tecnologia pelos requisitos. Não limite a implementação ao model-viewer existente. Avalie WebXR e soluções de WebAR com rastreamento espacial conforme suporte atual.
- Scene Viewer e Quick Look podem ser alternativas, mas não equivalem ao encontro personalizado se não entregarem o mesmo comportamento.
- Prepare GLB/glTF animado e USDZ animado quando necessário. Verifique se cada formato, conversão e visualizador preserva a animação.
- Trate permissões negadas, sensores ausentes, superfície não encontrada, perda de rastreamento, objeto inválido, falha no arquivo e incompatibilidade. Na perda de rastreamento, não prenda silenciosamente o personagem ao visor.
- Mantenha prévia 3D como alternativa claramente identificada. Encerre a câmera ao sair do encontro.
- Confirme documentação, suporte, manutenção, licença e condições atuais de SDKs. Não adicione serviços pagos ou credenciais sem autorização; nunca publique segredos.
- Reutilize o modelo demonstrativo existente quando possível. Não baixe recursos aleatórios de Pokémon nem extraia código, modelos ou APIs privadas de Pokémon GO. Reproduza o comportamento com implementação própria e conteúdo substituível e autorizado.
- Não afirme validação em iPhone ou Android sem executar a experiência nesses aparelhos. Diferencie código implementado, publicação, testes de navegador e validação física.

## Escopo

Um personagem, um encontro próximo por sessão, animação de espera, orientação para encontrá-lo e opção de iniciar outro encontro. Sem login, catálogo, captura, batalha ou backend obrigatório.

“Próximo” significa uma posição local no ambiente rastreado. Mapa, surgimento por GPS e persistência geográfica entre sessões exigem especificação adicional. Não solicite GPS para simular proximidade local.

Estes documentos orientam a implementação futura; sua edição não significa que a funcionalidade já esteja implementada.
