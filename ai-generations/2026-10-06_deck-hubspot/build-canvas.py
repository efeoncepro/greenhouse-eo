import json, os, sys
ROOT = sys.argv[1]
blobs = json.load(open('blobs.json'))
BODY = [
 ("B02-propuesta", "¿Cómo vende más mi CRM? Con agentes."),
 ("B03-uno", "¿Cuántos CRM necesito? Uno."),
 ("B19-crm-solo", "¿Sigo llenando el CRM? Ya no."),
 ("B20-datos", "¿Cómo escala mi CRM? Ordenado."),
 ("B04-encaje", "¿HubSpot o Salesforce? El que encaje."),
 ("B05-servicios", "¿Qué hacen en HubSpot? Todo el ciclo."),
 ("B17-licencias", "¿Qué licencias de HubSpot compro? Las que usas."),
 ("B18-creditos", "¿Se acumulan los créditos? No."),
 ("B06-agentes", "¿Quién responde por el agente? Una persona."),
 ("B07-aprobacion", "¿Dónde apruebo al agente? Donde trabajas."),
 ("B08-permiso", "¿Puedo contactar a ese cliente? Con permiso."),
 ("B09-migracion", "¿Cómo sé que migró todo? Porque cuadra."),
 ("B10-evaluacion", "¿Qué recibo primero? Una decisión."),
 ("B11-olas", "¿Sumo todos los agentes juntos? No, por olas."),
 ("B12-dia-a-dia", "¿Qué llega a producción? Lo que apruebes."),
 ("B13-adopcion", "¿Cómo aprende mi equipo? A su ritmo."),
 ("B14-operacion", "¿Y después del go-live? Lo operamos."),
 ("B15-medicion", "¿Cómo sé que funciona? Lo medimos."),
]
BROCHURE = [("B01-portada", "Portada · ¿Mi HubSpot puede hacer más? Mucho más.")] + BODY + [("B16-contraportada", "Contraportada · ¿Conversamos? Cuando quieras.")]
PROPUESTA = [("P01-portada", "Portada de propuesta · [Cliente]"), ("P02-propuesta", "¿Cómo vende más mi CRM? Con agentes.")] + [(k, t) for k, t in BODY[1:]] + [("P16-cotizacion", "¿Cómo se cotiza? Por alcance."), ("P17-contraportada", "Contraportada · Empower your Revenue")]
def slide_html(title, blob):
    if blob:
        inner = f'<img src="{blob}" alt="{title}" style="display: block; width: 1920px; height: 1080px">'
        # Capas editables encima de la lámina: el badge Gold de HubSpot (readback 2026-10-06) en la portada.
        # El sprocket 3D de HubSpot sobre la plataforma de la lámina de servicios (uso interno hasta aprobación de HubSpot).
        if 'Todo el ciclo' in title:
            inner = (f'<div style="position: relative; width: 1920px; height: 1080px">{inner}'
                     f'<img src="/_blob/f38949bc9a2c2b3ce180e099e3209861" alt="Sprocket de HubSpot en 3D" '
                     f'style="position: absolute; left: 1410px; top: 470px; width: 380px; height: 380px"></div>')
        if title.startswith('Portada · '):
            inner = (f'<div style="position: relative; width: 1920px; height: 1080px">{inner}'
                     f'<img src="/_blob/bcf5db8eecf306118bffc3022384da7c" alt="HubSpot Solutions Partner · Gold" '
                     f'style="position: absolute; left: 140px; top: 856px; width: 160px; height: 159px"></div>')
    else:
        inner = (f'<div style="width: 1920px; height: 1080px; box-sizing: border-box; padding: 140px; display: flex; flex-direction: column; justify-content: center; gap: 28px; '
                 f'background: #091951; color: #ffffff; font-family: \'Poppins\', system-ui, sans-serif">'
                 f'<div style="font-size: 18px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">En composición</div>'
                 f'<div style="font-size: 64px; font-weight: 600; line-height: 1.1; max-width: 1400px">{title}</div>'
                 f'<div style="font-size: 26px; font-weight: 300; color: #cfe4fa">Lleva los íconos oficiales de HubSpot: sale apenas se publique axis-brand-assets 0.4.25.</div></div>')
    return f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>{title}</title><script src="./support.js"></script></head><body><x-dc><helmet><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;500;600&amp;display=swap" rel="stylesheet"><style>body{{margin:0;background:#091951}}</style></helmet><div style="width: 1920px; height: 1080px; overflow: hidden; background: #091951">{inner}</div></x-dc><script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1920,"height":1080}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script></body></html>
