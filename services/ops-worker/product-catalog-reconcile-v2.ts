import 'server-only'

import {
  detectProductDriftV2,
  persistDriftReport,
  type ProductCatalogDriftSnapshot
} from '@/lib/commercial/product-catalog/drift-detector-v2'
import { query } from '@/lib/db'
import {
  getHubSpotGreenhouseProductCatalog,
  type HubSpotGreenhouseProductProfile
} from '@/lib/integrations/hubspot-greenhouse-service'

// ─────────────────────────────────────────────────────────────
// TASK-605 Slice 6 — Weekly reconcile job.
//
// Fetches the full HubSpot catalog via the middleware v2 endpoint, loads
// the matching Greenhouse `product_catalog` snapshot per product, runs
// `detectProductDriftV2`, and persists the reports to `source_sync_runs`
// with `source_system='product_catalog_reconcile'`. The admin UI already
// consumes these from the source_sync_runs table in each product's detail
// tab (TASK-604 + TASK-605 wired).
//
// Slack alert: triggered post-run when the aggregate count of non-
// pending_overwrite drifts (i.e. manual_drift + error) exceeds the
// configured threshold. Webhook URL read from
// `PRODUCT_CATALOG_RECONCILE_SLACK_WEBHOOK_URL` — when absent, alert is
// skipped silently and the summary is emitted to logs only.
// ─────────────────────────────────────────────────────────────

const DEFAULT_ALERT_THRESHOLD = 5

interface ReconcileSummary {
  runAt: string
  durationMs: number
  hubspotProducts: number
  matched: number
  unmatched: number
  pendingOverwriteTotal: number
  manualDriftTotal: number
  errorTotal: number
  productsWithDrift: number
  alertFired: boolean
  alertThreshold: number
}

const loadDriftSnapshotByHubspotId = async (
  hubspotProductId: string
): Promise<ProductCatalogDriftSnapshot | null> => {
  const rows = await query<ProductCatalogDriftSnapshot>(
    `SELECT product_id, hubspot_product_id, product_name, description,
            description_rich_html, hubspot_product_type_code,
            hubspot_pricing_model, hubspot_product_classification,
            hubspot_bundle_type_code, category_code, unit_code,
            tax_category_code, marketing_url, image_urls,
            commercial_owner_member_id, is_archived
       FROM greenhouse_commercial.product_catalog
      WHERE hubspot_product_id = $1
      LIMIT 1`,
    [hubspotProductId]
  )

  return rows[0] ?? null
}

const postSlackAlert = async (summary: ReconcileSummary) => {
  const webhookUrl = process.env.PRODUCT_CATALOG_RECONCILE_SLACK_WEBHOOK_URL?.trim()

  if (!webhookUrl) {
    console.log('[reconcile] PRODUCT_CATALOG_RECONCILE_SLACK_WEBHOOK_URL not set — skipping Slack alert')

    return
  }

  const lines = [
    `:rotating_light: *Product catalog drift alert* (weekly reconcile)`,
    `• Productos escaneados: ${summary.hubspotProducts}`,
    `• Con drift: ${summary.productsWithDrift}`,
    `• \`manual_drift\`: ${summary.manualDriftTotal}  ·  \`error\`: ${summary.errorTotal}  ·  \`pending_overwrite\`: ${summary.pendingOverwriteTotal}`,
    `• Umbral: ${summary.alertThreshold} (manual_drift + error) — revisar admin UI`,
    `<https://greenhouse.efeoncepro.com/admin/commercial/product-catalog|Abrir catálogo>`
  ]

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') }),
      signal: AbortSignal.timeout(10_000)
    })

    if (!response.ok) {
      const body = await response.text()

      console.error(`[reconcile] Slack alert failed: ${response.status} ${body}`)
    }
  } catch (error) {
    console.error('[reconcile] Slack alert threw:', error instanceof Error ? error.message : error)
  }
}

/**
 * Runs the weekly reconcile job. Public entrypoint called by
 * `POST /product-catalog/reconcile-v2` on the ops-worker.
 */
export const runProductCatalogReconcileV2Job = async (options: {
  alertThreshold?: number
  runId?: string
} = {}): Promise<ReconcileSummary> => {
  const startedAt = Date.now()
  const alertThreshold = options.alertThreshold ?? DEFAULT_ALERT_THRESHOLD

  const runId =
    options.runId ?? `reconcile-v2-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  console.log('[reconcile] starting product catalog reconcile v2')

  let hubspotProducts: HubSpotGreenhouseProductProfile[]

  try {
    const response = await getHubSpotGreenhouseProductCatalog()

    hubspotProducts = response.products
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    console.error('[reconcile] HubSpot fetch failed:', message)
    throw error
  }

  console.log(`[reconcile] fetched ${hubspotProducts.length} products from middleware`)

  let matched = 0
  let unmatched = 0
  let pendingOverwriteTotal = 0
  let manualDriftTotal = 0
  let errorTotal = 0
  let productsWithDrift = 0

  for (const profile of hubspotProducts) {
    const hubspotProductId = profile.identity.hubspotProductId

    if (!hubspotProductId) {
      unmatched++
      continue
    }

    const snapshot = await loadDriftSnapshotByHubspotId(hubspotProductId)

    if (!snapshot) {
      unmatched++
      continue
    }

    matched++

    try {
      const report = await detectProductDriftV2(snapshot.product_id, profile, snapshot)

      if (report.driftedFields.length > 0) {
        productsWithDrift++

        for (const field of report.driftedFields) {
          if (field.classification === 'pending_overwrite') pendingOverwriteTotal++
          else if (field.classification === 'manual_drift') manualDriftTotal++
          else if (field.classification === 'error') errorTotal++
        }
      }

      await persistDriftReport(report, {
        syncRunId: `${runId}-${snapshot.product_id}`,
        triggeredBy: 'ops-worker-reconcile-v2'
      })
    } catch (error) {
      errorTotal++
      console.error(
        `[reconcile] drift detection failed for ${snapshot.product_id}:`,
        error instanceof Error ? error.message : error
      )
    }
  }

  const durationMs = Date.now() - startedAt
  const alertFired = manualDriftTotal + errorTotal > alertThreshold

  const summary: ReconcileSummary = {
    runAt: new Date().toISOString(),
    durationMs,
    hubspotProducts: hubspotProducts.length,
    matched,
    unmatched,
    pendingOverwriteTotal,
    manualDriftTotal,
    errorTotal,
    productsWithDrift,
    alertFired,
    alertThreshold
  }

  console.log(
    `[reconcile] done — matched=${matched}, with_drift=${productsWithDrift}, pending_overwrite=${pendingOverwriteTotal}, manual_drift=${manualDriftTotal}, error=${errorTotal} (${durationMs}ms)`
  )

  if (alertFired) {
    await postSlackAlert(summary)
  }

  return summary
}
