import { describe, it, expect } from 'vitest'

import { normalizeMatchValue, stripOrgSuffix, isUuidAsName, levenshtein } from './normalize'

// ── normalizeMatchValue ──────────────────────────────────────────────

describe('normalizeMatchValue', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeMatchValue('Daniela Ferréira')).toBe('daniela ferreira')
  })

  it('replaces pipe with space', () => {
    expect(normalizeMatchValue('Pedro calao | Efeonce')).toBe('pedro calao efeonce')
  })

  it('collapses multiple spaces', () => {
    expect(normalizeMatchValue('Julio   Reyes')).toBe('julio reyes')
  })

  it('preserves @, dots, hyphens (email-safe chars)', () => {
    expect(normalizeMatchValue('user@efeonce.org')).toBe('user@efeonce.org')
    expect(normalizeMatchValue('first-last')).toBe('first-last')
  })

  it('strips special characters', () => {
    expect(normalizeMatchValue('Andrés (Pasto)')).toBe('andres pasto')
  })

  it('returns empty string for null/undefined', () => {
    expect(normalizeMatchValue(null)).toBe('')
    expect(normalizeMatchValue(undefined)).toBe('')
  })

  it('trims leading/trailing whitespace', () => {
    expect(normalizeMatchValue('  Julio  ')).toBe('julio')
  })
})

// ── stripOrgSuffix ───────────────────────────────────────────────────

describe('stripOrgSuffix', () => {
  it('removes " | Efeonce" suffix', () => {
    expect(stripOrgSuffix('Pedro calao | Efeonce')).toBe('Pedro calao')
  })

  it('removes " | Efeonce Group" suffix (case-insensitive)', () => {
    expect(stripOrgSuffix('Ana Ruiz | efeonce group')).toBe('Ana Ruiz')
  })

  it('leaves names without suffix unchanged', () => {
    expect(stripOrgSuffix('Daniela Ferreira')).toBe('Daniela Ferreira')
  })

  it('handles extra whitespace around pipe', () => {
    expect(stripOrgSuffix('Julio  |  Efeonce')).toBe('Julio')
  })
})

// ── isUuidAsName ─────────────────────────────────────────────────────

describe('isUuidAsName', () => {
  it('detects standard UUID v4', () => {
    expect(isUuidAsName('2a4d872b-bb85-b606-0000-000000000000')).toBe(true)
  })

  it('detects UUID with leading/trailing space', () => {
    expect(isUuidAsName(' 2a4d872b-bb85-b606-0000-000000000000 ')).toBe(true)
  })

  it('rejects normal names', () => {
    expect(isUuidAsName('Daniela Ferreira')).toBe(false)
  })

  it('returns true for null (no display name = bot)', () => {
    expect(isUuidAsName(null)).toBe(true)
  })

  it('returns true for empty string', () => {
    expect(isUuidAsName('')).toBe(true)
  })
})

// ── levenshtein ──────────────────────────────────────────────────────

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0)
  })

  it('returns length of other string when one is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3)
    expect(levenshtein('abc', '')).toBe(3)
  })

  it('counts single character substitution', () => {
    expect(levenshtein('cat', 'bat')).toBe(1)
  })

  it('counts insertion', () => {
    expect(levenshtein('cat', 'cats')).toBe(1)
  })

  it('counts deletion', () => {
    expect(levenshtein('cats', 'cat')).toBe(1)
  })

  it('handles multi-edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3)
  })

  it('is symmetric', () => {
    expect(levenshtein('abc', 'xyz')).toBe(levenshtein('xyz', 'abc'))
  })

  it('works for realistic name typos', () => {
    // "valentina" vs "valetina" (missing n) = 1
    expect(levenshtein('valentina', 'valetina')).toBe(1)

    // "andres" vs "andrs" (missing e) = 1
    expect(levenshtein('andres', 'andrs')).toBe(1)
  })
})
