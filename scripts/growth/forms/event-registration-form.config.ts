/**
 * TASK-2053 — Forma canónica de un formulario de reserva por evento (`event_registration`).
 *
 * Un evento = un formulario propio: su identificación pública viaja como campo oculto con
 * `staticValue` (el servidor la impone al aceptar), su cupo y su lista de espera viven en
 * `ui_policy.eventRegistration` (server-only) y su presentación es la píldora en línea de la portada
 * del blog v3. Este módulo es PURO (sin I/O): lo consumen el publicador
 * (`publish-event-registration-form.ts`) y sus pruebas.
 */
import { z } from 'zod'

import { eventRegistrationEventSchema } from '@/lib/growth/forms/contracts'

import { STANDARD_EBOOK_UI_POLICY } from '../ebook-forms.registry'

const labelSchema = z.string().trim().min(1).max(80)

export const eventRegistrationFormConfigSchema = z
  .object({
    /** Slug público estable del formulario (kebab). */
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
    name: z.string().trim().min(1).max(200),
    /** Identificación pública y estable del evento (llega al destino como `event_key`). */
    eventKey: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
    /** Fecha del evento como se lee en la confirmación («12 de noviembre»). */
    eventDateLabel: z.string().trim().min(1).max(40),
    capacity: z.number().int().positive().max(100_000).optional(),
    overCapacity: z.enum(['waitlist', 'reject']).default('waitlist'),
    showRegistrationsCount: z.boolean().default(false),
    registrationsCountThreshold: z.number().int().min(1).max(100_000).optional(),
    surfaceId: z.string().regex(/^fhsf-[a-z0-9-]+$/),
    surfaceName: z.string().trim().min(1).max(200),
    origins: z.array(z.string().url()).min(1),
    privacyUrl: z.string().url(),
    consentPolicyVersion: z.string().trim().min(1).max(80),
    /** 2026-10-24 — Datos del evento para sus correos (confirmación, lista de espera, recordatorio) y su `.ics`. */
    event: eventRegistrationEventSchema.optional(),
    /** Enlace privado de la sala (Zoom, Meet, Teams…): sólo viaja en los correos, nunca al navegador ni a WordPress. */
    joinUrl: z.string().url().optional(),
    reminderMinutesBefore: z.number().int().min(15).max(1440).optional(),
    labels: z
      .object({
        openLabel: labelSchema.default('Reservar mi lugar'),
        submitLabel: labelSchema.default('Reservar'),
        successLabel: labelSchema.default('¡Lugar reservado!'),
        waitlistSuccessLabel: labelSchema.default('Quedaste en lista de espera'),
        waitlistDoneLabel: labelSchema.default('Te avisamos si se libera un lugar'),
        // Cierto sólo con los correos del evento activos (GROWTH_EVENT_EMAILS_ENABLED + `event` + `joinUrl`): la
        // confirmación lleva el enlace de la sala y el recordatorio sale antes del inicio.
        note: z.string().trim().min(1).max(280).default('Te enviamos el enlace y un recordatorio antes del evento.')
      })
      .default({})
  })
  .strict()

export type EventRegistrationFormConfig = z.infer<typeof eventRegistrationFormConfigSchema>

export const EVENT_KEY_FIELD = 'event_key'

/** Versión lista para `authorDraftForm`. La confirmación final lleva la fecha del evento. */
export const buildEventRegistrationVersion = (config: EventRegistrationFormConfig) => ({
  slug: config.slug,
  name: config.name,
  formKind: 'event_registration' as const,
  purpose: `Reserva de lugar para el evento ${config.eventKey}`,
  riskProfile: 'low' as const,
  locale: 'es-CL',
  fieldSchema: [
    {
      key: 'email',
      type: 'email',
      label: 'Tu correo de trabajo',
      placeholder: 'tu@empresa.com',
      required: true,
      autocomplete: 'email',
      dataClass: 'contact_pii'
    },
    { key: EVENT_KEY_FIELD, type: 'hidden', staticValue: config.eventKey, dataClass: 'public' }
  ],
  validationSchema: {},
  copyRefs: {
    noticeText: config.labels.note,
    privacyUrl: config.privacyUrl,
    checkboxes: []
  },
  uiPolicy: {
    composition: 'static',
    presentation: 'inline_pill',
    inlinePill: {
      openLabel: config.labels.openLabel,
      submitLabel: config.labels.submitLabel,
      successLabel: config.labels.successLabel,
      doneLabel: `Te esperamos el ${config.eventDateLabel}`,
      waitlistSuccessLabel: config.labels.waitlistSuccessLabel,
      waitlistDoneLabel: config.labels.waitlistDoneLabel,
      note: config.labels.note
    },
    eventRegistration: {
      ...(config.event ? { event: config.event } : {}),
      ...(config.joinUrl ? { joinUrl: config.joinUrl } : {}),
      ...(config.reminderMinutesBefore !== undefined ? { reminderMinutesBefore: config.reminderMinutesBefore } : {}),
      ...(config.capacity !== undefined ? { capacity: config.capacity } : {}),
      overCapacity: config.overCapacity,
      showRegistrationsCount: config.showRegistrationsCount,
      ...(config.registrationsCountThreshold !== undefined
        ? { registrationsCountThreshold: config.registrationsCountThreshold }
        : {})
    },
    security: STANDARD_EBOOK_UI_POLICY.security
  },
  successBehavior: { kind: 'inline_message' as const, message: `Te esperamos el ${config.eventDateLabel}` },
  destinationPolicy: {
    mode: 'greenhouse_only',
    engineDestinations: false,
    rationale:
      'Reserva capturada en Greenhouse. Confirmación, lista de espera y recordatorio los envía Greenhouse (growth_event_registration / growth_event_reminder); el contacto llega a HubSpot por el formulario compartido de reservas de eventos.'
  },
  retentionPolicy: {
    scope: 'prospect_lead_pii',
    leadPiiRetentionDays: 730,
    legalBasis: 'consent',
    consentPolicyVersion: config.consentPolicyVersion
  },
  consentPolicyVersion: config.consentPolicyVersion,
  createdBy: 'task-2053-publish-event-registration'
})
