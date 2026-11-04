# Escenario INTERMEDIO Intermedica (04/11/2026). Mismo metodo que pricing-v3-propuesta-2026-10-28
# (build-scenarios.py + complete-scenarios-v2.py): workload -> scaffold -> demand -> quote -> assess.
# ECG-035 (Digital Strategist) no se usa: solo tiene costo localizado CO; la estrategia va como tarea
# 'digital-strategy' del lider (workaround documentado el 28/10). Nunca sobrescribe archivos.
import json,pathlib,subprocess,decimal
P=pathlib.Path(__file__).parent;D=decimal.Decimal
DATE='2026-11-04'
src=lambda ref:{'reference':ref,'effectiveFrom':DATE,'effectiveUntil':'2027-02-28','status':'estimated'}
def dump(name,data):
 p=P/name
 if p.exists(): raise RuntimeError('Refusing overwrite '+str(p))
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');return p
def run(name,args):
 r=subprocess.run(['pnpm','--silent','pricing:v3',*args],capture_output=True,text=True)
 dump(name+'.run.json',{'command':['pnpm','--silent','pricing:v3',*args],'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
 try: d=json.loads(r.stdout)
 except Exception: d={'output':r.stdout,'stderr':r.stderr}
 return r.returncode,d
def share(num,den): return str((D(num)/D(den)).quantize(D('0.000000000000000001'),rounding=decimal.ROUND_DOWN)).rstrip('0').rstrip('.') or '0'

# (key, offer, form, periods, [(lineId, profile, [(workId, label, hours)])], mediaCeiling, strategyTaskLine, backfillLine)
PERF='performance-commerce-distribution';CRE='creative-managed-service'
scenarios=[
 ('i-performance',PERF,'on_going',3,[
   ('lead','ECG-008',[('lead-direction','Direccion, relacion con cliente y comite mensual 60 min con preparacion',10),
                      ('lead-strategy','Estrategia por 2 lineas de negocio y mix de hasta 3 canales',6),
                      ('lead-hypotheses','3 hipotesis/mes: diseno, brief de test y decision (3 x 3 h)',9),
                      ('lead-reading','Lectura quincenal (2 x 2,5 h) + reporte mensual con recomendacion (5 h)',10),
                      ('lead-optimization','Supervision de pacing y decisiones de optimizacion',10)]),
   ('buyer','ECG-009',[('buyer-checks','8 chequeos programados/mes (8 x 2 h)',16),
                       ('buyer-campaigns','Configuracion y mantenimiento de hasta 6 campanas activas (6 x 2,5 h)',15),
                       ('buyer-variants','Montaje de variantes para 3 hipotesis (3 x 2 h)',6.5)])],2000,'lead','lead'),
 ('i-measurement',PERF,'on_going',3,[
   ('analyst','ECG-019',[('analyst-dashboard','Tablero segmentado por 2 lineas: conciliacion y calidad de datos',12),
                         ('analyst-reading','Datos para lectura quincenal y reporte mensual',6)]),
   ('tracking','ECG-031',[('tracking-maintenance','Mantenimiento mensual de hasta 6 eventos + QA de formularios y WhatsApp',7.5)])],None,None,None),
 ('i-creative',CRE,'on_going',3,[
   ('design','ECG-003',[('design-masters','6 maestras estaticas (6 x 2 h, incluye revision)',12),
                        ('design-adaptations','12 adaptaciones (12 x 0,5 h)',6)]),
   ('copy','ECG-011',[('copy-concepts','6 conceptos con copy (6 x 1,5 h)',9)])],None,None,None),
 ('i-web-conversion',PERF,'on_demand',1,[
   ('lead','ECG-008',[('lead-brief','Brief de oferta y revision por landing (2 x 2 h)',4)]),
   ('copy','ECG-011',[('copy-landing','Copy de 2 landings (2 x 4 h)',8)]),
   ('design','ECG-003',[('design-landing','Diseno de 2 landings sobre sistema existente (2 x 6 h)',12)]),
   ('web','ECG-012',[('web-build','Construccion WordPress, responsive, CTA formulario/WhatsApp, publicacion (2 x 10 h)',20)]),
   ('tracking','ECG-031',[('tracking-landing','Eventos y QA de medicion por landing (2 x 3 h)',6)])],None,'lead',None),
 ('i-preparation',PERF,'on_demand',1,[
   ('tracking','ECG-031',[('tracking-prep','Inventario 2 recorridos, hasta 15 destinos/CTAs, 1 formulario, hasta 6 eventos, tablero y QA',24)]),
   ('web','ECG-012',[('web-prep','Correcciones de destinos/CTAs y formulario en sitio existente',10)]),
   ('lead','ECG-008',[('lead-prep','Diccionario comercial, estrategia de recorridos y sesion de entrega',14)])],None,'lead',None),
]
results={}
for key,offer,form,periods,roles,media,stratLine,backfillLine in scenarios:
 lines=[]
 for lid,profile,_ in roles:
  line={'lineId':lid,'profile':profile,'talentCountry':'CL','headcount':1,'dedication':{'unit':'fte','value':'0.1'},'allocationMode':'shared','allocationPolicyId':'allocation:shared','kitId':'managed-service-core','choices':[]}
  if lid==backfillLine: line['choices']=[{'requirementId':'assurance','resourceId':'provision-backfill-coverage'}]
  lines.append(line)
 brief={'schemaVersion':'pricing-v3-brief/1','mode':'simulation','quoteDate':DATE,'offerId':offer,'engagementCode':'monthly','engagementForm':form,'accountId':'intermedica-pe-intermedio-2026-11-04','offerMarketCountry':'PE','outputCurrency':'USD','periods':periods,'lines':lines,'adjustments':[],'taxTreatment':{'kind':'not_resolved'}}
 if media:
  brief['thirdPartyCosts']=[{'costId':'media-client-direct','category':'media','label':'Techo de planificacion de medios; requiere aprobacion del cliente','supplier':'Plataformas publicitarias; mix por validar','settlement':'client_direct','amount':str(media),'currency':'USD','quantity':'1','periodIds':list(range(1,periods+1)),'evidence':src('intermedica:plan-intermedio-04nov:medios-client-direct-sin-compromiso')}]
 initial=dump(key+'.brief-input.json',brief)
 fixed=[];wl=[]
 for lid,_,works in roles:
  for wid,label,h in works: fixed.append({'workId':wid,'label':label,'hoursPerMonth':str(h),'source':src('intermedica:alcance-intermedio-04nov:'+key+':'+wid)})
  wl.append({'lineId':lid,'driverShares':[],'fixedWorkShares':[{'workId':wid,'share':'1'} for wid,_,_ in works],'reason':'Bloques estimados por entregables del escenario intermedio; validar con responsable de practica.'})
 workload={'schemaVersion':'pricing-v3-workload/1','version':'intermedica-'+key+'-2026-11-04-v1','mode':'simulation','capacity':{'productiveHoursPerFteMonth':'150','scheduledHoursPerFteMonth':'180','source':src('intermedica:estimacion-capacidad-150-productivas-180-programadas')},'drivers':[],'fixedWork':fixed,'lines':wl,'rounding':{'fteStep':'0.01'}}
 wp=dump(key+'.workload.json',workload)
 dim=P/(key+'.brief.json')
 code,data=run(key+'.workload',['compose','workload','--input',str(wp),'--brief',str(initial),'--out',str(dim)])
 print(key,'workload',code)
 if code!=0: print(json.dumps(data)[:3000]);continue
 scaffold=P/(key+'.scaffold.json')
 code,data=run(key+'.scaffold',['compose','scaffold','--current','--input',str(dim),'--out',str(scaffold)])
 if not scaffold.exists(): print('scaffold missing',code,json.dumps(data)[:3000]);continue
 demand=json.load(open(scaffold))
 totalfte=sum(D(x['dedication']['value']) for x in demand['brief']['lines']);n=len(roles);pl=list(range(1,periods+1))
 demand['allocations']=[]
 for tool in ['notion','microsoft-365']:
  demand['allocations'].append({'periodIds':pl,'toolId':tool,'priceId':'current','quantity':str(n),'serviceShare':share(totalfte,n),'driver':{'unit':'estimated-fte-of-whole-named-seats','totalUnits':str(n),'allocatedUnits':str(totalfte)},'reason':'Un asiento por cupo; la cuenta carga dedicacion modelada. Resto de capacidad por vender/validar.','evidence':src('intermedica:reparto-estimado-'+key+';sin-registro-asientos-confirmado')})
 dl=[x for x in demand['brief']['lines'] if x['lineId']=='design']
 if dl:
  designfte=D(dl[0]['dedication']['value'])
  demand['allocations'].append({'periodIds':pl,'toolId':'adobe','priceId':'current','quantity':'1','seatCapacity':3,'serviceShare':share(designfte,3),'driver':{'unit':'estimated-dedicated-fte-of-three-license-package','totalUnits':'3','allocatedUnits':str(designfte)},'reason':'Paquete oficial de tres licencias; una persona diseno, cargo segun dedicacion. Sin descuento.','evidence':src('intermedica:reparto-adobe-estimado-'+key+';factura-en-policy-v12')})
  demand['fxRecordIds']=['fx:CLP:USD']
 else: demand['fxRecordIds']=[]
 if stratLine:
  for w in demand['work']:
   if w['lineId']==stratLine: w['tasks']=['digital-strategy']
 dp=dump(key+'.demand.json',demand)
 artifact=P/(key+'.artifact.json')
 code,data=run(key+'.quote',['compose','quote','--current','--input',str(dp),'--out',str(artifact)])
 print(key,'quote',code,'artifact',artifact.exists())
 if artifact.exists():
  acode,assess=run(key+'.assess',['compose','assess','--input',str(artifact)])
  dump(key+'.assess.json',assess);dump(key+'.summary.json',data)
  print(' totals',data.get('totals'),'margin',data.get('marginRateRoundedDown'))
 else: print(json.dumps(data,ensure_ascii=False)[:4000])
