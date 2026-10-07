from pathlib import Path
import json,csv,unicodedata,collections
r=Path(__file__).parent
norm=lambda s:''.join(c for c in unicodedata.normalize('NFD',s.lower()) if not unicodedata.combining(c)).strip()
o=json.loads((r/'keyword-overview-provider.json').read_text());s=json.loads((r/'keyword-suggestions-provider.json').read_text())
records={}
for label,d in [('overview',o),('suggestions',s)]:
 for task in d['response']['tasks']:
  if task['status_code']!=20000:continue
  for result in task['result']:
   for item in result.get('items') or []:
    n=norm(item['keyword']);rec=records.setdefault(n,{'keyword':item['keyword'],'observations':[]})
    rec['observations'].append({'source_id':'DFS-'+label.upper(),'captured_at':d['queriedAt'],'item':item,'task_id':task['id']})
for kw in o['request']['tasks'][0]['keywords']:
 records.setdefault(norm(kw),{'keyword':kw,'observations':[]})
brands=['pibank','bcp','bbva','interbank','scotiabank','pichincha','agora','ahorramas','efectiva','efectibank','falabella','banbif','mibanco','ripley','santander','caja ','banco de la nacion','banco nacion','comparabien','sbs']
# Explicit conservative editorial groups; MAX observed volume, not inferred distinct-person dedup.
groups={
'G01_category':('core_acquisition',['cuenta de ahorros','cuenta de ahorros peru']),
'G02_high_yield':('broad_mixed_geo',['cuenta de ahorros de alto rendimiento']),
'G03_comparison':('core_acquisition',['mejor cuenta de ahorros peru','mejor cuenta de ahorros','mejor banco para ahorrar peru','que banco paga mas intereses en peru']),
'G04_digital':('core_acquisition',['cuenta de ahorros digital']),
'G05_opening':('core_acquisition',['abrir cuenta de ahorros','abrir cuenta de ahorros online','apertura de cuenta de ahorros','apertura cuenta de ahorros']),
'G06_no_maintenance':('core_acquisition',['cuenta de ahorros sin mantenimiento']),
'G07_interest':('core_acquisition',['intereses cuenta de ahorros','intereses en cuenta de ahorros','cuenta de ahorros con intereses','tasa de interes cuenta de ahorros']),
'G08_usd_future':('future_dollars',['cuenta de ahorro dolares','cuenta de ahorros en dolares','cuenta de ahorros dolares']),
'G09_term_substitute':('substitute',['cuenta de ahorro o deposito a plazo','deposito a plazo fijo peru','cuenta de ahorros plazo fijo','cuenta de ahorros a plazo fijo']),
'G10_definition':('education',['que es cuenta de ahorros','que es una cuenta de ahorros','cuenta de ahorros que es']),
'G11_current_vs_savings':('education',['diferencia entre cuenta corriente y cuenta de ahorros','diferencia entre cuenta de ahorros y cuenta corriente','cuenta corriente cuenta de ahorros','cuenta corriente o cuenta de ahorros','cuenta corriente y cuenta de ahorros','cuenta de ahorros y cuenta corriente','cuenta de ahorros o cuenta corriente','que es cuenta corriente y cuenta de ahorros','como se si mi cuenta es de ahorros o corriente','cuenta de ahorros vs cuenta corriente','cuenta corriente vs cuenta de ahorros']),
'G12_trust_fsd':('trust_support',['fondo de seguro de depositos']),
'G13_trea':('trust_support',['que es trea'])}
lookup={norm(kw):(g,cat) for g,(cat,kws) in groups.items() for kw in kws}
rows=[]
for idx,(n,rec) in enumerate(sorted(records.items()),1):
 ob=next(iter(rec['observations']),None);item=ob['item'] if ob else {};info=item.get('keyword_info') or {};props=item.get('keyword_properties') or {}
 brand=next((b for b in brands if b in n),None)
 group,cat=lookup.get(n,('G99_unassigned','support_unquantified'))
 if brand:group='brand_'+brand.replace(' ','_');cat='pibank_brand' if brand=='pibank' else 'competitor_or_institution_brand'
 volume=info.get('search_volume')
 monthly=info.get('monthly_searches') or []
 rows.append({'id':f'KW-{idx:03}','keyword':rec['keyword'],'normalized_keyword':n,'market':'PE','location_code':2604,'language_code':'es','brand_class':cat,'editorial_group_id':group,'search_volume_monthly':volume,'volume_state':'estimated_observed' if volume is not None else 'not_returned_not_zero','core_keyword':props.get('core_keyword'),'provider_updated_at':info.get('last_updated_time'),'latest_month':monthly[0] if monthly else None,'monthly_searches':monthly,'main_intent':(item.get('search_intent_info') or {}).get('main_intent'),'cpc_usd_paid_proxy':info.get('cpc'),'source_ids':sorted(set(x['source_id'] for x in rec['observations'])),'captured_at':ob['captured_at'] if ob else o['queriedAt'],'source_task_ids':sorted(set(x['task_id'] for x in rec['observations'])),'use_in_demand_envelope':cat=='core_acquisition' and volume is not None,'limitations':['Google Ads-derived estimate, not people/visits','Synonyms and overlapping intentions remain','Monthly database mostly precedes Peru launch' if 'pibank' in n else 'Not a 2027 forecast']})
