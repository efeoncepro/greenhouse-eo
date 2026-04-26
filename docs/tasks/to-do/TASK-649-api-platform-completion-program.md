# TASK-649 — API Platform Completion Program

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-649-api-platform-completion-program`
- Legacy ID: `API Platform missing pieces program`
- GitHub Issue: `—`

## Summary

Ordenar todo lo que falta para llevar la API Platform de Greenhouse desde foundation RESTful V1.1 a una plataforma completa, estable y ampliable para domains, MCP, first-party apps y futuros consumers externos. Este programa coordina read surfaces por dominio, write safety, OpenAPI canónico, degraded modes, query conventions, authorization/OAuth, autorización granular y lifecycle/deprecation policy.

## Why This Task Exists

`TASK-616` y `TASK-617` ya dejaron una base RESTful real para `api/platform/ecosystem/*`, `api/platform/app/*`, event control plane y documentación developer-facing. Aun así, la API completa del portal todavía está partida entre contratos platform y rutas legacy/product API por dominio.

La deuda actual no es "hacer REST desde cero"; es cerrar los gaps que impiden declarar la API Platform como contrato operativo completo para Greenhouse y como base segura para MCP más allá de lecturas simples.

## Goal

- Definir el backlog canónico de cierre de API Platform.
- Separar claramente foundation shared, read surfaces por dominio, command/write safety y documentación pública.
- Mantener MCP downstream de contratos API estables.
- Evitar que nuevos dominios se expongan vía rutas legacy, SQL directo o helpers internos sin contrato.
- Dejar criterios claros para promover endpoints de preview a stable.

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
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- API Platform es contract-first, aggregate-first y no debe exponer tablas/mirrors raw.
- `api/platform/ecosystem/*` es server-to-server scope-bound por bindings.
- `api/platform/app/*` es first-party user-authenticated; no debe depender de rutas web internas como contrato movil.
- MCP es downstream; una tool MCP nueva requiere contrato API estable o una task previa para crearlo.
- MCP V1 local/read-only puede usar consumer token por env; MCP remoto/multiusuario requiere diseño OAuth explícito antes de exponerse como hosted server.
- Reads amplios deben ser seguros, paginados y observables.
- Writes cross-system requieren idempotencia, auditabilidad, command semantics y conflict handling antes de exponerse a MCP o consumers externos.
- Cambios que toquen permisos deben documentar ambos planos: `views`/`authorizedViews` para surfaces UI y `entitlements`/capabilities para autorización fina.
- Rutas legacy/product API pueden convivir, pero no deben crecer como contrato externo nuevo.

## Normative Docs

- `docs/tasks/complete/TASK-616-api-platform-foundation-ecosystem-read-surface-v1.md`
- `docs/tasks/complete/TASK-617-api-platform-v1-1-convergence-program.md`
- `docs/tasks/complete/TASK-617.1-api-platform-rest-hardening.md`
- `docs/tasks/complete/TASK-617.2-api-platform-first-party-app-surface-foundation.md`
- `docs/tasks/complete/TASK-617.3-api-platform-event-control-plane.md`
- `docs/tasks/complete/TASK-617.4-developer-api-documentation-portal.md`
- `docs/tasks/to-do/TASK-647-greenhouse-mcp-read-only-adapter-v1.md`
- `docs/tasks/to-do/TASK-648-api-platform-ico-read-surface-v1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`
- `src/app/api/platform/ecosystem/**`
- `src/app/api/platform/app/**`
- `greenhouse_core.sister_platform_consumers`
- `greenhouse_core.sister_platform_bindings`
- `greenhouse_core.api_platform_request_logs`
- `greenhouse_core.first_party_app_sessions`

### Blocks / Impacts

- MCP write-safe tools.
- MCP domain expansion beyond base context/org/capabilities/readiness.
- API Platform stable OpenAPI contract.
- Future first-party mobile app hardening.
- Kortex/operator consoles consuming Greenhouse resources.
- Deprecation plan for selected legacy/product API routes.

### Files owned

- `docs/tasks/to-do/TASK-649-api-platform-completion-program.md`
- future child tasks under `docs/tasks/to-do/TASK-###-*.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` if program decisions change architecture.
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `Handoff.md`
- `changelog.md` when runtime behavior changes.

## Current Repo State

### Already exists

- `api/platform/ecosystem/*` ya tiene context, organizations, capabilities, integration readiness, event types, webhook subscriptions y webhook deliveries.
- `api/platform/app/*` ya tiene sessions, context, home y notifications para first-party clients.
- API Platform core ya tiene auth ecosystem-facing, versioning, response envelopes, pagination, freshness, rate-limit headers y request logs.
- Developer portal y docs V1 existen, aunque el OpenAPI de platform está marcado como preview.
- `TASK-647` cubre MCP read-only base.
- `TASK-648` cubre la próxima read surface de ICO vía API Platform.

### Gap

- No existe programa canónico que ordene todos los gaps restantes de API Platform.
- Falta coverage platform por dominios clave: Finance/Commercial, People/Workforce, Ops/Reliability, Organization Workspace/facets e ICO.
- Falta foundation transversal de idempotencia y command/write safety.
- Falta completar OpenAPI con schemas, filtros, errores, ejemplos y versioning estable.
- Falta taxonomía granular de degraded modes por dominio.
- Falta convención uniforme de filters/sort/cursor/fields/include para listas grandes.
- Falta decidir el modelo OAuth/AuthN para MCP remoto o hosted, separado del MCP local read-only.
- Falta puente explícito entre entitlements/capabilities y datos sensibles ecosystem-facing.
- Falta lifecycle/deprecation policy para preview -> stable y legacy -> platform.

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

### Workstream 1 — Domain read surfaces

- Completar `TASK-648` para ICO.
- Crear child tasks para Finance/Commercial API Platform read surface.
- Crear child tasks para People/Workforce API Platform read surface con entitlements explícitos.
- Crear child tasks para Ops/Reliability API Platform read surface.
- Crear child tasks para Organization Workspace/facets read surface.

### Workstream 2 — Command and idempotency foundation

- Diseñar e implementar una capability shared para `Idempotency-Key`.
- Definir command response semantics (`accepted`, `completed`, `conflict`, `replayed`, `rejected`).
- Persistir command audit trail y correlation IDs.
- Definir retry-safe writes antes de cualquier MCP write.

### Workstream 3 — Query conventions and large-list ergonomics

- Estandarizar pagination/cursor policy por resource.
- Definir `filter`, `sort`, `fields` e `include` para resources con listas grandes.
- Documentar límites máximos, defaults y error codes.
- Evitar dumps sin límites en API Platform y MCP.

### Workstream 4 — Degraded modes and dependency health

- Definir taxonomía shared de `fresh`, `stale`, `degraded`, `unavailable` y `partial`.
- Exigir que cada resource declare dependency sources y degraded behavior.
- Propagar freshness y dependency metadata en `meta`.
- Evitar 500 opacos cuando una lectura puede responder con estado parcial seguro.

### Workstream 5 — Authorization bridge

- Mapear qué resources ecosystem-facing se gobiernan solo por binding scope.
- Mapear qué resources requieren capabilities/entitlements adicionales.
- Documentar la relación con `views` cuando una capability también tenga surface UI.
- Bloquear person-level/payroll/cost-sensitive resources hasta tener autorización fina.

### Workstream 6 — MCP OAuth and hosted auth model

- Mantener `TASK-647` V1 local/read-only sobre `GREENHOUSE_MCP_CONSUMER_TOKEN` y scope explícito por env.
- Diseñar un modelo OAuth para MCP remoto o multiusuario antes de cualquier hosted server.
- Definir si el authorization server vive dentro de Greenhouse, Vercel, NextAuth/Auth.js o un proveedor externo.
- Definir token audience, scopes MCP, rotation, revocation y relación con `sister_platform_consumers`.
- Documentar que OAuth no bloquea MCP local V1, pero sí bloquea MCP hosted y cualquier distribución multi-tenant.

### Workstream 7 — OpenAPI and developer contract hardening

- Convertir `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml` de preview parcial a contrato estable por lane/resource.
- Agregar schemas, examples, errors, pagination, filters y version headers.
- Mantener docs públicas derivadas alineadas con runtime.
- Definir criterio de promoción `preview` -> `stable`.

### Workstream 8 — Lifecycle and legacy convergence

- Definir política de deprecación para rutas legacy/product API que ganen equivalente platform.
- Documentar convivencia entre `/api/ico-engine/*`, `/api/finance/*`, `/api/people/*` y `api/platform/*`.
- Crear checklist para nuevos domains: resource adapter primero, API Platform después, MCP solo al final.

## Out of Scope

- Implementar todos los child tasks dentro de esta umbrella.
- Convertir automáticamente todas las rutas legacy a API Platform.
- Hacer pública/anónima la API Platform.
- Exponer MCP writes antes de cerrar idempotencia y command policy.
- Rehacer auth del portal web o NextAuth.
- Reemplazar `api/integrations/v1` legacy sin plan de migración.

## Detailed Spec

Este programa no implementa runtime directamente. Su entregable primario es coordinación, child tasks y criterios de cierre para transformar la foundation actual en una API Platform completa.

La secuencia canónica para cada capability nueva debe ser:

```text
domain reader/resource adapter
  -> api/platform lane
  -> docs/OpenAPI
  -> tests/contract
  -> MCP adapter downstream, si aplica
```

Para writes:

```text
command design
  -> idempotency + audit
  -> conflict/retry semantics
  -> API Platform command endpoint
  -> docs/OpenAPI
  -> MCP tool, si aplica
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe backlog child-task para cada workstream: domain reads, command/idempotency, query conventions, degraded modes, auth bridge, MCP OAuth/hosted auth, OpenAPI hardening y lifecycle/deprecation.
- [ ] `TASK-648` queda registrado como child/prerequisito para ICO + MCP domain expansion.
- [ ] MCP write-safe queda explícitamente bloqueado por command/idempotency foundation.
- [ ] La arquitectura API Platform queda actualizada si las decisiones del programa cambian el contrato.
- [ ] `docs/tasks/README.md` refleja el programa y su relación con `TASK-647`/`TASK-648`.
- [ ] Los criterios `preview` vs `stable` quedan documentados en API docs o arquitectura.

## Verification

- Revisión documental contra `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`.
- `git diff --check`
- Si se crean child tasks, verificar que cada una use `docs/tasks/TASK_TEMPLATE.md` y esté registrada en `docs/tasks/TASK_ID_REGISTRY.md`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] todos los child tasks del programa quedaron creados o explícitamente diferidos

## Follow-ups

- Child task: API Platform Command + Idempotency Foundation.
- Child task: API Platform Finance/Commercial Read Surface.
- Child task: API Platform People/Workforce Read Surface.
- Child task: API Platform Ops/Reliability Read Surface.
- Child task: MCP OAuth / Hosted Auth Model.
- Child task: API Platform OpenAPI Stable Contract.
- Child task: API Platform Lifecycle & Deprecation Policy.

## Open Questions

- ¿Conviene convertir este programa en `EPIC-###` si crece más allá de 5 child tasks?
- ¿Qué dominio después de ICO debe ser el siguiente en API Platform: Finance/Commercial u Ops/Reliability?
- ¿El primer write-safe command debe ser webhook retry/control plane o un command interno de dominio?
- ¿MCP hosted debe reutilizar `sister_platform_consumers` como client registry o tener una tabla OAuth client separada?
