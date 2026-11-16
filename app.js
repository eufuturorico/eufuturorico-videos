/* Carteira Inteligente · Eu Futuro Rico — app de celular (dados salvos no próprio aparelho) */
(() => {
'use strict';
const KEY = 'efr.carteira.v1';
const DEF = {
  v: 1, onboarded: false, name: '',
  settings: { selic: 0.1375, premio: 0.0275, cresMax: 0.12, dividaMax: 3.6, roeMin: 0.10, plMax: 25, meta: 3000, yieldMeta: 0.08 },
  tx: [], analyses: [], assets: [], divs: []
};
let memOnly = false;
function load() {
  try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); return { ...structuredClone(DEF), ...d, settings: { ...DEF.settings, ...(d.settings || {}) } }; } }
  catch (e) { memOnly = true; }
  return structuredClone(DEF);
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { memOnly = true; } }

/* ---------- dados oficiais (BCB, CVM, B3) ---------- */
let DATA = null;
try { DATA = JSON.parse(localStorage.getItem(KEY + '.dados') || 'null'); } catch (e) { DATA = null; }
async function loadData() {
  try {
    const r = await fetch('data/dados.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    DATA = await r.json();
    try { localStorage.setItem(KEY + '.dados', JSON.stringify(DATA)); } catch (e) { }
  } catch (e) { /* sem internet: usa a última cópia salva */ }
  if (applyData()) save();
  if (S.onboarded) render();
}
function applyData() {
  if (!DATA) return false;
  let ch = false;
  const m = DATA.mercado || {};
  if (m.selic && !S.settings.selicManual && S.settings.selic !== m.selic.valor) { S.settings.selic = m.selic.valor; ch = true; }
  for (const a of S.assets) {
    const q = DATA.acoes && DATA.acoes[a.code];
    if (q && q.preco && (a.price !== q.preco || a.priceDate !== DATA.data_cotacao)) { a.price = q.preco; a.priceDate = DATA.data_cotacao; ch = true; }
  }
  return ch;
}
const dBR = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) + '/' + d.slice(0, 4) : '';
const dBRs = d => d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '';
const Q = c => DATA && DATA.acoes ? DATA.acoes[(c || '').toUpperCase().trim()] : null;

/* ---------- helpers ---------- */
const $ = (q, el = document) => el.querySelector(q);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fBRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const brl = (v, d = 2) => isFinite(v) ? (d ? fBRL : fBRL0).format(v) : '—';
const pct = (v, d = 1) => isFinite(v) ? (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%' : '—';
const x = (v, d = 1) => isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + 'x' : '—';
function num(s) {
  if (typeof s === 'number') return s;
  s = String(s ?? '').trim().replace(/[R$\s%x]/gi, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s);
}
const nf = (v, d = 2) => isFinite(v) && v !== '' && v != null ? Number(v).toLocaleString('pt-BR', { maximumFractionDigits: d }) : '';
const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const today = () => iso(new Date());
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ym = d => d.slice(0, 7);
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 2200); }
const ICON = {
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
};

/* ---------- categorias ---------- */
const CAT_OUT = [['Moradia', '🏠'], ['Mercado', '🛒'], ['Contas', '💡'], ['Transporte', '🚗'], ['Saúde', '💊'], ['Educação', '📚'], ['Lazer', '🎉'], ['Restaurante', '🍔'], ['Assinaturas', '📺'], ['Cartão/dívidas', '💳'], ['Compras', '🛍️'], ['Outros', '📦']];
const CAT_IN = [['Salário', '💼'], ['Renda extra', '🚀'], ['13º/bônus', '🎁'], ['Vendas', '🏷️'], ['Outros', '💰']];
const catIcon = (t, c) => ((t === 'in' ? CAT_IN : CAT_OUT).find(k => k[0] === c) || [0, '💰'])[1];
const TIPOS = [['Ação', '#5B7CFF'], ['FII', '#22D68A'], ['Renda fixa', '#F5C13D'], ['Tesouro', '#FFB86B'], ['Exterior', '#A77BFF'], ['Cripto', '#FF4D6D'], ['Outro', '#9AA3C7']];
const tipoCor = t => (TIPOS.find(k => k[0] === t) || TIPOS[6])[1];
const SIG = { 'Ação': 'AÇÃO', 'FII': 'FII', 'Renda fixa': 'RF', 'Tesouro': 'TD', 'Exterior': 'EXT', 'Cripto': 'CRIP', 'Outro': '•' };
const sig = t => SIG[t] || '•';

/* ---------- cálculos ---------- */
function monthTotals(m) {
  let inc = 0, out = 0; const cats = {};
  for (const t of S.tx) if (ym(t.date) === m) { if (t.type === 'in') inc += t.value; else { out += t.value; cats[t.cat] = (cats[t.cat] || 0) + t.value; } }
  return { inc, out, sobra: inc - out, taxa: inc > 0 ? (inc - out) / inc : NaN, cats };
}
function avgSobra() {
  const ms = [...new Set(S.tx.map(t => ym(t.date)))].filter(m => m <= ym(today())).sort().slice(-6);
  if (!ms.length) return 0;
  return ms.reduce((a, m) => a + monthTotals(m).sobra, 0) / ms.length;
}
function portfolio() {
  let inv = 0, cur = 0; const byType = {};
  for (const a of S.assets) { const i = a.qty * a.pm, c = a.qty * a.price; inv += i; cur += c; byType[a.type] = (byType[a.type] || 0) + c; }
  const d12 = S.divs.filter(d => (Date.now() - new Date(d.date + 'T12:00')) / 864e5 <= 365).reduce((a, d) => a + d.value, 0);
  const dTot = S.divs.reduce((a, d) => a + d.value, 0);
  return { inv, cur, lucro: cur - inv, lucroP: inv > 0 ? (cur - inv) / inv : NaN, byType, d12, dMes: d12 / 12, dTot, totalRet: inv > 0 ? (cur - inv + dTot) / inv : NaN };
}
function analyze(a) {
  const st = S.settings;
  const pl = a.lpa > 0 ? a.price / a.lpa : NaN;
  const pvp = a.vpa > 0 ? a.price / a.vpa : NaN;
  const ey = a.price > 0 ? a.lpa / a.price : NaN;
  const graham = a.lpa > 0 && a.vpa > 0 ? Math.sqrt(22.5 * a.lpa * a.vpa) : NaN;
  const margem = isFinite(graham) ? 1 - a.price / graham : NaN;
  const cres = Math.max(0, Math.min((a.roe || 0) * (1 - (a.payout || 0)), st.cresMax));
  const ret = (a.dy || 0) + cres;
  const regua = st.selic + st.premio;
  const c = [
    { n: 'ROE de pelo menos ' + pct(st.roeMin, 0), d: 'Lucro alto sobre o próprio capital', ok: a.roe >= st.roeMin, v: pct(a.roe) },
    a.fin ? { n: 'Dívida: não se aplica', d: 'Bancos e seguradoras não usam EBITDA', ok: true, v: 'n/a' }
      : { n: 'Dívida até ' + x(st.dividaMax) + ' o EBITDA', d: 'A dívida cabe no caixa que ela gera', ok: a.div <= st.dividaMax, v: x(a.div) },
    { n: 'P/L entre 0 e ' + nf(st.plMax, 0), d: 'Não está caro por real de lucro', ok: isFinite(pl) && pl > 0 && pl <= st.plMax, v: x(pl) },
    { n: 'Retorno acima de ' + pct(regua), d: 'Rende mais que Selic + risco da bolsa', ok: ret > regua, v: pct(ret) }
  ];
  const okN = c.filter(k => k.ok).length;
  const folga = ret - regua;
  const verdict = okN === 4 ? (folga >= 0.01 ? 'ok' : 'mid') : 'no';
  return { pl, pvp, ey, graham, margem, cres, ret, regua, folga, c, okN, verdict, abaixoGraham: isFinite(graham) && a.price < graham };
}
function nper(r, pmt, pv, fv) {
  if (pv >= fv) return 0;
  if (r === 0) return pmt > 0 ? (fv - pv) / pmt : Infinity;
  const n = Math.log((pmt + fv * r) / (pmt + pv * r)) / Math.log(1 + r);
  return isFinite(n) && n > 0 ? n : Infinity;
}

