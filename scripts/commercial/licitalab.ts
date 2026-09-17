import 'server-only'

import { join } from 'node:path'
import { parseArgs } from 'node:util'

import { config as loadEnv } from 'dotenv'

import {
  findLicitalabOpportunity,
  getLicitalabProviderReport,
  LICITALAB_APPLICATION_MODES,
  LICITALAB_COUNTRIES,
  LICITALAB_OPPORTUNITY_TYPES,
  LICITALAB_PROVIDER_INCLUDES,
  LICITALAB_TIME_PERIODS,
  LicitalabConfigurationError,
  listLicitalabOpportunityDocuments,
  listLicitalabTools,
  searchLicitalabOpportunityDocuments,
  searchLicitalabSupport,
  type LicitalabApplicationMode,
  type LicitalabCountry,
  type LicitalabOpportunityType,
  type LicitalabProviderInclude,
  type LicitalabTimePeriod,
  type LicitalabToolResult
} from '@/lib/commercial/tenders/licitalab/client'

import { formatLicitalabResult } from './licitalab-format'
import {
  getLicitalabSessionStatus,
  invalidateLicitalabUserAccessToken,
  LicitalabOAuthError,
  loginLicitalabOAuth,
  logoutLicitalabOAuth,
  readLicitalabUserAccessToken
} from './licitalab-oauth'

/**
 * CLI de LicitaLAB — `pnpm licitalab`. Lectura sobre compras públicas (Mercado Público CL, PE, CO) vía el
 * cliente canónico `src/lib/commercial/tenders/licitalab/client.ts`. La API key se resuelve server-side desde
 * LICITALAB_API_KEY_SECRET_REF (Secret Manager `greenhouse-licitalab-api-key`); nunca se imprime.
 *
 * Dos credenciales (2026-09-17):
 *   - API key (Secret Manager): `documents`, `ask-docs`, `support`, `tools`.
 *   - Sesión OAuth de usuario (`.auth/licitalab-mcp-oauth.json`, local): `opportunity` y `provider`, que LicitaLAB
 *     responde `unsupported` con la key. Si no hay token vigente, esos comandos hacen `login` automático con
 *     Playwright + la credencial de `pnpm licitalab:radar:setup` (salvo `--no-login`). El servidor no emite refresh
 *     token: cada vencimiento repite el login. Ver `licitalab-oauth.ts`.
 *
 * Uso:
 *   pnpm licitalab login [--headed] · pnpm licitalab session · pnpm licitalab logout [--forget-client]
 *   pnpm licitalab tools
 *   pnpm licitalab documents <código> [--country CL]
 *   pnpm licitalab ask-docs <código> "<pregunta>" [--top-k 10] [--country CL]
 *   pnpm licitalab opportunity <código> [--country CL|PE|CO] [--type <type>] [--buyer <entidad>]   (OAuth)
 *   pnpm licitalab provider <RUT|RUC|NIT> [--period sc_last_year] [--opportunity-type tenders]
 *                          [--mode awarded] [--include recent_awarded_items,lost_items_pricing]
 *                          [--limit 50] [--order-by amount] [--cursor <cursor>] [--country CL]
 *   pnpm licitalab support "<pregunta>" [--country CL|PE]
 *
 * Flags generales:
 *   --json      Imprime el payload crudo (para agentes y pipes)
 *   --timeout   Milisegundos por request (default 60000)
 *
 * Exit codes: 0 ok · 1 error de la tool/transporte · 2 uso inválido · 3 sin configurar o sin sesión.
 */

loadEnv({ path: join(process.cwd(), '.env.local') })

const USAGE = `Uso: pnpm licitalab <comando> [argumentos] [flags]

Comandos:
  tools                                Lista las tools disponibles
  documents <código>                   Documentos de la oportunidad
  ask-docs <código> "<pregunta>"       Busca en bases y anexos (--top-k 1-20)
  support "<pregunta>"                 Busca en la ayuda de LicitaLAB

Con sesión OAuth de usuario (login automático si no hay token; --no-login para impedirlo):
  opportunity <código>                 Detalle de una oportunidad (--type, --buyer si hay varias)
  provider <RUT|RUC|NIT>               Reporte de proveedor (--period, --opportunity-type, --mode,
                                       --include, --limit 1-50, --order-by recent|amount, --cursor)

Sesión:
  login [--headed]                     Autoriza con Playwright y la credencial de licitalab:radar:setup
  session                              Estado del token (nunca lo imprime)
  logout [--forget-client]             Borra el token (y el cliente OAuth registrado)

Flags: --country CL|PE|CO · --json · --timeout <ms> · --help`

