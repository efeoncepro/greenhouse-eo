/**
 * Efeonce Auth Server — Cloud Run Service (TASK-1828 runtime · TASK-1829 OAuth, EPIC-044)
 *
 * Authorization server propio de Efeonce en `auth.efeonce.org`. Este archivo sólo cablea el runtime
 * real (PG, KMS, sesión, bindings) al handler de `./app.ts`, que es donde viven las rutas y se prueba
 * in-process. Ver `app.ts` para la tabla de rutas.
 *
 * Auth/ingress: el servicio se despliega con `--ingress=internal-and-cloud-load-balancing`
 * y `--allow-unauthenticated`: sólo el global LB del gateway lo alcanza y el ALB no emite
 * tokens IAM hacia un serverless NEG. La aplicación valida `Host` contra
 * `AUTH_SERVER_ALLOWED_HOSTS`.
 *
 * Invariantes: cookie/sesión/secretos propios (nunca NEXTAUTH_SECRET); la llave privada
 * vive en Cloud KMS HSM; ningún error interno se devuelve al cliente en prosa.
 */

import { createServer } from 'node:http'

// TASK-844 — Sentry init must run BEFORE any function from @/lib/** is invoked.
import { initSentryForService } from '../_shared/sentry-init'

import { query } from '@/lib/db'
import {
  createCloudKmsSigner,
  getActiveSigningKey,
  getAuthServerKmsKeyName,
  getPublishableSigningKeys,
  signWithActiveKey,
  type KmsSignerPort
} from '@/lib/auth-server/keys'
import {
  createExternalAccessGrantsPort,
  PostgresOAuthStore,
  readAuthServerOAuthConfig
} from '@/lib/auth-server/oauth'
import {
  createExternalInvitationAcceptancePort,
  createGovernedMagicLinkMailer,
  createPersonSubjectPort,
  createSourceLinkDirectoryPort,
  deriveRpId,
  expectedSourceSystemFor,
  mintOpaqueSubject,
  PostgresPersonAuthStore,
  readAuthServerPersonAuthConfig
} from '@/lib/auth-server/persons'
import { captureWithDomain } from '@/lib/observability/capture'

import { createAuthServerRequestHandler, SERVICE_NAME } from './app'

initSentryForService(SERVICE_NAME)

// ─── Config ─────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 8080
const AUTH_SERVER_ENABLED = process.env.AUTH_SERVER_ENABLED?.trim().toLowerCase() === 'true'
const ALLOWED_HOSTS = (process.env.AUTH_SERVER_ALLOWED_HOSTS ?? '').split(',')
const GIT_SHA = process.env.GIT_SHA ?? 'unknown'
const oauthConfig = readAuthServerOAuthConfig()
const personAuthConfig = readAuthServerPersonAuthConfig()

let kmsSigner: KmsSignerPort | null = null

const getSigner = (): KmsSignerPort => {
  if (!kmsSigner) kmsSigner = createCloudKmsSigner()

  return kmsSigner
}

// ─── Wiring ─────────────────────────────────────────────────────────────────

const personStore = new PostgresPersonAuthStore()
const expectedSourceSystem = expectedSourceSystemFor(oauthConfig.environmentId)

/** Deps compartidas por el router de personas y por el `SubjectSessionPort` que consume `authorize`. */
const personDeps = {
  store: personStore,
  config: personAuthConfig,
  directory: createSourceLinkDirectoryPort(),
  mailer: createGovernedMagicLinkMailer(),
  invitations: createExternalInvitationAcceptancePort(),
  mintSubject: mintOpaqueSubject,
  environmentId: oauthConfig.environmentId,
  expectedSourceSystem,
  issuer: oauthConfig.issuer,
  // `rpId` es el HOST del emisor: `auth.efeonce.org`, sin esquema. Si no coincide exactamente con
  // el origen que ve el navegador, la ceremonia WebAuthn falla del lado del cliente.
  rpId: deriveRpId(oauthConfig.issuer),
  onPasskeyCounterRegression: ({ credentialId }: { credentialId: string }) =>
    console.warn(`[${SERVICE_NAME}] passkey counter regression — credential revoked: ${credentialId}`),
  now: () => new Date(),
  onError: (error: unknown, context: Record<string, unknown>) =>
    captureWithDomain(error, 'identity', { tags: { component: SERVICE_NAME, ...context } })
}

const handler = createAuthServerRequestHandler({
  enabled: AUTH_SERVER_ENABLED,
  allowedHosts: ALLOWED_HOSTS,
  gitSha: GIT_SHA,
  oauthConfig,
  pingPostgres: async () => {
    await query('SELECT 1')
  },
  getActiveSigningKey,
  getPublishableSigningKeys,
  getSigner,
  signAccessToken: payload => signWithActiveKey({ signer: getSigner(), payload }),
  store: new PostgresOAuthStore(),
  // TASK-1830 — la persona la resuelve la sesión propia (`__Host-efeonce_auth`). Con
  // `AUTH_SERVER_PERSON_AUTH_ENABLED=false` el port devuelve `null` y `authorize` sigue
  // respondiendo `login_required`: prender la superficie es un flag, no un deploy distinto.
  subjectPort: createPersonSubjectPort({
    store: personStore,
    config: personAuthConfig,
    environmentId: oauthConfig.environmentId,
    expectedSourceSystem,
    onInvalidSession: status =>
      console.warn(`[${SERVICE_NAME}] session invalidated by source link: ${status}`)
  }),
  persons: personDeps,
  grantsPort: createExternalAccessGrantsPort(),
  cimd: {}
})

const server = createServer((req, res) => {
  void handler(req, res)
})

server.listen(PORT, () => {
  console.log(
    `[${SERVICE_NAME}] listening on :${PORT} enabled=${AUTH_SERVER_ENABLED} oauth=${oauthConfig.oauthEnabled} persons=${personAuthConfig.personAuthEnabled} issuer=${oauthConfig.issuer} env=${oauthConfig.environmentId} hosts=${ALLOWED_HOSTS.map(h => h.trim()).filter(Boolean).join(',') || '*'} gitSha=${GIT_SHA}`
  )

  if (AUTH_SERVER_ENABLED) {
    try {
      getAuthServerKmsKeyName()
    } catch (error) {
      console.error(`[${SERVICE_NAME}] misconfiguration:`, error instanceof Error ? error.message : 'unknown')
    }
  }
})

const shutdown = (signal: NodeJS.Signals) => {
  console.log(`[${SERVICE_NAME}] ${signal} received — closing server`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5_000).unref()
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
