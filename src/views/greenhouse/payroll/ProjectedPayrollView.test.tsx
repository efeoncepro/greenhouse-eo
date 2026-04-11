// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import ProjectedPayrollView from './ProjectedPayrollView'

const honorariosResponse = {
  period: { year: 2026, month: 4 },
  mode: 'projected_month_end',
  asOfDate: '2026-04-30',
  entries: [
    {
      memberId: 'humberly-henriquez',
      memberName: 'Humberly Henriquez',
      currency: 'CLP',
      payRegime: 'chile',
      baseSalary: 300,
      remoteAllowance: 0,
      fixedBonusLabel: null,
      fixedBonusAmount: 0,
      bonusOtdAmount: 0,
      bonusRpaAmount: 0,
      bonusOtdMax: 0,
      bonusRpaMax: 0,
      kpiOtdPercent: null,
      kpiRpaAvg: null,
      kpiOtdQualifies: true,
      kpiRpaQualifies: true,
      grossTotal: 300,
      netTotal: 256.5,
      chileTotalDeductions: 43.5,
      chileAfpAmount: 0,
      chileHealthAmount: 0,
      chileUnemploymentAmount: 0,
      chileTaxAmount: 0,
      siiRetentionRate: 0.145,
      siiRetentionAmount: 43.5,
      chileApvAmount: 0,
      chileUfValue: null,
      workingDaysInPeriod: null,
      daysPresent: null,
      daysAbsent: null,
      daysOnLeave: null,
      daysOnUnpaidLeave: null,
      projectionMode: 'projected_month_end',
      projectedWorkingDays: 22,
      projectedWorkingDaysTotal: 22,
      prorationFactor: 1,
      officialGrossTotal: null,
      officialNetTotal: null,
      deltaGross: null,
      deltaNet: null,
      inputVariance: null
    }
  ],
  totals: {
    grossByCurrency: { CLP: 300 },
    netByCurrency: { CLP: 256.5 },
    memberCount: 1
  },
  official: null,
  latestPromotion: null,
  clpEquivalent: {
    grossClp: 300,
    netClp: 256.5,
    fxRate: 1
  },
  usdEquivalent: null,
  prorationFactor: 1,
  previousOfficial: null
}

describe('ProjectedPayrollView', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => honorariosResponse
      }))
    )

    if (!AbortSignal.timeout) {
      Object.defineProperty(AbortSignal, 'timeout', {
        configurable: true,
        value: () => new AbortController().signal
      })
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    cleanup()
  })

  it('shows SII retention explicitly for honorarios entries in projected payroll', async () => {
    renderWithTheme(<ProjectedPayrollView />)

    await waitFor(() => {
      expect(screen.getByText('Humberly Henriquez')).toBeInTheDocument()
    })

    expect(screen.getByText('Retención SII')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Expandir Humberly Henriquez'))

    expect(await screen.findByText('Retención honorarios')).toBeInTheDocument()
    expect(screen.getAllByText('Retención SII').length).toBeGreaterThan(0)
    expect(screen.getByText('Boleta de honorarios Chile')).toBeInTheDocument()
    expect(screen.getByText('14.50%')).toBeInTheDocument()
    expect(screen.getByText('Total retención')).toBeInTheDocument()
  })
})
