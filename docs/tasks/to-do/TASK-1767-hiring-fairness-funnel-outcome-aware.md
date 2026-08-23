# TASK-1767 — El embudo de equidad ramifica por desenlace y por causa

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
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Diseño — nada implementado; la VIEW vigente no conoce el eje de desenlace`
- ADR: `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Nota de desbloqueo (2026-08-23): el embudo de equidad ya puede ramificar por desenlace y causa reales
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-22 — el eje y la causa por los que vas a ramificar ya existen (TASK-1765)

- **`decision_cause` está persistida** y es un enum gobernado, no prosa:
  `capacity_filled` · `opening_closed` · `process_cancelled`. La bicondicional de base garantiza que
  es no-null **si y sólo si** `decision='not_selected'`, así que el embudo puede confiar en el par sin
  defenderse de estados imposibles.
- **La regla de conteo del ADR §4.1**, que es tuya de implementar: `capacity_filled` **sí** cuenta
  como proceso concluido (hubo comparación); `opening_closed` y `process_cancelled` **no** (el proceso
  no concluyó). Contarlos como rechazo infla la tasa de la cohorte demográfica que estuviera ahí y el
  ratio 4/5 leería un impacto adverso que no ocurrió.
- **La causa viaja también en el payload de `hiring.application.decided`** y en cada entrada de
  `decisionHistory[]`, no sólo en la columna snapshot. Las entradas anteriores al 2026-08-22 no la
  tienen y son inmutables: tratar su ausencia como «sin causa», nunca inferirla.
- **Corrección de cita, importante para esta task:** la definición VIVA de la VIEW
  `greenhouse_hiring.assessment_fairness` está en
  `migrations/20260713173500000_task-1365-application-scoped-selfid-hardening.sql:71+`. La copia de
  `20260713165547000_*:91` está **superseded**. Varias specs citan la muerta.
- **NUNCA** retirar literales de las escaleras de rango: son tabla de traducción histórica sobre
  payloads inmutables de `outbox_events`, no espejo del vocabulario vigente. `on_hold` salió del enum
  de desenlaces pero cualquier payload histórico que lo nombre debe seguir traduciéndose.

## Summary

La VIEW `greenhouse_hiring.assessment_fairness` cuenta hoy a **toda** persona con self-ID en el
denominador del embudo, sin mirar cómo terminó su proceso. El ADR del vocabulario fija que el embudo
ramifica por **desenlace + causa**: `not_selected + capacity_filled` cuenta (el proceso concluyó y
hubo comparación), `opening_closed` y `process_cancelled` no (el proceso no concluyó), y `withdrawn`
y `unresponsive` tampoco (no son resultado del proceso). Esta task implementa esa ramificación,
colapsa las tres escaleras de rango en una sola conservando los literales retirados como tabla de
traducción histórica, y devuelve visibilidad a `backup_selected`, que hoy es invisible por los dos
caminos a la vez.

## Why This Task Exists

**Es task propia y no un slice de `TASK-1765` porque es el único consumidor cuyo error es
irreversible y silencioso.** La evidencia AI-Act vive en `greenhouse_hr.assessment_fairness_evidence`
y es append-only por trigger: `RAISE EXCEPTION` tanto en `UPDATE` como en `DELETE`
(`migrations/20260713165547000_task-1365-voluntary-demographics-and-fairness.sql:76-89`). Un bucket
mal ramificado firma un ratio 4/5 falso, y ese registro **después no se puede reescribir**. Los demás
consumidores del vocabulario (tablero, Talent Pool, correo) se corrigen con un `UPDATE`; éste no.

Sobre eso hay tres defectos verificados, y un matiz que acota el alcance real y que esta task **no
debe perder**:

1. **H-03 — la escalera es una tabla de traducción, no un espejo del vocabulario vigente.** El
   `GREATEST` de `migrations/20260713173500000_task-1365-application-scoped-selfid-hardening.sql:109-122`
   combina una rama histórica sobre los payloads de `outbox_events` (`:84-95`) con una rama sobre el
   estado vigente (`:111-121`), ambas con `ELSE 0`. Si el colapso del enum retira `qualified` o
   `client_review` de esas escaleras, **se pierde la única memoria del avance de un rechazado dentro
   de la VIEW**: los payloads son inmutables y `hiring.application.decided` ni siquiera lleva `stage`
   (`src/lib/hiring/decide.ts:270-287`), así que el evento de decisión aporta exactamente 0.
2. **H-25 — `backup_selected` es una decisión favorable que no existe para el análisis, por los dos
   caminos a la vez.** Escribe `stage = 'backup'` (`src/lib/hiring/decide.ts:27-33`), literal que no
   está en ninguna de las dos escaleras y por tanto cae a rango 0; y el numerador del objetivo
   `selected` filtra `progress.decision = 'selected'`
   (`migrations/20260713173500000_...:142`), que la excluye. Ninguna de las dos vías la ve.
3. **H-04 (matizado a la baja, P2) — el piso k protege el denominador y deja el numerador crudo.**
   `advanced_count` no tiene piso k en ningún punto: ni en SQL (`:140-145`) ni en TS
   (`src/lib/hiring/assessment/fairness/stats.ts:62` filtra por `eligibleCount`, nunca por
   `advancedCount`). Y ese filtro TS **nunca remueve nada**: toda fila ya pasó el `HAVING >= 10`
   (`:154`) y el agregador **suma** entre meses (`stats.ts:42-43`), así que la cifra sólo puede
   crecer. Es k-anonimato decorativo. **No es una divulgación irreversible**: el verificador demostró
   que el daño ya está disponible sin ataque —un solo snapshot publica `advancedCount` y
   `eligibleCount` crudos, porque `round()` se aplica sólo a tasas y ratios (`stats.ts:30`)—, que
   **no existe camino de lectura** en `src/` (la única referencia a la tabla de evidencia es el
   `INSERT` de `src/lib/hiring/assessment/fairness/evidence.ts:24-37`), y que ese mismo rol ya tiene
   `SELECT` sobre `greenhouse_hiring.hiring_demographic_selfid`, que es fila-por-individuo. El k=10
   es disciplina de capa aplicación sobre la API, no una frontera de privilegios.

**El matiz que acota el alcance: el reporte por defecto es inmune a la escalera.**
`src/lib/hiring/assessment/fairness/get-selection-fairness.ts:42` resuelve `input.stage ?? 'selected'`,
y para ese objetivo el numerador filtra por `decision`, **sin leer `max_stage_rank` nunca**
(`migrations/20260713173500000_...:142`). La escalera no puede mutilar el 4/5 que realmente se
ejecuta hoy. Lo que esta task introduce como riesgo nuevo **no es la escalera: es el denominador** —
excluir del embudo a quien no concluyó el proceso cambia a quién se cuenta, y por lo tanto puede
mover el ratio y la reportabilidad de un grupo. Ese cambio se declara, se firma versionado y se
verifica; no se descubre.

