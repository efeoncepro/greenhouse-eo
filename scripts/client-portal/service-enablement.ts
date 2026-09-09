/** HTTP adapter. Defaults to preview; mutations require an authenticated human app token. */
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'

import { serviceEnablementRequestSchema, serviceEnablementApplySchema, serviceEnablementRollbackSchema } from '../../src/lib/client-portal/enablement/validation'

const main = async () => {
  const { values } = parseArgs({ options: {
    input: { type: 'string' }, output: { type: 'string' }, 'base-url': { type: 'string' },
    operation: { type: 'string', default: 'preview' }, lane: { type: 'string', default: 'app' },
    'token-env': { type: 'string', default: 'GREENHOUSE_APP_ACCESS_TOKEN' },
    'external-scope-type': { type: 'string' }, 'external-scope-id': { type: 'string' }
  } })

  if (!values.input || !values['base-url']) throw new Error('Provide --input and --base-url')
  const operation = values.operation!
  const lane = values.lane!

  if (!['preview', 'apply', 'rollback'].includes(operation) || !['app', 'ecosystem'].includes(lane)) throw new Error('Invalid operation or lane')
  const base = new URL(values['base-url'])

  if (base.username || base.password || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname)))) {
    throw new Error('Use HTTPS or a local HTTP endpoint without URL credentials')
  }

  const raw = JSON.parse(readFileSync(values.input, 'utf8'))
  const payload = (operation === 'preview' ? serviceEnablementRequestSchema : operation === 'apply' ? serviceEnablementApplySchema : serviceEnablementRollbackSchema).parse(raw)
  const token = process.env[values['token-env']!]?.trim()

  if (!token) throw new Error('The selected token environment variable is empty')
  const url = new URL(`/api/platform/${lane}/client-services/enablement/${operation}`, base)

  if (lane === 'ecosystem') {
    if (!values['external-scope-type'] || !values['external-scope-id']) throw new Error('The ecosystem lane requires an explicit external scope')
    url.searchParams.set('externalScopeType', values['external-scope-type'])
    url.searchParams.set('externalScopeId', values['external-scope-id'])
  }

  const response = await fetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload), redirect: 'error', signal: AbortSignal.timeout(20_000) })

  const result = await response.json()

  // Only the platform's structured response is printed. No headers, tokens or raw network errors.
  const json = JSON.stringify(result, null, 2)

  if (values.output) writeFileSync(values.output, json + '\n', { mode: 0o600 })
  else process.stdout.write(json + '\n')
  if (!response.ok) process.exitCode = 1
}

main().catch(() => {
  console.error('Service enablement request failed. Check input, authenticated session and endpoint availability.')
  process.exitCode = 1
})
