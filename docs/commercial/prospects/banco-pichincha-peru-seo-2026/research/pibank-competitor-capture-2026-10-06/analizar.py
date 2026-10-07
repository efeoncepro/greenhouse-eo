"""Investigación exploratoria reproducible; consume capturas pagadas existentes.

No llama APIs, no utiliza ETV, no modifica evidencia histórica.
"""
from pathlib import Path
import collections, csv, hashlib, json, unicodedata

ROOT = Path(__file__).resolve().parent
CASE = ROOT.parent.parent
SOURCE = ROOT.parent / 'pibank-expanded-2026-10-06'

def norm(s):
    return ' '.join(''.join(c for c in unicodedata.normalize('NFD', s.lower())
                           if not unicodedata.combining(c)).split())

def save_csv(name, rows):
    with (ROOT / name).open('w') as out:
        w = csv.DictWriter(out, fieldnames=list(rows[0]))
        w.writeheader(); w.writerows(rows)

names = ['ranked-01', 'ranked-02', 'ranked-03', 'ranked-04', 'ranked-05',
         'ranked-08', 'ranked-08-page2', 'ranked-09']
banks = {'interbank.pe': 'Interbank', 'viabcp.com': 'BCP',
         'scotiabank.com.pe': 'Scotiabank', 'bbva.pe': 'BBVA'}
observations, provenance = [], []
for name in names:
    path = SOURCE / (name + '-provider.json')
    doc = json.loads(path.read_text())
    for task in doc['response']['tasks']:
        assert task['status_code'] == 20000
        for result in task.get('result') or []:
            items = result.get('items') or []
            provenance.append({'file': str(path.relative_to(CASE)),
                               'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                               'task_id': task['id'], 'queried_at': doc['queriedAt'],
                               'target': result['target'], 'total_count': result.get('total_count'),
                               'returned_rows': len(items)})
            for item in items:
                kd = item['keyword_data']; ki = kd.get('keyword_info') or {}
                element = item['ranked_serp_element']; si = element['serp_item']
                domain = si['domain'].removeprefix('www.')
                bank_key = next(k for k in banks if domain == k or domain.endswith('.'+k))
                observations.append({'bank': banks[bank_key], 'keyword': kd['keyword'],
                    'normalized_keyword': norm(kd['keyword']), 'monthly_searches_estimated': ki.get('search_volume'),
                    'rank_group': si.get('rank_group'), 'url': si['url'],
                    'keyword_updated_at': ki.get('last_updated_time'),
                    'ranking_updated_at': element.get('last_updated_time'),
                    'queried_at': doc['queriedAt'], 'task_id': task['id'],
                    'source': str(path.relative_to(CASE))})

dataset = json.loads((SOURCE / 'keyword-dataset.json').read_text())
by_keyword = {x['normalized_keyword']: x for x in dataset['keywords']}
rank_index = collections.defaultdict(list)
for row in observations:
    rank_index[row['normalized_keyword']].append(row)

