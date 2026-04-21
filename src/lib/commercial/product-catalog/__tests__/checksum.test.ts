import { describe, expect, it } from 'vitest'

import {
  GH_OWNED_FIELDS_CHECKSUM_ORDER,
  computeGhOwnedFieldsChecksum
} from '../checksum'
import type { GhOwnedFieldsSnapshot } from '../types'

const baseSnapshot = (): GhOwnedFieldsSnapshot => ({
  product_code: 'ECG-001',
  product_name: 'Senior Designer',
  description: 'Billable designer role',
  default_unit_price: 120,
  default_currency: 'USD',
  default_unit: 'hour',
  product_type: 'service',
  pricing_model: 'staff_aug',
  business_line_code: 'globe',
  is_archived: false
})

describe('computeGhOwnedFieldsChecksum', () => {
  it('produces a deterministic SHA-256 hex string', () => {
    const hash = computeGhOwnedFieldsChecksum(baseSnapshot())

    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(computeGhOwnedFieldsChecksum(baseSnapshot())).toBe(hash)
  })

  it('covers the exact 10 canonical fields in the documented order', () => {
    expect(GH_OWNED_FIELDS_CHECKSUM_ORDER).toEqual([
      'product_code',
      'product_name',
      'description',
      'default_unit_price',
      'default_currency',
      'default_unit',
      'product_type',
      'pricing_model',
      'business_line_code',
      'is_archived'
    ])
  })

  it('changes when any single tracked field changes', () => {
    const base = computeGhOwnedFieldsChecksum(baseSnapshot())

    for (const field of GH_OWNED_FIELDS_CHECKSUM_ORDER) {
      const snap = baseSnapshot()

      if (field === 'is_archived') {
        snap.is_archived = !snap.is_archived
      } else if (field === 'default_unit_price') {
        snap.default_unit_price = snap.default_unit_price === null ? 0 : snap.default_unit_price + 1
      } else {
        // string + nullable string fields — mutate to something distinct.
        const current = snap[field]

        ;(snap as unknown as Record<string, unknown>)[field] = current === null ? 'x' : `${String(current)}-mutated`
      }

      expect(computeGhOwnedFieldsChecksum(snap)).not.toBe(base)
    }
  })

  it('treats null and empty string equivalently for nullable fields', () => {
    // Justification: UPDATE ... SET description = NULL vs SET description = ''
    // should not trigger drift — this is documented in checksum.ts.
    const withNull = baseSnapshot()

    withNull.description = null

    const withEmpty = baseSnapshot()

    withEmpty.description = ''

    expect(computeGhOwnedFieldsChecksum(withNull)).toBe(
      computeGhOwnedFieldsChecksum(withEmpty)
    )
  })

  it('treats booleans as "true" | "false", not 1 | 0', () => {
    const snap = baseSnapshot()

    snap.is_archived = true
    const hash = computeGhOwnedFieldsChecksum(snap)

    const imposter = baseSnapshot()


    // @ts-expect-error — the type says boolean, but we verify the normalizer
    //                   would have surfaced drift if someone passed 1 by hand.
    imposter.is_archived = 1
    expect(computeGhOwnedFieldsChecksum(imposter)).not.toBe(hash)
  })

  it('produces stable hashes across object reorderings (field order is controlled internally)', () => {
    const snap: GhOwnedFieldsSnapshot = {
      is_archived: false,
      business_line_code: 'globe',
      pricing_model: 'staff_aug',
      product_type: 'service',
      default_unit: 'hour',
      default_currency: 'USD',
      default_unit_price: 120,
      description: 'Billable designer role',
      product_name: 'Senior Designer',
      product_code: 'ECG-001'
    }

    expect(computeGhOwnedFieldsChecksum(snap)).toBe(
      computeGhOwnedFieldsChecksum(baseSnapshot())
    )
  })
})
