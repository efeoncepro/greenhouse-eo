"""Propuesta Fiordo Austral (Wherex 428823) — intents de las láminas, sobre los intents aprobados del deck HubSpot
(2026-10-06) y de la propuesta Assetplan (2026-10-20). Copy desde PROPUESTA-FIORDO-AUSTRAL-428823-PARA-CLAUDE-DESIGN.md.
Edición: Sales Hub Professional («Pro esbelto», Julio 05/11/2026). Voz (05/11, Julio: «la dinámica de preguntas y respuestas se siente absurda y forzada»): par pregunta–respuesta sólo en 04, 14 y 23; el resto, anillo arriba y esfera abajo como frase en dos tiempos (delta 2026-10-25 de La órbita).
Uso (desde la raíz del repo): python3 ai-generations/2026-11-05_propuesta-fiordo-austral/build-intents.py
"""
import copy
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..'))
HS = os.path.join(REPO, 'ai-generations/2026-10-06_deck-hubspot/intents')
AP = os.path.join(REPO, 'ai-generations/2026-10-20_propuesta-assetplan/intents')
EX = os.path.join(REPO, 'src/lib/brand-surfaces/examples')
OUT = os.path.join(ROOT, 'intents')
os.makedirs(OUT, exist_ok=True)


def base(folder, name):
    with open(os.path.join(folder, name), encoding='utf-8') as fh:
        d = json.load(fh)
    d = copy.deepcopy(d)
    d['use'] = 'proposal'
    d['line'] = 'revenue-hubspot'
    d['theme'] = 'dark'
    return d


SEL = {'label': 'Fiordo Austral', 'participantKind': 'department'}
slides = []


def add(key, recipe_id, intent, purpose):
    slides.append((key, recipe_id, intent, purpose))


# 01 · Portada
d = base(HS, 'P01-portada.json')
d['voice'] = {'eyebrow': 'Propuesta técnica · Wherex N.º 428823', 'question': '¿Un CRM para todo el equipo?', 'answer': ['Propuesta', 'CRM HubSpot']}
d['body'] = 'Preparada para **Pesquera Fiordo Austral** · Noviembre 2026'
d['selection'] = {'target': 'client-logo', 'label': 'Efeonce', 'participantKind': 'role'}
d['clientLogo'] = {'path': 'ai-generations/2026-11-05_propuesta-fiordo-austral/assets/fiordo-austral-logo-web.png', 'alt': 'Fiordo Austral'}
add('F01-portada', 'cover-proposal-orbit', d, '01 · portada')

# 02 · Lo que entendimos
d = base(AP, 'A02-necesidad.json')
d['voice'] = {'eyebrow': 'Lo que entendimos', 'question': 'Cuatro regiones, diez usuarios,', 'answer': ['un CRM']}
d['progress'] = {'sections': 4, 'current': 1}
d['body'] = 'Vender contra la especificación de cada cliente, en terreno y en cuatro regiones.'
d['points'] = [
    {'name': '4 regiones', 'text': 'Asia, Europa, Norteamérica y Sudamérica'},
    {'name': '6 plantas', 'text': 'harina, aceite e hidrolizados de salmón'},
    {'name': '10 usuarios', 'text': 'en el CRM, según las bases'},
]
d['selection'] = {'target': 'answer', 'label': 'Comercial', 'participantKind': 'department'}
add('F02-entendimos', 'content-text', d, '02 · lo que entendimos')

# 03 · Qué cubre el CRM
d = base(HS, 'P05-servicios.json')
d['voice'] = {'eyebrow': 'Nuestra propuesta · Sales Hub Professional', 'question': 'Las seis necesidades de las bases,', 'answer': ['cubiertas']}
d['lanes'] = [
    {'icon': 'sales', 'title': 'Clientes y contactos', 'products': 'Smart CRM', 'description': 'Historial completo, segmentado por país, región, mercado, tipo y estado.'},
    {'icon': 'sales', 'title': 'Pipeline de exportación', 'products': 'Sales Hub', 'description': 'Etapas de negociación, muestras, aprobación interna y seguimiento.'},
    {'icon': 'data', 'title': 'Especificaciones técnicas', 'products': 'Smart CRM', 'description': 'Proteína, FFA, humedad y certificación requerida por cliente.'},
    {'icon': 'data', 'title': 'Documentos', 'products': 'SharePoint · OneDrive', 'description': 'Contratos, certificados y correos asociados a cada cliente.'},
    {'icon': 'revenue', 'title': 'Reportes', 'products': 'Sales Hub', 'description': 'Actividad por vendedor, clientes activos y resultados por país.'},
    {'icon': 'sales', 'title': 'En terreno', 'products': 'App móvil', 'description': 'Visitas, ferias, tareas y recordatorios desde el teléfono.'},
]
d['phases'] = ['Diseño y seguridad', 'Configuración e integración', 'Prueba técnica y puesta', 'Soporte y operación']
add('F03-cubre', 'content-service-lanes', d, '03 · qué cubre el CRM')

