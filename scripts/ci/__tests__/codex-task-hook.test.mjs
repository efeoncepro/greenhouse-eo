import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

const hook = fileURLToPath(new URL('../../codex-task-hook.mjs', import.meta.url))
const prompt = 'docs/operations/CODEX_EXECUTION_PROMPT_V1.md'
const activeTask = 'docs/tasks/to-do/TASK-032-active.md'
const legacyTask = 'docs/tasks/in-progress/nested/TASK-714d-legacy.md'
const cancelledTask = 'docs/tasks/cancelled/TASK-413-cancelled.md'

let fixtureRoot

before(() => {
  fixtureRoot = mkdtempSync(join(realpathSync(tmpdir()), 'codex-task-hook-'))
  mkdirSync(join(fixtureRoot, dirname(prompt)), { recursive: true })
  copyFileSync(new URL(`../../../${prompt}`, import.meta.url), join(fixtureRoot, prompt))

  writeFixture(activeTask, '# TASK-010 in an old reference\r\n\r\n## Status\r\n- Lifecycle: `to-do`\r\n- Blocked by: `none` (TASK-413 cerró)\r\n')
  writeFixture(
    'docs/tasks/to-do/TASK-514.1-decimal.md',
    '## Status\n- Lifecycle: `to-do`\n- Blocked by: `none`\n\n**Dependencia verificada:** TASK-414 cerró.\n'
  )
  writeFixture(legacyTask, '# Legacy task without a Status section\n')
  writeFixture(cancelledTask, '## Status\n- Lifecycle: `cancelled`\n')
  writeFixture('docs/tasks/complete/TASK-414-closed.md', '## Status\n- Lifecycle: `complete`\n')
  writeFixture('docs/tasks/to-do/TASK-415-blocked.md', '## Status\n- Lifecycle: `to-do`\n- Blocked by: esperar confirmación externa\n')
  writeFixture('docs/tasks/to-do/TASK-416-drift.md', '## Status\n- Lifecycle: `in-progress`\n')
  writeFixture('docs/tasks/to-do/TASK-417-duplicate.md', '# Duplicate\n')
  writeFixture('docs/tasks/in-progress/TASK-417-duplicate.md', '# Duplicate\n')
  writeFixture('docs/tasks/to-do/TASK-418-dependency.md', '## Status\n- Blocked by: `TASK-414`\n')
  writeFixture('docs/tasks/TASK_PROCESS.md', '# TASK-032 example\n')
  writeFixture('other/TASK-419-external.md', '# TASK-419\n')
  symlinkSync(join(fixtureRoot, 'other/TASK-419-external.md'), join(fixtureRoot, 'docs/tasks/to-do/TASK-419-link.md'))
})

after(() => {
  if (fixtureRoot) rmSync(fixtureRoot, { force: true, recursive: true })
})

test('resolves the exact task id and uses the same file for id, alias and path', () => {
  for (const ref of ['TASK-032', '032', '[TASK-032]', activeTask, join(fixtureRoot, activeTask)]) {
    const result = runHook(ref)

    assert.equal(result.status, 0, result.stderr)
    const output = JSON.parse(result.stdout)

    assert.equal(output.taskId, 'TASK-032')
    assert.equal(output.taskPath, activeTask)
    assert.equal(output.lifecycle, 'to-do')
    assert.match(output.prompt, /task \*\*TASK-032\*\*/)
    assert.equal(output.developOverride, false)
    assert.equal(output.subagentsAuthorized, false)
  }
})

test('retains decimal ids and historical suffixes, including nested tasks without Status', () => {
  for (const [ref, taskId] of [['514.1', 'TASK-514.1'], ['TASK-714d', 'TASK-714d'], [legacyTask, 'TASK-714d']]) {
    const result = runHook(ref)

    assert.equal(result.status, 0, result.stderr)
    assert.equal(JSON.parse(result.stdout).taskId, taskId)
  }
})

test('includes branch and subagent authorization only when requested', () => {
  const result = runHook('TASK-032', '--develop', '--subagents')

  assert.equal(result.status, 0, result.stderr)
  const output = JSON.parse(result.stdout)

  assert.equal(output.developOverride, true)
  assert.equal(output.subagentsAuthorized, true)
  assert.match(output.prompt, /\*\*mantente en develop, no cambies de rama\*\*/)
  assert.match(output.prompt, /\*\*subagentes autorizados\*\*/)
})

test('rejects invalid, inactive, blocked and ambiguous tasks without emitting a prompt', () => {
  const rejected = [
    ['prefix-TASK-032junk', /Invalid TASK ref/],
    ['docs/tasks/TASK_PROCESS.md', /Invalid TASK ref/],
    ['docs/tasks/to-do/TASK-032-stale-path.md', /No canonical task file/],
    ['other/TASK-419-external.md', /Invalid TASK ref/],
    ['docs/tasks/to-do/TASK-419-link.md', /No canonical task file/],
    ['TASK-413', /is cancelled/],
    [cancelledTask, /is cancelled/],
    ['TASK-414', /is complete/],
    ['TASK-415', /declares blockers: esperar confirmación externa/],
    ['TASK-416', /lifecycle conflicts/],
    ['TASK-417', /Multiple active task files/],
    ['docs/tasks/to-do/TASK-417-duplicate.md', /Multiple active task files/],
    ['TASK-418', /declares blockers: TASK-414/]
  ]

  for (const [ref, diagnostic] of rejected) {
    const result = runHook(ref)

    assert.equal(result.status, 1, ref)
    assert.equal(result.stdout, '', ref)
    assert.match(result.stderr, diagnostic, ref)
  }
})

function writeFixture(relativePath, source) {
  const filePath = join(fixtureRoot, relativePath)

  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, source)
}

function runHook(ref, ...flags) {
  return spawnSync(process.execPath, [hook, ref, '--json', ...flags], { cwd: fixtureRoot, encoding: 'utf8' })
}
