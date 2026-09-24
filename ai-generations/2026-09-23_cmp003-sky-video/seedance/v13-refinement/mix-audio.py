from pathlib import Path
import subprocess,json,hashlib
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfilt,resample_poly
D=Path(__file__).resolve().parent;A=D/'audio';A.mkdir(exist_ok=True);SR=48000;N=SR*30;RNG=np.random.default_rng(1309)
def run(a):return subprocess.run(['ffmpeg','-hide_banner','-y',*a],check=True,capture_output=True)
def read(p):
 x,sr=sf.read(p);return resample_poly(x,SR,sr) if sr!=SR else x
S=D/'audio-separated/htdemucs_ft/audio';parts={k:read(S/(k+'.wav')) for k in ['other','bass','drums']}
# Retain native orchestration. Discard ALL source material in the spoken interval,
# including separated instrumental stems, rather than relying on suppression.
raw=parts['other']+parts['bass']+.65*parts['drums'];raw=np.pad(raw,((0,max(0,N-len(raw))),(0,0)))[:N]
music=raw.copy(); t=np.arange(N)/SR
# UI transient stem is replaced by action-specific effects; retain orchestral other/bass.
nonperc=np.pad(parts['other']+parts['bass'],((0,max(0,N-len(parts['other']))),(0,0)))[:N]
music[:int(8*SR)]=nonperc[:int(8*SR)]
# A nine-second instrumental bridge uses a pre-speech 4.5-second orchestral phrase twice.
# No tempo changes. Crossfade melodic material, never carry any15.3–24.4 source audio.
bridge=parts['other']+parts['bass']+.25*parts['drums']
loop=bridge[round(10.6*SR):round(15.1*SR)].copy()
start=15.1;stop=24.4;cf=int(.18*SR)
for i in range(round(start*SR),round(stop*SR)):
 j=(i-round(start*SR))%len(loop);music[i]=loop[j]
# Smooth repeated phrase boundaries from two phase positions with equal-gain fades.
for sec in [15.1,19.6,24.1]:
 i=round(sec*SR);n=min(cf,round(stop*SR)-i)
 if n<=0:continue
 prev=raw[i-n:i] if sec==15.1 else loop[-n:]
 w=np.linspace(0,1,n)[:,None];music[i:i+n]=prev*(1-w)+music[i:i+n]*w
# Resolve into the original unspoken ending; generous guard after last spoken word23.76.
i=round(24.4*SR);n=round(.35*SR);w=np.linspace(0,1,n)[:,None];music[i:i+n]=loop[:n]*(1-w)+raw[i:i+n]*w
music*=np.interp(t,[0,1,1.3,3,8.2,9.5,14.9,15.3,24.4,26.2,28.8,29.7,30],[0,0,.45,.72,.95,1,1,.95,.95,1,1,.85,0])[:,None]
sfx=np.zeros((N,2));cues=[]
def band(x,lo,hi):return sosfilt(butter(2,[lo,hi],btype='bandpass',fs=SR,output='sos'),x)
def put(name,x,at,level,pan=0):
 x=x/(max(np.max(np.abs(x)),1e-8))*level
 if x.ndim==1:x=np.column_stack([x*np.sqrt((1-pan)/2),x*np.sqrt((1+pan)/2)])
 pos=round(at*SR);end=min(N,pos+len(x));sfx[pos:end]+=x[:end-pos];cues.append({'name':name,'start':at,'duration':len(x)/SR,'level':level,'frame':round(at*24)})
def tap(pitch=1300,duration=.035):
 q=np.arange(round(duration*SR))/SR
 body=np.sin(2*np.pi*pitch*q)*np.exp(-q*180);dry=band(RNG.normal(size=len(q)),1800,8000)*np.exp(-q*300)
 x=.7*body+.3*dry;x[:48]*=np.linspace(0,1,48);return x