class UsageError extends Error {}

/** Tools que, al 2026-09-17, responden `unsupported` con API key porque exigen sesión OAuth. */
const OAUTH_ONLY_COMMANDS = new Set(['opportunity', 'provider'])

class MissingSessionError extends Error {}

const describeExpiry = (expiresAt: string, declared: boolean) => {
  const minutes = Math.round((Date.parse(expiresAt) - Date.now()) / 60_000)

  return `${declared ? 'vence' : 'se asume que vence'} ${expiresAt} (${minutes} min)`
}

/** Token vigente; si no hay, hace login salvo `--no-login`. */
const resolveUserAccessToken = async (allowLogin: boolean, headed: boolean): Promise<string> => {
  const existing = await readLicitalabUserAccessToken()

  if (existing) return existing

  if (!allowLogin) {
    throw new MissingSessionError('No hay sesión OAuth vigente de LicitaLAB. Ejecuta `pnpm licitalab login`.')
  }

  console.error('Sin sesión OAuth vigente: autorizando en LicitaLAB con Playwright…')

  const login = await loginLicitalabOAuth({ headed })

  console.error(`Sesión lista; ${describeExpiry(login.expiresAt, login.expiresDeclared)}.`)

  const token = await readLicitalabUserAccessToken()

  if (!token) throw new MissingSessionError('El login terminó pero no quedó un token vigente.')

  return token
}

const assertEnum = <T extends string>(flag: string, value: string | undefined, allowed: readonly T[]): T | undefined => {
  if (value === undefined) return undefined

  if (!(allowed as readonly string[]).includes(value)) {
    throw new UsageError(`${flag} inválido: "${value}". Valores: ${allowed.join(', ')}`)
  }

  return value as T
}

const parseIntFlag = (flag: string, value: string | undefined, min: number, max: number) => {
  if (value === undefined) return undefined

  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new UsageError(`${flag} debe ser un entero entre ${min} y ${max}.`)
  }

  return parsed
}

const requirePositional = (positionals: string[], index: number, label: string) => {
  const value = positionals[index]?.trim()

  if (!value) throw new UsageError(`Falta ${label}.`)

  return value
}

