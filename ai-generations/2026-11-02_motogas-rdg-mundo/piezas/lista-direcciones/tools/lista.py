# Tres direcciones de la lista de precios del Rey del Gas (Lo Prado) + un meme de prueba del sistema.
# Imágenes y fuentes van como @@clave@@: la vista previa las cambia por file:// y el canvas por /_blob/<id>.
# Datos: lista del 26/08/26 (anexo lista-precios-legales §5). En el sistema elegido saldrán del JSON semanal.
import os, sys

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

RED = '#E01800'
DEEP = '#B81200'
INK = '#2A0B08'
MUST = '#FEAC10'
CROWN = '#FFC214'
CREAM = '#FFF6EA'

MARCAS = ['Gasco', 'Abastible', 'Lipigas']
KG = ['5', '11', '15']
P = {  # marca -> formato -> (precio, oferta)
    'Gasco': {'5': ('13.000', 0), '11': ('18.000', 0), '15': ('25.000', 0)},
    'Abastible': {'5': ('12.000', 0), '11': ('18.000', 0), '15': ('24.000', 0)},
    'Lipigas': {'5': ('11.900', 0), '11': ('16.900', 0), '15': ('20.900', 1)},
}
DIR = 'Neptuno 934, Lo Prado'
WA = '+56 9 5460 6758'
HASTA = '26/08/26'

FONTS = '''<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,900&amp;display=swap" rel="stylesheet">
<style>
body{margin:0}
@font-face{font-family:Metropolis;font-weight:500;src:url(@@Metropolis-Medium@@)}
@font-face{font-family:Metropolis;font-weight:600;src:url(@@Metropolis-SemiBold@@)}
@font-face{font-family:Metropolis;font-weight:700;src:url(@@Metropolis-Bold@@)}
@font-face{font-family:Metropolis;font-weight:800;src:url(@@Metropolis-ExtraBold@@)}
@font-face{font-family:Metropolis;font-weight:900;src:url(@@Metropolis-Black@@)}
@font-face{font-family:Komika;src:url(@@KOMIKAX@@)}
.m{font-family:Metropolis,system-ui,sans-serif}
.k{font-family:Komika,Metropolis,sans-serif}
.f{font-family:Fraunces,Georgia,serif}
.n{font-variant-numeric:tabular-nums lining-nums}
</style>'''

WA_SVG = '<svg width="{s}" height="{s}" viewBox="0 0 24 24" fill="{c}" style="flex:none"><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2zm5.6 13.7c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.1 1 2.1 1.3 2.4 1.5.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 .9c.3.2.5.2.6.4.1.1.1.8-.2 1.5z"/></svg>'

GRANO = '''  <svg style="position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:{o}" width="1080" height="1350" aria-hidden="true"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1350" filter="url(#g)"/></svg>
'''


def img(k, style, alt=''):
    return f'<img src="@@{k}@@" alt="{alt}" style="position:absolute;{style}">'


def lienzo(bg, cuerpo, grano=.12):
    return f'<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:{bg}">\n{cuerpo}{GRANO.format(o=grano)}</div>\n'


