import { describe, expect, it } from 'vitest'

import { ROLE_CODES } from '@/config/role-codes'

import {
  KNOWLEDGE_AGENTIC_POLICIES,
  KNOWLEDGE_AUDIENCES,
  KNOWLEDGE_DOCUMENT_TYPES,
  KNOWLEDGE_SENSITIVITIES
} from '../constants'

import { PILOT_CORPUS } from './pilot-corpus'

const ROLE_VALUES = new Set<string>(Object.values(ROLE_CODES))
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

describe('pilot corpus manifest (TASK-1082)', () => {
  it('has the 14 canonical pilot docs', () => {
    expect(PILOT_CORPUS).toHaveLength(14)
  })

  it('slugs are unique kebab-case', () => {
    const slugs = PILOT_CORPUS.map(e => e.slug)

    expect(new Set(slugs).size).toBe(slugs.length)

    for (const slug of slugs) {
      expect(slug).toMatch(SLUG_RE)
    }
  })

  it('every enum field is canonical', () => {
    for (const entry of PILOT_CORPUS) {
      expect(KNOWLEDGE_DOCUMENT_TYPES).toContain(entry.documentType)
      expect(KNOWLEDGE_AUDIENCES).toContain(entry.audience)
      expect(KNOWLEDGE_SENSITIVITIES).toContain(entry.sensitivity)
      expect(KNOWLEDGE_AGENTIC_POLICIES).toContain(entry.agenticPolicy)
    }
  })

  it('approverRole (when set) is a real ROLE_CODE — no ghost roles', () => {
    for (const entry of PILOT_CORPUS) {
      if (entry.approverRole) {
        expect(ROLE_VALUES.has(entry.approverRole)).toBe(true)
      }
    }
  })

  it('MVP is internal-only', () => {
    for (const entry of PILOT_CORPUS) {
      expect(entry.audience).toBe('internal')
    }
  })

  it('payroll + secrets docs are born agent_excluded', () => {
    const payroll = PILOT_CORPUS.find(e => e.slug === 'periodos-de-nomina')
    const secrets = PILOT_CORPUS.find(e => e.slug === 'politica-secretos-acceso')

    expect(payroll?.agenticPolicy).toBe('agent_excluded')
    expect(secrets?.agenticPolicy).toBe('agent_excluded')
    expect(secrets?.sensitivity).toBe('restricted')
  })

  it('humanUrl points at the canonical /knowledge/<slug>', () => {
    for (const entry of PILOT_CORPUS) {
      expect(entry.humanUrl).toBe(`/knowledge/${entry.slug}`)
    }
  })
})
