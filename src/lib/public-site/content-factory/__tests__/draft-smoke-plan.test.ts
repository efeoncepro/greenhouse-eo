import { describe, expect, it } from 'vitest'

import type { ContentFactoryGeneratedDraft } from '../contracts'
import { prepareGutenbergDraftSmokePlan } from '../draft-smoke-plan'

const validDraft: ContentFactoryGeneratedDraft = {
  contractVersion: 'contentFactoryGeneratedDraft.v1',
  intent: 'create',
  lane: 'post_draft_gutenberg',
  title: 'AI para operaciones comerciales',
  slug: 'ai-para-operaciones-comerciales',
  excerpt: 'Una guia practica para equipos comerciales.',
  seo: {
    title: 'AI para operaciones comerciales',
    description: 'Guia practica para usar AI en operaciones comerciales con datos y gobierno.',
    indexPolicy: 'index'
  },
  draft: {
    kind: 'gutenberg_post',
    observedBlocks: ['core/heading', 'core/paragraph'],
    postContent: [
      '<!-- wp:heading {"level":2} -->',
      '<h2>AI para operaciones comerciales</h2>',
      '<!-- /wp:heading -->',
      '<!-- wp:paragraph -->',
      '<p>La AI funciona mejor cuando se conecta a datos confiables y procesos claros.</p>',
      '<!-- /wp:paragraph -->',
      '<!-- wp:paragraph -->',
      '<p>Este borrador se mantiene como artifact local hasta que exista aprobacion de smoke.</p>',
      '<!-- /wp:paragraph -->',
      '<!-- wp:paragraph -->',
      '<p>La revision humana confirma tono, evidencia, CTA y seguridad antes de cualquier write.</p>',
      '<!-- /wp:paragraph -->',
      '<!-- wp:paragraph -->',
      '<p>El artifact tambien deja claro que el smoke futuro debe crear solo un borrador privado, identificado por manifest id, con rollback limitado a ese objeto Greenhouse-owned.</p>',
      '<!-- /wp:paragraph -->'
    ].join('\n')
  }
}

describe('prepareGutenbergDraftSmokePlan', () => {
  it('prepares a redacted signed draft/private smoke plan without sending writes', () => {
    const plan = prepareGutenbergDraftSmokePlan(validDraft, {
      generatedAt: '2026-06-14T19:00:00.000Z',
      manifestId: 'greenhouse-smoke-ai-revops',
      status: 'private',
      actor: 'codex-test',
      environment: 'test',
      secret: 'test-secret',
      timestamp: 1780000000,
      requestId: 'gh-test-smoke-plan'
    })

    expect(plan).toMatchObject({
      contractVersion: 'contentFactoryDraftSmokePlan.v1',
      mode: 'dry_run',
      sendsWordPressWrite: false,
      validation: {
        status: 'pass'
      },
      bridgeRequest: {
        method: 'POST',
        route: '/greenhouse-wp-bridge/v1/drafts',
        postType: 'post',
        status: 'private',
        greenhouseManifestId: 'greenhouse-smoke-ai-revops'
      },
      rollback: {
        strategy: 'trash_smoke_draft_by_manifest_id'
      }
    })
    expect(plan.bridgeRequest.signedHeaders['X-Greenhouse-Signature']).toContain('...redacted')
    expect(plan.bridgeRequest.canonicalRequestPreview).toContain('/greenhouse-wp-bridge/v1/drafts')
    expect(plan.rolloutPreconditions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'bridge_writes_enabled_window', status: 'pending' }),
        expect.objectContaining({ code: 'draft_private_only', status: 'satisfied' })
      ])
    )
  })

  it('blocks smoke plans for invalid drafts', () => {
    expect(() =>
      prepareGutenbergDraftSmokePlan({
        ...validDraft,
        slug: 'Invalid Slug',
        draft: {
          kind: 'gutenberg_post',
          observedBlocks: ['core/html'],
          postContent: '<!-- wp:html --><script>alert("x")</script><!-- /wp:html -->'
        }
      })
    ).toThrow('content_factory_smoke_plan_validation_blocked')
  })
})
