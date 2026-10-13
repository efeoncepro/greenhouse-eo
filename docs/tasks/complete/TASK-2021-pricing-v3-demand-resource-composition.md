# TASK-2021 — Pricing V3: composición de herramientas y consumo por demanda

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Status real: `Completa local; economía y runtime canónico pendientes fuera de alcance`
- Rank: `2021`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop; shared checkout; sin worktrees`

## Summary

Conectar selección por perfil/tareas, base común Notion/Microsoft365, licencias/pools y presupuestos IA al quote local V3. El agente interpreta demanda; primitives seleccionan, asignan y calculan con desglose congelado.

## Why This Task Exists

Las reglas y costos nuevos están registrados, pero no participan juntos en una cotización. Necesidades no equivalen a un paquete completo por cada rol.

## Goal

- Recursos seleccionados por reglas versionadas, sin precios inline en el brief.
- Asignación explícita por usuario/pool/consumo con controles de no duplicación.
- Quote, explain y replay locales con tres casos reproducibles.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRICING_V3_AI_CREDIT_BUDGET_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRICING_V3_RESOURCE_COMPOSITION_DECISION_V1.md`

ADR de composición define integración local; no modifica el catálogo canónico, ledger o API runtime.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/documentation/finance/cotizador-v3-seleccion-herramientas.md`

## Dependencies & Impact

### Depends on

- TASK-2019: catálogo/quote y mantenimiento completos locales.
- TASK-2020: planner de créditos completo local.

### Blocks / Impacts

TASK-2017 conserva validación económica; API/UI/MCP y asignación live fuera del alcance.

### Files owned

- `src/lib/finance/pricing-v3/resources/composition*`
- `src/lib/finance/pricing-v3/catalog/quote.ts`: extraer orquestador de resolución, sin cambiar cálculo legacy.
- `src/lib/finance/pricing-v3/adapters/resource-composition.ts`
- `src/lib/finance/pricing-v3/__tests__/pricing-v3-composition.test.ts`
- `scripts/commercial/pricing-v3.ts`
- `data/pricing/v3-composition/`, ADR/manual/docs y deltas de índices.

## Current Repo State

### Already exists

Kits explícitos de costos monetarios, snapshots por mes, kernel decimal y presupuesto IA separado. Reglas/costos del operador y Claude públicos registrados.

### Gap

Falta unión de selección y asignaciones con quote, explicación y congelación del contexto completo.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/finance/pricing-v3/resources/`
- Future candidate home: `domain-package`
- Boundary: dominio puro; filesystem/hash en adapters; CLI como consumidor
- Server/browser split: dominio browser-safe, sin node/provider/DB
- Build impact: Decimal/Zod existentes; sin nuevas dependencias
- Extraction blocker: integración canónica necesita su propia unidad

## Backend/Data Contract

### Backend/data brief

Composición local sin UI/DB. Inputs separados: catálogo monetario, policy de herramientas, crédito y demanda con asignaciones explícitas por periodo.

### Contract surface

Consumers internal/CLI; primitive de composición reusable. Sin HTTP ni permiso remoto. Futura API parity consume ese mismo dominio; no claim de parity live.

### Data model and invariants

Base obligatoria; perfil de costo preservado; alias ambiguo bloquea. Precios desde referencia versionada, no agente. Seats nominativos, pools explícitos, créditos agregados por proveedor/mes antes de packs; histórico/desconocido no pasa a confirmado. FX seleccionado con fuente. Costos/caja atribuida y compra adicional diferenciados. Cambios no alteran quotes antiguas.

### Migration, backfill and rollout

Sin migración/backfill/flag. Nuevos comandos y formatos locales opt-in; operaciones anteriores preservadas.

### Security and access

Sin secretos/nombres personales requeridos; slots de asignación. Artefactos internos 0600/wx; no export comercial de simulación ni envío/provider writes.

### Runtime evidence

Tests de composición/replay y CLI con ejemplos; no despliegue ni fuente live.

## Hybrid Execution Justification

Una unidad backend-data reversible local: contratos → composición/kernel → adapter/CLI → casos/QA. Sin frontend ni ejecución paralela.

<!-- ZONE 3 — EXECUTION SPEC -->

<!-- ZONE 2 — DISCOVERY, AUDIT & PLAN -->

## Plan

