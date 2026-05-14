import { describe, expect, it } from 'vitest'

import {
  evaluateInternalCollaboratorEligibility,
  FUNCTIONAL_ACCOUNT_PATTERNS,
  type EligibilityInput,
  type ScimEligibilityOverride
} from './eligibility'

const ALLOWED_DOMAINS = Object.freeze(['efeoncepro.com', 'efeonce.org', 'efeonce.cl'])

const buildInput = (overrides: Partial<EligibilityInput> = {}): EligibilityInput => ({
  upn: 'fzurita@efeoncepro.com',
  email: 'fzurita@efeoncepro.com',
  externalId: 'ec1b7fd0-87c9-43cd-a46f-1e8c37297258',
  displayName: 'Felipe Zurita',
  givenName: 'Felipe',
  familyName: 'Zurita',
  allowedDomains: ALLOWED_DOMAINS,
  overrides: [],
  ...overrides
})

describe('evaluateInternalCollaboratorEligibility — happy path', () => {
  it('eligible human collaborator', () => {
    const verdict = evaluateInternalCollaboratorEligibility(buildInput())

    expect(verdict.eligible).toBe(true)

    if (verdict.eligible) {
      expect(verdict.reason).toBe('human_collaborator')
    }
  })
})

describe('evaluateInternalCollaboratorEligibility — L1 hard reject', () => {
  it('rejects external #EXT# guest in UPN', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({ upn: 'external_user#EXT#@efeoncepro.com', email: 'external_user@gmail.com' })
    )

    expect(verdict.eligible).toBe(false)

    if (!verdict.eligible) {
      expect(verdict.outcome).toBe('reject')
      expect(verdict.reason).toBe('external_guest')
    }
  })

  it('rejects email with domain not in allowed list', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({ upn: 'someone@gmail.com', email: 'someone@gmail.com' })
    )

    expect(verdict.eligible).toBe(false)

    if (!verdict.eligible) {
      expect(verdict.outcome).toBe('reject')
      expect(verdict.reason).toBe('external_guest')
    }
  })

  it('rejects when email has no domain', () => {
    const verdict = evaluateInternalCollaboratorEligibility(buildInput({ email: 'malformed' }))

    expect(verdict.eligible).toBe(false)

    if (!verdict.eligible) {
      expect(verdict.outcome).toBe('reject')
      expect(verdict.reason).toBe('external_guest')
    }
  })
})

describe('evaluateInternalCollaboratorEligibility — L2 functional account', () => {
  it.each([
    ['noreply@efeoncepro.com'],
    ['support@efeoncepro.com'],
    ['marketing@efeoncepro.com'],
    ['admin@efeoncepro.com'],
    ['hr@efeoncepro.com'],
    ['finance@efeoncepro.com'],
    ['security@efeoncepro.com'],
    ['scim-sync@efeoncepro.com'],
    ['service-account-sample@efeoncepro.com'],
    ['bot-greeter@efeoncepro.com']
  ])('classifies %s as functional account', email => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({ upn: email, email, displayName: 'Support Team', givenName: 'Support', familyName: 'Team' })
    )

    expect(verdict.eligible).toBe(false)

    if (!verdict.eligible) {
      expect(verdict.outcome).toBe('client_user_only')
      expect(verdict.reason).toBe('functional_account')

      if (verdict.reason === 'functional_account') {
        expect(verdict.matchedPattern).toBeTypeOf('string')
        expect(verdict.matchedPattern.length).toBeGreaterThan(0)
      }
    }
  })

  it('does NOT classify a human name starting with admin-prefixed surname as functional', () => {
    // Humano legítimo "Administrador López" tiene email "alopez@..." — no matchea regex
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({ upn: 'alopez@efeoncepro.com', email: 'alopez@efeoncepro.com', displayName: 'Administrador López', givenName: 'Administrador', familyName: 'López' })
    )

    expect(verdict.eligible).toBe(true)
  })
})

describe('evaluateInternalCollaboratorEligibility — L3 name shape', () => {
  it('rejects with client_user_only when only displayName "Support" (sin apellido)', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        upn: 'tech@efeoncepro.com', // NO matchea pattern L2 (no es noreply/support/admin/etc.)
        email: 'tech@efeoncepro.com',
        displayName: 'Tech',
        givenName: null,
        familyName: null
      })
    )

    expect(verdict.eligible).toBe(false)

    if (!verdict.eligible) {
      expect(verdict.outcome).toBe('client_user_only')
      expect(verdict.reason).toBe('name_shape_insufficient')
    }
  })

  it('rejects when only one word display name and no apellido', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        upn: 'jdoe@efeoncepro.com',
        email: 'jdoe@efeoncepro.com',
        displayName: 'Jane',
        givenName: 'Jane',
        familyName: null
      })
    )

    expect(verdict.eligible).toBe(false)

    if (!verdict.eligible) {
      expect(verdict.reason).toBe('name_shape_insufficient')
    }
  })

  it('accepts when displayName has 2 words 2+ chars each', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        upn: 'jdoe@efeoncepro.com',
        email: 'jdoe@efeoncepro.com',
        displayName: 'Jane Doe',
        givenName: null,
        familyName: null
      })
    )

    expect(verdict.eligible).toBe(true)
  })

  it('accepts when givenName + familyName ambos 2+ chars', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        upn: 'jdoe@efeoncepro.com',
        email: 'jdoe@efeoncepro.com',
        displayName: null,
        givenName: 'Jane',
        familyName: 'Doe'
      })
    )

    expect(verdict.eligible).toBe(true)
  })
})

