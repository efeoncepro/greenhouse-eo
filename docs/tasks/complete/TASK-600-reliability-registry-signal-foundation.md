# TASK-600 — Reliability Registry & Signal Correlation Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-600-reliability-registry-signal-foundation`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Crear la foundation del `Reliability Control Plane` de Greenhouse: un registro canónico por módulo y un modelo unificado de señales para que `Admin Center`, `Ops Health` y `Cloud & Integrations` puedan razonar sobre salud, regresiones y confianza con un lenguaje común.

## Why This Task Exists

Hoy Greenhouse ya tiene señales útiles, pero aisladas:

- `getOperationsOverview()` expone subsistemas, backlog reactivo, webhooks, cloud posture, observabilidad y data quality Notion
- `GET /api/internal/health` expone postura cloud y checks runtime
- `AdminOpsHealthView` y `AdminCloudIntegrationsView` ya renderizan parte de esa lectura
- `TASK-586` y `TASK-599` van a sumar más señal visible

El gap real es estructural: no existe todavía una capa canónica que diga qué módulos críticos existen, qué rutas/tests/señales les pertenecen y cómo se normaliza su estado. Sin esa base, cada nueva surface o monitor agrega más cards, pero no un verdadero sistema de confiabilidad.

## Goal

- Definir un `Reliability Registry` canónico por módulo crítico.
- Normalizar señales existentes de runtime, freshness, tests y cloud a un contrato compartido.
- Exponer una primera lectura consolidada reusable para `Admin Center`, `Ops Health` y futuros consumers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- la primera iteración vive en el plano de `views` administrativas existentes (`Admin Center`, `Cloud & Integrations`, `Ops Health`); no redefine `entitlements` nuevos salvo que Discovery demuestre una brecha real
- el registry no reemplaza las fuentes actuales (`Sentry`, `source_sync_runs`, Playwright, Billing Export); las normaliza
- no crear un “agente” LLM-first antes de tener registro, señales y evidence model
- si una señal no puede confirmarse todavía, debe quedar explícita como `not_configured`, `awaiting_data` o `[verificar]`, no asumirse sana

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-586-notion-sync-billing-observability.md`
- `docs/tasks/to-do/TASK-599-finance-preventive-test-lane.md`
- `docs/tasks/in-progress/TASK-103-gcp-budget-alerts-bigquery-guards.md`
- `docs/tasks/complete/TASK-208-delivery-data-quality-monitoring-auditor.md`
- `docs/operations/PLAYWRIGHT_E2E.md`

## Dependencies & Impact

### Depends on

- `src/lib/operations/get-operations-overview.ts`
- `src/app/api/internal/health/route.ts`
- `src/lib/cloud/observability.ts`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `tests/e2e/smoke/`
- `docs/tasks/to-do/TASK-586-notion-sync-billing-observability.md`
- `docs/tasks/to-do/TASK-599-finance-preventive-test-lane.md`

### Blocks / Impacts

- `EPIC-007`
- surfaces futuras de confiabilidad dentro de `Admin Center`
- change-based verification para módulos críticos
- follow-ups de observabilidad visible y synthetic monitoring

### Files owned

- `[verificar] src/lib/reliability/*`
- `[verificar] src/types/reliability.ts`
- `src/lib/operations/get-operations-overview.ts`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `[verificar] src/app/api/admin/reliability/route.ts`
- `[verificar] docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

## Current Repo State

### Already exists

- `Admin Center`, `Cloud & Integrations` y `Ops Health` ya existen como surfaces administrativas visibles
- `getOperationsOverview()` ya agrega salud operacional, cloud posture, webhooks, backlog reactivo y data quality Notion
- `GET /api/internal/health` ya expone checks runtime y posture cloud
- `Sentry` ya es visible desde helpers cloud y se usa como señal incidente
- existe Playwright smoke base autenticado y lane preventiva explícita para Finance en `TASK-599`
- existe lane explícita para llevar `Billing Export` y Notion sync al portal en `TASK-586`

### Gap

- no hay un registro canónico de módulos críticos con sus rutas, señales y pruebas asociadas
- no hay un contrato unificado de `signal -> severity -> evidence -> affected module`
- `Admin Center` consume observabilidad parcial, pero todavía no puede razonar con “confidence” ni correlación por módulo
- la plataforma sigue dependiendo de lectura manual para conectar deploys, señales de error y pruebas preventivas

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

### Slice 1 — Reliability Registry base

- definir el contrato canónico del registry por módulo crítico
- incluir al menos:
  - `module_key`
  - label visible
  - rutas críticas
  - APIs críticas
  - dependencias operativas
  - smoke/tests asociados
  - señales esperadas
- sembrar un set inicial con dominios de alto valor:
  - `finance`
  - `integrations.notion`
  - `cloud`
  - `[verificar] delivery`

### Slice 2 — Modelo unificado de señales

- crear un tipo común para señales de confiabilidad
- normalizar, como mínimo:
  - estado runtime
  - incidente Sentry
  - freshness/data quality
  - smoke/test signal
  - costo cloud / billing anomaly placeholder
- exponer severidad, source, evidence, timestamp y módulo afectado

### Slice 3 — Reader consolidado reusable

- crear o formalizar un reader server-side que produzca una vista consolidada de confiabilidad por módulo
- reutilizar `getOperationsOverview()` y `GET /api/internal/health` como fuentes, sin duplicar su lógica
- dejar preparado el boundary para que `TASK-586` y `TASK-599` enchufen sus nuevas señales sin rediseñar la estructura

### Slice 4 — Primer surfacing en Admin Center

- agregar una lectura mínima de `confidence / health by module` en alguna surface administrativa existente
- la UI debe ser ligera y explicativa, no una nueva consola gigante
- dejar explícito qué consumers seguirán siendo `Ops Health`, cuáles `Cloud & Integrations` y cuáles `Admin Center` general

## Out of Scope

- automatizar remediaciones mutantes en producción
- construir el synthetic monitoring completo de todos los módulos
- reemplazar `TASK-586` o `TASK-599`
- implementar FinOps avanzado o Playwright orchestration completa dentro de esta task

## Detailed Spec

La task debe producir la base para una capa de confiabilidad real, no otra colección de cards aisladas.

Principios de diseño:

1. **Registry-first**
   - no empezar por UI ni por LLM
   - primero declarar qué módulos existen y qué señales les pertenecen

2. **Evidence-first**
   - cada señal normalizada debe poder enlazarse a evidencia real:
     - endpoint
     - helper
     - incident id
     - test name
     - run timestamp

3. **Module-oriented**
   - la lectura final debe responder:
     - qué módulo está afectado
     - cuán confiable está hoy
     - por qué

4. **Integración incremental**
   - `TASK-586` debe poder agregar costo cloud global y spotlight de `notion-bq-sync` como señales nuevas
   - `TASK-599` debe poder agregar smoke/component/route health como señales nuevas

5. **No duplicar contracts existentes**
   - `getOperationsOverview()` sigue siendo el agregador operativo amplio
   - `GET /api/internal/health` sigue siendo la vista técnica del posture runtime
   - el Reliability layer debe sentarse encima, no reemplazarlos

La primera iteración puede ser deterministic/rule-based. Un agente explicativo o correlador más sofisticado es follow-up, no prerequisito para esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] existe un registry canónico inicial de módulos críticos con rutas, dependencias y señales asociadas (`src/lib/reliability/registry.ts`)
- [x] existe un tipo/modelo unificado de señal de confiabilidad reusable por múltiples consumers (`src/types/reliability.ts` + `src/lib/reliability/signals.ts`)
- [x] `Admin Center` puede consumir al menos una lectura consolidada de salud/confianza por módulo (sección "Confiabilidad por módulo" en `AdminCenterView` + `GET /api/admin/reliability`)
- [x] la estructura deja explícito cómo se integran después `TASK-586` y `TASK-599` (`RELIABILITY_INTEGRATION_BOUNDARIES` en `get-reliability-overview.ts` + spec V1 §7)

## Verification

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm test -- src/views/greenhouse/admin/AdminCenterView.test.tsx` ✅ (405 files / 2073 passed)
- `pnpm build` ✅ (incluye `/api/admin/reliability` como dynamic function)
- Validación manual pendiente sobre staging — `Admin Center` debe mostrar la sección "Confiabilidad por módulo" entre alertas y Torre de control.

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado con el estado real (`complete`)
- [x] el archivo vive en la carpeta `complete/`
- [x] `docs/tasks/README.md` sincronizado con el cierre
- [x] `Handoff.md` actualizado con foundation entregada y boundaries pendientes
- [x] `changelog.md` actualizado con la lectura `Confiabilidad por módulo`
- [x] chequeo de impacto cruzado sobre TASK-586 y TASK-599 (deltas registrados con el contrato a respetar)
- [x] explícito qué parte vive en registry (`src/lib/reliability/registry.ts`), señales (`src/lib/reliability/signals.ts` + `severity.ts`) y consumer UI (`AdminCenterView` sección + `ReliabilityModuleCard`)

## Resolution

V1 entregada como foundation deterministic/rule-based. Decisiones tomadas durante Discovery:

1. **Registry estático en código** (no DB). Es meta-código que ata módulos a señales existentes; persistencia DB se evaluará si aparece necesidad de overrides por tenant o SLOs configurables.
2. **Primera surface en Admin Center** (no Ops Health). UI ligera: 1 card por módulo + chips de totales + boundaries pendientes. Ops Health y Cloud & Integrations preservan su lectura técnica especializada.
3. **Reader compone OperationsOverview**: no duplica fetches. La página Admin pasa el overview ya construido para evitar doble fetch.
4. **Severity con 6 estados**: `not_configured` y `awaiting_data` separados de `unknown` — nunca asumen sano cuando no hay plomería.

Archivos canónicos en `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` §10.

## Follow-ups

- Synthetic monitoring periódico que ejecute las rutas críticas declaradas en el registry.
- Change-based verification matrix: cuando un PR toca un archivo `owned` por un módulo, correr el smoke + signal correspondiente.
- Correlador explicativo (LLM o reglas) que asocie incidentes Sentry con módulos por path/title.
- Persistencia DB del registry si aparece necesidad de overrides por tenant.

## Open Questions (resueltas)

- ✅ Primera surface en `Admin Center` general (no Ops Health). Ver Resolution §2.
- ✅ Registry inicial estático en código. Ver Resolution §1.
