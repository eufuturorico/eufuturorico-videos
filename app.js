/* Carteira Inteligente · Eu Futuro Rico — app de celular (dados salvos no próprio aparelho) */
(() => {
'use strict';
const KEY = 'efr.carteira.v1';
const DEF = {
  v: 1, onboarded: false, name: '',
  settings: { selic: 0.1375, premio: 0.0275, cresMax: 0.12, dividaMax: 3.6, roeMin: 0.10, plMax: 25, meta: 3000, yieldMeta: 0.08 },
  tx: [], analyses: [], assets: [], divs: [], lista: { fiis: [], eua: [], rf: [] }, cats: { out: [], in: [] }, plano: null
};
let memOnly = false;
function load() {
  try { const s = localStorage.getItem(KEY); if (s) { const d = JSON.parse(s); return { ...structuredClone(DEF), ...d, settings: { ...DEF.settings, ...(d.settings || {}) }, lista: { ...DEF.lista, ...(d.lista || {}) }, cats: { out: [], in: [], ...(d.cats || {}) } }; } }
  catch (e) { memOnly = true; }
  return structuredClone(DEF);
}
let S = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { memOnly = true; } }

/* ---------- dados oficiais (BCB, CVM, B3) ---------- */
let DATA = null;
try { DATA = JSON.parse(localStorage.getItem(KEY + '.dados') || 'null'); } catch (e) { DATA = null; }
(window.requestIdleCallback || (f => setTimeout(f, 1500)))(() => [1, 2, 3, 4].forEach(n => { const i = new Image(); i.src = `img/reacao${n}.webp`; }));
let rTimer = 0;
function agendaRender() { clearTimeout(rTimer); rTimer = setTimeout(() => { if (S.onboarded && authed()) render(); }, 80); }
let dadosPedidos = false;
function carregaDados() { if (dadosPedidos) return; dadosPedidos = true; loadData(); setTimeout(() => loadExtra('fiis'), 900); }
async function loadData() {
  try {
    const r = await fetch('data/dados.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error(r.status);
    DATA = await r.json();
    try { localStorage.setItem(KEY + '.dados', JSON.stringify(DATA)); } catch (e) { }
  } catch (e) { /* sem internet: usa a última cópia salva */ }
  if (applyData()) save();
  agendaRender();
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
const pct = (v, d = 1) => v != null && v !== '' && isFinite(v) ? (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%' : '—';
const x = (v, d = 1) => v != null && v !== '' && isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + 'x' : '—';
function num(s) {
  if (typeof s === 'number') return s;
  s = String(s ?? '').trim().replace(/[R$\s%x]/gi, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
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
const catsDe = t => { const base = t === 'in' ? CAT_IN : CAT_OUT, extra = ((S.cats || {})[t] || []).filter(k => !base.some(b => b[0] === k[0])), o = base[base.length - 1]; return [...base.slice(0, -1), ...extra, o]; };
const catIcon = (t, c) => (catsDe(t).find(k => k[0] === c) || catsDe(t === 'in' ? 'out' : 'in').find(k => k[0] === c) || [0, t === 'in' ? '💰' : '📦'])[1];
const CAT_ICS = ['🏠', '🛒', '💡', '🚗', '💊', '📚', '🎉', '🍔', '📺', '💳', '🛍', '📦', '💼', '🚀', '🎁', '🏷', '💰', '🎯', '⭐', '🧠', '🏦', '📲', '✂', '🌱', '💚', '🏆', '⚡', '🔥'];
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
const kPreco = (m, g) => !isFinite(g) ? 'n' : m >= 0.2 ? 'b' : m <= -0.1 ? 'c' : 'j';
const KP_T = { b: 'Barata', j: 'Preço justo', c: 'Cara', n: 'Sem preço justo' };
const aFromQ = q => ({ price: q.preco, lpa: q.lpa, vpa: q.vpa, dy: q.dy || 0, roe: q.roe, payout: q.payout || 0, div: q.div_ebitda, fin: q.financeira, nodiv: !q.financeira && q.div_ebitda == null });
let PER_ATUAL = null;
function periodoAtual() { if (!DATA || !DATA.acoes) return null; if (PER_ATUAL && PER_ATUAL.d === DATA) return PER_ATUAL.p; const c = {}; for (const q of Object.values(DATA.acoes)) if (q.periodo) c[q.periodo] = (c[q.periodo] || 0) + 1; const p = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; PER_ATUAL = { d: DATA, p: p && p[0] }; return PER_ATUAL.p; }
function analyze(a, o) {
  const st = { ...S.settings, ...(o && o.plMax ? { plMax: o.plMax } : {}) };
  const pl = a.lpa > 0 ? a.price / a.lpa : NaN;
  const pvp = a.vpa > 0 ? a.price / a.vpa : NaN;
  const ey = a.price > 0 ? a.lpa / a.price : NaN;
  const graham = a.lpa > 0 && a.vpa > 0 ? Math.sqrt(22.5 * a.lpa * a.vpa) : NaN;
  const margem = isFinite(graham) ? 1 - a.price / graham : NaN;
  const cres = Math.max(0, Math.min((a.roe || 0) * (1 - Math.min(1, a.payout || 0)), st.cresMax));
  const dyB = a.dy || 0, dyU = Math.min(dyB, isFinite(ey) ? Math.max(0, ey) : 0), dyCort = dyB - dyU > 0.005;
  const pontual = isFinite(pl) && pl > 0 && pl < 3;
  const ret = dyU + cres;
  const regua = o && o.regua != null ? o.regua : st.selic + st.premio;
  const c = [
    { k: 'roe', n: 'ROE de pelo menos ' + pct(st.roeMin, 0), d: 'Lucro alto sobre o próprio capital', ok: a.roe >= st.roeMin, v: pct(a.roe) },
    a.fin ? { k: 'div', n: 'Dívida: não se aplica', d: 'Bancos e seguradoras não usam EBITDA', ok: true, v: 'n/a' }
      : a.nodiv ? { k: 'div', n: 'Dívida: EBITDA negativo', d: 'A empresa não gerou caixa operacional para medir a dívida', ok: false, v: 'n/d' }
      : { k: 'div', n: 'Dívida até ' + x(st.dividaMax) + ' o EBITDA', d: 'A dívida cabe no caixa que ela gera', ok: a.div <= st.dividaMax, v: x(a.div) },
    { k: 'pl', n: 'P/L entre 3 e ' + nf(st.plMax, 0), d: 'Nem caro, nem lucro pontual', ok: isFinite(pl) && pl >= 3 && pl <= st.plMax, v: x(pl) },
    { k: 'ret', n: 'Retorno acima de ' + pct(regua), d: o && o.rtxt ? o.rtxt : 'Rende mais que Selic + risco da bolsa', ok: ret > regua, v: pct(ret) }
  ];
  const okN = c.filter(k => k.ok).length;
  const folga = ret - regua;
  const verdict = okN === 4 ? (folga >= 0.01 ? 'ok' : 'mid') : 'no';
  return { pl, pvp, ey, graham, margem, cres, ret, regua, folga, c, okN, verdict, dyB, dyU, dyCort, pontual, kp: kPreco(margem, graham), abaixoGraham: isFinite(graham) && a.price < graham };
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
    .filter(k => k.r.okN === 4 && !k.r.pontual && !k.r.dyCort).sort((a, b) => a.c.localeCompare(b.c));
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
      lg = { step: 0, email: '', msg: '', busy: false, wait: 0 }; save(); render(); carregaDados(); toast('Acesso liberado! 🎉'); return;
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
const GEAR = () => `<button class="iconbtn gearbtn" id="gear" aria-label="Ajustes">${ICON.gear}</button>`;
let voltarDe = 'inicio';
function go(r) { if (r === 'ajustes' && route !== 'ajustes') voltarDe = route; route = r; render(); window.scrollTo({ top: 0 }); history.replaceState(null, '', '#' + r); }
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(b.dataset.go)));
$('#fab').addEventListener('click', () => { if (route === 'analisar') { const i = $('[data-a="code"]'); if (i) { window.scrollTo({ top: 0, behavior: 'smooth' }); i.focus(); } } else go('analisar'); });

const REAC = { k: '', t: 0 };
function render() {
  if (render.busy) return; render.busy = true;
  try { renderNow(); } finally { render.busy = false; }
}
function renderNow() {
  const app = $('#app');
  if (!authed()) { $('#tabbar').hidden = true; document.querySelector('.tabfade').hidden = true; app.innerHTML = viewLogin(); bindLogin(); return; }
  $('#tabbar').hidden = !S.onboarded; document.querySelector('.tabfade').hidden = !S.onboarded;
  if (!S.onboarded) { app.innerHTML = viewOnb(); bindOnb(); return; }
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.dataset.go === route));
  $('#fab').classList.toggle('on', route === 'analisar');
  const v = { inicio: viewHome, analisar: viewAnalisar, carteira: viewCarteira, mais: viewMais, lancamentos: viewLanc, ajustes: viewAjustes, ranking: viewRanking, comparar: viewComparar }[route] || viewHome;
  if (route === 'ranking' || route === 'comparar') $('#fab').classList.add('on');
  requestAnimationFrame(moveTabInd);
  const keep = {}; document.querySelectorAll('#app [id]').forEach(el => { if (el.scrollLeft) keep[el.id] = el.scrollLeft; });
  const anim = render.last !== route; render.last = route;
  const html = v(); document.documentElement.dataset.tipo = route === 'analisar' ? anTipo : route;
  const imgsAnt = {}; app.querySelectorAll('img').forEach(im => { const k = im.outerHTML; (imgsAnt[k] = imgsAnt[k] || []).push(im); });
  app.innerHTML = deEmoji(`<div class="stack${anim ? ' fade-in' : ''}">${html}</div>`);
  if (!anim) app.querySelectorAll('img').forEach(im => { const l = imgsAnt[im.outerHTML]; const velho = l && l.shift(); if (velho) { velho.style.animationDelay = ''; im.replaceWith(velho); } });
  app.querySelectorAll('img.reac').forEach(im => {
    const k = route + '|' + anTipo + '|' + resKey + '|' + im.getAttribute('src'), agora = performance.now();
    if (REAC.k === k && agora - REAC.t < 3500) { const d = Math.round(agora - REAC.t); im.style.animationDelay = `-${d}ms, ${450 - d}ms`; }
    else { REAC.k = k; REAC.t = agora; }
  });
  bind();
  for (const id in keep) { const el = document.getElementById(id); if (el) el.scrollLeft = keep[id]; }
  animaAnalise();
  if (route === 'inicio') homeFx(anim);
}
const HOME = { t: -1e9 };
function homeFx(novo) {
  if (ANI_RM.matches) return;
  const agora = performance.now(); if (novo || HOME.t < 0) HOME.t = agora;
  const d = agora - HOME.t, st = document.querySelector('#app > .stack'); if (!st || d > 2600) return;
  st.style.setProperty('--el', Math.round(d) + 'ms'); st.classList.add('hani');
  let i = 0; [...st.children].forEach(c => { if (!c.classList.contains('hx') && !c.classList.contains('sr-only')) c.style.setProperty('--i', i++); });
  st.querySelectorAll('.op-r').forEach((r, j) => r.style.setProperty('--j', j));
  st.querySelectorAll('.nw').forEach((r, j) => r.style.setProperty('--j', Math.min(j, 6)));
  st.querySelectorAll('.mkt-track > .mkt-t').forEach((r, j) => r.style.setProperty('--j', j % 8));
  st.querySelectorAll('.mkt-t b.num, .op-r > b.num').forEach(el => contaUp(el, HOME.t + 250));
}
/* ---------- animações das análises ---------- */
const ANI = { key: '', seen: new Set() }, ANI_RM = matchMedia('(prefers-reduced-motion: reduce)');
function contaUp(el, t0 = performance.now()) {
  if (el.children.length || el.dataset.cu) return;
  const t = el.textContent, m = t.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/);
  if (!m) return;
  const dec = (m[0].split(',')[1] || '').length, alvo = +m[0].replace(/\./g, '').replace(',', '.');
  if (!isFinite(alvo) || alvo === 0) return;
  const ini = t.slice(0, m.index), fim = t.slice(m.index + m[0].length), fmt = v => ini + v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + fim;
  el.dataset.cu = 1; const D = 750;
  const passo = now => { if (!el.isConnected) return; const p = Math.max(0, Math.min(1, (now - t0) / D)), e = 1 - Math.pow(1 - p, 3); el.textContent = p < 1 ? fmt(alvo * e) : t; if (p < 1) requestAnimationFrame(passo); };
  if (performance.now() - t0 >= D) return;
  el.textContent = fmt(alvo * (1 - Math.pow(1 - Math.max(0, Math.min(1, (performance.now() - t0) / D)), 3))); requestAnimationFrame(passo);
}
function entra(pane, dec = 0) {
  pane.style.setProperty('--el', dec + 'ms');
  [...pane.children].slice(0, 14).forEach((c, i) => c.style.setProperty('--i', i));
  pane.querySelectorAll('.metrics4,.critgrid,.rfh-st').forEach(g => [...g.children].forEach((c, j) => c.style.setProperty('--j', j)));
  pane.classList.add('ani');
  const t0 = performance.now() - dec;
  pane.querySelectorAll('.metrics4 b.num, .rfbig, .rfh-st b, .rend-top b, .pz-nums b, .cg b.num').forEach((el, i) => { if (i < 36) contaUp(el, t0); });
}
function animaAnalise() {
  if (route !== 'analisar' || ANI_RM.matches) return;
  let k, pane;
  if (anTipo === 'rf') { pane = document.getElementById('rfres'); k = 'rf|' + [rfS.tipo, rfS.modo, rfS.taxa, rfS.prazo, rfS.valor].join('|'); }
  else { pane = document.querySelector('[data-rp]:not([hidden])'); k = anTipo + '|' + resKey + '|' + resTab; }
  if (!pane || !pane.children.length) return;
  const novo = k !== ANI.key;
  if (novo) { ANI.key = k; ANI.seen = new Set(); ANI.t = performance.now(); entra(pane); }
  else if (!pane.classList.contains('ani') && performance.now() - (ANI.t || 0) < 2200) entra(pane, Math.round(performance.now() - ANI.t));
  const agora = performance.now(); ANI.gt = novo ? {} : (ANI.gt || {});
  pane.querySelectorAll('.gr, .rend').forEach(g => {
    const gk = (g.querySelector('h3') || {}).textContent || '';
    if (!ANI.seen.has(gk)) { ANI.seen.add(gk); if (!novo) { ANI.gt[gk] = agora; g.classList.add('ani-gr'); g.querySelectorAll('b.num').forEach(el => contaUp(el, agora)); } }
    else if (ANI.gt[gk] && !g.classList.contains('ani-gr') && agora - ANI.gt[gk] < 1600) { g.style.setProperty('--el', Math.round(agora - ANI.gt[gk]) + 'ms'); g.classList.add('ani-gr'); g.querySelectorAll('b.num').forEach(el => contaUp(el, ANI.gt[gk])); }
  });
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
    if (ONB[onbStep].name) { S.name = ($('#oname').value || '').trim().slice(0, 24); S.onboarded = true; save(); route = 'inicio'; carregaDados(); render(); return; }
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
  <h1 class="sr-only">Início: taxas de hoje, oportunidades e notícias</h1>
  <div class="hx" aria-hidden="true"><i></i><i></i></div>
  <header class="hdr">
    <div class="hello"><div class="avatar"><img src="img/icon.webp" alt=""><em>${level(G().xp).n}</em></div><div><p class="tiny muted">${greet()}</p><b class="nm">${S.name ? esc(S.name) : 'Futuro rico'}</b></div></div>
    <div class="row" style="gap:6px">${streakChip()}${GEAR()}</div>
  </header>
  ${hojeCard()}
  ${mercadoHoje()}
  ${oportunidades()}
  ${noticiasCard()}
  ${radarCard()}`;
}
/* ---------- INÍCIO: MERCADO HOJE, OPORTUNIDADES E NOTÍCIAS ---------- */
function mercadoHoje() {
  const m = mercadoX(), E = EXTRA.eua, R = EXTRA.rf;
  if (!R) loadExtra('rf'); if (!E) loadExtra('eua');
  const tit = (tp, ano) => { if (!R) return null; const xs = R.titulos.filter(k => k.tipo === tp && k.vencimento > today()).sort((a, b) => a.vencimento.localeCompare(b.vencimento)); return ano ? xs.find(k => k.vencimento.startsWith(ano)) || xs[xs.length - 1] : xs[xs.length - 1]; };
  const ipca = tit('NTN-B', '2035'), pre = tit('LTN', '2031') || tit('LTN'), sp = '…';
  const tiles = [
    ['Selic', m.selic ? pct(m.selic.valor, 2) : sp, 'ao ano', 'regua', null, 'acoes'],
    ['CDI', m.cdi ? pct(m.cdi.valor, 2) : sp, 'ao ano', 'rcdi', null, 'acoes'],
    ['IPCA', m.ipca12m ? pct(m.ipca12m.valor, 2) : sp, '12 meses', 'rreal', null, 'ipca'],
    ['Poupança', m.poupanca ? pct(m.poupanca.valor, 2) : sp, 'ao ano', 'rpoup', null, 'fiis'],
    ['Tesouro IPCA+ ' + (ipca ? ipca.vencimento.slice(0, 4) : '2035'), ipca ? 'IPCA + ' + pct(ipca.taxa, 2) : sp, 'taxa de hoje', null, ipca ? `TI|${ipca.vencimento}|${ipca.taxa}` : null, 'rf'],
    ['Prefixado ' + (pre ? pre.vencimento.slice(0, 4) : '2031'), pre ? pct(pre.taxa, 2) : sp, 'ao ano', null, pre ? `TP|${pre.vencimento}|${pre.taxa}` : null, 'rf'],
    ['Dólar', E && E.dolar ? brl(E.dolar.valor, 2) : sp, 'PTAX', 'emreais', null, 'eua'],
    ['Juro EUA 10a', E && E.treasury10 ? pct(E.treasury10.valor, 2) : sp, 'Treasury', null, null, 'eua']
  ];
  return `<section class="mkt">
    <div class="row between"><h2 class="sec-h" style="margin:0"><i class="live" aria-hidden="true"></i>Taxas de hoje</h2><span class="tiny muted">Banco Central · ANBIMA</span></div>
    <div class="mkt-s"><div class="mkt-track">${[0, 1].map(dup => tiles.map(([n, v, sub, info, rf, cor]) => `<${rf ? `button data-hrf="${rf}"` : 'div'} class="mkt-t${rf ? ' go' : ''}" data-c="${cor || 'acoes'}"${dup ? ' aria-hidden="true"' : ''}><span>${n}${info && !dup ? ' ' + iB(info) : info ? ' <span class="ib" aria-hidden="true">i</span>' : ''}</span><b class="num">${v}</b><small>${rf ? 'simular ›' : sub}</small></${rf ? 'button' : 'div'}>`).join('')).join('')}</div></div>
  </section>`;
}
let opT = 'acoes';
function oportunidades() {
  const T = [['acoes', 'Ações'], ['eua', 'EUA'], ['fiis', 'FIIs'], ['rf', 'Renda fixa']];
  for (const k of ['fiis', 'eua', 'rf']) if (!EXTRA[k]) loadExtra(k);
  let rows = '', vazio = 'Carregando…';
  const row = (attr, c, nome, v, sub, k) => `<button class="op-r" ${attr}><span class="op-c">${c}</span><span class="op-n"><b>${esc(nome)}</b><small>${sub}</small></span>${k ? `<span class="kp kp-${k}">${KP_T[k].replace('Sem preço justo', 'n/d').replace('Preço justo', 'Justa')}</span>` : '<span></span>'}<b class="num g">${v}</b></button>`;
  if (opT === 'acoes' && DATA && DATA.acoes) rows = rankingDados().filter(k => k.r.okN === 4).sort((a, b) => (b.r.kp === 'b') - (a.r.kp === 'b') || b.r.ret - a.r.ret).filter((k, i, arr) => arr.findIndex(z => z.c.slice(0, 4) === k.c.slice(0, 4)) === i).slice(0, 3).map(k => row(`data-hop="acoes|${k.c}"`, k.c, (k.q.nome || '').split(' ').slice(0, 2).join(' ').replace(/[,.&-]+$/, '').trim(), pct(k.r.ret), 'retorno esperado/ano', k.r.kp)).join('');
  if (opT === 'eua' && EXTRA.eua) rows = euaTodos().filter(k => k.r.okN === 4).sort((a, b) => (b.r.kp === 'b') - (a.r.kp === 'b') || b.r.ret - a.r.ret).slice(0, 3).map(k => row(`data-hop="eua|${k.c}"`, k.c, k.q.nome.split(' ').slice(0, 2).join(' ').replace(/[,.&-]+$/, ''), pct(k.r.ret), 'retorno esperado/ano', k.r.kp)).join('');
  if (opT === 'fiis' && EXTRA.fiis) rows = fiiTodos().filter(k => k.r.okN === 4).sort((a, b) => b.q.dy - a.q.dy).slice(0, 3).map(k => row(`data-hop="fiis|${k.c}"`, k.c, k.q.tipo + ' · P/VP ' + x(k.q.pvp, 2), pct(k.q.dy), 'rende/ano, isento de IR', null)).join('');
  if (opT === 'rf' && EXTRA.rf) {
    const R = EXTRA.rf, fut = R.titulos.filter(k => k.vencimento > today());
    const best = tp => fut.filter(k => k.tipo === tp).sort((a, b) => b.taxa - a.taxa)[0];
    rows = [['TI', 'NTN-B', 'Tesouro IPCA+', k => 'IPCA + ' + pct(k.taxa, 2), 'maior juro real de hoje'], ['TP', 'LTN', 'Tesouro Prefixado', k => pct(k.taxa, 2), 'maior taxa prefixada'], ['TS', 'LFT', 'Tesouro Selic', k => 'Selic + ' + pct(k.taxa, 3), 'liquidez diária, reserva']].map(([rt, tp, nm, fv, sub]) => { const k = best(tp); return k ? row(`data-hrf="${rt}|${k.vencimento}|${k.taxa}"`, k.vencimento.slice(0, 4), nm, fv(k), sub, null) : ''; }).join('');
  }
  if (!rows && (opT === 'acoes' ? DATA && DATA.acoes : EXTRA[opT])) vazio = 'Nada passa nos critérios hoje.';
  return `<section class="card op" data-c="${opT}">
    <div class="row between"><h3>Oportunidades do filtro</h3><button class="link" data-hopall="${opT}">ver todas</button></div>
    <div class="seg3 seg4 op-t" id="opt">${T.map(([k, l]) => `<button data-opt="${k}" data-c="${k}" class="${opT === k ? 'on' : ''}"><i class="cdot"></i>${l}</button>`).join('')}</div>
    <div class="list op-l">${rows || `<p class="small muted" style="padding:10px 0">${vazio}</p>`}</div>
    <p class="tiny dim">${opT === 'rf' ? 'Maiores taxas indicativas dos títulos públicos hoje (ANBIMA).' : opT === 'fiis' ? 'FIIs que passam nos 4 critérios, maior rendimento primeiro.' : 'Passam nos 4 critérios; as baratas (abaixo do preço justo) primeiro.'} Educativo, não é recomendação.</p>
  </section>`;
}
let notT = 'tudo', notN = 5;
function quandoTxt(d) { const m = Math.max(0, (Date.now() - new Date(d)) / 6e4); return m < 60 ? 'há ' + Math.max(1, Math.round(m)) + ' min' : m < 1440 ? 'há ' + Math.round(m / 60) + ' h' : 'há ' + Math.round(m / 1440) + ' d'; }
function noticiasCard() {
  const N = EXTRA.noticias; if (!N) { loadExtra('noticias'); return ''; }
  const minhas = new Set(S.assets.map(a => (a.code || '').toUpperCase()));
  const T = [['tudo', 'Tudo'], ['bolsa', 'Bolsa'], ['juros', 'Juros'], ['fii', 'FIIs'], ['dividendos', 'Dividendos'], ['mundo', 'Mundo']];
  const lista = N.noticias.filter(n => notT === 'tudo' || n.tema === notT).sort((a, b) => (b.tickers.some(t => minhas.has(t)) - a.tickers.some(t => minhas.has(t))) || b.quando.localeCompare(a.quando));
  return `<section class="card nws">
    <div class="row between"><h3>Notícias</h3><span class="tiny muted">${N.gerado ? 'atualizado ' + quandoTxt(N.gerado) : ''}</span></div>
    <div class="chips scroll" id="nwt">${T.map(([k, l]) => `<button data-nwt="${k}" data-c="n-${k}" class="${notT === k ? 'on' : ''}">${k === 'tudo' ? '' : '<i class="cdot"></i>'}${l}</button>`).join('')}</div>
    <div class="nws-l">${lista.slice(0, notN).map(n => `<a class="nw" data-c="n-${n.tema}" href="${esc(n.link)}" target="_blank" rel="noopener noreferrer"><span class="nw-t">${esc(n.titulo)}</span><span class="nw-m">${n.tickers.filter(t => minhas.has(t)).map(t => `<em>${t} · sua carteira</em>`).join('')}<i class="cdot"></i>${{ bolsa: 'Bolsa', juros: 'Juros', fii: 'FIIs', dividendos: 'Dividendos', mundo: 'Mundo' }[n.tema] || ''} · ${esc(n.fonte)} · ${quandoTxt(n.quando)}</span></a>`).join('') || '<p class="small muted">Sem notícias deste tema agora.</p>'}</div>
    ${lista.length > notN ? `<button class="more" id="nwmore">Mais notícias</button>` : ''}
    <p class="tiny dim">Manchetes com link para a matéria original no site de cada veículo.</p>
  </section>`;
}
/* faixa de taxas: rola sozinha; dá para deslizar com o dedo e ela volta a rolar 2 s depois */
const MKT = { pos: 0, esperado: -1, ultimo: -1e9, tocando: false, t0: 0, el: null };
const MKT_RM = matchMedia('(prefers-reduced-motion: reduce)');
addEventListener('resize', () => { MKT.meio = 0; }, { passive: true });
function mktLoop(t) {
  const el = document.querySelector('.mkt-s');
  if (el !== MKT.el) {
    MKT.el = el;
    if (el) {
      el.scrollLeft = MKT.pos; MKT.esperado = el.scrollLeft; MKT.meio = 0; MKT.visivel = true;
      if ('IntersectionObserver' in window) { if (MKT.io) MKT.io.disconnect(); MKT.io = new IntersectionObserver(es => { MKT.visivel = es[0].isIntersecting; }); MKT.io.observe(el); }
      const mexeu = () => { MKT.ultimo = performance.now(); };
      el.addEventListener('pointerdown', () => { MKT.tocando = true; mexeu(); }, { passive: true });
      el.addEventListener('touchstart', () => { MKT.tocando = true; mexeu(); }, { passive: true });
      const solta = () => { MKT.tocando = false; mexeu(); };
      el.addEventListener('pointerup', solta, { passive: true }); el.addEventListener('pointercancel', solta, { passive: true });
      el.addEventListener('touchend', solta, { passive: true }); el.addEventListener('touchcancel', solta, { passive: true });
      el.addEventListener('wheel', mexeu, { passive: true });
      el.addEventListener('scroll', () => { if (el !== MKT.el || !el.isConnected) return; if (Math.abs(el.scrollLeft - MKT.esperado) > 1.5) { mexeu(); MKT.pos = el.scrollLeft; } }, { passive: true });
    }
  }
  const dt = MKT.t0 ? Math.min(64, t - MKT.t0) : 0; MKT.t0 = t;
  if (el && !document.hidden && MKT.visivel !== false) {
    if (MKT.meioEl !== el || !MKT.meio || t - (MKT.mt || 0) > 1500) { MKT.mt = t; const tr = el.firstElementChild; MKT.meio = tr ? (tr.scrollWidth + 8) / 2 : 0; MKT.meioEl = el; MKT.cw = el.clientWidth; }
    const meio = MKT.meio;
    const parado = MKT.tocando || t - MKT.ultimo < 2000 || MKT_RM.matches;
    if (meio > MKT.cw / 2) {
      if (!parado) MKT.pos += dt * 0.028;
      else if (MKT.tocando || t - MKT.ultimo < 2000) MKT.pos = el.scrollLeft;
      if (MKT.pos >= meio) MKT.pos -= meio;
      if (MKT.pos < 1 && parado && !MKT.tocando && MKT.ultimo > 0 && t - MKT.ultimo > 300) MKT.pos += meio;
      if (!parado || Math.abs(el.scrollLeft - MKT.pos) > 2) { el.scrollLeft = MKT.pos; MKT.esperado = el.scrollLeft; }
    }
  }
  requestAnimationFrame(mktLoop);
}
requestAnimationFrame(mktLoop);
function bindBusca() {
  document.querySelectorAll('.sbar').forEach(sb => {
    if (sb.querySelector('.sfechar')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'sfechar'; b.setAttribute('aria-label', 'Fechar opções'); b.innerHTML = 'Fechar <span>✕</span>';
    b.addEventListener('pointerdown', e => e.preventDefault());
    b.onclick = () => { sb.classList.remove('open'); const i = sb.querySelector('input'); if (i) i.blur(); };
    sb.appendChild(b);
  });
}
function moveTabInd() {
  const bar = $('#tabbar'); if (!bar || bar.hidden) return;
  let ind = bar.querySelector('.tabind'); if (!ind) { ind = document.createElement('i'); ind.className = 'tabind'; ind.setAttribute('aria-hidden', 'true'); bar.prepend(ind); }
  const on = bar.querySelector('.tab.on, .fab.on'); if (!on) { ind.style.opacity = 0; return; }
  const br = bar.getBoundingClientRect(), r = on.getBoundingClientRect(), w = Math.min(r.width - 8, 64);
  ind.style.opacity = 1; ind.style.width = w + 'px'; ind.style.transform = `translateX(${r.left - br.left + (r.width - w) / 2}px)`;
  ind.style.color = getComputedStyle(on).color;
}
addEventListener('resize', () => requestAnimationFrame(moveTabInd));
function bindHome() {
  const mk = document.querySelector('.mkt-s'); if (mk) { mk.scrollLeft = MKT.pos; MKT.esperado = mk.scrollLeft; }
  document.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { opT = b.dataset.opt; render(); });
  document.querySelectorAll('[data-nwt]').forEach(b => b.onclick = () => { notT = b.dataset.nwt; notN = 5; render(); });
  const nm = $('#nwmore'); if (nm) nm.onclick = () => { notN += 10; render(); };
  document.querySelectorAll('[data-hop]').forEach(b => b.onclick = () => { const [k, c] = b.dataset.hop.split('|'); anTipo = k; if (k === 'acoes') { route = 'analisar'; history.replaceState(null, '', '#analisar'); fillFromData(c); window.scrollTo({ top: 0 }); return; } if (k === 'fiis') fiiSel = c; else euaSel = c; go('analisar'); window.scrollTo({ top: 0 }); });
  document.querySelectorAll('[data-hopall]').forEach(b => b.onclick = () => { const k = b.dataset.hopall; anTipo = k; if (k === 'fiis') fiiSel = ''; if (k === 'eua') euaSel = ''; if (k === 'acoes') draft = { code: '', price: '', lpa: '', vpa: '', dy: '', roe: '', payout: '', div: '', src: null }; go('analisar'); window.scrollTo({ top: 0 }); });
  document.querySelectorAll('[data-hrf]').forEach(b => b.onclick = () => { const [tp, venc, tx] = b.dataset.hrf.split('|'); const mm = Math.max(1, Math.round((new Date(venc) - new Date()) / 2.63e9)); anTipo = 'rf'; rfS = { ...rfS, tipo: tp, taxa: nf(+tx * 100, tp === 'TS' ? 3 : 2), prazo: String(mm) }; go('analisar'); window.scrollTo({ top: 0 }); });
}

/* ---------- LANÇAMENTOS ---------- */
const CAT_COR = { 'Moradia': '#5B7CFF', 'Mercado': '#22D68A', 'Contas': '#F5C13D', 'Transporte': '#4FC3F7', 'Saúde': '#FF7AA2', 'Educação': '#A77BFF', 'Lazer': '#FF9F43', 'Restaurante': '#FF5C7A', 'Assinaturas': '#2DD4BF', 'Cartão/dívidas': '#E25555', 'Compras': '#F472B6', 'Outros': '#8189B0' };
const CAT_PAL = ['#7AA2FF', '#B79CFF', '#4FD1C5', '#FFB27A', '#FF8FA3', '#F5C13D', '#22D68A', '#4FC3F7'];
const catCor = c => CAT_COR[c] || (c && c !== 'Outros' ? CAT_PAL[[...String(c)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7) % CAT_PAL.length] : '#8189B0');
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
    <div class="row" style="gap:6px"><div class="monthpill"><button id="mprev" aria-label="Mês anterior">${ICON.left}</button><b>${MES3[mm - 1]}<span class="yy"> ${yy}</span></b><button id="mnext" aria-label="Próximo mês">${ICON.right}</button></div>${GEAR()}</div></header>
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
  const chips = () => catsDe(type).map(([c, i]) => `<button data-cat="${esc(c)}" class="${c === cat ? 'on' : ''}">${i} ${esc(c)}</button>`).join('') + '<button type="button" class="catnew" id="tcatnew">＋ Nova</button>';
  let novoIc = '🏷';
  const novoBox = () => `<div class="catbox"><div class="row between"><b class="small">Nova categoria de ${type === 'in' ? 'receita' : 'gasto'}</b><button type="button" class="catx" id="tcatfecha" aria-label="Fechar">✕</button></div>
    <div class="inp"><input id="tcatnome" maxlength="22" placeholder="${type === 'in' ? 'Ex.: Aluguel recebido' : 'Ex.: Pet, Academia'}" enterkeyhint="done" autocomplete="off"></div>
    <div class="catics" id="tcatics">${CAT_ICS.map((i, n) => `<button type="button" data-ic="${n}" class="${i === novoIc ? 'on' : ''}">${i}</button>`).join('')}</div>
    <button type="button" class="btn sm" id="tcatcria">Criar categoria</button>
    ${(S.cats[type] || []).length ? `<div class="catmine"><span class="tiny muted">Suas categorias</span>${S.cats[type].map(([c, i]) => `<span class="catm">${i} ${esc(c)}<button type="button" data-catdel="${esc(c)}" aria-label="Remover ${esc(c)}">✕</button></span>`).join('')}</div>` : ''}</div>`;
  openSheet(`<div class="stack">
    ${ed ? '<h2>Editar lançamento</h2>' : ''}
    <div class="seg"><button data-t="out" class="${type === 'out' ? 'on r' : ''}">Gasto</button><button data-t="in" class="${type === 'in' ? 'on g' : ''}">Receita</button></div>
    <div class="amount"><span>R$</span><input id="tval" inputmode="decimal" placeholder="0,00" autocomplete="off" value="${ed ? ed.value.toFixed(2).replace('.', ',') : ''}"></div>
    <div class="chips scroll2" id="tcats">${chips()}</div>
    <div id="tcatbox" hidden></div>
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
      $('#tcats').innerHTML = deEmoji(chips()); $('#tcatbox').hidden = true;
    });
    if (pre === 'in') { const bi = box.querySelector('[data-t="in"]'); bi && bi.click(); }
    const te = $('#tesc'); if (te) te.onclick = e => { const b = e.target.closest('[data-e]'); if (!b) return; escopo = b.dataset.e; te.querySelectorAll('button').forEach(k => k.classList.toggle('on', k === b)); };
    const cb = $('#tcatbox');
    const abreNovo = () => { cb.innerHTML = deEmoji(novoBox()); cb.hidden = false; setTimeout(() => { const i = $('#tcatnome'); if (i) i.focus(); }, 50); };
    const cria = () => {
      const nome = ($('#tcatnome').value || '').trim().replace(/\s+/g, ' ').slice(0, 22);
      if (!nome) { toast('Digite o nome da categoria'); $('#tcatnome').focus(); return; }
      const ja = catsDe(type).find(k => k[0].toLowerCase() === nome.toLowerCase());
      if (!ja) { S.cats[type] = [...(S.cats[type] || []), [nome, novoIc]]; save(); }
      cat = ja ? ja[0] : nome; $('#tcats').innerHTML = deEmoji(chips()); cb.hidden = true;
      const on = $('#tcats').querySelector('.on'); if (on) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      toast(ja ? 'Essa categoria já existe' : 'Categoria criada ✔');
    };
    cb.onclick = e => {
      const ic = e.target.closest('[data-ic]'), del = e.target.closest('[data-catdel]');
      if (ic) { novoIc = CAT_ICS[+ic.dataset.ic]; cb.querySelectorAll('[data-ic]').forEach(k => k.classList.toggle('on', k === ic)); return; }
      if (e.target.closest('#tcatfecha')) { cb.hidden = true; return; }
      if (e.target.closest('#tcatcria')) { cria(); return; }
      if (del) { const n = del.dataset.catdel; S.cats[type] = (S.cats[type] || []).filter(k => k[0] !== n); save(); if (cat === n) cat = null; $('#tcats').innerHTML = deEmoji(chips()); abreNovo(); toast('Categoria removida. Lançamentos antigos continuam com o nome.'); }
    };
    cb.onkeydown = e => { if (e.key === 'Enter' && e.target.id === 'tcatnome') { e.preventDefault(); cria(); } };
    $('#tcats').onclick = e => { if (e.target.closest('#tcatnew')) { if (cb.hidden) abreNovo(); else cb.hidden = true; return; } const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; $('#tcats').querySelectorAll('[data-cat]').forEach(k => k.classList.toggle('on', k === b)); };
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
  vmerc: { t: 'Valor de mercado', ic: '🏦', o: 'Quanto a bolsa diz que a empresa inteira vale hoje: preço da ação × número total de ações.', p: 'Mostra o tamanho da empresa. Empresas grandes costumam ser mais estáveis e negociadas.', l: 'Não diz se está cara ou barata. Para isso, compare com o lucro (P/L) e o patrimônio (P/VP).', f: 'preço × total de ações' },
  cotistas: { t: 'Cotistas', ic: '👏', o: 'Quantas pessoas têm cotas do fundo, segundo o último informe mensal na CVM.', p: 'Muitos cotistas costumam significar um fundo conhecido e fácil de negociar.', l: 'Não garante qualidade: confira o rendimento, o P/VP e a liquidez.', f: 'número informado pelo fundo no informe mensal da CVM' },
  plfii: { t: 'Patrimônio do fundo', ic: '🏦', o: 'O valor de tudo que o fundo tem (imóveis, títulos, caixa) menos o que ele deve.', p: 'Fundos maiores diluem melhor o risco de um imóvel vazio ou de um crédito que não paga.', l: 'Acima de R$ 1 bilhão é um fundo grande. Abaixo de R$ 300 milhões, pequeno.', f: 'ativos do fundo − obrigações (informe mensal da CVM)' },
  cota: { t: 'Preço da cota', ic: '🏷', o: 'Quanto custa uma cota do fundo na B3, no último fechamento.', p: 'É o valor que você paga para comprar uma cota hoje.', l: 'Compare com o patrimônio por cota (P/VP) para saber se está com desconto ou ágio.', f: 'último preço negociado na B3 (COTAHIST)' },
  emreais: { t: 'Preço em reais', ic: '💸', o: 'O preço da ação em dólar convertido pelo dólar PTAX do Banco Central.', p: 'Ajuda a ter ideia de quanto custa uma ação inteira em reais.', l: 'Na prática, pela B3 você compra BDRs, que podem representar uma fração da ação. O preço do BDR é diferente.', f: 'preço em US$ × dólar PTAX' },
  cres5: { t: 'Crescimento do lucro em 5 anos', ic: '📈', o: 'Quanto o lucro cresceu por ano, em média, comparando o último balanço anual com o de cerca de 5 anos antes.', p: 'Mostra se a empresa vem ganhando mais com o tempo.', l: 'Se o lucro de 5 anos atrás era muito baixo, o número fica exagerado. Use como pista, não como previsão.', f: '(lucro hoje ÷ lucro antes) ^ (1 ÷ anos) − 1' },
  fpaga: { t: 'Quanto paga por mês', ic: '🪙', o: 'Média do rendimento pago por cota em cada mês, nos últimos 12 meses de informes da CVM.', p: 'É o que você recebe, em média, por cota que tiver.', l: 'Rendimento de FII é isento de IR para pessoa física nas condições da lei. O valor muda de mês a mês.', f: 'rendimento de 12 meses ÷ 12' },
  fdy: { t: 'Rendimento do FII', ic: '💰', o: 'Quanto o fundo pagou por cota nos últimos 12 meses, dividido pelo preço da cota hoje.', p: 'Rendimento de FII é isento de IR para pessoa física. Por isso a régua é 85% do CDI: é o que um CDB de 100% do CDI entrega depois do imposto, mais ou menos.', l: 'Acima da régua: o fundo paga mais que a renda fixa sem risco. Rendimento muito alto pode ser pontual.', f: 'soma dos rendimentos de 12 meses ÷ preço da cota' },
  fpvp: { t: 'P/VP do fundo', ic: '🏷', o: 'Preço da cota dividido pelo valor patrimonial por cota (o valor dos imóveis ou títulos do fundo, menos as dívidas, dividido pelas cotas).', p: 'Mostra se você paga mais ou menos do que o patrimônio vale.', l: 'Abaixo de 1: desconto. Até 1,05: preço justo. Acima: ágio. Abaixo de 0,7 o desconto é tão grande que costuma indicar problema nos imóveis ou nos créditos do fundo, por isso não passa no filtro.', f: 'preço ÷ valor patrimonial por cota' },
  fliq: { t: 'Liquidez diária', ic: '💸', o: 'Média de quanto dinheiro o fundo negociou por dia na B3 no último mês.', p: 'Fundo com pouca negociação é difícil de vender sem baixar o preço.', l: 'R$ 500 mil por dia ou mais é confortável para o investidor pessoa física.', f: 'média do volume negociado por dia nos últimos 22 pregões' },
  fest: { t: 'Rendimento estável', ic: '📊', o: 'Compara o menor rendimento mensal dos últimos 6 meses com a média do período.', p: 'Quem vive de renda quer previsibilidade. Um fundo que oscila muito pode ter pago um valor alto pontual.', l: 'Estável: o pior mês pagou pelo menos 70% da média.', f: 'menor rendimento dos últimos 6 meses ≥ 70% da média dos 6 meses' },
  ftipo: { t: 'Tipo de fundo', ic: '🧱', o: 'Tijolo: tem imóveis e vive de aluguel. Papel: empresta para o setor imobiliário (CRI). Fundo de fundos: compra cotas de outros FIIs. Híbrido: mistura.', p: 'Cada tipo reage diferente aos juros e à economia.', l: 'Classificamos pelo que é mais de 60% do patrimônio no último informe da CVM.', f: 'parte do patrimônio em imóveis, em títulos (CRI, LCI…) ou em cotas de FII ≥ 60%' },
  fvac: { t: 'Vacância', ic: '🏠', o: 'Percentual da área dos imóveis do fundo que está vazia.', p: 'Imóvel vazio não paga aluguel e ainda gera custo (condomínio, IPTU).', l: 'Até 10% é saudável. Acima de 15% merece atenção.', f: 'área vaga ÷ área total, ponderada pelo valor de cada imóvel' },
  rreal: { t: 'Ganho real', ic: '🛡', o: 'Quanto o investimento rende acima da inflação, já descontado o IR.', p: 'Se rende menos que a inflação, seu dinheiro compra menos no futuro.', l: 'Positivo: você ganha poder de compra.', f: '(1 + rendimento líquido) ÷ (1 + IPCA) − 1' },
  rcdi: { t: 'Comparação com o CDI', ic: '📏', o: 'Mostra o rendimento líquido como percentual do que um CDB de 100% do CDI entregaria, com o mesmo IR, no mesmo prazo.', p: 'É a forma justa de comparar uma LCI isenta com um CDB tributado.', l: '100% ou mais: empata ou bate o CDB de referência.', f: 'rendimento líquido ÷ rendimento líquido de um CDB 100% do CDI no mesmo prazo' },
  rpoup: { t: 'Poupança', ic: '🏦', o: 'Rendimento da poupança nos últimos 12 meses (Banco Central).', p: 'É o piso: se nem a poupança você bate, não faz sentido travar o dinheiro.', l: 'Comparação já com o IR do investimento descontado.', f: 'rendimento líquido ao ano comparado ao da poupança (isenta de IR)' },
  rgar: { t: 'Garantia', ic: '🛡', o: 'CDB, LCI e LCA têm garantia do FGC até R$ 250 mil por CPF por instituição. Títulos do Tesouro são garantidos pelo governo federal.', p: 'Se o banco quebrar, a garantia devolve seu dinheiro dentro do limite.', l: 'Acima de R$ 250 mil no mesmo banco, o excedente fica sem garantia.', f: 'valor aplicado ≤ R$ 250 mil por instituição (FGC) ou título público' },
  rliq: { t: 'Rendimento líquido ao ano', ic: '🎯', o: 'Quanto o investimento rende por ano depois do IR e da taxa de custódia da B3 (Tesouro).', p: 'É o número que vai de fato para o seu bolso.', l: 'Compare sempre o líquido, nunca a taxa bruta.', f: '(valor final ÷ valor aplicado) ^ (1 ÷ anos) − 1, já sem IR e custódia' },
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
    l: 'Abaixo de 10 costuma ser barato, de 10 a 15 é justo e acima de 20 é caro (salvo empresas crescendo muito). P/L negativo significa prejuízo. Abaixo de 3 o filtro não aprova: quase sempre é lucro pontual (venda de ativo, efeito contábil) que não se repete.',
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
  const st = S.settings, c = infoCtx(k);
  if (!c || c.v == null || c.v === '—' || c.v === '') return '';
  const cls = c.ok == null ? '' : c.ok ? 'okc' : 'noc';
  return `<div class="card infonow ${cls}"><span class="tiny muted">${esc(c.nome)}</span><b class="num">${c.v}</b>${c.ok == null ? '' : `<span class="tiny ${c.ok ? 'g' : 'r'}">${c.ok ? '✓ passou' : '✕ não passou'}</span>`}${c.meta ? `<span class="tiny dim">${c.meta}</span>` : ''}${c.calc ? `<div class="calc"><span class="tiny muted">Cálculo com os números de hoje</span><code class="num">${c.calc}</code></div>` : ''}</div>`;
}
function infoCtx(k) {
  const st = S.settings, critOk = (r, kk) => { const z = r.c.find(c => c.k === kk); return z ? z.ok : null; };
  if (anTipo === 'acoes' || anTipo === 'eua') {
    let a, r, nome, M, rgTxt;
    if (anTipo === 'acoes') { a = lastA; r = lastR; if (!a || !r) return null; nome = a.code || 'Nesta ação'; M = v => brl(v); rgTxt = 'Selic ' + pct(st.selic) + ' + prêmio ' + pct(st.premio); }
    else { const q = QE(euaSel); if (!q) return null; r = euaAnalise(q); a = { code: euaSel, price: q.preco, lpa: q.lpa, vpa: q.vpa, dy: q.dy || 0, roe: q.roe, payout: q.payout || 0, div: q.div_ebitda, fin: q.financeira, q }; nome = euaSel; M = v => usd(v); const t10 = EXTRA.eua && EXTRA.eua.treasury10 ? EXTRA.eua.treasury10.valor : 0.045; rgTxt = 'Título EUA 10 anos ' + pct(t10, 2) + ' + prêmio ' + pct(st.premio); }
    const dps = a.dy * a.price, g = isFinite(r.graham);
    const D = {
      pl: { v: x(r.pl), ok: critOk(r, 'pl'), meta: 'filtro: entre 3 e ' + nf(st.plMax, 0), calc: a.lpa > 0 ? `${M(a.price)} ÷ ${M(a.lpa)} = ${x(r.pl)}` : 'LPA negativo ou zero: sem P/L' },
      pvp: { v: x(r.pvp, 2), calc: a.vpa > 0 ? `${M(a.price)} ÷ ${M(a.vpa)} = ${x(r.pvp, 2)}` : 'VPA negativo: patrimônio negativo' },
      roe: { v: pct(a.roe), ok: critOk(r, 'roe'), meta: 'filtro: ≥ ' + pct(st.roeMin, 0), calc: a.vpa > 0 && a.lpa ? `${M(a.lpa)} ÷ ${M(a.vpa)} ≈ ${pct(a.lpa / a.vpa)} (lucro por ação ÷ patrimônio por ação)` : 'patrimônio negativo: ROE não se aplica' },
      dy: { v: pct(a.dy), calc: `${M(dps)} pagos por ação em 12 meses ÷ ${M(a.price)} = ${pct(a.dy)}` },
      payout: { v: pct(a.payout, 0), calc: a.lpa > 0 ? `${M(dps)} de proventos ÷ ${M(a.lpa)} de lucro por ação = ${pct(dps / a.lpa, 0)}` : 'sem lucro: payout não se aplica' },
      div: { v: a.fin ? 'n/a' : x(a.div), ok: critOk(r, 'div'), meta: a.fin ? 'não se aplica a bancos e seguradoras' : 'filtro: ≤ ' + x(st.dividaMax), calc: a.fin ? '' : '(dívida bruta − caixa) ÷ EBITDA dos últimos 12 meses = ' + x(a.div) },
      graham: { v: M(r.graham), ok: g ? r.abaixoGraham : null, meta: g ? (r.abaixoGraham ? 'preço de hoje abaixo do justo' : 'preço de hoje acima do justo') : '', calc: g ? `√(22,5 × ${M(a.lpa)} × ${M(a.vpa)}) = ${M(r.graham)}` : 'precisa de LPA e VPA positivos' },
      margem: { v: pct(r.margem, 0), calc: g ? `1 − ${M(a.price)} ÷ ${M(r.graham)} = ${pct(r.margem, 0)}` : '' },
      cres: { v: pct(r.cres), calc: `ROE ${pct(a.roe)} × (1 − payout ${pct(Math.min(1, a.payout || 0), 0)}) = ${pct((a.roe || 0) * (1 - Math.min(1, a.payout || 0)))}${(a.roe || 0) * (1 - Math.min(1, a.payout || 0)) > st.cresMax ? ` → limitado a ${pct(st.cresMax)}` : ''}` },
      ret: { v: pct(r.ret), ok: critOk(r, 'ret'), meta: 'régua: ' + pct(r.regua), calc: `DY ${pct(r.dyU)}${r.dyCort ? ' (limitado ao lucro)' : ''} + crescimento ${pct(r.cres)} = ${pct(r.ret)}` },
      regua: { v: pct(r.regua), calc: rgTxt + ' = ' + pct(r.regua) },
      lpa: { v: M(a.lpa), calc: a.lpa ? `P/L de hoje: ${M(a.price)} ÷ ${M(a.lpa)} = ${x(a.price / a.lpa)}` : '' },
      vpa: { v: M(a.vpa), calc: a.vpa ? `P/VP de hoje: ${M(a.price)} ÷ ${M(a.vpa)} = ${x(a.price / a.vpa, 2)}` : '' },
      vmerc: anTipo === 'acoes' && draft.src && draft.src.valor_mercado ? { v: brlK(draft.src.valor_mercado), calc: `${brl(a.price)} × ${nf(draft.src.valor_mercado / a.price, 0)} ações ≈ ${brlK(draft.src.valor_mercado)}` } : null,
      emreais: anTipo === 'eua' && EXTRA.eua.dolar ? { v: brl(a.price * EXTRA.eua.dolar.valor), calc: `${usd(a.price)} × dólar ${brl(EXTRA.eua.dolar.valor, 4)} = ${brl(a.price * EXTRA.eua.dolar.valor)}` } : null,
      cres5: anTipo === 'eua' && a.q.cres5a != null ? { v: pct(a.q.cres5a, 0) + '/ano', calc: 'taxa composta entre o lucro do último balanço anual e o de cerca de 5 anos antes (SEC)' } : null
    };
    const o = D[k]; return o ? { nome, ...o } : null;
  }
  if (anTipo === 'fiis') {
    const q = QF(fiiSel); if (!q) return null;
    const r = fiiAnalise(q), m = mercadoX(), cdi = (m.cdi && m.cdi.valor) || 0, ms = (q.mensais || []).filter(v => v != null), med = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 0;
    const D = {
      fdy: { v: pct(q.dy), ok: critOk(r, 'fdy'), meta: `régua: CDI ${pct(cdi, 2)} × 0,85 = ${pct(r.regua)}`, calc: q.rend12m ? `${rc(q.rend12m)} por cota em 12 meses ÷ ${brl(q.preco)} = ${pct(q.dy)}` : '' },
      fpvp: { v: x(q.pvp, 2), ok: critOk(r, 'fpvp'), meta: 'filtro: de 0,7 a 1,05', calc: `${brl(q.preco)} ÷ ${brl(q.vp)} = ${x(q.pvp, 2)}` },
      fliq: { v: brlK(q.liq), ok: critOk(r, 'fliq'), meta: 'filtro: ≥ R$ 500 mil por dia', calc: 'média de ' + brlK(q.liq) + ' negociados por dia nos últimos 22 pregões' },
      fest: { v: r.estavel ? 'estável' : 'oscilou', ok: critOk(r, 'fest'), calc: ms.length ? `menor mês ${rc(Math.min(...ms))} ÷ média ${rc(med)} = ${pct(med ? Math.min(...ms) / med : 0, 0)} (precisa de 70%)` : '' },
      ftipo: { v: q.tipo },
      fvac: q.vacancia != null ? { v: pct(q.vacancia, 0), calc: 'último informe trimestral da CVM' } : null,
      cota: { v: brl(q.preco), calc: 'fechamento da B3 de ' + dBRs(EXTRA.fiis.data_cotacao) },
      plfii: { v: brlK(q.pl), calc: `${brlK(q.pl)} ÷ ${brl(q.vp)} por cota ≈ ${nf(q.pl / q.vp, 0)} cotas` },
      cotistas: { v: nf(q.cotistas, 0) },
      fpaga: { v: rc(q.rend12m / 12), calc: `${rc(q.rend12m)} em 12 meses ÷ 12 = ${rc(q.rend12m / 12)} por cota/mês` }
    };
    const o = D[k]; return o ? { nome: fiiSel, ...o } : null;
  }
  if (anTipo === 'rf') {
    const r = rfCalc(); if (!r) return null;
    const anos = r.meses / 12;
    const D = {
      rliq: { v: pct(r.la), calc: `(${brl(r.final)} ÷ ${brl(r.valor)}) ^ (1 ÷ ${nf(anos, 2)} anos) − 1 = ${pct(r.la)}` },
      rreal: { v: pct(r.real), ok: r.real > 0, calc: `(1 + ${pct(r.la)}) ÷ (1 + IPCA ${pct(r.ipca)}) − 1 = ${pct(r.real)}` },
      rcdi: { v: nf(r.la / r.cdiLiq * 100, 0) + '% do CDI', ok: r.la >= r.cdiLiq - 0.0001, calc: `${pct(r.la)} ÷ ${pct(r.cdiLiq)} (CDB 100% do CDI depois do IR) = ${nf(r.la / r.cdiLiq * 100, 0)}%` },
      rpoup: { v: pct(r.la), ok: r.la > r.poup, calc: `${pct(r.la)} contra poupança ${pct(r.poup)} ao ano` },
      rgar: { v: brl(r.valor, 0), ok: ['TS', 'TP', 'TI'].includes(r.t) || r.valor <= 250000, calc: ['TS', 'TP', 'TI'].includes(r.t) ? 'título público: garantia do Tesouro Nacional' : `${brl(r.valor, 0)} ${r.valor <= 250000 ? '≤' : '>'} R$ 250.000 (limite do FGC)` }
    };
    const o = D[k]; return o ? { nome: 'Nesta simulação', ...o } : null;
  }
  return null;
}
function openInfo(k) {
  const I = INFO[k]; if (!I) return;
  openSheet(`<div class="stack info"><p class="label">Entenda o indicador</p><h2 style="font-size:20px">${I.ic} ${I.t}</h2>${infoNow(k)}
    <div class="iq"><b>O que mostra</b><p class="small">${I.o}</p></div>
    <div class="iq"><b>Por que importa</b><p class="small">${I.p}</p></div>
    <div class="iq"><b>Como ler</b><p class="small">${I.l}</p></div>
    ${I.f ? `<p class="tiny muted formula">Fórmula: <span class="num">${I.f}</span></p>` : ''}
    <button class="btn" data-close>Entendi</button></div>`, () => $('#sheet-body').querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheet));
}
document.addEventListener('click', e => { const b = e.target.closest('[data-info]'); if (!b) return; e.preventDefault(); e.stopPropagation(); openInfo(b.dataset.info); }, true);
/* região com um único "i": toque em qualquer parte dela abre a explicação */
const INTERATIVO = 'button,a,input,select,textarea,label,summary,[data-rkc],[data-hop],[data-hrf],[data-fii],[data-eua],[data-load],[data-lopen],.rk,.op-r,.item,.sbar,.sheet';
function regiaoInfo(alvo) {
  let el = alvo, app = document.getElementById('app');
  while (el && el !== app && el !== document.body) {
    const ibs = el.querySelectorAll('[data-info]');
    if (ibs.length === 1) return ibs[0];
    if (ibs.length > 1) return null;
    el = el.parentElement;
  }
  return null;
}
document.addEventListener('click', e => {
  if (!e.target.closest || !e.target.closest('#app') || e.target.closest(INTERATIVO)) return;
  const ib = regiaoInfo(e.target); if (!ib) return;
  openInfo(ib.dataset.info);
});

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
  const ps = h.map(x => x[1]), mn = Math.min(...ps), mx = Math.max(...ps), W = 300, Hh = 52, pad = 7;
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
function alertasHTML(a, r) {
  const out = [];
  if (r.dyCort) out.push(`<div class="alerta"><b>* Dividendos acima do lucro</b><p>Nos últimos 12 meses a empresa pagou ${pct(r.dyB)} em dividendos, mais do que lucrou (${pct(Math.max(0, r.ey))} do preço). Costuma ser pagamento extraordinário, que não se repete. Na conta do retorno usamos no máximo o lucro: ${pct(r.dyU)}.</p></div>`);
  if (r.pontual) out.push(`<div class="alerta"><b>Lucro pode ser pontual</b><p>P/L de ${x(r.pl)} (preço menor que 3 anos de lucro) costuma indicar um ganho que não se repete, como venda de ativo ou efeito contábil. Por isso ela não passa no critério de P/L. Confira as notícias da empresa.</p></div>`);
  const per = draft.src && draft.src.periodo, pa = periodoAtual();
  if (per && pa && per !== pa) out.push(`<div class="alerta info"><b>Balanço ${esc(per)}</b><p>Esta empresa ainda não publicou o balanço ${esc(pa)}. Os números são do último disponível na CVM.</p></div>`);
  return out.length ? `<section class="alertas">${out.join('')}</section>` : '';
}
function precoHTML(a, r) {
  if (!isFinite(r.graham)) return `<section class="card pz pz-n"><div class="pz-top"><span class="pz-l">Cara ou barata? ${iB('graham')}</span><span class="pz-tag">Sem preço justo</span></div><p class="pz-nota">Com prejuízo ou patrimônio negativo, a fórmula de Graham não se aplica. Olhe primeiro os critérios abaixo.</p></section>`;
  const m = r.margem, k = m >= 0.2 ? 'b' : m <= -0.1 ? 'c' : 'j';
  const T = { b: 'Barata', j: 'Preço justo', c: 'Cara' }[k];
  const vezes = a.price / r.graham;
  const dif = Math.abs(m) < 0.005 ? 'igual ao justo' : vezes >= 2 ? `${nf(vezes, 1)}x o justo` : `${pct(Math.abs(m), 0)} ${m > 0 ? 'abaixo' : 'acima'}`;
  const pos = Math.max(4, Math.min(96, 50 + m * 100));
  const nota = k === 'b' ? (r.okN === 4 ? 'Preço abaixo do justo e passou nos 4 critérios.' : 'Preço baixo, mas não passou em todos os critérios: às vezes está barata por um motivo.')
    : k === 'c' ? (r.okN === 4 ? 'Boa nos critérios, mas o preço já passou do justo: sem margem de segurança.' : 'Preço acima do justo e não passou em todos os critérios.')
    : 'Perto do valor justo: sem desconto, mas sem exagero.';
  return `<section class="card pz pz-${k}">
    <div class="pz-top"><span class="pz-l">Cara ou barata? ${iB('margem')}</span><span class="pz-tag">${T}</span></div>
    <div class="pz-nums"><div class="pz-col"><div><small>Preço hoje</small><b class="num">${brl(a.price)}</b></div><div><small>Preço justo</small><b class="num pz-g">${brl(r.graham)}</b></div></div><div class="pz-dif">${dif}</div></div>
    <div class="pz-bar"><i style="left:${pos}%"></i></div>
    <div class="pz-leg"><span>cara</span><span>justa</span><span>barata</span></div>
    <p class="pz-nota">${nota} <span>Educativo, não é recomendação de compra ou venda.</span></p>
  </section>`;
}
let resTab = 'analise', resKey = '';
const cPvp = v => !isFinite(v) || v <= 0 ? '' : v <= 1 ? 'g' : v > 3 ? 'r' : '';
const cDy = v => !isFinite(v) ? '' : v >= 0.06 ? 'g' : '';
const cPay = v => !isFinite(v) ? '' : v >= 0.25 && v <= 0.8 ? 'g' : v > 1 || v < 0 ? 'r' : '';
const cPos = v => !isFinite(v) ? '' : v > 0 ? 'g' : v < 0 ? 'r' : '';
const ckc = (r, k) => { const c = r.c.find(z => z.k === k); return c ? (c.ok ? 'g' : 'r') : ''; };
document.addEventListener('focusin', e => { const sb = e.target.closest && e.target.closest('.sbar'); if (sb) sb.classList.add('open'); });
document.addEventListener('focusout', e => { const sb = e.target.closest && e.target.closest('.sbar'); if (sb) setTimeout(() => { if (!sb.contains(document.activeElement)) sb.classList.remove('open'); }, 120); });
document.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('.sdrop') && !e.target.closest('input')) e.preventDefault(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.activeElement && document.activeElement.closest && document.activeElement.closest('.sbar')) document.activeElement.blur(); });
const resTabs = k => { if (k !== resKey) { resKey = k; resTab = 'analise'; } return `<div class="seg3 seg2 restabs" role="tablist">${[['analise', 'Análise'], ['ind', 'Indicadores']].map(([k, l]) => `<button data-rt="${k}" class="${resTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>`; };
document.addEventListener('click', e => { const b = e.target.closest('[data-rt]'); if (!b) return; resTab = b.dataset.rt; document.querySelectorAll('[data-rt]').forEach(z => z.classList.toggle('on', z.dataset.rt === resTab)); document.querySelectorAll('[data-rp]').forEach(z => { z.hidden = z.dataset.rp !== resTab; }); animaAnalise(); const t = document.querySelector('.restabs'); if (t && t.getBoundingClientRect().top < 60) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
function resultHTML(a) {
  if (!complete(a)) {
    const c = a.code, tk = /^[A-Z]{4}\d{1,2}$/.test(c);
    let msg, extra = '';
    if (!DATA || !DATA.acoes) { msg = 'Não consegui baixar os dados das ações. Confira a internet e tente de novo.'; extra = '<button class="btn sm" id="aretry">Tentar de novo</button>'; }
    else if (!c) msg = 'Toque na busca e digite o código ou o nome da empresa: as ações mais analisadas aparecem lá. Os números vêm sozinhos dos balanços da CVM e do fechamento da B3.';
    else if (tk && !Q(c)) { msg = `Não temos dados de ${esc(c)} hoje: ela não negociou na B3 nos últimos dias, ou é um fundo/BDR. Se quiser, preencha os números à mão.`; if (!editNums) extra = '<button class="btn ghost sm" id="amanual">Preencher à mão</button>'; }
    else msg = 'Toque numa das ações sugeridas acima para ver a análise.';
    return `<div class="hint row"><img src="img/analisar.webp" alt=""><div class="stack" style="gap:8px;flex:1;min-width:0"><p class="small muted">${msg}</p>${extra}</div></div>`;
  }
  const r = analyze(a); lastA = a; lastR = r;
  const V = { ok: ['Passou com folga', 'meta'], mid: ['Passou, sem folga', 'analisar'], no: ['Não passou', 'vazio'] }[r.verdict];
  const pos = Math.max(4, Math.min(96, 50 + (r.folga / 0.10) * 50));
  return `
  ${resTabs('acao:' + a.code)}
  <div class="stack" data-rp="analise"${resTab === 'analise' ? '' : ' hidden'}>
  <section class="card verdict2 ${r.verdict}">
    <div class="row" style="gap:12px"><img class="reac r${Math.max(1, r.okN)}" src="img/reacao${Math.max(1, r.okN)}.webp" alt="${['', 'Decepcionado', 'Preocupado', 'Quase lá', 'Comemorando'][Math.max(1, r.okN)]}" width="60" height="90"><div style="flex:1;min-width:0"><p class="tiny muted">${esc(a.code || 'Resultado')}${draft.src && draft.src.nome ? ' · ' + esc(draft.src.nome.split(' ').slice(0, 3).join(' ')) : ''}</p><b class="vt">${V[0]}</b><p class="tiny muted">${r.okN} de 4 critérios</p></div>
      <div class="ret"><p class="tiny muted">retorno/ano ${iB('ret')}</p><b class="num ${r.ret > r.regua ? 'g' : 'r'}">${pct(r.ret)}</b></div></div>
    <div class="gauge"><u></u><i style="left:${pos}%"></i></div>
    <div class="row between tiny dim"><span>DY ${pct(r.dyU)}${r.dyCort ? '*' : ''} ${iB('dy')} + cresc. ${pct(r.cres)} ${iB('cres')}</span><span>régua ${pct(r.regua)} ${iB('regua')}</span></div>
  </section>
  ${alertasHTML(a, r)}
  ${precoHTML(a, r)}
  <div class="critgrid">${r.c.map(c => `<div class="cg ${c.ok ? 'ok' : 'no'}">${iB(c.k)}<span>${c.ok ? '✓' : '✕'}</span><div><p class="tiny">${c.n.replace('ROE de pelo menos', 'ROE ≥').replace('Dívida até', 'Dívida ≤').replace(' o EBITDA', '').replace('P/L entre 3 e', 'P/L 3 a').replace('Retorno acima de', 'Retorno >').replace('Dívida: não se aplica', 'Dívida: n/a')}</p><b class="num">${c.v}</b></div></div>`).join('')}</div>
  <button class="btn" id="asave">Salvar na minha lista</button>
  <div class="grid2"><button class="btn ghost sm" id="acmp">Comparar com outra</button><button class="btn ghost sm" id="ashare">Compartilhar imagem</button></div>
  </div>
  <div class="stack" data-rp="ind"${resTab === 'ind' ? '' : ' hidden'}>
  <div class="metrics4">
    <div><span class="tiny muted">P/L ${iB('pl')}</span><b class="num ${ckc(r, 'pl')}">${x(r.pl)}</b></div>
    <div><span class="tiny muted">P/VP ${iB('pvp')}</span><b class="num ${cPvp(r.pvp)}">${x(r.pvp, 2)}</b></div>
    <div><span class="tiny muted">Graham ${iB('graham')}</span><b class="num ${r.abaixoGraham ? 'g' : isFinite(r.graham) ? 'r' : ''}">${brl(r.graham)}</b></div>
    <div><span class="tiny muted">Margem ${iB('margem')}</span><b class="num ${r.margem >= 0 ? 'g' : 'r'}">${pct(r.margem, 0)}</b></div>
  </div>
  <div class="metrics4">
    <div><span class="tiny muted">ROE ${iB('roe')}</span><b class="num ${ckc(r, 'roe')}">${pct(a.roe)}</b></div>
    <div><span class="tiny muted">DY ${iB('dy')}</span><b class="num ${cDy(a.dy)}">${pct(a.dy)}</b></div>
    <div><span class="tiny muted">Payout ${iB('payout')}</span><b class="num ${cPay(a.payout)}">${pct(a.payout, 0)}</b></div>
    <div><span class="tiny muted">Dív/EBITDA ${iB('div')}</span><b class="num ${a.fin ? '' : ckc(r, 'div')}">${a.fin ? 'n/a' : x(a.div)}</b></div>
  </div>
  <div class="metrics4">
    <div><span class="tiny muted">LPA ${iB('lpa')}</span><b class="num ${cPos(a.lpa)}">${brl(a.lpa)}</b></div>
    <div><span class="tiny muted">VPA ${iB('vpa')}</span><b class="num ${cPos(a.vpa)}">${brl(a.vpa)}</b></div>
    <div><span class="tiny muted">Cresc. ${iB('cres')}</span><b class="num ${r.cres > 0 ? 'g' : r.cres < 0 ? 'r' : ''}">${pct(r.cres)}</b></div>
    <div><span class="tiny muted">Valor ${iB('vmerc')}</span><b class="num">${draft.src && draft.src.valor_mercado ? brlK(draft.src.valor_mercado) : '—'}</b></div>
  </div>
  ${draft.src ? `<p class="tiny dim" style="text-align:center">CVM balanço ${esc(draft.src.periodo)} · B3 ${dBRs(DATA.data_cotacao)} · Selic Banco Central</p>` : ''}
  ${draft.src ? acaoGraficos(a.code) : histHTML(a.code)}
  <p class="tiny dim" style="text-align:center">Toque no <span class="ib" style="pointer-events:none">i</span> para entender cada número</p>
  </div>
`;
}
function viewAnalisar() {
  if (anTipo !== 'acoes') return { fiis: viewFII, rf: viewRF, eua: viewEUA }[anTipo]();
  const a = draftNum();
  const auto = !!draft.src;
  const fields = AF.filter(([k]) => k !== 'code' && !(k === 'div' && draft.src && draft.src.financeira));
  return `
  <header class="page row between"><div><h1>Analisar ação</h1><p class="small muted">Passa no filtro dos 4 critérios?</p></div>${HEADBTNS()}</header>
  ${anTabs()}
  <div class="sbar">
    <div class="search"><svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>
      <input data-a="code" autocapitalize="characters" maxlength="30" enterkeyhint="search" autocomplete="off" placeholder="Código ou empresa (ex.: PETR4)" value="${esc(draft.code)}">
      ${draft.code ? '<button id="aclear" aria-label="Limpar">✕</button>' : ''}</div>
    <div id="sugs" class="sdrop"></div>
  </div>
    ${!editNums && DATA && DATA.acoes ? '' : `<section class="card">
    <div class="grid2 nums">${fields.map(([k, l, suf, h]) => `
      <div class="field"><label>${l} ${INFO[k] ? iB(k) : ''}</label><div class="inp ${suf === 'R$' ? 'has-pre' : ''}">${suf === 'R$' ? '<span class="pre">R$</span>' : ''}<input data-a="${k}" inputmode="decimal" placeholder="${h.split(' ')[0]}" value="${esc(draft[k])}">${suf && suf !== 'R$' ? `<span class="suf">${suf}</span>` : ''}</div></div>`).join('')}</div></section>`}
  ${draft.src ? '' : draft.code || !(DATA && DATA.acoes) ? rankingEntrada() : ''}
  <div id="ares" class="stack">${!draft.src && !draft.code && DATA && DATA.acoes ? acoesRanking() : resultHTML(a)}</div>
  <p class="disc">Ferramenta educativa. Não é recomendação de compra ou venda.</p>`;
}

/* ---------- OUTROS INVESTIMENTOS: FIIs, RENDA FIXA E EUA ---------- */
let anTipo = 'acoes';
const EXTRA = {}, EXTRA_LOAD = {};
for (const k of ['fiis', 'rf', 'eua', 'noticias']) { try { EXTRA[k] = JSON.parse(localStorage.getItem(KEY + '.' + k) || 'null'); } catch (e) { EXTRA[k] = null; } }
async function loadExtra(k) {
  if (EXTRA_LOAD[k]) return; EXTRA_LOAD[k] = 1;
  try { const r = await fetch('data/' + k + '.json', { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); EXTRA[k] = await r.json(); try { localStorage.setItem(KEY + '.' + k, JSON.stringify(EXTRA[k])); } catch (e) { } }
  catch (e) { EXTRA_LOAD[k] = 0; }
  if (k === 'fiis' && precosFII()) save();
  if (route === 'analisar' || route === 'carteira' || route === 'inicio') agendaRender();
}
function precosFII() { const F = EXTRA.fiis && EXTRA.fiis.fiis; if (!F) return false; let ch = false; for (const a of S.assets) { const q = F[(a.code || '').toUpperCase()]; if (q && q.preco && a.price !== q.preco) { a.price = q.preco; ch = true; } } return ch; }
const QF = c => EXTRA.fiis && EXTRA.fiis.fiis ? EXTRA.fiis.fiis[(c || '').toUpperCase().trim()] : null;
const QE = c => EXTRA.eua && EXTRA.eua.acoes ? EXTRA.eua.acoes[(c || '').toUpperCase().trim()] : null;
const usd = (v, d = 2) => isFinite(v) ? 'US$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const brlK = v => !isFinite(v) ? '—' : v >= 1e9 ? 'R$ ' + nf(v / 1e9, 1) + ' bi' : v >= 1e6 ? 'R$ ' + nf(v / 1e6, 1) + ' mi' : v >= 1e3 ? 'R$ ' + nf(v / 1e3, 0) + ' mil' : brl(v, 0);
const mercadoX = () => Object.assign({}, (DATA && DATA.mercado) || {}, (EXTRA.rf && EXTRA.rf.mercado) || {});
const AN_T = [['acoes', 'Ações'], ['eua', 'EUA'], ['fiis', 'FIIs'], ['rf', 'Renda fixa']];
const anTabs = () => `<div class="seg3 seg4 antabs" id="antipo">${AN_T.map(([k, l]) => `<button data-ant="${k}" data-c="${k}" class="${anTipo === k ? 'on' : ''}"><i class="cdot"></i>${l}</button>`).join('')}</div>`;
const lupa = '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>';
function vereditoCard(o) {
  const V = { ok: ['Passou com folga', 4], mid: ['Passou, sem folga', 4], no: ['Não passou', Math.max(1, o.okN)] }[o.verdict];
  const n = o.verdict === 'no' ? Math.max(1, o.okN) : 4;
  return `<section class="card verdict2 ${o.verdict}">
    <div class="row" style="gap:12px"><img class="reac r${n}" src="img/reacao${n}.webp" alt="" width="60" height="90"><div style="flex:1;min-width:0"><p class="tiny muted">${esc(o.titulo)}</p><b class="vt">${V[0]}</b><p class="tiny muted">${o.okN} de 4 critérios</p></div>
      <div class="ret"><p class="tiny muted">${o.retLbl} ${o.retI ? iB(o.retI) : ''}</p><b class="num ${o.retOk ? 'g' : 'r'}">${o.ret}</b></div></div>
    ${o.linha ? `<p class="tiny dim" style="margin-top:10px">${o.linha}</p>` : ''}
  </section>`;
}
const critHTML = c => `<div class="critgrid">${c.map(k => `<div class="cg ${k.ok ? 'ok' : 'no'}">${iB(k.k)}<span>${k.ok ? '✓' : '✕'}</span><div><p class="tiny">${k.n}</p><b class="num">${k.v}</b></div></div>`).join('')}</div>`;
function barraPreco(o) {
  return `<section class="card pz pz-${o.k}">
    <div class="pz-top"><span class="pz-l">${o.titulo} ${iB(o.i)}</span><span class="pz-tag">${o.tag}</span></div>
    <div class="pz-nums"><div class="pz-col"><div><small>${o.l1}</small><b class="num">${o.v1}</b></div><div><small>${o.l2}</small><b class="num pz-g">${o.v2}</b></div></div><div class="pz-dif">${o.dif}</div></div>
    <div class="pz-bar"><i style="left:${Math.max(4, Math.min(96, o.pos))}%"></i></div>
    <div class="pz-leg"><span>${o.leg[0]}</span><span>${o.leg[1]}</span><span>${o.leg[2]}</span></div>
    <p class="pz-nota">${o.nota} <span>Educativo, não é recomendação de compra ou venda.</span></p></section>`;
}
function sugChips(lista, attr) { return lista.map(([c, n]) => `<button data-${attr}="${c}"><b>${c}</b>${n ? ' <span class="tiny muted">' + esc(n) + '</span>' : ''}</button>`).join(''); }
function buscaLista(base, txt, nomeF, max = 12) {
  const t = semAcento((txt || '').toUpperCase().trim());
  if (!t) return [];
  return Object.entries(base).filter(([c, q]) => c.startsWith(t) || semAcento((nomeF(q) || '').toUpperCase()).includes(t)).sort((a, b) => (b[0].startsWith(t) - a[0].startsWith(t)) || a[0].localeCompare(b[0])).slice(0, max).map(([c, q]) => [c, (nomeF(q) || '').split(' ').slice(0, 3).join(' ')]);
}

/* ----- FIIs ----- */
let fiiSel = '', fiiF = 'todos', fiiN = 10;
const FII_POP = ['MXRF11', 'HGLG11', 'KNCR11', 'XPML11', 'BTLG11', 'VISC11', 'KNRI11', 'CPTS11', 'HGRU11', 'VGHF11', 'IRDM11', 'TRXF11'];
function fiiAnalise(q) {
  const m = mercadoX(), cdi = (m.cdi && m.cdi.valor) || S.settings.selic, regua = cdi * 0.85;
  const ms = (q.mensais || []).filter(v => v != null), media = ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 0;
  const estavel = ms.length >= 4 && media > 0 && Math.min(...ms) >= 0.7 * media;
  const susp = (q.pvp > 0 && q.pvp < 0.5) || q.dy > 0.25;
  const c = [
    { k: 'fdy', n: 'Rendimento > ' + pct(regua), ok: !susp && q.dy >= regua, v: susp ? 'confira' : q.dy != null ? pct(q.dy) : 'sem histórico' },
    { k: 'fpvp', n: 'P/VP de 0,7 a 1,05', ok: q.pvp >= 0.7 && q.pvp <= 1.05, v: x(q.pvp, 2) },
    { k: 'fliq', n: 'Liquidez ≥ 500 mil/dia', ok: q.liq >= 5e5, v: brlK(q.liq) },
    { k: 'fest', n: 'Rendimento estável', ok: estavel, v: estavel ? 'estável' : ms.length < 4 ? 'pouco histórico' : 'oscilou' }
  ];
  const okN = c.filter(k => k.ok).length;
  const kp = !(q.pvp > 0) ? 'n' : q.pvp < 0.9 ? 'b' : q.pvp <= 1.05 ? 'j' : 'c';
  return { c, okN, regua, kp, estavel, susp, verdict: okN === 4 ? (q.dy - regua >= 0.01 ? 'ok' : 'mid') : 'no' };
}
let FII_MEMO = null;
function fiiTodos() { const F = EXTRA.fiis && EXTRA.fiis.fiis; if (!F) return []; if (FII_MEMO && FII_MEMO.d === EXTRA.fiis) return FII_MEMO.v; const v = Object.entries(F).map(([c, q]) => ({ c, q, r: fiiAnalise(q) })); FII_MEMO = { d: EXTRA.fiis, v }; return v; }
function viewFII() {
  const X = EXTRA.fiis, F = X && X.fiis;
  const head = `<header class="page row between"><div><h1>Analisar FII</h1><p class="small muted">Fundos imobiliários nos 4 critérios</p></div>${HEADBTNS()}</header>${anTabs()}`;
  if (!F) { loadExtra('fiis'); return head + `<p class="tiny muted" style="text-align:center">Carregando os fundos imobiliários (CVM e B3)…</p><section class="card"><div class="sk" style="width:45%"></div>${'<div class="skr"><i></i><div><div class="sk"></div><div class="sk" style="width:60%"></div></div><i></i></div>'.repeat(6)}</section>`; }
  const q = fiiSel && F[fiiSel];
  const pop = FII_POP.filter(c => F[c]).map(c => [c, '']);
  return head + `
  <div class="sbar">
    <div class="search">${lupa}<input id="fiiq" autocapitalize="characters" maxlength="30" autocomplete="off" enterkeyhint="search" placeholder="Código ou nome (ex.: MXRF11)" value="${esc(fiiSel)}">${fiiSel ? '<button id="fiiclr" aria-label="Limpar">✕</button>' : ''}</div>
    <div id="fiisugs" class="sdrop"><p class="sdcap">Mais buscados</p>${sugChips(pop, 'fii')}</div>
  </div>
  ${q ? fiiResult(fiiSel, q) : fiiRanking()}
  <p class="disc">Informes mensais da CVM (até ${q ? q.ref.slice(5, 7) + '/' + q.ref.slice(0, 4) : 'o último mês entregue'}) e fechamento da B3 de ${dBRs(X.data_cotacao)}. Rendimento de FII é isento de IR para pessoa física nas condições da lei. Ferramenta educativa, não é recomendação de compra ou venda.</p>`;
}
function fiiResult(c, q) {
  const r = fiiAnalise(q), mes = q.rend12m ? q.rend12m / 12 : NaN;
  const cotas100 = mes > 0 ? Math.ceil(100 / mes) : NaN;
  const ms = q.mensais || [], mx = Math.max(...ms.filter(v => v > 0), 0.0001);
  const meses = []; if (q.ref) { const [y, m] = q.ref.split('-').map(Number); for (let i = ms.length - 1; i >= 0; i--) { const d = new Date(y, m - 1 - (ms.length - 1 - i), 1); meses.unshift(MES3[d.getMonth()]); } }
  const al = [];
  if (r.susp) al.push(['Números fora do normal', `Cota a ${brl(q.preco)} contra ${brl(q.vp)} de patrimônio por cota${q.dy > 0.25 ? ` e rendimento de ${pct(q.dy)} ao ano` : ''}. Isso costuma vir de desdobramento ou grupamento de cotas depois do último informe da CVM, ou de um fundo em crise. Por isso ele não entra no ranking. Confira o relatório gerencial.`]);
  else if (q.pvp > 0 && q.pvp < 0.7) al.push(['Desconto muito grande', `A cota vale ${pct(1 - q.pvp, 0)} menos que o patrimônio. Às vezes é oportunidade, às vezes o mercado desconfia dos imóveis ou dos créditos do fundo. Leia o relatório gerencial antes.`]);
  if (q.meses < 12) al.push(['Histórico curto', `Só ${q.meses} meses de informes na CVM. O rendimento de 12 meses pode não representar o normal do fundo.`]);
  if (q.tipo === 'Papel') al.push(['Fundo de papel', 'Investe em dívidas do setor imobiliário (CRI). O rendimento acompanha os juros (CDI ou IPCA): costuma cair quando a Selic cai.']);
  if (q.vacancia > 0.15 && q.vacancia <= 0.5) al.push(['Vacância alta', `${pct(q.vacancia, 0)} da área dos imóveis está vazia (último informe trimestral). Imóvel vazio não paga aluguel.`]);
  return `${resTabs('fii:' + c)}
  <div class="stack" data-rp="analise"${resTab === 'analise' ? '' : ' hidden'}>
  ${vereditoCard({ titulo: c + ' · ' + q.nome.split(' ').slice(0, 4).join(' '), verdict: r.verdict, okN: r.okN, retLbl: 'rende/ano', retI: 'fdy', ret: q.dy != null ? pct(q.dy) : '—', retOk: q.dy >= r.regua,
    linha: mes > 0 && !r.susp ? `R$ 1.000 nele rendem cerca de <b class="o">${brl(1000 * q.dy / 12)}</b> por mês, isentos de IR. Para receber R$ 100 por mês: ${cotas100} cotas (≈ ${brl(cotas100 * q.preco, 0)}).` : '' })}
  ${al.map(([t, d]) => `<div class="alerta"><b>* ${t}</b><p>${d}</p></div>`).join('')}
  ${q.pvp > 0 ? barraPreco({ k: r.kp, titulo: 'Cara ou barata?', i: 'fpvp', tag: { b: 'Com desconto', j: 'Preço justo', c: 'Com ágio' }[r.kp], l1: 'Cota hoje', v1: brl(q.preco), l2: 'Patrimônio/cota', v2: brl(q.vp),
    dif: Math.abs(1 - q.pvp) < 0.005 ? 'igual ao patrimônio' : `${pct(Math.abs(1 - q.pvp), 0)} ${q.pvp < 1 ? 'abaixo' : 'acima'}`, pos: 50 + (1 - q.pvp) * 200, leg: ['com ágio', 'justo', 'com desconto'],
    nota: r.kp === 'b' ? 'A cota custa menos que o patrimônio do fundo.' : r.kp === 'c' ? 'Você paga mais do que o patrimônio vale.' : 'Perto do valor do patrimônio.' }) : ''}
  ${critHTML(r.c)}
  ${salvarBtn('fiis', c)}
  </div>
  <div class="stack" data-rp="ind"${resTab === 'ind' ? '' : ' hidden'}>
  <div class="metrics4">
    <div><span class="tiny muted">Tipo ${iB('ftipo')}</span><b>${esc(q.tipo)}</b></div>
    <div><span class="tiny muted">Cotistas ${iB('cotistas')}</span><b class="num">${nf(q.cotistas, 0)}</b></div>
    <div><span class="tiny muted">Patrimônio ${iB('plfii')}</span><b class="num">${brlK(q.pl)}</b></div>
    ${q.vacancia != null && q.vacancia <= 0.5 ? `<div><span class="tiny muted">Vacância ${iB('fvac')}</span><b class="num ${q.vacancia <= 0.1 ? 'g' : q.vacancia > 0.15 ? 'r' : ''}">${pct(q.vacancia, 0)}</b></div>` : `<div><span class="tiny muted">Paga/mês ${iB('fpaga')}</span><b class="num ${ckc(r, 'fdy')}">${rc(q.rend12m / 12)}</b></div>`}
  </div>
  <div class="metrics4">
    <div><span class="tiny muted">Cota ${iB('cota')}</span><b class="num">${brl(q.preco)}</b></div>
    <div><span class="tiny muted">VP/cota ${iB('fpvp')}</span><b class="num ${q.vp >= q.preco ? 'g' : ''}">${brl(q.vp)}</b></div>
    <div><span class="tiny muted">P/VP ${iB('fpvp')}</span><b class="num ${ckc(r, 'fpvp')}">${x(q.pvp, 2)}</b></div>
    <div><span class="tiny muted">Liquidez ${iB('fliq')}</span><b class="num ${ckc(r, 'fliq')}">${brlK(q.liq)}</b></div>
  </div>
  ${fiiRendHTML(GRF[c] && GRF[c].rend ? { ...q, mensais: GRF[c].rend.map(p => p[1]) } : q, GRF[c] && GRF[c].rend ? GRF[c].rend.map(p => p[1]) : ms, GRF[c] && GRF[c].rend ? GRF[c].rend.map(p => MES3[+p[0].slice(5, 7) - 1]) : meses)}
  ${fiiGraficos(c, q)}
  </div>`;
}
const rc = v => isFinite(v) ? 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v < 1 ? 3 : 2, maximumFractionDigits: v < 1 ? 3 : 2 }) : '—';
function fiiRendHTML(q, ms, meses) {
  const vs = ms.map(v => v != null && v >= 0 ? v : null), ok = vs.filter(v => v != null);
  if (!ok.length) return '';
  const mx = Math.max(...ok, 1e-9), med = ok.reduce((a, b) => a + b, 0) / ok.length;
  let li = vs.length - 1; while (li > 0 && vs[li] == null) li--;
  const ult = vs[li], dif = ult / med - 1;
  const H = 110, hm = (med / mx * H).toFixed(1);
  const tag = Math.abs(dif) < 0.02 ? ['na média', 'o'] : dif > 0 ? [pct(dif, 0) + ' acima da média', 'g'] : [pct(-dif, 0) + ' abaixo da média', 'r'];
  return `<section class="card rend">
    <div class="row between"><h3>Quanto pagou por cota</h3><span class="tiny muted">últimos ${ms.length} meses</span></div>
    <div class="rend-top">
      <div><span class="tiny muted">Último (${meses[li] || ''})</span><b class="num o">${rc(ult)}</b><span class="rend-tag ${tag[1]}">${tag[0]}</span></div>
      <div><span class="tiny muted">Média do período</span><b class="num">${rc(med)}</b><span class="tiny dim">por cota/mês</span></div>
      <div><span class="tiny muted">Com 100 cotas</span><b class="num g">${brl(ult * 100)}</b><span class="tiny dim">no último mês</span></div>
    </div>
    <div class="rend-ch${vs.length > 8 ? ' dens' : ''}" style="height:${H + 34}px">
      <div class="rend-med" style="bottom:${+hm + 19}px"></div>
      ${vs.map((v, i) => `<div class="rend-c${i === li ? ' last' : ''}">
        <small class="num">${v != null && (vs.length <= 8 || i === li || v === mx || v === Math.min(...ok)) ? rc(v).replace('R$ ', '') : '&nbsp;'}</small>
        <i style="height:${v != null ? Math.max(4, v / mx * H).toFixed(1) : 2}px"${v == null ? ' class="vz"' : ''}></i>
        <span>${vs.length <= 8 || (li - i) % 2 === 0 ? (meses[i] || '') : '&nbsp;'}</span></div>`).join('')}
    </div>
    <div class="rend-leg"><span><i class="lg"></i>último mês</span><span><i class="lm"></i>média ${rc(med)}</span></div>
    <p class="tiny dim" style="margin-top:8px">Reais pagos por cota em cada mês (informe da CVM). No ritmo dos últimos ${q.meses} meses, o fundo paga cerca de ${rc(q.rend12m)} por cota em um ano. Rendimento passado não garante rendimento futuro.</p>
  </section>`;
}
function fiiRanking() {
  const all = fiiTodos(), base = all.filter(k => k.r.okN === 4 && (fiiF === 'todos' || k.q.tipo === fiiF)).sort((a, b) => b.q.dy - a.q.dy);
  const nP = all.filter(k => k.r.okN === 4).length;
  return `<section class="card">
    <div class="row between"><h3>Ranking de FIIs</h3><span class="tiny muted">${nP} de ${all.length} passam</span></div>
    <div class="chips scroll" id="fiif" style="margin:10px 0">${[['todos', 'Todos'], ['Papel', 'Papel'], ['Tijolo', 'Tijolo'], ['Híbrido', 'Híbridos'], ['Fundo de fundos', 'FoF']].map(([k, l]) => `<button data-ff="${k}" class="${fiiF === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <div class="rk-h tiny muted"><span>#</span><span>Fundo</span><span>P/VP</span><span style="text-align:right">Rende/ano</span></div>
    <div class="list">${base.slice(0, fiiN).map((k, i) => `<button class="rk" data-fii="${k.c}"><span class="rank ${i === 0 ? 'first' : ''}">${i + 1}º</span><span class="t"><b>${k.c}</b><span class="tiny muted">${esc(k.q.tipo)} · ${esc(k.q.nome.split(' ').slice(0, 3).join(' '))}</span></span><span class="kp kp-${k.r.kp}">${x(k.q.pvp, 2)}</span><b class="num g">${pct(k.q.dy)}</b></button>`).join('')}</div>
    ${base.length > fiiN ? `<button class="more" id="fiimore">Mostrar mais (${base.length - fiiN} restantes)</button>` : ''}
    ${!base.length ? '<p class="small muted" style="padding:12px 0">Nenhum fundo deste tipo passa nos 4 critérios hoje.</p>' : ''}
    <p class="tiny dim" style="margin-top:8px">Fundos que passam nos 4 critérios, do maior para o menor rendimento dos últimos 12 meses.</p>
  </section>`;
}

/* ----- RENDA FIXA ----- */
const RF_T = [['CDB', 'CDB'], ['LCI', 'LCI/LCA'], ['TS', 'Tesouro Selic'], ['TP', 'Tesouro Prefixado'], ['TI', 'Tesouro IPCA+']];
let rfS = { tipo: 'CDB', modo: 'pos', taxa: '', prazo: '', valor: '' };
const rfDef = () => ({ pos: rfS.tipo === 'LCI' ? 90 : 100, pre: 14, ipca: 7 })[rfS.tipo === 'TS' ? 'pos' : rfS.tipo === 'TP' ? 'pre' : rfS.tipo === 'TI' ? 'ipca' : rfS.modo];
function irAliq(dias) { return dias <= 180 ? 0.225 : dias <= 360 ? 0.2 : dias <= 720 ? 0.175 : 0.15; }
function rfCalc() {
  const m = mercadoX(), cdi = (m.cdi && m.cdi.valor) || 0.1365, selic = (m.selic && m.selic.valor) || S.settings.selic, ipca = (m.ipca12m && m.ipca12m.valor) || 0.045, poup = (m.poupanca && m.poupanca.valor) || 0.0617 + 0.01;
  const t = rfS.tipo, modo = t === 'TS' ? 'ts' : t === 'TP' ? 'pre' : t === 'TI' ? 'ipca' : rfS.modo;
  const taxa = rfS.taxa === '' ? rfDef() : num(rfS.taxa), meses = rfS.prazo === '' ? 24 : num(rfS.prazo), valor = rfS.valor === '' ? 10000 : num(rfS.valor);
  if (!(taxa >= 0) || !(meses >= 1) || !(valor > 0)) return null;
  const anual = modo === 'pos' ? cdi * taxa / 100 : modo === 'ts' ? (1 + selic) * (1 + taxa / 100) - 1 : modo === 'pre' ? taxa / 100 : (1 + ipca) * (1 + taxa / 100) - 1;
  const anos = meses / 12, dias = Math.round(meses * 30.4);
  const isento = t === 'LCI', ir = isento ? 0 : irAliq(dias);
  const bruto = valor * (Math.pow(1 + anual, anos) - 1);
  const tesouro = ['TS', 'TP', 'TI'].includes(t), cust = tesouro && !(t === 'TS' && valor <= 10000) ? (valor + bruto / 2) * 0.002 * anos : 0;
  const liq = bruto * (1 - ir) - cust, final = valor + liq;
  const la = Math.pow(final / valor, 1 / anos) - 1;
  const cdiLiq = Math.pow(1 + (Math.pow(1 + cdi, anos) - 1) * (1 - irAliq(dias)), 1 / anos) - 1;
  const real = (1 + la) / (1 + ipca) - 1;
  const fv = (r, isen) => valor * (Math.pow(1 + r, anos) - 1) * (isen ? 1 : 1 - irAliq(dias)) + valor;
  const fgcOk = tesouro || valor <= 250000;
  const c = [
    { k: 'rreal', n: 'Rende acima da inflação', ok: real > 0, v: (real >= 0 ? '+' : '') + pct(real) + ' ao ano' },
    { k: 'rcdi', n: 'Bate o CDI (líquido)', ok: la >= cdiLiq - 0.0001, v: nf(la / cdiLiq * 100, 0) + '% do CDI' },
    { k: 'rpoup', n: 'Bate a poupança', ok: la > poup, v: 'poupança ' + pct(poup) },
    { k: 'rgar', n: tesouro ? 'Garantia do Tesouro' : 'Garantia do FGC', ok: fgcOk, v: tesouro ? 'Tesouro Nacional' : fgcOk ? 'até R$ 250 mil' : 'acima do limite' }
  ];
  const al = [];
  if (t === 'LCI' && meses < 9) al.push(['Prazo menor que o permitido', 'LCI e LCA precisam ficar aplicadas pelo menos 9 meses (regra do Conselho Monetário Nacional).']);
  if (meses < 1.1 && !isento) al.push(['IOF no primeiro mês', 'Resgates antes de 30 dias pagam IOF, que come boa parte do rendimento.']);
  if (!fgcOk) al.push(['Acima da garantia', 'O FGC cobre até R$ 250 mil por CPF por instituição. Acima disso, divida entre bancos diferentes.']);
  if (t === 'TP' || t === 'TI') al.push(['Só garante a taxa no vencimento', 'Se vender antes, o preço do título pode estar maior ou menor, conforme os juros do dia.']);
  const okN = c.filter(k => k.ok).length;
  return { t, modo, taxa, meses, valor, anual, ir, cust, bruto, liq, final, la, cdiLiq, real, ipca, cdi, poup, c, okN, al, verdict: okN === 4 ? (la - cdiLiq >= 0.005 ? 'ok' : 'mid') : 'no',
    comp: [['Este investimento', final, 'o'], ['CDB 100% do CDI', fv(cdi, false), 'b'], ['Poupança', fv(poup, true), 'dim'], ['Só a inflação', valor * Math.pow(1 + ipca, anos), 'r']] };
}
function rfResultHTML() {
  const r = rfCalc();
  if (!r) return '<p class="small muted" style="text-align:center">Preencha taxa, prazo e valor.</p>';
  const curto = { rreal: 'a inflação', rcdi: 'o CDI', rpoup: 'a poupança', rgar: 'a garantia' };
  const perde = r.c.filter(k => !k.ok && k.k !== 'rgar').map(k => curto[k.k]);
  const v = r.verdict === 'ok' ? ['ok', '✓', 'Vale a pena: bate o CDI, a poupança e a inflação']
    : r.verdict === 'mid' ? ['mid', '=', 'Empata com o CDI: rende igual a um CDB de 100% do CDI']
    : ['no', '✕', perde.length ? 'Perde para ' + perde.join(', ').replace(/, ([^,]*)$/, ' e $1') : 'Fica sem garantia acima de R$ 250 mil'];
  const mx = Math.max(...r.comp.map(k => k[1])), mn = Math.min(r.valor, ...r.comp.map(k => k[1]));
  const cor = { o: 'var(--txt)', b: 'var(--acc)', dim: 'var(--dim)', r: 'var(--vermelho)' };
  const custos = [r.ir ? 'IR de ' + pct(r.ir, 1) : 'isento de IR', r.cust ? 'custódia ' + brl(r.cust) : ''].filter(Boolean).join(' · ');
  const vs = r.verdict === 'ok' ? 'Vale a pena' : r.verdict === 'mid' ? 'Empata com o CDI' : v[2];
  return `<section class="card rfhero v-${v[0]}">
    <div class="rfh-top"><span class="tiny muted">${brl(r.valor, 0)} em ${r.meses} ${r.meses === 1 ? 'mês' : 'meses'} viram</span><span class="rfh-v ${v[0]}"><i>${v[1]}</i>${vs}</span></div>
    <b class="rfbig num">${brl(r.final)}</b>
    <div class="rfh-st">
      <div><span>Lucro líquido</span><b class="num g">+ ${brl(r.liq, 0)}</b></div>
      <div><span>Rende ${iB('rliq')}</span><b class="num">${pct(r.la)} a.a.</b></div>
      <div><span>Custos</span><b class="num">${r.ir ? 'IR ' + pct(r.ir, 1) : 'Sem IR'}${r.cust ? ' + ' + brl(r.cust, 0) : ''}</b></div>
    </div>
  </section>
  <section class="card">
    <div class="row between"><h3>Comparando no mesmo prazo</h3></div>
    <div class="rfcmp">${r.comp.map(([n, val, c]) => `<div class="${c === 'o' ? 'me' : ''}"><span>${n}</span><div class="bar thin"><i style="width:${(8 + (val - mn) / Math.max(1e-9, mx - mn) * 92).toFixed(1)}%;background:${cor[c]}"></i></div><b class="num">${brl(val, 0)}</b></div>`).join('')}</div>
    <ul class="rfchk">${r.c.map(k => `<li class="${k.ok ? 'ok' : 'no'}"><span>${k.ok ? '✓' : '✕'}</span><p>${k.n} ${iB(k.k)}</p><b class="num">${k.v}</b></li>`).join('')}</ul>
  </section>
  ${r.al.length ? `<div class="alerta"><b>* ${r.al[0][0]}</b><p>${r.al[0][1]}</p></div>` : ''}
  <button class="btn" id="rfsave">Salvar simulação na minha lista</button>`;
}
function rfSugs(txt) {
  const t = semAcento(txt), X = EXTRA.rf, ws = t.replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(Boolean), bate = l => ws.every(w => semAcento(l).replace(/[^A-Z0-9 ]/g, ' ').includes(w));
  const tipos = RF_T.filter(([k, l]) => !ws.length || bate(l + ' ' + k + (k === 'LCI' ? ' LCA' : '') + (['TS', 'TP', 'TI'].includes(k) ? ' TESOURO DIRETO' : ' BANCO')));
  const nm = { LFT: ['TS', 'Tesouro Selic'], LTN: ['TP', 'Tesouro Prefixado'], 'NTN-B': ['TI', 'Tesouro IPCA+'] };
  const tits = X ? X.titulos.filter(k => nm[k.tipo] && k.vencimento > today()).map(k => ({ ...k, rt: nm[k.tipo][0], lb: nm[k.tipo][1] + ' ' + k.vencimento.slice(0, 4) })).filter(k => ws.length ? bate(k.lb) : k.rt === rfS.tipo).slice(0, 8) : [];
  return `<p class="sdcap">${t ? 'Resultados' : 'Tipos de investimento'}</p>${tipos.map(([k, l]) => `<button data-rfpick="${k}" class="${rfS.tipo === k ? 'on' : ''}"><b>${l}</b></button>`).join('')}${tits.length && !t ? '<p class="sdcap">Títulos do Tesouro hoje · toque para simular</p>' : ''}${tits.map(k => { const mm = Math.max(1, Math.round((new Date(k.vencimento) - new Date()) / 2.63e9)); return `<button data-rftit="${k.vencimento}|${k.taxa}|${mm}" data-rftp="${k.rt}"><b>${k.lb}</b> <span class="tiny muted">${k.rt === 'TS' ? '+' + nf(k.taxa * 100, 3) : k.rt === 'TI' ? 'IPCA + ' + nf(k.taxa * 100, 2) : nf(k.taxa * 100, 2)}%</span></button>`; }).join('')}${!tipos.length && !tits.length ? '<span class="tiny muted">Nada encontrado.</span>' : ''}`;
}
let rfEdit = false;
const ICON_EDIT = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13.5 6.5 4 4"/></svg>';
function rfResumo() {
  const t = RF_T.find(k => k[0] === rfS.tipo)[1], m = rfS.tipo === 'TS' ? 'ts' : rfS.tipo === 'TP' ? 'pre' : rfS.tipo === 'TI' ? 'ipca' : rfS.modo;
  const tx = rfS.taxa === '' ? rfDef() : num(rfS.taxa), pz = rfS.prazo === '' ? 24 : num(rfS.prazo), vl = rfS.valor === '' ? 10000 : num(rfS.valor);
  const txt = m === 'pos' ? nf(tx, 1) + '% do CDI' : m === 'ts' ? 'Selic + ' + nf(tx, 3) + '%' : m === 'pre' ? nf(tx, 2) + '% ao ano' : 'IPCA + ' + nf(tx, 2) + '%';
  return `<b>${t} · ${txt}</b><span class="tiny muted">${brl(vl)} por ${pz} ${pz === 1 ? 'mês' : 'meses'}</span>`;
}
function viewRF() {
  if (!EXTRA.rf) loadExtra('rf');
  const tesouro = ['TS', 'TP', 'TI'].includes(rfS.tipo);
  const modo = rfS.tipo === 'TS' ? 'ts' : rfS.tipo === 'TP' ? 'pre' : rfS.tipo === 'TI' ? 'ipca' : rfS.modo;
  const lblTaxa = { ts: 'Selic +', pre: 'Taxa ao ano', ipca: 'IPCA +', pos: '% do CDI' }[modo];
  return `<header class="page row between"><div><h1>Renda fixa</h1><p class="small muted">Vale a pena? Veja em reais</p></div>${HEADBTNS()}</header>${anTabs()}
  <div class="sbar">
    <div class="search">${lupa}<input id="rfq" autocomplete="off" enterkeyhint="search" placeholder="Buscar CDB, LCI, Tesouro…"></div>
    <div id="rfsugs" class="sdrop">${rfSugs('')}</div>
  </div>
  <section class="card rfsum${rfEdit ? ' ed' : ''}">
    <div class="rfsum-h"><div class="rfsum-t" id="rfresumo">${rfResumo()}</div><button class="rfedbtn" id="rfedit" aria-label="${rfEdit ? 'Fechar edição' : 'Editar simulação'}">${rfEdit ? '✓' : ICON_EDIT}</button></div>
    ${rfEdit ? `<div class="rfed">
      ${tesouro ? '' : `<div class="seg3 rfmodo" id="rfmodo">${[['pos', '% do CDI'], ['pre', 'Prefixado'], ['ipca', 'IPCA +']].map(([k, l]) => `<button data-rfm="${k}" class="${rfS.modo === k ? 'on' : ''}">${l}</button>`).join('')}</div>`}
      <div class="rf3">
        <div class="field"><label>${lblTaxa}</label><div class="inp"><input id="rftaxa" inputmode="decimal" placeholder="${nf(rfDef(), 2)}" value="${esc(rfS.taxa)}"><span class="suf">%</span></div></div>
        <div class="field"><label>Prazo</label><div class="inp"><input id="rfprazo" inputmode="numeric" placeholder="24" value="${esc(rfS.prazo)}"><span class="suf">m</span></div></div>
        <div class="field"><label>Valor</label><div class="inp"><input id="rfvalor" inputmode="decimal" placeholder="10.000" value="${esc(rfS.valor)}"></div></div>
      </div></div>` : ''}
  </section>
  <div id="rfres" class="stack">${rfResultHTML()}</div>
  <p class="disc">Simulação com CDI, IPCA e poupança de hoje (Banco Central) mantidos no período. Taxas do Tesouro: ANBIMA${EXTRA.rf && EXTRA.rf.data_ref ? ' de ' + dBRs(EXTRA.rf.data_ref) : ''}. Não é promessa de rendimento nem recomendação de investimento.</p>`;
}

/* ----- EUA ----- */
let euaSel = '', euaN = 10;
const EUA_POP = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'KO', 'JNJ', 'JPM', 'V', 'PG', 'XOM', 'META'];
function euaAnalise(q) {
  const X = EXTRA.eua, t10 = X && X.treasury10 ? X.treasury10.valor : 0.045;
  return analyze({ price: q.preco, lpa: q.lpa, vpa: q.vpa, dy: q.dy || 0, roe: q.roe, payout: q.payout || 0, div: q.div_ebitda, fin: q.financeira, nodiv: !q.financeira && q.div_ebitda == null }, { regua: t10 + S.settings.premio, rtxt: 'Rende mais que o título americano + risco' });
}
let EUA_MEMO = null;
function euaTodos() { const E = EXTRA.eua && EXTRA.eua.acoes; if (!E) return []; if (EUA_MEMO && EUA_MEMO.d === EXTRA.eua) return EUA_MEMO.v; const v = Object.entries(E).map(([c, q]) => ({ c, q, r: euaAnalise(q) })); EUA_MEMO = { d: EXTRA.eua, v }; return v; }
function viewEUA() {
  const X = EXTRA.eua, E = X && X.acoes;
  const head = `<header class="page row between"><div><h1>Ações dos EUA</h1><p class="small muted">Empresas americanas nos 4 critérios</p></div>${HEADBTNS()}</header>${anTabs()}`;
  if (!E) { loadExtra('eua'); return head + `<p class="tiny muted" style="text-align:center">Carregando os balanços da SEC e as cotações…</p><section class="card"><div class="sk" style="width:45%"></div>${'<div class="skr"><i></i><div><div class="sk"></div><div class="sk" style="width:60%"></div></div><i></i></div>'.repeat(6)}</section>`; }
  const q = euaSel && E[euaSel];
  const pop = EUA_POP.filter(c => E[c]).map(c => [c, '']);
  return head + `
  <div class="sbar">
    <div class="search">${lupa}<input id="euaq" autocapitalize="characters" maxlength="30" autocomplete="off" enterkeyhint="search" placeholder="Código ou empresa (ex.: AAPL, Coca-Cola)" value="${esc(euaSel)}">${euaSel ? '<button id="euaclr" aria-label="Limpar">✕</button>' : ''}</div>
    <div id="euasugs" class="sdrop"><p class="sdcap">Mais buscados</p>${sugChips(pop, 'eua')}</div>
  </div>
  ${q ? euaResult(euaSel, q) : euaRanking()}
  <p class="disc">Balanço anual e dividendos por ação entregues à SEC, cotação de fechamento (Nasdaq), juro do título americano de 10 anos (U.S. Treasury, ${X.treasury10 ? pct(X.treasury10.valor, 2) : '—'}) e dólar PTAX do Banco Central. Ferramenta educativa, não é recomendação de compra ou venda.</p>`;
}
function euaResult(c, q) {
  const r = euaAnalise(q), X = EXTRA.eua, fx = X.dolar ? X.dolar.valor : NaN;
  const vezes = q.preco / r.graham;
  return `${resTabs('eua:' + c)}
  <div class="stack" data-rp="analise"${resTab === 'analise' ? '' : ' hidden'}>
  ${vereditoCard({ titulo: c + ' · ' + q.nome, verdict: r.verdict, okN: r.okN, retLbl: 'retorno/ano', retI: 'ret', ret: pct(r.ret), retOk: r.ret > r.regua,
    linha: `DY ${pct(r.dyU)} + crescimento ${pct(r.cres)} · régua ${pct(r.regua)} (título americano de 10 anos + prêmio de ${pct(S.settings.premio)})` })}
  ${r.dyCort ? `<div class="alerta"><b>* Dividendos acima do lucro</b><p>Pagou ${pct(r.dyB)} em dividendos, mais do que lucrou. Na conta usamos no máximo o lucro: ${pct(r.dyU)}.</p></div>` : ''}
  ${isFinite(r.graham) ? barraPreco({ k: r.kp, titulo: 'Cara ou barata?', i: 'margem', tag: KP_T[r.kp], l1: 'Preço hoje', v1: usd(q.preco), l2: 'Preço justo', v2: usd(r.graham),
    dif: Math.abs(r.margem) < 0.005 ? 'igual ao justo' : vezes >= 2 ? `${nf(vezes, 1)}x o justo` : `${pct(Math.abs(r.margem), 0)} ${r.margem > 0 ? 'abaixo' : 'acima'}`, pos: 50 + r.margem * 100, leg: ['cara', 'justa', 'barata'],
    nota: r.kp === 'b' ? 'Preço abaixo do justo pela fórmula de Graham.' : r.kp === 'c' ? 'Preço acima do justo: muitas empresas americanas de crescimento ficam assim.' : 'Perto do valor justo.' })
    : `<section class="card pz pz-n"><div class="pz-top"><span class="pz-l">Cara ou barata? ${iB('graham')}</span><span class="pz-tag">Sem preço justo</span></div><p class="pz-nota">Com prejuízo ou patrimônio negativo, a fórmula de Graham não se aplica.</p></section>`}
  ${critHTML(r.c.map(k => ({ ...k, n: k.n.replace('ROE de pelo menos', 'ROE ≥').replace('Dívida até', 'Dívida ≤').replace(' o EBITDA', '').replace('P/L entre 3 e', 'P/L 3 a').replace('Retorno acima de', 'Retorno >').replace('Dívida: não se aplica', 'Dívida: n/a').replace('Dívida: EBITDA negativo', 'Dívida: sem dado') })))}
  <div class="alerta" style="border-color:rgba(91,124,255,.35);background:rgba(91,124,255,.08)"><b>* Como investir daqui</b><p>Pela B3, por meio de BDR (recibo da ação americana negociado em reais), ou por uma corretora no exterior. Além da empresa, você fica exposto ao dólar (hoje ${isFinite(fx) ? brl(fx, 4) : '—'}).</p></div>
  ${salvarBtn('eua', c)}
  </div>
  <div class="stack" data-rp="ind"${resTab === 'ind' ? '' : ' hidden'}>
  <div class="metrics4">
    <div><span class="tiny muted">P/L ${iB('pl')}</span><b class="num ${ckc(r, 'pl')}">${x(r.pl)}</b></div>
    <div><span class="tiny muted">P/VP ${iB('pvp')}</span><b class="num ${cPvp(r.pvp)}">${x(r.pvp, 2)}</b></div>
    <div><span class="tiny muted">Em reais ${iB('emreais')}</span><b class="num">${isFinite(fx) ? brl(q.preco * fx) : '—'}</b></div>
    <div><span class="tiny muted">Lucro 5a ${iB('cres5')}</span><b class="num ${q.cres5a >= 0 ? 'g' : 'r'}">${q.cres5a != null ? (q.cres5a >= 0 ? '+' : '') + pct(q.cres5a, 0) + '/ano' : '—'}</b></div>
  </div>
  <div class="metrics4">
    <div><span class="tiny muted">ROE ${iB('roe')}</span><b class="num ${ckc(r, 'roe')}">${pct(q.roe)}</b></div>
    <div><span class="tiny muted">DY ${iB('dy')}</span><b class="num ${cDy(q.dy)}">${pct(q.dy)}</b></div>
    <div><span class="tiny muted">Payout ${iB('payout')}</span><b class="num ${cPay(q.payout)}">${pct(q.payout, 0)}</b></div>
    <div><span class="tiny muted">Dív/EBITDA ${iB('div')}</span><b class="num ${q.financeira ? '' : ckc(r, 'div')}">${q.financeira ? 'n/a' : x(q.div_ebitda)}</b></div>
  </div>
  <div class="metrics4">
    <div><span class="tiny muted">LPA ${iB('lpa')}</span><b class="num ${cPos(q.lpa)}">${usd(q.lpa)}</b></div>
    <div><span class="tiny muted">VPA ${iB('vpa')}</span><b class="num ${cPos(q.vpa)}">${usd(q.vpa)}</b></div>
    <div><span class="tiny muted">Graham ${iB('graham')}</span><b class="num ${r.abaixoGraham ? 'g' : isFinite(r.graham) ? 'r' : ''}">${usd(r.graham)}</b></div>
    <div><span class="tiny muted">Margem ${iB('margem')}</span><b class="num ${r.margem >= 0 ? 'g' : 'r'}">${pct(r.margem, 0)}</b></div>
  </div>
  ${euaGraficos(q)}
  <p class="tiny dim" style="text-align:center">Balanço anual até ${q.balanco ? q.balanco.slice(8, 10) + '/' + q.balanco.slice(5, 7) + '/' + q.balanco.slice(0, 4) : '—'} (SEC)</p>
  </div>`;
}

const usdK = v => !isFinite(v) ? '—' : Math.abs(v) >= 1e9 ? 'US$ ' + nf(v / 1e9, Math.abs(v) >= 1e11 ? 0 : 1) + ' bi' : Math.abs(v) >= 1e6 ? 'US$ ' + nf(v / 1e6, 0) + ' mi' : usd(v, 0);
function grafLinha(pts, M = usd, titulo = 'Preço em 12 meses', cid = 'gl') {
  if (!pts || pts.length < 4) return '';
  const W = 320, H = 120, ys = pts.map(p => p[1]), mn = Math.min(...ys), mx = Math.max(...ys), rg = mx - mn || 1;
  const X = i => (i / (pts.length - 1)) * W, Y = v => H - 8 - ((v - mn) / rg) * (H - 22);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
  const var12 = ys[ys.length - 1] / ys[0] - 1, cor = var12 >= 0 ? 'var(--verde)' : 'var(--vermelho)';
  const iMx = ys.indexOf(mx), iMn = ys.indexOf(mn);
  const dt = s => s.slice(8, 10) + '/' + s.slice(5, 7);
  return `<section class="card gr"><div class="row between"><h3>${titulo}</h3><span class="chip ${var12 >= 0 ? 'g' : 'r'}">${var12 >= 0 ? '▲ ' : '▼ '}${pct(Math.abs(var12))}</span></div>
    <svg viewBox="0 0 ${W} ${H}" class="gr-l" preserveAspectRatio="none"><defs><linearGradient id="${cid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity=".28"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient></defs>
      <path d="${d} L${W} ${H} L0 ${H} Z" fill="url(#${cid})"/><path class="gr-ln" d="${d}" fill="none" stroke="${cor}" stroke-width="2.2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${X(pts.length - 1)}" cy="${Y(ys[ys.length - 1])}" r="3.5" fill="${cor}"/></svg>
    <div class="gr-ax"><span>${dt(pts[0][0])}/${pts[0][0].slice(2, 4)}</span><span>máx ${M(mx)} · mín ${M(mn)}</span><span>hoje ${M(ys[ys.length - 1])}</span></div>
  </section>`;
}
function grafBarras(titulo, series, nota, fmt = v => usdK(v).replace('US$ ', '')) {
  const anos = [...new Set(series.flatMap(s => s.d.map(p => p[0])))].sort().slice(-5);
  if (anos.length < 2) return '';
  const vals = series.flatMap(s => s.d.filter(p => anos.includes(p[0])).map(p => p[1]));
  const mx = Math.max(...vals.map(Math.abs), 1);
  return `<section class="card gr"><div class="row between"><h3>${titulo}</h3><span class="gr-leg">${series.map(s => `<span><i style="background:${s.cor}"></i>${s.nome}</span>`).join('')}</span></div>
    <div class="gr-b">${anos.map(a => `<div class="gr-c"><div class="gr-bars">${series.map(s => { const p = s.d.find(z => z[0] === a); const v = p ? p[1] : null; return `<div class="gr-bw"><small>${v == null ? '' : fmt(v)}</small><i style="height:${v == null ? 0 : Math.max(3, Math.abs(v) / mx * 92).toFixed(1)}px;background:${v < 0 ? 'var(--vermelho)' : s.cor}"></i></div>`; }).join('')}</div><span>${a}</span></div>`).join('')}</div>
    ${nota ? `<p class="tiny dim" style="margin-top:8px">${nota}</p>` : ''}</section>`;
}
const GRF = {}, GRF_LOAD = {};
function loadG(c) {
  if (!c || GRF[c] !== undefined || GRF_LOAD[c]) return; GRF_LOAD[c] = 1;
  fetch('data/g/' + c + '.json', { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null).then(j => { GRF[c] = j; agendaRender(); });
}
const brlK2 = v => !isFinite(v) ? '—' : Math.abs(v) >= 1e9 ? nf(v / 1e9, Math.abs(v) >= 1e11 ? 0 : 1) + ' bi' : Math.abs(v) >= 1e6 ? nf(v / 1e6, 0) + ' mi' : nf(v, 0);
const gCarregando = '<section class="card"><p class="small muted">Carregando gráficos…</p><div class="sk" style="height:90px;margin-top:10px"></div></section>';
function acaoGraficos(code) {
  if (!code || !Q(code)) return '';
  if (GRF[code] === undefined) { loadG(code); return gCarregando; }
  const g = GRF[code]; if (!g) return histHTML(code);
  let out = g.hist ? grafLinha(g.hist, v => brl(v), 'Preço em 12 meses', 'gla') : histHTML(code);
  const A = g.anos || {}, R = A.receita || [], L = A.lucro || [], P = A.proventos || [];
  if (R.length >= 2 || L.length >= 2) {
    const ul = L[L.length - 1], ur = ul && R.find(r => r[0] === ul[0]), marg = ur && ur[1] ? ul[1] / ur[1] : null;
    out += grafBarras('Receita e lucro por ano', [{ nome: 'Receita', cor: 'rgba(122,162,255,.42)', d: R }, { nome: 'Lucro', cor: 'var(--c-acoes)', d: L }], (marg != null ? `Margem líquida em ${ul[0]}: <b>${pct(marg)}</b> (de cada R$ 100 vendidos, sobraram R$ ${nf(marg * 100, 0)} de lucro). ` : '') + 'Valores em R$, balanços anuais (DFP) na CVM.', brlK2);
  }
  if (P.length >= 2 && P.some(p => p[1] > 0)) out += grafBarras('Proventos pagos por ano', [{ nome: 'Dividendos e JCP', cor: 'var(--verde)', d: P.map(p => [p[0], Math.abs(p[1])]) }], 'Total de dividendos e juros sobre capital próprio de cada ano, em R$.', brlK2);
  return out;
}
function fiiGraficos(code, q) {
  if (GRF[code] === undefined) { loadG(code); return gCarregando; }
  const g = GRF[code]; if (!g) return '';
  let out = g.hist ? grafLinha(g.hist, v => brl(v), 'Cota em 12 meses', 'glf') : '';
  if (g.vp && g.vp.filter(p => p[1]).length >= 3) {
    const pts = g.vp.filter(p => p[1]).map(p => [p[0] + '-01', p[1]]);
    out += grafLinha(pts, v => brl(v), 'Patrimônio por cota (12 meses)', 'glv').replace('<div class="gr-ax">', `<p class="tiny dim">Quanto vale o patrimônio do fundo dividido pelas cotas, mês a mês. Cota hoje: <b>${brl(q.preco)}</b> (P/VP ${x(q.pvp, 2)}).</p><div class="gr-ax">`);
  }
  if (g.cotistas && g.cotistas.length >= 3) {
    const c = g.cotistas.filter(p => p[1] > 0);
    if (c.length >= 3) out += grafBarras('Cotistas (12 meses)', [{ nome: 'Cotistas', cor: 'var(--c-fiis)', d: c.slice(-6).map(p => [MES3[+p[0].slice(5, 7) - 1], p[1]]) }], `${c[c.length - 1][1] >= c[0][1] ? 'Mais' : 'Menos'} cotistas que há ${c.length} meses: ${(c[c.length - 1][1] / c[0][1] - 1 >= 0 ? '+' : '') + pct(c[c.length - 1][1] / c[0][1] - 1)}.`, v => v >= 1e6 ? nf(v / 1e6, 1) + ' mi' : v >= 1e3 ? nf(v / 1e3, 0) + ' mil' : nf(v, 0)).replace(/<div class="gr-c"><div class="gr-bars">/g, '<div class="gr-c"><div class="gr-bars">');
  }
  if (g.comp) {
    const cores = ['var(--c-fiis)', 'var(--c-rf)', 'var(--c-eua)', 'rgba(255,255,255,.25)'], tot = Object.values(g.comp).reduce((a, b) => a + (b > 0 ? b : 0), 0) || 1, it = Object.entries(g.comp).filter(([, v]) => v > 0.005).map(([k, v]) => [k, v / tot]);
    out += `<section class="card gr"><h3>Onde o dinheiro do fundo está</h3><div class="gr-stk">${it.map(([k, v], i) => `<i style="width:${(v * 100).toFixed(1)}%;background:${cores[i % 4]}"></i>`).join('')}</div>
      <div class="gr-stl">${it.map(([k, v], i) => `<span><i style="background:${cores[i % 4]}"></i>${k} <b>${pct(v, 0)}</b></span>`).join('')}</div>
      <p class="tiny dim">Último informe mensal na CVM.</p></section>`;
  }
  return out;
}
function euaGraficos(q) {
  const A = q.anos || {}, R = A.receita || [], L = A.lucro || [], D = A.dividendos || [];
  let out = grafLinha(q.hist);
  if (R.length >= 2 || L.length >= 2) {
    const ult = L.length && R.length ? R.find(r => r[0] === L[L.length - 1][0]) : null;
    const marg = ult && ult[1] ? L[L.length - 1][1] / ult[1] : null;
    out += grafBarras('Receita e lucro por ano', [{ nome: 'Receita', cor: 'rgba(183,156,255,.45)', d: R }, { nome: 'Lucro', cor: 'var(--c-eua)', d: L }], marg != null ? `Margem líquida em ${L[L.length - 1][0]}: <b>${pct(marg)}</b> (de cada US$ 100 vendidos, sobraram US$ ${nf(marg * 100, 0)} de lucro). Valores em US$ bilhões, balanços anuais na SEC.` : 'Valores em US$, balanços anuais na SEC.');
  }
  if (D.length >= 2 && D.some(p => p[1] > 0)) out += grafBarras('Dividendos pagos por ano', [{ nome: 'Dividendos', cor: 'var(--verde)', d: D.map(p => [p[0], Math.abs(p[1])]) }], 'Total pago aos acionistas em cada ano, em US$.');
  return out;
}
function euaRanking() {
  const all = euaTodos(), passam = all.filter(k => k.r.okN === 4).sort((a, b) => b.r.ret - a.r.ret);
  return `<section class="card">
    <div class="row between"><h3>Ranking dos EUA</h3><span class="tiny muted">${passam.length} de ${all.length} passam</span></div>
    <div class="rk-h tiny muted" style="margin-top:10px"><span>#</span><span>Empresa</span><span>Preço</span><span style="text-align:right">Retorno/ano</span></div>
    <div class="list">${passam.slice(0, euaN).map((k, i) => `<button class="rk" data-eua="${k.c}"><span class="rank ${i === 0 ? 'first' : ''}">${i + 1}º</span><span class="t"><b>${k.c}</b><span class="tiny muted">${esc(k.q.nome.split(' ').slice(0, 2).join(' ').replace(/[,.]+$/, ''))}</span></span><span class="kp kp-${k.r.kp}">${KP_T[k.r.kp].replace('Sem preço justo', 'n/d').replace('Preço justo', 'Justa')}</span><b class="num g">${pct(k.r.ret)}</b></button>`).join('')}</div>
    ${passam.length > euaN ? `<button class="more" id="euamore">Mostrar mais (${passam.length - euaN} restantes)</button>` : ''}
    ${!passam.length ? '<p class="small muted" style="padding:12px 0">Nenhuma empresa passa nos 4 critérios hoje.</p>' : ''}
    <p class="tiny dim" style="margin-top:8px">Empresas que passam nos 4 critérios, em ordem de retorno esperado. Toque na busca para ver qualquer uma das ${all.length}.</p>
  </section>`;
}
function bindTipos() {
  const at = $('#antipo'); if (at) at.onclick = e => { const b = e.target.closest('[data-ant]'); if (!b) return; anTipo = b.dataset.ant; if (anTipo !== 'acoes') loadExtra(anTipo); render(); window.scrollTo({ top: 0 }); };
  const busca = (inp, box, base, nomeF, attr, pop, onPick) => {
    const i = $(inp), bx = $(box); if (!i || !bx) return;
    i.oninput = () => { const v = i.value.trim(); bx.hidden = false; bx.innerHTML = v ? sugChips(buscaLista(base(), v, nomeF), attr) || '<span class="tiny muted">Nenhum encontrado.</span>' : '<p class="sdcap">Mais buscados</p>' + sugChips(pop(), attr); };
    i.onfocus = () => { bx.hidden = false; };
    bx.onclick = e => { const b = e.target.closest(`[data-${attr}]`); if (b) { e.stopPropagation(); i.blur(); onPick(b.dataset[attr]); } };
    i.onkeydown = e => { if (e.key === 'Enter') { const f = bx.querySelector(`[data-${attr}]`); const v = i.value.trim().toUpperCase(); if (base()[v]) onPick(v); else if (f) onPick(f.dataset[attr]); } };
  };
  if ($('#fiiq')) busca('#fiiq', '#fiisugs', () => EXTRA.fiis.fiis, q => q.nome, 'fii', () => FII_POP.filter(c => QF(c)).map(c => [c, '']), c => { fiiSel = c; render(); window.scrollTo({ top: 0 }); });
  if ($('#euaq')) busca('#euaq', '#euasugs', () => EXTRA.eua.acoes, q => q.nome, 'eua', () => EUA_POP.filter(c => QE(c)).map(c => [c, '']), c => { euaSel = c; render(); window.scrollTo({ top: 0 }); });
  document.querySelectorAll('[data-fii]').forEach(b => b.onclick = () => { fiiSel = b.dataset.fii; render(); window.scrollTo({ top: 0 }); });
  document.querySelectorAll('[data-eua]').forEach(b => b.onclick = () => { euaSel = b.dataset.eua; render(); window.scrollTo({ top: 0 }); });
  const fc = $('#fiiclr'); if (fc) fc.onclick = () => { fiiSel = ''; render(); setTimeout(() => { const i = $('#fiiq'); if (i) i.focus(); }, 50); };
  const ec = $('#euaclr'); if (ec) ec.onclick = () => { euaSel = ''; render(); setTimeout(() => { const i = $('#euaq'); if (i) i.focus(); }, 50); };
  const ff = $('#fiif'); if (ff) ff.onclick = e => { const b = e.target.closest('[data-ff]'); if (!b) return; fiiF = b.dataset.ff; fiiN = 10; render(); };
  const fm = $('#fiimore'); if (fm) fm.onclick = () => { fiiN += 10; render(); };
  const em = $('#euamore'); if (em) em.onclick = () => { euaN += 10; render(); };
  const rt = $('#rftipo'); if (rt) rt.onclick = e => { const b = e.target.closest('[data-rft]'); if (!b) return; rfS = { ...rfS, tipo: b.dataset.rft, taxa: '' }; if (rfS.tipo === 'LCI' && rfS.modo === 'pos') rfS.taxa = ''; render(); };
  const rm = $('#rfmodo'); if (rm) rm.onclick = e => { const b = e.target.closest('[data-rfm]'); if (!b) return; rfS = { ...rfS, modo: b.dataset.rfm, taxa: '' }; render(); };
  const re = $('#rfedit'); if (re) re.onclick = () => { rfEdit = !rfEdit; render(); if (rfEdit) setTimeout(() => { const i = $('#rftaxa'); if (i) i.focus(); }, 60); };
  for (const [id, k] of [['#rftaxa', 'taxa'], ['#rfprazo', 'prazo'], ['#rfvalor', 'valor']]) { const i = $(id); if (i) i.oninput = () => { rfS[k] = i.value.trim(); const res = $('#rfres'); if (res) { res.innerHTML = deEmoji(rfResultHTML()); bindRfSave(); } const rs = $('#rfresumo'); if (rs) rs.innerHTML = rfResumo(); }; }
  const rfTit = b => { const [, tx, mm] = b.dataset.rftit.split('|'); const tp = b.dataset.rftp || rfS.tipo; rfS = { ...rfS, tipo: tp, taxa: nf(+tx * 100, tp === 'TS' ? 3 : 2), prazo: String(mm) }; if (document.activeElement) document.activeElement.blur(); };
  const rq = $('#rfq'), rsg = $('#rfsugs');
  if (rq && rsg) { rq.oninput = () => { rsg.innerHTML = rfSugs(rq.value); }; rsg.onclick = e => { const p = e.target.closest('[data-rfpick]'), t = e.target.closest('[data-rftit]'); if (p) { rfS = { ...rfS, tipo: p.dataset.rfpick, taxa: '' }; rq.blur(); render(); } else if (t) { rfTit(t); render(); const r = $('#rfres'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }; rq.onkeydown = e => { if (e.key === 'Enter') { const f = rsg.querySelector('button'); if (f) f.click(); } }; }
  document.querySelectorAll('.rftxl [data-rftit]').forEach(b => b.onclick = () => { rfTit(b); render(); const r = $('#rfres'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}

/* ---------- MINHA LISTA (todas as abas do Analisar) ---------- */
const ICON_LISTA = '<svg viewBox="0 0 24 24"><path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1z"/></svg>';
const listaN = () => S.analyses.length + S.lista.fiis.length + S.lista.eua.length + S.lista.rf.length;
const HEADBTNS = () => { const n = listaN(); return `<div class="row" style="gap:8px"><button class="iconbtn listbtn" id="lista" aria-label="Minha lista">${ICON_LISTA}${n ? `<em>${n > 99 ? '99+' : n}</em>` : ''}</button>${GEAR()}</div>`; };
const naLista = (k, c) => S.lista[k].includes(c);
const salvarBtn = (k, c) => naLista(k, c) ? `<button class="btn ghost" data-lsave="${k}|${c}">✓ Na sua lista · remover</button>` : `<button class="btn" data-lsave="${k}|${c}">Salvar na minha lista</button>`;
let listaTab = null;
const rfNome = o => { const t = RF_T.find(k => k[0] === o.tipo); const m = o.tipo === 'TS' ? 'ts' : o.tipo === 'TP' ? 'pre' : o.tipo === 'TI' ? 'ipca' : o.modo; const tx = o.taxa === '' ? '' : num(o.taxa); return (t ? t[1] : o.tipo) + ' · ' + (m === 'pos' ? nf(tx, 1) + '% do CDI' : m === 'ts' ? 'Selic + ' + nf(tx, 2) + '%' : m === 'pre' ? nf(tx, 2) + '% a.a.' : 'IPCA + ' + nf(tx, 2) + '%'); };
function listaItens(k) {
  const st = ok => ok === 4 ? '<span class="tiny g">Passou · 4/4</span>' : `<span class="tiny r">Não passou · ${ok}/4</span>`;
  const row = (attr, id, titulo, sub, v, vc) => `<div class="item" data-lopen="${k}|${esc(id)}"><div class="t"><b>${esc(titulo)}</b>${sub}</div><div class="v num ${vc}">${v}</div><button class="del" data-ldel="${k}|${esc(id)}" aria-label="Tirar da lista">${ICON.trash}</button></div>`;
  if (k === 'acoes') return S.analyses.map(s => { const q = Q(s.code); const t = q ? aFromQ(q) : s; return { s, r: analyze(t) }; }).sort((a, b) => (b.r.okN === 4) - (a.r.okN === 4) || b.r.ret - a.r.ret)
    .map(({ s, r }) => row('', s.id, s.code, st(r.okN), pct(r.ret), r.ret > r.regua ? 'g' : 'r'));
  if (k === 'fiis') { if (!EXTRA.fiis) { loadExtra('fiis'); return null; } return S.lista.fiis.map(c => { const q = QF(c); if (!q) return row('', c, c, '<span class="tiny muted">sem dados hoje</span>', '—', ''); const r = fiiAnalise(q); return { c, q, r }; }).map(o => typeof o === 'string' ? o : row('', o.c, o.c, st(o.r.okN) + `<span class="tiny muted"> · P/VP ${x(o.q.pvp, 2)}</span>`, pct(o.q.dy), o.q.dy >= o.r.regua ? 'g' : 'r')); }
  if (k === 'eua') { if (!EXTRA.eua) { loadExtra('eua'); return null; } return S.lista.eua.map(c => { const q = QE(c); if (!q) return row('', c, c, '<span class="tiny muted">sem dados hoje</span>', '—', ''); const r = euaAnalise(q); return row('', c, c, st(r.okN) + `<span class="tiny muted"> · ${usd(q.preco)}</span>`, pct(r.ret), r.ret > r.regua ? 'g' : 'r'); }); }
  if (k === 'rf') return S.lista.rf.map(o => { const bak = rfS; rfS = { ...o }; const r = rfCalc(); rfS = bak; return row('', o.id, rfNome(o), r ? st(r.okN) + `<span class="tiny muted"> · ${o.prazo || 24} meses · ${brl(r.valor, 0)}</span>` : '', r ? pct(r.la) : '—', r && r.la >= r.cdiLiq ? 'g' : 'r'); });
  return [];
}
function abrirLista(tab) {
  listaTab = tab || listaTab || anTipo;
  const cont = { acoes: S.analyses.length, fiis: S.lista.fiis.length, rf: S.lista.rf.length, eua: S.lista.eua.length };
  const itens = listaItens(listaTab);
  const vazio = { acoes: 'Analise uma ação e toque em "Salvar na minha lista".', fiis: 'Abra um fundo na aba FIIs e toque em "Salvar na minha lista".', rf: 'Faça uma simulação na aba Renda fixa e toque em "Salvar simulação na minha lista".', eua: 'Abra uma empresa na aba EUA e toque em "Salvar na minha lista".' }[listaTab];
  openSheet(`<div class="stack">
    <div class="row between"><h3>Minha lista</h3><span class="tiny muted">${listaN()} ${listaN() === 1 ? 'item salvo' : 'itens salvos'}</span></div>
    <div class="seg3 seg4" id="ltabs">${AN_T.map(([k, l]) => `<button data-lt="${k}" class="${listaTab === k ? 'on' : ''}">${l}${cont[k] ? ` <small>${cont[k]}</small>` : ''}</button>`).join('')}</div>
    ${itens === null ? '<p class="small muted">Carregando os dados…</p>' : itens.length ? `<div class="list">${itens.join('')}</div><p class="tiny dim">Números de hoje. Toque num item para abrir a análise completa.</p>` : `<div class="hint row"><img src="img/analisar.webp" alt=""><p class="small muted">Nada salvo aqui ainda. ${vazio}</p></div>`}
    <button class="btn ghost" data-close>Fechar</button></div>`, () => {
    const B = $('#sheet-body');
    B.querySelectorAll('[data-lt]').forEach(b => b.onclick = () => abrirLista(b.dataset.lt));
    B.querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheet);
    B.querySelectorAll('[data-ldel]').forEach(b => b.onclick = e => {
      e.stopPropagation(); const [k, id] = b.dataset.ldel.split('|');
      if (k === 'acoes') S.analyses = S.analyses.filter(z => z.id !== id); else if (k === 'rf') S.lista.rf = S.lista.rf.filter(z => z.id !== id); else S.lista[k] = S.lista[k].filter(z => z !== id);
      save(); abrirLista(k); render(); toast('Tirado da lista');
    });
    B.querySelectorAll('[data-lopen]').forEach(el => el.onclick = () => {
      const [k, id] = el.dataset.lopen.split('|');
      closeSheet(); anTipo = k;
      if (k === 'acoes') { const s = S.analyses.find(z => z.id === id); if (s) { if (Q(s.code)) { route = 'analisar'; fillFromData(s.code); } else { draft = { code: s.code, price: nf(s.price), lpa: nf(s.lpa), vpa: nf(s.vpa), dy: nf(s.dy * 100), roe: nf(s.roe * 100), payout: nf(s.payout * 100), div: nf(s.div), src: null }; } } }
      else if (k === 'fiis') fiiSel = id; else if (k === 'eua') euaSel = id;
      else { const o = S.lista.rf.find(z => z.id === id); if (o) rfS = { tipo: o.tipo, modo: o.modo, taxa: o.taxa, prazo: o.prazo, valor: o.valor }; }
      if (route !== 'analisar') go('analisar'); else render();
      window.scrollTo({ top: 0 });
    });
  });
}
function bindLista() {
  const am = $('#acmore'); if (am) am.onclick = () => { acN += 10; render(); };
  const lb = $('#lista'); if (lb) lb.onclick = () => abrirLista(anTipo);
  document.querySelectorAll('[data-lsave]').forEach(b => b.onclick = () => {
    const [k, c] = b.dataset.lsave.split('|');
    if (naLista(k, c)) { S.lista[k] = S.lista[k].filter(z => z !== c); toast(c + ' saiu da sua lista'); }
    else { S.lista[k].push(c); toast(c + ' salvo na sua lista ✔'); }
    save(); render();
  });
  bindRfSave();
}
function bindRfSave() {
  const rs = $('#rfsave'); if (rs) rs.onclick = () => {
    const o = { id: uid(), tipo: rfS.tipo, modo: rfS.modo, taxa: rfS.taxa === '' ? nf(rfDef(), 2) : rfS.taxa, prazo: rfS.prazo || '24', valor: rfS.valor || '10.000' };
    const dup = S.lista.rf.find(z => z.tipo === o.tipo && z.modo === o.modo && z.taxa === o.taxa && z.prazo === o.prazo && z.valor === o.valor);
    if (dup) { toast('Essa simulação já está na sua lista'); return; }
    S.lista.rf.push(o); save(); render(); toast('Simulação salva na sua lista ✔');
  };
}

/* ---------- CONTAS PAGAS PELOS DIVIDENDOS ---------- */
const FIXAS = ['Moradia', 'Contas', 'Assinaturas', 'Educação', 'Saúde', 'Transporte'];
function contasFixas() {
  const ms = [...new Set(S.tx.filter(t => t.type === 'out').map(t => ym(t.date)))].filter(m => m <= ym(today())).sort();
  const m = ms.includes(curMonth) ? curMonth : ms[ms.length - 1];
  if (!m) return [];
  const tx = S.tx.filter(t => t.type === 'out' && ym(t.date) === m && FIXAS.includes(t.cat));
  const g = {};
  for (const t of tx) { const nome = (t.note && t.note.trim()) || t.cat, k = nome.toLowerCase(); (g[k] = g[k] || { nome, cat: t.cat, v: 0 }).v += t.value; }
  return Object.values(g).filter(c => c.v > 0).sort((a, b) => a.v - b.v);
}
function rendaPassiva() {
  const p = portfolio();
  if (p.d12 > 0) return { v: p.dMes, est: false };
  let a = 0;
  for (const x of S.assets) { const f = QF(x.code); if (f && f.dy > 0) { a += x.qty * (f.preco || x.price) * f.dy; continue; } const q = Q(x.code); if (q && q.dy > 0) a += x.qty * (q.preco || x.price) * Math.min(q.dy, Math.max(0, q.lpa > 0 && q.preco > 0 ? q.lpa / q.preco : q.dy)); }
  return { v: a / 12, est: a > 0 };
}
function contasCard(full) {
  const contas = contasFixas(), r = rendaPassiva(), y = S.settings.yieldMeta > 0 ? S.settings.yieldMeta : 0.08;
  if (!contas.length) return full ? `<section class="card"><div class="row between"><h3>Contas pagas pelos dividendos</h3><span class="chip o">NOVO</span></div><p class="small muted" style="margin-top:6px">Lance suas contas fixas em <b class="o">Despesas</b> (aluguel, luz, internet, celular, streaming) para ver quais delas seus investimentos já pagam sozinhos.</p></section>` : '';
  let resto = r.v, pagas = 0;
  const rows = contas.map(c => { const p = Math.max(0, Math.min(1, resto / c.v)); resto = Math.max(0, resto - c.v); if (p >= 1) pagas++; return { ...c, p }; });
  const prox = rows.find(c => c.p < 1), falta = prox ? prox.v * (1 - prox.p) : 0;
  const lista = full ? rows : rows.slice(0, 4);
  return `<section class="card">
    <div class="row between"><h3>Contas pagas pelos dividendos</h3><span class="chip ${pagas ? 'g' : 'o'}">${pagas}/${rows.length} pagas</span></div>
    <p class="small muted" style="margin-top:6px">${r.v > 0 ? `Seus investimentos rendem <b class="o num">${brl(r.v, 0)}/mês</b>${r.est ? ' (estimado pelo dividendo dos últimos 12 meses)' : ''}.` : 'Você ainda não tem renda de investimentos lançada.'} ${prox ? `Faltam <b class="o num">${brl(falta, 0)}/mês</b> para pagar <b>${esc(prox.nome.toLowerCase())}</b>: cerca de <b class="num">${brl(falta * 12 / y, 0)}</b> a mais investidos rendendo ${pct(y, 1)} ao ano.` : 'Todas as suas contas fixas já são pagas pela renda dos investimentos 🎉'}</p>
    <div class="cats">${lista.map(c => `<div class="cat"><span class="cic" style="color:${c.p >= 1 ? 'var(--verde)' : catCor(c.cat)}">${c.p >= 1 ? '✅' : catIcon('out', c.cat)}</span><div><div class="row between small"><span>${esc(c.nome)}</span><b class="num">${brl(c.v, 0)}</b></div><div class="bar thin"><i style="width:${(c.p * 100).toFixed(1)}%;background:${c.p >= 1 ? 'var(--verde)' : 'var(--acc)'}"></i></div></div><span class="tiny ${c.p >= 1 ? 'g' : 'muted'}">${c.p >= 1 ? 'paga' : pct(c.p, 0)}</span></div>`).join('')}</div>
    ${!full && rows.length > 4 ? `<button class="link" data-ctgo="proventos" style="margin-top:8px">ver as ${rows.length} contas</button>` : ''}
    ${full ? '<p class="tiny dim" style="margin-top:10px">Contas fixas do mês (moradia, contas, assinaturas, educação, saúde e transporte), da menor para a maior. Estimativa educativa, não é promessa de rendimento.</p>' : ''}
  </section>`;
}
/* ---------- AÇÕES QUE CABEM NO BOLSO ---------- */
let bolsoV = null;
function bolsoBase() { const m = monthTotals(curMonth).sobra; return Math.max(0, Math.round(m > 0 ? m : avgSobra())); }
function bolsoLista(v) { return rankingDados().filter(k => k.r.okN === 4 && k.q.preco <= v).sort((a, b) => b.r.ret - a.r.ret); }
function bolsoCard() {
  if (!DATA || !DATA.acoes) return '';
  const v = bolsoBase(); if (!(v >= 5)) return '';
  const n = bolsoLista(v).length; if (!n) return '';
  return `<button class="card setrow" data-bolso="${v}"><span class="sico">💰</span><span class="t"><b>Ações que cabem no seu bolso</b><small>Sobrou ${brl(v, 0)}: ${n} ${n === 1 ? 'ação passa' : 'ações passam'} nos 4 critérios e ${n === 1 ? 'custa' : 'custam'} menos que isso</small></span><svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>`;
}

/* ---------- RANKING DO FILTRO ---------- */
let rkF = 'passam', rkN = 10, RK_MEMO = null;
function rankingDados() {
  if (!DATA || !DATA.acoes) return [];
  const chave = JSON.stringify(S.settings);
  if (RK_MEMO && RK_MEMO.d === DATA && RK_MEMO.k === chave) return RK_MEMO.v;
  const v = Object.entries(DATA.acoes).filter(([, q]) => q.preco > 0).map(([c, q]) => ({ c, q, r: analyze(aFromQ(q)) }));
  RK_MEMO = { d: DATA, k: chave, v }; return v;
}
function viewRanking() {
  const all = rankingDados(), sel = DATA && DATA.mercado && DATA.mercado.selic;
  if (!all.length) return `<header class="page row" style="gap:10px"><button class="iconbtn" data-go2="analisar" aria-label="Voltar">${ICON.left}</button><div><h1>Ranking do filtro</h1></div></header><div class="hint row"><img src="img/analisar.webp" alt=""><p class="small muted">Não consegui baixar os dados das ações. Confira a internet e tente de novo.</p></div>`;
  const passam = all.filter(k => k.r.okN === 4), baratas = passam.filter(k => k.r.kp === 'b');
  if (bolsoV == null) bolsoV = bolsoBase() || 500;
  const bolso = bolsoLista(bolsoV);
  const base = rkF === 'baratas' ? baratas : rkF === 'todas' ? all : rkF === 'bolso' ? bolso : passam;
  const lista = base.slice().sort((a, b) => (b.r.okN === 4) - (a.r.okN === 4) || (b.r.pontual ? -1 : 0) - (a.r.pontual ? -1 : 0) || b.r.ret - a.r.ret);
  const shown = lista.slice(0, rkN);
  return `
  <header class="page row" style="gap:10px"><button class="iconbtn" data-go2="analisar" aria-label="Voltar">${ICON.left}</button><div style="flex:1;min-width:0"><h1>Ranking do filtro</h1><p class="small muted">${passam.length} de ${all.length} ações passam nos 4 critérios hoje</p></div>${GEAR()}</header>
  <div class="seg3 rkseg seg4" id="rkf"><button data-rk="passam" class="${rkF === 'passam' ? 'on' : ''}"><span>Passam<i class="nb">${passam.length}</i></span></button><button data-rk="baratas" class="${rkF === 'baratas' ? 'on' : ''}"><span>Baratas<i class="nb">${baratas.length}</i></span></button><button data-rk="bolso" class="${rkF === 'bolso' ? 'on' : ''}"><span>No bolso<i class="nb">${bolso.length}</i></span></button><button data-rk="todas" class="${rkF === 'todas' ? 'on' : ''}"><span>Todas<i class="nb">${all.length}</i></span></button></div>
  ${rkF === 'bolso' ? `<section class="card stack"><div class="field"><label>Quanto você tem para investir</label><div class="inp has-pre"><span class="pre">R$</span><input id="bolsov" inputmode="decimal" value="${nf(bolsoV, 0)}"></div></div><p class="tiny dim">Ações que passam nos 4 critérios e custam até esse valor por ação. No mercado fracionário (código com F no final, ex.: PETR4F) dá para comprar a partir de 1 ação.</p></section>` : ''}
  <section class="card">
    <div class="rk-h tiny muted"><span>#</span><span>Ação</span><span>Preço</span><span style="text-align:right">Retorno/ano</span></div>
    <div class="list">${shown.map((k, i) => { const qt = rkF === 'bolso' ? Math.floor(bolsoV / k.q.preco) : 0; return `<button class="rk" data-rkc="${k.c}">
      <span class="rank ${i === 0 && k.r.okN === 4 ? 'first' : ''}">${i + 1}º</span>
      <span class="t"><b>${k.c}${k.r.pontual || k.r.dyCort ? ' <i class="warn" title="Confira o alerta na análise">!</i>' : ''}</b><span class="tiny muted">${rkF === 'bolso' ? `${qt} ${qt === 1 ? 'ação' : 'ações'} · ${brl(qt * k.q.preco, 0)}${k.r.dyU > 0 ? ' · ≈ ' + brl(qt * k.q.preco * k.r.dyU, 0) + '/ano' : ''}` : `${esc((k.q.nome || '').split(' ').slice(0, 2).join(' '))} · ${k.r.okN}/4`}</span></span>
      <span class="kp kp-${k.r.kp}">${KP_T[k.r.kp].replace('Sem preço justo', 'n/d').replace('Preço justo', 'Justa')}</span>
      <b class="num ${k.r.ret > k.r.regua ? 'g' : 'r'}">${pct(k.r.ret)}</b></button>`; }).join('')}</div>
    ${lista.length > rkN ? `<button class="more" id="rkmore">Mostrar mais (${Math.min(10, lista.length - rkN)} de ${lista.length - rkN} restantes)</button>` : lista.length > 10 ? '<button class="more" id="rkless">Mostrar menos</button>' : ''}
    ${!lista.length ? `<p class="small muted" style="padding:12px 0">${rkF === 'bolso' ? 'Nenhuma ação que passa nos 4 critérios custa até esse valor hoje.' : 'Nenhuma ação neste filtro hoje.'}</p>` : ''}
  </section>
  <p class="disc">Ordem por retorno esperado (DY limitado ao lucro + crescimento), régua de ${pct(sel ? sel.valor + S.settings.premio : S.settings.selic + S.settings.premio)}. Atualizado com o fechamento da B3 de ${dBRs(DATA.data_cotacao)}. Ferramenta educativa, não é recomendação de compra ou venda.</p>`;
}
let acN = 10;
function acoesRanking() {
  const passam = rankingDados().filter(k => k.r.okN === 4).sort((a, b) => b.r.ret - a.r.ret), all = rankingDados().length;
  return `<section class="card">
    <div class="row between"><div><h3>Ranking do filtro</h3><span class="tiny muted">${passam.length} de ${all} passam hoje</span></div><button class="rkfull rkentry" data-go2="ranking" aria-label="Ranking completo com filtros"><svg viewBox="0 0 24 24"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg><span>Filtros</span></button></div>
    <div class="rk-h tiny muted" style="margin-top:10px"><span>#</span><span>Ação</span><span>Preço</span><span style="text-align:right">Retorno/ano</span></div>
    <div class="list">${passam.slice(0, acN).map((k, i) => `<button class="rk" data-rkc="${k.c}"><span class="rank ${i === 0 ? 'first' : ''}">${i + 1}º</span><span class="t"><b>${k.c}${k.r.pontual || k.r.dyCort ? ' <i class="warn" title="Confira o alerta na análise">!</i>' : ''}</b><span class="tiny muted">${brl(k.q.preco)} · ${esc((k.q.nome || '').split(' ').slice(0, 2).join(' ').replace(/[,.&-]+$/, '').trim())}</span></span><span class="kp kp-${k.r.kp}">${KP_T[k.r.kp].replace('Sem preço justo', 'n/d').replace('Preço justo', 'Justa')}</span><b class="num g">${pct(k.r.ret)}</b></button>`).join('')}</div>
    ${passam.length > acN ? `<button class="more" id="acmore">Mostrar mais (${passam.length - acN} restantes)</button>` : ''}
    <p class="tiny dim" style="margin-top:8px">Ações que passam nos 4 critérios, em ordem de retorno esperado. Toque numa para ver a análise ou use a busca para qualquer outra.</p>
  </section>`;
}
function rankingEntrada() {
  if (!DATA || !DATA.acoes) return '';
  const n = rankingDados().filter(k => k.r.okN === 4).length;
  return `<button class="card setrow rkentry" data-go2="ranking"><span class="sico">🏆</span><span class="t"><b>Ranking do filtro</b><small>${n} ações passam nos 4 critérios hoje</small></span><svg class="chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg></button>`;
}

/* ---------- COMPARAR ---------- */
let cmpA = '', cmpB = '';
function viewComparar() {
  const A = Q(cmpA), B = Q(cmpB);
  const ra = A && analyze(aFromQ(A)), rb = B && analyze(aFromQ(B));
  const ch = q => { const h = q && q.hist; return h && h.length > 1 ? h[h.length - 1][1] / h[0][1] - 1 : NaN; };
  const rows = A && B ? [
    ['Resultado', `${ra.okN}/4`, `${rb.okN}/4`, ra.okN - rb.okN],
    ['Retorno/ano', pct(ra.ret), pct(rb.ret), ra.ret - rb.ret],
    ['Cara ou barata', KP_T[ra.kp], KP_T[rb.kp], (isFinite(ra.margem) ? ra.margem : -9) - (isFinite(rb.margem) ? rb.margem : -9)],
    ['Preço x Graham', isFinite(ra.margem) ? (ra.margem > 0 ? '−' : '+') + pct(Math.abs(ra.margem), 0) : '—', isFinite(rb.margem) ? (rb.margem > 0 ? '−' : '+') + pct(Math.abs(rb.margem), 0) : '—', (isFinite(ra.margem) ? ra.margem : -9) - (isFinite(rb.margem) ? rb.margem : -9)],
    ['ROE', pct(A.roe), pct(B.roe), (A.roe || 0) - (B.roe || 0)],
    ['P/L', x(ra.pl), x(rb.pl), (isFinite(rb.pl) && rb.pl > 0 ? rb.pl : 999) - (isFinite(ra.pl) && ra.pl > 0 ? ra.pl : 999)],
    ['P/VP', x(ra.pvp, 2), x(rb.pvp, 2), (isFinite(rb.pvp) ? rb.pvp : 99) - (isFinite(ra.pvp) ? ra.pvp : 99)],
    ['Dívida/EBITDA', A.financeira ? 'n/a' : x(A.div_ebitda), B.financeira ? 'n/a' : x(B.div_ebitda), A.financeira || B.financeira ? 0 : (B.div_ebitda ?? 99) - (A.div_ebitda ?? 99)],
    ['DY usado', pct(ra.dyU), pct(rb.dyU), ra.dyU - rb.dyU],
    ['5 pregões', pct(ch(A)), pct(ch(B)), 0]
  ] : [];
  return `
  <header class="page row" style="gap:10px"><button class="iconbtn" data-go2="analisar" aria-label="Voltar">${ICON.left}</button><div style="flex:1;min-width:0"><h1>Comparar ações</h1><p class="small muted">Lado a lado, nos mesmos critérios</p></div>${GEAR()}</header>
  <section class="card">
    <div class="grid2">
      <div class="field"><label>Ação 1</label><div class="inp"><input id="cmpa" list="cmplist" autocapitalize="characters" autocomplete="off" maxlength="8" placeholder="PETR4" value="${esc(cmpA)}"></div></div>
      <div class="field"><label>Ação 2</label><div class="inp"><input id="cmpb" list="cmplist" autocapitalize="characters" autocomplete="off" maxlength="8" placeholder="VALE3" value="${esc(cmpB)}"></div></div>
    </div>
    <datalist id="cmplist">${DATA && DATA.acoes ? Object.keys(DATA.acoes).sort().map(c => `<option value="${c}">`).join('') : ''}</datalist>
  </section>
  ${A && B ? `<section class="card cmpcard">
    <div class="cmp-h"><span></span><b>${esc(cmpA)}</b><b>${esc(cmpB)}</b></div>
    ${rows.map(([l, va, vb, d]) => `<div class="cmp-r"><span class="tiny muted">${l}</span><b class="${d > 0.0001 ? 'win' : ''}">${va}</b><b class="${d < -0.0001 ? 'win' : ''}">${vb}</b></div>`).join('')}
    <p class="tiny dim" style="margin-top:10px">Em verde, o melhor em cada linha. Ferramenta educativa, não é recomendação de compra ou venda.</p>
  </section>
  <div class="grid2"><button class="btn ghost sm" data-cmpgo="${esc(cmpA)}">Ver análise de ${esc(cmpA)}</button><button class="btn ghost sm" data-cmpgo="${esc(cmpB)}">Ver análise de ${esc(cmpB)}</button></div>`
  : `<div class="hint row"><img src="img/analisar.webp" alt=""><p class="small muted">${(cmpA && !A) || (cmpB && !B) ? 'Não achei uma das ações. Confira o código (ex.: PETR4, VALE3).' : 'Digite o código das duas ações para comparar.'}</p></div>`}`;
}

/* ---------- RADAR DA MINHA LISTA ---------- */
function radarCard() {
  if (!DATA || !DATA.acoes || !S.analyses.length) return '';
  const dia = DATA.data_cotacao, atual = {};
  for (const s of S.analyses) { const q = Q(s.code); if (!q) continue; const r = analyze(aFromQ(q)); atual[s.code] = { ok: r.okN === 4, k: r.kp, p: q.preco }; }
  if (!S.radar || S.radar.dia !== dia) { S.radar = { dia, base: S.radar ? S.radar.atual : null, atual }; save(); }
  else S.radar.atual = atual;
  const base = S.radar.base, mud = [];
  if (base) for (const [c, v] of Object.entries(atual)) {
    const b = base[c]; if (!b) continue;
    if (v.ok && !b.ok) mud.push(['g', c, 'entrou no filtro (4/4)']);
    else if (!v.ok && b.ok) mud.push(['r', c, 'saiu do filtro']);
    if (v.k !== b.k && (v.k === 'b' || v.k === 'c')) mud.push([v.k === 'b' ? 'g' : 'r', c, v.k === 'b' ? 'ficou barata' : 'ficou cara']);
    const d = b.p ? v.p / b.p - 1 : 0;
    if (Math.abs(d) >= 0.05) mud.push([d > 0 ? 'g' : 'r', c, `${d > 0 ? 'subiu' : 'caiu'} ${pct(Math.abs(d), 1)} no último pregão`]);
  }
  const n = Object.keys(atual).length;
  return `<section class="card radar">
    <div class="row between"><h3>Radar da sua lista</h3><span class="tiny muted">B3 ${dBRs(dia)}</span></div>
    ${!base ? `<p class="small muted">A partir do próximo pregão, aqui aparece o que mudou nas ${n} ações da sua lista: quem entrou ou saiu do filtro, ficou barata ou cara.</p>`
      : mud.length ? `<div class="rd">${mud.slice(0, 4).map(([cor, c, t]) => `<button class="rd-i" data-rkc="${c}"><i class="${cor}"></i><b>${c}</b><span class="small muted">${t}</span></button>`).join('')}</div>`
      : `<p class="small muted">Nada mudou nas ${n} ações da sua lista desde o último pregão.</p>`}
  </section>`;
}

/* ---------- COMPARTILHAR ANÁLISE (imagem) ---------- */
async function compartilharAnalise() {
  const a = lastA, r = lastR; if (!a || !r) return;
  const q = Q(a.code) || {};
  try { await Promise.all(['900 96px "Inter Display"', '800 48px "Inter Display"', '600 34px Inter', '400 30px Inter'].map(f => document.fonts.load(f))); } catch (e) {}
  const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#121845'); bg.addColorStop(1, '#070A1C'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const cor = { ok: '#22D68A', mid: '#F5C13D', no: '#FF4D6D' }[r.verdict];
  const glow = g.createRadialGradient(W / 2, 520, 50, W / 2, 520, 700); glow.addColorStop(0, cor + '33'); glow.addColorStop(1, 'transparent'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
  const T = (t, xx, y, font, c, al = 'left') => { g.font = font; g.fillStyle = c; g.textAlign = al; g.fillText(t, xx, y); };
  const RR = (xx, y, w, h, rad, fill, stroke) => { g.beginPath(); g.roundRect(xx, y, w, h, rad); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 3; g.stroke(); } };
  T('★ EU FUTURO RICO', 90, 150, '800 34px Inter', '#F5C13D');
  T('Carteira Inteligente', 90, 200, '400 30px Inter', '#A3ACCF');
  const img = new Image(); img.src = `img/reacao${Math.max(1, r.okN)}.webp`;
  await new Promise(res => { img.onload = res; img.onerror = res; });
  if (img.naturalWidth) { const h = 330, w = h * img.naturalWidth / img.naturalHeight; g.drawImage(img, W - 90 - w, 120, w, h); }
  T(a.code, 90, 400, '900 150px "Inter Display"', '#F4F6FF');
  T((q.nome || '').split(' ').slice(0, 3).join(' '), 94, 460, '600 38px Inter', '#A3ACCF');
  RR(90, 520, W - 180, 300, 40, cor + '22', cor + '88');
  T({ ok: 'Passou com folga', mid: 'Passou, sem folga', no: 'Não passou' }[r.verdict], 140, 620, '900 70px "Inter Display"', cor);
  T(`${r.okN} de 4 critérios`, 140, 685, '600 36px Inter', '#DDE1F5');
  T('retorno/ano', 140, 770, '400 30px Inter', '#A3ACCF');
  T(pct(r.ret), W - 140, 780, '900 110px "Inter Display"', r.ret > r.regua ? '#22D68A' : '#FF4D6D', 'right');
  const cs = r.c.map(c => [c.n.replace('ROE de pelo menos', 'ROE ≥').replace('Dívida até', 'Dívida ≤').replace(' o EBITDA', '').replace('P/L entre 3 e', 'P/L 3 a').replace('Retorno acima de', 'Retorno >'), c.v, c.ok]);
  cs.forEach(([n, v, ok], i) => { const xx = 90 + (i % 2) * 460, y = 870 + Math.floor(i / 2) * 190; RR(xx, y, 440, 165, 30, 'rgba(255,255,255,.05)'); g.beginPath(); g.arc(xx + 60, y + 82, 28, 0, 7); g.fillStyle = ok ? '#22D68A33' : '#FF4D6D33'; g.fill(); T(ok ? '✓' : '✕', xx + 60, y + 96, '900 36px Inter', ok ? '#22D68A' : '#FF4D6D', 'center'); T(n, xx + 110, y + 68, '400 28px Inter', '#A3ACCF'); T(v, xx + 110, y + 122, '900 46px "Inter Display"', ok ? '#22D68A' : '#FF4D6D'); });
  if (isFinite(r.graham)) {
    const kc = { b: '#22D68A', j: '#F5C13D', c: '#FF4D6D' }[r.kp];
    RR(90, 1270, W - 180, 230, 34, 'rgba(255,255,255,.05)');
    T('Cara ou barata?', 140, 1335, '400 30px Inter', '#A3ACCF');
    g.font = '800 34px Inter'; const tw = g.measureText(KP_T[r.kp].toUpperCase()).width + 50; RR(W - 140 - tw, 1295, tw, 58, 29, kc + '26'); T(KP_T[r.kp].toUpperCase(), W - 140 - tw / 2, 1336, '800 30px Inter', kc, 'center');
    T('Preço hoje', 140, 1410, '400 28px Inter', '#8189B0'); T(brl(a.price), 140, 1465, '900 52px "Inter Display"', '#F4F6FF');
    T('Graham', W - 140, 1410, '400 28px Inter', '#8189B0', 'right'); T(brl(r.graham), W - 140, 1465, '900 52px "Inter Display"', '#F4F6FF', 'right');
  }
  T('Analise qualquer ação em instantes', W / 2, 1640, '800 44px "Inter Display"', '#F4F6FF', 'center');
  T('eufuturorico.netlify.app/oferta', W / 2, 1700, '600 34px Inter', '#F5C13D', 'center');
  T(`Dados: CVM, B3 ${dBRs(DATA && DATA.data_cotacao)} e Banco Central · educativo, não é recomendação`, W / 2, 1810, '400 24px Inter', '#8189B0', 'center');
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  const file = new File([blob], `analise-${a.code}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `Análise ${a.code}`, text: `${a.code}: ${r.okN}/4 critérios no app Carteira Inteligente · eufuturorico.netlify.app/oferta` }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob), l = document.createElement('a'); l.href = url; l.download = file.name; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast('Imagem salva ✔ Poste nos Stories ou mande no WhatsApp');
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
  <header class="page row between"><div><h1>Carteira</h1><p class="small muted">${DATA && DATA.data_cotacao ? 'Preços da B3 de ' + dBRs(DATA.data_cotacao) : 'Seus investimentos'}</p></div><div class="row" style="gap:6px"><button class="chip o" id="addasset">+ Adicionar</button>${GEAR()}</div></header>
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
  ${contasCard(true)}
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
  if (!S.assets.length) return '<p class="small muted">Adicione seus investimentos em <b class="o">Ativos</b> para o app dividir o aporte.</p>';
  if (!(val > 0)) return '<p class="small muted">Digite quanto vai investir.</p>';
  const comMeta = S.assets.filter(a => a.target > 0), usa = comMeta.length ? comMeta : S.assets;
  const ts = comMeta.reduce((s, a) => s + a.target, 0);
  const w = a => comMeta.length ? a.target / ts : 1 / usa.length;
  const tot = usa.reduce((s, a) => s + a.qty * a.price, 0) + val;
  const L = usa.map(a => ({ a, hoje: a.qty * a.price, gap: Math.max(0, w(a) * tot - a.qty * a.price) }));
  const g = L.reduce((s, k) => s + k.gap, 0);
  L.forEach(k => { k.put = g > 0 ? k.gap / g * Math.min(val, g) : 0; });
  const resto = val - Math.min(val, g);
  if (resto > 0.005) L.forEach(k => { k.put += resto * w(k.a); });
  let sobra = 0;
  L.forEach(k => {
    k.cota = ['Ação', 'FII', 'Exterior'].includes(k.a.type) && k.a.price > 0;
    if (k.cota) { k.qt = Math.floor(k.put / k.a.price + 1e-9); k.real = k.qt * k.a.price; sobra += k.put - k.real; } else k.real = k.put;
  });
  const livre = L.filter(k => !k.cota && k.put > 0.004).sort((p, q) => q.put - p.put)[0];
  if (livre && sobra > 0.004) { livre.put += sobra; livre.real = livre.put; sobra = 0; }
  const lista = L.filter(k => k.put > 0.004).sort((p, q) => q.put - p.put), zero = L.filter(k => !(k.put > 0.004));
  return `${!comMeta.length ? '<p class="tiny o" style="margin-bottom:8px">Nenhum investimento tem meta ainda, então o app divide para deixar todos com o mesmo peso. Toque em um ativo em Ativos para definir a meta de cada um.</p>' : ''}
  <div class="list">${lista.map(k => `<div class="item"><div class="ico tag" style="background:${tipoCor(k.a.type)}22;color:${tipoCor(k.a.type)}">${sig(k.a.type)}</div><div class="t"><b>${esc(k.a.code)}</b><span class="tiny muted">${k.cota ? `${k.qt} ${k.a.type === 'FII' ? (k.qt === 1 ? 'cota' : 'cotas') : (k.qt === 1 ? 'ação' : 'ações')} de ${brl(k.a.price)} · ` : ''}meta ${pct(w(k.a), 0)} · hoje ${pct(k.hoje / Math.max(1, tot - val), 0)}</span></div><div class="v num o">${brl(k.cota ? k.real : k.put)}</div></div>`).join('')}</div>
  ${zero.length ? `<p class="tiny dim" style="margin-top:8px">Sem aporte agora (já estão acima ${comMeta.length ? 'da meta' : 'do peso igual'}): ${zero.map(k => esc(k.a.code)).join(', ')}.</p>` : ''}
  ${sobra > 0.5 ? `<p class="tiny muted" style="margin-top:8px">Sobram <b class="num">${brl(sobra)}</b> que não fecham uma cota inteira: deixe na reserva ou some ao próximo aporte.</p>` : ''}
  <p class="tiny dim" style="margin-top:8px">${comMeta.length ? 'Divisão pela meta que você definiu para cada investimento.' : 'Divisão para igualar o peso dos seus investimentos.'} Não é recomendação de compra.</p>`;
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
  const tx = st.taxaAcum != null ? st.taxaAcum : st.yieldMeta;
  const n = nper(Math.pow(1 + tx, 1 / 12) - 1, pmt, p.cur, need);
  const anos = n / 12;
  const quando = isFinite(anos) ? new Date(new Date().getFullYear(), new Date().getMonth() + Math.round(n)) : null;
  return {
    need, prog, pmt, n, tx, cur: p.cur,
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
  planoRefresh();
}
/* ---------- PLANO DIVERSIFICADO (meta) ---------- */
const PCL = [
  { k: 'pos', n: 'Renda fixa pós', d: 'Tesouro Selic, CDB 100% CDI · reserva', c: '#F5C13D', v: 0.005 },
  { k: 'ipca', n: 'Tesouro IPCA+', d: 'protege da inflação', c: '#FFB86B', v: 0.07 },
  { k: 'pre', n: 'Prefixado', d: 'trava a taxa de hoje', c: '#FF7A59', v: 0.08 },
  { k: 'fii', n: 'FIIs', d: 'renda mensal isenta', c: '#22D68A', v: 0.12 },
  { k: 'acoes', n: 'Ações', d: 'Brasil e EUA, maior oscilação', c: '#5B7CFF', v: 0.24 }
];
const PRHO = [[1, 0, 0, 0, 0], [0, 1, .7, .5, .4], [0, .7, 1, .5, .4], [0, .5, .5, 1, .6], [0, .4, .4, .6, 1]];
const PERF = { c: { n: 'Conservador', vol: 0.03 }, m: { n: 'Moderado', vol: 0.07 }, a: { n: 'Arrojado', vol: 0.12 } };
const PL = { perfil: null, a: null, edit: false, cache: null };
const medi = v => { const a = v.filter(isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : NaN; };
function planoTaxas() {
  const m = mercadoX(), st = S.settings, hj = today();
  const cdi = m.cdi && m.cdi.valor || st.selic, ipca = m.ipca12m && m.ipca12m.valor || 0.045;
  const lim = new Date(); lim.setFullYear(lim.getFullYear() + 3); const l3 = lim.toISOString().slice(0, 10);
  const T = (EXTRA.rf && EXTRA.rf.titulos || []).filter(t => t.vencimento >= l3);
  const ntnb = medi(T.filter(t => t.tipo === 'NTN-B').map(t => t.taxa)), ltn = medi(T.filter(t => t.tipo === 'LTN').map(t => t.taxa));
  const F = EXTRA.fiis && EXTRA.fiis.fiis ? Object.values(EXTRA.fiis.fiis) : [];
  const fdy = medi(F.filter(f => (f.liq || 0) > 500000 && f.dy > 0.04 && f.dy < 0.25).map(f => f.dy));
  const r = [cdi * 0.85, ((1 + ipca) * (1 + (isFinite(ntnb) ? ntnb : 0.065)) - 1) * 0.85, (isFinite(ltn) ? ltn : cdi + 0.01) * 0.85, (isFinite(fdy) ? fdy : 0.10) * 0.9, (st.selic + st.premio) * 0.9];
  return { r, cdi, ipca, ntnb, ltn, fdy, poup: m.poupanca && m.poupanca.valor || 0.0617 };
}
function planoStats(a, r) {
  let ret = 0, va = 0;
  for (let i = 0; i < 5; i++) { ret += a[i] * r[i]; for (let j = 0; j < 5; j++) va += a[i] * a[j] * PCL[i].v * PCL[j].v * PRHO[i][j]; }
  return { r: ret, vol: Math.sqrt(va) };
}
function planoOtimo(perfil, r) {
  const key = perfil + r.map(x => x.toFixed(4)).join();
  if (PL.cache && PL.cache[key]) return PL.cache[key];
  const lim = PERF[perfil].vol; let best = null;
  for (let pos = 10; pos <= 75; pos += 5) for (let ip = 10; ip <= 40 && pos + ip <= 100; ip += 5) for (let pr = 5; pr <= 35 && pos + ip + pr <= 100; pr += 5) for (let fi = 5; fi <= 30 && pos + ip + pr + fi <= 100; fi += 5) {
    const ac = 100 - pos - ip - pr - fi; if (ac < 5 || ac > 45) continue;
    const a = [pos, ip, pr, fi, ac].map(x => x / 100), st = planoStats(a, r);
    if (st.vol > lim + 1e-9) continue;
    if (!best || st.r > best.r + 1e-6 || (Math.abs(st.r - best.r) <= 1e-6 && st.vol < best.vol)) best = { a, ...st };
  }
  PL.cache = { ...(PL.cache || {}), [key]: best };
  return best;
}
const mesesTxt = n => { if (!isFinite(n)) return '—'; const m = Math.round(n), y = Math.floor(m / 12), r = m % 12; return y ? y + (y === 1 ? ' ano' : ' anos') + (r ? ' e ' + r + (r === 1 ? ' mês' : ' meses') : '') : r + (r === 1 ? ' mês' : ' meses'); };
function planoConta(a) {
  const T = planoTaxas(), st = planoStats(a, T.r), c = metaCalc();
  const nM = (tx, pmt) => nper(Math.pow(1 + tx, 1 / 12) - 1, pmt == null ? c.pmt : pmt, c.cur, c.need);
  const n = nM(st.r), nBase = nM(S.settings.yieldMeta), nPoup = nM(T.poup);
  return { ...st, T, c, n, nBase, nPoup, n200: nM(st.r, c.pmt + 200), n20: nM(st.r, c.pmt * 1.2) };
}
function planoAtual() {
  if (!PL.a) { if (S.plano && S.plano.a) { PL.a = S.plano.a.slice(); PL.perfil = S.plano.perfil || 'm'; } else { PL.perfil = PL.perfil || 'm'; const o = planoOtimo(PL.perfil, planoTaxas().r); PL.a = o ? o.a.slice() : [0.4, 0.2, 0.15, 0.1, 0.15]; } }
  return PL.a;
}
function planoStatsHTML(a) {
  const k = planoConta(a), c = k.c, ja = c.prog >= 1;
  const ganho = isFinite(k.nBase) && isFinite(k.n) ? k.nBase - k.n : NaN;
  const gp = isFinite(k.nPoup) && isFinite(k.n) ? k.nPoup - k.n : NaN;
  const ruim = k.r - 2 * k.vol;
  const lv = (n2, t) => isFinite(k.n) && isFinite(n2) && k.n - n2 >= 1 ? `<div class="plv"><span>${t}</span><b class="g">−${mesesTxt(k.n - n2)}</b></div>` : '';
  return `
    <div class="pst">
      <div><span class="label">Rende por ano</span><b class="num">${pct(k.r, 1)}</b><small>após IR, estimado</small></div>
      <div><span class="label">Você chega em</span><b class="num">${ja ? 'Já chegou' : c.pmt <= 0 && !ja ? '—' : mesesTxt(k.n)}</b><small>${c.pmt <= 0 && !ja ? 'defina o aporte' : 'com ' + brl(c.pmt, 0) + '/mês'}</small></div>
      <div><span class="label">Ano ruim</span><b class="num ${ruim < 0 ? 'r' : ''}">${ruim < 0 ? '−' + pct(-ruim, 0) : '+' + pct(ruim, 0)}</b><small>oscilação possível</small></div>
    </div>
    ${!ja && isFinite(ganho) && ganho >= 1 ? `<div class="pwin"><span class="pwi">⚡</span><p><b>${mesesTxt(ganho)} mais cedo</b> do que rendendo ${pct(S.settings.yieldMeta, 1)} ao ano${isFinite(gp) && gp >= 1 ? `, e <b>${mesesTxt(gp)}</b> antes da poupança` : ''}.</p></div>`
      : !ja && isFinite(ganho) && ganho <= -1 ? `<div class="pwin lo"><span class="pwi">🐢</span><p>Esta mistura rende menos que os ${pct(S.settings.yieldMeta, 1)} que você colocou na meta: <b>${mesesTxt(-ganho)} a mais</b>.</p></div>` : ''}
    ${ja ? '' : `<div class="plvs"><p class="label">Outros jeitos de encurtar</p>${lv(k.n200, 'Investir + R$ 200 por mês')}${lv(k.n20, 'Aumentar o aporte em 20%')}</div>`}`;
}
function planoBarHTML(a) { return `<div class="pbar">${a.map((v, i) => v > 0 ? `<i style="width:${(v * 100).toFixed(1)}%;background:${PCL[i].c}"></i>` : '').join('')}</div>`; }
function planoGrupos(a) { return { rf: a[0] + a[1] + a[2], fii: a[3], acoes: a[4] }; }
function planoCarteiraHTML() {
  if (!S.plano) return '';
  const p = portfolio(), bt = p.byType, rf = (bt['Renda fixa'] || 0) + (bt['Tesouro'] || 0), fi = bt['FII'] || 0, ac = (bt['Ação'] || 0) + (bt['Exterior'] || 0), tot = rf + fi + ac;
  const alvo = planoGrupos(S.plano.a), hoje = { rf, fii: fi, acoes: ac }, nm = { rf: 'Renda fixa', fii: 'FIIs', acoes: 'Ações' };
  const pmt = metaCalc().pmt;
  let prox = '';
  if (pmt > 0) { const falta = Object.keys(alvo).map(k => ({ k, f: alvo[k] * (tot + pmt) - hoje[k] })).sort((x, y) => y.f - x.f)[0]; if (falta && falta.f > 0) prox = `<p class="small" style="margin-top:10px">Para seguir o seu plano, o próximo aporte de ${brl(pmt, 0)} vai mais para <b class="o">${nm[falta.k]}</b>.</p>`; }
  return `<div class="pcmp"><p class="label">Sua carteira hoje × plano</p>${tot > 0 ? Object.keys(alvo).map(k => `<div class="pcr"><span>${nm[k]}</span><div class="pcb"><i style="width:${(hoje[k] / tot * 100).toFixed(1)}%"></i><em style="left:${(alvo[k] * 100).toFixed(1)}%"></em></div><b class="num">${pct(hoje[k] / tot, 0)} <small>/ ${pct(alvo[k], 0)}</small></b></div>`).join('') + prox : '<p class="tiny muted">Cadastre seus investimentos na Carteira para comparar com o plano.</p>'}</div>`;
}
function viewPlano() {
  if (!EXTRA.rf) loadExtra('rf'); if (!EXTRA.fiis) loadExtra('fiis');
  const a = planoAtual(), T = planoTaxas(), salvo = S.plano, igual = salvo && salvo.a.every((v, i) => Math.abs(v - a[i]) < 0.001);
  return `
  <section class="card plano" id="plano">
    <div class="row between"><h3>🧭 Plano para chegar mais rápido</h3><span class="tiny muted">taxas de hoje</span></div>
    <p class="small muted" style="margin:6px 0 12px">Escolha quanto de oscilação você aguenta. O app calcula a mistura diversificada que mais rende nesse limite (nenhuma classe acima de 45%) e quanto tempo ela tira da sua meta.</p>
    <div class="chips pperf">${Object.entries(PERF).map(([k, v]) => `<button data-perf="${k}" class="${PL.perfil === k ? 'on' : ''}">${v.n}</button>`).join('')}</div>
    ${salvo ? `<p class="tiny ${igual ? 'g' : 'o'}" style="margin-top:10px">${igual ? '✔ Seu plano salvo em ' + dBR(salvo.data) : '✎ Alterado, ainda não salvo'}</p>` : ''}
    <div id="pbarw">${planoBarHTML(a)}</div>
    <div class="pleg" id="pleg"><div class="ph"><i></i><span>Classe</span><b class="ph">Parte</b><em>Rende/ano</em></div>${PCL.map((c, i) => `<div><i style="background:${c.c}"></i><span>${c.n}<small>${c.d}</small></span><b class="num">${pct(a[i], 0)}</b><em class="num">${pct(T.r[i], 1)}</em></div>`).join('')}</div>
    <div id="pstats">${planoStatsHTML(a)}</div>
    <div class="pedit" ${PL.edit ? '' : 'hidden'} id="pedit">${PCL.map((c, i) => `<div class="sl"><label for="pa_${i}">${c.n}<b id="pav_${i}">${pct(a[i], 0)}</b></label><input type="range" id="pa_${i}" data-pa="${i}" min="0" max="100" step="5" value="${Math.round(a[i] * 100)}"></div>`).join('')}</div>
    <div class="grid2" style="margin-top:14px"><button class="btn ghost sm" id="pedt">${PL.edit ? 'Fechar ajuste' : 'Ajustar %'}</button><button class="btn sm" id="psave">${salvo && igual ? 'Plano salvo ✔' : 'Salvar plano'}</button></div>
    ${salvo ? `<button class="link tiny" id="pdel" style="margin-top:10px">Remover plano salvo</button>` : ''}
    ${planoCarteiraHTML()}
    <p class="tiny dim" style="margin-top:12px">Simulação educativa com as taxas de hoje mantidas: CDI ${pct(T.cdi, 2)} e IPCA ${pct(T.ipca, 2)} (Banco Central), Tesouro IPCA+ ${isFinite(T.ntnb) ? pct(T.ntnb, 2) : '—'} e prefixado ${isFinite(T.ltn) ? pct(T.ltn, 2) : '—'} (ANBIMA), dividendos médios dos FIIs ${isFinite(T.fdy) ? pct(T.fdy, 1) : '—'} (CVM) e ações pela régua Selic + prêmio. IR de longo prazo descontado. Não é promessa de rendimento nem recomendação de investimento.</p>
  </section>`;
}
function planoRefresh() {
  const el = document.getElementById('pstats'); if (!el || !PL.a) return;
  el.innerHTML = planoStatsHTML(PL.a);
  const b = document.getElementById('pbarw'); if (b) b.innerHTML = planoBarHTML(PL.a);
  document.querySelectorAll('#pleg > div:not(.ph) > b').forEach((x, i) => x.textContent = pct(PL.a[i], 0));
}
function bindPlano() {
  if (!document.getElementById('plano')) return;
  const on = (id, f) => { const el = document.getElementById(id); if (el) el.onclick = f; };
  document.querySelectorAll('[data-perf]').forEach(b => b.onclick = () => { PL.perfil = b.dataset.perf; const o = planoOtimo(PL.perfil, planoTaxas().r); if (o) PL.a = o.a.slice(); render(); });
  on('pedt', () => { PL.edit = !PL.edit; render(); });
  on('psave', () => { const st = planoStats(PL.a, planoTaxas().r); S.plano = { a: PL.a.slice(), perfil: PL.perfil, r: st.r, vol: st.vol, data: today() }; S.settings.taxaAcum = st.r; save(); render(); toast('Plano salvo ✔ A meta agora usa ' + pct(st.r, 1) + ' ao ano'); });
  on('pdel', () => { S.plano = null; delete S.settings.taxaAcum; PL.a = null; save(); render(); toast('Plano removido'); });
  document.querySelectorAll('[data-pa]').forEach(inp => {
    sliderFill(inp);
    inp.oninput = () => {
      const i = +inp.dataset.pa, v = Number(inp.value) / 100, a = PL.a, resto = 1 - a[i], novo = 1 - v;
      for (let j = 0; j < 5; j++) if (j !== i) a[j] = resto > 1e-9 ? a[j] / resto * novo : novo / 4;
      a[i] = v;
      const r5 = a.map(x => Math.round(x * 20) / 20); let d = Math.round((1 - r5.reduce((s, x) => s + x, 0)) * 20) / 20;
      for (let j = 0; j < 5 && Math.abs(d) > 1e-9; j++) if (j !== i) { const nv = Math.min(1, Math.max(0, r5[j] + d)); d -= nv - r5[j]; r5[j] = Math.round(nv * 20) / 20; }
      for (let j = 0; j < 5; j++) { if (j !== i) a[j] = r5[j]; const s2 = document.getElementById('pa_' + j); if (s2) { if (j !== i) s2.value = Math.round(a[j] * 100); sliderFill(s2); } const t = document.getElementById('pav_' + j); if (t) t.textContent = pct(a[j], 0); }
      planoRefresh();
      const ps = document.getElementById('psave'); if (ps) ps.textContent = 'Salvar plano';
    };
  });
}
function sliderFill(inp) { inp.style.setProperty('--v', ((inp.value - inp.min) / (inp.max - inp.min) * 100).toFixed(1) + '%'); }
function viewMais() {
  const st = S.settings, c = metaCalc();
  const sel = DATA && DATA.mercado && DATA.mercado.selic;
  const val = { meta: st.meta, aporte: c.pmt, yieldMeta: st.yieldMeta * 100 };
  return `
  <header class="page row between"><div><h1>Meta de liberdade</h1><p class="small muted">Quando você vive de renda?</p></div>${GEAR()}</header>
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
  ${viewPlano()}
  <section class="card"><div class="row between"><h3>Conquistas</h3><span class="tiny muted">${Object.keys(G().badges).length}/${BADGES.length} · Nv ${level(G().xp).n} ${level(G().xp).name}</span></div>${badgesHTML()}</section>
  <p class="disc">Carteira Inteligente · @eu.futuro.rico · Ferramenta educativa, não é recomendação.</p>`;
}
function viewAjustes() {
  const st = S.settings, sel = DATA && DATA.mercado && DATA.mercado.selic;
  return `
  <header class="page row" style="gap:10px"><button class="iconbtn" id="ajvoltar" aria-label="Voltar">${ICON.left}</button><div><h1>Ajustes</h1><p class="small muted">Critérios, backup e conta</p></div></header>
  <details class="card acc" open><summary><span>⚙️ Critérios da análise</span><span class="tiny muted">Selic ${pct(st.selic, 2)}</span></summary>
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
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (route === 'ajustes') render(); });
function installText() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (window.matchMedia('(display-mode: standalone)').matches) return 'Já está instalado. 🎉';
  return ios ? 'No Safari, toque em Compartilhar (quadrado com seta) e depois em "Adicionar à Tela de Início".' : 'No Chrome, toque nos 3 pontinhos e depois em "Instalar app" ou "Adicionar à tela inicial".';
}

/* ---------- binds ---------- */
function bind() {
  bindTipos();
  bindBusca();
  bindHome();
  bindLista();
  const bs = $('#bsair'); if (bs) bs.onclick = () => { if (confirm('Sair desta conta? Seus dados continuam salvos neste aparelho.')) sair(); };
  document.querySelectorAll('[data-go2]').forEach(b => b.onclick = () => go(b.dataset.go2));
  const gb = $('#gear'); if (gb) gb.onclick = () => go('ajustes');
  const av = $('#ajvoltar'); if (av) av.onclick = () => go(voltarDe && voltarDe !== 'ajustes' ? voltarDe : 'inicio');
  document.querySelectorAll('[data-rkc]').forEach(b => b.onclick = () => { route = 'analisar'; history.replaceState(null, '', '#analisar'); fillFromData(b.dataset.rkc); window.scrollTo({ top: 0 }); });
  const rkf = $('#rkf'); if (rkf) rkf.onclick = e => { const b = e.target.closest('[data-rk]'); if (!b) return; rkF = b.dataset.rk; rkN = 10; render(); };
  const rkm = $('#rkmore'); if (rkm) rkm.onclick = () => { rkN += 10; render(); };
  const bv = $('#bolsov'); if (bv) { const ap = () => { const v = num(bv.value); if (v > 0 && v !== bolsoV) { bolsoV = v; rkN = 10; render(); } }; bv.onchange = ap; bv.onkeydown = e => { if (e.key === 'Enter') { bv.blur(); ap(); } }; }
  document.querySelectorAll('[data-bolso]').forEach(b => b.onclick = () => { bolsoV = +b.dataset.bolso; rkF = 'bolso'; rkN = 10; go('ranking'); });
  document.querySelectorAll('[data-ctgo]').forEach(b => b.onclick = () => { cartTab = b.dataset.ctgo; go('carteira'); });
  const rkl = $('#rkless'); if (rkl) rkl.onclick = () => { rkN = 10; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  ['cmpa', 'cmpb'].forEach(id => { const i = $('#' + id); if (!i) return; i.oninput = () => { const v = i.value.toUpperCase().trim(); if (id === 'cmpa') cmpA = v; else cmpB = v; if (Q(v) || !v) { const f = document.activeElement && document.activeElement.id; render(); if (!Q(v)) { const el = $('#' + f); if (el) el.focus(); } } }; });
  document.querySelectorAll('[data-cmpgo]').forEach(b => b.onclick = () => { route = 'analisar'; history.replaceState(null, '', '#analisar'); fillFromData(b.dataset.cmpgo); window.scrollTo({ top: 0 }); });
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
  const ap = $('#aporte'); if (ap) { const f = () => { const v = ap.value.trim() ? num(ap.value) : num(ap.placeholder); $('#aporteres').innerHTML = aporteCalc(v > 0 ? v : 0); }; ap.oninput = f; f(); }
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
  if (ci) { let tHide; const sg = $('#sugs');
    ci.onfocus = () => { clearTimeout(tHide); if (sg) showSugs(Q(ci.value) ? '' : ci.value); };
    ci.onblur = () => {};
    if (sg) sg.onpointerdown = () => clearTimeout(tHide); }
  if (ci) ci.onkeydown = e => { if (e.key !== 'Enter') return; e.preventDefault(); const f = $('#sugs [data-pick]'); if (Q(ci.value)) fillFromData(ci.value); else if (f) f.click(); };
  bindHint();
  if (route === 'analisar') showSugs(draft.src ? '' : draft.code);
  bindAsave();
  on('aclear', () => { draft = { code: '', price: '', lpa: '', vpa: '', dy: '', roe: '', payout: '', div: '', src: null }; editNums = false; render(); const c = $('[data-a="code"]'); if (c) c.focus(); });
  on('aex', () => { draft = { code: 'EXEM3', price: '32,50', lpa: '4,10', vpa: '21,00', dy: '9', roe: '19', payout: '55', div: '1,4' }; render(); toast('Exemplo fictício carregado'); });
  document.querySelectorAll('[data-load]').forEach(el => el.onclick = () => { const s = S.analyses.find(k => k.id === el.dataset.load); if (!s) return; if (Q(s.code)) { fillFromData(s.code); return; } draft = { code: s.code, price: nf(s.price), lpa: nf(s.lpa), vpa: nf(s.vpa), dy: nf(s.dy * 100), roe: nf(s.roe * 100), payout: nf(s.payout * 100), div: nf(s.div), src: null }; render(); });
  // ajustes
  bindPlano();
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
    box.innerHTML = `<p class="sdcap">Mais analisadas</p>` + popular().map(c => `<button data-pick="${c}" class="${draft.src && draft.code === c ? 'on' : ''}"><b>${c}</b></button>`).join('');
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
  const sh = $('#ashare'); if (sh) sh.onclick = async () => { sh.disabled = true; sh.textContent = 'Gerando imagem...'; try { await compartilharAnalise(); } finally { sh.disabled = false; sh.textContent = 'Compartilhar imagem'; } };
  const cp = $('#acmp'); if (cp) cp.onclick = () => { cmpA = (lastA && lastA.code) || draft.code || ''; if (cmpB === cmpA) cmpB = ''; go('comparar'); setTimeout(() => { const i = $('#cmpb'); if (i && !cmpB) i.focus(); }, 50); };
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
const h = location.hash.slice(1); if (['inicio', 'analisar', 'carteira', 'mais', 'lancamentos', 'ranking', 'ajustes', 'comparar'].includes(h)) route = h;
render();
if (authed()) carregaDados();
if (S.onboarded && authed()) { dailyHello(); checkBadges(); save(); }
setTimeout(checarSessao, 1500);
if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
