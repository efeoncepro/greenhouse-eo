/**
 * TASK-1304 — Fase 2 del ciclo async OnPage: poll idempotente + materialización.
 *
 * Por cada `seo_site_audit_runs` en `status=running` poll-ea la task OnPage
 * (`summary`, POST — el transporte canónico es POST-only; `task_get` GET-por-path NO
 * existe acá) y, cuando el crawl terminó, materializa el run + findings EXACTAMENTE UNA
 * VEZ.
 *
 * Idempotencia/concurrencia: cada run se procesa dentro de SU PROPIA transacción con
 * `SELECT … FOR UPDATE SKIP LOCKED` sobre la fila del run. Dos `collect` concurrentes
 * jamás materializan dos veces: el segundo hace skip de la fila lockeada, y una vez que
 * el run sale de `running` el claim (`WHERE status='running'`) deja de verlo. El UPDATE
 * del run, el INSERT de findings y el outbox event van en la MISMA transacción — si algo
 * falla, el run queda `running` y el próximo ciclo reintenta (los reads post-crawl del
 * proveedor son gratis por 30 días).
 *
 * Honest degradation (mapeo explícito, arch §6):
 * - crawl terminó + páginas > 0 + sin errores extendidos → `succeeded` (0 findings =
 *   sitio técnicamente limpio, NUNCA un fallo);
 * - crawl terminó + páginas > 0 + `extended_crawl_status` con error → `degraded`;
 * - crawl terminó + 0 páginas → `failed`;
 * - task incompleta → no-op (`in_progress`), se reintenta el próximo ciclo;
 * - task más vieja que `SITE_AUDIT_GIVE_UP_HOURS` sin completar → `failed` (`gave_up`).
 *   La signal `seo.audit.stuck_tasks` alerta antes (umbral 6h) — el collect da el
 *   veredicto tarde, la signal avisa temprano.
 */

import 'server-only'

import type { PoolClient } from 'pg'

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import { captureWithDomain } from '@/lib/observability/capture'
import {
  runGreenhousePostgresQuery,
  withGreenhousePostgresTransaction
} from '@/lib/postgres/client'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { createSiteFetcher, resolveSubjectSite } from '@/lib/growth/site-substrate'

import {
  SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
  SEO_SITE_AUDIT_COMPLETED_EVENT,
  type SeoSiteAuditCollectRunOutcome,
  type SeoSiteAuditCollectSummary,
  type SeoSiteAuditRunStatus
} from '../contracts'
import { isSeoModuleEnabled, isSeoSiteFindingsEnabled } from '../flags'
import { mapOnPagePagesToFindings, type OnPageAuditFinding } from './findings-map'
import { evaluateSiteFindings, type SiteAuditFinding } from './site-findings'

/**
 * Endpoints de lectura post-crawl (POST, gratis 30 días post-task). AMBOS llevan el id
 * en el BODY (`[{ id }]`): la variante POST-por-path (`summary/$id`) responde HTTP 200
 * pero SIN tasks — verificado contra el provider en vivo 2026-08-06 (smoke TASK-1304);
 * la tabla de la doc que muestra `summary/$id` describe el GET, no el POST.
 */
export const ONPAGE_SUMMARY_ENDPOINT = '/v3/on_page/summary'

export const ONPAGE_PAGES_ENDPOINT = '/v3/on_page/pages'

/** Techo de páginas leídas para derivar findings (límite máximo del proveedor). */
export const SITE_AUDIT_PAGES_READ_LIMIT = 1000

/**
 * Edad máxima de un run en `running` antes de degradarlo a `failed`. Crawls legítimos
 * pueden tardar horas (`crawl_delay` default 2000 ms → 100 págs ≈ 4 min, pero colas del
 * proveedor + sitios lentos suman); 24h es el punto donde "lento" pasa a "colgado".
 */
export const SITE_AUDIT_GIVE_UP_HOURS = 24

