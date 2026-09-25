/**
 * TASK-1889 × TASK-1888 — los topes de texto del plan (`PLAN_TEXT_LIMITS`) caben en el molde MÁS ESTRECHO de los dos
 * catálogos. El contrato dice cuánto puede escribir el planner; los `*.slots.json` dicen cuánto cabe en el papel. Si
 * alguien agranda un tope o achica un molde, este test falla aquí en vez de rechazar el render de una edición real.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { PLAN_TEXT_LIMITS } from '../contracts/plan'

const catalogs = path.resolve(process.cwd(), 'src/lib/artifact-composer/catalogs')

const slots = (catalog: string, template: string): Record<string, any> =>
  JSON.parse(fs.readFileSync(path.join(catalogs, catalog, `${template}.slots.json`), 'utf8')).slots

const figureTemplates = [
  ['insights-report', ['report-figure-comparison', 'report-figure-columns', 'report-figure-targets', 'report-figure-trend']],
  ['insights-deck', ['insights-figure-comparison', 'insights-figure-columns', 'insights-figure-targets', 'insights-figure-trend']]
] as const

const summaries = [['insights-report', 'report-summary'], ['insights-deck', 'insights-summary']] as const

describe('PLAN_TEXT_LIMITS ≤ molde más estrecho', () => {
  it.each(figureTemplates.flatMap(([catalog, templates]) => templates.map(t => [catalog, t] as const)))('%s/%s', (catalog, template) => {
    const s = slots(catalog, template)

    expect(PLAN_TEXT_LIMITS.conclusion).toBeLessThanOrEqual(s.conclusion.constraints.maxCharacters)
    expect(PLAN_TEXT_LIMITS.keyFigureValue).toBeLessThanOrEqual(s.keyFigure.constraints.maxCharacters)
    expect(PLAN_TEXT_LIMITS.keyFigureCaption).toBeLessThanOrEqual(s.keyCaption.constraints.maxCharacters)
    expect(Math.max(PLAN_TEXT_LIMITS.meaning, PLAN_TEXT_LIMITS.nextStep)).toBeLessThanOrEqual(s.closing.item.shape.text.maxCharacters)
  })

  it.each(summaries)('%s/%s', (catalog, template) => {
    const s = slots(catalog, template)

    expect(PLAN_TEXT_LIMITS.summaryThesis).toBeLessThanOrEqual(s.thesis.constraints.maxCharacters)
    expect(PLAN_TEXT_LIMITS.summaryLead).toBeLessThanOrEqual(s.thesisLead.constraints.maxCharacters)
    expect(PLAN_TEXT_LIMITS.decision).toBeLessThanOrEqual(s.decision.shape.text.maxCharacters)
  })
})
