/** Local operator adapter. No runtime route, environment token, or browser credential extraction. */
import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { open } from 'node:fs/promises'

import { OAuth2Client } from 'google-auth-library'

import { GoogleAdsClient } from '../../src/lib/growth/google-ads/client'
import { GOOGLE_ADS_PROFILE as profile, GOOGLE_ADS_SCOPE, GoogleAdsError } from '../../src/lib/growth/google-ads/contracts'

export type AdsCredential = {
  type: 'authorized_user'; client_id: string; client_secret: string; refresh_token: string
  authorized_email: string; subject: string; target_customer_id: string; cloud_project: string
}

export function validateCredential(value: unknown): AdsCredential {
  const d = value as Partial<AdsCredential> | null

  if (!d || d.type !== 'authorized_user' || d.client_id !== profile.clientId || d.authorized_email !== profile.authorizedEmail || d.target_customer_id !== profile.customerId || d.cloud_project !== profile.cloudProject) throw new GoogleAdsError('OAUTH_BINDING_MISMATCH', 3)

  for (const key of ['client_secret', 'refresh_token', 'subject'] as const) {
    if (typeof d[key] !== 'string' || !d[key] || d[key]!.length > 8192 || /\s/.test(d[key]!)) throw new GoogleAdsError('INVALID_OAUTH_CREDENTIAL', 3)
  }

  return { type: 'authorized_user', client_id: d.client_id, client_secret: d.client_secret!, refresh_token: d.refresh_token!, authorized_email: d.authorized_email, subject: d.subject!, target_customer_id: d.target_customer_id, cloud_project: d.cloud_project }
}

function cloud(args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('gcloud', [...args, '--account', profile.cloudIdentity, '--project', profile.cloudProject, '--quiet'], { stdio: ['pipe', 'pipe', 'pipe'] })
    const out: Buffer[] = []
    let size = 0
    const timer = setTimeout(() => { child.kill(); reject(new GoogleAdsError('CLOUD_COMMAND_TIMEOUT', 3)) }, 30000)

    child.stdout.on('data', (part: Buffer) => {
      size += part.length
      if (size > 128 * 1024) { child.kill(); reject(new GoogleAdsError('CLOUD_RESPONSE_TOO_LARGE', 3)) } else out.push(part)
    })
    // Never retain gcloud stderr: it may contain diagnostic credentials or paths.
    child.stderr.resume()
    child.on('error', () => { clearTimeout(timer); reject(new GoogleAdsError('CLOUD_COMMAND_UNAVAILABLE', 3)) })
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(Buffer.concat(out).toString('utf8').trim()) : reject(new GoogleAdsError('CLOUD_COMMAND_FAILED', 3)) })
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
}

export async function assertCloudIdentity() {
  const identity = await cloud(['config', 'get-value', 'account'])

  if (identity !== profile.cloudIdentity) throw new GoogleAdsError('CLOUD_IDENTITY_MISMATCH', 3)
}

export async function privateJson(path: string) {
  let file

  try {
    file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW)
    const stat = await file.stat()

    if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.size > 65536 || (process.getuid && stat.uid !== process.getuid())) throw new GoogleAdsError('PRIVATE_FILE_REQUIRES_OWNER_MODE_0600', 2)

    return JSON.parse(await file.readFile('utf8')) as unknown
  } catch (e) { throw e instanceof GoogleAdsError ? e : new GoogleAdsError('PRIVATE_JSON_UNAVAILABLE', 2) }
  finally { await file?.close() }
}

/** Refresh and verify with Google, not just untrusted local email metadata. */
export function credentialTokenProvider(credential: AdsCredential) {
  let pending: Promise<string> | undefined

  return () => pending ??= (async () => {
    try {
      const client = new OAuth2Client({ clientId: credential.client_id, clientSecret: credential.client_secret, transporterOptions: { timeout: 30000, retry: false } })

      client.setCredentials({ refresh_token: credential.refresh_token })
      const { token } = await client.getAccessToken()

      if (!token) throw new GoogleAdsError('OAUTH_ACCESS_TOKEN_MISSING', 3)
      const info = await client.getTokenInfo(token)

      if (info.aud !== profile.clientId || !info.scopes.includes(GOOGLE_ADS_SCOPE)) throw new GoogleAdsError('OAUTH_SCOPE_OR_AUDIENCE_MISMATCH', 3)
      const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { Authorization: `Bearer ${token}` } })

      if (!response.ok) throw new GoogleAdsError('OAUTH_IDENTITY_UNAVAILABLE', 3)
      const identity = await response.json() as { email?: string; email_verified?: boolean; sub?: string }

      if (identity.email !== profile.authorizedEmail || identity.email_verified !== true || identity.sub !== credential.subject) throw new GoogleAdsError('OAUTH_PRINCIPAL_MISMATCH', 3)

      return token
    } catch (e) { throw e instanceof GoogleAdsError ? e : new GoogleAdsError('OAUTH_REFRESH_OR_IDENTITY_FAILED', 3) }
  })()
}

export async function operatorTokenProvider() {
  await assertCloudIdentity()
  let value: unknown

  try { value = JSON.parse(await cloud(['secrets', 'versions', 'access', 'latest', '--secret', profile.secretName])) } catch { throw new GoogleAdsError('ADS_OAUTH_SECRET_UNAVAILABLE', 3) }

  return credentialTokenProvider(validateCredential(value))
}

/** Explicit migration of an authorized grant, not implicit use of the discovery file. */
export async function importCredential(path: string) {
  await assertCloudIdentity()
  const credential = validateCredential(await privateJson(path))
  const tokenProvider = credentialTokenProvider(credential)
  const client = new GoogleAdsClient({ tokenProvider })

  await client.verifyIdentity()

  // Read metadata first. Only a confirmed missing resource permits creation.
  const secretExists = await new Promise<boolean>((resolve, reject) => {
    const child = spawn('gcloud', ['secrets', 'list', '--filter', `name:${profile.secretName}`, '--format=value(name)', '--account', profile.cloudIdentity, '--project', profile.cloudProject, '--quiet'], { stdio: ['ignore', 'pipe', 'ignore'] })
    let out = ''
    const timer = setTimeout(() => { child.kill(); reject(new GoogleAdsError('CLOUD_COMMAND_TIMEOUT', 3)) }, 30000)

    child.stdout.on('data', (part: Buffer) => { out += part.toString(); if (out.length > 8192) child.kill() })
    child.on('error', () => { clearTimeout(timer); reject(new GoogleAdsError('CLOUD_COMMAND_UNAVAILABLE', 3)) })
    child.on('close', code => { clearTimeout(timer); code === 0 ? resolve(out.split(/\s+/).some(n => n.endsWith('/' + profile.secretName) || n === profile.secretName)) : reject(new GoogleAdsError('CLOUD_COMMAND_FAILED', 3)) })
  })

  if (!secretExists) await cloud(['secrets', 'create', profile.secretName, '--replication-policy=automatic'])
  const versionName = await cloud(['secrets', 'versions', 'add', profile.secretName, '--data-file=-', '--format=value(name)'], JSON.stringify(credential))

  if (!new RegExp(`^projects/[A-Za-z0-9_-]+/secrets/${profile.secretName}/versions/[0-9]+$`).test(versionName)) throw new GoogleAdsError('SECRET_VERSION_RECEIPT_UNAVAILABLE', 3)

  return { authorizedEmail: profile.authorizedEmail, customerId: profile.customerId, cloudIdentity: profile.cloudIdentity, secretVersion: versionName, identity: await client.verifyIdentity() }
}
