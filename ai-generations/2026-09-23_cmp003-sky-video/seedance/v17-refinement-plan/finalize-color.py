"""Explicit Rec.709 MP4 container tags; stream-copy, never recompress."""
from pathlib import Path
import subprocess,json,hashlib
D=Path(__file__).resolve().parent
report=[]
def payload(p,kind):
 return subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map',f'0:{kind}:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
for label in ['4k','1080p']:
 p=D/f'sky-v17-restored-{label}.mp4'; tmp=p.with_name(p.stem+'-color-final.mp4')
 before={k:payload(p,k) for k in ['v','a']}
 subprocess.run(['ffmpeg','-v','error','-n','-i',str(p),'-map','0','-c','copy','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-color_range','tv','-bsf:v','h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0','-movflags','+faststart+write_colr',str(tmp)],check=True)
 after={k:payload(tmp,k) for k in ['v','a']};assert before==after,'Stream copy altered payload'
 tmp.replace(p); report.append({'file':str(p),'before':before,'after':after,'reencoded':False})
(D/'qa/color-remux.json').write_text(json.dumps(report,indent=2))
c=D/'qa/composition.json'
if c.exists():
 r=json.loads(c.read_text());r['outputs']=[{'path':str(D/f'sky-v17-restored-{x}.mp4'),'sha256':hashlib.sha256((D/f'sky-v17-restored-{x}.mp4').read_bytes()).hexdigest()} for x in ['4k','1080p']];c.write_text(json.dumps(r,indent=2))
print('Rec.709 tags fixed; both compressed video and audio payloads unchanged')
