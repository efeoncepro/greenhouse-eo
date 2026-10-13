# TASK-2020 — Pricing V3: presupuesto de suscripción y paquetes extra de IA

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
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
- Status real: `Cerrada`
- Rank: `2020`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop; shared checkout; sin worktrees`

## Summary

Registrar paquetes extra Higgsfield/Magnific de capturas del operador y calcular presupuesto local por proveedor: costo asignado de suscripción, compra incremental de paquetes completos, remanente y vencimiento.

## Why This Task Exists

El promedio de créditos incluidos no representa el costo de comprar capacidad adicional ni su caja o vencimiento.

## Goal

- Catálogo explícito con cantidades, precios observados y vencimientos separados.
- Primitive puro reutilizable y consumidor CLI sin fórmulas en el agente.
- Costo completo de paquetes y remanente visible, sin compra, precio público ni reserva live.

## Architecture Alignment

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

- `docs/architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRICING_V3_AI_CREDIT_BUDGET_DECISION_V1.md`

Snapshot explícito; fuente del operador/captura no prueba vigencia futura de promoción. Créditos no equivalen a dinero, horas/piezas ni derechos. No duplicar cuota y paquete. Kernel staffing y quotes anteriores conservan contrato.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/documentation/finance/cotizador-v3-provisiones-y-costos.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-2019-pricing-v3-catalog-resolution-maintenance.md`: núcleo/CLI local.

### Blocks / Impacts

- TASK-2017 conserva economics y asignación general de herramientas pendientes.
- Integración automática al brief/quote de servicio queda explícitamente fuera de esta unidad.

### Files owned

- `src/lib/finance/pricing-v3/resources/credit-budget.ts`
- `src/lib/finance/pricing-v3/__tests__/pricing-v3-credit-budget.test.ts`
- `scripts/commercial/pricing-v3.ts`
- `data/pricing/v3-resources/`
- ADR/documentación/manual de presupuesto de créditos y deltas de índices/handoff/changelog.

## Current Repo State

### Already exists

Catálogo de recursos monetarios month/year/once y reparto full/fte/equal_consumers; registro local de suscripciones. No selección de packs, presupuesto de crédito ni vencimiento.

### Gap

