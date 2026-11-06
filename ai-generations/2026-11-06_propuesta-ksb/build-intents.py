"""Propuesta KSB Chile LIC-MKT-2026-001 — intents de las láminas sobre los intents aprobados de la propuesta Fiordo
Austral (2026-11-05, ya en usted) y los ejemplos del catálogo. Línea growth, registro usted («Todo de usted», Julio
06/11/2026). Voz: par pregunta–respuesta sólo donde el lector pregunta; el resto, frase en dos tiempos (anillo abre,
esfera cierra), como Fiordo. Cifras: bases LIC-MKT-2026-001 y revisión de fuentes públicas del 06/11/2026.
Pendientes fuera del plan compuesto: content-team (equipo de 7 sin nombres asignados) y certificaciones (insignias de
Google Partners y Meta Business Partner sin archivar).
Uso (desde la raíz del repo): python3 ai-generations/2026-11-06_propuesta-ksb/build-intents.py
"""
import copy
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(ROOT, '..', '..'))
FA = os.path.join(REPO, 'ai-generations/2026-11-05_propuesta-fiordo-austral/intents')
EX = os.path.join(REPO, 'src/lib/brand-surfaces/examples')
OUT = os.path.join(ROOT, 'intents')
os.makedirs(OUT, exist_ok=True)

SECTIONS = 5


def base(folder, name, theme='dark'):
    with open(os.path.join(folder, name), encoding='utf-8') as fh:
        d = copy.deepcopy(json.load(fh))
    d['use'] = 'proposal'
    d['line'] = 'growth'
    d['theme'] = theme
    return d


slides = []


def add(key, recipe_id, intent, purpose):
    slides.append((key, recipe_id, intent, purpose))


# 01 · Portada (dawn, sin pregunta: render-portada.ts de Fiordo + portada-dawn.css)
d = base(FA, 'F01-portada.json')
d['voice'] = {'eyebrow': 'Propuesta técnica · LIC-MKT-2026-001', 'question': 'Propuesta', 'answer': ['Marketing', 'digital 2027']}
d['body'] = 'Preparada para **KSB Chile S.A.** · Noviembre 2026'
d['selection'] = {'target': 'client-logo', 'label': 'Efeonce', 'participantKind': 'role'}
d['clientLogo'] = {'path': 'ai-generations/2026-11-06_propuesta-ksb/assets/ksb-logo-blanco-1200.png', 'alt': 'KSB'}
add('K01-portada', 'cover-proposal-dawn', d, '01 · portada')

# 02 · Resumen ejecutivo
d = base(FA, 'F09-seguridad.json')
d['voice'] = {'eyebrow': 'Resumen ejecutivo', 'question': 'De la pauta a la cotización, con un', 'answer': ['Sistema']}
d['body'] = 'KSB ya invierte en Google, Meta y LinkedIn. Proponemos conectar cada canal con una **cotización medible** en su CRM.'
d['alternative'] = {'kicker': 'Pauta por canal', 'title': 'Cada canal se mide solo'}
d['efeonce'] = {'kicker': 'Pauta con sistema', 'title': 'Se mide la cotización'}
d['rows'] = [
    {'alternative': 'Anuncios que llevan a páginas generales', 'efeonce': 'Landings por línea, fuera de ksb.com'},
    {'alternative': 'Leads en formularios sueltos', 'efeonce': 'Formularios calificados conectados al CRM'},
    {'alternative': 'Cada canal reporta su propia métrica', 'efeonce': 'Un tablero: del clic a la cotización'},
    {'alternative': 'Contenido de catálogo global', 'efeonce': 'Contenido técnico para el comprador chileno'},
    {'alternative': 'Metas sin línea base', 'efeonce': 'Línea base en el mes 1 y rampa acordada'},
]
d['ownTeam'] = {'kicker': '¿Y su equipo comercial?', 'title': 'Es parte del sistema', 'pillars': [
    {'title': 'Definición', 'description': 'MQL y SQL acordados'},
    {'title': 'Gestión', 'description': 'Tiempo de respuesta al lead'},
    {'title': 'Cierre', 'description': 'Resultado registrado en el CRM'},
]}
add('K02-resumen', 'decision-difference', d, '02 · resumen ejecutivo')

# 03 · Sección · comprensión del negocio
d = base(EX, 'deck-section-classic-intent.json', theme='light')
d['progress'] = {'sections': SECTIONS, 'current': 1}
d['voice'] = {'question': 'Lo que entendimos de', 'answer': ['KSB Chile']}
add('K03-seccion-comprension', 'section-classic', d, '03 · sección · comprensión')

