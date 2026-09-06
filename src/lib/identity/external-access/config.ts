/**
 * TASK-1837 — Configuración del ciclo de vida de la invitación externa.
 *
 * Dos flags (`FEATURE_FLAG_STATE_LEDGER.md`) y tres knobs. Se leen del entorno en cada llamada para
 * que un test pueda inyectar `env`; nada acá contiene secretos.
 *
 *  · `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED` — el sistema envía el correo en el mismo acto que
 *    genera el token y la ruta admin DEJA de devolver `token`. Runtime: Vercel (emisión). Con el
 *    flag apagado el comportamiento previo (token en la respuesta, sin correo) se conserva íntegro.
 *  · `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` — lane ecosystem del administrador delegado
 *    del cliente. Apagado ⇒ 404 anti-oráculo. Runtime: Vercel.
 *
 * El drenaje del REBOTE no lleva flag: sólo actúa sobre entregas que existen, así que es inerte
 * mientras nadie envía; gatearlo en el `ops-worker` habría creado el riesgo multi-runtime del ledger
 * (flag ON en Vercel, drenaje muerto en el worker) sin proteger nada.
 */

export type ExternalInvitationConfig = {
  systemDeliveryEnabled: boolean
  delegatedAuthorityEnabled: boolean
  /** Reenvíos permitidos por cadena de invitación (cada reenvío rota el token). */
  resendLimitPerChain: number
  /** Emisiones + reenvíos por binding en una hora (anti-abuso / anti-enumeración). */
  issueLimitPerBindingPerHour: number
  /** Asientos abiertos+ligados que un administrador delegado puede tener en su binding. */
  delegatedSeatLimit: number
  /** Vigencia del enlace revelado por la excepción gobernada. */
  revealedLinkTtlHours: number
}

const parseFlag = (value: string | undefined): boolean => value?.trim().toLowerCase() === 'true'

/** Gate independiente del carril canary. Default OFF en todo runtime. */
export const isExternalIdentityCanaryEnabled = (env: NodeJS.ProcessEnv = process.env): boolean =>
  parseFlag(env.EXTERNAL_IDENTITY_CANARY_ENABLED)

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const EXTERNAL_INVITATION_CONFIG_DEFAULTS = {
  resendLimitPerChain: 3,
  issueLimitPerBindingPerHour: 20,
  delegatedSeatLimit: 25,
  revealedLinkTtlHours: 1
} as const

export const readExternalInvitationConfig = (env: NodeJS.ProcessEnv = process.env): ExternalInvitationConfig => ({
  systemDeliveryEnabled: parseFlag(env.EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED),
  delegatedAuthorityEnabled: parseFlag(env.EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED),
  resendLimitPerChain: EXTERNAL_INVITATION_CONFIG_DEFAULTS.resendLimitPerChain,
  issueLimitPerBindingPerHour: EXTERNAL_INVITATION_CONFIG_DEFAULTS.issueLimitPerBindingPerHour,
  delegatedSeatLimit: parsePositiveInt(
    env.EXTERNAL_INVITATION_DELEGATED_SEAT_LIMIT,
    EXTERNAL_INVITATION_CONFIG_DEFAULTS.delegatedSeatLimit
  ),
  revealedLinkTtlHours: EXTERNAL_INVITATION_CONFIG_DEFAULTS.revealedLinkTtlHours
})
