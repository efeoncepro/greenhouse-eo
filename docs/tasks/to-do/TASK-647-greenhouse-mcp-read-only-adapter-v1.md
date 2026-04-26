# TASK-647 — Greenhouse MCP Read-Only Adapter V1

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-647-greenhouse-mcp-read-only-adapter-v1`
- Legacy ID: `DN3 MCP downstream follow-up`
- GitHub Issue: `—`

## Summary

Construir el primer MCP server oficial de Greenhouse como adapter read-only downstream de `api/platform/ecosystem/*`. El corte expone tools mínimas para contexto, organizaciones, capabilities e integration readiness, sin acceso SQL directo ni writes.

## Why This Task Exists

`TASK-616` y `TASK-617` ya dejaron una API Platform V1.1 suficientemente estable para abrir el primer MCP sin adelantarse a contratos inmaduros. La deuda actual es que los agentes todavía no tienen una surface MCP gobernada; si se resuelve con scripts o SQL directo, se romperían las reglas de tenancy, observabilidad y contract-first ya definidas.

## Goal

- Crear un runtime MCP explícito y pequeño dentro del repo.
- Mapear las lecturas base de `api/platform/ecosystem/*` a tools MCP ergonómicas.
- Preservar auth, scope, request IDs, rate limits y errores de la API Platform subyacente.
- Dejar bloqueados los writes MCP hasta que exista idempotencia transversal y command policy madura.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- MCP es downstream de contratos API estables; no puede leer SQL directo como source primaria.
- El primer MCP es read-only por defecto.
- Toda tool debe ejecutar dentro de un scope resuelto por `externalScopeType` + `externalScopeId`.
- Ninguna tool MCP puede tener más permisos que el consumer autorizado de la API Platform.
- Los writes MCP quedan fuera de este corte; requieren `Idempotency-Key`, auditoría y command semantics antes de implementarse.
- Todo contenido libre de dominio debe tratarse como dato no confiable para control, permisos o tool routing.

## Normative Docs

- `docs/tasks/complete/TASK-616-api-platform-foundation-ecosystem-read-surface-v1.md`
- `docs/tasks/complete/TASK-617-api-platform-v1-1-convergence-program.md`
- `docs/tasks/complete/TASK-617.1-api-platform-rest-hardening.md`
- `docs/tasks/complete/TASK-617.4-developer-api-documentation-portal.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`
- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/app/api/platform/ecosystem/context/route.ts`
- `src/app/api/platform/ecosystem/organizations/route.ts`
- `src/app/api/platform/ecosystem/organizations/[id]/route.ts`
- `src/app/api/platform/ecosystem/capabilities/route.ts`
- `src/app/api/platform/ecosystem/integration-readiness/route.ts`
- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`
- `greenhouse_core.sister_platform_consumers`
- `greenhouse_core.sister_platform_bindings`

### Blocks / Impacts

- MCP tools para event control plane en un follow-up.
- MCP write-safe commands en un follow-up posterior a idempotencia transversal.
- Skills de operadores Greenhouse que enseñen a usar el MCP sin duplicar su contrato.
- Kortex/operator consoles que necesiten agent-facing reads.

### Files owned

- `src/mcp/greenhouse/**`
- `src/mcp/api-platform/**` si se elige separar mapping por capability
- `scripts/**` solo si hace falta un entrypoint local para stdio
- `package.json`
- `pnpm-lock.yaml`
- `.vscode/mcp.json` si se registra un server local para desarrollo
- `docs/tasks/to-do/TASK-647-greenhouse-mcp-read-only-adapter-v1.md`
- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `api/platform/ecosystem/*` ya expone lecturas binding-aware para `context`, `organizations`, `capabilities` e `integration-readiness`.
- `api/platform/ecosystem/*` ya tiene versioning, response envelope, request IDs, rate-limit headers y paginación uniforme donde aplica.
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` define el MCP como server oficial downstream, read-first y sin bypass de la API Platform.
- `.vscode/mcp.json` ya existe para servidores MCP externos de desarrollo, pero no registra todavía un server Greenhouse local.
- `@modelcontextprotocol/sdk` aparece en lockfiles por dependencias transitorias, pero no está declarado como dependencia directa en `package.json`.

### Gap

- No existe `src/mcp/**` para Greenhouse.
- No existe un entrypoint MCP stdio/HTTP propio.
- No existen tools MCP oficiales para leer `api/platform/ecosystem/*`.
- No existe mapping MCP → request IDs de API Platform documentado ni testeado.

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

### Slice 1 — MCP runtime boundary

- Crear el boundary `src/mcp/greenhouse/**` o `src/mcp/api-platform/**` con un entrypoint explícito.
- Declarar `@modelcontextprotocol/sdk` como dependencia directa si el runtime la usa.
- Definir configuración por env:
  - `GREENHOUSE_MCP_API_BASE_URL`
  - `GREENHOUSE_MCP_CONSUMER_TOKEN`
  - `GREENHOUSE_MCP_EXTERNAL_SCOPE_TYPE`
  - `GREENHOUSE_MCP_EXTERNAL_SCOPE_ID`
- Asegurar que ningún secreto quede versionado y que `.env.example` se actualice solo si el runtime requiere esas variables para operación local.

### Slice 2 — API Platform client

- Crear un cliente interno del MCP que llame exclusivamente a `api/platform/ecosystem/*`.
- Propagar headers:
  - `Authorization: Bearer <consumer-token>`
  - `x-greenhouse-api-version`
- Adjuntar `externalScopeType` y `externalScopeId` en todas las llamadas ecosystem-facing.
- Devolver en outputs MCP el `requestId` y metadata útil de la respuesta subyacente.

### Slice 3 — Read-only tools V1

- Implementar tools iniciales:
  - `get_context`
  - `list_organizations`
  - `get_organization`
  - `list_capabilities`
  - `get_integration_readiness`
- Mantener inputs pequeños y explícitos; no aceptar texto libre para resolver tenancy.
- Normalizar errores de la API Platform a errores MCP machine-readable sin ocultar `code`, `status` ni `requestId` cuando existan.

### Slice 4 — Local developer registration

- Agregar un script local si hace falta, por ejemplo `pnpm mcp:greenhouse`.
- Registrar el server en `.vscode/mcp.json` solo si puede hacerse sin secrets embebidos.
- Documentar cómo inyectar env vars localmente sin crear un consumer nuevo a ciegas.

### Slice 5 — Tests and docs

- Agregar tests unitarios del mapping tool → HTTP call → output shape.
- Cubrir happy path, error de auth, error de scope y propagación de `requestId`.
- Actualizar docs funcionales de API Platform o crear una nota corta de MCP read-only si la implementación introduce un workflow nuevo para agentes.
- Actualizar `Handoff.md` con alcance, validaciones y límites explícitos.

## Out of Scope

- Tools de write o commands MCP.
- Acceso SQL directo desde MCP.
- MCP sobre `api/platform/app/*`.
- MCP sobre event control plane (`webhook-subscriptions`, `webhook-deliveries`, `retry`).
- API pública anónima o self-service para developers externos.
- Generación automática de OpenAPI o SDKs.
- Crear/rotar consumers o secrets de producción desde esta task.

## Detailed Spec

La primera versión debe funcionar como adapter fino:

```text
MCP client
  -> Greenhouse MCP server
  -> api/platform/ecosystem/* HTTP contract
  -> ApiPlatform response envelope
  -> structured MCP tool result
```

El MCP no debe importar stores de dominio ni ejecutar queries. Si un resource falta en `api/platform/ecosystem/*`, se abre una task de API Platform antes de exponerlo por MCP.

El output de cada tool debe preservar al menos:

- `requestId`
- `apiVersion`
- `data`
- `meta.scope`
- `warnings` o `errors` cuando correspondan

Para `list_organizations`, mantener paginación explícita compatible con el contrato actual (`page`, `pageSize`) y no esconder dumps grandes detrás de una tool sin límites.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un runtime MCP Greenhouse bajo `src/mcp/**` con boundary claro.
- [ ] Las cinco tools V1 existen y llaman a `api/platform/ecosystem/*`, no a SQL ni rutas legacy.
- [ ] Las tools requieren scope explícito y consumer token por configuración segura.
- [ ] Los outputs preservan `requestId`, `apiVersion`, `data` y `meta` relevante.
- [ ] Los errores de API Platform se propagan de forma machine-readable.
- [ ] Hay tests del mapping MCP read-only y pasan localmente.
- [ ] La documentación deja explícito que este MCP V1 no soporta writes.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test --run` con los tests MCP nuevos o focalizados
- Smoke local del server MCP contra un mock o contra un ambiente configurado con consumer token real
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se confirmo que no se introdujo ninguna tool write-capable en este corte

## Follow-ups

- API Platform idempotency foundation para futuros writes.
- MCP event control plane tools sobre subscriptions/deliveries/retry cuando el contrato esté listo para agents.
- MCP write-safe commands con clasificación `write-safe` / `high-impact` y confirmación humana donde aplique.
- Skills de operador Greenhouse que enseñen a usar las tools MCP sin duplicar su contrato.