Necesita cantidad solicitada/asignada de suscripción y selección discreta de paquetes, no aproximación lineal de recarga.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/finance/pricing-v3/resources/`
- Future candidate home: `domain-package`
- Boundary: presupuesto puro, CLI adapter; no SDK/provider/DB
- Server/browser split: dominio browser-safe; FS sólo CLI
- Build impact: dependencia decimal/Zod ya existente; sin dependencia nueva
- Extraction blocker: none; integración de servicios y permisos canónicos requiere unidad propia

## Backend/Data Contract

### API surface and consumers

- Consumers: `internal`, `CLI`; sin HTTP/DB/capability remota.
- Primitive: `planCreditBudget`; schema catálogo y request versionados.
- Full API parity: primitive reutilizable; integración API/UI/MCP canónica pendiente bajo ADR local, no claim de parity live.

### Data model and invariants

- Catálogo: `data/pricing/v3-resources/ai-credits.review-v1.json`; separado del catálogo monetario.
- Importes del catálogo, no del request; paquetes enteros; moneda por proveedor; cero saldo compartido inferido.
- Asignación de créditos normales explícita, nunca mayor que demanda/capacidad restante declarada.
- Repetir paquetes requiere supuesto explícito del request; promoción y términos siguen revisión.
- Write-target allowlist: N/A; no tabla.
- Tenant/space boundary: identificador de cliente sólo contextual, ninguna autoridad remota.
- Idempotency/concurrency: cálculo puro sin reservas; saldos declarados no previenen carreras entre cotizaciones.
- Audit/outbox/history: resultado guarda catálogo/request/método completos; no ledger ni outbox.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: CLI local review-only.
- Rollback: retirar comando/módulo nuevo; quotes/kernel previos intactos.
- External coordination: ninguna compra, recarga automática o configuración proveedor.

### Security and access

- Auth/access gate: operador local filesystem; no auth empresarial nueva.
- Sensitive data posture: sólo tabla de precios y hashes de capturas; no correo, tarjeta, claves ni imagen de cuenta guardados en repo.
- Error contract: INVALID_ARGUMENT sanitizado/diagnósticos estructurados; no stack raw.
- Abuse/rate-limit posture: request/catalog acotados y límite de estados del planner.

### Runtime evidence

- Tests de óptimo discreto, remanente, caja, vencimiento, cantidades, reglas de repetición y CLI.
- Lint focal, type-check y CLI directa contra catálogo congelado.
- Production: N/A, prototipo local; comercialización/asignación portfolio pendiente.

## Plan

<!-- ZONE 2 — PLAN MODE -->

Lightweight, sequential: no subagentes autorizados/necesarios. Aprobación humana del incremento local en conversación 2026-10-09; scope limitado al presupuesto de créditos observado. Discovery verificó contratos y límites reales, skills Pricing/Finance/Architecture/QA/Documentation. Checkpoint auto porP2/Bajo: ejecutar cálculo reversible local; no autorización de compra/publicación. Plan registrado en commit2f713d7a4 antes de código.

Slice1: catálogo de capturas y ADR. Slice2: planner puro + CLI. Slice3: tests/gates, tres capas documentales y cierre local. No plan de integración de servicios disfrazado de planner.

## Scope

<!-- ZONE 3 — EXECUTION SPEC -->

- Presupuesto por un proveedor, un cliente y una fecha de uso; explícitos créditos requeridos, base asignada y base disponible.
- Optimizar precio de compra entre paquetes observados, luego remanente y cantidad de packs. Permitir múltiples paquetes distintos; repetir mismo paquete sólo bajo supuesto explícito.
- Exponer cuota atribuida, caja incremental, costo conservador incluyendo compra completa, remanente y caducidad.

## Detailed Spec

DP discreta acotada por demanda+paquete máximo tras normalizar GCD. Precios Decimal; tipos y fuentes Zod. El deadline de uso debe caber en la vigencia de los paquetes seleccionados. Sin saldo real ni inferencia de disponibilidad global.

## Out of Scope

Comprar/activar auto-refill, saldo o reserva real, autorizar costos comerciales, extrapolar slider sin precio visible, modificar quote/brief staffing, composición automática de servicios, repartir Vercel/GCP o seats sin datos.

## Rollout Plan & Risk Matrix

Local-only, review obligatorio. Riesgo principal: confundir promedio con recarga, promocional con vigente o remanente con saldo real. Fuentes/términos/estados explícitos y export público no soportado.

## Acceptance Criteria

<!-- ZONE 4 — VERIFICATION & CLOSING -->

- [x] Capturas normalizadas con10paquetes y vencimientos separados; sólo hashes, sin datos privados de cuenta — ai-credits.review-v1.
- [x] Primitive y CLI calculan óptimo/moneda/costo de suscripción vs compra/remanente — dos resultadosCLI guardados y comparación contra primitive.
- [x] Cantidades inválidas, base insuficiente y vencimiento detienen resultado completo —15pruebas específicas.
- [x] Repetición explícita y base disponible no inferida, tests adversariales y regresión V3 —89pruebas/3archivosPASS, tsc/ESLint focalPASS.
- [x] ADR/funcional/manual y estado/índices sincronizados; límites comerciales honestos — documentos de créditosIA y auditoría local; integración quote y economics pendientes fuera de esta unidad.

## Verification

Tests focales, ESLint, TypeScript, CLI y replay previo, task lint/ops lint, cierre documental scoped y context strict al final.

## Closing Protocol

- [x] Status real y criterios reflejan evidencia local.
- [x] Índices/registry/handoff/changelog sincronizados.
- [x] Quotes previas y datos fuente intactos —12archivos comparados byte-for-byte conGit; sin promoción remota.

## Evidence2026-10-09

`docs/audits/commercial/2026-10-09-pricing-v3-ai-credit-budget.md`:89testsV3, tipos/lint y CLI directa; artefactos nuevos0600. Suscripción y packs se separan; planner no compra ni asigna automáticamente costos a quote. Legacy resolver/kernel y tarifas no se reescriben.

## Open Questions

Vigencia promocional, impuestos/entidad, repetibilidad real de compras, saldo disponible, uso a plazo y costo de sobrantes; asignaciones/Adobe/FX permanecen en TASK-2017.

## Continuidad documental tras TASK-2022

La operación independiente de presupuesto de créditos conserva contrato/evidencia. TASK-2021/2022 integraron esos resultados a quote local por proveedor/mes; el alcance original sin binding automático describe esta task, no un pendiente actual del compositor. Compra, inventario, saldo live y reservas continúan fuera de alcance.

[Operación completa local](TASK-2022-pricing-v3-operational-agent-workflow.md),
[ADR vigente](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) y
[manual de agentes](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) permiten descubrir,
planear, cotizar, explicar/replay, evaluar y obtener preview redactado por rol o fee de servicio.
Los 26 recursos originales son 25 herramientas más fee genérico de plataforma; no sumar ese fee dos veces.
La evidencia/AC de este cierre permanece histórica y su lifecycle no se reabre. TASK-2017 conserva economía
parcial; API/UI/MCP siguen en el canon V2 hasta promoción gobernada.
