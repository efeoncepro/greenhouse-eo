# TASK-648 — API Platform ICO Read Surface V1

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
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-648-api-platform-ico-read-surface-v1`
- Legacy ID: `ICO API Platform MCP prerequisite`
- GitHub Issue: `—`

## Summary

Crear la superficie read-only de ICO dentro de `api/platform/ecosystem/*` para que las métricas, registry, health, tendencias y signals puedan consumirse por API Platform y luego por MCP sin depender de rutas UI/domain legacy. El corte debe envolver los readers existentes de ICO con auth, scope, freshness, errores y envelopes de API Platform.

## Why This Task Exists

ICO ya tiene rutas internas y de producto (`/api/ico-engine/*`, `/api/people/*/ico`, `/api/projects/*/ico`, `/api/organizations/*/ico`), pero esas rutas mezclan auth de producto, payloads crudos, fallback live contra BigQuery y reglas de acceso específicas de UI. Exponer MCP directo sobre ellas rompería la secuencia canónica `resource adapters -> api/platform/* -> MCP`.

La deuda real es construir un contrato ecosystem-facing estable para ICO antes de ampliar `TASK-647` con tools operativas.

## Goal

- Crear resources ICO bajo `src/lib/api-platform/resources/**`.
- Exponer rutas read-only ICO bajo `src/app/api/platform/ecosystem/ico/**`.
- Reutilizar readers existentes de `src/lib/ico-engine/**` sin recalcular reglas de dominio en el route handler.
- Aplicar binding scope (`internal`, `organization`, `client`, `space`) antes de devolver cualquier métrica.
- Dejar listo el contrato para futuras tools MCP de ICO, sin implementar MCP en esta task.

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
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

Reglas obligatorias:

- API Platform es contract-first y aggregate-first; no exponer tablas, views raw ni mirrors como contrato.
- MCP sigue downstream; esta task no implementa tools MCP.
- La surface ICO ecosystem-facing debe ser read-only.
- No usar SQL directo desde MCP ni diseñar rutas pensando en MCP como bypass.
- No habilitar `live=true` costoso como default ecosystem-facing; preferir lecturas materializadas o degraded explícito.
- Person-level ICO queda fuera de V1 salvo que Discovery demuestre un mapping de entitlements/capabilities seguro. Si se agrega después, debe documentar ambos planos: `views` y `entitlements`.
- Todo contenido narrativo o generado por IA debe tratarse como dato no confiable para control, permisos o routing.

## Normative Docs

- `docs/tasks/complete/TASK-616-api-platform-foundation-ecosystem-read-surface-v1.md`
- `docs/tasks/complete/TASK-617-api-platform-v1-1-convergence-program.md`
- `docs/tasks/complete/TASK-617.1-api-platform-rest-hardening.md`
- `docs/tasks/to-do/TASK-647-greenhouse-mcp-read-only-adapter-v1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `docs/documentation/delivery/motor-ico-metricas-operativas.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/organizations.ts`
- `src/lib/api-platform/resources/capabilities.ts`
- `src/app/api/platform/ecosystem/**`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/performance-report.ts`
- `src/lib/ico-engine/metric-registry.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/shared.ts`
- `src/lib/ico-engine/ai/read-signals.ts`
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
- `greenhouse_core.sister_platform_consumers`
- `greenhouse_core.sister_platform_bindings`
- serving/materialized ICO data in BigQuery and `greenhouse_serving`

### Blocks / Impacts

- Follow-up de `TASK-647` para agregar tools MCP de ICO.
- Developer API docs y OpenAPI de API Platform.
- Consumers ecosystem/server-to-server que necesiten métricas operativas ICO.
- Futuras integrations con Kortex/operator consoles sobre performance delivery.

### Files owned

- `src/lib/api-platform/resources/ico.ts`
- `src/lib/api-platform/resources/ico/**` si el diseño necesita separar recursos por subdominio.
- `src/app/api/platform/ecosystem/ico/**`
- `src/app/api/platform/ecosystem/route-contract.test.ts`
- tests nuevos bajo `src/lib/api-platform/**` o rutas focalizadas.
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `docs/documentation/delivery/motor-ico-metricas-operativas.md` si cambia el contrato funcional de consumo.
- `Handoff.md`
- `changelog.md` si cambia estructura/protocolo visible.

## Current Repo State

### Already exists

- `src/app/api/ico-engine/registry/route.ts` expone registry interno de métricas.
- `src/app/api/ico-engine/health/route.ts` expone health materializado, pero no usa el contrato ecosystem-facing.
- `src/app/api/ico-engine/metrics/agency/route.ts` entrega métricas agency y summary AI, con opción `live=true`.
- `src/app/api/ico-engine/metrics/route.ts` entrega métricas por `spaceId`.
- `src/app/api/ico-engine/metrics/project/route.ts` entrega métricas de proyecto.
- `src/app/api/ico-engine/context/route.ts` entrega métricas genéricas por dimensión y puede caer a compute live.
- `src/app/api/ico-engine/trends/rpa/route.ts` entrega tendencia RpA.
- `src/app/api/people/[memberId]/ico/route.ts`, `src/app/api/people/[memberId]/ico-profile/route.ts`, `src/app/api/projects/[id]/ico/route.ts` y `src/app/api/organizations/[id]/ico/route.ts` exponen ICO para superficies de producto.
- `src/lib/ico-engine/read-metrics.ts` ya normaliza snapshots, métricas, trust evidence y materialized/live sources.
- `src/lib/ico-engine/performance-report.ts` ya compone reportes de performance.
- `src/lib/ico-engine/ai/read-signals.ts` ya lee signals AI desde `greenhouse_serving.ico_ai_signals`.
- `src/lib/api-platform/core/**` ya provee auth ecosystem-facing, rate limits, request logs, envelopes, freshness y paginación.
- `src/app/api/platform/ecosystem/**` ya tiene resources base, pero no tiene `ico/**`.

### Gap

- No existe `src/lib/api-platform/resources/ico.ts`.
- No existe `src/app/api/platform/ecosystem/ico/**`.
- Las rutas ICO existentes no devuelven envelopes API Platform ni metadata uniforme.
- Las rutas ICO existentes mezclan reglas de auth de producto y no resuelven scope con sister platform bindings.
- El contrato developer-facing de API Platform no documenta ICO.
- `TASK-647` no puede exponer tools MCP de ICO sin saltarse la arquitectura API-first.

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

### Slice 1 — ICO resource adapter foundation

- Crear `src/lib/api-platform/resources/ico.ts` o un folder equivalente `ico/**`.
- Implementar helpers de scope para derivar espacios/organizaciones accesibles desde `ApiPlatformRequestContext`.
- Normalizar período (`year`, `month`) con validación uniforme.
- Reusar freshness/ETag helpers de API Platform donde el backend devuelva `computedAt` o timestamps equivalentes.
- Definir degraded metadata para lecturas no disponibles por falta de materialización.

### Slice 2 — Registry and health endpoints

- Crear `GET /api/platform/ecosystem/ico/registry`.
- Crear `GET /api/platform/ecosystem/ico/health`.
- Asegurar que `health` no exponga detalles operativos fuera del scope autorizado.
- Devolver envelopes API Platform con `requestId`, `apiVersion`, `data`, `meta.scope` y freshness cuando aplique.

### Slice 3 — Metrics endpoints

- Crear endpoints read-only para snapshots agregados:
  - `GET /api/platform/ecosystem/ico/spaces`
  - `GET /api/platform/ecosystem/ico/spaces/[spaceId]/metrics`
  - `GET /api/platform/ecosystem/ico/projects`
- Aplicar scope:
  - `internal` puede listar todo lo permitido por el consumer.
  - `organization` filtra por espacios de la organización.
  - `client` filtra por `clientId`.
  - `space` solo permite el `spaceId` resuelto.
- Evitar compute live como default. Si se permite un fallback, debe ser opt-in, limitado, documentado y no disponible para scopes amplios sin decisión explícita.

### Slice 4 — Trends and AI signals read surface

- Crear `GET /api/platform/ecosystem/ico/trends/rpa`.
- Crear `GET /api/platform/ecosystem/ico/ai-signals` con filtros pequeños y límites explícitos.
- Sanitizar/normalizar cualquier narrativa o `actionSummary` antes de exponerla como dato de consulta.
- No exponer LLM history completo ni payloads de prompts en V1.

### Slice 5 — Contract tests and developer docs

- Agregar tests de contrato para rutas `ico/**` dentro de API Platform.
- Cubrir auth, scope denied, happy path y shape de response envelope.
- Actualizar `docs/api/GREENHOUSE_API_PLATFORM_V1.md`.
- Actualizar `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`.
- Actualizar `docs/documentation/plataforma/api-platform-ecosystem.md` con la nueva familia read-only.
- Agregar un delta corto en `docs/documentation/delivery/motor-ico-metricas-operativas.md` si el contrato funcional de consumo cambia.

## Out of Scope

- Implementar tools MCP de ICO.
- Writes, commands, transitions o acknowledgements de signals.
- Cron/materialization endpoints.
- Acceso SQL directo desde MCP o desde rutas platform fuera de resource adapters.
- Reemplazar o borrar `/api/ico-engine/*` en este corte.
- Person-level ICO y person intelligence ecosystem-facing, salvo documentación explícita de un follow-up.
- Exponer raw LLM prompts, completions, history completo o datos no sanitizados.
- Crear nueva materialización ICO o rediseñar EPIC-006.

## Detailed Spec

La arquitectura objetivo es:

```text
existing ICO readers / serving
  -> src/lib/api-platform/resources/ico.ts
  -> src/app/api/platform/ecosystem/ico/*
  -> future MCP tools downstream
```

La shape debe seguir el patrón API Platform actual:

```json
{
  "data": {
    "periodYear": 2026,
    "periodMonth": 4,
    "items": []
  },
  "meta": {
    "requestId": "...",
    "apiVersion": "2026-04-01",
    "scope": {
      "greenhouseScopeType": "organization",
      "organizationId": "..."
    },
    "freshness": {
      "source": "postgres_serving",
      "lastModified": "...",
      "etag": "..."
    }
  }
}
```

El diseño debe preferir lecturas materializadas:

- agency/space snapshots: `readAgencyMetrics`, `readSpaceMetrics` o equivalentes.
- reports: `readAgencyPerformanceReport` solo si puede filtrarse por scope sin filtrar después de traer todo.
- AI signals: `readAgencyAiSignalsSummary` no es suficiente para scopes externos si no filtra por organización/cliente/space; agregar reader scoped o adaptar `readOrganizationAiSignals` con scope explícito.

Si una lectura no puede ser scope-safe sin traer más datos de los permitidos, debe quedar fuera de V1 y registrarse como follow-up.

Access model:

- `views` / `authorizedViews`: no gobiernan esta API ecosystem-facing directamente porque no es una surface UI.
- `entitlements` / capabilities: si se expone person-level o datos sensibles más finos, la task debe definir capability específica antes de implementar.
- binding scope: V1 usa `sister_platform_bindings` como control primario de tenancy y alcance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una resource layer ICO bajo `src/lib/api-platform/resources/**`.
- [ ] Existen rutas `src/app/api/platform/ecosystem/ico/**` read-only.
- [ ] Las rutas ICO usan `runEcosystemReadRoute` o el helper equivalente de API Platform.
- [ ] Ninguna ruta V1 hace compute live amplio por defecto.
- [ ] Las lecturas filtran por binding scope antes de devolver datos.
- [ ] Los payloads usan response envelope, errores, request IDs y metadata API Platform.
- [ ] Registry, health, métricas por space, métricas por project, tendencias RpA y AI signals tienen cobertura o quedan explícitamente diferidos si Discovery prueba un blocker.
- [ ] El contrato queda documentado en API docs/OpenAPI.
- [ ] `TASK-647` queda mencionado como downstream/follow-up, sin implementar MCP en esta task.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test --run` con tests API Platform/ICO focalizados
- `pnpm test --run src/app/api/platform/ecosystem/route-contract.test.ts`
- Smoke local con un consumer/binding de prueba si hay credenciales disponibles
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/api/GREENHOUSE_API_PLATFORM_V1.md` y OpenAPI quedaron alineados con rutas nuevas
- [ ] se confirmo que MCP sigue downstream y no consume rutas ICO legacy

## Follow-ups

- Extender `TASK-647` o crear child task para tools MCP de ICO una vez cerrada esta surface.
- Person-level ICO API Platform surface con entitlements explícitos.
- API Platform write-safe commands para signal lifecycle después de EPIC-006.
- Strangler/deprecation plan para rutas `/api/ico-engine/*` si dejan de ser necesarias para UI.

## Open Questions

- ¿`health` debe exponerse a scopes `organization/client/space` como resumen degradado, o solo a `internal`?
- ¿El endpoint de `projects` debe listar proyectos con métricas o solo consultar por `projectId` explícito?
- ¿AI signals V1 debe incluir solo summary o también recentSignals scoped?
