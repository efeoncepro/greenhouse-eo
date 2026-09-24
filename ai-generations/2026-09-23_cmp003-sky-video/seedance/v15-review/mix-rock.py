from pathlib import Path
import subprocess,json,hashlib
import numpy as np
import soundfile as sf
from scipy.signal import stft,butter,sosfiltfilt
D=Path(__file__).resolve().parent;A=D/'audio';OLD=D.parent/'v14-finish/audio';SR=48000;N=30*SR

def read(p):
 return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(SR),'-ac','2','-f','f32le','-']),np.float32).reshape(-1,2).copy()
def fade(x,ins=.008,outs=.04):
 x=x.copy();a=min(len(x),round(ins*SR));b=min(len(x),round(outs*SR))
 if a:x[:a]*=np.linspace(0,1,a)[:,None]
 if b:x[-b:]*=np.linspace(1,0,b)[:,None]
 return x
rock=read(A/'rock-uniform-tempo.wav')
_,st,z=stft(rock.mean(axis=1),SR,nperseg=1024,noverlap=768);fl=np.maximum(np.diff(abs(z),axis=1),0).sum(axis=0);st=st[1:];ids=np.flatnonzero((st>7.85)&(st<8.05));beat=float(st[ids[np.argmax(fl[ids])]])
brand=230/24;offset=brand-beat
music=np.zeros((N,2));i=round(offset*SR);music[i:min(N,i+len(rock))]=rock[:min(len(rock),N-i)]
t=np.arange(N)/SR
# One entire short arrangement, uniform tempo and original pitch, no interior edits.
gain=np.interp(t,[0,offset,offset+.08,2.05,8.9,9.583,10.1,15.5,24.8,25.6,26.2,30],[0,0,.25,.52,.52,.74,.65,.60,.60,.68,.68,.68])
# The actual track accent carries the transformation; no standalone mouse-click cue.
gain*=1+.20*np.exp(-((t-brand)/.10)**2)
music*=gain[:,None]
buses={k:np.zeros((N,2)) for k in ['ui','brand','jet','closing']};cues=[]
def put(bus,name,x,at,peak,source,anchor):
 x=fade(x);x*=peak/max(float(abs(x).max()),1e-9);j=round(at*SR);end=min(N,j+len(x));buses[bus][j:end]+=x[:end-j];cues.append({'bus':bus,'name':name,'start':at,'duration':len(x)/SR,'source':source,'anchor':anchor,'peak':peak})
keys=read(OLD/'keyboard.mp3');srcTimes=[.04,.17,.25,.42,.56,.66,.74,.82,.91]
for n,(f,p) in enumerate(zip([1,3,5,7,10,12,15,18,20],srcTimes)):
 put('ui',f'key-{n+1}',keys[round((p-.012)*SR):round((p+.045)*SR)],max(0,f/24-.004),.032+(n%3)*.004,'keyboard',f/24)
enter=keys[round(1.318*SR):round(1.393*SR)]
put('ui','enter',enter,.996,.062,'keyboard',1)
slide=read(OLD/'ui-slide.mp3')
for n,f in enumerate([49,56,62]):put('ui',f'result-{n+1}',slide,f/24-.33,.025,'ui-slide',f/24)
for name,at in [('user-turn',4),('answer',4.65)]:put('ui',name,slide,at-.33,.018,'ui-slide',at)
# Tonal energy uses the same guitar texture as the chosen rock, not a foreign cinematic boom.
seg=rock[round((beat+.08)*SR):round((beat+.58)*SR)]
sos=butter(2,[350,6500],btype='bandpass',fs=SR,output='sos');guitar=sosfiltfilt(sos,seg,axis=0)
rise=fade(guitar[::-1],.12,.006)
put('brand','guitar-energy-transformation',rise,brand-.5,.28,'current rock, reversed bandpassed texture',brand)
portal=read(OLD/'portal.mp3');low=sosfiltfilt(butter(2,160,btype='lowpass',fs=SR,output='sos'),portal,axis=0)
put('brand','transformation-weight',low,brand-.012,.17,'existing portal, low frequencies only',brand)
jet=read(OLD/'jet.mp3');energy=np.mean(jet**2,axis=1);smooth=np.convolve(energy,np.ones(5760)/5760,mode='same');pk=np.argmax(smooth)/SR
put('jet','single-flyby',fade(jet,.2,.75),12.5-pk,.15,'existing jet',12.5)
# Source final accent follows the blue reveal and lockup entrance; reuse its own guitar tail for anticipation.
ids=np.flatnonzero((st>24.3)&(st<24.8));endBeat=float(st[ids[np.argmax(fl[ids])]])+offset
endTexture=rock[round((endBeat-offset+.10)*SR):round((endBeat-offset+.55)*SR)]
endRise=fade(sosfiltfilt(sos,endTexture,axis=0)[::-1],.12,.012)
put('closing','guitar-close-anticipation',endRise,endBeat-.45,.11,'current rock ending, reversed guitar texture',endBeat)
sf.write(A/'stem-music.wav',music,SR,subtype='PCM_24')
for k,x in buses.items():sf.write(A/f'stem-{k}.wav',x,SR,subtype='PCM_24')
sfx=sum(buses.values());sf.write(A/'stem-sfx.wav',sfx,SR,subtype='PCM_24');sf.write(A/'premix.wav',music+sfx,SR,subtype='FLOAT')
def ff(args):return subprocess.run(['ffmpeg','-hide_banner','-y',*args],check=True,capture_output=True)
def stats(p):
 out=ff(['-i',str(p),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=14:print_format=json','-f','null','-']).stderr.decode();return json.JSONDecoder().raw_decode(out[out.rfind('{'):])[0]
s=stats(A/'premix.wav');f=f"loudnorm=I=-16:TP=-1.5:LRA=14:measured_I={s['input_i']}:measured_TP={s['input_tp']}:measured_LRA={s['input_lra']}:measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true"
ff(['-i',str(A/'premix.wav'),'-af',f,'-ar','48000','-c:a','pcm_s24le',str(A/'sky-v15-master.wav')])
out=D/'sky-v15-rock-1080p.mp4';ff(['-i',str(D/'sky-v15-picture-review.mp4'),'-i',str(A/'sky-v15-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','320k','-ar','48000','-t','30','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart+write_colr',str(out)])
r={'music':'Envato operator attachment: 331music_rock_short-02.wav','sourceDuration':32,'tempoFactor':1.14,'pitchPreserved':True,'musicInteriorSplices':0,'musicStart':offset,'sourceBrandBeatAfterTempo':beat,'brandBeatInFilm':brand,'closingBeatInFilm':endBeat,'sourceEndInFilm':offset+len(rock)/SR,'paidCalls':0,'cues':cues,'aacReadback':stats(out),'listening':'Not available in this session; operator perceptual review required'};(D/'qa/audio-mix.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if k!='cues'},indent=2))
