/**
 * Spec V1 del refresh «Pipeline de ventas en HubSpot» (post 246045 → /hubspot/pipeline-de-ventas/), voz Julio.
 * Texto: docs/public-site/HUBSPOT_PIPELINE_REFRESH_DRAFT_V1.md §3; hechos: §5 (verificados 2026-10-26);
 * auditoría SEO/AEO: §9. Imágenes: interfaz oficial de HubSpot (Brandfolder de partners) sin modificar, subida el
 * 2026-10-26 como adjuntos 252155–252160.
 *   node ai-generations/2026-10-26_pipeline-hubspot/build-spec-v1.cjs
 */
const { writeFileSync } = require('node:fs')
const { resolve } = require('node:path')

const URL = 'https://efeoncepro.com/hubspot/pipeline-de-ventas/'
const P = text => ({ kind: 'paragraph', text })
const t = (text, extra = {}) => ({ text, ...extra })
// Links go in bold (voz de Julio §4.6).
const a = (text, href) => ({ text, href, strong: true })
const b = text => ({ text, strong: true })
// Efeonce landings, services and products go as an AXIS mention, not as a plain link.
const M = (text, href, line) => ({ text, href, mention: { line } })

const SRC = {
  pipelines: 'https://knowledge.hubspot.com/object-settings/set-up-and-customize-pipelines',
  rules: 'https://knowledge.hubspot.com/object-settings/set-up-pipeline-rules',
  approvals: 'https://knowledge.hubspot.com/object-settings/pipeline-approvals',
  automations: 'https://knowledge.hubspot.com/object-settings/set-up-pipeline-automations-for-objects',
  tags: 'https://knowledge.hubspot.com/object-settings/color-coded-object-tags',
  dealProps: 'https://knowledge.hubspot.com/properties/hubspots-default-deal-properties',
  objects: 'https://knowledge.hubspot.com/records/understand-objects',
  prospecting: 'https://knowledge.hubspot.com/prospecting/use-the-prospecting-agent',
  intent: 'https://knowledge.hubspot.com/reports/use-intent-signals',
  notetaker: 'https://knowledge.hubspot.com/meetings-tool/review-recommended-next-steps-for-deals',
  dealProgression: 'https://knowledge.hubspot.com/records/move-deals-forward-with-deal-progression',
  forecast: 'https://knowledge.hubspot.com/forecast/set-up-the-forecast-tool',
  aiForecast: 'https://knowledge.hubspot.com/forecast/improve-forecasting-with-ai-projections',
  teams: 'https://knowledge.hubspot.com/user-management/create-and-manage-teams',
  parentChild: 'https://knowledge.hubspot.com/records/add-a-parent-or-child-company',
  credits: 'https://www.hubspot.com/products/artificial-intelligence/credits'
}

const IN = {
  anam: 'https://efeoncepro.com/hubspot/dashboards-hubspot-confiables-caso-anam/',
  icp: 'https://efeoncepro.com/growth/cliente-ideal-b2b-icp-buyer-persona-ipp-jtbd/',
  glitch: 'https://efeoncepro.com/category/glitch/',
  hubspot: 'https://efeoncepro.com/servicios-contratar-hubspot/'
}

const UPLOADS = 'https://efeoncepro.com/wp-content/uploads/2026/10/'
const img = (mediaId, file, height, alt, caption) => ({
  kind: 'image',
  mediaId,
  url: `${UPLOADS}${file}`,
  alt,
  width: 1400,
  height,
  sizeSlug: 'full',
  caption,
  linkDestination: 'none'
})

