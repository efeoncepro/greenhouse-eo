/**
 * `content-day-live-console` (TASK-1942, deck Salesforce SF11): «¿Y después del go-live? Lo operamos.». El intent de
 * ejemplo compone la plantilla `ContentDayLiveConsole` con su contrato de slots limpio y la selección «Cliente» sobre la
 * franja de la revisión trimestral. Las reglas de la receta se cierran en el builder: cada cifra con su detalle, al
 * menos un control en curso y la píldora «Datos de muestra» salvo evidencia del cliente; el ícono de la consola es
 * opcional (con y sin él compone), el término compuesto de la pregunta no se corta y todo color y medida sale de AXIS.
 */

import fs from 'node:fs'
import path from 'node:path'

import { efeonceGraphicLine } from '@efeoncepro/axis-tokens'
import { describe, expect, it } from 'vitest'

import type { SlideSpec, TemplateContract } from '@/lib/artifact-composer/contracts'
import { validateSlide } from '@/lib/artifact-composer/validate'

import { planSurfacePiece, SurfacePieceError, type SurfaceIntent } from '../index'

const EXAMPLE = path.join(__dirname, '..', 'examples', 'deck-content-day-live-console-intent.json')
const CATALOG = path.join(__dirname, '..', '..', 'artifact-composer', 'catalogs', 'graphic-line-deck')

type Intent = SurfaceIntent & Record<string, unknown>

const example = (): Intent => JSON.parse(fs.readFileSync(EXAMPLE, 'utf8')) as Intent

/** El bloque de CSS de la receta en `graphic-line.css`: desde el ancla anterior hasta la suya. */
const cssSectionOf = (css: string, id: string): string => {
  const end = css.indexOf(`ancla TASK-1942 · ${id} `)

  if (end < 0) throw new Error(`graphic-line.css no trae el ancla de ${id}`)

  const start = css.lastIndexOf('── ancla ', end - 4)

  return css.slice(start + 1, end)
}

const template = fs.readFileSync(path.join(CATALOG, 'content-day-live-console.html'), 'utf8')
const styles = cssSectionOf(fs.readFileSync(path.join(CATALOG, 'graphic-line.css'), 'utf8'), 'content-day-live-console')
const contract = JSON.parse(fs.readFileSync(path.join(CATALOG, 'content-day-live-console.slots.json'), 'utf8')) as TemplateContract

const plan = (intent: SurfaceIntent) => {
  const piece = planSurfacePiece(intent, { artifactId: 'prueba' })
  const slide = piece.plan.slides[0]!
  const violations = validateSlide({ ...(slide as unknown as SlideSpec), template: 'ContentDayLiveConsole' } as SlideSpec, contract)

  return { piece, violations, slots: slide.slots as Record<string, unknown> }
}

const expectCode = (fn: () => unknown, code: SurfacePieceError['code']) => {
  let caught: unknown

  try {
    fn()
  } catch (error) {
    caught = error
  }

  expect(caught).toBeInstanceOf(SurfacePieceError)
  expect((caught as SurfacePieceError).code).toBe(code)
}

const G = efeonceGraphicLine as unknown as {
  color: Record<string, string>
  slogan: { leadColor: { onDark: string } }
  lines: { key: string; accentOnDark: string }[]
  surfaces: { deck: { recipes: Record<string, Record<string, unknown>> } }
}

