import { describe, expect, it } from 'vitest'

import {
  mapPaymentInstrumentAccountRow,
  serializePaymentInstrumentAuditSnapshot,
  serializePaymentInstrumentSafe
} from './serializer'
import type { PaymentInstrumentAccountRow } from './types'

const buildRow = (overrides: Partial<PaymentInstrumentAccountRow> = {}): PaymentInstrumentAccountRow => ({
  account_id: 'santander-clp',
  space_id: 'space-efeonce',
  account_name: 'Santander CLP',
  bank_name: 'Banco Santander',
  account_number: '123456789',
  account_number_full: '00123456789',
  currency: 'CLP',
  account_type: 'checking',
  country_code: 'CL',
  is_active: true,
  opening_balance: '1000',
  opening_balance_date: '2026-01-01',
  notes: 'Main account',
  instrument_category: 'bank_account',
  provider_slug: 'santander',
  provider_identifier: '76.123.456-7',
  card_last_four: null,
  card_network: null,
  credit_limit: null,
  responsible_user_id: 'user-1',
  default_for: ['supplier_payment'],
  display_order: 1,
  metadata_json: { operationalOwner: 'finance' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  ...overrides
})

describe('payment instrument serializer', () => {
  it('redacts full account and provider identifiers in default records', () => {
    const record = mapPaymentInstrumentAccountRow(buildRow())
    const safe = serializePaymentInstrumentSafe(record)

    expect(safe.accountNumber).toBe('•••• 6789')
    expect(safe.accountNumberFull).toBeNull()
    expect(safe.providerIdentifier).toBe('•••• 56-7')
    expect(safe.sensitiveFields.accountNumberFull).toEqual({
      available: true,
      maskedValue: '•••• 6789'
    })
  })

  it('keeps audit snapshots redacted', () => {
    const record = mapPaymentInstrumentAccountRow(buildRow())
    const snapshot = serializePaymentInstrumentAuditSnapshot(record)

    expect(JSON.stringify(snapshot)).not.toContain('00123456789')
    expect(JSON.stringify(snapshot)).not.toContain('76.123.456-7')
    expect(snapshot).toMatchObject({
      accountId: 'santander-clp',
      accountNumberFull: {
        available: true,
        maskedValue: '•••• 6789'
      },
      providerIdentifier: {
        available: true,
        maskedValue: '•••• 56-7'
      }
    })
  })
})
