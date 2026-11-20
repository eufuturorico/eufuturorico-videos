import { getStore } from '@netlify/blobs';
import { createHmac, createHash, timingSafeEqual, randomInt } from 'node:crypto';

export const env = k => (globalThis.Netlify ? Netlify.env.get(k) : process.env[k]) || '';
export const acessos = () => getStore({ name: 'acessos', consistency: 'strong' });
export const codigos = () => getStore({ name: 'codigos', consistency: 'strong' });
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
export const normEmail = e => String(e || '').trim().toLowerCase();
export const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200;

const b64u = b => Buffer.from(b).toString('base64url');
const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');
export function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function novoToken(email, dias = 180) {
  const secret = env('SESSION_SECRET'); if (!secret) throw new Error('SESSION_SECRET ausente');
  const p = b64u(JSON.stringify({ e: email, exp: Date.now() + dias * 864e5 }));
  return p + '.' + sign(p, secret);
}
export function lerToken(tok) {
  const secret = env('SESSION_SECRET'); if (!secret || !tok) return null;
  const [p, s] = String(tok).split('.');
  if (!p || !s || !safeEq(sign(p, secret), s)) return null;
  try { const d = JSON.parse(Buffer.from(p, 'base64url').toString()); return d.exp > Date.now() ? d : null; } catch { return null; }
}

export function liberadosFixos() {
  return env('EMAILS_LIBERADOS').split(/[,;\s]+/).map(normEmail).filter(Boolean);
}
export async function acessoAtivo(email) {
  if (liberadosFixos().includes(email)) return { status: 'ativo', origem: 'fixo' };
  const a = await acessos().get(email, { type: 'json' });
  return a && a.status === 'ativo' ? a : null;
}

export const hashCodigo = (email, cod) => createHash('sha256').update(email + ':' + cod + ':' + env('SESSION_SECRET')).digest('hex');
export const gerarCodigo = () => String(randomInt(0, 1e6)).padStart(6, '0');

export async function enviarEmail(para, nome, cod) {
  const key = env('BREVO_API_KEY'), from = env('MAIL_FROM');
  if (!key || !from) return { ok: false, motivo: 'email_nao_configurado' };
  const site = env('URL') || 'https://eufuturorico.netlify.app';
  const html = `<!doctype html><html><body style="margin:0;background:#0A0E24;font-family:Arial,Helvetica,sans-serif;color:#fff">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="100%" style="max-width:420px;background:#121845;border-radius:20px;padding:28px" cellpadding="0" cellspacing="0"><tr><td>
<p style="margin:0 0 4px;color:#F5C13D;font-weight:bold;letter-spacing:1px;font-size:12px">★ EU FUTURO RICO</p>
<h1 style="margin:0 0 16px;font-size:22px">Seu código de acesso</h1>
<p style="margin:0 0 20px;color:#B8BEDD;font-size:15px">${nome ? 'Olá, ' + String(nome).split(' ')[0].replace(/[<>&"]/g, '') + '! ' : ''}Digite este código no app Carteira Inteligente:</p>
<p style="margin:0 0 20px;font-size:36px;font-weight:bold;letter-spacing:10px;color:#F5C13D;text-align:center;background:#0A0E24;border-radius:14px;padding:16px">${cod}</p>
<p style="margin:0 0 6px;color:#B8BEDD;font-size:13px">Ele vale por 15 minutos. Se não foi você quem pediu, é só ignorar este e-mail.</p>
<p style="margin:16px 0 0;font-size:13px"><a href="${site}" style="color:#F5C13D">Abrir o app</a></p>
</td></tr></table></td></tr></table></body></html>`;
  return enviarBrevo({ para, nome, assunto: `${cod} é o seu código de acesso`, html, texto: `Seu código de acesso ao app Carteira Inteligente: ${cod}\nEle vale por 15 minutos.\n${site}` });
}

export async function enviarBrevo({ para, nome, assunto, html, texto }) {
  const key = env('BREVO_API_KEY'), from = env('MAIL_FROM');
  if (!key || !from) return { ok: false, motivo: 'email_nao_configurado' };
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: env('MAIL_FROM_NAME') || 'Eu Futuro Rico', email: from },
      replyTo: { email: from },
      to: [{ email: para, ...(nome ? { name: String(nome).slice(0, 70) } : {}) }],
      subject: assunto,
      htmlContent: html,
      textContent: texto
    })
  });
  if (!r.ok) { console.error('brevo', r.status, (await r.text()).slice(0, 300)); return { ok: false, motivo: 'falha_envio' }; }
  return { ok: true };
}