const hexesIn = (value: unknown): string[] => JSON.stringify(value).match(/#[0-9a-f]{6}/gi)?.map(hex => hex.toLowerCase()) ?? []

const consoleOf = (patch: Record<string, unknown>): Intent => ({ ...example(), console: { ...(example().console as Record<string, unknown>), ...patch } }) as Intent

describe('deck · content-day-live-console (TASK-1942)', () => {
  it('compone la plantilla con el contrato de slots limpio y la selección «Cliente» sobre la revisión trimestral', () => {
    const { piece, violations, slots } = plan(example())

    expect(piece.contentType).toBe('deck.content-day-live-console')
    expect(violations).toEqual([])
    expect(slots.voice).toMatchObject({ answerLead: 'Lo', answer: 'operamos' })
    expect(slots.console).toEqual({ title: 'Operación gestionada · este mes', subtitle: 'Sales · Service · Marketing Cloud · Agentforce' })
    expect(slots.sampleMark).toBe('Datos de muestra')
    expect(slots.review).toEqual({ kicker: 'Próxima revisión trimestral', title: 'Arquitectura, adopción, deuda y prioridades', cta: 'Ver agenda' })
    expect(slots.selection).toMatchObject({ label: 'Cliente', anchor: 'bottom-start', participantKind: 'role', targetKind: 'object', padding: 'compact' })
    expect(template.match(/data-gl-selection-target/g)).toHaveLength(1)
    expect(template).toMatch(/class="gl-clv-review" data-slot="review" data-gl-selection-target/)
  })

  it('la consola va en perspectiva desde su borde con las medidas de AXIS', () => {
    expect(plan(example()).slots.frame).toMatchObject({
      consoleLeft: '--gl-clv-left=830px',
      consoleTop: '--gl-clv-top=160px',
      consoleWidth: '--gl-clv-width=840px',
      perspective: '--gl-clv-perspective=2200px',
      rotateY: '--gl-clv-rotate-y=-8deg',
      rotateX: '--gl-clv-rotate-x=3deg',
      originX: '--gl-clv-origin-x=0%',
      titleTracking: '--gl-clv-title-tracking=-0.015em'
    })
  })

  it('el término compuesto de la pregunta no se corta en su guion', () => {
    const question = (plan(example()).slots.voice as Record<string, string>).question!

    expect(question).toBe('¿Y después del go-⁠live?')
    expect(question.replace(/⁠/g, '')).toBe('¿Y después del go-live?')
  })

  it('cada control marca su estado y al menos uno va en curso', () => {
    const checks = example().console as { checks: Record<string, unknown>[] }

    expect((plan(example()).slots.checks as Record<string, string>[]).map(c => c.state)).toEqual(['done', 'done', 'done', 'todo'])
    expectCode(() => plan(consoleOf({ checks: checks.checks.map(c => ({ ...c, done: true })) })), 'invalid-intent')
    expectCode(() => plan(consoleOf({ checks: checks.checks.map((c, i) => (i === 0 ? { ...c, done: 'sí' } : c)) })), 'invalid-intent')
  })

  it('cada cifra va con su detalle', () => {
    const metrics = (example().console as { metrics: Record<string, unknown>[] }).metrics

    expectCode(() => plan(consoleOf({ metrics: metrics.map((m, i) => (i === 1 ? { ...m, detail: ' ' } : m)) })), 'invalid-intent')
    expectCode(() => plan(consoleOf({ metrics: metrics.slice(0, 2) })), 'invalid-intent')
  })

  it('«Datos de muestra» sólo se omite con evidencia del cliente', () => {
    expectCode(() => plan(consoleOf({ sampleMark: undefined })), 'invalid-intent')

    const withEvidence = plan(consoleOf({ sampleMark: undefined, evidenceRef: 'org-cliente/informe-2026-09' }))

    expect(withEvidence.violations).toEqual([])
    expect(withEvidence.slots.sampleMark).toBeUndefined()
    expect((contract.slots as Record<string, { required?: boolean }>).sampleMark?.required).toBe(false)
  })

  it('el ícono de la consola es opcional: sin él compone, con él es un archivo de AXIS_PARTNER_ASSETS', () => {
    const withIcon = plan(example())
    const files = withIcon.piece.assets.filter(asset => asset.kind === 'file') as { path: string }[]

    expect(files.map(file => file.path)).toEqual(['src/lib/artifact-composer/catalogs/graphic-line-deck/assets/partners/salesforce-icon-platform.svg'])
    expect(withIcon.slots.consoleIcon).toEqual({ src: 'asset-ref:file:salesforce-icon-platform' })

    const without = plan(consoleOf({ icon: undefined }))

    expect(without.violations).toEqual([])
    expect(without.slots.consoleIcon).toBeUndefined()
    expect(without.piece.assets.some(asset => asset.kind === 'file')).toBe(false)
    expect((contract.slots as Record<string, { required?: boolean }>).consoleIcon?.required).toBe(false)
    expectCode(() => plan(consoleOf({ icon: 'tableau-cloud' })), 'invalid-intent')
  })

  it('un campo obligatorio ausente no compone', () => {
    expectCode(() => plan({ ...example(), body: undefined } as unknown as Intent), 'invalid-intent')
    expectCode(() => plan(consoleOf({ title: ' ' })), 'invalid-intent')
    expectCode(() => plan(consoleOf({ review: { kicker: 'Próxima revisión', title: 'Qué se revisa' } })), 'invalid-intent')
    expectCode(() => plan({ ...example(), voice: { ...(example().voice as object), answer: ['Lo operamos'] } } as Intent), 'invalid-intent')
  })

  it('un texto sobre su largo del catálogo falla en su slot', () => {
    const checks = (example().console as { checks: Record<string, unknown>[] }).checks

    expect(plan(consoleOf({ title: 'x'.repeat(49) })).violations.some(v => (v as { slot?: string }).slot === 'console')).toBe(true)
    expect(plan(consoleOf({ sampleMark: 'x'.repeat(17) })).violations.some(v => (v as { slot?: string }).slot === 'sampleMark')).toBe(true)
    expect(plan(consoleOf({ checks: checks.map((c, i) => (i === 0 ? { ...c, status: 'x'.repeat(18) } : c)) })).violations.some(v => (v as { slot?: string }).slot === 'checks')).toBe(true)
    expect(plan(consoleOf({ review: { kicker: 'Próxima revisión trimestral', title: 'x'.repeat(70), cta: 'Ver agenda' } })).violations.some(v => (v as { slot?: string }).slot === 'review')).toBe(true)
  })

  it('todo color del plan sale de AXIS y el escenario toma el acento de la línea', () => {
    const { piece, slots } = plan(example())
    const accent = G.lines.find(line => line.key === 'revenue-salesforce')!.accentOnDark.toLowerCase()
    const recipe = G.surfaces.deck.recipes['content-day-live-console']!
    const allowed = new Set([...hexesIn(G.color), ...hexesIn(recipe), accent, G.slogan.leadColor.onDark.toLowerCase(), '#ffffff', '#000000'])
    const layers = piece.assets.flatMap(asset => hexesIn((asset as { svg?: string }).svg ?? ''))
    const used = [...hexesIn(slots), ...layers]

    expect(layers).toContain(accent)
    expect(used.filter(hex => !allowed.has(hex))).toEqual([])
  })

  it('la plantilla y su CSS no escriben valores de diseño: todo llega del builder', () => {
    for (const source of [template, styles]) {
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i)
      expect(source).not.toMatch(/rgba?\(/)
      expect(source.replace(/1px solid/g, '')).not.toMatch(/\b\d+(\.\d+)?px\b/)
      expect(source).not.toMatch(/Poppins|Bricolage|Geist/)
    }
  })
})
