import { acessos, env, json, normEmail, emailOk, safeEq, liberadosFixos } from '../lib/acesso.mjs';

export default async (req) => {
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const key = env('ADMIN_KEY');
  if (!key || !safeEq(req.headers.get('x-admin-key') || '', key)) return json({ erro: 'nao_autorizado' }, 401);
  let b; try { b = await req.json(); } catch { return json({ erro: 'json' }, 400); }
  const st = acessos();
  if (b.acao === 'listar') {
    const { blobs } = await st.list();
    const itens = await Promise.all(blobs.map(async x => ({ email: x.key, ...(await st.get(x.key, { type: 'json' })) })));
    itens.sort((p, q) => String(q.atualizado).localeCompare(String(p.atualizado)));
    return json({ ok: true, itens, fixos: liberadosFixos() });
  }
  const email = normEmail(b.email);
  if (!emailOk(email)) return json({ erro: 'email_invalido' }, 400);
  if (b.acao === 'liberar' || b.acao === 'bloquear') {
    const ant = (await st.get(email, { type: 'json' })) || {};
    const v = { ...ant, status: b.acao === 'liberar' ? 'ativo' : 'bloqueado', nome: b.nome || ant.nome || '', origem: ant.origem || 'manual', evento: 'manual', atualizado: new Date().toISOString(), criado: ant.criado || new Date().toISOString() };
    await st.setJSON(email, v);
    return json({ ok: true, email, ...v });
  }
  if (b.acao === 'apagar') { await st.delete(email); return json({ ok: true }); }
  return json({ erro: 'acao_invalida' }, 400);
};

export const config = { path: '/api/admin' };
