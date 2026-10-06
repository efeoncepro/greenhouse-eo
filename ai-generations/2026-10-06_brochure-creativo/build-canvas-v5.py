# Brochure · Agencia Creativa v3 (capítulo Creative Velocity, operador 2026-10-06) en el canvas: pares desde el motor (PNG) + titulares de decisión armados a mano
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


# ── Capítulo Creative Velocity (v3): tres láminas cine con titular de decisión ──
CV = json.load(open('cv-blobs.json'))
def cvphoto(key, alt):
    return f'<img src="{BL(CV[key])}" alt="{alt}" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover">'
def seal(label, text):
    return f'<div style="display: flex; flex-direction: column; gap: 6px"><div style="font-family: {ST}; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">{label}</div><div style="font-family: {ST}; font-size: 19px; font-weight: 500; color: #ffffff">{text}</div></div>'
# CV1 derivó hacia el centro (falla 32): la foto se corre 150 px a la derecha y su borde se funde con el negro de la
# propia foto (#020206), sin velo sobre las personas.
B1T = dict(DARK, bg='#020206')
S['B1-escala'] = ("El mismo equipo. Otra escala.", page("El mismo equipo. Otra escala.",
  f'<img src="{BL(CV["CV1"])}" alt="Nexa, Karo y Julio, con el hoodie de Efeonce, en diagonal hacia el fondo del estudio; una sola pieza de luz junto a Nexa se multiplica en una cinta de cientos de piezas con el mismo sistema que se aleja hacia la profundidad" style="position: absolute; left: 150px; top: 0; width: 1920px; height: 1080px; object-fit: cover; -webkit-mask-image: linear-gradient(to right, transparent 0, #000 180px); mask-image: linear-gradient(to right, transparent 0, #000 180px)">' +
  col(eyebrow('Creative Velocity', DARK) + headline(['El mismo', 'equipo.', 'Otra escala'], 96, DARK, '; margin-top: 64px') +
      body('Aumentamos la capacidad de tu equipo de marketing con tecnología, personas y procesos probados, gobernados y medidos, sin perder consistencia de marca y acelerando el time-to-market.', DARK, 22, 520, '; margin-top: 36px') +
      f'<div style="margin-top: 44px; display: flex; gap: 36px">{seal("Probado", "en Sky, 12 meses")}{seal("Gobernado", "apruebas tú")}{seal("Medido", "en tu portal")}</div>', 120, 540) + bubble(DARK), B1T))
def speed(label, text):
    return f'<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 18px; border-top: 1px solid rgba(114, 222, 216, 0.16)"><div style="font-family: {ST}; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">{label}</div><div style="font-family: {ST}; font-size: 19px; font-weight: 400; color: #ffffff">{text}</div></div>'
S['B2-formatos'] = ("Una campaña. 50 piezas. Una sola marca.", page("Una campaña. 50 piezas. Una sola marca.",
  cvphoto('CV2', 'Karo, directora de arte con el hoodie de Efeonce, sostiene la pieza madre en su tablet frente a un muro de unas cincuenta piezas de una misma campaña en todos sus formatos; las últimas llegan como estelas de luz') +
  col(eyebrow('Creative Velocity · producción modular', DARK) + headline(['Una campaña.', '50 piezas.', 'Una sola marca'], 104, DARK, '; margin-top: 64px') +
      body('Diseñamos el sistema una vez —módulos, reglas y plantillas— y configuramos cada formato con la misma marca. La consistencia no depende de quién haga la pieza.', DARK, 24, 620, '; margin-top: 40px') +
      f'<div style="margin-top: 44px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 40px; width: 620px">{speed("Velocidad de producción", "Más formatos, menos espera.")}{speed("Velocidad de decisión", "Priorizar y aprender en cada ciclo.")}</div>' +
      f'<div style="margin-top: 36px; font-family: {ST}; font-size: 15px; font-weight: 400; color: #cfe4fa">Promedio de Sky: +2.000 piezas aprobadas en 39 campañas, en 12 meses. Caso publicado.</div>', 120, 720) + bubble(DARK)))
