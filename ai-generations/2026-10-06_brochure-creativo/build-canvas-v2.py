# Brochure · Agencia Creativa v2 en el canvas: pares desde el motor (PNG) + titulares de decisión armados a mano
# con los tokens de La órbita (ground #001a33, ink, ink-soft, accent-brand). Uso: python3 build-canvas-v2.py <root> <canvas.json leído>
import json, sys, math, datetime
ROOT, IDX = sys.argv[1], sys.argv[2]
BL = lambda i: f'/_blob/{i}'
PNG = {"A01-portada": "737886447dec253149c28a72508abbdb", "A05-equipo": "2f13923f4d6593c5e7a33a7aed163c41",
       "A09-sprint": "549fca5e2991e6fbc2ad2ec528692922", "A10-control": "5cbceb0d1c9af2f91db4cfb14b299014",
       "A15-siguiente": "3da123050fc4e7dc1585eb0fbb3e1f0e", "A16-contraportada": "21c038b003e51a3c1d03c8def359cd72"}
P = {"CR2b": "bc1e48c37b35623155baa76d2a3eec0c", "HW1": "95e465738c26b68ddc531b6d645141a0", "T1": "7f2f10fc6a432b216865e1ecfc19b45e",
     "T2": "8c12078f76f6ebb111a7e27f70a51755", "T3": "33e05f4e23fd82cf740f12a3ee627085", "H1b": "91feb5acd0d1d878e6213d6f31dcb763",
     "L1": "19326968ce6c4e2579e4a71debaff6c9"}
I = {"rayo": "69bc08d6e56a018fb6e1069e4625a3a2", "bombillo": "0f21063d473812ae6a755710a8d2f340", "galeria": "fc351bcb27f0969cd8dbb347a11b53fc",
     "varita": "ada751f0ca6f382c4ac8e19004be2fc1", "paleta": "ef70d571ba27a0e85f3996baa684655b", "pincel": "0651a751547895325525593bf8068d54",
     "megafono": "83c49403d47cdd655660d5fb4b569a54", "like": "227c39276e634d8fb74abd1d0360786d", "pelicula": "64fc25954e203f75ae48935eaafe8a75",
     "camara": "ae80173a44c77f91fcaf568ee2c9687e"}
BUB, BUB_PAPER = "ebf538ba4f439fe2549aeacc0b9634bf", "743348326143ecadc9c15033ffc0157d"
GRID, SKY_NAVY, SKY_DARK = "5f8686e98b33f0b1f5e794caea0b1978", "bfef631f848e0c5db2baf3e95ea973f1", "f95685a9adf8e194b8d5379f193a074f"
SKY = "Fuente: caso publicado de Sky Airlines, métricas de entrega de 12 meses."
DARK = dict(bg="#001a33", ink="#ffffff", soft="#cfe4fa", acc="#ff6500", bub=BUB)
PAPER = dict(bg="#f7f8f6", ink="#023c70", soft="#6d6777", acc="#bb1954", bub=BUB_PAPER)
ID = "'Bricolage Grotesque', system-ui, sans-serif"; ST = "'Poppins', system-ui, sans-serif"
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap" rel="stylesheet">'

