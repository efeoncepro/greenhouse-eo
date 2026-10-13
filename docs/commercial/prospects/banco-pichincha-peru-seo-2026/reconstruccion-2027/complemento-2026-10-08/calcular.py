"""Complemento read-only de fuentes: escenario contrafactual, no forecast bancario.

No compra datos ni modifica modelos previos. Ejecutar con Python 3 estándar.
"""
from pathlib import Path
import csv
import hashlib
import json
import math

D = Path(__file__).resolve().parent
R = D.parent
C = R.parent
inputs_used = {}


def read(p):
    inputs_used[str(p.relative_to(C))] = hashlib.sha256(p.read_bytes()).hexdigest()
    return p.read_text()


def walk(x):
    if isinstance(x, dict):
        if 'keyword' in x and isinstance(x.get('keyword_info'), dict):
            yield x
        for value in x.values():
            yield from walk(value)
    elif isinstance(x, list):
        for value in x:
            yield from walk(value)


panel = list(csv.DictReader(read(C / 'research/pibank-gap-closure-2026-10-06/plan-busquedas.csv').splitlines()))
connections = list(csv.DictReader(read(R / 'conexion-demanda-plan/conexion-familias.csv').splitlines()))
assumptions = json.loads(read(R / 'conexion-demanda-plan/inputs.json'))
previous = json.loads(read(R / 'conexion-demanda-plan/resultados.json'))
ready = {r['family_id']: int(r['ready_month_planned']) for r in connections}
priority = {**ready, 'B01': 4, 'B02': 3, 'B03': 5, 'B04': 5, 'B05': 6, 'E04': 5}
assert len(panel) == 19
histories = {}
for r in panel:
    source = json.loads(read(C / r['source']))
    hits = [x for x in walk(source) if x['keyword'] == r['representative']]
    assert hits, r['family_id']
    candidates = [{v['month']: v['search_volume'] for v in h['keyword_info']['monthly_searches'] if v['year'] == 2026} for h in hits]
    assert all(h == candidates[0] for h in candidates), 'Conflicting duplicate keyword history'
    assert set(candidates[0]) == set(range(1, 9))
    histories[r['family_id']] = candidates[0]

rows = []
summary = []
for calendar, starts in [('original', ready), ('prioridad_propuesta', priority)]:
    for period in ['2027_plano', '2026_contrafactual']:
        for scenario, capture in assumptions['capture_scenarios'].items():
            selected = []
            for month in range(1, 13):
                for family in panel:
                    fid = family['family_id']
                    historical = period == '2026_contrafactual' and month <= 8
                    volume = histories[fid][month] if historical else float(family['estimated_monthly_query_volume'])
                    age = month - starts[fid]
                    maturity = 0 if age < 0 else assumptions['maturity_by_age'][min(age, 6)]
                    visits = volume * capture * maturity
                    row = dict(period=period, calendar=calendar, scenario=scenario, month=month,
                               family=fid, lane=family['lane'], query=family['representative'],
                               search_volume=volume,
                               demand_basis='historical_provider_estimate' if historical else 'flat_snapshot_assumption',
                               ready_month=starts[fid], capture=capture, maturity=maturity,
                               visit_equivalents=visits, openings=visits * .02,
                               funded_lag0=visits * .02 * .65)
                    selected.append(row)
            rows.extend(selected)
            monthly = []
            for month in range(1, 13):
                visits = sum(x['visit_equivalents'] for x in selected if x['month'] == month)
                monthly.append(dict(month=month, visits=visits, openings=visits*.02, funded=visits*.013))
            visits = sum(x['visits'] for x in monthly)
            lag1 = sum(x['funded'] for x in monthly[:-1])
            if period == '2027_plano' and calendar == 'original':
                expected = next(x for x in previous['search_sensitivities'] if x['scenario'] == scenario)
                assert math.isclose(visits, expected['annual_visit_equivalents_test'])
            summary.append(dict(period=period, calendar=calendar, scenario=scenario, visits=visits,
                                openings=visits*.02, funded_lag0=visits*.013,
                                usd_ticket_equivalent=visits*.013*2500,
                                funded_by_december_if_all_fund_next_month=lag1,
                                funded_next_january=monthly[-1]['funded'], monthly=monthly))

with (D / 'detalle-mensual.csv').open('w') as f:
    writer = csv.DictWriter(f, fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
result = dict(as_of='2026-10-08', nature='partial_panel_conditional_simulation_not_bank_forecast_or_incrementality',
              target_funded=15200, ticket_usd=2500, target_usd=38000000,
              historical_coverage='2026-01 through 2026-08, all 19 exact panel representatives',
              missing_history='2026-09 through 2026-12: flat existing snapshot, explicitly assumed',
              retrospective_product_availability='counterfactual assumption from January; not verified launch date',
              opening_rate=.02, funding_rate=.65, lead_rate=None,
              overlap_deduplicated_users=False, traffic_baseline=None,
              whole_program_incremental_forecast=None, provider_calls=0,
              summaries=summary, sources_sha256=inputs_used)
(D / 'resultados.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
for name, sha in inputs_used.items():
    assert hashlib.sha256((C/name).read_bytes()).hexdigest() == sha
print(json.dumps({'checks': 'PASS: exact query history, 19 families, previous annual totals, sources unchanged',
                  'results': [{k:v for k,v in s.items() if k != 'monthly'} for s in summary]}, ensure_ascii=False, indent=2))
