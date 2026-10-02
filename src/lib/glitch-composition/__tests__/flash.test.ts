import { readFileSync } from 'node:fs'
import path from 'node:path'

import { glitchLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import { resolvePlan } from '@/lib/artifact-composer/catalog'
import { createGlitchCarouselCatalog, createGlitchStillsCatalog } from '@/lib/artifact-composer/catalogs/glitch'

import {
  GlitchPieceError,
  buildGlitchFlashTrailSvg,
  computeGlitchFlashTrail,
  isGlitchFlashPlan,
  parseGlitchEditionManifest,
  parseGlitchFlashManifest,
  parseGlitchManifest,
  planGlitchEdition,
  planGlitchFlash,
  planGlitchManifest
} from '..'
import type { GlitchFlashManifest } from '../manifest'

const FLASH_EXAMPLE = path.resolve(__dirname, '../examples/flash-sonnet-5-5.example.json')
const WEEKLY_EXAMPLE = path.resolve(__dirname, '../examples/edition-17.example.json')

const loadFlash = (): GlitchFlashManifest => JSON.parse(readFileSync(FLASH_EXAMPLE, 'utf8'))
const loadWeekly = () => JSON.parse(readFileSync(WEEKLY_EXAMPLE, 'utf8'))

const issuesOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(GlitchPieceError)

    return { code: (error as GlitchPieceError).code, issues: (error as GlitchPieceError).issues }
  }

  return null
}

/** Las 34 celdas del SVG del primer Flash aprobado y publicado (2026-09-28): x,y,opacidad. */
const APPROVED_TRAIL =
  '0,36,0.22 12,0,0.27 24,48,0.32 36,12,0.38 48,12,0.44 48,36,0.44 60,49,0.5 72,24,0.57 72,35,0.57 84,-1,0.64 84,12,0.64 84,23,0.64 84,35,0.64 84,49,0.64 96,0,0.71 96,24,0.71 96,36,0.71 96,49,0.71 108,0,0.78 108,25,0.78 108,37,0.78 108,48,0.78 120,11,0.85 120,23,0.85 120,36,0.85 120,47,0.85 132,-1,0.92 132,11,0.92 132,23,0.92 132,48,0.92 144,0,1 144,23,1 144,35,1 144,47,1'

