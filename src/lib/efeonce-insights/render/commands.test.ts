import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { InsightEditionRecord } from '../stores/records'

/**
 * TASK-1846 — `requestInsightRender` y el `InsightOutputsPort` real con stores mockeados:
 * flag OFF, anti-oracle por audiencia, estado, outputs no renderizables, idempotencia por run vivo,
 * encolado + evento, y el puerto que sólo valida con TODOS los outputs completados.
 * El SQL real se ejercita en `render.live.test.ts`.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const stores = vi.hoisted(() => ({
  getInsightEditionById: vi.fn(),
  getInsightReportById: vi.fn(),
  getInsightEvidenceSnapshotByEdition: vi.fn(),
  getInsightEditorialPlanByEdition: vi.fn()
}))

const render = vi.hoisted(() => ({
  findInsightOutputsForEdition: vi.fn(async () => []),
  getInsightRenderRun: vi.fn(),
  listInsightOutputsForRun: vi.fn(async () => []),
  insertInsightRenderRun: vi.fn(async (input: { outputs: Array<{ output: string; manifestHash: string }> }) => ({
    run: { renderRunId: 'irun-1', state: 'pending', audience: 'client' },
    outputs: input.outputs.map((o, i) => ({ insightOutputId: `iout-${i}`, output: o.output, state: 'queued', manifestHash: o.manifestHash }))
  })),
  retryFailedInsightOutputs: vi.fn(async () => []),
  cancelInsightRenderRun: vi.fn(async () => ({ cancelled: 0, stillRunning: 0 }))
}))

vi.mock('../stores/edition-store', () => ({ getInsightEditionById: stores.getInsightEditionById }))
vi.mock('../stores/report-store', () => ({ getInsightReportById: stores.getInsightReportById }))
vi.mock('../stores/snapshot-store', () => ({ getInsightEvidenceSnapshotByEdition: stores.getInsightEvidenceSnapshotByEdition }))
vi.mock('../stores/plan-store', () => ({ getInsightEditorialPlanByEdition: stores.getInsightEditorialPlanByEdition }))
vi.mock('./store', () => render)

const infra = vi.hoisted(() => ({ withTx: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn({ query: vi.fn() })), pgQuery: vi.fn(), publish: vi.fn(async () => 'outbox-1') }))

vi.mock('@/lib/postgres/client', () => ({ withGreenhousePostgresTransaction: infra.withTx, runGreenhousePostgresQuery: infra.pgQuery }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: infra.publish }))

const ENV_ON = { INSIGHTS_RENDER_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv
const internalSubject = { userId: 'user-int', tenantType: 'efeonce_internal' as const, roleCodes: ['efeonce_account'], primaryRoleCode: 'efeonce_account', routeGroups: ['internal'], authorizedViews: [], memberId: 'mem-1' }
const clientSubject = { userId: 'user-cli', tenantType: 'client' as const, roleCodes: ['client_manager'], primaryRoleCode: 'client_manager', routeGroups: ['client'], authorizedViews: [] }

const edition = (overrides: Partial<InsightEditionRecord> = {}): InsightEditionRecord =>
  ({
    editionId: 'insed-1', reportId: 'insr-1', organizationId: 'org-a', version: 1, audience: 'client', state: 'ready_for_review', failedPhase: null,
    request: { requestVersion: 'insight_request_v1', organizationId: 'org-a', modules: ['seo'], period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' }, comparison: { kind: 'previous_period' }, audience: 'client', locale: 'es-CL', depth: 'standard', outputs: ['deck_pdf'], brand: { efeoncePackVersion: 'axis-current', clientBrandRef: null }, projectIds: [] },
    requestHash: 'h'.repeat(64), idempotencyKey: 'k', modules: ['seo'], outputs: ['deck_pdf'], periodTimeZone: 'America/Santiago', periodStartUtc: '2026-08-01T04:00:00.000Z', periodEndUtc: '2026-09-01T04:00:00.000Z',
    supersedesEditionId: null, reviewOwnerUserId: null, issuedAt: null, issuedByUserId: null, issuedHash: null, withdrawnAt: null, createdByActorKind: 'member', createdByUserId: 'user-int', createdByMemberId: 'mem-1', createdAt: 'c', updatedAt: 'u', ...overrides
  }) as InsightEditionRecord

const moduleAssigned = (assigned: boolean) => infra.pgQuery.mockImplementation(async (sql: string) => (sql.includes('module_assignments') ? (assigned ? [{ status: 'active' }] : []) : []))

const primeFrozen = () => {
  stores.getInsightReportById.mockResolvedValue({ reportId: 'insr-1', reportCode: 'EO-INS-000001', organizationId: 'org-a', purpose: 'p', title: 'Berel · Informe', status: 'active' })
  stores.getInsightEvidenceSnapshotByEdition.mockResolvedValue({ snapshotId: 's', sealedAt: 'x', snapshotHash: 'a'.repeat(64), facts: [], rejections: [], sources: [] })
  stores.getInsightEditorialPlanByEdition.mockResolvedValue({ planId: 'p', frozenAt: 'x', planHash: 'b'.repeat(64), plan: { planVersion: 'editorial_plan_v1', locale: 'es-CL', executiveSummary: [], actions: [], references: [], limits: [], methodology: [], chapters: [{ chapterId: 'chapter.seo', module: 'seo', title: 'SEO', claims: [{ claimId: 'c', text: 'Sin cambios relevantes.', factIds: [] }], charts: [], tables: [], limits: [] }] } })
}

const scope = { subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', env: ENV_ON }

describe('requestInsightRender', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    moduleAssigned(true)
    render.findInsightOutputsForEdition.mockResolvedValue([])
  })

  it('flag OFF ⇒ render_disabled antes de tocar la base', async () => {
    const { requestInsightRender } = await import('./commands')

    await expect(requestInsightRender({ ...scope, env: {} as NodeJS.ProcessEnv })).rejects.toMatchObject({ code: 'render_disabled' })
    expect(stores.getInsightEditionById).not.toHaveBeenCalled()
  })

  it('un cliente no puede encargar el render de una edición interna: 404 anti-oracle', async () => {
    const { requestInsightRender } = await import('./commands')

    stores.getInsightEditionById.mockResolvedValue(edition({ audience: 'internal' }))
    await expect(requestInsightRender({ ...scope, subject: clientSubject, actorOrganizationId: 'org-a' })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('sólo ready_for_review se renderiza; un output no renderizable se rechaza y no se encola', async () => {
    const { requestInsightRender } = await import('./commands')

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'collecting' }))
    await expect(requestInsightRender(scope)).rejects.toMatchObject({ code: 'not_ready' })

    stores.getInsightEditionById.mockResolvedValue(edition({ outputs: ['deck_pdf', 'report_pdf'] }))
    await expect(requestInsightRender({ ...scope, outputs: ['report_pdf'] })).rejects.toMatchObject({ code: 'render_rejected', details: { unsupported: ['report_pdf'] } })
    expect(render.insertInsightRenderRun).not.toHaveBeenCalled()
  })

  it('encola: input sellado y hasheado, run + outputs en una tx, y publica insights.render.requested (202)', async () => {
    const { requestInsightRender } = await import('./commands')

    stores.getInsightEditionById.mockResolvedValue(edition())
    primeFrozen()

    const result = await requestInsightRender(scope)

    expect(result.idempotent).toBe(false)
    expect(result.run.renderRunId).toBe('irun-1')
    const inserted = (render.insertInsightRenderRun.mock.calls[0] as unknown as [{ outputs: Array<{ manifestHash: string; catalogName: string }>; audience: string }])[0]

    expect(inserted.audience).toBe('client')
    expect(inserted.outputs[0]!.manifestHash).toMatch(/^[0-9a-f]{64}$/)
    expect(inserted.outputs[0]!.catalogName).toBe('deck-axis')
    // El catálogo NO se importa acá: se sella el input canónico y el worker resuelve (bundle de Vercel).
    expect((infra.publish.mock.calls as unknown as Array<[{ eventType: string }]>).map(c => c[0].eventType)).toEqual(['insights.render.requested'])
  })

  it('un run vivo que ya cubre los targets se devuelve idempotente; dead_letter/cancelled no cuentan como vivos', async () => {
    const { requestInsightRender } = await import('./commands')

    stores.getInsightEditionById.mockResolvedValue(edition())
    primeFrozen()
    render.findInsightOutputsForEdition.mockResolvedValue([{ insightOutputId: 'iout-0', renderRunId: 'irun-9', output: 'deck_pdf', state: 'running' }] as never)
    render.getInsightRenderRun.mockResolvedValue({ renderRunId: 'irun-9', state: 'running' })

    expect((await requestInsightRender(scope)).idempotent).toBe(true)
    expect(render.insertInsightRenderRun).not.toHaveBeenCalled()

    render.findInsightOutputsForEdition.mockResolvedValue([{ insightOutputId: 'iout-0', renderRunId: 'irun-9', output: 'deck_pdf', state: 'dead_letter' }] as never)
    expect((await requestInsightRender(scope)).idempotent).toBe(false)
    expect(render.insertInsightRenderRun).toHaveBeenCalledTimes(1)
  })
})

describe('InsightOutputsPort real', () => {
  beforeEach(() => vi.clearAllMocks())

  it('not_ready mientras falte un output completado de la MISMA audiencia; valida cuando están todos', async () => {
    const { createInsightOutputsPort } = await import('./outputs-port')
    const port = createInsightOutputsPort()

    render.findInsightOutputsForEdition.mockResolvedValue([{ output: 'deck_pdf', state: 'running', outputAssetId: null, manifestHash: 'c'.repeat(64) }] as never)
    await expect(port.assertOutputsValidated(edition())).rejects.toMatchObject({ code: 'not_ready', details: { missing: ['deck_pdf'] } })

    render.findInsightOutputsForEdition.mockResolvedValue([{ output: 'deck_pdf', state: 'completed', outputAssetId: 'asset-1', manifestHash: 'c'.repeat(64) }] as never)
    const validated = await port.assertOutputsValidated(edition())

    expect(validated.outputs).toEqual([{ output: 'deck_pdf', assetId: 'asset-1', manifestHash: 'c'.repeat(64) }])
    // La consulta va con la audiencia de la edición: un output interno jamás valida una edición de cliente.
    expect(render.findInsightOutputsForEdition).toHaveBeenLastCalledWith(expect.objectContaining({ audience: 'client' }))
  })
})
