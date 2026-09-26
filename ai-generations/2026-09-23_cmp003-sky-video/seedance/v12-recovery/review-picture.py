from pathlib import Path
import subprocess,math
from PIL import Image,ImageDraw
r=Path(__file__).resolve().parent;q=r/'qa';f=q/'final-frames';f.mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-v','error','-y','-i',str(r/'sky-v12-picture-final.mp4'),'-vf','scale=216:384','-q:v','2',str(f/'%04d.jpg')],check=True)
frames=sorted(f.glob('*.jpg'))
for page in range(12):
 sh=Image.new('RGB',(2160,2448));dr=ImageDraw.Draw(sh)
 for k,p in enumerate(frames[page*60:(page+1)*60]):
  i=page*60+k;x=k%10*216;y=k//10*408;sh.paste(Image.open(p),(x,y+24));dr.text((x+3,y+4),f'f{i} {i/24:.3f}s',fill='white')
 sh.save(q/f'final-all-{page:02}.jpg',quality=90)
for j in [384,406,445,467,521,545,585,640,697]:
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(j/24),'-i',str(r/'sky-v12-picture-final.mp4'),'-frames:v','1',str(q/f'hold-{j}.png')],check=True)
print('720 final picture frames and9 full-resolution holds extracted')
