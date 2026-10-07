from pathlib import Path
import csv,json
import xlsxwriter
D=Path(__file__).resolve().parent
I=json.loads((D/'inputs.json').read_text()); R=json.loads((D/'resultados.json').read_text())
def read(name): return list(csv.DictReader((D/name).open()))
w=xlsxwriter.Workbook(D/'Pibank-Conexion-demanda-plan-costeo.xlsx');w.set_calc_mode('auto')
w.set_properties({'title':'Pibank · conexión demanda, ejecución y costo','author':'Efeonce','comments':'Anexo interno. Fuentes y embudo original preservados. Supuestos nuevos editables.'})
head=w.add_format({'bold':True,'bg_color':'#180C62','font_color':'white','text_wrap':True,'valign':'top'})
txt=w.add_format({'text_wrap':True,'valign':'top','font_size':10})
num=w.add_format({'num_format':'#,##0.00','valign':'top'})
inp=w.add_format({'num_format':'0.0000','font_color':'#0066AA','bg_color':'#EAF5FF'})
pct=w.add_format({'num_format':'0.0%'})
def sheet(name,headers,widths):
 s=w.add_worksheet(name);s.hide_gridlines(2);s.freeze_panes(1,1);s.set_row(0,36)
 for j,h in enumerate(headers):s.write(0,j,h,head);s.set_column(j,j,widths[j] if j<len(widths) else 25)
 return s
s=sheet('LEER PRIMERO',['Tema','Interpretación'],[29,110])
notes=[('Estado','Anexo de trabajo del 07-10-2026. Usa los volúmenes existentes de 19 familias; no reemplaza el Excel anterior.'),('Meta preservada','15.200 cuentas con fondos × USD 2.500 = USD 38m de referencia. A 2% de apertura y 65% de fondeo: 1.169.231 visitas requeridas.'),('Búsquedas rivales','Incluidas las cinco familias existentes, con sus volúmenes originales y sin descuento automático por marca.'),('Qué es nuevo','Hipótesis editables de captura y maduración; conexión con recursos del calendario; costo del alcance ampliado.'),('Lectura de resultados','La suma del panel es sensibilidad aritmética antes de conciliar solapamiento. No es forecast del programa ni aporte incremental demostrado. Cifras pequeñas no invalidan el resto del programa; tampoco se inflan para alcanzar la meta.'),('Otros mecanismos','PR, comunidad, marca y referencias IA se miden con datos reales. La mejora sobre tráfico existente se compara con una referencia y no se duplica como canal.'),('Costo propuesto',f"USD {R['proposed_fee_usd_month']:,.0f}/mes para revisión de Julio. Costos complementarios usan referencia seed, no cotizaciones. No es precio aprobado."),('Equipo','Reserva propuesta: 50% redacción, 30% diseño, 100% SEO. Valentina/diseñadores existentes reducen caja adicional sólo si hay disponibilidad; conservan costo económico.'),('Uso','Azul = hipótesis editable. Inputs de búsquedas copiados de fuente. Fórmulas incluyen resultados calculados localmente; Excel Desktop no operado.'),('Datos pendientes','Conversiones, tráfico de referencia y periodo bancario; capacidades individuales, costos fully loaded y terceros. Fondos no equivalen a beneficio bancario.')]
for r,(a,b) in enumerate(notes,1):s.write(r,0,a,head);s.write(r,1,b,txt);s.set_row(r,60)
s.activate()
p=sheet('Supuestos',['Variable','Valor','Procedencia'],[35,24,100]);refs={}
params=[('opening',I['opening_rate'],'Conservado del modelo original'),('funding',I['funding_rate'],'Conservado del modelo original'),('goal',15200,'Meta de cuentas con fondos aclarada por Julio'),('ticket',2500,'Referencia USD, no beneficio ni producto USD'),('reserve',I['delivery_reserve'],'Nueva provisión de trabajo/costo'),('loading',I['salary_loading_allowance'],'Provisión cargas; sustituir por costo real'),('margin',I['target_gross_margin'],'Objetivo de margen propuesto'),('fee',R['proposed_fee_usd_month'],'Fee propuesto, no aprobado')]
for k,v in I['capture_scenarios'].items():params.append(('capture_'+k,v,'Sensibilidad de captura efectiva; no dato medido'))
for a,v in enumerate(I['maturity_by_age']):params.append(('age_'+str(a),v,'Maduración hipotética desde recurso listo'))
for g in I['allocation']:
 params.append(('allocation_'+g,I['allocation'][g],'Asignación candidata de capacidad'))
 for n,scenario in enumerate(['bajo','central','alto']):params.append((g+'_'+scenario,I['salary_monthly_usd'][g][n],'Costo mensual aproximado entregado por Julio'))