rcx, rcy, rr = 380, 720, 210
RC = 2 * math.pi * rr; rang = math.radians(-90 + 0.75 * 360)
rsx, rsy = rcx + rr * math.cos(rang), rcy + rr * math.sin(rang)
ring = (f'<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
        f'<circle cx="{rcx}" cy="{rcy}" r="{rr}" fill="none" stroke="#72ded8" stroke-opacity="0.22" stroke-width="2"></circle>'
        f'<circle cx="{rcx}" cy="{rcy}" r="{rr}" fill="none" stroke="#ff6500" stroke-width="6" stroke-linecap="round" stroke-dasharray="{0.75*RC:.1f} {RC:.1f}" transform="rotate(-90 {rcx} {rcy})"></circle>'
        f'<circle cx="{rsx:.1f}" cy="{rsy:.1f}" r="13" fill="#ff6500"></circle></svg>'
        f'<div style="position: absolute; left: {rcx-180}px; top: {rcy-80}px; width: 360px; display: flex; flex-direction: column; align-items: center; gap: 8px">'
        f'<div style="font-family: {ID}; font-size: 128px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.9; color: #ffffff">−25 %</div>'
        f'<div style="font-family: {ST}; font-size: 18px; font-weight: 400; color: #cfe4fa">tiempo de producción</div></div>')
S['B3-tiempo'] = ("Menos tiempo. La misma marca.", page("Menos tiempo. La misma marca.",
  cvphoto('CV3', 'Larga exposición en un estudio de producción: Nexa, con el hoodie de Efeonce, queda quieta y nítida junto a una pieza terminada mientras el equipo y decenas de versiones de la misma campaña pasan como estelas de luz') + ring +
  col(eyebrow('Creative Velocity · time-to-market', DARK) + headline(['Menos tiempo.', 'La misma marca'], 104, DARK, '; margin-top: 64px'), 120, 800) +
  f'<div style="position: absolute; left: 660px; top: 600px; width: 260px; display: flex; flex-direction: column; gap: 34px">{fig("0,12", "ajustes por pieza")}{fig("88 %", "entregas a tiempo")}'
  f'<div style="font-family: {ST}; font-size: 14px; font-weight: 400; line-height: 1.5; color: #cfe4fa">Caso publicado de Sky Airlines, métricas de entrega de 12 meses. El anillo es el tiempo de antes; el arco, el de ahora.</div></div>' + bubble(DARK)))

# ── Capítulo Brand Systems (v4, operador 2026-10-06): cine + órbita monumental + muro de La órbita ──
BSB = {"BS1": "0a8fe5472a5056cf1d1f7f3890341284", "MURO": "b0a82a12f14470b1b1ebfceb8a7a62ea",
       "encuadre": "482809ce29f3ffb82530ab89f36d8a80", "pluma": "a0b74ebd7b515d91c84c677aad468c22", "cuentagotas": "37e353c31212bb86708f72c698c4dd81",
       "escuadra": "0f41919f952da1f2e526bbc053de3c0a", "biblioteca": "5562bd3322807ca081c9b3d28a8c9ed4"}
S['B4-manual'] = ("Del manual al sistema.", page("Del manual al sistema.",
  f'<img src="{BL(BSB["BS1"])}" alt="Karo, directora de arte con el hoodie de Efeonce, abre un manual de marca y mira cómo desde sus páginas se levanta la identidad de una marca como un sistema de luz: marca, paleta, tipografía, grilla y las primeras piezas" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover">' +
  col(eyebrow('Brand Systems', DARK) + headline(['Del manual', 'al sistema'], 124, DARK, '; margin-top: 70px') +
      body('Posicionamiento, identidad verbal y visual, y las reglas para aplicarla, convertidos en un sistema que tu equipo usa todos los días.', DARK, 24, 600, '; margin-top: 44px') +
      f'<div style="margin-top: 48px; display: flex; flex-direction: column; gap: 6px"><div style="font-family: {ST}; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">Empieza con</div><div style="font-family: {ST}; font-size: 20px; font-weight: 500; color: #ffffff">Brand Diagnostic</div></div>', 120, 720) + bubble(DARK)))

MODS = [("encuadre", "Posicionamiento", "qué es tu marca y por qué la eligen"),
        ("pluma", "Identidad verbal", "voz, mensajes y tono"),
        ("cuentagotas", "Identidad visual", "logo, color, tipo, foto e íconos"),
        ("escuadra", "Sistema y plantillas", "cada formato, listo para producir"),
        ("biblioteca", "Governance", "quién aprueba qué, y tu equipo entrenado")]
ocx, ocy, orr = 1150, 560, 330
sat = ''
for k, (ic, name, desc) in enumerate(MODS):
    a = math.radians(-64 + k * 32)
    x, y = ocx + orr * math.cos(a), ocy + orr * math.sin(a)
    sat += f'<img src="{BL(BSB[ic])}" alt="" style="position: absolute; left: {x-78:.0f}px; top: {y-78:.0f}px; width: 156px; height: 156px">'
    lx, ly, al = x + 92, y - 36, 'left'
    sat += (f'<div style="position: absolute; left: {lx:.0f}px; top: {ly:.0f}px; width: 300px; text-align: {al}; display: flex; flex-direction: column; gap: 6px">'
            f'<div style="font-family: {ID}; font-size: 34px; font-weight: 740; letter-spacing: -0.02em; line-height: 1; color: #ffffff">{name}</div>'
            f'<div style="font-family: {ST}; font-size: 18px; font-weight: 300; color: #cfe4fa">{desc}</div></div>')
