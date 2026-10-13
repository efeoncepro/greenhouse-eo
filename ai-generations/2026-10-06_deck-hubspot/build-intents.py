import json, copy, os
BASE = {"contract": "efeonce.surface-composition", "version": "0.1.2", "surface": "deck", "format": "16x9", "theme": "dark"}
EX = '../../src/lib/brand-surfaces/examples/'
def ex(name): return json.load(open(EX + name, encoding='utf-8'))
def put(name, d, use='brochure'):
    out = dict(BASE); out.update(d); out['line'] = 'revenue-hubspot'; out.setdefault('use', use)
    json.dump(out, open(f'intents/{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

# 01 Portada — la de línea revenue-hubspot aprobada (RV1b), con la insignia Gold (readback 2026-10-06)
c = ex('deck-cover-brochure-line-revenue-intent.json')
c['voice'] = {'eyebrow': 'Brochure · Servicios HubSpot', 'question': '¿Tu HubSpot ya actúa?', 'answer': ['Por ti']}
c['partnerMark'] = {"mode": "badge", "readbackRef": "hubspot-partner-readback-2026-10-06"}
c['photo']['plateRef'] = 'ai-generations/2026-10-06_deck-hubspot/fotos/plates/CMP-portada-B.png'
for k in BASE: c.pop(k, None)
put('B01-portada', c)

# 02 Propuesta sobria RevOps (ya es HubSpot)
p = ex('deck-proposal-service-revops-intent.json')
for k in BASE: p.pop(k, None)
p['use'] = 'brochure'
put('B02-propuesta', p)

put('B03-uno', {"role": "content", "recipe": "content-one-platform",
  "voice": {"eyebrow": "HubSpot · RevOps y CRM", "question": "¿Cuántos HubSpot tienes?", "answer": ["Uno"]},
  "body": "Conectamos marketing, ventas, servicio, revenue y datos sobre **un** Smart CRM: una sola operación alrededor del cliente.",
  "workAreas": [
    {"icon": "marketing", "area": "Marketing", "product": "Marketing Hub"},
    {"icon": "sales", "area": "Ventas", "product": "Sales Hub"},
    {"icon": "service", "area": "Servicio", "product": "Service Hub"},
    {"icon": "revenue", "area": "Revenue", "product": "Revenue Hub"},
    {"icon": "data", "area": "Datos", "product": "Data Hub"}],
  "account": {"name": "Tu cliente", "initials": "TC", "subtitle": "Un solo registro, todos los equipos",
    "facts": [{"label": "Negocio", "value": "En negociación"}, {"label": "Ticket abierto", "value": "Dentro del SLA"},
              {"label": "Secuencia", "value": "Nurturing · paso 3"}, {"label": "Suscripción", "value": "Email ✓ · SMS —"}]}})

f = ex('deck-decision-provider-fit-intent.json')
for k in BASE: f.pop(k, None)
f['voice']['question'] = '¿HubSpot o Salesforce?'
f['verdicts'] = [f['verdicts'][1], f['verdicts'][0], f['verdicts'][2], f['verdicts'][3]]
f['selectedVerdict'] = 1
put('B04-encaje', f)

put('B05-servicios', {"role": "content", "recipe": "content-service-lanes",
  "voice": {"eyebrow": "Nuestros servicios HubSpot", "question": "¿Qué hacemos en HubSpot?", "answer": ["Todo el ciclo"]},
  "lanes": [
    {"icon": "marketing", "title": "Marketing, contenido y AEO", "products": "Marketing Hub · Content Hub", "description": "Demanda, campañas y atribución, visibles en buscadores y en la IA."},
    {"icon": "sales", "title": "Ventas y pipeline", "products": "Sales Hub", "description": "Pipeline priorizado, secuencias, forecast y la siguiente acción."},
    {"icon": "revenue", "title": "Revenue lifecycle", "products": "Revenue Hub", "description": "De la cotización al contrato, la renovación y la expansión."},
    {"icon": "service", "title": "Servicio y customer success", "products": "Service Hub", "description": "Tickets, SLA, knowledge y salud de cada cuenta."},
    {"icon": "data", "title": "Datos e integración", "products": "Data Hub · Smart CRM", "description": "Datos confiables y sincronizados para equipos y agentes."},
    {"icon": "service", "title": "Agentes y operación", "products": "Agent Hub · Customer Agent", "description": "Agentes con ficha, supervisión humana y consumo medido."}],
  "phases": ["Evaluación sin costo", "Blueprint e implementación", "Optimización y adopción", "Operación gestionada"]})

a = ex('deck-method-agent-supervisor-intent.json')
for k in BASE: a.pop(k, None)
a['voice']['eyebrow'] = 'Agent Hub · equipos híbridos'
a['agents'][0]['title'] = 'Tickets'
a['agents'][0]['job'] = 'Clasifica, responde con knowledge y escala.'
a['agents'][1]['title'] = 'Prospección'
a['agents'][1]['job'] = 'Investiga cuentas y sugiere el siguiente paso.'
a['agents'][1]['levels'][0]['value'] = 'Contactos y actividad'
a['agents'][1]['levels'][3]['value'] = 'Enviar sin revisión'
a['pendingApproval'] = 'Respuesta propuesta al ticket #4821'
put('B06-agentes', a)

l = ex('deck-content-day-live-approval-intent.json')
for k in BASE: l.pop(k, None)
l['voice']['eyebrow'] = 'Customer Agent · supervisión en vivo'
l['body'] = 'El agente propone con evidencia, tú **apruebas** en Teams y el cambio queda ejecutado y registrado.'
l['channel'] = {"tool": "teams", "name": "Servicio · aprobaciones"}
l['agent'] = {"icon": "service", "name": "Customer Agent", "badge": "Service Hub"}
l['message'] = 'Ticket **#4821**: el cliente pide reembolso de **[MONTO]**. Según la política 3.2 corresponde aprobarlo.'
l['executed'] = {"icon": "service", "title": "Ejecutado en Service Hub", "text": "Reembolso aplicado, cliente notificado y registro de quién aprobó y cuándo."}
l['loop'][1]['detail'] = 'La supervisora, en Teams'
l['loop'][2]['detail'] = 'En Service Hub'
put('B07-aprobacion', l)

i = ex('deck-method-identity-consent-intent.json')
for k in BASE: i.pop(k, None)
i['voice']['eyebrow'] = 'Smart CRM · identidad y consentimiento'
i['profileTitle'] = 'Un contacto, 5 fuentes'
i['activations'] = [{"icon": "marketing", "title": "Workflow", "detail": "Sólo con email ✓", "channel": "Email"},
                    {"icon": "service", "title": "Customer Agent", "detail": "Por WhatsApp ✓", "channel": "WhatsApp"},
                    {"icon": "sales", "title": "Siguiente acción", "detail": "Llamada del ejecutivo", "channel": "Llamada"}]
put('B08-permiso', i)

m = ex('deck-method-migration-reconcile-intent.json')
for k in BASE: m.pop(k, None)
m['voice']['eyebrow'] = 'Migración a HubSpot'
m['stages'][0]['description'] = 'registros de empresas y contactos'
put('B09-migracion', m)

d = ex('deck-decision-diagnosis-verdict-intent.json')
for k in BASE: d.pop(k, None)
d['voice']['eyebrow'] = 'Evaluación inicial · sin costo'
d['reportTitle'] = 'Evaluación de encaje y arquitectura'
d['reportSubtitle'] = 'HubSpot · estado actual, encaje y roadmap'
d['verdictCondition'] = 'Condición: ordenar datos y consentimiento antes de automatizar'
d['risks'] = ['Duplicados en contactos', 'Workflows sin dueño', 'Propiedades sin gobierno']
d['recordText'] = 'Cada hallazgo con su fuente: el portal, los datos y las entrevistas con tu equipo.'
d['waves'] = [{"name": "Ola 1", "title": "Datos y Smart CRM", "kicker": "Base"},
              {"name": "Ola 2", "title": "Pipeline y servicio con SLA", "kicker": "Primer valor"},
              {"name": "Ola 3", "title": "Customer Agent supervisado", "kicker": "Agentes"}]
put('B10-evaluacion', d)

w = ex('deck-method-waves-intent.json')
for k in BASE: w.pop(k, None)
w['voice']['eyebrow'] = 'Agent Hub · equipos híbridos'
put('B11-olas', w)

r = ex('deck-content-day-release-cycle-intent.json')
for k in BASE: r.pop(k, None)
r['body'] = 'Nada llega a producción sin tu **aprobación**: lo pruebas en un sandbox de HubSpot y lo ves explicado en un video corto.'
r['release'].update({"kicker": "Release 14 · Service Hub", "title": "Enrutamiento de tickets por prioridad", "icon": "service", "videoCaption": "Qué cambia en tu Help Desk, en 3 minutos"})
r['tools'][3] = {"tool": "hs-icon:data", "kicker": "HubSpot", "label": "Pruebas en sandbox"}
put('B12-dia-a-dia', r)

v = ex('deck-content-day-live-library-intent.json')
for k in BASE: v.pop(k, None)
v['body'] = 'Tutoriales cortos en video, grabados sobre **tu** HubSpot: responden «¿cómo hago…?» sin agendar una reunión.'
v['library']['kicker'] = 'En Loom · sobre tu portal'
v['videos'] = [{"icon": "sales", "role": "Ventas", "title": "Cómo registrar un negocio", "duration": "2:40"},
               {"icon": "service", "role": "Servicio", "title": "Cerrar un ticket con knowledge", "duration": "3:05"},
               {"icon": "marketing", "role": "Marketing", "title": "Probar un workflow antes de activarlo", "duration": "4:12"},
               {"icon": "revenue", "role": "Revenue", "title": "Crear una cotización y su contrato", "duration": "3:30"}]
v['stats'][2]['label'] = 'ventas, servicio, marketing y revenue'
put('B13-adopcion', v)

o = ex('deck-content-day-live-console-intent.json')
for k in BASE: o.pop(k, None)
o['console']['icon'] = 'data'
o['console']['subtitle'] = 'Marketing · Sales · Service Hub · Agent Hub'
o['console']['metrics'][2] = {"value": "0", "label": "Workflows con error", "detail": "monitoreo continuo"}
o['console']['checks'][0]['label'] = 'Calidad de datos · duplicados en contactos'
o['console']['checks'][2]['label'] = 'Consumo de créditos de HubSpot vs. presupuesto'
o['console']['checks'][3]['label'] = 'Nuevo workflow de reactivación'
put('B14-operacion', o)

q = ex('deck-content-measure-formulas-intent.json')
for k in BASE: q.pop(k, None)
q['metrics'][0]['source'] = 'HubSpot'
q['metrics'][3]['source'] = 'Data Hub · informes'
q['metrics'][3]['owner'] = 'Admin de tu portal'
q['metrics'][4]['source'] = 'Agent Hub'
put('B15-medicion', q)

put('B16-contraportada', {"role": "close", "recipe": "close-brochure", "layout": "orbit", "voice": {"question": "¿Conversamos?", "answer": ["Cuando", "quieras"]}})
print(sorted(os.listdir('intents')))

# ── Propuesta: portada con el cliente, el mismo cuerpo, cotización y contraportada con el eslogan ──
put('P01-portada', {"role": "cover", "recipe": "cover-proposal", "layout": "orbit",
  "voice": {"eyebrow": "Propuesta · Servicios HubSpot", "question": "¿Tu HubSpot ya actúa?", "answer": ["Por ti"]},
  "body": "Preparada para **[Cliente]** · Confidencial",
  "selection": {"target": "client-logo", "label": "Cliente", "participantKind": "role"}, "column": {"topPx": 220}}, use='proposal')
body = ['B02-propuesta','B03-uno','B04-encaje','B05-servicios','B06-agentes','B07-aprobacion','B08-permiso','B09-migracion',
        'B10-evaluacion','B11-olas','B12-dia-a-dia','B13-adopcion','B14-operacion','B15-medicion']
for n, b in enumerate(body, start=2):
    d = json.load(open(f'intents/{b}.json', encoding='utf-8'))
    d['use'] = 'proposal'
    json.dump(d, open(f'intents/P{n:02d}-{b[4:]}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
pr = ex('deck-content-pricing-intent.json')
for k in BASE: pr.pop(k, None)
pr['body'] = 'Cada modo se cotiza por alcance y capacidad, nunca por horas sueltas. Las licencias de HubSpot van aparte.'
pr['legal'] = 'Valores netos + IVA. Licencias y créditos de HubSpot no incluidos.'
pr['period'] = 'neto + IVA'
pr['plans'] = [
  {"name": "Blueprint", "tagline": "Para decidir con datos", "features": ["Inventario del portal", "Modelo objetivo", "Roadmap por olas", "Criterios de aceptación"]},
  {"name": "Proyecto", "tagline": "Para construir por fases", "features": ["Configuración y datos", "Integraciones", "Automatización y QA", "Capacitación por rol", "Documentación"]},
  {"name": "Operar", "tagline": "Para operar y crecer", "features": ["Releases con aprobación", "Soporte con SLA", "Agentes supervisados", "Revisión trimestral de valor", "Reporting mensual"]}]
put('P16-cotizacion', pr, use='proposal')
put('P17-contraportada', {"role": "close", "recipe": "close-proposal",
  "photo": {"register": "cine", "subject": "nexa", "plateRef": "ai-generations/2026-09-27_brochure/plates/BR3-contra-horizonte.png",
            "alt": "Nexa, de espaldas, camina hacia una órbita de luz teal que se levanta como un portal en el horizonte"}}, use='proposal')
print(sorted(os.listdir('intents')))

# ── Voz corregida (decisión del operador 2026-10-06): habla el cliente, en primera persona; cada par pasa las cinco
#    pruebas de §4 de la línea gráfica (conversación, calce, autonomía, sustitución, prueba). ──
VOICE = {
  'B01-portada':      ('¿Mi HubSpot puede hacer más?', ['Mucho más']),
  'P01-portada':      ('¿Mi HubSpot puede hacer más?', ['Mucho más']),
  'B02-propuesta':    ('¿Cómo vende más mi CRM?', ['Con agentes']),
  'B03-uno':          ('¿Cuántos CRM necesito?', ['Uno']),
  'B05-servicios':    ('¿Qué hacen en HubSpot?', ['Todo el ciclo']),
  'B07-aprobacion':   ('¿Dónde apruebo al agente?', ['Donde', 'trabajas']),
  'B08-permiso':      ('¿Puedo contactar a ese cliente?', ['Con', 'permiso']),
  'B09-migracion':    ('¿Cómo sé que migró todo?', ['Porque', 'cuadra']),
  'B10-evaluacion':   ('¿Qué recibo primero?', ['Una', 'decisión']),
  'B11-olas':         ('¿Sumo todos los agentes juntos?', ['No, por', 'olas']),
  'B12-dia-a-dia':    ('¿Qué llega a producción?', ['Lo que', 'apruebes']),
  'B13-adopcion':     ('¿Cómo aprende mi equipo?', ['A su', 'ritmo']),
  'B15-medicion':     ('¿Cómo sé que funciona?', ['Lo', 'medimos']),
  'P16-cotizacion':   ('¿Cómo se cotiza?', ['Por alcance']),
}
for name, (q, a) in VOICE.items():
    targets = [name] + ([f'P{name[1:3]}-{name[4:]}'] if name.startswith('B') and name not in ('B01-portada',) else [])
    for t in targets:
        path = f'intents/{t}.json'
        if not os.path.exists(path): continue
        d = json.load(open(path, encoding='utf-8'))
        d['voice']['question'] = q
        d['voice']['answer'] = a
        json.dump(d, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('voz corregida')

# Láminas nuevas del 2026-10-06 (licencias, créditos, CRM que se actualiza solo, datos y arquitectura)
exec(open('nuevas.py', encoding='utf-8').read())

# Láminas para quien evalúa desde TI (2026-10-06): integraciones, automatización, seguridad y Ley 21.719
exec(open('ti.py', encoding='utf-8').read())