**Hallazgo incidental que se arregla acá (H-26):** el `POST` que **escribe** en la tabla append-only
está gateado por `can(tenant, 'hiring.assessment.fairness_read', 'read', 'tenant')` —el mismo grant
que el `GET`— en `src/app/api/hiring/assessments/fairness/route.ts:44`. Una capability de **lectura**
autorizando una escritura irreversible.

## Goal

- La VIEW ramifica por **desenlace + causa** según el ADR §4/§4.1: `not_selected + capacity_filled`
  cuenta en el embudo; `opening_closed`, `process_cancelled`, `withdrawn` y `unresponsive` no.
- Una sola escalera de rango en SQL, que **conserva los literales retirados** mapeados al rango
  nuevo, con un test de paridad que ata el espejo TS `FAIRNESS_REPORTABLE_STAGES` a esa escalera.
- `backup_selected` deja de ser invisible: obtiene rango terminal en la escalera y un objetivo
  reportable propio, **sin cambiar la definición del objetivo `selected`**.
- El snapshot append-only queda **estampado con la versión de esquema** y con su política de piso k
  declarada, antes de que la semántica cambie.
- El `POST` de evidencia queda gateado por una capability de escritura propia, con grant en el mismo
  PR.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (§4, §4.1,
  §10 fila «Equidad / AI Act», §12)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` §9 (si algo ramifica por un valor, ese
  valor no se colapsa; y un `ELSE` silencioso no es un default, es un fallo sin señal)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **NUNCA** retirar un literal de la escalera de rango de la VIEW de equidad. Son **tabla de
  traducción histórica**, no espejo del vocabulario vigente (ADR §12). Los payloads de
  `greenhouse_sync.outbox_events` son inmutables y son la única memoria del avance de un rechazado
  dentro de la VIEW.
- **NUNCA** convertir `ELSE 0` en `ELSE NULL` en ninguna de las ramas de rango. `MAX`/`GREATEST`
  ignoran NULL y el cambio altera en silencio el rango de cohortes históricas completas.
- **NUNCA** etiquetar a una persona con el estado de la vacante: la vacante entra como **causa** de
  `not_selected`, jamás como desenlace.
- **NUNCA** dejar la causa como texto libre: el embudo ramifica por ella, luego es enum gobernado
  (dueño: `TASK-1765`).
- **NUNCA** hacer `UPDATE`/`DELETE` sobre `greenhouse_hr.assessment_fairness_evidence` ni «corregir»
  un snapshot firmado. Un snapshot equivocado se supersede con uno nuevo versionado, jamás se
  reescribe.
- **NUNCA** cambiar la semántica del bucket sin que el snapshot lleve la versión de esquema que la
  identifica. Sin ese estampado, dos filas append-only con reglas distintas quedan indistinguibles
  para siempre.
- **NUNCA** seedear una capability sin grantearla a ≥1 rol real en el mismo PR
  (`src/lib/entitlements/capability-grant-coverage.test.ts`).
- **NUNCA** exponer identificadores individuales en la VIEW ni en el DTO: el boundary test
  `src/lib/hiring/assessment/fairness/boundary.test.ts` es parte del contrato, no un test más.

## Normative Docs

- `docs/audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md` — hallazgos **H-03**,
  **H-04**, **H-25** y **H-26** (verificados adversarialmente; H-03 matizado a P1, H-04 matizado a
  la baja a P2 — respetar los matices, no inflarlos).
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md:138` — estado real de
  `HIRING_FAIRNESS_MONITOR_ENABLED`: staging ON con cohortes sintéticas, **producción OFF/ausente**
  por falta de aviso y consentimiento específico para categorías sensibles.
- `docs/tasks/to-do/TASK-1762-hiring-opening-capacity-closure-foundation.md` — primer productor real
  de `not_selected + capacity_filled`.

## Dependencies & Impact

### Depends on

- `TASK-1765` — eje de desenlace (`selected|backup_selected|not_selected|rejected|withdrawn|unresponsive`)
  y causa gobernada (`capacity_filled|opening_closed|process_cancelled`) con su `CHECK`. **Hoy no
  existen en la base.** Esa task declara la columna `greenhouse_hiring.hiring_application.decision_cause`
  con `CHECK` de enum y `CHECK` de pareja (`decision_cause IS NOT NULL` ⟺ `decision = 'not_selected'`)
  en `docs/tasks/to-do/TASK-1765-hiring-application-outcome-axis.md`. Confirmar el nombre contra la
  migración real al implementar; si cambió, cambia el CTE de participación.
- `greenhouse_hiring.assessment_fairness` — **definición vigente** en
  `migrations/20260713173500000_task-1365-application-scoped-selfid-hardening.sql:71-157`. Ojo: hay
  **dos** copias de la VIEW en el historial de migraciones — `20260713165547000_...:91-175` la creó y
  `20260713173500000_...` la reemplazó el mismo día. La que corre es la segunda; leer la primera por
  error lleva a un `join` de self-ID por `identity_profile_id` que ya no existe.
- `greenhouse_hr.assessment_fairness_evidence` y sus triggers append-only —
  `migrations/20260713165547000_task-1365-voluntary-demographics-and-fairness.sql:62-89`.
- `src/config/entitlements-catalog.ts:2247-2248` y `src/lib/entitlements/runtime.ts:594-643` — tier
  role-only donde vive `hiring.assessment.fairness_read`.

### Blocks / Impacts

- `TASK-1762` — su run de cierre por capacidad es el primer productor masivo de
  `not_selected + capacity_filled`. Si esta task no ramificó, esa cohorte entra al embudo con la
  regla vieja y firma evidencia bajo una semántica que nadie declaró.
- `TASK-1766` — consumidor UI del reporte de equidad: la superficie debe mostrar qué regla de embudo
  y qué versión de esquema produjo el número que muestra.
- `TASK-1754` — el colapso del enum. Esta task es la que hace seguro retirar `qualified` y
  `client_review` sin perder la memoria histórica.
- `TASK-1744` — retención: al expirar `retention_expires_at` la fila de self-ID sale de la VIEW
  (`migrations/20260713173500000_...:151`). No cambia acá, pero es el reloj que ya limita la
  reproducibilidad de un snapshot.

### Files owned

- `migrations/` — una migración forward-fix nueva con `CREATE OR REPLACE VIEW
  greenhouse_hiring.assessment_fairness`, la VIEW companion de drift y el seed de la capability.
