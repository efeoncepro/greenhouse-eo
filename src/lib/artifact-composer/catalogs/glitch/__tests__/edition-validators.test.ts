import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { CatalogSemanticValidator } from '../../../catalog'
import type { DeckPlan, SlideSpec } from '../../../contracts'
import type { DeckRegistry } from '../../../selector'
import { glitchCatalogDir } from '..'
import {
  accentOnLightValidator,
  coverRotationValidator,
  editionStructureValidator,
  faceSafeFractureValidator,
  glitchEditionValidators,
  headlineContrastValidator,
  photoCreditValidator,
  singleSphereValidator
} from '../edition-validators'

const registry = JSON.parse(fs.readFileSync(path.join(glitchCatalogDir, 'registry.json'), 'utf8')) as DeckRegistry

const slide = (template: string, slots: Record<string, unknown>, slideId = 's1'): SlideSpec =>
  ({ slideId, contentType: 'glitch.test', template, slots }) as SlideSpec

const run = (validator: CatalogSemanticValidator, slides: SlideSpec[], reg: DeckRegistry = registry) =>
  validator.validate({ tenderId: 'glitch-test', slides } as DeckPlan, { registry: reg } as Parameters<CatalogSemanticValidator['validate']>[1]).map((v) => v.code)

const photoSlots = { photo: { src: 'asset-ref:photo:n1', alt: 'x' }, credit: 'Foto: Glitch', photoLicense: 'generated:fixture', faces: '[]' }

