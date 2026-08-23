# TASK-1748 — Cierre de deuda de procedencia: filtro del talent pool, archivado completo y purga del lane B

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `code complete, rollout pendiente` — Slices 1 y 2 en `develop` local; faltan los DOS runtimes (Vercel para los readers, `ops-worker` para la projection), que son la precondición de la migración parqueada. Slice 3 con doble bloqueo: sign-off del operador + esa migración.
- Rank: `TBD`
- Domain: `hr|data`
- Blocked by: `none` (DESBLOQUEADA 2026-08-22: `archived_at` ya existe en `hiring_application`. La relación se invirtió — ahora esta task **bloquea** el `CHECK` del invariante de `TASK-1765`, que espera a que sus 32 filas salgan de `closed`)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-22 — DESBLOQUEADA por TASK-1765

- **`greenhouse_hiring.hiring_application.archived_at` ya existe** (`TIMESTAMPTZ`, nullable, con índice
  parcial `hiring_application_archived_idx`). El Slice 2 de esta task ya tiene dónde escribir, y
  `archiveSyntheticRecords` puede dejar de escribir `stage='closed'`.
- Verificado contra PG que el campo es **ortogonal**: se escribe sin tocar `stage` ni `decision`
  (test live en `src/lib/hiring/store.live.test.ts`).
- **Esta task ahora bloquea a TASK-1765.** Su `CHECK` del invariante `(stage='closed') = (decision IS
  NOT NULL)` está escrito y **sin aplicar**, esperando que las 32 filas sintéticas salgan de `closed`.
  Vive en `docs/tasks/pending-migrations/TASK-1765-closed-invariant.sql.pending` — **no** en
  `migrations/`, porque una migración pendiente ahí bloquea a cualquiera que corra `pnpm migrate:up`.
  El README de esa carpeta tiene el runbook.
- Readback esperado tras el trabajo de esta task: `SELECT count(*) FROM
  greenhouse_hiring.hiring_application WHERE (stage='closed') <> (decision IS NOT NULL)` debe pasar de
  **33 a 1** (queda la fila real `rejected` en su etapa espejo, que la migra el propio `UPDATE` del
  Slice 5 de TASK-1765). Son **33**, no 32: la bicondicional se viola por los dos lados.
- **NUNCA** backfillear `decision` en esas 32 filas para que pasen el `CHECK`: sería fabricar un acto
  humano que nadie realizó. Se mueven a `archived_at`.

## Summary

`TASK-1739` dejó la procedencia de datos operando en producción, pero con tres piezas sin cerrar que
hoy **no tienen efecto visible** y por eso no justificaron un release propio. Esta task las cierra:
el filtro de procedencia en los readers del Banco de Talento, el archivado completo de fichas y
vacantes **sobre un eje de archivado propio**, y el lane de borrado de las postulaciones huérfanas.

Hereda además una cuarta pieza que el ADR del vocabulario volvió urgente: **migrar las 32 filas
sintéticas que hoy quedaron archivadas como `stage='closed'`** al campo de archivado, antes de que el
`CHECK` de `TASK-1765` vuelva ese estado irrepresentable.

## Why This Task Exists

Al verificar el cierre de `TASK-1739` (2026-08-19) aparecieron dos huecos de implementación y una
decisión humana pendiente. Ninguno rompe nada hoy, y esa es exactamente la razón por la que hay que
escribirlos: **una deuda que no duele es la que se olvida.**

1. **Los readers del Banco de Talento no filtran por procedencia.** El Slice 3 de `TASK-1739` pedía
   filtrar desk **y** talent pool; sólo se implementó el desk. Hoy las 11 personas sintéticas no
   aparecen en el Banco de Talento, pero **no por el filtro que debería excluirlas**: quedaron en
   `lifecycle_status = 'needs_reconsent'`, y el `baseSelect` de
   `src/lib/hiring/talent-pool/readers.ts` sólo sirve `('active_process','pool_eligible','paused')`.
   Es decir, la invisibilidad depende hoy de un estado del ciclo de vida que nadie garantizó — si
   alguna de esas fichas volviera a un estado servible, reaparecerían.
