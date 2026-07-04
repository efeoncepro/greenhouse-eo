import 'server-only'

/**
 * TASK-1330 — Short links gobernados para informes públicos del AI Visibility Grader.
 *
 * Alias corto, de alta entropía, no enumerable y revocable → resuelve a un `grader_reports`
 * publicado (TASK-1239). Greenhouse es el source of truth del alias y su resolución; `efeonce-think`
 * solo consume el URL corto y renderiza. Aditivo sobre el snapshot público inmutable: NUNCA muta
 * `grader_reports` ni recomputa scoring. Reusa el generador base62 + retry canónico de
 * `@/lib/shared/short-code` (patrón TASK-631).
 *
 * Invariantes:
 *  - Un solo link activo por reporte (enforced por índice UNIQUE parcial `..._active_idx`).
 *  - `resolve` honra AMBAS expiraciones: la del short link Y la del reporte subyacente (código
 *    válido ≠ reporte vivo) → un reporte expirado devuelve `expired` aunque el código siga activo.
 *  - `revoke` es soft (append-only para auditoría); un código revocado/expirado NUNCA resuelve activo.
 *  - `track` es best-effort: NUNCA bloquea ni hace fallar el resolve del hot path público.
 */

import { buildPublicReportShortUrl, buildPublicReportUrl } from '@/lib/growth/ai-visibility/public-report-url'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { isUniqueViolation, withUniqueShortCode } from '@/lib/shared/short-code'

/** Longitud canónica del código (dentro del CHECK `[a-zA-Z0-9]{10,14}` de la migración). */
const SHORT_CODE_LENGTH = 12
const SHORT_CODE_PATTERN = /^[a-zA-Z0-9]{10,14}$/

/** Nombre del índice UNIQUE parcial que enforce "un solo link activo por reporte". */
const ACTIVE_LINK_CONSTRAINT = 'grader_report_short_links_active_idx'

export type GraderReportShortLinkStatus = 'active' | 'revoked' | 'expired' | 'unknown'

export interface GraderReportShortLink {
  shortCode: string
  reportId: string
  createdAt: string
  createdBySource: string
  expiresAt: string | null
  revokedAt: string | null
  revokedReason: string | null
  lastUsedAt: string | null
  useCount: number
}

export interface ResolvedGraderReportShortLink {
  status: GraderReportShortLinkStatus
  /** Token largo del reporte destino; SOLO presente cuando `status='active'` (server-to-server). */
  reportToken: string | null
  reportId: string | null
}

interface ShortLinkRow extends Record<string, unknown> {
  short_code: string
  report_id: string
  created_at: string | Date
  created_by_source: string
  expires_at: string | Date | null
  revoked_at: string | Date | null
  revoked_reason: string | null
  last_used_at: string | Date | null
  use_count: number
}

const toIso = (value: string | Date | null): string | null =>
  value === null ? null : value instanceof Date ? value.toISOString() : value

const normalize = (row: ShortLinkRow): GraderReportShortLink => ({
  shortCode: row.short_code,
  reportId: row.report_id,
  createdAt: toIso(row.created_at) ?? new Date().toISOString(),
  createdBySource: row.created_by_source,
  expiresAt: toIso(row.expires_at),
  revokedAt: toIso(row.revoked_at),
  revokedReason: row.revoked_reason,
  lastUsedAt: toIso(row.last_used_at),
  useCount: Number(row.use_count)
})

const isActiveLinkConflict = (error: unknown): boolean =>
  isUniqueViolation(error) && (error as { constraint?: string } | null)?.constraint === ACTIVE_LINK_CONSTRAINT

const selectActiveByReport = async (reportId: string): Promise<GraderReportShortLink | null> => {
  const rows = await runGreenhousePostgresQuery<ShortLinkRow>(
    `SELECT *
       FROM greenhouse_growth.grader_report_short_links
      WHERE report_id = $1
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
      ORDER BY created_at DESC
      LIMIT 1`,
    [reportId]
  )

  return rows[0] ? normalize(rows[0]) : null
}

export interface EnsureShortLinkInput {
  reportId: string
  createdBySource?: string
  expiresAt?: Date | string | null
}

/**
 * Idempotente por reporte: devuelve el short link activo existente o crea uno nuevo con retry de
 * colisión de código. El índice UNIQUE parcial es el árbitro de concurrencia — si dos writers crean
 * a la vez, uno gana y el otro (conflicto `..._active_idx`, NO colisión de código) re-selecciona el
 * activo. Pensado para llamarse desde el publish command (`publishGraderReportSnapshot`).
 */
