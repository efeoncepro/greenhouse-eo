# TASK-672 — Platform Health API Contract

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
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-672-platform-health-api-contract`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Crear un contrato `health` versionado para que agentes, MCP, operadores y futuras apps sepan el estado real de la plataforma con un solo request. La salida debe componer Reliability Control Plane, Ops Health, integration readiness, runtime checks y safe modes, sin exponer SQL crudo, secretos ni detalles internos inseguros.

## Why This Task Exists

Hoy el Admin Center muestra correctamente los problemas por dominio, pero los agentes todavía tienen que inferir el estado operativo leyendo UI, rutas admin separadas o queries puntuales. Eso no escala: antes de ejecutar acciones, desplegar, correr backfills, responder en Teams o exponer tools MCP, un agente necesita un preflight estable que responda:

- si la plataforma esta sana, degradada, bloqueada o en estado desconocido
- que dominios estan afectados y con que evidencia
- que acciones son seguras (`read`, `write`, `deploy`, `backfill`, `notify`)
- que chequeos o runbooks debe ejecutar antes de continuar

La raiz no es falta de observabilidad. La raiz es falta de un contrato de salud de plataforma pensado para consumo programatico.

## Goal

- Definir e implementar `PlatformHealthV1` como contrato estable, versionado y testeado.
- Exponer una ruta read-only para preflight de agentes, alineada con API Platform y Agent Auth.
- Componer fuentes existentes con timeouts, cache corta y degradacion honesta por fuente.
- Traducir señales tecnicas a safe modes operativos y acciones recomendadas.
- Documentar el contrato en OpenAPI/docs para que MCP, Teams bot y agentes lo consuman sin acoplarse al Admin Center.

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
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- No crear un `/health` generico que solo devuelva `200 OK`; debe ser un contrato de plataforma con semantica operativa.
- No exponer secrets, tokens, stack traces, SQL raw, PII sensible ni payloads internos.
- No consultar tablas raw desde agentes como contrato. Los agentes consumen API Platform o rutas agent/admin autorizadas.
- Respetar la separacion entre `views` y `entitlements`:
  - esta task no crea una nueva view visible por defecto
  - la capacidad vive en `entitlements` / API capability (`platform.health.read`, y opcionalmente `platform.health.detail`)
- Reliability Control Plane sigue siendo source of truth de senales por modulo; esta task compone y traduce, no duplica el registry.
- Cuando una fuente falle, responder degradado si es posible en vez de colapsar con 500 opaco.
- La ruta debe ser read-only. Ninguna remediacion, replay, requeue o sync command vive en este contrato.

## Normative Docs

- `docs/tasks/complete/TASK-616-api-platform-foundation-ecosystem-read-surface-v1.md`
- `docs/tasks/complete/TASK-617-api-platform-v1-1-convergence-program.md`
- `docs/tasks/to-do/TASK-647-greenhouse-mcp-read-only-adapter-v1.md`
- `docs/tasks/to-do/TASK-653-api-platform-ops-reliability-read-surface.md`
- `docs/tasks/to-do/TASK-657-api-platform-degraded-modes-dependency-health.md`
- `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md`
- `docs/tasks/to-do/TASK-660-api-platform-openapi-stable-contract.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`
- `src/app/api/platform/ecosystem/**`
- `src/app/api/admin/reliability/route.ts`
- `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/reliability/registry.ts`
- `src/lib/reliability/registry-store.ts`
- `src/lib/reliability/synthetic/reader.ts`
- `src/lib/operations/get-operations-overview.ts`
- `src/app/api/internal/health/route.ts`
- `src/lib/integrations/health.ts`
- `src/lib/integrations/readiness.ts`
- `scripts/staging-request.mjs`

### Blocks / Impacts

- `TASK-647` MCP read-only adapter: puede agregar tool `get_platform_health`.
- `TASK-653` Ops/Reliability read surface: debe reutilizar el mismo redaction/signal classification cuando exponga detalle.
- `TASK-657` degraded modes: esta task puede implementar un subset concreto para health y luego convergerlo al helper transversal.
- `TASK-658` resource authorization bridge: si se expone ecosystem-facing con detalle granular, debe alinearse con `platform.health.read/detail`.
- `TASK-660` OpenAPI stable contract: debe incorporar este contrato antes de declararlo estable.
- `TASK-671` Teams bot platform: puede usar health preflight antes de enviar alertas o ejecutar acciones interactivas.
- Admin Center Reliability: puede consumir el summary compacto, pero no debe depender de el para su lectura tecnica.

### Files owned

- `src/lib/api-platform/resources/platform-health.ts`
- `src/lib/api-platform/resources/platform-health.test.ts`
- `src/app/api/platform/ecosystem/health/route.ts`
- `src/app/api/platform/ecosystem/health/route.test.ts`
- `src/app/api/admin/platform-health/route.ts`
- `src/types/platform-health.ts`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `docs/documentation/plataforma/platform-health-api.md`
- `public/docs/greenhouse-api-platform-v1.md`

## Current Repo State

### Already exists

- API Platform foundation y lane ecosystem:
  - `src/lib/api-platform/core/**`
  - `src/lib/api-platform/resources/context.ts`
  - `src/lib/api-platform/resources/organizations.ts`
  - `src/lib/api-platform/resources/capabilities.ts`
  - `src/lib/api-platform/resources/integration-readiness.ts`
  - `src/app/api/platform/ecosystem/**`
- Reliability Control Plane:
  - `src/types/reliability.ts`
  - `src/lib/reliability/get-reliability-overview.ts`
  - `src/lib/reliability/signals.ts`
  - `src/lib/reliability/severity.ts`
  - `src/lib/reliability/registry.ts`
  - `src/lib/reliability/registry-store.ts`
  - `src/app/api/admin/reliability/route.ts`
- Ops, integration y runtime checks:
  - `src/lib/operations/get-operations-overview.ts`
  - `src/app/api/internal/health/route.ts`
  - `src/lib/integrations/health.ts`
  - `src/lib/integrations/readiness.ts`
- Agent/staging tooling:
  - `src/app/api/auth/agent-session/route.ts`
  - `scripts/staging-request.mjs`

### Gap

- No existe un contrato programatico unico que diga si Greenhouse esta listo para lectura, escritura, deploy, backfill o notificaciones.
- `/api/admin/reliability` es util para operadores/admin, pero no es todavia un contrato API Platform versionado para agentes/MCP.
- `integration-readiness` responde readiness por integracion, pero no health global ni safe modes.
- Degraded modes existen como principio arquitectonico, pero no como respuesta uniforme consumible por agentes.
- OpenAPI platform sigue en preview y no describe un `health` preflight.
- No hay tests de contrato que garanticen que una dependencia rota produzca respuesta degradada segura en vez de stack trace o 500 opaco.

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

### Slice 1 — Contract model and composer

- Crear tipos `PlatformHealthV1`, `PlatformHealthModule`, `PlatformHealthIssue`, `PlatformSafeModes`, `PlatformHealthSourceStatus`.
- Implementar composer read-only sobre fuentes existentes, con wrappers por fuente:
  - `reliability_control_plane`
  - `operations_overview`
  - `internal_runtime_health`
  - `integration_readiness`
  - `synthetic_monitoring`
  - `webhook/event_delivery`
  - `postgres/cloud_posture`
- Agregar timeouts por fuente y fallback honesto:
  - fuente OK: aportar datos
  - fuente timeout/error: marcar `sourceStatus=unavailable`, bajar `confidence`, no filtrar stack trace
- Agregar cache in-process corta (`30-60s`) para evitar que agentes o MCP golpeen expensive readers en cascada.

### Slice 2 — Routes and access model

- Crear `GET /api/admin/platform-health` para uso agent/admin autenticado con tenant context.
- Crear o preparar `GET /api/platform/ecosystem/health` como contrato API Platform read-only.
- Definir access model:
  - `views`: ninguna nueva surface visible requerida para V1
  - `entitlements`: `platform.health.read` para summary, `platform.health.detail` para evidencia granular si aplica
  - `routeGroups`: no usar como autorizacion fina
  - `startup policy`: sin impacto
- Si `TASK-658` no esta disponible al ejecutar esta task, limitar `ecosystem/health` a summary conservador o dejarlo detras de una capability narrow documentada.

### Slice 3 — Safe modes and actionability

- Derivar safe modes deterministas:
  - `readSafe`
  - `writeSafe`
  - `deploySafe`
  - `backfillSafe`
  - `notifySafe`
  - `agentAutomationSafe`
- Mapear estados por modulo a `healthy | degraded | blocked | unknown`.
- Incluir `recommendedChecks[]` y `recommendedActions[]` con comandos/documentos seguros, por ejemplo:
  - `pnpm staging:request /api/admin/reliability --pretty`
  - `pnpm pg:doctor`
  - docs/runbook relevantes
- Incluir `blockingIssues[]` y `warnings[]` con `moduleKey`, `severity`, `source`, `summary`, `evidenceRefs`, `ownerDomain`.

### Slice 4 — API Platform envelope, freshness and observability

- Usar envelope API Platform (`requestId`, `servedAt`, `version`, `data`, `meta`) en la ruta ecosystem-facing.
- Publicar headers de cache/freshness consistentes; no usar cache publica compartida para datos operativos internos.
- Emitir request logs/rate-limit segun helpers existentes de API Platform.
- Agregar `meta.freshness`, `meta.sourceFreshness`, `meta.degradedSources` y `meta.contractVersion`.
- Garantizar que el contrato sea deterministicamente serializable y estable para MCP/tools.

### Slice 5 — Docs, OpenAPI and agent preflight

- Actualizar `docs/api/GREENHOUSE_API_PLATFORM_V1.md`.
- Actualizar `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`.
- Actualizar `public/docs/greenhouse-api-platform-v1.md` si es artefacto publicado.
- Crear doc funcional en `docs/documentation/plataforma/platform-health-api.md` con:
  - que significa cada estado
  - que puede hacer un agente con safe modes
  - que no debe inferir
  - ejemplos de respuesta sana/degradada/bloqueada
- Documentar el preflight canonico para agentes:
  - staging/admin: `pnpm staging:request /api/admin/platform-health --pretty`
  - ecosystem/MCP: `GET /api/platform/ecosystem/health` con token/scope autorizado

### Slice 6 — Tests and failure-mode coverage

- Tests unitarios del composer con fuentes OK, fuentes rotas y fuentes timeout.
- Tests de contrato de ruta para:
  - payload shape
  - no secrets/stack traces
  - degraded source sigue respondiendo 200 cuando el contrato puede degradar
  - auth requerido
  - cache/freshness headers
- Test de snapshot o schema para `contractVersion: "platform-health.v1"`.

## Out of Scope

- Auto-remediation, replay, requeue, sync manual o comandos mutativos.
- Reemplazar Admin Center Reliability u Ops Health.
- Crear dashboards nuevos de UI salvo documentar consumo futuro.
- Exponer datos sensibles de People/Payroll/Finance a consumers externos sin `TASK-658`.
- OAuth/hosted auth para MCP remoto (`TASK-659`).
- Convertir toda la OpenAPI preview a stable (`TASK-660`), aunque esta task debe dejar su parte lista.
- Persistir historico completo de health snapshots; V1 puede ser snapshot + request logs.

## Detailed Spec

### Response shape V1

```ts
type PlatformHealthV1 = {
  contractVersion: 'platform-health.v1'
  generatedAt: string
  environment: 'development' | 'preview' | 'staging' | 'production' | 'unknown'
  overallStatus: 'healthy' | 'degraded' | 'blocked' | 'unknown'
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  safeModes: {
    readSafe: boolean
    writeSafe: boolean
    deploySafe: boolean
    backfillSafe: boolean
    notifySafe: boolean
    agentAutomationSafe: boolean
  }
  modules: Array<{
    moduleKey: string
    label: string
    domain: string
    status: 'healthy' | 'degraded' | 'blocked' | 'unknown'
    confidence: 'high' | 'medium' | 'low' | 'unknown'
    summary: string
    topIssues: PlatformHealthIssue[]
    sourceFreshness: Record<string, string | null>
  }>
  blockingIssues: PlatformHealthIssue[]
  warnings: PlatformHealthIssue[]
  recommendedChecks: Array<{
    id: string
    label: string
    command?: string
    docs?: string
    appliesWhen: string[]
  }>
  degradedSources: Array<{
    source: string
    status: 'timeout' | 'error' | 'unavailable' | 'not_configured'
    observedAt: string
    summary: string
  }>
}
```

### Rollup policy

- `blocked`: cualquier modulo critico con `error` en runtime/write path, Postgres indisponible, auth roto, o event delivery roto para flujos que requieren notificacion.
- `degraded`: warnings, stale syncs, synthetic failures acotados, data quality rota sin caida total del portal.
- `unknown`: fuentes suficientes no disponibles para afirmar estado.
- `healthy`: fuentes criticas presentes y sin errores/warnings relevantes.

### Security and redaction

- Redactar valores que parezcan token, secret, bearer, key, DSN, email sensible o stack trace interno.
- Exponer evidence refs y summaries, no payloads raw.
- Diferenciar summary vs detail:
  - summary puede ser consumido por agentes/MCP con `platform.health.read`
  - detail requiere `platform.health.detail` o admin tenant context

### Enterprise considerations covered

- Versionado del contrato.
- Backward-compatible evolution.
- Auth/scope separado de UI views.
- Degraded semantics.
- Cache/timeout para resiliencia.
- Rate limiting/request logs.
- No secrets/no PII.
- OpenAPI y docs.
- Contract tests.
- Canonical preflight para agentes.
- Preparacion para MCP y Teams bot.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un composer `PlatformHealthV1` con contrato versionado y tipos compartidos.
- [ ] `GET /api/admin/platform-health` responde para agentes/admin sin depender de la UI.
- [ ] `GET /api/platform/ecosystem/health` existe o queda preparado con gating explicito si `TASK-658` aun bloquea detalle ecosystem-facing.
- [ ] La respuesta incluye `overallStatus`, `confidence`, `safeModes`, `modules`, `blockingIssues`, `warnings`, `recommendedChecks` y `degradedSources`.
- [ ] Una fuente rota/timeout produce respuesta degradada segura, sin stack traces ni secretos.
- [ ] El contrato queda documentado en API docs/OpenAPI.
- [ ] MCP/Teams quedan con instruccion clara de consumir health preflight antes de acciones sensibles.
- [ ] Tests cubren payload shape, auth, redaction y degraded source behavior.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test src/lib/api-platform`
- `pnpm test src/lib/reliability`
- `pnpm test src/app/api/platform/ecosystem/health`
- `pnpm staging:request /api/admin/platform-health --pretty`
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] `docs/api/GREENHOUSE_API_PLATFORM_V1.md` y OpenAPI quedaron sincronizados
- [ ] `docs/documentation/plataforma/platform-health-api.md` quedo creado/actualizado
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-647`, `TASK-653`, `TASK-657`, `TASK-658`, `TASK-660` y `TASK-671`

## Follow-ups

- Agregar tool MCP `get_platform_health` en `TASK-647` o child task dedicada.
- Agregar badge compacto de health en Admin Center si UX lo justifica.
- Usar `PlatformHealthV1` como preflight del Teams bot antes de acciones interactivas sensibles.
- Evaluar historico persistido de snapshots si se necesita SLO/MTTR real.
- Promover el contrato a stable junto con `TASK-660`.

## Open Questions

- ¿La ruta ecosystem-facing debe exponer solo summary hasta que `TASK-658` cierre, o esta task debe crear un entitlement narrow `platform.health.read` suficiente para V1?
- ¿`deploySafe` debe depender solo de runtime/staging health o tambien de CI/Vercel deployment status?
- ¿`agentAutomationSafe` debe ser global o por action class (`read`, `notify`, `write`, `backfill`)?
