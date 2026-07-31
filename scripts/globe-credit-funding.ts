import { execFile as execFileCallback } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)

export type CreditFundingInput = Readonly<{
  globeWorkspaceId: string
  poolId: string
  grantCredits: number
  monthlyCap?: number
  periodStart: string
  periodEnd: string
}>

export type CreditFundingProposal = Readonly<{
  proposalId: string
  fingerprint: string
  plan: Record<string, unknown>
}>

type CliConfig = Readonly<{
  apiBaseUrl: string
  clientId: string
  scope: string
  authorizeUrl: string
  tokenUrl: string
  openBrowser: (url: string) => Promise<void>
  fetchImpl: typeof fetch
  timeoutMs: number
}>

const DEFAULT_SCOPE = 'openid profile email globe.credits.funding.propose globe.credits.funding.confirm'
const DEFAULT_TIMEOUT_MS = 180_000

export const buildPkceChallenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url')

export const createPkceVerifier = () => randomBytes(48).toString('base64url')

export const buildAuthorizationUrl = ({
  authorizeUrl,
  clientId,
  redirectUri,
  state,
  nonce,
  scope,
  codeChallenge
}: Readonly<{
  authorizeUrl: string
  clientId: string
  redirectUri: string
  state: string
  nonce: string
  scope: string
  codeChallenge: string
}>) => {
  const url = new URL(authorizeUrl)

  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', state)
  url.searchParams.set('nonce', nonce)
  url.searchParams.set('code_challenge', codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')

  return url.toString()
}

export const validateFundingInput = (value: unknown): CreditFundingInput => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('input_must_be_object')

  const input = value as Record<string, unknown>

  const text = (key: string) => {
    const item = input[key]

    if (typeof item !== 'string' || !item.trim()) throw new Error(`missing:${key}`)

    return item.trim()
  }

  const integer = (key: string, positive = true) => {
    const item = input[key]

    if (!Number.isSafeInteger(item) || (positive && (item as number) <= 0)) throw new Error(`invalid_integer:${key}`)

    return item as number
  }

  const periodStart = text('periodStart')
  const periodEnd = text('periodEnd')

  if (
    !Number.isFinite(Date.parse(periodStart)) ||
    !Number.isFinite(Date.parse(periodEnd)) ||
    Date.parse(periodStart) >= Date.parse(periodEnd)
  ) {
    throw new Error('invalid_period')
  }

  const monthlyCap = input.monthlyCap

  if (monthlyCap !== undefined && (!Number.isSafeInteger(monthlyCap) || (monthlyCap as number) <= 0)) {
    throw new Error('invalid_integer:monthlyCap')
  }

  return {
    globeWorkspaceId: text('globeWorkspaceId'),
    poolId: text('poolId'),
    grantCredits: integer('grantCredits'),
    ...(monthlyCap === undefined ? {} : { monthlyCap: monthlyCap as number }),
    periodStart,
    periodEnd
  }
}

export const readJsonFileOrValue = async (value: string): Promise<unknown> => {
  if (!value.startsWith('@')) return JSON.parse(value)
  const { readFile } = await import('node:fs/promises')

  return JSON.parse(await readFile(value.slice(1), 'utf8'))
}

const openBrowserDefault = async (url: string) => {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'

  const args =
    process.platform === 'darwin'
      ? ['-a', process.env.GREENHOUSE_OAUTH_BROWSER_APP?.trim() || 'Google Chrome', url]
      : process.platform === 'win32'
        ? ['/c', 'start', '', url]
        : [url]

  await execFile(command, args)
}

const closeServer = (server: Server) => new Promise<void>(resolve => server.close(() => resolve()))

