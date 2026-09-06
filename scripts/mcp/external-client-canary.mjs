#!/usr/bin/env node

import { createHash, randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import http from 'node:http'
import process from 'node:process'

import { createRemoteJWKSet, jwtVerify } from 'jose'

const BASE_SCOPE = 'efeonce.mcp.read'
const CANARY_TOOL = 'get_seo_entitlement'

const parseArgs = argv => {
  const values = new Map()
  const switches = new Set()

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (!argument.startsWith('--')) continue

    const equals = argument.indexOf('=')

    if (equals > 0) {
      values.set(argument.slice(2, equals), argument.slice(equals + 1))
      continue
    }

    const next = argv[index + 1]

    if (next && !next.startsWith('--')) {
      values.set(argument.slice(2), next)
      index += 1
    } else {
      switches.add(argument.slice(2))
    }
  }

  return { values, switches }
}

const usage = () => `
Uso:
  node scripts/mcp/external-client-canary.mjs --env=staging \\
    --issuer=https://auth.example.org --resource=https://mcp.example.org/mcp

Opciones:
  --issuer        Issuer OAuth exacto. También MCP_CANARY_<ENV>_ISSUER.
  --resource      URL MCP exacta. También MCP_CANARY_<ENV>_RESOURCE_URL.
  --scope         Default: ${BASE_SCOPE}.
  --timeout-ms    Espera máxima del callback loopback. Default: 300000.
  --no-open       No abre el navegador; muestra la URL de autorización.
  --preflight     Sólo valida metadata, JWKS y protected-resource.

El script usa DCR público + PKCE S256, conserva code/verifier/tokens sólo en memoria y nunca los imprime.
`

const normalizeOrigin = value => new URL(value).origin

const requireHttpsOrigin = (value, label) => {
  const url = new URL(value)

  if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
    throw new Error(`${label} must be an HTTPS URL without credentials or fragment`)
  }

  return url
}

const fetchJson = async (url, init = {}, expectedStatuses = [200]) => {
  const response = await fetch(url, init)

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`HTTP ${response.status} from ${new URL(url).origin}${new URL(url).pathname}`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON from ${new URL(url).origin}${new URL(url).pathname}`)
  }

  return { response, body: await response.json() }
}

const assertMetadata = (metadata, issuer) => {
  const expected = {
    issuer,
    authorization_endpoint: `${issuer}/oauth/authorize`,
    token_endpoint: `${issuer}/oauth/token`,
    registration_endpoint: `${issuer}/oauth/register`,
    revocation_endpoint: `${issuer}/oauth/revoke`,
    jwks_uri: `${issuer}/.well-known/jwks.json`
  }

  for (const [key, value] of Object.entries(expected)) {
    if (metadata[key] !== value) throw new Error(`Authorization metadata mismatch: ${key}`)
  }

  if (!metadata.code_challenge_methods_supported?.includes('S256')) {
    throw new Error('Authorization server does not advertise PKCE S256')
  }

  if (!metadata.grant_types_supported?.includes('refresh_token')) {
    throw new Error('Authorization server does not advertise refresh_token')
  }
}

const protectedResourceMetadataUrl = resource => new URL('/.well-known/oauth-protected-resource', resource).toString()

const validateDiscovery = async ({ issuer, resource }) => {
  const metadataUrl = `${issuer}/.well-known/oauth-authorization-server`
  const { body: metadata } = await fetchJson(metadataUrl)

  assertMetadata(metadata, issuer)

  const { body: jwks } = await fetchJson(metadata.jwks_uri)

  if (!Array.isArray(jwks.keys) || jwks.keys.length === 0) throw new Error('JWKS publishes no keys')

  const { body: protectedResource } = await fetchJson(protectedResourceMetadataUrl(resource))

  if (protectedResource.resource !== resource) throw new Error('Protected-resource metadata has the wrong resource')

  if (!protectedResource.authorization_servers?.includes(issuer)) {
    throw new Error('Protected-resource metadata does not advertise the requested native issuer')
  }

  return { metadata, jwksKeyCount: jwks.keys.length, authorizationServers: protectedResource.authorization_servers }
}

const createLoopbackReceiver = timeoutMs => {
  let settle
  let reject
  let timer

  const callback = new Promise((resolve, rejectPromise) => {
    settle = resolve
    reject = rejectPromise
  })

  const server = http.createServer((request, response) => {
    const address = server.address()
    const origin = typeof address === 'object' && address ? `http://127.0.0.1:${address.port}` : 'http://127.0.0.1'
    const received = new URL(request.url ?? '/', origin)

    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' })
    response.end('Autorización recibida. Puedes cerrar esta pestaña.')

    clearTimeout(timer)
    settle(received)
  })

  return new Promise((resolve, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        rejectListen(new Error('Unable to bind loopback receiver'))

        return
      }

      timer = setTimeout(() => reject(new Error('Timed out waiting for the OAuth loopback callback')), timeoutMs)

      resolve({
        redirectUri: `http://127.0.0.1:${address.port}/callback`,
        callback,
        close: () => {
          clearTimeout(timer)
          server.close()
        }
      })
    })
  })
}

