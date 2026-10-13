from pathlib import Path
import json,unicodedata,hashlib,csv,re,collections
r=Path(__file__).resolve().parent
old=r.parent/'pibank-demand-2026-10-06'
norm=lambda s:re.sub(r'\s+',' ',''.join(c for c in unicodedata.normalize('NFD',s.lower()) if not unicodedata.combining(c))).strip()
records={};coverage=[];ranks=[]
paths=[old/'keyword-overview-provider.json',old/'keyword-suggestions-provider.json']+sorted(r.glob('*-provider.json'))
for p in paths:
 a=json.loads(p.read_text());source=str(p.relative_to(r.parent));req=a.get('request',{}).get('tasks',[])
 for t in a.get('response',{}).get('tasks',[]):
  entry={'source':source,'task_id':t.get('id'),'status_code':t.get('status_code'),'cost_usd':a.get('response',{}).get('costUsd'),'captured_at':a.get('queriedAt'),'requested':req}
  for result in t.get('result') or []:
   entry.update({'total_count':result.get('total_count'),'items_count':result.get('items_count'),'offset':result.get('offset'),'seed':result.get('seed_keyword'),'target':result.get('target'),'scope_reported':result.get('target')})
   coverage.append(dict(entry))
   if t.get('status_code')!=20000:continue
   seeds=result.get('seed_keyword_data') or []
   if isinstance(seeds,dict):seeds=[seeds]
   for idx,item in enumerate((result.get('items') or [])+seeds):
    k=item.get('keyword_data') or item
    kw=k.get('keyword')
    if not kw:continue
    n=norm(kw); info=k.get('keyword_info') or {};props=k.get('keyword_properties') or {}
    o={'source':source,'task_id':t.get('id'),'row':idx,'captured_at':a.get('queriedAt'),'keyword':kw,'keyword_info':info,'properties':props,'serp_info':k.get('serp_info'),'search_intent_info':k.get('search_intent_info'),'avg_backlinks_info':k.get('avg_backlinks_info')}
    records.setdefault(n,{'keyword':kw,'observations':[]})['observations'].append(o)
    el=(item.get('ranked_serp_element') or {}).get('serp_item') or {}
    if el:ranks.append({'keyword':kw,'normalized_keyword':n,'source':source,'target':result.get('target'),'url':el.get('url'),'rank_group':el.get('rank_group'),'rank_absolute':el.get('rank_absolute'),'last_updated_time':el.get('last_updated_time'),'search_volume':info.get('search_volume'),'etv':'discarded_not_consumed'})
 for task in req:
  for kw in task.get('keywords') or []:records.setdefault(norm(kw),{'keyword':kw,'observations':[]})
