# TASK-1409 — Event Catalog Decomposition and Current-State Router

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|data|ops`
- Blocked by: `none`
- Branch: `task/TASK-1409-event-catalog-decomposition`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Descomponer `GREENHOUSE_EVENT_CATALOG_V1.md`, hoy un catalogo canonico de mas de 1.200 lineas con deltas acumulados, en un router estable, documentos vigentes por dominio y un historial separado. Mantener compatibilidad de enlaces y agregar gates que prueben que ningun contrato de evento se pierde durante la extraccion.

## Why This Task Exists

El closure checker ya emite `architecture_doc_monolith`: el catalogo mezcla current state con decenas de deltas historicos. Esa forma aumenta el costo de encontrar el contrato vigente, facilita contradicciones y vuelve riesgosa cada edicion sobre un documento consumido por cientos de referencias. El warning es historico, pero la deuda es real y merece una migracion gobernada, no silenciar el umbral.

## Goal

- Dejar una entrada canonica corta que enrute al contrato vigente de cada dominio.
- Separar current state de cronologia sin cambiar nombres, payloads ni semantica de eventos.
- Mecanizar integridad de enlaces, cobertura del inventario y ausencia de regrowth monolitico.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md`

Reglas obligatorias:

- El path `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` sigue siendo la entrada canonica y no se elimina.
- La extraccion es behavior-preserving: no renombra eventos, no cambia payloads, owners, compatibilidad ni semantica outbox/webhook.
- Current state y cronologia quedan separados; ningun delta historico se presenta como contrato vigente.
- Los consumidores runtime siguen gobernados por `src/lib/sync/event-catalog.ts`; esta task no modifica ese catalogo de codigo.

## Normative Docs

- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`

## Dependencies & Impact

### Depends on

- `scripts/check-documentation-closure.mjs`, que detecta el smell `architecture_doc_monolith`.
- El inventario vigente de headings y contratos de `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.
- Las referencias entrantes al catalogo desde arquitectura, tasks, epics, manuales, documentacion funcional y codigo.

### Blocks / Impacts

- Reduce deuda transversal para cualquier task que agregue o consulte eventos outbox, webhooks o projections.
- Cambia la navegacion documental, no el runtime de eventos.

### Files owned

- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/events/**` (nuevo arbol tematico)
- `scripts/check-documentation-closure.mjs`
- `scripts/ci/__tests__/**` (test focal de integridad documental)

## Current Repo State

### Already exists

- Un catalogo canonico con contratos vigentes y deltas historicos en un unico archivo.
- El precedente router + temas + `HISTORIAL.md` bajo `docs/architecture/ui-platform/`.
- Un warning generico que dispara con ocho o mas deltas y mas de 1.200 lineas.
- Mas de 300 referencias al path canonico, que obligan a preservar compatibilidad.

### Gap

- No existe router tematico para eventos ni separacion entre current state e historial.
- No hay test que compare el inventario de eventos antes/despues de una reestructuracion documental.
- El warning detecta el monolito, pero no valida que la estructura extraida permanezca sana.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `docs/architecture/` para contratos y `scripts/check-documentation-closure.mjs` para governance
- Future candidate home: `remain-shared`
- Boundary: `GREENHOUSE_EVENT_CATALOG_V1.md` permanece como router estable; documentos tematicos son current state y `events/HISTORIAL.md` conserva cronologia
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: las referencias entrantes al path canonico y la necesidad de preservar cobertura exacta del inventario de eventos

## Backend/Data Contract

- Backend rigor: `n/a` — task documental/tooling sin cambio de comportamiento.
- Source of truth: no cambia; `src/lib/sync/event-catalog.ts` y los productores runtime permanecen intactos.
- Contract surface: solo navegacion y estructura de documentacion arquitectonica.
- Data/schema/migration: `none`; no hay DDL, backfill ni acceso a DB.
- API/command/reader/integration: `none`.
- Access/security/audit/signals: sin cambios; el diff guard debe confirmar ausencia de archivos runtime.
- Runtime evidence: `n/a`; la evidencia exigida es igualdad del inventario documental, links validos y tests del checker.

<!-- ZONE 2 — PLAN MODE -->

<!-- El agente que toma esta task ejecuta Discovery y produce el plan. -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Inventory and decomposition map

- Capturar un inventario mecanico de eventos, aliases, owners y secciones vigentes antes de mover contenido.
- Clasificar cada bloque como current state o historia y definir grupos por bounded context, sin duplicar contratos.

### Slice 2 — Stable router and thematic current state

- Convertir `GREENHOUSE_EVENT_CATALOG_V1.md` en router e indice durable.
- Crear `docs/architecture/events/README.md`, documentos vigentes por dominio y `docs/architecture/events/HISTORIAL.md`.
- Mantener en el router las invariantes globales de naming, envelope, compatibilidad y relacion con outbox/webhooks.

### Slice 3 — Reference and decision migration

- Actualizar `DECISIONS_INDEX.md` y referencias que necesiten deep links al nuevo current state.
- Preservar enlaces generales al router y verificar que no queden anchors rotos de alto trafico.

### Slice 4 — Governance and regression tests

- Extender el closure checker para reconocer la estructura extraida y detectar regrowth del router.
- Agregar tests de cobertura del inventario, destinos existentes, headings unicos y ausencia de contratos perdidos.

## Out of Scope

- Cambiar `src/lib/sync/event-catalog.ts` o cualquier productor/consumer runtime.
- Renombrar eventos, modificar payloads, versiones, owners o reglas de compatibilidad.
- Migraciones DB, replay de outbox, cambios de webhook o nuevas capabilities.
- Reestructurar otros documentos monoliticos en la misma task.

## Detailed Spec

El router debe responder en menos de una pantalla conceptual: invariantes globales, mapa de dominios, owner y enlace al current state. Cada evento debe tener una unica definicion vigente. El historial puede mencionar nombres antiguos, pero debe enlazar al contrato actual cuando siga activo. Antes y despues de la extraccion se genera el mismo conjunto normalizado de nombres de evento; cualquier diferencia exige una decision explicita y queda fuera de esta task.

La agrupacion inicial debe derivarse del catalogo real durante Discovery. No se crean documentos por cada evento ni un arbol tan granular que empeore la navegacion. El gate debe fallar si el router vuelve a superar el umbral acordado, si un destino registrado no existe o si un evento vigente desaparece del indice.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- El inventario baseline debe existir antes de mover contenido; el gate final se escribe contra el resultado aprobado, no contra una lista inventada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se pierde o contradice un contrato vigente | architecture/events | medium | inventario before/after + definicion unica | test de cobertura falla |
| Se rompen referencias profundas | documentation | medium | scan de enlaces/anchors + router compatible | link check falla |
| El router vuelve a crecer como changelog | governance | medium | limite mecanizado + historial canonico | `architecture_doc_monolith` o gate de regrowth |
| El refactor cambia runtime por accidente | outbox/runtime | low | scope docs/tooling y diff guard sobre `src/lib/sync/event-catalog.ts` | archivo runtime aparece en diff |

### Feature flags / cutover

- Sin flag: cambio documental/tooling aditivo, sin impacto de produccion.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | eliminar artefacto de inventario si es incorrecto | <5 min | si |
| 2 | revertir el commit de extraccion y restaurar el monolito | <10 min | si |
| 3 | revertir referencias al router estable | <10 min | si |
| 4 | revertir gate/test junto con la estructura | <10 min | si |

### Production verification sequence

1. Ejecutar inventario baseline y guardar conteos.
2. Aplicar extraccion y comprobar igualdad del conjunto de eventos.
3. Ejecutar link/anchor checks y tests del closure checker.
4. Ejecutar task/docs/ops gates y revisar el diff final para confirmar cero runtime changes.

### Out-of-band coordination required

- N/A — cambio repo-only; no requiere deploy, flag, DB ni coordinacion externa.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` es un router estable y queda bajo el umbral acordado de regrowth.
- [ ] Cada evento vigente del baseline aparece exactamente una vez en el current state extraido.
- [ ] Los contratos globales de envelope, naming, ownership y compatibilidad siguen accesibles desde el router.
- [ ] Existe `docs/architecture/events/HISTORIAL.md` y los deltas historicos ya no viven en el router.
- [ ] Las referencias generales siguen resolviendo y los deep links migrados no tienen destinos rotos.
- [ ] El closure checker y su test detectan router monolitico, destino inexistente y evento perdido.
- [ ] `src/lib/sync/event-catalog.ts`, migraciones y runtime outbox/webhook quedan fuera del diff.

## Verification

- `pnpm task:lint --task TASK-1409`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- test focal del closure checker registrado en `package.json`
- scan mecanico de links y comparacion del inventario before/after
- `git diff --name-only` confirma ausencia de cambios runtime

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedaron sincronizados.
- [ ] `Handoff.md` y `changelog.md` documentan la nueva estructura y su gate.
- [ ] `docs/architecture/DECISIONS_INDEX.md` apunta al router y current state correctos.
- [ ] Se ejecuto chequeo de impacto cruzado sobre las referencias entrantes.

## Follow-ups

- Evaluar otros `architecture_doc_monolith` solo despues de cerrar esta migracion como precedente reusable.

## Open Questions

- La cantidad final de documentos tematicos se decide con el inventario de Slice 1; preferir bounded contexts estables sobre un archivo por evento.