# 04 · Cómo compra KSB
d = base(EX, 'deck-content-bullets-intent.json')
d['voice'] = {'eyebrow': 'Cómo compra KSB', 'question': 'Cada segmento compra por', 'answer': ['Su canal']}
d['items'] = [
    {'title': 'Minería y agua', 'desc': 'Especifica ingeniería; decide por costo total de propiedad, servicio y contrato marco.'},
    {'title': 'Riego y edificación', 'desc': 'Compra por distribuidor y temporada; busca modelo, repuesto y disponibilidad.'},
    {'title': 'Red de distribuidores', 'desc': 'Partner KSB y MyKSB: necesita leads, material y precios al día.'},
    {'title': 'Servicio y repuestos', 'desc': 'SupremeServ: el ingreso recurrente que impulsa la estrategia Mission TEN30.'},
]
d['selected'] = 3
d['selection'] = {'target': 'object', 'label': 'KSB', 'participantKind': 'department'}
d['progress'] = {'sections': SECTIONS, 'current': 1}
add('K04-como-compra', 'content-bullets', d, '04 · cómo compra KSB')

# 05 · Diagnóstico (fuentes públicas)
d = base(EX, 'deck-decision-diagnosis-verdict-intent.json')
d['voice'] = {'eyebrow': 'Diagnóstico · fuentes públicas', 'question': 'Hoy el lead se pierde', 'answer': ['Tras el', 'clic']}
d['body'] = 'La pauta está activa; lo que no se ve es qué pasa **después del clic**.'
d['reportTitle'] = 'Lectura externa de su marketing digital'
d['reportSubtitle'] = 'KSB Chile · revisión del 06/11/2026'
d['sampleMark'] = 'Fuentes públicas'
d['modules'] = [
    {'kicker': 'Pauta', 'title': 'Google, Meta, LinkedIn'},
    {'kicker': 'Destino', 'title': 'Sitio global'},
    {'kicker': 'Captura', 'title': 'Formulario externo'},
    {'kicker': 'Medición', 'title': 'Sin vista Chile'},
    {'kicker': 'Plan', 'title': 'Cuatro ejes 2027'},
]
d['operationNodes'] = ['Google Ads', 'Meta', 'LinkedIn', 'ksb.com', 'Formulario', 'CRM']
d['operationFootnote'] = 'Bibliotecas de anuncios, sitio y redes · 06/11/2026'
d['verdictOptions'] = ['Medible', 'Parcial', 'Sin medir']
d['selectedVerdict'] = 1
d['verdictCondition'] = 'Condición: conectar formularios y CRM antes de escalar la inversión'
d['risks'] = ['Leads sin CRM', 'CPL sin base', 'Destino genérico']
d['recordText'] = 'Cada hallazgo con su fuente: bibliotecas de anuncios, el sitio y sus redes, revisados el 06/11/2026.'
d['waves'] = [
    {'name': 'Q1', 'title': 'Línea base y conversión', 'kicker': 'Base'},
    {'name': 'Q2–Q3', 'title': 'Escalado por segmento', 'kicker': 'Crecimiento'},
    {'name': 'Q4', 'title': 'Consolidación', 'kicker': 'Resultado'},
]
add('K05-diagnostico', 'decision-diagnosis-verdict', d, '05 · diagnóstico')

# 06 · Sección · estrategia (cine, plate de catálogo QS2)
d = base(EX, 'deck-section-cine-purpose-intent.json')
d['voice'] = {'eyebrow': 'Estrategia 2027', 'question': 'Cuatro ejes, un mismo', 'answer': ['Sistema']}
d['body'] = 'Cada eje responde a un requisito de las bases y se mide contra la **rampa de KPIs** acordada.'
d['pillars'] = [
    {'label': 'Conversión', 'text': 'landings y formularios fuera de ksb.com.'},
    {'label': 'Medición', 'text': 'del clic a la cotización, en su CRM.'},
    {'label': 'Demanda y contenido', 'text': 'por segmento, con un gancho propio.'},
]
add('K06-seccion-estrategia', 'section-cine-purpose', d, '06 · sección · estrategia')

# 07 · Los cuatro canales: retirada (06/11). content-service-lanes exige íconos de producto de HubSpot o Salesforce;
# los canales los muestra el inserto 360° p40 «Las justas», que va justo después de la sección.

