import 'server-only'

/**
 * TASK-1848 — commands del ShareGrant: crear, revocar y listar enlaces de una edición.
 *
 * Gates fail-closed (arquitectura §7.1/§8):
 *   1. Flag `INSIGHTS_SHARING_ENABLED` en este runtime.
 *   2. Tres planos (`assertInsightsAccess`, need `share_*`): capability propia `insights.share.manage`,
 *      target revalidado y módulo `insights_v1` vigente. Emitir o generar NO concede compartir.
 *   3. Sólo ediciones `issued` de audiencia `client`: un borrador o una edición interna jamás sale
 *      por enlace (para el cliente, una edición interna "no existe").
 *   4. Vigencia 1–90 días (default 30), descargas ⊆ outputs de la edición, cupo de enlaces activos.
 *
 * El bearer se genera acá y se devuelve UNA vez: sólo su digest se persiste; el evento outbox lleva
 * ids y expiración, nunca token ni digest.
 */

import type { TenantEntitlementSubject } from '@/lib/entitlements/types'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import { assertInsightsAccess } from '../authz'
import { InsightsInputError, InsightsNotFoundError, InsightsNotReadyError, InsightsQuotaExceededError, InsightsSharingDisabledError } from '../errors'
import { publishInsightShareCreated, publishInsightShareRevoked } from '../events'
import { isInsightsSharingEnabled } from '../flags'
import { getInsightEditionById } from '../stores/edition-store'

import {
  INSIGHT_SHARE_DEFAULT_TTL_DAYS,
  INSIGHT_SHARE_MAX_ACTIVE_PER_EDITION,
  INSIGHT_SHARE_MAX_TTL_DAYS,
  isInsightShareDownloadableOutput,
  projectInsightShareGrant,
  type InsightShareCreatedResult,
  type InsightShareDownloadableOutput,
  type InsightShareGrantDto
} from './contracts'
import { countActiveInsightShareGrants, getInsightShareGrant, insertInsightShareGrant, listInsightShareGrantsForEdition, revokeInsightShareGrant } from './store'
import { buildInsightShareUrl, digestInsightShareToken, generateInsightShareToken } from './token'

