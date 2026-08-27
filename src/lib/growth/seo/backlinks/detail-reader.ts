/**
 * TASK-1777 — Reader canónico del detalle de enlaces, con TRES estados distinguibles
 * (Detailed Spec §5):
 *
 *   - `available`          — hubo drill-down y hay filas.
 *   - `skipped_no_movement`— NO hubo drill-down porque el perfil estuvo estable. Es una
 *                            afirmación POSITIVA sobre el perfil, no una falta de datos.
 *   - `drilldown_failed`   — se intentó y falló; la señal está en rojo.
 *
 * Colapsar los dos últimos en "sin datos" borraría la distinción que le importa al
 * especialista: "no pasó nada" y "no sabemos qué pasó" son conclusiones opuestas.
 *
 * Un snapshot anterior a la feature (sin veredicto) responde `no_detail` — el detalle no
 * existía todavía, y fabricar un estado sería mentir. 🔴 El shape de `readBacklinkProfile`
 * NO se toca: esta es una capa nueva.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isSeoModuleEnabled } from '../flags'
import {
  deriveAnchorProfile,
  deriveBrandTokens,
  type AnchorOverOptimizationProfile
} from './anchors'
import type { BacklinkMovement } from './detail-capture'

export interface BacklinkDetailDomain {
  referringDomain: string
  movement: BacklinkMovement
  /** Rank 0-100 del dominio referente (escala one_hundred). */
  rank: number | null
  backlinksToTarget: number | null
  /** Spam score de los enlaces de ESE dominio (0-100) — no es el toxic_share del perfil. */
  backlinkSpamScore: number | null
  firstSeen: string | null
  lostDate: string | null
  sampleUrlFrom: string | null
  sampleUrlTo: string | null
  sampleAnchor: string | null
  sampleDofollow: boolean | null
}

export interface BacklinkDetailAnchor {
  anchor: string
  backlinks: number | null
  referringDomains: number | null
  rank: number | null
  backlinkSpamScore: number | null
}

export type BacklinkDetailResult =
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      captureDate: string
      backlinkSnapshotId: string
      state: 'available'
      triggerReason: string
      domains: BacklinkDetailDomain[]
      newDomains: number
      lostDomains: number
      anchors: BacklinkDetailAnchor[]
      /** Derivación server-side (§4): la UI/Nexa/MCP NUNCA la recalculan. */
      anchorProfile: AnchorOverOptimizationProfile
    }
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      captureDate: string
      backlinkSnapshotId: string
      /** "El perfil estuvo estable" — afirmación positiva, no hueco. */
      state: 'skipped_no_movement'
    }
  | {
      ok: true
      seoTargetId: string
      organizationId: string
      captureDate: string
      backlinkSnapshotId: string
      state: 'drilldown_failed'
      errorCode: string | null
    }
  | {
      ok: false
      errorCode: 'disabled' | 'target_not_found' | 'no_snapshot' | 'no_detail' | 'query_failed'
      status: null
    }

type VerdictRow = {
  backlink_snapshot_id: string
  capture_date: string
  organization_id: string
  root_domain: string
  outcome: string
  trigger_reason: string
  error_code: string | null
}

