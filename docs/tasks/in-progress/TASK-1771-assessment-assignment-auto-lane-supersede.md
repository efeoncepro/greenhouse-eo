# TASK-1771 — El carril automático de asignación no tiene reversa: la clave queda ocupada para siempre

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
- Status real: `EN PRODUCCIÓN desde el release 709e15f66 (2026-08-23); línea corregida 2026-08-26 — decía «en develop local sin push» y era falso. Verificado blob a blob contra origin/main: supersede-dead-end.ts y la ruta assessment-policy/reconciliation/supersede/route.ts están idénticas en main (los 4 SHAs no son ancestros porque main promueve por squash, no porque falte el código). La migración del COMMENT TAMBIÉN se aplicó (d793b2444, con readback antes/después) y pending-migrations quedó vacía. Falta SÓLO: la Production verification sequence completa (8 pasos; el 8 es monitor 7 días desde el 08-23) y el gate pnpm test + pnpm build, que requiere autorización por consumo de memoria`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`TASK-1755` devolvió la capacidad de reintentar en el carril **manual** incrementando `attempt_seq`.
El carril **automático** (`origin='stage_auto'`) no puede usar esa salida: el
`CHECK (origin = 'manual' OR attempt_seq = 1)` se la prohíbe por diseño. Su reversa declarada es
`superseded_at` —lo dicen el comentario de la migración del ledger y el de la columna en la base— y
**ese write path no existe**. Esta task lo construye: un supersede gobernado por reconciliación, con
evidencia de que la causa del bloqueo ya no aplica, tope anti-bucle y señal que haga visible el
estado. Es **preventiva**: hoy no hay backlog productivo que rescatar.

## Delta 2026-08-22 — el carril MANUAL tampoco tiene tope, y el concepto es uno solo

Auditoría del cierre de `TASK-1755` (la task hermana, ya `complete`). Hallazgo verificado en código:
`resolveAttemptSeq` (`src/lib/hiring/assessment/assignment-policy/assign.ts`) devuelve
`maxAttemptSeq + 1` **sin techo**, y el test `attempt-retry.test.ts:531-543` asserta explícitamente que
reintentar **sin corregir nada** produce `[1, 2]`. O sea: el tope anti-bucle que esta task declara para el
carril AUTOMÁTICO **tampoco existe en el manual**.

El daño del lado manual es menor y acotado —`blocked`/`held` no crean instancia ni mandan correo, porque
`resolveAssignmentIntent` decide antes de tocar el ledger, y cada reintento exige propose + confirm
humanos— pero cada ciclo abre 1 propuesta + 1 fila de ledger + 2 eventos de outbox, sin tope y **sin
señal**. Los Follow-ups de `TASK-1755` proponen una señal por antigüedad, no un tope.

**Implicación para esta task: el tope es UN concepto, no dos.** Si lo derivas contando filas superseded de
la misma clave —como declara tu `Migration posture`— esa misma derivación cubre el carril manual contando
por `attempt_seq`. Decláralo explícitamente para los dos carriles o declara por qué el manual queda fuera;
no lo dejes implícito, que es como este hallazgo llegó hasta acá sin dueño.

## Delta 2026-08-23 — dos premisas de esta spec ya eran falsas al empezar, y las cuatro Open Questions quedaron resueltas

Recalibración hecha **antes** de escribir código, con medición contra la base compartida. Lo que
sigue reemplaza lo que dicen las secciones de arriba donde se contradigan.

### Premisa muerta 1 — el orden se invirtió: `TASK-1754` aterrizó primero

La spec declara que esta task «va ANTES» del colapso de etapas. **Ya no.** `TASK-1754` está
`complete` y su contract se aplicó: el `CHECK` de `stage` pasó de trece valores a seis. O sea que
el carril automático corre hoy en producción sobre una etapa más ancha y **sin reversa**.

Consecuencias concretas, para que nadie las re-derive:

- La coordinación out-of-band con la sesión de `TASK-1754` **deja de ser bloqueante**: ya ocurrió.
- La fila de la risk matrix «el colapso llega primero» pasó de riesgo a hecho consumado.
- El `trigger_stage` del ledger es **otro enum** (`shortlisted|interview|manual`, su propio `CHECK`)
  y el colapso no lo tocó.
- La task **sigue siendo preventiva**: el colapso no generó callejones nuevos (ver premisa 2).

### Premisa muerta 2 — las 4 filas ya no están «cerradas»

La spec dice que las cuatro candidaturas en callejón están en `stage='closed'`. Medido el
2026-08-23:

| assignment | outcome_reason | stage | decision | archived_at | data_origin | policy |
|---|---|---|---|---|---|---|
| `hoaa-ca235cc0…` | `volume_cap` | `shortlisted` | `null` | 2026-08-19 | `smoke_test` | disabled |
| `hoaa-eca09585…` | `volume_cap` | `shortlisted` | `null` | 2026-08-19 | `smoke_test` | disabled |
| `hoaa-b75a80c9…` | `volume_cap` | `shortlisted` | `null` | 2026-08-19 | `smoke_test` | enabled |
| `hoaa-dcd92523…` | `volume_cap` | `shortlisted` | `null` | 2026-08-19 | `smoke_test` | enabled |

Causa: `TASK-1748` cambió el archivado para sellar `archived_at` en vez de escribir
`stage='closed'` —archivar no declara desenlace— y eso las devolvió a su etapa previa.

**La decisión no cambia: sin backfill**, siguen siendo humo. Pero la consecuencia de diseño sí es
nueva y es load-bearing: hoy cumplen `stage = trigger_stage` con `decision IS NULL`, así que sin
filtro de procedencia la métrica del Slice 1 **nacería en 2** y su steady = 0 sería inalcanzable el
primer día. Una señal que nace amarilla nadie la vuelve a mirar. Por eso el reader excluye
`data_origin <> 'real'` y `archived_at IS NOT NULL`, y **reporta el conteo excluido** para que la
exclusión no sea un cap silencioso.

Hallazgo colateral, fuera de scope y con ficha propia: `awaiting_terminal` vale **13** y **diez son
de humo archivadas**. La señal vive en `warning` por datos de smoke. → **`ISSUE-162`**.

### Las cuatro Open Questions, resueltas

