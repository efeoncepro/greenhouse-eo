from pathlib import Path
import csv,json
import xlsxwriter
from xlsxwriter.utility import xl_col_to_name
D=Path(__file__).resolve().parent
R=json.loads((D/'resultados.json').read_text())
def rows(name):return list(csv.DictReader((D/name).open()))
C=rows('costeo-por-capacidad.csv');A=rows('activaciones-mensuales.csv')
W=xlsxwriter.Workbook(D/'Pibank-Oferta-hibrida.xlsx');W.set_calc_mode('auto')
W.set_properties({'title':'Pibank · oferta híbrida y selector de capacidades','author':'Efeonce','comments':'Propuesta interna; no activa servicios ni cambia el modelo de demanda.'})
H=W.add_format({'bold':True,'bg_color':'#180C62','font_color':'white','text_wrap':True,'valign':'top'})
T=W.add_format({'text_wrap':True,'valign':'top','font_size':10})
N=W.add_format({'num_format':'#,##0.00','valign':'top'})
P=W.add_format({'num_format':'0.0%','valign':'top'})
I=W.add_format({'bg_color':'#EAF5FF','font_color':'#0066AA','num_format':'#,##0.00','valign':'top'})
def sheet(name,headers,widths):
 s=W.add_worksheet(name);s.hide_gridlines(2);s.freeze_panes(1,2);s.set_row(0,35)
 for j,h in enumerate(headers):s.write(0,j,h,H);s.set_column(j,j,widths[j] if j<len(widths) else 24)
 return s
s=sheet('LEER PRIMERO',['Decisión','Lectura'],[29,110]);s.activate()
notes=[('Propuesta actual','Base US$4.500/mes + activaciones. Sustituye la recomendación fija US$8.000, preservada como antecedente.'),('Qué conserva','La investigación de 19 familias, meta 15.200 cuentas con fondos y embudo original. Este libro modifica empaque, selección y presupuesto; no recalcula demanda.'),('Base','Servicio anual. Incluye hasta 5 artículos/mes, mejoras según evidencia sin cuota FAQ, SEO/AEO, schema e implementación priorizada, medición, CRO y dirección. Reserva costo completo del SEO.'),('Selector','Azul = selección/precio editable; empieza con ruta gradual. Base de 12 meses. Proyectos 0,5/0,5 representan hitos de una sola compra.'),('Ruta gradual','US$79.200/año: hasta 60 artículos, 10 meses comunidad/distribución, 2 PR, 2 refuerzos PR, hub, calculadora y comparador. Campañas M3/M8, refuerzos M6/M11. Planificador diferido.'),('Ruta integral','US$89.200/año: recupera el alcance completo. No es equivalente a pagar sólo el fee base.'),('Presupuesto','Cada mes refleja reserva presupuestaria de activaciones; fechas exactas de facturación se pactan por orden. Promedio anual no equivale a cuota mensual.'),('Costos internos','Costos fuente conservados; capacidad actualizada a 5 artículos/mes. SEO y redactor completos en base. PR incluye mapa inicial en primera activación. No enviar esta hoja de costos al banco.'),('Ciclo evolutivo','Investigar → priorizar → producir/mejorar → medir. Actualizaciones sustanciales pueden ocupar espacios acordados; ajustes menores no se cuentan como nuevos artículos. Ver MODELO-EVOLUTIVO.md.'),('Reserva de capacidad','SEO y redactor completos son una provisión económica, no dedicación exclusiva. Referencia productiva: 120h/mes; revisar disponibilidad real. No se prometen retoques por calendario.'),('Dependencias','Hub o infraestructura equivalente para publicar; recursos aprobados para PR; herramienta entregada para mantenimiento. El selector requiere revisión operativa.'),('AEO ampliado','24 preguntas y tres superficies: 72 observaciones en M1, 144/mes desde M2. 92h adicionales dentro del costo SEO ya reservado; confirmar productividad y acceso al iniciar.'),('Sensibilidad','Hoja interna: descuentos hipotéticos de 0/5/10% y sobrecosto adicional US$300/mes. No autoriza descuento ni altera precios del catálogo.'),('Validación','Fórmulas recalculables. Ninguna celda activa contratos, servicios, mensajes o facturas. Excel Desktop no operado.')]
for r,(a,b) in enumerate(notes,1):s.write(r,0,a,H);s.write(r,1,b,T);s.set_row(r,58)
cat=sheet('Catalogo',['ID','Capacidad','Precio USD editable','Unidad','Unidades ruta integral','Costo central por unidad','Costo PR inicial central','Costo alto por unidad','Costo PR inicial alto','Alcance'],[18,33,25,19,23,24,24,24,24,90])
for r,x in enumerate(R['catalog'],1):
 c=next(z for z in C if z['scenario']=='central' and z['module']==x['id']);high=next(z for z in C if z['scenario']=='alto' and z['module']==x['id'])
 cat.write(r,0,x['id'],T);cat.write(r,1,x['capability'],T);cat.write_number(r,2,x['price_usd'],I);cat.write(r,3,x['billing_unit'],T);cat.write_number(r,4,x['full_plan_units'],N)
 for col,v in [(5,c['cost_per_unit_variable']),(6,c['first_activation_extra']),(7,high['cost_per_unit_variable']),(8,high['first_activation_extra'])]:cat.write_number(r,col,float(v),N)
 cat.write(r,9,x['scope'],T);cat.set_row(r,65);cat.data_validation(r,2,r,2,{'validate':'decimal','criteria':'>','value':0})
