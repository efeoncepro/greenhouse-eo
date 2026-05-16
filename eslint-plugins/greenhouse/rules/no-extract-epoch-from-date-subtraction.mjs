// TASK-893 hotfix #3 (2026-05-16) — greenhouse/no-extract-epoch-from-date-subtraction
//
// Bloquea SQL embebido en TS que use `EXTRACT(EPOCH FROM (X - Y))` cuando X o
// Y es de tipo `date` (no `timestamp` ni `timestamptz`). El bug class detectado
// 3 veces hoy via Sentry (commits 468505e5 + bec374c8):
//
//   1. payroll-participation-window-source-date-disagreement.ts:64
//      EXTRACT(EPOCH FROM (lc.effective_from - lo.start_date)) / 86400
//      → effective_from + start_date son DATE en PG real → date - date = integer
//      → EXTRACT(EPOCH FROM integer) does not exist → Sentry alert GET /admin
//
//   2. ledger-health.ts:161
//      EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(ab.balance_date)))::int / 86400
//      → balance_date es DATE → date - date = integer → mismo error
//      → Sentry alert POST /reliability-ai-watch
//
//   3. (defense in depth — pre-emptive coverage)
//
// La causa raiz NO es technical sino epistemica: `db.d.ts` infiere DATE columns
// como `Timestamp` TS (porque Kysely codegen no distingue). Developers asumen
// `Timestamp - Timestamp = interval` y aplican `EXTRACT(EPOCH FROM ...)`. PG
// real rechaza `date - date = integer` con `function pg_catalog.extract(unknown,
// integer) does not exist`.
//
// **Fix canonical**: NUNCA usar `EXTRACT(EPOCH FROM (X - Y))` cuando X o Y es
// `date`. En su lugar, restar directamente para obtener dias (integer):
//
//   ✗ EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(balance_date)))::int / 86400  AS days
//   ✓ (CURRENT_DATE - MAX(balance_date))::int                              AS days
//
// O si forzosamente se necesita epoch (e.g. comparar segundos), cast explicito
// a `timestamptz` AMBOS lados:
//
//   ✓ EXTRACT(EPOCH FROM ((X)::timestamptz - (Y)::timestamptz)) AS seconds
//
// Patrones SEGUROS que el rule NO bloquea:
//   ✓ NOW() - <timestamptz column>           (NOW() es timestamptz)
//   ✓ <timestamptz> - <timestamptz>          (interval result)
//   ✓ EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ...))
//
// Patrones INSEGUROS que el rule SI bloquea:
//   ✗ EXTRACT(EPOCH FROM (CURRENT_DATE - <anything>))
//   ✗ EXTRACT(EPOCH FROM (<anything>::date - <anything>))
//   ✗ EXTRACT(EPOCH FROM (MAX(<column>_date) - ...))
//   ✗ EXTRACT(EPOCH FROM (<col>.effective_from - <col>.start_date))   (dos date columns)
//
// Modo `error` desde commit-1 (tolerancia cero — el bug class ya genero 2 Sentry
// alerts en producción hoy).
//
// Spec: CLAUDE.md sección "Schema validation gate for SQL signal readers".

