import { describe, expect, it } from 'vitest'

import { parsePublicHiringApplication } from '@/lib/hiring/public-careers/schema'

import { normalizeCandidateIdentityInput } from './index'

// TASK-1736 Slice 1 — parity de entradas: Careers custom (payload browser directo) y Growth Forms
// (la proyección `growth-hiring-application-from-submission` construye
// `{ ...fields, consent: true, futureOpportunitiesConsent, consentPolicyVersion }` y llama al
// MISMO parser). El mismo input por las dos rutas DEBE producir el mismo NormalizedApplicationInput
// y el mismo CandidateIdentityIntake — la regla vive una sola vez (Full API Parity).

const fields = {
  openingPublicId: 'EO-OPN-0061',
  firstName: '  valentina ',
  lastName: 'villa  soto',
  email: 'Valentina@Example.com',
  phone: '9 1234 5678',
  residenceCountryCode: 'cl',
  portfolioUrl: 'https://valentina.dev',
  linkedinUrl: 'https://linkedin.com/in/valentina',
  availability: 'inmediata',
  message: 'Hola,\n\nme interesa el rol.'
}

// Ruta Careers: el browser envía el payload completo con consent explícito.
const careersPayload = {
  ...fields,
  consent: true,
  consentPolicyVersion: 'efeonce-careers-2026-07',
  futureOpportunitiesConsent: true
}

// Ruta Growth Forms: la proyección re-lee normalized_fields_json y arma este shape (ver
// src/lib/sync/projections/growth-hiring-application-from-submission.ts).
const growthFormsPayload = {
  ...fields,
  consent: true,
  futureOpportunitiesConsent: true,
  consentPolicyVersion: 'efeonce-careers-2026-07'
}

describe('entry parity Careers ↔ Growth Forms (mismo fixture, mismas dos rutas)', () => {
  it('el parser produce EXACTAMENTE el mismo NormalizedApplicationInput', () => {
    const fromCareers = parsePublicHiringApplication(careersPayload)
    const fromGrowthForms = parsePublicHiringApplication(growthFormsPayload)

    expect(fromCareers).not.toBeNull()
    expect(fromCareers).toEqual(fromGrowthForms)

    // El nombre queda RAW (evidencia): sólo trim exterior, sin NFC/casing/colapso interno.
    expect(fromCareers?.firstName).toBe('valentina')
    expect(fromCareers?.lastName).toBe('villa  soto')
    expect(fromCareers?.fullName).toBe('valentina villa  soto')

    // Los contratos existentes se mantienen: email lowercase, E.164, ISO-2, availability canónica.
    expect(fromCareers?.email).toBe('valentina@example.com')
    expect(fromCareers?.phone).toBe('+56912345678')
    expect(fromCareers?.residenceCountryCode).toBe('CL')
    expect(fromCareers?.availability).toBe('Inmediata')
    expect(fromCareers?.message).toBe('Hola,\n\nme interesa el rol.')
  })

  it('el primitive canónico produce EXACTAMENTE el mismo CandidateIdentityIntake por ambas rutas', () => {
    const fromCareers = parsePublicHiringApplication(careersPayload)
    const fromGrowthForms = parsePublicHiringApplication(growthFormsPayload)

    const intakeCareers = normalizeCandidateIdentityInput({
      firstName: fromCareers?.firstName ?? '',
      lastName: fromCareers?.lastName ?? ''
    })

    const intakeGrowthForms = normalizeCandidateIdentityInput({
      firstName: fromGrowthForms?.firstName ?? '',
      lastName: fromGrowthForms?.lastName ?? ''
    })

    expect(intakeCareers).toEqual(intakeGrowthForms)

    // Evidencia intacta + display estructural (whitespace interno colapsado, casing sin tocar).
    expect(intakeCareers.submitted.fullName).toBe('valentina villa  soto')
    expect(intakeCareers.display.fullName).toBe('valentina villa soto')
    expect(intakeCareers.casing.classification).toBe('degenerate_lower')
    expect(intakeCareers.searchKey.value).toBe('valentina villa soto')
  })
})
