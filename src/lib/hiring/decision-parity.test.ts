import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({ getApplication: vi.fn(), decide: vi.fn() }))

vi.mock('./store', () => ({ getHiringApplicationById: mocks.getApplication }))
vi.mock('./decide', () => ({ decideHiringApplication: mocks.decide }))

import {
  confirmHiringApplicationDecision,
  proposeHiringApplicationDecision,
  readHiringApplicationOutcome,
} from './decision-parity'

const application = (overrides: Record<string, unknown> = {}) => ({
  applicationId: 'app-1',
  openingId: 'opng-1',
  stage: 'decision_pending',
  decision: null,
  decisionCause: null,
  decisionAt: null,
  decisionBy: null,
  archivedAt: null,
  ...overrides,
})

describe('TASK-1773 — el eje de desenlace gana su carril gobernado', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getApplication.mockResolvedValue(application())
    mocks.decide.mockResolvedValue({ application: application(), decisionEntry: {}, idempotentReplay: false })
  })

  it('la lectura expone los tres ejes sin PII del candidato', async () => {
    const view = await readHiringApplicationOutcome('app-1')

    expect(view).toEqual({
      applicationId: 'app-1',
      openingId: 'opng-1',
      stage: 'decision_pending',
      decision: null,
      decisionCause: null,
      decidedAt: null,
      decidedBy: null,
      archivedAt: null,
      closed: false,
    })
  })

  it('propose LEE y no muta', async () => {
    const proposal = await proposeHiringApplicationDecision({ applicationId: 'app-1', decision: 'not_selected', cause: 'capacity_filled' })

    expect(proposal.effectDigest).toMatch(/^hdp-[a-f0-9]{24}$/)
    expect(proposal.proposed).toEqual({ decision: 'not_selected', cause: 'capacity_filled' })
    expect(mocks.decide).not.toHaveBeenCalled()
  })

  it('confirm con la huella vigente delega en el command canónico', async () => {
    const proposal = await proposeHiringApplicationDecision({ applicationId: 'app-1', decision: 'rejected' })

    await confirmHiringApplicationDecision({
      applicationId: 'app-1',
      effectDigest: proposal.effectDigest,
      input: { decision: 'rejected', reason: { summary: 'no avanza' }, idempotencyKey: 'k-1' },
      actorUserId: 'user-1',
    })

    expect(mocks.decide).toHaveBeenCalledWith('app-1', expect.objectContaining({ decision: 'rejected' }), 'user-1')
  })

  it('🔴 si otra persona decide entre propose y confirm, la confirmación FALLA en vez de pisarla', async () => {
    const proposal = await proposeHiringApplicationDecision({ applicationId: 'app-1', decision: 'rejected' })

    // El mundo cambió: alguien ya cerró la postulación.
    mocks.getApplication.mockResolvedValue(
      application({ stage: 'closed', decision: 'selected', decisionAt: '2026-08-26T00:00:00.000Z' }),
    )

    await expect(
      confirmHiringApplicationDecision({
        applicationId: 'app-1',
        effectDigest: proposal.effectDigest,
        input: { decision: 'rejected', reason: { summary: 'no avanza' }, idempotencyKey: 'k-1' },
        actorUserId: 'user-1',
      }),
    ).rejects.toMatchObject({ code: 'hiring_decision_proposal_stale' })

    expect(mocks.decide).not.toHaveBeenCalled()
  })

  it('la huella cambia si cambia el efecto propuesto, no sólo el estado', async () => {
    const a = await proposeHiringApplicationDecision({ applicationId: 'app-1', decision: 'not_selected', cause: 'capacity_filled' })
    const b = await proposeHiringApplicationDecision({ applicationId: 'app-1', decision: 'not_selected', cause: 'opening_closed' })

    expect(a.effectDigest).not.toBe(b.effectDigest)
  })

  it('no reimplementa las reglas de decisión: la causa inválida la rechaza el command, no este módulo', async () => {
    // `propose` acepta el par y calcula su huella; validar que la causa corresponda al desenlace es
    // responsabilidad de `decideHiringApplication`, donde la comparten TODOS los consumers.
    const proposal = await proposeHiringApplicationDecision({ applicationId: 'app-1', decision: 'selected', cause: 'capacity_filled' })

    expect(proposal.effectDigest).toBeTruthy()
    expect(mocks.decide).not.toHaveBeenCalled()
  })
})
