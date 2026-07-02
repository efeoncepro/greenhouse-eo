import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1321 — Reactive consumer `growth_aeo_diagnostic_grader_run_from_submission`:
 * growth.forms.submission_accepted (/aeo-2/ efeonce-aeo-diagnostic) → remap + brand-intelligence
 * category + cost-cap → enqueue grader run + materialize lead. Cubre scope (sólo /aeo-2/ + flag),
 * idempotencia, remap-skip, cost-cap skip, categoría no resuelta skip, y el invariante PII
 * (email/nombre al lead, NUNCA al enqueue). El adapter (remap puro) corre REAL (integración).
 */

const state = {
  submission: null as Record<string, unknown> | null,
  existingLead: null as string | null,
  flagOn: true,
  abuseDecision: { allowed: true, outcome: undefined as string | undefined },
  category: null as
    | { nodeId: string; label: { es: string; en: string }; confidence: number; businessModel: string | null }
    | null,
}

const spies = {
  enqueue: vi.fn(),
  insertLead: vi.fn(),
  recordIntake: vi.fn(),
}

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

vi.mock('@/lib/growth/ai-visibility/flags', () => ({
  isAeoFormGraderIntakeEnabled: () => state.flagOn,
}))

vi.mock('@/lib/growth/ai-visibility/public-intake/abuse-guard', () => ({
  ESTIMATED_PUBLIC_RUN_COST_USD: 0.1,
  hashIdentifier: (v: string | null) => (v ? `hash:${v}` : null),
  resolveIntakeLimits: () => ({}),
  checkIntakeAbuse: async () => state.abuseDecision,
  recordIntakeEvent: async (input: unknown) => {
    spies.recordIntake(input)
  },
}))

vi.mock('@/lib/growth/ai-visibility/brand-intelligence/resolve-public-brand-category', () => ({
  resolvePublicBrandCategory: async () => state.category,
}))

const aeoSubmission = () => ({
  submission_id: 'fsub-aeo-1',
  form_id: 'fdef-efeonce-aeo-diagnostic',
  ip_hash: 'iphash-aeo-1',
  normalized_fields_json: {
    brandName: 'Grupo Berel',
    brandWebsite: 'https://grupoberel.com',
    country: 'MX',
    email: 'marketing@grupoberel.com',
    fullName: 'Ana Silva',
    firstName: 'Ana',
    lastName: 'Silva',
    companySize: '51-200',
    mainCompetitor: 'Comex',
  },
})

const resolvedCategory = () => ({
  nodeId: 'retail_paints_coatings',
  label: { es: 'Pinturas y recubrimientos', en: 'Paints & coatings' },
  confidence: 0.82,
  businessModel: 'retail_ecommerce',
})

const load = async () =>
  (await import('../growth-aeo-diagnostic-grader-run-from-submission')).growthAeoDiagnosticGraderRunProjection

beforeEach(() => {
  state.submission = aeoSubmission()
  state.existingLead = null
  state.flagOn = true
  state.abuseDecision = { allowed: true, outcome: undefined }
  state.category = resolvedCategory()
  spies.enqueue.mockClear()
  spies.insertLead.mockClear()
  spies.recordIntake.mockClear()
})

