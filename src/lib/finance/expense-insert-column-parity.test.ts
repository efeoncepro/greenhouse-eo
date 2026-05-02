import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { checkInsertParity } from './expense-insert-column-parity'

// TASK-765 Slice 2: Universal anti-regression para INSERTs SQL embebidos en
// TS hacia tablas wide del modulo finance. El incidente origen 2026-05-01
// dejo el materializador `finance_expense_reactive_intake` en dead-letter
// con `INSERT has more target columns than expressions` — error PG no
// recuperable que bloqueo 7 expenses para periodo 2026-04 y por lo tanto
// 2 payment_orders zombie sin downstream.
//
// El parity test valida estaticamente que cada INSERT site mantenga
// column-count == expression-count. Si alguien modifica una columna sin
// actualizar el VALUES (o viceversa), el test rompe build antes del deploy.
//
// Cobertura intencional: las 4 tablas WIDE de Finance:
// - greenhouse_finance.expenses (93 cols hoy, INSERT lista 74)
// - greenhouse_finance.income (similar, mas baja en cardinalidad)
// - greenhouse_finance.income_payments
// - greenhouse_finance.expense_payments
//
// Sites con SQL dinamico (`${cols.join(', ')}`) NO se cubren staticamente
// — quedan documentados aqui y deben tener test integration propio.

interface InsertSite {
  label: string
  filePath: string
  /** Tabla esperada — usado para discriminar de otros INSERTs en el mismo archivo. */
  table: string
  /**
   * Si true, el SQL en este sitio es dynamic (template con interpolacion
   * runtime). Skipea parity statica y deja anotacion para review manual.
   */
  dynamic?: boolean
}

// Lista canonica de sitios verificados. Cuando agregues una nueva INSERT
// embebida hacia tablas wide de finance, agregala aqui o el test no la
// cubrira (silent gap).
const SITES: InsertSite[] = [
  // expenses
  {
    label: 'createFinanceExpenseInPostgres (postgres-store-slice2)',
    filePath: 'src/lib/finance/postgres-store-slice2.ts',
    table: 'greenhouse_finance.expenses'
  },
  {
    label: 'apply-payroll-reliquidation-delta',
    filePath: 'src/lib/finance/apply-payroll-reliquidation-delta.ts',
    table: 'greenhouse_finance.expenses'
  },
  {
    label: 'factoring (recordFactoringExpense)',
    filePath: 'src/lib/finance/factoring.ts',
    table: 'greenhouse_finance.expenses'
  },
  {
    label: 'materialize-payments-from-period',
    filePath: 'src/lib/payroll/materialize-payments-from-period.ts',
    table: 'greenhouse_finance.expenses'
  },
  {
    label: 'sync-nubox-to-postgres',
    filePath: 'src/lib/nubox/sync-nubox-to-postgres.ts',
    table: 'greenhouse_finance.expenses'
  },
  {
    label: 'anchored-payments (DYNAMIC — uses cols.join)',
    filePath: 'src/lib/finance/payment-instruments/anchored-payments.ts',
    table: 'greenhouse_finance.expenses',
    dynamic: true
  },
  // income
  {
    label: 'createFinanceIncomeInPostgres (postgres-store-slice2)',
    filePath: 'src/lib/finance/postgres-store-slice2.ts',
    table: 'greenhouse_finance.income'
  },
  {
    label: 'sync-nubox-to-postgres (income)',
    filePath: 'src/lib/nubox/sync-nubox-to-postgres.ts',
    table: 'greenhouse_finance.income'
  },
  // income_payments
  {
    label: 'payment-ledger (recordIncomePayment)',
    filePath: 'src/lib/finance/payment-ledger.ts',
    table: 'greenhouse_finance.income_payments'
  },
  {
    label: 'createFinanceIncomePaymentInPostgres (postgres-store-slice2)',
    filePath: 'src/lib/finance/postgres-store-slice2.ts',
    table: 'greenhouse_finance.income_payments'
  },
  {
    label: 'factoring (income_payments)',
    filePath: 'src/lib/finance/factoring.ts',
    table: 'greenhouse_finance.income_payments'
  },
  // expense_payments
  {
    label: 'expense-payment-ledger (recordExpensePayment)',
    filePath: 'src/lib/finance/expense-payment-ledger.ts',
    table: 'greenhouse_finance.expense_payments'
  },
  {
    label: 'anchored-payments (expense_payments)',
    filePath: 'src/lib/finance/payment-instruments/anchored-payments.ts',
    table: 'greenhouse_finance.expense_payments'
  },
  {
    label: 'materialize-payments-from-period (expense_payments)',
    filePath: 'src/lib/payroll/materialize-payments-from-period.ts',
    table: 'greenhouse_finance.expense_payments'
  }
]

const REPO_ROOT = resolve(__dirname, '../../..')

const readSource = (relPath: string): string => {
  return readFileSync(resolve(REPO_ROOT, relPath), 'utf-8')
}

/**
 * Extrae todos los bloques `INSERT INTO <table> (cols) VALUES (vals)`
 * del source. Soporta multilinea, template literals, comments inline.
 *
 * Retorna los snippets completos desde "INSERT" hasta el ")" de cierre
 * de VALUES.
 */
