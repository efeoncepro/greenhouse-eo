/**
 * TASK-1785 — El test que convierte la afirmación en guarda (Slice 1: el tipo).
 *
 * La regla `●`/`◑` era correcta y estaba bien escrita en cinco lugares distintos. Lo que le
 * faltaba era algo mecánico que la midiera. Este archivo empieza por el vocabulario; los
 * slices siguientes le suman la cobertura de hojas numéricas sobre los DTO reales y el guard
 * de superficie sobre las rutas del lane ecosystem y las tools `get_seo_*`.
 */
import { describe, expect, it } from 'vitest'

import {
  SEO_FIGURE_SOURCES,
  SEO_LENSES,
  SEO_LENS_MARKER,
  isSeoFigureSource,
  resolveSeoAsOf,
  resolveSeoLens,
  seoFigure,
  seoProvenance,
  type SeoFigureSource
} from '../lens'
import { PROSPECT_SOURCES, type ProspectFact } from '../prospect/contracts'

describe('vocabulario de lentes', () => {
  it('resuelve la lente de TODA fuente declarada (total, no muestreado)', () => {
    // Exhaustividad: es lo que el vocabulario cerrado compra. Si alguien agrega una fuente
    // sin lente, `SOURCE_LENS` deja de compilar; si la agrega con una lente fuera del
    // vocabulario, cae acá.
    for (const source of SEO_FIGURE_SOURCES) {
      expect(SEO_LENSES, `fuente sin lente válida: ${source}`).toContain(resolveSeoLens(source))
    }
  })

  it('Search Console es la ÚNICA fuente medida; toda familia DataForSEO es estimada', () => {
    const measured = SEO_FIGURE_SOURCES.filter(source => resolveSeoLens(source) === 'measured')

    expect(measured).toEqual(['gsc'])
  })

  it('la SERP comprada es `estimated` pese a ser exacta', () => {
    // 🔴 Regresión deliberada. Un Delta de la spec proponía `measured` para el top-N del SERP
    // porque la posición es exacta. Exacto no es medido: ese query lo hicimos nosotros, no un
    // usuario. Con `measured` sería promediable con GSC — la mezcla que la task impide.
    expect(resolveSeoLens('dataforseo_serp')).toBe('estimated')
  })

  it('no existe una lente `mixed`', () => {
    // Su ausencia es el diseño: dejaría rotular la fila entera y parar ahí, escondiendo el
    // desglose. Lo plural es la lista de procedencias, no la lente.
    expect(SEO_LENSES).toEqual(['measured', 'estimated'])
  })

  it('los glifos ●/◑ tienen un solo origen', () => {
    expect(SEO_LENS_MARKER.measured).toBe('●')
    expect(SEO_LENS_MARKER.estimated).toBe('◑')
  })

  it('rechaza una fuente fuera del vocabulario', () => {
    expect(isSeoFigureSource('semrush')).toBe(false)
    expect(isSeoFigureSource('gsc')).toBe(true)
  })
})

describe('constructores: la lente se deriva, nunca se pasa a mano', () => {
  it('`seoProvenance` deriva la lente de la fuente', () => {
    expect(seoProvenance({ section: '*', source: 'gsc', capturedAt: '2026-08-28' })).toEqual({
      section: '*',
      lens: 'measured',
      source: 'gsc',
      capturedAt: '2026-08-28'
    })
  })

  it('`seoFigure` preserva `null` y jamás lo convierte en 0', () => {
    const absent = seoFigure({ magnitude: null, source: 'dataforseo_labs', capturedAt: '2026-08-28' })

    expect(absent.magnitude).toBeNull()
    expect(absent.magnitude).not.toBe(0)
    expect(absent.lens).toBe('estimated')
  })

  it('distingue un cero MEDIDO de una ausencia', () => {
    // Las dos cosas existen y no son la misma. Cero = miramos y no había.
    const zero = seoFigure({ magnitude: 0, source: 'gsc', capturedAt: '2026-08-28' })

    expect(zero.magnitude).toBe(0)
    expect(zero.magnitude).not.toBeNull()
  })
})

describe('as-of', () => {
  it('devuelve la fecha más reciente de las que el reader ya trae', () => {
    expect(resolveSeoAsOf(['2026-08-01', '2026-08-28', '2026-07-15'])).toBe('2026-08-28')
  })

  it('ignora huecos sin inventar una fecha', () => {
    expect(resolveSeoAsOf([null, '2026-08-01', undefined, ''])).toBe('2026-08-01')
  })

  it('devuelve null cuando no hay ninguna candidata fechable', () => {
    // Estado honesto: no se rellena con hoy ni con el fin de la ventana pedida.
    expect(resolveSeoAsOf([null, undefined, ''])).toBeNull()
  })
})

describe('alineación con el carril prospecto (TASK-1709)', () => {
  it('`ProspectFact` satisface la forma canónica y su lente vive en el vocabulario', () => {
    const fact: ProspectFact = {
      kind: 'ranked_keywords_total',
      magnitude: null,
      lens: 'estimated',
      capturedAt: '2026-08-28T12:00:00.000Z',
      source: 'labs_ranked_keywords',
      detail: {}
    }

    // El `extends SeoFigureShape<ProspectSource>` lo garantiza en tiempo de compilación; acá
    // se afirma que la lente estrechada sigue siendo un valor del vocabulario compartido.
    expect(SEO_LENSES).toContain(fact.lens)
    expect(fact.magnitude).toBeNull()
  })

  it('el carril conserva su propio vocabulario de fuentes, espejo del CHECK en base', () => {
    // Deliberado: forzarlas a `SeoFigureSource` divorciaría el tipo de su constraint en DB.
    // Lo que comparten es la FORMA, no la lista de fuentes.
    const shared = PROSPECT_SOURCES.filter(source =>
      (SEO_FIGURE_SOURCES as readonly string[]).includes(source as SeoFigureSource)
    )

    expect(shared).toEqual([])
  })
})
