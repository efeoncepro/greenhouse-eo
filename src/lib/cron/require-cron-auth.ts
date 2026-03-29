import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

import { getCronSecretValue, isVercelCronRequest } from '@/lib/cloud/cron'

export type CronAuthResult =
  | {
      authorized: true
      errorResponse: null
    }
  | {
      authorized: false
      errorResponse: NextResponse
    }

const getBearerToken = (request: Request) => {
  const authorization = request.headers.get('authorization')?.trim() || ''

  if (authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim()
  }

  return ''
}

const safeEquals = (left: string, right: string) => {
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

export const requireCronAuth = (request: Request): CronAuthResult => {
  const secret = getCronSecretValue()

  if (!secret) {
    console.error('[cron-auth] CRON_SECRET not configured; rejecting request')

    return {
      authorized: false,
      errorResponse: NextResponse.json({ error: 'Server misconfiguration' }, { status: 503 })
    }
  }

  const bearerToken = getBearerToken(request)

  if (bearerToken && safeEquals(bearerToken, secret)) {
    return {
      authorized: true,
      errorResponse: null
    }
  }

  if (isVercelCronRequest(request)) {
    return {
      authorized: true,
      errorResponse: null
    }
  }

  return {
    authorized: false,
    errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
