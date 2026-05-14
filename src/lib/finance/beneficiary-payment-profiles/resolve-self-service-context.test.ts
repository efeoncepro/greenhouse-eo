import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  query: vi.fn()
}))

vi.mock('@/lib/person-legal-profile', () => ({
  resolveProfileIdForMember: vi.fn(),
  listIdentityDocumentsForProfileMasked: vi.fn()
}))

import { query } from '@/lib/db'
import {
  listIdentityDocumentsForProfileMasked,
  resolveProfileIdForMember
} from '@/lib/person-legal-profile'

import { resolveSelfServicePaymentProfileContext } from './resolve-self-service-context'

const mockedQuery = query as unknown as ReturnType<typeof vi.fn>
const mockedResolveProfile = resolveProfileIdForMember as unknown as ReturnType<typeof vi.fn>
const mockedListDocs = listIdentityDocumentsForProfileMasked as unknown as ReturnType<typeof vi.fn>

describe('TASK-753 resolveSelfServicePaymentProfileContext', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
    mockedResolveProfile.mockReset()
    mockedListDocs.mockReset()
  })

  it('returns regime=unset when member not found', async () => {
    mockedQuery.mockResolvedValueOnce([])

    const ctx = await resolveSelfServicePaymentProfileContext('m-missing')

    expect(ctx.regime).toBe('unset')
    expect(ctx.unsetReason).toContain('identidad')
  })

  it('returns regime=chile_dependent for CL country + chile pay_regime', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-1',
        pay_regime: 'chile',
        location_country: 'CL',
        legal_name: 'María González Rojas',
        display_name: 'María',
        contract_type: 'indefinido',
        identity_profile_id: 'ip-1'
      }
    ])
    mockedResolveProfile.mockResolvedValueOnce('ip-1')
    mockedListDocs.mockResolvedValueOnce([
      {
        documentType: 'CL_RUT',
        displayMask: 'xx.xxx.•••-•',
        verificationStatus: 'verified',
        declaredAt: '2026-01-01T00:00:00Z'
      }
    ])

    const ctx = await resolveSelfServicePaymentProfileContext('m-1')

    expect(ctx.regime).toBe('chile_dependent')
    expect(ctx.countryCode).toBe('CL')
    expect(ctx.countryName).toBe('Chile')
    expect(ctx.currency).toBe('CLP')
    expect(ctx.legalFullName).toBe('María González Rojas')
    expect(ctx.legalDocumentMasked).toBe('xx.xxx.•••-•')
    expect(ctx.legalDocumentType).toBe('CL_RUT')
    expect(ctx.legalDocumentVerificationStatus).toBe('verified')
  })

  it('returns regime=honorarios_chile for honorarios pay_regime', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-2',
        pay_regime: 'honorarios',
        location_country: 'CL',
        legal_name: 'Andrés Soto',
        display_name: null,
        contract_type: 'honorarios',
        identity_profile_id: null
      }
    ])

    const ctx = await resolveSelfServicePaymentProfileContext('m-2')

    expect(ctx.regime).toBe('honorarios_chile')
    expect(ctx.currency).toBe('CLP')
  })

  it('normalizes legacy country names and honors contract_type=honorarios over generic chile pay_regime', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-felipe',
        pay_regime: 'chile',
        location_country: 'Chile',
        legal_name: null,
        display_name: 'Felipe Zurita',
        contract_type: 'honorarios',
        identity_profile_id: 'ip-felipe'
      }
    ])
    mockedResolveProfile.mockResolvedValueOnce('ip-felipe')
    mockedListDocs.mockResolvedValueOnce([])

    const ctx = await resolveSelfServicePaymentProfileContext('m-felipe')

    expect(ctx.regime).toBe('honorarios_chile')
    expect(ctx.countryCode).toBe('CL')
    expect(ctx.countryName).toBe('Chile')
    expect(ctx.currency).toBe('CLP')
    expect(ctx.legalFullName).toBe('Felipe Zurita')
  })

  it('returns regime=international for non-CL country', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-3',
        pay_regime: 'international',
        location_country: 'CO',
        legal_name: 'Daniela Ramírez',
        display_name: 'Daniela',
        contract_type: 'contractor',
        identity_profile_id: 'ip-3'
      }
    ])
    mockedResolveProfile.mockResolvedValueOnce('ip-3')
    mockedListDocs.mockResolvedValueOnce([])

    const ctx = await resolveSelfServicePaymentProfileContext('m-3')

    expect(ctx.regime).toBe('international')
    expect(ctx.countryCode).toBe('CO')
    expect(ctx.countryName).toBe('Colombia')
    expect(ctx.currency).toBe('USD')
    expect(ctx.legalDocumentMasked).toBeNull()
  })

  it('infers international when country is non-CL even without explicit regime', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-4',
        pay_regime: null,
        location_country: 'MX',
        legal_name: null,
        display_name: 'Carlos',
        contract_type: null,
        identity_profile_id: null
      }
    ])

    const ctx = await resolveSelfServicePaymentProfileContext('m-4')

    expect(ctx.regime).toBe('international')
    expect(ctx.countryCode).toBe('MX')
  })

  it('returns regime=unset when both pay_regime AND country are null', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-5',
        pay_regime: null,
        location_country: null,
        legal_name: 'Test',
        display_name: null,
        contract_type: null,
        identity_profile_id: null
      }
    ])

    const ctx = await resolveSelfServicePaymentProfileContext('m-5')

    expect(ctx.regime).toBe('unset')
    expect(ctx.unsetReason).toContain('régimen laboral')
    expect(ctx.unsetReason).toContain('país')
  })

  it('prefers verified > pending_review identity document', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-6',
        pay_regime: 'chile',
        location_country: 'CL',
        legal_name: 'Sofía',
        display_name: null,
        contract_type: 'indefinido',
        identity_profile_id: 'ip-6'
      }
    ])
    mockedResolveProfile.mockResolvedValueOnce('ip-6')
    mockedListDocs.mockResolvedValueOnce([
      {
        documentType: 'CL_RUT',
        displayMask: 'pending-mask',
        verificationStatus: 'pending_review',
        declaredAt: '2026-02-01T00:00:00Z'
      },
      {
        documentType: 'CL_RUT',
        displayMask: 'verified-mask',
        verificationStatus: 'verified',
        declaredAt: '2026-01-01T00:00:00Z'
      }
    ])

    const ctx = await resolveSelfServicePaymentProfileContext('m-6')

    expect(ctx.legalDocumentMasked).toBe('verified-mask')
    expect(ctx.legalDocumentVerificationStatus).toBe('verified')
  })

  it('degrades gracefully when identity lookup throws (does not block context)', async () => {
    mockedQuery.mockResolvedValueOnce([
      {
        member_id: 'm-7',
        pay_regime: 'chile',
        location_country: 'CL',
        legal_name: 'Test',
        display_name: null,
        contract_type: 'indefinido',
        identity_profile_id: 'ip-7'
      }
    ])
    mockedResolveProfile.mockRejectedValueOnce(new Error('PG transient'))

    const ctx = await resolveSelfServicePaymentProfileContext('m-7')

    expect(ctx.regime).toBe('chile_dependent')
    expect(ctx.legalDocumentMasked).toBeNull()
    expect(ctx.legalFullName).toBe('Test')
  })
})
