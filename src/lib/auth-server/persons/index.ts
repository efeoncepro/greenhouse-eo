/**
 * TASK-1830 (EPIC-044 U03) — Autenticación de personas externas del emisor, sin contraseñas.
 *
 * No existe password store: la clase de ataque más frecuente contra un servicio de auth público
 * (credential stuffing, phishing de contraseña, reset abusable) desaparece por diseño. Lo que queda
 * —enlaces de un solo uso, passkeys, TOTP— tiene superficie acotada y verificable.
 *
 * Consumers: el runtime `services/auth-server/**`, `authorize` de `TASK-1829` vía `SubjectSessionPort`,
 * y la task `ui-ux` `TASK-1835`, que reemplaza las páginas mínimas sin cambiar este contrato.
 */

export {
  AUTH_SERVER_PERSON_AUTH_DEFAULTS,
  readAuthServerPersonAuthConfig,
  type AuthServerPersonAuthConfig
} from './config'
export {
  AUTH_SERVER_ACTOR_ID,
  createExternalInvitationAcceptancePort,
  createGovernedMagicLinkMailer,
  createSourceLinkDirectoryPort,
  mintOpaqueSubject
} from './adapters'
export { acceptInvitationAndSendMagicLink, type InvitationAcceptancePort } from './invitations'
export {
  buildMagicLinkUrl,
  consumeMagicLink,
  isPlausibleEmail,
  issueMagicLinkForPerson,
  normalizeEmail,
  parseMagicLinkToken,
  requestMagicLink,
  sanitizeReturnTo,
  type MagicLinkDeps,
  type MagicLinkMailerPort,
  type PersonDirectoryPort
} from './magic-link'
export { PERSON_AUTH_PATHS } from './pages'
export {
  buildPasskeyAmr,
  deriveRpId,
  finishPasskeyAuthentication,
  finishPasskeyRegistration,
  isCounterRegression,
  startPasskeyAuthentication,
  startPasskeyRegistration,
  type PasskeyDeps
} from './passkeys'
export {
  buildRateLimitBucketKey,
  computeLockoutSeconds,
  enforceRateLimit,
  INVITATION_ACCEPT_IP_RULE,
  MAGIC_LINK_CONSUME_IP_RULE,
  MAGIC_LINK_EMAIL_RULE,
  MAGIC_LINK_IP_RULE
} from './rate-limit'
export { createPersonAuthHandler, isPersonAuthPath, type PersonAuthHandler, type PersonAuthHandlerDeps } from './routes'
export {
  buildSessionClearCookie,
  buildSessionCookie,
  createPersonSession,
  readCookie,
  resolveAuthLevel,
  resolvePersonSession,
  type PersonSessionResolution
} from './sessions'
export { PostgresPersonAuthStore, expectedSourceSystemFor } from './store/postgres-store'
export { InMemoryPersonAuthStore } from './store/memory-store'
export { createPersonSubjectPort, type PersonSubjectPortDeps } from './subject-port'
export type * from './types'
export type { PersonAuthStorePort } from './store/port'
