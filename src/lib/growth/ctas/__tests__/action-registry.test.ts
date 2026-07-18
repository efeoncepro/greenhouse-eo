import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1431 — Action Registry: un entry por kind gobierna schema, resolver y
 * proyección browser-safe; la fachada `resolveCtaAction` delega SIEMPRE al registry
 * (fail-closed para kinds sin entry) y la metadata pública es data plana sin policy
 * interna, resolvers ni appearance/placement/density/copy.
 */

const formsReadersMock = vi.hoisted(() => ({ getPublishedRenderContractByRef: vi.fn() }))

vi.mock('@/lib/growth/forms/readers', () => formsReadersMock)

import {
  CTA_ACTION_KINDS,
  CTA_ACTION_KIND_FAMILIES,
  CTA_ACTION_KIND_METADATA,
} from '../contracts'
import { CTA_ACTION_REGISTRY, resolveRegisteredCtaAction } from '../action-registry'
import { resolveCtaAction } from '../action-router'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('CTA_ACTION_KIND_METADATA (browser-safe, read-only)', () => {
  it('cubre exactamente el enum de kinds y cada entry declara su kind', () => {
    expect(Object.keys(CTA_ACTION_KIND_METADATA).sort()).toEqual([...CTA_ACTION_KINDS].sort())

    for (const kind of CTA_ACTION_KINDS) {
      expect(CTA_ACTION_KIND_METADATA[kind].kind).toBe(kind)
      expect(CTA_ACTION_KIND_METADATA[kind].telemetryKind).toBe(kind)
    }
  })

  it('es data plana JSON-serializable (sin funciones, resolvers ni schemas)', () => {
    const roundTrip = JSON.parse(JSON.stringify(CTA_ACTION_KIND_METADATA))

    expect(roundTrip).toEqual(CTA_ACTION_KIND_METADATA)
  })

  it('no contiene decisiones de presentación (appearance/placement/density/copy/asset)', () => {
    const forbidden = ['appearance', 'placement', 'density', 'copy', 'styleVariant', 'visualAsset', 'label']

    for (const metadata of Object.values(CTA_ACTION_KIND_METADATA)) {
      for (const key of Object.keys(metadata)) {
        for (const banned of forbidden) {
          expect(key.toLowerCase()).not.toContain(banned.toLowerCase())
        }
      }
    }
  })

  it('el espejo kind→familia coincide con la metadata (parity del executor)', () => {
    for (const kind of CTA_ACTION_KINDS) {
      expect(CTA_ACTION_KIND_FAMILIES[kind]).toBe(CTA_ACTION_KIND_METADATA[kind].executionFamily)
    }
  })
})

describe('CTA_ACTION_REGISTRY (exhaustivo por kind)', () => {
  it('tiene un entry por kind con metadata idéntica a la pública', () => {
    expect(Object.keys(CTA_ACTION_REGISTRY).sort()).toEqual([...CTA_ACTION_KINDS].sort())

    for (const kind of CTA_ACTION_KINDS) {
      expect(CTA_ACTION_REGISTRY[kind].metadata).toBe(CTA_ACTION_KIND_METADATA[kind])
    }
  })

  it('requiredPolicyFields coincide con los campos requeridos del schema del entry (sin lista paralela)', () => {
    for (const kind of CTA_ACTION_KINDS) {
      const entry = CTA_ACTION_REGISTRY[kind]

      const parsed = entry.policySchema.safeParse({ kind })

      if (parsed.success) {
        expect(entry.metadata.requiredPolicyFields).toEqual([])
        continue
      }

      const missing = parsed.error.issues
        .filter(issue => issue.code === 'invalid_type' && issue.path.length === 1)
        .map(issue => String(issue.path[0]))

      expect([...entry.metadata.requiredPolicyFields].sort()).toEqual(missing.sort())
    }
  })
})

describe('resolveRegisteredCtaAction (fachada resolveCtaAction delega acá)', () => {
  it('policy sin shape/kind ⇒ action_policy_invalid', async () => {
    await expect(resolveRegisteredCtaAction(null)).resolves.toEqual({ ok: false, reason: 'action_policy_invalid' })
    await expect(resolveRegisteredCtaAction({})).resolves.toEqual({ ok: false, reason: 'action_policy_invalid' })
    await expect(resolveRegisteredCtaAction('open_growth_form')).resolves.toEqual({
      ok: false,
      reason: 'action_policy_invalid',
    })
  })

  it('kind sin entry registrado ⇒ action_kind_unsupported (fail-closed, jamás fallback)', async () => {
    await expect(resolveRegisteredCtaAction({ kind: 'hubspot_handoff' })).resolves.toEqual({
      ok: false,
      reason: 'action_kind_unsupported',
    })
    await expect(resolveRegisteredCtaAction({ kind: 'download_asset', url: 'https://x.dev/a.pdf' })).resolves.toEqual({
      ok: false,
      reason: 'action_kind_unsupported',
    })
  })

  it('kind registrado con policy inválida ⇒ action_policy_invalid', async () => {
    await expect(resolveRegisteredCtaAction({ kind: 'open_growth_form' })).resolves.toEqual({
      ok: false,
      reason: 'action_policy_invalid',
    })
    await expect(resolveRegisteredCtaAction({ kind: 'open_growth_form', formRef: '' })).resolves.toEqual({
      ok: false,
      reason: 'action_policy_invalid',
    })
  })

  it('open_growth_form con form sin published ⇒ action_destination_unavailable', async () => {
    formsReadersMock.getPublishedRenderContractByRef.mockResolvedValue(null)

    await expect(resolveCtaAction({ kind: 'open_growth_form', formRef: 'ai-visibility-grader' })).resolves.toEqual({
      ok: false,
      reason: 'action_destination_unavailable',
    })
  })

  it('open_growth_form resuelto proyecta SOLO refs browser-safe (slug + formKey)', async () => {
    formsReadersMock.getPublishedRenderContractByRef.mockResolvedValue({
      form: { slug: 'ai-visibility-grader', formKey: 'fk-123' },
    })

    const result = await resolveCtaAction({ kind: 'open_growth_form', formRef: 'ai-visibility-grader' })

    expect(result).toEqual({
      ok: true,
      action: { kind: 'open_growth_form', formSlug: 'ai-visibility-grader', formKey: 'fk-123' },
    })
  })
})
