import { acessoAtivo, codigos, hashCodigo, json, normEmail, emailOk, novoToken, safeEq } from '../lib/acesso.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  let b; try { b = await req.json(); } catch { return json({ erro: 'json' }, 400); }
  const email = normEmail(b.email), cod = String(b.codigo || '').replace(/\D/g, '');
  if (!emailOk(email) || cod.length !== 6) return json({ erro: 'dados_invalidos' }, 400);
  const st = codigos();
  const c = await st.get(email, { type: 'json' });
  if (!c || c.exp < Date.now()) return json({ erro: 'expirado' }, 400);
  if (c.tent >= 5) return json({ erro: 'muitas_tentativas' }, 429);
  if (!safeEq(hashCodigo(email, cod), c.h)) {
    await st.setJSON(email, { ...c, tent: c.tent + 1 });
    return json({ erro: 'codigo_errado', restam: 4 - c.tent }, 400);
  }
  await st.delete(email);
  const a = await acessoAtivo(email);
  if (!a) return json({ erro: 'nao_encontrado' }, 403);
  return json({ ok: true, token: novoToken(email), email, nome: a.nome || '' });
};

export const config = { path: '/api/entrar' };
