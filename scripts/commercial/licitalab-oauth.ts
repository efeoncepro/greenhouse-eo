import { execFile as execFileCallback } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { LICITALAB_MCP_URL } from '@/lib/commercial/tenders/licitalab/client'

/**
 * Sesión OAuth de usuario para `pnpm licitalab` (sólo local).
 *
 * La API key no opera findOpportunityTool ni providerReportTool: exigen el OAuth 2.1 + PKCE del MCP de LicitaLAB.
 * Ese authorization server (verificado 2026-09-17) acepta registro dinámico de clientes, sólo `authorization_code`
 * — NO emite refresh token — y muestra un formulario propio de correo + contraseña, distinto de la sesión web de
 * app.licitalab.cl. Por eso el login se repite cada vez que el token vence.
 *
 * `login` es no interactivo: Playwright abre la página de autorización y la completa con la credencial que ya guarda
 * `pnpm licitalab:radar:setup` (`.auth/licitalab-auth-credentials.json`). El callback cae en un servidor loopback
 * efímero; el código se canjea con el verifier PKCE.
 *
 * Todo vive en `.auth/` (ignorado por Git, 0600). Nunca se imprimen tokens, credenciales ni el código.
 */

const execFile = promisify(execFileCallback)

const AUTH_DIR = join(process.cwd(), '.auth')
const CREDENTIALS_PATH = join(AUTH_DIR, 'licitalab-auth-credentials.json')
const OAUTH_STATE_PATH = join(AUTH_DIR, 'licitalab-mcp-oauth.json')

const AUTHORIZATION_SERVER = 'https://aiagents.licitalab.cl'
const REGISTRATION_URL = `${AUTHORIZATION_SERVER}/oauth/register`
const AUTHORIZE_URL = `${AUTHORIZATION_SERVER}/oauth/authorize`
const TOKEN_URL = `${AUTHORIZATION_SERVER}/oauth/token`

const CALLBACK_PORT = 53682
const REDIRECT_URI = `http://127.0.0.1:${CALLBACK_PORT}/callback`
const LOGIN_TIMEOUT_MS = 90_000

/** Margen para no usar un token que vence en medio de una llamada. */
const EXPIRY_MARGIN_MS = 60_000

/** Si el servidor no declara `expires_in`, se asume esta vida y un 401 fuerza el re-login. */
const ASSUMED_TOKEN_LIFETIME_MS = 60 * 60 * 1000

interface OAuthClient {
  clientId: string
  clientSecret: string | null
  redirectUri: string
  registeredAt: string
}

interface OAuthToken {
  accessToken: string
  tokenType: string
  scope: string | null
  obtainedAt: string
  /** ISO. `expiresDeclared=false` significa que es una estimación. */
  expiresAt: string
  expiresDeclared: boolean
}

interface OAuthState {
  client: OAuthClient | null
  token: OAuthToken | null
}

export class LicitalabOAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LicitalabOAuthError'
  }
}

const assertIgnoredByGit = async (path: string) => {
  const relative = path.slice(process.cwd().length + 1)

  const run = async (args: string[]) => {
    try {
      await execFile('git', args, { cwd: process.cwd() })

      return true
    } catch {
      return false
    }
  }

  const [tracked, ignored] = await Promise.all([
    run(['ls-files', '--error-unmatch', '--', relative]),
    run(['check-ignore', '--quiet', '--no-index', '--', relative])
  ])

  if (tracked || !ignored) throw new LicitalabOAuthError(`${relative} debe permanecer ignorado y fuera del índice Git.`)
}

const readState = async (): Promise<OAuthState> => {
  try {
    const parsed = JSON.parse(await readFile(OAUTH_STATE_PATH, 'utf8')) as Partial<OAuthState>

    return { client: parsed.client ?? null, token: parsed.token ?? null }
  } catch {
    return { client: null, token: null }
  }
}

const writeState = async (state: OAuthState) => {
  await assertIgnoredByGit(OAUTH_STATE_PATH)
  await mkdir(AUTH_DIR, { recursive: true, mode: 0o700 })
  await writeFile(OAUTH_STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 })
  await chmod(OAUTH_STATE_PATH, 0o600)
}

