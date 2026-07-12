import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  composeArtifact,
  resolvePlan,
  CatalogSemanticError,
  UnimplementedOutputTargetError,
  type ArtifactCatalog,
  type DeckPlan
} from '../index'
import { deckAxisCatalog } from '../catalogs/deck-axis'

/**
 * TASK-1393 Slice 2 — el test de la regla que DEFINE la task:
 * **agregar un catálogo nuevo no toca un archivo del motor.**
 *
 * El "toy catalog" (canvas 800×1000, `outputTarget: png-set`, cero resolvers) vive COMPLETO en
 * `fixtures/toy-catalog/`: registry + plantilla + contrato. Si este test compone, la frontera está
 * bien puesta; el día que un catálogo nuevo necesite "un huequito" en el motor, este test es el
 * primer lugar donde esa conversación debe doler.
 */

const TOY_DIR = path.resolve(__dirname, 'fixtures/toy-catalog')

const toyCatalog: ArtifactCatalog = {
  name: 'toy',
  ownerOrgId: 'global',
  templatesDir: TOY_DIR,
  outputTarget: 'png-set',
  resolvers: {}
}

const toyPlan: DeckPlan = {
  tenderId: 'TOY-001',
  slides: [
    {
      slideId: 'nota',
      contentType: 'note',
      template: 'NoteCard',
      slots: { title: 'Un canvas distinto', body: 'compone sin tocar el motor.' }
    }
  ]
}

describe('extensibilidad por catálogo', () => {
  it('un catálogo con canvas y outputTarget distintos compone SIN tocar el motor — png-set emite N PNG y NINGÚN PDF', async () => {
    const outDir = path.resolve(process.cwd(), '.captures/composer-toy-catalog')

    fs.rmSync(outDir, { recursive: true, force: true })

    const result = await composeArtifact(toyCatalog, toyPlan, outDir)

    expect(result.slidePaths).toHaveLength(1)
    expect(fs.existsSync(result.slidePaths[0]!)).toBe(true)

    // `png-set` = ningún PDF, ni por lámina ni mergeado.
    expect(result.pdfPath).toBeUndefined()
    expect(fs.readdirSync(outDir).filter(file => file.endsWith('.pdf'))).toHaveLength(0)
  }, 60_000)

  it('un outputTarget declarado y NO implementado aborta — nunca degrada silenciosamente a PDF', async () => {
    const catalog: ArtifactCatalog = { ...toyCatalog, outputTarget: 'pptx-native' }

    await expect(composeArtifact(catalog, toyPlan, '.captures/never-written')).rejects.toThrow(
      UnimplementedOutputTargetError
    )
  })

  it('resolvePlan produce un manifest sellado: el catálogo elige la plantilla y los hashes son verificables', async () => {
    const manifest = await resolvePlan(toyCatalog, {
      artifactId: 'TOY-001',
      slides: [{ slideId: 'nota', contentType: 'note', slots: toyPlan.slides[0]!.slots }]
    })

    // El autor jamás declaró template: lo eligió el selector del catálogo.
    expect(manifest.slides[0]!.template).toBe('NoteCard')
    expect(manifest.catalog).toMatchObject({ name: 'toy', ownerOrgId: 'global' })
    expect(manifest.catalog.registryHash).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.slides[0]!.contractHash).toMatch(/^[0-9a-f]{64}$/)
    expect(manifest.slides[0]!.templateHash).toMatch(/^[0-9a-f]{64}$/)

    // brandPack/fonts se materializan en Slices 3/4 — hasta entonces son null EXPLÍCITO.
    expect(manifest.brandPack).toBeNull()
    expect(manifest.fonts).toBeNull()
  })
})

describe('validadores semánticos del catálogo deck-axis (versionados, fail-closed)', () => {
  const pricingSlide = (overrides: { heroAmount?: string; proposed?: Array<boolean | 'true' | 'false'> }) => ({
    tenderId: 'SEM-PROBE',
    slides: [
      {
        slideId: 'economica',
        contentType: 'pricing',
        template: 'PricingFull',
        slots: {
          sectionLabel: 'Oferta económica',
          title: 'Inversión',
          summary: { amount: overrides.heroAmount ?? '$5.200.000', period: 'mensual', taxNote: '+ IVA' },
          pricingOptions: (overrides.proposed ?? [true, false]).map((isProposed, index) => ({
            label: `Plan ${index + 1}`,
            scope: 'Alcance',
            amount: index === 0 ? '$5.200.000' : '$6.900.000',
            isProposed
          })),
          commercialTerms: [
            { label: 'Vigencia', value: '60 días' },
            { label: 'Facturación', value: 'mensual' }
          ]
        }
      }
    ]
  })

  const run = (plan: DeckPlan) =>
    resolvePlan(deckAxisCatalog, {
      artifactId: plan.tenderId,
      slides: plan.slides.map(slide => ({ slideId: slide.slideId, contentType: slide.contentType, slots: slide.slots }))
    })

  it('DOS opciones propuestas abortan (pricing_single_proposed)', async () => {
    await expect(run(pricingSlide({ proposed: [true, true] }) as DeckPlan)).rejects.toThrow(CatalogSemanticError)
  })

  it('un monto héroe que contradice la opción propuesta aborta (pricing_hero_mismatch)', async () => {
    await expect(run(pricingSlide({ heroAmount: '$9.999.999' }) as DeckPlan)).rejects.toThrow(CatalogSemanticError)
  })

  it('una dedicación no derivable a FTE aborta (team_dedication_not_derivable)', async () => {
    const plan = {
      tenderId: 'SEM-PROBE',
      slides: [
        {
          slideId: 'equipo',
          contentType: 'team',
          template: 'TeamSplit',
          slots: {
            sectionLabel: 'Equipo',
            headline: 'El squad',
            lead: 'Roles dedicados.',
            highlight: 'Continuidad.',
            rosterLabel: 'Squad',
            rosterMeta: '5 roles',
            members: [
              // '999%' pasa la validación de FORMA (≤5 caracteres) pero es un FTE imposible:
              // exactamente la clase de error que sólo el validador SEMÁNTICO puede ver.
              { kind: 'lead', role: 'Lead', description: 'Dirige.', dedication: '999%' },
              { kind: 'strategy', role: 'Estratega', description: 'Prioriza.', dedication: '20%' },
              { kind: 'content', role: 'Editor', description: 'Escribe.', dedication: '50%' }
            ]
          }
        }
      ]
    }

    await expect(run(plan as unknown as DeckPlan)).rejects.toThrow(/team_dedication_not_derivable/)
  })

  it('el deck SKY real pasa los validadores semánticos del catálogo (anti-regresión del caso vivo)', async () => {
    const skyPlanPath = path.resolve(process.cwd(), 'docs/commercial/tenders/sky-blog-2026/deck-plan.json')
    const skyPlan = JSON.parse(fs.readFileSync(skyPlanPath, 'utf8')) as DeckPlan

    const manifest = await resolvePlan(deckAxisCatalog, {
      artifactId: skyPlan.tenderId,
      slides: skyPlan.slides.map(slide => ({
        slideId: slide.slideId,
        contentType: slide.contentType,
        slots: slide.slots
      }))
    })

    expect(manifest.slides).toHaveLength(skyPlan.slides.length)
    expect(manifest.validators.every(validatorRun => validatorRun.result === 'pass')).toBe(true)

    // La resolución del catálogo coincide con el template que el plan histórico declaraba.
    manifest.slides.forEach((slide, index) => {
      expect(slide.template).toBe(skyPlan.slides[index]!.template)
    })
  })
})
