import { describe, expect, it } from 'vitest'

import { parseWorkItem } from './parser'

const REPO = '/repo'

const fixturePath = (kind: string, lifecycle: string, file: string): string => {
  const docsDir = kind === 'mini_task' ? 'mini-tasks' : kind === 'issue' ? 'issues' : `${kind}s`

  return `${REPO}/docs/${docsDir}/${lifecycle}/${file}`
}

const TEMPLATE_TASK = `# TASK-999 — Sample task

<!-- ZONE 0 --> <!-- ZONE 1 --> <!-- ZONE 2 --> <!-- ZONE 3 --> <!-- ZONE 4 -->

## Status

- Lifecycle: \`in-progress\`
- Priority: \`P1\`
- Impact: \`Alto\`
- Effort: \`Medio\`
- Type: \`implementation\`
- Execution profile: \`backend-data\`
- UI impact: \`none\`
- Backend impact: \`reader\`
- Epic: \`EPIC-007\`
- Rank: \`TBD\`
- Domain: \`finance|ops\`
- Blocked by: \`TASK-100, TASK-101\`
- Branch: \`task/TASK-999-sample\`

## Summary

Construir un reader de prueba que referencia TASK-555 y ISSUE-042.

## Why This Task Exists

Porque el backlog lo necesita.

## Goal

- Hacer X
- Hacer Y

## Dependencies & Impact

### Depends on

- \`docs/tasks/**\`
- TASK-100 debe existir antes

### Blocks / Impacts

- Blocks TASK-200

### Files owned

- \`src/lib/sample/reader.ts\`
- \`src/lib/sample/types.ts\`
`

describe('parseWorkItem — task (template)', () => {
  const { base, signals } = parseWorkItem({
    kind: 'task',
    filePath: fixturePath('task', 'in-progress', 'TASK-999-sample-task.md'),
    repoRoot: REPO,
    source: TEMPLATE_TASK
  })

  it('extracts identity + relative path', () => {
    expect(base.id).toBe('TASK-999')
    expect(base.kind).toBe('task')
    expect(base.title).toBe('TASK-999 — Sample task')
    expect(base.path).toBe('docs/tasks/in-progress/TASK-999-sample-task.md')
    expect(base.lifecycle).toBe('in-progress')
  })

  it('parses triage + contract fields (lowercased where canonical)', () => {
    expect(base.priority).toBe('P1')
    expect(base.impact).toBe('Alto')
    expect(base.type).toBe('implementation')
    expect(base.executionProfile).toBe('backend-data')
    expect(base.uiImpact).toBe('none')
    expect(base.backendImpact).toBe('reader')
    expect(base.domain).toBe('finance|ops')
    expect(base.branch).toBe('task/TASK-999-sample')
    expect(base.parentEpic).toBe('EPIC-007')
  })

  it('parses blockers, owned files, deps, blocks and related ids', () => {
    expect(base.blockedBy).toEqual(['TASK-100', 'TASK-101'])
    expect(base.filesOwned).toEqual(['src/lib/sample/reader.ts', 'src/lib/sample/types.ts'])
    expect(base.dependsOn).toContain('TASK-100')
    expect(base.blocks).toContain('TASK-200')
    expect(base.relatedIds).toEqual(expect.arrayContaining(['TASK-555', 'ISSUE-042', 'EPIC-007']))
    expect(base.relatedIds).not.toContain('TASK-999')
  })

  it('exposes template signals', () => {
    expect(signals.hasStatus).toBe(true)
    expect(signals.hasCanonicalFilename).toBe(true)
    expect(signals.hasTemplateShape).toBe(true)
    expect(signals.statusFieldKeys.has('lifecycle')).toBe(true)
    expect(signals.statusFieldKeys.has('type')).toBe(true)
  })

  it('summarizes sections', () => {
    expect(base.summary).toContain('reader de prueba')
    expect(base.why).toContain('backlog')
    expect(base.goalPreview).toContain('Hacer X')
  })
})

