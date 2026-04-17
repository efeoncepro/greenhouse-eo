## Delta 2026-04-17 — expansión de alcance: capa de capabilities + bindings + role defaults

Cuando esta task se diseñó, el modelo de autorización del portal solo manejaba view codes + role-view assignments. Desde entonces se operacionalizó la capa fina (TASK-403 Entitlements Runtime Foundation + TASK-404 Entitlements Governance Admin Center, ambas complete):

- 9 módulos canónicos en `src/config/entitlements-catalog.ts` con 16 capabilities activas.
- Runtime `hasEntitlement(subject, capability, action, scope)` operativo en 10+ endpoints.
- `src/lib/admin/entitlement-view-map.ts` como source of truth del binding vista↔capabilities.
- Governance admin center (role defaults, user overrides, audit log) sobre `role_entitlement_defaults`, `user_entitlement_overrides`, `entitlement_governance_audit_log`.

Por eso esta task queda ampliada:

- Agregar la capa de capabilities para las 10 vistas nuevas (no solo view codes).
- Declarar bindings vista↔capability en `entitlement-view-map.ts`.
- Declarar role defaults por rol cliente en `role_entitlement_defaults`.
- Mantener `client_portal.workspace` como capability broad — las nuevas capabilities específicas son **adicionales**, no sustitutas.
- Scope canónico para todas las capabilities cliente: `organization` (el cliente ve solo su propia org). Nunca `tenant` ni `all`.

Regla dura adicional: esta task **no** migra retroactivamente las 11 vistas `cliente.*` existentes (que hoy todas mapean a `client_portal.workspace` genérico) — ese refactor vive en follow-up para no mezclar alcance.

## Delta 2026-04-16

- TASK-285 completada — `role_view_assignments` sembrados para 3 roles x 11 vistas. La infraestructura esta activa. Esta task puede agregar view codes nuevos e insertar sus assignments en la misma tabla.
- No se crearon route groups nuevos — la diferenciacion es via view code assignments, no route groups.

