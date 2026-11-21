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
  if (S.onboarded && authed()) render();
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
function toast(t, undo) {
  const el = $('#toast'); el.innerHTML = ''; const sp = document.createElement('span'); sp.textContent = t; el.appendChild(sp);
  if (undo) { const b = document.createElement('button'); b.textContent = 'Desfazer'; b.onclick = () => { el.hidden = true; undo(); }; el.appendChild(b); }
  el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, undo ? 5000 : 2200);
}
function delWithUndo(key, id, msg) {
  const arr = S[key], i = arr.findIndex(k => k.id === id); if (i < 0) return;
  const [item] = arr.splice(i, 1); save(); render();
  toast(msg, () => { S[key].splice(Math.min(i, S[key].length), 0, item); save(); render(); });
}
const ICON = {
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="m15 5-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/></svg>'
};

/* ---------- ícones de linha (substituem emojis na interface) ---------- */
const EI = {
  casa: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  carrinho: '<path d="M3 4h2.5l2.2 11h10.6l1.9-8H7"/><circle cx="9.5" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>',
  luz: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  carro: '<path d="M5 16.5H3.5v-4L6 8h9.5l4 4.5h1v4H19"/><path d="M9 16.5h6M6.5 12.5h12"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17" cy="16.5" r="1.8"/>',
  saude: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/><path d="M8 12h2.2l1.3-2 1.6 4 1.2-2H16"/>',
  livro: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20"/>',
  festa: '<path d="M4 20l4.5-12 7.5 7.5z"/><path d="M14 4.5c0 1.5 1 2 2.5 2M19 9c-1.5 0-2.5 1-2.5 2.5M13 9.5l6-6"/>',
  prato: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 3c-1.7 0-3 2.2-3 5v5h3v8"/>',
  tv: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M8 21h8M9 3l3 3 3-3"/>',
  cartao: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h3"/>',
  sacola: '<path d="M5 8h14l-1 13H6z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/>',
  caixa: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9"/>',
  maleta: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M3 12.5h18"/>',
  foguete: '<path d="M12 15.5 8.5 12C10 7 13.5 3.5 20.5 3.5 20.5 10.5 17 14 12 15.5z"/><path d="M8.5 12 5 11.5l2.5-3.5 3 .3M12 15.5l.5 3.5 3.5-2.5-.3-3"/><path d="M6 16.5c-1.2.6-2 2-2 3.5 1.5 0 2.9-.8 3.5-2"/>',
  presente: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11"/><path d="M12 9C10 5 6.5 5.5 7.5 7.5 8 8.5 12 9 12 9zM12 9c2-4 5.5-3.5 4.5-1.5C16 8.5 12 9 12 9z"/>',
  etiqueta: '<path d="M3.5 12.5V4h8.5l8.5 8.5-8.5 8.5z"/><circle cx="8" cy="8.5" r="1.3"/>',
  moeda: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.2-.6-2.6-1.6M12 6.5V8M12 16v1.5"/>',
  caneta: '<path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z"/><path d="M13.5 7l3 3"/>',
  chama: '<path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 1.6 1.2 2.5 2.2 2.7C11 8.5 11 5.5 12 3z"/>',
  raio: '<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z"/>',
  coroa: '<path d="M4 17.5 3 7.5l5 4 4-6.5 4 6.5 5-4-1 10z"/><path d="M5 20.5h14"/>',
  capelo: '<path d="M2.5 9.5 12 5l9.5 4.5L12 14z"/><path d="M6.5 11.5v4c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4M21.5 9.5V15"/>',
  cerebro: '<path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5.2A3 3 0 0 0 6 18a3 3 0 0 0 6 .5V5.5a2.5 2.5 0 0 0-3-1z"/><path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5.2A3 3 0 0 1 18 18a3 3 0 0 1-6 .5"/>',
  lupa: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  barras: '<path d="M4 20h16M7 16v-4M12 16V7M17 16v-7"/>',
  escudo: '<path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
  estrela: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.8z"/>',
  coracao: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  trofeu: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4.5c0 3 1.5 4.5 3.7 4.8M16 6h3.5c0 3-1.5 4.5-3.7 4.8M12 13v4M8.5 20.5h7l-.8-3.5H9.3z"/>',
  alvo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  sobe: '<path d="M4 18l6-6 3.5 3.5L20 9"/><path d="M15 9h5v5"/>',
  tesoura: '<circle cx="6.5" cy="7" r="2.5"/><circle cx="6.5" cy="17" r="2.5"/><path d="M8.6 8.4 20 17M8.6 15.6 20 7"/>',
  regua: '<path d="M3.5 16.5 16.5 3.5l4 4-13 13z"/><path d="m8 12 2 2M11 9l1.5 1.5M14 6l2 2"/>',
  broto: '<path d="M12 21v-9"/><path d="M12 12c0-4 2.5-6.5 7-6.5 0 4.5-2.5 6.5-7 6.5zM12 14.5c0-3-2-5-5.5-5 0 3.3 2 5 5.5 5z"/>',
  dinheiro: '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  banco: '<path d="M3 9.5 12 4l9 5.5z"/><path d="M5 10v7M9.5 10v7M14.5 10v7M19 10v7M3.5 20h17"/>',
  tijolos: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M3.5 14.5h17M10 4.5v5M14 9.5v5M10 14.5v5"/>',
  compasso: '<circle cx="12" cy="5" r="1.7"/><path d="M11 6.5 6 20M13 6.5 18 20M8 15h8"/>',
  pizza: '<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z"/><path d="M15 3.8A8.5 8.5 0 0 1 20.2 9H15z"/>',
  engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  disco: '<path d="M5 3.5h11.5l3 3V20a.5.5 0 0 1-.5.5H5a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5z"/><path d="M8 3.5v5h7v-5M7.5 20.5v-6h9v6"/>',
  celular: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M12 8v6M9.5 11.5 12 14l2.5-2.5M10.5 18.5h3"/>',
  palmas: '<path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12M11 11V5a1.5 1.5 0 0 1 3 0v6M14 11V6.5a1.5 1.5 0 0 1 3 0v6.5c0 4-2.5 7-6 7-2.5 0-4-1.3-5.5-3.5L3.8 13.6a1.5 1.5 0 0 1 2.4-1.8L8 14"/>'
};
const EMO = { '🏠': 'casa', '🛒': 'carrinho', '💡': 'luz', '🚗': 'carro', '💊': 'saude', '📚': 'livro', '🎉': 'festa', '🍔': 'prato', '📺': 'tv', '💳': 'cartao', '🛍': 'sacola', '📦': 'caixa', '💼': 'maleta', '🚀': 'foguete', '🎁': 'presente', '🏷': 'etiqueta', '💰': 'moeda', '🪙': 'moeda', '✍': 'caneta', '🔥': 'chama', '⚡': 'raio', '👑': 'coroa', '🎓': 'capelo', '🧠': 'cerebro', '🔍': 'lupa', '📊': 'barras', '🛡': 'escudo', '⭐': 'estrela', '💚': 'coracao', '🏆': 'trofeu', '🎯': 'alvo', '📈': 'sobe', '✂': 'tesoura', '📏': 'regua', '🌱': 'broto', '💸': 'dinheiro', '🏦': 'banco', '🧱': 'tijolos', '📐': 'compasso', '🍰': 'pizza', '⚙': 'engrenagem', '💾': 'disco', '📲': 'celular', '👏': 'palmas' };
const EMO_RE = new RegExp('(' + Object.keys(EMO).join('|') + ')\\uFE0F?', 'gu');
const eico = n => `<svg class="ei" viewBox="0 0 24 24" aria-hidden="true">${EI[n]}</svg>`;
const deEmoji = h => String(h).replace(EMO_RE, (m, e) => eico(EMO[e]));

/* ---------- categorias ---------- */
const CAT_OUT = [['Moradia', '🏠'], ['Mercado', '🛒'], ['Contas', '💡'], ['Transporte', '🚗'], ['Saúde', '💊'], ['Educação', '📚'], ['Lazer', '🎉'], ['Restaurante', '🍔'], ['Assinaturas', '📺'], ['Cartão/dívidas', '💳'], ['Compras', '🛍️'], ['Outros', '📦']];
const CAT_IN = [['Salário', '💼'], ['Renda extra', '🚀'], ['13º/bônus', '🎁'], ['Vendas', '🏷️'], ['Outros', '💰']];
const catIcon = (t, c) => ((t === 'in' ? CAT_IN : CAT_OUT).find(k => k[0] === c) || [0, '💰'])[1];
const TIPOS = [['Ação', '#5B7CFF'], ['FII', '#22D68A'], ['Renda fixa', '#F5C13D'], ['Tesouro', '#FFB86B'], ['Exterior', '#A77BFF'], ['Cripto', '#FF4D6D'], ['Outro', '#9AA3C7']];
const tipoCor = t => (TIPOS.find(k => k[0] === t) || TIPOS[6])[1];
const SIG = { 'Ação': 'AÇ', 'FII': 'FII', 'Renda fixa': 'RF', 'Tesouro': 'TD', 'Exterior': 'EXT', 'Cripto': 'CRIP', 'Outro': '•' };
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
    { k: 'roe', n: 'ROE de pelo menos ' + pct(st.roeMin, 0), d: 'Lucro alto sobre o próprio capital', ok: a.roe >= st.roeMin, v: pct(a.roe) },
    a.fin ? { k: 'div', n: 'Dívida: não se aplica', d: 'Bancos e seguradoras não usam EBITDA', ok: true, v: 'n/a' }
      : a.nodiv ? { k: 'div', n: 'Dívida: EBITDA negativo', d: 'A empresa não gerou caixa operacional para medir a dívida', ok: false, v: 'n/d' }
      : { k: 'div', n: 'Dívida até ' + x(st.dividaMax) + ' o EBITDA', d: 'A dívida cabe no caixa que ela gera', ok: a.div <= st.dividaMax, v: x(a.div) },
    { k: 'pl', n: 'P/L entre 0 e ' + nf(st.plMax, 0), d: 'Não está caro por real de lucro', ok: isFinite(pl) && pl > 0 && pl <= st.plMax, v: x(pl) },
    { k: 'ret', n: 'Retorno acima de ' + pct(regua), d: 'Rende mais que Selic + risco da bolsa', ok: ret > regua, v: pct(ret) }
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

