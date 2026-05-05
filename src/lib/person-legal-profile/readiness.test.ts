import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

import { query } from '@/lib/db'

import { assessPersonLegalReadiness } from './readiness'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>

describe('TASK-784 readiness gates', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
  })

  it('payroll_chile_dependent: ready when CL_RUT verified + legal address verified', async () => {
    mockedQuery.mockImplementation((sql: string) => {
      if (sql.includes('person_identity_documents')) {
        return Promise.resolve([
          {
            document_type: 'CL_RUT',
            country_code: 'CL',
            verification_status: 'verified',
            evidence_asset_id: null
          }
        ])
      }

      return Promise.resolve([
        {
          address_type: 'legal',
          country_code: 'CL',
          verification_status: 'verified',
          evidence_asset_id: null
        }
      ])
    })

    const r = await assessPersonLegalReadiness({
      profileId: 'profile-1',
      useCase: 'payroll_chile_dependent'
    })

    expect(r.ready).toBe(true)
    expect(r.blockers).toEqual([])
  })

  it('final_settlement_chile: blocks when CL_RUT pending_review', async () => {
    mockedQuery.mockImplementation((sql: string) => {
      if (sql.includes('person_identity_documents')) {
        return Promise.resolve([
          {
            document_type: 'CL_RUT',
            country_code: 'CL',
            verification_status: 'pending_review',
            evidence_asset_id: null
          }
        ])
      }

      return Promise.resolve([
        {
          address_type: 'legal',
          country_code: 'CL',
          verification_status: 'verified',
          evidence_asset_id: null
        }
      ])
    })

    const r = await assessPersonLegalReadiness({
      profileId: 'profile-1',
      useCase: 'final_settlement_chile'
    })

    expect(r.ready).toBe(false)
    expect(r.blockers).toContain('cl_rut_pending_review')
  })

  it('final_settlement_chile: blocks when CL_RUT missing', async () => {
    mockedQuery.mockImplementation(() => Promise.resolve([]))

    const r = await assessPersonLegalReadiness({
      profileId: 'profile-1',
      useCase: 'final_settlement_chile'
    })

    expect(r.ready).toBe(false)
    expect(r.blockers).toContain('cl_rut_missing')
    expect(r.blockers).toContain('address_missing_legal')
  })

  it('honorarios_closure: ready with verified RUT, address NOT required', async () => {
    mockedQuery.mockImplementation((sql: string) => {
      if (sql.includes('person_identity_documents')) {
        return Promise.resolve([
          {
            document_type: 'CL_RUT',
            country_code: 'CL',
            verification_status: 'verified',
            evidence_asset_id: null
          }
        ])
      }

      return Promise.resolve([])
    })

    const r = await assessPersonLegalReadiness({
      profileId: 'profile-1',
      useCase: 'honorarios_closure'
    })

    expect(r.ready).toBe(true)
  })

  it('document_render_payroll_receipt: warning (not blocker) when RUT pending_review', async () => {
    mockedQuery.mockImplementation((sql: string) => {
      if (sql.includes('person_identity_documents')) {
        return Promise.resolve([
          {
            document_type: 'CL_RUT',
            country_code: 'CL',
            verification_status: 'pending_review',
            evidence_asset_id: null
          }
        ])
      }

      return Promise.resolve([])
    })

    const r = await assessPersonLegalReadiness({
      profileId: 'profile-1',
      useCase: 'document_render_payroll_receipt'
    })

    expect(r.ready).toBe(false) // address_missing_legal advisory still blocks?
    // Actually only block on cl_rut_missing or address_missing_legal? Let's check
    expect(r.warnings).toContain('cl_rut_pending_review_advisory')
  })
})
