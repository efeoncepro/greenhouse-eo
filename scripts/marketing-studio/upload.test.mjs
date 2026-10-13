import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { transferFile, confirmUpload, uploadFile } from './upload.mjs'

async function fileFixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'studio-upload-'))

  t.after(() => rm(directory, { recursive: true, force: true }))
  const file = join(directory, 'pieza.png')

  await writeFile(file, 'test-bytes')

  return file
}

test('single upload streams bytes with signed headers and never bearer', async t => {
  const file = await fileFixture(t)

  await transferFile(
    {
      url: 'https://storage.googleapis.com/b/p?X-Goog-Signature=test',
      method: 'PUT',
      headers: { 'content-type': 'image/png', 'x-goog-meta-sha256': 'hash' }
    },
    file,
    10,
    async (url, options) => {
      assert.equal(options.method, 'PUT')
      assert.equal(options.redirect, 'error')
      assert.equal(options.headers.Authorization, undefined)
      assert.equal(options.headers['Content-Length'], '10')
      let bytes = ''

      for await (const chunk of options.body) bytes += chunk
      assert.equal(bytes, 'test-bytes')

      return new Response(null, { status: 200 })
    }
  )
})

test('resumable POST then PUT and rejects malicious session URL or headers', async t => {
  const file = await fileFixture(t)

  const ticket = {
    url: 'https://storage.googleapis.com/b/p',
    method: 'POST',
    headers: { 'content-type': 'image/png', 'x-goog-resumable': 'start' }
  }

  const calls = []

  await transferFile(ticket, file, 10, async (url, options) => {
    calls.push(options.method)
    assert.equal(options.headers.Authorization, undefined)
    if (options.method === 'POST')
      return new Response(null, {
        status: 201,
        headers: { location: 'https://storage.googleapis.com/b/p?upload_id=test' }
      })
    for await (const chunk of options.body) assert.ok(chunk.length)

    return new Response(null, { status: 200 })
  })
  assert.deepEqual(calls, ['POST', 'PUT'])
  await assert.rejects(
    transferFile(
      ticket,
      file,
      10,
      async () => new Response(null, { status: 201, headers: { location: 'https://evil.test/upload' } })
    ),
    /no permitido/
  )
  await assert.rejects(transferFile({ ...ticket, headers: { Authorization: 'Bearer secret' } }, file, 10), /Header/)
  await assert.rejects(transferFile({ ...ticket, url: 'http://storage.googleapis.com/b/p' }, file, 10), /no permitido/)
})

test('confirmation polls 202 with identical key and returns final created; timeout is resumable', async () => {
  const calls = []

  const client = {
    call: async (name, args) => {
      calls.push({ name, args })

      return {
        status: calls.length === 1 ? 202 : 201,
        data: { status: calls.length === 1 ? 'pending_verification' : 'created' },
        response: new Response(null, { headers: { 'Retry-After': '2' } })
      }
    }
  }

  const result = await confirmUpload(client, 'CMP-900', 'upload-123', { apply: true, sleepImpl: async () => {} })

  assert.equal(result.data.status, 'created')
  assert.deepEqual(calls[0], calls[1])
  calls.length = 0
  const pending = await confirmUpload(client, 'CMP-900', 'upload-123', { apply: true, waitSeconds: 0 })

  assert.equal(pending.data.pending, true)
  assert.equal(pending.data.resume.uploadId, 'upload-123')
  assert.equal(calls.length, 1)
})

test('dry-run validates via API without transfer; duplicate never transfers or confirms', async t => {
  const file = await fileFixture(t)
  const calls = []

  const client = {
    describe: () => ({ body: { properties: { mimeType: { enum: ['image/png'] } } } }),
    call: async (name, args) => {
      calls.push({ name, args })
      if (name === 'getAsset') return { data: { asset: { revision: 7 } } }

      return { status: 200, data: { status: args.apply ? 'duplicate' : 'dry_run' } }
    },
    fetch: () => {
      throw new Error('must not transfer')
    }
  }

  const options = { campaignId: 'CMP-900', assetId: 'A', rights: { licenseKind: 'owned' } }

  await uploadFile(client, file, options)
  await uploadFile(client, file, { ...options, apply: true })
  assert.equal(calls.filter(c => c.name === 'createAssetVersion').length, 0)
  const writes = calls.filter(c => c.name === 'requestAssetVersionUpload')

  assert.equal(writes[0].args.revision, 7)
  assert.equal(writes[0].args.key, writes[1].args.key)
  assert.equal(writes[0].args.body.byteSize, 10)
  assert.match(writes[0].args.body.sha256, /^[a-f0-9]{64}$/)
})

test('full workflow: reserve, transfer, confirm; awaiting_confirmation skips bytes', async t => {
  const file = await fileFixture(t)

  for (const status of ['awaiting_upload', 'awaiting_confirmation']) {
    let bytes = 0

    const calls = [],
      logs = []

    const client = {
      describe: () => ({ body: { properties: { mimeType: { enum: ['image/png'] } } } }),
      log: value => logs.push(value),
      fetch: async (_, options) => {
        for await (const chunk of options.body) bytes += chunk.length

        return new Response(null, { status: 200 })
      },
      call: async (name, args) => {
        calls.push({ name, args })
        if (name === 'requestAssetVersionUpload')
          return {
            data: {
              status,
              uploadId: 'u-123456',
              upload: { url: 'https://storage.googleapis.com/b/p', method: 'PUT', headers: {} }
            }
          }

        return { status: 201, data: { status: 'created', versionNo: 1 } }
      }
    }

    const result = await uploadFile(client, file, {
      campaignId: 'CMP-900',
      rights: { licenseKind: 'owned' },
      apply: true
    })

    assert.equal(result.data.status, 'created')
    assert.equal(bytes, status === 'awaiting_upload' ? 10 : 0)
    assert.deepEqual(
      calls.map(c => c.name),
      ['requestAssetVersionUpload', 'createAssetVersion']
    )
    assert.equal(logs[0].uploadId, 'u-123456')
  }
})
