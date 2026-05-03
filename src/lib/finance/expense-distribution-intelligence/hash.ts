import { createHash } from 'node:crypto'

export const stableJsonStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)

  if (Array.isArray(value)) {
    return `[${value.map(stableJsonStringify).join(',')}]`
  }

  const record = value as Record<string, unknown>

  return `{${Object.keys(record)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableJsonStringify(record[key])}`)
    .join(',')}}`
}

export const sha256Hex = (value: unknown) =>
  createHash('sha256').update(typeof value === 'string' ? value : stableJsonStringify(value)).digest('hex')

export const shortSha256 = (value: unknown) => sha256Hex(value).slice(0, 16)
