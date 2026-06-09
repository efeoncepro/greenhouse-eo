import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { lintTasks } from '../task-lint.mjs'
import {
  deriveNextTaskId,
  parseReadmeNextId,
  parseTaskIdRegistry,
  parseTaskMarkdown
} from '../task-lint/parser.mjs'

const write = (path, source) => writeFileSync(path, source, 'utf8')

const taskFixture = ({ lifecycle = 'to-do', id = 'TASK-999', title = 'fixture task' } = {}) => `# ${id} — ${title}

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: \`${lifecycle}\`
- Priority: \`P2\`
- Impact: \`Medio\`
- Effort: \`Medio\`
- Type: \`implementation\`
- Epic: \`none\`
- Status real: \`Diseno\`
- Rank: \`TBD\`
- Domain: \`ops\`
- Blocked by: \`TASK-100\`
  reason continues on a second line with \`inline code\`
  and a third line that should stay attached to Blocked by
- Branch: \`task/${id.toLowerCase()}-fixture\`
- Legacy ID: \`none\`
- GitHub Issue: \`none\`

## Summary

Fixture.

## Why This Task Exists

Fixture.

## Goal

- Validate parser.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- \`docs/tasks/TASK_TEMPLATE.md\`

## Normative Docs

- N/A.

## Dependencies & Impact

### Depends on

- none

### Blocks / Impacts

- none

### Files owned

- \`scripts/ci/task-lint.mjs\`

## Current Repo State

### Already exists

- Fixture.

### Gap

- Fixture.

<!-- ZONE 2 — PLAN MODE -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Fixture

- Build.

## Out of Scope

- Runtime.

## Detailed Spec

Fixture.

## Rollout Plan & Risk Matrix

N/A — additive repo-only tooling, no production runtime impact.

## Acceptance Criteria

- [ ] Lint passes.

## Verification

- \`pnpm task:lint\`

## Closing Protocol

- [ ] Close task.

<!-- ZONE 4 — VERIFICATION & CLOSING -->
`

const createRepo = () => {
  const root = mkdtempSync(join(tmpdir(), 'task-lint-'))

  mkdirSync(join(root, 'docs', 'tasks', 'to-do'), { recursive: true })
  mkdirSync(join(root, 'docs', 'tasks', 'in-progress'), { recursive: true })
  mkdirSync(join(root, 'docs', 'tasks', 'complete'), { recursive: true })

  write(
    join(root, 'docs', 'tasks', 'README.md'),
    '# Task Index\n\n- siguiente ID disponible: `TASK-1000`\n'
  )
  write(
    join(root, 'docs', 'tasks', 'TASK_ID_REGISTRY.md'),
    [
      '# Registry',
      '',
      '| Task ID | Lifecycle | Brief | File |',
      '| --- | --- | --- | --- |',
      '| `TASK-999` | `to-do` | Fixture. | `docs/tasks/to-do/TASK-999-fixture.md` |'
    ].join('\n')
  )

  return root
}