describe('manifiesto del Glitch Flash', () => {
  it('valida el ejemplo: sin número, una noticia, muletilla en dos líneas', () => {
    const m = parseGlitchFlashManifest(loadFlash())

    expect(m.example).toBe(true)
    expect(m.edition).toEqual({ kind: 'flash', slug: 'ejemplo-claude-sonnet-5-5', title: '[Ejemplo] Claude Sonnet 5.5', publishDate: '2026-09-28' })
    expect(m.news).toHaveLength(1)
    expect(m.back.closingLine).toEqual(['léelo completo', 'en nuestro blog.'])
    expect(parseGlitchManifest(loadFlash())).toEqual(m)
  })

  it('rechaza un número de edición con flash-edition-number-not-allowed', () => {
    const m = loadFlash() as unknown as { edition: Record<string, unknown> }

    m.edition.number = 18
    const result = issuesOf(() => parseGlitchFlashManifest(m))

    expect(result?.code).toBe('manifest-invalid')
    expect(result?.issues).toContainEqual(expect.objectContaining({ code: 'flash-edition-number-not-allowed', path: 'edition.number' }))
  })

  it('rechaza la edición anterior: el Flash queda fuera de la rotación de portadas', () => {
    const m = { ...loadFlash(), previousEdition: { number: 16, coverTemplate: 'C' } }

    expect(issuesOf(() => parseGlitchFlashManifest(m))?.issues).toContainEqual(expect.objectContaining({ code: 'field-unknown', path: 'previousEdition' }))
  })

  it('rechaza dos noticias: el Flash es una sola', () => {
    const m = loadFlash()

    m.news = [m.news[0], m.news[0]]

    expect(issuesOf(() => parseGlitchFlashManifest(m))?.issues).toContainEqual(expect.objectContaining({ path: 'news', message: 'sobran elementos: se esperan exactamente 1' }))
  })

  it('exige la muletilla de la contraportada, y no más de dos líneas', () => {
    const sin = loadFlash() as unknown as { back: Record<string, unknown> }

    delete sin.back.closingLine
    expect(issuesOf(() => parseGlitchFlashManifest(sin))?.issues).toContainEqual(expect.objectContaining({ code: 'field-required', path: 'back.closingLine' }))

    const tres = loadFlash()

    tres.back.closingLine = ['uno', 'dos', 'tres']
    expect(issuesOf(() => parseGlitchFlashManifest(tres))?.code).toBe('manifest-invalid')

    const una = loadFlash()

    una.back.closingLine = 'léelo en el blog.'
    expect(parseGlitchFlashManifest(una).back.closingLine).toBe('léelo en el blog.')
  })

  it('rechaza la muletilla que el operador descartó y la que anuncia la próxima edición por número', () => {
    for (const closingLine of [['el resto,', 'el lunes.'], 'el #18 sale el lunes.']) {
      const m = loadFlash()

      m.back.closingLine = closingLine
      expect(issuesOf(() => parseGlitchFlashManifest(m))?.issues, String(closingLine)).toContainEqual(expect.objectContaining({ path: 'back.closingLine' }))
    }
  })

  it('los manifiestos semanales no cambian: el despachador los valida y planifica igual que antes', () => {
    const weekly = loadWeekly()

    expect(parseGlitchManifest(weekly)).toEqual(parseGlitchEditionManifest(weekly))
    expect(planGlitchManifest(weekly)).toEqual(planGlitchEdition(weekly))
    expect(isGlitchFlashPlan(planGlitchManifest(weekly))).toBe(false)
    // Un `kind` en la semanal sigue siendo un campo desconocido: el esquema semanal no se tocó.
    expect(issuesOf(() => parseGlitchEditionManifest({ ...weekly, edition: { ...weekly.edition, kind: 'weekly' } }))?.code).toBe('manifest-invalid')
  })
})

describe('excepción de licencia `press` del Glitch Flash', () => {
  const PRESS = {
    kind: 'press',
    ref: 'https://www.anthropic.com/news/claude-sonnet-5-5',
    approval: { approvedBy: 'julio-reyes', approvedOn: '2026-09-28', flash: 'ejemplo-claude-sonnet-5-5', reason: 'Imagen oficial del anuncio; el operador la aprueba para esta pieza.' }
  }

  const withPress = (patch: Record<string, unknown> = {}, where: 'news' | 'cover' = 'news') => {
    const m = loadFlash() as unknown as { news: { photo: Record<string, unknown> }[]; cover: { photo: Record<string, unknown> | null } }
    const target = where === 'news' ? m.news[0].photo : m.cover.photo!

    target.license = { ...PRESS, ...patch }
    target.credit = 'Imagen: Anthropic'

    return m
  }

  it('la acepta con fuente https, crédito y la aprobación del registro para ESTA pieza, y el plan la entrega a la procedencia', () => {
    const plan = planGlitchFlash(withPress())

    expect(plan.licenseExceptions).toEqual([
      {
        photo: 'news',
        file: 'fotos/n3.png',
        kind: 'press',
        ref: PRESS.ref,
        credit: 'Imagen: Anthropic',
        approvedBy: 'julio-reyes',
        approverName: 'Julio Reyes',
        approvedOn: '2026-09-28',
        flash: 'ejemplo-claude-sonnet-5-5',
        reason: PRESS.approval.reason
      }
    ])
    expect(plan.carousel.plan.slides.find((s) => s.slideId === 'news')?.slots).toMatchObject({ credit: 'Imagen: Anthropic', photoLicense: `press:${PRESS.ref}` })
  })

  it('no la inventa: el ejemplo con fotos propias no declara excepciones', () => {
    expect(planGlitchFlash(loadFlash()).licenseExceptions).toEqual([])
  })

  it('pasa el catálogo real (la validación de crédito admite press sólo en el Flash)', async () => {
    const plan = planGlitchFlash(withPress({}, 'cover'))
    const carousel = await resolvePlan(createGlitchCarouselCatalog(), plan.carousel.plan)

    expect(plan.licenseExceptions.map((e) => e.photo)).toEqual(['cover'])
    expect(carousel.validators.every((v) => v.result === 'pass')).toBe(true)
  })

  it('exige la aprobación, de alguien del registro y para este Flash', () => {
    const sinAprobacion = withPress()

    delete (sinAprobacion.news[0].photo.license as Record<string, unknown>).approval
    expect(issuesOf(() => parseGlitchFlashManifest(sinAprobacion))?.issues).toContainEqual(
      expect.objectContaining({ code: 'press-license-approval-required', path: 'news[0].photo.license.approval' })
    )

    expect(issuesOf(() => parseGlitchFlashManifest(withPress({ approval: { ...PRESS.approval, approvedBy: 'alguien-mas' } })))?.issues).toContainEqual(
      expect.objectContaining({ code: 'press-license-approver-unknown', path: 'news[0].photo.license.approval.approvedBy' })
    )

    expect(issuesOf(() => parseGlitchFlashManifest(withPress({ approval: { ...PRESS.approval, flash: 'otro-flash' } })))?.issues).toContainEqual(
      expect.objectContaining({ code: 'press-license-approval-mismatch', path: 'news[0].photo.license.approval.flash' })
    )
  })

  it('exige una fuente pública https y el crédito visible', () => {
    expect(issuesOf(() => parseGlitchFlashManifest(withPress({ ref: 'kit de prensa de Anthropic' })))?.issues.map((i) => i.path)).toContain('news[0].photo.license.ref')
    expect(issuesOf(() => parseGlitchFlashManifest(withPress({ ref: 'http://www.anthropic.com/news' })))?.issues.map((i) => i.path)).toContain('news[0].photo.license.ref')

    const sinCredito = withPress()

    sinCredito.news[0].photo.credit = ' '
    expect(issuesOf(() => parseGlitchFlashManifest(sinCredito))?.issues.map((i) => i.path)).toContain('news[0].photo.credit')
  })
})

