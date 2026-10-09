"""Demand, paid acquisition requirement and cohort model. Hypotheses, not bank forecast."""
from pathlib import Path
import json,csv,hashlib,math,statistics,unicodedata
D=Path(__file__).resolve().parent;R=D.parent;C=R.parent
hashes={};rawcache={}
def read(p):
 hashes[str(p.relative_to(C))]=hashlib.sha256(p.read_bytes()).hexdigest();return p.read_text()
def walk(x):
 if isinstance(x,dict):
  if 'keyword' in x and isinstance(x.get('keyword_info'),dict):yield x
  for v in x.values():yield from walk(v)
 elif isinstance(x,list):
  for v in x:yield from walk(v)
def raw_info(p,q):
 if p not in rawcache:rawcache[p]=list(walk(json.loads(read(p))))
 h=[x for x in rawcache[p] if x['keyword']==q]
 assert h,(p,q)
 return h[0]['keyword_info']
datafile=C/'research/pibank-expanded-2026-10-06/keyword-dataset.json'
ks=json.loads(read(datafile))['keywords'];km={x['keyword']:x for x in ks}
prior=list(csv.DictReader(read(R/'demanda-audiencia-2026-10-08/panel.csv').splitlines()))
panel=[]
for r in prior:
 q=r['query']
 if q in km:
  src=C/'research'/km[q]['source'];info=raw_info(src,q)
 else:
  src=C/r['source'];info=raw_info(src,q)
 lane='education' if r['group'] in ['education','educacion','assisted','assisted_education','herramienta'] or r['id'].startswith('E') else 'commercial'
 panel.append(dict(id=r['id'],query=q,lane=lane,ready=int(r['ready']),monthly=float(r['monthly']),months={m:float(r[f'2026_{m:02}']) for m in range(1,13)},cpc=info.get('cpc'),source=str(src.relative_to(C)),origin='33_panel'))
# Queries reflect distinct phrasing/intents, not unique searchers. Same-core and same-series flags audited separately.
extra=[
('crear cuenta bcp',4,'commercial'),('apertura de cuenta bbva',6,'commercial'),('abrir cuenta interbank',3,'commercial'),('abrir cuenta scotiabank',5,'commercial'),
('cuenta digital bcp',4,'commercial'),('cuenta digital interbank',3,'commercial'),('cuenta de ahorros interbank',3,'commercial'),('cuenta de ahorros bbva',6,'commercial'),('cuenta de ahorros scotiabank',5,'commercial'),
('cuenta premio bcp',4,'commercial'),('cuenta free scotiabank',5,'commercial'),('cuenta digital caja arequipa',7,'commercial'),('caja huancayo cuenta de ahorros',7,'commercial'),('cuenta de ahorros falabella',7,'commercial'),('mibanco cuenta de ahorros',7,'commercial'),('cuenta de ahorros banco de la nación',7,'commercial'),('caja cusco cuenta de ahorros',7,'commercial'),
('cuenta sueldo bcp',8,'complement'),('cuenta sueldo bbva',8,'complement'),('cuenta sueldo interbank',8,'complement'),('cuenta sueldo scotiabank',8,'complement'),
('cuenta bancaria',2,'commercial'),('ahorro',3,'education'),('plan de ahorro',4,'education'),('que banco paga mas intereses',3,'commercial'),('depósito a plazo fijo simulador',6,'education'),('depósito a plazo fijo bcp',6,'commercial'),('deposito a plazo fijo interbank',6,'commercial'),('deposito a plazo fijo bbva',6,'commercial'),('sbs tasas de interés de bancos y cajas',3,'commercial')]
for n,(q,start,lane) in enumerate(extra,1):
 k=km[q];src=C/'research'/k['source'];info=raw_info(src,q);hist={x['month']:x['search_volume'] for x in k['monthly_searches'] if x['year']==2026}
 assert all(m in hist for m in range(1,9)),q
 panel.append(dict(id=f'Y{n:02}',query=q,lane=lane,ready=start,monthly=k['search_volume'],months={m:hist[m] if m<=8 else k['search_volume'] for m in range(1,13)},cpc=info.get('cpc'),source=str(src.relative_to(C)),origin='expansion_intent'))
