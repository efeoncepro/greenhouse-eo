# ISSUE-159 — Scorecard de assessment mostraba "100/100 Óptimo" con respuestas pendientes de corrección

- **Estado:** resolved
- **Detectado:** 2026-08-16 (sesión de operador, caso EO-ASM-0050)
- **Resuelto:** 2026-08-16
- **Ambiente:** producción (Application 360, `/agency/hiring/applications/[id]`)
- **Dominio:** hiring / assessment UI

## Síntoma

Un candidate test recién `submitted` con 10 respuestas abiertas sin corregir mostraba
**"GLOBAL (REFERENCIA) 100/100" con chip "Óptimo"** en el scorecard de Application 360. Las
únicas competencias con puntaje eran las 2 objetivas auto-corregidas (SEO y Vendor
Management, peso 8% c/u, ambas 100); el 84% del test estaba pendiente. El operador
interpretó el valor como resultado final — riesgo directo de decisión de contratación
sobre un dato parcial presentado como completo.

## Causa raíz

En `Application360View.tsx`, el global se computaba **solo sobre las competencias ya
corregidas** (`scoredRows`) ignorando las pendientes, y el chip solo mostraba "Por
corregir" cuando el global era `null` (es decir, cuando NINGUNA competencia tenía nota).
Con ≥1 competencia corregida, el promedio parcial se presentaba con tono de éxito. El
backend era correcto (el rollup canónico exige cero pendientes vía `finalizeAssessment`);
el bug era exclusivamente de presentación.

## Solución

Helper puro `computeScorecardSummary` ([src/views/greenhouse/hiring/scorecard-summary.ts](../../../src/views/greenhouse/hiring/scorecard-summary.ts))
con tres estados honestos:

- `partial` (≥1 competencia pendiente): el global es `null` (se muestra "—"), chip
  **"Parcial"** tono informativo, y caption de progreso "X de Y competencias corregidas"
  (copy `hiringAssessment.review.partialProgress`, es-CL + en-US).
- `complete`: matemática **idéntica** a la previa (ponderada por peso; simple si peso 0) —
  cero cambio para scorecards ya finalizados.
- `empty`: comportamiento previo ("—" + "Por corregir").

Una competencia mixta (pregunta objetiva ya puntuada + abierta pendiente) también cuenta
como `partial` — el flag `pending` por fila manda, no solo la ausencia de score.

## Verificación

- 5 tests unitarios del helper (`scorecard-summary.test.ts`), incluido el caso fuente
  exacto (2×100 con peso 8 + 7 pendientes → `partial`, global `null`) y el test de
  paridad de la matemática `complete` contra el scorecard real corregido de EO-ASM-0050.
- `pnpm local:check` limpio; parity de diccionarios es-CL/en-US garantizada por el type
  `HiringAssessmentCopy`.
- Verificación visual live pendiente de que exista un assessment en estado parcial real
  (el caso fuente ya fue corregido/finalizado); viaja con el siguiente candidate test
  submitted.

## Relación con el backlog

- El fix estructural de fondo ("honest provisional coverage" en el workbench del operador)
  sigue siendo follow-up ui-ux de `TASK-1734`; este issue cierra el daño inmediato.
- `TASK-1735` (Expediente de Evaluación) no toca este código; superficies independientes.
