/**
 * TASK-2044 — Contrato de fidelidad de diseño: campos opcionales de presentación para que un
 * formulario diseñado en canvas se declare tal cual. Cada campo nuevo es opcional y su ausencia
 * reproduce el contrato de hoy (los formularios publicados no cambian de veredicto ni de render).
 */
import { describe, expect, it } from 'vitest'

import { compileFormVersion } from '../policy-compiler'
import type { FormDefinitionRow, FormVersionRow } from '../store'

const definition: FormDefinitionRow = {
  form_id: 'fdef-1',
  form_key: '00000000-0000-4000-8000-000000000001',
  slug: 'test-form',
  name: 'Test',
  form_kind: 'lead_magnet',
  purpose: 'test',
  risk_profile: 'low',
  owner_team: null,
  status: 'active',
  default_locale: 'es-CL',
  created_by: null,
  created_at: new Date(),
  updated_at: new Date()
}

const version = (overrides: Partial<FormVersionRow> = {}): FormVersionRow => ({
  form_version_id: 'fver-1',
  form_id: 'fdef-1',
  version: 1,
  status: 'review',
  locale: 'es-CL',
  field_schema_json: [{ key: 'email', type: 'email', required: true }],
  validation_schema_json: {},
  copy_refs_json: {},
  style_variant: null,
  ui_policy_json: { composition: 'static' },
  success_behavior_json: { kind: 'inline_message', message: 'Gracias' },
  consent_policy_version: 'v1',
  data_classification_json: {},
  destination_policy_json: { allow: true },
  analytics_policy_json: { enabled: true },
  retention_policy_json: { days: 90 },
  commercial_handoff_policy_json: {},
  published_at: null,
  created_at: new Date(),
  ...overrides
})

const compile = (overrides: Partial<FormVersionRow> = {}) =>
  compileFormVersion(definition, version(overrides), [], { forPublication: true })

describe('TASK-2044 · ancho por campo', () => {
  it('un campo sin width proyecta exactamente igual que hoy', () => {
    const result = compile()

    expect(result.renderContract?.fields[0]).toEqual({ key: 'email', type: 'email', required: true })
  })

  it('half y full viajan al contrato público', () => {
    const result = compile({
      field_schema_json: [
        { key: 'name', type: 'text', presentation: { width: 'half' } },
        { key: 'email', type: 'email', required: true, presentation: { width: 'half', icon: 'mail' } },
        { key: 'pitch', type: 'textarea', presentation: { width: 'full' } }
      ]
    })

    expect(result.blockingReasons).toEqual([])
    expect(result.renderContract?.fields.map(field => field.presentation?.width)).toEqual(['half', 'half', 'full'])
  })

  it('un ancho desconocido invalida el campo y bloquea la publicación', () => {
    const result = compile({ field_schema_json: [{ key: 'email', type: 'email', presentation: { width: 'third' } }] })

    expect(result.warnings.map(warning => warning.code)).toContain('fields_invalid')
  })
})

const consentCopy = (label: string, extra: Record<string, unknown> = {}) => ({
  copy_refs_json: {
    privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/',
    checkboxes: [{ key: 'privacy', label, required: true }],
    ...extra
  }
})

describe('TASK-2044 · consentimiento compacto con enlace en la frase', () => {
  it('compact + un {privacyLink} + privacyUrl compila y viaja al contrato', () => {
    const result = compile(
      consentCopy('Acepto que Efeonce use estos datos para responder mi propuesta, según su {privacyLink}.', {
        presentation: 'compact',
        privacyLinkLabel: 'política de privacidad'
      })
    )

    expect(result.blockingReasons).toEqual([])
    expect(result.renderContract?.consent).toMatchObject({
      presentation: 'compact',
      privacyLinkLabel: 'política de privacidad',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/'
    })
  })

  it('una casilla sin llaves no cambia de veredicto', () => {
    expect(compile(consentCopy('Acepto la política de privacidad.')).blockingReasons).toEqual([])
  })

  it('rechaza HTML junto al marcador', () => {
    const codes = compile(consentCopy('Acepto según su <a href="x">{privacyLink}</a>.')).warnings.map(w => w.code)

    expect(codes).toContain('consent_marker_html')
  })

  it('rechaza el marcador repetido y marcadores desconocidos', () => {
    const codes = compile(consentCopy('{privacyLink} y {privacyLink} y {terms}')).warnings.map(w => w.code)

    expect(codes).toEqual(expect.arrayContaining(['consent_marker_repeated', 'consent_marker_unknown']))
  })

  it('exige privacyUrl cuando hay marcador', () => {
    const result = compile({ copy_refs_json: { checkboxes: [{ key: 'privacy', label: 'Según su {privacyLink}.' }] } })

    expect(result.warnings.map(w => w.code)).toContain('consent_marker_without_privacy_url')
    expect(result.ok).toBe(false)
  })

  it('una presentación de consentimiento desconocida bloquea en vez de publicar sin casilla', () => {
    const result = compile(consentCopy('Acepto.', { presentation: 'banner' }))

    expect(result.renderContract?.consent).toBeUndefined()
    expect(result.warnings.map(w => w.code)).toContain('consent_display_invalid')
    expect(result.ok).toBe(false)
  })
})

describe('TASK-2044 · cierre e ícono del éxito', () => {
  const card = (extra: Record<string, unknown>) => ({
    success_behavior_json: { kind: 'inline_message', presentation: 'success_card', title: 'Recibido.', ...extra }
  })

  it('dismiss sin href e icon orbit viajan al contrato', () => {
    const result = compile(card({ icon: 'orbit', actions: [{ kind: 'dismiss', label: 'Cerrar' }] }))

    expect(result.blockingReasons).toEqual([])
    expect(result.renderContract?.successBehavior).toMatchObject({
      icon: 'orbit',
      actions: [{ kind: 'dismiss', label: 'Cerrar' }]
    })
  })

  it('icon none es válido y omitirlo deja el éxito como hoy', () => {
    expect(compile(card({ icon: 'none' })).blockingReasons).toEqual([])
    expect(compile().renderContract?.successBehavior).toEqual({ kind: 'inline_message', message: 'Gracias' })
  })

  it('dismiss con href o target se rechaza', () => {
    expect(compile(card({ actions: [{ kind: 'dismiss', label: 'Cerrar', href: '/agenda/' }] })).ok).toBe(false)
    expect(compile(card({ actions: [{ kind: 'dismiss', label: 'Cerrar', target: '_blank' }] })).ok).toBe(false)
  })

  it('las acciones existentes conservan su contrato', () => {
    const result = compile(card({ actions: [{ kind: 'schedule', label: 'Agenda', href: 'https://efeoncepro.com/agenda/' }] }))

    expect(result.blockingReasons).toEqual([])
  })

  it('un ícono desconocido invalida el éxito', () => {
    expect(compile(card({ icon: 'confetti' })).warnings.map(w => w.code)).toContain('success_behavior_invalid')
  })
})
