from pathlib import Path
import subprocess,json,hashlib,numpy as np
D=Path(__file__).resolve().parent; Q=D/'qa'
records=[]
def run(args):return subprocess.run(['ffmpeg','-hide_banner','-nostats','-loglevel','error',*args],check=True,capture_output=True)
def stats(p):
 r=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(p),'-af','loudnorm=I=-16:TP=-1.5:LRA=14:print_format=json','-f','null','-'],check=True,capture_output=True).stderr.decode();return json.JSONDecoder().raw_decode(r[r.rfind('{'):])[0]
for label,w,h in [('4k',2160,3840),('1080p',1080,1920)]:
 p=D/f'sky-v17-restored-{label}.mp4'; m=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(p)])); v=next(s for s in m['streams'] if s['codec_type']=='video'); a=next(s for s in m['streams'] if s['codec_type']=='audio')
 assert (v['width'],v['height'])==(w,h) and v['r_frame_rate']=='24/1' and int(v['nb_frames'])==708
 assert abs(float(m['format']['duration'])-29.5)<.001
 assert all(v[k]=='bt709' for k in ['color_space','color_transfer','color_primaries'])
 run(['-i',str(p),'-f','null','-'])
 ah=run(['-i',str(p),'-map','0:a','-c','copy','-f','hash','-hash','sha256','-']).stdout.decode().strip()
 records.append({'file':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'width':w,'height':h,'frames':708,'fps':24,'seconds':29.5,'rec709':True,'videoBitrate':v.get('bit_rate'),'audioBitrate':a.get('bit_rate'),'audioHash':ah,'decode':'pass'})
assert records[0]['audioHash']==records[1]['audioHash']
r={'outputs':records,'audio':stats(D/'sky-v17-restored-1080p.mp4'),'native4K':False,'perceptualAudioReview':'not performed; no audio perception available'}
(Q/'delivery-technical.json').write_text(json.dumps(r,indent=2));print(json.dumps(r,indent=2),flush=True)
W,H=108,192
def frames(p):
 b=run(['-i',str(p),'-an','-vf',f'scale={W}:{H}:in_color_matrix=bt709:out_range=pc,format=rgb24','-f','rawvideo','-']).stdout
 return np.frombuffer(b,np.uint8).reshape(-1,H,W,3).astype(np.float32)
a=frames(D.parent/'v16-brand-repair/sky-v16-restored-4k.mp4');b=frames(D/'sky-v17-restored-4k.mp4');mapping=json.loads((Q/'composition.json').read_text())['sourceFrames'];assert len(b)==len(mapping)==708
a=a[mapping];err=np.mean(abs(a-b),axis=(1,2,3));stepsA=np.mean(abs(np.diff(a,axis=0)),axis=(1,2,3));stepsB=np.mean(abs(np.diff(b,axis=0)),axis=(1,2,3))
r={'comparedFrames':708,'comparisonResolution':[W,H],'unchangedContentBeforeClosing':{'frames':612,'meanRGBError':float(err[:612].mean()),'maxRGBError':float(err[:612].max())},'holdSourceFrames':mapping[144:204],'holdTemporalStepCorrelation':float(np.corrcoef(stepsA[140:218],stepsB[140:218])[0,1]),'holdBoundaryErrors':[float(x) for x in err[140:218]],'differenceExpectedAtClosing':'new SKY vector and native 4K vector render; other geometry preserved','limitation':'Numerical checks aid alignment and color review; not perceptual motion/audio certification'}
(Q/'frame-correspondence.json').write_text(json.dumps(r,indent=2));print(json.dumps({k:v for k,v in r.items() if k!='holdBoundaryErrors'},indent=2))
