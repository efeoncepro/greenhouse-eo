#!/usr/bin/env python3
"""Hoja 3: el material que Sika ya tenía (carrusel Sikaflex-119, SikaSeal-170 2 en 1, cenefa y stopper),
rehecho en la línea POSIBLE con las piezas y patrones aprobados (post, módulo, sello de lanzamiento, firma)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); S = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(S, 'manual'))
import gen, gen2
from gen import firma, sello_lanz, word, K, W, Y, R, PURPLE, TEAL, BC, FIRMA_CORP, LOGO
gen2.ICONS_ALL = {**gen2.ICONS}
ICONS = gen2.ICONS
U = lambda p: 'file://' + os.path.join(S, p)
FONTS = open(os.path.join(S, 'reel', 'hf', 'a', 'fonts', 'faces.css')).read().replace("url('a/fonts/", "url('" + U('reel/hf/a/fonts/'))
loc = lambda h: h.replace(gen.LOGO, U('up/sika-triangulo.png')).replace(gen.FIRMA_CORP, U('up/sika-firma.png'))
FLEX_CUT = U('hoja3/sikaflex-contacto.png')

def page(w, h, body, bg=Y):
    return loc(f'''<!doctype html><html><head><meta charset="utf-8"><style>{FONTS}
body{{margin:0}} .f{{width:{w}px;height:{h}px;position:relative;overflow:hidden;background:{bg};font-family:'Barlow',sans-serif;color:{K}}}
.abs{{position:absolute}}</style></head><body><div class="f">{body}</div></body></html>''')

def titular(px, verbo, punto, fg=K, vcol=K):
    return (f'<div style="{BC}; font-size: {px}px; font-weight: 800; line-height: 0.9; color: {fg}"><span style="font-weight: 300">Innovar para</span><br>'
            f'<span style="color: {vcol}">{verbo}<span style="color: {punto}">.</span></span></div>')

def ben_rows(items, size=1.0, dark=False):
    fg, soft, rule, ic = (W, '#BDBDB6', 'rgba(255,255,255,0.22)', Y) if dark else (K, '#3D3D39', 'rgba(20,20,20,0.25)', K)
    return ''.join(
        f'<div style="display: flex; align-items: center; gap: {round(26*size)}px; padding: {round(24*size)}px 0; border-top: {max(1,round(2*size))}px solid {rule}">'
        f'<svg width="{round(56*size)}" height="{round(56*size)}" viewBox="0 0 24 24" fill="none" stroke="{ic}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0">{ICONS[i]}</svg>'
        f'<div><div style="{BC}; font-size: {round(54*size)}px; font-weight: 800; line-height: 0.95; color: {fg}">{t}</div>'
        f'<div style="font-size: {round(24*size)}px; font-weight: 500; color: {soft}; margin-top: {round(6*size)}px">{d}</div></div></div>'
        for i, t, d in items) + f'<div style="border-top: {max(1,round(2*size))}px solid {rule}"></div>'

def retailer(px=20):
    return (f'<div style="display: flex; align-items: center; gap: 12px; background: {K}; padding: 10px 14px; color: {W}; font-size: {px}px; font-weight: 700">'
            f'De venta en<div style="border: 1.5px dashed #BDBDB6; color: #E4E4DE; font-size: {round(px*0.75)}px; padding: 8px 12px">[Logo retailer]</div></div>')

F = {}
FLEX_BENS = [('mano', 'AGARRE INSTANTÁNEO', 'Fija sin martillo ni taladro.'), ('sol', 'PARA TODO CLIMA', 'Interior y exterior.'), ('reloj', 'SIN SOPORTE TEMPORAL', 'Sostiene desde el primer minuto.')]

# Carrusel Sikaflex-119 · lámina 2: los beneficios, con el envase de pie sobre la diagonal negra
F['car2'] = (1080, 1080, page(1080, 1080, f'''
<div class="abs" style="right:0;bottom:0;width:1080px;height:430px;background:{K};clip-path:polygon(0 42%,100% 0,100% 100%,0 100%)"></div>
<div class="abs" style="top:56px;left:64px">{firma(110, "amarillo", endoso=False)}</div>
<div class="abs" style="top:300px;left:64px;width:600px">
  <div style="{BC};font-size:46px;font-weight:800;line-height:1">Sikaflex®-119 High Tack</div>
  <div style="font-size:24px;font-weight:500;color:#3D3D39;margin-top:8px;margin-bottom:26px">Adhesivo de montaje de agarre instantáneo.</div>
  {ben_rows(FLEX_BENS, 0.82)}
</div>
<img class="abs" src="{FLEX_CUT}" style="right:-30px;bottom:40px;height:700px">
<div class="abs" style="top:56px;right:56px">{sello_lanz(200, "nuevo", PURPLE, "SIKAFLEX®-119 HIGH TACK", ("AGARRE", "INSTANTÁNEO"))}</div>'''))

# Carrusel Sikaflex-119 · lámina 3: el cierre con la firma y el punto de venta
F['car3'] = (1080, 1080, page(1080, 1080, f'''
<div class="abs" style="right:0;bottom:0;width:1080px;height:520px;background:{K};clip-path:polygon(0 38%,100% 0,100% 100%,0 100%)"></div>
<div class="abs" style="top:80px;left:64px">{firma(200, "amarillo")}</div>
<div class="abs" style="top:520px;left:64px;width:520px">{titular(84, "resolver", PURPLE)}</div>
<img class="abs" src="{FLEX_CUT}" style="right:60px;bottom:60px;height:760px">
<div class="abs" style="left:64px;bottom:64px">{retailer(22)}</div>'''))

def post_sikaseal(photo, pos, sub, prod='sikaseal'):
    bens = [('escudo', 'Resistente al moho'), ('gota', 'Impermeable y flexible'), ('cuadros', 'Baño, cocina y cancelería')]
    if prod == 'sikaflex':
        bens = [('mano', 'Agarre instantáneo'), ('sol', 'Para todo clima'), ('reloj', 'Sin soporte temporal')]
    return page(1080, 1080, f'''
<div class="abs" style="top:0;right:0;width:760px;height:1080px;clip-path:polygon(32.8% 0,100% 0,100% 100%,0 100%)"><img src="{photo}" style="width:760px;height:1080px;object-fit:cover;object-position:{pos};display:block"></div>
<div class="abs" style="top:56px;left:64px">{firma(132, "amarillo", endoso=False)}</div>
<div class="abs" style="top:400px;left:64px;width:440px">{titular(80, "resolver", PURPLE) if prod == "sikaflex" else titular(80, "simplificar", TEAL)}</div>
<div class="abs" style="left:64px;bottom:190px">{gen2.modulo("Sikaflex®-119 High Tack" if prod == "sikaflex" else "SikaSeal®-170 Sanisil", sub, bens, False, 300, True)}</div>
<div class="abs" style="top:56px;right:56px">{sello_lanz(220, "nuevo", PURPLE, "SIKAFLEX®-119 HIGH TACK", ("AGARRE", "INSTANTÁNEO")) if prod == "sikaflex" else sello_lanz(220, "2en1", TEAL, "ANTIHONGOS + USO GENERAL")}</div>
<img class="abs" src="{U('up/sika-firma.png')}" style="left:64px;bottom:56px;height:58px">
<div class="abs" style="right:48px;bottom:52px">{retailer(20)}</div>''')

gen2.ICONS_ALL = gen2.ICONS
F['ss1'] = (1080, 1080, post_sikaseal(U('hoja3/gen/ss1-amplia.png'), '70% 50%', 'Tan fácil que el cordón queda perfecto a la primera.'))
F['car2'] = (1080, 1080, post_sikaseal(U('hoja3/gen/flex-amplia.png'), '72% 50%', 'La repisa queda firme sin taladro ni soporte.', 'sikaflex'))
F['ss3'] = (1080, 1080, post_sikaseal(U('gen8/scene.png'), '50% 55%', 'Un solo sellador para baño, cocina y cancelería.'))

# Cenefa Sikaflex-119 (2400 x 400): firma horizontal, titular, beneficios y el envase de pie sobre el panel negro
F['cenefa'] = (2400, 400, page(2400, 400, f'''
<div class="abs" style="right:0;top:0;width:820px;height:400px;background:{K};clip-path:polygon(22% 0,100% 0,100% 100%,0 100%)"></div>
<div class="abs" style="top:60px;left:60px">{firma(118, "amarillo", endoso=False)}</div>
<div class="abs" style="top:92px;left:720px">{titular(92, "resolver", PURPLE)}</div>
<div class="abs" style="top:60px;left:1240px;width:440px">
  <div style="{BC};font-size:38px;font-weight:800;line-height:1">Sikaflex®-119 High Tack</div>
  <div style="font-size:20px;font-weight:500;color:#3D3D39;margin:6px 0 14px">Adhesivo de montaje de agarre instantáneo.</div>
  <div style="display:flex;gap:26px">{''.join(f'<div style="display:flex;flex-direction:column;gap:8px;width:120px"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="{K}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">{ICONS[i]}</svg><div style="font-size:18px;font-weight:700;line-height:1.15">{t.capitalize()}</div></div>' for i, t, d in FLEX_BENS)}</div>
</div>
<img class="abs" src="{FLEX_CUT}" style="right:150px;bottom:-14px;height:380px">
<div class="abs" style="top:40px;right:40px">{sello_lanz(150, "nuevo", PURPLE, "", ("NUEVO", ""))}</div>
<img class="abs" src="{U('up/sika-firma.png')}" style="left:60px;bottom:44px;height:46px">'''))

# Stopper Sikaflex-119 (900 x 1350): foto héroe a sangre (piedra pegada sin soporte) y el bloque amarillo en diagonal
F['stopper'] = (900, 1350, page(900, 1350, f'''
<img class="abs" src="{U('hoja3/gen/stopper-escena.png')}" style="inset:0;width:900px;height:1350px;object-fit:cover;display:block">
<div class="abs" style="left:0;top:0;width:900px;height:1350px;background:{Y};clip-path:polygon(0 0,52% 0,30% 34%,0 37%)"></div>
<div class="abs" style="top:40px;left:44px">{firma(90, "amarillo", endoso=False)}</div>
<div class="abs" style="top:236px;left:44px;width:270px">{titular(56, "resolver", PURPLE)}</div>
<div class="abs" style="left:44px;bottom:150px;width:330px;color:{W}">
  <div style="{BC};font-size:36px;font-weight:800;line-height:1;margin-bottom:14px">Sikaflex®-119 High Tack</div>
  {ben_rows(FLEX_BENS, 0.48, dark=True)}
</div>
<div class="abs" style="left:0;bottom:0;background:{Y};padding:16px 26px 14px 44px;clip-path:polygon(0 0,92% 0,100% 100%,0 100%)"><img src="{U('up/sika-firma.png')}" style="height:52px;display:block"></div>'''))

os.makedirs(os.path.join(HERE, 'html'), exist_ok=True)
for k, (w, h, v) in F.items():
    open(os.path.join(HERE, 'html', f'{k}.html'), 'w').write(v)
print('ok', list(F))
