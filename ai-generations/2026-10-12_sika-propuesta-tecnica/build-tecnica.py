# Sika Mexicana · Wherex N.º 1164 · Propuesta técnica (deck 16:9, lectura sin presentador).
# Molde de la propuesta técnica Pibank/UTEM, en línea Brand (Efeonce Creative Studio): fondo Efeonce, acento Brand.
# Títulos directos, sin pregunta y respuesta (instrucción del operador del 07/10/2026). Registro formal, de usted.
# Documento separado del anexo gráfico «POSIBLE»: sus piezas entran aquí sólo como evidencia en miniatura.
# Uso: python3 build-tecnica.py local            → out/html/NN.html con rutas locales (para PNG y PDF)
#      python3 build-tecnica.py dc <project>     → tableros .dc.html del lienzo, con blobs.json (ruta local → /_blob/…)
import json, os, sys

MODE = sys.argv[1] if len(sys.argv) > 1 else 'local'
HERE = os.path.dirname(os.path.abspath(__file__))
AX = json.load(open(os.path.join(HERE, 'axis-assets.json')))
BLOBS = json.load(open(os.path.join(HERE, 'blobs.json'))) if MODE == 'dc' else {}
ACC = '#ff6500'
BG, INK, SOFT, RULE = '#001a33', '#ffffff', '#c9d6e2', 'rgba(255, 255, 255, 0.14)'
ID = "'Bricolage Grotesque', system-ui, sans-serif"; ST = "'Poppins', system-ui, sans-serif"
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap" rel="stylesheet">'
CLIENT = 'Sika'


def A(name):
    return BLOBS[name] if MODE == 'dc' else '../../img/' + name


def nav(n):
    g = AX['nav']['dark-' + str(n)].replace('stroke="#023c70" stroke-opacity="0.14"', 'stroke="#ffffff" stroke-opacity="0.22"').replace('#bb1954', ACC)
    return f'<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">{g}</svg>'


def signature():
    w = 300; h = round(w * 30 / 395.15)
    return f'<img src="{A("lockup.svg")}" alt="Efeonce Creative Studio" style="position: absolute; left: {(1920 - w) // 2}px; top: {1080 - 38 - h}px; width: {w}px; height: {h}px">'


def page(title, body, section=None, sign=True):
    inner = f'''<div style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: {BG}; color: {INK}; font-family: {ST}">
{body}
{nav(section) if section else ''}
{signature() if sign else ''}
</div>'''
    if MODE == 'local':
        return f'<!doctype html>\n<html lang="es"><head><meta charset="utf-8"><title>{title}</title>{FONTS}<style>body{{margin:0;background:{BG}}}</style></head><body>\n{inner}\n</body></html>\n'
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
{FONTS}
<style>
body{{margin:0;background:{BG}}}
</style>
</helmet>
{inner}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1920,"height":1080}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
'''


def img_page(title, name, alt):
    return page(title, f'<img src="{A(name)}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px">', sign=False)


def sphere():
    return f'<span style="display: inline-block; width: 0.2em; height: 0.2em; border-radius: 50%; background: {ACC}; margin-left: 0.04em"></span>'


def eyebrow(text):
    ring = f'<span style="display: inline-block; width: 14px; height: 14px; box-sizing: border-box; border: 3px solid {ACC}; border-radius: 50%; margin-right: 16px; vertical-align: -1px"></span>'
    return f'<div style="font-size: 18px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: {INK}">{ring}{text}</div>'


def headline(lines, px=84, extra='; margin-top: 56px'):
    return f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.96; white-space: nowrap; color: {INK}{extra}">{"<br>".join(lines)}{sphere()}</div>'


def body(text, px=22, width=560, extra='; margin-top: 32px'):
    return f'<div style="font-size: {px}px; font-weight: 300; line-height: 1.45; color: {INK}; max-width: {width}px{extra}">{text}</div>'


def label(text, color=SOFT, extra=''):
    return f'<div style="font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: {color}{extra}">{text}</div>'


def col(inner, top=120, width=600):
    return f'<div style="position: absolute; left: 140px; top: {top}px; width: {width}px; display: flex; flex-direction: column">{inner}</div>'


def zone(inner, left, top, width, extra=''):
    return f'<div style="position: absolute; left: {left}px; top: {top}px; width: {width}px{extra}">{inner}</div>'


def icon(glyph, size=52):
    return f'<div style="width: {size}px; height: {size}px; margin: 0 0 4px -4px">{AX["icons"][glyph + "-dark"].replace(chr(34) + "52" + chr(34), chr(34) + str(size) + chr(34))}</div>'


def halo(cx=1300, cy=440, pcy=None, prx=520, pry=46, op=0.24):
    plat = ''
    if pcy:
        plat = (f'<ellipse cx="{cx}" cy="{pcy}" rx="{prx}" ry="{pry}" fill="url(#pf)"/>'
                f'<ellipse cx="{cx}" cy="{pcy}" rx="{prx}" ry="{pry}" fill="none" stroke="{ACC}" stroke-opacity="0.55" stroke-width="3"/>'
                f'<path d="M {cx - prx * 0.92:.0f} {pcy + pry * 0.4:.0f} A {prx} {pry} 0 0 0 {cx + prx * 0.7:.0f} {pcy + pry * 0.75:.0f}" fill="none" stroke="{ACC}" stroke-width="14" opacity="0.45" filter="url(#pg)"/>'
                f'<path d="M {cx - prx * 0.92:.0f} {pcy + pry * 0.4:.0f} A {prx} {pry} 0 0 0 {cx + prx * 0.7:.0f} {pcy + pry * 0.75:.0f}" fill="none" stroke="{ACC}" stroke-width="6" stroke-linecap="round"/>')
    return f'''<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">
