import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  tx: vi.fn(),
  clientQuery: vi.fn(),
  engagement: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  submit: vi.fn(),
  attach: vi.fn()
}))

vi.mock('@/lib/db', () => ({ withGreenhousePostgresTransaction: m.tx }))
vi.mock('../store', () => ({ getContractorEngagementById: m.engagement }))
vi.mock('../invoice-assets', () => ({ attachContractorInvoiceAsset: m.attach }))
vi.mock('./store', async importOriginal => ({
  ...(await importOriginal<object>()),
  createContractorWorkSubmission: m.create,
  updateContractorWorkSubmissionDraft: m.update,
  submitContractorWorkSubmission: m.submit
}))

import { saveOwnContractorSubmission, type SaveOwnContractorSubmissionInput } from './self-service'

const input: SaveOwnContractorSubmissionInput = {
  contractorEngagementId: 'eng-own',
  identityProfileId: 'profile-own',
  memberId: 'member-own',
  actorUserId: 'user-own',
  idempotencyKey: 'attempt-1234567890',
  submissionType: 'deliverable',
  servicePeriodStart: '2026-09-01',
  servicePeriodEnd: '2026-09-30',
  invoiceAssetId: 'invoice-own',
  evidenceAssetId: 'evidence-own',
  submit: true
}

const eng = {
  contractorEngagementId: 'eng-own',
  profileId: 'profile-own',
  status: 'active',
  rateType: 'fixed',
  rateAmount: 1000,
  currency: 'CLP',
  requiresInvoice: true,
  requiresWorkApproval: true
}

let persisted: Record<string, unknown> | null
let pending: Record<string, unknown> | null
const client = { query: m.clientQuery }

const row = () =>
  pending
    ? {
        contractor_work_submission_id: pending.contractorWorkSubmissionId,
        contractor_engagement_id: 'eng-own',
        status: pending.status,
        created_by_user_id: pending.createdByUserId ?? pending.actorUserId,
        submission_type: pending.submissionType,
        metadata_json: pending.metadata,
        rate_amount_snapshot: pending.rateAmountSnapshot,
        service_period_start: '2026-09-01',
        service_period_end: '2026-09-30',
        created_at: '2026-10-05',
        updated_at: '2026-10-05'
      }
    : null

