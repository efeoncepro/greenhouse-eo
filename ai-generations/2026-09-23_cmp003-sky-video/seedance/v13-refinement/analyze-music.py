from pathlib import Path
import numpy as np,soundfile as sf
from scipy.signal import find_peaks
D=Path(__file__).resolve().parent;S=D/'audio-separated/htdemucs_ft/audio'
x,sr=sf.read(S/'drums.wav');hop=int(sr*.01);n=len(x)//hop;env=np.sqrt(np.mean(x[:n*hop].reshape(n,hop,2)**2,axis=(1,2)));peaks,_=find_peaks(env,distance=25,prominence=.012)
print('drum peaks',[(round(p*.01,2),round(env[p],3)) for p in peaks]);ac=np.correlate(env[300:1400]-env[300:1400].mean(),env[300:1400]-env[300:1400].mean(),'full')[1099:];print('beat lag candidates',sorted([(round(ac[k],3),round(k*.01,2)) for k in range(30,85)],reverse=True)[:5])
