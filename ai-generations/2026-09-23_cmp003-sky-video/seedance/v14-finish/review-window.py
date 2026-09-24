from pathlib import Path
from PIL import Image,ImageDraw
import subprocess,json,hashlib
D=Path(__file__).resolve().parent;Q=D/'qa';Q.mkdir(exist_ok=True)
paths={'input':D.parent/'v14-plan/window-a-input-silent.mp4','output':D/'omni-window-a-native.mp4'}
frames={}
for key,p in paths.items():
 meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)]));(Q/(key+'-metadata.json')).write_text(json.dumps(meta,indent=2))
 folder=Q/key;folder.mkdir(exist_ok=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-vf','fps=24,scale=216:384','-q:v','2',str(folder/'%04d.jpg')],check=True)
 frames[key]=sorted(folder.glob('*.jpg'))
 if key=='output':
  for page in range((len(frames[key])+47)//48):
   im=Image.new('RGB',(216*8,408*6),'#111111');dr=ImageDraw.Draw(im)
   for j,f in enumerate(frames[key][page*48:(page+1)*48]):
    k=page*48+j;x=(j%8)*216;y=(j//8)*408;im.paste(Image.open(f),(x,y+24));dr.text((x+4,y+4),f'{k} / local{k/24:.3f}s',fill='white')
   im.save(Q/f'output-all-{page}.jpg')
indices=[0,6,12,24,36,60,84,108,120,132,144,155]
im=Image.new('RGB',(216*6,408*4));dr=ImageDraw.Draw(im)
for j,i in enumerate(indices):
 for n,key in enumerate(['input','output']):
  x=(j%6)*216;y=(j//6*2+n)*408;im.paste(Image.open(frames[key][min(i,len(frames[key])-1)]),(x,y+24));dr.text((x+2,y+2),f'{key} f{i}',fill='white')
im.save(Q/'boundaries-and-motion.jpg')
print({k:len(v) for k,v in frames.items()})
