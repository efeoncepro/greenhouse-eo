import 'server-only'

import { sendEmail } from '@/lib/email/delivery'
import { captureWithDomain } from '@/lib/observability/capture'

import { isEbookEmailDeliveryEnabled } from './flags'
import {
  getActiveFormAsset,
  getFormDefinitionById,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  getSubmissionById,
} from './store'

/**
 * TASK-1375 — Entrega por email (respaldo) de un ebook lead magnet. GENÉRICO: sirve para
 * CUALQUIER ebook. El contenido del email (título, bajada, puente) sale del `success_behavior`
 * del propio form publicado — nada hardcodeado por ebook. El link es la ruta GATED
 * (`/api/public/growth/forms/{slug}/asset/{submissionId}`): sin form completado no hay handle.
 *
 * Idempotente por `sourceEventId` (delivery layer) + el ledger reactivo del consumer.
 * Gateado por `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` (default OFF → sólo descarga on-screen).
 */

const asString = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

const publicBaseUrl = (): string =>
  (process.env.GREENHOUSE_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://greenhouse.efeoncepro.com').replace(
    /\/$/,
    '',
  )

const absolutize = (href: string | undefined, origin: string | undefined): string | undefined => {
  if (!href) return undefined
  if (/^https?:\/\//i.test(href)) return href
  if (href.startsWith('/') && origin) return `${origin.replace(/\/$/, '')}${href}`

  return undefined
}

/**
 * Envía el email de entrega del ebook para una submission aceptada. Devuelve un mensaje de
 * resultado (no-op honesto cuando no aplica). Re-lee todo de PG (nunca confía en el payload).
 */
export const sendEbookDeliveryEmail = async (submissionId: string): Promise<string> => {
  if (!isEbookEmailDeliveryEnabled()) return `ebook_delivery skip: flag OFF (${submissionId})`

  const submission = await getSubmissionById(submissionId)

  if (!submission) return `ebook_delivery no-op: submission ${submissionId} no existe`

  // Sólo forms que entregan un asset (ebook). Otros forms del motor no son responsabilidad de este consumer.
  const asset = await getActiveFormAsset(submission.form_id)

  if (!asset) return `ebook_delivery no-op: form ${submission.form_id} sin asset (no es ebook)`

  const fields = (submission.normalized_fields_json ?? {}) as Record<string, unknown>
  const email = asString(fields.email)
  const firstName = asString(fields.firstName)
  const lastName = asString(fields.lastName)

  if (!email) {
    const err = new Error(`ebook_delivery: submission ${submissionId} sin email en normalized_fields`)

    captureWithDomain(err, 'growth', { tags: { source: 'growth_ebook_delivery', stage: 'resolve_email' }, extra: { submissionId } })

    return `ebook_delivery skip: submission ${submissionId} sin email`
  }

  const def = await getFormDefinitionById(submission.form_id)
  const slug = def?.slug

  if (!slug) return `ebook_delivery no-op: form ${submission.form_id} sin slug`

  // Contenido del email desde el success_behavior del form (SSOT del thank-you). Genérico por ebook.
  const published = await getPublishedVersionBySlug(slug)
  const success = (published?.success_behavior_json ?? {}) as Record<string, unknown>
  const reward = (success.reward ?? {}) as Record<string, unknown>
  const actions = Array.isArray(success.actions) ? (success.actions as Array<Record<string, unknown>>) : []
  const bridge = actions[0] ?? {}

  const ebookTitle = asString(reward.title) ?? asString((success as Record<string, unknown>).title) ?? asString(def?.name) ?? 'Tu ebook'
  const ebookTagline = asString(reward.body)

  const surface = submission.surface_id ? await getHostSurfaceById(submission.surface_id) : null

  const surfaceOrigin = Array.isArray(surface?.origin_allowlist_json)
    ? asString((surface?.origin_allowlist_json as unknown[])[0])
    : undefined

  const bridgeLabel = asString(bridge.label)
  const bridgeUrl = absolutize(asString(bridge.href), surfaceOrigin)

  const downloadUrl = `${publicBaseUrl()}/api/public/growth/forms/${slug}/asset/${submissionId}`
  const recipientName = [firstName, lastName].filter(Boolean).join(' ') || undefined
  const locale = asString(fields.locale) === 'en' ? 'en' : 'es'

  const result = await sendEmail({
    emailType: 'growth_ebook_delivery',
    domain: 'growth',
    recipients: [{ email, name: recipientName }],
    context: { recipientName, ebookTitle, ebookTagline, downloadUrl, bridgeLabel, bridgeUrl, locale },
    sourceEntity: 'growth_ebook_delivery',
    sourceEventId: `ebook_${submissionId}`,
  })

  return `ebook_delivery ${result.status}: ${submissionId} → ${slug} (deliveryId=${result.deliveryId ?? '-'})`
}