# ---------------------------------------------------------------- A · La corte es el catálogo
def dir_a():
    cols = [(240, 'paje', 'El Paje'), (507, 'escudero', 'El Escudero'), (774, 'guardia', 'La Guardia Real')]
    W = 266
    alto = {'paje': 270, 'escudero': 278, 'guardia': 350}
    c = ''
    c += '  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 80% 55% at 50% 38%,#FFFFFF 0%,rgba(255,255,255,0) 70%)"></div>\n'
    c += '  ' + img('logo', 'left:40px;top:44px;width:250px', 'El Rey del Gas') + '\n'
    c += f'  <div class="m n" style="position:absolute;right:40px;top:54px;text-align:right;font-size:20px;font-weight:600;line-height:1.35;color:rgba(42,11,8,.7)">{DIR}<br><span style="color:{RED};font-weight:800">Lista hasta el {HASTA}</span></div>\n'
    c += f'  <h1 class="f" style="position:absolute;left:38px;top:150px;margin:0;font-size:96px;font-weight:900;letter-spacing:-.035em;line-height:.92;color:{INK}">Elige tu<br><span style="color:{RED}">cilindro.</span></h1>\n'
    # la corte: cada personaje es su formato
    base = 640
    for x, k, alt in cols:
        cx = x + W // 2
        h = alto[k]
        c += f'  <div style="position:absolute;left:{cx - 92}px;top:{base - 14}px;width:184px;height:28px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(90,20,6,.32) 0%,rgba(90,20,6,0) 70%)"></div>\n'
        c += f'  <img src="@@2d-{k}@@" alt="{alt}" style="position:absolute;left:{cx}px;top:{base - h}px;height:{h}px;transform:translateX(-50%)">\n'
    c += f'  <div style="position:absolute;left:240px;top:{base + 22}px;width:{W * 3}px;display:flex">\n'
    for kg in KG:
        c += f'    <div style="width:{W}px;display:flex;justify-content:center"><span class="m n" style="padding:8px 22px;border-radius:999px;background:{INK};color:#FFF;font-size:30px;font-weight:900;letter-spacing:-.01em">{kg} kg</span></div>\n'
    c += '  </div>\n'
    # filas de marca
    y0, fh = 752, 124
    for i, m in enumerate(MARCAS):
        y = y0 + i * (fh + 12)
        c += f'  <div style="position:absolute;left:32px;right:32px;top:{y}px;height:{fh}px;border-radius:26px;background:#FFFFFF;box-shadow:0 10px 28px rgba(90,20,6,.10)"></div>\n'
        c += f'  <div class="m" style="position:absolute;left:62px;top:{y}px;height:{fh}px;display:flex;align-items:center;font-size:30px;font-weight:800;letter-spacing:.02em;text-transform:uppercase;color:{INK}">{m}</div>\n'
        for j, kg in enumerate(KG):
            v, of = P[m][kg]
            x = 240 + j * W
            if of:
                c += f'  <div style="position:absolute;left:{x + 10}px;top:{y + 10}px;width:{W - 20}px;height:{fh - 20}px;border-radius:20px;background:{RED}"></div>\n'
                c += f'  <div class="m" style="position:absolute;left:{x + 10}px;top:{y + 18}px;width:{W - 20}px;text-align:center;font-size:17px;font-weight:900;letter-spacing:.18em;color:{CROWN}">OFERTA</div>\n'
                c += f'  <div class="m n" style="position:absolute;left:{x}px;top:{y + 40}px;width:{W}px;text-align:center;font-size:50px;font-weight:900;letter-spacing:-.04em;color:#FFF">${v}</div>\n'
            else:
                c += f'  <div class="m n" style="position:absolute;left:{x}px;top:{y}px;width:{W}px;height:{fh}px;display:flex;align-items:center;justify-content:center;font-size:50px;font-weight:900;letter-spacing:-.04em;color:{INK}">${v}</div>\n'
    c += f'  <div class="m" style="position:absolute;left:40px;right:40px;top:1176px;display:flex;justify-content:space-between;font-size:21px;font-weight:700;color:rgba(42,11,8,.62)"><span><b style="color:{RED}">En rojo:</b> oferta de la semana</span><span>Vigente hasta el <b style="color:{INK}">{HASTA}</b></span></div>\n'
    # pie
    c += f'  <div class="m" style="position:absolute;left:32px;right:32px;bottom:34px;height:92px;border-radius:999px;background:{RED};display:flex;align-items:center;justify-content:space-between;padding:0 40px;box-sizing:border-box;color:#FFF">\n'
    c += f'    <span style="font-size:24px;font-weight:800;letter-spacing:.01em">Sólo efectivo · Retiro en bodega</span>\n'
    c += f'    <span class="n" style="display:flex;align-items:center;gap:12px;font-size:30px;font-weight:900;letter-spacing:-.01em">{WA_SVG.format(s=30, c="#FFF")}{WA}</span>\n  </div>\n'
    return lienzo('#F1EBE3', c)


