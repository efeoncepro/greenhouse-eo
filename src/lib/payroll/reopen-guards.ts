import 'server-only'

import type { PoolClient } from 'pg'

import { canReopenPayrollPeriod } from '@/lib/payroll/period-lifecycle'
import { PayrollValidationError } from '@/lib/payroll/shared'
import type { PeriodStatus } from '@/types/payroll'

// TASK-410 + hotfix 2026-04-15 — Guardas de reopen de nómina.
//
// Cada guarda verifica una precondición del flujo de reliquidación y lanza
// PayrollValidationError con mensaje accionable cuando la precondición falla.
// Los chequeos transaccionales (lock y lectura de estado) requieren un
// PoolClient vivo dentro de withTransaction.

/**
 * Ventana máxima entre `exported_at` y el momento del reopen, en días.
 * Configurable vía env var `PAYROLL_REOPEN_WINDOW_DAYS`. Default 45 días,
 * que cubre el ciclo Previred/pagos del mes siguiente sin habilitar
 * correcciones retroactivas profundas. TASK-413 reemplazará esta guarda
 * con un policy engine declarativo (ver docs/tasks/).
 */
export const DEFAULT_REOPEN_WINDOW_DAYS = 45

export const resolveReopenWindowDays = (): number => {
  const raw = process.env.PAYROLL_REOPEN_WINDOW_DAYS

  if (!raw) return DEFAULT_REOPEN_WINDOW_DAYS

  const parsed = Number.parseInt(raw, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REOPEN_WINDOW_DAYS

  return parsed
}

/**
 * Row mínima que las guardas necesitan leer del período. Se define aquí
 * para no acoplar los guards al shape completo de payroll_periods.
 */
export interface ReopenPeriodSnapshot {
  period_id: string
  year: number
  month: number
  status: PeriodStatus
  exported_at: Date | string | null
}

const parseExportedAt = (value: Date | string | null): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const daysBetween = (from: Date, to: Date): number => {
  const diffMs = to.getTime() - from.getTime()

  return diffMs / (1000 * 60 * 60 * 24)
}

/**
 * Evalúa la ventana sin lanzar (para el endpoint preview). Retorna el
 * resultado estructurado con la decisión, los días transcurridos y el
 * límite aplicable. El endpoint de preview usa esto para mostrar razones
 * al usuario sin interrumpir el flujo.
 */
export interface ReopenWindowEvaluation {
  withinWindow: boolean
  daysSinceExport: number | null
  windowDays: number
  exportedAt: string | null
  reason: 'ok' | 'not_exported' | 'outside_window'
}

export const evaluateReopenWindow = (
  snapshot: Pick<ReopenPeriodSnapshot, 'exported_at'>,
  referenceDate: Date = new Date(),
  windowDays: number = resolveReopenWindowDays()
): ReopenWindowEvaluation => {
  const exportedAt = parseExportedAt(snapshot.exported_at ?? null)

  if (!exportedAt) {
    return {
      withinWindow: false,
      daysSinceExport: null,
      windowDays,
      exportedAt: null,
      reason: 'not_exported'
    }
  }

  const elapsed = daysBetween(exportedAt, referenceDate)

  return {
    withinWindow: elapsed <= windowDays,
    daysSinceExport: elapsed,
    windowDays,
    exportedAt: exportedAt.toISOString(),
    reason: elapsed <= windowDays ? 'ok' : 'outside_window'
  }
}

/**
 * Versión throwing de `evaluateReopenWindow`, usada por el flujo
 * transaccional. El período debe haber sido exportado (`exported_at`
 * populado) y la diferencia entre `exported_at` y `referenceDate` debe
 * estar dentro de la ventana configurada.
 *
 * Reemplaza el check "mes operativo vigente" original de TASK-410 porque
 * ese criterio dejaba una zanja muerta — el mes operativo vigente típica-
 * mente aún no está exportado.
 */
export const assertReopenWindow = (
  snapshot: Pick<ReopenPeriodSnapshot, 'exported_at'>,
  referenceDate: Date = new Date()
): void => {
  const evaluation = evaluateReopenWindow(snapshot, referenceDate)

  if (evaluation.reason === 'not_exported') {
    throw new PayrollValidationError(
      'La nómina no tiene fecha de exportación. Solo se pueden reabrir nóminas exportadas.',
      409
    )
  }

  if (!evaluation.withinWindow) {
    const rounded = Math.round(evaluation.daysSinceExport ?? 0)

    throw new PayrollValidationError(
      `La nómina fue exportada hace ${rounded} día(s). Solo se pueden reabrir nóminas exportadas dentro de los últimos ${evaluation.windowDays} días. Para correcciones más antiguas usa un ajuste retroactivo en el período actual.`,
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
      SELECT period_id, year, month, status, exported_at
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
