import { acessoAtivo, json, lerToken } from '../lib/acesso.mjs';

export default async (req) => {
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const d = lerToken(tok);
  if (!d) return json({ erro: 'sessao_invalida' }, 401);
  const a = await acessoAtivo(d.e);
  if (!a) return json({ erro: 'revogado' }, 403);
  return json({ ok: true, email: d.e, nome: a.nome || '' });
};

export const config = { path: '/api/sessao' };
