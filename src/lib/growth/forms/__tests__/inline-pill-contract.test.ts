/**
 * TASK-2053 Slice 1 — Presentación `inline_pill` del contrato de Growth Forms.
 *
 * Invariante de retrocompatibilidad: una versión que no declara `ui_policy.presentation` compila al
 * mismo contrato de siempre (sin las claves nuevas), así que los formularios publicados no cambian.
 */
import { describe, expect, it } from 'vitest'

import { compileFormVersion } from '../policy-compiler'
import type { FormDefinitionRow, FormVersionRow } from '../store'

const definition: FormDefinitionRow = {
  form_id: 'fdef-glitch',
  form_key: '00000000-0000-4000-8000-000000002053',
  slug: 'glitch-inline',
  name: 'Glitch',
  form_kind: 'subscribe',
  purpose: 'newsletter',
  risk_profile: 'low',
  owner_team: null,
  status: 'active',
  default_locale: 'es-CL',
  created_by: null,
  created_at: new Date(),
  updated_at: new Date()
}

const version = (overrides: Partial<FormVersionRow> = {}): FormVersionRow => ({
  form_version_id: 'fver-glitch-1',
  form_id: 'fdef-glitch',
  version: 1,
  status: 'review',
  locale: 'es-CL',
  field_schema_json: [{ key: 'email', type: 'email', required: true, placeholder: 'tu@empresa.com' }],
  validation_schema_json: {},
  copy_refs_json: { noticeText: 'Aviso', privacyUrl: 'https://efeoncepro.com/privacidad/' },
  style_variant: null,
  ui_policy_json: { composition: 'static' },
  success_behavior_json: { kind: 'inline_message', message: 'Gracias' },
  consent_policy_version: 'v1',
  data_classification_json: {},
  destination_policy_json: { allow: true },
  analytics_policy_json: { enabled: true },
  retention_policy_json: { days: 365 },
  commercial_handoff_policy_json: {},
  published_at: null,
  created_at: new Date(),
  ...overrides
})

const compile = (overrides: Partial<FormVersionRow> = {}) =>
  compileFormVersion(definition, version(overrides), [], { forPublication: true })

const inline = (inlinePill: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  ui_policy_json: { composition: 'static', presentation: 'inline_pill', inlinePill, ...extra }
})

const GLITCH_LABELS = {
  openLabel: 'Suscríbete a Glitch',
  submitLabel: 'Suscribirme',
  successLabel: '¡Listo!',
  doneLabel: 'Ya estás suscrito a Glitch',
  note: 'Al suscribirte aceptas la política de privacidad. Te das de baja cuando quieras.'
}

/** Claves del contrato público antes de TASK-2053 (con consentimiento y sin seguridad). */
const PRE_TASK_2053_KEYS = [
  'composition',
  'conditions',
  'consent',
  'contractVersion',
  'copy',
  'fields',
  'form',
  'steps',
  'styleVariant',
  'successBehavior',
  'surfacePolicy',
  'telemetryPolicy'
]

describe('TASK-2053 · retrocompatibilidad', () => {
  it('una versión sin presentation compila sin las claves nuevas', () => {
    const result = compile()

    expect(result.ok).toBe(true)
    expect(Object.keys(result.renderContract ?? {}).sort()).toEqual(PRE_TASK_2053_KEYS)
    expect(result.renderContract).not.toHaveProperty('presentation')
    expect(result.renderContract).not.toHaveProperty('inlinePill')
  })

  it('presentation=standard es igual a omitirla', () => {
    const omitted = compile()
    const explicit = compile({ ui_policy_json: { composition: 'static', presentation: 'standard' } })

    expect(explicit.ok).toBe(true)
    expect(explicit.renderContract).toEqual(omitted.renderContract)
  })

  it('los formularios de varios campos siguen publicando sin cambios', () => {
    const result = compile({
      field_schema_json: [
        { key: 'firstName', type: 'text', required: true },
        { key: 'email', type: 'email', required: true }
      ],
      copy_refs_json: { checkboxes: [{ key: 'marketingConsent', label: 'Acepto', required: true }] }
    })

    expect(result.ok).toBe(true)
    expect(result.renderContract).not.toHaveProperty('presentation')
  })
})

