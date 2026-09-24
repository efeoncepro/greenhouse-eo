from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,io,json
D=Path(__file__).resolve().parent;Q=D/'qa'
def frame(p,t,w=216,h=384):
 return Image.open(io.BytesIO(subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(p),'-frames:v','1','-vf',f'scale={w}:{h}:flags=lanczos','-f','image2pipe','-vcodec','png','-'])))
canvas=Image.new('RGB',(1728,1632),'#111');draw=ImageDraw.Draw(canvas)
for i in range(16):
 t=i/4
 for n,p in enumerate([D/'restore-pilot-input.mp4',D/'topaz-pilot-4k.mp4']):
  x=(i%4)*432+n*216;y=(i//4)*408;canvas.paste(frame(p,t),(x,y+24));draw.text((x+4,y+4),f'{"ANTES" if n==0 else "TOPAZ"} {t+8.25:.2f}s',fill='white')
canvas.save(Q/'topaz-pilot-comparison.jpg')
for t,label in [(1,'ui'),(1.25,'brand'),(1.5,'plane'),(3.5,'aircraft-close')]:
 frame(D/'topaz-pilot-4k.mp4',t,1080,1920).save(Q/f'topaz-{label}-1080.png')
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(D/'topaz-pilot-4k.mp4')]));(Q/'topaz-pilot-metadata.json').write_text(json.dumps(meta,indent=2));print('Pilot review assets ready')
