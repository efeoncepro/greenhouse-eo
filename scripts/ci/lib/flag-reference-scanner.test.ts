import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { extractFlagReferences } from './flag-reference-scanner.mjs'

/**
 * Prueba de comportamiento del escáner que usa `feature-flags-audit.mjs`: se le pasa código
 * con cada forma real de leer un flag y se exige que la reconozca. Un flag que el escáner no
 * ve escapa del gate ISSUE-150 (flag ON en Production sin su código en `main`).
 */
describe('extractFlagReferences', () => {
  it('reconoce la lectura por punto sobre process.env', () => {
    expect(extractFlagReferences("if (process.env.HOME_V2_ENABLED === 'true') {}")).toEqual(
      new Set(['HOME_V2_ENABLED'])
    )
  })

  it('reconoce la indirección por literal (process.env[...] y constante)', () => {
    const text = [
      "const QUEUE_FLAG = 'GROWTH_SEO_WORK_QUEUE_ENABLED'",
      'export const on = (env = process.env) => env[QUEUE_FLAG] === "true"',
      "const other = process.env['NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED']"
    ].join('\n')

    expect(extractFlagReferences(text)).toEqual(
      new Set(['GROWTH_SEO_WORK_QUEUE_ENABLED', 'NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED'])
    )
  })

  it('reconoce la lectura por punto sobre un env inyectado (caso Insights 2026-11-07)', () => {
    const text = [
      'type EnvSource = Record<string, string | undefined>',
      'export const isGenerationOn = (env: EnvSource = process.env): boolean => isOn(env.INSIGHTS_GENERATION_ENABLED)',
      'export const isIssuanceOn = (source: EnvSource) => source?.INSIGHTS_ISSUANCE_ENABLED === "true"'
    ].join('\n')

    expect(extractFlagReferences(text)).toEqual(
      new Set(['INSIGHTS_GENERATION_ENABLED', 'INSIGHTS_ISSUANCE_ENABLED'])
    )
  })

  it('no inventa flags de identificadores que no terminan en _ENABLED', () => {
    expect(extractFlagReferences('const x = env.GREENHOUSE_POSTGRES_HOST; const y = "ENABLED"')).toEqual(new Set())
  })

  it('ve los lectores reales de Efeonce Insights del repo', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/efeonce-insights/flags.ts'), 'utf8')
    const found = extractFlagReferences(source)

    for (const flag of ['INSIGHTS_GENERATION_ENABLED', 'INSIGHTS_ISSUANCE_ENABLED']) {
      expect(found.has(flag)).toBe(true)
    }
  })
})