# Rules label product fit; they do not create users, intent certainty or conversion.
brands=['pibank','bcp','bbva','interbank','scotiabank','pichincha','agora','ahorramas','efectiva','efectibank','falabella','banbif','mibanco','ripley','santander','caja ','caja.','cajas ','banco de la nacion','banco nacion','comparabien','comparabanca','sbs','financiera ','banco azteca','banco popular','banreservas','banesco','bancolombia','davivienda','nequi','daviplata','nu bank','nubank','banamex','banorte','sabadell','caixabank','citibanamex','hsbc','icbc','banco galicia','banco patagonia','banco provincia','bank of','wells fargo','capital one','albo','brubank','uat','ibk','sbn','banco gnb','banco w','itau','bancopel','bancoppel','banco santander','yape','plin','continental','compartamos','scotia','sbp','bancomer','mercantil','bankia','bdv','bci','banco estado','coppel','bancamiga','uala','banco familiar','qapaq','confianza','surgir','pichinch','bancor','bancario rolando','cmr','alfin','sip','cuenta de ahorros oh','cuenta de ahorros wow','cuenta de ahorros gnb','banco gnb','banco falabella','banco ripley','banco alfin','banco pichincha','banco compartamos','banco azteca','rappi','nu cuenta','ueno','bancamiga','bancamigo','banco mercantil','banco familiar','banco exterior','bac ','banco bci']
foreign=['colombia','ecuador','mexico','argentina','chile','espana','venezuela','bolivia','dominicana','costa rica','panama','uruguay','paraguay','brasil','brazil','usa','estados unidos','salvador','guatemala','honduras','nicaragua','republica','guayaquil','bogota','medellin','buenos aires','cuit','cuil','cbu','clabe','rfc','rut','pesos']
rows=[]
for n,rec in sorted(records.items()):
 os=rec['observations'];o=sorted(os,key=lambda x:((x['keyword_info'].get('last_updated_time') or ''),bool(x['keyword_info'].get('monthly_searches')),len(x['keyword_info'])),reverse=True)[0] if os else {}
 info=o.get('keyword_info',{});props=o.get('properties',{});vol=info.get('search_volume');lane='excluded_noise';cluster='noise';reason='Fuera del producto o sin relación suficiente';fit='excluded'
 if 'pibank' in n:lane='brand_own';cluster='brand';reason='Marca; histórico no baseline postlanzamiento';fit='brand_historical_only'
 elif any(x in n for x in brands):lane='brand_competitor';cluster='competitor_brand';reason='Marca ajena/autoridad/medio: gap o referencia, no adquisición genérica';fit='not_automatically_acquirable'
 elif any(re.search(r'\b'+re.escape(x)+r'\b',n) for x in foreign):reason='Otra geografía/identificador extranjero explícito';cluster='foreign_geography'
 elif any(x in n for x in ['dolar','dolares','usd']) and any(x in n for x in ['cuenta','ahorr']):lane='future_usd';cluster='usd_future';reason='Producto dólares futuro sin disponibilidad acreditada';fit='future_only'
 elif any(x in n for x in ['credito','prestamo','corriente','cts','sueldo','nomina','gratificacion','aguinaldo','pension','planilla','persona juridica','plazo fijo','deposito a plazo','empresa','empresarial','negocio','inversion','invertir','fondos mutuos']):lane='substitute_or_other_product';cluster='substitute';reason='Sustituto/otro producto; comparar sin sumar captación directa';fit='not_current_product'
 elif any(x in n for x in ['seguro de deposito','seguro de los deposito','trea','tea tasa','interes compuesto','seguridad bancaria','banco seguro','bancos seguros','fraude','estafa']):lane='assisted_education';cluster='trust_yield_literacy';reason='Confianza/educación; contribución asistida sin duplicar aperturas';fit='assist_only'
 elif any(x in n for x in ['transfer','cci','depositar','deposito','abonar','fonde','primer abono']):lane='assisted_education';cluster='operation_funding';reason='Operación/fondeo suele servir clientes existentes; no adquisición directa por defecto';fit='assist_only'
 elif any(x in n for x in ['que es','que son','como funciona','beneficios','simulador','definicion','significa','tipos de','como ahorrar','importancia','diferencia','ejemplo','tipos','en ingles','embarg','sunat','contabilidad','asiento','libro','excel','formato','calculadora','calcular']):lane='assisted_education';cluster='savings_literacy';reason='Educación/cálculo: ayuda a decidir, no captación directa demostrada';fit='assist_only'
 elif any(x in n for x in ['alto rendimiento','alta rentabilidad']):lane='acquisition_conditional';cluster='high_yield';reason='SERP mixta geográfica previa; elegibilidad peruana por validar';fit='conditional_geo'
 elif any(x in n for x in ['cuenta digital','cuentas digitales']):lane='acquisition_conditional';cluster='digital';reason='Consulta puede buscar pagos/tarjeta: Pibank ahorro sin medios de pago';fit='conditional_product_fit'
 elif any(x in n for x in ['mejor','mas interes','mayor interes','paga mas','rentable','rentabilidad']) and any(x in n for x in ['cuenta','ahorr','banco','bancaria','bancario','interes']):lane='acquisition_direct';cluster='comparison';reason='Comparación de ahorro candidata; revisar producto y SERP';fit='candidate_soles_savings'
 elif ('cuenta' in n and ('ahorr' in n or 'interes' in n)):
  lane='acquisition_direct';fit='candidate_soles_savings';reason='Cuenta ahorro genérica candidata; no elegibilidad personal ni cuota asegurada'
  cluster='opening' if any(x in n for x in ['abrir','apertura','aperturar','crear','requisito']) else 'no_maintenance' if 'mantenimiento' in n else 'interest' if any(x in n for x in ['interes','tasa']) else 'savings_account'
 if lane not in ['brand_own','brand_competitor'] and not re.search(r'(ahorr|banc|cuenta|deposit|interes|\btrea\b|\btea\b|transfer|\bcci\b|fonde|primer abono)',n):lane='excluded_noise';cluster='noise';reason='Sin intención financiera relevante; expansión semántica ajena';fit='excluded'
 if any(x in n for x in ['yen','euros','en soles','a soles']) and not any(x in n for x in ['cuenta','ahorro']):lane='excluded_noise';cluster='fx_noise';reason='Consulta FX/conversión suelta; no producto USD futuro';fit='excluded'
 if any(x in n for x in ['tarjeta','mancomunada','rolando','pasaporte','sin ine','infinity','bet365','apuesta','casino','paypal','digital com','matricula','free fire','facebook','correo','gmail','steam','videojuego','mercado pago','wise','payoneer','menor de edad','ninos','universitario']):lane='excluded_noise';cluster='noise';reason='Necesidad ajena o función/segmento no acreditado';fit='excluded'
 row={'id':'KW-'+hashlib.sha256(n.encode()).hexdigest()[:12],'keyword':rec['keyword'],'normalized_keyword':n,'lane':lane,'cluster':cluster,'eligibility':fit,'selection_reason':reason,'search_volume':vol,'volume_state':'missing' if not os or 'search_volume' not in info else 'null' if vol is None else 'zero' if vol==0 else 'value','unit':'estimated_searches_per_month','location_code':2604,'language_code':'es','device':'not_device_specific_Labs','keyword_updated_at':info.get('last_updated_time'),'core_keyword':props.get('core_keyword'),'monthly_searches':info.get('monthly_searches') or [],'source':o.get('source'),'sources':sorted({x['source'] for x in os}),'observations':[{'source':x['source'],'task_id':x['task_id'],'row':x['row'],'search_volume':x['keyword_info'].get('search_volume'),'keyword_updated_at':x['keyword_info'].get('last_updated_time')} for x in os],'serp_info':o.get('serp_info'),'avg_backlinks_info':o.get('avg_backlinks_info'),'search_intent_info':o.get('search_intent_info')}
 rows.append(row)
