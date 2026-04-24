import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetDb = vi.fn()

vi.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args)
}))

const {
  DEFAULT_FALLBACKS,
  MENTION_PATTERN,
  isHumanLabel,
  loadMentionContext,
  resolveMentions,
  resolveAllNarrativeFields,
  summarizePresentationReports
} = await import('./narrative-presentation')

// ─── Helpers ──────────────────────────────────────────────────────────

const buildEmptyContext = () => ({
  projects: new Map<string, string | null>(),
  members: new Map<string, string | null>(),
  spaces: new Map<string, string | null>(),
  fallbacks: { ...DEFAULT_FALLBACKS }
})

const createBuilder = (rows: unknown[]) => {
  const builder = {
    select: vi.fn(() => builder),
    where: vi.fn(() => builder),
    execute: vi.fn(async () => rows)
  }

  return builder
}

// ─── MENTION_PATTERN ──────────────────────────────────────────────────

describe('MENTION_PATTERN', () => {
  it('matches the 3 mention types', () => {
    const text =
      'Proyecto @[TEASER](project:p-1) en space @[Sky](space:sp-1) liderado por @[Ana](member:m-1).'

    const matches = [...text.matchAll(MENTION_PATTERN)].map(m => ({
      label: m[1],
      type: m[2],
      id: m[3]
    }))

    expect(matches).toEqual([
      { label: 'TEASER', type: 'project', id: 'p-1' },
      { label: 'Sky', type: 'space', id: 'sp-1' },
      { label: 'Ana', type: 'member', id: 'm-1' }
    ])
  })
})

// ─── isHumanLabel ─────────────────────────────────────────────────────

describe('isHumanLabel', () => {
  it('rejects sentinels, technical IDs, null, empty', () => {
    expect(isHumanLabel(null)).toBe(false)
    expect(isHumanLabel('')).toBe(false)
    expect(isHumanLabel('Sin nombre')).toBe(false)
    expect(isHumanLabel('sin título')).toBe(false)
    expect(isHumanLabel('Untitled')).toBe(false)
    expect(isHumanLabel('project-abc')).toBe(false)
    expect(isHumanLabel('10c15729e9fd497b8411fb72b7af580f')).toBe(false)
  })

  it('accepts real human titles', () => {
    expect(isHumanLabel('TEASER TS - Chile (S)')).toBe(true)
    expect(isHumanLabel('Andres Carlosama')).toBe(true)
    expect(isHumanLabel('Sky Airline')).toBe(true)
  })
})

// ─── resolveMentions ──────────────────────────────────────────────────

