// Construye la V6 del spec «SEO y AEO» (más valor propio, voz de Julio, thought leadership) desde la V5 publicada.
const fs = require('fs')
const P = 'docs/public-site/SEO_AEO_REFRESH_GUTENBERG_SPEC_V1.json'
const old = JSON.parse(fs.readFileSync('tmp/aeo-spec-v5-publicada.json', 'utf8'))
const sec = h => { const s = old.sections.find(x => x.heading === h); if (!s) throw new Error('falta ' + h); return s }
const L = (text, href) => (href ? { text, href } : { text })
const B = text => ({ text, strong: true })
const p = text => ({ kind: 'paragraph', text })

const s = { ...old }
s.intro = [
  'Le preguntamos a Google qué CRM le conviene a una empresa B2B mediana en Chile. En su modo con IA, la respuesta nombró cuatro marcas: HubSpot, Pipedrive, Zoho y Salesforce. Lo interesante vino después: ninguna de las tres páginas que citó como fuente era de esas marcas. Eran comparativas que escribió alguien más.',
  'Ahí está, en una escena, lo que cambió en la búsqueda. Tu comprador ya no siempre ve diez enlaces y elige: le llega una respuesta armada, y esa respuesta se construye con lo que otros publicaron sobre tu categoría. AEO (Answer Engine Optimization) es el trabajo para que tu marca esté en esa respuesta, y para que esté bien contada.',
  'Mi lectura es que el AEO no reemplaza al SEO: lo vuelve más exigente. En esta guía te muestro lo que vimos al preguntarle a la IA, cómo lo ordenamos en Efeonce y por dónde conviene empezar según dónde estás hoy.'
]

const queSeAeo = sec('¿Qué es AEO?')

const ejemplo = {
  heading: '¿Qué pasa cuando le preguntas a la IA por tu categoría?',
  level: 2,
  blocks: [
    p('Para no hablar en abstracto, el 25 de octubre de 2026 le hicimos a Google AI Mode, desde Chile, dos preguntas que podría hacer cualquier comprador B2B. Elegimos categorías que no son la nuestra, para mirar sin sesgo, y repetimos la primera unos minutos después.'),
    { kind: 'table', style: 'efeonce', headers: ['Pregunta', 'Marcas que recomendó', 'Páginas que citó como fuente'], rows: [
      ['¿Qué CRM me recomiendas para una empresa B2B mediana en Chile?', 'HubSpot, Pipedrive, Zoho y Salesforce', 'Tres comparativas de terceros: Simla, Guía de Software y Parrotfy'],
      ['La misma pregunta, minutos después', 'Las mismas cuatro, en el mismo orden', 'Una sola comparativa (Simla) y, junto a HubSpot, un enlace a su propio artículo que compara CRM B2B'],
      ['¿Cuál es el mejor software de facturación electrónica para una pyme en Chile?', 'Nubox, Clay, Open Factura y RelBase o Laudus', 'Dos artículos del blog de RelBase y una comparativa de Xepelin']
    ] },
    p('Tres cosas nos llamaron la atención:'),
    { kind: 'list', ordered: true, style: 'steps', items: [
      [B('La IA recomienda marcas, pero cita a quien escribió la comparación.'), L(' En la primera respuesta sobre CRM, ninguna de las fuentes era de las marcas recomendadas.')],
      [B('Quien escribe la comparativa de su categoría entra a la respuesta.'), L(' RelBase aparece recomendada y citada con su propio blog, y en la segunda corrida HubSpot quedó enlazada a su artículo de comparación.')],
      [B('Las fuentes cambian de una vez a otra; la lista de marcas, menos.'), L(' La misma pregunta pasó de tres fuentes a una, con las mismas cuatro marcas en el mismo orden.')]
    ] },
    { kind: 'pullquote', text: 'Si no escribes tú la comparación de tu categoría, la va a escribir otro, y la IA le va a creer a él.' },
    p('Ojo con lo que esto demuestra y lo que no. Son tres respuestas de un solo motor, en un día: sirven para ver cómo se arma una respuesta, no para medir la cuota de nadie. Para eso hay que repetir las preguntas en varios motores, cada mes.')
  ]
}

const elige = sec('¿Cómo eligen sus fuentes los motores de IA?')

const dif = JSON.parse(JSON.stringify(sec('¿En qué se diferencia el AEO del SEO?')))
dif.blocks.push(p('Una forma de verlo: el SEO te pone en el fichero; el AEO decide si eres la ficha que sacan cuando alguien pregunta. Sin lo primero no hay lo segundo, pero estar en el fichero ya no basta.'))

