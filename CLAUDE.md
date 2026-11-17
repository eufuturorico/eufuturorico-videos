# Eu Futuro Rico · Carteira Inteligente

- App (PWA) na raiz, página de vendas em `oferta/`, funções em `netlify/functions/`, dados em `data/dados.json` (gerados por `scripts/atualizar.py`, workflow `dados.yml`).
- Regra do dono: **sempre que houver mudança visual no app, as imagens da página de vendas (`oferta/img/*.webp` e `oferta/img/og.jpg`) precisam ser atualizadas.** Isso é automático: o workflow `oferta-imagens.yml` roda `node scripts/oferta-shots.cjs` a cada push que mexe em `app.js`, `app.css`, `index.html` ou `img/`. Para rodar à mão: `node scripts/oferta-shots.cjs` (precisa de playwright e Pillow).
- Se uma tela nova virar destaque, inclua o print em `scripts/oferta-shots.cjs` e use em `oferta/index.html`.
- Ao mudar `app.js`/`app.css`, suba a versão do cache em `sw.js` (`efr-vN`).
- Nunca diga que o app é grátis; é ferramenta educativa, não recomendação.
