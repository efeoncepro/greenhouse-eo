from pathlib import Path
import subprocess,io,json
from PIL import Image,ImageDraw
D=Path(__file__).resolve().parent; Q=D/'qa/export-review';Q.mkdir(exist_ok=True)
source=D/'sky-v17-restored-1080p.mp4'
p=subprocess.run(['ffmpeg','-v','error','-i',str(source),'-an','-vf','scale=180:320:in_color_matrix=bt709:out_range=pc,format=rgb24','-f','rawvideo','-'],check=True,capture_output=True)
data=p.stdout;size=180*320*3;assert len(data)==708*size
def sheet(indices,name,cols=6):
 w,h=180,342;out=Image.new('RGB',(cols*w,((len(indices)+cols-1)//cols)*h),'#151515');draw=ImageDraw.Draw(out)
 for j,i in enumerate(indices):
  x=j%cols*w;y=j//cols*h;out.paste(Image.frombytes('RGB',(180,320),data[i*size:(i+1)*size]),(x,y+22));draw.text((x+4,y+4),f'f{i} / {i/24:.3f}s',fill='white')
 out.save(Q/(name+'.jpg'),quality=95)
indices=list(range(0,708,12))
for j in range(0,len(indices),24):sheet(indices[j:j+24],f'film-{j//24+1}')
# Every exported frame across retime and activation, readable in four sheets.
indices=list(range(140,236))
for j in range(0,len(indices),24):sheet(indices[j:j+24],f'hold-dense-{j//24+1}')
sheet(list(range(604,640,2)),'closing-entry')
for label in ['4k','1080p']:
 p=D/f'sky-v17-restored-{label}.mp4'
 for t in [8.75,9.125,12,18,25.75,28.5]:
  out=Q/f'{label}-{t}.png'; subprocess.run(['ffmpeg','-v','error','-n','-ss',str(t),'-i',str(p),'-frames:v','1',str(out)],check=True)
 # Native-pixel crop showing the white arrow/stem separation.
 im=Image.open(Q/f'{label}-28.5.png'); k=2 if label=='4k' else 1
 im.crop((675*k,845*k,970*k,1010*k)).save(Q/f'logo-native-{label}.png')
print(str(Q))
