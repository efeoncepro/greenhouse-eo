import 'server-only'

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-775 Slice 5 — Reliability signal: cron staging drift.
 *
 * Detecta divergencia entre `vercel.json` (crons que corren solo en
 * Production) y el snapshot conocido de Cloud Scheduler jobs (corren en
 * cualquier environment). El bug class que cierra es: cron `async_critical`
 * agregado a Vercel sin equivalente Cloud Scheduler → invisible en staging,
 * QA cree que el flow funciona pero el side effect downstream calla.
 *
 * **Snapshot estático embebido**: el reader contiene el set canónico de
 * Cloud Scheduler jobs definidos en `services/ops-worker/deploy.sh`. Razón:
 * llamar gcloud API en cada hit de /admin/operations es caro y agrega
 * failure surface. Cuando se agrega/quita un job a `deploy.sh`, también se
 * actualiza el set en este reader (1 archivo coordinado, simétrico con
 * la fuente de verdad de schedule).
 *
 * **Patterns async_critical**: el reader pattern-matches paths Vercel
 * contra prefijos canónicos (`outbox*`, `sync-*`, `webhook-*`, etc.) que
 * indican "este cron alimenta o consume pipeline async". Si el path
 * matchea Y no tiene equivalente Cloud Scheduler → drift.
 *
 * **Override block**: si una entrada Vercel matchea pattern pero es
 * legítima `prod_only` o `tooling`, agregar comentario adyacente al JSON:
 *   // platform-cron-allowed: <reason>
 * El reader honra ese override leyendo el comentario adjacente al path.
 *
 * **Kind**: `drift`. Steady state esperado = 0.
 * **Severidad**: `error` cuando count > 0. Bug crítico — cron async-critical
 * está en Vercel sin Cloud Scheduler equivalent.
 *
 * Pattern reference: TASK-773 Slice 4 (outbox-unpublished-lag.ts).
 */
export const PLATFORM_CRON_STAGING_DRIFT_SIGNAL_ID = 'platform.cron.staging_drift'

/**
 * Path patterns que clasifican un cron Vercel como `async_critical` (debe
 * tener equivalente Cloud Scheduler). Mantener sincronizado con la lint
 * rule `scripts/ci/vercel-cron-async-critical-gate.mjs` (Slice 6).
 *
 * Override: agregar comentario `// platform-cron-allowed: <reason>` en
 * vercel.json adyacente a la entry.
 */
const ASYNC_CRITICAL_PATH_PATTERNS = [
  /\/api\/cron\/outbox/i,
  /\/api\/cron\/sync-/i,
  /\/api\/cron\/.*-publish/i,
  /\/api\/cron\/webhook-/i,
  /\/api\/cron\/hubspot-/i,
  /\/api\/cron\/entra-/i,
  /\/api\/cron\/nubox-/i,
  /\/api\/cron\/ico-/i,
  /\/api\/cron\/.*-monitor/i,
  /\/api\/cron\/email-delivery-retry/i,
  /\/api\/cron\/reconciliation-auto-match/i
]

/**
 * Paths que matchean pattern `async_critical` pero son legítimamente `prod_only`
 * o `tooling` (no requieren Cloud Scheduler). Mantener sincronizado con spec
 * `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` sección "Las 3 categorías canónicas".
 *
 * Razón: el operador puede agregar override comment `// platform-cron-allowed:`
 * en vercel.json (vercel.json es strict JSON, pero el reader scan-ea raw text),
 * o el path puede ser estructuralmente prod_only (ej. Chile-only previred sync
 * cuyo dataset es solo accesible en producción real).
 *
 * Cuando agregues un cron prod_only/tooling cuyo path matchea pattern async-critical,
 * incluí su path acá.
 */
const KNOWN_NON_ASYNC_CRITICAL_PATHS = new Set<string>([
  '/api/cron/sync-previred' // prod_only: Chile Previred — dataset solo en producción
])

