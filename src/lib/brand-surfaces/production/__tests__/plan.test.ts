import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { GlitchPieceError } from '@/lib/glitch-composition'

import { SurfacePieceError } from '../../types'
import { brandRenderRequestSchema, isBrandRenderJobTransitionAllowed } from '../contracts'
import { glitchPhotoPaths, planBrandRender } from '../plan'

const EXAMPLES = path.resolve(__dirname, '../../examples')
const GLITCH = path.resolve(__dirname, '../../../glitch-composition/examples/edition-17.example.json')
const FLASH = path.resolve(__dirname, '../../../glitch-composition/examples/flash-sonnet-5-5.example.json')
const json = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>

describe('brandRenderRequestSchema', () => {
  it('acepta las tres familias y rechaza campos desconocidos y sources con rutas como valor', () => {
    expect(brandRenderRequestSchema.safeParse({ family: 'graphic_line_piece', intent: {}, sources: { 'a.png': 'ast-123' } }).success).toBe(true)
    expect(brandRenderRequestSchema.safeParse({ family: 'glitch_edition', manifest: {} }).success).toBe(true)
    expect(brandRenderRequestSchema.safeParse({ family: 'graphic_line_piece', intent: {}, template: 'X' }).success).toBe(false)
    expect(brandRenderRequestSchema.safeParse({ family: 'graphic_line_piece', intent: {}, sources: { 'a.png': '/tmp/a.png' } }).success).toBe(false)
    expect(brandRenderRequestSchema.safeParse({ family: 'video', intent: {} }).success).toBe(false)
  })

  it('las transiciones del job son las del contrato (un fallo reintentable vuelve a la cola)', () => {
    expect(isBrandRenderJobTransitionAllowed('running', 'queued')).toBe(true)
    expect(isBrandRenderJobTransitionAllowed('completed', 'queued')).toBe(false)
    expect(isBrandRenderJobTransitionAllowed('dead_letter', 'queued')).toBe(false)
  })
})

describe('planBrandRender', () => {
  it('una pieza de La órbita da un job en su catálogo y nombra su plate como fuente', () => {
    const intent = json(path.join(EXAMPLES, 'deck-breather-intent.json'))
    const planned = planBrandRender({ family: 'graphic_line_piece', intent, sources: {} }, { artifactId: 'brand-test' })

    expect(planned.jobs).toHaveLength(1)
    expect(planned.jobs[0]).toMatchObject({ catalogName: 'graphic-line-deck', outputTarget: 'pdf-merged', artifactId: 'brand-test' })
    expect(planned.sourcePaths).toEqual([(intent.photo as { plateRef: string }).plateRef])
  })

  it('una receta no aprobada se rechaza en el plan (nunca llega a la cola)', () => {
    const intent = { ...json(path.join(EXAMPLES, 'deck-breather-intent.json')), surface: 'dooh', format: 'paleta-1x2', role: 'billboard', recipe: 'paleta' }

    expect(() => planBrandRender({ family: 'graphic_line_piece', intent, sources: {} }, { artifactId: 'brand-test' })).toThrow(SurfacePieceError)
  })

  it('una edición de Glitch da un job por catálogo con contenido y reparte sus fotos', () => {
    const manifest = json(GLITCH)
    const planned = planBrandRender({ family: 'glitch_edition', manifest, sources: {} }, { artifactId: 'brand-glitch' })

    expect(planned.jobs.map((job) => [job.catalogName, job.outputTarget])).toEqual([
      ['glitch-carousel', 'pdf-merged'],
      ['glitch-stills', 'png-set'],
      ['glitch-overlays', 'png-set']
    ])
    // Los overlays no usan fotos; el carrusel usa las 8 noticias (y la lente).
    expect(planned.jobs[2]!.assets.requests).toHaveLength(0)
    expect(planned.jobs[0]!.assets.requests.length).toBeGreaterThanOrEqual(8)
    expect(new Set(planned.sourcePaths)).toEqual(new Set(glitchPhotoPaths(manifest)))
    // La edición semanal conserva su resumen de siempre (número y plantilla de portada de la rotación).
    expect(planned.summary).toEqual({ edition: 17, coverTemplate: expect.any(String), catalogs: ['glitch-carousel', 'glitch-stills', 'glitch-overlays'] })
    expect(planned.summary).not.toHaveProperty('kind')
  })

  it('un Glitch Flash da el carrusel de 3 láminas y sus sueltas, sin overlays ni número de edición', () => {
    const manifest = json(FLASH)
    const planned = planBrandRender({ family: 'glitch_edition', manifest, sources: {} }, { artifactId: 'brand-flash' })

    expect(planned.jobs.map((job) => [job.catalogName, job.outputTarget])).toEqual([
      ['glitch-carousel', 'pdf-merged'],
      ['glitch-stills', 'png-set']
    ])
    expect(planned.jobs[0]!.input.slides.map((slide) => slide.contentType)).toEqual(['glitch.flash.cover', 'glitch.flash.interior', 'glitch.flash.back'])
    expect(planned.jobs[1]!.input.slides.map((slide) => slide.contentType)).toEqual(['glitch.flash.threads', 'glitch.flash.blog.banner', 'glitch.flash.blog.news'])
    expect(planned.jobs.map((job) => job.artifactId)).toEqual(['brand-flash-carousel', 'brand-flash-stills'])
    expect(planned.jobs.every((job) => job.assets.kind === 'glitch')).toBe(true)
    expect(planned.summary).toEqual({
      kind: 'flash',
      slug: 'ejemplo-claude-sonnet-5-5',
      title: 'Glitch Flash · [Ejemplo] Claude Sonnet 5.5',
      edition: null,
      coverTemplate: null,
      catalogs: ['glitch-carousel', 'glitch-stills']
    })
    // La foto de portada del Flash (`cover.photo`) también es una fuente, además de la de la noticia.
    expect(new Set(planned.sourcePaths)).toEqual(new Set(['fotos/n3.png', 'fotos/n5.png']))
    expect(new Set(glitchPhotoPaths(manifest))).toEqual(new Set(planned.sourcePaths))
  })

  it('un Glitch Flash sin sueltas pedidas es sólo el carrusel', () => {
    const manifest = { ...json(FLASH), outputs: { stills: [] } }
    const planned = planBrandRender({ family: 'glitch_edition', manifest, sources: {} }, { artifactId: 'brand-flash' })

    expect(planned.jobs.map((job) => job.catalogName)).toEqual(['glitch-carousel'])
  })

  it('un Glitch Flash con número de edición se rechaza en el plan (nunca llega a la cola)', () => {
    const base = json(FLASH)
    const manifest = { ...base, edition: { ...(base.edition as Record<string, unknown>), number: 18 } }

    try {
      planBrandRender({ family: 'glitch_edition', manifest, sources: {} }, { artifactId: 'brand-flash' })
      expect.unreachable('el plan debía rechazar el número')
    } catch (error) {
      expect(error).toBeInstanceOf(GlitchPieceError)
      expect((error as GlitchPieceError).issues.map((issue) => issue.code)).toContain('flash-edition-number-not-allowed')
    }
  })
})
