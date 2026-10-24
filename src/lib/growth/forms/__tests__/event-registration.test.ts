/**
 * TASK-2053 Slice 2 — Reserva por evento: valor oculto estático, cupo y lista de espera.
 *
 * La decisión del cupo vive en la transacción del envío (`persistAcceptedSubmission`): aquí se
 * ejercita su rama con un cliente simulado. El SQL real (conteo DISTINCT + lock transaccional) se
 * verificó contra un PostgreSQL 16 local; ver el Status real de TASK-2053.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { PoolClient } from 'pg'

const { query, publishOutboxEvent } = vi.hoisted(() => ({ query: vi.fn(), publishOutboxEvent: vi.fn() }))

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  getDb: vi.fn(),
  withTransaction: vi.fn(async (callback: (client: PoolClient) => unknown) => callback({ query } as unknown as PoolClient))
}))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent }))

import { applyStaticFieldValues } from '../commands'
import { resolveEventRegistrationPolicy } from '../contracts'
import { compileFormVersion } from '../policy-compiler'
import {
  EventCapacityFullError,
  persistAcceptedSubmission,
  type FormDefinitionRow,
  type FormVersionRow,
  type PersistSubmissionInput
} from '../store'
import { buildEventRegistrationVersion, eventRegistrationFormConfigSchema } from '../../../../../scripts/growth/forms/event-registration-form.config'

const eventDefinition: FormDefinitionRow = {
  form_id: 'fdef-webinar',
  form_key: '00000000-0000-4000-8000-000000000210',
  slug: 'webinar-aeo',
  name: 'Webinar',
  form_kind: 'event_registration',
  purpose: 'evento',
  risk_profile: 'low',
  owner_team: null,
  status: 'active',
  default_locale: 'es-CL',
  created_by: null,
  created_at: new Date(),
  updated_at: new Date()
}

const version = (overrides: Partial<FormVersionRow> = {}): FormVersionRow => ({
  form_version_id: 'fver-webinar-1',
  form_id: 'fdef-webinar',
  version: 1,
  status: 'review',
  locale: 'es-CL',
  field_schema_json: [
    { key: 'email', type: 'email', required: true },
    { key: 'event_key', type: 'hidden', staticValue: 'webinar-aeo-2026-11-12' }
  ],
  validation_schema_json: {},
  copy_refs_json: {},
  style_variant: null,
  ui_policy_json: { composition: 'static', eventRegistration: { capacity: 2, overCapacity: 'waitlist' } },
  success_behavior_json: { kind: 'inline_message', message: 'Te esperamos' },
  consent_policy_version: 'v1',
  data_classification_json: {},
  destination_policy_json: { allow: true },
  analytics_policy_json: {},
  retention_policy_json: { days: 365 },
  commercial_handoff_policy_json: {},
  published_at: null,
  created_at: new Date(),
  ...overrides
})

const compile = (overrides: Partial<FormVersionRow> = {}, definition: FormDefinitionRow = eventDefinition) =>
  compileFormVersion(definition, version(overrides), [], { forPublication: true })

describe('TASK-2053 · contrato de la reserva por evento', () => {
  it('publica un formulario de evento con valor oculto estático y política de cupo', () => {
    const result = compile()

    expect(result.ok).toBe(true)
    expect(result.renderContract?.fields[1]).toEqual({
      key: 'event_key',
      type: 'hidden',
      required: false,
      staticValue: 'webinar-aeo-2026-11-12'
    })
  })

  it('el cupo y la política NO cruzan al contrato público', () => {
    const contract = JSON.stringify(compile().renderContract)

    expect(contract).not.toContain('eventRegistration')
    expect(contract).not.toContain('capacity')
    expect(contract).not.toContain('waitlist')
  })

  it('staticValue fuera de un campo oculto bloquea', () => {
    const result = compile({ field_schema_json: [{ key: 'email', type: 'email', required: true, staticValue: 'x' }] })

    expect(result.ok).toBe(false)
    expect(result.warnings.map(w => w.code)).toContain('static_value_not_hidden')
  })

  it('la política de reserva sólo aplica a event_registration', () => {
    const result = compile({}, { ...eventDefinition, form_kind: 'subscribe' })

    expect(result.ok).toBe(false)
    expect(result.warnings.map(w => w.code)).toContain('event_registration_wrong_kind')
  })

  it.each([
    ['cupo no positivo', { capacity: 0 }],
    ['política desconocida', { overCapacity: 'overbook' }],
    ['clave extra', { capacity: 10, seats: 10 }]
  ])('bloquea una política inválida: %s', (_label, policy) => {
    const result = compile({ ui_policy_json: { composition: 'static', eventRegistration: policy } })

    expect(result.ok).toBe(false)
    expect(result.warnings.map(w => w.code)).toContain('event_registration_invalid')
  })

  it('bloquea un formulario que declara el campo de estado (lo escribe el servidor)', () => {
    const result = compile({
      field_schema_json: [
        { key: 'email', type: 'email', required: true },
        { key: 'registration_status', type: 'hidden' }
      ]
    })

    expect(result.warnings.map(w => w.code)).toContain('event_registration_status_field_taken')
  })

  it('resuelve la política con defaults y degrada a null fuera del kind', () => {
    expect(resolveEventRegistrationPolicy('event_registration', { eventRegistration: { capacity: 50 } })).toEqual({
      capacity: 50,
      overCapacity: 'waitlist',
      statusField: 'registration_status',
      showRegistrationsCount: false,
      registrationsCountThreshold: 25
    })
    expect(resolveEventRegistrationPolicy('subscribe', { eventRegistration: { capacity: 50 } })).toBeNull()
    expect(resolveEventRegistrationPolicy('event_registration', {})).toBeNull()
  })
})

describe('TASK-2053 · valor oculto impuesto por el servidor', () => {
  it('el staticValue gana sobre lo que mande el navegador (u omita)', () => {
    const fields = [
      { key: 'email', type: 'email' as const, required: true },
      { key: 'event_key', type: 'hidden' as const, required: false, staticValue: 'webinar-aeo' }
    ]

    expect(applyStaticFieldValues(fields, { email: 'a@empresa.com', event_key: 'otro-evento' })).toEqual({
      email: 'a@empresa.com',
      event_key: 'webinar-aeo'
    })
    expect(applyStaticFieldValues(fields, { email: 'a@empresa.com' })).toEqual({ email: 'a@empresa.com', event_key: 'webinar-aeo' })
  })
})

const baseInput: PersistSubmissionInput = {
  formId: 'fdef-webinar',
  formVersionId: 'fver-webinar-1',
  surfaceId: null,
  pageUri: null,
  pageName: null,
  leadEmailHash: 'hash-nuevo',
  normalizedFields: { email: 'nuevo@empresa.com', event_key: 'webinar-aeo' },
  dedupeFingerprint: null,
  requestId: null,
  ipHash: null,
  consent: { consentPolicyVersion: 'v1', checkboxes: [] }
}

const stubDatabase = (confirmed: number, alreadyConfirmed = false) => {
  query.mockReset()
  publishOutboxEvent.mockReset()
  query.mockImplementation(async (text: string, params?: unknown[]) => {
    if (text.includes('COUNT(DISTINCT lead_email_hash)')) return { rows: [{ confirmed, already_confirmed: alreadyConfirmed }] }

    if (text.includes('INSERT INTO greenhouse_growth.form_submission (')) {
      return { rows: [{ submission_id: 'fsub-1', form_id: 'fdef-webinar', form_version_id: 'fver-webinar-1', normalized_fields_json: JSON.parse(String(params?.[6])), status: 'accepted' }] }
    }

    return { rows: [] }
  })
}

const statements = () => query.mock.calls.map(([text]) => String(text))

afterEach(() => vi.restoreAllMocks())

describe('TASK-2053 · cupo en la transacción del envío', () => {
  it('sin política de reserva no toma lock ni escribe estado (comportamiento de hoy)', async () => {
    stubDatabase(0)
    const accepted = await persistAcceptedSubmission(baseInput)

    expect(accepted.registrationStatus).toBeUndefined()
    expect(accepted.normalized_fields_json).toEqual(baseInput.normalizedFields)
    expect(statements().some(text => text.includes('pg_advisory_xact_lock'))).toBe(false)
  })

  it('con cupo disponible confirma la reserva, bajo lock por formulario', async () => {
    stubDatabase(1)

    const accepted = await persistAcceptedSubmission({
      ...baseInput,
      eventRegistration: { capacity: 2, overCapacity: 'waitlist', statusField: 'registration_status' }
    })

    expect(accepted.registrationStatus).toBe('confirmed')
    expect(accepted.normalized_fields_json).toMatchObject({ registration_status: 'confirmed' })

    const lockAt = statements().findIndex(text => text.includes('pg_advisory_xact_lock'))
    const countAt = statements().findIndex(text => text.includes('COUNT(DISTINCT lead_email_hash)'))
    const insertAt = statements().findIndex(text => text.includes('INSERT INTO greenhouse_growth.form_submission ('))

    expect(lockAt).toBeGreaterThanOrEqual(0)
    expect(lockAt).toBeLessThan(countAt)
    expect(countAt).toBeLessThan(insertAt)
  })

  it('con el cupo lleno y política waitlist acepta en lista de espera (no se pierde el envío)', async () => {
    stubDatabase(2)

    const accepted = await persistAcceptedSubmission({
      ...baseInput,
      eventRegistration: { capacity: 2, overCapacity: 'waitlist', statusField: 'registration_status' }
    })

    expect(accepted.registrationStatus).toBe('waitlisted')
    expect(accepted.normalized_fields_json).toMatchObject({ registration_status: 'waitlisted' })
    expect(publishOutboxEvent).toHaveBeenCalledTimes(1)
  })

  it('con el cupo lleno y política reject revierte sin insertar', async () => {
    stubDatabase(2)
    await expect(
      persistAcceptedSubmission({
        ...baseInput,
        eventRegistration: { capacity: 2, overCapacity: 'reject', statusField: 'registration_status' }
      })
    ).rejects.toBeInstanceOf(EventCapacityFullError)

    expect(statements().some(text => text.includes('INSERT INTO greenhouse_growth.form_submission ('))).toBe(false)
    expect(publishOutboxEvent).not.toHaveBeenCalled()
  })

  it('un correo que ya tiene reserva confirmada no ocupa otro cupo ni cae a lista de espera', async () => {
    stubDatabase(2, true)

    const accepted = await persistAcceptedSubmission({
      ...baseInput,
      eventRegistration: { capacity: 2, overCapacity: 'reject', statusField: 'registration_status' }
    })

    expect(accepted.registrationStatus).toBe('confirmed')
  })

  it('sin cupo declarado confirma sin lock', async () => {
    stubDatabase(999)

    const accepted = await persistAcceptedSubmission({
      ...baseInput,
      eventRegistration: { overCapacity: 'waitlist', statusField: 'registration_status' }
    })

    expect(accepted.registrationStatus).toBe('confirmed')
    expect(statements().some(text => text.includes('pg_advisory_xact_lock'))).toBe(false)
  })
})

describe('TASK-2053 · publicador de formularios por evento', () => {
  it('la versión que arma el publicador pasa el gate de publicación', () => {
    const config = eventRegistrationFormConfigSchema.parse({
      slug: 'webinar-aeo-chatgpt-2026-11-12',
      name: 'Webinar AEO',
      eventKey: 'webinar-aeo-chatgpt-2026-11-12',
      eventDateLabel: '12 de noviembre',
      capacity: 500,
      showRegistrationsCount: true,
      surfaceId: 'fhsf-blog-portada',
      surfaceName: 'Portada del blog',
      origins: ['https://efeoncepro.com'],
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/',
      consentPolicyVersion: 'efeonce-events-2026-10'
    })

    const draft = buildEventRegistrationVersion(config)

    const result = compile({
      field_schema_json: draft.fieldSchema,
      copy_refs_json: draft.copyRefs,
      ui_policy_json: draft.uiPolicy,
      success_behavior_json: draft.successBehavior,
      retention_policy_json: draft.retentionPolicy,
      destination_policy_json: draft.destinationPolicy
    })

    expect(result.blockingReasons).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.renderContract?.presentation).toBe('inline_pill')
    expect(result.renderContract?.inlinePill).toMatchObject({
      openLabel: 'Reservar mi lugar',
      submitLabel: 'Reservar',
      successLabel: '¡Lugar reservado!',
      doneLabel: 'Te esperamos el 12 de noviembre'
    })
    expect(resolveEventRegistrationPolicy('event_registration', draft.uiPolicy)).toMatchObject({
      capacity: 500,
      overCapacity: 'waitlist',
      showRegistrationsCount: true
    })
  })
})
