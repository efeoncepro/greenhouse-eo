import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import type { CompositionPlanInput } from '../../../pure'
import { loadRegistry } from '../../../catalog'
import { auditRegistry, type DeckRegistry } from '../../../selector'
import {
  createManzanitasCarouselCatalog,
  createManzanitasStillsCatalog,
  MANZANITAS_CHART_TEMPLATES,
  MANZANITAS_SLOGAN_TEMPLATES,
  manzanitasCatalogDir,
  parseChartRequest
} from '..'
import { makeManzanitasChartHook } from '../chart-hook'
import { catalogMembershipValidator, manzanitasTemplateOf, pieceApprovalValidator, singleLineValidator } from '../validators'

const registry = JSON.parse(fs.readFileSync(path.join(manzanitasCatalogDir, 'registry.json'), 'utf8')) as DeckRegistry

const tokens = JSON.parse(fs.readFileSync(path.join(manzanitasCatalogDir, 'manzanitas-tokens.json'), 'utf8')) as {
  pieces: Record<string, { status: string; channel: string }>
}

const plan = (slides: { template: string; line?: string }[]) =>
  ({
    artifactId: 'mcm-test',
    slides: slides.map((s, i) => ({ slideId: `s${i + 1}`, contentType: 'x', template: s.template, slots: { theme: { line: s.line ?? 'engine' } } }))
  }) as unknown as CompositionPlanInput & { slides: { slideId: string; template: string; slots: Record<string, unknown> }[] }

const ctx = { registry } as never

describe('manzanitas catalogs', () => {
  it('the two catalogs share one templatesDir and differ only in name and output target', () => {
    const [carousel, stills] = [createManzanitasCarouselCatalog(), createManzanitasStillsCatalog()]

    expect(carousel.templatesDir).toBe(stills.templatesDir)
    expect([carousel.name, stills.name]).toEqual(['manzanitas-carousel', 'manzanitas-stills'])
    expect([carousel.outputTarget, stills.outputTarget]).toEqual(['pdf-merged', 'png-set'])
    expect(carousel.ownerOrgId).toBe('efeonce')
    expect(carousel.brand?.packExtensions).toEqual(['manzanitas'])
  })

  it('the chart templates get the chart hook and the three closes get the slogan hook', () => {
    const hooks = createManzanitasStillsCatalog().layoutHooks ?? {}

    expect(Object.keys(hooks).sort()).toEqual([...MANZANITAS_CHART_TEMPLATES, ...MANZANITAS_SLOGAN_TEMPLATES].sort())
  })

  it('the registry is closed (auditRegistry) and every template declares its Manzanitas data fields', async () => {
    expect(auditRegistry(await loadRegistry({ templatesDir: manzanitasCatalogDir }))).toEqual([])

    for (const template of registry.templates) {
      const t = manzanitasTemplateOf(registry, template.name)!

      expect(['approved', 'proposed'], template.name).toContain(t.approval)
      expect(t.catalogs?.length, template.name).toBeGreaterThan(0)
      expect(t.pieces?.length, template.name).toBeGreaterThan(0)
      expect(template.contentTypes.every((ct) => /^mcm\.[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(ct)), template.name).toBe(true)
    }
  })

  it('every approved piece of AXIS is painted by exactly one template, with the same approval (drift test)', () => {
    const painted = registry.templates.flatMap((t) => manzanitasTemplateOf(registry, t.name)!.pieces!.map((piece) => ({ piece, template: t.name })))
    const approvedPieces = Object.entries(tokens.pieces).filter(([, p]) => p.status === 'approved').map(([id]) => id).sort()

    expect(painted.map((p) => p.piece).sort()).toEqual(approvedPieces)

    for (const { piece, template } of painted) {
      expect(manzanitasTemplateOf(registry, template)!.approval, `${template} → ${piece}`).toBe(tokens.pieces[piece].status === 'approved' ? 'approved' : 'proposed')
    }
  })

  it('only carousel pieces enter the carousel catalog; every piece enters the stills catalog', () => {
    for (const template of registry.templates) {
      const t = manzanitasTemplateOf(registry, template.name)!
      const channels = new Set(t.pieces!.map((p) => tokens.pieces[p].channel))

      expect(t.catalogs, template.name).toContain('stills')
      expect(t.catalogs!.includes('carousel'), template.name).toBe(channels.has('carousel'))
    }
  })
})

describe('manzanitas semantic validators', () => {
  it('catalog membership: a story template never enters the carousel document', () => {
    expect(catalogMembershipValidator('carousel').validate(plan([{ template: 'StoryEscena' }]) as never, ctx)).toHaveLength(1)
    expect(catalogMembershipValidator('stills').validate(plan([{ template: 'StoryEscena' }]) as never, ctx)).toEqual([])
  })

  it('piece approval: a template not approved fails closed', () => {
    const proposed = { ...registry, templates: registry.templates.map((t) => (t.name === 'CoverPizarra' ? { ...t, approval: 'proposed' } : t)) }

    expect(pieceApprovalValidator.validate(plan([{ template: 'CoverPizarra' }]) as never, { registry: proposed } as never)).toHaveLength(1)
    expect(pieceApprovalValidator.validate(plan([{ template: 'CoverPizarra' }]) as never, ctx)).toEqual([])
  })

  it('single line: one piece carries one topic line', () => {
    expect(singleLineValidator.validate(plan([{ template: 'CoverPizarra' }, { template: 'BackCover' }]) as never, ctx)).toEqual([])
    expect(singleLineValidator.validate(plan([{ template: 'CoverPizarra' }, { template: 'BackCover', line: 'brand' }]) as never, ctx)).toHaveLength(1)
  })
})

describe('manzanitas chart hook', () => {
  const slide = (chart: unknown) => ({ slideId: 's1', slots: { chart: typeof chart === 'string' ? chart : JSON.stringify(chart) } })

  it('parses the chart request and rejects one without recipe, line, surface and data', () => {
    expect(parseChartRequest(slide({ recipe: 'measure', line: 'engine', surface: 'navy', data: { value: 38 } }) as never).recipe).toBe('measure')
    expect(() => parseChartRequest(slide({ recipe: 'measure', line: 'engine', data: { value: 38 } }) as never)).toThrow(/receta, línea, superficie y dato/)
    expect(() => parseChartRequest({ slideId: 's1', slots: {} } as never)).toThrow(/no trae el dato del gráfico/)
  })

  it('fails closed without a painter: a chart is never drawn by hand', async () => {
    const hook = makeManzanitasChartHook(undefined)

    await expect(hook({} as never, slide({ recipe: 'measure', line: 'engine', surface: 'navy', data: {} }) as never, {} as never)).rejects.toThrow(/chartPainter/)
  })

  it('fails closed when the painter does not return an SVG', async () => {
    const hook = makeManzanitasChartHook(() => '<div></div>')

    await expect(hook({} as never, slide({ recipe: 'measure', line: 'engine', surface: 'navy', data: {} }) as never, {} as never)).rejects.toThrow(/no devolvió un SVG/)
  })
})