describe('planGlitchFlash', () => {
  it('da un carrusel de tres láminas, sin número ni avance, con los contentTypes del Flash', () => {
    const plan = planGlitchFlash(loadFlash())

    expect(isGlitchFlashPlan(plan)).toBe(true)
    expect(plan).toMatchObject({ kind: 'flash', slug: 'ejemplo-claude-sonnet-5-5', title: 'Glitch Flash · [Ejemplo] Claude Sonnet 5.5', edition: null, coverTemplate: null })
    expect(plan.carousel.plan.artifactId).toBe('glitch-flash-ejemplo-claude-sonnet-5-5-carousel')
    expect(plan.carousel.plan.slides.map((s) => s.contentType)).toEqual(['glitch.flash.cover', 'glitch.flash.interior', 'glitch.flash.back'])
    expect(plan.stills.plan.slides.map((s) => s.contentType)).toEqual(['glitch.flash.threads', 'glitch.flash.blog.banner', 'glitch.flash.blog.news'])
    expect(plan.overlays.plan.slides).toEqual([])

    for (const slide of [...plan.carousel.plan.slides, ...plan.stills.plan.slides]) {
      expect(slide.slots, slide.slideId).not.toHaveProperty('edition')
      expect(slide.slots, slide.slideId).not.toHaveProperty('progress')
      expect(slide.slots, slide.slideId).not.toHaveProperty('previousCoverTemplate')
      expect(slide, slide.slideId).not.toHaveProperty('template')
    }
  })

  it('la portada usa su foto; la noticia y el banner interno, la de la noticia; la muletilla va en dos líneas', () => {
    const plan = planGlitchFlash(loadFlash())
    const byRef = Object.fromEntries(plan.assets.map((a) => [a.ref, a.path]))

    expect(byRef).toEqual({
      'photo:cover': 'fotos/n5.png',
      'photo:news': 'fotos/n3.png',
      'photo:threads': 'fotos/n5.png',
      'photo:blog-banner': 'fotos/n5.png',
      'photo:blog-news': 'fotos/n3.png'
    })
    expect((plan.carousel.plan.slides[2].slots as Record<string, unknown>).closingLine).toBe('léelo completo<br>en nuestro blog.')

    const m = loadFlash()

    m.cover.photo = null
    expect(planGlitchFlash(m).assets.find((a) => a.ref === 'photo:cover')?.path).toBe('fotos/n3.png')
  })

  it('escapa la muletilla: el único marcado que viaja es el salto de línea', () => {
    const m = loadFlash()

    m.back.closingLine = ['a <b>', 'y & c']
    expect((planGlitchFlash(m).carousel.plan.slides[2].slots as Record<string, unknown>).closingLine).toBe('a &lt;b&gt;<br>y &amp; c')
  })

  it('sin licencia de Guttery no se compone: la contraportada lleva la muletilla del narrador', () => {
    expect(issuesOf(() => planGlitchFlash(loadFlash(), { narratorLicenseStatus: 'pending' }))?.code).toBe('font-license-missing')
  })

  it('el plan resuelve contra el catálogo real: plantillas Flash* y validadores en verde', async () => {
    const m = loadFlash()

    m.outputs = { stills: ['cover', 'interior', 'back', 'threads', 'blog:banner', 'blog:news'] }

    const plan = planGlitchFlash(m)
    const carousel = await resolvePlan(createGlitchCarouselCatalog(), plan.carousel.plan)
    const stills = await resolvePlan(createGlitchStillsCatalog(), plan.stills.plan)

    expect(carousel.slides.map((s) => s.template)).toEqual(['FlashCover', 'FlashInterior', 'FlashBackCover'])
    expect(carousel.validators.every((v) => v.result === 'pass')).toBe(true)
    expect(stills.slides.map((s) => s.template)).toEqual(['FlashCover', 'FlashInterior', 'FlashBackCover', 'FlashThreads', 'FlashBlogBanner', 'FlashNewsBanner'])
    expect(stills.validators.every((v) => v.result === 'pass')).toBe(true)
  })
})

