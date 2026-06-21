/**
 * TASK-1192 Slice 3 — gates de capability fina en payment-orders.
 *
 * (1) Behavioral del más sensible (mark-paid, rebaja banco atómica): sin capability →
 *     403 y el command NUNCA corre; con capability → el command corre.
 * (2) Matriz estructural: cada write route gatea con su capability esperada (anti-regresión
 *     de que alguien quite el can() sin darse cuenta).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const tenantMock = vi.fn()

vi.mock('@/lib/tenant/authorization', () => ({
  requireFinanceTenantContext: () => tenantMock()
}))

const canMock = vi.fn()

vi.mock('@/lib/entitlements/runtime', () => ({ can: (...args: unknown[]) => canMock(...args) }))

const markPaidMock = vi.fn()

vi.mock('@/lib/finance/payment-orders/mark-paid', () => ({
  markPaymentOrderPaid: (...args: unknown[]) => markPaidMock(...args)
}))

import { POST as markPaidPOST } from './[orderId]/mark-paid/route'

const tenant = { userId: 'u-1', tenantType: 'efeonce_internal', roleCodes: ['finance_admin'], routeGroups: ['finance'] }

const req = (body: unknown) =>
  new Request('http://localhost/x', { method: 'POST', body: JSON.stringify(body) })

const params = { params: Promise.resolve({ orderId: 'po-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  tenantMock.mockResolvedValue({ tenant, errorResponse: null })
  canMock.mockReturnValue(true)
  markPaidMock.mockResolvedValue({ order: { paymentOrderId: 'po-1', state: 'paid' }, eventId: 'e-1' })
})

afterEach(() => vi.restoreAllMocks())

describe('mark-paid capability gate', () => {
  it('sin capability → 403 y NO ejecuta el command', async () => {
    canMock.mockReturnValue(false)

    const res = await markPaidPOST(req({ sourceAccountId: 'acc-1' }), params)

    expect(res.status).toBe(403)
    expect(markPaidMock).not.toHaveBeenCalled()
  })

  it('chequea finance.payment_orders.mark_paid (update, tenant)', async () => {
    canMock.mockReturnValue(false)
    await markPaidPOST(req({}), params)

    expect(canMock).toHaveBeenCalledWith(tenant, 'finance.payment_orders.mark_paid', 'update', 'tenant')
  })

  it('con capability → ejecuta el command', async () => {
    await markPaidPOST(req({ sourceAccountId: 'acc-1' }), params)

    expect(markPaidMock).toHaveBeenCalledTimes(1)
  })
})

describe('matriz estructural de gates (7 write routes)', () => {
  const base = process.cwd() + '/src/app/api/admin/finance/payment-orders'

  const matrix: Array<[string, string, string]> = [
    ['route.ts', 'finance.payment_orders.create', 'create'],
    ['[orderId]/route.ts', 'finance.payment_orders.update', 'update'],
    ['[orderId]/submit/route.ts', 'finance.payment_orders.submit', 'update'],
    ['[orderId]/approve/route.ts', 'finance.payment_orders.approve', 'approve'],
    ['[orderId]/schedule/route.ts', 'finance.payment_orders.schedule', 'update'],
    ['[orderId]/mark-paid/route.ts', 'finance.payment_orders.mark_paid', 'update'],
    ['[orderId]/cancel/route.ts', 'finance.payment_orders.cancel', 'update']
  ]

  it.each(matrix)('%s gatea con %s (%s)', (file, cap, action) => {
    const src = readFileSync(join(base, file), 'utf8')

    expect(src).toContain(`can(tenant, '${cap}', '${action}', 'tenant')`)
  })
})
