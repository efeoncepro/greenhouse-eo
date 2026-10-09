# TASK-2015 — Excel de pricing accesible a agentes por CLI

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Status real: `Cerrada`
- Rank: `2015`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop; shared checkout; sin worktrees`

## Summary

Extraer el Excel histórico de pricing a JSON trazable y consultarlo por CLI local.
Separar evidencia, auditoría y escenarios de la autoridad del catálogo comercial vigente.

## Why This Task Exists

El Excel/CSV no permite a agentes identificar fácilmente fórmulas, reglas desconectadas y costos pendientes.

## Goal

- Consultas JSON reproducibles sin mutar el Excel.
- Escenarios explícitos con margen sobre venta y capacidad vendible.
- Manual operativo y verificación de datos reales/faltantes.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PRICING_WORKBOOK_AGENT_CLI_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Normative Docs

- `docs/documentation/finance/pricing-comercial.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Excel y dependencia ExcelJS existentes; sin estado remoto.

### Blocks / Impacts

- Agentes internos que revisan costos históricos; sin cambio al cotizador.

### Files owned

- `scripts/commercial/pricing-workbook.mjs`
- `scripts/commercial/lib/pricing-workbook.mjs`
- `scripts/commercial/__tests__/pricing-workbook.test.mjs`
- `data/pricing/extracted/`
- `docs/architecture/GREENHOUSE_PRICING_WORKBOOK_AGENT_CLI_DECISION_V1.md`
- `docs/documentation/finance/pricing-workbook-cli.md`
- `docs/manual-de-uso/finance/consultar-excel-pricing-por-cli.md`
- alias en `package.json`, índices y punteros de skill pricing/documentación relacionados.

## Current Repo State

### Already exists

Excel, CSV seeds y motor V2 server-authoritative con margen sobre venta.

### Gap

Extracción de fórmulas/celdas, lector histórico y consultas locales JSON para agentes.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/commercial/; Node local`
- Future candidate home: `remain-shared`
- Boundary: `CLI histórica; no commands/readers del runtime comercial`
- Server/browser split: `n/a; no import desde portal`
- Build impact: `none; dependencia ExcelJS existente sólo para export`
- Extraction blocker: `none`

<!-- ZONE 2 — PLAN MODE -->

## Plan

[Plan auto-aprobable P2/Medio](../plans/TASK-2015-pricing-workbook-cli-plan.md).
Ejecución secuencial; usuario pidió la CLI, no se requiere delegación ni goal de task nombrada.

## Backend/Data Contract

Backend impact `none`: tooling local sobre archivo, sin nuevo backend, API, schema, reader runtime
ni persistencia comercial. El contrato JSON y datos internos se limitan al checkout; CLI consume
un único módulo local. No hay sesión/tenant/outbox porque no se opera estado de negocio remoto.
Export explícito genera una proyección histórica; overwrite atómico no sigue symlinks al Excel.
No se cambian tablas, grants, payroll, catálogo ni quotes. Errores JSON y hash verificado.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — extracción y consultas

JSON versionado con SHA256/celdas/fórmulas; summary/search/role/sheet/audit/export.

### Slice 2 — escenarios y verificación

Escenarios USD explícitos; estimate multirol, override con fuente/fecha y compare de márgenes.
Tests focales, manual, skill espejo y cierre documental. El operador aclaró que necesita costear
sin la UI actual: alternativa local usable, no sólo archivo histórico.

## Out of Scope

Motor vigente, catálogo DB, payroll, FX actual, importación, cotizaciones, HubSpot, API/MCP y deploy.

## Detailed Spec

Schema `efeonce.pricing-workbook.v1`: source con ruta/SHA256/fechas, 13 hojas, celdas con valor,
fórmula/cache o mergedTo. Comandos JSON; status histórico o hipótesis. Escenarios requieren
capacidad/modo/gastos/setup/margen/fee. Costos reemplazados exigen referencia y fecha válida.
Estimate suma roles/gastos una vez; compare recalcula el mismo plan con márgenes explícitos.
Fórmula de precio: costo declarado / (1 - margen - fee sobre venta). Detalle en ADR/manual.

## Rollout Plan & Risk Matrix

Orden: extracción → consultas/audit → escenarios → tests/documentación. Sin rollout remoto.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Histórico tratado como precio aprobado | Agentes/Finance | medium | status y warnings en toda salida | JSON commercialStatus |
| Drift Excel/JSON | Tooling | medium | hash antes de leer | error source_changed |
| Costos ausentes o capacidad invendible | Escenarios | medium | validación estricta y supuestos explícitos | errores JSON |

### Feature flags / cutover

Sin flag: ejecución manual local; ningún consumer runtime nuevo.

### Rollback plan per slice

Retirar alias y archivos nuevos; Excel/seeds/DB intactos, reversible sin migración.

### Production verification sequence

No aplica deploy: smoke local sobre el libro original y hash antes/después.

### Out-of-band coordination required

N/A — repo-only, sin sistemas externos.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Extracción completa de 13 hojas con fuente/hash y fórmulas.
- [x] Consultas JSON y errores estructurados; búsqueda de roles HubSpot.
- [x] Audit concilia roles e identifica recargo, tiers, horas y reglas desconectadas.
- [x] Escenarios rechazan faltantes/capacidad inválida y exigen fuente para reemplazar costos.
- [x] Excel intacto; sin writes remotos ni seeds alterados.
- [x] Tres capas documentales y skill espejo; gates focales verdes.

## Verification

23/23 tests Node PASS; nueve comandos CLI smokeados con JSON válido; ESLint/Prettier PASS;
SHA256 intacto; openpyxl concilia 3.110 celdas/1.480 fórmulas. Task/docs/context gates PASS.
[Evidencia](../../audits/commercial/2026-10-09-pricing-workbook-cli.md).

## Closing Protocol

- [x] Lifecycle, carpeta y criterios con evidencia actualizados.
- [x] Índices/registro de ID, handoff y changelog actualizados.
- [x] Impacto sobre cotizador y pricing histórico explícito.
