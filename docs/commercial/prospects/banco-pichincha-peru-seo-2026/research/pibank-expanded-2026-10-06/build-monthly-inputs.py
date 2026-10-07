from pathlib import Path
import json,collections,hashlib,csv
r=Path(__file__).resolve().parent
d=json.loads((r/'keyword-dataset.json').read_text());rows=d['keywords'];lookup={x['normalized_keyword']:x for x in rows}
panel=[('D01','acquisition_direct','category','cuenta de ahorros','Producto de ahorro genérico; variantes singular/plural no se suman'),('D02','acquisition_direct','comparison','mejores cuentas de ahorro peru','Comparación localizada; otras formulaciones/años no se suman'),('D03','acquisition_direct','opening','abrir cuenta de ahorros','Apertura genérica; crear/apertura/online no se suman'),('D04','acquisition_direct','yield','interes de cuenta de ahorro','Representante core del proveedor para interés; frases con intereses no se suman'),('D05','acquisition_direct','no_maintenance','cuenta de ahorros sin mantenimiento','Representante core del proveedor; variantes no se suman'),('C01','acquisition_conditional','digital','cuenta digital','Condicional: intención transaccional y expectativas de tarjeta/pagos; elegibilidad no medida'),('C02','acquisition_conditional','high_yield_peru','cuentas de alto rendimiento peru','Consulta explícita Perú; aceptación condicionada a SERP/producto; no hereda 1.600 mixta'),('E01','assisted_education','deposit_insurance','fondo de seguro de depositos','Confianza asistida; no sumar fondeadas a adquisición'),('E02','assisted_education','yield_literacy','que es trea','Educación de rendimiento, no conversión directa por defecto'),('E03','assisted_education','bank_transfer','transferencia bancaria','Operación puede ser cliente existente; sólo apoyo'),('E04','assisted_education','savings_literacy','como ahorrar dinero','Educación amplia: no usar como visitas adquiribles sin evidencia'),('F01','future_usd','usd_account','cuenta en dolares','Producto futuro; excluido del caso Soles actual')]
inputs=[]
for id,lane,cluster,kw,reason in panel:
 row=lookup.get(kw)
 if not row:raise SystemExit('missing representative '+kw)
 monthly=sorted(row['monthly_searches'],key=lambda x:(x['year'],x['month']),reverse=True)[:12]
 inputs.append({'id':id,'lane':lane,'cluster':cluster,'representative_keyword':row['keyword'],'keyword_id':row['id'],'source':row['source'],'source_lens':'estimated_market','search_volume':row['search_volume'],'unit':'estimated_searches_per_month','selection_reason':reason,'history':sorted(monthly,key=lambda x:(x['year'],x['month'])),'history_months':len(monthly),'current_own_brand_baseline':None,'conversion_input':None,'growth_2027':None})
lanes={}
for lane in sorted({x['lane'] for x in inputs}):
 xs=[x for x in inputs if x['lane']==lane];byperiod=collections.defaultdict(lambda:{'volume':0,'rows':0})
 for x in xs:
  for m in x['history']:
   key=f"{m['year']}-{m['month']:02}"
   if m.get('search_volume') is not None:byperiod[key]['volume']+=m['search_volume'];byperiod[key]['rows']+=1
 valid=[v['volume'] for v in byperiod.values() if v['rows']==len(xs)]
 mean=sum(valid)/len(valid) if valid else None
 hist=[{'period':k,'searches':v['volume'] if v['rows']==len(xs) else None,'available_rows':v['rows'],'expected_rows':len(xs),'shape_factor':v['volume']/mean if v['rows']==len(xs) and mean else None} for k,v in sorted(byperiod.items())]
 lanes[lane]={'panel_keyword_count':len(xs),'panel_average_volume_proxy':sum(x['search_volume'] or 0 for x in xs),'historical_monthly_mean':mean,'history':hist,'not_tam':True,'overlap_between_representatives_not_measured':True,'projection_2027':None}
# Core families are a separate view of complete data, not the model panel or a unique-user dedup proof.
families=collections.defaultdict(list)
for row in rows:
 core=row['core_keyword'] or row['normalized_keyword'];families[(row['lane'],core.lower())].append(row)
familyrows=[]
for (lane,core),members in sorted(families.items()):
 exact=[x for x in members if x['normalized_keyword']==core.lower()]
 # Choose core exact if captured; otherwise shortest closest spelling, never volume-optimized MAX.
 rep=(exact or sorted(members,key=lambda x:(len(x['keyword']),x['normalized_keyword'])))[0]
 familyrows.append({'lane':lane,'core':core,'representative_keyword':rep['keyword'],'representative_volume':rep['search_volume'],'selection_rule':'exact_core_if_available_else_shortest_spelling_not_max','keyword_count':len(members),'keyword_ids':[x['id'] for x in members],'raw_keyword_sum_not_demand':sum(x['search_volume'] or 0 for x in members)})
(r/'core-families.json').write_text(json.dumps({'not_tam':True,'limitations':'Provider text synonym families are incomplete; absent core falls back to exact normalized keyword. No SUM into market ceiling.','families':familyrows},ensure_ascii=False,indent=2))
out={'version':'expanded-research.v1','as_of':'2026-10-06','market':'PE','location_code':2604,'language':'es','device':'Labs_not_device_specific','coverage_dataset':'keyword-dataset.json','source_policy':'Market estimates historical; no GSC. Model panel chosen for intent and product fit, not maximal volume; additional clusters remain research backlog.','overlap_policy':'Exact-query dedup plus provider core families and manual model representatives. Panel subtotal is a working proxy with residual cross-intent overlap; not unique people, total market or actual traffic. No blanket MAX universe.','calendar_policy':'Historical last12months per row; mapping shape to2027 is illustrative, no trend/growth projection. Prefer flat sensitivity plus observed historical shape, not automatic repeated-growth curve.','acquisition_inputs':inputs,'lane_profiles':lanes,'baseline_own_brand_postlaunch':None,'aeo_measured_baseline':None,'forecast':False}
(r/'monthly-demand-inputs.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
with (r/'monthly-demand-inputs.csv').open('w') as f:
 fields=['id','lane','cluster','representative_keyword','keyword_id','source','search_volume','unit','history_months','selection_reason'];w=csv.DictWriter(f,fields);w.writeheader();w.writerows({k:x.get(k) for k in fields} for x in inputs)
print(json.dumps({k:{'count':v['panel_keyword_count'],'proxy':v['panel_average_volume_proxy'],'historical_mean':v['historical_monthly_mean']} for k,v in lanes.items()},ensure_ascii=False))
