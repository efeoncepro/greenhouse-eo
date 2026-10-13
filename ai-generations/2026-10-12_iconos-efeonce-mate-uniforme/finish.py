import json,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parent
for name in ['iman','metronomo','sello-aprobacion']:
 out=root/'seedream-smooth'/(name+'.png')
 command=['pnpm','-s','ai:byteplus','--model','seedream5-pro','--size','2048x2048','--image',str(root/'seedream'/(name+'.png')),'--prompt-file',str(root/'prompts/surface-finish.txt'),'--input-file',str(root/'seedream-input.json'),'--out',str(out),'--out-dir',str(root/'receipts-smooth'/name),'--max-usd','0.09','--yes']
 started=time.time(); result=subprocess.run(command,capture_output=True,text=True)
 (root/'logs'/('seedream-smooth-'+name+'.log')).write_text(result.stdout+result.stderr)
 record={'command':command,'elapsedSeconds':time.time()-started,'exitCode':result.returncode,'parent':'seedream/'+name+'.png','delta':'material microtexture only (requested, not a pixel preservation guarantee)'}
 (root/'logs'/('seedream-smooth-'+name+'.json')).write_text(json.dumps(record,indent=2)+'\n')
 print(json.dumps({'icon':name,**record}),flush=True)
 if result.returncode: raise SystemExit(result.returncode)
