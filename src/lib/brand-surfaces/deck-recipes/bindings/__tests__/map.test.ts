import { describe, expect, it } from 'vitest'

import { deckRecipeCatalog } from '../../catalog'
import { DECK_SLOT_BINDING_MAP, isExclusion } from '../map'

/** Tipos de slot que siempre son datos. */
const DATA_TYPES = new Set(['logo', 'money', 'metric', 'person'])

/**
 * Slots de prueba o de datos de muestra que el catálogo declara como `list`, `text` o `image`: el muro de logos, las
 * cifras de un listado, el equipo, la cita y la foto de un caso, las barras del gráfico y los datos de las láminas de
 * muestra SEO/AEO (TASK-1934).
 */
const PROOF_SLOTS = new Set([
  'content-clients.logos',
  'content-partners.partners',
  'content-team.team',
  'content-measure.figures',
  'section-cine-about.figures',
  'decision-chart.bars',
  'decision-chart.annotation',
  'decision-case.photo',
  'decision-testimonial.fullQuote',
  'decision-testimonial.author',
  'decision-testimonial.keyPhrase',
  'content-pricing-live.lineItems',
  'decision-ai-market.figures',
  'decision-ai-answer.clientName',
  'decision-ai-answer.clientDescription',
  'decision-ai-answer.clientCitations',
  'decision-ai-answer.competitorsToday',
  'decision-ai-answer.competitorsWithAeo',
  'decision-ai-answer.illustrativeMark',
  'decision-diagnosis-map.reportTitle',
  'decision-diagnosis-map.engineScores',
  'decision-diagnosis-map.shareOfVoice',
  'decision-diagnosis-map.lostPrompts',
  'decision-diagnosis-map.plan',
  'decision-diagnosis-map.sampleMark'
])

describe('mapa de binding contra el catálogo de runtime', () => {
  it('cubre las 90 recetas del catálogo', () => {
    expect(deckRecipeCatalog.recipes).toHaveLength(90)
  })

  it('todo slot logo, money, metric, person o de prueba tiene binder o exclusión con razón', () => {
    const missing: string[] = []

    for (const recipe of deckRecipeCatalog.recipes) {
      for (const slot of recipe.slots) {
        const key = `${recipe.id}.${slot.name}`

        if ((DATA_TYPES.has(slot.type) || PROOF_SLOTS.has(key)) && !DECK_SLOT_BINDING_MAP[recipe.id]?.[slot.name]) missing.push(key)
      }
    }

    expect(missing).toEqual([])
  })

  it('cada slot de prueba declarado existe en el catálogo (sin drift)', () => {
    const known = new Set(deckRecipeCatalog.recipes.flatMap(recipe => recipe.slots.map(slot => `${recipe.id}.${slot.name}`)))

    expect([...PROOF_SLOTS].filter(key => !known.has(key))).toEqual([])
  })

  it('cada fila del mapa nombra una receta y un slot que existen', () => {
    const drift: string[] = []

    for (const [recipeId, slots] of Object.entries(DECK_SLOT_BINDING_MAP)) {
      const recipe = deckRecipeCatalog.recipes.find(entry => entry.id === recipeId)

      for (const slot of Object.keys(slots)) {
        if (!recipe?.slots.some(entry => entry.name === slot)) drift.push(`${recipeId}.${slot}`)
      }
    }

    expect(drift).toEqual([])
  })

  it('una exclusión lleva su razón escrita', () => {
    const exclusions = Object.values(DECK_SLOT_BINDING_MAP).flatMap(slots => Object.values(slots)).filter(isExclusion)

    expect(exclusions.length).toBeGreaterThan(0)
    expect(exclusions.filter(entry => entry.reason.trim().length < 30)).toEqual([])
  })

  it('las derivadas apuntan a un slot hermano con binder', () => {
    for (const [recipeId, slots] of Object.entries(DECK_SLOT_BINDING_MAP)) {
      for (const [slot, entry] of Object.entries(slots)) {
        if (isExclusion(entry) || !entry.of) continue

        const sibling = slots[entry.of]

        expect(sibling, `${recipeId}.${slot} → ${entry.of}`).toBeDefined()
        expect(sibling && isExclusion(sibling)).toBe(false)
      }
    }
  })
})
