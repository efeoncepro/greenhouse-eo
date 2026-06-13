import { describe, expect, it } from 'vitest'

import {
  INTERACTIVE_ROLES,
  interactionName,
  parseAriaSnapshot,
  parseInteractionSpec,
  slugifyRoute,
  suggestRoleLocator,
  type ExploreInteraction,
  type ExploreSession
} from './explore'
import { buildInteractionStep, buildPromotedScenario, pickReadinessSelector, serializeScenario } from './promote'
import { validateScenario } from './scenario'

const SAMPLE_ARIA = `- main:
  - heading "Cash-Out" [level=4]
  - tablist:
    - tab "Pendientes" [selected]
    - tab "Conciliados"
  - button "Registrar pago"
  - text: ignorame
  - link "Ver detalle":
    - /url: "#"
  - img "Efeonce"`

describe('parseAriaSnapshot (TASK-1098)', () => {
  const candidates = parseAriaSnapshot(SAMPLE_ARIA)

  it('extrae roles + nombres del árbol de accesibilidad', () => {
    const button = candidates.find(c => c.role === 'button')

    expect(button).toBeDefined()
    expect(button?.name).toBe('Registrar pago')
    expect(button?.interactive).toBe(true)
    expect(button?.suggestedLocator).toBe("getByRole('button', { name: 'Registrar pago' })")
  })

  it('marca interactivos vs no-interactivos', () => {
    expect(candidates.find(c => c.role === 'tab' && c.name === 'Conciliados')?.interactive).toBe(true)
    expect(candidates.find(c => c.role === 'heading')?.interactive).toBe(false)
    expect(candidates.find(c => c.role === 'img')?.interactive).toBe(false)
  })

  it('captura el nivel de los headings', () => {
    expect(candidates.find(c => c.role === 'heading')?.level).toBe(4)
  })

  it('ignora el rol `text` (no direccionable)', () => {
    expect(candidates.some(c => c.role === 'text')).toBe(false)
  })

  it('roles interactivos canónicos incluyen button/tab/link/textbox', () => {
    for (const role of ['button', 'tab', 'link', 'textbox', 'combobox']) {
      expect(INTERACTIVE_ROLES.has(role)).toBe(true)
    }
  })
})

describe('suggestRoleLocator', () => {
  it('emite getByRole con name cuando hay nombre', () => {
    expect(suggestRoleLocator('button', 'Guardar')).toBe("getByRole('button', { name: 'Guardar' })")
  })

  it('emite getByRole sin name cuando no hay nombre', () => {
    expect(suggestRoleLocator('list', '')).toBe("getByRole('list')")
  })

  it('escapa comillas simples en el nombre', () => {
    expect(suggestRoleLocator('button', "L'État")).toBe("getByRole('button', { name: 'L\\'État' })")
  })
})

describe('slugifyRoute', () => {
  it('genera slug estable', () => {
    expect(slugifyRoute('/finance/cash-out')).toBe('finance-cash-out')
    expect(slugifyRoute('/')).toBe('root')
  })
})

const buildSession = (overrides: Partial<ExploreSession> = {}): ExploreSession => ({
  route: '/finance/cash-out',
  env: 'staging',
  capturedAt: '2026-06-12T00:00:00.000Z',
  ariaSnapshotPath: 'aria.txt',
  screenshotPath: 'snapshot.png',
  markers: [],
  candidates: parseAriaSnapshot(SAMPLE_ARIA).map(c => ({ ...c, unique: true })),
  probes: [],
  interactions: [],
  ...overrides
})

describe('pickReadinessSelector', () => {
  it('prefiere data-gvc-ready > data-capture > heading único', () => {
    const session = buildSession({
      markers: [
        { selector: '[data-capture="list"]', count: 1 },
        { selector: '[data-gvc-ready="cash-out"]', count: 1 }
      ]
    })

    expect(pickReadinessSelector(session)).toBe('[data-gvc-ready="cash-out"]')
  })

  it('cae a data-capture si no hay data-gvc-ready', () => {
    expect(pickReadinessSelector(buildSession({ markers: [{ selector: '[data-capture="list"]', count: 1 }] }))).toBe('[data-capture="list"]')
  })

  it('cae a heading único cuando no hay markers', () => {
    expect(pickReadinessSelector(buildSession())).toBe('role=heading[name="Cash-Out"]')
  })
})

