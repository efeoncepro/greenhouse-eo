from pathlib import Path
import subprocess,json,hashlib
import numpy as np
from PIL import Image
D=Path(__file__).resolve().parent;S=D.parent;FPS=24;W,H=1080,1920
(D/'segments').mkdir(exist_ok=True)
def run(args): subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y',*args],check=True)
def segment(name,src,start,end):
 p=D/'segments'/name
 run(['-ss',str(start),'-i',str(src),'-t',str(end-start),'-vf',f'fps=24,scale={W}:{H}:flags=lanczos,setsar=1','-an','-c:v','libx264','-crf','16','-preset','fast',str(p)])
 return p
# Retain the earlier generated lateral move; cut on the first result arrival.
a=segment('01-search.mp4',S/'v7/sky-v7-seedance-native.mp4',0,52/24)
b=segment('02-chat.mp4',S/'v9/sky-v9-fal-native.mp4',52/24,236/24)
# Only the already generated luminous bloom; no UI is rebuilt.
c=segment('03-bloom.mp4',S/'v7/sky-v7-seedance-native.mp4',226/24,234/24)
# Continuous V11 flight, then an editorial pan/crop into its own moving clouds.
# Output: 244..623. Source13.25..25.0. Slow only after the fast pass and plane exit.
N=380; source_duration=25-13.25
flight=D/'segments/04-flight-sky.mp4'
# Decode source once. Memory under2GB by holding JPEGs, never all raw frames.
cache=D/'segments/flight-frames';cache.mkdir(exist_ok=True)
run(['-ss','13.25','-i',str(S/'v11-full/sky-v11-fal-native.mp4'),'-t',str(source_duration),'-vf','fps=24','-q:v','2',str(cache/'%04d.jpg')])
files=sorted(cache.glob('*.jpg'))
def ease(x):x=max(0,min(1,x));return x*x*(3-2*x)
enc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','24','-i','-','-an','-c:v','libx264','-crf','16','-preset','fast','-pix_fmt','yuv420p',str(flight)],stdin=subprocess.PIPE)
last=None;im=None
for j in range(N):
 t=j/24;g=(244+j)/24
 # First4s native motion. Remaining footage stretched continuously to the sky interval.
 src=t if t<4 else 4+(t-4)*(source_duration-4)/((N-1)/24-4)
 idx=min(len(files)-1,round(src*24))
 if idx!=last:im=Image.open(files[idx]).convert('RGB');last=idx
 k=ease((g-13.1)/2.55);z=1+0.95*k
 cw=W/z;ch=H/z;x=(W-cw)*.52;y=(H-ch)*k
 frame=im.resize((W,H),Image.Resampling.BICUBIC,box=(x,y,x+cw,y+ch))
 # Closing is explicitly in the deterministic scope; match canonical brand blue.
 if g>=25.5:
  frame=Image.blend(frame,Image.new('RGB',(W,H),'#022A4E'),ease((g-25.5)/.5))
 enc.stdin.write(frame.tobytes())
enc.stdin.close();assert enc.wait()==0
# Exact branded closing under the approved transparent graphics. No sky freeze.
closing=D/'segments/05-closing.mp4'
enc=subprocess.Popen(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r','24','-i','-','-an','-c:v','libx264','-crf','16','-preset','fast','-pix_fmt','yuv420p',str(closing)],stdin=subprocess.PIPE)
blue=np.array([2,42,78]);purple=np.array([112,28,116])
for j in range(96):
 k=ease((j/24-1.5)/1);rgb=tuple(np.round(blue*(1-k)+purple*k).astype(int));enc.stdin.write(Image.new('RGB',(W,H),rgb).tobytes())
enc.stdin.close();assert enc.wait()==0
parts=[a,b,c,flight,closing]
(D/'segments/concat.txt').write_text(''.join("file '"+str(p)+"'\n" for p in parts))
run(['-f','concat','-safe','0','-i',str(D/'segments/concat.txt'),'-c','copy','-movflags','+faststart',str(D/'sky-v12-picture-base.mp4')])
manifest={'costUsd':0,'frames':720,'fps':24,'titleOffset':15.75,'picture':'sky-v12-picture-base.mp4','editDecisionList':[{'out':[0,52],'source':str(a),'note':'Generated V7 lateral search'},{'out':[52,236],'source':str(b),'note':'V9 search results, isolated user, progressive answer, citation'},{'out':[236,244],'source':str(c),'note':'V7 generated luminous bloom'},{'out':[244,624],'source':str(flight),'note':'V11 continuous plane flight and its moving sky; editorial downward crop clears aircraft by15.65; no object removal or sky replacement'},{'out':[624,720],'source':str(closing),'note':'Canonical blue/purple closing, approved deterministic scope'}]}
(D/'edit-decision-list.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Picture base720 frames exported')

# Normalize frame metadata before overlay to avoid filtergraph reinitialization.
run(["-i",str(D/"sky-v12-picture-base.mp4"),"-an","-c:v","libx264","-crf","16","-preset","fast","-pix_fmt","yuv420p","-r","24","-color_range","tv","-colorspace","bt709","-color_primaries","bt709","-color_trc","bt709","-movflags","+faststart",str(D/"sky-v12-picture-conformed.mp4")])
