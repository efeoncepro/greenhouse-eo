from pathlib import Path
import subprocess,json
v=Path(__file__).resolve().parent;f=v/'finish';src=v/'sky-v6-silent-30s-916.mp4'
# One generated full-film source. Editorial retiming only; no separately generated airplane shots.
cuts=[('intro',0,3.75,3.75),('approach',9.75,12.375,2.625),('pass',12.375,15,1),('departure',15,18,2.375)]
for name,start,end,duration in cuts:
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(start),'-t',str(end-start),'-i',str(src),'-vf',f'setpts={(duration/(end-start))}*(PTS-STARTPTS),fps=24','-t',str(duration),'-an','-c:v','libx264','-crf','17','-preset','fast',str(f/(name+'.mp4'))],check=True)
clips=[f/'intro.mp4',f/'chat.mp4',f/'approach.mp4',f/'pass.mp4',f/'departure.mp4',f/'titles.mp4',v/'closing-official-5s.mp4']
cmd=['ffmpeg','-hide_banner','-loglevel','error','-y']
for p in clips:cmd+=['-i',str(p)]
filters=';'.join(f'[{i}:v]setsar=1,setpts=PTS-STARTPTS[v{i}]' for i in range(len(clips)))+';'+''.join(f'[v{i}]' for i in range(len(clips)))+f'concat=n={len(clips)}:v=1:a=0[v]'
out=v/'sky-v6-finished-silent.mp4'
subprocess.run(cmd+['-filter_complex',filters,'-map','[v]','-an','-c:v','libx264','-crf','17','-preset','fast','-pix_fmt','yuv420p','-t','30','-movflags','+faststart',str(out)],check=True)
(f/'edit-decision-list.json').write_text(json.dumps({'generated_source':str(src),'cuts':cuts,'assembled_inputs':[str(p) for p in clips],'native_finishing':'user/answer/citation, typography, official closing','output':str(out)},indent=2))
print(out)
