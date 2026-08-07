/**
 * TASK-1304 — Smoke REAL E2E de site audit + backlinks contra DataForSEO y PG reales.
 *
 * Ejercita el ciclo completo a nivel dominio (sin HTTP del worker): queueSiteAudit
 * (task_post OnPage real, crawl acotado) → collect en loop (poll idempotente hasta
 * materializar) → re-collect (no duplica) → readSiteAuditReport → captureBacklinkSnapshot
 * (summary + new/lost reales) → re-run (already_captured, USD 0) → readBacklinkProfile →
 * mirrors BQ manuales (el worker desplegado aún no conoce las projections nuevas) →
 * signal. Gasta dinero REAL (≈ USD 0.05–0.10) bajo el gate de entitlement del target.
 *
 * Deja datos REALES (un audit run + un backlink snapshot del día para el target) — es
 * dogfooding legítimo, mismo patrón que el smoke de TASK-1303.
 *
 * Uso (proxy PG en 127.0.0.1:15432 + ADC):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_smoke-task-1304-live.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

process.env.GROWTH_SEO_ENABLED = 'true'
process.env.DATAFORSEO_API_LOGIN = process.env.DATAFORSEO_API_LOGIN ?? 'jreyes@efeoncepro.com'
process.env.DATAFORSEO_API_PASSWORD_SECRET_REF =
  process.env.DATAFORSEO_API_PASSWORD_SECRET_REF ?? 'greenhouse-dataforseo-api-password'

// El crawl OnPage puede pasar >10 min en la cola del proveedor: la ventana es
// configurable y el smoke es RE-EJECUTABLE (el enqueue re-entrante devuelve
// `audit_already_running` y el ciclo continúa con el run existente).
const SMOKE_MAX_CRAWL_PAGES = 10
const COLLECT_POLL_INTERVAL_MS = Number(process.env.SMOKE_POLL_INTERVAL_MS ?? 30_000)
const COLLECT_MAX_POLLS = Number(process.env.SMOKE_MAX_POLLS ?? 20)

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const main = async () => {
  // El transporte LANZA si el runtime no registró el contador de gasto (contrato TASK-1300).
  await import('@/lib/growth/seo/register-provider-spend')

  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { queueSiteAudit } = await import('@/lib/growth/seo/site-audit/queue-audit')
  const { collectSiteAuditRuns } = await import('@/lib/growth/seo/site-audit/collect')
  const { readSiteAuditReport } = await import('@/lib/growth/seo/site-audit/reader')
  const { captureBacklinkSnapshot } = await import('@/lib/growth/seo/backlinks/capture')
  const { readBacklinkProfile } = await import('@/lib/growth/seo/backlinks/reader')
  const { mirrorSiteAuditRunToBq } = await import('@/lib/growth/seo/site-audit/site-audit-history-bq-mirror')
  const { mirrorBacklinkSnapshotsToBq } = await import('@/lib/growth/seo/backlinks/backlink-history-bq-mirror')
  const { getSeoAuditStuckTasksSignal } = await import('@/lib/reliability/queries/seo-audit-stuck-tasks')

  const targets = await runGreenhousePostgresQuery<{ seo_target_id: string; root_domain: string }>(
    `SELECT t.seo_target_id, t.root_domain
       FROM greenhouse_growth.seo_targets t
      WHERE t.status = 'active'
        AND EXISTS (
          SELECT 1 FROM greenhouse_client_portal.module_assignments ma
           WHERE ma.organization_id = t.organization_id
             AND ma.module_key = 'seo_v1'
             AND ma.effective_to IS NULL
             AND ma.status IN ('active', 'pilot')
        )
      ORDER BY t.created_at
      LIMIT 1`
  )

  const target = targets[0]

  if (!target) {
    throw new Error('No hay target SEO elegible para el smoke.')
  }

  console.log(`\n═══ Smoke TASK-1304 sobre ${target.root_domain} (${target.seo_target_id}) ═══\n`)

  // ── 1. Enqueue (task_post OnPage real, crawl acotado) ──
  console.log(`[1] queueSiteAudit (max_crawl_pages=${SMOKE_MAX_CRAWL_PAGES})…`)

  const queued = await queueSiteAudit(target.seo_target_id, 'system:task-1304-smoke', {
    maxCrawlPages: SMOKE_MAX_CRAWL_PAGES
  })

  console.log('    →', JSON.stringify(queued))

  if (!queued.ok) {
    if (queued.errorCode === 'audit_already_running' || queued.errorCode === 'already_captured_today') {
      console.log('    (idempotencia: ya hay un run del día — el smoke sigue con el existente)')
    } else {
      throw new Error(`enqueue falló: ${queued.errorCode}`)
    }
  }

  // ── 2. Collect en loop hasta materializar ──
  console.log('\n[2] collect (poll idempotente, cada 30 s)…')

  let materialized = false

  for (let poll = 1; poll <= COLLECT_MAX_POLLS; poll += 1) {
    const summary = await collectSiteAuditRuns()

    console.log(
      `    poll ${poll}: pending=${summary.pending} materialized=${summary.materialized} ` +
      `inProgress=${summary.inProgress} pollFailed=${summary.pollFailed}`
    )

    if (summary.pollFailed > 0) {
      console.log('    ⚠ poll_failed — revisar transporte summary/pages (variante de endpoint)')
    }

    if (summary.materialized > 0) {
      materialized = true
      console.log('    outcome:', JSON.stringify(summary.outcomes))
      break
    }

    if (summary.pending === 0) {
      console.log('    (sin runs pendientes — ya materializado por un ciclo anterior)')
      materialized = true
      break
    }

    await sleep(COLLECT_POLL_INTERVAL_MS)
  }

  if (!materialized) {
    throw new Error('El crawl no completó dentro de la ventana del smoke (task queda running; re-correr collect después).')
  }

  // ── 3. Re-collect: idempotencia (no duplica, no re-materializa) ──
  const recheck = await collectSiteAuditRuns()

  console.log(`\n[3] re-collect → pending=${recheck.pending} materialized=${recheck.materialized} (esperado 0/0)`)

  // ── 4. Reader del audit ──
  const report = await readSiteAuditReport(target.seo_target_id)

  if (!report.ok) {
    throw new Error(`readSiteAuditReport degradó: ${report.errorCode}`)
  }

  console.log(
    `\n[4] readSiteAuditReport → status=${report.run.status} health=${report.run.healthScore} ` +
    `pages=${report.run.crawledPages} findings: ${report.totals.critical}c/${report.totals.warning}w/${report.totals.notice}n`
  )

  // ── 5. Backlink snapshot real + idempotencia ──
  console.log('\n[5] captureBacklinkSnapshot…')

  const captured = await captureBacklinkSnapshot(target.seo_target_id, 'system:task-1304-smoke')

  console.log('    →', JSON.stringify(captured))

  const recaptured = await captureBacklinkSnapshot(target.seo_target_id, 'system:task-1304-smoke')

  if (recaptured.ok && recaptured.status === 'already_captured' && recaptured.providerCostUsd === 0) {
    console.log('    re-run → already_captured con USD 0 (idempotencia sin gasto) ✓')
  } else {
    console.log('    ⚠ re-run inesperado:', JSON.stringify(recaptured))
  }

  const profile = await readBacklinkProfile(target.seo_target_id, { rangeDays: 30 })

  if (!profile.ok) {
    throw new Error(`readBacklinkProfile degradó: ${profile.errorCode}`)
  }

  console.log(
    `    readBacklinkProfile → ${profile.points.length} punto(s); último: ` +
    JSON.stringify(profile.points[profile.points.length - 1])
  )

  // ── 6. Mirrors BQ (manuales: el worker desplegado aún no conoce las projections) ──
  const auditMirror = await mirrorSiteAuditRunToBq(report.run.auditRunId)

  console.log(`\n[6] mirror audit → rowsMirrored=${auditMirror.rowsMirrored}`)

  const captureDate = profile.points[profile.points.length - 1]?.date

  if (captureDate) {
    const backlinkMirror = await mirrorBacklinkSnapshotsToBq(target.seo_target_id, captureDate)

    console.log(`    mirror backlinks → rowsMirrored=${backlinkMirror.rowsMirrored}`)
  }

  // ── 7. Signal ──
  const signal = await getSeoAuditStuckTasksSignal()

  console.log(`\n[7] signal seo.audit.stuck_tasks → severity=${signal.severity} — ${signal.summary}`)

  // ── 8. Gasto registrado por el transporte ──
  const spend = await runGreenhousePostgresQuery<{ family: string; call_count: number; provider_cost_usd: string }>(
    `SELECT family, call_count, provider_cost_usd::text
       FROM greenhouse_growth.seo_provider_spend_daily
      WHERE spend_date = CURRENT_DATE
        AND family IN ('onpage', 'backlinks')
      ORDER BY family`
  )

  console.log('\n[8] ledger de gasto del día:', JSON.stringify(spend))

  console.log('\nOK — smoke E2E completo.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('\nSMOKE FAILED:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