# 04 · Por qué HubSpot
d = base(HS, 'P04-encaje.json')
d['voice'] = {'eyebrow': 'Edición recomendada', 'question': '¿Pro o Enterprise?', 'answer': ['Pro', 'primero']}
d['body'] = 'Para un equipo de diez personas recomendamos **Professional**: adopción rápida y licencia proporcionada.'
d['note'] = 'Recomendación para 10 usuarios · Enterprise queda como opción'
d['verdicts'] = [
    {'glyph': 'embudo', 'title': 'Pro', 'description': 'Diez usuarios, valor en semanas y controles de Efeonce.'},
    {'glyph': 'seguridad', 'title': 'Enterprise', 'description': 'Auditoría por API, sandbox y permisos por campo, nativos.'},
    {'glyph': 'integracion', 'title': 'Con QAD', 'description': 'Fase opcional: clientes y pedidos desde el ERP.'},
    {'glyph': 'checklist', 'title': 'Planillas', 'description': 'Lo que hay hoy: sin historial común ni alertas.'},
]
d['selectedVerdict'] = 1
add('F04-por-que-hubspot', 'decision-provider-fit', d, '04 · por qué HubSpot')

# 04b · Partners: retirada el 05/11 (Julio: «no tiene sentido como está planteada»). La receta content-partners exige
# el muro de nueve partners de Efeonce, que en una propuesta HubSpot distrae; la credencial va en la insignia Gold.

# 05 · Su ficha técnica (cine, HS2d)
d = base(AP, 'A035-crm-completo.json')
d['voice'] = {'eyebrow': 'Especificaciones técnicas', 'question': 'Lo que exige cada cliente,', 'answer': ['en el CRM']}
d['body'] = 'Proteína, FFA, humedad y certificaciones de cada cliente, en su registro y en cada oportunidad.'
d['steps'] = [
    {'glyph': 'medicion', 'kicker': 'Especifica', 'name': 'Proteína y FFA'},
    {'glyph': 'contrato', 'kicker': 'Documenta', 'name': 'Certificados'},
    {'glyph': 'embudo', 'kicker': 'Vende', 'name': 'Pipeline exportador'},
    {'glyph': 'informe', 'kicker': 'Reporta', 'name': 'Por país y vendedor'},
]
d['selection'] = {'target': 'answer', **SEL}
add('F05-ficha', 'proposal-cinematic-revops', d, '05 · su ficha técnica')

# 06 · Integraciones
d = base(HS, 'B21-integraciones.json')
d['voice'] = {'eyebrow': 'Integrado a Microsoft 365', 'question': 'Outlook, Teams y SharePoint', 'answer': ['se', 'conectan']}
d['body'] = 'HubSpot se conecta con lo que Fiordo Austral ya usa, con **permisos mínimos** y registro de actividad.'
d['note'] = 'QAD: factibilidad incluida; la construcción es una fase opcional'
d['platforms'] = [
    {'icon': 'data', 'base': 'Su operación', 'name': 'Hoy', 'items': ['Outlook y calendario', 'Teams y SharePoint', 'Planillas Excel', 'ERP QAD']},
    {'icon': 'data', 'base': 'HubSpot', 'name': 'Smart CRM', 'items': ['Correo y calendario conectados', 'Teams y carpeta por cliente', 'Importación con deduplicación', 'API con permisos mínimos']},
]
d['capabilities'] = [
    {'capability': 'Correo y calendario de Outlook', 'verdict': 'Integrar'},
    {'capability': 'Microsoft Entra ID: identidad', 'verdict': 'Integrar'},
    {'capability': 'Teams y SharePoint u OneDrive', 'verdict': 'Integrar'},
    {'capability': 'Planillas comerciales en Excel', 'verdict': 'Migrar'},
    {'capability': 'ERP QAD: clientes y pedidos', 'verdict': 'Integrar'},
]
d['selectedCapability'] = 1
add('F06-integraciones', 'decision-platform-coexistence', d, '06 · integraciones')

