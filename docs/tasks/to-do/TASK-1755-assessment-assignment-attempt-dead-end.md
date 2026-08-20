# TASK-1755 — Un intento de asignación bloqueado deja a esa persona sin segunda oportunidad

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-011`
- Status real: `Diseño — hueco detectado por auditoría adversarial el 2026-08-19`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cuando una confirmación manual de asignación termina en un desenlace no-asignado (`blocked`,
`held`), la fila del ledger queda ocupando la clave de idempotencia de esa persona **para siempre**.
Corregir la causa real —registrar el correo, habilitar la política, activar la plantilla— no
devuelve la posibilidad de asignar: la confirmación siguiente vuelve a leer la fila vieja y repite el
mismo desenlace. No hay UI, endpoint ni CLI que rompa el empate.

## Why This Task Exists

La clave de idempotencia del ledger es
`(application_id, policy_id, policy_version, trigger_stage, attempt_seq) WHERE superseded_at IS NULL`
(`assignment-store.ts:141-142`), y la confirmación humana siempre manda `triggerStage='manual'` con
`attemptSeq` por defecto **1** (`confirm-assignment.ts` → `assign.ts:228`). Entonces:

1. Se confirma con la política en `draft` (que es el estado en que **nace** toda política) → el
   ledger registra `blocked` con `assessment_id = NULL`.
2. Se habilita la política. El digest cambia, hay propuesta nueva, se confirma.
3. `recordAssignment` hace `DO NOTHING`, `findActiveAssignment` devuelve la fila `blocked` vieja y
   `resultFromRecord(..., { replay: true })` repite `blocked` (`assign.ts:283-286`).

El único mecanismo de supersede existente, `supersedeAssignmentsForAssessment`
(`assignment-store.ts:226`), filtra por `assessment_id` — que en una fila bloqueada es `NULL`. Nunca
la alcanza.

El camino sí soporta reintentos: `assign.ts:233` permite `attemptSeq > 1` cuando el origen es
`manual`. Simplemente nadie lo incrementa.

TASK-1747 mitigó el síntoma más caro en la superficie —el diálogo ya no deja confirmar cuando el
preview declara bloqueo, así que el operador no quema el intento con un click—, pero la mitigación
es de pantalla: cualquier consumidor del contrato gobernado (Nexa, MCP, un script) sigue pudiendo
llegar al mismo callejón, y las filas ya quemadas siguen quemadas.

## Goal

Que corregir la causa de un bloqueo devuelva la capacidad de asignar, sin borrar historia del ledger
ni relajar la idempotencia que evita el doble envío.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`

Reglas obligatorias:

- El ledger es append-only: la solución **NUNCA** es `DELETE` ni `UPDATE` destructivo de un intento.
- La idempotencia existe para que un reintento de transporte no genere dos tests al mismo candidato.
  Un intento nuevo debe ser una decisión humana explícita, no un efecto de reenviar la misma
  petición.
- El desenlace `assigned` **NUNCA** se puede reintentar: esa clave está bien ocupada.

## Normative Docs

- `docs/tasks/complete/TASK-1719-hiring-assessment-assignment-policy.md`
- `docs/tasks/in-progress/TASK-1747-application-360-assessment-access-consumer.md`

## Dependencies & Impact

### Depends on

- `src/lib/hiring/assessment/assignment-policy/assign.ts`
- `src/lib/hiring/assessment/assignment-policy/confirm-assignment.ts`
- `src/lib/hiring/assessment/assignment-policy/assignment-store.ts`

### Blocks / Impacts

- TASK-1747 depende de esta para que su mitigación de UI deje de ser la única defensa.
- Toca el mismo command que TASK-1719; coordinar si vuelve a estar activa.

### Files owned

- `src/lib/hiring/assessment/assignment-policy/confirm-assignment.ts`
- `src/lib/hiring/assessment/assignment-policy/assignment-store.ts`
- Sus tests

## Current Repo State

### Already exists

- El ledger soporta el concepto de intento (`attempt_seq`) y su supersede lógico
  (`superseded_at`, en la cláusula parcial del índice único).
- `assign.ts:233` ya autoriza `attemptSeq > 1` para origen `manual`.
- `resolveAssignmentIntent` evalúa la elegibilidad **antes** de crear la instancia, así que un
  bloqueo nunca deja un test huérfano.

### Gap

