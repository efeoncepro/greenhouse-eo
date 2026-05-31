// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PayrollPeriod } from '@/types/payroll'

// TASK-412 — the period tab reads the session to decide whether to show
// the admin-only "Reabrir nómina" action. Stub useSession so jsdom renders
// don't need a full SessionProvider wrapper.
vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { roleCodes: [] } } })
}))

import PayrollPeriodTab from './PayrollPeriodTab'

const period: PayrollPeriod = {
  periodId: '2026-03',
  year: 2026,
  month: 3,
  status: 'draft',
  calculatedAt: null,
  calculatedBy: null,
  approvedAt: null,
  approvedBy: null,
  exportedAt: null,
  ufValue: 39990,
  taxTableVersion: 'SII-2026-03',
  notes: null,
  createdAt: null
}

describe('PayrollPeriodTab readiness', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          periodId: '2026-03',
          ready: false,
          calculation: {
            ready: false,
            blockingIssues: [
              {
                code: 'missing_uf_value',
                severity: 'blocking',
                message: 'Falta el valor UF y este período lo requiere para calcular descuentos Isapre.'
              }
            ],
            warnings: [
              {
                code: 'missing_compensation',
                severity: 'warning',
                message: '1 colaborador(es) activos quedarían fuera por no tener compensación vigente.'
              }
            ],
            deadline: {
              lastBusinessDay: '2026-03-31',
              isDue: false,
              isOverdue: true,
              calculatedOnTime: null,
              state: 'overdue_allowed',
              blocksCalculation: false
            }
          },
          approval: {
            ready: false,
            blockingIssues: [
              {
                code: 'missing_uf_value',
                severity: 'blocking',
                message: 'Falta el valor UF y este período lo requiere para calcular descuentos Isapre.'
              }
            ]
          },
          includedMemberIds: ['member-1'],
          missingCompensationMemberIds: ['member-2'],
          missingKpiMemberIds: [],
          missingAttendanceMemberIds: ['member-1'],
          requiresUfValue: false,
          attendanceDiagnostics: {
            source: 'legacy_attendance_daily_plus_hr_leave',
            integrationTarget: 'microsoft_teams',
            blocking: false,
            notes: [
              'La asistencia aún se resume desde attendance_daily + leave_requests.',
              'La integración futura objetivo para asistencia es Microsoft Teams.'
            ]
          },
          blockingIssues: [
            {
              code: 'missing_uf_value',
              severity: 'blocking',
              message: 'Falta el valor UF y este período lo requiere para calcular descuentos Isapre.'
            }
          ],
          warnings: [
            {
              code: 'missing_compensation',
              severity: 'warning',
              message: '1 colaborador(es) activos quedarían fuera por no tener compensación vigente.'
            }
          ]
        })
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders readiness issues and disables calculate when blockers exist', async () => {
    const { findByText, getByRole, getByText, queryByText } = render(
      <PayrollPeriodTab
        period={period}
        entries={[]}
        onRefresh={vi.fn()}
        onCreatePeriod={vi.fn()}
        createPeriodLabel='Abril 2026'
      />
    )

    await findByText('Falta el valor UF y este período lo requiere para calcular descuentos Isapre.')

    expect(getByText('1 colaborador(es) activos quedarían fuera por no tener compensación vigente.')).toBeInTheDocument()
    expect(getByText(/Deadline de cálculo:/)).toBeInTheDocument()
    expect(getByText(/Bloqueada por readiness/)).toBeInTheDocument()
    expect(queryByText('La asistencia aún se resume desde attendance_daily + leave_requests.')).not.toBeInTheDocument()
    expect(queryByText('La integración futura objetivo para asistencia es Microsoft Teams.')).not.toBeInTheDocument()
    expect(getByRole('button', { name: 'Calcular' })).toBeDisabled()
  })

  it('keeps late-but-ready payroll calculable and shows the draft roster preview', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        periodId: '2026-03',
        ready: true,
        calculation: {
          ready: true,
          blockingIssues: [],
          warnings: [
            {
              code: 'missing_compensation',
              severity: 'warning',
              message: '1 colaborador(es) activos quedarían fuera por no tener compensación vigente.',
              memberIds: ['member-2']
            }
          ],
          deadline: {
            lastBusinessDay: '2026-03-31',
            isDue: false,
            isOverdue: true,
            calculatedOnTime: null,
            state: 'overdue_allowed',
            blocksCalculation: false
          }
        },
        approval: {
          ready: true,
          blockingIssues: []
        },
        includedMemberIds: ['member-1'],
        missingCompensationMemberIds: ['member-2'],
        missingKpiMemberIds: [],
        missingAttendanceMemberIds: [],
        requiresUfValue: false,
        attendanceDiagnostics: {
          source: 'legacy_attendance_daily_plus_hr_leave',
          integrationTarget: 'microsoft_teams',
          blocking: false,
          notes: []
        },
        blockingIssues: [],
        warnings: [
          {
            code: 'missing_compensation',
            severity: 'warning',
            message: '1 colaborador(es) activos quedarían fuera por no tener compensación vigente.',
            memberIds: ['member-2']
          }
        ]
      })
    } as Response)

    const { findByText, getByRole, getByText } = render(
      <PayrollPeriodTab
        period={period}
        entries={[]}
        members={[
          {
            memberId: 'member-1',
            memberName: 'Daniela Ferreira',
            memberEmail: 'daniela@efeoncepro.com',
            memberAvatarUrl: null,
            notionUserId: null,
            active: true,
            hasCurrentCompensation: true,
            hasCompensationHistory: true,
            compensationVersionCount: 1,
            currentCompensationVersionId: 'cv-1',
            currentCompensationEffectiveFrom: '2026-03-01',
            currentContractType: 'eor',
            currentPayRegime: 'international',
            currentPayrollVia: 'deel',
            currentScheduleRequired: false,
            currentDeelContractId: 'deel-1',
            currentContractEndDate: null,
            currentCurrency: 'USD'
          },
          {
            memberId: 'member-2',
            memberName: 'Julio Reyes',
            memberEmail: 'julio@efeoncepro.com',
            memberAvatarUrl: null,
            notionUserId: null,
            active: true,
            hasCurrentCompensation: false,
            hasCompensationHistory: false,
            compensationVersionCount: 0,
            currentCompensationVersionId: null,
            currentCompensationEffectiveFrom: null,
            currentContractType: null,
            currentPayRegime: null,
            currentPayrollVia: null,
            currentScheduleRequired: null,
            currentDeelContractId: null,
            currentContractEndDate: null,
            currentCurrency: null
          }
        ]}
        onRefresh={vi.fn()}
        onCreatePeriod={vi.fn()}
        createPeriodLabel='Abril 2026'
      />
    )

    await findByText(/Fuera de plazo operativo; cálculo manual permitido/)

    expect(getByRole('button', { name: 'Calcular' })).toBeEnabled()
    expect(getByText('Pre-nómina del período')).toBeInTheDocument()
    expect(getByText('Daniela Ferreira')).toBeInTheDocument()
    expect(getByText('Entraría al cálculo')).toBeInTheDocument()
    expect(getByText('Julio Reyes')).toBeInTheDocument()
    expect(getByText('Fuera: falta compensación')).toBeInTheDocument()
  })

  it('renders the operational empty state when no period is selected', () => {
    const { getByText, getByRole } = render(
      <PayrollPeriodTab
        period={null}
        entries={[]}
        onRefresh={vi.fn()}
        onCreatePeriod={vi.fn()}
        createPeriodLabel='Abril 2026'
      />
    )

    expect(getByText('No hay período abierto')).toBeInTheDocument()
    expect(getByRole('button', { name: 'Crear período Abril 2026' })).toBeInTheDocument()
  })

  it('shows a banner when the user is viewing a historical period from history', async () => {
    const { findByText } = render(
      <PayrollPeriodTab
        period={period}
        entries={[]}
        onRefresh={vi.fn()}
        onCreatePeriod={vi.fn()}
        createPeriodLabel='Abril 2026'
        isHistoricalSelection
      />
    )

    expect(
      await findByText('Estás viendo un período histórico seleccionado desde Historial. El período abierto o vigente sigue mostrándose en el resumen superior.')
    ).toBeInTheDocument()
  })

  it('exposes export delivery actions for exported periods', async () => {
    const { findByRole } = render(
      <PayrollPeriodTab
        period={{ ...period, status: 'exported', approvedAt: '2026-03-28T12:00:00.000Z', exportedAt: '2026-03-28T13:00:00.000Z' }}
        entries={[]}
        onRefresh={vi.fn()}
        onCreatePeriod={vi.fn()}
        createPeriodLabel='Abril 2026'
      />
    )

    expect(
      await findByRole('button', { name: 'Reenviar correo de exportación del período Marzo 2026' })
    ).toBeInTheDocument()
    expect(
      await findByRole('button', { name: 'Descargar PDF del período Marzo 2026' })
    ).toBeInTheDocument()
  })
})