/* ---------- roteamento ---------- */
let route = 'inicio', curMonth = ym(today()), cartTab = 'ativos';
function go(r) { route = r; render(); window.scrollTo({ top: 0 }); history.replaceState(null, '', '#' + r); }
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
$('#fab').addEventListener('click', () => openTx());

function render() {
  const app = $('#app');
  $('#tabbar').hidden = !S.onboarded;
  if (!S.onboarded) { app.innerHTML = viewOnb(); bindOnb(); return; }
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.go === route));
  const v = { inicio: viewHome, analisar: viewAnalisar, carteira: viewCarteira, mais: viewMais }[route] || viewHome;
  app.innerHTML = `<div class="stack fade-in">${v()}</div>`;
  bind();
}

/* ---------- onboarding ---------- */
let onbStep = 0;
const ONB = [
  { img: 'hero', t: 'Bem-vindo ao seu futuro rico', p: 'Organize o mês, analise ações em 10 segundos e veja sua renda passiva crescer. Tudo no seu celular.' },
  { img: 'lancar', t: 'Lance um gasto em 5 segundos', p: 'Toque no botão dourado, digite o valor e pronto. No fim do mês você vê exatamente quanto sobrou para investir.' },
  { img: 'analisar', t: 'Analise qualquer ação', p: 'Digite os indicadores e veja na hora, em verde ou vermelho, se a ação passa nos 4 critérios do método.' },
  { img: 'meta', t: 'Qual é o seu nome?', p: 'É só para eu te chamar pelo nome. Seus dados ficam salvos apenas neste aparelho.', name: true }
];
function viewOnb() {
  const s = ONB[onbStep];
  return `<div class="onb fade-in">
    <div class="brand">★ Eu Futuro Rico</div>
    <img src="img/${s.img}.webp" alt="">
    <div class="stack"><h1>${s.t}</h1><p class="muted">${s.p}</p></div>
    ${s.name ? `<div class="inp"><input id="oname" placeholder="Seu primeiro nome" autocomplete="given-name" maxlength="24" value="${esc(S.name)}"></div>` : ''}
    <div class="dots">${ONB.map((_, i) => `<i class="${i === onbStep ? 'on' : ''}"></i>`).join('')}</div>
    <button class="btn" id="onext">${s.name ? 'Começar' : 'Continuar'}</button>
    ${onbStep ? '' : '<p class="disc">Ferramenta educativa. Não é recomendação de investimento.</p>'}
  </div>`;
}
function bindOnb() {
  $('#onext').onclick = () => {
    if (ONB[onbStep].name) { S.name = ($('#oname').value || '').trim().slice(0, 24); S.onboarded = true; save(); route = 'inicio'; render(); return; }
    onbStep++; render();
  };
  const n = $('#oname'); if (n) n.onkeydown = e => { if (e.key === 'Enter') $('#onext').click(); };
}