describe('parseWorkItem — task (legacy / missing fields / malformed)', () => {
  it('degrades a legacy task without ZONE markers or canonical filename', () => {
    const { base, signals } = parseWorkItem({
      kind: 'task',
      filePath: fixturePath('task', 'to-do', 'CODEX_TASK_legacy.md'),
      repoRoot: REPO,
      source: '# Legacy task TASK-050\n\nSin Status, sin zonas.'
    })

    expect(base.id).toBe('TASK-050')
    expect(signals.hasCanonicalFilename).toBe(false)
    expect(signals.hasStatus).toBe(false)
    expect(signals.hasTemplateShape).toBe(false)
    expect(base.parseWarnings).toContain('Falta el bloque ## Status')
    expect(base.parseWarnings).toContain('ID derivado del cuerpo; el filename no es canónico')
  })

  it('flags lifecycle/folder mismatch', () => {
    const source = TEMPLATE_TASK.replace('Lifecycle: `in-progress`', 'Lifecycle: `complete`')

    const { base } = parseWorkItem({
      kind: 'task',
      filePath: fixturePath('task', 'in-progress', 'TASK-999-sample-task.md'),
      repoRoot: REPO,
      source
    })

    expect(base.declaredLifecycle).toBe('complete')
    expect(base.lifecycle).toBe('in-progress')
    expect(base.parseWarnings.some(w => w.includes('Lifecycle declarado'))).toBe(true)
  })

  it('normaliza el Lifecycle declarado con notas parentéticas (no falso mismatch)', () => {
    const source = TEMPLATE_TASK.replace(
      'Lifecycle: `in-progress`',
      'Lifecycle: `to-do` (revertida 2026-05-05 — re-triage)'
    )

    const { base } = parseWorkItem({
      kind: 'task',
      filePath: fixturePath('task', 'to-do', 'TASK-999-sample-task.md'),
      repoRoot: REPO,
      source
    })

    expect(base.declaredLifecycle).toBe('to-do')
    expect(base.lifecycle).toBe('to-do')
    expect(base.parseWarnings.some(w => w.includes('Lifecycle declarado'))).toBe(false)
  })

  it('does not throw on malformed markdown', () => {
    expect(() =>
      parseWorkItem({
        kind: 'task',
        filePath: fixturePath('task', 'to-do', 'TASK-061-broken.md'),
        repoRoot: REPO,
        source: '## Status\n- Lifecycle without colon\n```\nunclosed code fence'
      })
    ).not.toThrow()
  })
})

describe('parseWorkItem — epic + mini_task', () => {
  it('parses an epic with Owner + Outcome', () => {
    const source = `# EPIC-007 — Sample epic\n\n## Status\n\n- Lifecycle: \`to-do\`\n- Priority: \`P1\`\n- Impact: \`Muy alto\`\n- Effort: \`Alto\`\n- Status real: \`Diseño\`\n- Domain: \`finance\`\n- Owner: \`unassigned\`\n\n## Summary\n\nEpic resumen.\n\n## Outcome\n\nResultado esperado.`

    const { base, signals } = parseWorkItem({
      kind: 'epic',
      filePath: fixturePath('epic', 'to-do', 'EPIC-007-sample-epic.md'),
      repoRoot: REPO,
      source
    })

    expect(base.id).toBe('EPIC-007')
    expect(base.domain).toBe('finance')
    expect(base.parentEpic).toBeNull()
    expect(base.goalPreview).toContain('Resultado esperado')
    expect(signals.hasCanonicalFilename).toBe(true)
    expect(signals.sectionKeys.has('outcome')).toBe(true)
  })

  it('parses a mini-task with Type + Proposed Change', () => {
    const source = `# MINI-003 — Sample mini\n\n## Status\n\n- Lifecycle: \`complete\`\n- Priority: \`P2\`\n- Impact: \`Medio\`\n- Effort: \`Bajo\`\n- Domain: \`finance\`\n- Type: \`mini-improvement\`\n\n## Summary\n\nMini resumen.\n\n## Proposed Change\n\nCambio propuesto.`

    const { base } = parseWorkItem({
      kind: 'mini_task',
      filePath: fixturePath('mini_task', 'complete', 'MINI-003-sample-mini.md'),
      repoRoot: REPO,
      source
    })

    expect(base.id).toBe('MINI-003')
    expect(base.lifecycle).toBe('complete')
    expect(base.type).toBe('mini-improvement')
    expect(base.goalPreview).toContain('Cambio propuesto')
  })
})

describe('parseWorkItem — issue (open/resolved, accent-tolerant)', () => {
  it('parses an open issue with accented headers', () => {
    const source = `# ISSUE-077 — Algo falló\n\n## Ambiente\n\nproduction + staging\n\n## Detectado\n\n2026-04-13, audit\n\n## Síntoma\n\nEl sistema rompe cuando TASK-300 corre.\n\n## Estado\n\nopen\n\n## Relacionado\n\nTASK-300, EPIC-009`

    const { base } = parseWorkItem({
      kind: 'issue',
      filePath: fixturePath('issue', 'open', 'ISSUE-077-algo-fallo.md'),
      repoRoot: REPO,
      source
    })

    expect(base.id).toBe('ISSUE-077')
    expect(base.lifecycle).toBe('open')
    expect(base.environment).toBe('production + staging')
    expect(base.detectedAt).toBe('2026-04-13')
    expect(base.summary).toContain('rompe')
    expect(base.relatedIds).toEqual(expect.arrayContaining(['TASK-300', 'EPIC-009']))
    expect(base.declaredLifecycle).toBe('open')
  })

  it('parses a resolved issue with accent-free headers', () => {
    const source = `# ISSUE-002 — Data integrity\n\n## Ambiente\n\nstaging\n\n## Detectado\n\n- Fecha: 2026-03-30\n\n## Sintoma\n\nFolio NULL.\n\n## Solucion aplicada\n\nFix aplicado el 2026-04-01.\n\n## Estado\n\nresolved`

    const { base } = parseWorkItem({
      kind: 'issue',
      filePath: fixturePath('issue', 'resolved', 'ISSUE-002-data-integrity.md'),
      repoRoot: REPO,
      source
    })

    expect(base.lifecycle).toBe('resolved')
    expect(base.summary).toContain('Folio NULL')
    expect(base.resolvedAt).toBe('2026-04-01')
  })
})
