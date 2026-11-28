import { createHmac } from 'node:crypto';
import { acessos, codigos, env, json, normEmail, emailOk, safeEq } from '../lib/acesso.mjs';
import { registrar } from '../lib/funil.mjs';
import { enviarBoasVindas } from '../lib/boasvindas.mjs';
import { recuperas } from '../lib/recupera.mjs';

const LIBERA = ['paid', 'approved', 'order_approved', 'compra_aprovada', 'subscription_renewed'];
const ABANDONA = ['abandoned', 'abandoned_cart', 'cart_abandoned', 'carrinho_abandonado', 'checkout_abandoned', 'refused', 'order_refused', 'compra_recusada', 'pix_created', 'billet_created', 'boleto_created', 'waiting_payment'];
const EXCLUI = ['refunded', 'chargedback', 'chargeback', 'order_refunded', 'order_chargedback', 'compra_reembolsada', 'canceled', 'cancelled', 'order_canceled', 'subscription_canceled'];

export default async (req) => {
  if (req.method !== 'POST') return json({ erro: 'metodo' }, 405);
  const url = new URL(req.url);
  const raw = await req.text();
  const chave = env('WEBHOOK_KEY'), token = env('KIWIFY_TOKEN');
  const porChave = chave && safeEq(url.searchParams.get('k') || '', chave);
  const assinatura = url.searchParams.get('signature') || '';
  const porAssinatura = token && assinatura && safeEq(createHmac('sha1', token).update(raw).digest('hex'), assinatura);
  if (!porChave && !porAssinatura) { console.warn('webhook recusado: chave/assinatura inválida'); return json({ erro: 'nao_autorizado' }, 401); }

  let b; try { b = JSON.parse(raw); } catch { return json({ erro: 'json' }, 400); }
  const o = b.order || b.data || b;
  const cli = o.Customer || o.customer || {};
  const email = normEmail(cli.email || o.email || b.email);
  const evento = String(o.webhook_event_type || b.webhook_event_type || '').toLowerCase();
  const status = String(o.order_status || o.status || '').toLowerCase();
  const sinais = [evento, status, o.checkout_link && !o.order_id ? 'abandoned' : ''].filter(Boolean);
  const tp = o.TrackingParameters || o.tracking_parameters || {};
  const src = tp.utm_source || tp.src || 'kiwify';
  const pedidoId = o.order_id || o.order_ref || '';
  const marcar = async ev => { try { await registrar(ev, src, pedidoId); } catch (e) { console.warn('funil falhou', e.message); } };
  if (!emailOk(email)) { console.warn('webhook sem e-mail', evento, status); return json({ ok: true, ignorado: 'sem_email' }); }

  const st = acessos();
  if (sinais.some(s => EXCLUI.includes(s))) {
    await st.delete(email);
    await codigos().delete(email);
    await marcar('reembolso');
    console.log('acesso excluido', evento || status, email.replace(/(.).+@/, '$1***@'));
    return json({ ok: true, status: 'excluido' });
  }
  if (!sinais.some(s => LIBERA.includes(s)) && sinais.some(s => ABANDONA.includes(s))) {
    const ja = await st.get(email, { type: 'json' });
    if (ja && ja.status === 'ativo') return json({ ok: true, ignorado: 'ja_comprou' });
    const rs = recuperas(), ant = await rs.get(email, { type: 'json' });
    if (!ant || ant.comprou) {
      await rs.setJSON(email, { email, nome: cli.full_name || cli.first_name || cli.name || o.name || b.name || '', link: o.checkout_link || b.checkout_link || '', evento: evento || status || 'abandoned', origem: src, criado: new Date().toISOString(), enviados: [] });
      await marcar('abandono');
    } else if (!ant.link && (o.checkout_link || b.checkout_link)) await rs.setJSON(email, { ...ant, link: o.checkout_link || b.checkout_link });
    console.log('recuperacao agendada', evento || status, email.replace(/(.).+@/, '$1***@'));
    return json({ ok: true, status: 'recuperacao' });
  }
  if (!sinais.some(s => LIBERA.includes(s))) { console.log('webhook ignorado', evento, status); return json({ ok: true, ignorado: evento || status || 'evento' }); }
  const novo = 'ativo';

  const ant = (await st.get(email, { type: 'json' })) || {};
  await st.setJSON(email, {
    ...ant, status: novo, nome: cli.full_name || cli.first_name || cli.name || ant.nome || '',
    pedido: o.order_id || o.order_ref || ant.pedido || '', produto: (o.Product && (o.Product.product_name || o.Product.name)) || ant.produto || '',
    evento: evento || status, origem: 'kiwify', atualizado: new Date().toISOString(), criado: ant.criado || new Date().toISOString()
  });
  await marcar('venda');
  try { const rs = recuperas(), rc = await rs.get(email, { type: 'json' }); if (rc) { if ((rc.enviados || []).length) await marcar('recuperado'); await rs.delete(email); } } catch (e) { console.warn('recupera limpeza', e.message); }
  if (!ant.boasVindas || ant.status !== 'ativo') {
    try {
      const r = await enviarBoasVindas(email, cli.full_name || cli.first_name || cli.name || ant.nome || '');
      const atual = (await st.get(email, { type: 'json' })) || {};
      await st.setJSON(email, { ...atual, boasVindas: r.ok ? new Date().toISOString() : '', boasVindasErro: r.ok ? '' : r.motivo });
      console.log('boas-vindas', r.ok ? 'enviado' : 'falhou ' + r.motivo);
    } catch (e) { console.error('boas-vindas erro', e.message); }
  }
  console.log('acesso', novo, email.replace(/(.).+@/, '$1***@'));
  return json({ ok: true, status: novo });
};

export const config = { path: '/api/kiwify' };
