import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = {
  submission: null as Record<string, unknown> | null,
  definition: { form_kind: 'application' } as Record<string, unknown> | null,
  version: { consent_policy_version: 'careers-v1' } as Record<string, unknown> | null,
  submitOutcome: 'accepted' as 'accepted' | 'not_open'
}

const spies = {
  submit: vi.fn()
}

vi.mock('@/lib/growth/forms/store', () => ({
  getSubmissionById: async () => state.submission,
  getFormDefinitionById: async () => state.definition,
  getFormVersionById: async () => state.version
}))

vi.mock('@/lib/hiring/public-careers/submit-application', () => ({
  submitPublicHiringApplication: async (input: unknown, options: unknown) => {
    spies.submit(input, options)

    return state.submitOutcome === 'accepted'
      ? { outcome: 'accepted', applicationPublicId: 'EO-APP-1', applicationId: 'happ-1' }
      : { outcome: 'not_open', applicationPublicId: null, applicationId: null }
  }
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn()
}))

const applicationSubmission = () => ({
  submission_id: 'fsub-app-1',
  form_id: 'fdef-application',
  form_version_id: 'fver-application',
  normalized_fields_json: {
    openingPublicId: 'EO-OPN-1',
    firstName: 'Ana',
    lastName: 'Silva',
    email: 'ANA@EMPRESA.COM',
    phone: '+56912345678',
    portfolioUrl: 'https://ana.example.com',
    linkedinUrl: 'https://linkedin.com/in/ana',
    availability: 'Inmediata',
    message: 'Me interesa el rol.',
    cvFile: {
      kind: 'uploaded_file',
      fieldKey: 'cvFile',
      assetId: 'asset-cv-1',
      status: 'clean',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      storageContext: 'hiring_application_cv_draft',
      scanId: 'ascan-1',
      scanner: 'greenhouse-structural-pdf',
      advisoryFindingCodes: ['pdf_javascript_reference']
    }
  }
})

const load = async () =>
  (await import('../growth-hiring-application-from-submission')).growthHiringApplicationFromSubmissionProjection

beforeEach(() => {
  state.submission = applicationSubmission()
  state.definition = { form_kind: 'application' }
  state.version = { consent_policy_version: 'careers-v1' }
  state.submitOutcome = 'accepted'
  spies.submit.mockClear()
})

describe('TASK-1372 — growthHiringApplicationFromSubmissionProjection', () => {
  it('extractScope scopes any accepted Growth Forms submission by submissionId', async () => {
    const projection = await load()

    expect(projection.extractScope({ submissionId: 'fsub-app-1', formId: 'any' })).toEqual({
      entityType: 'growth_form_submission',
      entityId: 'fsub-app-1'
    })
    expect(projection.extractScope({ formId: 'any' })).toBeNull()
  })

  it('materializa application ATS con CV privado ya escaneado, sin filename ni URL pública', async () => {
    const projection = await load()
    const msg = await projection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-app-1' }, {})

    expect(spies.submit).toHaveBeenCalledTimes(1)

    const [input, options] = spies.submit.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>]

    expect(input).toMatchObject({
      openingPublicId: 'EO-OPN-1',
      firstName: 'Ana',
      lastName: 'Silva',
      fullName: 'Ana Silva',
      email: 'ana@empresa.com',
      consentPolicyVersion: 'careers-v1'
    })
    expect(options.cvAsset).toEqual({
      assetId: 'asset-cv-1',
      status: 'clean',
      scanId: 'ascan-1',
      scanner: 'greenhouse-structural-pdf',
      advisoryFindingCodes: ['pdf_javascript_reference']
    })
    expect(JSON.stringify(options)).not.toContain('cv.pdf')
    expect(JSON.stringify(options).toLowerCase()).not.toContain('https://')
    expect(msg).toContain('happ-1')
  })

  it('no-op para submissions cuyo form no es application', async () => {
    state.definition = { form_kind: 'lead_magnet' }
    const projection = await load()
    const msg = await projection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-app-1' }, {})

    expect(spies.submit).not.toHaveBeenCalled()
    expect(msg).toContain('no es application form')
  })

  it('skip terminal si el opening público ya no está abierto', async () => {
    state.submitOutcome = 'not_open'
    const projection = await load()
    const msg = await projection.refresh({ entityType: 'growth_form_submission', entityId: 'fsub-app-1' }, {})

    expect(spies.submit).toHaveBeenCalledTimes(1)
    expect(msg).toContain('opening no publicado')
  })
})
