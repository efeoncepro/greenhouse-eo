from pathlib import Path
import subprocess,json
import numpy as np
from PIL import Image
D=Path(__file__).resolve().parent;S=D.parent;W,H=1080,1920;SZ=W*H*3
class Reader:
 def __init__(self,path,seek=0):
  self.p=subprocess.Popen(['ffmpeg','-v','error','-threads','2','-ss',str(seek),'-i',str(path),'-vf',f'fps=24,scale={W}:{H}:flags=lanczos','-pix_fmt','rgb24','-f','rawvideo','-'],stdout=subprocess.PIPE);self.i=-1;self.last=None
 def frame(self,n):
  while self.i<n:
   b=self.p.stdout.read(SZ)
   if len(b)!=SZ: raise RuntimeError(f'Decoder ended at {self.i}, requested {n}')
   self.last=Image.frombytes('RGB',(W,H),b);self.i+=1
  return self.last.copy()
 def close(self):
  self.p.stdout.close();self.p.terminate();self.p.wait()
def ease(x): x=np.clip(x,0,1);return x*x*(3-2*x)
r7=Reader(S/'v7/sky-v7-seedance-native.mp4');r9=Reader(S/'v9/sky-v9-fal-native.mp4',52/24);r11=Reader(S/'v11-full/sky-v11-fal-native.mp4',9.75);om=Reader(S/'v14-finish/omni-window-a-native.mp4')
p=D/'picture-lossless.mkv';enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','24','-i','-','-an','-c:v','ffv1','-level','3','-threads','4','-pix_fmt','gbrp','-color_primaries','bt709','-color_trc','bt709',str(p)],stdin=subprocess.PIPE)
blue=np.array([2,42,78],dtype=np.float32);purple=np.array([80,1,92],dtype=np.float32)
yy,xx=np.mgrid[0:H,0:W];direction=(.75*yy/H+.25*xx/W).astype(np.float32)
for f in range(720):
 t=f/24
 if f<52:im=r7.frame(f)
 elif f<216:im=r9.frame(f-52)
 elif f<624:
  e=t-9;src=e*1.5 if e<5 else 7.5+(e-5)*(15.25-7.5)/12
  im=r11.frame(round(src*24))
  k=float(ease((t-13)/2.6));z=1+.95*k;cw=W/z;ch=H/z;x=(W-cw)*.52;y=(H-ch)*k
  im=im.resize((W,H),Image.Resampling.LANCZOS,box=(x,y,x+cw,y+ch))
  if 301<=f<432:
   patch=om.frame(f-276)
   im=patch if f<420 else Image.blend(patch,im,(f-420)/12)
  if t>=25.35:
   # A moving blue veil follows the cloud luminance; no JPEG, freeze, or white flash.
   rgb=np.asarray(im,dtype=np.float32);lum=(rgb[:,:,0]*.2126+rgb[:,:,1]*.7152+rgb[:,:,2]*.0722)/255
   phase=(t-25.35)/.65;edge=phase*1.55-direction-.12*lum
   a=ease(edge/.38)[:,:,None];rgb=rgb*(1-a)+blue*a
   im=Image.fromarray(np.clip(rgb,0,255).astype(np.uint8))
 else:
  k=float(ease((t-27.5)));im=Image.new('RGB',(W,H),tuple(np.round(blue*(1-k)+purple*k).astype(int)))
 enc.stdin.write(im.tobytes())
 if f%120==0:print(f'Native rebuild {f}/720',flush=True)
enc.stdin.close();assert enc.wait()==0
for r in [r7,r9,r11,om]:r.close()
(D/'qa/rebuild.json').write_text(json.dumps({'frames':720,'intermediate':'FFV1 RGB lossless','jpegIntermediates':False,'paidCalls':0,'nativeSources':['v7','v9','v11','omni-window-a-native'],'cropRetained':'up to 1.95x; cannot recover missing source detail','closingVeil':[25.35,26.0],'status':'pending visual review'},indent=2))
