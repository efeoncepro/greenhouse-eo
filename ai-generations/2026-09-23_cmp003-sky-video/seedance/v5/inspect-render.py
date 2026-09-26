from pathlib import Path
import subprocess,json,sys
v=Path(__file__).resolve().parent
src=Path(sys.argv[1]).resolve();qa=v/'qa';qa.mkdir(exist_ok=True)
meta=subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(src)],text=True)
(qa/'metadata.json').write_text(meta)
for start in range(0,30,5):
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',str(start),'-i',str(src),'-t','5','-vf',"fps=4,scale=216:-1,tile=5x4",'-frames:v','1',str(qa/f'contact-{start:02d}-{start+5:02d}.jpg')],check=True)
a=subprocess.run(['ffmpeg','-hide_banner','-i',str(src),'-af','ebur128=peak=true','-f','null','-'],capture_output=True,text=True)
(qa/'audio-levels.txt').write_text(a.stderr)
print(meta)
print(a.stderr[-700:])
