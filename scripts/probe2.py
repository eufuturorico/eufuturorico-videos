import urllib.request, zipfile, io, datetime as dt
def get(u, t=300):
    return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 eufuturorico-bot'}), timeout=t).read()
Y = dt.date.today().year
B = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/'
CN = '89.637.490/0001-45'
for kind, yr in (('FCA', Y), ('ITR', Y)):
    z = zipfile.ZipFile(io.BytesIO(get(f'{B}{kind}/DADOS/{kind.lower()}_cia_aberta_{yr}.zip')))
    for n in z.namelist():
        if 'valor_mobiliario' in n or 'composicao_capital' in n:
            t = z.read(n).decode('latin-1').splitlines(); print('---', n); print(t[0])
            for l in [l for l in t if CN in l][-12:]: print(l[:500])
d = dt.date.today()
for i in range(1, 6):
    dd = d - dt.timedelta(days=i)
    try:
        z = zipfile.ZipFile(io.BytesIO(get(f'https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D{dd:%d%m%Y}.ZIP')))
        for l in z.read(z.namelist()[0]).decode('latin-1').splitlines():
            if 'KLBN' in l[12:24]: print(repr(l[:60]), l[108:121], l[170:188])
        break
    except Exception as e: print('err', e)
