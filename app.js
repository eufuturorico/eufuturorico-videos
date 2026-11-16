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
    { n: 'Dívida até ' + x(st.dividaMax) + ' o EBITDA', d: 'A dívida cabe no caixa que ela gera', ok: a.div <= st.dividaMax, v: x(a.div) },
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
function viewHome() {
  const m = monthTotals(curMonth), p = portfolio(), st = S.settings;
  const [yy, mm] = curMonth.split('-').map(Number);
  const need = st.yieldMeta > 0 ? st.meta * 12 / st.yieldMeta : 0;
  const prog = need > 0 ? Math.min(1, p.cur / need) : 0;
  const cats = Object.entries(m.cats).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const txs = S.tx.filter(t => ym(t.date) === curMonth).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const pIn = m.inc > 0 ? Math.min(100, m.out / m.inc * 100) : (m.out > 0 ? 100 : 0);
  return `
  <div class="top">
    <div class="hello"><div class="avatar"><img src="img/icon.webp" alt=""></div>
      <div><p class="muted small">${greet()}${S.name ? ',' : ''}</p><h2>${S.name ? esc(S.name) : 'Futuro rico'} 👋</h2></div></div>
    <button class="iconbtn" data-go2="mais" aria-label="Ajustes">${ICON.gear}</button>
  </div>
  <div class="row between">
    <div class="monthnav"><button class="iconbtn" id="mprev" aria-label="Mês anterior">${ICON.left}</button><b>${MESES[mm - 1]} ${yy}</b><button class="iconbtn" id="mnext" aria-label="Próximo mês">${ICON.right}</button></div>
    ${isFinite(m.taxa) ? `<span class="chip ${m.taxa >= 0.1 ? 'g' : m.taxa >= 0 ? 'o' : 'r'}">Poupou ${pct(m.taxa, 0)}</span>` : ''}
  </div>
  <section class="card hero">
    <div class="pad">
      <p class="label">${m.sobra >= 0 ? 'Sobrou para investir' : 'Gastou mais que ganhou'}</p>
      <p class="big num ${m.sobra < 0 ? 'r' : ''}">${brl(m.sobra)}</p>
    </div>
    <div class="split" style="margin-top:14px;position:relative;z-index:1;max-width:calc(100% - 70px)">
      <div class="mini"><p class="tiny muted">Entrou</p><p class="v g num">${brl(m.inc, 0)}</p></div>
      <div class="mini"><p class="tiny muted">Saiu</p><p class="v r num">${brl(m.out, 0)}</p></div>
    </div>
    <div class="bar" style="margin-top:12px;max-width:calc(100% - 70px)"><i style="width:${pIn}%;background:${pIn >= 100 ? 'var(--vermelho)' : pIn > 85 ? 'var(--ouro)' : 'var(--verde)'}"></i></div>
    <p class="tiny muted" style="margin-top:6px">${m.inc > 0 ? `Você gastou ${pct(m.out / m.inc, 0)} do que entrou` : 'Lance sua primeira receita no botão dourado'}</p>
    <img class="mascot" src="img/hero.webp" alt="">
  </section>
  <div class="split">
    <section class="card" data-go2="carteira"><p class="label">Patrimônio</p><p class="mid num" style="margin-top:6px">${brl(p.cur, 0)}</p><p class="small ${p.lucro >= 0 ? 'g' : 'r'} num">${p.inv > 0 ? (p.lucro >= 0 ? '▲ ' : '▼ ') + pct(p.lucroP) : 'Cadastre seus investimentos'}</p></section>
    <section class="card" data-go2="carteira"><p class="label">Renda passiva</p><p class="mid num o" style="margin-top:6px">${brl(p.dMes)}</p><p class="small muted">média por mês (12 m)</p></section>
  </div>
  <section class="card gold row" data-go2="mais" style="gap:16px">
    <div class="ring" style="--p:${(prog * 100).toFixed(1)}"><div>${Math.round(prog * 100)}%</div></div>
    <div><p class="label">Meta de liberdade</p><p class="mid" style="margin:4px 0 2px">${brl(st.meta, 0)}/mês</p><p class="small muted">Faltam ${brl(Math.max(0, need - p.cur), 0)} investidos</p></div>
  </section>
  <section class="card">
    <div class="row between"><h3>Para onde foi o dinheiro</h3><span class="small muted">${MES3[mm - 1]}</span></div>
    ${cats.length ? `<div class="cats" style="margin-top:14px">${cats.map(([c, v]) => `<div class="cat"><span>${catIcon('out', c)}</span><div><div class="row between small"><span>${esc(c)}</span><b class="num">${brl(v, 0)}</b></div><div class="bar" style="margin-top:5px"><i style="width:${(v / cats[0][1] * 100).toFixed(1)}%;background:linear-gradient(90deg,var(--azul),var(--roxo))"></i></div></div><span class="tiny muted">${m.out ? pct(v / m.out, 0) : ''}</span></div>`).join('')}</div>`
    : `<p class="muted small" style="margin-top:8px">Nenhum gasto lançado neste mês.</p>`}
  </section>
  <section class="card">
    <div class="row between"><h3>Lançamentos</h3><button class="chip o" id="addtx">${'+ Novo'}</button></div>
    ${txs.length ? `<div class="list" style="margin-top:6px">${txs.slice(0, 30).map(t => `
      <div class="item"><div class="ico">${catIcon(t.type, t.cat)}</div><div class="t"><b>${esc(t.note || t.cat)}</b><span class="tiny muted">${esc(t.cat)} · ${t.date.slice(8, 10)}/${t.date.slice(5, 7)}</span></div>
      <div class="v num ${t.type === 'in' ? 'g' : ''}">${t.type === 'in' ? '+' : '−'} ${brl(t.value)}</div><button class="del" data-deltx="${t.id}" aria-label="Apagar">${ICON.trash}</button></div>`).join('')}</div>`
    : `<div class="empty"><img src="img/vazio.webp" alt=""><p class="muted small">Seu mês está em branco. Toque no <b class="o">+</b> e lance o primeiro gasto.</p></div>`}
  </section>
  <section class="card tip"><img src="img/lancar.webp" alt=""><div><p class="label">Dica do dia</p><p class="small" style="margin-top:4px">${tip}</p></div></section>`;
}

