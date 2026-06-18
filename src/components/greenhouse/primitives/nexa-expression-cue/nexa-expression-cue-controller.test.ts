import { describe, expect, it } from 'vitest'

import {
  getNexaExpressionCuePlainText,
  isNexaExpressionCueSensitive,
  resolveNexaExpressionCue
} from './nexa-expression-cue-controller'
import {
  NEXA_EXPRESSION_CUE_CONTEXTS,
  NEXA_EXPRESSION_CUE_KEYS,
  NEXA_EXPRESSION_CUE_REGISTRY,
  NEXA_EXPRESSION_CUE_TREATMENTS
} from './nexa-expression-cue-registry'
import type { NexaExpressionCueTreatment } from './nexa-expression-cue-types'

const EXPECTED_KEYS = [
  'ready',
  'reviewing',
  'risk',
  'idea',
  'source',
  'next_step',
  'opportunity',
  'missing_context',
  'blocked',
  'sensitive'
]

const EXPECTED_CONTEXTS = ['chatText', 'answerSurface', 'stateChip', 'emptyState', 'promptDock']

const EXPECTED_TREATMENTS: NexaExpressionCueTreatment[] = [
  'nexaMark',
  'fluentAsset',
  'tablerIcon',
  'statusDot',
  'textOnly',
  'none'
]

describe('Nexa expression cue registry', () => {
  it('declares the complete cue, context and treatment vocabulary', () => {
    expect(NEXA_EXPRESSION_CUE_KEYS).toEqual(EXPECTED_KEYS)
    expect(NEXA_EXPRESSION_CUE_CONTEXTS).toEqual(EXPECTED_CONTEXTS)
    expect(NEXA_EXPRESSION_CUE_TREATMENTS).toEqual(EXPECTED_TREATMENTS)
  })

  it('gives every cue accessible text and all required contexts', () => {
    for (const key of NEXA_EXPRESSION_CUE_KEYS) {
      const cue = NEXA_EXPRESSION_CUE_REGISTRY[key]

      expect(cue.label.length).toBeGreaterThan(0)
      expect(cue.ariaLabel.length).toBeGreaterThan(0)
      expect(cue.allowedContexts).toEqual(EXPECTED_CONTEXTS)
      expect(EXPECTED_TREATMENTS).toContain(cue.defaultTreatment)
      expect(EXPECTED_TREATMENTS).toContain(cue.sensitiveTreatment)
    }
  })
})

describe('resolveNexaExpressionCue', () => {
  it('resolves default and context-specific treatments', () => {
    expect(resolveNexaExpressionCue({ cue: 'idea' }).treatment).toBe('fluentAsset')
    expect(resolveNexaExpressionCue({ cue: 'reviewing', context: 'promptDock' }).treatment).toBe('nexaMark')
    expect(resolveNexaExpressionCue({ cue: 'ready', context: 'stateChip' }).treatment).toBe('statusDot')
  })

  it('degrades expressive treatments in sensitive domains', () => {
    const resolved = resolveNexaExpressionCue({
      cue: 'idea',
      context: 'answerSurface',
      domain: 'finance',
      treatment: 'fluentAsset'
    })

    expect(resolved.isSensitive).toBe(true)
    expect(resolved.degradationReason).toBe('sensitive-domain')
    expect(resolved.treatment).toBe('textOnly')
    expect(resolved.label).toBe('Punto a evaluar')
  })

  it('degrades expressive treatments when sensitivity is true or high', () => {
    expect(resolveNexaExpressionCue({ cue: 'opportunity', sensitivity: true }).treatment).toBe('textOnly')
    expect(resolveNexaExpressionCue({ cue: 'next_step', sensitivity: 'high' }).treatment).toBe('textOnly')
    expect(isNexaExpressionCueSensitive({ cue: 'source', sensitivity: 'high' })).toBe(true)
  })

  it('keeps already sober treatments for sensitive risk and blocked states', () => {
    expect(resolveNexaExpressionCue({ cue: 'risk', domain: 'legal' }).treatment).toBe('tablerIcon')
    expect(resolveNexaExpressionCue({ cue: 'blocked', domain: 'security' }).treatment).toBe('tablerIcon')
  })

  it('only treats declared sensitive domains as sensitive by domain', () => {
    expect(isNexaExpressionCueSensitive({ cue: 'idea', domain: 'contractual' })).toBe(true)
    expect(isNexaExpressionCueSensitive({ cue: 'idea', domain: 'people' })).toBe(false)
  })

  it('treats the sensitive cue itself as sensitive and plain-text stable', () => {
    const resolved = resolveNexaExpressionCue({ cue: 'sensitive', context: 'emptyState' })

    expect(resolved.isSensitive).toBe(true)
    expect(resolved.degradationReason).toBe('cue-sensitive')
    expect(resolved.treatment).toBe('textOnly')
    expect(getNexaExpressionCuePlainText({ cue: 'sensitive', context: 'emptyState' })).toBe('Tema sensible')
  })

  it('returns stable text unless the cue is decorative or intentionally none', () => {
    expect(getNexaExpressionCuePlainText({ cue: 'ready' })).toBe('Listo')
    expect(getNexaExpressionCuePlainText({ cue: 'ready', decorative: true })).toBe('')
    expect(getNexaExpressionCuePlainText({ cue: 'sensitive', context: 'chatText' })).toBe('')
  })
})
