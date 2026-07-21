import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(new URL('./rotate-handoff-context.mjs', import.meta.url))

test('bootstrap preserves the source and keeps the newest complete changelog entries', () => {
  const fixture = createFixture()

  try {
    const original = `# changelog.md

## 2026-07-19 — Entry A

- A

## 2026-07-18 — Entry B

- B

## 2026-07-20 — Entry C appended out of order

- C
`

    writeFileSync(path.join(fixture, 'changelog.md'), original)
    runRotation(fixture, '--apply', '--bootstrap-changelog', '--max-changelog-entries=2')

    const active = readFileSync(path.join(fixture, 'changelog.md'), 'utf8')
    const snapshot = readFileSync(path.join(fixture, 'docs/changelog/internal/legacy/changelog.pre-window.md'), 'utf8')

    const manifest = JSON.parse(
      readFileSync(path.join(fixture, 'docs/changelog/internal/legacy/manifest.json'), 'utf8')
    )

    assert.equal(snapshot, original)
    assert.equal(manifest.files[0].sha256, createHash('sha256').update(original).digest('hex'))
    assert.match(active, /Entry C appended out of order/)
    assert.match(active, /Entry A/)
    assert.doesNotMatch(active, /Entry B/)

    const next = active.replace(/## 2026-07-20/, '## 2026-07-21 — Entry D\n\n- D\n\n## 2026-07-20')

    writeFileSync(path.join(fixture, 'changelog.md'), next)
    runRotation(fixture, '--apply', '--max-changelog-entries=2')

    const rotated = readFileSync(path.join(fixture, 'changelog.md'), 'utf8')
    const shardPath = path.join(fixture, 'docs/changelog/internal/2026-07.md')
    const shard = readFileSync(shardPath, 'utf8')
    const index = readFileSync(path.join(fixture, 'docs/changelog/internal/README.md'), 'utf8')

    assert.match(rotated, /Entry D/)
    assert.match(rotated, /Entry C appended out of order/)
    assert.doesNotMatch(rotated, /Entry A/)
    assert.match(shard, /changelog-entry-sha256:[a-f0-9]{64}/)
    assert.match(shard, /Entry A/)
    assert.match(index, /\[2026-07\]\(2026-07\.md\)/)

    const beforeIdempotencyCheck = `${rotated}\n${shard}\n${index}`

    runRotation(fixture, '--apply', '--max-changelog-entries=2')

    assert.equal(
      `${readFileSync(path.join(fixture, 'changelog.md'), 'utf8')}\n${readFileSync(shardPath, 'utf8')}\n${readFileSync(path.join(fixture, 'docs/changelog/internal/README.md'), 'utf8')}`,
      beforeIdempotencyCheck
    )
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

function createFixture() {
  const fixture = mkdtempSync(path.join(os.tmpdir(), 'greenhouse-changelog-rotation-'))

  writeFileSync(path.join(fixture, 'Handoff.md'), '# Handoff\n')
  writeFileSync(
    path.join(fixture, 'Handoff.archive.md'),
    '# Handoff archive\n\nNo volver a pegar historia completa en este índice.\n'
  )

  return fixture
}

function runRotation(fixture, ...args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: fixture,
    encoding: 'utf8'
  })

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
}
