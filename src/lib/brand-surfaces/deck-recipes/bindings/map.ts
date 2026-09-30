/**
 * El mapa declarado de TASK-1930: qué slot de datos de qué receta sale de qué binder, o por qué no tiene binder.
 *
 * Los slots de voz (eyebrow, pregunta, respuesta, cuerpo…) no están aquí: los propone TASK-1929 y los confirma una
 * persona. Todo slot `logo`, `money`, `metric` o `person` del catálogo, y cada slot de prueba o de datos de muestra,
 * tiene una fila: un binder o una exclusión con su razón (`bindings/__tests__/map.test.ts` lo exige contra el catálogo
 * de runtime, así que una receta nueva con un slot de datos sin fila rompe el test).
 *
 * Las cantidades son las de la lámina aprobada (`EFEONCE_DECK_SLIDE_RECIPES_V1.json`, notas de cada slot).
 */

import type { DeckSlotBinderKind } from './types'

export interface DeckSlotBinderRule {
  binder: DeckSlotBinderKind
  /** Cuántos hechos lleva el slot. `max: 1` liga un valor; más, una lista. */
  count?: { min: number; max: number }
  /** El arco de medida: el valor es una proporción entre 0 y 1. */
  ratio?: boolean
  /** `metric-source` y `metric-delta`: el slot hermano de donde salen. */
  of?: string
  /** `proof-quote`: qué parte de la cita. */
  part?: 'quote' | 'author' | 'keyPhrase'
  /** `sample-data`: el slot de la marca de muestra de la receta. */
  mark?: string
}

export interface DeckSlotExclusion {
  excluded: true
  reason: string
}

export type DeckSlotMapEntry = DeckSlotBinderRule | DeckSlotExclusion

export const isExclusion = (entry: DeckSlotMapEntry): entry is DeckSlotExclusion => 'excluded' in entry

/**
 * Mínimo de logos del muro de clientes y del de partners: el de la lámina aprobada (nueve logos + la celda de
 * mercados). Decisión del operador 2026-09-28: con menos logos autorizados el muro no compone y se usa otra lámina de
 * prueba (un caso o un testimonio), nunca un muro más chico.
 */
export const LOGO_WALL_MIN = 9

/** Las marcas de las láminas de muestra, tal como las aprobó el catálogo (TASK-1934). */
export const SAMPLE_MARKS = {
  'decision-ai-answer': 'Ejemplo ilustrativo · tu diagnóstico muestra tu situación real',
  'decision-diagnosis-map': 'Datos de muestra'
} as const

const clientLogo: DeckSlotBinderRule = { binder: 'client-logo' }
const one = { min: 1, max: 1 }
const optionalOne = { min: 0, max: 1 }
const exactly = (n: number) => ({ min: n, max: n })

const COMPUTED_SCORE =
  'Se calcula desde la configuración del scoring de Efeonce (src/lib/growth/ai-visibility/scoring/config.ts): no es dato del cliente ni de la propuesta.'

const PRESENTATION_CHOICE = 'Elige qué destaca la lámina: es una decisión de presentación, no un dato.'

const PRODUCT_MARK =
  'Lockup de submarca de Efeonce (SV360, AEO, AEO Assessment, AI Visibility Report o Insights, de @efeoncepro/axis-brand-assets, lista cerrada): marca propia que elige quien arma la lámina según la pieza del producto de la que habla; no es dato del cliente ni de la propuesta (TASK-1949).'

const MOCKUP_FIGURE =
  'Cifra ilustrativa de la maqueta del producto (deck SEO/AEO, TASK-1949): no se liga desde un hecho del cliente. Con datos reales sale de la edición de Efeonce Insights del cliente con su fuente; la anotación «datos de ejemplo» vive fuera de la lámina.'

const PARTNER_CLAIM =
  'Claim de partner de Efeonce, no dato del cliente ni de la propuesta: la insignia va con la referencia de su autorización o readback vigente (docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md; la de Salesforce, autorizada por Salesforce: `salesforce-partner-authorization-2026-09-29`, declarado por el operador); sin ella, el respaldo «Operamos sobre» + logo corporativo o nada.'

