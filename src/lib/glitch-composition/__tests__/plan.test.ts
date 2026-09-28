import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { resolvePlan } from '@/lib/artifact-composer/catalog'
import { createGlitchCarouselCatalog, createGlitchOverlaysCatalog, createGlitchStillsCatalog } from '@/lib/artifact-composer/catalogs/glitch'

import { GlitchPieceError, attachFractures, fitRegion, planGlitchEdition, resolveCoverTemplate } from '..'
import type { GlitchEditionManifest } from '../manifest'

const EXAMPLE = path.resolve(__dirname, '../examples/edition-17.example.json')
/** El ejemplo pide también blog y reel (Slice 7): aquí se prueba el carrusel y sus láminas sueltas. */
const load = (): GlitchEditionManifest => ({ ...JSON.parse(readFileSync(EXAMPLE, 'utf8')), outputs: { stills: [], overlays: [] } })

const withCover = (patch: Partial<GlitchEditionManifest['cover']>, previous: 'A' | 'B' | 'C' | 'none', strong = true): GlitchEditionManifest => {
  const m = load()

  m.cover = { ...m.cover, ...patch }
  m.previousEdition.coverTemplate = previous
  m.news[0].photo.strong = strong

  return m
}

const codeOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(GlitchPieceError)

    return (error as GlitchPieceError).code
  }

  return null
}

describe('resolveCoverTemplate — rotación A > B > C, nunca la de la semana anterior', () => {
  const pov = { entry: 'La IA ya no está', punch: 'al lado. Está adentro.' }
  const mosaic = ['n2', 'n4', 'n5', 'n7']

  it.each([
    ['todo califica, la anterior fue C', { standalonePov: pov, mosaic }, 'C', true, 'A'],
    ['todo califica, la anterior fue A', { standalonePov: pov, mosaic }, 'A', true, 'B'],
    ['sin POV suelto, la anterior fue A', { standalonePov: null, mosaic }, 'A', true, 'C'],
    ['foto débil, la anterior fue B', { standalonePov: pov, mosaic }, 'B', false, 'C'],
    ['sólo mosaico, primera edición', { standalonePov: null, mosaic }, 'none', false, 'C'],
    ['sólo foto fuerte, primera edición', { standalonePov: null, mosaic: null }, 'none', true, 'A']
  ] as const)('%s → %s', (_label, patch, previous, strong, expected) => {
    expect(resolveCoverTemplate(withCover(patch as Partial<GlitchEditionManifest['cover']>, previous, strong))).toBe(expected)
  })

  it('sin candidata distinta a la de la semana anterior, falla cerrado (cover-rotation-unsatisfiable)', () => {
    expect(codeOf(() => resolveCoverTemplate(withCover({ standalonePov: null, mosaic: null }, 'A', true)))).toBe('cover-rotation-unsatisfiable')
  })

  it('sin licencia de Guttery, la portada B no es candidata', () => {
    const m = withCover({ mosaic: null }, 'A', true)

    expect(resolveCoverTemplate(m, { narratorLicenseStatus: 'licensed' })).toBe('B')
    expect(codeOf(() => resolveCoverTemplate(m, { narratorLicenseStatus: 'pending' }))).toBe('cover-rotation-unsatisfiable')
  })
})