const readCredentials = async () => {
  let raw: string

  try {
    raw = await readFile(CREDENTIALS_PATH, 'utf8')
  } catch {
    throw new LicitalabOAuthError('Falta la credencial local de LicitaLAB. Ejecuta primero `pnpm licitalab:radar:setup` en una terminal.')
  }

  const parsed = JSON.parse(raw) as { email?: unknown; password?: unknown }

  if (typeof parsed.email !== 'string' || typeof parsed.password !== 'string' || !parsed.password) {
    throw new LicitalabOAuthError('La credencial local de LicitaLAB está incompleta. Vuelve a ejecutar `pnpm licitalab:radar:setup`.')
  }

  return { email: parsed.email, password: parsed.password }
}

const registerClient = async (): Promise<OAuthClient> => {
  const res = await fetch(REGISTRATION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Greenhouse — pnpm licitalab',
      redirect_uris: [REDIRECT_URI],
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none'
    }),
    signal: AbortSignal.timeout(20_000)
  })

  const body = (await res.json().catch(() => null)) as { client_id?: string; client_secret?: string } | null

  if (!res.ok || !body?.client_id) {
    throw new LicitalabOAuthError(`LicitaLAB rechazó el registro del cliente OAuth (HTTP ${res.status}).`)
  }

  return {
    clientId: body.client_id,
    clientSecret: body.client_secret ?? null,
    redirectUri: REDIRECT_URI,
    registeredAt: new Date().toISOString()
  }
}

/** Servidor loopback que espera UN callback con el `state` esperado. */
const waitForCallback = (expectedState: string) => {
  let server: Server | null = null
  let settle: { resolve: (code: string) => void; reject: (error: Error) => void } | null = null

  const promise = new Promise<string>((resolve, reject) => {
    settle = { resolve, reject }
  })

  const ready = new Promise<void>((resolve, reject) => {
    server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', REDIRECT_URI)

      if (url.pathname !== '/callback') {
        res.writeHead(404).end()

        return
      }

      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      const error = url.searchParams.get('error')

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Autorización recibida. Puedes cerrar esta ventana.')

      if (error) settle?.reject(new LicitalabOAuthError(`LicitaLAB negó la autorización: ${error}.`))
      else if (!code || state !== expectedState) settle?.reject(new LicitalabOAuthError('Callback OAuth inválido (state o code ausente).'))
      else settle?.resolve(code)
    })

    server.once('error', error =>
      reject(new LicitalabOAuthError(`No se pudo abrir el callback local en el puerto ${CALLBACK_PORT}: ${error.message}`))
    )
    server.listen(CALLBACK_PORT, '127.0.0.1', () => resolve())
  })

  const close = () =>
    new Promise<void>(resolve => {
      if (!server) return resolve()

      // El navegador deja la conexión keep-alive abierta: sin esto `close` no termina.
      server.closeAllConnections()
      server.close(() => resolve())
    })

  return { ready, promise, close }
}

/** Completa el formulario de autorización con Playwright. Nunca registra lo que escribe. */
const completeAuthorizationWithPlaywright = async (authorizeUrl: string, callback: Promise<string>, options: { headed: boolean }) => {
  const credentials = await readCredentials()
  const { chromium } = await import('playwright')
  const browser = await chromium.launch({ channel: 'chrome', headless: !options.headed })

  try {
    const page = await browser.newPage()

    await page.goto(authorizeUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 })

    const email = page.locator('input[name="email"], input[type="email"]').first()
    const password = page.locator('input[name="password"], input[type="password"]').first()

    if (!(await email.isVisible().catch(() => false)) || !(await password.isVisible().catch(() => false))) {
      throw new LicitalabOAuthError('No se reconoció el formulario de autorización de LicitaLAB (¿cambió la página?).')
    }

    await email.fill(credentials.email)
    await password.fill(credentials.password)

    const submit = page.locator('button[type="submit"], #submit-btn').first()

    await submit.click()

    // Si el login falla, LicitaLAB se queda en la misma página con un mensaje: se reporta sin exponer datos.
    let timer: NodeJS.Timeout | undefined

    const outcome = await Promise.race([
      callback.then(() => 'callback' as const),
      new Promise<'timeout'>(resolve => {
        timer = setTimeout(() => resolve('timeout'), LOGIN_TIMEOUT_MS)
      })
    ]).finally(() => clearTimeout(timer))

    if (outcome === 'timeout') {
      const pageText = ((await page.locator('body').innerText().catch(() => '')) || '').replace(/\s+/g, ' ')
      const hint = /incorrect|inválid|invalid|error/i.test(pageText) ? ' LicitaLAB rechazó el correo o la contraseña.' : ''

      throw new LicitalabOAuthError(`La autorización no llegó al callback a tiempo.${hint}`)
    }
  } finally {
    await browser.close()
  }
}

