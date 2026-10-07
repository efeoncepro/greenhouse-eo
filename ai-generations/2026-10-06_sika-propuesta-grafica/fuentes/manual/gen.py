#!/usr/bin/env python3
"""Generador del manual de identidad de la campaña Sika «Innovar es hacerlo POSIBLE».

Todas las firmas salen de las mismas funciones, así ninguna versión se desvía de otra.
Escribe un .dc.html por tablero en ../canvas/project/.
"""
import os

OUT = os.path.join(os.path.dirname(__file__), '..', 'canvas', 'project')

# Activos subidos al lienzo
LOGO = '/_blob/e9c0d61c5e795be77bbdf43459212bee'          # triángulo Sika a color
LOGO_K = '/_blob/b2ab524dc3ddfbdd3e8d230e6eb4765d'        # 1 tinta negra (provisional)
LOGO_W = '/_blob/0dbf6139c952b1f10bbaee8a035b64b0'        # 1 tinta blanca (provisional)
FIRMA_CORP = '/_blob/91337691ed0c9649355205e30f06e1f6'    # «Construyendo confianza» + logo
PROD = '/_blob/23ecb8f3781b480ee41f63544d74aeec'          # render SikaSeal-170
HERO = '/_blob/3951d5d3199778190360a56adeb52122'          # héroe con salpicadura
MACRO_V = '/_blob/1fdc26059549a356042e75eb02fc9ffa'
MACRO_S = '/_blob/b641a477e941e04efc1a565ab00a5637'
COCINA = '/_blob/62100c87a5815c46d531d311e0cb42e6'        # cocina con producto, gradación cálida
CONCRETO = '/_blob/196d4b2e48a5269e7aa6f7e00a754c9d'      # colado de concreto
OBRA = None                                               # se completa al subir la foto

Y, K, W, R = '#FCC500', '#141414', '#FFFFFF', '#ED2630'
TEAL, PURPLE = '#015A78', '#321D59'
G1, G2, G3 = '#EDEDEA', '#5A5A55', '#3D3D39'

SCHEMES = {
    #           texto  SI: (fondo bloque, color letra)  regla  triángulo  logo
    'amarillo': dict(fg=K, si=(K, Y), rule=K, tri=R, logo=LOGO),
    'negro':    dict(fg=W, si=(None, Y), rule=Y, tri=R, logo=LOGO),
    'blanco':   dict(fg=K, si=(Y, K), rule=K, tri=R, logo=LOGO),
    'foto':     dict(fg=W, si=(None, Y), rule=Y, tri=R, logo=LOGO),
    'mono-k':   dict(fg=K, si=(K, W), rule=K, tri=K, logo=LOGO_K),
    'mono-w':   dict(fg=W, si=(W, K), rule=W, tri=W, logo=LOGO_W),
}

BC = "font-family: 'Barlow Condensed', sans-serif"


def tri(color, block, k=1.0):
    mb = '0.13em' if block else '0.07em'
    w, h = 0.26 * k, 0.22 * k
    return (f'<span style="position: absolute; left: 50%; bottom: 100%; width: {w:.3f}em; height: {h:.3f}em; '
            f'margin-left: -{w/2:.3f}em; margin-bottom: {mb}; background: {color}; '
            f'clip-path: polygon(50% 0, 100% 100%, 0 100%)"></span>')


def word(s, sc, extra='', reducida=False):
    """POSIBLE: SI destacado y el triángulo Sika como tilde de la I.
    reducida: para menos de 140 px de ancho; triángulo 30 % mayor y bloque más holgado."""
    c = SCHEMES[sc]
    bg, col = c['si']
    i = f'<span style="position: relative; display: inline-block">I{tri(c["tri"], bg is not None, 1.3 if reducida else 1.0)}</span>'
    padx = '0.09em' if reducida else '0.05em'
    if bg:
        si = (f'<span style="display: inline-block; line-height: 0.9; vertical-align: baseline; background: {bg}; '
              f'color: {col}; padding: 0.07em {padx} 0.01em; margin-left: 0.04em; margin-right: 0.04em">S{i}</span>')
    else:
        si = f'<span style="color: {col}">S{i}</span>'
    return (f'<div style="{BC}; font-size: {s}px; font-weight: 800; line-height: 0.9; margin-top: 0.3em; '
            f'letter-spacing: -0.015em; white-space: nowrap; color: {c["fg"]}{extra}">PO{si}BLE</div>')


def firma(s, sc, endoso=True):
    """Firma vertical. s = cuerpo de POSIBLE en px."""
    c = SCHEMES[sc]
    top = max(6, round(s * 0.15))
    gap = max(3, round(s * 0.06))
    rule = max(2, round(s * 0.05))
    parts = [
        f'<div style="font-size: {top}px; font-weight: 700; letter-spacing: 0.14em; color: {c["fg"]}; white-space: nowrap">INNOVAR ES HACERLO</div>',
        word(s, sc),
    ]
    if endoso:
        parts.append(f'<div style="height: {rule}px; background: {c["rule"]}"></div>')
        parts.append(
            f'<div style="display: flex; align-items: center; gap: {max(4, round(s * 0.09))}px">'
            f'<div style="font-size: {max(9, round(s * 0.19))}px; font-weight: 800; color: {c["fg"]}; white-space: nowrap">INNOVAR ES HACERLO</div>'
            f'<img src="{c["logo"]}" alt="Sika" style="height: {max(12, round(s * 0.34))}px; width: auto"></div>')
    return f'<div style="display: inline-flex; flex-direction: column; gap: {gap}px">{"".join(parts)}</div>'


GRAFITO = '#2A2B2E'   # color de línea para productos sin color propio (p. ej. aditivos)


