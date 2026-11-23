"""Inspeção das fontes (2ª rodada): só imprime; não grava nada."""
import csv, io, json, sys, zipfile, datetime as dt, urllib.request, time

Y = dt.date.today().year


def get(u, t=300, ua='EuFuturoRico eufuturorico@users.noreply.github.com'):
    h = {'User-Agent': ua, 'Accept-Encoding': 'identity'}
    return urllib.request.urlopen(urllib.request.Request(u, headers=h), timeout=t).read()


def sec(t):
    print('\n==========', t, '==========', flush=True)


try:
    sec('FII: MXRF11, HGLG11, KNCR11, XPML11 nos informes da CVM')
    alvo = {'MXRF11': 'BRMXRFCTF002', 'HGLG11': 'BRHGLGCTF004', 'KNCR11': 'BRKNCRCTF000', 'XPML11': 'BRXPMLCTF000'}
    cnpj = {}
    for yr in (Y - 1, Y):
        z = zipfile.ZipFile(io.BytesIO(get(f'https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_{yr}.zip')))
        g = list(csv.DictReader(io.StringIO(z.read(f'inf_mensal_fii_geral_{yr}.csv').decode('latin-1')), delimiter=';'))
        for r in g:
            for t, isin in alvo.items():
                if r['Codigo_ISIN'] == isin:
                    cnpj[r['CNPJ_Fundo_Classe']] = (t, r['Segmento_Atuacao'], r['Mandato'], r['Tipo_Gestao'])
        c = list(csv.DictReader(io.StringIO(z.read(f'inf_mensal_fii_complemento_{yr}.csv').decode('latin-1')), delimiter=';'))
        for r in c:
            if r['CNPJ_Fundo_Classe'] in cnpj:
                print(yr, cnpj[r['CNPJ_Fundo_Classe']], r['Data_Referencia'], 'v', r['Versao'], 'VP', r['Valor_Patrimonial_Cotas'], 'DYm', r['Percentual_Dividend_Yield_Mes'],
                      'RentEf', r['Percentual_Rentabilidade_Efetiva_Mes'], 'cotistas', r['Total_Numero_Cotistas'], 'PL', r['Patrimonio_Liquido'])
    print('ISINs no geral sem ticker? total linhas', len(g))
except Exception as e:
    print('ERRO FII', e)

for u in ['https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv',
          'https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json']:
    try:
        sec('Tesouro ' + u[:70])
        r = get(u, 300, 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36').decode('latin-1')
        L = r.splitlines()
        print(len(r), 'bytes', L[0][:300])
        for l in L[-4:]:
            print(l[:300])
    except Exception as e:
        print('ERRO', e)

for k in range(0, 6):
    d = dt.date.today() - dt.timedelta(days=k)
    if d.weekday() >= 5:
        continue
    u = f'https://www.anbima.com.br/informacoes/merc-sec/arqs/ms{d:%y%m%d}.txt'
    try:
        sec('ANBIMA ' + u)
        r = get(u, 120, 'Mozilla/5.0').decode('latin-1')
        L = r.splitlines()
        print(len(L), 'linhas')
        for l in L[:3] + [x for x in L if x.startswith(('NTN-B', 'LTN', 'LFT', 'NTN-F'))][:8]:
            print(l[:250])
        break
    except Exception as e:
        print('ERRO', e)

for ua in ['EuFuturoRico eufuturorico@users.noreply.github.com', 'Eu Futuro Rico admin@eufuturorico.netlify.app']:
    try:
        sec('SEC com UA ' + ua)
        d = json.loads(get('https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json', 120, ua))
        g = d['facts']['us-gaap']
        for k in ['NetIncomeLoss', 'StockholdersEquity', 'EarningsPerShareDiluted', 'LongTermDebt', 'LongTermDebtNoncurrent', 'CashAndCashEquivalentsAtCarryingValue',
                  'OperatingIncomeLoss', 'DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'PaymentsOfDividends', 'PaymentsOfDividendsCommonStock',
                  'CommonStockDividendsPerShareDeclared', 'WeightedAverageNumberOfDilutedSharesOutstanding']:
            if k in g:
                u = list(g[k]['units'].keys())[0]
                v = [x for x in g[k]['units'][u] if x.get('form') == '10-K' and x.get('fp') == 'FY'][-2:]
                q = [x for x in g[k]['units'][u] if x.get('form') == '10-Q'][-2:]
                print(k, u, [(x.get('fy'), x.get('start'), x.get('end'), x.get('val')) for x in v], 'Q:', [(x.get('start'), x.get('end'), x.get('val')) for x in q])
            else:
                print(k, 'AUSENTE')
        t = json.loads(get('https://www.sec.gov/files/company_tickers.json', 120, ua))
        print('tickers SEC', len(t), list(t.values())[:3])
        break
    except Exception as e:
        print('ERRO SEC', e)
    time.sleep(2)

try:
    sec('Yahoo: 3 símbolos e dados de dividendos')
    for s in ['MSFT', 'KO', 'JNJ']:
        d = json.loads(get(f'https://query1.finance.yahoo.com/v8/finance/chart/{s}?range=1y&interval=1mo&events=div', 60, 'Mozilla/5.0'))
        r = d['chart']['result'][0]
        dv = r.get('events', {}).get('dividends', {})
        print(s, r['meta'].get('regularMarketPrice'), r['meta'].get('longName'), 'dividendos 12m', round(sum(x['amount'] for x in dv.values()), 4), len(dv))
except Exception as e:
    print('ERRO Yahoo', e)
