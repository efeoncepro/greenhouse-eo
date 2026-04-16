// @vitest-environment jsdom

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
