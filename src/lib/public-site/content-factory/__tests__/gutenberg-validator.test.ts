import { describe, expect, it } from 'vitest'

import type { ContentFactoryGeneratedDraft } from '../contracts'
import { validateGeneratedGutenbergDraft } from '../gutenberg-validator'

const buildDraft = (overrides: Partial<ContentFactoryGeneratedDraft> = {}): ContentFactoryGeneratedDraft => ({
  contractVersion: 'contentFactoryGeneratedDraft.v1',
  intent: 'create',
  lane: 'post_draft_gutenberg',
  title: 'AI aplicada a operaciones comerciales',
  slug: 'ai-aplicada-operaciones-comerciales',
  excerpt: 'Una guia practica para equipos comerciales que quieren usar AI con criterio operativo.',
  seo: {
    title: 'AI aplicada a operaciones comerciales',
    description: 'Guia practica para usar AI en operaciones comerciales con datos, procesos y gobierno.',
    indexPolicy: 'index'
  },
  draft: {
    kind: 'gutenberg_post',
    observedBlocks: ['core/heading', 'core/paragraph', 'core/list'],
    postContent: [
      '<!-- wp:heading {"level":2} -->',
      '<h2>AI como sistema operativo comercial</h2>',
      '<!-- /wp:heading -->',
      '<!-- wp:paragraph -->',
      '<p>La AI funciona mejor cuando se conecta a datos confiables, procesos claros y decisiones revisables.</p>',
      '<!-- /wp:paragraph -->',
      '<!-- wp:list -->',
      '<ul><li>Diseñar el flujo antes del prompt.</li><li>Medir señales comerciales reales.</li></ul>',
      '<!-- /wp:list -->',
      '<!-- wp:paragraph -->',
      '<p>El siguiente paso es transformar cada idea en un draft privado que un humano pueda revisar.</p>',
      '<!-- /wp:paragraph -->',
      '<!-- wp:paragraph -->',
      '<p>Este parrafo adicional entrega suficiente contexto editorial para superar el umbral inicial.</p>',
      '<!-- /wp:paragraph -->'
    ].join('\n')
  },
  ...overrides
})

describe('validateGeneratedGutenbergDraft', () => {
  it('passes a governed Gutenberg post draft', () => {
    const validation = validateGeneratedGutenbergDraft(buildDraft())

    expect(validation.status).toBe('pass')
    expect(validation.summary).toMatchObject({
      blockCount: 5,
      uniqueBlocks: ['core/heading', 'core/list', 'core/paragraph']
    })
  })

  it('blocks unsafe markup', () => {
    const validation = validateGeneratedGutenbergDraft(
      buildDraft({
        draft: {
          kind: 'gutenberg_post',
          observedBlocks: ['core/html'],
          postContent: '<!-- wp:html --><script>alert("x")</script><!-- /wp:html -->'
        }
      })
    )

    expect(validation.status).toBe('block')
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'unsafe_markup_detected', severity: 'block' }),
        expect.objectContaining({ code: 'unsupported_gutenberg_block', severity: 'block' })
      ])
    )
  })

  it('blocks unsupported blocks and warns about legacy freeform', () => {
    const validation = validateGeneratedGutenbergDraft(
      buildDraft({
        draft: {
          kind: 'gutenberg_post',
          observedBlocks: ['core/freeform', 'acme/unknown'],
          postContent: [
            '<!-- wp:freeform -->',
            '<p>Legacy freeform HTML.</p>',
            '<!-- /wp:freeform -->',
            '<!-- wp:acme/unknown -->',
            '<div>Unknown block.</div>',
            '<!-- /wp:acme/unknown -->'
          ].join('\n')
        }
      })
    )

    expect(validation.status).toBe('block')
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'freeform_block_discouraged', severity: 'warning' }),
        expect.objectContaining({ code: 'unsupported_gutenberg_block', severity: 'block' })
      ])
    )
  })
})
