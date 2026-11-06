# Mundo de bolso — Mew em realidade aumentada

Protótipo web para abrir Mew por link, explorar o modelo em 3D e iniciar RA no visualizador compatível do aparelho. O GLB é uma interpretação 3D estilizada construída para este protótipo a partir da imagem de referência fornecida; não foi baixado de um catálogo de modelos.

## Executar localmente

Na pasta do projeto, inicie um servidor estático:

```powershell
python -m http.server 8000
```

Abra `http://localhost:8000/?obj=mew`. O endereço pode ser servido por qualquer hospedagem estática. O projeto não tem etapa de build, login ou backend.

Para criar o QR code que será impresso, publique a página em um endereço HTTPS e codifique, por exemplo, `https://seu-dominio/?obj=mew`. O botão **Copiar link** mostra e copia a URL do objeto aberto. O site não lê QR codes: a leitura fica com a câmera ou leitor do sistema do celular.

## GitHub Pages

O projeto é estático e pode ser publicado diretamente da raiz de `main`. Em `Settings → Pages`, selecione `Deploy from a branch`, `main` e `/(root)`. Para este repositório, o link será `https://pedroayan.github.io/cxzcxzcxzdsa/?obj=mew`.

## Modelo 3D

- `models/mew.glb`: modelo usado na prévia 3D, Scene Viewer e WebXR.
- `models/mew.usdz`: versão opcional para Quick Look no iPhone/iPad. Ainda não está incluída; se o caminho ficar vazio, `<model-viewer>` tenta gerar um USDZ para Quick Look a partir do GLB.
- `scripts/gerar-mew.py`: gera o GLB com Python padrão, sem baixar modelos ou texturas.

O modelo fica em escala de mesa, com cerca de 30 cm de altura.

Para substituir o modelo, coloque o novo GLB em `models/mew.glb` ou altere o caminho `glb` em `app.js`. Essa propriedade também aceita `.gltf`; nesse caso, mantenha ao lado dele o `.bin` e as texturas referenciadas. Quando houver um USDZ compatível, coloque-o em `models/` e preencha a propriedade `usdz` no mesmo objeto de configuração. GLB é a opção compacta mais simples para hospedar geometria e materiais juntos; mantenha também o USDZ para Quick Look quando quiser entregar um arquivo específico para iOS.

## RA e limites conhecidos

O toque em **Ver em RA** chama `<model-viewer>` apenas depois da ação da pessoa. A detecção de superfície acontece no visualizador do aparelho. O código oferece WebXR, Scene Viewer e Quick Look e define posicionamento horizontal. O acesso à câmera é pedido pelo modo de RA, nunca ao abrir a página.

Para testar RA em um celular, publique por HTTPS e abra o link no próprio aparelho. A compatibilidade, a permissão de câmera e o rastreamento variam por navegador, sistema e dispositivo. Este protótipo não foi validado em iPhone ou Android. Se a RA não estiver disponível, o modelo continua giratório em 3D na página.

