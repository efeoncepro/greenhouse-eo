import { describe, expect, it } from 'vitest'

import { authorGutenbergDraft, type GutenbergArticleBlock, type GutenbergArticleSpec } from '../article-authoring'
import type { ContentFactoryGeneratedDraft } from '../contracts'
import { EDITORIAL_CHART_BLOCK_NAME, renderEditorialChartBlock } from '../gutenberg-editorial-chart'
import { validateGeneratedGutenbergDraft } from '../gutenberg-validator'

const measure = {
  kind: 'measure' as const,
  categories: ['de las respuestas te nombran'],
  series: [{ name: 'Porcentaje', values: [27] }],
  format: 'percent' as const
}

const parseAttrs = (comment: string) => JSON.parse(comment.replace(/^<!-- wp:efeoncepro\/chart /, '').replace(/ \/-->$/, ''))

describe('renderEditorialChartBlock', () => {
  it('serializes a self-closing block with the validated chart and the figure texts', () => {
    const comment = renderEditorialChartBlock({ chart: measure, title: 'Te nombran en el 27 %', sourceLabel: 'Efeonce AEO Grader', tone: 'dark' })

    expect(comment.startsWith(`<!-- wp:${EDITORIAL_CHART_BLOCK_NAME} `)).toBe(true)
    expect(comment.endsWith(' /-->')).toBe(true)

    const attrs = parseAttrs(comment)

    expect(attrs.chart).toMatchObject({ kind: 'measure', emphasis: 0, format: 'percent' })
    expect(attrs).toMatchObject({ title: 'Te nombran en el 27 %', sourceLabel: 'Efeonce AEO Grader', tone: 'dark' })
  })

  it('refuses a chart, tone or source URL that would not render', () => {
    expect(() => renderEditorialChartBlock({ chart: { ...measure, series: [{ name: 'P', values: [140] }] } })).toThrow(
      'content_factory_article_chart_value_out_of_range'
    )
    expect(() => renderEditorialChartBlock({ chart: measure, tone: 'sepia' as never })).toThrow('content_factory_article_chart_tone_invalid')
    expect(() => renderEditorialChartBlock({ chart: measure, sourceUrl: 'http://example.com' })).toThrow(
      'content_factory_article_chart_source_url_invalid'
    )
  })
})

describe('authorGutenbergDraft + validateGeneratedGutenbergDraft · efeoncepro/chart', () => {
  const gutenberg = (draft: ContentFactoryGeneratedDraft) => {
    if (draft.draft.kind !== 'gutenberg_post') throw new Error('unexpected draft kind')

    return draft.draft
  }

  const specWith = (blocks: GutenbergArticleBlock[]): GutenbergArticleSpec => ({
    title: 'SEO y AEO: cómo aparecer en Google y en las respuestas de la IA',
    excerpt: 'Qué es AEO, en qué se diferencia del SEO y cómo se mide por motor.',
    seo: { title: 'SEO y AEO %%sep%% %%sitename%%', description: 'Qué es AEO, en qué se diferencia del SEO y cómo medirlo.' },
    intro: ['AEO es la práctica de aparecer en las respuestas de los motores de IA.'],
    sections: [
      { heading: 'Qué es AEO', level: 2, blocks: [{ kind: 'paragraph', text: 'Los motores de IA responden con pasajes.' }] },
      { heading: 'Cómo se mide', level: 2, blocks: [{ kind: 'paragraph', text: 'Se mide por motor y por pregunta.' }, ...blocks] }
    ]
  })

  it('authors the chart block and passes the validator', () => {
    const draft = authorGutenbergDraft(specWith([{ kind: 'chart', chart: measure, title: 'Te nombran en el 27 %', sourceLabel: 'Ejemplo' }]))

    expect(gutenberg(draft).postContent).toContain('<!-- wp:efeoncepro/chart {"chart":{"kind":"measure"')

    const codes = validateGeneratedGutenbergDraft(draft).findings.map(f => f.code)

    expect(codes).not.toContain('chart_data_invalid')
    expect(codes).not.toContain('chart_attrs_unsupported')
    expect(codes).not.toContain('unsupported_gutenberg_block')

    // The allowlist is what lets the block through: without it, the same draft is refused.
    const strict = validateGeneratedGutenbergDraft(draft, { allowedBlocks: ['core/paragraph', 'core/heading'] }).findings.map(f => f.code)

    expect(strict).toContain('unsupported_gutenberg_block')
  })

  it('blocks a hand-written block whose chart would print nothing, or with extra attributes', () => {
    const draft = authorGutenbergDraft(specWith([]))

    const tampered = {
      ...draft,
      draft: {
        ...gutenberg(draft),
        postContent: `${gutenberg(draft).postContent}\n<!-- wp:efeoncepro/chart {"chart":{"kind":"pie","categories":["Solo"],"series":[]},"color":"red"} /-->`
      }
    } as typeof draft

    const codes = validateGeneratedGutenbergDraft(tampered).findings.map(f => f.code)

    expect(codes).toContain('chart_data_invalid')
    expect(codes).toContain('chart_attrs_unsupported')
  })
})