group_records=[]
for g,(cat,kws) in groups.items():
 members=[x for x in rows if x['editorial_group_id']==g];known=[x for x in members if x['search_volume_monthly'] is not None]
 winner=max(known,key=lambda x:x['search_volume_monthly']) if known else None
 group_records.append({'id':g,'category':cat,'member_ids':[x['id'] for x in members],'representative_keyword':winner['keyword'] if winner else None,'monthly_volume_proxy':winner['search_volume_monthly'] if winner else None,'aggregation':'maximum observed member volume; conservative editorial proxy','use_in_default_envelope':cat=='core_acquisition','confidence':'market_estimate; editorial overlap adjustment; not unique audience'})
metadata={'schema_version':1,'as_of':'2026-10-06','market':'PE','language':'es','default_envelope_searches_monthly':sum(x['monthly_volume_proxy'] or 0 for x in group_records if x['use_in_default_envelope']),'gross_candidate_envelope_searches_monthly':5500,'default_envelope_status':'conservative_editorial_proxy_NOT_TAM_forecast_or_unique_people','source_records':[{'id':'DFS-OVERVIEW','file':'keyword-overview-provider.json','endpoint':o['request']['endpoint']['path'],'captured_at':o['queriedAt'],'task_status':o['response']['taskCodes'],'cost_usd':o['response']['costUsd'],'requested_keywords':36,'returned_rows':22},{'id':'DFS-SUGGESTIONS','file':'keyword-suggestions-provider.json','endpoint':s['request']['endpoint']['path'],'captured_at':s['queriedAt'],'cost_usd':s['response']['costUsd'],'returned_rows':100,'database_matching_candidates':1433,'coverage':'first100 ordered by search volume; 1333 not downloaded; candidates are keywords not search counts'}],'attribution':'Efeonce canonical acquisition org, not Pibank client spend','deduplication':['Lowercase + accent normalization for exact keyword duplicates','Provider core_keyword preserved for analysis, never summed blindly','Explicit editorial groups aggregate by MAX observed member, not SUM','Brand competitor, Pibank brand, education, trust/support, term deposits and future USD excluded from default acquisition envelope','No attempt to infer unique persons or estimate inter-group audience overlap'],'limitations':['Market estimates, not GSC/GA4 or bank conversions','Seed selection + top100 suggestions is incomplete market coverage','Volume snapshots September2026 and monthly data through August2026; not postlaunch demand or 2027 projection','3900 default excludes high-yield1600 with mixed-country SERP;5500gross available only explicit relevance sensitivity; remaining eligibility unknown','No binding conversion or ranking forecast; unknown values retain null']}
(r/'demand-inputs.json').write_text(json.dumps({'metadata':metadata,'groups':group_records,'keywords':rows},ensure_ascii=False,indent=2)+'\n')
fields=['id','keyword','normalized_keyword','market','language_code','brand_class','editorial_group_id','search_volume_monthly','volume_state','core_keyword','provider_updated_at','captured_at','use_in_demand_envelope']
with (r/'demand-inputs.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fields);w.writeheader();w.writerows({k:x.get(k) for k in fields} for x in rows)
print('rows',len(rows),'with_volume',sum(x['search_volume_monthly'] is not None for x in rows),'default_monthly_envelope',metadata['default_envelope_searches_monthly'])
for g in group_records:print(g['id'],g['monthly_volume_proxy'],g['representative_keyword'])
