// TASK-909 Slice 1 — greenhouse/no-inline-ftr-calculation
//
// Bloquea el recompute INLINE del veredicto FTR (First-Time Right) en vez de
// consumir el helper canonical:
//
//   import { calculateFtr } from '@/lib/notion-metrics/calculate-ftr'
//
// El boundary canonical (ADR GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1):
// Notion captura status edits; Greenhouse computa FTR vía delegación pura a
// `calculateRpaV2` (FTR = RpA === 0 ? 'pass' : 'fail'). Un consumer que
// recompone ese veredicto inline desincroniza la métrica del source canonical
// (bug class TASK-877 follow-up — métricas como propiedades editables sin git
// history, tests, observability).
//
// **Regla PRECISA (NO bruta)**: `client_change_round_final = 0` es una
// comparación de columna usada legítimamente en agregados BQ "tareas sin
// ajustes" (dashboard, capability-queries, sla-compliance, ico-engine) que NO
// son recompute de FTR. Esta regla matchea SOLO el recompute del VEREDICTO
// (mapping a 'pass'/'fail') y la lectura legacy de la propiedad Notion `FTR`.
// Verificado 2026-05-17: los 3 patrones tienen ZERO false positives en el
// codebase actual. Matchear `= 0` a secas generaría ruido en agregados legítimos.
//
// **Full-source scan** (Program node): el veredicto FTR puede recomputarse como
// un ternario TS (`rpa.value === 0 ? 'pass' : 'fail'`) que el AST fragmenta en
// nodos Literal separados, o como CASE WHEN dentro de un template SQL. Escanear
// el texto fuente completo captura ambos shapes con loc precisa. Pattern fuente:
// no-extract-epoch-from-date-subtraction (TASK-893) usa la misma técnica.
//
// Modo `warn` durante TASK-909 V1.0 (defense para consumers futuros — el helper
// per-task FTR aún no tiene consumers; writeback es TASK-903 futura). Promueve a
// `error` cuando emerja el primer consumer real + zero drift sostenido.
//
// Excepciones explicitas (override block en eslint.config.mjs):
//   - src/lib/notion-metrics/calculate-ftr.ts   — el helper canonical (tiene
//     legítimamente `rpa.value === 0 ? 'pass' : 'fail'`)
//   - src/lib/notion-metrics/calculate-ftr.test.ts
//   - eslint-plugins/greenhouse/rules/no-inline-ftr-calculation.mjs (este file)
//   - Tests anti-regresión del propio rule
//
// Spec: docs/architecture/metrics/FTR_V1.md + ADR
// GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md

const PATTERNS = [
  // ─── P1 — Veredicto FTR recomputado sobre client_change_round_final ──────
  // CASE WHEN client_change_round_final = 0 THEN 'pass' ELSE 'fail',
  // row.client_change_round_final === 0 ? 'pass' : 'fail', etc.
  // Requiere el literal 'pass'/'fail' en proximidad a la columna canonical —
  // NO matchea `client_change_round_final = 0` a secas (agregado legítimo).
  {
    regex: /client_change_round_final[\s\S]{0,60}['"](pass|fail)['"]/gi,
    label: "FTR verdict recompute sobre client_change_round_final (literal 'pass'/'fail')"
  },
  {
    regex: /['"](pass|fail)['"][\s\S]{0,60}client_change_round_final/gi,
    label: "FTR verdict recompute sobre client_change_round_final (literal 'pass'/'fail')"
  },

  // ─── P2 — Lógica exacta de calculateFtr duplicada sobre un RpA result ────
  // rpa.value === 0 ? 'pass' : 'fail'  (la transformación canonical del helper).
  // Cualquier callsite que la replique fuera de calculate-ftr.ts es duplicación.
  {
    regex: /\.value\s*===?\s*0\s*\?\s*['"](pass|fail)['"]/gi,
    label: "calculateFtr verdict logic duplicada (.value === 0 ? 'pass' : 'fail')"
  },

  // ─── P3 — Lectura legacy de la propiedad Notion FTR ──────────────────────
  // formula.ftr / formula['FTR'] — leer FTR desde Notion es el anti-patrón
  // legacy (FTR lo computa Greenhouse, NO se lee de una formula Notion).
  {
    regex: /formula\.ftr\b|formula\[\s*['"]ftr['"]\s*\]/gi,
    label: 'Lectura legacy de propiedad Notion FTR (formula.ftr / formula["FTR"])'
  }
]

const HELPER_HINT = `
Use el helper canonical en su lugar:
  • src/lib/notion-metrics/calculate-ftr → calculateFtr(inputs)  // delega a calculateRpaV2

O lea el agregado materializado del registry (dashboards mensuales):
  • src/lib/ico-engine/metric-registry.ts → metrica 'ftr_pct'

FTR es derivada pura de RpA (FTR = RpA === 0 ? 'pass' : 'fail'). Recomponer el
veredicto inline desincroniza la métrica del source canonical. Cualquier cambio
en cómo se cuentan correcciones vive en calculateRpaV2 (→ countCorrectionTransitions).

Spec: docs/architecture/metrics/FTR_V1.md
ADR: docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md
`.trim()

const buildMessage = (label) =>
  `Detectado recompute inline del veredicto FTR [${label}]. ${HELPER_HINT}`

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Prohibe recomputar el veredicto FTR inline (pass/fail sobre client_change_round_final o rpa.value, o leer la propiedad Notion FTR). Usar helper canonical calculateFtr.',
      url: 'docs/architecture/metrics/FTR_V1.md'
    },
    schema: []
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode()

    return {
      Program(node) {
        const text = sourceCode.getText()

        for (const { regex, label } of PATTERNS) {
          regex.lastIndex = 0

          const match = regex.exec(text)

          if (match) {
            context.report({
              loc: {
                start: sourceCode.getLocFromIndex(match.index),
                end: sourceCode.getLocFromIndex(match.index + match[0].length)
              },
              message: buildMessage(label)
            })

            // Solo el primer hit — el dev arregla uno y re-corre.
            return
          }
        }

        // Silencia el unused-param lint del visitor cuando no hay match.
        void node
      }
    }
  }
}
