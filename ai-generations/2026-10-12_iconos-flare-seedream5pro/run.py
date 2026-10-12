import json,subprocess,time,sys
from pathlib import Path
root=Path(__file__).resolve().parent
lane=sys.argv[1]
for prompt in sorted((root/'prompts').glob('*.txt')):
 name=prompt.stem
 out=root/lane/(name+'.png')
 if lane=='flare':
  command=['pnpm','-s','ai:image','--model','gpt-image-2.5-flare','--quality','max','--size','2048x2048','--background','opaque','--format','png','--prompt-file',str(prompt),'--out',str(out),'--timeout','600000']
 else:
  command=['pnpm','-s','ai:byteplus','--model','seedream5-pro','--size','2048x2048','--prompt-file',str(prompt),'--input-file',str(root/'seedream-input.json'),'--out',str(out),'--out-dir',str(root/'receipts'/name),'--max-usd','0.09','--yes']
 started=time.time()
 result=subprocess.run(command,capture_output=True,text=True)
 (root/'logs'/(lane+'-'+name+'.log')).write_text(result.stdout+result.stderr)
 record={'lane':lane,'icon':name,'elapsedSeconds':time.time()-started,'exitCode':result.returncode,'command':command,'output':str(out)}
 (root/'logs'/(lane+'-'+name+'.json')).write_text(json.dumps(record,indent=2)+'\n')
 print(json.dumps({k:record[k] for k in ['lane','icon','elapsedSeconds','exitCode']}),flush=True)
 if result.returncode:
  print(result.stdout+result.stderr,flush=True)
  sys.exit(result.returncode)
