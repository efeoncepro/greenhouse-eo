#!/usr/bin/env tsx
/**
 * Prepare or smoke the signed draft-only greenhouse-wp-bridge contract.
 *
 * Default mode is non-mutating: it builds the JSON payload and redacted HMAC
 * headers so agents can verify the contract shape without sending a write.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  DEFAULT_PUBLIC_SITE_WORDPRESS_BASE_URL,
  parsePublicSiteBridgeSecretRef
} from '../../src/lib/public-site/bridge-inspection'
import {
  PUBLIC_SITE_BRIDGE_DRAFT_CONTRACT_VERSION,
  signPublicSiteBridgeRequest
} from '../../src/lib/public-site/bridge-signing'

type CliOptions = {
  manifestId: string
  title: string
  slug: string
  method: 'GET' | 'POST' | 'PATCH'
  postType: 'page' | 'post' | 'landing'
  status: 'draft' | 'private'
  send: boolean
  help: boolean
}

const loadEnvFile = (relativePath: string) => {
  try {
    const contents = readFileSync(resolve(process.cwd(), relativePath), 'utf8')

    for (const rawLine of contents.split('\n')) {
      const line = rawLine.trim()

      if (!line || line.startsWith('#')) continue

      const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line
      const eq = normalizedLine.indexOf('=')

      if (eq <= 0) continue

      const key = normalizedLine.slice(0, eq).trim()

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue

      let value = normalizedLine.slice(eq + 1).trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }

    return true
  } catch {
    return false
  }
}

const loadedEnvFiles = ['.env.local', '.env'].filter(loadEnvFile)

const parseArgs = (argv: string[]): CliOptions => {
  const normalizedArgv = argv[0] === '--' ? argv.slice(1) : argv

  const options: CliOptions = {
    manifestId: 'greenhouse-contract-smoke',
    title: 'Greenhouse Contract Smoke',
    slug: 'greenhouse-contract-smoke',
    method: 'POST',
    postType: 'page',
    status: 'draft',
    send: false,
    help: false
  }

  for (let i = 0; i < normalizedArgv.length; i += 1) {
    const arg = normalizedArgv[i]

    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }

    if (arg === '--manifest-id') {
      options.manifestId = normalizedArgv[i + 1] ?? ''
      i += 1
      continue
    }

    if (arg === '--title') {
      options.title = normalizedArgv[i + 1] ?? ''
      i += 1
      continue
    }

    if (arg === '--slug') {
      options.slug = normalizedArgv[i + 1] ?? ''
      i += 1
      continue
    }

    if (arg === '--post-type') {
      const postType = normalizedArgv[i + 1]

      if (postType === 'page' || postType === 'post' || postType === 'landing') options.postType = postType
      i += 1
      continue
    }

    if (arg === '--method') {
      const method = normalizedArgv[i + 1]?.toUpperCase()

      if (method !== 'GET' && method !== 'POST' && method !== 'PATCH') {
        throw new Error('--method must be GET, POST or PATCH')
      }

      options.method = method
      i += 1
      continue
    }

    if (arg === '--private') {
      options.status = 'private'
      continue
    }

    if (arg === '--send') {
      options.send = true
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

const printHelp = () => {
  console.log(`Usage:
  pnpm public-website:bridge-draft-contract
  pnpm public-website:bridge-draft-contract -- --manifest-id landing.demo --title "Demo" --slug demo
  pnpm public-website:bridge-draft-contract -- --method GET --manifest-id greenhouse-contract-smoke --send
  pnpm public-website:bridge-draft-contract -- --send

Default mode is non-mutating and prints redacted signed headers.

Required env for --send:
  PUBLIC_WEBSITE_WORDPRESS_BASE_URL (optional, defaults to ${DEFAULT_PUBLIC_SITE_WORDPRESS_BASE_URL})
  PUBLIC_WEBSITE_WORDPRESS_USERNAME
  PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF
  PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF

Loaded env files: ${loadedEnvFiles.length ? loadedEnvFiles.join(', ') : '(none)'}`)
}

const resolveSecretValue = (rawRef: string | undefined) => {
  const secretRef = parsePublicSiteBridgeSecretRef(rawRef)

  if (!secretRef) return null

  try {
    return execFileSync(
      'gcloud',
      ['secrets', 'versions', 'access', secretRef.version, '--secret', secretRef.secret, '--project', secretRef.project],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    ).trim()
  } catch {
    return null
  }
}

const buildBasicAuthHeader = () => {
  const username = process.env.PUBLIC_WEBSITE_WORDPRESS_USERNAME?.trim()
  const applicationPassword = resolveSecretValue(process.env.PUBLIC_WEBSITE_WORDPRESS_APPLICATION_PASSWORD_SECRET_REF)

  if (!username || !applicationPassword) return null

  return `Basic ${Buffer.from(`${username}:${applicationPassword}`, 'utf8').toString('base64')}`
}

const redactHeaders = (headers: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase().includes('signature') ? `${value.slice(0, 18)}...redacted` : value
    ])
  )

const main = async () => {
  const options = parseArgs(process.argv.slice(2))

  if (options.help) {
    printHelp()

    return
  }

  const resolvedSharedSecret = resolveSecretValue(process.env.PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF)
  const sharedSecret = resolvedSharedSecret || (!options.send ? 'local-contract-test-secret' : null)

  if (!sharedSecret) {
    throw new Error('PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF is not configured or could not be resolved')
  }

  const payload = {
    contractVersion: PUBLIC_SITE_BRIDGE_DRAFT_CONTRACT_VERSION,
    greenhouseManifestId: options.manifestId,
    postType: options.postType,
    status: options.status,
    title: options.title,
    slug: options.slug,
    content: '<!-- wp:paragraph --><p>Greenhouse draft contract smoke.</p><!-- /wp:paragraph -->'
  }

  const body = options.method === 'GET' ? '' : JSON.stringify(payload)

  const route =
    options.method === 'POST'
      ? '/greenhouse-wp-bridge/v1/drafts'
      : `/greenhouse-wp-bridge/v1/drafts/${encodeURIComponent(options.manifestId)}`

  const signed = signPublicSiteBridgeRequest({
    method: options.method,
    route,
    body,
    secret: sharedSecret,
    actor: process.env.USER || 'greenhouse-operator',
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'local'
  })

  const baseUrl = (process.env.PUBLIC_WEBSITE_WORDPRESS_BASE_URL || DEFAULT_PUBLIC_SITE_WORDPRESS_BASE_URL).replace(
    /\/+$/,
    ''
  )

  if (!options.send) {
    console.log(
      JSON.stringify(
        {
          mode: 'dry_run',
          sendsWordPressWrite: false,
          method: options.method,
          route,
          url: `${baseUrl}/wp-json${route}`,
          body: body ? JSON.parse(body) : null,
          sharedSecretSource: resolvedSharedSecret ? 'secret_manager' : 'synthetic_dry_run',
          signedHeaders: redactHeaders(signed.headers),
          canonicalRequestPreview: signed.canonicalRequest
        },
        null,
        2
      )
    )

    return
  }

  const authorization = buildBasicAuthHeader()

  if (!authorization) {
    throw new Error('WordPress Application Password auth is not configured')
  }

  const response = await fetch(`${baseUrl}/wp-json${route}`, {
    method: options.method,
    headers: {
      accept: 'application/json',
      authorization,
      'content-type': 'application/json',
      ...signed.headers
    },
    body: body || undefined
  })

  const responseBody = await response.json().catch(() => null)

  console.log(
    JSON.stringify(
      {
        mode: 'send',
        status: response.status,
        ok: response.ok,
        body: responseBody
      },
      null,
      2
    )
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