- `src/lib/hiring/assessment/fairness/contracts.ts`
- `src/lib/hiring/assessment/fairness/get-selection-fairness.ts`
- `src/lib/hiring/assessment/fairness/stats.ts`
- `src/lib/hiring/assessment/fairness/evidence.ts`
- `src/lib/hiring/assessment/fairness/snapshot.ts` (nuevo)
- `src/lib/hiring/assessment/fairness/ladder-parity.test.ts` (nuevo)
- `src/lib/hiring/assessment/fairness/stats.test.ts`
- `src/lib/hiring/assessment/fairness/fairness.live.test.ts`
- `src/app/api/hiring/assessments/fairness/route.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `docs/documentation/hr/monitor-de-equidad-de-seleccion.md` (nuevo)
- `docs/manual-de-uso/hr/operar-monitor-de-equidad-de-seleccion.md` (nuevo)

## Current Repo State

### Already exists

- La VIEW `greenhouse_hiring.assessment_fairness` con las **tres escaleras**:
  `stage_targets` (`migrations/20260713173500000_...:72-81`), la escalera histórica sobre payloads
  (`:84-95`) y la escalera del estado vigente (`:111-121`), unidas por `GREATEST` (`:109-122`).
- El **espejo TS** `FAIRNESS_REPORTABLE_STAGES` con los mismos siete literales
  (`src/lib/hiring/assessment/fairness/contracts.ts:1-9`), validado en el reader
  (`get-selection-fairness.ts:44-46`).
- El `CROSS JOIN stage_targets` (`:152`) que hace el denominador **invariante a la etapa**, y el
  `HAVING COUNT(DISTINCT ...) >= 10` (`:154`) que sólo mide ese denominador.
- El agregador TS que **suma entre meses** (`stats.ts:32-49`), calcula la referencia con
  `Math.max` (`stats.ts:67`) y aplica el filtro k a `eligibleCount` post-agregación (`stats.ts:62`).
- El persistidor append-only (`evidence.ts:22-58`), que guarda `report.scope` en `scope_json` y el
  **reporte completo** en `result_json`, y publica
  `hiring.assessment.fairness.adverse_impact_detected` (`src/lib/sync/event-catalog.ts:1233`).
- El gate de la capa aplicación `HIRING_FAIRNESS_MONITOR_ENABLED`
  (`src/lib/hiring/assessment/fairness/config.ts:12-13`, exigido en `get-selection-fairness.ts:40`).
- El boundary test de privacidad (`boundary.test.ts`), el test de estadística (`stats.test.ts`) y el
  live test contra PG que fija el orden exacto de columnas de la VIEW (`fairness.live.test.ts:19-27`).
- `greenhouse_hr.assessment_fairness_evidence` ya declarada en el allowlist de destinos de escritura
  del dominio (`src/lib/hiring/boundary-domain.test.ts:97-98`).

### Gap

- **La VIEW no conoce el eje de desenlace.** No hay ninguna cláusula que mire `decision`, salvo el
  numerador del objetivo `selected` (`:142`). Toda persona con self-ID cuenta en el denominador,
  incluidas las que se retiraron y las que quedaron fuera porque se cerró la búsqueda.
- **La causa no existe todavía** como columna ni como enum: la habilita `TASK-1765`.
- **Tres escaleras y un espejo TS mantenidos a mano**, sin ningún test que los ate. Un literal nuevo
  o retirado se desincroniza sin romper nada.
- **`backup` no está en ninguna escalera** y `backup_selected` no está en ningún numerador.
- **El piso k del numerador no existe** y el filtro TS que lo aparenta es un no-op.
- **El snapshot no lleva versión de esquema**, así que dos filas append-only computadas bajo reglas
  distintas son indistinguibles para siempre.
- **El `POST` que firma evidencia está gateado por una capability de lectura** (`route.ts:44`).
- No hay reader de reliability para el signal de fairness: sólo se publica el evento outbox. Fuera
  de alcance acá, queda como follow-up.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring/assessment/fairness/**` mas la VIEW `greenhouse_hiring.assessment_fairness` creada por migracion en `migrations/`
- Future candidate home: `remain-shared`
- Boundary: el reader canonico `getSelectionFairness` y el command `persistFairnessEvidence` son la unica puerta; los consumers autorizados son la ruta `src/app/api/hiring/assessments/fairness/route.ts` y la futura superficie de `TASK-1766`. Ningun consumer consulta `assessment_fairness` ni `hiring_demographic_selfid` por su cuenta
- Server/browser split: `contracts.ts` queda browser-safe (tipos y constantes, sin imports de servidor); reader, stats-snapshot, evidencia y acceso a PostgreSQL quedan `server-only`, tal como hoy
- Build impact: `none`
- Extraction blocker: la evidencia se escribe con `withGreenhousePostgresTransaction` junto al `publishOutboxEvent` del signal, asi que el command exige la misma transaccion PostgreSQL y el mismo pool que el outbox

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: VIEW `greenhouse_hiring.assessment_fairness`; tabla append-only
  `greenhouse_hr.assessment_fairness_evidence`; contratos de
  `src/lib/hiring/assessment/fairness/**`
- Consumidores afectados: `GET`/`POST /api/hiring/assessments/fairness`; la superficie de
  `TASK-1766`; el run de cierre por capacidad de `TASK-1762`
