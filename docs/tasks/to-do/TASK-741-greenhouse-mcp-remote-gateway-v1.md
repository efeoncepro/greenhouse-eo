# TASK-741 — Greenhouse MCP Remote Gateway V1

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
- Branch: `task/TASK-741-greenhouse-mcp-remote-gateway-v1`
- Legacy ID: `TASK-647 remote transport follow-up`
- GitHub Issue: `—`

## Summary

Exponer el MCP oficial de Greenhouse por transporte remoto HTTP para que clientes compatibles puedan conectarse a una URL estable, manteniendo el mismo contrato read-only downstream de `api/platform/ecosystem/*` ya validado en `TASK-647`. El corte V1 debe seguir siendo privado, service-to-service y sin mezclar OAuth multiusuario.

## Why This Task Exists

`TASK-647` resolvió correctamente el primer runtime MCP local por `stdio`, pero dejó abierto el siguiente gap operativo: clientes que no levantan procesos locales necesitan un endpoint remoto para hablar MCP. Hoy Greenhouse ya tiene tools, cliente downstream y guardrails, pero no tiene un gateway HTTP oficial ni una historia operativa para publicarlo con auth, observabilidad, rate limiting y tenancy safety.

La deuda real no es "rehacer el MCP", sino separar:

- transporte remoto del server MCP
- auth hosted/multiusuario
- tools read-only ya existentes

Si esos tres problemas se mezclan, se infla el scope y se vuelve frágil el rollout. Esta task existe para crear el gateway remoto primero, usando un modelo privado y controlado, y dejar `TASK-659` como dueña de OAuth/hosted auth multiusuario.

## Goal

- Exponer el runtime MCP de Greenhouse por HTTP sobre una URL estable y operable.
- Reutilizar exactamente las mismas tools read-only y el mismo cliente downstream de `TASK-647`.
- Mantener `pnpm mcp:greenhouse` como entrypoint local válido; el transporte remoto no reemplaza `stdio`.
- Definir un modelo V1 de acceso remoto privado/service-to-service, sin compartir tokens multiusuario.
- Dejar documentación clara de cuándo usar MCP local `stdio` y cuándo usar MCP remoto HTTP.

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
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- MCP sigue downstream de `api/platform/ecosystem/*`; no leer SQL directo ni saltarse `src/lib/api-platform/**`.
- El corte remoto V1 sigue siendo read-only y no agrega writes MCP.
- Esta task no absorbe `TASK-659`: OAuth, delegated user auth, refresh/revocation multiusuario y hosted auth full quedan fuera.
- El transporte remoto debe respetar tenant isolation y no ampliar permisos respecto del consumer/binding que ya resuelve `api/platform/ecosystem/*`.
- El runtime remoto debe reutilizar el mismo mapping de tools que el runtime local para evitar drift contractual.
- Si el server remoto vive en App Router, debe respetar el wiring canónico de Next.js y la separación `route handler -> transport -> shared MCP core`.

## Normative Docs