# ---------------------------------------------------------------- B · La oferta primero
def dir_b():
    c = ''
    c += f'  <div style="position:absolute;inset:0;background:repeating-conic-gradient(from 0deg at 26% 30%,rgba(255,255,255,.07) 0deg 6deg,rgba(255,255,255,0) 6deg 14deg);-webkit-mask-image:radial-gradient(circle at 26% 30%,#000 0%,rgba(0,0,0,0) 62%);mask-image:radial-gradient(circle at 26% 30%,#000 0%,rgba(0,0,0,0) 62%)"></div>\n'
    c += '  ' + img('logo', 'left:44px;top:50px;width:230px;filter:brightness(0) invert(1)', 'El Rey del Gas') + '\n'
    c += f'  <div class="m" style="position:absolute;right:44px;top:56px;font-size:21px;font-weight:700;color:rgba(255,255,255,.88)">{DIR}</div>\n'
    c += '  ' + img('rey-megafono', 'left:6px;top:150px;height:520px;filter:drop-shadow(10px 16px 0 rgba(90,8,0,.35))', 'El Rey del Gas con megáfono') + '\n'
    c += f'  <div class="k" style="position:absolute;left:470px;top:196px;font-size:58px;line-height:1;color:{MUST};transform:rotate(-3deg);transform-origin:left center;text-shadow:4px 5px 0 {DEEP}">¡OFERTA<br>DEL REY!</div>\n'
    c += f'  <div class="m" style="position:absolute;left:478px;top:370px;font-size:40px;font-weight:800;letter-spacing:-.01em;color:#FFF">Lipigas 15 kg</div>\n'
    c += f'  <div class="m n" style="position:absolute;left:466px;top:420px;font-size:150px;font-weight:900;letter-spacing:-.06em;line-height:1;color:#FFF;text-shadow:7px 9px 0 {DEEP}">$20.900</div>\n'
    c += f'  <div class="m" style="position:absolute;left:480px;top:604px;font-size:21px;font-weight:700;color:rgba(255,255,255,.82)">Precio de la semana · hasta el {HASTA}</div>\n'
    # tabla
    tx, ty = 44, 720
    W0, W = 170, 275
    c += f'  <div style="position:absolute;left:{tx}px;right:{tx}px;top:{ty}px;height:3px;background:{MUST}"></div>\n'
    for j, m in enumerate(MARCAS):
        c += f'  <div class="m" style="position:absolute;left:{tx + W0 + j * W}px;top:{ty + 22}px;width:{W}px;text-align:center;font-size:28px;font-weight:900;letter-spacing:.06em;text-transform:uppercase;color:{MUST}">{m}</div>\n'
    rh = 116
    for i, kg in enumerate(KG):
        y = ty + 80 + i * rh
        c += f'  <div style="position:absolute;left:{tx}px;right:{tx}px;top:{y}px;height:1px;background:rgba(255,255,255,.25)"></div>\n'
        c += f'  <div class="m n" style="position:absolute;left:{tx}px;top:{y}px;height:{rh}px;display:flex;align-items:center;font-size:40px;font-weight:900;letter-spacing:-.02em;color:{MUST}">{kg} kg</div>\n'
        for j, m in enumerate(MARCAS):
            v, of = P[m][kg]
            x = tx + W0 + j * W
            if of:
                c += f'  <div style="position:absolute;left:{x + 18}px;top:{y + 14}px;width:{W - 36}px;height:{rh - 28}px;border-radius:18px;background:{MUST}"></div>\n'
                c += f'  <div class="m n" style="position:absolute;left:{x}px;top:{y}px;width:{W}px;height:{rh}px;display:flex;align-items:center;justify-content:center;font-size:52px;font-weight:900;letter-spacing:-.04em;color:{INK}">${v}</div>\n'
            else:
                c += f'  <div class="m n" style="position:absolute;left:{x}px;top:{y}px;width:{W}px;height:{rh}px;display:flex;align-items:center;justify-content:center;font-size:52px;font-weight:900;letter-spacing:-.04em;color:#FFF">${v}</div>\n'
    # pie
    c += f'  <div class="m" style="position:absolute;left:0;right:0;bottom:0;height:150px;background:{CREAM};display:flex;align-items:center;justify-content:space-between;padding:0 44px;box-sizing:border-box;color:{INK}">\n'
    c += f'    <div><div style="font-size:22px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:{RED}">Sólo efectivo · Retiro en bodega</div>\n'
    c += f'      <div class="n" style="margin-top:6px;display:flex;align-items:center;gap:12px;font-size:40px;font-weight:900;letter-spacing:-.02em">{WA_SVG.format(s=36, c="#1FA855")}{WA}</div></div>\n'
    c += f'    <div class="n" style="text-align:right;font-size:22px;font-weight:700;line-height:1.3;color:rgba(42,11,8,.7)">Vigente hasta el<br><span style="font-size:34px;font-weight:900;color:{INK}">{HASTA}</span></div>\n  </div>\n'
    return lienzo(RED, c, .1)


