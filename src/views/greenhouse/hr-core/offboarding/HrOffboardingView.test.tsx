// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import {
  buildOffboardingWorkQueueItem,
  buildOffboardingWorkQueueSummary,
  type OffboardingWorkQueueDocumentSummary,
  type OffboardingWorkQueueSettlementSummary
} from '@/lib/workforce/offboarding/work-queue'
import type { OffboardingCase } from '@/lib/workforce/offboarding'

const fetchMock = vi.fn()

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams()
}))

vi.mock('@/components/greenhouse/AnimatedCounter', () => ({
  default: ({ value }: { value: number }) => <span>{value}</span>
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
  relationshipType: 'employee' as const,
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
} satisfies OffboardingCase

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
  relationshipType: 'contractor' as const,
  employmentType: 'contractor',
  contractTypeSnapshot: 'honorarios',
  payrollViaSnapshot: 'none',
  ruleLane: 'non_payroll',
  requiresPayrollClosure: false,
  requiresLeaveReconciliation: false
} satisfies OffboardingCase

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

const collaboratorFor = (item: OffboardingCase) => {
  const member = membersPayload.members.find(candidate => candidate.memberId === item.memberId)

  return {
    memberId: item.memberId,
    displayName: member?.displayName ?? item.memberId,
    primaryEmail: null,
    roleTitle: member?.roleTitle ?? null
  }
}

const asSettlementSummary = (settlement: typeof approvedSettlement | null): OffboardingWorkQueueSettlementSummary | null =>
  settlement
    ? {
        finalSettlementId: settlement.finalSettlementId,
        settlementVersion: 1,
        calculationStatus: settlement.calculationStatus as OffboardingWorkQueueSettlementSummary['calculationStatus'],
        readinessStatus: 'ready',
        readinessHasBlockers: Boolean(settlement.readinessHasBlockers),
        netPayable: settlement.netPayable,
        currency: 'CLP',
        calculatedAt: '2026-05-11T00:00:00.000Z',
        approvedAt: '2026-05-11T01:00:00.000Z'
      }
    : null

const asDocumentSummary = (document: typeof issuedDocument | null): OffboardingWorkQueueDocumentSummary | null =>
  document
    ? {
        finalSettlementDocumentId: document.finalSettlementDocumentId,
        finalSettlementId: document.finalSettlementId,
        settlementVersion: 1,
        documentVersion: document.documentVersion,
        documentStatus: document.documentStatus as OffboardingWorkQueueDocumentSummary['documentStatus'],
        readinessStatus: document.readiness.status as OffboardingWorkQueueDocumentSummary['readinessStatus'],
        readinessHasBlockers: document.readiness.hasBlockers,
        pdfAssetId: document.pdfAssetId,
        isHistoricalForLatestSettlement: false,
        issuedAt: document.documentStatus === 'issued' ? '2026-05-11T00:00:00.000Z' : null,
        signedOrRatifiedAt: null
      }
    : null

const workQueuePayload = (
  cases: OffboardingCase[],
  options: {
    settlements?: Record<string, typeof approvedSettlement | null>
    documents?: Record<string, typeof issuedDocument | null>
  } = {}
) => {
  const items = cases.map(item =>
    buildOffboardingWorkQueueItem({
      item,
      collaborator: collaboratorFor(item),
      settlement: asSettlementSummary(options.settlements?.[item.offboardingCaseId] ?? null),
      document: asDocumentSummary(options.documents?.[item.offboardingCaseId] ?? null)
    })
  )

  return {
    items,
    summary: buildOffboardingWorkQueueSummary(items),
    generatedAt: '2026-05-11T00:00:00.000Z',
    degradedReasons: []
  }
}

describe('HrOffboardingView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/hr/offboarding/work-queue?limit=200') {
        return Response.json(workQueuePayload([executedCase, honorariosCase]))
      }

      if (url === '/api/hr/core/members/options') {
        return Response.json(membersPayload)
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
    // Valentina Hoyos rendered both in the table row + inspector header (TASK-863 round 4 H-prominent case display)
    expect(screen.getAllByText('Valentina Hoyos').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Ejecutado').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Finiquito laboral').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Calcular finiquito').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Calcular finiquito' }))

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

    await userEvent.setup().click(screen.getByText('EO-OFF-2026-HON'))

    // findByRole espera el mount async tras el cross-fade del inspector (round 4 microinteractions)
    expect(await screen.findByRole('link', { name: 'Revisar pago pendiente' })).toHaveAttribute('href', '/hr/payroll')
  })

  it('reissues an active finiquito document with an auditable reason', async () => {
    const user = userEvent.setup()

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url === '/api/hr/offboarding/work-queue?limit=200') {
        return Response.json(workQueuePayload([executedCase], {
          settlements: { [executedCase.offboardingCaseId]: approvedSettlement },
          documents: { [executedCase.offboardingCaseId]: issuedDocument }
        }))
      }

      if (url === '/api/hr/core/members/options') {
        return Response.json(membersPayload)
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

    await user.click(screen.getByText('EO-OFF-2026-VAL'))
    await user.click(screen.getByRole('button', { name: 'Reemitir documento' }))
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

      if (url === '/api/hr/offboarding/work-queue?limit=200') {
        return Response.json(workQueuePayload([executedCase], {
          settlements: {
            [executedCase.offboardingCaseId]: {
              ...approvedSettlement,
              finalSettlementId: 'final-settlement-current'
            }
          },
          documents: { [executedCase.offboardingCaseId]: historicalDocument }
        }))
      }

      if (url === '/api/hr/core/members/options') {
        return Response.json(membersPayload)
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
    expect(screen.getByText(/El documento corresponde a un cálculo anterior/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reemitir' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Generar documento' }))

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

        if (url === '/api/hr/offboarding/work-queue?limit=200') {
          return Response.json(workQueuePayload([caseFixture as typeof executedCase]))
        }

        if (url === '/api/hr/core/members/options') {
          return Response.json(membersPayload)
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

    it('shows missing prerequisites chips and withholds Calcular when both are absent', async () => {
      mockEmptyCase(caseWithoutPrerequisites)
      const { default: HrOffboardingView } = await import('./HrOffboardingView')

      renderWithTheme(<HrOffboardingView />)

      expect(await screen.findByText('EO-OFF-2026-PRE')).toBeInTheDocument()
      await userEvent.setup().click(screen.getByText('EO-OFF-2026-PRE'))
      expect(screen.getByText('Carta faltante')).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Subir carta de renuncia' }).length).toBeGreaterThan(0)
      expect(screen.queryByRole('button', { name: 'Calcular finiquito' })).not.toBeInTheDocument()
    })

    it('shows ready chips and enables Calcular when both prerequisites are satisfied', async () => {
      mockEmptyCase(executedCase)
      const { default: HrOffboardingView } = await import('./HrOffboardingView')

      renderWithTheme(<HrOffboardingView />)

      expect(await screen.findByText('EO-OFF-2026-VAL')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Calcular finiquito' })).not.toBeDisabled()
    })

    it('submits maintenance declaration Alt A (not_subject) with the canonical body', async () => {
      const user = userEvent.setup()

      mockEmptyCase(caseWithoutPrerequisites)
      const { default: HrOffboardingView } = await import('./HrOffboardingView')

      renderWithTheme(<HrOffboardingView />)

      await user.click(await screen.findByText('EO-OFF-2026-PRE'))
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

      await user.click(await screen.findByText('EO-OFF-2026-PRE'))
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
