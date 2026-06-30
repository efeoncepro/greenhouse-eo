import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { GROWTH_AI_VISIBILITY_PROMPT_PACK_V1 } from '../prompt-packs/prompt-pack-v1'
import {
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V2,
  GROWTH_AI_VISIBILITY_PROMPT_PACK_V2_VERSION
} from '../prompt-packs/prompt-pack-v2'
import {
  GROWTH_AI_VISIBILITY_DEFAULT_PROMPT_PACK_VERSION,
  resolvePromptPack
} from '../prompt-packs'
import { resolvePromptInputs } from '../prompt-pack'

describe('growth/ai-visibility — prompt pack v2', () => {
  it('corrige p12: elimina la contaminación de sector (aerolínea/banca) que ensuciaba los controles', () => {
    const v1p12 = GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.find(p => p.id === 'p12')!
    const v2p12 = GROWTH_AI_VISIBILITY_PROMPT_PACK_V2.prompts.find(p => p.id === 'p12')!

    expect(v1p12.text).toMatch(/aerolínea o banca/)
    expect(v2p12.text).not.toMatch(/aerolínea|banca/i)
    expect(v2p12.text).toContain('(enterprise)')
  })

  it('es additive: idéntico a V1 salvo p12 (mismos ids, mismo conteo, V1 intacto)', () => {
    expect(GROWTH_AI_VISIBILITY_PROMPT_PACK_V2.prompts).toHaveLength(GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.length)
    expect(GROWTH_AI_VISIBILITY_PROMPT_PACK_V2.prompts.map(p => p.id)).toEqual(
      GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.map(p => p.id)
    )

    const changed = GROWTH_AI_VISIBILITY_PROMPT_PACK_V2.prompts.filter(
      v2 => v2.text !== GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.prompts.find(v1 => v1.id === v2.id)?.text
    )

    expect(changed.map(p => p.id)).toEqual(['p12'])
    expect(GROWTH_AI_VISIBILITY_PROMPT_PACK_V1.version).toBe('prompt-pack.v1')
  })

  it('el módulo TS de V2 está en paridad con su espejo JSON durable', () => {
    const json = JSON.parse(
      readFileSync(
        join(process.cwd(), 'docs/architecture/growth/ai-visibility/prompt-pack.v2.json'),
        'utf8'
      )
    ) as { prompts: Array<{ id: string; text: string }> }

    expect(json.prompts.map(p => ({ id: p.id, text: p.text }))).toEqual(
      GROWTH_AI_VISIBILITY_PROMPT_PACK_V2.prompts.map(p => ({ id: p.id, text: p.text }))
    )
  })
})

describe('growth/ai-visibility — prompt pack registry', () => {
  it('default de runtime sigue siendo V1 (snapshots reproducibles)', () => {
    expect(GROWTH_AI_VISIBILITY_DEFAULT_PROMPT_PACK_VERSION).toBe('prompt-pack.v1')
    expect(resolvePromptPack().version).toBe('prompt-pack.v1')
    expect(resolvePromptPack(null).version).toBe('prompt-pack.v1')
  })

  it('resuelve V2 cuando se pide explícito (opt-in)', () => {
    expect(resolvePromptPack(GROWTH_AI_VISIBILITY_PROMPT_PACK_V2_VERSION).version).toBe('prompt-pack.v2')
  })

  it('lanza ante una versión explícita desconocida (no falsea la provenance)', () => {
    expect(() => resolvePromptPack('prompt-pack.v9')).toThrow(/Unknown AI Visibility prompt pack/)
  })

  it('resolvePromptInputs interpola p12 de V2 sin sectores', () => {
    const prompts = resolvePromptInputs(
      { brandName: 'Efeonce', category: 'marketing y diseño', market: 'Chile' },
      { pack: GROWTH_AI_VISIBILITY_PROMPT_PACK_V2 }
    )

    const p12 = prompts.find(p => p.promptId === 'p12')

    expect(p12?.promptText).toBe('Agencia enterprise de marketing y diseño para una marca grande (enterprise) en Chile.')
    expect(p12?.promptText).not.toMatch(/aerolínea|banca/i)
  })
})
