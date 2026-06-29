import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1287 — Reader operador-scoped del reporte AEO.
 *
 * Prueba que `readOperatorScopedAeoReport`:
 *  - SELF-GUARDA con la capability `report.read_operator`: sin ella → `forbidden`, y NO toca el
 *    store (la org es arbitraria; el gate es la única protección, a diferencia del client reader);
 *  - con `runId` resuelve vía `getClientGraderRunById({ runId, organizationId })` (filtro por org
 *    en el SQL del store) y sin `runId` vía `getLatestClientGraderRun(organizationId)`;
 *  - store no resuelve un run de ESA org → `not_found` (sin revelar existencia ajena);
 *  - mapea `score_not_found` del builder a `report_unavailable`;
 *  - delega la re-proyección leak-safe a `toClientGraderReport` (mismo shape que el client reader).
 */

vi.mock('../store', () => ({
  getClientGraderRunById: vi.fn(),
  getLatestClientGraderRun: vi.fn()
}))

vi.mock('../report/command', async () => {
  const actual = (await vi.importActual('../report/command')) as Record<string, unknown>

  return { ...actual, readGraderReport: vi.fn() }
})

vi.mock('../report/builder', async () => {
  const actual = (await vi.importActual('../report/builder')) as Record<string, unknown>

  return { ...actual, toClientGraderReport: vi.fn() }
})

vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn() }))

import { getClientGraderRunById, getLatestClientGraderRun } from '../store'
import { GraderReportError, readGraderReport } from '../report/command'
import { toClientGraderReport } from '../report/builder'
import { can } from '@/lib/entitlements/runtime'
import { OperatorGraderReportError, readOperatorScopedAeoReport } from '../operator/command'

const ORG = 'org-aerolinea-a'

const subject = { roleCodes: ['efeonce_account'], routeGroups: ['internal'], authorizedViews: [] } as never

const fakeRun = (runId: string) => ({ runId }) as Awaited<ReturnType<typeof getClientGraderRunById>>
const clientShape = { audience: 'client' } as never

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(toClientGraderReport).mockReturnValue(clientShape)
  vi.mocked(readGraderReport).mockResolvedValue({ report: { audience: 'internal_sales' } } as never)
})

describe('readOperatorScopedAeoReport', () => {
  it('forbidden cuando el subject no tiene la capability (y NO toca el store)', async () => {
    vi.mocked(can).mockReturnValue(false)

    await expect(readOperatorScopedAeoReport({ subject, organizationId: ORG })).rejects.toMatchObject({
      code: 'forbidden'
    })

    expect(can).toHaveBeenCalledWith(subject, 'growth.ai_visibility.report.read_operator', 'read', 'tenant')
    expect(getLatestClientGraderRun).not.toHaveBeenCalled()
    expect(getClientGraderRunById).not.toHaveBeenCalled()
  })

  it('sin runId resuelve el último run reportable de la org y devuelve el shape cliente', async () => {
    vi.mocked(can).mockReturnValue(true)
    vi.mocked(getLatestClientGraderRun).mockResolvedValue(fakeRun('grun-1'))

    const result = await readOperatorScopedAeoReport({ subject, organizationId: ORG })

    expect(getLatestClientGraderRun).toHaveBeenCalledWith(ORG)
    expect(readGraderReport).toHaveBeenCalledWith({ runId: 'grun-1' })
    expect(result.report).toBe(clientShape)
  })

  it('con runId resuelve por id SCOPED a la org (filtro en el store)', async () => {
    vi.mocked(can).mockReturnValue(true)
    vi.mocked(getClientGraderRunById).mockResolvedValue(fakeRun('grun-9'))

    await readOperatorScopedAeoReport({ subject, organizationId: ORG, runId: 'grun-9' })

    expect(getClientGraderRunById).toHaveBeenCalledWith({ runId: 'grun-9', organizationId: ORG })
    expect(getLatestClientGraderRun).not.toHaveBeenCalled()
  })

  it('not_found cuando el store no resuelve un run de esa org', async () => {
    vi.mocked(can).mockReturnValue(true)
    vi.mocked(getLatestClientGraderRun).mockResolvedValue(null)

    await expect(readOperatorScopedAeoReport({ subject, organizationId: ORG })).rejects.toMatchObject({
      code: 'not_found'
    })
    expect(readGraderReport).not.toHaveBeenCalled()
  })

  it('mapea score_not_found del builder a report_unavailable', async () => {
    vi.mocked(can).mockReturnValue(true)
    vi.mocked(getLatestClientGraderRun).mockResolvedValue(fakeRun('grun-2'))
    vi.mocked(readGraderReport).mockRejectedValue(new GraderReportError('score_not_found', 'no score'))

    await expect(readOperatorScopedAeoReport({ subject, organizationId: ORG })).rejects.toMatchObject({
      code: 'report_unavailable'
    })
  })

  it('OperatorGraderReportError es la clase de error del dominio operador', async () => {
    vi.mocked(can).mockReturnValue(false)

    await expect(readOperatorScopedAeoReport({ subject, organizationId: ORG })).rejects.toBeInstanceOf(
      OperatorGraderReportError
    )
  })
})
