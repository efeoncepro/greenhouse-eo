import { NextResponse } from 'next/server'

const DEPRECATED_NO_IF_MATCH_HEADER = 'X-Deprecated-No-If-Match'

const stripQuotes = (value: string) => value.trim().replace(/^W\//, '').replace(/^"(.*)"$/, '$1')

export const toUpdatedAtString = (value: string | Date | null | undefined): string => {
  if (!value) return ''
  if (value instanceof Date) return value.toISOString()

  return value
}

export const buildEtag = (updatedAt: string | Date | null | undefined): string | null => {
  const normalized = toUpdatedAtString(updatedAt)

  if (!normalized) return null

  return `"${normalized}"`
}

export const withOptimisticLockHeaders = (
  response: NextResponse,
  updatedAt: string | Date | null | undefined,
  options: { missingIfMatch?: boolean } = {}
) => {
  const etag = buildEtag(updatedAt)

  if (etag) {
    response.headers.set('ETag', etag)
  }

  if (options.missingIfMatch) {
    response.headers.set(DEPRECATED_NO_IF_MATCH_HEADER, 'true')
  }

  return response
}

const parseIfMatch = (request: Request): string[] | null => {
  const raw = request.headers.get('if-match')

  if (!raw) return null

  return raw
    .split(',')
    .map(part => stripQuotes(part))
    .filter(Boolean)
}

export const requireIfMatch = (
  request: Request,
  currentUpdatedAt: string | Date | null | undefined
):
  | { ok: true; missingIfMatch: boolean }
  | { ok: false; response: NextResponse } => {
  const current = toUpdatedAtString(currentUpdatedAt)
  const ifMatchValues = parseIfMatch(request)

  if (!ifMatchValues || ifMatchValues.length === 0) {
    return { ok: true, missingIfMatch: true }
  }

  if (!current) {
    return { ok: true, missingIfMatch: false }
  }

  if (ifMatchValues.includes('*') || ifMatchValues.includes(current)) {
    return { ok: true, missingIfMatch: false }
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        error: 'Conflict',
        currentUpdatedAt: current,
        message: 'The resource changed since it was last read. Refresh and retry.'
      },
      { status: 409 }
    )
  }
}
