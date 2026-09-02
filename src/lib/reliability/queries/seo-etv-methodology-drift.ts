import 'server-only'

import { query } from '@/lib/db'
import {
  ETV_LEGACY_METHODOLOGY,
  ETV_PROVIDER_CUTOFF_ISO,
  EtvMethodologyPolicyError,
  isAfterEtvProviderCutoff,
  resolveConfiguredEtvMethodology,
  resolveEtvReadMethodology
} from '@/lib/growth/seo/etv-methodology'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1805 — Drift de metodología ETV entre configuración y evidencia persistida, cross-runtime.
 *
 * DataForSEO no devuelve la versión de fórmula: el ÚNICO rastro de qué se pidió es lo que cada
 * runtime persistió (`etv_methodology_version` + `etv_requested_at` + `etv_policy_version`). Esta
 * señal compara tres cosas que deben coincidir y que hoy viven en lugares distintos:
 *
 *   1. lo que ESTE runtime (Vercel) tiene configurado para escribir y para leer;
 *   2. lo que el ops-worker pidió en su última request explícita (fotos de dominio y visibilidad
 *      las escribe SÓLO el worker);
 *   3. lo que Vercel pidió en su último diagnóstico de prospecto (el prospecto corre inline).
 *
 * Y vigila dos estados que la base ya rechaza por trigger pero que un runtime viejo intentaría:
 * evidencia contractual escrita en los últimos 7 días cuando ya hay evidencia explícita (un runtime
 * quedó atrás), y legacy solicitado desde el corte (`2026-11-01T00:00:00Z`).
 *
 * **Severity matrix:**
 *   - configuración inválida en este runtime → `error` (la policy ya falla cerrado; acá se ve)
 *   - legacy configurado en/después del corte → `error` (las capturas están congeladas a propósito;
 *     el operador tiene que elegir improved vía TASK-1806)
 *   - método efectivo del worker ≠ configurado acá, o Vercel ≠ configurado → `error` (drift)
 *   - evidencia contractual reciente coexistiendo con evidencia explícita → `warning` (runtime viejo)
 *   - sin evidencia explícita todavía → `awaiting_data` (foundation sin rollout; no es drift)
 *   - todo coincide → `ok`. Steady = 0 divergencias.
 *
 * Las filas de sanity (`*.invalid`) se excluyen: las escribe un operador desde local y no dicen nada
 * del runtime.
 */
export const SEO_ETV_METHODOLOGY_DRIFT_SIGNAL_ID = 'seo.etv_methodology.drift'

const RECENT_DAYS = 7
const EVIDENCE_WINDOW_DAYS = 45

const QUERY_SQL = `
  WITH windowed AS (
    SELECT 'seo_domain_overview_snapshots'::text AS table_name, 'ops_worker'::text AS runtime,
           etv_methodology_version, etv_methodology_evidence, etv_policy_version, etv_requested_at, created_at
      FROM greenhouse_growth.seo_domain_overview_snapshots
     WHERE created_at > now() - ($1::int * interval '1 day')
       AND normalized_domain NOT LIKE '%.invalid'
    UNION ALL
    SELECT 'seo_url_visibility_snapshots', 'ops_worker',
           etv_methodology_version, etv_methodology_evidence, etv_policy_version, etv_requested_at, created_at
      FROM greenhouse_growth.seo_url_visibility_snapshots
     WHERE created_at > now() - ($1::int * interval '1 day')
       AND normalized_subject NOT LIKE '%.invalid%'
    UNION ALL
    SELECT 'seo_prospect_diagnostics', 'vercel',
           etv_methodology_version, etv_methodology_evidence, etv_policy_version, etv_requested_at, created_at
      FROM greenhouse_growth.seo_prospect_diagnostics
     WHERE created_at > now() - ($1::int * interval '1 day')
       AND root_domain NOT LIKE '%.invalid'
  )
  SELECT runtime,
         count(*) FILTER (WHERE etv_methodology_evidence = 'explicit_request')::int AS explicit_rows,
         count(*) FILTER (WHERE etv_methodology_evidence = 'contract_default_pre_cutoff'
                            AND created_at > now() - ($2::int * interval '1 day'))::int AS contract_recent_rows,
         count(*) FILTER (WHERE etv_methodology_version = 'legacy_static_v1'
                            AND etv_requested_at IS NOT NULL
                            AND etv_requested_at >= $3::timestamptz)::int AS legacy_after_cutoff_rows,
         (array_agg(etv_methodology_version ORDER BY etv_requested_at DESC)
            FILTER (WHERE etv_methodology_evidence = 'explicit_request'))[1] AS latest_explicit_version,
         (array_agg(etv_policy_version ORDER BY etv_requested_at DESC)
            FILTER (WHERE etv_methodology_evidence = 'explicit_request'))[1] AS latest_policy_version,
         max(etv_requested_at) FILTER (WHERE etv_methodology_evidence = 'explicit_request') AS latest_requested_at
    FROM windowed
   GROUP BY runtime
`

type RuntimeRow = {
  runtime: 'ops_worker' | 'vercel'
  explicit_rows: number
  contract_recent_rows: number
  legacy_after_cutoff_rows: number
  latest_explicit_version: string | null
  latest_policy_version: string | null
  latest_requested_at: Date | string | null
}

