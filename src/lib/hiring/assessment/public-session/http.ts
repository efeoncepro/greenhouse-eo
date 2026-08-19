import 'server-only'

export const PUBLIC_ASSESSMENT_SESSION_COOKIE = '__Host-gh-assessment-session'
export const PUBLIC_ASSESSMENT_MAX_BODY_BYTES = 8 * 1024

export const publicAssessmentResponseHeaders = {
  'Cache-Control': 'no-store, max-age=0',
  'Pragma': 'no-cache',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
} as const

export const hasExactSameOrigin = (request: Request): boolean => {
  const origin = request.headers.get('origin')

  if (!origin) return false

  try {
    return new URL(origin).origin === new URL(request.url).origin && origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export const readBoundedJsonObject = async (request: Request): Promise<Record<string, unknown> | null> => {
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()

  if (mediaType !== 'application/json') return null

  const declaredLength = Number(request.headers.get('content-length') ?? '0')

  if (Number.isFinite(declaredLength) && declaredLength > PUBLIC_ASSESSMENT_MAX_BODY_BYTES) return null

  if (!request.body) return null

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let totalBytes = 0
  let text = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    totalBytes += value.byteLength

    if (totalBytes > PUBLIC_ASSESSMENT_MAX_BODY_BYTES) {
      await reader.cancel()

      return null
    }

    text += decoder.decode(value, { stream: true })
  }

  text += decoder.decode()

  try {
    const value = JSON.parse(text) as unknown

    return value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

export const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]) => {
  const keys = Object.keys(value)

  return keys.every(key => allowed.includes(key)) && new Set(keys).size === keys.length
}
