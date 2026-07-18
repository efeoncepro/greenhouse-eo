import { describe, expect, it } from 'vitest'

import { compileCtaVersion } from '../render-contract'
import type { CtaPublishedCandidateRow, CtaSurfaceBindingRow } from '../store'

const candidate = (overrides: Partial<CtaPublishedCandidateRow> = {}): CtaPublishedCandidateRow => ({
  cta_version_id: 'cver-1',
  cta_id: 'cdef-1',
  version: 1,
  status: 'published',
  locale: 'es-CL',
  placement: 'embedded',
  style_variant: null,
  copy_refs_json: {},
  content_json: { headline: '¿Cómo ve la IA a tu marca?', ctaLabel: 'Hazte el diagnóstico' },
  visual_asset_ref: null,
  action_policy_json: { kind: 'open_growth_form', formRef: 'ai-visibility-grader' },
  targeting_policy_json: { routes: ['/**'], excludeRoutes: [] },
  suppression_policy_json: {},
  priority_policy_json: { score: 100 },
  analytics_policy_json: { internalNote: 'NUNCA al browser' },
  experiment_policy_json: {},
  published_at: new Date('2026-07-18T00:00:00Z'),
  created_at: new Date('2026-07-17T00:00:00Z'),
  slug: 'ai-visibility-followup',
  campaign_slug: 'aeo-2026',
  default_locale: 'es-CL',
  ...overrides,
})

const surface: CtaSurfaceBindingRow = {
  surface_id: 'csur-1',
  surface_kind: 'wordpress',
  surface_name: 'Sitio público',
  origin_allowlist_json: ['https://efeoncepro.com'],
  allowed_cta_slugs_json: [],
  embed_key_id: 'ehk-x',
  embed_key_hash: 'hash',
  renderer_channel: 'stable',
  status: 'active',
  created_at: new Date(),
  updated_at: new Date(),
}

const action = { kind: 'open_growth_form' as const, formSlug: 'ai-visibility-grader', formKey: 'uuid-key' }

describe('compileCtaVersion', () => {
  it('compila un render contract browser-safe válido', () => {
    const { renderContract, blockingReasons } = compileCtaVersion(candidate(), surface, action)

    expect(blockingReasons).toEqual([])
    expect(renderContract).not.toBeNull()
    expect(renderContract?.contractVersion).toBe('greenhouse-growth-cta-popup.v1')
    expect(renderContract?.cta.slug).toBe('ai-visibility-followup')
    expect(renderContract?.action.formSlug).toBe('ai-visibility-grader')
    expect(renderContract?.interruptive).toBe(false)
    expect(renderContract?.surfacePolicy.allowedOrigins).toEqual(['https://efeoncepro.com'])
  })

  it('NO-LEAK: el contrato jamás expone policies server-only (targeting/priority/suppression/analytics/experiment)', () => {
    const { renderContract } = compileCtaVersion(candidate(), surface, action)

    const keys = Object.keys(renderContract ?? {})

    for (const forbidden of ['targeting', 'targetingPolicy', 'priority', 'priorityPolicy', 'suppression', 'analytics', 'experiment', 'notes']) {
      expect(keys).not.toContain(forbidden)
    }

    // Ni siquiera serializado: la nota interna de analytics no puede aparecer en el JSON.
    expect(JSON.stringify(renderContract)).not.toContain('NUNCA al browser')
  })

  it('NO-DUPLICACIÓN (arch §12): la acción lleva SOLO refs del form, nunca field schema/validación/consent', () => {
    const { renderContract } = compileCtaVersion(candidate(), surface, action)

    expect(Object.keys(renderContract?.action ?? {}).sort()).toEqual(['formKey', 'formSlug', 'kind'])
  })

  it('clasifica placements interruptivos', () => {
    const { renderContract } = compileCtaVersion(candidate({ placement: 'popup_modal' }), surface, action)

    expect(renderContract?.interruptive).toBe(true)
  })

  it('contenido inválido bloquea (sin headline no hay prompt)', () => {
    const { renderContract, blockingReasons } = compileCtaVersion(
      candidate({ content_json: { ctaLabel: 'Solo botón' } }),
      surface,
      action,
    )

    expect(renderContract).toBeNull()
    expect(blockingReasons).toContain('content_invalid')
  })
})
