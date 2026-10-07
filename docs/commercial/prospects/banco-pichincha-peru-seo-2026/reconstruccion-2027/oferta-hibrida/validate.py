from pathlib import Path
import json,csv,hashlib,math,tempfile,subprocess
import openpyxl
D=Path(__file__).resolve().parent;R=json.loads((D/'resultados.json').read_text());checks=[]
def check(n,v):checks.append({'check':n,'pass':bool(v)})
def close(a,b):return math.isclose(float(a),float(b),abs_tol=1e-7,rel_tol=1e-9)
def read(n):return list(csv.DictReader((D/n).open()))
for f in R['source_hashes']:check('Source preserved '+f['path'],hashlib.sha256((D.parent.parent/f['path']).read_bytes()).hexdigest()==f['sha256'])
alloc=read('capacidad-asignada.csv');costs=read('costeo-por-capacidad.csv')
check('Capacity assigned once',close(sum(float(x['assigned_hours']) for x in alloc),2924))
check('SEO hiring fully reserved in base',all(x['module']=='BASE' for x in alloc if x['cost_group']=='seo'))
prior=json.loads((D.parent/'conexion-demanda-plan/resultados.json').read_text())
sources=list(csv.DictReader((D.parent/'conexion-demanda-plan/costeo-interno.csv').open()))
for p in prior['pricing']:
 sc={x['group']:x for x in sources if x['scenario']==p['scenario']}
 delta=(float(sc['writer']['unit_cost_usd'])*12*1.2-float(sc['writer']['annual_cost_before_reserve_usd'])+36*float(sc['wordpress']['annual_cost_before_reserve_usd'])/float(sc['wordpress']['base_hours'])+80*float(sc['pr']['annual_cost_before_reserve_usd'])/float(sc['pr']['base_hours'])-8*float(sc['automation']['annual_cost_before_reserve_usd'])/float(sc['automation']['base_hours'])-float(sc['session']['annual_cost_before_reserve_usd']))*1.15
 check('New cost reconciles capacity delta '+p['scenario'],close(sum(float(x['cost_full_plan']) for x in costs if x['scenario']==p['scenario']),p['annual_cost_test_usd']+delta))
check('Writer cost reserved once in base',all(x['module']=='BASE' for x in alloc if x['cost_group']=='writer'))
check('No per article upsell',not any(x['id']=='EDITORIAL' for x in R['catalog']))
check('Writer hours plus reserve within annual capacity',sum(float(x['assigned_hours']) for x in alloc if x['cost_group']=='writer')*1.15<=160*12*.75)
check('SEO hours plus reserve within annual capacity',sum(float(x['assigned_hours']) for x in alloc if x['cost_group']=='seo')*1.15<=160*12*.75)
check('FAQ quota removed in model',all(p.get('faq_policy')=='segun_evidencia_sin_cuota' and 'faq' not in p for p in R['plans']))
check('Former FAQ provision reallocated',close(sum(float(x['assigned_hours']) for x in alloc if x['work_id']=='E03'),36) and all('según evidencia' in x['work'] for x in alloc if x['work_id']=='E03'))
for group in ['seo','writer']:
 check('Productive monthly capacity '+group,all(sum(float(x['assigned_hours']) for x in alloc if x['cost_group']==group and int(x['month'])==m)*1.15<=120 for m in range(1,13)))
check('Sessions removed from catalog and capacity',not any(x['id']=='SESION' for x in R['catalog']) and not any(x['work_id'] in ['C03','C04'] for x in alloc))
check('PR reinforcement 20 hours each',close(sum(float(x['assigned_hours']) for x in alloc if x['module']=='REFUERZO_PR'),80))
acts=read('activaciones-mensuales.csv')
check('Gradual reinforcement starts M6 M11',[int(x['month']) for x in acts if x['plan']=='gradual' and x['module']=='REFUERZO_PR' and float(x['planning_units'])>0]==[6,11])
check('Gradual PR starts M3 M8',[int(x['month']) for x in acts if x['plan']=='gradual' and x['module']=='PR' and float(x['planning_units'])>0]==[3,8])
check('AEO capacity 144 hours annual',close(sum(float(x['assigned_hours']) for x in alloc if x['work_id'] in ['S03','S04']),144))
check('SEO expanded capacity 604 hours',close(sum(float(x['assigned_hours']) for x in alloc if x['cost_group']=='seo'),604))
questions=read('panel-aeo.csv')
check('AEO panel 24 unique questions six decisions',len(questions)==24 and len({x['pregunta_candidata'] for x in questions})==24 and len({x['decision'] for x in questions})==6)
check('AEO 72 baseline 144 monthly 1656 annual',R['aeo_baseline_observations']==24*3 and R['aeo_monthly_observations_from_m2']==24*3*2 and R['aeo_annual_observations']==72+11*144)
expected={'base':(54000,60,0,0),'integral':(89200,60,12,4),'gradual':(79200,60,10,2)}
for p in R['plans']:
 fee,art,community,pr=expected[p['plan']]
 check('Total '+p['plan'],p['total_planned_usd']==fee)
 check('Scope '+p['plan'],p['articles_capacity_max']==art and p['newsletters']==community and p['pr_campaigns']==pr)
 check('Margin '+p['plan'],close(p['central_gross_margin'],1-p['central_cost_usd']/fee))