/** `recipeId → slot → regla o exclusión`. */
export const DECK_SLOT_BINDING_MAP: Record<string, Record<string, DeckSlotMapEntry>> = {
  // Portadas de propuesta: el logo del cliente de la `Proposal` (Account 360), en su versión para fondo oscuro.
  'cover-proposal-orbit': { clientLogo, productMark: { excluded: true, reason: PRODUCT_MARK } },
  'cover-proposal-orbit-sky': { clientLogo },
  'cover-proposal-dawn': { clientLogo },
  'cover-proposal-dawn-sky': { clientLogo },

  // Cifras con fuente medida.
  'content-measure': {
    measure: { binder: 'metric', count: one, ratio: true },
    figures: { binder: 'metric', count: { min: 0, max: 2 } },
    source: { binder: 'metric-source', of: 'measure' }
  },
  'content-focus': {
    proof: { binder: 'metric', count: one },
    source: { binder: 'metric-source', of: 'proof' }
  },
  'decision-chart': {
    bars: { binder: 'metric', count: exactly(2) },
    annotation: { binder: 'metric-delta', of: 'bars' },
    kpis: { binder: 'metric', count: exactly(4) },
    source: { binder: 'metric-source', of: 'kpis' }
  },
  'decision-why-us': {
    facts: { binder: 'metric', count: exactly(6) },
    source: { binder: 'metric-source', of: 'facts' },
    selectedFact: { excluded: true, reason: PRESENTATION_CHOICE }
  },
  'content-day-live-results': { metrics: { binder: 'metric', count: exactly(3) }, productMark: { excluded: true, reason: PRODUCT_MARK } },
  'section-cine-about': { figures: { binder: 'metric', count: exactly(3) } },
  'proposal-service-creative': { proof: { binder: 'metric', count: optionalOne } },
  'proposal-cinematic-creative': { proof: { binder: 'metric', count: optionalOne } },
  'proposal-cinematic-web': { proof: { binder: 'metric', count: optionalOne } },

  // Casos, testimonios y logos de terceros: sólo con autorización registrada (evidencia `attested` con documento).
  'decision-case': {
    clientLogo: { binder: 'proof-logo', count: one },
    stats: { binder: 'proof-figures', count: exactly(4) },
    source: { binder: 'metric-source', of: 'stats' },
    photo: { binder: 'proof-photo' },
    selectedStat: { excluded: true, reason: PRESENTATION_CHOICE }
  },
  'decision-testimonial': {
    clientLogo: { binder: 'proof-logo', count: one },
    fullQuote: { binder: 'proof-quote', part: 'quote' },
    author: { binder: 'proof-quote', part: 'author' },
    keyPhrase: { binder: 'proof-quote', part: 'keyPhrase' },
    proof: { binder: 'proof-figures', count: exactly(3) },
    source: { binder: 'metric-source', of: 'proof' }
  },
  'content-clients': {
    logos: { binder: 'proof-logo', count: { min: LOGO_WALL_MIN, max: LOGO_WALL_MIN } },
    proofs: { binder: 'proof-figures', count: exactly(2) },
    selectedProof: { excluded: true, reason: PRESENTATION_CHOICE }
  },
  'content-partners': {
    partners: { binder: 'proof-logo', count: { min: LOGO_WALL_MIN, max: LOGO_WALL_MIN } },
    selectedPartner: { excluded: true, reason: PRESENTATION_CHOICE }
  },

  // Montos: de los hechos económicos de TASK-1417 (proyección congelada, ya redactada). Hasta entonces, `[MONTO]`.
  'content-pricing': {
    amounts: { binder: 'money' },
    plans: { excluded: true, reason: 'Niveles del producto Greenhouse (nombre, bajada y funciones): catálogo de Efeonce, sin montos.' },
    recommendedPlan: { excluded: true, reason: PRESENTATION_CHOICE }
  },
  'content-pricing-stage': { amounts: { binder: 'money' } },
  'content-pricing-live': { lineItems: { binder: 'money' }, total: { binder: 'money' } },

  // Equipo: del roster real de TASK-1418 con fotos del allowlist `squad-person`. Nunca una cara generada.
  'content-team': { lead: { binder: 'team' }, team: { binder: 'team' } },

  // Láminas de muestra SEO/AEO (TASK-1934): ilustrativas por defecto y con su marca; con datos del cliente, evidencia.
  'decision-ai-answer': {
    clientName: { binder: 'sample-data', mark: 'illustrativeMark' },
    clientDescription: { binder: 'sample-data', mark: 'illustrativeMark' },
    clientCitations: { binder: 'sample-data', mark: 'illustrativeMark' },
    competitorsToday: { binder: 'sample-data', mark: 'illustrativeMark' },
    competitorsWithAeo: { binder: 'sample-data', mark: 'illustrativeMark' },
    illustrativeMark: { binder: 'sample-data', mark: 'illustrativeMark' }
  },
  'decision-diagnosis-map': {
    reportTitle: { binder: 'sample-data', mark: 'sampleMark' },
    engineScores: { binder: 'sample-data', mark: 'sampleMark' },
    shareOfVoice: { binder: 'sample-data', mark: 'sampleMark' },
    lostPrompts: { binder: 'sample-data', mark: 'sampleMark' },
    plan: { binder: 'sample-data', mark: 'sampleMark' },
    sampleMark: { binder: 'sample-data', mark: 'sampleMark' },
    productMark: { excluded: true, reason: PRODUCT_MARK }
  },
  'decision-ai-market': {
    figures: {
      excluded: true,
      reason: 'Dato de mercado citado con su fuente pública (HubSpot, McKinsey, SparkToro): no es dato del cliente ni de la propuesta; la fuente viaja en cada cifra.'
    }
  },

  // Cifras que no son datos de nadie: se calculan o las decide quien presenta.
  'method-score-ring': {
    total: { excluded: true, reason: COMPUTED_SCORE },
    dimensions: { excluded: true, reason: COMPUTED_SCORE },
    productMark: { excluded: true, reason: PRODUCT_MARK }
  },
  'decision-plan': { horizon: { excluded: true, reason: 'Horizonte del plan: lo decide quien propone y lo confirma una persona.' } },
  'method-staircase': { selectedLevel: { excluded: true, reason: PRESENTATION_CHOICE }, productMark: { excluded: true, reason: PRODUCT_MARK } },
  'method-staircase-flat': { selectedLevel: { excluded: true, reason: PRESENTATION_CHOICE } },

  // Deck Salesforce (2026-09-29): marcas de terceros que no son datos del cliente ni de la propuesta.
  'cover-brochure-line-revenue': { partnerMark: { excluded: true, reason: PARTNER_CLAIM } },
  'close-proposal-horizon': { partnerMark: { excluded: true, reason: PARTNER_CLAIM } },
  'content-live-chat': {
    assistantMark: {
      excluded: true,
      reason: 'Marca de un proveedor de la práctica (Claude, de Anthropic) sujeta a su autorización de uso de marca, pendiente de archivar (biblioteca de autorizaciones: TASK-1937): no es dato del cliente ni de la propuesta.'
    }
  },

  // Deck SEO/AEO (2026-09-30, TASK-1949): lockups de submarca de Efeonce y cifras de maqueta del producto.
  'cover-brochure-line-engine': { productMark: { excluded: true, reason: PRODUCT_MARK } },
  'proposal-cinematic-seo': { productMark: { excluded: true, reason: PRODUCT_MARK } },
  'proposal-cinematic-aeo': { productMark: { excluded: true, reason: PRODUCT_MARK } },
  'proposal-service-seo': { productMark: { excluded: true, reason: PRODUCT_MARK } },
  'proposal-service-aeo': { productMark: { excluded: true, reason: PRODUCT_MARK } },
  'content-brand-family': { productMark: { excluded: true, reason: PRODUCT_MARK } },
  'content-service-mockups': {
    productMark: { excluded: true, reason: PRODUCT_MARK },
    authorityMetric: { excluded: true, reason: MOCKUP_FIGURE }
  },
  'content-report-formats': { productMark: { excluded: true, reason: PRODUCT_MARK } },
  'content-committee-deck': {
    productMark: { excluded: true, reason: PRODUCT_MARK },
    slideFigure: { excluded: true, reason: MOCKUP_FIGURE }
  },
  'content-industries': { productMark: { excluded: true, reason: PRODUCT_MARK } },
  'content-markets': { productMark: { excluded: true, reason: PRODUCT_MARK } }
}

/** Las filas con binder de una receta, en el orden del mapa. */
export const bindingRulesOf = (recipeId: string): [string, DeckSlotBinderRule][] =>
  Object.entries(DECK_SLOT_BINDING_MAP[recipeId] ?? {}).filter((entry): entry is [string, DeckSlotBinderRule] => !isExclusion(entry[1]))