2. **El lane de archivado quedó parcial y, además, escribe en el eje equivocado.** La spec de
   `TASK-1739` definía archivar como tres escrituras —`hiring_application.stage='closed'`,
   `candidate_facet.status='archived'`, `hiring_opening.status='cancelled'`— y
   `archiveSyntheticRecords` (`src/lib/hiring/data-origin/purge.ts:173`) sólo hace la primera.
   **Esa primera escritura quedó superseded por el ADR del vocabulario**: `stage='closed'` pasó a
   significar «el recorrido de la persona terminó, con desenlace declarado», y archivar un registro
   no es cerrar el proceso de nadie. Ese mismo `UPDATE … SET stage='closed'` es el origen de las 32
   filas `closed` sin decisión que ensuciaron todo el diagnóstico de la auditoría del vocabulario.
   Por eso la corrección **no** es «completar las tres escrituras tal como la spec las definió» sino
   **cambiar la primera de eje** y migrar lo ya escrito. Las otras dos siguen faltando igual: 11
   fichas sintéticas siguen `active` y 14 vacantes sintéticas siguen en `draft`.
3. **El lane B de la purga no se ejecutó.** Nueve postulaciones huérfanas califican para borrado
   (cero dependientes, `stage='sourced'`); las otras 23 no pueden borrarse porque tienen assessments
   o evidencia append-only. La decisión de borrarlas es humana y sigue pendiente.

## Goal

- Que la invisibilidad de un dato sintético dependa de **su procedencia declarada**, no de un estado
  de ciclo de vida que podría cambiar.
- Que archivar tenga **eje propio** —un campo de archivado, jamás `stage`— y signifique lo mismo en
  las tres entidades, con las 32 filas ya escritas migradas a ese eje antes de que el `CHECK` de
  `TASK-1765` las vuelva irrepresentables.
- Que las nueve huérfanas se borren o se descarte el borrado de forma explícita y registrada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-22 — ADR del vocabulario de etapas y desenlace

Se aceptó `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (`Accepted`), primer ADR del vocabulario del pipeline. Fija **dos ejes**:
`stage` = dónde va la persona en el recorrido (6 valores, uno por columna; `closed` se queda y **es
escribible**) y **desenlace** = cómo terminó (`selected`, `backup_selected`, `not_selected`, `rejected`,
`withdrawn`, `unresponsive`) + **causa gobernada** obligatoria en `not_selected` (`capacity_filled`,
`opening_closed`, `process_cancelled`). Invariante como `CHECK`: **`stage='closed'` ⟺ desenlace declarado**.
El eje de desenlace lo implementa `TASK-1765`; la superficie del kanban, `TASK-1766`; el embudo de equidad,
`TASK-1767`.

**Su Slice 2 embarca hoy el anti-patrón que el ADR prohíbe — es la corrección más urgente del barrido.**

El Slice 2 y sus Acceptance Criteria dicen que `archiveSyntheticRecords` escribe *«postulación a `closed`»*.
El ADR §5 y §12 lo prohíben explícitamente: **NUNCA archivar un registro escribiendo `closed`. Archivar es
un eje aparte.** Ese mismo `UPDATE ... SET stage='closed'` (`src/lib/hiring/data-origin/purge.ts:173`) es el
origen de las 32 filas `closed` sin decisión que ensuciaron todo el diagnóstico.

**Correcciones:**

- El Slice 2 escribe un **campo de archivado propio** (`archived_at` o equivalente), **nunca `stage`**.
- La task **hereda migrar las 32 filas sintéticas** ya archivadas de `closed` al campo nuevo.
- **Cambia el orden:** ese trabajo va **ANTES** del `CHECK` de `TASK-1765`. Si el `CHECK` entra primero, la
  migración falla contra esas 32 filas.
- `Blocked by`: necesita el campo de archivado que define `TASK-1765`.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` (§5, §12)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Delta 2026-08-18 — procedencia)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **NUNCA archivar un registro escribiendo `stage='closed'`** (ADR §5 y §12). Archivar es un eje
  aparte: `stage` describe el recorrido de la persona y `closed` exige desenlace declarado. El
  archivado de un sintético no declara desenlace de nadie, así que no puede tocar ese campo.
- **La retención y el compliance siguen siendo CIEGOS a la procedencia**, y la procedencia **nunca
  gatea comunicaciones**: eso lo decide el consentimiento.
