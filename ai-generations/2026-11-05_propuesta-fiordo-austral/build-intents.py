"""Propuesta Fiordo Austral (Wherex 428823) — intents de las láminas, sobre los intents aprobados del deck HubSpot
(2026-10-06) y de la propuesta Assetplan (2026-10-20). Copy desde PROPUESTA-FIORDO-AUSTRAL-428823-PARA-CLAUDE-DESIGN.md.
Edición: Sales Hub Professional («Pro esbelto», Julio 05/11/2026). Voz (05/11, Julio: «la dinámica de preguntas y respuestas se siente absurda y forzada»): par pregunta–respuesta sólo en 04, 14 y 23; el resto, anillo arriba y esfera abajo como frase en dos tiempos (delta 2026-10-25 de La órbita).
Impacto visual (06/11, Julio: «eleva el impacto visual considerablemente… todas»): portada `dawn`, 02 a sección de cine con foto propia
(FA02), Zero Trust a identidad y permisos, matriz a anillo, SLA a muro de cifras, 18 costo retirada (su contenido vive en 19).
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
d = base(EX, 'deck-cover-proposal-dawn-intent.json')
# `dawn` (06/11): la órbita sale como el sol con el logo del cliente dentro. render-portada.ts + portada-dawn.css oculta la
# pregunta (la portada de propuesta dice lo que es); el eyebrow dice «Propuesta técnica».
d['voice'] = {'eyebrow': 'Propuesta técnica · Wherex N.º 428823', 'question': 'Propuesta', 'answer': ['CRM HubSpot']}
d['body'] = 'Preparada para **Pesquera Fiordo Austral** · Noviembre 2026'
d['selection'] = {'target': 'client-logo', 'label': 'Efeonce', 'participantKind': 'role'}
d['clientLogo'] = {'path': 'ai-generations/2026-11-05_propuesta-fiordo-austral/assets/fiordo-austral-logo-web.png', 'alt': 'Fiordo Austral'}
add('F01-portada', 'cover-proposal-dawn', d, '01 · portada')

# 02 · Lo que entendimos
# 06/11: de content-text a sección de cine con foto propia (FA02: cuatro hilos de luz llegan a una sola esfera).
d = base(HS, 'B26-salida.json')
# 06/11, Julio en el canvas: «¿qué responde esta slide?». «Cuatro regiones, un CRM» afirmaba la solución sin decir el
# problema: «Lo que entendimos» ahora dice cómo venden hoy (bases y propuesta, bloque 1: «lo hace hoy desde planillas Excel»).
d['voice'] = {'eyebrow': 'Lo que entendimos', 'question': 'Hoy, su venta vive en', 'answer': ['planillas']}
d['body'] = 'Su equipo vende contra la especificación de cada cliente, en cuatro regiones, y hoy lo registra en **Excel**.'
d['pillars'] = [
    {'label': '4 regiones', 'text': 'Asia, Europa, Norteamérica y Sudamérica.'},
    {'label': '6 plantas', 'text': 'harina, aceite e hidrolizados de salmón.'},
    {'label': '10 usuarios', 'text': 'en el CRM, según las bases.'},
]
d['photo'] = {'register': 'cine', 'subject': 'person', 'plateRef': 'ai-generations/2026-11-05_propuesta-fiordo-austral/fotos/plates/FA02-cuatro-regiones.png', 'alt': 'Un director de Efeonce sostiene en la palma una esfera de luz a la que llegan cuatro hilos desde cuatro direcciones'}
add('F02-entendimos', 'section-cine-purpose', d, '02 · lo que entendimos')

# 03 · Qué cubre el CRM
d = base(HS, 'P05-servicios.json')
d['voice'] = {'eyebrow': 'Nuestra propuesta · Sales Hub Professional', 'question': 'Proponemos un CRM hecho para', 'answer': ['exportar']}
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

# 04c · Su proceso (06/11, Julio: «cómo vamos a hacer que el CRM se ajuste o se adapte a sus procesos»). Etapas
# propuestas sobre lo que describen las bases (muestras, especificación, aprobación interna); se validan en F0.
d = base(EX, 'deck-content-bullets-intent.json')
d['voice'] = {'eyebrow': 'Su proceso comercial', 'question': 'El CRM se configura sobre', 'answer': ['su proceso']}
d['items'] = [
    {'title': 'Pipeline de exportación', 'desc': 'Muestra, especificación, aprobación técnica, contrato y embarque; se validan en F0.'},
    {'title': 'Ficha técnica por cliente', 'desc': 'Proteína, FFA, humedad y certificados en cada cliente y en cada oportunidad.'},
    {'title': 'Visto bueno de la gerencia', 'desc': 'Las condiciones fuera de rango piden el visto bueno antes de llegar al cliente.'},
    {'title': 'Una vista por región', 'desc': 'Asia, Europa, Norteamérica y Sudamérica, cada una con su vendedor y su distribuidor.'},
]
# Selección en 03: con el punto 01 la etiqueta tapaba el «04».
d['selected'] = 3
d['selection'] = {'target': 'object', 'label': 'Gerencia', 'participantKind': 'department'}
d['progress'] = {'sections': 5, 'current': 1}
add('F04c-proceso', 'content-bullets', d, '05 · su proceso')

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
# 06/11, Julio: «sí, hazlas»: foto propia FA06 en vez de HS2d del deck HubSpot (ficha revisada por cine-reviewer).
d['photo'] = {**d.get('photo', {}), 'register': 'cine', 'subject': 'person', 'plateRef': 'ai-generations/2026-11-05_propuesta-fiordo-austral/fotos/plates/FA06-ficha-del-cliente.png', 'alt': 'Julio, de Efeonce, sostiene un registro de vidrio en el que cuatro formas de luz, los requisitos de un cliente, encajan solas en sus casilleros'}
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

# 07b · Adopción (06/11, Julio: «cómo lo vamos a ayudar a facilitar la adopción»): 90 días desde la puesta en marcha.
d = base(EX, 'deck-decision-plan-intent.json')
d['voice'] = {'eyebrow': 'Adopción', 'question': 'La adopción se mide', 'answer': ['cada semana']}
d['body'] = 'Desde la puesta en marcha: un **piloto** con vendedores clave, luego las cuatro regiones y el uso medido.'
d['horizon'] = 90
d['currentStop'] = 1
d['stops'] = [
    {'range': 'Días 1–30', 'title': 'Piloto', 'desc': 'Vendedores clave de una región usan el CRM con sus clientes reales y lo ajustamos.'},
    {'range': 'Días 31–60', 'title': 'Toda la red', 'desc': 'Se suman las cuatro regiones, con un referente por equipo y tutoriales por rol.'},
    {'range': 'Días 61–90', 'title': 'Hábito', 'desc': 'El uso de cada vendedor se mide cada semana y la gerencia revisa en el CRM.'},
]
add('F07b-adopcion', 'decision-plan', d, '12 · adopción')

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

# 08b · Reportes y dashboards (06/11, bases §3 e) y g): actividad por vendedor, activos e inactivos, por país,
# abiertas/ganadas/perdidas, dashboards automáticos y exportación a Excel). Datos de muestra.
d = base(EX, 'deck-content-report-formats-intent.json')
d.pop('productMark', None)
d['voice'] = {'eyebrow': 'Reportes y dashboards', 'question': 'El tablero comercial se arma', 'answer': ['solo']}
d['body'] = 'Actividad por vendedor, clientes activos e inactivos y oportunidades por país, al día y con **exportación a Excel**.'
d['reportLabel'] = 'Tablero comercial · datos de muestra'
d['kpis'] = [
    {'label': 'Oportunidades abiertas', 'value': '48', 'delta': '▲ 6'},
    {'label': 'Ganadas en el trimestre', 'value': '12', 'delta': '▲ 3'},
    {'label': 'Clientes activos', 'value': '214', 'delta': '▲ 9'},
]
d['trendTitle'] = 'Ganadas vs. meta · 6 meses'  # leyenda fija de la plantilla oculta con reportes-sin-leyenda.css
d['rankingTitle'] = 'Pipeline por país'
d['ranking'] = [
    {'name': 'China', 'share': 38},
    {'name': 'Japón', 'share': 27},
    {'name': 'España', 'share': 21},
    {'name': 'EE. UU.', 'share': 14},
]
d['reading'] = 'China concentra el pipeline. Dos clientes de España llevan 60 días sin contacto: ya tienen su tarea.'
d['formats'] = [
    {'icon': 'mail', 'title': 'Correo', 'detail': 'Cada lunes'},
    {'icon': 'web-mobile', 'title': 'Web y móvil', 'detail': 'En terreno'},
    {'icon': 'presentation', 'title': 'Dashboard', 'detail': 'Para el comité'},
    {'icon': 'pdf', 'title': 'PDF', 'detail': 'Para circular'},
    {'icon': 'deck', 'title': 'Presentación', 'detail': 'Lista para la gerencia'},
]
d['highlightedFormat'] = 3
add('F08b-reportes', 'content-report-formats', d, '08b · reportes y dashboards')

# 08c · App móvil (06/11, bases §3 f): respiro con foto propia FA10 (gerenta de exportaciones de casting, en una feria
# genérica, registra la visita en el teléfono). Las capacidades van en 03 y en la demo.
d = base(EX, 'deck-breather-intent.json')
d['voice'] = {'question': 'En planta o en feria,', 'answer': ['en el móvil']}
d['progress'] = {'sections': 4, 'current': 1}
d['photo'] = {'register': 'documental', 'subject': 'person', 'plateRef': 'ai-generations/2026-11-05_propuesta-fiordo-austral/fotos/plates/FA10-en-la-feria.png', 'alt': 'En una feria internacional, una gerenta de exportaciones registra en el teléfono la visita que acaba de terminar, con la tarjeta del visitante en la otra mano'}
add('F08c-movil', 'breather', d, '08c · app móvil')

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
# 06/11: de viñetas a identidad y permisos: una identidad de Entra ID, cinco accesos, permisos concedidos y negados y
# su registro. (La escalera plana no entra: es variante de la de 08; `section-lens` no admite foto cine.)
d = base(EX, 'deck-method-identity-consent-intent.json')
d['use'] = 'proposal'
# 06/11, Julio: «¿qué quieres mostrar? ¿todo conectado por el single sign-on?». Sí: un solo inicio de sesión de Microsoft
# para entrar al CRM desde cualquier lugar. render-patch.ts cambia «Fuente» y «Perfil unificado» y pone el ícono oficial de
# MFA de Microsoft Entra (paquete de íconos de arquitectura de Azure V25).
d['voice'] = {'eyebrow': 'Inicio de sesión único', 'question': 'Un solo inicio de sesión, con', 'answer': ['Entra', 'ID']}
d['body'] = 'Su cuenta de Microsoft para todo: **MFA**, Acceso Condicional y mínimo privilegio, y cada acceso queda registrado en Wazuh.'
d['note'] = 'Ejemplo ilustrativo · los permisos se definen con su equipo de TI'
d['sources'] = ['Outlook', 'Teams', 'App móvil', 'Navegador', 'Escritorio']
d['profileTitle'] = 'Una cuenta, 5 accesos'
d['channels'] = [
    {'channel': 'Contactos', 'purpose': 'Leer', 'permitted': True},
    {'channel': 'Negocios', 'purpose': 'Editar', 'permitted': True},
    {'channel': 'Exportar', 'purpose': 'Base completa', 'permitted': False},
    {'channel': 'Ajustes', 'purpose': 'Administrar', 'permitted': False},
]
d['activations'] = [
    {'icon': 'sales', 'title': 'Vendedor', 'detail': 'Sus clientes ✓', 'channel': 'Contactos'},
    {'icon': 'sales', 'title': 'Etapa', 'detail': 'Con aprobación ✓', 'channel': 'Negocios'},
    {'icon': 'revenue', 'title': 'Registro', 'detail': 'Cada acceso, en Wazuh', 'channel': 'Negocios'},
]
d['selection'] = {'target': 'object', 'label': 'TI', 'participantKind': 'department'}
add('F09b-zero-trust', 'method-identity-consent', d, '11 · zero trust')

# 09c · Matriz de cumplimiento (resumen)
# 06/11: de viñetas a anillo. La vuelta son 100: los pesos son el % de los 74 (29, 33, 10 y 2 → 39, 45, 13 y 3).
d = base(EX, 'deck-method-score-ring-intent.json')
d['voice'] = {'eyebrow': 'Matriz de cumplimiento', 'question': 'Los 74 requisitos, uno a', 'answer': ['uno']}
d['body'] = 'Cada requisito de seguridad de las bases, con su respuesta y su evidencia en el anexo.'
d['dimensions'] = [
    {'name': '% cumple con Sales Hub', 'weight': 39},
    {'name': '% con control de Efeonce', 'weight': 45},
    {'name': '% en desarrollo, fase 1', 'weight': 13},
    {'name': '% no cumple, declarado', 'weight': 3},
]
d['total'] = {'value': '74', 'label': 'requisitos respondidos', 'source': 'Matriz de cumplimiento, anexo de esta propuesta'}
d['ctaButton'] = {'text': 'Ver la matriz completa', 'descriptor': 'Anexo · 74 requisitos'}
add('F09c-matriz', 'method-score-ring', d, '12 · matriz de cumplimiento')

# 09d · Disponibilidad (dato de las bases con fuente)
d = base(EX, 'deck-content-measure-intent.json')
d['version'] = '0.1.2'
d['voice'] = {'eyebrow': 'Nivel de servicio', 'question': 'Disponibilidad mensual exigida:', 'answer': ['99,9 %']}
d['body'] = 'mensual como mínimo, según las bases. HubSpot publica una meta de 99,95 % y su historial en status.hubspot.com.'
d['measure'] = {'value': 0.999, 'source': 'Bases Wherex 428823, sección 4'}
d['figures'] = [
    {'value': '99,95 %', 'label': 'meta mensual de HubSpot', 'source': 'Términos de servicio de HubSpot'},
    {'value': '≤ 1 h', 'label': 'respuesta Efeonce en S1', 'source': 'SLA de esta propuesta'},
]
# 06/11, Julio: «la imagen está forzada… ni siquiera está en el lente, su cara se corta; el lente tiene que tener un
# propósito». HS5b venía de la lámina de licencias del deck HubSpot. La receta pide el oficio detrás de la cifra, dentro
# del círculo: FA14 es la guardia de soporte revisando el historial de disponibilidad (FA14e = FA14 con el lienzo ampliado y centrado hacia
# arriba con foto:expandir para que el lente encierre la cabeza completa y la pantalla del historial, y una edición que borró la costura).
d['photo'] = {'register': 'documental', 'subject': 'person', 'plateRef': 'ai-generations/2026-11-05_propuesta-fiordo-austral/fotos/plates/FA14e-guardia-disponibilidad.png', 'alt': 'En la mesa de soporte de Efeonce, un especialista revisa en el monitor el historial de disponibilidad del CRM'}
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

# 09f · Controles técnicos (06/11, bases §4: cifrado, vulnerabilidades, OAuth, sesión única y licencias Microsoft
# requeridas). «Fuente» es la evidencia y «Dueño», el responsable, como pide la matriz. Valores del anexo.
d = base(EX, 'deck-content-measure-formulas-intent.json')
d['use'] = 'proposal'
d['voice'] = {'eyebrow': 'Controles técnicos', 'question': 'Cada control tiene', 'answer': ['su', 'dueño']}
d['body'] = 'TLS 1.2 o superior y Entra ID P1: cómo se cumple cada control, su **evidencia** y quién responde.'
d['note'] = 'Detalle por requisito en la matriz de cumplimiento (anexo)'
d['metrics'] = [
    {'glyph': 'seguridad', 'name': 'Cifrado', 'formula': 'TLS obligatorio en tránsito y datos cifrados en reposo', 'source': 'SOC 2 Tipo II', 'owner': 'HubSpot'},
    {'glyph': 'checklist', 'name': 'Vulnerabilidades', 'formula': 'Pentest independiente y parches de la plataforma', 'source': 'Resumen bajo NDA', 'owner': 'HubSpot'},
    {'glyph': 'integracion', 'name': 'Integraciones', 'formula': 'Una app OAuth por integración, con alcances mínimos', 'source': 'Revisión trimestral', 'owner': 'Efeonce'},
    {'glyph': 'reloj', 'name': 'Sesión única', 'formula': 'Control de sesión de Entra ID e inactividad corta', 'source': 'Prueba técnica', 'owner': 'TI y Efeonce'},
    {'glyph': 'contrato', 'name': 'Licencias Microsoft', 'formula': 'Licencia premium de Entra ID para el Acceso Condicional', 'source': 'Inventario de TI', 'owner': 'Fiordo Austral'},
]
# 06/11: fuera del deck (Julio: «no se trata de responder las bases»); el detalle por control vive en la matriz (anexo)
# y la receta pasa a la lámina de retorno.
RETIRADAS = {'F09f-controles'}
add('F09f-controles', 'content-measure-formulas', d, '14b · controles técnicos')

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
d['pillars'][0]['text'] = 'registros y propiedades cuando lo necesiten.'  # 06/11: la base venía en tuteo
# 06/11, Julio: «sí, hazlas»: foto propia FA23 en vez de HS4 del deck HubSpot (ficha revisada por cine-reviewer).
d['photo'] = {**d.get('photo', {}), 'register': 'cine', 'subject': 'nexa', 'plateRef': 'ai-generations/2026-11-05_propuesta-fiordo-austral/fotos/plates/FA23-sus-datos.png', 'alt': 'Nexa entrega un estuche de vidrio con el archivo completo, mientras detrás queda abierto y vacío el cajón de donde salió'}
add('F11-salida', 'section-cine-purpose', d, '11 · salida')

# 12 · Cronograma
d = base(HS, 'P11-olas.json')
d['voice'] = {'eyebrow': 'Implementación · 16 semanas', 'question': 'De la firma a producción,', 'answer': ['16', 'semanas']}
d['body'] = 'Cada fase se **prueba** antes de la siguiente; la prueba técnica de seguridad es la puerta a producción.'
d['steps'] = [
    {'kicker': 'Semanas 1–4', 'name': 'Diseño y seguridad', 'desc': 'Entrega: arquitectura firmada, matriz de roles, SSO con Entra ID y colector Wazuh.'},
    {'kicker': 'Semanas 3–8', 'name': 'Configuración', 'desc': 'Entrega: CRM configurado, migración cuadrada e integraciones probadas.'},
    {'kicker': 'Semanas 9–12', 'name': 'Prueba y puesta', 'desc': 'Entrega: actas de aceptación, informe de la prueba técnica y capacitación.'},
    {'kicker': 'Semanas 13–16', 'name': 'Estabilización', 'desc': 'Entrega: informe de adopción, calidad de datos y manual de operación.'},
]
d['selectedStep'] = 3
add('F12-cronograma', 'method-waves', d, '12 · cronograma')

# 13 · Cambios controlados
d = base(HS, 'P12-dia-a-dia.json')
# 06/11, Julio: «sólo aprobado ¿de qué?… no entiendo por qué tienes Loom». La voz dice qué pasa con cada cambio y Loom sale
# (render-patch.ts: pasos sin «Sandbox» ni tuteo y el video en Teams).
d['voice'] = {'eyebrow': 'Cambios controlados', 'question': 'Todo cambio, antes de producción, pasa por', 'answer': ['prueba y', 'control']}
d['body'] = 'Se prueba en una cuenta de pruebas con datos de ejemplo, su equipo lo **valida** y recién entonces se publica.'
d['release']['kicker'] = 'Cambio 03 · Sales Hub'
d['release']['title'] = 'Alerta de cliente sin contacto'
d['release']['icon'] = 'sales'
d['release']['videoCaption'] = 'Qué cambia para ventas, en 3 minutos'
d['release']['approveCta'] = 'Aprobar cambio'
d['tools'] = [
    {'tool': 'teams', 'kicker': 'Microsoft Teams', 'label': 'Video del cambio'},
    {'tool': 'microsoft-365', 'kicker': 'Microsoft 365', 'label': 'Acta en SharePoint'},
    {'tool': 'hs-icon:sales', 'kicker': 'HubSpot', 'label': 'Cuenta de pruebas'},
    {'tool': 'microsoft-365', 'kicker': 'Microsoft 365', 'label': 'Aviso por Outlook'},
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
# 06/11: de viñetas a muro de cifras (sólo existe en claro: lámina de Efeonce en growth, como 09e).
d = base(EX, 'deck-decision-why-us-intent.json')
d['theme'] = 'light'
d['line'] = 'growth'
d['voice'] = {'eyebrow': 'Soporte y SLA', 'question': 'Lo crítico, en', 'answer': ['1 hora']}
d['progress'] = {'sections': 4, 'current': 3}
d['body'] = 'Lunes a viernes de 9:00 a 18:30 y guardia permanente para lo crítico; mantención mensual.'
SLA = 'SLA de esta propuesta'
d['figures'] = [
    {'value': '≤ 1 h', 'label': 'S1 crítico: caída o incidente de seguridad', 'source': SLA},
    {'value': '≤ 4 h', 'label': 'S2 alto: función clave degradada', 'source': SLA},
    {'value': '≤ 1 día', 'label': 'S3 medio: error de un reporte o usuario', 'source': SLA},
    {'value': '≤ 2 días', 'label': 'S4 bajo: consultas y mejoras', 'source': SLA},
    {'value': 'N1 a N3', 'label': 'escalamiento hasta HubSpot y Microsoft', 'source': SLA},
    {'value': 'Al abrir', 'label': 'aviso de S1 y S2 por correo y Teams', 'source': SLA},
]
d['selected'] = 1
d['selection'] = {'target': 'object', **SEL}
add('F15-soporte', 'decision-why-us', d, '15 · soporte y SLA')

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

# 18 · Costo total: retirada el 06/11. Licencias HubSpot, onboarding US$ 0 y servicios ya están en 19; las licencias
# Microsoft que falten pasan al cuerpo de 19.

# 18b · Licencias (06/11, Julio: «no estamos proponiendo las licencias, cómo adaptarlas en el modelo económico de
# HubSpot»). Tres licencias por rol, a precio de lista del portal (05/11): Ventas US$ 100, Principal US$ 50 (la
# «licencia principal adicional» de Pro), Sólo lectura US$ 0. La oferta económica cotiza 10 de Ventas como techo; el
# reparto se cierra en F0. Montos con render-pricing-real.ts.
# Con la inversión en el deck, content-pricing-stage choca con content-pricing-live (variantes): el ahorro por rol va en
# decision-chart, en papel (growth). Reparto de ejemplo 6 + 2 + 2: US$ 700 contra US$ 1.000 al mes.
d = base(EX, 'deck-decision-chart-intent.json')
d['line'] = 'growth'
d['theme'] = 'light'
d['voice'] = {'eyebrow': 'Licencias por rol', 'question': 'Una licencia según', 'answer': ['cada rol']}
d['progress'] = {'sections': 5, 'current': 5}
d['body'] = 'Ventas para quien vende, Principal para quien registra y sin costo para quien sólo revisa.'
d['bars'] = [{'label': '10 de Ventas', 'value': 100}, {'label': 'Por rol', 'value': 70}]
d['annotation'] = '−30 %'
d['chartNote'] = 'Ejemplo: 6 de Ventas, 2 Principal y 2 de sólo lectura, al mes.'
src = 'precio de lista de HubSpot, portal Efeonce, 05/11/2026; el reparto se cierra en el descubrimiento'
d['figures'] = [
    {'value': 'US$100', 'label': 'Ventas, al mes', 'source': src},
    {'value': 'US$50', 'label': 'Principal, al mes', 'source': src},
    {'value': 'US$0', 'label': 'Sólo lectura', 'source': src},
    {'value': '3.000', 'label': 'créditos al mes', 'source': src},
]
d['selected'] = 2
d['selection'] = {'target': 'object', 'label': 'Finanzas', 'participantKind': 'department'}
add('F18b-licencias', 'decision-chart', d, '26 · licencias')

# 19 · Inversión (content-pricing live; montos reales con render-pricing-real.ts, como Assetplan)
d = base(AP, 'A078-inversion-cotizacion.json')
d['voice'] = {'eyebrow': 'Inversión', 'question': '¿Cuánto invertimos?', 'answer': ['US$ 9.900']}
d['body'] = 'Servicios Efeonce, más IVA. Las licencias de HubSpot y de Microsoft van **aparte**: las factura cada fabricante.'
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

# 19b · Retorno (06/11, Julio: «precio, retorno de inversión»). Sin cifras de promesa: cada métrica con fórmula, fuente y
# dueño, y la línea base del descubrimiento.
d = base(EX, 'deck-content-measure-formulas-intent.json')
d['use'] = 'proposal'
d['voice'] = {'eyebrow': 'Retorno', 'question': '¿Cómo sabremos que rinde?', 'answer': ['Lo', 'medimos']}
d['body'] = 'Cada métrica con su fórmula, su fuente y un **dueño**; la línea base sale del descubrimiento.'
d['note'] = 'Sin cifras de promesa: la línea base se mide en el descubrimiento'
d['metrics'] = [
    {'glyph': 'medicion', 'name': 'Adopción', 'formula': 'Vendedores activos cada semana ÷ licencias de ventas', 'source': 'HubSpot', 'owner': 'Gerencia Comercial'},
    {'glyph': 'reloj', 'name': 'Reportes a mano', 'formula': 'Horas al mes armando reportes en Excel', 'source': 'Inventario del descubrimiento', 'owner': 'Gerencia Comercial'},
    {'glyph': 'checklist', 'name': 'Sin contacto', 'formula': 'Clientes activos sin actividad en el período ÷ total', 'source': 'HubSpot', 'owner': 'Cada vendedor'},
    {'glyph': 'base-de-datos', 'name': 'Fichas completas', 'formula': 'Fichas técnicas completas ÷ clientes activos', 'source': 'HubSpot', 'owner': 'Administración del CRM'},
    {'glyph': 'integracion', 'name': 'Pipeline al día', 'formula': 'Oportunidades con próximo paso y fecha ÷ abiertas', 'source': 'HubSpot', 'owner': 'Gerencia Comercial'},
]
add('F19b-retorno', 'content-measure-formulas', d, '28 · retorno')

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

# 06/11: las bases (§11) piden la oferta técnica y la económica por separado. La inversión se compone, pero queda fuera
# del plan técnico: va con la oferta económica y en la presentación de adjudicación.
# 06/11 (tarde), Julio: «lo que calma a un comité de compra es el precio, el retorno, la adopción, la migración y que el
# CRM se adapte a sus procesos… no se trata de responder las bases». La inversión vuelve al deck; al subir a Wherex
# las láminas 26 a 28 van en el archivo de la oferta económica (§11).
ECONOMICA = set() | RETIRADAS
ORDEN = ['F01-portada', 'F02-entendimos', 'F03-cubre', 'F04-por-que-hubspot', 'F04c-proceso', 'F05-ficha',
         'F08-automatizaciones', 'F08b-reportes', 'F08c-movil', 'F06-integraciones', 'F07-migracion', 'F07b-adopcion',
         'F14-capacitacion', 'F12-cronograma', 'F13-cambios', 'F17-equipo', 'F09-seguridad', 'F09b-zero-trust',
         'F09c-matriz', 'F09d-disponibilidad', 'F09e-continuidad', 'F10-residencia', 'F11-salida', 'F15-soporte',
         'F16-operacion', 'F18b-licencias', 'F19-inversion', 'F19b-retorno', 'F20-pasos', 'F21-contraportada', 'F09f-controles']
assert sorted(ORDEN) == sorted(k for k, *_ in slides), set(ORDEN) ^ {k for k, *_ in slides}
slides.sort(key=lambda t: ORDEN.index(t[0]))
plan = {'document': 'proposal', 'line': 'revenue-hubspot', 'slides': []}
# 06/11, comentario de Julio en el canvas: «cuando esto comienza en minúscula no se ve bien». El destacado (la esfera)
# arranca siempre con mayúscula, aunque continúe la frase del anillo.
CAPITALIZADAS = []
for key, recipe_id, intent, purpose in slides:
    ans = (intent.get('voice') or {}).get('answer')
    if ans and ans[0][:1].islower():
        ans[0] = ans[0][:1].upper() + ans[0][1:]
        CAPITALIZADAS.append(key)
print('mayúscula inicial en', len(CAPITALIZADAS), ':', ' '.join(CAPITALIZADAS))
for key, recipe_id, intent, purpose in slides:
    with open(os.path.join(OUT, key + '.json'), 'w', encoding='utf-8') as fh:
        json.dump(intent, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    if key in ECONOMICA:
        continue
    entry = {'recipeId': recipe_id, 'purpose': purpose}
    photo = intent.get('photo') or {}
    if photo.get('plateRef'):
        entry['plateRef'] = photo['plateRef']
    plan['slides'].append(entry)

with open(os.path.join(ROOT, 'plan.json'), 'w', encoding='utf-8') as fh:
    json.dump(plan, fh, ensure_ascii=False, indent=2)
    fh.write('\n')
print(len(slides), 'intents en', OUT)