- `docs/tasks/complete/TASK-647-greenhouse-mcp-read-only-adapter-v1.md`
- `docs/tasks/to-do/TASK-659-mcp-oauth-hosted-auth-model.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `docs/manual-de-uso/plataforma/mcp-greenhouse-read-only.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/mcp/greenhouse/config.ts`
- `src/mcp/greenhouse/http-client.ts`
- `src/mcp/greenhouse/tools.ts`
- `src/mcp/greenhouse/server.ts`
- `scripts/run-greenhouse-mcp.ts`
- `src/app/api/platform/ecosystem/**`
- `src/lib/api-platform/core/**`
- `@modelcontextprotocol/sdk`

### Blocks / Impacts

- Uso remoto de Greenhouse MCP desde clientes que requieren URL.
- Documentación operativa de MCP para equipos internos y sister platforms.
- Futuros rollouts hosted que después adoptarán `TASK-659`.
- Decisión de deployment/runtime del MCP remoto.

### Files owned

- `src/mcp/greenhouse/server.ts`
- `src/mcp/greenhouse/http-client.ts`
- `src/mcp/greenhouse/tools.ts`
- `src/mcp/greenhouse/types.ts`
- `src/mcp/greenhouse/remote.ts`
- `src/app/api/mcp/greenhouse/route.ts`
- `src/app/api/mcp/greenhouse/route.test.ts`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/documentation/plataforma/api-platform-ecosystem.md`
- `docs/manual-de-uso/plataforma/mcp-greenhouse-read-only.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `src/mcp/greenhouse/server.ts` levanta el server MCP local con `StdioServerTransport`.
- `src/mcp/greenhouse/tools.ts` ya registra tools read-only sobre el cliente downstream oficial.
- `src/mcp/greenhouse/http-client.ts` ya encapsula llamadas a `api/platform/ecosystem/*`.
- `scripts/run-greenhouse-mcp.ts` ya expone el entrypoint local `pnpm mcp:greenhouse`.
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` ya fija que MCP debe ser downstream de API Platform y predominantemente read-only.
- `TASK-659` ya existe para resolver hosted auth/OAuth, por lo que auth multiusuario no necesita reabrirse aquí.

### Gap

- No existe un transporte MCP remoto HTTP oficial en el repo.
- El runtime actual está acoplado al arranque `stdio`.
- No existe una URL canónica de MCP ni route handler que sirva el protocolo.
- No existe documentación operativa que diferencie con precisión MCP local `stdio` vs MCP remoto HTTP.

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

### Slice 1 — Shared MCP core decoupled from transport

- Refactorizar `src/mcp/greenhouse/server.ts` para separar:
  - construcción del server
  - registro de tools/resources
  - conexión al transporte
- Crear una surface reusable para que el mismo runtime pueda conectarse tanto por `stdio` como por HTTP.
- Mantener `pnpm mcp:greenhouse` funcional sin cambios de contrato para el cliente local.

### Slice 2 — Remote HTTP transport gateway

- Implementar el transporte remoto HTTP en `src/mcp/greenhouse/remote.ts` o estructura equivalente.
- Exponer `src/app/api/mcp/greenhouse/route.ts` como gateway remoto oficial.
- Soportar handshake y requests MCP sobre una URL estable, sin duplicar el mapping de tools.
- Decidir explícitamente si el modo V1 es stateful o stateless y documentar la razón.

### Slice 3 — Private remote auth and scope model V1

- Definir un modelo remoto privado/service-to-service para el gateway V1.
- Reutilizar consumers/bindings o un wrapper equivalente, sin adoptar un token compartido multiusuario como modelo hosted definitivo.
- Documentar cómo se inyectan `consumer`, `binding`, `scope` y trazabilidad por request.
- Alinear el contrato con `TASK-659`, dejando claro qué parte queda temporal y qué parte es transición.

### Slice 4 — Observability, safety and operational hardening

- Agregar logs, request IDs, errores normalizados y límites explícitos para el gateway remoto.
- Documentar budgets, timeouts, rate limiting y comportamiento ante degradación downstream.
- Asegurar que los errores del gateway no filtren secrets, headers sensibles ni detalles internos innecesarios.

### Slice 5 — Tests, docs and rollout guidance

- Agregar tests focalizados del transporte remoto y del route handler.
- Validar que las mismas tools read-only funcionan por `stdio` y por HTTP.
- Actualizar arquitectura, documentación funcional y manual de uso con:
  - diferencias entre `stdio` local y HTTP remoto
  - límites del V1 privado
  - dependencias con `TASK-659`
  - expectativas de configuración y troubleshooting

## Out of Scope

- OAuth, OIDC, delegated user auth, refresh tokens, revocation multiusuario o marketplace auth.
- Reemplazar `TASK-659` o absorber su decisión de hosted auth.
- Agregar writes MCP o commands mutativos.
- Exponer ICO por MCP antes de `TASK-648`.
- Eliminar el runtime local `stdio`.
- Crear un API pública anónima o self-service para developers externos.

## Detailed Spec

La arquitectura objetivo de V1 es:

```text
api/platform/ecosystem/*
  -> src/mcp/greenhouse/http-client.ts
  -> shared MCP core
  -> transport stdio (local)
  -> transport HTTP (remote gateway)
```

El principio clave es que el gateway remoto no redefina las tools. Debe envolver el mismo runtime ya aprobado en `TASK-647`, con un transporte distinto y una policy de acceso distinta.

El diseño esperado separa tres capas:

1. `shared core`
2. `transport adapter`
3. `deployment/auth envelope`

Eso permite:

- un solo registro de tools
- menos drift contractual
- tests paralelos por transporte
- evolución futura de auth hosted sin rehacer el mapping MCP

La route remota propuesta:

- `POST /api/mcp/greenhouse`
- `GET /api/mcp/greenhouse` si el transporte/SDK requiere discovery o handshake adicional

Discovery debe confirmar el shape final exigido por el SDK que ya vive en `@modelcontextprotocol/sdk`, pero la task parte de una restricción dura:

> Greenhouse no debe publicar un "MCP remoto" como proxy manual de tools ni como route ad hoc con JSON inventado. Debe usar el transporte oficial del SDK y conservar semántica MCP real.

## Acceptance Criteria

- [ ] Existe un gateway MCP remoto HTTP en el repo con URL y transporte oficiales.
- [ ] El runtime remoto reutiliza las mismas tools read-only y el mismo cliente downstream de `TASK-647`.
- [ ] `pnpm mcp:greenhouse` sigue funcionando como MCP local `stdio`.
- [ ] El gateway remoto V1 documenta explícitamente su modelo privado/service-to-service y su límite respecto de `TASK-659`.
- [ ] No se introduce SQL directo ni bypass de `api/platform/ecosystem/*`.
- [ ] Tests focalizados cubren route handler, transporte y paridad básica entre `stdio` y HTTP.
- [ ] Arquitectura, documentación funcional y manual de uso quedan sincronizados con el nuevo modo remoto.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm vitest run src/mcp/greenhouse/__tests__ src/app/api/mcp/greenhouse/route.test.ts`
- `pnpm build`
- `git diff --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-659` no fue absorbida accidentalmente ni dejada inconsistente

## Follow-ups

- `TASK-659` — OAuth / hosted auth multiusuario para MCP remoto.
- Extensiones write-safe futuras del event control plane por MCP.
- Decisión de deployment/runtime definitivo del gateway si App Router no resulta suficiente y conviene service dedicado.

## Delta 2026-04-30

Task creada para separar formalmente el transporte remoto HTTP del MCP de Greenhouse del trabajo de auth hosted/multiusuario ya asignado a `TASK-659`.