- **Nunca un DELETE físico de un asset** ni de una tabla append-only.
- **El borrado aborta la corrida completa** si una sola fila no califica; jamás "casi todo".
- El filtro nuevo se escribe con el predicado canónico de `src/lib/hiring/data-origin/contracts.ts`;
  ningún reader escribe su propio `WHERE` de procedencia.

## Normative Docs

- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` — ADR que
  supersede la definición de archivado de la spec madre (tres escrituras con `stage='closed'`).
- `docs/audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md` — evidencia de que las
  32 filas `closed` sin decisión las escribió este archivado.
- `docs/tasks/complete/TASK-1739-hiring-synthetic-data-provenance.md` — spec madre y su Delta de cierre.
- `docs/manual-de-uso/hr/operar-procedencia-de-datos-hiring.md`
- `docs/documentation/hr/procedencia-de-datos-hiring.md`

## Dependencies & Impact

### Depends on

- `TASK-1739` completa y en producción (release `30301816955f`, 2026-08-19).
- Columna `data_origin` + trigger de derivación + audit append-only, ya aplicados.
- `TASK-1765` — el campo de archivado propio (`archived_at` o equivalente) y el invariante
  `stage='closed'` ⟺ desenlace. El Slice 2 escribe ese campo; su migración de datos corre **antes**
  de que entre el `CHECK`.

### Blocks / Impacts

- El Banco de Talento servirá menos filas cuando el filtro entre; el efecto hoy es **cero** porque
  esas 11 ya están fuera por `needs_reconsent`.
- `TASK-1734` (gold set): sin impacto adicional — su exclusión ya opera sin flag.
- `TASK-1765`: su `CHECK stage='closed' ⟺ desenlace` **no puede entrar** mientras las 32 filas
  sintéticas sigan en `stage='closed'` sin desenlace. Esta task es su precondición de datos.

### Files owned

- `src/lib/hiring/talent-pool/readers.ts`
- `src/lib/hiring/talent-pool/projection.ts`
- `src/lib/hiring/data-origin/purge.ts` (+ tests)
- `scripts/hiring/purge-synthetic-hiring-data.ts`
- `migrations/<timestamp>_task-1748-synthetic-archive-axis-backfill.sql` (migración de datos de las
  32 filas; el DDL del campo de archivado es de `TASK-1765`)

## Current Repo State

### Already exists

- Contrato de procedencia completo y en producción: columna, trigger, audit, señal de divergencia,
  gate de CI, CLIs de marcado y purga, triple documentación.
- `archiveSyntheticRecords` y `deleteOrphanSyntheticRecords` con preflight de 10 dependientes.
- Datos ya marcados: 22 vacantes, 22 demandas, 11 personas, 32 postulaciones.

### Gap

- `talent-pool/readers.ts` y `talent-pool/projection.ts` sin filtro de procedencia (verificado por
  ausencia de `data_origin` en ambos archivos).
- `archiveSyntheticRecords` escribe sólo sobre `hiring_application`, y lo hace en el campo
  equivocado: `UPDATE … SET stage = 'closed'` (`src/lib/hiring/data-origin/purge.ts:173`), que el ADR
  prohíbe explícitamente.
- 32 postulaciones sintéticas ya quedaron archivadas por esa vía: `stage='closed'` y `decision IS
  NULL`, es decir violando el invariante que `TASK-1765` va a imponer como `CHECK`.
- No existe todavía campo de archivado en `hiring_application` (verificado contra el DDL vigente:
  `migrations/20260707235655376_task-353-hiring-ats-domain-foundation.sql:144-184` no lo declara).
- Nueve postulaciones huérfanas sin decisión de borrado.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/hiring/**` + `scripts/hiring/**`, runtime Next.js de Vercel y CLI local.
- Future candidate home: `domain-package`
- Boundary: el primitive sigue siendo `src/lib/hiring/data-origin/`; los readers del talent pool lo
  consumen, no reimplementan el predicado.
