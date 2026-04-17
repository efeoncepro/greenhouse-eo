import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockExecute = vi.fn()
const mockGetRoleCodeNotificationRecipients = vi.fn()
const mockGetInternalUsersFromPostgres = vi.fn()
const mockGetDb = vi.fn()

const mockBuilder = {
  innerJoin: vi.fn(() => mockBuilder),
  leftJoin: vi.fn(() => mockBuilder),
  select: vi.fn(() => mockBuilder),
  where: vi.fn(() => mockBuilder),
  orderBy: vi.fn(() => mockBuilder),
  limit: vi.fn(() => mockBuilder),
  execute: (...args: unknown[]) => mockExecute(...args)
}

vi.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args)
}))

vi.mock('@/lib/notifications/person-recipient-resolver', () => ({
  getRoleCodeNotificationRecipients: (...args: unknown[]) => mockGetRoleCodeNotificationRecipients(...args)
}))

vi.mock('@/lib/tenant/identity-store', () => ({
  getInternalUsersFromPostgres: (...args: unknown[]) => mockGetInternalUsersFromPostgres(...args)
}))

const { buildWeeklyDigest, formatWeeklyDigestNarrativeText } = await import('./build-weekly-digest')
const { resolveWeeklyDigestRecipients } = await import('./recipient-resolver')

describe('buildWeeklyDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T12:00:00.000Z'))
    mockGetDb.mockResolvedValue({
      selectFrom: vi.fn(() => mockBuilder)
    })
  })

  it('orders, groups and narrates weekly insights with HTML-link-aware mentions', async () => {
    mockExecute.mockResolvedValue([
      {
        enrichment_id: 'EO-AIE-1',
        space_id: 'space-1',
        space_name: 'Space Operaciones',
        client_name: 'Efeonce',
        signal_type: 'anomaly',
        metric_name: 'otd_pct',
        severity: 'critical',
        quality_score: 97.4,
        explanation_summary: '@[Space Operaciones](space:space-1) tiene retrasos y @[Valentina Hoyos](member:valentina-hoyos) requiere apoyo.',
        recommended_action: 'Revisar @[Proyecto Alfa](project:project-1).',
        confidence: 0.91,
        processed_at: '2026-04-16T08:00:00.000Z'
      },
      {
        enrichment_id: 'EO-AIE-2',
        space_id: 'space-1',
        space_name: 'Space Operaciones',
        client_name: 'Efeonce',
        signal_type: 'recommendation',
        metric_name: 'rpa_avg',
        severity: 'warning',
        quality_score: 93.2,
        explanation_summary: 'Carga por encima del promedio.',
        recommended_action: null,
        confidence: 0.82,
        processed_at: '2026-04-16T07:50:00.000Z'
      },
      {
        enrichment_id: 'EO-AIE-3',
        space_id: 'space-2',
        space_name: 'Space Delivery',
        client_name: null,
        signal_type: 'root_cause',
        metric_name: 'ftr_pct',
        severity: 'info',
        quality_score: 88.1,
        explanation_summary: 'Sincronizacion pendiente.',
        recommended_action: 'Coordinar con @[Equipo Delivery](space:space-2).',
        confidence: 0.75,
        processed_at: '2026-04-16T07:20:00.000Z'
      }
    ])

    const digest = await buildWeeklyDigest({ now: new Date('2026-04-16T12:00:00.000Z'), limit: 8 })

    expect(mockGetDb).toHaveBeenCalledTimes(1)
    expect(mockBuilder.innerJoin).toHaveBeenCalledTimes(1)
    expect(mockBuilder.leftJoin).toHaveBeenCalledTimes(1)
    expect(mockBuilder.where).toHaveBeenCalledWith('enrich.status', '=', 'succeeded')
    expect(mockBuilder.limit).toHaveBeenCalledWith(8)
    expect(mockExecute).toHaveBeenCalledTimes(1)

    expect(digest.periodLabel).toBe('9 abr 2026 - 16 abr 2026')
    expect(digest.totalInsights).toBe(3)
    expect(digest.criticalCount).toBe(1)
    expect(digest.warningCount).toBe(1)
    expect(digest.infoCount).toBe(1)
    expect(digest.spacesAffected).toBe(2)
    expect(digest.spaces).toHaveLength(2)
    expect(digest.spaces[0].name).toBe('Space Operaciones')
    expect(digest.spaces[0].href).toContain('/agency/spaces/space-1')
    expect(digest.spaces[0].insights[0].headline).toContain('OTD%')
    expect(digest.spaces[0].insights[0].narrative[0]).toMatchObject({
      type: 'link',
      value: 'Space Operaciones'
    })
    expect(digest.spaces[0].insights[0].narrative[0]).toMatchObject({
      href: expect.stringContaining('/agency/spaces/space-1')
    })
    expect(digest.spaces[0].insights[0].narrative.some(part => part.type === 'link' && part.value === 'Valentina Hoyos')).toBe(true)
    expect(digest.spaces[0].insights[0].narrative.some(part => part.type === 'text' && part.value === 'Proyecto Alfa')).toBe(true)
    expect(formatWeeklyDigestNarrativeText(digest.spaces[0].insights[0].narrative)).toContain('Valentina Hoyos')
  })
})

describe('resolveWeeklyDigestRecipients', () => {
  it('keeps only internal leadership recipients and deduplicates them', async () => {
    mockGetRoleCodeNotificationRecipients.mockResolvedValue([
      { email: 'admin@efeoncepro.com', userId: 'user-admin', fullName: 'Ada Admin' },
      { email: 'ops@efeoncepro.com', userId: 'user-ops', fullName: 'Omar Ops' },
      { email: 'external@example.com', userId: 'user-external', fullName: 'Outside' }
    ])

    mockGetInternalUsersFromPostgres.mockResolvedValue([
      { user_id: 'user-admin', email: 'admin@efeoncepro.com', microsoft_email: null, full_name: 'Ada Admin' },
      { user_id: 'user-ops', email: 'ops@efeoncepro.com', microsoft_email: null, full_name: 'Omar Ops' }
    ])

    const recipients = await resolveWeeklyDigestRecipients()

    expect(recipients).toEqual([
      { email: 'admin@efeoncepro.com', userId: 'user-admin', name: 'Ada Admin' },
      { email: 'ops@efeoncepro.com', userId: 'user-ops', name: 'Omar Ops' }
    ])
  })
})
