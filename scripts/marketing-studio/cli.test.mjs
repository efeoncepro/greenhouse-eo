import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile, rm, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const contract = {
  info: { version: 'test' },
  paths: {
    '/api/v1/copies': {
      post: {
        operationId: 'createCopy',
        parameters: [{ name: 'dryRun', in: 'query' }],
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
    '/api/v1/assets/{assetId}': {
      get: { operationId: 'getAsset', parameters: [{ name: 'assetId', in: 'path', required: true }] }
    }
  }
}

const manifest = {
  apiVersion: 'test',
  exclusions: [],
  tools: [
    {
      operationId: 'createCopy',
      name: 'studio.copy.create',
      method: 'POST',
      path: '/api/v1/copies',
      writes: true,
      riskTier: 'T1',
      transport: { dryRun: true, ifMatch: 'none' }
    },
    {
      operationId: 'getAsset',
      name: 'studio.asset.get',
      method: 'GET',
      path: '/api/v1/assets/{assetId}',
      writes: false,
      riskTier: 'T0'
    }
  ]
}

async function harness(t) {
  const dir = await mkdtemp(join(tmpdir(), 'studio-cli-'))
  const calls = []

  const server = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json')
    if (req.url === '/api/v1/openapi.json') return res.end(JSON.stringify(contract))
    if (req.url === '/api/v1/tool-manifest') return res.end(JSON.stringify(manifest))
    let body = ''

    for await (const chunk of req) body += chunk
    calls.push({ url: req.url, headers: req.headers, body })

    if (req.url.endsWith('/binary')) {
      res.setHeader('content-type', 'image/webp')

      return res.end(Buffer.from([1, 2, 3, 4]))
    }

    if (req.url.endsWith('/forbidden')) {
      res.statusCode = 403

      return res.end(JSON.stringify({ code: 'forbidden', error: 'private-token SQL details' }))
    }

    res.end(
      JSON.stringify({
        status: 'ok',
        received: body ? JSON.parse(body) : null,
        token: 'private-token',
        url: 'https://storage.googleapis.com/b/p?X-Goog-Signature=secret'
      })
    )
  })

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    await rm(dir, { recursive: true, force: true })
  })

  const run = (args, stdin = '', extraEnv = {}) =>
    new Promise((resolve, reject) => {
      const proc = spawn(
        process.execPath,
        ['scripts/marketing-studio/cli.mjs', ...args, '--base-url', `http://127.0.0.1:${server.address().port}`],
        { env: { ...process.env, STUDIO_API_TOKEN: 'private-token', ...extraEnv }, stdio: ['pipe', 'pipe', 'pipe'] }
      )

      let stdout = '',
        stderr = ''

      const timer = setTimeout(() => {
        proc.kill()
        reject(new Error('CLI timed out'))
      }, 8000)

      proc.stdout.on('data', chunk => {
        stdout += chunk
      })
      proc.stderr.on('data', chunk => {
        stderr += chunk
      })
      proc.on('error', reject)
      proc.on('close', code => {
        clearTimeout(timer)
        resolve({ code, stdout, stderr })
      })
      proc.stdin.end(stdin)
    })

  return { dir, calls, run }
}

test('executable supports stdin body, tool names, default validation and explicit apply', async t => {
  const { run, calls } = await harness(t)
  const args = ['call', 'studio.copy.create', '--file', '-']
  const result = await run(args, JSON.stringify({ primaryText: '¡Hola!\nCopy 🪐' }))

  assert.equal(result.code, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).data.received.primaryText, '¡Hola!\nCopy 🪐')
  assert.ok(!`${result.stdout}${result.stderr}`.includes('private-token'))
  assert.ok(!result.stdout.includes('X-Goog-Signature'))
  assert.equal(calls[0].url, '/api/v1/copies?dryRun=true')
  assert.equal(calls[0].headers.authorization, 'Bearer private-token')
  const applied = await run([...args, '--apply', '--key', 'cli-test-123'], '{"primaryText":"Hello"}')

  assert.equal(applied.code, 0, applied.stderr)
  assert.equal(calls[1].url, '/api/v1/copies?dryRun=false')
  assert.equal(calls[1].headers['idempotency-key'], 'cli-test-123')
})

test('binary output preserves bytes, JSON output is redacted, no overwrite before mutation', async t => {
  const { run, calls, dir } = await harness(t)
  const binary = join(dir, 'preview.webp')
  const read = await run(['call', 'getAsset', '--param', 'assetId=binary', '--output', binary])

  assert.equal(read.code, 0, read.stderr)
  assert.deepEqual(await readFile(binary), Buffer.from([1, 2, 3, 4]))
  const output = join(dir, 'result.json')
  const json = await run(['call', 'getAsset', '--param', 'assetId=A', '--output', output])

  assert.equal(json.code, 0, json.stderr)
  assert.ok(!(await readFile(output, 'utf8')).includes('private-token'))
  const before = calls.length

  const rejected = await run(
    ['call', 'createCopy', '--file', '-', '--apply', '--output', output],
    '{"primaryText":"a"}'
  )

  assert.equal(rejected.code, 1)
  assert.equal(calls.length, before)
})

test('strict flags and 403 exit nonzero, preserve sanitized diagnostics', async t => {
  const { run, calls } = await harness(t)

  for (const args of [
    ['call', 'createCopy', '--aply'],
    ['call', 'createCopy', '--apply', '--dry-run'],
    ['call', 'getAsset', '--param', 'assetId=A', '--param', 'assetId=B'],
    ['list', '--apply'],
    ['upload', '--campaign', 'CMP-900', '--resume', 'u', '--asset', 'A']
  ])
    assert.equal((await run(args)).code, 1)
  assert.equal(calls.length, 0)
  const denied = await run(['call', 'getAsset', '--param', 'assetId=forbidden'])

  assert.equal(denied.code, 1)
  assert.match(denied.stderr, /HTTP 403: forbidden/)
  assert.ok(!/private-token|SQL/.test(denied.stderr))
})

test('token file permissions and ambiguous credentials rejected', async t => {
  const { run, dir } = await harness(t)
  const path = join(dir, 'token')

  await writeFile(path, 'private-token', { mode: 0o644 })
  assert.equal((await run(['list', '--token-file', path], '', { STUDIO_API_TOKEN: '' })).code, 1)
  await chmod(path, 0o600)
  assert.equal((await run(['list', '--token-file', path], '', { STUDIO_API_TOKEN: '' })).code, 0)
  assert.equal((await run(['list', '--token-file', path])).code, 1)
})
