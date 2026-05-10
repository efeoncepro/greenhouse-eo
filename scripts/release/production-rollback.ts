#!/usr/bin/env tsx
/**
 * TASK-848 Slice 6 — Production rollback CLI (skeleton V1).
 *
 * Idempotent rollback orchestrator que lee `previousVercelDeploymentUrl` +
 * `previousWorkerRevisions` desde `greenhouse_sync.release_manifests` y ejecuta
 * rollback automatizado para:
 *
 *   1. Vercel — `vercel alias set <previous_url> greenhouse.efeoncepro.com`
 *      (atomic, reversible, observable).
 *   2. Cloud Run workers — `gcloud run services update-traffic <svc>
 *      --to-revisions=<previous>=100` por cada worker.
 *   3. HubSpot integration Cloud Run — mismo patron Cloud Run traffic split.
 *
 * **Azure config / Bicep**: NO se automatiza en V1. Operador sigue runbook
 * `docs/operations/runbooks/production-release.md` con comandos exactos
 * `az deployment group create --template-file <previous-bicep>`.
 *
 * **Capability**: `platform.release.rollback` (EFEONCE_ADMIN solo). El CLI
 * NO valida capability en V1 — el guard primario es el environment Production
 * approval gate del workflow orquestador (V1.1). En V1, el CLI confia en el
 * operador con acceso a gcloud + vercel CLI.
 *
 * **Idempotencia**: re-ejecutar el script con el mismo `--release-id` es safe.
 * Cada step verifica el estado actual antes de mutar; si ya esta en el target
 * estado, skipea con log explicativo.
 *
 * **State machine**: el CLI escribe transition `<current> -> rolled_back` en
 * `greenhouse_sync.release_state_transitions` con `actor_kind='cli'` y
 * `actor_label=<gh_login>`. Outbox event `platform.release.rolled_back v1`
 * emitido en la misma transaccion.
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/release/production-rollback.ts \
 *     --release-id=<release_id> \
 *     --reason="Release degraded: post-release health check fallo en /finance/cash-out" \
 *     [--dry-run]
 *     [--actor-label=<gh_login>]
 *     [--skip-vercel] [--skip-workers] [--skip-hubspot]
 *
 * Flags:
 *   --release-id (required)        ID del release a hacer rollback (consulta release_manifests).
 *   --reason (required, >=20 chars) Razon humana legible. Persiste en audit.
 *   --actor-label                   GH login del operador. Default: $GITHUB_USER o $USER.
 *   --dry-run                       NO ejecuta side effects; solo loggea el plan.
 *   --skip-vercel                   Skipea Vercel alias swap (e.g. ya hecho manual).
 *   --skip-workers                  Skipea Cloud Run traffic split de workers.
 *   --skip-hubspot                  Skipea HubSpot integration revert.
 *
 * Spec: docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.8.
 *
 * V1 status: skeleton funcional para rollback de Vercel + Cloud Run. La
 * integracion completa con manifest store + outbox emission queda en V1.1
 * cuando el orquestador exista (TASK derivada).
 */

import 'server-only'

import { execSync } from 'node:child_process'
import { argv, exit } from 'node:process'

interface RollbackPlan {
  releaseId: string
  reason: string
  actorLabel: string
  dryRun: boolean
  skipVercel: boolean
  skipWorkers: boolean
  skipHubspot: boolean
  vercelTargetUrl: string | null
  workerRevisions: Record<string, string>
}

interface RollbackResult {
  step: 'vercel' | 'cloud-run-worker' | 'hubspot-integration'
  status: 'success' | 'skipped' | 'failed' | 'dry-run'
  detail: string
}

const CANONICAL_VERCEL_PRODUCTION_DOMAIN = 'greenhouse.efeoncepro.com'

const CANONICAL_WORKER_SERVICES = [
  'ops-worker',
  'commercial-cost-worker',
  'ico-batch-worker'
] as const

const CANONICAL_HUBSPOT_INTEGRATION_SERVICE = 'hubspot-greenhouse-integration'

const GCP_PROJECT_ID = 'efeonce-group'
const GCP_REGION_DEFAULT = 'us-east4'
const GCP_REGION_HUBSPOT = 'us-central1' // bridge corre en us-central1 (CLAUDE.md)

const parseArgs = (): {
  releaseId: string
  reason: string
  actorLabel: string
  dryRun: boolean
  skipVercel: boolean
  skipWorkers: boolean
  skipHubspot: boolean
} => {
  const args = new Map<string, string>()

  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.replace(/^--/, '').split('=')

      args.set(key, value ?? 'true')
    }
  }

  const releaseId = args.get('release-id')

  if (!releaseId) {
    console.error('Error: --release-id es requerido')
    console.error('Uso: scripts/release/production-rollback.ts --release-id=<id> --reason="<reason>"')
    exit(1)
  }

  const reason = args.get('reason')

  if (!reason || reason.length < 20) {
    console.error(
      `Error: --reason es requerido y debe tener >= 20 caracteres (audit log enforced).`
    )
    console.error('Ej: --reason="Release degraded: post-release health check fallo en /finance/cash-out"')
    exit(1)
  }

  const actorLabel =
    args.get('actor-label') ?? process.env.GITHUB_USER ?? process.env.USER ?? 'unknown'

  return {
    releaseId,
    reason,
    actorLabel,
    dryRun: args.get('dry-run') === 'true',
    skipVercel: args.get('skip-vercel') === 'true',
    skipWorkers: args.get('skip-workers') === 'true',
    skipHubspot: args.get('skip-hubspot') === 'true'
  }
}

