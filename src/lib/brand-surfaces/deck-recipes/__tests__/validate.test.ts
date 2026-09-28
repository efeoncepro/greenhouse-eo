import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { AXIS_SURFACE_DOCUMENT_ISSUE_CODES } from '@efeoncepro/axis-ui-contracts'
import { describe, expect, it } from 'vitest'

import { deckRecipeCatalog, getDeckRecipe, listDeckRecipes } from '../catalog'
import { AXIS_EQUIVALENT, DECK_PLAN_ISSUE_CODES, type DeckPlanIssueCode } from '../issues'
import type { DeckPlan } from '../types'
import { validateDeckPlan } from '../validate'

const fixtures = path.join(__dirname, 'fixtures')
const read = <T>(name: string): T => JSON.parse(readFileSync(path.join(fixtures, name), 'utf8')) as T
const plan = (document: DeckPlan['document'], ids: string[], extra: Partial<DeckPlan> = {}): DeckPlan => ({ document, ...extra, slides: ids.map(recipeId => ({ recipeId })) })
const codes = (value: DeckPlan) => validateDeckPlan(value).issues.map(issue => issue.code)

const COVER_SLOTS = {
  eyebrow: 'Brochure · Servicios 2026',
  question: '¿Qué hace Efeonce?',
  answer: 'Crecer',
  evidence: '**Cinco** líneas de servicio:\nGrowth · Brand · Engine · Voice · Revenue',
  photo: 'ai-generations/2026-09-26_deck-nexa/plates/NX6b-nexa-cinco-orbitas-isotipo.png'
}

const withCoverSlots = (slots: Record<string, unknown>): DeckPlan => ({
  document: 'brochure',
  slides: [{ recipeId: 'cover-brochure-cine-lines', slots }, { recipeId: 'proposal-cinematic-creative' }, { recipeId: 'close-brochure-orbit' }]
})

describe('catálogo de runtime', () => {
  it('trae las 69 recetas aprobadas, todas con plantilla y con su página de AXIS', () => {
    expect(deckRecipeCatalog.recipes).toHaveLength(69)
    expect(deckRecipeCatalog.recipes.filter(recipe => !recipe.template)).toEqual([])
    expect(deckRecipeCatalog.recipes.filter(recipe => !recipe.axis?.page).map(recipe => recipe.id)).toEqual([])
  })

  it('acepta la portada y el cierre clásicos de AXIS sólo en pitch y QBR', () => {
    expect(getDeckRecipe('cover-classic')?.documents).toEqual(['pitch', 'qbr'])
    expect(getDeckRecipe('proposal-cinematic')).toBeNull()
    expect(listDeckRecipes('proposal').every(recipe => recipe.documents.includes('proposal'))).toBe(true)
  })
})

describe('validateDeckPlan — planes golden', () => {
  for (const name of ['golden-brochure.json', 'golden-proposal.json', 'golden-pitch.json', 'golden-qbr.json']) {
    it(`${name} no tiene errores ni advertencias`, () => {
      expect(validateDeckPlan(read<DeckPlan>(name))).toEqual({ ok: true, issues: [] })
    })
  }
})

describe('validateDeckPlan — planes adversariales', () => {
  for (const entry of read<{ name: string; expect: string[]; plan: DeckPlan }[]>('adversarial.json')) {
    it(`${entry.name} → ${entry.expect.join(', ')}`, () => {
      const result = validateDeckPlan(entry.plan)

      expect(result.ok).toBe(false)

      for (const code of entry.expect) expect(result.issues.map(issue => issue.code)).toContain(code)
    })
  }
})

