/**
 * NexaAnswersCanvas — contrato del resolver (TASK-1095 A1 / decisión del operador 2026-06-13).
 *
 * Lockea la GARANTÍA DE TRANSVERSALIDAD: el canvas es el shell canónico domain-neutral y cada dominio
 * (knowledge/finance/agency/people/commercial) es un `kind` que resuelve a un `variant` NEUTRO —
 * ningún dominio tiene layout/chrome especial (Primitive+Variants+Kinds). Si alguien agrega un dominio
 * o lo acopla a un variant inventado, estos tests rompen. Es la capa-4 (guard mecánico) del
 * defense-in-depth de transversalidad. Pura, sin render.
 */
import { describe, expect, it } from 'vitest'

import {
  NEXA_ANSWERS_CANVAS_KIND_CONFIG,
  NEXA_ANSWERS_CANVAS_VARIANT_CONFIG,
  assertNexaAnswersRenderPlanAllowed,
  resolveNexaAnswersCanvasDensity,
  resolveNexaAnswersCanvasVariant
} from './nexa-answers-canvas-controller'
import type { NexaAnswersCanvasVariant, NexaAnswersRenderPlan, NexaAnswersSurfaceContext } from './nexa-answers-canvas-types'

const NEUTRAL_VARIANTS: NexaAnswersCanvasVariant[] = ['embedded', 'sidecar', 'inline']

// Los 5 dominios de negocio que el shell DEBE soportar transversalmente (Knowledge = primer consumer).
const BUSINESS_DOMAIN_KINDS = [
  'knowledgeEmbedded',
  'financeChartEmbedded',
  'agencyInsightEmbedded',
  'peopleInsightEmbedded',
  'commercialInsightEmbedded'
] as const

describe('transversalidad del shell — kind→variant', () => {
  it('los 5 dominios de negocio están mapeados (Knowledge no es el destino, es un kind más)', () => {
    for (const kind of BUSINESS_DOMAIN_KINDS) {
      expect(NEXA_ANSWERS_CANVAS_KIND_CONFIG[kind]).toBeDefined()
    }
  })

  it('TODO kind resuelve a un variant NEUTRO (ningún dominio tiene chrome especial)', () => {
    for (const kind of Object.keys(NEXA_ANSWERS_CANVAS_KIND_CONFIG) as Array<keyof typeof NEXA_ANSWERS_CANVAS_KIND_CONFIG>) {
      const variant = resolveNexaAnswersCanvasVariant({ kind })

      expect(NEUTRAL_VARIANTS).toContain(variant)
    }
  })

  it('el variant explícito gana sobre el del kind (override del consumer)', () => {
    expect(resolveNexaAnswersCanvasVariant({ kind: 'financeChartEmbedded', variant: 'sidecar' })).toBe('sidecar')
  })

  it('sin kind ni variant → cae a custom→embedded (default neutro, no rompe)', () => {
    expect(resolveNexaAnswersCanvasVariant({})).toBe('embedded')
  })

  it('cada config de kind apunta a un variant que existe en el catálogo de variants', () => {
    for (const config of Object.values(NEXA_ANSWERS_CANVAS_KIND_CONFIG)) {
      expect(NEXA_ANSWERS_CANVAS_VARIANT_CONFIG[config.variant]).toBeDefined()
    }
  })
})

describe('resolveNexaAnswersCanvasDensity — precedencia', () => {
  const surfaceContext = (density?: NexaAnswersSurfaceContext['density']): NexaAnswersSurfaceContext => ({
    surfaceId: 's',
    domain: 'finance',
    placement: 'embedded',
    density,
    dataReality: 'synthetic',
    sensitivity: 'tenant_internal',
    allowedRenderers: ['answerBubble'],
    allowedActions: []
  })

  it('density explícita gana sobre todo', () => {
    expect(
      resolveNexaAnswersCanvasDensity({ density: 'mobileStack', kind: 'financeChartEmbedded', surfaceContext: surfaceContext('sidecar'), variant: 'embedded' })
    ).toBe('mobileStack')
  })

  it('surfaceContext.density gana sobre el default del kind', () => {
    expect(
      resolveNexaAnswersCanvasDensity({ kind: 'financeChartEmbedded', surfaceContext: surfaceContext('sidecar'), variant: 'embedded' })
    ).toBe('sidecar')
  })

  it('sin density ni surfaceContext → default del kind (finance = wideAnalytical)', () => {
    expect(resolveNexaAnswersCanvasDensity({ kind: 'financeChartEmbedded', variant: 'embedded' })).toBe('wideAnalytical')
  })

  it('sin kind ni surfaceContext → default del kind custom (embeddedStandard), no el del variant', () => {
    // El kind cae a `custom` (embeddedStandard) ANTES del default del variant → el branch de variant
    // es efectivamente inalcanzable mientras todo kind tenga defaultDensity. Lockea la conducta real.
    expect(resolveNexaAnswersCanvasDensity({ variant: 'sidecar' })).toBe('embeddedStandard')
  })
})

describe('assertNexaAnswersRenderPlanAllowed — allowlist de seguridad por surface', () => {
  const plan = (renderer: 'answerBubble' | 'compactAnswer' | 'conversationBubble'): NexaAnswersRenderPlan =>
    ({ blocks: [{ id: 'b', renderer, rendererVersion: 'v1' }] }) as unknown as NexaAnswersRenderPlan

  it('pasa cuando el renderer está permitido', () => {
    expect(() => assertNexaAnswersRenderPlanAllowed({ renderPlan: plan('answerBubble'), allowedRenderers: ['answerBubble'] })).not.toThrow()
  })

  it('LANZA cuando el renderer NO está permitido para la surface (gate de seguridad)', () => {
    expect(() => assertNexaAnswersRenderPlanAllowed({ renderPlan: plan('conversationBubble'), allowedRenderers: ['answerBubble'] })).toThrow(
      /not allowed for this surface/
    )
  })

  it('no-op cuando no hay renderPlan', () => {
    expect(() => assertNexaAnswersRenderPlanAllowed({ allowedRenderers: [] })).not.toThrow()
  })
})
