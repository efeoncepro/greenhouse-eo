import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

/**
 * TASK-1751 follow-up — el item del run SIGUE al puntaje, por cualquiera de las dos puertas.
 *
 * Caso fuente 2026-08-19: cinco respuestas de una candidata real quedaron puntuadas (`human_score`
 * escrito, `needs_human_rating = false`) con su item del run todavía en `proposed`. La cobertura
 * decía "5 de 10 sin resolver" sobre trabajo YA hecho, y el run quedaba incerrable para siempre.
 *
 * La causa no era el run: era que `confirmAiProposal` —el ÚNICO punto donde una proposal se vuelve
 * puntaje humano— se alcanza por DOS puertas (la cola del run y el confirm individual por
 * respuesta) y sólo la primera movía el item. Arreglarlo en cada puerta es lo que ya se intentó;
 * la puerta siguiente vuelve a olvidarlo. Estos tests fijan el invariante en el punto único.
 */

const withTransactionMock = vi.fn()
const publishOutboxEventMock = vi.fn()
const lockAiProposalForUpdateMock = vi.fn()
const markProposalDecidedMock = vi.fn()
const recordHumanScoreMock = vi.fn()
const findRunItemByProposalIdMock = vi.fn()
const transitionRunItemMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  withGreenhousePostgresTransaction: (...args: unknown[]) => withTransactionMock(...args),
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: (...args: unknown[]) => publishOutboxEventMock(...args),
}))

vi.mock('./proposal-store', () => ({
  lockAiProposalForUpdate: (...args: unknown[]) => lockAiProposalForUpdateMock(...args),
  markProposalDecided: (...args: unknown[]) => markProposalDecidedMock(...args),
}))

vi.mock('../scoring', () => ({
  recordHumanScore: (...args: unknown[]) => recordHumanScoreMock(...args),
}))

vi.mock('../store', () => ({ createQuestion: vi.fn() }))
vi.mock('../../vacancy-ai/apply', () => ({ applyOpeningPublicCopy: vi.fn() }))

vi.mock('./scoring-run/store', () => ({
  findRunItemByProposalId: (...args: unknown[]) => findRunItemByProposalIdMock(...args),
  transitionRunItem: (...args: unknown[]) => transitionRunItemMock(...args),
}))

const { confirmAiProposal } = await import('./confirm')

const fakeClient = { query: vi.fn() }

const proposalFixture = (over: Record<string, unknown> = {}) => ({
  proposalId: 'aiprop-1',
  kind: 'response_score' as const,
  targetRef: 'resp-1',
  proposed: { score: 72 },
  status: 'proposed' as const,
  ...over,
})

const runItemFixture = (over: Record<string, unknown> = {}) => ({
  runItemId: 'asri-1',
  runId: 'asrun-1',
  responseId: 'resp-1',
  proposalId: 'aiprop-1',
  status: 'proposed' as const,
  riskClass: 'mandatory_review' as const,
  ...over,
})

beforeEach(() => {
  vi.clearAllMocks()
  withTransactionMock.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) => cb(fakeClient))
  markProposalDecidedMock.mockImplementation(async () => proposalFixture({ status: 'confirmed' }))
  recordHumanScoreMock.mockResolvedValue('resp-1')
  transitionRunItemMock.mockImplementation(async (_c: unknown, item: unknown) => item)
})

describe('confirmAiProposal — reconciliación del item del run', () => {
  it('confirmar un puntaje mueve su item del run en la MISMA transacción', async () => {
    lockAiProposalForUpdateMock.mockResolvedValue(proposalFixture())
    findRunItemByProposalIdMock.mockResolvedValue(runItemFixture())

    await confirmAiProposal({ proposalId: 'aiprop-1', decision: 'confirm' }, 'user-9')

    expect(transitionRunItemMock).toHaveBeenCalledWith(
      fakeClient,
      expect.objectContaining({ runItemId: 'asri-1' }),
      'confirmed',
      expect.objectContaining({ reasonCode: 'scored_via_proposal_confirm', actorUserId: 'user-9' }),
    )
  })

  it('re-confirmar una proposal YA confirmada SANA el item que quedó atrás', async () => {
    // Este es el estado exacto de las 5 respuestas de la candidata: puntaje escrito, item colgado.
    lockAiProposalForUpdateMock.mockResolvedValue(proposalFixture({ status: 'confirmed' }))
    findRunItemByProposalIdMock.mockResolvedValue(runItemFixture())

    await confirmAiProposal({ proposalId: 'aiprop-1', decision: 'confirm' }, 'user-9')

    expect(transitionRunItemMock).toHaveBeenCalled()
    // Idempotente sobre el puntaje: sanar el run NUNCA reescribe la calificación.
    expect(recordHumanScoreMock).not.toHaveBeenCalled()
  })

  it('un item ya confirmado no se vuelve a transicionar', async () => {
    lockAiProposalForUpdateMock.mockResolvedValue(proposalFixture({ status: 'confirmed' }))
    findRunItemByProposalIdMock.mockResolvedValue(runItemFixture({ status: 'confirmed' }))

    await confirmAiProposal({ proposalId: 'aiprop-1', decision: 'confirm' }, 'user-9')

    expect(transitionRunItemMock).not.toHaveBeenCalled()
  })

  it('una proposal sin item de run (confirm suelto legítimo) no rompe nada', async () => {
    lockAiProposalForUpdateMock.mockResolvedValue(proposalFixture())
    findRunItemByProposalIdMock.mockResolvedValue(null)

    await expect(
      confirmAiProposal({ proposalId: 'aiprop-1', decision: 'confirm' }, 'user-9'),
    ).resolves.toBeDefined()

    expect(transitionRunItemMock).not.toHaveBeenCalled()
  })

  it('rechazar una proposal NO toca el item del run', async () => {
    lockAiProposalForUpdateMock.mockResolvedValue(proposalFixture())
    findRunItemByProposalIdMock.mockResolvedValue(runItemFixture())

    await confirmAiProposal({ proposalId: 'aiprop-1', decision: 'reject' }, 'user-9')

    expect(transitionRunItemMock).not.toHaveBeenCalled()
  })
})