describe('planGlitchEdition', () => {
  it('el ejemplo #17 da un carrusel de 10 láminas en orden, con la portada A (la anterior fue C)', () => {
    const plan = planGlitchEdition(load())

    expect(plan.coverTemplate).toBe('A')
    expect(plan.carousel.catalog).toBe('glitch-carousel')
    expect(plan.carousel.plan.artifactId).toBe('glitch-17-carousel')
    expect(plan.carousel.plan.slides.map((s) => s.slideId)).toEqual(['cover', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'back'])
    expect(plan.carousel.plan.slides.map((s) => s.contentType)).toEqual([
      'glitch.cover.a',
      'glitch.interior.opening',
      'glitch.interior',
      'glitch.interior.lens',
      'glitch.interior',
      'glitch.interior',
      'glitch.interior',
      'glitch.interior',
      'glitch.interior',
      'glitch.back'
    ])
  })

  it('ninguna lámina elige plantilla: el plan trae intención (contentType + slots), nunca `template`', () => {
    for (const slide of planGlitchEdition(load()).carousel.plan.slides) expect(slide).not.toHaveProperty('template')
  })

  it('pide cada foto al tamaño exacto de su hueco, con su falla y los rostros en px del lienzo', () => {
    const plan = planGlitchEdition(load())
    const cover = plan.assets.find((a) => a.ref === 'photo:cover')!
    const lens = plan.assets.find((a) => a.kind === 'lens')!

    expect(cover).toMatchObject({ kind: 'photo', fit: { width: 1080, height: 660 }, treatment: 'duotone' })
    expect(cover.kind === 'photo' && cover.fractures.map((f) => [f.slideIds, f.profile])).toEqual([[['cover'], 'band']])
    expect(lens).toMatchObject({ ref: 'photo:n3-lens', diameter: 220, fit: { width: 1080, height: 450 } })

    const coverSlots = plan.carousel.plan.slides[0].slots as Record<string, unknown>

    expect(JSON.parse(coverSlots.faces as string)).toEqual([{ x: 626, y: 79, w: 173, h: 185 }])
    expect(coverSlots.photoLicense).toBe('generated:glitch-example-fixtures')
    expect(coverSlots.outlet).toBe('[Ejemplo] Medio · 28 sep')
  })

  it('el remate se parte para que la manzana se pegue a la última palabra', () => {
    const cover = planGlitchEdition(load()).carousel.plan.slides[0].slots as Record<string, unknown>

    expect(cover.headline).toEqual({ entry: 'Te responden antes', punchLead: 'del', punchLast: 'clic.' })
    expect(cover.lines).toEqual([
      { section: 'Creatividad', text: '[Ejemplo] Campaña con video generativo' },
      { section: expect.any(String), text: '[Ejemplo] El agente llena el formulario' }
    ])
  })

  it('la portada C (mosaico) pide cuatro fotos recortadas a su tarjeta', () => {
    const m = load()

    m.previousEdition.coverTemplate = 'A'
    m.cover.standalonePov = null

    const plan = planGlitchEdition(m)
    const mosaic = plan.assets.filter((a) => a.ref.startsWith('photo:mosaic-'))

    expect(plan.coverTemplate).toBe('C')
    expect(mosaic).toHaveLength(4)
    expect(mosaic.every((a) => a.kind === 'photo' && a.fractures[0].clip?.h === 170)).toBe(true)
  })

  it('la noticia 1 con lente se rechaza: abre con «El micrófono se abre»', () => {
    const m = load()

    m.news[0].lens = { region: { x: 0.2, y: 0.2, w: 0.2, h: 0.2 } }

    expect(codeOf(() => planGlitchEdition(m))).toBe('manifest-invalid')
  })

  it('sin licencia de Guttery la edición no se compone: la contraportada lleva la muletilla del narrador', () => {
    expect(codeOf(() => planGlitchEdition(load(), { narratorLicenseStatus: 'pending' }))).toBe('font-license-missing')
  })

  it('las piezas sueltas repiten láminas del carrusel y suman blog, reel y miniatura con la plantilla de portada', () => {
    const m = load()

    m.outputs.stills = ['cover', 'interior:n4', 'blog:banner', 'blog:square', 'blog:news:n3', 'reel:cover', 'video:thumbnail']

    const plan = planGlitchEdition(m)

    expect(plan.stills.plan.slides.map((s) => [s.slideId, s.contentType])).toEqual([
      ['cover', 'glitch.cover.a'],
      ['n4', 'glitch.interior'],
      ['blog-banner', 'glitch.blog.banner.a'],
      ['blog-square', 'glitch.blog.square.a'],
      ['blog-news-n3', 'glitch.blog.news'],
      ['reel-cover', 'glitch.reel.cover'],
      ['video-thumbnail', 'glitch.video.thumbnail']
    ])

    // El banner A del blog se rompe por dos bordes (medido en el canvas); el host va a color y se come por arriba.
    const blog = plan.assets.find((a) => a.ref === 'photo:blog-banner')!
    const reel = plan.assets.find((a) => a.ref === 'photo:reel-cover')!

    expect(blog.kind === 'photo' && blog.fractures.map((f) => `${f.edge}:${f.profile}`)).toEqual(['bottom:band', 'left:side'])
    expect(reel).toMatchObject({ treatment: 'color', fit: { width: 1080, height: 1020 } })
    expect(reel.kind === 'photo' && reel.fractures[0]).toMatchObject({ edge: 'top', profile: 'host' })
  })

  it('la portada del reel sin foto del host se rechaza en el manifiesto', () => {
    const m = load()

    m.outputs.stills = ['reel:cover']
    m.video = { ...m.video!, hostPhoto: null }
    expect(codeOf(() => planGlitchEdition(m))).toBe('manifest-invalid')
  })

  it('el kit de overlays sale del video: cabeceras, lower third, noticias, Drop y cierre por formato', () => {
    const m = load()

    m.outputs.overlays = ['reel']
    m.video = { ...m.video!, guest: { name: 'Invitada', role: 'Rol · Empresa' } }

    const plan = planGlitchEdition(m)
    const ids = plan.overlays.plan.slides.map((s) => s.slideId)

    expect(ids).toEqual(['reel-header-1', 'reel-header-2', 'reel-header-3', 'reel-lower-third-host', 'reel-lower-third-guest', 'reel-news-1', 'reel-news-2', 'reel-news-3', 'reel-drop', 'reel-cta'])

    const slot = (id: string) => plan.overlays.plan.slides.find((s) => s.slideId === id)!.slots as Record<string, unknown>

    expect(slot('reel-lower-third-host').person).toMatchObject({ kind: 'host', tag: 'AL AIRE · GLITCH #17' })
    expect(slot('reel-cta')).toEqual({ closingLine: 'el #18 sale el lunes.', invite: 'Sigue a' })
  })

  it('el cierre del video pinta la muletilla del manifiesto, no una frase fija', async () => {
    const m = load()

    m.outputs.overlays = ['reel', 'vlog']
    m.video = { ...m.video!, closingLine: 'lo demás, en el blog.' }

    const plan = planGlitchEdition(m)
    const ctas = plan.overlays.plan.slides.filter((s) => s.slideId.endsWith('-cta'))

    expect(ctas.map((s) => (s.slots as Record<string, unknown>).closingLine)).toEqual(['lo demás, en el blog.', 'lo demás, en el blog.'])

    const resolved = await resolvePlan(createGlitchOverlaysCatalog(), plan.overlays.plan)

    expect(resolved.slides.filter((s) => s.slideId.endsWith('-cta')).map((s) => s.template)).toEqual(['OverlayCtaReel', 'OverlayCtaVlog'])
  })

  it('attachFractures pega las celdas pintadas sólo en su lámina, sin mutar el plan', () => {
    const plan = planGlitchEdition(load()).carousel.plan
    const cells = [{ x: 10, y: 700, size: 27, opacity: 1, fill: '#123456' }]
    const next = attachFractures(plan, { cover: cells })

    expect((next.slides[0].slots as Record<string, unknown>).bytes).toBe(JSON.stringify(cells))
    expect((plan.slides[0].slots as Record<string, unknown>).bytes).toBeUndefined()
    expect((next.slides[1].slots as Record<string, unknown>).bytes).toBeUndefined()
  })

  it('el plan del ejemplo resuelve contra el catálogo real (selector, slots y validadores de edición)', async () => {
    const plan = planGlitchEdition({ ...load(), outputs: { stills: ['cover', 'interior:n3'], overlays: [] } })
    const carousel = await resolvePlan(createGlitchCarouselCatalog(), plan.carousel.plan)
    const stills = await resolvePlan(createGlitchStillsCatalog(), plan.stills.plan)

    expect(carousel.slides.map((s) => s.template)).toEqual([
      'CoverPhoto',
      'InteriorOpening',
      'Interior',
      'InteriorLens',
      'Interior',
      'Interior',
      'Interior',
      'Interior',
      'Interior',
      'BackCover'
    ])
    expect(carousel.validators.every((v) => v.result === 'pass')).toBe(true)
    expect(stills.slides.map((s) => s.template)).toEqual(['CoverPhoto', 'InteriorLens'])
  })

  it.each(['A', 'B', 'C'] as const)('las piezas sueltas y los overlays resuelven contra el catálogo real (anterior ≠ %s)', async (previousCover) => {
    const m = load()

    m.previousEdition.coverTemplate = previousCover === 'A' ? 'A' : previousCover === 'B' ? 'C' : 'A'

    if (previousCover === 'C') m.cover.standalonePov = null

    m.outputs = { stills: ['blog:banner', 'blog:square', 'blog:news:n3', 'reel:cover', 'video:thumbnail'], overlays: ['reel', 'vlog'] }

    const plan = planGlitchEdition(m)
    const stills = await resolvePlan(createGlitchStillsCatalog(), plan.stills.plan)
    const overlays = await resolvePlan(createGlitchOverlaysCatalog(), plan.overlays.plan)

    expect(stills.slides.map((s) => s.template)).toContain('ReelCover')
    expect(stills.validators.every((v) => v.result === 'pass')).toBe(true)
    expect(overlays.slides).toHaveLength(18)
    expect(overlays.validators.every((v) => v.result === 'pass')).toBe(true)
  })
})

