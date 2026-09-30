// Arma los intents de documento (brochure, completo, propuesta) del deck SEO/AEO
// a partir de los ejemplos aprobados del catálogo, cambiando sólo contenido (voz, cuerpo, datos).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const REPO = '/Users/jreye/Documents/greenhouse-eo'
const EX = join(REPO, 'src/lib/brand-surfaces/examples')
const OUT = new URL('.', import.meta.url).pathname

const ex = id => {
  const j = JSON.parse(readFileSync(join(EX, `deck-${id}-intent.json`), 'utf8'))
  const { contract, version, surface, format, theme, use, line, ...rest } = j
  return rest
}
const brochureDoc = JSON.parse(readFileSync(join(EX, 'deck-brochure-document.json'), 'utf8'))
const aeoCine = structuredClone(brochureDoc.pages.find(p => p.photo && /AE2b/.test(p.photo.plateRef)))

// ---------- páginas ----------
const P = {}

P.coverEngine = {
  ...ex('cover-brochure-line-engine'),
  voice: { eyebrow: 'Brochure · Search Visibility 360', question: '¿Te encuentran Google y la IA?', answer: ['Visible'] },
  body: '**SV360**: SEO y AEO en un solo sistema\nAEO Assessment · AI Visibility Report · Insights'
}

P.coverEngineFull = { ...P.coverEngine, voice: { ...P.coverEngine.voice, eyebrow: 'Search Visibility 360 · SEO y AEO' } }
P.market = { ...ex('decision-ai-market') }
const text = ex('content-text')
P.sv360 = {
  ...text,
  progress: 'auto',
  voice: { eyebrow: 'Search Visibility 360', question: '¿SEO o AEO?', answer: ['Ambos'] },
  body: 'SV360: que Google te encuentre y la IA te recomiende, en un solo sistema medido.',
  points: [
    { name: 'Diagnóstico', text: 'AEO Assessment: cómo te ve la IA' },
    { name: 'Informe', text: 'AI Visibility Report: qué hacer primero' },
    { name: 'Cada mes', text: 'Efeonce Insights: qué se movió y qué sigue' }
  ],
  selection: { target: 'answer', label: 'SEO · AEO', participantKind: 'department' }
}
const bullets = ex('content-bullets')
P.seoBase = {
  ...bullets,
  progress: 'auto',
  voice: { eyebrow: 'SEO', question: '¿Qué mueve tu SEO?', answer: ['La base'] },
  items: [
    { title: 'Base técnica', desc: 'Rastreo, indexación, Core Web Vitals y datos estructurados en orden.' },
    { title: 'Contenido por intención', desc: 'Clusters que responden lo que tu comprador busca y que la IA puede citar.' },
    { title: 'Autoridad', desc: 'PR y link building real: menciones que se ganan, no enlaces que se compran.' },
    { title: 'Entidad', desc: 'Que Google y la IA entiendan quién eres: organización, autores y schema.' }
  ],
  selected: 3,
  selection: { target: 'object', label: 'SEO', participantKind: 'department' }
}
const live = ex('content-day-live-results')
P.insights = {
  ...live,
  voice: { eyebrow: 'Tu reporte mensual', question: '¿Cómo avanza?', answer: ['Cada', 'mes'] },
  body: 'Cada mes, Efeonce Insights arma tu reporte de SEO y AEO **solo**, y lo conversamos en Teams.',
  report: { ...live.report, kicker: 'Efeonce Insights · ahora', title: 'Tu edición del mes está lista', action: 'Ver la edición' }
}
const ans = ex('decision-ai-answer')
P.answer = { ...ans, body: 'Cuando tu comprador pregunta por tu categoría, la IA ya tiene favoritas. El AEO trabaja para que la **próxima** respuesta te nombre.' }
P.traffic = { ...ex('decision-traffic-to-revenue') }
P.eeat = { ...ex('method-eeat') }
P.cycle = { ...ex('method-surround-cycle') }
P.difference = { ...ex('decision-difference') }
const diag = ex('decision-diagnosis-map')
P.diagnosis = { ...diag, voice: { ...diag.voice, eyebrow: 'Tu primer entregable' }, report: { ...diag.report, kicker: 'Efeonce AI Visibility Report' } }

