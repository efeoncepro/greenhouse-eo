import { describe, expect, it } from 'vitest'

import { sanitizeBankText, sanitizePromptPayload } from './sanitize'

describe('reconciliation intelligence prompt sanitization', () => {
  it('redacts bank-sensitive identifiers while preserving operational text', () => {
    const sanitized = sanitizeBankText(
      'Pago cliente juana@example.com RUT 12.345.678-9 cuenta 123456789012 ref ABC123456 tarjeta 4111 1111 1111 1111'
    )

    expect(sanitized).toContain('Pago cliente')
    expect(sanitized).toContain('<email>')
    expect(sanitized).toContain('<rut>')
    expect(sanitized).toContain('<bank-account-ref>')
    expect(sanitized).toContain('<bank-reference>')
    expect(sanitized).toContain('<card-or-account>')
    expect(sanitized).not.toContain('juana@example.com')
    expect(sanitized).not.toContain('12.345.678-9')
  })

  it('sanitizes nested prompt payloads without changing non-string fields', () => {
    const payload = sanitizePromptPayload({
      amount: 125000,
      row: {
        description: 'Transferencia a proveedor@example.com operacion ZZ998877',
        tags: ['rut 12345678-5', 'ok']
      }
    })

    expect(payload.amount).toBe(125000)
    expect(payload.row.description).toContain('<email>')
    expect(payload.row.description).toContain('<bank-reference>')
    expect(payload.row.tags[0]).toContain('<rut>')
    expect(payload.row.tags[1]).toBe('ok')
  })
})
