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

const taskFixture = ({
  lifecycle = 'to-do',
  id = 'TASK-999',
  title = 'fixture task',
  domain = 'ops',
  executionProfile = 'standard',
  uiImpact = 'none',
  wireframe = 'none',
  flow = 'none',
  motion = 'none',
  uiUxContract = '',
  backendImpact = 'none',
  backendDataContract = '',
  hybridExecutionJustification = ''
} = {}) => `# ${id} — ${title}

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: \`${lifecycle}\`
- Priority: \`P2\`
- Impact: \`Medio\`
- Effort: \`Medio\`
- Type: \`implementation\`
- Execution profile: \`${executionProfile}\`
- UI impact: \`${uiImpact}\`
- Wireframe: \`${wireframe}\`
- Flow: \`${flow}\`
- Motion: \`${motion}\`
- Backend impact: \`${backendImpact}\`
- Epic: \`none\`
- Status real: \`Diseno\`
- Rank: \`TBD\`
- Domain: \`${domain}\`
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

${uiUxContract}
${backendDataContract}
${hybridExecutionJustification}

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
  mkdirSync(join(root, 'docs', 'ui', 'wireframes'), { recursive: true })
  mkdirSync(join(root, 'docs', 'ui', 'flows'), { recursive: true })
  mkdirSync(join(root, 'docs', 'ui', 'motion'), { recursive: true })

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
  write(join(root, 'docs', 'ui', 'wireframes', 'TASK-999-fixture.md'), '# TASK-999 Fixture Wireframe\n')
  write(join(root, 'docs', 'ui', 'flows', 'TASK-999-fixture-flow.md'), '# TASK-999 Fixture Flow\n')
  write(join(root, 'docs', 'ui', 'motion', 'TASK-999-fixture-motion.md'), '# TASK-999 Fixture Motion\n')

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
  },
  {
    name: 'warns when a UI task is missing the UI/UX contract',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'layout',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md'
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.length, 0)
      assert.equal(result.warnings.some(item => item.rule === 'ui-ux-contract'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a UI task with the UI/UX contract',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'interaction',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`',
          '- Usuario / rol: operador interno'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.warnings.some(item => item.rule === 'ui-ux-contract'), false)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when a backend/data task is missing the Backend/Data contract',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'data|reliability',
        executionProfile: 'backend-data',
        backendImpact: 'migration'
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.length, 0)
      assert.equal(result.warnings.some(item => item.rule === 'backend-data-contract'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a backend/data task with the Backend/Data contract',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'api|data',
        executionProfile: 'backend-data',
        backendImpact: 'api',
        backendDataContract: [
          '## Backend/Data Contract',
          '',
          '### Backend/data brief',
          '',
          '- Backend rigor: `backend-standard`',
          '- Impacto principal: `api`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.warnings.some(item => item.rule === 'backend-data-contract'), false)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when an active hybrid UI/backend task is missing justification',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|api',
        executionProfile: 'backend-data',
        uiImpact: 'flow',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        flow: 'docs/ui/flows/TASK-999-fixture-flow.md',
        backendImpact: 'api',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`',
          '- Usuario / rol: operador interno'
        ].join('\n'),
        backendDataContract: [
          '## Backend/Data Contract',
          '',
          '### Backend/data brief',
          '',
          '- Backend rigor: `backend-standard`',
          '- Impacto principal: `api`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.length, 0)
      assert.equal(result.warnings.some(item => item.rule === 'hybrid-profile-justification'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts an active hybrid UI/backend task with justification',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|api',
        executionProfile: 'backend-data',
        uiImpact: 'flow',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        flow: 'docs/ui/flows/TASK-999-fixture-flow.md',
        backendImpact: 'api',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`',
          '- Usuario / rol: operador interno'
        ].join('\n'),
        backendDataContract: [
          '## Backend/Data Contract',
          '',
          '### Backend/data brief',
          '',
          '- Backend rigor: `backend-standard`',
          '- Impacto principal: `api`'
        ].join('\n'),
        hybridExecutionJustification: [
          '## Hybrid Execution Justification',
          '',
          '- Why not split: small vertical change on an existing contract.',
          '- Primary execution profile: backend-data.',
          '- Contract boundary: existing reader DTO.',
          '- Risk controls: focal tests and no migration.'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.warnings.some(item => item.rule === 'hybrid-profile-justification'), false)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'does not warn for non-hybrid profile tasks',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'layout',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        backendImpact: 'none',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.warnings.some(item => item.rule === 'hybrid-profile-justification'), false)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'does not warn for completed hybrid historical tasks',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'complete', 'TASK-999-fixture.md'), taskFixture({
        lifecycle: 'complete',
        domain: 'ui|api',
        executionProfile: 'backend-data',
        uiImpact: 'flow',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        flow: 'docs/ui/flows/TASK-999-fixture-flow.md',
        backendImpact: 'api',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n'),
        backendDataContract: [
          '## Backend/Data Contract',
          '',
          '### Backend/data brief',
          '',
          '- Backend rigor: `backend-standard`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.warnings.some(item => item.rule === 'hybrid-profile-justification'), false)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'errors when a UI task is missing the wireframe contract in focal mode',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'layout',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.some(item => item.rule === 'ui-wireframe-contract'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'keeps missing UI wireframes warning-only in active inventory mode',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'layout',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, active: true, task: null } })

      assert.equal(result.errors.some(item => item.rule === 'ui-wireframe-contract'), false)
      assert.equal(result.warnings.some(item => item.rule === 'ui-wireframe-contract'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a UI task with a docs/ui/wireframes path',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'layout',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.some(item => item.rule === 'ui-wireframe-contract'), false)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'errors when a flow UI task is missing the flow contract in focal mode',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'flow',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.some(item => item.rule === 'ui-flow-contract'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a flow UI task with a docs/ui/flows path',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'flow',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        flow: 'docs/ui/flows/TASK-999-fixture-flow.md',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.some(item => item.rule === 'ui-flow-contract'), false)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when a non-flow UI task mentions a sidecar but Flow is none',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'interaction',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }).replace('## Detailed Spec\n\nFixture.', '## Detailed Spec\n\nOpen a sidecar from the selected row and restore focus on close.'))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.some(item => item.rule === 'ui-flow-contract'), false)
      assert.equal(result.warnings.some(item => item.rule === 'ui-flow-contract'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'errors when a motion UI task is missing the motion contract in focal mode',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|motion',
        executionProfile: 'ui-ux',
        uiImpact: 'motion',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.some(item => item.rule === 'ui-motion-contract'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a motion UI task with a docs/ui/motion path',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|motion',
        executionProfile: 'ui-ux',
        uiImpact: 'motion',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        motion: 'docs/ui/motion/TASK-999-fixture-motion.md',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.some(item => item.rule === 'ui-motion-contract'), false)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when a non-motion UI task mentions non-trivial animation but Motion is none',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture({
        domain: 'ui|platform',
        executionProfile: 'ui-ux',
        uiImpact: 'interaction',
        wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
        uiUxContract: [
          '## UI/UX Contract',
          '',
          '### Experience brief',
          '',
          '- UI rigor: `ui-standard`'
        ].join('\n')
      }).replace('## Detailed Spec\n\nFixture.', '## Detailed Spec\n\nUse a short framer transition when the selected card changes.'))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: 'TASK-999' } })

      assert.equal(result.errors.some(item => item.rule === 'ui-motion-contract'), false)
      assert.equal(result.warnings.some(item => item.rule === 'ui-motion-contract'), true)
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
