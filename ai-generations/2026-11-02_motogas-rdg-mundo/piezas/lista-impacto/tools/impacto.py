# Prueba de impacto de la lista del Rey del Gas: carrusel de 2 láminas en dos temas (crema y noche).
# Lámina 1: el precio de la oferta armado con dígitos 3D inflados (biblioteca fija), el Rey sentado sobre el número,
# el cilindro de la marca detrás y un objeto del kit desenfocado adelante. Lámina 2: la tabla completa, limpia.
# Imágenes y fuentes como @@clave@@ (vista previa: file://, canvas: /_blob/<id>).
import os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

GL = {'0': (533, 700), '1': (421, 700), '2': (483, 700), '3': (507, 700), '4': (549, 700), '5': (486, 700),
      '6': (493, 700), '7': (495, 700), '8': (502, 700), '9': (512, 700), '$': (416, 700), '.': (321, 329)}
KEY = {**{str(i): f'g-d{i}' for i in range(10)}, '$': 'g-ddollar', '.': 'g-dperiod'}

TEMAS = {
    'crema': dict(bg='#F4EBDF', piso='#E9DACA', tinta='#2A0B08', suave='rgba(42,11,8,.62)', acento='#E01800',
                  acento2='#E01800', logo='', sombra='rgba(110,30,10,.38)', linea='rgba(42,11,8,.14)',
                  oferta_bg='#E01800', oferta_tx='#FFFFFF', oferta_lb='#FFE3A3', pie_bg='#2A0B08', pie_tx='#FFF6EA'),
    'noche': dict(bg='#2A0806', piso='#1E0503', tinta='#FFF3E2', suave='rgba(255,243,226,.66)', acento='#FEAC10',
                  acento2='#FF3B1F', logo='filter:brightness(0) invert(1);', sombra='rgba(0,0,0,.55)',
                  linea='rgba(255,243,226,.16)', oferta_bg='#FEAC10', oferta_tx='#2A0B08', oferta_lb='#7A2A00',
                  pie_bg='#FEAC10', pie_tx='#2A0B08'),
}

MARCAS = ['Gasco', 'Abastible', 'Lipigas']
KG = ['5', '11', '15']
P = {'Gasco': {'5': ('13.000', 0), '11': ('18.000', 0), '15': ('25.000', 0)},
     'Abastible': {'5': ('12.000', 0), '11': ('18.000', 0), '15': ('24.000', 0)},
     'Lipigas': {'5': ('11.900', 0), '11': ('16.900', 0), '15': ('20.900', 1)}}
DIR, WA, HASTA = 'Neptuno 934, Lo Prado', '+56 9 5460 6758', '26/08/26'
OFERTA = ('Lipigas', '15', '$20.900')

FONTS = '''<style>
body{margin:0}
@font-face{font-family:Metropolis;font-weight:600;src:url(@@Metropolis-SemiBold@@)}
@font-face{font-family:Metropolis;font-weight:700;src:url(@@Metropolis-Bold@@)}
@font-face{font-family:Metropolis;font-weight:800;src:url(@@Metropolis-ExtraBold@@)}
@font-face{font-family:Metropolis;font-weight:900;src:url(@@Metropolis-Black@@)}
.m{font-family:Metropolis,system-ui,sans-serif}
.n{font-variant-numeric:tabular-nums lining-nums}
</style>'''

WA_SVG = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="{c}" style="flex:none" aria-hidden="true"><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2zm5.6 13.7c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 .9c.3.2.5.2.6.4.1.1.1.8-.2 1.5z"/></svg>'


def precio3d(texto, x, base, h, t):
    """Arma el precio con la biblioteca de dígitos 3D. Devuelve (html, cajas)."""
    html, cajas, cx = '', [], x
    for ch in texto:
        w0, h0 = GL[ch]
        gh = h * h0 / 700
        if ch == '.':
            gh = h * .27
        if ch == '$':
            gh = h * 1.14
        gw = gh * w0 / h0
        top = base - gh + (h * .07 if ch == '$' else 0)
        html += (f'  <div style="position:absolute;left:{cx + gw * .08:.0f}px;top:{base - h * .035:.0f}px;width:{gw * .9:.0f}px;height:{h * .09:.0f}px;'
                 f'border-radius:50%;background:radial-gradient(ellipse at center,{t["sombra"]} 0%,rgba(0,0,0,0) 70%);filter:blur(4px)"></div>\n')
        html += (f'  <img src="@@{KEY[ch]}@@" alt="" style="position:absolute;left:{cx:.0f}px;top:{top:.0f}px;height:{gh:.0f}px;'
                 f'filter:drop-shadow({h * .025:.0f}px {h * .04:.0f}px {h * .05:.0f}px {t["sombra"]})">\n')
        cajas.append((ch, cx, top, gw, gh))
        cx += gw - h * (.05 if ch != '.' else -.01)
    return html, cajas