**1. ¿Quién dispara el supersede?** → **Command humano explícito** sobre una fila concreta, con
`hiring.assessment.policy.govern` (que ya existe y ya está granteada, así que el guard de
capability-grant-coverage no pide grant nuevo). Rechazados los otros dos: convertir el GET de
reconciliación en ejecutor le cambia la naturaleza que su propio comentario declara, y hacerlo
desde `assign` significa un supersede con `actorUserId: null` —el consumer reactivo del
`ops-worker` corre así— con la cohorte entera como blast radius.

**Quién ejecuta el intento siguiente: NADIE automáticamente.** El supersede devuelve la fila a
`resolveApplicationsAwaitingAssignment` y el intento nuevo sale del camino gobernado de siempre
(propose → confirm humano, o el próximo stage event). Queda declarado, que es lo que la spec pedía
que no quedara implícito.

**2. ¿Qué evidencia justifica superseder?** → `resolveAssignmentIntent` reusado vía el wrapper
`resolveLiveAssignmentIntent`, bajo el `FOR UPDATE` de la policy, en el mismo instante y
transacción del write. **La condición de avance es «hoy resolvería `assigned`», NO «difiere de lo
registrado».** La lectura intuitiva es la segunda y está mal; la evidencia lo demuestra ejercitando
el resolver real contra PostgreSQL sobre las cuatro filas:

```
hoaa-ca235cc0…  policy disabled  volume_cap → hoy blocked:policy_disabled   recuperable=false
hoaa-eca09585…  policy disabled  volume_cap → hoy blocked:policy_disabled   recuperable=false
hoaa-b75a80c9…  policy enabled   volume_cap → hoy assigned                  recuperable=true
hoaa-dcd92523…  policy enabled   volume_cap → hoy assigned                  recuperable=true
```

Las dos primeras **difieren de lo registrado y siguen bloqueadas**: con el criterio laxo el command
las habría liberado para volver a quemar la clave con otra razón — el bucle con otro nombre.

**2b. `volume_cap` y su ventana móvil** → sin caso especial en el command: evaluar bajo el lock en
el instante del write **es** el tratamiento. La cola del endpoint muestra una foto y lo declara; el
write vuelve a mirar.

**3. ¿Cómo se evita el bucle?** → `DEAD_END_RECOVERY_CAP = 3`, derivado del ledger contando filas
superseded de la misma clave **con outcome recuperable** (las `cancelled` no cuentan: ésas las
escribe el otro mecanismo, y sumarlas gastaría el tope con actos que no son recuperaciones). Sin
columna nueva. Al agotarse, la clave exige intervención humana — espíritu `dead_letter`.

`recoverable` y `blockedBy` se reportan **separados a propósito**: «la causa se corrigió **y** la
autoridad se acabó» es un estado real (`recoverable: true, blockedBy: 'cap'`), y colapsarlos diría
«la causa sigue aplicando», que mandaría a alguien a arreglar algo que ya está bien.

**4. ¿Señal propia o métrica?** → Métrica dentro de `hiring.assessment.assignment_health`, que es
el patrón del dominio y evita partir el espejo del invariante 19. Tres poblaciones distintas:
`recoverable` alarma (`warning`), `cap_reached` es `error`, y `honest` **no alarma** — avisar de
algo que nadie puede arreglar todavía entrena a ignorar el tablero. Más
`dead_ends_evaluation_truncated`, porque el bound de la evaluación no puede ser un cap silencioso.

### El carril manual queda fuera, con razón declarada

Lo pedía el `## Delta 2026-08-22`. La derivación del tope vive en un helper reusable, pero **el
comportamiento del carril manual no cambia en esta task**: (i) `attempt-retry.test.ts:531-543`
afirma `[1,2]` como contrato de una task cerrada y en producción, y mutarlo desde otra task es
cambiar un contrato ajeno sin su dueño; (ii) cada ciclo manual exige propose + confirm humanos, o
sea ya está limitado por una persona, no por un bucle; (iii) el daño es acotado — no crea instancia
ni manda correo. Queda como Follow-up con la derivación ya escrita.

### Full API Parity — diferido explícitamente

El command nace en el primitive (`src/lib/hiring/assessment/assignment-policy/**`) y la ruta es su
consumer, así que la paridad existe por construcción y el loop `propose → confirm → execute` es
apto para Nexa/MCP sin trabajo adicional. El carril `api/platform/app/*` **se difiere**, y se
declara acá en vez de omitirse: omitirlo es lo que costó `TASK-1773`.

## Why This Task Exists

Una fila `blocked` del carril automático ocupa la clave de idempotencia
`(application_id, policy_id, policy_version, trigger_stage, attempt_seq) WHERE superseded_at IS NULL`
(`migrations/20260817100030803_task-1719-assessment-assignment-ledger.sql`, índice
`hiring_assessment_assignment_active_unique_idx`) **para siempre**, aunque la causa se corrija.

Las tres piezas del callejón, cada una verificable:

1. **La salida de `TASK-1755` le está prohibida.** El
   `CHECK (origin = 'manual' OR attempt_seq = 1)`
   (`migrations/20260817102245965_task-1719-assignment-ledger-intent-outcome.sql:45`) impide que un
   origen automático escriba `attempt_seq > 1`. El TS lo repite dos veces como límite de autoridad
   (`src/lib/hiring/assessment/assignment-policy/assign.ts:269-275` sobre lo pedido y `:316-322`
   sobre lo resuelto). No es un descuido: es el ADR D2 capa 3 — un bug de la policy no puede generar
   la segunda prueba de nadie.
2. **La reversa declarada no está implementada.** El comentario de la migración original dice
   textualmente que «la reconciliación lo supersede y vuelve a intentar», y la corrección posterior
   tuvo que desmentirse a sí misma en la base:
   `COMMENT ON COLUMN … superseded_at` declara que «NINGÚN write path lo escribe todavía»
   (`20260817102245965_…:47-52`). Ese comentario sigue siendo cierto hoy para este caso.
3. **El único supersede que existe no alcanza estas filas.** `supersedeAssignmentsForAssessment`
   (`src/lib/hiring/assessment/assignment-policy/assignment-store.ts:286-301`) filtra
   `WHERE assessment_id = $1`, y en una fila `blocked` el `assessment_id` es `NULL` — el ledger se
   escribe **antes** de crear la instancia y en un outcome terminal no se crea ninguna.

### El daño real no es que sea imposible: es que es invisible

Con la clave quemada, la postulación **desaparece de todas las superficies** que existen para
detectarla:

- `resolveApplicationsAwaitingAssignment` (`readers.ts:169-176`) excluye a quien tenga una fila
  vigente del ledger. Con la fila `blocked` ahí, la cola de reconciliación queda **vacía** y el caso
  parece cerrado.
