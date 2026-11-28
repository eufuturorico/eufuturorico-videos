import { normEmail, safeEq } from '../lib/acesso.mjs';
import { recuperas, assinaSair } from '../lib/recupera.mjs';

const pagina = msg => new Response(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Eu Futuro Rico</title></head><body style="margin:0;background:#0A0E24;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:24px;text-align:center"><div><p style="color:#F5C13D;font-weight:bold;letter-spacing:1px;font-size:12px">★ EU FUTURO RICO</p><h1 style="font-size:22px">${msg}</h1></div></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });

export default async (req) => {
  const u = new URL(req.url), e = normEmail(u.searchParams.get('e')), t = u.searchParams.get('t') || '';
  if (!e || !safeEq(t, assinaSair(e))) return pagina('Link inválido.');
  const st = recuperas(), r = await st.get(e, { type: 'json' });
  if (r) await st.setJSON(e, { ...r, sair: new Date().toISOString() });
  return pagina('Pronto. Você não vai receber mais estes lembretes.');
};

export const config = { path: '/api/recupera-sair' };
