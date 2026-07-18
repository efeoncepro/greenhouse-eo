/**
 * TASK-1339 — Growth CTA engine: ingest público de evidencia de conversión (Tier A).
 *
 * El ingest es un WRITE FORJABLE (arch §16.1): el embed key autentica la SURFACE,
 * no al visitante. Defensa en profundidad, en orden:
 *   flag → shape → surface binding activa → embed key (timing-safe) → origin
 *   allowlist → cross-check `cta_version ↔ surface` (slug permitido + versión del
 *   CTA reclamado + versión viva) → rate-limit (per-visitor/per-IP sobre el ledger)
 *   → idempotencia (fingerprint + ventana; duplicado ⇒ accepted con el evento
 *   existente) → INSERT append-only.
 *
 * TODO ingest público entra `trust_level='browser_reported'` — el servidor JAMÁS
 * acepta `server_confirmed` desde el browser (la confirmación server llega por otro
 * path). Los rechazos de autorización se persisten SIN PII (ingest_status='rejected',
 * capped por IP/hora) como fuente del signal `growth.cta.surface_unauthorized_attempt`.
 */
import 'server-only'

import { decideAbuse } from '@/lib/growth/public-submission'
import { verifyEmbedKeySecret } from '@/lib/growth/forms/embed-key'

import {
  CTA_EVENT_PAYLOAD_ALLOWED_KEYS,
  CTA_UTM_ALLOWED_KEYS,
  type CtaIngestRejectionReason,
  type CtaPublicEventInput,
  type CtaPublicEventResult,
  ctaPublicEventInputSchema,
} from './contracts'
import { isCtaEngineEnabled, resolveCtaAbuseLimits, resolveCtaDedupeWindowMinutes, resolveCtaRejectionWriteCapPerHour } from './flags'
import { ctaEventDedupeFingerprint, ctaIdentifierHash } from './hash'
import {
  countAcceptedEventsByHash,
  countRejectedEventsByIp,
  findRecentDuplicateEvent,
  getCtaDefinitionBySlug,
  getCtaVersionById,
  getSurfaceBindingById,
  insertConversionEvent,
} from './store'

export interface IngestContext {
  origin: string | null
  ip: string | null
}

const pickAllowlisted = <T extends Record<string, unknown>>(source: T, allowedKeys: readonly string[]) =>
  Object.fromEntries(Object.entries(source).filter(([key]) => allowedKeys.includes(key)))

/** Persiste el rechazo sin PII, capped por IP/hora (la forja no infla el ledger sin límite). */
const recordRejection = async (
  reason: CtaIngestRejectionReason,
  input: CtaPublicEventInput,
  context: IngestContext,
  refs: { ctaId?: string | null; ctaVersionId?: string | null; surfaceId?: string | null },
): Promise<void> => {
  const ipHash = ctaIdentifierHash(context.ip)
  const rejectedLastHour = await countRejectedEventsByIp(ipHash)

  if (rejectedLastHour >= resolveCtaRejectionWriteCapPerHour()) return

  await insertConversionEvent({
    ctaId: refs.ctaId ?? null,
    ctaVersionId: refs.ctaVersionId ?? null,
    surfaceId: refs.surfaceId ?? null,
    eventKind: input.eventKind,
    ipHash,
    trustLevel: 'browser_reported',
    ingestStatus: 'rejected',
    rejectionReasonClass: reason,
    payload: {
      claimedSurfaceId: input.surfaceId,
      claimedCtaSlug: input.ctaSlug,
      claimedCtaVersionId: input.ctaVersionId,
    },
  })
}

/**
 * Ingesta un evento de conversión Tier A. Devuelve outcomes (no lanza para bloqueos
 * esperados); `error` queda para fallas internas que el route captura con
 * `captureWithDomain`.
 */
