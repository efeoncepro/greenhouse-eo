import { describe, expect, it } from 'vitest'

import { DEFAULT_NEXA_MODEL, isSupportedNexaModel, resolveNexaModel } from './nexa-models'

describe('nexa-models', () => {
  it('accepts supported Nexa models', () => {
    expect(isSupportedNexaModel('gemini-2.5-pro')).toBe(true)
    expect(isSupportedNexaModel('gemini-3-pro-preview')).toBe(true)
  })

  it('rejects unsupported model ids', () => {
    expect(isSupportedNexaModel('claude-sonnet')).toBe(false)
    expect(isSupportedNexaModel('gemini-3.1-flash')).toBe(false)
  })

  it('prefers a valid requested model', () => {
    expect(resolveNexaModel({
      requestedModel: 'gemini-3-flash-preview',
      fallbackModel: 'gemini-2.5-flash'
    })).toBe('gemini-3-flash-preview')
  })

  it('falls back to the configured default when inputs are invalid', () => {
    expect(resolveNexaModel({
      requestedModel: 'claude',
      fallbackModel: 'gemini-9'
    })).toBe(DEFAULT_NEXA_MODEL)
  })
})
