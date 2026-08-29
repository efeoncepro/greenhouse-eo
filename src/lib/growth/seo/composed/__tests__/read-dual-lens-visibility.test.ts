/**
 * TASK-1785 — La lectura compuesta, y sobre todo lo que NO tiene.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../../flags', () => ({ isSeoModuleEnabled: () => true }))
vi.mock('../../resolve-target', () => ({
  resolveUnambiguousSeoTarget: vi.fn(async () => ({ target: { seoTargetId: 'seot-1' } }))
}))
vi.mock('../../performance/read-performance', () => ({
  readSeoPerformance: vi.fn(async () => ({
    ok: true,
    organizationId: 'org-1',
    seoTargetId: null,
    mode: 'keyword',
    metric: 'position',
    device: 'desktop',
    range: { from: '2026-06-01', to: '2026-08-28', days: 90 },
    source: 'gsc_measured',
    series: [{ item: 'agencia', points: [{ date: '2026-08-28', value: 9.4 }], sparse: false }],
    standings: [],
    summary: { current: { clicks: 0, impressions: 0, position: null, ctr: null }, previous: null, series: [] },
    itemsWithoutData: ['marketing'],
    provenance: []
  }))
}))
vi.mock('../../rank-evolution-reader', () => ({
  readRankEvolution: vi.fn(async () => ({
    ok: true,
    seoTargetId: 'seot-1',
    organizationId: 'org-1',
    engine: 'google',
    device: 'desktop',
    range: { from: '2026-08-01', to: '2026-08-28', days: 28 },
    source: 'postgres',
    series: [{ keyword: 'agencia', points: [{ date: '2026-08-28', position: 7 }] }],
    provenance: []
  }))
}))

const { readDualLensVisibility } = await import('../read-dual-lens-visibility')

describe('readDualLensVisibility', () => {
  it('NO expone ningun campo combinado, promediado ni consolidado', async () => {
    const result = await readDualLensVisibility({ organizationId: 'org-1', keywords: ['agencia'] })

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // El punto entero de la task: componer es PRESENTAR LAS DOS, jamas fusionarlas. Si alguien
    // agrega un consolidado "porque un consumer lo pidio", esto se pone rojo y lo manda a
    // escribir la ADR que esa decision exige.
    const forbidden = /combin|consolidat|blend|average|promedio|merged|overall|unified|total/i
    const offending = Object.keys(result).filter(key => forbidden.test(key))

    expect(offending).toEqual([])
  })

  it('devuelve las dos series separadas, cada una con su lente y su as-of', async () => {
    const result = await readDualLensVisibility({ organizationId: 'org-1', keywords: ['agencia'] })

    if (!result.ok) throw new Error('esperaba ok')

    expect(result.measured.provenance.lens).toBe('measured')
    expect(result.measured.provenance.source).toBe('gsc')
    expect(result.measured.provenance.capturedAt).toBe('2026-08-28')

    expect(result.estimated.provenance.lens).toBe('estimated')
    expect(result.estimated.provenance.source).toBe('dataforseo_serp')

    // Misma keyword, dos posiciones distintas, y ninguna se convierte en la otra.
    expect(result.measured.series[0].points[0].position).toBe(9.4)
    expect(result.estimated.series[0].points[0].position).toBe(7)
  })

  it('declara la ventana de CADA lente por separado: pueden diferir y decirlo importa', async () => {
    const result = await readDualLensVisibility({ organizationId: 'org-1', keywords: ['agencia'] })

    if (!result.ok) throw new Error('esperaba ok')

    expect(result.measured.range?.days).toBe(90)
    expect(result.estimated.range?.days).toBe(28)
  })

  it('nombra las keywords sin dato en lugar de omitirlas', async () => {
    const result = await readDualLensVisibility({ organizationId: 'org-1', keywords: ['agencia', 'marketing'] })

    if (!result.ok) throw new Error('esperaba ok')

    expect(result.measured.keywordsWithoutData).toContain('marketing')
    expect(result.estimated.keywordsWithoutData).toContain('marketing')
  })

  it('pide la posicion MEDIDA explicitamente, sin dejar que el fallback elija por ella', async () => {
    const { readSeoPerformance } = await import('../../performance/read-performance')

    await readDualLensVisibility({ organizationId: 'org-1', keywords: ['agencia'] })

    expect(vi.mocked(readSeoPerformance).mock.calls[0][1]).toMatchObject({ pinnedLens: 'measured' })
  })

  it('respeta el target que el caller ya resolvio, sin re-resolverlo', async () => {
    // ISSUE-153: el lane resuelve el mercado con el selector `?market=`. Re-resolver aca
    // descartaria esa eleccion y una org con dos mercados perderia la lente estimada pese a
    // haber elegido bien.
    const { resolveUnambiguousSeoTarget } = await import('../../resolve-target')

    vi.mocked(resolveUnambiguousSeoTarget).mockClear()

    const result = await readDualLensVisibility({
      organizationId: 'org-1',
      keywords: ['agencia'],
      seoTargetId: 'seot-mx-elegido'
    })

    if (!result.ok) throw new Error('esperaba ok')

    expect(result.seoTargetId).toBe('seot-mx-elegido')
    expect(vi.mocked(resolveUnambiguousSeoTarget)).not.toHaveBeenCalled()
  })

  it('con el target explicito en null declara la lente estimada indisponible, sin adivinar', async () => {
    const result = await readDualLensVisibility({
      organizationId: 'org-1',
      keywords: ['agencia'],
      seoTargetId: null
    })

    if (!result.ok) throw new Error('esperaba ok')

    expect(result.estimated.unavailable).toEqual({ reason: 'target_not_resolved' })
    // Y la lente medida sigue sirviendose: que falte el mercado no invalida lo que GSC midio.
    expect(result.measured.unavailable).toBeNull()
    expect(result.measured.series).toHaveLength(1)
  })

  it('sin keywords es un estado, no un error inventado', async () => {
    const result = await readDualLensVisibility({ organizationId: 'org-1', keywords: [] })

    expect(result).toEqual({ ok: false, errorCode: 'no_keywords', status: null })
  })
})
