import { describe, expect, it } from 'vitest'

import {
  AEO_DIAGNOSTIC_FORM_ID,
  mapAeoDiagnosticToGraderIntake,
  resolveAeoMarketLocale,
} from '../aeo-form-grader-adapter'

const baseFields = (): Record<string, unknown> => ({
  brandName: 'Grupo Berel',
  brandWebsite: 'https://grupoberel.com',
  country: 'México',
  email: 'marketing@grupoberel.com',
  fullName: 'Ana Silva',
  firstName: 'Ana',
  lastName: 'Silva',
  companySize: '51-200',
  mainCompetitor: 'Comex',
})

describe('TASK-1321 — aeo-form-grader-adapter', () => {
  it('exposes the /aeo-2/ form id constant', () => {
    expect(AEO_DIAGNOSTIC_FORM_ID).toBe('fdef-efeonce-aeo-diagnostic')
  })

  describe('resolveAeoMarketLocale', () => {
    it('derives market/locale from the REAL form values (full Spanish names with accents)', () => {
      // El <select> live submite el nombre completo, NO el ISO (verificado contra el contract live).
      expect(resolveAeoMarketLocale('Chile')).toEqual({ market: 'CL', locale: 'es-CL' })
      expect(resolveAeoMarketLocale('Colombia')).toEqual({ market: 'CO', locale: 'es-CO' })
      expect(resolveAeoMarketLocale('México')).toEqual({ market: 'MX', locale: 'es-MX' })
      expect(resolveAeoMarketLocale('Perú')).toEqual({ market: 'PE', locale: 'es-PE' })
    })

    it('accepts unaccented variants and ISO-2 codes (robustness)', () => {
      expect(resolveAeoMarketLocale('Mexico')).toEqual({ market: 'MX', locale: 'es-MX' })
      expect(resolveAeoMarketLocale('Peru')).toEqual({ market: 'PE', locale: 'es-PE' })
      expect(resolveAeoMarketLocale('CL')).toEqual({ market: 'CL', locale: 'es-CL' })
      expect(resolveAeoMarketLocale('MX')).toEqual({ market: 'MX', locale: 'es-MX' })
    })

    it('is case/whitespace tolerant', () => {
      expect(resolveAeoMarketLocale('  méxico ')).toEqual({ market: 'MX', locale: 'es-MX' })
    })

    it('falls back to CL/es-CL for unknown or empty country (never empty)', () => {
      expect(resolveAeoMarketLocale('XX')).toEqual({ market: 'CL', locale: 'es-CL' })
      expect(resolveAeoMarketLocale('')).toEqual({ market: 'CL', locale: 'es-CL' })
      expect(resolveAeoMarketLocale(null)).toEqual({ market: 'CL', locale: 'es-CL' })
      expect(resolveAeoMarketLocale(undefined)).toEqual({ market: 'CL', locale: 'es-CL' })
    })
  })

  describe('mapAeoDiagnosticToGraderIntake — happy path', () => {
    it('maps the /aeo-2/ field namespace to the grader deterministic intake', () => {
      const result = mapAeoDiagnosticToGraderIntake(baseFields())

      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.intake).toEqual({
        brandName: 'Grupo Berel',
        websiteUrl: 'https://grupoberel.com',
        market: 'MX',
        locale: 'es-MX',
        competitorsDeclared: ['Comex'],
        email: 'marketing@grupoberel.com',
        firstName: 'Ana',
        lastName: 'Silva',
        companySize: '51-200',
      })
    })

    it('country drives market/locale (CL default when country missing)', () => {
      const fields = baseFields()

      delete fields.country
      const result = mapAeoDiagnosticToGraderIntake(fields)

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.intake.market).toBe('CL')
      expect(result.intake.locale).toBe('es-CL')
    })

    it('falls back to brandWebsite via websiteUrl key when brandWebsite absent', () => {
      const fields = baseFields()

      delete fields.brandWebsite
      fields.websiteUrl = 'https://alt.example.com'
      const result = mapAeoDiagnosticToGraderIntake(fields)

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.intake.websiteUrl).toBe('https://alt.example.com')
    })

    it('splits fullName when firstName/lastName are not normalized', () => {
      const fields = baseFields()

      delete fields.firstName
      delete fields.lastName
      fields.fullName = '  María  José  Pérez  '
      const result = mapAeoDiagnosticToGraderIntake(fields)

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.intake.firstName).toBe('María')
      expect(result.intake.lastName).toBe('José Pérez')
    })

    it('empty mainCompetitor yields no declared competitors', () => {
      const fields = baseFields()

      delete fields.mainCompetitor
      const result = mapAeoDiagnosticToGraderIntake(fields)

      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.intake.competitorsDeclared).toEqual([])
    })
  })

  describe('mapAeoDiagnosticToGraderIntake — skip (degrade to commercial lead, no run)', () => {
    it('skips when brandName is missing (legacy version submission)', () => {
      const fields = baseFields()

      delete fields.brandName
      expect(mapAeoDiagnosticToGraderIntake(fields)).toEqual({ ok: false, reason: 'missing_brand_name' })
    })

    it('skips when website is missing (brand-intelligence cannot fetch)', () => {
      const fields = baseFields()

      delete fields.brandWebsite
      expect(mapAeoDiagnosticToGraderIntake(fields)).toEqual({ ok: false, reason: 'missing_website' })
    })

    it('skips when email is missing', () => {
      const fields = baseFields()

      delete fields.email
      expect(mapAeoDiagnosticToGraderIntake(fields)).toEqual({ ok: false, reason: 'missing_email' })
    })

    it('treats blank strings as missing', () => {
      const fields = baseFields()

      fields.brandName = '   '
      expect(mapAeoDiagnosticToGraderIntake(fields)).toEqual({ ok: false, reason: 'missing_brand_name' })
    })
  })
})
