/**
 * Spec V1 del pilar «Qué es Loop Marketing» (fusión de 248398 + 248483), voz Julio.
 * Narrativa: docs/public-site/LOOP_MARKETING_REFRESH_DRAFT_V1.md §0; cifras y citas: §1 (verificadas 2026-10-26).
 *   node ai-generations/2026-10-26_loop-marketing/build-spec-v1.cjs
 */
const { writeFileSync } = require('node:fs')
const { resolve } = require('node:path')

const URL = 'https://efeoncepro.com/loop-marketing/que-es-loop-marketing/'
const P = text => ({ kind: 'paragraph', text })
const t = (text, extra = {}) => ({ text, ...extra })
// Links go in bold (Julio, 2026-10-26: «las negritas deben estar en los enlaces»).
const a = (text, href) => ({ text, href, strong: true })
const b = text => ({ text, strong: true })
// Efeonce landings, services and products go as an AXIS mention, not as a plain link.
const M = (text, href, line) => ({ text, href, mention: { line } })

const SRC = {
  hubspotEs: 'https://www.hubspot.es/loop-marketing',
  news: 'https://www.hubspot.com/company-news/loop',
  google4s: 'https://business.google.com/es-all/think/consumer-insights/nuevo-proceso-decision-de-compra/',
  googleHoliday: 'https://business.google.com/en-all/think/consumer-insights/modern-consumer-holiday-marketing-strategy/',
  fortune: 'https://fortune.com/2022/07/13/google-tiktok-instagram-search-engine-brainstorm-tech/',
  zeroClick: 'https://searchengineland.com/google-search-zero-click-study-2024-443869',
  rangan: 'https://www.techradar.com/pro/we-did-not-chase-clicks-we-build-trust-how-hubspot-wants-to-help-write-the-ai-marketing-playbook',
  halligan: 'https://www.techtarget.com/searchcustomerexperience/podcast/New-HubSpot-products-strategy-CMS-updates-from-Inbound',
  bain: 'https://www.bain.com/insights/e-loyalty-your-secret-weapon-on-the-web/',
  aiTrends: 'https://www.hubspot.com/hubfs/HubSpots%202025%20AI%20Trends%20for%20Marketers%20Report.pdf',
  semrush: 'https://www.semrush.com/blog/ai-search-seo-traffic-study/',
  // Loop 2026 (verified 2026-10-26; ledger in hubspot-solutions-partner SOURCES.md § Loop Marketing 2026).
  loopEn: 'https://www.hubspot.com/loop-marketing',
  book: 'https://www.hubspot.com/loop-marketing-book',
  unbound: 'https://unbound.hubspot.com/speakers/kipp-bodnar',
  stateOfMarketing: 'https://blog.hubspot.com/marketing/loop-marketing-trends',
  spring: 'https://www.hubspot.com/company-news/spring-2026-spotlight'
}

const IN = {
  express: 'https://efeoncepro.com/loop-marketing/express-voz-marca-ia-loop-marketing/',
  ejecutar: 'https://efeoncepro.com/loop-marketing/ejecutar-loop-marketing-hubspot/',
  seoAeo: 'https://efeoncepro.com/aeo/seo-y-aeo/',
  inbound: 'https://efeoncepro.com/inbound/que-es-inbound-marketing/',
  partner: 'https://efeoncepro.com/servicios-contratar-hubspot/'
}

