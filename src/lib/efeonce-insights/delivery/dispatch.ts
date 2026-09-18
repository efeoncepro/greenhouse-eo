import 'server-only'

/**
 * TASK-1848 — despacho de un DeliveryIntent: un correo por destinatario, con el orden que exige §9.
 *
 *   1. Claim atómico `pending → claimed` (dos dispatchers concurrentes: sólo uno envía).
 *   2. Revalidar AL DESPACHAR: intent no cancelado, edición todavía `issued`, destinatario todavía
 *      activo en la organización y buzón no marcado como imposible.
 *   3. share_link: `claimTokenSensitiveEmailIntent` crea la fila de `email_deliveries` y el grant en
 *      la MISMA transacción; el bearer vive sólo en memoria hasta `sendEmail` (nunca en outbox, log
 *      ni base). attachment: PDF por la descarga privada canónica, sin credencial.
 *   4. Resultado honesto: aceptado ⇒ `accepted`; fallo definitivo ⇒ `failed` (+ grant revocado);
 *      timeout/excepción ⇒ `ambiguous` y NO se reintenta hasta reconciliar contra el ledger.
 *
 * Corre en el `ops-worker` (projection reactiva sobre `insights.delivery.requested`) y lee
 * `INSIGHTS_DELIVERY_ENABLED` ahí: sin flag, nada sale aunque el intent exista.
 */

import { claimTokenSensitiveEmailIntent, sendEmail } from '@/lib/email/delivery'
import type { EmailAttachment } from '@/lib/email/types'
import { captureWithDomain } from '@/lib/observability/capture'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { downloadPrivateAsset } from '@/lib/storage/greenhouse-assets'

import { publishInsightShareCreated, publishInsightShareRevoked } from '../events'
import { isInsightsDeliveryEnabled } from '../flags'
import { findInsightOutputsForEdition } from '../render/store'
import { getInsightEditionById } from '../stores/edition-store'
import { getInsightReportById } from '../stores/report-store'
import { insertInsightShareGrant, readInsightOrganizationName, revokeInsightShareGrant } from '../sharing/store'
import { buildInsightShareUrl, digestInsightShareToken, generateInsightShareToken } from '../sharing/token'
import { formatInsightPeriodLabel } from '../sharing/web-model'

import { insightDeliverySourceEventId, rollupInsightDeliveryIntentState, type InsightDeliveryIntentRecord, type InsightDeliveryRecipientRecord } from './contracts'
import {
  claimInsightDeliveryRecipient,
  finishInsightDeliveryRecipient,
  getInsightDeliveryIntent,
  insertInsightDeliveryEvent,
  listInsightDeliveryRecipients,
  readInsightDeliveryTransportForAttempt,
  resolveInsightDeliveryRecipients,
  setInsightDeliveryIntentState
} from './store'

const SOURCE_ENTITY = 'insight_delivery_recipients'
const SYSTEM_ACTOR = { kind: 'system' as const, userId: null, memberId: null }

export interface DispatchInsightDeliveryResult {
  skipped?: 'flag_off' | 'not_found' | 'cancelled'
  accepted: number
  failed: number
  ambiguous: number
  skippedRecipients: number
}

interface EditionEmailFacts {
  organizationName: string
  reportTitle: string
  periodLabel: string
  locale: 'es' | 'en'
}

const loadEditionFacts = async (intent: InsightDeliveryIntentRecord): Promise<{ facts: EditionEmailFacts; editionOk: boolean }> => {
  const edition = await getInsightEditionById(undefined, intent.organizationId, intent.editionId)

  const editionOk = Boolean(edition && edition.state === 'issued' && edition.audience === 'client' && edition.issuedHash === intent.editionIssuedHash)

  if (!edition) return { editionOk: false, facts: { organizationName: '', reportTitle: '', periodLabel: '', locale: 'es' } }

  const [report, organizationName] = await Promise.all([
    getInsightReportById(undefined, intent.organizationId, edition.reportId),
    readInsightOrganizationName(intent.organizationId)
  ])

  const locale = edition.request.locale === 'en-US' ? 'en' : 'es'

  return {
    editionOk,
    facts: {
      organizationName: organizationName ?? '',
      reportTitle: report?.title ?? '',
      periodLabel: formatInsightPeriodLabel(edition.request.period.start, edition.request.period.endExclusive, edition.request.locale ?? 'es-CL'),
      locale
    }
  }
}

