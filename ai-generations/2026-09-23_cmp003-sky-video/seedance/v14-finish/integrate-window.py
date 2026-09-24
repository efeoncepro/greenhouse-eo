from pathlib import Path
import subprocess,json,hashlib
D=Path(__file__).resolve().parent
base=D.parent/'v13-refinement/sky-v13-picture-conformed.mp4'
omni=D/'omni-window-a-native.mp4'
out=D/'sky-v14-picture-conformed.mp4'
assert not out.exists()
# Original close pass until global 12.5417. Cut under aircraft occlusion.
# Only cloud pixels dissolve back 17.5–18.0; the airplane never overlaps copies.
f="[0:v]fps=24,format=yuv420p,setsar=1,settb=1/24,setpts=N[base];[1:v]trim=start_frame=25:end_frame=156,fps=24,format=yuva420p,setsar=1,settb=1/24,setpts=PTS-STARTPTS,fade=t=out:st=4.958333333:d=0.5:alpha=1,setpts=PTS+301[patch];[base][patch]overlay=eof_action=pass:enable='gte(t,12.541666667)':format=auto,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709[out]"
subprocess.run(['ffmpeg','-v','error','-i',str(base),'-i',str(omni),'-filter_complex',f,'-map','[out]','-an','-frames:v','720','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(out)],check=True)
(D/'qa/picture-integration.json').write_text(json.dumps({'source':str(base),'patch':str(omni),'cutFrame':301,'cloudDissolve':[420,432],'nativeAudioDiscarded':True,'allOmniFramesVisuallyInspected':156,'status':'pending montage review'},indent=2))
print(out)
