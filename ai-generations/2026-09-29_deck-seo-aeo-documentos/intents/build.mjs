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
  progress: { sections: 15, current: 11 },
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
    pages: [P.coverEngine, P.market, P.answer, P.sv360, P.seoCineBrochure, P.eeat, P.aeoCineBrochure, P.cycle, P.insights, P.difference, P.diagnosis, P.closeBrochure],
    plan: ['cover-brochure-line-engine', 'decision-ai-market', 'decision-ai-answer', 'content-text', 'proposal-cinematic-seo', 'method-eeat', 'proposal-cinematic-aeo', 'method-surround-cycle', 'content-day-live-results', 'decision-difference', 'decision-diagnosis-map', 'close-brochure-orbit']
  },
  completo: {
    use: 'brochure',
    pages: [P.coverEngineFull, P.market, P.answer, P.traffic, P.sv360, P.seoBase, P.seoCineBrochure, P.eeat, P.aeoCineBrochure, P.staircase, P.scoreRing, P.diagnosis, P.cycle, P.insights, P.formulas, P.difference, P.closeBrochure],
    plan: ['cover-brochure-line-engine', 'decision-ai-market', 'decision-ai-answer', 'decision-traffic-to-revenue', 'content-text', 'content-bullets', 'proposal-cinematic-seo', 'method-eeat', 'proposal-cinematic-aeo', 'method-staircase', 'method-score-ring', 'decision-diagnosis-map', 'method-surround-cycle', 'content-day-live-results', 'content-measure-formulas', 'decision-difference', 'close-brochure-orbit']
  },
  propuesta: {
    use: 'proposal',
    pages: [P.coverProposal, P.market, P.answer, P.traffic, P.sv360, P.eeat, P.seoSober, P.aeoSober, P.cycle, P.insights, P.difference, P.risk, P.plan, P.pricing, P.diagnosis, P.closeProposal],
    plan: ['cover-proposal-orbit', 'decision-ai-market', 'decision-ai-answer', 'decision-traffic-to-revenue', 'content-text', 'method-eeat', 'proposal-service-seo', 'proposal-service-aeo', 'method-surround-cycle', 'content-day-live-results', 'decision-difference', 'decision-risk', 'decision-plan', 'content-pricing', 'decision-diagnosis-map', 'close-proposal-horizon']
  }
}

mkdirSync(OUT, { recursive: true })
for (const [name, d] of Object.entries(docs)) {
  const pages = d.pages.map((p, idx) => {
    const c = structuredClone(p)
    if (c.progress === 'auto') c.progress = { sections: d.pages.length - 1, current: idx }
    // el documento propaga la línea Engine; la lámina de riesgo sólo existe en papel (línea growth)
    if (c.keepLine) { c.line = c.keepLine; c.theme = 'light'; delete c.keepLine } else delete c.line
    for (const k of Object.keys(c)) if (c[k] === undefined) delete c[k]
    return c
  })
  const doc = { contract: 'efeonce.surface-composition', version: '0.1.2', surface: 'deck', format: '16x9', use: d.use, line: 'engine', sections: pages.length - 1, pages }
  writeFileSync(join(OUT, `${name}-document.json`), JSON.stringify(doc, null, 2))
  const planFile = { document: d.use, line: 'engine', ...(d.use === 'proposal' ? { diagnosisDone: false } : {}), slides: d.plan.map((recipeId, i) => ({ recipeId, ...(pages[i].photo ? { plateRef: pages[i].photo.plateRef } : {}) })) }
  writeFileSync(join(OUT, `${name}-plan.json`), JSON.stringify(planFile, null, 2))
  console.log(name, pages.length, 'páginas')
}
