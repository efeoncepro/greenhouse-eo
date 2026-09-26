import json,subprocess,sys
from pathlib import Path
v=Path(__file__).resolve().parent
cmd=['pnpm','ai:fal','--capability','seedance25-r2v','--prompt-file',str(v/'sky-v6.prompt.txt'),'--duration','30','--resolution','720p','--aspect','9:16','--bitrate','high','--no-audio','--max-usd','15','--fal-account','FAL_API_KEY_B','--video',str(v/'refs/minimax-ui-camera-motion-only.mp4')]
for r in json.loads((v/'references.json').read_text()):cmd+=['--image',r['path']]
subprocess.run(cmd+sys.argv[1:],check=True)