'''
boards, order, written = {}, [], []
os.makedirs(f'{ROOT}/project', exist_ok=True)
def place(slides, page, prefix):
    for i, (key, title) in enumerate(slides):
        f = 'Main.dc.html' if key == 'B01-portada' else f'{prefix}{key}.dc.html'
        if f in boards: continue
        blob = blobs.get(key) or (blobs.get('B' + key[1:]) if key.startswith('P') else None)
        num = f'{i + 1:02d}'
        boards[f] = {"x": (i % 4) * 2000, "y": (i // 4) * 1200, "w": 1920, "h": 1080, "title": f'{num} · {title}', "page": page}
        order.append(f)
        open(f'{ROOT}/project/{f}', 'w', encoding='utf-8').write(slide_html(title, blob))
        written.append(f)
place(BROCHURE, 'brochure', '')

# Comparación de color (operador, 2026-10-06): A actual (magenta en todo), B magenta sólo como puntuación con luz azul
# de Efeonce en la foto, C Growth (teal). Filas = versiones; columnas = portada, CRM que se actualiza solo, créditos.
COMPARACION = [
  ('A', 'A · Actual: magenta en todo', ['/_blob/6fd8c87997b8a9c5b250ef49a7832d94', '/_blob/5db5b6036652688f63dabdf3437ae95d', '/_blob/8d647e7778b9155fd1efbe4a3128ef59']),
  ('B', 'B · Magenta sólo como puntuación (luz azul de Efeonce)', ['/_blob/9b34ad27eca327982c950438e8f03771', '/_blob/7412006e4a2445c25522a95ffffbfdc5', '/_blob/8d647e7778b9155fd1efbe4a3128ef59']),
  ('C', 'C · Growth (teal)', ['/_blob/3eb13409da79c64b900f8762e13faa1d', '/_blob/1bf960bc91ca2c5b13064c747941df02', '/_blob/33e028ff8b5a252f28a8a22fab442c72']),
]
COLS = ['portada', 'crm', 'creditos']
CMP_NOTES = {}
for r, (v, label, blobs_row) in enumerate(COMPARACION):
    for c, blob in enumerate(blobs_row):
        f = f'Cmp-{v}-{COLS[c]}.dc.html'
        title = f'{label} · {COLS[c]}'
        boards[f] = {"x": c * 2000, "y": r * 1500, "w": 1920, "h": 1080, "title": title, "page": "comparacion"}
        order.append(f)
        open(f'{ROOT}/project/{f}', 'w', encoding='utf-8').write(slide_html(title, blob))
        written.append(f)
    CMP_NOTES[f'cmp-{v}'] = {"kind": "title1", "maxW": 5920, "text": label, "w": 240, "x": 0, "y": r * 1500 - 300, "page": "comparacion"}
place(PROPUESTA, 'propuesta', 'Prop-')
# Banco de fotos del deck (operador, 2026-10-06: «guarda las demás imágenes, nos pueden servir»). Plates limpios, sin
# texto, en ai-generations/2026-10-06_deck-hubspot/fotos/plates/. En uso = la versión que lleva el deck (luz azul, B).
BANCO = [
  ('HS1-crm-se-actualiza', 'HS1 · CRM que se actualiza solo · luz magenta (versión A)', '/_blob/627b8e13e3c7727a449553cb63a265f5'),
  ('CMP-crm-B', 'CRM que se actualiza solo · luz azul + magenta de acento (B, EN USO)', '/_blob/740bfce76af2ab998900ec9a5e45dba3'),
  ('CMP-crm-C', 'CRM que se actualiza solo · luz teal (C; mancha abajo a la derecha)', '/_blob/65281bfecc373b87ce349ebd1a04402e'),
  ('CMP-portada-B', 'Motor de revenue · luz azul + magenta de acento (B, EN USO en portada)', '/_blob/0803e35deb2f480ea40a6db131ebf436'),
  ('CMP-portada-C', 'Motor de revenue · luz teal (C)', '/_blob/62c660958e03ad7924f8a373d0a8123b'),
  ('HS2d-datos-en-orden', 'Datos en orden · luz azul, mano a la derecha (EN USO)', '/_blob/27d5415b95906a05c8d37560defdad53'),
  ('HS2c-datos-en-orden', 'Datos en orden · luz azul (mano cruza el titular)', '/_blob/2b09b943e20c3fcee87689692d867aae'),
  ('HS2b-datos-en-orden', 'Datos en orden · luz magenta, sujeto a la derecha (A)', '/_blob/5a8a2f81c6d183a519f6ebd1cd6b112b'),
  ('HS2-datos-en-orden', 'Datos en orden · luz magenta, primera versión', '/_blob/aba2f8393adb0a80fe6597e95764d5df'),
]
for i, (key, title, blob) in enumerate(BANCO):
    f = f'Banco-{key}.dc.html'
    boards[f] = {"x": (i % 3) * 1872, "y": (i // 3) * 1150, "w": 1792, "h": 1024, "title": title, "page": "banco"}
    order.append(f)
    html = f'''<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>{title}</title><script src="./support.js"></script></head><body><x-dc><helmet><style>body{{margin:0;background:#091951}}</style></helmet><div style="width: 1792px; height: 1024px; overflow: hidden; background: #091951"><img src="{blob}" alt="{title}" style="display: block; width: 1792px; height: 1024px"></div></x-dc><script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1792,"height":1024}}}}'>
class Component extends DCLogic {{ renderVals() {{ return {{}}; }} }}
</script></body></html>
'''
    open(f'{ROOT}/project/{f}', 'w', encoding='utf-8').write(html)
    written.append(f)

idx = json.load(open(f'{ROOT}/project/canvas.json', encoding='utf-8'))
old = set(idx.get('boards', {}))
idx['boards'] = boards; idx['order'] = order
idx['pages'] = [{"id": "brochure", "name": "Brochure · 20"}, {"id": "propuesta", "name": "Propuesta · 21"}, {"id": "comparacion", "name": "Comparación de color"}, {"id": "banco", "name": "Banco de fotos"}]
idx['launch'] = {"view": "canvas", "page": "brochure"}
idx['notes'] = {
  "t-brochure": {"kind": "title1", "maxW": 7920, "text": "HubSpot · brochure de servicios", "w": 240, "x": 0, "y": -300, "page": "brochure"},
  "t-propuesta": {"kind": "title1", "maxW": 7920, "text": "HubSpot · propuesta comercial", "w": 240, "x": 0, "y": -300, "page": "propuesta"}, **CMP_NOTES, "t-banco": {"kind": "title1", "maxW": 5408, "text": "Banco de fotos del deck HubSpot", "w": 240, "x": 0, "y": -300, "page": "banco"}}
json.dump(idx, open(f'{ROOT}/project/canvas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
json.dump({"written": written, "removed": sorted(old - set(boards))}, open(f'{ROOT}/manifest.json', 'w'), indent=1)
print(len(written), 'boards; removed', sorted(old - set(boards)))
