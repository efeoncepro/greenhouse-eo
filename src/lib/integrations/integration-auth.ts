import 'server-only'

import { timingSafeEqual } from 'node:crypto'

import { NextResponse } from 'next/server'

const getExpectedToken = () =>
  process.env.GREENHOUSE_INTEGRATION_API_TOKEN?.trim() ||
  process.env.GREENHOUSE_SISTER_PLATFORM_TOKEN?.trim() ||
  null

const safeEquals = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

const extractToken = (request: Request) => {
  const authorization = request.headers.get('authorization')?.trim()

  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice('bearer '.length).trim()
  }

  return (
    request.headers.get('x-greenhouse-integration-key')?.trim() ||
    request.headers.get('x-greenhouse-sister-platform-key')?.trim() ||
    null
  )
}

export const requireIntegrationRequest = (request: Request) => {
  const expectedToken = getExpectedToken()

  if (!expectedToken) {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          error:
            'Missing GREENHOUSE_INTEGRATION_API_TOKEN or GREENHOUSE_SISTER_PLATFORM_TOKEN environment variable.'
        },
        { status: 500 }
      )
    }
  }

  const requestToken = extractToken(request)

  if (!requestToken || !safeEquals(requestToken, expectedToken)) {
    return {
      authorized: false,
      errorResponse: NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return {
    authorized: true,
    errorResponse: null
  }
}
