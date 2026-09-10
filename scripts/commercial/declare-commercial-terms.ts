/**
 * HTTP adapter for the commercial terms of a service (TASK-1852).
 * Defaults to reading the active terms; `--operation declare` requires an authenticated human app token.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

const main = async () => {
  const { values } = parseArgs({ options: {
    'service-id': { type: 'string' }, input: { type: 'string' }, output: { type: 'string' },
    'base-url': { type: 'string' }, operation: { type: 'string', default: 'read' },
    'token-env': { type: 'string', default: 'GREENHOUSE_APP_ACCESS_TOKEN' }
  } })

  const serviceId = values['service-id']
  const operation = values.operation!

  if (!serviceId || !values['base-url']) throw new Error('Provide --service-id and --base-url')
  if (!['read', 'declare'].includes(operation)) throw new Error('Invalid operation')
  if (operation === 'declare' && !values.input) throw new Error('Provide --input with the terms body')
  const base = new URL(values['base-url'])

  if (base.username || base.password || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname)))) {
    throw new Error('Use HTTPS or a local HTTP endpoint without URL credentials')
  }

  const token = process.env[values['token-env']!]?.trim()

  if (!token) throw new Error('The selected token environment variable is empty')
  const url = new URL(`/api/platform/app/commercial/services/${encodeURIComponent(serviceId)}/terms`, base)
  const body = operation === 'declare' ? JSON.parse(readFileSync(values.input!, 'utf8')) : undefined

  const response = await fetch(url, {
    method: operation === 'declare' ? 'POST' : 'GET',
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(20_000)
  })

  // Only the platform's structured response is printed. No headers, tokens or raw network errors.
  const json = JSON.stringify(await response.json(), null, 2)

  if (values.output) writeFileSync(values.output, json + '\n', { mode: 0o600 })
  else process.stdout.write(json + '\n')
  if (!response.ok) process.exitCode = 1
}

main().catch(() => {
  console.error('Commercial terms request failed. Check input, authenticated session and endpoint availability.')
  process.exitCode = 1
})