/* ---------- LANÇAR ---------- */
function openSheet(html, after) {
  $('#sheet-body').innerHTML = html; $('#sheet').hidden = false; document.body.style.overflow = 'hidden';
  after && after();
}
function closeSheet() { $('#sheet').hidden = true; document.body.style.overflow = ''; }
$('#sheet').addEventListener('click', e => { if (e.target.dataset.close !== undefined) closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });

function openTx() {
  let type = 'out', cat = null;
  const chips = () => (type === 'in' ? CAT_IN : CAT_OUT).map(([c, i]) => `<button data-cat="${esc(c)}" class="${c === cat ? 'on' : ''}">${i} ${esc(c)}</button>`).join('');
  openSheet(`<div class="stack">
    <div class="seg"><button data-t="out" class="on r">Gasto</button><button data-t="in">Receita</button></div>
    <div class="amount"><span>R$</span><input id="tval" inputmode="decimal" placeholder="0,00" autocomplete="off"></div>
    <div class="chips" id="tcats">${chips()}</div>
    <div class="grid2"><div class="field"><label>Data</label><div class="inp"><input id="tdate" type="date" value="${today()}"></div></div>
    <div class="field"><label>Descrição <small>opcional</small></label><div class="inp"><input id="tnote" maxlength="40" placeholder="Ex.: feira"></div></div></div>
    <button class="btn" id="tsave">Salvar</button></div>`, () => {
    setTimeout(() => $('#tval').focus(), 250);
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
      S.tx.push({ id: uid(), type, cat, value: Math.round(v * 100) / 100, date: d, note: $('#tnote').value.trim().slice(0, 40) });
      save(); closeSheet(); curMonth = ym(d); route = 'inicio'; render();
      toast(type === 'in' ? 'Receita lançada 💰' : 'Gasto lançado ✔');
    };
  });
}

