#!/usr/bin/env node
/**
 * TASK-775 Slice 6 — Vercel Cron Async-Critical Gate
 *
 * Bloquea PRs que agreguen entries `async-critical` a vercel.json sin override
 * explícito. Previene la clase de bugs donde un cron crítico se mete en Vercel
 * pero NO corre en staging (Vercel custom environments NO ejecutan crons; solo
 * Production), causando que el flujo downstream calle silenciosamente.
 *
 * Lógica:
 *   1. Lee vercel.json y extrae todos los `crons[].path`.
 *   2. Para cada path, decide si matchea pattern `async_critical` (mismo set
 *      de regexes que el reader runtime).
 *   3. Para cada async-critical, verifica si tiene equivalente Cloud Scheduler
 *      en el snapshot canónico (también compartido con el reader runtime).
 *   4. Honora override `// platform-cron-allowed: <reason>` adyacente al path.
 *   5. Honora exclusion list `KNOWN_NON_ASYNC_CRITICAL_PATHS` (paths legítimos
 *      prod_only/tooling cuyo path matchea pattern).
 *
 * Modos:
 *   - default (error): falla CI con exit=1 si detecta async-critical sin equivalent.
 *   - --warn: emite warning estructurado, exit=0. Para adopción gradual.
 *
 * Uso local:
 *   pnpm vercel-cron-gate
 *   pnpm vercel-cron-gate --warn
 *
 * Uso CI: step en .github/workflows/ci.yml después de checkout:
 *   `node scripts/ci/vercel-cron-async-critical-gate.mjs`
 *
 * Spec: docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md
 *       docs/tasks/in-progress/TASK-775-vercel-cron-async-critical-migration-platform.md (Slice 6)
 *
 * Reader runtime equivalente: src/lib/reliability/queries/cron-staging-drift.ts
 * Si modificas patterns acá, sincroniza con el reader runtime (single source).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ARGS = process.argv.slice(2)
const WARN_MODE = ARGS.includes('--warn')

/**
 * Mantener sincronizado con `src/lib/reliability/queries/cron-staging-drift.ts`.
 * Si emerge un nuevo pattern async-critical, agregarlo en AMBOS lugares.
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
 * Snapshot canónico Cloud Scheduler jobs. Mantener sincronizado con
 * `src/lib/reliability/queries/cron-staging-drift.ts` y con
 * `services/ops-worker/deploy.sh`.
 */
const CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS = {
  // Patrón: solo agregar entry cuando el path Vercel está activo como fallback
  // manual. Si el path NO está en vercel.json, el reliability signal marca
  // orphaned drift. Cuando un cron migra a Cloud Scheduler y se elimina del
  // vercel.json simultáneamente, NO va al snapshot.
}

/**
 * Paths que matchean pattern async-critical pero son legítimamente
 * prod_only/tooling. Mantener sincronizado con runtime reader.
 */
const KNOWN_NON_ASYNC_CRITICAL_PATHS = new Set([
  '/api/cron/sync-previred'
])

const isAsyncCriticalPath = (path) =>
  ASYNC_CRITICAL_PATH_PATTERNS.some((pattern) => pattern.test(path))

const main = () => {
  const vercelJsonPath = resolve(process.cwd(), 'vercel.json')

  let raw

  try {
    raw = readFileSync(vercelJsonPath, 'utf8')
  } catch (error) {
    console.error(`❌ Cannot read vercel.json at ${vercelJsonPath}: ${error.message}`)
    process.exit(1)
  }

  let parsed

  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    console.error(`❌ vercel.json invalid JSON: ${error.message}`)
    process.exit(1)
  }

  const entries = parsed.crons ?? []

  // Detect override comments adjacent to entries
  const allowedPaths = new Set()
  const lines = raw.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.startsWith('// platform-cron-allowed:')) {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const pathMatch = lines[j].match(/"path":\s*"([^"]+)"/)

        if (pathMatch) {
          allowedPaths.add(pathMatch[1])
          break
        }
      }
    }
  }

  const violations = []

  for (const entry of entries) {
    const pathWithoutQuery = entry.path.split('?')[0]

    if (!isAsyncCriticalPath(pathWithoutQuery)) continue

    if (KNOWN_NON_ASYNC_CRITICAL_PATHS.has(pathWithoutQuery)) continue

    if (allowedPaths.has(entry.path)) continue

    if (CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS[pathWithoutQuery]) continue

    violations.push({ path: entry.path, schedule: entry.schedule })
  }

  console.log(`\n→ Vercel Cron Async-Critical Gate (TASK-775 Slice 6)`)
  console.log(`  vercel.json entries: ${entries.length}`)
  console.log(`  async-critical detected: ${violations.length}`)

  if (violations.length === 0) {
    console.log('\n✅ Sin drift. Todos los crons async-critical tienen equivalente Cloud Scheduler o están explícitamente exonerados.\n')
    process.exit(0)
  }

  const severity = WARN_MODE ? '⚠️  WARN' : '❌ ERROR'

  console.log(`\n${severity} — ${violations.length} cron(s) async-critical en Vercel sin equivalente Cloud Scheduler:\n`)

  for (const v of violations) {
    console.log(`  • ${v.path} (${v.schedule})`)
  }

  console.log(`\nQué hacer:`)
  console.log(`  1. Migrar el handler a services/ops-worker/server.ts (usar wrapCronHandler).`)
  console.log(`  2. Agregar Cloud Scheduler job en services/ops-worker/deploy.sh.`)
  console.log(`  3. Agregar mapping en CLOUD_SCHEDULER_JOBS_FOR_VERCEL_CRONS:`)
  console.log(`     - src/lib/reliability/queries/cron-staging-drift.ts`)
  console.log(`     - scripts/ci/vercel-cron-async-critical-gate.mjs`)
  console.log(`  4. Si el cron es legítimo prod_only/tooling, agregarlo a KNOWN_NON_ASYNC_CRITICAL_PATHS`)
  console.log(`     o agregar comentario "// platform-cron-allowed: <razón>" adyacente en vercel.json.`)
  console.log(`\nSpec: docs/architecture/GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md\n`)

  if (WARN_MODE) {
    process.exit(0)
  }

  process.exit(1)
}

main()
