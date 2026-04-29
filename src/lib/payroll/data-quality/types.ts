/**
 * TASK-729 — Payroll Data Quality detector contracts.
 *
 * Cada detector emite un `OperationsSubsystemMetric` (shape canónico de
 * Operations Overview). El composer `buildPayrollDataQualitySubsystem`
 * agrega los detectores con `withSourceTimeout` para degradación honesta.
 *
 * Steady-state esperado: todas las métricas en `ok` o `info` (operacional).
 * Si emite `warning`/`error`, hay un gap de gobernanza real.
 *
 * Spec: docs/tasks/to-do/TASK-729-payroll-reliability-module.md
 */

import 'server-only'

import type { OperationsSubsystemMetric } from '@/lib/operations/get-operations-overview'

/**
 * Marker para metrics con severidad de plataforma vs operacional.
 *
 * Platform integrity metrics escalan el subsystem a `degraded`. Operational
 * (info) son visibles pero no escalan — son señales de workflow humano
 * (e.g. "esperando KPIs de delivery"), no de bug.
 */
export const PAYROLL_PLATFORM_METRIC_KEYS = new Set<string>([
  'stuck_draft_periods',
  'compensation_version_overlaps',
  'projection_queue_failures'
])

export const PAYROLL_OPERATIONAL_METRIC_KEYS = new Set<string>([
  'previred_sync_freshness'
])

export type PayrollDataQualityMetric = OperationsSubsystemMetric

export const isPayrollPlatformMetric = (key: string): boolean =>
  PAYROLL_PLATFORM_METRIC_KEYS.has(key)