def lienzo(t, cuerpo):
    return f'<div class="m" style="width:1080px;height:1350px;position:relative;overflow:hidden;background:{t["bg"]}">\n{cuerpo}</div>\n'


def hero(tema):
    t = TEMAS[tema]
    marca, kg, precio = OFERTA
    BASE, H = 1040, 226
    c = ''
    # piso: el plano donde se paran los números
    c += f'  <div style="position:absolute;left:0;right:0;top:{BASE - 6}px;bottom:0;background:{t["piso"]}"></div>\n'
    # cabecera
    c += f'  <img src="@@logo@@" alt="El Rey del Gas" style="position:absolute;left:52px;top:52px;width:236px;{t["logo"]}">\n'
    c += f'  <div class="n" style="position:absolute;right:52px;top:58px;text-align:right;font-size:20px;font-weight:700;line-height:1.35;color:{t["suave"]}">{DIR}<br>Hasta el {HASTA}</div>\n'
    # titular: la palabra como imagen
    c += f'  <div style="position:absolute;left:48px;top:150px;font-size:26px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:{t["acento"]}">Oferta del Rey</div>\n'
    c += f'  <div style="position:absolute;left:42px;top:186px;font-size:150px;font-weight:900;letter-spacing:-.06em;line-height:.86;color:{t["tinta"]}">{marca}<br><span style="color:{t["acento2"]}">{kg} kg</span></div>\n'
    # el cilindro de la marca, detrás del precio
    ch = 640
    c += f'  <div style="position:absolute;left:{742 - 150}px;top:{BASE - 40}px;width:300px;height:44px;border-radius:50%;background:radial-gradient(ellipse at center,{t["sombra"]} 0%,rgba(0,0,0,0) 70%);filter:blur(6px)"></div>\n'
    c += f'  <img src="@@lipigas-cil@@" alt="Cilindro Lipigas de 15 kg" style="position:absolute;left:{742 - ch * 906 / 1350 / 2:.0f}px;top:{BASE - ch + 6}px;height:{ch}px;filter:drop-shadow(10px 16px 18px {t["sombra"]})">\n'
    # el precio en 3D
    num, cajas = precio3d(precio, 34, BASE, H, t)
    c += num
    # el Rey sentado sobre el «2»
    _, x2, top2, w2, _ = cajas[1]
    rh = 360
    rw = rh * 824 / 1300
    c += f'  <img src="@@rey-sentado@@" alt="El Rey del Gas sentado sobre el precio" style="position:absolute;left:{x2 + w2 / 2 - rw * .52:.0f}px;top:{top2 + 4 - rh * .70:.0f}px;height:{rh}px;filter:drop-shadow(8px 12px 8px {t["sombra"]})">\n'
    # primer plano: el tesoro, grande, desenfocado y cortado por el borde
    c += f'  <img src="@@3d-tesoro@@" alt="" style="position:absolute;right:-110px;bottom:-130px;height:440px;transform:rotate(-12deg);filter:blur(7px)">\n'
    # pie
    c += f'  <div style="position:absolute;left:52px;top:1120px;font-size:22px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:{t["acento"]}">Sólo efectivo · Retiro en bodega</div>\n'
    c += f'  <div class="n" style="position:absolute;left:52px;top:1158px;display:flex;align-items:center;gap:14px;font-size:44px;font-weight:900;letter-spacing:-.02em;color:{t["tinta"]}">{WA_SVG.format(s=40, c="#1FA855")}{WA}</div>\n'
    c += f'  <div style="position:absolute;left:52px;top:1252px;display:flex;align-items:center;gap:12px;font-size:22px;font-weight:700;color:{t["suave"]}">Desliza para ver todos los precios<svg width="34" height="16" viewBox="0 0 34 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8h28M23 2l7 6-7 6"/></svg></div>\n'
    return lienzo(t, c)


