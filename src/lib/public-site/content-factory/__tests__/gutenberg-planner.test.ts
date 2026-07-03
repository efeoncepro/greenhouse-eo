import { describe, expect, it } from 'vitest'

import type { ContentFactoryBrief } from '../contracts'
import { planGeneratedGutenbergPostDraft, slugifyPublicSiteDraft } from '../gutenberg-planner'
import { validateGeneratedGutenbergDraft } from '../gutenberg-validator'

const brief: ContentFactoryBrief = {
  contractVersion: 'contentFactoryBrief.v1',
  intent: 'create',
  lane: 'post_draft_gutenberg',
  objective: 'Como usar AI para acelerar operaciones comerciales sin perder gobierno',
  audience: 'fundadores y equipos comerciales B2B',
  offer: 'diagnostico operativo de AI y RevOps',
  serviceKey: 'ai-revops',
  campaignId: 'content-factory-smoke',
  hubspotCampaignId: 'hs-content-factory-smoke',
  primaryKeyword: 'AI para operaciones comerciales',
  secondaryKeywords: ['RevOps', 'automatizacion comercial', 'gobierno de AI'],
  tone: 'efeonce_expert',
  locale: 'es-CL',
  cta: {
    kind: 'hubspot_meeting',
    target: 'Agendar una evaluacion operacional con Efeonce'
  }
}

describe('planGeneratedGutenbergPostDraft', () => {
  it('plans a valid generated Gutenberg draft from a brief', () => {
    const draft = planGeneratedGutenbergPostDraft(brief)
    const validation = validateGeneratedGutenbergDraft(draft)

    expect(draft).toMatchObject({
      contractVersion: 'contentFactoryGeneratedDraft.v1',
      intent: 'create',
      lane: 'post_draft_gutenberg',
      slug: 'ai-para-operaciones-comerciales',
      draft: {
        kind: 'gutenberg_post',
        observedBlocks: [
          'core/heading',
          'core/list',
          'core/paragraph',
          'core/quote',
          'core/separator',
          'yoast-seo/table-of-contents'
        ]
      }
    })
    expect(validation.status).toBe('pass')

    // The generated draft must ship a functional TOC: body headings carry Yoast
    // anchors and the TOC links resolve to them (regression guard for the 250748 defect).
    const postContent = draft.draft.kind === 'gutenberg_post' ? draft.draft.postContent : ''

    expect(postContent).toContain('<h2 class="wp-block-heading" id="h-')
    expect(postContent).toContain('data-level="2"')
    expect(validation.findings.some(finding => finding.code === 'blogpost_toc_not_populated')).toBe(false)
    expect(validation.findings.some(finding => finding.code === 'blogpost_toc_headings_unanchored')).toBe(false)
  })

  it('normalizes accents and punctuation in slugs', () => {
    expect(slugifyPublicSiteDraft('Operacion comercial con IA, datos y aprobacion humana')).toBe(
      'operacion-comercial-con-ia-datos-y-aprobacion-humana'
    )
  })

  it('rejects non-Gutenberg lanes', () => {
    expect(() =>
      planGeneratedGutenbergPostDraft({
        ...brief,
        lane: 'landing_draft_elementor'
      })
    ).toThrow('content_factory_brief_lane_not_gutenberg_post')
  })
})