for i,f in enumerate([1,3,5,7,10,12,15,18,20]):put('dry-key-'+str(i),tap(1100+i%3*170),f/24,.075)
put('enter',tap(760,.05),1,.13)
def air(d=.13):
 q=np.linspace(0,1,round(d*SR));return band(RNG.normal(size=len(q)),700,5500)*np.sin(np.pi*q)**2
for i,f in enumerate([49,56,62]):put('result-slide-'+str(i),air(),f/24-.07,.065)
put('chat-turn',air(.14),4-.07,.055)
put('answer-expansion',air(.5),4.3,.045)
put('citation-attach',tap(1750,.075),5.75,.09)
# Light grows into the actual native V11 portal; no recycled spark explosions.
q=np.arange(round(.65*SR))/SR;phase=2*np.pi*(400*q+1200*q*q)
riser=(.7*band(RNG.normal(size=len(q)),800,6500)+.25*np.sin(phase))*np.sin(np.pi*np.linspace(0,1,len(q)))**1.5
put('portal-air',riser,9.08,.15)
# Continuous jet sound, changing tone and stereo position through the near pass.
q=np.arange(round(4.4*SR))/SR;z=q-2.4;env=np.exp(-np.abs(z)/.8);freq=100-30*np.tanh(z*3)
phase=2*np.pi*np.cumsum(freq)/SR
jet=(band(RNG.normal(size=len(q)),60,1800)*1.3+.12*np.sin(phase)+.05*np.sin(phase*2.7))*env
pan=.65*np.tanh(z*1.3);st=np.column_stack([jet*np.sqrt((1-pan)/2),jet*np.sqrt((1+pan)/2)])
st[:2400]*=np.linspace(0,1,2400)[:,None];st[-4800:]*=np.linspace(1,0,4800)[:,None]
put('jet-continuous-pass',st,10.10,.24)
def impact(d=.4):
 q=np.arange(round(d*SR))/SR;phase=2*np.pi*(55*q+25*(1-np.exp(-q*18))/18)
 return np.sin(phase)*np.exp(-q*10)+.08*band(RNG.normal(size=len(q)),1200,4000)*np.exp(-q*50)
# Only major graphic actions receive impact; no sound on every line.
put('plus-land',impact(),445/24,.12)
put('seo-land',impact(.55),521/24,.17)
# Closing is carried by the original musical resolution, no competing URL click.
sf.write(A/'music-recovered.wav',music,SR,subtype='PCM_24');sf.write(A/'sfx-designed.wav',sfx,SR,subtype='PCM_24');sf.write(A/'premix.wav',music+sfx,SR,subtype='FLOAT')
first=run(['-i',str(A/'premix.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=14:print_format=json','-f','null','-']).stderr.decode();stats=json.JSONDecoder().raw_decode(first[first.rfind('{'):])[0]
flt=f"loudnorm=I=-16:TP=-1.5:LRA=14:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true"
run(['-i',str(A/'premix.wav'),'-af',flt,'-ar','48000','-c:a','pcm_s24le',str(A/'sky-v13-master.wav')])
run(['-i',str(D/'sky-v13-picture-final.mp4'),'-i',str(A/'sky-v13-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-ar','48000','-t','30','-movflags','+faststart',str(D/'sky-v13-refined-1080p.mp4')])
final=run(['-i',str(D/'sky-v13-refined-1080p.mp4'),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=14:print_format=json','-f','null','-']).stderr.decode();measured=json.JSONDecoder().raw_decode(final[final.rfind('{'):])[0]
(D/'qa/audio-mix.json').write_text(json.dumps({'costUsd':0,'musicSource':'V7 native, locally separated; instrumental bridge from pre-speech material','excludedSourceSeconds':[15.1,24.4],'bridgeSourceSeconds':[10.6,15.1],'speed':1,'cues':cues,'aacReadback':measured,'listening':'Unavailable to agent. Perceptual approval pending; ASR is support only.'},indent=2));print(measured,flush=True)
