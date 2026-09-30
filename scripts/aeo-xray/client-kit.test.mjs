import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

test('new client keeps the original flow, no inherited claims; unfinished/drifting input cannot build', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'xray-kit-test-'))
  const dir = join(temp, 'case')
  const run = (...args) => spawnSync(process.execPath, ['scripts/aeo-xray/client-kit.mjs', ...args], { encoding: 'utf8' })

  try {
    const created = run('init', '--client', 'Taller "Sur"', '--out', dir)

    assert.equal(created.status, 0, created.stderr)
    const source = await readFile(join(dir, 'intent.json'), 'utf8')

    assert.doesNotMatch(source, /Pichincha|SKY|pichincha\.pe|TREA|3\.75|2\.25/)
    const intent = JSON.parse(source)

    assert.equal(intent.preparedFor, 'Taller "Sur"')

    for (const a of intent.artifacts) {
      assert.deepEqual(a.experience.flow.map(f => f.step), ['', 'articulo', 'radiografia', 'atomizacion'])
      assert.equal(a.experience.evidence.facts.length, 0)
      assert.ok(a.experience.atoms[0].coupleId)
    }

    assert.equal(run('init', '--client', 'Otro', '--out', dir).status, 1)
    assert.equal(await readFile(join(dir, 'intent.json'), 'utf8'), source)
    assert.equal(run('validate', '--dir', dir).status, 2)
    assert.equal(run('build', '--dir', dir).status, 1)
    assert.equal(run('build', '--dir', dir, '--draft').status, 0)
    const compiled = await readFile(join(dir, 'manifest.json'), 'utf8')

    assert.equal(JSON.parse(compiled).status, 'resolved')
    intent.artifacts[0].seo.title = 'Changed without updating the instrument'
    await writeFile(join(dir, 'intent.json'), JSON.stringify(intent))
    assert.equal(run('build', '--dir', dir, '--draft').status, 1)
    assert.equal(await readFile(join(dir, 'manifest.json'), 'utf8'), compiled)
  } finally { await rm(temp, { recursive: true, force: true }) }
})