export const authorizeWithLoopbackPkce = async (config: CliConfig): Promise<string> => {
  const verifier = createPkceVerifier()
  const codeChallenge = buildPkceChallenge(verifier)
  const state = randomBytes(32).toString('base64url')
  const nonce = randomBytes(32).toString('base64url')

  let server: Server | undefined
  let timeout: NodeJS.Timeout | undefined

  try {
    const callback = await new Promise<{ server: Server; redirectUri: string; code: string }>((resolve, reject) => {
      const candidate = createServer((request, response) => {
        const url = new URL(request.url ?? '/', 'http://127.0.0.1')

        if (url.pathname !== '/oauth/callback') {
          response.writeHead(404).end('Not found')

          return
        }

        if (url.searchParams.get('state') !== state) {
          response.writeHead(400).end('OAuth state validation failed.')
          reject(new Error('oauth_state_mismatch'))

          return
        }

        const error = url.searchParams.get('error')

        if (error) {
          response.writeHead(400).end('OAuth authorization was rejected.')
          reject(new Error(`oauth_authorization_rejected:${error}`))

          return
        }

        const code = url.searchParams.get('code')

        if (!code) {
          response.writeHead(400).end('OAuth authorization code missing.')
          reject(new Error('oauth_code_missing'))

          return
        }

        response
          .writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
          .end('Authorization complete. You may close this window.')
        resolve({
          server: candidate,
          redirectUri: `http://127.0.0.1:${(candidate.address() as { port: number }).port}/oauth/callback`,
          code
        })
      })

      candidate.once('error', reject)
      candidate.listen(0, '127.0.0.1', () => {
        server = candidate
        const address = candidate.address()

        if (!address || typeof address === 'string') {
          reject(new Error('oauth_loopback_bind_failed'))

          return
        }

        const redirectUri = `http://127.0.0.1:${address.port}/oauth/callback`

        const authorizationUrl = buildAuthorizationUrl({
          authorizeUrl: config.authorizeUrl,
          clientId: config.clientId,
          redirectUri,
          state,
          nonce,
          scope: config.scope,
          codeChallenge
        })

        void config.openBrowser(authorizationUrl).catch(reject)
      })

      timeout = setTimeout(() => reject(new Error('oauth_loopback_timeout')), config.timeoutMs)
    })

    const tokenResponse = await config.fetchImpl(config.tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code: callback.code,
        redirect_uri: callback.redirectUri,
        code_verifier: verifier
      })
    })

    const tokenBody = (await tokenResponse.json().catch(() => null)) as { access_token?: unknown; error?: unknown }

    if (!tokenResponse.ok || typeof tokenBody.access_token !== 'string' || !tokenBody.access_token) {
      throw new Error(
        typeof tokenBody.error === 'string'
          ? `oauth_token_exchange_failed:${tokenBody.error}`
          : 'oauth_token_exchange_failed'
      )
    }

    return tokenBody.access_token
  } finally {
    if (timeout) clearTimeout(timeout)
    if (server) await closeServer(server)
  }
}