const seoCine = ex('proposal-cinematic-seo')
const seoSteps = steps => steps.map(st => st.name === 'Reporte vivo' ? { ...st, kicker: 'Cada mes', name: 'Insights', ...(st.desc ? { desc: 'Tu edición mensual de SEO y AEO en Efeonce Insights: qué se movió y qué sigue.' } : {}) } : st)
P.seoCineBrochure = { ...seoCine, voice: { ...seoCine.voice, eyebrow: 'SEO' }, steps: seoSteps(seoCine.steps) }

const { line: _l, ...aeoRest } = aeoCine
P.aeoCineBrochure = {
  ...aeoRest,
  steps: aeoRest.steps.map(st => st.name === 'Foundation' ? { ...st, name: 'Fundación' } : st),
  role: 'proposal',
  voice: { eyebrow: 'Visibilidad en IA', question: '¿Te distingue la IA?', answer: ['Entre miles'] }
}

const stair = ex('method-staircase')
P.staircase = { ...stair, voice: { ...stair.voice, eyebrow: 'Metodología BeX' } }

const ring = ex('method-score-ring')
P.scoreRing = {
  ...ring,
  voice: { ...ring.voice, eyebrow: 'El diagnóstico' },
  total: { ...ring.total, source: 'Pesos del Efeonce AEO Assessment, versión V1' }
}

const formulas = ex('content-measure-formulas')
P.formulas = {
  ...formulas,
  voice: { eyebrow: 'Qué medimos', question: '¿Cómo sabes que funciona?', answer: ['Lo', 'medimos'] },
  body: 'Cada métrica con su fórmula, su fuente y un **dueño**, y cada mes en Efeonce Insights.',
  note: 'Sin cifras de promesa: la línea base se mide en el diagnóstico',
  metrics: [
    { glyph: 'ia', name: 'Visibilidad en IA', formula: 'Prompts donde te citan ÷ prompts medidos', source: 'AEO Assessment', owner: 'Efeonce' },
    { glyph: 'medicion', name: 'Share of voice', formula: 'Tus menciones ÷ menciones de la categoría', source: 'AEO Assessment', owner: 'Efeonce' },
    { glyph: 'busqueda', name: 'Clics orgánicos', formula: 'Clics desde Google en páginas objetivo', source: 'Search Console', owner: 'Tu equipo' },
    { glyph: 'embudo', name: 'Leads orgánicos', formula: 'Leads con origen orgánico o IA', source: 'Tu CRM', owner: 'Líder comercial' },
    { glyph: 'informe', name: 'Ingresos', formula: 'Negocios ganados de origen orgánico', source: 'Tu CRM', owner: 'Líder comercial' }
  ]
}


