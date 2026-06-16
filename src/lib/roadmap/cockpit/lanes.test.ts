import { describe, expect, it } from 'vitest'

import type { WorkItem } from '@/lib/roadmap/work-item-index/types'

import { assignLane, isActiveLane, normalizePriority } from './lanes'

const baseItem = (overrides: Partial<WorkItem>): WorkItem => ({
  id: 'TASK-001',
  kind: 'task',
  title: 'X',
  path: 'docs/tasks/to-do/TASK-001-x.md',
  lifecycle: 'to-do',
  declaredLifecycle: 'to-do',
  priority: 'P2',
  impact: null,
  effort: null,
  type: null,
  rank: null,
  executionProfile: null,
  uiImpact: null,
  backendImpact: null,
  domain: null,
  blockedBy: [],
  branch: null,
  filesOwned: [],
  dependsOn: [],
  blocks: [],
  relatedIds: [],
  parentEpic: null,
  environment: null,
  detectedAt: null,
  resolvedAt: null,
  severity: null,
  rootCause: null,
  health: { templateStatus: 'template', lintErrors: 0, lintWarnings: 0, needsGrooming: false, level: 'ok', readiness: 'ready_to_execute', findings: [] },
  parseWarnings: [],
  summary: null,
  why: null,
  goalPreview: null,
  ...overrides
})

describe('normalizePriority', () => {
  it('extracts P0..P3 from the front-matter value', () => {
    expect(normalizePriority('P1')).toBe('P1')
    expect(normalizePriority('p3')).toBe('P3')
    expect(normalizePriority('P0 · crítica')).toBe('P0')
  })

  it('returns null when no priority is declared', () => {
    expect(normalizePriority(null)).toBeNull()
    expect(normalizePriority('TBD')).toBeNull()
    expect(normalizePriority('P9')).toBeNull()
  })
})

describe('assignLane', () => {
  it('epics → programs (active) or done (complete)', () => {
    expect(assignLane(baseItem({ kind: 'epic', lifecycle: 'in-progress' }))).toBe('programs')
    expect(assignLane(baseItem({ kind: 'epic', lifecycle: 'complete' }))).toBe('done')
  })

  it('issues → issues (open) or done (resolved)', () => {
    expect(assignLane(baseItem({ kind: 'issue', lifecycle: 'open' }))).toBe('issues')
    expect(assignLane(baseItem({ kind: 'issue', lifecycle: 'resolved' }))).toBe('done')
  })

  it('tasks: complete → done, in-progress → progress', () => {
    expect(assignLane(baseItem({ lifecycle: 'complete' }))).toBe('done')
    expect(assignLane(baseItem({ lifecycle: 'in-progress' }))).toBe('progress')
  })

  it('tasks: blocked beats grooming beats ready', () => {
    expect(assignLane(baseItem({ blockedBy: ['TASK-100'] }))).toBe('blocked')
    expect(
      assignLane(
        baseItem({
          health: { templateStatus: 'legacy', lintErrors: 0, lintWarnings: 1, needsGrooming: true, level: 'needs_grooming', readiness: 'needs_triage', findings: ['x'] }
        })
      )
    ).toBe('grooming')
    expect(assignLane(baseItem({}))).toBe('ready')
  })

  it('in-progress wins over blocked', () => {
    expect(assignLane(baseItem({ lifecycle: 'in-progress', blockedBy: ['TASK-2'] }))).toBe('progress')
  })

  it('hasOpenBlocker=false → no blocked aunque declare blockedBy (bloqueador ya cerrado)', () => {
    const item = baseItem({ blockedBy: ['TASK-100'] })

    expect(assignLane(item, { hasOpenBlocker: true })).toBe('blocked')
    expect(assignLane(item, { hasOpenBlocker: false })).toBe('ready')
  })

  it('mini-tasks follow the task rules', () => {
    expect(assignLane(baseItem({ kind: 'mini_task', lifecycle: 'to-do' }))).toBe('ready')
    expect(assignLane(baseItem({ kind: 'mini_task', blockedBy: ['MINI-1'] }))).toBe('blocked')
  })
})

describe('isActiveLane', () => {
  it('done is the only non-active lane', () => {
    expect(isActiveLane('done')).toBe(false)
    expect(isActiveLane('ready')).toBe(true)
    expect(isActiveLane('programs')).toBe(true)
  })
})
