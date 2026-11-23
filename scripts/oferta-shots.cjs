// Gera as imagens da página de vendas (oferta/img) a partir do app real.
// Uso: node scripts/oferta-shots.cjs   (precisa de playwright; converte para webp com python/Pillow)
const http = require('http'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { chromium, devices } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'oferta', 'img'), TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'shots-'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((q, r) => {
  let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  if (f.startsWith('/api/')) { r.writeHead(200, { 'content-type': 'application/json' }); return r.end('{"ok":true}'); }
  const fp = path.join(ROOT, f); if (!fp.startsWith(ROOT) || !fs.existsSync(fp)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': MIME[path.extname(fp)] || 'application/octet-stream' }); fs.createReadStream(fp).pipe(r);
});
function seed() {
    const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const now = new Date(); const d = k => { const x = new Date(now); x.setDate(Math.max(1, now.getDate() - k)); return iso(x); };
    const m = (k, day) => { const x = new Date(now.getFullYear(), now.getMonth() - k, day); return iso(x); };
    const tx = []; let i = 0; const T = (type, cat, value, date, note) => tx.push({ id: 't' + (i++), type, cat, value, date, note: note || '' });
    for (let k = 0; k < 4; k++) {
      T('in', 'Salário', 6500, m(k, 5)); T('in', 'Renda extra', 900 + k * 120, m(k, 12));
      T('out', 'Moradia', 1800, m(k, 6)); T('out', 'Mercado', 780 + k * 40, m(k, 8)); T('out', 'Contas', 160, m(k, 10), 'Luz'); T('out', 'Contas', 100, m(k, 10), 'Internet'); T('out', 'Contas', 50, m(k, 10), 'Celular');
      T('out', 'Transporte', 340, m(k, 11)); T('out', 'Lazer', 290, m(k, 14)); T('out', 'Assinaturas', 44.9, m(k, 15), 'Netflix'); T('out', 'Assinaturas', 21.9, m(k, 15), 'Spotify'); T('out', 'Restaurante', 260, m(k, 16));
    }
    const exp = Date.now() + 864e5 * 180; const tok = btoa(JSON.stringify({ e: 'ana@ex.com', exp })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_') + '.x';
    localStorage.setItem('efr.sessao', JSON.stringify({ token: tok, email: 'ana@ex.com', nome: 'Ana' }));
    const days = {}; for (let k = 1; k <= 11; k++) { const x = new Date(now); x.setDate(now.getDate() - k); days[iso(x)] = { active: true, done: { lancar: 1, licao: 1 } }; }
    days[iso(now)] = { active: true, done: { lancar: 1 } };
    localStorage.setItem('efr.carteira.v1', JSON.stringify({ v: 1, onboarded: true, name: 'Ana', settings: { meta: 4000 }, tx,
      analyses: [{ id: 'a1', code: 'ITUB4' }, { id: 'a2', code: 'BBAS3' }, { id: 'a3', code: 'PETR4' }, { id: 'a4', code: 'MGLU3', price: 9, lpa: -0.1, vpa: 4, dy: 0, roe: -0.02, payout: 0, div: 5 }],
      assets: [{ id: 'z1', code: 'ITUB4', type: 'Ação', qty: 300, pm: 30.5, price: 36, target: 0.2 }, { id: 'z2', code: 'BBAS3', type: 'Ação', qty: 400, pm: 24, price: 27, target: 0.15 },
        { id: 'z3', code: 'MXRF11', type: 'FII', qty: 1500, pm: 9.8, price: 10.1, target: 0.2 }, { id: 'z4', code: 'Tesouro Selic', type: 'Tesouro', qty: 1, pm: 20000, price: 22350, target: 0.3 },
        { id: 'z5', code: 'CDB 110%', type: 'Renda fixa', qty: 1, pm: 8000, price: 8640, target: 0.15 }],
      divs: [{ id: 'd1', date: m(0, 3), code: 'MXRF11', kind: 'Dividendo', value: 150 }, { id: 'd2', date: m(1, 3), code: 'MXRF11', kind: 'Dividendo', value: 150 }, { id: 'd3', date: m(1, 20), code: 'ITUB4', kind: 'JCP', value: 210 }, { id: 'd4', date: m(2, 8), code: 'BBAS3', kind: 'Dividendo', value: 320 }, { id: 'd5', date: m(2, 3), code: 'MXRF11', kind: 'Dividendo', value: 150 }],
      game: { xp: 640, days, badges: { first_tx: '2026-10-01', streak3: '2026-10-04', streak7: '2026-10-08', investor: '2026-10-02', analyst: '2026-10-02', dividend: '2026-10-03', green: '2026-10-05', save20: '2026-10-05', lesson5: '2026-10-07' }, lessons: 9, lastOpen: iso(now) } }));
  }
(async () => {
  await new Promise(r => server.listen(0, r)); const base = 'http://localhost:' + server.address().port + '/';
  const b = await chromium.launch({ args: ['--lang=pt-BR'] }); const ctx = await b.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2, serviceWorkers: 'block', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(base); await p.waitForTimeout(300); await p.evaluate(seed); await p.reload(); await p.waitForTimeout(1500);
  const clean = () => p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; document.querySelectorAll('canvas').forEach(c => c.remove()); if (!document.getElementById('mockcss')) { const st = document.createElement('style'); st.id = 'mockcss'; st.textContent = '#app{padding-top:50px!important}.tabbar{bottom:14px!important}.tabfade{display:none!important}.antabs{top:50px!important}'; document.head.appendChild(st); } });
  const snap = async n => { await p.waitForTimeout(700); await clean(); await p.screenshot({ path: path.join(TMP, n + '.png') }); console.log('ok', n); };
  await snap('home');
  // ação que passa nos 4 critérios (personagem comemorando)
  const acoes = await p.evaluate(async () => (await (await fetch('data/dados.json')).json()).acoes);
  const pref = ['PETR4', 'ITUB4', 'BBAS3', 'BBSE3', 'CMIG4', 'ITSA4', 'TAEE11', 'VALE3', 'BBDC4', 'SANB11'];
  await p.click('#fab'); await p.waitForTimeout(400);
  let pick = null;
  for (const c of pref.concat(Object.keys(acoes))) { if (!acoes[c]) continue; await p.fill('[data-a="code"]', c); await p.waitForTimeout(60); if (await p.$('.verdict2 img.reac.r4')) { pick = c; break; } }
  if (!pick) await p.fill('[data-a="code"]', 'PETR4');
  console.log('ação da imagem:', pick);
  await p.evaluate(() => window.scrollTo(0, 120)); await snap('analise');
  await p.click('.cg .ib[data-info="roe"]'); await snap('info'); await p.keyboard.press('Escape'); await p.evaluate(() => { const s = document.getElementById('sheet'); if (s) s.hidden = true; document.body.style.overflow = ''; });
  await p.click('[data-go="lancamentos"]'); await snap('lancamentos');
  await p.click('#qout'); await p.waitForTimeout(300);
  await p.fill('#tval', '250,00'); await p.click('#tcats [data-cat="Mercado"]'); await p.fill('#tnote', 'Compras da semana');
  await p.evaluate(() => { const d = document.getElementById('tdate'); d.type = 'text'; d.value = new Date().toLocaleDateString('pt-BR'); document.activeElement && document.activeElement.blur(); });
  await snap('lancar'); await p.evaluate(() => { const s = document.getElementById('sheet'); if (s) s.hidden = true; document.body.style.overflow = ''; });
  await p.click('[data-go="carteira"]'); await p.click('[data-ct="proventos"]'); await snap('carteira'); await p.click('[data-ct="ativos"]');
  await p.click('[data-go="mais"]'); await snap('meta');
  await p.click('#fab'); await p.waitForTimeout(300); await p.click('#aclear').catch(() => {}); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await p.waitForTimeout(300);
  await p.click('.rkentry'); await snap('ranking');
  await p.click('#fab'); await p.waitForTimeout(400);
  await p.click('[data-ant="fiis"]'); await p.waitForSelector('#fiiq', { timeout: 20000 }); await p.fill('#fiiq', 'MXRF11'); await p.press('#fiiq', 'Enter'); await p.waitForTimeout(500);
  await p.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); }); await snap('outros');
  await p.click('[data-ant="acoes"]');
  // imagem de compartilhamento 1200x630 (usa as telas recém-geradas)
  for (const n of ['home', 'analise']) execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("RGB")\nim=im.resize((585,round(im.height*585/im.width)),Image.LANCZOS)\nim.save(sys.argv[2],quality=82,method=6)', path.join(TMP, n + '.png'), path.join(OUT, n + '.webp')]);
  const og = await b.newPage({ viewport: { width: 1200, height: 630 } });
  await og.goto(base + 'scripts/og.html'); await og.waitForTimeout(800); await og.screenshot({ path: path.join(TMP, 'og.png') });
  execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nImage.open(sys.argv[1]).convert("RGB").save(sys.argv[2],quality=84,optimize=True,progressive=True)', path.join(TMP, 'og.png'), path.join(OUT, 'og.jpg')]);
  console.log('ok og');
  await b.close(); server.close();
  for (const n of ['home', 'analise', 'info', 'lancamentos', 'lancar', 'carteira', 'meta', 'ranking', 'outros'])
    execFileSync('python3', ['-c', 'import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert("RGB")\nim=im.resize((585,round(im.height*585/im.width)),Image.LANCZOS)\nim.save(sys.argv[2],quality=82,method=6)', path.join(TMP, n + '.png'), path.join(OUT, n + '.webp')]);
  // versão no endereço das imagens (hash do arquivo) para o navegador não mostrar a imagem antiga do cache
  const crypto = require('crypto'), HTML = path.join(ROOT, 'oferta', 'index.html');
  let html = fs.readFileSync(HTML, 'utf8');
  html = html.replace(/\/oferta\/img\/([\w-]+\.(?:webp|jpg))(\?v=[0-9a-f]+)?/g, (m, f) => {
    const fp = path.join(OUT, f); if (!fs.existsSync(fp)) return m;
    return '/oferta/img/' + f + '?v=' + crypto.createHash('sha1').update(fs.readFileSync(fp)).digest('hex').slice(0, 8);
  });
  fs.writeFileSync(HTML, html);
  if (errs.length) { console.error('erros', errs); process.exit(1); }
  console.log('imagens atualizadas em oferta/img');
})();