interface ShareScope {
  subject: TenantEntitlementSubject
  actorOrganizationId: string | null
  organizationId: string
  env?: NodeJS.ProcessEnv
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

export interface CreateInsightShareInput extends ShareScope {
  editionId: string
  /** Cuerpo crudo del caller: `{ expiresInDays?, downloadOutputs?, label? }`. */
  options?: unknown
}

interface NormalizedShareOptions {
  ttlDays: number
  downloadOutputs: InsightShareDownloadableOutput[]
  label: string | null
}

export const normalizeInsightShareOptions = (options: unknown, editionOutputs: readonly string[]): NormalizedShareOptions => {
  const raw = isRecord(options) ? options : {}

  let ttlDays = INSIGHT_SHARE_DEFAULT_TTL_DAYS

  if (raw.expiresInDays !== undefined && raw.expiresInDays !== null) {
    if (typeof raw.expiresInDays !== 'number' || !Number.isInteger(raw.expiresInDays) || raw.expiresInDays < 1 || raw.expiresInDays > INSIGHT_SHARE_MAX_TTL_DAYS) {
      throw new InsightsInputError(`expiresInDays debe ser un entero entre 1 y ${INSIGHT_SHARE_MAX_TTL_DAYS}`, { field: 'expiresInDays' })
    }

    ttlDays = raw.expiresInDays
  }

  let downloadOutputs: InsightShareDownloadableOutput[] = []

  if (raw.downloadOutputs !== undefined && raw.downloadOutputs !== null) {
    if (!Array.isArray(raw.downloadOutputs) || !raw.downloadOutputs.every(isInsightShareDownloadableOutput)) {
      throw new InsightsInputError('downloadOutputs sólo admite deck_pdf y report_pdf', { field: 'downloadOutputs' })
    }

    downloadOutputs = [...new Set(raw.downloadOutputs)]

    const notRequested = downloadOutputs.filter(output => !editionOutputs.includes(output))

    if (notRequested.length > 0) {
      throw new InsightsInputError('downloadOutputs incluye salidas que la edición no pidió', { field: 'downloadOutputs', notRequested })
    }
  }

  let label: string | null = null

  if (raw.label !== undefined && raw.label !== null) {
    if (typeof raw.label !== 'string' || raw.label.trim().length < 1 || raw.label.trim().length > 120) {
      throw new InsightsInputError('label debe tener entre 1 y 120 caracteres', { field: 'label' })
    }

    label = raw.label.trim()
  }

  return { ttlDays, downloadOutputs, label }
}

/** Edición compartible: visible al actor, de audiencia cliente y emitida. */
const loadShareableEdition = async (organizationId: string, editionId: string, isInternal: boolean) => {
  const edition = await getInsightEditionById(undefined, organizationId, editionId)

  if (!edition || (!isInternal && edition.audience !== 'client')) throw new InsightsNotFoundError('edition', editionId)
  if (edition.audience !== 'client') throw new InsightsNotReadyError('Sólo una edición de audiencia cliente puede compartirse por enlace', { audience: edition.audience })
  if (edition.state !== 'issued') throw new InsightsNotReadyError('Sólo una edición emitida puede compartirse por enlace', { state: edition.state })

  return edition
}

export const createInsightShare = async (input: CreateInsightShareInput): Promise<InsightShareCreatedResult> => {
  if (!isInsightsSharingEnabled(input.env)) throw new InsightsSharingDisabledError()

  const grant = await assertInsightsAccess({ ...input, need: 'share_create' })
  const edition = await loadShareableEdition(grant.organizationId, input.editionId, grant.isInternal)
  const options = normalizeInsightShareOptions(input.options, edition.outputs)
  const token = generateInsightShareToken()

  const record = await withGreenhousePostgresTransaction(async client => {
    // Bloquear la edición serializa creaciones concurrentes: el cupo no se sobrepasa por carrera.
    await getInsightEditionById(client, grant.organizationId, edition.editionId, { forUpdate: true })

    const active = await countActiveInsightShareGrants(client, grant.organizationId, edition.editionId)

    if (active >= INSIGHT_SHARE_MAX_ACTIVE_PER_EDITION) {
      throw new InsightsQuotaExceededError('La edición ya tiene el máximo de enlaces activos; revoca uno antes de crear otro', {
        limit: INSIGHT_SHARE_MAX_ACTIVE_PER_EDITION
      })
    }

    const inserted = await insertInsightShareGrant(client, {
      organizationId: grant.organizationId,
      editionId: edition.editionId,
      tokenDigest: digestInsightShareToken(token),
      downloadOutputs: options.downloadOutputs,
      label: options.label,
      source: 'manual',
      ttlDays: options.ttlDays,
      actor: grant.actor
    })

    await publishInsightShareCreated(client, {
      version: 1,
      shareGrantId: inserted.shareGrantId,
      editionId: inserted.editionId,
      organizationId: inserted.organizationId,
      expiresAt: inserted.expiresAt,
      downloadOutputs: inserted.downloadOutputs,
      source: inserted.source,
      actorKind: grant.actor.kind
    })

    return inserted
  })

  return { share: projectInsightShareGrant(record), token, url: buildInsightShareUrl(token, input.env) }
}

export interface RevokeInsightShareInput extends ShareScope {
  shareGrantId: string
}

export const revokeInsightShare = async (input: RevokeInsightShareInput): Promise<{ share: InsightShareGrantDto; idempotent: boolean }> => {
  // Revocar NO se apaga con el flag: cortar acceso siempre debe ser posible.
  const grant = await assertInsightsAccess({ ...input, need: 'share_revoke' })

  return withGreenhousePostgresTransaction(async client => {
    const existing = await getInsightShareGrant(client, grant.organizationId, input.shareGrantId, { forUpdate: true })

    if (!existing) throw new InsightsNotFoundError('share', input.shareGrantId)

    // Un cliente sólo gestiona enlaces de ediciones que puede ver (audiencia cliente, garantizada en DB).
    if (existing.revokedAt) return { share: projectInsightShareGrant(existing), idempotent: true }

    const revoked = await revokeInsightShareGrant(client, { organizationId: grant.organizationId, shareGrantId: existing.shareGrantId, actor: grant.actor, reason: 'manual' })

    if (!revoked) return { share: projectInsightShareGrant(existing), idempotent: true }

    await publishInsightShareRevoked(client, {
      version: 1,
      shareGrantId: revoked.shareGrantId,
      editionId: revoked.editionId,
      organizationId: revoked.organizationId,
      reason: 'manual',
      actorKind: grant.actor.kind
    })

    return { share: projectInsightShareGrant(revoked), idempotent: false }
  })
}

export const readInsightShares = async (input: ShareScope & { editionId: string }): Promise<{ items: InsightShareGrantDto[] }> => {
  const grant = await assertInsightsAccess({ ...input, need: 'share_read' })
  const edition = await getInsightEditionById(undefined, grant.organizationId, input.editionId)

  if (!edition || (!grant.isInternal && edition.audience !== 'client')) throw new InsightsNotFoundError('edition', input.editionId)

  const records = await listInsightShareGrantsForEdition(undefined, grant.organizationId, edition.editionId)
  const now = new Date()

  return { items: records.map(record => projectInsightShareGrant(record, now)) }
}