describe('TASK-1321 — growthAeoDiagnosticGraderRunProjection', () => {
  it('extractScope: sólo /aeo-2/ con flag ON; otros forms / flag OFF / sin submissionId → null', async () => {
    const projection = await load()

    expect(projection.extractScope({ formId: 'fdef-efeonce-aeo-diagnostic', submissionId: 'fsub-aeo-1' })).toEqual({
      entityType: 'growth_form_submission',
      entityId: 'fsub-aeo-1',
    })
    expect(projection.extractScope({ formId: 'fdef-ai-visibility-grader', submissionId: 'fsub-2' })).toBeNull()
    expect(projection.extractScope({ submissionId: 'fsub-3' })).toBeNull()

    state.flagOn = false
    expect(projection.extractScope({ formId: 'fdef-efeonce-aeo-diagnostic', submissionId: 'fsub-aeo-1' })).toBeNull()
  })

  it('happy: remap + categoría resuelta → encola run + lead; el EMAIL/nombre van al lead, NUNCA al enqueue', async () => {
    const projection = await load()
    const msg = await projection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-aeo-1' }, {})

    expect(spies.enqueue).toHaveBeenCalledTimes(1)
    const enqueueArg = spies.enqueue.mock.calls[0][0] as Record<string, unknown>

    // PII nunca al provider.
    expect(JSON.stringify(enqueueArg)).not.toContain('marketing@grupoberel.com')
    expect(JSON.stringify(enqueueArg)).not.toContain('Ana')
    expect(JSON.stringify(enqueueArg)).not.toContain('Silva')
    // Remap determinista aplicado + categoría resuelta pasa el gate del run.
    expect(enqueueArg.brandName).toBe('Grupo Berel')
    expect(enqueueArg.websiteUrl).toBe('https://grupoberel.com')
    expect(enqueueArg.market).toBe('MX')
    expect(enqueueArg.locale).toBe('es-MX')
    expect(enqueueArg.categoryNodeId).toBe('retail_paints_coatings')
    expect(enqueueArg.categoryConfidence).toBe(0.82)
    expect(enqueueArg.competitorsDeclared).toEqual(['Comex'])
    expect(enqueueArg.runKind).toBe('public_diagnostic')
    expect(enqueueArg.idempotencyKey).toBe('fsub-aeo-1')

    // Lead: PII + consent + linkeado al run/submission.
    expect(spies.insertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'marketing@grupoberel.com',
        firstName: 'Ana',
        lastName: 'Silva',
        consent: true,
        runId: 'grun-1',
        submissionId: 'fsub-aeo-1',
        ipHash: 'iphash-aeo-1',
      }),
    )
    // Cost accounting: intake event accepted con la estimación.
    expect(spies.recordIntake).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'accepted', estimatedCostUsd: 0.1, runId: 'grun-1' }),
    )
    expect(msg).toContain('EO-GRUN-1')
  })

  it('idempotente: lead ya materializado → no-op (no doble run/lead/costo)', async () => {
    state.existingLead = 'glead-existing'
    const projection = await load()
    const msg = await projection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-aeo-1' }, {})

    expect(spies.enqueue).not.toHaveBeenCalled()
    expect(spies.insertLead).not.toHaveBeenCalled()
    expect(msg).toContain('no-op')
  })

  it('remap skip (sin brandName, versión vieja del form) → sin run, degrada a lead comercial', async () => {
    const sub = aeoSubmission()

    delete (sub.normalized_fields_json as Record<string, unknown>).brandName
    state.submission = sub
    const projection = await load()
    const msg = await projection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-aeo-1' }, {})

    expect(spies.enqueue).not.toHaveBeenCalled()
    expect(spies.insertLead).not.toHaveBeenCalled()
    expect(msg).toContain('missing_brand_name')
  })

  it('cost-cap bloqueado → sin run + registra el evento del outcome', async () => {
    state.abuseDecision = { allowed: false, outcome: 'cost_blocked' }
    const projection = await load()
    const msg = await projection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-aeo-1' }, {})

    expect(spies.enqueue).not.toHaveBeenCalled()
    expect(spies.insertLead).not.toHaveBeenCalled()
    expect(spies.recordIntake).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'cost_blocked' }))
    expect(msg).toContain('cost-cap')
  })

  it('categoría no resuelta (brand-intelligence unknown) → sin run, degrada a lead comercial', async () => {
    state.category = null
    const projection = await load()
    const msg = await projection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-aeo-1' }, {})

    expect(spies.enqueue).not.toHaveBeenCalled()
    expect(spies.insertLead).not.toHaveBeenCalled()
    expect(msg).toContain('categoría no resuelta')
  })

  it('submission borrado tras el evento → no-op', async () => {
    state.submission = null
    const projection = await load()
    const msg = await projection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-x' }, {})

    expect(spies.enqueue).not.toHaveBeenCalled()
    expect(msg).toContain('no existe')
  })
})
