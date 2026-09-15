/**
 * TASK-1845 — hash canónico de encargos/snapshots/planes. JSON con claves ordenadas
 * (recursivo, arrays en orden) → sha256 hex. Dos payloads semánticamente iguales
 * producen el mismo hash aunque difiera el orden de claves; el conflicto de idempotencia
 * compara este valor, no el texto crudo.
 */

import { createHash } from 'node:crypto'

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize)

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    return Object.keys(record)
      .filter(key => record[key] !== undefined)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize(record[key])

        return acc
      }, {})
  }

  return value
}

export const canonicalJson = (value: unknown): string => JSON.stringify(canonicalize(value))

export const sha256Hex = (input: string): string => createHash('sha256').update(input, 'utf8').digest('hex')

export const hashCanonical = (value: unknown): string => sha256Hex(canonicalJson(value))