orbit = (f'<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
         f'<circle cx="{ocx}" cy="{ocy}" r="{orr}" fill="none" stroke="#72ded8" stroke-opacity="0.22" stroke-width="2"></circle>'
         f'<circle cx="{ocx}" cy="{ocy}" r="{orr-110}" fill="none" stroke="#72ded8" stroke-opacity="0.10" stroke-width="1"></circle></svg>'
         f'<div style="position: absolute; left: {ocx-160}px; top: {ocy-40}px; width: 320px; text-align: center; font-family: {ID}; font-size: 64px; font-weight: 760; letter-spacing: -0.035em; line-height: 1; color: #ffffff">Tu marca</div>')
S['B5-sistema'] = ("La aplica cualquiera. Sale igual.", page("La aplica cualquiera. Sale igual.",
  orbit + sat +
  col(eyebrow('Brand Systems · qué incluye', DARK) + headline(['La aplica', 'cualquiera.', 'Sale igual'], 104, DARK, '; margin-top: 70px') +
      body('Plantillas, reglas y criterios de aprobación: tu marca se aplica igual, la haga quien la haga.', DARK, 24, 520, '; margin-top: 44px') +
      f'<div style="margin-top: 60px; display: flex; flex-direction: column; gap: 12px"><div style="font-family: {ST}; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">Cómo avanza</div>'
      f'<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; font-family: {ST}; font-size: 20px; font-weight: 500; color: #ffffff"><span>Brand Diagnostic</span><span style="color: #cfe4fa">→</span><span>Brand System</span><span style="color: #cfe4fa">→</span><span>Campaña</span><span style="color: #cfe4fa">→</span><span>Despliegue</span></div></div>', 120, 600) +
  bubble(DARK)))

def bfig(v, l):
    return f'<div style="display: flex; flex-direction: column; gap: 8px"><div style="font-family: {ID}; font-size: 72px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; color: #ffffff">{v}</div><div style="font-family: {ST}; font-size: 18px; font-weight: 400; line-height: 1.35; color: #cfe4fa">{l}</div></div>'
def bget(t, d):
    return f'<div style="display: flex; flex-direction: column; gap: 8px; padding-top: 16px; border-top: 1px solid rgba(114, 222, 216, 0.22)"><div style="font-family: {ID}; font-size: 34px; font-weight: 740; letter-spacing: -0.02em; line-height: 1; color: #ffffff">{t}</div><div style="font-family: {ST}; font-size: 18px; font-weight: 300; line-height: 1.4; color: #cfe4fa">{d}</div></div>'
S['B6-prueba'] = ("Este brochure es la prueba.", page("Este brochure es la prueba.",
  # Comentario del operador (2026-10-06): el muro en CSS 3D tapaba el texto. Ahora es una foto: las piezas reales se
  # componen determinísticas en el muro y el modelo sólo puso piso, reflejo y luz (fotos/muro/, MU1b).
  f'<img src="{BL("863cf51de22fe003405a81251138c9e9")}" alt="Un muro LED monumental en un estudio oscuro muestra 35 piezas reales de La órbita, la línea gráfica de Efeonce: portadas, propuestas, secciones, el uniforme bordado, la nave y el logo en 3D; su luz se refleja en el piso" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover">' +
  col(eyebrow('Brand Systems · la prueba', DARK) + headline(['Este brochure', 'es la prueba'], 100, DARK, '; margin-top: 70px') +
      body('Lo que hacemos por tu marca, lo hicimos primero con la nuestra: identidad, voz, composición, fotografía y reglas que revisan cada pieza antes de salir.', DARK, 22, 560, '; margin-top: 40px') +
      # Comentario del operador (2026-10-06): «69 láminas · 10 kits · 5 líneas» no le dice nada al cliente. Va lo que recibe su marca.
      f'<div style="margin-top: 52px; display: flex; flex-direction: column; gap: 10px"><div style="font-family: {ST}; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">Lo mismo, para tu marca</div>'
      f'<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 32px; width: 700px">{bget("Identidad", "logo, color, tipografía y foto, con sus reglas")}{bget("Plantillas", "cada formato, listo para producir")}{bget("Aprobación", "reglas que revisan cada pieza antes de salir")}</div></div>', 120, 720) +
  bubble(DARK)))

