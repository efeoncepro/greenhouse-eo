/**
 * Los slots OPCIONALES nuevos de las plantillas compartidas del marco (TASK-1942, AXIS 0.3.31): la marca de partner de
 * la portada de línea (`partnerMark` = la insignia, claim con readback; `partnerMarkFallback` = «Operamos sobre» y el
 * logo de la plataforma) y la composición `sloganBlock` de la contraportada de propuesta con su insignia opcional.
 *
 * Regla de lessons.md (2026-09-28, TASK-1934): el probe del gate llena SIEMPRE todo slot opcional y los planes no
 * renderizan, así que el camino «ausente» sólo lo prueba un test que COMPONE las recetas existentes SIN el slot. Aquí se
 * rellena la plantilla real en Chromium con las láminas aprobadas del 27/09 (sin marca) y con las de Salesforce.
 */

import fs from 'node:fs'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser } from 'playwright'

import { loadRegistry, loadTemplateContract } from '@/lib/artifact-composer/catalog'
import type { SlideSpec } from '@/lib/artifact-composer/contracts'
import { fillSlide, launchComposerBrowser } from '@/lib/artifact-composer/render'
import { graphicLineDeckCatalog } from '@/lib/artifact-composer/catalogs/graphic-line-deck'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLES = path.join(__dirname, '..', 'examples')

type Intent = SurfaceIntent & Record<string, unknown>

const example = (file: string): Intent => JSON.parse(fs.readFileSync(path.join(EXAMPLES, file), 'utf8')) as Intent

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

