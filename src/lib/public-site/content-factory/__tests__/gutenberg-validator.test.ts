import { describe, expect, it } from 'vitest'

import type { ContentFactoryGeneratedDraft } from '../contracts'
import { renderHeadingBlock, renderYoastTableOfContents } from '../gutenberg-blocks'
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
    observedBlocks: ['core/heading', 'core/paragraph', 'core/list', 'core/quote', 'yoast-seo/table-of-contents'],
    postContent: [
      renderHeadingBlock({ level: 2, text: 'TL;DR' }),
      '<!-- wp:paragraph -->',
      '<p>La AI funciona mejor cuando se conecta a datos confiables, procesos claros y decisiones revisables.</p>',
      '<!-- /wp:paragraph -->',
      renderYoastTableOfContents([
        { level: 2, text: 'TL;DR' },
        { level: 2, text: 'AI como sistema operativo comercial' },
        { level: 3, text: 'Como llevarlo a operacion' }
      ]),
      renderHeadingBlock({ level: 2, text: 'AI como sistema operativo comercial' }),
      '<!-- wp:list -->',
      '<ul><li>Diseñar el flujo antes del prompt.</li><li>Medir señales comerciales reales.</li></ul>',
      '<!-- /wp:list -->',
      renderHeadingBlock({ level: 3, text: 'Como llevarlo a operacion' }),
      '<!-- wp:paragraph -->',
      '<p>El siguiente paso es transformar cada idea en un draft privado que un humano pueda revisar.</p>',
      '<!-- /wp:paragraph -->',
      '<!-- wp:quote -->',
      '<blockquote class="wp-block-quote"><p>La estructura convierte el contenido en una pieza revisable.</p></blockquote>',
      '<!-- /wp:quote -->',
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
      blockCount: 9,
      uniqueBlocks: ['core/heading', 'core/list', 'core/paragraph', 'core/quote', 'yoast-seo/table-of-contents'],
      hasTableOfContents: true
    })
  })

  it('warns when the TOC is empty and headings are unanchored (the 250748 defect)', () => {
    const validation = validateGeneratedGutenbergDraft(
      buildDraft({
        draft: {
          kind: 'gutenberg_post',
          observedBlocks: ['core/heading', 'core/paragraph', 'core/list', 'core/quote', 'yoast-seo/table-of-contents'],
          postContent: [
            '<!-- wp:heading {"level":2} -->',
            '<h2>TL;DR</h2>',
            '<!-- /wp:heading -->',
            '<!-- wp:paragraph -->',
            '<p>Intro suficiente para el draft editorial de prueba.</p>',
            '<!-- /wp:paragraph -->',
            '<!-- wp:yoast-seo/table-of-contents -->',
            '<div class="wp-block-yoast-seo-table-of-contents yoast-table-of-contents"><h2>Tabla de contenidos</h2></div>',
            '<!-- /wp:yoast-seo/table-of-contents -->',
            '<!-- wp:heading {"level":2} -->',
            '<h2>Seccion principal sin ancla</h2>',
            '<!-- /wp:heading -->',
            '<!-- wp:list -->',
            '<ul><li>Un punto operativo.</li><li>Otro punto.</li></ul>',
            '<!-- /wp:list -->',
            '<!-- wp:quote -->',
            '<blockquote class="wp-block-quote"><p>Una linea con criterio.</p></blockquote>',
            '<!-- /wp:quote -->'
          ].join('\n')
        }
      })
    )

    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'blogpost_toc_not_populated', severity: 'warning' }),
        expect.objectContaining({ code: 'blogpost_toc_headings_unanchored', severity: 'warning' })
      ])
    )
  })

  it('blocks flat paragraph-only posts', () => {
    const validation = validateGeneratedGutenbergDraft(
      buildDraft({
        draft: {
          kind: 'gutenberg_post',
          observedBlocks: ['core/paragraph'],
          postContent: [
            '<!-- wp:paragraph -->',
            '<p>Un post plano no tiene arquitectura editorial.</p>',
            '<!-- /wp:paragraph -->',
            '<!-- wp:paragraph -->',
            '<p>Otro parrafo sin TOC, headings, listas ni bloques enriquecidos.</p>',
            '<!-- /wp:paragraph -->'
          ].join('\n')
        }
      })
    )

    expect(validation.status).toBe('block')
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'blogpost_required_block_missing', severity: 'block' }),
        expect.objectContaining({ code: 'blogpost_heading_outline_too_thin', severity: 'block' }),
        expect.objectContaining({ code: 'blogpost_structured_blocks_too_thin', severity: 'block' })
      ])
    )
  })

  it('blocks heading hierarchy jumps', () => {
    const validation = validateGeneratedGutenbergDraft(
      buildDraft({
        draft: {
          kind: 'gutenberg_post',
          observedBlocks: ['core/heading', 'core/list', 'core/paragraph', 'yoast-seo/table-of-contents'],
          postContent: [
            '<!-- wp:heading {"level":2} -->',
            '<h2>TL;DR</h2>',
            '<!-- /wp:heading -->',
            '<!-- wp:paragraph -->',
            '<p>Intro suficiente para el draft.</p>',
            '<!-- /wp:paragraph -->',
            '<!-- wp:yoast-seo/table-of-contents -->',
            '<div class="wp-block-yoast-seo-table-of-contents yoast-table-of-contents"><h2>Tabla de contenidos</h2></div>',
            '<!-- /wp:yoast-seo/table-of-contents -->',
            '<!-- wp:heading {"level":2} -->',
            '<h2>Seccion principal</h2>',
            '<!-- /wp:heading -->',
            '<!-- wp:list -->',
            '<ul><li>Un punto operativo.</li></ul>',
            '<!-- /wp:list -->',
            '<!-- wp:heading {"level":4} -->',
            '<h4>Salto incorrecto</h4>',
            '<!-- /wp:heading -->',
            '<!-- wp:paragraph -->',
            '<p>Este heading salta de H2 a H4.</p>',
            '<!-- /wp:paragraph -->'
          ].join('\n')
        }
      })
    )

    expect(validation.status).toBe('block')
    expect(validation.findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'blogpost_heading_hierarchy_jump', severity: 'block' })
      ])
    )
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
