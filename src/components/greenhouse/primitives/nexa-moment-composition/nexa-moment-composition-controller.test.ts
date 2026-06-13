import { describe, expect, it } from 'vitest'

import {
  NEXA_MOMENT_COMPOSITION_VARIANT_CONFIG,
  resolveNexaMomentCompositionConfig,
  resolveNexaMomentCompositionVariant
} from './nexa-moment-composition-controller'
import type { NexaMomentCompositionKind } from './nexa-moment-composition-types'

describe('resolveNexaMomentCompositionVariant', () => {
  it('precedencia: variant explícito gana sobre kind', () => {
    expect(resolveNexaMomentCompositionVariant({ variant: 'inlineExpand', kind: 'financeMetricExplain' })).toBe('inlineExpand')
  })

  it('resuelve cada kind de dominio a un variant funcional EXISTENTE (nunca uno nuevo)', () => {
    const expectations: Record<NexaMomentCompositionKind, string> = {
      knowledgeOverview: 'leadOverlay',
      financeMetricExplain: 'anchoredAside',
      agencyAccountBrief: 'anchoredAside',
      listAssist: 'inlineExpand',
      custom: 'leadOverlay'
    }

    for (const [kind, variant] of Object.entries(expectations)) {
      const resolved = resolveNexaMomentCompositionVariant({ kind: kind as NexaMomentCompositionKind })

      expect(resolved).toBe(variant)
      // El variant resuelto SIEMPRE existe en la config (no inventa chrome por dominio).
      expect(NEXA_MOMENT_COMPOSITION_VARIANT_CONFIG[resolved]).toBeDefined()
    }
  })

  it('default leadOverlay sin variant ni kind', () => {
    expect(resolveNexaMomentCompositionVariant()).toBe('leadOverlay')
    expect(resolveNexaMomentCompositionVariant({})).toBe('leadOverlay')
  })

  it('config: anchoredAside es split y no condensa el host; leadOverlay es stack y condensa', () => {
    expect(resolveNexaMomentCompositionConfig({ variant: 'anchoredAside' })).toMatchObject({ layout: 'split', condensesHost: false })
    expect(resolveNexaMomentCompositionConfig({ variant: 'leadOverlay' })).toMatchObject({ layout: 'stack', condensesHost: true })
    expect(resolveNexaMomentCompositionConfig({ variant: 'inlineExpand' })).toMatchObject({ layout: 'stack' })
  })

  it('todos los variants de la config son auto-consistentes (variant key == config.variant)', () => {
    for (const [key, config] of Object.entries(NEXA_MOMENT_COMPOSITION_VARIANT_CONFIG)) {
      expect(config.variant).toBe(key)
    }
  })
})
