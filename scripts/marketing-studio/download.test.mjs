import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { downloadAsset } from './download.mjs'

async function setup(t, content = 'bytes') {
  const dir = await mkdtemp(join(tmpdir(), 'studio-download-'))

  t.after(() => rm(dir, { recursive: true, force: true }))

  const data = {
    url: 'https://storage.googleapis.com/b/p?X-Goog-Signature=test',
    byteSize: 5,
    sha256: createHash('sha256').update('bytes').digest('hex'),
    rights: { status: 'unknown' }
  }

  const calls = []

  const client = {
    call: async (name, options) => {
      calls.push({ name, options })

      return { data }
    },
    fetch: async (_, options) => {
      assert.equal(options.headers, undefined)
      assert.equal(options.redirect, 'error')

      return new Response(content)
    }
  }

  return { client, data, calls, output: join(dir, 'original.png') }
}

test('download obtains authorized link, verifies streaming bytes/hash and keeps rights', async t => {
  const { client, calls, output } = await setup(t)
  const result = await downloadAsset(client, { assetId: 'A', versionNo: 1, organizationId: 'org-a', output })

  assert.equal(await readFile(output, 'utf8'), 'bytes')
  assert.equal(result.rights.status, 'unknown')
  assert.equal(calls[0].name, 'getAssetVersionDownload')
  assert.equal(calls[0].options.params.organizationId, 'org-a')
  assert.equal((await stat(output)).mode & 0o777, 0o600)
  assert.ok(!JSON.stringify(result).includes('Signature'))
})

test('corrupted download removed, existing files preserved and untrusted destinations rejected', async t => {
  const { client, data, output } = await setup(t, 'wrong')

  await assert.rejects(downloadAsset(client, { assetId: 'A', versionNo: 1, output }), /Hash/)
  await assert.rejects(stat(output), { code: 'ENOENT' })
  await writeFile(output, 'keep')
  await assert.rejects(downloadAsset(client, { assetId: 'A', versionNo: 1, output }), { code: 'EEXIST' })
  assert.equal(await readFile(output, 'utf8'), 'keep')
  data.url = 'https://evil.test'
  await assert.rejects(downloadAsset(client, { assetId: 'A', versionNo: 1, output }), /no permitido/)
})
