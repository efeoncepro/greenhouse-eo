from pathlib import Path
import subprocess,json
D=Path(__file__).resolve().parent
A=D.parent/'2026-09-23_cmp003-sky-video/seedance/v17-refinement-plan'

def run(args):
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-n',*map(str,args)],check=True)
for label,start,end,w,h in [('4k',344,604,2160,3840),('1080p',293,613,1080,1920)]:
 src=A/f'sky-v17-restored-{label}.mp4';T=D/label;T.mkdir(exist_ok=True)
 color=['-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709']
 for part,ss,count in [('head',0,start),('tail',end,708-end)]:
  run(['-ss',str(ss/24),'-i',src,'-map','0:v:0','-frames:v',count,'-an','-c:v','copy',T/f'{part}.mp4'])
 filt=f'[0:v]split=2[x][y];[x]trim=start_frame={start}:end_frame=484,setpts=PTS-STARTPTS,format=rgb24[a];[1:v]scale={w}:{h}:flags=lanczos,format=rgb24,setpts=PTS-STARTPTS[b];[y]trim=start_frame=564:end_frame={end},setpts=PTS-STARTPTS,format=rgb24[c];[a][b][c]concat=n=3:v=1:a=0,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p[out]'
 run(['-filter_complex_threads','2','-i',src,'-i',D/'patch-lossless.mkv','-filter_complex',filt,'-map','[out]','-an','-frames:v',end-start,'-c:v','libx264','-preset','slow','-crf','12','-threads','6','-x264-params','repeat-headers=1:open-gop=0',*color,T/'middle.mp4'])
 (T/'concat.txt').write_text(''.join(f"file '{part}.mp4'\nduration {n/24:.12f}\n" for part,n in [('head',start),('middle',end-start),('tail',708-end)]))
 run(['-f','concat','-safe','0','-i',T/'concat.txt','-i',src,'-map','0:v:0','-map','1:a:0','-c','copy','-t','29.5',*color,'-movflags','+faststart+write_colr',D/f'sky-v18-blog-{label}.mp4'])
 print('Completed '+label,flush=True)
