# TASK-1554 — Globe Producer Model Fleet Availability Projection

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Backend impact: `reader`
- Epic: `EPIC-028`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1554-globe-producer-fleet-availability-projection`
- Legacy ID: `none`

## Summary

Expone la **flota completa de modelos de Globe como dato gobernado y availability-aware**: un projection/reader
server-authoritative que, por capacidad, lista las rutas elegibles con su **estado de disponibilidad para el
workspace** (`available` = promovida · `gated` = declarada no promovida · `blocked` = dependencia externa) más el
`recommendedDefault`, de modo que **cualquier consumer** (el selector del Producer — TASK-1555, Nexa, MCP, SDK)
renderice la flota **data-driven, escalando a N modelos sin hand-edits por modelo**. Es la foundation backend del
selector; la UI es su consumer (task separada, regla hybrid-splits).

## Why This Task Exists

Hoy la selección de modelo del Producer es un **placeholder estático**
(`efeonce-globe/apps/studio-web/src/producer-ui.ts` — botón `aria-disabled` "El catálogo publicará aquí sus límites
válidos", ruta `routePending`). ADR-013 (TASK-1553) volvió el catálogo multi-modelo y resoluble por-ruta, pero
**no existe un contrato que diga, por ruta, si está disponible (promovida) para este workspace**. Sin ese dato, "todos
los modelos en el Producer" no puede ser data-driven: cada modelo habría que cablearlo a mano en la UI, exactamente lo
contrario de la mentalidad aditiva de ADR-013 y del ledger de flota. La disponibilidad vive hoy sólo en
readiness/binding (por ruta × workspace) y no se proyecta al carril de consumo. Esta task cierra ese hueco con un
**primitive canónico (Full API Parity): un reader, muchos consumers**.

## Goal

- Un **reader gobernado de flota** que devuelva, por capacidad, las rutas con `model` público, `availability`
  (`available|gated|blocked`), razón del gate, y el `recommendedDefault` por capacidad — todo derivado del catálogo +
  readiness/binding, **nunca hardcodeado**.
- **Full API Parity:** el mismo primitive alimenta al selector del Producer (TASK-1555), a Nexa y a MCP/SDK; ningún
  consumer reconstruye disponibilidad por su cuenta ni ve slug de proveedor (ADR-003).
- **Escalable por construcción:** promover una ruta o agregar una al catálogo la hace aparecer en todos los consumers
  sin tocar código de consumo — "todos los modelos en el Producer" pasa a ser consecuencia del dato.
- Workspace-scoped: una ruta promovida para el workspace A no es `available` para el B.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar (doc gobernante de Globe vive en Greenhouse, EPIC-028 / TASK-1492):

- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md` (ADR-013)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` (catálogo, audiencia, slug guard)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md` (ADR-009, readiness/binding)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (spine: contracts→domain→reader, capability registry)
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md` (ledger de flota — mapa humano que este reader reconcilia en runtime)

Reglas obligatorias:

- Reusar el spine (contracts→domain→reader), el `CapabilityRegistry` y los readers de catálogo/readiness/binding
  existentes; NO crear un mecanismo paralelo. Diseñar con `arch-architect` (forma) + `greenhouse-globe` (boundary).
- El **slug/id real del proveedor NUNCA** entra a la proyección pública (drift guard `assertNoSlugLeak`); sólo `model`
  público (nombre + versión). La `house` sigue operator-only tras su capability dedicada.
- La disponibilidad se **deriva** de readiness `promoted` + binding `enabled` (por ruta × workspace); NUNCA se hardcodea
  ni se infiere en el browser.

## Normative Docs

- `docs/tasks/in-progress/TASK-1553-globe-extensible-multi-model-provider-catalog.md` (ADR-013 · catálogo v1.3.0 · `recommendedDefault`)
- `docs/tasks/to-do/TASK-1552-globe-producer-composer-focused-creation.md` (composer hierarchy — distinta a esta task)
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`

## Dependencies & Impact

### Depends on

- ADR-013 (TASK-1553): catálogo multi-modelo + `PRODUCER_RECOMMENDED_DEFAULTS` + resolución por-ruta (shipped).
- Readers de readiness/binding vigentes en `efeonce-globe` (`globe.model-readiness.*`, `production_route_binding_revisions`) `[verificar nombres exactos en Discovery]`.

### Blocks / Impacts

- **TASK-1555** (Globe Producer Model Selector UI, ui-ux) — consumer que renderiza esta proyección; se autora aparte y
  queda `Blocked by: TASK-1554` (regla hybrid-splits).
