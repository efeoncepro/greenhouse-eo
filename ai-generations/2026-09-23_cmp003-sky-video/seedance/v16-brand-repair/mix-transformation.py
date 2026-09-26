from pathlib import Path
import subprocess,json,numpy as np,soundfile as sf
from scipy.signal import butter,sosfiltfilt
D=Path(__file__).resolve().parent;A=D/'audio';P=D.parent/'v15-review';SR=48000;N=30*SR

def read(p):return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(SR),'-ac','2','-f','f32le','-']),np.float32).reshape(-1,2).copy()
music=read(P/'audio/stem-music.wav');ui=read(P/'audio/stem-ui.wav');jet=read(P/'audio/stem-jet.wav');closing=read(P/'audio/stem-closing.wav');sfx=read(A/'transformation.mp3')
# Broad sustained crest, not a sample peak or an interface click. Preserve full bandwidth.
e=np.mean(sfx*sfx,axis=1);win=round(.12*SR);sm=np.convolve(e,np.ones(win)/win,mode='same');crest=np.argmax(sm)/SR;anchor=230/24;start=anchor-crest
sfx*=.85/max(abs(sfx).max(),1e-9);sfx[:480]*=np.linspace(0,1,480)[:,None];sfx[-4800:]*=np.linspace(1,0,4800)[:,None]
brand=np.zeros((N,2));i=round(start*SR);brand[i:i+len(sfx)]=sfx
# At most2.5dB of broad, gradual space under the transformation. Never mute the music.
t=np.arange(N)/SR;db=np.interp(t,[0,start-.1,start+.35,anchor+.45,anchor+1.15,30],[0,0,-2.5,-2.5,0,0]);music*=10**(db[:,None]/20)
for name,x in [('music',music),('brand',brand),('ui',ui),('jet',jet),('closing',closing)]:sf.write(A/f'stem-{name}.wav',x,SR,subtype='PCM_24')
sf.write(A/'premix.wav',music+brand+ui+jet+closing,SR,subtype='FLOAT')
def ff(args):return subprocess.run(['ffmpeg','-hide_banner','-y',*args],check=True,capture_output=True)
def stats(p):
 out=ff(['-i',str(p),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=14:print_format=json','-f','null','-']).stderr.decode();return json.JSONDecoder().raw_decode(out[out.rfind('{'):])[0]
s=stats(A/'premix.wav');f=f"loudnorm=I=-16:TP=-1.5:LRA=14:measured_I={s['input_i']}:measured_TP={s['input_tp']}:measured_LRA={s['input_lra']}:measured_thresh={s['input_thresh']}:offset={s['target_offset']}:linear=true";ff(['-i',str(A/'premix.wav'),'-af',f,'-ar','48000','-c:a','pcm_s24le',str(A/'master.wav')])
# Audio review is independent from pending picture restoration.
ff(['-i',str(P/'sky-v15-picture-review.mp4'),'-i',str(A/'master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','320k','-t','30','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-movflags','+faststart+write_colr',str(D/'sky-v16-audio-review-1080p.mp4')])
sos=butter(2,[300,6000],btype='bandpass',fs=SR,output='sos');rng=slice(round((anchor-.15)*SR),round((anchor+.45)*SR));rms=lambda z:float(20*np.log10(max(np.sqrt(np.mean(z*z)),1e-12)));midB=rms(sosfiltfilt(sos,brand,axis=0)[rng]);midM=rms(sosfiltfilt(sos,music,axis=0)[rng]);r={'source':'transformation.mp3','sourceDuration':len(sfx)/SR,'sourceCrest':crest,'placementStart':start,'crestInFilm':anchor,'end':start+len(sfx)/SR,'brandMidrangeDbRms':midB,'musicMidrangeDbRms':midM,'brandLeadDbIn300to6000Hz':midB-midM,'musicMaxAttenuationDb':2.5,'priorBrandBusRemoved':True,'bandwidth':'full; no160Hz low-pass','audioReadback':stats(D/'sky-v16-audio-review-1080p.mp4'),'perceptualReview':'pending, audio perception unavailable to agent'};(D/'qa/audio-mix.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2))
