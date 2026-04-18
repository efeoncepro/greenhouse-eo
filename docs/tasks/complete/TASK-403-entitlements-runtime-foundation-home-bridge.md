# TASK-403 — Entitlements Runtime Foundation & Home Bridge

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
- Status real: `Complete`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-403-entitlements-runtime-foundation-home-bridge`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la primera foundation runtime de entitlements para Greenhouse sin romper el modelo actual de `roleCodes + routeGroups + authorizedViews`. La task introduce un catálogo mínimo de capabilities, helpers `can()` / `canSeeModule()`, y un bridge hacia `/home` para que `TASK-402` pueda construir la Home universal adaptativa sobre una capa de autorización más robusta que los `routeGroups` sueltos.

## Why This Task Exists

La arquitectura nueva de entitlements ya quedó formalizada, pero el runtime todavía no tiene una capa reusable que la materialice. Hoy la autorización fina sigue repartida entre:

- `routeGroups`
- `authorizedViews`
- helpers locales en `src/lib/tenant/authorization.ts`
- guards por módulo o pathname

Eso deja dos problemas:

1. `TASK-402` correría el riesgo de implementar Home universal adaptativa con lógica ad hoc de permisos
2. `TASK-285` y futuros módulos seguirían creciendo sobre combinaciones de role/view/path en vez de hacerlo sobre capabilities reutilizables

Se necesita un primer slice pequeño pero real que:

- mantenga backward compatibility
- no exija migración completa de DB en la primera iteración
- exponga helpers runtime claros para Home y futuros módulos

## Goal

- Introducir una capa mínima de entitlements runtime compatible con el modelo actual
- Exponer helpers tipados para autorización por `module + capability + action + scope`
- Conectar `/home` y su snapshot a esa foundation como primer consumer real

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
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`

Reglas obligatorias:

