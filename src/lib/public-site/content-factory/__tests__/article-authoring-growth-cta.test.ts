import { describe, expect, it } from 'vitest'

import { authorGutenbergDraft, type GutenbergArticleBlock, type GutenbergArticleSpec } from '../article-authoring'
import type { ContentFactoryGeneratedDraft } from '../contracts'
import { validateGeneratedGutenbergDraft } from '../gutenberg-validator'

const gutenberg = (draft: ContentFactoryGeneratedDraft) => {
  if (draft.draft.kind !== 'gutenberg_post') throw new Error('unexpected draft kind')

  return draft.draft
}

const specWith = (blocks: GutenbergArticleBlock[]): GutenbergArticleSpec => ({
  title: 'SEO y AEO: cómo aparecer en Google y en las respuestas de la IA',
  excerpt: 'Qué es AEO, en qué se diferencia del SEO y cómo se mide por motor.',
  seo: {
    title: 'SEO y AEO %%sep%% %%sitename%%',
    description: 'Qué es AEO, en qué se diferencia del SEO, cómo eligen sus fuentes los motores de IA y cómo medirlo.'
  },
  intro: ['AEO es la práctica de aparecer en las respuestas de los motores de IA, no sólo en los enlaces azules.'],
  sections: [
    {
      heading: 'Qué es AEO',
      level: 2,
      blocks: [
        { kind: 'paragraph', text: 'Los motores de IA responden con pasajes de las páginas que recuperan.' },
        { kind: 'list', items: ['Se recupera por pasajes.', 'Se cita lo que responde la pregunta.'] }
      ]
    },
    { heading: 'Cómo se mide', level: 2, blocks: [{ kind: 'paragraph', text: 'Se mide por motor y por pregunta.' }, ...blocks] },
    { heading: 'Qué hacer primero', level: 2, blocks: [{ kind: 'paragraph', text: 'Empieza por las preguntas que hace tu comprador.' }] }
  ]
})

describe('authorGutenbergDraft — growthCta', () => {
  it('renders the governed self-closing block with slug, location and emphasis', () => {
    const draft = authorGutenbergDraft(
      specWith([{ kind: 'growthCta', cta: 'blog-aeo-assessment', emphasis: '¿aparece tu marca?', mark: 'aeo-assessment' }])
    )

    expect(gutenberg(draft).postContent).toContain(
      '<!-- wp:efeoncepro/growth-cta {"cta":"blog-aeo-assessment","location":"blog_article","emphasis":"¿aparece tu marca?","mark":"aeo-assessment"} /-->'
    )
    expect(validateGeneratedGutenbergDraft(draft).findings.filter(f => f.code.startsWith('growth_cta'))).toEqual([])
  })

  it('emits the light tone when the spec asks for it', () => {
    const draft = authorGutenbergDraft(specWith([{ kind: 'growthCta', cta: 'blog-aeo-assessment', tone: 'light', mark: 'aeo-assessment' }]))

    expect(gutenberg(draft).postContent).toContain('"tone":"light","mark":"aeo-assessment"')
  })

  it('rejects an invalid slug before it reaches a draft', () => {
    expect(() => authorGutenbergDraft(specWith([{ kind: 'growthCta', cta: 'Blog AEO' }]))).toThrow(
      'content_factory_article_growth_cta_slug_invalid'
    )
  })

  it('blocks a hand-written Growth CTA with copy inside or extra attributes', () => {
    const draft = authorGutenbergDraft(specWith([]))

    const tampered = {
      ...draft,
      draft: {
        ...gutenberg(draft),
        postContent: `${gutenberg(draft).postContent}\n<!-- wp:efeoncepro/growth-cta {"cta":"blog-aeo-assessment","headline":"Otro texto"} -->\n<p>x</p>\n<!-- /wp:efeoncepro/growth-cta -->`
      }
    } as typeof draft

    const codes = validateGeneratedGutenbergDraft(tampered).findings.map(f => f.code)

    expect(codes).toContain('growth_cta_not_self_closing')
    expect(codes).toContain('growth_cta_attrs_unsupported')
  })
})
