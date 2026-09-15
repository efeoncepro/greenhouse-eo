import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const scriptDir = path.dirname(fileURLToPath(import.meta.url))

test('resolves arbitrary collaborator identity and creates the manifest parent directory', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'axis-collaboration-resolver-'))
  const inputPath = path.join(root, 'intent.json')
  const outputPath = path.join(root, 'nested', 'manifest.json')

  try {
    await writeFile(
      inputPath,
      JSON.stringify({
        targetId: 'headline',
        targetKind: 'text',
        cursors: [
          { id: 'local', kind: 'local', targetId: 'headline', anchor: 'bottom-center', action: 'select' },
          {
            id: 'strategy',
            kind: 'collaborator',
            targetId: 'headline',
            anchor: 'top-end',
            label: 'Estrategia regional',
            participantKind: 'department'
          }
        ]
      })
    )

    await execFileAsync(process.execPath, [
      path.join(scriptDir, 'resolve-collaboration.mjs'),
      '--input',
      inputPath,
      '--out',
      outputPath
    ])
    const manifest = JSON.parse(await readFile(outputPath, 'utf8'))

    assert.equal(manifest.schema, 'axis.collaboration-selection-composition.v1')
    assert.equal(manifest.cursors[1].label, 'Estrategia regional')
    assert.equal(manifest.cursors[1].participantKind, 'department')
    assert.equal(manifest.cursors[1].attachment, 'south-west')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
