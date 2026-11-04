# Replay de los 5 artefactos + master numerico del escenario intermedio. Solo suma netos de artefactos V3.
import json,pathlib,subprocess,decimal
P=pathlib.Path(__file__).parent;D=decimal.Decimal
keys=['i-performance','i-measurement','i-creative','i-web-conversion','i-preparation']
m={'schemaVersion':'intermedica-pricing-editorial-summary/1','scenario':'intermedio','preparedOn':'2026-11-04','currency':'USD','binding':False,'reviewStatus':'requires_review','taxTreatment':'not_resolved','internalOnly':['cost','marginRateRoundedDown','estimatedShareOfCost','lineFte','hours'],'quotes':{},'totals':{}}
for k in keys:
 d=json.load(open(P/(k+'.summary.json')));a=json.load(open(P/(k+'.assess.json')));dm=json.load(open(P/(k+'.demand.json')));wl=json.load(open(P/(k+'.workload.json')))
 r=subprocess.run(['pnpm','--silent','pricing:v3','replay','--input',str(P/(k+'.artifact.json'))],capture_output=True,text=True)
 rp=P/(k+'.replay.json')
 if rp.exists(): raise RuntimeError('Refusing overwrite')
 rp.write_text(json.dumps({'exitCode':r.returncode,'result':json.loads(r.stdout)},ensure_ascii=False,indent=2)+'\n')
 t=d['totals'];e=d['estimateExposure']
 m['quotes'][k]={'artifact':k+'.artifact.json','offerId':dm['brief']['offerId'],'engagementForm':dm['brief']['engagementForm'],'periods':len(d['periods']),'net':t['net'],'averageMonthlyNet':t['averageMonthlyNet'],'cost':t['cost'],'contingencyReserve':t.get('contingencyReserve'),'marginRateRoundedDown':d['marginRateRoundedDown'],'policy':{'target':a['margin']['pricingPolicies'][0]['rate'],'floor':a['margin']['pricingPolicies'][0]['minimumMargin']},'belowPolicyFloor':a['margin']['belowPolicyFloor'],'flaggedLinePeriods':d['marginFloor']['flaggedLinePeriods'],'estimatedShareOfCost':e['estimatedShareOfCost'],'replayDigest':d['replayDigest'],'replayExitCode':r.returncode,'quoteExitCode':json.load(open(P/(k+'.quote.run.json')))['exitCode'],'runNotices':d.get('runNotices'),'gaps':sorted({g.get('code') for g in a.get('gaps',[])}),'lineFte':[{'lineId':x['lineId'],'profile':x['profile'],'fte':x['dedication']['value'],'talentCountry':x['talentCountry']} for x in dm['brief']['lines']],'hoursPerMonth':{w['workId']:w['hoursPerMonth'] for w in wl['fixedWork']}}
 print(k,'replay',r.returncode)
q=m['quotes'];mon=lambda x:D(q[x]['averageMonthlyNet']);money=lambda n:format(n,'.2f')
base=mon('i-performance')+mon('i-measurement');withc=base+mon('i-creative');prep=D(q['i-preparation']['net']);web=D(q['i-web-conversion']['net'])
cost=lambda ks:sum(D(q[x]['cost']) for x in ks);net=lambda ks:sum(D(q[x]['net']) for x in ks)
m['totals']={'monthlyWithoutCreative':money(base),'monthlyWithCreative':money(withc),'preparationOnce':money(prep),'webConversionOnceOptional':money(web),
 'prepPlus3MonthsWithoutCreative':money(prep+3*base),'prepPlus3MonthsWithCreative':money(prep+3*withc),'prepPlus3MonthsWithCreativeAndWeb':money(prep+3*withc+web),
 'mediaCeilingMonthlyClientDirect':'2000.00','mediaCeiling3MonthsClientDirect':'6000.00',
 'internal':{'costPrepPlus3MonthsWithCreative':money(cost(['i-performance','i-measurement','i-creative','i-preparation'])),'aggregateMarginWithCreative':str(((net(['i-performance','i-measurement','i-creative','i-preparation'])-cost(['i-performance','i-measurement','i-creative','i-preparation']))/net(['i-performance','i-measurement','i-creative','i-preparation'])).quantize(D('0.0001'),rounding=decimal.ROUND_DOWN))}}
p=P/'EDITORIAL-PRICE-MASTER.json'
if p.exists(): raise RuntimeError('Refusing overwrite')
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n');print(json.dumps(m['totals'],indent=1))
