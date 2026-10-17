import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { GoogleAdsClient } from '../../src/lib/growth/google-ads/client'
import { GOOGLE_ADS_PROFILE, GOOGLE_ADS_CLI_VERSION, GoogleAdsError, READ_COMMANDS, type ReadCommand, type ReadOptions } from '../../src/lib/growth/google-ads/contracts'
import { buildReadQuery, integerOption } from '../../src/lib/growth/google-ads/queries'
import { buildWritePlan, verifyWritePlan, GoogleAdsWriteValidationError } from '../../src/lib/growth/google-ads/writes'

import { applyOnce } from './journal'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const JOURNAL = resolve(ROOT, '.auth/google-ads-agent/writes')
const readFlags = ['pages', 'cursor', 'customer-id', 'json']

const commandFlags: Record<string, readonly string[]> = {
  discover: [], help: [], 'auth verify': [], 'connection verify': [], 'auth import': ['input'],
  ...Object.fromEntries(Object.keys(READ_COMMANDS).map(command => [command, command === 'report get' ? [...readFlags, 'since', 'until', 'days', 'level', 'daily'] : readFlags])),
  'write plan': ['input'], 'write validate': ['input'], 'write apply': ['input', 'confirm'], 'write verify': ['receipt']
}

export function discoverGoogleAds() {
  return {
    contractVersion: GOOGLE_ADS_CLI_VERSION, readOnly: false, profile: GOOGLE_ADS_PROFILE,
    commands: Object.entries(commandFlags).map(([command, flags]) => ({ command, flags, description: READ_COMMANDS[command as ReadCommand] })),
    writes: { operations: ['campaign.create', 'campaign.update', 'campaignBudget.create', 'campaignBudget.update', 'adGroup.create', 'adGroup.update', 'conversionAction.create', 'conversionAction.update', 'accountGoal.update', 'campaignGoal.update'], workflow: 'plan → validate (Google validateOnly) → apply --confirm DIGEST → verify --receipt FILE', oneOperationPerPlan: true, newCampaignsAndAdGroups: 'PAUSED', activationAndRemoval: 'unsupported', replayProtection: 'private durable journal by digest; unknown outcomes require reconciliation, no automatic retry' },
    credentials: { source: 'Google Secret Manager', secretRef: `projects/${GOOGLE_ADS_PROFILE.cloudProject}/secrets/${GOOGLE_ADS_PROFILE.secretName}/versions/latest`, cloudIdentity: GOOGLE_ADS_PROFILE.cloudIdentity, adsPrincipal: GOOGLE_ADS_PROFILE.authorizedEmail, tokenArgumentsOrEnvironment: false },
    options: { pages: { default: 1, max: 10 }, reportDays: { default: 'last 7 completed days in account timezone', max: 90 }, format: 'structured JSON', cursor: 'opaque; bind to exact query, account and version; provider expiration applies' },
    exitCodes: { success: 0, invalid: 2, authentication: 3, denied: 4, provider: 5, partial: 6, unknownOrReservedWrite: 7, verificationPending: 8 },
    exclusions: ['Other advertisers or manager-wide enumeration', 'arbitrary GAQL, fields, endpoints or HTTP verbs', 'conversion ingestion/Data Manager, customer data, click IDs, search terms', 'ads creative writes, campaign activation/removal; remaining operations absent from catalog', 'Product UI/API/MCP and multi-organization connections are not delivered by this local operator adapter']
  }
}

