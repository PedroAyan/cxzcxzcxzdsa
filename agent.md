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
