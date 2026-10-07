"""Hybrid packaging of existing capacity/costs. Does not write research or funnel."""
from pathlib import Path
import csv,json,hashlib,math
D=Path(__file__).resolve().parent;R=D.parent;OLD=R/'conexion-demanda-plan'
def read(p):return list(csv.DictReader(p.open()))
def save(name,rows):
 with (D/name).open('w',newline='') as f:
  w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
def js(name,x):(D/name).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
catalog=[
 ('BASE','Servicio continuo SEO/AEO',4500,'mes',12,'SEO técnico y schema pertinentes dentro de 8h CMS/mes, Panel AEO de 24 preguntas en 3 superficies: 72 observaciones iniciales y 144/mes desde M2, hasta 5 artículos/mes, evolución de contenidos y FAQ según evidencia, implementación web priorizada, medición, CRO y dirección','12 meses; revisión trimestral'),
 ('HUB','Content hub WordPress',3000,'proyecto',1,'Arquitectura y diseño, hasta tres plantillas sobre sitio existente, implementación y QA','50% inicio y 50% aceptación; referencia M1–M2'),
 ('CALCULADORA','Mejora de calculadora existente',1200,'proyecto',1,'Revisión y mejora de una calculadora existente, fórmula, UX y QA','50% inicio y 50% aceptación; referencia M2'),
 ('COMPARADOR','Comparador de ahorro',4000,'proyecto',1,'Una herramienta para hasta cinco productos, criterios/fuentes aprobados y actualización manual','50% inicio y 50% aceptación; referencia M3–M4'),
 ('PLANIFICADOR','Planificador de ahorro',3000,'proyecto',1,'Una herramienta para meta, aporte y plazo; método validado y QA','50% inicio y 50% aceptación; referencia M5–M6'),
 ('COMUNIDAD','Comunidad y distribución',1000,'mes activo',12,'Una newsletter, cuatro adaptaciones y hasta 16h de escucha/moderación mensual en canales acordados','Activación mínima 3 meses; luego mensual'),
 ('PR','Campaña de PR y autoridad',2000,'campaña',4,'Recurso/dossier sobre activo existente, 3 ángulos, 12 propuestas a medios, vocería y seguimiento','6–8 semanas por campaña; 50% inicio y 50% cierre de entregables'),
 ('REFUERZO_PR','Refuerzo de gestión editorial y enlaces',500,'ronda',4,'Revisión de hasta 10 oportunidades adicionales; hasta 6 gestiones personalizadas y un seguimiento por gestión; verificación de referencias sin duplicar campañas','3–4 semanas por ronda; 50% inicio y 50% cierre; no garantiza publicaciones/enlaces'),
 ('CUIDADO','Mantenimiento de herramientas',200,'mes activo',10,'Hasta 4h/mes para hasta tres herramientas entregadas; fórmulas, condiciones y QA menor','Desde entrega y fin de garantía correctiva; mensual')]
catalog=[dict(zip(['id','capability','price_usd','billing_unit','full_plan_units','scope','activation_terms'],x)) for x in catalog]
save('capacidades-y-precios.csv',catalog);cat={x['id']:x for x in catalog}
work=read(OLD/'capacidad-por-mes.csv');oldcost=read(OLD/'costeo-interno.csv');oldresult=json.loads((OLD/'resultados.json').read_text())
# Operator confirms capacity up to five articles/month. Keep source files immutable.
# Explicit workload delta: same research/review effort per article and CMS loading.
for x in work:
 x['source_hours']=float(x['base_hours'])
 x['capacity_basis']='prior_plan'
 if x['work_id'] in ['E01','E02','W02']:
  x['base_hours']=str(float(x['base_hours'])*2.5)
  x['capacity_basis']='five_articles_operator_capacity_same_effort_per_article'
  if x['work_id']=='E01':x['work']='Hasta cinco artículos, investigación y redacción'

# Sessions are removed; writer capacity repurposed, PR work costed explicitly.
work=[x for x in work if x['work_id'] not in ['C03','C04']]
for x in work:
 if x['work_id']=='E03':
  x['work']='Mejoras editoriales menores según evidencia; FAQ cuando corresponda'
  x['capacity_basis']='36h_annual_flexible_editorial_improvement_no_FAQ_quota'
 if x['work_id'] in ['S03','S04']:
  x['base_hours']='12'
  x['work']='Panel AEO: 24 preguntas, tres superficies; baseline M1, dos cortes desde M2'
  x['capacity_basis']='expanded_AEO_12h_month_within_full_SEO_cost_reservation'
 if x['work_id']=='S05':x['work']='Mejora inicial del pilar y recorrido al producto'
 if x['work_id']=='S06':x['work']='Investigación y evolución de activos/recorridos según evidencia'
 if x['work_id']=='W03':x['work']='Implementación WordPress priorizada; hasta 8h/mes'
 if x['work_id']=='E06':x['work']='Revisión de fichas para refuerzo editorial y enlaces'
