// TASK-890 Slice 3 — greenhouse/no-inline-payroll-scope-gate
//
// Bloquea SQL embebido en TS que recompone el gate de "miembros en scope
// payroll" inline (NOT EXISTS contra work_relationship_offboarding_cases
// con filtros de status='executed' AND last_working_day).
//
// La fuente unica de verdad es el resolver canonico TASK-890:
//
//   import { resolveExitEligibilityForMembers, isMemberInPayrollScope }
//     from '@/lib/payroll/exit-eligibility'
//
// El bug class detectado live 2026-05-15 (caso Maria Camila Hoyos
// EO-OFF-2026-0609A520): el gate inline en pgGetApplicableCompensation-
// VersionsForPeriod solo excluia `status='executed' AND LWD<periodStart`,
// dejando casos external_payroll/Deel en `approved` o `draft` apareciendo
// full-month en nomina proyectada porque external providers cierran via
// proveedor externo y nunca transitan a `executed`.
//
// Asymmetric threshold per lane (canonical, ADR §2):
//   - internal_payroll | relationship_transition → exclude desde `executed`
//   - external_payroll | non_payroll             → exclude desde `approved`
//   - identity_only                              → never gates payroll
//   - unknown                                    → conservador (full_period + warn)
//
// Modo `warn` durante TASK-890 V1.0 (sweeps + telemetria observability);
// promueve a `error` post 30 dias steady o cuando flag default flip a true.
//
// Excepciones explicitas (override block en eslint.config.mjs):
//   - src/lib/payroll/exit-eligibility/**          — el resolver canonico
//   - src/lib/payroll/postgres-store.ts            — gate legacy behind flag
//     (grandfathered hasta V2 cutover; refactor remueve el inline SQL)
//   - eslint-plugins/greenhouse/rules/no-inline-payroll-scope-gate.mjs
//   - Tests anti-regresion del propio rule
//   - Migrations (DDL no es analisis estatico aplicable)
//
// Pattern fuente: TASK-766 (no-untokenized-fx-math) + TASK-825
// (no-untokenized-business-line-branching). AST vanilla, .mjs, mensajes
// accionables apuntando al helper canonico.
//
// Spec: docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md

const PATTERNS = [
  // ─── Legacy gate exacto (pgGet path pre-TASK-890) ─────────────────────────
  // NOT EXISTS (...work_relationship_offboarding_cases...status='executed'...last_working_day...)
  //
  // Matches the multi-line SQL fragment regardless of indentation, comments
  // inline, or formatting. `[\s\S]{0,N}` allows arbitrary content (including
  // newlines) up to N chars between the anchors.
  {
    regex: /NOT\s+EXISTS[\s\S]{0,300}work_relationship_offboarding_cases[\s\S]{0,400}status\s*=\s*['"]executed['"][\s\S]{0,200}last_working_day/i,
    label: 'NOT EXISTS legacy payroll scope gate (status=executed + last_working_day filter)'
  },

  // ─── Variantes: gate filtrando por last_working_day < $param ─────────────
  // Cubre el caso donde alguien copia el patron pero omite el status filter
  // (igual de roto: deja active members fuera si tienen una case historica).
  {
    regex: /NOT\s+EXISTS[\s\S]{0,300}work_relationship_offboarding_cases[\s\S]{0,400}last_working_day\s*<\s*\$/i,
    label: 'NOT EXISTS payroll gate filtering by last_working_day < $param (use resolver canonical)'
  },

  // ─── Variantes: EXISTS subquery filtering by offboarding status ──────────
  // Misma clase de bug: cualquiera filtrando members por EXISTS contra
  // offboarding_cases con `status='executed'` esta recomponiendo el gate.
  {
    regex: /\bEXISTS\s*\([\s\S]{0,300}work_relationship_offboarding_cases[\s\S]{0,400}status\s*=\s*['"]executed['"]/i,
    label: 'EXISTS subquery filtering offboarding by status=executed (use resolver canonical)'
  }
]

const HELPER_HINT = `
Use the canonical resolver instead:
  • src/lib/payroll/exit-eligibility → resolveExitEligibilityForMembers(memberIds, periodStart, periodEnd)
  • src/lib/payroll/exit-eligibility → isMemberInPayrollScope(memberId, asOf)  // thin predicate

These wrap the canonical policy declared in
GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md:

  - internal_payroll/relationship_transition: exclude when status='executed'
  - external_payroll/non_payroll: exclude when status in {approved, scheduled, executed}
  - cutoff = COALESCE(last_working_day, effective_date) — respeta schema CHECK
  - identity_only never gates payroll; unknown is conservador + warning

Spec: docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md
`.trim()

const buildMessage = (label) =>
  `SQL embebido detecta el anti-patron TASK-890 [${label}]. Recomponer el gate "members en scope payroll" inline crea drift sostenido: solo cubre internal_payroll/executed, deja external_payroll/Deel y casos approved/scheduled fuera del filtro. Maria Camila Hoyos (EO-OFF-2026-0609A520) fue el caso que disparo este bug class. ${HELPER_HINT}`

const checkSqlString = (context, node, sqlText) => {
  for (const { regex, label } of PATTERNS) {
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
        'Prohibe SQL embebido que recompone el gate "members en payroll scope" inline. Usar resolver canonico TASK-890.',
      url: 'docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md'
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

        // Dynamic template: join static parts (interpolations are $1/$2 placeholders)
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