/**
 * Snapshot canónico de Cloud Scheduler jobs definidos en
 * `services/ops-worker/deploy.sh`. Cada vez que se agrega/quita un job
 * allá, también se actualiza este set.
 *
 * Mapping: cron path Vercel async-critical (que esperaríamos ver fallback en
 * vercel.json) → cloud scheduler job name. Solo entries cuyo Vercel path
 * sigue activo en vercel.json como fallback manual. Si una entry se quita
 * de vercel.json (no scheduled), también se quita del mapping para evitar
 * orphaned drift.
 *
 * Post-TASK-773 Slice 4: outbox-publish fue removido de vercel.json (Cloud
 * Scheduler es ahora el único trigger canónico, sin Vercel fallback). Si
 * Slices 2/3/7 dejan algún cron con fallback Vercel manual, agregar mapping.
 */
const CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS: Record<string, string> = {}

interface VercelCronEntry {
  path: string
  schedule: string
  /** True si la entry tiene comentario `// platform-cron-allowed:` adyacente */
  isExplicitlyAllowed: boolean
}

/**
 * Serverless runtime fallback.
 *
 * In Vercel standalone output the repository root is not guaranteed to exist
 * at `process.cwd()`; production can execute from `/app` without `vercel.json`.
 * The reliability reader must observe the deployed contract, not crash the
 * whole AI observer because a source-control file is absent from the bundle.
 *
 * Keep this snapshot in lockstep with root `vercel.json`. The CI gate still
 * reads the real file in repository checkouts; this fallback is only for
 * runtime reliability reads.
 */
const CANONICAL_VERCEL_CRON_ENTRIES: readonly VercelCronEntry[] = Object.freeze([
  {
    path: '/api/finance/economic-indicators/sync',
    schedule: '5 23 * * *',
    isExplicitlyAllowed: false
  },
  {
    path: '/api/cron/sync-previred',
    schedule: '15 8 * * *',
    isExplicitlyAllowed: false
  },
  {
    path: '/api/cron/reliability-synthetic',
    schedule: '*/30 * * * *',
    isExplicitlyAllowed: false
  },
  {
    path: '/api/cron/notion-delivery-data-quality',
    schedule: '0 10 * * *',
    isExplicitlyAllowed: false
  },
  {
    path: '/api/cron/email-data-retention',
    schedule: '0 3 * * 0',
    isExplicitlyAllowed: false
  },
  {
    path: '/api/cron/fx-sync-latam?window=morning',
    schedule: '0 9 * * *',
    isExplicitlyAllowed: false
  },
  {
    path: '/api/cron/fx-sync-latam?window=midday',
    schedule: '0 14 * * *',
    isExplicitlyAllowed: false
  },
  {
    path: '/api/cron/fx-sync-latam?window=evening',
    schedule: '0 22 * * *',
    isExplicitlyAllowed: false
  }
])

const parseVercelCrons = (): VercelCronEntry[] => {
  const vercelJsonPath = resolve(process.cwd(), 'vercel.json')
  let raw: string

  try {
    raw = readFileSync(vercelJsonPath, 'utf8')
  } catch {
    return [...CANONICAL_VERCEL_CRON_ENTRIES]
  }

  // Parse JSON (Vercel's vercel.json is strict JSON, not JSONC).
  let parsed: { crons?: Array<{ path: string; schedule: string }> }

  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    throw new Error(
      `vercel.json invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`
    )
  }

  const entries = parsed.crons ?? []

  // Detect override comments: search the raw text for lines like
  //   // platform-cron-allowed: <reason>
  // immediately preceding an entry's path. Since vercel.json is strict JSON,
  // comments don't validate against the parser — but we read the raw text
  // for documentation/override purposes only.
  const allowedPaths = new Set<string>()
  const lines = raw.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('// platform-cron-allowed:')) {
      // Look ahead for the next "path": entry
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const pathMatch = lines[j].match(/"path":\s*"([^"]+)"/)

        if (pathMatch) {
          allowedPaths.add(pathMatch[1])
          break
        }
      }
    }
  }

  return entries.map(entry => ({
    path: entry.path,
    schedule: entry.schedule,
    isExplicitlyAllowed: allowedPaths.has(entry.path)
  }))
}