/* ---------- JOGO: ofensiva, missões, lição, níveis, conquistas ---------- */
const LEVELS = [[0, 'Aprendiz'], [100, 'Poupador'], [300, 'Organizado'], [600, 'Investidor'], [1000, 'Estrategista'], [1600, 'Rentista'], [2500, 'Futuro Rico'], [4000, 'Lenda']];
const LESSONS = [
  ['R$ 100 por mês a 1% ao mês, por 30 anos, viram mais de R$ 340 mil.', true, 'Verdade: dá cerca de R$ 349 mil, e só R$ 36 mil saíram do seu bolso. O resto são juros sobre juros.'],
  ['Com a Selic em 13,75%, a poupança rende mais que um CDB de 100% do CDI.', false, 'Falso: a poupança rende 0,5% ao mês + TR quando a Selic passa de 8,5%. O CDB 100% do CDI rende bem mais, mesmo depois do IR.'],
  ['O FGC garante até R$ 250 mil por CPF em cada instituição.', true, 'Verdade: vale para CDB, LCI, LCA, poupança e conta corrente, com teto de R$ 1 milhão a cada 4 anos.'],
  ['A reserva de emergência ideal fica entre 3 e 6 meses do seu custo de vida.', true, 'Verdade: e ela deve estar num lugar seguro e com liquidez diária, como Tesouro Selic ou CDB de liquidez diária.'],
  ['P/L 5 quer dizer que, mantido o lucro, a empresa "se paga" em 5 anos.', true, 'Verdade: P/L é o preço dividido pelo lucro por ação. Quanto menor, mais barato, mas sempre olhe a qualidade do lucro.'],
  ['ROE mostra quanto a empresa lucra sobre o próprio patrimônio.', true, 'Verdade: ROE de 20% = R$ 20 de lucro por ano para cada R$ 100 de patrimônio. Acima de 15% costuma ser muito bom.'],
  ['Pagar só o mínimo da fatura é um jeito inteligente de economizar.', false, 'Falso: o resto vai para o rotativo, que passa de 400% ao ano. É a dívida mais cara do país.'],
  ['Diversificar é colocar todo o dinheiro no melhor ativo que você encontrar.', false, 'Falso: diversificar é dividir entre ativos diferentes para um erro não derrubar tudo.'],
  ['O IPCA é o índice oficial de inflação do Brasil.', true, 'Verdade: é medido pelo IBGE e serve de meta para o Banco Central.'],
  ['Vender até R$ 20 mil por mês em ações no mercado à vista é isento de IR sobre o lucro.', true, 'Verdade: vale para operações comuns. Day trade e FIIs não têm essa isenção.'],
  ['Day trade também tem isenção de R$ 20 mil por mês.', false, 'Falso: day trade paga 20% sobre o lucro, sem isenção.'],
  ['Na renda fixa, quanto mais tempo você deixa o dinheiro, menor o IR.', true, 'Verdade: a tabela regressiva vai de 22,5% (até 6 meses) até 15% (acima de 2 anos).'],
  ['Payout de 100% quer dizer que a empresa distribuiu todo o lucro.', true, 'Verdade: e aí sobra pouco para ela crescer. Payout muito alto por muito tempo pode não se sustentar.'],
  ['Dívida líquida/EBITDA alta significa empresa pouco endividada.', false, 'Falso: quanto maior, mais anos de geração de caixa a empresa precisaria para pagar a dívida.'],
  ['A regra dos 72 estima em quantos anos o dinheiro dobra.', true, 'Verdade: divida 72 pela taxa anual. A 12% ao ano, dobra em uns 6 anos.'],
  ['FIIs costumam pagar rendimentos todo mês.', true, 'Verdade: a maioria dos fundos imobiliários distribui rendimentos mensais.'],
  ['O preço justo de Graham usa o lucro por ação e o valor patrimonial por ação.', true, 'Verdade: √(22,5 × LPA × VPA). Preço abaixo dele = margem de segurança.'],
  ['R$ 15 por dia em pequenos gastos não fazem diferença no ano.', false, 'Falso: são R$ 5.475 por ano. Investidos, viram muito mais.'],
  ['Investir o mesmo valor todo mês ajuda a comprar mais quando o preço cai.', true, 'Verdade: é o preço médio. Você compra mais cotas nos meses de queda.'],
  ['Uma ação que caiu muito é sempre uma pechincha.', false, 'Falso: às vezes ela caiu porque o negócio piorou. Olhe lucro, dívida e ROE antes.'],
  ['Taxa de administração alta reduz o que sobra para você num fundo.', true, 'Verdade: ela é cobrada todo ano, ganhando o fundo ou não.'],
  ['Cheque especial é um crédito barato para emergências.', false, 'Falso: é uma das linhas mais caras do mercado. Reserva de emergência evita usá-lo.'],
  ['O 13º é uma boa hora para quitar dívidas caras.', true, 'Verdade: quitar um cartão a 15% ao mês "rende" mais que qualquer investimento.'],
  ['Rentabilidade passada garante rentabilidade futura.', false, 'Falso: o passado ajuda a entender, mas não garante nada.'],
  ['Tesouro Selic é uma boa opção para a reserva de emergência.', true, 'Verdade: segue a Selic, tem liquidez diária e garantia do Tesouro Nacional.'],
  ['Inflação alta faz o dinheiro parado perder poder de compra.', true, 'Verdade: com 5% de inflação, R$ 1.000 parados compram uns R$ 950 em um ano.'],
  ['Dividend yield é quanto a ação pagou de proventos dividido pelo preço.', true, 'Verdade: DY de 8% = R$ 8 por ano para cada R$ 100 investidos.'],
  ['Margem de segurança é comprar abaixo do valor que você estima para a empresa.', true, 'Verdade: é a folga que protege você se a sua conta estiver errada.']
];
const BADGES = [
  ['first_tx', '✍️', 'Primeiro passo', 'Fez o primeiro lançamento'],
  ['streak3', '🔥', 'Pegando fogo', '3 dias seguidos'],
  ['streak7', '⚡', 'Semana perfeita', '7 dias seguidos'],
  ['streak30', '👑', 'Imparável', '30 dias seguidos'],
  ['lesson5', '🎓', 'Estudioso', '5 lições respondidas'],
  ['lesson20', '🧠', 'Mestre do dinheiro', '20 lições respondidas'],
  ['analyst', '🔍', 'Analista', 'Analisou a primeira ação'],
  ['analyst10', '📊', 'Caçador de ações', '10 ações na lista'],
  ['investor', '💼', 'Investidor', 'Cadastrou o primeiro investimento'],
  ['dividend', '🪙', 'Renda passiva', 'Recebeu o primeiro provento'],
  ['green', '💚', 'Mês no azul', 'Sobrou dinheiro no mês'],
  ['save20', '🏆', 'Poupador de elite', 'Poupou 20% ou mais no mês'],
  ['meta10', '🚀', 'Decolando', '10% da meta de liberdade'],
  ['backup', '🛡️', 'Precavido', 'Fez o primeiro backup']
];
const MISSIONS = {
  lancar: ['✍️', 'Lance o que gastou ou recebeu hoje', 20],
  licao: ['🎓', 'Responda a lição do dia', 15],
  analisar: ['🔍', 'Analise uma ação', 15],
  carteira: ['💼', 'Atualize sua carteira ou lance um provento', 15],
  destaque: ['⭐', 'Veja o destaque do filtro de hoje', 10]
};
function G() { if (!S.game) S.game = { xp: 0, days: {}, badges: {}, lessons: 0 }; return S.game; }
const hashDay = d => d.split('-').reduce((a, n) => a * 31 + Number(n), 7);
function todayMissions() { const r = ['analisar', 'carteira', 'destaque'][hashDay(today()) % 3]; return ['lancar', 'licao', r]; }
function dayRec(d = today()) { const g = G(); return g.days[d] || (g.days[d] = { done: {} }); }
function level(xp) { let i = 0; while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++; const next = LEVELS[i + 1]; return { n: i + 1, name: LEVELS[i][1], cur: LEVELS[i][0], next: next ? next[0] : null, nextName: next ? next[1] : null }; }
function streak() {
  const g = G(); let n = 0; const d = new Date();
  if (!(g.days[today()] && g.days[today()].active)) d.setDate(d.getDate() - 1);
  while (true) { const k = iso(d); if (g.days[k] && g.days[k].active) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}
function act(kind) {
  const g = G(), rec = dayRec(), before = level(g.xp).n;
  rec.active = true;
  let msg = '';
  if (todayMissions().includes(kind) && !rec.done[kind]) {
    rec.done[kind] = true; g.xp += MISSIONS[kind][2]; msg = `+${MISSIONS[kind][2]} XP`;
    if (todayMissions().every(k => rec.done[k]) && !rec.bonus) { rec.bonus = true; g.xp += 25; setTimeout(() => { confetti(); toast('Dia completo! +25 XP bônus 🎉'); }, 900); }
  }
  checkBadges();
  const after = level(g.xp);
  if (after.n > before) setTimeout(() => { confetti(); toast(`Subiu para o nível ${after.n}: ${after.name}! 🚀`); }, 1500);
  save();
  return msg;
}
function checkBadges() {
  const g = G(), has = id => g.badges[id], give = id => { if (!has(id)) { g.badges[id] = today(); const b = BADGES.find(k => k[0] === id); setTimeout(() => { confetti(); toast(`Conquista: ${b[1]} ${b[2]}`); }, 600); } };
  const st = streak(), m = monthTotals(ym(today())), p = portfolio();
  const need = S.settings.yieldMeta > 0 ? S.settings.meta * 12 / S.settings.yieldMeta : 0;
  if (S.tx.length) give('first_tx');
  if (st >= 3) give('streak3'); if (st >= 7) give('streak7'); if (st >= 30) give('streak30');
  if (g.lessons >= 5) give('lesson5'); if (g.lessons >= 20) give('lesson20');
  if (S.analyses.length) give('analyst'); if (S.analyses.length >= 10) give('analyst10');
  if (S.assets.length) give('investor'); if (S.divs.length) give('dividend');
  if (m.inc > 0 && m.sobra > 0) give('green'); if (m.inc > 0 && m.taxa >= 0.2) give('save20');
  if (need > 0 && p.cur / need >= 0.1) give('meta10');
}
function confetti() {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
  const W = c.width = innerWidth * devicePixelRatio, H = c.height = innerHeight * devicePixelRatio, x = c.getContext('2d');
  const cols = ['#F5C13D', '#FFDA6B', '#22D68A', '#5B7CFF', '#A77BFF', '#FF4D6D'];
  const ps = Array.from({ length: 140 }, () => ({ x: W / 2, y: H * 0.35, vx: (Math.random() - .5) * 26 * devicePixelRatio, vy: (Math.random() * -18 - 6) * devicePixelRatio, r: (4 + Math.random() * 6) * devicePixelRatio, c: cols[Math.random() * cols.length | 0], a: Math.random() * 6, s: Math.random() * .3 - .15 }));
  let t = 0;
  (function f() {
    x.clearRect(0, 0, W, H); t++;
    for (const p of ps) { p.vy += .55 * devicePixelRatio; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.s; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.c; x.globalAlpha = Math.max(0, 1 - t / 110); x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); x.restore(); }
    if (t < 110) requestAnimationFrame(f); else c.remove();
  })();
  try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate([12, 40, 12]); } catch (e) { }
}
function lessonToday() { return LESSONS[hashDay(today()) % LESSONS.length]; }
function openLesson() {
  const L = lessonToday(), rec = dayRec();
  const ans = rec.lesson;
  openSheet(`<div class="stack lesson"><p class="label">Lição do dia · verdade ou mito?</p><h2 style="font-size:20px">${L[0]}</h2>
    ${ans == null ? `<div class="grid2"><button class="btn ghost" data-ans="1">✓ Verdade</button><button class="btn ghost" data-ans="0">✕ Mito</button></div>`
      : `<div class="card ${ans === L[1] ? 'okc' : 'noc'}"><b>${ans === L[1] ? 'Acertou! 🎉' : 'Quase!'}</b><p class="small" style="margin-top:4px">${L[2]}</p></div><button class="btn" data-close>Fechar</button>`}
  </div>`, () => {
    $('#sheet-body').querySelectorAll('[data-ans]').forEach(b => b.onclick = () => {
      const a = b.dataset.ans === '1'; rec.lesson = a; G().lessons = (G().lessons || 0) + 1;
      if (a === L[1]) { G().xp += 5; confetti(); }
      const m = act('licao'); openLesson(); render(); if (m) toast(m);
    });
    $('#sheet-body').querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheet);
  });
}
function destaque() {
  if (!DATA || !DATA.acoes) return null;
  const cand = Object.entries(DATA.acoes).filter(([, q]) => (q.volume || 0) > 3e7 && q.lpa > 0 && q.roe != null && (q.financeira || q.div_ebitda != null))
    .map(([c, q]) => ({ c, q, r: analyze({ price: q.preco, lpa: q.lpa, vpa: q.vpa, dy: q.dy || 0, roe: q.roe, payout: q.payout || 0, div: q.div_ebitda, fin: q.financeira }) }))
    .filter(k => k.r.okN === 4).sort((a, b) => a.c.localeCompare(b.c));
  if (!cand.length) return null;
  return cand[hashDay(today()) % cand.length];
}
function weekDots() {
  const g = G(), d = new Date(), out = [];
  const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow);
  for (let i = 0; i < 7; i++) { const k = iso(d); out.push(`<i class="${g.days[k] && g.days[k].active ? 'on' : ''} ${k === today() ? 'today' : ''}" title="${k}">${'STQQSSD'[i]}</i>`); d.setDate(d.getDate() + 1); }
  return out.join('');
}
let missOpen = false;
function hojeCard() {
  const g = G(), rec = dayRec(), ms = todayMissions(), lv = level(g.xp);
  const doneN = ms.filter(k => rec.done[k]).length, xpLeft = ms.filter(k => !rec.done[k]).reduce((a, k) => a + MISSIONS[k][2], 0);
  const R = 17, C = 2 * Math.PI * R, all = doneN === ms.length;
  return `
  <details class="card today" id="missbox"${missOpen ? ' open' : ''}>
    <summary>
      <span class="mring"><svg viewBox="0 0 44 44"><circle cx="22" cy="22" r="${R}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="5"/><circle cx="22" cy="22" r="${R}" fill="none" stroke="${all ? 'var(--verde)' : 'var(--ouro)'}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C * doneN / ms.length).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 22 22)"/></svg><b>${doneN}/${ms.length}</b></span>
      <span class="tstx"><b>${all ? 'Missões de hoje completas ✓' : 'Missões de hoje'}</b><small>${all ? `Nv ${lv.n} · ${lv.name} · volte amanhã 🔥` : `Ganhe +${xpLeft + (doneN < ms.length ? 25 : 0)} XP · Nv ${lv.n} ${lv.name}`}</small></span>
      <svg class="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div class="mbody">
      <div class="row between"><div class="week">${weekDots()}</div><span class="tiny muted">${g.xp} XP${lv.next ? ` · faltam ${lv.next - g.xp}` : ''}</span></div>
      <div class="bar thin xp"><i style="width:${lv.next ? ((g.xp - lv.cur) / (lv.next - lv.cur) * 100).toFixed(1) : 100}%"></i></div>
      <div class="missions">${ms.map(k => `<button class="mis ${rec.done[k] ? 'done' : ''}" data-mis="${k}"><span class="ck">${rec.done[k] ? '✓' : MISSIONS[k][0]}</span><span class="t">${MISSIONS[k][1]}</span><span class="xp">+${MISSIONS[k][2]}</span></button>`).join('')}</div>
      ${!rec.done.lancar ? '<button class="link" id="nospend">Hoje não gastei nada 👏</button>' : ''}
    </div>
  </details>`;
}
function destaqueCard() {
  const dz = destaque(); if (!dz) return '';
  return `<button class="card star" id="destaque"><span class="sicon">⭐</span><span class="t"><span class="tiny muted">Destaque do filtro hoje</span><b>${dz.c} <span class="small muted">${esc((dz.q.nome || '').split(' ').slice(0, 2).join(' '))}</span></b></span><span class="v g num">${pct(dz.r.ret)}<small>ao ano</small></span><i class="go">›</i></button>`;
}
function streakChip() { const s = streak(); return `<span class="chip ${s ? 'o' : ''} fire" id="streakchip">🔥 ${s}</span>`; }
function badgesHTML() {
  const g = G();
  return `<div class="badges">${BADGES.map(([id, e, n, d]) => `<div class="bdg ${g.badges[id] ? 'on' : ''}" title="${d}"><span>${e}</span><b>${n}</b><small>${g.badges[id] ? dBRs(g.badges[id]) : d}</small></div>`).join('')}</div>`;
}
function dailyHello() {
  const g = G(); if (g.lastOpen === today()) return; const prev = g.lastOpen; g.lastOpen = today(); save();
  if (!prev) return;
  const st = streak();
  setTimeout(() => toast(st ? `🔥 ${st} ${st === 1 ? 'dia' : 'dias'} de ofensiva! Complete as missões de hoje.` : 'Bem-vindo de volta! Comece uma nova ofensiva hoje 🔥'), 700);
}