brandfile=C/'research/pibank-integrated-2026-10-08/overview-provider.json'
brandraw=json.loads(read(brandfile));brands=[]
for k in walk(brandraw):
 if k['keyword'] not in ['bcp','bbva','interbank','scotiabank','banco falabella','banbif']:continue
 info=k['keyword_info'];hist={x['month']:x['search_volume'] for x in info['monthly_searches'] if x['year']==2026}
 brands.append(dict(query=k['keyword'],monthly=info['search_volume'],months={m:hist[m] if m<=8 else info['search_volume'] for m in range(1,13)},cpc=info['cpc'],low_bid=info.get('low_top_of_page_bid'),high_bid=info.get('high_top_of_page_bid')))
assert len(brands)==6
assert len(panel)==63 and len({x['query'] for x in panel})==63
# Flag exact provider core and identical histories; do not represent as a proven additive market.
flags=[]
for i,a in enumerate(panel):
 for b in panel[i+1:]:
  ka=km.get(a['query'],{});kb=km.get(b['query'],{})
  ca=ka.get('core_keyword') or a['query'];cb=kb.get('core_keyword') or b['query']
  if ca==cb or a['months']==b['months']:
   flags.append(dict(a=a['query'],b=b['query'],reason='same_core' if ca==cb else 'identical_history_check_semantics'))
# Product generic / digital may refer to same product. Conservative saturation test disables seven new rows, not old evidence.
overlap_extra=['cuenta digital bcp','cuenta digital interbank','cuenta de ahorros interbank','cuenta de ahorros bbva','cuenta de ahorros scotiabank','plan de ahorro','que banco paga mas intereses']
# CPC is a historical provider signal, not challenger cost or a quote. Explicit multiplier stress.
commercial=[r for r in panel if r['lane']!='education' and r['cpc'] is not None]
commercial_cpc=sum(sum(r['months'].values())*r['cpc'] for r in commercial)/sum(sum(r['months'].values()) for r in commercial)
brand_cpc=sum(sum(r['months'].values())*r['cpc'] for r in brands)/sum(sum(r['months'].values()) for r in brands)
# Controllable budgets vs unknown auction eligibility are separated. Paid impression share*CTR=.60*.10=.06.
config=dict(goal=15200,opening_commercial_quarter=[.025,.03,.035,.04],opening_education_quarter=[.0075,.01,.0125,.015],opening_broad_brand_quarter=[.01,.0125,.015,.02],funding_quarter=[.65,.70,.725,.75],fund_same_month=.8,fund_next_month=.2,paid_commercial_capture=.06,click_to_visit=.9,organic_capture_mature=.05,maturity=[.1,.2,.35,.5,.65,.8,1],broad_campaign_start_month=3,broad_activation_ramp=[.25,.5,.75,1,1,1,1,1,1,1],status='planning_assumptions_not_observed_benchmarks')

