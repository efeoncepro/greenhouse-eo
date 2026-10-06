# Brochure · Agencia Creativa v3 (capítulo Creative Velocity, operador 2026-10-06) en el canvas: pares desde el motor (PNG) + titulares de decisión armados a mano
# con los tokens de La órbita (ground #001a33, ink, ink-soft, accent-brand). Uso: python3 build-canvas-v2.py <root> <canvas.json leído>
import json, sys, math, datetime
ROOT, IDX = sys.argv[1], sys.argv[2]
BL = lambda i: f'/_blob/{i}'
PNG = {"A01-portada": "737886447dec253149c28a72508abbdb", "A05-equipo": "2f13923f4d6593c5e7a33a7aed163c41",
       "A09-sprint": "549fca5e2991e6fbc2ad2ec528692922", "A10-control": "5cbceb0d1c9af2f91db4cfb14b299014",
       "A15-siguiente": "3da123050fc4e7dc1585eb0fbb3e1f0e", "A16-contraportada": "21c038b003e51a3c1d03c8def359cd72", "A21-mercados": "5952877b2198ac7fdc3d7819cec14ab9"}
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
  # Comentario del operador (2026-10-06): una foto que evoque a Sky, sin su logo ni su librea (el modelo nunca dibuja la marca del cliente).
  f'<img src="{BL("fa686a24fdb09a1f91400c88ce24e052")}" alt="Desde la ventana de un avión, el ala corta el cielo sobre la cordillera de los Andes al amanecer; en la mesa, una tablet muestra una pieza de campaña" style="position: absolute; object-fit: cover; left: 0; top: 0; width: 1920px; height: 1080px; object-position: 50% 50%">' +  # a sangre: el panel la tapa a la izquierda, sin corte visible (operador)
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
       "mano": "7305b16b9f5fc30cd18addcfe5d77153", "lapiz": "d394004adea977e358334b8f252f5321"}
PRB.update(json.load(open('produccion-blobs.json')) if __import__('os').path.exists('produccion-blobs.json') else {})
STAGES = [("prompt", "Idea y guion", ["Claude", "ChatGPT"]),
          ("camara", "Captura", ["Run &amp; Gun", "Cine digital"]),
          ("galeria", "Imagen", ["GPT Image", "Seedream", "Flux", "Magnific"]),
          ("pelicula", "Video y motion", ["Seedance", "Kling", "Gemini", "Higgsfield"]),
          ("spark", "Agentes", ["Nexa", "Sparks"]),
          ("guardar", "Gobierno", ["Efeonce Globe", "Memoria de marca", "Derechos y procedencia"]),
          ("lapiz", "Aprobación", ["Siempre humana"])]  # operador: la mano se leía mal; el lápiz es el visto bueno
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
HBT = dict(DARK, bg='#060913')
S['P2-hibrido'] = ("Manos y modelos, en el mismo set.", page("Manos y modelos, en el mismo set.",
  f'<img src="{BL(PRB["HB1"])}" alt="Escenario de producción virtual: un muro LED monumental muestra un mundo generado por IA para una campaña de audífonos y su luz ilumina a las personas reales; Antonio, con el hoodie de Efeonce, opera una cámara de cine con un Spark sobre el equipo, y Nexa dirige junto a otro Spark mientras más agentes trabajan al fondo" style="position: absolute; left: 130px; top: 0; width: 1920px; height: 1080px; object-fit: cover; -webkit-mask-image: linear-gradient(to right, transparent 0, #000 160px); mask-image: linear-gradient(to right, transparent 0, #000 160px)">' +
  col(eyebrow('Producción híbrida', DARK) + headline(['Manos y', 'modelos, en', 'el mismo set'], 80, DARK, '; margin-top: 60px') +
      body('Lo que generan los agentes y lo que filman las personas, en la misma toma. Las personas dirigen, aprueban y responden por tu marca.', DARK, 21, 460, '; margin-top: 36px'), 120, 500) + bubble(DARK), HBT))

