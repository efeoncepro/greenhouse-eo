# TASK-2016 — Motor Pricing V3 local con primer consumidor CLI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

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
- Status real: `Cerrada`
- Rank: `2016`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop; shared checkout; sin worktrees`

## Summary

Validar el motor V3 como módulo separado y CLI agent-friendly sobre snapshots explícitos.
Primera vertical local de Staffing, sin reemplazar V2 ni habilitar tarifas comerciales incompletas.

## Why This Task Exists

La CLI de TASK-2015 consulta Excel/proyección. V3 necesita reglas independientes reutilizables y
casos que separen país del talento/mercado, licencias, fees, capacidad y revisión de margen.

## Goal

- Calcular y explicar escenarios completos sin Excel/UI/DB.
- Devolver faltantes estructurados y preservar versiones.
- Probar núcleo/CLI, privacidad y reproducción antes de integración canónica.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Normative Docs

- `docs/documentation/finance/cotizador-v3-contrato-y-validacion.md`
- `docs/documentation/finance/cotizador-v3-parametros-piloto.md`
- `docs/business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md`

## Dependencies & Impact

### Depends on

Catálogo piloto local para discovery y revisión; no dependencia del archivo Excel en ejecución.

### Blocks / Impacts

Integración canónica futura; no modifica consumers/runtime existentes.

### Files owned

- `src/lib/finance/pricing-v3/`
- `scripts/commercial/pricing-v3.ts`
- `data/pricing/v3-pilot/scenarios/`
- `docs/manual-de-uso/finance/cotizar-v3-por-cli.md`
- ADR local, task/plan y alias/dependencia directos en package/lock.

## Current Repo State

### Already exists

V2, simulate schema, redactor, authoring command, CLI histórica y catálogo piloto de revisión.

### Gap

Motor V3 puro, contrato ejecutable, snapshots y CLI. Costos comerciales actuales pendientes.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `src/lib/finance/pricing-v3/; scripts/commercial/; Node local`
- Future candidate home: `domain-package`
- Boundary: `calculatePricingV3 sobre contratos/snapshots; CLI consumer`
- Server/browser split: `schemas y cálculo puros; digest/archivos en adapter Node`
- Build impact: `dependency decimal directa; sin import del portal ni nuevo deployable`
- Extraction blocker: `integración/auth/readers canónicos fuera de esta unidad`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` por semántica financiera; evidencia local porque no se integra runtime productivo.
- Impacto principal: `reader`
- Source of truth afectado: snapshots explícitos del prototipo; canon vigente intacto.
- Consumidores afectados: CLI local nueva.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: ADR Quote API Parity y contrato funcional V3.
- Contrato nuevo o modificado: schema y service local V3 versionado.
- Backward compatibility: additive; V2/CLI histórica no cambian.
- Full API parity: lógica única en dominio; integración canónica es follow-up explícito, sin claim live.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla.
- Invariantes: faltante no es cero; países y FX separados; margen después de ajustes; coberturas no duplicadas; históricos no son aprobación.
- Write-target allowlist: archivos locales nuevos solicitados por CLI, ninguna tabla.
- Tenant/space boundary: checkout interno sin acceso remoto; audiencias server-side en integración futura.
- Idempotency/concurrency: cálculo determinista; snapshot por contenido; escritura local explícita sin overwrite accidental.
- Audit/outbox/history: artefacto/digest local; no outbox porque no hay mutación de negocio.

### Migration, backfill and rollout

- Migration posture: none; additive repo-only tooling, no production runtime impact.
- Default state: ejecución manual local, fixtures sintéticos/históricos declarados.
- Backfill plan: ninguno.
- Rollback path: retirar módulos/alias/fixtures nuevos, V2 intacto.
- External coordination: ninguna para local; Commercial/Finance valida datos operativos aparte.

### Security and runtime evidence

Allowlist comercial sin costo/margen; validación estricta, errores sanitizados, snapshots verificados.
Núcleo directo, CLI smoke y tests son evidencia runtime local; staging/live no aplica a esta unidad.
No nueva capability productiva ni grants; se conserva el carril de simulación del canon.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Plan

[Plan local auto-aprobable](../plans/TASK-2016-pricing-v3-local-prototype-plan.md), commit `d82db12a7` antes de código. Ejecución secuencial autorizada; datos comerciales siguen pendientes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — núcleo y contrato

Cálculo decimal de Staffing mensual con snapshot, componentes/unidades, políticas explícitas,
ajuste humano por mercado, descuentos, margen/FX y errores de datos ausentes.

### Slice 2 — consumer y evidencia

CLI delgada, discovery, explicación/comparación/replay/export; fixtures, tests y manual.