- Server/browser split: módulos `server-only`; no cruzan al bundle de cliente.
- Build impact: `none`
- Extraction blocker: el archivado cruza `greenhouse_hiring` y `greenhouse_core` en una transacción.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_hiring.talent_pool_membership` + `candidate_facet` +
  `hiring_opening` (estados) + el campo de archivado de `hiring_application` (`TASK-1765`), con la
  procedencia heredada por JOIN.
- Consumidores afectados: Banco de Talento (desk y provider MCP read-only), CLI de purga.
- Runtime target: `production` (readers) + `local` (CLI)

### Contract surface

- Contrato existente a respetar: `realOnlyPredicate` de `data-origin/contracts.ts`;
  `archiveSyntheticRecords` / `deleteOrphanSyntheticRecords`.
- Contrato nuevo o modificado: parámetro `includeSynthetic` en los readers del talent pool; el
  archivado pasa a escribir las tres entidades y **cambia de eje en la postulación**: del `stage` al
  campo de archivado propio que define `TASK-1765`.
- Backward compatibility: `compatible` — el filtro llega detrás del flag ya existente
  `HIRING_SYNTHETIC_DATA_FILTER_ENABLED`, hoy ON.
- Full API parity: el predicado es único y compartido; el MCP read-only lo hereda por construcción.

### Data model and invariants

- Entidades afectadas: `talent_pool_membership`, `candidate_facet`, `hiring_opening`,
  `hiring_application`, `hiring_data_origin_audit`.
- Invariantes que no se pueden romper:
  - **Archivar NUNCA escribe `stage`.** El registro sintético se archiva en su campo propio; `stage`
    sigue describiendo el recorrido de la persona (ADR §5, §12).
  - Tras la migración, **cero postulaciones no-real en `stage='closed'`**: es la precondición de
    datos del `CHECK` de `TASK-1765`.
  - La invisibilidad de un sintético debe derivar de `data_origin`, **no** de `lifecycle_status`.
  - El archivado escribe una fila de audit por entidad tocada, con actor y motivo.
  - El borrado exige cero dependientes sobre los 10 verificados y aborta la corrida completa.
  - Ningún reader escribe su propio `WHERE` de procedencia.
- Tenant/space boundary: sin cambios.
- Idempotency/concurrency: archivado y borrado en lotes de 1 con CAS; re-ejecutar es no-op.
- Audit/outbox/history: `hiring_data_origin_audit`, append-only, ya existente.

### Migration, backfill and rollout

- Migration posture: `additive` — el DDL del campo de archivado lo aporta `TASK-1765`; esta task
  aporta la **migración de datos** que mueve las 32 filas sintéticas de `stage='closed'` a ese campo.
- Default state: el filtro entra detrás del flag vigente, hoy ON en staging y producción.
- Backfill plan: las 32 filas sintéticas archivadas se migran al campo de archivado y su `stage`
  vuelve al valor previo que ya guardó `hiring_data_origin_audit.deleted_snapshot_json`
  (`->>'beforeStage'`, escrito por `purge.ts:186`); las que no tengan snapshot vuelven a `sourced` y
  quedan listadas en el readback. Corre **antes** del `CHECK` de `TASK-1765`. Además se completa el
  archivado de fichas y vacantes ya marcadas.
- Rollback path: revert del PR; el archivado se revierte devolviendo los estados desde el audit, y la
  migración de datos tiene su `down` que devuelve las 32 filas a su estado previo.
- External coordination: sign-off del CEO antes del lane B (única mutación irreversible).

### Security and access

- Auth/access gate: sin superficie nueva; el CLI opera con actor registrado.
- Sensitive data posture: `PII` — el plan imprime identificadores, nunca nombres ni correos.
- Error contract: los CLIs fallan loud en es-CL con `captureWithDomain`.
- Abuse/rate-limit posture: `none` — superficie no expuesta a internet.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/hiring/data-origin src/lib/hiring/talent-pool`, `pnpm local:check`.
- DB/runtime checks: confirmar que las 11 fichas sintéticas quedan fuera del Banco de Talento **por
  procedencia**, forzando una a un `lifecycle_status` servible en una transacción con ROLLBACK.
  Readback de la migración: `SELECT count(*) FROM greenhouse_hiring.hiring_application WHERE
  data_origin <> 'real' AND stage = 'closed'` debe dar `0`, y el conteo de sintéticas con el campo de
  archivado poblado debe dar `32`.
- Integration checks: sin provider externo en el camino.
- Reliability signals/logs: `hiring.data_quality.data_origin_derivation_drift` en steady 0.
- Production verification sequence: ver §Rollout.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no se llena al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Filtro de procedencia en el Banco de Talento

