import { createHash } from 'node:crypto'

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key])

        return acc
      }, {})
  }

  return value
}

export const stableStringify = (value: unknown) => JSON.stringify(canonicalize(value))

export const computeJsonSha256 = (value: unknown) =>
  createHash('sha256').update(stableStringify(value)).digest('hex')

export const computeBytesSha256 = (bytes: ArrayBuffer | Uint8Array | Buffer) => {
  const buffer = bytes instanceof ArrayBuffer ? Buffer.from(bytes) : Buffer.from(bytes)

  return createHash('sha256').update(buffer).digest('hex')
}