const niveles = {
  heading: '¿En qué nivel está tu marca frente a la IA?',
  level: 2,
  blocks: [
    p('En Efeonce ordenamos este trabajo en cinco niveles. No es una escalera perfecta, pero ayuda a saber dónde estás y qué revisar primero:'),
    { kind: 'table', style: 'efeonce', headers: ['Nivel', 'La pregunta', 'Qué revisar'], rows: [
      ['01 · Que te encuentre', '¿Existes para la IA?', 'Que Google y Bing indexen tus páginas, que tu robots.txt no bloquee a los robots de búsqueda y que tengas un sitemap al día'],
      ['02 · Que te entienda', '¿Te puede leer sin adivinar?', 'Respuestas al inicio de cada sección, subtítulos como preguntas, datos estructurados que correspondan a lo visible y una marca descrita igual en todas partes'],
      ['03 · Que te represente bien', '¿Lo que dice de ti es verdad?', 'Qué dice la IA de tus servicios, tus precios y tus competidores; cuando se equivoca, corregir la fuente de la que sacó el dato'],
      ['04 · Que pueda actuar', '¿Te puede usar un agente, no sólo citar?', 'Fichas, formularios y acciones que un agente pueda leer y completar'],
      ['05 · Que te prefiera', '¿Eres la recomendación por defecto?', 'Presencia en comparativas, medios y comunidades de tu categoría, sostenida en el tiempo']
    ] },
    p([L('Dos advertencias. El nivel 05 no se entrega: se gana, y depende de cuánto y cómo hablan otros de ti. Y el 04 corre por un carril propio: una marca puede ser la recomendada y aun así no dejar que un agente cotice o agende. Ese paso lo contamos en '), L('cómo preparar tu sitio para los agentes', 'https://efeoncepro.com/aeo/web-agentica-agentes-ia/'), L('.')])
  ]
}

const empezar = {
  heading: '¿Por dónde empezar según dónde estás hoy?',
  level: 2,
  blocks: [
    p('La pregunta que más nos hacen no es qué es AEO, sino qué hacer primero. Depende de dónde estés:'),
    { kind: 'table', style: 'efeonce', headers: ['Si hoy…', 'Empieza por…', 'Por qué'], rows: [
      ['Tu sitio casi no aparece en Google', 'Lo básico del SEO: indexación, una página por servicio y contenido que responda lo que pregunta tu comprador', 'Google arma sus respuestas con IA desde su propio índice: sin eso no hay AEO'],
      ['Rankeas, pero la IA no te nombra', 'Las comparativas y preguntas de tu categoría: escríbelas tú, con respuestas directas, y busca que te incluyan en las de otros', 'Es lo que vimos: la IA cita a quien escribió la comparación'],
      ['Ya te nombra un motor', 'Medir en los demás y revisar qué dice de ti', 'Aparecer en uno no asegura aparecer en otro, y lo que dice puede estar mal']
    ] },
    p([L('Si estás en la primera fila, el trabajo es de '), L('posicionamiento SEO', 'https://efeoncepro.com/servicios/posicionamiento-seo/'), L(' antes que de IA. Si estás en la segunda, es un trabajo editorial: alguien tiene que escribir esas comparativas con constancia.')])
  ]
}

const cambiar = JSON.parse(JSON.stringify(sec('¿Qué cambiar en tu sitio para que la IA te cite?')))
cambiar.blocks.splice(2, 0,
  p('Responder primero se entiende mejor con un ejemplo. Así se ve en un párrafo real:'),
  { kind: 'list', style: 'box', items: [
    [B('Antes:'), L(' «En un mundo cada vez más digital, las empresas necesitan herramientas que les permitan gestionar la relación con sus clientes de forma eficiente. Por eso, elegir un CRM es una decisión estratégica que requiere analizar múltiples factores.»')],
    [B('Después:'), L(' «Para una empresa B2B mediana, el CRM correcto es el que tu equipo comercial usa todos los días. Mira tres cosas: cuánto dura tu ciclo de venta, con qué sistemas tiene que conectarse y quién lo va a administrar.»')]
  ] },
  p('El segundo se puede citar solo. El primero no dice nada hasta la tercera frase, y un motor que busca una respuesta no llega hasta ahí.')
)

const caso = {
  heading: '¿Qué aprendimos auditando un blog de 1.700 artículos?',
  level: 2,
  blocks: [
    p('Hace poco auditamos el blog de una marca grande en Chile que había perdido cerca de la mitad de su tráfico orgánico después de una migración. Cuando un caso así llega, la tentación es pensar en la IA. La causa principal era mucho más básica.'),
    p('En la mudanza se quedó atrás el plugin de SEO, y ninguno de sus 1.700 artículos tenía descripción, datos estructurados ni autor. Además, sólo un poco más de un tercio de los artículos se podía alcanzar siguiendo enlaces desde el propio sitio.'),
    p('La lección vale para cualquiera: antes de preguntarte cómo te ve ChatGPT, revisa que Google te pueda leer. En lo que hemos visto, el AEO se cae por los niveles 01 y 02 mucho antes que por algo sofisticado.')
  ]
}

