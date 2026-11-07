# Pieza hero «Bienvenidos al Reino»: escenario real + mundo 3D satinado + corte 2D, por capas.
import json, sys, os

OUT = sys.argv[1]
B = json.loads(sys.argv[2])
u = lambda k: '/_blob/' + B[k]
AR = json.loads(sys.argv[3])  # nombre -> [ancho, alto] del recorte

def capa(k, cx, base, h, rot=0, blur=0, sombra=0.0, flip=False, z=''):
    """Elemento centrado en `cx`, apoyado en `base` (px desde arriba), de alto `h`."""
    w, hh = AR[k]
    ancho = int(h * w / hh)
    left, top = int(cx - ancho / 2), int(base - h)
    out = ''
    if sombra:
        out += f'  <div style="position:absolute;left:{int(cx - ancho*0.55)}px;top:{int(base - h*0.035)}px;width:{int(ancho*1.1)}px;height:{int(h*0.08)}px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(40,4,2,{sombra}) 0%,rgba(40,4,2,0) 70%);filter:blur(6px)"></div>\n'
    f = f'blur({blur}px) ' if blur else ''
    sc = ' scaleX(-1)' if flip else ''
    out += f'  <img src="{u(k)}" alt="" style="position:absolute;left:{left}px;top:{top}px;height:{h}px;transform:rotate({rot}deg){sc};filter:{f}drop-shadow(0 {int(h*.03)}px {int(h*.04)}px rgba(40,4,2,.35))">\n'
    return out

def personaje(k, cx, base, h, flip=False, alt=''):
    w, hh = AR[k]
    ancho = int(h * w / hh)
    left, top = int(cx - ancho / 2), int(base - h)
    src = u(k)
    sc = 'transform:scaleX(-1);' if flip else ''
    return f'''  <div style="position:absolute;left:{int(cx - ancho*0.5)}px;top:{int(base - h*0.03)}px;width:{ancho}px;height:{int(h*0.07)}px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(40,4,2,.55) 0%,rgba(40,4,2,0) 70%);filter:blur(4px)"></div>
  <div style="position:absolute;left:{left}px;top:{top}px;height:{h}px;{sc}">
    <img src="{src}" alt="{alt}" style="position:relative;display:block;height:{h}px">
    <div style="position:absolute;inset:0;-webkit-mask-image:url({src});mask-image:url({src});-webkit-mask-size:auto 100%;mask-size:auto 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;background:radial-gradient(ellipse at 50% 0%,rgba(255,226,160,.35) 0%,rgba(255,226,160,0) 60%),linear-gradient(to bottom,rgba(0,0,0,0) 55%,rgba(60,8,4,.30) 100%);mix-blend-mode:soft-light"></div>
  </div>
'''

GRANO = '''  <svg style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.2" width="1080" height="1350" aria-hidden="true"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1350" filter="url(#g)"/></svg>
'''

capas = ''
# fondo del escenario: el palacio y los dos castillos al fondo
capas += capa('3d-castillo-rojo', 250, 850, 230, sombra=.35)
capas += capa('3d-castillo-naranjo', 830, 850, 230, sombra=.35)
capas += capa('3d-palacio', 540, 860, 360, sombra=.45)
# camino real que baja del trono hacia la cámara
capas += capa('3d-camino-real', 540, 1250, 560, sombra=0)
# trono y el Rey
capas += capa('3d-trono', 540, 1020, 440, sombra=.6)
capas += personaje('2d-rey-trono', 548, 900, 370, alt='El Rey del Gas en su trono')
# la corte
capas += personaje('2d-heraldo', 340, 880, 220, alt='El Heraldo')
capas += personaje('2d-guardia', 150, 1060, 390, alt='La Guardia Real')
capas += personaje('2d-paje', 320, 1040, 230, alt='El Paje')
capas += personaje('2d-escudero', 760, 1050, 280, alt='El Escudero')
capas += personaje('2d-gigante', 950, 1090, 430, alt='El Gigante')
# primer plano: lo que salta hacia la cámara
capas += capa('3d-tesoro', 70, 1420, 360, rot=-14, blur=7)
capas += capa('3d-cetro', 1030, 1400, 460, rot=28, blur=8)

hero = f'''<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:#3A0805">
  <img src="{u('escenario')}" alt="" style="position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover">
{capas}  <div style="position:absolute;left:0;right:0;top:0;height:280px;background:linear-gradient(to bottom,rgba(40,4,2,.55),rgba(40,4,2,0))"></div>
  <img src="{u('logo')}" alt="El Rey del Gas" style="position:absolute;left:330px;top:96px;width:420px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 4px 10px rgba(40,4,2,.6))">
  <p class="p" style="position:absolute;left:0;right:0;top:1196px;margin:0;text-align:center;font-size:60px;font-weight:800;letter-spacing:-.04em;color:#FFF3DC;text-shadow:0 4px 18px rgba(40,4,2,.8)">¡Bienvenidos al Reino!</p>
  <p class="p" style="position:absolute;left:0;right:0;top:1270px;margin:0;text-align:center;font-size:20px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#F6C443">Lo Prado · Cerro Navia</p>
{GRANO}</div>
'''

HEAD = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Bienvenidos al Reino</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&amp;display=swap" rel="stylesheet">
<style>
body{margin:0}
.p{font-family:Poppins,system-ui,sans-serif}
</style>
</helmet>
'''
FOOT = '''</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1080,"height":1350}}'>
class Component extends DCLogic {
  renderVals() { const respaldo = {}; return respaldo; }
}
</script>
</body>
</html>
'''
open(os.path.join(OUT, 'ReinoRDG_Hero.dc.html'), 'w').write(HEAD + hero + FOOT)
print('ok')