- Nexa y MCP/SDK pueden exponer "qué modelos hay y cuáles disponibles" consumiendo el mismo primitive.
- No modifica el catálogo, readiness, binding ni el runtime de generación; sólo **proyecta** su estado.

### Files owned

- `../efeonce-globe/packages/contracts/src/producer-catalog.ts` (o un contrato nuevo `producer-fleet.ts`) — tipo de la proyección de flota `[verificar]`
- `../efeonce-globe/packages/domain/src/producer-catalog.ts` (o `producer-fleet.ts`) — reader/projection + helpers `[verificar]`
- `../efeonce-globe/apps/studio-web/src/app.ts` — registro del reader gobernado + coverage `[verificar]`
- tests correspondientes en `../efeonce-globe`
- esta task; delta en `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md` (marcar el reader como SoT de disponibilidad live)

## Current Repo State

### Already exists

- `PRODUCER_ROUTE_CATALOG` (v1.3.0) + `PRODUCER_RECOMMENDED_DEFAULTS` + `listProducerRoutes`/`getProducerRoute` (ADR-013).
- Reader gobernado `globe.producer.catalog.list`/`.get` (devuelve rutas, SIN availability).
- Readiness/binding con estado de promoción por ruta × workspace (readers de ADR-009) `[verificar nombres]`.
- Selección de modelo en la UI del Producer = **placeholder estático** (`producer-ui.ts`), sin datos vivos.

### Gap

- No hay proyección que combine catálogo × readiness/binding → `availability` por ruta × workspace.
- `recommendedDefault` existe como dato pero no se expone en un contrato de consumo de flota.
- Los consumers (UI/Nexa/MCP) no tienen un primitive único de "flota disponible"; cada uno tendría que reconstruirlo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (`packages/{domain,contracts}`, `apps/studio-web`). Gobernado por Greenhouse (control plane documental EPIC-028); NO corre en el build de `greenhouse-eo`.
- Future candidate home: `remain-shared`
- Candidate home nota: dato/reader del monorepo de Globe; no se extrae a paquete nuevo por esta task.
- Boundary: primitive canónico = reader de flota availability-aware (proyección catálogo × readiness/binding); consumers = selector UI (TASK-1555), Nexa, MCP/SDK.
- Server/browser split: server-only (la proyección y la derivación de disponibilidad viven en domain/reader; el browser sólo consume el shape proyectado vía BFF same-origin).
- Build impact: `none` (edita código existente del monorepo de Globe; sin dependencia nueva).
- Extraction blocker: `provider constraint` + spine — la derivación de disponibilidad y el slug guard viven detrás del boundary del dominio.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: catálogo (`PRODUCER_ROUTE_CATALOG`) + readiness/binding (`globe.model-readiness.*` / `production_route_binding_revisions`) + `PRODUCER_RECOMMENDED_DEFAULTS`; esta task NO es SoT, es **proyección**.
- Consumidores afectados: UI (selector TASK-1555), MCP, Nexa, SDK.
- Runtime target: `staging` + `production` (reader internal-only hoy; misma coverage que el catálogo).

### Contract surface

- Contrato existente a respetar: `globe.producer.catalog.list` (`ProducerCatalogViewV1`), spine (trusted context, capability registry, coverage manifest).
- Contrato nuevo o modificado: un reader gobernado de flota — `globe.producer.fleet.list` nuevo **o** extensión aditiva de `catalog.list` con `availability` + `recommendedDefault` (decidir extend-vs-new en Discovery/ADR delta; preferir extensión aditiva si no rompe consumers).
- Backward compatibility: `compatible` (aditivo — un consumer viejo del catálogo ignora los campos nuevos).
- Full API parity: el selector, Nexa y MCP consumen este MISMO reader; ningún consumer deriva disponibilidad ni arma su propia lista.

### Data model and invariants

- Entidades/tablas/views afectadas: lectura de catálogo (dato) + readiness/binding (`greenhouse`/Globe DB) — sólo lectura.
- Invariantes que no se pueden romper:
  - **NUNCA** exponer slug/costo/margen del proveedor en la proyección (sólo `model` público; `assertNoSlugLeak`).
  - `availability` se **deriva** de readiness `promoted` + binding `enabled` por ruta × workspace; jamás hardcodeada.
  - `recommendedDefault` de una capacidad apunta a una ruta real de esa capacidad; si la recomendada no está `available`, el contrato lo dice honesto (no finge disponibilidad).
  - Una ruta `gated`/`blocked` se marca con razón estable (`not_promoted` | `external_gate`), nunca como control ejecutable falso.
