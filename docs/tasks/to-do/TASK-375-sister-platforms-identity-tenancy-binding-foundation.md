# TASK-375 — Sister Platforms Identity & Tenancy Binding Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementado pendiente de migracion`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-375-sister-platforms-identity-tenancy-binding-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir la foundation Greenhouse-side para bindear tenants y scopes del portal con tenants, workspaces o portales de una sister platform. La task debe aterrizar el contrato abstracto en una capability reusable: binding records, runtime resolver y reglas de governance que sirvan primero para Kortex y luego para futuras apps hermanas.

## Why This Task Exists

El contrato marco ya fija que ninguna integracion cross-platform puede inferir tenancy por nombre visible ni por heuristica. Hoy Greenhouse ya tiene `clientId`, `organizationId`, `spaceId` y tenant context maduros, pero no tiene una capability canonica para relacionarlos con IDs externos de sister platforms como `portal_id` o `hubspot_portal_id`. Sin esa foundation, cualquier API/MCP/connector posterior quedaria acoplado a convenciones frágiles y no tenant-safe.

## Goal

- Bajar a runtime una capability reusable de binding cross-platform.
- Resolver tenancy Greenhouse -> sister platform con IDs estables y estados auditable.
- Dejar la foundation lista para consumers posteriores como read API, MCP y Kortex bridge.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/MULTITENANT_ARCHITECTURE.md`
- `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md`

Reglas obligatorias:

- Ninguna sister platform puede resolver tenancy Greenhouse desde labels visibles.
- El binding debe soportar al menos scopes `organization/client`, `space` e `internal`.
- La foundation debe ser reusable y no estar hardcodeada a Kortex.
- No mezclar esta task con read APIs, MCP o writes cross-platform.

## Normative Docs

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/tasks/complete/TASK-374-sister-platforms-integration-program.md`
- `src/lib/tenant/access.ts`
- `src/lib/tenant/get-tenant-context.ts`
- `src/types/next-auth.d.ts`
- `src/lib/scim/provisioning.ts`
- `src/lib/integrations/greenhouse-integration.ts`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
- `src/lib/tenant/access.ts`
- `src/lib/tenant/get-tenant-context.ts`

### Blocks / Impacts

- `TASK-376`
- `TASK-377`
- futuras annexes o consumer bridges para otras sister platforms

### Files owned

- `src/lib/tenant/access.ts`
- `src/lib/tenant/get-tenant-context.ts`
- `src/types/next-auth.d.ts`
- `src/lib/sister-platforms/`
- `src/app/api/admin/integrations/`
- `src/views/greenhouse/admin/`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`

## Current Repo State

### Already exists

- Greenhouse ya resuelve tenant context canico en `src/lib/tenant/access.ts` y `src/lib/tenant/get-tenant-context.ts`.
- Session user ya expone `clientId`, `organizationId`, `spaceId`, `tenantType`, `memberId`, `businessLines` y `serviceModules`.
- `GREENHOUSE_IDENTITY_ACCESS_V2.md` y `MULTITENANT_ARCHITECTURE.md` ya fijan la semantica interna de tenancy.
- Ya existen precedentes parciales de binding externo:
  - `greenhouse_core.scim_tenant_mappings`
  - `greenhouse_core.notion_workspace_source_bindings`
  - `greenhouse_core.identity_profile_source_links`
- Ya existe una surface admin natural para visibilidad mínima de governance en `/admin/integrations`.

### Gap

- No existe binding canico entre IDs Greenhouse y IDs de sister platforms.
- No existe resolver reusable para transformar un external binding en un scope Greenhouse legible por APIs y tools.
- No existe governance runtime para saber si un binding esta `draft`, `active`, `suspended` o `deprecated`.
- No existe audit trail específico ni reader admin dedicado para bindings sister-platform.

## Audit Delta

Reality check ejecutado antes de implementar:

- La foundation no parte de cero: `SCIM`, `Notion` e `identity_profile_source_links` ya muestran tres patrones parciales reutilizables.
- La visibilidad administrativa mínima no necesita ruta nueva por defecto; el lugar natural es extender `/admin/integrations` y su carril API asociado.
- `MULTITENANT_ARCHITECTURE.md` y el runtime actual no son 100% idénticos:
  - la doc todavía describe `featureFlags` como `Record<string, boolean>`
  - el runtime actual usa `featureFlags: string[]`
  - `spaceId` / `organizationId` son opcionales en `TenantContext` y `next-auth.d.ts`
- La task debe asumir desde el inicio que `client`, `organization` y `space` no son sinónimos y que el binding no puede colapsar todo a `client_id`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Binding model

- Definir el modelo runtime del binding cross-platform dentro de Greenhouse.
- Materializar estados, scopes y campos minimos del bridge reusable.
- Dejar explícita la distinción entre binding `organization/client`, `space` e `internal`.

### Slice 2 — Resolver reusable

- Crear el resolver canico que traduzca un binding activo a contexto Greenhouse usable.
- Permitir que APIs, jobs o consumers posteriores lean el binding sin reimplementar la logica.

### Slice 3 — Governance and visibility

- Exponer un carril minimo de visibilidad administrativa u operativa para validar bindings activos.
- Dejar audit trail y reglas de ownership del bridge.
- Reutilizar la surface existente de integrations/admin governance antes de abrir una UI nueva.

## Out of Scope

- Exponer todavia la API read-only para sister platforms.
- Implementar el MCP server downstream.
- Acoplar el binding a Kortex como caso único.

## Detailed Spec

La capability deberia poder responder como minimo:

1. que sister platform es
2. que external tenant/workspace/portal representa
3. que `organizationId`, `clientId` o `spaceId` de Greenhouse le corresponde
4. que estado tiene el binding
5. quien lo creo, aprobo, suspendio o depreco

La foundation debe nacer reusable para soportar:

- Kortex hoy
- futuras plataformas como Verk

sin cambiar el shape base del binding.

La primera visibilidad mínima recomendada es:

- reader/admin API bajo el carril de integrations
- bloque de lectura dentro de `/admin/integrations`

no una surface nueva aislada si el runtime existente ya puede absorberla.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe un modelo runtime explicito para bindings de sister platforms.
- [x] Existe un resolver reusable que transforma un binding valido en contexto Greenhouse estable.
- [x] La foundation soporta al menos scopes `organization/client`, `space` e `internal`.
- [x] La task no deja la semantica hardcodeada a Kortex.
- [x] La visibilidad mínima de governance reutiliza la surface existente de integrations/admin cuando sea suficiente.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validacion manual del resolver y de la visibilidad minima del binding

## Closing Protocol

- [x] Actualizar el contrato marco si el binding runtime obliga a cerrar un detalle que hoy siga abstracto.
- [x] Dejar explícito en `Handoff.md` que parte del binding quedo reusable para futuras sister platforms.

## Follow-ups

- `TASK-376` — read-only external surface sobre esta foundation.
- `TASK-377` — bridge Kortex usando el binding canonico.

## Open Questions

- Si el binding vive solo en Greenhouse o necesita espejo explicito en la app hermana.
- Si la primera UI de governance debe vivir en Admin o en una surface ops mas técnica.
