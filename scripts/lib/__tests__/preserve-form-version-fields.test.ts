import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { PRESERVED_FORM_VERSION_COLUMNS, preserveFormVersionFields } from '../preserve-form-version-fields'

const baseRow = () => ({
  locale: 'es-CL',
  validation_schema_json: { v: 1 },
  copy_refs_json: { copy: { submit: 'Enviar' } },
  style_variant: 'diagnostic_premium' as string | null,
  ui_policy_json: { security: { captcha: 'turnstile' } },
  success_behavior_json: { kind: 'inline_message' },
  consent_policy_version: 'efeonce-aeo-diagnostic-consent-v1' as string | null,
  data_classification_json: { d: 1 },
  destination_policy_json: { de: 1 },
  analytics_policy_json: { a: 1 },
  retention_policy_json: { r: 1 },
  commercial_handoff_policy_json: { ch: 1 },
})

describe('preserveFormVersionFields', () => {
  it('maps EVERY governed column from the version row (no silent drop)', () => {
    const out = preserveFormVersionFields(baseRow())

    expect(Object.keys(out).sort()).toEqual([...PRESERVED_FORM_VERSION_COLUMNS].sort())
    expect(out.styleVariant).toBe('diagnostic_premium')
    expect(out.copyRefs).toEqual({ copy: { submit: 'Enviar' } })
    expect(out.uiPolicy).toEqual({ security: { captcha: 'turnstile' } })
    expect(out.consentPolicyVersion).toBe('efeonce-aeo-diagnostic-consent-v1')
  })

  it('null consent → undefined (loud downstream, not a hidden fallback)', () => {
    expect(preserveFormVersionFields({ ...baseRow(), consent_policy_version: null }).consentPolicyVersion).toBeUndefined()
  })

  it('null styleVariant is passed through (callers restore explicitly if needed)', () => {
    expect(preserveFormVersionFields({ ...baseRow(), style_variant: null }).styleVariant).toBeNull()
  })
})

describe('activate-*.ts guardrail — clone→republish must use preserveFormVersionFields (drop-bug class TASK-1321)', () => {
  const dir = join(process.cwd(), 'scripts', 'growth')
  const files = readdirSync(dir).filter(f => f.startsWith('activate-') && f.endsWith('.ts'))

  for (const file of files) {
    const src = readFileSync(join(dir, file), 'utf8')

    // Only scripts that clone a published version and republish it are at risk.
    if (!src.includes('authorDraftForm(') || !src.includes('getPublishedVersionBySlug')) continue

    it(`${file} spreads preserveFormVersionFields(current) — cannot hand-drop a version column`, () => {
      expect(src).toContain('...preserveFormVersionFields(current)')
    })
  }
})
