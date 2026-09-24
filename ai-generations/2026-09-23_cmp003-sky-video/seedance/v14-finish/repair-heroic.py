from pathlib import Path
import numpy as np,subprocess,soundfile as sf,json,hashlib
D=Path(__file__).resolve().parent;A=D/'audio';sr=48000
p=A/'music-v2.5-intro-repaired.wav'
x=np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(sr),'-ac','2','-f','f32le','-']),np.float32).reshape(-1,2).copy();y=x.copy()
# Reprise two bars from THIS clean instrumental introduction. Its 120 BPM transients
# at2.175/4.160/6.140 line up with6.175/8.160/10.140; bloom attacks at10.140.
# No V7 contaminated stem, no synthetic music, no changes to the ending.
a,b=round(6.05*sr),round(10.30*sr);src=round(2.05*sr)
bridge=x[src:src+b-a].copy();n=len(bridge)
w=np.ones(n);fi=round(.16*sr);fo=round(.26*sr)
w[:fi]=np.linspace(0,1,fi);w[-fo:]=np.linspace(1,0,fo)
y[a:b]=x[a:b]*(1-w[:,None])+bridge*w[:,None]
sf.write(A/'music-heroic-continuity-fixed.wav',y,sr,subtype='PCM_24')
r={'source':p.name,'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'sourcePhrase':[2.05,6.30],'destination':[6.05,10.30],'crossfadeSeconds':[.16,.26],'speed':1,'repriseCount':1,'newGeneration':False,'cost':0,'untouchedAfter':10.30,'rmsSeconds6to11':[float(np.sqrt(np.mean(y[i*sr:(i+1)*sr]**2))) for i in range(6,12)],'perceptualListening':'User review required; agent has no audio perception'}
(D/'qa/heroic-local-bridge.json').write_text(json.dumps(r,indent=2));print(r)