# 08 · Eje 1 · Conversión fuera de ksb.com
d = base(EX, 'deck-decision-traffic-to-revenue-intent.json')
d['voice'] = {'eyebrow': 'Eje 1 · Conversión', 'question': 'Del anuncio a la cotización, sin tocar', 'answer': ['Su sitio']}
d['body'] = 'El sitio lo gobierna la casa matriz: la conversión ocurre en **landings y formularios** que KSB autoriza.'
d['steps'] = [
    {'number': '01', 'name': 'Anuncio', 'description': 'Por segmento: minería, agua, riego y distribuidores.', 'channel': 'Google · LinkedIn · Meta'},
    {'number': '02', 'name': 'Landing', 'description': 'Una por línea, en un dominio que KSB autoriza.', 'channel': 'Fuera de ksb.com'},
    {'number': '03', 'name': 'Lead calificado', 'description': 'Rubro, faena, equipo y plazo en cada formulario.', 'channel': 'Formularios · CRM'},
    {'number': '04', 'name': 'Cotización', 'description': 'El área comercial la registra y se mide el cierre.', 'channel': 'CRM de KSB'},
]
d['cutLabel'] = 'Hoy la medición se detiene aquí'
add('K08-conversion', 'decision-traffic-to-revenue', d, '08 · eje 1 · conversión')

# 09 · Eje 2 · Medición conectada al CRM
d = base(EX, 'deck-proposal-service-revops-intent.json')
d['voice'] = {'eyebrow': 'Eje 2 · Medición', 'question': 'Cada lead se mide hasta', 'answer': ['El cierre']}
d['body'] = 'Definimos con su área comercial qué es un MQL y qué es un SQL, y conectamos campañas, formularios y CRM.'
d['steps'] = [
    {'kicker': 'Mes 1', 'name': 'Definición', 'desc': 'MQL, SQL y etapas, acordados con ventas.'},
    {'kicker': 'Mes 1', 'name': 'Conexión', 'desc': 'Formularios, CRM y Google Analytics enlazados.'},
    {'kicker': 'Desde el mes 2', 'name': 'Conversiones offline', 'desc': 'Las cotizaciones vuelven a Google y LinkedIn.'},
    {'kicker': 'Cada semana', 'name': 'Tablero', 'desc': 'ROAS, costo por lead y MQL al día.'},
]
d['note'] = 'HubSpot, Marketo u otro CRM: se confirma con su equipo.'
d['selection'] = {'target': 'object', 'label': 'Comercial', 'participantKind': 'department'}
add('K09-medicion', 'proposal-service-revops', d, '09 · eje 2 · medición')

# 10 · Ejes 3 y 4 · Demanda por segmento y contenido
d = base(EX, 'deck-proposal-service-creative-intent.json')
d['voice'] = {'eyebrow': 'Ejes 3 y 4 · Demanda y contenido', 'question': 'Contenido técnico para quien', 'answer': ['Especifica']}
d['body'] = 'Contenido de costo total de propiedad, casos chilenos y servicio, distribuido donde decide cada segmento.'
d['steps'] = [
    {'kicker': 'Gancho propio', 'name': 'Mida su bomba', 'desc': 'Sonolyzer y KSB Guard, también con equipos de otras marcas.'},
    {'kicker': 'Por segmento', 'name': 'Series técnicas', 'desc': 'Desalación, relaves, riego y edificación, en LinkedIn y YouTube.'},
    {'kicker': 'Hito 2027', 'name': 'Expomin', 'desc': 'Del 20 al 24 de abril: captura de leads y seguimiento.'},
]
d.pop('proof', None)
d['selection'] = {'target': 'object', 'label': 'KSB', 'participantKind': 'department'}
add('K10-contenido', 'proposal-service-creative', d, '10 · ejes 3 y 4 · demanda y contenido')

# 11 · Plan 2027
d = base(FA, 'F12-cronograma.json')
d['voice'] = {'eyebrow': 'Plan 2027', 'question': 'De la línea base a la consolidación, en', 'answer': ['Cuatro', 'etapas']}
d['body'] = 'Cada etapa sigue la rampa de KPIs de las bases y se revisa **cada mes** con su equipo.'
d['steps'] = [
    {'kicker': 'Enero–marzo', 'name': 'Ramp-up', 'desc': 'Entrega: línea base, landings, formularios y CRM conectados.'},
    {'kicker': 'Abril', 'name': 'Expomin', 'desc': 'Entrega: campaña de la feria, captura de leads y seguimiento.'},
    {'kicker': 'Abril–septiembre', 'name': 'Escalado', 'desc': 'Entrega: inversión en los segmentos que mejor convierten.'},
    {'kicker': 'Octubre–diciembre', 'name': 'Consolidación', 'desc': 'Entrega: informe anual y plan para la prórroga.'},
]
d['selectedStep'] = 1
add('K11-plan', 'method-waves', d, '11 · plan 2027')

