import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { loadRegistry, resolvePlan } from '../../../catalog'
import { auditRegistry, type DeckRegistry } from '../../../selector'
import { createGlitchCarouselCatalog, createGlitchOverlaysCatalog, createGlitchStillsCatalog, glitchCatalogDir } from '..'
import { catalogMembershipValidator, glitchTemplateOf, pieceApprovalValidator } from '../validators'

const registry = JSON.parse(fs.readFileSync(path.join(glitchCatalogDir, 'registry.json'), 'utf8')) as DeckRegistry

const tokens = JSON.parse(fs.readFileSync(path.join(glitchCatalogDir, 'glitch-tokens.json'), 'utf8')) as {
  pieces: Record<string, { status: string; sphere: string; edition?: string }>
  editions: {
    flash: {
      masthead: { label: { text: string }; word: { text: string } }
      chips: { cover: string; interior: string }
      progress: string
      swipe: string
    }
  }
}

const read = (file: string) => fs.readFileSync(path.join(glitchCatalogDir, file), 'utf8')

/**
 * Diferencias conocidas entre el registry y `glitchLine.pieces` de AXIS, con su razón. La portada C aprobada (canvas
 * «Glitch en La órbita») no lleva manzana; el token 0.3.12–0.3.14 la declara con esfera `apple` (error de TASK-1922,
 * a corregir en un patch de AXIS).
 */
const KNOWN_TOKEN_SPHERE_DRIFT: Record<string, string> = {
  'portada-c': 'el diseño aprobado de la portada C no lleva manzana; AXIS declara apple'
}

/** Piezas del token que describen un kit de varias plantillas (los overlays del reel y del vlog). */
const KIT_PIECES = new Set(['reel-overlay', 'vlog-overlay'])

const planWith = (template: string, contentType: string) => ({
  tenderId: 'glitch-test',
  slides: [{ slideId: 's1', contentType, template, slots: {} }]
})