describe('TASK-2053 · inline_pill', () => {
  it('valida y entrega sus etiquetas', () => {
    const result = compile(inline(GLITCH_LABELS))

    expect(result.ok).toBe(true)
    expect(result.blockingReasons).toEqual([])
    expect(result.renderContract?.presentation).toBe('inline_pill')
    expect(result.renderContract?.inlinePill).toEqual(GLITCH_LABELS)
  })

  it('las etiquetas son opcionales: sin ellas el renderer usa las del locale', () => {
    const result = compile(inline())

    expect(result.ok).toBe(true)
    expect(result.renderContract?.presentation).toBe('inline_pill')
    expect(result.renderContract).not.toHaveProperty('inlinePill')
  })

  it('admite campos ocultos junto al correo', () => {
    const result = compile({
      ...inline(GLITCH_LABELS),
      field_schema_json: [
        { key: 'email', type: 'email', required: true },
        { key: 'source', type: 'hidden' }
      ]
    })

    expect(result.ok).toBe(true)
  })

  it.each([
    ['dos campos visibles', [{ key: 'firstName', type: 'text', required: true }, { key: 'email', type: 'email', required: true }]],
    ['correo opcional', [{ key: 'email', type: 'email', required: false }]],
    ['campo visible que no es correo', [{ key: 'company', type: 'text', required: true }]]
  ])('bloquea la publicación con %s', (_label, fields) => {
    const result = compile({ ...inline(GLITCH_LABELS), field_schema_json: fields })

    expect(result.ok).toBe(false)
    expect(result.warnings.map(w => w.code)).toContain('inline_pill_fields')
  })

  it('bloquea casillas de consentimiento (la píldora no las dibuja)', () => {
    const result = compile({
      ...inline(GLITCH_LABELS),
      copy_refs_json: { checkboxes: [{ key: 'marketingConsent', label: 'Acepto', required: true }] }
    })

    expect(result.ok).toBe(false)
    expect(result.warnings.map(w => w.code)).toContain('inline_pill_consent_checkboxes')
  })

  it('bloquea composiciones de varios pasos', () => {
    const result = compile({
      ui_policy_json: {
        composition: 'multi_step_light',
        steps: [{ key: 'a', fieldKeys: ['email'] }],
        presentation: 'inline_pill'
      }
    })

    expect(result.ok).toBe(false)
    expect(result.warnings.map(w => w.code)).toContain('inline_pill_composition')
  })

  it('bloquea redirect y success_card', () => {
    const redirect = compile({
      ...inline(GLITCH_LABELS),
      success_behavior_json: { kind: 'redirect', redirectUrl: 'https://efeoncepro.com/gracias/' }
    })

    const card = compile({
      ...inline(GLITCH_LABELS),
      success_behavior_json: { kind: 'inline_message', presentation: 'success_card', title: 'Gracias' }
    })

    expect(redirect.warnings.map(w => w.code)).toContain('inline_pill_success_behavior')
    expect(card.warnings.map(w => w.code)).toContain('inline_pill_success_behavior')
  })

  it('bloquea una presentación desconocida', () => {
    const result = compile({ ui_policy_json: { composition: 'static', presentation: 'popover' } })

    expect(result.ok).toBe(false)
    expect(result.warnings.map(w => w.code)).toContain('presentation_unknown')
  })

  it('bloquea etiquetas sin la presentación', () => {
    const result = compile({ ui_policy_json: { composition: 'static', inlinePill: GLITCH_LABELS } })

    expect(result.ok).toBe(false)
    expect(result.warnings.map(w => w.code)).toContain('inline_pill_labels_without_presentation')
  })

  it.each([
    ['clave extra', { ...GLITCH_LABELS, extra: 'x' }, 'inline_pill_labels_invalid'],
    ['etiqueta demasiado larga', { openLabel: 'x'.repeat(81) }, 'inline_pill_labels_invalid'],
    ['HTML en la etiqueta', { openLabel: '<b>Suscríbete</b>' }, 'inline_pill_label_markup'],
    ['HTML en la nota', { note: 'Lee <a href="#">esto</a>' }, 'inline_pill_note_html'],
    ['marcador desconocido', { note: 'Hola {name}' }, 'inline_pill_note_marker_unknown'],
    ['marcador repetido', { note: '{privacyLink} y {privacyLink}' }, 'inline_pill_note_marker_repeated']
  ])('bloquea %s', (_label, labels, code) => {
    const result = compile(inline(labels))

    expect(result.ok).toBe(false)
    expect(result.warnings.map(w => w.code)).toContain(code)
  })

  it('el enlace a la política en la nota exige privacyUrl', () => {
    const ok = compile(inline({ note: 'Al suscribirte aceptas la {privacyLink}.' }))
    const missing = compile({ ...inline({ note: 'Al suscribirte aceptas la {privacyLink}.' }), copy_refs_json: {} })

    expect(ok.ok).toBe(true)
    expect(missing.warnings.map(w => w.code)).toContain('inline_pill_note_without_privacy_url')
  })
})