/* ---------- INÍCIO ---------- */
function greet() { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
const TIPS = [
  'Pague-se primeiro: separe o investimento no dia em que o salário cair.',
  'Gasto pequeno e frequente pesa mais que o grande. Olhe o top 3 categorias do mês.',
  'Reserva de emergência primeiro, bolsa depois. Reserva fica na renda fixa com liquidez diária.',
  'Ação boa a preço caro vira investimento ruim. Use o Analisar antes de comprar.',
  'Dividendo reinvestido vira mais ações, que pagam mais dividendos. Isso é bola de neve.',
  'Quite primeiro a dívida mais cara: cartão e cheque especial cobram mais do que qualquer investimento rende.'
];
let showAllTx = false, showAllCats = false, editNums = false, showAllList = false;
function viewHome() {
  const m = monthTotals(curMonth), p = portfolio(), st = S.settings;
  const [yy, mm] = curMonth.split('-').map(Number);
  const need = st.yieldMeta > 0 ? st.meta * 12 / st.yieldMeta : 0;
  const prog = need > 0 ? Math.min(1, p.cur / need) : 0;
  const catsAll = Object.entries(m.cats).sort((a, b) => b[1] - a[1]);
  const cats = showAllCats ? catsAll : catsAll.slice(0, 3);
  const txsAll = S.tx.filter(t => ym(t.date) === curMonth).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const txs = showAllTx ? txsAll : txsAll.slice(0, 5);
  const pIn = m.inc > 0 ? Math.min(100, m.out / m.inc * 100) : (m.out > 0 ? 100 : 0);
  const mk = DATA && DATA.mercado && DATA.mercado.selic ? DATA.mercado : null;
  return `
  <header class="hdr">
    <div class="hello"><div class="avatar"><img src="img/icon.webp" alt=""></div><div><p class="tiny muted">${greet()}</p><b class="nm">${S.name ? esc(S.name) : 'Futuro rico'}</b></div></div>
    <div class="monthpill"><button id="mprev" aria-label="Mês anterior">${ICON.left}</button><b>${MES3[mm - 1]} ${String(yy).slice(2)}</b><button id="mnext" aria-label="Próximo mês">${ICON.right}</button></div>
  </header>
  <section class="card hero">
    <div class="row between"><p class="label">${m.sobra >= 0 ? 'Sobrou no mês' : 'Gastou além do que ganhou'}</p>${isFinite(m.taxa) ? `<span class="chip ${m.taxa >= 0.1 ? 'g' : m.taxa >= 0 ? 'o' : 'r'}">${m.taxa >= 0 ? 'poupou ' : ''}${pct(m.taxa, 0)}</span>` : ''}</div>
    <p class="big num ${m.sobra < 0 ? 'r' : ''}">${brl(m.sobra)}</p>
    <div class="bar"><i style="width:${pIn}%;background:${pIn >= 100 ? 'var(--vermelho)' : pIn > 85 ? 'var(--ouro)' : 'var(--verde)'}"></i></div>
    <div class="row between small" style="margin-top:8px"><span class="muted">Entrou <b class="g num">${brl(m.inc, 0)}</b></span><span class="muted">Saiu <b class="r num">${brl(m.out, 0)}</b></span></div>
  </section>
  <section class="card kpi3">
    <button data-go2="carteira"><span class="tiny muted">Patrimônio</span><b class="num">${brl(p.cur, 0)}</b><span class="tiny ${p.lucro >= 0 ? 'g' : 'r'}">${p.inv > 0 ? (p.lucro >= 0 ? '▲ ' : '▼ ') + pct(p.lucroP) : 'adicionar'}</span></button>
    <button data-go2="carteira"><span class="tiny muted">Renda/mês</span><b class="num o">${brl(p.dMes, 0)}</b><span class="tiny muted">proventos</span></button>
    <button data-go2="mais"><span class="tiny muted">Meta</span><b class="num">${Math.round(prog * 100)}%</b><span class="minibar"><i style="width:${(prog * 100).toFixed(1)}%"></i></span></button>
  </section>
  ${catsAll.length ? `<section class="card">
    <div class="row between"><h3>Gastos por categoria</h3>${catsAll.length > 3 ? `<button class="link" id="togcats">${showAllCats ? 'menos' : 'ver todas'}</button>` : ''}</div>
    <div class="cats">${cats.map(([c, v]) => `<div class="cat"><span>${catIcon('out', c)}</span><div><div class="row between small"><span>${esc(c)}</span><b class="num">${brl(v, 0)}</b></div><div class="bar thin"><i style="width:${(v / catsAll[0][1] * 100).toFixed(1)}%;background:linear-gradient(90deg,var(--azul),var(--roxo))"></i></div></div><span class="tiny muted">${pct(v / m.out, 0)}</span></div>`).join('')}</div>
  </section>` : ''}
  <section class="card">
    <div class="row between"><h3>Lançamentos</h3><span class="tiny muted">${txsAll.length || ''}</span></div>
    ${txsAll.length ? `<div class="list">${txs.map(t => `
      <div class="item"><div class="ico">${catIcon(t.type, t.cat)}</div><div class="t"><b>${esc(t.note || t.cat)}</b><span class="tiny muted">${t.date.slice(8, 10)}/${t.date.slice(5, 7)}${t.note ? ' · ' + esc(t.cat) : ''}${t.rec ? ` · ↻ ${t.recI}/${t.recN}` : ''}</span></div>
      <div class="v num ${t.type === 'in' ? 'g' : ''}">${t.type === 'in' ? '+' : '−'}${brl(t.value)}</div><button class="del" data-deltx="${t.id}" aria-label="Apagar">${ICON.trash}</button></div>`).join('')}</div>
      ${txsAll.length > 5 ? `<button class="more" id="togtx">${showAllTx ? 'Mostrar menos' : `Ver todos os ${txsAll.length}`}</button>` : ''}`
    : `<div class="empty row"><img src="img/vazio.webp" alt=""><p class="muted small">Mês em branco. Toque no <b class="o">+</b> para lançar.</p></div>`}
  </section>
  ${mk ? `<p class="disc">Selic ${pct(mk.selic.valor, 2)}${mk.cdi ? ' · CDI ' + pct(mk.cdi.valor, 2) : ''}${mk.ipca12m ? ' · IPCA 12m ' + pct(mk.ipca12m.valor, 2) : ''} · Banco Central</p>` : ''}`;
}
/* ---------- LANÇAR ---------- */
function openSheet(html, after) {
  $('#sheet-body').innerHTML = html; $('#sheet').hidden = false; document.body.style.overflow = 'hidden';
  after && after();
}
function kbFix() {
  const vv = window.visualViewport; if (!vv) return;
  const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty('--kb', kb + 'px');
  document.documentElement.style.setProperty('--vvh', vv.height + 'px');
}
if (window.visualViewport) { visualViewport.addEventListener('resize', kbFix); visualViewport.addEventListener('scroll', kbFix); }
$('#sheet').addEventListener('focusin', e => { if (e.target.matches('input')) setTimeout(() => { kbFix(); e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, 320); });
function closeSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; }
$('#sheet').addEventListener('click', e => { if (e.target.dataset.close !== undefined) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });

function addMonths(d, k) {
  const [y, m, dd] = d.split('-').map(Number);
  const t = new Date(y, m - 1 + k, 1), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return iso(new Date(t.getFullYear(), t.getMonth(), Math.min(dd, last)));
}
function delTx(id) {
  const t = S.tx.find(k => k.id === id); if (!t) return;
  if (!t.rec) { S.tx = S.tx.filter(k => k.id !== id); save(); render(); toast('Lançamento apagado'); return; }
  const next = S.tx.filter(k => k.rec === t.rec && k.date >= t.date).length, all = S.tx.filter(k => k.rec === t.rec).length;
  openSheet(`<div class="stack"><h2>Apagar lançamento que se repete</h2><p class="small muted">${esc(t.note || t.cat)} · ${brl(t.value)} por mês (${t.recI}/${t.recN})</p>
    <button class="btn ghost" data-dm="one">Apagar só este mês</button>
    <button class="btn ghost" data-dm="next">Apagar este e os próximos (${next})</button>
    <button class="btn danger" data-dm="all">Apagar todos (${all})</button></div>`, () => {
    $('#sheet-body').querySelectorAll('[data-dm]').forEach(b => b.onclick = () => {
      const m = b.dataset.dm;
      S.tx = S.tx.filter(k => m === 'one' ? k.id !== id : m === 'next' ? !(k.rec === t.rec && k.date >= t.date) : k.rec !== t.rec);
      save(); closeSheet(); render(); toast('Apagado');
    });
  });
}
function openTx() {
  let type = 'out', cat = null;
  const chips = () => (type === 'in' ? CAT_IN : CAT_OUT).map(([c, i]) => `<button data-cat="${esc(c)}" class="${c === cat ? 'on' : ''}">${i} ${esc(c)}</button>`).join('');
  openSheet(`<div class="stack">
    <div class="seg"><button data-t="out" class="on r">Gasto</button><button data-t="in">Receita</button></div>
    <div class="amount"><span>R$</span><input id="tval" inputmode="decimal" placeholder="0,00" autocomplete="off"></div>
    <div class="chips scroll2" id="tcats">${chips()}</div>
    <div class="grid2"><div class="field"><label>Data</label><div class="inp"><input id="tdate" type="date" value="${today()}"></div></div>
    <div class="field"><label>Descrição <small>opcional</small></label><div class="inp"><input id="tnote" maxlength="40" placeholder="Ex.: aluguel" enterkeyhint="done"></div></div></div>
    <div class="field"><label>Repetir todo mês</label>
      <div class="seg3" id="trep"><button data-r="1" class="on">Não repete</button><button data-r="m">Por meses</button><button data-r="y">Por anos</button></div>
      <div class="row" id="trepbox" hidden style="margin-top:8px"><div class="inp" style="flex:1"><input id="tn" inputmode="numeric" value="12" maxlength="3" enterkeyhint="done"><span class="suf" id="tnu">meses</span></div></div>
      <p class="tiny muted" id="trepinfo"></p></div>
    <div class="sticky-save"><button class="btn" id="tsave">Salvar</button></div></div>`, () => {
    let rep = '1';
    const repN = () => { const n = Math.max(1, Math.floor(num($('#tn').value) || 1)); return rep === '1' ? 1 : Math.min(120, rep === 'y' ? n * 12 : n); };
    const repInfo = () => {
      const n = repN(), d = $('#tdate').value || today();
      if (n <= 1) { $('#trepinfo').textContent = ''; return; }
      const last = addMonths(d, n - 1);
      $('#trepinfo').textContent = `Vai lançar ${n} vezes, de ${MES3[+d.slice(5, 7) - 1]}/${d.slice(2, 4)} até ${MES3[+last.slice(5, 7) - 1]}/${last.slice(2, 4)}${n === 120 ? ' (máximo de 10 anos)' : ''}.`;
    };
    $('#trep').onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; rep = b.dataset.r; $('#trep').querySelectorAll('button').forEach(k => k.classList.toggle('on', k === b)); $('#trepbox').hidden = rep === '1'; $('#tnu').textContent = rep === 'y' ? 'anos' : 'meses'; $('#tn').value = rep === 'y' ? '1' : '12'; repInfo(); };
    $('#tn').oninput = repInfo; $('#tdate').onchange = repInfo;
    const box = $('#sheet-body');
    box.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
      type = b.dataset.t; cat = null;
      box.querySelectorAll('[data-t]').forEach(k => { k.classList.toggle('on', k === b); k.classList.toggle('r', k === b && type === 'out'); k.classList.toggle('g', k === b && type === 'in'); });
      $('#tcats').innerHTML = chips();
    });
    $('#tcats').onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; $('#tcats').querySelectorAll('button').forEach(k => k.classList.toggle('on', k === b)); };
    $('#tsave').onclick = () => {
      const v = num($('#tval').value);
      if (!(v > 0)) { toast('Digite um valor'); $('#tval').focus(); return; }
      if (!cat) cat = type === 'in' ? 'Outros' : 'Outros';
      const d = $('#tdate').value || today();
      const n = repN(), rec = n > 1 ? uid() : null, note = $('#tnote').value.trim().slice(0, 40);
      for (let i = 0; i < n; i++) S.tx.push({ id: uid(), type, cat, value: Math.round(v * 100) / 100, date: addMonths(d, i), note, ...(rec ? { rec, recI: i + 1, recN: n } : {}) });
      save(); closeSheet(); curMonth = ym(d); route = 'inicio'; render();
      toast(n > 1 ? `Lançado nos próximos ${n} meses ↻` : type === 'in' ? 'Receita lançada 💰' : 'Gasto lançado ✔');
    };
  });
}

