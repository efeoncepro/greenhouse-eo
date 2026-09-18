import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1848 — recurrencia: definición (plantilla sin período/key/org, sólo draft_for_review), tick
 * (flag, autoridad revalidada ⇒ pausa con motivo, sólo períodos posteriores a la activación, edición
 * idempotente por ocurrencia, render pedido, nunca emite) y retención del reader público.
 * El SQL real se ejercita en `schedules.live.test.ts`.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const store = vi.hoisted(() => ({
  insertInsightSchedule: vi.fn(),
  getInsightSchedule: vi.fn(),
  listInsightSchedules: vi.fn(async () => []),
  listActiveInsightSchedules: vi.fn(),
  countActiveInsightSchedules: vi.fn(async () => 0),
  transitionInsightSchedule: vi.fn(),
  ensureInsightScheduleOccurrence: vi.fn(),
  claimInsightScheduleOccurrence: vi.fn(),
  finishInsightScheduleOccurrence: vi.fn(async () => undefined),
  listRecentInsightScheduleOccurrences: vi.fn(async () => []),
  countRecentFailedOccurrences: vi.fn(async () => 0),
  purgeInsightShareAccessData: vi.fn(async () => ({ accessEvents: 2, rateBuckets: 5 }))
}))

const domain = vi.hoisted(() => ({
  createInsightEdition: vi.fn(),
  requestInsightRender: vi.fn(async () => ({ run: { renderRunId: 'irun-1' }, outputs: [], idempotent: false }))
}))

vi.mock('./store', () => store)
vi.mock('../commands/create-edition', () => ({ createInsightEdition: domain.createInsightEdition }))
vi.mock('../render/commands', () => ({ requestInsightRender: domain.requestInsightRender }))

const infra = vi.hoisted(() => ({ withTx: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn({ query: vi.fn() })), pgQuery: vi.fn(), publish: vi.fn(async () => 'outbox-1') }))

vi.mock('@/lib/postgres/client', () => ({ withGreenhousePostgresTransaction: infra.withTx, runGreenhousePostgresQuery: infra.pgQuery }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: infra.publish }))