const formatExpiry = (iso: string, locale: 'es' | 'en') =>
  new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' }).format(new Date(iso))

type RecipientOutcome = 'accepted' | 'failed' | 'ambiguous' | 'skipped'

const settle = async (
  recipient: InsightDeliveryRecipientRecord,
  state: 'accepted' | 'failed' | 'ambiguous' | 'skipped',
  extra: { skipReason?: InsightDeliveryRecipientRecord['skipReason']; emailDeliveryId?: string | null; shareGrantId?: string | null; lastErrorCode?: string | null } = {}
): Promise<RecipientOutcome> => {
  await finishInsightDeliveryRecipient(undefined, {
    deliveryRecipientId: recipient.deliveryRecipientId,
    fromStates: ['claimed'],
    state,
    skipReason: state === 'skipped' ? extra.skipReason ?? null : null,
    emailDeliveryId: extra.emailDeliveryId ?? null,
    shareGrantId: extra.shareGrantId ?? null,
    lastErrorCode: extra.lastErrorCode ?? null
  })

  await insertInsightDeliveryEvent(undefined, {
    deliveryIntentId: recipient.deliveryIntentId,
    deliveryRecipientId: recipient.deliveryRecipientId,
    organizationId: recipient.organizationId,
    fromState: 'claimed',
    toState: state,
    detail: { ...(extra.skipReason ? { skipReason: extra.skipReason } : {}), ...(extra.lastErrorCode ? { errorCode: extra.lastErrorCode } : {}) },
    actorKind: 'dispatcher'
  })

  return state
}

const dispatchShareLink = async (
  intent: InsightDeliveryIntentRecord,
  recipient: InsightDeliveryRecipientRecord,
  person: { email: string; fullName: string | null; userId: string },
  facts: EditionEmailFacts
): Promise<RecipientOutcome> => {
  const safeContext = { locale: facts.locale, tokenTtlDays: intent.shareTtlDays }
  const sourceEventId = insightDeliverySourceEventId(recipient.deliveryRecipientId, recipient.attempts)

  const claim = await claimTokenSensitiveEmailIntent({
    emailType: 'insights_edition_delivery',
    domain: 'insights',
    recipient: { email: person.email, name: person.fullName ?? undefined, userId: person.userId },
    sourceEventId,
    sourceEntity: SOURCE_ENTITY,
    safeContext,
    issueCredential: async client => {
      const token = generateInsightShareToken()

      const grant = await insertInsightShareGrant(client, {
        organizationId: intent.organizationId,
        editionId: intent.editionId,
        tokenDigest: digestInsightShareToken(token),
        downloadOutputs: intent.outputs as Array<'deck_pdf' | 'report_pdf'>,
        label: null,
        source: 'delivery',
        ttlDays: intent.shareTtlDays ?? 30,
        actor: SYSTEM_ACTOR
      })

      await publishInsightShareCreated(client, {
        version: 1,
        shareGrantId: grant.shareGrantId,
        editionId: grant.editionId,
        organizationId: grant.organizationId,
        expiresAt: grant.expiresAt,
        downloadOutputs: grant.downloadOutputs,
        source: 'delivery',
        actorKind: 'system'
      })

      return { token, shareGrantId: grant.shareGrantId, expiresAt: grant.expiresAt }
    }
  })

  // Ya había un correo para este destinatario: no se manda otro a ciegas. Se reconcilia.
  if (!claim.claimed) return settle(recipient, 'ambiguous', { emailDeliveryId: claim.deliveryId, lastErrorCode: 'existing_email_delivery' })

  // El tipo estaba pausado: la plataforma ya marcó la fila `skipped` y no emitió credencial.
  if (!claim.value) return settle(recipient, 'skipped', { skipReason: 'email_type_paused', emailDeliveryId: claim.deliveryId })

  const { token, shareGrantId, expiresAt } = claim.value

  try {
    const result = await sendEmail({
      emailType: 'insights_edition_delivery',
      domain: 'insights',
      recipients: [{ email: person.email, name: person.fullName ?? undefined, userId: person.userId }],
      context: {
        subject: intent.subject,
        recipientName: person.fullName ?? undefined,
        organizationName: facts.organizationName,
        reportTitle: facts.reportTitle,
        periodLabel: facts.periodLabel,
        modality: 'share_link',
        actionUrl: buildInsightShareUrl(token),
        expiresOnLabel: formatExpiry(expiresAt, facts.locale),
        message: intent.message ?? undefined,
        locale: facts.locale
      },
      sourceEventId,
      sourceEntity: SOURCE_ENTITY,
      persistence: { mode: 'token_sensitive', safeContext, deliveryIntentId: claim.deliveryId }
    })

    if (result.dispatchOutcome === 'accepted') return settle(recipient, 'accepted', { emailDeliveryId: claim.deliveryId, shareGrantId })

    if (result.dispatchOutcome === 'failed') {
      await revokeFailedDeliveryGrant(intent, shareGrantId)

      return settle(recipient, 'failed', { emailDeliveryId: claim.deliveryId, shareGrantId, lastErrorCode: 'provider_rejected' })
    }

    return settle(recipient, 'ambiguous', { emailDeliveryId: claim.deliveryId, shareGrantId, lastErrorCode: 'dispatch_unknown' })
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_delivery_share_link' }, extra: { deliveryRecipientId: recipient.deliveryRecipientId } })

    return settle(recipient, 'ambiguous', { emailDeliveryId: claim.deliveryId, shareGrantId, lastErrorCode: 'dispatch_exception' })
  }
}