describe('validateDeckPlan — una prueba que dispara y otra que no, por código', () => {
  const cases: Record<DeckPlanIssueCode, { fires: DeckPlan; quiet: DeckPlan }> = {
    'plan-invalid': { fires: { document: 'deck' as never, slides: [] }, quiet: read('golden-qbr.json') },
    'template-named-instead-of-recipe': { fires: plan('brochure', ['CoverBrochure']), quiet: read('golden-brochure.json') },
    'recipe-unknown': { fires: plan('proposal', ['cover-proposal-orbit', 'proposal-service-seo', 'close-proposal-horizon']), quiet: read('golden-proposal.json') },
    'recipe-not-for-document': { fires: plan('brochure', ['cover-brochure-cine-lines', 'proposal-cinematic-creative', 'content-pricing', 'close-brochure-orbit']), quiet: read('golden-brochure.json') },
    'frame-count': { fires: plan('pitch', ['cover-classic', 'content-text', 'close-classic', 'close-classic']), quiet: read('golden-pitch.json') },
    'frame-order': { fires: plan('proposal', ['proposal-service-aeo', 'cover-proposal-orbit', 'close-proposal-horizon']), quiet: read('golden-proposal.json') },
    'pair-cover-close-mismatch': { fires: plan('proposal', ['cover-proposal-orbit', 'proposal-service-aeo', 'close-brochure-orbit']), quiet: read('golden-proposal.json') },
    'next-steps-after-diagnosis': {
      fires: plan('proposal', ['cover-proposal-orbit', 'proposal-service-aeo', 'decision-next-steps', 'close-proposal-horizon'], { diagnosisDone: true }),
      quiet: plan('proposal', ['cover-proposal-orbit', 'proposal-service-aeo', 'decision-next-steps', 'close-proposal-horizon'], { diagnosisDone: false })
    },
    'variant-adjacent': {
      fires: plan('proposal', ['cover-proposal-orbit', 'proposal-service-aeo', 'content-pricing', 'content-pricing-stage', 'close-proposal-horizon']),
      quiet: plan('proposal', ['cover-proposal-orbit', 'content-pricing', 'proposal-service-aeo', 'content-pricing-stage', 'close-proposal-horizon'])
    },
    'plate-repeated': { fires: plan('proposal', ['cover-proposal-orbit', 'proposal-service-creative', 'decision-case', 'close-proposal-horizon']), quiet: read('golden-proposal.json') },
    'slot-unknown': { fires: withCoverSlots({ ...COVER_SLOTS, sloganLineWord: 'Growth' }), quiet: withCoverSlots(COVER_SLOTS) },
    'slot-type-invalid': { fires: withCoverSlots({ ...COVER_SLOTS, question: 42 }), quiet: withCoverSlots(COVER_SLOTS) },
    'slot-required-missing': { fires: withCoverSlots({ ...COVER_SLOTS, answer: '' }), quiet: withCoverSlots(COVER_SLOTS) },
    'slot-over-max-chars': { fires: withCoverSlots({ ...COVER_SLOTS, answer: 'Crecer con foco y medida' }), quiet: withCoverSlots(COVER_SLOTS) },
    // Las 69 recetas tienen plantilla: el aviso se prueba en `recipe-without-template.test.ts` con un catálogo simulado.
    'recipe-without-template': { fires: read('golden-brochure.json'), quiet: read('golden-brochure.json') },
    'sequence-order': { fires: plan('proposal', []), quiet: read('golden-proposal.json') },
    'section-split-corner-adjacent': {
      fires: plan('proposal', ['cover-proposal-orbit', 'section-split', 'section-split', 'proposal-service-aeo', 'close-proposal-horizon']),
      quiet: plan('proposal', ['cover-proposal-orbit', 'section-split', 'proposal-service-aeo', 'section-split-corner-bottom', 'close-proposal-horizon'])
    },
    'rhythm-paper-run': {
      fires: plan('proposal', ['cover-proposal-orbit', 'decision-risk', 'decision-chart', 'decision-why-us', 'proposal-service-aeo', 'close-proposal-horizon']),
      quiet: read('golden-proposal.json')
    }
  }

  // `sequence-order` necesita una secuencia declarada en un solo sentido: la busca en el catálogo.
  const asymmetric = listDeckRecipes('proposal').flatMap(first =>
    first.pairs.sequence
      .map(ref => getDeckRecipe(ref))
      .filter(second => second && second.documents.includes('proposal') && !second.pairs.sequence.includes(first.id) && second.id !== first.id)
      .map(second => [first.id, second!.id] as const)
  )

  it('el catálogo tiene al menos una secuencia en un solo sentido para probar `sequence-order`', () => {
    expect(asymmetric.length).toBeGreaterThan(0)
  })

  if (asymmetric.length > 0) {
    const [first, second] = asymmetric[0]!

    cases['sequence-order'] = {
      fires: plan('proposal', ['cover-proposal-orbit', second, 'proposal-service-aeo', first, 'close-proposal-horizon']),
      quiet: plan('proposal', ['cover-proposal-orbit', first, 'proposal-service-aeo', second, 'close-proposal-horizon'])
    }
  }

  for (const [code, { fires, quiet }] of Object.entries(cases)) {
    if (code === 'recipe-without-template') continue

    it(`${code} dispara con su caso y calla sin él`, () => {
      expect(codes(fires)).toContain(code)
      expect(codes(quiet)).not.toContain(code)
    })
  }

  it('cada código del catálogo tiene su caso', () => {
    expect(Object.keys(cases).sort()).toEqual(Object.keys(DECK_PLAN_ISSUE_CODES).sort())
  })
})