const main = async (): Promise<number> => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      country: { type: 'string' },
      type: { type: 'string' },
      buyer: { type: 'string' },
      'top-k': { type: 'string' },
      period: { type: 'string' },
      'opportunity-type': { type: 'string' },
      mode: { type: 'string' },
      include: { type: 'string' },
      limit: { type: 'string' },
      'order-by': { type: 'string' },
      cursor: { type: 'string' },
      json: { type: 'boolean', default: false },
      'no-login': { type: 'boolean', default: false },
      headed: { type: 'boolean', default: false },
      'forget-client': { type: 'boolean', default: false },
      timeout: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false }
    }
  })

  const [command, ...args] = positionals

  if (values.help || !command) {
    console.log(USAGE)

    return values.help ? 0 : 2
  }

  const country = assertEnum<LicitalabCountry>('--country', values.country?.toUpperCase(), LICITALAB_COUNTRIES)
  const timeoutMs = parseIntFlag('--timeout', values.timeout, 1_000, 600_000)
  const options = { timeoutMs }

  const allowLogin = !values['no-login']
  const headed = Boolean(values.headed)

  switch (command) {
    case 'login': {
      const login = await loginLicitalabOAuth({ headed })

      console.log(`Sesión OAuth de LicitaLAB lista${login.clientRegistered ? ' (cliente OAuth registrado)' : ''}; ${describeExpiry(login.expiresAt, login.expiresDeclared)}.`)

      return 0
    }

    case 'session': {
      const status = await getLicitalabSessionStatus()

      if (values.json) {
        console.log(JSON.stringify(status, null, 2))
      } else {
        console.log(`Credencial local (radar:setup): ${status.hasCredentials ? 'sí' : 'no'}`)
        console.log(`Cliente OAuth registrado: ${status.clientRegistered ? 'sí' : 'no'}`)
        console.log(
          status.token
            ? `Token: ${status.token.valid ? 'vigente' : 'vencido'}; ${describeExpiry(status.token.expiresAt, status.token.expiresDeclared)}`
            : 'Token: no hay'
        )
      }

      return status.token?.valid ? 0 : 3
    }

    case 'logout':
      await logoutLicitalabOAuth({ forgetClient: Boolean(values['forget-client']) })
      console.log(values['forget-client'] ? 'Token y cliente OAuth eliminados.' : 'Token eliminado.')

      return 0
  }

  // Comandos de sesión de usuario: se reintenta UNA vez si el token guardado fue rechazado.
  const withUserSession = async (run: (userAccessToken: string) => Promise<LicitalabToolResult>) => {
    const first = await run(await resolveUserAccessToken(allowLogin, headed))

    if (first.ok || first.httpStatus !== 401) return first

    await invalidateLicitalabUserAccessToken()

    return run(await resolveUserAccessToken(allowLogin, headed))
  }

  let result: LicitalabToolResult

  switch (command) {
    case 'tools':
      result = await listLicitalabTools(options)
      break

    case 'opportunity':
    {
      const code = requirePositional(args, 0, 'el código de la oportunidad')

      result = await withUserSession(userAccessToken =>
        findLicitalabOpportunity({ code, country, type: values.type, buyer: values.buyer }, { ...options, userAccessToken })
      )
      break
    }

    case 'documents':
      result = await listLicitalabOpportunityDocuments(
        { code: requirePositional(args, 0, 'el código de la oportunidad'), country },
        options
      )
      break

    case 'ask-docs':
      result = await searchLicitalabOpportunityDocuments(
        {
          code: requirePositional(args, 0, 'el código de la oportunidad'),
          query: requirePositional(args, 1, 'la pregunta sobre los documentos'),
          topK: parseIntFlag('--top-k', values['top-k'], 1, 20),
          country
        },
        options
      )
      break

    case 'provider': {
      const include = values.include
        ?.split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .map(item => assertEnum<LicitalabProviderInclude>('--include', item, LICITALAB_PROVIDER_INCLUDES) as LicitalabProviderInclude)

      const providerInput = {
        taxNumber: requirePositional(args, 0, 'el RUT, RUC o NIT del proveedor'),
        country,
        timePeriod: assertEnum<LicitalabTimePeriod>('--period', values.period, LICITALAB_TIME_PERIODS),
        opportunityType: assertEnum<LicitalabOpportunityType>('--opportunity-type', values['opportunity-type'], LICITALAB_OPPORTUNITY_TYPES),
        applicationMode: assertEnum<LicitalabApplicationMode>('--mode', values.mode, LICITALAB_APPLICATION_MODES),
        include: include?.length ? include : undefined,
        limit: parseIntFlag('--limit', values.limit, 1, 50),
        orderBy: assertEnum('--order-by', values['order-by'], ['recent', 'amount'] as const),
        cursor: values.cursor
      }

      result = await withUserSession(userAccessToken => getLicitalabProviderReport(providerInput, { ...options, userAccessToken }))
      break
    }

    case 'support':
      if (country === 'CO') throw new UsageError('La ayuda de LicitaLAB sólo filtra por CL o PE.')

      result = await searchLicitalabSupport({ question: requirePositional(args, 0, 'la pregunta'), country }, options)
      break

    default:
      throw new UsageError(`Comando desconocido: "${command}".`)
  }

  if (!result.ok) {
    if (values.json) {
      console.log(
        JSON.stringify({ ok: false, tool: result.tool, httpStatus: result.httpStatus, status: result.status, error: result.errorDetail }, null, 2)
      )
    } else {
      console.error(`LicitaLAB (${result.tool}) falló: ${result.errorDetail}`)

      if (result.status === 'unsupported' && OAUTH_ONLY_COMMANDS.has(command)) {
        console.error('\nLicitaLAB no aceptó la sesión de usuario para esta consulta. Revisa `pnpm licitalab session`.')
      }
    }

    return 1
  }

  console.log(
    values.json
      ? JSON.stringify(result.payload, null, 2)
      : formatLicitalabResult(command, result.payload, { topK: parseIntFlag('--top-k', values['top-k'], 1, 20) })
  )

  return 0
}

main()
  .then(code => process.exit(code))
  .catch(error => {
    if (error instanceof UsageError) {
      console.error(`${error.message}\n\n${USAGE}`)
      process.exit(2)
    }

    if (error instanceof LicitalabConfigurationError || error instanceof MissingSessionError || error instanceof LicitalabOAuthError) {
      console.error(error.message)
      process.exit(3)
    }

    if (error instanceof TypeError && 'code' in error && String(error.code).startsWith('ERR_PARSE_ARGS')) {
      console.error(`${error.message}\n\n${USAGE}`)
      process.exit(2)
    }

    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
