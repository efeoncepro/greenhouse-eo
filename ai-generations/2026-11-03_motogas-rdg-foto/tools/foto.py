# Registro fotográfico del Rey del Gas: escenas reales de barrio, el producto real y el Rey 2D integrado con sombras
# de la escena. Tipografía editorial en Poppins (la del cliente), marco de marca liviano (barra roja delgada).
# Imágenes como @@clave@@ (vista previa: file://, canvas: /_blob/<id>).
import os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

RED, INK = '#E01800', '#24110C'
MARCAS = ['Gasco', 'Abastible', 'Lipigas']
KG = ['5', '11', '15']
P = {'Gasco': {'5': ('13.000', 0), '11': ('18.000', 0), '15': ('25.000', 0)},
     'Abastible': {'5': ('12.000', 0), '11': ('18.000', 0), '15': ('24.000', 0)},
     'Lipigas': {'5': ('11.900', 0), '11': ('16.900', 0), '15': ('20.900', 1)}}
DIR, WA, HASTA = 'Neptuno 934, Lo Prado', '+56 9 5460 6758', '26/08/26'

FONTS = '''<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&amp;display=swap" rel="stylesheet">
<style>
body{margin:0}
.p{font-family:Poppins,system-ui,sans-serif}
.n{font-variant-numeric:tabular-nums lining-nums}
</style>'''

WA_SVG = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="{c}" style="flex:none" aria-hidden="true"><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2zm5.6 13.7c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 .9c.3.2.5.2.6.4.1.1.1.8-.2 1.5z"/></svg>'
FLECHA = '<svg width="30" height="14" viewBox="0 0 34 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8h28M23 2l7 6-7 6"/></svg>'


def barra(der):
    """Marco de marca: una barra roja delgada con el logo y las condiciones."""
    return (f'  <div class="p" style="position:absolute;left:0;right:0;bottom:0;height:96px;background:{RED};display:flex;align-items:center;justify-content:space-between;padding:0 44px;box-sizing:border-box;color:#FFF">\n'
            f'    <img src="@@logo@@" alt="El Rey del Gas" style="width:200px;filter:brightness(0) invert(1)">\n'
            f'    <div class="n" style="text-align:right;font-size:19px;font-weight:600;line-height:1.35">{der}</div>\n  </div>\n')


def lienzo(fondo, cuerpo):
    return (f'<div class="p" style="width:1080px;height:1350px;position:relative;overflow:hidden;background:#EFE3D3">\n'
            f'  <img src="@@{fondo}@@" alt="" style="position:absolute;inset:0;width:1080px;height:1350px;object-fit:cover">\n{cuerpo}</div>\n')


def oferta():
    c = ''
    c += f'  <div style="position:absolute;left:56px;top:58px;font-size:26px;font-weight:600;color:{INK}">Oferta de la semana · <b style="font-weight:800">Lipigas 15 kg</b></div>\n'
    c += f'  <div class="n" style="position:absolute;left:46px;top:88px;font-size:184px;font-weight:800;letter-spacing:-.055em;line-height:1;color:{RED}">$20.900</div>\n'
    c += f'  <div style="position:absolute;left:56px;top:288px;font-size:40px;font-weight:700;letter-spacing:-.02em;color:{INK}">Recarga a precio de Rey.</div>\n'
    c += f'  <div style="position:absolute;right:44px;bottom:118px;display:flex;align-items:center;gap:10px;font-size:20px;font-weight:600;color:#FFF;text-shadow:0 1px 8px rgba(0,0,0,.45)">Desliza para ver todos los precios{FLECHA}</div>\n'
    c += barra(f'Sólo efectivo · Retiro en bodega<br><span style="display:inline-flex;align-items:center;gap:8px;font-size:24px;font-weight:800">{WA_SVG.format(s=22, c="#FFF")}{WA}</span>')
    return lienzo('foto-cocina', c)


