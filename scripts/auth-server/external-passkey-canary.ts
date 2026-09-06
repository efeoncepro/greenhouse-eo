/**
 * TASK-1832 — registro + login con una passkey de plataforma real en Chrome.
 *
 * El backend no tiene superficie de alta todavía (follow-up de TASK-1835), así que este runner
 * autentica el profile sintético con un magic link de bootstrap guardado sólo en memoria y ejecuta
 * la ceremonia WebAuthn dentro del origen real. No usa el SoftwareAuthenticator de tests ni CDP.
 * Nunca imprime subject, correo, cookie, token, challenge, credential id o payload WebAuthn.
 *
 * La passkey queda activa para la ventana canary. El cierre gobernado la revoca primero y el cleanup
 * de TASK-1832 elimina después su clave pública junto con los demás artefactos run-owned.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { chromium } from 'playwright'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const valueAfter = (flag: string): string | null => {
  const inline = process.argv.find(value => value.startsWith(`${flag}=`))

  if (inline) return inline.slice(flag.length + 1)
  const index = process.argv.indexOf(flag)

  return index >= 0 ? (process.argv[index + 1] ?? null) : null
}

const registrationId = valueAfter('--registration') ?? ''
const profileId = valueAfter('--profile-id') ?? ''
const runId = valueAfter('--run-id') ?? ''
const diagnoseSessions = process.argv.includes('--diagnose-sessions')
const host = (valueAfter('--host') ?? process.env.AUTH_SERVER_ISSUER ?? 'https://auth.efeonce.org').replace(/\/$/, '')
const environmentId = process.env.AUTH_SERVER_ENVIRONMENT_ID?.trim() || 'efeonce-auth'

if (!/^xcr-[0-9a-f-]{36}$/.test(registrationId)) throw new Error('--registration must be an exact xcr id')
if (!profileId || profileId.length > 512) throw new Error('--profile-id is required')
if (!/^[a-z0-9][a-z0-9_-]{2,127}$/.test(runId)) throw new Error('--run-id must match the manifest run_id')
if (new URL(host).protocol !== 'https:') throw new Error('--host must use HTTPS')

const projectRoot = path.resolve(process.cwd())
const browserProfile = path.join(projectRoot, '.auth', `passkey-${runId}`)
const capturedAt = new Date().toISOString()

const captureDir = path.join(
  projectRoot,
  '.captures',
  `task-1832-passkey-${capturedAt.replaceAll(':', '-').replace(/\.\d{3}Z$/, 'Z')}`
)

const fingerprint = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 16)

const ensure: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) throw new Error(message)
}

type OwnedIdentityRow = {
  subject: string
  data_origin: string
  profile_active: boolean
  profile_status: string
  link_active: boolean
  registration_status: string
  registration_expires_at: Date
  binding_status: string
  binding_expires_at: Date
}

const main = async () => {
  const [{ query, closeGreenhousePostgres }, { PostgresPersonAuthStore }, { sha256Hex }] = await Promise.all([
    import('@/lib/db'),
    import('@/lib/auth-server/persons/store/postgres-store'),
    import('@/lib/auth-server/oauth/primitives')
  ])

  const store = new PostgresPersonAuthStore()
  let subject: string | null = null
  let registeredCredentialFingerprint: string | null = null
  let completed = false
  let context: Awaited<ReturnType<typeof chromium.launchPersistentContext>> | null = null

  try {
    const owned = await query<OwnedIdentityRow>(
      `SELECT l.source_object_id AS subject,p.data_origin,p.active AS profile_active,p.status AS profile_status,
              l.active AS link_active,r.status AS registration_status,r.expires_at AS registration_expires_at,
              b.status AS binding_status,b.expires_at AS binding_expires_at
         FROM greenhouse_core.external_canary_registrations r
         JOIN greenhouse_core.external_organization_bindings b
           ON b.canary_registration_id=r.canary_registration_id AND b.binding_purpose='canary'
         JOIN greenhouse_core.external_member_invitations i ON i.binding_id=b.binding_id AND i.profile_id=$2
         JOIN greenhouse_core.identity_profiles p ON p.profile_id=i.profile_id
         JOIN greenhouse_core.identity_profile_source_links l
           ON l.profile_id=p.profile_id AND l.link_id=i.link_id
        WHERE r.canary_registration_id=$1 AND r.run_id=$3 AND r.environment_id=$4`,
      [registrationId, profileId, runId, environmentId]
    )

    ensure(owned.length === 1, 'profile is not uniquely owned by the declared canary registration')
    const identity = owned[0]!

    subject = identity.subject
    const now = Date.now()

    ensure(identity.data_origin === 'smoke_test', 'profile is not smoke_test')
    ensure(
      identity.profile_active && identity.profile_status === 'active' && identity.link_active,
      'profile/link is inactive'
    )
    ensure(
      identity.registration_status === 'active' && identity.registration_expires_at.getTime() > now,
      'registration is inactive or expired'
    )
    ensure(
      identity.binding_status === 'active' && identity.binding_expires_at.getTime() > now,
      'binding is inactive or expired'
    )

    if (diagnoseSessions) {
      const sessions = await query<{
        amr: string[]
        has_step_up: boolean
        created_at: Date
        revoked: boolean
        revoke_reason: string | null
        correlation_id: string | null
      }>(
        `SELECT amr,step_up_at IS NOT NULL AS has_step_up,created_at,
                revoked_at IS NOT NULL AS revoked,revoke_reason,correlation_id
           FROM greenhouse_auth.sessions
          WHERE environment_id=$1 AND subject=$2
          ORDER BY created_at DESC
          LIMIT 10`,
        [environmentId, subject]
      )

      console.log(
        JSON.stringify(
          {
            ok: true,
            runId,
            registrationId,
            profileId,
            environmentId,
            sessions,
            redaction: 'no subject, email, cookie, token, session hash or credential id emitted'
          },
          null,
          2
        )
      )
      completed = true

      return
    }

    const before = await query<{ credential_id: string }>(
      `SELECT credential_id FROM greenhouse_auth.passkey_credentials
        WHERE environment_id=$1 AND subject=$2 AND revoked_at IS NULL`,
      [environmentId, subject]
    )

    ensure(before.length === 0, 'the canary subject already has an active passkey')

    const tokenId = randomUUID()
    const verifier = randomBytes(32).toString('base64url')
    const requestedAt = new Date()

    await store.insertMagicLink({
      tokenId,
      tokenHash: sha256Hex(verifier),
      environmentId,
      subject,
      emailHash: sha256Hex(`task-1832:${profileId}`),
      returnTo: null,
      requestedAt,
      expiresAt: new Date(requestedAt.getTime() + 15 * 60 * 1000),
      consumedAt: null,
      requestedIpHash: null,
      consumedIpHash: null,
      userAgentHash: null,
      correlationId: runId
    })

    await mkdir(browserProfile, { recursive: true, mode: 0o700 })
    await chmod(browserProfile, 0o700)
    context = await chromium.launchPersistentContext(browserProfile, {
      channel: 'chrome',
      headless: false,
      viewport: { width: 1100, height: 820 },
      serviceWorkers: 'block'
    })
    context.setDefaultTimeout(180_000)

    await context.route(`${host}/auth/passkeys/**`, async route => {
      await route.continue({ headers: { ...route.request().headers(), 'x-correlation-id': runId } })
    })

    const page = context.pages()[0] ?? (await context.newPage())

    await page.goto(`${host}/m/${tokenId}.${verifier}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Entrar' }).click()
    await page.waitForURL(`${host}/auth/magic-link/consume`)

    const bootstrapResponse = await context.request.get(`${host}/auth/session`, {
      headers: { Accept: 'application/json' }
    })

    const bootstrapSession = { status: bootstrapResponse.status(), body: await bootstrapResponse.json() }

    ensure(
      bootstrapSession.status === 200 && bootstrapSession.body?.status === 'authenticated',
      'bootstrap session failed'
    )
    await page.goto(`${host}/login`, { waitUntil: 'domcontentloaded' })

    // String deliberado: `tsx` con keepNames inyecta `__name` en closures serializados y ese helper
    // no existe dentro de la página. Este programa queda autocontenido en el origen real.
    const registration = (await page.evaluate(`(async () => {
      const canaryRunId = ${JSON.stringify(runId)};
      function decode(value) {
        return Uint8Array.from(atob(value.split('-').join('+').split('_').join('/')), character => character.charCodeAt(0));
      }
      function encode(value) {
        return btoa(String.fromCharCode(...new Uint8Array(value))).split('+').join('-').split('/').join('_').replace(/=+$/, '');
      }
      async function post(url, body) {
        const response = await fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': canaryRunId },
          body: JSON.stringify(body),
          cache: 'no-store'
        });
        return { status: response.status, body: await response.json() };
      }
      if (typeof PublicKeyCredential !== 'function' || typeof navigator.credentials?.create !== 'function') {
        throw new Error('WebAuthn is unavailable in Chrome');
      }
      const platformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!platformAvailable) throw new Error('a user-verifying platform authenticator is unavailable');
      const started = await post('/auth/passkeys/register/start', { display_name: 'TASK-1832 controlled canary' });
      if (started.status !== 200 || started.body?.status !== 'ready') throw new Error('registration start failed');
      const options = started.body.options;
      const publicKey = {
        ...options,
        challenge: decode(options.challenge),
        user: { ...options.user, id: decode(options.user.id) },
        excludeCredentials: (options.excludeCredentials ?? []).map(credential => ({ ...credential, id: decode(credential.id) })),
        authenticatorSelection: {
          ...(options.authenticatorSelection ?? {}),
          authenticatorAttachment: 'platform',
          residentKey: 'preferred',
          userVerification: 'required'
        }
      };
      const created = await navigator.credentials.create({ publicKey });
      if (!created) throw new Error('platform authenticator returned no credential');
      const response = created.response;
      const finished = await post('/auth/passkeys/register/finish', {
        challenge: options.challenge,
        device_name: 'Chrome · TASK-1832 canary',
        response: {
          id: created.id,
          rawId: encode(created.rawId),
          type: created.type,
          authenticatorAttachment: created.authenticatorAttachment,
          clientExtensionResults: created.getClientExtensionResults(),
          response: {
            clientDataJSON: encode(response.clientDataJSON),
            attestationObject: encode(response.attestationObject),
            transports: response.getTransports?.() ?? []
          }
        }
      });
      if (finished.status !== 201 || finished.body?.status !== 'registered') throw new Error('registration finish failed');
      return {
        platformAvailable,
        credentialId: created.id,
        attachment: created.authenticatorAttachment,
        transports: response.getTransports?.() ?? []
      };
    })()`)) as {
      platformAvailable: boolean
      credentialId: string
      attachment: string | null
      transports: string[]
    }

    registeredCredentialFingerprint = fingerprint(registration.credentialId)

    const listed = await page.evaluate(async () => {
      const response = await fetch('/auth/passkeys', { headers: { Accept: 'application/json' }, cache: 'no-store' })

      return { status: response.status, body: await response.json() }
    })

    ensure(listed.status === 200 && listed.body?.credentials?.length === 1, 'registered passkey is not listed')

    await context.request.post(`${host}/auth/session/logout`, {
      headers: { 'Content-Type': 'application/json', Origin: new URL(host).origin },
      data: {}
    })
    await page.goto(`${host}/login`, { waitUntil: 'domcontentloaded' })
    const passkeyButton = page.locator('[data-login-passkey]')

    await passkeyButton.waitFor({ state: 'visible' })
    await passkeyButton.click()
    await page.waitForURL(`${host}/auth/session`)

    const passkeyResponse = await context.request.get(`${host}/auth/session`, {
      headers: { Accept: 'application/json' }
    })

    const passkeySession = { status: passkeyResponse.status(), body: await passkeyResponse.json() }

    ensure(passkeySession.status === 200 && passkeySession.body?.status === 'authenticated', 'passkey login failed')
    ensure(
      Array.isArray(passkeySession.body?.amr) && passkeySession.body.amr.includes('passkey'),
      'passkey login did not persist its authentication method'
    )

    // El login normal acepta una passkey sin UV y puede abrir `primary`; esa es una decisión
    // intencional del contrato. La elevación se prueba por su carril explícito, ligado a la misma
    // cookie/sesión, que sí exige UV real y no cambia `auth_time`.
    const loginAuthLevel = passkeySession.body.authLevel

    await page.goto(`${host}/login`, { waitUntil: 'domcontentloaded' })
    await page.evaluate(`(async () => {
      const canaryRunId = ${JSON.stringify(runId)};
      function decode(value) {
        return Uint8Array.from(atob(value.split('-').join('+').split('_').join('/')), character => character.charCodeAt(0));
      }
      function encode(value) {
        return btoa(String.fromCharCode(...new Uint8Array(value))).split('+').join('-').split('/').join('_').replace(/=+$/, '');
      }
      async function post(url, body) {
        const response = await fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-Correlation-Id': canaryRunId },
          body: JSON.stringify(body),
          cache: 'no-store'
        });
        return { status: response.status, body: await response.json() };
      }
      const started = await post('/auth/passkeys/step-up/start', {});
      if (started.status !== 200 || started.body?.status !== 'ready') throw new Error('step-up start failed');
      const options = started.body.options;
      const publicKey = {
        ...options,
        challenge: decode(options.challenge),
        allowCredentials: (options.allowCredentials ?? []).map(credential => ({ ...credential, id: decode(credential.id) })),
        userVerification: 'required'
      };
      const credential = await navigator.credentials.get({ publicKey });
      if (!credential) throw new Error('platform authenticator returned no step-up assertion');
      const response = credential.response;
      const finished = await post('/auth/passkeys/step-up/finish', {
        challenge: options.challenge,
        response: {
          id: credential.id,
          rawId: encode(credential.rawId),
          type: credential.type,
          clientExtensionResults: credential.getClientExtensionResults(),
          response: {
            authenticatorData: encode(response.authenticatorData),
            clientDataJSON: encode(response.clientDataJSON),
            signature: encode(response.signature),
            userHandle: response.userHandle ? encode(response.userHandle) : null
          }
        }
      });
      if (finished.status !== 200 || finished.body?.status !== 'verified') throw new Error('step-up finish failed');
    })()`)

    const elevatedResponse = await context.request.get(`${host}/auth/session`, {
      headers: { Accept: 'application/json' }
    })

    const elevatedSession = { status: elevatedResponse.status(), body: await elevatedResponse.json() }

    ensure(
      elevatedSession.status === 200 && elevatedSession.body?.status === 'authenticated',
      'step-up session readback failed'
    )
    ensure(elevatedSession.body?.authLevel === 'step_up', 'explicit passkey step-up did not elevate the session')
    ensure(
      Array.isArray(elevatedSession.body?.amr) &&
        elevatedSession.body.amr.includes('passkey') &&
        elevatedSession.body.amr.includes('uv'),
      'explicit passkey step-up did not prove user verification'
    )

    await context.request.post(`${host}/auth/session/logout`, {
      headers: { 'Content-Type': 'application/json', Origin: new URL(host).origin },
      data: {}
    })

    const databaseReadback = await query<{ active_passkeys: number; active_sessions: number }>(
      `SELECT
        (SELECT count(*)::int FROM greenhouse_auth.passkey_credentials
          WHERE environment_id=$1 AND subject=$2 AND revoked_at IS NULL) AS active_passkeys,
        (SELECT count(*)::int FROM greenhouse_auth.sessions
          WHERE environment_id=$1 AND subject=$2 AND revoked_at IS NULL AND expires_at>NOW()) AS active_sessions`,
      [environmentId, subject]
    )

    ensure(databaseReadback[0]?.active_passkeys === 1, 'database did not retain exactly one active passkey')
    ensure(databaseReadback[0]?.active_sessions === 0, 'browser logout left an active session')

    const summary = {
      ok: true,
      runId,
      registrationId,
      profileId,
      environmentId,
      issuer: new URL(host).origin,
      capturedAt,
      browser: 'Chrome',
      authenticator: 'real user-verifying platform authenticator',
      attachment: registration.attachment,
      transports: registration.transports,
      credentialFingerprint: registeredCredentialFingerprint,
      loginAuthLevel,
      checks: {
        bootstrapSession: true,
        registrationStartFinish: true,
        credentialListed: true,
        discoverableLogin: true,
        explicitUserVerification: true,
        explicitStepUp: true,
        logoutReadback: true
      },
      redaction: 'no subject, email, cookie, token, challenge, credential id or WebAuthn payload persisted'
    }

    await mkdir(captureDir, { recursive: true })
    await writeFile(path.join(captureDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 })
    console.log(JSON.stringify(summary, null, 2))
    completed = true
  } finally {
    await context?.close().catch(() => undefined)

    if (!completed && subject) {
      await store
        .revokeSessionsForSubject({
          environmentId,
          subject,
          now: new Date(),
          reason: 'TASK-1832 real passkey canary did not complete'
        })
        .catch(() => undefined)

      if (registeredCredentialFingerprint) {
        const credentials = await store.listPasskeyCredentials({ environmentId, subject }).catch(() => [])

        for (const credential of credentials) {
          if (fingerprint(credential.credentialId) === registeredCredentialFingerprint) {
            await store
              .revokePasskeyCredential({
                credentialId: credential.credentialId,
                now: new Date(),
                reason: 'TASK-1832 real passkey canary did not complete'
              })
              .catch(() => undefined)
          }
        }
      }
    }

    await closeGreenhousePostgres()
  }
}

main().catch(error => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'unexpected passkey canary failure',
      redaction: 'sensitive values omitted'
    })
  )
  process.exitCode = 1
})