S['P3-herramientas'] = ("La mejor herramienta para cada paso.", page("La mejor herramienta para cada paso.",
  col(eyebrow('Producción híbrida', DARK) + headline(['La mejor herramienta', 'para cada paso'], 100, DARK, '; margin-top: 64px'), 120, 1100) +
  f'<div style="position: absolute; left: 1240px; top: 250px; width: 540px">{body("Elegimos el modelo por la tarea, no por moda. Personas, agentes y modelos en un mismo flujo, y ninguna pieza sale sin aprobación humana.", DARK, 24, 540)}</div>' +
  '<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0" aria-hidden="true"><line x1="200" y1="560" x2="1700" y2="560" stroke="#72ded8" stroke-opacity="0.22" stroke-width="2"></line></svg>' +
  '<div style="position: absolute; left: 140px; top: 485px; width: 1640px; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); column-gap: 24px">' +
  ''.join(stage(i + 1, *x) for i, x in enumerate(STAGES)) + '</div>' + bubble(DARK)))

# ── Creative Studio (v6, operador 2026-10-06): vistas reales del artifact «Efeonce Marketing Studio», rotuladas
# Creative Studio, montadas como componentes (dc-import) dentro de las láminas.
BLOBMAP = {"0a7bdcb5b7cda387bd7bc39ab2de73e3": "c9a6d5c63ee54bfcaeea3b3abd72159d", "0c30ac55453e72d258b359cca7ff0456": "6ebecb7193112f11b7f5ad30b374ae3d",
           "395ed9713ee7f5f42bf493b13fbe762a": "aa0a3b9d61d18e878653e48f274bfad6", "54726c0ae993ed6dc16881530f775976": "7697876c491d5284d131af9c9d59d6e4",
           "77a8bc38ac27f223ccfb8a9b84658548": "6510b89e7178acdbfb55e7238ef5bf56", "8d421eaabd6d553509ad60cf6846040c": "1854a19d57f0dfef5e8bf4aadc2b5348",
           "8e4a5aea70e0949b09a5f2fb166c2a57": "ce2ab527ffec11a85e4995a9b84e7547", "a5168ac082211864d18a10b097e9c8ab": "28f1d78a014d8ea0b4502c92cfd18ff0",
           "efe3514af3d0965f9acd955d31fc5dbb": "d36f1add12c89cebc516d56a503afa41"}
import re as _re
# Comentario del operador (2026-10-06): las campañas eran las nuestras. Van campañas ficticias de clientes con
# imágenes generadas (ui/media/) y la marca Creative Studio (esfera en el acento de Brand, logos/).
CAMPAIGN_IMG = {"a5168ac082211864d18a10b097e9c8ab": "56d30541a839f70bfb56677e15d7e012", "54726c0ae993ed6dc16881530f775976": "09a53b329b8b361ea71fe83c410d6996",
                "77a8bc38ac27f223ccfb8a9b84658548": "c29542f2762a52af53f4ff99f9b6f807", "0a7bdcb5b7cda387bd7bc39ab2de73e3": "6b0a97bff08b5f11214165fcebdf04a0",
                "8e4a5aea70e0949b09a5f2fb166c2a57": "46237be632a2c6986b02f844260822ed"}
