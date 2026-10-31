/**
 * Spec V1 del refresh «Marketing de contenidos para generar leads» (post 244883, misma URL), voz Julio.
 * Texto: docs/public-site/CONTENT_MARKETING_LEADS_REFRESH_DRAFT_V1.md §3; hechos: §5 (claim ledger).
 * Infografía 1: infografia/ (sólo las versiones claras en el artículo: el sitio no sigue el modo oscuro del sistema,
 * decisión de Julio del 2026-10-25 en el ICP). Los ids de los adjuntos salen de infografia/upload-result.json.
 *   node ai-generations/2026-10-26_marketing-contenidos-leads/build-spec-v1.cjs
 */
const { existsSync, readFileSync, writeFileSync } = require('node:fs')
const { resolve } = require('node:path')

const URL = 'https://efeoncepro.com/inbound/genera-leads-con-marketing-de-contenidos/'
const P = text => ({ kind: 'paragraph', text })
const t = (text, extra = {}) => ({ text, ...extra })
// Links go in bold (voz de Julio §4.6).
const a = (text, href) => ({ text, href, strong: true })
const b = text => ({ text, strong: true })
// Efeonce landings, services and products go as an AXIS mention, not as a plain link.
const M = (text, href, line) => ({ text, href, mention: { line } })

const SRC = {
  cmi: 'https://contentmarketinginstitute.com/b2b-research/b2b-content-marketing-trends-research',
  hubspot: 'https://blog.hubspot.com/marketing/hubspot-blog-marketing-industry-trends-report',
  pew: 'https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/',
  sparktoro: 'https://sparktoro.com/blog/in-2026-less-than-one-third-of-google-searches-still-send-a-click/'
}

const IN = {
  pipeline: 'https://efeoncepro.com/hubspot/pipeline-de-ventas/',
  seoAeo: 'https://efeoncepro.com/aeo/seo-y-aeo/',
  inbound: 'https://efeoncepro.com/inbound/que-es-inbound-marketing/',
  workflows: 'https://efeoncepro.com/design/creative-workflows/',
  glitch: 'https://efeoncepro.com/category/glitch/',
  grader: 'https://think.efeoncepro.com/brand-visibility',
  landing: 'https://efeoncepro.com/servicio-marketing-de-contenidos/'
}

const runDir = __dirname
const meta = JSON.parse(readFileSync(resolve(runDir, 'infografia/media-meta.json'), 'utf8'))['contenido-una-idea-cada-formato']
const uploadFile = resolve(runDir, 'infografia/upload-result.json')
// Sin subida todavía, ids provisionales para validar la estructura; la copia privada exige los reales.
const uploaded = existsSync(uploadFile) ? JSON.parse(readFileSync(uploadFile, 'utf8')) : []
const media = name => uploaded.find(u => u.file === name) ?? { id: 1, url: `https://efeoncepro.com/wp-content/uploads/2026/10/${name}` }
const desktop = media('contenido-una-idea-cada-formato-desktop-light.svg')
const mobile = media('contenido-una-idea-cada-formato-mobile-light.svg')

