import urllib.request, zipfile, io, datetime as dt
def get(u, t=300):
    return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 eufuturorico-bot'}), timeout=t).read()
Y = dt.date.today().year
for yr in (Y, Y - 1, Y - 2):
    z = zipfile.ZipFile(io.BytesIO(get(f'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/FCA/DADOS/fca_cia_aberta_{yr}.zip')))
    t = z.read(f'fca_cia_aberta_valor_mobiliario_{yr}.csv').decode('latin-1').splitlines()
    print('---', yr, t[0])
    for l in t:
        if any(x in l for x in ('CSNA3', 'BPAC11', 'CMIN3', 'STBP3', 'CEAB3', 'MBRF3', 'TRPL4')): print(l[:420])
