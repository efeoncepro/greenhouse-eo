import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const skillRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const repoRoot = resolve(skillRoot, '..', '..', '..')
const validator = join(skillRoot, 'scripts', 'validate-route-cards.mjs')
const sourceCard = join(repoRoot, 'docs', 'architecture', 'creative-studio', 'model-fleet', 'routes', 'FLUX_3_VIDEO_ROUTE_CARD_V1.json')
const asOf = '2026-08-04'

const runCard = mutate => {
  const directory = mkdtempSync(join(tmpdir(), 'model-fleet-card-'))
  const card = JSON.parse(readFileSync(sourceCard, 'utf8'))
  mutate(card)
  const cardPath = join(directory, 'fixture.json')
  writeFileSync(cardPath, JSON.stringify(card))
  try {
    return execFileSync(process.execPath, [validator, '--routes-dir', directory, '--as-of', asOf, '--strict-freshness'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

test('accepts the current Flux 3 card', () => {
  const output = runCard(() => {})
  assert.match(output, /Schema, freshness, references and secret scan passed/)
})

test('fails when exact route identity is incomplete', () => {
  assert.throws(
    () => runCard(card => { delete card.routes[0].completionDriver }),
    error => /completionDriver/.test(`${error.stdout ?? ''}${error.stderr ?? ''}`),
  )
})

test('fails stale snapshots in strict mode', () => {
  assert.throws(
    () => runCard(card => { card.snapshot.observedAt = '2026-07-01' }),
    error => /snapshot is|expired on/.test(`${error.stdout ?? ''}${error.stderr ?? ''}`),
  )
})

test('fails secret-like values without echoing the value', () => {
  const secret = ['Authorization: ', 'Bearer ', 'abcdefghijklmnop'].join('')
  assert.throws(
    () => runCard(card => { card.modelFamily.summary = secret }),
    error => {
      const output = `${error.stdout ?? ''}${error.stderr ?? ''}`
      assert.match(output, /secret-like content/)
      assert.doesNotMatch(output, /abcdefghijklmnop/)
      return true
    },
  )
})

test('fails dangling evidence references', () => {
  assert.throws(
    () => runCard(card => { card.routes[0].evidenceRefs.push('missing-evidence') }),
    error => /missing evidence/.test(`${error.stdout ?? ''}${error.stderr ?? ''}`),
  )
})
