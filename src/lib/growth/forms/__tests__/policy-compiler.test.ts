import { describe, expect, it } from 'vitest'

import {
  COPY_VALUE_MAX,
  TELEMETRY_ALLOWED_PAYLOAD_KEYS,
  TELEMETRY_FORBIDDEN_PAYLOAD_KEYS,
  publicSubmitInputSchema,
  sanitizeRenderCopy,
} from '../contracts'
import { compileFormVersion } from '../policy-compiler'
import type { FormDefinitionRow, FormDestinationRow, FormVersionRow } from '../store'

const definition = (overrides: Partial<FormDefinitionRow> = {}): FormDefinitionRow => ({
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
  updated_at: new Date(),
  ...overrides,
})

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
  ...overrides,
})

const destination = (overrides: Partial<FormDestinationRow> = {}): FormDestinationRow => ({
  destination_id: 'fdst-1',
  form_version_id: 'fver-1',
  provider: 'hubspot',
  adapter_kind: 'fake_echo',
  adapter_version: 'fake-v1',
  endpoint_status: 'supported',
  enabled: true,
  delivery_mode: 'direct',
  mapping_json: { hubspot_prop: 'email' },
  consent_requirements_json: {},
  retry_policy_json: {},
  created_at: new Date(),
  ...overrides,
})

describe('compileFormVersion — publication gate', () => {
  it('compila ok una versión válida con destino', () => {
    const result = compileFormVersion(definition(), version(), [destination()], { forPublication: true })

    expect(result.ok).toBe(true)
    expect(result.blockingReasons).toHaveLength(0)
    expect(result.renderContract).not.toBeNull()
  })

  it('bloquea sin consent_policy_version', () => {
    const result = compileFormVersion(definition(), version({ consent_policy_version: null }), [destination()], {
      forPublication: true,
    })

    expect(result.ok).toBe(false)
    expect(result.blockingReasons.join(' ')).toContain('consent')
  })

  it('bloquea sin retention policy', () => {
    const result = compileFormVersion(definition(), version({ retention_policy_json: {} }), [destination()], {
      forPublication: true,
    })

    expect(result.ok).toBe(false)
    expect(result.blockingReasons.join(' ')).toContain('retention')
  })

  it('bloquea con field schema vacío', () => {
    const result = compileFormVersion(definition(), version({ field_schema_json: [] }), [destination()], {
      forPublication: true,
    })

    expect(result.ok).toBe(false)
  })

  it('bloquea con success_behavior inválido', () => {
    const result = compileFormVersion(definition(), version({ success_behavior_json: {} }), [destination()], {
      forPublication: true,
    })

    expect(result.ok).toBe(false)
  })
})

describe('render_contract — browser-safe', () => {
  it('NUNCA expone destination mapping ni el property name de HubSpot', () => {
    const result = compileFormVersion(definition(), version(), [destination()], { forPublication: true })
    const serialized = JSON.stringify(result.renderContract)

    expect(serialized).not.toContain('hubspot_prop')
    expect(serialized).not.toContain('mapping')
    expect(serialized.toLowerCase()).not.toContain('destination_id')
  })

  it('destination_plan (server-only) sí trae el mapping, separado del render', () => {
    const result = compileFormVersion(definition(), version(), [destination()], { forPublication: true })

    expect(result.destinationPlan?.destinations[0]?.mapping).toEqual({ hubspot_prop: 'email' })
  })

  it('can expose browser-safe Turnstile metadata without exposing secrets', () => {
    const result = compileFormVersion(
      definition(),
      version({
        ui_policy_json: {
          security: {
            captcha: {
              provider: 'turnstile',
              required: true,
              mode: 'invisible',
              siteKey: '0x-public-site-key',
              execution: 'submit',
            },
          },
        },
      }),
      [destination()],
      { forPublication: true },
    )

    expect(result.ok).toBe(true)
    expect(result.renderContract?.security?.captcha).toEqual({
      provider: 'turnstile',
      required: true,
      mode: 'invisible',
      siteKey: '0x-public-site-key',
      execution: 'submit',
    })
    expect(JSON.stringify(result.renderContract).toLowerCase()).not.toContain('secret')
  })
})

