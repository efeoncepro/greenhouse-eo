import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '../contracts'
import { fillSlide } from '../render'

const DIR = path.join(process.cwd(), 'docs/architecture/tender-deck-composer-prototypes')
const CONTRACT_PATH = path.join(DIR, 'chart-split.slots.json')
const TEMPLATE_PATH = path.join(DIR, 'chart-split.html')

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const renderSeries = async (series: Record<string, unknown>[]) => {
  const contract = JSON.parse(await fs.readFile(CONTRACT_PATH, 'utf8')) as TemplateContract
  const page = await browser.newPage({ viewport: contract.viewport })

  const slide: SlideSpec = {
    slideId: 'chart-split-test',
    contentType: 'chart',
    template: 'ChartSplit',
    slots: {
      title: 'La brecha se deriva del dato',
      narrative: ['La geometría no depende del ejemplo del prototipo.'],
      chartTitle: 'Share of Voice',
      hero: { value: '2,8×', label: 'brecha frente al líder' },
      series,
      source: 'Fuente: fixture de prueba'
    }
  }

  await fillSlide(page, TEMPLATE_PATH, slide, contract)

  const snapshot = await page.evaluate(() => ({
    reflineCount: document.querySelectorAll('[data-slot="series"] > .refline').length,
    rows: Array.from(document.querySelectorAll<HTMLElement>('[data-slot="series"] > .row')).map(row => ({
      name: row.querySelector('.name')?.textContent,
      rowSky: row.classList.contains('sky'),
      fillClass: row.querySelector('.fill')?.className,
      fillWidth: (row.querySelector('.fill') as HTMLElement | null)?.style.width,
      gap: row.querySelector('.gap')
        ? {
            left: (row.querySelector('.gap') as HTMLElement).style.left,
            width: (row.querySelector('.gap') as HTMLElement).style.width,
            label: row.querySelector('.gap .glabel')?.textContent
          }
        : null
    }))
  }))

  await page.close()
  
return snapshot
}

describe('ChartSplit — geometría de datos sin fabricación', () => {
  it('preserva la refline fija, deriva una sola brecha y elimina las demás', async () => {
    const chart = await renderSeries([
      { name: 'Líder', value: '50%', valuePct: 50, highlight: 'muted', evidenceRef: 'fixture-leader' },
      { name: 'Competidor', value: '27%', valuePct: 27, highlight: 'muted', evidenceRef: 'fixture-competitor' },
      { name: 'SKY', value: '18%', valuePct: 18, highlight: 'sky', evidenceRef: 'fixture-sky' }
    ])

    expect(chart.reflineCount).toBe(1)
    expect(chart.rows).toEqual([
      expect.objectContaining({ name: 'Líder', rowSky: false, fillClass: expect.stringContaining('muted'), fillWidth: '88%', gap: null }),
      expect.objectContaining({ name: 'Competidor', rowSky: false, fillClass: expect.stringContaining('muted'), fillWidth: '48%', gap: null }),
      expect.objectContaining({
        name: 'SKY',
        rowSky: true,
        fillClass: expect.stringContaining('sky'),
        fillWidth: '32%',
        gap: { left: '32%', width: '56%', label: '+32 pts a cerrar' }
      })
    ])
  })

  it('no dibuja una brecha de cero puntos cuando la serie destacada ya lidera', async () => {
    const chart = await renderSeries([
      { name: 'SKY', value: '50%', valuePct: 50, highlight: 'sky', evidenceRef: 'fixture-sky' },
      { name: 'Competidor', value: '27%', valuePct: 27, highlight: 'muted', evidenceRef: 'fixture-competitor' }
    ])

    expect(chart.reflineCount).toBe(1)
    expect(chart.rows[0]).toEqual(
      expect.objectContaining({ name: 'SKY', rowSky: true, fillWidth: '88%', gap: null })
    )
  })
})