export function parseGoogleAdsArguments(args: string[], now = new Date()) {
  let parsed: ReturnType<typeof parseArgs>

  try {
    parsed = parseArgs({ args, allowPositionals: true, strict: true, options: {
      input: { type: 'string' }, receipt: { type: 'string' }, confirm: { type: 'string' }, pages: { type: 'string' }, cursor: { type: 'string' },
      since: { type: 'string' }, until: { type: 'string' }, days: { type: 'string' }, level: { type: 'string' }, daily: { type: 'boolean' }, json: { type: 'boolean' }, 'customer-id': { type: 'string' }
    } })
  } catch { throw new GoogleAdsError('INVALID_ARGUMENTS') }

  const command = parsed.positionals.join(' ') || 'help'

  if (!Object.hasOwn(commandFlags, command)) throw new GoogleAdsError('UNKNOWN_COMMAND')
  for (const flag of Object.keys(parsed.values)) if (!commandFlags[command].includes(flag)) throw new GoogleAdsError('FLAG_NOT_ALLOWED_FOR_COMMAND')
  const v = parsed.values as Record<string, string | boolean | undefined>

  if (v['customer-id'] !== undefined && v['customer-id'] !== GOOGLE_ADS_PROFILE.customerId && v['customer-id'] !== '686-253-9491') throw new GoogleAdsError('CUSTOMER_BINDING_MISMATCH', 4)
  const options: ReadOptions = { pages: integerOption(v.pages, 1, 1, 10), cursor: v.cursor as string | undefined }

  if (command === 'report get') {
    Object.assign(options, { since: v.since, until: v.until, days: v.days === undefined ? undefined : integerOption(v.days, 7, 1, 90), level: v.level, daily: v.daily })
  }

  if (Object.hasOwn(READ_COMMANDS, command)) buildReadQuery(command as ReadCommand, options, now)

  if (command.startsWith('write ') && command !== 'write verify' || command === 'auth import') {
    if (typeof v.input !== 'string' || !v.input) throw new GoogleAdsError('PRIVATE_INPUT_FILE_REQUIRED')
  }

  if (command === 'write apply' && (typeof v.confirm !== 'string' || !/^[a-f0-9]{64}$/.test(v.confirm))) throw new GoogleAdsError('WRITE_CONFIRMATION_DIGEST_REQUIRED')
  if (command === 'write verify' && (typeof v.receipt !== 'string' || !v.receipt)) throw new GoogleAdsError('PRIVATE_RECEIPT_FILE_REQUIRED')

  return { command, values: v, options }
}

export async function runGoogleAdsCli(args: string[], deps: { client?: GoogleAdsClient; tokenProvider?: () => Promise<string>; readInput?: (p: string) => Promise<unknown>; now?: Date } = {}) {
  let command = 'unparsed'

  try {
    const parsed = parseGoogleAdsArguments(args, deps.now)

    command = parsed.command
    const base = { contractVersion: GOOGLE_ADS_CLI_VERSION, command, customerId: GOOGLE_ADS_PROFILE.customerId, readOnly: !['write apply', 'auth import'].includes(command) }
    const success = (data: unknown, exitCode = 0) => ({ exitCode, output: { ...base, ok: exitCode === 0, data } })

    if (command === 'help' || command === 'discover') return success(discoverGoogleAds())

    if (command === 'auth import') {
      const { importCredential } = await import('./auth')

      return success(await importCredential(parsed.values.input as string))
    }

    let input: unknown

    if (command.startsWith('write ')) {
      const readInput = deps.readInput ?? (await import('./auth')).privateJson

      input = await readInput((parsed.values.input ?? parsed.values.receipt) as string)

      if (command !== 'write verify') {
        const plan = buildWritePlan(input)

        if (command === 'write plan') return success(plan)
        if (command === 'write apply' && parsed.values.confirm !== plan.digest) throw new GoogleAdsError('WRITE_CONFIRMATION_DIGEST_REQUIRED')
      }
    }

    const client = deps.client ?? new GoogleAdsClient({ tokenProvider: deps.tokenProvider ?? await (await import('./auth')).operatorTokenProvider() })

    if (command === 'auth verify' || command === 'connection verify') return success({ authorizedEmail: GOOGLE_ADS_PROFILE.authorizedEmail, identity: await client.verifyIdentity() })
    if (command === 'write validate') return success(await client.executeWrite(input, { validateOnly: true }))
    if (command === 'write apply') return success(await applyOnce(input, parsed.values.confirm as string, client, JOURNAL))

    if (command === 'write verify') {
      const receipt = input as { plan?: unknown; result?: { resourceName?: string } }
      const plan = verifyWritePlan(receipt?.plan)

      if (!receipt?.result?.resourceName) throw new GoogleAdsError('WRITE_RECEIPT_HAS_NO_NATIVE_RESOURCE', 8)

      const readback = await client.readback(plan.summary, receipt.result.resourceName)

      return success(readback, readback.verification.complete && readback.verification.matched ? 0 : 8)
    }

    const result = await client.read(command as ReadCommand, parsed.options, deps.now)

    return success(result, result.coverage.partial ? 6 : 0)
  } catch (e) {
    const error = e instanceof GoogleAdsError ? e : e instanceof GoogleAdsWriteValidationError ? new GoogleAdsError('INVALID_WRITE_INPUT') : new GoogleAdsError('OPERATION_FAILED', 5)

    return { exitCode: error.exitCode, output: { ok: false, contractVersion: GOOGLE_ADS_CLI_VERSION, command, error: { code: error.code, ...error.details } } }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runGoogleAdsCli(process.argv.slice(2)).then(({ exitCode, output }) => { console.log(JSON.stringify(output, null, 2)); process.exitCode = exitCode }).catch(() => { console.log(JSON.stringify({ ok: false, error: { code: 'CLI_FAILED' } })); process.exitCode = 5 })
}
