"""Preserve approved v7 instrumental identity; conform time locally, add non-vocal action accents.
Never includes native video audio. Source separation provenance remains explicit.
"""
from pathlib import Path
import json, subprocess, re, hashlib
import numpy as np
import soundfile as sf
from scipy.signal import butter,sosfilt
D=Path(__file__).resolve().parent; A=D/'audio';A.mkdir(exist_ok=True)
c=json.loads((D/'audio-cues.json').read_text());sr=48000;n=round(c['duration']*sr);out=np.zeros((n,2));rng=np.random.default_rng(91625)
src=D.parent/'v7/audio-clean.wav'
source=c['approved_source_anchors'];dest=[c['enter'],c['citation'],c['flight_start'],c['pass'],c['year'],c['plus'],c['agency'][-1],c['thanks'],c['closing'],30.0]
# Preserve pitch using atempo, with short overlapping tails at section joins.
for i in range(len(source)-1):
 a,b=source[i:i+2];u,v=dest[i:i+2];speed=(b-a)/(v-u);overlap=.025 if i<len(source)-2 else 0
 path=A/f'conform-{i}.wav'
 subprocess.run(['ffmpeg','-v','error','-y','-ss',str(a),'-i',str(src),'-t',str(b-a+overlap*speed),'-af',f'atempo={speed},apad,atrim=0:{v-u+overlap}','-ar',str(sr),'-c:a','pcm_f32le',str(path)],check=True)
 z,_=sf.read(path,always_2d=True);start=round(u*sr);size=min(len(z),n-start);z=z[:size];fade=round(.025*sr)
 if i>0:z[:fade]*=np.linspace(0,1,fade)[:,None]
 if i<len(source)-2:z[-fade:]*=np.linspace(1,0,fade)[:,None]
 out[start:start+size]+=z
# Music begins after Enter and resolves with a full one-second tail.
t=np.arange(n)/sr;gain=np.minimum(1,np.maximum(0,(t-c['enter'])/.28));gain*=np.minimum(1,np.maximum(0,(30-t)/.8));out*=gain[:,None]*.86
for center,width,depth in [(c['citation'],.24,.20),(c['pass'],.40,.20)]:out*=(1-depth*np.exp(-((t-center)/width)**2))[:,None]
def add(time,z,amp,pan=0):
 idx=round(time*sr);z=np.asarray(z);size=min(len(z),n-idx)
 if idx<0 or size<=0:return
 stereo=np.column_stack([z[:size]*np.sqrt((1-pan)/2),z[:size]*np.sqrt((1+pan)/2)])
 out[idx:idx+size]+=stereo*amp

def tick(freq=1800,dur=.06):
 tt=np.arange(round(sr*dur))/sr
 noise=sosfilt(butter(2,[1200,7000],btype='bandpass',fs=sr,output='sos'),rng.standard_normal(len(tt)))
 return (.65*noise+.35*np.sin(2*np.pi*freq*tt))*np.exp(-tt*80)*np.minimum(1,tt/.001)
def chime(freq=1100,dur=.2):
 tt=np.arange(round(sr*dur))/sr;return (np.sin(2*np.pi*freq*tt)+.22*np.sin(2*np.pi*freq*2*tt))*np.exp(-tt*24)*np.minimum(1,tt/.003)
def thump(freq=140,dur=.14):
 tt=np.arange(round(sr*dur))/sr;return np.sin(2*np.pi*(freq*tt-100*tt**2))*np.exp(-tt*38)*np.minimum(1,tt/.004)
# Dry irregular key attacks, first sample strictly after .20s.
for i,when in enumerate(np.linspace(c['typing_start'],c['typing_end'],27)):
 add(float(when),tick(1450+(i%4)*230,.035),.11*(.85+.3*rng.random()),float(-.12+.24*i/26))
add(c['enter'],tick(850,.09)+np.pad(thump(120,.07),(0,round(.02*sr))),.22)
for i,when in enumerate(c['results']):add(when,chime(980+i*210,.16),.07,-.12+i*.12)
for i,when in enumerate(c['answer']):add(when,tick(2200+i*180,.045),.04)
add(c['citation'],tick(950,.09),.19);add(c['citation']+.06,chime(1800,.24),.08)
for key,amp in [('plus',.10),('number',.055),('pieces',.035)]:add(c[key],thump(180,.14),amp)
for i,when in enumerate(c['agency']):add(when,chime(900+i*300,.20),.04)
# No new jet samples: the approved native SFX are retained and time-conformed around the observed pass.
out[:round(.2*sr)]=0
sf.write(A/'premix.wav',out,sr,subtype='PCM_24')
scan=subprocess.run(['ffmpeg','-hide_banner','-i',str(A/'premix.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=10:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
m=json.loads(re.search(r'\{\s*"input_i".*?\}',scan.stderr,re.S).group())
flt=f"loudnorm=I=-16:TP=-1.5:LRA=10:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
subprocess.run(['ffmpeg','-v','error','-y','-i',str(A/'premix.wav'),'-af',flt,'-ar','48000','-c:a','pcm_s24le',str(A/'master.wav')],check=True)
(A/'mix-report.json').write_text(json.dumps({'status':c['status'],'source':str(src),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'source_is_separated_v7_music_and_sfx':True,'new_sfx':'Deterministic non-vocal impulses, oscillators and filtered noise','time_source':source,'time_destination':dest,'premix_loudness':m,'silence_first_seconds':.2},indent=2))
print('Audio conform ready; adjust cues against actual render before delivery.')
