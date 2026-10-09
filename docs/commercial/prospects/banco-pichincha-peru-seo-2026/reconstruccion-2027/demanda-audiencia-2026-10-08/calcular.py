"""Extensión de demanda Perú: enero 2026 contrafactual, sin modificar modelos previos."""
from pathlib import Path
import json, csv, hashlib, math
D=Path(__file__).resolve().parent
C=D.parent.parent
hashes={}
def read(rel):
 p=C/rel; hashes[rel]=hashlib.sha256(p.read_bytes()).hexdigest(); return p.read_text()
def walk(x):
 if isinstance(x,dict):
  if 'keyword' in x and isinstance(x.get('keyword_info'),dict): yield x
  for y in x.values(): yield from walk(y)
 elif isinstance(x,list):
  for y in x: yield from walk(y)
def history(x):
 return {r['month']:r['search_volume'] for r in x if r['year']==2026 and r['month']<=8}
old=list(csv.DictReader(read('research/pibank-gap-closure-2026-10-06/plan-busquedas.csv').splitlines()))
ass=json.loads(read('reconstruccion-2027/conexion-demanda-plan/inputs.json'))
conn=list(csv.DictReader(read('reconstruccion-2027/conexion-demanda-plan/conexion-familias.csv').splitlines()))
starts={r['family_id']:int(r['ready_month_planned']) for r in conn}
starts.update(B01=4,B02=3,B03=5,B04=5,B05=6,E04=5)
rows=[]
for r in old:
 hits=[x for x in walk(json.loads(read(r['source']))) if x['keyword']==r['representative']]
 h=history(hits[0]['keyword_info']['monthly_searches'])
 rows.append(dict(id=r['family_id'],query=r['representative'],group=r['lane'],monthly=float(r['estimated_monthly_query_volume']),history=h,ready=starts[r['family_id']],source=r['source'],origin='panel_original',purpose=r['family']))
dataset='research/pibank-expanded-2026-10-06/keyword-dataset.json'
ks=json.loads(read(dataset))['keywords']
provider='research/pibank-audience-2026-10-08/overview-provider.json'
p=json.loads(read(provider)); fresh=p['response']['tasks'][0]['result'][0]['items']
# One representative per additional intent family; assets can serve several families.
selection=[
 ('X01','cuenta simple interbank','competidor',3,'Comparativa Interbank; complementar ahorro y gasto'),
 ('X02','cuenta millonaria interbank','competidor',3,'Comparativa Interbank; rendimiento y condiciones'),
 ('X03','cuenta independencia bbva','competidor',6,'Comparativa BBVA; separar ahorro y gasto'),
 ('X04','cuenta ganadora bbva','competidor',6,'Comparativa BBVA; condiciones de ahorro'),
 ('X05','financiera efectiva cuenta de ahorros','competidor',7,'Comparativa de alternativas de ahorro'),
 ('X06','agora cuenta de ahorros','competidor',7,'Comparativa de alternativas de ahorro'),
 ('X07','banbif cuenta de ahorros','competidor',7,'Comparativa de alternativas de ahorro'),
 ('X08','depósito a plazo fijo','alternativa',6,'Comparación cuenta líquida vs plazo fijo; no ofrecer depósito inexistente'),
 ('X09','diferencia entre cuenta corriente y cuenta de ahorros','educacion',3,'Separar dinero operativo y ahorro'),
 ('X10','presupuesto familiar','educacion',3,'Presupuesto y capacidad de ahorro familiar'),
 ('X11','fondo de emergencia','educacion',2,'Reserva disponible para imprevistos'),
 ('X12','ahorro programado','educacion',4,'Hábito de aportes; no afirmar función automática del producto'),
 ('X13','metas de ahorro','educacion',4,'Horizonte y aportes para objetivos familiares'),
 ('X14','calculadora interes compuesto','herramienta',2,'Ampliación de calculadora existente; supuestos de capitalización visibles')]
