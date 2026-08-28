import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1696 — La lógica que decide QUÉ severidad tiene cada causa.
 *
 * El SQL de las tres señales se ejercita contra PostgreSQL real en
 * `scripts/growth/_sanity-task-1696-signals.ts` (un mock no prueba que la query corra). Acá se
 * prueba lo que el SQL no puede probar: que las dos causas del drift NO se traten igual, y que el
 * rendimiento corte por proveedor en vez de esconderse en el promedio.
 */

let rows: unknown[] = []

vi.mock('@/lib/db', () => ({
  query: async () => rows
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const { getGrowthDataForSeoSpendLedgerDriftSignal } = await import(
  './growth-dataforseo-spend-ledger-drift'
)

const { getGrowthAiVisibilityObservationYieldSignal } = await import(
  './growth-ai-visibility-observation-yield'
)

beforeEach(() => {
  rows = []
})

describe('growth.dataforseo.spend_ledger_drift (TASK-1696)', () => {
  it('todo contabilizado → ok', async () => {
    rows = [{ attributable_observations: 5, unattributable_observations: 0, ledger_calls: 5 }]

    const signal = await getGrowthDataForSeoSpendLedgerDriftSignal()

    expect(signal.severity).toBe('ok')
  })

  it('gasto de perfiles públicos → warning, no error: es una ausencia LEGÍTIMA', async () => {
    rows = [{ attributable_observations: 0, unattributable_observations: 12, ledger_calls: 0 }]

    const signal = await getGrowthDataForSeoSpendLedgerDriftSignal()

    // El ledger tiene FK a organizations: para un prospecto público no hay fila posible. Tratarlo
    // como error entrenaría al operador a ignorar la señal justo cuando sí importe.
    expect(signal.severity).toBe('warning')
  })

  it('gasto de perfiles CON organización sin contabilizar → error: es un bug de atribución', async () => {
    rows = [{ attributable_observations: 9, unattributable_observations: 0, ledger_calls: 4 }]

    const signal = await getGrowthDataForSeoSpendLedgerDriftSignal()

    // Se le está gastando plata a un cliente sin cargarla a su presupuesto.
    expect(signal.severity).toBe('error')
    expect(signal.evidence?.find(item => item.label === 'drift_atribuible')?.value).toBe('5')
  })

  it('el error gana al warning cuando hay de las dos causas', async () => {
    rows = [{ attributable_observations: 9, unattributable_observations: 3, ledger_calls: 4 }]

    expect((await getGrowthDataForSeoSpendLedgerDriftSignal()).severity).toBe('error')
  })

  it('más llamadas en el ledger que observaciones NO es drift negativo', async () => {
    rows = [{ attributable_observations: 2, unattributable_observations: 0, ledger_calls: 7 }]

    const signal = await getGrowthDataForSeoSpendLedgerDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(signal.evidence?.find(item => item.label === 'drift_atribuible')?.value).toBe('0')
  })
})

describe('growth.ai_visibility.observation_yield (TASK-1696)', () => {
  it('un proveedor hundido alerta aunque el agregado se vea sano', async () => {
    // Éste es el caso real que motivó el corte por proveedor: 68% global con AI Mode en 29%.
    rows = [
      { provider: 'openai', total: 100, succeeded: 95 },
      { provider: 'google_ai_overview', total: 100, succeeded: 29 }
    ]

    const signal = await getGrowthAiVisibilityObservationYieldSignal()

    expect(signal.severity).toBe('error')
    expect(signal.summary).toContain('google_ai_overview')
  })

  it('sin observaciones en la ventana reporta unknown, no 0%', async () => {
    rows = []

    const signal = await getGrowthAiVisibilityObservationYieldSignal()

    // "No se intentó" no es "salió mal". Confundirlos genera falsos positivos que apagan el hábito
    // de mirar el tablero.
    expect(signal.severity).toBe('unknown')
    expect(signal.summary).toContain('no hay rendimiento que medir')
  })

  it('todos sobre el umbral → ok', async () => {
    rows = [
      { provider: 'openai', total: 50, succeeded: 48 },
      { provider: 'gemini', total: 40, succeeded: 35 }
    ]

    expect((await getGrowthAiVisibilityObservationYieldSignal()).severity).toBe('ok')
  })
})
