import json,pathlib,subprocess,decimal
P=pathlib.Path(__file__).parent
D=decimal.Decimal
src=lambda ref:{'reference':ref,'effectiveFrom':'2026-10-28','effectiveUntil':'2027-02-28','status':'estimated'}
def dump(name,data):
 p=P/name
 if p.exists(): raise RuntimeError('Refusing overwrite '+str(p))
 p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 return p

def run(name,args):
 r=subprocess.run(['pnpm','--silent','pricing:v3',*args],capture_output=True,text=True)
 dump(name+'.run.json',{'command':['pnpm','--silent','pricing:v3',*args],'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
 try: d=json.loads(r.stdout)
 except: d={'output':r.stdout}
 return r.returncode,d

scenarios=[
 ('a-performance','performance-commerce-distribution','on_going',3,[('media','ECG-008','37.5'),('data','ECG-019','7.5'),('strategy','ECG-035','7.5')],1500),
 ('b-performance','performance-commerce-distribution','on_going',3,[('media','ECG-008','75'),('buyer','ECG-009','37.5'),('data','ECG-019','22.5'),('strategy','ECG-035','15')],3000),
 ('a-creative','creative-managed-service','on_going',3,[('design','ECG-003','12'),('copy','ECG-011','6')],None),
 ('b-creative','creative-managed-service','on_going',3,[('design','ECG-003','24'),('copy','ECG-011','12')],None),
 ('a-preparation','performance-commerce-distribution','on_demand',1,[('measure','ECG-031','18'),('web','ECG-012','8'),('media','ECG-008','6'),('strategy','ECG-035','4')],None),
 ('b-preparation','performance-commerce-distribution','on_demand',1,[('measure','ECG-031','30'),('web','ECG-012','12'),('media','ECG-008','12'),('strategy','ECG-035','6')],None)
]
for key,offer,form,periods,roles,media in scenarios:
 lines=[]
 for lid,profile,hours in roles:
  line={'lineId':lid,'profile':profile,'talentCountry':'CL','headcount':1,'dedication':{'unit':'fte','value':'0.1'},'allocationMode':'shared','allocationPolicyId':'allocation:shared','kitId':'managed-service-core','choices':[]}
  if lid=='media' and form=='on_going': line['choices']=[{'requirementId':'assurance','resourceId':'provision-backfill-coverage'}]
  lines.append(line)
 brief={'schemaVersion':'pricing-v3-brief/1','mode':'simulation','quoteDate':'2026-10-28','offerId':offer,'engagementCode':'monthly','engagementForm':form,'accountId':'intermedica-pe-propuesta-2026-10-28','offerMarketCountry':'PE','outputCurrency':'USD','periods':periods,'lines':lines,'adjustments':[],'taxTreatment':{'kind':'not_resolved'}}
 if media:
  brief['thirdPartyCosts']=[{'costId':'media-client-direct','category':'media','label':'Techo orientativo de medios; requiere aprobacion del cliente','supplier':'Plataformas publicitarias; mix por validar','settlement':'client_direct','amount':str(media),'currency':'USD','quantity':'1','periodIds':list(range(1,periods+1)),'evidence':src('intermedica:plan-estimado-28oct:medios-client-direct-sin-compromiso')}]
 initial=dump(key+'.brief-input.json',brief)
 workload={'schemaVersion':'pricing-v3-workload/1','version':'intermedica-'+key+'-2026-10-28-v1','mode':'simulation','capacity':{'productiveHoursPerFteMonth':'150','scheduledHoursPerFteMonth':'180','source':src('intermedica:estimacion-capacidad-150-productivas-180-programadas')},'drivers':[],'fixedWork':[{'workId':lid+'-scope','label':key+': bloque de trabajo '+lid,'hoursPerMonth':hours,'source':src('intermedica:alcance-y-bloques-estimados-28oct:'+key+':'+lid)} for lid,_,hours in roles],'lines':[{'lineId':lid,'driverShares':[],'fixedWorkShares':[{'workId':lid+'-scope','share':'1'}],'reason':'Bloque estimado por entregables; validar con responsable de practica.'} for lid,_,_ in roles],'rounding':{'fteStep':'0.01'}}
 wp=dump(key+'.workload.json',workload)
 dim=P/(key+'.brief.json')
 code,data=run(key+'.workload',['compose','workload','--input',str(wp),'--brief',str(initial),'--out',str(dim)])
 print(key,'workload',code)
 if code!=0: print(json.dumps(data)[:2500]);continue
 scaffold=P/(key+'.scaffold.json')
 code,data=run(key+'.scaffold',['compose','scaffold','--current','--input',str(dim),'--out',str(scaffold)])
 if not scaffold.exists(): print('scaffold missing',code,json.dumps(data)[:3000]);continue
 demand=json.load(open(scaffold))
 # Allocate whole named seats with the estimated service dedication; no purchased-seat claim.
 totalfte=sum(D(x['dedication']['value']) for x in demand['brief']['lines'])
 n=len(roles)
 def share(num,den): return str((D(num)/D(den)).quantize(D('0.000000000000000001'),rounding=decimal.ROUND_DOWN)).rstrip('0').rstrip('.') or '0'
 periodslist=list(range(1,periods+1))
 demand['allocations']=[]
 for tool in ['notion','microsoft-365']:
  demand['allocations'].append({'periodIds':periodslist,'toolId':tool,'priceId':'current','quantity':str(n),'serviceShare':share(totalfte,n),'driver':{'unit':'estimated-fte-of-whole-named-seats','totalUnits':str(n),'allocatedUnits':str(totalfte)},'reason':'Un asiento por cupo; la cuenta carga dedicacion modelada. Resto de capacidad por vender/validar.','evidence':src('intermedica:reparto-estimado-'+key+';sin-registro-asientos-confirmado')})
 if 'creative' in key:
  designfte=next(D(x['dedication']['value']) for x in demand['brief']['lines'] if x['lineId']=='design')
  demand['allocations'].append({'periodIds':periodslist,'toolId':'adobe','priceId':'current','quantity':'1','seatCapacity':3,'serviceShare':share(designfte,3),'driver':{'unit':'estimated-dedicated-fte-of-three-license-package','totalUnits':'3','allocatedUnits':str(designfte)},'reason':'Paquete oficial de tres licencias; una persona diseno, cargo segun dedicacion. Sin descuento.','evidence':src('intermedica:reparto-adobe-estimado-'+key+';factura-en-policy-v12')})
  demand['fxRecordIds']=['fx:CLP:USD']
 else: demand['fxRecordIds']=[]
 dp=dump(key+'.demand.json',demand)
 artifact=P/(key+'.artifact.json')
 code,data=run(key+'.quote',['compose','quote','--current','--input',str(dp),'--out',str(artifact)])
 print(key,'quote',code,'artifact',artifact.exists())
 if artifact.exists():
  acode,assess=run(key+'.assess',['compose','assess','--input',str(artifact)])
  dump(key+'.assess.json',assess)
  print('assess',acode,'keys',list(assess.keys()))
 else: print(json.dumps(data,ensure_ascii=False)[:3500])
