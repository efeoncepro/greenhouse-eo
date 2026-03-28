// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PayrollPeriod } from '@/types/payroll'

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
    const { findByText, getByRole, getByText } = render(
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
    expect(getByRole('button', { name: 'Calcular' })).toBeDisabled()
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
})
