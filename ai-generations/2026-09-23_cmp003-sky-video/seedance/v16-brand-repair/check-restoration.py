"""Compare all 624 restored frames with the supplied plate; not a visual pass."""
import subprocess, json, numpy as np
from pathlib import Path

D = Path(__file__).resolve().parent
W,H = 108,192
def frames(name):
    b = subprocess.check_output(['ffmpeg','-v','error','-i',str(D/name),'-an','-vf',f'scale={W}:{H}:in_color_matrix=bt709:out_range=pc,format=rgb24','-f','rawvideo','-'])
    return np.frombuffer(b,np.uint8).reshape(-1,H,W,3).astype(np.float32)
a,b=frames('restore-full-input.mp4'),frames('topaz-full-4k.mp4')
assert len(a)==len(b)==624, (len(a),len(b))
errors=np.mean(abs(a-b),axis=(1,2,3))
stepsA=np.mean(abs(np.diff(a,axis=0)),axis=(1,2,3))
stepsB=np.mean(abs(np.diff(b,axis=0)),axis=(1,2,3))
worst=np.argsort(errors)[-12:][::-1]
report={'framesCompared':624,'alignedDurationSeconds':26,'lowResolutionComparison':[W,H], 'meanRGBError':float(errors.mean()),'maxRGBError':float(errors.max()), 'highestErrorFrames':[{'frame':int(i),'time':float(i/24),'rgbError':float(errors[i])} for i in worst], 'temporalStepCorrelation':float(np.corrcoef(stepsA,stepsB)[0,1]), 'perFrameRGBError':errors.tolist(), 'limitation':'Numerical alignment aid only; visual assessment required for text, aircraft, texture and temporal artifacts.'}
(D/'qa/restoration-frame-check.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='perFrameRGBError'},indent=2))
