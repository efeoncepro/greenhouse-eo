/**
 * Registra (o actualiza) la fila del emisor propio en `greenhouse_core.external_identity_environments`
 * por el command canónico de TASK-1631 (`upsertExternalIdentityEnvironment`: tx + audit + outbox),
 * NUNCA por SQL. Idempotente. Se deja en `draft` hasta que TASK-1829 emita tokens reales; pasar a
 * `active` es un segundo POST/corrida con `--status active`.
 *
 *   pnpm auth-server:register-issuer-environment [--status draft|active] [--environment-id efeonce-auth]
 *
 * Requiere proxy PG (127.0.0.1:15432) + `.env.local` (perfil ops).
 */
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(name)

  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}

const run = async () => {
  const { upsertExternalIdentityEnvironment } = await import('@/lib/identity/external-access')
  const { readAuthServerOAuthConfig } = await import('@/lib/auth-server/oauth/config')

  const config = readAuthServerOAuthConfig()
  const status = arg('--status', 'draft')

  if (status !== 'draft' && status !== 'active') throw new Error('--status must be draft|active')

  const result = await upsertExternalIdentityEnvironment(
    {
      environmentId: arg('--environment-id', config.environmentId),
      displayName: 'Efeonce Auth',
      provider: 'efeonce_auth',
      issuerUrl: config.issuer,
      jwksUri: `${config.issuer}/.well-known/jwks.json`,
      audience: config.mcpAudience,
      issuerClass: 'external',
      subjectType: 'public',
      status,
      notes: 'Authorization server propio de Efeonce (EPIC-044 / TASK-1828-1829). Registrado por CLI.'
    },
    { actorId: `cli:${process.env.USER ?? 'unknown'}` }
  )

  console.log(JSON.stringify(result, null, 2))
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
