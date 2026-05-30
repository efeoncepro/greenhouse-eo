/**
 * TASK-794 — Chile honorarios compliance errors.
 *
 * Thrown when an honorarios payout would violate the hard rule "honorarios is
 * SII retention ONLY — never dependent payroll deductions" (AFP/Fonasa/Isapre/
 * AFC/SIS/mutual/IUSC/APV/gratificación legal). es-CL, safe to surface.
 */
export class ChileHonorariosDependentDeductionError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly offendingKinds: string[]

  constructor(offendingKinds: string[]) {
    super(
      `Honorarios no admite deducciones dependientes (${offendingKinds.join(', ')}). Solo retención SII.`
    )
    this.name = 'ChileHonorariosDependentDeductionError'
    this.code = 'honorarios_dependent_deduction_forbidden'
    this.statusCode = 422
    this.offendingKinds = offendingKinds
  }
}