def calc(brand_capture,conversion_scale=1,drop_overlap=False,cpc_scale=1,paid_capture_scale=1):
 monthly=[]; subscribers=0.0
 for m in range(1,13):
  quarter=(m-1)//3;f=config['funding_quarter'][quarter]
  lagfactor=config['fund_same_month']+(config['fund_next_month'] if m<12 else 0)
  organic=paid=org_open=paid_open=paid_cost=0
  for r in panel:
   if drop_overlap and r['query'] in overlap_extra:continue
   age=m-r['ready']
   if age<0:continue
   maturity=config['maturity'][min(age,6)];volume=r['months'][m]
   o=volume*.05*maturity; rate=(config['opening_education_quarter'] if r['lane']=='education' else config['opening_commercial_quarter'])[quarter]*conversion_scale
   organic+=o;org_open+=o*rate
   if r['lane']=='education':continue
   clicks=volume*.06*paid_capture_scale;v=clicks*.9
   paid+=v;paid_open+=v*rate
   paid_cost+=clicks*(r['cpc'] if r['cpc'] is not None else commercial_cpc)*cpc_scale
  age=m-3;ramp=0 if age<0 else config['broad_activation_ramp'][age]
  raw=sum(r['months'][m] for r in brands)
  brand_clicks=raw*brand_capture*ramp
  bv=brand_clicks*.9;bo=bv*config['opening_broad_brand_quarter'][quarter]*conversion_scale
  bc=sum(r['months'][m]*r['cpc'] for r in brands)*brand_capture*ramp*cpc_scale
  # Earned PR dose: 12 pitches*15% pickup*10k reads*.5% outbound each campaign;
  # each of 2 refuerzos: 10 opportunities*10% pickup*5k reads*.5% outbound.
  # No outlet read count is observed; these are explicit delivery-to-traffic hypotheses.
  pr_visits=90 if m in [3,8] else (25 if m in [6,11] else 0)
  pr_open=pr_visits*.02*conversion_scale
  # Newsletter starts M3, no pre-existing database. Only previous-month opted-in non-openers.
  community_clicks=subscribers*.0237 if m>=3 else 0
  community_open=community_clicks*.08*conversion_scale
  subscribers=max(0,subscribers-community_open)*(1-.0016)
  new_subscribers=max(0,organic+paid+bv+pr_visits-org_open-paid_open-bo-pr_open)*.70*.03 if m>=3 else 0
  subscribers+=new_subscribers
  support_open=pr_open+community_open
  monthly.append(dict(month=m,pr_visits=pr_visits,pr_funded_year=pr_open*f*lagfactor,community_return_clicks=community_clicks,community_funded_year=community_open*f*lagfactor,subscribers_end=subscribers,organic_visits=organic,commercial_paid_visits=paid,broad_paid_visits=bv,total_visits=organic+paid+bv+pr_visits,opening_commercial=config['opening_commercial_quarter'][quarter]*conversion_scale,opening_broad=config['opening_broad_brand_quarter'][quarter]*conversion_scale,funding=f,organic_funded_year=org_open*f*lagfactor,commercial_paid_funded_year=paid_open*f*lagfactor,broad_paid_funded_year=bo*f*lagfactor,funded_year=(org_open+paid_open+bo+support_open)*f*lagfactor,funded_next_year=(org_open+paid_open+bo+support_open)*f*(1-lagfactor),media_cost=paid_cost+bc,commercial_cost=paid_cost,broad_cost=bc,broad_query_volume=raw,broad_effective_click_capture=brand_capture*ramp,openings=org_open+paid_open+bo+support_open))
 prev=0.0
 for row in monthly:
  eventual=row['funded_year']+row['funded_next_year'];row['funded_in_calendar_month']=eventual*.8+prev*.2;prev=eventual
 assert math.isclose(sum(x['funded_in_calendar_month'] for x in monthly),sum(x['funded_year'] for x in monthly))
 total={key:sum(x[key] for x in monthly) for key in ['pr_visits','pr_funded_year','community_return_clicks','community_funded_year','organic_visits','commercial_paid_visits','broad_paid_visits','total_visits','openings','organic_funded_year','commercial_paid_funded_year','broad_paid_funded_year','funded_year','funded_next_year','media_cost','commercial_cost','broad_cost']}
 return dict(total=total,monthly=monthly)
base=calc(0);unit=calc(.01)
required=(15200-base['total']['funded_year'])/((unit['total']['funded_year']-base['total']['funded_year'])/.01)
route=calc(required)
assert math.isclose(route['total']['funded_year'],15200)
scenarios={
'organic_and_commercial_search_only':base,
'broad_capture_1pct':calc(.01),
'broad_capture_2pct':calc(.02),
'broad_capture_3pct':calc(.03),
'goal_seek_required':route,
'goal_with_cpc_2x':calc(required,cpc_scale=2),
'goal_with_cpc_3x':calc(required,cpc_scale=3),
'fixed_volume_conversion_minus25pct':calc(required,conversion_scale=.75),
'fixed_volume_7_ambiguous_rows_removed':calc(required,drop_overlap=True),
'fixed_volume_paid_clicks_half':calc(required*.5,paid_capture_scale=.5)
}
# Re-solve cost for weaker conversion; no claim it is buyable.
for scale in [.75,.5,1.5,2]:
 b=calc(0,conversion_scale=scale);u=calc(.01,conversion_scale=scale)
 req=(15200-b['total']['funded_year'])/((u['total']['funded_year']-b['total']['funded_year'])/.01)
 scenarios[f'goal_reprice_conversion_{scale}']=dict(required_brand_capture=req,**calc(req,conversion_scale=scale))
