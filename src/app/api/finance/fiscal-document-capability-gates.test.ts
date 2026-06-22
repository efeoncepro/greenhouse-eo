/**
 * TASK-1193 Slice 3-5 — gates de capability fina en documentos fiscales/financieros.
 *
 * (1) Behavioral del fiscal-crítico (emit-dte): sin capability → 403 y la emisión Nubox
 *     NUNCA corre.
 * (2) Matriz estructural: cada write route gatea con su capability esperada en el handler
 *     de write (POST/PUT), no antes de un GET.
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

const emitDteMock = vi.fn()

vi.mock('@/lib/nubox/emission', () => ({ emitDte: (...args: unknown[]) => emitDteMock(...args) }))
vi.mock('@/lib/finance/dte-emission-queue', () => ({
  enqueueDteEmissionWithType: vi.fn(),
  enqueueDteEmission: vi.fn()
}))

import { POST as emitDtePOST } from './income/[id]/emit-dte/route'

const tenant = { userId: 'u-1', tenantType: 'efeonce_internal', roleCodes: ['finance_admin'], routeGroups: ['finance'] }

beforeEach(() => {
  vi.clearAllMocks()
  tenantMock.mockResolvedValue({ tenant, errorResponse: null })
  canMock.mockReturnValue(true)
})

afterEach(() => vi.restoreAllMocks())

describe('emit-dte capability gate', () => {
  it('sin capability → 403 y NO emite DTE', async () => {
    canMock.mockReturnValue(false)

    const req = new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({}) })
    const res = await emitDtePOST(req, { params: Promise.resolve({ id: 'inc-1' }) })

    expect(res.status).toBe(403)
    expect(emitDteMock).not.toHaveBeenCalled()
    expect(canMock).toHaveBeenCalledWith(tenant, 'finance.income.emit_dte', 'update', 'tenant')
  })
})

describe('matriz estructural de gates (19 write routes)', () => {
  const base = join(process.cwd(), 'src/app/api/finance')

  const matrix: Array<[string, string, string]> = [
    ['income/route.ts', 'finance.income.create', 'create'],
    ['income/[id]/route.ts', 'finance.income.update', 'update'],
    ['income/[id]/emit-dte/route.ts', 'finance.income.emit_dte', 'update'],
    ['income/batch-emit-dte/route.ts', 'finance.income.batch_emit_dte', 'update'],
    ['income/[id]/payment/route.ts', 'finance.income.record_payment', 'create'],
    ['income/[id]/payments/route.ts', 'finance.income.record_payment', 'create'],
    ['income/reconcile-payments/route.ts', 'finance.income.record_payment', 'create'],
    ['income/[id]/factor/route.ts', 'finance.income.factor', 'create'],
    ['expenses/route.ts', 'finance.expenses.create', 'create'],
    ['expenses/bulk/route.ts', 'finance.expenses.create', 'create'],
    ['expenses/[id]/route.ts', 'finance.expenses.update', 'update'],
    ['expenses/[id]/payments/route.ts', 'finance.expenses.record_payment', 'create'],
    ['hes/route.ts', 'finance.hes.create', 'create'],
    ['hes/[id]/submit/route.ts', 'finance.hes.submit', 'update'],
    ['hes/[id]/approve/route.ts', 'finance.hes.approve', 'approve'],
    ['hes/[id]/reject/route.ts', 'finance.hes.reject', 'update'],
    ['purchase-orders/route.ts', 'finance.purchase_orders.create', 'create'],
    ['purchase-orders/[id]/route.ts', 'finance.purchase_orders.update', 'update'],
    ['purchase-orders/[id]/cancel/route.ts', 'finance.purchase_orders.cancel', 'update']
  ]

  it.each(matrix)('%s gatea con %s (%s) en handler de write', (file, cap, action) => {
    const src = readFileSync(join(base, file), 'utf8')

    expect(src).toContain(`can(tenant, '${cap}', '${action}', 'tenant')`)
    const canIdx = src.indexOf(`can(tenant, '${cap}'`)
    const prevHandler = src.lastIndexOf('export async function', canIdx)

    expect(src.slice(prevHandler, prevHandler + 40)).toMatch(/POST|PUT/)
    expect(src.slice(prevHandler, prevHandler + 40)).not.toContain('GET')
  })
})
