/**
 * TASK-1772 — tests de `getHiringActiveProcessPredicateDriftSignal`.
 *
 * Lo que importa probar acá no es la query (eso lo verifica el readback contra PG real), sino la
 * ARITMÉTICA de severidad: el riesgo real de esta señal es que alarme por su propio arreglo.
 */
import { describe, expect, it, vi } from 'vitest'

const queryMock = vi.fn()

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: (...args: unknown[]) => queryMock(...args),
}))

vi.mock('@/lib/observability/capture', () => ({
  captureWithDomain: vi.fn(),
}))

import { getHiringActiveProcessPredicateDriftSignal } from './hiring-active-process-drift'

const metric = (signal: Awaited<ReturnType<typeof getHiringActiveProcessPredicateDriftSignal>>, label: string) =>
  signal.evidence.find(e => e.kind === 'metric' && e.label === label)?.value

describe('getHiringActiveProcessPredicateDriftSignal', () => {
  it('estado migrado: los dos ejes coinciden y las archivadas NO cuentan como drift', async () => {
    queryMock.mockResolvedValueOnce([{ stage_only: 90, outcome_only: 90, canonical: 58, archived_gap: 32 }])

    const signal = await getHiringActiveProcessPredicateDriftSignal()

    expect(signal.severity).toBe('ok')
    expect(metric(signal, 'drift')).toBe('0')
    expect(metric(signal, 'archived_gap')).toBe('32')
  })

  /**
   * El defecto más probable de esta señal: leer `archived_gap` como drift y quedar amarilla para
   * siempre por el cuadrante que la task introdujo A PROPÓSITO. Una señal que nace amarilla es una
   * señal que nadie vuelve a mirar.
   */
  it('un `archived_gap` grande NO sube la severidad: es evidencia, no alarma', async () => {
    queryMock.mockResolvedValueOnce([{ stage_only: 90, outcome_only: 90, canonical: 10, archived_gap: 80 }])

    expect((await getHiringActiveProcessPredicateDriftSignal()).severity).toBe('ok')
  })

  it('los dos ejes divergen → warning, y el summary nombra los dos conteos', async () => {
    queryMock.mockResolvedValueOnce([{ stage_only: 50, outcome_only: 82, canonical: 50, archived_gap: 32 }])

    const signal = await getHiringActiveProcessPredicateDriftSignal()

    expect(signal.severity).toBe('warning')
    expect(metric(signal, 'drift')).toBe('32')
    expect(signal.summary).toContain('50')
    expect(signal.summary).toContain('82')
  })

  /**
   * Incoherencia: el canónico debe ser exactamente `outcome_only - archived_gap`. Si no lo es,
   * apareció un cuadrante que el modelo de tres ejes no contempla — más grave que el drift, porque
   * significa que la definición dejó de describir la realidad.
   */
  it('incoherencia aritmética → warning aunque los dos ejes coincidan', async () => {
    queryMock.mockResolvedValueOnce([{ stage_only: 90, outcome_only: 90, canonical: 61, archived_gap: 32 }])

    const signal = await getHiringActiveProcessPredicateDriftSignal()

    expect(signal.severity).toBe('warning')
    expect(signal.summary).toContain('Incoherencia aritmética')
    expect(signal.summary).toContain('58')
  })

  it('la query falla → degrada honesto a `unknown`, nunca a `ok`', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom'))

    const signal = await getHiringActiveProcessPredicateDriftSignal()

    expect(signal.severity).toBe('unknown')
    expect(signal.observedAt).toBeNull()
  })

  it('expone el predicado canónico como evidencia, para que el operador vea qué se midió', async () => {
    queryMock.mockResolvedValueOnce([{ stage_only: 0, outcome_only: 0, canonical: 0, archived_gap: 0 }])

    const signal = await getHiringActiveProcessPredicateDriftSignal()

    expect(signal.evidence.some(e => e.value === 'app.decision IS NULL AND app.archived_at IS NULL')).toBe(true)
  })
})