describe('render_contract — multi_step_light composition', () => {
  it('serializa steps desde ui_policy para el renderer portable', () => {
    const result = compileFormVersion(
      definition(),
      version({
        field_schema_json: [
          { key: 'brandName', type: 'text', required: true },
          { key: 'email', type: 'email', required: true },
        ],
        ui_policy_json: {
          composition: 'multi_step_light',
          steps: [
            { key: 'brand', label: 'Tu marca', fieldKeys: ['brandName'] },
            { key: 'contact', label: 'Tus datos', fieldKeys: ['email'] },
          ],
        },
      }),
      [destination()],
      { forPublication: true },
    )

    expect(result.ok).toBe(true)
    expect(result.renderContract?.composition).toBe('multi_step_light')
    expect(result.renderContract?.steps).toEqual([
      { key: 'brand', label: 'Tu marca', fieldKeys: ['brandName'] },
      { key: 'contact', label: 'Tus datos', fieldKeys: ['email'] },
    ])
  })

  it('bloquea publicación si un step referencia campos inexistentes', () => {
    const result = compileFormVersion(
      definition(),
      version({
        field_schema_json: [{ key: 'email', type: 'email', required: true }],
        ui_policy_json: {
          composition: 'multi_step_light',
          steps: [{ key: 'contact', label: 'Tus datos', fieldKeys: ['email', 'missingField'] }],
        },
      }),
      [destination()],
      { forPublication: true },
    )

    expect(result.ok).toBe(false)
    expect(result.blockingReasons.join(' ')).toContain('missingField')
  })
})

describe('render_contract — formKey + copy gate (TASK-1297)', () => {
  it('expone formKey (identidad estable) en el render contract', () => {
    const result = compileFormVersion(
      definition({ form_key: '11111111-1111-4111-8111-111111111111' }),
      version(),
      [destination()],
      { forPublication: true },
    )

    expect(result.renderContract?.form.formKey).toBe('11111111-1111-4111-8111-111111111111')
  })

  it('publica el copy renderizable válido (copyRef → string)', () => {
    const result = compileFormVersion(
      definition(),
      version({ copy_refs_json: { copy: { submit: 'Solicitar diagnóstico gratis →' } } }),
      [destination()],
      { forPublication: true },
    )

    expect(result.renderContract?.copy).toEqual({ submit: 'Solicitar diagnóstico gratis →' })
  })

  it('descarta entradas de copy no browser-safe (nested / no-string / over-length)', () => {
    const result = compileFormVersion(
      definition(),
      version({
        copy_refs_json: {
          copy: {
            submit: 'Enviar',
            leaked: { portalId: '48713323', formGuid: 'secret' } as unknown as string,
            count: 42 as unknown as string,
            huge: 'x'.repeat(COPY_VALUE_MAX + 1),
          },
        },
      }),
      [destination()],
      { forPublication: true },
    )

    expect(result.renderContract?.copy).toEqual({ submit: 'Enviar' })
    expect(JSON.stringify(result.renderContract)).not.toContain('48713323')
    expect(JSON.stringify(result.renderContract)).not.toContain('formGuid')
  })

  it('sanitizeRenderCopy es tolerante por-entrada y nunca lanza', () => {
    expect(sanitizeRenderCopy({ a: 'ok', b: 3, c: { nested: true } })).toEqual({ a: 'ok' })
    expect(sanitizeRenderCopy(null)).toEqual({})
    expect(sanitizeRenderCopy(['array'])).toEqual({})
    expect(sanitizeRenderCopy('string')).toEqual({})
  })
})