sel=sheet('Selector',['ID','Capacidad','Precio USD','Unidad']+[f'M{m}' for m in range(1,13)]+['Unidades año','Control alcance'],[18,33,18,20]+[12]*12+[18,75])
recurring={'BASE','COMUNIDAD','CUIDADO'};project={'HUB','CALCULADORA','COMPARADOR','PLANIFICADOR'}
for r,x in enumerate(R['catalog'],1):
 er=r+1;id=x['id'];qs=[next(a for a in A if a['plan']=='gradual' and a['module']==id and int(a['month'])==m) for m in range(1,13)];total=sum(float(a['planning_units']) for a in qs)
 sel.write(r,0,id,T);sel.write(r,1,x['capability'],T);sel.write_formula(r,2,f'=Catalogo!C{er}',N,x['price_usd']);sel.write(r,3,x['billing_unit'],T)
 for m,a in enumerate(qs,4):
  sel.write_number(r,m,float(a['planning_units']),I)
  sel.data_validation(r,m,r,m,{'validate':'list','source':['1'] if id=='BASE' else ['0','0.5','1'] if id in project else ['0','1']})
 sel.write_formula(r,16,f'=SUM(E{er}:P{er})',N,total)
 if id=='BASE':formula=f'=IF(AND(MIN(E{er}:P{er})=1,MAX(E{er}:P{er})=1),"OK","BASE: requiere 12 meses")'
 elif id in project:formula=f'=IF(OR(Q{er}=0,Q{er}=1),"OK","REVISAR: proyecto parcial o repetido")'
 elif id in ['COMUNIDAD']:
  starts=[]
  for c in range(4,16):
   cur=f'{xl_col_to_name(c)}{er}';prev='0' if c==4 else f'{xl_col_to_name(c-1)}{er}'
   span='+'.join(f'{xl_col_to_name(j)}{er}' for j in range(c,min(c+3,16)))
   starts.append(f'AND({cur}=1,{prev}=0,({span})<3)')
  formula='=IF(OR('+','.join(starts)+'),"REVISAR: bloque menor a 3 meses","OK")'
 else:formula=f'=IF(Q{er}<=Catalogo!E{er},"OK","REVISAR: ampliar capacidad antes de contratar")'
 sel.write_formula(r,17,formula,T,'OK');sel.set_row(r,50)
b=sheet('Presupuesto',['Mes / decisión','Base USD','Activaciones USD','Total USD','Lectura'],[25,23,25,23,95]);grad=next(x for x in R['plans'] if x['plan']=='gradual')
for m in range(1,13):
 er=m+1;col=xl_col_to_name(3+m);base=4500;optional=sum(float(a['planned_fee_usd']) for a in A if a['plan']=='gradual' and int(a['month'])==m and a['module']!='BASE')
 b.write(m,0,'M'+str(m),T);b.write_formula(m,1,f'=Selector!{col}2*Selector!C2',N,base)
 b.write_formula(m,2,f'=SUMPRODUCT(Selector!{col}3:{col}10,Selector!$C$3:$C$10)',N,optional)
 b.write_formula(m,3,f'=SUM(B{er}:C{er})',N,base+optional)
 b.write(m,4,'Reserva por activaciones previstas; no factura emitida.',T)
