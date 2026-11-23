"""Inspeção das fontes de FIIs, Tesouro Direto e EUA (só imprime; não grava nada)."""
import csv, io, json, sys, zipfile, datetime as dt, urllib.request

UA = {'User-Agent': 'eufuturorico-bot contato eufuturorico@users.noreply.github.com'}
Y = dt.date.today().year


def get(u, t=300):
    return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read()


def sec(titulo):
    print('\n==========', titulo, '==========', flush=True)


try:
    sec('CVM FII informe mensal')
    z = zipfile.ZipFile(io.BytesIO(get(f'https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_{Y}.zip')))
    for n in z.namelist():
        t = z.read(n).decode('latin-1').splitlines()
        print('--', n, len(t), 'linhas')
        print(t[0][:1500])
        for l in t[1:3]:
            print(l[:1500])
except Exception as e:
    print('ERRO FII', e)

try:
    sec('CVM FII informe trimestral (lista de arquivos)')
    z = zipfile.ZipFile(io.BytesIO(get(f'https://dados.cvm.gov.br/dados/FII/DOC/INF_TRIMESTRAL/DADOS/inf_trimestral_fii_{Y}.zip')))
    for n in z.namelist():
        t = z.read(n).decode('latin-1').splitlines()
        print('--', n, len(t), 'linhas |', t[0][:400])
except Exception as e:
    print('ERRO FII trimestral', e)

try:
    sec('B3 COTAHIST: FIIs com ISIN')
    for i in range(0, 8):
        d = dt.date.today() - dt.timedelta(days=i)
        if d.weekday() >= 5:
            continue
        try:
            z = zipfile.ZipFile(io.BytesIO(get(f'https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D{d:%d%m%Y}.ZIP', 120)))
        except Exception:
            continue
        n = 0
        for l in z.read(z.namelist()[0]).decode('latin-1').splitlines():
            if l[:2] == '01' and l[10:12] == '12' and l[24:27] == '010':
                n += 1
                if n <= 5:
                    print(l[12:24].strip(), '|', l[27:39].strip(), '|', l[39:49].strip(), '| preco', int(l[108:121]) / 100, '| isin', l[230:242], '| vol', int(l[170:188]) / 100)
        print('FIIs no dia', d, n)
        break
except Exception as e:
    print('ERRO COTAHIST', e)

try:
    sec('Tesouro Direto')
    raw = get('https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv', 300)
    t = raw.decode('latin-1').splitlines()
    print(len(t), 'linhas', len(raw) // 1024, 'KB')
    print(t[0])
    for l in t[1:4] + t[-3:]:
        print(l)
except Exception as e:
    print('ERRO Tesouro', e)

try:
    sec('SEC companyfacts AAPL')
    d = json.loads(get('https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json'))
    g = d['facts']['us-gaap']
    for k in ['NetIncomeLoss', 'StockholdersEquity', 'EarningsPerShareDiluted', 'LongTermDebt', 'LongTermDebtNoncurrent', 'CashAndCashEquivalentsAtCarryingValue',
              'OperatingIncomeLoss', 'DepreciationDepletionAndAmortization', 'DepreciationAndAmortization', 'PaymentsOfDividends', 'PaymentsOfDividendsCommonStock',
              'CommonStockDividendsPerShareDeclared', 'Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'WeightedAverageNumberOfDilutedSharesOutstanding']:
        if k in g:
            u = list(g[k]['units'].keys())[0]
            v = [x for x in g[k]['units'][u] if x.get('form') == '10-K' and x.get('fp') == 'FY'][-2:]
            print(k, u, [(x.get('fy'), x.get('end'), x.get('val'), x.get('frame')) for x in v])
        else:
            print(k, 'AUSENTE')
    print('dei shares', [(x.get('end'), x.get('val')) for x in d['facts']['dei']['EntityCommonStockSharesOutstanding']['units']['shares'][-2:]])
    t = json.loads(get('https://www.sec.gov/files/company_tickers.json'))
    print('tickers SEC', len(t), list(t.values())[:3])
except Exception as e:
    print('ERRO SEC', e)

for u in ['https://stooq.com/q/d/l/?s=aapl.us&i=d', 'https://stooq.com/q/l/?s=aapl.us+msft.us&f=sd2t2ohlcv&h&e=csv',
          'https://query1.finance.yahoo.com/v8/finance/chart/AAPL?range=5d&interval=1d']:
    try:
        sec('Cotação ' + u)
        r = get(u, 60).decode('utf-8', 'replace')
        print(r[:600], '...', r[-300:])
    except Exception as e:
        print('ERRO', e)

try:
    sec('Treasury 10 anos')
    r = get(f'https://home.treasury.gov/resource-center/data-chart-center/interest-rates/daily-treasury-rates.csv/{Y}/all?type=daily_treasury_yield_curve&field_tdr_date_value={Y}&page&_format=csv', 120).decode()
    print('\n'.join(r.splitlines()[:3]))
except Exception as e:
    print('ERRO Treasury', e)

try:
    sec('PTAX dólar (SGS 1)')
    print(get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json', 60).decode())
    print('IPCA 12m e IMA? (SGS 433 ipca mensal)', get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados/ultimos/2?formato=json', 60).decode())
except Exception as e:
    print('ERRO PTAX', e)
