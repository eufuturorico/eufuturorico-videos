"""Gera data/fiis.json, data/rf.json e data/eua.json para as abas FIIs, Renda fixa e EUA do app.

FIIs: informes mensais e trimestrais da CVM (dados abertos) + cotações oficiais da B3 (COTAHIST, pelo ISIN).
Renda fixa: taxas indicativas dos títulos públicos (ANBIMA, arquivo diário público) + Selic/CDI/IPCA (Banco Central).
EUA: balanços oficiais da SEC (XBRL companyfacts) + cotação e dividendos (Yahoo Finance) + juro do título de 10 anos (Tesouro americano) + dólar PTAX (Banco Central).
Cada parte é independente: se uma fonte falhar, mantém o arquivo anterior daquela parte.
"""
import csv, io, json, sys, time, zipfile, datetime as dt, urllib.request
from collections import defaultdict

TODAY = dt.date.today()
Y = TODAY.year
UA_WEB = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
UA_SEC = 'Eu Futuro Rico admin@eufuturorico.netlify.app'


def get(u, t=300, ua=UA_WEB, tries=3):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': ua, 'Accept-Encoding': 'identity'}), timeout=t).read()
        except Exception as e:
            print('retry', u[:90], e, file=sys.stderr)
            time.sleep(4 * (i + 1))
    raise RuntimeError('falhou ' + u)


def f(x):
    try:
        return float(str(x).replace(',', '.'))
    except Exception:
        return None