- `readers.ts` y `projection.ts` filtran por procedencia usando el predicado canónico, con
  `includeSynthetic` explícito y el mismo contrato que el desk.
- Test que prueba la exclusión **por procedencia** y no por ciclo de vida: forzar una ficha sintética
  a `pool_eligible` dentro de una transacción y verificar que igual no aparece.

### Slice 2 — Archivado sobre eje propio + migración de las 32 filas ya escritas

- `archiveSyntheticRecords` escribe las tres entidades, **con la postulación cambiada de eje**:
  postulación al **campo de archivado propio** (`archived_at` o equivalente, definido por
  `TASK-1765`) — **nunca `stage`** —, ficha a `archived`, vacante a `cancelled`, cada una con su
  fila de audit.
- Retirar del código el `UPDATE … SET stage = 'closed'` (`src/lib/hiring/data-origin/purge.ts:173`);
  la guarda de idempotencia, que hoy lee `row.stage === 'closed'` (`purge.ts:169`), pasa a leer el
  campo de archivado. El `deleted_snapshot_json` del audit deja de registrar
  `{beforeStage, afterStage}` y pasa a registrar el archivado real.
- **Migrar las 32 filas sintéticas ya archivadas**: poblar el campo de archivado y devolver `stage`
  al `beforeStage` que guardó `hiring_data_origin_audit.deleted_snapshot_json` (fallback `sourced`,
  listado explícito en el readback). Ninguna fila sintética queda en `stage='closed'`.
- Readback obligatorio dentro de la propia migración: bloque `DO` que aborta si queda alguna
  postulación no-real en `stage='closed'`, o si el conteo de archivadas por el campo nuevo no cuadra
  con lo migrado.
- Aplicar sobre lo ya marcado: 11 fichas y las vacantes sintéticas que sigan en `draft`/`active`.
- Actualizar el docstring de `archiveSyntheticRecords`, que hoy declara la deuda «archivar mueve
  `stage` a `closed` pero NO setea `decision`» (`purge.ts:138-147`): con el eje propio esa deuda
  desaparece y el texto debe decirlo, apuntando al ADR.

### Slice 3 — Decisión del lane B

- Dry-run del borrado y sign-off explícito del operador.
- Ejecutar el borrado de las huérfanas que califiquen, o registrar la decisión de no borrarlas con su
  razón. Ambas salidas son válidas; lo que no es válido es dejarlo indefinido.

## Out of Scope

- **Cambiar el criterio de retención** (Ley 21.719): es `TASK-1744` y la retención sigue ciega a la
  procedencia.
- **Capabilities `hiring.data_origin.mark`/`.purge`**: se declaran cuando exista superficie API o UI
  que las verifique; hoy darían falsa garantía.
- **Adaptar `verify-growth-forms-application-smoke.ts`**: sigue siendo follow-up de `TASK-1739`.
- **Implementar el eje de desenlace, el campo de archivado o su `CHECK`**: es `TASK-1765`. Acá sólo
  se consume el campo y se migran las filas sintéticas que hoy lo violan.
- **Separar bases por ambiente**: otro proyecto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `Slice 1` y `Slice 2` son independientes entre sí y pueden ir en cualquier orden.
- **Orden duro cross-task, no es preferencia:** el `Slice 2` (cambio de eje + migración de las 32
  filas) va **ANTES** de que entre el `CHECK stage='closed' ⟺ desenlace` de `TASK-1765`. Si el
  `CHECK` entra primero, **la migración falla contra esas 32 filas**: son exactamente las que violan
  el invariante. El único orden válido es `TASK-1765` crea el campo de archivado → este `Slice 2`
  migra y deja de escribir `stage` → `TASK-1765` aplica el `CHECK`.
