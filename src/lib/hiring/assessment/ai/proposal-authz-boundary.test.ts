import { readFileSync } from 'node:fs'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({ query: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: mocks.query }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: vi.fn() }))

import { listAiProposals } from './proposal-store'

/**
 * TASK-1734 Slice 5 — Boundary de acceso del carril interno de scoring (reader TASK-1361).
 *
 * Contrato vigente (verificado 2026-08-16):
 * - `listAiProposals` es un reader GLOBAL: no aplica capability ni scope por aplicación
 *   dentro del store; la autorización vive en el route (`requireInternalTenantContext` +
 *   `can('hiring.assessment.read')`, capability tenant-wide). El scope por aplicación se
 *   filtra client-side en Application 360 (Delta 2026-08-16 punto 7 de TASK-1734).
 * - El reader run-scoped con resource+purpose exacto es del Slice 4 (no existe aún);
 *   estos tests fijan el contrato ACTUAL para que un cambio de authz sea deliberado.
 */

describe('TASK-1734 Slice 5 — listAiProposals boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.query.mockResolvedValue([])
  })

  it('con targetRef filtra por igualdad EXACTA parametrizada (sin LIKE ni interpolación)', async () => {
    await listAiProposals({ targetRef: 'resp-1' })

    const [sql, values] = mocks.query.mock.calls[0] as [string, unknown[]]

    expect(sql).toContain('target_ref = $1')
    expect(sql).not.toMatch(/LIKE|ILIKE/i)
    expect(sql).not.toContain('resp-1')
    expect(values).toEqual(['resp-1'])
  })

  it('clampa limit a [1, 200] y offset a >= 0 (anti-extracción masiva por query param)', async () => {
    await listAiProposals({ limit: 99999, offset: -5 })

    const [sql] = mocks.query.mock.calls[0] as [string]

    expect(sql).toContain('LIMIT 200')
    expect(sql).toContain('OFFSET 0')

    await listAiProposals({ limit: 0 })

    expect((mocks.query.mock.calls[1] as [string])[0]).toContain('LIMIT 1')
  })

  it('rechaza kind/status fuera del enum con error de validación (nunca SQL crudo)', async () => {
    await expect(listAiProposals({ kind: 'sql_injection' as never })).rejects.toMatchObject({
      code: 'assessment_ai_invalid_enum',
    })
    expect(mocks.query).not.toHaveBeenCalled()
  })

  it('HALLAZGO documentado: el reader NO valida capability ni scope por aplicación (authz sólo en el route)', async () => {
    // Contrato actual: sin filtros retorna la cola global. Si alguien agrega authz al store,
    // este test debe actualizarse JUNTO con el route y el reader run-scoped del Slice 4.
    await listAiProposals()

    const [sql, values] = mocks.query.mock.calls[0] as [string, unknown[]]

    expect(sql).not.toMatch(/capability|tenant|member_id|actor/i)
    expect(values).toEqual([])
  })
})

describe('TASK-1734 Slice 5 — gates estáticos del route interno de proposals', () => {
  const routeSource = readFileSync(
    `${process.cwd()}/src/app/api/hiring/assessments/ai/proposals/route.ts`,
    'utf8',
  )

  it('el route GET exige tenant interno + capability hiring.assessment.read ANTES de listar', () => {
    expect(routeSource).toContain('requireInternalTenantContext')
    expect(routeSource).toMatch(/can\(\s*tenant,\s*'hiring\.assessment\.read'/)

    // El check de capability ocurre antes de la llamada al reader.
    const capabilityIndex = routeSource.indexOf('hiring.assessment.read')
    const listIndex = routeSource.indexOf('listAiProposals(')

    expect(capabilityIndex).toBeGreaterThan(-1)
    expect(listIndex).toBeGreaterThan(capabilityIndex)
  })

  it('el route no expone un bypass por flag (la cola siempre requiere authz humana)', () => {
    expect(routeSource).not.toMatch(/HIRING_ASSESSMENT_AI_ENABLED/)
  })
})