/* ---------- ANALISAR ---------- */
let draft = { code: '', price: '', lpa: '', vpa: '', dy: '', roe: '', payout: '', div: '', src: null };
const AF = [
  ['code', 'Buscar ação', '', 'Digite o código, ex.: PETR4', 'text'],
  ['price', 'Preço atual', 'R$', 'Cotação de hoje'],
  ['lpa', 'LPA', 'R$', 'Lucro por ação (12 m)'],
  ['vpa', 'VPA', 'R$', 'Valor patrimonial por ação'],
  ['dy', 'Dividend yield', '%', 'Proventos 12 m ÷ preço'],
  ['roe', 'ROE', '%', 'Lucro ÷ patrimônio'],
  ['payout', 'Payout', '%', 'Parte do lucro distribuída'],
  ['div', 'Dív. líq./EBITDA', 'x', 'Negativo = mais caixa que dívida']
];
function draftNum() {
  const p = k => num(draft[k]);
  return { code: (draft.code || '').toUpperCase().trim(), price: p('price'), lpa: p('lpa'), vpa: p('vpa'), dy: p('dy') / 100, roe: p('roe') / 100, payout: p('payout') / 100, div: p('div'), fin: !!(draft.src && draft.src.financeira) };
}
const complete = a => ['price', 'lpa', 'vpa', 'dy', 'roe', 'payout'].every(k => isFinite(a[k])) && (a.fin || isFinite(a.div));
function resultHTML(a) {
  if (!complete(a)) return `<div class="hint row"><img src="img/analisar.webp" alt=""><p class="small muted">${DATA && DATA.acoes ? 'Escolha uma ação acima. Os números vêm sozinhos dos balanços da CVM e do fechamento da B3.' : 'Preencha os números da ação (Investidor10, Status Invest ou Fundamentus).'}</p></div>`;
  const r = analyze(a);
  const V = { ok: ['Passou com folga', 'meta'], mid: ['Passou, sem folga', 'analisar'], no: ['Não passou', 'vazio'] }[r.verdict];
  const pos = Math.max(4, Math.min(96, 50 + (r.folga / 0.10) * 50));
  return `
  <section class="card verdict2 ${r.verdict}">
    <div class="row" style="gap:12px"><img src="img/${V[1]}.webp" alt=""><div style="flex:1;min-width:0"><p class="tiny muted">${esc(a.code || 'Resultado')}${draft.src && draft.src.nome ? ' · ' + esc(draft.src.nome.split(' ').slice(0, 3).join(' ')) : ''}</p><b class="vt">${V[0]}</b><p class="tiny muted">${r.okN} de 4 critérios</p></div>
      <div class="ret"><p class="tiny muted">retorno/ano</p><b class="num ${r.ret > r.regua ? 'g' : 'r'}">${pct(r.ret)}</b></div></div>
    <div class="gauge"><u></u><i style="left:${pos}%"></i></div>
    <div class="row between tiny dim"><span>DY ${pct(a.dy)} + cresc. ${pct(r.cres)}</span><span>régua ${pct(r.regua)}</span></div>
  </section>
  <div class="critgrid">${r.c.map(c => `<div class="cg ${c.ok ? 'ok' : 'no'}"><span>${c.ok ? '✓' : '✕'}</span><div><p class="tiny">${c.n.replace('ROE de pelo menos', 'ROE ≥').replace('Dívida até', 'Dívida ≤').replace(' o EBITDA', '').replace('P/L entre 0 e', 'P/L ≤').replace('Retorno acima de', 'Retorno >').replace('Dívida: não se aplica', 'Dívida: n/a')}</p><b class="num">${c.v}</b></div></div>`).join('')}</div>
  <div class="metrics4">
    <div><span class="tiny muted">P/L</span><b class="num">${x(r.pl)}</b></div>
    <div><span class="tiny muted">P/VP</span><b class="num">${x(r.pvp, 2)}</b></div>
    <div><span class="tiny muted">Graham</span><b class="num">${brl(r.graham)}</b></div>
    <div><span class="tiny muted">Margem</span><b class="num ${r.margem >= 0 ? 'g' : 'r'}">${pct(r.margem, 0)}</b></div>
  </div>
  ${draft.src ? `<p class="tiny dim" style="text-align:center">CVM balanço ${esc(draft.src.periodo)} · B3 ${dBRs(DATA.data_cotacao)} · Selic Banco Central</p>` : ''}
  <button class="btn" id="asave">Salvar na minha lista</button>`;
}
function viewAnalisar() {
  const a = draftNum();
  const saved = S.analyses.map(s => { const q = Q(s.code); const t = q ? { ...s, price: q.preco, lpa: q.lpa, vpa: q.vpa, dy: q.dy, roe: q.roe, payout: q.payout || 0, div: q.div_ebitda, fin: q.financeira } : s; return { ...t, r: analyze(t) }; }).sort((p, q) => (q.r.okN === 4) - (p.r.okN === 4) || q.r.ret - p.r.ret);
  const shown = showAllList ? saved : saved.slice(0, 5);
  let rank = 0;
  const auto = !!draft.src;
  const fields = AF.filter(([k]) => k !== 'code' && !(k === 'div' && draft.src && draft.src.financeira));
  const sum = auto ? `${brl(num(draft.price))} · P/L ${x(num(draft.price) / num(draft.lpa))} · ROE ${draft.roe}% · DY ${draft.dy || '—'}%` : '';
  return `
  <header class="page"><h1>Analisar ação</h1><p class="small muted">Passa no filtro dos 4 critérios?</p></header>
  <section class="card">
    <div class="search"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
      <input data-a="code" autocapitalize="characters" maxlength="8" enterkeyhint="search" placeholder="Código ou empresa (ex.: PETR4)" value="${esc(draft.code)}">
      ${draft.code ? '<button id="aclear" aria-label="Limpar">✕</button>' : ''}</div>
    <div id="sugs" class="chips scroll"></div>
    ${auto && !editNums ? `<button class="sumrow" id="editnums"><span class="tiny muted">${sum}</span><span class="link">editar</span></button>` : DATA && DATA.acoes && !editNums ? `<button class="link" id="editnums" style="margin-top:10px">ou preencher os números à mão</button>` : `
    <div class="grid2 nums">${fields.map(([k, l, suf, h]) => `
      <div class="field"><label>${l}</label><div class="inp ${suf === 'R$' ? 'has-pre' : ''}">${suf === 'R$' ? '<span class="pre">R$</span>' : ''}<input data-a="${k}" inputmode="decimal" placeholder="${h.split(' ')[0]}" value="${esc(draft[k])}">${suf && suf !== 'R$' ? `<span class="suf">${suf}</span>` : ''}</div></div>`).join('')}</div>`}
  </section>
  <div id="ares" class="stack">${resultHTML(a)}</div>
  ${saved.length ? `<section class="card"><div class="row between"><h3>Minha lista</h3><span class="tiny muted">ordem por retorno</span></div>
    <div class="list">${shown.map(s => { const ok = s.r.okN === 4; if (ok) rank++; return `
      <div class="item" data-load="${s.id}"><div class="rank ${ok && rank === 1 ? 'first' : ''}">${ok ? rank + 'º' : '–'}</div><div class="t"><b>${esc(s.code)}</b><span class="tiny ${ok ? 'g' : 'r'}">${ok ? 'Passou' : 'Não passou'} · ${s.r.okN}/4</span></div><div class="v num ${s.r.ret > s.r.regua ? 'g' : ''}">${pct(s.r.ret)}</div><button class="del" data-delan="${s.id}" aria-label="Apagar">${ICON.trash}</button></div>`; }).join('')}</div>
    ${saved.length > 5 ? `<button class="more" id="toglist">${showAllList ? 'Mostrar menos' : `Ver todas as ${saved.length}`}</button>` : ''}
  </section>` : ''}
  <p class="disc">Ferramenta educativa. Não é recomendação de compra ou venda.</p>`;
}
/* ---------- CARTEIRA ---------- */
function viewCarteira() {
  const p = portfolio();
  const types = Object.entries(p.byType).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const now = new Date(); const months = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(iso(d).slice(0, 7)); }
  const dm = months.map(m => S.divs.filter(d => ym(d.date) === m).reduce((a, d) => a + d.value, 0));
  const maxd = Math.max(...dm, 1);
  const tot = p.cur;
  const tsum = S.assets.reduce((a, k) => a + (k.target || 0), 0);
  return `
  <header class="page row between"><div><h1>Carteira</h1><p class="small muted">${DATA && DATA.data_cotacao ? 'Preços da B3 de ' + dBRs(DATA.data_cotacao) : 'Seus investimentos'}</p></div><button class="chip o" id="addasset">+ Adicionar</button></header>
  <section class="card hero">
    <p class="label">Total investido hoje</p>
    <p class="big num">${brl(p.cur)}</p>
    <div class="row between small" style="margin-top:4px"><span class="${p.lucro >= 0 ? 'g' : 'r'} num">${p.inv > 0 ? `${p.lucro >= 0 ? '▲' : '▼'} ${brl(p.lucro, 0)} (${pct(p.lucroP)})` : '—'}</span><span class="muted">Proventos 12m <b class="o num">${brl(p.d12, 0)}</b></span></div>
    ${types.length ? `<div class="alloc">${types.map(([t, v]) => `<i style="width:${(v / tot * 100).toFixed(2)}%;background:${tipoCor(t)}"></i>`).join('')}</div><div class="legend">${types.map(([t, v]) => `<span><i style="background:${tipoCor(t)}"></i>${esc(t)} ${pct(v / tot, 0)}</span>`).join('')}</div>` : ''}
  </section>
  <div class="seg3 tabsx"><button data-ct="ativos" class="${cartTab === 'ativos' ? 'on' : ''}">Ativos</button><button data-ct="proventos" class="${cartTab === 'proventos' ? 'on' : ''}">Proventos</button><button data-ct="aporte" class="${cartTab === 'aporte' ? 'on' : ''}">Aportar</button></div>
  ${cartTab === 'ativos' ? `
  <section class="card">
    ${S.assets.length ? `<div class="list">${S.assets.slice().sort((a, b) => b.qty * b.price - a.qty * a.price).map(a => { const v = a.qty * a.price, l = a.qty * (a.price - a.pm), lp = a.pm > 0 ? a.price / a.pm - 1 : NaN; return `
      <div class="item" data-editasset="${a.id}"><div class="ico tag" style="background:${tipoCor(a.type)}22;color:${tipoCor(a.type)}">${sig(a.type)}</div><div class="t"><b>${esc(a.code)}</b><span class="tiny muted">${nf(a.qty, 4)} × ${brl(a.price)}</span></div><div class="v num">${brl(v, 0)}<p class="tiny ${l >= 0 ? 'g' : 'r'}">${l >= 0 ? '+' : ''}${pct(lp)} · ${tot ? pct(v / tot, 0) : ''}</p></div></div>`; }).join('')}</div>`
    : `<div class="empty row"><img src="img/carteira.webp" alt=""><p class="muted small">Adicione ações, FIIs, Tesouro, CDB... no <b class="o">+ Adicionar</b>.</p></div>`}
  </section>` : ''}
  ${cartTab === 'proventos' ? `
  <section class="card"><div class="row between"><h3>Últimos 12 meses</h3><button class="chip o" id="adddiv">+ Lançar</button></div>
    <div class="cols">${dm.map((v, i) => `<div><i style="height:${(v / maxd * 70).toFixed(1)}px" title="${brl(v)}"></i><span>${MES3[+months[i].slice(5) - 1][0]}</span></div>`).join('')}</div>
    <div class="row between small" style="margin-top:10px"><span class="muted">Média/mês <b class="o num">${brl(p.dMes)}</b></span><span class="muted">Total <b class="num">${brl(p.dTot, 0)}</b></span></div>
    ${S.divs.length ? `<div class="list" style="margin-top:6px">${S.divs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map(d => `
    <div class="item"><div class="ico">🪙</div><div class="t"><b>${esc(d.code)}</b><span class="tiny muted">${esc(d.kind)} · ${d.date.slice(8, 10)}/${d.date.slice(5, 7)}</span></div><div class="v g num">+${brl(d.value)}</div><button class="del" data-deldiv="${d.id}" aria-label="Apagar">${ICON.trash}</button></div>`).join('')}</div>` : '<p class="small muted" style="margin-top:8px">Lance cada dividendo, JCP ou rendimento que cair na conta.</p>'}
  </section>` : ''}
  ${cartTab === 'aporte' ? `
  <section class="card stack">
    <div class="field"><label>Quanto vai investir agora</label><div class="inp has-pre"><span class="pre">R$</span><input id="aporte" inputmode="decimal" placeholder="${nf(Math.max(0, Math.round(avgSobra())), 0) || '500'}"></div></div>
    <div id="aporteres"></div>
    <p class="tiny dim">${tsum && Math.abs(tsum - 1) > 0.005 ? `<span class="o">As metas somam ${pct(tsum, 0)}; o ideal é 100%.</span> ` : ''}Defina a meta de cada ativo tocando nele em Ativos.</p>
  </section>` : ''}`;
}
function aporteCalc(val) {
  const tot = S.assets.reduce((a, k) => a + k.qty * k.price, 0) + val;
  const gaps = S.assets.filter(a => a.target > 0).map(a => ({ a, gap: Math.max(0, a.target * tot - a.qty * a.price) }));
  const g = gaps.reduce((s, k) => s + k.gap, 0);
  if (!gaps.length) return '<p class="small muted">Nenhum investimento tem meta definida ainda.</p>';
  return `<div class="list">${gaps.sort((p, q) => q.gap - p.gap).map(k => { const put = g > 0 ? k.gap / g * Math.min(val, g) : 0; return `<div class="item"><div class="ico" style="font-size:12px;font-weight:800;color:${tipoCor(k.a.type)}">${sig(k.a.type)}</div><div class="t"><b>${esc(k.a.code)}</b><span class="tiny muted">meta ${pct(k.a.target, 0)}</span></div><div class="v num ${put > 0 ? 'o' : 'dim'}">${brl(put)}</div></div>`; }).join('')}</div>`;
}
function openAsset(id) {
  const a = S.assets.find(k => k.id === id) || { type: 'Ação' };
  openSheet(`<div class="stack"><h2>${id ? 'Editar investimento' : 'Novo investimento'}</h2>
    <div class="field"><label>Código ou nome</label><div class="inp"><input id="acode" maxlength="20" placeholder="Ex.: EXEM3 ou Tesouro Selic" value="${esc(a.code || '')}"></div></div>
    <div class="field"><label>Tipo</label><div class="chips" id="atype">${TIPOS.map(([t]) => `<button data-ty="${t}" class="${t === a.type ? 'on' : ''}">${t}</button>`).join('')}</div></div>
    <div class="grid2">
      <div class="field"><label>Quantidade</label><div class="inp"><input id="aqty" inputmode="decimal" value="${nf(a.qty, 6)}" placeholder="100"></div></div>
      <div class="field"><label>Preço médio</label><div class="inp has-pre"><span class="pre">R$</span><input id="apm" inputmode="decimal" value="${nf(a.pm)}" placeholder="0,00"></div></div>
      <div class="field"><label>Preço atual</label><div class="inp has-pre"><span class="pre">R$</span><input id="apr" inputmode="decimal" value="${nf(a.price)}" placeholder="0,00"></div></div>
      <div class="field"><label>Meta na carteira</label><div class="inp"><input id="atg" inputmode="decimal" value="${a.target ? nf(a.target * 100, 1) : ''}" placeholder="opcional"><span class="suf">%</span></div></div>
    </div>
    <p class="tiny dim">Renda fixa ou Tesouro: quantidade 1, preço médio = quanto aplicou, preço atual = saldo de hoje.</p>
    <button class="btn" id="asv">Salvar</button>${id ? '<button class="btn danger" id="adel">Apagar investimento</button>' : ''}</div>`, () => {
    let ty = a.type;
    $('#atype').onclick = e => { const b = e.target.closest('[data-ty]'); if (!b) return; ty = b.dataset.ty; $('#atype').querySelectorAll('button').forEach(k => k.classList.toggle('on', k === b)); };
    $('#acode').oninput = () => { const q = Q($('#acode').value); if (q && !$('#apr').value) $('#apr').value = nf(q.preco); };
    $('#asv').onclick = () => {
      const code = $('#acode').value.trim(), qty = num($('#aqty').value), pm = num($('#apm').value);
      let pr = num($('#apr').value); const tg = num($('#atg').value);
      if (!code || !(qty > 0) || !(pm > 0)) { toast('Preencha código, quantidade e preço médio'); return; }
      if (!(pr > 0)) pr = (Q(code) && Q(code).preco) || pm;
      const obj = { id: a.id || uid(), code: code.toUpperCase().length <= 7 ? code.toUpperCase() : code, type: ty, qty, pm, price: pr, target: isFinite(tg) ? tg / 100 : 0 };
      if (a.id) S.assets[S.assets.findIndex(k => k.id === a.id)] = obj; else S.assets.push(obj);
      applyData(); save(); closeSheet(); render(); toast('Carteira atualizada ✔');
    };
    const del = $('#adel'); if (del) del.onclick = () => { if (confirm('Apagar ' + a.code + '?')) { S.assets = S.assets.filter(k => k.id !== a.id); save(); closeSheet(); render(); } };
  });
}
function openDiv() {
  openSheet(`<div class="stack"><h2>Lançar provento</h2>
    <div class="amount"><span>R$</span><input id="dval" inputmode="decimal" placeholder="0,00"></div>
    <div class="field"><label>De qual investimento</label><div class="inp"><input id="dcode" list="dl" maxlength="20" placeholder="Código"></div><datalist id="dl">${S.assets.map(a => `<option value="${esc(a.code)}">`).join('')}</datalist></div>
    <div class="chips" id="dkind">${['Dividendo', 'JCP', 'Rendimento FII', 'Juros'].map((k, i) => `<button data-k="${k}" class="${i === 0 ? 'on' : ''}">${k}</button>`).join('')}</div>
    <div class="field"><label>Data</label><div class="inp"><input id="ddate" type="date" value="${today()}"></div></div>
    <button class="btn" id="dsv">Salvar</button></div>`, () => {
    let kind = 'Dividendo';
    $('#dkind').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; kind = b.dataset.k; $('#dkind').querySelectorAll('button').forEach(k => k.classList.toggle('on', k === b)); };
    setTimeout(() => $('#dval').focus(), 250);
    $('#dsv').onclick = () => {
      const v = num($('#dval').value), code = $('#dcode').value.trim().toUpperCase();
      if (!(v > 0) || !code) { toast('Preencha valor e código'); return; }
      S.divs.push({ id: uid(), date: $('#ddate').value || today(), code, kind, value: v }); save(); closeSheet(); render(); toast('Provento lançado 🪙');
    };
  });
}

