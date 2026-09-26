import json,subprocess,sys
from pathlib import Path
v=Path(__file__).resolve().parent
refs=json.loads((v/'references.json').read_text())
cmd=['pnpm','ai:fal','--capability','seedance25-r2v','--prompt-file',str(v/'sky-30s-three-cameras.prompt.txt'),'--duration','30','--resolution','720p','--aspect','9:16','--bitrate','high','--max-usd','15','--fal-account','FAL_API_KEY_B']
for r in refs: cmd+=['--image',r['path']]
cmd+=sys.argv[1:]
subprocess.run(cmd,check=True)