const requestFunding = async <T>({
  config,
  accessToken,
  path,
  idempotencyKey,
  body
}: Readonly<{
  config: CliConfig
  accessToken: string
  path: string
  idempotencyKey: string
  body: unknown
}>): Promise<T> => {
  if (!idempotencyKey.trim()) throw new Error('idempotency_key_required')

  const response = await config.fetchImpl(`${config.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      accept: 'application/json'
    },
    body: JSON.stringify(body)
  })

  const payload = (await response.json().catch(() => null)) as { data?: T; errors?: readonly { code?: unknown }[] }

  if (!response.ok || payload?.data === undefined) {
    const code = typeof payload?.errors?.[0]?.code === 'string' ? payload.errors[0].code : 'funding_request_failed'

    throw new Error(code)
  }

  return payload.data
}

export const runFundingFlow = async ({
  config,
  input,
  proposeIdempotencyKey,
  confirmIdempotencyKey,
  confirm
}: Readonly<{
  config: CliConfig
  input: CreditFundingInput
  proposeIdempotencyKey: string
  confirmIdempotencyKey: string
  confirm: (proposal: CreditFundingProposal) => Promise<boolean>
}>) => {
  const accessToken = await authorizeWithLoopbackPkce(config)

  const proposed = await requestFunding<{ proposal: CreditFundingProposal }>({
    config,
    accessToken,
    path: '/api/platform/app/globe/credit-funding/propose',
    idempotencyKey: proposeIdempotencyKey,
    body: input
  })

  if (!(await confirm(proposed.proposal))) return { proposal: proposed.proposal, confirmed: false as const }

  const confirmed = await requestFunding<{ outcome: unknown }>({
    config,
    accessToken,
    path: '/api/platform/app/globe/credit-funding/confirm',
    idempotencyKey: confirmIdempotencyKey,
    body: {
      globeWorkspaceId: input.globeWorkspaceId,
      proposalId: proposed.proposal.proposalId,
      fingerprint: proposed.proposal.fingerprint
    }
  })

  return { proposal: proposed.proposal, outcome: confirmed.outcome, confirmed: true as const }
}

const parseArgs = (argv: readonly string[]) => {
  const args = new Map<string, string>()

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index]

    if (!key?.startsWith('--')) throw new Error(`argument_invalid:${key ?? ''}`)
    const value = argv[index + 1]

    if (!value || value.startsWith('--')) throw new Error(`argument_missing:${key}`)
    args.set(key.slice(2), value)
    index += 1
  }

  return args
}

const requiredArg = (args: Map<string, string>, key: string) => {
  const value = args.get(key)?.trim()

  if (!value) throw new Error(`missing:${key}`)

  return value
}

const defaultConfig = (): CliConfig => {
  const apiBaseUrl = process.env.GREENHOUSE_API_BASE_URL?.trim()
  const clientId = process.env.GLOBE_ADMIN_OAUTH_CLIENT_ID?.trim()

  if (!apiBaseUrl || !clientId) throw new Error('GREENHOUSE_API_BASE_URL_and_GLOBE_ADMIN_OAUTH_CLIENT_ID_required')

  const base = new URL(apiBaseUrl)

  return {
    apiBaseUrl: base.origin,
    clientId,
    scope: process.env.GLOBE_ADMIN_OAUTH_SCOPE?.trim() || DEFAULT_SCOPE,
    authorizeUrl:
      process.env.GREENHOUSE_OAUTH_AUTHORIZE_URL?.trim() ||
      new URL('/api/auth/sister-platforms/authorize', base).toString(),
    tokenUrl:
      process.env.GREENHOUSE_OAUTH_TOKEN_URL?.trim() ||
      new URL('/api/integrations/v1/sister-platforms/oauth/token', base).toString(),
    openBrowser: openBrowserDefault,
    fetchImpl: fetch,
    timeoutMs: Number(process.env.GLOBE_ADMIN_OAUTH_TIMEOUT_MS || DEFAULT_TIMEOUT_MS)
  }
}

const promptForConfirmation = async (proposal: CreditFundingProposal) => {
  const { createInterface } = await import('node:readline/promises')
  const readline = createInterface({ input: process.stdin, output: process.stderr })

  try {
    const answer = await readline.question(
      `Confirm funding proposal ${proposal.proposalId} for ${String(proposal.plan.grantCredits ?? 'unknown')} credits? [y/N] `
    )

    return answer.trim().toLowerCase() === 'y'
  } finally {
    readline.close()
  }
}

const main = async () => {
  const [command = 'run', ...rest] = process.argv.slice(2)

  if (command !== 'run') throw new Error('only_run_command_supported')

  const args = parseArgs(rest)
  const input = validateFundingInput(await readJsonFileOrValue(requiredArg(args, 'input')))
  const proposeIdempotencyKey = requiredArg(args, 'propose-idempotency-key')
  const confirmIdempotencyKey = requiredArg(args, 'confirm-idempotency-key')
  const config = defaultConfig()
  const autoConfirm = args.get('yes') === 'true' || args.get('yes') === '1'

  const result = await runFundingFlow({
    config,
    input,
    proposeIdempotencyKey,
    confirmIdempotencyKey,
    confirm: proposal => (autoConfirm ? Promise.resolve(true) : promptForConfirmation(proposal))
  })

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : 'funding_cli_failed'}\n`)
    process.exitCode = 1
  })
}
