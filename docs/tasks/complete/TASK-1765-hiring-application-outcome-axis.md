# TASK-1765 — El eje de desenlace del pipeline de Hiring: enum, causa gobernada, invariante de cierre y command

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `rollout COMPLETO 2026-08-23: Slice 4 (contract del enum, seis desenlaces) y Slice 5 (CHECK del invariante, readback 1 → 0) aplicados contra la instancia compartida`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializa el segundo eje del pipeline de Hiring: **cómo terminó el recorrido de una persona**. El enum de
desenlace pasa a seis valores (entran `not_selected` y `unresponsive`, sale `on_hold`), nace la **causa
gobernada** obligatoria en `not_selected`, y el invariante **`stage='closed'` ⟺ desenlace declarado** deja de ser
disciplina y pasa a `CHECK` de base. Cerrar deja de ser un cambio de etapa: pasa siempre por el command de
decisión, y el `PATCH` de etapa pierde `closed` **por tipo**, no por una lista de excepciones más larga.

## Delta 2026-08-22 — el trigger de retención sólo cubre 3 de tus 6 desenlaces

Hallazgo de la sesión de `TASK-1754`, **verificado verbatim** contra
`migrations/20260819072130586_task-1746-assessment-access-recovery.sql:886`.

`greenhouse_hiring.refresh_assessment_access_recovery_retention_for_application()` decide la retención
de `hiring_assessment_access_recovery` con dos listas:

```sql
retention_class      ← 'workforce_record'  WHEN NEW.stage='selected' OR NEW.decision='selected'
retention_expires_at ← decision_at + 12mo  WHEN NEW.stage IN ('rejected','withdrawn')
                                              OR NEW.decision IN ('rejected','withdrawn')
                       ELSE NULL
```

Tus seis desenlaces contra ese trigger:

| Desenlace | `retention_class` | `retention_expires_at` |
|---|---|---|
| `selected` | `workforce_record` ✅ | `NULL` (correcto: no vence) |
| `rejected` | `hiring_candidate_recovery` ✅ | +12 meses ✅ |
| `withdrawn` | `hiring_candidate_recovery` ✅ | +12 meses ✅ |
| **`backup_selected`** | ELSE → candidate ⚠️ | **`NULL` — sin vencimiento** |
| **`not_selected`** | ELSE → candidate ⚠️ | **`NULL` — sin vencimiento** |
| **`unresponsive`** | ELSE → candidate ⚠️ | **`NULL` — sin vencimiento** |

**No es que el reloj arranque tarde: la rama `ELSE` pone `NULL`, o sea que no arranca nunca.** Y
`not_selected` es, por el §4 del propio ADR, **la población más grande** — la gente que llegó al final y
no quedó. Es la misma familia del **H-01** de la auditoría: una obligación de la Ley 21.719 congelada sin
que nadie se entere, y el mismo patrón de denylist por literales que esta task vino a borrar.

**Se agrava con el Slice F de `TASK-1754`:** al retirar `selected`/`rejected`/`withdrawn` del enum de
etapas, las ramas `NEW.stage = ...` mueren y **sólo quedan las de `decision`** — las que cubren 3 de 6.

**Hoy no muerde** porque la tabla estaría en 0 filas según la sesión que lo encontró; **no se re-midió
contra PostgreSQL**. Verificar antes de dimensionar.

*Dueño: esta task, porque los tres desenlaces sin cubrir son los que ella crea. Coordinar con `TASK-1744`,
que posee la retención de documentos y ya tiene un Delta de cobertura de desenlaces (H-23).*

## Why This Task Exists

Hoy `hiring_application` tiene un eje y medio. `stage` acumula posiciones del recorrido, espejos del desenlace y
un estado ajeno (`handoff_ready`), y la columna «Cerrado» del tablero escribe `closed` **sin decisión**: el guard
del `PATCH` bloquea cuatro literales por denylist (`src/lib/hiring/store.ts:1311`) y deja pasar nueve, `closed`
entre ellos. Arrastrar ahí una tarjeta no emite `hiring.application.decided`, no manda correo, mata el acceso al
test y **congela la retención de PII de la persona entera**: el `NOT EXISTS` de `src/lib/hiring/documents/retention.ts:90-94`
es por `identity_profile_id`, así que una sola fila `closed` sin decisión bloquea el borrado de los documentos de
esa persona en **todas** sus demás postulaciones (H-01/H-02 de la auditoría).

Y el vocabulario de desenlace no alcanza para lo que el negocio ya necesita. Los cinco valores de
`src/types/hiring.ts:126` obligan a mentir dos veces: a quien llegó al final y no quedó porque el cupo lo tomó
otra persona hay que marcarla `rejected` —un juicio sobre ella que nadie emitió, que la saca del Talent Pool por
defecto y que infla la tasa de rechazo de su cohorte demográfica en el análisis de impacto adverso—; y a quien
dejó de responder hay que inventarle un retiro (`withdrawn`) o un juicio (`rejected`). Las dos son atribución
falsa. Al mismo tiempo `on_hold` vive como desenlace *y* mapea a la etapa `decision_pending`
(`src/lib/hiring/decide.ts:32`): una pausa registrada como cierre.

Sin este eje, `TASK-1762` no puede cerrar una cohorte por capacidad sin marcar 33 personas como rechazadas,
`TASK-1748` no tiene dónde archivar sin escribir `closed`, y `TASK-1744` no puede barrer retención sobre un
detector que se congela solo.

## Goal

- Dejar el desenlace con seis valores reales y una causa gobernada, de modo que ninguna persona quede etiquetada
  con el estado de la vacante ni con una conducta que no declaró.
- Hacer **irrepresentable** un `stage='closed'` sin desenlace, con `CHECK` de base y no con disciplina de capa.
- Convertir el cierre en un command: `decideHiringApplication` recibe desenlace y causa; el `PATCH` de etapa deja
  de poder escribir `closed` estructuralmente, con error canónico que nombra el camino correcto.