/* ---------- acesso (login por e-mail da compra) ---------- */
const AUTH = 'efr.sessao';
let SES = null; try { SES = JSON.parse(localStorage.getItem(AUTH) || 'null'); } catch (e) { SES = null; }
function tokOk(t) { try { const p = JSON.parse(atob(String(t).split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))); return p.exp > Date.now(); } catch (e) { return false; } }
const EXIGIR_LOGIN = true;
const authed = () => !EXIGIR_LOGIN || !!(SES && SES.token && tokOk(SES.token));
let lg = { step: 0, email: '', msg: '', busy: false, wait: 0 };
const LGERR = {
  nao_encontrado: 'Não encontramos uma compra com esse e-mail. Use o mesmo e-mail da compra na Kiwify. Comprou agora? Espere 1 minuto e tente de novo.',
  email_invalido: 'Esse e-mail não parece certo. Confira e tente de novo.',
  aguarde: 'Já enviamos um código. Espere alguns segundos para pedir outro.',
  email_nao_configurado: 'O envio de códigos está em manutenção. Tente de novo mais tarde.',
  falha_envio: 'Não conseguimos enviar o e-mail agora. Tente de novo em instantes.',
  expirado: 'Esse código expirou. Peça um novo.',
  muitas_tentativas: 'Muitas tentativas. Peça um novo código.',
  codigo_errado: 'Código incorreto. Confira o e-mail e tente de novo.',
  dados_invalidos: 'Digite os 6 números do código.',
  rede: 'Sem conexão. Verifique a internet e tente de novo.'
};
async function api(path, body, token) {
  try {
    const r = await fetch('/api/' + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body || {}) });
    let d = {}; try { d = await r.json(); } catch (e) { }
    return { status: r.status, ...d };
  } catch (e) { return { status: 0, erro: 'rede' }; }
}
function viewLogin() {
  const e2 = lg.step === 1;
  return `<div class="onb login fade-in">
    <div class="brand">★ Eu Futuro Rico</div>
    <img src="img/${e2 ? 'meta' : 'hero'}.webp" alt="">
    <div class="stack"><h1>${e2 ? 'Confira seu e-mail' : 'Carteira Inteligente'}</h1>
      <p class="muted">${e2 ? `Enviamos um código de 6 números para <b>${esc(lg.email)}</b>. Olhe também a caixa de spam e promoções.` : 'Entre com o mesmo e-mail que você usou na compra.'}</p></div>
    ${e2 ? `<div class="inp code"><input id="lcode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" aria-label="Código"></div>`
      : `<div class="inp"><input id="lemail" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="seu@email.com" value="${esc(lg.email)}" aria-label="E-mail"></div>`}
    ${lg.msg ? `<p class="lmsg small">${lg.msg}</p>` : ''}
    <button class="btn" id="lgo" ${lg.busy ? 'disabled' : ''}>${lg.busy ? 'Aguarde…' : e2 ? 'Entrar' : 'Receber código'}</button>
    ${e2 ? `<div class="row between small"><button class="link" id="lback">Trocar e-mail</button><button class="link" id="lresend" ${lg.wait > 0 ? 'disabled' : ''}>${lg.wait > 0 ? 'Reenviar em ' + lg.wait + 's' : 'Reenviar código'}</button></div>`
      : `<p class="disc">Ainda não tem acesso? <a href="/oferta/?utm_source=app&utm_medium=login">Conheça a Carteira Inteligente</a><br>Precisa de ajuda? <a href="https://instagram.com/eu.futuro.rico" target="_blank" rel="noopener">@eu.futuro.rico</a></p>`}
  </div>`;
}
let lgTimer = null;
function lgCount() {
  clearInterval(lgTimer); lg.wait = 60;
  lgTimer = setInterval(() => { lg.wait--; const b = $('#lresend'); if (b) { b.disabled = lg.wait > 0; b.textContent = lg.wait > 0 ? 'Reenviar em ' + lg.wait + 's' : 'Reenviar código'; } if (lg.wait <= 0) clearInterval(lgTimer); }, 1000);
}
async function pedirCodigo() {
  lg.busy = true; lg.msg = ''; render();
  const r = await api('codigo', { email: lg.email });
  lg.busy = false;
  if (r.ok) { lg.step = 1; lg.msg = ''; lgCount(); }
  else lg.msg = LGERR[r.erro] || 'Algo deu errado. Tente de novo.';
  render(); const c = $('#lcode'); if (c) c.focus();
}
function bindLogin() {
  const em = $('#lemail'), co = $('#lcode');
  const go1 = () => { lg.email = (em.value || '').trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lg.email)) { lg.msg = LGERR.email_invalido; render(); return; } pedirCodigo(); };
  const go2 = async () => {
    const cod = (co.value || '').replace(/\D/g, ''); if (cod.length !== 6) { lg.msg = LGERR.dados_invalidos; render(); return; }
    lg.busy = true; lg.msg = ''; render();
    const r = await api('entrar', { email: lg.email, codigo: cod });
    lg.busy = false;
    if (r.ok && r.token) {
      SES = { token: r.token, email: r.email, nome: r.nome || '' }; try { localStorage.setItem(AUTH, JSON.stringify(SES)); } catch (e) { }
      if (!S.name && r.nome) S.name = String(r.nome).split(' ')[0].slice(0, 24);
      lg = { step: 0, email: '', msg: '', busy: false, wait: 0 }; save(); render(); toast('Acesso liberado! 🎉'); return;
    }
    lg.msg = (LGERR[r.erro] || 'Algo deu errado. Tente de novo.') + (r.erro === 'codigo_errado' && r.restam >= 0 ? ` Restam ${r.restam} tentativa${r.restam === 1 ? '' : 's'}.` : '');
    render();
  };
  if (em) { em.onkeydown = e => { if (e.key === 'Enter') go1(); }; $('#lgo').onclick = go1; }
  if (co) {
    co.oninput = () => { co.value = co.value.replace(/\D/g, '').slice(0, 6); if (co.value.length === 6) go2(); };
    co.onkeydown = e => { if (e.key === 'Enter') go2(); }; $('#lgo').onclick = go2;
    $('#lback').onclick = () => { lg.step = 0; lg.msg = ''; render(); };
    $('#lresend').onclick = () => { if (lg.wait <= 0) pedirCodigo(); };
  }
}
function sair(msg) {
  SES = null; try { localStorage.removeItem(AUTH); } catch (e) { }
  lg = { step: 0, email: '', msg: msg || '', busy: false, wait: 0 }; closeSheet(); render();
}
async function checarSessao() {
  if (!EXIGIR_LOGIN || !authed() || !navigator.onLine) return;
  const r = await api('sessao', {}, SES.token);
  if (r.status === 403) sair('Seu acesso foi encerrado. Se acha que é um engano, fale com @eu.futuro.rico.');
  else if (r.status === 401) sair('Sua sessão expirou. Entre de novo com seu e-mail.');
}

/* ---------- roteamento ---------- */
let route = 'inicio', curMonth = ym(today()), cartTab = 'ativos';
function go(r) { route = r; render(); window.scrollTo({ top: 0 }); history.replaceState(null, '', '#' + r); }
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
$('#fab').addEventListener('click', () => { if (route === 'analisar') { const i = $('[data-a="code"]'); if (i) { window.scrollTo({ top: 0, behavior: 'smooth' }); i.focus(); } } else go('analisar'); });

function render() {
  const app = $('#app');
  if (!authed()) { $('#tabbar').hidden = true; app.innerHTML = viewLogin(); bindLogin(); return; }
  $('#tabbar').hidden = !S.onboarded;
  if (!S.onboarded) { app.innerHTML = viewOnb(); bindOnb(); return; }
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.go === route));
  $('#fab').classList.toggle('on', route === 'analisar');
  const v = { inicio: viewHome, analisar: viewAnalisar, carteira: viewCarteira, mais: viewMais, lancamentos: viewLanc }[route] || viewHome;
  const keep = {}; document.querySelectorAll('#app [id]').forEach(el => { if (el.scrollLeft) keep[el.id] = el.scrollLeft; });
  const anim = render.last !== route; render.last = route;
  app.innerHTML = deEmoji(`<div class="stack${anim ? ' fade-in' : ''}">${v()}</div>`);
  bind();
  for (const id in keep) { const el = document.getElementById(id); if (el) el.scrollLeft = keep[id]; }
}