/** Un envío que el proveedor rechazó de forma definitiva no dejó el enlace en ningún buzón. */
const revokeFailedDeliveryGrant = async (intent: InsightDeliveryIntentRecord, shareGrantId: string) => {
  await withGreenhousePostgresTransaction(async client => {
    const revoked = await revokeInsightShareGrant(client, { organizationId: intent.organizationId, shareGrantId, actor: SYSTEM_ACTOR, reason: 'delivery_failed' })

    if (revoked) {
      await publishInsightShareRevoked(client, { version: 1, shareGrantId, editionId: intent.editionId, organizationId: intent.organizationId, reason: 'delivery_failed', actorKind: 'system' })
    }
  })
}

const dispatchAttachment = async (
  intent: InsightDeliveryIntentRecord,
  recipient: InsightDeliveryRecipientRecord,
  person: { email: string; fullName: string | null; userId: string },
  facts: EditionEmailFacts
): Promise<RecipientOutcome> => {
  // Dedupe contra el ledger: si este intento ya tiene fila de correo, no se manda otro; se reconcilia.
  const sourceEventId = insightDeliverySourceEventId(recipient.deliveryRecipientId, recipient.attempts)
  const prior = await readInsightDeliveryTransportForAttempt(sourceEventId)

  if (prior) return settle(recipient, 'ambiguous', { emailDeliveryId: prior.deliveryId, lastErrorCode: 'existing_email_delivery' })

  const outputs = await findInsightOutputsForEdition({ organizationId: intent.organizationId, editionId: intent.editionId, audience: 'client' })
  const attachments: EmailAttachment[] = []

  for (const output of intent.outputs) {
    const match = outputs.find(row => row.output === output && row.state === 'completed' && row.outputAssetId)

    if (!match?.outputAssetId) return settle(recipient, 'skipped', { skipReason: 'asset_unavailable' })

    const { file } = await downloadPrivateAsset({
      assetId: match.outputAssetId,
      actorUserId: null,
      accessMetadata: { accessChannel: 'insights_delivery_attachment', deliveryRecipientId: recipient.deliveryRecipientId }
    })

    attachments.push({ filename: `${output.replace('_', '-')}.pdf`, content: Buffer.from(file.arrayBuffer), contentType: file.contentType || 'application/pdf' })
  }

  try {
    const result = await sendEmail({
      emailType: 'insights_edition_delivery_attachment',
      domain: 'insights',
      recipients: [{ email: person.email, name: person.fullName ?? undefined, userId: person.userId }],
      context: {
        subject: intent.subject,
        recipientName: person.fullName ?? undefined,
        organizationName: facts.organizationName,
        reportTitle: facts.reportTitle,
        periodLabel: facts.periodLabel,
        modality: 'attachment',
        message: intent.message ?? undefined,
        locale: facts.locale
      },
      attachments,
      sourceEventId,
      sourceEntity: SOURCE_ENTITY
    })

    if (result.status === 'skipped' && !result.dispatchOutcome) return settle(recipient, 'skipped', { skipReason: 'email_type_paused', emailDeliveryId: result.deliveryId || null })
    if (result.dispatchOutcome === 'accepted') return settle(recipient, 'accepted', { emailDeliveryId: result.deliveryId })
    if (result.dispatchOutcome === 'failed') return settle(recipient, 'failed', { emailDeliveryId: result.deliveryId, lastErrorCode: 'provider_rejected' })

    return settle(recipient, 'ambiguous', { emailDeliveryId: result.deliveryId || null, lastErrorCode: 'dispatch_unknown' })
  } catch (error) {
    captureWithDomain(error, 'insights', { tags: { source: 'insights_delivery_attachment' }, extra: { deliveryRecipientId: recipient.deliveryRecipientId } })

    return settle(recipient, 'ambiguous', { lastErrorCode: 'dispatch_exception' })
  }
}

