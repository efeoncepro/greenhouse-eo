import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1251 Slice 2b — Reactive consumer `growth_grader_run_from_submission`:
 * growth.forms.submission_accepted (grader-form) → enqueue run + materialize lead.
 * Cubre el scope (sólo grader-form), idempotencia (lead ya existe → no-op), el invariante
 * PII (email al lead, NO al enqueue) y el guard de contrato (campos faltantes → throw).
 */

const state = {
  submission: null as Record<string, unknown> | null,
  existingLead: null as string | null,
  category: null as
    | { nodeId: string; label: { es: string; en: string }; confidence: number; businessModel: string | null }
    | null,
}

const spies = {
  enqueue: vi.fn(),
  insertLead: vi.fn(),
  resolveCategory: vi.fn(),
}

vi.mock('@/lib/growth/ai-visibility/public-intake/forms-engine-binding', () => ({
  GRADER_FORM_ID: 'fdef-ai-visibility-grader',
}))

vi.mock('@/lib/growth/forms/store', () => ({
  getSubmissionById: async () => state.submission,
}))

vi.mock('@/lib/growth/ai-visibility/public-intake/store', () => ({
  findGraderLeadBySubmissionId: async () => state.existingLead,
  insertGraderLead: async (input: unknown) => {
    spies.insertLead(input)

    return 'glead-1'
  },
}))

vi.mock('@/lib/growth/ai-visibility/commands', () => ({
  enqueueGraderDiagnostic: async (input: unknown) => {
    spies.enqueue(input)

    return { run: { runId: 'grun-1', publicId: 'EO-GRUN-1', profileId: 'gprf-1' }, idempotentHit: false }
  },
}))

vi.mock('@/lib/growth/ai-visibility/brand-intelligence/resolve-public-brand-category', () => ({
  resolvePublicBrandCategory: async (input: unknown) => {
    spies.resolveCategory(input)

    return state.category
  },
}))

const graderSubmission = () => ({
  submission_id: 'fsub-1',
  form_id: 'fdef-ai-visibility-grader',
  ip_hash: 'iphash-1',
  normalized_fields_json: {
    brandName: 'Efeonce',
    websiteUrl: 'https://efeoncepro.com',
    market: 'CL',
    locale: 'es-CL',
    category: 'Agencia o consultoria de crecimiento',
    competitorsDeclared: ['Acme'],
    email: 'prospecto@empresa.com',
    firstName: 'Ana',
    lastName: 'Pérez',
    industry: 'marketing',
    persona: null,
    companySize: null,
    mainChallenge: null,
  },
})

beforeEach(() => {
  state.submission = graderSubmission()
  state.existingLead = null
  state.category = null
  spies.enqueue.mockClear()
  spies.insertLead.mockClear()
  spies.resolveCategory.mockClear()
})

