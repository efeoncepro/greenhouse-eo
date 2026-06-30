import 'server-only'

/**
 * TASK-1266 — Growth AI Visibility · Probe results store (Slice 1, server-only).
 *
 * Persistencia de los probe results en greenhouse_growth.grader_probe_results. Es la
 * capa de evidencia del probe gatherer; todos los consumers (readiness scorer, report
 * builder, reliability signal) LEEN por acá — ninguno reimplementa SQL. Derivación
 * RECOMPUTABLE → UPSERT idempotente por (run_id, probe_kind): re-ejecutar reemplaza.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { type ProbeAxis, type ProbeKind, type ProbeResult, type ProbeStatus, type ProbeLayerVersion } from './contracts'

type RawProbe = Record<string, unknown>

const projectProbe = (row: RawProbe): ProbeResult => ({
  probeId: String(row.probe_id),
  runId: String(row.run_id),
  probeKind: row.probe_kind as ProbeKind,
  axis: row.axis as ProbeAxis,
  status: row.status as ProbeStatus,
  score: row.score != null ? Number(row.score) : null,
  reason: String(row.reason),
  evidence: (row.evidence as Record<string, unknown> | null) ?? {},
  latencyMs: Number(row.latency_ms ?? 0),
  errorCode: (row.error_code as string | null) ?? null,
  probeLayerVersion: row.probe_layer_version as ProbeLayerVersion,
  createdAt: String(row.created_at)
})

/** Upsert idempotente por (run_id, probe_kind): recomputar el mismo probe reemplaza (no duplica). */
export const upsertProbeResults = async (results: ProbeResult[]): Promise<number> => {
  for (const r of results) {
    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_growth.grader_probe_results
         (run_id, probe_kind, axis, status, score, reason, evidence, latency_ms, error_code, probe_layer_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
       ON CONFLICT (run_id, probe_kind) DO UPDATE SET
         axis = EXCLUDED.axis,
         status = EXCLUDED.status,
         score = EXCLUDED.score,
         reason = EXCLUDED.reason,
         evidence = EXCLUDED.evidence,
         latency_ms = EXCLUDED.latency_ms,
         error_code = EXCLUDED.error_code,
         probe_layer_version = EXCLUDED.probe_layer_version,
         updated_at = NOW()`,
      [
        r.runId,
        r.probeKind,
        r.axis,
        r.status,
        r.score,
        r.reason,
        JSON.stringify(r.evidence),
        r.latencyMs,
        r.errorCode ?? null,
        r.probeLayerVersion
      ]
    )
  }

  return results.length
}

export const getProbeResults = async (runId: string): Promise<ProbeResult[]> => {
  const rows = await runGreenhousePostgresQuery<RawProbe>(
    `SELECT * FROM greenhouse_growth.grader_probe_results WHERE run_id = $1 ORDER BY axis ASC, probe_kind ASC`,
    [runId]
  )

  return rows.map(projectProbe)
}
