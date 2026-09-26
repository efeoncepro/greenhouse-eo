from pathlib import Path
import subprocess,json,hashlib
import numpy as np
import soundfile as sf
from scipy.signal import find_peaks
D=Path(__file__).resolve().parent; A=D/'audio'; SR=48000; N=SR*30

def read(name):
 p=A/name
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(SR),'-ac','2','-f','f32le','-'])
 return np.frombuffer(raw,np.float32).reshape(-1,2).copy()
def fade(x,ins=.004,outs=.03):
 x=x.copy();a=min(len(x),round(ins*SR));b=min(len(x),round(outs*SR))
 if a:x[:a]*=np.linspace(0,1,a)[:,None]
 if b:x[-b:]*=np.linspace(1,0,b)[:,None]
 return x
music=read('music-v2.5-heroic-reference.wav')
assert len(music)==N and np.max(abs(music[SR:5*SR]))>.01,'Reject silent introduction'
# One continuous score, 1x speed. Fade in from Enter without moving its musical timeline.
t=np.arange(N)/SR
music*=np.interp(t,[0,.97,1,1.5,3,8.8,9.5,26,29.9,30],[0,0,0,.22,.4,.72,.85,.85,.85,0])[:,None]
buses={k:np.zeros((N,2),np.float64) for k in ['ui','portal','jet','titles']};cues=[]
def put(bus,name,x,at,peak,source,anchor=None):
 x=fade(x); x*=peak/max(np.max(np.abs(x)),1e-9)
 i=round(at*SR);offset=max(0,-i);i=max(0,i);end=min(N,i+len(x)-offset)
 buses[bus][i:end]+=x[offset:offset+end-i]
 cues.append({'name':name,'bus':bus,'start':at,'duration':len(x)/SR,'source':source,'peakGain':peak,'visualAnchor':anchor})
keys=read('keyboard.mp3')
# Individual real foley keypresses, cut around isolated attacks, retain timbre variation.
sourceTimes=[.04,.17,.25,.42,.56,.66,.74,.82,.91]
for k,(f,p) in enumerate(zip([1,3,5,7,10,12,15,18,20],sourceTimes)):
 z=keys[max(0,round((p-.012)*SR)):round((p+.045)*SR)]
 put('ui',f'key-{k+1}',z,f/24-.004,.055+(k%3)*.008,'keyboard.mp3',f)
enter=keys[round(1.318*SR):round(1.393*SR)]
put('ui','enter',enter,1-.004,.105,'keyboard.mp3',24)
slide=read('ui-slide.mp3')
for i,f in enumerate([49,56,62]):put('ui',f'result-{i+1}',slide,f/24-.33,.055-i*.003,'ui-slide.mp3',f)
put('ui','user-turn',slide,4-.33,.045,'ui-slide.mp3',96)
put('ui','answer-unfold',slide,4.65-.33,.037,'ui-slide.mp3',112)
put('ui','citation-attach',enter,5.75-.004,.053,'keyboard.mp3',138)
portal=read('portal.mp3')
# This generated one-shot attacks immediately: align its attack, do not pretend it is a long riser.
# Activation, acceleration and emergence are three distinct visual anchors.
# Reuse the actual foley and portal material; do not add voices or regenerate music.
put('portal','sky-chip-activation',enter,218/24-.004,.20,'keyboard.mp3',218)
rise=portal[round(.10*SR):round(.60*SR)][::-1].copy()
rise=fade(rise,.10,.008)
put('portal','sky-chip-luminous-rise',rise,218/24,.24,'portal.mp3 reversed 0.10-0.60s',218)
put('portal','aircraft-emergence-impact',portal,230/24-.012,.55,'portal.mp3',230)
jet=read('jet.mp3'); energy=np.mean(jet**2,axis=1)
window=round(.12*SR); smooth=np.convolve(energy,np.ones(window)/window,mode='same');peakAt=np.argmax(smooth)/SR
jet=fade(jet,.12,.65)
# One flyby only. Place its broad maximum at the close pass; no engine on title cards.
start=12.5-peakAt
put('jet','single-aircraft-pass',jet,start,.25,'jet.mp3',300)
assert start+len(jet)/SR<15.75
impact=read('title-impact.mp3')
put('titles','plus-land',impact,445/24-.01,.17,'title-impact.mp3',445)
put('titles','seo-land',impact,521/24-.01,.21,'title-impact.mp3',521)
# No URL click and no title-by-title engine. Final chord and natural tail carry the closing.
sf.write(A/'stem-music.wav',music,SR,subtype='PCM_24')
for k,x in buses.items():sf.write(A/f'stem-{k}.wav',x,SR,subtype='PCM_24')
sfx=sum(buses.values());sf.write(A/'stem-sfx.wav',sfx,SR,subtype='PCM_24')
sf.write(A/'premix.wav',music+sfx,SR,subtype='FLOAT')
def ff(args):return subprocess.run(['ffmpeg','-hide_banner','-y',*args],check=True,capture_output=True)
def stats(p):
 out=ff(['-i',str(p),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=14:print_format=json','-f','null','-']).stderr.decode()
 return json.JSONDecoder().raw_decode(out[out.rfind('{'):])[0]
s=stats(A/'premix.wav')
f=f"loudnorm=I=-16:TP=-1.5:LRA=14:measured_I={s['input_i']}:measured_TP={s['input_tp']}:measured_LRA={s['input_lra']}:measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true"
ff(['-i',str(A/'premix.wav'),'-af',f,'-ar','48000','-c:a','pcm_s24le',str(A/'sky-v14-master.wav')])
final=D/'sky-v14-finished-1080p.mp4'
ff(['-i',str(D/'sky-v14-picture-final.mp4'),'-i',str(A/'sky-v14-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-ar','48000','-t','30','-movflags','+faststart',str(final)])
report={'musicModel':'music_v2_5','sfxModel':'eleven_text_to_sound_v2','musicSpeed':1,'musicRepriseCount':0,'musicSource':'music-v2.5-heroic-reference.wav','musicEdits':'gain envelope only; no splice, loop, retiming or source replacement','musicNativeVideoSource':False,'jetInstances':1,'jetPeakSourceSecond':peakAt,'cues':cues,'aacReadback':stats(final),'listening':'Agent audio perception unavailable. Human perceptual review pending; technical checks are not a substitute.'}
(D/'qa/audio-mix.json').write_text(json.dumps(report,indent=2));print(json.dumps({'jetStart':start,'jetEnd':start+5,'aacReadback':report['aacReadback']},indent=2))