const UNSAFE_PATTERNS = [
  // ─── EXTRACT(EPOCH FROM (CURRENT_DATE - ...)) ─────────────────────────────
  // CURRENT_DATE es type `date`. Restar lo que sea da o `date` (con interval)
  // o `integer` (con date). El bug class concreto: integer result.
  {
    regex: /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\(\s*CURRENT_DATE\s*-/i,
    label: 'EXTRACT(EPOCH FROM (CURRENT_DATE - X)) — CURRENT_DATE es date; restar columna date da integer, no interval'
  },

  // ─── EXTRACT(EPOCH FROM (... - CURRENT_DATE)) ─────────────────────────────
  {
    regex: /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\([^()]+-\s*CURRENT_DATE\s*\)/i,
    label: 'EXTRACT(EPOCH FROM (X - CURRENT_DATE)) — mismo bug class invertido'
  },

  // ─── EXTRACT(EPOCH FROM (X::date - Y)) ────────────────────────────────────
  // Cast explicito a date dispara el bug class. Si necesitas epoch, cast a
  // timestamptz en su lugar.
  {
    regex: /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\(\s*[^()]*::\s*date\b/i,
    label: 'EXTRACT(EPOCH FROM (X::date - Y)) — cast a date dispara bug class. Usar ::timestamptz si necesitas epoch.'
  },

  // ─── EXTRACT(EPOCH FROM (... - X::date)) ──────────────────────────────────
  {
    regex: /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\([^()]+-\s*[^()]*::\s*date\b/i,
    label: 'EXTRACT(EPOCH FROM (X - Y::date)) — mismo bug class invertido'
  },

  // ─── EXTRACT(EPOCH FROM (MAX/MIN(<col>_date) - ...)) ──────────────────────
  // Heuristic: columna terminada en `_date` es typicamente DATE en PG. Si
  // emerge un false positive (columna `_date` pero realmente timestamp), el
  // dev usa cast explicito al timestamptz o agrega override comment.
  {
    regex: /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\(\s*(?:MAX|MIN)\s*\([^()]*_date[^()]*\)\s*-/i,
    label: 'EXTRACT(EPOCH FROM (MAX/MIN(*_date) - X)) — columnas con sufijo _date son typicamente DATE'
  },

  // ─── EXTRACT(EPOCH FROM (<table>.<col>_date - ...)) ───────────────────────
  // Direct column reference ending in `_date`.
  {
    regex: /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\(\s*\w+\.\w*_date\b\s*-/i,
    label: 'EXTRACT(EPOCH FROM (X.*_date - Y)) — columna *_date es typicamente DATE'
  },

  // ─── EXTRACT(EPOCH FROM (<col>.effective_from - <col>.*_date)) ────────────
  // El caso TASK-893 source-date-disagreement original (effective_from + start_date
  // ambos DATE en schema canonico TASK-890 + TASK-872).
  {
    regex: /EXTRACT\s*\(\s*EPOCH\s+FROM\s*\(\s*\w+\.effective_from\s*-\s*\w+\.start_date/i,
    label: 'EXTRACT(EPOCH FROM (effective_from - start_date)) — ambas columnas DATE en schema canonico'
  }
]

const HELPER_HINT = `
**Fix canonical** (3 opciones, en orden de preferencia):

1. Si solo necesitas dias (most common case):
     ✗ EXTRACT(EPOCH FROM (CURRENT_DATE - MAX(balance_date)))::int / 86400 AS days_stale
     ✓ (CURRENT_DATE - MAX(balance_date))::int AS days_stale

2. Si necesitas dias con decimales (fractional days):
     ✗ EXTRACT(EPOCH FROM (X - Y)) / 86400.0 AS days
     ✓ ((X)::timestamptz - (Y)::timestamptz) AS interval_days
     ✓ EXTRACT(DAY FROM ((X)::timestamptz - (Y)::timestamptz)) AS days

3. Si necesitas segundos (epoch):
     ✗ EXTRACT(EPOCH FROM (X - Y))           [donde X o Y es date]
     ✓ EXTRACT(EPOCH FROM ((X)::timestamptz - (Y)::timestamptz)) AS seconds

**Background**: \`db.d.ts\` infiere DATE columns como \`Timestamp\` TS (Kysely
codegen no distingue). Developers asumen \`Timestamp - Timestamp = interval\` y
aplican \`EXTRACT(EPOCH FROM ...)\`. En PG real \`date - date = integer\`, no
interval. Resultado: \`function pg_catalog.extract(unknown, integer) does not
exist\` en runtime.

**Bug class historico** (canonizado en CLAUDE.md):
- 2026-05-16 09:00 UTC-4: GET /admin (Sentry JAVASCRIPT-NEXTJS-5Z)
- 2026-05-16 09:00 UTC-4: POST /reliability-ai-watch (Sentry JAVASCRIPT-NEXTJS-61)
- 3 callsites detectados; este rule previene #4.

**Schema verification canonical**: cuando un reader SQL nuevo emerja, verificar
contra PG real ANTES de mergear:

  pnpm pg:connect:shell
  greenhouse_app=> SELECT data_type FROM information_schema.columns
                   WHERE table_schema='...' AND table_name='...' AND column_name='...';

NO confiar en TS \`db.d.ts\` shapes inferred — son estimates.
`.trim()

const buildMessage = (label) =>
  `SQL embebido detecta el anti-patron TASK-893 hotfix [${label}]. Este patron rompe en PG real con 'function pg_catalog.extract(unknown, integer) does not exist' porque date - date = integer (no interval) y EXTRACT(EPOCH FROM integer) no existe.\n\n${HELPER_HINT}`

const checkSqlString = (context, node, sqlText) => {
  for (const { regex, label } of UNSAFE_PATTERNS) {
    if (regex.test(sqlText)) {
      context.report({
        node,
        message: buildMessage(label)
      })

      // Solo reportar el primer hit — el dev arregla uno y re-corre.
      return
    }
  }
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe SQL embebido con EXTRACT(EPOCH FROM (X - Y)) cuando X o Y es DATE. Pattern rompe runtime PG con extract(unknown, integer) does not exist.',
      url: 'docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md'
    },
    schema: []
  },

  create(context) {
    return {
      // Template literals (raw SQL: query`...`, runGreenhousePostgresQuery(`...`))
      TemplateLiteral(node) {
        if (node.expressions.length === 0) {
          const text = node.quasis.map((q) => q.value.raw).join('')

          checkSqlString(context, node, text)

          return
        }

        // Dynamic template: join static parts
        const text = node.quasis.map((q) => q.value.raw).join(' ')

        checkSqlString(context, node, text)
      },

      // Plain string literals as SQL
      Literal(node) {
        if (typeof node.value !== 'string' || node.value.length < 40) return

        checkSqlString(context, node, node.value)
      }
    }
  }
}