# ── Capítulo Producción (v5, operador 2026-10-06): estudio portátil, set híbrido y flujo de herramientas ──
PRB = {"prompt": "a1fa09eb62dfff712564171a794413f2", "camara": "ae80173a44c77f91fcaf568ee2c9687e", "galeria": "fc351bcb27f0969cd8dbb347a11b53fc",
       "pelicula": "64fc25954e203f75ae48935eaafe8a75", "spark": "142e771dabdb51d0ac0daf18f4c38f5e", "guardar": "fb5c78c3c4bc6c55954e659389132ea4",
       "mano": "7305b16b9f5fc30cd18addcfe5d77153"}
PRB.update(json.load(open('produccion-blobs.json')) if __import__('os').path.exists('produccion-blobs.json') else {})
STAGES = [("prompt", "Idea y guion", ["Claude", "ChatGPT"]),
          ("camara", "Captura", ["Run &amp; Gun", "Cine digital"]),
          ("galeria", "Imagen", ["GPT Image", "Seedream", "Flux", "Magnific"]),
          ("pelicula", "Video y motion", ["Seedance", "Kling", "Gemini", "Higgsfield"]),
          ("spark", "Agentes", ["Nexa", "Sparks"]),
          ("guardar", "Gobierno", ["Efeonce Globe", "Memoria de marca", "Derechos y procedencia"]),
          ("mano", "Aprobación", ["Siempre humana"])]
def chip(t, strong=False):
    c = '#ffffff' if strong else '#cfe4fa'
    return f'<span style="display: inline-block; padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(114, 222, 216, 0.28); font-family: {ST}; font-size: 16px; font-weight: 500; color: {c}">{t}</span>'
def stage(n, ic, name, tools):
    last = n == len(STAGES)
    tl = ''.join(chip(t, last) for t in tools)
    return (f'<div style="display: flex; flex-direction: column; gap: 14px">'
            f'<img src="{BL(PRB[ic])}" alt="" style="width: 150px; height: 150px; margin-left: -12px">'
            f'<div style="font-family: {ST}; font-size: 14px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">{n:02d}</div>'
            f'<div style="font-family: {ID}; font-size: 30px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.02; color: #ffffff">{name}</div>'
            f'<div style="display: flex; flex-wrap: wrap; gap: 8px">{tl}</div></div>')
def svc(label, text):
    return f'<div style="display: flex; flex-direction: column; gap: 6px; padding-top: 16px; border-top: 1px solid rgba(114, 222, 216, 0.22)"><div style="font-family: {ID}; font-size: 30px; font-weight: 740; letter-spacing: -0.02em; line-height: 1; color: #ffffff">{label}</div><div style="font-family: {ST}; font-size: 18px; font-weight: 300; line-height: 1.4; color: #cfe4fa">{text}</div></div>'
S['P1-estudio'] = ("El estudio va donde estés.", page("El estudio va donde estés.",
  f'<img src="{BL(PRB["RG1"])}" alt="Karo, directora con el hoodie de Efeonce, filma en movimiento con una cámara de cine en gimbal mientras un sonidista la sigue con el boom, dentro de un estudio portátil armado en una bodega oscura: panel LED, tubos de luz, silla de entrevista y road cases abiertos" style="position: absolute; left: 0; top: 0; width: 1920px; height: 1080px; object-fit: cover">' +
  col(eyebrow('Run &amp; Gun · contenido y social', DARK) + headline(['El estudio', 'va donde', 'estés'], 112, DARK, '; margin-top: 64px') +
      body('Crew, cámaras de cine, sonido e iluminación profesionales que arman un set completo en tu oficina, tu planta, tu tienda o en terreno. De una entrevista a una campaña.', DARK, 22, 540, '; margin-top: 40px') +
      f'<div style="margin-top: 44px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 36px; width: 600px">{svc("Run &amp; Gun", "lo capturamos en una jornada, con equipo actual")}{svc("Contenido y social", "lo planificamos, publicamos y medimos")}</div>', 120, 680) + bubble(DARK)))