const ENV_ON = { INSIGHTS_SCHEDULES_ENABLED: 'true', INSIGHTS_RENDER_ENABLED: 'true', INSIGHTS_GENERATION_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv
const internalSubject = { userId: 'user-int', tenantType: 'efeonce_internal' as const, roleCodes: ['efeonce_account'], primaryRoleCode: 'efeonce_account', routeGroups: ['internal'], authorizedViews: [], memberId: 'mem-1' }

const template = { modules: ['seo'], comparison: { kind: 'previous_period' }, audience: 'client', locale: 'es-CL', depth: 'standard', outputs: ['deck_pdf'], policy: { allowPartial: true } }

const schedule = (overrides: Record<string, unknown> = {}) => ({
  scheduleId: 'isch-1', organizationId: 'org-a', scheduleVersion: 1, state: 'active', label: 'Mensual SEO', cadence: 'monthly', timeZone: 'America/Santiago',
  consolidationDays: 0, catchUpLimit: 2, requestTemplate: template, reviewPolicy: 'draft_for_review', authorizedByActorKind: 'member', authorizedByUserId: 'user-int',
  activatedAt: '2026-07-15T12:00:00.000Z', pausedAt: null, pauseReason: null, retiredAt: null, createdAt: 'c', updatedAt: 'u', ...overrides
})

/** session_360 del autorizante + módulo asignado; cada query se resuelve por su texto. */
const database = (options: { authority?: Record<string, unknown> | null; module?: boolean } = {}) =>
  infra.pgQuery.mockImplementation(async (sql: string) => {
    if (sql.includes('session_360')) return options.authority === null ? [] : [{ user_id: 'user-int', tenant_type: 'efeonce_internal', role_codes: ['efeonce_account'], route_groups: ['internal'], member_id: 'mem-1', active: true, status: 'active', ...options.authority }]
    if (sql.includes('module_assignments')) return options.module === false ? [] : [{ status: 'active' }]

    return []
  })

describe('normalizeInsightScheduleDefinition', () => {
  it('plantilla sin período/key/org, zona IANA, límites de consolidación/catch-up y sólo draft_for_review', async () => {
    const { normalizeInsightScheduleDefinition } = await import('./commands')
    const base = { label: 'Mensual SEO', cadence: 'monthly', requestTemplate: template }

    expect(normalizeInsightScheduleDefinition(base)).toMatchObject({ timeZone: 'America/Santiago', consolidationDays: 3, catchUpLimit: 1 })
    expect(() => normalizeInsightScheduleDefinition({ ...base, cadence: 'daily' })).toThrow(/cadence/)
    expect(() => normalizeInsightScheduleDefinition({ ...base, timeZone: 'Mars/Olympus' })).toThrow(/IANA/)
    expect(() => normalizeInsightScheduleDefinition({ ...base, catchUpLimit: 12 })).toThrow(/catchUpLimit/)
    expect(() => normalizeInsightScheduleDefinition({ ...base, reviewPolicy: 'auto_issue' })).toThrow(/revisión humana/)
    expect(() => normalizeInsightScheduleDefinition({ ...base, requestTemplate: { ...template, period: { start: '2026-01-01' } } })).toThrow(/período/)
  })
})

describe('createInsightSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    database()
    store.insertInsightSchedule.mockImplementation(async (_client: unknown, input: Record<string, unknown>) => schedule({ ...input, state: 'draft', activatedAt: null }))
  })

  it('flag OFF ⇒ schedules_disabled; valida la plantilla con el validador del encargo manual', async () => {
    const { createInsightSchedule } = await import('./commands')
    const scope = { subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a' }

    await expect(createInsightSchedule({ ...scope, env: {} as NodeJS.ProcessEnv, body: { label: 'Mensual', cadence: 'monthly', requestTemplate: template } })).rejects.toMatchObject({ code: 'schedules_disabled' })
    await expect(createInsightSchedule({ ...scope, env: ENV_ON, body: { label: 'Mensual', cadence: 'monthly', requestTemplate: { ...template, modules: ['nope'] } } })).rejects.toMatchObject({ code: 'invalid_request' })

    const created = await createInsightSchedule({ ...scope, env: ENV_ON, body: { label: 'Mensual', cadence: 'monthly', requestTemplate: template } })

    expect(created.schedule).not.toHaveProperty('authorizedByUserId')
    expect(created.schedule.state).toBe('draft')
  })

  it('un cliente no programa (capability interna)', async () => {
    const { createInsightSchedule } = await import('./commands')
    const client = { userId: 'user-exec', tenantType: 'client' as const, roleCodes: ['client_executive'], primaryRoleCode: 'client_executive', routeGroups: ['client'], authorizedViews: [] }

    await expect(createInsightSchedule({ subject: client, actorOrganizationId: 'org-a', organizationId: 'org-a', env: ENV_ON, body: { label: 'Mensual', cadence: 'monthly', requestTemplate: template } })).rejects.toMatchObject({ code: 'forbidden' })
  })
})

