/**
 * Las seis láminas nativas del deck SEO/AEO (Search Visibility 360, TASK-1949): la familia de marcas, los servicios con
 * maquetas, el informe vivo, el PPT del comité, las industrias y los mercados. Cada builder compone su plantilla con el
 * contrato de slots limpio y la plantilla real se rellena en Chromium; lo que falta o sobra falla cerrado; el lockup de
 * submarca es opcional (salvo en la familia, que abre con él) y todo color del plan sale de la paleta medida o de AXIS.
 *
 * Cada lámina pasa por `planSurfacePiece` con su intent de ejemplo (`examples/deck-<receta>-intent.json`): AXIS 0.3.40
 * publica las seis recetas (reservas, tipos, firma y lugar del lockup) y el contrato resuelve el manifest que lee el
 * builder. Los planes de esos intents también los vigila `example-plans.test.ts`.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser } from 'playwright'

import { loadRegistry, loadTemplateContract } from '@/lib/artifact-composer/catalog'
import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { fillSlide, launchComposerBrowser } from '@/lib/artifact-composer/render'
import { graphicLineDeckCatalog } from '@/lib/artifact-composer/catalogs/graphic-line-deck'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, type SurfaceIntent } from '../index'
import { SV360_PALETTE, svColor } from '../recipes/sv360/kit'
import { SurfacePieceError } from '../types'

const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')
const EXAMPLES = path.join(__dirname, '..', 'examples')

const TEMPLATES: Record<string, string> = {
  'content-brand-family': 'ContentBrandFamily',
  'content-service-mockups': 'ContentServiceMockups',
  'content-report-formats': 'ContentReportFormats',
  'content-committee-deck': 'ContentCommitteeDeck',
  'content-industries': 'ContentIndustries',
  'content-markets': 'ContentMarkets'
}

type Intent = SurfaceIntent & Record<string, unknown>

const sv360Intent = (id: string): Intent => JSON.parse(fs.readFileSync(path.join(EXAMPLES, `deck-${id}-intent.json`), 'utf8')) as Intent

const plan = (id: string, intent: Intent = sv360Intent(id)) => {
  const piece = planSurfacePiece(intent, { artifactId: `deck-${id}` })
  const planned = piece.plan.slides[0]!
  const built = { contentType: piece.contentType, slots: planned.slots as Record<string, unknown>, assets: piece.assets }
  const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, `${id}.slots.json`), 'utf8')) as TemplateContract
  const slide = { slideId: `deck-${id}`, contentType: built.contentType, slots: built.slots, template: TEMPLATES[id]! } as unknown as SlideSpec

  return { built, slots: built.slots, violations: validateSlide(slide, contract), slide }
}

const expectCode = (fn: () => unknown, code: SurfacePieceError['code']) => {
  let caught: unknown

  try {
    fn()
  } catch (error) {
    caught = error
  }

  expect(caught).toBeInstanceOf(SurfacePieceError)
  expect((caught as SurfacePieceError).code).toBe(code)
}

const hexesIn = (value: unknown): string[] => JSON.stringify(value).match(/#[0-9a-f]{6}/gi)?.map(hex => hex.toLowerCase()) ?? []

const G = efeonceGraphicLine as unknown as { color: Record<string, string>; lines: { key: string; accentOnDark: string }[] }

describe('deck SEO/AEO · las seis láminas nativas (TASK-1949)', () => {
  it.each(Object.keys(TEMPLATES))('%s compone su plantilla con el contrato de slots limpio', id => {
    const { built, violations } = plan(id)

    expect(built.contentType).toBe(`deck.${id}`)
    expect(violations).toEqual([])
  })

  it('el registry mapea cada contentType a su plantilla', () => {
    const registry = JSON.parse(fs.readFileSync(path.join(CATALOG, 'registry.json'), 'utf8')) as { selector: { map: Record<string, string> } }

    for (const [id, template] of Object.entries(TEMPLATES)) expect(registry.selector.map[`deck.${id}`]).toBe(template)
  })

  it('todo color del plan sale de la paleta medida, de la paleta de AXIS o del acento de la línea', () => {
    const allowed = new Set([...Object.keys(SV360_PALETTE).map(key => svColor(key as keyof typeof SV360_PALETTE)), ...hexesIn(G.color), ...G.lines.map(l => l.accentOnDark.toLowerCase()), '#ffffff', '#000000', '#000814', '#1f9e94'])

    for (const id of Object.keys(TEMPLATES)) {
      const { built } = plan(id)
      const layers = built.assets.filter(asset => asset.ref.startsWith('asset-ref:layer:')).flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))

      expect([...hexesIn(built.slots), ...layers].filter(hex => !allowed.has(hex)), id).toEqual([])
    }
  })

  it('el lockup de submarca es opcional: sin él la lámina compone sin el slot (salvo la familia, que abre con él)', () => {
    for (const id of Object.keys(TEMPLATES).filter(id => id !== 'content-brand-family')) {
      const intent = sv360Intent(id)

      delete intent.productMark

      const { slots, violations, built } = plan(id, intent)

      expect(slots.productMark, id).toBeUndefined()
      expect(built.assets.some(asset => asset.ref.startsWith('asset-ref:file:') && asset.ref.includes('lockup')), id).toBe(false)
      expect(violations, id).toEqual([])
    }

    const family = sv360Intent('content-brand-family')

    delete family.productMark
    expectCode(() => plan('content-brand-family', family), 'invalid-intent')
  })

  it('la familia de marcas: el eyebrow va sobre el nombre del producto y cada pieza con su lockup oficial', () => {
    const { slots, built } = plan('content-brand-family')

    expect(slots.voice).toEqual({ question: '¿Qué hay dentro?', answerLead: 'Cuatro', answer: 'piezas' })
    expect(slots.family).toMatchObject({ kicker: 'El producto · SEO + AEO', lockup: 'asset-ref:file:sv360-name-lockup-negative' })
    expect(slots.productMark).toMatchObject({ top: '--gl-pmk-top=250px', height: '--gl-pmk-height=44px' })
    expect((slots.pieces as { markAlt: string }[]).map(p => p.markAlt)).toEqual(['Efeonce | AEO', 'Efeonce | AEO Assessment', 'Efeonce | AI Visibility Report', 'Efeonce | Insights'])
    expect(built.assets.filter(a => a.kind === 'file').map(a => (a as { path: string }).path.split('/').pop())).toEqual([
      'sv360-logo-negative.svg',
      'sv360-name-lockup-negative.svg',
      'aeo-lockup-negative.svg',
      'aeo-assessment-lockup-negative.svg',
      'ai-visibility-report-lockup-negative.svg',
      'insights-lockup-negative.svg'
    ])

    const intent = sv360Intent('content-brand-family')
    const pieces = intent.pieces as Record<string, unknown>[]

    expectCode(() => plan('content-brand-family', { ...intent, familyMark: 'aeo-lockup-negative' }), 'invalid-intent')
    expectCode(() => plan('content-brand-family', { ...intent, pieces: pieces.map((p, i) => (i === 1 ? { ...p, mark: pieces[0]!.mark } : p)) }), 'invalid-intent')
    expectCode(() => plan('content-brand-family', { ...intent, pieces: pieces.map((p, i) => (i === 0 ? { ...p, mark: 'hubspot-logo' } : p)) }), 'invalid-intent')
    expectCode(() => plan('content-brand-family', { ...intent, pieces: pieces.slice(0, 3) }), 'invalid-intent')
  })

  it('los servicios: el anillo toma el puntaje y las maquetas llevan sus cuentas exactas', () => {
    const { slots } = plan('content-service-mockups')
    const intent = sv360Intent('content-service-mockups')

    expect((slots.frame as Record<string, string>).scoreDash).toBe('--gl-ssm-score-dash=307.88')
    expect(slots.technical).toMatchObject({ score: '98', scoreLabel: 'Core Web<br>Vitals<br><strong>en verde</strong>' })
    expect(slots.authority).toMatchObject({ value: '+18', label: 'dominios<br>que te enlazan' })

    expectCode(() => plan('content-service-mockups', { ...intent, technicalScore: 101 }), 'invalid-intent')
    expectCode(() => plan('content-service-mockups', { ...intent, technicalScore: '98' }), 'invalid-intent')
    expectCode(() => plan('content-service-mockups', { ...intent, contentNodes: (intent.contentNodes as string[]).slice(0, 5) }), 'invalid-intent')
    expectCode(() => plan('content-service-mockups', { ...intent, chips: [] }), 'invalid-intent')
  })

  it('el informe: las barras son proporcionales a la marca del cliente, un formato destacado y los íconos son Trazo de AXIS', () => {
    const { slots, built } = plan('content-report-formats')
    const intent = sv360Intent('content-report-formats')

    expect((slots.ranking as { bar: string; role: string }[]).map(r => [r.bar, r.role])).toEqual([
      ['--gl-srf-bar=100%', 'lead'],
      ['--gl-srf-bar=82.35%', 'rest'],
      ['--gl-srf-bar=61.76%', 'rest'],
      ['--gl-srf-bar=50%', 'rest']
    ])
    expect((slots.formats as { role: string }[]).map(f => f.role)).toEqual(['rest', 'rest', 'lead', 'rest', 'rest'])
    expect(built.assets.filter(a => a.ref.startsWith('asset-ref:icon:')).map(a => a.ref)).toEqual(
      ['correo', 'web', 'presentacion', 'contrato', 'informe'].map(glyph => `asset-ref:icon:${glyph}-engine-dark-40`)
    )

    const ranking = intent.ranking as Record<string, unknown>[]

    expectCode(() => plan('content-report-formats', { ...intent, ranking: ranking.map((r, i) => (i === 1 ? { ...r, share: 40 } : r)) }), 'invalid-intent')
    expectCode(() => plan('content-report-formats', { ...intent, highlightedFormat: 6 }), 'invalid-intent')
    expectCode(() => plan('content-report-formats', { ...intent, formats: (intent.formats as Record<string, unknown>[]).map((f, i) => (i === 0 ? { ...f, icon: 'fax' } : f)) }), 'invalid-intent')
  })

  it('el comité y las industrias: la cifra, la anotación y la industria destacada', () => {
    const committee = plan('content-committee-deck').slots
    const industries = plan('content-industries').slots

    expect(committee.slide).toMatchObject({ figure: '+38%', figureLabel: 'visibilidad en el trimestre', annotation: 'Guía de precios' })
    expect((industries.industries as { number: string; role: string }[]).map(i => `${i.number}:${i.role}`)).toEqual(['01:lead', '02:rest', '03:rest', '04:rest', '05:rest', '06:rest'])

    const intent = sv360Intent('content-industries')

    expectCode(() => plan('content-industries', { ...intent, highlightedIndustry: 0 }), 'invalid-intent')
    expectCode(() => plan('content-committee-deck', { ...sv360Intent('content-committee-deck'), slideFigure: { value: '+38%' } }), 'invalid-intent')
  })

  it('los mercados: cada etiqueta sale de su nodo medido en el plate, del lado declarado', () => {
    const { slots } = plan('content-markets')
    const intent = sv360Intent('content-markets')
    const markets = intent.markets as Record<string, unknown>[]

    // Miami (1112, 215) × 1,25 − 100 = (1390, 169): la etiqueta arranca 22 px a la derecha y sube 26.
    expect((slots.markets as Record<string, string>[])[0]).toMatchObject({ country: 'EE. UU.', side: 'start', x: '--gl-smk-x=1412px', top: '--gl-smk-top=143px' })
    // Ciudad de México (958, 283) → (1198, 254): la etiqueta termina 22 px a la izquierda (right = 1920 − 1198 + 22).
    expect((slots.markets as Record<string, string>[])[1]).toMatchObject({ side: 'end', x: '--gl-smk-x=744px', top: '--gl-smk-top=228px' })

    expectCode(() => plan('content-markets', { ...intent, markets: markets.map((m, i) => (i === 0 ? { ...m, node: [2000, 215] } : m)) }), 'invalid-intent')
    expectCode(() => plan('content-markets', { ...intent, markets: markets.map((m, i) => (i === 0 ? { ...m, side: 'arriba' } : m)) }), 'invalid-intent')
    expectCode(() => plan('content-markets', { ...intent, photo: { ...(intent.photo as object), plateRef: 'ai-generations/x/plates/MK1-mercados.png' } } as Intent), 'invalid-intent')
  })

  describe('en la plantilla real', () => {
    let browser: Browser

    beforeAll(async () => {
      browser = await launchComposerBrowser()
    })

    afterAll(async () => {
      await browser.close()
    })

    const PROBE = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#123456"/></svg>').toString('base64')}`

    it('las seis se rellenan en Chromium: listas completas, un destacado y el lockup donde va', async () => {
      const templatesDir = graphicLineDeckCatalog.templatesDir
      const registry = await loadRegistry({ templatesDir })
      const counts: Record<string, Record<string, number>> = {}

      for (const [id, name] of Object.entries(TEMPLATES)) {
        const { slide, built } = plan(id)
        const contract = await loadTemplateContract({ templatesDir }, registry, name)
        const entry = (registry as unknown as { templates: { name: string; prototype: string }[] }).templates.find(t => t.name === name)!
        const externalAssets = Object.fromEntries(built.assets.map(asset => [asset.ref.replace(/^asset-ref:/, ''), PROBE]))
        const page = await browser.newPage({ viewport: contract.viewport })

        try {
          await fillSlide(page, path.join(templatesDir, entry.prototype), slide, contract, { ...graphicLineDeckCatalog, externalAssets })
          counts[id] = await page.evaluate(() => ({
            items: document.querySelectorAll('ol[data-slot] > li').length,
            lead: document.querySelectorAll('.gl-item-lead').length,
            marks: Array.from(document.querySelectorAll('.gl-product-mark')).filter(node => node.children.length > 0).length
          }))
        } finally {
          await page.close()
        }
      }

      expect(counts).toEqual({
        'content-brand-family': { items: 4, lead: 0, marks: 1 },
        'content-service-mockups': { items: 4 + 6 + 3 + 3, lead: 0, marks: 1 },
        'content-report-formats': { items: 3 + 4 + 5, lead: 2, marks: 1 },
        'content-committee-deck': { items: 3, lead: 0, marks: 1 },
        'content-industries': { items: 6, lead: 1, marks: 1 },
        'content-markets': { items: 5, lead: 0, marks: 1 }
      })
    }, 120_000)
  })
})