// día a día (vívelo) + clientes + próximos pasos
const tools = ex('content-day-tools')
P.dayTools = {
  ...tools,
  voice: { eyebrow: 'Tu día a día con Efeonce', question: '¿Dónde ves lo que pasa?', answer: ['Todo', 'junto'] },
  body: 'Cada cosa en su herramienta y **todo** tu SEO y AEO a la vista en tu panel, sin esperar el informe.',
  tools: tools.tools.map(t => /frameio/.test(t.path) ? { ...t, label: 'Revisas las piezas' } : /notion/.test(t.path) ? { ...t, label: 'Plan editorial' } : t),
  insights: { ...tools.insights, label: 'Reporte en vivo' }
}
const prog = ex('content-day-live-progress')
P.vivelo = {
  ...prog,
  voice: { eyebrow: 'Tu día a día con Efeonce', question: '¿Cómo avanza tu SEO?', answer: ['A la', 'vista'] },
  body: 'Sigues el plan en Notion y apruebas cada landing en Frame.io, comentando **sobre** la página.',
  plan: {
    ...prog.plan,
    title: 'Plan editorial',
    meta: 'Mes 2 de 3',
    columns: [
      { name: 'En curso', cards: [{ title: 'Guía de precios', tag: 'Pillar' }, { title: 'Comparativa', tag: 'Artículo' }] },
      { name: 'En revisión', cards: [{ title: 'Landing de precios', tag: 'Esperando tu visto bueno', highlight: true }] },
      { name: 'Listo', cards: [{ title: 'Auditoría técnica', tag: 'Fundación' }, { title: 'Schema de la marca', tag: 'Entidad' }] }
    ]
  },
  review: {
    ...prog.review,
    title: 'Landing de precios',
    piece: { plateRef: 'ai-generations/2026-09-29_deck-seo-aeo-documentos/plates/landing-precios-45.png', alt: 'La pieza en revisión: una landing de precios' },
    comments: [
      { mark: '1', author: 'Tú', version: 'v1', text: '¿Sumamos preguntas frecuentes?' },
      { own: true, author: 'Efeonce', version: 'v2', text: 'Listas, y con su schema.' }
    ]
  }
}
const clients = ex('content-clients')
P.clients = {
  ...clients,
  keepLine: 'growth',
  progress: 'auto',
  voice: { eyebrow: 'Clientes', question: '¿Quién confía en nosotros?', answer: ['Marcas', 'líderes'] },
  selected: 1,
  selection: { ...clients.selection, label: 'SEO' }
}
const next = ex('decision-next-steps')
P.nextSteps = {
  ...next,
  voice: { eyebrow: 'Próximos pasos', question: '¿Y ahora qué sigue?', answer: ['Empecemos'] },
  body: 'Un diagnóstico **sin costo**: cómo te ven Google y la IA.',
  agenda: {
    ...next.agenda,
    descriptor: '45 min por videollamada · Efeonce AEO Assessment',
    days: [{ weekday: 'Lun', day: '5' }, { weekday: 'Mar', day: '6' }, { weekday: 'Mié', day: '7' }, { weekday: 'Jue', day: '8' }, { weekday: 'Vie', day: '9' }],
    summary: 'Martes 6 · 11:30 · hora de Chile'
  },
  nextSteps: [
    { number: '02', label: 'Proyecto', title: 'Fundación', desc: 'La base técnica, la entidad y el schema en orden, a precio fijo.' },
    { number: '03', label: 'On-Going', title: 'SV360', desc: 'SEO y AEO cada mes, con tus métricas en Efeonce Insights.' }
  ]
}

// secciones de cine (asesoría de la sesión de línea gráfica, 2026-09-29)
const PL = 'ai-generations/2026-09-29_deck-seo-aeo-documentos/plates/'
const split = ex('section-split')
P.splitSv = {
  ...split,
  keepLine: 'growth',
  progress: 'auto',
  voice: { question: '¿SEO o AEO?', answer: ['Ambos'] },
  photo: { register: 'cine', subject: 'object', plateRef: PL + 'SX4-busqueda-y-respuesta.png', alt: 'Una caja de búsqueda y un composer de IA flotan en una nave oscura; sus haces de luz se unen en un solo punto sobre el piso' }
}
const splitEnd = ex('section-split-panel-end')
P.splitPain = {
  ...splitEnd,
  keepLine: 'growth',
  progress: 'auto',
  voice: { question: '¿A quién recomienda la IA?', answer: ['No a ti'] },
  photo: { register: 'cine', subject: 'person', plateRef: PL + 'SX3-a-otra-marca.png', alt: 'Un director comercial mira serio hacia la oscuridad de noche, con el teléfono en la mano, en su oficina frente a la ciudad' }
}
P.about = { ...ex('section-cine-about') }
const team = ex('section-cine-team')
P.team = { ...team, voice: { eyebrow: 'Nuestro equipo', question: '¿Quién ejecuta tu SEO?', answer: ['Este', 'equipo'] } }