describe('glitch catalogs', () => {
  it('the three catalogs share one templatesDir and differ only in name and output target', () => {
    const [carousel, stills, overlays] = [createGlitchCarouselCatalog(), createGlitchStillsCatalog(), createGlitchOverlaysCatalog()]

    expect(new Set([carousel.templatesDir, stills.templatesDir, overlays.templatesDir]).size).toBe(1)
    expect([carousel.outputTarget, stills.outputTarget, overlays.outputTarget]).toEqual(['pdf-merged', 'png-set', 'png-set'])
    expect(carousel.ownerOrgId).toBe('efeonce')
    expect(carousel.brand?.packExtensions).toEqual(['glitch'])
  })

  it('the registry is closed (auditRegistry) and every template declares its Glitch data fields', async () => {
    expect(auditRegistry(await loadRegistry({ templatesDir: glitchCatalogDir }))).toEqual([])

    for (const template of registry.templates) {
      const t = glitchTemplateOf(registry, template.name)!

      expect(['approved', 'proposed'], template.name).toContain(t.approval)
      expect(t.catalogs?.length, template.name).toBeGreaterThan(0)
      expect(['apple', 'lens', 'none'], template.name).toContain(t.sphere)
      expect(template.contentTypes.every((ct) => /^glitch\.[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(ct)), template.name).toBe(true)
    }
  })

  it('approval and sphere follow glitchLine.pieces of AXIS (drift test: approving is data in AXIS and in the registry)', () => {
    for (const template of registry.templates) {
      const t = glitchTemplateOf(registry, template.name)!

      if (!t.piece) continue
      const piece = tokens.pieces[t.piece]

      expect(piece, `${template.name} → ${t.piece}`).toBeDefined()
      expect(t.approval === 'approved', `${template.name}: registry ${t.approval}, AXIS ${piece.status}`).toBe(piece.status === 'aprobada')

      if (t.piece in KNOWN_TOKEN_SPHERE_DRIFT) {
        // La plantilla sigue al diseño aprobado; el token de AXIS todavía no. Cuando AXIS lo corrija, este caso se pone
        // rojo a propósito: se retira la excepción.
        expect(piece.sphere, `${t.piece}: AXIS ya se corrigió, retira la excepción`).not.toBe(t.sphere)
        continue
      }

      if (KIT_PIECES.has(t.piece)) {
        // El token describe el KIT de overlays (una esfera como máximo por cuadro): cada pieza del kit lleva la del kit o
        // ninguna (la cabecera, la tarjeta y el cierre no llevan manzana).
        expect([piece.sphere, 'none'], template.name).toContain(t.sphere)
        continue
      }

      expect(t.sphere, template.name).toBe(piece.sphere)
    }
  })

  it('every Flash piece of AXIS has exactly one Flash template, and every Flash template is a Flash piece', () => {
    const flashPieces = Object.entries(tokens.pieces).filter(([, p]) => p.edition === 'flash').map(([id]) => id).sort()
    const flashTemplates = registry.templates.filter((t) => t.name.startsWith('Flash')).map((t) => glitchTemplateOf(registry, t.name)!.piece).sort()

    expect(flashTemplates).toEqual(flashPieces)
    expect(registry.templates.filter((t) => t.name.startsWith('Flash')).every((t) => t.contentTypes.every((ct) => ct.startsWith('glitch.flash.')))).toBe(true)
  })

  it('the Flash templates paint the texts of the token: label, word and chips; no number, no progress', () => {
    const flash = tokens.editions.flash
    const html = Object.fromEntries(registry.templates.filter((t) => t.name.startsWith('Flash')).map((t) => [t.name, read(t.prototype)]))

    for (const [name, src] of Object.entries(html)) {
      expect(src, name).not.toMatch(/data-slot="edition"|gx-hash|data-slot="progress"|EDICIÓN/)
      expect(src, name).toContain(`<span class="gx-num">${flash.masthead.word.text}</span>`)
      expect(src, name).toContain('src="assets/flash-trail.svg"')
    }

    for (const name of ['FlashCover', 'FlashThreads', 'FlashBlogBanner', 'FlashInterior', 'FlashBackCover']) expect(html[name], name).toContain(flash.masthead.label.text)
    for (const name of ['FlashCover', 'FlashThreads', 'FlashBlogBanner']) expect(html[name], name).toContain(`>${flash.chips.cover}</span>`)
    for (const name of ['FlashInterior', 'FlashNewsBanner']) expect(html[name], name).toContain(`>${flash.chips.interior}</span>`)
    expect(flash.progress).toBe('none')
    expect(html.FlashThreads, 'Threads sale sola: sin «Desliza»').not.toContain('DESLIZA')
    expect(html.FlashCover).toContain('DESLIZA')
  })

  it('the weekly photo covers say «LA NOTICIA», never «PORTADA» (operator, 2026-09-28)', () => {
    for (const file of ['cover-photo.html', 'blog-banner-photo.html', 'blog-square-photo.html']) {
      expect(read(file), file).toContain(`>${tokens.editions.flash.chips.cover}</span>`)
      expect(read(file), file).not.toContain('PORTADA')
    }
  })

  it('a template asked from a catalog it does not belong to fails with glitch.catalog-membership', () => {
    expect(catalogMembershipValidator('carousel').validate(planWith('FlashThreads', 'glitch.flash.threads'), { registry }).map((v) => v.code)).toEqual(['glitch.catalog-membership'])
    expect(catalogMembershipValidator('stills').validate(planWith('FlashThreads', 'glitch.flash.threads'), { registry })).toEqual([])

    const violations = catalogMembershipValidator('overlays').validate(planWith('Interior', 'glitch.interior'), { registry })

    expect(violations.map((v) => v.code)).toEqual(['glitch.catalog-membership'])
    expect(catalogMembershipValidator('carousel').validate(planWith('Interior', 'glitch.interior'), { registry })).toEqual([])
  })

  it('a proposed template fails with glitch.piece-approval (the mechanism stays for future pieces)', () => {
    const withProposal: DeckRegistry = {
      ...registry,
      templates: registry.templates.map((t) => (t.name === 'Interior' ? { ...t, approval: 'proposed' } : t))
    }

    expect(pieceApprovalValidator.validate(planWith('Interior', 'glitch.interior'), { registry: withProposal }).map((v) => v.code)).toEqual(['glitch.piece-approval'])
    expect(pieceApprovalValidator.validate(planWith('Interior', 'glitch.interior'), { registry })).toEqual([])
  })

  it('a plan that declares its own template is refused by the selector (TemplateAuthorityError)', async () => {
    const catalog = createGlitchCarouselCatalog()
    const input = { artifactId: 'x', slides: [{ slideId: 's1', contentType: 'glitch.interior', slots: {}, template: 'BackCover' }] }

    await expect(resolvePlan(catalog, input as never)).rejects.toThrow(/no elige plantilla/)
  })
})