# ---------------------------------------------------------------- C · El reino arriba, el precio en la muralla
def dir_c():
    c = ''
    c += '  ' + img('reino-camino', 'left:0;top:-40px;width:1080px', '') + '\n'
    c += '  <div style="position:absolute;left:0;right:0;top:0;height:200px;background:linear-gradient(to bottom,rgba(255,246,234,.75),rgba(255,246,234,0))"></div>\n'
    c += '  ' + img('logo', 'left:50%;top:44px;width:330px;transform:translateX(-50%)', 'El Rey del Gas') + '\n'
    # muralla: panel rojo con almenas
    top = 520
    alm = ''.join(f'<rect x="{x}" y="0" width="72" height="56" rx="6"/>' for x in range(-8, 1100, 120))
    c += f'  <svg style="position:absolute;left:0;top:{top - 56}px" width="1080" height="58" aria-hidden="true"><g fill="{DEEP}">{alm}</g></svg>\n'
    c += f'  <div style="position:absolute;left:0;right:0;top:{top}px;bottom:0;background:linear-gradient(180deg,{DEEP} 0%,#C51400 30%,{RED} 100%)"></div>\n'
    c += '  ' + img('2d-rey-capa', f'right:60px;top:{top - 56 - 262}px;height:270px;filter:drop-shadow(8px 10px 6px rgba(60,6,0,.35))', 'El Rey del Gas con capa') + '\n'
    c += f'  <h1 class="m" style="position:absolute;left:50px;top:{top + 36}px;margin:0;font-size:84px;font-weight:900;letter-spacing:-.045em;line-height:.95;color:#FFF">Precios<br>del Reino</h1>\n'
    c += f'  <div class="m" style="position:absolute;left:54px;top:{top + 214}px;font-size:22px;font-weight:700;color:{MUST}">{DIR} · Hasta el {HASTA}</div>\n'
    # tabla por marca: cada marca un estandarte
    y0, fh = top + 290, 132
    W0, W = 196, 262
    for i, m in enumerate(MARCAS):
        y = y0 + i * (fh + 10)
        c += f'  <div style="position:absolute;left:36px;right:36px;top:{y}px;height:{fh}px;border-radius:20px;background:rgba(255,246,234,.97)"></div>\n'
        c += f'  <div class="m" style="position:absolute;left:62px;top:{y}px;height:{fh}px;display:flex;align-items:center;font-size:28px;font-weight:900;letter-spacing:.03em;text-transform:uppercase;color:{RED}">{m}</div>\n'
        for j, kg in enumerate(KG):
            v, of = P[m][kg]
            x = 36 + W0 + j * W
            col = '#FFF' if of else INK
            if of:
                c += f'  <div style="position:absolute;left:{x + 8}px;top:{y + 10}px;width:{W - 16}px;height:{fh - 20}px;border-radius:14px;background:{INK}"></div>\n'
            c += f'  <div class="m n" style="position:absolute;left:{x}px;top:{y + 22}px;width:{W}px;text-align:center;font-size:19px;font-weight:800;letter-spacing:.08em;color:{(CROWN if of else "rgba(42,11,8,.5)")}">{kg} KG{" · OFERTA" if of else ""}</div>\n'
            c += f'  <div class="m n" style="position:absolute;left:{x}px;top:{y + 48}px;width:{W}px;text-align:center;font-size:52px;font-weight:900;letter-spacing:-.04em;color:{col}">${v}</div>\n'
    c += f'  <div class="m n" style="position:absolute;left:54px;right:54px;bottom:36px;display:flex;justify-content:space-between;align-items:center;font-size:23px;font-weight:700;color:#FFF">\n'
    c += f'    <span>Sólo efectivo · Retiro en bodega</span><span style="display:flex;align-items:center;gap:10px;font-size:30px;font-weight:900">{WA_SVG.format(s=30, c="#FFF")}{WA}</span>\n  </div>\n'
    return lienzo('#F6E7D2', c, .1)


# ---------------------------------------------------------------- Meme: conversación
def meme():
    c = ''
    c += f'  <div class="m" style="position:absolute;left:56px;right:56px;top:72px;font-size:74px;font-weight:900;letter-spacing:-.04em;line-height:1.02;color:{INK}">Yo un domingo a las 14:58 cuando se acaba el gas:</div>\n'
    c += '  ' + img('rey-corriendo', 'left:50%;top:330px;height:780px;transform:translateX(-46%) rotate(-4deg);filter:drop-shadow(12px 16px 0 rgba(150,70,0,.35))', 'El Rey del Gas corriendo') + '\n'
    c += f'  <div class="m n" style="position:absolute;left:56px;right:56px;bottom:56px;display:flex;justify-content:space-between;align-items:flex-end">\n'
    c += f'    <div style="font-size:24px;font-weight:700;line-height:1.35;color:{INK}">Domingos y festivos abrimos<br><span style="font-size:40px;font-weight:900;letter-spacing:-.02em">10:00 a 15:00</span></div>\n'
    c += f'    <img src="@@logo@@" alt="El Rey del Gas" style="width:220px">\n  </div>\n'
    return lienzo(MUST, c, .14)


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
for nombre, titulo, f in [('ListaRDG_A_Corte', 'Lista Rey del Gas · A · La corte es el catálogo', dir_a),
                          ('ListaRDG_B_Oferta', 'Lista Rey del Gas · B · La oferta primero', dir_b),
                          ('ListaRDG_C_Muralla', 'Lista Rey del Gas · C · El reino y la muralla', dir_c),
                          ('ConversaRDG_Meme_Domingo', 'Rey del Gas · Meme · Domingo 14:58', meme)]:
    open(os.path.join(OUT, nombre + '.dc.html'), 'w').write(HEAD.format(titulo=titulo, fonts=FONTS) + f() + FOOT)
print('ok')