- Runtime target: `local` → `staging` → `production` (Vercel; el gate de la capa aplicación se lee en
  el route handler, no en el `ops-worker`)

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/assessment/fairness/contracts.ts`;
  `migrations/20260713173500000_task-1365-application-scoped-selfid-hardening.sql:71-157`;
  `src/lib/hiring/assessment/fairness/boundary.test.ts`; el orden exacto de columnas de la VIEW que
  fija `fairness.live.test.ts:19-27`
- Contrato nuevo o modificado: escalera única `stage_ladder` con traducción histórica; regla de
  participación en el embudo por desenlace + causa; objetivo reportable nuevo para el desenlace
  favorable; `schemaVersion` y bloque `privacy` extendido en `SelectionFairnessReport`; proyección
  de snapshot redactada; capability de escritura de evidencia
- Backward compatibility: `gated` — el parámetro `stage` del endpoint conserva su nombre y sus
  valores actuales; los objetivos `qualified` y `client_review` **dejan de ser reportables** cuando
  `TASK-1754` retire esos literales del enum, y eso vuelve no reproducibles los snapshots que los
  usaron como alcance. Se declara y se estampa con la versión de esquema; no se disimula
- Full API parity: el reporte y la firma de evidencia ya son reader + command en `src/lib/**`; la
  ruta es adaptador. La capability nueva entra al registry y al catálogo TS en el mismo PR, de modo
  que Nexa y el lane MCP la operan por construcción cuando se expongan

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.assessment_fairness` (reemplazo),
  `greenhouse_hiring.assessment_fairness_ladder_drift` (nueva, agregada y sin dimensión
  demográfica), `greenhouse_hr.assessment_fairness_evidence` (sin cambio de esquema físico; cambia
  el contenido de `scope_json`/`result_json`), `greenhouse_core.capabilities_registry` (seed)
- Invariantes que no se pueden romper:
  - Ningún literal desaparece de la escalera. La escalera es superconjunto del enum vigente **más**
    todos los literales retirados.
  - `ELSE 0` se conserva en las dos ramas de rango; el `COALESCE(..., 0)` que lo reemplace debe
    producir exactamente el mismo valor.
  - La VIEW no expone jamás `application_id`, `identity_profile_id` ni ningún identificador
    individual, y el DTO tampoco.
  - El piso `k = 10` del denominador se conserva en SQL (`HAVING`), no se mueve a TS.
  - `greenhouse_hr.assessment_fairness_evidence` es append-only: cero `UPDATE`, cero `DELETE`.
  - El objetivo `selected` conserva su numerador exacto (`decision = 'selected'`). El desenlace
    favorable ampliado vive en un objetivo distinto.
- Write-target allowlist: sin tabla nueva de escritura. La VIEW companion de drift es de lectura y
  `greenhouse_hr.assessment_fairness_evidence` ya está declarada en
  `src/lib/hiring/boundary-domain.test.ts:97-98`
- Tenant/space boundary: `requireInternalTenantContext` en la ruta; el dominio Hiring es
  single-tenant interno y la VIEW no tiene columna de tenant
- Idempotency/concurrency: el reporte es puro (lectura). La firma de evidencia es intencionalmente
  **no idempotente**: cada `POST` es un acto de firma nuevo, con su `evidence_id` propio. Se
  documenta como decisión, no como omisión
- Audit/outbox/history: la propia tabla append-only es el audit; el signal
  `hiring.assessment.fairness.adverse_impact_detected` se publica dentro de la misma transacción
  (`evidence.ts:39-57`)

### Migration, backfill and rollout

- Migration posture: `view refresh` + `seed`. Forward-fix con `CREATE OR REPLACE VIEW`; **nunca**
  editar `20260713173500000_task-1365-application-scoped-selfid-hardening.sql`, que ya está aplicada
- Default state: `read-only`, y con `HIRING_FAIRNESS_MONITOR_ENABLED` ausente en producción el
  reader responde `409` antes de tocar la VIEW (`config.ts:68-74`). El cambio nace a oscuras en
  producción por construcción
- Backfill plan: **no hay backfill posible ni deseable**. Las filas de evidencia existentes son
  append-only y quedan como historia; se leen como `schemaVersion = 1` por ausencia del campo, y esa
  convención se documenta en el propio contrato
- Rollback path: `CREATE OR REPLACE VIEW` con la definición anterior (copiada verbatim de la
  migración vigente) + revert del PR de TS. La VIEW no guarda estado, así que el rollback es
  completo salvo por las filas de evidencia firmadas mientras tanto, que **no se borran**: se
  supersede con un snapshot nuevo
- External coordination: sign-off de HR/Legal sobre la regla de participación en el embudo (qué
  desenlaces cuentan). Es una decisión de cumplimiento, no de ingeniería

### Security and access

- Auth/access gate: `requireInternalTenantContext` + `can(...)`. `GET` conserva
  `hiring.assessment.fairness_read`; `POST` pasa a la capability de escritura nueva
- Sensitive data posture: PII sensible (categorías demográficas autodeclaradas, Ley 21.719 y AI Act).
  Agregado k-anónimo, cero identificadores, retención vigente en la propia VIEW (`:151`)
- Error contract: `canonicalErrorResponse` + `toHiringErrorResponse`, como hoy. Sin prosa cruda ni
  detalle técnico al cliente
- Abuse/rate-limit posture: superficie interna capability-gated; sin exposición pública. La firma de
  evidencia queda además restringida a un tier de roles más angosto que la lectura

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/hiring/assessment/fairness`, `pnpm lint`, `pnpm typecheck`
- DB/runtime checks: `pnpm pg:connect:shell` para ejercitar la VIEW nueva contra PostgreSQL real
  antes de mergear (SQL embebido con `CASE`/`COALESCE` no se valida con mocks — regla dura del repo,
  ISSUE-071); `fairness.live.test.ts` extendido para cubrir columnas y drift
- Integration checks: `pnpm staging:request /api/hiring/assessments/fairness` con las cohortes
  sintéticas de staging, comparando el reporte antes y después por objetivo
- Reliability signals/logs: `hiring.assessment.fairness.adverse_impact_detected`
  (`src/lib/sync/event-catalog.ts:1233`). No existe reader de reliability para él; queda como
  follow-up explícito
- Production verification sequence: ver `### Production verification sequence`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El snapshot se vuelve versionado y declara su política de privacidad

- `FAIRNESS_SCHEMA_VERSION` en `contracts.ts`, y `schemaVersion` en `SelectionFairnessReport` y
  dentro de `scope`, para que viaje tanto a `result_json` como a `scope_json` sin cambiar el esquema
  físico de la tabla append-only.
- Convención documentada: una fila de evidencia **sin** `schemaVersion` es versión 1.
- Bloque `privacy` extendido con la política efectiva del numerador y el conteo de grupos suprimidos,
  para que el artefacto firmado diga con qué regla se produjo.
- `snapshot.ts` nuevo: proyección redactada del reporte que se persiste. Los conteos van en bandas
  (`0`, `1-9`, `10-19`, …) en lugar de crudos; tasas, ratios, veredicto y alcance se conservan.
  `evidence.ts` deja de serializar el reporte crudo y pasa a serializar esa proyección; la respuesta
  HTTP sigue devolviendo el reporte completo, que es efímero y capability-gated.
- El filtro `eligibleCount >= FAIRNESS_K_ANONYMITY` de `stats.ts:62` se conserva como
  defensa-en-profundidad y **se comenta como no-op**, con la razón exacta (el `HAVING` ya lo
  garantiza y el agregador sólo suma). Un filtro decorativo sin explicación se vuelve a leer como
  protección real la próxima vez.

### Slice 2 — El POST de evidencia deja de estar gateado por una capability de lectura

- Capability nueva `hiring.assessment.fairness_evidence_sign`, acción `execute`, scope `tenant`.
- Seed en `greenhouse_core.capabilities_registry` dentro de la migración de esta task (mismo patrón
  que `migrations/20260713165547000_...:180-191`) **y** entrada en
  `src/config/entitlements-catalog.ts`.
- Grant en `src/lib/entitlements/runtime.ts` en el mismo PR, role-only y **más angosto que la
  lectura**: `EFEONCE_ADMIN` y `HR_MANAGER`. Se propone dejar fuera a `EFEONCE_OPERATIONS`, que hoy
  sí puede leer — firmar evidencia AI-Act es un acto de gobernanza HR/legal. Confirmar con el
  operador antes de cerrar el slice.
- `src/app/api/hiring/assessments/fairness/route.ts:44` pasa a exigir la capability nueva con acción
  `execute`; el `GET` no cambia.

### Slice 3 — Una sola escalera, con memoria histórica, y el drift deja de ser silencioso

- Migración forward-fix con `CREATE OR REPLACE VIEW greenhouse_hiring.assessment_fairness`, que
  reemplaza las tres escaleras por un único CTE `stage_ladder(stage_literal, stage_rank,
  is_reportable_target)`.
- La escalera contiene el vocabulario vigente **más** todos los literales retirados mapeados al rango
  nuevo (`qualified` y `client_review` al rango de `shortlisted`; `selected`, `backup` y
  `handoff_ready` al rango terminal; `sourced`, `rejected`, `withdrawn` y `closed` a 0, que es su
  valor de hoy, ahora declarado en vez de implícito).
- Las dos ramas de rango pasan a resolver por `LEFT JOIN`/lookup contra ese CTE con
  `COALESCE(..., 0)`. **El `ELSE 0` se conserva en valor**; lo que cambia es que deja de estar
  escrito dos veces a mano.
- VIEW companion `greenhouse_hiring.assessment_fairness_ladder_drift`: literales de etapa presentes
  en `hiring_application` o en los payloads de `outbox_events` que **no** están en la escalera, con
  su conteo. Sin join a self-ID, así que no tiene dimensión demográfica ni riesgo de k.
- `ladder-parity.test.ts` nuevo: lee la migración y verifica que `HIRING_APPLICATION_STAGES`
  (`src/types/hiring.ts:109-123`) sea subconjunto de la escalera, que los literales retirados sigan
  presentes, y que `FAIRNESS_REPORTABLE_STAGES` coincida exactamente con los objetivos reportables
  del CTE. Es la dedupe que sí se puede sostener: una lista declarada y una paridad mecánica.

### Slice 4 — `backup_selected` deja de ser invisible por los dos caminos

- El literal `backup` obtiene rango terminal en la escalera, así que una persona elegida como
  respaldo cuenta como avance en todos los objetivos intermedios, que es lo que dice el ADR §4.
- Objetivo reportable nuevo para el desenlace favorable, con numerador
  `decision IN ('selected', 'backup_selected')`, sumado a `stage_targets` y al espejo TS.
- **El objetivo `selected` conserva su numerador exacto** (`decision = 'selected'`). Mezclar reserva
  y selección dentro del objetivo por defecto cambiaría, en silencio, la definición del ratio que ya
  se firma. La visibilidad se gana agregando un objetivo, no redefiniendo el existente.

### Slice 5 — El embudo ramifica por desenlace y por causa

- CTE `funnel_participation` que resuelve, por postulación, si el caso **participa del embudo**:
  - sin decisión (proceso en curso) → participa, como hoy;
  - `selected`, `backup_selected`, `rejected` → participan;
  - `not_selected` + `capacity_filled` → **participa** (el proceso concluyó y hubo comparación);
  - `not_selected` + `opening_closed` o `process_cancelled` → **no participa** (el proceso no
    concluyó);
  - `withdrawn`, `unresponsive` → **no participan** (no son resultado del proceso);
  - `on_hold` legacy → participa, porque es una pausa y no un cierre (ADR §6).
- El filtro se aplica **antes** del `CROSS JOIN stage_targets` y por tanto antes del `HAVING >= 10`,
  de modo que el piso k se calcule sobre la población que realmente se reporta.
- La regla queda escrita **una sola vez**, en la VIEW, y expuesta en el reporte como parte del
  alcance versionado. Ningún consumer la reimplementa.
- Comentario `COMMENT ON VIEW` actualizado con la regla y con el número de esta task.

### Slice 6 — Documentación y triple capa

- Delta en el ADR (§10, fila «Equidad / AI Act») confirmando que la ramificación quedó implementada,
  con su versión de esquema.
- Delta en `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` con la regla de participación
  y la escalera como tabla de traducción.
- Documentación funcional nueva `docs/documentation/hr/monitor-de-equidad-de-seleccion.md`: qué mide
  el monitor, quién cuenta en el embudo y por qué, en lenguaje simple.
- Manual nuevo `docs/manual-de-uso/hr/operar-monitor-de-equidad-de-seleccion.md`: cómo pedir el
  reporte, qué significa cada veredicto, cuándo firmar evidencia y qué **no** hacer (nunca reescribir
  un snapshot; nunca firmar sobre una muestra insuficiente para «dejar constancia»).

## Out of Scope

- **El enum de desenlace y su `CHECK`**: son de `TASK-1765`. Esta task los consume; no los define ni
  los migra.
- **La retención de documentos y el reloj de PII**: es de `TASK-1744`. Incluye H-23 y H-28
  (`backup_selected` y `on_hold` cayendo a `ELSE NULL` en la escalera de retención), que son un
  defecto distinto en otra escalera.
- **La superficie visible del reporte**: es de `TASK-1766`.
- El colapso del enum de etapas y el retiro de los literales (`TASK-1754`).
- El run de cierre por capacidad y su correo (`TASK-1762`/`TASK-1763`).
- El rename físico `decision` → `outcome`: el ADR §11 lo deja explícitamente fuera.
- El reader de reliability para el signal de adverse impact.
- Cambiar el default de la policy de assessment (H-12), que el ADR §11 tampoco autoriza acá.
- Prender `HIRING_FAIRNESS_MONITOR_ENABLED` en producción: exige aviso y consentimiento específico
  para categorías sensibles, que no existen.

## Detailed Spec

### 1. La forma de la VIEW

Estructura objetivo, sobre la definición vigente de
`migrations/20260713173500000_task-1365-application-scoped-selfid-hardening.sql:71-157`:

```sql
CREATE OR REPLACE VIEW greenhouse_hiring.assessment_fairness AS
WITH stage_ladder(stage_literal, stage_rank, is_reportable_target) AS (
  VALUES
    -- Vocabulario vigente (ADR §3).
    ('sourced'::text,          0, FALSE),
    ('screening'::text,        1, TRUE),
    ('shortlisted'::text,      3, TRUE),
    ('interview'::text,        5, TRUE),
    ('decision_pending'::text, 6, TRUE),
    ('closed'::text,           0, FALSE),
    -- TRADUCCIÓN HISTÓRICA (ADR §12). Literales retirados del enum que NUNCA se borran de acá:
    -- los payloads de outbox_events son inmutables y son la única memoria del avance de un
    -- rechazado dentro de esta VIEW.
    ('qualified'::text,        3, FALSE),
    ('client_review'::text,    3, FALSE),
    ('selected'::text,         7, FALSE),
    ('backup'::text,           7, FALSE),
    ('handoff_ready'::text,    7, FALSE),
    ('rejected'::text,         0, FALSE),
    ('withdrawn'::text,        0, FALSE)
),
stage_targets(stage, stage_rank) AS (
  SELECT stage_literal, stage_rank FROM stage_ladder WHERE is_reportable_target
  UNION ALL
  VALUES ('selected'::text, 7), ('favorable_outcome'::text, 7)
),
```

Notas que el implementador no debe re-decidir:

- **`client_review` baja de rango 4 a 3 y el cambio es numéricamente inerte**: tras el colapso ningún
  objetivo reportable tiene rango 4, y una persona con rango 4 ya contaba como avance para los
  objetivos 1 y 3. Se declara igual porque el rango es un contrato, no un detalle.
- **`selected` y `favorable_outcome` no son etapas**: son objetivos. La columna de la VIEW sigue
  llamándose `stage` por compatibilidad con `fairness.live.test.ts:19-27` y con el parámetro del
  endpoint; el concepto correcto es «objetivo» y así se nombra en la documentación.
- Las dos ramas de rango consultan la misma escalera:

```sql
event_progress AS (
  SELECT e.aggregate_id AS application_id,
         MAX(COALESCE(ladder.stage_rank, 0)) AS max_stage_rank
  FROM greenhouse_sync.outbox_events e
  LEFT JOIN stage_ladder ladder ON ladder.stage_literal = e.payload_json->>'stage'
  WHERE e.aggregate_type = 'hiring_application'
    AND e.event_type IN (
      'hiring.application.created',
      'hiring.application.stage_changed',
      'hiring.application.decided'
    )
  GROUP BY e.aggregate_id
),
```

  El `WHEN e.event_type = 'hiring.application.decided' AND payload->>'decision' = 'selected' THEN 7`
  del original (`:85-86`) **se conserva** como rama previa al lookup: el evento de decisión no lleva
  `stage` (`src/lib/hiring/decide.ts:270-287`), así que sin esa rama el `decided` de una selección
  aportaría 0. Extenderla a `backup_selected` es parte del Slice 4.

- La participación en el embudo (Slice 5), como CTE propio y aplicada antes del `CROSS JOIN`:

```sql
funnel_participation AS (
  SELECT app.application_id,
         CASE
           WHEN app.decision IS NULL THEN TRUE            -- en curso
           WHEN app.decision IN ('selected', 'backup_selected', 'rejected') THEN TRUE
           WHEN app.decision = 'on_hold' THEN TRUE        -- pausa, no cierre (ADR §6)
           WHEN app.decision = 'not_selected'
             AND app.decision_cause = 'capacity_filled' THEN TRUE
           ELSE FALSE                                     -- opening_closed, process_cancelled,
         END AS counts_in_funnel                          -- withdrawn, unresponsive
  FROM greenhouse_hiring.hiring_application app
)
```

  El nombre físico `decision_cause` es el asumido; confirmarlo contra la migración real de
  `TASK-1765` antes de escribir el SQL (`[verificar]`). El `ELSE FALSE` es deliberado y **no** es un
  default silencioso: cualquier desenlace desconocido queda fuera del embudo, que es el lado
  conservador —no firma un ratio sobre casos que el sistema no sabe clasificar— y aparece de
  inmediato en la VIEW de drift.

### 2. El numerador

```sql
COUNT(DISTINCT progress.application_id) FILTER (
  WHERE CASE
    WHEN target.stage = 'selected' THEN progress.decision = 'selected'
    WHEN target.stage = 'favorable_outcome'
      THEN progress.decision IN ('selected', 'backup_selected')
    ELSE progress.max_stage_rank >= target.stage_rank
  END
)::integer AS advanced_count
```

La primera rama es **verbatim** la vigente (`:142`). No se toca: es la que sostiene el reporte por
defecto, y cambiarla movería el ratio que ya se firma.

### 3. La VIEW de drift

```sql
CREATE OR REPLACE VIEW greenhouse_hiring.assessment_fairness_ladder_drift AS
SELECT 'current_state'::text AS source, app.stage AS stage_literal, COUNT(*)::integer AS application_count
  FROM greenhouse_hiring.hiring_application app
 WHERE app.stage NOT IN (SELECT stage_literal FROM ...)
 GROUP BY app.stage
UNION ALL
SELECT 'event_payload'::text, e.payload_json->>'stage', COUNT(*)::integer
  FROM greenhouse_sync.outbox_events e
 WHERE e.aggregate_type = 'hiring_application'
   AND e.payload_json->>'stage' IS NOT NULL
   AND e.payload_json->>'stage' NOT IN (SELECT stage_literal FROM ...)
 GROUP BY 2;
```

Sin join a self-ID: no tiene dimensión demográfica y por lo tanto no necesita piso k. Su único
trabajo es que un literal desconocido deje de disolverse en un 0.

### 4. Cambios de contrato TS

- `contracts.ts`: `FAIRNESS_SCHEMA_VERSION`; `FAIRNESS_REPORTABLE_STAGES` extendido con el objetivo
  favorable; `SelectionFairnessReport.schemaVersion`; `scope.schemaVersion`;
  `privacy.numeratorPolicy` y `privacy.suppressedGroups`.
- `get-selection-fairness.ts`: sin cambio estructural. Conserva `input.stage ?? 'selected'` (`:42`)
  —el default **no** se mueve al objetivo favorable, porque eso cambiaría en silencio qué reporte se
  firma por defecto— y conserva la validación contra la lista (`:44-46`).
- `stats.ts`: comentario del no-op en `:62`; `privacy` poblado con la política vigente; sin cambio en
  el cálculo de tasas ni de referencia.
- `snapshot.ts` (nuevo): `toFairnessEvidenceSnapshot(report)` con conteos en bandas.
- `evidence.ts`: `result_json` pasa a guardar el snapshot redactado en vez del reporte crudo; el
  payload del outbox suma `schemaVersion`.

## Rollout Plan & Risk Matrix

Esta task toca evidencia de cumplimiento AI-Act append-only y datos personales sensibles. La sección
es load-bearing.

**El hecho que baja el riesgo real y hay que tener presente:** `HIRING_FAIRNESS_MONITOR_ENABLED`
está **ausente en producción** y ON sólo en staging con cohortes sintéticas
(`docs/operations/FEATURE_FLAG_STATE_LEDGER.md:138`). Con el flag apagado, `requireHiringFairnessPolicy`
lanza `409` antes de consultar la VIEW (`config.ts:68-74`), así que en producción hoy no hay reportes
ni firmas. Todo el cambio se ejercita en staging contra datos sintéticos, y producción queda a
oscuras por construcción. **Eso no autoriza a saltarse la verificación**: la VIEW se reemplaza en la
base compartida, y el reemplazo debe ser correcto aunque nadie lo lea todavía.

### Slice ordering hard rule

- **Slice 1 (snapshot versionado) DEBE shippear ANTES que 3, 4 y 5.** Es el orden que no se puede
  invertir: si la semántica del bucket cambia antes de que el snapshot lleve versión, las filas
  firmadas con la regla vieja y con la nueva quedan indistinguibles **para siempre**, porque la tabla
  es append-only y no admite anotarlas después.
- Slice 2 (capability) es independiente y puede correr en paralelo con 1; debe cerrar antes de que
  alguien firme evidencia bajo la regla nueva.
- Slice 3 (escalera única) va antes que 4 (que agrega un literal a esa escalera) y antes que 5 (que
  agrega un CTE al mismo `CREATE OR REPLACE`).
- **Slice 5 está bloqueado por `TASK-1765`**: sin el enum de desenlace y la columna de causa, el CTE
  de participación no compila. Los slices 1 a 4 no dependen de esa task y pueden avanzar antes.
- Slice 6 (documentación) cierra al final, con la versión de esquema ya fijada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un bucket mal ramificado firma un ratio 4/5 falso en una tabla que no se puede reescribir | migration / AI Act evidence | medium | Slice 1 primero (versión de esquema); sign-off HR/Legal de la regla de participación; staging sintético con reporte antes/después por objetivo; producción con el flag apagado | comparación explícita del reporte pre y post en staging; ninguna fila de evidencia firmada en producción durante el rollout |
| Retirar un literal de la escalera borra la memoria histórica del avance de un rechazado | migration / fairness view | medium | La escalera es superconjunto: vigentes + retirados; `ladder-parity.test.ts` falla si falta uno; regla dura escrita en el ADR §12 y en la propia migración | test de paridad en CI; `assessment_fairness_ladder_drift` con filas cuando aparece un literal fuera de la escalera |
| Excluir del denominador cambia qué cohortes se exponen: un grupo cae bajo `k = 10` y la dimensión degrada a `insufficient_sample` sin que nadie lo note | fairness view / privacidad | high | El filtro se aplica antes del `HAVING`, así que la degradación es honesta y no un número inflado; el reporte declara `suppressedGroups`; comparación antes/después obligatoria en staging | veredicto que pasa de `monitoring` a `insufficient_sample` entre dos corridas con la misma ventana |
| Excluir gente del denominador mueve el ratio y puede invertir el veredicto | fairness view / AI Act | medium | Es el efecto buscado, pero debe ser declarado: sign-off HR/Legal + snapshot versionado que permita comparar reglas | `impactRatioDrift` grande entre el último snapshot v1 y el primero v2 |
| Suprimir un grupo cambia la referencia (`Math.max`, `stats.ts:67`) y con ella todos los ratios de esa dimensión | fairness stats | medium | Slice 1 no suprime grupos del reporte vivo; sólo redacta el artefacto persistido. La supresión real queda como Open Question con su trade-off escrito | `referenceCategoryKey` distinto entre dos corridas de la misma ventana |
| `CREATE OR REPLACE VIEW` falla o cambia el orden/nombre/tipo de columnas | migration | medium | PostgreSQL rechaza el reemplazo si el prefijo de columnas cambia; `fairness.live.test.ts:19-27` fija el orden exacto y debe seguir verde | error de migración inmediato; live test rojo |
| SQL con `CASE`/`COALESCE` y uniones de tipos que revienta sólo en runtime | migration / reader | medium | Ejercitar la VIEW contra PostgreSQL real vía `pnpm pg:connect:shell` antes de mergear; regla dura del repo (ISSUE-071): los mocks Vitest ejercitan el TS, no el SQL | `500` en el reader con `degraded`/catch; `captureWithDomain` en Sentry |
| Capability nueva sin grant deja el `POST` inalcanzable, o el gate de cobertura rojo | entitlements / CI | low | Registry + catálogo TS + grant a `EFEONCE_ADMIN` y `HR_MANAGER` en el mismo PR | `src/lib/entitlements/capability-grant-coverage.test.ts` rojo |
| Alguien prende `HIRING_FAIRNESS_MONITOR_ENABLED` en producción a mitad del rollout | producción / privacidad | low | El flag sigue bloqueado por su propia razón (falta aviso y consentimiento específicos), documentada en el ledger; esta task no lo prende ni lo pide | fila del ledger; `vercel env ls` como verdad live |

### Feature flags / cutover

**Sin flag nuevo.** El gate vigente `HIRING_FAIRNESS_MONITOR_ENABLED` ya provee el cutover: ausente
en producción, ON en staging con cohortes sintéticas. Agregar un flag propio para esta task
duplicaría el interruptor sin agregar control real, y crearía una fila más en el ledger para algo
que ya está apagado por una razón mejor (falta de base legal en producción).

El flag se lee en `src/lib/hiring/assessment/fairness/config.ts:12-13`, consumido desde el reader que
corre en el route handler de Vercel. Antes de cualquier cambio de estado del flag, mapear dónde se lee
(`grep -rn "HIRING_FAIRNESS_MONITOR_ENABLED" src/ services/`) y aplicarlo en todos los runtimes que
aparezcan; hoy no hay lectura en `services/`, pero la verificación es obligatoria igual.

El corte semántico real lo marca `FAIRNESS_SCHEMA_VERSION`, no un flag: un snapshot dice bajo qué
regla se firmó, y esa es la única marca que sobrevive a la tabla append-only.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — snapshot versionado | Revert del PR. Las filas ya firmadas con `schemaVersion` conservan el campo y siguen siendo legibles; ninguna se borra | <15 min | parcial — el código revierte, las filas firmadas no |
| Slice 2 — capability de escritura | Revert del PR + `UPDATE greenhouse_core.capabilities_registry SET deprecated_at = NOW()` sobre la capability nueva. El `POST` vuelve al gate anterior | <15 min | sí |
| Slice 3 — escalera única | `CREATE OR REPLACE VIEW` con la definición verbatim de `migrations/20260713173500000_...:71-157` + revert del PR. La VIEW no guarda estado | <15 min | sí |
| Slice 4 — objetivo favorable | Incluido en el rollback de la VIEW; el espejo TS vuelve con el revert | <15 min | sí |
| Slice 5 — participación por desenlace y causa | Igual que Slice 3: reemplazo de la VIEW por la definición anterior. **No reversible** para las filas de evidencia firmadas mientras la regla estuvo activa: se supersede con un snapshot nuevo, nunca se reescriben | <15 min | parcial |
| Slice 6 — documentación | Revert del PR | <5 min | sí |

### Production verification sequence

1. Correr la migración en local contra el proxy (`pnpm pg:connect:migrate`) y ejercitar la VIEW con
   `pnpm pg:connect:shell`: `SELECT * FROM greenhouse_hiring.assessment_fairness LIMIT 5;` y
   `SELECT * FROM greenhouse_hiring.assessment_fairness_ladder_drift;`. **Stop si el drift devuelve
   filas**: hay un literal fuera de la escalera y hay que agregarlo antes de seguir.
2. `pnpm vitest run src/lib/hiring/assessment/fairness` + `pnpm lint` + `pnpm typecheck` verdes,
   incluido el boundary test de privacidad y el nuevo test de paridad de escalera.
3. En staging, con el flag ya ON y las cohortes sintéticas: capturar el reporte **antes** del deploy
   para cada objetivo reportable (`pnpm staging:request /api/hiring/assessments/fairness?stage=...`)
   y guardarlo como línea base.
4. Deploy a staging. Repetir la captura para cada objetivo y **comparar objetivo por objetivo**:
   `eligibleCount`, `advancedCount`, `verdict`, `referenceCategoryKey`. Toda diferencia debe quedar
   explicada por una regla declarada en esta task. Diferencia inexplicada = stop & escalate.
5. Verificar que el `POST` responde `403` para un rol que sólo tiene lectura y `201` para el tier
   autorizado, y que la fila resultante trae `schemaVersion` en `scope_json` y bandas en
   `result_json`.
6. Ejercitar el camino del desenlace: crear en staging una postulación sintética por cada desenlace y
   causa, y comprobar que la participación en el embudo coincide con la tabla del ADR §4.
7. Producción: aplicar la migración y confirmar que el reader sigue respondiendo `409` por flag
   apagado. **No prender el flag.** No hay verificación de reporte en producción porque no hay
   reporte en producción, y decirlo es parte del cierre.
8. Confirmar que `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` sigue reflejando el estado real del
   flag y su bloqueador.

### Out-of-band coordination required

- **Sign-off de HR/Legal sobre la regla de participación en el embudo.** Qué desenlaces cuentan es
  una decisión de cumplimiento con consecuencia sobre un artefacto firmado; el ADR la fija y esta
  task la implementa, pero el sign-off queda registrado antes del Slice 5.
- **Confirmación del operador sobre el tier de roles de la capability de firma** (dejar fuera a
  `EFEONCE_OPERATIONS`, que hoy sí puede leer).
- **Confirmación del nombre físico de la columna de causa** contra la migración de `TASK-1765`.
- Nada de Azure, GCP, HubSpot, Notion ni proveedores externos: el cambio es repo + base de datos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La VIEW resuelve el rango con **una sola** escalera declarada; no quedan dos `CASE` de etapa
      escritos a mano.
- [ ] La escalera contiene todos los literales de `HIRING_APPLICATION_STAGES` **más** los retirados
      (`qualified`, `client_review`, `selected`, `backup`, `handoff_ready`, `rejected`, `withdrawn`),
      y un test lo verifica leyendo la migración.
- [ ] `FAIRNESS_REPORTABLE_STAGES` coincide exactamente con los objetivos reportables del CTE, con
      test de paridad en CI.
- [ ] Ninguna rama de rango usa `ELSE NULL`; el valor por defecto sigue siendo `0`.
- [ ] `not_selected + capacity_filled` participa del embudo; `not_selected + opening_closed`,
      `not_selected + process_cancelled`, `withdrawn` y `unresponsive` no participan; hay un test por
      cada combinación.
- [ ] Una persona con desenlace `backup_selected` cuenta como avance en los objetivos intermedios y
      aparece en el objetivo favorable nuevo.
- [ ] El objetivo `selected` conserva su numerador exacto `decision = 'selected'`, verificado por
      test.
- [ ] Todo reporte lleva `schemaVersion`, y `scope_json` y `result_json` de la fila de evidencia lo
      contienen.
- [ ] `result_json` no contiene conteos crudos: los conteos van en bandas, y hay un test que lo
      afirma.
- [ ] El filtro k de `stats.ts:62` queda comentado como defensa-en-profundidad no-op, con la razón.
- [ ] El `POST` de evidencia exige `hiring.assessment.fairness_evidence_sign` con acción `execute`;
      la capability está en el registry, en el catálogo TS y granteada a ≥1 rol real en el mismo PR.
- [ ] `greenhouse_hiring.assessment_fairness_ladder_drift` existe, devuelve cero filas en local y en
      staging, y no hace join con self-ID.
- [ ] La VIEW se ejercitó contra PostgreSQL real, no sólo contra mocks.
- [ ] La comparación antes/después en staging está registrada objetivo por objetivo, con cada
      diferencia explicada por una regla declarada acá.
- [ ] `docs/documentation/hr/` y `docs/manual-de-uso/hr/` tienen su capa correspondiente.
- [ ] No se editó ninguna migración ya aplicada.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/hiring/assessment/fairness`
- `pnpm vitest run src/lib/entitlements/capability-grant-coverage.test.ts`
- `pnpm vitest run src/lib/hiring/boundary-domain.test.ts`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm pg:connect:shell` — ejercicio real de la VIEW y de la VIEW de drift
- `pnpm staging:request /api/hiring/assessments/fairness` por cada objetivo reportable, antes y
  después
- `pnpm task:lint --task TASK-1767` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1762` quedó con su Delta: la cohorte que cierra por capacidad ya entra al embudo bajo la
      regla declarada, y su spec lo dice.
- [ ] `TASK-1754` quedó con su Delta: retirar `qualified` y `client_review` del enum ya no borra la
      memoria histórica de la VIEW.
- [ ] El ADR quedó con la fila §10 de «Equidad / AI Act» confirmada como implementada, con la versión
      de esquema.

## Follow-ups

- Reader de reliability para `hiring.assessment.fairness.adverse_impact_detected`: hoy el signal se
  publica al outbox pero ningún dashboard lo lee.
- H-29: `hiring.application.decided` no lleva `stage` en el payload
  (`src/lib/hiring/decide.ts:270-287`). Mientras siga así, la memoria histórica del avance depende
  por completo de `stage_changed`, y la rama especial del `decided` en la escalera es un parche
  necesario. Corregir el payload es trabajo de otra task.
- El sustrato de la traducción histórica es purgable: el propio repo declara los payloads de
  `outbox_events` como fuente no confiable para decidir etapa y con retención borrable a futuro
  (`src/lib/hiring/assessment/assignment-policy/readers.ts:212-216`). Si esa purga llega, la escalera
  histórica queda anclada a nada y hace falta un rastro durable propio.
- Supresión real de grupos con numerador bajo el piso k (ver Open Questions).

## Open Questions

- **¿Se suprimen los grupos con `0 < advancedCount < 10` del reporte vivo, y no sólo del snapshot?**
  El trade-off es duro y no lo decide ingeniería: suprimirlos ciega al monitor justo en cohortes
  chicas, que es donde más probable es el impacto adverso; no suprimirlos deja el conteo exacto
  visible para quien ya puede leer la tabla fila-por-individuo. `advancedCount = 0` **no** debe
  suprimirse en ningún escenario: es la señal más adversa y no revela a nadie.
- **¿`decision_cause` es el nombre físico definitivo?** Lo fija `TASK-1765`. Si cambia, cambia el CTE
  de participación.
- **¿El objetivo favorable entra al reporte por defecto en algún momento?** Esta task deja el default
  en `selected` a propósito. Moverlo es una decisión de cumplimiento, con su propia versión de
  esquema.
- **¿`on_hold` sigue participando del embudo tras el colapso?** El ADR §6 lo retira como desenlace,
  pero la columna física lo admite hoy. Mientras exista, esta task lo trata como pausa; cuando
  desaparezca, el CTE pierde esa rama.
