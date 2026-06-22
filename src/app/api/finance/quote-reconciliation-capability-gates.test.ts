/**
 * TASK-1202 Slice 3-4 — matriz estructural de gates de capability en quotes + reconciliation.
 *
 * El lifecycle del cotizador usa la capability EXISTENTE commercial.quotation (consistente
 * con el command de TASK-1212); convert-to-invoice usa commercial.quote_to_cash.execute;
 * simulate usa commercial.quote.simulate; las price-affecting (cost_override, pricing_config)
 * usan capabilities admin-only; reconciliation auto-match usa finance.reconciliation.match.
 * Test estructural anti-regresión (que no se quite el can()). El gate va en el handler de
 * write (POST/PUT/DELETE), no en GET. La autoría (/author) queda gobernada por el command.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const base = join(process.cwd(), 'src/app/api/finance')

const matrix: Array<[string, string, string, string]> = [
  ['quotes/route.ts', 'commercial.quotation', 'create', 'tenant'],
  ['quotes/from-service/route.ts', 'commercial.quotation', 'create', 'tenant'],
  ['quotes/[id]/route.ts', 'commercial.quotation', 'update', 'tenant'],
  ['quotes/[id]/lines/route.ts', 'commercial.quotation', 'update', 'tenant'],
  ['quotes/[id]/recalculate/route.ts', 'commercial.quotation', 'update', 'tenant'],
  ['quotes/[id]/terms/route.ts', 'commercial.quotation', 'update', 'tenant'],
  ['quotes/[id]/versions/route.ts', 'commercial.quotation', 'update', 'tenant'],
  ['quotes/[id]/save-as-template/route.ts', 'commercial.quotation', 'update', 'tenant'],
  ['quotes/[id]/issue/route.ts', 'commercial.quotation', 'approve', 'tenant'],
  ['quotes/[id]/approve/route.ts', 'commercial.quotation', 'approve', 'tenant'],
  ['quotes/[id]/send/route.ts', 'commercial.quotation', 'export', 'tenant'],
  ['quotes/[id]/share/route.ts', 'commercial.quotation', 'export', 'tenant'],
  ['quotes/[id]/share/[shortCode]/route.ts', 'commercial.quotation', 'export', 'tenant'],
  ['quotes/[id]/share/[shortCode]/send-email/route.ts', 'commercial.quotation', 'export', 'tenant'],
  ['quotes/[id]/share/[shortCode]/resend-email/route.ts', 'commercial.quotation', 'export', 'tenant'],
  ['quotes/[id]/convert-to-invoice/route.ts', 'commercial.quote_to_cash.execute', 'approve', 'tenant'],
  ['quotes/pricing/simulate/route.ts', 'commercial.quote.simulate', 'read', 'tenant'],
  ['quotes/[id]/lines/[lineItemId]/cost-override/route.ts', 'commercial.quotation.cost_override', 'update', 'tenant'],
  ['reconciliation/auto-match/route.ts', 'finance.reconciliation.match', 'create', 'space']
  // pricing/config NO va acá: su can() vive en el helper canEditPricingConfig (compartido
  // por GET canEdit + PUT gate), no dentro de un handler — cubierto por el test dedicado abajo.
]

describe('TASK-1202 — quote + reconciliation write routes gatean por capability', () => {
  it.each(matrix)('%s gatea con %s (%s/%s)', (file, cap, action, scope) => {
    const src = readFileSync(join(base, file), 'utf8')

    expect(src).toContain(`can(tenant, '${cap}', '${action}', '${scope}')`)
    const canIdx = src.indexOf(`can(tenant, '${cap}'`)
    const prevHandler = src.lastIndexOf('export async function', canIdx)

    expect(src.slice(prevHandler, prevHandler + 45)).toMatch(/POST|PUT|DELETE/)
    expect(src.slice(prevHandler, prevHandler + 45)).not.toContain('GET')
  })

  it('pricing/config es capability-based: canEditPricingConfig llama can() y lo usan GET + PUT', () => {
    const src = readFileSync(join(base, 'quotes/pricing/config/route.ts'), 'utf8')

    // El helper ahora es capability-based; lo consume el GET (flag canEdit) y el PUT (gate).
    expect(src).toContain("can(tenant, 'commercial.quotation.pricing_config', 'update', 'tenant')")
    expect(src).toContain('canEditPricingConfig(tenant)')
    // El check de rol inline (anti-patrón) ya no existe como const.
    expect(src).not.toContain("const FINANCE_ADMIN_ROLES")
  })
})