// casos (datos de EJEMPLO hasta recibir las cifras reales del operador)
const cs = ex('decision-case')
const LG = 'ai-generations/2026-09-29_deck-seo-aeo-documentos/logos/'
const SRC = 'Google Search Console, GA4 y Efeonce AEO Assessment, 12 meses.'
const fig = (value, label) => ({ value, label, source: SRC })
P.caseBicecorp = {
  ...cs,
  keepLine: 'growth',
  voice: { eyebrow: 'Caso de éxito', question: '¿Qué cambió con BICECORP?', answer: ['Más visible'] },
  figures: [fig('+48 %', 'tráfico orgánico'), fig('×3', 'citas en respuestas IA'), fig('+35 %', 'leads orgánicos'), fig('−22 %', 'costo por lead')],
  clientLogo: { path: LG + 'bicecorp.svg', alt: 'BICECORP' },
  selected: 2,
  photo: { register: 'puesta-en-escena', subject: 'person', plateRef: 'ai-generations/2026-09-29_deck-seo-aeo-documentos/plates/CS2-banco-bice.png', alt: 'Una clienta mira Santiago al amanecer desde una terraza, con su teléfono en la mano' },
  selection: { target: 'object', label: 'AEO', participantKind: 'department' }
}
P.caseBanco = {
  ...cs,
  keepLine: 'growth',
  voice: { eyebrow: 'Caso de éxito', question: '¿Qué logró Banco BICE?', answer: ['Más cuentas'] },
  figures: [fig('+62 %', 'búsquedas de la marca'), fig('Top 3', 'en «cuenta corriente»'), fig('+41 %', 'solicitudes online'), fig('8 de 10', 'respuestas IA lo citan')],
  clientLogo: { path: LG + 'banco-bice.svg', alt: 'Banco BICE' },
  selected: 2,
  photo: { register: 'puesta-en-escena', subject: 'object', plateRef: 'ai-generations/2026-09-29_deck-seo-aeo-documentos/plates/CS1b-bice-tarjeta.png', alt: 'Una tarjeta de crédito Banco BICE flota en la oscuridad; una caja de búsqueda y un composer de IA la iluminan con dos haces de luz' },
  selection: { target: 'object', label: 'SEO', participantKind: 'department' }
}

const PL0 = 'ai-generations/2026-09-29_deck-seo-aeo-documentos/plates/'
P.caseBerel = {
  ...cs,
  keepLine: 'growth',
  voice: { eyebrow: 'Caso de éxito', question: '¿Qué cambió con Berel?', answer: ['Lo eligen'] },
  figures: [fig('+54 %', 'tráfico orgánico'), fig('+120', 'páginas de color'), fig('×2', 'citas en respuestas IA'), fig('+38 %', 'búsquedas de la marca')],
  clientLogo: { path: 'src/lib/artifact-composer/catalogs/deck-axis/assets/clients/berel.svg', alt: 'Berel' },
  selected: 2,
  photo: { register: 'puesta-en-escena', subject: 'person', plateRef: PL0 + 'CS3b-berel-squad.png', alt: 'La líder de marketing de Berel y una estratega de Efeonce eligen juntas un color entre las muestras de la temporada' },
  selection: { target: 'object', label: 'SEO', participantKind: 'department' }
}

// desarrollo end to end (operador, 2026-09-30): receta proposal-cinematic-web con plate propio
const webCine = structuredClone(brochureDoc.pages.find(p => p.photo && /WB1/.test(p.photo.plateRef)))
const { line: _wl, ...webRest } = webCine
P.dev = {
  ...webRest,
  voice: { eyebrow: 'Desarrollo web', question: '¿Y si hay que tocar código?', answer: ['Lo hacemos'] },
  body: 'No sólo lo recomendamos: armamos la landing y aplicamos el fix en tu stack, de punta a punta.',
  steps: [
    { glyph: 'codigo', kicker: 'Apps y landings', name: 'React y Next.js' },
    { glyph: 'web', kicker: 'Shopify', name: 'Liquid' },
    { glyph: 'nube', kicker: 'CMS', name: 'Drupal y WordPress' },
    { glyph: 'checklist', kicker: 'El fix', name: 'HTML, CSS y schema' }
  ],
  photo: { register: 'cine', subject: 'person', plateRef: 'ai-generations/2026-09-29_deck-seo-aeo-documentos/plates/DV1-lo-hacemos.png', alt: 'Una ingeniera front-end de Efeonce, con la chaqueta del equipo, mira a cámara mientras arrastra un bloque de código dentro de una landing holográfica de luz azul' },
  selection: { target: 'answer', label: 'Engine', participantKind: 'department' }
}

P.closeBrochure = { ...ex('close-brochure-orbit') }

