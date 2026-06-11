# TASK-1084 — Human Knowledge Center MVP

## Delta 2026-06-11

Naming/ruta/audiencia **cerrados por TASK-1080**:

- Surface humana = **Knowledge**, ruta única **`/knowledge`** (se descartan `/learn` y `/academy`). Ya no hace falta "confirmar nombre con operador".
- Gating: viewCode **`plataforma.knowledge`** (routeGroup `internal`) + capability `knowledge.document.read`. MVP **solo interno** (defensive redirect si `tenantType==='client'`).
- Estados a mostrar: `publication_status` (lifecycle, con badge `stale`/`deprecated`) + `agentic_policy` ortogonal (un doc puede ser `agent_excluded`).
- Ruta de aprendizaje inicial: **"Operación Greenhouse — Primeros pasos"** (docs #1, #3, #6, #7, #9, #10 del corpus piloto; ver arquitectura Delta tabla C).
- **Corpus ya ingerido (TASK-1082, 2026-06-11):** hay contenido real en `greenhouse_knowledge` en dev (11 docs publicados + 263 chunks) — el Knowledge Center se construye contra datos reales, no fixtures. Esta task SÍ siembra el viewCode `plataforma.knowledge` + la migración seed (gobernanza TASK-827) + la página `/knowledge`, que TASK-1081 difirió a aquí.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|content|ui|identity`
- Blocked by: `TASK-1081`
- Branch: `task/TASK-1084-human-knowledge-center`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el MVP humano de Knowledge Platform: una surface interna para navegar, buscar y leer conocimiento publicado con rutas de aprendizaje, status/freshness, fuentes, feedback y enlaces contextuales básicos. No debe parecer un dump de Notion.

## Why This Task Exists

La capa humana es tan importante como Nexa: si solo hay RAG, las personas no aprenden ni pueden corregir fuentes. Greenhouse necesita un centro de conocimiento legible y operativo para transformar documentación en memoria de producto.

## Goal

- Crear la primera surface interna de Knowledge Center.
- Mostrar documentos publicados con metadata de owner, freshness, source y status.
- Capturar feedback humano y enlazar manuales/contextual help.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- UI visible requiere skills UI aplicables y GVC.
- Debe usar view/capability model definido por `TASK-1080`.
- No crear copies reusables hardcodeadas en JSX.
- La surface es interna en MVP salvo decisión contraria.

## Normative Docs

- `docs/tasks/to-do/TASK-1080-knowledge-platform-acceptance-pilot-taxonomy.md`
- `docs/tasks/to-do/TASK-1081-knowledge-core-schema-source-registry.md`
- `docs/tasks/to-do/TASK-1083-knowledge-search-api-golden-questions.md`

## Dependencies & Impact

### Depends on

- `TASK-1081` para documentos/versiones.
- `TASK-1083` si la búsqueda humana consume el mismo search API.

### Blocks / Impacts

- Alimenta contextual help y feedback para `TASK-1085`.

### Files owned

- `src/app/(dashboard)/knowledge/**`
- `src/views/greenhouse/knowledge/**`
- `src/lib/copy/knowledge.ts`
- `scripts/frontend/scenarios/*knowledge*.ts`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- Ruta decidida por TASK-1080: **`/knowledge`** (se descartan `/learn` y `/academy`).
- No hay surface Knowledge Center runtime.

### Gap

- Humanos no tienen una superficie Greenhouse para aprender, buscar o corregir conocimiento publicado.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Internal browse/search/read

- Route interna decidida por `TASK-1080`.
- Listado/search, filtros por tipo/ruta/audience/status y vista detalle.
- Metadata visible: owner, last reviewed, freshness, source, status.

### Slice 2 — Learning paths + contextual help hooks

- Mostrar rutas de aprendizaje iniciales.
- Definir helper/link contract para que features apunten a manuales publicados.
- Empty/degraded states legibles.

### Slice 3 — Human feedback

- Feedback `useful`, `not_useful`, `stale`, `missing_doc`, `wrong_source`.
- Persistir feedback en `knowledge_feedback` o helper de `TASK-1081`.

## Out of Scope

- Client-facing knowledge center, rich authoring UI, Notion editing, Nexa answer generation.

## Detailed Spec

Usar composición enterprise densa y escaneable. La primera pantalla debe ser el producto usable, no landing. Para documentos stale/deprecated, la UI debe mostrar warning honesto sin ocultar la fuente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (browse/read) -> Slice 2 (learning/contextual help) -> Slice 3 (feedback). GVC en cada slice visible.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI se vuelve dump de Notion | content/ui | medium | learning paths + metadata + doc types | feedback negativo |
| Cliente ve docs internos | identity | medium | route/view internal-only + defensive redirect | access test falla |

### Feature flags / cutover

- MVP internal-only behind view/capability. No cliente-facing.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | quitar nav/view route | <10 min | sí |
| 2 | ocultar learning path/context links | <10 min | sí |
| 3 | ocultar feedback UI | <10 min | sí |

### Production verification sequence

1. Access check interno vs cliente.
2. GVC desktop/mobile.
3. Search/read smoke con corpus piloto.
4. Feedback smoke.

### Out-of-band coordination required

- Nombre/ruta ya cerrados por `TASK-1080` (**Knowledge** / `/knowledge`). Sin coordinación pendiente en este punto.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [ ] Surface interna permite browse/search/read de docs publicados.
- [ ] Status, source, owner, last reviewed y freshness son visibles.
- [ ] Rutas de aprendizaje iniciales existen.
- [ ] Feedback humano queda persistido o trazado.
- [ ] GVC desktop/mobile revisado.
- [ ] Documentación funcional y manual de uso quedan actualizadas.

## Verification

- `pnpm local:check:ui`
- `pnpm fe:capture` para route Knowledge Center
- tests focales de access/feedback
- `pnpm task:lint --task TASK-1084`
- `pnpm docs:closure-check --staged`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [ ] `Handoff.md` actualizado con route/access/GVC evidence.
- [ ] `changelog.md` actualizado.
- [ ] Chequeo de impacto sobre contextual help y Nexa.

## Follow-ups

- Client-facing version si el MVP interno funciona.
