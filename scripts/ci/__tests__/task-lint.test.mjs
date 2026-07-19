import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { lintTasks } from '../task-lint.mjs'
import { deriveNextTaskId, parseReadmeNextId, parseTaskIdRegistry, parseTaskMarkdown } from '../task-lint/parser.mjs'

const write = (path, source) => writeFileSync(path, source, 'utf8')

const taskFixture = ({
  lifecycle = 'to-do',
  id = 'TASK-999',
  title = 'fixture task',
  domain = 'ops',
  executionProfile = 'standard',
  uiImpact = 'none',
  uiReady = 'n/a',
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
- UI ready: \`${uiReady}\`
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

const modularPlacementContract = ({
  topologyImpact = 'none',
  currentHome = 'scripts/ci/**',
  futureCandidateHome = 'remain-shared',
  boundary = 'task lint contract consumed by authoring tools',
  serverBrowserSplit = 'n/a — tooling only',
  buildImpact = 'none',
  extractionBlocker = 'none'
} = {}) =>
  [
    '## Modular Placement Contract',
    '',
    `- Topology impact: \`${topologyImpact}\``,
    `- Current home: \`${currentHome}\``,
    `- Future candidate home: \`${futureCandidateHome}\``,
    `- Boundary: \`${boundary}\``,
    `- Server/browser split: \`${serverBrowserSplit}\``,
    `- Build impact: \`${buildImpact}\``,
    `- Extraction blocker: \`${extractionBlocker}\``
  ].join('\n')

const withModularPlacementContract = (source, contract = modularPlacementContract()) =>
  source.replace('<!-- ZONE 2 — PLAN MODE -->', `${contract}\n\n<!-- ZONE 2 — PLAN MODE -->`)

const createRepo = () => {
  const root = mkdtempSync(join(tmpdir(), 'task-lint-'))

  mkdirSync(join(root, 'docs', 'tasks', 'to-do'), { recursive: true })
  mkdirSync(join(root, 'docs', 'tasks', 'in-progress'), { recursive: true })
  mkdirSync(join(root, 'docs', 'tasks', 'complete'), { recursive: true })
  mkdirSync(join(root, 'docs', 'ui', 'wireframes'), { recursive: true })
  mkdirSync(join(root, 'docs', 'ui', 'flows'), { recursive: true })
  mkdirSync(join(root, 'docs', 'ui', 'motion'), { recursive: true })
  mkdirSync(join(root, 'docs', 'ui', 'visual-directions'), { recursive: true })

  write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-1000`\n')
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

const premiumUiContract = [
  '## UI/UX Contract',
  '',
  '### Experience brief',
  '',
  '- UI rigor: `ui-standard`',
  '- Usuario / rol: operator using an operational surface.',
  '',
  '### Implementation mapping',
  '',
  '- Route / surface: `/fixture`.',
  '- Primitive / variant / kind: existing composition shell and selection list.',
  '',
  '### GVC scenario plan',
  '',
  '- Scenario file: `scripts/frontend/scenarios/fixture.scenario.ts`.',
  '- Quality profile: `premium`.',
  '- Viewports: desktop 1440x1000 and mobile 390x844.',
  '',
  '### Design decision log',
  '',
  '- Decision: use the operational recipe and preserve one primary action.'
].join('\n')

const premiumWireframe = [
  '# TASK-1453 Fixture Wireframe',
  '',
  '## Meta',
  '',
  '- Product Design asset: `docs/ui/visual-directions/TASK-1453-fixture-direction.md`',
  '- Visual direction mode: `repo-native-benchmark`',
  '',
  '## Desktop Target — 1440x1000',
  '',
  'The first fold uses a primary inventory and contextual detail with a single dominant decision.',
  '',
  '## Mobile Target — 390x844',
  '',
  'The inventory stacks before contextual detail and preserves the primary datum without page overflow.',
  '',
  '## Action Hierarchy',
  '',
  'One contained primary action owns the decision context; secondary and destructive actions remain distinct.',
  '',
  '## Visual Fidelity Mapping',
  '',
  'Quiet depth maps to AXIS surfaces; editorial hierarchy maps to Geist variants and canonical spacing.',
  '',
  '## Copy Ledger',
  '',
  '| id | region | text |',
  '|---|---|---|',
  '| fixture.title | header | Governed fixture surface |',
  '',
  '## State Copy',
  '',
  '| state | title | recovery |',
  '|---|---|---|',
  '| ready | Evidence ready | Continue |',
  '| loading | Loading evidence | Wait |',
  '| empty | No evidence yet | Adjust filters |',
  '| partial | Evidence delayed | Retry evidence |',
  '| error | Evidence unavailable | Retry |',
  '| denied | Access required | Request access |',
  '',
  '## Accessibility Contract',
  '',
  'Heading order, focus restoration, keyboard selection and color-independent state labels are explicit.',
  '',
  '## Implementation Mapping',
  '',
  'The route uses CompositionShell and an existing selection primitive with canonical copy and no business logic.',
  '',
  '## GVC Scenario Plan',
  '',
  '- Quality profile: `premium`.',
  '- Viewports: desktop 1440x1000 and mobile 390x844.',
  '- Review dossier: required after capture.',
  '- Baseline: repo-native baseline after direction acceptance.',
  '- Scroll-width checks: desktop and mobile.',
  '',
  '## Design Decision Log',
  '',
  'Selected the operational recipe over a dashboard card grid because ownership between list and detail is primary.'
].join('\n')

const premiumDirection = [
  '# TASK-1453 Fixture Direction',
  '',
  '## Decision',
  '',
  'Select a quiet command-center direction with editorial hierarchy and one dominant decision.',
  '',
  '## Desktop target',
  '',
  'A balanced first fold separates inventory, context and commands without nested card wallpaper.',
  '',
  '## Mobile target',
  '',
  'The composition becomes one narrative column and keeps the contextual action reachable.',
  '',
  '## Token mapping',
  '',
  'Color, type, spacing, geometry and motion map to AXIS, Geist and canonical theme tokens.',
  '',
  '## Anti-patterns',
  '',
  'Reject generic KPI card grids, equal-weight actions, raw blue borders and compressed desktop layouts.'
].join('\n')

const cases = [
  {
    name: 'accepts the extraction-ready contract for post-adoption tasks',
    run: () => {
      const root = createRepo()
      const id = 'TASK-1377'

      write(
        join(root, 'docs', 'tasks', 'TASK_ID_REGISTRY.md'),
        `# Registry\n\n| Task ID | Lifecycle | Brief | File |\n| --- | --- | --- | --- |\n| \`${id}\` | \`to-do\` | Fixture. | \`docs/tasks/to-do/${id}-fixture.md\` |\n`
      )
      write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-1378`\n')
      write(join(root, 'docs', 'tasks', 'to-do', `${id}-fixture.md`), withModularPlacementContract(taskFixture({ id })))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: id } })

      assert.equal(
        result.errors.some(item => item.rule === 'modular-placement-contract'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'errors when a post-adoption task omits the modular placement contract',
    run: () => {
      const root = createRepo()
      const id = 'TASK-1377'

      write(
        join(root, 'docs', 'tasks', 'TASK_ID_REGISTRY.md'),
        `# Registry\n\n| Task ID | Lifecycle | Brief | File |\n| --- | --- | --- | --- |\n| \`${id}\` | \`to-do\` | Fixture. | \`docs/tasks/to-do/${id}-fixture.md\` |\n`
      )
      write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-1378`\n')
      write(join(root, 'docs', 'tasks', 'to-do', `${id}-fixture.md`), taskFixture({ id }))

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: id } })

      assert.equal(
        result.errors.some(item => item.rule === 'modular-placement-contract'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'errors on invalid modular placement enums and placeholders',
    run: () => {
      const root = createRepo()
      const id = 'TASK-1377'

      write(
        join(root, 'docs', 'tasks', 'TASK_ID_REGISTRY.md'),
        `# Registry\n\n| Task ID | Lifecycle | Brief | File |\n| --- | --- | --- | --- |\n| \`${id}\` | \`to-do\` | Fixture. | \`docs/tasks/to-do/${id}-fixture.md\` |\n`
      )
      write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-1378`\n')
      write(
        join(root, 'docs', 'tasks', 'to-do', `${id}-fixture.md`),
        withModularPlacementContract(
          taskFixture({ id }),
          modularPlacementContract({
            topologyImpact: 'microservice',
            currentHome: '[path/runtime real donde se construye ahora]',
            futureCandidateHome: 'new-repo'
          })
        )
      )

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: id } })
      const modularErrors = result.errors.filter(item => item.rule === 'modular-placement-contract')

      assert.equal(modularErrors.length >= 3, true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'does not retroactively require modular placement on pre-adoption tasks',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture())

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'modular-placement-contract'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
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

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-1000' }
      })

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

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

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

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-998' }
      })

      assert.equal(result.errors.length, 0)
      assert.equal(
        result.warnings.some(item => item.rule === 'registry-parity'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when README next-id marker drifts from registry max + 1',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture())
      write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-999`\n')

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.warnings.some(item => item.rule === 'next-id-marker'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'reports JSON-compatible summary shape',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'), taskFixture())

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

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
      write(
        join(root, 'docs', 'tasks', 'complete', 'TASK-998-fixture.md'),
        taskFixture({ lifecycle: 'complete', id: 'TASK-998' })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, active: true, task: null }
      })

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

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, active: true, task: null }
      })

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

      write(
        join(root, 'docs', 'tasks', 'complete', 'TASK-998-fixture.md'),
        taskFixture({ lifecycle: 'complete', id: 'TASK-998' })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, active: false, task: null }
      })

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

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, active: false, task: null }
      })

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

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'layout',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md'
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(result.errors.length, 0)
      assert.equal(
        result.warnings.some(item => item.rule === 'ui-ux-contract'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when a UI task omits the UI readiness field',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'layout',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md'
        }).replace('- UI ready: `n/a`\n', '')
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.warnings.some(item => item.rule === 'ui-readiness-gate'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'errors when the UI readiness field has an invalid value',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'layout',
          uiReady: 'maybe',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md'
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-readiness-gate'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'requires implementation mapping, GVC plan and decision log before UI ready yes',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'layout',
          uiReady: 'yes',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          uiUxContract: [
            '## UI/UX Contract',
            '',
            '### Experience brief',
            '',
            '- UI rigor: `ui-standard`',
            '- Usuario / rol: operador interno'
          ].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-readiness-gate'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts UI ready yes when mapping, GVC plan and decision log are present',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'ui', 'wireframes', 'TASK-999-fixture.md'),
        [
          '# TASK-999 Fixture Wireframe',
          '',
          '## Implementation Mapping',
          '',
          '- Primitive: existing.',
          '',
          '## GVC Scenario Plan',
          '',
          '- Scenario: fixture.',
          '',
          '## Design Decision Log',
          '',
          '- Decision: reuse existing primitive.'
        ].join('\n')
      )
      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'layout',
          uiReady: 'yes',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          uiUxContract: [
            '## UI/UX Contract',
            '',
            '### Experience brief',
            '',
            '- UI rigor: `ui-standard`',
            '',
            '### Implementation mapping',
            '',
            '- Primitive: existing.',
            '',
            '### GVC scenario plan',
            '',
            '- Scenario: fixture.',
            '',
            '### Design decision log',
            '',
            '- Decision: reuse existing primitive.'
          ].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-readiness-gate'),
        false
      )
      assert.equal(
        result.warnings.some(item => item.rule === 'ui-readiness-gate'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a UI task with the UI/UX contract',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
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
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.warnings.some(item => item.rule === 'ui-ux-contract'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when a backend/data task is missing the Backend/Data contract',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'data|reliability',
          executionProfile: 'backend-data',
          backendImpact: 'migration'
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(result.errors.length, 0)
      assert.equal(
        result.warnings.some(item => item.rule === 'backend-data-contract'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a backend/data task with the Backend/Data contract',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
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
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.warnings.some(item => item.rule === 'backend-data-contract'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when an active hybrid UI/backend task is missing justification',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
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
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(result.errors.length, 0)
      assert.equal(
        result.warnings.some(item => item.rule === 'hybrid-profile-justification'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts an active hybrid UI/backend task with justification',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
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
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.warnings.some(item => item.rule === 'hybrid-profile-justification'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'does not warn for non-hybrid profile tasks',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'layout',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          backendImpact: 'none',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.warnings.some(item => item.rule === 'hybrid-profile-justification'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'does not warn for completed hybrid historical tasks',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'complete', 'TASK-999-fixture.md'),
        taskFixture({
          lifecycle: 'complete',
          domain: 'ui|api',
          executionProfile: 'backend-data',
          uiImpact: 'flow',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          flow: 'docs/ui/flows/TASK-999-fixture-flow.md',
          backendImpact: 'api',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n'),
          backendDataContract: [
            '## Backend/Data Contract',
            '',
            '### Backend/data brief',
            '',
            '- Backend rigor: `backend-standard`'
          ].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.warnings.some(item => item.rule === 'hybrid-profile-justification'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'errors when a UI task is missing the wireframe contract in focal mode',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'layout',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-wireframe-contract'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'keeps missing UI wireframes warning-only in active inventory mode',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'layout',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, active: true, task: null }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-wireframe-contract'),
        false
      )
      assert.equal(
        result.warnings.some(item => item.rule === 'ui-wireframe-contract'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a UI task with a docs/ui/wireframes path',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'layout',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-wireframe-contract'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'errors when a flow UI task is missing the flow contract in focal mode',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'flow',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-flow-contract'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a flow UI task with a docs/ui/flows path',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'flow',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          flow: 'docs/ui/flows/TASK-999-fixture-flow.md',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-flow-contract'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when a non-flow UI task mentions a sidecar but Flow is none',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'interaction',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        }).replace(
          '## Detailed Spec\n\nFixture.',
          '## Detailed Spec\n\nOpen a sidecar from the selected row and restore focus on close.'
        )
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-flow-contract'),
        false
      )
      assert.equal(
        result.warnings.some(item => item.rule === 'ui-flow-contract'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'errors when a motion UI task is missing the motion contract in focal mode',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|motion',
          executionProfile: 'ui-ux',
          uiImpact: 'motion',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-motion-contract'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a motion UI task with a docs/ui/motion path',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|motion',
          executionProfile: 'ui-ux',
          uiImpact: 'motion',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          motion: 'docs/ui/motion/TASK-999-fixture-motion.md',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        })
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-motion-contract'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'warns when a non-motion UI task mentions non-trivial animation but Motion is none',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-999-fixture.md'),
        taskFixture({
          domain: 'ui|platform',
          executionProfile: 'ui-ux',
          uiImpact: 'interaction',
          wireframe: 'docs/ui/wireframes/TASK-999-fixture.md',
          uiUxContract: ['## UI/UX Contract', '', '### Experience brief', '', '- UI rigor: `ui-standard`'].join('\n')
        }).replace(
          '## Detailed Spec\n\nFixture.',
          '## Detailed Spec\n\nUse a short framer transition when the selected card changes.'
        )
      )

      const result = lintTasks({
        repoRoot: root,
        options: { format: 'json', strict: false, changed: false, task: 'TASK-999' }
      })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-motion-contract'),
        false
      )
      assert.equal(
        result.warnings.some(item => item.rule === 'ui-motion-contract'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'blocks post-adoption UI ready when the visual direction contract is only headings',
    run: () => {
      const root = createRepo()
      const id = 'TASK-1453'

      write(
        join(root, 'docs', 'tasks', 'TASK_ID_REGISTRY.md'),
        [
          '# Registry',
          '',
          '| Task ID | Lifecycle | Brief | File |',
          '| --- | --- | --- | --- |',
          '| `TASK-1453` | `to-do` | Fixture. | `docs/tasks/to-do/TASK-1453-fixture.md` |'
        ].join('\n')
      )
      write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-1454`\n')
      write(
        join(root, 'docs', 'ui', 'wireframes', 'TASK-1453-fixture.md'),
        [
          '# Fixture',
          '',
          '## Meta',
          '',
          '- Product Design asset: `docs/ui/visual-directions/TASK-1453-fixture-direction.md`',
          '- Visual direction mode: `repo-native-benchmark`',
          '',
          '## Desktop Target',
          '## Mobile Target',
          '## Action Hierarchy',
          '## Visual Fidelity Mapping',
          '## Copy Ledger',
          '## State Copy',
          '## Accessibility Contract',
          '## Implementation Mapping',
          '## GVC Scenario Plan',
          '## Design Decision Log'
        ].join('\n')
      )
      write(join(root, 'docs', 'ui', 'visual-directions', 'TASK-1453-fixture-direction.md'), premiumDirection)
      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-1453-fixture.md'),
        withModularPlacementContract(
          taskFixture({
            id,
            domain: 'ui|platform',
            executionProfile: 'ui-ux',
            uiImpact: 'layout',
            uiReady: 'yes',
            wireframe: 'docs/ui/wireframes/TASK-1453-fixture.md',
            uiUxContract: premiumUiContract
          })
        )
      )

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: id } })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-premium-readiness'),
        true
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'accepts a substantive post-adoption premium readiness contract',
    run: () => {
      const root = createRepo()
      const id = 'TASK-1453'

      write(
        join(root, 'docs', 'tasks', 'TASK_ID_REGISTRY.md'),
        [
          '# Registry',
          '',
          '| Task ID | Lifecycle | Brief | File |',
          '| --- | --- | --- | --- |',
          '| `TASK-1453` | `to-do` | Fixture. | `docs/tasks/to-do/TASK-1453-fixture.md` |'
        ].join('\n')
      )
      write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-1454`\n')
      write(join(root, 'docs', 'ui', 'wireframes', 'TASK-1453-fixture.md'), premiumWireframe)
      write(join(root, 'docs', 'ui', 'visual-directions', 'TASK-1453-fixture-direction.md'), premiumDirection)
      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-1453-fixture.md'),
        withModularPlacementContract(
          taskFixture({
            id,
            domain: 'ui|platform',
            executionProfile: 'ui-ux',
            uiImpact: 'layout',
            uiReady: 'yes',
            wireframe: 'docs/ui/wireframes/TASK-1453-fixture.md',
            uiUxContract: premiumUiContract
          })
        )
      )

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: id } })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-premium-readiness'),
        false
      )
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'blocks premium readiness when a required state contract is missing',
    run: () => {
      const root = createRepo()
      const id = 'TASK-1453'

      write(
        join(root, 'docs', 'tasks', 'TASK_ID_REGISTRY.md'),
        [
          '# Registry',
          '',
          '| Task ID | Lifecycle | Brief | File |',
          '| --- | --- | --- | --- |',
          '| `TASK-1453` | `to-do` | Fixture. | `docs/tasks/to-do/TASK-1453-fixture.md` |'
        ].join('\n')
      )
      write(join(root, 'docs', 'tasks', 'README.md'), '# Task Index\n\n- siguiente ID disponible: `TASK-1454`\n')
      write(
        join(root, 'docs', 'ui', 'wireframes', 'TASK-1453-fixture.md'),
        premiumWireframe.replace('| denied | Access required | Request access |', '')
      )
      write(join(root, 'docs', 'ui', 'visual-directions', 'TASK-1453-fixture-direction.md'), premiumDirection)
      write(
        join(root, 'docs', 'tasks', 'to-do', 'TASK-1453-fixture.md'),
        withModularPlacementContract(
          taskFixture({
            id,
            domain: 'ui|platform',
            executionProfile: 'ui-ux',
            uiImpact: 'layout',
            uiReady: 'yes',
            wireframe: 'docs/ui/wireframes/TASK-1453-fixture.md',
            uiUxContract: premiumUiContract
          })
        )
      )

      const result = lintTasks({ repoRoot: root, options: { format: 'json', strict: false, changed: false, task: id } })

      assert.equal(
        result.errors.some(item => item.rule === 'ui-premium-readiness' && item.message.includes('denied')),
        true
      )
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
