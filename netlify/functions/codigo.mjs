import { acessoAtivo, codigos, enviarEmail, gerarCodigo, hashCodigo, json, normEmail, emailOk } from '../lib/acesso.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  let b; try { b = await req.json(); } catch { return json({ erro: 'json' }, 400); }
  const email = normEmail(b.email);
  if (!emailOk(email)) return json({ erro: 'email_invalido' }, 400);
  const a = await acessoAtivo(email);
  if (!a) return json({ erro: 'nao_encontrado' }, 404);
  const st = codigos();
  const ant = await st.get(email, { type: 'json' });
  if (ant && Date.now() - ant.envio < 60e3) return json({ erro: 'aguarde', segundos: Math.ceil((60e3 - (Date.now() - ant.envio)) / 1e3) }, 429);
  const cod = gerarCodigo();
  await st.setJSON(email, { h: hashCodigo(email, cod), exp: Date.now() + 15 * 60e3, tent: 0, envio: Date.now() });
  const r = await enviarEmail(email, a.nome, cod);
  if (!r.ok) { await st.delete(email); return json({ erro: r.motivo }, 503); }
  return json({ ok: true });
};

export const config = { path: '/api/codigo' };