# 07 · Migración desde Excel
d = base(HS, 'P09-migracion.json')
d['voice'] = {'eyebrow': 'Migración desde Excel', 'question': 'Cada registro de las planillas', 'answer': ['migra y', 'cuadra']}
d['body'] = 'Claves, duplicados, carga de prueba y **reconciliación** registro por registro, con vuelta atrás lista.'
d['note'] = 'Datos de muestra · las claves y reglas se definen con su equipo'
d['stages'] = [
    {'label': 'Origen', 'value': '3.420', 'description': 'empresas y contactos en planillas'},
    {'label': 'Claves y duplicados', 'value': '286', 'description': 'duplicados unificados'},
    {'label': 'Carga de prueba', 'value': '200', 'description': 'registros · 0 errores'},
    {'label': 'Carga completa', 'value': '3.134', 'description': 'con resultado por registro'},
]
d['reconciliation'] = '3.134 = 3.134 · cuadra'
add('F07-migracion', 'method-migration-reconcile', d, '07 · migración')

# 08 · Automatizaciones
d = base(HS, 'B22-automatizacion.json')
d['voice'] = {'eyebrow': 'Automatizaciones', 'question': 'Las alertas y tareas llegan', 'answer': ['solas']}
d['body'] = 'Reglas fijas y auditables para que ningún cliente se enfríe y ninguna oportunidad avance sin aprobación.'
d['levels'] = [
    {'name': 'Alerta', 'descriptor': 'cliente que se enfría'},
    {'name': 'Tarea', 'descriptor': 'después de cada reunión'},
    {'name': 'Seguimiento', 'descriptor': 'correo y recordatorio'},
    {'name': 'Aprobación', 'descriptor': 'antes de avanzar la etapa'},
    {'name': 'Cierre próximo', 'descriptor': 'aviso al vendedor'},
]
d['note'] = 'Cada regla queda documentada y se prueba antes de activarla.'
d['selection'] = {'target': 'level', 'level': 1, 'label': 'Comercial', 'participantKind': 'department'}
add('F08-automatizaciones', 'method-staircase', d, '08 · automatizaciones')

# 09 · Seguridad
d = base(HS, 'B23-seguridad.json')
d['voice'] = {'eyebrow': 'Seguridad y accesos', 'question': 'El CRM se entrega con sus controles', 'answer': ['encendidos']}
d['body'] = 'HubSpot tiene SOC 2 Tipo II y SOC 3. Efeonce deja los controles **encendidos** y los prueba antes de producción.'
d['alternative'] = {'kicker': 'HubSpot recién creado', 'title': 'Controles por configurar'}
d['efeonce'] = {'kicker': 'HubSpot que entregamos', 'title': 'Controles encendidos'}
d['rows'] = [
    {'alternative': 'Usuarios creados a mano, uno por uno', 'efeonce': 'SSO con Entra ID, MFA y altas por SCIM'},
    {'alternative': 'Todos ven todos los registros', 'efeonce': 'Permisos por usuario y equipo'},
    {'alternative': 'Accesos sin registro en el SIEM', 'efeonce': 'Accesos y cambios enviados a Wazuh'},
    {'alternative': 'Respaldo semanal y manual', 'efeonce': 'Respaldo diario e inmutable en su tenant'},
    {'alternative': 'Cambios directo en producción', 'efeonce': 'Cambios documentados, probados y aprobados'},
]
d['ownTeam'] = {'kicker': '¿Y nuestro equipo de TI?', 'title': 'Decide con nosotros', 'pillars': [
    {'title': 'Identidad', 'description': 'Entra ID y Acceso Condicional'},
    {'title': 'Monitoreo', 'description': 'Wazuh con reglas propias'},
    {'title': 'Prueba', 'description': 'Controles probados antes de producción'},
]}
add('F09-seguridad', 'decision-difference', d, '09 · seguridad')