describe('evaluateInternalCollaboratorEligibility — L4 admin override', () => {
  const buildAllowOverride = (matchValue: string): ScimEligibilityOverride => ({
    overrideId: 'override-allow-test',
    matchType: 'email',
    matchValue,
    effect: 'allow'
  })

  const buildDenyOverride = (matchValue: string): ScimEligibilityOverride => ({
    overrideId: 'override-deny-test',
    matchType: 'email',
    matchValue,
    effect: 'deny'
  })

  it('allow override force-eligible para functional account (L2 bypass)', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        upn: 'marketing@efeoncepro.com',
        email: 'marketing@efeoncepro.com',
        overrides: [buildAllowOverride('marketing@efeoncepro.com')]
      })
    )

    expect(verdict.eligible).toBe(true)

    if (verdict.eligible) {
      expect(verdict.reason).toBe('admin_allowlist')

      if (verdict.reason === 'admin_allowlist') {
        expect(verdict.overrideId).toBe('override-allow-test')
      }
    }
  })

  it('allow override force-eligible para name shape insuficiente (L3 bypass)', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        upn: 'tech@efeoncepro.com',
        email: 'tech@efeoncepro.com',
        displayName: 'Tech',
        givenName: null,
        familyName: null,
        overrides: [buildAllowOverride('tech@efeoncepro.com')]
      })
    )

    expect(verdict.eligible).toBe(true)

    if (verdict.eligible) {
      expect(verdict.reason).toBe('admin_allowlist')
    }
  })

  it('deny override force-reject para humano legitimate', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        overrides: [buildDenyOverride('fzurita@efeoncepro.com')]
      })
    )

    expect(verdict.eligible).toBe(false)

    if (!verdict.eligible) {
      expect(verdict.outcome).toBe('reject')
      expect(verdict.reason).toBe('admin_blocklist')

      if (verdict.reason === 'admin_blocklist') {
        expect(verdict.overrideId).toBe('override-deny-test')
      }
    }
  })

  it('deny gana sobre allow simultaneo (hard rule canónica)', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        overrides: [buildAllowOverride('fzurita@efeoncepro.com'), buildDenyOverride('fzurita@efeoncepro.com')]
      })
    )

    expect(verdict.eligible).toBe(false)

    if (!verdict.eligible) {
      expect(verdict.outcome).toBe('reject')
      expect(verdict.reason).toBe('admin_blocklist')
    }
  })

  it('override match por azure_oid (case-insensitive)', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        externalId: 'ec1b7fd0-87c9-43cd-a46f-1e8c37297258',
        overrides: [
          {
            overrideId: 'oid-allow',
            matchType: 'azure_oid',
            matchValue: 'EC1B7FD0-87C9-43CD-A46F-1E8C37297258', // upper case
            effect: 'allow'
          }
        ]
      })
    )

    // Humano default-eligible — pero override allow añade override reason
    expect(verdict.eligible).toBe(true)

    if (verdict.eligible) {
      expect(verdict.reason).toBe('admin_allowlist')
    }
  })

  it('override match por upn case-insensitive', () => {
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        upn: 'fzurita@efeoncepro.com',
        overrides: [{ overrideId: 'upn-deny', matchType: 'upn', matchValue: 'FZURITA@EFEONCEPRO.COM', effect: 'deny' }]
      })
    )

    expect(verdict.eligible).toBe(false)

    if (!verdict.eligible) {
      expect(verdict.reason).toBe('admin_blocklist')
    }
  })
})

describe('evaluateInternalCollaboratorEligibility — combinatoria', () => {
  it('allow override bypasses #EXT# guest (L1)', () => {
    // Caso teórico — admin permite a un guest explícitamente
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        upn: 'guest#EXT#@efeoncepro.com',
        email: 'guest@efeoncepro.com',
        overrides: [
          {
            overrideId: 'guest-allow',
            matchType: 'email',
            matchValue: 'guest@efeoncepro.com',
            effect: 'allow'
          }
        ]
      })
    )

    expect(verdict.eligible).toBe(true)

    if (verdict.eligible) {
      expect(verdict.reason).toBe('admin_allowlist')
    }
  })

  it('functional account regex matches al inicio del local part, no en cualquier posición', () => {
    // "msanchez" no matchea ningún functional pattern porque empieza por 'm' + Sanchez
    const verdict = evaluateInternalCollaboratorEligibility(
      buildInput({
        upn: 'msanchez@efeoncepro.com',
        email: 'msanchez@efeoncepro.com',
        displayName: 'Maria Sanchez',
        givenName: 'Maria',
        familyName: 'Sanchez'
      })
    )

    expect(verdict.eligible).toBe(true)
  })
})

describe('FUNCTIONAL_ACCOUNT_PATTERNS', () => {
  it('is frozen (immutable export)', () => {
    expect(Object.isFrozen(FUNCTIONAL_ACCOUNT_PATTERNS)).toBe(true)
  })

  it('all patterns are valid RegExp instances', () => {
    for (const p of FUNCTIONAL_ACCOUNT_PATTERNS) {
      expect(p).toBeInstanceOf(RegExp)
    }
  })

  it('contains expected canonical patterns', () => {
    const sources = FUNCTIONAL_ACCOUNT_PATTERNS.map(p => p.source)

    expect(sources.some(s => s.includes('noreply'))).toBe(true)
    expect(sources.some(s => s.includes('admin'))).toBe(true)
    expect(sources.some(s => s.includes('bot-'))).toBe(true)
  })
})
