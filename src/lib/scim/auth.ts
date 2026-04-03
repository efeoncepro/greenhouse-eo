import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import type { ScimErrorResponse } from '@/types/scim'

// ── Types ──

export type ScimAuthResult =
  | { authorized: true; errorResponse: null }
  | { authorized: false; errorResponse: NextResponse }

// ── Helpers ──

const getBearerToken = (request: Request): string => {
  const authorization = request.headers.get('authorization')?.trim() || ''

  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim()
  }

  return ''
}

const safeEquals = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  try {
    return timingSafeEqual(leftBuffer, rightBuffer)
  } catch {
    return false
  }
}

// ── Public API ──

/**
 * Validate SCIM bearer token from the Authorization header.
 *
 * Uses constant-time comparison to prevent timing attacks.
 * The token is read from the `SCIM_BEARER_TOKEN` environment variable.
 */
export const requireScimAuth = (request: Request): ScimAuthResult => {
  const secret = process.env.SCIM_BEARER_TOKEN?.trim()

  if (!secret) {
    console.error('[scim-auth] SCIM_BEARER_TOKEN not configured; rejecting request')

    return {
      authorized: false,
      errorResponse: NextResponse.json(
        { schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], detail: 'Server misconfiguration', status: 503 } satisfies ScimErrorResponse,
        { status: 503 }
      )
    }
  }

  const bearerToken = getBearerToken(request)

  if (bearerToken && safeEquals(bearerToken, secret)) {
    return { authorized: true, errorResponse: null }
  }

  return {
    authorized: false,
    errorResponse: NextResponse.json(
      { schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'], detail: 'Unauthorized', status: 401 } satisfies ScimErrorResponse,
      { status: 401 }
    )
  }
}