CS_LOGO_DARK = "5e65f8997f34dd0b81e3ab2b58a1281b"
CS_LOGO_LIGHT = "141a7c747c9d9ca1057d0f5a5b9edf23"
TEXT = [
 ("5 campañas · 52 piezas · 72 anuncios preparados · 0 lanzados", "5 campañas · 86 piezas · 72 anuncios preparados · 0 lanzados"),
 ("CMP-001 · SEO · AEO · TOFU", "CMP-101 · LANZAMIENTO · VOLTA"),
 ("Empresas mid market y enterprise · Marketing y dirección. 7 conceptos en 28 piezas, 48 copys y 72 anuncios listos para cuando se apruebe el presupuesto.",
  "Lanzamiento de los audífonos Volta Air en Chile, Colombia y México. 7 conceptos en 42 piezas, 48 copys y 72 anuncios listos para cuando apruebes el presupuesto."),
 ("CMP-002 · HUBSPOT", "CMP-102 · ALWAYS-ON · NUVO"),
 ("24 piezas · 6 conceptos · sin copy de anuncio", "24 piezas · 6 conceptos · 48 anuncios"),
 ("Falta la aprobación escrita de HubSpot para el Sprocket.", "Falta tu aprobación del presupuesto de medios de noviembre."),
 ("CMP-003 · ORGÁNICO", "CMP-103 · TEMPORADA · RUTA SUR"),
 ("3 posts · 13 al 16 de octubre", "20 piezas · 13 al 31 de octubre"),
 ("Podrías tapar el logo", "El viento no avisa"), ("Seis segundos. Ningún detalle casual", "Capas que se ganan"), ("La exigencia también escala", "Hasta la última cumbre"),
 ("CMP-004 · BORRADOR", "CMP-104 · BORRADOR · AUREA"), ("CMP-005 · BORRADOR", "CMP-105 · BORRADOR · CASA MAR"),
 ("Hay preguntas que el dashboard no hace", "Tu piel, tu luz"), ("Lo que decides no lanzar", "Rutina de un minuto"), ("La próxima decisión no empieza de cero", "Hecho para quedarse"),
 ("Agencia creativa premium y Agencia estratégica premium tienen conceptos aceptados en CDR-010 y CDR-011, pero todavía ninguna pieza registrada.",
  "Brillo propio y Despertar frente al mar tienen conceptos aceptados y entran a producción esta semana."),
 ("Agencia creativa premium", "Brillo propio"), ("Agencia estratégica premium", "Despertar frente al mar"),
 ("Lo que la IA dice de ti", "Escucha el silencio"), ("Tu IA no conoce tu negocio está bloqueada", "Snack de verdad espera presupuesto"),
 ("Las 24 piezas están aprobadas, pero falta la autorización escrita de HubSpot para usar el Sprocket, y la landing /agenda/ debe alinear su oferta.",
  "Las 24 piezas están aprobadas; falta autorizar el presupuesto de medios de noviembre."),
 ("Tu IA no conoce tu negocio", "Snack de verdad"), ("SKY nos eligió otra vez", "Invierno en el fin del mundo"),
 ("Pieza «No fuiste tú»", "Pieza de Volta Air"),
 ("Jueves 25 de septiembre", "Martes 13 de octubre"), ("Buenos días, Julio", "Buenos días, Camila"),
 ("Presupuesto · CMP-001", "Presupuesto · CMP-101"), ("Calendario · CMP-001", "Calendario · CMP-103"),
 ("Tres posts con fecha pasada siguen en «pendiente»", "Tres piezas esperan tu aprobación en Frame.io"),
 ("Programados para el 22 y 23 de septiembre en LinkedIn e Instagram. El último estado observado es del 22 de septiembre: confírmalo en Metricool.",
  "Son las stories de Ruta Sur programadas para el 15 de octubre en Instagram y TikTok."),
 (">Verificar<", ">Revisar<"), ("Pauta · CMP-002", "Pauta · CMP-102"), ("Producción · CMP-004 y CMP-005", "Producción · CMP-104 y CMP-105"),
 ("CMP-001 · 28 piezas", "CMP-101 · 42 piezas"), ("CMP-002 · pauta bloqueada", "CMP-102 · espera presupuesto"), ("CMP-003 · orgánico", "CMP-103 · temporada"),
 ("Reel en Instagram Efeonce", "Reel en Instagram Volta"), ("CMP-003 · programado en Metricool", "CMP-103 · programado"),
 ("LinkedIn Julio Reyes", "Instagram Nuvo"), ("LinkedIn Efeonce", "TikTok Ruta Sur"),
 (">52<", ">86<"), ("piezas en 2 campañas", "piezas en 5 campañas"), (">JR<", ">CA<"), ('aria-label="Julio Reyes"', 'aria-label="Camila"'), ('alt="Portada SKY"', 'alt="Portada de Ruta Sur"')]