def page(title, body, t=DARK, fonts=True):
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
{FONTS if fonts else ''}
<style>
body{{margin:0;background:{t['bg']}}}
</style>
</helmet>
<div style="position: relative; width: 1920px; height: 1080px; overflow: hidden; background: {t['bg']}; color: {t['ink']}">
{body}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1920,"height":1080}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
'''
def eyebrow(text, t, extra=''):
    return f'<div style="font-family: {ST}; font-size: 18px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: {t["ink"]}{extra}">{text}</div>'
def sphere(t):
    return f'<span style="display: inline-block; width: 0.2em; height: 0.2em; border-radius: 50%; background: {t["acc"]}; margin-left: 0.04em"></span>'
def headline(lines, px, t, extra='', dot=True):
    html = '<br>'.join(lines)
    return f'<div style="font-family: {ID}; font-size: {px}px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.92; color: {t["ink"]}{extra}">{html}{sphere(t) if dot else ""}</div>'
def body(text, t, px=26, width=560, extra=''):
    return f'<div style="font-family: {ST}; font-size: {px}px; font-weight: 300; line-height: 1.45; color: {t["ink"]}; max-width: {width}px{extra}">{text}</div>'
def bubble(t):
    return f'<img src="{BL(t["bub"])}" alt="efeoncepro.com" style="position: absolute; left: 135px; top: 990px; width: 162px; height: 38px">'
def photo(pid, alt, style):
    return f'<img src="{BL(P[pid])}" alt="{alt}" style="position: absolute; object-fit: cover; {style}">'
def col(inner, top=120, width=760):
    return f'<div style="position: absolute; left: 140px; top: {top}px; width: {width}px; display: flex; flex-direction: column">{inner}</div>'

S = {}
# 02 · La promesa (titular)
S['A02-promesa'] = ("Tu equipo dirige. Nosotros producimos.", page("Tu equipo dirige. Nosotros producimos.",
  photo('CR2b', 'Una directora creativa de Efeonce con hoodie dirige con las manos una órbita de pantallas flotantes con piezas de social, video y campañas', 'left: 0; top: 0; width: 1920px; height: 1080px') +
  col(eyebrow('Agencia Creativa', DARK) +
      headline(['Tu equipo', 'dirige.', 'Nosotros', 'producimos'], 104, DARK, '; margin-top: 70px') +
      body('Social, campañas, video, motion y creatividad para performance, a la escala que tu marca necesita. Y lo ves todo.', DARK, 26, 600, '; margin-top: 44px') +
      f'<div style="margin-top: 40px; font-family: {ST}; font-size: 19px; font-weight: 600; color: #ffffff">Sky: +2.000 piezas aprobadas en 12 meses</div>') + bubble(DARK)))

# 03 · Las cuatro rutas (titular)
RUTAS = [("rayo", "Creative Velocity", "Para equipos in-house saturados, con picos de demanda, muchos formatos o presión de lanzamiento.", "Creative Velocity Diagnostic"),
         ("bombillo", "Brand &amp; Campaign Systems", "Para marcas que necesitan claridad, diferenciación, un sistema de identidad o una plataforma creativa.", "Brand Diagnostic"),
         ("galeria", "Content Production System", "Para producir más volumen y variedad sin fragmentar estrategia, marca, aprobación ni medición.", "Content Supply Chain Diagnostic"),
         ("varita", "AI Creative Operations", "Para adoptar IA generativa con memoria, revisión humana, procedencia y control de costo.", "AI Creative Operations Diagnostic")]
def ruta(ic, name, desc, diag):
    return f'''<div style="display: flex; flex-direction: column; gap: 14px; padding-top: 26px; border-top: 1px solid rgba(114, 222, 216, 0.16)">
<img src="{BL(I[ic])}" alt="" style="width: 116px; height: 116px; margin: -6px 0 2px -10px">
<div style="font-family: {ID}; font-size: 38px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.02; color: #ffffff">{name}</div>
<div style="font-family: {ST}; font-size: 20px; font-weight: 300; line-height: 1.45; color: #cfe4fa">{desc}</div>
<div style="margin-top: 6px; font-family: {ST}; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">Empieza con</div>
<div style="font-family: {ST}; font-size: 18px; font-weight: 500; color: #ffffff">{diag}</div>
</div>'''
S['A03-rutas'] = ("Partimos por lo que te frena.", page("Partimos por lo que te frena.",
  col(eyebrow('Qué resolvemos', DARK) + headline(['Partimos por lo', 'que te frena'], 120, DARK, '; margin-top: 60px'), 120, 1200) +
  f'<div style="position: absolute; left: 1380px; top: 300px; width: 400px">{body("Cuatro rutas, según el problema. Cada una empieza con un diagnóstico y crece por fases.", DARK, 24, 400)}</div>' +
  '<div style="position: absolute; left: 140px; top: 520px; width: 1640px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 56px">' +
  ''.join(ruta(*r) for r in RUTAS) + '</div>' + bubble(DARK)))

# 04 · Seis capacidades (titular)
CAPS = [("paleta", "Squad creativo", "Managed Creative Capacity", "Capacidad recurrente y priorizada, con responsabilidad de entrega."),
        ("pincel", "Brand systems", "Estrategia e identidad", "Posicionamiento, identidad verbal y visual, y un sistema de marca que se usa."),
        ("megafono", "Campañas", "Plataforma creativa", "Idea, key visual, mensajes y toolkit multicanal, con sus adaptaciones."),
        ("like", "Contenido y social", "Content &amp; Social Ops", "Pilares, calendario, producción, publicación, comunidad y reporte."),
        ("pelicula", "Audiovisual", "Video, motion y audio", "Producción, edición, motion, audio y finishing para cada formato."),
        ("camara", "Run &amp; Gun", "Captura ágil", "Entrevistas, b-roll, reels y testimonios en una jornada con crew.")]
def cap(ic, title, label, desc):
    return f'''<div style="display: flex; flex-direction: column; gap: 12px; padding-top: 24px; border-top: 1px solid rgba(114, 222, 216, 0.16)">
