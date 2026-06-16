import { describe, expect, it } from 'vitest'

import { classifyHealth } from './health'
import { parseWorkItem } from './parser'

const REPO = '/repo'

const parse = (kind: 'epic' | 'task' | 'mini_task' | 'issue', path: string, source: string) =>
  parseWorkItem({ kind, filePath: `${REPO}/${path}`, repoRoot: REPO, source })

const FULL_TASK = `# TASK-999 — Sample

<!-- ZONE 0 ZONE 1 ZONE 2 ZONE 3 ZONE 4 -->

## Status

- Lifecycle: \`to-do\`
- Type: \`implementation\`

## Summary

Resumen.
`

describe('classifyHealth — task', () => {
  it('marks a complete template task as ok + ready_to_execute', () => {
    const { base, signals } = parse('task', 'docs/tasks/to-do/TASK-999-sample.md', FULL_TASK)
    const health = classifyHealth(base, signals)

    expect(health.templateStatus).toBe('template')
    expect(health.lintErrors).toBe(0)
    expect(health.level).toBe('ok')
    expect(health.needsGrooming).toBe(false)
    expect(health.readiness).toBe('ready_to_execute')
  })

  it('marks a legacy task as legacy + needs_triage', () => {
    const { base, signals } = parse('task', 'docs/tasks/to-do/legacy.md', '# legacy TASK-001\n\nsin nada')
    const health = classifyHealth(base, signals)

    expect(health.templateStatus).toBe('legacy')
    expect(health.level).toBe('legacy')
    expect(health.needsGrooming).toBe(true)
    expect(health.readiness).toBe('needs_triage')
  })

  it('readiness=blocked when blockedBy is non-empty', () => {
    const blocked = FULL_TASK.replace('- Type: `implementation`', '- Type: `implementation`\n- Blocked by: `TASK-100`')
    const { base, signals } = parse('task', 'docs/tasks/to-do/TASK-999-sample.md', blocked)
    const health = classifyHealth(base, signals)

    expect(base.blockedBy).toEqual(['TASK-100'])
    expect(health.readiness).toBe('blocked')
  })

  it('readiness=in_progress / complete from folder lifecycle', () => {
    const ip = parse('task', 'docs/tasks/in-progress/TASK-999-sample.md', FULL_TASK.replace('to-do', 'in-progress'))

    expect(classifyHealth(ip.base, ip.signals).readiness).toBe('in_progress')

    const done = parse('task', 'docs/tasks/complete/TASK-999-sample.md', FULL_TASK.replace('to-do', 'complete'))

    expect(classifyHealth(done.base, done.signals).readiness).toBe('complete')
  })
})

describe('classifyHealth — epic required sections/fields', () => {
  it('flags missing required sections + status fields as errors → needs_grooming', () => {
    // Canonical filename + Status present but missing most required sections/fields.
    const source = `# EPIC-007 — Partial\n\n## Status\n\n- Lifecycle: \`to-do\`\n\n## Summary\n\nResumen.`
    const { base, signals } = parse('epic', 'docs/epics/to-do/EPIC-007-partial.md', source)
    const health = classifyHealth(base, signals)

    expect(health.templateStatus).toBe('canonical')
    expect(health.lintErrors).toBeGreaterThan(0)
    expect(health.level).toBe('needs_grooming')
    // Missing "why this epic exists", "outcome", "owner", etc.
    expect(health.findings.some(f => f.includes('owner'))).toBe(true)
  })
})

describe('classifyHealth — issue (no linter)', () => {
  it('ok issue with all expected sections', () => {
    const source = `# ISSUE-077 — X\n\n## Ambiente\n\nprod\n\n## Detectado\n\n2026-04-13\n\n## Síntoma\n\nY\n\n## Causa raíz\n\nZ\n\n## Impacto\n\nW\n\n## Estado\n\nopen`
    const { base, signals } = parse('issue', 'docs/issues/open/ISSUE-077-x.md', source)
    const health = classifyHealth(base, signals)

    expect(health.templateStatus).toBe('unknown')
    expect(health.lintErrors).toBe(0)
    expect(health.lintWarnings).toBe(0)
    expect(health.level).toBe('ok')
    expect(health.readiness).toBe('needs_triage')
  })

  it('resolved issue → readiness resolved', () => {
    const source = `# ISSUE-002 — X\n\n## Ambiente\n\nprod\n\n## Detectado\n\n2026-03-30\n\n## Sintoma\n\nY\n\n## Causa raiz\n\nZ\n\n## Impacto\n\nW\n\n## Estado\n\nresolved`
    const { base, signals } = parse('issue', 'docs/issues/resolved/ISSUE-002-x.md', source)
    const health = classifyHealth(base, signals)

    expect(health.readiness).toBe('resolved')
    expect(health.level).toBe('ok')
  })

  it('issue missing sections → needs_grooming warnings', () => {
    const source = `# ISSUE-003 — X\n\n## Síntoma\n\nincompleto`
    const { base, signals } = parse('issue', 'docs/issues/open/ISSUE-003-x.md', source)
    const health = classifyHealth(base, signals)

    expect(health.lintWarnings).toBeGreaterThan(0)
    expect(health.needsGrooming).toBe(true)
    expect(health.level).toBe('needs_grooming')
  })
})