for month in [2,4,7,10]:
 work.append({'work_id':'R01','work':'Refuerzo editorial: selección, gestiones, seguimiento y verificación','cost_group':'pr','role_sku':'ECG-024','month':str(month),'base_hours':'20','source_hours':0,'capacity_basis':'new_PR_round_20h_replaces_sessions'})
allocation=[]
def module_for(x):
 id=x['work_id']
 if id=='R01':return [('REFUERZO_PR',1)]
 if x['cost_group'] in ['seo','writer'] or id[0] in ['D','M'] or id in ['E03','E05','W03']:return [('BASE',1)]
 if id in ['E01','E02','W02']:return [('BASE',1)]
 return [({'E04':'COMUNIDAD','G01':'HUB','G02':'COMPARADOR','G03':'PLANIFICADOR','G04':'COMUNIDAD','W01':'HUB','T01':'HUB','T02':'CALCULADORA','T03':'COMPARADOR','T04':'COMPARADOR','T05':'PLANIFICADOR','T06':'PLANIFICADOR','T07':'CUIDADO','C01':'COMUNIDAD','C02':'COMUNIDAD'}.get(id,'PR' if id.startswith('P') else ''),1)]
for x in work:
 for module,share in module_for(x):
  assert module in cat
  allocation.append({**x,'module':module,'allocation_share':share,'assigned_hours':float(x['base_hours'])*share})
assert math.isclose(sum(x['assigned_hours'] for x in allocation),2924)
save('capacidad-asignada.csv',allocation)
costs=[]
for scenario in ['bajo','central','alto']:
 source={x['group']:x for x in oldcost if x['scenario']==scenario}
 allowance=next(x['tools_other_usd'] for x in oldresult['pricing'] if x['scenario']==scenario)
 for module in cat:
  selected=[x for x in allocation if x['module']==module]
  labor=sum(x['assigned_hours']*float(source[x['cost_group']]['annual_cost_before_reserve_usd'])/float(source[x['cost_group']]['base_hours']) for x in selected if x['cost_group'] not in ['writer','seo'])
  # Reserve full SEO and writer monthly costs once, independent of consumed hours.
  # Expanded AEO uses existing paid capacity; source costs are not altered.
  if module=='BASE':labor+=(float(source['writer']['unit_cost_usd'])+float(source['seo']['unit_cost_usd']))*12*1.20
  other=allowance*{'BASE':2400/3600,'HUB':100/3600,'COMUNIDAD':600/3600,'CUIDADO':500/3600}.get(module,0)
  total=labor*1.15+other
  # PR map is a fixed first-activation cost; do not assume it halves with two campaigns.
  fixed_pr=(20*float(source['pr']['annual_cost_before_reserve_usd'])/float(source['pr']['base_hours'])*1.15) if module=='PR' else 0
  units=cat[module]['full_plan_units'];variable=(total-fixed_pr)/units
  costs.append({'scenario':scenario,'module':module,'hours_full_plan':sum(x['assigned_hours'] for x in selected),'annual_labor_before_reserve':labor,'annual_reserve':labor*.15,'annual_other':other,'cost_full_plan':total,'units_full_plan':units,'cost_per_unit_variable':variable,'first_activation_extra':fixed_pr,'price_per_unit':cat[module]['price_usd'],'gross_margin_first_unit':1-(variable+fixed_pr)/cat[module]['price_usd']})
 for_scenario=sum(x['cost_full_plan'] for x in costs if x['scenario']==scenario)
 expected_delta=(float(source['writer']['unit_cost_usd'])*12*1.20-float(source['writer']['annual_cost_before_reserve_usd'])+36*float(source['wordpress']['annual_cost_before_reserve_usd'])/float(source['wordpress']['base_hours'])+80*float(source['pr']['annual_cost_before_reserve_usd'])/float(source['pr']['base_hours'])-8*float(source['automation']['annual_cost_before_reserve_usd'])/float(source['automation']['base_hours'])-float(source['session']['annual_cost_before_reserve_usd']))*1.15
 assert math.isclose(for_scenario,next(x['annual_cost_test_usd'] for x in oldresult['pricing'] if x['scenario']==scenario)+expected_delta),scenario
