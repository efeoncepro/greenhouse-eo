import 'server-only'

import type { PoolClient } from 'pg'

import { getOperationalPayrollMonth } from '@/lib/calendar/operational-calendar'
import { canReopenPayrollPeriod } from '@/lib/payroll/period-lifecycle'
import { PayrollValidationError } from '@/lib/payroll/shared'
import type { PeriodStatus } from '@/types/payroll'

// TASK-410 — Guardas de reopen de nómina.
//
// Cada guarda verifica una precondición del flujo de reliquidación y lanza
// PayrollValidationError con mensaje accionable cuando la precondición falla.
// Los chequeos transaccionales (lock y lectura de estado) requieren un
// PoolClient vivo dentro de withTransaction.

/**
 * Row mínima que las guardas necesitan leer del período. Se define aquí
 * para no acoplar los guards al shape completo de payroll_periods.
 */
export interface ReopenPeriodSnapshot {
  period_id: string
  year: number
  month: number
  status: PeriodStatus
}

/**
 * Verifica que el período a reabrir es el mes operativo vigente según
 * `operational-calendar.ts`. Esta guarda actúa como proxy de "Previred aún
 * no declarado" dado que Previred se declara entre el 1 y el 10 del mes
 * siguiente al período y el mes operativo vigente, por definición, todavía
 * no ha sido declarado.
 */
export const assertReopenWindow = (
  periodYear: number,
  periodMonth: number,
  referenceDate: Date = new Date()
): void => {
  const operational = getOperationalPayrollMonth(referenceDate)

  if (operational.operationalYear !== periodYear || operational.operationalMonth !== periodMonth) {
    throw new PayrollValidationError(
      `Solo se puede reabrir el período del mes operativo vigente (${operational.operationalYear}-${String(operational.operationalMonth).padStart(2, '0')}). Para meses anteriores usa un ajuste en el período actual.`,
      409
    )
  }
}

/**
 * Toma un lock pesimista sobre la fila del período para bloquear exports
 * concurrentes. Falla con 409 Conflict si el lock no se obtiene dentro de
 * la transacción. Debe llamarse dentro de withTransaction.
 */
export const assertNoExportInProgress = async (
  periodId: string,
  client: PoolClient
): Promise<ReopenPeriodSnapshot> => {
  const { rows } = await client.query<ReopenPeriodSnapshot>(
    `
      SELECT period_id, year, month, status
      FROM greenhouse_payroll.payroll_periods
      WHERE period_id = $1
      FOR UPDATE NOWAIT
    `,
    [periodId]
  )

  const snapshot = rows[0]

  if (!snapshot) {
    throw new PayrollValidationError(`Período de nómina ${periodId} no existe.`, 404)
  }

  return snapshot
}

/**
 * Verifica que el estado actual del período permite reopen.
 */
export const assertPeriodReopenable = (snapshot: ReopenPeriodSnapshot): void => {
  if (!canReopenPayrollPeriod(snapshot.status)) {
    throw new PayrollValidationError(
      `Solo los períodos en estado 'exported' pueden reabrirse. Estado actual: '${snapshot.status}'.`,
      409
    )
  }
}

/**
 * Placeholder de la guarda de Previred. V1 delega al check de ventana
 * operativa (un período en el mes operativo vigente no puede haber sido
 * declarado a Previred todavía). La función existe para que V2 pueda
 * reemplazarla con un check real sin cambiar el flujo del endpoint.
 *
 * Retorna `false` — el período NO fue declarado a Previred aún según la
 * inferencia V1. El valor se persiste en el audit como snapshot.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const checkPreviredDeclaredSnapshot = (_periodId: string): boolean => false

/**
 * Valida que el motivo de reopen viene de la taxonomía controlada y que
 * 'otro' trae detalle obligatorio.
 */
export const REOPEN_REASON_VALUES = ['error_calculo', 'bono_retroactivo', 'correccion_contractual', 'otro'] as const
export type ReopenReason = (typeof REOPEN_REASON_VALUES)[number]

export const assertValidReopenReason = (
  reason: unknown,
  reasonDetail: unknown
): { reason: ReopenReason; reasonDetail: string | null } => {
  if (typeof reason !== 'string' || !REOPEN_REASON_VALUES.includes(reason as ReopenReason)) {
    throw new PayrollValidationError(
      `Motivo de reliquidación inválido. Valores permitidos: ${REOPEN_REASON_VALUES.join(', ')}.`,
      400
    )
  }

  const typedReason = reason as ReopenReason
  const detail = typeof reasonDetail === 'string' ? reasonDetail.trim() : ''

  if (typedReason === 'otro' && !detail) {
    throw new PayrollValidationError(
      'El motivo "otro" requiere un detalle explicando la justificación.',
      400
    )
  }

  return { reason: typedReason, reasonDetail: detail || null }
}
