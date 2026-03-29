import { describe, expect, it } from 'vitest'

import { DEFAULT_NEXA_MODEL, isSupportedNexaModel, resolveNexaModel } from './nexa-models'

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
})