b.write(14,0,'Total anual',H);b.write_formula(14,1,'=SUM(B2:B13)',N,54000);b.write_formula(14,2,'=SUM(C2:C13)',N,25200);b.write_formula(14,3,'=SUM(D2:D13)',N,79200)
b.write(15,0,'Promedio mensual',T);b.write_formula(15,3,'=D15/12',N,6600)
b.write(16,0,'Máximo mes',T);b.write_formula(16,3,'=MAX(D2:D13)',N,grad['peak_monthly_usd'])
b.write(18,0,'Costo central anual',T);b.write_formula(18,3,'=SUMPRODUCT(Selector!Q2:Q10,Catalogo!F2:F10)+SUMPRODUCT(--(Selector!Q2:Q10>0),Catalogo!G2:G10)',N,grad['central_cost_usd'])
b.write(19,0,'Margen central',T);b.write_formula(19,3,'=IFERROR(1-D19/D15,0)',P,grad['central_gross_margin'])
b.write(20,0,'Costo alto anual',T);b.write_formula(20,3,'=SUMPRODUCT(Selector!Q2:Q10,Catalogo!H2:H10)+SUMPRODUCT(--(Selector!Q2:Q10>0),Catalogo!I2:I10)',N,grad['high_cost_usd'])
b.write(21,0,'Margen costo alto',T);b.write_formula(21,3,'=IFERROR(1-D21/D15,0)',P,grad['high_cost_gross_margin'])
b.write(23,0,'Controles de selección',T);b.write_formula(23,3,'=COUNTIF(Selector!R2:R10,"<>OK")',N,0)
b.merge_range(25,0,27,4,'Revisar también dependencias, personas disponibles y fechas antes de emitir una orden. Estos controles no autorizan contratación. Costos del libro son internos; la propuesta cliente muestra precios y alcance.',T)
for name,file in [('Comparacion','comparacion-planes.csv'),('Costeo trazable','costeo-por-capacidad.csv'),('Capacidad','capacidad-asignada.csv')]:
 data=rows(file);s=sheet(name,list(data[0]),[26]*len(data[0]))
 for r,x in enumerate(data,1):
  for c,v in enumerate(x.values()):
   try:s.write_number(r,c,float(v),N)
   except ValueError:s.write(r,c,v,T)
  s.set_row(r,45)
 s.set_footer('&LRuta de referencia; regenerar si cambian costos o precios.&R&P')
sens=sheet('Sensibilidad',['Ruta','Venta anual actual','Costo central','Costo alto','Descuento hipotético','Sobrecosto mensual hipotético','Venta con descuento','Margen central','Margen costo alto','Margen central con sobrecosto'],[19,24,22,22,23,27,25,22,22,29])
r=1
for plan in R['plans']:
 for discount in [0,.05,.10]:
  er=r+1;fee=plan['total_planned_usd'];central=plan['central_cost_usd'];high=plan['high_cost_usd'];net=fee*(1-discount)
  sens.write(r,0,plan['plan'],T)
  for c,num in [(1,fee),(2,central),(3,high)]:sens.write_number(r,c,num,N)
  sens.write_number(r,4,discount,P);sens.write_number(r,5,300,I)
  sens.write_formula(r,6,f'=B{er}*(1-E{er})',N,net)
  sens.write_formula(r,7,f'=1-C{er}/G{er}',P,1-central/net)
  sens.write_formula(r,8,f'=1-D{er}/G{er}',P,1-high/net)
  sens.write_formula(r,9,f'=1-(C{er}+12*F{er})/G{er}',P,1-(central+3600)/net)
  sens.set_row(r,38);r+=1
sens.merge_range(r+1,0,r+2,9,'Uso interno: costos provisionales; escenarios no son descuentos autorizados. Sobrecosto se aplica por encima de la reserva ya incluida. El costo completo SEO/redactor no acredita dedicación exclusiva. Confirmar personas, proveedores y condiciones de pago antes de formalizar.',T)
f=sheet('Fuentes',['Archivo original','SHA256'],[105,75])
for r,x in enumerate(R['source_hashes'],1):f.write(r,0,x['path'],T);f.write(r,1,x['sha256'],T);f.set_row(r,45)
W.close();print(D/'Pibank-Oferta-hibrida.xlsx')
