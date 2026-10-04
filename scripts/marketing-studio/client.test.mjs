import test from 'node:test'
import assert from 'node:assert/strict'

import { StudioClient, redact } from './client.mjs'

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } })

export function fixture() {
  const openapi = {
    info: { version: 'test' },
    paths: {
      '/api/v1/assets/{assetId}': {
        get: { operationId: 'getAsset', parameters: [{ name: 'assetId', in: 'path', required: true }] }
      },
      '/api/v1/campaigns/{campaignId}/copies': {
        post: {
          operationId: 'createCopy',
          parameters: [
            { name: 'campaignId', in: 'path', required: true },
            { name: 'dryRun', in: 'query' }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { primaryText: { type: 'string' } },
                  required: ['primaryText'],
                  additionalProperties: false
                }
              }
            }
          }
        }
      },
      '/api/v1/assets/{assetId}/approve': {
        post: { operationId: 'approveAsset', parameters: [{ name: 'assetId', in: 'path', required: true }] }
      }
    }
  }

  const manifest = {
    apiVersion: 'test',
    exclusions: [],
    tools: [
      {
        operationId: 'getAsset',
        name: 'studio.asset.get',
        method: 'GET',
        path: '/api/v1/assets/{assetId}',
        writes: false,
        riskTier: 'T0'
      },
      {
        operationId: 'createCopy',
        name: 'studio.copy.create',
        method: 'POST',
        path: '/api/v1/campaigns/{campaignId}/copies',
        writes: true,
        riskTier: 'T1',
        transport: { dryRun: true, ifMatch: 'none' }
      },
      {
        operationId: 'approveAsset',
        name: 'studio.asset.approve',
        method: 'POST',
        path: '/api/v1/assets/{assetId}/approve',
        writes: true,
        riskTier: 'T2',
        transport: { dryRun: true, ifMatch: 'required' }
      }
    ]
  }

  return { openapi, manifest }
}

async function mock(overrides = {}, reply = () => json({ status: 'written' })) {
  const contract = { ...fixture(), ...overrides }

  const calls = [],
    logs = []

  const client = await new StudioClient({
    token: 'test-secret',
    log: value => logs.push(value),
    fetchImpl: async (url, options) => {
      if (url.endsWith('/openapi.json')) return json(contract.openapi)
      if (url.endsWith('/tool-manifest')) return json(contract.manifest)
      calls.push({ url, options })

      return reply(url, options)
    }
  }).discover()

  return { client, calls, logs }
}

test('default dryRun, alias resolution, Unicode body and apply idempotency', async () => {
  const { client, calls, logs } = await mock()

  await client.call('studio.copy.create', {
    params: { campaignId: 'CMP-900' },
    body: { primaryText: 'Diseño 🪐\nSegunda línea' }
  })
  assert.match(calls[0].url, /dryRun=true$/)
  assert.equal(JSON.parse(calls[0].options.body).primaryText, 'Diseño 🪐\nSegunda línea')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-secret')
  assert.equal(calls[0].options.redirect, 'error')
  assert.match(logs[0].idempotencyKey, /^cli-/)
  for (let i = 0; i < 2; i++)
    await client.call('createCopy', {
      params: { campaignId: 'CMP-900' },
      body: { primaryText: 'Hola' },
      apply: true,
      key: 'repeat-123'
    })
  assert.match(calls[1].url, /dryRun=false$/)
  assert.equal(calls[1].options.headers['Idempotency-Key'], calls[2].options.headers['Idempotency-Key'])
})

test('T2 and revision gates prevent network writes, never refresh revision on 412', async () => {
  const { client, calls } = await mock({}, () =>
    json({ code: 'revision_conflict', error: 'secret provider dump' }, 412)
  )

  await assert.rejects(client.call('approveAsset', { params: { assetId: 'A' }, apply: true }), /confirm/)
  await assert.rejects(
    client.call('approveAsset', { params: { assetId: 'A' }, apply: true, confirm: true }),
    /if-match/
  )
  assert.equal(calls.length, 0)
  await assert.rejects(
    client.call('approveAsset', { params: { assetId: 'A' }, apply: true, confirm: true, revision: 3 }),
    /HTTP 412: revision_conflict/
  )
  assert.equal(calls.length, 1)
  assert.equal(calls[0].options.headers['If-Match'], '3')
})