- La señal `hiring.assessment.assignment_health` es un espejo exacto de ese predicado
  (`src/lib/reliability/queries/hiring-assessment-assignment-signals.ts:74-100`), así que tampoco lo
  ve. Su métrica `blocked_last_24h` (`:106-109`) **no entra al cálculo de severidad** (`:139-144`) y
  además caduca: a las 24 horas la clave quemada sale hasta de la evidencia.
- Si el mismo stage event se repite, `recordAssignment` colisiona con `ON CONFLICT DO NOTHING`,
  `resultFromRecord(..., { replay: true })` devuelve el `blocked` viejo y el carril automático calla
  (`assign.ts:344`).

El carril manual **sí** sigue disponible (su clave es `trigger_stage='manual'`, distinta), así que
técnicamente una persona puede asignar a mano. Pero sólo si alguien se entera — y nadie se entera,
porque las tres superficies de detección están en silencio. Ése es el hueco.

### La única reversa que existe hoy es un efecto colateral peligroso

Reconfigurar la policy sube `policy_version`, lo que **cambia la clave** y re-abre el paso. Está
documentado en el propio comentario de la señal: «al reconfigurar una policy (bump de versión) la
cola de reconciliación se llenaba» (`hiring-assessment-assignment-signals.ts:26-29`). Es una salida
por accidente, no gobernada: re-abre la clave de **toda la cohorte** de la vacante a la vez, no de
la persona afectada.

### Hechos verificados contra PostgreSQL real (2026-08-22) — no re-descubrirlos

- Filas `blocked` vigentes: **4**, todas `origin='stage_auto'`, `trigger_stage='shortlisted'`,
  `attempt_seq=1`, `outcome_reason='volume_cap'`.
- **Las 4 pertenecen a candidaturas `data_origin='smoke_test'`**, en `stage='closed'` con
  `decision IS NULL`. **No hay backlog real que recuperar.** Esta task es **preventiva**: proponer
  un backfill sobre esas filas sería fabricar actividad sobre datos de humo.
- El ledger es **append-only**: `trigger_stage` es irreescribible (el `GRANT UPDATE` es
  column-scoped y lo excluye,
  `20260817100030803_task-1719-assessment-assignment-ledger.sql:63-65`) y no hay `DELETE`. **NUNCA**
  reescribir filas históricas — el supersede por `superseded_at` es justamente el mecanismo que
  falta, y la columna **sí** está en el `GRANT UPDATE`, así que no hace falta migración para
  escribirla.
- El carril automático está **ON en producción**: `HIRING_STAGE_TEST_ASSIGNMENT_ENABLED=true` en la
  revisión activa del `ops-worker` desde 2026-08-18
  (`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`). O sea: las claves se pueden quemar hoy, no en
  un futuro hipotético.

### Por qué existe con ID propio y no como bullet de TASK-1755

1. **Es un mecanismo distinto.** `TASK-1755` reintenta abriendo un casillero nuevo (`attempt_seq+1`)
   sobre una decisión humana. Acá el casillero es único por contrato de base y la reversa es liberar
   el que está ocupado (`superseded_at`) por **reconciliación**, no por decisión de pantalla.
2. **Toca un write path que hoy no existe.** No es ajustar un caller: es construir el command que la
   base dice explícitamente que nadie escribe todavía.
3. **Hereda una restricción de orden que se le atribuyó por error a `TASK-1755`.** Su
   `## Delta 2026-08-22 (b)` lo corrige: cuando `TASK-1754` absorba `qualified` dentro de
   `shortlisted`, entra **más población a la etapa que dispara** la policy ⇒ más intentos
   `stage_auto` ⇒ **más claves quemadas de forma irrecuperable**. **Esta task va antes del
   colapso.** `TASK-1754` está `in-progress` con «el colapso NO empezado», así que la ventana
   todavía está abierta.

## Goal

- Que corregir la causa de un bloqueo automático devuelva la capacidad de asignar, sin borrar
  historia del ledger ni relajar la idempotencia que evita el doble envío.
- Que una clave quemada sea **visible** desde el momento en que se quema, y no dependa de que
  alguien la note a mano.
- Que el supersede sea un command gobernado con evidencia, tope y auditoría — no un barrido
  periódico que reabra claves porque sí.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md` (ADR D0a, D2, D5.2)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- El ledger es **append-only**. La solución **NUNCA** es `DELETE` ni reescritura de una fila
  histórica: `trigger_stage`, `attempt_seq`, `origin` y `application_id` están fuera del
  `GRANT UPDATE` column-scoped a propósito.
- **El supersede estampa `superseded_at` y NO reescribe `outcome`/`outcome_reason`.** Copiar el
  patrón de `supersedeAssignmentsForAssessment` —que sí reescribe a `cancelled`— borraría el
  `volume_cap` que dice **por qué** se bloqueó, que es todo el valor de auditoría de la fila. Ese
  path reescribe porque el hecho cambió (la instancia murió); acá el hecho no cambia: sólo deja de
  ocupar la clave.
- El carril automático **NUNCA** escribe `attempt_seq > 1`. El límite de autoridad del ADR D2 capa 3
  no se relaja para arreglar esto — si la solución propuesta necesita relajarlo, la solución está
  equivocada.
- Un resultado `assigned` vigente **NUNCA** se supersede por esta vía. Su reversa es la cancelación
  gobernada, que ya existe.
- **NUNCA** tocar el predicado de `countAssignedInWindow` (`assignment-store.ts:321-336`): no filtra
  `superseded_at` **a propósito**, porque superseder no des-envía un correo ya enviado. El supersede
  de un `blocked` no lo afecta (ese outcome nunca entró al conteo), y ese es el estado correcto.
- El supersede **no manda ningún correo por sí mismo**. Devuelve la fila a la cola; el envío sigue
  saliendo del camino gobernado de siempre.

## Normative Docs

- `docs/tasks/complete/TASK-1755-assessment-assignment-attempt-dead-end.md` — hermana directa. Su
  `## Slice 3` trae el conteo real contra PG y su `## Delta 2026-08-22 (b)` transfiere a esta task
  la restricción de orden. **No duplicar su contenido: referenciarlo.**