save('costeo-por-capacidad.csv',costs)
plans={};months=range(1,13)
for plan in ['base','integral','gradual']:
 plan_rows=[]
 schedules={'BASE':{m:1 for m in months}}
 if plan!='base':
  schedules.update({'COMUNIDAD':{m:1 for m in range(1 if plan=='integral' else 3,13)},'HUB':{1:.5,2:.5},'CALCULADORA':{2:1},'COMPARADOR':{3:.5,4:.5} if plan=='integral' else {4:.5,5:.5},'PLANIFICADOR':{5:.5,6:.5} if plan=='integral' else {},'PR':{m:1 for m in ([3,5,8,11] if plan=='integral' else [3,8])},'REFUERZO_PR':{m:1 for m in ([2,4,7,10] if plan=='integral' else [6,11])},'CUIDADO':{m:1 for m in range(3,13)}})
 for m in months:
  for module in cat:
   quantity=schedules.get(module,{}).get(m,0)
   plan_rows.append({'plan':plan,'month':m,'module':module,'planning_units':quantity,'unit_price_usd':cat[module]['price_usd'],'planned_fee_usd':quantity*cat[module]['price_usd'],'status':'planning_only_not_activated_or_invoiced'})
 plans[plan]=plan_rows
save('activaciones-mensuales.csv',[x for p in plans.values() for x in p])
summaries=[]
for name,planrows in plans.items():
 counts={k:sum(x['planning_units'] for x in planrows if x['module']==k) for k in cat}
 total=sum(x['planned_fee_usd'] for x in planrows)
 def cost_for(sc):
  return sum(counts[x['module']]*x['cost_per_unit_variable']+(x['first_activation_extra'] if counts[x['module']]>0 else 0) for x in costs if x['scenario']==sc)
 summary={'plan':name,'fixed_annual_fee_usd':54000,'optional_planned_usd':total-54000,'total_planned_usd':total,'average_monthly_usd':total/12,'peak_monthly_usd':max(sum(x['planned_fee_usd'] for x in planrows if x['month']==m) for m in months),'central_cost_usd':cost_for('central'),'central_gross_margin':1-cost_for('central')/total,'high_cost_usd':cost_for('alto'),'high_cost_gross_margin':1-cost_for('alto')/total,'articles_capacity_max':60,'faq_policy':'segun_evidencia_sin_cuota','newsletters':counts['COMUNIDAD'],'adaptations':counts['COMUNIDAD']*4,'pr_campaigns':counts['PR'],'pr_reinforcement_rounds':counts['REFUERZO_PR'],'new_tools':counts['COMPARADOR']+counts['PLANIFICADOR'],'units':counts}
 summaries.append(summary)
save('comparacion-planes.csv',[{k:v for k,v in s.items() if k!='units'} for s in summaries])
result={'date':'2026-10-07','status':'proposed_hybrid_not_contract_or_activated_services','base_monthly_usd':4500,'prior_fixed_fee_usd':8000,'fixed_commitment_reduction_pct':.4375,'prior_cost_sources_preserved':True,'cost_updated_for_five_articles':True,'writer_full_monthly_cost_in_base':True,'articles_monthly_capacity_max':5,'capacity_hours_before':2216,'capacity_hours_now':2924,'sessions_removed':True,'pr_reinforcement_hours_per_round':20,'production_is_capacity_not_traffic_forecast':True,'evolutionary_delivery':True,'faq_fixed_quota_removed':True,'editorial_improvement_hours_reallocated':36,'productive_hours_per_role_month':120,'aeo_questions':24,'aeo_surfaces':3,'aeo_baseline_observations':72,'aeo_monthly_observations_from_m2':144,'aeo_annual_observations':1656,'aeo_extra_SEO_hours':92,'aeo_hours_per_month':12,'original_funnel_and_research_unchanged':True,'fixed_SEO_hiring_cost_in_base':True,'monthly_other_cost_not_paid_media':True,'catalog':catalog,'plans':summaries,'source_hashes':[{'path':str(p.relative_to(R.parent)),'sha256':sha(p)} for p in [OLD/'costeo-interno.csv',OLD/'capacidad-por-mes.csv',OLD/'inputs.json',R/'economia/Pibank-decision-inversion-2027.xlsx',R.parent/'research/pibank-gap-closure-2026-10-06/plan-busquedas.csv']]}
js('resultados.json',result)
print(json.dumps({'plans':summaries,'central_costs':[{k:x[k] for k in ['module','cost_per_unit_variable','first_activation_extra','gross_margin_first_unit']} for x in costs if x['scenario']=='central']},ensure_ascii=False,indent=2))

editorial=[]
for m in range(1,13):
 phase='Base y primeras publicaciones' if m<=2 else 'Ampliar cobertura y aprender' if m<=6 else 'Profundizar y mejorar' if m<=9 else 'Consolidar y expandir'
 editorial.append({'mes':m,'articulos_capacidad_max':5,'faq_criterio':'Necesidad observada; sin cuota fija','precio_editorial_adicional_usd':0,'base_mensual_usd':4500,'enfasis':phase,'priorizacion':'Investigar, priorizar, producir/mejorar, medir y decidir; backlog inicial de 24 temas','dependencias':'Fuentes; aprobacion bancaria; infraestructura; disponibilidad confirmada'})
save('calendario-editorial.csv',editorial)
