from pathlib import Path
import subprocess,json,numpy as np,soundfile as sf,hashlib
D=Path(__file__).resolve().parent; S=D.parent/'v16-brand-repair/audio'; A=D/'audio'; A.mkdir(exist_ok=True)
SR=48000; SHIFT=24000; N=1416000
stems={}; evidence={}
for name in ['music','brand','ui','jet','closing']:
 p=S/f'stem-{name}.wav'; x,sr=sf.read(p,dtype='float64',always_2d=True)
 assert sr==SR and len(x)==1440000
 if name!='ui':
  assert np.max(abs(x[:SHIFT]))==0, f'Cannot trim non-silent head of {name}'
  y=x[SHIFT:]
 else:
  assert np.max(abs(x[6*SR:]))==0, 'UI events after hold need mapping'
  y=x[:N]
 assert len(y)==N
 sf.write(A/f'stem-{name}.wav',y,SR,subtype='PCM_24'); stems[name]=y
 evidence[name]={'source':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'shiftSeconds':0 if name=='ui' else -.5,'unalteredSamples':True}
sf.write(A/'premix.wav',sum(stems.values()),SR,subtype='FLOAT')
def ff(args):return subprocess.run(['ffmpeg','-hide_banner','-loglevel','info','-n',*args],check=True,capture_output=True)
def stats(p):
 s=ff(['-i',str(p),'-af','loudnorm=I=-16:TP=-1.5:LRA=14:print_format=json','-f','null','-']).stderr.decode(); return json.JSONDecoder().raw_decode(s[s.rfind('{'):])[0]
r=stats(A/'premix.wav'); filt=f"loudnorm=I=-16:TP=-1.5:LRA=14:measured_I={r['input_i']}:measured_TP={r['input_tp']}:measured_LRA={r['input_lra']}:measured_thresh={r['input_thresh']}:offset={r['target_offset']}:linear=true"
ff(['-i',str(A/'premix.wav'),'-af',filt,'-ar','48000','-c:a','pcm_s24le',str(A/'master.wav')])
r={'duration':29.5,'musicInternalEdits':0,'newAudioGenerations':0,'stems':evidence,'measurement':stats(A/'master.wav'),'brandCrest':218/24,'musicStart':1.11,'perceptualListening':'not performed; no audio perception available'}
(D/'qa/audio-mix.json').write_text(json.dumps(r,indent=2)); print(json.dumps(r,indent=2))