describe('resolveMentions', () => {
  it('returns empty narrative when input is null/empty', () => {
    expect(resolveMentions(null, buildEmptyContext())).toEqual({ text: '', reports: [] })
    expect(resolveMentions('', buildEmptyContext())).toEqual({ text: '', reports: [] })
  })

  it('re-hydrates a project mention with the current canonical label', () => {
    const context = buildEmptyContext()

    context.projects.set('p-1', 'TEASER TS - Chile (S)')

    const result = resolveMentions(
      'El proyecto @[Sin nombre](project:p-1) bajó a 67.6%.',
      context
    )

    expect(result.text).toBe(
      'El proyecto @[TEASER TS - Chile (S)](project:p-1) bajó a 67.6%.'
    )
    expect(result.reports).toEqual([
      {
        type: 'project',
        id: 'p-1',
        originalLabel: 'Sin nombre',
        resolvedLabel: 'TEASER TS - Chile (S)',
        fallbackReason: 'none'
      }
    ])
  })

  it('falls back to "este proyecto" when canonical project_name is null', () => {
    const context = buildEmptyContext()

    context.projects.set('p-1', null)

    const result = resolveMentions(
      'El proyecto @[Sin nombre](project:p-1) bajó.',
      context
    )

    expect(result.text).toBe('El proyecto este proyecto bajó.')
    expect(result.reports[0].fallbackReason).toBe('null_canonical')
  })

  it('falls back when canonical label is a sentinel (defensive — should not happen post-TASK-588)', () => {
    const context = buildEmptyContext()

    context.projects.set('p-1', 'Sin nombre')

    const result = resolveMentions(
      'El proyecto @[Sin nombre](project:p-1) bajó.',
      context
    )

    expect(result.text).toBe('El proyecto este proyecto bajó.')
    expect(result.reports[0].fallbackReason).toBe('sentinel')
  })

  it('falls back when entity does not exist in canonical (missing)', () => {
    const context = buildEmptyContext()

    const result = resolveMentions(
      'El proyecto @[Sin nombre](project:p-missing) bajó.',
      context
    )

    expect(result.text).toBe('El proyecto este proyecto bajó.')
    expect(result.reports[0].fallbackReason).toBe('missing_entity')
  })

  it('falls back when canonical label is a technical ID', () => {
    const context = buildEmptyContext()

    context.projects.set('p-1', 'project-abc123')

    const result = resolveMentions('@[Old label](project:p-1) cayó.', context)

    expect(result.text).toBe('este proyecto cayó.')
    expect(result.reports[0].fallbackReason).toBe('technical_id')
  })

  it('resolves multiple mentions in one narrative independently', () => {
    const context = buildEmptyContext()

    context.projects.set('p-1', 'TEASER TS')
    context.members.set('m-1', 'Andres Carlosama')
    context.spaces.set('sp-1', 'Sky Airline')

    const result = resolveMentions(
      'El FTR% de @[Andres](member:m-1) en el proyecto @[Old](project:p-1) del space @[Sky](space:sp-1).',
      context
    )

    expect(result.text).toBe(
      'El FTR% de @[Andres Carlosama](member:m-1) en el proyecto @[TEASER TS](project:p-1) del space @[Sky Airline](space:sp-1).'
    )
    expect(result.reports).toHaveLength(3)
    expect(result.reports.every(r => r.fallbackReason === 'none')).toBe(true)
  })

  it('sanitizes plain-text sentinels outside mention tokens', () => {
    const context = buildEmptyContext()

    const result = resolveMentions(
      `El proyecto 'Sin nombre' en Sky Airline experimentó una caída.`,
      context
    )

    expect(result.text).toBe('este proyecto en Sky Airline experimentó una caída.')
  })

  it('sanitizes bare-phrase sentinels without quotes', () => {
    const context = buildEmptyContext()

    const result = resolveMentions(
      'El proyecto Sin nombre muestra problemas de FTR.',
      context
    )

    expect(result.text).toBe('este proyecto muestra problemas de FTR.')
  })

  it('leaves human labels inside mentions alone when canonical matches', () => {
    const context = buildEmptyContext()

    context.projects.set('p-1', 'TEASER TS')

    const result = resolveMentions('Proyecto @[TEASER TS](project:p-1) exitoso.', context)

    expect(result.text).toBe('Proyecto @[TEASER TS](project:p-1) exitoso.')
    expect(result.reports[0].fallbackReason).toBe('none')
  })

  it('preserves mention ID in reports even when fallback triggered', () => {
    const context = buildEmptyContext()

    context.projects.set('p-1', null)

    const result = resolveMentions('@[Sin nombre](project:p-1)', context)

    expect(result.reports[0].id).toBe('p-1')
    expect(result.reports[0].originalLabel).toBe('Sin nombre')
  })
})

// ─── resolveAllNarrativeFields ────────────────────────────────────────

describe('resolveAllNarrativeFields', () => {
  it('resolves summary + root cause + action in one pass and aggregates reports', () => {
    const context = buildEmptyContext()

    context.projects.set('p-1', 'TEASER TS')
    context.members.set('m-1', 'Andres')

    const result = resolveAllNarrativeFields(
      {
        explanation_summary: 'El proyecto @[Sin nombre](project:p-1) cayó.',
        root_cause_narrative: 'Responsable @[Old](member:m-1).',
        recommended_action: 'Revisar @[Sin nombre](project:p-1).'
      },
      context
    )

    expect(result.explanation_summary).toContain('TEASER TS')
    expect(result.root_cause_narrative).toContain('Andres')
    expect(result.recommended_action).toContain('TEASER TS')
    expect(result.presentation_reports).toHaveLength(3)
    expect(result.presentation_reports.every(r => r.fallbackReason === 'none')).toBe(true)
  })

  it('handles null fields gracefully', () => {
    const context = buildEmptyContext()

    const result = resolveAllNarrativeFields(
      {
        explanation_summary: null,
        root_cause_narrative: null,
        recommended_action: null
      },
      context
    )

    expect(result.explanation_summary).toBe('')
    expect(result.root_cause_narrative).toBe('')
    expect(result.recommended_action).toBe('')
    expect(result.presentation_reports).toEqual([])
  })
})

