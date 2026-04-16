// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

const leaveRequestDialogSpy = vi.hoisted(() => vi.fn())

vi.mock('next/dynamic', () => ({
  default: () => () => null
}))

vi.mock('@/components/greenhouse/GreenhouseCalendar', () => ({
  default: () => null
}))

vi.mock('@/components/greenhouse/LeaveRequestDialog', () => ({
  default: (props: Record<string, unknown>) => {
    leaveRequestDialogSpy(props)

    return null
  }
}))

vi.mock('@/components/card-statistics', () => ({
  HorizontalWithSubtitle: ({ title, stats, subtitle }: { title: string; stats: string; subtitle: string }) => (
    <div>
      <span>{title}</span>
      <span>{stats}</span>
      <span>{subtitle}</span>
    </div>
  )
}))

const fetchMock = vi.fn()

describe('HrLeaveView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.resetModules()
  })

  it('shows the attached supporting document inside the review dialog', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.startsWith('/api/hr/core/leave/requests?')) {
        return Response.json({
          requests: [
            {
              requestId: 'leave-1',
              memberId: 'julio-reyes',
              memberName: 'Julio Reyes',
              memberAvatarUrl: null,
              leaveTypeCode: 'personal',
              leaveTypeName: 'Permiso personal',
              startDate: '2026-04-08',
              endDate: '2026-04-10',
              requestedDays: 3,
              status: 'pending_hr',
              reason: 'Permiso',
              attachmentAssetId: 'asset-1',
              attachmentUrl: '/api/assets/private/asset-1',
              supervisorMemberId: null,
              supervisorName: null,
              hrReviewerUserId: null,
              decidedAt: null,
              decidedBy: null,
              notes: null,
              createdAt: '2026-03-31T19:56:04.567Z'
            }
          ],
          summary: {
            total: 1,
            pendingSupervisor: 0,
            pendingHr: 1,
            approved: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/balances?')) {
        return Response.json({
          balances: [],
          summary: {
            memberCount: 0,
            totalAvailableDays: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/calendar?')) {
        return Response.json({
          from: '2026-01-01',
          to: '2026-12-31',
          holidaySource: 'none',
          events: []
        })
      }

      if (url === '/api/hr/core/meta') {
        return Response.json({
          currentMemberId: 'julio-reyes',
          hasHrAdminAccess: true,
          departments: [],
          leaveTypes: [
            {
              leaveTypeCode: 'personal',
              leaveTypeName: 'Permiso personal',
              description: null,
              defaultAnnualAllowanceDays: 1,
              requiresAttachment: false,
              isPaid: true,
              active: true,
              colorToken: null
            }
          ],
          jobLevels: [],
          employmentTypes: [],
          healthSystems: [],
          bankAccountTypes: [],
          leaveRequestStatuses: [],
          attendanceStatuses: []
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { default: HrLeaveView } = await import('./HrLeaveView')

    renderWithTheme(<HrLeaveView />)

    const reviewButton = await screen.findByRole('button', { name: 'Revisar' })

    fireEvent.click(reviewButton)

    await waitFor(() => {
      expect(screen.getByText('Respaldo adjunto')).toBeInTheDocument()
    })

    const attachmentLink = screen.getByRole('link', { name: 'Abrir respaldo' })

    expect(attachmentLink).toHaveAttribute('href', '/api/assets/private/asset-1')
    expect(attachmentLink).toHaveAttribute('target', '_blank')
  })

  it('rethrows create errors so the request dialog preserves the draft', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.startsWith('/api/hr/core/leave/requests?')) {
        return Response.json({
          requests: [],
          summary: {
            total: 0,
            pendingSupervisor: 0,
            pendingHr: 0,
            approved: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/balances?')) {
        return Response.json({
          balances: [],
          summary: {
            memberCount: 0,
            totalAvailableDays: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/calendar?')) {
        return Response.json({
          from: '2026-01-01',
          to: '2026-12-31',
          holidaySource: 'none',
          events: []
        })
      }

      if (url === '/api/hr/core/meta') {
        return Response.json({
          currentMemberId: 'daniela-ferreira',
          hasHrAdminAccess: false,
          departments: [],
          leaveTypes: [
            {
              leaveTypeCode: 'medical',
              leaveTypeName: 'Permiso médico / cita médica',
              description: null,
              defaultAnnualAllowanceDays: 0,
              requiresAttachment: true,
              isPaid: true,
              active: true,
              colorToken: null
            }
          ],
          jobLevels: [],
          employmentTypes: [],
          healthSystems: [],
          bankAccountTypes: [],
          leaveRequestStatuses: [],
          attendanceStatuses: []
        })
      }

      if (url === '/api/hr/core/leave/requests' && init?.method === 'POST') {
        return Response.json({ error: 'Unable to create leave request.' }, { status: 500 })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { default: HrLeaveView } = await import('./HrLeaveView')

    renderWithTheme(<HrLeaveView />)

    await waitFor(() => {
      expect(leaveRequestDialogSpy).toHaveBeenCalled()
    })

    const latestDialogProps = leaveRequestDialogSpy.mock.calls.at(-1)?.[0] as {
      onSubmit: (payload: Record<string, unknown>) => Promise<void>
    }

    await expect(latestDialogProps.onSubmit({
      memberId: 'daniela-ferreira',
      leaveTypeCode: 'medical',
      startDate: '2026-04-17',
      endDate: '2026-04-17',
      startPeriod: 'morning',
      endPeriod: 'morning',
      reason: 'Control médico',
      attachmentAssetId: 'asset-1',
      attachmentUrl: null,
      notes: null
    })).rejects.toThrow('Unable to create leave request.')

    await waitFor(() => {
      expect(screen.getByText('Unable to create leave request.')).toBeInTheDocument()
    })
  })

  it('shows a clear badge when a request was registered as an admin backfill', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.startsWith('/api/hr/core/leave/requests?')) {
        return Response.json({
          requests: [
            {
              requestId: 'leave-backfill-1',
              memberId: 'valentina-gomez',
              memberName: 'Valentina Gómez',
              memberAvatarUrl: null,
              leaveTypeCode: 'vacation',
              leaveTypeName: 'Vacaciones',
              startDate: '2026-04-10',
              endDate: '2026-04-14',
              requestedDays: 5,
              status: 'approved',
              reason: 'Vacaciones registradas manualmente',
              attachmentAssetId: null,
              attachmentUrl: null,
              supervisorMemberId: null,
              supervisorName: null,
              hrReviewerUserId: null,
              decidedAt: null,
              decidedBy: null,
              notes: null,
              createdAt: '2026-04-14T19:00:00.000Z',
              sourceKind: 'admin_backfill'
            }
          ],
          summary: {
            total: 1,
            pendingSupervisor: 0,
            pendingHr: 0,
            approved: 1
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/balances?')) {
        return Response.json({
          balances: [],
          summary: {
            memberCount: 0,
            totalAvailableDays: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/calendar?')) {
        return Response.json({
          from: '2026-01-01',
          to: '2026-12-31',
          holidaySource: 'none',
          events: []
        })
      }

      if (url === '/api/hr/core/meta') {
        return Response.json({
          currentMemberId: 'julio-reyes',
          hasHrAdminAccess: true,
          canManageLeaveBackfills: true,
          canManageLeaveAdjustments: false,
          canReverseLeaveAdjustments: false,
          departments: [],
          leaveTypes: [
            {
              leaveTypeCode: 'vacation',
              leaveTypeName: 'Vacaciones',
              description: null,
              defaultAnnualAllowanceDays: 15,
              requiresAttachment: false,
              isPaid: true,
              active: true,
              colorToken: null
            }
          ],
          jobLevels: [],
          employmentTypes: [],
          healthSystems: [],
          bankAccountTypes: [],
          leaveRequestStatuses: [],
          attendanceStatuses: []
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { default: HrLeaveView } = await import('./HrLeaveView')

    renderWithTheme(<HrLeaveView />)

    await waitFor(() => {
      expect(screen.getByText('Carga administrativa')).toBeInTheDocument()
    })
  })

  it('opens the backfill dialog from a balance row and posts the selected member and leave type', async () => {
    let backfillPayload: Record<string, unknown> | null = null

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.startsWith('/api/hr/core/leave/requests?')) {
        return Response.json({
          requests: [],
          summary: {
            total: 0,
            pendingSupervisor: 0,
            pendingHr: 0,
            approved: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/balances?')) {
        return Response.json({
          balances: [
            {
              balanceId: 'balance-1',
              memberId: 'valentina-gomez',
              memberName: 'Valentina Gómez',
              leaveTypeCode: 'vacation',
              leaveTypeName: 'Vacaciones',
              year: 2026,
              allowanceDays: 15,
              carriedOverDays: 0,
              adjustmentDays: 0,
              usedDays: 5,
              reservedDays: 0,
              availableDays: 10,
              policyExplain: {
                policyId: 'policy-vacation-chile',
                policyName: 'Vacaciones Chile',
                policySource: 'catalog',
                contractType: 'indefinido',
                payRegime: 'chile',
                payrollVia: 'internal',
                hireDate: '2025-02-01',
                annualDays: 15,
                tracksBalance: true,
                progressiveEnabled: false,
                allowNegativeBalance: false
              }
            }
          ],
          summary: {
            memberCount: 1,
            totalAvailableDays: 10
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/calendar?')) {
        return Response.json({
          from: '2026-01-01',
          to: '2026-12-31',
          holidaySource: 'none',
          events: []
        })
      }

      if (url === '/api/hr/core/meta') {
        return Response.json({
          currentMemberId: 'julio-reyes',
          hasHrAdminAccess: true,
          canManageLeaveBackfills: true,
          canManageLeaveAdjustments: false,
          canReverseLeaveAdjustments: false,
          departments: [],
          leaveTypes: [
            {
              leaveTypeCode: 'vacation',
              leaveTypeName: 'Vacaciones',
              description: null,
              defaultAnnualAllowanceDays: 15,
              requiresAttachment: false,
              isPaid: true,
              active: true,
              colorToken: null
            }
          ],
          jobLevels: [],
          employmentTypes: [],
          healthSystems: [],
          bankAccountTypes: [],
          leaveRequestStatuses: [],
          attendanceStatuses: []
        })
      }

      if (url === '/api/hr/core/leave/backfills' && init?.method === 'POST') {
        backfillPayload = JSON.parse(String(init.body))

        return Response.json({
          requestId: 'leave-backfill-2'
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { default: HrLeaveView } = await import('./HrLeaveView')

    renderWithTheme(<HrLeaveView />)

    fireEvent.click(await screen.findByRole('tab', { name: 'Saldos' }))

    fireEvent.click(screen.getAllByRole('button', { name: 'Registrar días ya tomados' })[0])

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-04-08' } })
    fireEvent.change(screen.getByLabelText('Hasta'), { target: { value: '2026-04-12' } })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Vacaciones ya tomadas' } })
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'Registro retroactivo' } })

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }))

    await waitFor(() => {
      expect(backfillPayload).toMatchObject({
        memberId: 'valentina-gomez',
        leaveTypeCode: 'vacation',
        startDate: '2026-04-08',
        endDate: '2026-04-12',
        startPeriod: 'full_day',
        endPeriod: 'full_day',
        reason: 'Vacaciones ya tomadas',
        notes: 'Registro retroactivo'
      })
    })
  })

  it('shows adjustment history and lets an admin reverse an active adjustment', async () => {
    let reversePayload: Record<string, unknown> | null = null

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.startsWith('/api/hr/core/leave/requests?')) {
        return Response.json({
          requests: [],
          summary: {
            total: 0,
            pendingSupervisor: 0,
            pendingHr: 0,
            approved: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/balances?')) {
        return Response.json({
          balances: [
            {
              balanceId: 'balance-1',
              memberId: 'valentina-gomez',
              memberName: 'Valentina Gómez',
              leaveTypeCode: 'vacation',
              leaveTypeName: 'Vacaciones',
              year: 2026,
              allowanceDays: 15,
              carriedOverDays: 0,
              adjustmentDays: 1,
              usedDays: 5,
              reservedDays: 0,
              availableDays: 11,
              policyExplain: {
                policyId: 'policy-vacation-chile',
                policyName: 'Vacaciones Chile',
                policySource: 'catalog',
                contractType: 'indefinido',
                payRegime: 'chile',
                payrollVia: 'internal',
                hireDate: '2025-02-01',
                annualDays: 15,
                tracksBalance: true,
                progressiveEnabled: false,
                allowNegativeBalance: false
              }
            }
          ],
          summary: {
            memberCount: 1,
            totalAvailableDays: 11
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/calendar?')) {
        return Response.json({
          from: '2026-01-01',
          to: '2026-12-31',
          holidaySource: 'none',
          events: []
        })
      }

      if (url === '/api/hr/core/meta') {
        return Response.json({
          currentMemberId: 'julio-reyes',
          hasHrAdminAccess: true,
          canManageLeaveBackfills: false,
          canManageLeaveAdjustments: true,
          canReverseLeaveAdjustments: true,
          departments: [],
          leaveTypes: [
            {
              leaveTypeCode: 'vacation',
              leaveTypeName: 'Vacaciones',
              description: null,
              defaultAnnualAllowanceDays: 15,
              requiresAttachment: false,
              isPaid: true,
              active: true,
              colorToken: null
            }
          ],
          jobLevels: [],
          employmentTypes: [],
          healthSystems: [],
          bankAccountTypes: [],
          leaveRequestStatuses: [],
          attendanceStatuses: []
        })
      }

      if (url.startsWith('/api/hr/core/leave/adjustments?')) {
        return Response.json({
          adjustments: [
            {
              adjustmentId: 'adjustment-1',
              memberId: 'valentina-gomez',
              memberName: 'Valentina Gómez',
              leaveTypeCode: 'vacation',
              leaveTypeName: 'Vacaciones',
              year: 2026,
              daysDelta: 2,
              effectiveDate: '2026-04-10',
              sourceKind: 'manual_adjustment',
              reason: 'Corrección de saldo',
              notes: 'Ajuste por conciliación',
              createdByUserId: 'user-admin',
              createdAt: '2026-04-10T10:00:00.000Z',
              reversedAt: null,
              reversedByUserId: null,
              reversalOfAdjustmentId: null
            },
            {
              adjustmentId: 'adjustment-2',
              memberId: 'valentina-gomez',
              memberName: 'Valentina Gómez',
              leaveTypeCode: 'vacation',
              leaveTypeName: 'Vacaciones',
              year: 2026,
              daysDelta: -1,
              effectiveDate: '2026-03-20',
              sourceKind: 'manual_adjustment_reversal',
              reason: 'Reversión previa',
              notes: null,
              createdByUserId: 'user-admin',
              createdAt: '2026-03-20T10:00:00.000Z',
              reversedAt: '2026-03-20T10:30:00.000Z',
              reversedByUserId: 'user-admin',
              reversalOfAdjustmentId: 'adjustment-0'
            }
          ],
          summary: {
            total: 2,
            totalDaysDelta: 1
          }
        })
      }

      if (url === '/api/hr/core/leave/adjustments/adjustment-1/reverse' && init?.method === 'POST') {
        reversePayload = JSON.parse(String(init.body))

        return Response.json({
          adjustmentId: 'adjustment-3'
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { default: HrLeaveView } = await import('./HrLeaveView')

    renderWithTheme(<HrLeaveView />)

    fireEvent.click(await screen.findByRole('tab', { name: 'Saldos' }))

    await waitFor(() => {
      expect(screen.getByText('Historial de ajustes')).toBeInTheDocument()
    })

    expect(screen.getByText('Revertido')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Revertir' })[0])

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Revertir ajuste' })).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText('Motivo de la reversión'), { target: { value: 'Ajuste duplicado' } })
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'Se corrige el saldo una vez' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reversión' }))

    await waitFor(() => {
      expect(reversePayload).toMatchObject({
        reason: 'Ajuste duplicado',
        notes: 'Se corrige el saldo una vez'
      })
    })
  })

  it('posts the explicit review action that was clicked', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (url.startsWith('/api/hr/core/leave/requests?')) {
        return Response.json({
          requests: [
            {
              requestId: 'leave-1',
              memberId: 'daniela-ferreira',
              memberName: 'Daniela Ferreira',
              memberAvatarUrl: null,
              leaveTypeCode: 'medical',
              leaveTypeName: 'Permiso medico',
              startDate: '2026-04-17',
              endDate: '2026-04-17',
              startPeriod: 'morning',
              endPeriod: 'morning',
              requestedDays: 0.5,
              status: 'pending_supervisor',
              reason: 'Control',
              attachmentAssetId: null,
              attachmentUrl: null,
              supervisorMemberId: 'julio-reyes',
              supervisorName: 'Julio Reyes',
              approvalStageCode: 'supervisor_review',
              approvalSnapshot: {
                snapshotId: 'EO-APS-1',
                workflowDomain: 'leave',
                workflowEntityId: 'leave-1',
                stageCode: 'supervisor_review',
                subjectMemberId: 'daniela-ferreira',
                authoritySource: 'reporting_hierarchy',
                formalApproverMemberId: 'julio-reyes',
                formalApproverName: 'Julio Reyes',
                effectiveApproverMemberId: 'julio-reyes',
                effectiveApproverName: 'Julio Reyes',
                delegateMemberId: null,
                delegateMemberName: null,
                delegateResponsibilityId: null,
                fallbackRoleCodes: [],
                delegated: false,
                overrideActorUserId: null,
                overrideReason: null,
                snapshotPayload: {},
                createdByUserId: 'user-1',
                createdAt: '2026-04-15T00:00:00.000Z',
                updatedAt: '2026-04-15T00:00:00.000Z'
              },
              hrReviewerUserId: null,
              decidedAt: null,
              decidedBy: null,
              notes: null,
              createdAt: '2026-04-15T00:00:00.000Z'
            }
          ],
          summary: {
            total: 1,
            pendingSupervisor: 1,
            pendingHr: 0,
            approved: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/balances?')) {
        return Response.json({
          balances: [],
          summary: {
            memberCount: 0,
            totalAvailableDays: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/calendar?')) {
        return Response.json({
          from: '2026-01-01',
          to: '2026-12-31',
          holidaySource: 'none',
          events: []
        })
      }

      if (url === '/api/hr/core/meta') {
        return Response.json({
          currentMemberId: 'julio-reyes',
          hasHrAdminAccess: false,
          departments: [],
          leaveTypes: [
            {
              leaveTypeCode: 'medical',
              leaveTypeName: 'Permiso medico',
              description: null,
              defaultAnnualAllowanceDays: 0,
              requiresAttachment: true,
              isPaid: true,
              active: true,
              colorToken: null
            }
          ],
          jobLevels: [],
          employmentTypes: [],
          healthSystems: [],
          bankAccountTypes: [],
          leaveRequestStatuses: [],
          attendanceStatuses: []
        })
      }

      if (url === '/api/hr/core/leave/requests/leave-1/review' && init?.method === 'POST') {
        return Response.json({ ok: true })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { default: HrLeaveView } = await import('./HrLeaveView')

    renderWithTheme(<HrLeaveView />)

    fireEvent.click(await screen.findByRole('button', { name: 'Revisar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/hr/core/leave/requests/leave-1/review',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ action: 'reject', notes: null })
        })
      )
    })
  })

  it('hides cancel for supervisor review and only shows valid review actions', async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.startsWith('/api/hr/core/leave/requests?')) {
        return Response.json({
          requests: [
            {
              requestId: 'leave-1',
              memberId: 'daniela-ferreira',
              memberName: 'Daniela Ferreira',
              memberAvatarUrl: null,
              leaveTypeCode: 'medical',
              leaveTypeName: 'Permiso medico',
              startDate: '2026-04-17',
              endDate: '2026-04-17',
              startPeriod: 'morning',
              endPeriod: 'morning',
              requestedDays: 0.5,
              status: 'pending_supervisor',
              reason: 'Control',
              attachmentAssetId: null,
              attachmentUrl: null,
              supervisorMemberId: 'julio-reyes',
              supervisorName: 'Julio Reyes',
              approvalStageCode: 'supervisor_review',
              approvalSnapshot: {
                snapshotId: 'EO-APS-1',
                workflowDomain: 'leave',
                workflowEntityId: 'leave-1',
                stageCode: 'supervisor_review',
                subjectMemberId: 'daniela-ferreira',
                authoritySource: 'reporting_hierarchy',
                formalApproverMemberId: 'julio-reyes',
                formalApproverName: 'Julio Reyes',
                effectiveApproverMemberId: 'julio-reyes',
                effectiveApproverName: 'Julio Reyes',
                delegateMemberId: null,
                delegateMemberName: null,
                delegateResponsibilityId: null,
                fallbackRoleCodes: [],
                delegated: false,
                overrideActorUserId: null,
                overrideReason: null,
                snapshotPayload: {},
                createdByUserId: 'user-1',
                createdAt: '2026-04-15T00:00:00.000Z',
                updatedAt: '2026-04-15T00:00:00.000Z'
              },
              hrReviewerUserId: null,
              decidedAt: null,
              decidedBy: null,
              notes: null,
              createdAt: '2026-04-15T00:00:00.000Z'
            }
          ],
          summary: {
            total: 1,
            pendingSupervisor: 1,
            pendingHr: 0,
            approved: 0
          }
        })
      }

      if (url.startsWith('/api/hr/core/leave/balances?')) {
        return Response.json({ balances: [], summary: { memberCount: 0, totalAvailableDays: 0 } })
      }

      if (url.startsWith('/api/hr/core/leave/calendar?')) {
        return Response.json({ from: '2026-01-01', to: '2026-12-31', holidaySource: 'none', events: [] })
      }

      if (url === '/api/hr/core/meta') {
        return Response.json({
          currentMemberId: 'julio-reyes',
          hasHrAdminAccess: false,
          departments: [],
          leaveTypes: [
            {
              leaveTypeCode: 'medical',
              leaveTypeName: 'Permiso medico',
              description: null,
              defaultAnnualAllowanceDays: 0,
              requiresAttachment: true,
              isPaid: true,
              active: true,
              colorToken: null
            }
          ],
          jobLevels: [],
          employmentTypes: [],
          healthSystems: [],
          bankAccountTypes: [],
          leaveRequestStatuses: [],
          attendanceStatuses: []
        })
      }

      throw new Error(`Unexpected fetch: ${url}`)
    })

    const { default: HrLeaveView } = await import('./HrLeaveView')

    renderWithTheme(<HrLeaveView />)

    fireEvent.click(await screen.findByRole('button', { name: 'Revisar' }))

    expect(screen.queryByRole('button', { name: 'Cancelar solicitud' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeInTheDocument()
  })
})