const toIso = (value: Date | string | null): string | null => {
  if (!value) return null

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export const getSeoEtvMethodologyDriftSignal = async (now: Date = new Date()): Promise<ReliabilitySignal> => {
  const observedAt = now.toISOString()

  const base = {
    signalId: SEO_ETV_METHODOLOGY_DRIFT_SIGNAL_ID,
    moduleKey: 'growth' as const,
    kind: 'drift' as const,
    source: 'getSeoEtvMethodologyDriftSignal',
    label: 'Metodología ETV configurada vs. solicitada (Vercel + ops-worker)',
    observedAt
  }

  let configuredWrite: ReturnType<typeof resolveConfiguredEtvMethodology>
  let configuredRead: ReturnType<typeof resolveEtvReadMethodology>

  try {
    configuredWrite = resolveConfiguredEtvMethodology()
    configuredRead = resolveEtvReadMethodology()
  } catch (error) {
    const code = error instanceof EtvMethodologyPolicyError ? error.code : 'unknown'

    return {
      ...base,
      severity: 'error',
      summary:
        'La configuración de metodología ETV de este runtime está fuera del vocabulario cerrado: toda captura ETV falla cerrado hasta corregir GROWTH_SEO_ETV_METHODOLOGY_VERSION / GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION.',
      evidence: [{ kind: 'metric', label: 'policyError', value: code }]
    }
  }

  try {
    const rows = await query<RuntimeRow>(QUERY_SQL, [EVIDENCE_WINDOW_DAYS, RECENT_DAYS, ETV_PROVIDER_CUTOFF_ISO])
    const byRuntime = new Map(rows.map(row => [row.runtime, row]))
    const worker = byRuntime.get('ops_worker')
    const vercel = byRuntime.get('vercel')

    const afterCutoff = isAfterEtvProviderCutoff(now)
    const divergences: string[] = []
    let severity: ReliabilitySignal['severity'] = 'ok'

    if (afterCutoff && configuredWrite.version === ETV_LEGACY_METHODOLOGY) {
      severity = 'error'
      divergences.push(
        `legacy configurado en/después del corte ${ETV_PROVIDER_CUTOFF_ISO}: las capturas ETV están congeladas (safe mode); TASK-1806 debe fijar improved`
      )
    }

    for (const [name, row] of [
      ['ops-worker', worker],
      ['Vercel', vercel]
    ] as const) {
      if (!row) continue

      if (row.latest_explicit_version && row.latest_explicit_version !== configuredWrite.version) {
        severity = 'error'
        divergences.push(
          `${name} pidió ${row.latest_explicit_version} en su última request y este runtime configura ${configuredWrite.version}`
        )
      }

      if (row.legacy_after_cutoff_rows > 0) {
        severity = 'error'
        divergences.push(`${name}: ${row.legacy_after_cutoff_rows} fila(s) legacy solicitadas desde el corte`)
      }

      if (row.explicit_rows > 0 && row.contract_recent_rows > 0 && severity !== 'error') {
        severity = 'warning'
        divergences.push(
          `${name}: ${row.contract_recent_rows} fila(s) con evidencia contractual en los últimos ${RECENT_DAYS} días junto a evidencia explícita — un runtime viejo sigue escribiendo`
        )
      }
    }

    const explicitTotal = (worker?.explicit_rows ?? 0) + (vercel?.explicit_rows ?? 0)

    if (divergences.length === 0 && explicitTotal === 0) {
      severity = 'awaiting_data'
    }

    const summary =
      divergences.length > 0
        ? `Drift de metodología ETV: ${divergences.join(' · ')}.`
        : explicitTotal === 0
          ? `Foundation ETV sin evidencia explícita todavía (rollout pendiente): este runtime configura ${configuredWrite.version} (${configuredWrite.source}) para escribir y ${configuredRead.version} para leer.`
          : `Metodología ETV coherente: configurado ${configuredWrite.version} (${configuredWrite.source}); ops-worker y Vercel piden lo mismo; lectura ${configuredRead.version}.`

    return {
      ...base,
      severity,
      summary,
      evidence: [
        { kind: 'metric', label: 'configuredWriteMethod', value: `${configuredWrite.version} (${configuredWrite.source})` },
        { kind: 'metric', label: 'configuredReadMethod', value: `${configuredRead.version} (${configuredRead.source})` },
        { kind: 'metric', label: 'policyVersion', value: configuredWrite.policyVersion },
        { kind: 'metric', label: 'providerCutoffAt', value: ETV_PROVIDER_CUTOFF_ISO },
        { kind: 'metric', label: 'afterCutoff', value: String(afterCutoff) },
        { kind: 'metric', label: 'opsWorker.latestRequestedMethod', value: worker?.latest_explicit_version ?? 'none' },
        { kind: 'metric', label: 'opsWorker.latestRequestedAt', value: toIso(worker?.latest_requested_at ?? null) ?? 'none' },
        { kind: 'metric', label: 'opsWorker.latestPolicyVersion', value: worker?.latest_policy_version ?? 'none' },
        { kind: 'metric', label: 'vercel.latestRequestedMethod', value: vercel?.latest_explicit_version ?? 'none' },
        { kind: 'metric', label: 'vercel.latestRequestedAt', value: toIso(vercel?.latest_requested_at ?? null) ?? 'none' },
        { kind: 'metric', label: 'contractEvidenceRowsLast7d', value: String((worker?.contract_recent_rows ?? 0) + (vercel?.contract_recent_rows ?? 0)) },
        { kind: 'metric', label: 'legacyAfterCutoffRows', value: String((worker?.legacy_after_cutoff_rows ?? 0) + (vercel?.legacy_after_cutoff_rows ?? 0)) },
        { kind: 'metric', label: 'divergences', value: String(divergences.length) }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'reliability_signal_seo_etv_methodology_drift' } })

    return {
      ...base,
      severity: 'unknown',
      summary: 'No fue posible leer la evidencia de metodología ETV. Revisa los logs.',
      evidence: [{ kind: 'metric', label: 'error', value: error instanceof Error ? error.message : String(error) }]
    }
  }
}