meta={'as_of':'2026-10-06','source_lens':'DataForSEO estimated market','scope':'PE/es, historical monthly data; no GSC, no current own-brand baseline','normalization':'lowercase, diacritics and whitespace; source observations retained; choose freshest keyword_info per exact normalized keyword','aggregation_policy':'Raw keyword sums are diagnostics, not TAM/users/visits; core clusters and editorial representative panel exported separately; no blanket MAX universe','etv':'not_consumed; no methodology inferred; rankings use rank_group'}
(r/'keyword-dataset.json').write_text(json.dumps({'metadata':meta,'coverage':coverage,'keywords':rows,'ranked_observations':ranks},ensure_ascii=False,indent=2))
with (r/'keyword-dataset.csv').open('w') as f:
 fields=['id','keyword','normalized_keyword','lane','cluster','eligibility','selection_reason','search_volume','volume_state','unit','location_code','language_code','device','keyword_updated_at','core_keyword','source']
 w=csv.DictWriter(f,fields);w.writeheader();w.writerows({k:x.get(k) for k in fields} for x in rows)
summary={}
for lane in sorted({x['lane'] for x in rows}):
 xs=[x for x in rows if x['lane']==lane];summary[lane]={'keyword_count':len(xs),'with_volume':sum(isinstance(x['search_volume'],(int,float)) for x in xs),'raw_keyword_sum_not_deduplicated_demand':sum(x['search_volume'] or 0 for x in xs),'top':[(x['keyword'],x['search_volume']) for x in sorted(xs,key=lambda x:x['search_volume'] or -1,reverse=True)[:30]]}
(r/'lane-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
print(json.dumps({k:{a:b for a,b in v.items() if a!='top'} for k,v in summary.items()},ensure_ascii=False))