describe('buildPromotedScenario + serializeScenario', () => {
  it('emite un scenario que pasa validateScenario', () => {
    const scenario = buildPromotedScenario(buildSession(), { name: 'cash-out-explore' })

    expect(() => validateScenario(scenario)).not.toThrow()
    expect(scenario.route).toBe('/finance/cash-out')
    expect(scenario.steps[0]).toEqual({ kind: 'mark', label: 'initial' })
    expect(scenario.mutating).toBeUndefined() // NUNCA mutating
  })

  it('agrega scroll+mark con clipSelector por cada --mark', () => {
    const scenario = buildPromotedScenario(buildSession(), {
      name: 'cash-out-explore',
      markSelectors: ['[data-capture="timeline"]']
    })

    expect(() => validateScenario(scenario)).not.toThrow()
    const labels = scenario.steps.filter(s => s.kind === 'mark').map(s => s.label)

    expect(labels).toContain('initial')
    expect(labels).toContain('section-timeline')
    const clip = scenario.steps.find(s => s.kind === 'mark' && s.clipSelector)

    expect(clip?.clipSelector).toBe('[data-capture="timeline"]')
  })

  it('serializa a un módulo .scenario.ts válido (import + export)', () => {
    const scenario = buildPromotedScenario(buildSession(), { name: 'cash-out-explore' })
    const src = serializeScenario(scenario)

    expect(src).toContain("import type { CaptureScenario } from '../lib/scenario'")
    expect(src).toContain('export const scenario: CaptureScenario =')
    expect(src).toContain('"route": "/finance/cash-out"')
    // El body (después del `=`) es JSON válido (subset de TS) → re-parseable.
    const marker = 'export const scenario: CaptureScenario = '
    const body = src.slice(src.indexOf(marker) + marker.length).trim()

    expect(() => JSON.parse(body)).not.toThrow()
    expect(JSON.parse(body).route).toBe('/finance/cash-out')
  })

  it('rechaza un nombre no-kebab vía validateScenario', () => {
    const scenario = buildPromotedScenario(buildSession(), { name: 'BadName' })

    expect(() => validateScenario(scenario)).toThrow()
  })
})

describe('parseInteractionSpec + interactionName (TASK-1099)', () => {
  it('parsea <kind>:<selector> (selector puede tener `:`)', () => {
    expect(parseInteractionSpec('hover:[role="tab"]')).toEqual({ kind: 'hover', selector: '[role="tab"]' })
    expect(parseInteractionSpec('click:role=button[name="X"]')).toEqual({ kind: 'click', selector: 'role=button[name="X"]' })
  })

  it('rechaza kinds mutantes (solo hover/focus/click — read-only)', () => {
    expect(() => parseInteractionSpec('fill:[name="x"]')).toThrow()
    expect(() => parseInteractionSpec('press:Enter')).toThrow()
    expect(() => parseInteractionSpec('hover')).toThrow()
  })

  it('genera nombre kebab estable', () => {
    expect(interactionName('hover', '[data-capture="timeline"]')).toBe('hover-timeline')
    expect(interactionName('click', 'role=tab[name="Conciliados"]')).toBe('click-tab-conciliados')
  })
})

describe('buildInteractionStep + scenario con interacciones (TASK-1099)', () => {
  const interaction: ExploreInteraction = {
    name: 'hover-tab',
    action: { kind: 'hover', selector: '[role="tab"]' },
    resolved: true,
    frames: [
      { label: 'before', atMs: 0, screenshotPath: 'a.png' },
      { label: 'feedback', atMs: 150, screenshotPath: 'b.png' },
      { label: 'settled', atMs: 300, screenshotPath: 'c.png' }
    ]
  }

  it('emite un step interaction válido', () => {
    const step = buildInteractionStep(interaction)

    expect(step.kind).toBe('interaction')
    expect(step.interaction?.name).toBe('hover-tab')
    expect(step.interaction?.action).toEqual({ kind: 'hover', selector: '[role="tab"]' })
    expect(step.interaction?.frames.map(f => f.label)).toEqual(['before', 'feedback', 'settled'])
    expect(step.interaction?.reducedMotion).toBe('capture')
    expect(step.interaction?.keyboardEquivalent?.action).toEqual({ kind: 'press', key: 'Tab' })
  })

  it('click → keyboardEquivalent Enter', () => {
    const step = buildInteractionStep({ ...interaction, action: { kind: 'click', selector: '[role="tab"]' } })

    expect(step.interaction?.keyboardEquivalent?.action.key).toBe('Enter')
  })

  it('buildPromotedScenario incluye interacciones resueltas y pasa validateScenario', () => {
    const scenario = buildPromotedScenario(buildSession({ interactions: [interaction] }), { name: 'cash-out-interactions' })

    expect(() => validateScenario(scenario)).not.toThrow()
    expect(scenario.steps.some(s => s.kind === 'interaction')).toBe(true)
  })

  it('omite interacciones no resueltas', () => {
    const scenario = buildPromotedScenario(
      buildSession({ interactions: [{ ...interaction, resolved: false }] }),
      { name: 'x-no-interaction' }
    )

    expect(scenario.steps.some(s => s.kind === 'interaction')).toBe(false)
  })
})