describe('success card capability (TASK-1319)', () => {
  const successCardBehavior = {
    kind: 'inline_message',
    presentation: 'success_card',
    titleCopyRef: 'success.title',
    bodyCopyRef: 'success.body',
    steps: [{ copyRef: 'success.step.review' }, { copyRef: 'success.step.follow_up' }],
    reward: {
      kind: 'ebook',
      titleCopyRef: 'reward.ebook.title',
      action: { kind: 'download', href: 'https://efeoncepro.com/recursos/aeo.pdf', target: '_blank' },
    },
    actions: [{ kind: 'schedule', labelCopyRef: 'action.schedule', href: 'https://cal.efeoncepro.com/aeo' }],
    supportingNoteCopyRef: 'support.note',
  }

  it('compila y expone la success-card metadata browser-safe en el render contract', () => {
    const result = compileFormVersion(
      definition(),
      version({ success_behavior_json: successCardBehavior }),
      [destination()],
      { forPublication: true },
    )

    expect(result.ok).toBe(true)
    const success = result.renderContract?.successBehavior

    expect(success?.presentation).toBe('success_card')
    expect(success?.steps).toHaveLength(2)
    expect(success?.reward?.kind).toBe('ebook')
    expect(success?.reward?.action?.href).toBe('https://efeoncepro.com/recursos/aeo.pdf')
    expect(success?.actions?.[0]?.kind).toBe('schedule')
  })

  it('presentation es ORTOGONAL a kind: redirect + success_card coexisten', () => {
    const result = compileFormVersion(
      definition(),
      version({
        success_behavior_json: {
          kind: 'redirect',
          presentation: 'success_card',
          redirectUrl: 'https://efeoncepro.com/gracias',
          titleCopyRef: 'success.title',
        },
      }),
      [destination()],
      { forPublication: true },
    )

    expect(result.ok).toBe(true)
    expect(result.renderContract?.successBehavior.kind).toBe('redirect')
    expect(result.renderContract?.successBehavior.presentation).toBe('success_card')
  })

  it('bloquea publicación si un href de acción no es browser-safe (javascript:)', () => {
    const result = compileFormVersion(
      definition(),
      version({
        success_behavior_json: {
          kind: 'inline_message',
          presentation: 'success_card',
          actions: [{ kind: 'external_link', href: 'javascript:alert(1)' }],
        },
      }),
      [destination()],
      { forPublication: true },
    )

    expect(result.ok).toBe(false)
    expect(result.blockingReasons.join(' ')).toContain('success_behavior')
  })

  it('bloquea publicación si un href es non-https externo o protocol-relative', () => {
    for (const href of ['http://evil.example.com/x', '//evil.example.com/x', 'data:text/html,x']) {
      const result = compileFormVersion(
        definition(),
        version({
          success_behavior_json: {
            kind: 'inline_message',
            presentation: 'success_card',
            actions: [{ kind: 'external_link', href }],
          },
        }),
        [destination()],
        { forPublication: true },
      )

      expect(result.ok, `href ${href} debería bloquear`).toBe(false)
    }
  })

  it('acepta https absoluta y path root-relative same-origin', () => {
    const result = compileFormVersion(
      definition(),
      version({
        success_behavior_json: {
          kind: 'inline_message',
          presentation: 'success_card',
          actions: [
            { kind: 'schedule', href: 'https://cal.efeoncepro.com/aeo' },
            { kind: 'download', href: '/recursos/aeo.pdf' },
          ],
        },
      }),
      [destination()],
      { forPublication: true },
    )

    expect(result.ok).toBe(true)
  })

  it('bloquea publicación si se exceden las cotas (steps > 4, actions > 2)', () => {
    const tooManySteps = compileFormVersion(
      definition(),
      version({
        success_behavior_json: {
          kind: 'inline_message',
          presentation: 'success_card',
          steps: Array.from({ length: 5 }, (_, i) => ({ copyRef: `s.${i}` })),
        },
      }),
      [destination()],
      { forPublication: true },
    )

    expect(tooManySteps.ok).toBe(false)

    const tooManyActions = compileFormVersion(
      definition(),
      version({
        success_behavior_json: {
          kind: 'inline_message',
          presentation: 'success_card',
          actions: Array.from({ length: 3 }, () => ({ kind: 'external_link', href: 'https://efeoncepro.com' })),
        },
      }),
      [destination()],
      { forPublication: true },
    )

    expect(tooManyActions.ok).toBe(false)
  })

  it('los contratos legacy (inline_message, redirect) siguen compilando byte-compatible', () => {
    const inline = compileFormVersion(
      definition(),
      version({ success_behavior_json: { kind: 'inline_message', message: 'Gracias' } }),
      [destination()],
      { forPublication: true },
    )

    expect(inline.ok).toBe(true)
    expect(inline.renderContract?.successBehavior).toEqual({ kind: 'inline_message', message: 'Gracias' })
  })
})

