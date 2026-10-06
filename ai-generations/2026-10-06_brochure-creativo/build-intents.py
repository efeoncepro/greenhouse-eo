# Brochure · Servicios Creativos (línea Brand), 2026-10-06. Recetas aprobadas de La órbita con el acento de Brand.
# Hechos: docs/services/creative-services/* + caso publicado de Sky (experiencia.efeoncepro.com).
import json, os
BASE = {"contract": "efeonce.surface-composition", "version": "0.1.2", "surface": "deck", "format": "16x9", "theme": "dark"}
EX = '../../src/lib/brand-surfaces/examples/'
SKY = "caso publicado de Sky Airlines, métricas de entrega de 12 meses"
def ex(name):
    d = json.load(open(EX + name, encoding='utf-8'))
    for k in BASE:
        if k != 'theme': d.pop(k, None)
    return d
def put(name, d, line='brand'):
    # Las recetas en papel (theme light) no admiten acento de línea: van con la marca madre, como en el brochure HubSpot.
    out = dict(BASE); out.update(d); out['line'] = 'growth' if out.get('theme') == 'light' else line; out['use'] = 'brochure'
    json.dump(out, open(f'intents/{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# 01 Portada — la de la línea Brand, aprobada (CR4 v2)
put('C01-portada', ex('deck-cover-brochure-line-brand-intent.json'))

# 02 La promesa — cine, la directora y la órbita de pantallas (aprobada)
p = json.load(open('/Users/jreye/Documents/axis-design-system/docs/examples/surfaces/deck-proposal-cinematic-intent.json', encoding='utf-8'))
for k in BASE: p.pop(k, None)
p['role'] = 'proposal'; p['layout'] = 'service'
p['voice']['eyebrow'] = 'Servicios creativos'
p['body'] = 'Social, campañas, video, motion y creatividad para performance. Una idea que llega a cada formato, con capacidad creativa gobernada.'
p['proof'] = {"text": "Sky: +2.000 piezas aprobadas en 12 meses", "source": "caso publicado de Sky Airlines"}
put('C02-promesa', p)

# 03 Qué hace el squad — las seis capacidades
put('C03-capacidades', {"role": "content", "recipe": "content-service-lanes",
  "voice": {"eyebrow": "Seis capacidades", "question": "¿Qué hace mi squad?", "answer": ["Todo el oficio"]},
  "lanes": [
    {"icon": "paleta", "title": "Squad creativo", "products": "Managed Creative Capacity", "description": "Capacidad recurrente y priorizada, con responsabilidad de entrega."},
    {"icon": "pincel", "title": "Brand systems", "products": "Estrategia e identidad", "description": "Posicionamiento, identidad verbal y visual, y un sistema de marca usable."},
    {"icon": "megafono", "title": "Campañas", "products": "Plataforma creativa", "description": "Idea, key visual, mensajes y toolkit multicanal con sus adaptaciones."},
    {"icon": "like", "title": "Contenido y social", "products": "Content & Social Ops", "description": "Pilares, calendario, producción, publicación, comunidad y reporte."},
    {"icon": "pelicula", "title": "Audiovisual", "products": "Video, motion y audio", "description": "Producción, edición, motion, audio y finishing para cada formato."},
    {"icon": "camara", "title": "Run & Gun", "products": "Captura ágil", "description": "Entrevistas, b-roll, reels y testimonios en una jornada con crew."}],
  "phases": ["Diagnóstico", "Instalar", "Operar", "Expandir"]})

# 04 Sección — velocidad (aprobada)
put('C04-dias', ex('deck-section-split-corner-bottom-intent.json'))

# 05 Cómo se compra — la propuesta sobria (aprobada)
s = ex('deck-proposal-service-creative-intent.json')
s['voice']['eyebrow'] = 'Servicios creativos'
s['proof'] = {"text": "Sky: +2.000 piezas aprobadas en 12 meses, 88 % a tiempo.", "source": "caso publicado de Sky Airlines"}
put('C05-sistema', s)

# 06 Capacidad gobernada: no horas ni piezas
put('C06-capacidad', {"role": "content", "recipe": "content-bullets",
  "voice": {"eyebrow": "Cómo se compra", "question": "¿Compro horas o piezas?", "answer": ["Capacidad"]},
  "items": [
    {"title": "Roles y dedicación", "desc": "Sabes quién trabaja en tu marca, con qué seniority y cuánta dedicación."},
    {"title": "Base y reactiva", "desc": "Una capacidad base para el plan y otra reactiva para lo que no se avisa."},
    {"title": "Rondas pactadas", "desc": "De dos a tres rondas por pieza; la siguiente se conversa como cambio."},
    {"title": "Derechos por escrito", "desc": "Uso por canal, territorio y plazo, definidos antes de producir."}],
  "progress": {"sections": 4, "current": 2},
  "selected": 3, "selection": {"target": "object", "label": "Cliente", "participantKind": "department"}})

# 07 El equipo — personas reales (aprobada)
t = ex('deck-content-team-intent.json')
t['body'] = 'Un squad que orbita tu marca y **un** solo interlocutor: tu Responsable de Cuenta.'
SQ = 'src/lib/artifact-composer/catalogs/deck-axis/assets/squad/'
def m(slug, name, role): return {"photo": {"path": SQ + f'squad-{slug}.png', "alt": f'{name}, {role}'}, "name": name, "role": role}
# El squad creativo real (cargos del roster, 2026-09-29); María Fernanda ya no está: la reemplaza Valentina.
t['team'] = [m('andres', 'Andrés', 'Senior Visual Designer'), m('valentina', 'Valentina', 'Content Lead'),
             m('julio', 'Julio', 'Responsable de Cuenta'), m('daniela', 'Daniela', 'Creative Operations Lead'),
             m('melkin', 'Melkin', 'Senior Visual Designer')]
put('C07-equipo', t)

# 08 Cómo trabajamos — tríptico (aprobado)
put('C08-triptico', ex('deck-triptych-intent.json'))

# 09 Fuerza híbrida, escena (aprobada)
h = ex('deck-method-hybrid-workforce-scene-intent.json')
h['voice']['eyebrow'] = 'Personas y agentes'
h['voice']['question'] = '¿Quién hace la pieza?'
h['body'] = 'Sobre la misma pieza, al mismo tiempo. El agente suma capacidad; la persona dirige, decide y responde por la marca.'
put('C09-hibrido', h)

# 10 Medición — OTD con dato real de Sky
put('C10-medicion', {"role": "content", "recipe": "content-measure",
  "voice": {"eyebrow": "Lo medimos", "question": "¿Cuántas llegan a tiempo?", "answer": ["88 %"]},
  "body": "de las entregas de Sky llegaron a tiempo en 12 meses. Lo ves en tu portal, no en un informe que llega tarde.",
  "measure": {"value": 0.88, "source": SKY},
  "photo": {"subject": "person", "plateRef": "ai-generations/2026-09-26_web-hero/plates/H1b-estratega-uniforme.png",
            "alt": "Una estratega de Efeonce, con el uniforme del equipo, revisa el tablero de entregas del cliente"},
  "figures": [{"value": "0,12", "label": "ajustes por pieza", "source": SKY},
              {"value": "39", "label": "campañas", "source": SKY}]})

# 11 Caso Sky (aprobado)
c = ex('deck-decision-case-intent.json')
c['photo'] = {"register": "documental", "subject": "person", "plateRef": "ai-generations/2026-09-26_deck-mosaico-documental/plates/L1-mesa-de-luz.png",
              "alt": "Un creativo de Efeonce revisa con lupa y marca con lápiz rojo las pruebas impresas de una campaña sobre la mesa de luz"}
put('C11-caso-sky', c)

# 12 Testimonio (aprobado)
put('C12-testimonio', ex('deck-decision-testimonial-intent.json'))

# 13 Clientes — sin cifras SEO (no son caso creativo)
k = ex('deck-content-clients-intent.json')
k['voice'] = {"eyebrow": "Clientes", "question": "¿Quién confía en nosotros?", "answer": ["Marcas", "líderes"]}
k['figures'] = [{"value": "+2.000", "label": "piezas aprobadas para Sky en 12 meses", "source": SKY},
                {"value": "5", "label": "mercados atendidos para Sky", "source": SKY}]
k['selection'] = {"target": "object", "label": "Brand", "participantKind": "department"}
put('C13-clientes', k)

# 14 Próximos pasos — diagnóstico creativo
n = ex('deck-decision-next-steps-intent.json')
n['voice'] = {"eyebrow": "Próximos pasos", "question": "¿Por dónde empezamos?", "answer": ["Por aquí"]}
n['body'] = 'Un diagnóstico para saber dónde está tu marca.'
n['agenda']['kicker'] = '01 · Creative Diagnostic'
n['agenda']['descriptor'] = '45 min por videollamada · baseline y siguiente fase'
n['nextSteps'] = [{"number": "02", "label": "Piloto pagado", "title": "Sample Sprint", "desc": "Acotado y gobernado, para probar el encaje con tu marca."},
                  {"number": "03", "label": "On-Going", "title": "Tu squad", "desc": "Tu squad, con métricas en vivo."}]
put('C14-siguiente', n)

n['agenda']['days']=[{"weekday":w,"day":str(x)} for w,x in zip(["Lun","Mar","Mié","Jue","Vie"],range(12,17))]
n['agenda']['summary']='Martes 13 · 11:30 · hora de Chile'
put('C14-siguiente', n)

# 15 Contraportada
put('C15-contraportada', ex('deck-close-brochure-orbit-intent.json'))
print(sorted(os.listdir('intents')))