const spec = {
  title: 'Marketing de contenidos para generar leads en la era de la IA',
  slug: 'genera-leads-con-marketing-de-contenidos',
  excerpt:
    'Cómo generar leads con marketing de contenidos en 2026: qué cambió con la IA, qué contenido sirve en cada etapa, cómo armar el sistema que lo sostiene y cómo medir si trae negocio.',
  seo: {
    title: 'Marketing de contenidos para generar leads: cómo armar el sistema | Efeonce',
    description:
      'Cómo generar leads con marketing de contenidos en 2026: qué contenido sirve en cada etapa, cómo armar el sistema que lo sostiene y cómo medir si trae negocio.',
    canonicalUrl: URL,
    inLanguage: 'es-CL',
    indexPolicy: 'index'
  },
  intro: [
    'El martes publicas un buen artículo. Lo investigaste, tiene fuentes, se lee bien. Lo compartes en LinkedIn, juntas dos «me gusta» y un comentario de un colega. Un mes después alguien pregunta en la reunión por qué el contenido no trae leads, y nadie tiene una respuesta mejor que «hay que publicar más».',
    [
      t('Ahí hay algo que no calza. '),
      b('El artículo no era malo: estaba solo.'),
      t(' No tenía a dónde llevar al lector, nadie lo convirtió en otra cosa y nadie midió qué hacer con lo que pasó.')
    ],
    'Mi lectura es que el marketing de contenidos sí genera leads, pero no como lo estamos haciendo la mayoría de las veces: pieza por pieza. Vamos por partes.'
  ],
  tableOfContents: true,
  sections: [
    {
      heading: '¿Puede el marketing de contenidos generar leads?',
      level: 2,
      blocks: [
        P([
          t('Sí. El '),
          b('marketing de contenidos'),
          t(' genera leads cuando una pieza útil responde una pregunta real de tu cliente y, en el mismo recorrido, le ofrece un siguiente paso que vale la pena: suscribirse, usar una herramienta, descargar una guía o pedir un diagnóstico. Sin ese siguiente paso, el contenido atrae lectores, pero no contactos.')
        ]),
        P([
          t('Conviene separar dos cosas desde el principio. Un '),
          b('lead'),
          t(' es alguien que te dejó sus datos o pidió algo. Una '),
          b('oportunidad'),
          t(' es un lead que confirmó una necesidad. Si los mezclas, el contenido parece funcionar mucho mejor de lo que funciona; lo explico con más detalle en '),
          a('cómo configurar el pipeline de ventas en HubSpot', IN.pipeline),
          t('.')
        ]),
        P([
          t('Los equipos de marketing lo saben, y aun así les cuesta. En el '),
          a('estudio de tendencias B2B del Content Marketing Institute', SRC.cmi),
          t(' publicado en octubre de 2025, '),
          b('sólo el 12 % de los marketers B2B dijo que su contenido superó sus metas'),
          t(', y el reto más citado fue justamente '),
          b('crear contenido que provoque una acción (40 %)'),
          t('. La muestra es mayormente de Norteamérica, pero el problema se reconoce en cualquier mercado: publicar no es lo mismo que convertir.')
        ]),
        {
          kind: 'chart',
          chart: {
            kind: 'per-hundred',
            categories: ['marketers B2B dice que su contenido superó sus metas'],
            series: [{ name: 'Marketers B2B', values: [12] }]
          },
          title: 'Sólo 12 de cada 100 marketers B2B dice que su contenido superó sus metas',
          caption: 'El reto más citado fue crear contenido que provoque una acción (40 %).',
          sourceLabel: 'Content Marketing Institute, B2B Content Marketing Benchmarks, Budgets, and Trends: Insights for 2026',
          sourceUrl: SRC.cmi,
          tone: 'light'
        },
        { kind: 'pullquote', text: [t('Una pieza suelta compite sola: '), b('los leads los genera el sistema que la rodea.')] }
      ]
    },
    {
      heading: '¿Qué cambió con la IA en el marketing de contenidos?',
      level: 2,
      blocks: [
        P('La IA no cambió por qué funciona el contenido: sigue funcionando porque ayuda a alguien a decidir. Cambió el camino por el que llega a esa persona, lo fácil que es producirlo y la forma en que se investiga una compra. Son tres cambios, y cada uno le pide algo distinto a tu contenido.')
      ]
    },
    {
      heading: 'Las respuestas llegan antes del clic',
      level: 3,
      blocks: [
        P([
          t('Antes, que te encontraran terminaba en una visita. Hoy, muchas veces termina en una respuesta. Cuando Google muestra un resumen hecho con IA, '),
          b('las personas hacen clic en un resultado en el 8 % de las visitas, frente al 15 % cuando no hay resumen'),
          t(', según un '),
          a('análisis de Pew Research Center (2025)', SRC.pew),
          t(' sobre 900 adultos en Estados Unidos. Y en el primer tercio de 2026, '),
          b('el 68 % de las búsquedas en Google en Estados Unidos terminó sin un clic'),
          t(', según '),
          a('SparkToro con datos de Similarweb', SRC.sparktoro),
          t('.')
        ]),
        P([
          t('Eso le pide dos cosas al contenido: que sea '),
          b('citable'),
          t(', claro y con fuentes, para que una IA pueda tomarlo y atribuírtelo; y que '),
          b('la visita que sí llega encuentre un siguiente paso'),
          t(', porque vale más que antes. El detalle de cómo aparecer en esas respuestas está en '),
          a('SEO y AEO: cómo aparecer en Google y en la IA', IN.seoAeo),
          t('.')
        ]),
        { kind: 'growthCta', cta: 'blog-aeo-assessment', location: 'blog_article', emphasis: '¿aparece tu marca?', tone: 'light', mark: 'aeo-assessment' }
      ]
    },
    {
      heading: 'Producir se volvió fácil, y lo genérico abunda',
      level: 3,
      blocks: [
        P([
          t('Hoy cualquier equipo puede publicar el triple con la misma gente. El problema es que todos pueden. En el '),
          a('estudio del Content Marketing Institute', SRC.cmi),
          t(', entre quienes usan IA para crear contenido, '),
          b('el 58 % dice que la calidad mejoró, pero sólo el 39 % ve mejores resultados'),
          t('. Y en el '),
          a('informe de HubSpot de 2026', SRC.hubspot),
          t(', '),
          b('el 62,7 % cree que hace falta más contenido único y centrado en las personas para competir con el contenido hecho con IA'),
          t('.')
        ]),
        P([
          t('Mi lectura es que la IA bajó el costo de producir y subió el valor de lo que no se puede producir en serie: '),
          b('una idea propia, experiencia real y fuentes que se pueden verificar.'),
          t(' Más piezas iguales no generan más leads; generan más ruido.')
        ])
      ]
    },
    {
      heading: 'Tu cliente investiga con la IA antes de hablar contigo',
      level: 3,
      blocks: [
        P('Cada vez más, la primera conversación de una compra ocurre con un asistente de IA: qué opciones hay, cómo se comparan, qué dicen otros. Ese asistente arma su respuesta con lo que encuentra sobre ti en tu sitio, en tus redes, en directorios y en lo que otros publican.'),
        P([
          t('Eso le pide al contenido '),
          b('consistencia'),
          t(': que tu idea se diga igual en el artículo, en el carrusel y en el caso de éxito, para que la IA la resuma bien y no mezcle versiones. Es una razón más para trabajar con una idea y sus formatos, y no con piezas sueltas que dicen cosas distintas.')
        ])
      ]
    },
    {
      heading: '¿Qué contenido genera leads en cada etapa?',
      level: 2,
      blocks: [
        P('No todo contenido sirve para pedir un contacto, y pedirlo en el momento equivocado espanta. La pregunta útil es qué está tratando de resolver tu cliente en cada etapa y qué le puedes ofrecer a cambio de sus datos.'),
        {
          kind: 'table',
          style: 'efeonce',
          headers: ['Etapa', 'Lo que tu cliente se pregunta', 'Formato que responde', 'Cómo pide el contacto'],
          rows: [
            ['Descubre el problema', '¿Por qué me pasa esto? ¿A otros les pasa?', 'Artículo de blog, post de LinkedIn, video corto', 'Suscripción al newsletter'],
            ['Busca cómo resolverlo', '¿Qué opciones tengo? ¿Cómo lo hacen otros?', 'Guía, comparativa, plantilla', 'Herramienta gratuita o guía descargable'],
            ['Evalúa a quién elegir', '¿Funciona en una empresa como la mía?', 'Caso de éxito, webinar, demo', 'Diagnóstico o reunión'],
            ['Ya es cliente', '¿Cómo saco más provecho?', 'Tutoriales, sesiones, comunidad', 'Referidos y expansión']
          ]
        },
        P([
          t('Para distribuir ideas que posicionan a una marca, los marketers B2B califican como más eficaces '),
          b('LinkedIn (76 %), los newsletters (54 %) y los eventos y webinars (52 %)'),
          t(', según el mismo '),
          a('estudio del Content Marketing Institute', SRC.cmi),
          t('. Es su percepción, no la conducta del comprador, pero coincide con la tabla: el contacto se gana donde la relación continúa.')
        ]),
        P([
          t('Tal vez estarás pensando que esto es el embudo de siempre con otro nombre. No del todo: el orden no es fijo. Tu cliente salta de una etapa a otra y vuelve, como explico en '),
          a('qué es el inbound marketing', IN.inbound),
          t('. Lo que sí es fijo es que '),
          b('cada pieza tiene que saber en qué etapa vive y qué pide a cambio'),
          t('.')
        ])
      ]
    },
    {
      heading: '¿Cómo se arma el sistema que genera leads?',
      level: 2,
      blocks: [
        {
          kind: 'pullquote',
          variant: 'cita',
          text: 'Menos actos aleatorios de contenido, más dirección coordinada.',
          cite: [
            t('Robert Rose, '),
            a('Content Marketing Institute', SRC.cmi),
            t(', en el estudio de tendencias B2B 2026 («Fewer random acts of content, more coordinated direction»)')
          ]
        },
        P('El sistema no es una herramienta ni un calendario lleno. Es una forma de trabajar donde cada pieza nace sabiendo de dónde viene, en qué se va a convertir y cómo se va a medir.'),
        {
          kind: 'list',
          ordered: true,
          style: 'steps',
          items: [
            [b('Investiga preguntas reales.'), t(' Las que ya te hace tu equipo comercial, las que aparecen en Search Console y las que tu cliente le hace a la IA. Si nadie las pregunta, nadie las va a buscar.')],
            [b('Elige una idea, no un tema.'), t(' «Marketing de contenidos» es un tema; «una pieza suelta compite sola» es una idea. La idea es lo que se puede defender, adaptar y recordar.')],
            [b('Produce la pieza principal con fuentes.'), t(' Un artículo, una guía o un webinar con datos verificables y experiencia propia. Es la cantera de todo lo demás.')],
            [b('Adáptala a cada canal.'), t(' La misma idea contada como cada formato necesita: un carrusel la explica en láminas, un video corto la muestra, un newsletter la lleva a quien ya te sigue.')],
            [b('Publica con un siguiente paso.'), t(' Cada pieza termina en algo que el lector puede hacer: suscribirse, probar una herramienta, descargar una guía o pedir un diagnóstico.')],
            [b('Mide y decide qué repetir.'), t(' No por pieza, sino por tema: qué ideas trajeron conversaciones y cuáles sólo trajeron visitas.')]
          ]
        },
        {
          kind: 'image',
          mediaId: desktop.id,
          url: desktop.url,
          alt: meta.alt,
          width: 1600,
          height: 1000,
          sizeSlug: 'full',
          caption: meta.caption,
          linkDestination: 'none',
          sources: [{ media: '(max-width: 860px)', url: mobile.url }]
        },
        P([
          t('Te lo explico con manzanitas 🍏🍏🍏: piensa en la idea como una canción y en los formatos como sus versiones. La misma canción suena distinta en la radio, en un concierto y en un video de 30 segundos, y en cada lugar alcanza a gente distinta. Nadie graba una canción para tocarla una sola vez. Con el contenido pasa lo mismo: '),
          b('la idea es el activo; cada formato es una versión que la lleva a otro lugar.')
        ]),
        P([
          t('Adaptar no es copiar y pegar. En el '),
          a('informe de tendencias de HubSpot de 2026', SRC.hubspot),
          t(', '),
          b('el 49,4 % de los equipos usa el mismo contenido en todas las plataformas y el 39,5 % lo adapta a cada una'),
          t('. La primera opción ahorra tiempo; la segunda es la que hace que cada canal tenga una razón para mostrarte.')
        ])
      ]
    },
    {
      heading: '¿Cómo convertir lectores en leads sin espantarlos?',
      level: 2,
      blocks: [
        P('El error más común es pedir demasiado, demasiado pronto. Nadie entrega su correo a cambio de un artículo que puede leer gratis, pero sí a cambio de algo que le ahorra trabajo.'),
        {
          kind: 'list',
          items: [
            [b('Ofrece algo que valga la pena:'), t(' una plantilla, una herramienta que diagnostica, una guía que profundiza o una sesión con alguien que sabe. Lo que pides tiene que ser proporcional a lo que entregas.')],
            [b('Ponlo donde tiene sentido:'), t(' el llamado a la acción va en el párrafo que lo justifica, no sólo al final.')],
            [b('Pide lo mínimo:'), t(' nombre y correo corporativo bastan para empezar; el resto se conoce después.')],
            [b('Califica antes de vender.'), t(' '), b('Una descarga no es una oportunidad.'), t(' El lead se trabaja con más contenido hasta que confirma una necesidad; recién ahí entra al pipeline de ventas.')]
          ]
        },
        P([b('Errores frecuentes:')]),
        {
          kind: 'list',
          style: 'box',
          items: [
            'Publicar sin saber qué pregunta responde la pieza.',
            'Un único llamado a la acción, al final, igual en todos los artículos.',
            'Contar descargas como si fueran ventas.',
            'Producir cada formato desde cero en vez de adaptar una idea.',
            'Medir cada pieza por separado y no el tema completo.'
          ]
        }
      ]
    },
    {
      heading: '¿Cómo se mide si el contenido genera leads?',
      level: 2,
      blocks: [
        P([
          t('Hay dos tipos de señales y conviene no confundirlas. Las '),
          b('señales tempranas'),
          t(' dicen si el contenido está llegando: impresiones, posición, lectura, suscripciones. Los '),
          b('resultados'),
          t(' dicen si está trayendo negocio: leads que se convierten en oportunidades, reuniones y ventas en las que el contenido participó.')
        ]),
        P([
          t('Si te cuesta medir, no estás solo: '),
          b('medir el retorno es el reto número uno de 2026 para el 33 % de los marketers'),
          t(', según el '),
          a('informe de tendencias de HubSpot', SRC.hubspot),
          t('.')
        ]),
        P('Tres prácticas que ayudan:'),
        {
          kind: 'list',
          items: [
            [b('Mide por tema, no por pieza.'), t(' Un tema que trae leads a través de cinco formatos vale más que un artículo con muchas visitas.')],
            [b('Conecta el contenido con el CRM.'), t(' Si el lead entra a tu CRM con la pieza que lo trajo, puedes ver qué temas terminan en oportunidades y no sólo en descargas.')],
            [b('Decide con lo que mediste.'), t(' Cada mes, qué ideas repetir, cuáles adaptar a otro formato y cuáles dejar.')]
          ]
        }
      ]
    },
    {
      heading: 'Cómo lo hacemos en Efeonce',
      level: 2,
      blocks: [
        P('En Efeonce aplicamos este sistema a nuestro propio blog, y hay tres prácticas que nos cambiaron la forma de escribir.'),
        P([
          b('Partimos de lo que ya se pregunta.'),
          t(' Antes de escribir, miramos qué búsquedas traen hoy a cada artículo en Search Console y qué preguntas hace la gente a la IA sobre el tema. Muchas veces la pregunta que rinde no es la que habríamos elegido nosotros, y el artículo se ordena alrededor de ella.')
        ]),
        P([
          b('Cada cifra tiene que tener su fuente original.'),
          t(' Llevamos un registro de cada afirmación del texto: de dónde sale, qué demuestra y qué no. Si no encontramos el estudio original, la cifra no entra, aunque sea buena. Es la parte más incómoda del proceso, porque obliga a dejar fuera datos que circulan en todas partes, y también la que más confianza nos da al publicar.')
        ]),
        P([
          b('Nada sale sin una revisión completa.'),
          t(' Cada artículo se revisa en una copia privada, con la misma maqueta con la que se va a publicar, en escritorio y en teléfono, antes de que lo vea un lector. Y nace con su mapa: qué carrusel, qué newsletter y qué post van a salir de la misma idea.')
        ]),
        P([
          b('La IA trabaja dentro del sistema, no en lugar de él.'),
          t(' La usamos para investigar más rápido, ordenar fuentes, proponer estructuras y adaptar una idea a cada formato. Lo que no le delegamos es la tesis, la selección de fuentes y la aprobación final: el agente propone y una persona decide. Lo contamos con más detalle en '),
          a('Creative Workflows: cómo escalar la creatividad sin automatizar el criterio', IN.workflows),
          t('.')
        ]),
        P([t('Lo que aprendimos es que '), b('el sistema no hace más lento el contenido: hace que cada pieza trabaje más tiempo.')])
      ]
    },
    {
      heading: 'Preguntas frecuentes',
      level: 2,
      blocks: [
        {
          kind: 'faq',
          schema: { enabled: true, name: 'Preguntas frecuentes sobre marketing de contenidos para generar leads', canonicalUrl: URL, inLanguage: 'es-CL', source: 'plugin' },
          items: [
            {
              question: '¿Cuánto tarda el marketing de contenidos en generar leads?',
              answer: [P('Depende del punto de partida. Un sitio que ya tiene tráfico puede ver leads en semanas si agrega buenos siguientes pasos a lo que ya tiene; uno que parte de cero suele necesitar meses para que sus contenidos se posicionen y sean citados. Lo que acorta el plazo es trabajar ideas que ya se buscan y adaptarlas a varios canales desde el principio.')]
            },
            {
              question: '¿Qué formatos de contenido generan más leads?',
              answer: [P('Los que entregan algo concreto a cambio de los datos: guías descargables, plantillas, herramientas de diagnóstico, webinars y casos de éxito. Los artículos y los posts atraen y educan; el contacto suele llegar en la pieza siguiente.')]
            },
            {
              question: '¿El marketing de contenidos sirve en B2B?',
              answer: [P('Sí, y suele ser más importante que en B2C: la compra es más larga, la deciden varias personas y cada una busca respuestas distintas. Un mismo tema puede necesitar una guía para quien evalúa y un caso de éxito para quien aprueba.')]
            },
            {
              question: '¿Sirve el contenido hecho con IA para generar leads?',
              answer: [P('Sirve como apoyo para investigar, ordenar y adaptar, pero no reemplaza lo que hace que un contenido se elija: una idea propia, experiencia real y fuentes verificadas. En el estudio del Content Marketing Institute, entre quienes usan IA para crear contenido, el 58 % dice que la calidad mejoró, pero sólo el 39 % ve mejores resultados. El contenido genérico, con o sin IA, compite con miles de piezas iguales.')]
            },
            {
              question: '¿Cómo desarrollar una estrategia de marketing de contenidos que genere leads de forma sostenible?',
              answer: [P('Partiendo de las preguntas reales de tu cliente, eligiendo pocas ideas que puedas sostener, adaptándolas a cada canal con un siguiente paso claro y midiendo por tema para decidir qué repetir. Sostenible significa que el sistema se alimenta de lo que aprende, no que publicas más.')]
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
          t('El contenido sigue siendo una de las mejores formas de generar demanda. Lo que cambió es que una pieza sola ya no alcanza: compite con miles de otras y, cada vez más, con una respuesta de la IA. '),
          b('Lo que genera leads es el sistema: una idea, contada en cada formato, con un siguiente paso claro y medida para aprender.')
        ]),
        {
          kind: 'list',
          style: 'box',
          items: [
            [t('Si quieres seguir esta conversación, lee '), a('Glitch', IN.glitch), t(': cada lunes, una idea sobre IA, marketing y negocios.')],
            [t('Revisa cómo te describen hoy los asistentes de IA con el '), M('Efeonce AI Visibility Report', IN.grader, 'growth'), t(', gratuito.')],
            [t('Y si quieres armar el sistema de contenidos de tu equipo, conoce cómo trabajamos el '), M('marketing de contenidos', IN.landing, 'brand'), t('.')]
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
            [t('Pew Research Center (2025). '), a('Google users are less likely to click on links when an AI summary appears in the results', SRC.pew), t('.')],
            [t('Content Marketing Institute y MarketingProfs (2025). '), a('B2B Content Marketing Benchmarks, Budgets, and Trends: Insights for 2026', SRC.cmi), t('.')],
            [t('HubSpot (2026). '), a('Marketing industry trends report', SRC.hubspot), t('.')],
            [t('SparkToro (2026). '), a('In 2026, less than one third of Google searches still send a click', SRC.sparktoro), t('.')]
          ]
        },
        P('Lo desarrolló Julio Reyes con apoyo de IA en investigación, estructura y edición; Julio definió la tesis y aprobó la versión final.')
      ]
    }
  ]
}

const out = resolve(runDir, '../../docs/public-site/CONTENT_MARKETING_LEADS_REFRESH_GUTENBERG_SPEC_V1.json')

writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`)
console.log(`spec → ${out}${uploaded.length ? '' : ' (ids provisionales: falta infografia/upload-result.json)'}`)