const spec = {
  title: 'Pipeline de ventas en HubSpot: cómo configurarlo para que diga la verdad',
  slug: 'pipeline-de-ventas',
  excerpt:
    'Qué es un pipeline de ventas y cómo configurarlo en HubSpot: etapas con criterio de salida, reglas, previsión, y cómo usar el Prospecting Agent y Deal Progression sin que el pipeline mienta.',
  seo: {
    title: 'Pipeline de ventas en HubSpot: cómo configurarlo en 2026 | Efeonce',
    description:
      'Qué es un pipeline de ventas y cómo configurarlo en HubSpot: etapas con criterio de salida, reglas, previsión, Prospecting Agent y Deal Progression.',
    canonicalUrl: URL,
    inLanguage: 'es-CL',
    indexPolicy: 'index'
  },
  intro: [
    'Lunes, reunión de previsión. El tablero de negocios muestra una columna de «Negociación» llena, con un importe que haría feliz a cualquier gerente. Alguien pregunta cuántos de esos negocios se cierran este mes y la sala se queda en silencio. Nadie sabe. Todos sospechan que menos de la mitad.',
    [
      t('Hasta ahí, nada nuevo. Lo nuevo es esto: '),
      b('en 2026, HubSpot ya puede llenar la parte alta de ese pipeline'),
      t(' con un agente que investiga cuentas y redacta el primer correo, '),
      b('y proponer cómo actualizarlo'),
      t(' después de cada reunión. Entonces, si la máquina ya hace el trabajo pesado, ¿por qué el pipeline seguiría mintiendo?')
    ],
    'Mi lectura es que el problema nunca estuvo en la carga de datos. Estuvo en qué significa cada etapa. Si eso no está definido, el agente no lo arregla: lo acelera. Vamos por partes.'
  ],
  tableOfContents: true,
  sections: [
    {
      heading: '¿Qué es un pipeline de ventas y cómo funciona en HubSpot?',
      level: 2,
      blocks: [
        P([
          t('Un '),
          b('pipeline de ventas'),
          t(' es la secuencia de etapas por la que avanza una oportunidad, desde que existe hasta que se gana o se pierde, con una probabilidad de cierre asociada a cada etapa. En HubSpot, cada oportunidad es un '),
          b('negocio'),
          t(' (deal): la probabilidad de su etapa calcula el '),
          b('importe ponderado'),
          t(' que ves en la vista de tablero, y las etapas de cierre ganado (100 %) y perdido (0 %) son obligatorias para que los reportes funcionen.')
        ]),
        P([
          t('Antes del negocio hay otra pieza que conviene no mezclar: el '),
          a('objeto Leads', SRC.objects),
          t(', con su propio pipeline (por defecto: New, Attempting, Connected, Qualified y Disqualified). Ahí se trabaja a la persona o cuenta mientras todavía no hay una oportunidad. Usar leads requiere '),
          b('Sales Hub Professional o Enterprise'),
          t('.')
        ]),
        P('Tal vez estarás pensando que da lo mismo dónde viva un prospecto mientras esté en el CRM. No da lo mismo: un contacto que todavía no confirmó una necesidad, metido en el pipeline de negocios, infla la previsión desde el día uno.')
      ]
    },
    {
      heading: '¿Cómo diseñar las etapas antes de abrir la configuración?',
      level: 2,
      blocks: [
        P([
          t('Cada etapa se define por su '),
          b('criterio de salida'),
          t(': la evidencia de que el comprador hizo algo que acerca la decisión. En una venta B2B de servicios suelen bastar cuatro o cinco etapas abiertas, más ganado y perdido. Más etapas no dan más control: dan más lugares donde un negocio puede quedarse quieto.')
        ]),
        P([
          t('La pregunta útil no es «¿qué etapas tiene una venta?», sino '),
          b('«¿qué tiene que haber pasado para que un negocio avance?»'),
          t('. Y la respuesta que mejor funciona es una acción del comprador, no del vendedor.')
        ]),
        {
          kind: 'pullquote',
          text: [t('Una etapa no se gana por lo que hizo el vendedor: '), b('se gana por algo que hizo el comprador.')]
        },
        P([
          t('Te lo explico con manzanitas 🍏🍏🍏: «enviamos la propuesta» es algo que hiciste tú. «El cliente revisó la propuesta con quien firma y pidió ajustar el alcance» es algo que hizo él. Lo primero puede pasar sin que la venta avance un milímetro; lo segundo, no. A eso se le llama '),
          b('criterio de salida'),
          t(': la evidencia verificable que permite pasar a la siguiente etapa.')
        ]),
        {
          kind: 'table',
          style: 'efeonce',
          headers: ['Etapa', 'Criterio de salida (lo hizo el comprador)', 'Probabilidad inicial (ejemplo)'],
          rows: [
            ['Descubrimiento agendado', 'Aceptó una reunión para hablar de un problema concreto', '10 %'],
            ['Necesidad confirmada', 'Confirmó el problema, quién decide y un plazo', '25 %'],
            ['Propuesta en revisión', 'Revisó la propuesta con quien decide y pidió ajustes', '50 %'],
            ['Decisión en curso', 'Está validando términos, legal o compras', '75 %'],
            ['Ganado', 'Firmó', '100 %'],
            ['Perdido', 'Decidió no avanzar (con motivo registrado)', '0 %']
          ],
          caption:
            'Ejemplo de pipeline para una venta B2B de servicios. Las probabilidades son un punto de partida ilustrativo, no un estándar de la industria: se reemplazan con tu propio historial apenas lo tengas.'
        },
        P([
          t('Dos detalles que conviene tener claros. Primero, la '),
          b('probabilidad de una etapa'),
          t(' no es lo mismo que la '),
          b('tasa de conversión entre dos etapas'),
          t(': la primera es la chance de que ese negocio se cierre ganado; la segunda, cuántos pasan a la siguiente. Segundo, si alguien edita a mano la probabilidad de un negocio, '),
          a('HubSpot deja de actualizarla sola', SRC.dealProps),
          t(' cuando el negocio cambia de etapa. Conviene que eso sea la excepción.')
        ]),
        P([
          t('En Efeonce trabajamos con una regla simple: '),
          b('una señal de interés o un lead no es una oportunidad calificada'),
          t('. Si abres un negocio por cada señal, el pipeline crece en la reunión del lunes y se vacía en la del viernes. Por eso las señales se trabajan como leads hasta que alguien las califica.')
        ])
      ]
    },
    {
      heading: '¿Cómo crear y personalizar el pipeline en HubSpot?',
      level: 2,
      blocks: [
        P('Necesitas el permiso Edit property settings. Luego:'),
        {
          kind: 'list',
          ordered: true,
          style: 'steps',
          items: [
            [t('Ve a '), b('Configuración → Objetos → Negocios → pestaña Pipelines'), t(' y elige el pipeline (o créalo).')],
            [t('Agrega, renombra o reordena etapas con '), b('+ Agregar etapa'), t('. Cada etapa tiene un nombre interno para integraciones.')],
            [t('Define la '), b('probabilidad'), t(' de cada etapa, predefinida o personalizada.')],
            [
              t('En la lógica condicional de cada etapa, marca las '),
              b('propiedades obligatorias'),
              t(': el negocio no puede entrar a esa etapa sin completarlas. Es la forma de convertir el criterio de salida en un campo (por ejemplo, «quién decide» al entrar a Necesidad confirmada). La propiedad debe existir antes.')
            ],
            [t('Guarda. Para eliminar una etapa, primero hay que limpiar las referencias que aparecen en la columna «Se usa en».')]
          ]
        },
        P([t('No hace falta código. También puedes pedirle a '), b('Breeze Assistant'), t(' que cree el pipeline y después ajustarlo a mano.')]),
        P([
          t('Cuántos pipelines puedes tener depende del plan. '),
          a('El límite se comparte entre todos los objetos', SRC.pipelines),
          t(' y no cuenta el pipeline por defecto:')
        ]),
        {
          kind: 'table',
          style: 'efeonce',
          headers: ['Plan (cuentas por asiento)', 'Pipelines personalizados'],
          rows: [
            ['Herramientas gratuitas', '0'],
            ['Starter', '15'],
            ['Professional', '100'],
            ['Enterprise', '350']
          ]
        },
        P([
          t('En cuentas con Flexible Seats & Credits, los topes de Professional y Enterprise son 350. El detalle por objeto está en '),
          b('Gestión de datos → Modelo de datos → Límites'),
          t('.')
        ])
      ]
    },
    {
      heading: '¿Cómo evitar que el pipeline se desordene?',
      level: 2,
      blocks: [
        P([
          t('Un pipeline bien diseñado se degrada en semanas si cualquiera puede mover cualquier negocio a cualquier etapa. Para eso están las '),
          a('reglas de pipeline', SRC.rules),
          t(' (Professional o Enterprise; las configura un Super Admin):')
        ]),
        {
          kind: 'list',
          items: [
            [b('Restringir saltar etapas'), t(', en todas o en algunas. Siempre se puede mover a ganado o perdido.')],
            [b('Restringir retroceder'), t(' de etapa.')],
            [b('Limitar en qué etapas se crean negocios'), t(', para que nadie abra uno directamente en Decisión en curso.')],
            [b('Controlar quién edita'), t(' en ciertas etapas (por ejemplo, las cerradas).')],
            [
              a('Exigir aprobación', SRC.approvals),
              t(' antes de avanzar: una etapa Pending approval con hasta diez aprobadores. Requiere '),
              b('Sales Hub Enterprise'),
              t('.')
            ],
            [
              b('Obligar a crear un negocio'),
              t(' cuando un lead pasa a Qualified (Sales Hub Professional o Enterprise). Es la bisagra entre el pipeline de leads y el de negocios.')
            ]
          ]
        },
        P([
          t('Ojo con tres efectos de las reglas: con reglas activas '),
          b('no se puede editar en bloque'),
          t(' la etapa de los negocios; los Super Admins, los workflows y la API pueden saltárselas (salvo la aprobación); y una regla que nadie entiende se vuelve una molestia que el equipo rodea. Explícalas antes de activarlas.')
        ]),
        P([
          t('Lo que sí conviene automatizar desde el primer día son las '),
          a('automatizaciones por etapa', SRC.automations),
          t(': crear y asignar una tarea, avisar por correo interno o editar una propiedad cuando un negocio entra a una etapa (Sales o Service Hub, desde Starter). Y las '),
          a('etiquetas de negocio', SRC.tags),
          t(' de colores, que HubSpot aplica solas según filtros (por ejemplo, «sin actividad en 14 días»), ayudan a ver de un vistazo qué está estancado.')
        ])
      ]
    },
    {
      heading: '¿Uno o varios pipelines?',
      level: 2,
      blocks: [
        P([
          t('Un pipeline nuevo se justifica cuando el '),
          b('proceso de venta es distinto'),
          t(': otro tipo de venta (proyecto o renovación), otro ciclo u otros criterios de salida. Si sólo cambia el equipo o la marca, HubSpot recomienda '),
          b('un mismo pipeline con permisos por equipo'),
          t(' («Team only»), para que cada equipo vea sólo sus negocios.')
        ]),
        {
          kind: 'list',
          items: [
            [
              b('Restringir un pipeline por equipo:'),
              t(' Professional o Enterprise. Los '),
              a('equipos anidados', SRC.teams),
              t(' (jerarquía) requieren Enterprise.')
            ],
            [b('Territorios:'), t(' HubSpot no documenta una función de territorios propia; se modelan con equipos, propiedades y workflows.')],
            [
              b('Clonar un pipeline'),
              t(' (Professional o Enterprise) copia propiedades condicionales, reglas, automatizaciones, etiquetas y accesos. Sirve para probar un cambio de etapas sin tocar el pipeline en uso.')
            ],
            [
              b('Grupos con matriz y filiales:'),
              t(' HubSpot '),
              a('asocia empresas matriz y filial', SRC.parentChild),
              t(' (una filial tiene una sola matriz, en todos los planes), y con etiquetas de asociación puedes armar reportes de las filiales de una matriz.')
            ]
          ]
        }
      ]
    },
    {
      heading: '¿Cómo llena el Prospecting Agent la parte alta del pipeline?',
      level: 2,
      blocks: [
        P([
          t('El '),
          a('Prospecting Agent', SRC.prospecting),
          t(' de HubSpot investiga cuentas y contactos, vigila '),
          b('señales de compra'),
          t(' y redacta el contacto inicial. Se configura con plays: a quién le habla (segmentos de empresas que calzan con tu '),
          a('cliente ideal', IN.icp),
          t(' y perfiles de contacto), qué señales mira, cómo escribe y con qué límites.')
        ]),
        img(
          252155,
          'prospecting-agent-plays.webp',
          1050,
          'Interfaz de HubSpot: configuración de un play del Prospecting Agent con el método de comunicación en secuencia, tres pasos (correo automático, tarea de correo y llamada manual) y métricas de envíos, aperturas, clics, respuestas y reuniones.',
          'En cada play se elige cómo escribe el agente: pasos que decide él o una secuencia propia. Interfaz: HubSpot.'
        ),
        P('Lo que hace, según la documentación de HubSpot:'),
        {
          kind: 'list',
          items: [
            [
              b('Señales:'),
              t(' visitas e '),
              a('intención de búsqueda', SRC.intent),
              t(', menciones en el CRM (presupuesto, plazos, riesgo) y noticias de las empresas (financiamiento, lanzamientos, despidos), entre otras.')
            ],
            [b('Fuentes de contactos:'), t(' puede sugerir contactos nuevos o traerlos de una fuente externa conectada a la vez: Apollo, Surfe, ZoomInfo o Seamless.')],
            [b('Comunicación:'), t(' el agente decide los pasos dentro de un máximo de correos y una espera mínima, o sigue una secuencia que tú armas.')],
            [b('Dos modos:'), t(' Review emails, donde una persona aprueba cada correo antes de que salga, o Send without review.')],
            [
              b('Costo:'),
              t(' se cobra en créditos de HubSpot por cada lead para el que el agente genera un correo, lo haya recomendado él o lo hayas inscrito tú. El precio vigente está en la '),
              a('página de créditos de HubSpot', SRC.credits),
              t('.')
            ]
          ]
        },
        img(
          252156,
          'prospecting-agent-contact-sourcing.webp',
          1050,
          'Interfaz de HubSpot: borrador de correo del Prospecting Agent para una cuenta con señales de compra y, al lado, la lista de contactos sugeridos dentro de esa empresa.',
          'El agente sugiere contactos dentro de cada cuenta y redacta el primer correo. Interfaz: HubSpot.'
        ),
        P([
          t('En Efeonce usamos el Prospecting Agent conectado a '),
          b('Apollo'),
          t(': Apollo aporta los contactos y el agente investiga y propone a quién escribir. Lo que aprendimos al configurarlo:')
        ]),
        {
          kind: 'list',
          style: 'box',
          items: [
            [
              b('Empezamos en modo revisión.'),
              t(' Cada correo pasa por una persona antes de salir, con un máximo de cinco correos en treinta días, al menos dos días entre uno y otro, en español de Chile y sólo en horario hábil.')
            ],
            [
              b('La voz se entrena con correos reales.'),
              t(' Cargamos en las instrucciones del agente una guía armada desde correos propios. Tomó varias versiones: los primeros borradores sonaban inseguros, repetían el perfil del prospecto y acumulaban servicios. '),
              b('Después de cada ajuste, hay que leer un borrador nuevo'),
              t(': el cambio no se valida en la configuración, se valida en el correo.')
            ],
            [b('Una persona, un canal.'), t(' Nadie está al mismo tiempo en el agente de HubSpot y en una secuencia de Apollo.')]
          ]
        },
        img(
          252157,
          'prospecting-agent-advanced-settings.webp',
          1052,
          'Interfaz de HubSpot: configuración avanzada del Prospecting Agent con las instrucciones personalizadas activadas y un ejemplo de instrucciones sobre el tono y el seguimiento de los correos.',
          'En las instrucciones personalizadas se define cómo escribe el agente. Interfaz: HubSpot.'
        ),
        img(
          252158,
          'prospecting-agent-review-before-sending.webp',
          1052,
          'Interfaz de HubSpot: resumen del plan de comunicación del Prospecting Agent con la opción destacada de revisar los correos antes de enviarlos y los botones para editar el correo o iniciar la inscripción.',
          'Con la revisión activada, el agente pide aprobar cada correo antes de enviarlo. Interfaz: HubSpot.'
        ),
        P([
          t('Y lo más importante para el pipeline: '),
          b('el agente llena la parte alta, pero no decide qué es una oportunidad.'),
          t(' Un contacto que respondió entra como lead; el negocio se abre cuando alguien confirma una necesidad, que es exactamente el criterio de salida de la primera etapa.')
        ])
      ]
    },
    {
      heading: '¿Cómo se mantiene al día el pipeline con Notetaker y Deal Progression?',
      level: 2,
      blocks: [
        P('La otra mitad del problema del lunes es que los negocios no se actualizan. El vendedor sale de la reunión, tiene otra en diez minutos y la ficha del negocio queda como estaba hace tres semanas.'),
        P([
          a('Notetaker', SRC.notetaker),
          t(' graba y transcribe reuniones de Google Meet, Microsoft Teams y Zoom. Después de la reunión propone un resumen, tareas, un correo de seguimiento y '),
          b('cambios en propiedades del negocio'),
          t(', que el vendedor aprueba, edita o rechaza. Requiere un asiento de Sales o Service (en Starter, un asiento Core).')
        ]),
        P([
          a('Deal Progression', SRC.dealProgression),
          t(' (HubSpot la presentó como Smart Deal Progression) va un paso más allá: usa las transcripciones, los correos y las llamadas para sugerir cambios en las propiedades del negocio, con el valor actual al lado del sugerido, y '),
          b('próximas acciones'),
          t(': enviar un correo, agendar o preparar una reunión, crear una tarea o reactivar un negocio estancado. Se activa desde Agent Hub y está disponible para Sales Hub o Service Hub Professional y Enterprise.')
        ]),
        img(
          252159,
          'smart-deal-progression-update-crm.webp',
          1050,
          'Interfaz de HubSpot: panel de próximos pasos de un negocio con cambios propuestos a sus propiedades, cada uno con botones para aceptarlo o rechazarlo.',
          'Cada cambio propuesto se acepta o se rechaza, uno por uno. Interfaz: HubSpot.'
        ),
        P([
          t('En Efeonce usamos Notetaker en todas las reuniones junto con Deal Progression. La decisión que importa está en la configuración de captura: '),
          b('por cada propiedad, eliges si el cambio se aplica solo o queda esperando aprobación.'),
          t(' Nuestra recomendación es empezar con todo en revisión y pasar a automático sólo las propiedades donde la sugerencia casi nunca se corrige.')
        ]),
        img(
          252160,
          'smart-deal-progression-board-notification.webp',
          1050,
          'Interfaz de HubSpot: tablero de negocios con un aviso sobre una tarjeta que indica que, después de la última reunión, hay un borrador de seguimiento, tareas y cambios de propiedades listos para revisar.',
          'Después de una reunión, el tablero avisa que hay un seguimiento, tareas y cambios por revisar. Interfaz: HubSpot.'
        ),
        P('Las sugerencias sobre propiedades personalizadas consumen créditos; las estándar, no.')
      ]
    },
    {
      heading: '¿Cómo leer el pipeline: probabilidad, previsión y reportes?',
      level: 2,
      blocks: [
        P([
          t('Con etapas bien definidas, el '),
          b('importe ponderado'),
          t(' (importe × probabilidad de la etapa) empieza a significar algo. Para el seguimiento contra la meta está la '),
          a('herramienta de previsión', SRC.forecast),
          t(' (Sales o Service Hub Professional o Enterprise), con categorías como Pipeline, Best case y Commit y una vista por equipo. HubSpot tiene además una '),
          a('previsión con IA', SRC.aiForecast),
          t(' que proyecta un rango a partir de los negocios ganados de los últimos tres meses.')
        ]),
        P('Dos cuidados que vimos en terreno:'),
        {
          kind: 'list',
          items: [
            [
              b('El importe de un negocio no es facturación.'),
              t(' Un negocio puede incluir varias líneas, renovaciones o alcances distintos. La previsión habla de oportunidades, no de ingresos reconocidos.')
            ],
            [
              b('Los reportes dependen de las asociaciones.'),
              t(' En el '),
              a('caso de dashboards de ANAM', IN.anam),
              t(', la calidad de los reportes dependía de asociar cada negocio con su empresa. Sólo asociamos los que tenían evidencia convergente, y la cobertura pasó de '),
              b('47,98 % a 50,73 %'),
              t('. Subió poco a propósito: una asociación inventada mejora el número y empeora la decisión.')
            ]
          ]
        }
      ]
    },
    {
      heading: 'Preguntas frecuentes',
      level: 2,
      blocks: [
        {
          kind: 'faq',
          schema: { enabled: true, name: 'Preguntas frecuentes sobre el pipeline de ventas en HubSpot', canonicalUrl: URL, inLanguage: 'es-CL', source: 'plugin' },
          items: [
            {
              question: '¿Cuáles son las etapas de un pipeline de ventas?',
              answer: [P('Depende de tu proceso, pero una venta B2B típica pasa por descubrimiento, necesidad confirmada, propuesta, decisión y cierre (ganado o perdido). Lo que importa no es el nombre de la etapa sino su criterio de salida: qué hizo el comprador para avanzar.')]
            },
            {
              question: '¿En qué se diferencia un pipeline de un embudo de ventas?',
              answer: [P('El embudo describe el recorrido de los prospectos y cuántos llegan a cada fase, desde el primer contacto. El pipeline muestra los negocios abiertos que gestiona ventas, con su valor y su probabilidad de cierre. En HubSpot, lo primero se parece más al ciclo de vida y al pipeline de leads; lo segundo, al pipeline de negocios.')]
            },
            {
              question: '¿HubSpot permite crear pipelines personalizados ilimitados?',
              answer: [P('No. El tope de pipelines personalizados se comparte entre todos los objetos: 15 en Starter, 100 en Professional y 350 en Enterprise en cuentas por asiento (350 en Professional con Flexible Seats & Credits). El pipeline por defecto no cuenta.')]
            },
            {
              question: '¿Se pueden personalizar las etapas del pipeline sin código?',
              answer: [P('Sí. Se editan en Configuración → Objetos → Negocios → Pipelines: agregar, renombrar, reordenar, cambiar la probabilidad y marcar propiedades obligatorias por etapa. También se puede pedir a Breeze Assistant que cree el pipeline.')]
            },
            {
              question: '¿Se pueden exigir campos obligatorios por etapa?',
              answer: [P('Sí, con las propiedades condicionales de cada etapa: el negocio no entra a la etapa sin completarlas. Para impedir saltar o retroceder etapas se usan las reglas de pipeline (Professional o Enterprise).')]
            },
            {
              question: '¿Se puede duplicar un pipeline para hacer pruebas?',
              answer: [P('Sí. Clonar un pipeline (Professional o Enterprise) copia propiedades condicionales, reglas, automatizaciones, etiquetas y accesos.')]
            },
            {
              question: '¿HubSpot maneja territorios con pipelines separados y previsión consolidada?',
              answer: [P('No hay una función de territorios documentada como tal. Se resuelve con equipos (Professional o Enterprise; equipos anidados en Enterprise), restricción de pipelines por equipo y la vista por equipo de la herramienta de previsión.')]
            },
            {
              question: '¿Cómo se modela un holding con filiales y marcas?',
              answer: [P('Con empresas matriz y filial (una filial tiene una sola matriz) y reportes por etiqueta de asociación. Si las marcas venden con el mismo proceso, HubSpot recomienda un solo pipeline con permisos por equipo en vez de un pipeline por marca.')]
            },
            {
              question: '¿El Prospecting Agent crea negocios solo?',
              answer: [P('Su trabajo es investigar, sugerir contactos y redactar el contacto inicial. Que alguien responda no lo convierte en oportunidad: en Efeonce el negocio se abre cuando una persona confirma la necesidad.')]
            }
          ]
        }
      ]
    },
    {
      heading: 'En resumen',
      level: 2,
      blocks: [
        P([
          t('HubSpot ya puede llenar la parte alta del pipeline y proponer cómo mantenerlo al día. Lo que sigue siendo tuyo es decidir qué tiene que hacer el comprador para avanzar y quién aprueba lo que propone la máquina. '),
          b('Si esas dos decisiones están claras, los agentes te devuelven tiempo; si no, te devuelven un pipeline más grande y menos confiable.')
        ]),
        {
          kind: 'list',
          style: 'box',
          items: [
            [t('Si quieres seguir esta conversación, lee '), a('Glitch', IN.glitch), t(': cada lunes, una idea sobre IA, marketing y negocios.')],
            [
              t('Y si quieres revisar cómo está armado tu pipeline o activar estos agentes con criterio, mira cómo implementamos '),
              M('HubSpot', IN.hubspot, 'revenue-hubspot'),
              t('.')
            ]
          ]
        }
      ]
    },
    {
      heading: 'Fuentes y nota de actualización',
      level: 2,
      blocks: [
        {
          kind: 'list',
          items: [
            [t('HubSpot. '), a('Set up and manage object pipelines', SRC.pipelines), t(', actualizado el 29 de septiembre de 2026.')],
            [t('HubSpot. '), a('Set up rules for object pipelines', SRC.rules), t(' y '), a('Require approvals for deals', SRC.approvals), t(', septiembre de 2026.')],
            [t('HubSpot. '), a('Set up pipeline automations', SRC.automations), t(' y '), a('Color-coded object tags', SRC.tags), t(', 2026.')],
            [t('HubSpot. '), a('HubSpot\'s default deal properties', SRC.dealProps), t(' y '), a('Understand objects', SRC.objects), t(', septiembre y octubre de 2026.')],
            [t('HubSpot. '), a('Set up and use the prospecting agent', SRC.prospecting), t(' y '), a('Use intent signals', SRC.intent), t(', octubre y septiembre de 2026.')],
            [t('HubSpot. '), a('Record and take notes in meetings with Notetaker', SRC.notetaker), t(' y '), a('Move deals forward with deal progression', SRC.dealProgression), t(', octubre de 2026.')],
            [t('HubSpot. '), a('Set up the forecast tool', SRC.forecast), t(' y '), a('Improve forecasting with AI projections', SRC.aiForecast), t(', 2026.')],
            [t('HubSpot. '), a('Create and manage teams', SRC.teams), t(' y '), a('Add a parent or child company', SRC.parentChild), t(', 2026.')],
            [t('HubSpot. '), a('HubSpot Credits', SRC.credits), t('.')]
          ]
        },
        P('Funciones verificadas en la documentación de HubSpot en octubre de 2026. Lo desarrolló Julio Reyes con apoyo de IA en investigación, estructura y edición; Julio definió la tesis y aprobó la versión final.')
      ]
    }
  ]
}

const out = resolve(__dirname, '../../docs/public-site/HUBSPOT_PIPELINE_REFRESH_GUTENBERG_SPEC_V1.json')

writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`)
console.log(`spec → ${out}`)