describe('own submission transaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    persisted = null
    pending = null
    m.engagement.mockResolvedValue(eng)
    m.tx.mockImplementation(async fn => {
      pending = persisted ? { ...persisted } : null

      try {
        const result = await fn(client)

        persisted = pending

        return result
      } catch (error) {
        pending = persisted
        throw error
      }
    })
    m.clientQuery.mockImplementation(async (sql: string, args: unknown[]) => {
      if (sql.includes('SELECT * FROM greenhouse_hr.contractor_work_submissions'))
        return { rows: row() && pending?.contractorWorkSubmissionId === args[0] ? [row()] : [] }
      if (sql.includes('SELECT a.asset_role'))
        return { rows: [{ asset_role: 'invoice_pdf' }, { asset_role: 'work_evidence' }] }

      return { rows: [] }
    })
    m.create.mockImplementation(async fields => {
      pending = { ...fields, status: 'draft' }

      return pending
    })
    m.update.mockImplementation(async fields => {
      pending = { ...pending, ...fields, metadata: { ...(pending?.metadata as object), ...fields.metadataPatch } }

      return pending
    })
    m.submit.mockImplementation(async () => {
      pending = { ...pending, status: 'submitted' }

      return pending
    })
    m.attach.mockResolvedValue({ invoiceAssetId: 'support-link' })
  })

  it('derives agreement money and commits both supports before submission using one client', async () => {
    await saveOwnContractorSubmission(input)
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ grossAmount: 1000, currency: 'CLP' }), client)
    expect(m.attach.mock.calls.every(args => args[1] === client)).toBe(true)
    expect(m.attach.mock.invocationCallOrder[1]).toBeLessThan(m.submit.mock.invocationCallOrder[0])
    expect(persisted?.status).toBe('submitted')
  })

  it('rolls back a failed attachment; retry and lost-response replay create only one persisted submission', async () => {
    m.attach.mockRejectedValueOnce(new Error('scan unavailable'))
    await expect(saveOwnContractorSubmission(input)).rejects.toThrow('scan unavailable')
    expect(persisted).toBeNull()
    expect(m.submit).not.toHaveBeenCalled()
    const saved = await saveOwnContractorSubmission(input)
    const replay = await saveOwnContractorSubmission(input)

    expect(replay.submission.contractorWorkSubmissionId).toBe(saved.submission.contractorWorkSubmissionId)
    expect(m.submit).toHaveBeenCalledOnce()
    expect(replay.created).toBe(false)
  })

  it('resumes the same draft and rejects content changes on a completed attempt', async () => {
    const draft = await saveOwnContractorSubmission({ ...input, submit: false })

    const saved = await saveOwnContractorSubmission({
      ...input,
      contractorWorkSubmissionId: draft.submission.contractorWorkSubmissionId
    })

    expect(m.create).toHaveBeenCalledOnce()
    expect(saved.created).toBe(false)
    await expect(saveOwnContractorSubmission({ ...input, servicePeriodStart: '2026-10-01' })).rejects.toMatchObject({
      code: 'submission_attempt_conflict'
    })
  })

  it('does not overwrite a prorated draft prepared by HR', async () => {
    const draft = await saveOwnContractorSubmission({ ...input, submit: false })

    persisted = { ...persisted, createdByUserId: 'hr-reviewer' }
    await expect(
      saveOwnContractorSubmission({ ...input, contractorWorkSubmissionId: draft.submission.contractorWorkSubmissionId })
    ).rejects.toMatchObject({ code: 'draft_not_self_service' })
    expect(m.update).not.toHaveBeenCalled()
  })

  it('requires period snapshots on old support after changing a draft period', async () => {
    const draft = await saveOwnContractorSubmission({ ...input, submit: false })

    await saveOwnContractorSubmission({
      ...input,
      contractorWorkSubmissionId: draft.submission.contractorWorkSubmissionId,
      servicePeriodStart: '2026-09-02',
      submit: false
    })
    expect(m.update).toHaveBeenCalledWith(
      expect.objectContaining({ metadataPatch: expect.objectContaining({ selfServicePeriodChanged: true }) }),
      client
    )
  })

  it('responds on the observed record, stores the note and preserves its economic fields', async () => {
    const draft = await saveOwnContractorSubmission({ ...input, submit: false })

    persisted = { ...persisted, status: 'disputed', grossAmount: 700 }
    vi.clearAllMocks()
    await saveOwnContractorSubmission({
      ...input,
      contractorWorkSubmissionId: draft.submission.contractorWorkSubmissionId,
      title: 'Respaldo corregido',
      servicePeriodStart: null,
      servicePeriodEnd: null
    })
    expect(m.create).not.toHaveBeenCalled()
    expect(m.update).not.toHaveBeenCalled()
    expect(persisted?.grossAmount).toBe(700)
    expect(m.submit).toHaveBeenCalledWith(
      expect.objectContaining({ contractorWorkSubmissionId: draft.submission.contractorWorkSubmissionId }),
      client
    )
    expect(
      m.clientQuery.mock.calls.some(
        ([sql, args]) =>
          sql.includes('SET metadata_json') && JSON.parse(args[1]).contractorResponseNote === 'Respaldo corregido'
      )
    ).toBe(true)
  })

  it('keeps the draft rate snapshot consistent when the agreed rate changes before submission', async () => {
    m.engagement.mockResolvedValue({ ...eng, rateType: 'hourly' })

    const draft = await saveOwnContractorSubmission({
      ...input,
      submissionType: 'timesheet',
      quantity: 2,
      submit: false
    })

    persisted = { ...persisted, rateAmountSnapshot: 1000 }
    m.engagement.mockResolvedValue({ ...eng, rateType: 'hourly', rateAmount: 2000 })

    const saved = await saveOwnContractorSubmission({
      ...input,
      contractorWorkSubmissionId: draft.submission.contractorWorkSubmissionId,
      submissionType: 'timesheet',
      quantity: 2
    })

    expect(saved.submission).toMatchObject({ grossAmount: 4000, rateAmountSnapshot: 2000, currency: 'CLP' })
  })

  it.each([
    ['hourly', 4, 4000, 'hours'],
    ['daily', 3, 3000, 'days']
  ] as const)('computes %s quantities on the server', async (rateType, quantity, grossAmount, unit) => {
    m.engagement.mockResolvedValue({ ...eng, rateType })
    await saveOwnContractorSubmission({ ...input, submissionType: 'timesheet', quantity })
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ grossAmount, unit }), client)
  })

  it.each([0, -1, Infinity, NaN])('rejects invalid unit quantity %s without a write', async quantity => {
    m.engagement.mockResolvedValue({ ...eng, rateType: 'hourly' })
    await expect(
      saveOwnContractorSubmission({ ...input, submissionType: 'timesheet', quantity })
    ).rejects.toMatchObject({ code: 'submission_quantity_required' })
    expect(m.create).not.toHaveBeenCalled()
  })

  it.each([1.123456, 0.00001])('rejects a quantity %s that storage would round independently of gross', async quantity => {
    m.engagement.mockResolvedValue({ ...eng, rateType: 'hourly' })
    await expect(
      saveOwnContractorSubmission({ ...input, submissionType: 'timesheet', quantity })
    ).rejects.toMatchObject({ code: 'submission_quantity_precision' })
    expect(m.create).not.toHaveBeenCalled()
  })

  it('accepts exactly four decimal places without changing the declared quantity', async () => {
    m.engagement.mockResolvedValue({ ...eng, rateType: 'hourly' })
    await saveOwnContractorSubmission({ ...input, submissionType: 'timesheet', quantity: 1.1234 })
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ quantity: 1.1234, grossAmount: 1123.4 }), client)
  })

  it('rejects period-rate timesheets and foreign profiles', async () => {
    await expect(
      saveOwnContractorSubmission({ ...input, submissionType: 'timesheet', quantity: 40 })
    ).rejects.toMatchObject({ code: 'submission_rate_type_mismatch' })
    await expect(saveOwnContractorSubmission({ ...input, identityProfileId: 'foreign' })).rejects.toMatchObject({
      code: 'engagement_not_owned'
    })
  })

  it('requires the current invoice/evidence and rolls back a submit missing them', async () => {
    m.clientQuery.mockImplementation(async () => ({ rows: [] }))
    await expect(saveOwnContractorSubmission(input)).rejects.toMatchObject({ code: 'submission_invoice_required' })
    expect(persisted).toBeNull()
    expect(m.submit).not.toHaveBeenCalled()
  })
})