for n,scenario in enumerate(['bajo','central','alto']):
 params.append(('seed_'+scenario,I['complementary_seed_rate_multiplier'][n],'Sensibilidad sobre referencia seed; no cotización'))
 params.append(('other_'+scenario,I['other_monthly_usd'][n],'Provisión herramientas/otros mensual'))
for r,(key,value,note) in enumerate(params,1):
 p.write(r,0,key,txt);p.write_number(r,1,value,inp);p.write(r,2,note,txt);refs[key]=f'Supuestos!$B${r+1}'
 if key.startswith(('capture_','age_','allocation_')) or key in ['opening','funding','reserve','loading']:p.data_validation(r,1,r,1,{'validate':'decimal','criteria':'between','minimum':0,'maximum':1})
 elif key=='margin':p.data_validation(r,1,r,1,{'validate':'decimal','criteria':'between','minimum':0,'maximum':.99})
 else:p.data_validation(r,1,r,1,{'validate':'decimal','criteria':'>=','value':0})
f=sheet('Familias',['ID','Familia','Carril','Consulta','Volumen fuente mensual','Mes listo','Activo','Fuente','Fecha volumen'],[10,29,16,39,23,15,28,65,27]);fr={}
families=read('conexion-familias.csv')
for r,x in enumerate(families,1):
 fr[x['family_id']]=r+1
 for j,k in [(0,'family_id'),(1,'family'),(2,'lane'),(3,'representative'),(6,'asset_planned'),(7,'source'),(8,'updated_at')]:f.write(r,j,x[k],txt)
 f.write_number(r,4,float(x['estimated_monthly_query_volume']),num);f.write_number(r,5,int(x['ready_month_planned']),inp);f.set_row(r,60)
 f.data_validation(r,5,r,5,{'validate':'integer','criteria':'between','minimum':1,'maximum':12})
t=sheet('Trafico por mes',['Escenario','Familia','Mes','Captura supuesto','Madurez supuesto','Visitas equivalentes de prueba','Aperturas prueba','Fondeadas prueba'],[19,12,10,23,23,29,24,24])
data=read('trafico-mensual-por-familia.csv');last=len(data)+1
for r,x in enumerate(data,1):
 er=r+1;dr=fr[x['family_id']];t.write(r,0,x['scenario']);t.write(r,1,x['family_id']);t.write_number(r,2,int(x['month']))
 t.write_formula(r,3,'='+refs['capture_'+x['scenario']],pct,float(x['effective_capture_assumption']))
 t.write_formula(r,4,f'=IF(C{er}<Familias!F{dr},0,INDEX({refs["age_0"]}:{refs["age_6"].split("!")[1]},MIN(C{er}-Familias!F{dr}+1,7)))',pct,float(x['maturity_assumption']))
 t.write_formula(r,5,f'=Familias!E{dr}*D{er}*E{er}',num,float(x['visit_equivalents_test']))
 t.write_formula(r,6,f'=F{er}*{refs["opening"]}',num,float(x['openings_test']))
 t.write_formula(r,7,f'=G{er}*{refs["funding"]}',num,float(x['funded_test']))
