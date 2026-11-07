import json,pathlib,subprocess,decimal
P=pathlib.Path(__file__).parent;D=decimal.Decimal

def save(p,d):
 if p.exists(): raise RuntimeError('Refusing overwrite '+str(p))
 p.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n');return p

def run(key,args):
 r=subprocess.run(['pnpm','--silent','pricing:v3',*args],capture_output=True,text=True)
 save(P/(key+'.run.json'),{'command':['pnpm','--silent','pricing:v3',*args],'exitCode':r.returncode,'stdout':r.stdout,'stderr':r.stderr})
 return r.returncode,json.loads(r.stdout)

def fraction(a,b):return str((D(a)/D(b)).quantize(D('0.000000000000000001'),rounding=decimal.ROUND_DOWN)).rstrip('0').rstrip('.')
for base in ['a-performance','b-performance','a-preparation','b-preparation']:
 key=base+'-v2';brief=json.load(open(P/(base+'.brief-input.json')));brief['lines']=[x for x in brief['lines'] if x['lineId']!='strategy']
 ip=save(P/(key+'.brief-input.json'),brief)
 workload=json.load(open(P/(base+'.workload.json')));workload['version']='intermedica-'+key+'-2026-10-28'
 strategy=next(x for x in workload['fixedWork'] if x['workId']=='strategy-scope');media=next(x for x in workload['fixedWork'] if x['workId']=='media-scope');media['hoursPerMonth']=str(D(media['hoursPerMonth'])+D(strategy['hoursPerMonth']));media['label']='Direccion, estrategia y operacion de medios del mismo responsable'
 workload['fixedWork']=[x for x in workload['fixedWork'] if x['workId']!='strategy-scope'];workload['lines']=[x for x in workload['lines'] if x['lineId']!='strategy']
 wp=save(P/(key+'.workload.json'),workload);bp=P/(key+'.brief.json');code,d=run(key+'.workload',['compose','workload','--input',str(wp),'--brief',str(ip),'--out',str(bp)])
 if code!=0:print(key,'workloadfail',d);continue
 sp=P/(key+'.scaffold.json');code,d=run(key+'.scaffold',['compose','scaffold','--current','--input',str(bp),'--out',str(sp)])
 demand=json.load(open(sp));n=len(demand['brief']['lines']);fte=sum(D(x['dedication']['value']) for x in demand['brief']['lines']);periods=list(range(1,demand['brief']['periods']+1));old=json.load(open(P/(base+'.demand.json')))
 demand['allocations']=[]
 for olda in old['allocations']:
  a=olda.copy();a.update(quantity=str(n),serviceShare=fraction(fte,n));a['driver']={'unit':'estimated-fte-of-whole-named-seats','totalUnits':str(n),'allocatedUnits':str(fte)};demand['allocations'].append(a)
 for w in demand['work']:
  if w['lineId']=='media':w['tasks']=['digital-strategy']
 dp=save(P/(key+'.demand.json'),demand);ap=P/(key+'.artifact.json');code,d=run(key+'.quote',['compose','quote','--current','--input',str(dp),'--out',str(ap)])
 print(key,'quote',code,'calculated',ap.exists(),'totals',d.get('totals'))
 if ap.exists():
  code,assess=run(key+'.assess',['compose','assess','--input',str(ap)]);save(P/(key+'.assess.json'),assess);save(P/(key+'.summary.json'),d)
  print('margin',d.get('marginRateRoundedDown'),'reserve',d.get('contingencyReserve'),'gaps',[(x.get('code'),x.get('severity')) for x in assess.get('gaps',[])])
 else:print('DIAGNOSTICS',d.get('diagnostics'))
