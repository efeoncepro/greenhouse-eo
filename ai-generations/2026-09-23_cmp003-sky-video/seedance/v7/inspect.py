"""Evidence for a complete Seedance edit. Does not modify its input."""
from pathlib import Path
import subprocess,json,sys,hashlib,re

src=Path(sys.argv[1]).resolve()
qa=src.parent/(src.stem+'-qa');qa.mkdir(exist_ok=True)
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(src)]))
(qa/'metadata.json').write_text(json.dumps(meta,indent=2))
for start in range(0,30,5):
    subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(src),'-t','5','-vf','fps=4,scale=240:-1,tile=5x4','-frames:v','1',str(qa/f'contact-{start:02d}.jpg')],check=True)
audio=any(s['codec_type']=='audio' for s in meta['streams'])
report={'file':str(src),'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'duration':float(meta['format']['duration']),'audio_present':audio,'visual_review':'pending','speech_check':'pending'}
if audio:
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-vn','-ar','48000','-c:a','pcm_s16le',str(qa/'audio.wav')],check=True)
    scan=subprocess.run(['ffmpeg','-hide_banner','-i',str(src),'-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=10:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
    report['loudness']=json.loads(re.search(r'\{\s*"input_i".*?\}',scan.stderr,re.S).group())
    scan=subprocess.run(['ffmpeg','-hide_banner','-i',str(src),'-vn','-af','silencedetect=noise=-45dB:d=0.1','-f','null','-'],capture_output=True,text=True,check=True)
    (qa/'silence.txt').write_text(scan.stderr)
(qa/'report.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
