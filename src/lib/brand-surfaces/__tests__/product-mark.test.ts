/**
 * Los slots OPCIONALES que el deck SEO/AEO (TASK-1949) suma a recetas existentes: el lockup de submarca (`productMark`)
 * en la portada de línea, la de propuesta, la propuesta de cine y la sobria, la escalera, el anillo del puntaje, el mapa
 * del diagnóstico y los resultados del día a día; la propuesta de cine SIN eyebrow cuando el lockup ocupa su lugar
 * (`requiredUnless: productMark`), y la bajada opcional del equipo (`section-cine` · `team`).
 *
 * Regla de lessons.md (2026-09-28, TASK-1934): el probe del gate llena SIEMPRE todo slot opcional, así que el camino
 * «ausente» sólo lo prueba un test que COMPONE las recetas existentes SIN el slot. Aquí se rellena la plantilla real en
 * Chromium con los intents aprobados de antes (sin lockup) y con el lockup.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser } from 'playwright'

import { loadRegistry, loadTemplateContract } from '@/lib/artifact-composer/catalog'
import type { SlideSpec } from '@/lib/artifact-composer/contracts'
import { fillSlide, launchComposerBrowser } from '@/lib/artifact-composer/render'
import { createCatalog } from '@/lib/artifact-composer/catalogs/graphic-line-deck'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'
import { AXIS_PRODUCT_MARK_ASSETS, PRODUCT_MARK_EXISTING_RECIPES, PRODUCT_MARKS } from '../recipes/product-mark'

const EXAMPLES = path.join(__dirname, '..', 'examples')

type Intent = SurfaceIntent & Record<string, unknown>

/** La composición `team` de `section-cine` en AXIS: reserva y tipo de la bajada. */
type TeamLayout = { reserves: { body: { fromTop: number } }; type: { body: { px: number; maxWidthPx: number } } }

const example = (file: string): Intent => JSON.parse(fs.readFileSync(path.join(EXAMPLES, file), 'utf8')) as Intent

/** Los intents aprobados de las recetas que admiten el lockup (ninguno lo trae). */
const WITHOUT_MARK = [
  'deck-cover-brochure-line-engine-intent.json',
  'deck-cover-proposal-orbit-intent.json',
  'deck-proposal-cinematic-seo-intent.json',
  'deck-proposal-service-seo-intent.json',
  'deck-proposal-service-aeo-intent.json',
  'deck-method-staircase-intent.json',
  'deck-method-score-ring-intent.json',
  'deck-decision-diagnosis-map-intent.json',
  'deck-content-day-live-results-intent.json'
]

/**
 * La selección y el cursor del lector los pinta el adaptador de Greenhouse (fuera de `src/**`): aquí sólo cuenta el
 * lockup, así que el catálogo se arma con pintores vacíos.
 */
const catalog = createCatalog({
  selectionPainter: () => ({ underlay: '', overlay: '', withinCanvas: true }),
  ctaPainter: () => ({ overlay: '', bottom: 0, withinCanvas: true })
})

const PROBE = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="#123456"/></svg>').toString('base64')}`

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

