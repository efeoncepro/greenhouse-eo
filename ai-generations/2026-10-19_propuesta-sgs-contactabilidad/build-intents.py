"""Intents de la propuesta SGS Chile · trazabilidad comercial.

Cada lámina sale de una receta aprobada de La órbita y se compone con `pnpm brand:compose`.
Nada se dibuja a mano: portada, contraportada, selección, cursores e indicador los pinta el compositor.
Correr desde la raíz del repo: python3 ai-generations/2026-10-19_propuesta-sgs-contactabilidad/build-intents.py
"""
import json, os

HERE = 'ai-generations/2026-10-19_propuesta-sgs-contactabilidad'
EX = 'src/lib/brand-surfaces/examples/'
BASE = {"contract": "efeonce.surface-composition", "version": "0.1.2", "surface": "deck", "format": "16x9"}
LINE = 'revenue-salesforce'
os.makedirs(f'{HERE}/intents', exist_ok=True)


def ex(name):
    return json.load(open(EX + name, encoding='utf-8'))


def put(name, d):
    out = dict(BASE)
    out.update({"theme": "dark", "use": "proposal"})
    out.update(d)
    out.setdefault('line', LINE)
    json.dump(out, open(f'{HERE}/intents/{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)


SGS = {"target": "object", "label": "SGS", "participantKind": "role"}

# 01 · Portada de propuesta sin foto (órbita gigante), con el marcador del logo del cliente.
put('P01-portada', {
    "role": "cover", "recipe": "cover-proposal", "layout": "orbit",
    # La pregunta es obligatoria en la receta; quitar-pregunta-portada.mjs la retira (decisión del operador, 2026-10-19:
    # la portada dice lo que es). Su texto no se publica.
    "voice": {"eyebrow": "Trazabilidad comercial · Octubre 2026", "question": "¿Qué es?", "answer": ["Propuesta", "técnica"]},
    "body": "Correo, llamadas y WhatsApp en Salesforce,\nsin trabajo manual\nPreparada para **SGS Chile** · Confidencial",
    "selection": {"target": "client-logo", "label": "SGS", "participantKind": "role"},
    "column": {"topPx": 220},
    "clientLogo": {"path": "ai-generations/2026-10-19_propuesta-sgs-contactabilidad/logos-cliente/sgs-logo-sobre-oscuro.svg", "alt": "SGS"},
    "partnerMark": {"mode": "badge", "readbackRef": "salesforce-partner-authorization-2026-09-29"},
})

put('P02-decidir', {
    "role": "content", "recipe": "content-text",
    "voice": {"eyebrow": "Lo que pedimos decidir", "question": "¿Qué les pedimos?", "answer": ["Poco"]},
    "progress": {"sections": 5, "current": 1},
    "body": "Un piloto en SGS Chile y habilitaciones acotadas y reversibles de la región.",
    "points": [
        {"name": "Piloto", "text": "un equipo comercial de Chile"},
        {"name": "Región", "text": "habilitaciones acotadas"},
        {"name": "Efeonce", "text": "diseña, construye y opera"},
    ],
    "selection": {"target": "answer", "label": "SGS", "participantKind": "role"},
})

put('P03-hoy', {
    "role": "content", "recipe": "content-bullets",
    "voice": {"eyebrow": "Cómo están hoy", "question": "¿Qué queda en Salesforce?", "answer": ["Muy poco"]},
    "progress": {"sections": 5, "current": 1},
    "items": [
        {"title": "Reuniones", "desc": "Se registran solas cuando el ejecutivo agenda con el cliente."},
        {"title": "Correo", "desc": "Tiene seguimiento, aunque falta confirmar que esté activo para todo el equipo."},
        {"title": "Llamadas y negocios", "desc": "Se anotan a mano: compiten con el tiempo de venta y el historial queda incompleto."},
        {"title": "WhatsApp", "desc": "No queda registro: hoy no se sabe cuántas veces se contactó a un cliente ni por qué canal."},
    ],
    "selected": 4,
    "selection": {"target": "object", "label": "Comercial", "participantKind": "department", "anchor": "bottom-start"},
})

# Lámina 7: receta proposal-cinematic (layout service) de la línea Salesforce, con la foto aprobada NXSF1 del deck de
# práctica Salesforce (Nexa sostiene el anillo de luz donde se trenzan los haces: la conexión).
p = {
    "role": "proposal", "recipe": "proposal-cinematic", "layout": "service",
    "voice": {"eyebrow": "Nuestra propuesta · Trazabilidad", "question": "¿Seguirán anotando a mano?", "answer": ["Ya no"]},
    "body": "Proponemos que correo, llamadas y WhatsApp queden solos en la ficha de Salesforce, en etapas que al inicio no la tocan.",
    "steps": [
        {"glyph": "checklist", "kicker": "Semanas 1 a 4", "name": "Diagnóstico y correo"},
        {"glyph": "llamada", "kicker": "Semanas 5 a 16", "name": "Piloto en Chile"},
        {"glyph": "crm", "kicker": "Tras decidir", "name": "Conexión a Salesforce"},
        {"glyph": "informe", "kicker": "Mensual", "name": "Operación"},
    ],
    "note": "Sin grabación: se registrará el contacto, no el contenido.",
    "photo": {"register": "cine", "subject": "nexa", "plateRef": "ai-generations/2026-09-29_deck-salesforce/plates/NXSF1-nexa-conexion.png",
              "alt": "Nexa, con la chaqueta navy de Efeonce, mira a cámara y sostiene sobre la palma un anillo de luz celeste en el que se trenzan haces de partículas"},
    "selection": {"target": "answer", "label": "Comercial", "participantKind": "department", "anchor": "bottom-end"},
}
put('P04-solucion', p)

put('P05-panel', {
    "role": "content", "recipe": "content-day-live-console",
    "voice": {"eyebrow": "Panel de contactabilidad", "question": "¿Dónde lo verá la jefatura?", "answer": ["En su", "panel"]},
    "body": "Efeonce Insights mostrará intentos, contactos y clientes sin contacto, por **cuenta**, canal y equipo.",
    "console": {
        "title": "Contactabilidad · equipo piloto",
        "subtitle": "Correo · Llamadas · WhatsApp",
        "sampleMark": "Datos de muestra",
        "metrics": [
            {"value": "312", "label": "Intentos", "detail": "esta semana"},
            {"value": "68 %", "label": "Con contacto", "detail": "de los intentos"},
            {"value": "14", "label": "Sin contacto", "detail": "hace 30 días o más"},
        ],
        "checks": [
            {"label": "Clientes clave contactados este mes", "status": "Al día", "done": True},
            {"label": "Seguimiento de cotizaciones abiertas", "status": "Al día", "done": True},
            {"label": "Ejecutivos con número de empresa", "status": "11 de 12", "done": False},
            {"label": "Cuentas sin contacto en 30 días", "status": "14 por revisar", "done": False},
        ],
        "review": {"kicker": "Revisión semanal", "title": "Lunes 9:00 · 30 min con las jefaturas", "cta": "Ver panel"},
    },
    "selection": {"target": "object", "label": "Jefatura", "participantKind": "role"},
})

put('P06-alternativas', {
    "role": "decision", "recipe": "decision-provider-fit",
    "voice": {"eyebrow": "Alternativas consideradas", "question": "¿Por qué Aircall?", "answer": ["Por el", "celular"]},
    "body": "El ejecutivo trabaja desde su celular y el piloto parte **sin** tocar Salesforce.",
    "note": "Si la región define Salesforce Voice, Aircall también se integra por esa vía.",
    "verdicts": [
        {"glyph": "crm", "title": "Salesforce", "description": "Su marcador no opera en Chile y su telefonía es de escritorio."},
        {"glyph": "llamada", "title": "Aircall", "description": "App en el celular con número de empresa y conector a Salesforce."},
        {"glyph": "social", "title": "Su número", "description": "El contacto queda en el teléfono personal y se va con la persona."},
        {"glyph": "seguridad", "title": "No oficial", "description": "Leen WhatsApp fuera del canal oficial: riesgo de bloqueo."},
    ],
    "selectedVerdict": 2,
    "selection": {"target": "object", "label": "Comercial", "participantKind": "department"},
})

put('P07-etapas', {
    "role": "method", "recipe": "method-waves",
    "voice": {"eyebrow": "Cómo se llega", "question": "¿Por dónde empezamos?", "answer": ["Por", "Chile"]},
    "body": "Las tres primeras etapas no cambian Salesforce: la solicitud a la región llega con **datos**.",
    "steps": [
        {"kicker": "Empieza aquí", "name": "Diagnóstico", "desc": "Procesos, reglas de seguimiento y línea base del equipo."},
        {"kicker": "Sin la región", "name": "Piloto", "desc": "Correo, llamadas y WhatsApp en un equipo de Chile, con su panel."},
        {"kicker": "Con la región", "name": "Conexión", "desc": "Cada contacto quedará en la ficha del cliente en Salesforce."},
        {"kicker": "On-Going", "name": "Operación", "desc": "Soporte, informe mensual y mejora continua."},
    ],
    "selectedStep": 1,
    "selection": SGS,
})

put('P08-region', {
    "role": "content", "recipe": "content-bullets",
    "voice": {"eyebrow": "Lo que pedimos a la región", "question": "¿Qué le pedimos a la región?", "answer": ["Lo mínimo"]},
    "progress": {"sections": 5, "current": 3},
    "items": [
        {"title": "Captura de correo", "desc": "Revisar que el registro de correos esté activo para el equipo piloto."},
        {"title": "Conector de Aircall", "desc": "Instalarlo solo para los usuarios del piloto, sin desarrollo."},
        {"title": "Integración de WhatsApp", "desc": "Un acceso de API con permisos mínimos y el valor «WhatsApp» como actividad."},
        {"title": "Lectura para el panel", "desc": "Acceso de lectura a los conteos de actividad. Todo es reversible."},
    ],
    "selected": 2,
    "selection": {"target": "object", "label": "Región", "participantKind": "department", "anchor": "top-start"},
})

put('P09-adopcion', {
    "role": "content", "recipe": "content-text",
    "voice": {"eyebrow": "Adopción", "question": "¿Cómo se adopta?", "answer": ["Juntos"]},
    "progress": {"sections": 5, "current": 3},
    "body": "Alineamos procesos, capacitamos por rol y acompañamos al equipo hasta que la nueva forma quede.",
    "points": [
        {"name": "Procesos", "text": "definiciones y reglas comunes"},
        {"name": "Capacitación", "text": "por rol, en vivo y en video"},
        {"name": "Acompañamiento", "text": "convivencia y soporte semanal"},
    ],
    "selection": {"target": "answer", "label": "SGS", "participantKind": "role"},
})

put('P10-riesgos', {
    "role": "decision", "recipe": "decision-risk", "theme": "light", "line": "growth",
    "voice": {"eyebrow": "Riesgo controlado", "question": "¿Y si no funciona?", "answer": ["Empiezan", "chico"]},
    "progress": {"sections": 5, "current": 4},
    "body": "Cada riesgo tiene su cobertura escrita. Y el primer paso es un piloto acotado, no un contrato largo.",
    "headers": {"risk": "El riesgo", "how": "Cómo lo cubrimos"},
    "risks": [
        {"risk": "Que sigan con su número", "name": "Convivencia guiada", "how": "Un periodo acordado en que ambos conviven, con apoyo semanal."},
        {"risk": "Que se lea como control", "name": "Cuentas, no personas", "how": "El panel mide la cobertura de clientes, no evalúa a cada ejecutivo."},
        {"risk": "Datos de clientes", "name": "Contacto, no contenido", "how": "Se guarda quién, cuándo y por qué canal; nunca la conversación."},
        {"risk": "Que la región demore", "name": "Valor desde Chile", "how": "Las primeras etapas funcionan sin cambios en Salesforce."},
    ],
    "selected": 1,
    "selection": SGS,
})

put('P11-plan', {
    "role": "decision", "recipe": "decision-plan",
    "voice": {"eyebrow": "Plan del piloto", "question": "¿Qué pasará al empezar?", "answer": ["Línea base"]},
    "body": "**112** días como máximo: cuatro semanas de línea base y hasta doce de piloto, con umbrales acordados antes.",
    "horizon": 112, "currentStop": 1,
    "stops": [
        {"range": "Días 1–28", "title": "Diagnóstico", "desc": "Procesos, registro de correo y línea base, antes de cambiar nada."},
        {"range": "Días 29–112", "title": "Piloto", "desc": "Hasta 12 semanas con Aircall, WhatsApp y el panel, con revisión semanal."},
        {"range": "Día 112", "title": "Decisión", "desc": "Contra la línea base: seguir, ajustar o detener. Si siguen, se pide la conexión."},
    ],
})

put('P12-inversion', {
    "role": "content", "recipe": "content-pricing",
    "voice": {"eyebrow": "Inversión", "question": "¿Cómo se invierte?", "answer": ["Por", "etapas"]},
    "body": "Cada etapa se cotiza por separado y se avanza a la siguiente solo si la anterior cumplió.",
    "legal": "Valores netos, IVA no incluido. Licencias de Aircall y consumo de WhatsApp, aparte.",
    "period": "neto + IVA",
    "recommended": 1, "recommendedLabel": "Recomendado",
    "plans": [
        {"name": "Piloto", "tagline": "Etapas 0 a 2", "features": ["Diagnóstico y procesos", "Correo, llamadas y WhatsApp", "Panel del piloto", "Capacitación por rol"]},
        {"name": "Conexión", "tagline": "Etapa 3, con la región", "features": ["Conector de Aircall", "Integración de WhatsApp", "Registro en Salesforce", "Pruebas con la región"]},
        {"name": "Operación", "tagline": "Etapa 4, mensual", "features": ["Panel e informe mensual", "Soporte a usuarios", "Altas de nuevos equipos", "Mejora continua"]},
    ],
    "selection": SGS,
})

put('P13-pasos', {
    "role": "decision", "recipe": "decision-next-steps",
    "voice": {"eyebrow": "Próximos pasos", "question": "¿Y ahora qué sigue?", "answer": ["Revisarlo"]},
    "body": "Una revisión de **30 minutos** para ajustarlo a su operación.",
    "agenda": {
        "kicker": "01 · Revisión del caso",
        "title": "Agenda la revisión",
        "descriptor": "30 min por Teams · con excelencia comercial y las jefaturas",
        "days": [{"weekday": "Lun", "day": "26"}, {"weekday": "Mar", "day": "27"}, {"weekday": "Mié", "day": "28"}, {"weekday": "Jue", "day": "29"}, {"weekday": "Vie", "day": "30"}],
        "times": ["09:30", "11:30", "15:00", "17:00"],
        "chosen": {"day": 2, "time": 2},
        "summary": "Martes 27 · 11:30 · hora de Chile",
        "cta": "Agenda la revisión",
    },
    "nextSteps": [
        {"number": "02", "label": "Datos del piloto", "title": "Equipo piloto", "desc": "Quiénes entran al piloto y con qué números de empresa."},
        {"number": "03", "label": "Con la región", "title": "Habilitaciones", "desc": "La solicitud a la región, con los datos del piloto."},
    ],
})

# 14 · Contraportada de propuesta aprobada para la línea Salesforce (SF19): foto de Nexa, eslogan, insignia.
c = ex('deck-close-proposal-horizon-revenue-salesforce-intent.json')
for k in list(BASE) + ['line']:
    c.pop(k, None)
put('P14-contraportada', c)

print('ok', len(os.listdir(f'{HERE}/intents')))
