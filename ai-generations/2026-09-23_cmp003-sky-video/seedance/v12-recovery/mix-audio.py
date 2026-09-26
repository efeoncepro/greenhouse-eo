from pathlib import Path
import subprocess,json,hashlib
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfilt
D=Path(__file__).resolve().parent; A=D/'audio';A.mkdir(exist_ok=True);SRC=D.parent/'v6/audio'; SR=48000;N=30*SR

def run(args):
 return subprocess.run(['ffmpeg','-hide_banner','-y',*args],check=True,capture_output=True)
def decode(p):
 return np.frombuffer(run(['-i',str(p),'-f','f32le','-ac','2','-ar',str(SR),'-']).stdout,dtype=np.float32).reshape(-1,2).copy()
def filt(x,cut,kind):return sosfilt(butter(2,cut,btype=kind,fs=SR,output='sos'),x,axis=0)
def fade(x,fi=.003,fo=.03):
 x=x.copy(); a=min(int(fi*SR),len(x));b=min(int(fo*SR),len(x));x[:a]*=np.linspace(0,1,a)[:,None];x[-b:]*=np.linspace(1,0,b)[:,None];return x
sources={k:decode(SRC/(k+'.mp3')) for k in ['music','ui','spark','jet']}
music=np.zeros((N,2));music[:min(N,len(sources['music']))]=sources['music'][:N]
t=np.arange(N)/SR
# Original speed and musical phrase continuity. Silence before Enter, then gradual growth.
env=np.interp(t,[0,1,1.12,2.5,5.75,9.84,12,15.75,24.375,26.25,28.9,30],[0,0,.10,.38,.48,.60,.60,.56,.60,.52,.40,0])
music*=env[:,None];sfx=np.zeros_like(music);cues=[]
def add(name,source,start,end,event,level,cut=None,kind='highpass',fi=.003,fo=.035,align='peak'):
 x=sources[source][round(start*SR):round(end*SR)].copy()
 if cut:x=filt(x,cut,kind)
 x=fade(x,fi,fo);peak=int(np.argmax(np.max(np.abs(x),axis=1)))
 x*=level/max(np.max(np.abs(x)),1e-9)
 pos=round(event*SR)-(peak if align=='peak' else 0)
 begin=max(0,pos);offset=max(0,-pos);length=min(len(x)-offset,N-begin)
 if length>0:sfx[begin:begin+length]+=x[offset:offset+length]
 cues.append({'event':name,'visualSeconds':event,'visualFrame':round(event*24),'source':source+'.mp3','sourceRange':[start,end],'startSeconds':pos/SR,'peakSeconds':(pos+peak)/SR,'alignment':align,'peakAmplitude':level})
# Keystrokes only during actual visible typing; irregular cadence from inspected frames.
for i,f in enumerate([1,3,5,7,10,12,15,18,20]):add('typing-'+str(i),'ui',.465,.52,f/24,.055 if i%2 else .065,1700,fo=.012)
for name,f,level in [('enter',24,.15),('result-1',49,.12),('result-2',56,.11),('result-3',62,.10),('user-turn',96,.095),('assistant-open',104,.09),('reply-line-1',108,.045),('reply-line-2',115,.04),('reply-line-3',126,.04),('citation-appears',138,.15)]:add(name,'ui',.77,.92,f/24,level,650)
# Pre-roll preserves energy; peak coincides with light burst / closest aircraft pass.
add('citation-bloom','spark',0,2.6,236/24,.32,50,fi=.08,fo=.50)
add('jet-closest-pass','jet',0,6,286/24,.38,35,fi=.12,fo=.7)
# Typographic landings retain the exact approved animation clock.
titles=json.loads((D.parent/'v10-local/cue-sheet.json').read_text())
for c in titles:
 strong=c['type']=='accent';lev=.19 if strong else .060
 if c['id']=='seo-land':lev=.24
 if c['id'] in ['thanksText-land','lockup-land']:lev=.09
 if c['id']=='urlBubble-land':lev=.045
 add(c['id'],'spark' if strong else 'ui',1.30 if strong else .77,1.74 if strong else .92,c['frame']/24,lev,1800 if strong else 1600,'lowpass' if strong else 'highpass',fo=.22 if strong else .045)
for name,x in [('music',music),('sfx',sfx),('premix',music+sfx)]:sf.write(A/(name+'.wav'),x,SR,subtype='FLOAT' if name=='premix' else 'PCM_24')
first=run(['-i',str(A/'premix.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-']).stderr.decode();stats=json.JSONDecoder().raw_decode(first[first.rfind('{'):])[0];(A/'loudnorm-pass1.json').write_text(json.dumps(stats,indent=2))
flt=f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:offset={stats['target_offset']}:linear=true:print_format=json"
run(['-i',str(A/'premix.wav'),'-af',flt,'-ar','48000','-c:a','pcm_s24le',str(A/'sky-v12-master.wav')])
run(['-i',str(D/'sky-v12-picture-final.mp4'),'-i',str(A/'sky-v12-master.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','256k','-ar','48000','-t','30','-movflags','+faststart',str(D/'sky-v12-recovery-1080p.mp4')])
final=run(['-i',str(D/'sky-v12-recovery-1080p.mp4'),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-']).stderr.decode(); measured=json.JSONDecoder().raw_decode(final[final.rfind('{'):])[0]
report={'costUsd':0,'videoAudioUsed':False,'musicSpeed':1,'musicBeginsAfterEnter':1,'sources':{k:{'path':str(SRC/(k+'.mp3')),'sha256':hashlib.sha256((SRC/(k+'.mp3')).read_bytes()).hexdigest()} for k in sources},'cues':cues,'aacReadback':measured,'auditoryReview':'Not performed: this session cannot receive audio input. Original instrumental provenance and previous empty speech checks support selection, but do not replace listening.'}
(D/'qa/audio-mix.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'output':str(D/'sky-v12-recovery-1080p.mp4'),'measured':measured,'cueCount':len(cues)},indent=2))