def studio_component(src):
    h = open(src, encoding='utf-8').read()
    for a, b in CAMPAIGN_IMG.items(): h = h.replace(a, b)
    for a, b in BLOBMAP.items(): h = h.replace(a, b)
    for a, b in TEXT: h = h.replace(a, b)
    # Comentario del operador (2026-10-06): el encabezado lleva el lockup de Creative Studio (generado con el mismo
    # constructor del de Marketing Studio, línea brand), igual que la app real: positivo en claro, negativo en oscuro.
    lock = ('<sc-if value="{{isDark}}" hint-placeholder-val="{{false}}"><img src="/_blob/8c5c29df9d9fb02d6e0f6410ace88d4e" alt="Efeonce | Creative Studio" style="height: 20px; width: auto; display: block;"></sc-if>'
            '<sc-if value="{{isLight}}" hint-placeholder-val="{{true}}"><img src="/_blob/cc3c6fbe79f2a71f0e5d904846231b3b" alt="Efeonce | Creative Studio" style="height: 20px; width: auto; display: block;"></sc-if>')
    h, n = _re.subn(r'<sc-if value="\{\{isDark\}\}"[^>]*><img[^>]*alt="Efeonce"[^>]*></sc-if><sc-if value="\{\{isLight\}\}"[^>]*><img[^>]*alt="Efeonce"[^>]*></sc-if><span style="width: 1px; height: 20px;[^"]*"></span><span[^>]*>Marketing Studio</span>', lambda m: lock, h)
    assert n == 1, f'encabezado no encontrado en {src}'
    h = h.replace('Marketing Studio', 'Creative Studio')
    h = _re.sub(r'href="Studio-[A-Za-z]+\.dc\.html"', 'href="#"', h)
    return h
COMPONENTS = {"CS-Campaigns.dc.html": studio_component('ui/src-Studio-Campaigns.dc.html'),
              "CS-Home.dc.html": studio_component('ui/src-Studio-Home.dc.html')}
def screen(name, left, top, scale, rot, origin, theme='dark'):
    w, h = 1440, 1100
    return (f'<div style="position: absolute; left: {left}px; top: {top}px; width: {w*scale:.0f}px; height: {h*scale:.0f}px; perspective: 2200px">'
            f'<div style="width: {w}px; height: {h}px; transform-origin: {origin}; transform: rotateY({rot}deg) scale({scale}); border-radius: 18px; overflow: hidden; border: 2px solid rgba(114, 222, 216, 0.28)">'
            f'<dc-import name="{name}" theme="{theme}" hint-size="1440px,1100px"></dc-import></div></div>')
S['P4-creative-studio'] = ("Tus campañas, a la vista.", page("Tus campañas, a la vista.",
  screen('CS-Campaigns', 760, 110, 0.80, -16, '100% 50%', 'light') +
  col('<img src="/_blob/8c5c29df9d9fb02d6e0f6410ace88d4e" alt="Efeonce | Creative Studio" style="height: 34px; width: auto; display: block">' + headline(['Tus campañas,', 'a la vista'], 104, DARK, '; margin-top: 64px') +
      body('Cada campaña con sus piezas y el estado de creatividad, medios y lanzamiento, en un solo lugar y al día.', DARK, 22, 520, '; margin-top: 40px') +
      f'<div style="margin-top: 44px; display: flex; flex-direction: column; gap: 14px; width: 520px">{svc("Campañas y piezas", "todo lo producido para tu marca, ordenado por campaña")}{svc("Estado en vivo", "qué está en producción, qué espera tu aprobación y qué ya salió")}</div>', 120, 580) +
  bubble(DARK)))
TOOLS = [("a9fc2179296e7205eb0367774eba1c4c", "Microsoft Teams", "nos reunimos"), ("496c456197a965130a04554201efb39a", "Notion", "proyectos y tareas"),
         ("d8002281d17ca07eb3341e7c11720bb6", "Frame.io", "revisas y apruebas"), ("35cb41c9c7535c3a833a3b0142ed1089", "Adobe", "producimos")]
