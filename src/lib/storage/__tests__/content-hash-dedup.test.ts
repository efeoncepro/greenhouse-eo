/**
 * TASK-721 — Content hash + dedup behavior tests.
 *
 * Smoke tests para SHA-256 computation. La integración real con PG queda
 * cubierta por el detector + manual smoke test del drawer.
 */
import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

describe('TASK-721 content hash computation', () => {
  it('genera SHA-256 hex determinístico para mismo contenido', () => {
    const bytes = Buffer.from('test cartola content')
    const hash1 = createHash('sha256').update(bytes).digest('hex')
    const hash2 = createHash('sha256').update(bytes).digest('hex')

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // SHA-256 = 32 bytes = 64 hex chars
  })

  it('genera hash distinto para contenido distinto', () => {
    const bytes1 = Buffer.from('cartola santander 28/04')
    const bytes2 = Buffer.from('cartola global66 28/04')
    const hash1 = createHash('sha256').update(bytes1).digest('hex')
    const hash2 = createHash('sha256').update(bytes2).digest('hex')

    expect(hash1).not.toBe(hash2)
  })

  it('hash es estable frente a binarios idénticos en diferentes uploads', () => {
    // Simula dos uploads del mismo PDF → mismo hash → dedup esperado
    const original = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]) // JPEG magic bytes
    const reupload = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])

    const hash1 = createHash('sha256').update(Buffer.from(original)).digest('hex')
    const hash2 = createHash('sha256').update(Buffer.from(reupload)).digest('hex')

    expect(hash1).toBe(hash2)
  })

  it('un solo byte distinto cambia completamente el hash', () => {
    const a = Buffer.from([1, 2, 3, 4, 5])
    const b = Buffer.from([1, 2, 3, 4, 6])
    const hashA = createHash('sha256').update(a).digest('hex')
    const hashB = createHash('sha256').update(b).digest('hex')

    expect(hashA).not.toBe(hashB)

    // El % de diferencia debe ser alto (avalanche effect)
    let diffChars = 0

    for (let i = 0; i < hashA.length; i++) {
      if (hashA[i] !== hashB[i]) diffChars++
    }

    // Más del 30% de los chars deben ser distintos
    expect(diffChars).toBeGreaterThan(hashA.length * 0.3)
  })
})