# 09b · Zero Trust con Entra ID
d = base(AP, 'A051-tiempos.json')
d['voice'] = {'eyebrow': 'Zero Trust con Entra ID', 'question': 'Cada acceso al CRM pasa por', 'answer': ['Entra ID']}
d['progress'] = {'sections': 4, 'current': 2}
d['items'] = [
    {'title': 'Identidad', 'desc': 'SSO SAML con Microsoft Entra ID, obligatorio para todos, y altas y bajas por SCIM.'},
    {'title': 'Acceso', 'desc': 'MFA resistente al phishing, Acceso Condicional y control de sesión desde Entra ID.'},
    {'title': 'Permisos', 'desc': 'Mínimo privilegio por usuario y equipo, sin cuentas compartidas ni exportación libre.'},
    {'title': 'Registro', 'desc': 'Inicios de sesión, seguridad y cambios enviados a Wazuh por un colector de Efeonce.'},
]
d['selected'] = 3
d['selection'] = {'target': 'object', 'label': 'TI', 'participantKind': 'department'}
add('F09b-zero-trust', 'content-bullets', d, '11 · zero trust')

# 09c · Matriz de cumplimiento (resumen)
d = base(AP, 'A051-tiempos.json')
d['voice'] = {'eyebrow': 'Matriz de cumplimiento', 'question': 'Los 74 requisitos, respondidos', 'answer': ['uno a uno']}
d['progress'] = {'sections': 4, 'current': 2}
d['items'] = [
    {'title': '29 · Cumple', 'desc': 'Requisitos cubiertos por Sales Hub Professional con su configuración.'},
    {'title': '33 · Parcialmente', 'desc': 'Cubiertos con controles compensatorios de Efeonce, con su limitación declarada.'},
    {'title': '10 · Desarrollo', 'desc': 'Colector Wazuh, respaldo inmutable, sesión única y recuperación, en la fase 1.'},
    {'title': '2 · No cumple', 'desc': 'RTO/RPO y ventanas de mantenimiento: HubSpot no los publica; pedimos su declaración.'},
]
d['selected'] = 3
d['selection'] = {'target': 'object', 'label': 'TI', 'participantKind': 'department'}
add('F09c-matriz', 'content-bullets', d, '12 · matriz de cumplimiento')

# 09d · Disponibilidad (dato de las bases con fuente)
d = base(EX, 'deck-content-measure-intent.json')
d['version'] = '0.1.2'
d['voice'] = {'eyebrow': 'Nivel de servicio', 'question': 'Disponibilidad mensual exigida:', 'answer': ['99,9 %']}
d['body'] = 'mensual como mínimo, según las bases. HubSpot publica una meta de 99,95 %.'
d['measure'] = {'value': 0.999, 'source': 'Bases Wherex 428823, sección 4'}
d['figures'] = [
    {'value': '99,95 %', 'label': 'meta mensual de HubSpot', 'source': 'Términos de servicio de HubSpot'},
    {'value': '≤ 1 h', 'label': 'respuesta Efeonce en S1', 'source': 'SLA de esta propuesta'},
]
d['photo'] = {'subject': 'person', 'plateRef': 'ai-generations/2026-10-06_deck-hubspot/fotos/plates/HS5b-licencias-justas.png', 'alt': 'Una especialista de Efeonce enciende una a una las casillas de una grilla de luz azul'}
add('F09d-disponibilidad', 'content-measure', d, '13 · disponibilidad')

# 09e · Continuidad e incidentes
d = base(EX, 'deck-decision-risk-intent.json')
d['theme'] = 'light'
d['line'] = 'growth'  # receta sólo clara: como decision-case en el deck HubSpot, va como lámina de Efeonce en growth
d['progress'] = {'sections': 4, 'current': 2}
d['voice'] = {'eyebrow': 'Continuidad e incidentes', 'question': 'Cada riesgo, con su', 'answer': ['cobertura']}
d['body'] = 'Cada riesgo tiene su respuesta escrita y probada antes de pasar a producción.'
d['risks'] = [
    {'risk': 'Caída del servicio', 'name': 'Continuidad HubSpot', 'how': 'Réplica en tres centros de datos; Efeonce escala y reporta cada 2 h.'},
    {'risk': 'Pérdida de datos', 'name': 'Respaldo inmutable', 'how': 'Copia diaria en el tenant de Fiordo Austral y restauración de prueba trimestral.'},
    {'risk': 'Incidente de seguridad', 'name': 'Respuesta en 1 h', 'how': 'Guardia permanente, contención en 4 h, evidencia preservada e informe de causa raíz.'},
    {'risk': 'Acceso indebido', 'name': 'Alertas en Wazuh', 'how': 'Inicios anómalos y sesiones simultáneas detectados, con cierre remoto.'},
]
d['selected'] = 1  # en las filas 2 a 4 la etiqueta de la selección cae sobre la respuesta o el cuerpo
d['selection'] = {'target': 'object', 'label': 'TI', 'participantKind': 'department'}
add('F09e-continuidad', 'decision-risk', d, '14 · continuidad e incidentes')

