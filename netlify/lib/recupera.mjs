import { createHmac } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { env, enviarBrevo, normEmail } from './acesso.mjs';

export const recuperas = () => getStore({ name: 'recupera', consistency: 'strong' });
export const CHECKOUT = 'https://pay.kiwify.com.br/YDH2bQZ';
export const PASSOS_H = [1, 24, 72];

const site = () => (env('URL') || 'https://eufuturorico.netlify.app').replace(/\/$/, '');
const segredo = () => env('SESSION_SECRET') || env('WEBHOOK_KEY') || 'efr';
export const assinaSair = e => createHmac('sha256', segredo()).update('sair:' + normEmail(e)).digest('hex').slice(0, 24);
const limpa = t => String(t || '').replace(/[<>&"]/g, '');

export function linkCheckout(r, passo) {
  let u;
  try { u = new URL(r.link && /^https:\/\/([a-z0-9-]+\.)*kiwify\.(com\.br|app)\//i.test(r.link) ? r.link : CHECKOUT); } catch { u = new URL(CHECKOUT); }
  u.searchParams.set('utm_source', 'email');
  u.searchParams.set('utm_medium', 'recupera');
  u.searchParams.set('utm_campaign', 'carrinho_' + (passo + 1));
  return u.toString();
}

const P = t => `<p style="margin:0 0 14px;color:#DDE1F5;font-size:15px;line-height:1.6">${t}</p>`;
const L = arr => `<table cellpadding="0" cellspacing="0" style="margin:0 0 14px">${arr.map(t => `<tr><td valign="top" style="color:#F5C13D;font-size:15px;padding:2px 8px 2px 0">✔</td><td style="color:#DDE1F5;font-size:15px;line-height:1.5;padding:2px 0">${t}</td></tr>`).join('')}</table>`;

const MODELOS = [
  {
    assunto: 'Seu acesso à Carteira Inteligente ficou pela metade',
    pre: 'Seu pedido continua aqui. Termine em menos de um minuto.',
    corpo: ola => [
      P(`${ola} Vi que você chegou até o pagamento da Carteira Inteligente, mas a compra não foi concluída. Às vezes o Pix expira, o cartão recusa ou a internet cai no meio do caminho.`),
      P('Seu pedido continua aqui. É só tocar no botão e terminar em menos de um minuto.'),
      L(['Em instantes, você vê se uma ação está cara ou barata, com os dados oficiais de quase 300 ações (CVM, B3 e Banco Central)', 'FIIs, ações dos EUA e renda fixa no mesmo app', 'Controle de despesas e o plano que mostra em que mês você vive de renda']),
      P('<b>R$ 47, pagamento único</b>, acesso vitalício e 7 dias de garantia.')
    ],
    botao: 'Terminar minha compra',
    fim: 'Se travou em alguma coisa, é só responder este e-mail que eu te ajudo.'
  },
  {
    assunto: 'Você compraria uma ação sem olhar o lucro?',
    pre: 'Preço baixo não é desconto. Veja por quê.',
    corpo: ola => [
      P(`${ola} Você quase entrou para a Carteira Inteligente. Antes de decidir, quero te mostrar por que eu criei esse app.`),
      P('A maioria das pessoas compra ação pelo preço baixo ou por dica de alguém. Só que preço baixo não é desconto: muita ação "barata" é de empresa que está dando prejuízo.'),
      P('O app faz essa conferência para você em instantes:'),
      L(['se a empresa lucra bem com o dinheiro dos donos', 'se a dívida está sob controle', 'se o preço cabe no lucro', 'se rende mais que a renda fixa (Selic + o risco da bolsa)']),
      P('…e ainda mostra o preço justo de Graham e a margem de segurança. As outras quase 300 ações, os FIIs, as ações dos EUA e a renda fixa ficam liberadas no app.'),
      P('<b>R$ 47 uma vez só</b> e 7 dias de garantia: se não gostar, você pede o dinheiro de volta.')
    ],
    botao: 'Terminar meu acesso',
    fim: 'Ferramenta educativa. Não é recomendação de investimento.'
  },
  {
    assunto: 'Último lembrete sobre o seu pedido',
    pre: 'Risco zero: 7 dias de garantia.',
    corpo: ola => [
      P(`${ola} Este é o último e-mail que eu mando sobre o seu pedido da Carteira Inteligente. Prometo não encher sua caixa de entrada.`),
      P('Só quero deixar uma coisa clara: <b>o risco é zero para você</b>. Você tem 7 dias de garantia. Se abrir o app e achar que não é para você, pede o reembolso na própria Kiwify e recebe tudo de volta, sem pergunta.'),
      P('O que pode mudar com ele:'),
      L(['parar de comprar ação "barata" que é armadilha', 'saber em que mês e ano você vive de renda', 'ver para onde vai o seu salário todo mês']),
      P('<b>R$ 47, pagamento único</b>, acesso vitalício.')
    ],
    botao: 'Concluir agora',
    fim: 'Se tiver qualquer dúvida, responde aqui que eu leio pessoalmente.'
  }
];

export function montarRecupera(passo, r) {
  const m = MODELOS[passo], pn = limpa(r.nome).split(' ')[0], ola = pn ? `Oi, ${pn}!` : 'Oi!';
  const link = linkCheckout(r, passo);
  const sair = `${site()}/api/recupera-sair?e=${encodeURIComponent(r.email)}&t=${assinaSair(r.email)}`;
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${m.assunto}</title></head>
<body style="margin:0;background:#0A0E24;font-family:Arial,Helvetica,sans-serif;color:#fff">
<div style="display:none;max-height:0;overflow:hidden">${m.pre}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E24"><tr><td align="center" style="padding:28px 12px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#121845;border-radius:22px"><tr><td style="padding:28px 22px">
<p style="margin:0 0 16px;color:#F5C13D;font-weight:bold;letter-spacing:1px;font-size:12px">★ EU FUTURO RICO</p>
${m.corpo(ola).join('')}
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:8px 0 18px"><a href="${link}" style="display:inline-block;background:#F5C13D;color:#0A0E24;font-weight:bold;font-size:17px;text-decoration:none;padding:15px 30px;border-radius:14px">${m.botao}</a></td></tr></table>
${P(m.fim)}
<p style="margin:0;font-size:15px;color:#fff">Abraço,<br><b>Guilherme · Eu Futuro Rico</b><br><span style="color:#B8BEDD">Rico não chuta. Rico confere o número.</span></p>
<p style="margin:22px 0 0;color:#8189B0;font-size:11px;line-height:1.5">Você recebeu este e-mail porque iniciou uma compra da Carteira Inteligente. <a href="${sair}" style="color:#8189B0">Não quero receber mais estes lembretes</a>.</p>
</td></tr></table></td></tr></table></body></html>`;
  const tira = s => s.replace(/<[^>]+>/g, '');
  const texto = `${m.corpo(ola).map(tira).join('\n\n')}\n\n${m.botao}: ${link}\n\n${m.fim}\n\nAbraço,\nGuilherme · Eu Futuro Rico\n\nPara não receber mais estes lembretes: ${sair}`;
  return { assunto: m.assunto, html, texto };
}

export async function enviarRecupera(passo, r) {
  const m = montarRecupera(passo, r);
  return enviarBrevo({ para: r.email, nome: r.nome, assunto: m.assunto, html: m.html, texto: m.texto });
}
