import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { deckAxisCatalog } from '../catalogs/deck-axis'
import type { SlideSpec, TemplateContract } from '../contracts'
import { fillSlide } from '../render'

const DIR = path.join(process.cwd(), 'src/lib/artifact-composer/catalogs/deck-axis')
const CONTRACT_PATH = path.join(DIR, 'tool-stack-full.slots.json')
const TEMPLATE_PATH = path.join(DIR, 'tool-stack-full.html')

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

describe('ToolStackFull — resolvers in nested support layer', () => {
  it('resuelve logos distintos dentro de un array anidado en un object top-level', async () => {
    const contract = JSON.parse(await fs.readFile(CONTRACT_PATH, 'utf8')) as TemplateContract
    const page = await browser.newPage({ viewport: contract.viewport })

    const slide: SlideSpec = {
      slideId: 'tool-stack-test',
      contentType: 'tool-stack',
      template: 'ToolStackFull',
      slots: {
        sectionLabel: 'STACK OPERATIVO',
        title: 'Un sistema operativo para producir y <em>optimizar contenido</em>',
        badge: 'Biblioteca reutilizable',
        lead: 'Cada plataforma entra en una etapa concreta del ciclo.',
        stages: [
          { stage: 'Planificar', outcome: 'Brief y calendario.', tools: [{ tool: 'microsoft-365', name: 'Microsoft 365' }] },
          { stage: 'Investigar', outcome: 'SEO y AEO.', tools: [{ tool: 'semrush', name: 'Semrush' }] },
          { stage: 'Producir', outcome: 'Texto y diseño.', tools: [{ tool: 'adobe-illustrator', name: 'Illustrator' }] },
          { stage: 'Enriquecer', outcome: 'Exploración visual.', tools: [{ tool: 'adobe-firefly', name: 'Adobe Firefly' }] },
          { stage: 'Revisar', outcome: 'Comentarios y versiones.', tools: [{ tool: 'frameio', name: 'Frame.io' }] }
        ],
        supportLayer: {
          label: 'Capa transversal',
          summary: 'Comentarios, aprobaciones, licencias y fuentes aprobadas se mantienen trazables.',
          tools: [
            { tool: 'notion', name: 'Notion' },
            { tool: 'microsoft-teams', name: 'Teams' },
            { tool: 'slack', name: 'Slack' },
            { tool: 'shutterstock', name: 'Shutterstock' }
          ]
        }
      }
    }

    try {
      await fillSlide(page, TEMPLATE_PATH, slide, contract, deckAxisCatalog)

      const supportLogos = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLImageElement>('[data-slot="supportLayer"] .tool-logo')).map(img => ({
          alt: img.getAttribute('alt'),
          src: img.getAttribute('src'),
          tool: img.getAttribute('data-tool')
        }))
      )

      expect(supportLogos).toEqual([
        expect.objectContaining({ alt: 'Notion', src: 'assets/tools/notion-isotype.svg', tool: 'notion' }),
        expect.objectContaining({
          alt: 'Microsoft Teams',
          src: 'assets/tools/teams-isotype.svg',
          tool: 'microsoft-teams'
        }),
        expect.objectContaining({ alt: 'Slack', src: 'assets/tools/slack-isotype.svg', tool: 'slack' }),
        expect.objectContaining({
          alt: 'Shutterstock',
          src: 'assets/tools/shutterstock-isotype.svg',
          tool: 'shutterstock'
        })
      ])
    } finally {
      await page.close()
    }
  })
})