<defs>
<radialGradient id="hl" cx="{cx}" cy="{cy}" r="760" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="{ACC}" stop-opacity="{op}"/><stop offset="0.42" stop-color="{ACC}" stop-opacity="0.06"/><stop offset="1" stop-color="{ACC}" stop-opacity="0"/></radialGradient>
<radialGradient id="pf" cx="{cx}" cy="{pcy or 0}" r="{prx}" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 {(pcy or 0) * 0.84:.0f}) scale(1 0.16)"><stop offset="0" stop-color="{ACC}" stop-opacity="0.34"/><stop offset="0.7" stop-color="{ACC}" stop-opacity="0.06"/><stop offset="1" stop-color="{ACC}" stop-opacity="0"/></radialGradient>
<filter id="pg" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
</defs>
<rect width="1920" height="1080" fill="url(#hl)"/>
{plat}
</svg>'''


CARD = 'box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18), 0 22px 44px rgba(0, 6, 16, 0.6); background: linear-gradient(180deg, #0d2f4f 0%, #06203a 100%); border-radius: 22px;'
HERO = f'box-shadow: 0 0 0 2px {ACC}, 0 50px 110px rgba(0, 6, 16, 0.75), 0 0 110px rgba(255, 101, 0, 0.32); background: linear-gradient(180deg, #123a5e 0%, #06203a 100%); border-radius: 26px;'


def obj(inner, left, top, width, hero=False, extra=''):
    return f'<div style="position: absolute; left: {left}px; top: {top}px; width: {width}px; box-sizing: border-box; padding: {"28px 30px 30px" if hero else "24px 26px 26px"}; {HERO if hero else CARD}{extra}">{inner}</div>'


def okicker(text):
    return f'<div style="font-weight: 600; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; color: {SOFT}">{text}</div>'


def otitle(text, px=30, extra=''):
    return f'<div style="font-family: {ID}; font-weight: 740; font-size: {px}px; letter-spacing: -0.02em; line-height: 1.06; margin-top: 10px{extra}">{text}</div>'


def otext(text, px=17, extra=''):
    return f'<div style="font-weight: 400; font-size: {px}px; line-height: 1.42; color: {SOFT}; margin-top: 10px{extra}">{text}</div>'


def fig(v, px, extra=''):
    return f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.045em; line-height: 0.9; white-space: nowrap{extra}">{v}</div>'


def frame(name, alt, left, top, width, height, cap=None, hero=False, fit='cover'):
    ring = f'0 0 0 2px {ACC}, 0 40px 90px rgba(0, 6, 16, 0.7), 0 0 90px rgba(255, 101, 0, 0.28)' if hero else '0 0 0 1px rgba(255, 255, 255, 0.22), 0 26px 54px rgba(0, 6, 16, 0.65)'
    c = f'<div style="position: absolute; left: {left}px; top: {top + height + 12}px; width: {width}px; font-size: 15px; font-weight: 400; line-height: 1.35; color: {SOFT}">{cap}</div>' if cap else ''
    return (f'<img src="{A(name)}" alt="{alt}" style="position: absolute; left: {left}px; top: {top}px; width: {width}px; height: {height}px; object-fit: {fit}; border-radius: 14px; box-shadow: {ring}; background: #06203a">' + c)


def means(text, src='', top=856):
    return zone(f'<div style="display: grid; grid-template-columns: minmax(0, 1fr) 520px; column-gap: 60px; padding-top: 16px; border-top: 1px solid {RULE}">'
                f'<div>{label("Qué significa para " + CLIENT, INK)}<div style="font-size: 21px; font-weight: 400; line-height: 1.4; color: {INK}; margin-top: 8px">{text}</div></div>'
                f'<div style="padding-top: 22px; font-size: 15px; font-weight: 400; line-height: 1.5; color: {SOFT}">{src}</div></div>', 140, top, 1640)


def left(eb, lines, text, px=84, extra=''):
    return col(eyebrow(eb) + headline(lines, px) + body(text) + extra)


def tag(text):
    return (f'<div style="display: inline-flex; align-items: center; gap: 8px; margin-top: 14px; padding: 6px 12px; border-radius: 999px; box-shadow: inset 0 0 0 1.5px {ACC}; font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: {INK}">'
            f'<span style="width: 8px; height: 8px; border-radius: 50%; background: {ACC}"></span>{text}</div>')


S = []
N = {}  # clave → número de lámina, para las referencias cruzadas


def ref(key):
    return str(N[key])


def callout(text, extra='; margin-top: 26px; max-width: 540px'):
    return f'<div style="border-left: 3px solid {ACC}; padding: 4px 0 4px 16px; font-size: 18px; font-weight: 400; line-height: 1.45; color: {INK}{extra}">{text}</div>'


def bullets(xs, on=True):
    dot = f'background: {ACC}' if on else 'box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.6)'
    return ''.join(f'<div style="display: grid; grid-template-columns: 22px minmax(0, 1fr); align-items: start; padding: 11px 0; border-top: 1px solid {RULE}"><span style="width: 10px; height: 10px; border-radius: 50%; margin-top: 8px; {dot}"></span>'
                   f'<div style="font-size: 17px; font-weight: 400; line-height: 1.4">{x}</div></div>' for x in xs)


def add(key, title, fn):
    S.append((key, title, fn))


# ── 01 · Portada (compositor: cover-proposal · dawn · Brand, selección quitada) ─────────────────────────────────
add('portada', 'Portada', lambda: img_page('Sika · Propuesta técnica', 'portada.png', 'Propuesta técnica para Sika Mexicana, licitación Wherex N.º 1164: Innovar es hacerlo posible. Así lo hacemos.'))


# ── 02 · Resumen ───────────────────────────────────────────────────────────────────────────────────────────────
def s_resumen():
    docs = [('Este documento', 'Propuesta técnica', 'Método, plazo, control y equipo para producir cada lanzamiento.', str(len(S)) + ' láminas', False),
            ('Documento adjunto', 'Anexo gráfico', 'La campaña «POSIBLE»: manual de identidad, Master Graphic y las tres muestras del concurso.', '21 páginas', True),
            ('En Wherex', 'Oferta económica', 'El valor de un lanzamiento tipo y de las piezas adicionales.', 'Documento aparte', False)]
    cards = ''.join(obj(okicker(k) + otitle(t, 34 if hero else 30) + otext(x) +
                        f'<div style="position: absolute; left: {30 if hero else 26}px; bottom: 26px; font-family: {ID}; font-size: 22px; font-weight: 700; letter-spacing: -0.01em">{n}</div>',
                        820 + i * 330, 240 if hero else 300, 300, hero, '; height: ' + ('470px' if hero else '380px')) for i, (k, t, x, n, hero) in enumerate(docs))
    receives = (f'<div style="margin-top: 34px; padding-top: 18px; border-top: 1px solid {RULE}">{label("Qué recibe Sika", INK)}'
                f'<div style="font-family: {ID}; font-size: 27px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; margin-top: 10px">Una identidad común para todos sus lanzamientos, con Sika como marca principal.</div></div>')
    return page('Sika · Resumen', halo(1300, 470, 790, 560, 50) + cards +
                left('Resumen', ['Un sistema', 'de campaña', 'listo para', 'producir'],
                     'Sika pidió evolucionar «Innovar es hacerlo posible, innovar es hacerlo Sika» para sus lanzamientos de producto. Proponemos una identidad de campaña, una pieza madre y un método para adaptarla a cada producto.', extra=receives))


add('resumen', 'Resumen', s_resumen)


# ── Cumplimiento ───────────────────────────────────────────────────────────────────────────────────────────────
def s_matriz():
    rows = [('Metodología de trabajo', 'Cinco etapas de trabajo, con dos aprobaciones de Sika.', f'Láminas {ref("metodo")} y {ref("control")}'),
            ('Desarrollo y evolución gráfica de la campaña', 'Un sistema de campaña construido sobre los materiales de Sika: firma, fórmula de titular y pieza madre.', f'Láminas {ref("partida")} a {ref("alcance")}'),
            ('1 imagen para Facebook, 1 para Instagram y 1 video tipo reel', 'Las tres piezas, para SikaSeal®-170. El reel dura 25 segundos y va en storyboard con locución.', f'Lámina {ref("muestras")} · Anexo gráfico, páginas 15 a 17'),
            ('Tiempos de entrega', 'Diez días hábiles por lanzamiento, desde la entrega del brief.', f'Lámina {ref("plazo")}'),
            ('Propuesta económica desglosada', 'Valor por pieza del lanzamiento tipo y de las piezas adicionales.', 'Documento aparte, en Wherex'),
            ('Además', 'Equipo con nombre y función, y un caso de éxito.', f'Láminas {ref("equipo")} a {ref("experiencia")}')]
    tpl = 'display: grid; grid-template-columns: 290px minmax(0, 1fr) 220px; column-gap: 26px'
    head = f'<div style="{tpl}; padding-bottom: 14px">{label("Lo que pide la ficha")}{label("Nuestra respuesta")}{label("Dónde está")}</div>'
    body_rows = ''.join(f'<div style="{tpl}; align-items: start; padding: 16px 0; border-top: 1px solid {RULE}"><div style="font-family: {ID}; font-size: 21px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.14">{a}</div>'
                        f'<div style="font-size: 17px; font-weight: 300; line-height: 1.4; color: {SOFT}">{b}</div><div style="font-size: 16px; font-weight: 500; line-height: 1.4">{c}</div></div>' for a, b, c in rows)
    return page('Sika · Cumplimiento', halo(1300, 470, None) + obj(head + body_rows, 820, 196, 960, True, '; padding: 30px 32px 22px') +
                left('Cumplimiento', ['Cada punto', 'de la ficha', 'tiene su', 'respuesta'], 'La ficha de la licitación pide cinco contenidos. Esta tabla los toma con sus mismas palabras e indica dónde está cada uno.') +
                means('El comité puede ir directamente al punto que evalúa.', 'Ficha de la licitación N.º 1164 en Wherex, apartado «Comentarios generales».'))


add('matriz', 'Cumplimiento', s_matriz)



# ── 03 · Punto de partida ──────────────────────────────────────────────────────────────────────────────────────
def s_partida():
    a = obj(okicker('La firma, hoy') + f'<img src="{A("antes-firma.jpg")}" alt="Cuatro versiones de la firma de campaña en el material actual de Sika" style="display: block; width: 100%; height: 252px; object-fit: cover; border-radius: 10px; margin-top: 14px">', 820, 196, 540, False)
    b = obj(okicker('Las piezas, hoy') + f'<img src="{A("antes-sistema.jpg")}" alt="Piezas actuales de Sika para distintos productos, cada una con una composición distinta" style="display: block; width: 100%; height: 256px; object-fit: cover; border-radius: 10px; margin-top: 14px">', 1200, 496, 580, True)
    return page('Sika · Punto de partida', halo(1320, 480, None) + a + b +
                left('La propuesta · Punto de partida', ['Un concepto,', 'cuatro formas', 'de firmarlo'], 'En el material que Sika compartió, la firma de la campaña aparece en cuatro versiones y cada producto resuelve su pieza con una composición propia. El concepto es sólido. Le falta un sistema que lo haga reconocible de un lanzamiento al siguiente.', 80) +
                means('La evolución conserva el concepto y la autoridad de la marca Sika, y ordena la forma en que se aplica.',
                      'Brief y material de referencia de la licitación N.º 1164. Comparación completa en el anexo gráfico, página 2.'), section=1)


add('partida', 'Punto de partida', s_partida)


# ── 04 · El sistema ────────────────────────────────────────────────────────────────────────────────────────────
def s_sistema():
    rules = [('Firma única', '«Innovar es hacerlo POSIBLE», con el triángulo de Sika como acento.'),
             ('Fórmula de titular', '«Innovar para…» y el beneficio del producto.'),
             ('Producto protagonista', 'El envase real, grande y en acción.'),
             ('Sika al frente', 'El logotipo de Sika firma cada pieza.')]
    row = ''.join(f'<div style="padding-top: 14px; border-top: 1px solid {RULE}"><div style="font-family: {ID}; font-size: 22px; font-weight: 740; letter-spacing: -0.02em">{t}</div>'
                  f'<div style="font-size: 16px; font-weight: 300; line-height: 1.4; color: {SOFT}; margin-top: 6px">{x}</div></div>' for t, x in rules)
    return page('Sika · El sistema', halo(1300, 430, None) + frame('master.jpg', 'Master Graphic de la campaña POSIBLE con SikaSeal-170 y Sikaflex-119', 860, 186, 880, 495, hero=True) +
                zone(f'<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 24px">{row}</div>', 820, 714, 960) +
                left('La propuesta · El sistema', ['Una firma,', 'una fórmula,', 'una pieza', 'madre'], 'La campaña se concentra en una palabra, POSIBLE. De ella salen una fórmula de titular y un Master Graphic que rige todas las piezas de un lanzamiento, digitales e impresas.') +
                means('Cualquier equipo, de Sika o de agencia, puede producir un lanzamiento nuevo sin reinterpretar la campaña.',
                      'Anexo gráfico, páginas 4 a 14: Master Graphic y manual de identidad de la campaña.'), section=1)


add('sistema', 'El sistema', s_sistema)


# ── Audiencias ─────────────────────────────────────────────────────────────────────────────────────────────────
def s_audiencias():
    aud = [('aud-hogar.jpg', 'Hogar', 'Quien arregla su casa', 'Innovar para simplificar.', 'Cercano, resuelve en una frase.', 'Un beneficio principal, máximo tres.'),
           ('aud-pro.jpg', 'Profesional', 'Contratistas, aplicadores e instaladores', 'Innovar para rendir más en obra.', 'Directo, de colega a colega.', 'Tiempos, rendimiento y compatibilidad.'),
           ('aud-industria.jpg', 'Industria y proyecto', 'Constructoras, especificadores y concreteras', 'Innovar para construir con confianza.', 'Técnico y sobrio.', 'Ficha técnica, normas y caso de obra.')]
    def note(k, v):
        return f'<div style="font-size: 15px; line-height: 1.4; margin-top: 8px"><span style="font-weight: 600">{k}</span> <span style="font-weight: 300; color: {SOFT}">{v}</span></div>'
    cards = ''.join(obj(f'<img src="{A(im)}" alt="Escena de la campaña para la audiencia {t}" style="display: block; width: 100%; height: 150px; object-fit: cover; border-radius: 12px">' +
                        otitle(t, 26, '; margin-top: 16px') + f'<div style="font-size: 15px; font-weight: 300; line-height: 1.35; color: {SOFT}; margin-top: 6px; min-height: 40px">{w}</div>' +
                        f'<div style="font-family: {ID}; font-size: 25px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.12; margin-top: 16px; padding-top: 16px; border-top: 1px solid {RULE}; min-height: 84px">{h}</div>' +
                        note('Tono.', tn) + note('Información.', inf), 820 + i * 330, 216, 300, i == 0, '; height: 520px; padding: 20px 22px 24px') for i, (im, t, w, h, tn, inf) in enumerate(aud))
    return page('Sika · Audiencias', halo(1300, 470, 772, 560, 40) + cards +
                left('La propuesta · Abordaje', ['Una idea,', 'tres', 'audiencias'], 'Sika habla con quien arregla su casa, con quien aplica en obra y con quien especifica un proyecto. La firma, el color y la composición no cambian. Cambian la foto, el tono y la cantidad de dato técnico.') +
                means('Un solo aspecto para toda la campaña, con ajustes por público, como Sika lo pidió en la ronda de preguntas.',
                      'Anexo gráfico, página 13. Respuesta de Sika en Wherex del 6 de octubre de 2026.'), section=1)


add('audiencias', 'Audiencias', s_audiencias)



# ── 05 · Muestras del concurso ─────────────────────────────────────────────────────────────────────────────────
def s_muestras():
    items = [('01', 'Publicación para Facebook', 'Formato 1:1 · anexo, página 15'), ('02', 'Publicación para Instagram', 'Formato 4:5 · anexo, página 16'), ('03', 'Reel de Instagram', 'Storyboard de siete cuadros con locución · anexo, página 17')]
    lst = ''.join(f'<div style="display: grid; grid-template-columns: 46px minmax(0, 1fr); column-gap: 12px; padding: 14px 0; border-top: 1px solid {RULE}"><div style="font-family: {ID}; font-size: 26px; font-weight: 760; letter-spacing: -0.03em">{n}</div>'
                  f'<div><div style="font-size: 18px; font-weight: 500; line-height: 1.3">{t}</div><div style="font-size: 15px; font-weight: 300; line-height: 1.4; color: {SOFT}; margin-top: 4px">{x}</div></div></div>' for n, t, x in items)
    return page('Sika · Muestras', halo(1300, 430, None) +
                frame('fb.jpg', 'Muestra para Facebook, SikaSeal-170 Sanisil, formato 1:1', 820, 190, 340, 340, hero=True) +
                frame('ig.jpg', 'Muestra para Instagram, SikaSeal-170 Sanisil, formato 4:5', 1184, 190, 272, 340) +
                zone(lst, 1486, 186, 294) +
                frame('story.jpg', 'Storyboard del reel en siete cuadros', 820, 560, 960, 232) +
                left('La propuesta · Muestras del concurso', ['Las tres', 'muestras ya', 'aplican el', 'sistema'], 'Las bases piden tres muestras. Las desarrollamos para SikaSeal®-170 Sanisil, uno de los dos productos que Sika indicó, y las tres salen de la misma pieza madre.') +
                means('El comité puede revisar las tres piezas a tamaño completo en el anexo gráfico. Aquí van en miniatura.',
                      'Respuestas de Sika en Wherex del 2, 5, 6 y 9 de octubre de 2026: un solo producto admitido, storyboard con locución admitido y trabajo sobre los elementos visuales de sus materiales.'), section=1)


add('muestras', 'Muestras del concurso', s_muestras)


# ── 06 · Alcance del sistema ───────────────────────────────────────────────────────────────────────────────────
def s_alcance():
    return page('Sika · Alcance del sistema', halo(1300, 430, None) +
                frame('sikaflex.jpg', 'Pieza para Sikaflex-119 High Tack', 820, 200, 265, 265, 'Sikaflex®-119 · consumo') +
                frame('visco.jpg', 'Pieza para Sika ViscoCrete 45 HE', 1100, 200, 265, 265, 'Sika® ViscoCrete® · industria') +
                frame('pdv.jpg', 'Colgante, cenefa y producto en un anaquel de tienda', 1380, 200, 400, 265, 'Punto de venta · colgante y cenefa', hero=True) +
                frame('cenefa.jpg', 'Cenefa de anaquel para Sikaflex-119', 820, 560, 960, 168, 'Cenefa de anaquel, rehecha a partir del material actual de Sika') +
                left('La propuesta · Alcance del sistema', ['El sistema', 'llega a otros', 'productos y', 'a la tienda'], 'Para comprobar que la identidad escala, la aplicamos a Sikaflex®-119, a un producto de la línea industrial y al punto de venta. Son piezas de demostración: no forman parte del alcance base.', 80) +
                means('Consumo e industria comparten una misma identidad, de la publicación en redes al anaquel.',
                      'Anexo gráfico, páginas 3 y 18 a 20. Piezas adicionales, fuera de la oferta base.'), section=1)


add('alcance', 'Alcance del sistema', s_alcance)


# ── 07 · Método ────────────────────────────────────────────────────────────────────────────────────────────────
STAGES = [('objetivo', 'Inmersión', 'Brief, ficha técnica y renders del producto. Se acuerdan los mensajes y lo que se puede afirmar.', False),
          ('composer', 'Pieza madre', 'Master Graphic del lanzamiento: firma, titular, producto y sello.', True),
          ('multimedia', 'Adaptación', 'Las piezas digitales y de punto de venta se derivan de la pieza madre.', False),
          ('checklist', 'Revisión', 'Control de marca y de contenido técnico. Hasta dos rondas de ajustes.', True),
          ('enviar', 'Entrega', 'Archivos finales por canal y por formato.', False)]


def s_metodo():
    cards = ''.join(obj(icon(g, 46) + f'<div style="font-size: 14px; font-weight: 500; letter-spacing: 0.1em; color: {SOFT}; margin-top: 14px">ETAPA {i + 1}</div>' + otitle(t, 26, '; margin-top: 4px') + otext(x, 16) + (tag('Aprueba Sika') if hero else ''),
                        820 + i * 195, 232 if hero else 282, 180, hero, f'; height: {490 if hero else 390}px; padding: 22px 18px 22px') for i, (g, t, x, hero) in enumerate(STAGES))
    return page('Sika · Método', halo(1300, 470, 790, 560, 46) + cards +
                left('La producción · Método', ['Cinco etapas', 'y dos', 'aprobaciones', 'de Sika'], 'Cada lanzamiento sigue el mismo recorrido. Sika aprueba en dos momentos: la pieza madre, antes de adaptar, y el conjunto completo, antes de la entrega.') +
                means('Sika decide en dos momentos definidos y no revisa cada pieza desde cero.',
                      'Método de trabajo de Efeonce Creative Studio. Una ronda es un conjunto consolidado de comentarios en un solo envío.'), section=2)


add('metodo', 'Método', s_metodo)


# ── 08 · Lanzamiento tipo ──────────────────────────────────────────────────────────────────────────────────────
def s_entregables():
    def rows(xs):
        return ''.join(f'<div style="display: grid; grid-template-columns: 58px minmax(0, 1fr); column-gap: 10px; align-items: center; padding: 14px 0; border-top: 1px solid {RULE}">{fig(n, 44)}'
                       f'<div style="font-size: 17px; font-weight: 400; line-height: 1.3">{t}</div></div>' for n, t in xs)
    hero = obj(okicker('Pieza madre') + fig('1', 190, '; margin-top: 22px') + otitle('Master Graphic', 34, '; margin-top: 18px') + otext('La pieza que fija firma, titular, producto y sello del lanzamiento. Todas las demás se derivan de ella.'), 820, 220, 300, True, '; height: 540px')
    dig = obj(okicker('Adaptaciones digitales') + f'<div style="margin-top: 16px">{rows([("5", "publicaciones para redes sociales"), ("1", "reel para Instagram, con adaptación para TikTok"), ("6", "historias: 3 para Instagram y 3 para Facebook")])}</div>', 1150, 280, 300, False, '; height: 420px')
    pdv = obj(okicker('Punto de venta e impresos') + f'<div style="margin-top: 16px">{rows([("1", "cartel tamaño tabloide"), ("1", "cenefa de anaquel"), ("1", "colgante"), ("1", "anuncio tamaño carta")])}</div>', 1480, 280, 300, False, '; height: 420px')
    return page('Sika · Lanzamiento tipo', halo(1300, 480, 800, 560, 46) + hero + dig + pdv +
                left('La producción · Lanzamiento tipo', ['Una pieza', 'madre y sus', 'adaptaciones'], 'El alcance base de un lanzamiento es el que Sika definió en la ronda de preguntas: un Master Graphic y sus adaptaciones para redes sociales y para el punto de venta.') +
                means('La oferta económica valora este lanzamiento tipo. Las piezas adicionales se valoran por separado.',
                      'Respuestas de Sika en Wherex del 5, 6 y 9 de octubre de 2026. Formatos y cantidades finales se ajustan con Sika al inicio.'), section=2)


add('entregables', 'Lanzamiento tipo', s_entregables)


# ── Reel ───────────────────────────────────────────────────────────────────────────────────────────────────────
def s_reel():
    base = obj(okicker('Incluido en el reel base') + f'<div style="margin-top: 12px">{bullets(["Guion y storyboard, con aprobación de Sika", "Animación de las escenas y del envase de la pieza madre", "Titulares en pantalla", "Locución y música con licencia de uso", "Formato vertical para Instagram y adaptación para TikTok"])}</div>', 820, 456, 465, True, '; height: 364px')
    extra = obj(okicker('Producción adicional, a pedido') + f'<div style="margin-top: 12px">{bullets(["Rodaje en locación o en obra", "Talento en cámara", "Voz de marca en exclusiva"], False)}</div>', 1315, 456, 465, False, '; height: 364px')
    return page('Sika · Reel', halo(1300, 460, None) + frame('story.jpg', 'Storyboard del reel de SikaSeal-170 en siete cuadros', 820, 196, 960, 232) + base + extra +
                left('La producción · Reel', ['El reel se', 'anima desde', 'la pieza', 'madre'], 'Sika confirmó que el reel puede animar imágenes. El reel base se construye con las escenas y el envase de la pieza madre, sin rodaje. Lo que requiere grabación se valora aparte.') +
                means('Sika sabe qué incluye el reel base y qué se decide como producción adicional.',
                      'Respuestas de Sika en Wherex del 5, 6 y 9 de octubre de 2026: el reel puede animar imágenes y contempla su adaptación para TikTok. Storyboard en el anexo gráfico, página 17.'), section=2)


add('reel', 'Reel', s_reel)


# ── Piezas adicionales ─────────────────────────────────────────────────────────────────────────────────────────
def s_adicionales():
    a = obj(okicker('Piezas adicionales') + otitle('Se piden por pieza', 30) + f'<div style="margin-top: 16px">{bullets(["Carruseles", "Stopper y otros materiales de punto de venta", "Banners y formatos para medios", "Historias y videos para otras redes"])}</div>', 820, 236, 300, True, '; height: 480px')
    b = obj(okicker('Impresos') + otitle('Artes finales listos para imprenta', 26) + otext('En las medidas que Sika indique. Las muestras del concurso usan medidas estándar.'), 1150, 300, 300, False, '; height: 350px')
    c = obj(okicker('Fuera del servicio') + f'<div style="margin-top: 14px">{bullets(["Impresión, producción e instalación de materiales", "Pauta y compra de medios"], False)}</div>', 1480, 300, 300, False, '; height: 350px')
    return page('Sika · Piezas adicionales', halo(1300, 480, 760, 560, 46) + a + b + c +
                left('La producción · Piezas adicionales', ['Lo adicional', 'se pide por', 'pieza'], 'Sika indicó que las piezas fuera del lanzamiento tipo son opcionales. Se solicitan por pieza, salen de la misma pieza madre y se valoran en la oferta económica.') +
                means('El lanzamiento tipo tiene un alcance cerrado. Lo demás se decide caso a caso.',
                      'Respuestas de Sika en Wherex del 5 y 6 de octubre de 2026: recursos existentes y producción adicional, por separado.'), section=2)


add('adicionales', 'Piezas adicionales', s_adicionales)



# ── 09 · Plazo ─────────────────────────────────────────────────────────────────────────────────────────────────
def s_plazo():
    LW, DW = 210, 70  # columna de etiquetas y ancho de un día hábil (10 días)
    bars = [('Inmersión', 1, 1, None), ('Pieza madre', 2, 4, 4), ('Adaptación', 5, 7, None), ('Revisión y ajustes', 8, 9, 9), ('Entrega', 10, 10, None)]
    weeks = ''.join(f'<div style="position: absolute; left: {LW + w * 5 * DW}px; top: 0; width: {5 * DW}px; box-sizing: border-box; border-left: 1px solid {RULE}; height: 476px; padding-left: 12px">{label("Semana " + str(w + 1), INK)}'
                    f'<div style="font-size: 13px; font-weight: 300; color: {SOFT}; margin-top: 4px">Días {w * 5 + 1} a {w * 5 + 5}</div></div>' for w in range(2))
    rws = ''
    for i, (t, a, b, m) in enumerate(bars):
        y = 84 + i * 80
        rws += f'<div style="position: absolute; left: 0; top: {y - 2}px; width: {LW - 16}px"><div style="font-size: 19px; font-weight: 500">{t}</div><div style="font-size: 14px; font-weight: 300; color: {SOFT}; margin-top: 2px">{"Día " + str(a) if a == b else f"Días {a} a {b}"}</div></div>'
        rws += f'<div style="position: absolute; left: {LW + (a - 1) * DW + 4}px; top: {y}px; width: {(b - a + 1) * DW - 8}px; height: 42px; border-radius: 11px; background: linear-gradient(90deg, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.34)); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6)"></div>'
        if m:
            rws += f'<div style="position: absolute; left: {LW + m * DW - 15}px; top: {y + 6}px; width: 30px; height: 30px; border-radius: 50%; background: {ACC}; box-shadow: 0 0 0 5px {BG}, 0 0 26px rgba(255, 101, 0, 0.7)"></div>'
    legend = (f'<div style="position: absolute; left: {LW}px; top: 498px; display: flex; align-items: center; gap: 10px; font-size: 15px; color: {SOFT}"><span style="width: 16px; height: 16px; border-radius: 50%; background: {ACC}"></span>Aprobación de Sika</div>')
    gantt = obj(f'<div style="position: relative; height: 524px">{weeks}{rws}{legend}</div>', 820, 200, 960, True, '; padding: 30px 26px 26px 30px')
    return page('Sika · Plazo', halo(1300, 470, None) + gantt +
                left('La producción · Plazo', ['Diez días', 'hábiles por', 'lanzamiento'], 'El plazo corre desde que Sika entrega el brief, la ficha técnica y los renders del producto. La pieza madre llega a su aprobación el cuarto día. El tiempo de revisión de Sika se agrega al calendario.', extra=callout('Sika nombró dos productos, Sikaflex®-119 y SikaSeal®-170. El segundo lanzamiento parte con el sistema ya construido.')) +
                means('El calendario definitivo se acuerda en la reunión de inicio, según el número de lanzamientos y sus fechas.',
                      'Plazo propuesto por Efeonce para un lanzamiento tipo, con hasta dos rondas de ajustes. Se confirma al inicio.'), section=2)


add('plazo', 'Plazo', s_plazo)


# ── 10 · Control ───────────────────────────────────────────────────────────────────────────────────────────────
def s_control():
    def card(g, t, x, l, tp, w, hero=False):
        return obj(icon(g, 44) + otitle(t, 26, '; margin-top: 12px') + otext(x, 16), l, tp, w, hero, '; height: 284px')
    cards = (card('contrato', 'Aprobación', 'Una persona de Sika aprueba la pieza madre y el conjunto final. Ninguna pieza se publica sin ese visto bueno.', 820, 196, 300, True) +
             card('republicar', 'Rondas de ajuste', 'Hasta dos rondas consolidadas por pieza. Un cambio de dirección creativa se trata como un brief nuevo.', 1150, 196, 300) +
             card('seguridad', 'Contenido técnico', 'Cada beneficio se contrasta con la ficha técnica vigente del producto antes de diseñar.', 1480, 196, 300) +
             card('ia', 'Imagen e inteligencia artificial', 'El envase es siempre el render oficial de Sika. En las muestras, las escenas se generaron con IA. En producción Sika elige entre IA, fotografía o ambas, y una persona revisa y aprueba cada pieza.', 820, 510, 630) +
             card('assets', 'Derechos y archivos', 'Canales, territorio y plazo de uso se definen antes de producir. La entrega incluye los archivos finales en los formatos que Sika indique.', 1480, 510, 300))
    return page('Sika · Control', halo(1300, 480, None) + cards +
                left('La producción · Control', ['Nada sale', 'sin la', 'aprobación', 'de Sika'], 'La aprobación final y lo que se afirma de cada producto son decisión de Sika. Efeonce responde por la consistencia de la marca, la exactitud de los textos y el origen de cada imagen.') +
                means('Sika conserva la decisión sobre su marca y sus productos en cada pieza.',
                      'Condiciones de trabajo propuestas por Efeonce. Se formalizan en el acuerdo de servicio.'), section=2)


add('control', 'Control', s_control)


# ── 11 · Equipo ────────────────────────────────────────────────────────────────────────────────────────────────
TEAM = [('andres', 'Andrés Carlosama', 'Senior Visual Designer', 'Diseño y adaptación de piezas', False),
        ('daniela', 'Daniela Ferreira', 'Creative Operations Lead', 'Dirección de arte y control de marca', False),
        ('julio', 'Julio Reyes', 'Responsable de Cuenta', 'Interlocutor de Sika y dirección del proyecto', True),
        ('valentina', 'Valentina Hoyos', 'Content Lead', 'Titulares, guiones y textos', False),
        ('melkin', 'Melkin Hernandez', 'Senior Visual Designer', 'Diseño y adaptación de piezas', False)]


def s_equipo():
    def card(i, k, n, r, f, hero):
        ph = (f'<div style="height: {196 if hero else 172}px; border-radius: 14px; overflow: hidden; background: radial-gradient(circle at 50% 30%, #1b4a75 0%, #082540 78%)">'
              f'<img src="{A("squad-" + k + ".png")}" alt="{n}, {r}" style="display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 12%"></div>')
        txt = (f'<div style="font-family: {ID}; font-size: {23 if hero else 20}px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.08; margin-top: 16px">{n}</div>'
               f'<div style="font-size: 14px; font-weight: 500; line-height: 1.35; margin-top: 8px">{r}</div>'
               f'<div style="font-size: 14px; font-weight: 300; line-height: 1.4; color: {SOFT}; margin-top: 8px">{f}</div>')
        return obj(ph + txt, 820 + i * 195, 226 if hero else 286, 180, hero, f'; height: {480 if hero else 384}px; padding: {"16px 16px 20px" if hero else "14px 14px 18px"}')
    cards = ''.join(card(i, *t) for i, t in enumerate(TEAM))
    return page('Sika · Equipo', halo(1300, 460, 790, 560, 46) + cards +
                left('El equipo', ['Un equipo estable', 'y un solo', 'interlocutor'], 'Dirección de arte, diseño y contenido en un mismo equipo. Sika trata con un Responsable de Cuenta, que coordina el trabajo y responde por los plazos.', 66,
                     # Cifra de la red, como en la lámina «Expertos multidisciplinarios» canonizada el 2026-10-10: «+85» con el «+» en el acento. La cifra viene del operador.
                     extra=f'<div style="display: flex; align-items: center; gap: 26px; margin-top: 40px; padding-top: 30px; border-top: 1px solid {RULE}">'
                           f'<div style="font-family: {ID}; font-size: 168px; font-weight: 760; letter-spacing: -0.05em; line-height: 0.82; white-space: nowrap"><span style="color: {ACC}">+</span>85</div>'
                           f'<div><div style="font-family: {ID}; font-size: 34px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.08">profesionales en toda Latinoamérica</div>'
                           f'<div style="font-size: 18px; font-weight: 300; line-height: 1.4; color: {SOFT}; margin-top: 10px">La red de Efeonce detrás de su equipo.</div></div></div>') +
                means('Sika sabe quién trabaja en su campaña y con qué función.',
                      'Equipo de Efeonce Creative Studio. La dedicación de cada persona se define con el calendario de lanzamientos.'), section=3)


add('equipo', 'Equipo', s_equipo)


# ── Trabajo con México ─────────────────────────────────────────────────────────────────────────────────────────
def s_mexico():
    def card(g, t, x, l, tp, hero=False):
        return obj(icon(g, 44) + otitle(t, 28, '; margin-top: 12px') + otext(x, 17), l, tp, 465, hero, '; height: 262px')
    cards = (card('ubicacion', 'Equipo en dos países', 'Personas de Efeonce en Chile y en México trabajan sobre la misma campaña y comparten la mayor parte de la jornada.', 820, 196, True) +
             card('contenido', 'El vocabulario de Sika', 'Los titulares y los textos usan los términos de las fichas técnicas de Sika y los del mercado mexicano: cancelería, anaquel, obra.', 1315, 196) +
             card('reunion', 'Un solo interlocutor', 'El Responsable de Cuenta atiende a Sika y coordina al equipo. Los comentarios llegan por un solo canal.', 820, 488) +
             card('integracion', 'Herramientas a la vista', 'Reuniones por Microsoft Teams, seguimiento del proyecto en Notion y revisión de las piezas en Frame.io.', 1315, 488))
    return page('Sika · Trabajo con México', halo(1300, 480, None) + cards +
                left('El equipo · Trabajo con México', ['Un equipo', 'en Chile y', 'en México'], 'Efeonce atiende a Sika Mexicana con personas en Chile y en México, que trabajan sobre la misma campaña con un solo responsable.') +
                means('Sika trabaja con un equipo cercano: personas en su país y una sola persona responsable.',
                      'Efeonce opera en Chile, Estados Unidos, Colombia, México y Perú.'), section=3)


add('mexico', 'Trabajo con México', s_mexico)



# ── 12 · Experiencia ───────────────────────────────────────────────────────────────────────────────────────────
def s_experiencia():
    hero = obj(okicker('SKY Airline · doce meses') + fig('+2.000', 136, '; margin-top: 26px') + otitle('piezas aprobadas', 30, '; margin-top: 14px') + otext('Producidas por el mismo equipo creativo que atenderá a Sika.'), 820, 200, 440, True, '; height: 340px')
    small = [('39', 'campañas'), ('88 %', 'entregado a tiempo'), ('0,12', 'ajustes por pieza'), ('5', 'mercados atendidos')]
    grid = ''.join(obj(fig(v, 56) + f'<div style="font-size: 16px; font-weight: 400; color: {SOFT}; margin-top: 10px">{t}</div>', 1290 + (i % 2) * 250, 200 + (i // 2) * 178, 240, False, '; height: 162px; padding: 26px 24px') for i, (v, t) in enumerate(small))
    mk = ''.join(f'<div style="padding: 10px 16px; border-radius: 999px; font-size: 17px; font-weight: 500; white-space: nowrap; {"box-shadow: inset 0 0 0 2px " + ACC if m == "México" else "background: rgba(255, 255, 255, 0.08)"}">{m}</div>' for m in ['Chile', 'Estados Unidos', 'Colombia', 'México', 'Perú'])
    markets = obj(okicker('Dónde operamos') + f'<div style="display: flex; align-items: center; justify-content: space-between; gap: 30px; margin-top: 14px"><div style="font-family: {ID}; font-size: 30px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1; white-space: nowrap">Cinco mercados,<br>un solo equipo</div>'
                  f'<div style="display: flex; flex-wrap: nowrap; gap: 10px; justify-content: flex-end">{mk}</div></div>', 820, 574, 960, False, '; height: 180px')
    return page('Sika · Experiencia', halo(1300, 430, None) + hero + grid + markets +
                left('El equipo · Experiencia', ['Producción', 'creativa a', 'escala, con', 'medición'], 'Efeonce Creative Studio produce para marcas que publican en varios países a la vez. En la cuenta de SKY Airline medimos cada entrega durante doce meses.') +
                means('El mismo modo de trabajo, con pieza madre, adaptaciones y medición de entregas, se aplicará a sus lanzamientos.',
                      'Servicio creativo de Efeonce para SKY Airline, doce meses. Métricas de entrega medidas por Efeonce.'), section=3)


# Lámina de caso de éxito aprobada (receta decision-case, compositor oficial): composer/caso.json. La lámina hecha a mano
# (s_experiencia) quedó fuera por indicación del operador del 12/10: «esta no es la lámina de caso de éxito nuestra».
add('experiencia', 'Caso de éxito · Sky', lambda: img_page('Sika · Caso de éxito', 'caso-sky.png', 'Caso Sky, 12 meses. ¿Qué cambió con Sky? Más rápido: más de 2.000 piezas aprobadas, 39 campañas, 88 % de entregas a tiempo y 25 % menos de tiempo de producción. Fuente: caso publicado de Sky Airlines, métricas de entrega de 12 meses.'))


# ── 13 · Inicio ────────────────────────────────────────────────────────────────────────────────────────────────
def s_inicio():
    needs = [('presentacion', 'Manual de marca vigente', 'Para reemplazar por los oficiales los colores, la tipografía y los logotipos provisionales del anexo.'),
             ('base-de-datos', 'Renders y fichas técnicas', 'Del producto de cada lanzamiento, en su versión vigente.'),
             ('calendario', 'Calendario de lanzamientos', 'Productos, fechas y redes sociales de cada uno.'),
             ('reunion', 'Una contraparte que aprueba', 'Una persona que reúne los comentarios de Sika en cada ronda.'),
             ('informe', 'Validación del triángulo como acento', 'Confirmar que el manual permite usar el triángulo de Sika sobre la palabra POSIBLE.')]
    rows = ''.join(f'<div style="display: grid; grid-template-columns: 70px minmax(0, 1fr); column-gap: 20px; align-items: center; padding: 26px 0; border-top: 1px solid {RULE}">{icon(g, 50)}'
                   f'<div><div style="font-family: {ID}; font-size: 30px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.1">{t}</div>'
                   f'<div style="font-size: 18px; font-weight: 300; line-height: 1.4; color: {SOFT}; margin-top: 6px">{x}</div></div></div>' for g, t, x in needs)
    return page('Sika · Inicio', halo(1320, 470, None, op=0.18) + zone(rows, 820, 190, 960) +
                left('El inicio', ['Cinco', 'insumos de', 'Sika para', 'empezar'], 'Con la adjudicación, una reunión de inicio fija el calendario de lanzamientos y la persona que aprueba. Estos son los insumos que necesitamos para producir el primero.', extra=callout('El manual de identidad de la campaña y la pieza madre de cada lanzamiento quedan a disposición de Sika, para que cualquier equipo los use.')) +
                means('Los puntos por validar del anexo gráfico se resuelven en la primera semana, antes de producir.',
                      'Puntos por validar con Sika declarados en el anexo gráfico.'), section=4)


add('inicio', 'Inicio', s_inicio)

# ── 14 · Cierre (compositor: close-proposal · Brand, plate BR4) ────────────────────────────────────────────────
add('cierre', 'Cierre', lambda: img_page('Sika · Cierre', 'cierre.png', 'Cierre de la propuesta: Empower your Brand, con los datos de contacto de Efeonce.'))

for _i, (_k, _, _) in enumerate(S, 1):
    N[_k] = _i

# ── Escritura ──────────────────────────────────────────────────────────────────────────────────────────────────
if MODE == 'local':
    out = os.path.join(HERE, 'out', 'html'); os.makedirs(out, exist_ok=True)
    for i, (k, _, fn) in enumerate(S, 1):
        open(os.path.join(out, f'{i:02d}.html'), 'w').write(fn())
else:
    ROOT = sys.argv[2]; boards, order = {}, []
    for i, (k, title, fn) in enumerate(S):
        name = f'Tec-{i + 1:02d}.dc.html'
        open(os.path.join(ROOT, name), 'w').write(fn())
        boards[name] = {'x': (i % 4) * 2040, 'y': (i // 4) * 1280, 'w': 1920, 'h': 1080, 'title': f'{i + 1:02d} · {title}', 'page': 'tecnica'}
        order.append(name)
    json.dump({'boards': boards, 'order': order}, open(os.path.join(HERE, 'out', '_layout.json'), 'w'), ensure_ascii=False, indent=1)
print(len(S), 'láminas')
