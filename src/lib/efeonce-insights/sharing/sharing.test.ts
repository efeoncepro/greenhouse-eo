import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { EvidenceFactV1 } from '../contracts/evidence'
import type { EditorialPlanV1 } from '../contracts/plan'
import type { InsightEditionRecord } from '../stores/records'

/**
 * TASK-1848 — ShareGrant: web model puro, token, normalización de opciones, commands (flag, tres
 * planos, anti-oracle, cupo, evento sin bearer) y la compuerta del reader público (404/410/429,
 * revocación antes de servir, módulo/org cortan). El SQL real se ejercita en `sharing.live.test.ts`.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const stores = vi.hoisted(() => ({
  getInsightEditionById: vi.fn(),
  getInsightReportById: vi.fn(),
  getInsightEvidenceSnapshotByEdition: vi.fn(),
  getInsightEditorialPlanByEdition: vi.fn()
}))

const shareStore = vi.hoisted(() => ({
  insertInsightShareGrant: vi.fn(),
  countActiveInsightShareGrants: vi.fn(async () => 0),
  listInsightShareGrantsForEdition: vi.fn(async () => []),
  getInsightShareGrant: vi.fn(),
  revokeInsightShareGrant: vi.fn(),
  revokeActiveInsightShareGrantsForEdition: vi.fn(async () => []),
  resolveInsightShareGrantByDigest: vi.fn(),
  readInsightOrganizationName: vi.fn(async () => 'Berel'),
  recordInsightShareAccess: vi.fn(async () => undefined),
  consumeInsightShareRateBucket: vi.fn(async () => true)
}))

const renderStore = vi.hoisted(() => ({ findInsightOutputsForEdition: vi.fn(async () => []) }))
const assets = vi.hoisted(() => ({ downloadPrivateAsset: vi.fn() }))

vi.mock('../stores/edition-store', () => ({ getInsightEditionById: stores.getInsightEditionById }))
vi.mock('../stores/report-store', () => ({ getInsightReportById: stores.getInsightReportById }))
vi.mock('../stores/snapshot-store', () => ({ getInsightEvidenceSnapshotByEdition: stores.getInsightEvidenceSnapshotByEdition }))
vi.mock('../stores/plan-store', () => ({ getInsightEditorialPlanByEdition: stores.getInsightEditorialPlanByEdition }))
vi.mock('./store', () => shareStore)
vi.mock('../render/store', () => renderStore)
vi.mock('@/lib/storage/greenhouse-assets', () => assets)

const infra = vi.hoisted(() => ({ withTx: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn({ query: vi.fn() })), pgQuery: vi.fn(), publish: vi.fn(async () => 'outbox-1') }))

vi.mock('@/lib/postgres/client', () => ({ withGreenhousePostgresTransaction: infra.withTx, runGreenhousePostgresQuery: infra.pgQuery }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: infra.publish }))

const ENV_ON = { INSIGHTS_SHARING_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv
const internalSubject = { userId: 'user-int', tenantType: 'efeonce_internal' as const, roleCodes: ['efeonce_account'], primaryRoleCode: 'efeonce_account', routeGroups: ['internal'], authorizedViews: [], memberId: 'mem-1' }
const executiveSubject = { userId: 'user-exec', tenantType: 'client' as const, roleCodes: ['client_executive'], primaryRoleCode: 'client_executive', routeGroups: ['client'], authorizedViews: [] }
const managerSubject = { userId: 'user-mgr', tenantType: 'client' as const, roleCodes: ['client_manager'], primaryRoleCode: 'client_manager', routeGroups: ['client'], authorizedViews: [] }

const edition = (overrides: Partial<InsightEditionRecord> = {}): InsightEditionRecord =>
  ({
    editionId: 'insed-1', reportId: 'insr-1', organizationId: 'org-a', version: 2, audience: 'client', state: 'issued', failedPhase: null,
    request: { requestVersion: 'insight_request_v1', organizationId: 'org-a', modules: ['seo'], period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' }, comparison: { kind: 'previous_period' }, audience: 'client', locale: 'es-CL', depth: 'standard', outputs: ['deck_pdf', 'web'], brand: { efeoncePackVersion: 'axis-current', clientBrandRef: null }, projectIds: [] },
    requestHash: 'h'.repeat(64), idempotencyKey: 'k', modules: ['seo'], outputs: ['deck_pdf', 'web'], periodTimeZone: 'America/Santiago', periodStartUtc: 'x', periodEndUtc: 'y',
    supersedesEditionId: null, reviewOwnerUserId: null, issuedAt: '2026-09-10T12:00:00.000Z', issuedByUserId: 'user-int', issuedHash: 'i'.repeat(64), withdrawnAt: null, createdByActorKind: 'member', createdByUserId: 'user-int', createdByMemberId: 'mem-1', createdAt: 'c', updatedAt: 'u', ...overrides
  }) as InsightEditionRecord

const grantRecord = (overrides: Record<string, unknown> = {}) => ({
  shareGrantId: 'ishr-1', organizationId: 'org-a', editionId: 'insed-1', downloadOutputs: ['deck_pdf'], label: null, source: 'manual',
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(), createdByActorKind: 'member', createdByUserId: 'user-int', createdAt: new Date().toISOString(),
  revokedAt: null, revokedByActorKind: null, revokeReason: null, ...overrides
})

const moduleAssigned = (assigned: boolean) => infra.pgQuery.mockImplementation(async (sql: string) => (sql.includes('module_assignments') ? (assigned ? [{ status: 'active' }] : []) : []))

const fact = (overrides: Partial<EvidenceFactV1> = {}): EvidenceFactV1 =>
  ({
    factVersion: 'evidence_fact_v1', factId: 'seo.clicks.current', module: 'seo', metricId: 'clicks', label: 'Clics orgánicos', value: 12345, unit: 'count',
    numerator: null, denominator: null, population: 'gsc', source: 'readSeoOverviewKpisForWindow', method: { name: 'gsc', version: '1' },
    coverage: { kind: 'complete', ratio: 1, populationSize: null }, freshness: { asOf: '2026-08-31' }, observation: 'observed',
    window: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago', granularity: 'period' }, evidenceRef: 'seoTarget:secret-ref', comparisonFactId: null, ...overrides
  }) as EvidenceFactV1

const plan = (): EditorialPlanV1 => ({
  planVersion: 'editorial_plan_v1', locale: 'es-CL',
  executiveSummary: [{ claimId: 'c1', text: 'Los clics crecieron.', factIds: ['seo.clicks.current'] }],
  chapters: [{
    chapterId: 'chapter.seo', module: 'seo', title: 'SEO', claims: [], tables: [], limits: ['aeo: sin datos.'],
    charts: [{ specVersion: 'chart_spec_v1', chartId: 'ch1', family: 'bar', relation: 'comparison', title: 'Clics', series: [{ seriesId: 's', label: 'Clics', factIds: ['seo.clicks.current', 'seo.clicks.previous'], unit: 'count' }], dimensionLabels: ['Actual', 'Anterior'], unit: 'count', scale: { kind: 'linear', baseline: 0 }, references: [], tabularEquivalent: { columns: ['Período', 'Clics'], rows: [['seo.clicks.current', 'seo.clicks.previous']] } }]
  }],
  actions: [{ actionId: 'a1', text: 'Revisar páginas.', ownerRef: 'member:mem-99', factIds: [] }],
  limits: [], methodology: ['GSC'], references: [{ referenceId: 'r1', label: 'Search Console', evidenceRef: 'seoTarget:secret-ref' }]
})

describe('buildInsightWebModel', () => {
  it('formatea cifras con el formateador del plan, ausente ≠ 0 y no filtra refs internas', async () => {
    const { buildInsightWebModel } = await import('./web-model')
    const model = buildInsightWebModel({ plan: plan(), facts: [fact(), fact({ factId: 'seo.clicks.previous', value: null })] })

    expect(model.facts['seo.clicks.current']!.display).toBe(new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(12345))
    expect(model.facts['seo.clicks.previous']).toMatchObject({ value: null, display: '—', absentReason: 'no_data' })
    expect(model.chapters[0]!.charts[0]!.table.rows[0]).toEqual([model.facts['seo.clicks.current']!.display, '—'])

    const serialized = JSON.stringify(model)

    expect(serialized).not.toContain('secret-ref')
    expect(serialized).not.toContain('mem-99')
    expect(serialized).not.toContain('evidenceRef')
  })

  it('1.2 — la fuente viaja legible y la unidad y el corte con su etiqueta; nunca el reader interno (TASK-1957)', async () => {
    const { buildInsightWebModel } = await import('./web-model')
    // El método real del adapter SEO (el que mapea `GH_INSIGHTS.sources`).
    const model = buildInsightWebModel({ plan: plan(), facts: [fact({ method: { name: 'gsc_window_aggregate', version: '1' } }), fact({ factId: 'seo.clicks.previous', value: null })] })
    const projected = model.facts['seo.clicks.current'] ?? Object.values(model.facts)[0]!

    expect(projected.source).toBe('Google Search Console')
    expect(projected.unitLabel).toBe('Cantidad')
    expect(JSON.stringify(model)).not.toContain('readSeoOverviewKpisForWindow')

    // El canal viaja para que el consumer pinte su isotipo (ChatGPT, Gemini…); un hecho sin canal no lo trae.
    const withChannel = buildInsightWebModel({ plan: plan(), facts: [fact({ channelId: 'gemini' })] })

    expect(Object.values(withChannel.facts)[0]!.channelId).toBe('gemini')
    expect(projected).not.toHaveProperty('channelId')
  })

  it('1.3 — el API resuelve módulo, figura de respaldo, esenciales por módulo, nombre de capítulo y período anterior (TASK-1962)', async () => {
    const { buildInsightWebModel } = await import('./web-model')
    const base = plan()

    const withEssentials: EditorialPlanV1 = {
      ...base,
      chapters: [...base.chapters, { chapterId: 'chapter.aeo', module: 'aeo', title: 'IA', claims: [], tables: [], limits: [], charts: [] }],
      essentials: [{ claimId: 'e1', text: 'Los clics crecieron.', factIds: ['seo.clicks.current'] }]
    }

    const model = buildInsightWebModel({ plan: withEssentials, facts: [fact({ comparisonFactId: 'seo.clicks.previous' }), fact({ factId: 'seo.clicks.previous', value: 10000 })] })

    // El consumer no recorre capítulos ni infiere el módulo por la primera cifra: viene resuelto.
    expect(model.essentials![0]).toMatchObject({ module: 'seo', evidence: { chapterId: 'chapter.seo', chartId: 'ch1' } })
    expect(model.executiveSummary[0]).toMatchObject({ module: 'seo', evidence: { chapterId: 'chapter.seo', chartId: 'ch1' } })
    // Un módulo sin esenciales se declara con 0: el filtro oculta su tablero porque el modelo lo dice.
    expect(model.essentialsByModule).toEqual({ seo: 1, aeo: 0 })
    expect(model.chapters.map(chapter => chapter.label)).toEqual(['SEO', 'Respuestas de IA'])
    expect(model.facts['seo.clicks.current']!.priorLabel).toBe(`período anterior: ${model.facts['seo.clicks.previous']!.display}`)
    // Sin comparable con valor no hay frase de período anterior.
    expect(model.facts['seo.clicks.previous']).not.toHaveProperty('priorLabel')
    // La nota de escala sólo existe cuando la figura declara una escala por métrica.
    expect(model.chapters[0]!.charts[0]).not.toHaveProperty('note')

    const ownScale = { ...withEssentials, chapters: [{ ...withEssentials.chapters[0]!, charts: [{ ...withEssentials.chapters[0]!.charts[0]!, scale: { kind: 'linear' as const, baseline: 0 as const, perDimension: true as const } }] }] }

    expect(buildInsightWebModel({ plan: ownScale, facts: [fact()] }).chapters[0]!.charts[0]!.note).toMatch(/propia escala/)
  })

  it('1.4 — la tarjeta de cifra viaja resuelta: valor, variación sin signo con su tono, «vs» y figura de respaldo (TASK-1974)', async () => {
    const { buildInsightWebModel } = await import('./web-model')
    const base = plan()

    const withStats: EditorialPlanV1 = {
      ...base,
      chapters: [{
        ...base.chapters[0]!,
        charts: [],
        stats: [{
          figureId: 'stats.seo',
          question: 'value_change',
          title: 'Cifras del período',
          items: [
            { itemId: 'clicks', label: 'Clics', factId: 'seo.clicks.current', comparisonFactId: 'seo.clicks.previous', direction: 'higher_is_better', estimated: false },
            { itemId: 'sin', label: 'Visitas desde IA', factId: 'seo.empty', comparisonFactId: null, direction: 'higher_is_better', estimated: false }
          ]
        }]
      }],
      essentials: [{ claimId: 'e1', text: 'Los clics bajaron.', factIds: ['seo.clicks.current'] }]
    }

    const model = buildInsightWebModel({
      plan: withStats,
      facts: [fact({ comparisonFactId: 'seo.clicks.previous', value: 13606 }), fact({ factId: 'seo.clicks.previous', value: 16390 }), fact({ factId: 'seo.empty', value: null })]
    })

    const [clicks, empty] = model.chapters[0]!.stats![0]!.items

    expect(clicks).toMatchObject({ display: '13.606', change: { display: '17,0 %', direction: 'down', tone: 'worse' } })
    expect(clicks!.versus).toMatch(/^vs 16\.390 en /)
    // TASK-1975 — Think anima la cifra con lo que trae el modelo: piezas y recorrido, sin partir ni deducir nada.
    expect(clicks).toMatchObject({ parts: { value: '13.606' }, count: { from: 16390, to: 13606, decimals: 0 }, comparison: { display: '16.390' } })
    expect(clicks).not.toHaveProperty('firstPeriod')
    // Sin dato: «—» y la línea «Sin dato en …», nunca 0 ni variación.
    expect(empty).toMatchObject({ display: '—' })
    expect(empty).not.toHaveProperty('change')
    expect(empty).not.toHaveProperty('count')
    expect(empty!.noData).toMatch(/^Sin dato en /)
    // La frase sobre los clics se respalda en la tarjeta, no en un gráfico.
    expect(model.essentials![0]).toMatchObject({ evidence: { chapterId: 'chapter.seo', chartId: 'stats.seo' } })
  })

  it('1.1 — un plan v1 no trae campos v2 (aditivo: el consumer 1.0 ve lo mismo)', async () => {
    const { buildInsightWebModel } = await import('./web-model')
    const { INSIGHT_WEB_MODEL_VERSION } = await import('../contracts/web-model')
    const model = buildInsightWebModel({ plan: plan(), facts: [fact(), fact({ factId: 'seo.clicks.previous', value: null })] })

    expect(INSIGHT_WEB_MODEL_VERSION).toBe('1.4')
    expect(model.modelVersion).toBe('1.4')
    expect(model).not.toHaveProperty('essentials')
    expect(model).not.toHaveProperty('decision')
    expect(model.chapters[0]).not.toHaveProperty('readings')
    expect(model.chapters[0]!.charts[0]).not.toHaveProperty('derived')
  })

  it('1.1 — proyecta lo editorial v2 y las tasas del embudo con la geometría de los PDF', async () => {
    const { buildInsightWebModel } = await import('./web-model')
    const base = plan()

    const v2: EditorialPlanV1 = {
      ...base,
      essentials: [{ claimId: 'e1', text: 'Más clics.', factIds: ['seo.clicks.current'] }],
      decision: { claimId: 'd1', text: 'Aprobar el plan.', factIds: [] },
      scopeLines: ['Visibilidad orgánica en Google'],
      chapters: [{
        ...base.chapters[0]!,
        opening: { claimId: 'o1', text: 'Abre el capítulo.', factIds: [] },
        readings: [{ chartId: 'ch1', keyFigure: { factId: 'seo.clicks.current', value: '12.345', caption: { claimId: 'k1', text: 'clics', factIds: [] } }, conclusion: { claimId: 'co1', text: 'Subió.', factIds: [] }, nextStep: null }],
        charts: [...base.chapters[0]!.charts, {
          specVersion: 'chart_spec_v1', chartId: 'f1', family: 'funnel', relation: 'conversion', title: 'Embudo', series: [], dimensionLabels: [], unit: 'count',
          scale: { kind: 'linear', baseline: 0 }, references: [], tabularEquivalent: { columns: ['Etapa', 'N'], rows: [] },
          data: { kind: 'funnel', stages: [{ stageId: 'a', label: 'Clics', factId: 'seo.f1' }, { stageId: 'b', label: 'Visitas', factId: 'seo.f2' }] }
        }]
      }]
    }

    const model = buildInsightWebModel({ plan: v2, facts: [fact(), fact({ factId: 'seo.clicks.previous', value: null }), fact({ factId: 'seo.f1', value: 200 }), fact({ factId: 'seo.f2', value: 50 })] })

    expect(model.essentials?.[0]!.text).toBe('Más clics.')
    expect(model.decision?.text).toBe('Aprobar el plan.')
    expect(model.scopeLines).toEqual(['Visibilidad orgánica en Google'])
    expect(model.chapters[0]!.opening?.text).toBe('Abre el capítulo.')
    expect(model.chapters[0]!.readings?.[0]).toMatchObject({ chartId: 'ch1', keyFigure: { value: '12.345' }, nextStep: null })
    expect(model.chapters[0]!.charts[1]!.derived?.funnelStepRates).toEqual([{ stageId: 'a', display: null }, { stageId: 'b', display: '25,0 %' }])
  })

  it('1.1 — un embudo que crece no inventa tasas', async () => {
    const { buildInsightWebModel } = await import('./web-model')
    const base = plan()

    const v2: EditorialPlanV1 = {
      ...base,
      chapters: [{ ...base.chapters[0]!, charts: [{
        specVersion: 'chart_spec_v1', chartId: 'f1', family: 'funnel', relation: 'conversion', title: 'Embudo', series: [], dimensionLabels: [], unit: 'count',
        scale: { kind: 'linear', baseline: 0 }, references: [], tabularEquivalent: { columns: ['Etapa', 'N'], rows: [] },
        data: { kind: 'funnel', stages: [{ stageId: 'a', label: 'A', factId: 'seo.f1' }, { stageId: 'b', label: 'B', factId: 'seo.f2' }] }
      }] }]
    }

    const model = buildInsightWebModel({ plan: v2, facts: [fact({ factId: 'seo.f1', value: 10 }), fact({ factId: 'seo.f2', value: 20 })] })

    expect(model.chapters[0]!.charts[0]).not.toHaveProperty('derived')
  })

  it('etiqueta el período con fechas civiles (último día = endExclusive − 1)', async () => {
    const { formatInsightPeriodLabel } = await import('./web-model')

    expect(formatInsightPeriodLabel('2026-08-01', '2026-09-01', 'es-CL')).toContain('31')
    expect(formatInsightPeriodLabel('2026-08-01', '2026-09-01', 'es-CL')).not.toContain('1 de septiembre')
  })
})

describe('token', () => {
  it('256 bits con prefijo isg_, forma estricta y sólo digest hex', async () => {
    const { digestInsightShareToken, generateInsightShareToken, isWellFormedInsightShareToken } = await import('./token')
    const token = generateInsightShareToken()

    expect(isWellFormedInsightShareToken(token)).toBe(true)
    expect(isWellFormedInsightShareToken(`${token}x`)).toBe(false)
    expect(isWellFormedInsightShareToken('grt-abc')).toBe(false)
    expect(digestInsightShareToken(token)).toMatch(/^[0-9a-f]{64}$/)
    expect(generateInsightShareToken()).not.toBe(token)
  })
})

describe('normalizeInsightShareOptions', () => {
  it('default 30 días, techo 90, descargas ⊆ edición, web no es descargable', async () => {
    const { normalizeInsightShareOptions } = await import('./commands')

    expect(normalizeInsightShareOptions(undefined, ['deck_pdf'])).toEqual({ ttlDays: 30, downloadOutputs: [], label: null })
    expect(() => normalizeInsightShareOptions({ expiresInDays: 91 }, ['deck_pdf'])).toThrow(/entre 1 y 90/)
    expect(() => normalizeInsightShareOptions({ expiresInDays: 0 }, ['deck_pdf'])).toThrow()
    expect(() => normalizeInsightShareOptions({ downloadOutputs: ['report_pdf'] }, ['deck_pdf'])).toThrow(/no pidió/)
    expect(() => normalizeInsightShareOptions({ downloadOutputs: ['web'] }, ['web'])).toThrow()
    expect(normalizeInsightShareOptions({ downloadOutputs: ['deck_pdf', 'deck_pdf'], label: '  Directorio  ' }, ['deck_pdf'])).toEqual({ ttlDays: 30, downloadOutputs: ['deck_pdf'], label: 'Directorio' })
  })
})

describe('createInsightShare / revokeInsightShare / readInsightShares', () => {
  const scope = { subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', env: ENV_ON }

  beforeEach(() => {
    vi.clearAllMocks()
    moduleAssigned(true)
    stores.getInsightEditionById.mockResolvedValue(edition())
    shareStore.countActiveInsightShareGrants.mockResolvedValue(0)
    shareStore.insertInsightShareGrant.mockImplementation(async (_client: unknown, input: { tokenDigest: string }) => ({ ...grantRecord(), _digest: input.tokenDigest }))
  })

  it('flag OFF ⇒ sharing_disabled antes de tocar la base', async () => {
    const { createInsightShare } = await import('./commands')

    await expect(createInsightShare({ ...scope, env: {} as NodeJS.ProcessEnv })).rejects.toMatchObject({ code: 'sharing_disabled' })
    expect(stores.getInsightEditionById).not.toHaveBeenCalled()
  })

  it('crea: el token sale una vez, se persiste sólo su digest y el evento no lo lleva', async () => {
    const { createInsightShare } = await import('./commands')
    const result = await createInsightShare({ ...scope, options: { downloadOutputs: ['deck_pdf'] } })

    expect(result.token).toMatch(/^isg_/)
    expect(result.url).toBe(`https://think.efeoncepro.com/insights/r/${result.token}`)
    expect(result.share).not.toHaveProperty('token')

    const insertArg = shareStore.insertInsightShareGrant.mock.calls[0]![1] as { tokenDigest: string }

    expect(insertArg.tokenDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(insertArg.tokenDigest).not.toContain(result.token)

    const payload = JSON.stringify((infra.publish.mock.calls as unknown[][]).map(call => call[0]))

    expect(payload).toContain('insights.share.created')
    expect(payload).not.toContain(result.token)
    expect(payload).not.toContain(insertArg.tokenDigest)
  })

  it('sólo ediciones emitidas y de audiencia cliente; interna es inexistente para el cliente', async () => {
    const { createInsightShare } = await import('./commands')

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'ready_for_review' }))
    await expect(createInsightShare(scope)).rejects.toMatchObject({ code: 'not_ready' })

    stores.getInsightEditionById.mockResolvedValue(edition({ audience: 'internal' }))
    await expect(createInsightShare(scope)).rejects.toMatchObject({ code: 'not_ready' })
    await expect(createInsightShare({ ...scope, subject: executiveSubject, actorOrganizationId: 'org-a' })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('capability propia: client_manager lee/genera pero NO comparte; ejecutivo sí, sólo su org', async () => {
    const { createInsightShare } = await import('./commands')

    await expect(createInsightShare({ ...scope, subject: managerSubject, actorOrganizationId: 'org-a' })).rejects.toMatchObject({ code: 'forbidden' })
    await expect(createInsightShare({ ...scope, subject: executiveSubject, actorOrganizationId: 'org-b' })).rejects.toMatchObject({ code: 'not_found' })
    await expect(createInsightShare({ ...scope, subject: executiveSubject, actorOrganizationId: 'org-a' })).resolves.toHaveProperty('token')
  })

  it('org sin módulo ⇒ 404 anti-oracle', async () => {
    const { createInsightShare } = await import('./commands')

    moduleAssigned(false)
    await expect(createInsightShare(scope)).rejects.toMatchObject({ code: 'not_found' })
  })

  it('cupo de enlaces activos por edición', async () => {
    const { createInsightShare } = await import('./commands')

    shareStore.countActiveInsightShareGrants.mockResolvedValue(20)
    await expect(createInsightShare(scope)).rejects.toMatchObject({ code: 'quota_exceeded' })
    expect(shareStore.insertInsightShareGrant).not.toHaveBeenCalled()
  })

  it('revocar funciona con el flag OFF, es idempotente y publica evento sólo la primera vez', async () => {
    const { revokeInsightShare } = await import('./commands')

    shareStore.getInsightShareGrant.mockResolvedValue(grantRecord())
    shareStore.revokeInsightShareGrant.mockResolvedValue(grantRecord({ revokedAt: new Date().toISOString(), revokedByActorKind: 'member', revokeReason: 'manual' }))

    const first = await revokeInsightShare({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', shareGrantId: 'ishr-1', env: {} as NodeJS.ProcessEnv })

    expect(first).toMatchObject({ idempotent: false, share: { status: 'revoked' } })
    expect(infra.publish).toHaveBeenCalledTimes(1)

    shareStore.getInsightShareGrant.mockResolvedValue(grantRecord({ revokedAt: new Date().toISOString(), revokedByActorKind: 'member', revokeReason: 'manual' }))
    infra.publish.mockClear()

    const second = await revokeInsightShare({ subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', shareGrantId: 'ishr-1' })

    expect(second.idempotent).toBe(true)
    expect(infra.publish).not.toHaveBeenCalled()
  })

  it('listar nunca devuelve token ni digest', async () => {
    const { readInsightShares } = await import('./commands')

    shareStore.listInsightShareGrantsForEdition.mockResolvedValue([grantRecord(), grantRecord({ shareGrantId: 'ishr-2', expiresAt: new Date(Date.now() - 1000).toISOString() })] as never)

    const result = await readInsightShares(scope)

    expect(result.items.map(item => item.status)).toEqual(['active', 'expired'])
    expect(JSON.stringify(result)).not.toMatch(/token|digest/i)
  })
})

describe('reader público por token', () => {
  const TOKEN = `isg_${'A'.repeat(43)}`
  const context = { token: TOKEN, clientIp: '203.0.113.9', clientHint: 'unknown' as const, env: ENV_ON }

  const resolved = (overrides: Record<string, unknown> = {}) => ({
    grant: grantRecord(),
    editionState: 'issued',
    editionAudience: 'client',
    organizationActive: true,
    moduleActive: true,
    ...overrides
  })

  beforeEach(() => {
    vi.clearAllMocks()
    shareStore.consumeInsightShareRateBucket.mockResolvedValue(true)
    shareStore.resolveInsightShareGrantByDigest.mockResolvedValue(resolved())
    stores.getInsightEditionById.mockResolvedValue(edition())
    stores.getInsightReportById.mockResolvedValue({ reportId: 'insr-1', reportCode: 'EO-INS-000123', title: 'Informe mensual' })
    stores.getInsightEvidenceSnapshotByEdition.mockResolvedValue({ sealedAt: 'x', asOfMax: '2026-08-31', facts: [fact()] })
    stores.getInsightEditorialPlanByEdition.mockResolvedValue({ frozenAt: 'x', plan: plan() })
    renderStore.findInsightOutputsForEdition.mockResolvedValue([{ output: 'deck_pdf', state: 'completed', outputAssetId: 'asset-1' }] as never)
  })

  it('200: header, modelo y descarga disponible sólo para outputs permitidos por el grant', async () => {
    const { resolveSharedInsightEdition } = await import('./public')
    const result = await resolveSharedInsightEdition(context)

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.body.header).toMatchObject({ organizationName: 'Berel', reportCode: 'EO-INS-000123', editionVersion: 2 })
    expect(result.body.downloads).toEqual([{ output: 'deck_pdf', status: 'available', href: `/api/public/insights/shared/${TOKEN}/outputs/deck_pdf` }])
    expect(JSON.stringify(result.body)).not.toMatch(/user-int|mem-1|authoringMode|modelId|secret-ref/)
    expect(shareStore.recordInsightShareAccess).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'served', shareGrantId: 'ishr-1' }))
  })

  it('flag OFF, token mal formado o desconocido ⇒ 404 sin tocar grants', async () => {
    const { resolveSharedInsightEdition } = await import('./public')

    expect(await resolveSharedInsightEdition({ ...context, env: {} as NodeJS.ProcessEnv })).toEqual({ status: 'not_found' })
    expect(await resolveSharedInsightEdition({ ...context, token: 'isg_short' })).toEqual({ status: 'not_found' })
    expect(shareStore.resolveInsightShareGrantByDigest).not.toHaveBeenCalled()

    shareStore.resolveInsightShareGrantByDigest.mockResolvedValue(null)
    expect(await resolveSharedInsightEdition(context)).toEqual({ status: 'not_found' })
  })

  it('revocado o retirado ⇒ 410; expirado ⇒ 404 (indistinto de desconocido)', async () => {
    const { resolveSharedInsightEdition } = await import('./public')

    shareStore.resolveInsightShareGrantByDigest.mockResolvedValue(resolved({ grant: grantRecord({ revokedAt: new Date().toISOString(), revokeReason: 'manual', revokedByActorKind: 'member' }) }))
    expect(await resolveSharedInsightEdition(context)).toEqual({ status: 'gone' })

    shareStore.resolveInsightShareGrantByDigest.mockResolvedValue(resolved({ editionState: 'withdrawn' }))
    expect(await resolveSharedInsightEdition(context)).toEqual({ status: 'gone' })

    shareStore.resolveInsightShareGrantByDigest.mockResolvedValue(resolved({ grant: grantRecord({ expiresAt: new Date(Date.now() - 1000).toISOString() }) }))
    expect(await resolveSharedInsightEdition(context)).toEqual({ status: 'not_found' })
  })

  it('organización suspendida o módulo retirado ⇒ 404 aunque el token sea válido', async () => {
    const { resolveSharedInsightEdition } = await import('./public')

    shareStore.resolveInsightShareGrantByDigest.mockResolvedValue(resolved({ organizationActive: false }))
    expect(await resolveSharedInsightEdition(context)).toEqual({ status: 'not_found' })

    shareStore.resolveInsightShareGrantByDigest.mockResolvedValue(resolved({ moduleActive: false }))
    expect(await resolveSharedInsightEdition(context)).toEqual({ status: 'not_found' })
  })

  it('rate limit ⇒ 429 y la base caída falla CERRADO', async () => {
    const { resolveSharedInsightEdition } = await import('./public')

    shareStore.consumeInsightShareRateBucket.mockResolvedValueOnce(false)
    expect(await resolveSharedInsightEdition(context)).toEqual({ status: 'rate_limited' })

    shareStore.consumeInsightShareRateBucket.mockRejectedValueOnce(new Error('db down'))
    expect(await resolveSharedInsightEdition(context)).toEqual({ status: 'rate_limited' })
  })

  it('descarga: revalida el grant antes de leer bytes; output no permitido ⇒ 404; revocado ⇒ 410 sin leer', async () => {
    const { downloadSharedInsightOutput } = await import('./public')

    assets.downloadPrivateAsset.mockResolvedValue({ file: { arrayBuffer: new ArrayBuffer(4), contentType: 'application/pdf' } })

    const ok = await downloadSharedInsightOutput({ ...context, output: 'deck_pdf' })

    expect(ok.status).toBe('ok')
    expect(assets.downloadPrivateAsset).toHaveBeenCalledWith(expect.objectContaining({ assetId: 'asset-1', actorUserId: null }))

    assets.downloadPrivateAsset.mockClear()
    expect(await downloadSharedInsightOutput({ ...context, output: 'report_pdf' })).toEqual({ status: 'not_found' })
    expect(await downloadSharedInsightOutput({ ...context, output: 'web' })).toEqual({ status: 'not_found' })

    shareStore.resolveInsightShareGrantByDigest.mockResolvedValue(resolved({ grant: grantRecord({ revokedAt: new Date().toISOString(), revokeReason: 'manual', revokedByActorKind: 'member' }) }))
    expect(await downloadSharedInsightOutput({ ...context, output: 'deck_pdf' })).toEqual({ status: 'gone' })
    expect(assets.downloadPrivateAsset).not.toHaveBeenCalled()
  })
})
