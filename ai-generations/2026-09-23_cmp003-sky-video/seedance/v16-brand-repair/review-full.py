"""Decode the actual restored/exported film for visual and technical review."""
from pathlib import Path
from PIL import Image, ImageDraw
import subprocess, json, sys, io

D = Path(__file__).resolve().parent
source = Path(sys.argv[1]) if len(sys.argv) > 1 else D / 'topaz-full-4k.mp4'
label = sys.argv[2] if len(sys.argv) > 2 else 'restored'
Q = D / 'qa' / label
Q.mkdir(parents=True, exist_ok=True)
meta = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(source)]))
(Q / 'metadata.json').write_text(json.dumps(meta, indent=2))
duration = float(meta['format']['duration'])
# A single decode, two samples per second, split into readable sheets.
w, h = 180, 320
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(source), '-vf', f'fps=2,scale={w}:{h}:in_color_matrix=bt709:out_range=pc,format=rgb24', '-f', 'rawvideo', '-'], stdout=subprocess.PIPE)
index = 0
while True:
    data = proc.stdout.read(w*h*3)
    if not data:
        break
    if len(data) != w*h*3:
        raise RuntimeError('Partial review frame')
    if index % 24 == 0:
        sheet = Image.new('RGB', (w*6, (h+22)*4), '#111')
        draw = ImageDraw.Draw(sheet)
    x = index % 6 * w
    y = (index % 24 // 6) * (h+22)
    sheet.paste(Image.frombytes('RGB', (w,h), data), (x,y+22))
    draw.text((x+5,y+4), f'{index/2:.2f}s', fill='white')
    index += 1
    if index % 24 == 0:
        sheet.save(Q / f'film-{(index-1)//24+1:02d}.jpg', quality=94)
if index % 24:
    sheet.save(Q / f'film-{(index-1)//24+1:02d}.jpg', quality=94)
if proc.wait() != 0:
    raise RuntimeError('Decode failed')
for t in [1, 3.5, 6.5, 8.75, 9.25, 9.5, 9.75, 11.75, 12.5, 12.75, 15.75, 18, 21, 24, 25.5, 26, 26.5, 28.5, 29.9]:
    if t >= duration:
        continue
    data = subprocess.check_output(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', str(source), '-frames:v', '1', '-vf', 'scale=1080:1920:in_color_matrix=bt709:out_range=pc,format=rgb24', '-f', 'image2pipe', '-vcodec', 'png', '-'])
    (Q / f'frame-{t:05.2f}.png').write_bytes(data)
print(json.dumps({'source':str(source), 'duration':duration, 'sampledFrames':index, 'sheets':(index+23)//24, 'reviewDirectory':str(Q)}))
