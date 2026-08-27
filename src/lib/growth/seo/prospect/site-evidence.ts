import 'server-only'

/**
 * TASK-1709 Slice 2b — Evidencia de sitio DELEGADA.
 *
 * Este módulo NO fetchea por su cuenta ni importa `safe-fetch`/`ai-visibility/probes/**`
 * (lint rule `greenhouse/growth-substrate-boundary` + test de frontera): toda lectura
 * del sitio del prospecto pasa por el sustrato compartido `@/lib/growth/site-substrate`
 * (TASK-1697), que ya trae guarda SSRF, UA de cortesía identificable, timeout, tope de
 * bytes, redirect acotado y — desde TASK-1778 — obediencia real de `robots.txt`.
 *
 * 🔴 Un bloqueo es un HALLAZGO, no un obstáculo: `blocked_robots` (o el
 * `extended_crawl_status` prohibido de OnPage) se persiste como hecho con su lente y
 * se reporta. Evadirlo (proxies, robots override, UA que nos oculte) está prohibido
 * en este carril — ver Out of Scope de la task.
 *
 * El carril OnPage acá es SOLO lectura post-crawl (gratis 30 días) cuando YA existe un
 * crawl del dominio en `seo_site_audit_runs`. Encargar un crawl NUEVO a un prospecto
 * quedó explícitamente diferido (necesita maquinaria async de poll que hoy es
 * target-bound); el costo de este módulo es USD 0 siempre.
 */

import { postDataForSeoTask } from '@/lib/ai/dataforseo'
import {
  assessHtmlObservability,
  createSiteFetcher,
  extractJsonLdBlocks,
  resolveSubjectSite
} from '@/lib/growth/site-substrate'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { parseOnPageSummary } from '../site-audit/collect'
import type { ProspectFact, ProspectSubject } from './contracts'
import { PROSPECT_ONPAGE_SUMMARY_ENDPOINT } from './contracts'

const nowIso = (): string => new Date().toISOString()

const fact = (partial: Omit<ProspectFact, 'lens' | 'capturedAt'>): ProspectFact => ({
  ...partial,
  lens: 'estimated',
  capturedAt: nowIso()
})

/**
 * Lee la evidencia del sitio vía el sustrato: home (observabilidad + JSON-LD),
 * `robots.txt` y `sitemap.xml`. Costo de proveedor: USD 0.
 */
export const collectProspectSiteEvidence = async (subject: ProspectSubject): Promise<ProspectFact[]> => {
  const site = resolveSubjectSite(`https://${subject.rootDomain}`)

  if (!site) {
    return [
      fact({
        kind: 'site_crawl_blocked',
        magnitude: null,
        source: 'site_substrate',
        detail: { reason: 'unresolvable_subject' }
      })
    ]
  }

  const fetcher = createSiteFetcher(site.baseUrl)
  const facts: ProspectFact[] = []

  try {
    const home = await fetcher('/')

    if (home.ok) {
      const jsonLdBlocks = extractJsonLdBlocks(home.body)
      const observability = assessHtmlObservability(home.body)

      facts.push(
        fact({
          kind: 'site_jsonld_blocks',
          magnitude: jsonLdBlocks.length,
          source: 'site_substrate',
          detail: { url: home.url }
        }),
        fact({
          kind: 'site_home_observability',
          // magnitude es binario 1/0 acá; el detalle lleva las señales. NUNCA un score.
          magnitude: observability.observable ? 1 : 0,
          source: 'site_substrate',
          detail: { signals: observability.signals, truncated: home.truncated === true }
        })
      )
    } else {
      // El fetch falló o fue bloqueado: ESO es el dato (blocked_robots incluido).
      facts.push(
        fact({
          kind: 'site_crawl_blocked',
          magnitude: null,
          source: 'site_substrate',
          detail: { path: '/', errorCode: home.errorCode, status: home.status }
        })
      )
    }

    const robots = await fetcher('/robots.txt')

    facts.push(
      fact({
        kind: 'site_robots_txt',
        magnitude: robots.ok ? 1 : 0,
        source: 'site_substrate',
        detail: robots.ok ? { present: true } : { present: false, errorCode: robots.errorCode, status: robots.status }
      })
    )

    const sitemap = await fetcher('/sitemap.xml', { accept: 'application/xml,text/xml' })
    const sitemapLooksValid = sitemap.ok && (/<sitemapindex\b/i.test(sitemap.body) || /<urlset\b/i.test(sitemap.body))

    facts.push(
      fact({
        kind: 'site_sitemap',
        magnitude: sitemapLooksValid ? 1 : 0,
        source: 'site_substrate',
        detail: sitemapLooksValid
          ? { present: true }
          : { present: false, errorCode: sitemap.errorCode, status: sitemap.status }
      })
    )
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_prospect_site_evidence' },
      extra: { rootDomain: subject.rootDomain }
    })
  }

  return facts
}

interface PriorCrawlRow extends Record<string, unknown> {
  provider_task_id: string
  organization_id: string
}

/**
 * Reads OnPage post-crawl (USD 0, ventana de 30 días del proveedor) — SOLO si ya existe
 * un crawl exitoso del mismo dominio en `seo_site_audit_runs`. Si no existe, se OMITE:
 * encargar un crawl nuevo está fuera del tope de este carril.
 */
export const collectProspectOnPageEvidence = async (
  subject: ProspectSubject,
  acquisitionOrganizationId: string
): Promise<ProspectFact[]> => {
  const rows = await runGreenhousePostgresQuery<PriorCrawlRow>(
    `SELECT r.provider_task_id, r.organization_id
       FROM greenhouse_growth.seo_site_audit_runs r
       JOIN greenhouse_growth.seo_targets t ON t.seo_target_id = r.seo_target_id
      WHERE t.root_domain = $1
        AND r.provider_task_id IS NOT NULL
        AND r.status IN ('succeeded', 'degraded')
        AND r.created_at >= NOW() - INTERVAL '30 days'
      ORDER BY r.created_at DESC
      LIMIT 1`,
    [subject.rootDomain]
  )

  const priorCrawl = rows[0]

  if (!priorCrawl) {
    return []
  }

  try {
    const response = await postDataForSeoTask({
      family: 'onpage',
      endpoint: PROSPECT_ONPAGE_SUMMARY_ENDPOINT,
      organizationId: acquisitionOrganizationId,
      tasks: [{ id: priorCrawl.provider_task_id }]
    })

    if (!response.ok) {
      return []
    }

    const summary = parseOnPageSummary(response.tasks)

    const facts: ProspectFact[] = []

    // Un crawl bloqueado por el sitio es un hallazgo de primera clase (forbidden_robots /
    // forbidden_meta_tag / forbidden_http_header), no un error de la corrida.
    if (summary.extendedCrawlStatus && summary.extendedCrawlStatus !== 'no_errors') {
      facts.push(
        fact({
          kind: 'site_crawl_blocked',
          magnitude: null,
          source: 'onpage_reads',
          detail: { extendedCrawlStatus: summary.extendedCrawlStatus }
        })
      )
    }

    if (summary.pagesCrawled !== null) {
      facts.push(
        fact({
          kind: 'onpage_critical_findings',
          magnitude: summary.pagesCrawled,
          source: 'onpage_reads',
          detail: {
            providerTaskId: priorCrawl.provider_task_id,
            crawlProgress: summary.crawlProgress,
            note: 'pages_crawled del crawl previo ya pagado; el detalle vive en el site audit del target'
          }
        })
      )
    }

    return facts
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'growth_seo_prospect_onpage_reads' },
      extra: { rootDomain: subject.rootDomain }
    })

    return []
  }
}
