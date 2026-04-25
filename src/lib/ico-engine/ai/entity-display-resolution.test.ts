import { describe, expect, it } from 'vitest'

import {
  PROJECT_DISPLAY_SENTINELS,
  buildScopedEntityKey,
  isProjectDisplaySentinel,
  isTechnicalProjectIdentifier
} from './entity-display-resolution'

describe('isTechnicalProjectIdentifier', () => {
  it('accepts human-readable titles', () => {
    expect(isTechnicalProjectIdentifier('TEASER TS - Chile (S)')).toBe(false)
    expect(isTechnicalProjectIdentifier('Campaña Q1 Digital')).toBe(false)
    expect(isTechnicalProjectIdentifier('72 HR LOCURA')).toBe(false)
  })

  it('rejects canonical project-record ids with known prefixes', () => {
    expect(isTechnicalProjectIdentifier('project-abc123')).toBe(true)
    expect(isTechnicalProjectIdentifier('proj-1234567890ab')).toBe(true)
    expect(isTechnicalProjectIdentifier('notion-foo')).toBe(true)
    expect(isTechnicalProjectIdentifier('task-1')).toBe(true)
    expect(isTechnicalProjectIdentifier('sprint-42')).toBe(true)
  })

  it('rejects 32-char hex ids (Notion page ids without dashes)', () => {
    expect(isTechnicalProjectIdentifier('10c15729e9fd497b8411fb72b7af580f')).toBe(true)
  })

  it('rejects full UUIDs (Notion page ids with dashes)', () => {
    expect(isTechnicalProjectIdentifier('10c15729-e9fd-497b-8411-fb72b7af580f')).toBe(true)
  })

  it('rejects long numeric ids (HubSpot)', () => {
    expect(isTechnicalProjectIdentifier('123456789012')).toBe(true)
    expect(isTechnicalProjectIdentifier('987654321012345')).toBe(true)
  })

  it('accepts short numeric strings (real sku/code values)', () => {
    expect(isTechnicalProjectIdentifier('2024')).toBe(false)
    expect(isTechnicalProjectIdentifier('12345')).toBe(false)
  })

  it('handles null, undefined, and whitespace', () => {
    expect(isTechnicalProjectIdentifier(null)).toBe(false)
    expect(isTechnicalProjectIdentifier(undefined)).toBe(false)
    expect(isTechnicalProjectIdentifier('')).toBe(false)
    expect(isTechnicalProjectIdentifier('   ')).toBe(false)
  })
})

describe('isProjectDisplaySentinel', () => {
  it('rejects canonical sentinels (case-insensitive)', () => {
    expect(isProjectDisplaySentinel('Sin nombre')).toBe(true)
    expect(isProjectDisplaySentinel('SIN NOMBRE')).toBe(true)
    expect(isProjectDisplaySentinel('sin nombre')).toBe(true)
    expect(isProjectDisplaySentinel('Sin título')).toBe(true)
    expect(isProjectDisplaySentinel('sin titulo')).toBe(true)
    expect(isProjectDisplaySentinel('Untitled')).toBe(true)
    expect(isProjectDisplaySentinel('untitled')).toBe(true)
    expect(isProjectDisplaySentinel('No title')).toBe(true)
    expect(isProjectDisplaySentinel('Sem nome')).toBe(true)
    expect(isProjectDisplaySentinel('N/A')).toBe(true)
    expect(isProjectDisplaySentinel('n/a')).toBe(true)
  })

  it('handles surrounding whitespace', () => {
    expect(isProjectDisplaySentinel('  Sin nombre  ')).toBe(true)
    expect(isProjectDisplaySentinel('\tUntitled\n')).toBe(true)
  })

  it('accepts real titles that contain sentinel words partially', () => {
    expect(isProjectDisplaySentinel('Sin nombre definitivo aún')).toBe(false)
    expect(isProjectDisplaySentinel('Untitled Symphony')).toBe(false)
  })

  it('accepts empty/null values (handled elsewhere)', () => {
    expect(isProjectDisplaySentinel(null)).toBe(false)
    expect(isProjectDisplaySentinel(undefined)).toBe(false)
    expect(isProjectDisplaySentinel('')).toBe(false)
  })

  it('is the inverse surface of PROJECT_DISPLAY_SENTINELS', () => {
    for (const sentinel of PROJECT_DISPLAY_SENTINELS) {
      expect(isProjectDisplaySentinel(sentinel)).toBe(true)
    }
  })
})

describe('buildScopedEntityKey', () => {
  it('namespaces entity by space', () => {
    expect(buildScopedEntityKey('spc-1', 'entity-1')).toBe('spc-1::entity-1')
  })

  it('prevents cross-space collision for same entity id', () => {
    const keyA = buildScopedEntityKey('spc-a', 'shared-entity')
    const keyB = buildScopedEntityKey('spc-b', 'shared-entity')

    expect(keyA).not.toEqual(keyB)
  })
})
