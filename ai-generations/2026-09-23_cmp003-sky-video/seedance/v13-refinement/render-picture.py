from pathlib import Path
import subprocess,json
import numpy as np
from PIL import Image
D=Path(__file__).resolve().parent;S=D.parent;W,H=1080,1920
D.joinpath('segments').mkdir(exist_ok=True)
def run(a):subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*a],check=True)
def ease(x):x=max(0,min(1,x));return x*x*(3-2*x)
run(['-i',str(S/'v12-recovery/sky-v12-picture-conformed.mp4'),'-t','9','-an','-c:v','libx264','-crf','16','-preset','fast',str(D/'segments/open.mp4')])
cache=D/'segments/v11-frames';cache.mkdir(exist_ok=True)
run(['-ss','9.75','-i',str(S/'v11-full/sky-v11-fal-native.mp4'),'-t','15.25','-vf','fps=24','-q:v','2',str(cache/'%04d.jpg')])
files=sorted(cache.glob('*.jpg'));enc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','24','-i','-','-an','-c:v','libx264','-crf','16','-preset','fast','-pix_fmt','yuv420p',str(D/'segments/v11-through-close.mp4')],stdin=subprocess.PIPE)
blue=np.array([2,42,78]);purple=np.array([80,1,92])
for f in range(216,720):
 t=f/24
 if t<26:
  # One continuous native chip->portal->aircraft; no V7 flash insert.
  elapsed=t-9;src=elapsed*1.5 if elapsed<5 else 7.5+(elapsed-5)*(15.25-7.5)/(17-5)
  im=Image.open(files[min(len(files)-1,round(src*24))]).convert('RGB')
  k=ease((t-13.0)/2.6);z=1+.95*k;cw=W/z;ch=H/z;x=(W-cw)*.52;y=(H-ch)*k
  im=im.resize((W,H),Image.Resampling.BICUBIC,box=(x,y,x+cw,y+ch))
  if t>=25.5:im=Image.blend(im,Image.new('RGB',(W,H),'#022A4E'),ease((t-25.5)/.5))
 else:
  k=ease((t-27.5));rgb=tuple(np.round(blue*(1-k)+purple*k).astype(int));im=Image.new('RGB',(W,H),rgb)
 enc.stdin.write(im.tobytes())
 if f%120==0:print('frame',f,flush=True)
enc.stdin.close();assert enc.wait()==0
(D/'segments/list.txt').write_text("file '"+str(D/'segments/open.mp4')+"'\nfile '"+str(D/'segments/v11-through-close.mp4')+"'\n")
run(['-f','concat','-safe','0','-i',str(D/'segments/list.txt'),'-an','-c:v','libx264','-crf','16','-preset','fast','-pix_fmt','yuv420p','-r','24','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv',str(D/'sky-v13-picture-conformed.mp4')])
print('complete',flush=True)