# HB1 derivó hacia el centro: la foto se corre 150 px y su borde se funde con su propio negro (#060910), sin velo.
HBT = dict(DARK, bg='#060910')
S['P2-hibrido'] = ("Manos y modelos, en el mismo set.", page("Manos y modelos, en el mismo set.",
  f'<img src="{BL(PRB["HB1"])}" alt="Julio, con el hoodie de Efeonce, filma unos audífonos sobre un pedestal con una cámara de cine; una corriente de luz lleva la toma a una pantalla con cuatro variantes del producto, donde Nexa, con un Spark en el hombro, supervisa" style="position: absolute; left: 150px; top: 0; width: 1920px; height: 1080px; object-fit: cover; -webkit-mask-image: linear-gradient(to right, transparent 0, #000 180px); mask-image: linear-gradient(to right, transparent 0, #000 180px)">' +
  col(eyebrow('Producción híbrida', DARK) + headline(['Manos y', 'modelos, en', 'el mismo set'], 92, DARK, '; margin-top: 64px') +
      body('El oficio y la IA en un mismo flujo: una toma real se convierte en todas sus variantes. Las personas dirigen, aprueban y responden por tu marca.', DARK, 22, 520, '; margin-top: 40px'), 120, 600) + bubble(DARK), HBT))

S['P3-herramientas'] = ("La mejor herramienta para cada paso.", page("La mejor herramienta para cada paso.",
  col(eyebrow('Producción híbrida', DARK) + headline(['La mejor herramienta', 'para cada paso'], 100, DARK, '; margin-top: 64px'), 120, 1100) +
  f'<div style="position: absolute; left: 1240px; top: 250px; width: 540px">{body("Elegimos el modelo por la tarea, no por moda. Personas, agentes y modelos en un mismo flujo, y ninguna pieza sale sin aprobación humana.", DARK, 24, 540)}</div>' +
  '<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0" aria-hidden="true"><line x1="200" y1="560" x2="1700" y2="560" stroke="#72ded8" stroke-opacity="0.22" stroke-width="2"></line></svg>' +
  '<div style="position: absolute; left: 140px; top: 485px; width: 1640px; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); column-gap: 24px">' +
  ''.join(stage(i + 1, *x) for i, x in enumerate(STAGES)) + '</div>' + bubble(DARK)))

def image_slide(title, blob):
    return page(title, f'<img src="{BL(blob)}" alt="{title}" style="display: block; width: 1920px; height: 1080px">', DARK, False)
ORDER = [("A01-portada", "Portada · ¿Mi equipo puede producir más? Mucho más.", 'png'), ("A02-promesa", None, 'hand'),
         ("B1-escala", None, 'hand'), ("B2-formatos", None, 'hand'), ("B3-tiempo", None, 'hand'), ("B4-manual", None, 'hand'), ("B5-sistema", None, 'hand'), ("B6-prueba", None, 'hand'),
         ("A03-rutas", None, 'hand'), ("A04-capacidades", None, 'hand'), ("P1-estudio", None, 'hand'), ("P2-hibrido", None, 'hand'), ("P3-herramientas", None, 'hand'),
         ("A05-equipo", "¿Quién trabaja en mi marca? Personas reales.", 'png'), ("A07-triptico", None, 'hand'),
         ("A08-capacidad", None, 'hand'), ("A09-sprint", "¿Y si no me convence? Empiezas chico.", 'png'),
         ("A10-control", "¿Pierdo el control de mi marca? Nunca.", 'png'), ("A12-caso-sky", None, 'hand'), ("A13-testimonio", None, 'hand'),
         ("A14-clientes", None, 'hand'), ("A15-siguiente", "¿Qué recibo primero? Un plan.", 'png'),
         ("A16-contraportada", "Contraportada · ¿Conversamos? Cuando quieras.", 'png')]
idx = json.load(open(IDX, encoding='utf-8'))
idx['boards'].pop('A11-medicion.dc.html', None)
# P2 (set híbrido en cine) reemplaza a A06 «Personas y agentes, sobre la misma pieza» (operador, 2026-10-06).
idx['boards'].pop('A06-hibrido.dc.html', None)
idx['order'] = [o for o in idx['order'] if o != 'A06-hibrido.dc.html']
idx['order'] = [o for o in idx['order'] if o != 'A11-medicion.dc.html']
idx['notes']['t2']['text'] = "Brochure · Agencia Creativa — 23 láminas"
written = []
for i, (key, title, kind) in enumerate(ORDER):
    f = f'{key}.dc.html'
    t = title or S[key][0]
    kindtag = '' if kind == 'png' else ' · titular'
    idx['boards'][f] = {"x": (i % 4) * 2000, "y": (i // 4) * 1200, "w": 1920, "h": 1080, "title": f'{i+1:02d} · {t}', "page": "v2"}
    if f in idx['order']: idx['order'].remove(f)
    idx['order'].append(f)
    html = image_slide(t, PNG[key]) if kind == 'png' else S[key][1]
    open(f'{ROOT}/project/{f}', 'w', encoding='utf-8').write(html); written.append(f)
json.dump(idx, open(f'{ROOT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({f"project/{w}": f"project/{w}" for w in written}))
