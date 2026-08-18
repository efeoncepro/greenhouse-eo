import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// TASK-1734 Slice 4 — gate estructural de capability del route operator-only (patrón
// treasury-shareholder-capability-gates): GET y POST enforzan `hiring.assessment.score`
// con can() ANTES de tocar el primitive. Anti-regresión de que el gate no se quite.

const routePath = join(
  process.cwd(),
  'src/app/api/hiring/assessments/ai/scoring-runs/[runId]/route.ts',
)

describe('TASK-1734 — scoring-run route gatea por capability', () => {
  const src = readFileSync(routePath, 'utf8')

  it.each(['GET', 'POST'])('%s enforza hiring.assessment.score con can() antes del primitive', handler => {
    const handlerIdx = src.indexOf(`export async function ${handler}`)

    expect(handlerIdx).toBeGreaterThan(-1)

    const nextHandlerIdx = src.indexOf('export async function', handlerIdx + 1)
    const handlerSrc = src.slice(handlerIdx, nextHandlerIdx === -1 ? undefined : nextHandlerIdx)

    expect(handlerSrc).toContain("can(tenant, 'hiring.assessment.score', 'execute', 'tenant')")
    expect(handlerSrc).toContain('requireInternalTenantContext')
  })

  it('el route no importa stores directos: consume solo los primitives canónicos', () => {
    expect(src).toContain("from '@/lib/hiring/assessment/ai'")
    expect(src).not.toContain('runGreenhousePostgresQuery')
  })
})
