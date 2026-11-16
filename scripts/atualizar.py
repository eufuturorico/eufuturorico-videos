"""Atualiza data/dados.json com fontes oficiais.

Banco Central (SGS): Selic meta (432), CDI anualizado (4389), IPCA 12 meses (13522).
CVM (dados abertos): FCA (códigos de negociação), ITR/DFP consolidados (lucro, PL, dívida,
EBITDA via DRE+DVA, proventos via DVA, número de ações), cadastro (nome e setor).
B3: arquivo oficial COTAHIST diário (preço de fechamento).
"""
import csv, io, json, re, sys, time, zipfile, datetime as dt, urllib.request
from collections import defaultdict

UA = {'User-Agent': 'Mozilla/5.0 (eufuturorico-bot; +https://github.com/eufuturorico)'}
CVM = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/'
TODAY = dt.date.today()
Y = TODAY.year
OUT = 'data/dados.json'


def get(u, t=600, tries=3):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=t).read()
        except Exception as e:
            print('retry', u, e, file=sys.stderr)
            time.sleep(5 * (i + 1))
    raise RuntimeError('falhou ' + u)


def fnum(s):
    try:
        return float(s)
    except Exception:
        return None


# ---------------- Banco Central ----------------
def sgs(serie):
    d = json.loads(get(f'https://api.bcb.gov.br/dados/serie/bcdata.sgs.{serie}/dados/ultimos/1?formato=json', 60))
    v = d[-1]
    dd = dt.datetime.strptime(v['data'], '%d/%m/%Y').date()
    return float(v['valor']) / 100, min(dd, TODAY).isoformat()


def mercado():
    m = {}
    for k, s in (('selic', 432), ('cdi', 4389), ('ipca12m', 13522)):
        try:
            v, d = sgs(s)
            m[k] = {'valor': round(v, 6), 'data': d, 'fonte': f'Banco Central do Brasil, SGS série {s}'}
        except Exception as e:
            print('SGS falhou', s, e, file=sys.stderr)
    return m


# ---------------- CVM ----------------
def zcvm(kind, yr):
    k = kind.lower()
    try:
        return zipfile.ZipFile(io.BytesIO(get(f'{CVM}DOC/{kind}/DADOS/{k}_cia_aberta_{yr}.zip')))
    except Exception as e:
        print('sem', kind, yr, e, file=sys.stderr)
        return None


def rows(z, name):
    if z is None or name not in z.namelist():
        return
    with z.open(name) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, 'latin-1'), delimiter=';')


def latest_versions(z, kind, yr):
    """{(cnpj, dt_refer): versao máxima} a partir do índice do documento."""
    best = {}
    for r in rows(z, f'{kind.lower()}_cia_aberta_{yr}.csv'):
        k = (r['CNPJ_CIA'], r['DT_REFER'])
        v = int(r['VERSAO'] or 0)
        if v >= best.get(k, -1):
            best[k] = v
    return best


class Doc:
    """Demonstrações de um tipo/ano, só a versão mais recente de cada (cnpj, data)."""

    def __init__(self, kind, yr):
        self.kind, self.yr = kind, yr
        self.z = zcvm(kind, yr)
        self.ver = latest_versions(self.z, kind, yr) if self.z else {}
        self.data = defaultdict(lambda: defaultdict(dict))  # (cnpj,refer) -> stmt -> {(ordem,cd): (ds, val)}
        self.caps = {}
        if not self.z:
            return
        p = f'{kind.lower()}_cia_aberta_'
        for st in ('BPA', 'BPP', 'DRE', 'DVA', 'DFC_MI', 'DFC_MD'):
            for r in rows(self.z, f'{p}{st}_con_{yr}.csv'):
                key = (r['CNPJ_CIA'], r['DT_REFER'])
                if int(r['VERSAO'] or 0) != self.ver.get(key):
                    continue
                if st in ('DRE', 'DVA', 'DFC_MI', 'DFC_MD'):
                    ini, fim = r['DT_INI_EXERC'], r['DT_FIM_EXERC']
                    if not ini or ini[5:] != '01-01' or ini[:4] != fim[:4]:
                        continue  # só acumulado no ano
                sc = 1000.0 if r['ESCALA_MOEDA'].upper().startswith('MIL') else 1.0
                v = fnum(r['VL_CONTA'])
                if v is None:
                    continue
                stn = 'DFC' if st.startswith('DFC') else st
                self.data[key][stn][(r['ORDEM_EXERC'], r['CD_CONTA'])] = (r['DS_CONTA'], v * sc)
        for r in rows(self.z, f'{p}composicao_capital_{yr}.csv'):
            key = (r['CNPJ_CIA'], r['DT_REFER'])
            if int(r['VERSAO'] or 0) != self.ver.get(key):
                continue
            g = lambda c: fnum(r.get(c)) or 0
            self.caps[key] = {'on': g('QT_ACAO_ORDIN_CAP_INTEGR') - g('QT_ACAO_ORDIN_TESOURO'),
                              'pn': g('QT_ACAO_PREF_CAP_INTEGR') - g('QT_ACAO_PREF_TESOURO')}
        print(kind, yr, 'empresas', len({k[0] for k in self.data}), file=sys.stderr)