export const ensureAiVisibilityReportShortLink = async (
  input: EnsureShortLinkInput
): Promise<GraderReportShortLink> => {
  const existing = await selectActiveByReport(input.reportId)

  if (existing) return existing

  try {
    return await withUniqueShortCode(
      { length: SHORT_CODE_LENGTH },
      async code => {
        const rows = await runGreenhousePostgresQuery<ShortLinkRow>(
          `INSERT INTO greenhouse_growth.grader_report_short_links
             (short_code, report_id, created_by_source, expires_at)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [code, input.reportId, input.createdBySource ?? 'system', input.expiresAt ?? null]
        )

        return normalize(rows[0])
      },
      // Reintentar SOLO ante colisión de código (PK); el conflicto de link-activo se maneja aparte.
      error => isUniqueViolation(error) && !isActiveLinkConflict(error)
    )
  } catch (error) {
    if (isActiveLinkConflict(error)) {
      const raced = await selectActiveByReport(input.reportId)

      if (raced) return raced
    }

    throw error
  }
}

/**
 * Resuelve un código a su reporte destino. Distingue `active`/`revoked`/`expired`/`unknown` para el
 * contrato de estados del endpoint (200/410/404). Honra el expiry del short link Y el del reporte
 * subyacente. NUNCA lanza por código malformado (→ `unknown`). El `reportToken` solo viaja en `active`.
 */
export const resolveAiVisibilityReportShortLink = async (
  shortCode: string
): Promise<ResolvedGraderReportShortLink> => {
  if (!SHORT_CODE_PATTERN.test(shortCode)) {
    return { status: 'unknown', reportToken: null, reportId: null }
  }

  const rows = await runGreenhousePostgresQuery<{
    report_id: string
    link_expires_at: string | Date | null
    revoked_at: string | Date | null
    report_token: string
    report_expires_at: string | Date | null
  }>(
    `SELECT sl.report_id,
            sl.expires_at AS link_expires_at,
            sl.revoked_at,
            gr.report_token,
            gr.expires_at AS report_expires_at
       FROM greenhouse_growth.grader_report_short_links sl
       JOIN greenhouse_growth.grader_reports gr ON gr.report_id = sl.report_id
      WHERE sl.short_code = $1
      LIMIT 1`,
    [shortCode]
  )

  const row = rows[0]

  if (!row) return { status: 'unknown', reportToken: null, reportId: null }

  const reportId = row.report_id
  const now = Date.now()
  const linkExpiry = toIso(row.link_expires_at)
  const reportExpiry = toIso(row.report_expires_at)

  if (row.revoked_at) return { status: 'revoked', reportToken: null, reportId }
  if (linkExpiry && new Date(linkExpiry).getTime() <= now) return { status: 'expired', reportToken: null, reportId }
  // Honrar el expiry del reporte subyacente: código vivo pero reporte expirado → expired.
  if (reportExpiry && new Date(reportExpiry).getTime() <= now) return { status: 'expired', reportToken: null, reportId }

  return { status: 'active', reportToken: row.report_token, reportId }
}

export interface RevokeShortLinkInput {
  shortCode: string
  reason?: string | null
}

/** Soft-revoke (preserva la fila para auditoría). Idempotente: revocar dos veces conserva el primer estado. */
export const revokeAiVisibilityReportShortLink = async (
  input: RevokeShortLinkInput
): Promise<GraderReportShortLink | null> => {
  const rows = await runGreenhousePostgresQuery<ShortLinkRow>(
    `UPDATE greenhouse_growth.grader_report_short_links
        SET revoked_at = COALESCE(revoked_at, now()),
            revoked_reason = COALESCE(revoked_reason, $2)
      WHERE short_code = $1
      RETURNING *`,
    [input.shortCode, input.reason ?? null]
  )

  return rows[0] ? normalize(rows[0]) : null
}

/**
 * Tracker de uso BEST-EFFORT: incrementa `use_count` + `last_used_at` sin bloquear el resolve.
 * En un endpoint público de lead magnet (potencial viral), el tracking NUNCA debe volver el resolve
 * un write-on-read que falle/contienda: el error se observa, no se propaga.
 */
export const trackAiVisibilityReportShortLinkUse = async (shortCode: string): Promise<void> => {
  try {
    await runGreenhousePostgresQuery(
      `UPDATE greenhouse_growth.grader_report_short_links
          SET use_count = use_count + 1,
              last_used_at = now()
        WHERE short_code = $1
          AND revoked_at IS NULL`,
      [shortCode]
    )
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_short_link_track' } })
  }
}

// ── Consumer preference (flag-gated short-vs-long) ───────────────────────────

/**
 * Flag de consumo (default OFF): mientras esté OFF, TODOS los consumers emiten el URL largo. Prender
 * en staging tras el smoke del resolve; producción solo con release explícito. Registrado en
 * `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
 */
export const isAiVisibilityShortLinksEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  env.GROWTH_AI_VISIBILITY_SHORT_LINKS_ENABLED === 'true'

/** Reader del link activo de un reporte (o null). Expuesto para consumers que resuelven la URL. */
export const getActiveShortLinkForReport = async (reportId: string): Promise<GraderReportShortLink | null> =>
  selectActiveByReport(reportId)

/**
 * URL de share PREFERIDA para un reporte: la CORTA si el flag está ON y existe un link activo; si no,
 * la LARGA (fallback siempre válido). SSOT de la decisión short-vs-long para TODOS los consumers
 * (token route, email, HubSpot, operador) → un solo lugar decide, cero drift. Con el flag OFF NO
 * toca la DB (short-circuit) → sin costo de latencia en el hot path mientras esté apagado.
 */
export const resolvePreferredReportUrl = async (input: {
  reportId: string
  reportToken: string
}): Promise<string> => {
  if (isAiVisibilityShortLinksEnabled()) {
    const link = await selectActiveByReport(input.reportId)

    if (link) return buildPublicReportShortUrl(link.shortCode)
  }

  return buildPublicReportUrl(input.reportToken)
}