def tool(blob, name, label):
    return (f'<div style="display: flex; align-items: center; gap: 18px; padding: 14px 0; border-top: 1px solid rgba(114, 222, 216, 0.16)">'
            f'<img src="{BL(blob)}" alt="{name}" style="width: 48px; height: 48px; object-fit: contain">'
            f'<div style="display: flex; flex-direction: column; gap: 2px"><div style="font-family: {ST}; font-size: 20px; font-weight: 600; color: #ffffff">{name}</div>'
            f'<div style="font-family: {ST}; font-size: 17px; font-weight: 300; color: #cfe4fa">{label}</div></div></div>')
def pair(q, a, px, t=DARK):
    return (f'<div style="display: flex; align-items: center; gap: 16px"><span style="width: 22px; height: 22px; border-radius: 50%; border: 4px solid {t["acc"]}; box-sizing: border-box; flex: none"></span>'
            f'<span style="font-family: {ST}; font-size: 36px; font-weight: 300; color: {t["ink"]}">{q}</span></div>' + headline([a], px, t, '; margin-top: 18px'))
# Comentario del operador (2026-10-06): los logos de las herramientas estaban «sin chiste». Van como en la lámina
# aprobada del día a día (DeckDiaADiaHerramientas): tiles de app blancos que flotan alrededor de la pantalla, unidos a ella.
# Comentario del operador (2026-10-06): «todo está desconectado de la interfaz». La pantalla va plana y los tiles de
# cada herramienta se montan sobre su borde superior: cada uno entra a la interfaz por una línea corta con su punto.
APPS = [("a9fc2179296e7205eb0367774eba1c4c", "Microsoft Teams", "Nos reunimos"), ("496c456197a965130a04554201efb39a", "Notion", "Proyectos y tareas"),
        ("d8002281d17ca07eb3341e7c11720bb6", "Frame.io", "Revisas y apruebas"), ("35cb41c9c7535c3a833a3b0142ed1089", "Adobe", "Producimos")]
# Comentario del operador (2026-10-06): «necesito más punch acá, mucho más». La órbita rodea la interfaz: la pantalla
# de Creative Studio (modo claro, contrasta con el fondo) al centro de una órbita grande y las herramientas como satélites
# sobre el anillo, con su etiqueta afuera. Ningún texto cruza la órbita.
OCX, OCY, ORX, ORY = 1270, 590, 600, 410
SC5 = 0.60; SW5, SH5 = 1440 * SC5, 1100 * SC5
SAT = [(-148, 'above'), (-32, 'above'), (34, 'below'), (148, 'below')]
def orbit5():
    ring = (f'<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position: absolute; left: 0; top: 0" aria-hidden="true">'
            f'<ellipse cx="{OCX}" cy="{OCY}" rx="{ORX}" ry="{ORY}" fill="none" stroke="#72ded8" stroke-opacity="0.30" stroke-width="2"></ellipse>'
            f'<ellipse cx="{OCX}" cy="{OCY}" rx="{ORX-70}" ry="{ORY-55}" fill="none" stroke="#72ded8" stroke-opacity="0.12" stroke-width="1"></ellipse></svg>')
    scr = (f'<div style="position: absolute; left: {OCX-SW5/2:.0f}px; top: {OCY-SH5/2:.0f}px; width: {SW5:.0f}px; height: {SH5:.0f}px; overflow: hidden; border-radius: 16px; border: 2px solid rgba(255, 255, 255, 0.35)">'
           f'<div style="width: 1440px; height: 1100px; transform-origin: 0 0; transform: scale({SC5})"><dc-import name="CS-Home" theme="light" hint-size="1440px,1100px"></dc-import></div></div>')
    sats = ''
    for (blob, name, label), (deg, pos) in zip(APPS, SAT):
        r = math.radians(deg); x, y = OCX + ORX * math.cos(r), OCY + ORY * math.sin(r)
        sats += (f'<div style="position: absolute; left: {x-74:.0f}px; top: {y-74:.0f}px; width: 148px; height: 148px; border-radius: 34px; background: #ffffff; display: flex; align-items: center; justify-content: center; border: 3px solid rgba(114, 222, 216, 0.55)">'
                 f'<img src="{BL(blob)}" alt="{name}" style="width: 84px; height: 84px; object-fit: contain"></div>')
        ly = y - 74 - 76 if pos == 'above' else y + 74 + 14
        sats += (f'<div style="position: absolute; left: {x-150:.0f}px; top: {ly:.0f}px; width: 300px; text-align: center; display: flex; flex-direction: column; gap: 4px">'
                 f'<div style="font-family: {ST}; font-size: 13px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; color: #cfe4fa">{name}</div>'
                 f'<div style="font-family: {ST}; font-size: 26px; font-weight: 600; color: #ffffff">{label}</div></div>')
    return ring + scr + sats