- `Slice 3` va **al final**: es la única mutación irreversible y exige sign-off.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El filtro nuevo esconde una ficha real | hiring / talent pool | low | el predicado es el canónico ya probado; `real` es el default y un valor ilegible degrada a real | caída anómala del conteo del Banco de Talento |
| El archivado de vacantes rompe un reader que asume `draft` | hiring | low | los estados `cancelled`/`archived` ya existen en los CHECK vigentes | tests focales de hiring |
| El borrado del lane B destruye evidencia | hiring / assessment | low | preflight de 10 dependientes + aborto total de la corrida | el CLI aborta loud |
| El `CHECK` de `TASK-1765` entra antes de la migración | hiring / release | medium | orden duro declarado arriba; la migración del `CHECK` verifica primero que no queden no-real en `closed` | la migración del `CHECK` aborta contra las 32 filas |
| Una fila sin `beforeStage` en el audit queda con `stage` inventado | hiring | low | fallback explícito a `sourced` + listado en el readback, nunca silencioso | el readback enumera las filas con fallback |

### Feature flags / cutover

Sin flag nuevo: el filtro del talent pool entra detrás de `HIRING_SYNTHETIC_DATA_FILTER_ENABLED`, ya
existente y ON en staging y producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag a `false` + redeploy, o revert del PR | < 5 min | sí |
| Slice 2 | devolver los estados desde el audit, por registro (guarda `beforeStage`); la migración de las 32 filas se revierte con su `down` | < 5 min por registro | sí |
| Slice 3 | **no reversible** — por eso exige sign-off | sin retorno | **no** |

### Production verification sequence

1. Deploy con el flag ya ON; confirmar que el conteo del Banco de Talento no cambia (las 11 ya
   estaban fuera por ciclo de vida).
2. Forzar en una transacción con ROLLBACK una ficha sintética a `pool_eligible` y verificar que el
   filtro por procedencia la sigue excluyendo.
3. Aplicar la migración de las 32 filas y hacer readback: cero postulaciones no-real en
   `stage='closed'` y las 32 con el campo de archivado poblado.
4. Aplicar el archivado completo (ficha y vacante) y verificar los estados y el audit.
5. Sólo con ese readback en cero, habilitar la entrada del `CHECK` de `TASK-1765`.
6. Dry-run del lane B, sign-off, y aplicar o descartar con registro.

### Out-of-band coordination required

- Sign-off del operador antes del `Slice 3`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Execution log — 2026-08-22

### Estado: `code complete` para los Slices 1 y 2 · **rollout pendiente** · Slice 3 bloqueado

Commits: `1d0b4e32a` (Slice 1) · `b0415ef50` (correcciones del Slice 1) · `5fd8e5245` (Slice 2).

### Lo que cambió respecto de la spec, con su evidencia

1. **`Slice 1` y `Slice 2` NO son independientes.** La spec decía que podían ir en cualquier orden;
   es falso, y el orden importa en producción. La migración del Slice 2 devuelve las 32 filas
   sintéticas fuera de `stage='closed'`, y el predicado `stage NOT IN ('rejected','withdrawn','closed')`
   de `talent-pool/projection.ts` pasa entonces a dar `has_active_application = true` para sus 11
   fichas: la projection las reclasifica a `active_process`, que **sí** está en el `baseSelect`
   servible. El reconcile corre por Cloud Scheduler **cada 5 minutos**
   (`ops-hiring-talent-pool-reconcile`), así que la ventana es de ≤5 minutos hasta que 11 personas
   inventadas aparezcan en el Banco de Talento de un operador real. **El Slice 1 es precondición
   desplegada del Slice 2.**
2. **La migración de datos quedó PARQUEADA**, no en `migrations/`:
   `docs/tasks/pending-migrations/TASK-1748-synthetic-archive-axis-backfill.sql.pending`. Una
   migración committeada y sin aplicar bloquea a cualquiera que corra `pnpm migrate:up`, incluido
   quien esté reparando un incidente. Su condición de ejecución es el punto 1.
3. **Ninguna de las 32 filas necesita el fallback a `sourced`.** Las 32 tienen `beforeStage` en el
   audit (21 `shortlisted`, 10 `sourced`, 1 `screening`), verificado contra PG. El fallback se
   implementó igual y el readback lo enumera; su conteo esperado es 0.
4. **La spec decía «14 vacantes sintéticas siguen en `draft`». Son 13 en `draft` + 1 en
   `active`/`published`** (`EO-OPN-0101 CANARY T1736 interna`). Es `visibility=internal_only`, así que
   nunca estuvo en el careers público, pero sí es una vacante sintética viva y publicada. El
   archivado cierra su publicación junto con el estado.