# 10 · Residencia
d = base(HS, 'B25-residencia.json')
d['voice'] = {'eyebrow': 'Residencia de datos', 'question': '¿Dónde quedan los datos?', 'answer': ['En Estados', 'Unidos']}
d['body'] = 'Proponemos la región de **EE. UU.**; HubSpot también ofrece Canadá, Fráncfort y Australia, con las garantías de su DPA.'
for m in d['markets']:
    if m['country'] == 'Chile':
        m['city'] = 'Fiordo Austral'
add('F10-residencia', 'content-markets', d, '10 · residencia de datos')

# 11 · Salida
d = base(HS, 'B26-salida.json')
d['voice'] = {'eyebrow': 'Sin amarras', 'question': 'Si se van, se llevan', 'answer': ['sus datos']}
d['body'] = 'Sus datos son suyos: entran a HubSpot con **orden** y salen igual de completos.'
add('F11-salida', 'section-cine-purpose', d, '11 · salida')

# 12 · Cronograma
d = base(HS, 'P11-olas.json')
d['voice'] = {'eyebrow': 'Implementación · 16 semanas', 'question': 'De la firma a producción,', 'answer': ['16', 'semanas']}
d['body'] = 'Cada fase se **prueba** antes de la siguiente; la prueba técnica de seguridad es la puerta a producción.'
d['steps'] = [
    {'kicker': 'Semanas 1–4', 'name': 'Diseño y seguridad', 'desc': 'Arquitectura firmada, SSO con Entra ID, colector Wazuh y respaldo inmutable.'},
    {'kicker': 'Semanas 3–8', 'name': 'Configuración', 'desc': 'Propiedades, pipeline, automatizaciones, migración desde Excel e integraciones.'},
    {'kicker': 'Semanas 9–12', 'name': 'Prueba y puesta', 'desc': 'Aceptación funcional, prueba técnica de seguridad, capacitación y paso a producción.'},
    {'kicker': 'Semanas 13–16', 'name': 'Estabilización', 'desc': 'Acompañamiento cercano, ajustes, adopción semanal y calidad de datos.'},
]
d['selectedStep'] = 3
add('F12-cronograma', 'method-waves', d, '12 · cronograma')

# 13 · Cambios controlados
d = base(HS, 'P12-dia-a-dia.json')
d['voice'] = {'eyebrow': 'Cambios controlados', 'question': 'A producción llega', 'answer': ['sólo lo', 'aprobado']}
d['body'] = 'Nada llega a producción sin su **aprobación**: se prueba con registros de prueba y se explica en un video corto.'
d['release']['kicker'] = 'Cambio 03 · Sales Hub'
d['release']['title'] = 'Alerta de cliente sin contacto'
d['release']['icon'] = 'sales'
d['release']['videoCaption'] = 'Qué cambia para ventas, en 3 minutos'
d['release']['approveCta'] = 'Aprobar cambio'
d['tools'] = [
    {'tool': 'teams', 'kicker': 'Microsoft Teams', 'label': 'Nos hablamos'},
    {'tool': 'microsoft-365', 'kicker': 'SharePoint', 'label': 'Documentos del proyecto'},
    {'tool': 'loom', 'kicker': 'Loom', 'label': 'Se lo mostramos'},
    {'tool': 'hs-icon:sales', 'kicker': 'HubSpot', 'label': 'Pruebas controladas'},
]
add('F13-cambios', 'content-day-release-cycle', d, '13 · cambios controlados')

