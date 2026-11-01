import json,pathlib,subprocess,decimal
P=pathlib.Path(__file__).parent;D=decimal.Decimal
keys=['a-performance-v2','a-creative','a-preparation-v2','b-performance-v2','b-creative','b-preparation-v2']
master={'schemaVersion':'intermedica-pricing-editorial-summary/1','preparedOn':'2026-10-28','currency':'USD','binding':False,'reviewStatus':'requires_review','taxTreatment':'not_resolved','quotes':{},'scenarios':{}}
for k in keys:
 d=json.loads(json.load(open(P/(k+'.quote.run.json')))['stdout']);a=json.load(open(P/(k+'.assess.json')));e=d['estimateExposure'];r=subprocess.run(['pnpm','--silent','pricing:v3','replay','--input',str(P/(k+'.artifact.json'))],capture_output=True,text=True);rp=P/(k+'.replay.json')
 if rp.exists():raise RuntimeError('Refusing overwrite')
 rp.write_text(json.dumps({'exitCode':r.returncode,'result':json.loads(r.stdout)},ensure_ascii=False,indent=2)+'\n')
 t=d['totals'];master['quotes'][k]={'artifact':k+'.artifact.json','replayDigest':d['replayDigest'],'replayExitCode':r.returncode,'net':t['net'],'cost':t['cost'],'averageMonthlyNet':t['averageMonthlyNet'],'periods':len(d['periods']),'marginRateRoundedDown':d['marginRateRoundedDown'],'belowPolicyFloor':a['margin']['belowPolicyFloor'],'flaggedLinePeriods':d['marginFloor']['flaggedLinePeriods'],'estimatedCost':e['estimatedCost'],'confirmedCost':e['confirmedCost'],'estimatedShareOfCost':e['estimatedShareOfCost'],'contingencyReserve':d.get('contingencyReserve'),'lineFte':[{'lineId':x['lineId'],'fte':x['dedication']['value'],'talentCountry':x['talentCountry']} for x in json.load(open(P/(k+'.demand.json')))['brief']['lines']]}
 print(k,'replay',r.returncode,'estimatedShare',e['estimatedShareOfCost'])
for s in ['a','b']:
 perf=master['quotes'][s+'-performance-v2'];cre=master['quotes'][s+'-creative'];prep=master['quotes'][s+'-preparation-v2'];media=D('1500' if s=='a' else '3000');money=lambda n:format(n,'.2f')
 baseTerm=D(perf['net'])+D(prep['net']);fullTerm=baseTerm+D(cre['net']);costsum=D(perf['cost'])+D(cre['cost'])+D(prep['cost'])
 master['scenarios'][s]={'performanceMonthly':perf['averageMonthlyNet'],'creativeMonthly':cre['averageMonthlyNet'],'servicesMonthlyWithCreative':money(D(perf['averageMonthlyNet'])+D(cre['averageMonthlyNet'])),'preparationOnce':prep['net'],'baseThreeMonthsPlusPreparation':money(baseTerm),'servicesThreeMonthsWithCreativePlusPreparation':money(fullTerm),'optionalClientDirectMediaMonthlyCeiling':money(media),'optionalClientDirectMediaThreeMonthsCeiling':money(media*3),'planningOutlayWithCreativeAndFullMediaCeilingBeforeTax':money(fullTerm+media*3),'modeledServiceCostWithCreativeOverHorizon':money(costsum),'modeledAggregateMarginWithCreative':str((fullTerm-costsum)/fullTerm),'firstServiceBlockWithCreativePlusPreparation':money(D(perf['averageMonthlyNet'])+D(cre['averageMonthlyNet'])+D(prep['net']))}
p=P/'EDITORIAL-PRICE-MASTER.json'
if p.exists():raise RuntimeError('Refusing overwrite')
p.write_text(json.dumps(master,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(master['scenarios'],indent=2))