describe('fitRegion — rostros y lente llevados al recorte centrado del hueco', () => {
  it('una foto 3:2 en un hueco 1080 × 450 pierde arriba y abajo: la región se estira en alto', () => {
    const r = fitRegion({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 }, { width: 1200, height: 800 }, { width: 1080, height: 450 })!

    expect(r.x).toBeCloseTo(0.4, 5)
    expect(r.w).toBeCloseTo(0.2, 5)
    // Escala 0,9 (llena el ancho): la foto mide 720 de alto y se recortan 135 px arriba y abajo.
    expect(r.y).toBeCloseTo((0.4 * 720 - 135) / 450, 5)
    expect(r.h).toBeCloseTo((0.2 * 720) / 450, 5)
  })

  it('una región que queda fuera del recorte desaparece; una en el borde se recorta', () => {
    expect(fitRegion({ x: 0.4, y: 0, w: 0.2, h: 0.1 }, { width: 1200, height: 800 }, { width: 1080, height: 450 })).toBeNull()
    expect(fitRegion({ x: 0.4, y: 0.1, w: 0.2, h: 0.2 }, { width: 1200, height: 800 }, { width: 1080, height: 450 })!.y).toBe(0)
  })

  it('con el tamaño de la foto, el mapper pide la falla con los rostros ya trasladados', () => {
    const m = load()
    const plan = planGlitchEdition(m, { photoSizes: Object.fromEntries(m.news.map((n) => [n.photo.file, { width: 1200, height: 750 }])) })
    const cover = plan.assets.find((a) => a.ref === 'photo:cover')!

    expect(cover.kind === 'photo' && cover.fractures[0].faceRegions[0].h).toBeGreaterThan(m.news[0].photo.faceRegions[0].h)
  })
})