const exchangeCode = async (client: OAuthClient, code: string, verifier: string): Promise<OAuthToken> => {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: client.redirectUri,
    client_id: client.clientId,
    code_verifier: verifier,
    resource: LICITALAB_MCP_URL
  })

  if (client.clientSecret) form.set('client_secret', client.clientSecret)

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: form,
    signal: AbortSignal.timeout(20_000)
  })

  const body = (await res.json().catch(() => null)) as
    | { access_token?: string; token_type?: string; expires_in?: number; scope?: string; error?: string }
    | null

  if (!res.ok || !body?.access_token) {
    throw new LicitalabOAuthError(`LicitaLAB rechazó el canje del código (HTTP ${res.status}${body?.error ? `: ${body.error}` : ''}).`)
  }

  const now = Date.now()
  const expiresDeclared = typeof body.expires_in === 'number' && body.expires_in > 0

  return {
    accessToken: body.access_token,
    tokenType: body.token_type ?? 'Bearer',
    scope: body.scope ?? null,
    obtainedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + (expiresDeclared ? (body.expires_in as number) * 1000 : ASSUMED_TOKEN_LIFETIME_MS)).toISOString(),
    expiresDeclared
  }
}

export interface LicitalabLoginResult {
  expiresAt: string
  expiresDeclared: boolean
  clientRegistered: boolean
}

export const loginLicitalabOAuth = async (options: { headed?: boolean } = {}): Promise<LicitalabLoginResult> => {
  await assertIgnoredByGit(CREDENTIALS_PATH)

  const state = await readState()
  let client = state.client
  let clientRegistered = false

  if (!client) {
    client = await registerClient()
    clientRegistered = true
    await writeState({ client, token: state.token })
  }

  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const expectedState = randomBytes(16).toString('base64url')

  const authorizeUrl = new URL(AUTHORIZE_URL)

  for (const [key, value] of Object.entries({
    response_type: 'code',
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: 'mcp',
    state: expectedState,
    resource: LICITALAB_MCP_URL
  })) {
    authorizeUrl.searchParams.set(key, value)
  }

  const callback = waitForCallback(expectedState)

  try {
    await callback.ready
    await completeAuthorizationWithPlaywright(authorizeUrl.toString(), callback.promise, { headed: Boolean(options.headed) })

    const code = await callback.promise
    const token = await exchangeCode(client, code, verifier)

    await writeState({ client, token })

    return { expiresAt: token.expiresAt, expiresDeclared: token.expiresDeclared, clientRegistered }
  } finally {
    callback.promise.catch(() => {})
    await callback.close()
  }
}

/** Token vigente o null. No intenta renovar: el servidor no emite refresh token. */
export const readLicitalabUserAccessToken = async (): Promise<string | null> => {
  const { token } = await readState()

  if (!token) return null
  if (Date.parse(token.expiresAt) - EXPIRY_MARGIN_MS <= Date.now()) return null

  return token.accessToken
}

export interface LicitalabSessionStatus {
  hasCredentials: boolean
  clientRegistered: boolean
  token: { valid: boolean; expiresAt: string; expiresDeclared: boolean; obtainedAt: string } | null
}

export const getLicitalabSessionStatus = async (): Promise<LicitalabSessionStatus> => {
  const { client, token } = await readState()

  const hasCredentials = await readCredentials()
    .then(() => true)
    .catch(() => false)

  return {
    hasCredentials,
    clientRegistered: Boolean(client),
    token: token
      ? {
          valid: Date.parse(token.expiresAt) - EXPIRY_MARGIN_MS > Date.now(),
          expiresAt: token.expiresAt,
          expiresDeclared: token.expiresDeclared,
          obtainedAt: token.obtainedAt
        }
      : null
  }
}

/** Borra el token (conserva el cliente registrado). `--forget-client` también lo elimina. */
export const logoutLicitalabOAuth = async (options: { forgetClient?: boolean } = {}) => {
  if (options.forgetClient) {
    await rm(OAUTH_STATE_PATH, { force: true })

    return
  }

  const state = await readState()

  await writeState({ client: state.client, token: null })
}

/** Marca el token como vencido tras un 401 del servidor, para que `status` diga la verdad. */
export const invalidateLicitalabUserAccessToken = async () => {
  const state = await readState()

  if (!state.token) return

  await writeState({ client: state.client, token: { ...state.token, expiresAt: new Date(0).toISOString() } })
}