for fid,q,group,start,purpose in selection:
 found=[x for x in ks if x['keyword']==q]
 if found:
  x=found[0]; volume=x['search_volume']; h=history(x['monthly_searches']); src=dataset
 else:
  x=next(x for x in fresh if x['keyword']==q); volume=x['keyword_info']['search_volume']; h=history(x['keyword_info']['monthly_searches']); src=provider
 rows.append(dict(id=fid,query=q,group=group,monthly=volume,history=h,ready=start,source=src,origin='ampliacion',purpose=purpose))
assert len(rows)==33 and len({r['query'] for r in rows})==33
assert all(set(r['history'])==set(range(1,9)) for r in rows)
assert sum(r['monthly'] for r in rows[:19])==31050
base=json.loads(read('reconstruccion-2027/complemento-2026-10-08/resultados.json'))
detail=[]; summaries=[]
for name,capture in ass['capture_scenarios'].items():
 monthly=[]
 for m in range(1,13):
  selected=[]
  for r in rows:
   v=r['history'][m] if m<=8 else r['monthly']; age=m-r['ready']; maturity=0 if age<0 else ass['maturity_by_age'][min(age,6)]
   visits=v*capture*maturity
   entry=dict(scenario=name,month=m,family=r['id'],origin=r['origin'],query=r['query'],volume=v,basis='historical_estimate' if m<=8 else 'flat_assumption',ready=r['ready'],capture=capture,maturity=maturity,visits=visits,openings=visits*.02,funded=visits*.013)
   detail.append(entry); selected.append(entry)
  monthly.append(dict(month=m,query_volume=sum(x['volume'] for x in selected),visits=sum(x['visits'] for x in selected)))
 selected=[x for x in detail if x['scenario']==name]
 visits=sum(x['visits'] for x in selected); original=sum(x['visits'] for x in selected if x['origin']=='panel_original')
 legacy=next(x for x in base['summaries'] if x['period']=='2026_contrafactual' and x['calendar']=='prioridad_propuesta' and x['scenario']==name)
 assert math.isclose(original,legacy['visits'])
 summaries.append(dict(scenario=name,capture=capture,visits=visits,original_panel_visits=original,added_visits=visits-original,openings=visits*.02,funded=visits*.013,ticket_equivalent_usd=visits*.013*2500,share_of_funded_goal=visits*.013/15200,funded_if_one_month_lag=sum(x['visits'] for x in monthly[:-1])*.013,monthly=monthly))
request=json.loads(read('research/pibank-audience-2026-10-08/overview-request.json'))
requested=request[0]['keywords']
status=[dict(query=q,status='returned_volume' if any(x['keyword']==q and x['keyword_info']['search_volume'] is not None for x in fresh) else 'unknown_not_zero') for q in requested]
result=dict(as_of='2026-10-08',type='conditional_counterfactual_partial_search_panel',audience='NSE A/B, age 35–55: editorial targeting, not observed query segmentation',audience_share_measured=None,product_available_from='2026-01 hypothetical',monthly_snapshot=sum(r['monthly'] for r in rows),annual_queries=sum(sum(r['history'].values())+4*r['monthly'] for r in rows),families=len(rows),opening_rate=.02,funding_rate=.65,lead_rate=None,capture_assumption='same 2/5/10% mature rates as previous model; not measured rankings or CTR',maturity=ass['maturity_by_age'],provider_cost_usd=p['response']['costUsd'],fresh_status=status,summaries=summaries,inputs_sha256=hashes)
for name,data in [('panel.csv',[{**{k:v for k,v in r.items() if k!='history'},**{f'2026_{m:02}':r['history'].get(m,r['monthly']) for m in range(1,13)}} for r in rows]),('detalle-mensual.csv',detail)]:
 with (D/name).open('w') as f:
  w=csv.DictWriter(f,fieldnames=list(data[0])); w.writeheader(); w.writerows(data)
(D/'resultados.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
for rel,sha in hashes.items(): assert hashlib.sha256((C/rel).read_bytes()).hexdigest()==sha
print(json.dumps({k:v for k,v in result.items() if k not in ['inputs_sha256','fresh_status','summaries']},ensure_ascii=False))
for s in summaries: print(json.dumps({k:v for k,v in s.items() if k!='monthly'},ensure_ascii=False))
print('PASS: original sources unchanged; 19-family priority results reproduced; 33 exact histories; unique representatives')
