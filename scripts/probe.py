import urllib.request, zipfile, io, json, datetime as dt
def get(u, t=300):
    r = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 eufuturorico-bot'})
    return urllib.request.urlopen(r, timeout=t).read()
for s in (432, 4389, 13522, 12):
    try: print('SGS', s, get(f'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{s}/dados/ultimos/2?formato=json')[:200])
    except Exception as e: print('SGS', s, 'ERR', e)
Y = dt.date.today().year
B = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/'
for kind, yr in (('FCA', Y), ('ITR', Y), ('DFP', Y - 1)):
    k = kind.lower()
    try:
        z = zipfile.ZipFile(io.BytesIO(get(f'{B}{kind}/DADOS/{k}_cia_aberta_{yr}.zip')))
        print(kind, yr, z.namelist()[:40])
        for n in z.namelist():
            if any(x in n for x in ('valor_mobiliario', 'DRE_con', 'DVA_con', 'BPP_con', 'BPA_con', 'composicao_capital', 'DFC_MI_con')) or n == f'{k}_cia_aberta_{yr}.csv':
                txt = z.read(n).decode('latin-1').splitlines()
                print('---', n, len(txt)); print(txt[0])
                for l in [l for l in txt if '33.000.167/0001-01' in l][:16]: print(l[:400])
    except Exception as e: print(kind, 'ERR', e)
try:
    c = get('https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv').decode('latin-1').splitlines()
    print('CAD', c[0]); print([l for l in c if '33.000.167/0001-01' in l][:2])
except Exception as e: print('CAD ERR', e)
d = dt.date.today()
for i in range(0, 8):
    dd = d - dt.timedelta(days=i)
    u = f'https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D{dd:%d%m%Y}.ZIP'
    try:
        z = zipfile.ZipFile(io.BytesIO(get(u))); n = z.namelist()[0]; L = z.read(n).decode('latin-1').splitlines()
        print('COTAHIST', dd, len(L)); print(L[0]); print([l for l in L if l[12:24].strip() in ('PETR4', 'TAEE11', 'ITUB4')])
        break
    except Exception as e: print('COTAHIST', dd, 'ERR', str(e)[:100])