const isAsyncCriticalPath = (path: string): boolean =>
  ASYNC_CRITICAL_PATH_PATTERNS.some(pattern => pattern.test(path))

/**
 * Calcula drift entre Vercel cron entries y Cloud Scheduler snapshot.
 *
 * Drift detected:
 *   - Vercel async_critical sin Cloud Scheduler mapping (no migrado)
 *   - Cloud Scheduler mapping con Vercel path no presente (cleanup pendiente)
 */
interface DriftDetail {
  path: string
  reason: 'missing_cloud_scheduler' | 'orphaned_mapping'
  schedule?: string
}

const computeDrift = (vercelEntries: VercelCronEntry[]): DriftDetail[] => {
  const drift: DriftDetail[] = []
  const vercelPaths = new Set(vercelEntries.map(e => e.path))

  // Direction 1: Vercel async_critical sin Cloud Scheduler equivalent
  for (const entry of vercelEntries) {
    // Strip query string for pattern matching (e.g. "?full=true")
    const pathWithoutQuery = entry.path.split('?')[0]

    if (!isAsyncCriticalPath(pathWithoutQuery)) continue

    // Honor explicit non-async-critical exclusion (prod_only/tooling whitelist)
    if (KNOWN_NON_ASYNC_CRITICAL_PATHS.has(pathWithoutQuery)) continue

    // Honor override comment in vercel.json adjacent to entry
    if (entry.isExplicitlyAllowed) continue

    // Check if has Cloud Scheduler mapping
    const cloudSchedulerJob = CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS[pathWithoutQuery]

    if (!cloudSchedulerJob) {
      drift.push({
        path: entry.path,
        reason: 'missing_cloud_scheduler',
        schedule: entry.schedule
      })
    }
  }

  // Direction 2: Cloud Scheduler mapping with no Vercel fallback path
  for (const [vercelPath, jobName] of Object.entries(CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS)) {
    if (!vercelPaths.has(vercelPath)) {
      drift.push({
        path: vercelPath,
        reason: 'orphaned_mapping',
        schedule: jobName
      })
    }
  }

  return drift
}

export const getCronStagingDriftSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const vercelEntries = parseVercelCrons()
    const drift = computeDrift(vercelEntries)
    const count = drift.length

    return {
      signalId: PLATFORM_CRON_STAGING_DRIFT_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'drift',
      source: 'getCronStagingDriftSignal',
      label: 'Vercel cron ↔ Cloud Scheduler drift',
      severity: count === 0 ? 'ok' : 'error',
      summary:
        count === 0
          ? 'Vercel cron async-critical alineados con Cloud Scheduler. Sin drift.'
          : `${count} cron${count === 1 ? '' : 's'} con drift detectado entre Vercel y Cloud Scheduler. Async-critical en Vercel sin equivalente Cloud Scheduler = invisible en staging.`,
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'count',
          value: String(count)
        },
        {
          kind: 'metric',
          label: 'vercel_total_entries',
          value: String(vercelEntries.length)
        },
        ...(drift.slice(0, 5).map(d => ({
          kind: 'metric' as const,
          label: `drift_${d.reason}`,
          value: `${d.path}${d.schedule ? ` (${d.schedule})` : ''}`
        }))),
        {
          kind: 'doc',
          label: 'Spec',
          value: 'docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md'
        }
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'sync', {
      tags: { source: 'reliability_signal_cron_staging_drift' }
    })

    return {
      signalId: PLATFORM_CRON_STAGING_DRIFT_SIGNAL_ID,
      moduleKey: 'sync',
      kind: 'drift',
      source: 'getCronStagingDriftSignal',
      label: 'Vercel cron ↔ Cloud Scheduler drift',
      severity: 'unknown',
      summary: 'No fue posible leer vercel.json o procesar el snapshot. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}

// Exports for testing + reuse by lint gate (Slice 6)
export {
  ASYNC_CRITICAL_PATH_PATTERNS,
  CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS,
  KNOWN_NON_ASYNC_CRITICAL_PATHS
}