const robotsTable = sec('Claude').blocks.find(b => b.kind === 'table')
const robots = {
  heading: '¿Qué robots dejan entrar a la IA a tu sitio?',
  level: 2,
  blocks: [
    sec('¿Qué mira cada motor?').blocks[0],
    robotsTable,
    p('Lo que conviene saber de cada motor, en una línea:'),
    { kind: 'list', style: 'box', items: [
      [B('Google (AI Overviews y AI Mode):'), L(' usa el mismo índice del buscador y no pide un marcado especial; en su '), L('guía de optimización para IA', 'https://developers.google.com/search/docs/fundamentals/ai-optimization-guide'), L(' pide no perder tiempo en trucos. Si no quieres aparecer, se controla con nosnippet, max-snippet o noindex.')],
      [B('Gemini:'), L(' Google-Extended decide si tu contenido entrena Gemini; '), L('no afecta tu inclusión en Google Search', 'https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers'), L('.')],
      [B('ChatGPT:'), L(' OAI-SearchBot te pone en sus respuestas de búsqueda y GPTBot entrena; son independientes ('), L('OpenAI', 'https://developers.openai.com/api/docs/bots'), L('). Los cambios tardan cerca de 24 horas.')],
      [B('Perplexity:'), L(' PerplexityBot te hace aparecer y, según la empresa, no se usa para entrenar ('), L('Perplexity', 'https://docs.perplexity.ai/guides/bots'), L(').')],
      [B('Copilot:'), L(' responde con Bing ('), L('Microsoft', 'https://learn.microsoft.com/en-us/microsoft-365/copilot/manage-public-web-access'), L('). Desde febrero de 2026, Bing Webmaster Tools muestra cuándo te cita ('), L('Bing', 'https://blogs.bing.com/webmaster/February-2026/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview'), L(').')],
      [B('Claude:'), L(' ClaudeBot entrena, Claude-SearchBot mejora sus búsquedas y Claude-User entra cuando alguien le pide algo; los tres siguen el robots.txt ('), L('Anthropic', 'https://support.claude.com/en/articles/8896518'), L(').')]
    ] }
  ]
}

const pequeno = sec('¿Cómo empezar con AEO si tu equipo es pequeño?')
const mide = sec('¿Cómo se mide el AEO?')
const faq = sec('Preguntas frecuentes sobre SEO y AEO')

const esencial = {
  heading: 'Lo esencial',
  level: 2,
  blocks: [
    { kind: 'list', items: [
      'El AEO busca que la respuesta te nombre; el SEO, que tu página rankee. Comparten la base, y sin SEO no hay AEO.',
      'La IA recomienda marcas, pero cita a quien escribió la comparación de la categoría.',
      'Cada motor elige sus fuentes a su manera, y las fuentes cambian de una vez a otra.',
      'Ordena el trabajo por niveles: que te encuentre, que te entienda, que te represente bien, que pueda actuar y que te prefiera.',
      'Mide la presencia por motor y por pregunta, cada mes, además del tráfico.'
    ] },
    p('Si te quedas con una sola idea, que sea esta: la IA no va a buscarte a ti, va a buscar a quien mejor explique tu categoría. Que ese alguien seas tú es el trabajo.'),
    sec('En resumen').blocks.find(b => b.kind === 'paragraph')
  ]
}

const fuentes = JSON.parse(JSON.stringify(sec('Fuentes y nota de actualización')))
fuentes.blocks[0].items.unshift([L('Efeonce. Consultas a Google AI Mode desde Chile, 25 de octubre de 2026 (tres respuestas, vía DataForSEO). Muestra ilustrativa, no medición de cuota.')])
const nota = fuentes.blocks.find(b => b.kind === 'paragraph')
nota.text = 'Actualizado el 25 de octubre de 2026. Esta guía reemplaza la versión de 2025: se corrigieron las recomendaciones sobre robots de IA y datos estructurados, se sacaron cifras y citas sin fuente verificable y se sumaron consultas propias a Google AI Mode.'

s.sections = [queSeAeo, ejemplo, elige, dif, niveles, empezar, cambiar, caso, robots, pequeno, mide, faq, esencial, fuentes]
fs.writeFileSync(P, JSON.stringify(s, null, 1) + '\n')
console.log('secciones:', s.sections.map(x => x.heading).join(' | '))
