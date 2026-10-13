import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ query: vi.fn(), tx: vi.fn(), clientQuery: vi.fn(), asset: vi.fn(), attach: vi.fn() }))

vi.mock('@/lib/db', () => ({ query: m.query, withGreenhousePostgresTransaction: m.tx }))
vi.mock('@/lib/storage/greenhouse-assets', () => ({ getAssetById: m.asset, attachAssetToAggregate: m.attach }))
import { attachContractorInvoiceAsset } from './invoice-assets'

const input = {
  contractorEngagementId: 'own-eng',
  contractorWorkSubmissionId: 'own-sub',
  assetId: 'own-asset',
  assetRole: 'work_evidence' as const,
  artifactKind: 'evidence' as const,
  source: 'contractor_upload' as const,
  ownerMemberId: 'own-member',
  actorUserId: 'own-user'
}

let link: Record<string, unknown> | null
let subEng: string
let inserts: number

describe('invoice attachment ownership and replay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    link = null
    subEng = 'own-eng'
    inserts = 0
    m.query.mockResolvedValue([{ contractor_engagement_id: 'own-eng' }])
    m.tx.mockImplementation(fn => fn({ query: m.clientQuery }))
    m.asset.mockImplementation(async () => ({
      assetId: 'own-asset',
      ownerMemberId: 'own-member',
      status: link ? 'attached' : 'pending',
      ownerAggregateType: 'contractor_work_evidence_draft'
    }))
    m.clientQuery.mockImplementation(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM greenhouse_hr.contractor_work_submissions'))
        return {
          rows: [
            { contractor_engagement_id: subEng, service_period_start: '2026-09-01', service_period_end: '2026-09-30' }
          ]
        }
      if (sql.includes('SELECT') && sql.includes('contractor_invoice_assets')) return { rows: link ? [link] : [] }

      if (sql.includes('INSERT INTO greenhouse_hr.contractor_invoice_assets')) {
        inserts++
        link = {
          invoice_asset_id: 'link',
          contractor_engagement_id: params[1],
          contractor_invoice_id: params[2],
          contractor_work_submission_id: params[3],
          asset_id: params[4],
          asset_role: params[5],
          metadata_json: JSON.parse(params[10] as string),
          created_at: '2026-10-05'
        }

        return { rows: [link] }
      }

      return { rows: [] }
    })
  })
  it('rejects a foreign-owner asset before linking it', async () => {
    m.asset.mockResolvedValue({
      status: 'pending',
      ownerMemberId: 'foreign',
      ownerAggregateType: 'contractor_work_evidence_draft'
    })
    await expect(attachContractorInvoiceAsset(input)).rejects.toMatchObject({ code: 'asset_not_owned' })
    expect(m.attach).not.toHaveBeenCalled()
    expect(inserts).toBe(0)
  })
  it('rejects a submission from another engagement', async () => {
    subEng = 'foreign-eng'
    await expect(attachContractorInvoiceAsset(input)).rejects.toMatchObject({ code: 'submission_not_owned' })
    expect(inserts).toBe(0)
  })
  it('replays the same link and captures its period without another insert/attach', async () => {
    const first = await attachContractorInvoiceAsset(input)

    expect(await attachContractorInvoiceAsset(input)).toEqual(first)
    expect(first.metadata).toMatchObject({ servicePeriodStart: '2026-09-01', servicePeriodEnd: '2026-09-30' })
    expect(inserts).toBe(1)
    expect(m.attach).toHaveBeenCalledOnce()
  })
  it('does not reuse the same asset for another period/submission', async () => {
    await attachContractorInvoiceAsset(input)
    await expect(
      attachContractorInvoiceAsset({ ...input, contractorWorkSubmissionId: 'other-period-sub' })
    ).rejects.toMatchObject({ code: 'asset_already_linked' })
    expect(inserts).toBe(1)
  })
  it('preserves Finance on-behalf provider invoice attachment and identical replay', async () => {
    m.asset.mockImplementation(async () => ({
      assetId: 'own-asset',
      ownerMemberId: null,
      status: link ? 'attached' : 'pending',
      ownerAggregateType: 'provider_invoice_draft'
    }))

    const providerInput = {
      ...input,
      ownerMemberId: undefined,
      contractorWorkSubmissionId: null,
      contractorInvoiceId: 'own-invoice',
      assetRole: 'invoice_pdf' as const,
      artifactKind: 'human_readable' as const,
      source: 'finance_upload_on_behalf' as const
    }

    const first = await attachContractorInvoiceAsset(providerInput)

    expect(first.contractorInvoiceId).toBe('own-invoice')
    expect(await attachContractorInvoiceAsset(providerInput)).toEqual(first)
    expect(inserts).toBe(1)
    expect(m.attach).toHaveBeenCalledOnce()
  })
  it('does not report success for reusing an invoice document against a different invoice', async () => {
    const firstInput = { ...input, contractorInvoiceId: 'first-invoice' }

    await attachContractorInvoiceAsset(firstInput)
    await expect(
      attachContractorInvoiceAsset({ ...firstInput, contractorInvoiceId: 'second-invoice' })
    ).rejects.toMatchObject({ code: 'asset_already_linked' })
    expect(inserts).toBe(1)
  })
})
