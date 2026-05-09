import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { CRITICAL_TABLES, verifyCriticalTablesExist } from '@/lib/db-health/critical-tables-check'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-838 Fase 3 / ISSUE-068 — Reliability signal: critical tables missing.
 *
 * Detecta runtime drift entre la lista declarativa de tablas críticas
 * (`CRITICAL_TABLES` en `src/lib/db-health/critical-tables-check.ts`) y el
 * estado real de PG. Cubre 3 escenarios:
 *
 *   1. Migration rota que se "aplicó" sin crear sus tablas (bug class
 *      ISSUE-068 / TASK-768 Slice 1). Hoy cubierto al PR-level por CI gate
 *      `migration-marker-gate.mjs`; este signal es la red de seguridad runtime.
 *   2. Rollback parcial o restore desde backup viejo en producción.
 *   3. DROP manual accidental.
 *
 * Steady state esperado: 0 tablas missing.
 * Severity: `error` si count > 0 (cualquier tabla crítica missing es bug).
 *
 * Pattern source: TASK-780 home-rollout-drift, TASK-611 workspace-projection-drift.
 */

export const CRITICAL_TABLES_MISSING_SIGNAL_ID = 'infrastructure.critical_tables.missing'

export const getCriticalTablesMissingSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const status = await verifyCriticalTablesExist()

    const missingCount = status.missing.length
    const severity: ReliabilitySignal['severity'] = missingCount === 0 ? 'ok' : 'error'

    const summary =
      missingCount === 0
        ? `${status.total} tablas críticas presentes en PG.`
        : `${missingCount} de ${status.total} tablas críticas FALTAN en PG: ${status.missing
            .map(entry => `${entry.schema}.${entry.table}`)
            .join(', ')}. Causa probable: migration aplicada sin SQL ejecutado, rollback parcial, o DROP manual.`

    if (missingCount > 0) {
      // Tag domain=cloud para Sentry incident roll-up bajo Cloud Platform module.
      captureWithDomain(new Error(summary), 'cloud', {
        tags: { source: 'reliability_signal_critical_tables_missing' },
        extra: { missing: status.missing, total: status.total }
      })
    }

    return {
      signalId: CRITICAL_TABLES_MISSING_SIGNAL_ID,
      moduleKey: 'cloud',
      kind: 'drift',
      source: 'getCriticalTablesMissingSignal',
      label: 'Tablas críticas faltantes en PG',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'missing_count',  value: String(missingCount) },
        { kind: 'metric', label: 'total_critical', value: String(status.total) },
        ...status.missing.map(entry => ({
          kind: 'metric' as const,
          label: 'missing_table',
          value: `${entry.schema}.${entry.table} — ${entry.rationale}`
        })),
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/issues/open/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'cloud', {
      tags: { source: 'reliability_signal_critical_tables_missing' }
    })

    return {
      signalId: CRITICAL_TABLES_MISSING_SIGNAL_ID,
      moduleKey: 'cloud',
      kind: 'drift',
      source: 'getCriticalTablesMissingSignal',
      label: 'Tablas críticas faltantes en PG',
      severity: 'unknown',
      summary: 'No fue posible verificar el estado de tablas críticas. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        },
        { kind: 'metric', label: 'total_critical', value: String(CRITICAL_TABLES.length) }
      ]
    }
  }
}
