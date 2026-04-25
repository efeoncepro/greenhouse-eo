import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as NarrativePresentation from '@/lib/ico-engine/ai/narrative-presentation'

vi.mock('server-only', () => ({}))

const mockSelectPresentableEnrichments = vi.fn()
const mockLoadMentionContext = vi.fn()
const mockGetRoleCodeNotificationRecipients = vi.fn()
const mockGetInternalUsersFromPostgres = vi.fn()

vi.mock('@/lib/ico-engine/ai/narrative-presentation', async () => {
  const actual = await vi.importActual<typeof NarrativePresentation>(
    '@/lib/ico-engine/ai/narrative-presentation'
  )

  return {
    ...actual,
    selectPresentableEnrichments: (...args: unknown[]) => mockSelectPresentableEnrichments(...args),
    loadMentionContext: (...args: unknown[]) => mockLoadMentionContext(...args)
  }
})

vi.mock('@/lib/notifications/person-recipient-resolver', () => ({
  getRoleCodeNotificationRecipients: (...args: unknown[]) =>
    mockGetRoleCodeNotificationRecipients(...args)
}))

vi.mock('@/lib/tenant/identity-store', () => ({
  getInternalUsersFromPostgres: (...args: unknown[]) => mockGetInternalUsersFromPostgres(...args)
}))

const { buildWeeklyDigest, formatWeeklyDigestNarrativeText } = await import('./build-weekly-digest')
const { resolveWeeklyDigestRecipients } = await import('./recipient-resolver')

const createContext = (overrides: {
  projects?: [string, string | null][]
  members?: [string, string | null][]
  spaces?: [string, string | null][]
} = {}) => ({
  projects: new Map<string, string | null>(overrides.projects ?? []),
  members: new Map<string, string | null>(overrides.members ?? []),
  spaces: new Map<string, string | null>(overrides.spaces ?? []),
  fallbacks: {
    project: 'este proyecto',
    member: 'este responsable',
    space: 'este espacio'
  }
})

const baseEnrichment = {
  enrichment_id: 'EO-AIE-1',
  signal_id: 'EO-AIS-1',
  space_id: 'space-1',
  space_name: 'Space Operaciones',
  client_name: 'Efeonce',
  signal_type: 'anomaly',
  metric_name: 'otd_pct',
  severity: 'critical' as const,
  quality_score: 97.4,
  confidence: 0.91,
  explanation_summary:
    '@[Space Operaciones](space:space-1) tiene retrasos y @[Valentina Hoyos](member:valentina-hoyos) requiere apoyo.',
  root_cause_narrative: null,
  recommended_action: 'Revisar @[Proyecto Alfa](project:project-1).',
  processed_at: '2026-04-16T08:00:00.000Z',
  member_id: 'valentina-hoyos',
  project_id: 'project-1'
}

