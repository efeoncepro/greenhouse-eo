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
