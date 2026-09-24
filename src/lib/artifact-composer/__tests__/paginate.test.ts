import { describe, expect, it } from 'vitest'

import { BlockTooTallError, paginateFlow, type FlowBlock, type PageBudget } from '../paginate'

const budget: PageBudget = { contentHeightPx: 1000, guardPx: 20 }

const block = (blockId: string, heightPx: number, keepWithNext = false): FlowBlock => ({
  blockId,
  heightPx,
  keepWithNext
})

describe('paginateFlow', () => {
  it('llena una página antes de abrir la siguiente', () => {
    const pages = paginateFlow([block('a', 400), block('b', 400), block('c', 400)], budget)

    // 980px útiles: a+b = 800 caben; c abre página.
    expect(pages).toEqual([
      { pageNumber: 1, blockIds: ['a', 'b'] },
      { pageNumber: 2, blockIds: ['c'] }
    ])
  })

  it('numera las páginas desde 1, porque el número es el folio que se imprime', () => {
    const pages = paginateFlow([block('a', 900), block('b', 900)], budget)

    expect(pages.map(p => p.pageNumber)).toEqual([1, 2])
  })

  it('rechaza un bloque que no cabe ni en una página vacía, en vez de recortarlo', () => {
    expect(() => paginateFlow([block('gigante', 1200)], budget)).toThrow(BlockTooTallError)
  })

  it('el rechazo nombra el bloque y las dos medidas, para que sea accionable', () => {
    try {
      paginateFlow([block('tabla-densa', 1200)], budget)
      expect.unreachable('debió rechazar')
    } catch (error) {
      expect(error).toBeInstanceOf(BlockTooTallError)
      const typed = error as BlockTooTallError

      expect(typed.blockId).toBe('tabla-densa')
      expect(typed.heightPx).toBe(1200)
      expect(typed.availableHeightPx).toBe(980)
      expect(typed.message).toContain('no cabe')
    }
  })

  it('rechaza ANTES de repartir: un bloque imposible al final no produce páginas a medias', () => {
    expect(() => paginateFlow([block('a', 100), block('imposible', 5000)], budget)).toThrow(
      BlockTooTallError
    )
  })

  it('descuenta la guarda: un bloque que cabría sin margen no cabe con él', () => {
    const sinGuarda = paginateFlow([block('a', 990)], { contentHeightPx: 1000, guardPx: 0 })

    expect(sinGuarda).toHaveLength(1)
    expect(() => paginateFlow([block('a', 990)], budget)).toThrow(BlockTooTallError)
  })

  it('no deja un bloque keepWithNext solo al pie: baja con su compañero', () => {
    // titulo (100) cabría tras a (800), pero su cuerpo (300) no entra en los 80px restantes.
    const pages = paginateFlow([block('a', 800), block('titulo', 100, true), block('cuerpo', 300)], budget)

    expect(pages).toEqual([
      { pageNumber: 1, blockIds: ['a'] },
      { pageNumber: 2, blockIds: ['titulo', 'cuerpo'] }
    ])
  })

  it('keepWithNext en el último bloque no rompe ni abre una página vacía', () => {
    const pages = paginateFlow([block('a', 100), block('huerfano', 100, true)], budget)

    expect(pages).toEqual([{ pageNumber: 1, blockIds: ['a', 'huerfano'] }])
  })

  it('conserva TODOS los bloques y su orden — la propiedad que no se puede romper', () => {
    const blocks = Array.from({ length: 60 }, (_, i) => block(`b${i}`, 50 + (i % 7) * 60, i % 5 === 0))
    const pages = paginateFlow(blocks, budget)
    const flattened = pages.flatMap(page => page.blockIds)

    expect(flattened).toEqual(blocks.map(b => b.blockId))
  })

  it('ninguna página excede su presupuesto útil', () => {
    const blocks = Array.from({ length: 60 }, (_, i) => block(`b${i}`, 50 + (i % 7) * 60, i % 5 === 0))
    const byId = new Map(blocks.map(b => [b.blockId, b.heightPx]))
    const pages = paginateFlow(blocks, budget)

    for (const page of pages) {
      const used = page.blockIds.reduce((sum, id) => sum + (byId.get(id) ?? 0), 0)

      expect(used).toBeLessThanOrEqual(980)
    }
  })

  it('es determinista: mismas alturas, mismo reparto', () => {
    const blocks = Array.from({ length: 40 }, (_, i) => block(`b${i}`, 70 + (i % 11) * 40, i % 4 === 0))

    expect(paginateFlow(blocks, budget)).toEqual(paginateFlow(blocks, budget))
  })

  it('un flujo vacío no produce páginas — un informe sin contenido no imprime una hoja en blanco', () => {
    expect(paginateFlow([], budget)).toEqual([])
  })

  it('rechaza un presupuesto sin alto útil en vez de repartir en páginas imposibles', () => {
    expect(() => paginateFlow([block('a', 10)], { contentHeightPx: 20, guardPx: 20 })).toThrow(RangeError)
  })
})