export const ingestCtaEvent = async (rawInput: unknown, context: IngestContext): Promise<CtaPublicEventResult> => {
  if (!isCtaEngineEnabled()) return { outcome: 'disabled' }

  const parsed = ctaPublicEventInputSchema.safeParse(rawInput)

  if (!parsed.success) return { outcome: 'invalid', reason: 'shape' }
  const input = parsed.data

  // 1. Surface binding activa.
  const surface = await getSurfaceBindingById(input.surfaceId)

  if (!surface || surface.status !== 'active') {
    await recordRejection('surface_unknown_or_inactive', input, context, {})

    return { outcome: 'surface_unauthorized' }
  }

  // 2. Credencial per-surface (timing-safe, fail-closed).
  if (!verifyEmbedKeySecret(input.embedKey, surface.embed_key_hash)) {
    await recordRejection('embed_key_invalid', input, context, { surfaceId: surface.surface_id })

    return { outcome: 'surface_unauthorized' }
  }

  // 3. Origin allowlist (fail-closed: sin Origin no hay ingest browser legítimo).
  const origins = Array.isArray(surface.origin_allowlist_json) ? (surface.origin_allowlist_json as string[]) : []

  if (!context.origin || !origins.includes(context.origin)) {
    await recordRejection('origin_denied', input, context, { surfaceId: surface.surface_id })

    return { outcome: 'surface_unauthorized' }
  }

  // 4. Cross-check `cta_version ↔ surface_id` (regla dura §16.1/§20).
  const allowedSlugs = Array.isArray(surface.allowed_cta_slugs_json) ? (surface.allowed_cta_slugs_json as string[]) : []
  const slugAllowed = allowedSlugs.length === 0 || allowedSlugs.includes(input.ctaSlug)
  const definition = slugAllowed ? await getCtaDefinitionBySlug(input.ctaSlug) : null
  const version = definition ? await getCtaVersionById(input.ctaVersionId) : null
  const versionBelongsToCta = Boolean(definition && version && version.cta_id === definition.cta_id)

  if (!slugAllowed || !definition || !version || !versionBelongsToCta) {
    await recordRejection('surface_version_mismatch', input, context, {
      surfaceId: surface.surface_id,
      ctaId: definition?.cta_id ?? null,
    })

    return { outcome: 'surface_unauthorized' }
  }

  // 5. La versión debe estar (o haber estado) viva: published/paused/deprecated aceptan
  //    evidencia tardía (un click puede llegar minutos después de pausar/deprecar);
  //    draft/review/archived jamás rinden en público ⇒ evento forjado.
  if (!['published', 'paused', 'deprecated'].includes(version.status)) {
    await recordRejection('version_not_live', input, context, {
      surfaceId: surface.surface_id,
      ctaId: definition.cta_id,
      ctaVersionId: version.cta_version_id,
    })

    return { outcome: 'surface_unauthorized' }
  }

  // 6. Rate-limit sobre el ledger (per-visitor → per-IP), core de decisión compartido.
  const visitorKeyHash = ctaIdentifierHash(input.visitorKey)
  const sessionKeyHash = ctaIdentifierHash(input.sessionKey)
  const ipHash = ctaIdentifierHash(context.ip)
  const limits = resolveCtaAbuseLimits()

  const visitorCount = visitorKeyHash ? await countAcceptedEventsByHash('visitor_key_hash', visitorKeyHash, 24) : 0
  const ipCount = ipHash ? await countAcceptedEventsByHash('ip_hash', ipHash, 24) : null

  const decision = decideAbuse({
    emailCountToday: visitorCount,
    ipCountToday: ipCount,
    spentUsdToday: 0,
    estimatedCostUsd: 0,
    limits: {
      perEmailPerDay: limits.perVisitorPerDay,
      perIpPerDay: limits.perIpPerDay,
      globalDailyBudgetUsd: Number.POSITIVE_INFINITY,
    },
  })

  if (!decision.allowed) return { outcome: 'rate_limited' }

  // 7. Idempotencia (visitor + kind + versión + ventana): duplicado ⇒ accepted idempotente.
  const fingerprint = ctaEventDedupeFingerprint({
    ctaVersionId: version.cta_version_id,
    eventKind: input.eventKind,
    visitorKeyHash,
    ipHash,
  })

  const duplicate = await findRecentDuplicateEvent(fingerprint, resolveCtaDedupeWindowMinutes())

  if (duplicate) return { outcome: 'accepted', eventId: duplicate.event_id }

  // 8. INSERT append-only (allowlists duras en utm/payload; NUNCA PII cruda).
  const { eventId } = await insertConversionEvent({
    ctaId: definition.cta_id,
    ctaVersionId: version.cta_version_id,
    surfaceId: surface.surface_id,
    pageUri: input.pageUri ?? null,
    placement: input.placement ?? version.placement,
    triggerKind: input.trigger ?? null,
    variantId: input.variantId ?? 'control',
    actionKind: input.actionKind ?? null,
    eventKind: input.eventKind,
    visitorKeyHash,
    sessionKeyHash,
    ipHash,
    consentState: input.consentState,
    consentSource: input.consentSource,
    utm: pickAllowlisted(input.utm, CTA_UTM_ALLOWED_KEYS) as Record<string, string>,
    referrerDomain: input.referrerDomain ?? null,
    trustLevel: 'browser_reported',
    ingestStatus: 'accepted',
    dedupeFingerprint: fingerprint,
    formSubmissionId: input.formSubmissionId ?? null,
    payload: pickAllowlisted(input.payload, CTA_EVENT_PAYLOAD_ALLOWED_KEYS),
  })

  return { outcome: 'accepted', eventId }
}
