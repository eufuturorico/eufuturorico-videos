import { env, enviarBrevo } from './acesso.mjs';

const limpa = t => String(t || '').replace(/[<>&"]/g, '');
const titulo = t => `<tr><td style="padding:22px 0 8px"><p style="margin:0;color:#F5C13D;font-weight:bold;font-size:13px;letter-spacing:1px">${t}</p></td></tr>`;
const passo = (n, t) => `<tr><td style="padding:4px 0"><table cellpadding="0" cellspacing="0" width="100%"><tr><td width="30" valign="top"><div style="width:22px;height:22px;border-radius:11px;background:#F5C13D;color:#0A0E24;font-weight:bold;font-size:13px;line-height:22px;text-align:center">${n}</div></td><td style="color:#DDE1F5;font-size:15px;line-height:1.5">${t}</td></tr></table></td></tr>`;
const linha = t => `<tr><td style="padding:3px 0;color:#DDE1F5;font-size:15px;line-height:1.5">${t}</td></tr>`;
const caixa = (t, cor = '#1A2160') => `<tr><td style="padding:8px 0"><div style="background:${cor};border-radius:14px;padding:14px 16px;color:#DDE1F5;font-size:14px;line-height:1.5">${t}</div></td></tr>`;

export function montarBoasVindas(nome) {
  const site = (env('URL') || 'https://eufuturorico.netlify.app').replace(/\/$/, '');
  const link = site + '/?utm_source=email&utm_medium=boasvindas';
  const de = env('MAIL_FROM') || 'eufuturorico@gmail.com';
  const pn = limpa(nome).split(' ')[0];
  const ola = pn ? `Olá, ${pn}!` : 'Olá!';

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seu acesso à Carteira Inteligente</title></head>
<body style="margin:0;background:#0A0E24;font-family:Arial,Helvetica,sans-serif;color:#fff">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E24"><tr><td align="center" style="padding:28px 12px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#121845;border-radius:22px"><tr><td style="padding:28px 22px">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td><p style="margin:0 0 6px;color:#F5C13D;font-weight:bold;letter-spacing:1px;font-size:12px">★ EU FUTURO RICO</p>
<h1 style="margin:0 0 10px;font-size:24px;line-height:1.2">${ola} Seu acesso à Carteira Inteligente está liberado 🎉</h1>
<p style="margin:0;color:#B8BEDD;font-size:15px;line-height:1.5">O app funciona direto pelo navegador e fica com ícone na tela do celular, igual a um app de loja. Não precisa baixar nada da App Store nem do Google Play.</p></td></tr>
<tr><td align="center" style="padding:22px 0 6px"><a href="${link}" style="display:inline-block;background:#F5C13D;color:#0A0E24;font-weight:bold;font-size:17px;text-decoration:none;padding:15px 30px;border-radius:14px">Abrir o app</a></td></tr>
<tr><td align="center"><p style="margin:0;color:#8189B0;font-size:12px">${site.replace(/^https?:\/\//, '')}</p></td></tr>
${titulo('PASSO 1 · ABRA O APP')}
${linha('Toque no botão acima ou abra <b>' + site.replace(/^https?:\/\//, '') + '</b> no navegador do celular:')}
${linha('• iPhone: use o <b>Safari</b>.')}
${linha('• Android: use o <b>Chrome</b>.')}
${caixa('⚠️ Se o link abriu dentro do Instagram, do Gmail ou de outro app, toque nos 3 pontinhos e escolha <b>"Abrir no navegador"</b> antes de continuar.', '#2A2350')}
${titulo('PASSO 2 · ENTRE COM SEU E-MAIL')}
${passo(1, 'Digite o <b>mesmo e-mail que você usou na compra</b> pela Kiwify.')}
${passo(2, 'Toque em <b>"Receber código"</b>.')}
${passo(3, `Você vai receber um código de 6 números enviado por <b>${limpa(de)}</b>. Se não aparecer, olhe também o <b>spam</b> e a aba <b>Promoções</b>.`)}
${passo(4, 'Digite o código e toque em <b>"Entrar"</b>. Ele vale por 15 minutos; se passar, toque em "Reenviar código".')}
${linha('<span style="color:#B8BEDD">Depois de entrar, você não precisa repetir isso a cada uso.</span>')}
${titulo('PASSO 3 · COLOQUE O ÍCONE NA TELA DO CELULAR')}
${caixa('<b>🍎 iPhone (Safari)</b><br>1. Toque em <b>Compartilhar</b> (o quadrado com a seta para cima, na barra de baixo).<br>2. Role e toque em <b>"Adicionar à Tela de Início"</b>.<br>3. Toque em <b>"Adicionar"</b>.')}
${caixa('<b>🤖 Android (Chrome)</b><br>1. Toque nos <b>3 pontinhos</b> no canto de cima.<br>2. Toque em <b>"Instalar app"</b> ou <b>"Adicionar à tela inicial"</b>.<br>3. Confirme em <b>"Instalar"</b>.')}
${linha('Pronto! Agora é só abrir pelo ícone da <b>Carteira Inteligente</b> ✅')}
${titulo('PRIMEIROS PASSOS')}
${linha('🔍 <b>Analisar uma ação:</b> toque no botão amarelo do meio (a lupa), digite o código (ex.: PETR4) ou o nome da empresa e toque na sugestão.')}
${linha('🧾 <b>Organizar o mês:</b> toque em "Despesas" e lance seus gastos e entradas.')}
${linha('💼 <b>Carteira:</b> cadastre as ações que você já tem.')}
${linha('🎯 <b>Meta:</b> veja em que mês e ano você vive de renda.')}
${caixa('💡 O app atualiza os dados das ações todos os dias. Se algo parecer desatualizado, feche o app por completo e abra de novo.')}
${titulo('PRECISA DE AJUDA?')}
${linha('É só responder este e-mail ou chamar no Instagram <a href="https://instagram.com/eu.futuro.rico" style="color:#F5C13D">@eu.futuro.rico</a>.')}
${linha('<span style="color:#B8BEDD">Lembrete: você tem 7 dias de garantia, e o acesso é vitalício.</span>')}
<tr><td style="padding:22px 0 0"><p style="margin:0;font-size:15px">Bons investimentos!<br><b>Eu Futuro Rico</b></p></td></tr>
<tr><td style="padding:18px 0 0"><p style="margin:0;color:#8189B0;font-size:11px;line-height:1.5">A Carteira Inteligente é uma ferramenta educativa e não faz recomendação de compra ou venda.</p></td></tr>
</table></td></tr></table></td></tr></table></body></html>`;

  const texto = `${ola} Seu acesso à Carteira Inteligente está liberado.

O app funciona direto pelo navegador e fica com ícone na tela do celular. Não precisa baixar nada da App Store nem do Google Play.

PASSO 1 · ABRA O APP
${link}
iPhone: use o Safari. Android: use o Chrome.
Se o link abriu dentro do Instagram, do Gmail ou de outro app, toque nos 3 pontinhos e escolha "Abrir no navegador".

PASSO 2 · ENTRE COM SEU E-MAIL
1. Digite o mesmo e-mail que você usou na compra pela Kiwify.
2. Toque em "Receber código".
3. Você vai receber um código de 6 números enviado por ${de}. Olhe também o spam e a aba Promoções.
4. Digite o código e toque em "Entrar". Ele vale por 15 minutos.

PASSO 3 · COLOQUE O ÍCONE NA TELA DO CELULAR
iPhone (Safari): Compartilhar > "Adicionar à Tela de Início" > "Adicionar".
Android (Chrome): 3 pontinhos > "Instalar app" ou "Adicionar à tela inicial" > "Instalar".

PRIMEIROS PASSOS
Analisar uma ação: botão amarelo do meio (a lupa), digite o código ou o nome da empresa e toque na sugestão.
Organizar o mês: "Despesas".
Carteira: cadastre as ações que você já tem.
Meta: veja em que mês e ano você vive de renda.

Precisa de ajuda? Responda este e-mail ou chame no Instagram @eu.futuro.rico.
Você tem 7 dias de garantia, e o acesso é vitalício.

Bons investimentos!
Eu Futuro Rico

A Carteira Inteligente é uma ferramenta educativa e não faz recomendação de compra ou venda.`;

  return { assunto: '📱 Seu acesso à Carteira Inteligente: instale em 2 minutos', html, texto };
}

export async function enviarBoasVindas(para, nome) {
  const m = montarBoasVindas(nome);
  return enviarBrevo({ para, nome, assunto: m.assunto, html: m.html, texto: m.texto });
}
