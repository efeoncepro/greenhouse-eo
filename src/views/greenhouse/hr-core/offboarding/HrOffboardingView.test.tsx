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
    },
    {
      memberId: 'contractor-honorarios',
      displayName: 'Consultor Honorarios',
      roleTitle: 'Advisor'
    }
  ]
}

const honorariosCase = {
  ...executedCase,
  offboardingCaseId: 'offboarding-case-honorarios',
  publicId: 'EO-OFF-2026-HON',
  profileId: 'profile-honorarios',
  memberId: 'contractor-honorarios',
  userId: 'user-honorarios',
  personLegalEntityRelationshipId: 'rel-honorarios',
  relationshipType: 'contractor',
  employmentType: 'contractor',
  contractTypeSnapshot: 'honorarios',
  payrollViaSnapshot: 'none',
  ruleLane: 'non_payroll',
  requiresPayrollClosure: false,
  requiresLeaveReconciliation: false
}

const approvedSettlement = {
  finalSettlementId: 'final-settlement-valentina',
  offboardingCaseId: 'offboarding-case-valentina',
  calculationStatus: 'approved',
  readinessHasBlockers: false,
  netPayable: 121963
}

const issuedDocument = {
  finalSettlementDocumentId: 'final-settlement-document-v1',
  offboardingCaseId: 'offboarding-case-valentina',
  finalSettlementId: 'final-settlement-valentina',
  documentStatus: 'issued',
  documentVersion: 1,
  readiness: { status: 'ready', hasBlockers: false, checks: [] },
  pdfAssetId: 'asset-finiquito-v1'
}

const historicalDocument = {
  ...issuedDocument,
  finalSettlementDocumentId: 'final-settlement-document-historical',
  finalSettlementId: 'final-settlement-cancelled',
  documentStatus: 'rendered',
  documentVersion: 1,
  pdfAssetId: 'asset-finiquito-historical'
}

describe('HrOffboardingView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/hr/offboarding/cases?limit=200') {
        return Response.json({ cases: [executedCase, honorariosCase] })
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

      if (url === '/api/hr/offboarding/cases/offboarding-case-honorarios/final-settlement' && !init?.method) {
        return Response.json({ settlement: null })
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-honorarios/final-settlement/document' && !init?.method) {
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
    expect(screen.getAllByText('Ejecutado').length).toBeGreaterThan(0)
    expect(screen.getByText('Finiquito laboral')).toBeInTheDocument()
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

  it('does not expose laboral finiquito actions for honorarios closures', async () => {
    const { default: HrOffboardingView } = await import('./HrOffboardingView')

    renderWithTheme(<HrOffboardingView />)

    expect(await screen.findByText('EO-OFF-2026-HON')).toBeInTheDocument()
    expect(screen.getAllByText('Cierre contractual').length).toBeGreaterThan(0)
    expect(screen.getByText('Sin finiquito laboral')).toBeInTheDocument()
    expect(screen.getByText(/Honorarios se cierra como relación contractual/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Revisar pago pendiente' })).toHaveAttribute('href', '/hr/payroll')
  })

  it('reissues an active finiquito document with an auditable reason', async () => {
    const user = userEvent.setup()

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/hr/offboarding/cases?limit=200') {
        return Response.json({ cases: [{ ...executedCase, countryCode: null }] })
      }

      if (url === '/api/hr/core/members/options') {
        return Response.json(membersPayload)
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement' && !init?.method) {
        return Response.json({ settlement: approvedSettlement })
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement/document' && !init?.method) {
        return Response.json({ document: issuedDocument })
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement/document/reissue' && init?.method === 'POST') {
        return Response.json({
          document: {
            ...issuedDocument,
            finalSettlementDocumentId: 'final-settlement-document-v2',
            documentStatus: 'rendered',
            documentVersion: 2,
            supersedesDocumentId: 'final-settlement-document-v1',
            pdfAssetId: 'asset-finiquito-v2'
          }
        }, { status: 201 })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { default: HrOffboardingView } = await import('./HrOffboardingView')

    renderWithTheme(<HrOffboardingView />)

    expect(await screen.findByText('EO-OFF-2026-VAL')).toBeInTheDocument()
    expect(screen.getByText('Finiquito laboral')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reemitir' }))
    const reasonField = await screen.findByRole('textbox')

    await user.type(
      reasonField,
      'Reemisión por plantilla aprobada TASK-783'
    )
    await user.click(screen.getByRole('button', { name: 'Reemitir' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement/document/reissue',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Reemisión por plantilla aprobada TASK-783' })
        })
      )
    })
  })

  it('keeps historical settlement documents read-only and generates the current document instead', async () => {
    const user = userEvent.setup()

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/hr/offboarding/cases?limit=200') {
        return Response.json({ cases: [executedCase] })
      }

      if (url === '/api/hr/core/members/options') {
        return Response.json(membersPayload)
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement' && !init?.method) {
        return Response.json({
          settlement: {
            ...approvedSettlement,
            finalSettlementId: 'final-settlement-current'
          }
        })
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement/document' && !init?.method) {
        return Response.json({ document: historicalDocument })
      }

      if (url === '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement/document' && init?.method === 'POST') {
        return Response.json({
          document: {
            ...issuedDocument,
            finalSettlementDocumentId: 'final-settlement-document-current',
            finalSettlementId: 'final-settlement-current',
            documentStatus: 'rendered',
            documentVersion: 2,
            pdfAssetId: 'asset-finiquito-current'
          }
        }, { status: 201 })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { default: HrOffboardingView } = await import('./HrOffboardingView')

    renderWithTheme(<HrOffboardingView />)

    expect(await screen.findByText('EO-OFF-2026-VAL')).toBeInTheDocument()
    expect(screen.getByText(/PDF histórico de un cálculo anterior/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reemitir' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Generar doc. vigente' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/hr/offboarding/cases/offboarding-case-valentina/final-settlement/document',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({})
        })
      )
    })
  })
})