# TASK-286 — Client View Catalog Expansion

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Medio` (antes `Bajo` — ampliado 2026-04-17 al sumar capa de entitlements)
- Type: `implementation`
- Status real: `Diseno`
- Rank: `2`
- Domain: `platform`
- Blocked by: `none` (TASK-285 completada 2026-04-16; TASK-403/404 completas habilitan la capa fina)
- Branch: `task/TASK-286-client-view-catalog-expansion`

## Summary

Registrar los 10 view codes nuevos del portal cliente enterprise en el catalogo de vistas, declarar sus capabilities en el catalogo de entitlements con actions + scope `organization`, crear los bindings vista↔capability en `entitlement-view-map.ts`, y configurar role defaults por rol cliente. Hoy hay 11 view codes `cliente.*` mapeando todos a `client_portal.workspace` genérico. Despues de esta task habra 21 view codes + ~10 capabilities específicas para el portal cliente, con autorización fina al nivel del resto del sistema.

## Why This Task Exists

Las vistas nuevas propuestas en §13.1 del doc de arquitectura necesitan view codes registrados para que el sistema de autorizacion y el menu las reconozcan. Sin esto, las paginas no pueden protegerse por rol ni aparecer en el menu.

Adicionalmente, desde que se completó TASK-403/404 el portal tiene capa fina de entitlements (modules + capabilities + actions + scope). El portal cliente es hoy el único dominio donde todas las vistas se gatean por un único capability genérico (`client_portal.workspace`) — agregar 10 vistas más con el mismo patrón perpetúa la deuda. Esta task corrige el diseño antes de la implementación.

## Goal

- 10 view codes nuevos registrados en `view-access-catalog.ts`.
- ~10 capabilities nuevas declaradas en `entitlements-catalog.ts`, con `defaultScope: 'organization'`.
- Bindings vista↔capabilities en `entitlement-view-map.ts` para cada view code nuevo.
- Seed de `role_entitlement_defaults` por rol cliente (client_admin, client_viewer, y los demás roles cliente que apliquen).
- Cada view code asignado a los roles correctos segun la matriz de §12.5.
- Menu items nuevos configurados (con graceful degradation si la pagina no existe aun).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §4, §12.5, §13.1
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — modelo canónico module + capability + action + scope, y regla de coexistencia con views.

Reglas obligatorias:

- Usar la seccion `cliente` existente en `GOVERNANCE_SECTIONS`.
- Mantener el accent color `success` (verde) para la seccion cliente.
- Cada view code debe tener: viewCode, section, label, description, routePath, routeGroup.
- Cada view code nuevo debe tener al menos un binding en `entitlement-view-map.ts`. No se aceptan views nuevos que solo se gatean por `routeGroup: 'client'` + view code sin capability.
- Todas las capabilities cliente nuevas usan `defaultScope: 'organization'`. No `tenant`, no `all`.
- Las capabilities nuevas conviven con `client_portal.workspace` — no lo reemplazan. `client_portal.workspace` sigue siendo el broad gate del portal cliente; las nuevas son fine-grained por vista.
- Donde la vista tiene acciones reales (approve, comment, download, export, edit), declarar la capability con esas actions; no colapsar todo a `view`.

## Dependencies & Impact

### Depends on

- TASK-285 (role differentiation) — los route groups deben estar diferenciados.
- TASK-403 (Entitlements Runtime Foundation) — completa; habilita `hasEntitlement`/`can`.
- TASK-404 (Entitlements Governance Admin Center) — completa; habilita governance tables y audit log.
- View catalog en `src/lib/admin/view-access-catalog.ts`.
- Entitlements catalog en `src/config/entitlements-catalog.ts`.
- Binding source en `src/lib/admin/entitlement-view-map.ts`.
- Governance tables: `role_entitlement_defaults`, `user_entitlement_overrides`, `entitlement_governance_audit_log`.

### Blocks / Impacts

- Todas las tasks de vistas nuevas (TASK-287 a TASK-304) — necesitan el view code registrado Y la capability declarada para proteger la página con `can(...)`.
- Cualquier page nueva del portal cliente no puede usar solo `hasAuthorizedViewCode` — debe combinar view code + capability check.

### Files owned

- `src/lib/admin/view-access-catalog.ts` (seccion cliente).
- `src/config/entitlements-catalog.ts` (capabilities cliente nuevas).
- `src/lib/admin/entitlement-view-map.ts` (bindings vista↔capability para los 10 views nuevos).
- Migración/seed de `role_entitlement_defaults` para roles cliente.

## Current Repo State

### Already exists

- 11 view codes `cliente.*` registrados (L451-537 de view-access-catalog.ts).
- Seccion `cliente` en `GOVERNANCE_SECTIONS`.
- Pattern de registro establecido.
- Entitlements runtime (`hasEntitlement`, `can`) operativo en 10+ endpoints.
- 9 módulos / 16 capabilities en `entitlements-catalog.ts`, incluido `client_portal.workspace`.
- Governance admin center (role defaults, user overrides, audit log).
- `entitlement-view-map.ts` hoy mapea los 11 `cliente.*` existentes todos al mismo `client_portal.workspace` (autorización coarse).

### Gap

- Faltan 10 view codes: `cliente.revenue_enabled`, `cliente.brand_health`, `cliente.qbr`, `cliente.pipeline`, `cliente.brief_clarity`, `cliente.sla`, `cliente.reportes`, `cliente.mis_revisiones`, `cliente.asset_tracker`, `cliente.mi_proyecto`.
- Faltan capabilities granulares para las 10 vistas nuevas en `entitlements-catalog.ts`.
- Faltan bindings vista↔capability en `entitlement-view-map.ts` para los 10 view codes nuevos.
- Faltan role defaults por rol cliente (client_admin, client_viewer, etc.) en `role_entitlement_defaults`.
- Las 11 vistas `cliente.*` existentes están mapeadas todas a `client_portal.workspace` — es deuda conocida que esta task NO resuelve retroactivamente (se deriva como follow-up).

## Scope

### Slice 1 — Registrar view codes

Agregar al array `VIEW_REGISTRY` los 10 view codes nuevos:

| View Code | Label | Ruta | Route Group |
|-----------|-------|------|-------------|
| `cliente.revenue_enabled` | Revenue Enabled | `/revenue-enabled` | `client` |
| `cliente.brand_health` | Brand Health | `/brand-health` | `client` |
| `cliente.qbr` | Executive Summary | `/qbr` | `client` |
| `cliente.pipeline` | Pipeline | `/pipeline` | `client` |
| `cliente.brief_clarity` | Brief Clarity | `/brief-clarity` | `client` |
| `cliente.sla` | SLA & Performance | `/sla` | `client` |
| `cliente.reportes` | Reportes | `/reports` | `client` |
| `cliente.mis_revisiones` | Mis Revisiones | `/my-reviews` | `client` |
| `cliente.asset_tracker` | Asset Tracker | `/asset-tracker` | `client` |
| `cliente.mi_proyecto` | Mi Proyecto | `/my-project` | `client` |

### Slice 2 — Configurar role-view assignments

Configurar en view-access-store o via fallback que cada rol vea los view codes correctos segun §12.5.

### Slice 3 — Declarar capabilities en entitlements-catalog.ts

Agregar las siguientes capabilities al catalog con `module: 'client_portal'`, `defaultScope: 'organization'`. Las actions reflejan lo que realmente hace cada vista — no colapsar todo a `view`.

| Capability key | Actions | Notas |
|---|---|---|
| `client_portal.revenue_enabled` | `view` | Dashboard read-only |
| `client_portal.brand_health` | `view` | Dashboard read-only |
| `client_portal.qbr` | `view`, `export` | Executive summary con export a PDF/slides |
| `client_portal.pipeline` | `view` | Dashboard read-only |
| `client_portal.brief_clarity` | `view`, `edit` | Si el cliente edita briefs; si es read-only métricas, dejar solo `view` (validar en planning) |
| `client_portal.sla` | `view` | Dashboard read-only |
| `client_portal.reports` | `view`, `export` | Reportería con export |
| `client_portal.reviews` | `view`, `approve`, `reject`, `comment` | Flujo de revisiones del cliente |
| `client_portal.assets` | `view`, `download` | Asset tracker con descarga |
| `client_portal.project` | `view`, `comment` | Mi proyecto con comentarios |

Reglas:

- `defaultScope: 'organization'` en las 10 capabilities. Nunca `tenant` ni `all`.
- Los namespaces `client_portal.*` son **adicionales** a `client_portal.workspace`, no sustitutos.
- Si existe una capability global `*.export` o `*.comment` transversal, evaluar reuso antes de declarar específica; si no existe, la específica por vista es la opción canónica.

### Slice 4 — Bindings vista↔capabilities en entitlement-view-map.ts

Para cada view code nuevo, declarar la lista de capabilities requeridas. Baseline (ajustar según decisiones de Slice 3):

| View code | Capabilities requeridas |
|---|---|
| `cliente.revenue_enabled` | `client_portal.revenue_enabled` |
| `cliente.brand_health` | `client_portal.brand_health` |
| `cliente.qbr` | `client_portal.qbr` |
| `cliente.pipeline` | `client_portal.pipeline` |
| `cliente.brief_clarity` | `client_portal.brief_clarity` |
| `cliente.sla` | `client_portal.sla` |
| `cliente.reportes` | `client_portal.reports` |
| `cliente.mis_revisiones` | `client_portal.reviews` |
| `cliente.asset_tracker` | `client_portal.assets` |
| `cliente.mi_proyecto` | `client_portal.project` |

Regla: `client_portal.workspace` se mantiene como el broad gate del portal cliente, pero ya no alcanza como único binding para las vistas nuevas.

### Slice 5 — Role defaults en role_entitlement_defaults

Seed por rol cliente. Matriz propuesta (a validar en planning contra §12.5 del doc de arquitectura cliente):

| Rol | Capabilities + actions default |
|---|---|
| `client_admin` | Todas las capabilities `client_portal.*` con todas las actions disponibles, scope `organization` |
| `client_viewer` | Todas las capabilities `client_portal.*` con solo `view` (+ `download` en assets, + `export` en qbr/reports si aplica según §12.5) |
| `client_approver` (si existe) | `client_portal.reviews` con `view`, `approve`, `reject`, `comment`; resto con solo `view` |

Documentar en el commit del seed los overrides iniciales si los hay.

### Slice 6 — Agregar menu items

Agregar los items nuevos al menu lateral en `VerticalMenu.tsx` con `canSeeView()` checks **+ `can(capability)` check** donde aplique para mostrar/ocultar items según fine-grained access. Las paginas no existen aun — el menu solo mostrara items cuya pagina este implementada (graceful degradation via check de ruta existente o feature flag).

## Out of Scope

- Crear las paginas de las vistas (cada una es una task separada TASK-287+).
- Crear APIs nuevas.
- Cambiar el modelo de datos de view access.
- **Refactor retroactivo de las 11 vistas `cliente.*` existentes** que hoy mapean todas a `client_portal.workspace` — esa migración vive en una follow-up task separada para no mezclar alcance ni arriesgar regresiones en surfaces ya productivas.
- Nuevas capabilities transversales (export/comment) globales cross-módulo — evaluar en otra lane si se detecta reuso alto.

## Acceptance Criteria

### Cualitativos

- [ ] 21 view codes `cliente.*` registrados en `view-access-catalog.ts`.
- [ ] Cada view code tiene label, description, routePath y routeGroup correctos.
- [ ] `pnpm build` pasa sin errores.
- [ ] View codes nuevos aparecen en Admin Center > Governance > View Access (si existe la UI).
- [ ] `lint && tsc --noEmit && test` pasan.

### Medibles (hard numbers)

- [ ] **10** capabilities nuevas en `entitlements-catalog.ts` con `module: 'client_portal'` y `defaultScope: 'organization'`.
- [ ] **0** capabilities nuevas con scope distinto a `organization` (validar con grep).
- [ ] **10** bindings nuevos en `entitlement-view-map.ts` — cada view code nuevo tiene al menos 1 capability mapeada; ninguno depende exclusivamente de `client_portal.workspace`.
- [ ] **Role defaults** seeded para al menos 2 roles cliente (client_admin, client_viewer) cubriendo las 10 capabilities nuevas; audit log registra el seed.
- [ ] Test de integración: un usuario con rol `client_viewer` NO puede ejecutar `approve` sobre `client_portal.reviews`; un `client_admin` sí.

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- Validación manual en Admin Center: role defaults visibles, capabilities listadas correctamente.
- Query de validación: `SELECT COUNT(*) FROM role_entitlement_defaults WHERE capability_key LIKE 'client_portal.%'` retorna el número esperado.

## Closing Protocol

- [ ] Actualizar §4 del doc de arquitectura con los 21 view codes.
- [ ] Actualizar `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` con el nuevo namespace `client_portal.*` granular.
- [ ] Ejecutar chequeo de impacto cruzado sobre TASK-287 a TASK-304 (derivadas) — cada una debe consumir la capability + view code correspondiente cuando implemente la página.
- [ ] Crear follow-up task: "Refactor retroactivo de las 11 vistas `cliente.*` existentes para adoptar capabilities granulares".

## Follow-ups

- Cada task de vista nueva (TASK-287 a TASK-304) implementa la pagina del view code consumiendo la capability correspondiente via `can(...)` en page-level guard + UI del menú.
- Task nueva: refactor retroactivo de los 11 `cliente.*` existentes.
- Task opcional: extraer capabilities transversales (`*.export`, `*.comment`) si se detecta reuso alto fuera del portal cliente.