- `docs/tasks/complete/TASK-1719-hiring-assessment-assignment-policy.md`
- `docs/tasks/in-progress/TASK-1754-hiring-stage-vocabulary-collapse.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- `greenhouse_hiring.hiring_assessment_assignment` — el ledger, con su índice único parcial y su
  `GRANT UPDATE` column-scoped (que **ya incluye** `superseded_at`).
- `src/lib/hiring/assessment/assignment-policy/assignment-store.ts`
- `src/lib/hiring/assessment/assignment-policy/assign.ts` (`resolveAssignmentIntent` es el predicado
  canónico de la causa; el supersede lo reusa, no lo reimplementa)
- `src/lib/hiring/assessment/assignment-policy/readers.ts`
- `src/lib/reliability/queries/hiring-assessment-assignment-signals.ts`
- `src/app/api/hiring/openings/[id]/assessment-policy/reconciliation/route.ts`

### Blocks / Impacts

- **Va ANTES de `TASK-1754`** (colapso del enum de etapas). Al absorber `qualified` dentro de
  `shortlisted` entra más población a la etapa que dispara la policy, y cada bloqueo automático
  quema una clave que hoy no tiene reversa. Si `TASK-1754` aterriza primero, esta task deja de ser
  preventiva y hereda backlog real.
- `TASK-1755` (complete) — esta task es su follow-up declarado; comparte archivos y su suite de
  tests debe seguir verde.
- El endpoint de reconciliación gana una cola nueva; cualquier consumidor de su shape debe
  contemplarla.
- La señal `hiring.assessment.assignment_health` cambia de forma (métrica nueva y posiblemente de
  severidad); el dashboard `/admin/operations` la refleja sin cambios de código.

### Files owned

- `src/lib/hiring/assessment/assignment-policy/assignment-store.ts`
- `src/lib/hiring/assessment/assignment-policy/readers.ts`
- `src/lib/hiring/assessment/assignment-policy/commands.ts`
- `src/lib/reliability/queries/hiring-assessment-assignment-signals.ts`
- `src/app/api/hiring/openings/[id]/assessment-policy/reconciliation/route.ts`
- Los tests de esos archivos, incluido el gate vivo contra PostgreSQL real
- `docs/tasks/to-do/TASK-1771-assessment-assignment-auto-lane-supersede.md`

## Current Repo State

### Already exists

- La columna `superseded_at`, el índice único **parcial** que la honra y el `GRANT UPDATE` que
  permite escribirla. **No falta schema: falta el command.**
- `readAssignmentAttemptState` (`assignment-store.ts:152-176`) ya lee el estado de intentos de una
  clave sin fijar `attempt_seq`, y `RECOVERABLE_ASSIGNMENT_OUTCOMES` (`:126`) ya nombra qué
  resultados no cerraron la puerta (`blocked`, `held`, `stale`).
- `resolveAssignmentIntent` (`assign.ts:496-546`) es **el predicado canónico de la causa**: policy
  deshabilitada, modo manual, decisión tomada, etapa cambiada, plantilla inactiva, destinatario no
  entregable y cap de volumen. Corre read-only dentro de la transacción.
- Dos colas de reconciliación ya existen y ya tienen superficie:
  `resolveApplicationsAwaitingAssignment` y `resolveApplicationsMissedTriggerAwaitingHuman`,
  expuestas por `GET /api/hiring/openings/[id]/assessment-policy/reconciliation`. Ese endpoint
  **sólo lee**: no ejecuta recuperación.
- La señal `hiring.assessment.assignment_health` con su espejo exacto del reader canónico.

### Gap

- Ningún write path escribe `superseded_at` para una fila cuyo `assessment_id` es `NULL`.
- Ninguna superficie muestra una clave quemada: las dos colas y la señal la excluyen por
  construcción, y `blocked_last_24h` caduca a las 24 horas sin afectar la severidad.
- No existe una evaluación «¿esta causa seguiría bloqueando hoy?» separada de la ejecución del
  assignment.
- No hay tope ni condición de avance: sin ellos, cualquier supersede automático puede volver a
  bloquear por la misma causa y generar filas infinitas.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring/assessment/assignment-policy/` (portal Next.js, server-only)
