import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { lintOperationalArtifacts } from '../ops-artifact-lint.mjs'

const write = (path, source) => writeFileSync(path, source, 'utf8')

const epicFixture = ({ lifecycle = 'to-do', id = 'EPIC-018' } = {}) => `# ${id} — Fixture Epic

## Status

- Lifecycle: \`${lifecycle}\`
- Priority: \`P1\`
- Impact: \`Muy alto\`
- Effort: \`Alto\`
- Status real: \`Diseno\`
- Rank: \`TBD\`
- Domain: \`platform\`
- Owner: \`unassigned\`
- Branch: \`epic/${id.toLowerCase()}-fixture\`
- GitHub Issue: \`none\`

## Summary

Fixture.

## Why This Epic Exists

Fixture.

## Outcome

- Outcome.

## Architecture Alignment

- \`docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md\`

## Child Tasks

- \`TASK-1000\` — fixture child.

## Existing Related Work

- none

## Exit Criteria

- [ ] Closed.

## Non-goals

- none
`

const miniFixture = ({ lifecycle = 'to-do', id = 'MINI-005' } = {}) => `# ${id} — Fixture Mini

## Status

- Lifecycle: \`${lifecycle}\`
- Priority: \`P2\`
- Impact: \`Medio\`
- Effort: \`Bajo\`
- Domain: \`ui\`
- Type: \`mini-improvement\`
- Branch: \`mini/${id.toLowerCase()}-fixture\`
- Related Task: \`none\`
- Related Issue: \`none\`

## Summary

Fixture.

## Why Mini

Fixture.

## Current State

- Current.

## Proposed Change

- Change.

## Acceptance Criteria

- [ ] Accepted.

## Verification

- Manual.

## Notes

- none

## Follow-ups

- none
`

const createRepo = () => {
  const root = mkdtempSync(join(tmpdir(), 'ops-artifact-lint-'))

  for (const dir of [
    'docs/epics/to-do',
    'docs/epics/in-progress',
    'docs/epics/complete',
    'docs/mini-tasks/to-do',
    'docs/mini-tasks/in-progress',
    'docs/mini-tasks/complete'
  ]) {
    mkdirSync(join(root, dir), { recursive: true })
  }

  write(
    join(root, 'docs', 'epics', 'EPIC_ID_REGISTRY.md'),
    [
      '# Registry',
      '',
      '| Epic ID | Lifecycle actual | Archivo actual |',
      '| --- | --- | --- |',
      '| `EPIC-018` | `to-do` | `docs/epics/to-do/EPIC-018-fixture.md` |',
      '',
      '## Siguiente ID disponible',
      '',
      '- `EPIC-019`'
    ].join('\n')
  )
  write(join(root, 'docs', 'epics', 'README.md'), '# Epic Index\n\n- siguiente ID disponible: `EPIC-019`\n')

  write(
    join(root, 'docs', 'mini-tasks', 'MINI_TASK_ID_REGISTRY.md'),
    [
      '# Registry',
      '',
      '- `MINI-005` asignado',
      '- siguiente ID disponible: `MINI-006`'
    ].join('\n')
  )
  write(join(root, 'docs', 'mini-tasks', 'README.md'), '# Mini Index\n\n`MINI-006`\n')

  return root
}

const cases = [
  {
    name: 'epic lint accepts a canonical epic fixture',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'epics', 'to-do', 'EPIC-018-fixture.md'), epicFixture())

      const result = lintOperationalArtifacts({
        repoRoot: root,
        options: { kind: 'epic', format: 'json', strict: false, changed: false, active: false, item: 'EPIC-018' }
      })

      assert.equal(result.summary.artifactsScanned, 1)
      assert.equal(result.summary.canonicalArtifacts, 1)
      assert.equal(result.errors.length, 0)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'epic lint catches lifecycle-folder drift',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'epics', 'in-progress', 'EPIC-018-fixture.md'), epicFixture())

      const result = lintOperationalArtifacts({
        repoRoot: root,
        options: { kind: 'epic', format: 'json', strict: false, changed: false, active: false, item: 'EPIC-018' }
      })

      assert.equal(result.errors.some(item => item.rule === 'lifecycle-folder-parity'), true)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'active epic lint exempts pre-adoption backlog from debt findings',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'epics', 'to-do', 'EPIC-001-fixture.md'),
        epicFixture({ id: 'EPIC-001' }).replace('## Non-goals\n\n- none', '')
      )

      const result = lintOperationalArtifacts({
        repoRoot: root,
        options: { kind: 'epic', format: 'json', strict: false, changed: false, active: true, item: null }
      })

      assert.equal(result.summary.artifactsScanned, 1)
      assert.equal(result.summary.preAdoptionActiveArtifacts, 1)
      assert.equal(result.errors.length, 0)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'mini lint accepts a canonical mini-task fixture',
    run: () => {
      const root = createRepo()

      write(join(root, 'docs', 'mini-tasks', 'to-do', 'MINI-005-fixture.md'), miniFixture())

      const result = lintOperationalArtifacts({
        repoRoot: root,
        options: { kind: 'mini', format: 'json', strict: false, changed: false, active: false, item: 'MINI-005' }
      })

      assert.equal(result.summary.artifactsScanned, 1)
      assert.equal(result.summary.canonicalArtifacts, 1)
      assert.equal(result.errors.length, 0)
      rmSync(root, { recursive: true, force: true })
    }
  },
  {
    name: 'mini lint requires acceptance checkboxes',
    run: () => {
      const root = createRepo()

      write(
        join(root, 'docs', 'mini-tasks', 'to-do', 'MINI-005-fixture.md'),
        miniFixture().replace('- [ ] Accepted.', '- Accepted.')
      )

      const result = lintOperationalArtifacts({
        repoRoot: root,
        options: { kind: 'mini', format: 'json', strict: false, changed: false, active: false, item: 'MINI-005' }
      })

      assert.equal(result.errors.some(item => item.rule === 'required-checkboxes'), true)
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

console.log(`\n[ops-artifact-lint.test] ${passed}/${passed + failed} passed.`)

if (failed > 0) process.exit(1)