<img src="{BL(I[ic])}" alt="" style="width: 112px; height: 112px; margin: -6px 0 2px -10px">
<div style="font-family: {ST}; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">{label}</div>
<div style="font-family: {ID}; font-size: 36px; font-weight: 740; letter-spacing: -0.02em; line-height: 1; color: #ffffff">{title}</div>
<div style="font-family: {ST}; font-size: 19px; font-weight: 300; line-height: 1.45; color: #cfe4fa">{desc}</div>
</div>'''
S['A04-capacidades'] = ("Seis capacidades, un solo equipo.", page("Seis capacidades, un solo equipo.",
  col(eyebrow('Qué hacemos', DARK) + headline(['Seis', 'capacidades,', 'un solo', 'equipo'], 96, DARK, '; margin-top: 70px') +
      body('Estrategia, craft y producción en un mismo squad, con <b style="font-weight: 600">un</b> solo interlocutor.', DARK, 24, 520, '; margin-top: 40px') +
      f'''<div style="margin-top: 70px; display: flex; flex-direction: column; gap: 12px">
<div style="font-family: {ST}; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">Cómo crece la relación</div>
<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-family: {ST}; font-size: 21px; font-weight: 500; color: #ffffff"><span>Diagnóstico</span><span style="color: #cfe4fa">→</span><span>Instalar</span><span style="color: #cfe4fa">→</span><span>Operar</span><span style="color: #cfe4fa">→</span><span>Expandir</span></div>
</div>''', 120, 600) +
  '<div style="position: absolute; left: 840px; top: 190px; width: 940px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 44px; row-gap: 48px">' +
  ''.join(cap(*c) for c in CAPS) + '</div>' + bubble(DARK)))

# 06 · Personas y agentes (titular)
S['A06-hibrido'] = ("Personas y agentes, sobre la misma pieza.", page("Personas y agentes, sobre la misma pieza.",
  photo('HW1', 'Una estratega de Efeonce con polo y lanyard señala el gráfico en un monitor grande mientras un agente trabaja las imágenes de la misma pieza', 'left: 0; top: 0; width: 1920px; height: 1080px') +
  col(eyebrow('Personas y agentes', DARK) + headline(['Personas', 'y agentes, sobre', 'la misma pieza'], 92, DARK, '; margin-top: 150px') +
      body('Al mismo tiempo. El agente suma capacidad; la persona dirige, decide y responde por tu marca.', DARK, 26, 560, '; margin-top: 44px'), 120, 760) + bubble(DARK)))

# 07 · Escucha. Crea. Mide. (tríptico, una palabra con su esfera por toma)
def panel(pid, word, alt, left):
    return (f'<div style="position: absolute; left: {left}px; top: 0; width: 636px; height: 1080px; overflow: hidden">'
            f'<img src="{BL(P[pid])}" alt="{alt}" style="width: 636px; height: 1080px; object-fit: cover; display: block">'
            f'<div style="position: absolute; left: 44px; bottom: 56px">{headline([word], 112, DARK)}</div></div>')
S['A07-triptico'] = ("Escucha. Crea. Mide.", page("Escucha. Crea. Mide.",
  panel('T1', 'Escucha', 'Una estratega de Efeonce toma notas mientras un panadero le explica su oficio frente al horno', 0) +
  panel('T2', 'Crea', 'Un creativo con el hoodie de Efeonce fija pruebas de fotografía en una pared del estudio', 642) +
  panel('T3', 'Mide', 'Una consultora de Efeonce señala una curva de resultados en la pantalla de la sala del cliente', 1284) +
  f'<div style="position: absolute; left: 44px; top: 56px">{eyebrow("Cómo trabajamos", DARK)}</div>'))

# 08 · Compras capacidad, no horas (titular)
ITEMS = [("Roles y dedicación", "Sabes quién trabaja en tu marca, con qué seniority y cuánta dedicación."),
         ("Base y reactiva", "Una capacidad base para el plan y otra reactiva para lo que no se avisa."),
         ("Métricas de entrega", "Entregas a tiempo, piezas correctas a la primera y rondas por pieza, a la vista."),
         ("Revisión trimestral", "Cada trimestre revisamos capacidad, resultados y lo que sigue.")]
def item(n, title, desc):
    return f'''<div style="display: flex; gap: 26px; padding-top: 26px; border-top: 1px solid rgba(114, 222, 216, 0.16)">
