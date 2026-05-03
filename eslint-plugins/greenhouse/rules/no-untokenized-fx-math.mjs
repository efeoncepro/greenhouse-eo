// TASK-766 Slice 3 — greenhouse/no-untokenized-fx-math
//
// Bloquea SQL embebido en TS con math casero `ep.amount × *_rate` o
// `ip.amount × *_rate`. La fuente de verdad para "monto en CLP de un
// payment" es la VIEW canónica `expense_payments_normalized` /
// `income_payments_normalized` o el helper TS:
//
//   import { sumExpensePaymentsClpForPeriod } from '@/lib/finance/expense-payments-reader'
//   import { sumIncomePaymentsClpForPeriod }  from '@/lib/finance/income-payments-reader'
//
// El bug del 2026-05-02 (`/finance/cash-out` KPIs inflados 88×) fue causa
// raíz arquitectónica: SQL embebidos asumían que `ep.currency == e.currency`,
// lo cual NO es invariante (caso CCA TASK-714c: expense USD pagado en CLP).
//
// Esta rule cierra la puerta a cualquier futuro callsite que reintroduzca
// el patrón. Modo `error` desde el primer commit (cero tolerancia a legacy
// — distinto a `no-untokenized-copy` que entró en `warn` por 318 warnings
// legacy aceptables; aquí cualquier hit es risk de KPIs inflados).
//
// Excepciones explícitas:
//   - Helpers/VIEWS canónicos (expense-payments-reader, income-payments-reader,
//     fx-pnl, income-settlement) — son el único lugar donde el cálculo es legítimo.
//   - Migrations: las VIEWS se definen con SQL; no aplica análisis estático del rule.
//   - Files que escriben amount_clp (recordExpensePayment, payment-ledger,
//     anchored-payments) — populán, no leen el cálculo broken.
//   - Tests: el espacio de tests puede mockear SQL strings que reflejan el
//     patrón legacy para verificar anti-regresión.
//
// Pattern heredado de no-untokenized-copy (TASK-265) y
// no-raw-table-without-shell (TASK-743): AST vanilla, .mjs, mensajes
// accionables apuntando al helper canónico.
//
// Spec: docs/tasks/in-progress/TASK-766-finance-clp-currency-reader-contract.md

const PATTERNS = [
  // expense_payments anti-pattern: ep.amount * COALESCE(e.exchange_rate_to_clp, ...)
  {
    regex: /\bep\.amount\s*\*\s*COALESCE\s*\(\s*[a-z_.]*exchange_rate_to_clp/i,
    label: 'ep.amount × COALESCE(...exchange_rate_to_clp)'
  },
  // expense_payments sin COALESCE
  {
    regex: /\bep\.amount\s*\*\s*[a-z_.]*exchange_rate_to_clp\b/i,
    label: 'ep.amount × exchange_rate_to_clp'
  },
  // income_payments anti-pattern: ip.amount * COALESCE(i.exchange_rate_to_clp, ...)
  {
    regex: /\bip\.amount\s*\*\s*COALESCE\s*\(\s*[a-z_.]*exchange_rate_to_clp/i,
    label: 'ip.amount × COALESCE(...exchange_rate_to_clp)'
  },
  // income_payments sin COALESCE
  {
    regex: /\bip\.amount\s*\*\s*[a-z_.]*exchange_rate_to_clp\b/i,
    label: 'ip.amount × exchange_rate_to_clp'
  }
]

const HELPER_HINT = `
Use the canonical reader instead:
  • src/lib/finance/expense-payments-reader.ts → sumExpensePaymentsClpForPeriod / listExpensePaymentsNormalized
  • src/lib/finance/income-payments-reader.ts  → sumIncomePaymentsClpForPeriod  / listIncomePaymentsNormalized

These wrap VIEW greenhouse_finance.expense_payments_normalized /
income_payments_normalized which expose payment_amount_clp via the
canonical COALESCE chain (amount_clp persistido > CLP-trivial fallback >
NULL+drift_flag) and filter 3-axis supersede.

Spec: docs/tasks/in-progress/TASK-766-finance-clp-currency-reader-contract.md
`.trim()

const buildMessage = (label) =>
  `SQL embebido detecta el anti-patrón TASK-766 [${label}]. Multiplicar ep.amount/ip.amount × *exchange_rate_to_clp* infla KPIs cuando el payment está en una moneda distinta al expense/income (caso CCA TASK-714c: $1.1M CLP × rate USD = $1B fantasma). ${HELPER_HINT}`

const checkSqlString = (context, node, sqlText) => {
  for (const { regex, label } of PATTERNS) {
    if (regex.test(sqlText)) {
      context.report({
        node,
        message: buildMessage(label)
      })

      // Solo reportar el primer hit — el dev debe arreglar uno y re-correr.
      return
    }
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe SQL embebido con math casero ep.amount/ip.amount × *exchange_rate_to_clp*. Usar VIEW *_normalized o helper canónico (TASK-766).',
      url: 'docs/tasks/in-progress/TASK-766-finance-clp-currency-reader-contract.md'
    },
    schema: []
  },

  create(context) {
    return {
      // Template literals (raw SQL: query`...`, sql`...`, runGreenhousePostgresQuery(`...`)).
      TemplateLiteral(node) {
        if (node.expressions.length === 0) {
          // Static template: concatenate the single quasi.
          const text = node.quasis.map((q) => q.value.raw).join('')

          checkSqlString(context, node, text)

          return
        }

        // Dynamic template (with interpolations): join the static parts and
        // check the combined string. Interpolations are typically param values
        // ($1, $2 placeholders) — they don't carry the anti-pattern themselves.
        const text = node.quasis.map((q) => q.value.raw).join(' ')

        checkSqlString(context, node, text)
      },

      // Plain string literals passed as SQL (e.g. runGreenhousePostgresQuery('SELECT...'))
      Literal(node) {
        if (typeof node.value !== 'string' || node.value.length < 30) return

        checkSqlString(context, node, node.value)
      }
    }
  }
}
