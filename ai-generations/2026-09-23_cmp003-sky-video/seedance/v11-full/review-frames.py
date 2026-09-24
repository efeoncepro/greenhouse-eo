from pathlib import Path
import subprocess,json,hashlib,math
from PIL import Image,ImageDraw,ImageFont
r=Path(__file__).resolve().parent
output=r/'sky-v11-fal-native.mp4'
qa=r/'qa';qa.mkdir(exist_ok=True)
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',17)
metadata=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(output)]))
metadata['sha256']=hashlib.file_digest(output.open('rb'),'sha256').hexdigest()
(qa/'native-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
v=next(s for s in metadata['streams'] if s['codec_type']=='video')
a,b=map(int,v['r_frame_rate'].split('/'));fps=a/b
for label,p in [('native',output)]:
 frames=qa/label;frames.mkdir(exist_ok=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(p),'-map','0:v:0','-vf','scale=270:480','-q:v','2',str(frames/'frame-%04d.jpg')],check=True)
 images=sorted(frames.glob('frame-*.jpg'))
 for page in range(math.ceil(len(images)/30)):
  sheet=Image.new('RGB',(1620,2520),'#111820');draw=ImageDraw.Draw(sheet)
  for k,path in enumerate(images[page*30:(page+1)*30]):
   i=page*30+k;x=(k%6)*270;y=(k//6)*504
   sheet.paste(Image.open(path),(x,y+24));draw.text((x+4,y+2),f'{label} f{i} {i/fps:.3f}s',font=font,fill='white')
  sheet.save(qa/f'{label}-all-{page:02}.jpg',quality=92)

print(json.dumps({'duration':metadata['format']['duration'],'fps':fps,'frames':v.get('nb_frames'),'sheets':len(list(qa.glob('native-all-*.jpg'))),'audio':any(s['codec_type']=='audio' for s in metadata['streams'])}))