// propuesta
P.coverProposal = {
  ...ex('cover-proposal-orbit'),
  voice: { eyebrow: 'Propuesta comercial · Octubre 2026', question: '¿Qué movemos en 2027?', answer: ['Tu', 'visibilidad'] }
}
const seoSoberEx = ex('proposal-service-seo')
P.seoSober = { ...seoSoberEx, steps: seoSteps(seoSoberEx.steps) }
const aeoSober = ex('proposal-service-aeo')
P.aeoSober = {
  ...aeoSober,
  voice: { eyebrow: 'Nuestra propuesta · Visibilidad en IA', question: '¿Te distingue la IA?', answer: ['Entre miles'] },
  body: 'Que Google y los motores de respuesta te encuentren, te entiendan y te recomienden, sobre una base SEO sólida.',
  steps: aeoSober.steps.map((s, i) =>
    i === 0 ? { ...s, desc: 'Efeonce AEO Assessment: tu marca en ChatGPT, Claude, Perplexity, Gemini y Google.' }
    : s.name === 'Foundation' ? { ...s, name: 'Fundación' }
    : s.name === 'Plataforma' ? { ...s, desc: 'Tu visibilidad en IA en tu portal, cada mes.' } : s
  )
}
const risk = ex('decision-risk')
P.risk = {
  ...risk,
  progress: 'auto',
  keepLine: 'growth',
  body: 'Cada riesgo tiene su cobertura escrita. Y el primer paso es un diagnóstico sin costo.',
  risks: [
    { risk: 'Promesas sin respaldo', name: 'Sin promesas vacías', how: 'Estimamos desde tu punto de partida y reportamos lo que se mueve, mes a mes.' },
    { risk: 'Que no encajemos', name: 'Diagnóstico primero', how: 'Ves tu mapa antes de firmar: score por motor, share of voice y plan.' },
    { risk: 'No ver qué pasa', name: 'Entregables a la vista', how: 'Cada ciclo con sus entregables, y tu visibilidad en IA en tu portal.' },
    { risk: 'Depender de una persona', name: 'Traspaso documentado', how: 'Reemplazo formal del equipo, con el contexto escrito y sin perder memoria.' }
  ]
}
const plan = ex('decision-plan')
P.plan = {
  ...plan,
  body: '**90** días a la primera lectura medible, en tres tramos de 30. Desde la primera semana ya hay trabajo en marcha.',
  stops: [
    { range: 'Días 1–30', title: 'Fundación', desc: 'Línea base, auditoría técnica, entidad y schema: la casa en orden.' },
    { range: 'Días 31–60', title: 'Contenido', desc: 'Clusters por intención y activos que los motores de IA pueden citar.' },
    { range: 'Días 61–90', title: 'Evidencia', desc: 'Visibilidad, share of voice y clics contra la línea base del diagnóstico.' }
  ]
}
const pricing = ex('content-pricing')
P.pricing = {
  ...pricing,
  body: 'Se cotiza por capacidad declarada, nunca por artículo. La fundación es un proyecto con fin; la operación, un retainer.',
  plans: [
    { name: 'Fundación', tagline: 'Proyecto de precio fijo', features: ['Auditoría técnica', 'Entidad y schema', 'Arreglo de la base', 'Línea base de visibilidad'] },
    { name: 'SV360', tagline: 'Fundación + operación', features: ['Todo lo de Fundación', 'Operación SEO y AEO', 'Contenido citable', 'PR y autoridad', 'Efeonce Insights'] },
    { name: 'Operación', tagline: 'Si la base ya está', features: ['Estrategia editorial', 'Producción y on-page', 'Citabilidad en IA', 'Efeonce Insights'] }
  ]
}
P.closeProposal = { ...ex('close-proposal-horizon') }

