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
  it('has the 15 base pilot docs + 67 TASK-1140 operating manuals', () => {
    expect(PILOT_CORPUS).toHaveLength(82)
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

  it('TASK-1140 operating manuals (HR/Payroll/Contractors incl.) are agent_allowed + internal', () => {
    // Operator decision (governance, opción A): los manuales operativos nuevos
    // nacen agent_allowed para que Nexa los cite; el único agent_excluded durable
    // es la política de secretos (restricted). Guard contra un flip silencioso.
    const newSlugs = ['payroll-finiquitos-chile', 'contractor-flujo-de-pago-completo', 'finance-operacion-end-to-end']

    for (const slug of newSlugs) {
      const entry = PILOT_CORPUS.find(e => e.slug === slug)

      expect(entry, slug).toBeDefined()
      expect(entry?.agenticPolicy, slug).toBe('agent_allowed')
      expect(entry?.audience, slug).toBe('internal')
      expect(entry?.sensitivity, slug).toBe('internal')
    }

    // El único restricted del corpus sigue siendo la política de secretos.
    const restricted = PILOT_CORPUS.filter(e => e.sensitivity === 'restricted')

    expect(restricted.map(e => e.slug)).toEqual(['politica-secretos-acceso'])
  })

  it('maintenance mode is agent-allowed for production-readiness QA', () => {
    const maintenance = PILOT_CORPUS.find(e => e.slug === 'modo-mantenimiento')

    expect(maintenance?.agenticPolicy).toBe('agent_allowed')
    expect(maintenance?.sourceFiles).toContain('docs/manual-de-uso/plataforma/modo-mantenimiento.md')
  })

  it('humanUrl points at the canonical /knowledge/<slug>', () => {
    for (const entry of PILOT_CORPUS) {
      expect(entry.humanUrl).toBe(`/knowledge/${entry.slug}`)
    }
  })
})