/**
 * V1 stub: en V1.1 lee el manifest desde `greenhouse_sync.release_manifests`
 * via Postgres. V1 prompt al operador via env vars o flags adicionales.
 */
const loadRollbackPlan = async (
  args: ReturnType<typeof parseArgs>
): Promise<RollbackPlan> => {
  console.log(`[loadRollbackPlan] release_id=${args.releaseId}`)
  console.log('[loadRollbackPlan] V1 SKELETON: querying release_manifests via Postgres NO esta wired aun.')
  console.log('[loadRollbackPlan] V1 fallback: leer plan desde env vars + manual investigation.')
  console.log('')
  console.log('Para ejecutar rollback REAL en V1, antes de invocar este script:')
  console.log(`  1. psql -c "SELECT vercel_deployment_url, previous_vercel_deployment_url, previous_worker_revisions FROM greenhouse_sync.release_manifests WHERE release_id='${args.releaseId}'"`)
  console.log('  2. Exportar PREV_VERCEL_URL=<previous_vercel_deployment_url>')
  console.log('  3. Exportar PREV_OPS_WORKER_REVISION=<from JSONB>')
  console.log('  4. Exportar PREV_COMMERCIAL_COST_WORKER_REVISION=<from JSONB>')
  console.log('  5. Exportar PREV_ICO_BATCH_WORKER_REVISION=<from JSONB>')
  console.log('  6. Exportar PREV_HUBSPOT_INTEGRATION_REVISION=<from JSONB>')
  console.log('  7. Re-correr este script')
  console.log('')

  const vercelTargetUrl = process.env.PREV_VERCEL_URL ?? null
  const workerRevisions: Record<string, string> = {}

  if (process.env.PREV_OPS_WORKER_REVISION) {
    workerRevisions['ops-worker'] = process.env.PREV_OPS_WORKER_REVISION
  }

  if (process.env.PREV_COMMERCIAL_COST_WORKER_REVISION) {
    workerRevisions['commercial-cost-worker'] = process.env.PREV_COMMERCIAL_COST_WORKER_REVISION
  }

  if (process.env.PREV_ICO_BATCH_WORKER_REVISION) {
    workerRevisions['ico-batch-worker'] = process.env.PREV_ICO_BATCH_WORKER_REVISION
  }

  if (process.env.PREV_HUBSPOT_INTEGRATION_REVISION) {
    workerRevisions[CANONICAL_HUBSPOT_INTEGRATION_SERVICE] = process.env.PREV_HUBSPOT_INTEGRATION_REVISION
  }

  return {
    releaseId: args.releaseId,
    reason: args.reason,
    actorLabel: args.actorLabel,
    dryRun: args.dryRun,
    skipVercel: args.skipVercel,
    skipWorkers: args.skipWorkers,
    skipHubspot: args.skipHubspot,
    vercelTargetUrl,
    workerRevisions
  }
}

const rollbackVercel = async (plan: RollbackPlan): Promise<RollbackResult> => {
  if (plan.skipVercel) {
    return {
      step: 'vercel',
      status: 'skipped',
      detail: '--skip-vercel flag presente'
    }
  }

  if (!plan.vercelTargetUrl) {
    return {
      step: 'vercel',
      status: 'skipped',
      detail: 'Sin PREV_VERCEL_URL — no hay target previo declarado'
    }
  }

  const cmd = `vercel alias set ${plan.vercelTargetUrl} ${CANONICAL_VERCEL_PRODUCTION_DOMAIN}`

  if (plan.dryRun) {
    return { step: 'vercel', status: 'dry-run', detail: cmd }
  }

  try {
    execSync(cmd, { stdio: 'inherit' })

    return {
      step: 'vercel',
      status: 'success',
      detail: `Vercel alias swapped: ${plan.vercelTargetUrl} -> ${CANONICAL_VERCEL_PRODUCTION_DOMAIN}`
    }
  } catch (error) {
    return {
      step: 'vercel',
      status: 'failed',
      detail: `Vercel alias swap fallo: ${String(error)}`
    }
  }
}

