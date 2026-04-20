# TASK-476 — Commercial Cost Basis Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Cerrada como programa documental; la foundation y las child tasks principales ya aterrizaron`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Coordinar el programa que convirtió el pricing lane de Greenhouse en una capa data-driven basada en costo real y modelado reutilizando foundations ya existentes de personas, payroll, providers, tooling, servicios y FX. La umbrella ya cumplió su función de ordenar el programa; el trabajo ejecutable restante vive ahora en tasks follow-on más específicas.

## Closure Delta 2026-04-20

La revisión contra codebase confirma que esta umbrella ya no debe seguir abierta:

- `TASK-477` cerró `role_modeled`
- `TASK-478` cerró tooling/provider snapshots
- `TASK-479` cerró `member_actual` + `role_blended`
- `TASK-483` cerró la topología runtime y el worker dedicado

Con eso, `TASK-476` deja de ser una unidad ejecutable y pasa a ser closure/index del programa. Los follow-ons activos reales quedan reducidos a:

- `TASK-480` — bulk repricing + semantic cleanup del resolver
- `TASK-481` — UX/gobernanza de suggested cost y override
- `TASK-482` — phase 2 del feedback loop quoted-vs-actual

## Why This Task Exists

El repo ya tenía piezas sólidas, pero repartidas:

- personas/capacidad: `greenhouse_serving.member_capacity_economics`
- payroll factual: `greenhouse_payroll.compensation_versions`
- roles comerciales: `greenhouse_commercial.sellable_roles`, `sellable_role_cost_components`, `role_employment_compatibility`
- tooling y providers: `greenhouse_ai.tool_catalog`, `greenhouse_ai.member_tool_licenses`, `greenhouse_ai.credit_ledger`, `greenhouse_core.providers`
- servicios compuestos: `greenhouse_commercial.service_pricing`, `service_role_recipe`, `service_tool_recipe`
- FX: `greenhouse_finance.exchange_rates` y `TASK-475`

Lo que faltaba no era otro catálogo maestro, sino una capa que orquestara esas foundations y respondiera de forma consistente cuál es la mejor base de costo disponible para cada línea, con provenance, confidence y effective dating.

## Goal

- Formalizar `Commercial Cost Basis` como capa compartida del pricing program.
- Declarar la jerarquía `actual -> blended -> modeled -> manual`.
- Registrar child tasks ejecutables para roles, tools, personas, engine, UI y feedback loop.
- Aislar el runtime pesado del programa en un worker dedicado y no en `ops-worker`.
- Consumir el runtime foundation ya cerrado en `TASK-483` en vez de rediscutir topología en cada child task.
- Proteger el resto del backlog de pricing para que no absorbiera este scope por accidente.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

Reglas obligatorias:

- Reusar anchors existentes; no duplicar personas, providers, tools ni servicios.
- `Payroll` mantiene ownership factual sobre `compensation_versions`.
- `greenhouse_ai.tool_catalog` sigue siendo el catálogo canónico de herramientas.
- `greenhouse_core.providers` sigue siendo la identidad cross-domain del vendor.
- `Commercial Cost Basis` es una capa de lectura y resolución, no un reemplazo de payroll, finance ni cost intelligence.

## Normative Docs

- `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`
- `docs/tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md`
- `docs/tasks/complete/TASK-464c-tool-catalog-extension-overhead-addons.md`
- `docs/tasks/complete/TASK-468-payroll-commercial-employment-types-unification.md`
- `docs/tasks/to-do/TASK-452-service-attribution-foundation.md`
- `docs/tasks/complete/TASK-475-greenhouse-fx-currency-platform-foundation.md`

## Dependencies & Impact

### Depends on

- `src/lib/member-capacity-economics/store.ts`
- `src/lib/team-capacity/tool-cost-reader.ts`
- `src/lib/commercial/sellable-roles-store.ts`
- `src/lib/commercial/tool-catalog-store.ts`
- `src/lib/commercial/service-catalog-expand.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`

### Blocks / Impacts

- `TASK-466`
- `TASK-471`
- `TASK-473`

### Files owned

- `docs/tasks/complete/TASK-477-role-cost-assumptions-catalog.md`
- `docs/tasks/complete/TASK-478-tool-provider-cost-basis-snapshots.md`
- `docs/tasks/complete/TASK-479-people-actual-cost-blended-role-snapshots.md`
- `docs/tasks/to-do/TASK-480-pricing-engine-cost-resolver-provenance-confidence.md`
- `docs/tasks/to-do/TASK-481-quote-builder-suggested-cost-override-governance.md`
- `docs/tasks/to-do/TASK-482-quoted-vs-actual-margin-feedback-loop.md`

## Current Repo State

### Already exists

- Foundations fuertes de personas, payroll, roles, tooling, providers, servicios y FX ya viven en el repo.
- El pricing engine v2 y el quote builder ya existen y pueden evolucionar.
- `TASK-483` ya dejó `commercial-cost-worker` desplegado en Cloud Run con WIF, scheduler base y endpoints activos para `people`, `tools` y `bundle`.

### Gap

- La umbrella ya no concentra trabajo ejecutable propio.
- El backlog activo real quedó reducido a follow-ons específicos sobre resolver, UX y feedback loop.

## Scope

### Slice 1 — Program contract

- Formalizar `Commercial Cost Basis` como capa shared del programa pricing.
- Declarar la jerarquía:
  - `member_actual`
  - `role_blended`
  - `role_modeled`
  - `tool_provider_actual`
  - `tool_catalog_baseline`
  - `service_recipe_derived`
  - `manual_override`

### Slice 2 — Child tasks

- Registrar y coordinar las child tasks del programa.

### Slice 3 — Boundary discipline

- Dejar explícito qué foundations se reutilizan, cuáles se expanden y cuáles no se tocan.

## Out of Scope

- Implementación de código del cost basis.
- Cambios UI concretos fuera de las child tasks.

## Acceptance Criteria

- [x] Existe una umbrella task que definió `Commercial Cost Basis` y sus boundaries.
- [x] Las child tasks del programa quedaron registradas con dependencias claras.
- [x] El programa dejó explícito qué foundations existentes se reutilizan y cuáles no deben duplicarse.
- [x] El runtime foundation quedó aislado en worker dedicado vía `TASK-483`.
- [x] El backlog activo quedó recortado a follow-ons específicos y ya no depende de esta umbrella abierta.

## Verification

- revisión manual de consistencia documental del backlog
- contraste contra codebase del estado real de `TASK-477`, `TASK-478`, `TASK-479` y `TASK-483`

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` quedó sincronizado con el cierre
- [x] `Handoff.md` quedó actualizado con el ajuste documental
- [x] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- `TASK-452`
- `TASK-480`
- `TASK-481`
- `TASK-482`