const openBrowser = url => {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })

  child.unref()
}

const postForm = (url, values, expectedStatuses = [200]) =>
  fetchJson(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams(values)
    },
    expectedStatuses
  )

const parseMcpBody = async response => {
  const text = await response.text()
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('text/event-stream')) {
    const data = text
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trim())
      .find(line => line.startsWith('{'))

    return data ? JSON.parse(data) : null
  }

  return text ? JSON.parse(text) : null
}

let rpcId = 0

const mcpCall = async (resource, accessToken, method, params) => {
  rpcId += 1

  const response = await fetch(resource, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId, method, params })
  })

  if (response.status !== 200) throw new Error(`MCP ${method} returned HTTP ${response.status}`)

  const body = await parseMcpBody(response)

  if (!body || body.error) throw new Error(`MCP ${method} returned a JSON-RPC error`)

  return body.result
}

const validateAccessToken = async ({ token, metadata, issuer, resource, clientId }) => {
  const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri))
  const { payload } = await jwtVerify(token, jwks, { issuer, audience: resource })

  if (payload.azp !== clientId) throw new Error('Access token azp does not match the registered client')
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Access token has no subject')

  if (typeof payload.gv !== 'number' || !Number.isInteger(payload.gv) || payload.gv < 1) {
    throw new Error('Access token has no valid grants version')
  }

  if (typeof payload.scope !== 'string' || !payload.scope.split(' ').includes(BASE_SCOPE)) {
    throw new Error(`Access token does not include ${BASE_SCOPE}`)
  }

  return payload
}

