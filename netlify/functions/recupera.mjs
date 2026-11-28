import { acessoAtivo } from '../lib/acesso.mjs';
import { recuperas, enviarRecupera, PASSOS_H } from '../lib/recupera.mjs';

const H = 3600e3;
const horaSP = () => (new Date().getUTCHours() + 21) % 24;

export default async () => {
  const st = recuperas(), agora = Date.now(), h = horaSP();
  const { blobs } = await st.list();
  let enviados = 0;
  for (const { key } of blobs) {
    const r = await st.get(key, { type: 'json' });
    if (!r || !r.email) { await st.delete(key); continue; }
    const idade = agora - Date.parse(r.criado);
    if (r.comprou || r.sair || idade > 10 * 24 * H) { await st.delete(key); continue; }
    if (await acessoAtivo(r.email).catch(() => false)) { await st.delete(key); continue; }
    const passo = (r.enviados || []).length;
    if (passo >= PASSOS_H.length) continue;
    if (idade < PASSOS_H[passo] * H) continue;
    if (passo > 0 && (h < 8 || h >= 22)) continue;
    if (passo === 0 && (h < 7 || h >= 23)) continue;
    const res = await enviarRecupera(passo, r).catch(e => ({ ok: false, motivo: e.message }));
    if (res.ok) { r.enviados = [...(r.enviados || []), new Date().toISOString()]; enviados++; }
    else { r.erros = (r.erros || 0) + 1; if (r.erros >= 3) r.enviados = [...(r.enviados || []), 'falhou']; console.warn('recupera falhou', res.motivo); }
    await st.setJSON(key, r);
  }
  console.log('recupera', blobs.length, 'pendentes,', enviados, 'enviados');
};

export const config = { schedule: '*/15 * * * *' };
