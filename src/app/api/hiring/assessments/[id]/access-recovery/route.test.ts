import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AccessRecoveryModule from '@/lib/hiring/assessment/access-recovery'
import { HiringValidationError } from '@/lib/hiring/errors'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  tenant: vi.fn(),
  can: vi.fn(),
  availability: vi.fn(),
  secureLink: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getServerAuthSession: mocks.session }))
vi.mock('@/lib/tenant/authorization', () => ({ requireInternalTenantContext: mocks.tenant }))
vi.mock('@/lib/entitlements/runtime', () => ({ can: mocks.can }))
vi.mock('@/lib/hiring/assessment/access-recovery', async importOriginal => {
  const actual = await importOriginal<typeof AccessRecoveryModule>()

  return {
    ...actual,
    getAssessmentAccessRecoveryAvailability: mocks.availability,
    recoverCandidateTestAccess: mocks.secureLink,
  }
})

const { GET, POST } = await import('./route')

const assessmentId = 'asmt-11111111-1111-4111-8111-111111111111'
const applicationId = 'happ-11111111-1111-4111-8111-111111111111'

const tenant = {
  userId: 'user-human',
  authMode: 'microsoft_sso',
  tenantType: 'efeonce_internal',
  roleCodes: [],
  primaryRoleCode: 'hr_manager',
  routeGroups: ['internal'],
  authorizedViews: [],
  projectScopes: [],
  campaignScopes: [],
  businessLines: [],
  serviceModules: [],
  portalHomePath: '/',
}

const receipt = {
  recoveryId: 'harc-1', assessmentId, applicationId, openingId: 'hopn-1',
  channel: 'secure_link', reasonCode: 'alternate_channel_requested', previousStatus: 'sent',
  resultingStatus: 'sent', tokenVersionId: 'poisoned-version-sentinel',
  issuedAt: '2026-08-19T12:00:00.000Z', expiresAt: '2026-08-20T12:00:00.000Z',
  outcome: 'link_issued', deliveryId: null,
}

const request = (body: unknown = {
  applicationId,
  channel: 'secure_link',
  reasonCode: 'alternate_channel_requested',
}, headers: Record<string, string> = {}) => new Request(
  `https://greenhouse.example/api/hiring/assessments/${assessmentId}/access-recovery`,
  {
    method: 'POST',
    headers: {
      origin: 'https://greenhouse.example',
      'content-type': 'application/json',
      'x-idempotency-key': 'operator-double-click-0001',
      ...headers,
    },
    body: JSON.stringify(body),
  },
)

const context = { params: Promise.resolve({ id: assessmentId }) }