def sello_lanz(w, tipo, linea, pie='', cifra=None):
    """Sello de lanzamiento con el lenguaje del envase Sika: franja amarilla con el logo arriba,
    cuerpo en el color de la línea del producto y franja blanca con el beneficio abajo.
    linea None/GRAFITO (sin color propio) -> cuerpo negro con cifra amarilla. Corte inferior a 13°."""
    k = w / 220
    cut = round(w * 0.16)
    sin_color = linea in (None, GRAFITO)
    body = K if sin_color else linea
    num = Y if sin_color else W
    pie_c = K if sin_color else linea
    band = round(46 * k)
    if tipo == '2en1':
        label = 'NUEVA VERSIÓN'
        main = (f'<div style="{BC}; font-size: {round(80*k)}px; line-height: 0.9; color: {num}; white-space: nowrap">'
                f'<span style="font-weight: 800">2</span><span style="font-weight: 300; margin: 0 0.12em; font-size: 0.8em">EN</span>'
                f'<span style="font-weight: 800">1</span></div>')
    else:
        label = 'NUEVO PRODUCTO'
        c1, c2 = cifra or ('NUEVO', '')
        main = (f'<div style="{BC}; line-height: 0.9; color: {num}; white-space: nowrap">'
                f'<div style="font-size: {round(54*k)}px; font-weight: 800">{c1}</div>'
                + (f'<div style="font-size: {round(34*k)}px; font-weight: 300">{c2}</div>' if c2 else '') + '</div>')
    pie_html = (f'<div style="background: {W}; padding: {round(8*k)}px {round(16*k)}px {round(8*k) + cut}px; font-size: {round(10*k)}px; font-weight: 800; '
                f'letter-spacing: 0.1em; line-height: 1.3; color: {pie_c}">{pie}</div>') if pie else f'<div style="height: {cut}px; background: {body}"></div>'
    return (f'<div style="width: {w}px; position: relative; flex-shrink: 0; filter: drop-shadow(0 {round(8*k)}px {round(14*k)}px rgba(0,0,0,0.22))">'
            f'<div style="display: flex; flex-direction: column; clip-path: polygon(0 0, 100% 0, 100% calc(100% - {cut}px), 0 100%); border-radius: {round(3*k)}px {round(3*k)}px 0 0; overflow: hidden">'
            f'<div style="height: {band}px; background: {Y}; display: flex; align-items: center; gap: {round(10*k)}px; padding: 0 {round(14*k)}px">'
            f'<img src="{LOGO}" alt="Sika" style="height: {round(30*k)}px; width: auto">'
            f'<span style="font-size: {round(11.5*k)}px; font-weight: 800; letter-spacing: 0.14em; color: {K}; white-space: nowrap">{label}</span></div>'
            f'<div style="background: {body}; padding: {round(14*k)}px {round(16*k)}px {round(12*k)}px">{main}</div>'
            + pie_html + '</div></div>')

def reducida(s, sc):
    """Firma reducida: sólo POSIBLE, para menos de 140 px (cenefas chicas, avatares, favicons de campaña)."""
    return word(s, sc, reducida=True)


def firma_h(s, sc):
    """Firma horizontal para cenefas, banners y firmas de video."""
    c = SCHEMES[sc]
    small = max(8, round(s * 0.2))
    return (
        f'<div style="display: inline-flex; align-items: center; gap: {round(s * 0.26)}px">'
        f'<div style="font-size: {small}px; font-weight: 800; line-height: 1.08; letter-spacing: 0.06em; color: {c["fg"]}; white-space: nowrap">INNOVAR ES<br>HACERLO</div>'
        f'{word(s, sc, "; margin-top: 0.2em")}'
        f'<div style="width: {max(2, round(s * 0.05))}px; height: {round(s * 0.95)}px; background: {c["rule"]}"></div>'
        f'<div style="font-size: {small}px; font-weight: 800; line-height: 1.08; letter-spacing: 0.06em; color: {c["fg"]}; white-space: nowrap">INNOVAR ES<br>HACERLO</div>'
        f'<img src="{c["logo"]}" alt="Sika" style="height: {round(s * 0.66)}px; width: auto"></div>')


def sello(w, sc='negro', bg=K):
    """Sello cuadrado: firma sin endoso + logo en la esquina."""
    c = SCHEMES[sc]
    s = round(w * 0.24)
    return (
        f'<div style="width: {w}px; height: {w}px; background: {bg}; position: relative; box-sizing: border-box; '
        f'padding: {round(w * 0.1)}px; display: flex; flex-direction: column; justify-content: center; flex-shrink: 0">'
        f'{firma(s, sc, endoso=False)}'
        f'<img src="{c["logo"]}" alt="Sika" style="position: absolute; right: {round(w * 0.08)}px; bottom: {round(w * 0.07)}px; height: {round(w * 0.16)}px; width: auto"></div>')