const cases = [
  {
    name: 'parses Status multiline fields without truncating the next field',
    run: () => {
      const source = taskFixture()

      const parsed = parseTaskMarkdown({
        filePath: 'docs/tasks/to-do/TASK-999-fixture.md',
        repoRoot: '',
        source
      })

      assert.equal(parsed.lifecycle, 'to-do')
      assert.match(parsed.status.fields['Blocked by'], /reason continues/)
      assert.match(parsed.status.fields['Blocked by'], /third line/)
      assert.equal(parsed.status.fields.Branch, 'task/task-999-fixture')
    }
  },
  {
    name: 'parses four-digit task ids as canonical template tasks',
    run: () => {
      const source = taskFixture({ id: 'TASK-1000' })

      const parsed = parseTaskMarkdown({
        filePath: 'docs/tasks/to-do/TASK-1000-fixture.md',
        repoRoot: '',
        source
      })

      assert.equal(parsed.id, 'TASK-1000')
      assert.equal(parsed.idNumber, 1000)
      assert.equal(parsed.kind, 'template')
    }
  },
  {
    name: 'keeps registry and next-id parsing valid after the task counter reaches four digits',
    run: () => {
      const registryRows = parseTaskIdRegistry(
        [
          '# Registry',
          '',
          '| Task ID | Lifecycle | Brief | File |',
          '| --- | --- | --- | --- |',
          '| `TASK-999` | `complete` | Fixture. | `docs/tasks/complete/TASK-999-fixture.md` |',
          '| `TASK-1000` | `to-do` | Fixture. | `docs/tasks/to-do/TASK-1000-fixture.md` |'
        ].join('\n')
      )

      const readmeNextId = parseReadmeNextId('# Task Index\n\n- siguiente ID disponible: `TASK-1001`\n')

      assert.equal(registryRows.has('TASK-1000'), true)
      assert.equal(deriveNextTaskId(registryRows), 'TASK-1001')
      assert.equal(readmeNextId.id, 'TASK-1001')
      assert.equal(readmeNextId.numeric, 1001)
    }
  },
  {
    name: 'task filter scans four-digit task ids',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'TASK_ID_REGISTRY.md'),
        [
          '# Registry',
          '',
          '| Task ID | Lifecycle | Brief | File |',
          '| --- | --- | --- | --- |',
          '| `TASK-1000` | `to-do` | Fixture. | `docs/tasks/to-do/TASK-1000-fixture.md` |'
        ].join('\n')
      )
      write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-1001`\n')
      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-1000-fixture.md'), taskFixture({ id: 'TASK-1000' }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-1000' } })

      assert.equal(result.summary.tasksScanned, 1)
      assert.equal(result.summary.templateTasks, 1)
      assert.equal(result.errors.length, 0)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'detects lifecycle-folder parity as an error',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'in-progress', 'TASK-999-fixture.md'), taskFixture())

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.length, 1)
      assert.equal(result.errors[0].rule, 'lifecycle-folder-parity')
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'keeps registry missing as warning-only in V1',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-998-fixture.md'), taskFixture({ id: 'TASK-998' }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-998' } })

      assert.equal(result.errors.length, 0)
      assert.equal(result.warnings.some(item => item.rule === 'registry-parity'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when README next-id marker drifts from registry max + 1',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture())
      write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-999`\n')

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.warnings.some(item => item.rule === 'next-id-marker'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'reports JSON-compatible summary shape',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture())

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.deepEqual(Object.keys(result).sort(), ['errors', 'summary', 'warnings'])
      assert.equal(result.summary.tasksScanned, 1)
      assert.equal(result.summary.templateTasks, 1)
      assert.equal(result.summary.legacyTasks, 0)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'active mode scans only to-do and in-progress tasks',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture())
      write(join(root, 'docs', 'tasks', 'complete', 'TASK-998-fixture.md'), taskFixture({ lifecycle: 'complete', id: 'TASK-998' }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, active: true, task: null } })

      assert.equal(result.summary.tasksScanned, 1)
      assert.equal(result.summary.active, true)
      assert.equal(result.summary.completedHistoricalTasks, 0)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'active mode exempts pre-adoption active backlog from debt findings',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-100-fixture.md'), taskFixture({ id: 'TASK-100' }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, active: true, task: null } })

      assert.equal(result.summary.tasksScanned, 1)
      assert.equal(result.summary.preAdoptionActiveTasks, 1)
      assert.equal(result.warnings.length, 0)
      assert.equal(result.errors.length, 0)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'default mode exempts completed historical tasks from debt findings',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'complete', 'TASK-998-fixture.md'), taskFixture({ lifecycle: 'complete', id: 'TASK-998' }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, active: false, task: null } })

      assert.equal(result.summary.tasksScanned, 1)
      assert.equal(result.summary.completedHistoricalTasks, 1)
      assert.equal(result.warnings.length, 0)
      assert.equal(result.errors.length, 0)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'default mode also exempts pre-adoption active backlog from global debt',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-100-fixture.md'), taskFixture({ id: 'TASK-100' }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, active: false, task: null } })

      assert.equal(result.summary.tasksScanned, 1)
      assert.equal(result.summary.preAdoptionActiveTasks, 1)
      assert.equal(result.warnings.length, 0)
      assert.equal(result.errors.length, 0)
      rmSync(root, { recursive: true, force: true })
    }
  }
]

let passed = 0
let failed = 0

for (const testCase of cases) {
  try {
    testCase.run()
    console.log(`  ✓ ${testCase.name}`)
    passed += 1
  } catch (error) {
    console.error(`  ✗ ${testCase.name}`)
    console.error(`    ${error.stack ?? error.message}`)
    failed += 1
  }
}

console.log(`\n[task-lint.test] ${passed}/${passed + failed} passed.`)

if (failed > 0) process.exit(1)
