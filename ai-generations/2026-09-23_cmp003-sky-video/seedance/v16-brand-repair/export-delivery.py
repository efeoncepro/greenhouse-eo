"""Export reviewed 4K picture and the existing mix, then a 1080p derivative."""
from pathlib import Path
import subprocess, json, hashlib

D = Path(__file__).resolve().parent
four = D / 'sky-v16-restored-4k.mp4'
hd = D / 'sky-v16-restored-1080p.mp4'
color = ['-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart+write_colr']

def ff(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-n', *args], check=True)

if not four.exists():
    ff(['-i', str(D/'sky-v16-picture-4k.mp4'), '-i', str(D/'audio/master.wav'), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', '30', *color, str(four)])
if not hd.exists():
    ff(['-i', str(four), '-map', '0:v:0', '-map', '0:a:0', '-vf', 'scale=1080:1920:flags=lanczos:in_color_matrix=bt709:out_color_matrix=bt709:out_range=tv', '-c:v', 'libx264', '-preset', 'medium', '-crf', '14', '-pix_fmt', 'yuv420p', '-c:a', 'copy', *color, str(hd)])

records = []
for p, dims in [(four,(2160,3840)), (hd,(1080,1920))]:
    meta = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(p)]))
    v = next(s for s in meta['streams'] if s['codec_type']=='video')
    a = next(s for s in meta['streams'] if s['codec_type']=='audio')
    assert (v['width'],v['height']) == dims
    assert v['r_frame_rate']=='24/1' and int(v['nb_frames'])==720
    assert abs(float(meta['format']['duration'])-30)<0.001
    assert all(v[k]=='bt709' for k in ['color_space','color_transfer','color_primaries'])
    ff(['-i', str(p), '-f', 'null', '-'])
    audio_hash = subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-map','0:a:0','-c','copy','-f','hash','-hash','sha256','-']).decode().strip()
    records.append({'file':str(p),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'width':v['width'],'height':v['height'],'fps':24,'frames':720,'seconds':30,'rec709':True,'videoBitrate':v.get('bit_rate'),'audioBitrate':a.get('bit_rate'),'audioPayloadHash':audio_hash,'decode':'pass'})
assert records[0]['audioPayloadHash']==records[1]['audioPayloadHash']
(D/'qa/delivery-technical.json').write_text(json.dumps({'outputs':records,'resolutionNote':'4K restored/upscaled from the 1080p edit; not native 4K','perceptualAudioReview':'not performed; no audio perception in this session'},indent=2))
print(json.dumps(records,indent=2))