describe('estela de bytes del Flash', () => {
  it('reproduce celda por celda el SVG del primer Flash aprobado (semilla 1755 del token)', () => {
    const trail = computeGlitchFlashTrail()

    expect(glitchLine.editions.flash.masthead.trail.seed).toBe(1755)
    expect(trail.cells.map((c) => `${c.x},${c.y},${c.opacity}`).join(' ')).toBe(APPROVED_TRAIL)
    expect([trail.width, trail.height, trail.cell]).toEqual([154, 58, 10])
  })

  it('sigue al token: columnas en el paso, opacidad creciente hacia la palabra hasta 1', () => {
    const spec = glitchLine.editions.flash.masthead.trail
    const trail = computeGlitchFlashTrail()
    const columns = [...new Set(trail.cells.map((c) => c.x))]

    expect(columns.every((x) => x % spec.stepPx === 0 && x / spec.stepPx < spec.columns)).toBe(true)
    expect(Math.max(...trail.cells.map((c) => c.opacity))).toBe(spec.opacity.to)
    expect(Math.min(...trail.cells.map((c) => c.opacity))).toBeGreaterThanOrEqual(spec.opacity.from)

    for (let i = 1; i < trail.cells.length; i++) expect(trail.cells[i].opacity).toBeGreaterThanOrEqual(trail.cells[i - 1].opacity)
  })

  it('es determinista y cambia con la semilla', () => {
    const spec = glitchLine.editions.flash.masthead.trail

    expect(buildGlitchFlashTrailSvg('#000000')).toBe(buildGlitchFlashTrailSvg('#000000'))
    expect(computeGlitchFlashTrail({ ...spec, seed: 1756 }).cells).not.toEqual(computeGlitchFlashTrail().cells)
  })

  it('el asset del catálogo es el que genera el token (pnpm glitch:tokens)', () => {
    const asset = readFileSync(path.resolve(__dirname, '../../artifact-composer/catalogs/glitch/assets/flash-trail.svg'), 'utf8')

    expect(asset).toBe(buildGlitchFlashTrailSvg(glitchLine.color.accent))
  })
})
