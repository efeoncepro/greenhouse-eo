import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const anthropicMock = vi.fn()

vi.mock('@/lib/ai/anthropic', () => ({
  generateStructuredAnthropic: (...args: unknown[]) => anthropicMock(...args)
}))

import { authorGutenbergDraft } from '../article-authoring'
import {
  buildArticleIdeationSystemPrompt,
  ideateArticleSpec,
  normalizeLlmArticleSpec,
  reviseArticleSpec
} from '../article-ideation'
import { validateGeneratedGutenbergDraft } from '../gutenberg-validator'

const llmSpec = {
  title: 'Cómo empaquetar el conocimiento de tu agencia como Agent Skills',
  excerpt: 'Los skills públicos son el piso; lo que construyes encima es tu ventaja.',
  seoTitle: 'Empaquetar conocimiento como Agent Skills %%sep%% %%sitename%%',
  seoDescription: 'Guía para agencias: convierte tu criterio operativo en Agent Skills propietarios que un agente ejecute con consistencia.',
  intro: ['Los skills públicos son agnósticos: sirven para cualquiera, y por eso no te diferencian.'],
  sections: [
    {
      heading: 'Qué es un skill propietario',
      level: 2,
      blocks: [
        { kind: 'paragraph', text: 'Es empaquetar tu conocimiento, no instalar el de otro.' },
        { kind: 'list', items: ['Tu proceso de briefing.', 'Tu criterio de calificación.'] }
      ]
    },
    {
      heading: 'Cómo empezar',
      level: 2,
      blocks: [{ kind: 'quote', text: 'Los skills públicos resuelven no saber; los propietarios, no poder escalar.' }]
    },
    {
      heading: 'Qué medir',
      level: 2,
      blocks: [{ kind: 'paragraph', text: 'Menos rondas, criterio consistente, resultados repetibles.' }]
    }
  ],
  cta: 'La pregunta es qué programas de tu operación vale la pena escribir primero.'
}

beforeEach(() => {
  anthropicMock.mockReset()
  anthropicMock.mockResolvedValue({
    data: llmSpec,
    model: 'claude-sonnet-4-6',
    stopReason: 'tool_use',
    usage: { inputTokens: 100, outputTokens: 400 }
  })
})

describe('ideateArticleSpec', () => {
  it('produces a spec that assembles + validates to pass', async () => {
    const result = await ideateArticleSpec({ idea: 'Skills propietarios para agencias', audience: 'agencias B2B' })
    const draft = authorGutenbergDraft(result.spec)
    const validation = validateGeneratedGutenbergDraft(draft)

    expect(validation.status).toBe('pass')
    expect(result.model).toBe('claude-sonnet-4-6')
    expect(result.usage.outputTokens).toBe(400)
  })

  it('passes the idea + audience into the model prompt and forces the emit tool', async () => {
    await ideateArticleSpec({ idea: 'Mi idea concreta', audience: 'CMOs' })

    const call = anthropicMock.mock.calls[0][0]

    expect(call.toolName).toBe('emit_article_spec')
    expect(call.prompt).toContain('Mi idea concreta')
    expect(call.prompt).toContain('CMOs')
    expect(call.system).toContain('Efeonce')
  })

  it('throws when the idea is empty', async () => {
    await expect(ideateArticleSpec({ idea: '   ' })).rejects.toThrow('content_factory_ideation_idea_required')
  })
})

describe('reviseArticleSpec (co-creation)', () => {
  it('embeds the current spec + the operator instruction in the prompt', async () => {
    const spec = normalizeLlmArticleSpec(llmSpec, { idea: 'x' })

    await reviseArticleSpec({ spec, instruction: 'Agrega una sección sobre riesgos de seguridad' })

    const call = anthropicMock.mock.calls[0][0]

    expect(call.prompt).toContain('Qué es un skill propietario') // current spec content
    expect(call.prompt).toContain('Agrega una sección sobre riesgos de seguridad')
  })

  it('throws when the instruction is empty', async () => {
    const spec = normalizeLlmArticleSpec(llmSpec, { idea: 'x' })

    await expect(reviseArticleSpec({ spec, instruction: '' })).rejects.toThrow(
      'content_factory_revision_instruction_required'
    )
  })
})

describe('normalizeLlmArticleSpec', () => {
  it('maps seo fields and drops empty/invalid blocks (never invents content)', () => {
    const spec = normalizeLlmArticleSpec(
      {
        ...llmSpec,
        sections: [
          {
            heading: 'Con basura',
            level: 2,
            blocks: [
              { kind: 'paragraph', text: '' }, // dropped
              { kind: 'list', items: [] }, // dropped
              { kind: 'image' as unknown as string, text: 'no' }, // unknown kind dropped
              { kind: 'paragraph', text: 'Válido.' }
            ]
          },
          ...llmSpec.sections
        ]
      },
      { idea: 'x' }
    )

    expect(spec.seo.title).toContain('%%sep%% %%sitename%%')
    expect(spec.sections[0].blocks).toEqual([{ kind: 'paragraph', text: 'Válido.' }])
    expect(spec.cta).toEqual({ text: llmSpec.cta })
  })
})

describe('buildArticleIdeationSystemPrompt', () => {
  it('bakes in the hard editorial rules', () => {
    const prompt = buildArticleIdeationSystemPrompt({ tone: 'thought_leadership', locale: 'es-CL' })

    expect(prompt).toContain('NUNCA generes H1')
    expect(prompt).toContain('Solo datos públicos')
    expect(prompt).toContain('%%sep%% %%sitename%%')
    expect(prompt).toContain('tuteo')
  })
})
