import { describe, expect, it, vi } from 'vitest'

/**
 * TASK-1699 Slice 2 — parser hermano `parseSerpTopResults` + writer `persistSerpTopResults`.
 *
 * El fixture load-bearing es el de `rank_group` REPETIDO entre bloques: es el caso que
 * justifica que la ranura sea `rank_absolute` — con `rank_group` como clave, el
 * `DO NOTHING` descartaría filas en silencio.
 */

vi.mock('server-only', () => ({}))

const { parseSerpTopResults, persistSerpTopResults, SERP_TOP_RESULTS_MAX_ROWS_PER_KEYWORD } =
  await import('../serp-top-results')

const serpResponse = (items: unknown[]) => [{ result: [{ items }] }]

const organic = (rankAbsolute: number, rankGroup: number, domain: string, extra: Record<string, unknown> = {}) => ({
  type: 'organic',
  rank_absolute: rankAbsolute,
  rank_group: rankGroup,
  domain,
  url: `https://${domain}/p${rankAbsolute}`,
  title: `Título ${rankAbsolute}`,
  ...extra
})

describe('parseSerpTopResults', () => {
  it('🔴 rank_group repetido entre bloques: NINGUNA fila se pierde (la ranura es rank_absolute)', () => {
    const rows = parseSerpTopResults(
      serpResponse([
        { type: 'ai_overview', rank_absolute: 1, rank_group: 1 },
        organic(2, 1, 'rival.cl'),
        // Un video con el MISMO rank_group=1 que el AIO y que el orgánico de su bloque:
        // tres items comparten rank_group y los tres deben persistir.
        { type: 'video', rank_absolute: 3, rank_group: 1, title: 'Video' },
        organic(4, 2, 'otro.cl')
      ]),
      'cliente.cl'
    )

    expect(rows).toHaveLength(4)
    expect(rows.map(row => row.rankAbsolute)).toEqual([1, 2, 3, 4])
    expect(rows.map(row => row.rankGroup)).toEqual([1, 1, 1, 2])
  })

  it('marca is_own_domain con la misma normalización del rank capture (subdominios incluidos)', () => {
    const rows = parseSerpTopResults(
      serpResponse([
        organic(1, 1, 'www.CLIENTE.cl'),
        organic(2, 2, 'blog.cliente.cl'),
        organic(3, 3, 'rival.cl')
      ]),
      'https://cliente.cl/'
    )

    expect(rows.map(row => [row.resultDomain, row.isOwnDomain])).toEqual([
      ['cliente.cl', true],
      ['blog.cliente.cl', true],
      ['rival.cl', false]
    ])
  })

  it('SERP con AI Overview + PAA + local pack: todos los item_type persisten', () => {
    const rows = parseSerpTopResults(
      serpResponse([
        { type: 'ai_overview', rank_absolute: 1, rank_group: 1 },
        { type: 'people_also_ask', rank_absolute: 2, rank_group: 1 },
        { type: 'local_pack', rank_absolute: 3, rank_group: 1, domain: 'negocio.cl', title: 'Negocio' },
        organic(4, 1, 'rival.cl')
      ]),
      'cliente.cl'
    )

    expect(rows.map(row => row.itemType)).toEqual(['ai_overview', 'people_also_ask', 'local_pack', 'organic'])
    // Ítems sin dominio (AIO/PAA) persisten con resultDomain null — sin_dato, no se inventa.
    expect(rows[0].resultDomain).toBeNull()
  })

  it('sin nuestro dominio en el top: filas igual, ninguna is_own_domain', () => {
    const rows = parseSerpTopResults(serpResponse([organic(1, 1, 'a.cl'), organic(2, 2, 'b.cl')]), 'cliente.cl')

    expect(rows).toHaveLength(2)
    expect(rows.every(row => !row.isOwnDomain)).toBe(true)
  })

  it('ausencia ≠ vacío: menos de 20 filas se guardan tal cual, sin rellenar', () => {
    const rows = parseSerpTopResults(serpResponse([organic(1, 1, 'a.cl'), organic(2, 2, 'b.cl'), organic(3, 3, 'c.cl')]), 'x.cl')

    expect(rows).toHaveLength(3)
  })

  it('item sin rank_absolute no tiene ranura y no se adivina; ranura duplicada = primera gana', () => {
    const rows = parseSerpTopResults(
      serpResponse([
        { type: 'organic', rank_group: 5, domain: 'sinranura.cl' },
        organic(1, 1, 'a.cl'),
        organic(1, 9, 'anomalia-misma-ranura.cl')
      ]),
      'x.cl'
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].resultDomain).toBe('a.cl')
  })

  it('el tope por keyword acota respuestas anómalas', () => {
    const items = Array.from({ length: 60 }, (_, index) => organic(index + 1, index + 1, `d${index}.cl`))
    const rows = parseSerpTopResults(serpResponse(items), 'x.cl')

    expect(rows).toHaveLength(SERP_TOP_RESULTS_MAX_ROWS_PER_KEYWORD)
    expect(rows[0].rankAbsolute).toBe(1)
  })

  it('respuesta vacía o malformada → cero filas, jamás una fila inventada', () => {
    expect(parseSerpTopResults([], 'x.cl')).toEqual([])
    expect(parseSerpTopResults([{ result: null }, 'basura', null], 'x.cl')).toEqual([])
  })
})

describe('persistSerpTopResults', () => {
  it('un solo statement multi-fila con DO NOTHING sobre la UNIQUE por ranura', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = []

    const client = {
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params: params ?? [] })

        return { rows: [], rowCount: 2 }
      }
    }

    const rows = parseSerpTopResults(serpResponse([organic(1, 1, 'a.cl'), organic(2, 2, 'b.cl')]), 'x.cl')

    const result = await persistSerpTopResults(client, {
      seoTargetId: 'seot-1',
      keyword: 'kw',
      engine: 'google',
      device: 'desktop',
      captureDate: '2026-08-28',
      sourceRunId: 'seorun-1',
      rows
    })

    expect(result.rowsWritten).toBe(2)
    expect(calls).toHaveLength(1)
    expect(calls[0].sql).toContain('ON CONFLICT ON CONSTRAINT seo_serp_top_results_slot_unique DO NOTHING')
    // Los arrays UNNEST viajan alineados: ranuras y dominios en el mismo orden.
    expect(calls[0].params[6]).toEqual([1, 2])
    expect(calls[0].params[9]).toEqual(['a.cl', 'b.cl'])
  })

  it('cero filas → cero statements (no se toca la base)', async () => {
    const client = { query: vi.fn() }

    const result = await persistSerpTopResults(client as never, {
      seoTargetId: 'seot-1',
      keyword: 'kw',
      engine: 'google',
      device: 'desktop',
      captureDate: '2026-08-28',
      sourceRunId: 'seorun-1',
      rows: []
    })

    expect(result.rowsWritten).toBe(0)
    expect(client.query).not.toHaveBeenCalled()
  })
})