- `confirmAssessmentAssignment` no calcula el intento siguiente: siempre usa el default 1.
- No hay forma de superseder una fila cuyo `assessment_id` es `NULL`.
- Ningún test cubre "confirmo bloqueado → corrijo la causa → confirmo de nuevo".

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring/assessment/assignment-policy/`
- Future candidate home: `remain-shared`
- Boundary: command de asignación; consumidores son la ruta gobernada y la automatización por etapa.
- Server/browser split: server-only.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

- Backend rigor: `backend-critical`
- Source of truth: `greenhouse_hiring.hiring_assessment_assignment`.
- Contract surface: el command de confirmación; el contrato de la ruta no cambia de forma.
- Data invariants: append-only; un `assigned` vigente sigue bloqueando intentos nuevos.
- Tenant/access boundary: sin cambios; el actor sale de la sesión.
- Idempotencia/concurrencia: el punto delicado. Un reintento de transporte de la MISMA propuesta
  debe seguir siendo idempotente; sólo una propuesta nueva y distinta puede abrir un intento nuevo.
- Migración/backfill/rollback: evaluar si las filas bloqueadas existentes necesitan recovery
  declarado o si basta con que el camino nuevo las supere.
- Datos sensibles: ninguno nuevo.
- Audit/signal posture: el intento nuevo queda en el ledger con su actor; considerar una señal para
  candidaturas cuyo último intento quedó bloqueado hace más de N días.
- Runtime evidence: reproducir el ciclo completo contra PostgreSQL real, no sólo con mocks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Lo completa el agente que TOMA la task, no quien la crea.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Reproducción.** Test que falle hoy: confirmar con la política deshabilitada, luego
  habilitarla, generar propuesta nueva y confirmar. Debe asignar y hoy no lo hace.
- **Slice 2 — Intento siguiente.** La confirmación de una propuesta **distinta** a la que produjo el
  último intento no-asignado abre `attempt_seq + 1`. Reconfirmar la MISMA propuesta sigue siendo
  idempotente y devuelve su desenlace registrado.
- **Slice 3 — Desenlaces existentes.** Decidir y ejecutar qué pasa con las filas bloqueadas que ya
  están en la base: recovery declarado o convergencia natural por el camino nuevo.

## Out of Scope

- Reintentar un `assigned`. Esa clave está legítimamente ocupada; para eso está la cancelación.
- Cambiar la política de la vacante o el estado en que nace (`draft`).
- La superficie de Application 360, que ya mitigó el síntoma en TASK-1747.
- La automatización por etapa: sólo el origen `manual` abre intentos nuevos.

## Detailed Spec

La decisión de diseño es **qué cuenta como intento nuevo**. Atarlo a la propuesta es lo más honesto:
una propuesta nueva sólo existe cuando el digest del efecto cambió, o sea cuando algo del mundo
cambió de verdad. Reenviar la misma petición no crea propuesta nueva, así que la idempotencia de
transporte queda intacta sin lógica adicional.

El riesgo a cuidar es la carrera: dos confirmaciones concurrentes de dos propuestas distintas no
pueden abrir dos intentos y crear dos tests. El cálculo del intento siguiente tiene que ocurrir bajo
el mismo `FOR UPDATE` que ya serializa la transición de la propuesta.

## Rollout Plan & Risk Matrix

Cambio de command sin migración de schema. El rollout es un deploy ordinario, pero el blast radius
es alto: es el único camino que crea tests de candidato.

### Slice ordering hard rule

- Slice 1 va ANTES que Slice 2: sin el test que falla, no hay evidencia de que el arreglo arregla.
- Slice 3 va al final, cuando el camino nuevo ya está probado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Abrir intentos de más y mandar dos tests a la misma persona | Hiring | Media | El intento nuevo se ata a una propuesta distinta, no a un click; cálculo bajo el `FOR UPDATE` existente | `hiring.assessment_assignment.*` |
| Relajar la idempotencia de transporte sin querer | Hiring | Media | Test explícito: reconfirmar la misma propuesta devuelve su desenlace, no uno nuevo | Tests del dominio |
| Las filas bloqueadas viejas quedan sin resolver | Hiring | Alta | Slice 3 decide explícitamente; no se cierra la task sin esa decisión | Conteo de candidaturas bloqueadas |

### Feature flags / cutover

Ninguno. Es corrección de un camino que hoy queda muerto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert del commit | minutos | sí |
| 2 | revert del commit | minutos | sí |
| 3 | según la decisión que se tome | — | declarar en el slice |

### Production verification sequence

1. Reproducir el ciclo completo contra PostgreSQL real con una candidatura de prueba.
2. Verificar que reconfirmar la misma propuesta sigue siendo idempotente.
3. Contar cuántas candidaturas productivas tienen su último intento en un desenlace no-asignado.

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Corregir la causa de un bloqueo y confirmar de nuevo asigna el test.
- [ ] Reconfirmar la MISMA propuesta sigue devolviendo su desenlace registrado, sin intento nuevo.
- [ ] Un desenlace `assigned` vigente sigue impidiendo una asignación nueva.
- [ ] El ledger conserva ambos intentos: no se borra ni se sobreescribe historia.
- [ ] El cálculo del intento siguiente ocurre bajo el mismo `FOR UPDATE` que serializa la propuesta.
- [ ] Existe decisión ejecutada sobre las filas bloqueadas que ya están en la base.
- [ ] El ciclo completo quedó ejercitado contra PostgreSQL real, no sólo con mocks.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/hiring/assessment/assignment-policy`
- Ejercicio del ciclo completo contra PostgreSQL real

## Closing Protocol

- [ ] Lifecycle y ubicación del archivo reflejan estado real.
- [ ] README y registry sincronizados.
- [ ] Handoff y changelog registran la evidencia runtime.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` pasan al cierre.

## Follow-ups

- Evaluar una señal de reliability para candidaturas cuyo último intento de asignación quedó en un
  desenlace no-asignado por sobre un umbral de días. Hoy ese estado es invisible.

## Open Questions

- ¿Las filas bloqueadas existentes se resuelven con recovery declarado o se dejan converger por el
  camino nuevo? La respuesta depende de cuántas haya en producción; contarlas es parte del Slice 3.
