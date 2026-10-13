"""Independent arithmetic, provenance and recalculated spreadsheet checks."""
from pathlib import Path
import csv,json,math,hashlib,sys
import openpyxl
D=Path(__file__).resolve().parent
ROOT=next(p for p in D.parents if (p/'package.json').exists())
I=json.loads((D/'inputs.json').read_text());R=json.loads((D/'resultados.json').read_text())
def rows(n):return list(csv.DictReader((D/n).open()))
checks=[]
def check(name,condition):
 checks.append({'check':name,'pass':bool(condition)})
def close(a,b):return math.isclose(float(a),float(b),abs_tol=1e-7,rel_tol=1e-9)
for x in json.loads((D/'fuentes-preservadas.json').read_text())['read_only_inputs']:
 check('Preserved '+x['path'],hashlib.sha256((ROOT/x['path']).read_bytes()).hexdigest()==x['sha256'])
families=rows('conexion-familias.csv');monthly=rows('trafico-mensual-por-familia.csv');articles=rows('produccion-y-oportunidades.csv')
check('19 original families once',len(families)==19 and len({x['family_id'] for x in families})==19)
check('5 rival families retained',len([x for x in families if x['lane']=='competitor'])==5)
check('Rival original volume 18300 retained',sum(float(x['estimated_monthly_query_volume']) for x in families if x['lane']=='competitor')==18300)
check('Monthly cross product',len(monthly)==19*12*3)
lookup={x['family_id']:x for x in families}
for sc,cap in I['capture_scenarios'].items():
 subset=[x for x in monthly if x['scenario']==sc]
 expected=sum(float(f['estimated_monthly_query_volume'])*cap*sum(I['maturity_by_age'][min(m-int(f['ready_month_planned']),6)] for m in range(int(f['ready_month_planned']),13)) for f in families)
 t=next(x for x in R['search_sensitivities'] if x['scenario']==sc)
 check('Independent annual traffic '+sc,close(expected,t['annual_visit_equivalents_test']))
 check('Original funnel '+sc,close(expected*.02*.65,t['annual_funded_test']))
 check('No rival capture penalty '+sc,all(close(x['effective_capture_assumption'],cap) for x in subset if x['lane']=='competitor'))
check('Original reverse full funded goal',close(R['preserved_goal']['visits_required_exact']*.02*.65,15200))
check('No manufactured global forecast',R['whole_program_incremental_forecast'] is None)
check('24 articles preserved',len(articles)==24 and len({x['id'] for x in articles})==24)
check('Both calendars preserve 2 articles monthly',all(sum(int(x[k])==m for x in articles)==2 for k in ['mes_propuesto','proposed_priority_month'] for m in range(1,13)))
check('Capacity covers core groups monthly',all(float(x['headroom_hours'])>=0 for x in rows('asignacion-equipo.csv')))
check('Expanded scope hours',sum(float(x['base_hours']) for x in rows('capacidad-por-mes.csv'))==2216)
for p in R['pricing']:
 check('Cost sum '+p['scenario'],close(p['annual_cost_test_usd'],p['labor_before_reserve_usd']+p['labor_reserve_usd']+p['tools_other_usd']))
 check('Gross margin '+p['scenario'],close(p['gross_margin_at_proposed_fee'],1-p['annual_cost_test_usd']/(8000*12)))
 check('Fee from gross margin '+p['scenario'],close(p['monthly_fee_at_40pct_margin_usd']*.6,p['monthly_cost_test_usd']))
book=Path(sys.argv[1]) if len(sys.argv)>1 else D/'Pibank-Conexion-demanda-plan-costeo.xlsx'
formula=openpyxl.load_workbook(book,data_only=False);values=openpyxl.load_workbook(book,data_only=True)
errors=[f'{s.title}!{c.coordinate}' for s in values for row in s for c in row if c.data_type=='e']
check('No spreadsheet error cells',not errors)
fc=sum(c.data_type=='f' for s in formula for row in s for c in row)
check('Spreadsheet formulas present',fc>3400)
check('Original goal displayed',values['Supuestos']['B4'].value==15200)
for n,t in enumerate(R['search_sensitivities'],2):
 for col,key in [('B','annual_visit_equivalents_test'),('C','annual_openings_test'),('D','annual_funded_test')]:check('Spreadsheet panel '+t['scenario']+col,close(values['Panel resumen'][f'{col}{n}'].value,t[key]))
for n,p in enumerate(R['pricing'],2):
 for col,key in [('E','annual_cost_test_usd'),('F','monthly_cost_test_usd'),('G','monthly_fee_at_40pct_margin_usd'),('I','gross_margin_at_proposed_fee')]:check('Spreadsheet cost '+p['scenario']+col,close(values['Precio'][f'{col}{n}'].value,p[key]))
report={'date':'2026-10-07','checks':checks,'pass':all(x['pass'] for x in checks),'formula_count':fc,'spreadsheet_errors':errors,'validated_workbook':str(book),'excel_desktop':'not_operated','new_paid_calls':0}
(D/'validacion.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'pass':report['pass'],'checks':len(checks),'formula_count':fc,'failed':[x['check'] for x in checks if not x['pass']]}))
assert report['pass']
