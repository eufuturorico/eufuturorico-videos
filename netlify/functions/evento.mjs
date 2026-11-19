import { registrar } from '../lib/funil.mjs';

const PUBLICOS = ['visita', 'teste', 'outra', 'preco', 'checkout'];

export default async (req) => {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const raw = await req.text();
  if (raw.length > 400) return new Response(null, { status: 413 });
  let b; try { b = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  if (!PUBLICOS.includes(b.e) || !b.v) return new Response(null, { status: 400 });
  try { await registrar(b.e, b.s, b.v); } catch (e) { console.warn('evento falhou', e.message); }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
};

export const config = { path: '/api/evento' };
