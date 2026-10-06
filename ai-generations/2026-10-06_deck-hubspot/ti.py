import json
# Láminas para quien evalúa desde TI (operador, 2026-10-06): integraciones, automatización determinística y agéntica,
# seguridad de la plataforma y la Ley 21.719. Se ejecuta al final de build-intents.py, con su `put` en el ámbito.
# Datos de HubSpot y de la ley: verificados en fuente oficial (ver fotos/LEEME.md § Fuentes de las láminas de TI).

put('B21-integraciones', {"role": "decision", "recipe": "decision-platform-coexistence",
  "voice": {"eyebrow": "Integraciones", "question": "¿Tengo que reemplazar mis sistemas?", "answer": ["No por", "defecto"]},
  "body": "HubSpot se conecta con lo que ya funciona. Decidimos **sistema** por sistema qué se integra y qué se migra.",
  "note": "Ejemplo ilustrativo · la decisión sale de tu inventario de sistemas",
  "platforms": [
    {"icon": "data", "base": "Tu operación", "name": "Hoy",
     "items": ["ERP y facturación", "BI y data warehouse", "Correo, calendario y Teams", "CRM y planillas actuales"]},
    {"icon": "data", "base": "HubSpot", "name": "Smart CRM",
     "items": ["Data Hub · sync bidireccional", "APIs, webhooks y objetos propios", "Marketplace de apps", "MCP para agentes"]}],
  "tableTitle": "Decisión por sistema",
  "capabilities": [
    {"capability": "ERP: clientes, productos y facturas", "verdict": "Integrar"},
    {"capability": "Data warehouse y reportes", "verdict": "Integrar"},
    {"capability": "Correo y calendario de Microsoft 365", "verdict": "Mantener"},
    {"capability": "CRM anterior y su historial", "verdict": "Migrar"},
    {"capability": "Planillas de seguimiento comercial", "verdict": "Retirar"}],
  "selectedCapability": 1})

put('B22-automatizacion', {"role": "method", "recipe": "method-staircase",
  "voice": {"eyebrow": "Automatización", "question": "¿Workflow o agente?", "answer": ["Según", "la tarea"]},
  "body": "Si la regla es fija, va un workflow: siempre igual y auditable. Donde hace falta criterio, un agente.",
  "levels": [
    {"name": "Workflow", "descriptor": "regla fija, mismo resultado"},
    {"name": "Código propio", "descriptor": "lógica a medida, versionada"},
    {"name": "Agente sugiere", "descriptor": "una persona decide"},
    {"name": "Con aprobación", "descriptor": "actúa tras tu visto bueno"},
    {"name": "Con límites", "descriptor": "actúa solo, con un tope"}],
  "note": "Cada escalón suma criterio y también supervisión.",
  "selection": {"target": "level", "level": 1, "label": "TI", "participantKind": "department"}})

put('B23-seguridad', {"role": "decision", "recipe": "decision-difference",
  "voice": {"eyebrow": "Seguridad y accesos", "question": "¿Quién ve mis datos?", "answer": ["Sólo quien", "debe"]},
  "body": "HubSpot trae los controles; nosotros los **dejamos encendidos** y documentados antes del go-live.",
  "alternative": {"kicker": "HubSpot recién creado", "title": "Controles por configurar"},
  "efeonce": {"kicker": "HubSpot que entregamos", "title": "Controles encendidos"},
  "versus": "vs",
  "rows": [
    {"alternative": "Usuarios creados a mano, uno por uno", "efeonce": "SSO y altas desde tu directorio, con SCIM"},
    {"alternative": "Todos ven todos los registros", "efeonce": "Permisos por equipo y rol, documentados"},
    {"alternative": "Datos sensibles en cualquier campo", "efeonce": "Datos sensibles cifrados, en Enterprise"},
    {"alternative": "La IA de HubSpot entrena con tus datos", "efeonce": "Entrenamiento de IA apagado desde el día uno"},
    {"alternative": "Cambios directo en producción", "efeonce": "Sandbox, pruebas e historial de cada cambio"}],
  "ownTeam": {"kicker": "¿Y mi equipo de TI?", "title": "Decide con nosotros",
    "pillars": [
      {"title": "Identidad", "description": "SSO y altas desde tu directorio"},
      {"title": "Arquitectura", "description": "Integraciones con dueño y registro"},
      {"title": "Auditoría", "description": "Accesos y cambios a la vista"}]}})

put('B24-ley', {"role": "section", "recipe": "section-cine", "layout": "purpose",
  "voice": {"eyebrow": "Ley 21.719", "question": "¿Cuándo rige la nueva ley?", "answer": ["Diciembre"]},
  "body": "Rige desde el **1 de diciembre de 2026**, con multas de hasta 20.000 UTM. Preparamos tu CRM para lo que exige.",
  "pillars": [
    {"label": "Base legal", "text": "cada contacto con su permiso y su propósito."},
    {"label": "Derechos", "text": "acceso, rectificación, supresión, oposición y portabilidad."},
    {"label": "Seguridad", "text": "accesos controlados y registro de cada cambio."}],
  "photo": {"register": "cine", "subject": "person", "plateRef": "ai-generations/2026-10-06_deck-hubspot/fotos/plates/HS3b-datos-con-permiso.png",
            "alt": "Un líder de RevOps de Efeonce sostiene en la palma una esfera de luz azul que protege los datos de una persona"}})
