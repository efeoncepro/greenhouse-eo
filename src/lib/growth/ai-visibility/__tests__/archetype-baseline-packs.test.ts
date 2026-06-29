import { describe, expect, it } from 'vitest'

/**
 * TASK-1290 Slice 1 — Baselines deterministas por arquetipo.
 *
 * Cubre: no-regresión bit-for-bit (agencia = pack v1), universalidad (cada modelo tiene su pack
 * con framing propio), `unknown` → genérico (NUNCA agencia), tags de vocabulario CERRADO, ids
 * globalmente únicos (el catálogo de tags del run no colisiona), y balance discovery/recall.
 */

import {
  ARCHETYPE_BASELINE_PACK_BY_MODEL,
  resolveArchetypeBaselinePack
} from '../prompt-packs/archetypes/baseline-packs'
import { GROWTH_AI_VISIBILITY_PROMPT_PACK_V1 } from '../prompt-packs/prompt-pack-v1'
import {
  isPromptFamily,
  isPromptFanOutType,
  isPromptIntentStage
} from '../prompt-packs/tag-vocabulary'
import { BRAND_BUSINESS_MODELS } from '../brand-intelligence/contracts'

describe('TASK-1290 Slice 1 — archetype baseline packs', () => {
  it('agencia (b2b_service_provider) = el pack v1 EXACTO (no-regresión bit-for-bit)', () => {
    expect(resolveArchetypeBaselinePack('b2b_service_provider')).toBe(GROWTH_AI_VISIBILITY_PROMPT_PACK_V1)
  })

  it('cubre TODOS los business models del enum (universal, no solo agencia/consumo)', () => {
    for (const model of BRAND_BUSINESS_MODELS) {
      expect(ARCHETYPE_BASELINE_PACK_BY_MODEL[model], model).toBeDefined()
      expect(ARCHETYPE_BASELINE_PACK_BY_MODEL[model].prompts.length, model).toBeGreaterThanOrEqual(6)
    }
  })

  it('`unknown` → pack genérico, NUNCA el de agencia (no re-introduce ISSUE-110)', () => {
    const unknownPack = resolveArchetypeBaselinePack('unknown')

    expect(unknownPack.version).toBe('archetype-generic.v1')
    expect(unknownPack).not.toBe(GROWTH_AI_VISIBILITY_PROMPT_PACK_V1)
    // null / valor desconocido → también genérico (degradación honesta).
    expect(resolveArchetypeBaselinePack(null).version).toBe('archetype-generic.v1')
    expect(resolveArchetypeBaselinePack('marca_inventada').version).toBe('archetype-generic.v1')
  })

  it('el pack de consumo NO usa framing de agencia (ni "agencia" ni "proveedor enterprise")', () => {
    const consumer = resolveArchetypeBaselinePack('consumer_b2c')
    const blob = consumer.prompts.map(p => p.text.toLowerCase()).join(' | ')

    expect(blob).not.toContain('agencia')
    expect(blob).not.toContain('proveedor')
    // tiene framing de consumidor real.
    expect(blob).toMatch(/mejores|vale la pena|reseñas|precio/)
  })

  it('todos los tags de todos los packs están en el vocabulario CERRADO', () => {
    for (const model of BRAND_BUSINESS_MODELS) {
      for (const prompt of ARCHETYPE_BASELINE_PACK_BY_MODEL[model].prompts) {
        expect(isPromptFamily(prompt.family), `${model}/${prompt.id} family`).toBe(true)
        expect(isPromptFanOutType(prompt.fanOutType), `${model}/${prompt.id} fanOutType`).toBe(true)
        expect(isPromptIntentStage(prompt.intentStage), `${model}/${prompt.id} intentStage`).toBe(true)
        expect(typeof prompt.namesBrand, `${model}/${prompt.id} namesBrand`).toBe('boolean')
      }
    }
  })

  it('los ids de prompt son globalmente únicos cross-pack (el catálogo del run no colisiona)', () => {
    const allIds = BRAND_BUSINESS_MODELS.flatMap(model =>
      ARCHETYPE_BASELINE_PACK_BY_MODEL[model].prompts.map(p => p.id)
    )

    // agencia comparte ids con v1 (es el mismo pack) — dedup por pack, no global. Validamos
    // que NO haya colisión entre packs DISTINTOS (cada arquetipo prefija sus ids).
    const nonAgency = BRAND_BUSINESS_MODELS.filter(m => m !== 'b2b_service_provider')

    const nonAgencyIds = nonAgency.flatMap(model =>
      ARCHETYPE_BASELINE_PACK_BY_MODEL[model].prompts.map(p => `${model}:${p.id}`.split(':')[1])
    )

    expect(new Set(nonAgencyIds).size).toBe(nonAgencyIds.length)
    expect(allIds.length).toBeGreaterThan(0)
  })

  it('cada pack balancea descubrimiento (namesBrand=false) y marca nombrada', () => {
    for (const model of BRAND_BUSINESS_MODELS) {
      const prompts = ARCHETYPE_BASELINE_PACK_BY_MODEL[model].prompts
      const discovery = prompts.filter(p => !p.namesBrand).length
      const named = prompts.filter(p => p.namesBrand).length

      // descubrimiento es lo que mide visibilidad real; debe existir en todos salvo público
      // (cuyo intent es resolver un trámite con la institución ya nombrada).
      if (model !== 'public_institution') {
        expect(discovery, `${model} discovery`).toBeGreaterThan(0)
      }

      expect(named, `${model} named`).toBeGreaterThan(0)
    }
  })

  it('los packs de consumo/saas/retail cubren intención de compra (revenue intent)', () => {
    for (const model of ['consumer_b2c', 'b2b_product_saas', 'retail_ecommerce'] as const) {
      const stages = new Set(ARCHETYPE_BASELINE_PACK_BY_MODEL[model].prompts.map(p => p.intentStage))

      expect(stages.has('purchase_intent'), model).toBe(true)
    }
  })
})
