# TASK-1755 — Un intento de asignación bloqueado deja a esa persona sin segunda oportunidad

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Status real: `code complete, rollout pendiente — el fix NO está en producción; sube con el release del dominio Hiring`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cuando una confirmación manual de asignación termina en un resultado de intento no-asignado (`blocked`,
`held`), la fila del ledger queda ocupando la clave de idempotencia de esa persona **para siempre**.
Corregir la causa real —registrar el correo, habilitar la política, activar la plantilla— no
devuelve la posibilidad de asignar: la confirmación siguiente vuelve a leer la fila vieja y repite el
mismo resultado. No hay UI, endpoint ni CLI que rompa el empate.

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

## Delta 2026-08-22 — ADR del vocabulario de etapas y desenlace

Se aceptó `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (`Accepted`), primer ADR del vocabulario del pipeline. Fija **dos ejes**:
`stage` = dónde va la persona en el recorrido (6 valores, uno por columna; `closed` se queda y **es
escribible**) y **desenlace** = cómo terminó (`selected`, `backup_selected`, `not_selected`, `rejected`,
`withdrawn`, `unresponsive`) + **causa gobernada** obligatoria en `not_selected` (`capacity_filled`,
`opening_closed`, `process_cancelled`). Invariante como `CHECK`: **`stage='closed'` ⟺ desenlace declarado**.
El eje de desenlace lo implementa `TASK-1765`; la superficie del kanban, `TASK-1766`; el embudo de equidad,
`TASK-1767`.

**No contradice el ADR, pero cambia de orden y gana una restricción.**

- **Sube en la secuencia: va ANTES o EN PARALELO al colapso, nunca después.** Al absorber `qualified`
  dentro de `shortlisted`, entra más población a la etapa que dispara la policy → más intentos → **más
  cupos quemados irrecuperables**. Hoy hay 4 filas `blocked` sobre 20. Si el colapso llega primero, cada
  política mal configurada quema un cupo para siempre (hallazgo H-13).
- El Slice que decide qué hacer con las filas bloqueadas existentes debe declarar que **`assertEnum` corre
  en el camino de LECTURA del ledger**: retirar un literal que una fila histórica nombre produce `500` al
  releerla, y esas filas son irreescribibles por diseño. Hoy las 20 son `shortlisted`, que se conserva.
- **Colisión de vocabulario:** esta task usa «desenlace» para el `outcome` del **ledger de asignación**
  (`assigned|blocked|held|intent`). El ADR acaba de fijar «desenlace» como el segundo eje del **pipeline**.
  Renombrar el uso local a «resultado del intento» para que no queden dos conceptos con una palabra.

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
- El resultado `assigned` **NUNCA** se puede reintentar: esa clave está bien ocupada.

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

## Plan ejecutado (2026-08-22)

**Sin migración.** `attempt_seq`, el `CHECK (origin = 'manual' OR attempt_seq = 1)` y los
`GRANT` por columna ya existían: la task usa el mecanismo que TASK-1719 dejó puesto y nadie
accionaba.

| Slice | Qué | Archivos |
|---|---|---|
| 1 | Reproducción con un ledger en memoria que honra los tres índices parciales | `attempt-retry.test.ts` |
| 2 | `readAssignmentAttemptState` + resolución del intento bajo el lock de la policy + el confirm pide el intento siguiente | `assignment-store.ts`, `assign.ts`, `confirm-assignment.ts` |
| 3 | Decisión sobre las filas existentes + gate vivo contra PostgreSQL real | esta spec, `attempt-retry.live.test.ts` |

### Por qué el test de reproducción no reusa los handlers existentes

Los handlers de `propose-confirm.test.ts` devuelven filas FIJAS por regex. Con ellos el INSERT
del ledger siempre "gana" y el callejón es literalmente irreproducible: un test verde sobre un
bug vivo. El fake de `attempt-retry.test.ts` mantiene el ledger en memoria y honra el índice
único parcial del ledger, el de la propuesta y el de instancia abierta.

### La decisión de diseño, corregida respecto del Detailed Spec original

El Detailed Spec proponía atar el intento nuevo a una **propuesta con digest distinto**. No
sirve, y la razón es verificable: `templateStatus` **no entra** a `AssignmentEffectMaterial`
(`proposal-digest.ts`). Activar una plantilla inactiva deja el digest idéntico ⇒ con ese
criterio, un `blocked: template_inactive` quedaría en callejón **permanente**, que es
exactamente el bug que esta task cierra.

El criterio correcto es la **identidad de la propuesta**, no su digest: la confirmación es
one-shot (`lockAssignmentProposalForUpdate` + la guarda de `status`), así que un reintento de
transporte sale por `already_confirmed` sin tocar el ledger. Llegar al command significa que
una persona confirmó una propuesta que nunca se había confirmado — una decisión humana nueva,
que es la condición que la idempotencia pedía.

### Las tres respuestas del resolver, y por qué la del medio es la peligrosa

1. Sin intento vigente (o todos superseded por cancelación) ⇒ `max + 1`, monotónico contra
   TODA la historia: reusar el rótulo de un intento cancelado dejaría dos filas distintas
   diciendo "intento 2".
2. Intento vigente con resultado recuperable (`blocked`/`held`/`stale`) ⇒ `max + 1`. Es lo que
   devuelve la capacidad de asignar.
3. Cualquier otro resultado vigente ⇒ **su mismo número**, nunca 1 ni uno libre. Devolver un
   casillero vacío junto a un `assigned` vivo le crearía una **segunda prueba** al mismo
   candidato. Devolviendo el suyo, el `ON CONFLICT` colisiona y la respuesta es el replay
   honesto (`already_assigned`, o el fault si la fila estaba en `intent`).

### Dónde ocurre el cálculo

Dentro de `assignAssessmentFromPolicy`, **después de `lockPolicyForUpdate`**. Ese `FOR UPDATE`
serializa todos los assignments de la policy y, cuando el caller es el confirm humano, se
sostiene en la MISMA transacción que ya tiene bloqueada la fila de la propuesta: el cálculo
queda bajo los dos locks a la vez, que es más fuerte que lo que pedía el criterio de
aceptación. La capa 2 del ADR D2 (`ON CONFLICT DO NOTHING` + re-lectura) sigue siendo la red.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — Reproducción.** Test que falle hoy: confirmar con la política deshabilitada, luego
  habilitarla, generar propuesta nueva y confirmar. Debe asignar y hoy no lo hace.
- **Slice 2 — Intento siguiente.** La confirmación de una propuesta **distinta** a la que produjo el
  último intento no-asignado abre `attempt_seq + 1`. Reconfirmar la MISMA propuesta sigue siendo
  idempotente y devuelve su resultado registrado.
- **Slice 3 — Resultados de intento existentes.** Decidir y ejecutar qué pasa con las filas bloqueadas que ya
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
| Relajar la idempotencia de transporte sin querer | Hiring | Media | Test explícito: reconfirmar la misma propuesta devuelve su resultado, no uno nuevo | Tests del dominio |
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

- [x] Corregir la causa de un bloqueo y confirmar de nuevo asigna el test.
- [x] Reconfirmar la MISMA propuesta sigue devolviendo su resultado registrado, sin intento nuevo.
- [x] Un resultado `assigned` vigente sigue impidiendo una asignación nueva.
- [x] El ledger conserva ambos intentos: no se borra ni se sobreescribe historia.
- [x] El cálculo del intento siguiente ocurre bajo el mismo `FOR UPDATE` que serializa la propuesta.
- [x] Existe decisión ejecutada sobre las filas bloqueadas que ya están en la base.
- [x] El ciclo completo quedó ejercitado contra PostgreSQL real, no sólo con mocks.

## Verification

Ejecutada 2026-08-22:

- `npx vitest run src/lib/hiring/assessment` → **472 passed**, 0 fallos (42 skipped: los gates
  vivos, que necesitan las credenciales cargadas).
- `npx vitest run src/lib/hiring/assessment/assignment-policy/attempt-retry.test.ts` → **8/8**.
- Ciclo completo contra PostgreSQL real:
  `set -a && . ./.env.local && set +a && npx vitest run …/attempt-retry.live.test.ts` → **3/3**.
  Teardown verificado: cero residuo (policy, opening, demand, ledger y outbox limpios).
- `pnpm test` (suite completa del repo) → **11.938 passed**, 0 fallos.
- `pnpm lint` (repo completo) → 0 errores.
- `npx eslint src/lib/hiring/assessment/assignment-policy/` → 0 findings.
- `pnpm docs:closure-check` → sin errores; 0 flags sin registrar. `pnpm docs:context-check:strict`
  → 0 errores / 0 warnings tras aplicar `pnpm docs:context-rotate --apply`.
- `pnpm build` (producción) → **NO ejecutado, decisión declarada del operador.** Dos motivos: el
  repo tiene hoy un error de tipos vivo de `TASK-1765` en `src/lib/hiring/store.ts`
  (`HiringPipelineStage`) sobre el mismo checkout, así que el build fallaría por causa ajena; y el
  riesgo propio es bajo — el cambio es server-only dentro de `src/lib/**`, sin JSX, sin ruta nueva y
  sin cruzar la frontera server/client, que son las clases de bug que el build atrapa y los tests
  no. Lo corre quien haga el release con el árbol limpio.
- `pnpm typecheck` → el único error del repo es `src/lib/hiring/store.ts` (`HiringPipelineStage`),
  de `TASK-1765` en curso en otra sesión sobre el mismo checkout. Ningún error en los archivos de
  esta task.

## Estado de rollout (2026-08-22)

**`code complete, rollout pendiente`. NO está operativamente completa.**

Verificado, no supuesto: `git show origin/main:…/confirm-assignment.ts | grep -c NEXT_ATTEMPT_AFTER_DEAD_END`
→ **0**. `origin/main` sigue en `6f85644cd` (2026-08-19), así que **el callejón sigue vivo en
producción**: hoy un operador que confirme con la política en `draft` todavía quema la llave de esa
persona. Los commits están en `origin/develop`.

Esta task se movió a `complete/` por error y se devolvió a `in-progress/`. El
`Runtime Rollout Completion Gate` es explícito: código en `develop` no es capacidad disponible, y
`code complete` no es `operationally complete`. Las otras tres tasks del mismo dominio cerradas hoy
—`TASK-1748`, `TASK-1754`, `TASK-1765`— están en el mismo estado y suben en el mismo release.

**Lo que falta es sólo el deploy.** No hay migración, flag, env var, backfill ni integración externa
que verificar: el `CHECK`, `attempt_seq` y los grants ya estaban en la base desde `TASK-1719`.

Condición de cierre: promovido a `main`, verificar contra el deployment activo que el ciclo
`blocked → corregir la causa → asignar` funciona, y recién entonces mover a `complete/`.

⚠️ Hay **7 postulaciones reales** esperando decisión de asignación de prueba (4 manuales, 3
automáticas) registradas en `Handoff.md`. Son de Talento, no de esta task, pero las 4 manuales son
justamente la población que esta corrección desbloquea.

## Closing Protocol

- [x] Lifecycle y ubicación del archivo reflejan estado real (`in-progress` = rollout pendiente).
- [x] README y registry sincronizados.
- [x] Handoff y changelog registran la evidencia runtime.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` al mover a `complete/` post-release.

## Slice 3 — decisión sobre las filas existentes (evidencia 2026-08-22, PostgreSQL real)

Contadas contra la base, no estimadas. El ledger completo tiene 23 filas; **las únicas cuyo
último intento vigente es un callejón son 4**, y no son lo que el brief suponía:

| outcome | reason | origin | trigger_stage | attempt | filas | vigentes |
|---|---|---|---|---|---|---|
| `blocked` | `volume_cap` | **`stage_auto`** | **`shortlisted`** | 1 | 4 | 4 |

Estado del mundo de esas 4 (PII-free): candidaturas en `stage='closed'`, `decision IS NULL`,
**`data_origin='smoke_test'`**, sin instancia viva, plantilla `active`, correo presente; 2 con la
policy hoy `disabled` y 2 `enabled`. Y el dato que cierra el caso: **su clave manual
(`trigger_stage='manual'`) está LIBRE en las 4**.

**Decisión: sin backfill.** Cuatro razones, en orden de fuerza:

1. **No son personas.** `data_origin='smoke_test'`: recuperarlas sería fabricar actividad sobre
   datos de humo, no rescatar a nadie.
2. **No hay ni un solo callejón manual en producción.** El confirm humano escribe siempre
   `trigger_stage='manual'`; esas filas ocupan `'shortlisted'`. Son llaves distintas.
3. **Su callejón es otro mecanismo.** `stage_auto` no puede usar `attempt_seq > 1` — lo prohíbe
   el `CHECK (origin = 'manual' OR attempt_seq = 1)`
   (`migrations/20260817102245965_task-1719-assignment-ledger-intent-outcome.sql:45`). Su reversa
   declarada es `superseded_at`, y ese write path no existe. Está fuera del `## Out of Scope`.
4. **Están `closed`.** Crearles una prueba hoy sería incorrecto; ya quedan fuera de
   `resolveApplicationsAwaitingAssignment`, que filtra `stage = trigger_stage`.

**`assertEnum` corre en el camino de LECTURA del ledger** (`assignment-store.ts`) y una fila
histórica es irreescribible por diseño (el `GRANT UPDATE` es column-scoped y excluye
`trigger_stage`). Verificado: las filas vivas nombran `shortlisted`, `manual`, `stage_auto`,
`blocked` y `volume_cap` — **todos literales que TASK-1754 y TASK-1765 conservan**. Nada de lo que
esta task hace retira un literal que una fila viva nombre.

## Delta 2026-08-22 (b) — corrección al orden respecto del colapso del enum

El Delta anterior justificaba correr esta task antes de `TASK-1754` porque el colapso mete más
población a la etapa que dispara la policy y "cada política mal configurada quema un cupo para
siempre". **Ese argumento apunta al carril automático, que esta task excluye.** Más población en
`shortlisted` ⇒ más intentos `stage_auto` ⇒ más `blocked` en el carril que el `CHECK` de la base
impide reintentar. **La restricción de orden le pertenece a `TASK-1771`, no a ésta.**

Esta task sigue conviniendo ahora por su propio mérito: el callejón manual es real y alcanzable
hoy sin que haya pasado nada raro —toda policy nace en `draft`, se confirma, y la llave manual
queda quemada—, y cualquier consumidor del contrato gobernado (Nexa, MCP, un script) llega a él
aunque `TASK-1747` haya cerrado el camino en la pantalla.

## Follow-ups

- **`TASK-1771`** — el callejón del carril AUTOMÁTICO (`blocked: volume_cap` en `stage_auto`).
  Mecanismo distinto: supersede por reconciliación, no `attempt_seq`; el write path no existe.
  Hereda la restricción de orden respecto de `TASK-1754` (ver Delta b). La escribe y registra la
  sesión que gobierna el registry; esta task sólo la referencia.
- Evaluar una señal de reliability para candidaturas cuyo último intento de asignación quedó en un
  resultado no-asignado por sobre un umbral de días. Hoy ese estado es invisible.
- Residuo preexistente y ajeno a esta task: 13 `hiring_opening` con prefijo `LIVE-TEST` quedaron
  de corridas anteriores de otros gates vivos (`accommodations`, `assignment policy`, `assignment
  proposal`, `cancel`). El gate de esta task no deja residuo — verificado post-corrida.
- **Bug class colateral detectado y NO cerrado acá (fuera de alcance):** 12 live tests de hiring
  llaman `createHiringOpening` sin declarar `dataOrigin`, y `assertDataOrigin(undefined)` devuelve
  `'real'` — verificado con una sonda contra la base, no deducido. Son vacantes VISIBLES y
  publicables en la instancia compartida por dev/staging/producción. `hiring:data-origin-gate` no
  las ve porque sólo barre `scripts/` y `tests/e2e/`, y esos fixtures viven en `src/**`. El fixture
  de esta task ya declara `smoke_test` (commit `2512c183e`); los otros 12 y la extensión del gate
  quedan como trabajo aparte, propuesto al operador.

## Open Questions — RESUELTA (2026-08-22)

**¿Recovery declarado o convergencia natural?** → **Sin backfill.** Decisión ejecutada con el
conteo real; la evidencia está en `## Slice 3 — decisión sobre las filas existentes`.
