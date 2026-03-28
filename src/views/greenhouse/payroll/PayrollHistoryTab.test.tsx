// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { PayrollPeriod } from '@/types/payroll'

import PayrollHistoryTab from './PayrollHistoryTab'

const buildPeriod = (periodId: string, status: PayrollPeriod['status']): PayrollPeriod => {
  const [year, month] = periodId.split('-').map(Number)

  return {
    periodId,
    year,
    month,
    status,
    calculatedAt: null,
    calculatedBy: null,
    approvedAt: status === 'approved' || status === 'exported' ? '2026-03-28T12:00:00.000Z' : null,
    approvedBy: status === 'approved' || status === 'exported' ? 'user-1' : null,
    exportedAt: status === 'exported' ? '2026-03-28T13:00:00.000Z' : null,
    ufValue: null,
    taxTableVersion: null,
    notes: null,
    createdAt: null
  }
}

describe('PayrollHistoryTab', () => {
  it('distinguishes approved periods in closure from exported closed periods', () => {
    render(
      <PayrollHistoryTab
        periods={[
          buildPeriod('2026-03', 'exported'),
          buildPeriod('2026-02', 'approved')
        ]}
        selectedPeriodId={null}
        onSelectPeriod={vi.fn()}
      />
    )

    expect(screen.getByText('1 período cerrado · 1 período aprobado en cierre')).toBeInTheDocument()
    expect(screen.getByText('Cierre final')).toBeInTheDocument()
    expect(screen.getByText('Pendiente de exportación')).toBeInTheDocument()
  })
})
