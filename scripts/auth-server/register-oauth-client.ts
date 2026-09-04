/**
 * CLI: registra un cliente OAuth CONFIDENCIAL pre-registrado en el emisor (TASK-1829).
 *
 * Mismo command canónico que la ruta admin (`registerConfidentialClient`) — Full API Parity:
 * Admin Center, CLI y Nexa consumen el mismo primitive. El `client_secret` se imprime UNA sola vez;
 * después sólo persiste su hash.
 *
 *   pnpm auth-server:register-client -- --name "ChatGPT connector" \
 *     --redirect https://chat.example/cb [--redirect ...] [--auth-method client_secret_basic|client_secret_post] \
 *     [--scopes "efeonce.mcp.read efeonce.mcp.globe.read"] [--client-id efeonce-client-xyz]
 *
 * Requiere proxy PG (127.0.0.1:15432) y `.env.local` (perfil ops).
 */
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const parseArgs = (argv: string[]) => {
  const out: { name?: string; redirects: string[]; authMethod?: 'client_secret_basic' | 'client_secret_post'; scopes?: string[]; clientId?: string } = {
    redirects: []
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = () => argv[++i]

    if (arg === '--name') out.name = next()
    else if (arg === '--redirect') out.redirects.push(next())
    else if (arg === '--auth-method') out.authMethod = next() as typeof out.authMethod
    else if (arg === '--scopes') out.scopes = next().split(/\s+/).filter(Boolean)
    else if (arg === '--client-id') out.clientId = next()
  }

  return out
}

const run = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (!args.name || args.redirects.length === 0) {
    console.error('usage: --name <client_name> --redirect <https-uri> [--redirect ...] [--auth-method ...] [--scopes "..."] [--client-id ...]')
    process.exit(2)
  }

  const { registerConfidentialClient } = await import('@/lib/auth-server/oauth/clients')
  const { readAuthServerOAuthConfig } = await import('@/lib/auth-server/oauth/config')
  const { PostgresOAuthStore } = await import('@/lib/auth-server/oauth/store/postgres-store')

  const result = await registerConfidentialClient(
    {
      clientName: args.name,
      redirectUris: args.redirects,
      tokenEndpointAuthMethod: args.authMethod,
      allowedScopes: args.scopes ?? null,
      actor: `cli:${process.env.USER ?? 'unknown'}`,
      clientId: args.clientId
    },
    { store: new PostgresOAuthStore(), config: readAuthServerOAuthConfig() }
  )

  console.log(JSON.stringify({ created: result.created, client_id: result.client.clientId, client_name: result.client.clientName, redirect_uris: result.client.redirectUris, token_endpoint_auth_method: result.client.tokenEndpointAuthMethod, allowed_scopes: result.client.allowedScopes }, null, 2))

  if (result.clientSecret) {
    console.log(`\nclient_secret (se muestra UNA sola vez; guárdalo en Secret Manager):\n${result.clientSecret}`)
  } else {
    console.log('\nEl cliente ya existía: no se re-emite el secret.')
  }
}

run()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