const extractInsertBlocks = (source: string, table: string): string[] => {
  const blocks: string[] = []

  const tablePattern = new RegExp(
    `INSERT\\s+INTO\\s+${table.replace(/\./g, '\\.')}\\b`,
    'gi'
  )

  let match: RegExpExecArray | null

  while ((match = tablePattern.exec(source)) !== null) {
    // Capturar desde aqui hasta el ")" que cierra el segundo paren-group
    // (column list -> VALUES list).
    const start = match.index
    let i = start

    // Find first "(" para column list
    while (i < source.length && source[i] !== '(') i++
    if (i >= source.length) continue

    // Balance parens — end of column list
    let depth = 0
    let inSingleQuote = false

    for (; i < source.length; i++) {
      const ch = source[i]

      if (ch === "'" && source[i - 1] !== '\\') inSingleQuote = !inSingleQuote
      if (inSingleQuote) continue

      if (ch === '(') depth++
      else if (ch === ')') {
        depth--

        if (depth === 0) break
      }
    }

    if (depth !== 0) continue

    // Buscar VALUES después
    const tail = source.slice(i + 1)
    const valuesMatch = tail.match(/VALUES\s*\(/i)

    if (!valuesMatch) continue

    let j = i + 1 + valuesMatch.index! + valuesMatch[0].length - 1

    depth = 0
    inSingleQuote = false

    for (; j < source.length; j++) {
      const ch = source[j]

      if (ch === "'" && source[j - 1] !== '\\') inSingleQuote = !inSingleQuote
      if (inSingleQuote) continue

      if (ch === '(') depth++
      else if (ch === ')') {
        depth--

        if (depth === 0) break
      }
    }

    if (depth !== 0) continue

    blocks.push(source.slice(start, j + 1))
  }

  return blocks
}

describe('expense-insert-column-parity', () => {
  describe('checkInsertParity (helper)', () => {
    it('detecta paridad correcta', () => {
      const sql = `INSERT INTO foo.bar (a, b, c) VALUES ($1, $2, $3)`

      const r = checkInsertParity(sql)

      expect(r.ok).toBe(true)
      expect(r.columnCount).toBe(3)
      expect(r.expressionCount).toBe(3)
    })

    it('detecta mismatch real', () => {
      const sql = `INSERT INTO foo.bar (a, b, c) VALUES ($1, $2)`

      const r = checkInsertParity(sql)

      expect(r.ok).toBe(false)
      expect(r.columnCount).toBe(3)
      expect(r.expressionCount).toBe(2)
      expect(r.reason).toContain('Mismatch')
    })

    it('respeta literales y casts en VALUES', () => {
      const sql = `INSERT INTO x.y (a, b, c, d) VALUES ($1, FALSE, $2::date, CURRENT_TIMESTAMP)`

      const r = checkInsertParity(sql)

      expect(r.ok).toBe(true)
      expect(r.columnCount).toBe(4)
      expect(r.expressionCount).toBe(4)
    })

    it('respeta function calls anidadas en VALUES', () => {
      const sql = `INSERT INTO x.y (a, b) VALUES (COALESCE($1, NOW()), $2)`

      const r = checkInsertParity(sql)

      expect(r.ok).toBe(true)
      expect(r.columnCount).toBe(2)
      expect(r.expressionCount).toBe(2)
    })

    it('respeta strings con comas', () => {
      const sql = `INSERT INTO x.y (a, b) VALUES ('hola, mundo', $1)`

      const r = checkInsertParity(sql)

      expect(r.ok).toBe(true)
      expect(r.columnCount).toBe(2)
      expect(r.expressionCount).toBe(2)
    })
  })

  describe('cobertura de sitios canonicos', () => {
    it.each(SITES.filter(s => !s.dynamic))(
      'paridad estatica: $label',
      ({ filePath, table }) => {
        const source = readSource(filePath)
        const blocks = extractInsertBlocks(source, table)

        expect(
          blocks.length,
          `Esperaba al menos 1 bloque INSERT INTO ${table} en ${filePath}, encontrados=${blocks.length}`
        ).toBeGreaterThan(0)

        for (const block of blocks) {
          const r = checkInsertParity(block)

          expect(
            r.ok,
            `parity FAIL en ${filePath}:\n  cols=${r.columnCount} exprs=${r.expressionCount}\n  reason=${r.reason}\n  block=${block.slice(0, 200)}…`
          ).toBe(true)
        }
      }
    )

    it('sitios DYNAMIC quedan documentados (no validados estaticamente)', () => {
      const dynamicSites = SITES.filter(s => s.dynamic)

      // Al menos 1 site dynamic conocido — si llega a 0, alguien lo
      // refactorizo a static y hay que sacarlo de la lista DYNAMIC.
      expect(dynamicSites.length).toBeGreaterThan(0)

      for (const site of dynamicSites) {
        const source = readSource(site.filePath)

        // Un site dynamic debe contener interpolacion (`${...}`) en el INSERT.
        // Si no, estaria mal clasificado.
        const blocks = extractInsertBlocks(source, site.table)
        const hasInterpolation = blocks.some(b => b.includes('${') || b.includes('cols.join'))

        expect(
          hasInterpolation || source.includes('cols.join'),
          `Site ${site.label} marcado como dynamic pero no se ve interpolacion en ${site.filePath}`
        ).toBe(true)
      }
    })
  })
})
