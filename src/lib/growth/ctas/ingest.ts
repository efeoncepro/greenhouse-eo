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
import { isSubmissionServerAccepted } from '@/lib/growth/forms/readers'

import {
  CTA_EVENT_PAYLOAD_ALLOWED_KEYS,
  CTA_UTM_ALLOWED_KEYS,
  type CtaIngestRejectionReason,
  type CtaPublicEventInput,
  type CtaPublicEventResult,
  ctaPublicEventInputSchema,
  isTierBEventKind,
} from './contracts'
import { recordCtaExposure } from './exposure'
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
import { recordCtaConversion, recordCtaDismissal, resolveVisitorSubjects } from './visitor-state'

export interface IngestContext {
  origin: string | null
  ip: string | null
}

const pickAllowlisted = <T extends Record<string, unknown>>(source: T, allowedKeys: readonly string[]) =>
  Object.fromEntries(Object.entries(source).filter(([key]) => allowedKeys.includes(key)))

/**
 * Persiste el rechazo sin PII, capped por IP/hora (la forja no infla el ledger sin
 * límite). Los kinds Tier B (`viewed`) NO se persisten en el ledger ni rechazados
 * (el CHECK de `event_kind` es Tier A-only; la telemetría de forja sigue siendo
 * Tier A — un forjador de Tier A queda igual de visible).
 */
const recordRejection = async (
  reason: CtaIngestRejectionReason,
  input: CtaPublicEventInput,
  context: IngestContext,
  refs: { ctaId?: string | null; ctaVersionId?: string | null; surfaceId?: string | null },
): Promise<void> => {
  if (isTierBEventKind(input.eventKind)) return

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

  // 5-bis. Tier B (`viewed`, TASK-1428): tras la MISMA cadena de defensa, la exposición
  // va al rollup agregado (sampling + fail-open), JAMÁS al ledger OLTP (arch §9.4).
  // Sin rate-limit del ledger (no escribe filas) — sampling + surface auth son el guard.
  if (isTierBEventKind(input.eventKind)) {
    await recordCtaExposure({
      ctaId: definition.cta_id,
      surfaceId: surface.surface_id,
      placement: input.placement ?? version.placement,
      exposureKind: 'viewed',
      reasonClass: null,
      decisionSource: 'browser',
      enforced: false,
    })

    return { outcome: 'accepted' }
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

  // 9. Hooks de visitor state (TASK-1428). El dismiss persiste ANTES de que la UX
  //    complete la salida visual (el renderer espera este 202 — la suppression jamás
  //    depende de animationend). La conversión suprime SOLO con evidencia verificada
  //    server-side contra Growth Forms (un claim browser nunca suprime permanente).
  const subjects = resolveVisitorSubjects({
    visitorKey: input.visitorKey ?? null,
    sessionKey: input.sessionKey ?? null,
    consentState: input.consentState,
    consentSource: input.consentSource,
  })

  if (subjects.length > 0) {
    try {
      if (input.eventKind === 'dismissed') {
        await recordCtaDismissal(subjects, definition.cta_id, input.consentState)
      } else if (input.eventKind === 'form_submitted' && input.formSubmissionId) {
        const verified = await isSubmissionServerAccepted(input.formSubmissionId)

        if (verified) {
          await recordCtaConversion(subjects, definition.cta_id, input.formSubmissionId, input.consentState)
        }
      }
    } catch {
      // Best-effort: el estado de suppression nunca rompe el ingest aceptado (el
      // evento Tier A ya persistió; Sentry cubre fallas sistémicas en la route).
    }
  }

  return { outcome: 'accepted', eventId }
}
