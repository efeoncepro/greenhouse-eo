/**
 * Anti-abuso de la autenticación de personas (TASK-1830).
 *
 * Dos mecanismos que NO son el mismo y por eso no se colapsan en uno:
 *
 * - **Ventana contada** (`auth_rate_limits.hit_count`): cuántos intentos entran por unidad de tiempo.
 * - **Bloqueo progresivo** (`locked_until`): cuánto espera quien ya se pasó. No se puede derivar
 *   contando el ledger, porque tiene que sobrevivir aunque los intentos paren — es estado, no una
 *   consulta.
 *
 * Toda llave lleva el valor HASHEADO (`sha256`): ni el correo ni la IP entran a la tabla en claro.
 * El límite por IP se evalúa ANTES de resolver el correo, para que el trabajo del camino "existe" y
 * el del camino "no existe" no diverjan antes del gate.
 */

import { sha256Hex } from '../oauth/primitives'
import type { AuthServerPersonAuthConfig } from './config'
import type { PersonAuthStorePort } from './store/port'
import type { RateLimitDecision, RateLimitDimension, RateLimitRule } from './types'

/** Backoff exponencial acotado: base, 2×base, 4×base… hasta el tope. */
export const computeLockoutSeconds = (lockoutCount: number, baseSeconds: number, maxSeconds: number): number =>
  Math.min(maxSeconds, baseSeconds * 2 ** Math.max(0, lockoutCount - 1))

/**
 * `<acción>:<dimensión>:<sha256>` — el formato lo enforcea un CHECK en la tabla, así que una llave
 * mal construida (por ejemplo con el correo en claro) revienta en la escritura, no en silencio.
 */
export const buildRateLimitBucketKey = (action: string, dimension: RateLimitDimension, value: string): string =>
  `${action}:${dimension}:${sha256Hex(value.trim().toLowerCase())}`

export const MAGIC_LINK_IP_RULE: RateLimitRule = {
  action: 'magic_link_request',
  dimension: 'ip',
  windowSeconds: 60 * 60,
  limit: 5
}

export const MAGIC_LINK_EMAIL_RULE: RateLimitRule = {
  action: 'magic_link_request',
  dimension: 'email',
  windowSeconds: 60,
  limit: 1
}

export const MAGIC_LINK_CONSUME_IP_RULE: RateLimitRule = {
  action: 'magic_link_consume',
  dimension: 'ip',
  windowSeconds: 60 * 60,
  limit: 30
}

export const INVITATION_ACCEPT_IP_RULE: RateLimitRule = {
  action: 'invitation_accept',
  dimension: 'ip',
  windowSeconds: 60 * 60,
  limit: 10
}

/**
 * Seis dígitos con ventana ±1 aceptan tres códigos a la vez: un millón de combinaciones se recorre
 * rápido sin límite. ESTE es el mecanismo que hace inviable la fuerza bruta, no la longitud.
 */
export const TOTP_VERIFY_SUBJECT_RULE: RateLimitRule = {
  action: 'totp_verify',
  dimension: 'subject',
  windowSeconds: 5 * 60,
  limit: 5
}

export type EnforceRateLimitInput = {
  store: PersonAuthStorePort
  config: AuthServerPersonAuthConfig
  rule: RateLimitRule
  /** Valor CRUDO de la dimensión (correo, IP, sujeto); se hashea acá, nunca antes. */
  value: string | null
  now: Date
}

/**
 * `null` en el valor (por ejemplo una request sin IP resoluble) NO abre la puerta: se cuenta contra
 * una llave fija, para que el camino sin IP no sea el camino sin límite.
 */
export const enforceRateLimit = async ({
  store,
  config,
  rule,
  value,
  now
}: EnforceRateLimitInput): Promise<RateLimitDecision> =>
  store.hitRateLimitBucket({
    bucketKey: buildRateLimitBucketKey(rule.action, rule.dimension, value ?? 'unknown'),
    now,
    windowSeconds: rule.windowSeconds,
    limit: rule.limit,
    lockoutBaseSeconds: config.lockoutBaseSeconds,
    lockoutMaxSeconds: config.lockoutMaxSeconds
  })