const spec = {
  title: 'Qué es Loop Marketing: las 4 etapas del framework de HubSpot y su conexión con las 4S',
  slug: 'que-es-loop-marketing',
  excerpt:
    'Loop Marketing es el framework de cuatro etapas de HubSpot: Definición, Adaptación, Amplificación y Optimización. Qué cambia frente al embudo y al inbound, y cómo responde a las 4S de Google.',
  seo: {
    title: 'Qué es Loop Marketing: las 4 etapas del framework de HubSpot | Efeonce',
    description:
      'Loop Marketing es el framework de 4 etapas de HubSpot: Definición, Adaptación, Amplificación y Optimización. Cómo funciona y cómo responde a las 4S de Google.',
    canonicalUrl: URL,
    inLanguage: 'es-CL',
    indexPolicy: 'index'
  },
  intro: [
    [
      t('Kipp Bodnar, CMO de HubSpot, lo dijo sin rodeos cuando presentó Loop Marketing: «el embudo tradicional suponía que los clientes vendrían a ti». '),
      a('Y remató', SRC.news),
      t(': '),
      b('ese manual ya no funciona.')
    ],
    [
      t('Basta mirar cómo compra cualquiera de nosotros. Vemos un video en YouTube, seguimos en el scroll de Instagram, le preguntamos a Google o a ChatGPT y terminamos comprando en dos clics desde el celular. Todo en una tarde, y sin pasar ordenadamente por ninguna etapa. '),
      b('No hay embudo que aguante ese recorrido.')
    ],
    [
      t('En esta guía te explico qué es Loop Marketing, cuáles son sus cuatro etapas y en qué se diferencia del embudo y del inbound. También te muestro algo que no vas a encontrar en la documentación de HubSpot: '),
      b('cómo encaja con las 4S de Google'),
      t(', porque ahí está, para mí, la forma más clara de entender por qué funciona.')
    ]
  ],
  tableOfContents: true,
  sections: [
    {
      heading: '¿Qué es Loop Marketing?',
      level: 2,
      blocks: [
        {
          kind: 'paragraph',
          text: [
            t('Loop Marketing es el framework de cuatro etapas que HubSpot presentó en septiembre de 2025 para hacer marketing en la era de la IA. En vez de llevar a una persona por un embudo de principio a fin, '),
            b('la marca trabaja en un ciclo'),
            t(': define qué decir, lo adapta a cada persona, lo distribuye donde esa persona está y aprende de lo que pasó para la vuelta siguiente, que sale más rápida y más precisa.')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('HubSpot lo describe así en '),
            a('su página en español', SRC.hubspotEs),
            t(': «los humanos y la IA trabajan juntos para definir tu historia, adaptarla a tu audiencia, amplificarla a través de distintos canales y optimizarla en tiempo real».')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('Un año después, en '),
            a('UNBOUND 2026', SRC.unbound),
            t(' (el nuevo nombre de INBOUND), Kipp Bodnar y Kieran Flanagan lo presentaron como el sistema que probaron en el propio marketing de HubSpot, y lo llevaron a un libro: '),
            a('Loop: Outlearn. Outmarket. Outgrow.', SRC.book)
          ]
        },
        P('Vas a ver las etapas con dos juegos de nombres. Son las mismas:'),
        {
          kind: 'list',
          style: 'box',
          items: [
            [b('Definición'), t(' (Express): qué decir, cómo decirlo y por qué importa ahora.')],
            [b('Adaptación'), t(' (Tailor): que el mensaje se sienta personal, no sólo personalizado.')],
            [b('Amplificación'), t(' (Amplify): que tu contenido aparezca en todos los canales, incluidas las respuestas de la IA.')],
            [b('Optimización'), t(' (Evolve): aprender rápido y cambiar en días, no en trimestres.')]
          ]
        },
        P('Si prefieres escucharlo de HubSpot, así lo presentaron Yamini Rangan y Karen Ng en INBOUND 2025:'),
        { kind: 'embed', provider: 'youtube', url: 'https://www.youtube.com/watch?v=1YwSHwGM8ws', caption: 'Fuente: HubSpot, Spotlight de INBOUND 2025' },
        { kind: 'heading', text: 'No mata al inbound: lo continúa', level: 3 },
        {
          kind: 'paragraph',
          text: [
            t('Tal vez estarás pensando que esto es el inbound con otro nombre. No del todo: Loop Marketing no reemplaza al '),
            a('inbound marketing', IN.inbound),
            t('. Se construye sobre él. El inbound nos enseñó que atraer con valor y ganarse la confianza funciona mejor que interrumpir. El Loop suma lo que hoy falta: '),
            b('velocidad, presencia en todos los canales y aprendizaje continuo con IA'),
            t('. Si el inbound es la raíz, el loop es la savia que lo mantiene vivo.')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('HubSpot lo plantea igual en sus '),
            a('preguntas frecuentes', SRC.hubspotEs),
            t(': «los componentes básicos del Inbound Marketing siguen siendo esenciales, pero ya no son suficientes». Y trae un dato que conviene mirar de frente: en Latinoamérica, '),
            b('el 86 % conoce el inbound marketing, pero sólo el 60 % lo aplica bien'),
            t('. Antes de pensar en el loop, muchas marcas todavía tienen que terminar de hacer bien el inbound.')
          ]
        }
      ]
    },
    {
      heading: 'Del embudo al flywheel y al loop',
      level: 2,
      blocks: [
        P(
          'Para entender qué trae de nuevo el Loop, ayuda ver qué resolvió cada modelo anterior y dónde se quedó corto. Esta es mi lectura de esa evolución:'
        ),
        {
          kind: 'table',
          style: 'efeonce',
          headers: ['Modelo', 'Qué supone', 'Dónde se queda corto'],
          rows: [
            ['Embudo (funnel)', 'La persona avanza en orden: conoce, considera y decide', 'Linealidad muerta: describe un viaje que ya no existe'],
            ['Flywheel (2018)', 'El cliente en el centro: atraer, interactuar y deleitar sin fricción', 'Relato útil: inspiró, pero se quedaba más en la historia que en la ejecución diaria'],
            ['Loop (2025)', 'Un ciclo que aprende de cada interacción y vuelve a girar', 'Acción continua: un motor que se mide en días, no en trimestres']
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('El flywheel fue un gran avance. Brian Halligan, cofundador de HubSpot, lo resumió en INBOUND 2018 con una frase que sigue vigente: «antes ganaba el producto; hoy gana la experiencia del cliente» ('),
            a('TechTarget', SRC.halligan),
            t('). El Loop toma esa idea y la vuelve operación: no basta con girar alrededor del cliente, '),
            b('hay que aprender de él en cada vuelta'),
            t('.')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('Dicho en una línea: el embudo describe un viaje que ya no existe, el flywheel cuenta una buena historia y '),
            b('el loop te da un motor que aprende más rápido que tu competencia'),
            t('. Ojo: esta comparación es nuestra. HubSpot presenta el Loop como continuación del inbound, no como reemplazo del flywheel.')
          ]
        }
      ]
    },
    {
      heading: 'Las 4S de Google y el Loop: el comprador se mueve, la marca responde',
      level: 2,
      blocks: [
        {
          kind: 'paragraph',
          text: [
            t('En febrero de 2025, Google publicó junto con BCG una forma nueva de describir cómo compra la gente: las 4S, por '),
            b('streaming, scrolling, searching y shopping'),
            t('. Ver video, recorrer el feed, buscar y comprar. Su conclusión es la misma que la de HubSpot, vista desde el comprador: «los recorridos de los consumidores están más fragmentados que nunca» ('),
            a('Google', SRC.google4s),
            t(').')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('Las cifras de Google en Estados Unidos lo muestran: una persona interactúa con '),
            b('más de 130 puntos de contacto móviles al día'),
            t(', y '),
            b('el 64 % de quienes compraron en la última temporada de fiestas dice que mezcló las 4S'),
            t(' en esa compra ('),
            a('Google, 2025', SRC.googleHoliday),
            t('). Y del otro lado del mostrador se nota: '),
            b('el 71 % de los marketers dice que está tratando de seguirle el paso a cómo se mueven los compradores'),
            t(' entre plataformas, formatos y caminos de descubrimiento ('),
            a('HubSpot, State of Marketing 2026', SRC.stateOfMarketing),
            t(').')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('Google describe el comportamiento. HubSpot propone el método. Ninguno de los dos los conecta, y ahí está la clave para entender el Loop: '),
            b('las 4S son lo que hace la persona y el Loop es lo que hace la marca para responder.')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('Te lo explico con manzanitas 🍏🍏🍏. Piensa en las 4S como las estaciones de un metro donde la persona se sube y se baja sin orden ni aviso: hoy está en streaming, mañana en el scroll, después busca y al final compra. El Loop es el tren que nunca se detiene: pasa por todas esas estaciones, recoge aprendizajes en cada parada y en cada vuelta gira más rápido y con más puntería.')
          ]
        },
        P('En Efeonce lo leemos así: cada etapa del Loop pesa más en ciertas estaciones.'),
        {
          kind: 'table',
          style: 'efeonce',
          headers: ['Etapa del Loop', 'Dónde pesa más', 'Por qué'],
          rows: [
            ['Definición', 'Streaming y scrolling', 'En un video o en el feed tienes segundos para que alguien reconozca tu voz y no la de un clon'],
            ['Adaptación', 'Scrolling y searching', 'Convierte señales de interés en contenido relevante para esa persona, en ese momento'],
            ['Amplificación', 'Searching y shopping', 'Te pone donde se decide: buscadores, respuestas de la IA y puntos de compra'],
            ['Optimización', 'Las cuatro', 'Aprende de cada estación y alimenta la vuelta siguiente']
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('Un ejemplo de por qué la búsqueda ya no es sólo Google: Prabhakar Raghavan, entonces vicepresidente sénior de Google, contó en 2022 que '),
            b('casi el 40 % de los jóvenes de 18 a 24 años en Estados Unidos busca dónde almorzar en TikTok o Instagram'),
            t(', según un estudio interno de la empresa ('),
            a('Fortune', SRC.fortune),
            t('). Las estaciones se mezclan: buscar también ocurre en el feed.')
          ]
        },
        {
          kind: 'pullquote',
          text: [t('Loop Marketing no reemplaza a las 4S: '), b('las traduce en una estrategia que se puede ejecutar.')]
        }
      ]
    },
    {
      heading: 'Las 4 etapas del Loop Marketing',
      level: 2,
      blocks: [
        P(
          'Cada etapa tiene una tarea y le entrega algo a la siguiente. Te las cuento con los pasos que propone HubSpot y lo que hemos aprendido aplicándolas.'
        ),
        {
          kind: 'image',
          mediaId: 248439,
          url: 'https://efeoncepro.com/wp-content/uploads/2025/09/Loop-MKT.svg',
          alt: 'Diagrama del Loop Marketing: un símbolo de infinito naranja con las cuatro etapas en orden, Express (01), Tailor (02), Amplify (03) y Evolve (04), conectadas en un ciclo continuo.',
          width: 772,
          height: 423,
          align: 'center',
          caption: 'Las cuatro etapas con sus nombres en inglés: Express es la Definición, Tailor la Adaptación, Amplify la Amplificación y Evolve la Optimización.'
        },
        { kind: 'heading', text: 'Definición (Express): la voz antes que la IA', level: 3 },
        {
          kind: 'paragraph',
          text: [
            t('HubSpot la resume en tres preguntas: qué decir, cómo decirlo y por qué importa ahora. Es la primera etapa por una razón simple: '),
            b('sin una voz clara, personalizar o amplificar sólo multiplica el ruido'),
            t('. En un mundo lleno de contenido generado por IA, lo único que realmente te diferencia es tu punto de vista. Y no es una sensación tuya: '),
            b('casi el 56 % de los marketers dice que internet ya está inundado de contenido generado por IA'),
            t(' ('),
            a('HubSpot, State of Marketing 2026', SRC.stateOfMarketing),
            t(').')
          ]
        },
        {
          kind: 'list',
          style: 'steps',
          ordered: true,
          items: [
            [b('Define a quién le hablas.'), t(' No basta con edad y cargo: qué le preocupa, qué quiere lograr y con qué palabras lo cuenta. La IA ayuda a leer llamadas, reseñas y comentarios para armar ese perfil.')],
            [b('Escribe tu guía de estilo.'), t(' Las palabras que sí y las que no, el tono por canal y los principios de tu relato. Esa guía también es la que va a usar la IA que trabaje contigo.')],
            [b('Convierte la voz en ideas.'), t(' Conceptos que puedan vivir en un reel, un pódcast o un whitepaper sin perder identidad.')]
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('En 2026, HubSpot le puso nombre a esa base: '),
            b('Taste Profile'),
            t(', «un retrato de tu cliente y de tu marca que le da a la IA el contexto para sonar como tú, no como todos» ('),
            a('HubSpot', SRC.loopEn),
            t('). Profundizamos en esta etapa en '),
            a('Express en Loop Marketing: voz, POV, buyer persona y Jobs to be done', IN.express),
            t('.')
          ]
        },
        { kind: 'heading', text: 'Adaptación (Tailor): del mensaje para todos al mensaje para ti', level: 3 },
        {
          kind: 'paragraph',
          text: [
            t('Si la Definición es la voz, la Adaptación es el oído: escucha y ajusta. HubSpot lo pide así: que tu mensaje '),
            b('parezca realmente personal, no sólo personalizado'),
            t('.')
          ]
        },
        {
          kind: 'list',
          style: 'steps',
          ordered: true,
          items: [
            [b('Enriquece tus datos propios.'), t(' Formularios, comportamiento en tu sitio y la historia en tu CRM son la materia prima.')],
            [b('Arma segmentos que se mueven.'), t(' Si alguien visita varias veces la página de precios, pasa solo a un segmento de alta intención; si lee artículos educativos, sigue en nurturing.')],
            [b('Crea contenido de verdad personal.'), t(' Dos personas pueden recibir el mismo ebook con introducciones distintas: una pensada en el retorno y otra en la innovación.')],
            [b('Revisa con criterio humano.'), t(' HubSpot lo dice explícito: «implementa comprobaciones de calidad humanas». La personalización tiene que sentirse auténtica.')]
          ]
        },
        { kind: 'heading', text: 'Amplificación (Amplify): que te encuentren donde se decide', level: 3 },
        P('¿De qué sirve una voz clara y un mensaje personal si nadie los ve? La Amplificación lleva tu contenido a cada canal donde está tu comprador, y eso hoy incluye las respuestas de la IA.'),
        {
          kind: 'list',
          style: 'steps',
          ordered: true,
          items: [
            [b('Reutiliza cada pieza.'), t(' Un webinar se convierte en clips para redes, un artículo y un carrusel. Una idea, muchos formatos.')],
            [
              b('Optimiza para buscadores y para la IA.'),
              t(' En Estados Unidos y la Unión Europea, '),
              b('casi el 60 % de las búsquedas en Google ya termina sin un clic'),
              t(' ('),
              a('SparkToro, 2024', SRC.zeroClick),
              t('): si la respuesta se arma antes del clic, tienes que estar dentro de la respuesta. Te lo explicamos en '),
              a('SEO y AEO: cómo aparecer en Google y en las respuestas de la IA', IN.seoAeo),
              t('.')
            ],
            [b('Dale a cada canal su rol.'), t(' El mismo mensaje vive en anuncios, newsletter, video y creadores, pero ajustado a cada medio.')]
          ]
        },
        { kind: 'growthCta', cta: 'blog-aeo-assessment', location: 'blog_article', emphasis: '¿aparece tu marca?', tone: 'light', mark: 'aeo-assessment' },
        { kind: 'heading', text: 'Optimización (Evolve): el motor del ciclo', level: 3 },
        {
          kind: 'paragraph',
          text: [
            t('El loop no termina cuando una campaña sale al aire: ahí empieza lo más valioso. Yamini Rangan, CEO de HubSpot, lo resumió en INBOUND 2025: '),
            b('«con la IA no ganas lanzando, ganas aprendiendo»'),
            t(' ('),
            a('TechRadar', SRC.rangan),
            t('). HubSpot propone cuatro hábitos: predecir antes de publicar, monitorear en tiempo real, experimentar rápido y nunca dejar de optimizar.')
          ]
        },
        P('Y cada aprendizaje vuelve a las etapas anteriores:'),
        {
          kind: 'list',
          items: [
            [b('A la Definición:'), t(' afina el relato con lo que de verdad resonó.')],
            [b('A la Adaptación:'), t(' enriquece los segmentos con señales recientes.')],
            [b('A la Amplificación:'), t(' mejora la mezcla de canales según dónde se genera valor.')]
          ]
        },
        {
          kind: 'paragraph',
          text: [t('¿Y cómo sabes si el loop está funcionando? HubSpot propone '), b('un número por etapa'), t(', que llama las 4 Rs ('), a('HubSpot', SRC.loopEn), t('):')]
        },
        {
          kind: 'list',
          style: 'box',
          items: [
            [b('Remarkability (Definición):'), t(' si tu diferencia de marca se sostiene cuando más equipos crean contenido.')],
            [b('Resonance (Adaptación):'), t(' si el contenido conecta con tu comprador. HubSpot lo mide contra un «Buyer Sim», un clon con IA del perfil de tu cliente.')],
            [b('Reach (Amplificación):'), t(' tu cuota de voz en las respuestas de la IA, además de impresiones y conversión por canal.')],
            [b('Regeneration (Optimización):'), t(' la velocidad del loop y cuánto mejoran tus aprendizajes y tu pipeline.')]
          ]
        },
        P('En su página en español, HubSpot todavía mide con otro tablero: visibilidad en la IA, cuota de participación, citas y velocidad del loop. Las dos versiones apuntan a lo mismo: medir el ciclo, no la campaña.'),
        {
          kind: 'paragraph',
          text: [
            t('Por eso la Optimización no es el final del loop: '),
            b('es el motor que lo mantiene girando'),
            t('. HubSpot repasa el ciclo completo en este video:')
          ]
        },
        { kind: 'embed', provider: 'youtube', url: 'https://www.youtube.com/watch?v=Pv-lPAukoMI&t=113s', caption: 'Fuente: HubSpot, «Loop Marketing, Explained»' },
        { kind: 'heading', text: '¿Por qué etapa se entra?', level: 3 },
        {
          kind: 'paragraph',
          text: [
            t('Por la que más sentido tenga en tu negocio: puedes empezar personalizando, distribuyendo o midiendo, y el ciclo se activa igual. Con una condición: '),
            b('si tu voz todavía no está definida, empieza por la Definición'),
            t('. Personalizar o amplificar un mensaje que no es tuyo sólo acelera el ruido.')
          ]
        }
      ]
    },
    {
      heading: 'B2B y B2C: el mismo Loop, distintas estaciones',
      level: 2,
      blocks: [
        {
          kind: 'paragraph',
          text: [t('El framework es el mismo; lo que cambia es '), b('en qué estaciones de las 4S pasa más tiempo tu comprador'), t('.')]
        },
        { kind: 'heading', text: 'En B2B: búsqueda y video, decisiones largas', level: 3 },
        P(
          'El comprador B2B investiga en Google, lee comparativas y descarga guías (searching), y ve webinars y demos (streaming). La Adaptación se vuelve account-based marketing: propuestas para una industria o incluso para una cuenta.'
        ),
        {
          kind: 'list',
          items: [
            [b('Definición:'), t(' un punto de vista claro para el CFO, el CMO y el CTO de una empresa que evalúa un CRM.')],
            [b('Adaptación:'), t(' secuencias de correo y ofertas por rol y por industria.')],
            [b('Amplificación:'), t(' contenido técnico en LinkedIn y en comunidades especializadas.')],
            [b('Optimización:'), t(' ajustar la propuesta con datos del pipeline y lo que reporta ventas.')]
          ]
        },
        { kind: 'heading', text: 'En B2C: feed y compra, decisiones rápidas', level: 3 },
        P(
          'El consumidor descubre en el feed sin estar buscando (scrolling) y compra en un clic, en un marketplace o en un live shopping (shopping). Aquí la Amplificación y la Optimización son críticas: destacar en un feed saturado y que la compra no tenga fricción.'
        ),
        {
          kind: 'list',
          items: [
            [b('Definición:'), t(' un tono cercano y aspiracional para una marca de moda.')],
            [b('Adaptación:'), t(' recomendaciones de outfits según lo que compró cada persona.')],
            [b('Amplificación:'), t(' reels comprables y colaboraciones con creadores.')],
            [b('Optimización:'), t(' medir qué combinaciones venden más y ajustar el stock.')]
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('El B2B se parece a un matrimonio: largo, con muchas conversaciones y varias personas que opinan. El B2C es un flechazo: si no convences en segundos, la persona pasa a la marca siguiente. El Loop sirve en los dos, pero '),
            b('el ritmo de cada vuelta es distinto'),
            t('.')
          ]
        }
      ]
    },
    {
      heading: '¿Qué cambia en CAC, LTV y payback?',
      level: 2,
      blocks: [
        P(
          'El costo de adquirir un cliente baja porque cada vuelta del loop elimina fricción y mejora la conversión. El valor de cada cliente sube porque la relación se nutre con más relevancia. Y el retorno llega antes porque las dos cosas pasan a la vez.'
        ),
        {
          kind: 'paragraph',
          text: [
            t('HubSpot dice que, aplicando el Loop, '),
            b('los costos de adquisición empiezan a bajar entre 30 y 60 días'),
            t(' después de implementarlo ('),
            a('HubSpot', SRC.hubspotEs),
            t('). Y la retención pesa más de lo que parece: un estudio clásico de Bain encontró que '),
            b('retener apenas un 5 % más de clientes puede subir las utilidades entre un 25 % y un 95 %'),
            t(' ('),
            a('Bain & Company', SRC.bain),
            t(').')
          ]
        },
        {
          kind: 'paragraph',
          text: [t('Un ejemplo con números redondos, para ver cómo se mueve cada métrica. '), b('Es ilustrativo, no un resultado medido:')]
        },
        {
          kind: 'table',
          style: 'efeonce',
          headers: ['Métrica', 'Antes', 'Con el loop', 'Qué cambió'],
          rows: [
            ['Tasa de conversión', '2 %', '3 %', 'Definición y Adaptación más claras'],
            ['Costo por adquisición (CPC de $0,80)', '$40', '$26,67', '−33 %: 33 clics por venta en vez de 50'],
            ['Payback (margen de $14 al mes)', '2,9 meses', '1,9 meses', 'Recuperas la inversión un mes antes'],
            ['Churn mensual', '5 %', '4 %', 'La Optimización retiene mejor'],
            ['Valor del cliente (LTV)', '$280', '$350', '+25 %']
          ]
        }
      ]
    },
    {
      heading: 'El stack importa menos que el ciclo',
      level: 2,
      blocks: [
        {
          kind: 'paragraph',
          text: [
            t('Una confusión común es pensar que el Loop depende de una herramienta. HubSpot lo arma con su CRM y sus agentes de IA (Breeze), pero el método es agnóstico: funciona con HubSpot, con Salesforce, con WordPress y con GA4 o BigQuery como cerebro analítico. Lo que importa es que las piezas conversen entre sí para aprender en cada vuelta. En Efeonce trabajamos con '),
            M('HubSpot', IN.partner, 'revenue-hubspot'),
            t(' y con Salesforce, y en los dos casos '),
            b('el cuello de botella rara vez es la herramienta'),
            t('.')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('Y esas piezas no sólo tienen que pasarse datos. Duncan Lennox, director de producto y tecnología de HubSpot, lo explicó así: '),
            b('«si los datos son lo que pasó, el contexto es el porqué»'),
            t(' ('),
            a('HubSpot', SRC.spring),
            t('). Sin ese porqué, la IA trabaja a ciegas.')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            b('El reto de verdad es cultural.'),
            t(' El marketing tradicional se organizaba en campañas trimestrales: plan, producción, ejecución y reporte. Seguro conoces la escena: es viernes por la tarde, la campaña terminó hace dos semanas y recién llega el reporte que dice qué funcionó. Para entonces ya no queda nada que ajustar. Con el loop cambia la mentalidad:')
          ]
        },
        {
          kind: 'list',
          items: [
            [t('Pasas de planificar meses a probar en semanas o días.')],
            [t('El reporte deja de mirar hacia atrás: es el insumo de la vuelta siguiente.')],
            [t('El éxito no es «cerramos la campaña», sino cuánto aprendimos y cómo lo reinvertimos.')]
          ]
        }
      ]
    },
    {
      heading: '¿Dónde decide una persona?',
      level: 2,
      blocks: [
        {
          kind: 'paragraph',
          text: [
            t('Si todo gira más rápido gracias a la IA, la pregunta obvia es cómo evitar que la velocidad se lleve la confianza. La respuesta tiene nombre: human-in-the-loop. Las decisiones que importan no quedan sólo en manos de un algoritmo: '),
            b('una persona revisa, aprueba y guía lo que la IA produce'),
            t('.')
          ]
        },
        {
          kind: 'chart',
          chart: {
            kind: 'per-hundred',
            categories: ['marketers publica lo que genera la IA sin editarlo'],
            series: [{ name: 'Marketers', values: [7] }]
          },
          title: 'Casi nadie publica lo que escribe la IA sin tocarlo',
          caption: 'El 56 % reescribe a fondo lo que genera la IA y el 38 % hace ajustes menores.',
          sourceLabel: 'HubSpot, 2025 AI Trends for Marketers',
          sourceUrl: SRC.aiTrends,
          tone: 'light'
        },
        {
          kind: 'paragraph',
          text: [t('En la práctica, '), b('la confianza se diseña desde el principio, no se repara al final'), t(':')]
        },
        {
          kind: 'list',
          style: 'box',
          items: [
            [b('Guardrails claros:'), t(' palabras prohibidas, temas sensibles y prompts aprobados.')],
            [b('Una persona visible:'), t(' una firma real, una historia auténtica y una voz coherente, incluso en lo automatizado.')],
            [b('Métricas de confianza junto a las de conversión:'), t(' cuántas campañas pasaron revisión humana, qué dice la escucha social y cómo perciben la transparencia en tu NPS.')]
          ]
        },
        P('Piensa en un auto de Fórmula 1: la IA es el motor que lo hace correr, pero sin piloto, tarde o temprano se sale de la pista.'),
        { kind: 'pullquote', text: [t('Si la IA es el motor, '), b('tu voz es el volante.')] }
      ]
    },
    {
      heading: 'Por dónde empezar',
      level: 2,
      blocks: [
        {
          kind: 'list',
          style: 'steps',
          ordered: true,
          items: [
            [b('Elige la etapa con más fricción.'), t(' La que hoy te frena más: la voz, la personalización, la distribución o la medición.')],
            [b('Si tu voz no está escrita, empieza por ahí.'), t(' Es lo que va a usar todo lo demás, incluida la IA.')],
            [b('Conecta tus datos.'), t(' El loop aprende de lo que tu CRM y tu analítica pueden ver.')],
            [b('Mide por ciclo, no por campaña.'), t(' Qué aprendiste en esta vuelta y qué cambias en la siguiente.')]
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('Si trabajas con HubSpot, te contamos cómo se arma cada etapa con sus herramientas en '),
            a('Cómo ejecutar Loop Marketing con HubSpot', IN.ejecutar),
            t('. Y si quieres aterrizarlo en tu empresa, en Efeonce lo hacemos sobre '),
            M('HubSpot', IN.partner, 'revenue-hubspot'),
            t('.')
          ]
        },
        {
          kind: 'paragraph',
          text: [
            t('Loop Marketing no es magia ni el juguete de la temporada: '),
            b('es un sistema operativo de marketing ágil, humano y rentable'),
            t('. Esto recién empieza, y el loop no se detiene.')
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
          schema: { enabled: true, name: 'Preguntas frecuentes sobre Loop Marketing', canonicalUrl: URL, inLanguage: 'es-CL', source: 'plugin' },
          items: [
            {
              question: '¿Loop Marketing reemplaza al inbound marketing?',
              answer: [P('No. HubSpot lo presenta como su continuación: los componentes del inbound siguen siendo esenciales, pero ya no son suficientes. El Loop les suma velocidad, presencia en todos los canales y aprendizaje continuo con IA.')]
            },
            {
              question: '¿Las cuatro etapas tienen un orden obligatorio?',
              answer: [P('No. Puedes entrar por la etapa que más sentido tenga en tu negocio y el ciclo se activa igual. La excepción es la voz: si todavía no está definida, conviene empezar por la Definición, porque es la base de todo lo demás.')]
            },
            {
              question: '¿Es lo mismo que closed-loop marketing?',
              answer: [P('No. El closed-loop marketing es una práctica de medición: conectar lo que pasa en marketing con lo que se vende. Loop Marketing es una estrategia completa de cuatro etapas, que usa esa medición en su etapa de Optimización.')]
            },
            {
              question: '¿Cuánto tarda en dar resultados?',
              answer: [P('Según HubSpot, los costos de adquisición empiezan a bajar entre 30 y 60 días después de implementarlo. Depende de cuántas vueltas del ciclo logres dar en ese tiempo y de si tu voz y tus datos ya están ordenados.')]
            },
            {
              question: '¿Son reales las cifras que circulan sobre Loop Marketing?',
              answer: [
                {
                  kind: 'paragraph',
                  text: [
                    t('No todas. El «4,4 veces» no es de HubSpot: es de un estudio de Semrush que estima que una visita desde un buscador de IA vale 4,4 veces más que una orgánica, por su tasa de conversión ('),
                    a('Semrush, 2025', SRC.semrush),
                    t('). No encontramos fuente para el «13 veces más efectivo que Google Ads» ni para los experimentos «en 48 horas». Antes de usar una cifra, busca el estudio original.')
                  ]
                }
              ]
            },
            {
              question: '¿Necesito HubSpot para aplicar Loop Marketing?',
              answer: [P('No. HubSpot lo implementa con su CRM y sus agentes de IA, pero el método funciona con otros CRM, CMS y herramientas de analítica. Lo importante es que tus datos, tu contenido y tu medición estén conectados.')]
            }
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
            [t('HubSpot. '), a('Loop Marketing (página en español)', SRC.hubspotEs), t(' y '), a('anuncio de Loop Marketing', SRC.news), t(', 3 de septiembre de 2025.')],
            [t('HubSpot. '), a('Loop Marketing (página en inglés, versión 2026)', SRC.loopEn), t(', '), a('Loop: Outlearn. Outmarket. Outgrow.', SRC.book), t(' y '), a('la sesión de Kipp Bodnar y Kieran Flanagan en UNBOUND 2026', SRC.unbound), t(', 17 de septiembre de 2026.')],
            [t('HubSpot. '), a('Why Loop Marketing matters in 2026 (State of Marketing)', SRC.stateOfMarketing), t(', actualizado el 24 de julio de 2026.')],
            [t('HubSpot. '), a('Spring 2026 Spotlight', SRC.spring), t(', abril de 2026.')],
            [t('Google y BCG. '), a('Nuevo proceso de decisión de compra (las 4S)', SRC.google4s), t(', 25 de febrero de 2025.')],
            [t('Google. '), a('Holiday shopping: the modern consumer\'s new value equation', SRC.googleHoliday), t(', agosto de 2025 (datos de EE. UU.).')],
            [t('Fortune. '), a('Google Search is in danger of losing Gen Z', SRC.fortune), t(', 13 de julio de 2022.')],
            [t('Search Engine Land sobre SparkToro. '), a('2024 zero-click search study', SRC.zeroClick), t('.')],
            [t('TechRadar. '), a('Yamini Rangan en INBOUND 2025', SRC.rangan), t(', 4 de septiembre de 2025.')],
            [t('TechTarget. '), a('Brian Halligan en INBOUND 2018', SRC.halligan), t('.')],
            [t('Bain & Company. '), a('E-Loyalty: Your Secret Weapon on the Web', SRC.bain), t(', 2000.')],
            [t('HubSpot. '), a('2025 AI Trends for Marketers', SRC.aiTrends), t('.')],
            [t('Semrush. '), a('AI search SEO traffic study', SRC.semrush), t(', 2025.')]
          ]
        },
        P(
          'Actualizado el 26 de octubre de 2026: unimos «Cómo aplicar Loop Marketing» en esta guía, revisamos cada cifra y cita en su fuente original, usamos los nombres oficiales de las etapas en español y sumamos lo que HubSpot presentó en UNBOUND 2026.'
        )
      ]
    }
  ]
}

// The spec has no heading block: an H3 is its own section with level 3. Split each section at its `heading` markers.
spec.sections = spec.sections.flatMap(section => {
  const out = [{ heading: section.heading, level: section.level, blocks: [] }]

  for (const block of section.blocks) {
    if (block.kind === 'heading') out.push({ heading: block.text, level: block.level, blocks: [] })
    else out[out.length - 1].blocks.push(block)
  }

  return out
})

const out = resolve(__dirname, '../../docs/public-site/LOOP_MARKETING_REFRESH_GUTENBERG_SPEC_V1.json')

writeFileSync(out, `${JSON.stringify(spec, null, 2)}\n`)
console.log(`spec → ${out}`)