// ─── loadMentionContext (DB-backed) ───────────────────────────────────

describe('loadMentionContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('batch loads only the IDs referenced in narratives + structural FKs', async () => {
    const capturedTables: string[] = []

    mockGetDb.mockResolvedValue({
      selectFrom: (table: string) => {
        capturedTables.push(table)

        if (table === 'greenhouse_delivery.projects') {
          return createBuilder([
            {
              project_record_id: 'p-1',
              notion_project_id: 'notion-p-1',
              project_name: 'TEASER TS'
            }
          ])
        }

        if (table === 'greenhouse_core.members') {
          return createBuilder([{ member_id: 'm-1', display_name: 'Andres' }])
        }

        if (table === 'greenhouse_core.spaces') {
          return createBuilder([{ space_id: 'sp-1', space_name: 'Sky Airline' }])
        }

        throw new Error(`Unexpected table: ${table}`)
      }
    })

    const context = await loadMentionContext({
      enrichments: [
        {
          explanation_summary: 'El proyecto @[x](project:p-1) con @[y](member:m-1).',
          root_cause_narrative: 'En @[z](space:sp-1).',
          recommended_action: null,
          space_id: 'sp-1',
          member_id: 'm-1',
          project_id: 'p-1'
        }
      ]
    })

    expect(capturedTables).toEqual([
      'greenhouse_delivery.projects',
      'greenhouse_core.members',
      'greenhouse_core.spaces'
    ])

    expect(context.projects.get('p-1')).toBe('TEASER TS')
    expect(context.members.get('m-1')).toBe('Andres')
    expect(context.spaces.get('sp-1')).toBe('Sky Airline')
  })

  it('accepts custom fallbacks', async () => {
    mockGetDb.mockResolvedValue({
      selectFrom: () => createBuilder([])
    })

    const context = await loadMentionContext({
      enrichments: [],
      fallbacks: { project: 'un proyecto sin identificar' }
    })

    expect(context.fallbacks.project).toBe('un proyecto sin identificar')
    expect(context.fallbacks.member).toBe('este responsable')
  })
})

// ─── summarizePresentationReports ─────────────────────────────────────

describe('summarizePresentationReports', () => {
  it('produces a log shape with fallback rate 0 when all resolved', () => {
    const log = summarizePresentationReports(
      [
        {
          type: 'project',
          id: 'p-1',
          originalLabel: 'x',
          resolvedLabel: 'TEASER',
          fallbackReason: 'none'
        }
      ],
      { source: 'test' }
    )

    expect(log.event).toBe('narrative_presentation')
    expect(log.fallback_rate).toBe(0)
    expect(log.resolved).toBe(1)
    expect(log.fallback_count_by_reason.none).toBe(1)
  })

  it('computes fallback_rate when some mentions failed', () => {
    const log = summarizePresentationReports(
      [
        {
          type: 'project',
          id: 'p-1',
          originalLabel: 'x',
          resolvedLabel: 'TEASER',
          fallbackReason: 'none'
        },
        {
          type: 'project',
          id: 'p-2',
          originalLabel: 'Sin nombre',
          resolvedLabel: 'este proyecto',
          fallbackReason: 'null_canonical'
        },
        {
          type: 'member',
          id: 'm-1',
          originalLabel: 'Old',
          resolvedLabel: 'este responsable',
          fallbackReason: 'missing_entity'
        }
      ],
      { source: 'test' }
    )

    expect(log.total_mentions).toBe(3)
    expect(log.resolved).toBe(1)
    expect(log.fallback_rate).toBeCloseTo(0.6667, 3)
    expect(log.fallback_count_by_reason.null_canonical).toBe(1)
    expect(log.fallback_count_by_reason.missing_entity).toBe(1)
  })

  it('handles empty reports', () => {
    const log = summarizePresentationReports([], { source: 'test' })

    expect(log.total_mentions).toBe(0)
    expect(log.resolved).toBe(0)
    expect(log.fallback_rate).toBe(0)
  })
})