/* ---------- onboarding ---------- */
let onbStep = 0;
const ONB = [
  { img: 'hero', t: 'Bem-vindo ao seu futuro rico', p: 'Organize o mês, analise ações em instantes e veja sua renda passiva crescer. Tudo no seu celular.' },
  { img: 'lancar', t: 'Lance um gasto em 5 segundos', p: 'Toque em Despesas, digite o valor e pronto. No fim do mês você vê exatamente quanto sobrou para investir.' },
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
  const cats = catsAll.slice(0, 3);
  const pIn = m.inc > 0 ? Math.min(100, m.out / m.inc * 100) : (m.out > 0 ? 100 : 0);
  const mk = DATA && DATA.mercado && DATA.mercado.selic ? DATA.mercado : null;
  return `
  <header class="hdr">
    <div class="hello"><div class="avatar"><img src="img/icon.webp" alt=""><em>${level(G().xp).n}</em></div><div><p class="tiny muted">${greet()}</p><b class="nm">${S.name ? esc(S.name) : 'Futuro rico'}</b></div></div>
    <div class="row" style="gap:6px">${streakChip()}<div class="monthpill"><button id="mprev" aria-label="Mês anterior">${ICON.left}</button><b>${MES3[mm - 1]} ${yy}</b><button id="mnext" aria-label="Próximo mês">${ICON.right}</button></div></div>
  </header>
  <section class="card hero">
    <div class="row between"><p class="label">${m.sobra >= 0 ? 'Sobrou no mês' : 'Gastou além do que ganhou'}</p>${isFinite(m.taxa) ? `<span class="chip ${m.taxa >= 0.1 ? 'g' : m.taxa >= 0 ? 'o' : 'r'}">${m.taxa >= 0 ? 'poupou ' : ''}${pct(m.taxa, 0)}</span>` : ''}</div>
    <p class="big num ${m.sobra < 0 ? 'r' : ''}">${brl(m.sobra)}</p>
    <div class="bar"><i style="width:${pIn}%;background:${pIn >= 100 ? 'var(--vermelho)' : pIn > 85 ? 'var(--ouro)' : 'var(--verde)'}"></i></div>
    <div class="row between small" style="margin-top:8px"><span class="muted">Entrou <b class="g num">${brl(m.inc, 0)}</b></span><span class="muted">Saiu <b class="r num">${brl(m.out, 0)}</b></span></div>
  </section>
  ${hojeCard()}
  <section class="card kpi3">
    <button data-go2="carteira"><span class="tiny muted">Patrimônio</span><b class="num">${brl(p.cur, 0)}</b><span class="tiny ${p.lucro >= 0 ? 'g' : 'r'}">${p.inv > 0 ? (p.lucro >= 0 ? '▲ ' : '▼ ') + pct(p.lucroP) : 'adicionar'}</span></button>
    <button data-go2="carteira"><span class="tiny muted">Renda/mês</span><b class="num o">${brl(p.dMes, 0)}</b><span class="tiny muted">proventos</span></button>
    <button data-go2="mais"><span class="tiny muted">Meta</span><b class="num">${Math.round(prog * 100)}%</b><span class="minibar"><i style="width:${(prog * 100).toFixed(1)}%"></i></span></button>
  </section>
  <section class="card">
    <div class="row between"><h3>Gastos por categoria</h3><button class="link" data-go2="lancamentos">${catsAll.length ? 'ver detalhes' : 'lançar'}</button></div>
    ${catsAll.length ? `<div class="cats">${cats.map(([c, v]) => `<div class="cat"><span class="cic" style="color:${catCor(c)}">${catIcon('out', c)}</span><div><div class="row between small"><span>${esc(c)}</span><b class="num">${brl(v, 0)}</b></div><div class="bar thin"><i style="width:${(v / catsAll[0][1] * 100).toFixed(1)}%;background:${catCor(c)}"></i></div></div><span class="tiny muted">${pct(v / m.out, 0)}</span></div>`).join('')}</div>
    ${(() => { const ds = dicasMes(curMonth), t = ds.find(k => !k.good) || ds[0]; return t ? `<button class="tipline" data-go2="lancamentos"><span>${t.ic}</span><span><b>${t.t}</b><small>${t.save > 0 ? 'Pode liberar ' + brl(t.save, 0) + '/mês · ver dicas' : 'ver dicas'}</small></span><i>›</i></button>` : ''; })()}`
    : `<div class="empty row"><img src="img/vazio.webp" alt=""><p class="muted small">Mês em branco. Toque em <b class="o">Despesas</b> para lançar.</p></div>`}
  </section>
  ${destaqueCard()}
  ${mk ? `<p class="disc">Selic ${pct(mk.selic.valor, 2)}${mk.cdi ? ' · CDI ' + pct(mk.cdi.valor, 2) : ''}${mk.ipca12m ? ' · IPCA 12m ' + pct(mk.ipca12m.valor, 2) : ''} · Banco Central</p>` : ''}`;
}
/* ---------- LANÇAMENTOS ---------- */
const CAT_COR = { 'Moradia': '#5B7CFF', 'Mercado': '#22D68A', 'Contas': '#F5C13D', 'Transporte': '#4FC3F7', 'Saúde': '#FF7AA2', 'Educação': '#A77BFF', 'Lazer': '#FF9F43', 'Restaurante': '#FF5C7A', 'Assinaturas': '#2DD4BF', 'Cartão/dívidas': '#E25555', 'Compras': '#F472B6', 'Outros': '#8189B0' };
const catCor = c => CAT_COR[c] || '#8189B0';
const DESEJOS = ['Lazer', 'Restaurante', 'Assinaturas', 'Compras'];
let txFilter = 'all', tipsOpen = false;
function prevMonth(m) { const [y, mm] = m.split('-').map(Number); return iso(new Date(y, mm - 2, 1)).slice(0, 7); }
function fv10(x) { const a = (DATA && DATA.mercado && DATA.mercado.cdi && DATA.mercado.cdi.valor) || S.settings.selic || 0.1; const i = Math.pow(1 + a, 1 / 12) - 1; return x * (Math.pow(1 + i, 120) - 1) / i; }
function dicasMes(mon) {
  const m = monthTotals(mon), pm = monthTotals(prevMonth(mon)), out = [];
  if (!m.out && !m.inc) return out;
  const C = k => m.cats[k] || 0, inc = m.inc, nomeAnt = MESES[+prevMonth(mon).slice(5, 7) - 1];
  if (inc > 0 && m.taxa < 0.2) { const falta = 0.2 * inc - m.sobra; out.push({ ic: '🎯', cor: 'o', t: m.sobra < 0 ? 'Você gastou mais do que ganhou' : `Você guardou ${pct(Math.max(0, m.taxa), 0)} do que entrou`, d: `A regra 50/30/20 sugere guardar 20% da renda. Para chegar lá faltam ${brl(falta, 0)} por mês. Comece pelos gastos abaixo.`, save: falta }); }
  else if (inc > 0) out.push({ ic: '🏆', cor: 'g', t: `Você guardou ${pct(m.taxa, 0)} da renda`, d: `Acima dos 20% da regra 50/30/20. Investindo ${brl(m.sobra, 0)} por mês no CDI, em 10 anos seriam cerca de ${brl(fv10(m.sobra), 0)}.`, save: 0, good: true });
  let up = null;
  for (const [c, v] of Object.entries(m.cats)) { const a = pm.cats[c] || 0; const d = v - a; if (a > 0 && d > Math.max(50, a * 0.15) && (!up || d > up.d)) up = { c, d, a }; }
  if (up) out.push({ ic: '📈', cor: 'r', t: `${up.c} subiu ${brl(up.d, 0)} desde ${nomeAnt}`, d: `Foi de ${brl(up.a, 0)} para ${brl(up.a + up.d, 0)} (+${pct(up.d / up.a, 0)}). Voltando ao nível de ${nomeAnt}, sobra mais esse valor todo mês.`, save: up.d });
  const des = DESEJOS.reduce((a, k) => a + C(k), 0);
  if (inc > 0 && des / inc > 0.3) out.push({ ic: '🎉', cor: 'o', t: `Desejos em ${pct(des / inc, 0)} da renda`, d: `Lazer, restaurante, assinaturas e compras somam ${brl(des, 0)}. A referência é até 30% da renda (${brl(0.3 * inc, 0)}).`, save: des - 0.3 * inc });
  if (C('Restaurante') > 100 && C('Restaurante') > 0.5 * C('Mercado')) out.push({ ic: '🍔', cor: 'o', t: `Comer fora custou ${brl(C('Restaurante'), 0)}`, d: `É ${C('Mercado') ? pct(C('Restaurante') / C('Mercado'), 0) + ' do que você gastou no mercado' : 'mais do que no mercado'}. Trocar 1 em cada 3 pedidos por comida de casa libera cerca de ${brl(C('Restaurante') / 3, 0)}.`, save: C('Restaurante') / 3 });
  if (C('Assinaturas') > 0) out.push({ ic: '📺', cor: 'b', t: `Assinaturas: ${brl(C('Assinaturas'), 0)}/mês`, d: `São ${brl(C('Assinaturas') * 12, 0)} por ano. Cancele o que você não usou nos últimos 30 dias: dá para reassinar quando quiser.`, save: C('Assinaturas') / 2 });
  if (C('Cartão/dívidas') > 0) out.push({ ic: '💳', cor: 'r', t: `Dívidas: ${brl(C('Cartão/dívidas'), 0)} no mês`, d: 'Quite primeiro a dívida com o juro mais alto (rotativo do cartão e cheque especial). Nenhum investimento rende tanto quanto esses juros custam.', save: 0 });
  if (inc > 0 && C('Moradia') / inc > 0.3) out.push({ ic: '🏠', cor: 'o', t: `Moradia em ${pct(C('Moradia') / inc, 0)} da renda`, d: 'A referência comum é até 30%. Vale renegociar o aluguel na renovação ou rever condomínio, internet e energia.', save: 0 });
  const top = Object.entries(m.cats).sort((a, b) => b[1] - a[1])[0];
  if (top && out.filter(k => !k.good).length < 2) out.push({ ic: '✂️', cor: 'b', t: `Maior gasto: ${top[0]}`, d: `Reduzir 10% em ${top[0].toLowerCase()} libera ${brl(top[1] * 0.1, 0)} por mês.`, save: top[1] * 0.1 });
  return out.sort((a, b) => (b.good ? 1e9 : 0) - (a.good ? 1e9 : 0) || b.save - a.save).slice(0, 4);
}
function donut(entries, total) {
  const R = 54, C = 2 * Math.PI * R; let off = 0;
  const segs = entries.map(([c, v]) => { const len = v / total * C; const seg = `<circle r="${R}" cx="70" cy="70" fill="none" stroke="${catCor(c)}" stroke-width="16" stroke-dasharray="${Math.max(0, len - 2).toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"/>`; off += len; return seg; }).join('');
  return `<svg viewBox="0 0 140 140" class="donut" role="img" aria-label="Gastos por categoria"><circle r="${R}" cx="70" cy="70" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="16"/><g transform="rotate(-90 70 70)">${segs}</g></svg>`;
}
function diaLabel(d) { const t = today(), y = iso(new Date(Date.now() - 864e5)); if (d === t) return 'Hoje'; if (d === y) return 'Ontem'; const [, mm, dd] = d.split('-'); const w = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(d + 'T12:00').getDay()]; return `${w}, ${+dd} de ${MESES[+mm - 1]}`; }
function viewLanc() {
  const m = monthTotals(curMonth), pm = monthTotals(prevMonth(curMonth));
  const [yy, mm] = curMonth.split('-').map(Number);
  const cats = Object.entries(m.cats).sort((a, b) => b[1] - a[1]);
  const dicas = dicasMes(curMonth);
  const all = S.tx.filter(t => ym(t.date) === curMonth && (txFilter === 'all' || t.type === txFilter)).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const byDay = []; for (const t of all) { const g = byDay[byDay.length - 1]; if (g && g.d === t.date) g.l.push(t); else byDay.push({ d: t.date, l: [t] }); }
  const nIn = S.tx.filter(t => ym(t.date) === curMonth && t.type === 'in').length, nOut = S.tx.filter(t => ym(t.date) === curMonth && t.type === 'out').length;
  return `
  <header class="page row between"><div><h1>Lançamentos</h1><p class="small muted">Seu dinheiro em ${MESES[mm - 1]}</p></div>
    <div class="monthpill"><button id="mprev" aria-label="Mês anterior">${ICON.left}</button><b>${MES3[mm - 1]} ${yy}</b><button id="mnext" aria-label="Próximo mês">${ICON.right}</button></div></header>
  <div class="quick2"><button class="qbtn out" id="qout"><span>−</span>Novo gasto</button><button class="qbtn in" id="qin"><span>+</span>Nova receita</button></div>
  <section class="card sum3">
    <div><span class="tiny muted">Entrou</span><b class="num g">${brl(m.inc, 0)}</b></div>
    <div><span class="tiny muted">Saiu</span><b class="num r">${brl(m.out, 0)}</b></div>
    <div><span class="tiny muted">${m.sobra >= 0 ? 'Sobrou' : 'Faltou'}</span><b class="num ${m.sobra >= 0 ? 'o' : 'r'}">${brl(Math.abs(m.sobra), 0)}</b>${isFinite(m.taxa) ? `<span class="tiny ${m.taxa >= 0.2 ? 'g' : m.taxa >= 0 ? 'muted' : 'r'}">${m.taxa >= 0 ? 'poupou ' + pct(m.taxa, 0) : ''}</span>` : ''}</div>
  </section>
  ${cats.length ? `<section class="card catcard">
    <div class="row between"><h3>Para onde foi seu dinheiro</h3><span class="tiny muted">${cats.length} categorias</span></div>
    <div class="donutwrap">${donut(cats, m.out)}<div class="dcenter"><span class="tiny muted">gastos</span><b class="num">${brl(m.out, 0)}</b>${pm.out ? `<span class="tiny ${m.out > pm.out ? 'r' : 'g'}">${m.out > pm.out ? '▲' : '▼'} ${pct(Math.abs(m.out - pm.out) / pm.out, 0)} vs ${MESES[+prevMonth(curMonth).slice(5, 7) - 1]}</span>` : ''}</div></div>
    <div class="catlist">${cats.map(([c, v]) => { const a = pm.cats[c] || 0, d = v - a; return `<div class="crow"><span class="cdot" style="background:${catCor(c)}22;color:${catCor(c)}">${catIcon('out', c)}</span><div class="cmain"><div class="row between"><b>${esc(c)}</b><b class="num">${brl(v, 0)}</b></div><div class="bar thin"><i style="width:${(v / cats[0][1] * 100).toFixed(1)}%;background:${catCor(c)}"></i></div><div class="row between tiny"><span class="muted">${pct(v / m.out, 0)} dos gastos${m.inc ? ' · ' + pct(v / m.inc, 0) + ' da renda' : ''}</span>${!a ? '<span class="muted">novo</span>' : Math.abs(d) < 1 ? '<span class="muted">= mês passado</span>' : `<span class="${d > 0 ? 'r' : 'g'}">${d > 0 ? '▲ +' : '▼ −'}${brl(Math.abs(d), 0)}</span>`}</div></div></div>`; }).join('')}</div>
  </section>` : ''}
  ${dicas.length ? `<details class="card tipscard"${tipsOpen ? ' open' : ''}>
    <summary><span class="tsico">💡</span><span class="tstx"><b>Onde melhorar</b><small>${dicas.length} dica${dicas.length > 1 ? 's' : ''} do seu mês${(() => { const mx = Math.max(0, ...dicas.map(t => t.save || 0)); return mx >= 10 ? ' · libere até ' + brl(mx, 0) + '/mês' : ''; })()}</small></span><svg class="chev" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></summary>
    <div class="tips">${dicas.map(t => `<div class="tip ${t.cor}"><span class="tic">${t.ic}</span><div><b>${t.t}</b><p class="small muted">${t.d}</p>${t.save >= 10 ? `<p class="tsave"><span>libera ${brl(t.save, 0)}/mês</span><span>≈ ${brl(fv10(t.save), 0)} em 10 anos no CDI</span></p>` : ''}</div></div>`).join('')}</div>
    <p class="tiny dim">Referência: regra 50/30/20 (necessidades, desejos e investimento). Projeções no CDI atual são estimativas, não promessa.</p>
  </details>` : ''}
  <section class="card">
    <div class="row between"><h3>Lançamentos do mês</h3><div class="seg mini" id="tfil"><button data-f="all" class="${txFilter === 'all' ? 'on' : ''}">Todos ${nIn + nOut || ''}</button><button data-f="out" class="${txFilter === 'out' ? 'on' : ''}">Gastos</button><button data-f="in" class="${txFilter === 'in' ? 'on' : ''}">Receitas</button></div></div>
    ${byDay.length ? byDay.map(g => `<p class="dayh">${diaLabel(g.d)}<span class="num">${(() => { const s = g.l.reduce((a, t) => a + (t.type === 'in' ? t.value : -t.value), 0); return (s >= 0 ? '+' : '−') + brl(Math.abs(s), 0); })()}</span></p><div class="list">${g.l.map(t => `
      <div class="item"><div class="ico" style="background:${t.type === 'in' ? 'rgba(34,214,138,.12)' : catCor(t.cat) + '1f'};color:${t.type === 'in' ? 'var(--verde)' : catCor(t.cat)}">${catIcon(t.type, t.cat)}</div><div class="t"><b>${esc(t.note || t.cat)}</b><span class="tiny muted">${t.note ? esc(t.cat) : t.type === 'in' ? 'Receita' : 'Gasto'}${t.rec ? ` · ↻ ${t.recI}/${t.recN}` : ''}</span></div>
      <div class="v num ${t.type === 'in' ? 'g' : ''}">${t.type === 'in' ? '+' : '−'}${brl(t.value)}</div><button class="del edt" data-edtx="${t.id}" aria-label="Editar">${ICON.edit}</button><button class="del" data-deltx="${t.id}" aria-label="Apagar">${ICON.trash}</button></div>`).join('')}</div>`).join('')
    : `<div class="empty row"><img src="img/vazio.webp" alt=""><p class="muted small">${txFilter === 'all' ? 'Nada lançado neste mês ainda.' : 'Nada nesse filtro.'} Use os botões acima para lançar.</p></div>`}
  </section>`;
}