5. **`candidate_facet` no tiene `data_origin`**: hereda de `identity_profiles`. Todo predicado de
   procedencia del talent pool viaja por JOIN a `ip`.
6. **El audit no podía nombrar la ficha.** El `CHECK` de `record_type` estaba cerrado en cuatro
   valores; sin ampliarlo, archivar una ficha revienta con `23514` en la fila de auditoría después de
   haber escrito el estado, y la transacción aborta. Migración aditiva aplicada y verificada:
   `migrations/20260822222315619_task-1748-audit-record-type-candidate-facet.sql`.
7. **El filtro de la projection NO va detrás del flag.** `HIRING_SYNTHETIC_DATA_FILTER_ENABLED` es
   Vercel-only y `reconcileTalentPoolProjection` corre en el `ops-worker` de Cloud Run: leerlo ahí lo
   encontraría `undefined`, o sea OFF en silencio. Hay un test que lo impide. Los readers sí lo
   respetan — corren en Vercel, donde el flag existe y está ON.
8. **Se filtran los caminos que CREAN; el que CORRIGE converge.** La primera versión excluía las
   membresías sintéticas del `UPDATE` de ciclo de vida, y eso no las excluía: las **congelaba**. Una
   congelada en `pool_eligible` habría quedado visible para siempre sin que ninguna corrida pudiera
   sacarla, y `eligible_without_consent` la habría marcado como `error` permanente. Ahora entra a la
   población y sale reclasificada.
9. **La señal `hiring.talent_pool.integrity` habría empezado a mentir.** Su contador
   `facets_without_membership` cuenta fichas activas «aún no proyectadas»; desde que la projection no
   proyecta sintéticos a propósito, esa premisa es falsa y la señal habría quedado en `warning`
   permanente. Ahora cuenta sólo población real. Los contadores de consentimiento y retiro **no** se
   filtran, a propósito.

### Hallazgo colateral — reportado, no cerrado

Dos perfiles de identidad claramente sintéticos están marcados `real` en la base compartida:
`identity-live-test-hiring-fixture` (el fixture canónico de todos los live tests de Hiring) y
`identity-public-careers-candidate-smoke-task354-…-invalid`. Hoy no tienen `candidate_facet`, así que
no hay exposición — pero el fixture la fabrica en cuanto un live test lo use. El código ya declara
`data_origin='smoke_test'` en el nacimiento (`live-test-identity.ts`); **las dos filas existentes
esperan el marcado gobernado** (`pnpm hiring:data:mark-synthetic`), que deja audit con actor y motivo.
Es la misma clase de bug que `TASK-1755` dejó propuesta para las vacantes.

### Corrida accidental contra producción, declarada

Al ejercitar el SQL nuevo se envolvió `reconcileTalentPoolProjection({ apply: true })` en un
`withGreenhousePostgresTransaction` externo creyendo que se revertiría. **No se revirtió**: el helper
abre su propia conexión, así que el reconcile **commiteó** contra la base compartida. Efecto real
medido: idéntico a un tick del cron —441 filas de evidencia borradas y reinsertadas con el mismo
contenido, 0 membresías creadas, 0 reclasificadas, un evento de outbox—. Verificado post-corrida: 441
filas de evidencia intactas y la población sin cambios. Sin daño, pero la lección va acá porque se
repite: **anidar transacciones en este repo no aísla nada.**

### Verificación ejecutada

- `pnpm vitest run src/lib/hiring/data-origin src/lib/hiring/talent-pool` → 41 verdes.
- Live test contra PG real, **3 corridas consecutivas verdes** y estado restaurado:
  `src/lib/hiring/talent-pool/data-origin.live.test.ts`.
- Todo el SQL nuevo ejercitado contra PG real (plan de purga, señal de integridad, projection en
  `dry-run` y en `apply`).
- `pnpm typecheck` → 0 errores. `npx eslint` sobre lo tocado → 0 findings.
- Readback de la migración aplicada: el `CHECK` de `record_type` admite `candidate_facet`.

### Pendiente de rollout