- Entregar el campo de archivado que `TASK-1748` necesita para dejar de usar `closed` como basurero.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` — **el ADR que esta task implementa**. Leer completo antes del primer slice; §4 (los seis desenlaces), §4.1 (la causa), §5 (el invariante), §6 (lo que se retira), §11 (lo que el ADR NO autoriza) y §12 (reglas duras) son normativos.
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **NUNCA** un `stage='closed'` sin desenlace declarado. El `CHECK` es la única garantía que no depende de que
  alguien se acuerde (ADR §12).
- **NUNCA** etiquetar a una persona con el estado de la vacante: la vacante entra como **causa** de `not_selected`,
  jamás como desenlace.
- **NUNCA** usar `rejected` para un cierre donde no hubo juicio sobre la persona — ni por capacidad, ni por
  cancelación, ni por silencio.
- **NUNCA** atribuirle a la persona una conducta que no declaró: quien deja de responder es `unresponsive`,
  no `withdrawn`.
- **NUNCA** dejar la causa como texto libre. Ramifica el embudo de equidad y el cuerpo del correo: es enum gobernado.
- **NUNCA** ampliar la denylist de `src/lib/hiring/store.ts:1311` como sustituto del `CHECK`. Esa lista es
  justamente por donde se colaron `closed` y `handoff_ready`; agregar un sexto nombre repite el defecto con más
  letras. El `PATCH` deja de aceptar `closed` **por tipo**.
- **NUNCA** archivar un registro escribiendo `closed`. Archivar es un eje aparte (ADR §5).
- **NUNCA** retirar un literal del enum mientras una policy, una `CHECK`, una escalera de la VIEW de equidad o una
  fila de ledger lo nombre: `assertEnum` corre en el camino de **LECTURA**
  (`src/lib/hiring/assessment/assignment-policy/store.ts:106-109` y `assignment-store.ts:82`) y produce `500` al
  releer una fila histórica, que además es irreescribible por diseño (H-05).
- **NUNCA** retirar literales de las escaleras de rango de la VIEW de equidad
  — la definición VIVA es `migrations/20260713173500000_task-1365-application-scoped-selfid-hardening.sql:71+`
  (**corregido 2026-08-22**: esta spec citaba `20260713165547000_*`, que es la copia SUPERSEDED; apuntar un
  «NUNCA modificar» al archivo muerto es peor que no tenerlo, porque da sensación de protección
  mientras alguien edita la copia viva sin fricción). Son tabla de
  traducción histórica de payloads inmutables, no espejo del vocabulario vigente.
- **SIEMPRE** expand antes que contract, y readback contra PG real antes y después de cada migración.

## Normative Docs

- `docs/audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md` — 30 hallazgos con verificación
  adversarial. H-01, H-02, H-05, H-08, H-15 y H-23 son precondiciones duras de esta task.
- `docs/tasks/in-progress/TASK-1754-hiring-stage-vocabulary-collapse.md` — dueña del enum de **etapas**.
- `docs/tasks/to-do/TASK-1748-hiring-data-origin-followups.md` — dueña de la migración de las 32 filas sintéticas.
- `docs/tasks/to-do/TASK-1744-candidate-document-retention-purge.md` — consumidora del invariante.
- `docs/tasks/to-do/TASK-1762-hiring-opening-capacity-closure-foundation.md` — primera consumidora del par
  `not_selected` + `capacity_filled`.
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- `greenhouse_hiring.hiring_application` y su DDL vigente
  (`migrations/20260707235655376_task-353-hiring-ats-domain-foundation.sql:144-185`): el `CHECK` de `stage`
  (`:152-155`), el `CHECK` de `decision` (`:168-169`) y la ausencia total de campo de archivado.
- `src/lib/hiring/decide.ts` — command de decisión con lock, idempotency key e historia append-only.
- `src/lib/hiring/store.ts` — `updateHiringApplicationStage` (`:1302-1358`) y su guard por denylist (`:1311`).
- `src/app/api/hiring/applications/[id]/route.ts` (`PATCH`, `:44-77`) y
  `src/app/api/hiring/applications/[id]/decide/route.ts` (`POST`, `:16-43`).
- Capability `hiring.application.decide` ya registrada (`src/config/entitlements-catalog.ts:2215`) y granteada
  (`src/lib/entitlements/runtime.ts:603`). Esta task **no** crea capability nueva.

### Blocks / Impacts

- **Bloquea `TASK-1748`**: su Slice 2 escribe el campo de archivado que esta task crea. La relación es circular
  por diseño y se resuelve en tres pasos — ver `Slice ordering hard rule`.
- **Bloquea `TASK-1744`**: sus Slices 1 y 2 ramifican por `not_selected` y `unresponsive`, y el barrido de
  retención no puede correr sobre un detector que un `closed` sin desenlace congela.
- **Desbloquea el Slice F de `TASK-1754`** (contract del enum de etapas): retirar `selected|backup|rejected|withdrawn`
  de `stage` sólo es seguro cuando el desenlace ya los posee y el `CHECK` existe (ADR §14, paso 2).
- **Habilita `TASK-1762`**: su Slice 3 consume `decideHiringApplication` pasando desenlace **y** causa.
- Impacta `TASK-1766` (chip de desenlace y diálogo de cierre del kanban) y `TASK-1767` (embudo de equidad por
  desenlace + causa), que consumen este contrato sin re-implementarlo.
- Impacta el comentario de doctrina de `src/lib/hiring/handoff/materialize.ts:8` y `:338`, que enumera los
  desenlaces que revocan un handoff. La rama real es `decision !== 'selected'` (`:157`), así que los dos
  desenlaces nuevos caen a revocación **por construcción**: cambia la documentación, no el comportamiento.

### Files owned

- `src/types/hiring.ts` — **`HIRING_DECISIONS` (`:126`) únicamente**, más los tipos nuevos de causa e input de
  decisión. `HIRING_APPLICATION_STAGES` (`:109`) es de `TASK-1754` y esta task **no lo toca**.
- `src/lib/hiring/decide.ts` — command completo (`DECISION_STAGE` `:27-33`, `assertDecision` `:72-78`,
  `DecideHiringApplicationInput`). `TASK-1762` lo declara *«sólo en la causa allowlisted»*: esta task es dueña de
  la forma del command; 1762 sólo agrega su caso de uso.
- `src/lib/hiring/store.ts` — `updateHiringApplicationStage` y su guard (`:1302-1358`), más el `normalize` del
  campo de causa.
- `src/app/api/hiring/applications/[id]/route.ts` y `src/app/api/hiring/applications/[id]/decide/route.ts`.
- `src/lib/hiring/notifications/send.ts` — **sólo el selector de `EmailType` de `:358`** (el ternario binario que
  colapsa todo lo no-seleccionado en `hiring_decision_rejected`). **NO** se declara `src/lib/hiring/notifications/**`:
  ese glob lo disputan `TASK-1719`, `TASK-1721`, `TASK-1746`, `TASK-1757` y `TASK-1762`.
- `src/views/greenhouse/hiring/Application360View.tsx` — **sólo la entrada `on_hold` del arreglo de opciones de
  decisión (`:104`) y sus dos referencias de tono/etiqueta (`:1708`, `:1761`)**. El archivo lo trabaja
  `TASK-1747` (pestaña de Evaluación): coordinar antes de tocar, es una supresión de tres puntos, no un rediseño.
- `migrations/<timestamp>_task-1765-hiring-outcome-axis-expand.sql` y
  `migrations/<timestamp>_task-1765-hiring-outcome-axis-closed-invariant.sql`. Sufijo propio `*task-1765*hiring*outcome*`
  para no colisionar con los globs anchos `migrations/**` de `EPIC-038` (`TASK-1603`, `TASK-1604`, `TASK-1605`).
- `src/lib/reliability/queries/hiring-application-outcome-signals.ts` *(nuevo)* y su fila en
  `src/lib/reliability/registry.ts` (módulo `hiring`, `:555-594`).
- `docs/documentation/hr/`, `docs/manual-de-uso/hr/` y el delta del ADR.

**Explícitamente NO owned** — declararlos sería invadir a otra task: `HIRING_APPLICATION_STAGES` y el mapa de
nombres visibles de etapa (`TASK-1754`); `src/lib/hiring/data-origin/purge.ts` y la migración de las 32 filas
(`TASK-1748`); `src/lib/hiring/documents/retention.ts` (`TASK-1744`); el chip de desenlace, el diálogo de cierre
del kanban y `PipelineDeskView.tsx` (`TASK-1766`); la VIEW de equidad (`TASK-1767`); el `EmailType`
`hiring_decision_not_selected` y su seed (`TASK-1762`).

## Current Repo State

### Already exists

- El command de decisión completo: lock `FOR UPDATE`, idempotency key con detección de replay, historia
  append-only en `explainability_json.decisionHistory[]`, snapshot de assessment y evento
  `hiring.application.decided` (`src/lib/hiring/decide.ts:115-293`).
- El enum de cinco desenlaces en TS (`src/types/hiring.ts:126`) y su `CHECK` espejo en DB
  (`migrations/20260707235655376_task-353-hiring-ats-domain-foundation.sql:168-169`).
- `DECISION_STAGE` (`src/lib/hiring/decide.ts:27-33`), que hoy escribe una etapa **espejo** por desenlace:
  `selected→selected`, `backup_selected→backup`, `rejected→rejected`, `withdrawn→withdrawn`,
  `on_hold→decision_pending`.
- El guard por denylist de cuatro literales en `updateHiringApplicationStage` (`src/lib/hiring/store.ts:1311`),
  con su error `hiring_application_stage_decision_owned` (422) y el filtro `AND decision IS NULL` del `UPDATE`.
- `normalizeHiringApplication` (`src/lib/hiring/store.ts:421-449`) lee `decision` con **cast**, no con
  `assertEnum` (`:438`) — retirar un literal del enum de desenlace **no** revienta la lectura de una fila
  histórica. Esa protección **no** existe para `trigger_stage` en las policies (H-05), que es otro eje.
- La revocación de handoff ramifica por `decision !== 'selected'` (`src/lib/hiring/handoff/materialize.ts:157`):
  desenlaces nuevos entran a revocación sin cambio de código.
- Capability `hiring.application.decide` con grant real y ruta `POST` dedicada.

### Gap

- **No existe eje de desenlace utilizable.** No hay `not_selected` ni `unresponsive`; el único cierre
  representable para quien no quedó es `rejected`, el literal que el ADR §9 prohíbe cuando no hubo juicio.
- **No existe la causa.** `decideHiringApplication` no recibe ni persiste causa alguna, así que el motivo de
  vacante (cupo lleno, búsqueda cerrada, proceso cancelado) no tiene dónde vivir salvo en prosa libre.
- **No existe el invariante.** `stage='closed'` y `decision IS NULL` conviven: hoy hay **32 filas** así
  (todas `smoke_test`, escritas por `src/lib/hiring/data-origin/purge.ts:173`) y **1 sola fila realmente terminal**
  (`rejected`, con su decisión). Readback del 2026-08-22.
- **No existe campo de archivado.** `hiring_application` no tiene `archived_at` ni equivalente, verificado contra
  el DDL vigente: por eso el archivado de sintéticos escribe en el eje equivocado.
- **`on_hold` es un cierre que no cierra.** Está en el enum de desenlaces y mapea a `decision_pending`: la misma
  fila dice «terminó» y «sigue viva».
- **El `PATCH` puede cerrar.** Deja pasar `closed` y `handoff_ready`, y el que cierra por ahí no emite evento, no
  manda correo y congela la retención.
- **El selector de correo colapsa.** `src/lib/hiring/notifications/send.ts:358` es
  `decision === 'selected' ? 'hiring_decision_selected' : 'hiring_decision_rejected'`: el primer `not_selected`
  escrito mandaría un correo de rechazo a quien nadie rechazó.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring` (command/store), `src/app/api/hiring/applications` (adapters HTTP) y `migrations/`
- Future candidate home: `domain-package`
- Boundary: `decideHiringApplication` es el único escritor de desenlace y causa; `updateHiringApplicationStage` queda restringido a etapas del recorrido; consumers autorizados son las rutas HTTP de Hiring, el Hiring Desk, el worker de cierre por capacidad y Nexa/MCP sobre el mismo command
- Server/browser split: command, store, migraciones y señal son server-only; el enum de desenlace, el enum de causa y los DTO de decisión quedan en el archivo de tipos browser-safe `src/types/hiring.ts`, sin imports de DB ni de proveedores
- Build impact: `none; sin dependencia nueva, sin SDK y sin filesystem input`
- Extraction blocker: la decisión escribe aplicación, historia y outbox dentro de una transacción PostgreSQL única, y comparte auth/capabilities con el resto del portal

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_hiring.hiring_application` (columnas `stage`, `decision`, `decision_cause`, `archived_at`) + `decideHiringApplication`
- Consumidores afectados: `Hiring Desk, Application 360, PATCH/POST de applications, worker de cierre por capacidad (TASK-1762), retención (TASK-1744), talent pool, fairness, Nexa/MCP`
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/decide.ts` (`decideHiringApplication`), `src/types/hiring.ts`
  (`DecideHiringApplicationInput`, `HiringDecisionHistoryEntry`), evento `hiring.application.decided`
  (`src/lib/sync/event-catalog.ts:1142`), evento `hiring.application.stage_changed` (`:1141`), errores canónicos
  de `src/lib/hiring/errors.ts`.
- Contrato nuevo o modificado: `HIRING_DECISIONS` (6 valores finales), `HIRING_DECISION_CAUSES` (3 valores),
  `DecideHiringApplicationInput.cause`, columna `decision_cause`, columna `archived_at`, `CHECK` del invariante
  de cierre, restricción por tipo del parámetro de `updateHiringApplicationStage`, error canónico
  `hiring_application_close_requires_outcome`.
- Backward compatibility: `breaking` en la superficie de escritura de cierre (el `PATCH` deja de aceptar `closed`
  y `on_hold` deja de ser desenlace), `compatible` en lectura (`decision` sigue siendo la misma columna con el
  mismo nombre; el rename físico a `outcome` queda deferido por ADR §11).
- Full API parity: la capability `hiring.application.decide` ya existe con grant real; UI, worker de capacidad,
  Nexa y MCP consumen **el mismo command**, y la causa viaja en su input, nunca en un `PATCH` paralelo ni en un
  campo de notas. El write es apto para `propose → confirm → execute`: el LLM propone desenlace y causa, la
  confirmación humana ejecuta el command.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_application`; la VIEW de equidad viva (`migrations/20260713173500000_task-1365-application-scoped-selfid-hardening.sql`) se **lee**, no se modifica
  (es de `TASK-1767`).
- Invariantes que no se pueden romper:
  - `stage = 'closed'` ⟺ `decision IS NOT NULL`. Como `CHECK`, en ambas direcciones.
  - `decision_cause IS NOT NULL` ⟺ `decision = 'not_selected'`. Obligatoria ahí, prohibida en el resto.
  - Un desenlace terminal escribe siempre `stage='closed'`; ninguna etapa espejo se vuelve a escribir.
  - Una pausa **no** es un desenlace: vive como `stage='decision_pending'` con `decision IS NULL`.
  - `archived_at` es ortogonal a `stage` y a `decision`: archivar un registro no declara desenlace de nadie.
  - La historia de decisiones sigue siendo append-only y conserva `supersedesDecisionId`; la causa entra en cada
    entrada del historial, no sólo en la columna snapshot.
  - Ningún literal se retira del enum mientras una fila histórica lo nombre en un camino de lectura con
    `assertEnum`.
- Write-target allowlist: `greenhouse_hiring.hiring_application` **ya está** en `ALLOWED_WRITE_TARGETS`
  (`src/lib/hiring/boundary-domain.test.ts:35`). Esta task **no crea tablas nuevas**, así que el allowlist no
  cambia; si un slice terminara necesitando una tabla, se declara ahí con justificación en el mismo PR.
- Tenant/space boundary: el actor sale de `requireInternalTenantContext`; `applicationId` se resuelve server-side
  y el browser no aporta tenant ni cohorte.
- Idempotency/concurrency: se conserva la idempotency key del command y la detección de replay por
  `sameReplayPayload` (`src/lib/hiring/decide.ts:100-108`), que **debe** incorporar la causa — dos confirmaciones
  con la misma clave y distinta causa son un conflicto (409), no un replay. Lock `FOR UPDATE` sobre la fila.
- Audit/outbox/history: `hiring.application.decided` lleva `decision` y `cause` en el payload (nunca PII ni el
  texto de la razón); la entrada de historial conserva razón, evidencia y supersede. La escalera de equidad lee
  payloads históricos: **agregar** campos es seguro, quitar no.

### Migration, backfill and rollout

- Migration posture: `additive` en el Slice 1 (columnas + ampliación de `CHECK`) y `destructive` acotado en el
  Slice 5 (el `CHECK` del invariante rechaza filas que hoy existen, y el `UPDATE` de las filas decididas a
  `closed` es un cambio de dato real).
- Default state: `enabled with rationale` — no hay flag. Un flag mantendría vivas las dos formas de cerrar a la
  vez, que es exactamente el defecto que la task viene a cerrar; el control de riesgo es el orden de slices y el
  readback, no un interruptor.
- Backfill plan: sólo el `UPDATE` del Slice 5 sobre las filas **decididas** que aún viven en etapas espejo
  (readback 2026-08-22: **1 fila** `rejected`). Se ejecuta con readback antes y después y aborta si el conteo no
  coincide con el plan. Las 32 filas sintéticas **no** las migra esta task: son de `TASK-1748`.
- Rollback path: `Slices 1-4` revierten por PR + `pnpm migrate:down` (columnas aditivas, `CHECK` ampliado). El
  `CHECK` del Slice 5 se retira con migración inversa; el `UPDATE` de etapa es reversible desde el historial de
  decisión, que conserva el desenlace y su fecha.
- External coordination: sign-off de People Ops sobre el vocabulario visible (ADR §7.1) antes del Slice 4;
  coordinación con la sesión que trabaja `TASK-1747` antes de tocar los tres puntos de `Application360View.tsx`;
  coordinación con `TASK-1748` para el orden de las 32 filas.

### Security and access

- Auth/access gate: `hiring.application.decide` (`execute`, scope `tenant`) para cerrar;
  `hiring.application.write` (`update`) para mover etapa. Ninguna capability nueva.
- Sensitive data posture: `PII`. La razón de la decisión y el nombre del candidato **nunca** entran a payloads de
  outbox, logs, señales ni mensajes de error. La causa sí (es un enum, no dato personal).
- Error contract: `canonicalErrorResponse` + `HiringValidationError` con códigos estables
  `hiring_decision_cause_required`, `hiring_decision_cause_not_allowed`, `hiring_decision_invalid`,
  `hiring_application_close_requires_outcome`, `hiring_decision_idempotency_conflict`. Prose es-CL, sin detalle
  técnico. **NUNCA** exponer el identificador interno del desenlace ni de la causa a la persona candidata.
- Abuse/rate-limit posture: el command ya exige idempotency key y actor autenticado; el lock por fila acota
  concurrencia. Sin rate-limit adicional: el cierre es una acción humana de baja frecuencia, y el volumen alto
  (cohorte) lo gobierna `TASK-1762` con su propio run.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/hiring` (incluye `decide.test.ts`, `boundary-domain.test.ts`,
  `handoff/materialize.test.ts` y `notifications/send.test.ts`, todos con casos `on_hold` vivos que hay que
  reescribir, no borrar), `pnpm lint`, `pnpm typecheck`.
- DB/runtime checks: readback por `stage` y por `decision` antes y después de cada migración; readback del
  invariante (`SELECT count(*) WHERE (stage='closed') <> (decision IS NOT NULL)` debe dar **0** antes de aplicar
  el `CHECK`); verificación de que las constraints existen en `pg_constraint` post-apply, dentro de la propia
  migración con bloque `DO` + `RAISE EXCEPTION`.
- Integration checks: cierre real por cada uno de los seis desenlaces vía `POST /api/hiring/applications/[id]/decide`
  en staging; intento de `PATCH {stage:'closed'}` que debe responder 422 con el código canónico; `not_selected`
  sin causa que debe responder 422; `rejected` con causa que debe responder 422.
- Reliability signals/logs: `hiring.application.closed_without_outcome` (kind `data_quality`, steady `0`) en el
  módulo `hiring` del registry (`src/lib/reliability/registry.ts:555-594`). Nace **antes** del `CHECK` para medir
  el drift que el `CHECK` va a impedir, y queda después como red por si una vía de escritura futura lo evade.
- Production verification sequence: ver `### Production verification sequence`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers están nombrados con paths reales.
- [ ] Invariantes de datos, boundary de acceso y postura de idempotencia/concurrencia son explícitos.
- [ ] No se crean tablas nuevas; si alguna emergiera, queda declarada en el allowlist de writes del dominio con
      justificación en el mismo PR.
- [ ] Migration/backfill/rollback están declarados y son proporcionales al riesgo del `CHECK`.
- [ ] Hay evidencia de DB/runtime para cada slice que toca datos.
- [ ] Los errores son canónicos, no hay fuga de PII en payloads/logs/señales, y la señal de drift existe.

## Hybrid Execution Justification

Esta task es una **vertical híbrida deliberada de datos + command**, no de datos + UI. Se declara aquí porque la
regla del repo es partir `backend-data` de `ui-ux`, y esta task **no** se parte por otra razón: el enum/`CHECK` y
el command son la misma pieza.

- **Why not split:** el `CHECK` `stage='closed'` ⟺ desenlace es **inaplicable** mientras el `PATCH` siga
  aceptando `closed`, porque cada arrastre a «Cerrado» produciría una fila que la base rechaza; y el `PATCH` no
  puede dejar de aceptarlo mientras el command no sepa recibir el desenlace, porque entonces **no queda ninguna
  forma de cerrar una postulación**. Separarlos abre en producción una ventana con una de dos formas: o el `CHECK`
  existe y el tablero revienta con 500 en cada cierre, o el `PATCH` cierra y sigue produciendo exactamente las
  filas que el `CHECK` viene a prohibir. La ventana no es teórica: la columna «Cerrado» es un destino de arrastre
  activo hoy (`src/views/greenhouse/hiring/PipelineDeskView.tsx:83`).
- **Primary execution profile:** `backend-data`. La superficie sólo pierde una opción (`on_hold`); no gana pantalla,
  layout, estado ni copy nuevo, y por eso `UI impact` es `none` y no `copy`. El chip de desenlace y el diálogo de
  cierre —que sí son diseño— son de `TASK-1766`.
- **Contract boundary:** el eje de desenlace vive en `src/types/hiring.ts` (browser-safe) y su único escritor es
  `decideHiringApplication`. Todo consumer —UI, worker, Nexa, MCP— entra por ahí. `updateHiringApplicationStage`
  queda con un tipo de parámetro estrictamente más chico, de modo que un `closed` ni siquiera compila.
- **Risk controls:** seis slices con orden duro, expand antes que contract, readback obligatorio antes y después
  de cada migración, señal de drift que nace antes del `CHECK`, y el `CHECK` como último slice, condicionado a
  que `TASK-1748` haya sacado sus 32 filas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Expand: enum de desenlace, causa gobernada y campo de archivado

- Migración `migrations/<timestamp>_task-1765-hiring-outcome-axis-expand.sql`, aditiva y sin el invariante:
  amplía el `CHECK` de `decision` a **siete** valores (los cinco vigentes + `not_selected` + `unresponsive`),
  agrega `decision_cause TEXT` con su `CHECK` de enum y su `CHECK` de pareja con `decision`, y agrega
  `archived_at TIMESTAMPTZ` con índice parcial. Bloque `DO` + `RAISE EXCEPTION` que aborta si cualquiera de las
  dos columnas o de las tres constraints no quedó creada.
- `src/types/hiring.ts`: `HIRING_DECISIONS` pasa a siete durante el expand (`on_hold` sigue vivo porque una
  superficie todavía lo ofrece), nace `HIRING_DECISION_CAUSES` con sus tres valores y su tipo.
- `pnpm db:generate-types` y readback por `stage` y por `decision` antes y después.
- **Entregable:** la base admite los dos desenlaces nuevos, la causa y el archivado. Nada los escribe todavía.

### Slice 2 — El command de cierre recibe desenlace y causa

- `DecideHiringApplicationInput` gana `cause?: HiringDecisionCause | null`; `decideHiringApplication` valida con
  un `assertCause(cause, decision)` que exige causa en `not_selected` y la rechaza en los otros cinco, con los dos
  errores canónicos nuevos.
- La causa se persiste en la columna `decision_cause` **y** en la entrada de `decisionHistory[]`; entra en
  `sameReplayPayload` (`src/lib/hiring/decide.ts:100-108`) para que dos confirmaciones con la misma idempotency
  key y distinta causa den 409, no un replay silencioso.
- El payload de `hiring.application.decided` suma `cause`; sigue sin PII.
- `DECISION_STAGE` (`:27-33`) colapsa: los seis desenlaces terminales escriben `stage='closed'`. `on_hold` conserva
  `decision_pending` mientras exista, y desaparece con él en el Slice 4.
- `POST /api/hiring/applications/[id]/decide` refleja el contrato; el error viaja por `toHiringErrorResponse`.
- **Guard de correo acotado:** el ternario de `src/lib/hiring/notifications/send.ts:358` pasa a un mapa explícito
  desenlace → `EmailType` con **no-op declarado** para los desenlaces que todavía no tienen tipo. Sin esto, el
  primer `not_selected` escrito manda un correo de rechazo a quien nadie rechazó. Esta task **no** crea
  `hiring_decision_not_selected` ni su seed: eso es de `TASK-1762`.
- **Entregable:** se puede cerrar con desenlace y causa por el camino canónico, y ningún desenlace nuevo dispara
  un correo mentiroso.

### Slice 3 — El `PATCH` deja de poder cerrar, por tipo

- Nace `HIRING_PIPELINE_STAGES` en `src/types/hiring.ts`: el subconjunto de etapas del **recorrido** que un
  cambio de etapa puede escribir. `closed` no está, y tampoco los espejos terminales ni `handoff_ready`.
- `updateHiringApplicationStage` (`src/lib/hiring/store.ts:1302`) cambia el tipo de su parámetro a
  `HiringPipelineStage` y valida con `assertEnum(stage, HIRING_PIPELINE_STAGES, 'stage')`. **La denylist de
  `:1311` se borra**, no se amplía: el conjunto de lo escribible se define por inclusión.
- Error canónico `hiring_application_close_requires_outcome` (422) cuando llega `closed`, con prose es-CL que
  nombra el camino correcto («cerrar una postulación exige declarar el desenlace») y `actionable: false`.
- `PATCH /api/hiring/applications/[id]` valida contra el mismo subconjunto antes de llamar al store.
- Se conserva el filtro `AND decision IS NULL` del `UPDATE` y su 409 `hiring_application_already_decided`.
- **Entregable:** cerrar por `PATCH` deja de compilar y deja de responder 200.

### Slice 4 — Contract del desenlace: `on_hold` sale del eje

- `HIRING_DECISIONS` baja a **seis**: `selected`, `backup_selected`, `not_selected`, `rejected`, `withdrawn`,
  `unresponsive`. `on_hold` sale del enum TS, de `DECISION_STAGE` y del `CHECK` de DB.
- Supresión de los tres puntos de `Application360View.tsx` que ofrecen «Dejar en espera» (`:104`, `:1708`, `:1761`),
  coordinada con `TASK-1747`. Una pausa se registra moviendo la etapa a `decision_pending`, que el `PATCH` sí acepta.
- Readback previo obligatorio: **cero filas** con `decision = 'on_hold'`. Si aparece alguna, se detiene el slice y
  se decide su desenlace real con People Ops antes de continuar — no se reescribe a ciegas.
- Los tests que hoy usan `on_hold` como caso vivo (`decide.test.ts:111`, `:124`, `:130`;
  `handoff/materialize.test.ts:204`; `notifications/send.test.ts:397`;
  `documents/capture-identity-document.test.ts:45`) se **reescriben** a `unresponsive` o `not_selected` según lo
  que cada uno estuviera probando. Borrarlos perdería cobertura real.
- **Entregable:** el eje de desenlace queda con sus seis valores definitivos y ninguna superficie ofrece una
  pausa como cierre.

### Slice 5 — El invariante como `CHECK` de base

- **Precondición dura:** `TASK-1748` ya migró sus 32 filas sintéticas fuera de `stage='closed'` al campo de
  archivado. Sin eso, la migración aborta contra ellas — que es el comportamiento correcto.
- `UPDATE` de las filas **decididas** que aún viven en etapas espejo (`selected|backup|rejected|withdrawn`) a
  `stage='closed'`, con readback antes y después y aborto si el conteo no coincide con el plan.
- Readback del invariante: `SELECT count(*) FROM greenhouse_hiring.hiring_application WHERE (stage='closed') <> (decision IS NOT NULL)`
  debe dar **0**.
- Migración `migrations/<timestamp>_task-1765-hiring-outcome-axis-closed-invariant.sql` que agrega
  `CHECK ((stage = 'closed') = (decision IS NOT NULL))`, con bloque `DO` que verifica la constraint post-apply.
- Test de invariante que intenta ambas violaciones contra PG real y espera que la base las rechace.
- **Entregable:** un `closed` sin desenlace es irrepresentable, y H-01/H-02 dejan de existir estructuralmente.

### Slice 6 — Paridad, señal y documentación

- El reader y el DTO de aplicación exponen `decisionCause`; `normalizeHiringApplication` lo mapea.
- Señal `hiring.application.closed_without_outcome` en el módulo `hiring` del registry, con su query en
  `src/lib/reliability/queries/hiring-application-outcome-signals.ts`, steady `0`.
- Delta en el ADR de vocabulario marcando §4, §4.1 y §5 como implementados, con fecha.
- Triple documentación proporcional: técnica (delta en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` + ADR),
  funcional (`docs/documentation/hr/`) y manual de operación (`docs/manual-de-uso/hr/`) explicando qué significa
  cada desenlace, cuándo la causa es obligatoria y por qué una pausa no es un cierre.
- **Entregable:** el eje es observable, consumible por cualquier cliente y está documentado en las tres capas.

## Out of Scope

- **La superficie del kanban** — chip de desenlace en la tarjeta, diálogo de cierre que pide desenlace y causa
  antes de escribir, y el aviso de que soltar en «Evaluación» dispara la prueba: es `TASK-1766`.
- **El embudo de equidad** ramificando por desenlace + causa, y la conservación de los literales retirados en las
  escaleras de rango de la VIEW: es `TASK-1767`.
- **El archivado en sí** — que `archiveSyntheticRecords` deje de escribir `closed` y pase a `archived_at`, y la
  migración de las 32 filas: es `TASK-1748`. Esta task sólo crea el campo.
- **La retención** — `planCandidateDocumentPurge` / `applyCandidateDocumentPurge`, la escalera que hoy omite
  `backup_selected` (H-23) y el barrido: es `TASK-1744`.
- El `EmailType` `hiring_decision_not_selected`, su fila de `email_type_config`, su seed en el `ops-worker` y su
  perfil de footer: es `TASK-1762` (+ `TASK-1764`).
- El enum de **etapas** (`HIRING_APPLICATION_STAGES`), su colapso y su contract: es `TASK-1754`.
- El rename físico `decision` → `outcome`: deferido por el ADR §11, con su propia migración.
- La derivación automática de `unresponsive` tras N días de silencio: toca comunicación al candidato y necesita
  su propia decisión (ADR §15).
- Extender la causa también a `rejected` (motivo del descarte): el ADR §15 lo declara útil y **no** requisito.
- Invertir el default de la policy de assessment.

## Detailed Spec

### El enum de desenlace, estado final

```ts
// src/types/hiring.ts — reemplaza :126
export const HIRING_DECISIONS = [
  'selected',
  'backup_selected',
  'not_selected',
  'rejected',
  'withdrawn',
  'unresponsive'
] as const

export const HIRING_DECISION_CAUSES = ['capacity_filled', 'opening_closed', 'process_cancelled'] as const
export type HiringDecisionCause = (typeof HIRING_DECISION_CAUSES)[number]
```

Semántica normativa (ADR §4): `not_selected` es «llegó al final y no quedó» y es **la población objetivo del
Talent Pool**; `rejected` es juicio desfavorable para este rol; `withdrawn` es un retiro **declarado** por la
persona; `unresponsive` es silencio, sin conducta atribuida y **sin correo**.

### La causa, y la pareja que la gobierna

| Causa | Qué pasó | ¿Cuenta en el embudo? |
|---|---|---|
| `capacity_filled` | El cupo lo tomó otra persona | **sí** — el proceso concluyó y hubo comparación |
| `opening_closed` | Se cerró la búsqueda | **no** — el proceso no concluyó |
| `process_cancelled` | Se canceló el proceso | **no** |

La columna de la fila 3 la **consume** `TASK-1767`; acá sólo se persiste el enum. Lo que esta task garantiza es
que ese consumidor tendrá un valor gobernado por el que ramificar, y no prosa libre.

### DDL del Slice 1

```sql
-- Up Migration

-- 1. El nombre de la constraint inline lo generó PostgreSQL desde <tabla>_<columna>_check.
--    RESOLVERLO con readback contra pg_constraint antes del DROP; nunca asumirlo.
ALTER TABLE greenhouse_hiring.hiring_application
  DROP CONSTRAINT IF EXISTS hiring_application_decision_check;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_check CHECK (decision IN (
    'selected', 'backup_selected', 'not_selected', 'rejected',
    'withdrawn', 'unresponsive', 'on_hold'));  -- 'on_hold' sale en el Slice 4

ALTER TABLE greenhouse_hiring.hiring_application
  ADD COLUMN IF NOT EXISTS decision_cause TEXT,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_cause_check CHECK (
    decision_cause IS NULL
    OR decision_cause IN ('capacity_filled', 'opening_closed', 'process_cancelled'));

-- La causa es obligatoria en not_selected y prohibida en el resto: bicondicional, no "opcional".
ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_decision_cause_pairing_check CHECK (
    (decision_cause IS NOT NULL) = (decision = 'not_selected'));

CREATE INDEX IF NOT EXISTS hiring_application_archived_idx
  ON greenhouse_hiring.hiring_application (archived_at)
  WHERE archived_at IS NOT NULL;
```

Cuidado con la bicondicional de pareja: cuando `decision IS NULL`, `(decision = 'not_selected')` es `NULL` y la
comparación entera evalúa `NULL`, que un `CHECK` **acepta**. Es el comportamiento deseado (una postulación sin
decisión no tiene causa, y tampoco la exige), pero hay que dejarlo escrito para que nadie lo "arregle" después
envolviendo en `COALESCE` y rompa el caso abierto.

El bloque `DO` obligatorio al final del `Up` verifica, contra `information_schema.columns` y `pg_constraint`, que
las dos columnas y las tres constraints existen, y hace `RAISE EXCEPTION` si no — el guard anti pre-up-marker que
el repo ya pagó dos veces.

### DDL del Slice 5

```sql
ALTER TABLE greenhouse_hiring.hiring_application
  ADD CONSTRAINT hiring_application_closed_outcome_check CHECK (
    (stage = 'closed') = (decision IS NOT NULL));
```

Acá **no** hay `NULL` posible: `stage` es `NOT NULL` y `decision IS NOT NULL` siempre es booleano. La bicondicional
es total, y por eso rechaza los dos defectos de una vez: un `closed` sin desenlace, y un desenlace que no cerró.

### El guard del `PATCH`, y por qué no es una denylist más larga

Hoy `src/lib/hiring/store.ts:1311` es `if (['selected','backup','rejected','withdrawn'].includes(nextStage))`.
Es una lista de **excepciones**, y toda lista de excepciones falla por lo que no enumera: por ahí se colaron
`closed` y `handoff_ready`, que son justo los dos que hacen daño. Agregarlos a la lista dejaría el mismo diseño
con dos nombres más, y el siguiente literal que alguien agregue al enum de etapas volvería a nacer escribible por
omisión.

El arreglo estructural es invertir la polaridad: `HIRING_PIPELINE_STAGES` enumera lo que **sí** se puede escribir
como cambio de etapa, y el tipo del parámetro lo hace cumplir en compilación. Una etapa nueva nace **no**
escribible hasta que alguien la agregue deliberadamente, que es la dirección correcta del default.

### Orden de escritura dentro del command

`decideHiringApplication` conserva su transacción única: `SELECT ... FOR UPDATE` → detección de replay →
validación de opening para `selected`/`backup_selected` → snapshot de assessment → `UPDATE` de la fila con
`decision`, `decision_cause` y `stage='closed'` → `jsonb_set` del historial → `publishOutboxEvent`. La causa entra
en el mismo `UPDATE`, nunca en una segunda escritura: el `CHECK` de pareja lo exige.

## Delta de ejecución 2026-08-22 — el orden de slices cambió, y por qué

### Lo aplicado

Slices **1, 2, 3 y 6** están aplicados en base y en código. Los Slices 1 y 2 fueron **un solo commit**
y no por conveniencia: `DECISION_STAGE` es una `Record` TOTAL, así que ampliar el enum obliga a
completar el mapa en el mismo cambio, y separarlos dejaba un estado donde `not_selected` pasaba la
validación del command pero violaba el `CHECK` de pareja en la base — un 500 en vez del 422 canónico.
El `Hybrid Execution Justification` de esta misma task ya argumentaba que dato y command son una
pieza; el compilador lo confirmó.

### Lo que se movió a POST-RELEASE, por un incidente en producción

Slice **4** (retirar `on_hold` del `CHECK`) y Slice **5** (el `CHECK` del invariante) pasan al **mismo
lote post-release**. Los dos son irreversibles y los dos dependen de que el código ya esté arriba.

El Slice 4 se aplicó y **rompió producción durante ~7 minutos**. El readback previo era correcto —0
filas `on_hold`, 0 entradas de historial— pero estaba sobre el eje equivocado:

> **«Cero filas» no es «nadie lo escribe»: sólo dice que nadie lo escribió TODAVÍA.**

Hay **una sola instancia de Cloud SQL** compartida por dev, staging y producción, y producción sirve
`origin/main`, que todavía pinta el botón «Dejar en espera». Angostar el `CHECK` dejó esa acción
respondiendo `23514`. Cero filas afectadas, cero datos perdidos; reparado con el forward fix
permisivo `20260822204609045_task-1765-hiring-outcome-restore-on-hold-until-release`, verificado
ejercitando un `UPDATE` real y no leyendo la definición del `CHECK`.

La regla que faltaba, y que **ningún guard de SQL puede sustituir** —sólo ve datos, y la precondición
es sobre código desplegado—:

> **Un contract de enum se aplica DESPUÉS del release que retira el valor del código, nunca antes.**
> La alcanzabilidad se deriva del **contrato de la superficie desplegada** (`origin/main`), jamás del
> contenido de la tabla.

Está escrita en `GREENHOUSE_DATABASE_TOOLING_V1.md` y como enmienda al §14 del ADR, porque no es una
regla de Hiring.

### Segundo hallazgo: no existe «migración escrita y sin aplicar» como estado seguro

Esta spec pedía dejar el `CHECK` del Slice 5 «escrito y committeado sin aplicar». Eso **bloqueó la
reparación urgente de producción**: `pnpm migrate:up` corre todas las pendientes en orden de
timestamp y abortó contra su guard antes de llegar al forward fix. El guard funcionó perfecto; el
problema es que estaba en el camino.

Nace `docs/tasks/pending-migrations/` — migraciones revisadas, con sufijo `.sql.pending`, fuera del
alcance del runner, con su condición de reactivación declarada. **Esa instrucción de esta spec queda
invalidada.** El lote pendiente y su orden están en el README de esa carpeta.

### Ownership acotado declarado

- `src/views/greenhouse/hiring/Application360View.tsx` — el archivo es de `TASK-1747`. Esta task tocó
  **sólo tres líneas** (`on_hold` en el arreglo de opciones, en el grupo de botones y en el tono del
  historial), coordinado con esa sesión antes de editar. La clave de copy `decisionHold` queda
  **viva**: retirarla rompería el contrato de `src/lib/copy/types.ts` y su retiro es de `TASK-1766`.
- `src/lib/hiring/assessment/assignment-policy/readers.ts` — cae en el glob de `TASK-1719` y lo
  referencia `TASK-1767`. Esta task agregó `'closed'` a `STAGES_DOWNSTREAM_OF_TRIGGER` (dos líneas,
  aditivo) porque el colapso de `DECISION_STAGE` habría vaciado en silencio la cola humana de
  triggers perdidos — es el H-11 de la auditoría, encontrado desde el otro lado.

### Corrección de conteo

Las violaciones del invariante son **33, no 32**, y se violan por **los dos lados** de la
bicondicional: 32 filas `closed` sin desenlace (sintéticas, de `TASK-1748`) **más** 1 fila real
`rejected` que vive todavía en su etapa espejo. El criterio de aceptación correcto es **33 → 0**.

---

## Delta 2026-08-22 (cierre) — una regresión propia corregida y una deuda con condición

### Regresión propia, CORREGIDA: el reloj de retención no cubría los desenlaces nuevos

`refresh_assessment_access_recovery_retention_for_application` (trigger de `TASK-1746`) decidía la
retención con listas de literales, y `not_selected`/`unresponsive` caían al `ELSE`, que pone **NULL**:
el reloj de la Ley 21.719 **no arrancaba nunca** para ellos. Familia del H-01, y el mismo patrón de
denylist que esta task vino a borrar del `PATCH`, sobreviviendo dentro de un trigger de PostgreSQL.

Corregido en `migrations/20260823001108108_task-1765-recovery-retention-covers-all-outcomes.sql`,
aplicado y verificado evaluando el `CASE` de la función **instalada** sobre los seis desenlaces:

| Desenlace | Retención |
|---|---|
| `selected` | sin vencimiento (pasa a retención laboral) |
| `backup_selected` | sin vencimiento — **explícito**, no por `ELSE` mudo; dueño `TASK-1744` (H-23) |
| `rejected` · `withdrawn` · `not_selected` · `unresponsive` | **arranca el reloj +12 meses** |
| sin desenlace | sin vencimiento (proceso vivo) |

`hiring_assessment_access_recovery` tiene **0 filas**: el fix es preventivo. **No bloquea el release;
tiene que ir DENTRO de él** — la regresión se vuelve viva en el instante en que el release habilite
los desenlaces nuevos.

### Deuda declarada, con su condición: los predicados de «proceso activo» preguntan por el eje viejo

Cuatro consumidores infieren el desenlace desde la etapa —`talent-pool/projection.ts` (2 sitios),
`talent-pool/commands.ts:272`, `desk.ts:104` y `DemandDeskView.tsx:348`— con
`stage NOT IN ('rejected','withdrawn','closed')`. Tras el colapso, «cómo terminó» vive en `decision`,
así que ése es el eje equivocado.

**No se cambian todavía, y la razón es medible.** Readback 2026-08-22:

| Predicado | Postulaciones «activas» |
|---|---|
| `stage NOT IN ('rejected','withdrawn','closed')` (actual) | **50** |
| `decision IS NULL` (el «correcto») | **82** |

Las 32 de diferencia son las filas sintéticas archivadas como `closed` sin decisión. Cambiar el
predicado hoy las devolvería al conteo de proceso activo — una regresión, no una mejora.

**Condición de ejecución:** después del backfill de `TASK-1748` y del `CHECK` del invariante.
**Dueña: `TASK-1772`.**

> **Corrección 2026-08-22 a lo que decía este párrafo.** Afirmaba que tras el backfill «los dos
> predicados se vuelven equivalentes y el cambio pasa a ser de claridad». **La equivalencia es cierta;
> la conclusión no.** El backfill de `TASK-1748` no neutraliza las 32 filas: las devuelve a su etapa
> previa —o a `sourced`— y les estampa `archived_at`. Con ellas en `sourced` y sin desenlace, los DOS
> predicados las cuentan como proceso activo. Convergen, sí, **pero al valor equivocado**: migrar a
> `decision IS NULL` habría adoptado el mismo defecto en los ocho callsites a la vez.
>
> El predicado correcto no es ninguno de los dos candidatos, y usa el tercer eje que nació en el
> Slice 1 de esta misma task y que ningún consumidor incorporó:
>
> ```sql
> decision IS NULL AND archived_at IS NULL
> ```
>
> `stage` **sale** del predicado en vez de quedar como tercera condición: con el `CHECK` aplicado,
> `stage='closed'` ⟺ `decision IS NOT NULL`, así que nombrarlo repite la primera condición; y sin el
> `CHECK`, nombra justo el caso que no se quiere contar. En los dos mundos es ruido.
>
> El daño que evita no es aritmética de dashboard: `active_process` alimenta la proyección **buscable**
> del Banco de Talento (`talent-pool/projection.ts:164`, `:185`, `:205`). Una persona **real** con una
> postulación archivada —que el filtro de procedencia de `TASK-1748` no cubre, porque es real— quedaría
> buscable e invitable por un registro que alguien retiró a propósito.
>
> Es el mismo error de categoría que esta task corrigió para `stage`/`decision`, una vuelta más arriba:
> un solo predicado respondiendo tres preguntas —dónde va, cómo terminó, si se muestra— y por eso
> ninguna bien.

**Verificado que NO hay daño hoy** (contra la afirmación inicial de la auditoría): el `CASE` de
`talent-pool/projection.ts` tiene **dos** ramas que devuelven `pool_eligible`, la 1.ª y la 3.ª, así
que el consentimiento —no `has_active_application`— es lo que decide la elegibilidad. Una persona
contratada que consintió ya era `pool_eligible` **antes** del colapso. El colapso nunca puede meter
al Banco de Talento a quien no estuviera ya; sin consentimiento la mueve a `needs_reconsent`, que la
saca de la proyección buscable. Es **más** protector, no menos.

---

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

**Orden interno:** Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6.

- Slice 1 (expand) **antes** que todo: sin las columnas, nada de lo demás persiste.
- Slice 2 (command) **antes** que Slice 3 (`PATCH`): si el `PATCH` deja de cerrar antes de que el command sepa
  recibir el desenlace, no queda ninguna forma de cerrar una postulación.
- Slice 3 **antes** que Slice 5: aplicar el `CHECK` mientras el `PATCH` todavía escribe `closed` significa que
  cada arrastre a «Cerrado» revienta con 500 contra la base.
- Slice 4 (retirar `on_hold`) **antes** que Slice 5: mientras `on_hold` exista como desenlace y mapee a
  `decision_pending`, una fila `on_hold` viola la bicondicional (tiene desenlace y no está en `closed`).

**Orden duro cross-task, y es el que manda:**

```text
TASK-1765 Slice 1  ──▶  TASK-1748 (migra sus 32 filas de `closed` a `archived_at`)  ──▶  TASK-1765 Slice 5
   crea archived_at            saca del camino las filas que violan el CHECK           aplica el CHECK
```

**Si el `CHECK` va primero, aborta contra esas 32 filas.** No es una hipótesis: son 32 filas `stage='closed'` con
`decision IS NULL`, todas `smoke_test`, escritas por `src/lib/hiring/data-origin/purge.ts:173`, readback del
2026-08-22. La dependencia es circular a propósito y se corta en tres pasos, no en dos: esta task entrega el
campo, `TASK-1748` mueve las filas, esta task cierra con el `CHECK`. Un agente que ejecute el Slice 5 sin
confirmar el readback de `TASK-1748` está violando el contrato de ambas tasks.

`TASK-1754` Slice F (retirar los espejos terminales del enum de **etapas**) va **después** del Slice 5 completo:
sólo cuando el desenlace posee esos literales y el `CHECK` existe se puede quitar el último discriminante del eje
viejo (ADR §14, paso 2).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El `CHECK` aborta la migración contra las 32 filas sintéticas | migration | **high si se invierte el orden** | Slice 5 exige readback verde de `TASK-1748`; la migración aborta limpio y no deja estado a medias | conteo de `(stage='closed') <> (decision IS NOT NULL)` distinto de 0 |
| Ventana en producción donde cerrar da 500 | Hiring desk / UI | medium | Slice 3 va antes que Slice 5; entre ambos, cerrar por `PATCH` ya responde 422 con el camino correcto, no 500 | 422 `hiring_application_close_requires_outcome` en logs; ausencia de 500 en `/api/hiring/applications` |
| El primer `not_selected` manda correo de «rechazo» | email / candidato | **high sin el guard** | el mapa explícito del Slice 2 hace no-op declarado para desenlaces sin `EmailType`; `TASK-1762` agrega el tipo real | ausencia de `hiring_decision_rejected` para filas con `decision='not_selected'` en el email log |
| Retirar `on_hold` revienta una lectura histórica | Hiring readers | low | `normalizeHiringApplication:438` lee `decision` con cast, **no** con `assertEnum`; readback previo exige cero filas `on_hold` | 500 al abrir Application 360 de una fila histórica |
| Una superficie sigue ofreciendo «Dejar en espera» y el operador recibe un 422 | Application 360 | medium | el Slice 4 suprime los tres puntos en el mismo PR, coordinado con `TASK-1747` | 422 `hiring_decision_invalid` con `decision='on_hold'` |
| Un replay con la misma clave y distinta causa se acepta como idéntico | command / data | medium | la causa entra en `sameReplayPayload`; distinta causa da 409 | conflicto de idempotencia en tests y en el log del command |
| Colisión de merge en `src/types/hiring.ts` con `TASK-1754` | repo | **high** | 1765 va primero y toca **sólo** `HIRING_DECISIONS`; 1754 toca **sólo** `HIRING_APPLICATION_STAGES`; el contract de 1754 va después | conflicto en el mismo archivo al rebasear |
| Colisión de migración con los globs anchos de `EPIC-038` | migration | low | sufijo propio `*task-1765*hiring*outcome*` en los dos archivos | dos migraciones tocando `hiring_application` en el mismo rango de timestamp |
| El `UPDATE` del Slice 5 mueve una fila que no correspondía | data | low | el `WHERE` exige `decision IS NOT NULL`; readback antes y después; el historial conserva el desenlace y permite reconstruir | conteo por etapa distinto del plan |

### Feature flags / cutover

**Sin flag, y es una decisión, no una omisión.** Un flag mantendría vivas al mismo tiempo las dos formas de cerrar
una postulación —con desenlace y sin él— que es exactamente el defecto que la task viene a cerrar; y un `CHECK`
de base no se puede "apagar" por env var de todos modos. El control de riesgo es el orden de slices, el readback
obligatorio antes y después de cada migración, y el `CHECK` como último paso.

Como no se declara ningún `*_ENABLED`, **no hay fila nueva** en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
El flag del correo por capacidad y su seed de `email_type_config` son de `TASK-1762` y viven en el `ops-worker`,
no acá.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (columnas y constraints aditivas, sin datos escritos aún) + revert del PR | < 15 min | sí |
| Slice 2 | Revert del PR. Las filas ya cerradas con desenlace nuevo quedan válidas: el `CHECK` del Slice 1 las admite y el historial las explica | < 15 min | sí |
| Slice 3 | Revert del PR: el `PATCH` vuelve a aceptar `closed`. Cualquier fila que se cierre por ahí en la ventana queda detectada por la señal del Slice 6 | < 15 min | sí |
| Slice 4 | Revert del PR + migración inversa que vuelve a admitir `on_hold` en el `CHECK`. Sin filas `on_hold` nuevas, la reversión es inerte | < 30 min | sí |
| Slice 5 | Migración inversa que hace `DROP CONSTRAINT hiring_application_closed_outcome_check`. El `UPDATE` de etapa se reconstruye desde `decisionHistory[]`, que conserva desenlace y fecha por fila | < 30 min | parcial — la constraint sí, el dato exige reconstrucción desde el historial |
| Slice 6 | Revert del PR (reader, señal y docs son aditivos) | < 15 min | sí |

**El Slice 5 es el único que muta estado de negocio.** Su comando de reversión se ensaya en staging con las mismas
filas antes del apply en producción; sin ese ensayo, no se ejecuta.

### Production verification sequence

1. `pnpm migrate:up` del Slice 1 en **staging** + readback: las dos columnas existen, las tres constraints existen
   en `pg_constraint`, el conteo por `stage` y por `decision` no cambió.
2. Deploy del Slice 2 a staging + cierre real por cada uno de los seis desenlaces vía
   `POST /api/hiring/applications/[id]/decide` sobre postulaciones de prueba: verificar `decision`,
   `decision_cause`, `stage='closed'`, entrada de historial y evento `hiring.application.decided` con `cause`.
3. Casos negativos en staging: `not_selected` sin causa → 422 `hiring_decision_cause_required`; `rejected` con
   causa → 422 `hiring_decision_cause_not_allowed`; misma idempotency key con distinta causa → 409.
4. Deploy del Slice 3 + `PATCH {stage:'closed'}` → 422 `hiring_application_close_requires_outcome` con prose es-CL
   y `actionable: false`. `PATCH {stage:'decision_pending'}` sigue en 200.
5. Deploy del Slice 4 + readback de cero filas `on_hold` + verificación de que Application 360 ya no ofrece
   «Dejar en espera» y que registrar una pausa como etapa `decision_pending` funciona.
6. **Confirmar con `TASK-1748` que sus 32 filas ya salieron de `closed`** y correr el readback del invariante:
   `(stage='closed') <> (decision IS NOT NULL)` debe dar 0. **Stop & escalate si da cualquier otro número.**
7. `pnpm migrate:up` del Slice 5 en staging + test de invariante contra PG real (ambas violaciones rechazadas).
8. Ensayo del rollback del Slice 5 en staging: `DROP CONSTRAINT`, reconstrucción de una fila desde el historial,
   re-apply.
9. Repetir 1-7 en **producción** con cooldown de 24 h entre ambientes, en el mismo orden y con los mismos readbacks.
10. Monitorear `hiring.application.closed_without_outcome` durante 7 días post-producción; steady esperado `0`.

### Out-of-band coordination required

- **People Ops / Talento:** sign-off del vocabulario de desenlace antes del Slice 4. El cambio es visible para el
  operador (desaparece «Dejar en espera», aparecen dos desenlaces nuevos) y cambia cómo se registra el cierre de
  una persona real. No es sólo un enum.
- **`TASK-1747`** (en progreso, dueña de `Application360View.tsx`): coordinar la supresión de los tres puntos de
  `on_hold` antes de tocar el archivo.
- **`TASK-1748`**: acordar la ventana del paso 6 de la secuencia de verificación. Sin su readback verde, el
  Slice 5 no se ejecuta.
- **`TASK-1754`** (en progreso, mismo archivo `src/types/hiring.ts`): confirmar que su Slice F no se ejecutó
  antes que el Slice 5 de esta task.
- Nada externo al repo: sin Azure, sin HubSpot, sin Notion, sin proveedor. Ningún secret rota.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `HIRING_DECISIONS` tiene exactamente seis valores: `selected`, `backup_selected`, `not_selected`,
      `rejected`, `withdrawn`, `unresponsive`. `on_hold` no está en el enum TS ni en el `CHECK` de DB.
- [ ] `HIRING_DECISION_CAUSES` existe con sus tres valores y la causa es **obligatoria** en `not_selected` y
      **rechazada** en los otros cinco, verificado con casos negativos que responden 422 canónico.
- [ ] La base rechaza un `stage='closed'` con `decision IS NULL` **y** un `decision IS NOT NULL` con
      `stage <> 'closed'`: el `CHECK` es bicondicional y ambos casos están probados contra PG real.
- [ ] Readback en producción: **cero filas** con `(stage='closed') <> (decision IS NOT NULL)`, ejecutado
      inmediatamente antes de aplicar el `CHECK` y de nuevo después.
- [ ] `decideHiringApplication` recibe y persiste desenlace **y** causa, en la columna y en la entrada de
      historial, dentro de la misma transacción y el mismo `UPDATE`.
- [ ] La causa entra en la comparación de replay: misma idempotency key con distinta causa responde 409, no un
      replay silencioso.
- [ ] `updateHiringApplicationStage` **no puede** recibir `closed`: el tipo de su parámetro lo excluye y
      `pnpm typecheck` falla si alguien lo intenta. **La denylist de `store.ts:1311` fue borrada, no ampliada** —
      un `grep` del arreglo `['selected','backup','rejected','withdrawn']` en ese archivo da cero resultados.
- [ ] `PATCH /api/hiring/applications/[id]` con `{stage:'closed'}` responde 422 con código canónico y prose es-CL
      que nombra el command de decisión; `actionable: false`.
- [ ] `hiring_application.archived_at` existe, es ortogonal a `stage` y a `decision`, y `TASK-1748` puede
      escribirlo sin tocar ninguno de los otros dos.
- [ ] Ningún literal se retiró de un camino de lectura con `assertEnum`: la policy y el ledger de assignment
      siguen releyendo sus filas históricas sin 500. Verificado ejercitando una lectura real de cada uno.
- [ ] Las escaleras de rango de la VIEW de equidad conservan intactos los literales históricos: esta task **no**
      las modifica.
- [ ] Ningún desenlace sin `EmailType` propio dispara un correo: el mapa del selector hace no-op declarado y
      ninguna fila `not_selected` aparece en el email log bajo `hiring_decision_rejected`.
- [ ] `hiring.application.closed_without_outcome` existe en el registry, drena a `0` y su query no expone PII.
- [ ] Ningún payload de outbox, log, señal ni mensaje de error contiene la razón de la decisión, el nombre del
      candidato ni el identificador interno del desenlace expuesto a la persona.
- [ ] Las tres capas documentales quedaron sincronizadas y el ADR tiene su delta de implementación con fecha.

## Verification

- `pnpm local:check` (lint + tsc)
- `pnpm vitest run src/lib/hiring` — suite completa del dominio, no sólo focal. `decide.test.ts`,
  `boundary-domain.test.ts`, `handoff/materialize.test.ts` y `notifications/send.test.ts` tienen casos `on_hold`
  vivos que hay que **reescribir**, no borrar.
- `pnpm vitest run src/lib/hiring/store.live.test.ts` contra PG real vía `pnpm pg:connect` — la única forma de
  ejercitar el SQL de verdad; los mocks ejercitan el TS, no la base.
- `pnpm migrate:status` y readback por `stage`/`decision` antes y después de cada migración.
- `pnpm db:generate-types` tras cada migración, con el diff de `src/types/db.d.ts` en el mismo commit.
- `pnpm test` (suite completa) y `pnpm build` como gate de cierre, con autorización del operador para el build.
- `pnpm task:lint --task TASK-1765`, `pnpm ops:lint --changed`, `pnpm qa:gates --changed`, `pnpm docs:closure-check`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedaron sincronizados
- [ ] `Handoff.md` quedó actualizado con lo aplicado, lo verificado y cualquier pendiente bloqueante
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-1744`, `TASK-1748`, `TASK-1754`, `TASK-1762`,
      `TASK-1766` y `TASK-1767`
- [ ] `TASK-1748` y `TASK-1744` quedaron **desbloqueadas** (`Blocked by` sin `TASK-1765`) y `TASK-1754` sabe que
      su Slice F ya puede ejecutarse
- [ ] el ADR `GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` registra el delta de
      implementación de §4, §4.1, §5 y §6, con fecha
- [ ] si el `CHECK` del Slice 5 no se aplicó en producción, el estado declarado es `code complete, rollout
      pendiente` — **no** `complete`

## Follow-ups

- La clave de copy `decisionHold` de `src/lib/copy/dictionaries/es-CL/hiringDesk.ts:351` queda huérfana al
  retirar `on_hold`. Su retiro entra con el vocabulario visible de desenlace, que es de `TASK-1766`.
- El comentario de doctrina de `src/lib/hiring/handoff/materialize.ts:8` y `:338` enumera desenlaces: actualizarlo
  al cerrar el Slice 4 o dejarlo como deuda visible con owner.
- Las tres definiciones distintas de «postulación activa» que la auditoría documenta en H-08
  (recuperación de acceso, `desk.ts:104`, `talent-pool/projection.ts`) siguen sin reconciliar. El `CHECK` hace que
  `closed` signifique algo por fin, pero no las unifica: merece task propia.
- El rename físico `decision` → `outcome` y su migración (ADR §11, §15).
- Extender la causa a `rejected` para calibrar selección (ADR §15), si emerge evidencia de que se necesita.

## Open Questions

- **¿`archived_at` alcanza, o el archivado necesita también actor y motivo en columna?** La postura de esta task
  es que alcanza: `greenhouse_hiring.hiring_data_origin_audit` ya guarda actor, motivo y snapshot por entidad
  archivada, así que duplicarlo en columna sería una segunda fuente de verdad. `TASK-1748` es quien lo escribe y
  puede pedir el campo extra si al implementar descubre que el audit no le basta.
- **¿La pausa necesita una marca propia además de `stage='decision_pending'`?** El ADR §6 dice que una pausa vive
  en la columna «Decisión» y nada más. Si el operador necesita distinguir «evaluada y esperando desenlace» de
  «pausada a propósito», eso es vocabulario visible y es de `TASK-1766`, no un desenlace.
- **¿Qué token recibe el modelo del expediente de evaluación por cada desenlace?** H-15 lo plantea para las
  etapas fusionadas; el desenlace entra al mismo prompt. No bloquea esta task, pero conviene decidirlo antes de
  que `TASK-1766` muestre el chip.
