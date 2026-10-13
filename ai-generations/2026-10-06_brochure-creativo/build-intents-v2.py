# Brochure · Agencia Creativa v2 (operador, 2026-10-06): el paraguas es la Agencia Creativa; la voz sigue la regla
# del 2026-10-06 (titular de decisión por defecto, par en ~1 de cada 3). Este script sólo arma las láminas CON PAR,
# que salen del motor; las de titular se arman en el canvas (build-canvas-v2.py).
import json, os
BASE = {"contract": "efeonce.surface-composition", "version": "0.1.2", "surface": "deck", "format": "16x9", "theme": "dark"}
EX = '../../src/lib/brand-surfaces/examples/'
os.makedirs('intents-v2', exist_ok=True)
def ex(name):
    d = json.load(open(EX + name, encoding='utf-8'))
    for k in BASE:
        if k != 'theme': d.pop(k, None)
    return d
def put(name, d):
    out = dict(BASE); out.update(d); out['line'] = 'growth' if out.get('theme') == 'light' else 'brand'; out['use'] = 'brochure'
    json.dump(out, open(f'intents-v2/{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

c = ex('deck-cover-brochure-line-brand-intent.json')
c['voice'] = {"eyebrow": "Brochure · Agencia Creativa", "question": "¿Mi equipo puede producir más?", "answer": ["Mucho más"]}
put('A01-portada', c)

t = ex('deck-content-team-intent.json')
SQ = 'src/lib/artifact-composer/catalogs/deck-axis/assets/squad/'
def m(slug, name, role): return {"photo": {"path": SQ + f'squad-{slug}.png', "alt": f'{name}, {role}'}, "name": name, "role": role}
t['voice'] = {"eyebrow": "Tu equipo", "question": "¿Quién trabaja en mi marca?", "answer": ["Personas", "reales"]}
t['body'] = 'Un squad que orbita tu marca y **un** solo interlocutor: tu Responsable de Cuenta.'
t['team'] = [m('andres', 'Andrés', 'Senior Visual Designer'), m('valentina', 'Valentina', 'Content Lead'),
             m('julio', 'Julio', 'Responsable de Cuenta'), m('daniela', 'Daniela', 'Creative Operations Lead'),
             m('melkin', 'Melkin', 'Senior Visual Designer')]
put('A05-equipo', t)

s = ex('deck-proposal-service-creative-intent.json')
s['voice'] = {"eyebrow": "Cómo empezar", "question": "¿Y si no me convence?", "answer": ["Empiezas chico"]}
s['body'] = 'Un Creative Sprint pagado y acotado prueba el encaje con tu marca antes de sumar capacidad.'
s['proof'] = {"text": "Sky: +2.000 piezas aprobadas en 12 meses, 88 % a tiempo.", "source": "caso publicado de Sky Airlines"}
s['photo'] = {"register": "cine", "subject": "person", "plateRef": "ai-generations/2026-09-27_secciones-partidas/plates/SP2b-dias-no-meses-isotipo.png",
              "alt": "Un creativo de Efeonce con polo cuelga pruebas impresas en una pared de referencias y mira hacia atrás sonriendo"}
put('A09-sprint', s)

put('A10-control', {"role": "content", "recipe": "content-bullets",
  "voice": {"eyebrow": "Tu marca, tus reglas", "question": "¿Pierdo el control de mi marca?", "answer": ["Nunca"]},
  "items": [
    {"title": "Apruebas tú", "desc": "La aprobación final y los claims son tuyos: nada sale sin tu visto bueno."},
    {"title": "Tu prioridad manda", "desc": "Decides qué se produce primero en la priorización de cada semana."},
    {"title": "Rondas pactadas", "desc": "De dos a tres rondas por pieza; la siguiente se conversa como cambio."},
    {"title": "Derechos por escrito", "desc": "Uso por canal, territorio y plazo, definidos antes de producir."}],
  "progress": {"sections": 4, "current": 3},
  "selected": 1, "selection": {"target": "object", "label": "Cliente", "participantKind": "department"}})

n = ex('deck-decision-next-steps-intent.json')
n['voice'] = {"eyebrow": "Próximos pasos", "question": "¿Qué recibo primero?", "answer": ["Un plan"]}
n['body'] = 'Un diagnóstico con tu baseline y la fase que sigue.'
n['agenda']['kicker'] = '01 · Creative Diagnostic'
n['agenda']['descriptor'] = '45 min por videollamada · baseline y siguiente fase'
n['agenda']['days'] = [{"weekday": w, "day": str(x)} for w, x in zip(["Lun", "Mar", "Mié", "Jue", "Vie"], range(12, 17))]
n['agenda']['summary'] = 'Martes 13 · 11:30 · hora de Chile'
n['nextSteps'] = [{"number": "02", "label": "Piloto pagado", "title": "Sample Sprint", "desc": "Acotado y gobernado, para probar el encaje con tu marca."},
                  {"number": "03", "label": "On-Going", "title": "Tu squad", "desc": "Tu squad, con métricas en vivo."}]
put('A15-siguiente', n)

put('A16-contraportada', ex('deck-close-brochure-orbit-intent.json'))
print(sorted(os.listdir('intents-v2')))