describe('POST hiring assessment access recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.session.mockResolvedValue({ user: { provider: 'microsoft_sso', authMode: 'microsoft_sso' } })
    mocks.tenant.mockResolvedValue({ tenant, errorResponse: null })
    mocks.can.mockReturnValue(true)
    mocks.availability.mockResolvedValue({ assessmentId, applicationId })
    mocks.secureLink.mockResolvedValue({
      receipt,
      replayed: false,
      linkRevealed: true,
      accessUrl: 'https://greenhouse.example/public/assessment/access#access=poisoned-bearer-sentinel',
    })
  })

  it('rechaza sesiones agent/app/service/unknown antes de lookup', async () => {
    for (const [provider, authMode] of [
      ['agent', 'agent'],
      ['app', 'credentials'],
      ['service', 'microsoft_sso'],
      ['poisoned-unknown', 'credentials'],
      ['azure-ad', 'microsoft_sso'],
      ['google', 'google_sso'],
      ['', 'unknown'],
    ]) {
      mocks.session.mockResolvedValueOnce({ user: { provider, authMode } })
      const response = await POST(request(), context)

      expect(response.status).toBe(403)
    }

    expect(mocks.availability).not.toHaveBeenCalled()
  })

  it('acepta sólo los pares provider/authMode humanos finales de la sesión', async () => {
    for (const [provider, authMode] of [
      ['credentials', 'credentials'],
      ['microsoft_sso', 'microsoft_sso'],
      ['google_sso', 'google_sso'],
    ]) {
      mocks.session.mockResolvedValueOnce({ user: { provider, authMode } })
      const response = await POST(request(), context)

      expect(response.status).toBe(201)
    }
  })

  it('evalúa reads y capability del canal antes de cualquier lookup', async () => {
    mocks.can.mockReturnValueOnce(true).mockReturnValueOnce(false)

    const response = await POST(request(), context)

    expect(response.status).toBe(403)
    expect(mocks.availability).not.toHaveBeenCalled()
    expect(mocks.secureLink).not.toHaveBeenCalled()
  })

  it('elige una capability distinta por canal', async () => {
    mocks.can.mockImplementation((_tenant: unknown, capability: string) =>
      capability !== 'hiring.assessment.recover_access_email')

    const response = await POST(request({
      applicationId,
      channel: 'email',
      reasonCode: 'candidate_reports_email_not_received',
    }), context)

    expect(response.status).toBe(403)
    expect(mocks.can).toHaveBeenCalledWith(
      tenant,
      'hiring.assessment.recover_access_email',
      'execute',
      'tenant',
    )
    expect(mocks.availability).not.toHaveBeenCalled()
  })

  it('un assessment de otra application responde 404 y no ejecuta command', async () => {
    mocks.availability.mockResolvedValue({ assessmentId, applicationId: 'happ-other' })

    const response = await POST(request(), context)

    expect(response.status).toBe(404)
    expect(mocks.secureLink).not.toHaveBeenCalled()
  })

  it('exige Origin, JSON exacto e idempotencia acotada', async () => {
    expect((await POST(request(undefined, { origin: 'https://evil.example' }), context)).status).toBe(403)
    expect((await POST(request({
      applicationId,
      channel: 'secure_link',
      reasonCode: 'alternate_channel_requested',
      poisoned: true,
    }), context)).status).toBe(400)
    expect((await POST(request(undefined, { 'x-idempotency-key': 'short' }), context)).status).toBe(400)
    expect((await POST(request({
      applicationId,
      channel: 'secure_link',
      reasonCode: 'not-a-governed-reason',
    }), context)).status).toBe(400)
    expect(mocks.availability).not.toHaveBeenCalled()
  })

  it('normaliza el rate limit con Retry-After sin filtrar el estado', async () => {
    mocks.secureLink.mockRejectedValue(new HiringValidationError(
      'internal rate evidence',
      'assessment_recovery_daily_limit',
      429,
    ))

    const response = await POST(request(), context)

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('60')
    await expect(response.json()).resolves.toEqual({ ok: false, code: 'rate_limited' })
  })

  it('expone el link una vez pero nunca serializa versión/hash interno', async () => {
    const response = await POST(request(), context)
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload.accessUrl).toContain('#access=poisoned-bearer-sentinel')
    expect(JSON.stringify(payload)).not.toContain('poisoned-version-sentinel')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')

    mocks.secureLink.mockResolvedValueOnce({ receipt, replayed: true, linkRevealed: false })
    const replay = await POST(request(), context)
    const replayPayload = await replay.json()

    expect(replay.status).toBe(200)
    expect(replayPayload).not.toHaveProperty('accessUrl')
  })

  it('mantiene el bloqueo del proveedor limitado al canal email', async () => {
    mocks.secureLink.mockRejectedValueOnce(new HiringValidationError(
      'provider detail must not surface',
      'assessment_recovery_email_provider_blocked',
      409,
      { providerStatus: 'complained' },
    ))

    const email = await POST(request({
      applicationId,
      channel: 'email',
      reasonCode: 'candidate_reports_email_not_received',
    }), context)

    expect(email.status).toBe(409)
    await expect(email.json()).resolves.toEqual({
      ok: false,
      code: 'assessment_recovery_email_provider_blocked',
    })

    mocks.secureLink.mockResolvedValueOnce({
      receipt,
      replayed: false,
      linkRevealed: true,
      accessUrl: 'https://greenhouse.example/public/assessment/access#access=manual-still-available',
    })
    const manual = await POST(request(), context)

    expect(manual.status).toBe(201)
  })
})