describe('una regla, una voz: el catálogo no duplica a AXIS', () => {
  it('ningún código del catálogo es un código de documento de AXIS', () => {
    const axis = new Set<string>(AXIS_SURFACE_DOCUMENT_ISSUE_CODES)

    expect(Object.keys(DECK_PLAN_ISSUE_CODES).filter(code => axis.has(code))).toEqual([])
  })

  it('si AXIS reporta la regla sobre una lámina, el código equivalente del catálogo no aparece en esa lámina', () => {
    const plans: DeckPlan[] = [
      plan('proposal', ['cover-proposal-orbit', 'proposal-service-aeo', 'close-brochure-orbit']),
      plan('brochure', ['proposal-cinematic-creative', 'cover-brochure-cine-lines', 'close-brochure-orbit']),
      ...read<{ plan: DeckPlan }[]>('adversarial.json').map(entry => entry.plan)
    ]

    for (const value of plans) {
      const { issues } = validateDeckPlan(value)

      for (const [code, axisCodes] of Object.entries(AXIS_EQUIVALENT)) {
        for (const issue of issues.filter(entry => entry.source === 'axis' && axisCodes!.includes(entry.code))) {
          const twin = issues.find(entry => entry.source === 'catalog' && entry.code === code && (issue.slideIndex === undefined || entry.slideIndex === issue.slideIndex || code === 'frame-order'))

          expect(twin, `${code} duplica ${issue.code}`).toBeUndefined()
        }
      }
    }
  })

  it('la alternancia de foto entre portada y cierre la valida AXIS, no el catálogo', () => {
    const issues = validateDeckPlan(plan('brochure', ['cover-brochure-cine-lines', 'proposal-cinematic-creative', 'close-brochure-horizon'])).issues

    expect(issues.find(issue => issue.code === 'frame-photo-must-alternate')?.source).toBe('axis')
  })
})

describe('el catálogo de runtime no se lee del JSON de docs', () => {
  it('ningún módulo de src/ abre EFEONCE_DECK_SLIDE_RECIPES_V1.json', () => {
    const offenders: string[] = []

    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          if (entry.name !== '__tests__' && entry.name !== 'node_modules') walk(full)
        } else if (/\.(ts|tsx|mjs|js)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
          const text = readFileSync(full, 'utf8')

          // Nombrarlo en un comentario no es leerlo: el defecto es abrirlo con `fs` en runtime.
          if (text.includes('EFEONCE_DECK_SLIDE_RECIPES_V1.json') && /from 'node:fs'|from 'fs'|require\('(node:)?fs'\)/.test(text)) offenders.push(full)
        }
      }
    }

    walk(path.resolve(__dirname, '../../../..'))

    expect(offenders).toEqual([])
  })
})