print('láminas de TI')

# Segunda tanda para TI (operador, 2026-10-06): dónde quedan los datos, la salida, el consumo de un workflow y clientes.
put('B25-residencia', {"role": "content", "recipe": "content-markets",
  "voice": {"eyebrow": "Residencia de datos", "question": "¿Dónde están mis datos?", "answer": ["En Estados", "Unidos"]},
  "body": "HubSpot no tiene centro de datos en Chile; si prefieres, se mueven a Europa sin costo. La ley lo permite con **garantías**, que HubSpot firma en su DPA.",
  "photo": {"register": "puesta-en-escena", "subject": "place", "plateRef": "ai-generations/2026-10-06_deck-hubspot/fotos/plates/RG2b-mapa.png",
            "alt": "Mapa del mundo hecho de puntos de luz; desde Santiago salen cuatro arcos azules hacia las regiones de datos de HubSpot en EE. UU., Canadá, Fráncfort y Australia"},
  "markets": [
    {"country": "Canadá", "city": "Región Canadá", "node": [990, 337], "side": "left"},
    {"country": "EE. UU.", "city": "Región Este", "node": [977, 381], "side": "right"},
    {"country": "Alemania", "city": "Fráncfort", "node": [1236, 337], "side": "right"},
    {"country": "Australia", "city": "Región Australia", "node": [1691, 659], "side": "left"},
    {"country": "Chile", "city": "Tu empresa", "node": [932, 660], "side": "left"}]})

put('B26-salida', {"role": "content", "recipe": "content-bullets",
  "voice": {"eyebrow": "Sin amarras", "question": "¿Y si mañana nos vamos?", "answer": ["Te llevas todo"]},
  "progress": {"sections": 4, "current": 3},
  "items": [
    {"title": "Tus datos, exportables", "desc": "Exportas registros y propiedades cuando quieras, sin pedirle permiso a nadie."},
    {"title": "API con versiones estables", "desc": "Todo se lee por API, con versiones que HubSpot sostiene al menos 18 meses."},
    {"title": "Lo borrado se recupera", "desc": "Hasta 90 días para restaurar registros eliminados, en todos los planes."},
    {"title": "Tu arquitectura, escrita", "desc": "Modelo de datos, integraciones y workflows quedan documentados y son tuyos."}],
  "selected": 3, "selection": {"target": "object", "label": "TI", "participantKind": "department"}})

put('B27-workflow-creditos', {"role": "decision", "recipe": "decision-ai-market",
  "voice": {"eyebrow": "Workflows y créditos", "question": "¿Un workflow gasta créditos?", "answer": ["Si usa IA"]},
  "body": "Las reglas fijas no consumen. Cada acción de IA dentro de un workflow sí, y la **medimos** antes de activarla.",
  "figures": [
    {"value": "10", "label": "créditos por cada acción de IA en un workflow.", "detail": "Unos USD 0,10 por acción, al precio de lista.",
     "source": "HubSpot", "year": "2026", "sourceLogo": HUBSPOT_LOGO},
    {"value": "0", "label": "créditos gasta un workflow sin IA.", "detail": "Asignar, notificar o actualizar un registro no consume.",
     "source": "HubSpot", "year": "2026", "sourceLogo": HUBSPOT_LOGO},
    {"value": "300", "label": "acciones de IA al mes con los créditos de Pro.", "detail": "Pro incluye 3.000 créditos; Enterprise, 5.000.",
     "source": "HubSpot", "year": "2026", "sourceLogo": HUBSPOT_LOGO}]})

CL = 'src/lib/artifact-composer/catalogs/deck-axis/assets/clients/'
put('B28-clientes', {"role": "content", "recipe": "content-clients",
  "voice": {"eyebrow": "Clientes", "question": "¿Con quién trabajan?", "answer": ["+90", "empresas"]},
  "progress": {"sections": 4, "current": 4},
  "figures": [
    {"value": "+127%", "label": "tráfico orgánico de Sky frente a LATAM Airlines", "source": "caso publicado de Sky Airlines"},
    {"value": "+180%", "label": "ventas digitales de Bresler", "source": "caso publicado de Bresler"}],
  "selected": 1,
  "clients": [{"path": CL + f, "alt": a} for f, a in [
    ("sky.svg", "Sky Airline"), ("berel.svg", "Berel"), ("bresler.svg", "Bresler"), ("carozzi.svg", "Carozzi"),
    ("aguas-andinas.svg", "Aguas Andinas"), ("anam.svg", "ANAM"), ("marca-chile.svg", "Marca Chile"),
    ("gobierno-santiago.svg", "Gobierno de Santiago"), ("universidad-temuco.svg", "Universidad Católica de Temuco")]],
  "markets": {"title": "Operamos en", "text": "Chile, EE. UU., Colombia, México y Perú"},
  "selection": {"target": "object", "label": "Efeonce", "participantKind": "department"}})
d = json.load(open('intents/B28-clientes.json', encoding='utf-8')); d['theme'] = 'light'; d['line'] = 'growth'
json.dump(d, open('intents/B28-clientes.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('láminas de TI, segunda tanda')
