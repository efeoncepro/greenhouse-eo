import 'server-only'

import { sendEmail } from '@/lib/email/delivery'
import { captureWithDomain } from '@/lib/observability/capture'

import { resolveEventRegistrationPolicy, type EventRegistrationEvent } from './contracts'
import { buildEventIcs } from './event-ics'
import { isEventEmailsEnabled } from './flags'
import {
  ACCEPTED_SUBMISSION_STATUSES,
  getFormDefinitionById,
  getFormVersionById,
  getSubmissionById,
  listDueEventReminderSubmissionIds
} from './store'

/**
 * 2026-10-24 — Correos de las reservas de eventos y webinars (portada del blog). GENÉRICO: sirve para CUALQUIER evento;
 * todo sale de la política server-only de la versión publicada (`ui_policy.eventRegistration.event`, `joinUrl`,
 * `reminderMinutesBefore`), nada hardcodeado por evento.
 *
 *   - Confirmación (consumer reactivo de `growth.forms.submission_accepted`): lugar reservado con el enlace privado de
 *     la sala y el `.ics` adjunto, o aviso de lista de espera (sin enlace).
 *   - Recordatorio (job del ops-worker cada 15 min): a cada reserva confirmada cuando faltan
 *     `reminderMinutesBefore` minutos o menos para el inicio.
 *
 * Idempotente por `sourceEventId` en la capa de entrega (`event_reg_<id>`, `event_rem_<id>`). Re-lee todo de PG.
 * Gateado por `GROWTH_EVENT_EMAILS_ENABLED` (default OFF → la reserva se registra sin correo).
 */

const asString = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

const TZ_COUNTRY: Record<string, string> = {
  'America/Santiago': 'Chile',
  'America/Bogota': 'Colombia',
  'America/Lima': 'Perú',
  'America/Mexico_City': 'México',
  'America/Argentina/Buenos_Aires': 'Argentina',
  'America/Guayaquil': 'Ecuador',
  'America/Caracas': 'Venezuela',
  'America/Panama': 'Panamá',
  'America/Montevideo': 'Uruguay',
  'Europe/Madrid': 'España'
}

/** Etiquetas legibles del evento para el correo. PURO (exportado para pruebas). */
export const eventEmailLabels = (event: EventRegistrationEvent, locale: 'es' | 'en' = 'es') => {
  const start = new Date(event.startUtc)
  const lang = locale === 'en' ? 'en-US' : 'es-CL'

  const date = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: event.timezone })
    .format(start)
    .replace(',', '')

  const hour = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: event.timezone }).format(start)
  const place = TZ_COUNTRY[event.timezone] ?? event.timezone.split('/').pop()?.replace(/_/g, ' ') ?? event.timezone
  const minutes = event.durationMin
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  const durationLabel =
    locale === 'en'
      ? hours ? `${hours} h${rest ? ` ${rest} min` : ''}` : `${minutes} minutes`
      : hours ? `${hours} h${rest ? ` ${rest} min` : ''}` : `${minutes} minutos`

  const venue = asString(event.venue)

  const modalityLabel =
    event.modality === 'online'
      ? locale === 'en' ? 'Online' : 'En línea'
      : event.modality === 'presencial'
        ? `${locale === 'en' ? 'In person' : 'Presencial'}${venue ? ` · ${venue}` : ''}`
        : `${locale === 'en' ? 'Online and in person' : 'En línea y presencial'}${venue ? ` · ${venue}` : ''}`

  return { whenLabel: `${date} · ${hour} (${place})`, durationLabel, modalityLabel }
}

