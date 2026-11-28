import { acessos, env, json, normEmail, emailOk, safeEq, liberadosFixos } from '../lib/acesso.mjs';
import { resumo } from '../lib/funil.mjs';
import { enviarBoasVindas } from '../lib/boasvindas.mjs';
import { recuperas } from '../lib/recupera.mjs';
import { registrar } from '../lib/funil.mjs';

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
  if (b.acao === 'funil') return json({ ok: true, ...(await resumo(Math.max(1, Math.min(90, +b.dias || 14)))) });
  const email = normEmail(b.email);
  if (!emailOk(email)) return json({ erro: 'email_invalido' }, 400);
  if (b.acao === 'liberar' || b.acao === 'bloquear') {
    const ant = (await st.get(email, { type: 'json' })) || {};
    const v = { ...ant, status: b.acao === 'liberar' ? 'ativo' : 'bloqueado', nome: b.nome || ant.nome || '', origem: ant.origem || 'manual', evento: 'manual', atualizado: new Date().toISOString(), criado: ant.criado || new Date().toISOString() };
    await st.setJSON(email, v);
    return json({ ok: true, email, ...v });
  }
  if (b.acao === 'boasvindas') {
    const ant = (await st.get(email, { type: 'json' })) || {};
    const r = await enviarBoasVindas(email, b.nome || ant.nome || '');
    if (!r.ok) return json({ erro: r.motivo }, 502);
    if (ant.status) await st.setJSON(email, { ...ant, boasVindas: new Date().toISOString(), boasVindasErro: '' });
    return json({ ok: true });
  }
  if (b.acao === 'recuperar') {
    const ant = (await st.get(email, { type: 'json' })) || {};
    if (ant.status === 'ativo') return json({ erro: 'ja_comprou' }, 409);
    const rs = recuperas(), r0 = await rs.get(email, { type: 'json' });
    if (r0 && !r0.sair && (r0.enviados || []).length) return json({ ok: true, ja: true, enviados: r0.enviados.length });
    await rs.setJSON(email, { email, nome: b.nome || (r0 && r0.nome) || '', link: '', evento: 'manual', origem: 'manual', criado: new Date(Date.now() - 61 * 60e3).toISOString(), enviados: [] });
    try { await registrar('abandono', 'manual', email.replace(/[^a-z0-9]/g, '').slice(0, 40)); } catch (e) {}
    return json({ ok: true });
  }
  if (b.acao === 'apagar') { await st.delete(email); return json({ ok: true }); }
  return json({ erro: 'acao_invalida' }, 400);
};

export const config = { path: '/api/admin' };
