/**
 * TASK-1192 Slice 4 — matriz estructural de gates de capability en treasury/shareholder.
 *
 * Cada write route enforza su capability fina ANTES del command. Test estructural
 * (anti-regresión de que el can() no se quite). El behavioral del path más sensible vive
 * en payment-orders-capability-gates.test.ts (mark-paid).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const base = join(process.cwd(), 'src/app/api/finance')

const matrix: Array<[string, string, string]> = [
  ['bank/route.ts', 'finance.bank_accounts.create', 'create'],
  ['bank/[accountId]/route.ts', 'finance.bank_accounts.update', 'update'],
  ['bank/transfer/route.ts', 'finance.bank_transfers.create', 'create'],
  ['settlements/payment/route.ts', 'finance.settlements.record_payment', 'create'],
  ['shareholder-account/route.ts', 'finance.shareholder_account.create', 'create'],
  ['shareholder-account/[id]/movements/route.ts', 'finance.shareholder_account.record_movement', 'create']
]

describe('TASK-1192 — treasury/shareholder write routes gatean por capability', () => {
  it.each(matrix)('%s gatea con %s (%s)', (file, cap, action) => {
    const src = readFileSync(join(base, file), 'utf8')

    expect(src).toContain(`can(tenant, '${cap}', '${action}', 'tenant')`)
    // El gate va en el handler de write, nunca antes de un GET (read queda coarse).
    const canIdx = src.indexOf(`can(tenant, '${cap}'`)
    const prevHandler = src.lastIndexOf('export async function', canIdx)

    expect(src.slice(prevHandler, prevHandler + 40)).toContain('POST')
  })
})
