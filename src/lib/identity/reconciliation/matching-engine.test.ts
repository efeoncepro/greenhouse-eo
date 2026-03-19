import { describe, it, expect } from 'vitest'

import { matchIdentity } from './matching-engine'
import type { DiscoveredIdentity, MemberCandidate } from './types'

// ── Helpers ──────────────────────────────────────────────────────────

const makeDiscovered = (overrides: Partial<DiscoveredIdentity> = {}): DiscoveredIdentity => ({
  sourceSystem: 'notion',
  sourceObjectType: 'user',
  sourceObjectId: 'notion-uuid-001',
  sourceDisplayName: 'Daniela Ferreira',
  sourceEmail: null,
  discoveredIn: 'notion_ops.tareas',
  occurrenceCount: 10,
  ...overrides
})

const makeCandidate = (overrides: Partial<MemberCandidate> = {}): MemberCandidate => ({
  memberId: 'member-001',
  displayName: 'Daniela Ferreira',
  email: 'daniela@efeoncepro.com',
  identityProfileId: 'idp-001',
  notionUserId: null,
  notionDisplayName: null,
  hubspotOwnerId: null,
  azureOid: null,
  emailAliases: [],
  ...overrides
})

// ── UUID-as-name (bots) ──────────────────────────────────────────────

describe('matchIdentity — UUID-as-name', () => {
  it('returns confidence 0 for UUID display names', () => {
    const discovered = makeDiscovered({
      sourceDisplayName: '2a4d872b-bb85-b606-0000-000000000000'
    })

    const result = matchIdentity(discovered, [makeCandidate()])

    expect(result.confidence).toBe(0)
    expect(result.candidateMemberId).toBeNull()
    expect(result.signals).toHaveLength(0)
  })

  it('returns confidence 0 for null display name', () => {
    const discovered = makeDiscovered({ sourceDisplayName: null })
    const result = matchIdentity(discovered, [makeCandidate()])

    expect(result.confidence).toBe(0)
  })
})

// ── Exact name match ─────────────────────────────────────────────────

describe('matchIdentity — name matching', () => {
  it('exact name match gives 0.70 confidence', () => {
    const discovered = makeDiscovered({ sourceDisplayName: 'Daniela Ferreira' })
    const candidate = makeCandidate({ displayName: 'Daniela Ferreira' })

    const result = matchIdentity(discovered, [candidate])

    expect(result.confidence).toBe(0.7)
    expect(result.candidateMemberId).toBe('member-001')
    expect(result.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ signal: 'name_exact' })])
    )
  })

  it('matches despite diacritics and casing', () => {
    const discovered = makeDiscovered({ sourceDisplayName: 'DANIELA FERRÉIRA' })
    const candidate = makeCandidate({ displayName: 'Daniela Ferreira' })

    const result = matchIdentity(discovered, [candidate])

    expect(result.confidence).toBe(0.7)
  })

  it('matches after stripping org suffix', () => {
    const discovered = makeDiscovered({ sourceDisplayName: 'Pedro calao | Efeonce' })
    const candidate = makeCandidate({ displayName: 'Pedro Calao', memberId: 'member-pedro' })

    const result = matchIdentity(discovered, [candidate])

    expect(result.confidence).toBe(0.7)
    expect(result.candidateMemberId).toBe('member-pedro')
  })

  it('fuzzy name match (Levenshtein ≤ 3) gives 0.45', () => {
    const discovered = makeDiscovered({ sourceDisplayName: 'Valentna Hoyos' }) // typo
    const candidate = makeCandidate({ displayName: 'Valentina Hoyos', memberId: 'member-val' })

    const result = matchIdentity(discovered, [candidate])

    expect(result.confidence).toBe(0.45)
    expect(result.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ signal: 'name_fuzzy' })])
    )
  })

  it('first-token match gives 0.30 when no other name signals', () => {
    const discovered = makeDiscovered({ sourceDisplayName: 'Julio' })
    const candidate = makeCandidate({ displayName: 'Julio Reyes', memberId: 'member-julio' })

    const result = matchIdentity(discovered, [candidate])

    expect(result.confidence).toBe(0.3)
    expect(result.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ signal: 'name_first_token' })])
    )
  })
})