def depth(cd):
    return cd.count('.') + 1


def find(stmt, ordem, code=None, ds=None, prefix=None, d=None):
    """Soma das contas que batem (sem contar pai e filho juntos)."""
    hits = []
    for (o, cd), (name, v) in stmt.items():
        if o != ordem:
            continue
        if code and cd != code:
            continue
        if prefix and not cd.startswith(prefix):
            continue
        if d and depth(cd) != d:
            continue
        if ds and not re.search(ds, name, re.I):
            continue
        hits.append((cd, v))
    hits.sort()
    keep = [h for h in hits if not any(h[0] != o[0] and h[0].startswith(o[0] + '.') for o in hits)]
    return sum(v for _, v in keep) if keep else None


def lucro(dre, o):
    v = find(dre, o, ds=r'atribu[íi]do.*(s[óo]cios|acionistas).*controladora')
    if v is None:
        v = find(dre, o, code='3.11')
    if v is None:
        v = find(dre, o, ds=r'^lucro.*(l[íi]quido|preju[íi]zo).*per[íi]odo', d=2)
    return v


def flows(doc, cnpj, refer, o):
    st = doc.data[(cnpj, refer)]
    dre, dva, dfc = st.get('DRE', {}), st.get('DVA', {}), st.get('DFC', {})
    ebit = find(dre, o, code='3.05')
    if ebit is not None and not re.search(r'antes do resultado financeiro', next((n for (oo, cd), (n, _) in dre.items() if cd == '3.05'), ''), re.I):
        ebit = None
    da = find(dva, o, ds=r'deprecia[çc][ãa]o.*amortiza', d=3)
    if da is None:
        da = find(dfc, o, ds=r'deprecia[çc][ãa]o|amortiza[çc][ãa]o|exaust', prefix='6.01')
    prov = find(dva, o, ds=r'^(juros sobre( o)? capital pr[óo]prio|dividendos)$')
    return {'lucro': lucro(dre, o), 'ebit': ebit, 'da': abs(da) if da is not None else None,
            'prov': abs(prov) if prov is not None else 0.0}


def stocks(doc, cnpj, refer):
    st = doc.data[(cnpj, refer)]
    bpa, bpp = st.get('BPA', {}), st.get('BPP', {})
    o = 'ÚLTIMO'
    pl = find(bpp, o, ds=r'^patrim[ôo]nio l[íi]quido', d=2)
    nc = find(bpp, o, ds=r'n[ãa]o controladores', prefix='2.0')
    if pl is not None and nc is not None and abs(nc) < abs(pl):
        pl -= nc
    divida = find(bpp, o, ds=r'^empr[ée]stimos e financiamentos$', d=3) or 0.0
    caixa = (find(bpa, o, code='1.01.01') or 0.0) + (find(bpa, o, ds=r'^aplica[çc][õo]es financeiras', prefix='1.01', d=3) or 0.0)
    return {'pl': pl, 'divida': divida, 'caixa': caixa}


def add(a, b, c):
    if a is None or b is None or c is None:
        return None
    return a + b - c