def tabla():
    c = ''
    c += f'  <div style="position:absolute;left:56px;top:60px;font-size:24px;font-weight:600;color:rgba(36,17,12,.7)">{DIR} · Hasta el {HASTA}</div>\n'
    c += f'  <div style="position:absolute;left:52px;top:100px;font-size:96px;font-weight:800;letter-spacing:-.05em;line-height:.98;color:{INK}">Precios de<br>la semana</div>\n'
    x0, W0, W, ty, rh = 56, 150, 272, 430, 176
    for j, m in enumerate(MARCAS):
        c += f'  <div style="position:absolute;left:{x0 + W0 + j * W}px;top:{ty}px;width:{W}px;text-align:right;padding-right:24px;box-sizing:border-box;font-size:24px;font-weight:700;color:rgba(36,17,12,.62)">{m}</div>\n'
    for i, kg in enumerate(KG):
        y = ty + 52 + i * rh
        c += f'  <div style="position:absolute;left:{x0}px;right:48px;top:{y}px;height:2px;background:rgba(36,17,12,.14)"></div>\n'
        c += f'  <div class="n" style="position:absolute;left:{x0}px;top:{y}px;height:{rh}px;display:flex;align-items:center;font-size:44px;font-weight:800;letter-spacing:-.03em;color:{RED}">{kg} kg</div>\n'
        for j, m in enumerate(MARCAS):
            v, of = P[m][kg]
            x = x0 + W0 + j * W
            if of:
                c += f'  <div style="position:absolute;left:{x + 8}px;top:{y + 22}px;width:{W - 8}px;height:{rh - 44}px;border-radius:22px;background:{RED}"></div>\n'
                c += f'  <div style="position:absolute;left:{x}px;top:{y + 34}px;width:{W}px;text-align:right;padding-right:24px;box-sizing:border-box;font-size:17px;font-weight:700;color:#FFE1B0">Oferta</div>\n'
                c += f'  <div class="n" style="position:absolute;left:{x}px;top:{y + 58}px;width:{W}px;text-align:right;padding-right:24px;box-sizing:border-box;font-size:56px;font-weight:800;letter-spacing:-.04em;line-height:1.1;color:#FFF">${v}</div>\n'
            else:
                c += f'  <div class="n" style="position:absolute;left:{x}px;top:{y}px;width:{W}px;height:{rh}px;display:flex;align-items:center;justify-content:flex-end;padding-right:24px;box-sizing:border-box;font-size:56px;font-weight:800;letter-spacing:-.04em;color:{INK}">${v}</div>\n'
    c += f'  <div style="position:absolute;left:{x0}px;right:48px;top:{ty + 52 + 3 * rh}px;height:2px;background:rgba(36,17,12,.14)"></div>\n'
    c += f'  <div class="n" style="position:absolute;left:{x0}px;top:{ty + 90 + 3 * rh}px;display:flex;align-items:center;gap:12px;font-size:34px;font-weight:800;color:{INK}">{WA_SVG.format(s=34, c="#1FA855")}{WA}</div>\n'
    c += barra('Sólo efectivo · Retiro en bodega<br><b style="font-weight:800">Lo Prado · Cerro Navia</b>')
    return lienzo('foto-muro', c)


def horario():
    c = ''
    c += f'  <div style="position:absolute;left:58px;top:58px;font-size:26px;font-weight:600;color:{INK}">Horario · Lo Prado y Cerro Navia</div>\n'
    c += f'  <div style="position:absolute;left:52px;top:96px;font-size:112px;font-weight:800;letter-spacing:-.055em;line-height:.98;color:{INK}">Domingo, 14:58.<br><span style="color:{RED}">Todavía alcanzas.</span></div>\n'
    c += f'  <div class="n" style="position:absolute;left:300px;top:330px;display:grid;grid-template-columns:auto auto;column-gap:22px;row-gap:4px;align-items:baseline;color:{INK}">\n'
    c += f'    <span style="font-size:24px;font-weight:600">Lunes a sábado</span><span style="font-size:40px;font-weight:800;letter-spacing:-.02em">10:00 – 20:00</span>\n'
    c += f'    <span style="font-size:24px;font-weight:600">Domingos y festivos</span><span style="font-size:40px;font-weight:800;letter-spacing:-.02em;color:{RED}">10:00 – 15:00</span>\n  </div>\n'
    c += barra(f'Sólo efectivo · Retiro en bodega<br><span style="display:inline-flex;align-items:center;gap:8px;font-size:22px;font-weight:800">{WA_SVG.format(s=20, c="#FFF")}Lo Prado {WA}</span>')
    return lienzo('foto-pasaje', c)


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
for nombre, titulo, f in [('FotoRDG_1_Oferta', 'Rey del Gas · foto · lámina 1 oferta', oferta),
                          ('FotoRDG_2_Tabla', 'Rey del Gas · foto · lámina 2 tabla', tabla),
                          ('FotoRDG_3_Horario', 'Rey del Gas · foto · horario del domingo', horario)]:
    open(os.path.join(OUT, nombre + '.dc.html'), 'w').write(HEAD.format(titulo=titulo, fonts=FONTS) + f() + FOOT)
print('ok')
