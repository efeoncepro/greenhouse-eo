# Admin Center end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Admin Center
> **Rutas principales:** `/admin/*`, `/api/admin/*`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`, `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`, `docs/architecture/MULTITENANT_ARCHITECTURE.md`, `docs/documentation/identity/identity-access-admin-center-end-to-end.md`

## Estado de verificacion

Documento reconciliado el 2026-06-15 contra codigo, arquitectura, schema/migrations y DB viva con datos agregados sin PII. La conexion Postgres respondio desde `greenhouse_app` con usuario runtime `greenhouse_app` a las 2026-06-15 10:50 UTC. Evidencia revisada: rutas `src/app/(dashboard)/admin/**`, APIs `src/app/api/admin/**`, stores/readers `src/lib/admin/**`, entitlements, view registry, permission sets, pricing catalog, service SLA, operational calendar, data quality, responsibilities y docs existentes de Admin Center.

Snapshot DB agregado del ambiente consultado:

- `greenhouse_core.view_registry`: 104 vistas activas distribuidas en route groups `admin` (16), `ai_tooling` (1), `client` (22), `commercial` (7), `finance` (16), `hr` (14), `internal` (13), `my` (14) y `people` (1).
- `greenhouse_core.role_view_assignments`: 442 grants activos.
- `greenhouse_core.user_view_overrides`: 0 overrides.
- `greenhouse_core.service_sla_definitions`: 0 definiciones en este ambiente.

Interpretacion: la gobernanza de vistas/grants esta poblada; overrides y Service SLAs no muestran carga runtime en este ambiente al momento de la consulta.

## Que es

Admin Center es la superficie interna para gobernar configuraciones transversales de Greenhouse. No es un "modo dios" para saltarse reglas de dominio. Cada panel admin debe respetar tenant context, capabilities, auditabilidad y contratos del dominio que administra.

Admin Center residual cubre capacidades que no viven completamente en Finance, HR, Agency o Public Site, pero que son necesarias para operar la plataforma:

- Tenants, usuarios, roles, vistas y permission sets.
- Portal views y route reachability.
- Integraciones y data quality.
- Email delivery, notifications y preview de correos.
- AI Tools catalog/credits.
- Pricing catalog y product catalog governance.
- Service SLAs.
- Operational calendar.
- Responsibilities.
- Releases, ops health, reliability y cloud integrations.

## Modelo mental

- **Admin tenant context:** toda API admin debe usar contexto server-side, no IDs del navegador como autoridad.
- **View registry:** catalogo de vistas gobernadas.
- **Role view assignment:** acceso por rol a vista.
- **User view override:** excepcion por usuario, auditable.
- **Capability:** permiso semantico para ejecutar accion, no solo ver ruta.
- **Permission set:** conjunto reutilizable de vistas/capabilities.
- **Audit log:** evidencia de cambios y decisiones.
- **Control plane:** panel que dispara operaciones gobernadas, no ediciones libres de DB.

## Que hace automatico Greenhouse

- Exige `requireAdminTenantContext()` o guard equivalente en APIs admin.
- Valida capabilities antes de mutaciones sensibles.
- Lee vistas desde `greenhouse_core.view_registry` y grants desde `role_view_assignments`.
- Usa fallbacks controlados solo para lectura cuando DB o governance projection no esta lista.
- Registra auditoria en cambios de permisos, modulos, catalogos o acciones sensibles.
- Separa admin read models de source of truth de cada dominio.
- Para dashboards de calidad/health, compone senales de runs, readiness y projections.

## Que hace el operador

- Administra acceso con roles, vistas, permission sets y overrides justificados.
- Revisa usuarios y tenants sin editar tablas manualmente.
- Opera integraciones desde paneles y runbooks, no desde SQL directo.
- Usa Email Delivery para diagnosticar correos y Preview para probar templates.
- Mantiene pricing/product catalog con aprobaciones y sync governance.
- Revisa service SLAs, calendario operacional y responsabilidades.
- Documenta cualquier excepcion, override o accion sensible.

## Areas principales

### Identity, users, roles y views

Gestiona usuarios internos/cliente, route groups, roles y acceso a vistas. La pregunta correcta no es solo "tiene rol?", sino "su sesion, tenant, route group, view assignment y capability permiten la accion?".

### Permission sets

Permiten agrupar accesos reutilizables. No deben usarse para crear permisos fantasma fuera del registry.

### Tenants

Permite ver/operar organizaciones y espacios segun scope. No reemplaza onboarding/provisioning completo.

### Integrations

Lista integraciones, health, pause/resume, sync manual y data quality. Debe respetar `integration_registry`.

### Email y notifications

Diagnostica entregas, previews, preferencias y webhooks de deliverability.

### AI Tools

Administra catalogo de herramientas IA, licencias, wallets y creditos.

### Pricing/Product catalog

Gestiona catalogos comerciales, drift con HubSpot, aprobaciones y sync. No es caja ni revenue reconocido.

### Service SLAs

Define y revisa compromisos operativos por servicio/organizacion/space, y alimenta compliance projections.

### Operational calendar

Centraliza feriados, cierres, ventanas y dias habiles relevantes para operaciones.

### Responsibilities

Asigna responsables operativos por dominio, miembro, space o workflow. Sirve para autoridad y escalamiento, no para permisos invisibles.

## Flujo: diagnosticar acceso admin

1. Confirmar usuario y tenant de sesion.
2. Revisar route group y rol efectivo.
3. Revisar `view_registry` para la vista.
4. Revisar `role_view_assignments`.
5. Revisar overrides de usuario.
6. Revisar capability especifica de accion.
7. Revisar si el panel usa guard server-side correcto.
8. Si hay drift, corregir registry/grants con migracion o comando gobernado, no SQL manual suelto.

## Flujo: aplicar cambio sensible

1. Identificar owner del dominio.
2. Verificar capability requerida.
3. Revisar impacto y datos afectados.
4. Ejecutar desde UI/API admin gobernada.
5. Confirmar audit log/evento/outbox si aplica.
6. Verificar runtime, no solo respuesta HTTP.
7. Documentar excepcion si fue override.

## Fronteras importantes

- Admin Center no debe saltarse SoD ni approval gates financieros/payroll/comerciales.
- Ver una ruta admin no implica poder ejecutar mutaciones.
- Permission set no debe crear capabilities que no existen.
- Operational responsibility no equivale automaticamente a permiso.
- Pricing catalog no equivale a factura, cobro ni P&L cerrado.
- AI Tools credits no son instrumentos de pago.
- Integration sync manual no garantiza data quality final.

## Preguntas que Nexa debe responder bien

- "Que administra Admin Center?"
- "Como doy acceso a una ruta?"
- "Rol, vista, capability y permission set son lo mismo?"
- "Por que un usuario admin no ve una vista?"
- "Como diagnostico un 403?"
- "Que panel uso para ver fallas de email?"
- "Donde pauso una integracion?"
- "Pricing catalog es lo mismo que Finance?"
- "Responsibilities dan permisos?"

## Referencias de codigo y DB

- `src/app/(dashboard)/admin/**`
- `src/app/api/admin/**`
- `src/lib/admin/get-admin-access-overview.ts`
- `src/lib/admin/get-admin-tenants-overview.ts`
- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/lib/admin/get-admin-operational-calendar-overview.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/operational-responsibility/**`
- `scripts/setup-postgres-view-access.sql`
- Tablas: `greenhouse_core.view_registry`, `role_view_assignments`, `user_view_overrides`, `view_access_log`, `capabilities_registry`, `permission_sets`/tablas relacionadas, `service_sla_definitions`, `operational_responsibilities`, `greenhouse_sync.integration_registry`, `greenhouse_notifications.email_deliveries`