describe('marca de partner y eslogan en bloque (TASK-1942)', () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await launchComposerBrowser()
  })

  afterAll(async () => {
    await browser.close()
  })

  /** Planifica el intent, valida el contrato y RELLENA la plantilla real; devuelve qué quedó en el DOM. */
  const compose = async (intent: Intent) => {
    const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
    const slide = piece.plan.slides[0]! as unknown as SlideSpec
    const templatesDir = graphicLineDeckCatalog.templatesDir
    const registry = await loadRegistry({ templatesDir })
    const name = (registry as unknown as { selector: { map: Record<string, string> } }).selector.map[piece.contentType]!
    const contract = await loadTemplateContract({ templatesDir }, registry, name)
    const entry = (registry as unknown as { templates: { name: string; prototype: string }[] }).templates.find(t => t.name === name)!
    const externalAssets = Object.fromEntries(piece.assets.map(asset => [asset.ref.replace(/^asset-ref:/, ''), PROBE]))
    const page = await browser.newPage({ viewport: contract.viewport })

    try {
      await fillSlide(page, path.join(templatesDir, entry.prototype), { ...slide, template: name }, contract, { ...graphicLineDeckCatalog, externalAssets })

      const dom = await page.evaluate(() => ({
        badges: document.querySelectorAll('.gl-pm-badge').length,
        labels: Array.from(document.querySelectorAll('.gl-pm-label')).map(node => node.textContent?.trim()),
        logos: Array.from(document.querySelectorAll('.gl-pm-logo')).map(node => node.getAttribute('alt')),
        // Un slot opcional ausente vacía su nodo (el renderer lo deja sin hijos): lo que cuenta es lo que se pinta.
        marks: Array.from(document.querySelectorAll('.gl-partner-mark')).filter(node => node.children.length > 0).length,
        logoWidth: (document.querySelector('.gl-logo') as HTMLElement | null)?.getBoundingClientRect().width ?? null,
        sloganPx: document.querySelector('.gl-slogan') ? getComputedStyle(document.querySelector('.gl-slogan')!).fontSize : null
      }))

      return { piece, slots: slide.slots as Record<string, unknown>, violations: validateSlide({ ...slide, template: name } as SlideSpec, contract), dom }
    } finally {
      await page.close()
    }
  }

  it('las portadas y contraportadas aprobadas del 27/09 componen SIN marca: los dos slots no pintan nada', async () => {
    for (const file of ['deck-cover-brochure-line-revenue-intent.json', 'deck-cover-brochure-intent.json', 'deck-close-proposal-horizon-intent.json']) {
      if (!fs.existsSync(path.join(EXAMPLES, file))) continue

      const { slots, violations, dom } = await compose(example(file))

      expect(violations, file).toEqual([])
      expect(slots.partnerMark, file).toBeUndefined()
      expect(slots.partnerMarkFallback, file).toBeUndefined()
      expect(dom.marks, file).toBe(0)
    }
  }, 120_000)

  it('la contraportada del 27/09 conserva el logo de 500 px y el eslogan suelto de 72 px', async () => {
    const { dom, slots } = await compose(example('deck-close-proposal-horizon-intent.json'))

    expect(dom.logoWidth).toBe(500)
    expect(dom.sloganPx).toBe('72px')
    expect((slots.frame as Record<string, unknown>).contactSocialBelow).toBe('--gl-contact-social-below=0px')
    expect((slots.frame as Record<string, unknown>).sloganRunLeading).toBe('--gl-slogan-run-leading=1.15')
  }, 60_000)

  it('la portada Salesforce con «Operamos sobre» pinta el respaldo y no la insignia', async () => {
    const { violations, dom } = await compose(example('deck-cover-brochure-line-revenue-salesforce-intent.json'))

    expect(violations).toEqual([])
    expect(dom.labels).toEqual(['OPERAMOS SOBRE'])
    expect(dom.logos).toEqual(['Salesforce'])
    expect(dom.badges).toBe(0)
  }, 60_000)

  it('la portada Salesforce cuelga la columna de 190 (reservesByLine, AXIS 0.3.32); las demás líneas siguen en 200', () => {
    const salesforce = planSurfacePiece(example('deck-cover-brochure-line-revenue-salesforce-intent.json'), { artifactId: 'x' })
    const frame = salesforce.plan.slides[0]!.slots as { frame: Record<string, unknown> }

    expect(frame.frame.logoTop).toBe('--gl-logo-top=190px')
    expectCode(() => planSurfacePiece({ ...example('deck-cover-brochure-line-revenue-intent.json'), column: { topPx: 190 } } as Intent, { artifactId: 'x' }), 'invalid-intent')
  })

  it('la insignia es un claim: sólo con readback vigente, sólo en la portada de línea y de la plataforma de la línea', async () => {
    const salesforce = example('deck-cover-brochure-line-revenue-salesforce-intent.json')
    const withBadge = { ...salesforce, partnerMark: { mode: 'badge', readbackRef: 'readback Partner Community 2026-09-29' } }
    const { violations, dom, piece } = await compose(withBadge as Intent)

    expect(violations).toEqual([])
    expect(dom.badges).toBe(1)
    expect(dom.labels).toEqual([])
    expect(piece.assets.some(asset => (asset as { path?: string }).path?.endsWith('assets/partners/salesforce-partner-badge-horizontal.svg'))).toBe(true)

    expectCode(() => planSurfacePiece({ ...salesforce, partnerMark: { mode: 'badge' } } as Intent, { artifactId: 'x' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...salesforce, partnerMark: { mode: 'badge', readbackRef: ' ' } } as Intent, { artifactId: 'x' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...salesforce, line: 'growth', partnerMark: { mode: 'badge', readbackRef: 'r' } } as Intent, { artifactId: 'x' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...salesforce, partnerMark: { mode: 'operates-on', logo: { path: 'ai-generations/x.svg', alt: 'x' } } } as Intent, { artifactId: 'x' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...salesforce, partnerMark: { mode: 'sello' } } as Intent, { artifactId: 'x' }), 'invalid-intent')
  }, 60_000)

  it('la contraportada Salesforce compone el eslogan en bloque: logo de 700 px y eslogan al 64 % de su ancho', async () => {
    const { violations, dom, slots } = await compose(example('deck-close-proposal-horizon-revenue-salesforce-intent.json'))
    const frame = slots.frame as Record<string, string>

    expect(violations).toEqual([])
    expect(dom.logoWidth).toBe(700)
    // 0,64 × 700 ÷ 12,278 em («Revenue») = 36,5 px, sobre el mínimo del acento (24 px).
    expect(dom.sloganPx).toBe('36.5px')
    expect(frame.sloganTop).toBe('--gl-slogan-top=427px')
    expect(frame.contactSocialBelow).toBe('--gl-contact-social-below=14px')
    // Delta (q) de AXIS: los tramos del eslogan con interlineado `normal`, como en la lámina aprobada (la caja conserva 1).
    expect(frame.sloganRunLeading).toBe('--gl-slogan-run-leading=normal')
    expect(dom.marks).toBe(0)
  }, 60_000)

  it('la insignia de la contraportada va sólo con el eslogan en bloque y con readback', async () => {
    const salesforce = example('deck-close-proposal-horizon-revenue-salesforce-intent.json')
    const { dom, violations } = await compose({ ...salesforce, partnerMark: { mode: 'badge', readbackRef: 'readback Partner Community 2026-09-29' } } as Intent)

    expect(violations).toEqual([])
    expect(dom.badges).toBe(1)

    expectCode(() => planSurfacePiece({ ...salesforce, partnerMark: { mode: 'badge' } } as Intent, { artifactId: 'x' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...salesforce, partnerMark: { mode: 'operates-on', logo: { path: 'public/images/logos/partners/salesforce.com_logo.svg', alt: 'Salesforce' } } } as Intent, { artifactId: 'x' }), 'invalid-intent')
    expectCode(() => planSurfacePiece({ ...example('deck-close-proposal-horizon-intent.json'), partnerMark: { mode: 'badge', readbackRef: 'r' } } as Intent, { artifactId: 'x' }), 'invalid-intent')
  }, 60_000)
})
