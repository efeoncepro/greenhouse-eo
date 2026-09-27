import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { loadRegistry, resolvePlan } from '../../../catalog'
import { auditRegistry, type DeckRegistry } from '../../../selector'
import { createGlitchCarouselCatalog, createGlitchOverlaysCatalog, createGlitchStillsCatalog, glitchCatalogDir } from '..'
import { catalogMembershipValidator, glitchTemplateOf, pieceApprovalValidator } from '../validators'

const registry = JSON.parse(fs.readFileSync(path.join(glitchCatalogDir, 'registry.json'), 'utf8')) as DeckRegistry

const tokens = JSON.parse(fs.readFileSync(path.join(glitchCatalogDir, 'glitch-tokens.json'), 'utf8')) as {
  pieces: Record<string, { status: string; sphere: string }>
}

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
      expect(t.sphere, template.name).toBe(piece.sphere)
    }
  })

  it('a template asked from a catalog it does not belong to fails with glitch.catalog-membership', () => {
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