<div style="font-family: {ST}; font-size: 64px; font-weight: 300; line-height: 1; color: #ff6500">{n:02d}</div>
<div style="display: flex; flex-direction: column; gap: 10px; padding-top: 6px">
<div style="font-family: {ST}; font-size: 26px; font-weight: 600; color: #ffffff">{title}</div>
<div style="font-family: {ST}; font-size: 21px; font-weight: 300; line-height: 1.45; color: #cfe4fa">{desc}</div>
</div></div>'''
S['A08-capacidad'] = ("Compras capacidad, no horas.", page("Compras capacidad, no horas.",
  col(eyebrow('Cómo se compra', DARK) + headline(['Compras capacidad,', 'no horas'], 124, DARK, '; margin-top: 66px'), 120, 1500) +
  '<div style="position: absolute; left: 140px; top: 560px; width: 1640px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 80px; row-gap: 48px">' +
  ''.join(item(i + 1, *x) for i, x in enumerate(ITEMS)) + '</div>' + bubble(DARK)))

# 11 · 88 % a tiempo (titular + órbita que mide)
cx, cy, r = 1390, 540, 330
C = 2 * math.pi * r; ang = math.radians(-90 + 0.88 * 360)
sx, sy = cx + r * math.cos(ang), cy + r * math.sin(ang)
lens = (f'<img src="{BL(P["H1b"])}" alt="Una estratega de Efeonce, con el uniforme del equipo, revisa el tablero de entregas del cliente" '
        f'style="position: absolute; left: {cx-300}px; top: {cy-300}px; width: 600px; height: 600px; border-radius: 50%; object-fit: cover; object-position: 62% 30%">'
        f'<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#72ded8" stroke-opacity="0.16" stroke-width="2"></circle>'
        f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="#ff6500" stroke-width="6" stroke-linecap="round" stroke-dasharray="{0.88*C:.1f} {C:.1f}" transform="rotate(-90 {cx} {cy})"></circle>'
        f'<circle cx="{sx:.1f}" cy="{sy:.1f}" r="14" fill="#ff6500"></circle></svg>')
def fig(v, l, t=DARK, px=64):
    return f'<div style="display: flex; flex-direction: column; gap: 8px"><div style="font-family: {ID}; font-size: {px}px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; color: {t["ink"]}">{v}</div><div style="font-family: {ST}; font-size: 18px; font-weight: 400; color: {t["soft"]}">{l}</div></div>'
S['A11-medicion'] = ("88 % de las entregas, a tiempo.", page("88 % de las entregas, a tiempo.", lens +
  col(eyebrow('Lo medimos', DARK) + headline(['88 %'], 260, DARK, '; margin-top: 90px') +
      f'<div style="margin-top: 22px; font-family: {ID}; font-size: 56px; font-weight: 620; letter-spacing: -0.02em; line-height: 1; color: #cfe4fa">de las entregas, a tiempo</div>' +
      body('Sky, 12 meses. Lo ves en tu portal, no en un informe que llega tarde.', DARK, 24, 560, '; margin-top: 30px') +
      f'<div style="margin-top: 56px; display: flex; gap: 80px">{fig("0,12", "ajustes por pieza")}{fig("39", "campañas")}</div>' +
      f'<div style="margin-top: 40px; font-family: {ST}; font-size: 15px; font-weight: 400; color: #cfe4fa">{SKY}</div>', 120, 800) + bubble(DARK)))

# 12 · Caso Sky (papel)
S['A12-caso-sky'] = ("25 % menos de tiempo de producción.", page("25 % menos de tiempo de producción.",
  photo('L1', 'Un creativo de Efeonce revisa con lupa y marca con lápiz rojo las pruebas impresas de una campaña sobre la mesa de luz', 'left: 760px; top: 0; width: 1160px; height: 1080px; object-position: 60% 50%') +
  f'<div style="position: absolute; left: 0; top: 0; width: 1000px; height: 1080px; background: #f7f8f6; border-top-right-radius: 320px"></div>' +
  col(f'<div style="display: flex; align-items: center; gap: 22px"><img src="{BL(SKY_NAVY)}" alt="Sky Airline" style="width: 168px; height: 62px"><span style="font-family: {ST}; font-size: 15px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #6d6777">Caso · 12 meses</span></div>' +
      headline(['25 % menos de', 'tiempo de', 'producción'], 92, PAPER, '; margin-top: 60px') +
      '<div style="margin-top: 70px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 60px; row-gap: 40px; width: 640px">' +
      fig('+2.000', 'piezas aprobadas', PAPER, 72) + fig('39', 'campañas', PAPER, 72) + fig('88 %', 'entregas a tiempo', PAPER, 72) + fig('5', 'mercados', PAPER, 72) + '</div>' +
      f'<div style="margin-top: 44px; font-family: {ST}; font-size: 15px; font-weight: 400; color: #6d6777">{SKY}</div>', 110, 780) + bubble(PAPER), PAPER))

# 13 · Testimonio (titular = la cita)
def rfig(v, l, acc=False):
    c = '#ff6500' if acc else '#ffffff'
    return f'<div style="display: flex; flex-direction: column; gap: 8px; padding-bottom: 26px; border-bottom: 1px solid rgba(114, 222, 216, 0.16)"><div style="font-family: {ID}; font-size: 64px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; color: {c}">{v}</div><div style="font-family: {ST}; font-size: 18px; font-weight: 400; color: #cfe4fa">{l}</div></div>'
S['A13-testimonio'] = ("«Agilizar mucho la carga de trabajo.»", page("«Agilizar mucho la carga de trabajo.»",
  col(eyebrow('En palabras de Sky', DARK) +
      f'<div style="margin-top: 110px; font-family: {ID}; font-size: 104px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.95; color: #ffffff"><span style="color: #ff6500">«</span>Agilizar mucho<br>la carga de trabajo<span style="color: #ff6500">»</span></div>' +
      body('«Hemos mejorado muchísimo en cuanto a las herramientas tecnológicas. Siento que hemos podido, gracias a ellos, agilizar mucho la carga de trabajo.»', DARK, 26, 980, '; margin-top: 54px') +
      f'<div style="margin-top: 54px; display: flex; align-items: center; gap: 28px"><img src="{BL(SKY_DARK)}" alt="Sky Airline" style="width: 140px; height: 54px"><div style="display: flex; flex-direction: column; gap: 4px"><span style="font-family: {ST}; font-size: 21px; font-weight: 600; color: #ffffff">Adriana Contreras</span><span style="font-family: {ST}; font-size: 17px; font-weight: 400; color: #cfe4fa">Team SKY</span></div></div>', 120, 1180) +
  f'<div style="position: absolute; left: 1440px; top: 300px; width: 340px; display: flex; flex-direction: column; gap: 30px">{rfig("+2.000", "piezas aprobadas")}{rfig("88 %", "entregadas a tiempo")}{rfig("−25 %", "tiempo de producción", True)}'
  f'<div style="font-family: {ST}; font-size: 14px; font-weight: 400; line-height: 1.5; color: #cfe4fa">{SKY}</div></div>' + bubble(DARK)))

# 14 · Clientes (papel)
S['A14-clientes'] = ("Marcas que ya trabajan con nosotros.", page("Marcas que ya trabajan con nosotros.",
  col(eyebrow('Clientes', PAPER) + headline(['Marcas que ya trabajan', 'con nosotros'], 108, PAPER, '; margin-top: 66px'), 120, 1600) +
  f'<img src="{BL(GRID)}" alt="Logos de clientes: Sky, Berel, Bresler, Carozzi, Aguas Andinas, ANAM, Marca Chile, Gobierno de Santiago y Universidad Católica de Temuco; operamos en Chile, EE. UU., Colombia, México y Perú" style="position: absolute; left: 110px; top: 560px; width: 1700px; height: 380px">' +
  bubble(PAPER), PAPER))

def image_slide(title, blob):
    return page(title, f'<img src="{BL(blob)}" alt="{title}" style="display: block; width: 1920px; height: 1080px">', DARK, False)
ORDER = [("A01-portada", "Portada · ¿Mi equipo puede producir más? Mucho más.", 'png'),
         ("A02-promesa", None, 'hand'), ("A03-rutas", None, 'hand'), ("A04-capacidades", None, 'hand'),
         ("A05-equipo", "¿Quién trabaja en mi marca? Personas reales.", 'png'),
         ("A06-hibrido", None, 'hand'), ("A07-triptico", None, 'hand'), ("A08-capacidad", None, 'hand'),
         ("A09-sprint", "¿Y si no me convence? Empiezas chico.", 'png'), ("A10-control", "¿Pierdo el control de mi marca? Nunca.", 'png'),
         ("A11-medicion", None, 'hand'), ("A12-caso-sky", None, 'hand'), ("A13-testimonio", None, 'hand'), ("A14-clientes", None, 'hand'),
         ("A15-siguiente", "¿Qué recibo primero? Un plan.", 'png'), ("A16-contraportada", "Contraportada · ¿Conversamos? Cuando quieras.", 'png')]
idx = json.load(open(IDX, encoding='utf-8'))
for f, b in idx['boards'].items():
    b['page'] = 'v1'
for n in idx['notes'].values():
    n['page'] = 'v1'
idx['pages'] = [{"id": "v2", "name": "Agencia Creativa"}, {"id": "v1", "name": "v1 · Servicios Creativos"}]
idx['launch'] = {"view": "canvas", "page": "v2"}
idx['title'] = "Brochure Agencia Creativa"
idx['notes']['t2'] = {"x": 0, "y": -300, "text": "Brochure · Agencia Creativa — 16 láminas", "kind": "title1", "maxW": 7920, "page": "v2"}
written = []
for i, (key, title, kind) in enumerate(ORDER):
    f = f'{key}.dc.html'
    t = title or S[key][0]
    kindtag = '' if kind == 'png' else ' · titular'
    idx['boards'][f] = {"x": (i % 4) * 2000, "y": (i // 4) * 1200, "w": 1920, "h": 1080, "title": f'{i+1:02d} · {t}', "page": "v2"}
    if f not in idx['order']: idx['order'].append(f)
    html = image_slide(t, PNG[key]) if kind == 'png' else S[key][1]
    open(f'{ROOT}/project/{f}', 'w', encoding='utf-8').write(html); written.append(f)
json.dump(idx, open(f'{ROOT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({f"project/{w}": f"project/{w}" for w in written}))
