#!/usr/bin/env python3
"""Storyboard del reel: 8 cuadros 1080×1920 en su punto de máximo impacto, con la línea aprobada."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
S = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(S, 'manual'))
import gen
import gen2

Y, K, W, R, TEAL = gen.Y, gen.K, gen.W, gen.R, gen.TEAL
BC = "font-family: 'Barlow Condensed', sans-serif"
U = lambda p: 'file://' + os.path.join(S, p)
FONTS = open(os.path.join(S, 'reel', 'hf', 'a', 'fonts', 'faces.css')).read().replace("url('a/fonts/", "url('" + U('reel/hf/a/fonts/'))


def local(h):
    return (h.replace(gen.LOGO, U('up/sika-triangulo.png'))
             .replace(gen.FIRMA_CORP, U('up/sika-firma.png'))
             .replace(gen.PROD, U('up/sikaseal-170.png')))


def page(body, bg=K):
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{FONTS}
body{{margin:0}} .f{{width:1080px;height:1920px;position:relative;overflow:hidden;background:{bg};font-family:'Barlow',sans-serif;color:{K}}}
.abs{{position:absolute}} .cond{{{BC};font-weight:800;line-height:.88;letter-spacing:-.01em}} .lt{{font-weight:300}}
</style></head><body><div class="f">{body}</div></body></html>'''


def tag(txt, top, left=None, right=None, size=118, bg=K, fg=Y):
    pos = f'left:{left}px' if left is not None else f'right:{right}px'
    return f'<div class="abs cond" style="top:{top}px;{pos};background:{bg};color:{fg};font-size:{size}px;line-height:1;padding:10px 28px 18px">{txt}</div>'


def strip(src, top, h=560, pos='50% 50%', dim=0):
    shade = f'<div class="abs" style="inset:0;background:rgba(0,0,0,{dim})"></div>' if dim else ''
    return (f'<div class="abs" style="left:0;top:{top}px;width:1080px;height:{h}px;overflow:hidden;clip-path:polygon(0 9%,100% 0,100% 91%,0 100%)">'
            f'<img src="{src}" style="width:1080px;height:{h}px;object-fit:cover;object-position:{pos};display:block">{shade}</div>')


firma = lambda s, sc, e=True: local(gen.firma(s, sc, endoso=e))
sello = lambda w, pie='ANTIHONGOS + USO GENERAL': local(gen.sello_lanz(w, '2en1', TEAL, pie))
GRAD_TOP = 'linear-gradient(180deg,rgba(0,0,0,.82) 0%,rgba(0,0,0,.55) 30%,rgba(0,0,0,0) 52%)'

F = {}

# 01 · GANCHO — la corona en su punto máximo
F['01'] = page(f'''
<img class="abs" src="{U('sbf/corona.png')}" style="inset:0;width:1080px;height:1920px;object-fit:cover;object-position:50% 100%">
<div class="abs" style="inset:0;background:{GRAD_TOP}"></div>
<div class="abs" style="left:80px;top:150px;color:{W}">
  <div class="cond lt" style="font-size:168px">¿Un sellador</div>
  <div class="cond lt" style="font-size:168px">para cada</div>
  <div class="cond" style="font-size:236px;color:{Y};margin-top:6px">lugar?</div>
</div>
<div class="abs" style="left:-60px;bottom:-40px;width:520px;height:120px;background:{Y};transform:rotate(-13deg)"></div>''')

# 02 · EL PROBLEMA — tres espacios en diagonal, etiquetas en zigzag
F['02'] = page(f'''
{strip(U('gen2/macro-vertical.png'), 90, pos='50% 55%')}
{strip(U('gen7/cocina-punch.png'), 680, pos='50% 62%')}
{strip(U('reel/kf/k2-canceleria.png'), 1270, pos='50% 50%')}
{tag('BAÑO.', 330, left=70)}
{tag('COCINA.', 905, right=70)}
{tag('CANCELERÍA.', 1500, left=70)}''', bg=Y)

# 03 · EL GIRO — los tres espacios se apagan y estalla la respuesta
F['03'] = page(f'''
{strip(U('gen2/macro-vertical.png'), 90, pos='50% 55%', dim=.55)}
{strip(U('gen7/cocina-punch.png'), 680, pos='50% 62%', dim=.55)}
{strip(U('reel/kf/k2-canceleria.png'), 1270, pos='50% 50%', dim=.55)}
<div class="abs" style="left:-80px;right:-80px;top:620px;height:700px;background:{Y};transform:rotate(-6deg);box-shadow:0 30px 60px rgba(0,0,0,.45)"></div>
<div class="abs" style="left:0;right:0;top:640px;transform:rotate(-6deg);text-align:center">
  <div class="cond" style="font-size:430px;line-height:.82">UNO</div>
  <div class="cond lt" style="font-size:250px;line-height:.9">solo.</div>
</div>''', bg=Y)

# 04 · LA APLICACIÓN — el cordón perfecto
F['04'] = page(f'''
<img class="abs" src="{U('sbf/aplicacion.png')}" style="inset:0;width:1080px;height:1920px;object-fit:cover;object-position:62% 50%">
<div class="abs" style="inset:0;background:linear-gradient(90deg,rgba(0,0,0,.6) 0%,rgba(0,0,0,.25) 45%,rgba(0,0,0,0) 70%)"></div>
<div class="abs" style="left:70px;top:150px;color:{W};width:470px">
  <div style="font-size:30px;font-weight:700;letter-spacing:.22em;color:{Y}">NUEVO</div>
  <div class="cond" style="font-size:112px;margin-top:18px">SikaSeal®-170</div>
  <div class="cond lt" style="font-size:84px;margin-top:14px">Un solo sellador.<br>Un cordón perfecto.</div>
</div>
<div class="abs" style="left:0;bottom:0;width:640px;height:150px;background:{Y};clip-path:polygon(0 0,86% 0,100% 100%,0 100%)"></div>
<img class="abs" src="{U('up/sika-firma.png')}" style="left:80px;bottom:46px;height:62px">''')

# 05 · EL HÉROE — la explosión de agua y el sello 2 en 1
F['05'] = page(f'''
<img class="abs" src="{U('reel/kf/k3-hero.png')}" style="left:0;top:180px;width:1080px;height:1620px;object-fit:cover">
<div class="abs" style="left:0;right:0;top:0;height:560px;background:linear-gradient(180deg,#0a0806 0%,#0a0806 50%,rgba(10,8,6,0) 100%)"></div>
<div class="abs" style="left:80px;top:120px;color:{W};width:600px">
  <div class="cond lt" style="font-size:128px">Innovar para</div>
  <div class="cond" style="font-size:150px;color:{Y}">simplificar.</div>
</div>
<div class="abs" style="right:60px;top:110px">{sello(300)}</div>
<div class="abs" style="left:0;bottom:120px;background:{Y};padding:26px 80px 30px 80px;clip-path:polygon(0 0,100% 0,90% 100%,0 100%)">
  <div class="cond" style="font-size:84px">SikaSeal®-170 Sanisil</div></div>''')

# 06 · BENEFICIOS — la prueba arriba, el módulo abajo
ICON = gen2.ICONS
def ben(key, t1, t2):
    return (f'<div style="display:flex;align-items:center;gap:36px;padding:36px 0;border-top:3px solid {K}">'
            f'<svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="{K}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{ICON[key]}</svg>'
            f'<div><div class="cond" style="font-size:92px;line-height:.95">{t1}</div><div style="font-size:34px;font-weight:500;color:#3D3D39;margin-top:8px">{t2}</div></div></div>')
F['06'] = page(f'''
<img class="abs" src="{U('sbf/corona.png')}" style="left:0;top:0;width:1080px;height:1020px;object-fit:cover;object-position:50% 85%">
<div class="abs" style="left:0;right:0;top:0;height:1020px;background:linear-gradient(180deg,rgba(0,0,0,.85) 0%,rgba(0,0,0,.6) 38%,rgba(0,0,0,0) 62%)"></div>
<div class="abs" style="left:80px;top:130px;color:{W}">
  <div style="font-size:32px;font-weight:700;letter-spacing:.22em;color:{Y}">NUEVA VERSIÓN 2 EN 1</div>
  <div class="cond" style="font-size:150px;margin-top:16px"><span class="lt">Antihongos</span><br>+ uso general.</div>
</div>
<div class="abs" style="left:0;right:0;bottom:0;height:1020px;background:{Y};clip-path:polygon(0 13%,100% 0,100% 100%,0 100%)"></div>
<div class="abs" style="left:80px;right:80px;top:1010px">
  {ben('escudo','RESISTENTE AL MOHO','Juntas limpias por más tiempo')}
  {ben('gota','IMPERMEABLE Y FLEXIBLE','Sella y acompaña el movimiento')}
  {ben('cuadros','BAÑO · COCINA · CANCELERÍA','Un solo sellador para toda la casa')}
  <div style="border-top:3px solid {K}"></div>
</div>''')

# 07 · LA FIRMA — monumental, con el producto de pie
F['07'] = page(f'''
<div class="abs" style="left:0;right:0;top:250px;display:flex;justify-content:center">{firma(300, 'amarillo')}</div>
<div class="abs" style="right:0;bottom:0;width:1080px;height:760px;background:{K};clip-path:polygon(0 30%,100% 0,100% 100%,0 100%)"></div>
<img class="abs" src="{U('sbf/prod-contact.png')}" style="left:300px;bottom:50px;height:990px">''', bg=Y)

# 08 · CIERRE — producto, sello, punto de venta y firma corporativa
F['08'] = page(f'''
<div class="abs" style="left:0;right:0;bottom:0;height:720px;background:{K};clip-path:polygon(0 30%,100% 0,100% 100%,0 100%)"></div>
<div class="abs" style="left:80px;top:150px;width:620px">
  <div class="cond lt" style="font-size:132px">Innovar para</div>
  <div class="cond" style="font-size:150px">simplificar<span style="color:{TEAL}">.</span></div>
</div>
<div class="abs" style="left:80px;top:540px;width:430px">
  <div class="cond" style="font-size:66px;line-height:1">SikaSeal®-170 Sanisil</div>
  <div style="font-size:30px;font-weight:500;color:#3D3D39;margin-top:12px;line-height:1.3">Un solo sellador para todas las juntas húmedas.</div>
</div>
<div class="abs" style="right:60px;top:150px">{sello(250)}</div>
<img class="abs" src="{U('up/sika-firma.png')}" style="left:80px;top:1110px;height:96px">
<img class="abs" src="{U('sbf/prod-contact.png')}" style="right:30px;bottom:150px;height:1010px">
<div class="abs" style="right:60px;bottom:60px;display:flex;align-items:center;gap:18px;color:{W};font-size:34px;font-weight:700;padding:16px 22px;border:2px solid #3A3A36">De venta en <div style="border:2px dashed #8A8A84;color:#E4E4DE;font-size:26px;padding:10px 16px;white-space:nowrap">[Logo retailer]</div></div>''', bg=Y)

os.makedirs(os.path.join(HERE, 'html'), exist_ok=True)
for k, v in F.items():
    open(os.path.join(HERE, 'html', f'{k}.html'), 'w').write(v)
print('ok', len(F))