describe('runInsightSchedulesTick', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    database()
    store.listActiveInsightSchedules.mockResolvedValue([schedule()])
    store.ensureInsightScheduleOccurrence.mockImplementation(async (input: { periodStart: string; periodEndExclusive: string }) => ({ occurrenceId: `isco-${input.periodStart}`, ...input, state: 'pending', attempts: 0 }))
    store.claimInsightScheduleOccurrence.mockImplementation(async (id: string) => ({ occurrenceId: id, state: 'generating', attempts: 1 }))
    store.transitionInsightSchedule.mockResolvedValue(schedule({ state: 'paused', pauseReason: 'authority_revoked' }))
    domain.createInsightEdition.mockImplementation(async (input: { request: { period: { start: string } } }) => ({ edition: { editionId: `insed-${input.request.period.start}`, state: 'ready_for_review', outputs: ['deck_pdf'] } }))
  })

  it('flag OFF: purga la retención igual, no genera', async () => {
    const { runInsightSchedulesTick } = await import('./tick')
    const result = await runInsightSchedulesTick({} as NodeJS.ProcessEnv, new Date('2026-09-18T12:00:00Z'))

    expect(result).toMatchObject({ skipped: 'flag_off', retention: { accessEvents: 2, rateBuckets: 5 } })
    expect(store.listActiveInsightSchedules).not.toHaveBeenCalled()
  })

  it('genera un borrador por período cerrado posterior a la activación, con key idempotente, y pide render; nunca emite', async () => {
    const { runInsightSchedulesTick } = await import('./tick')

    // Activado el 15-jul; hoy 18-sep; catch-up 2 ⇒ julio y agosto. Julio cierra el 1-ago (> 15-jul): entra.
    const result = await runInsightSchedulesTick(ENV_ON, new Date('2026-09-18T12:00:00Z'))

    expect(result).toMatchObject({ schedules: 1, generated: 2, failed: 0, paused: 0 })

    const requests = domain.createInsightEdition.mock.calls.map(call => (call[0] as { request: { period: { start: string }; idempotencyKey: string } }).request)

    expect(requests.map(request => request.period.start)).toEqual(['2026-07-01', '2026-08-01'])
    expect(requests[1]!.idempotencyKey).toBe('sched-isch-1-v1-2026-08-01')
    expect(domain.requestInsightRender).toHaveBeenCalledTimes(2)
    expect(store.finishInsightScheduleOccurrence).toHaveBeenCalledWith(expect.objectContaining({ state: 'render_requested', renderRunId: 'irun-1' }))
    expect(JSON.stringify(infra.publish.mock.calls)).not.toContain('insights.edition.issued')
  })

  it('no genera períodos que cerraron antes de activar (sin ediciones retroactivas)', async () => {
    const { runInsightSchedulesTick } = await import('./tick')

    store.listActiveInsightSchedules.mockResolvedValue([schedule({ activatedAt: '2026-09-05T12:00:00.000Z' })])

    const result = await runInsightSchedulesTick(ENV_ON, new Date('2026-09-18T12:00:00Z'))

    expect(result.generated).toBe(0)
    expect(domain.createInsightEdition).not.toHaveBeenCalled()
  })

  it('otro tick ya reclamó la ocurrencia ⇒ este no genera', async () => {
    const { runInsightSchedulesTick } = await import('./tick')

    store.claimInsightScheduleOccurrence.mockResolvedValue(null)

    expect((await runInsightSchedulesTick(ENV_ON, new Date('2026-09-18T12:00:00Z'))).generated).toBe(0)
    expect(domain.createInsightEdition).not.toHaveBeenCalled()
  })

  it('autoridad perdida o módulo retirado ⇒ pausa con motivo, sin generar a nombre de nadie', async () => {
    const { runInsightSchedulesTick } = await import('./tick')

    database({ authority: null })
    expect((await runInsightSchedulesTick(ENV_ON, new Date('2026-09-18T12:00:00Z'))).paused).toBe(1)
    expect(store.transitionInsightSchedule).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ state: 'paused', pauseReason: 'authority_revoked' }))

    database({ authority: { role_codes: ['collaborator'] } })
    await runInsightSchedulesTick(ENV_ON, new Date('2026-09-18T12:00:00Z'))
    expect(store.transitionInsightSchedule).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ pauseReason: 'authority_revoked' }))

    database({ module: false })
    await runInsightSchedulesTick(ENV_ON, new Date('2026-09-18T12:00:00Z'))
    expect(store.transitionInsightSchedule).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ pauseReason: 'module_unavailable' }))
    expect(domain.createInsightEdition).not.toHaveBeenCalled()
  })

  it('un fallo de generación queda registrado con código; tres seguidos pausan', async () => {
    const { runInsightSchedulesTick } = await import('./tick')

    domain.createInsightEdition.mockRejectedValue(Object.assign(new Error('x'), { name: 'InsightsError' }))
    store.countRecentFailedOccurrences.mockResolvedValue(3)

    const result = await runInsightSchedulesTick(ENV_ON, new Date('2026-09-18T12:00:00Z'))

    expect(result.failed).toBe(2)
    expect(store.finishInsightScheduleOccurrence).toHaveBeenCalledWith(expect.objectContaining({ state: 'failed', failureCode: 'unexpected_error' }))
    expect(store.transitionInsightSchedule).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ pauseReason: 'repeated_failures' }))
  })
})
