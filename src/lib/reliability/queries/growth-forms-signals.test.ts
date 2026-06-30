import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockRunGreenhousePostgresQuery = vi.fn()
const mockCountDeadLetterAttempts = vi.fn()
const mockCaptureWithDomain = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => mockRunGreenhousePostgresQuery(...args)
}))

vi.mock('@/lib/growth/forms/store', () => ({
  countDeadLetterAttempts: (...args: unknown[]) => mockCountDeadLetterAttempts(...args)
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: (...args: unknown[]) => mockCaptureWithDomain(...args)
}))

const { getGrowthFormsSignals, GROWTH_FORMS_DEAD_LETTER_SIGNAL_ID } = await import('./growth-forms-signals')

/** El segundo query del reader (submissions de la ventana de 1 día). Steady = sin submissions. */
const stubSubmissionWindow = () => {
  mockRunGreenhousePostgresQuery.mockResolvedValue([{ total: 0, failed: 0, rejected: 0 }])
}

const deadLetterSignal = (signals: Awaited<ReturnType<typeof getGrowthFormsSignals>>) =>
  signals.find(s => s.signalId === GROWTH_FORMS_DEAD_LETTER_SIGNAL_ID)

describe('getGrowthFormsSignals — dead_letter_count (SSOT)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stubSubmissionWindow()
  })

  it('deriva el conteo de dead-letters del SSOT `countDeadLetterAttempts`, no de SQL crudo', async () => {
    mockCountDeadLetterAttempts.mockResolvedValue(0)

    await getGrowthFormsSignals()

    // El reader NO debe re-inline el COUNT de dead-letters; lo toma del helper canónico.
    expect(mockCountDeadLetterAttempts).toHaveBeenCalledTimes(1)
  })

  it('steady = ok cuando no hay dead-letters vigentes (fixtures de test excluidas en el SSOT)', async () => {
    mockCountDeadLetterAttempts.mockResolvedValue(0)

    const signal = deadLetterSignal(await getGrowthFormsSignals())

    expect(signal?.severity).toBe('ok')
    expect(signal?.evidence).toContainEqual({ kind: 'metric', label: 'dead_letters', value: '0' })
  })

  it('error cuando hay un dead-letter REAL vigente (>0)', async () => {
    mockCountDeadLetterAttempts.mockResolvedValue(3)

    const signal = deadLetterSignal(await getGrowthFormsSignals())

    expect(signal?.severity).toBe('error')
    expect(signal?.evidence).toContainEqual({ kind: 'metric', label: 'dead_letters', value: '3' })
    expect(signal?.summary).toContain('intervención humana')
  })

  it('severity unknown + captura si la lectura falla (no swallow silencioso)', async () => {
    mockCountDeadLetterAttempts.mockRejectedValue(new Error('pg down'))

    const signals = await getGrowthFormsSignals()

    expect(deadLetterSignal(signals)?.severity).toBe('unknown')
    expect(mockCaptureWithDomain).toHaveBeenCalled()
  })
})
