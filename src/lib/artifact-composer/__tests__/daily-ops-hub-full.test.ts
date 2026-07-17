import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { deckAxisCatalog } from '../catalogs/deck-axis'
import type { SlideSpec, TemplateContract } from '../contracts'
import { fillSlide } from '../render'

const DIR = path.join(process.cwd(), 'src/lib/artifact-composer/catalogs/deck-axis')
const CONTRACT_PATH = path.join(DIR, 'daily-ops-hub-full.slots.json')
const TEMPLATE_PATH = path.join(DIR, 'daily-ops-hub-full.html')

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

describe('DailyOpsHubFull — operación viva reusable', () => {
  it('no quema nombres ni assets de SKY en el prototipo reusable', async () => {
    const html = await fs.readFile(TEMPLATE_PATH, 'utf8')

    expect(html).not.toMatch(/sky/i)
  })

  it('resuelve herramientas, ordinales y estados sin hardcodear el workflow', async () => {
    const contract = JSON.parse(await fs.readFile(CONTRACT_PATH, 'utf8')) as TemplateContract
    const page = await browser.newPage({ viewport: contract.viewport })

    const slide: SlideSpec = {
      slideId: 'daily-ops-test',
      contentType: 'daily-operations',
      template: 'DailyOpsHubFull',
      slots: {
        sectionLabel: 'OPERACIÓN COMPARTIDA',
        title: 'El trabajo queda <em>visible y versionado</em>',
        lead: 'Conversaciones, contenido y revisión comparten una sola ruta.',
        workspaceName: 'Content Hub',
        liveStatus: 'En revisión',
        conversation: {
          tool: 'slack',
          toolName: 'Slack',
          channel: '#contenido',
          cadence: 'Semanal',
          messages: [
            { initials: 'EO', author: 'Efeonce', time: '09:00', message: 'Mensaje uno.' },
            { initials: 'CL', author: 'Cliente', time: '09:10', message: 'Mensaje dos.' },
            { initials: 'EO', author: 'Efeonce', time: '09:20', message: 'Mensaje tres.' }
          ],
          composerLabel: 'Responder'
        },
        workspace: {
          tool: 'notion',
          toolName: 'Notion Content Hub',
          status: 'En revisión',
          articleTitle: 'Artículo reusable',
          version: 'v02',
          owner: 'Owner · Equipo',
          due: 'Entrega · jueves',
          keyword: 'keyword',
          intent: 'informacional',
          excerpt: 'Research y texto comparten el mismo artefacto.',
          outline: [
            { tag: 'H1', title: 'Título' },
            { tag: 'H2', title: 'Sección uno' },
            { tag: 'H2', title: 'Sección dos' },
            { tag: 'H2', title: 'Sección tres' }
          ],
          checklist: [
            { label: 'KW mining', state: 'Listo' },
            { label: 'Schema', state: 'Listo' },
            { label: 'Fuentes', state: 'Revisión' }
          ],
          commentInitials: 'CL',
          commentText: 'Comentario sobre el artículo.'
        },
        reviewAsset: { src: 'assets/product/radiografia-sky-xray.png' },
        review: {
          tool: 'frameio',
          toolName: 'Frame.io',
          version: 'v02',
          status: '2 comentarios',
          assetTitle: 'Visual del artículo',
          comments: [
            { author: 'Cliente', message: 'Comentario visual uno.' },
            { author: 'Efeonce', message: 'Comentario visual dos.' }
          ]
        },
        workflowLabel: 'Ruta del artículo',
        workflow: [
          { label: 'Brief', state: 'done' },
          { label: 'Research', state: 'done' },
          { label: 'Redacción', state: 'active' },
          { label: 'Revisión', state: 'next' },
          { label: 'Visuales', state: 'next' },
          { label: 'Publicación', state: 'next' }
        ]
      }
    }

    try {
      await fillSlide(page, TEMPLATE_PATH, slide, contract, deckAxisCatalog)

      const rendered = await page.evaluate(() => ({
        tools: Array.from(document.querySelectorAll<HTMLImageElement>('.tool-logo')).map(img => img.dataset.tool),
        reviewPins: Array.from(document.querySelectorAll<HTMLElement>('.review-pin')).map(pin => pin.textContent),
        workflowOrdinals: Array.from(document.querySelectorAll<HTMLElement>('.workflow-index')).map(node => node.textContent),
        workflowClasses: Array.from(document.querySelectorAll<HTMLElement>('.workflow-step')).map(node =>
          ['done', 'active', 'next'].find(tone => node.classList.contains(tone))
        )
      }))

      expect(rendered.tools).toEqual(['slack', 'notion', 'frameio'])
      expect(rendered.reviewPins).toEqual(['01', '02'])
      expect(rendered.workflowOrdinals).toEqual(['01', '02', '03', '04', '05', '06'])
      expect(rendered.workflowClasses).toEqual(['done', 'done', 'active', 'next', 'next', 'next'])
    } finally {
      await page.close()
    }
  })
})
