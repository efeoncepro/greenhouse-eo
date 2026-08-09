import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1307 Slice 1 — `readSeoPerformance`: regla de fuente por (modo × métrica), huecos
 * como `null` (nunca 0/interpolación), Δ30d con signo real, CTR nulo sin impresiones y
 * degradación honesta de los ítems sin dato.
 */

vi.mock('server-only', () => ({}))

interface GscRow extends Record<string, unknown> {
  item: string
  date: string
  clicks: number
  impressions: number
  weighted_position: number | null
}

const state = {
  anchor: '2026-08-06' as string | null,
  gscRows: [] as GscRow[],
  gscSql: '',
  gscParams: [] as unknown[],
  target: { seo_target_id: 'seot-1' } as Record<string, unknown> | null
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('MAX(capture_date)')) {
      return [{ anchor: state.anchor }]
    }

    if (sql.includes('FROM greenhouse_growth.seo_targets')) {
      return state.target ? [state.target] : []
    }

    state.gscSql = sql
    state.gscParams = params

    return state.gscRows
  }
}))

const rankEvolutionMock = vi.fn()

vi.mock('../../rank-evolution-reader', () => ({
  readRankEvolution: (...args: unknown[]) => rankEvolutionMock(...args)
}))

vi.mock('../../flags', () => ({ isSeoModuleEnabled: () => true }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { readSeoPerformance, resolveDeltaReference, resolveSeoPerformanceSource } from '../read-performance'

const gscRow = (
  item: string,
  date: string,
  clicks: number,
  impressions: number,
  weighted_position: number | null
): GscRow => ({ item, date, clicks, impressions, weighted_position })

beforeEach(() => {
  state.anchor = '2026-08-06'
  state.target = { seo_target_id: 'seot-1' }
  state.gscRows = []
  rankEvolutionMock.mockReset()
  rankEvolutionMock.mockResolvedValue({ ok: false, errorCode: 'no_data', status: null })
})

describe('resolveSeoPerformanceSource', () => {
  it('sirve la posición por keyword desde DataForSEO y todo lo demás desde GSC', () => {
    // La regla completa, en una sola tabla: es el contrato de honestidad §5 y no puede
    // depender de que cada callsite la recuerde.
    expect(resolveSeoPerformanceSource('keyword', 'position')).toBe('dataforseo_estimated')
    expect(resolveSeoPerformanceSource('keyword', 'clicks')).toBe('gsc_measured')
    expect(resolveSeoPerformanceSource('keyword', 'impressions')).toBe('gsc_measured')
    expect(resolveSeoPerformanceSource('keyword', 'ctr')).toBe('gsc_measured')
    // En modo URL no hay posición exacta de DataForSEO: una página no es una keyword.
    expect(resolveSeoPerformanceSource('url', 'position')).toBe('gsc_measured')
    expect(resolveSeoPerformanceSource('url', 'clicks')).toBe('gsc_measured')
  })
})

describe('resolveDeltaReference', () => {
  const point = (date: string, value: number) => ({ date, value })

  it('elige el punto más cercano al lookback, no el primero de la ventana', () => {
    const measured = [point('2026-05-08', 20), point('2026-07-07', 9), point('2026-08-06', 4)]

    // Con 90 días de ventana, el primero está a 90 días: usarlo rompería la promesa
    // "Δ 30 días" del copy. El correcto es el de 2026-07-07 (30 días atrás).
    expect(resolveDeltaReference(measured, 30)?.date).toBe('2026-07-07')
  })

  it('devuelve null con una sola medición — no hay contra qué comparar', () => {
    expect(resolveDeltaReference([point('2026-08-06', 4)], 30)).toBeNull()
    expect(resolveDeltaReference([], 30)).toBeNull()
  })
})

describe('readSeoPerformance', () => {
  it('sin ítems devuelve no_items (estado inicial legítimo, no una falla)', async () => {
    const result = await readSeoPerformance('org-1', { items: [] })

    expect(result).toEqual({ ok: false, errorCode: 'no_items', status: null })
  })

  it('sin ningún día materializado degrada a not_connected, no a no_data', async () => {
    state.anchor = null

    const result = await readSeoPerformance('org-1', { items: ['pintura'] })

    // La distinción importa: `not_connected` lleva a conectar/esperar la captura;
    // `no_data` haría creer que el problema es el set elegido.
    expect(result).toEqual({ ok: false, errorCode: 'not_connected', status: null })
  })

  it('modo keyword + posición sirve la serie de DataForSEO y preserva los huecos', async () => {
    rankEvolutionMock.mockResolvedValue({
      ok: true,
      seoTargetId: 'seot-1',
      organizationId: 'org-1',
      engine: 'google',
      device: 'desktop',
      range: { from: '2026-05-09', to: '2026-08-06', days: 90 },
      source: 'postgres',
      series: [
        {
          keyword: 'pintura',
          points: [
            { date: '2026-07-07', position: 9, url: null },
            // El día sin ranking viaja como null y tiene que SEGUIR siendo null.
            { date: '2026-07-08', position: null, url: null },
            { date: '2026-08-06', position: 4, url: null }
          ]
        }
      ]
    })

    state.gscRows = [gscRow('pintura', '2026-08-06', 12, 400, 4.2)]

    const result = await readSeoPerformance('org-1', { mode: 'keyword', metric: 'position', items: ['pintura'] })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.source).toBe('dataforseo_estimated')
    expect(result.series[0].points.map(point => point.value)).toEqual([9, null, 4])
    // Δ = actual − referencia = 4 − 9 = −5: negativo porque MEJORÓ. El signo es el real.
    expect(result.standings[0].positionDelta30d).toBe(-5)
    expect(result.standings[0].position).toBe(4)
    // El volumen viene de GSC aunque la posición venga de DataForSEO: son columnas
    // distintas de la misma fila, nunca un promedio entre fuentes.
    expect(result.standings[0].clicks).toBe(12)
    expect(result.standings[0].impressions).toBe(400)
  })

  it('cae a la posición medida de GSC cuando la serie exacta es más joven que la medida', async () => {
    // El caso real del 2026-08-07: rank capture con 2 días vs GSC con 5. Servir la serie
    // de 2 días escondería historia que el módulo SÍ tiene ("si no vienen de uno, vienen
    // del otro"). La lectura completa cambia de fuente y lo declara — nunca se promedian.
    rankEvolutionMock.mockResolvedValue({
      ok: true,
      seoTargetId: 'seot-1',
      organizationId: 'org-1',
      engine: 'google',
      device: 'desktop',
      range: { from: '2026-08-05', to: '2026-08-06', days: 90 },
      source: 'postgres',
      series: [
        {
          keyword: 'pintura',
          points: [
            { date: '2026-08-05', position: 1, url: null },
            { date: '2026-08-06', position: 1, url: null }
          ]
        }
      ]
    })

    state.gscRows = [
      gscRow('pintura', '2026-08-01', 3, 100, 5),
      gscRow('pintura', '2026-08-02', 4, 120, 4.6),
      gscRow('pintura', '2026-08-03', 2, 90, 4.9),
      gscRow('pintura', '2026-08-04', 5, 140, 4.2),
      gscRow('pintura', '2026-08-06', 6, 160, 3.8)
    ]

    const result = await readSeoPerformance('org-1', { mode: 'keyword', metric: 'position', items: ['pintura'] })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    // La fuente efectiva es la medida, y chart + tabla la comparten.
    expect(result.source).toBe('gsc_measured')
    expect(result.series[0].points).toHaveLength(5)
    expect(result.standings[0].position).toBe(3.8)
  })

  it('mantiene DataForSEO cuando la serie exacta ya cubre al menos la mitad de la medida', async () => {
    rankEvolutionMock.mockResolvedValue({
      ok: true,
      seoTargetId: 'seot-1',
      organizationId: 'org-1',
      engine: 'google',
      device: 'desktop',
      range: { from: '2026-08-03', to: '2026-08-06', days: 90 },
      source: 'postgres',
      series: [
        {
          keyword: 'pintura',
          points: [
            { date: '2026-08-03', position: 2, url: null },
            { date: '2026-08-05', position: 2, url: null },
            { date: '2026-08-06', position: 1, url: null }
          ]
        }
      ]
    })

    state.gscRows = [
      gscRow('pintura', '2026-08-02', 4, 120, 4.6),
      gscRow('pintura', '2026-08-04', 5, 140, 4.2),
      gscRow('pintura', '2026-08-06', 6, 160, 3.8)
    ]

    const result = await readSeoPerformance('org-1', { mode: 'keyword', metric: 'position', items: ['pintura'] })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.source).toBe('dataforseo_estimated')
    expect(result.standings[0].position).toBe(1)
  })

  it('modo url consulta la columna page y nunca la de keyword', async () => {
    state.gscRows = [
      gscRow('/latex', '2026-07-07', 5, 100, 8),
      gscRow('/latex', '2026-08-06', 9, 220, 3)
    ]

    const result = await readSeoPerformance('org-1', { mode: 'url', metric: 'position', items: ['/latex'] })

    expect(state.gscSql).toContain('page AS item')
    expect(state.gscSql).not.toContain('query AS item')
    // El eje URL no toca DataForSEO: pedirle una posición de página sería inventar.
    expect(rankEvolutionMock).not.toHaveBeenCalled()

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.source).toBe('gsc_measured')
    expect(result.standings[0].ctr).toBeCloseTo(14 / 320)
  })

  it('pondera la posición por impresiones en SQL, nunca con un AVG plano', async () => {
    state.gscRows = [gscRow('/latex', '2026-08-06', 1, 10, 5)]

    await readSeoPerformance('org-1', { mode: 'url', items: ['/latex'] })

    expect(state.gscSql).toContain('SUM(position * impressions) / SUM(impressions)')
    expect(state.gscSql).not.toContain('AVG(position)')
    // Date-math canónico: intervalos explícitos, jamás EXTRACT(EPOCH FROM date - date).
    expect(state.gscSql).not.toContain('EXTRACT(EPOCH')
  })

  it('un día con 0 impresiones es un hueco, no un punto en cero', async () => {
    state.gscRows = [
      // GSC no emite fila cuando el ítem no apareció: una con 0 impresiones es artefacto y
      // pintarla daría un punto plano en 0 donde la verdad es "no se midió".
      gscRow('/latex', '2026-08-05', 0, 0, null),
      gscRow('/esmalte', '2026-08-06', 0, 0, null)
    ]

    const result = await readSeoPerformance('org-1', {
      mode: 'url',
      metric: 'clicks',
      items: ['/latex', '/esmalte']
    })

    // Ningún ítem quedó con dato → degradación honesta, no un chart de dos líneas en cero.
    expect(result).toEqual({ ok: false, errorCode: 'no_data', status: null })
  })

  it('0 clics CON impresiones sí es una medición real, y su CTR es 0', async () => {
    state.gscRows = [gscRow('/latex', '2026-08-06', 0, 500, 14)]

    const result = await readSeoPerformance('org-1', { mode: 'url', metric: 'clicks', items: ['/latex'] })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    // "Apareciste 500 veces y nadie hizo clic" es un hecho, y se dice como tal.
    expect(result.standings[0].ctr).toBe(0)
    expect(result.standings[0].impressions).toBe(500)
  })

  it('nombra los ítems pedidos que no tienen dato en vez de omitirlos', async () => {
    state.gscRows = [gscRow('/latex', '2026-08-06', 9, 220, 3)]

    const result = await readSeoPerformance('org-1', {
      mode: 'url',
      metric: 'position',
      items: ['/latex', '/esmalte']
    })

    expect(result.ok).toBe(true)

    if (!result.ok) return

    expect(result.series).toHaveLength(1)
    expect(result.itemsWithoutData).toEqual(['/esmalte'])
  })

  it('deduplica y recorta el set al techo del reader', async () => {
    const items = ['a', 'a', ...Array.from({ length: 40 }, (_, index) => `k${index}`)]

    state.gscRows = [gscRow('a', '2026-08-06', 1, 10, 3)]

    await readSeoPerformance('org-1', { mode: 'url', items })

    const passedItems = state.gscParams[1] as string[]

    expect(passedItems).toHaveLength(25)
    expect(passedItems.filter(item => item === 'a')).toHaveLength(1)
  })
})
