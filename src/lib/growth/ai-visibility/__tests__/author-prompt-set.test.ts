import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1290 Slice 3 — Autoría LLM del prompt set.
 *
 * Cubre: el sanitizer (vocabulario CERRADO, NO-LEADING flip, ids estables, dedup, min-count →
 * null) y la degradación honesta del router (flag OFF → prompts null, sin llamar al LLM).
 */

import {
  AUTHOR_PROMPT_SET_JSON_SCHEMA,
  AUTHOR_SYSTEM_PROMPT,
  AUTHOR_SYSTEM_PROMPT_VERSION
} from '../prompt-packs/authoring/author-system-prompt'
import { authorPromptSet, sanitizeAuthoredPrompts } from '../prompt-packs/authoring/author-prompt-set'

const validDraft = (over: Record<string, unknown> = {}) => ({
  family: 'category_discovery',
  fanOutType: 'related',
  intentStage: 'awareness',
  namesBrand: false,
  text: '¿Cuáles son las mejores {{category}} en {{market}}?',
  rationale: 'descubrimiento de categoría',
  ...over
})

// 8 prompts válidos (el mínimo) con textos distintos.
const validSet = (n = 8) =>
  Array.from({ length: n }, (_, i) => validDraft({ text: `pregunta ${i} sobre {{category}} en {{market}}` }))

describe('sanitizeAuthoredPrompts', () => {
  it('acepta un set válido y asigna ids estables llmNN', () => {
    const result = sanitizeAuthoredPrompts({ prompts: validSet(10) })

    expect(result).not.toBeNull()
    expect(result).toHaveLength(10)
    expect(result![0].id).toBe('llm01')
    expect(result![9].id).toBe('llm10')
  })

  it('descarta prompts con tags fuera del vocabulario cerrado', () => {
    const result = sanitizeAuthoredPrompts({
      prompts: [...validSet(8), validDraft({ intentStage: 'booking_invented', text: 'invalida' })]
    })

    expect(result).toHaveLength(8) // la 9.ª (intentStage inválido) se descarta.
  })

  it('NO-LEADING: corrige namesBrand a true cuando el texto contiene {{brand}}', () => {
    const result = sanitizeAuthoredPrompts({
      prompts: [...validSet(8), validDraft({ namesBrand: false, text: '¿Es {{brand}} confiable?' })]
    })

    const branded = result!.find(p => p.text.includes('{{brand}}'))

    expect(branded?.namesBrand).toBe(true) // el LLM dijo false, pero el texto nombra la marca.
  })

  it('dedup por texto normalizado', () => {
    const result = sanitizeAuthoredPrompts({
      prompts: [...validSet(8), validDraft({ text: 'pregunta 0 sobre {{category}} en {{market}}' })]
    })

    expect(result).toHaveLength(8) // la duplicada se descarta.
  })

  it('debajo del mínimo de prompts → null (el caller cae al baseline)', () => {
    expect(sanitizeAuthoredPrompts({ prompts: validSet(3) })).toBeNull()
  })

  it('output malformado → null', () => {
    expect(sanitizeAuthoredPrompts(null)).toBeNull()
    expect(sanitizeAuthoredPrompts({})).toBeNull()
    expect(sanitizeAuthoredPrompts({ prompts: 'nope' })).toBeNull()
  })
})

describe('authorPromptSet — degradación honesta', () => {
  beforeEach(() => {
    vi.stubEnv('GROWTH_AI_VISIBILITY_GRADER_ENABLED', 'false')
    vi.stubEnv('GROWTH_AI_VISIBILITY_PROMPT_AUTHORING_ENABLED', 'false')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('flag OFF → prompts null, status disabled (no llama al LLM)', async () => {
    const result = await authorPromptSet({
      brandName: 'Sky Airlines',
      categoryLabel: 'Aerolíneas de pasajeros',
      businessModel: 'consumer_b2c',
      market: 'CL',
      locale: 'es-CL',
      competitors: [],
      whatTheBrandDoes: 'aerolínea low-cost',
      fineCategory: 'aerolínea low-cost',
      maxTokens: 2000
    })

    expect(result.prompts).toBeNull()
    expect(result.status).toBe('disabled')
    expect(result.systemPromptVersion).toBe(AUTHOR_SYSTEM_PROMPT_VERSION)
    // grounding se reporta aun en fallback (provenance).
    expect(result.groundingSources).toContain('business_model:consumer_b2c')
  })
})

describe('artefacto del system prompt', () => {
  it('el system prompt y el schema codifican el vocabulario cerrado + no-leading', () => {
    expect(AUTHOR_SYSTEM_PROMPT).toContain('NO-LEADING')
    expect(AUTHOR_SYSTEM_PROMPT).toContain('Query Fan-Out')
    expect(AUTHOR_PROMPT_SET_JSON_SCHEMA.properties.prompts.items.properties.intentStage.enum as readonly string[])
      .toContain('purchase_intent')
  })
})
