# TASK-1752 — Un run de scoring terminado y sin cerrar no lo ve nadie

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-011`
- Status real: `Diseño — hueco detectado por auditoría adversarial el 2026-08-19`
- Rank: `TBD`
- Domain: `hr|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar una señal de reliability que detecte runs de scoring IA cuyo trabajo humano ya terminó pero
que siguen en `awaiting_review`. Hoy ese estado es invisible para las cinco señales del dominio y
para `/admin/operations`.

## Why This Task Exists

El 2026-08-19 dos runs productivos quedaron atrapados en `awaiting_review` con el 100% de sus ítems
resueltos. La causa (un flag que gateaba dos conceptos distintos) quedó corregida en el commit
`c7474b068`. Lo que NO quedó corregido es cómo se detectó: **el operador lo vio en pantalla y lo
reportó a mano.**

`hiring.assessment_ai.run_backlog_stuck` sólo mira `status IN ('enumerating','scoring')`
(`src/lib/reliability/queries/hiring-assessment-ai-run-signals.ts:92-97`). Un run parado en
`awaiting_review`, con cobertura en cero y sin ninguna transición disponible, no dispara **ninguna**
de las cinco señales del dominio.

Se arreglaron los dos casos conocidos y el detector quedó apagado para el tercero.

## Goal

- Que un run terminado y sin cerrar levante la mano solo, antes de que un humano lo note.
- Reusar el predicado de "trabajo terminado" en vez de escribir una cuarta copia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`

Reglas obligatorias:

- La señal es de lectura pura: observa y no muta ni cierra runs.
- Los estados terminales de ítem salen del enum canónico (`AI_SCORING_RUN_ITEM_TERMINAL_STATUSES`),
  nunca escritos a mano en SQL. Ya hay precedente en el mismo archivo (`ITEM_TERMINAL_SQL`).
- Cuidado con la aritmética de fechas: la edad de un run se calcula sobre `timestamptz`, no
  mezclando `DATE` con `EXTRACT(EPOCH ...)`.

## Normative Docs

- `docs/tasks/complete/TASK-1742-global-provisional-assessment-ai-foundation.md`
- `docs/operations/runbooks/assessment-ai-scoring-rollout.md`

## Dependencies & Impact

### Depends on

- `src/lib/reliability/queries/hiring-assessment-ai-run-signals.ts`
- `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/hiring/assessment/ai/scoring-run/review-reader.ts` — donde vive el predicado de cobertura

### Blocks / Impacts

- Ninguna task depende de ésta.
- Toca el mismo archivo de señales que TASK-1734/1742; coordinar si alguna está activa.

### Files owned

- `src/lib/reliability/queries/hiring-assessment-ai-run-signals.ts`
- `src/lib/reliability/get-reliability-overview.ts` (registro de la señal)
- Sus tests

## Current Repo State

### Already exists

- Cinco señales del dominio, todas con `steady=0` y evidencia de runbook
  (`hiring-assessment-ai-run-signals.ts:18-26`).
- `ITEM_TERMINAL_SQL` derivado del enum canónico (`:39`), que es el patrón a reusar.
- El predicado de cobertura en TS (`review-reader.ts:152-165`): `scoringPending`,
  `mandatoryPending`, `samplePending`, `batchEligible`.
- El equivalente SQL, ya usado dos veces: `NOT EXISTS (... i.status NOT IN <terminales>)`
  (`commands.ts:493-496`, `rollback.ts:100-101`).

### Gap

- Ninguna señal cubre `awaiting_review`. `run_backlog_stuck` filtra explícitamente
  `status IN ('enumerating','scoring')` (`:92-97`).
- El predicado de "sin trabajo pendiente" está duplicado en tres lugares y con una divergencia real:
  `review-reader.ts:157` NO cuenta el caso `proposed` con `riskClass` nulo, mientras el command sí
  (fail-closed). Esta task no debe agregar una cuarta copia.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/reliability/queries/hiring-assessment-ai-run-signals.ts`
- Future candidate home: `remain-shared`
- Boundary: reader de reliability; consumidores son el overview y `/admin/operations`.
- Server/browser split: server-only; el cliente recibe la señal ya resuelta.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

- Backend rigor: `backend-standard`
- Source of truth: `greenhouse_hiring.hiring_assessment_ai_scoring_run` y su tabla de ítems.
- Contract surface: una señal nueva registrada en el overview de reliability.
- Data invariants: la señal no muta nada; `steady = 0`.
- Tenant/access boundary: reliability es superficie interna; sin datos de candidato en el payload.
- Idempotencia/concurrencia: lectura pura, sin efectos.
- Migración/backfill/rollback: ninguna. Es un reader nuevo; el rollback es revertir el commit.
- Datos sensibles: el payload lleva ids de run y conteos, **nunca** texto de respuesta, nombre de
  candidato ni puntaje.
