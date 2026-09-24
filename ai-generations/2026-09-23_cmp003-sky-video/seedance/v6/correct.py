from pathlib import Path
import json,subprocess,sys
v=Path(__file__).resolve().parent
cmd=['pnpm','ai:fal','--capability','seedance25-r2v','--task','editing','--prompt-file',str(v/'correct-full-film.prompt.txt'),'--resolution','720p','--bitrate','high','--no-audio','--max-usd','15','--fal-account','FAL_API_KEY_B','--video',str(v/'sky-v6-silent-30s-916.mp4')]
for url in json.loads((v/'uploaded-reference-urls.json').read_text()):cmd+=['--image',url]
subprocess.run(cmd+sys.argv[1:],check=True)