# Same traffic with opening/funding held at initial quarter: paired hypothetical, not causal estimate.
initial=config.copy();config['opening_commercial_quarter']=[.025]*4;config['opening_education_quarter']=[.0075]*4;config['opening_broad_brand_quarter']=[.01]*4;config['funding_quarter']=[.65]*4
same_traffic_without_improvement=calc(required)
no_base=calc(0);no_unit=calc(.01)
no_req=(15200-no_base['total']['funded_year'])/((no_unit['total']['funded_year']-no_base['total']['funded_year'])/.01)
no_improvement_goal=calc(no_req)
config=initial
audience_file=C/'research/pibank-integrated-2026-10-08/audience-provider.json'
audience_raw=json.loads(read(audience_file));audience=[]
for x in walk(audience_raw):
 ci=x.get('clickstream_keyword_info')
 if not ci:continue
 age=ci['age_distribution'];partial=sum(age.get(k) or 0 for k in ['35-44','45-54'])/100
 audience.append(dict(query=x['keyword'],age_35_54_share_reported=partial,age_55_64=age.get('55-64'),sample_volume=ci['search_volume'],updated_at=ci['last_updated_time'],nature='modeled_clickstream_distribution_not_census_no_NSE',missing_age_bins=[k for k,v in age.items() if v is None]))
brand_audience=[x for x in audience if x['query']!='cuenta de ahorros']
weighted_age=sum(x['sample_volume']*x['age_35_54_share_reported'] for x in brand_audience)/sum(x['sample_volume'] for x in brand_audience)
# q is unobserved qualified/share within the whole search inventory; no household NSE scaling.
availability=[dict(qualified_share=q,impression_share=.8,ctr_required=required/(q*.8)) for q in [.25,.5,.75,1]]
result=dict(commercial_status='rejected_out_of_scope_by_operator_do_not_use_in_proposal',as_of='2026-10-08',nature='conditional_goal_seek_with_measured_search_inventory_not_bank_forecast',config=config,panel_queries=len(panel),panel_monthly=sum(r['monthly'] for r in panel),panel_annual=sum(sum(r['months'].values()) for r in panel),panel_broad_brand_monthly=sum(r['monthly'] for r in brands),panel_broad_brand_annual=sum(sum(r['months'].values()) for r in brands),cpc_usd_historical_weighted=dict(commercial=commercial_cpc,broad_bank_brand=brand_cpc),required_mature_broad_click_capture=required,scenarios=scenarios,same_traffic_without_assumed_improvements=same_traffic_without_improvement,goal_without_assumed_improvements=no_improvement_goal,required_capture_without_improvement=no_req,audience=audience,audience_weighted_35_54_share_clickstream=weighted_age,availability_thresholds=availability,overlap_flags=flags,ambiguous_additional_rows_for_stress=overlap_extra,audience_demographic_share=None,qualified_impression_share=None,provider_cost_new_usd=brandraw['response']['costUsd']+audience_raw['response']['costUsd'],inputs_sha256=hashes)
(D/'resultados.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for filename,rows in [('panel.csv',[{k:v for k,v in x.items() if k!='months'} for x in panel]),('bancos-amplios.csv',[{k:v for k,v in x.items() if k!='months'} for x in brands]),('plan-mensual-condicionado.csv',route['monthly'])]:
 with (D/filename).open('w') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
for p,sha in hashes.items():assert hashlib.sha256((C/p).read_bytes()).hexdigest()==sha
print(json.dumps({k:v for k,v in result.items() if k not in ['scenarios','inputs_sha256','same_traffic_without_assumed_improvements','config']},ensure_ascii=False,indent=2))
for name,r in scenarios.items(): print(name,json.dumps(r['total'],ensure_ascii=False))
print('without_improvements',same_traffic_without_improvement['total']['funded_year'])
