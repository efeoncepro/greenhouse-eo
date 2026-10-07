"""Read existing research/model; write only this planning companion. No provider calls."""
from pathlib import Path
import csv, json, hashlib, math, collections

D = Path(__file__).resolve().parent
R = D.parent
C = R.parent
ROOT = next(p for p in C.parents if (p / 'package.json').exists())
I = json.loads((D / 'inputs.json').read_text())
def rows(p):
    with p.open() as f: return list(csv.DictReader(f))
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def save(name, data):
    with (D / name).open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(data[0])); w.writeheader(); w.writerows(data)
def js(name, data): (D / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

source = C / 'research/pibank-gap-closure-2026-10-06/plan-busquedas.csv'
panel = rows(source)
oldinputs = json.loads((R / 'economia/inputs.json').read_text())
assert I['opening_rate'] == oldinputs['opening_rate_test']
assert I['funding_rate'] == oldinputs['funding_rate_test']
assert I['funding_lag_months'] == oldinputs['funding_lag_months'] == 0
assert I['funded_goal'] == oldinputs['goal_accounts'] == 15200
assert len(panel) == 19
# Article IDs and months come from the current 24-article plan, preserved as-is.
ready = {'G01':1,'G02':2,'G03':3,'G04':1,'G05':1,'G06':1,'C01':2,'C02':1,'C03':3,'C04':3,'B01':7,'B02':5,'B03':6,'B04':6,'B05':8,'E01':1,'E02':4,'E03':1,'E04':3}
asset = {'G01':'Pilar','G02':'Calculadora / ART-03','G03':'ART-05 / Comparador','G04':'ART-02','G05':'Pilar','G06':'ART-02','C01':'Pilar / ART-03','C02':'Pilar / ART-02','C03':'ART-05','C04':'ART-05','B01':'ART-13','B02':'ART-10','B03':'ART-12','B04':'ART-12','B05':'ART-16','E01':'ART-01','E02':'ART-08','E03':'Pilar','E04':'ART-06'}
connections = []
for f in panel:
    fid = f['family_id']
    connections.append({**f, 'asset_planned':asset[fid], 'ready_month_planned':ready[fid],
        'organic_action':'Comparativa y alternativa Pibank, criterios equivalentes y fuentes' if f['lane']=='competitor' else 'Resolver intención, enlazar recurso y producto, medir progresión',
        'next_step':'Recurso → Cuenta Soles → apertura → primer fondeo',
        'owner':'SEO + Editorial; Producto/Cumplimiento revisa condiciones',
        'measurement':'GSC consulta/URL; sesiones; avance a producto; apertura/fondeo agregado del banco',
        'capture_rule':'One effective capture assumption; no automatic exclusion or discount for competitor brand',
        'overlap':'Source families not disjoint; totals are panel arithmetic, not unique users or TAM'})
save('conexion-familias.csv', connections)

monthly = []; totals = []; byfamily = []
for scenario, capture in I['capture_scenarios'].items():
    for f in connections:
        annual = 0
        for m in range(1,13):
            age = m - f['ready_month_planned']
            maturity = 0 if age < 0 else I['maturity_by_age'][min(age,6)]
            visits = float(f['estimated_monthly_query_volume']) * capture * maturity
            opened = visits * I['opening_rate']; funded = opened * I['funding_rate']
            monthly.append({'scenario':scenario,'family_id':f['family_id'],'lane':f['lane'],'month':m,
                'source_queries_month':float(f['estimated_monthly_query_volume']), 'effective_capture_assumption':capture,
                'maturity_assumption':maturity,'visit_equivalents_test':visits,'openings_test':opened,'funded_test':funded,
                'nature':'panel_sensitivity_before_overlap_reconciliation_not_incremental_forecast'})
            annual += visits
        byfamily.append({'scenario':scenario,'family_id':f['family_id'],'family':f['family'],'lane':f['lane'],
            'annual_visit_equivalents_test':annual,'openings_test':annual*I['opening_rate'],
            'funded_test':annual*I['opening_rate']*I['funding_rate'],'ready_month':f['ready_month_planned'],'asset':f['asset_planned']})
    s = [x for x in monthly if x['scenario']==scenario]
    totals.append({'scenario':scenario,'mature_capture_assumption':capture,
        'annual_visit_equivalents_test':sum(x['visit_equivalents_test'] for x in s),
        'annual_openings_test':sum(x['openings_test'] for x in s),
        'annual_funded_test':sum(x['funded_test'] for x in s),
        'competitor_visit_equivalents_test':sum(x['visit_equivalents_test'] for x in s if x['lane']=='competitor'),
        'status':'partial_panel_sensitivity_not_whole_program_forecast_or_verified_incrementality'})
save('trafico-mensual-por-familia.csv',monthly);save('aporte-por-familia.csv',byfamily);save('sensibilidad-panel.csv',totals)

# Work-based capacity, all new extended scope costed once. Existing v0.6 files are never written.
work=[]
def add(id,title,group,sku,hours,months):
    for m in months: work.append({'work_id':id,'work':title,'cost_group':group,'role_sku':sku,'month':m,'base_hours':hours})
year=range(1,13); campaigns=[3,5,8,11]
add('D01','Dirección mensual','direction','ECG-001',6,year);add('D02','Revisión trimestral','direction','ECG-001',8,[3,6,9,12]);add('D03','Inicio','direction','ECG-001',4,[1])
add('S01','SEO técnico inicial','seo','',32,[1]);add('S02','SEO seguimiento','seo','',8,range(2,13))
add('S03','Panel AEO inicial','seo','',8,[1]);add('S04','36 observaciones AEO mensuales','seo','',4,range(2,13))
add('S05','Pilar/CRO inicial','seo','',24,[1]);add('S06','Experimentos y continuidad','seo','',6,range(2,13))
add('S07','Medición implementación','seo','',24,[1,2]);add('S08','Analítica e informe','seo','',6,range(2,13))
add('S09','Eficiencia SEO–SEM, análisis','seo','',4,year);add('S10','Datos para cuatro recursos PR','seo','',12,campaigns)
add('S11','Método calculadora','seo','',8,[1]);add('S12','Método comparador','seo','',10,[3,4]);add('S13','Método planificador','seo','',6,[5,6])
add('E01','Dos artículos, investigación y redacción','writer','',24,year);add('E02','Revisión artículos','writer','',6,year)
add('E03','Dos mejoras FAQ','writer','',3,year);add('E04','Newsletter','writer','',5,year);add('E05','QA final entregas','writer','',4,year);add('E06','Guion sesión','writer','',4,campaigns)
add('G01','Diseño hub','designer','',20,[1]);add('G02','Diseño comparador','designer','',10,[3,4]);add('G03','Diseño planificador','designer','',8,[5,6]);add('G04','Cuatro adaptaciones','designer','',8,year)
add('W01','WordPress hub','wordpress','ECG-012',40,[1]);add('W02','Carga artículos','wordpress','ECG-012',2,year);add('W03','Implementación SEO/CRO CMS','wordpress','ECG-012',8,year)
add('T01','QA hub','development','ECG-015',20,[2]);add('T02','Calculadora desarrollo y QA','development','ECG-015',32,[2]);add('T03','Comparador desarrollo','development','ECG-015',30,[3,4]);add('T04','Comparador QA','development','ECG-015',20,[4]);add('T05','Planificador desarrollo','development','ECG-015',22,[5,6]);add('T06','Planificador QA','development','ECG-015',16,[6]);add('T07','Mantenimiento tools','development','ECG-015',4,range(3,13))
add('C01','Escucha y moderación','community','ECG-007',16,year);add('C02','Newsletter técnica','automation','ECG-021',2,year);add('C03','Sesión soporte técnico','automation','ECG-021',2,campaigns);add('C04','Producción sesión','session','ECG-028',8,campaigns)
add('P01','Mapa PR','pr','ECG-024',20,[1]);add('P02','Gestión PR','pr','ECG-024',8,range(2,13));add('P03','Editorial PR','pr','ECG-024',5,year);add('P04','Preparación vocería','pr','ECG-024',3,campaigns);add('P05','QA/medición PR','pr','ECG-024',2,year)
add('M01','Coordinación','coordination','ECG-016',6,year)
save('capacidad-por-mes.csv',work)
seedpath=ROOT/'data/pricing/seed/sellable-roles-pricing.csv'
seed={r['SKU']:r for r in rows(seedpath)}
costs=[]; prices=[]; capacity=[]
for group,share in I['allocation'].items():
    for m in year:
        h=sum(x['base_hours'] for x in work if x['cost_group']==group and x['month']==m)
        capacity.append({'group':group,'month':m,'base_hours':h,'hours_with_reserve':h*(1+I['delivery_reserve']),
            'productive_capacity_assumed':share*I['paid_hours_per_month']*I['productive_share'],
            'headroom_hours':share*I['paid_hours_per_month']*I['productive_share']-h*(1+I['delivery_reserve']),
            'status':'proposed_allocation_not_confirmed_availability_or_competencies'})
save('asignacion-equipo.csv',capacity)
for n, scenario in enumerate(['bajo','central','alto']):
    for group in sorted({x['cost_group'] for x in work}):
        groupwork=[x for x in work if x['cost_group']==group]; hours=sum(x['base_hours'] for x in groupwork)
        if group in I['allocation']:
            amount=I['salary_monthly_usd'][group][n]*I['allocation'][group]*12*(1+I['salary_loading_allowance'])
            basis='user_monthly_cost_times_allocation_plus_loading_allowance';unit=I['salary_monthly_usd'][group][n];sku=''
        else:
            sku=groupwork[0]['role_sku'];unit=float(seed[sku]['Costo Interno (USD/h)'])
            amount=hours*unit*I['complementary_seed_rate_multiplier'][n];basis='seed_hourly_cost_with_explicit_sensitivity_not_supplier_quote'
        costs.append({'scenario':scenario,'group':group,'role_sku':sku,'base_hours':hours,'unit_cost_usd':unit,
            'annual_cost_before_reserve_usd':amount,'basis':basis})
    labor=sum(x['annual_cost_before_reserve_usd'] for x in costs if x['scenario']==scenario)
    other=I['other_monthly_usd'][n]*12;reserve=labor*I['delivery_reserve'];total=labor+reserve+other
    prices.append({'scenario':scenario,'labor_before_reserve_usd':labor,'labor_reserve_usd':reserve,'tools_other_usd':other,
        'annual_cost_test_usd':total,'monthly_cost_test_usd':total/12,'monthly_fee_at_40pct_margin_usd':total/(1-I['target_gross_margin'])/12})
central=next(x for x in prices if x['scenario']=='central')
fee=math.ceil(central['monthly_fee_at_40pct_margin_usd']/500)*500
for p in prices:
    p['monthly_fee_proposed_usd']=fee;p['gross_margin_at_proposed_fee']=(fee*12-p['annual_cost_test_usd'])/(fee*12)
save('costeo-interno.csv',costs);save('precio-sensibilidad.csv',prices)

# Existing-traffic uplift is a separate illustrative requirement, not credited as another channel.
conversion=[]
for v in [10000,100000]:
    base=v*I['opening_rate']*I['funding_rate']
    for o,f in [(.03,.65),(.02,.75),(.03,.75)]:
        conversion.append({'existing_visits_example':v,'opening_rate_test':o,'funding_rate_test':f,
            'funded_reference_test':base,'funded_improved_test':v*o*f,'difference_test':v*o*f-base,
            'nature':'sensitivity_not_observed_volume_not_causal_lift_not_added_to_panel'})
save('conversion-trafico-existente.csv',conversion)
result={'date':I['date'],'preserved_goal':{'funded':15200,'ticket_usd':2500,'equivalent_usd':38000000,
    'opening_rate':.02,'funding_rate':.65,'visits_required_exact':15200/.65/.02,'visits_required_ceil':math.ceil(15200/.65/.02)},
    'source_panel_families':len(panel),'source_proxy_by_lane':{lane:sum(float(f['estimated_monthly_query_volume']) for f in panel if f['lane']==lane) for lane in ['direct','conditional','competitor','assisted']},
    'search_sensitivities':totals,'capacity_hours':sum(x['base_hours'] for x in work),
    'capacity_hours_with_reserve':sum(x['base_hours'] for x in work)*(1+I['delivery_reserve']),
    'salary_group_hours':{g:sum(x['base_hours'] for x in work if x['cost_group']==g) for g in I['allocation']},
    'minimum_capacity_headroom_hours':min(x['headroom_hours'] for x in capacity),
    'pricing':prices,'proposed_fee_usd_month':fee,'approved_fee':False,
    'whole_program_incremental_forecast':None,'new_provider_calls':0,'sem_operations':False}
js('resultados.json',result)
protected=[source,R/'economia/inputs.json',R/'economia/results.json',R/'economia/Pibank-decision-inversion-2027.xlsx',R/'meta-hacia-atras/resultados.json',R/'PLAN-DE-CONTENIDOS-V0.7.csv',R/'CALENDARIO-CRECIMIENTO-V0.7.csv']
js('fuentes-preservadas.json',{'read_only_inputs':[{'path':str(p.relative_to(ROOT)),'sha256':sha(p)} for p in protected],
    'cost_seed':{'path':str(seedpath.relative_to(ROOT)),'sha256':sha(seedpath)},
    'new_assumptions':'inputs.json','user_costs':'Conversation 2026-10-07; monthly approximate ranges supplied by Julio'})
# Link all 24 editorial slots, including supporting work without inventing query volume.
editorial=[]
suggested_months={'ART-10':3,'ART-06':5,'ART-13':4,'ART-07':7,'ART-12':5,'ART-09':6,'ART-16':6,'ART-11':8}
for a in rows(R/'PLAN-DE-CONTENIDOS-V0.7.csv'):
    mapped=[f['family_id'] for f in connections if a['id'] in f['asset_planned']]
    editorial.append({**a,'families_measured':';'.join(mapped),'traffic_credit':'Only through mapped family; no extra traffic per article' if mapped else 'Support/activation/maintenance; no standalone search volume credited',
        'proposed_priority_month':suggested_months.get(a['id'],int(a['mes_propuesto'])),
        'priority_change_status':'Recommendation only; source calendar and baseline sensitivity unchanged'})
save('produccion-y-oportunidades.csv',editorial)
timing=[]
for scenario,cap in I['capture_scenarios'].items():
    baseline=sum(x['annual_visit_equivalents_test'] for x in byfamily if x['scenario']==scenario)
    revised=0
    for f in connections:
        m0=f['ready_month_planned']
        if f['family_id'] in ['B01','B02','B03','B04','B05']:m0={'B01':4,'B02':3,'B03':5,'B04':5,'B05':6}[f['family_id']]
        elif f['family_id']=='E04':m0=5
        for m in range(m0,13):revised+=float(f['estimated_monthly_query_volume'])*cap*I['maturity_by_age'][min(m-m0,6)]
    timing.append({'scenario':scenario,'original_calendar_visit_equivalents':baseline,'proposed_calendar_visit_equivalents':revised,
        'difference_from_timing_only':revised-baseline,'funded_difference_test':(revised-baseline)*I['opening_rate']*I['funding_rate'],
        'status':'same_sources_and_capture; shift_four_comparatives_and_support_slots; no_new_articles'})
save('sensibilidad-prioridad-calendario.csv',timing)
print(json.dumps(result,ensure_ascii=False,indent=2))
