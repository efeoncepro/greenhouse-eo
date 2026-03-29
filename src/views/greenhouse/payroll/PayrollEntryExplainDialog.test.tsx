// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PayrollEntryExplainDialog from './PayrollEntryExplainDialog'

describe('PayrollEntryExplainDialog', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          entry: {
            entryId: '2026-03_member-1',
            periodId: '2026-03',
            memberId: 'member-1',
            memberName: 'Andres Carlosama',
            memberEmail: 'andres@efeoncepro.com',
            memberAvatarUrl: null,
            compensationVersionId: 'member-1_v1',
            payRegime: 'international',
            currency: 'USD',
            baseSalary: 675,
            remoteAllowance: 50,
            fixedBonusLabel: 'Responsabilidad',
            fixedBonusAmount: 75,
            kpiOtdPercent: 58.3,
            kpiRpaAvg: 2,
            kpiOtdQualifies: false,
            kpiRpaQualifies: true,
            kpiTasksCompleted: 16,
            kpiDataSource: 'ico',
            bonusOtdAmount: 0,
            bonusRpaAmount: 25,
            bonusOtherAmount: 10,
            bonusOtherDescription: null,
            grossTotal: 710,
            bonusOtdMin: 0,
            bonusOtdMax: 150,
            bonusRpaMin: 0,
            bonusRpaMax: 75,
            chileAfpName: null,
            chileAfpRate: null,
            chileAfpAmount: null,
            chileAfpCotizacionAmount: null,
            chileAfpComisionAmount: null,
            chileHealthSystem: null,
            chileHealthAmount: null,
            chileUnemploymentRate: null,
            chileUnemploymentAmount: null,
            chileTaxableBase: null,
            chileTaxAmount: null,
            chileApvAmount: null,
            chileUfValue: null,
            chileTotalDeductions: null,
            netTotalCalculated: 710,
            netTotalOverride: 720,
            netTotal: 720,
            manualOverride: true,
            manualOverrideNote: 'Ajuste RRHH',
            bonusOtdProrationFactor: 0,
            bonusRpaProrationFactor: 0.3333,
            workingDaysInPeriod: 20,
            daysPresent: 18,
            daysAbsent: 1,
            daysOnLeave: 0,
            daysOnUnpaidLeave: 1,
            adjustedBaseSalary: 607.5,
            adjustedRemoteAllowance: 45,
            adjustedFixedBonusAmount: 67.5,
            createdAt: null,
            updatedAt: null
          },
          period: {
            periodId: '2026-03',
            year: 2026,
            month: 3,
            status: 'calculated',
            calculatedAt: null,
            calculatedBy: null,
            approvedAt: null,
            approvedBy: null,
            exportedAt: null,
            ufValue: 39990,
            taxTableVersion: 'SII-2026-03',
            notes: null,
            createdAt: null
          },
          compensationVersion: {
            versionId: 'member-1_v1',
            version: 1,
            effectiveFrom: '2026-03-15',
            changeReason: 'Nómina Marzo'
          },
          calculation: {
            deductibleDays: 2,
            attendanceRatio: 0.9,
            effectiveBaseSalary: 607.5,
            effectiveRemoteAllowance: 45,
            effectiveFixedBonusAmount: 67.5,
            totalVariableBonus: 35,
            hasAttendanceAdjustment: true,
            usesManualKpi: false,
            usesManualOverride: true,
            kpiSourceModeAvailable: false,
            warnings: ['El snapshot actual conserva la fuente ICO, pero no si el KPI vino materializado o live.']
          }
        })
      })
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('loads and renders explainability details for an entry', async () => {
    render(
      <PayrollEntryExplainDialog
        open
        entryId='2026-03_member-1'
        memberName='Andres Carlosama'
        onClose={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Contexto del período')).toBeInTheDocument()
    })

    expect(screen.getByText('Compensación aplicada')).toBeInTheDocument()
    expect(screen.getByText('KPI y bonos')).toBeInTheDocument()
    expect(screen.getByText('Asistencia y ajustes')).toBeInTheDocument()
    expect(screen.getByText('Totales')).toBeInTheDocument()
    expect(screen.getByText('Señales operativas')).toBeInTheDocument()
    expect(screen.getByText('El snapshot actual conserva la fuente ICO, pero no si el KPI vino materializado o live.')).toBeInTheDocument()
    expect(screen.getByText('Ajuste RRHH')).toBeInTheDocument()
  })
})