Plan documentado y commiteado antes de código en `89588fd92`. Secuencial, dominio puro y reuso del kernel; sin worktrees/subagentes, migración o runtime externo.

## Scope

### Slice 1 — Contrato y policy

Reglas/costos de revisión versionados; asignaciones y datos pendientes tipados.

### Slice 2 — Composición y quote

Reusar resolveBrief/planner/kernel, agregar recursos por periodo y explicar fuente/regla/reparto.

### Slice 3 — CLI, casos y cierre

Prepare/quote/explain/replay; redactor SEO, diseñador y servicio multirol; negativos, docs y gates.

## Out of Scope

Inventario live, compras, cargos/impuestos automáticos, costos salariales vigentes, integración canónica, publicación, CRM o despliegue. Suficiencia económica/comercial de servicios no certificada por seleccionar herramientas.

## Detailed Spec

ADR de composición. Demanda interpreta tareas; policy decide herramientas. Reparto exige datos/razón, seats y demanda por mes. Incógnitas mantienen needs_input; simulation explícita puede calcular históricos identificados.

## Rollout Plan & Risk Matrix

Local opt-in. Riesgos: duplicación, créditos gastados dos veces, FX/planes históricos presentados como vigentes. Gates de schema, reconciliación decimal, artefactos congelados y fixtures negativos. Rollback: retirar nuevos comandos; baseline/quotes previas intactas.

<!-- ZONE 4 — VERIFICATION & CLOSURE -->

## Acceptance Criteria

- [x] Base común + perfil/tareas y selección AI explicables, sin herramientas inaplicables.
- [x] Seats/pools/consumo asignados sin duplicación ni prorrateo FTE implícito; huecos bloquean.
- [x] Suscripción/paquetes integrados al quote, con remanente/vigencia y caja adicional separados.
- [x] CLI prepare/quote/explain/replay de composición con artifacts congelados.
- [x] Tres casos y negativos pasan; regresiones anteriores permanecen verdes.
- [x] Documentación, registro, índices y continuidad actualizados con estado local honesto.

## Verification

108 tests/4 archivos verdes (19 nuevos); typecheck y ESLint focal exit0. Tres compose quote/replay exit3: calculated/requires_review y verified; replay legacy verified. Explain y conciliación Python Decimal verificados; overwrite/export rechazados sin mutar el artifact. Mirrors exit0. [QA local](../../audits/commercial/2026-10-09-pricing-v3-resource-composition.md). Task lint previo al move: template1/errors0/warnings0. Gates finales: task lint errors0/warnings0, ops lint exit0 con19 warnings de paridad preexistentes ajenos, closure exit0 con dos avisos advisory de contexto/registro. project_context revisado: su enlace V3 ya llega al índice y manual actualizados; Handoff/changelog/skills sincronizados. Contexto strict exit0/errors0/warnings0. sin UI/verificación remota aplicable.

## Closing Protocol

- [x] Acceptance y evidencia registrados.
- [x] Lifecycle/registry/README sincronizados tras QA local.
- [x] TASK-2017 conserva economía parcial; límites canónicos visibles.

## Follow-ups

Operations/Finance completa valores/planes y asignaciones reales. No pedir otra vez costo salarial que el operador ya indicó que sólo tiene histórico.

## Open Questions

Plan/base/fecha Adobe; actuales Notion/M365/SEMrush/ChatGPT; seats/tipos Claude; denominadores reales Vercel/GCP y permisos de reparto. Ejemplos simulan estos datos o los dejan pendientes, sin aprobarlos.

## Continuidad documental tras TASK-2022

La policy inicial de tres perfiles y los tres artifacts congelados se preservan. TASK-2022 añade una sucesora con reglas de revisión de 32 perfiles, cartera declarada, cobertura cliente por ventana, capacidad de bundle/Team y actualización versionada; no cambia los resultados de esta evidencia histórica.

[Operación completa local](TASK-2022-pricing-v3-operational-agent-workflow.md),
[ADR vigente](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) y
[manual de agentes](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) permiten descubrir,
planear, cotizar, explicar/replay, evaluar y obtener preview redactado por rol o fee de servicio.
Los 26 recursos originales son 25 herramientas más fee genérico de plataforma; no sumar ese fee dos veces.
La evidencia/AC de este cierre permanece histórica y su lifecycle no se reabre. TASK-2017 conserva economía
parcial; API/UI/MCP siguen en el canon V2 hasta promoción gobernada.