# 12 · Rampa de KPIs (bases 4.1 y 6.1)
d = base(EX, 'deck-content-measure-intent.json')
d['version'] = '0.1.2'
d['voice'] = {'eyebrow': 'Rampa de KPIs · bases, punto 4.1', 'question': 'Cumplimiento exigido para la prórroga:', 'answer': ['90 %']}
d['body'] = 'de los KPIs del período, según las bases. La meta sube cada trimestre y se mide cada mes.'
d['measure'] = {'value': 0.9, 'source': 'Bases LIC-MKT-2026-001, punto 6.1'}
d['figures'] = [
    {'value': '200 %', 'label': 'ROI de publicidad al Q4', 'source': 'Bases, punto 4.1'},
    {'value': '3,0', 'label': 'ROAS de SEM y social, Q4', 'source': 'Bases, punto 4.1'},
]
add('K12-kpis', 'content-measure', d, '12 · rampa de KPIs')

# 13 · Condiciones de los KPIs (sólo claro: growth)
d = base(FA, 'F09e-continuidad.json', theme='light')
d['progress'] = {'sections': SECTIONS, 'current': 2}
d['voice'] = {'eyebrow': 'Condiciones de los KPIs', 'question': 'Cada KPI, con su', 'answer': ['Condición']}
d['body'] = 'Las bases ya condicionan el ROI y el ROAS (punto 6.3). Proponemos lo mismo para los KPIs de funnel.'
d['risks'] = [
    {'risk': 'Sin línea base', 'name': 'Medición en el mes 1', 'how': 'Costo por lead, conversión y MQL se miden en el Q1 antes de fijar la meta.'},
    {'risk': 'Lead sin gestión', 'name': 'Acuerdo con ventas', 'how': 'Tiempo de respuesta y resultado registrado en el CRM para cada lead.'},
    {'risk': 'Venta fuera de línea', 'name': 'Conversiones offline', 'how': 'Las cotizaciones y ventas del CRM vuelven a Google y LinkedIn.'},
    {'risk': 'Ciclo largo', 'name': 'Lectura por trimestre', 'how': 'Lead-to-customer y retención se leen sobre el ciclo real de venta.'},
]
d['selected'] = 1
d['selection'] = {'target': 'object', 'label': 'Comercial', 'participantKind': 'department'}
add('K13-condiciones', 'decision-risk', d, '13 · condiciones de los KPIs')

# 14 · Sección · equipo (cine, QS1b)
d = base(FA, 'F17-equipo.json')
d['voice'] = {'eyebrow': 'Quién lo hace', 'question': 'Siete roles y un solo', 'answer': ['Contacto']}
d['body'] = 'Los siete roles que piden las bases y **un** responsable de cuenta como contraparte única de su equipo.'
d['photo'] = {**d.get('photo', {}), 'register': 'cine', 'subject': 'person', 'plateRef': 'ai-generations/2026-09-27_quienes-somos/plates/QS1b-un-solo-equipo.png', 'alt': 'Una diseñadora y un diseñador de Efeonce revisan pruebas impresas sobre una mesa de luz, mientras un director sonríe detrás'}
add('K14-seccion-equipo', 'section-cine-team', d, '14 · sección · equipo')

# 16 · Sección · referencias (después: insertos 360° p34, p20, p62)
d = base(EX, 'deck-section-classic-intent.json', theme='light')
d['progress'] = {'sections': SECTIONS, 'current': 4}
d['voice'] = {'question': 'Tres referencias que usted puede', 'answer': ['Verificar']}
add('K16-seccion-referencias', 'section-classic', d, '16 · sección · referencias')

# 18 · Sección · económica
d = base(EX, 'deck-section-classic-intent.json', theme='light')
d['progress'] = {'sections': SECTIONS, 'current': 5}
d['voice'] = {'question': 'La inversión, por mes y por', 'answer': ['Servicio']}
add('K18-seccion-economica', 'section-classic', d, '18 · sección · económica')

