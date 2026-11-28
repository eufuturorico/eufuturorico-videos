import { getStore } from '@netlify/blobs';

export const funil = () => getStore({ name: 'funil', consistency: 'strong' });
export const EVENTOS = ['visita', 'teste', 'outra', 'preco', 'checkout', 'abandono', 'venda', 'recuperado', 'reembolso'];
export const diaSP = (d = new Date()) => new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 10);
const limpa = (s, max, padrao) => String(s || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, max) || padrao;
export const origem = s => limpa(s, 24, 'direto');

export async function registrar(ev, src, id) {
  if (!EVENTOS.includes(ev)) return false;
  await funil().set(`${diaSP()}/${ev}/${origem(src)}/${limpa(id, 40, Math.random().toString(36).slice(2, 12))}`, '1');
  return true;
}

export async function resumo(dias = 14) {
  const corte = diaSP(new Date(Date.now() - (dias - 1) * 864e5));
  const { blobs } = await funil().list();
  const porDia = {}, porOrigem = {}, total = {};
  for (const { key } of blobs) {
    const [dia, ev, src] = key.split('/');
    if (!dia || dia < corte || !EVENTOS.includes(ev)) continue;
    (porDia[dia] ||= {})[ev] = (porDia[dia][ev] || 0) + 1;
    (porOrigem[src] ||= {})[ev] = (porOrigem[src][ev] || 0) + 1;
    total[ev] = (total[ev] || 0) + 1;
  }
  return { dias, desde: corte, total, porDia, porOrigem };
}