type ClaimedRunRow = {
  audit_run_id: string
  seo_target_id: string
  organization_id: string
  /** Dominio del sujeto: insumo de los hallazgos de SITIO (TASK-1670). */
  root_domain: string
  capture_date: string
  provider_task_id: string
  /** `true` cuando el run superó `SITE_AUDIT_GIVE_UP_HOURS` sin completar. */
  gave_up: boolean
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

export interface OnPageSummarySnapshot {
  /** `in_progress` | `finished` (null si la respuesta no trae el campo). */
  crawlProgress: string | null
  pagesCrawled: number | null
  /** OnPage Score sitewide 0–100. */
  onpageScore: number | null
  /** Diagnóstico del proveedor (`no_errors`, `site_unreachable`, …). */
  extendedCrawlStatus: string | null
  statusCode: number | null
}

/** Parser puro de la respuesta `summary`. */
export const parseOnPageSummary = (tasks: unknown[]): OnPageSummarySnapshot => {
  const task = asRecord(tasks[0])
  const statusCode = typeof task?.status_code === 'number' ? task.status_code : null
  const result = asRecord(Array.isArray(task?.result) ? task.result[0] : null)

  if (!result) {
    return { crawlProgress: null, pagesCrawled: null, onpageScore: null, extendedCrawlStatus: null, statusCode }
  }

  const crawlStatus = asRecord(result.crawl_status)
  const pageMetrics = asRecord(result.page_metrics)

  return {
    crawlProgress: typeof result.crawl_progress === 'string' ? result.crawl_progress : null,
    pagesCrawled: typeof crawlStatus?.pages_crawled === 'number' ? crawlStatus.pages_crawled : null,
    onpageScore: typeof pageMetrics?.onpage_score === 'number' ? pageMetrics.onpage_score : null,
    extendedCrawlStatus:
      typeof result.extended_crawl_status === 'string' ? result.extended_crawl_status : null,
    statusCode
  }
}

/** Parser puro de la respuesta `pages`: aplana los items (páginas) de la task. */
export const parseOnPagePages = (tasks: unknown[]): unknown[] => {
  const task = asRecord(tasks[0])
  const result = asRecord(Array.isArray(task?.result) ? task.result[0] : null)

  return Array.isArray(result?.items) ? result.items : []
}

/**
 * Mapeo explícito de estado final (honest degradation, arch §6). Solo se invoca cuando
 * el crawl TERMINÓ — una task incompleta nunca llega acá.
 */
export const deriveAuditRunStatus = (summary: OnPageSummarySnapshot): SeoSiteAuditRunStatus => {
  const pages = summary.pagesCrawled ?? 0

  if (pages <= 0) {
    return 'failed'
  }

  const clean = summary.extendedCrawlStatus === null || summary.extendedCrawlStatus === 'no_errors'

  return clean ? 'succeeded' : 'degraded'
}

const queryRows = async <T>(client: PoolClient, sql: string, params: unknown[]): Promise<T[]> => {
  const result = await client.query(sql, params)

  return result.rows as T[]
}

const insertFindings = async (
  client: PoolClient,
  auditRunId: string,
  findings: OnPageAuditFinding[],
  scope: 'page' | 'site' = 'page'
): Promise<void> => {
  for (const finding of findings) {
    await client.query(
      `INSERT INTO greenhouse_growth.seo_site_audit_findings (audit_run_id, url, issue_type, severity, detail, finding_scope)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [auditRunId, finding.url, finding.issueType, finding.severity, JSON.stringify(finding.detail), scope]
    )
  }
}

/**
 * TASK-1670 — Hallazgos de SITIO del run, detrás de flag.
 *
 * NUNCA LANZA y NUNCA bloquea el cierre del run: si el sitio está caído, es lento o el flag
 * está apagado, el audit se materializa igual con sus hallazgos de página. Un sitio del
 * cliente no puede impedir que se cierre un crawl que ya se pagó.
 *
 * ⚠️ Corre DENTRO de la transacción que sostiene el lock del run —el mismo lugar donde ya
 * viven los dos POST a DataForSEO, y por la misma razón: ese lock ES el mecanismo de
 * exactly-once y sacarlo de ahí obligaría a rediseñarlo—. Por eso el evaluador impone un
 * presupuesto de tiempo duro (`SITE_FINDINGS_DEADLINE_MS`): la ventana que agrega es del
 * mismo orden que la que la transacción ya tolera, y cruzarla degrada a "no verificado" en
 * vez de estirar el lock.
 */
const collectSiteFindings = async (rootDomain: string): Promise<OnPageAuditFinding[]> => {
  const site = resolveSubjectSite(rootDomain)

  if (!site) {
    // Dominio no resoluble a una URL pública: no hay sitio que medir. Se omite en silencio
    // porque no es un hallazgo del SITIO sino un dato incompleto del target.
    return []
  }

  const fetcher = createSiteFetcher(site.baseUrl)
  const evaluation = await evaluateSiteFindings(site.baseUrl, fetcher)

  return evaluation.findings.map((finding: SiteAuditFinding) => ({
    // La tabla exige `url` NOT NULL. Todos los hallazgos de sitio comparten la URL canónica
    // del sujeto: la columna `finding_scope` es el discriminador, y las URLs específicas
    // (sitemap declarado, etc.) viajan en `detail`.
    url: evaluation.siteUrl,
    issueType: finding.issueType,
    severity: finding.severity,
    detail: finding.detail
  }))
}

interface CollectRunResult {
  outcome: SeoSiteAuditCollectRunOutcome
  finalStatus: SeoSiteAuditRunStatus | null
  findings: number
  seoTargetId: string
}

/**
 * Procesa UN run: claim atómico → poll → materialización (o no-op honesto).
 *
 * El poll al proveedor ocurre dentro de la transacción del claim, a propósito: el lock
 * de la fila ES el mecanismo de exactly-once, y los reads post-crawl tardan ~1-2 s (el
 * pool del worker tolera esa ventana; el cron corre cada 30 min sobre pocos runs).
 */
const collectOneRun = async (auditRunId: string): Promise<CollectRunResult> =>
  withGreenhousePostgresTransaction(async client => {
    const claimed = await queryRows<ClaimedRunRow>(
      client,
      `SELECT r.audit_run_id,
              r.seo_target_id,
              t.organization_id,
              t.root_domain,
              r.capture_date::text AS capture_date,
              r.provider_task_id,
              (NOW() - COALESCE(r.started_at, r.created_at)) >= ($2::int * INTERVAL '1 hour') AS gave_up
         FROM greenhouse_growth.seo_site_audit_runs r
         JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = r.seo_target_id
        WHERE r.audit_run_id = $1
          AND r.status = 'running'
          AND r.provider_task_id IS NOT NULL
          FOR UPDATE OF r SKIP LOCKED`,
      [auditRunId, SITE_AUDIT_GIVE_UP_HOURS]
    )

    const run = claimed[0]

    if (!run) {
      // Otro proceso tiene el lock (o ya lo materializó y salió de `running`).
      return { outcome: 'claimed_elsewhere', finalStatus: null, findings: 0, seoTargetId: '' }
    }

    const gaveUp = run.gave_up === true

    let summaryResult: Awaited<ReturnType<typeof postDataForSeoTask>> | null = null

    try {
      summaryResult = await postDataForSeoTask({
        family: 'onpage',
        consumer: 'seo',
        endpoint: ONPAGE_SUMMARY_ENDPOINT,
        tasks: [{ id: run.provider_task_id }],
        organizationId: run.organization_id
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_site_audit_collect', family: 'onpage' },
        extra: { auditRunId, providerTaskId: run.provider_task_id }
      })
    }

    const summary = summaryResult?.ok ? parseOnPageSummary(summaryResult.tasks) : null

    if (!summary || summary.crawlProgress !== 'finished') {
      if (!gaveUp) {
        // Poll fallido o crawl aún corriendo: no-op honesto, el próximo ciclo reintenta.
        return {
          outcome: summary ? 'in_progress' : 'poll_failed',
          finalStatus: null,
          findings: 0,
          seoTargetId: run.seo_target_id
        }
      }

      // Task colgada más allá del techo: veredicto honesto `failed` (nunca se fabrica
      // resultado). Lo que el proveedor haya alcanzado a crawlear queda descartado.
      await client.query(
        `UPDATE greenhouse_growth.seo_site_audit_runs
            SET status = 'failed', finished_at = NOW()
          WHERE audit_run_id = $1`,
        [auditRunId]
      )

      await publishOutboxEvent(
        {
          aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
          aggregateId: run.seo_target_id,
          eventType: SEO_SITE_AUDIT_COMPLETED_EVENT,
          payload: {
            seoTargetId: run.seo_target_id,
            organizationId: run.organization_id,
            auditRunId,
            captureDate: run.capture_date,
            status: 'failed',
            findingsCount: 0,
            gaveUpAfterHours: SITE_AUDIT_GIVE_UP_HOURS
          }
        },
        client
      )

      return { outcome: 'gave_up', finalStatus: 'failed', findings: 0, seoTargetId: run.seo_target_id }
    }

    // Crawl terminado: derivar estado final + findings (reads gratis 30 días).
    const finalStatus = deriveAuditRunStatus(summary)

    let findings: OnPageAuditFinding[] = []

    if (finalStatus !== 'failed') {
      try {
        const pagesResult = await postDataForSeoTask({
          family: 'onpage',
          consumer: 'seo',
          endpoint: ONPAGE_PAGES_ENDPOINT,
          tasks: [{ id: run.provider_task_id, limit: SITE_AUDIT_PAGES_READ_LIMIT }],
          organizationId: run.organization_id
        })

        if (!pagesResult.ok) {
          // Sin páginas no hay findings materializables: dejar el run `running` y
          // reintentar el ciclo completo — nunca cerrar un run con findings a medias.
          return { outcome: 'poll_failed', finalStatus: null, findings: 0, seoTargetId: run.seo_target_id }
        }

        findings = mapOnPagePagesToFindings(parseOnPagePages(pagesResult.tasks))
      } catch (error) {
        captureWithDomain(error, 'growth', {
          tags: { source: 'seo_site_audit_collect', family: 'onpage' },
          extra: { auditRunId, providerTaskId: run.provider_task_id, phase: 'pages' }
        })

        return { outcome: 'poll_failed', finalStatus: null, findings: 0, seoTargetId: run.seo_target_id }
      }
    }

    // TASK-1670 — Hallazgos de SITIO. Van detrás de su propio flag y NO cambian el estado
    // final del run: un sitio inalcanzable no degrada un crawl que sí terminó. Con el flag
    // OFF esta lista queda vacía y el comportamiento es idéntico al previo a esta task.
    let siteFindings: OnPageAuditFinding[] = []

    if (finalStatus !== 'failed' && isSeoSiteFindingsEnabled()) {
      try {
        siteFindings = await collectSiteFindings(run.root_domain)
      } catch (error) {
        // Defensa redundante: `evaluateSiteFindings` ya declara que nunca lanza. Si algún día
        // deja de cumplirlo, el run se cierra igual — nunca al revés.
        captureWithDomain(error, 'growth', {
          tags: { source: 'seo_site_audit_collect', family: 'site_findings' },
          extra: { auditRunId, rootDomain: run.root_domain }
        })
      }
    }

    await client.query(
      `UPDATE greenhouse_growth.seo_site_audit_runs
          SET status = $2,
              crawled_pages = $3,
              health_score = $4,
              finished_at = NOW()
        WHERE audit_run_id = $1`,
      [auditRunId, finalStatus, summary.pagesCrawled, summary.onpageScore]
    )

    await insertFindings(client, auditRunId, findings)
    await insertFindings(client, auditRunId, siteFindings, 'site')

    await publishOutboxEvent(
      {
        aggregateType: SEO_RANK_SNAPSHOT_AGGREGATE_TYPE,
        aggregateId: run.seo_target_id,
        eventType: SEO_SITE_AUDIT_COMPLETED_EVENT,
        payload: {
          seoTargetId: run.seo_target_id,
          organizationId: run.organization_id,
          auditRunId,
          captureDate: run.capture_date,
          status: finalStatus,
          findingsCount: findings.length + siteFindings.length
        }
      },
      client
    )

    return {
      outcome: 'materialized',
      finalStatus,
      findings: findings.length + siteFindings.length,
      seoTargetId: run.seo_target_id
    }
  })

/**
 * Ciclo de collect: poll-ea todos los runs en `running` (claim por run, per-run
 * resilience — un run que falla no impide cerrar los demás).
 */
export const collectSiteAuditRuns = async (
  options: { maxRuns?: number } = {}
): Promise<SeoSiteAuditCollectSummary> => {
  const empty: SeoSiteAuditCollectSummary = {
    pending: 0,
    materialized: 0,
    inProgress: 0,
    pollFailed: 0,
    gaveUp: 0,
    claimedElsewhere: 0,
    outcomes: []
  }

  if (!isSeoModuleEnabled()) {
    return empty
  }

  const pendingRows = await runGreenhousePostgresQuery<{ audit_run_id: string }>(
    `SELECT audit_run_id
       FROM greenhouse_growth.seo_site_audit_runs
      WHERE status = 'running'
        AND provider_task_id IS NOT NULL
      ORDER BY created_at`,
    []
  )

  const pending =
    typeof options.maxRuns === 'number' && options.maxRuns > 0
      ? pendingRows.slice(0, options.maxRuns)
      : pendingRows

  const outcomes: SeoSiteAuditCollectSummary['outcomes'] = []

  for (const row of pending) {
    try {
      const result = await collectOneRun(row.audit_run_id)

      outcomes.push({
        auditRunId: row.audit_run_id,
        seoTargetId: result.seoTargetId,
        outcome: result.outcome,
        finalStatus: result.finalStatus,
        findings: result.findings
      })
    } catch (error) {
      captureWithDomain(error, 'growth', {
        tags: { source: 'seo_site_audit_collect' },
        extra: { auditRunId: row.audit_run_id }
      })

      outcomes.push({
        auditRunId: row.audit_run_id,
        seoTargetId: '',
        outcome: 'poll_failed',
        finalStatus: null,
        findings: 0
      })
    }
  }

  return {
    pending: pending.length,
    materialized: outcomes.filter(outcome => outcome.outcome === 'materialized').length,
    inProgress: outcomes.filter(outcome => outcome.outcome === 'in_progress').length,
    pollFailed: outcomes.filter(outcome => outcome.outcome === 'poll_failed').length,
    gaveUp: outcomes.filter(outcome => outcome.outcome === 'gave_up').length,
    claimedElsewhere: outcomes.filter(outcome => outcome.outcome === 'claimed_elsewhere').length,
    outcomes
  }
}