const asNumber = (value: string | null): number | null => {
  if (value === null) return null

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Lee el detalle del snapshot más reciente CON veredicto (o el de `captureDate` exacto).
 *
 * 🔴 No selecciona `provider_cost` de las hijas ni nada atribuible; el costo vive en el
 * ledger y el veredicto, no en el DTO client-facing.
 */
export const readBacklinkDetail = async (
  seoTargetId: string,
  options: { captureDate?: string } = {}
): Promise<BacklinkDetailResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  try {
    const targetRows = await runGreenhousePostgresQuery<{ organization_id: string; root_domain: string }>(
      `SELECT organization_id, root_domain
         FROM greenhouse_growth.seo_targets
        WHERE seo_target_id = $1`,
      [seoTargetId]
    )

    const target = targetRows[0]

    if (!target) {
      return { ok: false, errorCode: 'target_not_found', status: null }
    }

    const snapshotRows = await runGreenhousePostgresQuery<{ backlink_snapshot_id: string }>(
      `SELECT backlink_snapshot_id
         FROM greenhouse_growth.seo_backlink_snapshots
        WHERE seo_target_id = $1
        ORDER BY capture_date DESC
        LIMIT 1`,
      [seoTargetId]
    )

    if (snapshotRows.length === 0) {
      return { ok: false, errorCode: 'no_snapshot', status: null }
    }

    // El snapshot que se lee es el más reciente CON veredicto (o el de la fecha pedida):
    // el veredicto es el que distingue los tres estados.
    const verdictRows = await runGreenhousePostgresQuery<VerdictRow>(
      `SELECT d.backlink_snapshot_id,
              s.capture_date::text AS capture_date,
              t.organization_id,
              t.root_domain,
              d.outcome,
              d.trigger_reason,
              d.error_code
         FROM greenhouse_growth.seo_backlink_drilldowns d
         JOIN greenhouse_growth.seo_backlink_snapshots s
           ON s.backlink_snapshot_id = d.backlink_snapshot_id
         JOIN greenhouse_growth.seo_targets t
           ON t.seo_target_id = s.seo_target_id
        WHERE s.seo_target_id = $1
          AND ($2::date IS NULL OR s.capture_date = $2::date)
        ORDER BY s.capture_date DESC
        LIMIT 1`,
      [seoTargetId, options.captureDate ?? null]
    )

    const verdict = verdictRows[0]

    if (!verdict) {
      // Snapshots existen pero ninguno fue evaluado: la feature no corría todavía.
      return { ok: false, errorCode: 'no_detail', status: null }
    }

    const shared = {
      ok: true as const,
      seoTargetId,
      organizationId: verdict.organization_id,
      captureDate: verdict.capture_date,
      backlinkSnapshotId: verdict.backlink_snapshot_id
    }

    if (verdict.outcome === 'failed') {
      return { ...shared, state: 'drilldown_failed', errorCode: verdict.error_code }
    }

    if (verdict.outcome !== 'drilled') {
      // `skipped_no_movement` y `skipped_partial` colapsan al estado "estable" del contrato:
      // en ambos NO se compró detalle; el matiz del motivo queda en el veredicto persistido.
      return { ...shared, state: 'skipped_no_movement' }
    }

    const domainRows = await runGreenhousePostgresQuery<{
      referring_domain: string
      movement: BacklinkMovement
      rank: string | null
      backlinks_to_target: string | null
      backlink_spam_score: string | null
      first_seen: string | null
      lost_date: string | null
      sample_url_from: string | null
      sample_url_to: string | null
      sample_anchor: string | null
      sample_dofollow: boolean | null
    }>(
      `SELECT referring_domain, movement,
              rank::text AS rank,
              backlinks_to_target::text AS backlinks_to_target,
              backlink_spam_score::text AS backlink_spam_score,
              first_seen::text AS first_seen,
              lost_date::text AS lost_date,
              sample_url_from, sample_url_to, sample_anchor, sample_dofollow
         FROM greenhouse_growth.seo_backlink_referring_domains
        WHERE backlink_snapshot_id = $1
        ORDER BY movement, rank DESC NULLS LAST`,
      [verdict.backlink_snapshot_id]
    )

    const anchorRows = await runGreenhousePostgresQuery<{
      anchor: string
      backlinks: string | null
      referring_domains: number | null
      rank: string | null
      backlink_spam_score: string | null
    }>(
      `SELECT anchor,
              backlinks::text AS backlinks,
              referring_domains,
              rank::text AS rank,
              backlink_spam_score::text AS backlink_spam_score
         FROM greenhouse_growth.seo_backlink_anchors
        WHERE backlink_snapshot_id = $1
        ORDER BY backlinks DESC NULLS LAST`,
      [verdict.backlink_snapshot_id]
    )

    const domains: BacklinkDetailDomain[] = domainRows.map(row => ({
      referringDomain: row.referring_domain,
      movement: row.movement,
      rank: asNumber(row.rank),
      backlinksToTarget: asNumber(row.backlinks_to_target),
      backlinkSpamScore: asNumber(row.backlink_spam_score),
      firstSeen: row.first_seen,
      lostDate: row.lost_date,
      sampleUrlFrom: row.sample_url_from,
      sampleUrlTo: row.sample_url_to,
      sampleAnchor: row.sample_anchor,
      sampleDofollow: row.sample_dofollow
    }))

    const anchors: BacklinkDetailAnchor[] = anchorRows.map(row => ({
      anchor: row.anchor,
      backlinks: asNumber(row.backlinks),
      referringDomains: row.referring_domains,
      rank: asNumber(row.rank),
      backlinkSpamScore: asNumber(row.backlink_spam_score)
    }))

    return {
      ...shared,
      state: 'available',
      triggerReason: verdict.trigger_reason,
      domains,
      newDomains: domains.filter(domain => domain.movement === 'new').length,
      lostDomains: domains.filter(domain => domain.movement === 'lost').length,
      anchors,
      anchorProfile: deriveAnchorProfile(
        anchors.map(anchor => ({ anchor: anchor.anchor, backlinks: anchor.backlinks })),
        deriveBrandTokens(verdict.root_domain)
      )
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_backlink_detail_reader' },
      extra: { seoTargetId }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
