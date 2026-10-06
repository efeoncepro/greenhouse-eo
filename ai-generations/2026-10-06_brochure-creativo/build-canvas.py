import json, sys, os, datetime
ROOT = sys.argv[1]
B = {"C01-portada":"b0380229f04fe81f67ec2968aa82035f","C02-promesa":"cf473326cd1e7b40bfabe0e6db9d6b50","C04-dias":"f3b63ab08a9eaa030f706e842768cbe9",
"C05-sistema":"33c0345b87efef63083d49904aef2853","C06-capacidad":"eb5fc7c7c0e94d7c4286e66fbd0f136c","C07-equipo":"289cf1da581427196c4943af23ac862c",
"C08-triptico":"23c6987b7134cc58224c5d4ff0a12f50","C09-hibrido":"8aa608e19d8929e565fe2548fabe6906","C10-medicion":"64f9836cb586c375c81885a889d07ea5",
"C11-caso-sky":"098b39f526c6a4effe275a7ed40a2c33","C12-testimonio":"b1701d9951e849c96b80aad7eb7404b4","C13-clientes":"dc757d4abc7134477c3dfc6da69aecd2",
"C14-siguiente":"c982df7f4c9347b3fa8ac9874cb47845","C15-contraportada":"8ad87ffa344050255e5beec1fa7ae31c"}
SLIDES = [
 ("C01-portada","Portada · ¿Quién crea mi contenido? Tu squad."),
 ("C02-promesa","¿Tu marca en cada pantalla? En todas."),
 ("C03-capacidades","¿Qué hace mi squad? Todo el oficio."),
 ("C04-dias","¿Cuánto tarda tu campaña? En días."),
 ("C05-sistema","¿Cómo escalas tu contenido? Con sistema."),
 ("C06-capacidad","¿Compro horas o piezas? Capacidad."),
 ("C07-equipo","¿Quién trabaja en tu cuenta? Personas reales."),
 ("C08-triptico","¿Cómo trabajamos? Escucha. Crea. Mide."),
 ("C09-hibrido","¿Quién hace la pieza? Personas y agentes."),
 ("C10-medicion","¿Cuántas llegan a tiempo? 88 %."),
 ("C11-caso-sky","Caso Sky · ¿Qué cambió con Sky? Más rápido."),
 ("C12-testimonio","¿Cómo es trabajar con nosotros? En palabras de Sky."),
 ("C13-clientes","¿Quién confía en nosotros? Marcas líderes."),
 ("C14-siguiente","¿Por dónde empezamos? Por aquí."),
 ("C15-contraportada","Contraportada · ¿Conversamos? Cuando quieras."),
]
def image_slide(title, blob):
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
<style>
body{{margin:0;background:#001a33}}
</style>
</helmet>
<div style="width: 1920px; height: 1080px; overflow: hidden; background: #001a33">
<img src="/_blob/{blob}" alt="{title}" style="display: block; width: 1920px; height: 1080px">
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1920,"height":1080}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script>
</body>
</html>
'''
CAPS = [
 ("ef70d571ba27a0e85f3996baa684655b","Squad creativo","Managed Creative Capacity","Capacidad recurrente y priorizada, con responsabilidad de entrega."),
 ("0651a751547895325525593bf8068d54","Brand systems","Estrategia e identidad","Posicionamiento, identidad verbal y visual, y un sistema de marca que se usa."),
 ("83c49403d47cdd655660d5fb4b569a54","Campañas","Plataforma creativa","Idea, key visual, mensajes y toolkit multicanal, con sus adaptaciones."),
 ("227c39276e634d8fb74abd1d0360786d","Contenido y social","Content &amp; Social Ops","Pilares, calendario, producción, publicación, comunidad y reporte."),
 ("64fc25954e203f75ae48935eaafe8a75","Audiovisual","Video, motion y audio","Producción, edición, motion, audio y finishing para cada formato."),
 ("ae80173a44c77f91fcaf568ee2c9687e","Run &amp; Gun","Captura ágil","Entrevistas, b-roll, reels y testimonios en una jornada con crew."),
]
def cap(icon, title, label, desc):
    return f'''<div style="display: flex; flex-direction: column; gap: 14px; padding-top: 28px; border-top: 1px solid rgba(114, 222, 216, 0.16)">
<img src="/_blob/{icon}" alt="" style="width: 120px; height: 120px; margin: -8px 0 4px -10px">
<div style="font-family: 'Poppins', system-ui, sans-serif; font-size: 15px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">{label}</div>
<div style="font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-size: 40px; font-weight: 740; letter-spacing: -0.02em; line-height: 1; color: #ffffff">{title}</div>
<div style="font-family: 'Poppins', system-ui, sans-serif; font-size: 20px; font-weight: 300; line-height: 1.45; color: #cfe4fa">{desc}</div>
</div>'''
C03 = '''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Seis capacidades · Todo el oficio</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap" rel="stylesheet">
<style>
body{margin:0;background:#001a33}
</style>
</helmet>
<div style="position: relative; width: 1920px; height: 1080px; overflow: hidden; box-sizing: border-box; padding: 120px 140px 0 140px; display: grid; grid-template-columns: 560px minmax(0, 1fr); column-gap: 110px; background: #001a33; color: #ffffff">
<div style="display: flex; flex-direction: column; gap: 0">
<div style="font-family: 'Poppins', system-ui, sans-serif; font-size: 18px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #ffffff">Seis capacidades</div>
<div style="display: flex; align-items: center; gap: 16px; margin-top: 66px">
<span style="width: 22px; height: 22px; border-radius: 50%; border: 4px solid #ff6500; box-sizing: border-box; flex: none"></span>
<span style="font-family: 'Poppins', system-ui, sans-serif; font-size: 40px; font-weight: 300; color: #ffffff">¿Qué hace mi squad?</span>
</div>
<div style="margin-top: 22px; font-family: 'Bricolage Grotesque', system-ui, sans-serif; font-size: 136px; font-weight: 760; letter-spacing: -0.035em; line-height: 0.9; color: #ffffff">Todo el oficio<span style="display: inline-block; width: 30px; height: 30px; border-radius: 50%; background: #ff6500; margin-left: 6px"></span></div>
<div style="margin-top: 44px; max-width: 520px; font-family: 'Poppins', system-ui, sans-serif; font-size: 26px; font-weight: 300; line-height: 1.45; color: #ffffff">Estrategia, craft y producción en un mismo squad, con <b style="font-weight: 600">un</b> solo interlocutor y una capacidad que se gobierna.</div>
<div style="margin-top: auto; margin-bottom: 150px; display: flex; flex-direction: column; gap: 14px">
<div style="font-family: 'Poppins', system-ui, sans-serif; font-size: 15px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #cfe4fa">Cómo crece la relación</div>
<div style="display: flex; align-items: center; gap: 14px; font-family: 'Poppins', system-ui, sans-serif; font-size: 22px; font-weight: 500; color: #ffffff">
<span>Diagnóstico</span><span style="color: #cfe4fa">→</span><span>Instalar</span><span style="color: #cfe4fa">→</span><span>Operar</span><span style="color: #cfe4fa">→</span><span>Expandir</span>
</div>
</div>
</div>
<div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 56px; row-gap: 56px; align-content: start; padding-top: 70px">
''' + "\n".join(cap(*c) for c in CAPS) + '''
</div>
<img src="/_blob/ebf538ba4f439fe2549aeacc0b9634bf" alt="efeoncepro.com" style="position: absolute; left: 135px; top: 990px; width: 162px; height: 38px">
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1920,"height":1080}}'>
class Component extends DCLogic { renderVals() { return {}; } }
</script>
</body>
</html>
'''
boards, order = {}, []
for i, (key, title) in enumerate(SLIDES):
    f = 'Main.dc.html' if i == 0 else f'{key}.dc.html'
    boards[f] = {"x": (i % 4) * 2000, "y": (i // 4) * 1200, "w": 1920, "h": 1080, "title": f'{i+1:02d} · {title}'}
    order.append(f)
    html = C03 if key == 'C03-capacidades' else image_slide(title, B[key])
    open(f'{ROOT}/project/{f}', 'w', encoding='utf-8').write(html)
now = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
idx = {"v": 3, "createdOnFiles": {"v": 1, "at": now}, "title": "Brochure Servicios Creativos",
  "launch": {"view": "canvas"}, "pages": [], "boards": boards, "order": order,
  "notes": {"t1": {"x": 0, "y": -300, "text": "Brochure · Servicios Creativos (línea Brand) — 15 láminas", "kind": "title1", "maxW": 7920}},
  "designSystems": [{"title": "Efeonce — La órbita", "namespace": "la-orbita", "artifact": "https://claude.ai/code/artifact/0f7107f2-2ef1-460c-af82-5bf59e2f8785", "version": "1791045370-2874", "copiedAt": now}]}
json.dump(idx, open(f'{ROOT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(order)