// ---------- documentos ----------
const docs = {
  brochure: {
    use: 'brochure',
    pages: [P.coverEngine, P.market, P.answer, P.about, P.splitSv, P.team, P.seoCineBrochure, P.eeat, P.aeoCineBrochure, P.cycle, P.dev, P.vivelo, P.insights, P.difference, P.clients, P.diagnosis, P.nextSteps, P.closeBrochure],
    plan: ['cover-brochure-line-engine', 'decision-ai-market', 'decision-ai-answer', 'section-cine-about', 'section-split', 'section-cine-team', 'proposal-cinematic-seo', 'method-eeat', 'proposal-cinematic-aeo', 'method-surround-cycle', 'proposal-cinematic-web', 'content-day-live-progress', 'content-day-live-results', 'decision-difference', 'content-clients', 'decision-diagnosis-map', 'decision-next-steps', 'close-brochure-orbit']
  },
  completo: {
    use: 'brochure',
    pages: [P.coverEngineFull, P.market, P.answer, P.traffic, P.about, P.splitSv, P.seoBase, P.team, P.seoCineBrochure, P.eeat, P.aeoCineBrochure, P.staircase, P.scoreRing, P.diagnosis, P.dev, P.cycle, P.dayTools, P.vivelo, P.insights, P.formulas, P.caseBicecorp, P.caseBanco, P.caseBerel, P.difference, P.clients, P.nextSteps, P.closeBrochure],
    plan: ['cover-brochure-line-engine', 'decision-ai-market', 'decision-ai-answer', 'decision-traffic-to-revenue', 'section-cine-about', 'section-split', 'content-bullets', 'section-cine-team', 'proposal-cinematic-seo', 'method-eeat', 'proposal-cinematic-aeo', 'method-staircase', 'method-score-ring', 'decision-diagnosis-map', 'proposal-cinematic-web', 'method-surround-cycle', 'content-day-tools', 'content-day-live-progress', 'content-day-live-results', 'content-measure-formulas', 'decision-case', 'decision-case', 'decision-case', 'decision-difference', 'content-clients', 'decision-next-steps', 'close-brochure-orbit']
  },
  propuesta: {
    use: 'proposal',
    pages: [P.coverProposal, P.market, P.answer, P.traffic, P.splitSv, P.eeat, P.team, P.seoSober, P.aeoSober, P.dev, P.cycle, P.dayTools, P.vivelo, P.insights, P.caseBicecorp, P.caseBanco, P.caseBerel, P.difference, P.risk, P.plan, P.pricing, P.diagnosis, P.closeProposal],
    plan: ['cover-proposal-orbit', 'decision-ai-market', 'decision-ai-answer', 'decision-traffic-to-revenue', 'section-split', 'method-eeat', 'section-cine-team', 'proposal-service-seo', 'proposal-service-aeo', 'proposal-cinematic-web', 'method-surround-cycle', 'content-day-tools', 'content-day-live-progress', 'content-day-live-results', 'decision-case', 'decision-case', 'decision-case', 'decision-difference', 'decision-risk', 'decision-plan', 'content-pricing', 'decision-diagnosis-map', 'close-proposal-horizon']
  }
}

// capítulos (índice de la primera página de cada uno): el problema · SV360 y SEO · AEO · cómo trabajamos · empecemos
const CH = { completo: [2, 4, 10, 14, 20], brochure: [2, 3, 8, 9, 13], propuesta: [2, 4, 8, 9, 14] }
mkdirSync(OUT, { recursive: true })
for (const [name, d] of Object.entries(docs)) {
  const pages = d.pages.map((p, idx) => {
    const c = structuredClone(p)
    if (c.progress === 'auto') c.progress = { sections: CH[name].length, current: CH[name].filter(st => st <= idx).length }
    // el documento propaga la línea Engine; la lámina de riesgo sólo existe en papel (línea growth)
    if (c.keepLine) { c.line = c.keepLine; c.theme = 'light'; delete c.keepLine } else delete c.line
    // anotaciones (ejemplo/muestra) fuera del deck: van en las notas del canvas (operador, 2026-09-30)
    for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k]
    return c
  })
  const doc = { contract: 'efeonce.surface-composition', version: '0.1.2', surface: 'deck', format: '16x9', use: d.use, line: 'engine', sections: CH[name].length, pages }
  writeFileSync(join(OUT, `${name}-document.json`), JSON.stringify(doc, null, 2))
  const planFile = { document: d.use, line: 'engine', ...(d.use === 'proposal' ? { diagnosisDone: false } : {}), slides: d.plan.map((recipeId, i) => ({ recipeId, ...(pages[i].photo ? { plateRef: pages[i].photo.plateRef } : {}) })) }
  writeFileSync(join(OUT, `${name}-plan.json`), JSON.stringify(planFile, null, 2))
  console.log(name, pages.length, 'páginas')
}