def tabla(tema):
    t = TEMAS[tema]
    c = ''
    c += f'  <img src="@@logo@@" alt="El Rey del Gas" style="position:absolute;left:52px;top:52px;width:236px;{t["logo"]}">\n'
    c += f'  <div class="n" style="position:absolute;right:52px;top:58px;text-align:right;font-size:20px;font-weight:700;line-height:1.35;color:{t["suave"]}">{DIR}<br>Hasta el {HASTA}</div>\n'
    c += f'  <div style="position:absolute;left:46px;top:168px;font-size:112px;font-weight:900;letter-spacing:-.055em;line-height:.9;color:{t["tinta"]}">Precios de<br><span style="color:{t["acento2"]}">la semana.</span></div>\n'
    # tabla tipográfica, sin cajas
    x0, W0, W = 52, 150, 276
    ty = 500
    for j, m in enumerate(MARCAS):
        c += f'  <div style="position:absolute;left:{x0 + W0 + j * W}px;top:{ty}px;width:{W}px;text-align:right;padding-right:22px;box-sizing:border-box;font-size:24px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:{t["suave"]}">{m}</div>\n'
    rh = 190
    for i, kg in enumerate(KG):
        y = ty + 50 + i * rh
        c += f'  <div style="position:absolute;left:{x0}px;right:52px;top:{y}px;height:2px;background:{t["linea"]}"></div>\n'
        c += f'  <div class="n" style="position:absolute;left:{x0}px;top:{y}px;height:{rh}px;display:flex;align-items:center;font-size:76px;font-weight:900;letter-spacing:-.05em;color:{t["acento"]}">{kg}<span style="font-size:34px;margin-left:6px;letter-spacing:0">kg</span></div>\n'
        for j, m in enumerate(MARCAS):
            v, of = P[m][kg]
            x = x0 + W0 + j * W
            if of:
                c += f'  <div style="position:absolute;left:{x + 6}px;top:{y + 20}px;width:{W - 6}px;height:{rh - 40}px;border-radius:24px;background:{t["oferta_bg"]}"></div>\n'
                c += f'  <div style="position:absolute;left:{x}px;top:{y + 32}px;width:{W}px;text-align:right;padding-right:22px;box-sizing:border-box;font-size:17px;font-weight:900;letter-spacing:.18em;color:{t["oferta_lb"]}">OFERTA</div>\n'
                c += f'  <div class="n" style="position:absolute;left:{x}px;top:{y + 66}px;width:{W}px;text-align:right;padding-right:22px;box-sizing:border-box;font-size:54px;font-weight:900;letter-spacing:-.045em;color:{t["oferta_tx"]}">${v}</div>\n'
            else:
                c += f'  <div class="n" style="position:absolute;left:{x}px;top:{y}px;width:{W}px;height:{rh}px;display:flex;align-items:center;justify-content:flex-end;padding-right:22px;box-sizing:border-box;font-size:54px;font-weight:900;letter-spacing:-.045em;color:{t["tinta"]}">${v}</div>\n'
    c += f'  <div style="position:absolute;left:{x0}px;right:52px;top:{ty + 50 + 3 * rh}px;height:2px;background:{t["linea"]}"></div>\n'
    # el Paje asoma por el borde derecho, mirando la tabla
    c += f'  <img src="@@2d-guardia@@" alt="La Guardia Real" style="position:absolute;right:-30px;top:112px;height:300px;transform:scaleX(-1)">\n'
    # pie
    c += f'  <div style="position:absolute;left:0;right:0;bottom:0;height:150px;background:{t["pie_bg"]};display:flex;align-items:center;justify-content:space-between;padding:0 52px;box-sizing:border-box;color:{t["pie_tx"]}">\n'
    c += f'    <div><div style="font-size:21px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;opacity:.8">Sólo efectivo · Retiro en bodega</div>\n'
    c += f'      <div class="n" style="margin-top:8px;display:flex;align-items:center;gap:12px;font-size:42px;font-weight:900;letter-spacing:-.02em">{WA_SVG.format(s=38, c="currentColor")}{WA}</div></div>\n'
    c += f'    <div class="n" style="text-align:right;font-size:21px;font-weight:700;line-height:1.3;opacity:.85">Vigente hasta el<br><span style="font-size:36px;font-weight:900">{HASTA}</span></div>\n  </div>\n'
    return lienzo(t, c)


HEAD = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{titulo}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
{fonts}
</helmet>
'''
FOOT = '''</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1080,"height":1350}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
'''
for nombre, titulo, f in [('ImpactoRDG_1_Crema', 'Impacto · lámina 1 · crema', lambda: hero('crema')),
                          ('ImpactoRDG_2_Crema', 'Impacto · lámina 2 · crema', lambda: tabla('crema')),
                          ('ImpactoRDG_1_Noche', 'Impacto · lámina 1 · noche', lambda: hero('noche')),
                          ('ImpactoRDG_2_Noche', 'Impacto · lámina 2 · noche', lambda: tabla('noche'))]:
    open(os.path.join(OUT, nombre + '.dc.html'), 'w').write(HEAD.format(titulo=titulo, fonts=FONTS) + f() + FOOT)
print('ok')