check('Gradual peak after PR reinforcement rescheduling',next(p for p in R['plans'] if p['plan']=='gradual')['peak_monthly_usd']==7700)
cost=next(x for x in costs if x['scenario']=='central' and x['module']=='PR')
check('PR setup preserved with one activation',float(cost['first_activation_extra'])>0)
source=D/'Pibank-Oferta-hibrida.xlsx'
values=openpyxl.load_workbook(source,data_only=True);formula=openpyxl.load_workbook(source,data_only=False)
check('No native formula errors',not any(c.data_type=='e' for s in values for row in s for c in row))
check('Default budget',close(values['Presupuesto']['D15'].value,79200))
check('Default control',values['Presupuesto']['D24'].value==0)
grad=next(p for p in R['plans'] if p['plan']=='gradual')
check('Default cost',close(values['Presupuesto']['D19'].value,grad['central_cost_usd']))
check('Default margin',close(values['Presupuesto']['D20'].value,grad['central_gross_margin']))
check('Base price proposed',values['Catalogo']['C2'].value==4500)
check('Discount sensitivity base high cost becomes negative',values['Sensibilidad']['I4'].value<0)
check('Sensitivity 10pct base high reconciles',close(values['Sensibilidad']['I4'].value,1-R['plans'][0]['high_cost_usd']/(54000*.9)))
check('Extra monthly cost sensitivity',close(values['Sensibilidad']['J2'].value,1-(R['plans'][0]['central_cost_usd']+3600)/54000))
fc=sum(c.data_type=='f' for s in formula for row in s for c in row)
# Exercise the actual spreadsheet for activation off/on and invalid minimum, not just cached copies.
acts=read('activaciones-mensuales.csv')
with tempfile.TemporaryDirectory(prefix='pibank-hybrid-tests-') as t:
 p=Path(t);out=p/'out';out.mkdir();files=[]
 for plan in ['base','integral','invalid']:
  book=openpyxl.load_workbook(source);sel=book['Selector']
  for row in range(2,11):
   id=sel.cell(row,1).value
   for month in range(1,13):
    quantity=next(float(a['planning_units']) for a in acts if a['plan']==('base' if plan=='invalid' else plan) and a['module']==id and int(a['month'])==month)
    sel.cell(row,month+4,quantity)
  if plan=='invalid':sel['E7']=1 # community only one month must be flagged
  f=p/(plan+'.xlsx');book.save(f);files.append(f)
 r=subprocess.run(['/Users/jreye/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice',f'-env:UserInstallation={(p/"profile").as_uri()}','--headless','--convert-to','xlsx','--outdir',str(out)]+[str(f) for f in files],capture_output=True,text=True,timeout=55)
 assert r.returncode==0,r.stderr[:200]
 for plan in ['base','integral','invalid']:
  book=openpyxl.load_workbook(out/(plan+'.xlsx'),data_only=True)
  check('Recalculated no errors '+plan,not any(c.data_type=='e' for s in book for row in s for c in row))
  if plan=='invalid':check('Minimum activation detected',book['Presupuesto']['D24'].value>=1)
  else:
   pmodel=next(x for x in R['plans'] if x['plan']==plan)
   check('Recalculated fee '+plan,close(book['Presupuesto']['D15'].value,pmodel['total_planned_usd']))
   check('Recalculated cost '+plan,close(book['Presupuesto']['D19'].value,pmodel['central_cost_usd']))
   check('Recalculated valid scope '+plan,book['Presupuesto']['D24'].value==0)
report={'date':'2026-10-07','checks':checks,'pass':all(x['pass'] for x in checks),'formula_count':fc,'native_recalculation':'LibreOffice default and three alternate selections','excel_desktop':'not_operated'}
(D/'validacion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'pass':report['pass'],'checks':len(checks),'formulas':fc,'failed':[x['check'] for x in checks if not x['pass']]}));assert report['pass']