t.autofilter(0,0,len(data),7)
s=sheet('Panel resumen',['Escenario','Visitas equivalentes','Aperturas de prueba','Fondeadas de prueba','Lectura'],[20,25,24,24,95])
for r,x in enumerate(R['search_sensitivities'],1):
 er=r+1;s.write(r,0,x['scenario'],txt)
 for col,source,key in [(1,'F','annual_visit_equivalents_test'),(2,'G','annual_openings_test'),(3,'H','annual_funded_test')]:s.write_formula(r,col,f'=SUMIF(\'Trafico por mes\'!$A$2:$A${last},A{er},\'Trafico por mes\'!${source}$2:${source}${last})',num,x[key])
 s.write(r,4,'Panel parcial con solapamiento residual. No resultado global de SEO/AEO + PR + comunidad ni forecast incremental. Lag de fondeo 0 conservado del modelo original.',txt);s.set_row(r,75)
c=sheet('Costeo',['Escenario','Grupo','Horas base','Costo unidad referencia','Costo anual antes reserva','Base del cálculo'],[17,22,19,28,30,80])
costs=read('costeo-interno.csv')
for r,x in enumerate(costs,1):
 er=r+1;g=x['group'];sc=x['scenario'];c.write(r,0,sc,txt);c.write(r,1,g,txt);c.write_number(r,2,float(x['base_hours']),num)
 c.write_number(r,3,float(x['unit_cost_usd']),num)
 formula=f'={refs[g+"_"+sc]}*{refs["allocation_"+g]}*12*(1+{refs["loading"]})' if g in I['allocation'] else f'=C{er}*D{er}*{refs["seed_"+sc]}'
 c.write_formula(r,4,formula,num,float(x['annual_cost_before_reserve_usd']));c.write(r,5,x['basis'],txt);c.set_row(r,45)
pr=sheet('Precio',['Escenario','Costo laboral','Reserva trabajo','Herramientas/otros','Costo anual','Costo mensual','Fee mensual al margen elegido','Fee propuesto','Margen al fee propuesto'],[18,23,23,24,23,23,28,23,24]);end=len(costs)+1
for r,x in enumerate(R['pricing'],1):
 er=r+1;sc=x['scenario'];pr.write(r,0,sc)
 for col,form,key in [(1,f'=SUMIF(Costeo!A2:A{end},A{er},Costeo!E2:E{end})','labor_before_reserve_usd'),(2,f'=B{er}*{refs["reserve"]}','labor_reserve_usd'),(3,f'={refs["other_"+sc]}*12','tools_other_usd'),(4,f'=SUM(B{er}:D{er})','annual_cost_test_usd'),(5,f'=E{er}/12','monthly_cost_test_usd'),(6,f'=F{er}/(1-{refs["margin"]})','monthly_fee_at_40pct_margin_usd'),(7,'='+refs['fee'],'monthly_fee_proposed_usd'),(8,f'=(H{er}-F{er})/H{er}','gross_margin_at_proposed_fee')]:pr.write_formula(r,col,form,pct if col==8 else num,x[key])
pr.merge_range(6,0,8,8,'Costeo económico, no caja incremental confirmada. Referencia seed y provisiones no son costos fully loaded validados. Un fee en esta hoja no aprueba la oferta. El costo interno no se incorpora al deck del cliente.',txt)
for name,file in [('Trabajo','capacidad-por-mes.csv'),('Asignacion','asignacion-equipo.csv'),('Conversion existente','conversion-trafico-existente.csv'),('Aporte por familia','aporte-por-familia.csv'),('24 articulos','produccion-y-oportunidades.csv'),('Prioridad calendario','sensibilidad-prioridad-calendario.csv')]:
 data=read(file);s=sheet(name,list(data[0]),[27]*len(data[0]))
 for r,x in enumerate(data,1):
  for j,v in enumerate(x.values()):
   try:s.write_number(r,j,float(v),num)
   except ValueError:s.write(r,j,v,txt)
  s.set_row(r,46)
 s.set_footer('&LPlan fuente: regenerar si cambian inputs.&R&P')
so=sheet('Fuentes',['Archivo','SHA256'],[110,75]);sources=json.loads((D/'fuentes-preservadas.json').read_text())
for r,x in enumerate(sources['read_only_inputs'],1):so.write(r,0,x['path'],txt);so.write(r,1,x['sha256'],txt);so.set_row(r,48)
w.close();print(D/'Pibank-Conexion-demanda-plan-costeo.xlsx')
