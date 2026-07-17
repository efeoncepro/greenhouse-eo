import fs from 'node:fs/promises'
import path from 'node:path'

import { chromium, type Browser } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { deckAxisCatalog } from '../catalogs/deck-axis'
import type { SlideSpec, TemplateContract } from '../contracts'
import { fillSlide } from '../render'

const DIR = path.join(process.cwd(), 'src/lib/artifact-composer/catalogs/deck-axis')
const CONTRACT_PATH = path.join(DIR, 'content-hub-anatomy-full.slots.json')
const TEMPLATE_PATH = path.join(DIR, 'content-hub-anatomy-full.html')

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
})

const slide: SlideSpec = {
  slideId: 'content-hub-anatomy-test',
  contentType: 'content-hub-anatomy',
  template: 'ContentHubAnatomyFull',
  slots: {
    sectionLabel: 'ANATOMÍA DEL CONTENT HUB',
    title: 'Cada pieza conserva su <em>research y capa de máquina</em>',
    lead: 'El artefacto reúne decisión editorial, respuesta y estructura técnica.',
    proofKicker: 'Prueba viva',
    proofLink: '<a href="https://think.efeoncepro.com/muestras/demo-token/">Abrir evidencia ↗</a>',
    workspaceName: 'Content Hub',
    documentPath: 'Artículos / En revisión',
    version: 'v03',
    status: 'Validación',
    research: {
      kicker: '01 · Research trail',
      title: 'La decisión editorial',
      state: 'Trazable',
      question: '¿Qué necesita resolver la audiencia?',
      primaryKeyword: 'keyword reusable',
      intent: 'informacional',
      clusterCount: '3 señales',
      clusters: [
        { name: 'Consulta uno', signal: 'Alta', strength: 'high' },
        { name: 'Consulta dos', signal: 'Media', strength: 'medium' },
        { name: 'Consulta tres', signal: 'Foco', strength: 'focused' }
      ],
      sourceCount: '3 fuentes',
      sources: [
        { type: 'SRC', title: 'Fuente uno', note: 'Vigencia revisada' },
        { type: 'SRC', title: 'Fuente dos', note: 'Fuente institucional' },
        { type: 'SRC', title: 'Fuente tres', note: 'Evidencia primaria' }
      ]
    },
    article: {
      toolLabel: 'Artículo vivo',
      owner: 'Owner · Equipo',
      eyebrow: 'Guía práctica',
      title: 'Título reusable del artículo',
      deck: 'Una promesa editorial concreta y verificable.',
      answerLabel: 'Respuesta directa',
      directAnswer: 'La respuesta principal aparece antes del desarrollo y conserva su evidencia.',
      sections: [
        { tag: 'H2', title: 'Sección uno', copy: 'Desarrollo editorial uno.' },
        { tag: 'H2', title: 'Sección dos', copy: 'Desarrollo editorial dos.' },
        { tag: 'H2', title: 'Sección tres', copy: 'Desarrollo editorial tres.' }
      ],
      evidenceCallout: 'Cada afirmación relevante conserva su fuente y vigencia.',
      commentInitials: 'CL',
      commentText: 'Comentario contextual sobre el artículo.'
    },
    machine: {
      kicker: '03 · Machine layer',
      title: 'Lo que interpreta la máquina',
      state: 'Validado',
      metaTitle: 'Meta title reusable',
      metaDescription: 'Descripción reusable para buscadores y asistentes.',
      schemaLabel: 'Schema conectado',
      schemaTypes: ['Article', 'FAQPage', 'BreadcrumbList'],
      schemaType: 'Article',
      schemaAbout: 'Entidad principal',
      schemaEntity: 'Respuesta prioritaria',
      checks: [
        { label: 'Respuesta directa', stateLabel: 'Listo', tone: 'ready' },
        { label: 'Entidades', stateLabel: 'Con fuente', tone: 'evidence' },
        { label: 'Metadata', stateLabel: 'Listo', tone: 'ready' },
        { label: 'Vigencia', stateLabel: 'Revisión', tone: 'review' }
      ],
      commentInitials: 'EO',
      comment: 'La capa técnica se valida antes de publicar.'
    },
    layers: [
      { label: 'Research', description: 'Decisión trazable.', kind: 'research' },
      { label: 'Respuesta', description: 'Contenido útil.', kind: 'reader' },
      { label: 'Máquina', description: 'Capa recuperable.', kind: 'machine' }
    ]
  }
}

describe('ContentHubAnatomyFull — radiografía editorial reusable', () => {
  it('no quema nombres, keywords ni assets de SKY en el prototipo', async () => {
    const html = await fs.readFile(TEMPLATE_PATH, 'utf8')

    expect(html).not.toMatch(/sky|carretera austral/i)
  })

  it('deriva intensidad, estados y capas sin clases o porcentajes authorados', async () => {
    const contract = JSON.parse(await fs.readFile(CONTRACT_PATH, 'utf8')) as TemplateContract
    const page = await browser.newPage({ viewport: contract.viewport })

    try {
      await fillSlide(page, TEMPLATE_PATH, slide, contract, deckAxisCatalog)

      const rendered = await page.evaluate(() => ({
        clusterWidths: Array.from(document.querySelectorAll<HTMLElement>('.cluster-bar')).map(node =>
          node.style.getPropertyValue('--cluster-width')
        ),
        checkTones: Array.from(document.querySelectorAll<HTMLElement>('.machine-check')).map(node =>
          ['ready', 'review', 'evidence'].find(tone => node.classList.contains(tone))
        ),
        layerOrdinals: Array.from(document.querySelectorAll<HTMLElement>('.layer-index')).map(node => node.textContent),
        layerTones: Array.from(document.querySelectorAll<HTMLElement>('.layer')).map(node =>
          ['research', 'reader', 'machine'].find(tone => node.classList.contains(tone))
        ),
        proofHref: document.querySelector<HTMLAnchorElement>('.proof-link a')?.href,
        signaturePlacement: (() => {
          const signature = document.querySelector<HTMLElement>('.signature-ContentHubAnatomyFull')
          const style = signature ? window.getComputedStyle(signature) : null

          return style
            ? { left: style.left, right: style.right, marginLeft: style.marginLeft, marginRight: style.marginRight }
            : null
        })()
      }))

      expect(rendered.clusterWidths).toEqual(['92%', '72%', '56%'])
      expect(rendered.checkTones).toEqual(['ready', 'evidence', 'ready', 'review'])
      expect(rendered.layerOrdinals).toEqual(['01', '02', '03'])
      expect(rendered.layerTones).toEqual(['research', 'reader', 'machine'])
      expect(rendered.proofHref).toBe('https://think.efeoncepro.com/muestras/demo-token/')
      expect(rendered.signaturePlacement).toMatchObject({ left: '0px', right: '0px' })
      expect(rendered.signaturePlacement?.marginLeft).toBe(rendered.signaturePlacement?.marginRight)
    } finally {
      await page.close()
    }
  })
})
