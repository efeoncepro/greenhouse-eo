import { describe, expect, it } from 'vitest'

import { KnowledgeValidationError } from './errors'
import {
  assertKnowledgeFeedbackTarget,
  assertKnowledgeSlug,
  assertNonEmptyKnowledgeText
} from './validators'

describe('assertKnowledgeSlug', () => {
  it('accepts kebab-case ascii slugs', () => {
    expect(assertKnowledgeSlug('como-preguntar-a-nexa')).toBe('como-preguntar-a-nexa')
    expect(assertKnowledgeSlug('glosario-ico')).toBe('glosario-ico')
    expect(assertKnowledgeSlug(' manual ')).toBe('manual')
  })

  it('rejects invalid slugs', () => {
    expect(() => assertKnowledgeSlug('Como Preguntar')).toThrow(KnowledgeValidationError)
    expect(() => assertKnowledgeSlug('con_guion_bajo')).toThrow(KnowledgeValidationError)
    expect(() => assertKnowledgeSlug('acentós')).toThrow(KnowledgeValidationError)
    expect(() => assertKnowledgeSlug('')).toThrow(KnowledgeValidationError)
    expect(() => assertKnowledgeSlug('-leading')).toThrow(KnowledgeValidationError)
  })
})

describe('assertNonEmptyKnowledgeText', () => {
  it('trims and returns non-empty', () => {
    expect(assertNonEmptyKnowledgeText('  hola  ', 'title')).toBe('hola')
  })

  it('throws on empty/whitespace', () => {
    expect(() => assertNonEmptyKnowledgeText('   ', 'title')).toThrow(KnowledgeValidationError)
  })
})

describe('assertKnowledgeFeedbackTarget', () => {
  it('accepts when document or chunk present', () => {
    expect(() => assertKnowledgeFeedbackTarget('kdoc-1', null)).not.toThrow()
    expect(() => assertKnowledgeFeedbackTarget(null, 'kchk-1')).not.toThrow()
  })

  it('throws when both missing', () => {
    expect(() => assertKnowledgeFeedbackTarget(null, null)).toThrow(KnowledgeValidationError)
    expect(() => assertKnowledgeFeedbackTarget(undefined, undefined)).toThrow(
      KnowledgeValidationError
    )
  })
})