- Tenant/space boundary: `workspaceId` se deriva del trusted context server-side; una ruta promovida para A no es `available` para B (mismo predicado que ADR-009/010; el ceiling por `kind` sigue vigente — internal-eval NUNCA `available` en workspace `client`).
- Idempotency/concurrency: read-only; sin writes, sin fence, sin outbox.
- Audit/outbox/history: none (read path). Considerar signal `producer.fleet.availability_drift` (steady=0) si la proyección y el binding divergen `[opcional, evaluar]`.

### Migration, backfill and rollout

- Migration posture: `none` (read-only sobre estado existente).
- Default state: `read-only`; misma coverage que el catálogo (`ui`/`mcp` `policy-blocked` hasta el gate de superficie; internas `available`).
- Backfill plan: N/A (no persiste).
- Rollback path: `revert PR` (reader nuevo/campo aditivo se remueve sin efecto sobre datos).
- External coordination: ninguna (repo-only + reader; no toca cloud/billing/provider/IAM).

### Security and access

- Auth/access gate: capability del catálogo (`globe.producer.catalog.read`) o su equivalente de flota; trusted context deriva actor/workspace/surface.
- Sensitive data posture: sin PII; el slug/costo/margen del proveedor es dato prohibido en la proyección (drift guard).
- Error contract: errores canónicos del spine (`invalid_request`/`not_found`); nunca raw error ni revelar existencia de ruta desconocida.
- Abuse/rate-limit posture: read-only barato; sin quotas nuevas.

### Runtime evidence

- Local checks: `pnpm check` (typecheck + test) en `efeonce-globe`; tests de la proyección (availability derivada, no-slug-leak, workspace-scope, recommendedDefault honesto).
- Runtime: readback contra rutas realmente promovidas (ej. Nano Banana Pro tras su promoción ADR-009) — la proyección debe marcarla `available` y las no promovidas `gated`; una ruta con gate externo (NB2/OpenAI) `blocked` con razón.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Proyección de disponibilidad (reader de flota)

- Domain: helper/projection que combina `listProducerRoutes` × readiness/binding (por `workspaceId`) → por ruta:
  `{ routeId, capability, model, availability, gateReason? }`. Slug guard aplicado. Workspace-scoped con el mismo
  predicado de ADR-009/010 (ceiling por `kind`).

### Slice 2 — Contrato + reader gobernado + recommendedDefault

- Contracts: tipo de la proyección de flota (extensión aditiva de `catalog.list` o `fleet.list` nuevo) con
  `availability` + `recommendedDefault` por capacidad. Registrar el reader en el spine (capability + coverage). Full
  API Parity: un primitive, consumers UI/Nexa/MCP.

### Slice 3 — Tests + evidencia runtime + doc

- Tests: availability derivada (promoted→available, no-promoted→gated, external→blocked), no-slug-leak, workspace-scope,
  recommendedDefault honesto (recomendada no disponible ⇒ marcada). Readback runtime contra una ruta promovida real.
  Delta en el ledger de flota marcando este reader como SoT live de disponibilidad. Doc funcional + manual del
  contrato de flota.

## Out of Scope

- **La UI del selector** (TASK-1555, ui-ux consumer) — esta task expone el dato, no la pantalla.
- **La promoción** de rutas (ADR-009) — esta task lee el estado de promoción, no lo produce.
- Cualquier integración de proveedor, driver gobernado nuevo, o gate externo (Omni driver, OpenAI verifier, allowlist Google) — viven en sus propias tasks.
- Cambiar catálogo, readiness, binding o el runtime de generación.

## Detailed Spec

El corazón: hoy el catálogo dice "qué rutas existen" pero no "cuáles puede usar este workspace ahora". Esta task
proyecta `availability` por ruta × workspace derivándola de readiness/binding, y expone `recommendedDefault` por
capacidad, en un reader gobernado que es el **único primitive** de flota que consumen la UI (TASK-1555), Nexa y MCP.
Así, "todos los modelos probados en el Producer" deja de ser trabajo de UI por-modelo y pasa a ser consecuencia del
dato: promover una ruta (ADR-009) la vuelve `available` en todos los consumers automáticamente. El slug del proveedor
nunca entra a la proyección (ADR-003); la `house` sigue operator-only. Extensibilidad: agregar un modelo = ruta de
catálogo + promoción; aparece en la flota sin tocar el reader.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (derivación de disponibilidad) antes de Slice 2 (contrato/reader): el shape público no se congela hasta que la
  derivación workspace-scoped + slug-guard esté probada. Slice 3 cierra con evidencia runtime contra una ruta promovida real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Slug/costo/margen filtrado a la proyección pública | seguridad/marca | low | reusar `assertNoSlugLeak` sobre todo campo visible; test de no-leak | build/test rojo |
