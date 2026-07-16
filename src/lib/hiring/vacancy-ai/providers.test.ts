import { describe, expect, it, vi } from 'vitest'

import type { VacancyPromptInput } from './prompt'
import { runPublicCopyGeneration } from './providers'

// TASK-1385 — adapter honest-degrading: NUNCA throwea; devuelve status + copy/null. Mock del
// provider (deps injection) → CI-safe, sin llamar a Anthropic real. Espeja providers.test de 1361.

const input: VacancyPromptInput = {
  role: 'SEO Specialist',
  seniority: 'senior',
  skills: ['SEO técnico'],
  language: 'español',
  timezone: null,
  duration: null,
  workMode: 'remote',
  hiringRegion: 'LATAM',
  city: null,
  country: null,
  officeLocation: null,
  area: 'Growth',
  employmentMode: null,
  currentCopy: { title: null, summary: null, description: null, requirements: null, niceToHave: null, processNotes: null },
  competencies: [],
}

describe('runPublicCopyGeneration (honest-degrade, TASK-1385)', () => {
  it('not_configured cuando el provider no está configurado', async () => {
    const res = await runPublicCopyGeneration(input, { isConfigured: async () => false, generate: vi.fn() as never })

    expect(res.status).toBe('not_configured')
    expect(res.copy).toBeNull()
  })

  it('provider_error cuando el generate lanza (no propaga la excepción)', async () => {
    const res = await runPublicCopyGeneration(input, {
      isConfigured: async () => true,
      generate: (async () => {
        throw new Error('boom')
      }) as never,
    })

    expect(res.status).toBe('provider_error')
    expect(res.copy).toBeNull()
  })

  it('ok con copy sanitizado cuando el provider responde bien', async () => {
    const res = await runPublicCopyGeneration(input, {
      isConfigured: async () => true,
      generate: (async () => ({
        data: {
          publicTitle: 'SEO Specialist Senior',
          publicSummary: 'Liderarás el SEO técnico de cuentas reales.',
          publicDescription: '- Auditorías\n- Estrategia',
          publicSkillTags: ['SEO técnico'],
        },
        model: 'claude-sonnet-5',
        usage: { inputTokens: 100, outputTokens: 50 },
      })) as never,
    })

    expect(res.status).toBe('ok')
    expect(res.copy?.publicTitle).toBe('SEO Specialist Senior')
    expect(res.model).toBe('claude-sonnet-5')
  })

  it('schema_invalid cuando el provider responde una forma inservible', async () => {
    const res = await runPublicCopyGeneration(input, {
      isConfigured: async () => true,
      generate: (async () => ({ data: { publicTitle: '' }, model: 'claude-sonnet-5', usage: {} })) as never,
    })

    expect(res.status).toBe('schema_invalid')
    expect(res.copy).toBeNull()
  })
})
