# TASK-040 — Data Node Operating Baseline

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `umbrella`
- Status real: `Diseño baseline vigente 2026`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-040-data-node-operating-baseline`
- Legacy ID: `Greenhouse_Data_Node_Architecture_v2`
- GitHub Issue: `none`

## Summary

Formalizar la baseline canónica para materializar `Data Node` sobre el runtime actual de Greenhouse: exports dentro del portal, reports programados, read API externa y MCP downstream, usando `PostgreSQL` como control plane, el carril externo ya existente en `integrations`, y las capas de auth / tenancy / email ya vivas en el repo. Esta task ya no es solo spec; funciona como umbrella de diseño y secuencia para futuros follow-ons ejecutables.

## Why This Task Exists

Greenhouse ya tiene la visión correcta del Data Node en `TASK-039`, y ya materializó parte del carril externo mediante sister platforms (`TASK-374`, `TASK-376`, `TASK-377`). Pero todavía falta una baseline única que ordene qué parte del Data Node ya existe, qué parte fue absorbida por otras lanes y qué parte sigue pendiente.

Sin este baseline, el riesgo es abrir follow-ons inconsistentes:

- tratando `/api/integrations/v1/*` y `/api/v1/*` como si fueran lo mismo
- reabriendo `BigQuery` como store transaccional de preferencias o API keys
- creando delivery/reporting fuera del runtime ya existente de email
- adelantando `MCP` antes de tener contratos read API estables

`TASK-040` debe servir como documento operativo intermedio entre la visión de `TASK-039` y las tasks ejecutables que la aterrizan por slices reales.

## Goal

- Dejar una baseline técnica única y vigente para el Data Node sobre el runtime real del repo.
- Separar con claridad qué ya quedó absorbido por sister-platform foundations y qué sigue pendiente.
- Ordenar la secuencia ejecutable del Data Node en lanes concretas: export, reports, read API y MCP downstream.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `PostgreSQL` guarda el control plane operativo del Data Node: preferencias, logs, API keys y metadata de acceso.
- `BigQuery` y/o serving layers siguen siendo data plane analítico; no control plane.
- No usar `middleware.ts` como boundary central del Data Node externo; auth y scopes deben resolverse con helpers explícitos.
- El carril externo vigente del repo hoy es `/api/integrations/v1/*`; cualquier futura `API v1` neutral debe nacer alineada con esa realidad o justificar por qué diverge.
- `MCP` sigue siendo un adapter downstream; no foundation previa a una API estable.
- Antes de abrir un servicio o repo separado, agotar primero el runtime e infraestructura ya existentes del portal.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/complete/TASK-095-centralized-email-delivery-layer.md`
- `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md`
- `docs/tasks/complete/TASK-376-sister-platforms-read-only-external-surface-hardening.md`
- `docs/tasks/to-do/TASK-377-kortex-operational-intelligence-bridge.md`

## Dependencies & Impact

### Depends on

- `src/app/api/integrations/v1/readiness/route.ts`
- `src/app/api/integrations/v1/tenants/route.ts`
- `src/app/api/integrations/v1/catalog/capabilities/route.ts`
- `src/app/api/integrations/v1/sister-platforms/context/route.ts`
- `src/lib/integrations/integration-auth.ts`
- `src/lib/integrations/greenhouse-integration.ts`
- `src/lib/sister-platforms/external-auth.ts`
- `src/lib/sister-platforms/bindings.ts`
- `src/lib/sister-platforms/consumers.ts`
- `src/lib/email/delivery.ts`
- `src/app/api/hr/payroll/periods/[periodId]/export/route.ts`

### Blocks / Impacts

- futuros exports manuales del portal
- scheduled reports / executive digests
- future public read API / external consumers
- MCP downstream sobre contratos estables
- consumer tooling para Kortex y futuras sister platforms

### Files owned

- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`
- `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `src/app/api/integrations/v1/**`
- `src/lib/integrations/**`
- `src/lib/sister-platforms/**`
- `src/lib/email/**`
- `src/app/api/**`

## Current Repo State

### Already exists

- Greenhouse ya tiene un carril externo real y autenticado en:
  - `src/app/api/integrations/v1/readiness/route.ts`
  - `src/app/api/integrations/v1/tenants/route.ts`
  - `src/app/api/integrations/v1/catalog/capabilities/route.ts`
  - `src/app/api/integrations/v1/sister-platforms/context/route.ts`
- El runtime de auth / tenancy para consumers externos ya existe:
  - `src/lib/integrations/integration-auth.ts`
  - `src/lib/sister-platforms/external-auth.ts`
  - `src/lib/sister-platforms/bindings.ts`
  - `src/lib/sister-platforms/consumers.ts`
- El delivery de email ya tiene foundation reusable dentro del repo:
  - `src/lib/email/delivery.ts`
  - `src/app/api/webhooks/resend/route.ts`
  - `TASK-095`
- Existen ejemplos de export dentro del portal que sirven como patrón inicial:
  - `src/app/api/hr/payroll/periods/[periodId]/export/route.ts`
- `TASK-374` y `TASK-376` ya absorbieron parte del carril read-only externo que antes se pensaba solo como “Data Node futuro”.

### Gap

- No existe todavía un carril genérico `/api/export/*` para exports portal-wide.
- No existen tablas/runtime reales para:
  - `api_keys`
  - `client_preferences`
  - `export_logs`
  - `report_logs`
  - `api_request_logs`
- No existe aún una `API v1` neutral y reusable para cliente externo fuera del carril institution-first de `integrations`.
- No existe todavía el adapter MCP downstream sobre contratos estabilizados.
- Falta separar explícitamente:
  - lo ya resuelto por sister-platform foundations
  - lo que sigue pendiente como Data Node general-purpose

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Las tasks `umbrella` no requieren plan de implementación
     único; coordinan follow-ons ejecutables.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — DN0 Export baseline

- definir el baseline ejecutable para exports manuales dentro del portal
- reutilizar query layers y serving existentes
- fijar logging en PostgreSQL para exports
- dejar explícito el contrato esperado de `/api/export/*`

### Slice 2 — DN1 Scheduled reports baseline

- fijar el modelo de preferencias, cadencia y delivery para reports programados
- reutilizar la capa de email ya existente antes de justificar un servicio aparte
- definir el control plane canónico para recipients, formatos y módulos

### Slice 3 — DN2 External read API baseline

- definir la evolución correcta entre `/api/integrations/v1/*` y una futura `API v1` neutral
- fijar control plane de API keys, request logging y scopes
- dejar claro qué surfaces son sister-platform-specific vs customer-facing generic

### Slice 4 — DN3 MCP downstream baseline

- dejar a `MCP` explícitamente downstream de una API estable
- fijar prerequisitos mínimos de shape, auth, scopes y observabilidad antes de abrir tools
- impedir que el adapter se convierta en foundation prematura

### Slice 5 — Follow-on map

- mapear qué partes del programa ya absorbieron `TASK-374`, `TASK-376` y `TASK-377`
- definir qué follow-ons nuevos deben salir desde `TASK-040`
- evitar solapamiento entre sister-platform runtime y Data Node general

## Out of Scope

- implementar en esta misma task toda la `API v1`
- construir el MCP server completo desde aquí
- reabrir `BigQuery` como lugar de writes operativos del Data Node
- crear un repo o servicio aparte sin una limitación real del runtime actual
- duplicar el carril sister-platform ya endurecido por `TASK-376`

## Acceptance Criteria

- [ ] `TASK-040` queda explícitamente como baseline técnica vigente del Data Node
- [ ] Queda documentada la separación entre visión legacy (`TASK-039`), carril sister-platform ya absorbido y gaps Data Node todavía pendientes
- [ ] La baseline define con claridad la secuencia `DN0 export -> DN1 reports -> DN2 read API -> DN3 MCP`
- [ ] Queda explícito que el control plane del Data Node vive en PostgreSQL y no en BigQuery
- [ ] Queda explícito que `MCP` es downstream de una API estable y no su prerequisito

## Verification

- revisión manual de consistencia con:
  - `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md`
  - `docs/tasks/complete/TASK-376-sister-platforms-read-only-external-surface-hardening.md`
  - `docs/tasks/plans/TASK-376-plan.md`
  - `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `git diff --check`

## Closing Protocol

- [ ] Si se crea un follow-on nuevo de Data Node, derivarlo explícitamente desde esta baseline
- [ ] No permitir que nuevas tasks de exports/API/MCP contradigan el split entre `integrations` actual y `API v1` futura sin documentarlo

## Follow-ups

- task ejecutable para `DN0` export manual multi-view
- task ejecutable para `DN1` scheduled reports / executive digests
- task ejecutable para `DN2` API key management + request logs + read API neutral
- task ejecutable para `DN3` MCP adapter downstream

## Delta 2026-04-13

- `TASK-040` se rescata como baseline técnica/operativa del Data Node.
- Se reconoce explícitamente qué parte del carril externo ya quedó absorbida por sister platforms.
- Se deja el mapa de follow-ons pendiente sin seguir tratando esta spec como si fuera implementación directa de una sola pieza.