describe('glitch edition validators — un caso que pasa y uno que falla por regla', () => {
  it('cover-rotation', () => {
    expect(run(coverRotationValidator, [slide('CoverPhoto', { previousCoverTemplate: 'C' })])).toEqual([])
    expect(run(coverRotationValidator, [slide('CoverPhoto', { previousCoverTemplate: 'A' })])).toEqual(['glitch.cover-rotation'])
    expect(run(coverRotationValidator, [slide('CoverType', {})])).toEqual(['glitch.cover-rotation'])
    expect(run(coverRotationValidator, [slide('Interior', {})])).toEqual([])
  })

  it('single-sphere', () => {
    expect(run(singleSphereValidator, [slide('InteriorLens', {})])).toEqual([])

    const broken = { ...registry, templates: registry.templates.map((t) => (t.name === 'Interior' ? { ...t, sphere: 'apple+lens' } : t)) } as DeckRegistry

    expect(run(singleSphereValidator, [slide('Interior', {})], broken)).toEqual(['glitch.single-sphere'])
  })

  it('headline-contrast', () => {
    expect(run(headlineContrastValidator, [slide('CoverType', { headline: { entry: 'La IA ya no está', punch: 'adentro.' } })])).toEqual([])
    expect(run(headlineContrastValidator, [slide('CoverPhoto', { headline: { entry: 'Te responden antes', punchLead: 'del', punchLast: 'clic.' } })])).toEqual([])
    expect(run(headlineContrastValidator, [slide('CoverType', { headline: { entry: 'Sólo entrada', punch: '  ' } })])).toEqual(['glitch.headline-contrast'])
  })

  it('photo-credit', () => {
    expect(run(photoCreditValidator, [slide('Interior', photoSlots)])).toEqual([])
    expect(run(photoCreditValidator, [slide('Interior', { ...photoSlots, credit: '' })])).toEqual(['glitch.photo-credit'])
    expect(run(photoCreditValidator, [slide('Interior', { ...photoSlots, photoLicense: 'press-kit:marca' })])).toEqual(['glitch.photo-credit'])
    expect(run(photoCreditValidator, [slide('CoverMosaic', { card1: {}, credit: 'Fotos: Glitch', photoLicense: 'owned:a generated:' })])).toEqual(['glitch.photo-credit'])
  })

  it('photo-credit: la excepción de prensa pasa sólo en las plantillas del Glitch Flash', () => {
    const press = { ...photoSlots, credit: 'Imagen: Anthropic', photoLicense: 'press:https://www.anthropic.com/news/claude-sonnet-5-5' }

    expect(photoCreditValidator.version).toBe('1.1.0')

    for (const template of ['FlashCover', 'FlashInterior', 'FlashBlogBanner', 'FlashNewsBanner', 'FlashThreads']) {
      expect(run(photoCreditValidator, [slide(template, press)]), template).toEqual([])
    }

    for (const template of ['CoverPhoto', 'Interior', 'BlogBannerPhoto', 'BlogNewsBanner']) {
      expect(run(photoCreditValidator, [slide(template, press)]), template).toEqual(['glitch.photo-credit'])
    }

    // Aun en el Flash, la excepción pinta el crédito y nombra su fuente.
    expect(run(photoCreditValidator, [slide('FlashInterior', { ...press, credit: '' })])).toEqual(['glitch.photo-credit'])
    expect(run(photoCreditValidator, [slide('FlashInterior', { ...press, photoLicense: 'press:' })])).toEqual(['glitch.photo-credit'])
  })

  it('face-safe-fracture', () => {
    const bytes = JSON.stringify([{ x: 100, y: 600, size: 27, opacity: 1, fill: '#123456' }])

    expect(run(faceSafeFractureValidator, [slide('Interior', { bytes, faces: JSON.stringify([{ x: 600, y: 200, w: 100, h: 100 }]) })])).toEqual([])
    expect(run(faceSafeFractureValidator, [slide('Interior', { bytes, faces: JSON.stringify([{ x: 90, y: 590, w: 40, h: 40 }]) })])).toEqual(['glitch.face-safe-fracture'])
    expect(run(faceSafeFractureValidator, [slide('Interior', { bytes, faces: '{roto' })])).toEqual(['glitch.face-safe-fracture'])
  })

  it('accent-on-light', () => {
    expect(run(accentOnLightValidator, [slide('BackCover', {})])).toEqual([])

    const light = { ...registry, templates: registry.templates.map((t) => (t.name === 'BackCover' ? { ...t, surfaceTone: 'light' } : t)) } as DeckRegistry

    expect(run(accentOnLightValidator, [slide('BackCover', {})], light)).toEqual(['glitch.accent-on-light'])
  })

  it('edition-structure (sólo carrusel)', () => {
    const interiors = Array.from({ length: 8 }, (_, i) => slide(i === 0 ? 'InteriorOpening' : i === 2 ? 'InteriorLens' : 'Interior', { progress: { step: String(i + 1) } }, `n${i + 1}`))
    const ok = [slide('CoverPhoto', {}, 'cover'), ...interiors, slide('BackCover', {}, 'back')]

    expect(run(editionStructureValidator, ok)).toEqual([])
    expect(run(editionStructureValidator, ok.slice(0, 9))).toEqual(['glitch.edition-structure'])

    const lensFirst = [...ok]

    lensFirst[1] = slide('InteriorLens', { progress: { step: '1' } }, 'n1')
    expect(run(editionStructureValidator, lensFirst)).toEqual(['glitch.edition-structure'])

    const badStep = [...ok]

    badStep[4] = slide('Interior', { progress: { step: '7' } }, 'n4')
    expect(run(editionStructureValidator, badStep)).toEqual(['glitch.edition-structure'])

    expect(glitchEditionValidators('carousel').map((v) => v.name)).toContain('glitch.edition-structure')
    expect(glitchEditionValidators('stills').map((v) => v.name)).not.toContain('glitch.edition-structure')
  })

  it('edition-structure del Glitch Flash: portada, la noticia y contraportada, sin número ni avance', () => {
    const flash = [slide('FlashCover', {}, 'cover'), slide('FlashInterior', {}, 'news'), slide('FlashBackCover', {}, 'back')]

    expect(run(editionStructureValidator, flash)).toEqual([])
    expect(run(editionStructureValidator, flash.slice(0, 2))).toEqual(['glitch.edition-structure'])
    expect(run(editionStructureValidator, [flash[0], slide('Interior', { progress: { step: '1' } }, 'n1'), flash[2]])).toContain('glitch.edition-structure')
    expect(run(editionStructureValidator, [flash[0], slide('FlashInterior', { progress: { step: '1' } }, 'news'), flash[2]])).toEqual(['glitch.edition-structure'])
    // La portada del Flash queda fuera de la rotación: no declara la semana anterior.
    expect(run(coverRotationValidator, [flash[0]])).toEqual([])
  })
})