# ---------------- B3 ----------------
def cotacoes():
    for i in range(0, 10):
        dd = TODAY - dt.timedelta(days=i)
        if dd.weekday() >= 5:
            continue
        try:
            z = zipfile.ZipFile(io.BytesIO(get(f'https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D{dd:%d%m%Y}.ZIP', 120, 1)))
        except Exception:
            continue
        P = {}
        for l in z.read(z.namelist()[0]).decode('latin-1').splitlines():
            if l[:2] != '01' or l[24:27] != '010' or l[10:12] not in ('02', '12'):
                continue
            cod = l[12:24].strip()
            P[cod] = {'preco': int(l[108:121]) / 100, 'volume': int(l[170:188]) / 100, 'esp': l[39:49].strip(), 'nome': l[27:39].strip()}
        if P:
            return P, dd.isoformat()
    raise RuntimeError('sem COTAHIST recente')


def main():
    global DOCS
    out = {'atualizado': dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%MZ'), 'mercado': mercado(), 'acoes': {}, 'fontes': [
        'Banco Central do Brasil (SGS): Selic, CDI e IPCA',
        'CVM, dados abertos de companhias abertas (ITR, DFP, FCA, cadastro)',
        'B3, cotações históricas oficiais (COTAHIST)']}
    try:
        P, pdate = cotacoes()
        out['data_cotacao'] = pdate
        print('cotações', len(P), pdate, file=sys.stderr)
    except Exception as e:
        print('B3 falhou', e, file=sys.stderr)
        P, pdate = {}, None

    early = TODAY.month <= 5
    DOCS = [Doc('ITR', Y), Doc('DFP', Y - 1)] + ([Doc('ITR', Y - 1), Doc('DFP', Y - 2)] if early else [])
    dfp = {d.yr: d for d in DOCS if d.kind == 'DFP' and d.z}
    itr = {d.yr: d for d in DOCS if d.kind == 'ITR' and d.z}

    cad = {}
    try:
        for r in csv.DictReader(io.StringIO(get(CVM + 'CAD/DADOS/cad_cia_aberta.csv').decode('latin-1')), delimiter=';'):
            if r['SIT'] == 'ATIVO':
                cad[r['CNPJ_CIA']] = {'nome': (r['DENOM_COMERC'] or r['DENOM_SOCIAL']).strip().title(), 'setor': r['SETOR_ATIV'].strip()}
    except Exception as e:
        print('cadastro falhou', e, file=sys.stderr)

    tick = defaultdict(list)  # cnpj -> [(codigo, classe, comp)]
    for yr in (Y, Y - 1):
        z = zcvm('FCA', yr)
        if not z:
            continue
        for r in rows(z, f'fca_cia_aberta_valor_mobiliario_{yr}.csv'):
            c = (r.get('Codigo_Negociacao') or '').strip().upper()
            if not c or r.get('Mercado', '').strip() != 'Bolsa' or (r.get('Data_Fim_Negociacao') or '').strip():
                continue
            vm = r.get('Valor_Mobiliario', '')
            cls = 'ON' if 'Ordin' in vm else 'PN' if 'Prefer' in vm else 'UNIT' if 'Unit' in vm or 'Certificado' in vm else None
            if cls and c not in [t[0] for t in tick[r['CNPJ_Companhia']]]:
                tick[r['CNPJ_Companhia']].append((c, cls, r.get('Composicao_BDR_Unit', '')))
        if tick:
            break
    print('empresas com código', len(tick), file=sys.stderr)

    for cnpj, tl in tick.items():
        # documento mais recente
        cands = []
        for d in DOCS:
            if not d.z:
                continue
            for k in d.data:
                if k[0] == cnpj:
                    cands.append((k[1], d.kind == 'DFP', d))
        if not cands:
            continue
        refer, isdfp, doc = max(cands, key=lambda t: (t[0], t[1]))
        if isdfp:
            f = flows(doc, cnpj, refer, 'ÚLTIMO')
            per = f'4T{refer[2:4]}'
        else:
            cur, prev = flows(doc, cnpj, refer, 'ÚLTIMO'), flows(doc, cnpj, refer, 'PENÚLTIMO')
            fy_doc = dfp.get(int(refer[:4]) - 1)
            fy_ref = f'{int(refer[:4]) - 1}-12-31'
            if not fy_doc or (cnpj, fy_ref) not in fy_doc.data:
                continue
            fy = flows(fy_doc, cnpj, fy_ref, 'ÚLTIMO')
            f = {k: add(cur[k], fy[k], prev[k]) for k in cur}
            per = f'{(int(refer[5:7]) // 3)}T{refer[2:4]}'
        s = stocks(doc, cnpj, refer)
        cap = doc.caps.get((cnpj, refer)) or next((d.caps[(cnpj, r)] for d in DOCS for r in sorted({k[1] for k in d.caps if k[0] == cnpj}, reverse=True)[:1]), None)
        if not cap or (cap['on'] + cap['pn']) <= 0 or not f.get('lucro') or not s.get('pl'):
            continue
        info = cad.get(cnpj, {})
        fin = bool(re.search(r'banco|intermedia|segur|financ|previd|arrendamento|cr[ée]dito', info.get('setor', ''), re.I)) or f['ebit'] is None
        # valor de mercado com as classes negociadas
        pon = next((P[c]['preco'] for c, k, _ in tl if k == 'ON' and c in P), None)
        ppn = next((P[c]['preco'] for c, k, _ in tl if k == 'PN' and c in P), None)
        if pon is None and ppn is None:
            u = next(((c, comp) for c, k, comp in tl if k == 'UNIT' and c in P), None)
            if not u:
                continue
            n = sum(int(x) for x in re.findall(r'\d+', u[1])) or None
            if not n:
                continue
            pon = ppn = P[u[0]]['preco'] / n
        pon = pon if pon is not None else ppn
        ppn = ppn if ppn is not None else pon
        mcap = pon * cap['on'] + ppn * cap['pn']
        shares = cap['on'] + cap['pn']
        ebitda = (f['ebit'] + f['da']) if (f['ebit'] is not None and f['da'] is not None) else None
        base = {
            'nome': info.get('nome') or '', 'setor': info.get('setor') or '', 'periodo': per, 'balanco': refer,
            'financeira': fin,
            'roe': round(f['lucro'] / s['pl'], 4) if s['pl'] > 0 else None,
            'payout': round(f['prov'] / f['lucro'], 4) if f['lucro'] > 0 else None,
            'dy': round(f['prov'] / mcap, 4) if mcap > 0 else None,
            'div_ebitda': None if fin or not ebitda or ebitda <= 0 else round((s['divida'] - s['caixa']) / ebitda, 2),
            'lucro_12m': round(f['lucro']), 'pl': round(s['pl']), 'valor_mercado': round(mcap), 'acoes': round(shares),
        }
        for c, k, comp in tl:
            if c not in P:
                continue
            p = P[c]['preco']
            # LPA e VPA "por papel": proporcionais ao preço do papel, para P/L e P/VP baterem com o valor de mercado
            out['acoes'][c] = {**base, 'preco': p, 'lpa': round(p * f['lucro'] / mcap, 4), 'vpa': round(p * s['pl'] / mcap, 4),
                               'volume': round(P[c]['volume']), 'classe': k}
    print('ações geradas', len(out['acoes']), file=sys.stderr)
    import os
    os.makedirs('data', exist_ok=True)
    if len(out['acoes']) < 50 and not out['mercado']:
        print('poucos dados, mantendo arquivo anterior', file=sys.stderr)
        sys.exit(1)
    try:
        old = json.load(open(OUT))
        if len(out['acoes']) < 50:
            out['acoes'] = old.get('acoes', {})
            out['data_cotacao'] = old.get('data_cotacao')
        for k, v in old.get('mercado', {}).items():
            out['mercado'].setdefault(k, v)
    except Exception:
        pass
    json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    for t in ('PETR4', 'VALE3', 'ITUB4', 'BBAS3', 'TAEE11', 'WEGE3', 'BBSE3', 'ITSA4', 'CURY3', 'PSSA3', 'VBBR3'):
        print(t, json.dumps(out['acoes'].get(t), ensure_ascii=False))
    print('mercado', out['mercado'])


if __name__ == '__main__':
    main()