# Explicit editorial representatives. These are different decisions, not disjoint audiences.
# A representative is chosen for the question/content destination, never by a MAX rule.
# Branded account/opening variants share a family; their volumes are not added.
groups = [
 ('G01','Cuenta de ahorro','direct','cuenta de ahorros',
  ['cuenta ahorro'], 'Producto existente', 'Representante de categoría; no añadir expresión abreviada'),
 ('G02','Intereses sobre ahorro','direct','cuenta de ahorro con intereses',
  ['cuentas de ahorros con intereses','interés de cuenta de ahorro'], 'Producto/calculadora existentes', 'Formulaciones de la misma necesidad de rendimiento'),
 ('G03','Comparar cuentas en Perú','direct','mejores cuentas de ahorro peru',
  ['mejor cuenta de ahorros','mejores cuentas de ahorro'], 'Guía de comparación', 'Preferencia por consulta localizada; no añadir versiones genéricas'),
 ('G04','Abrir una cuenta de ahorro','direct','abrir cuenta de ahorros',
  [], 'Producto/FAQ apertura existentes', 'Apertura genérica; no sumar apertura de marca'),
 ('G05','Costos de mantenimiento','direct','cuenta de ahorros sin mantenimiento',
  [], 'FAQ de comisiones existente', 'Expansión del corpus; posición rival no capturada para esta consulta'),
 ('G06','Requisitos de apertura','direct','requisitos para abrir una cuenta de ahorros',
  [], 'FAQ requisitos existente', 'Expansión del corpus; posición rival no capturada para esta consulta'),
 ('C01','Ahorro de alto rendimiento','conditional','cuentas de ahorro de alto rendimiento',
  ['cuenta de alto rendimiento','cuenta de alto rendimiento peru','cuentas de alto rendimiento peru','cuentas de ahorro de alto rendimiento perú'],
  'Producto y guía de comparación', 'Consulta amplia; variantes locales no sumadas; revisar país y expectativa de producto'),
 ('C02','Cuenta digital','conditional','cuenta digital',
  ['cuenta de ahorro digital','cuenta de ahorros digital','cuentas de ahorros digitales','que es cuenta digital','que es una cuenta digital'],
  'Producto existente', 'A menudo espera pagos/tarjeta; filtrar a ahorro digital'),
 ('C03','Dónde ahorrar y ganar intereses','conditional','en que banco puedo ahorrar mi dinero y ganar intereses',
  [], 'Guía de comparación', 'Puede mezclar depósitos a plazo; no llamar ahorro líquido a toda la intención'),
 ('C04','Qué banco paga más intereses Perú','conditional','que banco paga mas intereses en peru',
  [], 'Guía de comparación', 'Expansión del corpus; posición rival no capturada; mezcla productos'),
 ('B01','Ahorro BCP','competitor','cuenta de ahorro del bcp',
  ['cuenta ahorros bcp','bcp ahorros','bcp crear cuenta','cuenta digital bcp','bcp cuenta digital','crear cuenta bcp digital',
   'crear cuenta digital bcp','bcp crear cuenta digital','abrir cuenta bcp online','crear cuenta de ahorros bcp digital','bcp abrir cuenta digital'],
  'Comparación de condiciones y traslado de ahorro', 'Representante de evaluación de ahorro; apertura/digital en la misma familia, sin sumarlas'),
 ('B02','Súper Tasa Interbank','competitor','cuenta super tasa interbank',
  ['super tasa interbank'], 'Comparación de condiciones y traslado de ahorro', 'Nombre completo del producto; abreviatura no sumada'),
 ('B03','Power Scotiabank','competitor','cuenta power scotiabank',
  [], 'Comparación de condiciones y traslado de ahorro', 'Producto remunerado; no sumar cuenta digital como audiencia distinta automáticamente'),
 ('B04','Cuenta digital Scotiabank','competitor','cuenta digital scotiabank',
  ['scotiabank cuenta digital','abrir cuenta scotiabank','crear cuenta scotiabank','abrir cuenta digital scotiabank',
   'cuenta digital sbp','cuenta digital scotiabank perú','abrir cuenta scotiabank online','crear cuenta scotiabank digital','scotiabank abrir cuenta'],
  'Comparación de condiciones y traslado de ahorro', 'Fuerte intención de marca y medios de pago; audiencia puede solapar Power'),
 ('B05','Cuenta digital BBVA','competitor','cuenta digital bbva',
  ['bbva cuenta digital','abrir cuenta bbva','cuenta de ahorros bbva','crear cuenta digital bbva','abrir cuenta de ahorros bbva',
   'abrir cuenta digital bbva','cuenta ahorro bbva','cuenta digital bbva perú'],
  'Comparación de condiciones y traslado de ahorro', 'Peer adicional de investigación; Jesús no lo nombró; no asumir transferencia de navegación de marca'),
 ('E01','Entender TREA','assisted','trea',
  ['que es la trea','que es trea'], 'FAQ/calculadora existentes', 'Educación de rendimiento; no demanda de apertura independiente'),
 ('E02','Seguro de depósitos','assisted','fondo de seguro de depositos',
  ['fondo de seguro de deposito','fondo seguro de deposito'], 'FAQ confianza existente', 'Confianza; variantes singular/plural no sumadas'),
 ('E03','Qué es cuenta de ahorro','assisted','que es una cuenta de ahorro',
  ['que es una cuenta de ahorros','que son cuenta de ahorro','que son cuentas de ahorro','que son cuentas de ahorros'],
  'FAQ definición existente', 'Educación de producto; no sumar con categoría como usuarios nuevos'),
 ('E04','Cómo ahorrar dinero','assisted','como ahorrar dinero',
  ['ahorrar dinero','como ahorrar'], 'Guía si ayuda a decidir destino del ahorro', 'Intención educativa más amplia; prioridad menor'),
]
families, assigned = [], {}
for fid, label, lane, representative, aliases, destination, reason in groups:
    rep = by_keyword[norm(representative)]
    for term in [representative] + aliases:
        key = norm(term)
        assert key not in assigned, (key, fid)
        assigned[key] = fid
    rows = rank_index[norm(representative)]
    ranks = {}
    for row in rows:
        bank = row['bank']; rank = row['rank_group']
        if bank not in ranks or rank < ranks[bank]: ranks[bank] = rank
    families.append({'family_id': fid, 'family': label, 'lane': lane,
        'representative': representative, 'estimated_monthly_query_volume': rep['search_volume'],
        'ranking_evidence': '; '.join(f'{b}: {r}' for b,r in sorted(ranks.items())) or 'not_captured_for_exact_query',
        'source': 'research/' + rep['source'], 'updated_at': rep['keyword_updated_at'],
        'destination': destination, 'grouping_reason': reason,
        'aliases_not_added': '; '.join(aliases), 'audience_disjoint': False})

