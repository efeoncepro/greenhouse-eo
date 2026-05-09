import { describe, expect, it } from 'vitest'

import { resolveEngagementKindCascade } from './engagement-kind-cascade'

describe('resolveEngagementKindCascade (TASK-836 Slice 3)', () => {
  describe('Caso 1: HubSpot poblado y valor en enum', () => {
    it.each([
      ['regular'], ['pilot'], ['trial'], ['poc'], ['discovery']
    ])('usa valor HubSpot: %s', kind => {
      const result = resolveEngagementKindCascade({
        hubspotValue: kind,
        existingPgValue: null,
        resolvedStage: 'active'
      })

      expect(result.kind).toBe(kind)
      expect(result.rule).toBe('hubspot_authoritative')
    })

    it('valor HubSpot tiene prioridad sobre PG (HubSpot wins cuando explicito)', () => {
      const result = resolveEngagementKindCascade({
        hubspotValue: 'pilot',
        existingPgValue: 'regular',
        resolvedStage: 'active'
      })

      expect(result.kind).toBe('pilot')
      expect(result.rule).toBe('hubspot_authoritative')
    })

    it('trim de whitespace', () => {
      const result = resolveEngagementKindCascade({
        hubspotValue: '  pilot  ',
        existingPgValue: null,
        resolvedStage: 'validation'
      })

      expect(result.kind).toBe('pilot')
    })
  })

  describe('Caso 2: HubSpot poblado pero fuera del enum -> NO pisar PG', () => {
    it('preserva existingPgValue cuando HubSpot envia valor invalido y PG existia', () => {
      const result = resolveEngagementKindCascade({
        hubspotValue: 'enterprise', // invalido
        existingPgValue: 'pilot',
        resolvedStage: 'active'
      })

      expect(result.kind).toBe('pilot')

      if (result.rule === 'hubspot_value_outside_enum') {
        expect(result.invalidValue).toBe('enterprise')
        expect(result.requiresUnmappedReason).toBe('missing_classification')
      } else {
        throw new Error('expected hubspot_value_outside_enum rule')
      }
    })

    it('devuelve NULL cuando HubSpot invalido y PG NULL', () => {
      const result = resolveEngagementKindCascade({
        hubspotValue: 'subscription',
        existingPgValue: null,
        resolvedStage: 'active'
      })

      expect(result.kind).toBeNull()

      if (result.rule === 'hubspot_value_outside_enum') {
        expect(result.invalidValue).toBe('subscription')
        expect(result.requiresUnmappedReason).toBe('missing_classification')
      } else {
        throw new Error('expected hubspot_value_outside_enum rule')
      }
    })
  })

  describe('Caso 3: HubSpot NULL + PG existe non-regular -> preservar PG', () => {
    it.each(['pilot', 'trial', 'poc', 'discovery'] as const)('preserva PG=%s', existingKind => {
      const result = resolveEngagementKindCascade({
        hubspotValue: null,
        existingPgValue: existingKind,
        resolvedStage: 'active'
      })

      expect(result.kind).toBe(existingKind)
      expect(result.rule).toBe('preserve_pg')
    })

    it('preserva PG ignorando hubspotValue NULL aunque venga string vacio', () => {
      const result = resolveEngagementKindCascade({
        hubspotValue: '',
        existingPgValue: 'pilot',
        resolvedStage: 'validation'
      })

      expect(result.kind).toBe('pilot')
      expect(result.rule).toBe('preserve_pg')
    })

    it('preserva PG ignorando hubspotValue undefined', () => {
      const result = resolveEngagementKindCascade({
        hubspotValue: undefined,
        existingPgValue: 'discovery',
        resolvedStage: 'closed'
      })

      expect(result.kind).toBe('discovery')
      expect(result.rule).toBe('preserve_pg')
    })
  })

  describe('Caso 4: HubSpot NULL + PG existe regular -> preservar regular', () => {
    it('preserva regular', () => {
      const result = resolveEngagementKindCascade({
        hubspotValue: null,
        existingPgValue: 'regular',
        resolvedStage: 'active'
      })

      expect(result.kind).toBe('regular')
      expect(result.rule).toBe('preserve_pg')
    })
  })

  describe('Caso 5: HubSpot NULL + PG NULL + stage validation -> classification_required', () => {
    it('requires_unmapped_reason missing_classification', () => {
      const result = resolveEngagementKindCascade({
        hubspotValue: null,
        existingPgValue: null,
        resolvedStage: 'validation'
      })

      expect(result.kind).toBeNull()

      if (result.rule === 'classification_required_in_validation') {
        expect(result.requiresUnmappedReason).toBe('missing_classification')
      } else {
        throw new Error('expected classification_required_in_validation rule')
      }
    })
  })

  describe('Caso 6: HubSpot NULL + PG NULL + stage operativo -> default regular legacy', () => {
    it.each([
      'onboarding', 'active', 'renewal_pending', 'renewed', 'closed', 'paused'
    ] as const)('stage=%s -> regular default', stage => {
      const result = resolveEngagementKindCascade({
        hubspotValue: null,
        existingPgValue: null,
        resolvedStage: stage
      })

      expect(result.kind).toBe('regular')
      expect(result.rule).toBe('default_regular_legacy')
    })
  })

  describe('Hard rules invariantes', () => {
    it('NUNCA sobrescribe engagement_kind con NULL desde un UPSERT inbound', () => {
      // El test 3 + 4 ya cubre, pero explicitemos con un sweep:
      const cases = [
        { hubspot: null, existing: 'regular' as const },
        { hubspot: null, existing: 'pilot' as const },
        { hubspot: '', existing: 'trial' as const },
        { hubspot: undefined, existing: 'discovery' as const },
        { hubspot: '   ', existing: 'poc' as const }
      ]

      for (const c of cases) {
        const result = resolveEngagementKindCascade({
          hubspotValue: c.hubspot,
          existingPgValue: c.existing,
          resolvedStage: 'active'
        })

        expect(result.kind).toBe(c.existing) // never null
      }
    })

    it('NUNCA asume default pilot/trial/poc/discovery en stage validation sin clasificacion', () => {
      const result = resolveEngagementKindCascade({
        hubspotValue: null,
        existingPgValue: null,
        resolvedStage: 'validation'
      })

      expect(result.kind).toBeNull() // queda unmapped, NO inventa pilot
    })
  })
})