# 14 · Capacitación
d = base(HS, 'P13-adopcion.json')
d['voice'] = {'eyebrow': 'Capacitación y adopción', 'question': 'Cada rol aprende sobre', 'answer': ['su propio', 'portal']}
d['body'] = 'Sesiones en vivo y tutoriales cortos grabados sobre **su** HubSpot, para usuarios y administradores.'
d['library'] = {'tool': 'loom', 'kicker': 'En Loom · sobre su portal', 'title': 'Tutoriales de su equipo'}
d['videos'] = [
    {'icon': 'sales', 'role': 'Ventas', 'title': 'Registrar una visita desde el teléfono', 'duration': '2:40'},
    {'icon': 'sales', 'role': 'Ventas', 'title': 'Crear un negocio de exportación', 'duration': '3:05'},
    {'icon': 'data', 'role': 'Datos', 'title': 'Adjuntar el certificado de análisis', 'duration': '2:15'},
    {'icon': 'data', 'role': 'Administración', 'title': 'Revisar permisos y respaldo', 'duration': '4:10'},
]
d['stats'] = [
    {'value': '10', 'label': 'usuarios capacitados'},
    {'value': '2', 'label': 'perfiles: usuarios y administradores'},
    {'value': 'En español', 'label': 'sesiones y grabaciones'},
]
add('F14-capacitacion', 'content-day-live-library', d, '14 · capacitación')

# 15 · Soporte y SLA
d = base(AP, 'A051-tiempos.json')
d['voice'] = {'eyebrow': 'Soporte y nivel de servicio', 'question': 'Un incidente crítico se atiende en', 'answer': ['1 hora']}
d['progress'] = {'sections': 4, 'current': 3}
d['items'] = [
    {'title': 'S1 Crítico · ≤ 1 h', 'desc': 'Caída o incidente de seguridad: guardia permanente, contención en 4 h e informe de causa raíz.'},
    {'title': 'S2 Alto · ≤ 4 h', 'desc': 'Función clave degradada, como Outlook o los registros a Wazuh: resolución en 2 días hábiles.'},
    {'title': 'S3 Medio · ≤ 1 día', 'desc': 'Error de un reporte o de un usuario: resolución en 5 días hábiles.'},
    {'title': 'S4 Bajo · ≤ 2 días', 'desc': 'Consultas y mejoras, planificadas en el backlog mensual con indicadores de servicio.'},
]
d['selected'] = 1
d['selection'] = {'target': 'object', **SEL}
add('F15-soporte', 'content-bullets', d, '15 · soporte y SLA')

# 16 · Operación
d = base(HS, 'P14-operacion.json')
d['voice'] = {'eyebrow': 'Soporte y operación', 'question': 'Tras la puesta en marcha,', 'answer': ['lo', 'operamos']}
d['body'] = 'Soporte, permisos, respaldo y registros de seguridad, con indicadores mensuales y una revisión **trimestral**.'
c = d['console']
c['title'] = 'Soporte y operación · este mes'
c['subtitle'] = 'Sales Hub Professional · 10 usuarios'
c['metrics'] = [
    {'value': '100 %', 'label': 'Soporte en SLA', 'detail': '12 de 12 solicitudes'},
    {'value': '2', 'label': 'Cambios aprobados', 'detail': 'probados y documentados'},
    {'value': '0', 'label': 'Alertas de seguridad', 'detail': 'registros al día en Wazuh'},
]
c['checks'] = [
    {'label': 'Revisión de usuarios, roles y permisos', 'status': 'Hecha', 'done': True},
    {'label': 'Envío de registros de HubSpot a Wazuh', 'status': 'Al día', 'done': True},
    {'label': 'Restauración de prueba del respaldo', 'status': 'Hecha', 'done': True},
    {'label': 'Nueva alerta de seguimiento comercial', 'status': 'En pruebas', 'done': False},
]
c['review'] = {'kicker': 'Próxima revisión trimestral', 'title': 'Adopción, calidad de datos y prioridades', 'cta': 'Ver agenda'}
add('F16-operacion', 'content-day-live-console', d, '16 · operación')

# 17 · Equipo
d = base(AP, 'A07-por-que.json')
d['voice'] = {'eyebrow': 'Quién lo implementa', 'question': 'Implementa un equipo certificado en', 'answer': ['HubSpot']}
d['body'] = 'Un **equipo asignado**: consultor líder, implementador, especialistas en integraciones, seguridad y datos, y gestión de proyecto.'
add('F17-equipo', 'section-cine-team', d, '17 · equipo')

