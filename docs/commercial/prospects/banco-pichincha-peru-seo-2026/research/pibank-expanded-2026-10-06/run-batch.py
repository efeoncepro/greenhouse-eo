from pathlib import Path
import json,subprocess,sys
r=Path(__file__).resolve().parent
plan=json.loads((r/sys.argv[1]).read_text())
ledger_path=r/'request-ledger.json'
ledger=json.loads(ledger_path.read_text()) if ledger_path.exists() else {'ceiling_usd':2,'requests':[]}
if any(x.get('cost_usd') is None for x in ledger['requests']):
 raise SystemExit('unknown_cost_in_ledger: reconcile previous request before any new paid step; no automatic retry')
for request in plan['requests']:
 key=request['id']
 if any(x['id']==key for x in ledger['requests']):
  print(key,'already_recorded',flush=True);continue
 spent=sum(x.get('cost_usd') or 0 for x in ledger['requests'])
 if spent+request['estimate_usd']>2:raise SystemExit('research_ceiling_before_request')
 payload=r/(key+'-request.json');payload.write_text(json.dumps([request['task']],ensure_ascii=False,indent=2))
 out=r/(key+'-provider.json')
 args=['pnpm','dataforseo','--','run',request['endpoint'],'--file',str(payload),'--consumer','seo','--org','org-2df565fb-98aa-42f7-b324-ea9a2209017f','--estimated-usd',str(request['estimate_usd']),'--max-usd',str(request['estimate_usd'])]
 preview=subprocess.run(args+['--dry-run'],capture_output=True,text=True)
 (r/(key+'-preview.txt')).write_text(preview.stdout)
 if preview.returncode:raise SystemExit('preview_failed '+key)
 result=subprocess.run(args+['--yes','--out',str(out)],capture_output=True,text=True)
 rec={'id':key,'endpoint':request['endpoint'],'kind':request['kind'],'estimate_usd':request['estimate_usd'],'output':out.name,'exit_code':result.returncode,'cost_usd':None,'statuses':[]}
 if out.exists():
  artifact=json.loads(out.read_text());rec['cost_usd']=artifact.get('response',{}).get('costUsd',artifact.get('response',{}).get('cost'))
  rec['statuses']=[{'code':t.get('status_code'),'message':t.get('status_message'),'id':t.get('id')} for t in artifact.get('response',{}).get('tasks',[])]
 else:
  rec['stderr_redacted']=result.stderr[-1000:]
 ledger['requests'].append(rec);ledger_path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2))
 print(key,json.dumps({'cost':rec['cost_usd'],'status':[x['code'] for x in rec['statuses']],'exit':result.returncode}),flush=True)
 if rec['cost_usd'] is None:raise SystemExit('unknown_cost_stop '+key)
 if result.returncode:raise SystemExit('failed_stop '+key)