/* ---------- LANÇAR ---------- */
function openSheet(html, after) {
  $('#sheet-body').innerHTML = deEmoji(html); $('#sheet').hidden = false; document.body.style.overflow = 'hidden';
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
  const resumo = `<div class="item" style="border:0;padding:4px 0"><div class="ico" style="background:${t.type === 'in' ? 'rgba(34,214,138,.12)' : catCor(t.cat) + '1f'};color:${t.type === 'in' ? 'var(--verde)' : catCor(t.cat)}">${catIcon(t.type, t.cat)}</div><div class="t"><b>${esc(t.note || t.cat)}</b><span class="tiny muted">${esc(t.cat)} · ${t.date.slice(8, 10)}/${t.date.slice(5, 7)}/${t.date.slice(0, 4)}</span></div><div class="v num ${t.type === 'in' ? 'g' : ''}">${t.type === 'in' ? '+' : '−'}${brl(t.value)}</div></div>`;
  if (!t.rec) {
    openSheet(`<div class="stack"><h2>Apagar este lançamento?</h2>${resumo}<p class="small muted">Ele sai do mês e dos gráficos.</p>
      <div class="grid2"><button class="btn ghost" id="dcancel">Cancelar</button><button class="btn danger" id="dok">Apagar</button></div></div>`, () => {
      $('#dcancel').onclick = closeSheet;
      $('#dok').onclick = () => { closeSheet(); delWithUndo('tx', id, 'Lançamento apagado'); };
    });
    return;
  }
  const next = S.tx.filter(k => k.rec === t.rec && k.date >= t.date).length, all = S.tx.filter(k => k.rec === t.rec).length;
  openSheet(`<div class="stack"><h2>Apagar lançamento que se repete</h2><p class="small muted">${esc(t.note || t.cat)} · ${brl(t.value)} por mês (${t.recI}/${t.recN})</p>
    <button class="btn ghost" data-dm="one">Apagar só este mês</button>
    <button class="btn ghost" data-dm="next">Apagar este e os próximos (${next})</button>
    <button class="btn danger" data-dm="all">Apagar todos (${all})</button>
    <button class="btn ghost" id="dcancel">Cancelar</button></div>`, () => {
    $('#dcancel').onclick = closeSheet;
    $('#sheet-body').querySelectorAll('[data-dm]').forEach(b => b.onclick = () => {
      const m = b.dataset.dm, antes = S.tx.slice();
      S.tx = S.tx.filter(k => m === 'one' ? k.id !== id : m === 'next' ? !(k.rec === t.rec && k.date >= t.date) : k.rec !== t.rec);
      save(); closeSheet(); render(); toast('Apagado', () => { S.tx = antes; save(); render(); });
    });
  });
}
function openTx(pre) {
  const ed = pre && pre.edit ? S.tx.find(k => k.id === pre.edit) : null;
  if (pre && pre.edit && !ed) return;
  let type = ed ? ed.type : 'out', cat = ed ? ed.cat : null, escopo = 'one';
  const chips = () => (type === 'in' ? CAT_IN : CAT_OUT).map(([c, i]) => `<button data-cat="${esc(c)}" class="${c === cat ? 'on' : ''}">${i} ${esc(c)}</button>`).join('');
  openSheet(`<div class="stack">
    ${ed ? '<h2>Editar lançamento</h2>' : ''}
    <div class="seg"><button data-t="out" class="${type === 'out' ? 'on r' : ''}">Gasto</button><button data-t="in" class="${type === 'in' ? 'on g' : ''}">Receita</button></div>
    <div class="amount"><span>R$</span><input id="tval" inputmode="decimal" placeholder="0,00" autocomplete="off" value="${ed ? ed.value.toFixed(2).replace('.', ',') : ''}"></div>
    <div class="chips scroll2" id="tcats">${chips()}</div>
    <div class="grid2"><div class="field"><label>Data</label><div class="inp"><input id="tdate" type="date" value="${ed ? ed.date : today()}"></div></div>
    <div class="field"><label>Descrição <small>opcional</small></label><div class="inp"><input id="tnote" maxlength="40" placeholder="Ex.: aluguel" enterkeyhint="done" value="${ed ? esc(ed.note || '') : ''}"></div></div></div>
    ${ed && ed.rec ? `<div class="field"><label>Lançamento que se repete (${ed.recI}/${ed.recN}). Aplicar em</label>
      <div class="seg3" id="tesc"><button data-e="one" class="on">Só este</button><button data-e="next">Este e próximos</button><button data-e="all">Todos</button></div></div>` : ''}
    <div class="field" ${ed ? 'hidden' : ''}><label>Repetir todo mês</label>
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
      $('#tcats').innerHTML = deEmoji(chips());
    });
    if (pre === 'in') { const bi = box.querySelector('[data-t="in"]'); bi && bi.click(); }
    const te = $('#tesc'); if (te) te.onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; escopo = b.dataset.e; te.querySelectorAll('button').forEach(k => k.classList.toggle('on', k === b)); };
    $('#tcats').onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; $('#tcats').querySelectorAll('button').forEach(k => k.classList.toggle('on', k === b)); };
    $('#tsave').onclick = () => {
      const v = num($('#tval').value);
      if (!(v > 0)) { toast('Digite um valor'); $('#tval').focus(); return; }
      if (!cat) cat = type === 'in' ? 'Outros' : 'Outros';
      const d = $('#tdate').value || today();
      if (ed) {
        const antes = S.tx.map(k => ({ ...k })), note = $('#tnote').value.trim().slice(0, 40), val = Math.round(v * 100) / 100;
        const alvo = !ed.rec || escopo === 'one' ? [ed] : S.tx.filter(k => k.rec === ed.rec && (escopo === 'all' || k.date >= ed.date));
        alvo.forEach(k => { k.type = type; k.cat = cat; k.value = val; k.note = note; });
        if (!ed.rec || escopo === 'one') ed.date = d;
        save(); closeSheet(); curMonth = ym(ed.date); render();
        toast(alvo.length > 1 ? `${alvo.length} lançamentos atualizados ✔` : 'Lançamento atualizado ✔', () => { S.tx = antes; save(); render(); });
        return;
      }
      const n = repN(), rec = n > 1 ? uid() : null, note = $('#tnote').value.trim().slice(0, 40);
      for (let i = 0; i < n; i++) S.tx.push({ id: uid(), type, cat, value: Math.round(v * 100) / 100, date: addMonths(d, i), note, ...(rec ? { rec, recI: i + 1, recN: n } : {}) });
      save(); closeSheet(); curMonth = ym(d); route = 'lancamentos'; history.replaceState(null, '', '#lancamentos'); render();
      const xp = act('lancar'); render();
      toast((n > 1 ? `Lançado nos próximos ${n} meses ↻` : type === 'in' ? 'Receita lançada 💰' : 'Gasto lançado ✔') + (xp ? ' · ' + xp : ''));
    };
  });
}

/* ---------- INFO dos indicadores ---------- */
let lastA = null, lastR = null;
const iB = k => `<button type="button" class="ib" data-info="${k}" aria-label="O que é isso?">i</button>`;
const INFO = {
  ret: { t: 'Retorno esperado por ano', ic: '🎯',
    o: 'Uma estimativa de quanto a ação pode render por ano: o que ela paga em proventos (DY) mais o quanto o lucro tende a crescer com o dinheiro que a empresa reinveste.',
    p: 'É a comparação justa com a renda fixa. Se a ação não rende mais que a Selic somada a um prêmio pelo risco, o Tesouro Selic entrega o mesmo sem susto.',
    l: 'Acima da régua: passa. Quanto maior a folga, melhor. É uma estimativa com base no passado, não uma promessa.',
    f: 'DY + ROE × (1 − payout)' },
  regua: { t: 'Régua (Selic + prêmio)', ic: '📏',
    o: 'O mínimo que uma ação deveria render por ano para valer o risco da bolsa.',
    p: 'Ganhar 12% na bolsa quando a renda fixa paga 14% sem risco é mau negócio. A régua sobe e desce junto com a Selic, que o app atualiza sozinho pelo Banco Central.',
    l: 'O retorno esperado precisa ficar acima dela. Você ajusta o prêmio em Meta → Critérios da análise.',
    f: 'Selic + prêmio de risco' },
  cres: { t: 'Crescimento estimado', ic: '🌱',
    o: 'Quanto o lucro pode crescer por ano com a parte do lucro que a empresa não distribui e reinveste no negócio.',
    p: 'Parte do seu ganho vem da empresa ficando maior, não só dos dividendos. Uma empresa que reinveste bem multiplica o seu patrimônio.',
    l: 'ROE alto com payout baixo gera mais crescimento. O app limita esse número a um teto para não superestimar.',
    f: 'ROE × (1 − payout)' },
  dy: { t: 'Dividend yield (DY)', ic: '💸',
    o: 'Quanto a ação pagou em dividendos e JCP nos últimos 12 meses em relação ao preço de hoje.',
    p: 'É o dinheiro que cai na sua conta sem vender a ação. É a base da renda passiva.',
    l: 'De 6% a 10% costuma ser bom. DY muito alto (15% ou mais) pode ser um pagamento extraordinário ou um preço que despencou, então confira antes.',
    f: 'proventos de 12 meses ÷ preço' },
  roe: { t: 'ROE (retorno sobre o patrimônio)', ic: '⚙️',
    o: 'Quanto a empresa lucra por ano para cada R$ 100 do dinheiro dos sócios.',
    p: 'Mostra se a empresa é boa em transformar capital em lucro. Empresas com ROE alto crescem sem precisar de tanto dinheiro novo. É o que Warren Buffett mais olha.',
    l: 'Acima de 15% é bom e 20% ou mais é excelente. Abaixo de 10% é fraco. Se o ROE é alto, mas a dívida também é, vale atenção.',
    f: 'lucro líquido de 12 meses ÷ patrimônio líquido' },
  div: { t: 'Dívida líquida / EBITDA', ic: '🏦',
    o: 'Quantos anos de geração de caixa operacional a empresa precisaria para pagar toda a dívida.',
    p: 'Uma empresa muito endividada sofre com juros altos, pode cortar dividendos e é a primeira a quebrar numa crise.',
    l: 'Abaixo de 1x é tranquilo, de 1x a 3x é aceitável e acima de 3x pede atenção. Negativo significa mais caixa que dívida, o que é ótimo. Bancos e seguradoras não usam esse indicador.',
    f: '(dívida − caixa) ÷ EBITDA de 12 meses' },
  pl: { t: 'P/L (preço / lucro)', ic: '🏷️',
    o: 'Quantos anos de lucro atual você está pagando pela ação. P/L 8 = a empresa levaria 8 anos de lucro para "devolver" o preço.',
    p: 'É o termômetro de caro ou barato. Uma empresa excelente comprada cara demais pode dar retorno ruim por anos.',
    l: 'Abaixo de 10 costuma ser barato, de 10 a 15 é justo e acima de 20 é caro (salvo empresas crescendo muito). P/L negativo significa prejuízo. Um P/L muito baixo pode vir de um lucro pontual, então veja se ele se repete.',
    f: 'preço ÷ LPA' },
  pvp: { t: 'P/VP (preço / valor patrimonial)', ic: '🧱',
    o: 'Quanto o mercado paga por cada R$ 1 de patrimônio da empresa.',
    p: 'Ajuda a ver se o preço está muito acima do que a empresa tem de fato. É muito usado para bancos e seguradoras.',
    l: 'Abaixo de 1, você paga menos que o patrimônio (pode ser oportunidade ou empresa com problema). Acima de 3, o mercado espera muito. ROE alto justifica um P/VP maior.',
    f: 'preço ÷ VPA' },
  graham: { t: 'Preço justo de Graham', ic: '📐',
    o: 'O preço justo estimado pela fórmula de Benjamin Graham, professor de Warren Buffett, combinando lucro e patrimônio.',
    p: 'Dá uma referência simples de quanto a ação "deveria" valer para um investidor conservador.',
    l: 'Preço abaixo do Graham indica desconto. A fórmula funciona mal para empresas de crescimento rápido ou com prejuízo.',
    f: '√(22,5 × LPA × VPA)' },
  margem: { t: 'Margem de segurança', ic: '🛡️',
    o: 'O desconto (verde) ou ágio (vermelho) do preço atual em relação ao preço justo de Graham.',
    p: 'Comprar com desconto protege você se as contas estiverem erradas ou se a empresa piorar. É a regra nº 1 de Graham.',
    l: '20% ou mais é confortável. Um número negativo significa que a ação está acima do preço justo pela fórmula.',
    f: '1 − preço ÷ Graham' },
  lpa: { t: 'LPA (lucro por ação)', ic: '📊',
    o: 'O lucro líquido dos últimos 12 meses dividido pelo número de ações.',
    p: 'É a base do P/L e do preço de Graham. Quando o lucro por ação cresce, a ação tende a acompanhar no longo prazo.',
    l: 'Melhor se cresce ano após ano. Negativo significa prejuízo.',
    f: 'lucro de 12 meses ÷ nº de ações' },
  vpa: { t: 'VPA (valor patrimonial por ação)', ic: '🏠',
    o: 'O patrimônio líquido (o que sobra depois de pagar todas as dívidas) dividido pelo número de ações.',
    p: 'É a base do P/VP e do preço de Graham. Mostra quanto de "empresa" existe por trás de cada ação.',
    l: 'Melhor se cresce com o tempo, porque significa que a empresa está acumulando valor.',
    f: 'patrimônio líquido ÷ nº de ações' },
  payout: { t: 'Payout', ic: '🍰',
    o: 'A porcentagem do lucro que a empresa distribui aos acionistas em dividendos e JCP.',
    p: 'Mostra o equilíbrio entre pagar você agora e reinvestir para crescer depois.',
    l: 'A lei exige em regra 25%. De 40% a 70% é equilibrado. Acima de 100%, ela paga mais do que lucra, e isso não se sustenta por muito tempo.',
    f: 'proventos ÷ lucro líquido' }
};
function infoNow(k) {
  const a = lastA, r = lastR, st = S.settings; if (!a || !r) return '';
  const crit = r.c.find(c => c.k === k);
  const v = { ret: pct(r.ret), regua: pct(r.regua), cres: pct(r.cres), dy: pct(a.dy), roe: pct(a.roe), div: a.fin ? 'n/a' : x(a.div), pl: x(r.pl), pvp: x(r.pvp, 2), graham: brl(r.graham), margem: pct(r.margem, 0), lpa: brl(a.lpa), vpa: brl(a.vpa), payout: pct(a.payout) }[k];
  const meta = { roe: 'seu filtro: ≥ ' + pct(st.roeMin, 0), div: a.fin ? 'não se aplica a bancos e seguradoras' : 'seu filtro: ≤ ' + x(st.dividaMax), pl: 'seu filtro: entre 0 e ' + nf(st.plMax, 0), ret: 'régua: ' + pct(r.regua), regua: 'Selic ' + pct(st.selic) + ' + prêmio ' + pct(st.premio) }[k];
  if (v == null || v === '—') return '';
  const cls = crit ? (crit.ok ? 'okc' : 'noc') : '';
  return `<div class="card infonow ${cls}"><span class="tiny muted">${esc(a.code || 'Nesta ação')}</span><b class="num">${v}</b>${crit ? `<span class="tiny ${crit.ok ? 'g' : 'r'}">${crit.ok ? '✓ passou' : '✕ não passou'}</span>` : ''}${meta ? `<span class="tiny dim">${meta}</span>` : ''}</div>`;
}
function openInfo(k) {
  const I = INFO[k]; if (!I) return;
  openSheet(`<div class="stack info"><p class="label">Entenda o indicador</p><h2 style="font-size:20px">${I.ic} ${I.t}</h2>${infoNow(k)}
    <div class="iq"><b>O que mostra</b><p class="small">${I.o}</p></div>
    <div class="iq"><b>Por que importa</b><p class="small">${I.p}</p></div>
    <div class="iq"><b>Como ler</b><p class="small">${I.l}</p></div>
    <p class="tiny muted formula">Conta: <span class="num">${I.f}</span></p>
    <button class="btn" data-close>Entendi</button></div>`, () => $('#sheet-body').querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheet));
}
document.addEventListener('click', e => { const b = e.target.closest('[data-info]'); if (!b) return; e.preventDefault(); e.stopPropagation(); openInfo(b.dataset.info); }, true);

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
  return { code: (draft.code || '').toUpperCase().trim(), price: p('price'), lpa: p('lpa'), vpa: p('vpa'), dy: p('dy') / 100, roe: p('roe') / 100, payout: p('payout') / 100, div: p('div'), fin: !!(draft.src && draft.src.financeira), nodiv: !!(draft.src && !draft.src.financeira && draft.src.div_ebitda == null) };
}
const complete = a => ['price', 'lpa', 'vpa', 'dy', 'roe', 'payout'].every(k => isFinite(a[k])) && (a.fin || a.nodiv || isFinite(a.div));
function histHTML(code) {
  const q = Q(code), h = q && q.hist; if (!h || h.length < 2) return '';
  const ps = h.map(x => x[1]), mn = Math.min(...ps), mx = Math.max(...ps), W = 300, Hh = 76, pad = 8;
  const X = i => pad + i * (W - 2 * pad) / (h.length - 1), Y = v => mx === mn ? Hh / 2 : pad + (mx - v) / (mx - mn) * (Hh - 2 * pad);
  const first = ps[0], last = ps[ps.length - 1], ch = last / first - 1, up = ch >= 0, cor = up ? 'var(--verde)' : 'var(--vermelho)';
  const line = h.map((x, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(x[1]).toFixed(1)}`).join(' ');
  const area = `${line} L${X(h.length - 1).toFixed(1)} ${Hh} L${X(0).toFixed(1)} ${Hh} Z`;
  const dd = d => d.slice(8, 10) + '/' + d.slice(5, 7);
  const wd = d => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(d + 'T12:00').getDay()];
  return `<section class="card hist">
    <div class="row between"><h3>Últimos ${h.length} pregões</h3><span class="chip ${up ? 'g' : 'r'}">${up ? '▲' : '▼'} ${pct(Math.abs(ch), 1)} em ${h.length} pregões</span></div>
    <svg viewBox="0 0 ${W} ${Hh}" class="spark" role="img" aria-label="Preço de fechamento nos últimos ${h.length} pregões">
      <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${up ? '#22D68A' : '#FF4D6D'}" stop-opacity=".35"/><stop offset="1" stop-color="${up ? '#22D68A' : '#FF4D6D'}" stop-opacity="0"/></linearGradient></defs>
      <path d="${area}" fill="url(#hg)"/><path d="${line}" fill="none" stroke="${cor}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      ${h.map((x, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(x[1]).toFixed(1)}" r="${i === h.length - 1 ? 4 : 2.6}" fill="${i === h.length - 1 ? cor : '#0A0E24'}" stroke="${cor}" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join('')}
    </svg>
    <div class="hdays" style="grid-template-columns:repeat(${h.length},1fr)">${h.map((x, i) => { const v = i ? x[1] / h[i - 1][1] - 1 : null; return `<div><span class="tiny muted">${wd(x[0])} ${dd(x[0])}</span><b class="num">${brl(x[1])}</b>${v == null ? '<span class="tiny dim">—</span>' : `<span class="tiny ${v >= 0 ? 'g' : 'r'}">${v >= 0 ? '+' : '−'}${pct(Math.abs(v), 1)}</span>`}</div>`; }).join('')}</div>
    <p class="tiny dim">Preço de fechamento · B3 (COTAHIST)</p>
  </section>`;
}
function precoHTML(a, r) {
  if (!isFinite(r.graham)) return `<section class="card ptag na"><div class="row between"><span class="tiny muted">Cara ou barata? ${iB('graham')}</span><b>Sem preço justo</b></div><p class="small muted">Com prejuízo ou patrimônio negativo, a fórmula de Graham não se aplica. Olhe os critérios acima antes de tudo.</p></section>`;
  const m = r.margem, k = m >= 0.2 ? 'bar' : m <= -0.1 ? 'car' : 'jus';
  const T = { bar: 'Barata', jus: 'No preço justo', car: 'Cara' }[k];
  const vezes = a.price / r.graham;
  const dif = Math.abs(m) < 0.005 ? 'praticamente igual ao' : vezes >= 2 ? `${nf(vezes, 1)} vezes o` : `${pct(Math.abs(m), 0)} ${m > 0 ? 'abaixo do' : 'acima do'}`;
  const pos = Math.max(3, Math.min(97, 50 - m * 100));
  const nota = k === 'bar' ? (r.okN === 4 ? 'Preço abaixo do justo e a empresa passou nos 4 critérios.' : 'Preço baixo, mas a empresa não passou em todos os critérios: às vezes está barata por um motivo.')
    : k === 'car' ? (r.okN === 4 ? 'Boa empresa nos critérios, mas o preço já está acima do justo: a margem de segurança acabou.' : 'Preço acima do justo e a empresa não passou em todos os critérios.')
    : 'Preço perto do valor justo: sem desconto, mas também sem exagero.';
  return `<section class="card ptag ${k}">
    <div class="row between"><span class="tiny muted">Cara ou barata? ${iB('margem')}</span><b>${T}</b></div>
    <div class="pbar"><span>barata</span><span>justa</span><span>cara</span><i style="left:${pos}%"></i></div>
    <p class="small">Preço de ${brl(a.price)} está <b>${dif} preço justo</b> de Graham (${brl(r.graham)}).</p>
    <p class="tiny muted">${nota} Comparação educativa, não é recomendação de compra ou venda.</p>
  </section>`;
}
function resultHTML(a) {
  if (!complete(a)) {
    const c = a.code, tk = /^[A-Z]{4}\d{1,2}$/.test(c);
    let msg, extra = '';
    if (!DATA || !DATA.acoes) { msg = 'Não consegui baixar os dados das ações. Confira a internet e tente de novo.'; extra = '<button class="btn sm" id="aretry">Tentar de novo</button>'; }
    else if (!c) msg = 'Digite o código ou o nome da empresa, ou toque numa ação acima. Os números vêm sozinhos dos balanços da CVM e do fechamento da B3.';
    else if (tk && !Q(c)) { msg = `Não temos dados de ${esc(c)} hoje: ela não negociou na B3 nos últimos dias, ou é um fundo/BDR. Se quiser, preencha os números à mão.`; if (!editNums) extra = '<button class="btn ghost sm" id="amanual">Preencher à mão</button>'; }
    else msg = 'Toque numa das ações sugeridas acima para ver a análise.';
    return `<div class="hint row"><img src="img/analisar.webp" alt=""><div class="stack" style="gap:8px;flex:1;min-width:0"><p class="small muted">${msg}</p>${extra}</div></div>`;
  }
  const r = analyze(a); lastA = a; lastR = r;
  const V = { ok: ['Passou com folga', 'meta'], mid: ['Passou, sem folga', 'analisar'], no: ['Não passou', 'vazio'] }[r.verdict];
  const pos = Math.max(4, Math.min(96, 50 + (r.folga / 0.10) * 50));
  return `
  <section class="card verdict2 ${r.verdict}">
    <div class="row" style="gap:12px"><img class="reac r${Math.max(1, r.okN)}" src="img/reacao${Math.max(1, r.okN)}.webp" alt="${['', 'Decepcionado', 'Preocupado', 'Quase lá', 'Comemorando'][Math.max(1, r.okN)]}" width="60" height="90"><div style="flex:1;min-width:0"><p class="tiny muted">${esc(a.code || 'Resultado')}${draft.src && draft.src.nome ? ' · ' + esc(draft.src.nome.split(' ').slice(0, 3).join(' ')) : ''}</p><b class="vt">${V[0]}</b><p class="tiny muted">${r.okN} de 4 critérios</p></div>
      <div class="ret"><p class="tiny muted">retorno/ano ${iB('ret')}</p><b class="num ${r.ret > r.regua ? 'g' : 'r'}">${pct(r.ret)}</b></div></div>
    <div class="gauge"><u></u><i style="left:${pos}%"></i></div>
    <div class="row between tiny dim"><span>DY ${pct(a.dy)} ${iB('dy')} + cresc. ${pct(r.cres)} ${iB('cres')}</span><span>régua ${pct(r.regua)} ${iB('regua')}</span></div>
  </section>
  <div class="critgrid">${r.c.map(c => `<div class="cg ${c.ok ? 'ok' : 'no'}">${iB(c.k)}<span>${c.ok ? '✓' : '✕'}</span><div><p class="tiny">${c.n.replace('ROE de pelo menos', 'ROE ≥').replace('Dívida até', 'Dívida ≤').replace(' o EBITDA', '').replace('P/L entre 0 e', 'P/L ≤').replace('Retorno acima de', 'Retorno >').replace('Dívida: não se aplica', 'Dívida: n/a')}</p><b class="num">${c.v}</b></div></div>`).join('')}</div>
  ${precoHTML(a, r)}
  <div class="metrics4">
    <div><span class="tiny muted">P/L ${iB('pl')}</span><b class="num">${x(r.pl)}</b></div>
    <div><span class="tiny muted">P/VP ${iB('pvp')}</span><b class="num">${x(r.pvp, 2)}</b></div>
    <div><span class="tiny muted">Graham ${iB('graham')}</span><b class="num">${brl(r.graham)}</b></div>
    <div><span class="tiny muted">Margem ${iB('margem')}</span><b class="num ${r.margem >= 0 ? 'g' : 'r'}">${pct(r.margem, 0)}</b></div>
  </div>
  ${draft.src ? `<p class="tiny dim" style="text-align:center">CVM balanço ${esc(draft.src.periodo)} · B3 ${dBRs(DATA.data_cotacao)} · Selic Banco Central</p>` : ''}
  ${histHTML(a.code)}
  <p class="tiny dim" style="text-align:center">Toque no <span class="ib" style="pointer-events:none">i</span> para entender cada número</p>
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
      <input data-a="code" autocapitalize="characters" maxlength="30" enterkeyhint="search" autocomplete="off" placeholder="Código ou empresa (ex.: PETR4)" value="${esc(draft.code)}">
      ${draft.code ? '<button id="aclear" aria-label="Limpar">✕</button>' : ''}</div>
    <div id="sugs" class="chips scroll"></div>
    ${auto && !editNums ? `<button class="sumrow" id="editnums"><span class="tiny muted">${sum}</span><span class="link">editar</span></button>` : DATA && DATA.acoes && !editNums ? `<button class="link" id="editnums" style="margin-top:10px">ou preencher os números à mão</button>` : `
    <div class="grid2 nums">${fields.map(([k, l, suf, h]) => `
      <div class="field"><label>${l} ${INFO[k] ? iB(k) : ''}</label><div class="inp ${suf === 'R$' ? 'has-pre' : ''}">${suf === 'R$' ? '<span class="pre">R$</span>' : ''}<input data-a="${k}" inputmode="decimal" placeholder="${h.split(' ')[0]}" value="${esc(draft[k])}">${suf && suf !== 'R$' ? `<span class="suf">${suf}</span>` : ''}</div></div>`).join('')}</div>`}
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
      applyData(); save(); closeSheet(); const xp = act('carteira'); render(); toast('Carteira atualizada ✔' + (xp ? ' · ' + xp : ''));
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
      S.divs.push({ id: uid(), date: $('#ddate').value || today(), code, kind, value: v }); save(); closeSheet(); const xp = act('carteira'); render(); toast('Provento lançado 🪙' + (xp ? ' · ' + xp : ''));
    };
  });
}

/* ---------- META / AJUSTES ---------- */
function metaCalc() {
  const st = S.settings, p = portfolio();
  const need = st.yieldMeta > 0 ? st.meta * 12 / st.yieldMeta : 0;
  const prog = need > 0 ? Math.min(1, p.cur / need) : 0;
  const pmt = st.aporte != null ? st.aporte : Math.max(0, Math.round(avgSobra()));
  const n = nper(st.yieldMeta / 12, pmt, p.cur, need);
  const anos = n / 12;
  const quando = isFinite(anos) ? new Date(new Date().getFullYear(), new Date().getMonth() + Math.round(n)) : null;
  return {
    need, prog, pmt,
    anosTxt: prog >= 1 ? 'Já chegou 🎉' : isFinite(anos) ? (anos < 1 ? Math.ceil(n) + ' meses' : anos.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' anos') : '—',
    quandoTxt: quando && prog < 1 ? MESES[quando.getMonth()] + ' de ' + quando.getFullYear() + ' · faltam ' + brl(Math.max(0, need - p.cur), 0) : pmt <= 0 && prog < 1 ? 'defina um aporte mensal' : ''
  };
}
const GR = 2 * Math.PI * 42;
const SLD = [
  { k: 'meta', l: 'Renda que você quer por mês', min: 500, max: 50000, step: 500, m: 1, f: v => brl(v, 0) },
  { k: 'aporte', l: 'Quanto você investe por mês', min: 0, max: 20000, step: 100, m: 1, f: v => brl(v, 0) },
  { k: 'yieldMeta', l: 'Rendimento médio por ano', min: 4, max: 15, step: 0.5, m: 100, f: v => nf(v, 1) + '%' }
];
function metaRefresh() {
  const c = metaCalc();
  const set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
  set('mAnos', c.anosTxt); set('mQuando', c.quandoTxt); set('mPct', Math.round(c.prog * 100) + '%');
  set('mNeed', 'Precisa de ' + brl(c.need, 0) + ' investidos. Estimativa com juros compostos, não promessa.');
  const g = document.getElementById('mArc'); if (g) g.setAttribute('stroke-dasharray', `${(GR * c.prog).toFixed(1)} ${GR.toFixed(1)}`);
}
function sliderFill(inp) { inp.style.setProperty('--v', ((inp.value - inp.min) / (inp.max - inp.min) * 100).toFixed(1) + '%'); }
function viewMais() {
  const st = S.settings, c = metaCalc();
  const sel = DATA && DATA.mercado && DATA.mercado.selic;
  const val = { meta: st.meta, aporte: c.pmt, yieldMeta: st.yieldMeta * 100 };
  return `
  <header class="page"><h1>Meta de liberdade</h1><p class="small muted">Quando você vive de renda?</p></header>
  <section class="card gold goalcard">
    <div class="goal">
      <div class="gring"><svg viewBox="0 0 100 100"><defs><linearGradient id="gg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFDA6B"/><stop offset="1" stop-color="#F5A623"/></linearGradient></defs><circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="9"/><circle id="mArc" cx="50" cy="50" r="42" fill="none" stroke="url(#gg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(GR * c.prog).toFixed(1)} ${GR.toFixed(1)}" transform="rotate(-90 50 50)"/></svg><b id="mPct">${Math.round(c.prog * 100)}%</b></div>
      <div style="min-width:0"><p class="label">Você chega lá em</p><p class="big" id="mAnos" style="font-size:30px">${c.anosTxt}</p><p class="tiny muted" id="mQuando">${c.quandoTxt}</p></div>
    </div>
  </section>
  <section class="card sliders">
    ${SLD.map(d => { const v = Math.min(d.max, Math.max(d.min, val[d.k])); return `<div class="sl"><label for="sl_${d.k}">${d.l}<b id="slv_${d.k}">${d.f(val[d.k])}</b></label><input type="range" id="sl_${d.k}" data-sl="${d.k}" min="${d.min}" max="${d.max}" step="${d.step}" value="${v}"></div>`; }).join('')}
    <p class="tiny dim" id="mNeed">Precisa de ${brl(c.need, 0)} investidos. Estimativa com juros compostos, não promessa.</p>
  </section>
  <section class="card"><div class="row between"><h3>Conquistas</h3><span class="tiny muted">${Object.keys(G().badges).length}/${BADGES.length} · Nv ${level(G().xp).n} ${level(G().xp).name}</span></div>${badgesHTML()}</section>
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
  ${SES ? `<p class="disc">Conectado como ${esc(SES.email)} · <button class="link" id="bsair">Sair</button></p>` : ''}
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
  const bs = $('#bsair'); if (bs) bs.onclick = () => { if (confirm('Sair desta conta? Seus dados continuam salvos neste aparelho.')) sair(); };
  document.querySelectorAll('[data-go2]').forEach(b => b.onclick = () => go(b.dataset.go2));
  const on = (id, f) => { const el = $('#' + id); if (el) el.onclick = f; };
  on('mprev', () => { const [y, m] = curMonth.split('-').map(Number); curMonth = iso(new Date(y, m - 2, 1)).slice(0, 7); render(); });
  on('mnext', () => { const [y, m] = curMonth.split('-').map(Number); curMonth = iso(new Date(y, m, 1)).slice(0, 7); render(); });
  on('togtx', () => { showAllTx = !showAllTx; render(); });
  on('qout', () => openTx('out')); on('qin', () => openTx('in'));
  const mb = $('#missbox'); if (mb) mb.ontoggle = () => { missOpen = mb.open; };
  const tc = $('.tipscard'); if (tc) tc.ontoggle = () => { tipsOpen = tc.open; };
  const tf = $('#tfil'); if (tf) tf.onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; txFilter = b.dataset.f; render(); };
  document.querySelectorAll('[data-mis]').forEach(b => b.onclick = () => {
    const k = b.dataset.mis;
    if (k === 'lancar') openTx(); else if (k === 'licao') openLesson(); else if (k === 'analisar') go('analisar');
    else if (k === 'carteira') go('carteira'); else if (k === 'destaque') { const d = $('#destaque'); d && d.click(); }
  });
  on('nospend', () => { const xp = act('lancar'); confetti(); render(); toast('Dia sem gastos! ' + (xp || '') + ' 👏'); });
  on('destaque', () => { const dz = destaque(); if (!dz) return; const xp = act('destaque'); route = 'analisar'; fillFromData(dz.c); window.scrollTo({ top: 0 }); if (xp) toast('Missão cumprida · ' + xp); });
  on('streakchip', () => toast(streak() ? `🔥 ${streak()} dias seguidos usando o app. Não quebre a ofensiva!` : 'Use o app hoje para começar sua ofensiva 🔥'));
  on('togcats', () => { showAllCats = !showAllCats; render(); });
  on('toglist', () => { showAllList = !showAllList; render(); });
  on('editnums', () => { editNums = true; render(); });
  on('addtx', openTx); on('addasset', () => openAsset()); on('adddiv', openDiv);
  document.querySelectorAll('[data-deltx]').forEach(b => b.onclick = e => { e.stopPropagation(); delTx(b.dataset.deltx); });
  document.querySelectorAll('[data-edtx]').forEach(b => b.onclick = e => { e.stopPropagation(); openTx({ edit: b.dataset.edtx }); });
  document.querySelectorAll('[data-deldiv]').forEach(b => b.onclick = e => { e.stopPropagation(); delWithUndo('divs', b.dataset.deldiv, 'Provento apagado'); });
  document.querySelectorAll('[data-delan]').forEach(b => b.onclick = e => { e.stopPropagation(); delWithUndo('analyses', b.dataset.delan, 'Análise apagada'); });
  document.querySelectorAll('[data-editasset]').forEach(b => b.onclick = () => openAsset(b.dataset.editasset));
  document.querySelectorAll('[data-ct]').forEach(b => b.onclick = () => { cartTab = b.dataset.ct; render(); });
  const ap = $('#aporte'); if (ap) { const f = () => { const v = num(ap.value) || num(ap.placeholder) || 0; $('#aporteres').innerHTML = aporteCalc(v); }; ap.oninput = f; f(); }
  // analisar
  document.querySelectorAll('[data-a]').forEach(inp => inp.oninput = () => {
    draft[inp.dataset.a] = inp.value;
    if (inp.dataset.a === 'code') {
      if (Q(inp.value)) { fillFromData(inp.value); return; }
      if (draft.src) { ['price', 'lpa', 'vpa', 'dy', 'roe', 'payout', 'div'].forEach(k => draft[k] = ''); draft.src = null; }
      showSugs(inp.value);
    }
    $('#ares').innerHTML = deEmoji(resultHTML(draftNum())); bindAsave(); bindHint();
  });
  const ci = $('[data-a="code"]');
  if (ci) ci.onkeydown = e => { if (e.key !== 'Enter') return; e.preventDefault(); const f = $('#sugs [data-pick]'); if (Q(ci.value)) fillFromData(ci.value); else if (f) f.click(); };
  bindHint();
  if (route === 'analisar') showSugs(draft.src ? '' : draft.code);
  bindAsave();
  on('aclear', () => { draft = { code: '', price: '', lpa: '', vpa: '', dy: '', roe: '', payout: '', div: '', src: null }; editNums = false; render(); });
  on('aex', () => { draft = { code: 'EXEM3', price: '32,50', lpa: '4,10', vpa: '21,00', dy: '9', roe: '19', payout: '55', div: '1,4' }; render(); toast('Exemplo fictício carregado'); });
  document.querySelectorAll('[data-load]').forEach(el => el.onclick = () => { const s = S.analyses.find(k => k.id === el.dataset.load); if (!s) return; if (Q(s.code)) { fillFromData(s.code); return; } draft = { code: s.code, price: nf(s.price), lpa: nf(s.lpa), vpa: nf(s.vpa), dy: nf(s.dy * 100), roe: nf(s.roe * 100), payout: nf(s.payout * 100), div: nf(s.div), src: null }; render(); });
  // ajustes
  document.querySelectorAll('[data-sl]').forEach(inp => {
    const d = SLD.find(x => x.k === inp.dataset.sl); sliderFill(inp);
    inp.oninput = () => { const v = Number(inp.value); S.settings[d.k] = v / d.m; sliderFill(inp); const t = $('#slv_' + d.k); if (t) t.textContent = d.f(v); metaRefresh(); };
    inp.onchange = () => { save(); checkBadges && checkBadges(); };
  });
  document.querySelectorAll('[data-s]').forEach(inp => inp.onchange = () => { const v = num(inp.value); if (!isFinite(v)) return; S.settings[inp.dataset.s] = v / Number(inp.dataset.m); if (inp.dataset.s === 'selic') S.settings.selicManual = true; save(); render(); });
  on('selicbc', () => { S.settings.selicManual = false; applyData(); save(); render(); toast('Usando a Selic do Banco Central'); });
  const sn = $('#sname'); if (sn) sn.onchange = () => { S.name = sn.value.trim().slice(0, 24); save(); toast('Nome salvo'); };
  on('bexp', () => { const b = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'backup-carteira-inteligente-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); if (!G().badges.backup) { G().badges.backup = today(); save(); confetti(); } toast('Backup baixado ✔'); });
  on('bimp', () => $('#bfile').click());
  const bf = $('#bfile'); if (bf) bf.onchange = async () => { try { const d = JSON.parse(await bf.files[0].text()); if (!Array.isArray(d.tx)) throw 0; S = { ...structuredClone(DEF), ...d, settings: { ...DEF.settings, ...(d.settings || {}) } }; save(); render(); toast('Backup restaurado ✔'); } catch (e) { toast('Arquivo de backup inválido'); } };
  on('breset', () => { if (confirm('Apagar TODOS os seus dados deste aparelho? Isso não pode ser desfeito.')) { const n = S.name; S = structuredClone(DEF); S.onboarded = true; S.name = n; save(); render(); toast('Dados apagados'); } });
  on('binst', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; render(); });
}
function fillFromData(code) {
  const q = Q(code); if (!q) return;
  const xp = act('analisar'); if (xp) setTimeout(() => toast('Missão cumprida · ' + xp), 300);
  const f = (v, d = 2) => v == null || !isFinite(v) ? '' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: d, useGrouping: false });
  editNums = false;
  draft = { code: code.toUpperCase().trim(), price: f(q.preco), lpa: f(q.lpa) || '0', vpa: f(q.vpa) || '0', dy: q.dy == null ? '0' : f(q.dy * 100, 1), roe: q.roe == null ? '0' : f(q.roe * 100, 1), payout: f(q.payout == null ? 0 : q.payout * 100, 1), div: q.financeira ? '' : f(q.div_ebitda, 2), src: q };
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
  const t = semAcento(txt);
  if (!t) {
    box.innerHTML = `<p class="tiny muted" style="width:100%">Mais analisadas · toque para ver</p>` + popular().map(c => `<button data-pick="${c}" class="${draft.src && draft.code === c ? 'on' : ''}"><b>${c}</b></button>`).join('');
    box.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { if (Q(b.dataset.pick)) fillFromData(b.dataset.pick); else { draft.code = b.dataset.pick; render(); } });
    return;
  }
  if (!DATA || !DATA.acoes) { box.innerHTML = ''; return; }
  const list = Object.entries(DATA.acoes).filter(([c, q]) => c.startsWith(t) || (t.length >= 3 && semAcento(q.nome).includes(t))).sort((a, b) => (b[1].volume || 0) - (a[1].volume || 0)).slice(0, 8);
  box.innerHTML = list.length ? list.map(([c, q]) => `<button data-pick="${c}"><b>${c}</b> <span class="tiny muted">${esc((q.nome || '').split(' ').slice(0, 2).join(' '))}</span></button>`).join('') : '<span class="tiny muted">Nenhuma ação encontrada. Confira o código (ex.: PETR4, VALE3, ITUB4).</span>';
  box.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => fillFromData(b.dataset.pick));
}
function bindHint() {
  const on = (id, f) => { const el = $('#' + id); if (el) el.onclick = f; };
  on('aretry', async () => { const b = $('#aretry'); if (b) b.textContent = 'Carregando...'; await loadData(); render(); toast(DATA && DATA.acoes ? 'Dados das ações carregados ✔' : 'Ainda sem conexão. Tente de novo em instantes.'); });
  on('amanual', () => { editNums = true; render(); });
}
const semAcento = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
function bindAsave() {
  const b = $('#asave'); if (!b) return;
  b.onclick = () => {
    const a = draftNum(); if (!complete(a)) return;
    a.code = a.code || 'AÇÃO'; const ex = S.analyses.find(k => k.code === a.code);
    const obj = { id: ex ? ex.id : uid(), ...a, date: Date.now() };
    if (ex) S.analyses[S.analyses.indexOf(ex)] = obj; else S.analyses.push(obj);
    save(); const xp = act('analisar'); render(); toast(a.code + ' salva na sua lista ✔' + (xp ? ' · ' + xp : ''));
  };
}

/* ---------- start ---------- */
const h = location.hash.slice(1); if (['inicio', 'analisar', 'carteira', 'mais', 'lancamentos'].includes(h)) route = h;
render();
loadData();
if (S.onboarded && authed()) { dailyHello(); checkBadges(); save(); }
setTimeout(checarSessao, 1500);
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
