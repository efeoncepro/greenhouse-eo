// TASK-768 Slice 8 — greenhouse/no-untokenized-expense-type-for-analytics
//
// Bloquea SQL embebido o codigo TS que filtre/branchee por `expense_type` o
// `income_type` para analisis economico. Esos campos son taxonomia FISCAL/SII
// (legacy `accounting_type`); para analisis economico (KPIs, ICO, P&L
// gerencial, Member Loaded Cost, Budget Engine, Cost Attribution) usar
// `economic_category`.
//
// Causa raiz cerrada: bug 2026-05-03 KPI Nomina cash-out abril mostraba
// $1.030.082 cuando los costos labor reales eran ~$4M. $3M+ payments labor
// (Daniela Espana, Andres Colombia, Valentina, Humberly, Previred) caian en
// buckets equivocados porque el reconciler defaulteaba expense_type='supplier'.
//
// La solucion robusta (TASK-768) separa las dos dimensiones:
//   - expense_type (fiscal/SII)            → SOLO para SII reports, VAT engine, IVA ledger.
//   - economic_category (analitica)        → para KPIs, ICO, P&L gerencial, allocations.
//
// Esta rule cierra cualquier futuro callsite que mezcle las dimensiones.
// Modo `error` desde el primer commit (cero tolerancia).
//
// Excepciones explicitas (override block):
//   - SII / IVA / VAT / chile-tax engine (TASK-529-533)
//   - Resolver canonico (src/lib/finance/economic-category/)
//   - Tests del resolver
//   - Migrations (las VIEWs/triggers se definen con SQL embebido)
//   - PG triggers (populate_*_economic_category_default)
//   - Backfill script (scripts/finance/backfill-economic-category.ts)
//
// Pattern heredado de no-untokenized-fx-math (TASK-766) y
// no-untokenized-copy (TASK-265).
//
// Spec: docs/tasks/in-progress/TASK-768-finance-expense-economic-category-dimension.md

const PATTERNS = [
  // SQL: WHERE/AND/FILTER e.expense_type = 'X' OR ip.expense_type IN (...)
  {
    regex: /\b[a-z]+\.expense_type\s*(=|IN|<>|!=)/i,
    label: 'SQL filter por expense_type para analisis'
  },
  // SQL: GROUP BY e.expense_type
  {
    regex: /GROUP\s+BY\s+[a-z]+\.expense_type\b/i,
    label: 'SQL GROUP BY expense_type'
  },
  // SQL: FILTER (WHERE expense_type ...)
  {
    regex: /FILTER\s*\(\s*WHERE\s+[a-z]+\.expense_type\b/i,
    label: 'SQL FILTER WHERE expense_type'
  },
  // Income mirror
  {
    regex: /\b[a-z]+\.income_type\s*(=|IN|<>|!=)/i,
    label: 'SQL filter por income_type para analisis'
  },
  {
    regex: /GROUP\s+BY\s+[a-z]+\.income_type\b/i,
    label: 'SQL GROUP BY income_type'
  },
  {
    regex: /FILTER\s*\(\s*WHERE\s+[a-z]+\.income_type\b/i,
    label: 'SQL FILTER WHERE income_type'
  }
]

const HELPER_HINT = `
Use \`economic_category\` instead for analytical reads:
  • src/lib/finance/expense-payments-reader.ts → sumExpensePaymentsClpForPeriod returns byEconomicCategory breakdown
  • src/lib/finance/income-payments-reader.ts  → sumIncomePaymentsClpForPeriod returns byEconomicCategory breakdown
  • greenhouse_finance.expense_payments_normalized.economic_category (VIEW canonica)
  • greenhouse_finance.income_payments_normalized.economic_category (VIEW canonica)

Excepciones legitimas: SII/IVA/VAT engine, chile-tax. Esos pueden seguir leyendo
expense_type (taxonomia fiscal). Para analisis economico, ICO, KPIs, P&L
gerencial, Member Loaded Cost, Budget Engine, Cost Attribution → economic_category.

Spec: docs/tasks/in-progress/TASK-768-finance-expense-economic-category-dimension.md
`.trim()

const buildMessage = (label) =>
  `Detectado anti-patron TASK-768 [${label}]. La columna expense_type/income_type es taxonomia fiscal (SII), NO analitica. Bank reconciler defaultea a 'supplier' lo que sesga KPIs Nomina/Proveedores en millones (caso real abril 2026: $3M+ mal-clasificados). Usar la dimension economic_category. ${HELPER_HINT}`

const checkSqlString = (context, node, sqlText) => {
  for (const { regex, label } of PATTERNS) {
    if (regex.test(sqlText)) {
      context.report({
        node,
        message: buildMessage(label)
      })

      return
    }
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe SQL/TS que use expense_type/income_type para analisis economico. Usar economic_category (TASK-768).',
      url: 'docs/tasks/in-progress/TASK-768-finance-expense-economic-category-dimension.md'
    },
    schema: []
  },

  create(context) {
    return {
      TemplateLiteral(node) {
        if (node.expressions.length === 0) {
          const text = node.quasis.map((q) => q.value.raw).join('')

          checkSqlString(context, node, text)

          return
        }

        const text = node.quasis.map((q) => q.value.raw).join(' ')

        checkSqlString(context, node, text)
      },

      Literal(node) {
        if (typeof node.value !== 'string' || node.value.length < 30) return

        checkSqlString(context, node, node.value)
      }
    }
  }
}