// ── Email matching ───────────────────────────────────────────────────

describe('matchIdentity — email matching', () => {
  it('exact email match gives 0.90', () => {
    const discovered = makeDiscovered({
      sourceDisplayName: 'Unknown Person',
      sourceEmail: 'daniela@efeoncepro.com'
    })
    const candidate = makeCandidate({ email: 'daniela@efeoncepro.com' })

    const result = matchIdentity(discovered, [candidate])

    expect(result.confidence).toBe(0.9)
    expect(result.signals).toEqual(
      expect.arrayContaining([expect.objectContaining({ signal: 'email_exact' })])
    )
  })

  it('matches email aliases', () => {
    const discovered = makeDiscovered({
      sourceDisplayName: 'Unknown',
      sourceEmail: 'dani@efeonce.org'
    })
    const candidate = makeCandidate({
      email: 'daniela@efeoncepro.com',
      emailAliases: ['dani@efeonce.org']
    })

    const result = matchIdentity(discovered, [candidate])

    expect(result.confidence).toBe(0.9)
  })
})

// ── Combined signals ─────────────────────────────────────────────────

describe('matchIdentity — combined signals', () => {
  it('email + name gives > 0.90 (diminishing returns)', () => {
    const discovered = makeDiscovered({
      sourceDisplayName: 'Daniela Ferreira',
      sourceEmail: 'daniela@efeoncepro.com'
    })
    const candidate = makeCandidate({
      displayName: 'Daniela Ferreira',
      email: 'daniela@efeoncepro.com'
    })

    const result = matchIdentity(discovered, [candidate])

    expect(result.confidence).toBeGreaterThan(0.9)
    expect(result.confidence).toBeLessThanOrEqual(1.0)
    expect(result.signals.length).toBeGreaterThanOrEqual(2)
  })

  it('cross-link bonus adds to confidence', () => {
    const discovered = makeDiscovered({ sourceDisplayName: 'Daniela Ferreira' })
    const withoutCrossLink = makeCandidate({ displayName: 'Daniela Ferreira' })
    const withCrossLink = makeCandidate({
      displayName: 'Daniela Ferreira',
      memberId: 'member-cross',
      hubspotOwnerId: 'hs-123'
    })

    const resultWithout = matchIdentity(discovered, [withoutCrossLink])
    const resultWith = matchIdentity(discovered, [withCrossLink])

    expect(resultWith.confidence).toBeGreaterThan(resultWithout.confidence)
  })
})

// ── Multiple candidates ──────────────────────────────────────────────

describe('matchIdentity — candidate selection', () => {
  it('picks the highest-confidence candidate', () => {
    const discovered = makeDiscovered({
      sourceDisplayName: 'Daniela Ferreira',
      sourceEmail: 'daniela@efeoncepro.com'
    })

    const weak = makeCandidate({ displayName: 'Daniel Ferreira', memberId: 'member-wrong', email: null })
    const strong = makeCandidate({
      displayName: 'Daniela Ferreira',
      email: 'daniela@efeoncepro.com',
      memberId: 'member-right'
    })

    const result = matchIdentity(discovered, [weak, strong])

    expect(result.candidateMemberId).toBe('member-right')
  })

  it('returns no match when no candidates exist', () => {
    const discovered = makeDiscovered()
    const result = matchIdentity(discovered, [])

    expect(result.confidence).toBe(0)
    expect(result.candidateMemberId).toBeNull()
  })

  it('returns no match when names are completely different', () => {
    const discovered = makeDiscovered({ sourceDisplayName: 'Ricardo Flores' })
    const candidate = makeCandidate({ displayName: 'Valentina Hoyos', email: null })

    const result = matchIdentity(discovered, [candidate])

    expect(result.confidence).toBe(0)
    expect(result.candidateMemberId).toBeNull()
  })
})
