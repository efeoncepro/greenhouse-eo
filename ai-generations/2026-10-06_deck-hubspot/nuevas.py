# Láminas nuevas del deck HubSpot (operador, 2026-10-06): licencias con criterio, HubSpot Credits, el CRM que se
# actualiza solo y datos + arquitectura escalable. Dos diseñadas y dos cine con plate propio (HS1, HS2b).
# Se ejecuta al final de build-intents.py, con su `put` en el ámbito.

HUBSPOT_LOGO = 'public/images/logos/axis/hubspot-logotype.svg'

put('B17-licencias', {"role": "content", "recipe": "content-bullets",
  "voice": {"eyebrow": "Licencias con criterio", "question": "¿Qué licencias de HubSpot compro?", "answer": ["Las que usas"]},
  "progress": {"sections": 4, "current": 2},
  "items": [
    {"title": "Seats por rol", "desc": "Contamos quién entra, a qué Hub y para qué antes de cotizar un solo seat."},
    {"title": "El tier que usas hoy", "desc": "Starter, Pro o Enterprise según tu operación actual, con la ruta de upgrade escrita."},
    {"title": "Cada Hub con su caso de uso", "desc": "Un Hub entra con su caso, su dueño y su fecha de puesta en marcha. Nada por si acaso."},
    {"title": "Uso antes de renovar", "desc": "Antes de cada renovación revisamos uso y adopción, y ajustamos lo que sobra."}],
  "selected": 3, "selection": {"target": "object", "label": "Cliente", "participantKind": "department"}})

# Créditos con criterio (operador, 2026-10-06): las acciones clave de HubSpot consumen créditos sí o sí; el criterio es
# asesorar CUÁNTOS necesita el cliente según lo que hará cada agente. La cifra del centro explica por qué «a medida».
put('B18-creditos', {"role": "decision", "recipe": "decision-ai-market",
  "voice": {"eyebrow": "HubSpot Credits", "question": "¿Cuántos créditos necesito?", "answer": ["A medida"]},
  "body": "Los agentes y la IA de HubSpot funcionan con créditos. Calculamos cuántos necesitas según lo que hará **cada agente**.",
  "figures": [
    {"value": "50", "label": "créditos por conversación que resuelve Customer Agent.", "detail": "Cada acción de IA en un workflow usa 10.",
     "source": "HubSpot", "year": "2026", "sourceLogo": HUBSPOT_LOGO},
    {"value": "0", "label": "créditos pasan al mes siguiente.", "detail": "Por eso se calculan: ni de más, que vencen, ni de menos.",
     "source": "HubSpot", "year": "2026", "sourceLogo": HUBSPOT_LOGO},
    {"value": "100", "label": "créditos por cada lead que recomienda Prospecting Agent.", "detail": "Lo extra cuesta USD 10 por cada 1.000 créditos.",
     "source": "HubSpot", "year": "2026", "sourceLogo": HUBSPOT_LOGO}]})

put('B19-crm-solo', {"role": "proposal", "recipe": "proposal-cinematic", "layout": "hero",
  "voice": {"eyebrow": "El nuevo Smart CRM", "question": "¿Sigo llenando el CRM?", "answer": ["Ya no"]},
  "body": "El CRM de HubSpot se llena con llamadas, emails y reuniones. Lo dejamos configurado y confiable.",
  "photo": {"register": "cine", "subject": "nexa", "plateRef": "ai-generations/2026-10-06_deck-hubspot/fotos/plates/CMP-crm-B.png",
            "alt": "Nexa, con la chaqueta de Efeonce, mira a cámara junto a un registro de cliente de luz que se llena solo con tres haces que vienen de una llamada, un email y una reunión"}})

put('B20-datos', {"role": "section", "recipe": "section-cine", "layout": "purpose",
  "voice": {"eyebrow": "Datos y arquitectura", "question": "¿Cómo escala mi CRM?", "answer": ["Ordenado"]},
  "body": "Antes de automatizar o sumar agentes, ponemos los datos **en orden** y el CRM sobre una base que crece.",
  "pillars": [
    {"label": "Datos en orden", "text": "duplicados fuera, propiedades con dueño y una sola fuente de verdad."},
    {"label": "Modelo que escala", "text": "objetos, asociaciones y pipelines pensados para crecer."},
    {"label": "Integración gobernada", "text": "cada sync con su dirección, su dueño y su registro de errores."}],
  "photo": {"register": "cine", "subject": "person", "plateRef": "ai-generations/2026-10-06_deck-hubspot/fotos/plates/HS2d-datos-en-orden.png",
            "alt": "Un líder de RevOps de Efeonce, con la chaqueta, levanta la mano y miles de partículas de datos en desorden se ordenan en una red de capas de luz que crece hacia el fondo"}})
print('láminas nuevas')
