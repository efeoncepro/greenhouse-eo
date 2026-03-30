# Handoff.md

## Uso

Este archivo es el snapshot operativo entre agentes. Debe priorizar claridad y continuidad.

## Sesión 2026-03-30 — documentación arquitectónica del modelo de views

### Completado
- El modelo de gobernanza por vistas ya quedó documentado en arquitectura, no solo en tasks/handoff:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
  - `project_context.md`
- Quedó explícito que:
  - `routeGroups` siguen como boundary broad
  - `authorizedViews` + `view_code` son la capa fina
  - `/admin/views` es la superficie oficial para operar matrix, overrides, expiración, auditoría y preview

### Validación ejecutada
- Validación documental/manual del delta en arquitectura

### Pendiente inmediato
- Si en el siguiente corte nacen más superficies gobernables, ya no deberían documentarse solo en la task; deben actualizar también la arquitectura canónica.

## Sesión 2026-03-30 — TASK-136 cierra más rutas terciarias y completa la operabilidad de `/admin/views`

### Completado
- Se ampliaron superficies gobernables client-facing en `view_registry`:
  - `cliente.campanas`
  - `cliente.notificaciones`
- Nuevos guards por layout activos en:
  - `src/app/(dashboard)/campaigns/layout.tsx`
  - `src/app/(dashboard)/campanas/layout.tsx`
  - `src/app/(dashboard)/notifications/layout.tsx`
- `/admin/views` ya no se comporta solo como matrix editable básica:
  - resumen de cambios pendientes vs estado persistido
  - foco sobre vistas que siguen en fallback hardcoded
  - preview con baseline visible, overrides activos, grants extra y revokes efectivos
  - filtro del panel de overrides por `impact / overrides / visibles / todas`
  - lectura más clara de vistas ocultas por revoke

### Archivos tocados
- `src/lib/admin/view-access-catalog.ts`
- `src/app/(dashboard)/campaigns/layout.tsx`
- `src/app/(dashboard)/campanas/layout.tsx`
- `src/app/(dashboard)/notifications/layout.tsx`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `changelog.md`

### Validación ejecutada
- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/campaigns/layout.tsx src/app/'(dashboard)'/campanas/layout.tsx src/app/'(dashboard)'/notifications/layout.tsx src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato
- `home` y algunos access points transversales siguen sin `view_code` propio porque todavía conviene decidir si deben ser superficies gobernables o rutas base siempre disponibles para sesión autenticada.
- Quedan cambios ajenos en el árbol fuera de este carril:
  - `src/lib/operations/get-operations-overview.ts`
  - `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
  - `src/lib/finance/dte-emission-queue.test.ts`

## Sesión 2026-03-30 — TASK-136 agrega notificación reactiva al usuario afectado

### Completado
- Los overrides por usuario de `/admin/views` ya no quedan solo en persistencia + auditoría:
  - `saveUserViewOverrides()` ahora compara acceso efectivo antes/después del save
  - cuando el set real de vistas cambia, publica un evento outbox `access.view_override_changed`
- Los overrides expirados ya no quedan como deuda silenciosa:
  - `getPersistedUserOverrides()` limpia overrides vencidos de forma oportunista
  - registra `expire_user` en `greenhouse_core.view_access_log`
  - publica el mismo evento reactivo si la expiración cambia el acceso efectivo del usuario
- El dominio `notifications` ya consume ese evento y notifica al usuario afectado con:
  - resumen de vistas concedidas
  - resumen de vistas revocadas
  - deep-link preferente a la vista recién habilitada o fallback `/dashboard`
- Se agregó cobertura unitaria del projection reactivo para este caso.

### Archivos tocados
- `src/lib/admin/view-access-store.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/sync/projections/notifications.test.ts`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `changelog.md`

### Validación ejecutada
- `pnpm exec vitest run src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint src/lib/admin/view-access-store.ts src/lib/sync/event-catalog.ts src/lib/sync/projections/notifications.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato
- El evento hoy notifica solo cuando cambia el acceso efectivo; ajustes de razón sin cambio de vistas no notifican al usuario, por diseño.
- El siguiente cierre fuerte de `TASK-136` pasa por:
  - modelar más rutas terciarias con `view_code` propio donde todavía exista herencia amplia
  - decidir si conviene exponer en UI un historial más rico de expiraciones/cleanup automático

## Sesión 2026-03-30 — baseline moderna de UI/UX y skills locales

### Completado
- Se auditó la capa local de skills UI de Greenhouse y se confirmó drift operativo:
  - el repo dependía demasiado de skills globales y de una lectura vieja de Vuexy
  - `greenhouse-ui-orchestrator` referenciaba heurísticas no alineadas con el estado actual
- Se agregó `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` como referencia canónica para:
  - first-fold hierarchy
  - densidad y ritmo visual
  - estados empty/partial/warning/error
  - UX writing
  - accessibility baseline
- Se reforzaron las skills locales:
  - `.codex/skills/greenhouse-agent/SKILL.md`
  - `.codex/skills/greenhouse-vuexy-ui-expert/SKILL.md`
  - `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
  - `.codex/skills/greenhouse-ui-orchestrator/SKILL.md`
- Nueva skill creada:
  - `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`

### Fuentes externas sintetizadas
- Android Developers / Material guidance para layouts adaptativos y list-detail
- GOV.UK Design System
- US Web Design System
- Atlassian content design
- W3C WAI / WCAG quick reference

### Pendiente inmediato
- No hay validación de build necesaria por ser un cambio documental/skills, pero conviene probar en los siguientes trabajos UI que la selección automática de skills ya priorice la baseline local.

## Sesión 2026-03-30 — TASK-136 iniciada con slice UI de gobernanza de vistas

### Completado
- `TASK-136` pasó a `in-progress`.
- Se abrió el primer corte real del módulo en `/admin/views` para probar la nueva baseline UI/UX en una superficie compleja de admin governance.
- El slice actual implementa:
  - hero y KPIs de contexto
  - matriz de acceso por vista × rol
  - filtros por sección y tipo de rol
  - preview por usuario de la navegación efectiva
  - cards de siguiente slice para overrides, persistencia configurable y auditoría
- Integración inicial aplicada en:
  - `Admin Center` landing
  - sidebar admin
- Decisión deliberada del slice:
  - la pantalla usa el baseline real actual (`roles` + `routeGroups`) sin fingir todavía `view_registry` persistido
  - esto deja honesto el estado parcial de la lane y permite validar UX antes del cambio fuerte de backend

### Archivos tocados
- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `src/app/(dashboard)/admin/views/page.tsx`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

### Pendiente inmediato
- Validar `lint` del slice nuevo.
- Evaluar si el helper actual debe endurecer la simulación de acceso de admin para empatar exactamente todos los casos especiales del menú vigente.
- Siguiente salto funcional de la task:
  - persistencia `view_registry` / `role_view_assignments`
  - overrides por usuario
  - auditoría y save real

## Sesión 2026-03-30 — TASK-137 iniciada con activación real de la foundation UI

### Completado
- `TASK-137` pasó a `in-progress`.
- Se activó un slice inicial real de la capa UI transversal:
  - `react-hook-form` en `Login`
  - `react-hook-form` en `Forgot Password`
  - `GreenhouseDatePicker`
  - `GreenhouseCalendar`
  - `GreenhouseDragList`
- Primera vista de calendario en repo:
  - `/admin/operational-calendar`
- Primer uso real de drag-and-drop:
  - reorder local de domain cards en `Admin Center`
- Arquitectura UI actualizada para reflejar activación real en:
  - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

### Archivos tocados
- `src/lib/forms/greenhouse-form-patterns.ts`
- `src/views/Login.tsx`
- `src/app/(blank-layout-pages)/auth/forgot-password/page.tsx`
- `src/components/greenhouse/GreenhouseDatePicker.tsx`
- `src/components/greenhouse/GreenhouseCalendar.tsx`
- `src/components/greenhouse/GreenhouseDragList.tsx`
- `src/components/greenhouse/index.ts`
- `src/lib/calendar/get-admin-operational-calendar-overview.ts`
- `src/views/greenhouse/admin/AdminOperationalCalendarView.tsx`
- `src/app/(dashboard)/admin/operational-calendar/page.tsx`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `docs/tasks/in-progress/TASK-137-ui-foundation-activation.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

### Pendiente inmediato
- Correr validación local del slice (`eslint`, `tsc`, `build`, `test`).
- Confirmar si el wrapper de date picker necesita endurecer integración explícita con `Controller` para forms complejos futuros.

## Sesión 2026-03-30 — TASK-136 avanza a persistencia inicial por rol

### Completado
- `/admin/views` ya soporta save real de la matriz role × view.
- Nuevo slice persistido implementado:
  - store Postgres para catálogo de vistas y assignments
  - API admin `POST /api/admin/views/assignments`
  - matrix editable en UI con guardar/restablecer
  - fallback seguro al baseline hardcoded cuando la capa persistida no está lista
- Infra aplicada en dev con:
  - `pnpm setup:postgres:view-access`

### Archivos tocados
- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/view-access-store.ts`
- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `src/app/api/admin/views/assignments/route.ts`
- `scripts/setup-postgres-view-access.sql`
- `scripts/setup-postgres-view-access.ts`
- `package.json`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`

### Validación ejecutada
- `pnpm pg:doctor`
- `pnpm setup:postgres:view-access`
- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/lib/admin/view-access-store.ts src/lib/admin/get-admin-view-access-governance.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/app/api/admin/views/assignments/route.ts scripts/setup-postgres-view-access.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato
- Conectar esta persistencia al runtime de sesión (`TenantContext`, `NextAuth`, guards y menú) para que las vistas guardadas gobiernen acceso real y no solo la matrix administrativa.
- Activar overrides por usuario y auditoría visible en la misma pantalla.

## Sesión 2026-03-30 — TASK-136 integra authorizedViews en sesión y navegación

### Completado
- `TenantAccessRecord` ahora resuelve `authorizedViews` desde la capa persistida de view access cuando existe.
- `NextAuth` y `TenantContext` ya propagan:
  - `authorizedViews`
  - `routeGroups` derivados de las vistas autorizadas
- `VerticalMenu` ya usa `authorizedViews` para filtrar items clave de:
  - Gestión
  - Finanzas
  - HR
  - Administración
  - AI tooling