/* ---------- META / AJUSTES ---------- */
function viewMais() {
  const st = S.settings, p = portfolio();
  const need = st.yieldMeta > 0 ? st.meta * 12 / st.yieldMeta : 0;
  const prog = need > 0 ? Math.min(1, p.cur / need) : 0;
  const pmt = st.aporte != null ? st.aporte : Math.max(0, Math.round(avgSobra()));
  const n = nper(st.yieldMeta / 12, pmt, p.cur, need);
  const anos = n / 12;
  const quando = isFinite(anos) ? new Date(new Date().getFullYear(), new Date().getMonth() + Math.round(n)) : null;
  const sel = DATA && DATA.mercado && DATA.mercado.selic;
  return `
  <header class="page"><h1>Meta de liberdade</h1><p class="small muted">Quando você vive de renda?</p></header>
  <section class="card gold">
    <div class="row" style="gap:14px"><div class="ring" style="--p:${(prog * 100).toFixed(1)}"><div>${Math.round(prog * 100)}%</div></div>
    <div style="min-width:0"><p class="label">Você chega lá em</p><p class="big" style="font-size:28px">${prog >= 1 ? 'Já chegou 🎉' : isFinite(anos) ? (anos < 1 ? Math.ceil(n) + ' meses' : anos.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' anos') : '—'}</p><p class="tiny muted">${quando && prog < 1 ? MESES[quando.getMonth()] + ' de ' + quando.getFullYear() + ' · faltam ' + brl(Math.max(0, need - p.cur), 0) : pmt <= 0 && prog < 1 ? 'defina um aporte mensal' : ''}</p></div></div>
  </section>
  <section class="card">
    <div class="grid3">
      <div class="field"><label>Renda/mês</label><div class="inp has-pre"><span class="pre">R$</span><input data-s="meta" data-m="1" inputmode="decimal" value="${nf(st.meta, 0)}"></div></div>
      <div class="field"><label>Aporte/mês</label><div class="inp has-pre"><span class="pre">R$</span><input data-s="aporte" data-m="1" inputmode="decimal" value="${nf(pmt, 0)}"></div></div>
      <div class="field"><label>Rende/ano</label><div class="inp"><input data-s="yieldMeta" data-m="100" inputmode="decimal" value="${nf(st.yieldMeta * 100, 1)}"><span class="suf">%</span></div></div>
    </div>
    <p class="tiny dim" style="margin-top:8px">Precisa de ${brl(need, 0)} investidos. Estimativa com juros compostos, não promessa.</p>
  </section>
  <details class="card acc"><summary><span>⚙️ Critérios da análise</span><span class="tiny muted">Selic ${pct(st.selic, 2)}</span></summary>
    <div class="grid3" style="margin-top:12px">
      <div class="field"><label>Selic</label><div class="inp"><input data-s="selic" data-m="100" inputmode="decimal" value="${nf(st.selic * 100, 2)}"><span class="suf">%</span></div></div>
      <div class="field"><label>Prêmio</label><div class="inp"><input data-s="premio" data-m="100" inputmode="decimal" value="${nf(st.premio * 100, 2)}"><span class="suf">%</span></div></div>
      <div class="field"><label>ROE mín.</label><div class="inp"><input data-s="roeMin" data-m="100" inputmode="decimal" value="${nf(st.roeMin * 100, 1)}"><span class="suf">%</span></div></div>
      <div class="field"><label>P/L máx.</label><div class="inp"><input data-s="plMax" data-m="1" inputmode="decimal" value="${nf(st.plMax, 1)}"></div></div>
      <div class="field"><label>Dívida máx.</label><div class="inp"><input data-s="dividaMax" data-m="1" inputmode="decimal" value="${nf(st.dividaMax, 1)}"><span class="suf">x</span></div></div>
      <div class="field"><label>Cresc. máx.</label><div class="inp"><input data-s="cresMax" data-m="100" inputmode="decimal" value="${nf(st.cresMax * 100, 1)}"><span class="suf">%</span></div></div>
    </div>
    ${sel ? (st.selicManual ? `<button class="btn ghost sm" id="selicbc" style="margin-top:10px">Voltar à Selic do Banco Central (${pct(sel.valor, 2)})</button>` : `<p class="tiny dim" style="margin-top:8px">Selic do Banco Central, atualizada em ${dBR(sel.data)}.</p>`) : ''}
  </details>
  <details class="card acc"><summary><span>💾 Backup e dados</span><span class="tiny muted">salvo neste celular</span></summary>
    <div class="stack" style="margin-top:12px">
      ${memOnly ? '<p class="small r">Este navegador está bloqueando o salvamento (modo anônimo?).</p>' : ''}
      <div class="grid2"><button class="btn ghost sm" id="bexp">Fazer backup</button><button class="btn ghost sm" id="bimp">Restaurar</button></div>
      <input type="file" id="bfile" accept="application/json,.json" hidden>
      <div class="field"><label>Seu nome</label><div class="inp"><input id="sname" maxlength="24" value="${esc(S.name)}"></div></div>
      <button class="btn danger sm" id="breset">Apagar todos os dados</button>
    </div>
  </details>
  <details class="card acc" id="install"><summary><span>📲 Instalar na tela inicial</span></summary>
    <p class="small muted" style="margin-top:10px">${installText()}</p>${deferredPrompt ? '<button class="btn sm" id="binst" style="margin-top:10px">Instalar agora</button>' : ''}
  </details>
  <p class="disc">Carteira Inteligente · @eu.futuro.rico · Ferramenta educativa, não é recomendação.</p>`;
}
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (route === 'mais') render(); });
function installText() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (window.matchMedia('(display-mode: standalone)').matches) return 'Já está instalado. 🎉';
  return ios ? 'No Safari, toque em Compartilhar (quadrado com seta) e depois em "Adicionar à Tela de Início".' : 'No Chrome, toque nos 3 pontinhos e depois em "Instalar app" ou "Adicionar à tela inicial".';
}