S['P5-dia-a-dia'] = ("¿Cómo sigo el trabajo? En vivo.", page("¿Cómo sigo el trabajo? En vivo.",
  orbit5() +
  col(eyebrow('Tu día a día con Efeonce', DARK) + f'<div style="margin-top: 70px">{pair("¿Cómo sigo el trabajo?", "En vivo", 128)}</div>' +
      body('Cada herramienta gira alrededor de tu marca y <b style="font-weight: 600">todo</b> llega a Creative Studio, a la vista y sin esperar el informe.', DARK, 24, 440, '; margin-top: 48px'), 120, 480) +
  bubble(DARK)))

def image_slide(title, blob):
    return page(title, f'<img src="{BL(blob)}" alt="{title}" style="display: block; width: 1920px; height: 1080px">', DARK, False)
ORDER = [("A01-portada", "Portada · ¿Mi equipo puede producir más? Mucho más.", 'png'), ("A02-promesa", None, 'hand'),
         ("B1-escala", None, 'hand'), ("B2-formatos", None, 'hand'), ("B3-tiempo", None, 'hand'), ("B4-manual", None, 'hand'), ("B5-sistema", None, 'hand'), ("B6-prueba", None, 'hand'),
         ("A03-rutas", None, 'hand'), ("A04-capacidades", None, 'hand'), ("P1-estudio", None, 'hand'), ("P2-hibrido", None, 'hand'), ("P3-herramientas", None, 'hand'), ("P4-creative-studio", None, 'hand'),
         ("A05-equipo", "¿Quién trabaja en mi marca? Personas reales.", 'png'), ("A07-triptico", None, 'hand'), ("P5-dia-a-dia", None, 'hand'),
         ("A08-capacidad", None, 'hand'), ("A09-sprint", "¿Y si no me convence? Empiezas chico.", 'png'),
         ("A10-control", "¿Pierdo el control de mi marca? Nunca.", 'png'), ("A12-caso-sky", None, 'hand'), ("A13-testimonio", None, 'hand'),
         ("A14-clientes", None, 'hand'), ("A21-mercados", "¿Dónde trabajan? En cinco países.", 'png'), ("A15-siguiente", "¿Qué recibo primero? Un plan.", 'png'),
         ("A16-contraportada", "Contraportada · ¿Conversamos? Cuando quieras.", 'png')]
idx = json.load(open(IDX, encoding='utf-8'))
idx['boards'].pop('A11-medicion.dc.html', None)
# P2 (set híbrido en cine) reemplaza a A06 «Personas y agentes, sobre la misma pieza» (operador, 2026-10-06).
idx['boards'].pop('A06-hibrido.dc.html', None)
idx['order'] = [o for o in idx['order'] if o != 'A06-hibrido.dc.html']
idx['order'] = [o for o in idx['order'] if o != 'A11-medicion.dc.html']
idx['notes']['t2']['text'] = "Brochure · Agencia Creativa — 26 láminas"
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
if not any(p['id'] == 'ui' for p in idx['pages']): idx['pages'].append({"id": "ui", "name": "Interfaces · Creative Studio"})
for k, (f, html) in enumerate(COMPONENTS.items()):
    open(f'{ROOT}/project/{f}', 'w', encoding='utf-8').write(html); written.append(f)
    idx['boards'][f] = {"x": k * 1540, "y": 0, "w": 1440, "h": 1100, "title": f'Creative Studio · {f[3:-8]}', "page": "ui"}
    if f not in idx['order']: idx['order'].append(f)
json.dump(idx, open(f'{ROOT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({f"project/{w}": f"project/{w}" for w in written}))
