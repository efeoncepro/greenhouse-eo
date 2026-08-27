import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({ can: vi.fn(), propose: vi.fn(), confirm: vi.fn(), flag: vi.fn() }))

vi.mock('@/lib/entitlements/runtime', () => ({ can: mocks.can }))
vi.mock('@/lib/hiring', () => ({
  proposeHiringApplicationDecision: mocks.propose,
  confirmHiringApplicationDecision: mocks.confirm
}))
vi.mock('../flags', () => ({ isNexaHiringActionsEnabled: mocks.flag }))

import { isNexaActionBlockedError } from './blocked-error'
import { decideHiringApplicationAction } from './hiring-decision'

const context = (overrides: Record<string, unknown> = {}) =>
  ({ userId: 'user-1', clientId: null, tenantType: 'efeonce_internal', roleCodes: ['hr_manager'], routeGroups: ['hr'], ...overrides }) as never

const input = { applicationId: 'app-1', decision: 'rejected', cause: null, reasonSummary: 'no avanza' }

describe('TASK-1773 — Nexa cierra una postulación con autoridad más angosta que el portal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.flag.mockReturnValue(true)
    mocks.can.mockReturnValue(true)
    mocks.propose.mockResolvedValue({ applicationId: 'app-1', effectDigest: 'hdp-x', alreadyClosed: false, current: { stage: 'decision_pending' } })
    mocks.confirm.mockResolvedValue({ idempotentReplay: false })
  })

  it('nace apagada: bajo el AI Act la selección es alto riesgo', () => {
    mocks.flag.mockReturnValue(false)
    expect(decideHiringApplicationAction.isEnabled()).toBe(false)
  })

  it('usa la capability real del dominio, no una paralela', () => {
    decideHiringApplicationAction.isPermitted(context())
    expect(mocks.can).toHaveBeenCalledWith(expect.anything(), 'hiring.application.decide', 'execute', 'tenant')
  })

  it('un tenant cliente nunca decide', () => {
    expect(decideHiringApplicationAction.isPermitted(context({ tenantType: 'client' }))).toBe(false)
  })

  it('el preview NO muta', async () => {
    await decideHiringApplicationAction.buildPreview(context(), input as never)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('🔴 se niega a RE-DECIDIR: cambiar un desenlace ya declarado es humano', async () => {
    mocks.propose.mockResolvedValue({ applicationId: 'app-1', effectDigest: 'hdp-x', alreadyClosed: true, current: { stage: 'closed' } })

    await expect(decideHiringApplicationAction.buildPreview(context(), input as never)).rejects.toSatisfy(isNexaActionBlockedError)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('🔴 si alguien decide ENTRE el preview y el confirm, el execute bloquea', async () => {
    // El contrato de Nexa no puede cargar la huella del preview al execute, así que el execute
    // RE-PROPONE en el punto de mutación. Es lo que reemplaza al digest en este carril.
    await decideHiringApplicationAction.buildPreview(context(), input as never)

    mocks.propose.mockResolvedValue({ applicationId: 'app-1', effectDigest: 'hdp-y', alreadyClosed: true, current: { stage: 'closed' } })

    await expect(decideHiringApplicationAction.execute(context(), input as never)).rejects.toSatisfy(isNexaActionBlockedError)
    expect(mocks.confirm).not.toHaveBeenCalled()
  })

  it('el camino feliz delega en el primitive con el actor de la sesión', async () => {
    await decideHiringApplicationAction.execute(context(), input as never)

    expect(mocks.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: 'app-1', effectDigest: 'hdp-x', actorUserId: 'user-1' })
    )
  })
})