def page(title, w, h, body, bg=G1, pad=56):
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@500;600;700;800&amp;family=Barlow+Condensed:wght@300;400;700;800&amp;display=swap" rel="stylesheet">
<style>
body{{margin:0}}
a{{color:{TEAL}}}a:hover{{color:#013E53}}
</style>
</helmet>
<div style="width: {w}px; height: {h}px; box-sizing: border-box; padding: {pad}px; background: {bg}; font-family: 'Barlow', sans-serif; color: {K}; display: flex; flex-direction: column; gap: 28px; overflow: hidden">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''


def head(kicker, h1):
    return (f'<div style="display: flex; flex-direction: column; gap: 6px; flex-shrink: 0">'
            f'<div style="font-size: 15px; font-weight: 700; letter-spacing: 0.14em; color: {G2}">{kicker}</div>'
            f'<h1 style="margin: 0; font-size: 40px; font-weight: 800; line-height: 1.05">{h1}</h1></div>')


def label(t, color=G2):
    return f'<div style="font-size: 13px; font-weight: 800; letter-spacing: 0.08em; color: {color}">{t}</div>'


def note(b, t, color=G3):
    return f'<div style="font-size: 15px; line-height: 1.4; color: {color}"><b style="color: {K}">{b}</b> {t}</div>'


def panel(content, bg, h=None, extra=''):
    hh = f'height: {h}px; ' if h else ''
    return (f'<div style="{hh}background: {bg}; border-radius: 4px; display: flex; align-items: center; '
            f'justify-content: center; position: relative; overflow: hidden{extra}">{content}</div>')


def write(name, html):
    with open(os.path.join(OUT, name), 'w') as f:
        f.write(html)


# ---------------------------------------------------------------- 1 · Firma principal
def b_principal():
    body = head('01 · FIRMA PRINCIPAL', 'El acento de POSIBLE es el triángulo de Sika.') + f'''
<div style="display: flex; gap: 20px; height: 560px; flex-shrink: 0">
  <div style="width: 860px; flex-shrink: 0">{panel(firma(190, 'amarillo'), Y, 560)}</div>
  <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 20px">
    {panel(firma(92, 'negro'), K, 270)}
    {panel(firma(92, 'blanco'), W, 270)}
  </div>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px">
  {note('POSIBLE bien escrito.', '«POSÍBLE» con tilde es una falta de ortografía. El triángulo rojo hace de tilde: se lee el SÍ sin escribir mal la palabra, y la firma queda unida a Sika.')}
  {note('Sika firma con su logo.', 'La segunda mitad del concepto, «innovar es hacerlo Sika», la completa el logo real, no la palabra SIKA escrita.')}
  {note('Un solo dibujo, tres fondos.', 'Amarillo es la versión principal. Negro y blanco cubren fotografía oscura y soportes claros. Las demás versiones (página 03) salen de este mismo dibujo.')}
</div>'''
    write('Main.dc.html', page('Firma principal', 1600, 860, body))


# ---------------------------------------------------------------- 2 · Construcción
def b_construccion():
    s = 150
    x = round(s * 0.22)  # altura del triángulo
    pad = 2 * x
    guarded = (f'<div style="position: relative; padding: {pad}px; outline: 2px dashed {TEAL}; outline-offset: -2px">'
               f'<div style="position: absolute; inset: {pad}px; outline: 1px solid rgba(1,90,120,0.35)"></div>'
               f'{firma(s, "blanco")}'
               f'<div style="position: absolute; top: 6px; left: 8px; font-size: 13px; font-weight: 800; color: {TEAL}">2x</div>'
               f'<div style="position: absolute; bottom: 6px; right: 10px; font-size: 13px; font-weight: 800; color: {TEAL}">2x</div></div>')
    tri_demo = (f'<div style="display: flex; align-items: center; gap: 14px">'
                f'<div style="width: 44px; height: 37px; background: {R}; clip-path: polygon(50% 0, 100% 100%, 0 100%)"></div>'
                f'<div style="font-size: 15px; line-height: 1.4; color: {G3}"><b style="color: {K}">x = altura del triángulo.</b> Es la unidad de toda la firma.</div></div>')
    rows = [
        ('Triángulo', '26 % del cuerpo de POSIBLE de ancho, 22 % de alto. Centrado sobre la I.'),
        ('Bloque del SÍ', 'Envuelve S e I completas. Nunca recorta la letra ni la tilde.'),
        ('Línea superior', '15 % del cuerpo de POSIBLE, espaciado 0,14 em.'),
        ('Regla', '5 % del cuerpo, mismo ancho que POSIBLE.'),
        ('Endoso', 'Texto al 19 % y logo Sika al 34 % del cuerpo, alineados a la izquierda.'),
    ]
    spec = ''.join(f'<div style="display: flex; gap: 14px; font-size: 15px; line-height: 1.4"><div style="width: 130px; flex-shrink: 0; font-weight: 800">{a}</div><div style="color: {G3}">{b}</div></div>' for a, b in rows)
    body = head('02 · CONSTRUCCIÓN, PROTECCIÓN Y TAMAÑO MÍNIMO', 'Una unidad, x, gobierna toda la firma.') + f'''
<div style="display: flex; gap: 28px; flex-grow: 1">
  <div style="width: 860px; flex-shrink: 0; background: {W}; border-radius: 4px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px">
    {guarded}
    <div style="font-size: 14px; font-weight: 700; color: {TEAL}">Área de protección: 2x por lado. Nada entra en ella: ni texto, ni logos, ni bordes de pieza.</div>
  </div>
  <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 22px">
    {tri_demo}
    <div style="display: flex; flex-direction: column; gap: 12px">{spec}</div>
    {label('TAMAÑO MÍNIMO')}
    <div style="display: flex; gap: 22px; align-items: flex-end">
      <div style="display: flex; flex-direction: column; gap: 8px">{panel(firma(34, 'amarillo'), Y, 170, '; padding: 0 18px')}<div style="font-size: 13px; color: {G3}"><b style="color: {K}">Con endoso:</b> 140 px · 35 mm de ancho</div></div>
      <div style="display: flex; flex-direction: column; gap: 8px">{panel(firma(24, 'amarillo', endoso=False), Y, 170, '; padding: 0 18px')}<div style="font-size: 13px; color: {G3}"><b style="color: {K}">Sin endoso:</b> 90 px · 22 mm de ancho</div></div>
      <div style="display: flex; flex-direction: column; gap: 8px">{sello(110)}<div style="font-size: 13px; color: {G3}"><b style="color: {K}">Sello:</b> 96 px · 20 mm</div></div>
      <div style="display: flex; flex-direction: column; gap: 8px">{panel(reducida(30, 'amarillo'), Y, 170, '; padding: 0 16px')}<div style="font-size: 13px; color: {G3}"><b style="color: {K}">Reducida:</b> menos de 140 px</div></div>
    </div>
    <div style="font-size: 13px; line-height: 1.4; color: {G2}">Por debajo de 140 px se usa la reducida: sólo POSIBLE, con el triángulo 30 % más grande y el bloque más holgado, para que el SÍ se siga leyendo. Medidas propuestas: se validan contra el manual de Sika.</div>
  </div>
</div>'''
    write('Construccion.dc.html', page('Construcción de la firma', 1600, 1000, body))


# ---------------------------------------------------------------- 3 · Versiones
def b_versiones():
    def cell(title, content, bg, desc, extra=''):
        return (f'<div style="display: flex; flex-direction: column; gap: 10px">{panel(content, bg, 300, extra)}'
                f'<div style="font-size: 15px; font-weight: 800">{title}</div>'
                f'<div style="font-size: 14px; line-height: 1.4; color: {G3}">{desc}</div></div>')
    foto = (f'<img src="/_blob/2c761fed5cdd55bd60604ee5ff5a9da1" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 30% 50%">'
            f'<div style="position: relative; margin-right: 44%">{firma(44, "foto")}</div>')
    cells = [
        cell('Vertical con endoso', firma(64, 'amarillo'), Y, 'Principal. Cierres de video, sellos de PDV, presentaciones: piezas sin firma corporativa.'),
        cell('Vertical sin endoso', firma(70, 'amarillo', endoso=False), Y, 'En toda pieza que ya lleva «Construyendo confianza» y el logo Sika abajo.'),
        cell('Horizontal', firma_h(46, 'amarillo'), Y, 'Cenefas, banners, firma de video y formatos muy anchos.', '; padding: 0 10px'),
        cell('Sello', sello(220), G1, 'Historias, stickers de anaquel, avatar de campaña y esquinas de PDV.'),
        cell('Sobre fotografía', foto, K, 'La foto se produce con un espacio libre y oscuro reservado para la firma. Sin velos ni cajas; contraste mínimo 4,5:1.'),
        cell('1 tinta negra', firma(64, 'mono-k'), W, 'Fax, sellos de caucho, grabado, prensa a una tinta. Logo Sika en su versión oficial a una tinta.'),
        cell('1 tinta blanca', firma(64, 'mono-w'), K, 'Calado sobre fondos oscuros o fotografía en una sola tinta: vinil, grabado láser, serigrafía.'),
        cell('Negro', firma(64, 'negro'), K, 'Fondos oscuros, fotografía nocturna, piezas de obra pesada.'),
    ]
    body = head('03 · VERSIONES', 'Ocho versiones, un solo dibujo.') + \
        f'<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 26px 24px">{"".join(cells)}</div>'
    write('Versiones.dc.html', page('Versiones de la firma', 1600, 1000, body))


# ---------------------------------------------------------------- 4 · Arquitectura con Sika
def b_arquitectura():
    def tier(n, t, d, content, w):
        return (f'<div style="width: {w}px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px">'
                f'<div style="height: 150px; background: {W}; border-radius: 4px; display: flex; align-items: center; justify-content: center; gap: 14px">{content}</div>'
                f'<div style="font-size: 15px; font-weight: 800">{n} · {t}</div><div style="font-size: 14px; line-height: 1.4; color: {G3}">{d}</div></div>')
    arrow = f'<div style="font-size: 30px; font-weight: 800; color: {G2}; align-self: flex-start; margin-top: 52px">→</div>'
    prods = (f'<div style="display: flex; flex-direction: column; gap: 8px">'
             f'<div style="display: flex; align-items: center; gap: 8px"><div style="width: 14px; height: 14px; background: {TEAL}"></div><div style="font-size: 15px; font-weight: 800">SikaSeal®-170</div></div>'
             f'<div style="display: flex; align-items: center; gap: 8px"><div style="width: 14px; height: 14px; background: {PURPLE}"></div><div style="font-size: 15px; font-weight: 800">Sikaflex®-119 High Tack</div></div>'
             f'<div style="display: flex; align-items: center; gap: 8px"><div style="width: 14px; height: 14px; border: 1.5px dashed {G2}"></div><div style="font-size: 15px; font-weight: 800">Sika® ViscoCrete® 45 HE</div></div></div>')
    canal = (f'<div style="display: flex; flex-direction: column; gap: 8px; align-items: center"><div style="font-size: 14px; font-weight: 700">De venta en</div>'
             f'<div style="border: 1.5px dashed {G2}; color: {G2}; font-size: 13px; padding: 7px 12px">[Retailer]</div>'
             f'<div style="border: 1.5px dashed {G2}; color: {G2}; font-size: 13px; padding: 7px 12px">[Marca socia]</div></div>')
    tiers = (tier('1', 'Marca madre', 'Sika y su firma corporativa. Manda siempre; la campaña nunca la reemplaza.', f'<img src="{FIRMA_CORP}" alt="Sika · Construyendo confianza" style="height: 46px; width: auto">', 300) + arrow +
             tier('2', 'Campaña paraguas', 'Agrupa todos los lanzamientos. Es una firma, no un logo: nunca compite en tamaño con Sika.', firma(40, 'blanco', endoso=False), 300) + arrow +
             tier('3', 'Producto', 'Nombre tal como aparece en el envase. El color de línea sólo vive en el sello de lanzamiento.', prods, 330) + arrow +
             tier('4', 'Canal y socios', 'Retailer o marca socia: siempre abajo, siempre menores que Sika.', canal, 300))

    def caso(letter, title, rule, mini):
        return (f'<div style="display: flex; gap: 18px; background: {W}; border-radius: 4px; padding: 18px">'
                f'<div style="width: 168px; height: 168px; flex-shrink: 0; position: relative; overflow: hidden; border-radius: 3px">{mini}</div>'
                f'<div style="display: flex; flex-direction: column; gap: 6px"><div style="font-size: 13px; font-weight: 800; color: {TEAL}">CASO {letter}</div>'
                f'<div style="font-size: 17px; font-weight: 800; line-height: 1.2">{title}</div><div style="font-size: 14px; line-height: 1.4; color: {G3}">{rule}</div></div></div>')

    def mini_base(inner):
        return f'<div style="position: absolute; inset: 0; background: {Y}">{inner}</div>'
    mA = mini_base(f'<div style="position: absolute; top: 14px; left: 12px">{firma(24, "amarillo", endoso=False)}</div><img src="{FIRMA_CORP}" alt="" style="position: absolute; left: 12px; bottom: 12px; height: 16px">')
    mB = f'<div style="position: absolute; inset: 0; background: {K}; display: flex; align-items: center; justify-content: center">{firma(30, "negro")}</div>'
    mC = mini_base(f'<div style="position: absolute; top: 14px; left: 12px">{firma(24, "amarillo", endoso=False)}</div><img src="{FIRMA_CORP}" alt="" style="position: absolute; left: 12px; bottom: 12px; height: 16px"><div style="position: absolute; right: 10px; bottom: 10px; background: {K}; color: {W}; font-size: 8px; font-weight: 700; padding: 4px 6px">De venta en [R]</div>')
    mD = mini_base(f'<div style="position: absolute; top: 14px; left: 12px">{firma(24, "amarillo", endoso=False)}</div><div style="position: absolute; left: 12px; bottom: 12px; display: flex; align-items: center; gap: 8px"><img src="{LOGO}" alt="" style="height: 26px"><div style="width: 2px; height: 22px; background: {K}"></div><div style="border: 1px dashed {K}; font-size: 8px; padding: 4px 5px">[Socia]</div></div>')
    mE = mini_base(f'<div style="position: absolute; top: 10px; right: 10px">{sello_lanz(62, "2en1", TEAL)}</div><div style="position: absolute; top: 56px; left: 12px; font-size: 13px; font-weight: 800">SikaSeal®-170</div><img src="{PROD}" alt="" style="position: absolute; right: 22px; bottom: 8px; height: 110px">')
    mF = f'<div style="position: absolute; inset: 0; background: {Y}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px"><img src="{FIRMA_CORP}" alt="" style="height: 18px"><div style="font-size: 9px; font-weight: 700; color: {G3}">Firma corporativa intacta</div></div>'
    casos = ''.join([
        caso('A', 'Pieza con firma corporativa', 'Posts, póster, anuncio, PDV. Firma de campaña SIN endoso arriba y «Construyendo confianza» + logo abajo. Un solo logo Sika.', mA),
        caso('B', 'Pieza sin firma corporativa', 'Cierre de reel, sello, merch. Firma CON endoso: el logo ya está dentro de la firma. Nunca se repite.', mB),
        caso('C', 'Co-branding con retailer', '«De venta en» + logo del retailer abajo a la derecha, a no más del 50 % de la altura del logo Sika.', mC),
        caso('D', 'Marca socia', 'Logo Sika + separador + marca socia, del mismo alto o menor. Nunca dentro de la firma. Requiere visto bueno de Marketing Sika.', mD),
        caso('E', 'Producto y submarca', 'El color de la línea (petróleo SikaSeal, morado Sikaflex) va en el sello de lanzamiento y en el punto del titular. Nunca tiñe la firma.', mE),
        caso('F', 'Lema corporativo', '«Construyendo confianza» queda siempre con el logo. La campaña no lo reemplaza ni lo reescribe.', mF),
    ])
    body = head('04 · ARQUITECTURA CON LA MARCA SIKA', 'Sika manda; la campaña ordena; el producto vende.') + \
        f'<div style="display: flex; gap: 18px; align-items: flex-start">{tiers}</div>' + \
        f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px">{casos}</div>'
    write('Arquitectura.dc.html', page('Arquitectura con Sika', 1600, 880, body))


# ---------------------------------------------------------------- 5 · Color, tipografía y recursos
def b_recursos():
    sw = lambda c, n, h, t, fg=K, border='': (
        f'<div style="display: flex; flex-direction: column; gap: 8px"><div style="height: 110px; background: {c}; border-radius: 4px{border}"></div>'
        f'<div style="font-size: 15px; font-weight: 800">{n}</div><div style="font-size: 13px; color: {G3}">{h}</div><div style="font-size: 13px; line-height: 1.35; color: {G3}">{t}</div></div>')
    pal = ''.join([
        sw(Y, 'Amarillo Sika', '#FCC500', 'Fondo principal. 55 % de la superficie.'),
        sw(K, 'Negro', '#141414', 'Texto, bloque del SÍ, zonas de foto. 30 %.'),
        sw(W, 'Blanco', '#FFFFFF', 'Texto sobre foto y soportes claros. 10 %.', border=f'; border: 1px solid #D8D8D2'),
        sw(R, 'Rojo Sika', '#ED2630', 'Sólo triángulo y logo. Nunca texto ni fondos. 5 %.'),
        sw(TEAL, 'Línea SikaSeal', '#015A78', 'Sello de lanzamiento y punto final del titular.'),
        sw(PURPLE, 'Línea Sikaflex', '#321D59', 'Sello de lanzamiento y punto final del titular.'),
    ])
    prop = (f'<div style="display: flex; height: 22px; border-radius: 3px; overflow: hidden">'
            f'<div style="width: 55%; background: {Y}"></div><div style="width: 30%; background: {K}"></div>'
            f'<div style="width: 10%; background: {W}"></div><div style="width: 5%; background: {R}"></div></div>')
    tipo = (f'<div style="display: flex; flex-direction: column; gap: 10px">'
            f'<div style="{BC}; font-size: 64px; font-weight: 800; line-height: 0.95"><span style="font-weight: 300">Innovar para</span> simplificar<span style="color: {TEAL}">.</span></div>'
            f'<div style="font-size: 13px; color: {G3}">Titular · «Innovar para» en Barlow Condensed 300 + verbo en 800 · interlineado 0,9</div>'
            f'<div style="font-size: 24px; font-weight: 700; line-height: 1.3">Un solo sellador para baño, cocina y cancelería.</div>'
            f'<div style="font-size: 13px; color: {G3}">Bajada · Barlow 700</div>'
            f'<div style="font-size: 16px; font-weight: 500; line-height: 1.45; max-width: 520px">Texto de apoyo y legales en Barlow 500. Mínimo 9 pt impreso y 24 px en redes.</div>'
            f'<div style="font-size: 13px; color: {G3}">Provisional: se reemplaza por la tipografía corporativa de Sika si el manual la define.</div></div>')
    diag = (f'<div style="position: relative; height: 200px; background: {Y}; border-radius: 4px; overflow: hidden">'
            f'<div style="position: absolute; top: 0; right: 0; bottom: 0; width: 62%; background: {K}; clip-path: polygon(9% 0, 100% 0, 100% 100%, 0 100%)"></div>'
            f'<div style="position: absolute; left: 30px; top: 30px; font-size: 15px; font-weight: 700; width: 300px; line-height: 1.4">Una sola inclinación: 13° respecto del eje. Corte casi vertical en formatos cuadrados y anchos; casi horizontal en verticales.</div></div>')
    icon = lambda p: f'<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="{K}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{p}</svg>'
    icons = (f'<div style="display: flex; gap: 22px; align-items: center">'
             + icon('<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>')
             + icon('<path d="M12 3c3.5 4.5 6 7.6 6 10.5A6 6 0 0 1 6 13.5C6 10.6 8.5 7.5 12 3z"/>')
             + icon('<rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="8.5" y="14" width="7" height="7" rx="1"/>')
             + icon('<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>')
             + f'<div style="font-size: 13px; line-height: 1.35; color: {G3}; max-width: 200px">Íconos lineales, trazo 2 px, puntas redondas. Negro sobre amarillo, amarillo sobre negro.</div></div>')
    foto = lambda src, t, d, pos='50% 50%': (f'<div style="display: flex; flex-direction: column; gap: 8px"><img src="{src}" alt="{t}" style="width: 100%; height: 150px; object-fit: cover; object-position: {pos}; border-radius: 4px; display: block">'
                                           f'<div style="font-size: 15px; font-weight: 800">{t}</div><div style="font-size: 13px; line-height: 1.35; color: {G3}">{d}</div></div>')
    obra = OBRA or MACRO_S
    fotos = (f'<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px">'
             + foto(MACRO_S, 'Prueba', 'Macro del producto trabajando: agua, cordón, adherencia. Luz dura lateral.')
             + foto(HERO, 'Héroe', 'Envase real, inclinado, con acción física. Fondo oscuro.', '50% 40%')
             + foto('/_blob/6dae6bc5ec0b6ede8553577b58824fa6', 'Hogar', 'Casas reales, no showroom. El envase a escala real (22 cm).', '30% 45%')
             + foto(obra, 'Obra', 'Manos y herramienta, sin rostros. Luz de tarde, polvo.')
             + foto('/_blob/2c761fed5cdd55bd60604ee5ff5a9da1', 'Regla: espacio reservado', 'Toda foto nace con una zona oscura y tranquila para firma y titular. Sin velos ni cajas.', '20% 50%')
             + '</div>')
    body = head('05 · COLOR, TIPOGRAFÍA Y RECURSOS', 'El amarillo manda; el rojo sólo firma.') + f'''
<div style="display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px">{pal}</div>
{prop}
<div style="display: flex; gap: 36px">
  <div style="width: 620px; flex-shrink: 0">{tipo}</div>
  <div style="flex-grow: 1; display: flex; flex-direction: column; gap: 18px">{label('DIAGONAL')}{diag}{label('ICONOGRAFÍA')}{icons}</div>
</div>
{label('SELLO DE LANZAMIENTO')}
<div style="display: flex; gap: 26px; align-items: flex-start">{sello_lanz(150, '2en1', TEAL, 'ANTIHONGOS + USO GENERAL')}{sello_lanz(150, 'nuevo', PURPLE, 'SIKAFLEX®-119 HIGH TACK', ('AGARRE', 'INSTANTÁNEO'))}{sello_lanz(150, 'nuevo', None, 'SIKA® VISCOCRETE® 45 HE', ('AHORRO', 'DE AGUA'))}<div style="display: flex; flex-direction: column; gap: 10px; max-width: 520px">{note('Color de la línea del producto.', 'Petróleo SikaSeal, morado Sikaflex. Si el producto no tiene color propio, el sello es amarillo Sika con texto negro. Nunca rojo de fondo.')}{note('El lenguaje del envase.', 'Franja amarilla con el logo Sika arriba, cuerpo en el color de la línea y franja blanca con el beneficio, igual que la etiqueta del producto. Corte inferior con la diagonal del sistema.')}{note('Cifra con contraste de pesos.', '2 · EN · 1 (Black · Light · Black) o el beneficio clave del lanzamiento (AGARRE / instantáneo). Sin color de línea propio: cuerpo negro y cifra amarilla.')}{note('Siempre arriba a la derecha', 'y nunca sobre el envase ni la firma.')}</div></div>
{label('FOTOGRAFÍA · CUATRO REGISTROS Y UNA REGLA')}
{fotos}'''
    write('Recursos.dc.html', page('Color, tipografía y recursos', 1600, 1330, body))


# ---------------------------------------------------------------- 6 · Movimiento
def b_movimiento():
    def frame(t, d, inner, bg=Y):
        return (f'<div style="display: flex; flex-direction: column; gap: 10px"><div style="height: 300px; background: {bg}; border-radius: 4px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center">{inner}</div>'
                f'<div style="font-size: 15px; font-weight: 800">{t}</div><div style="font-size: 14px; line-height: 1.4; color: {G3}">{d}</div></div>')
    wipe = f'<div style="position: absolute; top: 0; bottom: 0; right: 0; width: 70%; background: {K}; clip-path: polygon(17% 0, 100% 0, 100% 100%, 0 100%)"></div>'
    f1 = frame('0,0–0,4 s · Barrido', 'Una diagonal negra a 13° barre la pantalla y deja el amarillo.', wipe)
    f2 = frame('0,4–0,9 s · Línea superior', '«INNOVAR ES HACERLO» se escribe letra a letra.', f'<div style="font-size: 20px; font-weight: 700; letter-spacing: 0.14em; margin-bottom: 120px">INNOVAR ES HACERLO</div>')
    f3 = frame('0,9–1,4 s · PO · BLE', 'PO y BLE entran desde los lados y dejan el hueco del SÍ.', f'<div style="{BC}; font-size: 60px; font-weight: 800; letter-spacing: -0.015em; white-space: nowrap">PO<span style="display: inline-block; width: 1.05em"></span>BLE</div>')
    f4 = frame('1,4–1,9 s · El SÍ cae', 'El bloque negro con SI cae a su lugar con un rebote corto.', word(60, 'amarillo'))
    f5 = frame('1,9–2,6 s · Tilde y firma', 'El triángulo rojo cae como tilde, la regla se dibuja y entra el logo. Pausa de 1 s.', firma(44, 'amarillo'))
    body = head('06 · MOVIMIENTO', 'La firma se arma en 2,6 segundos.') + \
        f'<div style="display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 18px">{f1}{f2}{f3}{f4}{f5}</div>' + \
        f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 28px">' + \
        note('Curvas.', 'Entradas con desaceleración marcada; el SÍ y el triángulo con un rebote único, nunca elástico.') + \
        note('Transiciones.', 'Entre escenas, la misma diagonal a 13°. Nada de disolvencias ni barridos genéricos.') + \
        note('Sonido.', 'Un golpe seco cuando cae el SÍ y otro, más agudo, con el triángulo. Sirve de marca sonora.') + '</div>'
    write('Movimiento.dc.html', page('Movimiento de la firma', 1600, 720, body))


# ---------------------------------------------------------------- 7 · Usos incorrectos
def b_incorrectos():
    def bad(t, inner, bg=Y):
        x = (f'<div style="position: absolute; top: 10px; right: 10px; width: 30px; height: 30px; border-radius: 15px; background: {R}; color: {W}; '
             f'font-size: 18px; font-weight: 800; display: flex; align-items: center; justify-content: center">✕</div>')
        return (f'<div style="display: flex; flex-direction: column; gap: 10px"><div style="height: 230px; background: {bg}; border-radius: 4px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center">{inner}{x}</div>'
                f'<div style="font-size: 15px; font-weight: 700; line-height: 1.35">{t}</div></div>')
    big = lambda txt, extra='': f'<div style="{BC}; font-size: 72px; font-weight: 800; letter-spacing: -0.015em; {extra}">{txt}</div>'
    tiles = [
        bad('Escribir «POSÍBLE» con tilde ortográfica.', big('PO<span style="background: #141414; color: #FCC500; padding: 0 4px">SÍ</span>BLE')),
        bad('Separar la palabra: «PO SÍ BLE».', big('PO&nbsp;<span style="background: #141414; color: #FCC500; padding: 0 4px">SÍ</span>&nbsp;BLE')),
        bad('SI amarillo sobre blanco: no se lee.', big('PO<span style="color: #FCC500">SI</span>BLE'), W),
        bad('Cambiar los colores de la firma.', big('PO<span style="background: #015A78; color: #FFFFFF; padding: 0 4px">SI</span>BLE', 'color: #015A78')),
        bad('Deformar, estirar o inclinar.', f'<div style="transform: scaleX(1.45) skewX(-10deg)">{firma(46, "amarillo", endoso=False)}</div>'),
        bad('Poner la firma sobre el detalle de la foto, sin espacio reservado.', f'<img src="{MACRO_S}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover"><div style="position: relative">{firma(46, "amarillo", endoso=False)}</div>', K),
        bad('Repetir el logo: firma con endoso + firma corporativa.', f'<div style="display: flex; flex-direction: column; gap: 12px; align-items: flex-start">{firma(34, "amarillo")}<img src="{FIRMA_CORP}" alt="" style="height: 20px"></div>'),
        bad('Usar el triángulo suelto como adorno o rotarlo.', f'<div style="display: flex; gap: 18px"><div style="width: 60px; height: 52px; background: {R}; clip-path: polygon(50% 0, 100% 100%, 0 100%); transform: rotate(35deg)"></div><div style="width: 40px; height: 34px; background: {R}; clip-path: polygon(50% 0, 100% 100%, 0 100%)"></div><div style="width: 80px; height: 70px; background: {R}; clip-path: polygon(50% 0, 100% 100%, 0 100%); transform: rotate(-90deg)"></div></div>'),
    ]
    body = head('07 · USOS INCORRECTOS', 'Lo que nunca se hace con la firma.') + \
        f'<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px 22px">{"".join(tiles)}</div>'
    write('Incorrectos.dc.html', page('Usos incorrectos', 1600, 760, body))


# ---------------------------------------------------------------- 8 · Aplicaciones
def b_aplicaciones():
    def app(title, spec, w, h, inner, bg=Y):
        return (f'<div style="display: flex; flex-direction: column; gap: 8px">'
                f'<div style="width: {w}px; height: {h}px; background: {bg}; position: relative; overflow: hidden; border-radius: 3px; box-shadow: 0 2px 10px rgba(0,0,0,0.12)">{inner}</div>'
                f'<div style="font-size: 15px; font-weight: 800">{title}</div><div style="font-size: 13px; line-height: 1.35; color: {G3}; max-width: {max(w, 200)}px">{spec}</div></div>')
    corp = lambda h, l, b: f'<img src="{FIRMA_CORP}" alt="Sika · Construyendo confianza" style="position: absolute; left: {l}px; bottom: {b}px; height: {h}px">'
    diag_photo = lambda src, pos, start='38%': f'<div style="position: absolute; top: 0; right: 0; bottom: 0; width: 64%; clip-path: polygon({start} 0, 100% 0, 100% 100%, 0 100%)"><img src="{src}" alt="" style="width: 100%; height: 100%; object-fit: cover; object-position: {pos}"></div>'
    badge = lambda fs: f'<div style="position: absolute; top: 12px; right: 12px">{sello_lanz(round(fs * 3.4), "2en1", TEAL)}</div>'

    post11 = app('Post 1:1 · Facebook', '1080 × 1080 px. Caso A.', 260, 260,
                 f'<img src="/_blob/3fd892999625d166c4b604632a050649" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block">' + f'<div style="position: absolute; top: 18px; left: 16px">{firma(30, "amarillo", endoso=False)}</div>'
                 + f'<div style="position: absolute; top: 112px; left: 16px; width: 110px; {BC}; font-weight: 800; font-size: 19px; line-height: 0.92"><span style="font-weight: 400">Innovar para</span> simplificar<span style="color: {TEAL}">.</span></div>' + corp(13, 16, 14) + badge(16))
    post45 = app('Post 4:5 · Instagram', '1080 × 1350 px. Caso A.', 220, 275,
                 f'<img src="/_blob/c8dd29e0f4f78e598eab9ac9e1dc3a01" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block">'
                 + f'<div style="position: absolute; top: 178px; left: 14px">{firma(26, "amarillo", endoso=False)}</div>' + corp(11, 14, 10))
    story = app('Historia 9:16', '1080 × 1920 px. Zonas seguras: 250 px arriba y 340 px abajo (marcas rojas en los bordes). Producto completo y dentro de la zona segura. Caso A.', 160, 284,
                f'<img src="/_blob/4412120c52aff9f80f3a800f58ce5049" alt="SikaSeal-170 sobre la junta con agua" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block">'
                + f'<div style="position: absolute; left: 0; width: 10px; top: 37px; border-top: 1.5px solid {R}"></div><div style="position: absolute; right: 0; width: 10px; top: 37px; border-top: 1.5px solid {R}"></div><div style="position: absolute; left: 0; width: 10px; bottom: 50px; border-top: 1.5px solid {R}"></div><div style="position: absolute; right: 0; width: 10px; bottom: 50px; border-top: 1.5px solid {R}"></div>'
                + f'<div style="position: absolute; top: 42px; left: 12px">{firma(22, "amarillo", endoso=False)}</div>'
                + f'<div style="position: absolute; top: 96px; left: 12px; width: 70px; {BC}; font-weight: 800; font-size: 13px; line-height: 0.92"><span style="font-weight: 400">Innovar para</span> simplificar<span style="color: {TEAL}">.</span></div>'
                + corp(10, 12, 18))
    reel = app('Cierre de reel', '1080 × 1920 px. Caso B: firma con endoso, sin firma corporativa.', 160, 284,
               f'<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center">{firma(30, "amarillo")}</div>')
    linkedin = app('LinkedIn · profesional', '1200 × 627 px. Registro obra, más dato técnico. Caso A.', 340, 178,
                   diag_photo(OBRA or MACRO_S, '50% 50%', '30%') + f'<div style="position: absolute; top: 16px; left: 16px">{firma(28, "amarillo", endoso=False)}</div>'
                   + f'<div style="position: absolute; top: 104px; left: 16px; font-size: 10px; font-weight: 700; width: 120px; line-height: 1.3">[Dato técnico del producto]</div>' + corp(11, 16, 12))
    poster = app('Póster tabloide', '11 × 17 in (279 × 432 mm). Caso A: firma arriba, producto completo abajo.', 180, 278,
                 f'<img src="/_blob/74c16b5f98c99bcabb7f47b8550bb125" alt="SikaSeal-170 sobre la junta con agua" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block">'
                 + f'<div style="position: absolute; top: 14px; left: 14px">{firma(30, "amarillo", endoso=False)}</div>'
                 + f'<div style="position: absolute; top: 80px; left: 14px; width: 80px; {BC}; font-weight: 800; font-size: 15px; line-height: 0.92"><span style="font-weight: 400">Innovar para</span> simplificar<span style="color: {TEAL}">.</span></div>' + corp(10, 14, 10))
    carta = app('Anuncio tamaño carta', '8,5 × 11 in (216 × 279 mm). Caso A.', 180, 233,
                f'<img src="/_blob/551e962b92a89f308fe6b938c8b3f6a3" alt="SikaSeal-170 sobre la cubierta mojada de la cocina" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block">' + f'<div style="position: absolute; top: 16px; left: 12px">{firma(26, "amarillo", endoso=False)}</div>'
                + f'<div style="position: absolute; top: 100px; left: 12px; width: 70px; {BC}; font-weight: 800; font-size: 14px; line-height: 0.95"><span style="font-weight: 400">Innovar para</span> simplificar<span style="color: {TEAL}">.</span></div>' + corp(9, 12, 10))
    cenefa = app('Cenefa de anaquel', 'Tira horizontal; medida exacta según cada cadena. Firma horizontal + producto.', 600, 66,
                 f'<div style="position: absolute; inset: 0; display: flex; align-items: center; gap: 18px; padding: 0 14px">{firma_h(26, "amarillo")}'
                 + f'<div style="width: 2px; height: 40px; background: {K}"></div><div style="font-size: 12px; font-weight: 800; line-height: 1.1">SikaSeal®-170<br><span style="font-weight: 600">Un solo sellador · baño, cocina, cancelería</span></div>'
                 + f'<div style="margin-left: auto; background: {TEAL}; color: {W}; {BC}; font-size: 22px; line-height: 1; padding: 6px 10px"><span style="font-weight: 800">2</span><span style="font-weight: 300"> EN </span><span style="font-weight: 800">1</span></div></div>')
    def cara(dark):
        src = '/_blob/abec2b9d4bf0c7b2a573bab40040b05c' if dark else '/_blob/fa8c47cd2c9d0b24730e6690dead8c51'
        sc, fg, verbo, punto = ('negro', W, Y, Y) if dark else ('amarillo', K, K, TEAL)
        return (f'<div style="width: 200px; height: 340px; position: relative; overflow: hidden; clip-path: polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%)">'
                f'<img src="{src}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; display: block">'
                f'<div style="position: absolute; top: 18px; left: 14px">{firma(40, sc, endoso=False)}</div>'
                f'<div style="position: absolute; top: 112px; left: 14px; width: 92px; {BC}; font-size: 17px; font-weight: 800; line-height: 0.92; color: {fg}">'
                f'<div style="font-weight: 400">Innovar para</div><div style="color: {verbo}">simplificar<span style="color: {punto}">.</span></div></div>'
                f'<div style="position: absolute; top: 166px; left: 14px">{sello_lanz(72, "2en1", TEAL, "ANTIHONGOS + USO GENERAL")}</div>'
                f'<img src="{LOGO}" alt="Sika" style="position: absolute; left: 50%; bottom: 14px; height: 34px; transform: translateX(-50%)"></div>')
    def colgada(c, rot):
        return (f'<div style="display: flex; flex-direction: column; align-items: center; transform: rotate({rot}deg); transform-origin: 50% 0">'
                f'<div style="width: 1.5px; height: 34px; background: #8C8C85"></div>'
                f'<div style="width: 10px; height: 10px; border-radius: 5px; border: 2px solid #8C8C85; margin-bottom: -4px; background: {G1}; position: relative; z-index: 1"></div>'
                f'<div style="filter: drop-shadow(0 10px 14px rgba(0,0,0,0.25))">{c}</div></div>')
    colgante = app('Colgante de tienda · frente y reverso', 'Doble cara, troquel en punta, 40 × 68 cm. Se lee a 8 m: firma, producto grande y «2 en 1»; el logo Sika va solo en la punta, nunca sobre el producto. Cara clara hacia la entrada del pasillo; oscura hacia el fondo.', 460, 400,
                   f'<div style="position: absolute; left: 0; right: 0; top: 0; display: flex; justify-content: center; gap: 30px">{colgada(cara(False), -2)}{colgada(cara(True), 2)}</div>', 'transparent')
    stopper = app('Stopper / sello de anaquel', 'Extra propuesto. Sello circular o cuadrado de 10 cm.', 140, 140, sello(140), K)
    banner = app('Banner web', 'Extra propuesto. 728 × 90 y 300 × 250 px. Firma horizontal.', 520, 64,
                 f'<div style="position: absolute; inset: 0; display: flex; align-items: center; gap: 16px; padding: 0 14px">{firma_h(24, "amarillo")}<div style="margin-left: auto; background: {K}; color: {W}; font-size: 12px; font-weight: 800; padding: 8px 12px">Conócelo</div></div>')
    body = head('08 · APLICACIONES DEL BRIEF', 'Todas las piezas del lanzamiento tipo, con la misma firma.') + f'''
<div style="display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap">{post11}{post45}{story}{reel}{linkedin}</div>
<div style="display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap">{poster}{carta}{colgante}{stopper}</div>
<div style="display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap">{cenefa}{banner}</div>'''
    write('Aplicaciones.dc.html', page('Aplicaciones', 1600, 1240, body))


# ---------------------------------------------------------------- 9 · Audiencias
def b_audiencias():
    def col(t, who, img, pos, tono, ej, dens, canal):
        return (f'<div style="display: flex; flex-direction: column; gap: 12px; background: {W}; border-radius: 4px; padding: 20px">'
                f'<img src="{img}" alt="{t}" style="width: 100%; height: 200px; object-fit: cover; object-position: {pos}; border-radius: 3px; display: block">'
                f'<div style="font-size: 22px; font-weight: 800">{t}</div><div style="font-size: 14px; color: {G3}">{who}</div>'
                f'<div style="{BC}; font-size: 34px; font-weight: 800; line-height: 0.95">{ej}</div>'
                + note('Tono.', tono) + note('Información.', dens) + note('Canales.', canal) + '</div>')
    cols = ''.join([
        col('Hogar', 'Hazlo tú mismo, usuario final.', '/_blob/6dae6bc5ec0b6ede8553577b58824fa6', '30% 45%', 'Cercano, resuelve en una frase.', '<span style="font-weight: 300">Innovar para</span> simplificar<span style="color: #015A78">.</span>', 'Un beneficio principal, máximo tres.', 'Instagram, Facebook, TikTok, PDV.'),
        col('Profesional', 'Contratistas, aplicadores, maestros de obra, instaladores.', OBRA or MACRO_S, '50% 50%', 'Directo, de colega a colega.', '<span style="font-weight: 300">Innovar para</span> rendir más en obra.', 'Dato técnico: tiempos, rendimiento, compatibilidad.', 'LinkedIn, Facebook, distribuidores.'),
        col('Industria y proyecto', 'Constructoras, especificadores, concreteras.', CONCRETO, '50% 50%', 'Técnico y sobrio. Más negro, menos amarillo.', '<span style="font-weight: 300">Innovar para</span> construir con confianza.', 'Ficha técnica, normas, caso de obra.', 'LinkedIn, correo, presentaciones.'),
    ])
    body = head('09 · AUDIENCIAS', 'Un solo look & feel; cambian la foto, el tono y la cantidad de dato.') + \
        f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px">{cols}</div>' + \
        f'<div style="font-size: 15px; line-height: 1.4; color: {G3}">La firma, el color y la diagonal no cambian entre audiencias. Responde a lo que Sika pidió en la ronda de preguntas: un look & feel unificado con ajustes por público.</div>'
    write('Audiencias.dc.html', page('Audiencias', 1600, 780, body))


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        OBRA = sys.argv[1]
    for f in (b_principal, b_construccion, b_versiones, b_arquitectura, b_recursos, b_movimiento, b_incorrectos, b_aplicaciones, b_audiencias):
        f()
    print('ok')
