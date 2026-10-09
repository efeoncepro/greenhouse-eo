# TASK-2019 — Catálogo, selección y actualización local Pricing V3

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Status real: `Diseno`
- Rank: `2019`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop`

## Summary

El operador aprobó catálogo → selección → cálculo → explicación y agregó un contrato de mantenimiento de salarios, licencias y factores. Prototipo local reutilizable, sin promoción V2/API/MCP/DB.

## Why This Task Exists

El motor exige snapshots explícitos; agentes necesitan resolverlos desde un catálogo, y actualizar sus valores sin cambiar cotizaciones anteriores.

## Goal

Selección reproducible desde brief, catálogo versionado, reglas explícitas, explicación y actualizaciones locales con revisión de impacto y comparación optimista.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md`
- Nueva decisión de catálogo/resolvedor/mantenimiento local, aprobada por conversación 2026-10-09.
- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md`: no se declara parity live.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/documentation/finance/cotizador-v3-contrato-y-validacion.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

TASK-2016 completa: kernel, snapshots y CLI. TASK-2017 mantiene validación comercial; TASK-2018 conserva reconciliación histórica Pibank.

### Blocks / Impacts

No cambia cotización Pibank ni habilita tarifas históricas como vigentes.

### Files owned

- `src/lib/finance/pricing-v3/catalog/**`
- `src/lib/finance/pricing-v3/adapters/catalog-local.ts`
- `scripts/commercial/pricing-v3.ts`
- `data/pricing/v3-catalog/**`
- Tests nuevos Pricing V3, docs del catálogo/manual, ADR/índice, plan/task/registro.

## Current Repo State

### Already exists

Kernel determinista, snapshots/replay y parámetros review_only.

### Gap

No resolvedor de selección ni contrato de actualizaciones/versiones. Catálogo incompleto de seis perfiles, factores operativos pendientes.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: command/reader local
- Source of truth afectado: catálogo local versionado JSON, separado de V2
- Consumidores afectados: CLI; primitives reutilizables por futuros adapters
- Runtime target: local

### Contract surface

- Existing: schemas.ts y adapters/local-snapshot.ts
- New: catálogo, brief, resolvedor, quote congelada y change-set
- Backward compatibility: aditiva; calculate/replay existentes intactos
- Full API parity: primitives de dominio; integración HTTP/MCP explícitamente pendiente

### Data model and invariants

- No tablas; write-target allowlist N/A
- Faltantes ≠ cero; ambiguos no se eligen automáticamente
- Country costo ≠ mercado; recursos con scope/unidad y cobertura sin duplicación
- Tenant/space boundary: local, sin autoridad de organizaciones runtime
- Idempotency/concurrency: compare-and-set por digest base; salida exclusiva sin overwrite
- Audit/history: versión nueva con padre y cambio completo; quotes congeladas

### Migration, backfill and rollout

- Migration posture: none
- Default: simulación histórica/revisión; sin aprobación comercial inferida
- Rollback: conservar versión previa y retirar delta local
- External coordination: none

### Security and access

- Auth/access gate: operador local con acceso al archivo; no permiso remoto nuevo
- Sensitive data: costos internos sin nombres personales, tokens o secretos
- Error contract: códigos sanitizados; schemas strict
- Abuse: tamaños limitados; no red/imports de Excel en runtime

### Runtime evidence

Tests de resolución/asignación/actualización/replay; CLI real diseñador y Pibank; comparación de cambio y conflictos. Producción N/A.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/finance/pricing-v3/catalog` + adapter local
- Future candidate home: `domain-package`
- Boundary: catálogo/resolución/update/quote sin FS; FS/hash en adapter
- Server/browser split: contratos browser-safe, escritura local sólo adapter
- Build impact: sin nuevas dependencias ni FS en runtime web
- Extraction blocker: integración/autoridad API aún fuera del piloto

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

Catálogo versionado, bindings de costos/recursos/kits/políticas, selección y explicación; mantenimiento con add/replace/retire, efecto futuro y conflicto base; escenarios históricos y selección mensual variable.

## Detailed Spec

Ver plan aprobado por el operador. El catálogo no importa presupuestos de expediente como tarifas. Pibank aporta demanda; faltantes de sus recursos permanecen visibles.

## Out of Scope

Tarifas actuales inventadas, facturas/proveedores, contratos laborales, DB/API/MCP deploy, edición del expediente o envío.

## Rollout Plan & Risk Matrix

Local-only, reversible. Riesgos: asumir salarios por país, prorratear seats, duplicar compartidos, aplicar nuevas versiones retroactivamente. Pruebas obligatorias.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Catálogo/rules consultables y brief resuelto sin aritmética en CLI.
- [ ] Selección de kits/licencias explícita; faltantes/ambigüedades trazables.
- [ ] Quotes/calendario congelados con explicación y replay.
- [ ] Contrato de mantenimiento con cambios fechados, impacto, versión y conflicto base.
- [ ] Pruebas y CLI diseñador/Pibank documentadas con estados honestos.
- [ ] Docs/task/ADR/manual/handoff/changelog y gates sincronizados.

## Verification

Vitest focal, lint/typecheck proporcional, CLI real, cierre documental/context-check. Sin checks externos o producción.

## Closing Protocol

- [ ] Evidencia y acceptance criteria actualizados.
- [ ] Manual/ADR/registro y handoff sincronizados.

## Follow-ups

Vigencia comercial por país y proveedores sigue TASK-2017. Promoción canónica requiere integración propia; no es bloqueo para la simulación local aprobada.
