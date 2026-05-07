# Plan — TASK-431 Tenant + User Locale Persistence Model

## Discovery Summary

- `TASK-428` y `TASK-430` estan completas: el portal usa `next-intl`, no usa locale prefix privado y hoy resuelve por cookie `gh_locale`, `Accept-Language` y fallback `es-CL`.
- Runtime real confirmado en Cloud SQL: `greenhouse_core.client_users.locale` existe como legacy `text not null default 'es'`; todos los 41 usuarios actuales tienen `es`.
- No existen aun `identity_profiles.preferred_locale`, `organizations.default_locale`, `clients.default_locale` ni columnas locale en `greenhouse_serving.session_360`.
- `session_360` es el reader canonico para NextAuth PG-first; BigQuery fallback sigue existiendo y debe mantener paridad razonable sin depender de columnas PG nuevas.
- Organization es el account canonical, pero `clients` sigue siendo bridge operativo para `/admin/tenants/:id` y algunos tenants sin organization/space.

## Decisions

- Persistir preferencia humana canonica en `greenhouse_core.identity_profiles.preferred_locale`.
- Persistir default account canonico en `greenhouse_core.organizations.default_locale`.
- Agregar `greenhouse_core.clients.default_locale` como bridge compat controlado para clients sin organization/space y para admin-tenants client-first.
- Resolver locale efectivo como: `preferred_locale` -> organization default -> client default -> legacy `client_users.locale` -> cookie `gh_locale` -> `Accept-Language` -> `es-CL`.
- Mantener `src/lib/format/locale-context.ts` sin DB async; los formatters siguen aceptando locale explicito y el runtime expone `effectiveLocale`.

## Access Model

- `routeGroups`: sin cambios.
- `views` / `authorizedViews`: sin cambios; `/settings` conserva `cliente.configuracion`, admin-tenants conserva admin surface existente.
- `entitlements`: sin capability nueva; locale personal usa sesion propia y default tenant usa `requireAdminTenantContext`.
- `startup policy`: sin cambios.

## Skills

- `greenhouse-agent`: UI Greenhouse/Vuexy y arquitectura repo.
- `vercel:nextjs`: App Router, route handlers y NextAuth session/JWT.
- `greenhouse-ux-content-accessibility`: labels, helper text, estados y errores accesibles.

## Subagent Strategy

Sequential. La task cruza DB, auth/session y UI en el mismo contrato; no hay write scopes claramente independientes que convenga paralelizar en este turno.

## Execution Order

1. Crear migracion con `pnpm migrate:create`.
2. Agregar columnas/checks/backfill y actualizar `greenhouse_serving.session_360`.
3. Aplicar migracion y regenerar `src/types/db.d.ts`.
4. Crear helper server-only `src/lib/i18n/locale-preferences.ts`.
5. Extender resolver puro `src/i18n/resolve-locale.ts`.
6. Actualizar `identity-store`, `tenant/access`, `auth` y `get-tenant-context`.
7. Crear APIs `GET/PATCH /api/me/locale` y `GET/PATCH /api/admin/tenants/[id]/locale`.
8. Agregar UI minima en `/settings` y en admin tenant settings.
9. Actualizar docs vivas y cerrar lifecycle.
10. Ejecutar verificacion focal y full.

## Files To Create

- `migrations/*_task-431-tenant-user-locale-persistence.sql`
- `src/lib/i18n/locale-preferences.ts`
- `src/lib/i18n/locale-preferences.test.ts`
- `src/app/api/me/locale/route.ts`
- `src/app/api/me/locale/route.test.ts`
- `src/app/api/admin/tenants/[id]/locale/route.ts`
- `src/app/api/admin/tenants/[id]/locale/route.test.ts`

## Files To Modify

- `src/i18n/resolve-locale.ts` and tests — persisted sources before cookie/header.
- `src/i18n/request.ts` — session `effectiveLocale` before cookie/header.
- `src/lib/tenant/identity-store.ts` — `session_360` locale fields.
- `src/lib/tenant/access.ts` — TenantAccessRecord locale fields and BigQuery fallback parity.
- `src/lib/auth.ts` — JWT/session exposes effective locale.
- `src/types/next-auth.d.ts` — session/JWT contract.
- `src/lib/tenant/get-tenant-context.ts` — tenant context locale fields.
- `src/views/greenhouse/GreenhouseSettings.tsx` — user preference UI.
- `src/views/greenhouse/admin/tenants/TenantSettingsPanel.tsx` — tenant default UI.
- Docs: i18n architecture, identity access, documentation/manual, project context, changelog, Handoff, task indexes.

## Verification

- Migration apply via canonical PG flow.
- `pnpm pg:doctor`.
- Focal tests for resolver/helper/routes/UI.
- `pnpm lint`.
- `pnpm exec tsc --noEmit --pretty false`.
- `pnpm test`.
- `pnpm build`.
- `pnpm design:lint`.