describe('lockup de submarca, propuesta de cine sin eyebrow y bajada del equipo (TASK-1949)', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await launchComposerBrowser()
  })

  afterAll(async () => {
    await browser.close()
  })

  /** RELLENA la plantilla real con un slide ya planeado y devuelve qué quedó en el DOM. */
  const fill = async (contentType: string, slide: SlideSpec, assets: { ref: string }[]) => {
    const templatesDir = catalog.templatesDir
    const registry = await loadRegistry({ templatesDir })
    const name = (registry as unknown as { selector: { map: Record<string, string> } }).selector.map[contentType]!
    const contract = await loadTemplateContract({ templatesDir }, registry, name)
    const entry = (registry as unknown as { templates: { name: string; prototype: string }[] }).templates.find(t => t.name === name)!
    const externalAssets = Object.fromEntries(assets.map(asset => [asset.ref.replace(/^asset-ref:/, ''), PROBE]))
    const page = await browser.newPage({ viewport: contract.viewport })

    try {
      await fillSlide(page, path.join(templatesDir, entry.prototype), { ...slide, template: name }, contract, { ...catalog, externalAssets })

      const dom = await page.evaluate(() => {
        const mark = Array.from(document.querySelectorAll('.gl-product-mark')).find(node => node.children.length > 0) as HTMLElement | undefined
        const img = mark?.querySelector('img')
        const box = img?.getBoundingClientRect()
        const body = document.querySelector('.gl-sec-body') as HTMLElement | null

        return {
          marks: Array.from(document.querySelectorAll('.gl-product-mark')).filter(node => node.children.length > 0).length,
          markBox: box ? { left: Math.round(box.left), top: Math.round(box.top), height: Math.round(box.height) } : null,
          markAlt: img?.getAttribute('alt') ?? null,
          eyebrow: document.querySelector('.gl-eyebrow')?.textContent?.trim() ?? null,
          teamBody: body && body.textContent?.trim() ? { top: Math.round(body.getBoundingClientRect().top), px: getComputedStyle(body).fontSize, width: Math.round(body.getBoundingClientRect().width) } : null
        }
      })

      return { violations: validateSlide({ ...slide, template: name } as SlideSpec, contract), dom }
    } finally {
      await page.close()
    }
  }

  const compose = async (intent: Intent) => {
    const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
    const slide = piece.plan.slides[0]! as unknown as SlideSpec

    return { piece, slots: slide.slots as Record<string, unknown>, ...(await fill(piece.contentType, slide, piece.assets)) }
  }

  it('las recetas aprobadas componen SIN lockup: el slot no se declara y no pinta nada', async () => {
    for (const file of WITHOUT_MARK) {
      const { slots, violations, dom } = await compose(example(file))

      expect(violations, file).toEqual([])
      expect(slots.productMark, file).toBeUndefined()
      expect(dom.marks, file).toBe(0)
    }
  }, 180_000)

  it('con el lockup, cada receta lo lleva a su lugar y a su alto, con el archivo oficial y su nombre', async () => {
    const cases: [string, string, { left: number; top: number; height: number }][] = [
      ['deck-cover-brochure-line-engine-intent.json', 'sv360-logo-negative', { left: 140, top: 790, height: 64 }],
      ['deck-cover-proposal-orbit-intent.json', 'sv360-logo-negative', { left: 140, top: 880, height: 56 }],
      ['deck-proposal-cinematic-seo-intent.json', 'sv360-lockup-negative', { left: 140, top: 44, height: 40 }],
      ['deck-proposal-service-aeo-intent.json', 'aeo-lockup-negative', { left: 140, top: 44, height: 40 }],
      ['deck-method-staircase-intent.json', 'aeo-lockup-negative', { left: 140, top: 44, height: 40 }],
      ['deck-method-score-ring-intent.json', 'aeo-assessment-lockup-negative', { left: 140, top: 44, height: 40 }],
      ['deck-decision-diagnosis-map-intent.json', 'ai-visibility-report-lockup-negative', { left: 140, top: 44, height: 40 }],
      ['deck-content-day-live-results-intent.json', 'insights-lockup-negative', { left: 140, top: 44, height: 40 }]
    ]

    for (const [file, mark, box] of cases) {
      const { violations, dom, piece } = await compose({ ...example(file), productMark: mark })

      expect(violations, file).toEqual([])
      expect(dom.marks, file).toBe(1)
      expect(dom.markBox, file).toEqual(box)
      expect(piece.assets.some(asset => (asset as { path?: string }).path?.endsWith(`graphic-line-deck/assets/${mark}.svg`)), file).toBe(true)
    }

    // La forma del catálogo de recetas (`{ asset, alt }`) también vale; el nombre accesible es siempre el del lockup.
    const { dom } = await compose({ ...example('deck-proposal-service-seo-intent.json'), productMark: { asset: 'sv360-lockup-negative', alt: 'otro' } })

    expect(dom.markAlt).toBe('Efeonce | SV360')
  }, 180_000)

  it('el lockup es de una lista cerrada y sólo en las recetas (y composiciones) que lo admiten', () => {
    expect(PRODUCT_MARK_EXISTING_RECIPES.sort()).toEqual(
      ['content-day', 'cover-brochure', 'cover-proposal', 'decision-diagnosis-map', 'method-score-ring', 'method-staircase', 'proposal-cinematic', 'proposal-service'].sort()
    )

    expectCode(() => planSurfacePiece({ ...example('deck-proposal-service-seo-intent.json'), productMark: 'hubspot-logo' } as Intent, { artifactId: 'x' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...example('deck-content-text-intent.json'), productMark: 'sv360-lockup-negative' } as Intent, { artifactId: 'x' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...example('deck-cover-brochure-cine-orbit-intent.json'), productMark: 'sv360-logo-negative' } as Intent, { artifactId: 'x' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...example('deck-method-staircase-flat-intent.json'), productMark: 'aeo-lockup-negative' } as Intent, { artifactId: 'x' }), 'invalid-intent')

    // La lista de AXIS (`surfaces.deck.productMark.assets`) y la del slot difieren sólo en lo conocido: AXIS no lista el
    // logo con que abre la familia (`sv360-logo-negative`) y sí el nombre completo de su cabecera, que no es del slot.
    const slot = Object.keys(PRODUCT_MARKS)

    expect(slot.filter(id => !AXIS_PRODUCT_MARK_ASSETS.includes(id))).toEqual(['sv360-logo-negative'])
    expect(AXIS_PRODUCT_MARK_ASSETS.filter(id => !slot.includes(id))).toEqual(['sv360-name-lockup-negative'])
  })

  it('la propuesta de cine sin eyebrow lleva el lockup en su lugar (140, 112, alto 40); sin ninguno de los dos, no compone', async () => {
    const intent = example('deck-proposal-cinematic-seo-intent.json')
    const withoutEyebrow = { ...intent, voice: { ...(intent.voice as object), eyebrow: undefined } } as Intent

    delete (withoutEyebrow.voice as Record<string, unknown>).eyebrow

    expectCode(() => planSurfacePiece(withoutEyebrow, { artifactId: 'x' }), 'invalid-intent')

    const { violations, dom } = await compose({ ...withoutEyebrow, productMark: 'aeo-lockup-negative' })

    expect(violations).toEqual([])
    // El eyebrow ausente no deja texto (el renderer vacía o retira su nodo).
    expect(dom.eyebrow ?? '').toBe('')
    expect(dom.markBox).toEqual({ left: 140, top: 112, height: 40 })
  }, 60_000)

  it('la bajada del equipo es opcional: el equipo aprobado compone sin ella; con ella va al pie de la columna', async () => {
    const team = example('deck-section-cine-team-intent.json')
    const without = await compose(team)

    expect(without.violations).toEqual([])
    expect(without.slots.body).toBeUndefined()
    expect(without.dom.teamBody).toBeNull()

    // Con bajada pasa por el contrato de AXIS (0.3.40 admite `body` en `team`: reserva 900/1080, cuerpo 22/300, 540 px de
    // ancho) y la plantilla la pinta donde AXIS la reserva.
    const body = 'Lo ejecutan **expertos multidisciplinarios**: copywriters, especialistas en SEO técnico, relacionistas públicos, diseñadores y creativos.'
    const teamTokens = (efeonceGraphicLine.surfaces as unknown as { deck: { recipes: Record<string, { layouts: Record<string, TeamLayout> }> } }).deck.recipes['section-cine']!.layouts.team!
    const withBody = await compose({ ...team, body })

    expect(withBody.violations).toEqual([])
    expect((withBody.slots.body as string).includes('<strong>expertos multidisciplinarios</strong>')).toBe(true)
    expect(withBody.dom.teamBody).toEqual({
      top: Math.round(teamTokens.reserves.body.fromTop * 1080),
      px: `${teamTokens.type.body.px}px`,
      width: teamTokens.type.body.maxWidthPx
    })
    expect(withBody.dom.teamBody).toEqual({ top: 900, px: '22px', width: 540 })
  }, 60_000)
})