## Out of Scope

Catálogo DB, parámetros comerciales aprobados, UI, endpoints, MCP, payroll, quote-to-cash, deploy.

## Detailed Spec

Contrato funcional V3 vinculado; schema local introspectable; fixtures no operativos y caso comercial
Colombia→Chile incompleto. Datos con campo de fuente/fecha, coverage y unidad. Costeo mensual,
setup único, redondeo por moneda y replay sobre snapshots completos. Servicios compuestos no habilitados.

## Rollout Plan & Risk Matrix

Repo-only, sin impacto productivo. Núcleo → proyección/snapshot → CLI → tests/QA/docs.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Precio incompleto presentado como vigente | Finance | medium | estados, faltantes, binding false | needs_input/review |
| Redondeo/duplicación | Cálculo | medium | decimal, coverage y casos independientes | tests focales |
| Fuga de costos | Export local | medium | allowlist comercial y pruebas adversarias | proyección cliente |
| Replay con datos nuevos | Snapshot | medium | hash/versión/contenido congelado | replay_mismatch |

### Feature flags / cutover

Sin flag/cutover productivo; nueva CLI manual. Catálogo de revisión no habilita perfiles comerciales.

### Rollback plan per slice

Retirar alias y archivos nuevos; ninguna migración ni import canónico de V3.

### Production verification sequence

No producción en esta unidad. Baseline → tests locales → CLI smoke → QA/docs.

### Out-of-band coordination required

Sin coordinación externa para local; costos/margen y promoción requieren validación posterior.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Núcleo independiente sin Excel/FS/DB/Next/MCP en aritmética; contrato estricto. Schema/cálculo en `src/lib/finance/pricing-v3/`; lint/tipos y tests focales pasan.
- [x] Costeo con países, unidades, fees, herramientas, Talent Assurance y setup explícitos, sin duplicación. Golden y casos de cobertura/asignación/periodos en 49 pruebas.
- [x] Markup/margen objetivo, ajuste de mercado y descuentos con margen final/FX trazados. Golden sintético neto 2889 USD, costo 1900, margen 989; no es tarifa vigente.
- [x] Faltantes/invalid/review con JSON y códigos CLI; sin cero/factor neutral silencioso. Pruebas de exit 0/2/3/1 y diagnóstico sanitizado.
- [x] Snapshot reproducible, explicación/comparación y proyección comercial sin datos privados. Replay/tamper/redacción/export bloqueado probados.
- [x] Tests y smoke núcleo/CLI; caso Colombia→Chile devuelve pendientes honestos. 49 V3 + 23 históricos; ejecución desde otro cwd y caso real needs_input.
- [x] Manual, ADR/index, datos y closure sincronizados con local-only; no claim Full API Parity productiva. Manual/schema, contrato objetivo con límites y auditoría local enlazados; closure focal sin faltantes.

## Verification

- Baseline: tipos pasan; lint global falla por 2 errores preexistentes en `.tmp-sheet.mjs` (import/padding). Se conserva archivo ajeno al alcance. Cierre: lint focal limpio y `pnpm typecheck` exit 0.
- `pnpm pricing:v3:test`: 49/49; `pnpm pricing:workbook:test`: 23/23. [Evidencia local y límites](../../audits/commercial/2026-10-09-pricing-v3-local-prototype.md).
- Smoke CLI desde otro cwd, JSON y códigos de salida, replay y export.
- `pnpm task:lint --task TASK-2016`: 0 errores/0 warnings. `pnpm ops:lint --changed`: exit 0, 0 errores; 19 warnings ajenos (registry/epic parity). QA focal con skills de finance/architecture/docs cargadas. Closure focal y context strict: gates finales del cierre local.

## Closing Protocol

- [x] Lifecycle y carpeta corresponden al runtime local verificado: complete local; no integración canónica.
- [x] Registry/README/Handoff/changelog sincronizados; context strict final verifica presupuestos.
- [x] Estado comercial y promoción pendientes documentados aparte del cierre del prototipo: owners/follow-ups en manual y auditoría.

## Progress

- 2026-10-09: plan commit `d82db12a7`, luego núcleo/CLI local implementados/verificados y commit `1db5b0af1`. Primer escenario confirmado CO→CL, datos operativos pendientes. 49 pruebas V3 + 23 históricas, lint focal/tipos y smoke local verdes. Revisión adversaria exige separar fees/licencias de costo humano para no prorratearlos o ajustarlos como salario. Documentación/closure local conciliados.

## Follow-ups

Completar economics operativos, contrastar V2/V3 e integrar por capability con ADR/unidad propias.
