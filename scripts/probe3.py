import urllib.request, zipfile, io, datetime as dt, re
def get(u, t=300):
    return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0 eufuturorico-bot'}), timeout=t).read()
Y = dt.date.today().year
B = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/'
CN = '89.637.490/0001-45'
for kind, yr in (('ITR', Y), ('DFP', Y - 1), ('ITR', Y - 1)):
    z = zipfile.ZipFile(io.BytesIO(get(f'{B}{kind}/DADOS/{kind.lower()}_cia_aberta_{yr}.zip')))
    for n in z.namelist():
        if ('DVA_con' in n or 'DFC_MI_con' in n):
            t = z.read(n).decode('latin-1').splitlines(); print('---', n)
            for l in t:
                if CN in l and re.search(r'ividend|apital Pr|6\.03', l, re.I): print(l[:330])