- Audit/signal posture: es la señal misma; sin audit adicional.
- Runtime evidence: la señal debe evaluarse contra la base real y reportar `ok` con los datos de hoy
  (los dos runs del incidente ya están `confirmed`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Lo completa el agente que TOMA la task, no quien la crea.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Predicado único.** Extraer el predicado de "run sin trabajo pendiente" a un helper
  puro consumido por el reader de cobertura, el command de confirmación y la señal nueva. Resolver de
  paso la divergencia del caso `proposed` con `riskClass` nulo, decidiendo explícitamente si el
  criterio canónico es fail-closed (como el command) o fail-open (como el reader de hoy).
- **Slice 2 — Señal.** `hiring.assessment_ai.run_settled_not_closed`: runs en `awaiting_review` sin
  trabajo pendiente y con edad mayor al umbral. `steady = 0`. Severidad proporcional al conteo y a la
  antigüedad. Evidencia apuntando al runbook.
- **Slice 3 — Registro y evidencia.** Cablearla en el overview, cubrirla con tests y ejercitarla
  contra la base real.

## Out of Scope

- Cerrar runs automáticamente. La señal observa; el cierre sigue siendo un acto humano.
- Cambiar la política de excepciones o cualquier flag de TASK-1742.
- Tocar `confirmAssessmentAiScoringRun` más allá de consumir el predicado extraído.
- Los otros dos runs en `awaiting_review` que SÍ tienen trabajo pendiente: no son un fallo.

## Detailed Spec

El umbral de edad es la única decisión de diseño real. Un run recién pasado a `awaiting_review` con
todo resuelto es normal durante unos minutos: el operador acaba de terminar y va a cerrarlo. La señal
debe distinguir "todavía no lo cierra" de "nadie lo va a cerrar". Proponer un umbral y justificarlo
con la distribución real de tiempos entre la última resolución y el cierre.

## Rollout Plan & Risk Matrix

Reader nuevo, sin migración, sin flag, sin efectos. El rollout es un deploy ordinario.

### Slice ordering hard rule

- Slice 1 va ANTES que Slice 2: la señal consume el predicado extraído. Al revés se crea la cuarta
  copia que esta task existe para evitar.
- Slice 3 cierra al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Extraer el predicado cambia el comportamiento del confirm | Scoring IA | Media | La suite de `confirm-run.test.ts` cubre los gates; debe quedar verde sin editar asserts | Tests del dominio Hiring |
| Umbral muy bajo genera ruido y se ignora la señal | Reliability | Media | Justificar el umbral con la distribución real de tiempos, no con un número redondo | Revisión de `/admin/operations` |
| La query mezcla tipos de fecha y revienta en runtime | Reliability | Baja | Aritmética sobre `timestamptz`; ejercitar contra PG real antes de mergear | Error en el reader |

### Feature flags / cutover

Ninguno. Una señal nueva nace observando; no altera comportamiento.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert del commit | minutos | sí |
| 2 | revert del commit | minutos | sí |
| 3 | no aplica | — | sí |

### Production verification sequence

1. Ejercitar la señal contra la base real y confirmar que hoy reporta `ok`.
2. Verificar que aparece en `/admin/operations`.
3. Comprobar contra un run sintético que la señal se enciende cuando corresponde.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un único predicado de "run sin trabajo pendiente", consumido por reader, command y señal.
- [ ] La divergencia del caso `proposed` con `riskClass` nulo quedó resuelta con criterio declarado.
- [ ] La señal detecta runs en `awaiting_review` sin trabajo pendiente por sobre el umbral.
- [ ] `steady = 0` y hoy reporta `ok` contra la base real.
- [ ] El payload no expone texto de respuesta, nombre de candidato ni puntaje.
- [ ] La señal aparece en el overview de reliability y en `/admin/operations`.
- [ ] La suite de `confirm-run.test.ts` queda verde sin editar asserts existentes.
- [ ] El umbral está justificado con datos, no con un número elegido a ojo.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/reliability src/lib/hiring/assessment/ai`
- Ejercicio de la señal contra PostgreSQL real

## Closing Protocol

- [ ] Lifecycle y ubicación del archivo reflejan estado real.
- [ ] README y registry sincronizados.
- [ ] Handoff y changelog registran la evidencia runtime.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` pasan al cierre.

## Follow-ups

- El modelo de scoring cambia por default de código (`src/lib/hiring/assessment/ai/config.ts:22`),
  sin env var seteada en ningún runtime, sin flag y sin fila en el ledger. Un commit cambia con qué
  modelo se evalúa a un candidato y nadie se entera. Merece su propia task.

## Open Questions

- ¿El criterio canónico del predicado debe ser fail-closed (como el command) o fail-open (como el
  reader)? La diferencia hoy es visible: la UI puede decir "0 pendientes" y el command 409ear.
