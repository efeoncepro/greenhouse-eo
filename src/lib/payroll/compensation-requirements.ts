import type { CompensationVersion } from '@/types/payroll'

import { isChileDependentContract } from '@/types/hr-contracts'

type CompensationRequirementsInput = Pick<
  CompensationVersion,
  'bonusOtdMax' | 'bonusRpaMax' | 'contractType' | 'payRegime' | 'payrollVia' | 'scheduleRequired'
>

export const hasPayrollVariableBonusExposure = (compensation: CompensationRequirementsInput) =>
  Number(compensation.bonusOtdMax ?? 0) > 0 || Number(compensation.bonusRpaMax ?? 0) > 0

export const requiresPayrollKpi = (compensation: CompensationRequirementsInput) =>
  compensation.contractType !== 'honorarios' && hasPayrollVariableBonusExposure(compensation)

/**
 * La señal de asistencia/licencias solo condiciona el pago en régimen dependiente
 * Chile (`indefinido`/`plazo_fijo`), donde ausencias y licencias no remuneradas
 * mueven el monto liquidado. Régimenes internacionales (`contractor`/`eor`/
 * `international_internal`) y `honorarios` NO usan las mecánicas de asistencia Chile:
 * el régimen es autoritativo, y el flag `scheduleRequired`/`daily_required` no puede
 * habilitar el requisito fuera de Chile dependiente (ISSUE-115 / TASK-1347).
 */
export const requiresPayrollAttendanceSignal = (compensation: CompensationRequirementsInput) =>
  isChileDependentContract(compensation.contractType)

export const requiresPayrollChileTaxTable = (compensation: CompensationRequirementsInput) =>
  compensation.payRegime === 'chile' && compensation.contractType !== 'honorarios'