const main = async () => {
  const { values, switches } = parseArgs(process.argv.slice(2))

  if (switches.has('help')) {
    console.log(usage())

    return
  }

  const environment = (values.get('env') ?? 'staging').toUpperCase().replaceAll('-', '_')
  const issuerInput = values.get('issuer') ?? process.env[`MCP_CANARY_${environment}_ISSUER`]
  const resourceInput = values.get('resource') ?? process.env[`MCP_CANARY_${environment}_RESOURCE_URL`]

  if (!issuerInput || !resourceInput)
    throw new Error('Both --issuer and --resource are required (or their MCP_CANARY_<ENV> variables)')

  const issuer = normalizeOrigin(requireHttpsOrigin(issuerInput, 'issuer'))
  const resource = requireHttpsOrigin(resourceInput, 'resource').toString()
  const scope = values.get('scope') ?? BASE_SCOPE
  const timeoutMs = Number(values.get('timeout-ms') ?? 300_000)

  if (!Number.isInteger(timeoutMs) || timeoutMs < 10_000 || timeoutMs > 900_000) {
    throw new Error('--timeout-ms must be an integer between 10000 and 900000')
  }

  const discovery = await validateDiscovery({ issuer, resource })

  if (switches.has('preflight')) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: 'preflight',
          environment: environment.toLowerCase(),
          issuer,
          resource,
          jwksKeyCount: discovery.jwksKeyCount,
          nativeIssuerAdvertised: discovery.authorizationServers.includes(issuer)
        },
        null,
        2
      )
    )

    return
  }

  const receiver = await createLoopbackReceiver(timeoutMs)

  try {
    const { body: registered } = await fetchJson(
      discovery.metadata.registration_endpoint,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_name: `TASK-1832 ${environment.toLowerCase()} canary`,
          redirect_uris: [receiver.redirectUri],
          grant_types: ['authorization_code', 'refresh_token'],
          token_endpoint_auth_method: 'none'
        })
      },
      [201]
    )

    const clientId = registered.client_id

    if (typeof clientId !== 'string' || !clientId) throw new Error('DCR response has no client_id')

    const verifier = randomBytes(48).toString('base64url')
    const challenge = createHash('sha256').update(verifier).digest('base64url')
    const state = randomBytes(24).toString('base64url')
    const authorize = new URL(discovery.metadata.authorization_endpoint)

    authorize.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: receiver.redirectUri,
      scope,
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      resource
    }).toString()

    if (switches.has('no-open')) {
      console.error(`Abre esta URL en el navegador autenticado:\n${authorize.toString()}`)
    } else {
      openBrowser(authorize.toString())
      console.error('Se abrió el navegador para login y consentimiento. Los tokens permanecerán sólo en memoria.')
    }

    const callback = await receiver.callback
    const code = callback.searchParams.get('code')

    if (callback.searchParams.get('state') !== state) throw new Error('OAuth callback state mismatch')
    if (callback.searchParams.get('iss') !== issuer) throw new Error('OAuth callback issuer mismatch')
    if (!code) throw new Error(`OAuth authorization failed: ${callback.searchParams.get('error') ?? 'missing_code'}`)

    const { body: initial } = await postForm(discovery.metadata.token_endpoint, {
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      redirect_uri: receiver.redirectUri,
      code_verifier: verifier
    })

    if (typeof initial.access_token !== 'string' || typeof initial.refresh_token !== 'string') {
      throw new Error('Token endpoint did not return an access/refresh pair')
    }

    const initialClaims = await validateAccessToken({
      token: initial.access_token,
      metadata: discovery.metadata,
      issuer,
      resource,
      clientId
    })

    await mcpCall(resource, initial.access_token, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'task-1832-external-canary', version: '1.0.0' }
    })
    const tools = await mcpCall(resource, initial.access_token, 'tools/list', {})

    if (!tools?.tools?.some(tool => tool.name === CANARY_TOOL)) {
      throw new Error(`The canary tool ${CANARY_TOOL} is not visible to the issued token`)
    }

    await mcpCall(resource, initial.access_token, 'tools/call', { name: CANARY_TOOL, arguments: {} })

    const { body: refreshed } = await postForm(discovery.metadata.token_endpoint, {
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: initial.refresh_token,
      scope
    })

    if (typeof refreshed.access_token !== 'string' || typeof refreshed.refresh_token !== 'string') {
      throw new Error('Refresh did not return a rotated access/refresh pair')
    }

    if (refreshed.refresh_token === initial.refresh_token) throw new Error('Refresh token was not rotated')

    const refreshedClaims = await validateAccessToken({
      token: refreshed.access_token,
      metadata: discovery.metadata,
      issuer,
      resource,
      clientId
    })

    if (refreshedClaims.sub !== initialClaims.sub) throw new Error('Subject changed across refresh')

    await postForm(
      discovery.metadata.revocation_endpoint,
      {
        client_id: clientId,
        token: refreshed.refresh_token,
        token_type_hint: 'refresh_token'
      },
      [200]
    )

    const revokedRefresh = await postForm(
      discovery.metadata.token_endpoint,
      {
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: refreshed.refresh_token
      },
      [400]
    )

    if (revokedRefresh.body.error !== 'invalid_grant')
      throw new Error('Revoked refresh token did not fail as invalid_grant')

    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: 'interactive',
          environment: environment.toLowerCase(),
          issuer,
          audience: resource,
          redirect: 'loopback-127.0.0.1-dynamic-port',
          registration: 'DCR-public-none',
          clientId,
          subjectFingerprint: createHash('sha256').update(initialClaims.sub).digest('hex').slice(0, 16),
          claims: {
            iss: initialClaims.iss,
            aud: initialClaims.aud,
            azpMatchesClient: initialClaims.azp === clientId,
            scope: initialClaims.scope,
            gv: initialClaims.gv,
            expPresent: typeof initialClaims.exp === 'number'
          },
          canaryTool: CANARY_TOOL,
          refreshRotated: true,
          oauthFamilyRevoked: true,
          authorityRevocationRequiredSeparately: true
        },
        null,
        2
      )
    )
  } finally {
    receiver.close()
  }
}

main().catch(error => {
  console.error(
    JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unexpected canary failure' })
  )
  process.exitCode = 1
})