### Validación ejecutada
- `pnpm exec eslint src/lib/admin/view-access-store.ts src/lib/tenant/access.ts src/lib/auth.ts src/lib/tenant/get-tenant-context.ts src/types/next-auth.d.ts src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato
- Los guards broad por layout ya heredan `routeGroups` derivados, pero aún no existe enforcement page-level exhaustivo por `view_code` en todas las rutas del portal.
- El warning OpenSSL/JWT durante `build` sigue apareciendo en static generation de `/admin/views`; el artefacto termina bien y cae a fallback hardcoded durante esa fase.

## Sesión 2026-03-30 — TASK-136 cierra el primer enforcement page-level por view_code

### Completado
- Se agregó `hasAuthorizedViewCode()` en `src/lib/tenant/authorization.ts` para resolver autorización por vista usando:
  - `tenant.authorizedViews`
  - fallback explícito a `routeGroups` cuando el catálogo persistido aún no gobierna ese usuario
- Ya hay enforcement page-level o nested layout específico para superficies catalogadas clave:
  - `/dashboard`, `/settings`
  - `/proyectos/**`, `/sprints/**`
  - `/agency`, `/agency/organizations/**`, `/agency/services/**`
  - `/people/**`, `/hr/payroll/**`
  - `/finance`, `/finance/income/**`, `/finance/expenses/**`, `/finance/reconciliation/**`
  - `/admin`, `/admin/roles`, `/admin/views`, `/admin/ops-health`, `/admin/ai-tools`, `/admin/tenants/**`, `/admin/users/**`
  - `/my/profile`, `/my/payroll`

### Archivos tocados
- `src/lib/tenant/authorization.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/proyectos/layout.tsx`
- `src/app/(dashboard)/sprints/layout.tsx`
- `src/app/(dashboard)/agency/page.tsx`
- `src/app/(dashboard)/agency/organizations/layout.tsx`
- `src/app/(dashboard)/agency/services/layout.tsx`
- `src/app/(dashboard)/people/layout.tsx`
- `src/app/(dashboard)/hr/payroll/layout.tsx`
- `src/app/(dashboard)/finance/page.tsx`
- `src/app/(dashboard)/finance/income/layout.tsx`
- `src/app/(dashboard)/finance/expenses/layout.tsx`
- `src/app/(dashboard)/finance/reconciliation/layout.tsx`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/admin/roles/page.tsx`
- `src/app/(dashboard)/admin/views/page.tsx`
- `src/app/(dashboard)/admin/ops-health/page.tsx`
- `src/app/(dashboard)/admin/ai-tools/page.tsx`
- `src/app/(dashboard)/admin/tenants/layout.tsx`
- `src/app/(dashboard)/admin/users/layout.tsx`
- `src/app/(dashboard)/my/profile/page.tsx`
- `src/app/(dashboard)/my/payroll/page.tsx`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `changelog.md`

### Validación ejecutada
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/tenant/authorization.ts src/app/'(dashboard)'/agency/page.tsx src/app/'(dashboard)'/agency/organizations/layout.tsx src/app/'(dashboard)'/agency/services/layout.tsx src/app/'(dashboard)'/dashboard/page.tsx src/app/'(dashboard)'/finance/page.tsx src/app/'(dashboard)'/finance/income/layout.tsx src/app/'(dashboard)'/finance/expenses/layout.tsx src/app/'(dashboard)'/finance/reconciliation/layout.tsx src/app/'(dashboard)'/hr/payroll/layout.tsx src/app/'(dashboard)'/people/layout.tsx src/app/'(dashboard)'/admin/page.tsx src/app/'(dashboard)'/admin/roles/page.tsx src/app/'(dashboard)'/admin/views/page.tsx src/app/'(dashboard)'/admin/ops-health/page.tsx src/app/'(dashboard)'/admin/ai-tools/page.tsx src/app/'(dashboard)'/admin/tenants/layout.tsx src/app/'(dashboard)'/admin/users/layout.tsx src/app/'(dashboard)'/my/profile/page.tsx src/app/'(dashboard)'/my/payroll/page.tsx src/app/'(dashboard)'/settings/page.tsx src/app/'(dashboard)'/proyectos/layout.tsx src/app/'(dashboard)'/sprints/layout.tsx`
- `pnpm build`

### Pendiente inmediato
- Extender el mismo enforcement a rutas todavía no catalogadas en `view_registry` para reducir los últimos escapes por subpath.
- Decidir si algunos módulos amplios deben endurecerse con layouts más altos en el árbol una vez que el catálogo de vistas cubra todos los descendants.

## Sesión 2026-03-30 — TASK-136 amplía enforcement sobre layouts amplios y páginas vecinas

### Completado
- `src/lib/tenant/authorization.ts` ahora también expone `hasAnyAuthorizedViewCode()`.
- Los layouts amplios ya respetan catálogo persistido cuando existe:
  - `src/app/(dashboard)/admin/layout.tsx`
  - `src/app/(dashboard)/finance/layout.tsx`
  - `src/app/(dashboard)/hr/layout.tsx`
  - `src/app/(dashboard)/my/layout.tsx` nuevo
- Páginas vecinas no catalogadas todavía quedaron amarradas al `view_code` más cercano:
  - `src/app/(dashboard)/hr/leave/page.tsx` → `equipo.permisos`
  - `src/app/(dashboard)/admin/team/page.tsx` → `administracion.usuarios`
  - `src/app/(dashboard)/admin/operational-calendar/page.tsx` → `administracion.admin_center`
  - `src/app/(dashboard)/admin/cloud-integrations/page.tsx` → `administracion.ops_health`
  - `src/app/(dashboard)/admin/email-delivery/page.tsx` → `administracion.ops_health`
  - `src/app/(dashboard)/admin/notifications/page.tsx` → `administracion.ops_health`
  - `src/app/(dashboard)/finance/intelligence/page.tsx` → `finanzas.resumen`
  - `src/app/(dashboard)/finance/cost-allocations/page.tsx` → `finanzas.resumen`

### Validación ejecutada
- `pnpm exec eslint src/lib/tenant/authorization.ts src/app/'(dashboard)'/admin/layout.tsx src/app/'(dashboard)'/finance/layout.tsx src/app/'(dashboard)'/hr/layout.tsx src/app/'(dashboard)'/my/layout.tsx src/app/'(dashboard)'/hr/leave/page.tsx src/app/'(dashboard)'/admin/team/page.tsx src/app/'(dashboard)'/admin/operational-calendar/page.tsx src/app/'(dashboard)'/admin/email-delivery/page.tsx src/app/'(dashboard)'/admin/notifications/page.tsx src/app/'(dashboard)'/admin/cloud-integrations/page.tsx src/app/'(dashboard)'/finance/intelligence/page.tsx src/app/'(dashboard)'/finance/cost-allocations/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato
- El enforcement ya cubre mejor navegación y descendencia visible, pero el catálogo `view_registry` sigue sin modelar cada superficie secundaria del portal.
- El siguiente paso saludable es expandir `view_registry` antes de seguir repartiendo ownership de subpaths ambiguos por inferencia.

## Sesión 2026-03-30 — TASK-136 empieza el cierre del cuello de modelo en Admin + Finance

### Completado
- `src/lib/admin/view-access-catalog.ts` sumó nuevos `view_code` explícitos:
  - `finanzas.clientes`
  - `finanzas.proveedores`
  - `finanzas.inteligencia`
  - `finanzas.asignaciones_costos`
  - `administracion.cloud_integrations`
  - `administracion.email_delivery`
  - `administracion.notifications`
  - `administracion.calendario_operativo`
  - `administracion.equipo`
- Se alinearon guards directos con esos códigos nuevos en:
  - `src/app/(dashboard)/admin/team/page.tsx`
  - `src/app/(dashboard)/admin/operational-calendar/page.tsx`
  - `src/app/(dashboard)/admin/email-delivery/page.tsx`
  - `src/app/(dashboard)/admin/notifications/page.tsx`
  - `src/app/(dashboard)/admin/cloud-integrations/page.tsx`
  - `src/app/(dashboard)/finance/intelligence/page.tsx`
  - `src/app/(dashboard)/finance/cost-allocations/page.tsx`
  - `src/app/(dashboard)/finance/clients/layout.tsx`
  - `src/app/(dashboard)/finance/suppliers/layout.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` ya filtra también esos accesos nuevos en sidebar.
- Hardening clave del resolver:
  - `src/lib/admin/view-access-store.ts` ya no apaga por defecto un `view_code` nuevo cuando un rol tiene assignments persistidos parciales
  - si falta la combinación `role_code + view_code`, se usa fallback por vista hasta que se persista explícitamente

### Validación ejecutada
- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/lib/admin/view-access-store.ts src/components/layout/vertical/VerticalMenu.tsx src/app/'(dashboard)'/finance/clients/layout.tsx src/app/'(dashboard)'/finance/suppliers/layout.tsx src/app/'(dashboard)'/admin/team/page.tsx src/app/'(dashboard)'/admin/operational-calendar/page.tsx src/app/'(dashboard)'/admin/email-delivery/page.tsx src/app/'(dashboard)'/admin/notifications/page.tsx src/app/'(dashboard)'/admin/cloud-integrations/page.tsx src/app/'(dashboard)'/finance/intelligence/page.tsx src/app/'(dashboard)'/finance/cost-allocations/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato
- Repetir la misma expansión de modelo en `Agency`, `HR`, `My` y otras superficies secundarias para quitar más inferencias del catálogo.
- Luego de eso, recién tiene sentido abrir con fuerza los overrides por usuario y la auditoría fina desde `/admin/views`.

## Sesión 2026-03-30 — TASK-136 extiende el catálogo a Agency, HR y My

### Completado
- `src/lib/admin/view-access-catalog.ts` sumó nuevos `view_code` explícitos en:
  - Agency: `gestion.spaces`, `gestion.economia`, `gestion.equipo`, `gestion.delivery`, `gestion.campanas`, `gestion.operaciones`
  - HR: `equipo.departamentos`, `equipo.asistencia`
  - My: `mi_ficha.mi_inicio`, `mi_ficha.mis_asignaciones`, `mi_ficha.mi_desempeno`, `mi_ficha.mi_delivery`, `mi_ficha.mis_permisos`, `mi_ficha.mi_organizacion`
- Se alinearon guards concretos en:
  - `src/app/(dashboard)/agency/layout.tsx`
  - `src/app/(dashboard)/agency/spaces/page.tsx`
  - `src/app/(dashboard)/agency/economics/page.tsx`
  - `src/app/(dashboard)/agency/team/page.tsx`
  - `src/app/(dashboard)/agency/delivery/page.tsx`
  - `src/app/(dashboard)/agency/campaigns/page.tsx`
  - `src/app/(dashboard)/agency/operations/page.tsx`
  - `src/app/(dashboard)/hr/departments/page.tsx`
  - `src/app/(dashboard)/hr/attendance/page.tsx`
  - `src/app/(dashboard)/my/layout.tsx`
  - `src/app/(dashboard)/my/page.tsx`
  - `src/app/(dashboard)/my/assignments/page.tsx`
  - `src/app/(dashboard)/my/delivery/page.tsx`
  - `src/app/(dashboard)/my/performance/page.tsx`
  - `src/app/(dashboard)/my/leave/page.tsx`
  - `src/app/(dashboard)/my/organization/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` ya filtra también `Agency`, `HR` y `Mi Ficha` con esos `view_code` nuevos.

### Validación ejecutada
- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/agency/layout.tsx src/app/'(dashboard)'/agency/spaces/page.tsx src/app/'(dashboard)'/agency/economics/page.tsx src/app/'(dashboard)'/agency/team/page.tsx src/app/'(dashboard)'/agency/delivery/page.tsx src/app/'(dashboard)'/agency/campaigns/page.tsx src/app/'(dashboard)'/agency/operations/page.tsx src/app/'(dashboard)'/hr/departments/page.tsx src/app/'(dashboard)'/hr/attendance/page.tsx src/app/'(dashboard)'/my/layout.tsx src/app/'(dashboard)'/my/page.tsx src/app/'(dashboard)'/my/assignments/page.tsx src/app/'(dashboard)'/my/delivery/page.tsx src/app/'(dashboard)'/my/performance/page.tsx src/app/'(dashboard)'/my/leave/page.tsx src/app/'(dashboard)'/my/organization/page.tsx src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato
- El mayor remanente ya queda en rutas secundarias que no están directamente en menú o que representan tabs/flows internos más finos.
- El siguiente paso útil puede ser:
  - expandir catálogo a superficies secundarias restantes, o
  - empezar overrides por usuario y auditoría visible apoyados en el catálogo ya bastante más completo.

## Sesión 2026-03-30 — TASK-136 alinea portal cliente y access points secundarios

### Completado
- `src/lib/admin/view-access-catalog.ts` sumó:
  - `gestion.capacidad`
  - `cliente.equipo`
  - `cliente.analytics`
  - `cliente.revisiones`
  - `cliente.actualizaciones`
- Se alinearon guards en:
  - `src/app/(dashboard)/agency/capacity/page.tsx`
  - `src/app/(dashboard)/hr/page.tsx`
  - `src/app/(dashboard)/equipo/page.tsx`
  - `src/app/(dashboard)/analytics/page.tsx`
  - `src/app/(dashboard)/reviews/page.tsx`
  - `src/app/(dashboard)/updates/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` ahora filtra también la navegación primaria cliente con `authorizedViews`.

### Validación ejecutada
- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/agency/capacity/page.tsx src/app/'(dashboard)'/hr/page.tsx src/app/'(dashboard)'/equipo/page.tsx src/app/'(dashboard)'/analytics/page.tsx src/app/'(dashboard)'/reviews/page.tsx src/app/'(dashboard)'/updates/page.tsx src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato
- El remanente más claro ahora está en superficies terciarias, redirects/tabs internas y algunas páginas genéricas no modeladas como vistas gobernables.
- Ya empieza a tener sentido abrir el siguiente gran bloque: overrides por usuario y auditoría visible, o bien hacer una última pasada de catálogo fino en rutas profundas.

## Sesión 2026-03-30 — TASK-136 activa overrides por usuario

### Completado
- Nuevo endpoint:
  - `src/app/api/admin/views/overrides/route.ts`
- `src/lib/admin/view-access-store.ts` ahora:
  - lee overrides activos desde `greenhouse_core.user_view_overrides`
  - guarda overrides por usuario
  - aplica `grant/revoke` al resolver final de `authorizedViews`
- `src/lib/tenant/access.ts` ya pasa `userId` al resolver para que la sesión reciba la lectura efectiva final.
- `src/lib/admin/get-admin-view-access-governance.ts` y `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx` ya exponen y usan `userOverrides`.
- El tab `Preview` de `/admin/views` ahora permite:
  - alternar cada vista entre `inherit`, `grant` y `revoke`
  - guardar overrides permanentes con razón
  - ver el resultado efectivo en la sidebar simulada y el detalle de vistas

### Validación ejecutada
- `pnpm exec eslint src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/lib/tenant/access.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/app/api/admin/views/overrides/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato
- Este slice inicial ya hace el trabajo útil, pero aún faltan:
  - reasons por vista más finas
  - evento/notificación al usuario afectado cuando cambie su acceso

## Sesión 2026-03-30 — TASK-136 suma expiración opcional y auditoría visible

### Completado
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx` ahora soporta:
  - expiración opcional por batch de overrides del usuario seleccionado
  - feed de auditoría reciente por usuario en el tab `Preview`
- `src/lib/admin/get-admin-view-access-governance.ts` y `src/lib/admin/view-access-store.ts` ahora exponen `auditLog` desde `greenhouse_core.view_access_log`.
- Para sostener el repo verde durante el cierre se corrigió un drift de tipos en:
  - `src/app/api/finance/income/reconcile-payments/route.ts`
  - el handler usaba `newAmountPaid`, pero el contrato actual del ledger expone `amountPaid`

### Validación ejecutada
- `pnpm exec eslint src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/app/api/finance/income/reconcile-payments/route.ts`
- `pnpm build`

### Pendiente inmediato
- El remanente más valioso de `TASK-136` ya es:
  - reasons por vista más finas
  - expiración individual por override, no solo por batch
  - notificación/evento al usuario afectado

## Sesión 2026-03-30 — hardening Sentry incident reader

### Completado
- Se aisló el incidente visible en `staging` desde `/admin/ops-health`: el bloque `Incidentes Sentry` degradaba con `HTTP 403 {"detail":"You do not have permission to perform this action."}`.
- La causa raíz es de permisos/token, no de UI:
  - el runtime estaba usando `SENTRY_AUTH_TOKEN` para leer issues de Sentry
  - ese token puede servir para build/source maps y aun así no tener permisos de lectura de incidentes
- `src/lib/cloud/observability.ts` ahora:
  - resuelve `SENTRY_INCIDENTS_AUTH_TOKEN` / `SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF` como credencial preferida
  - mantiene fallback a `SENTRY_AUTH_TOKEN` solo como compatibilidad transicional
  - cuando Sentry responde `401/403`, proyecta un warning accionable en vez de un fallo genérico

### Archivos tocados
- `src/lib/cloud/observability.ts`
- `src/lib/cloud/observability.test.ts`
- `.env.example`
- `project_context.md`
- `docs/tasks/complete/TASK-133-ops-health-sentry-incident-surfacing.md`
- `changelog.md`

### Pendiente inmediato
- Correr validación local (`vitest`, `eslint`, `tsc`, `build`).
- Sembrar en `staging` un `SENTRY_INCIDENTS_AUTH_TOKEN` con permisos reales de lectura de incidentes si se quiere recuperar el bloque con data real.

## Sesión 2026-03-29 — Notifications endurecida a person-first

### Completado
- Se confirmó y corrigió el drift de identidad del sistema de notificaciones:
  - antes coexistían rutas `member-first`, `client_user-first` y `userId-first`
  - ahora el resolver compartido nace desde `identity_profile` / `member`
- Nuevo helper canónico:
  - `src/lib/notifications/person-recipient-resolver.ts`
- `NotificationService.dispatch()` ahora resuelve recipients a través de ese helper antes de elegir canales.
- `notification-recipients.ts` (webhook bus) ya quedó alineado al mismo contrato.
- `notification-dispatch.ts` ya dedupea por recipient key efectiva, no solo `userId`.
- `TASK-117` quedó revalidada con notificaciones reales para Julio y Humberly.
- Se creó `TASK-134` para el follow-on transversal de governance del modelo Notifications.

### Validación ejecutada
- `pnpm exec vitest run src/lib/notifications/person-recipient-resolver.test.ts src/lib/notifications/notification-service.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/webhooks/consumers/notification-dispatch.test.ts src/lib/webhooks/consumers/notification-mapping.test.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint ...` sobre notifications + webhook consumers + reactive projection
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato
- El inbox y las preferencias siguen `userId`-scoped por diseño; no reabrir eso sin un corte de schema/policy explícito.
- Si se sigue esta línea, el siguiente slice natural es `TASK-134`.

## Sesión 2026-03-29 — TASK-117 cerrada con auto-cálculo mensual de payroll

### Completado
- `TASK-117` pasó a `complete`.
- Payroll ya formaliza el hito mensual de cálculo con:
  - `getLastBusinessDayOfMonth()` / `isLastBusinessDayOfMonth()`
  - `getPayrollCalculationDeadlineStatus()`
  - `calculation readiness` separado de `approval readiness`
  - `runPayrollAutoCalculation()` + `GET /api/cron/payroll-auto-calculate`
  - auto-creación del período mensual cuando falta
  - consumer reactivo `payroll_period.calculated` con categoría `payroll_ops`
- `PayrollPeriodTab` ahora muestra deadline, estado operativo y cumplimiento del cálculo.
- `approve/route` consume la rama `approval` del readiness en vez del readiness legacy mezclado.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/calendar/operational-calendar.test.ts src/lib/payroll/current-payroll-period.test.ts src/lib/payroll/payroll-readiness.test.ts src/lib/payroll/auto-calculate-payroll.test.ts src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx`
  - `pnpm exec eslint ...` sobre calendario, payroll, cron y UI
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato
- No queda blocker abierto dentro del alcance de `TASK-117`; los follow-ons que resten son de policy/UX futura o de adopción operativa en ambientes.

## Sesión 2026-03-29 — TASK-133 cerrada con surfacing fail-soft de incidentes Sentry

### Completado
- `TASK-133` pasó a `complete`.
- `src/lib/cloud/observability.ts` ahora separa:
  - `getCloudObservabilityPosture()`
  - `getCloudSentryIncidents()`
- `getOperationsOverview()` ya proyecta:
  - `cloud.observability.posture`
  - `cloud.observability.incidents`
- `GET /api/internal/health` ya expone también `sentryIncidents`.
- UI conectada:
  - `AdminOpsHealthView` muestra incidentes Sentry con status, summary, release, environment, ocurrencia y deep-link
  - `AdminCloudIntegrationsView` resume el estado de incidentes y deriva a `Ops Health`
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/webhooks/target-url.test.ts`
  - `pnpm exec eslint ...` sobre cloud/ops/admin views
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato
- No queda blocker de repo para el surfacing; la validación runtime adicional en ambiente queda como smoke operativo, no como gap de implementación.

## Sesión 2026-03-29 — TASK-133 iniciada con surfacing fail-soft de incidentes Sentry

### Completado
- `TASK-133` pasó a `in-progress`.
- `src/lib/cloud/observability.ts` ahora separa:
  - `getCloudObservabilityPosture()`
  - `getCloudSentryIncidents()`
- Nuevo contrato canónico en `src/lib/cloud/contracts.ts`:
  - `CloudSentryIncident`
  - `CloudSentryIncidentsSnapshot`
- `getOperationsOverview()` ya proyecta:
  - `cloud.observability.posture`
  - `cloud.observability.incidents`
- `GET /api/internal/health` ya expone también `sentryIncidents` sin mezclar incidentes con el health runtime base.
- UI conectada:
  - `AdminOpsHealthView` muestra incidentes Sentry con status, summary, release, environment, ocurrencia y deep-link
  - `AdminCloudIntegrationsView` resume el estado de incidentes y deriva a `Ops Health`
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/webhooks/target-url.test.ts`
  - `pnpm exec eslint src/lib/cloud/contracts.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/operations/get-operations-overview.ts src/app/api/internal/health/route.ts src/views/greenhouse/admin/AdminOpsHealthView.tsx src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx src/lib/webhooks/target-url.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
- Drift incidental corregido:
  - `src/lib/webhooks/target-url.test.ts` ahora pasa `NODE_ENV: 'test'` para respetar el contrato tipado actual de `ProcessEnv`

### Pendiente inmediato
- Superado por el cierre posterior de `TASK-133` en esta misma fecha.

## Sesión 2026-03-29 — TASK-129 promovida a production y validada end-to-end

### Completado
- `develop` fue promovida a `main` vía PR `#22`:
  - merge commit `95a03a7266c60b07e0eeb93977137b5ffaff0cff`
- `production` absorbió el deployment:
  - `https://greenhouse-efjxg8r0x-efeonce-7670142f.vercel.app`
  - alias productivo activo: `https://greenhouse.efeoncepro.com`
- Validación real en `production`:
  - `POST /api/internal/webhooks/notification-dispatch` respondió `200`
  - payload result:
    - `mapped=true`
    - `recipientsResolved=1`
    - `sent=1`
  - `greenhouse_notifications.notifications` persistió la fila:
    - `eventId=evt-prod-final-1774830739019`
    - `user_id=user-efeonce-admin-julio-reyes`
    - `category=assignment_change`
    - `status=unread`
- Conclusión:
  - `TASK-129` ya no queda solo validada en `staging`; el carril webhook notifications quedó operativo también en `production`

### Pendiente inmediato
- El draft PR `#21` (`release/task-129-prod-promo`) ya quedó redundante después de promover `develop -> main`; puede cerrarse por higiene cuando convenga.
- El check `Preview` del PR individual falló por drift de env/build (`NEXTAUTH_SECRET` durante page-data collection), pero no bloqueó el rollout real porque la promoción completa de `develop` a `main` sí quedó validada en `production`.

## Sesión 2026-03-29 — Rollout de production intentado para TASK-129, bloqueado por drift de branch

### Completado
- `production` ya tiene `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`.
- Se confirmó que `production` no conserva `WEBHOOK_NOTIFICATIONS_SECRET` crudo; el fallback legacy ya no está presente en Vercel para este carril.
- Se ejecutó redeploy seguro de la build productiva existente:
  - source deployment previo: `https://greenhouse-pcty6593d-efeonce-7670142f.vercel.app`
  - nuevo deployment: `https://greenhouse-j35lx1ock-efeonce-7670142f.vercel.app`
  - target: `production`

### Bloqueo real
- El smoke firmado contra `production` no llegó al consumer `notification-dispatch`; devolvió HTML del portal en vez de JSON del route handler.
- La causa observada en el build productivo es branch drift:
  - el deployment de `main` (`commit: fbe21a3`) no incluye `/api/internal/webhooks/notification-dispatch` en el artefacto compilado
  - sí incluye `/api/internal/webhooks/canary`, pero no el consumer de `TASK-129`
- Conclusión operativa:
  - `production` ya está lista a nivel de secretos
  - el rollout funcional de `TASK-129` en `production` queda bloqueado hasta que el código del consumer llegue a `main`

### Pendiente inmediato
- Promover a `main` el slice real de `TASK-129` antes de repetir validación productiva.
- Una vez `main` incluya la route, repetir:
  - redeploy/redeploy seguro de `production`
  - smoke firmado
  - verificación de persistencia en `greenhouse_notifications.notifications`

## Sesión 2026-03-29 — TASK-129 hardening final en staging con Secret Manager-only

### Completado
- `staging` ya no conserva `WEBHOOK_NOTIFICATIONS_SECRET` crudo en Vercel.
- Se forzó redeploy del entorno `Staging` después del retiro del env legacy.
- Validación real posterior al redeploy:
  - `POST /api/internal/webhooks/notification-dispatch` respondió `200`
  - `assignment.created` volvió a crear notificación visible para `user-efeonce-admin-julio-reyes`
  - la resolución efectiva quedó servida por `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF -> webhook-notifications-secret`
- Hardening adicional en repo:
  - `src/lib/secrets/secret-manager.ts` ahora sanitiza también secuencias literales `\\n` / `\\r` en `*_SECRET_REF`
  - esto evita depender de formatos tolerados al importar/pullar env vars desde Vercel

### Pendiente inmediato
- El mismo retiro del env legacy puede replicarse en cualquier otro ambiente que todavía conserve fallback crudo.
- Siguiente lane sugerida sin blocker técnico de `TASK-129`:
  - `TASK-133` para surfacing de incidentes Sentry en `Ops Health`

## Sesión 2026-03-29 — TASK-129 iniciada sobre webhook bus con convivencia explícita

### Completado
- `TASK-129` deja `to-do` y pasa a `in-progress`.
- Estrategia elegida para evitar duplicados y mantener la arquitectura vigente:
  - `src/lib/sync/projections/notifications.ts` se mantiene para eventos legacy internos
  - el nuevo consumer webhook toma solo eventos UX-facing con payload estable
- Ownership inicial por `eventType`:
  - `reactive`: `service.created`, `identity.reconciliation.approved`, `finance.dte.discrepancy_found`, `identity.profile.linked`
  - `webhook notifications`: `assignment.created`, `assignment.updated`, `assignment.removed`, `compensation_version.created`, `member.created`, `payroll_period.exported`
- Contrato nuevo en implementación:
  - `POST /api/internal/webhooks/notification-dispatch`
  - `POST /api/admin/ops/webhooks/seed-notifications`
  - `WEBHOOK_NOTIFICATIONS_SECRET`
  - `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`
  - `WEBHOOK_NOTIFICATIONS_VERCEL_PROTECTION_BYPASS_SECRET`

### Criterio operativo
- No eliminar el dominio reactivo `notifications`.
- No tocar `payroll_export_ready_notification`; el correo operativo downstream sigue fuera del alcance de `TASK-129`.
- El consumer nuevo debe apoyar su dedupe en metadata JSONB de `greenhouse_notifications.notifications`, evitando migración schema-first salvo que resulte impracticable.

## Sesión 2026-03-29 — TASK-129 endurecida y env rollout listo en Vercel

### Completado
- El consumer webhook de notificaciones quedó endurecido:
  - `POST /api/internal/webhooks/notification-dispatch` ahora exige firma HMAC cuando `WEBHOOK_NOTIFICATIONS_SECRET` resuelve a un secreto real
  - el dedupe ya no mira solo `greenhouse_notifications.notifications`; también usa `notification_log` para cubrir casos `email-only`
- `staging` y `production` ya tienen cargada en Vercel la ref:
  - `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`
- `staging` conserva además `WEBHOOK_NOTIFICATIONS_SECRET` como fallback transicional, lo que deja la migración fail-soft mientras se confirma GCP.
- El secret `webhook-notifications-secret` ya fue creado/verificado en GCP Secret Manager y el consumer smoke firmado responde `200` en `staging`.
- El subscriber `wh-sub-notifications` quedó corregido en DB para usar el alias estable:
  - `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notification-dispatch?...`
- Se alineó el dataset de `staging` para recipients internos:
  - `greenhouse_core.client_users.member_id` quedó enlazado por match exacto de nombre para usuarios internos activos
- Se corrigió también el drift operativo de los seed routes:
  - ahora prefieren el host real del request sobre `VERCEL_URL`
  - sanitizan `\n`/`\r` literales en bypass secrets para no persistir `%5Cn` en `target_url`
- Se creó `TASK-133` para surfacing de incidentes Sentry en `Ops Health`.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/webhooks/consumers/notification-mapping.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/webhooks/consumers/notification-dispatch.test.ts src/app/api/internal/webhooks/notification-dispatch/route.test.ts src/lib/webhooks/notification-target.test.ts src/lib/notifications/notification-service.test.ts`
  - `pnpm exec eslint src/views/greenhouse/admin/AdminNotificationsView.tsx src/lib/notifications/schema.ts src/lib/notifications/notification-service.ts src/lib/webhooks/consumers/notification-dispatch.ts src/app/api/internal/webhooks/notification-dispatch/route.ts src/app/api/internal/webhooks/notification-dispatch/route.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
  - `pnpm exec vitest run src/lib/webhooks/notification-target.test.ts src/lib/webhooks/canary-target.test.ts src/lib/webhooks/target-url.test.ts src/app/api/internal/webhooks/notification-dispatch/route.test.ts`
  - `pnpm exec eslint src/lib/webhooks/target-url.ts src/lib/webhooks/target-url.test.ts src/lib/webhooks/notification-target.ts src/lib/webhooks/canary-target.ts src/app/api/admin/ops/webhooks/seed-notifications/route.ts src/app/api/admin/ops/webhooks/seed-canary/route.ts`
  - `pnpm pg:doctor --profile=runtime` usando `.env.staging.pull`
  - smoke firmado contra `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notification-dispatch`
  - evidencia funcional:
    - `assignment.created` visible en campanita para `user-efeonce-admin-julio-reyes`
    - `payroll_period.exported` creó 4 notificaciones `payroll_ready` para recipients resolubles del período `2026-03`

### Pendiente inmediato
- `TASK-129` ya queda lista para cierre documental.
- Siguiente follow-on razonable:
  - retirar el fallback crudo `WEBHOOK_NOTIFICATIONS_SECRET` de `staging` cuando se confirme que Secret Manager queda como única fuente
  - decidir si el enlace `client_users.member_id` interno observado en `staging` debe formalizarse como backfill/lane de identidad separada

## Sesión 2026-03-29 — TASK-131 cerrada: health separa runtime vs tooling posture

### Completado
- `TASK-131` ya no está solo documentada; quedó implementada en la capa `cloud/*`.
- Corrección aplicada:
  - `src/lib/cloud/secrets.ts` clasifica secretos tracked entre `runtime` y `tooling`
  - `src/lib/cloud/health.ts` evalúa `postureChecks.secrets` solo con la porción runtime-crítica
  - `postgresAccessProfiles` mantiene la visibilidad separada de `runtime`, `migrator` y `admin`
- Esto corrige el warning residual observado en `production`:
  - `overallStatus=degraded`
  - runtime `postgres/bigquery/observability` sanos
  - gap real concentrado en perfiles Postgres `migrator/admin` no cargados en el runtime del portal
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/health.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/postgres.test.ts`
  - `pnpm exec eslint src/lib/cloud/contracts.ts src/lib/cloud/health.ts src/lib/cloud/secrets.ts src/lib/cloud/postgres.ts src/lib/cloud/health.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/postgres.test.ts src/app/api/internal/health/route.ts`
  - `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato
- Validar el nuevo contrato en `staging` y `production` después del siguiente deploy de `develop/main`.
- No cargar `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` ni `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` en el runtime productivo como workaround del health.

## Sesión 2026-03-29 — TASK-125 cerrada con validación E2E real en staging

### Completado
- `TASK-125` ya quedó validada end-to-end en `staging`.
- Se confirmó que el proyecto ya tenía `Protection Bypass for Automation` activo en Vercel.
- `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET` quedó cargado en `staging`.
- La canary subscription `wh-sub-canary` quedó apuntando al deployment protegido con `x-vercel-protection-bypass`.
- Validación real:
  - `eventsMatched=1`
  - `deliveriesAttempted=1`
  - `succeeded=1`
  - `HTTP 200` en el canary
  - `webhook_delivery_id=wh-del-b9dc275a-f5b5-4104-adcd-d9519fa3794c`
- Ajustes de baseline dejados en repo:
  - `seed-canary` usa `finance.income.nubox_synced` como familia activa observada en `staging`
  - el dispatcher ya prioriza eventos `published` más recientes para no hambrear subscriptions nuevas

## Sesión 2026-03-29 — TASK-125 canary soporta bypass opcional de Vercel

### Completado
- `POST /api/admin/ops/webhooks/seed-canary` ya puede registrar el target del canary con bypass opcional de `Deployment Protection`.
- Contrato soportado:
  - `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET`
  - fallback a `VERCEL_AUTOMATION_BYPASS_SECRET`

## Sesión 2026-03-29 — TASK-125 casi cerrada, bloqueada por Vercel Deployment Protection

### Completado
- `WEBHOOK_CANARY_SECRET_SECRET_REF` quedó cargado en Vercel `staging`.
- El schema de webhooks quedó provisionado en la base usada por `develop/staging`; antes solo existía `outbox_events`.
- Se activó `wh-sub-canary` en DB y se validó el dispatcher con tráfico real:
  - `eventsMatched=3`
  - `deliveriesAttempted=3`
  - attempts registrados en `greenhouse_sync.webhook_delivery_attempts`
- Se verificó también que la base usada por `production/main` ya ve las tablas de webhooks provisionadas.

### Bloqueo real
- El self-loop a `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/canary` no falla por firma ni por schema.
- Falla por `Vercel Deployment Protection`: los attempts reciben `401 Authentication Required` antes de llegar al route handler.
- El remanente real de `TASK-125` ya no es repo ni Postgres; es definir el mecanismo de bypass/target para que el canary pueda atravesar la protección de Vercel en entornos compartidos.

## Sesión 2026-03-29 — TASK-125 canary alineada a Secret Manager

### Completado
- `src/lib/webhooks/signing.ts` ya no resuelve secretos solo por env plano; ahora usa el helper canónico de Secret Manager.
- Impacto práctico:
  - inbound webhooks
  - outbound deliveries
  - `POST /api/internal/webhooks/canary`
  ya soportan `*_SECRET_REF` además del env legacy.
- `TASK-125` ya no requiere exponer `WEBHOOK_CANARY_SECRET` crudo en Vercel si el secreto ya existe en Secret Manager.

## Sesión 2026-03-29 — TASK-127 creada como follow-on de consolidación Cloud

### Completado
- Se creó `TASK-127` para capturar la siguiente necesidad institucional del dominio Cloud:
  - scorecard semáforo por dominio
  - cleanup de drift documental residual
  - plan corto de “next hardening wave”
- La task no reabre lanes ya cerradas; sirve para consolidar la lectura post-baseline después de `TASK-096`, `TASK-098`, `TASK-099`, `TASK-102`, `TASK-103`, `TASK-124` y `TASK-126`.

## Sesión 2026-03-29 — TASK-102 cerrada

### Completado
- Se completó el restore test end-to-end con el clone efímero `greenhouse-pg-restore-test-20260329d`.
- Verificación SQL real sobre el clone:
  - `payroll_entries=6`
  - `identity_profiles=40`
  - `outbox_events=1188`
  - schemata presentes: `greenhouse_core`, `greenhouse_payroll`, `greenhouse_sync`
- El clone fue eliminado después de validar datos y `gcloud sql instances list` volvió a mostrar solo `greenhouse-pg-dev`.
- `TASK-102` ya no queda abierta:
  - PITR y WAL retention verificados
  - slow query logging con evidencia real en Cloud Logging
  - runtime health confirmado en `staging` y `production`
  - restore verification ya documentada de punta a punta

## Sesión 2026-03-29 — TASK-102 validación externa casi cerrada

### Completado
- Se confirmó postura real de `greenhouse-pg-dev` en GCP:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
  - `sslMode=ENCRYPTED_ONLY`
- `pnpm pg:doctor --profile=runtime` y `pnpm pg:doctor --profile=migrator` pasaron por connector contra `greenhouse-pg-dev`.
- Slow query logging ya quedó verificada con evidencia real en Cloud Logging:
  - `duration: 1203.206 ms`
  - `statement: SELECT pg_sleep(1.2)`
- `staging` y `production` también quedaron revalidadas por `vercel curl /api/internal/health`:
  - `postgres.status=ok`
  - `usesConnector=true`
  - `sslEnabled=true`
  - `maxConnections=15`

### Pendiente inmediato
- En ese momento, el único remanente real de `TASK-102` era el restore test end-to-end.
- Dos clones efímeros fueron creados y limpiados:
  - `greenhouse-pg-restore-test-20260329b`
  - `greenhouse-pg-restore-test-20260329c`
- El primero se eliminó antes de completar la verificación SQL y el segundo quedó demasiado tiempo en `PENDING_CREATE`; ese remanente ya quedó resuelto después con el clone `greenhouse-pg-restore-test-20260329d`.

## Sesión 2026-03-29 — TASK-099 cerrada con `CSP-Report-Only`

### Completado
- `TASK-099` queda cerrada para su baseline segura y reversible.
- `src/proxy.ts` ahora agrega también `Content-Security-Policy-Report-Only` con allowlist amplia para no romper:
  - login `Azure AD` / `Google`
  - MUI / Emotion
  - observabilidad (`Sentry`)
  - assets y uploads
- Validación local ejecutada:
  - `pnpm exec vitest run src/proxy.test.ts`
  - `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Decisión explícita
- La task no intenta endurecer a `Content-Security-Policy` enforce.
- Cualquier tightening posterior (`Report-Only` tuning, nonces, eliminación de `unsafe-*`) queda como mejora futura y ya no bloquea el hardening baseline.
- Esa mejora futura ya quedó registrada como `TASK-126`.

## Sesión 2026-03-29 — TASK-099 re-acotada al baseline real

### Completado
- Se revisó `TASK-099` contra el estado real de `src/proxy.ts` y `src/proxy.test.ts`.
- Hallazgo consolidado:
  - el repo ya tiene validado el baseline de headers estáticos
  - la task seguía abierta con criterios mezclados de un lote futuro de `Content-Security-Policy`
- Se re-acotó la task para reflejar correctamente el slice actual:
  - `Status real` pasa a `Slice 1 validado`
  - `CSP` queda explícitamente como follow-on pendiente
  - el baseline ya no exige en falso login/uploads/dashboard bajo `CSP`

### Pendiente inmediato
- Decidir si `CSP` se implementa todavía dentro de `TASK-099` como `Report-Only` o si conviene derivarla a una task nueva para no inflar esta lane.

## Sesión 2026-03-29 — TASK-096 cerrada

### Completado
- `TASK-096` deja de seguir `in-progress` y pasa a `complete`.
- Razón de cierre:
  - baseline WIF-aware ya validada en `preview`, `staging` y `production`
  - hardening externo de Cloud SQL ya aplicado
  - la Fase 3 de Secret Manager ya quedó absorbida y cerrada por `TASK-124`
- La task queda como referencia histórica del track cloud, no como lane activa.

## Sesión 2026-03-29 — TASK-098 cerrada en `production`

### Completado
- `production` recibió el merge `main <- develop` en `bcbd0c3`.
- Se cargaron las variables externas de observabilidad en `production`:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Hubo que reescribir `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF` en `production` y redeployar para corregir drift de la ref.
- Deployment validado:
  - `dpl_5fyHqra7AgV865QmHSuZ2iqYWcYk`
  - `GET /api/internal/health` con `postureChecks.observability.status=ok`
  - `GET /api/auth/session` con respuesta `{}`
- `TASK-098` ya puede moverse a `complete`.

### Pendiente no bloqueante
- Rotar el webhook de Slack expuesto en una captura previa.

## Sesión 2026-03-29 — TASK-098 validación end-to-end en `staging`

### Completado
- Se confirmó que `staging` ya no tiene solo postura configurada, sino observabilidad operativa real:
  - `vercel curl /api/internal/health --deployment dpl_G5L2467CPUF6T2GxEaoB3tWhB41K`
  - `observability.summary=Sentry runtime + source maps listos · Slack alerts configuradas`
  - `postureChecks.observability.status=ok`
- Smoke real de Slack:
  - envío con el webhook resuelto desde `greenhouse-slack-alerts-webhook`
  - respuesta `HTTP 200`
- Smoke real de Sentry:
  - se emitió `task-098-staging-sentry-smoke-1774792462445`
  - el issue quedó visible en el dashboard del proyecto `javascript-nextjs`
- Hallazgo importante:
  - el único remanente operativo de `TASK-098` ya no está en `develop/staging`
  - queda concentrado en `main/production`

### Pendiente inmediato
- Replicar en `production`:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Validar `main/production` con smoke equivalente antes de mover `TASK-098` a `complete`
- Rotar el webhook de Slack expuesto en una captura previa cuando se decida hacerlo

## Sesión 2026-03-29 — TASK-098 Secret Manager slice para Slack alerts

### Completado
- Se abrió `feature/codex-task-098-observability-secret-refs` desde `develop`.
- `SLACK_ALERTS_WEBHOOK_URL` quedó alineado al helper canónico:
  - valor legacy `SLACK_ALERTS_WEBHOOK_URL`
  - ref opcional `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
  - resolución efectiva `Secret Manager -> env fallback`
- `GET /api/internal/health` ahora refleja esta resolución real tanto en `observability` como en `secrets`.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/alerts/slack-notify.test.ts src/lib/cloud/observability.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec eslint src/lib/alerts/slack-notify.ts src/lib/alerts/slack-notify.test.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/cloud/secrets.ts src/lib/cloud/secrets.test.ts src/app/api/internal/health/route.ts`
  - `pnpm exec tsc --noEmit --pretty false`

### Decisión explícita
- `CRON_SECRET` sigue `env-only`:
  - moverlo a Secret Manager haría asíncrono `requireCronAuth()` y abriría un cambio transversal en múltiples routes
- `SENTRY_AUTH_TOKEN` sigue `env-only`:
  - hoy se consume en `next.config.ts` durante build
- `SENTRY_DSN` también se deja fuera de este slice:
  - el path client (`NEXT_PUBLIC_SENTRY_DSN`) lo vuelve config pública/operativa, no un secreto crítico prioritario

## Sesión 2026-03-29 — TASK-098 validada en `develop/staging`

### Completado
- `develop` absorbió el slice mínimo de Sentry en `ac11287`.
- El deployment compartido `dev-greenhouse.efeoncepro.com` quedó `READY` sobre ese commit.
- Validación autenticada de `GET /api/internal/health`:
  - `version=ac11287`
  - Postgres `ok`
  - BigQuery `ok`
  - `observability.summary=Observabilidad externa no configurada`
- Hallazgo importante:
  - el repo ya tiene el adapter `src/lib/alerts/slack-notify.ts`
  - los hooks de `alertCronFailure()` ya existen en `outbox-publish`, `webhook-dispatch`, `sync-conformed`, `ico-materialize` y `nubox-sync`
  - por lo tanto el cuello de botella actual de `TASK-098` ya no es de código repo, sino de configuración externa en Vercel

### Pendiente inmediato
- Cargar en Vercel las variables externas de observabilidad:
  - `SENTRY_DSN` o `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL`
- Revalidar `GET /api/internal/health` y confirmar que `postureChecks.observability` deje de salir `unconfigured`.

## Sesión 2026-03-29 — TASK-098 retoma Sentry mínimo sobre branch dedicada

### Completado
- Se retomó `TASK-098` desde `feature/codex-task-098-sentry-resume` sobre una base donde `develop` ya absorbió el baseline de `TASK-098` y `TASK-099`.
- Quedó reconstruido y validado el wiring mínimo de Sentry para App Router:
  - `next.config.ts` con `withSentryConfig`
  - `src/instrumentation.ts`
  - `src/instrumentation-client.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
- La postura de observabilidad quedó endurecida para distinguir:
  - DSN runtime total
  - DSN público (`NEXT_PUBLIC_SENTRY_DSN`)
  - auth token
  - org/project
  - readiness de source maps
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec eslint next.config.ts src/instrumentation.ts src/instrumentation-client.ts sentry.server.config.ts sentry.edge.config.ts src/lib/cloud/contracts.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato
- Push de esta branch para obtener Preview Deployment y validar que `/api/internal/health` refleje la postura nueva de Sentry.
- Solo después de esa verificación, decidir si este slice pasa a `develop`.

## Sesión 2026-03-29 — TASK-099 iniciada sobre `develop`

### Completado
- `develop` absorbió el baseline sano de `TASK-098` (`4167650`, `4d485f4`) y el fix de compatibilidad `3463dc8`.
- Se abrió `feature/codex-task-099-security-headers` desde ese `develop` ya integrado.
- `TASK-099` pasa a `in-progress` con un primer slice mínimo:
  - nuevo `src/proxy.ts`
  - headers estáticos cross-cutting
  - matcher conservador para no tocar `_next/*` ni assets
  - `Strict-Transport-Security` solo en `production`

### Pendiente inmediato
- validar lint, tests, `tsc` y `build` del middleware
- decidir si el siguiente slice de `TASK-099` introduce CSP en `Report-Only` o la difiere hasta después de retomar `TASK-098`

## Sesión 2026-03-29 — TASK-098 iniciada con slice seguro de postura

### Completado
- `TASK-098` pasó a `in-progress`.
- Se eligió un primer slice sin integraciones externas para no romper el runtime ya estabilizado:
  - nuevo `src/lib/cloud/observability.ts`
  - `GET /api/internal/health` ahora incluye `observability`
  - el payload proyecta si existen `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` y `SLACK_ALERTS_WEBHOOK_URL`
- El contrato de `GET /api/internal/health` quedó separado en:
  - `runtimeChecks` para dependencias que sí definen `200/503`
  - `postureChecks` para hallazgos operativos que degradan señal pero no cortan tráfico
  - `overallStatus` y `summary` como resumen estable para futuras integraciones
- `GET /api/internal/health` ahora expone también `postgresAccessProfiles`:
  - `runtime`
  - `migrator`
  - `admin`
  manteniendo `postgres` solo para postura runtime del portal
- `.env.example` quedó alineado con esas variables.

### Pendiente inmediato
- Instalar y configurar `@sentry/nextjs`
- decidir si el siguiente slice conecta primero Slack alerts o Sentry
- validar este contrato nuevo en preview antes de cablear integraciones externas

## Sesión 2026-03-29 — TASK-124 validada en `staging`

### Completado
- Se armó una integración mínima desde `origin/develop` para no arrastrar el resto de `feature/codex-task-096-wif-baseline`.
- `develop` quedó promovido a `497cb19` con los tres slices de `TASK-124`:
  - helper canónico `src/lib/secrets/secret-manager.ts`
  - postura de secretos en `GET /api/internal/health`
  - migración de `NUBOX_BEARER_TOKEN`, Postgres secret refs y auth/SSO (`NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`)
- Validación local sobre la base integrada:
  - `pnpm exec eslint ...`
  - `pnpm exec vitest run src/lib/secrets/secret-manager.test.ts src/lib/cloud/secrets.test.ts src/lib/nubox/client.test.ts src/lib/postgres/client.test.ts scripts/lib/load-greenhouse-tool-env.test.ts src/lib/auth-secrets.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm pg:doctor --profile=runtime`
- Rollout externo ya preparado:
  - secretos nuevos creados en GCP Secret Manager para `staging` y `production`
  - `*_SECRET_REF` cargados en Vercel `staging` y `production`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/secretmanager.secretAccessor` sobre los secretos nuevos
- Validación compartida en `staging`:
  - `dev-greenhouse.efeoncepro.com/api/internal/health` respondió `200`
  - `version=497cb19`
  - `GREENHOUSE_POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET` y `NUBOX_BEARER_TOKEN` reportan `source=secret_manager`
- Ajuste externo mínimo posterior:
  - el secreto heredado `greenhouse-pg-dev-app-password` no tenía IAM para el runtime service account
  - se agregó `roles/secretmanager.secretAccessor` para `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  - luego de ese binding, `GREENHOUSE_POSTGRES_PASSWORD` pasó también a `source=secret_manager` en `staging`

### Pendiente inmediato
- `production` sigue pendiente de validación real; no se promovió a `main` en esta sesión.
- El remanente ya no es de código en `staging`, sino de rollout/control:
  - decidir cuándo retirar env vars legacy
  - decidir si `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` deben quedar proyectados en el health runtime del portal

## Sesión 2026-03-29 — TASK-096 WIF-aware baseline en progreso

### Completado
- `TASK-096` pasó a `in-progress` sobre el estado actual del repo.
- El repo ya quedó WIF-aware sin romper el runtime actual:
  - `src/lib/google-credentials.ts` resuelve `wif | service_account_key | ambient_adc`
  - el helper ahora también sabe pedir el token OIDC desde runtime Vercel con `@vercel/oidc`, no solo desde `process.env.VERCEL_OIDC_TOKEN`
  - `src/lib/bigquery.ts`, `src/lib/postgres/client.ts`, `src/lib/storage/greenhouse-media.ts` y `src/lib/ai/google-genai.ts` consumen el helper canónico
  - `src/lib/ai/google-genai.ts` ya no usa temp file para credenciales
- Scripts con parsing manual de `GOOGLE_APPLICATION_CREDENTIALS_JSON` quedaron alineados al helper central:
  - `check-ico-bq`
  - `backfill-ico-to-postgres`
  - `materialize-member-metrics`
  - `backfill-task-assignees`
  - `backfill-postgres-payroll`
  - `admin-team-runtime-smoke`
- Arquitectura y docs vivas alineadas:
  - `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
  - `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `project_context.md`
  - `changelog.md`
- Rollout externo ya avanzado y validado sin bigbang:
  - existe Workload Identity Pool `vercel` y provider `greenhouse-eo` en `efeonce-group`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` ya tiene bindings `roles/iam.workloadIdentityUser` para `development`, `preview`, `staging` y `production`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_SERVICE_ACCOUNT_EMAIL` ya quedaron cargadas en Vercel
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` quedó cargada en Vercel para preparar el cutover hacia Cloud SQL Connector
  - validación local con OIDC + WIF:
    - BigQuery respondió OK sin SA key
    - Cloud SQL Connector respondió `SELECT 1` sin SA key usando `runGreenhousePostgresQuery()`
  - validación real en preview Vercel:
    - se completó el env set mínimo de la branch `feature/codex-task-096-wif-baseline`
    - se forzó redeploy del preview
    - `greenhouse-i3cak6akh-efeonce-7670142f.vercel.app/api/internal/health` respondió `200 OK`
    - posture observada:
      - `auth.mode=wif`
      - BigQuery reachable
      - Cloud SQL reachable con connector e `instanceConnectionName=efeonce-group:us-east4:greenhouse-pg-dev`

### Validación
- `pnpm exec eslint src/lib/google-credentials.ts src/lib/google-credentials.test.ts src/lib/bigquery.ts src/lib/postgres/client.ts src/lib/storage/greenhouse-media.ts src/lib/ai/google-genai.ts scripts/check-ico-bq.ts scripts/backfill-ico-to-postgres.ts scripts/materialize-member-metrics.ts scripts/backfill-task-assignees.ts scripts/backfill-postgres-payroll.ts scripts/admin-team-runtime-smoke.ts`
- `pnpm exec vitest run src/lib/google-credentials.test.ts src/lib/cloud/gcp-auth.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- Smoke adicional externo:
  - BigQuery con `VERCEL_OIDC_TOKEN` y WIF sin SA key
  - Cloud SQL Connector con `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev` y query `SELECT 1::int as ok`

### Pendiente inmediato
- Limpiar drift de Vercel env antes del endurecimiento final:
  - las variables activas del rollout WIF/conector ya fueron corregidas en Vercel
  - el paso pendiente ya no es el formato, sino cerrar el baseline WIF final en `develop/staging`
- Aclarar y corregir el mapa de ambientes Vercel:
  - `dev-greenhouse.efeoncepro.com` ya quedó confirmado como `target=staging`
  - tras redeploy del staging activo respondió `version=7a2ecec`, `auth.mode=mixed` y `usesConnector=true`
- Camino seguro elegido:
  - no desplegar la feature branch al entorno compartido `staging`
  - mantener el flujo `feature -> preview -> develop/staging -> main`
- Validar el entorno compartido con WIF final después de mergear a `develop`, antes de retirar `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Cerrar Fase 1 externa de Cloud SQL:
  - remover `0.0.0.0/0`
  - pasar `sslMode` a `ENCRYPTED_ONLY`
  - activar `requireSsl=true`
- No declarar `TASK-096` cerrada todavía: el repo quedó listo, pero la postura cloud real sigue transicional.

## Sesión 2026-03-29 — TASK-115 Nexa UI Completion (4 slices)

### Completado
- **Slice A**: Edit inline de mensajes user — pencil hover button + EditComposer con ComposerPrimitive (Guardar/Cancelar)
- **Slice B**: Follow-up suggestions (chips clicables desde `suggestions` del backend) + feedback thumbs (👍/👎 fire-and-forget a `/api/home/nexa/feedback`)
- **Slice C**: Nexa floating portal-wide — FAB sparkles fixed bottom-right, panel 400×550 en desktop, Drawer bottom en mobile, hidden en `/home`
- **Slice D**: Thread history sidebar (Drawer izquierdo, lista agrupada por fecha, new/select thread) + threadId tracking en adapter + NexaPanel.tsx eliminado

### Archivos nuevos
- `src/views/greenhouse/home/components/NexaThreadSidebar.tsx`
- `src/components/greenhouse/NexaFloatingButton.tsx`

### Archivos modificados
- `src/views/greenhouse/home/components/NexaThread.tsx` — edit inline, feedback, suggestions, compact mode, history toggle
- `src/views/greenhouse/home/HomeView.tsx` — threadId tracking, suggestions state, sidebar integration
- `src/app/(dashboard)/layout.tsx` — NexaFloatingButton montado

### Archivos eliminados
- `src/views/greenhouse/home/components/NexaPanel.tsx` (legacy)

## Sesión 2026-03-29 — TASK-122 desarrollada y cerrada

### Completado
- `TASK-122` quedó desarrollada y cerrada como base documental del dominio Cloud.
- Se creó `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` como operating model canónico para institucionalizar `Cloud` como capa interna de platform governance.
- Se agregó una baseline real de código en `src/lib/cloud/*`:
  - `contracts.ts` para checks y snapshots
  - `health.ts` para checks compartidos de Postgres y BigQuery
  - `bigquery.ts` para cost guards base (`maximumBytesBilled`)
  - `cron.ts` para postura mínima de control plane sobre `CRON_SECRET`
- El documento deja explícito:
  - boundary entre `Admin Center`, `Cloud & Integrations` y `Ops Health`
  - control families del dominio Cloud
  - qué debe vivir en UI, qué en code/helpers y qué en runbooks/config
  - el framing operativo de `TASK-100`, `TASK-101`, `TASK-102` y `TASK-103`
- `TASK-100` a `TASK-103` quedaron actualizadas para referenciar esta base, evitando redecidir ownership y scope en cada ejecución.
- `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` quedaron alineados con `TASK-122` en `complete`.
- La conexión con la UI ya es total:
  - `getOperationsOverview()` ahora expone `cloud`
  - `Admin Center`, `Cloud & Integrations` y `Ops Health` consumen el snapshot institucional del dominio Cloud
  - la UI deja de reflejar solo integrations/ops aislados y pasa a mostrar runtime health, cron posture y BigQuery guard

### Pendiente inmediato
- La base ya está lista para ejecutar `TASK-100` a `TASK-103` con framing consistente del dominio Cloud

## Sesión 2026-03-29 — TASK-100 CI test step en progreso

### Completado
- `TASK-100` pasó a `in-progress` como primera lane activa del bloque Cloud hardening.
- `.github/workflows/ci.yml` ahora ejecuta `pnpm test` entre `Lint` y `Build`, con `timeout-minutes: 5`.
- La validación local previa confirmó que la suite actual es apta para CI:
  - `99` archivos de test
  - `488` pruebas verdes
  - runtime total `6.18s`

### Pendiente inmediato
- Confirmar la primera corrida real en GitHub Actions en el próximo push.
- Mantener el commit aislado de `TASK-115`, porque el árbol sigue teniendo cambios paralelos en `Home/Nexa` no relacionados con CI.

## Sesión 2026-03-29 — TASK-100 y TASK-101 cerradas

### Completado
- `TASK-100` quedó cerrada:
  - `.github/workflows/ci.yml` ahora ejecuta `pnpm test` entre `Lint` y `Build`
  - el step de tests tiene `timeout-minutes: 5`
- `TASK-101` quedó cerrada:
  - nuevo helper `src/lib/cron/require-cron-auth.ts`
  - `src/lib/cloud/cron.ts` ahora expone estado del secret y detección reusable de Vercel cron
  - migración de `19` rutas scheduler-driven sin auth inline
  - los endpoints `POST` de Finance preservan fallback a `requireFinanceTenantContext()` cuando no vienen como cron autorizado
- Validación de cierre:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

### Pendiente inmediato
- La siguiente lane del bloque solicitado queda en `TASK-102`, con `TASK-103` después.
- El árbol sigue teniendo cambios paralelos de `TASK-115` en Home/Nexa; no mezclar esos archivos al stage del lote Cloud.

## Sesión 2026-03-29 — Cloud layer robustness expansion

### Completado
- La capa `src/lib/cloud/*` quedó reforzada antes de entrar a `TASK-096`:
  - `src/lib/cloud/gcp-auth.ts` modela la postura runtime GCP (`wif`, `service_account_key`, `mixed`, `unconfigured`)
  - `src/lib/cloud/postgres.ts` modela la postura Cloud SQL (`connector`, `ssl`, `pool`, riesgos)
  - `src/app/api/internal/health/route.ts` expone health institucional para deploy/runtime validation
  - `src/lib/alerts/slack-notify.ts` deja listo el adapter base para alertas operativas
- `getOperationsOverview()` ahora proyecta también posture de auth GCP y posture de Cloud SQL.
- Se agregaron hooks de `alertCronFailure()` a los crons críticos:
  - `outbox-publish`
  - `webhook-dispatch`
  - `sync-conformed`
  - `ico-materialize`
  - `nubox-sync`

### Pendiente inmediato
- `TASK-096` ya puede apoyarse en una postura GCP explícita en código en vez de partir solo desde env vars sueltas.
- `TASK-098` ya no necesita inventar desde cero el health endpoint ni el adapter Slack.
- En ese momento `TASK-099`, `TASK-102` y `TASK-103` seguían abiertas, pero hoy solo queda `TASK-103` como remanente del bloque cloud baseline.

## Sesión 2026-03-29 — TASK-102 en progreso

### Completado
- Cloud SQL `greenhouse-pg-dev` quedó con:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
- `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` quedó aplicado y verificado en:
  - `Production`
  - `staging`
  - `Preview (develop)`
- El repo quedó alineado:
  - `src/lib/postgres/client.ts` ahora usa `15` como fallback por defecto
  - `.env.example` documenta `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15`
- Validación ejecutada:
  - `pnpm pg:doctor --profile=runtime`
  - `pnpm pg:doctor --profile=migrator`
  - `gcloud sql instances describe greenhouse-pg-dev`
  - `vercel env pull` por entorno para confirmar el valor efectivo

### Pendiente inmediato
- Terminar el restore test:
  - clone iniciado: `greenhouse-pg-restore-test-20260329`
  - seguía en `PENDING_CREATE` al cierre de esta actualización
- Cuando el clone quede `RUNNABLE`:
  - verificar tablas críticas
  - documentar resultado
- Este remanente ya quedó resuelto después con el clone `greenhouse-pg-restore-test-20260329d`.
  - eliminar la instancia efímera

## Sesión 2026-03-29 — TASK-114 backend Nexa + cierre TASK-119/TASK-120

### Completado
- `TASK-114` quedó implementada y cerrada:
  - nuevo store server-only `src/lib/nexa/store.ts`
  - validación de readiness para `greenhouse_ai.nexa_threads`, `greenhouse_ai.nexa_messages`, `greenhouse_ai.nexa_feedback`
  - migración canónica `scripts/migrations/add-nexa-ai-tables.sql` ya aplicada con perfil `migrator`
  - endpoints:
    - `POST /api/home/nexa/feedback`
    - `GET /api/home/nexa/threads`
    - `GET /api/home/nexa/threads/[threadId]`
  - `/api/home/nexa` ahora persiste conversación, retorna `threadId` y genera `suggestions` dinámicas
- `TASK-119` cerrada:
  - verificación manual confirmada para `login -> /auth/landing -> /home`
  - fallback interno y sesiones legadas ya normalizan a `/home`
  - `Control Tower` deja de operar como home y el pattern final queda absorbido por `Admin Center`
- `TASK-120` cerrada por absorción:
  - `/internal/dashboard` redirige a `/admin`
  - el follow-on separado ya no era necesario como lane autónoma
- `TASK-115` quedó actualizada con delta para reflejar que su backend ya está disponible
- `GREENHOUSE_DATA_MODEL_MASTER_V1.md` ya reconoce `nexa_threads`, `nexa_messages` y `nexa_feedback` dentro de `greenhouse_ai`

### Validación
- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `pnpm exec tsx scripts/run-migration.ts scripts/migrations/add-nexa-ai-tables.sql --profile=migrator`
- `pnpm exec eslint src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/lib/nexa/nexa-service.test.ts src/lib/nexa/store.ts src/app/api/home/nexa/route.ts src/app/api/home/nexa/feedback/route.ts src/app/api/home/nexa/threads/route.ts src/app/api/home/nexa/threads/[threadId]/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/nexa/nexa-service.test.ts`
- verificación runtime directa de `greenhouse_ai.nexa_threads`, `greenhouse_ai.nexa_messages` y `greenhouse_ai.nexa_feedback` bajo perfil `runtime`

### TASK-121 Admin Center Hardening (5 slices cerrados)
- **Slice 1**: Sorting por todas las columnas en AdminCenterSpacesTable (TableSortLabel)
- **Slice 2**: `loading.tsx` skeleton para `/admin` (hero, KPIs, tabla 8 filas, domain cards)
- **Slice 3**: Health real en domain cards — Cloud & Integrations y Ops Health consumen `getOperationsOverview`
- **Slice 4**: Deep-link con `searchParams` — `/admin?filter=attention&q=empresa` funciona
- **Slice 5**: Bloque "Requiere atencion" con alertas consolidadas cross-dominio

### Pendiente inmediato
- `TASK-115` pasa a ser la siguiente lane natural de Nexa UI porque ya tiene backend real para feedback, suggestions y thread history
- Si se quiere endurecer `TASK-114` más adelante:
  - agregar tests específicos para `src/lib/nexa/store.ts`
  - decidir si el route principal de Nexa debe responder `404/400` en `threadId` inválido en vez de caer al handler genérico
  - agregar smoke o tests de route para ownership y feedback

## Sesión 2026-03-29 — Admin Center + Control Tower unificado

### Completado
- **Admin Center landing redesign v2**: Control Tower absorbido como sección dentro de `/admin`
  - Hero (gradiente purple→cyan) → 4 ExecutiveMiniStatCards → Torre de control (tabla MUI limpia 5 cols, sin scroll horizontal) → Mapa de dominios (outlined cards ricos con avatar, bullets, CTA)
  - Nuevo componente `AdminCenterSpacesTable.tsx`: MUI Table size='small', 5 columnas (Space, Estado, Usuarios, Proyectos, Actividad), paginación 8 filas, filter chips + search + export
  - `/internal/dashboard` redirige a `/admin` (backward compat)
  - Sidebar: removido item "Torre de control" de Gestión; UserDropdown apunta a `/admin`
- `TASK-119` movida a `in-progress`.
- Se aplicó el cutover base de landing para internos/admin:
  - fallback de `portalHomePath` ahora cae en `/home` en vez de `/internal/dashboard`
  - `Home` pasa a ser la entrada principal interna en sidebar y dropdown
  - `Control Tower` queda preservado como surface especialista dentro de `Gestión` y en sugerencias globales
- Se corrigió el drift que seguía mandando a algunos usuarios a `'/internal/dashboard'`:
  - `resolvePortalHomePath()` ahora normaliza también el valor legado en `NextAuth jwt/session`
  - si la sesión trae `'/internal/dashboard'` como home histórico para un interno/admin, el runtime lo reescribe a `'/home'` sin depender de un relogin manual
- Se mantuvieron intactos los landings especializados:
  - `hr_*` sigue cayendo en `/hr/payroll`
  - `finance_*` sigue cayendo en `/finance`
  - `collaborator` puro sigue cayendo en `/my`

### Validación
- `pnpm exec eslint src/lib/tenant/access.ts src/config/greenhouse-nomenclature.ts src/components/layout/vertical/VerticalMenu.tsx src/components/layout/shared/UserDropdown.tsx src/components/layout/shared/search/DefaultSuggestions.tsx src/app/auth/landing/page.tsx src/app/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/auth.ts src/lib/tenant/access.ts src/lib/tenant/resolve-portal-home-path.ts src/lib/tenant/resolve-portal-home-path.test.ts`
- `pnpm exec vitest run src/lib/tenant/resolve-portal-home-path.test.ts`

### Pendiente inmediato
- drift documental resuelto en la sesión posterior: `TASK-119` y `TASK-120` ya no quedan abiertas

## Sesión 2026-03-28 — Resumen

### Completado
- **TASK-104**: Payroll export email redesign (subject español, desglose por régimen, plain text profesional)
- **TASK-106**: Email delivery admin UI en Control Tower (historial + suscripciones + retry)
- **TASK-009 Slice A+B**: Fix del freeze de Home Nexa (timeouts, try/catch, error boundary)
- **TASK-009 Slice E**: NexaPanel migrado a `@assistant-ui/react` con LocalRuntime
- **TASK-009 Home Redesign**: UX prompt-first tipo Notion AI (NexaHero + NexaThread + QuickAccess + OperationStatus)
- **TASK-110**: Spec completo de Nexa assistant-ui feature adoption (29 componentes catalogados)
- **TASK-110 Lane A**: Nexa backend operativo con tool calling real a payroll, OTD, emails, capacidad y facturas; `/api/home/nexa` devuelve `toolInvocations` y Home renderiza cards mínimas inline
- **GREENHOUSE_NEXA_ARCHITECTURE_V1.md**: Doc canónico de Nexa creado
- **TASK-095**: Spec completo (Codex implementó la capa)
- **TASK-111**: Secret ref governance UI — tabla con dirección, auth, owner, scope, estado governance en `/admin/cloud-integrations`
- **TASK-112**: Integration health/freshness UI — tabla con LinearProgress, stale thresholds (6h/24h/48h) en `/admin/cloud-integrations`
- **TASK-113**: Ops audit trail UI — ActivityTimeline con actor, resultado, follow-up en `/admin/ops-health`
- **TASK-110 Lane B / Slice 1**: NexaThread con ActionBar Copy+Reload, Send/Cancel toggle, ScrollToBottom, error UI, animaciones; NexaHero con suggestions self-contained; adapter con throw errors

### Pendiente inmediato

| Prioridad | Task | Qué falta |
|-----------|------|-----------|
| 1 | TASK-110 Slice 1b | EditComposer inline, FollowupSuggestions (requiere backend), deprecar NexaPanel.tsx |
| 2 | TASK-110 Slice 4 | Nexa flotante portal-wide (AssistantModalPrimitive) |
| 5 | TASK-119 | Rollout final de `/home`, `portalHomePath`, sidebar y cutover de `Control Tower` |
| 6 | TASK-120 | Role scoping fino y verification bundle de `Admin Center` |

### Notas de staging
- `dev-greenhouse.efeoncepro.com/home` funcional (Gemini responde, Home carga)
- Chat UI ahora tiene Copy, Reload, Cancel, ScrollToBottom, error states y animaciones (Lane B / Slice 1)
- CI falla por lint debt preexistente (TASK-105), no por cambios de esta sesión
- Playwright MCP registrado en `~/.claude/settings.json`

### Prioridad operativa vigente — hardening `TASK-098` a `TASK-103`
- Orden recomendado: `TASK-100` → `TASK-101` → `TASK-098` → `TASK-099` → `TASK-102` → `TASK-103`.
- Rationale corto: primero guardrails baratos y transversales, luego cron auth, después observabilidad, middleware, resiliencia DB y finalmente costos.

### Prioridad operativa vigente — HRIS `TASK-025` a `TASK-031`
- Orden recomendado: `TASK-026` → `TASK-030` → `TASK-027` → `TASK-028` → `TASK-029` → `TASK-031` → `TASK-025`.
- Rationale corto: primero consolidar el modelo canónico de contratación que desbloquea elegibilidad y branches futuras; luego onboarding/offboarding y document vault como valor operativo inmediato; después expenses, goals y evaluaciones; `TASK-025` se mantiene al final porque sigue en `deferred`.

### Prioridad operativa vigente — Staff Aug `TASK-038` y `TASK-041`
- `TASK-038` se mantiene importante como línea comercial, pero posterior al bloque HRIS operativo y siempre implementada sobre la baseline moderna de Staff Aug, no sobre el brief original.
- `TASK-041` se trata como addendum de integración entre Staff Aug y HRIS; no compite como lane inmediata y debería entrar solo después de `TASK-026` y del baseline efectivo de Staff Aug.

### Prioridad operativa vigente — backlog global `to-do`
- Top ROI ahora: `TASK-100` → `TASK-101` → `TASK-072` → `TASK-098` → `TASK-026` → `TASK-109` → `TASK-117` → `TASK-030`.
- Siguiente ola: `TASK-027` → `TASK-028` → `TASK-116` → `TASK-067` → `TASK-068` → `TASK-070` → `TASK-011` → `TASK-096`.
- Estratégicas pero caras: `TASK-008` → `TASK-005` → `TASK-069` → `TASK-118` → `TASK-018` → `TASK-019`.
- Later / oportunistas: `TASK-029` → `TASK-031` → `TASK-015` → `TASK-016` → `TASK-020` → `TASK-115` → `TASK-107` → `TASK-099` → `TASK-102` → `TASK-103` → `TASK-021` → `TASK-032` → `TASK-053` → `TASK-054` → `TASK-055` → `TASK-058` → `TASK-059` → `TASK-071`.
- No gastar tokens ahora: `TASK-025`, `TASK-033` a `TASK-038`, `TASK-039`, `TASK-041`.

### Hallazgo de backlog
- `TASK-106` ya quedó movida formalmente a `complete`; `TASK-108` puede seguir tratándola como dependencia cerrada dentro de `Admin Center`.

### Release channels y changelog client-facing
- Se documento la policy canonica de releases en `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`.
- Greenhouse operara releases principalmente por modulo/feature visible, con canal opcional de plataforma y disponibilidad separada por `internal | pilot | selected_tenants | general`.
- El esquema de versionado quedo ajustado a modelo hibrido: `CalVer + canal` para modulos/producto visible y `SemVer` solo para APIs o contratos tecnicos versionados.
- Se creo `docs/changelog/CLIENT_CHANGELOG.md` como fuente curada para cambios client-facing; `changelog.md` raiz sigue siendo tecnico-operativo.
- La policy ya incluye una baseline inicial por modulo con version/canal/tag sugerido a `2026-03-29`; los tags reales quedaron pendientes hasta cerrar un commit limpio que represente ese snapshot.

### Nueva task documentada
- `TASK-117` creada en `to-do`: policy de Payroll para dejar el período oficial en `calculated` el último día hábil del mes operativo, reutilizando la utility de calendario y sin alterar el lifecycle base `draft -> calculated -> approved -> exported`.
- La task también deja explícito que `payroll_period.calculated` debería notificar a Julio Reyes y Humberly Henríquez vía `NotificationService`/email delivery, idealmente como consumer reactivo del dominio `notifications`.

### Cierre administrativo de tasks cercanas
- `TASK-009` quedó en `complete` como baseline principal de `Home + Nexa v2`.
- Lo pendiente de `TASK-009` se repartió así:
  - `TASK-119` para rollout final de `/home`, `portalHomePath`, sidebar y cutover de `Control Tower`
  - `TASK-110` sigue como owner de la evolución funcional y visual de Nexa
- `TASK-108` quedó en `complete` como baseline del shell de `Admin Center`.
- Lo pendiente de `TASK-108` se deriva a `TASK-120` para role scoping fino, convivencia con surfaces especialistas y verificación manual consolidada.
- Drift documental corregido en pipeline:
  - `TASK-074` ya no debe tratarse como activa
  - `TASK-110` se trata como `in-progress`
  - `TASK-111`, `TASK-112` y `TASK-113` se tratan como `complete`

### Sesión 2026-03-28 — TASK-110 Lane A
- Archivos tocados: `src/lib/nexa/nexa-tools.ts`, `src/lib/nexa/nexa-service.ts`, `src/app/api/home/nexa/route.ts`, `src/views/greenhouse/home/HomeView.tsx`, `src/views/greenhouse/home/components/NexaToolRenderers.tsx`, docs de task/handoff/changelog.
- Decisión de implementación: mantener la UI actual de `/home`, exponer `toolInvocations` desde backend y mapearlos a `tool-call` parts de assistant-ui. Lane B puede reemplazar el renderer mínimo sin rehacer contratos ni lógica.
- Ajuste adicional de esta sesión: Nexa ya soporta selección de modelo en UI con allowlist segura usando IDs reales de Vertex: `google/gemini-2.5-flash@default`, `google/gemini-2.5-pro@default`, `google/gemini-3-flash-preview@default`, `google/gemini-3-pro-preview@default` y `google/gemini-3.1-pro-preview@default`.
- Claude en Vertex quedó verificado como disponibilidad de plataforma, pero no está conectado al runtime de Nexa; requerirá provider/capa de integración separada.
- Validación ejecutada:
  - `pnpm exec eslint src/app/api/home/nexa/route.ts src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/lib/nexa/nexa-service.test.ts src/lib/nexa/nexa-tools.ts src/views/greenhouse/home/HomeView.tsx src/views/greenhouse/home/components/NexaToolRenderers.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm exec vitest run src/lib/nexa/nexa-service.test.ts`
- Validación adicional del switch:
  - `pnpm exec eslint src/config/nexa-models.ts src/config/nexa-models.test.ts src/lib/ai/google-genai.ts src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/app/api/home/nexa/route.ts src/views/greenhouse/home/HomeView.tsx src/views/greenhouse/home/components/NexaHero.tsx src/views/greenhouse/home/components/NexaThread.tsx src/views/greenhouse/home/components/NexaModelSelector.tsx`
  - `pnpm exec vitest run src/config/nexa-models.test.ts src/lib/nexa/nexa-service.test.ts`
- No se tocó `.env.staging-check`.
