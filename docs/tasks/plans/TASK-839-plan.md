# Plan — TASK-839 Admin Center Governance Wire-Up

## Discovery Summary

`TASK-839` no parte desde cero. En `develop` ya existen:

- UI global en `/admin/views` con `EntitlementsGovernanceTab`.
- UI por usuario en Admin Users > Acceso.
- API routes `/api/admin/entitlements/**`.
- Store `src/lib/admin/entitlements-governance.ts` con transacción, audit log y outbox.
- Tablas governance, FK a `capabilities_registry` y append-only audit log desde TASK-838.

El gap real es: capability granular, approval para grants sensibles, invalidación por role default, audit reader paginado, reliability signals y aplicación efectiva del overlay sin romper el runtime pure-function.

## Access Model

- `routeGroups`: `admin` sigue siendo el carril broad para entrar al Admin Center.
- `views` / `authorizedViews`: `/admin/views` sigue protegido por `administracion.vistas`; no se crea view nueva en V1.
- `entitlements`: las mutations se gobiernan con `access.governance.*`.
- `startup policy`: sigue en `client_users.default_portal_home_path` y `resolvePortalHomeContract()`.

Decision de diseño: `views` habilitan la superficie visible; `entitlements` autorizan acciones finas y lectura auditada.

## Architecture Decision

- ADR existente: `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` y `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`.
- ADR nuevo: no se crea documento separado. Se agrega delta en arquitectura si el resolver overlay efectivo queda como contrato compartido.
- Status requerido: Accepted vía actualización de spec/índice al cerrar.

## Skills

- `greenhouse-agent`: contexto Greenhouse/Next/Vuexy.
- `greenhouse-ui-orchestrator`: conservar surface existente, no crear consola paralela.
- `greenhouse-ux-content-accessibility`: success/error/degraded copy y estados accesibles.
- `vercel:nextjs`: App Router route handlers y server/client boundaries.

## Subagent Strategy

`fork` read-only completado:

- Backend/schema/events inventory.
- UI/access/docs inventory.

La implementación queda secuencial en el hilo principal por acoplamiento de schema, store, routes y UI.

## Slices

### 1. Migraciones

- Crear migración TASK-839 con `pnpm migrate:create`.
- Seed de capabilities `access.governance.*` en `capabilities_registry`.
- Agregar approval columns a `greenhouse_core.user_entitlement_overrides`.

### 2. Tipos / Contratos

- Actualizar `src/config/entitlements-catalog.ts`.
- Regenerar `src/types/db.d.ts` después de aplicar migración.
- Añadir types de approval/audit pagination en el store.

### 3. Queries / Readers / Helpers

- Refactorizar `src/lib/admin/entitlements-governance.ts`.
- Agregar helpers canónicos para upsert role default, upsert user override, approval, audit pagination y overlay application.

### 4. API Routes / Handlers

- Endurecer rutas existentes `/api/admin/entitlements/**` con `can(...)`.
- Agregar endpoint approve para overrides sensibles.
- Agregar endpoint audit paginado/export CSV si el slice UI lo consume.

### 5. Events / Publishers / Consumers

- Mantener event types existentes.
- En role default changes, publicar `affectedUserIds`.
- Extender `organizationWorkspaceCacheInvalidationProjection` para `affectedUserIds`.

### 6. Reliability

- Agregar signals:
  - `identity.governance.audit_log_write_failures`
  - `identity.governance.pending_approval_overdue`
- Wire en reliability overview.

### 7. UI

- Mantener `/admin/views` y `UserAccessTab`.
- Mostrar error/success copy honesto.
- Mostrar `pending_approval` para grants sensibles y CTA de aprobar con second-signature.
- Mejorar audit table sin introducir layout paralelo.

### 8. Docs

- Actualizar task lifecycle/score.
- Actualizar `Handoff.md`, `changelog.md`, arquitectura identity/access y docs funcionales/manual si cambian flujos de operación.

### 9. Verification

- `pnpm pg:doctor`
- `pnpm exec tsc --noEmit`
- Tests unitarios/store/routes/projection/reliability relevantes.
- `pnpm lint`
- Playwright/live smoke si el tiempo de sesión y auth lo permiten; si no, documentar brecha exacta.