for row in observations:
    row['family_id'] = assigned.get(row['normalized_keyword'])
    row['verdict'] = 'selected_exploratory_family' if row['family_id'] else 'not_selected_for_capture_plan'

unique = {}
for row in observations:
    key = row['normalized_keyword']
    if key not in unique: unique[key] = {'keyword': row['keyword'], 'volume': row['monthly_searches_estimated'], 'banks': set()}
    unique[key]['banks'].add(row['bank'])
raw_candidate_sum = sum(x['volume'] for k,x in unique.items() if k in assigned and isinstance(x['volume'], (int,float)))
proxy = {lane: sum(x['estimated_monthly_query_volume'] for x in families if x['lane']==lane)
         for lane in ['direct','conditional','competitor','assisted']}
assert len(observations)==1476
assert len(families)==19
assert all(x['estimated_monthly_query_volume'] is not None for x in families)

# Requirements, deliberately NOT a forecast. No invented CTR/eligibility used as evidence.
# Maturity weights only show the effect of implementation delay; not an expected growth curve.
ramp = [0,.05,.10,.20,.30,.45,.60,.70,.80,.90,1,1]
goal_funded=760
required_visits=goal_funded/(.02*.65)
generic_pool=proxy['direct']+proxy['conditional']
combined_pool=generic_pool+proxy['competitor']
summary={'as_of':'2026-10-06', 'lens':'estimated_market_DataForSEO', 'market':'PE/2604/es',
    'banks_named_by_jesus':['BCP','Interbank','Scotiabank'],
    'scotiabank_transcription_note':'ASR says Scorch; meeting summary normalizes Scotiabank',
    'researcher_added_peer':['BBVA'], 'ranked_observations':len(observations),
    'exact_normalized_queries':len(unique), 'manually_selected_families':len(families),
    'selected_ranked_unique_queries':sum(k in assigned for k in unique),
    'raw_selected_query_volume_sum_diagnostic_only':raw_candidate_sum,
    'representative_basket_proxy_by_lane':proxy,
    'basket_is_total_market':False, 'basket_is_disjoint_audience':False,
    'etv_consumed':False,'incremental_provider_calls':0,'incremental_provider_cost_usd':0,
    'previous_ledger_cost_unknown':True,'previous_unknown_request':'ranked-09-page2',
    'coverage':provenance,
    'model_assumptions':{'ramp_sensitivity_not_measured':ramp,
        'open_rate_not_measured':.02,'funding_rate_not_measured':.65,
        'annual_window_is_planning_not_confirmed_bank_goal':True},
    'five_percent_provisional_38m_first_deposit_goal':{'funded_required':goal_funded,
        'eligible_visits_required':required_visits,
        'required_visit_to_query_proxy_ratio_generic_flat_year':required_visits/(generic_pool*12),
        'required_visit_to_query_proxy_ratio_combined_flat_year':required_visits/(combined_pool*12),
        'required_visit_to_query_proxy_ratio_generic_with_maturity_sensitivity':required_visits/(generic_pool*sum(ramp)),
        'required_visit_to_query_proxy_ratio_combined_with_maturity_sensitivity':required_visits/(combined_pool*sum(ramp)),
        'ratios_are_requirements_not_observed_CTR_or_market_share':True,
        'currency_ticket_goal_period_and_definition_unconfirmed':True},
    'checks':{'all_provider_tasks_ok':True,'all_selected_volumes_measured_estimates':True,
        'no_duplicate_family_assignments':True,'all_source_files_exist':all((CASE/x['source']).exists() for x in families),
        'no_ETV_or_GSC_claim':True,'no_assisted_or_IA_accounts_added':True}}
save_csv('capturas-competidores.csv',observations)
save_csv('plan-busquedas.csv',families)
(ROOT/'resultados.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ['ranked_observations','exact_normalized_queries','selected_ranked_unique_queries',
    'raw_selected_query_volume_sum_diagnostic_only','representative_basket_proxy_by_lane',
    'five_percent_provisional_38m_first_deposit_goal']},ensure_ascii=False,indent=2))