| Paso | Bloqueado por |
|---|---|
| Desplegar Slice 1 y 2 a producción (Vercel + `ops-worker`) | release normal |
| Aplicar la migración parqueada de las 32 filas | el paso anterior |
| Aplicar el archivado de 11 fichas + 14 vacantes por el CLI | decisión del operador (escritura sobre la base compartida) |
| `Slice 3` — lane B | **doble bloqueo**: sign-off del operador **y** la migración parqueada. Hoy el plan reporta `deletable=0` porque las 32 siguen en `closed` y el lane exige `stage='sourced'`; las 10 que califican sólo reaparecen cuando la migración restaure sus etapas |

## Acceptance Criteria

- [x] `readers.ts` y `projection.ts` del talent pool excluyen no-real por defecto y aceptan
      `includeSynthetic`, usando el predicado canónico y sin `WHERE` propio. (La projection no acepta
      `includeSynthetic` ni lee el flag **a propósito**: corre en Cloud Run — ver punto 7 del log.)
- [x] Existe un test que prueba la exclusión **por procedencia**: una ficha sintética forzada a un
      `lifecycle_status` servible sigue sin aparecer. (`data-origin.live.test.ts`, contra PG real.)
- [x] `archiveSyntheticRecords` escribe las tres entidades y deja una fila de audit por cada una, y
      **ningún camino de la función escribe `hiring_application.stage`** (test que lo prueba).
- [ ] Tras el archivado, cero fichas sintéticas en `active` y cero vacantes sintéticas en
      `draft`/`active`. **Código listo; la corrida del CLI espera decisión del operador** (escribe
      sobre la base compartida mientras otras sesiones corren live tests).
- [ ] Las 32 filas sintéticas archivadas quedaron migradas al campo de archivado y **cero
      postulaciones no-real siguen en `stage='closed'`**, verificado por readback contra PG real.
      **Migración escrita y parqueada**; su condición es el Slice 1 desplegado.
- [ ] La migración corrió **antes** de que entrara el `CHECK stage='closed' ⟺ desenlace` de
      `TASK-1765`, y ese orden quedó registrado en el `Handoff.md`.
- [ ] El lane B quedó ejecutado o explícitamente descartado, con su razón registrada.
- [x] `hiring.data_quality.data_origin_derivation_drift` sigue en `0`. Además
      `hiring.talent_pool.integrity` queda en `ok` con sus tres contadores en 0, verificado en vivo.
- [x] Ningún camino de esta task filtra retención por procedencia ni gatea comunicaciones. Al
      contrario: los contadores de consentimiento y retiro de la señal se dejaron SIN filtrar a
      propósito, y queda escrito por qué.

## Verification

- `pnpm vitest run src/lib/hiring/data-origin src/lib/hiring/talent-pool`
- `pnpm local:check`
- `pnpm test`
- Verificación en vivo del filtro por procedencia con la transacción de ROLLBACK.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado si hubo aprendizajes o deuda
- [ ] `changelog.md` actualizado si cambió comportamiento visible
- [ ] chequeo de impacto cruzado sobre otras tasks
- [ ] el Delta de cierre de `TASK-1739` queda actualizado apuntando a esta task como resuelta
- [ ] `TASK-1765` quedó avisada de que su `CHECK` ya tiene la precondición de datos cumplida

## Follow-ups

- Adaptar `verify-growth-forms-application-smoke.ts` (follow-up heredado de `TASK-1739`).
- Declarar las capabilities de procedencia cuando aterrice una superficie API/UI.
- **Extender `hiring:data-origin-gate` a `src/**/*.live.test.ts` + arreglar los 12 fixtures que
  nacen `real`.** El gate barre sólo `scripts/` y `tests/e2e/`, y 12 live tests de hiring llaman
  `createHiringOpening` sin declarar `dataOrigin`: nacen `real` y publicables en la base compartida.
  Detectado por `TASK-1755` y confirmado acá con dos casos más, de identidad: los perfiles
  `identity-live-test-hiring-fixture` y `identity-public-careers-candidate-smoke-task354-…-invalid`
  están marcados `real`. El código del primero ya declara `smoke_test` en el nacimiento
  (`live-test-identity.ts`); **las filas existentes esperan `pnpm hiring:data:mark-synthetic`**, que
  deja audit con actor y motivo. Es el mismo bug class que esta task cierra en el read path, del lado
  del write path — merece ID propio porque toca 12 archivos de otros dueños.
