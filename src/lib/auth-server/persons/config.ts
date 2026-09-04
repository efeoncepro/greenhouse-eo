/**
 * Configuración de la autenticación de personas del emisor (TASK-1830, EPIC-044).
 *
 * Se lee del entorno una vez; el SoT de las env vars es `services/auth-server/deploy.sh`
 * (`--set-env-vars` es destructivo: lo que no esté declarado ahí desaparece en el siguiente deploy).
 * Nada acá contiene secretos.
 */

export type AuthServerPersonAuthConfig = {
  /** Flag de la superficie de personas; OFF ⇒ `/auth/*` y `/m/*` responden 404. */
  personAuthEnabled: boolean
  /** Nombre de la cookie de sesión. `__Host-` obliga a Secure + Path=/ + sin Domain. */
  sessionCookieName: string
  /** Ventana deslizante de la sesión. */
  sessionSlidingTtlSeconds: number
  /** Tope absoluto: ni el uso continuo extiende una sesión más allá de esto. */
  sessionAbsoluteTtlSeconds: number
  /**
   * Cada request extendería la sesión; escribir en cada request es contención inútil. Sólo se
   * renueva cuando queda menos de este umbral de la ventana deslizante.
   */
  sessionRenewThresholdSeconds: number
  /** TTL del magic link. */
  magicLinkTtlSeconds: number
  /** Cooldown por sujeto/correo entre solicitudes de magic link. */
  magicLinkCooldownSeconds: number
  /** Máximo de solicitudes por IP en una hora. */
  magicLinkPerIpPerHour: number
  /**
   * Edad máxima del factor fuerte para que la sesión valga como `step_up`. Es el único gate de toda
   * la cadena que depende de QUIÉN es la persona: en el lane ecosystem el actor es la máquina.
   */
  stepUpMaxAgeSeconds: number
  /**
   * Piso de latencia de las respuestas anti-enumeración. El camino "el correo existe" hace INSERT y
   * despacha correo; el camino "no existe" no hace nada. Sin piso, el TIEMPO delata la diferencia
   * aunque el cuerpo sea idéntico.
   */
  antiEnumerationFloorMs: number
  /** Bloqueo progresivo: base y tope del backoff cuando una llave supera su límite. */
  lockoutBaseSeconds: number
  lockoutMaxSeconds: number
  /** TTL del reto WebAuthn: corto por diseño, la ceremonia dura segundos. */
  passkeyChallengeTtlSeconds: number
  /** Tope de credenciales activas por persona (el trigger de PG lo enforcea también). */
  maxPasskeysPerPerson: number
  /** Nombre visible del Relying Party en el diálogo del navegador. */
  passkeyRelyingPartyName: string
}

export const AUTH_SERVER_PERSON_AUTH_DEFAULTS = {
  sessionCookieName: '__Host-efeonce_auth',
  sessionSlidingTtlSeconds: 12 * 60 * 60,
  sessionAbsoluteTtlSeconds: 7 * 24 * 60 * 60,
  sessionRenewThresholdSeconds: 30 * 60,
  magicLinkTtlSeconds: 15 * 60,
  magicLinkCooldownSeconds: 60,
  magicLinkPerIpPerHour: 5,
  stepUpMaxAgeSeconds: 10 * 60,
  antiEnumerationFloorMs: 400,
  lockoutBaseSeconds: 60,
  lockoutMaxSeconds: 60 * 60,
  passkeyChallengeTtlSeconds: 5 * 60,
  maxPasskeysPerPerson: 5,
  passkeyRelyingPartyName: 'Efeonce ID'
} as const

const parseFlag = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

export const readAuthServerPersonAuthConfig = (
  env: NodeJS.ProcessEnv = process.env
): AuthServerPersonAuthConfig => ({
  personAuthEnabled: parseFlag(env.AUTH_SERVER_PERSON_AUTH_ENABLED),
  ...AUTH_SERVER_PERSON_AUTH_DEFAULTS
})
