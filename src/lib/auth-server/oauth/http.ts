/**
 * Abstracción HTTP mínima del emisor (TASK-1829): `services/auth-server/app.ts` adapta `node:http` a
 * esta forma y los tests llaman al handler con objetos planos. Sin framework.
 */

import { createHash } from 'node:crypto'

import { AUTH_SERVER_STYLES } from './pages/styles.generated'
import { EFEONCE_ISOTIPO_SVG } from './pages/efeonce-isotipo.generated'

// Only trusted generated assets contribute hashes. Never derive this policy from request-rendered HTML.
const styleHashes = [
  AUTH_SERVER_STYLES,
  ...[...EFEONCE_ISOTIPO_SVG.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1])
].map(css => `'sha256-${createHash('sha256').update(css).digest('base64')}'`).join(' ')

export type HeaderReader = { get(name: string): string | null }

export type OAuthHttpRequest = {
  method: string
  url: URL
  headers: HeaderReader
  /** Cuerpo crudo (ya limitado en tamaño por el adaptador). */
  body: string
}

export type OAuthHttpResponse = {
  status: number
  headers: Record<string, string>
  body: string
}

export const MAX_BODY_BYTES = 64 * 1024

export const headersFromRecord = (record: Record<string, string | string[] | undefined>): HeaderReader => ({
  get: name => {
    const value = record[name.toLowerCase()]

    if (Array.isArray(value)) return value[0] ?? null

    return value ?? null
  }
})

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY'
} as const

export const jsonResponse = (status: number, body: unknown, headers: Record<string, string> = {}): OAuthHttpResponse => ({
  status,
  headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers },
  body: JSON.stringify(body)
})

export const htmlResponse = (status: number, html: string, headers: Record<string, string> = {}): OAuthHttpResponse => ({
  status,
  headers: {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': `default-src 'none'; img-src 'self' data:; font-src 'self'; style-src ${styleHashes}; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    ...headers
  },
  body: html
})

export const redirectResponse = (location: string): OAuthHttpResponse => ({
  status: 302,
  headers: { ...SECURITY_HEADERS, Location: location },
  body: ''
})

export const parseFormBody = (body: string): Map<string, string> => {
  const params = new URLSearchParams(body)
  const out = new Map<string, string>()

  for (const [key, value] of params) {
    // RFC 6749 §3.2: parámetros repetidos son inválidos; nos quedamos con el primero y lo marcamos.
    if (out.has(key)) {
      out.set('__duplicate__', key)
      continue
    }

    out.set(key, value)
  }

  return out
}

export const isFormContentType = (request: OAuthHttpRequest): boolean =>
  (request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/x-www-form-urlencoded')

export const isJsonContentType = (request: OAuthHttpRequest): boolean =>
  (request.headers.get('content-type') ?? '').toLowerCase().includes('json')

export const parseJsonBody = (body: string): unknown => {
  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}

/** Origen de la petición del navegador (para formularios de consentimiento): `Origin` o `Referer`. */
export const requestOrigin = (request: OAuthHttpRequest): string | null => {
  const origin = request.headers.get('origin')

  if (origin) return origin

  const referer = request.headers.get('referer')

  if (!referer) return null

  try {
    return new URL(referer).origin
  } catch {
    return null
  }
}
