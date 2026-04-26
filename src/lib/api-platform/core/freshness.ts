import { createHash } from 'node:crypto'

const normalizeWeakEtag = (value: string) => value.trim().replace(/^W\//, '')

const stableStringify = (value: unknown): string => {
  if (value === null || value === undefined) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(item => stableStringify(item)).join(',')}]`

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>

    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

export const buildApiPlatformEtag = (value: unknown) => {
  const digest = createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 32)

  return `"${digest}"`
}

export const maxIsoTimestamp = (values: Array<string | Date | null | undefined>) => {
  const max = values.reduce<number | null>((current, value) => {
    if (!value) return current

    const time = new Date(value).getTime()

    if (!Number.isFinite(time)) return current

    return current === null || time > current ? time : current
  }, null)

  return max === null ? null : new Date(max).toUTCString()
}

export const isApiPlatformConditionalMatch = ({
  request,
  etag,
  lastModified
}: {
  request: Request
  etag: string
  lastModified?: string | null
}) => {
  const ifNoneMatch = request.headers.get('if-none-match')

  if (ifNoneMatch) {
    const requestedEtags = ifNoneMatch.split(',').map(value => normalizeWeakEtag(value))

    if (requestedEtags.includes('*') || requestedEtags.includes(etag)) {
      return true
    }
  }

  const ifModifiedSince = request.headers.get('if-modified-since')

  if (ifModifiedSince && lastModified) {
    const requestedTime = new Date(ifModifiedSince).getTime()
    const modifiedTime = new Date(lastModified).getTime()

    if (Number.isFinite(requestedTime) && Number.isFinite(modifiedTime) && modifiedTime <= requestedTime) {
      return true
    }
  }

  return false
}
