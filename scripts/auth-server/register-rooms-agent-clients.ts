/**
 * CLI: registra los dos clientes del carril CLI de agentes de Rooms en el emisor (TASK-2095, enmienda D1-bis).
 *
 *   pnpm auth-server:register-rooms-agent-clients -- --secret-out ~/.config/efeonce-rooms/resource-client-secret
 *
 * - `efeonce-rooms-cli`: público first-party, PKCE por loopback, clases `efeonce.mcp.rooms.*` (sin `read.client`).
 * - `efeonce-rooms-resource`: confidencial de Rooms, solo introspección de su audiencia.
 *
 * Mismo command canónico que cualquier consumidor (`registerRoomsAgentClients`): idempotente por `client_id`. El
 * secreto del cliente confidencial se genera UNA vez y se escribe en `--secret-out` con modo 0600; nunca se imprime
 * (stdout puede quedar en un log o en el contexto de un agente). Exige `AUTH_SERVER_ROOMS_AUDIENCE`.
 *
 * Toca la base compartida del emisor (una sola instancia Cloud SQL): es una mutación de producción. Requiere proxy PG
 * (127.0.0.1:15432) y `.env.local` (perfil ops).
 */
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const argValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag)

  return index >= 0 ? process.argv[index + 1] : undefined
}

const run = async () => {
  const secretOut = argValue('--secret-out')
  const audience = argValue('--audience') ?? process.env.AUTH_SERVER_ROOMS_AUDIENCE

  if (!secretOut || !audience) {
    console.error('usage: --secret-out <path> [--audience https://…] (or AUTH_SERVER_ROOMS_AUDIENCE)')
    process.exit(2)
  }

  const target = resolve(secretOut.replace(/^~(?=\/)/, process.env.HOME ?? '~'))

  if (existsSync(target)) {
    console.error(`refusing to overwrite ${target}`)
    process.exit(2)
  }

  const { registerRoomsAgentClients } = await import('@/lib/auth-server/oauth/clients')
  const { readAuthServerOAuthConfig } = await import('@/lib/auth-server/oauth/config')
  const { PostgresOAuthStore } = await import('@/lib/auth-server/oauth/store/postgres-store')

  const config = readAuthServerOAuthConfig({ ...process.env, AUTH_SERVER_ROOMS_AUDIENCE: audience })
  const result = await registerRoomsAgentClients({ actor: `cli:${process.env.USER ?? 'unknown'}` }, { store: new PostgresOAuthStore(), config })

  if (result.resource.clientSecret) {
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 })
    writeFileSync(target, result.resource.clientSecret, { mode: 0o600, flag: 'wx' })
    chmodSync(target, 0o600)
  }

  console.log(JSON.stringify({
    audience: config.roomsAudience,
    cli: { client_id: result.cli.client.clientId, created: result.cli.created, status: result.cli.client.status, allowed_scopes: result.cli.client.allowedScopes, redirect_uris: result.cli.client.redirectUris },
    resource: { client_id: result.resource.client.clientId, created: result.resource.created, status: result.resource.client.status, secret_written_to: result.resource.clientSecret ? target : null }
  }, null, 2))
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
