// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

const fetchMock = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams()
}))

const executedCase = {
  offboardingCaseId: 'offboarding-case-valentina',
  publicId: 'EO-OFF-2026-VAL',
  profileId: 'profile-valentina',
  memberId: 'valentina-hoyos',
  userId: 'user-valentina',
  personLegalEntityRelationshipId: 'rel-valentina',
  legalEntityOrganizationId: 'org-efeonce',
  organizationId: 'org-efeonce',
  spaceId: 'space-efeonce',
  relationshipType: 'employee',
  employmentType: 'full_time',
  contractTypeSnapshot: 'indefinido',
  payRegimeSnapshot: 'chile',
  payrollViaSnapshot: 'internal',
  deelContractIdSnapshot: null,
  countryCode: 'CL',
  contractEndDateSnapshot: null,
  separationType: 'resignation',
  source: 'manual_hr',
  status: 'executed',
  ruleLane: 'internal_payroll',
  requiresPayrollClosure: true,
  requiresLeaveReconciliation: true,
  requiresHrDocuments: true,
  requiresAccessRevocation: true,
  requiresAssetRecovery: true,
  requiresAssignmentHandoff: true,
  requiresApprovalReassignment: true,
  greenhouseExecutionMode: 'full',
  effectiveDate: '2026-04-30',
  lastWorkingDay: '2026-04-30',
  lastWorkingDayAfterEffectiveReason: null,
  submittedAt: '2026-05-04T23:28:27.096Z',
  approvedAt: '2026-05-04T23:28:27.096Z',
  scheduledAt: '2026-05-04T23:28:27.096Z',
  executedAt: '2026-05-04T23:28:27.096Z',
  cancelledAt: null,
  blockedReason: null,
  reasonCode: null,
  notes: null,
  legacyChecklistRef: {},
  sourceRef: {},
  metadata: {},
  createdByUserId: 'user-admin',
  updatedByUserId: 'user-admin',
  createdAt: '2026-05-04T23:28:27.096Z',
  updatedAt: '2026-05-04T23:28:27.096Z'
}

const membersPayload = {
  members: [
    {
      memberId: 'valentina-hoyos',
      displayName: 'Valentina Hoyos',
      roleTitle: 'People Ops'
    }
  ]
}

describe('HrOffboardingView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/hr/offboarding/cases?limit=200') {
        return Response.json({ cases: [executedCase] })
      }

      if (url === '/api/hr/core/members/options') {
        return Response.json(membersPayload)
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement' && !init?.method) {
        return Response.json({ settlement: null })
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement/document' && !init?.method) {
        return Response.json({ document: null })
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement' && init?.method === 'POST') {
        return Response.json({
          settlement: {
            finalSettlementId: 'final-settlement-valentina',
            offboardingCaseId: 'offboarding-case-valentina',
            calculationStatus: 'calculated'
          }
        }, { status: 201 })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('keeps executed internal payroll cases visible so the finiquito can be recovered', async () => {
    const user = userEvent.setup()
    const { default: HrOffboardingView } = await import('./HrOffboardingView')

    renderWithTheme(<HrOffboardingView />)

    expect(await screen.findByText('EO-OFF-2026-VAL')).toBeInTheDocument()
    expect(screen.getByText('Valentina Hoyos')).toBeInTheDocument()
    expect(screen.getByText('Ejecutado')).toBeInTheDocument()
    expect(screen.getByText('Sin cálculo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Renderizar doc.' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Calcular' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