# 19 · Económica (montos [MONTO] hasta GO; detalle en anexo A4)
d = base(EX, 'deck-content-pricing-intent.json')
d['voice'] = {'eyebrow': 'Económica', 'question': 'Tarifa fija, aparte de', 'answer': ['Los medios']}
d['body'] = 'Tarifa fija de agencia y una inversión en medios que se gestiona sin margen, en las cuentas de KSB.'
d['legal'] = 'Valores netos, IVA no incluido. Montos por confirmar en la oferta económica.'
d['period'] = 'al mes · neto + IVA'
d['recommended'] = 2
d['recommendedLabel'] = 'Recomendado'
d['plans'] = [
    {'name': 'Esencial', 'tagline': 'Para empezar a medir', 'features': ['SEM de intención alta', 'LinkedIn por cuentas', 'Landings y formularios', 'Tablero mensual']},
    {'name': 'Integral', 'tagline': 'Los cuatro canales', 'features': ['Todo lo de Esencial', 'Social pagado y redes', 'Contenidos por segmento', 'Medición hasta el cierre', 'Tablero semanal']},
    {'name': 'Con la red', 'tagline': 'Para sumar la red', 'features': ['Todo lo de Integral', 'Programa para distribuidores', 'Campaña Expomin 2027', 'Revisión trimestral con la gerencia']},
]
d['selection'] = {'target': 'object', 'label': 'Finanzas', 'participantKind': 'department'}
add('K19-economica', 'content-pricing', d, '19 · económica')

# 20 · Próximos pasos
d = base(FA, 'F20-pasos.json')
d['voice'] = {'eyebrow': 'Próximos pasos', 'question': 'El siguiente paso es', 'answer': ['Presentar']}
d['body'] = 'Como finalistas, presentamos el plan del primer trimestre.'
a = d['agenda']
a['kicker'] = '01 · Finalistas · 1–3 de diciembre'
a['title'] = 'El plan del Q1, en vivo'
a['descriptor'] = 'Línea base, landings por segmento, tablero y calendario de Expomin'
a['summary'] = 'A coordinar con Marketing de KSB'
a['cta'] = 'Agendar la presentación'
a['days'] = [{'weekday': 'Lun', 'day': '30'}, {'weekday': 'Mar', 'day': '1'}, {'weekday': 'Mié', 'day': '2'}, {'weekday': 'Jue', 'day': '3'}, {'weekday': 'Vie', 'day': '4'}]
a['chosen'] = {'day': 3, 'time': 2}
d['nextSteps'] = [
    {'number': '02', 'label': 'Estrategia', 'title': 'Plan 2027', 'desc': 'Del 15 al 28 de diciembre, con su equipo.'},
    {'number': '03', 'label': 'Inicio', 'title': 'Enero 2027', 'desc': 'Ramp-up y línea base desde el primer día.'},
]
add('K20-pasos', 'decision-next-steps', d, '20 · próximos pasos')

# 21 · Contraportada
d = base(EX, 'deck-close-proposal-horizon-intent.json')
add('K21-contraportada', 'close-proposal-horizon', d, '21 · contraportada')

ORDEN = ['K01-portada', 'K02-resumen', 'K03-seccion-comprension', 'K04-como-compra', 'K05-diagnostico',
         'K06-seccion-estrategia', 'K08-conversion', 'K09-medicion', 'K10-contenido', 'K11-plan',
         'K12-kpis', 'K13-condiciones', 'K14-seccion-equipo', 'K16-seccion-referencias', 'K18-seccion-economica',
         'K19-economica', 'K20-pasos', 'K21-contraportada']
assert sorted(ORDEN) == sorted(k for k, *_ in slides), set(ORDEN) ^ {k for k, *_ in slides}
slides.sort(key=lambda t: ORDEN.index(t[0]))
plan = {'document': 'proposal', 'line': 'growth', 'slides': []}
for key, recipe_id, intent, purpose in slides:
    ans = (intent.get('voice') or {}).get('answer')
    if ans and ans[0][:1].islower():
        ans[0] = ans[0][:1].upper() + ans[0][1:]
    with open(os.path.join(OUT, key + '.json'), 'w', encoding='utf-8') as fh:
        json.dump(intent, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    entry = {'recipeId': recipe_id, 'purpose': purpose}
    photo = intent.get('photo') or {}
    if photo.get('plateRef'):
        entry['plateRef'] = photo['plateRef']
    plan['slides'].append(entry)

with open(os.path.join(ROOT, 'plan-compuesto.json'), 'w', encoding='utf-8') as fh:
    json.dump(plan, fh, ensure_ascii=False, indent=2)
    fh.write('\n')
print(len(slides), 'intents en', OUT)