describe('tokenized_report handoff (TASK-1336)', () => {
  const STATUS_TEMPLATE = '/api/public/growth/ai-visibility/run/{handle}'

  it('compila y expone el statusPathTemplate browser-safe en el render contract', () => {
    const result = compileFormVersion(
      definition(),
      version({ success_behavior_json: { kind: 'tokenized_report', tokenizedReport: { statusPathTemplate: STATUS_TEMPLATE } } }),
      [destination()],
      { forPublication: true },
    )

    expect(result.ok).toBe(true)
    expect(result.renderContract?.successBehavior.kind).toBe('tokenized_report')
    expect(result.renderContract?.successBehavior.tokenizedReport?.statusPathTemplate).toBe(STATUS_TEMPLATE)
  })

  it('bloquea publicación si el statusPathTemplate no es browser-safe', () => {
    for (const statusPathTemplate of [
      'https://evil.example.com/run/{handle}', // absoluta
      '//evil.example.com/run/{handle}', // protocol-relative
      '/api/admin/growth/run/{handle}', // fuera de /api/public/
      '/api/public/growth/ai-visibility/run/latest', // sin placeholder {handle}
    ]) {
      const result = compileFormVersion(
        definition(),
        version({ success_behavior_json: { kind: 'tokenized_report', tokenizedReport: { statusPathTemplate } } }),
        [destination()],
        { forPublication: true },
      )

      expect(result.ok, `statusPathTemplate ${statusPathTemplate} debería bloquear`).toBe(false)
      expect(result.blockingReasons.join(' ')).toContain('success_behavior')
    }
  })

  it('el tokenized_report legacy (solo kind, sin handoff) sigue compilando byte-compatible', () => {
    const result = compileFormVersion(
      definition(),
      version({ success_behavior_json: { kind: 'tokenized_report' } }),
      [destination()],
      { forPublication: true },
    )

    expect(result.ok).toBe(true)
    expect(result.renderContract?.successBehavior).toEqual({ kind: 'tokenized_report' })
  })
})

describe('telemetry contract', () => {
  it('las claves prohibidas no se solapan con las permitidas', () => {
    const allowed = new Set<string>(TELEMETRY_ALLOWED_PAYLOAD_KEYS)

    for (const forbidden of TELEMETRY_FORBIDDEN_PAYLOAD_KEYS) {
      expect(allowed.has(forbidden)).toBe(false)
    }
  })

  it('allowlistea los clasificadores de la success card (action_kind, reward_kind) — TASK-1319', () => {
    const allowed = new Set<string>(TELEMETRY_ALLOWED_PAYLOAD_KEYS)

    expect(allowed.has('action_kind')).toBe(true)
    expect(allowed.has('reward_kind')).toBe(true)
  })

  it('allowlistea el handoff del tokenized_report (run_handle, status_url) — TASK-1336', () => {
    const allowed = new Set<string>(TELEMETRY_ALLOWED_PAYLOAD_KEYS)

    expect(allowed.has('run_handle')).toBe(true)
    expect(allowed.has('status_url')).toBe(true)
  })
})

describe('publicSubmitInputSchema', () => {
  it('acepta un submit válido con consent', () => {
    const parsed = publicSubmitInputSchema.safeParse({
      formSlug: 'test-form',
      fields: { email: 'a@b.com' },
      consent: true,
    })

    expect(parsed.success).toBe(true)
  })

  it('rechaza si falta consent (campo requerido)', () => {
    const parsed = publicSubmitInputSchema.safeParse({ formSlug: 'test-form', fields: {} })

    expect(parsed.success).toBe(false)
  })
})