/**
 * TASK-1747 — la lectura de disponibilidad es un CONTRATO, no un privilegio de Application 360.
 * Sin ella, cualquier otro consumidor gobernado tendría que ejecutar el command para averiguar si
 * podía ejecutarlo.
 */
describe('GET /api/hiring/assessments/[id]/access-recovery', () => {
  const params = Promise.resolve({ id: assessmentId })

  const url = (query = `applicationId=${applicationId}`) =>
    new Request(`https://greenhouse.test/api/hiring/assessments/${assessmentId}/access-recovery?${query}`)

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.tenant.mockResolvedValue({ tenant })
    mocks.can.mockReturnValue(true)
    mocks.availability.mockResolvedValue({ assessmentId, applicationId, eligible: true })
  })

  it('responde la disponibilidad junto con las DOS puertas por separado', async () => {
    mocks.can.mockImplementation((_t: unknown, capability: string) => capability !== 'hiring.assessment.reveal_access_link')

    const response = await GET(url(), { params })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.canRecoverByEmail).toBe(true)
    // Colapsar las dos puertas en un booleano dejaría revelar enlaces a quien sólo puede reenviar.
    expect(body.canRevealSecureLink).toBe(false)
  })

  it('NO ejecuta el command: leer disponibilidad nunca emite credencial ni consume cuota', async () => {
    await GET(url(), { params })

    expect(mocks.secureLink).not.toHaveBeenCalled()
  })

  /**
   * `hiring.assessment.read` la porta TODO tenant interno vía el routeGroup `internal`
   * (collaborator, designer, people_viewer incluidos), y el payload declara si la persona retiró su
   * consentimiento, si su candidatura ya tiene decisión antes de comunicársela, y si su correo
   * rebotó o nos marcó como spam. Las dos capabilities de recuperación son role-only por eso mismo.
   */
  it('leer exige al menos una capability de recuperación, no sólo las de lectura', async () => {
    mocks.can.mockImplementation((_t: unknown, capability: string) =>
      capability === 'hiring.assessment.read' || capability === 'hiring.application.read')

    const response = await GET(url(), { params })

    expect(response.status).toBe(403)
    expect(mocks.availability).not.toHaveBeenCalled()
  })

  it('sin applicationId no responde: un assessmentId suelto sondearía a cualquier candidato', async () => {
    const response = await GET(url(''), { params })

    expect(response.status).toBe(400)
    expect(mocks.availability).not.toHaveBeenCalled()
  })

  it('un assessment de OTRA postulación se responde como inexistente', async () => {
    mocks.availability.mockResolvedValue({ assessmentId, applicationId: 'happ-otra', eligible: true })

    const response = await GET(url(), { params })

    expect(response.status).toBe(404)
  })

  it('un motivo inválido se rechaza en vez de resolverse al default en silencio', async () => {
    const response = await GET(url(`applicationId=${applicationId}&reason=motivo_inventado`), { params })

    expect(response.status).toBe(400)
    expect(mocks.availability).not.toHaveBeenCalled()
  })

  it('el motivo declarado llega al reader: la elegibilidad de un test vencido depende de él', async () => {
    await GET(url(`applicationId=${applicationId}&reason=token_expired_before_start`), { params })

    expect(mocks.availability).toHaveBeenCalledWith(assessmentId, 'token_expired_before_start')
  })

  it('todo error trae prosa es-CL y declara si reintentar sirve', async () => {
    mocks.can.mockReturnValue(false)

    const body = await (await GET(url(), { params })).json()

    expect(body.error).toMatch(/permiso/i)
    // Sin `actionable`, el cliente asume que reintentar sirve — incluso ante un permiso que falta.
    expect(body.actionable).toBe(false)
  })
})
