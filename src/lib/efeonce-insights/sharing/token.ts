/**
 * TASK-1848 — bearer de un ShareGrant. 32 bytes aleatorios (256 bits, sobre el piso de 128 de §8)
 * en base64url con prefijo `isg_`. Sólo su sha256 se persiste; el prefijo existe para que la
 * redacción de observabilidad lo reconozca en cualquier string (`src/lib/observability/redact.ts`).
 */

import { generateOpaqueToken, hashSensitiveValue, sha256Hex } from '@/lib/auth-server/oauth/primitives'

export const INSIGHT_SHARE_TOKEN_PREFIX = 'isg'

/** `isg_` + 43 chars base64url (32 bytes sin padding). Cualquier otra forma no toca la base. */
const TOKEN_RE = /^isg_[A-Za-z0-9_-]{43}$/

export const generateInsightShareToken = (): string => generateOpaqueToken(INSIGHT_SHARE_TOKEN_PREFIX, 32)

export const isWellFormedInsightShareToken = (value: unknown): value is string => typeof value === 'string' && TOKEN_RE.test(value)

export const digestInsightShareToken = (token: string): string => sha256Hex(token)

/** Hash salado y truncado de un sujeto (IP, grant) para rate limit y access log: correlación, no reversión. */
export const hashInsightShareSubject = (value: string, salt: string): string => hashSensitiveValue(`${salt}:${value}`) ?? ''

/** Base pública del visor compartido (Think). Configurable por entorno; nunca derivada de la request. */
export const resolveInsightShareBaseUrl = (env: NodeJS.ProcessEnv = process.env): string =>
  (env.INSIGHTS_SHARE_PUBLIC_BASE_URL?.trim() || 'https://think.efeoncepro.com').replace(/\/+$/, '')

export const buildInsightShareUrl = (token: string, env: NodeJS.ProcessEnv = process.env): string => `${resolveInsightShareBaseUrl(env)}/insights/r/${token}`