| Disponibilidad hardcodeada en vez de derivada (drift catálogo↔promoción) | routing/readiness | medium | derivar SIEMPRE de readiness/binding; signal `availability_drift` steady=0; test | ruta `available` sin binding `enabled` |
| Ruta internal-eval marcada `available` en workspace `client` | tenancy/seguridad | medium | aplicar el ceiling por `kind` de ADR-010; test de workspace-scope | ruta eval visible en workspace cliente |
| recommendedDefault apunta a ruta no disponible y el consumer la preselecciona | UX/consumo | low | contrato marca la recomendada como no-disponible; el consumer no la ejecuta | preselección de ruta gated |

### Feature flags / cutover

Sin flag nueva — reader aditivo read-only, misma coverage que el catálogo (`ui`/`mcp` `policy-blocked` hasta el gate de
superficie). Cutover = registrar el reader; rollback = revert PR (sin efecto sobre datos).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR de la proyección (domain) | <15 min | sí |
| 2 | revert PR del contrato/reader (campo aditivo o reader nuevo) | <15 min | sí |
| 3 | revert PR de tests/doc | <10 min | sí |

### Production verification sequence

1. `pnpm check` verde en `efeonce-globe`; tests de la proyección pasan.
2. Readback: para un workspace con Nano Banana Pro promovida (post-ADR-009), la flota la marca `available`; las no
   promovidas `gated`; NB2/OpenAI `blocked` con razón.
3. Verificar workspace-scope (una ruta promovida en A no es `available` en B) y no-slug-leak en el payload real.

### Out-of-band coordination required

N/A — repo-only + reader read-only en el runtime de Globe; no toca cloud, billing, provider, IAM ni access.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Source of truth nombrado: proyección = catálogo × readiness/binding × `recommendedDefault`; la task es reader, no SoT.
- [ ] Contract surface nombrado: reader gobernado de flota (`fleet.list` nuevo o `catalog.list` extendido aditivo) con `availability` + `gateReason` + `recommendedDefault`; backward-compatible.
- [ ] `availability` (`available|gated|blocked`) se deriva de readiness `promoted` + binding `enabled` por ruta × workspace; ningún valor hardcodeado (test lo prueba).
- [ ] Workspace boundary explícito: ruta promovida en A no es `available` en B; ceiling por `kind` respetado (internal-eval nunca `available` en workspace `client`).
- [ ] No-slug-leak sobre todo campo visible de la proyección (test verde); `model` público expuesto, slug/costo/margen no.
- [ ] `recommendedDefault` por capacidad expuesto; si la recomendada no está `available`, el contrato lo marca honesto.
- [ ] Full API Parity: el mismo reader es consumible por UI (TASK-1555), Nexa y MCP; ningún consumer reconstruye disponibilidad.
- [ ] Evidencia runtime: readback contra una ruta promovida real (`available`) + una no promovida (`gated`) + una con gate externo (`blocked`).
- [ ] Migration/rollback posture explícito: read-only, sin migración, rollback = revert PR.

## Verification

- `pnpm check` + tests focales en `../efeonce-globe` (`pnpm --filter @efeonce-globe/domain test`, contracts, studio-web).
- Readback runtime del reader contra rutas promovidas/no-promovidas/blocked.
- `docs:closure-check` + governor documental para el delta del ledger + doc funcional/manual.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real y archivo en la carpeta correcta.
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados.
- [ ] `Handoff.md`/`GLOBE_RUNTIME_HANDOFF.md` actualizados; delta en `GLOBE_MODEL_FLEET_STATUS.md` (reader = SoT live de disponibilidad).
- [ ] Chequeo de impacto cruzado con TASK-1555 (consumer UI) y TASK-1552 (composer hierarchy).
- [ ] Doc funcional + manual del contrato de flota creados/actualizados.

## Follow-ups

- **TASK-1555** — Globe Producer Model Selector UI (ui-ux consumer de esta proyección; `Blocked by: TASK-1554`).
- Consumo de la flota por Nexa ("qué modelos hay / cuáles disponibles") y por MCP/SDK.
- Signal `producer.fleet.availability_drift` si se decide observabilidad activa del drift catálogo↔promoción.

## Open Questions

- **Extend vs new reader:** ¿`availability` + `recommendedDefault` se agregan como campos aditivos a
  `globe.producer.catalog.list`, o se crea un `globe.producer.fleet.list` dedicado? Preferir extensión aditiva si no
  rompe consumers; decidir en Discovery con un delta al ADR-013 si corresponde.
- **Nombres exactos de los readers de readiness/binding** en `efeonce-globe` (`[verificar]` en Discovery) para derivar
  la disponibilidad sin duplicar lógica de ADR-009.
