from pathlib import Path
import subprocess,json,hashlib,sys
from PIL import Image,ImageDraw
p=Path(sys.argv[1]).resolve();out=p.parent/(p.stem+'-qa');out.mkdir(exist_ok=True)
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(p)]));(out/'metadata.json').write_text(json.dumps(meta,indent=2))
subprocess.run(['ffmpeg','-v','error','-y','-i',str(p),'-vf','fps=12,scale=270:480',str(out/'frame-%04d.jpg')],check=True)
frames=sorted(out.glob('frame-*.jpg'))
for start in range(0,len(frames),24):
 sheet=Image.new('RGB',(270*6,508*4),'#121923');draw=ImageDraw.Draw(sheet)
 for i,f in enumerate(frames[start:start+24]):
  x=i%6*270;y=i//6*508;sheet.paste(Image.open(f),(x,y+28));draw.text((x+8,y+6),f'{(start+i)/12:.3f}s',fill='white')
 sheet.save(out/f'sheet-{start//24:02d}.jpg',quality=90)
summary={'source':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'duration':meta['format']['duration'],'streams':[{k:s.get(k) for k in ['codec_type','codec_name','width','height','avg_frame_rate','nb_frames']}for s in meta['streams']],'sample_count':len(frames),'sample_fps':12,'review':'pending'};(out/'review.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
