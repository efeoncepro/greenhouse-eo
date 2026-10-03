/**
 * TASK-1975 — página/lámina de cifras (`report-figure-stat`, `insights-figure-stat`). No hay geometría que
 * derivar: cada cifra es texto con slots del motor. Lo que se prueba es que el contrato falle cerrado (nombre
 * largo, tono desconocido, más cifras que la capacidad, píldora sin cifra) y que la retícula se arme por la
 * CANTIDAD de cifras (1 horizontal; 2 o 4 en dos columnas; 3, 5 o 6 en tres) sin truncar nunca un valor: una cifra
 * más ancha que su celda se rechaza en el chequeo de encaje.
 */

import fs from 'node:fs'
import path from 'node:path'

import type { Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { SlideSpec, SlotValues, TemplateContract } from '../contracts'
import { assertSlideFitsCanvas, fillSlide, launchComposerBrowser } from '../render'
import { validateSlide } from '../validate'
import { insightsDeckCatalog } from '../catalogs/insights-deck'
import { insightsReportCatalog } from '../catalogs/insights-report'

const ROOT = process.cwd()

const CASES = [
  {
    name: 'A4',
    catalog: insightsReportCatalog,
    template: 'ReportFigureStatPage',
    contentType: 'report-figure-stat',
    html: 'report-figure-stat.html',
    slots: 'report-figure-stat.slots.json',
    fixture: 'scripts/insights/canvas-fixtures/report/48-figura-cifras.json'
  },
  {
    name: 'deck',
    catalog: insightsDeckCatalog,
    template: 'InsightsFigureStatSlide',
    contentType: 'insights-figure-stat',
    html: 'insights-figure-stat.html',
    slots: 'insights-figure-stat.slots.json',
    fixture: 'scripts/insights/canvas-fixtures/deck/48-figura-cifras.json'
  }
] as const

type Case = (typeof CASES)[number]

const contractOf = (c: Case): TemplateContract =>
  JSON.parse(fs.readFileSync(path.join(c.catalog.templatesDir, c.slots), 'utf8')) as TemplateContract

const fixtureOf = (c: Case): SlotValues => (JSON.parse(fs.readFileSync(path.join(ROOT, c.fixture), 'utf8')) as { slots: SlotValues }).slots

type StatItem = Record<string, string>

const itemsOf = (slots: SlotValues): StatItem[] => slots.statItems as unknown as StatItem[]

const slideOf = (c: Case, slots: SlotValues): SlideSpec => ({ slideId: `stat-${c.name}`, contentType: c.contentType, template: c.template, slots })

const withItems = (c: Case, items: StatItem[]): SlotValues => ({
  ...fixtureOf(c),
  statCount: `${items.length} ${items.length === 1 ? 'cifra' : 'cifras'}`,
  statItems: items as unknown as SlotValues[string]
})

describe.each(CASES)('cifras $name: el contrato falla cerrado', c => {
  const contract = contractOf(c)
  const base = fixtureOf(c)

  it('el fixture de la hoja aprobada cumple el contrato', () => {
    expect(validateSlide(slideOf(c, base), contract)).toEqual([])
  })

  it('un nombre de más de 24 caracteres se rechaza (nunca se trunca)', () => {
    const items = itemsOf(base).map((item, index) => (index === 0 ? { ...item, name: 'Keywords en primera página' } : item))

    expect(validateSlide(slideOf(c, withItems(c, items)), contract).map(v => v.code)).toContain('item_too_long')
  })

  it('un tono desconocido, una píldora sin cifra y más de 6 cifras se rechazan', () => {
    const items = itemsOf(base)
    const unknownTone = items.map((item, index) => (index === 0 ? { ...item, trend: 'up:great' } : item))
    const noDelta = items.map((item, index) => (index === 0 ? Object.fromEntries(Object.entries(item).filter(([key]) => key !== 'delta')) : item))

    expect(validateSlide(slideOf(c, withItems(c, unknownTone)), contract).map(v => v.code)).toContain('disallowed_enum')
    expect(validateSlide(slideOf(c, withItems(c, noDelta)), contract).length).toBeGreaterThan(0)
    expect(validateSlide(slideOf(c, withItems(c, [...items, items[0]!])), contract).map(v => v.code)).toContain('too_many_items')
    expect(validateSlide(slideOf(c, withItems(c, [])), contract).map(v => v.code)).toContain('too_few_items')
  })
})

describe('cifras: la retícula sale de la cantidad y nada se trunca', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await launchComposerBrowser()
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
  })

  const render = async (c: Case, slots: SlotValues) => {
    const contract = contractOf(c)
    const slide = slideOf(c, slots)

    expect(validateSlide(slide, contract)).toEqual([])

    const page = await browser.newPage({ viewport: contract.viewport, deviceScaleFactor: 1 })

    try {
      await fillSlide(page, path.join(c.catalog.templatesDir, c.html), slide, contract, c.catalog)

      const layout = await page.evaluate(() => {
        const cells = Array.from(document.querySelectorAll('.stat-cell')) as HTMLElement[]

        return {
          columns: new Set(cells.map(cell => Math.round(cell.getBoundingClientRect().left))).size,
          cells: cells.length,
          pills: cells.map(cell => cell.querySelectorAll('.delta-pill').length),
          lower: cells.map(cell => getComputedStyle(cell.querySelector('.stat-lower') ?? cell).display !== 'none' && !!cell.querySelector('.stat-lower [data-slot-field]')),
          exampleLeft: document.body.textContent?.includes('Sin dato en septiembre de 2026') ?? false,
          // Valor y variación lado a lado (formato horizontal de una sola cifra) o uno bajo el otro.
          sideBySide: (() => {
            const figure = cells[0]?.querySelector('.stat-figure')?.getBoundingClientRect()
            const change = cells[0]?.querySelector('.stat-change')?.getBoundingClientRect()

            return figure && change ? change.left > figure.left + 150 && change.top < figure.bottom : false
          })()
        }
      })

      let fits = true

      try {
        await assertSlideFitsCanvas(page, slide, contract)
      } catch {
        fits = false
      }

      return { ...layout, fits }
    } finally {
      await page.close()
    }
  }

  // Llenar es la verificación de las anclas: un campo presente sin su `data-slot-field`, o una clave de ícono que el
  // resolver quiera quitar y no exista en el set, hacen fallar `fillSlide` (SlotFillError). Por eso el fixture ejerce
  // todos los campos del item y el caso «sin dato» ejerce `noData`.
  it.each(CASES)('$name: 1 → horizontal, 2 y 4 → dos columnas, 3, 5 y 6 → tres', async c => {
    const items = itemsOf(fixtureOf(c))
    const expected: Record<number, number> = { 2: 2, 3: 3, 4: 2, 5: 3, 6: 3 }

    for (const count of [1, 2, 3, 4, 5, 6]) {
      const result = await render(c, withItems(c, items.slice(0, count)))

      expect(result.cells, `${count} cifras`).toBe(count)
      expect(result.fits, `${count} cifras`).toBe(true)
      expect(result.exampleLeft, `${count} cifras: copy de ejemplo`).toBe(false)

      // Con una cifra, la celda se parte en valor | variación; con más, la variación va bajo el valor.
      expect(result.sideBySide, `${count} cifras`).toBe(count === 1)
      if (count > 1) expect(result.columns, `${count} cifras`).toBe(expected[count])
    }
  }, 60_000)

  it.each(CASES)('$name: sin dato no lleva píldora y «Menor es mejor» sólo donde viene', async c => {
    const items = itemsOf(fixtureOf(c)).slice(0, 3)

    const noData: StatItem = { icon: 'clicks', name: 'Clics', value: '—', noData: 'Sin dato en septiembre de 2026' }

    const result = await render(c, withItems(c, [noData, ...items.slice(1)]))

    expect(result.pills).toEqual([0, 1, 1])
    expect(result.lower).toEqual([false, false, false])
    expect(result.fits).toBe(true)

    const withLower = await render(c, withItems(c, itemsOf(fixtureOf(c)).slice(3, 6)))

    expect(withLower.lower).toEqual([true, false, false])
  }, 60_000)

  // TASK-1996 — en el deck la cifra única baja por ancho visible; antes, «770.462» se rechazaba a 112 px.
  it('deck: una cifra única de 7, 9 u 11 caracteres cabe bajando de tamaño (sin recortar)', async () => {
    const c = CASES[1]
    const [first] = itemsOf(fixtureOf(c))

    for (const value of ['770.462', '1.234.567', '12.345.678']) {
      expect((await render(c, withItems(c, [{ ...first!, value }]))).fits, value).toBe(true)
    }

    // Sin escalón (12 caracteres, el máximo del contrato) el encaje sigue rechazando.
    expect((await render(c, withItems(c, [{ ...first!, value: '1.234.567,89' }]))).fits).toBe(false)
  }, 60_000)

  it.each(CASES)('$name: una cifra más ancha que su celda se rechaza en el encaje (nunca se recorta en silencio)', async c => {
    const items = itemsOf(fixtureOf(c)).slice(0, 3)
    const wide = items.map((item, index) => (index === 1 ? { ...item, value: '123.456.789' } : item))

    expect((await render(c, withItems(c, wide))).fits).toBe(false)
  }, 60_000)
})
