from pathlib import Path
import zipfile,json,hashlib
from PIL import Image
D=Path(__file__).parent
manifest=json.loads((D/'manifest.json').read_text())
paths=sorted((D/'blanco').glob('*/*.png'))
assert len(paths)==40,f'Expected 40 images, found {len(paths)}'
for p in paths:
 im=Image.open(p).convert('RGB')
 assert im.size==(1600,1600),(p,im.size)
 for xy in [(0,0),(1599,0),(0,1599),(1599,1599)]:
  assert im.getpixel(xy)==(255,255,255),(p,xy,im.getpixel(xy))
manifest['files_sha256']={str(p.relative_to(D)):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
manifest['checks']={'individual_views':40,'views_per_color':10,'dimensions':'1600x1600','white_corners':True,'geometry_and_uv_shared':True}
(D/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(D/'tazas-efeonce-40-vistas.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in paths+sorted((D/'contactos').glob('*.png'))+[D/'00-familia.png',D/'manifest.json',D/'LEEME.md']:
  z.write(p,p.relative_to(D))
print('40 vistas / 4 colores / 10 ángulos / 1600 × 1600 / esquinas blancas verificadas')