describe('buildWeeklyDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-16T12:00:00.000Z'))
  })

  it('orders by severity, groups by space, and hydrates mentions with canonical labels', async () => {
    mockSelectPresentableEnrichments.mockResolvedValue([
      baseEnrichment,
      {
        ...baseEnrichment,
        enrichment_id: 'EO-AIE-2',
        signal_id: 'EO-AIS-2',
        signal_type: 'recommendation',
        metric_name: 'rpa_avg',
        severity: 'warning' as const,
        quality_score: 93.2,
        confidence: 0.82,
        explanation_summary: 'Carga por encima del promedio.',
        recommended_action: null,
        processed_at: '2026-04-16T07:50:00.000Z',
        member_id: null,
        project_id: null
      },
      {
        ...baseEnrichment,
        enrichment_id: 'EO-AIE-3',
        signal_id: 'EO-AIS-3',
        space_id: 'space-2',
        space_name: 'Space Delivery',
        client_name: null,
        signal_type: 'root_cause',
        metric_name: 'ftr_pct',
        severity: 'info' as const,
        quality_score: 88.1,
        confidence: 0.75,
        explanation_summary: 'Sincronización pendiente.',
        recommended_action: 'Coordinar con @[Equipo Delivery](space:space-2).',
        processed_at: '2026-04-16T07:20:00.000Z',
        member_id: null,
        project_id: null
      }
    ])

    mockLoadMentionContext.mockResolvedValue(
      createContext({
        spaces: [
          ['space-1', 'Space Operaciones'],
          ['space-2', 'Space Delivery']
        ],
        members: [['valentina-hoyos', 'Valentina Hoyos']],
        projects: [['project-1', 'Proyecto Alfa']]
      })
    )

    const digest = await buildWeeklyDigest({ now: new Date('2026-04-16T12:00:00.000Z'), limit: 8 })

    expect(mockSelectPresentableEnrichments).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      expect.objectContaining({
        requireSignalExists: true,
        maxTotal: 8,
        maxPerSpace: 3,
        severityFloor: 'warning'
      })
    )

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
    expect(
      digest.spaces[0].insights[0].narrative.some(
        part => part.type === 'link' && part.value === 'Valentina Hoyos'
      )
    ).toBe(true)
    expect(formatWeeklyDigestNarrativeText(digest.spaces[0].insights[0].narrative)).toContain(
      'Valentina Hoyos'
    )
  })

  it('sanitizes sentinels ("Sin nombre") and produces clean output (TASK-598 regression fixture)', async () => {
    // Simula el estado real del dataset post-screen: 3 enrichments con "Sin nombre"
    // en narrativas + canonical PG ya saneado por TASK-588 (project_name=null).
    mockSelectPresentableEnrichments.mockResolvedValue([
      {
        ...baseEnrichment,
        signal_id: 'EO-AIS-sentinel-1',
        space_id: 'spc-sky',
        space_name: 'Sky Airline',
        client_name: 'Sky Airline',
        severity: 'critical' as const,
        explanation_summary:
          'El proyecto @[Sin nombre](project:30b39c2f-efe7-80ba-b13f-e3881e767146) en @[Sky Airline](space:spc-sky) cayó a 67.6%.',
        root_cause_narrative: 'El OTD% para el proyecto @[Sin nombre](project:30b39c2f) disminuyó.',
        recommended_action: `El proyecto 'Sin nombre' necesita atención.`,
        project_id: '30b39c2f-efe7-80ba-b13f-e3881e767146'
      }
    ])

    mockLoadMentionContext.mockResolvedValue(
      createContext({
        // Canonical sigue null (TASK-588 barrió los sentinels al hacer el cleanup).
        projects: [['30b39c2f-efe7-80ba-b13f-e3881e767146', null]],
        spaces: [['spc-sky', 'Sky Airline']]
      })
    )

    const digest = await buildWeeklyDigest({ now: new Date('2026-04-16T12:00:00.000Z'), limit: 8 })

    const serialized = JSON.stringify(digest)

    // Aserciones duras: el JSON completo del digest no contiene ningún sentinel.
    expect(serialized.toLowerCase()).not.toContain('sin nombre')
    expect(serialized.toLowerCase()).not.toContain('sin título')
    expect(serialized.toLowerCase()).not.toContain('untitled')

    // Y sí contiene los fallbacks + labels canónicos vigentes.
    expect(serialized).toContain('este proyecto')
    expect(serialized).toContain('Sky Airline')
  })

  it('retorna empty digest cuando no hay enrichments presentables (ops-worker skippea envío)', async () => {
    mockSelectPresentableEnrichments.mockResolvedValue([])
    mockLoadMentionContext.mockResolvedValue(createContext())

    const digest = await buildWeeklyDigest({ now: new Date('2026-04-16T12:00:00.000Z') })

    expect(digest.totalInsights).toBe(0)
    expect(digest.spaces).toHaveLength(0)
    expect(digest.criticalCount).toBe(0)
  })

  it('respeta overrides de filtros (minQualityScore, maxPerSpace, severityFloor)', async () => {
    mockSelectPresentableEnrichments.mockResolvedValue([])
    mockLoadMentionContext.mockResolvedValue(createContext())

    await buildWeeklyDigest({
      filters: { minQualityScore: 0.7, maxPerSpace: 2, severityFloor: 'critical' }
    })

    expect(mockSelectPresentableEnrichments).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      expect.objectContaining({
        minQualityScore: 0.7,
        maxPerSpace: 2,
        severityFloor: 'critical'
      })
    )
  })
})

describe('resolveWeeklyDigestRecipients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps only internal leadership recipients and deduplicates them', async () => {
    mockGetRoleCodeNotificationRecipients.mockResolvedValue([
      { email: 'admin@efeoncepro.com', userId: 'user-admin', fullName: 'Ada Admin' },
      { email: 'ops@efeoncepro.com', userId: 'user-ops', fullName: 'Omar Ops' },
      { email: 'external@example.com', userId: 'user-external', fullName: 'Outside' }
    ])

    mockGetInternalUsersFromPostgres.mockResolvedValue([
      {
        user_id: 'user-admin',
        email: 'admin@efeoncepro.com',
        microsoft_email: null,
        full_name: 'Ada Admin'
      },
      {
        user_id: 'user-ops',
        email: 'ops@efeoncepro.com',
        microsoft_email: null,
        full_name: 'Omar Ops'
      }
    ])

    const recipients = await resolveWeeklyDigestRecipients()

    expect(recipients).toEqual([
      { email: 'admin@efeoncepro.com', userId: 'user-admin', name: 'Ada Admin' },
      { email: 'ops@efeoncepro.com', userId: 'user-ops', name: 'Omar Ops' }
    ])
  })
})
