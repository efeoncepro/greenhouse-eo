import { describe, expect, it } from 'vitest'

import { DEFAULT_NEXA_MODEL, isSupportedNexaModel, resolveNexaModel, resolveNexaRequestedModel } from './nexa-models'

describe('nexa-models', () => {
  it('accepts supported Nexa models', () => {
    expect(isSupportedNexaModel('google/gemini-2.5-pro@default')).toBe(true)
    expect(isSupportedNexaModel('google/gemini-3.1-pro-preview@default')).toBe(true)
  })

  it('rejects unsupported model ids', () => {
    expect(isSupportedNexaModel('claude-sonnet')).toBe(false)
    expect(isSupportedNexaModel('gemini-3.1-flash')).toBe(false)
    expect(isSupportedNexaModel('google/gemini-3.1-flash-image-preview@default')).toBe(false)
  })

  it('prefers a valid requested model', () => {
    expect(resolveNexaModel({
      requestedModel: 'google/gemini-3-flash-preview@default',
      fallbackModel: 'google/gemini-2.5-flash@default'
    })).toBe('google/gemini-3-flash-preview@default')
  })

  it('falls back to the configured default when inputs are invalid', () => {
    expect(resolveNexaModel({
      requestedModel: 'claude',
      fallbackModel: 'gemini-9'
    })).toBe(DEFAULT_NEXA_MODEL)
  })

  // TASK-1134 — contrato que destraba el auto-router del chat.
  describe('resolveNexaRequestedModel (model selection truth)', () => {
    it('auto → null (NexaService decide: pin/router/default)', () => {
      expect(resolveNexaRequestedModel({ modelMode: 'auto', model: 'google/gemini-2.5-pro@default' })).toBeNull()
      expect(resolveNexaRequestedModel({ modelMode: 'auto' })).toBeNull()
    })

    it('manual con modelo soportado → ese modelo (override explícito)', () => {
      expect(resolveNexaRequestedModel({ modelMode: 'manual', model: 'google/gemini-2.5-pro@default' }))
        .toBe('google/gemini-2.5-pro@default')
    })

    it('manual con modelo NO soportado → null (cae al default server-side)', () => {
      expect(resolveNexaRequestedModel({ modelMode: 'manual', model: 'anthropic/claude-sonnet-4-6@default' })).toBeNull()
      expect(resolveNexaRequestedModel({ modelMode: 'manual', model: 'inventado' })).toBeNull()
    })

    it('cliente legacy (sin modelMode) con modelo soportado → manual (backward compat, sin regresión)', () => {
      expect(resolveNexaRequestedModel({ model: 'google/gemini-2.5-flash@default' }))
        .toBe('google/gemini-2.5-flash@default')
    })

    it('sin modelMode y sin modelo → null (auto)', () => {
      expect(resolveNexaRequestedModel({})).toBeNull()
    })
  })
})
