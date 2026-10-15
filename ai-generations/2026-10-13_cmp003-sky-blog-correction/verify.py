from pathlib import Path
import subprocess,json,hashlib
D=Path(__file__).resolve().parent;A=D.parent/'2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan'
def call(args):return subprocess.check_output(args)
def audio(p):return call(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
def frames(p):
 s=call(['ffmpeg','-v','error','-threads','4','-i',str(p),'-map','0:v:0','-an','-f','framemd5','-']).decode()
 return [line.split(',')[-1].strip() for line in s.splitlines() if not line.startswith('#')]
report=[]
for label,start,end in [('4k',344,604),('1080p',293,613)]:
 old=A/f'sky-v17-restored-{label}.mp4';new=D/f'sky-v18-blog-{label}.mp4'
 meta=json.loads(call(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(new)]))
 v=meta['streams'][0];assert int(v['nb_frames'])==708;assert v['r_frame_rate']=='24/1';assert float(v['duration'])==29.5
 assert all(v[k]=='bt709' for k in ['color_space','color_transfer','color_primaries'])
 af=audio(old);assert af==audio(new),'Audio modified'
 o=frames(old);n=frames(new);assert len(o)==len(n)==708
 assert o[:start]==n[:start] and o[end:]==n[end:],'Unedited blocks changed'
 pts=json.loads(call(['ffprobe','-v','error','-select_streams','v','-show_frames','-show_entries','frame=pts_time','-of','json',str(new)]))['frames']
 assert all(abs(float(f['pts_time'])-i/24)<0.000002 for i,f in enumerate(pts)),'Timestamp discontinuity'
 report.append({'file':str(new),'sha256':hashlib.sha256(new.read_bytes()).hexdigest(),'width':v['width'],'height':v['height'],'frames':len(n),'fps':24,'duration':29.5,'color':'Rec709','audioCompressedHashIdentical':af,'unchangedDecodedFramesOutsideReencodedWindow':True,'reencodedWindowFrames':[start,end-1],'actualNewTitleFrames':[484,563],'fullDecodePass':True,'ptsEveryFrameVerified':True})
 print(label+' verified',flush=True)
(D/'qa/verification.json').write_text(json.dumps(report,indent=2))
