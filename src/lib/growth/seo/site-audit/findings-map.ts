/**
 * TASK-1304 — Mapeo puro de los checks OnPage por página → findings del audit.
 *
 * DataForSEO entrega ~65 checks booleanos por página (`pages` → `items[].checks`). Acá
 * vive el subconjunto curado que Greenhouse materializa como `seo_site_audit_findings`,
 * con su severidad (CHECK de TASK-1299: critical | warning | notice).
 *
 * ⚠️ Solo se mapean checks donde `true` = PROBLEMA. Los checks "positivos" del proveedor
 * (`is_https`, `has_meta_title`, `seo_friendly_url`, `canonical`, `from_sitemap`, …)
 * significan lo contrario y mapearlos tal cual invertiría el diagnóstico — se excluyen a
 * propósito en vez de invertirlos, para que un check nuevo del proveedor jamás entre al
 * reporte sin decisión explícita (allowlist, no passthrough).
 *
 * `issue_type` = nombre del check del proveedor (id estable de máquina): la UI de
 * TASK-1309 agrupa por él (`/admin/growth/seo/audit/[issueGroup]`).
 */

import type { SeoSiteAuditFindingSeverity } from '../contracts'

/** Allowlist curado: check del proveedor (true = problema) → severidad Greenhouse. */
export const ONPAGE_CHECK_SEVERITY: Readonly<Record<string, SeoSiteAuditFindingSeverity>> = {
  // Estado HTTP / disponibilidad — rompen el crawl o la indexación.
  is_broken: 'critical',
  is_4xx_code: 'critical',
  is_5xx_code: 'critical',

  // Canonicalización rota — señales contradictorias a Google.
  canonical_to_broken: 'critical',
  recursive_canonical: 'critical',
  canonical_to_redirect: 'warning',
  canonical_chain: 'warning',
  is_link_relation_conflict: 'warning',

  // Meta esencial.
  no_title: 'critical',
  no_description: 'warning',
  duplicate_title_tag: 'warning',
  duplicate_meta_tags: 'warning',
  no_h1_tag: 'warning',
  title_too_long: 'notice',
  title_too_short: 'notice',

  // Redirects.
  redirect_chain: 'warning',
  has_meta_refresh_redirect: 'warning',
  https_to_http_links: 'warning',
  is_http: 'warning',

  // Contenido.
  low_content_rate: 'warning',
  low_character_count: 'notice',
  low_readability_rate: 'notice',
  lorem_ipsum: 'warning',

  // Estructura / descubrimiento.
  is_orphan_page: 'warning',

  // Structured data (insumo AEO — requiere validate_micromarkup en el task_post).
  has_micromarkup_errors: 'warning',

  // Performance / tamaño (lab, diagnóstico — la señal de campo viene de GSC, doctrina §3).
  high_loading_time: 'warning',
  large_page_size: 'notice',
  has_render_blocking_resources: 'notice',
  no_content_encoding: 'notice',

  // Higiene HTML.
  no_image_alt: 'notice',
  no_favicon: 'notice',
  no_doctype: 'notice',
  no_encoding_meta_tag: 'notice',
  deprecated_html_tags: 'notice'
}

export interface OnPageAuditFinding {
  url: string
  issueType: string
  severity: SeoSiteAuditFindingSeverity
  detail: Record<string, unknown>
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

/**
 * Deriva los findings de UNA página crawleada (item del endpoint `pages`).
 *
 * `detail` conserva el `onpage_score` de la página y el status HTTP como contexto
 * diagnóstico; el payload crudo del proveedor NO se persiste (expira a los 30 días en
 * su lado y acá solo viven los hechos que el reporte consume).
 */
export const mapOnPagePageToFindings = (page: unknown): OnPageAuditFinding[] => {
  const record = asRecord(page)

  if (!record) {
    return []
  }

  const url = typeof record.url === 'string' ? record.url.trim() : ''

  if (url === '') {
    return []
  }

  const checks = asRecord(record.checks) ?? {}
  const onpageScore = typeof record.onpage_score === 'number' ? record.onpage_score : null
  const statusCode = typeof record.status_code === 'number' ? record.status_code : null

  const findings: OnPageAuditFinding[] = []

  for (const [check, severity] of Object.entries(ONPAGE_CHECK_SEVERITY)) {
    if (checks[check] === true) {
      findings.push({
        url,
        issueType: check,
        severity,
        detail: {
          ...(onpageScore !== null ? { onpageScore } : {}),
          ...(statusCode !== null ? { httpStatusCode: statusCode } : {})
        }
      })
    }
  }

  return findings
}

/** Aplana los findings de todas las páginas de la respuesta `pages`. */
export const mapOnPagePagesToFindings = (pages: unknown[]): OnPageAuditFinding[] =>
  pages.flatMap(page => mapOnPagePageToFindings(page))