test('invalid routing, fields, arguments and tokens fail closed', async () => {
  const { client, calls } = await mock()

  await assert.rejects(client.call('getAsset', { params: { assetId: '..' } }), /ruta/)
  await assert.rejects(client.call('getAsset', { params: { assetId: 'A', organizationId: 'other' } }), /desconocido/)
  await assert.rejects(
    client.call('createCopy', { params: { campaignId: 'CMP-900', dryRun: 'false' }, body: {} }),
    /--apply/
  )
  await assert.rejects(
    client.call('createCopy', { params: { campaignId: 'CMP-900' }, body: { primaryText: 'a', actor: 'operator_cli' } }),
    /desconocido/
  )
  await assert.rejects(client.call('createCopy', { params: { campaignId: 'CMP-900' }, body: {} }), /Falta campo/)
  await assert.rejects(client.call('getAsset', { params: { assetId: 'A' }, apply: true }), /lectura/)
  assert.equal(calls.length, 0)
  client.token = undefined
  await assert.rejects(
    client.call('createCopy', { params: { campaignId: 'CMP-900' }, body: { primaryText: 'a' }, apply: true }),
    /requiere STUDIO_API_TOKEN/
  )
  for (const baseUrl of [
    'http://evil.test',
    'https://user:pw@example.com',
    'https://example.com/path',
    'https://example.com?token=a'
  ])
    assert.throws(() => new StudioClient({ baseUrl }), /origen HTTPS/)
  await assert.rejects(client.request('//evil.test/api/v1/a'), /fuera/)
})

test('safe URL encoding and unknown non-dry-run writes yield local plan', async () => {
  const contract = fixture()

  contract.manifest.tools[2].transport.dryRun = false
  const { client, calls } = await mock(contract)

  await client.call('getAsset', { params: { assetId: 'a/b?#' } })
  assert.match(calls[0].url, /a%2Fb%3F%23$/)
  const result = await client.call('approveAsset', { params: { assetId: 'A' }, revision: 2 })

  assert.equal(result.data.status, 'local_plan')
  assert.equal(calls.length, 1)
})

test('contract drift, uncovered operations and missing write metadata stop discovery', async () => {
  for (const mutate of [
    c => {
      c.manifest.apiVersion = 'old'
    },
    c => {
      c.manifest.tools[1].method = 'GET'
    },
    c => {
      delete c.manifest.tools[1].transport
    },
    c => {
      c.manifest.tools.pop()
    },
    c => {
      c.manifest.tools.push({ ...c.manifest.tools[0], operationId: 'absent' })
    }
  ]) {
    const contract = fixture()

    mutate(contract)
    await assert.rejects(mock(contract))
  }
})

test('403/401/provider errors do not leak raw bodies, no retry', async () => {
  for (const status of [401, 403, 500]) {
    const { client, calls } = await mock({}, () =>
      json(
        { code: status === 500 ? 'Bearer test-secret' : 'forbidden', error: 'test-secret postgres://secret' },
        status
      )
    )

    await assert.rejects(
      client.call('getAsset', { params: { assetId: 'A' } }),
      error => !/test-secret|postgres/.test(error.message)
    )
    assert.equal(calls.length, 1)
  }
})

test('redaction covers credentials, signed storage/media URLs, preserves normal copy', () => {
  const input = {
    authorization: 'Bearer secret',
    access_token: 'secret',
    url: 'https://storage.googleapis.com/b/o?X-Goog-Signature=secret',
    nested: ['https://studio.efeonce.org/api/v1/media/secret', 'https://storage.googleapis.com/b/o?upload_id=secret'],
    copy: 'Texto útil https://example.com hola secret'
  }

  const out = redact(input, ['secret'])

  assert.equal(out.copy, 'Texto útil https://example.com hola [REDACTED]')
  assert.equal(out.url, '[REDACTED_URL]')
  assert.ok(!JSON.stringify(out).includes('secret'))
})
