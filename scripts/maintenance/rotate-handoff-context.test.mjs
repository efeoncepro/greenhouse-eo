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

/*
 * Guarda contra el drift que dejó la rotación del Handoff muerta sin que nadie lo viera.
 *
 * El patrón original exigía que el heading empezara con la palabra «Sesión», pero la convención real del
 * archivo son headings TEMÁTICOS con su fecha (`## ISSUE-137 — … (2026-08-04)`). Resultado: 1 de 40
 * secciones matcheaban, la rotación reportaba «nada que archivar» y el gate estricto seguía pidiendo
 * correr justo ese comando. Sobrevivió porque el único test cubría el camino del changelog y el fixture
 * escribía un `Handoff.md` de una línea, así que este camino NUNCA se ejercitaba.
 */
test('rotates handoff sessions by their date, whatever the heading calls them', () => {
  const fixture = createFixture()

  try {
    writeFileSync(
      path.join(fixture, 'changelog.md'),
      '# changelog.md\n\n## 2026-08-04 — Solo para que la rotación de changelog tenga entrada válida\n\n- x\n'
    )

    writeFileSync(
      path.join(fixture, 'Handoff.md'),
      `# Handoff activo

Historia anterior: [Handoff.archive.md](Handoff.archive.md).

## ISSUE-137 — la más nueva, con la convención temática (2026-08-04)

- nueva

## TASK-1469 — intermedia, también temática (2026-08-03)

- intermedia

## 2026-07-30 — la más vieja, con la fecha al principio

- vieja

## Sesión 2026-07-29 — la convención legacy, que también debe contar

- legacy
`
    )

    runRotation(fixture, '--apply', '--max-sessions=2')

    const active = readFileSync(path.join(fixture, 'Handoff.md'), 'utf8')
    const archived = readFileSync(path.join(fixture, 'docs/operations/agent-context-history/handoff/2026-07.md'), 'utf8')
    const index = readFileSync(path.join(fixture, 'Handoff.archive.md'), 'utf8')

    // Se conservan las dos más nuevas por FECHA, no por orden de aparición ni por el texto del heading.
    assert.match(active, /ISSUE-137 — la más nueva/)
    assert.match(active, /TASK-1469 — intermedia/)
    assert.doesNotMatch(active, /la más vieja/)
    assert.doesNotMatch(active, /convención legacy/)

    // El preámbulo sobrevive: es lo que va antes del primer heading de sesión.
    assert.match(active, /^# Handoff activo/)

    // Nada se borra: lo archivado queda en su shard y enlazado desde el índice.
    assert.match(archived, /la más vieja/)
    assert.match(archived, /convención legacy/)
    assert.match(index, /2026-07\.md/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('rotates handoff by line budget even when the session count is within budget', () => {
  const fixture = createFixture()

  try {
    writeFileSync(
      path.join(fixture, 'changelog.md'),
      '# changelog.md\n\n## 2026-08-05 — Solo para que la rotación de changelog tenga entrada válida\n\n- x\n'
    )

    writeFileSync(
      path.join(fixture, 'Handoff.md'),
      `# Handoff activo

Historia anterior: [Handoff.archive.md](Handoff.archive.md).

## Sesión 2026-08-05 — reciente

- línea 1
- línea 2
- línea 3

## Sesión 2026-08-04 — intermedia

- línea 1
- línea 2
- línea 3

## Sesión 2026-08-03 — antigua

- línea 1
- línea 2
- línea 3
`
    )

    runRotation(fixture, '--apply', '--max-sessions=3', '--max-handoff-lines=14')

    const active = readFileSync(path.join(fixture, 'Handoff.md'), 'utf8')
    const archived = readFileSync(path.join(fixture, 'docs/operations/agent-context-history/handoff/2026-08.md'), 'utf8')

    assert.match(active, /Sesión 2026-08-05/)
    assert.doesNotMatch(active, /Sesión 2026-08-04/)
    assert.doesNotMatch(active, /Sesión 2026-08-03/)
    assert.match(archived, /Sesión 2026-08-04/)
    assert.match(archived, /Sesión 2026-08-03/)
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
