from pathlib import Path
import subprocess,json,hashlib,math
from PIL import Image,ImageDraw,ImageFont
r=Path(__file__).resolve().parent
source=r.parents[1]/'seedance/v10-local/planning/omni-pilot-source-6_50-16_00.mp4'
output=r/'omni-edit-native.mp4'
qa=r/'qa';qa.mkdir(exist_ok=True)
font=ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf',17)
def probe(p):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames:format=duration','-of','json',str(p)]))
metadata={'source':probe(source),'output':probe(output),'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}
(qa/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
for label,p in [('source',source),('output',output)]:
 frames=qa/label;frames.mkdir(exist_ok=True)
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(p),'-map','0:v:0','-vf','fps=24,scale=270:480','-q:v','2',str(frames/'frame-%04d.jpg')],check=True)
 images=sorted(frames.glob('frame-*.jpg'))
 for page in range(math.ceil(len(images)/30)):
  sheet=Image.new('RGB',(1620,2520),'#111820');draw=ImageDraw.Draw(sheet)
  for k,path in enumerate(images[page*30:(page+1)*30]):
   i=page*30+k;x=(k%6)*270;y=(k//6)*504
   sheet.paste(Image.open(path),(x,y+24));draw.text((x+4,y+2),f'{label} f{i} {i/24:.3f}s',font=font,fill='white')
  sheet.save(qa/f'{label}-all-{page:02}.jpg',quality=92)
# Pair same-time boundary samples, not proof of acceptance by itself.
for side,indices in [('start',range(0,12,2)),('end',range(216,228,2))]:
 sheet=Image.new('RGB',(1620,1008),'#111820');draw=ImageDraw.Draw(sheet)
 for k,i in enumerate(indices):
  for row,label in enumerate(['source','output']):
   f=qa/label/f'frame-{i+1:04d}.jpg'
   if f.exists(): sheet.paste(Image.open(f),(k*270,row*504+24))
   draw.text((k*270+4,row*504+2),f'{label} f{i}',font=font,fill='white')
 sheet.save(qa/f'boundary-{side}.jpg',quality=95)
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-i',str(output),'-map','0:v:0','-an','-c:v','copy',str(r/'omni-edit-review-silent.mp4')],check=True)
print(json.dumps(metadata));print('Contact sheets:',len(list(qa.glob('*all-*.jpg'))))
