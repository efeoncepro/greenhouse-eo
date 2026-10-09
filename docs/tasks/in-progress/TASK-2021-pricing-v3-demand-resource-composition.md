# TASK-2021 — Pricing V3: composición de herramientas y consumo por demanda

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
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
- Status real: `En progreso`
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

- [ ] Base común + perfil/tareas y selección AI explicables, sin herramientas inaplicables.
- [ ] Seats/pools/consumo asignados sin duplicación ni prorrateo FTE implícito; huecos bloquean.
- [ ] Suscripción/paquetes integrados al quote, con remanente/vigencia y caja adicional separados.
- [ ] CLI prepare/quote/explain/replay de composición con artifacts congelados.
- [ ] Tres casos y negativos pasan; regresiones anteriores permanecen verdes.
- [ ] Documentación, registro, índices y continuidad actualizados con estado local honesto.

## Verification

Pendiente: tests V3, typecheck/lint focal, CLI/replay y reconciliación independiente, task/docs/context gates. Sin UI ni verificación remota aplicable.

## Closing Protocol

- [ ] Acceptance y evidencia registrados.
- [ ] Lifecycle/registry/README sincronizados tras QA local.
- [ ] TASK-2017 conserva economía parcial; límites canónicos visibles.

## Follow-ups

Operations/Finance completa valores/planes y asignaciones reales. No pedir otra vez costo salarial que el operador ya indicó que sólo tiene histórico.

## Open Questions

Plan/base/fecha Adobe; actuales Notion/M365/SEMrush/ChatGPT; seats/tipos Claude; denominadores reales Vercel/GCP y permisos de reparto. Ejemplos simulan estos datos o los dejan pendientes, sin aprobarlos.