const loadRegistration = async (submissionId: string) => {
  const submission = await getSubmissionById(submissionId)

  // Aceptada = cualquier estado desde `accepted` en adelante: el dispatcher la mueve a `delivered` (o a un estado de
  // falla de destino) en cuanto HubSpot responde, a menudo ANTES de que corra este consumer (2026-10-24: el primer
  // envío real llegó `delivered` y el correo se saltó). Una falla de destino no anula la reserva.
  const accepted = (ACCEPTED_SUBMISSION_STATUSES as readonly string[]).includes(submission?.status ?? '')

  if (!submission || !accepted) return { skip: `submission ${submissionId} no aceptada o inexistente` } as const

  const def = await getFormDefinitionById(submission.form_id)

  if (!def || def.form_kind !== 'event_registration') return { skip: `form ${submission.form_id} no es una reserva de evento` } as const

  const version = await getFormVersionById(submission.form_version_id)
  const policy = version ? resolveEventRegistrationPolicy(def.form_kind, version.ui_policy_json) : null

  if (!policy?.event) return { skip: `form ${def.slug} sin datos del evento (ui_policy.eventRegistration.event)` } as const

  const fields = (submission.normalized_fields_json ?? {}) as Record<string, unknown>
  const email = asString(fields.email)

  if (!email) {
    captureWithDomain(new Error(`event_emails: submission ${submissionId} sin email`), 'growth', {
      tags: { source: 'growth_event_emails', stage: 'resolve_email' },
      extra: { submissionId }
    })

    return { skip: `submission ${submissionId} sin email` } as const
  }

  const eventKey = asString(fields.event_key) ?? def.slug
  const waitlisted = asString(fields[policy.statusField]) === 'waitlisted'
  const recipientName = [asString(fields.firstName), asString(fields.lastName)].filter(Boolean).join(' ') || undefined

  return { submission, def, policy, event: policy.event, email, eventKey, waitlisted, recipientName } as const
}

/** Confirmación o lista de espera de una reserva aceptada. Devuelve un mensaje de resultado (no-op honesto). */
export const sendEventRegistrationEmail = async (submissionId: string, now = new Date()): Promise<string> => {
  if (!isEventEmailsEnabled()) return `event_registration_email skip: flag OFF (${submissionId})`

  const loaded = await loadRegistration(submissionId)

  if ('skip' in loaded) return `event_registration_email no-op: ${loaded.skip}`

  const { event, email, eventKey, waitlisted, recipientName, policy } = loaded
  const variant = waitlisted ? 'waitlisted' : 'confirmed'
  const joinUrl = waitlisted ? undefined : policy.joinUrl

  const attachments = waitlisted
    ? undefined
    : [{ filename: 'evento-efeonce.ics', content: Buffer.from(buildEventIcs({ event, eventKey, joinUrl, now }), 'utf8'), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }]

  const result = await sendEmail({
    emailType: 'growth_event_registration',
    domain: 'growth',
    recipients: [{ email, name: recipientName }],
    context: { variant, recipientName, eventTitle: event.title, ...eventEmailLabels(event), joinUrl, eventPageUrl: event.pageUrl, locale: 'es' },
    attachments,
    sourceEntity: 'growth_event_registration',
    sourceEventId: `event_reg_${submissionId}`
  })

  return `event_registration_email ${variant} ${result.status}: ${submissionId} → ${eventKey} (deliveryId=${result.deliveryId ?? '-'})`
}

/** Recordatorio de una reserva confirmada. */
export const sendEventReminderEmail = async (submissionId: string): Promise<string> => {
  const loaded = await loadRegistration(submissionId)

  if ('skip' in loaded) return `event_reminder no-op: ${loaded.skip}`
  if (loaded.waitlisted) return `event_reminder no-op: ${submissionId} en lista de espera`

  const { event, email, eventKey, recipientName, policy } = loaded

  const result = await sendEmail({
    emailType: 'growth_event_reminder',
    domain: 'growth',
    recipients: [{ email, name: recipientName }],
    context: { variant: 'reminder', recipientName, eventTitle: event.title, ...eventEmailLabels(event), joinUrl: policy.joinUrl, eventPageUrl: event.pageUrl, calendarNote: '', locale: 'es' },
    sourceEntity: 'growth_event_reminder',
    sourceEventId: `event_rem_${submissionId}`
  })

  return `event_reminder ${result.status}: ${submissionId} → ${eventKey}`
}

/** Vuelta del job: envía los recordatorios que ya corresponden. Devuelve el resumen. */
export const sendDueEventReminders = async (now = new Date()) => {
  if (!isEventEmailsEnabled()) return { ok: true, skipped: 'flag OFF', due: 0, results: [] as string[] }

  const ids = await listDueEventReminderSubmissionIds(now)
  const results: string[] = []

  for (const id of ids) {
    try {
      results.push(await sendEventReminderEmail(id))
    } catch (error) {
      captureWithDomain(error, 'growth', { tags: { source: 'growth_event_emails', stage: 'reminder' }, extra: { submissionId: id } })
      results.push(`event_reminder failed: ${id}`)
    }
  }

  return { ok: true, due: ids.length, results }
}
