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
  readAuthServerOAuthConfig,
  unauthenticatedSubjectPort
} from '@/lib/auth-server/oauth'

import { createAuthServerRequestHandler, SERVICE_NAME } from './app'

initSentryForService(SERVICE_NAME)

// ─── Config ─────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 8080
const AUTH_SERVER_ENABLED = process.env.AUTH_SERVER_ENABLED?.trim().toLowerCase() === 'true'
const ALLOWED_HOSTS = (process.env.AUTH_SERVER_ALLOWED_HOSTS ?? '').split(',')
const GIT_SHA = process.env.GIT_SHA ?? 'unknown'
const oauthConfig = readAuthServerOAuthConfig()

let kmsSigner: KmsSignerPort | null = null

const getSigner = (): KmsSignerPort => {
  if (!kmsSigner) kmsSigner = createCloudKmsSigner()

  return kmsSigner
}

// ─── Wiring ─────────────────────────────────────────────────────────────────

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
  // TASK-1830 reemplaza este port por la sesión propia (`__Host-efeonce_auth`); hasta entonces
  // `authorize` responde `login_required` y ningún code se emite.
  subjectPort: unauthenticatedSubjectPort,
  grantsPort: createExternalAccessGrantsPort(),
  cimd: {}
})

const server = createServer((req, res) => {
  void handler(req, res)
})

server.listen(PORT, () => {
  console.log(
    `[${SERVICE_NAME}] listening on :${PORT} enabled=${AUTH_SERVER_ENABLED} oauth=${oauthConfig.oauthEnabled} issuer=${oauthConfig.issuer} env=${oauthConfig.environmentId} hosts=${ALLOWED_HOSTS.map(h => h.trim()).filter(Boolean).join(',') || '*'} gitSha=${GIT_SHA}`
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