# 18 · Costo total
d = base(HS, 'P-costo.json')
d['voice'] = {'eyebrow': 'Costo total', 'question': 'Licencias HubSpot y servicios Efeonce,', 'answer': ['por separado']}
d['progress'] = {'sections': 4, 'current': 4}
d['items'] = [
    {'title': 'Licencias HubSpot', 'desc': '10 licencias de Sales Hub Professional: US$ 12.000 al año, facturadas por HubSpot.'},
    {'title': 'Onboarding de HubSpot', 'desc': 'No aplica cuando implementa un partner certificado: US$ 0.'},
    {'title': 'Servicios Efeonce', 'desc': 'Implementación, capacitación y soporte: US$ 9.900 + IVA el primer año.'},
    {'title': 'Licencias Microsoft', 'desc': 'Las que falten, como Entra ID P1, declaradas antes de firmar.'},
]
d['selected'] = 3
d['selection'] = {'target': 'object', **SEL}
add('F18-costo', 'content-bullets', d, '18 · costo total')

# 19 · Inversión (content-pricing live; montos reales con render-pricing-real.ts, como Assetplan)
d = base(AP, 'A078-inversion-cotizacion.json')
d['voice'] = {'eyebrow': 'Inversión', 'question': '¿Cuánto invertimos?', 'answer': ['US$ 9.900']}
d['body'] = 'Servicios Efeonce, más IVA. Las licencias van **aparte**: las factura HubSpot directo a Fiordo Austral.'
q = d['quote']
q['kicker'] = 'Oferta · Wherex 428823'
q['title'] = 'Para Fiordo Austral'
q['lines'] = [
    {'name': 'Implementación', 'desc': 'Fases F0 a F7, en 16 semanas', 'period': '· pago único'},
    {'name': 'Capacitación', 'desc': 'Usuarios y administradores', 'period': '· pago único'},
    {'name': 'Soporte y operación', 'desc': 'SLA S1–S4, meses 5 a 12', 'period': '× 8 meses'},
    {'name': 'Onboarding HubSpot', 'desc': 'No aplica con partner certificado', 'period': '· incluido'},
]
q['totalLabel'] = 'Servicios, año 1'
q['tax'] = 'neto + IVA'
q['cta'] = 'Ver la oferta económica'
d['chips'] = [
    {'kicker': 'Licencias HubSpot', 'text': 'US$ 12.000 al año,\nfacturadas por HubSpot'},
    {'kicker': 'Opción Enterprise', 'text': '+US$ 6.000 al año\nen licencias'},
]
add('F19-inversion', 'content-pricing-live', d, '19 · inversión')

# 20 · Próximos pasos
d = base(AP, 'A08-pasos.json')
d['voice'] = {'eyebrow': 'Próximos pasos', 'question': 'El siguiente paso es', 'answer': ['una demo']}
d['body'] = 'Una demostración del flujo completo de un cliente.'
a = d['agenda']
a['kicker'] = '01 · Demostración · 60 min'
a['title'] = 'Su CRM, en vivo'
a['descriptor'] = 'Ficha técnica, oportunidad con aprobación, visita desde el móvil y reporte por país'
a['summary'] = 'A coordinar por Wherex · hora de Chile'
a['cta'] = 'Agendar la demostración'
d['nextSteps'] = [
    {'number': '02', 'label': 'Seguridad', 'title': 'Prueba técnica', 'desc': 'Con el equipo de TI, antes de producción.'},
    {'number': '03', 'label': 'Inicio', 'title': 'Descubrimiento', 'desc': 'Desde la firma del contrato.'},
]
add('F20-pasos', 'decision-next-steps', d, '20 · próximos pasos')

# 21 · Contraportada
d = base(AP, 'A09-contraportada.json')
add('F21-contraportada', 'close-proposal-horizon', d, '21 · contraportada')

plan = {'document': 'proposal', 'line': 'revenue-hubspot', 'slides': []}
for key, recipe_id, intent, purpose in slides:
    with open(os.path.join(OUT, key + '.json'), 'w', encoding='utf-8') as fh:
        json.dump(intent, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    entry = {'recipeId': recipe_id, 'purpose': purpose}
    photo = intent.get('photo') or {}
    if photo.get('plateRef'):
        entry['plateRef'] = photo['plateRef']
    plan['slides'].append(entry)

with open(os.path.join(ROOT, 'plan.json'), 'w', encoding='utf-8') as fh:
    json.dump(plan, fh, ensure_ascii=False, indent=2)
    fh.write('\n')
print(len(slides), 'intents en', OUT)
