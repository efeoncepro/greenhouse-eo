/**
 * TASK-1212 Slice 3 — gate Zod del payload de autoría.
 */
import { describe, expect, it } from 'vitest'

import { submitQuoteFromBuilderPayloadSchema } from './submit-quote-from-builder-schema'

const createPayload = {
  mode: 'create',
  header: { organizationId: 'org-1', currency: 'CLP' },
  lines: [{ label: 'Discovery', lineType: 'direct_cost', unit: 'project', quantity: 1, unitPrice: 320000 }],
  issueAfterSave: false
}

describe('submitQuoteFromBuilderPayloadSchema', () => {
  it('acepta un create válido', () => {
    const parsed = submitQuoteFromBuilderPayloadSchema.safeParse(createPayload)

    expect(parsed.success).toBe(true)
  })

  it('default issueAfterSave=false cuando se omite', () => {
    const parsed = submitQuoteFromBuilderPayloadSchema.safeParse({ ...createPayload, issueAfterSave: undefined })

    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.issueAfterSave).toBe(false)
  })

  it('rechaza edit sin quotationId', () => {
    const parsed = submitQuoteFromBuilderPayloadSchema.safeParse({ ...createPayload, mode: 'edit' })

    expect(parsed.success).toBe(false)
  })

  it('acepta edit con quotationId', () => {
    const parsed = submitQuoteFromBuilderPayloadSchema.safeParse({ ...createPayload, mode: 'edit', quotationId: 'q-1' })

    expect(parsed.success).toBe(true)
  })

  it('rechaza currency no soportada', () => {
    const parsed = submitQuoteFromBuilderPayloadSchema.safeParse({
      ...createPayload,
      header: { organizationId: 'org-1', currency: 'JPY' }
    })

    expect(parsed.success).toBe(false)
  })

  it('rechaza un lineType inválido', () => {
    const parsed = submitQuoteFromBuilderPayloadSchema.safeParse({
      ...createPayload,
      lines: [{ label: 'x', lineType: 'bogus', unit: 'project', quantity: 1, unitPrice: 1 }]
    })

    expect(parsed.success).toBe(false)
  })
})
