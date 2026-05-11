// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

const fetchMock = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams()
}))

// TASK-863 — caso resignation con AMBOS pre-requisitos satisfechos.
// Tests anti-regresion del gating "Calcular finiquito" usan variantes sin/con
// pre-requisitos para validar disabled state + chips visibles.
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
  resignationLetterAssetId: 'asset-resignation-letter-valentina',
  maintenanceObligationJson: {
    variant: 'not_subject' as const,
    declaredAt: '2026-05-04T23:28:27.096Z',
    declaredByUserId: 'user-admin'
  },
  createdByUserId: 'user-admin',
  updatedByUserId: 'user-admin',
  createdAt: '2026-05-04T23:28:27.096Z',
  updatedAt: '2026-05-04T23:28:27.096Z'
}

const caseWithoutPrerequisites = {
  ...executedCase,
  offboardingCaseId: 'offboarding-case-prereqs-missing',
  publicId: 'EO-OFF-2026-PRE',
  resignationLetterAssetId: null,
  maintenanceObligationJson: null
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

  // TASK-863 Slice D — pre-requisitos del finiquito de renuncia.
  describe('TASK-863 prerequisites UI', () => {
    const mockEmptyCase = (caseFixture: Record<string, unknown>) => {
      fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)

        if (url === '/api/hr/offboarding/cases?limit=200') {
          return Response.json({ cases: [caseFixture] })
        }

        if (url === '/api/hr/core/members/options') {
          return Response.json(membersPayload)
        }

        if (url.endsWith('/final-settlement') && !init?.method) {
          return Response.json({ settlement: null })
        }

        if (url.endsWith('/final-settlement/document') && !init?.method) {
          return Response.json({ document: null })
        }

        if (url.endsWith('/resignation-letter') && init?.method === 'POST') {
          return Response.json({ linked: true }, { status: 201 })
        }

        if (url.endsWith('/maintenance-obligation') && init?.method === 'POST') {
          return Response.json({ declared: true }, { status: 201 })
        }

        throw new Error(`Unexpected fetch: ${url}`)
      })
    }

    it('shows missing prerequisites chips and disables Calcular when both are absent', async () => {
      mockEmptyCase(caseWithoutPrerequisites)
      const { default: HrOffboardingView } = await import('./HrOffboardingView')

      renderWithTheme(<HrOffboardingView />)

      expect(await screen.findByText('EO-OFF-2026-PRE')).toBeInTheDocument()
      expect(screen.getByText('Carta faltante')).toBeInTheDocument()
      expect(screen.getByText('Pensión pendiente')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Subir carta de renuncia' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Declarar pensión alimentos' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Calcular' })).toBeDisabled()
    })

    it('shows ready chips and enables Calcular when both prerequisites are satisfied', async () => {
      mockEmptyCase(executedCase)
      const { default: HrOffboardingView } = await import('./HrOffboardingView')

      renderWithTheme(<HrOffboardingView />)

      expect(await screen.findByText('EO-OFF-2026-VAL')).toBeInTheDocument()
      expect(screen.getByText('Carta subida')).toBeInTheDocument()
      expect(screen.getByText('Pensión: No afecto')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reemplazar carta' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Editar pensión alimentos' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Calcular' })).not.toBeDisabled()
    })

    it('submits maintenance declaration Alt A (not_subject) with the canonical body', async () => {
      const user = userEvent.setup()

      mockEmptyCase(caseWithoutPrerequisites)
      const { default: HrOffboardingView } = await import('./HrOffboardingView')

      renderWithTheme(<HrOffboardingView />)

      await user.click(await screen.findByRole('button', { name: 'Declarar pensión alimentos' }))
      await screen.findByRole('heading', { name: 'Declarar pensión de alimentos (Ley 21.389)' })

      // Default radio = not_subject (Alt A); submit directly.
      await user.click(screen.getByRole('button', { name: 'Declarar pensión' }))

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/hr/offboarding/cases/offboarding-case-prereqs-missing/maintenance-obligation',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ variant: 'not_subject' })
          })
        )
      })
    })

    it('validates Alt B (subject) requires amount > 0 and beneficiary before POST', async () => {
      const user = userEvent.setup()

      mockEmptyCase(caseWithoutPrerequisites)
      const { default: HrOffboardingView } = await import('./HrOffboardingView')

      renderWithTheme(<HrOffboardingView />)

      await user.click(await screen.findByRole('button', { name: 'Declarar pensión alimentos' }))
      await screen.findByRole('heading', { name: 'Declarar pensión de alimentos (Ley 21.389)' })

      await user.click(screen.getByRole('radio', { name: /Afecto a retención/ }))
      await user.click(screen.getByRole('button', { name: 'Declarar pensión' }))

      // Validation error visible; no fetch al endpoint.
      expect(await screen.findByText('Ingresa un monto mayor a 0.')).toBeInTheDocument()
      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining('/maintenance-obligation'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