- no romper el runtime actual de `roleCodes`, `routeGroups` ni `authorizedViews`
- la primera foundation debe ser compatible por derivación; no exigir un cutover total del modelo de auth
- los helpers de entitlements deben ser reusables en UI, API routes y Home
- la Home universal (`TASK-402`) debe consumir esta capa como primer bridge, no reimplementar permisos locales

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-402-universal-adaptive-home-orchestration.md`
- `docs/tasks/to-do/TASK-285-client-role-differentiation.md`

## Dependencies & Impact

### Depends on

- `src/lib/tenant/authorization.ts`
- `src/lib/tenant/get-tenant-context.ts`
- `src/lib/tenant/access.ts`
- `src/lib/auth.ts`
- `src/lib/tenant/role-route-mapping.ts`
- `src/config/role-codes.ts`
- `src/config/capability-registry.ts`
- `src/lib/capabilities/resolve-capabilities.ts`
- `src/lib/capabilities/verify-module-access.ts`
- `src/lib/home/get-home-snapshot.ts`
- `src/app/api/home/snapshot/route.ts`
- `src/app/api/home/nexa/route.ts`

### Blocks / Impacts

- `TASK-402`, porque la Home universal adaptativa debe apoyarse en esta foundation y no en checks ad hoc por `routeGroups`
- `TASK-285`, porque la diferenciación de cliente debería poder expresarse después con capabilities además de vistas
- guards compartidos de HR, Finance, People, Admin y Client Portal

### Files owned

- `src/lib/tenant/authorization.ts`
- `src/lib/tenant/get-tenant-context.ts`
- `src/lib/tenant/access.ts`
- `src/lib/auth.ts`
- `src/types/next-auth.d.ts`
- `src/lib/home/get-home-snapshot.ts`
- `src/app/api/home/snapshot/route.ts`
- `src/app/api/home/nexa/route.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/*.ts`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/tasks/in-progress/TASK-403-entitlements-runtime-foundation-home-bridge.md`

## Current Repo State

### Already exists

- `src/lib/tenant/authorization.ts` ya concentra varios helpers reutilizables (`hasRouteGroup`, `hasRoleCode`, `hasAuthorizedViewCode`, etc.)
- `src/lib/tenant/get-tenant-context.ts` ya expone el contexto base del usuario autenticado
- `src/lib/auth.ts` ya serializa `roleCodes`, `routeGroups`, `authorizedViews` y `portalHomePath` al JWT/session
- `resolvePortalHomePath()` ya centraliza la policy efectiva de landing y normaliza aliases legacy
- `src/config/capability-registry.ts` + `src/lib/capabilities/resolve-capabilities.ts` ya resuelven módulos visibles desde `businessLines` y `serviceModules`
- `src/lib/capabilities/verify-module-access.ts` ya ofrece un gate reusable para módulos capability-based
- `/home` ya existe y consume `src/lib/home/get-home-snapshot.ts` vía `GET /api/home/snapshot`
- `/api/home/nexa` ya reconstruye parte del mismo contexto de Home (módulos + señal financiera) para Nexa
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` ya formaliza el modelo objetivo

### Gap

- no existe aún una estructura runtime canónica de `entitlements`
- no existe un helper `can()` reutilizable para capabilities y actions
- `/home` y Nexa todavía leen módulos/capacidades desde lógica local, no desde una capa de entitlements reusable
- Home hoy no consume `authorizedViews` y solo usa `roleCodes` / `routeGroups` para `financeStatus`
- el contrato actual de Home tiene `tasks` con CTA potenciales, pero `TaskShortlist` no está montado; la primera adopción visible no puede asumir esa superficie como ya activa
- la autorización fina sigue derivándose con demasiada frecuencia desde `routeGroups` o guards por vista/path
- no existe un puente explícito entre el modelo actual y el modelo futuro de `module + capability + action + scope`

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

### Slice 1 — Catálogo y tipos de entitlements

- crear un catálogo mínimo y tipado de módulos/capabilities/actions/scopes para Greenhouse
- cubrir como primer set:
  - `home`
  - `agency`
  - `people`
  - `hr`
  - `finance`
  - `admin`
  - `client_portal`
  - `my_workspace`
- definir tipos y helpers base para representar `Entitlement`

### Slice 2 — Runtime bridge desde el modelo actual

- derivar entitlements mínimos desde `roleCodes`, `routeGroups` y/o `authorizedViews` sin romper compatibilidad
- exponer helpers del tipo:
  - `can(tenant, capability, action)`
  - `canSeeModule(tenant, module)`
  - `getTenantEntitlements(tenant)`
- evitar cambios de schema o migraciones duras en esta primera foundation

### Slice 3 — Bridge mínimo hacia `/home`

- conectar `getHomeSnapshot()`, `GET /api/home/snapshot` y `POST /api/home/nexa` a la nueva capa para que Home y Nexa compartan el mismo bridge runtime
- habilitar al menos un primer uso visible en Home:
  - módulos disponibles
  - shortcuts recomendados sobre superficies realmente montadas
  - CTA priorizados solo si el consumer visible queda efectivamente conectado en esta slice
- dejar la Home lista para que `TASK-402` construya la composición adaptativa sobre esta base

### Slice 4 — Tests y documentación de adopción

- agregar tests de derivación runtime para casos base:
  - superadmin
  - hr puro
  - finance puro
  - collaborator puro
  - client role
- documentar en la arquitectura cómo convive esta layer con `authorizedViews`

## Out of Scope

- migrar todo Greenhouse a un modelo full-entitlements en un solo paso
- reemplazar ya todos los guards/path checks del repo
- introducir una base de datos completa de entitlements persistidos si el bridge code-versioned resuelve este primer slice
- rediseñar visualmente Home más allá del bridge mínimo necesario

## Detailed Spec

Esta task debe funcionar como puente entre dos estados:

### Estado actual

- runtime centrado en `roleCodes + routeGroups + authorizedViews`

### Estado objetivo

- runtime híbrido con:
  - `roleCodes`
  - `routeGroups`
  - `entitlements`
  - `authorizedViews` como proyección derivada

Principios de implementación:

1. **Compatibilidad primero**
   - los consumers actuales no deben romperse
   - la nueva capa puede convivir sin reemplazar de inmediato la anterior

2. **Foundation pequeña pero real**
   - no crear una spec vacía
   - debe existir un helper reusable y al menos un consumer real (`/home`)

3. **Primero Home, luego expansión**
   - `/home` es el mejor primer consumer porque necesita orquestar múltiples superficies
   - el bridge debe alimentar también a Nexa para no dejar drift inmediato entre snapshot y asistente

4. **Modelar capabilities, no solo vistas**
   - la foundation debe pensar en capacidades funcionales aunque se derive desde estado actual

## Acceptance Criteria

- [x] existe una representación runtime mínima de entitlements para el tenant autenticado
- [x] existe al menos un helper reutilizable `can()` o equivalente para capabilities/actions
- [x] `/home` consume esa capa de entitlements como primer bridge real
- [x] la foundation no rompe `roleCodes`, `routeGroups` ni `authorizedViews`
- [x] hay tests para la derivación de entitlements en perfiles base
- [x] `TASK-402` puede apoyarse explícitamente en esta foundation para la Home universal adaptativa

## Verification

- [x] `pnpm lint`
- [x] `pnpm build`
- [x] `pnpm vitest run src/lib/entitlements/runtime.test.ts src/lib/home/build-home-entitlements-context.test.ts`
- [ ] login manual con superadmin y validación de `/home`
- [ ] verificación manual de que `/home` recibe contexto suficiente para modular accesos/CTA desde la nueva capa

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` quedo reconciliado con la implementación real del bridge

## Follow-ups

- persistir entitlements en tablas dedicadas si el bridge code-versioned demuestra valor real
- expandir la adopción a HR, Finance, People y Admin después del bridge mínimo de Home
- reevaluar `authorizedViews` como cache/proyección derivada cuando más consumers migren

## Open Questions

- ¿el primer catálogo de entitlements debe vivir code-versioned o ya nacer con persistencia en PostgreSQL?
- ¿la primera exposición de entitlements en la session/JWT debe ser completa o resolver siempre server-side?
