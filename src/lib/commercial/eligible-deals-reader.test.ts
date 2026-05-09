import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the db module BEFORE importing the reader (server-only enforcement
// is bypassed in tests via the canonical test-only stub pattern).
vi.mock('server-only', () => ({}))
vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

import { query } from '@/lib/db'
import {
  __clearEligibleDealsCache,
  getEligibleDealForRevalidation,
  listEligibleDealsForSampleSprint
} from './eligible-deals-reader'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>

const dealRow = (overrides: Record<string, unknown> = {}) => ({
  hubspot_deal_id: 'hs-deal-1',
  deal_name: 'Sample Sprint Deal',
  dealstage: 'qualifiedtobuy',
  dealstage_label: 'Qualified to Buy',
  pipeline_name: 'Default',
  amount: '12000',
  amount_clp: '12000000',
  currency: 'CLP',
  close_date: null,
  is_closed: false,
  is_deleted: false,
  organization_id: 'org-1',
  space_id: 'space-1',
  client_id: 'client-1',
  ...overrides
})

const companyRow = (overrides: Record<string, unknown> = {}) => ({
  company_record_id: 'crm-co-1',
  client_id: 'client-1',
  hubspot_company_id: '30000001',
  company_name: 'Acme Corp',
  legal_name: 'Acme S.A.',
  ...overrides
})

const contactRow = (overrides: Record<string, unknown> = {}) => ({
  contact_record_id: 'crm-c-1',
  company_record_id: 'crm-co-1',
  hubspot_contact_id: '40000001',
  display_name: 'Jane Doe',
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@acme.example',
  job_title: 'Marketing Director',
  ...overrides
})

describe('eligible-deals-reader', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
    __clearEligibleDealsCache()
  })

  describe('listEligibleDealsForSampleSprint', () => {
    it('returns eligible deals with company + contacts when complete', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow()]) // deals
        .mockResolvedValueOnce([companyRow()]) // companies
        .mockResolvedValueOnce([contactRow()]) // contacts

      const result = await listEligibleDealsForSampleSprint({})

      expect(result).toHaveLength(1)
      expect(result[0].isEligible).toBe(true)
      expect(result[0].ineligibilityReasons).toEqual([])
      expect(result[0].company?.hubspotCompanyId).toBe('30000001')
      expect(result[0].contacts).toHaveLength(1)
      expect(result[0].contacts[0].displayName).toBe('Jane Doe')
    })

    it('marks deal ineligible when company is missing', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow()]) // deals
        .mockResolvedValueOnce([]) // no companies
      // No contacts query because no companies.

      const result = await listEligibleDealsForSampleSprint({})

      expect(result).toHaveLength(1)
      expect(result[0].isEligible).toBe(false)
      expect(result[0].ineligibilityReasons).toContain('missing_company')
      expect(result[0].ineligibilityReasons).toContain('missing_contacts')
    })

    it('marks deal ineligible when company exists but contacts are missing', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow()])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([]) // empty contacts

      const result = await listEligibleDealsForSampleSprint({})

      expect(result[0].isEligible).toBe(false)
      expect(result[0].ineligibilityReasons).toEqual(['missing_contacts'])
      expect(result[0].company).not.toBeNull()
    })

    it('caches results when cacheKey is provided (TTL 60s)', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow()])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([contactRow()])

      const first = await listEligibleDealsForSampleSprint({ cacheKey: 'subject-1' })

      expect(first).toHaveLength(1)
      expect(mockedQuery).toHaveBeenCalledTimes(3)

      // Second call with same cacheKey + same params should hit cache.
      const second = await listEligibleDealsForSampleSprint({ cacheKey: 'subject-1' })

      expect(second).toEqual(first)
      expect(mockedQuery).toHaveBeenCalledTimes(3) // no new queries
    })

    it('bypasses cache when cacheKey is omitted', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow()])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([contactRow()])

      await listEligibleDealsForSampleSprint({})
      expect(mockedQuery).toHaveBeenCalledTimes(3)

      mockedQuery.mockReset()
      mockedQuery
        .mockResolvedValueOnce([dealRow()])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([contactRow()])

      await listEligibleDealsForSampleSprint({})
      expect(mockedQuery).toHaveBeenCalledTimes(3) // re-queried, no cache
    })

    it('builds display name from first/last name when display_name is null', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow()])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([
          contactRow({ display_name: null, first_name: 'Carlos', last_name: 'Pérez' })
        ])

      const result = await listEligibleDealsForSampleSprint({})

      expect(result[0].contacts[0].displayName).toBe('Carlos Pérez')
    })

    it('falls back to email when display_name and first/last are null', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow()])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([
          contactRow({
            display_name: null,
            first_name: null,
            last_name: null,
            email: 'fallback@acme.example'
          })
        ])

      const result = await listEligibleDealsForSampleSprint({})

      expect(result[0].contacts[0].displayName).toBe('fallback@acme.example')
    })

    it('returns empty array when no deals match filters', async () => {
      mockedQuery.mockResolvedValueOnce([])

      const result = await listEligibleDealsForSampleSprint({})

      expect(result).toEqual([])
      expect(mockedQuery).toHaveBeenCalledTimes(1)
    })
  })

  describe('getEligibleDealForRevalidation', () => {
    it('returns the deal with eligibility computed when deal exists', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow()]) // deal lookup
        .mockResolvedValueOnce([companyRow()]) // company
        .mockResolvedValueOnce([contactRow()]) // contacts

      const result = await getEligibleDealForRevalidation('hs-deal-1')

      expect(result).not.toBeNull()
      expect(result?.hubspotDealId).toBe('hs-deal-1')
      expect(result?.isEligible).toBe(true)
    })

    it('returns null when deal does not exist locally', async () => {
      mockedQuery.mockResolvedValueOnce([])

      const result = await getEligibleDealForRevalidation('hs-missing')

      expect(result).toBeNull()
    })

    it('returns deal marked closed when is_closed=true (caller rejects)', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow({ is_closed: true })])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([contactRow()])

      const result = await getEligibleDealForRevalidation('hs-deal-1')

      expect(result?.isEligible).toBe(false)
      expect(result?.ineligibilityReasons).toContain('closed')
    })

    it('NEVER consults cache — always reads fresh', async () => {
      // First populate cache via list call.
      mockedQuery
        .mockResolvedValueOnce([dealRow()])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([contactRow()])

      await listEligibleDealsForSampleSprint({ cacheKey: 'subject-1' })

      // Now revalidation must still hit PG.
      mockedQuery
        .mockResolvedValueOnce([dealRow({ is_closed: true })])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([contactRow()])

      const result = await getEligibleDealForRevalidation('hs-deal-1')

      // Got the closed state freshly — proves cache was bypassed.
      expect(result?.isEligible).toBe(false)
      expect(result?.ineligibilityReasons).toContain('closed')
    })

    it('returns deal with empty contacts when company has no contacts (caller rejects)', async () => {
      mockedQuery
        .mockResolvedValueOnce([dealRow()])
        .mockResolvedValueOnce([companyRow()])
        .mockResolvedValueOnce([])

      const result = await getEligibleDealForRevalidation('hs-deal-1')

      expect(result?.isEligible).toBe(false)
      expect(result?.ineligibilityReasons).toEqual(['missing_contacts'])
    })

    it('rejects empty hubspotDealId', async () => {
      const result = await getEligibleDealForRevalidation('  ')

      expect(result).toBeNull()
      expect(mockedQuery).not.toHaveBeenCalled()
    })
  })
})