def salvar(nome, obj):
    json.dump(obj, open('data/' + nome, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    print('gravado', nome, file=sys.stderr)


def sgs(serie, n=1):
    d = json.loads(get(f'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados/ultimos/{n}?formato=json', 60))
    return d


# ---------------- B3 (cotações por ISIN, últimos pregões) ----------------
def cotahist(ndias=22):
    dias = []
    for i in range(0, 40):
        d = TODAY - dt.timedelta(days=i)
        if d.weekday() >= 5:
            continue
        try:
            z = zipfile.ZipFile(io.BytesIO(get(f'https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D{d:%d%m%Y}.ZIP', 120, tries=1)))
        except Exception:
            continue
        P = {}
        for l in z.read(z.namelist()[0]).decode('latin-1').splitlines():
            if l[:2] != '01' or l[24:27] != '010' or l[10:12] != '12':
                continue
            P[l[12:24].strip()] = {'preco': int(l[108:121]) / 100, 'vol': int(l[170:188]) / 100, 'isin': l[230:242], 'nome': l[27:39].strip(), 'neg': int(l[147:152])}
        if P:
            dias.append((d.isoformat(), P))
            if len(dias) >= ndias:
                break
    return dias


# ---------------- FIIs ----------------
def fiis():
    dias = cotahist()
    if not dias:
        raise RuntimeError('sem COTAHIST')
    data_cot, P = dias[0]
    volmed = defaultdict(list)
    for _, Pd in dias:
        for c, v in Pd.items():
            volmed[c].append(v['vol'])
    geral, comp, ap = {}, {}, {}
    for yr in (Y - 1, Y):
        try:
            z = zipfile.ZipFile(io.BytesIO(get(f'https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_{yr}.zip')))
        except Exception as e:
            print('CVM FII', yr, e, file=sys.stderr)
            continue
        for nome, alvo in (('geral', geral), ('complemento', comp), ('ativo_passivo', ap)):
            for r in csv.DictReader(io.StringIO(z.read(f'inf_mensal_fii_{nome}_{yr}.csv').decode('latin-1')), delimiter=';'):
                k = (r['CNPJ_Fundo_Classe'], r['Data_Referencia'])
                if k not in alvo or int(r['Versao'] or 0) >= int(alvo[k]['Versao'] or 0):
                    alvo[k] = r
    # vacância (informe trimestral, último trimestre de cada fundo), ponderada pelo peso do imóvel
    vac = {}
    for yr in (Y, Y - 1):
        try:
            z = zipfile.ZipFile(io.BytesIO(get(f'https://dados.cvm.gov.br/dados/FII/DOC/INF_TRIMESTRAL/DADOS/inf_trimestral_fii_{yr}.zip')))
            rows = list(csv.DictReader(io.StringIO(z.read(f'inf_trimestral_fii_imovel_{yr}.csv').decode('latin-1')), delimiter=';'))
        except Exception as e:
            print('CVM trimestral', yr, e, file=sys.stderr)
            continue
        ult = {}
        for r in rows:
            c = r['CNPJ_Fundo_Classe']
            if c in vac:
                continue
            if r['Data_Referencia'] > ult.get(c, ''):
                ult[c] = r['Data_Referencia']
        acc = defaultdict(lambda: [0.0, 0.0])
        for r in rows:
            c = r['CNPJ_Fundo_Classe']
            if c in vac or r['Data_Referencia'] != ult.get(c):
                continue
            v, w = f(r['Percentual_Vacancia']), f(r['Percentual_Imovel_Total_Investido']) or 0
            if v is None:
                continue
            acc[c][0] += v * (w or 1)
            acc[c][1] += (w or 1)
        for c, (s, w) in acc.items():
            if w > 0:
                if 0 <= s / w <= 0.5:
                    vac[c] = round(s / w, 4)
    # por ISIN: escolhe o CNPJ com mais cotistas no último informe
    porisin = defaultdict(list)
    for (cnpj, d), g in geral.items():
        porisin[g['Codigo_ISIN']].append((d, cnpj))
    out = {}
    for cod, q in P.items():
        if q['preco'] <= 0 or not q['isin'].strip():
            continue
        cands = porisin.get(q['isin'])
        if not cands:
            continue
        cnpjs = {c for _, c in cands}
        melhor, info = None, None
        for c in cnpjs:
            ds = sorted(d for (cc, d) in comp if cc == c)
            if not ds:
                continue
            r = comp[(c, ds[-1])]
            vp = f(r['Valor_Patrimonial_Cotas'])
            if not vp or vp <= 0:
                continue
            score = (abs(vp / q['preco'] - 1) < 1.5, int(f(r['Total_Numero_Cotistas']) or 0))
            if melhor is None or score > melhor:
                melhor, info = score, (c, ds)
        if not info:
            continue
        c, ds = info
        ult = ds[-12:]
        rend, meses = 0.0, 0
        for d in ult:
            r = comp[(c, d)]
            dym, vp = f(r['Percentual_Dividend_Yield_Mes']), f(r['Valor_Patrimonial_Cotas'])
            if dym is None or vp is None or dym < 0 or dym > 0.05:
                continue
            rend += dym * vp
            meses += 1
        r0 = comp[(c, ds[-1])]
        vp = f(r0['Valor_Patrimonial_Cotas'])
        mensais = []
        for d in ds[-6:]:
            r = comp[(c, d)]
            dym, vpx = f(r['Percentual_Dividend_Yield_Mes']), f(r['Valor_Patrimonial_Cotas'])
            mensais.append(round(dym * vpx, 4) if dym is not None and vpx and 0 <= dym <= 0.05 else None)
        a = ap.get((c, ds[-1]), {})
        tot = f(a.get('Total_Investido')) or 0
        papel = sum(f(a.get(k)) or 0 for k in ('CRI', 'CRI_CRA', 'LCI', 'LCI_LCA', 'Letras_Hipotecarias', 'LIG', 'Titulos_Publicos', 'Titulos_Privados', 'Fundos_Renda_Fixa', 'Debentures', 'Notas_Promissorias'))
        tijolo = sum(f(a.get(k)) or 0 for k in ('Direitos_Bens_Imoveis', 'Imoveis_Renda_Acabados', 'Imoveis_Renda_Construcao', 'Imoveis_Venda_Acabados', 'Imoveis_Venda_Construcao', 'Terrenos', 'Acoes_Sociedades_Atividades_FII', 'Cotas_Sociedades_Atividades_FII'))
        fof = f(a.get('FII')) or 0
        tipo = 'Híbrido'
        if tot > 0:
            if papel / tot >= 0.6:
                tipo = 'Papel'
            elif tijolo / tot >= 0.6:
                tipo = 'Tijolo'
            elif fof / tot >= 0.6:
                tipo = 'Fundo de fundos'
        g = geral.get((c, ds[-1])) or {}
        nm = (g.get('Nome_Fundo_Classe') or q['nome']).replace('FUNDO DE INVESTIMENTO IMOBILIÁRIO', 'FII').replace('FUNDO DE INVESTIMENTO IMOBILIARIO', 'FII')
        out[cod] = {
            'nome': ' '.join(nm.split())[:60], 'preco': q['preco'], 'vp': round(vp, 4) if vp else None,
            'pvp': round(q['preco'] / vp, 4) if vp else None,
            'rend12m': round(rend * 12 / meses, 4) if meses >= 6 else None, 'meses': meses,
            'dy': round(rend * 12 / meses / q['preco'], 4) if meses >= 6 else None,
            'mensais': mensais, 'cotistas': int(f(r0['Total_Numero_Cotistas']) or 0), 'pl': round(f(r0['Patrimonio_Liquido']) or 0),
            'liq': round(sum(volmed[cod]) / len(volmed[cod])), 'tipo': tipo, 'segmento': (g.get('Segmento_Atuacao') or '').strip(),
            'vacancia': vac.get(c), 'ref': ds[-1][:7], 'cnpj': c,
        }
    print('FIIs gerados', len(out), file=sys.stderr)
    if len(out) < 80:
        raise RuntimeError('poucos FIIs')
    for t in ('MXRF11', 'HGLG11', 'KNCR11', 'XPML11', 'BTLG11', 'VISC11'):
        print(t, json.dumps(out.get(t), ensure_ascii=False), file=sys.stderr)
    return {'data_cotacao': data_cot, 'fiis': out, 'fonte': 'CVM (informes mensais e trimestrais de FII) e B3 (COTAHIST)'}


# ---------------- Renda fixa ----------------
NOMES_TD = {'LTN': 'Tesouro Prefixado', 'NTN-F': 'Tesouro Prefixado com Juros Semestrais', 'NTN-B': 'Tesouro IPCA+ (com juros semestrais)', 'LFT': 'Tesouro Selic'}


def rf():
    m = {}
    for k, s in (('selic', 432), ('cdi', 12), ('ipca12m', 13522), ('poupanca', 195)):
        try:
            v = sgs(s)[-1]
            val = float(v['valor']) / 100
            if k == 'cdi':
                val = (1 + val) ** 252 - 1
            if k == 'poupanca':
                val = (1 + val) ** 12 - 1
            m[k] = {'valor': round(val, 6), 'data': dt.datetime.strptime(v['data'], '%d/%m/%Y').date().isoformat()}
        except Exception as e:
            print('SGS', s, e, file=sys.stderr)
    tit, ref = [], None
    for i in range(0, 10):
        d = TODAY - dt.timedelta(days=i)
        if d.weekday() >= 5:
            continue
        try:
            txt = get(f'https://www.anbima.com.br/informacoes/merc-sec/arqs/ms{d:%y%m%d}.txt', 60, tries=1).decode('latin-1')
        except Exception:
            continue
        for l in txt.splitlines():
            p = l.split('@')
            if len(p) < 9 or p[0] not in NOMES_TD:
                continue
            venc = dt.datetime.strptime(p[4], '%Y%m%d').date()
            tit.append({'tipo': p[0], 'nome': NOMES_TD[p[0]], 'vencimento': venc.isoformat(), 'taxa': round(f(p[7]) / 100, 6), 'pu': f(p[8])})
        if tit:
            ref = d.isoformat()
            break
    if not tit:
        raise RuntimeError('sem ANBIMA')
    print('títulos', len(tit), ref, file=sys.stderr)
    return {'mercado': m, 'titulos': tit, 'data_ref': ref, 'fonte': 'ANBIMA (taxas indicativas do mercado secundário de títulos públicos) e Banco Central (SGS)'}


# ---------------- EUA ----------------
EUA = ('AAPL MSFT GOOGL AMZN META NVDA TSLA JPM V MA JNJ PG KO PEP WMT COST DIS NFLX MCD NKE INTC AMD ORCL CSCO IBM ADBE CRM PYPL BAC WFC C GS MS AXP '
       'XOM CVX PFE MRK ABBV LLY UNH T VZ HD LOW SBUX BA CAT MMM GE HON UPS FDX QCOM TXN AVGO MU PM MO CL KMB MDLZ KHC GM F UBER ABNB BKNG TMO ABT DHR '
       'AMGN GILD BMY CVS O AMT PLD SPG BLK SCHW USB PNC TGT LMT RTX NOC DE MDT ISRG NOW INTU AMAT LRCX PANW BRK-B').split()
FIN_EUA = {'JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'AXP', 'BLK', 'SCHW', 'USB', 'PNC', 'BRK-B'}
NOMES_EUA = {}


def fato_fim(g, tags, fim):
    """Valor anual (10-K) de um destes campos com o mesmo fim de exercício do lucro; None se não houver."""
    for t in tags:
        if t not in g:
            continue
        us = g[t]['units']
        u = 'USD' if 'USD' in us else ('USD/shares' if 'USD/shares' in us else list(us)[0])
        xs = [x for x in us[u] if x.get('end') == fim and 'start' in x and 330 <= (dt.date.fromisoformat(x['end']) - dt.date.fromisoformat(x['start'])).days <= 380]
        if xs:
            return max(xs, key=lambda x: x.get('filed', ''))['val']
    return None


def fato(g, tags, anual=True, inst=False):
    """Valor mais recente entre os campos da lista (empresas trocam o nome do campo ao longo dos anos)."""
    melhor = None
    for pri, t in enumerate(tags):
        if t not in g:
            continue
        us = g[t]['units']
        u = 'USD' if 'USD' in us else ('USD/shares' if 'USD/shares' in us else list(us)[0])
        xs = us[u]
        if inst:
            xs = [x for x in xs if x.get('form') in ('10-K', '10-Q') and 'start' not in x]
        else:
            xs = [x for x in xs if x.get('form') == '10-K' and x.get('fp') == 'FY' and 'start' in x and 330 <= (dt.date.fromisoformat(x['end']) - dt.date.fromisoformat(x['start'])).days <= 380]
        if not xs:
            continue
        x = max(xs, key=lambda x: (x['end'], x.get('filed', '')))
        if melhor is None or x['end'] > melhor[1]['end']:
            melhor = (xs, x)
    if melhor is None:
        return (None, None) if inst else (None, None, None)
    xs, x = melhor
    if inst:
        return x['val'], x['end']
    prev = [y for y in xs if (dt.date.fromisoformat(x['end']) - dt.date.fromisoformat(y['end'])).days > 1500]
    pv = max(prev, key=lambda y: y['end']) if prev else None
    return x['val'], x['end'], ((pv['val'], pv['end']) if pv else None)


def cotacoes(ticks):
    """Preço de fechamento por várias fontes: Stooq (em lote), Nasdaq e Yahoo (só se as outras falharem)."""
    px = {}
    for i in range(0, 0, 25):  # Stooq passou a recusar o GitHub; mantido desligado
        lote = ticks[i:i + 25]
        for sep in ('+', ','):
            try:
                r = get('https://stooq.com/q/l/?s=' + sep.join(t.replace('.', '-').lower() + '.us' for t in lote) + '&f=sd2t2c&h&e=csv', 60, tries=2).decode()
                for row in csv.DictReader(io.StringIO(r)):
                    sym = (row.get('Symbol') or '').upper().replace('.US', '').replace('-', '.')
                    c = f(row.get('Close'))
                    if sym and c and c > 0:
                        px[sym] = (c, row.get('Date'))
                if all(t in px for t in lote):
                    break
            except Exception as e:
                print('stooq', e, file=sys.stderr)
    print('stooq', len(px), 'de', len(ticks), file=sys.stderr)
    fal = 0
    for t in [t for t in ticks if t not in px]:
        if fal >= 4:
            break
        try:
            j = json.loads(get(f'https://api.nasdaq.com/api/quote/{t.replace(".", "/")}/info?assetclass=stocks', 30, tries=1))
            c = f(str(j['data']['primaryData']['lastSalePrice']).replace('$', '').replace(',', ''))
            if c and c > 0:
                px[t] = (c, None); fal = 0
        except Exception as e:
            fal += 1
            print('nasdaq', t, e, file=sys.stderr)
        time.sleep(0.3)
    print('com nasdaq', len(px), file=sys.stderr)
    fal = 0
    for t in [t for t in ticks if t not in px]:
        if fal >= 3:
            break
        try:
            y = json.loads(get(f'https://query2.finance.yahoo.com/v8/finance/chart/{t.replace(".", "-")}?range=5d&interval=1d', 30, tries=1))['chart']['result'][0]
            px[t] = (y['meta']['regularMarketPrice'], None); fal = 0
        except Exception as e:
            fal += 1
            print('yahoo', t, e, file=sys.stderr)
        time.sleep(1)
    print('cotações', len(px), 'de', len(ticks), file=sys.stderr)
    return px


def eua():
    t10 = None
    try:
        r = get(f'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{Y}/all?type=daily_treasury_yield_curve&field_tdr_date_value={Y}&page&_format=csv', 120).decode()
        L = list(csv.DictReader(io.StringIO(r)))
        t10 = {'valor': round(float(L[0]['10 Yr']) / 100, 5), 'data': dt.datetime.strptime(L[0]['Date'], '%m/%d/%Y').date().isoformat()}
    except Exception as e:
        print('Treasury', e, file=sys.stderr)
    usd = None
    try:
        v = sgs(1)[-1]
        usd = {'valor': float(v['valor']), 'data': dt.datetime.strptime(v['data'], '%d/%m/%Y').date().isoformat()}
    except Exception as e:
        print('PTAX', e, file=sys.stderr)
    tick = json.loads(get('https://www.sec.gov/files/company_tickers.json', 120, UA_SEC))
    cik = {v['ticker'].upper(): (str(v['cik_str']).zfill(10), v['title']) for v in tick.values()}
    px = cotacoes(EUA)
    out = {}
    for t in EUA:
        if t not in px:
            print('sem cotação', t, file=sys.stderr)
            continue
        k = t.replace('.', '-')
        if k not in cik:
            print('sem CIK', t, file=sys.stderr)
            continue
        try:
            time.sleep(0.15)
            d = json.loads(get(f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik[k][0]}.json', 180, UA_SEC))
            g = d['facts'].get('us-gaap', {})
            ni, fim, ni5 = fato(g, ['NetIncomeLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic', 'ProfitLoss'])
            if not fim or (TODAY - dt.date.fromisoformat(fim)).days > 560:
                print('balanço antigo', t, fim, file=sys.stderr)
                continue
            eps = fato_fim(g, ['EarningsPerShareDiluted', 'EarningsPerShareBasic'], fim)
            op = fato_fim(g, ['OperatingIncomeLoss'], fim)
            da = fato_fim(g, ['DepreciationDepletionAndAmortization', 'DepreciationAmortizationAndAccretionNet', 'DepreciationAndAmortization', 'Depreciation'], fim)
            pl, plend = fato(g, ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'], inst=True)
            nc, _ = fato(g, ['LongTermDebtNoncurrent', 'LongTermDebtAndCapitalLeaseObligations'], inst=True)
            if nc is not None:
                div1 = nc
                div2, _ = fato(g, ['LongTermDebtCurrent', 'DebtCurrent'], inst=True)
            else:
                div1, _ = fato(g, ['LongTermDebt'], inst=True)
                div2 = None
            cp, _ = fato(g, ['CommercialPaper', 'ShortTermBorrowings'], inst=True)
            div2 = (div2 or 0) + (cp or 0)
            plfy = None
            for tg in ('StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'):
                if tg in g:
                    xs = [x for x in g[tg]['units'].get('USD', []) if x.get('end') == fim and 'start' not in x]
                    if xs:
                        plfy = xs[-1]['val']
                        break
            caixa, _ = fato(g, ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'], inst=True)
            sh, _ = fato(d['facts'].get('dei', {}), ['EntityCommonStockSharesOutstanding'], inst=True)
            if not ni or not pl or not eps:
                print('incompleto', t, ni, pl, eps, file=sys.stderr)
                continue
            preco = px[t][0]
            if eps and eps > 0 and preco / eps < 3:
                print('desdobramento provável (P/L < 3), fora até o próximo balanço', t, preco, eps, file=sys.stderr)
                continue
            dps = fato_fim(g, ['CommonStockDividendsPerShareDeclared', 'CommonStockDividendsPerShareCashPaid'], fim)
            dps = round(dps or 0, 4)
            if eps and eps > 0 and dps / eps > 3:
                print('dividendo suspeito', t, dps, eps, file=sys.stderr)
                dps = 0
            hist = []
            if not preco:
                continue
            shares = sh or (ni / eps if eps else None)
            vpa = pl / shares if shares else None
            ebitda = (op + da) if op is not None and da is not None else None
            dl = (div1 or 0) + (div2 or 0) - (caixa or 0)
            anos5 = (dt.date.fromisoformat(fim) - dt.date.fromisoformat(ni5[1])).days / 365.25 if ni5 else 0
            cres5 = ((ni / ni5[0]) ** (1 / anos5) - 1) if ni5 and ni5[0] > 0 and ni > 0 and anos5 >= 3 else None
            out[t] = {
                'nome': cik[k][1].title()[:40], 'preco': round(preco, 2), 'lpa': round(eps, 4), 'vpa': round(vpa, 4) if vpa else None,
                'roe': round(ni / (plfy or pl), 4) if (plfy or pl) > 0 else None, 'payout': round(dps / eps, 4) if eps > 0 else None,
                'dy': round(dps / preco, 4) if preco else 0, 'div_ebitda': None if t in FIN_EUA or not ebitda or ebitda <= 0 else round(dl / ebitda, 2),
                'financeira': t in FIN_EUA, 'cres5a': round(cres5, 4) if cres5 is not None else None, 'balanco': fim, 'hist': hist,
            }
        except Exception as e:
            print('falhou', t, e, file=sys.stderr)
    print('EUA gerados', len(out), file=sys.stderr)
    for t in ('AAPL', 'KO', 'JPM', 'MSFT', 'XOM'):
        print(t, json.dumps(out.get(t)), file=sys.stderr)
    if len(out) < 40:
        raise RuntimeError('poucas empresas EUA')
    return {'acoes': out, 'treasury10': t10, 'dolar': usd, 'fonte': 'SEC (balanços XBRL e dividendos por ação), Stooq/Nasdaq (cotação), U.S. Treasury (juro de 10 anos), Banco Central (PTAX)'}


# ---------------- Notícias (manchetes e links, sem copiar o texto das matérias) ----------------
FEEDS = [
    ('https://news.google.com/rss/search?q=ibovespa+OR+%22bolsa+brasileira%22+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'bolsa'),
    ('https://news.google.com/rss/search?q=selic+OR+copom+OR+ipca+OR+%22tesouro+direto%22+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'juros'),
    ('https://news.google.com/rss/search?q=%22fundos+imobili%C3%A1rios%22+OR+FII+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'fii'),
    ('https://news.google.com/rss/search?q=dividendos+OR+%22proventos%22+a%C3%A7%C3%B5es+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'dividendos'),
    ('https://news.google.com/rss/search?q=%22wall+street%22+OR+%22bolsas+americanas%22+OR+d%C3%B3lar+when:2d&hl=pt-BR&gl=BR&ceid=BR:pt-419', 'mundo'),
    ('https://www.infomoney.com.br/feed/', 'bolsa'),
]

FONTES_OK = ('infomoney', 'valor', 'estad', 'folha de s', 'uol', 'g1', 'globo', 'cnn brasil', 'exame', 'money times', 'investing.com', 'suno', 'seu dinheiro', 'e-investidor', 'bloomberg', 'brazil journal', 'investnews', 'poder360', 'agência brasil', 'agencia brasil', 'veja', 'monitor mercantil', 'fiis', 'clube fii', 'funds explorer', 'mais retorno', 'bp money', 'times brasil', 'cnbc', 'istoé dinheiro', 'istoe dinheiro', 'band', 'metrópoles', 'metropoles', 'o tempo', 'correio braziliense', 'gazeta do povo', 'forbes brasil', 'einvestidor', 'reuters', 'terra', 'r7', 'sbt news', 'jovem pan', 'o povo', 'estado de minas')


def noticias():
    import re, xml.etree.ElementTree as ET
    from email.utils import parsedate_to_datetime
    vistos, out = set(), []
    for url, tema in FEEDS:
        try:
            root = ET.fromstring(get(url, 30, tries=2))
        except Exception as e:
            print('feed', url[:60], e, file=sys.stderr)
            continue
        for it in root.iter('item'):
            tit = (it.findtext('title') or '').strip()
            fonte = (it.findtext('source') or '').strip()
            if ' - ' in tit and (not fonte or tit.endswith(' - ' + fonte)):
                tit, f2 = tit.rsplit(' - ', 1)
                fonte = fonte or f2
            if not fonte and 'infomoney' in url:
                fonte = 'InfoMoney'
            fonte = fonte.split(' - ')[0].strip()
            while ' - ' in tit and len(tit.rsplit(' - ', 1)[1]) < 40:
                tit = tit.rsplit(' - ', 1)[0].strip()
            if not any(k in fonte.lower() for k in FONTES_OK):
                continue
            link = (it.findtext('link') or '').strip()
            try:
                quando = parsedate_to_datetime(it.findtext('pubDate')).astimezone(dt.timezone.utc)
            except Exception:
                continue
            if (dt.datetime.now(dt.timezone.utc) - quando).days > 3 or not tit or not link.startswith('http'):
                continue
            chave = re.sub(r'\W+', '', tit.lower())[:60]
            if chave in vistos:
                continue
            vistos.add(chave)
            tickers = sorted(set(re.findall(r'\b([A-Z]{4}(?:3|4|5|6|11))\b', tit)))
            out.append({'titulo': tit[:160], 'link': link, 'fonte': fonte[:40], 'quando': quando.isoformat(timespec='minutes'), 'tema': tema, 'tickers': tickers})
    out.sort(key=lambda n: n['quando'], reverse=True)
    por = defaultdict(int)
    bal = []
    for n in out:
        por[n['tema']] += 1
        if por[n['tema']] <= 14:
            bal.append(n)
    out = bal
    print('notícias', len(out), file=sys.stderr)
    if len(out) < 5:
        raise RuntimeError('poucas notícias')
    return {'noticias': out[:60], 'fonte': 'Google Notícias e InfoMoney (manchetes e links para as matérias originais)'}


def main():
    import os
    os.makedirs('data', exist_ok=True)
    partes = sys.argv[1:] or ['fiis', 'rf', 'eua']
    for nome, fn in (('fiis', fiis), ('rf', rf), ('eua', eua), ('noticias', noticias)):
        if nome not in partes:
            continue
        try:
            obj = fn()
            obj['gerado'] = dt.datetime.utcnow().isoformat(timespec='minutes') + 'Z'
            salvar(nome + '.json', obj)
        except Exception as e:
            print('PARTE FALHOU, mantendo arquivo anterior:', nome, e, file=sys.stderr)


if __name__ == '__main__':
    main()
