import { describe, expect, it } from 'vitest'

import { GROWTH_AI_VISIBILITY_PROMPT_PACK_V1 } from '../prompt-packs/prompt-pack-v1'
import { resolvePromptInputs } from '../prompt-pack'

const VARS = { brandName: 'Efeonce', category: 'marketing y diseño', market: 'Chile' }

describe('growth/ai-visibility — prompt pack interpolation', () => {
  it('interpola marca/categoría/mercado como dato', () => {
    const prompts = resolvePromptInputs({ ...VARS, competitor: 'Cebra' })
    const p03 = prompts.find(p => p.promptId === 'p03')
    const p05 = prompts.find(p => p.promptId === 'p05')

    expect(p03?.promptText).toBe('¿Cuáles son las mejores agencias de marketing y diseño en Chile?')
    expect(p05?.promptText).toContain('Efeonce frente a Cebra')
    expect(prompts.every(p => !/\{\{\w+\}\}/.test(p.promptText))).toBe(true)
  })

  it('descarta prompts con {{competitor}} cuando no hay competidor (bug p06 del spike)', () => {
    const sinCompetidor = resolvePromptInputs(VARS)

    expect(sinCompetidor.find(p => p.promptId === 'p06')).toBeUndefined()
    expect(sinCompetidor.find(p => p.promptId === 'p05')).toBeUndefined()

    const conCompetidor = resolvePromptInputs({ ...VARS, competitor: 'Cebra' })

    expect(conCompetidor.find(p => p.promptId === 'p06')).toBeDefined()
  })

  it('discoveryOnly excluye prompts que nombran la marca', () => {
    const discovery = resolvePromptInputs(VARS, { includeBrandNamed: false })
    const namedIds = GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.filter(p => p.namesBrand).map(p => p.id)

    expect(discovery.every(p => !namedIds.includes(p.promptId))).toBe(true)
    expect(discovery.length).toBeGreaterThan(0)
  })

  it('TASK-1290 Slice 0 — los tags VIAJAN con cada prompt resuelto (llegan a execution_prompts)', () => {
    const prompts = resolvePromptInputs({ ...VARS, competitor: 'Cebra' })
    const p01 = prompts.find(p => p.promptId === 'p01')

    // los 4 tags del pack acompañan al prompt resuelto (el scorer los lee del run, no del pack estático).
    expect(p01).toMatchObject({
      family: 'category_discovery',
      fanOutType: 'related',
      intentStage: 'awareness',
      namesBrand: false
    })
    expect(prompts.every(p => p.family != null && p.intentStage != null && typeof p.namesBrand === 'boolean')).toBe(true)
  })
})