describe('TASK-1251 — growthGraderRunFromSubmissionProjection', () => {
  it('extractScope: sólo el grader-form; otros forms → null (no-op)', async () => {
    const { growthGraderRunFromSubmissionProjection } = await import('../../../sync/projections/growth-grader-run-from-submission')

    expect(growthGraderRunFromSubmissionProjection.extractScope({ formId: 'fdef-ai-visibility-grader', submissionId: 'fsub-1' }))
      .toEqual({ entityType: 'growth_form_submission', entityId: 'fsub-1' })
    expect(growthGraderRunFromSubmissionProjection.extractScope({ formId: 'fdef-otro-form', submissionId: 'fsub-2' })).toBeNull()
    expect(growthGraderRunFromSubmissionProjection.extractScope({ submissionId: 'fsub-3' })).toBeNull()
  })

  it('happy: encola run + materializa lead linkeado; el EMAIL va al lead, NUNCA al enqueue', async () => {
    const { growthGraderRunFromSubmissionProjection } = await import('../../../sync/projections/growth-grader-run-from-submission')
    const msg = await growthGraderRunFromSubmissionProjection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-1' }, {})

    expect(spies.enqueue).toHaveBeenCalledTimes(1)
    const enqueueArg = spies.enqueue.mock.calls[0][0] as Record<string, unknown>

    expect(JSON.stringify(enqueueArg)).not.toContain('prospecto@empresa.com') // PII nunca al provider
    // TASK-1257 — nombre/apellido (PII) tampoco al enqueue del run.
    expect(JSON.stringify(enqueueArg)).not.toContain('Ana')
    expect(JSON.stringify(enqueueArg)).not.toContain('Pérez')
    expect(enqueueArg.runKind).toBe('public_diagnostic')
    expect(enqueueArg.mode).toBe('light')
    expect(enqueueArg.idempotencyKey).toBe('fsub-1')
    expect(enqueueArg.category).toBe('Growth Operating System')
    expect(enqueueArg.categoryNodeId).toBe('category:growth_operating_system')
    expect(enqueueArg.categoryConfidence).toBeGreaterThanOrEqual(0.5)
    expect(enqueueArg.businessModel).toBe('b2b_service_provider')
    expect(spies.resolveCategory).not.toHaveBeenCalled()

    expect(spies.insertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'prospecto@empresa.com',
        firstName: 'Ana',
        lastName: 'Pérez',
        consent: true,
        runId: 'grun-1',
        submissionId: 'fsub-1',
        ipHash: 'iphash-1',
      }),
    )
    expect(msg).toContain('EO-GRUN-1')
  })

  it('idempotente: lead ya materializado → no-op (no doble run/lead)', async () => {
    state.existingLead = 'glead-existing'
    const { growthGraderRunFromSubmissionProjection } = await import('../../../sync/projections/growth-grader-run-from-submission')
    const msg = await growthGraderRunFromSubmissionProjection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-1' }, {})

    expect(spies.enqueue).not.toHaveBeenCalled()
    expect(spies.insertLead).not.toHaveBeenCalled()
    expect(msg).toContain('no-op')
  })

  it('submission borrado tras el evento → no-op', async () => {
    state.submission = null
    const { growthGraderRunFromSubmissionProjection } = await import('../../../sync/projections/growth-grader-run-from-submission')
    const msg = await growthGraderRunFromSubmissionProjection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-x' }, {})

    expect(spies.enqueue).not.toHaveBeenCalled()
    expect(msg).toContain('no existe')
  })

  it('contrato roto (sin email) → throw (retry/dead-letter, no lead corrupto)', async () => {
    state.submission = { ...graderSubmission(), normalized_fields_json: { brandName: 'X', market: 'CL', locale: 'es-CL', category: 'y' } }
    const { growthGraderRunFromSubmissionProjection } = await import('../../../sync/projections/growth-grader-run-from-submission')

    await expect(
      growthGraderRunFromSubmissionProjection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-1' }, {}),
    ).rejects.toThrow()
    expect(spies.insertLead).not.toHaveBeenCalled()
  })

  it('fallback: si la categoría declarada no mapea, usa brand-intelligence grounded antes del enqueue', async () => {
    state.submission = {
      ...graderSubmission(),
      normalized_fields_json: {
        ...(graderSubmission().normalized_fields_json as Record<string, unknown>),
        category: 'Otra categoria',
        industry: 'Otra industria',
      },
    }
    state.category = {
      nodeId: 'category:digital_agency',
      label: { es: 'Agencia digital', en: 'Digital agency' },
      confidence: 0.86,
      businessModel: 'b2b_service_provider',
    }

    const { growthGraderRunFromSubmissionProjection } = await import('../../../sync/projections/growth-grader-run-from-submission')

    await growthGraderRunFromSubmissionProjection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-1' }, {})

    expect(spies.resolveCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        brandName: 'Efeonce',
        websiteUrl: 'https://efeoncepro.com',
        hubspotIndustry: 'Otra industria',
        telemetry: { submissionId: 'fsub-1' },
      }),
    )
    expect(spies.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'Agencia digital',
        categoryNodeId: 'category:digital_agency',
        categoryConfidence: 0.86,
      }),
    )
  })
})
