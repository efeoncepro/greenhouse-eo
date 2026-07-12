import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '../contracts'
import { assertSlideFitsCanvas, fillSlide } from '../render'
import { layoutTimelineSchedule, parseTimelineSchedule } from '../timeline'
import { validateSlide } from '../validate'

const DIR = path.join(process.cwd(), 'src/lib/artifact-composer/catalogs/deck-axis')
const TEMPLATE_PATH = path.join(DIR, 'timeline-full.html')

const contract = JSON.parse(await fs.readFile(path.join(DIR, 'timeline-full.slots.json'), 'utf8')) as TemplateContract

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const labelsFor = (unitCount: number): { timeUnit: string; labels: string[] } => {
  if (unitCount === 3) return { timeUnit: 'week', labels: ['Semana 1', 'Semana 2', 'Semana 3'] }
  if (unitCount === 6) return { timeUnit: 'month', labels: Array.from({ length: 6 }, (_, index) => `Mes ${index + 1}`) }

  return { timeUnit: 'quarter', labels: Array.from({ length: 8 }, (_, index) => `Trimestre ${index + 1}`) }
}

const timelineSlide = (unitCount: 3 | 6 | 8): SlideSpec => {
  const axis = labelsFor(unitCount)
  const milestoneAt = unitCount === 3 ? [1, 3] : unitCount === 6 ? [1, 3, 6] : [1, 3, 5, 8]

  return {
    slideId: `timeline-${unitCount}`,
    contentType: 'timeline',
    template: 'TimelineFull',
    slots: {
      sectionLabel: 'PLAN DE TRABAJO',
      title: `Cronograma de ${unitCount} unidades`,
      meta: `${unitCount} unidades · 3 fases · hitos`,
      timeUnit: axis.timeUnit,
      timeAxis: axis.labels,
      milestones: milestoneAt.map((at, index) => ({ at, label: `Hito ${index + 1}`, caption: `Unidad ${at}` })),
      phases: [
        {
          kind: 'work',
          startUnit: 1,
          endUnit: 1,
          title: 'Preparación',
          description: 'Preparación y línea base.',
          barLabel: 'Movimiento temprano'
        },
        {
          kind: 'work',
          startUnit: Math.min(2, unitCount),
          endUnit: unitCount,
          title: 'Ejecución',
          description: 'Ejecución de los entregables.',
          barLabel: 'Ejecución'
        },
        {
          kind: 'continuous',
          startUnit: 1,
          endUnit: unitCount,
          title: 'Seguimiento',
          description: 'Seguimiento y ajustes continuos.',
          barLabel: 'Seguimiento continuo'
        }
      ]
    }
  }
}

describe('TimelineFull — schedule data-driven', () => {
  it.each([3, 6, 8] as const)(
    'compila un eje de %i unidades sin desalinear grilla, hitos ni conectores',
    async unitCount => {
      const slide = timelineSlide(unitCount)
      const page = await browser.newPage({ viewport: contract.viewport })

      try {
        expect(validateSlide(slide, contract)).toEqual([])

        await fillSlide(page, TEMPLATE_PATH, slide, contract)
        await assertSlideFitsCanvas(page, slide, contract)

        const layout = await page.evaluate(() => ({
          axisLabels: document.querySelectorAll('.axis .mo').length,
          unitWidth: document
            .querySelector<HTMLElement>('[data-template="TimelineFull"]')
            ?.style.getPropertyValue('--m'),
          milestonePositions: Array.from(document.querySelectorAll<HTMLElement>('.mstone')).map(
            node => node.style.left
          ),
          connectorPositions: Array.from(document.querySelectorAll<HTMLElement>('.vline')).map(node => node.style.left),
          bars: Array.from(document.querySelectorAll<HTMLElement>('.bar')).map(node => ({
            width: node.style.width,
            height: node.getBoundingClientRect().height,
            label: node.textContent?.trim()
          }))
        }))

        expect(layout.axisLabels).toBe(unitCount)
        expect(layout.unitWidth).toBe(`${(100 / unitCount).toFixed(6)}%`)
        expect(layout.connectorPositions).toEqual(layout.milestonePositions)
        expect(layout.connectorPositions).toHaveLength((slide.slots.milestones as unknown[]).length)
        expect(layout.bars).toHaveLength((slide.slots.phases as unknown[]).length)
        expect(layout.bars.every(bar => bar.width !== '' && bar.height > 0)).toBe(true)
        expect(layout.bars.map(bar => bar.label)).toContain('Movimiento temprano')
      } finally {
        await page.close()
      }
    }
  )

  it('rechaza un hito o fase fuera de una frontera entera real del eje', () => {
    const slide = timelineSlide(3)
    const milestones = slide.slots.milestones as Array<Record<string, unknown>>
    const phases = slide.slots.phases as Array<Record<string, unknown>>

    milestones[0] = { ...milestones[0], at: 1.5 }
    phases[0] = { ...phases[0], startUnit: 0, endUnit: 4 }

    const violations = validateSlide(slide, contract)

    expect(violations.filter(violation => violation.code === 'invalid_value')).toHaveLength(2)
    expect(violations.map(violation => violation.message).join(' ')).toContain('frontera entera')
    expect(violations.map(violation => violation.message).join(' ')).toContain(
      'No se permite dibujar una barra fuera del eje'
    )
  })

  it('compila el layout únicamente desde el schedule validado', () => {
    const parsed = parseTimelineSchedule(timelineSlide(8).slots)

    expect(parsed.issues).toEqual([])
    expect(parsed.schedule).not.toBeNull()
    expect(layoutTimelineSchedule(parsed.schedule!).unitWidth).toBe('12.500000%')
  })
})