/* ---------- ANALISAR ---------- */
let draft = { code: '', price: '', lpa: '', vpa: '', dy: '', roe: '', payout: '', div: '' };
const AF = [
  ['code', 'Código da ação', '', 'Ex.: o código da corretora', 'text'],
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
  return { code: (draft.code || '').toUpperCase().trim(), price: p('price'), lpa: p('lpa'), vpa: p('vpa'), dy: p('dy') / 100, roe: p('roe') / 100, payout: p('payout') / 100, div: p('div') };
}
const complete = a => ['price', 'lpa', 'vpa', 'dy', 'roe', 'payout', 'div'].every(k => isFinite(a[k]));
function resultHTML(a) {
  if (!complete(a)) return `<section class="card tip"><img src="img/analisar.webp" alt=""><div><p class="label">Como funciona</p><p class="small" style="margin-top:4px">Preencha os 7 números acima. Você acha todos de graça no Investidor10, Status Invest ou Fundamentus, pesquisando o código da ação.</p></div></section>`;
  const r = analyze(a);
  const V = { ok: ['Passou com folga', 'Rende mais de 1 p.p. acima da renda fixa + risco.', 'meta'], mid: ['Passou, sem folga', 'Empata com a renda fixa. Se for comprar, entre aos poucos.', 'analisar'], no: ['Não passou', `Passou em ${r.okN} de 4 critérios. Veja abaixo o que falhou.`, 'vazio'] }[r.verdict];
  const pos = Math.max(4, Math.min(96, 50 + (r.folga / 0.10) * 50));
  return `
  <section class="verdict ${r.verdict}"><img src="img/${V[2]}.webp" alt=""><div><p class="label">${esc(a.code || 'Resultado')}</p><b>${V[0]}</b><p class="small" style="margin-top:4px">${V[1]}</p></div></section>
  <section class="card">
    <div class="row between"><p class="label">Retorno estimado</p><span class="chip ${r.folga >= 0 ? 'g' : 'r'}">${r.folga >= 0 ? '+' : ''}${pct(r.folga)} vs régua</span></div>
    <p class="big num ${r.ret > r.regua ? 'g' : 'r'}" style="margin-top:4px">${pct(r.ret)}<span class="small muted" style="font-family:var(--body);font-weight:600"> ao ano</span></p>
    <div class="gauge"><u></u><i style="left:${pos}%"></i></div>
    <div class="row between tiny dim"><span>abaixo</span><span>régua ${pct(r.regua)}</span><span>acima</span></div>
    <p class="tiny muted" style="margin-top:8px">Dividend yield ${pct(a.dy)} + crescimento sustentável ${pct(r.cres)} (ROE × parte do lucro que fica na empresa).</p>
  </section>
  <section class="card"><h3>Os 4 critérios</h3><div style="margin-top:6px">${r.c.map(c => `<div class="crit"><span class="dot ${c.ok ? 'ok' : 'no'}">${c.ok ? '✓' : '✕'}</span><div class="t"><b class="small">${c.n}</b><p class="tiny muted">${c.d}</p></div><span class="v num ${c.ok ? 'g' : 'r'}">${c.v}</span></div>`).join('')}</div></section>
  <div class="metrics">
    <div class="mini"><p class="tiny muted">P/L</p><p class="v num">${x(r.pl)}</p></div>
    <div class="mini"><p class="tiny muted">P/VP</p><p class="v num">${x(r.pvp, 2)}</p></div>
    <div class="mini"><p class="tiny muted">Preço justo (Graham)</p><p class="v num">${brl(r.graham)}</p></div>
    <div class="mini"><p class="tiny muted">Margem de segurança</p><p class="v num ${r.margem >= 0 ? 'g' : 'r'}">${pct(r.margem)}</p></div>
  </div>
  <button class="btn" id="asave">Salvar na minha lista</button>`;
}
function viewAnalisar() {
  const a = draftNum();
  const saved = S.analyses.map(s => ({ ...s, r: analyze(s) })).sort((p, q) => (q.r.okN === 4) - (p.r.okN === 4) || q.r.ret - p.r.ret);
  let rank = 0;
  return `
  <div><p class="brand">★ Analisar ação</p><h1 style="margin-top:6px">Essa ação passa no filtro?</h1></div>
  <section class="card"><div class="grid2">${AF.map(([k, l, suf, h, t]) => `
    <div class="field" style="${k === 'code' ? 'grid-column:1/-1' : ''}"><label>${l}</label><div class="inp ${suf === 'R$' ? 'has-pre' : ''}">${suf === 'R$' ? '<span class="pre">R$</span>' : ''}
    <input data-a="${k}" ${t === 'text' ? 'autocapitalize="characters" maxlength="8"' : 'inputmode="decimal"'} placeholder="${h}" value="${esc(draft[k])}">${suf && suf !== 'R$' ? `<span class="suf">${suf}</span>` : ''}</div></div>`).join('')}</div>
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn ghost sm" id="aclear">Limpar</button><button class="btn ghost sm" id="aex">Ver exemplo</button></div>
  </section>
  <div id="ares" class="stack">${resultHTML(a)}</div>
  <section class="card"><div class="row between"><h3>Minha lista</h3><span class="small muted">${saved.length} ${saved.length === 1 ? 'ação' : 'ações'}</span></div>
    ${saved.length ? `<div class="list" style="margin-top:6px">${saved.map(s => { const ok = s.r.okN === 4; if (ok) rank++; return `
      <div class="item" data-load="${s.id}"><div class="rank ${ok && rank === 1 ? 'first' : ''}">${ok ? rank + 'º' : '–'}</div><div class="t"><b>${esc(s.code)}</b><span class="tiny ${ok ? 'g' : 'r'}">${ok ? 'Passou' : 'Não passou'} · ${s.r.okN}/4</span></div><div class="v num ${s.r.ret > s.r.regua ? 'g' : ''}">${pct(s.r.ret)}<p class="tiny muted">${new Date(s.date).toLocaleDateString('pt-BR')}</p></div><button class="del" data-delan="${s.id}" aria-label="Apagar">${ICON.trash}</button></div>`; }).join('')}</div>`
    : `<p class="small muted" style="margin-top:8px">Salve as ações que você analisar. Elas aparecem aqui em ordem: as que passam no filtro primeiro, da maior para a menor rentabilidade.</p>`}
  </section>
  <p class="disc">Ferramenta educativa. O resultado depende dos dados que você digita e não é recomendação de compra ou venda.</p>`;
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
  <div><p class="brand">★ Minha carteira</p><h1 style="margin-top:6px">${brl(p.cur)}</h1><p class="${p.lucro >= 0 ? 'g' : 'r'} small num" style="margin-top:4px">${p.inv > 0 ? `${p.lucro >= 0 ? '▲' : '▼'} ${brl(p.lucro)} (${pct(p.lucroP)}) desde a compra` : 'Adicione o que você já tem investido'}</p></div>
  <div class="split">
    <div class="mini"><p class="tiny muted">Proventos (12 m)</p><p class="v o num">${brl(p.d12)}</p></div>
    <div class="mini"><p class="tiny muted">Retorno com proventos</p><p class="v num ${p.totalRet >= 0 ? 'g' : 'r'}">${pct(p.totalRet)}</p></div>
  </div>
  ${types.length ? `<section class="card"><p class="label">Divisão da carteira</p><div class="alloc">${types.map(([t, v]) => `<i style="width:${(v / tot * 100).toFixed(2)}%;background:${tipoCor(t)}"></i>`).join('')}</div><div class="legend">${types.map(([t, v]) => `<span><i style="background:${tipoCor(t)}"></i>${esc(t)} ${pct(v / tot, 0)}</span>`).join('')}</div></section>` : ''}
  <div class="tabs2"><button data-ct="ativos" class="${cartTab === 'ativos' ? 'on' : ''}">Investimentos</button><button data-ct="proventos" class="${cartTab === 'proventos' ? 'on' : ''}">Proventos</button><button data-ct="aporte" class="${cartTab === 'aporte' ? 'on' : ''}">Aportar</button></div>
  ${cartTab === 'ativos' ? `
  <section class="card"><div class="row between"><h3>Investimentos</h3><button class="chip o" id="addasset">+ Adicionar</button></div>
    ${S.assets.length ? `<div class="list" style="margin-top:6px">${S.assets.slice().sort((a, b) => b.qty * b.price - a.qty * a.price).map(a => { const v = a.qty * a.price, l = a.qty * (a.price - a.pm), lp = a.pm > 0 ? a.price / a.pm - 1 : NaN; return `
      <div class="item" data-editasset="${a.id}"><div class="ico" style="background:${tipoCor(a.type)}22;color:${tipoCor(a.type)};font-weight:800;font-size:12px">${sig(a.type)}</div><div class="t"><b>${esc(a.code)}</b><span class="tiny muted">${nf(a.qty, 4)} × ${brl(a.price)} · ${tot ? pct(v / tot, 0) : ''}</span></div><div class="v num">${brl(v, 0)}<p class="tiny ${l >= 0 ? 'g' : 'r'}">${l >= 0 ? '+' : ''}${pct(lp)}</p></div></div>`; }).join('')}</div>`
    : `<div class="empty"><img src="img/carteira.webp" alt=""><p class="muted small">Cadastre ações, FIIs, Tesouro, CDB... Toque em <b class="o">+ Adicionar</b>.</p></div>`}
    <p class="tiny dim" style="margin-top:10px">Toque num investimento para atualizar o preço ou a quantidade.</p></section>` : ''}
  ${cartTab === 'proventos' ? `
  <section class="card"><div class="row between"><h3>Proventos por mês</h3><button class="chip o" id="adddiv">+ Lançar</button></div>
    <div class="cols">${dm.map((v, i) => `<div><i style="height:${(v / maxd * 86).toFixed(1)}px" title="${brl(v)}"></i><span>${MES3[+months[i].slice(5) - 1]}</span></div>`).join('')}</div>
    <div class="split" style="margin-top:14px"><div class="mini"><p class="tiny muted">Média por mês</p><p class="v o num">${brl(p.dMes)}</p></div><div class="mini"><p class="tiny muted">Total recebido</p><p class="v num">${brl(p.dTot)}</p></div></div>
  </section>
  <section class="card"><h3>Últimos proventos</h3>${S.divs.length ? `<div class="list" style="margin-top:6px">${S.divs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 40).map(d => `
    <div class="item"><div class="ico">🪙</div><div class="t"><b>${esc(d.code)}</b><span class="tiny muted">${esc(d.kind)} · ${d.date.split('-').reverse().join('/')}</span></div><div class="v g num">+ ${brl(d.value)}</div><button class="del" data-deldiv="${d.id}" aria-label="Apagar">${ICON.trash}</button></div>`).join('')}</div>` : '<p class="small muted" style="margin-top:8px">Lance cada dividendo, JCP ou rendimento de FII que cair na conta. É assim que você vê a renda passiva crescer.</p>'}</section>` : ''}
  ${cartTab === 'aporte' ? `
  <section class="card"><h3>Onde colocar o próximo aporte</h3><p class="small muted" style="margin-top:4px">Defina o peso que você quer para cada investimento (toque nele e preencha "Meta na carteira"). Aqui aparece quanto falta em cada um.</p>
    <div class="field" style="margin-top:12px"><label>Quanto vai investir agora</label><div class="inp has-pre"><span class="pre">R$</span><input id="aporte" inputmode="decimal" placeholder="${nf(Math.max(0, Math.round(avgSobra())), 0) || '500'}"></div></div>
    <div id="aporteres" style="margin-top:10px"></div>
    ${tsum && Math.abs(tsum - 1) > 0.005 ? `<p class="tiny o" style="margin-top:8px">A soma das metas está em ${pct(tsum, 0)}. O ideal é 100%.</p>` : ''}
  </section>` : ''}
  <p class="disc">Os preços não atualizam sozinhos: toque no investimento para colocar a cotação do dia.</p>`;
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
    $('#asv').onclick = () => {
      const code = $('#acode').value.trim(), qty = num($('#aqty').value), pm = num($('#apm').value);
      let pr = num($('#apr').value); const tg = num($('#atg').value);
      if (!code || !(qty > 0) || !(pm > 0)) { toast('Preencha código, quantidade e preço médio'); return; }
      if (!(pr > 0)) pr = pm;
      const obj = { id: a.id || uid(), code: code.toUpperCase().length <= 7 ? code.toUpperCase() : code, type: ty, qty, pm, price: pr, target: isFinite(tg) ? tg / 100 : 0 };
      if (a.id) S.assets[S.assets.findIndex(k => k.id === a.id)] = obj; else S.assets.push(obj);
      save(); closeSheet(); render(); toast('Carteira atualizada ✔');
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
  return `
  <div><p class="brand">★ Meta de liberdade</p><h1 style="margin-top:6px">Quando você vai viver de renda?</h1></div>
  <section class="card gold"><div class="row" style="gap:16px;padding-right:72px;position:relative;z-index:1"><div class="ring" style="--p:${(prog * 100).toFixed(1)}"><div>${Math.round(prog * 100)}%</div></div>
    <div><p class="label">Você vai chegar lá em</p><p class="big" style="font-size:30px">${prog >= 1 ? 'Já chegou! 🎉' : isFinite(anos) ? (anos < 1 ? Math.ceil(n) + ' meses' : anos.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' anos') : '—'}</p><p class="small muted">${quando && prog < 1 ? 'por volta de ' + MESES[quando.getMonth()] + ' de ' + quando.getFullYear() : pmt <= 0 && prog < 1 ? 'aumente o aporte mensal para calcular' : ''}</p></div></div>
    <img class="mascot" src="img/meta.webp" alt="" style="width:96px;opacity:.95">
  </section>
  <section class="card stack">
    <div class="field"><label>Quero receber por mês</label><div class="inp has-pre"><span class="pre">R$</span><input data-s="meta" data-m="1" inputmode="decimal" value="${nf(st.meta)}"></div></div>
    <div class="grid2">
      <div class="field"><label>Rendimento/ano</label><div class="inp"><input data-s="yieldMeta" data-m="100" inputmode="decimal" value="${nf(st.yieldMeta * 100, 2)}"><span class="suf">%</span></div></div>
      <div class="field"><label>Aporte por mês</label><div class="inp has-pre"><span class="pre">R$</span><input data-s="aporte" data-m="1" inputmode="decimal" value="${nf(pmt, 0)}"></div></div>
    </div>
    <div class="split"><div class="mini"><p class="tiny muted">Patrimônio necessário</p><p class="v num">${brl(need, 0)}</p></div><div class="mini"><p class="tiny muted">Você já tem</p><p class="v num o">${brl(p.cur, 0)}</p></div></div>
    <p class="tiny dim">O aporte começa com a média do que sobrou nos seus últimos meses. É uma estimativa com juros compostos, não uma promessa.</p>
  </section>
  <section class="card stack"><h3>Premissas da análise de ações</h3>
    <div class="grid2">
      <div class="field"><label>Selic atual</label><div class="inp"><input data-s="selic" data-m="100" inputmode="decimal" value="${nf(st.selic * 100, 2)}"><span class="suf">%</span></div></div>
      <div class="field"><label>Prêmio de risco</label><div class="inp"><input data-s="premio" data-m="100" inputmode="decimal" value="${nf(st.premio * 100, 2)}"><span class="suf">%</span></div></div>
      <div class="field"><label>ROE mínimo</label><div class="inp"><input data-s="roeMin" data-m="100" inputmode="decimal" value="${nf(st.roeMin * 100, 1)}"><span class="suf">%</span></div></div>
      <div class="field"><label>P/L máximo</label><div class="inp"><input data-s="plMax" data-m="1" inputmode="decimal" value="${nf(st.plMax, 1)}"></div></div>
      <div class="field"><label>Dívida/EBITDA máx.</label><div class="inp"><input data-s="dividaMax" data-m="1" inputmode="decimal" value="${nf(st.dividaMax, 1)}"><span class="suf">x</span></div></div>
      <div class="field"><label>Teto de crescimento</label><div class="inp"><input data-s="cresMax" data-m="100" inputmode="decimal" value="${nf(st.cresMax * 100, 1)}"><span class="suf">%</span></div></div>
    </div>
    <p class="tiny dim">Atualize a Selic sempre que o Copom mudar a taxa (site do Banco Central).</p>
  </section>
  <section class="card stack"><h3>Seus dados</h3>
    <p class="small muted">Tudo fica salvo neste celular, mesmo sem internet. Para trocar de aparelho ou não perder nada, faça um backup de vez em quando.</p>
    ${memOnly ? '<p class="small r">Atenção: este navegador está bloqueando o salvamento (modo anônimo?). Abra o app numa aba normal.</p>' : ''}
    <div class="grid2"><button class="btn ghost sm" id="bexp">Fazer backup</button><button class="btn ghost sm" id="bimp">Restaurar backup</button></div>
    <input type="file" id="bfile" accept="application/json,.json" hidden>
    <div class="field"><label>Seu nome</label><div class="inp"><input id="sname" maxlength="24" value="${esc(S.name)}"></div></div>
    <button class="btn danger sm" id="breset">Apagar todos os dados</button>
  </section>
  <section class="card tip" id="install"><img src="img/icon.webp" alt="" style="width:56px;border-radius:16px"><div><p class="label">Instale na tela inicial</p><p class="small" style="margin-top:4px" id="insttxt">${installText()}</p>${deferredPrompt ? '<button class="btn sm" id="binst" style="margin-top:10px">Instalar agora</button>' : ''}</div></section>
  <p class="disc">Carteira Inteligente · Eu Futuro Rico · @eu.futuro.rico<br>Ferramenta educativa. Não é recomendação de investimento.</p>`;
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
  on('addtx', openTx); on('addasset', () => openAsset()); on('adddiv', openDiv);
  document.querySelectorAll('[data-deltx]').forEach(b => b.onclick = e => { e.stopPropagation(); S.tx = S.tx.filter(t => t.id !== b.dataset.deltx); save(); render(); toast('Lançamento apagado'); });
  document.querySelectorAll('[data-deldiv]').forEach(b => b.onclick = e => { e.stopPropagation(); S.divs = S.divs.filter(t => t.id !== b.dataset.deldiv); save(); render(); });
  document.querySelectorAll('[data-delan]').forEach(b => b.onclick = e => { e.stopPropagation(); S.analyses = S.analyses.filter(t => t.id !== b.dataset.delan); save(); render(); });
  document.querySelectorAll('[data-editasset]').forEach(b => b.onclick = () => openAsset(b.dataset.editasset));
  document.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { cartTab = b.dataset.ct; render(); });
  const ap = $('#aporte'); if (ap) { const f = () => { const v = num(ap.value) || num(ap.placeholder) || 0; $('#aporteres').innerHTML = aporteCalc(v); }; ap.oninput = f; f(); }
  // analisar
  document.querySelectorAll('[data-a]').forEach(inp => inp.oninput = () => { draft[inp.dataset.a] = inp.value; $('#ares').innerHTML = resultHTML(draftNum()); bindAsave(); });
  bindAsave();
  on('aclear', () => { draft = { code: '', price: '', lpa: '', vpa: '', dy: '', roe: '', payout: '', div: '' }; render(); });
  on('aex', () => { draft = { code: 'EXEM3', price: '32,50', lpa: '4,10', vpa: '21,00', dy: '9', roe: '19', payout: '55', div: '1,4' }; render(); toast('Exemplo fictício carregado'); });
  document.querySelectorAll('[data-load]').forEach(el => el.onclick = () => { const s = S.analyses.find(k => k.id === el.dataset.load); if (!s) return; draft = { code: s.code, price: nf(s.price), lpa: nf(s.lpa), vpa: nf(s.vpa), dy: nf(s.dy * 100), roe: nf(s.roe * 100), payout: nf(s.payout * 100), div: nf(s.div) }; render(); });
  // ajustes
  document.querySelectorAll('[data-s]').forEach(inp => inp.onchange = () => { const v = num(inp.value); if (!isFinite(v)) return; S.settings[inp.dataset.s] = v / Number(inp.dataset.m); save(); render(); });
  const sn = $('#sname'); if (sn) sn.onchange = () => { S.name = sn.value.trim().slice(0, 24); save(); toast('Nome salvo'); };
  on('bexp', () => { const b = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'backup-carteira-inteligente-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); toast('Backup baixado ✔'); });
  on('bimp', () => $('#bfile').click());
  const bf = $('#bfile'); if (bf) bf.onchange = async () => { try { const d = JSON.parse(await bf.files[0].text()); if (!Array.isArray(d.tx)) throw 0; S = { ...structuredClone(DEF), ...d, settings: { ...DEF.settings, ...(d.settings || {}) } }; save(); render(); toast('Backup restaurado ✔'); } catch (e) { toast('Arquivo de backup inválido'); } };
  on('breset', () => { if (confirm('Apagar TODOS os seus dados deste aparelho? Isso não pode ser desfeito.')) { const n = S.name; S = structuredClone(DEF); S.onboarded = true; S.name = n; save(); render(); toast('Dados apagados'); } });
  on('binst', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; render(); });
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
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