- Future candidate home: `remain-shared`
- Boundary: command de supersede + reader de callejones en el módulo `assignment-policy`; los consumers autorizados son la ruta de reconciliación, Nexa/MCP por el mismo command y la señal de reliability
- Server/browser split: server-only estricto; el command y el reader importan `server-only` y el navegador sólo recibe el shape ya proyectado por la ruta
- Build impact: `none`
- Extraction blocker: el command comparte transacción y el lock `FOR UPDATE` de la policy con `assignAssessmentFromPolicy`, y el ledger vive en `greenhouse_hiring`; extraerlo exige mover ambos juntos

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_hiring.hiring_assessment_assignment` (ledger append-only del assignment)
- Consumidores afectados: ruta de reconciliación (`/api/hiring/openings/[id]/assessment-policy/reconciliation`), señal de reliability `hiring.assessment.assignment_health`, consumer reactivo del lane `notifications` en el `ops-worker`, Nexa/MCP por el contrato gobernado
- Runtime target: `production` (el carril automático ya está ON) + `worker` para el disparo, si el diseño elige uno

### Contract surface

- Contrato existente a respetar: el ledger y su índice único parcial; `RECOVERABLE_ASSIGNMENT_OUTCOMES`; el predicado canónico `resolveAssignmentIntent`; el shape actual de `GET …/reconciliation`
- Contrato nuevo o modificado: command de supersede gobernado + reader de callejones recuperables + tercera cola en el endpoint de reconciliación + métrica nueva en la señal
- Backward compatibility: `compatible` — el endpoint gana un campo, el ledger gana filas superseded; ningún consumidor existente cambia de forma
- Full API parity: la lógica vive en el primitive de `src/lib/hiring/assessment/assignment-policy/**`; la ruta y cualquier agente son consumers del MISMO command. El write es apto para `propose → confirm → execute` si se decide exponerlo a Nexa: el LLM propone, la persona confirma, el command ejecuta

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_assessment_assignment` (única tabla escrita); lectura de `hiring_opening_assessment_policy`, `hiring_application`, `hiring_assessment`, `hiring_assessment_template`, `identity_profiles`
- Invariantes que no se pueden romper:
  - Append-only: sin `DELETE`, sin reescritura de `trigger_stage`/`attempt_seq`/`origin`/`application_id`.
  - El supersede estampa `superseded_at` y **conserva** `outcome` y `outcome_reason`.
  - Sólo se supersede un resultado de `RECOVERABLE_ASSIGNMENT_OUTCOMES`; jamás `assigned`, `already_assigned` ni `intent`.
  - El carril automático sigue escribiendo `attempt_seq = 1` y nada más.
  - Superseder no libera presupuesto del cap de volumen.
- Write-target allowlist: `greenhouse_hiring.hiring_assessment_assignment` **ya está** en `ALLOWED_WRITE_TARGETS` de `src/lib/hiring/boundary-domain.test.ts:56`. Si el diseño necesitara una tabla nueva, se declara ahí en el MISMO PR con su justificación
- Tenant/space boundary: el actor sale de la sesión interna (`requireInternalTenantContext`); el scope es la vacante de la ruta y su policy, nunca una lista global
- Idempotency/concurrency: el cálculo y la escritura corren bajo el `FOR UPDATE` de la fila de policy (`lockPolicyForUpdate`), que es el mismo lock que serializa todos los assignments de esa policy. Superseder dos veces la misma fila es un no-op observable (`superseded_at IS NULL` en el `WHERE`)
- Audit/outbox/history: la propia fila superseded es la historia. Además se publica un evento de auditoría por el catálogo existente (mismo patrón que `publishAssignmentRecorded`, IDs-only, sin PII)

### Migration, backfill and rollout

- Migration posture: `none` — `superseded_at` existe y está en el `GRANT UPDATE`; el tope anti-bucle se deriva contando filas superseded de la misma clave, sin columna nueva. **Si el plan aprobado cambia esto**, aplican las dos reglas duras de 2026-08-22 de `GREENHOUSE_DATABASE_TOOLING_V1.md`: un `contract` de enum se aplica **después** del release que deja de escribir el valor, y **nunca** dejar una migración committeada sin aplicar (se parquea en `docs/tasks/pending-migrations/` con timestamp nuevo al reactivarla)
- Default state: el reader y la señal nacen encendidos (sólo leen); el disparo del supersede nace apagado o restringido a invocación humana explícita
- Backfill plan: **sin backfill**. Las 4 filas `blocked` vigentes son `data_origin='smoke_test'` sobre candidaturas `closed`; recuperarlas sería fabricar actividad sobre datos de humo
- Rollback path: revert del PR; las filas superseded no se «des-superseden» — se documenta que un supersede indebido se corrige por el camino gobernado, no reescribiendo el ledger
- External coordination: si el disparo termina viviendo en el `ops-worker`, el flag se declara en `services/ops-worker/deploy.sh` **y** se aplica en vivo, y se registra su fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el MISMO PR

### Security and access

- Auth/access gate: lectura con `hiring.assessment.read`; el supersede es gobernanza — el tier correcto es `hiring.assessment.policy.govern` (role-only, mismo tier que habilitar la asignación automática), **no** `hiring.assessment.author`, que lo porta cualquier tenant interno por routeGroup
- Sensitive data posture: PII de candidato en las tablas leídas; la señal y los eventos son IDs-only y conteos. Nunca nombre, correo, token ni score
- Error contract: `canonicalErrorResponse` en la ruta, `HiringValidationError` en el primitive, `captureWithDomain(error, 'hiring', …)` en la observabilidad. Sin prosa en inglés al cliente
- Abuse/rate-limit posture: el tope por clave **es** el rate limit del mecanismo; además el lock de policy serializa. Un supersede masivo por vacante debe tener límite explícito

### Runtime evidence

- Local checks: suite focal `npx vitest run src/lib/hiring/assessment`, el test de frontera `src/lib/hiring/boundary-domain.test.ts` y los tests de `src/lib/reliability`
- DB/runtime checks: gate vivo contra PostgreSQL real que reproduzca bloqueo automático → corrección de la causa → supersede → nuevo intento, con teardown de residuo cero (patrón `attempt-retry.live.test.ts`)
- Integration checks: ejercitar el endpoint de reconciliación autenticado y confirmar que la cola nueva aparece y se vacía
- Reliability signals/logs: `hiring.assessment.assignment_health` con la métrica nueva; steady esperado 0
- Production verification sequence: la de `## Rollout Plan & Risk Matrix`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Hacer visible el callejón (read-only)

- Reader canónico de callejones recuperables por policy: filas vigentes cuyo `outcome` está en
  `RECOVERABLE_ASSIGNMENT_OUTCOMES` y cuyo `origin` no es `manual`.
- Tercera cola en `GET /api/hiring/openings/[id]/assessment-policy/reconciliation`, con el mismo
  contrato de lectura y la misma capability que las dos existentes.
- Métrica nueva en `hiring.assessment.assignment_health` que **sí** entre al cálculo de severidad
  (a diferencia de `blocked_last_24h`), con su steady declarado.
- Sin escrituras. Este slice es reversible por revert y no puede romper nada.

### Slice 2 — Evaluar la causa vigente sin escribir

- Función de evaluación que responde «¿esta clave volvería a bloquearse hoy?» **reusando**
  `resolveAssignmentIntent`, sin duplicar ninguna de sus siete condiciones.
- Devuelve el resultado que se obtendría hoy y lo compara con el `outcome_reason` registrado.
- Expuesta como dry-run: la cola del Slice 1 puede mostrar, por fila, si la causa sigue aplicando.

### Slice 3 — Command de supersede gobernado (con tope y condición de avance, indivisible)

- Command en `src/lib/hiring/assessment/assignment-policy/` que estampa `superseded_at` sobre una
  fila recuperable identificada, bajo el `FOR UPDATE` de la policy, con actor, capability y evento
  de auditoría IDs-only.
- **La condición de avance y el tope viajan en el mismo slice**, nunca después: sin ellos el command
  puede reabrir una clave que vuelve a bloquearse por la misma causa y generar filas infinitas.
- Conserva `outcome` y `outcome_reason`. No crea instancia. No manda correo.

### Slice 4 — Gate vivo contra PostgreSQL real + cierre de las filas existentes

- Test vivo que reproduce el ciclo completo contra PG real, con teardown verificado a residuo cero.
- Decisión ejecutada y documentada sobre las 4 filas `blocked` vigentes: la evidencia de 2026-08-22
  dice **sin backfill**; el slice confirma que el conteo no cambió y lo deja escrito.

## Out of Scope

- **El carril manual.** Es `TASK-1755`, cerrada: su salida es `attempt_seq + 1` sobre una decisión
  humana y no se toca acá.
- **El colapso del enum de etapas.** Es `TASK-1754`. Esta task declara una restricción de orden
  respecto de ella, pero no retira ni agrega literales de `trigger_stage`.
- **El eje de desenlace de la postulación.** Es `TASK-1765`. La palabra «desenlace» de este dominio
  se llama **resultado del intento** para no colisionar con el vocabulario del pipeline.
- Reintentar un `assigned`: esa clave está legítimamente ocupada y su reversa es la cancelación
  gobernada, que ya existe.
- Relajar el `CHECK (origin = 'manual' OR attempt_seq = 1)`. Si el diseño lo necesita, el diseño está
  equivocado.
- Backfill o recovery de las 4 filas de smoke.
- Cambiar el cap de volumen, su ventana o el predicado de `countAssignedInWindow`.
- Superficie de UI. Esta task entrega contrato y cola; la pantalla, si se decide, es una task aparte.

## Detailed Spec

Las cuatro preguntas de diseño están abiertas **a propósito**: cada una tiene evidencia que hay que
mirar antes de resolverla, y resolverlas mal es más caro que dejarlas planteadas.

### 1. ¿Quién dispara el supersede?

Tres candidatos, con su consecuencia:

- **La reconciliación que ya existe.** Hoy `GET …/reconciliation` **sólo lee** y lo declara en su
  propio comentario: «Este endpoint sólo LEE. La recuperación se ejecuta por el camino gobernado de
  siempre». Convertirlo en un ejecutor cambia su naturaleza y su capability.
- **Un command explícito** invocado por una persona sobre una fila concreta. Es lo más alineado con
  Full API Parity y con el resto del dominio (propose → confirm), y el más fácil de auditar. Cuesta
  que alguien tiene que ir a apretarlo.
- **El propio `assign`**, al detectar que la causa cambió. Es el más automático y el más peligroso:
  el caller automático corre con `actorUserId: null` desde el consumer reactivo del `ops-worker`, o
  sea un supersede sin actor, y el blast radius es la cohorte completa.

**Consecuencia que la decisión debe declarar explícitamente:** el supersede **por sí solo no manda
ningún correo**. Sólo devuelve la fila al conjunto que `resolveApplicationsAwaitingAssignment` ve. Si
la task no declara quién ejecuta el intento nuevo después, el resultado es una cola que se llena y
nadie drena — exactamente el «lector sin superficie» que el endpoint de reconciliación existe para
evitar.

### 2. ¿Qué evidencia justifica superseder?

Que la causa ya no aplique **no es observable desde la fila**: la fila dice `volume_cap` o
`template_inactive`, pero si eso sigue siendo cierto hoy sólo se sabe resolviéndolo contra el estado
vigente (estado y modo de la policy, `status` de la plantilla, correo del candidato, decisión y etapa
de la postulación, conteo de la ventana del cap).

Ese resolutor **ya existe**: `resolveAssignmentIntent`. La decisión de diseño es reusarlo, no
reimplementarlo — si la evidencia se calcula con una copia, las dos definiciones divergen y el
supersede empieza a reabrir claves que el assignment va a volver a bloquear.

Sub-caso que hay que declarar aparte: **`volume_cap` se auto-cura con el tiempo**, porque la ventana
es móvil (`countAssignedInWindow` cuenta `created_at > NOW() - ventana`). Superseder por «la causa ya
no aplica» inmediatamente después puede ser correcto o puede ser un rebote, según el minuto en que se
evalúe. Declarar cómo se trata.

### 3. ¿Cómo se evita el bucle?

Un supersede automático que vuelva a bloquear por la misma causa genera filas infinitas con el mismo
`attempt_seq = 1`, todas superseded menos la última. El índice único parcial lo permite, así que la
base no frena nada.

Necesita **las dos** cosas:

- **Tope**: máximo de recuperaciones por clave, derivable del ledger contando filas con
  `superseded_at IS NOT NULL` de la misma `(application, policy, versión, etapa)`. Al agotarse, la
  clave pasa a un estado que exige intervención humana — mismo espíritu que el `dead_letter` del
  outbox.
- **Condición de avance**: no se supersede si la evaluación del punto 2 devuelve el **mismo**
  resultado registrado. Superseder para volver a bloquear igual no es recuperación, es ruido.

### 4. ¿Qué señal?

Hoy una clave quemada es invisible: la cola la excluye, la señal la espeja y `blocked_last_24h`
caduca sin afectar la severidad. La señal nueva debe distinguir dos poblaciones que no son lo mismo:

- **Callejón honesto**: bloqueada y la causa **sigue** aplicando. No es accionable todavía; alarmar
  por esto entrena a la gente a ignorar la señal.
- **Callejón recuperable**: bloqueada y la causa **ya no** aplicaría hoy. Ésta es la que importa y la
  que debe mover la severidad. **Steady = 0**: si el supersede funciona, este conteo vuelve a cero
  solo.

Decidir si se agrega como métrica de `hiring.assessment.assignment_health` (una señal por área, que
es el patrón vigente del dominio) o como señal propia, y declarar el steady en el registro.

## Rollout Plan & Risk Matrix

Cambio de command sin migración de schema, sobre el único ledger que gobierna si un candidato recibe
o no su prueba. El carril automático está **ON en producción**, así que todo lo que se despliegue
opera sobre candidatos reales desde el primer minuto.

### Slice ordering hard rule

- **Esta task va ANTES de que `TASK-1754` aterrice el colapso de etapas.** Al absorber `qualified`
  dentro de `shortlisted`, entra más población a la etapa que dispara la policy ⇒ más intentos
  `stage_auto` ⇒ más claves quemadas sin reversa. `TASK-1754` está `in-progress` con el colapso no
  empezado: la ventana está abierta. Si se cierra, esta task deja de ser preventiva y su Slice 4
  cambia de naturaleza (pasa a ser remediación de backlog real).
- Slice 1 (read-only) → Slice 2 (evaluación) → Slice 3 (write). El write **NUNCA** va primero: sin la
  cola y la evaluación no hay forma de saber sobre qué se está escribiendo.
- **Slice 3 es indivisible.** El command, su tope y su condición de avance shippean juntos. Un
  supersede sin tope es una fábrica de filas.
- Slice 4 va al final, cuando el camino nuevo ya está probado en local y el conteo real se puede
  confirmar sin ambigüedad.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un supersede masivo reabre la cohorte completa de una vacante y dispara envíos en lote a candidatos reales | Hiring / comunicación al candidato | Media | El supersede no ejecuta el assignment ni manda correo: sólo devuelve la fila a la cola. Tope por clave + límite explícito por vacante + capability de gobernanza, no `author` | `hiring.assessment.assignment_health` (`awaiting_terminal` y la métrica nueva) |
| Bucle supersede → blocked → supersede con la misma causa, filas infinitas | Hiring / ledger | Media | Tope por clave derivado del ledger + condición de avance (la evaluación vigente debe diferir del resultado registrado). Ambos en el mismo slice que el command | Conteo de filas superseded por clave; la métrica nueva no baja |
| Copiar `supersedeAssignmentsForAssessment` y reescribir `outcome` a `cancelled`, borrando el `volume_cap` que explica el bloqueo | Hiring / data quality | Alta si no se declara | Invariante explícito: el command **sólo** estampa `superseded_at`. Test que afirma que `outcome` y `outcome_reason` no cambian | Auditoría del ledger; el evento de auditoría conserva el reason |
| Superseder libera presupuesto del cap de volumen y el freno de blast radius deja de frenar | Hiring | Baja | `countAssignedInWindow` no filtra `superseded_at` a propósito y no cuenta `blocked`. **No tocar ese predicado**; test de no-regresión | Conteo del cap en el gate vivo |
| `volume_cap` se auto-cura por ventana móvil: superseder en el minuto equivocado re-bloquea de inmediato | Hiring | Alta | Evaluar la causa bajo el lock de la policy en el mismo instante del supersede; declarar tratamiento explícito del caso ventana | Métrica nueva que no converge a 0 |
| El colapso de `TASK-1754` llega primero y multiplica las claves quemadas antes de que exista la reversa | Hiring | Media | Restricción de orden declarada acá y en el `## Delta (b)` de `TASK-1755`; coordinar con la sesión que gobierna `TASK-1754` | Métrica nueva creciendo sin supersede disponible |
| El diseño termina exigiendo migración y se aplica en el orden equivocado sobre la base compartida | migration | Baja | Las dos reglas duras de 2026-08-22 de `GREENHOUSE_DATABASE_TOOLING_V1.md`: `contract` después del release; ninguna migración committeada sin aplicar (parquear en `docs/tasks/pending-migrations/`) | `pnpm migrate:status` |
| El disparo termina en el `ops-worker` y el flag se prende sólo en Vercel (o sólo con `--update-env-vars`) | cron / worker | Media | Declarar el flag en `services/ops-worker/deploy.sh` **y** aplicarlo en vivo; fila en `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR | `pnpm flags:audit --strict`; el gate de `docs:closure-check` |

### Feature flags / cutover

- Slices 1 y 2 son read-only: **sin flag**, cutover inmediato. Un reader que no escribe no necesita
  interruptor.
- Slice 3: la puerta natural es la **capability** (`hiring.assessment.policy.govern`), no un env var,
  mientras el disparo sea humano y explícito. Una capability es revocable por rol, auditada y
  visible en el Admin Center.
- **Si el plan aprobado elige un disparo automático dentro del `ops-worker`**, entonces sí nace con
  env flag `*_ENABLED` en `OFF`, declarado en `services/ops-worker/deploy.sh` (SoT — sus
  `--set-env-vars` son destructivos), aplicado además en vivo con `--update-env-vars`, y con su fila
  en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el MISMO PR. Prenderlo sólo en Vercel no hace
  nada: el consumer reactivo del lane vive en Cloud Run.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — reader + cola + métrica | revert del commit; sólo lee | minutos | sí |
| Slice 2 — evaluación dry-run | revert del commit; no escribe | minutos | sí |
| Slice 3 — command de supersede | revocar la capability (efecto inmediato, sin deploy) y revert del PR. Las filas ya superseded **no se des-superseden**: son historia y su corrección es por el camino gobernado, nunca reescribiendo el ledger | minutos para cortar; parcial para el efecto ya aplicado | parcial |
| Slice 4 — gate vivo | revert del test; el gate no muta producción y hace teardown a residuo cero | minutos | sí |

### Production verification sequence

1. Contar en PostgreSQL real las filas vigentes con resultado recuperable y `origin <> 'manual'`,
   desglosadas por `outcome_reason`, `data_origin` de la candidatura y `stage`. Confirmar el punto de
   partida antes de tocar nada.
2. Desplegar Slice 1 y verificar que la cola nueva y la métrica devuelven **exactamente** ese mismo
   conteo. Si difieren, el predicado del reader no es el que se creyó y no se avanza.
3. Desplegar Slice 2 y contrastar, fila por fila, la evaluación vigente contra el
   `outcome_reason` registrado. Verificar el caso `volume_cap` en dos momentos distintos de la
   ventana.
4. Ejecutar el gate vivo del Slice 4 contra PostgreSQL real: bloqueo automático → corrección de la
   causa → supersede → intento nuevo. Confirmar teardown a residuo cero.
5. Habilitar el supersede a un actor con la capability y ejercitarlo sobre **una** fila,
   preferentemente en un opening de prueba. Verificar en la base: `superseded_at` estampado,
   `outcome` y `outcome_reason` intactos, evento de auditoría publicado.
6. Confirmar que la postulación reaparece en `awaitingAssignment` y que la métrica nueva bajó.
7. Confirmar que el cap de volumen de esa policy **no** cambió de valor por el supersede.
8. Monitorear la señal 7 días. Steady esperado: 0 en la métrica de callejón recuperable.

### Out-of-band coordination required

- **Coordinación con la sesión que gobierna `TASK-1754`** para respetar el orden. Es la única
  coordinación bloqueante y no es opcional.
- Si el disparo termina en el `ops-worker`: `deploy.sh` + aplicación en vivo del flag + fila en el
  ledger de flags. Sin eso, el flag desaparece en el siguiente deploy, en silencio.
- Ninguna otra: no hay proveedor externo, secreto ni configuración de terceros en el camino.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Una clave quemada del carril automático es visible desde el momento en que se quema: aparece en
      la cola de reconciliación y mueve la severidad de la señal.
- [x] La señal distingue «callejón honesto» (la causa sigue aplicando) de «callejón recuperable» (la
      causa ya no aplicaría hoy), y sólo la segunda alarma. Steady declarado = 0.
- [x] La evidencia que justifica superseder se resuelve contra el estado vigente **reusando**
      `resolveAssignmentIntent`, sin duplicar ninguna de sus condiciones.
- [x] El supersede estampa `superseded_at` y deja `outcome` y `outcome_reason` intactos, con test que
      lo afirma.
- [x] Existe un tope por clave y una condición de avance; ambos shippean en el mismo slice que el
      command, y hay un test que demuestra que el bucle supersede → blocked → supersede se detiene.
- [x] Superseder **no** manda correo ni crea instancia por sí mismo, y la task declara explícitamente
      quién ejecuta el intento nuevo después.
- [x] El carril automático sigue sin poder escribir `attempt_seq > 1`: el `CHECK` y las dos guardas
      de `assign.ts` quedan intactos.
- [x] Un resultado `assigned` vigente sigue sin poder superseder-se por esta vía.
- [x] El cap de volumen no libera presupuesto por un supersede: test de no-regresión sobre
      `countAssignedInWindow`.
- [x] El ciclo completo quedó ejercitado contra PostgreSQL real con teardown a residuo cero.
- [x] La decisión sobre las 4 filas `blocked` existentes quedó ejecutada y escrita (la evidencia de
      2026-08-22 dice **sin backfill**).
- [x] La suite de `TASK-1755` (`attempt-retry.test.ts` y su gate vivo) sigue verde: el carril manual
      no cambia de comportamiento.


## Delta de cierre 2026-08-23 — code complete, rollout pendiente

Los cuatro slices están implementados y verificados en local. **El estado correcto NO es `complete`**: nada
de esto corre todavía en producción, así que mover el lifecycle sería declarar operable algo que ningún
operador puede usar.

### Lo que quedó hecho

| Slice | Commit | Qué |
|---|---|---|
| 1 | `617d18df7` | Reader de callejones + tercera cola en reconciliación + métrica en la señal |
| 2 | `146242339` | `resolveLiveAssignmentIntent` + evaluación dry-run + tope derivado |
| 3 | `d5914c841` | Command de supersede + ruta POST + evento de auditoría |
| 4 | `0f558666a` | Gate vivo contra PostgreSQL real |

Además: `ISSUE-162` (`9d1db5252`) y la recalibración de esta spec (`12868f9c7`).

### Evidencia

- Gate vivo: **dos corridas seguidas, ambas exit 0**, con `awaiting_terminal` = 13 antes de la primera y
  después de la segunda, cero eventos `hiring.assessment.*` sobrevivientes y cero fixtures residuales.
- Métricas nuevas en su steady: `assignment_dead_ends = 0`, `recoverable = 0`, `honest = 0`,
  `cap_reached = 0`, `excluded_synthetic = 2`, `truncated = false`.
- `pnpm lint` exit 0 · `pnpm typecheck` exit 0 · `src/lib/hiring` + `src/lib/reliability` **1.812 verdes**.
  Todos leídos capturando el exit code directo, sin pipe de por medio.
- Las 4 filas `blocked` siguen siendo 4, siguen siendo `smoke_test` y la cola las excluye. **Sin backfill**,
  como declaraba la evidencia del 2026-08-22.

### Lo que falta para `complete`

1. ~~Push + release~~ → **HECHO**: viajó en `709e15f66` (2026-08-23). Verificado blob a blob contra
   `origin/main` el 2026-08-26 (`supersede-dead-end.ts` + la ruta `…/reconciliation/supersede/route.ts`).
2. La `## Production verification sequence` completa, que sólo se puede ejecutar contra el runtime desplegado.
   **Este es el pendiente real.**
3. ~~La migración del `COMMENT` de `superseded_at`, parqueada~~ → **APLICADA** (`d793b2444`, con readback
   antes/después); `docs/tasks/pending-migrations/` quedó vacía. Su condición —que el release que despliega
   el command ya hubiera ocurrido— se cumplió.
4. `pnpm test` completo + `pnpm build` de producción como gate de cierre (el build consume ~30 GB y requiere
   autorización del operador).

### Advertencia para el próximo gate vivo de este dominio

El gate de esta task **asignó de verdad** en una versión intermedia y dejó un `hiring.assessment.assigned` en
estado `pending` —el evento del que cuelga el correo al candidato— apuntando a una instancia que el teardown ya
había borrado. **El publisher del outbox corre cada 2 minutos sobre la base compartida por dev, staging y
producción.** Se retiró a mano con verify-then-delete (confirmar `event_id`, estado `pending` e instancia
inexistente, y sólo entonces borrar).

La causa raíz no fue el teardown: el encabezado del test **afirmaba** que el gate nunca llegaba a `assigned`, y
esa afirmación era cierta cuando se escribió y dejó de serlo cuando el escenario cambió. **Un comentario no es
una guarda.** Quedó enforced: la policy se apaga antes del reintento y el test asserta cero instancias.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `npx vitest run src/lib/hiring/assessment`
- `npx vitest run src/lib/hiring/boundary-domain.test.ts`
- `npx vitest run src/lib/reliability`
- Gate vivo contra PostgreSQL real:
  `set -a && . ./.env.local && set +a && npx vitest run src/lib/hiring/assessment/assignment-policy/<gate>.live.test.ts`
- Lectura autenticada de `GET /api/hiring/openings/[id]/assessment-policy/reconciliation` con la cola
  nueva presente
- `pnpm test` completo + `pnpm build` como gate de cierre, según
  `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md` (pedir autorización antes del build: consume
  ~30 GB)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1754` quedó notificada del orden: su colapso ocurre **después** de que esta task cierre, o
      se documenta explícitamente por qué no
- [ ] el `COMMENT ON COLUMN … superseded_at` del ledger dejó de mentir: hoy declara que ningún write
      path lo escribe, y esta task lo escribe

## Follow-ups

- Superficie de operador para drenar la cola de callejones desde Application 360 o desde la vista de
  la policy. Esta task entrega el contrato; la pantalla es trabajo aparte.
- Evaluar exponer el supersede a Nexa/MCP por el loop `propose → confirm → execute`. El contrato
  gobernado ya queda apto por construcción si el command nace bien.
- Evaluar si `resolveApplicationsMissedTriggerAwaitingHuman` debería contemplar también las claves
  quemadas cuya postulación ya avanzó de etapa.

## Open Questions

- ¿El disparo del supersede es humano-explícito, reconciliación periódica, o el propio `assign` al
  detectar el cambio de causa? Cada opción tiene un blast radius distinto y la task no la resuelve de
  antemano: la evidencia está en `## Detailed Spec` punto 1.
- ¿`volume_cap` merece tratamiento propio por ser la única causa que se auto-cura con el paso del
  tiempo, en vez de por una corrección de configuración?
- ¿La métrica nueva vive dentro de `hiring.assessment.assignment_health` o merece señal propia?
