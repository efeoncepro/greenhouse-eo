# TASK-1748 — Cierre de deuda de procedencia: filtro del talent pool, archivado completo y purga del lane B

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`TASK-1739` dejó la procedencia de datos operando en producción, pero con tres piezas sin cerrar que
hoy **no tienen efecto visible** y por eso no justificaron un release propio. Esta task las cierra:
el filtro de procedencia en los readers del Banco de Talento, el archivado completo de fichas y
vacantes, y el lane de borrado de las postulaciones huérfanas.

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
2. **El lane de archivado quedó parcial.** La spec definía archivar como tres escrituras
   —`hiring_application.stage='closed'`, `candidate_facet.status='archived'`,
   `hiring_opening.status='cancelled'`— y `archiveSyntheticRecords`
   (`src/lib/hiring/data-origin/purge.ts`) sólo hace la primera. Por eso las 11 fichas sintéticas
   siguen `active` y 14 vacantes sintéticas siguen en `draft`.
3. **El lane B de la purga no se ejecutó.** Nueve postulaciones huérfanas califican para borrado
   (cero dependientes, `stage='sourced'`); las otras 23 no pueden borrarse porque tienen assessments
   o evidencia append-only. La decisión de borrarlas es humana y sigue pendiente.

## Goal

- Que la invisibilidad de un dato sintético dependa de **su procedencia declarada**, no de un estado
  de ciclo de vida que podría cambiar.
- Que archivar signifique lo mismo en las tres entidades que la spec definió.
- Que las nueve huérfanas se borren o se descarte el borrado de forma explícita y registrada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Delta 2026-08-18 — procedencia)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **La retención y el compliance siguen siendo CIEGOS a la procedencia**, y la procedencia **nunca
  gatea comunicaciones**: eso lo decide el consentimiento.
- **Nunca un DELETE físico de un asset** ni de una tabla append-only.
- **El borrado aborta la corrida completa** si una sola fila no califica; jamás "casi todo".
- El filtro nuevo se escribe con el predicado canónico de `src/lib/hiring/data-origin/contracts.ts`;
  ningún reader escribe su propio `WHERE` de procedencia.

## Normative Docs

- `docs/tasks/complete/TASK-1739-hiring-synthetic-data-provenance.md` — spec madre y su Delta de cierre.
- `docs/manual-de-uso/hr/operar-procedencia-de-datos-hiring.md`
- `docs/documentation/hr/procedencia-de-datos-hiring.md`

## Dependencies & Impact

### Depends on

- `TASK-1739` completa y en producción (release `30301816955f`, 2026-08-19).
- Columna `data_origin` + trigger de derivación + audit append-only, ya aplicados.

### Blocks / Impacts

- El Banco de Talento servirá menos filas cuando el filtro entre; el efecto hoy es **cero** porque
  esas 11 ya están fuera por `needs_reconsent`.
- `TASK-1734` (gold set): sin impacto adicional — su exclusión ya opera sin flag.

### Files owned

- `src/lib/hiring/talent-pool/readers.ts`
- `src/lib/hiring/talent-pool/projection.ts`
- `src/lib/hiring/data-origin/purge.ts` (+ tests)
- `scripts/hiring/purge-synthetic-hiring-data.ts`

## Current Repo State

### Already exists

- Contrato de procedencia completo y en producción: columna, trigger, audit, señal de divergencia,
  gate de CI, CLIs de marcado y purga, triple documentación.
- `archiveSyntheticRecords` y `deleteOrphanSyntheticRecords` con preflight de 10 dependientes.
- Datos ya marcados: 22 vacantes, 22 demandas, 11 personas, 32 postulaciones.

### Gap

- `talent-pool/readers.ts` y `talent-pool/projection.ts` sin filtro de procedencia (verificado por
  ausencia de `data_origin` en ambos archivos).
