import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))

import { getAssessmentAccessRecoveryAvailability } from './availability'

const row = {
  assessment_id: 'asmt-1',
  application_id: 'happ-1',
  opening_id: 'hopn-1',
  method: 'candidate_test',
  status: 'sent',
  started_at: null,
  token_expires_at: new Date('2026-08-30T00:00:00Z'),
  application_stage: 'screening',
  application_decision: null,
  consent_status: 'granted',
  now_at: new Date('2026-08-19T12:00:00Z'),
  effective_deadline_at: null,
  has_candidate_email: true,
  email_provider_status: null,
  recovery_count_24h: 0,
  // El fixture omitía este campo: `Number(undefined)` da NaN, `NaN >= 3` da false, y el
  // presupuesto del enlace seguro NUNCA se ejercitaba. El test pasaba por la razón equivocada.
  secure_link_count_24h: 0,
  latest_email_recovery_at: null,
  latest_secure_link_recovery_at: null,
}

describe('getAssessmentAccessRecoveryAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockResolvedValue([row])
  })

  it('expone evidencia mínima sin bearer, hash, email ni versión', async () => {
    const availability = await getAssessmentAccessRecoveryAvailability('asmt-1')
    const serialized = JSON.stringify(availability)

    expect(availability?.channels.email.available).toBe(true)
    expect(availability?.channels.secureLink.available).toBe(true)
    expect(serialized).not.toMatch(/token|hash|canonical_email|@/i)
  })

  it('bloquea sólo email con evidencia provider y conserva secure_link', async () => {
    mocks.query.mockResolvedValue([{ ...row, email_provider_status: 'bounced' }])

    const availability = await getAssessmentAccessRecoveryAvailability('asmt-1')

    expect(availability?.channels.email).toMatchObject({ available: false, providerStatus: 'bounced' })
    expect(availability?.channels.secureLink.available).toBe(true)
  })
})


// TASK-1747 — el cooldown es POR CANAL. Un MAX() sin filtrar apagaba el enlace seguro durante
// 60 s después de un correo: justo ocultarle al candidato la única salida que le quedaba.
describe('cooldown por canal', () => {
  const withRow = (over: Record<string, unknown>) => {
    mocks.query.mockResolvedValue([{ ...row, ...over }])

    return getAssessmentAccessRecoveryAvailability('asmt-1')
  }

  it('un correo recién enviado NO apaga el enlace seguro', async () => {
    const result = await withRow({
      latest_email_recovery_at: new Date('2026-08-19T11:59:30Z'),
      latest_secure_link_recovery_at: null,
    })

    expect(result?.channels.email.available).toBe(false)
    expect(result?.channels.secureLink.available).toBe(true)
    expect(result?.eligible).toBe(true)
    expect(result?.rateLimit.cooldownUntil).not.toBeNull()
    expect(result?.rateLimit.secureLinkCooldownUntil).toBeNull()
  })

  it('un enlace recién emitido NO apaga el correo', async () => {
    const result = await withRow({
      latest_email_recovery_at: null,
      latest_secure_link_recovery_at: new Date('2026-08-19T11:59:30Z'),
    })

    expect(result?.channels.email.available).toBe(true)
    expect(result?.channels.secureLink.available).toBe(false)
  })

  it('el presupuesto del enlace seguro se agota por su cuenta', async () => {
    const result = await withRow({ secure_link_count_24h: 3 })

    expect(result?.channels.secureLink.available).toBe(false)
    expect(result?.channels.email.available).toBe(true)
    expect(result?.eligible).toBe(true)
  })

  it('con los dos canales agotados el assessment deja de ser elegible', async () => {
    const result = await withRow({ recovery_count_24h: 3, secure_link_count_24h: 3 })

    expect(result?.eligible).toBe(false)
    expect(result?.rateLimit.limited).toBe(true)
  })
})