const refreshIntentState = async (intent: InsightDeliveryIntentRecord) => {
  const recipients = await listInsightDeliveryRecipients(undefined, intent.deliveryIntentId)
  const next = rollupInsightDeliveryIntentState(recipients.map(recipient => recipient.state), intent.state)

  if (next !== intent.state) {
    await withGreenhousePostgresTransaction(async client => {
      await setInsightDeliveryIntentState(client, { deliveryIntentId: intent.deliveryIntentId, state: next })
      await insertInsightDeliveryEvent(client, { deliveryIntentId: intent.deliveryIntentId, organizationId: intent.organizationId, fromState: intent.state, toState: next, actorKind: 'dispatcher' })
    })
  }
}

export const dispatchInsightDeliveryIntent = async (deliveryIntentId: string, env: NodeJS.ProcessEnv = process.env): Promise<DispatchInsightDeliveryResult> => {
  const result: DispatchInsightDeliveryResult = { accepted: 0, failed: 0, ambiguous: 0, skippedRecipients: 0 }

  if (!isInsightsDeliveryEnabled(env)) return { ...result, skipped: 'flag_off' }

  const intent = await getInsightDeliveryIntent(undefined, deliveryIntentId)

  if (!intent) return { ...result, skipped: 'not_found' }
  if (intent.state === 'cancelled') return { ...result, skipped: 'cancelled' }

  const { facts, editionOk } = await loadEditionFacts(intent)
  const recipients = await listInsightDeliveryRecipients(undefined, intent.deliveryIntentId)
  const pending = recipients.filter(recipient => recipient.state === 'pending')
  const people = await resolveInsightDeliveryRecipients(intent.organizationId, pending.map(recipient => recipient.recipientUserId))
  const byUser = new Map(people.map(person => [person.userId, person]))

  for (const candidate of pending) {
    const recipient = await claimInsightDeliveryRecipient(candidate.deliveryRecipientId)

    if (!recipient) continue

    let outcome: RecipientOutcome

    const person = byUser.get(recipient.recipientUserId)

    if (!editionOk) {
      outcome = await settle(recipient, 'skipped', { skipReason: 'edition_unavailable' })
    } else if (!person || person.email !== recipient.recipientKey) {
      outcome = await settle(recipient, 'skipped', { skipReason: 'recipient_inactive' })
    } else if (person.undeliverable) {
      outcome = await settle(recipient, 'skipped', { skipReason: 'recipient_undeliverable' })
    } else if (intent.modality === 'share_link') {
      outcome = await dispatchShareLink(intent, recipient, person, facts)
    } else if (intent.modality === 'attachment') {
      outcome = await dispatchAttachment(intent, recipient, person, facts)
    } else {
      // portal_link no se despacha hasta que exista la ruta del portal (TASK-1849).
      outcome = await settle(recipient, 'skipped', { skipReason: 'edition_unavailable', lastErrorCode: 'portal_route_unavailable' })
    }

    if (outcome === 'accepted') result.accepted++
    else if (outcome === 'failed') result.failed++
    else if (outcome === 'ambiguous') result.ambiguous++
    else result.skippedRecipients++
  }

  await refreshIntentState(intent)

  return result
}
