import { describe, expect, it } from 'vitest'

import {
  TELEMETRY_ALLOWED_PAYLOAD_KEYS,
  TELEMETRY_FORBIDDEN_PAYLOAD_KEYS,
  publicSubmitInputSchema,
} from '../contracts'
import { compileFormVersion } from '../policy-compiler'
import type { FormDefinitionRow, FormDestinationRow, FormVersionRow } from '../store'

const definition = (overrides: Partial<FormDefinitionRow> = {}): FormDefinitionRow => ({
  form_id: 'fdef-1',
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

describe('telemetry contract', () => {
  it('las claves prohibidas no se solapan con las permitidas', () => {
    const allowed = new Set<string>(TELEMETRY_ALLOWED_PAYLOAD_KEYS)

    for (const forbidden of TELEMETRY_FORBIDDEN_PAYLOAD_KEYS) {
      expect(allowed.has(forbidden)).toBe(false)
    }
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
