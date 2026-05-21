import 'server-only'

import { query } from '@/lib/db'
import { normalizeTaskStatus } from '@/lib/delivery/task-status-canonical'
import { captureWithDomain } from '@/lib/observability/capture'

import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-919 #3 — Reconciliación: red de seguridad del muestreo (BUG-CLASS-003).
 *
 * La captura de transiciones es un sistema de muestreo: si una tarea cambia de
 * estado más rápido que la cadencia del cron (~5 min) o ida-y-vuelta dentro de un
 * batch, la transición se colapsa (Notion no manda valores → re-fetch da solo
 * estado actual; el dispatcher coalescia por página/batch). Este signal DETECTA
 * el residual de drift comparando lo registrado en `task_status_transitions`
 * (último `to_status`) contra el estado actual sincronizado en
 * `greenhouse_delivery.tasks.task_status`.
 *
 * **Cómo evita el falso-positivo del sync stale**: el sync diario de Notion puede
 * estar hasta 24h atrás de la captura near-real-time. Comparar status crudo daría
 * drift falso cuando la captura va ADELANTE del sync. Solución: solo contar drift
 * cuando `tasks.source_updated_at` (= Notion `last_edited_time`) es **posterior**
 * al `transitioned_at` de la última transición registrada → la página se editó
 * DESPUÉS de nuestra última captura y el estado difiere → la captura perdió una
 * transición real. Si la captura va adelante (`source_updated_at <= transitioned_at`),
 * no se concluye drift.
 *
 * Scope: el JOIN contra `task_status_transitions` (que solo contiene filas
 * Efeonce/Sky por construcción de la captura) scopea automáticamente — no hace
 * falta mapear `space_id` a workspace. CERO llamadas a Notion.
 *
 * Steady state esperado ≈ 0 (la captura está al día). Sostenido > 0 = la captura
 * está perdiendo transiciones → investigar cadencia / coalescing. El residual
 * irreducible (round-trip sub-cadencia que vuelve al mismo estado) NO lo detecta
 * este signal (current == last_recorded) — está cubierto por el gate de paridad
 * antes del bono (Flip B).
 *
 * Pattern fuente: `notion-status-transitions-signals.ts` (TASK-912).
 */

const MODULE_KEY = 'delivery' as const

export const RECORDED_VS_CURRENT_DRIFT_SIGNAL_ID =
  'notion.task_status_transitions.recorded_vs_current_drift'

const buildErrorSignal = (err: unknown, observedAt: string): ReliabilitySignal => ({
  signalId: RECORDED_VS_CURRENT_DRIFT_SIGNAL_ID,
  moduleKey: MODULE_KEY,
  kind: 'drift',
  source: 'getNotionStatusTransitionsReconciliationSignal',
  label: 'Reconciliación captura transiciones (registrado vs actual)',
  severity: 'unknown',
  summary: 'No fue posible computar el signal — revisar logs.',
  observedAt,
  evidence: [{ kind: 'metric', label: 'error', value: err instanceof Error ? err.message : String(err) }]
})

type DriftCandidateRow = {
  task_source_id: string
  workspace_id: string
  current_status: string | null
  last_recorded: string
} & Record<string, unknown>

export const getNotionStatusTransitionsReconciliationSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    // Candidatos: tareas con transiciones registradas (Efeonce/Sky) cuya página
    // fue editada en Notion DESPUÉS de la última transición capturada. La
    // comparación de status normalizado se hace en TS (la normalización canonical
    // vive en task-status-canonical.ts, no se duplica en SQL).
    const rows = await query<DriftCandidateRow>(
      `SELECT
          t.notion_task_id AS task_source_id,
          lt.workspace_id,
          t.task_status AS current_status,
          lt.to_status AS last_recorded
       FROM greenhouse_delivery.tasks t
       JOIN LATERAL (
         SELECT to_status, transitioned_at, workspace_id
         FROM greenhouse_delivery.task_status_transitions tr
         WHERE tr.task_source_id = t.notion_task_id
         ORDER BY tr.transitioned_at DESC, tr.captured_at DESC
         LIMIT 1
       ) lt ON TRUE
       WHERE t.task_status IS NOT NULL
         AND t.source_updated_at IS NOT NULL
         AND t.source_updated_at > lt.transitioned_at`
    )

    // Drift real = status normalizado difiere (ambos canonical). Si el current no
    // normaliza (status raro/no canonical) lo ignoramos — no es un drift de RpA.
    let driftCount = 0
    const samples: string[] = []

    for (const r of rows) {
      const currentCanonical = r.current_status ? normalizeTaskStatus(r.current_status) : null
      const lastCanonical = normalizeTaskStatus(r.last_recorded)

      if (currentCanonical && lastCanonical && currentCanonical !== lastCanonical) {
        driftCount += 1

        if (samples.length < 5) {
          samples.push(`${r.workspace_id}:${r.task_source_id.slice(0, 8)} ${lastCanonical}→${currentCanonical}`)
        }
      }
    }

    const severity: ReliabilitySignal['severity'] =
      driftCount === 0 ? 'ok' : driftCount <= 5 ? 'warning' : 'error'

    return {
      signalId: RECORDED_VS_CURRENT_DRIFT_SIGNAL_ID,
      moduleKey: MODULE_KEY,
      kind: 'drift',
      source: 'getNotionStatusTransitionsReconciliationSignal',
      label: 'Reconciliación captura transiciones (registrado vs actual)',
      severity,
      summary:
        driftCount === 0
          ? 'Steady state — captura al día (cero transiciones perdidas detectables).'
          : `${driftCount} tareas con transición no registrada (la página se editó después de la última captura y el estado difiere). Revisar cadencia/coalescing de la captura.`,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'drift_count', value: String(driftCount) },
        { kind: 'metric', label: 'candidates_evaluated', value: String(rows.length) },
        { kind: 'metric', label: 'samples', value: samples.join(' | ') || 'none' }
      ]
    }
  } catch (err) {
    captureWithDomain(err, 'integrations.notion', {
      tags: { source: 'reliability_signal_status_transitions_reconciliation' }
    })

    return buildErrorSignal(err, observedAt)
  }
}