/* ---------- binds ---------- */
function bind() {
  document.querySelectorAll('[data-go2]').forEach(b => b.onclick = () => go(b.dataset.go2));
  const on = (id, f) => { const el = $('#' + id); if (el) el.onclick = f; };
  on('mprev', () => { const [y, m] = curMonth.split('-').map(Number); curMonth = iso(new Date(y, m - 2, 1)).slice(0, 7); render(); });
  on('mnext', () => { const [y, m] = curMonth.split('-').map(Number); curMonth = iso(new Date(y, m, 1)).slice(0, 7); render(); });
  on('togtx', () => { showAllTx = !showAllTx; render(); });
  on('togcats', () => { showAllCats = !showAllCats; render(); });
  on('toglist', () => { showAllList = !showAllList; render(); });
  on('editnums', () => { editNums = true; render(); });
  on('addtx', openTx); on('addasset', () => openAsset()); on('adddiv', openDiv);
  document.querySelectorAll('[data-deltx]').forEach(b => b.onclick = e => { e.stopPropagation(); delTx(b.dataset.deltx); });
  document.querySelectorAll('[data-deldiv]').forEach(b => b.onclick = e => { e.stopPropagation(); S.divs = S.divs.filter(t => t.id !== b.dataset.deldiv); save(); render(); });
  document.querySelectorAll('[data-delan]').forEach(b => b.onclick = e => { e.stopPropagation(); S.analyses = S.analyses.filter(t => t.id !== b.dataset.delan); save(); render(); });
  document.querySelectorAll('[data-editasset]').forEach(b => b.onclick = () => openAsset(b.dataset.editasset));
  document.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { cartTab = b.dataset.ct; render(); });
  const ap = $('#aporte'); if (ap) { const f = () => { const v = num(ap.value) || num(ap.placeholder) || 0; $('#aporteres').innerHTML = aporteCalc(v); }; ap.oninput = f; f(); }
  // analisar
  document.querySelectorAll('[data-a]').forEach(inp => inp.oninput = () => {
    draft[inp.dataset.a] = inp.value;
    if (inp.dataset.a === 'code') { if (Q(inp.value)) { fillFromData(inp.value); return; } draft.src = null; showSugs(inp.value); }
    $('#ares').innerHTML = resultHTML(draftNum()); bindAsave();
  });
  if (route === 'analisar') showSugs(draft.src ? '' : draft.code);
  bindAsave();
  on('aclear', () => { draft = { code: '', price: '', lpa: '', vpa: '', dy: '', roe: '', payout: '', div: '', src: null }; editNums = false; render(); });
  on('aex', () => { draft = { code: 'EXEM3', price: '32,50', lpa: '4,10', vpa: '21,00', dy: '9', roe: '19', payout: '55', div: '1,4' }; render(); toast('Exemplo fictício carregado'); });
  document.querySelectorAll('[data-load]').forEach(el => el.onclick = () => { const s = S.analyses.find(k => k.id === el.dataset.load); if (!s) return; if (Q(s.code)) { fillFromData(s.code); return; } draft = { code: s.code, price: nf(s.price), lpa: nf(s.lpa), vpa: nf(s.vpa), dy: nf(s.dy * 100), roe: nf(s.roe * 100), payout: nf(s.payout * 100), div: nf(s.div), src: null }; render(); });
  // ajustes
  document.querySelectorAll('[data-s]').forEach(inp => inp.onchange = () => { const v = num(inp.value); if (!isFinite(v)) return; S.settings[inp.dataset.s] = v / Number(inp.dataset.m); if (inp.dataset.s === 'selic') S.settings.selicManual = true; save(); render(); });
  on('selicbc', () => { S.settings.selicManual = false; applyData(); save(); render(); toast('Usando a Selic do Banco Central'); });
  const sn = $('#sname'); if (sn) sn.onchange = () => { S.name = sn.value.trim().slice(0, 24); save(); toast('Nome salvo'); };
  on('bexp', () => { const b = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'backup-carteira-inteligente-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); toast('Backup baixado ✔'); });
  on('bimp', () => $('#bfile').click());
  const bf = $('#bfile'); if (bf) bf.onchange = async () => { try { const d = JSON.parse(await bf.files[0].text()); if (!Array.isArray(d.tx)) throw 0; S = { ...structuredClone(DEF), ...d, settings: { ...DEF.settings, ...(d.settings || {}) } }; save(); render(); toast('Backup restaurado ✔'); } catch (e) { toast('Arquivo de backup inválido'); } };
  on('breset', () => { if (confirm('Apagar TODOS os seus dados deste aparelho? Isso não pode ser desfeito.')) { const n = S.name; S = structuredClone(DEF); S.onboarded = true; S.name = n; save(); render(); toast('Dados apagados'); } });
  on('binst', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; render(); });
}
function fillFromData(code) {
  const q = Q(code); if (!q) return;
  const f = (v, d = 2) => v == null || !isFinite(v) ? '' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: d, useGrouping: false });
  editNums = false;
  draft = { code: code.toUpperCase().trim(), price: f(q.preco), lpa: f(q.lpa), vpa: f(q.vpa), dy: q.dy == null ? '' : f(q.dy * 100, 1), roe: f(q.roe * 100, 1), payout: f(q.payout == null ? 0 : q.payout * 100, 1), div: q.financeira ? '' : f(q.div_ebitda, 2), src: q };
  render();
}
const POP = ['PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'BBDC4', 'ITSA4', 'WEGE3', 'BBSE3', 'TAEE11', 'EGIE3', 'ABEV3', 'SANB11', 'B3SA3', 'PRIO3', 'SBSP3', 'CMIG4', 'VIVT3', 'KLBN11', 'CPLE6', 'RADL3'];
function popular() {
  if (!DATA || !DATA.acoes) return POP;
  const ok = POP.filter(c => DATA.acoes[c]);
  const extra = Object.entries(DATA.acoes).filter(([c]) => !ok.includes(c)).sort((a, b) => (b[1].volume || 0) - (a[1].volume || 0)).map(([c]) => c);
  return ok.concat(extra).slice(0, 20);
}
function showSugs(txt) {
  const box = $('#sugs'); if (!box) return;
  const t = (txt || '').toUpperCase().trim();
  if (!t) {
    box.innerHTML = `<p class="tiny muted" style="width:100%">Mais analisadas · toque para ver</p>` + popular().map(c => `<button data-pick="${c}"><b>${c}</b></button>`).join('');
    box.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { if (Q(b.dataset.pick)) fillFromData(b.dataset.pick); else { draft.code = b.dataset.pick; render(); } });
    return;
  }
  if (!DATA || !DATA.acoes) { box.innerHTML = ''; return; }
  const list = Object.entries(DATA.acoes).filter(([c, q]) => c.startsWith(t) || (t.length >= 3 && (q.nome || '').toUpperCase().includes(t))).sort((a, b) => (b[1].volume || 0) - (a[1].volume || 0)).slice(0, 8);
  box.innerHTML = list.length ? list.map(([c, q]) => `<button data-pick="${c}"><b>${c}</b> <span class="tiny muted">${esc((q.nome || '').split(' ').slice(0, 2).join(' '))}</span></button>`).join('') : '<span class="tiny muted">Nenhuma ação encontrada com esse código.</span>';
  box.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => fillFromData(b.dataset.pick));
}
function bindAsave() {
  const b = $('#asave'); if (!b) return;
  b.onclick = () => {
    const a = draftNum(); if (!complete(a)) return;
    a.code = a.code || 'AÇÃO'; const ex = S.analyses.find(k => k.code === a.code);
    const obj = { id: ex ? ex.id : uid(), ...a, date: Date.now() };
    if (ex) S.analyses[S.analyses.indexOf(ex)] = obj; else S.analyses.push(obj);
    save(); render(); toast(a.code + ' salva na sua lista ✔');
  };
}

/* ---------- start ---------- */
const h = location.hash.slice(1); if (['inicio', 'analisar', 'carteira', 'mais'].includes(h)) route = h;
render();
loadData();
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