- `archiveSyntheticRecords` escribe sólo sobre `hiring_application`.
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
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_hiring.talent_pool_membership` + `candidate_facet` +
  `hiring_opening` (estados), con la procedencia heredada por JOIN.
- Consumidores afectados: Banco de Talento (desk y provider MCP read-only), CLI de purga.
- Runtime target: `production` (readers) + `local` (CLI)

### Contract surface

- Contrato existente a respetar: `realOnlyPredicate` de `data-origin/contracts.ts`;
  `archiveSyntheticRecords` / `deleteOrphanSyntheticRecords`.
- Contrato nuevo o modificado: parámetro `includeSynthetic` en los readers del talent pool; el
  archivado pasa a escribir las tres entidades.
- Backward compatibility: `compatible` — el filtro llega detrás del flag ya existente
  `HIRING_SYNTHETIC_DATA_FILTER_ENABLED`, hoy ON.
- Full API parity: el predicado es único y compartido; el MCP read-only lo hereda por construcción.

### Data model and invariants

- Entidades afectadas: `talent_pool_membership`, `candidate_facet`, `hiring_opening`,
  `hiring_application`, `hiring_data_origin_audit`.
- Invariantes que no se pueden romper:
  - La invisibilidad de un sintético debe derivar de `data_origin`, **no** de `lifecycle_status`.
  - El archivado escribe una fila de audit por entidad tocada, con actor y motivo.
  - El borrado exige cero dependientes sobre los 10 verificados y aborta la corrida completa.
  - Ningún reader escribe su propio `WHERE` de procedencia.
- Tenant/space boundary: sin cambios.
- Idempotency/concurrency: archivado y borrado en lotes de 1 con CAS; re-ejecutar es no-op.
- Audit/outbox/history: `hiring_data_origin_audit`, append-only, ya existente.

### Migration, backfill and rollout

- Migration posture: `none` — additive sobre contrato ya desplegado, sin cambio de schema.
- Default state: el filtro entra detrás del flag vigente, hoy ON en staging y producción.
- Backfill plan: no hay backfill nuevo; se completa el archivado de lo ya marcado.
- Rollback path: revert del PR; el archivado se revierte devolviendo los estados desde el audit.
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

### Slice 2 — Archivado completo

- `archiveSyntheticRecords` escribe las tres entidades de la spec: postulación a `closed`, ficha a
  `archived`, vacante a `cancelled`, cada una con su fila de audit.
- Aplicar sobre lo ya marcado: 11 fichas y las vacantes sintéticas que sigan en `draft`/`active`.

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
- **Separar bases por ambiente**: otro proyecto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `Slice 1` y `Slice 2` son independientes y pueden ir en cualquier orden.
- `Slice 3` va **al final**: es la única mutación irreversible y exige sign-off.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El filtro nuevo esconde una ficha real | hiring / talent pool | low | el predicado es el canónico ya probado; `real` es el default y un valor ilegible degrada a real | caída anómala del conteo del Banco de Talento |
| El archivado de vacantes rompe un reader que asume `draft` | hiring | low | los estados `cancelled`/`archived` ya existen en los CHECK vigentes | tests focales de hiring |
| El borrado del lane B destruye evidencia | hiring / assessment | low | preflight de 10 dependientes + aborto total de la corrida | el CLI aborta loud |

### Feature flags / cutover

Sin flag nuevo: el filtro del talent pool entra detrás de `HIRING_SYNTHETIC_DATA_FILTER_ENABLED`, ya
existente y ON en staging y producción.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag a `false` + redeploy, o revert del PR | < 5 min | sí |
| Slice 2 | devolver los estados desde el audit, por registro | < 5 min por registro | sí |
| Slice 3 | **no reversible** — por eso exige sign-off | sin retorno | **no** |

### Production verification sequence

1. Deploy con el flag ya ON; confirmar que el conteo del Banco de Talento no cambia (las 11 ya
   estaban fuera por ciclo de vida).
2. Forzar en una transacción con ROLLBACK una ficha sintética a `pool_eligible` y verificar que el
   filtro por procedencia la sigue excluyendo.
3. Aplicar el archivado completo y verificar los estados y el audit.
4. Dry-run del lane B, sign-off, y aplicar o descartar con registro.

### Out-of-band coordination required

- Sign-off del operador antes del `Slice 3`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `readers.ts` y `projection.ts` del talent pool excluyen no-real por defecto y aceptan
      `includeSynthetic`, usando el predicado canónico y sin `WHERE` propio.
- [ ] Existe un test que prueba la exclusión **por procedencia**: una ficha sintética forzada a un
      `lifecycle_status` servible sigue sin aparecer.
- [ ] `archiveSyntheticRecords` escribe las tres entidades y deja una fila de audit por cada una.
- [ ] Tras el archivado, cero fichas sintéticas en `active` y cero vacantes sintéticas en
      `draft`/`active`.
- [ ] El lane B quedó ejecutado o explícitamente descartado, con su razón registrada.
- [ ] `hiring.data_quality.data_origin_derivation_drift` sigue en `0`.
- [ ] Ningún camino de esta task filtra retención por procedencia ni gatea comunicaciones.

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

## Follow-ups

- Adaptar `verify-growth-forms-application-smoke.ts` (follow-up heredado de `TASK-1739`).
- Declarar las capabilities de procedencia cuando aterrice una superficie API/UI.
