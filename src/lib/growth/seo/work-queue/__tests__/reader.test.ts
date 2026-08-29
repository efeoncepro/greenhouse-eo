import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = {
  snapshots: [] as Record<string, unknown>[],
  items: [] as Record<string, unknown>[],
  queries: [] as { sql: string; params: unknown[] }[]
}

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(async (sql: string, params: unknown[] = []) => {
    state.queries.push({ sql, params })

    return sql.includes('seo_work_queue_snapshots') ? state.snapshots : state.items
  })
}))

vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const { readSeoWorkQueue } = await import('../reader')

const ENV_ON = {
  ...process.env,
  GROWTH_SEO_ENABLED: 'true',
  GROWTH_SEO_WORK_QUEUE_ENABLED: 'true'
} as NodeJS.ProcessEnv

const snapshotRow = (over: Record<string, unknown> = {}) => ({
  snapshot_id: 'seowqs-1',
  organization_id: 'org-1',
  seo_target_id: 'seot-1',
  priority_score_version: 'incremental-clicks-v1',
  window_days: 28,
  item_count: 2,
  origin_health_json: [{ origin: 'aeo_gap', state: 'down', reason: 'sin run', asOf: null, itemCount: 0 }],
  computed_at: new Date('2026-08-28T10:00:00.000Z'),
  expires_at: new Date('2026-08-29T12:00:00.000Z'),
  ...over
})

const itemRow = (over: Record<string, unknown> = {}) => ({
  item_id: 'seowqi-1',
  rank_in_snapshot: 1,
  origin: 'gsc_striking_distance',
  normalized_keyword: 'pinturas',
  target_url: null,
  recommended_verb: 'optimize',
  score_basis: 'measured_incremental_clicks',
  score_band: 1,
  priority_score_text: '70.3322',
  score_breakdown_json: { impressions: 100 },
  evidence_ref: 'seo:gsc_query:pinturas',
  source_score_version: null,
  ...over
})

beforeEach(() => {
  state.snapshots = []
  state.items = []
  state.queries = []
  vi.useRealTimers()
})

describe('TASK-1700 — readSeoWorkQueue', () => {
  it('con el flag OFF devuelve `disabled` sin tocar la base', async () => {
    const r = await readSeoWorkQueue('seot-1', { env: { ...process.env, GROWTH_SEO_ENABLED: 'true' } })

    expect(r).toEqual({ ok: false, errorCode: 'disabled' })
    expect(state.queries).toHaveLength(0)
  })

  it('sin snapshot devuelve `absent` como estado OK, no como error', async () => {
    // Un target elegible cuya cola todavía no corrió es un estado legítimo. Devolver
    // `ok: false` haría que la UI pintara una falla donde hay un "todavía no".
    const r = await readSeoWorkQueue('seot-1', { env: ENV_ON })

    expect(r.ok).toBe(true)

    if (!r.ok) return

    expect(r.staleness).toBe('absent')
    expect(r.snapshot).toBeNull()
    expect(r.items).toEqual([])
  })

  it('declara `stale` cuando el snapshot vigente pasó su expiración', async () => {
    state.snapshots = [snapshotRow({ expires_at: new Date('2020-01-01T00:00:00.000Z') })]
    state.items = [itemRow()]

    const r = await readSeoWorkQueue('seot-1', { env: ENV_ON })

    expect(r.ok && r.staleness).toBe('stale')
  })

  it('propaga originHealth: un origen caído viaja al consumer, no se esconde', async () => {
    state.snapshots = [snapshotRow()]
    state.items = [itemRow()]

    const r = await readSeoWorkQueue('seot-1', { env: ENV_ON })

    expect(r.ok && r.originHealth).toEqual([
      { origin: 'aeo_gap', state: 'down', reason: 'sin run', asOf: null, itemCount: 0 }
    ])
  })

  it('un score nulo llega como null, jamás como 0', async () => {
    state.snapshots = [snapshotRow()]
    state.items = [itemRow({ score_band: 3, score_basis: 'no_measured_demand', priority_score_text: null })]

    const r = await readSeoWorkQueue('seot-1', { env: ENV_ON })

    expect(r.ok && r.items[0]!.priorityScore).toBeNull()
  })

  it('el ORDER BY del reader es idéntico al orden canónico del materializador', async () => {
    // Si divergen, la paginación saltea filas sin que nada falle. El assert mira el SQL
    // porque es la única forma de comprobar que las TRES llaves y el NULLS LAST siguen ahí.
    state.snapshots = [snapshotRow()]
    state.items = [itemRow()]

    await readSeoWorkQueue('seot-1', { env: ENV_ON })

    const itemsQuery = state.queries.find(q => q.sql.includes('seo_work_queue_items'))

    expect(itemsQuery?.sql).toContain(
      'ORDER BY score_band ASC, priority_score DESC NULLS LAST, normalized_keyword COLLATE "C" ASC'
    )

    // 🔴 El alias del score NO puede llamarse `priority_score`: PostgreSQL resuelve el
    // ORDER BY contra los nombres de SALIDA primero, así que un alias homónimo ordena la
    // cola como TEXTO ('8.8612' antes que '72.1405'). Lo destapó una corrida real — con
    // scores de un dígito o todos NULL el bug es invisible.
    expect(itemsQuery?.sql).toContain('AS priority_score_text')
    expect(itemsQuery?.sql).not.toContain('AS priority_score,')
  })

  it('pagina con cursor opaco y lo devuelve sólo cuando hay más', async () => {
    state.snapshots = [snapshotRow()]
    state.items = [itemRow({ normalized_keyword: 'a' }), itemRow({ normalized_keyword: 'b' })]

    const withMore = await readSeoWorkQueue('seot-1', { env: ENV_ON, limit: 1 })

    expect(withMore.ok && withMore.items).toHaveLength(1)
    expect(withMore.ok && withMore.nextCursor).toBeTruthy()

    // El cursor NO es legible ni construible a mano: un cursor fabricado saltearía filas.
    expect(withMore.ok && withMore.nextCursor).not.toContain('|')

    state.items = [itemRow()]

    const noMore = await readSeoWorkQueue('seot-1', { env: ENV_ON, limit: 5 })

    expect(noMore.ok && noMore.nextCursor).toBeNull()
  })

  it('un cursor corrupto no revienta ni saltea: se ignora y sirve desde el principio', async () => {
    state.snapshots = [snapshotRow()]
    state.items = [itemRow()]

    const r = await readSeoWorkQueue('seot-1', { env: ENV_ON, cursor: 'no-es-base64-valido-####' })

    expect(r.ok).toBe(true)
    expect(r.ok && r.items).toHaveLength(1)
  })

  it('el filtro de orígenes viaja como array a SQL, no como string con comas', async () => {
    state.snapshots = [snapshotRow()]
    state.items = [itemRow()]

    await readSeoWorkQueue('seot-1', { env: ENV_ON, origins: ['aeo_gap', 'consolidation'] })

    const itemsQuery = state.queries.find(q => q.sql.includes('seo_work_queue_items'))

    expect(itemsQuery?.params[1]).toEqual(['aeo_gap', 'consolidation'])
  })
})