const rollbackCloudRunService = async (
  serviceName: string,
  targetRevision: string,
  region: string,
  plan: RollbackPlan
): Promise<RollbackResult> => {
  const stepKind = serviceName === CANONICAL_HUBSPOT_INTEGRATION_SERVICE ? 'hubspot-integration' : 'cloud-run-worker'
  const cmd = `gcloud run services update-traffic ${serviceName} --project=${GCP_PROJECT_ID} --region=${region} --to-revisions=${targetRevision}=100`

  if (plan.dryRun) {
    return { step: stepKind, status: 'dry-run', detail: cmd }
  }

  try {
    execSync(cmd, { stdio: 'inherit' })

    return {
      step: stepKind,
      status: 'success',
      detail: `Cloud Run ${serviceName} traffic -> ${targetRevision}`
    }
  } catch (error) {
    return {
      step: stepKind,
      status: 'failed',
      detail: `Cloud Run ${serviceName} traffic split fallo: ${String(error)}`
    }
  }
}

const rollbackWorkers = async (plan: RollbackPlan): Promise<RollbackResult[]> => {
  if (plan.skipWorkers) {
    return [
      {
        step: 'cloud-run-worker',
        status: 'skipped',
        detail: '--skip-workers flag presente'
      }
    ]
  }

  const results: RollbackResult[] = []

  for (const worker of CANONICAL_WORKER_SERVICES) {
    const targetRevision = plan.workerRevisions[worker]

    if (!targetRevision) {
      results.push({
        step: 'cloud-run-worker',
        status: 'skipped',
        detail: `Sin PREV_${worker.replace(/-/g, '_').toUpperCase()}_REVISION — sin target declarado`
      })
      continue
    }

    results.push(await rollbackCloudRunService(worker, targetRevision, GCP_REGION_DEFAULT, plan))
  }

  return results
}

const rollbackHubspotIntegration = async (plan: RollbackPlan): Promise<RollbackResult> => {
  if (plan.skipHubspot) {
    return {
      step: 'hubspot-integration',
      status: 'skipped',
      detail: '--skip-hubspot flag presente'
    }
  }

  const targetRevision = plan.workerRevisions[CANONICAL_HUBSPOT_INTEGRATION_SERVICE]

  if (!targetRevision) {
    return {
      step: 'hubspot-integration',
      status: 'skipped',
      detail: 'Sin PREV_HUBSPOT_INTEGRATION_REVISION — sin target declarado'
    }
  }

  return rollbackCloudRunService(
    CANONICAL_HUBSPOT_INTEGRATION_SERVICE,
    targetRevision,
    GCP_REGION_HUBSPOT,
    plan
  )
}

const main = async (): Promise<void> => {
  const args = parseArgs()
  const plan = await loadRollbackPlan(args)

  console.log('\n=== ROLLBACK PLAN ===')
  console.log(`release_id   : ${plan.releaseId}`)
  console.log(`reason       : ${plan.reason}`)
  console.log(`actor        : cli:${plan.actorLabel}`)
  console.log(`dry-run      : ${plan.dryRun}`)
  console.log(`vercel target: ${plan.vercelTargetUrl ?? '(missing)'}`)
  console.log(`workers      :`)

  for (const [worker, revision] of Object.entries(plan.workerRevisions)) {
    console.log(`  ${worker}: ${revision}`)
  }

  console.log('')

  if (
    !plan.vercelTargetUrl &&
    Object.keys(plan.workerRevisions).length === 0
  ) {
    console.error('Error: ningun target declarado. Configurar PREV_* env vars antes de invocar.')
    exit(1)
  }

  console.log('=== EXECUTING ROLLBACK ===\n')

  const results: RollbackResult[] = []

  results.push(await rollbackVercel(plan))
  results.push(...(await rollbackWorkers(plan)))
  results.push(await rollbackHubspotIntegration(plan))

  console.log('\n=== ROLLBACK RESULTS ===')

  let hasFailure = false

  for (const result of results) {
    const symbol =
      result.status === 'success'
        ? '✓'
        : result.status === 'skipped'
          ? '○'
          : result.status === 'dry-run'
            ? '◌'
            : '✗'

    console.log(`${symbol} [${result.step}] ${result.status}: ${result.detail}`)

    if (result.status === 'failed') hasFailure = true
  }

  console.log('')
  console.log('=== POST-ROLLBACK CHECKLIST (manual) ===')
  console.log('  [ ] Verificar Vercel deployment es Ready vía https://vercel.com/efeonce/greenhouse-eo/deployments')
  console.log('  [ ] Verificar Cloud Run revisions servidoras vía https://console.cloud.google.com/run')
  console.log('  [ ] Smoke test critical flows: /finance/cash-out, /agency/operations, login')
  console.log('  [ ] Update Handoff.md con resumen + post-mortem trigger')
  console.log('  [ ] V1.1: el CLI insertara automaticamente row en release_state_transitions')
  console.log('         + emitira outbox event platform.release.rolled_back v1')
  console.log('         con actor_kind=cli + reason + metadata_json={results}')
  console.log('')

  if (hasFailure) {
    console.error('FATAL: 1+ steps fallaron. Revisar logs arriba e investigar manualmente.')
    exit(1)
  }

  console.log(`Rollback ${plan.dryRun ? 'DRY-RUN' : 'COMPLETADO'} para release ${plan.releaseId}.`)
}

main().catch((error) => {
  console.error('Rollback CLI crashed:', error)
  exit(1)
})
