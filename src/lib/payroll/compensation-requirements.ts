import type { CompensationVersion } from '@/types/payroll'

type CompensationRequirementsInput = Pick<
  CompensationVersion,
  'bonusOtdMax' | 'bonusRpaMax' | 'contractType' | 'payRegime' | 'payrollVia' | 'scheduleRequired'
>

export const hasPayrollVariableBonusExposure = (compensation: CompensationRequirementsInput) =>
  Number(compensation.bonusOtdMax ?? 0) > 0 || Number(compensation.bonusRpaMax ?? 0) > 0

export const requiresPayrollKpi = (compensation: CompensationRequirementsInput) =>
  compensation.contractType !== 'honorarios' && hasPayrollVariableBonusExposure(compensation)

export const requiresPayrollAttendanceSignal = (compensation: CompensationRequirementsInput) =>
  compensation.contractType !== 'honorarios' &&
  compensation.payrollVia !== 'deel' &&
  compensation.scheduleRequired !== false

export const requiresPayrollChileTaxTable = (compensation: CompensationRequirementsInput) =>
  compensation.payRegime === 'chile' && compensation.contractType !== 'honorarios'
