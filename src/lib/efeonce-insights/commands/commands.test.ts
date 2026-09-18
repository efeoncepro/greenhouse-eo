import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { InsightEditionRecord, InsightReportRecord } from '../stores/records'

/**
 * TASK-1845 — commands con stores/authz mockeados: allow/deny por actor y target, audiencia,
 * idempotencia (misma key = misma edición; payload distinto = conflicto), flags OFF, gate de
 * emisión (outputs no validados ⇒ not_ready), retirada y recuperación por fase. El SQL real de
 * los stores se ejercita en `stores.live.test.ts`.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const stores = vi.hoisted(() => ({
  findInsightEditionByIdempotencyKey: vi.fn(),
  getInsightEditionById: vi.fn(),
  insertInsightEdition: vi.fn(),
  transitionInsightEditionState: vi.fn(),
  listInsightEditions: vi.fn(),
  listInsightEditionTransitions: vi.fn(),
  insertInsightReport: vi.fn(),
  lockInsightReport: vi.fn(),
  getInsightReportById: vi.fn(),
  listInsightReports: vi.fn(),
  upsertInsightEvidenceSnapshot: vi.fn(),
  sealInsightEvidenceSnapshot: vi.fn(),
  getInsightEvidenceSnapshotByEdition: vi.fn(),
  upsertInsightEditorialPlan: vi.fn(),
  freezeInsightEditorialPlan: vi.fn(),
  getInsightEditorialPlanByEdition: vi.fn()
}))

vi.mock('../stores/edition-store', () => ({
  findInsightEditionByIdempotencyKey: stores.findInsightEditionByIdempotencyKey,
  getInsightEditionById: stores.getInsightEditionById,
  insertInsightEdition: stores.insertInsightEdition,
  transitionInsightEditionState: stores.transitionInsightEditionState,
  listInsightEditions: stores.listInsightEditions,
  listInsightEditionTransitions: stores.listInsightEditionTransitions
}))
vi.mock('../stores/report-store', () => ({ insertInsightReport: stores.insertInsightReport, lockInsightReport: stores.lockInsightReport, getInsightReportById: stores.getInsightReportById, listInsightReports: stores.listInsightReports }))
vi.mock('../stores/snapshot-store', () => ({ upsertInsightEvidenceSnapshot: stores.upsertInsightEvidenceSnapshot, sealInsightEvidenceSnapshot: stores.sealInsightEvidenceSnapshot, getInsightEvidenceSnapshotByEdition: stores.getInsightEvidenceSnapshotByEdition }))
vi.mock('../stores/plan-store', () => ({ upsertInsightEditorialPlan: stores.upsertInsightEditorialPlan, freezeInsightEditorialPlan: stores.freezeInsightEditorialPlan, getInsightEditorialPlanByEdition: stores.getInsightEditorialPlanByEdition }))

const infra = vi.hoisted(() => ({ withTx: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn({ query: vi.fn() })), pgQuery: vi.fn(), publish: vi.fn(async () => 'outbox-1'), collect: vi.fn(), author: vi.fn() }))

vi.mock('@/lib/postgres/client', () => ({ withGreenhousePostgresTransaction: infra.withTx, runGreenhousePostgresQuery: infra.pgQuery }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: infra.publish }))
vi.mock('../adapters/collect-evidence', () => ({ collectInsightEvidence: infra.collect }))
vi.mock('../editorial/author-plan', () => ({ authorEditorialPlan: infra.author }))

// TASK-1848 — retirar corta los enlaces vivos en la misma transacción.
const sharing = vi.hoisted(() => ({ revokeActiveInsightShareGrantsForEdition: vi.fn(async () => [{ shareGrantId: 'ishr-1', editionId: 'insed-1', organizationId: 'org-a' }]) }))

vi.mock('../sharing/store', () => sharing)

const ENV_ON = { INSIGHTS_GENERATION_ENABLED: 'true', INSIGHTS_ISSUANCE_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv

const internalSubject = { userId: 'user-int', tenantType: 'efeonce_internal' as const, roleCodes: ['efeonce_account'], primaryRoleCode: 'efeonce_account', routeGroups: ['internal'], authorizedViews: [], memberId: 'mem-1' }
const opsSubject = { ...internalSubject, userId: 'user-ops', roleCodes: ['efeonce_operations'], primaryRoleCode: 'efeonce_operations', memberId: 'mem-2' }
const clientSubject = { userId: 'user-cli', tenantType: 'client' as const, roleCodes: ['client_manager'], primaryRoleCode: 'client_manager', routeGroups: ['client'], authorizedViews: [] }

const request = (overrides: Record<string, unknown> = {}) => ({
  modules: ['seo'],
  period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' },
  comparison: { kind: 'previous_period' },
  audience: 'client',
  outputs: ['report_pdf'],
  idempotencyKey: 'idem-key-0001',
  ...overrides
})

const report: InsightReportRecord = { reportId: 'insr-1', reportCode: 'EO-INS-000001', organizationId: 'org-a', purpose: 'p', title: 't', status: 'active', createdByActorKind: 'member', createdByUserId: 'user-int', createdByMemberId: 'mem-1', createdAt: 'c', updatedAt: 'u' }

const edition = (overrides: Partial<InsightEditionRecord> = {}): InsightEditionRecord => ({
  editionId: 'insed-1', reportId: 'insr-1', organizationId: 'org-a', version: 1, audience: 'client', state: 'draft', failedPhase: null,
  request: { requestVersion: 'insight_request_v1', organizationId: 'org-a', modules: ['seo'], period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' }, comparison: { kind: 'previous_period' }, audience: 'client', locale: 'es-CL', depth: 'standard', outputs: ['report_pdf'], brand: { efeoncePackVersion: 'axis-current', clientBrandRef: null }, projectIds: [] },
  requestHash: 'h'.repeat(64), idempotencyKey: 'idem-key-0001', modules: ['seo'], outputs: ['report_pdf'], periodTimeZone: 'America/Santiago', periodStartUtc: '2026-08-01T04:00:00.000Z', periodEndUtc: '2026-09-01T04:00:00.000Z',
  supersedesEditionId: null, reviewOwnerUserId: null, issuedAt: null, issuedByUserId: null, issuedHash: null, withdrawnAt: null, createdByActorKind: 'member', createdByUserId: 'user-int', createdByMemberId: 'mem-1', createdAt: 'c', updatedAt: 'u', ...overrides
})

const moduleAssigned = (assigned: boolean) => infra.pgQuery.mockImplementation(async (sql: string) => (sql.includes('module_assignments') ? (assigned ? [{ status: 'active' }] : []) : []))

const fact = { factVersion: 'evidence_fact_v1', factId: 'seo.clicks.2026-08-01_2026-09-01', module: 'seo', metricId: 'clicks', label: 'Clics', value: 10, unit: 'count', numerator: null, denominator: null, population: 'p', source: 's', method: { name: 'm', version: '1' }, coverage: { kind: 'complete', ratio: 1, populationSize: null }, freshness: { asOf: '2026-08-31' }, observation: 'observed', window: { start: '2026-08-01', endExclusive: '2026-09-01', granularity: 'period', partial: false }, evidenceRef: 'r', comparisonFactId: null } as const

describe('TASK-1845 — createInsightEdition', () => {
  // La edición "persistida" del caso: la transición devuelve la MISMA fila con otro estado
  // (el encargo, incluida su policy, no cambia entre fases — es inmutable en DB).
  let activeEdition = edition()

  beforeEach(() => {
    vi.clearAllMocks()
    moduleAssigned(true)
    activeEdition = edition()
    stores.findInsightEditionByIdempotencyKey.mockResolvedValue(null)
    stores.insertInsightReport.mockResolvedValue(report)
    stores.lockInsightReport.mockResolvedValue(report)
    stores.getInsightReportById.mockResolvedValue(report)
    stores.insertInsightEdition.mockImplementation(async () => activeEdition)
    stores.transitionInsightEditionState.mockImplementation(async (_client: unknown, input: { toState: InsightEditionRecord['state']; patch?: { reviewOwnerUserId?: string | null } }) => ({
      edition: { ...activeEdition, state: input.toState, failedPhase: input.toState === 'failed' ? 'collecting' : null, reviewOwnerUserId: input.patch?.reviewOwnerUserId ?? null },
      transition: { transitionId: 't', editionId: 'insed-1', organizationId: 'org-a', fromState: 'draft', toState: input.toState, requiresHumanGate: false, actorKind: 'system', actorUserId: null, actorMemberId: null, reason: 'r', metadata: {}, createdAt: 'c' },
      idempotent: false
    }))
    infra.collect.mockResolvedValue({ facts: [fact], sources: [], rejections: [] })
    stores.upsertInsightEvidenceSnapshot.mockResolvedValue({ snapshotId: 'inssn-1', editionId: 'insed-1', organizationId: 'org-a', facts: [fact], sources: [], rejections: [], sealedAt: null, snapshotHash: null })
    stores.sealInsightEvidenceSnapshot.mockResolvedValue({ snapshotId: 'inssn-1', editionId: 'insed-1', organizationId: 'org-a', facts: [fact], sources: [], rejections: [], sealedAt: 's', snapshotHash: 'a'.repeat(64), asOfMax: '2026-08-31' })
    stores.getInsightEvidenceSnapshotByEdition.mockResolvedValue({ snapshotId: 'inssn-1', editionId: 'insed-1', organizationId: 'org-a', facts: [fact], sources: [], rejections: [], sealedAt: 's', snapshotHash: 'a'.repeat(64) })
    const plan = { planVersion: 'editorial_plan_v1', locale: 'es-CL', executiveSummary: [], chapters: [{ chapterId: 'c', module: 'seo', title: 't', claims: [{ claimId: 'k', text: 'Clics: 10.', factIds: [fact.factId] }], charts: [], tables: [], limits: [] }], actions: [], limits: [], methodology: [], references: [] }

    infra.author.mockResolvedValue({ plan, provenance: { mode: 'deterministic', modelId: null, promptVersion: null, usage: {} } })
    stores.upsertInsightEditorialPlan.mockResolvedValue({ planId: 'inspl-1', plan, frozenAt: null, planHash: null })
    stores.freezeInsightEditorialPlan.mockResolvedValue({ planId: 'inspl-1', plan, frozenAt: 'f', planHash: 'b'.repeat(64) })
    stores.getInsightEditorialPlanByEdition.mockResolvedValue({ planId: 'inspl-1', plan, frozenAt: 'f', planHash: 'b'.repeat(64) })
  })

  it('flag OFF ⇒ generation_disabled sin tocar la base', async () => {
    const { createInsightEdition } = await import('./create-edition')

    await expect(createInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', request: request(), env: {} as NodeJS.ProcessEnv })).rejects.toMatchObject({ code: 'generation_disabled' })
    expect(stores.insertInsightEdition).not.toHaveBeenCalled()
  })

  it('interno con Account crea reporte + edición, publica outbox y corre las fases hasta ready_for_review con owner', async () => {
    const { createInsightEdition } = await import('./create-edition')
    const result = await createInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', request: request(), env: ENV_ON })

    expect(result.idempotent).toBe(false)
    expect(result.generation?.outcome).toBe('ready_for_review')
    expect(result.edition.reviewOwnerUserId).toBe('user-int')
    expect((stores.transitionInsightEditionState.mock.calls as unknown as Array<[unknown, { toState: string }]>).map(call => call[1].toState)).toEqual(['collecting', 'composing', 'validating', 'ready_for_review'])
    expect((infra.publish.mock.calls as unknown as Array<[{ eventType: string }]>).map(call => call[0].eventType)).toEqual(['insights.report.created', 'insights.edition.created', 'insights.edition.state_transitioned', 'insights.evidence.sealed', 'insights.edition.state_transitioned', 'insights.edition.state_transitioned', 'insights.edition.state_transitioned'])
    expect(stores.sealInsightEvidenceSnapshot).toHaveBeenCalledTimes(1)
    expect(stores.freezeInsightEditorialPlan).toHaveBeenCalledTimes(1)
  })

  it('misma idempotency key con el mismo encargo devuelve la misma edición; con encargo distinto, conflicto', async () => {
    const { createInsightEdition } = await import('./create-edition')
    const { hashCanonical } = await import('../request-hash')
    const first = await createInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', request: request(), env: ENV_ON })
    const persistedHash = (stores.insertInsightEdition.mock.calls[0] as unknown as [unknown, { requestHash: string }])[1].requestHash

    expect(persistedHash).toMatch(/^[0-9a-f]{64}$/)
    stores.findInsightEditionByIdempotencyKey.mockResolvedValue(edition({ requestHash: persistedHash }))

    const again = await createInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', request: request(), env: ENV_ON })

    expect(again.idempotent).toBe(true)
    expect(again.edition.editionId).toBe(first.edition.editionId)
    expect(stores.insertInsightEdition).toHaveBeenCalledTimes(1)
    await expect(createInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', request: request({ outputs: ['deck_pdf'] }), env: ENV_ON })).rejects.toMatchObject({ code: 'idempotency_conflict' })
    expect(hashCanonical({ a: 1 })).not.toBe(persistedHash)
  })

  it('cliente: sólo su org (target ajeno = not_found), nunca audience internal; sin módulo insights_v1 la org no existe', async () => {
    const { createInsightEdition } = await import('./create-edition')

    await expect(createInsightEdition({ subject: clientSubject, actorOrganizationId: 'org-a', organizationId: 'org-b', request: request(), env: ENV_ON })).rejects.toMatchObject({ code: 'not_found' })
    await expect(createInsightEdition({ subject: clientSubject, actorOrganizationId: 'org-a', organizationId: 'org-a', request: request({ audience: 'internal' }), env: ENV_ON })).rejects.toMatchObject({ code: 'invalid_request' })

    const ok = await createInsightEdition({ subject: clientSubject, actorOrganizationId: 'org-a', organizationId: 'org-a', request: request(), env: ENV_ON })

    expect(ok.edition.editionId).toBe('insed-1')
    expect((stores.insertInsightReport.mock.calls[0] as unknown as [unknown, { actor: unknown }])[1].actor).toEqual({ kind: 'client_user', userId: 'user-cli', memberId: null })

    moduleAssigned(false)
    await expect(createInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', request: request(), env: ENV_ON })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('un módulo sin evidencia bloquea en validating (failed) salvo allowPartial explícito', async () => {
    const { createInsightEdition } = await import('./create-edition')

    infra.collect.mockResolvedValue({ facts: [], sources: [], rejections: [{ module: 'seo', metricId: null, reason: 'not_connected', detail: 'x' }] })
    stores.sealInsightEvidenceSnapshot.mockResolvedValue({ snapshotId: 'inssn-1', editionId: 'insed-1', organizationId: 'org-a', facts: [], sources: [], rejections: [], sealedAt: 's', snapshotHash: 'a'.repeat(64), asOfMax: null })
    stores.getInsightEvidenceSnapshotByEdition.mockResolvedValue({ snapshotId: 'inssn-1', editionId: 'insed-1', organizationId: 'org-a', facts: [], sources: [], rejections: [{ module: 'seo', metricId: null, reason: 'not_connected', detail: 'x' }], sealedAt: 's', snapshotHash: 'a'.repeat(64) })
    infra.author.mockResolvedValue({ plan: { planVersion: 'editorial_plan_v1', locale: 'es-CL', executiveSummary: [], chapters: [], actions: [], limits: [], methodology: [], references: [] }, provenance: { mode: 'deterministic', modelId: null, promptVersion: null, usage: {} } })
    stores.getInsightEditorialPlanByEdition.mockResolvedValue({ planId: 'inspl-1', plan: { planVersion: 'editorial_plan_v1', locale: 'es-CL', executiveSummary: [], chapters: [], actions: [], limits: [], methodology: [], references: [] }, frozenAt: 'f', planHash: 'b'.repeat(64) })

    const blocked = await createInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', request: request(), env: ENV_ON })

    expect(blocked.generation).toMatchObject({ outcome: 'failed', failedPhase: 'validating', failureCode: 'evidence_rejected' })

    // La edición persistida lleva la policy del encargo (el fixture base no la tiene).
    activeEdition = edition({ request: { ...edition().request, policy: { allowPartial: true } } })

    const partial = await createInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', request: request({ idempotencyKey: 'idem-key-0002', policy: { allowPartial: true } }), env: ENV_ON })

    expect(partial.generation?.outcome).toBe('ready_for_review')
  })
})

describe('TASK-1845 — issue / withdraw / recover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    moduleAssigned(true)
    stores.getInsightEvidenceSnapshotByEdition.mockResolvedValue({ snapshotId: 'inssn-1', snapshotHash: 'a'.repeat(64), sealedAt: 's', facts: [fact], sources: [], rejections: [] })
    stores.getInsightEditorialPlanByEdition.mockResolvedValue({ planId: 'inspl-1', planHash: 'b'.repeat(64), frozenAt: 'f', plan: {} })
    stores.transitionInsightEditionState.mockImplementation(async (_client: unknown, input: { toState: InsightEditionRecord['state']; actor: { kind: string; userId: string | null } }) => ({
      edition: edition({ state: input.toState }),
      transition: { transitionId: 't', editionId: 'insed-1', organizationId: 'org-a', fromState: 'ready_for_review', toState: input.toState, requiresHumanGate: true, actorKind: input.actor.kind, actorUserId: input.actor.userId, actorMemberId: null, reason: 'r', metadata: {}, createdAt: 'c' },
      idempotent: false
    }))
  })

  it('issue: flag OFF ⇒ issuance_disabled; Operations no tiene issue ⇒ forbidden; outputs no validados ⇒ not_ready', async () => {
    const { issueInsightEdition } = await import('./lifecycle')

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'ready_for_review' }))
    await expect(issueInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', reason: 'aprobado por el account', env: {} as NodeJS.ProcessEnv })).rejects.toMatchObject({ code: 'issuance_disabled' })
    await expect(issueInsightEdition({ subject: opsSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', reason: 'aprobado por ops', env: ENV_ON })).rejects.toMatchObject({ code: 'forbidden' })
    // Este test importa `./lifecycle` directo (sin el barrel que cablea el puerto real, TASK-1846):
    // el puerto queda en su estado no conectado y emitir sigue bloqueado con causa explícita.
    await expect(issueInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', reason: 'aprobado por el account', env: ENV_ON })).rejects.toMatchObject({ code: 'not_ready' })
    expect(stores.transitionInsightEditionState).not.toHaveBeenCalled()
  })

  it('issue con outputs validados: hash de emisión liga encargo + snapshot + plan + outputs y publica issued', async () => {
    const { issueInsightEdition } = await import('./lifecycle')
    const { setInsightOutputsPort } = await import('../ports')

    setInsightOutputsPort({ assertOutputsValidated: async () => ({ outputs: [{ output: 'report_pdf', assetId: 'asset-1', manifestHash: 'c'.repeat(64) }] }) })

    try {
      stores.getInsightEditionById.mockResolvedValue(edition({ state: 'ready_for_review' }))

      const result = await issueInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', reason: 'aprobado por el account', env: ENV_ON })

      expect(result.edition.state).toBe('issued')
      const call = (stores.transitionInsightEditionState.mock.calls[0] as unknown as [unknown, { patch: { issued: { byUserId: string; hash: string } } }])[1]

      expect(call.patch.issued.byUserId).toBe('user-int')
      expect(call.patch.issued.hash).toMatch(/^[0-9a-f]{64}$/)
      expect((infra.publish.mock.calls as unknown as Array<[{ eventType: string }]>).map(c => c[0].eventType)).toEqual(['insights.edition.state_transitioned', 'insights.edition.issued'])

      stores.getInsightEditionById.mockResolvedValue(edition({ state: 'issued' }))
      expect((await issueInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', reason: 'reintento', env: ENV_ON })).idempotent).toBe(true)
    } finally {
      setInsightOutputsPort(null)
    }
  })

  it('withdraw exige issue capability; recover sólo desde failed y reanuda en la fase fallida', async () => {
    const { recoverInsightEdition, withdrawInsightEdition } = await import('./lifecycle')

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'issued' }))
    await expect(withdrawInsightEdition({ subject: opsSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', reason: 'retirar' })).rejects.toMatchObject({ code: 'forbidden' })
    expect((await withdrawInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', reason: 'retirada por el account' })).edition.state).toBe('withdrawn')
    expect(sharing.revokeActiveInsightShareGrantsForEdition).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ editionId: 'insed-1', reason: 'edition_withdrawn' }))
    expect(JSON.stringify(infra.publish.mock.calls)).toContain('insights.share.revoked')

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'ready_for_review' }))
    await expect(recoverInsightEdition({ subject: opsSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1' })).rejects.toMatchObject({ code: 'invalid_request' })

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'failed', failedPhase: 'validating' }))
    stores.transitionInsightEditionState.mockImplementation(async (_client: unknown, input: { toState: InsightEditionRecord['state'] }) => ({ edition: edition({ state: input.toState }), transition: { transitionId: 't', editionId: 'insed-1', organizationId: 'org-a', fromState: 'failed', toState: input.toState, requiresHumanGate: false, actorKind: 'system', actorUserId: null, actorMemberId: null, reason: 'r', metadata: {}, createdAt: 'c' }, idempotent: false }))
    stores.getInsightEditorialPlanByEdition.mockResolvedValue({ planId: 'inspl-1', planHash: 'b'.repeat(64), frozenAt: 'f', plan: { planVersion: 'editorial_plan_v1', locale: 'es-CL', executiveSummary: [], chapters: [{ chapterId: 'c', module: 'seo', title: 't', claims: [{ claimId: 'k', text: 'Clics: 10.', factIds: [fact.factId] }], charts: [], tables: [], limits: [] }], actions: [], limits: [], methodology: [], references: [] } })

    const recovered = await recoverInsightEdition({ subject: opsSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1' })

    expect(recovered.outcome).toBe('ready_for_review')
    // Reanuda en validating: no vuelve a recolectar ni a componer.
    expect(infra.collect).not.toHaveBeenCalled()
    expect(infra.author).not.toHaveBeenCalled()
  })
})

describe('TASK-1845 — readers con proyección por audiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    moduleAssigned(true)
  })

  it('el cliente ve estado redactado, sólo ediciones client y evidencia sólo de emitidas; el interno ve todo', async () => {
    const { readInsightEdition, readInsightEditions } = await import('../readers')

    stores.listInsightEditions.mockResolvedValue({ items: [edition({ state: 'collecting' })], total: 1 })
    const clientList = await readInsightEditions({ subject: clientSubject, actorOrganizationId: 'org-a', organizationId: 'org-a', limit: 10, offset: 0 })

    expect(clientList.items[0]).toMatchObject({ status: 'in_progress' })
    expect(clientList.items[0]).not.toHaveProperty('failedPhase')
    expect((stores.listInsightEditions.mock.calls[0] as unknown as [unknown, { audience: string }])[1].audience).toBe('client')

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'failed', failedPhase: 'collecting', audience: 'internal' }))
    await expect(readInsightEdition({ subject: clientSubject, actorOrganizationId: 'org-a', organizationId: 'org-a', editionId: 'insed-1', includeEvidence: true })).rejects.toMatchObject({ code: 'not_found' })

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'ready_for_review' }))
    const clientView = await readInsightEdition({ subject: clientSubject, actorOrganizationId: 'org-a', organizationId: 'org-a', editionId: 'insed-1', includeEvidence: true })

    expect(clientView.edition.status).toBe('in_review')
    expect(clientView.evidence).toBeNull()
    expect(clientView.history).toBeNull()

    stores.listInsightEditionTransitions.mockResolvedValue([])
    stores.getInsightEvidenceSnapshotByEdition.mockResolvedValue({ snapshotId: 's', sealedAt: 's', snapshotHash: 'a'.repeat(64), asOfMin: null, asOfMax: null, facts: [], sources: [], rejections: [] })
    stores.getInsightEditorialPlanByEdition.mockResolvedValue({ planId: 'p', frozenAt: 'f', planHash: 'b'.repeat(64), plan: {}, authoringMode: 'deterministic', modelId: null, promptVersion: null })
    const internalView = await readInsightEdition({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', includeEvidence: true })

    expect(internalView.edition.status).toBe('ready_for_review')
    expect(internalView.evidence).not.toBeNull()
    expect(internalView.plan).toMatchObject({ authoringMode: 'deterministic' })
    expect(internalView.history).toEqual([])
  })
})
