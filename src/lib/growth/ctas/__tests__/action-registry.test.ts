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

describe('link_url — navegación gobernada', () => {
  it('acepta path root-relative y https absoluta; default same-context', async () => {
    await expect(resolveCtaAction({ kind: 'link_url', url: '/servicios/aeo' })).resolves.toEqual({
      ok: true,
      action: { kind: 'link_url', href: '/servicios/aeo', newContext: false },
    })

    await expect(resolveCtaAction({ kind: 'link_url', url: 'https://efeoncepro.com/blog/' })).resolves.toEqual({
      ok: true,
      action: { kind: 'link_url', href: 'https://efeoncepro.com/blog/', newContext: false },
    })
  })

  it('honra el opt-in de nuevo contexto (metadata new_context_allowed)', async () => {
    await expect(
      resolveCtaAction({ kind: 'link_url', url: 'https://efeoncepro.com/', openInNewContext: true }),
    ).resolves.toMatchObject({ ok: true, action: { newContext: true } })
  })

  it('rechaza protocolos peligrosos, protocol-relative, credenciales y http no-seguro', async () => {
    const invalid = [
      'javascript:alert(1)',
      'data:text/html,<script>1</script>',
      'vbscript:x',
      '//evil.com/path',
      '/\\evil.com',
      'http://efeoncepro.com/',
      'https://user:pass@efeoncepro.com/',
      'ftp://files.example.com/',
      '   ',
    ]

    for (const url of invalid) {
      await expect(resolveCtaAction({ kind: 'link_url', url })).resolves.toEqual({
        ok: false,
        reason: 'action_destination_invalid',
      })
    }
  })
})

describe('open_think_tool — hub gobernado + campaign context allowlisted', () => {
  it('compone la URL sobre el hub Think (el autor jamás elige host) + UTM allowlisted', async () => {
    const result = await resolveCtaAction({
      kind: 'open_think_tool',
      toolPath: '/brand-visibility',
      campaignUtm: { source: 'greenhouse_cta', campaign: 'ai-visibility' },
    })

    expect(result).toEqual({
      ok: true,
      action: {
        kind: 'open_think_tool',
        href: 'https://think.efeoncepro.com/brand-visibility?utm_source=greenhouse_cta&utm_campaign=ai-visibility',
        newContext: false,
      },
    })
  })

  it('respeta el override de hub por env (GROWTH_CTA_THINK_HUB_URL)', async () => {
    vi.stubEnv('GROWTH_CTA_THINK_HUB_URL', 'https://think-staging.efeoncepro.com/')

    try {
      await expect(resolveCtaAction({ kind: 'open_think_tool', toolPath: '/muestras/x' })).resolves.toMatchObject({
        ok: true,
        action: { href: 'https://think-staging.efeoncepro.com/muestras/x' },
      })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('hub mal configurado (env no-https) ⇒ action_destination_unavailable, jamás un href roto', async () => {
    vi.stubEnv('GROWTH_CTA_THINK_HUB_URL', 'http://plain-http.example.com')

    try {
      await expect(resolveCtaAction({ kind: 'open_think_tool', toolPath: '/x' })).resolves.toEqual({
        ok: false,
        reason: 'action_destination_unavailable',
      })
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('rechaza paths fuera del contrato (no root-relative, query/fragment propios, backslash, whitespace)', async () => {
    const invalid = ['brand-visibility', '//evil.com', '/\\evil.com', '/x?y=1', '/x#y', '/x\\y', '/x y']

    for (const toolPath of invalid) {
      await expect(resolveCtaAction({ kind: 'open_think_tool', toolPath })).resolves.toEqual({
        ok: false,
        reason: 'action_destination_invalid',
      })
    }
  })

  it('campaign context fuera de la allowlist UTM ⇒ action_policy_invalid (strict, nunca identidad/PII)', async () => {
    await expect(
      resolveCtaAction({ kind: 'open_think_tool', toolPath: '/x', campaignUtm: { email: 'p@x.com' } }),
    ).resolves.toEqual({ ok: false, reason: 'action_policy_invalid' })
  })
})

describe('book_meeting — booking host gobernado, navegación-only', () => {
  it('acepta hosts HubSpot Meetings (patrón regional incluido)', async () => {
    await expect(
      resolveCtaAction({ kind: 'book_meeting', meetingUrl: 'https://meetings.hubspot.com/efeonce/diagnostico' }),
    ).resolves.toEqual({
      ok: true,
      action: { kind: 'book_meeting', href: 'https://meetings.hubspot.com/efeonce/diagnostico', newContext: false },
    })

    await expect(
      resolveCtaAction({ kind: 'book_meeting', meetingUrl: 'https://meetings-eu1.hubspot.com/x', openInNewContext: true }),
    ).resolves.toMatchObject({ ok: true, action: { newContext: true } })
  })

  it('rechaza hosts fuera del allowlist (incluidos lookalikes) y URLs relativas', async () => {
    const invalid = [
      'https://meetings.hubspot.com.evil.com/x',
      'https://evil.com/meetings.hubspot.com',
      'https://calendly.com/alguien',
      '/agenda',
    ]

    for (const meetingUrl of invalid) {
      await expect(resolveCtaAction({ kind: 'book_meeting', meetingUrl })).resolves.toEqual({
        ok: false,
        reason: 'action_destination_invalid',
      })
    }
  })

  it('permite hosts extra SOLO vía env GROWTH_CTA_BOOKING_URL_HOSTS', async () => {
    vi.stubEnv('GROWTH_CTA_BOOKING_URL_HOSTS', 'agenda.efeoncepro.com')

    try {
      await expect(
        resolveCtaAction({ kind: 'book_meeting', meetingUrl: 'https://agenda.efeoncepro.com/equipo' }),
      ).resolves.toMatchObject({ ok: true, action: { href: 'https://agenda.efeoncepro.com/equipo' } })
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
