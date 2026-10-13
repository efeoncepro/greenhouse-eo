"""Estimación autorizada con hipótesis: SEO/AEO, conversión y umbral de meta.
No contiene compra de medios. No altera modelos anteriores. Python stdlib.
"""
from pathlib import Path
import csv
import hashlib
import json
import math

D = Path(__file__).resolve().parent
R = D.parent
C = R.parent
HASHES = {}

def read(path):
    HASHES[str(path.relative_to(C))] = hashlib.sha256(path.read_bytes()).hexdigest()
    return path.read_text()

def walk(obj):
    if isinstance(obj, dict):
        if 'keyword' in obj and isinstance(obj.get('keyword_info'), dict):
            yield obj
        for value in obj.values():
            yield from walk(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from walk(value)

dataset = json.loads(read(C / 'research/pibank-expanded-2026-10-06/keyword-dataset.json'))
km = {k['keyword']: k for k in dataset['keywords']}
prior = list(csv.DictReader(read(R / 'demanda-audiencia-2026-10-08/panel.csv').splitlines()))
panel = []
for row in prior:
    panel.append(dict(id=row['id'], query=row['query'], ready=int(row['ready']),
                      monthly=float(row['monthly']), source=row['source'],
                      months=[float(row[f'2026_{m:02}']) for m in range(1, 13)]))

# Investigación existente: no se importa ni ejecuta el modelo de medios rechazado.
extra = [
    ('crear cuenta bcp',4), ('apertura de cuenta bbva',6), ('abrir cuenta interbank',3),
    ('abrir cuenta scotiabank',5), ('cuenta digital bcp',4), ('cuenta digital interbank',3),
    ('cuenta de ahorros interbank',3), ('cuenta de ahorros bbva',6), ('cuenta de ahorros scotiabank',5),
    ('cuenta premio bcp',4), ('cuenta free scotiabank',5), ('cuenta digital caja arequipa',7),
    ('caja huancayo cuenta de ahorros',7), ('cuenta de ahorros falabella',7),
    ('mibanco cuenta de ahorros',7), ('cuenta de ahorros banco de la nación',7),
    ('caja cusco cuenta de ahorros',7), ('cuenta sueldo bcp',8), ('cuenta sueldo bbva',8),
    ('cuenta sueldo interbank',8), ('cuenta sueldo scotiabank',8), ('cuenta bancaria',2),
    ('ahorro',3), ('plan de ahorro',4), ('que banco paga mas intereses',3),
    ('depósito a plazo fijo simulador',6), ('depósito a plazo fijo bcp',6),
    ('deposito a plazo fijo interbank',6), ('deposito a plazo fijo bbva',6),
    ('sbs tasas de interés de bancos y cajas',3),
]
for index, (query, ready) in enumerate(extra, 1):
    k = km[query]
    hist = {x['month']: x['search_volume'] for x in k['monthly_searches'] if x['year'] == 2026}
    assert all(m in hist for m in range(1, 9)), query
    panel.append(dict(id=f'Y{index:02}', query=query, ready=ready,
                      monthly=k['search_volume'], source='research/' + k['source'],
                      months=[hist[m] if m <= 8 else k['search_volume'] for m in range(1, 13)]))

# Verificación independiente de todos los valores contra la respuesta cruda.
cache = {}
for row in panel:
    src = C / row['source']
    if row['query'] in km:
        src = C / 'research' / km[row['query']]['source']
    if src not in cache:
        cache[src] = list(walk(json.loads(read(src))))
    raw = next(x['keyword_info'] for x in cache[src] if x['keyword'] == row['query'])
    assert raw['search_volume'] == row['monthly'], row['query']
    hist = {x['month']: x['search_volume'] for x in raw['monthly_searches'] if x['year'] == 2026}
    assert all(hist[m] == row['months'][m-1] for m in range(1,9)), row['query']
    row['source'] = str(src.relative_to(C))

MATURITY = [.10, .20, .35, .50, .65, .80, 1.0]
CASES = {
    'prudente': dict(capture=.02, opening=[.02]*4, funding=[.65]*4),
    'central': dict(capture=.05, opening=[.02,.021,.022,.023], funding=[.65,.67,.69,.70]),
    'favorable': dict(capture=.10, opening=[.02,.024,.028,.03], funding=[.65,.70,.725,.75]),
}
OVERLAP = ['cuenta digital bcp','cuenta digital interbank','cuenta de ahorros interbank',
           'cuenta de ahorros bbva','cuenta de ahorros scotiabank','plan de ahorro',
           'que banco paga mas intereses']
GOAL = 15200
BASE_RATE = .02*.65

def calc(case, other_visits=0, drop_overlap=False, conversion_scale=1, timing='uniforme', lag=.2):
    weights = [1/12]*12 if timing == 'uniforme' else [m/78 for m in range(1,13)]
    rows = []
    previous = 0
    for month in range(1,13):
        q = (month-1)//3
        opening = case['opening'][q]*conversion_scale
        funding = case['funding'][q]
        calendar_factor = 1 if month < 12 else 1-lag
        visits = 0
        for row in panel:
            if drop_overlap and row['query'] in OVERLAP:
                continue
            age = month-row['ready']
            if age >= 0:
                visits += row['months'][month-1]*case['capture']*MATURITY[min(age,6)]
        # 2 campañas: 12 pitches * 15% publicación * 10k lecturas * .5% clic;
        # 2 refuerzos: 10 oportunidades * 10% publicación * 5k lecturas * .5% clic.
        # Hipótesis operativas, no audiencia comprometida por medios.
        pr = 90 if month in [3,8] else (25 if month in [6,11] else 0)
        other = other_visits*weights[month-1]
        organic_open = visits*opening
        pr_open = pr*opening
        other_open = other*opening
        direct = (organic_open+pr_open)*funding*calendar_factor
        base = other*BASE_RATE*calendar_factor
        enhanced = other_open*funding*calendar_factor
        cohort_eventual = (organic_open+pr_open+other_open)*funding
        calendar_funded = cohort_eventual*(1-lag)+previous*lag
        previous = cohort_eventual
        rows.append(dict(month=month,organic_visits=visits,pr_referral_visits=pr,
                         other_eligible_visits=other,opening_rate=opening,funding_rate=funding,
                         organic_openings=organic_open,organic_funded_year=organic_open*funding*calendar_factor,
                         pr_funded_year=pr_open*funding*calendar_factor,
                         direct_funded_year=direct,other_baseline_funded_year=base,
                         other_conversion_gain=enhanced-base,other_funded_year=enhanced,
                         total_openings=organic_open+pr_open+other_open,
                         funded_year=direct+enhanced,funded_calendar_month=calendar_funded,
                         funded_next_year=cohort_eventual*(1-calendar_factor)))
    sums = ['organic_visits','pr_referral_visits','other_eligible_visits','organic_openings',
            'organic_funded_year','pr_funded_year','direct_funded_year','other_baseline_funded_year',
            'other_conversion_gain','other_funded_year','total_openings','funded_year',
            'funded_calendar_month','funded_next_year']
    total = {k:sum(x[k] for x in rows) for k in sums}
    total['program_contribution_conditional'] = total['direct_funded_year']+total['other_conversion_gain']
    total['deposit_equivalent_usd'] = total['funded_year']*2500
    assert math.isclose(total['funded_year'], total['funded_calendar_month'])
    assert math.isclose(total['other_baseline_funded_year']+total['program_contribution_conditional'],total['funded_year'])
    return dict(total=total, monthly=rows)

results = {}
for name, case in CASES.items():
    direct = calc(case)
    unit = calc(case,100000)
    rate = unit['total']['other_funded_year']/100000
    required = (GOAL-direct['total']['direct_funded_year'])/rate
    goal = calc(case,required)
    assert math.isclose(goal['total']['funded_year'], GOAL)
    results[name] = dict(assumptions=case,direct=direct,per_100k_other=unit,
                        required_other_visits=required,goal_bridge=goal,
                        traffic_sensitivities={str(v):calc(case,v)['total'] for v in [100000,250000,500000,750000,1000000]})

central = results['central']
stress = {
    'seven_ambiguous_query_variants_removed':calc(CASES['central'],drop_overlap=True)['total'],
    'opening_rates_minus25pct':calc(CASES['central'],conversion_scale=.75)['total'],
    'funding_lag_all_next_month':calc(CASES['central'],lag=1)['total'],
    'other_500k_ramp_not_uniform':calc(CASES['central'],500000,timing='rampa')['total'],
    'original_2pct_65pct_same_organic_panel_no_lag':calc(CASES['prudente']|{'capture':.05},lag=0)['total'],
}
audience_src=C/'research/pibank-integrated-2026-10-08/audience-provider.json'
audience=[]
for item in walk(json.loads(read(audience_src))):
    cs=item.get('clickstream_keyword_info')
    if cs and item['keyword']!='cuenta de ahorros':
        a=cs['age_distribution']
        audience.append(dict(query=item['keyword'],share_35_54=sum(a.get(k) or 0 for k in ['35-44','45-54'])/100,
                             sample_volume=cs['search_volume'],nse=None))

assert len(panel)==len({r['query'] for r in panel})==63
assert sum(r['monthly'] for r in panel)==140130
assert math.isclose(central['direct']['total']['organic_visits'],33670.225)
output=dict(as_of='2026-10-08',status='planning_estimate_authorized_by_operator_not_bank_observation',
            period='counterfactual_jan_dec_2026',goal=GOAL,ticket_usd=2500,
            query_count=len(panel),monthly_query_volume=sum(r['monthly'] for r in panel),
            annual_query_volume=sum(sum(r['months']) for r in panel),
            maturity=MATURITY,funding_lag_next_month=.2,results=results,stress=stress,
            audience=audience,inputs_sha256=HASHES)
(D/'resultados.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
for name, rows in [('panel.csv',[{k:v for k,v in r.items() if k!='months'} | {f'2026_{i+1:02}':v for i,v in enumerate(r['months'])} for r in panel]),
                   ('central-mensual.csv',central['direct']['monthly']),
                   ('puente-meta-mensual.csv',central['goal_bridge']['monthly'])]:
    with (D/name).open('w') as file:
        writer=csv.DictWriter(file,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
for path,sha in HASHES.items():
    assert hashlib.sha256((C/path).read_bytes()).hexdigest()==sha
print(json.dumps({name:dict(direct=r['direct']['total'],required_other_visits=r['required_other_visits'],
                           gain_per100k=r['per_100k_other']['total']['other_conversion_gain'],
                           goal_contribution=r['goal_bridge']['total']['program_contribution_conditional'])
                  for name,r in results.items()},ensure_ascii=False,indent=2))
