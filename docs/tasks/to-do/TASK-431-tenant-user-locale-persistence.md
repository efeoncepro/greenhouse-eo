# TASK-431 — Tenant + User Locale Persistence Model

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none` — `TASK-428` publico la detection hierarchy y `TASK-430` activo el runtime `next-intl`.
- Branch: `task/TASK-431-tenant-user-locale-persistence`
- Legacy ID: —
- GitHub Issue: —
- Parent: `TASK-266` (umbrella)

## Summary

Agrega persistencia de preferencia de locale al modelo de tenant y al perfil de usuario. Cierra la jerarquía de detección que `TASK-428` diseñó: user preference > tenant default > browser `Accept-Language` > system default. Requiere migración PostgreSQL, coordinación con `GREENHOUSE_IDENTITY_ACCESS_V2`, y exposición de APIs para cambiar la preferencia desde UI de settings.

## Why This Task Exists

Sin persistencia, el runtime de i18n (`TASK-430`) solo puede confiar en cookie `gh_locale` + `Accept-Language` — eso se pierde al cerrar sesión y no permite que un admin de tenant fije el locale default para todos sus usuarios.

Para clientes enterprise de Efeonce distribuidos por América:

- Un tenant brasileño debería tener `pt-BR` como default para todos sus usuarios nuevos.
- Un usuario específico debería poder override a su preferencia personal (`en-US` aunque el tenant default sea `pt-BR`).
- Colaboradores internos de Efeonce pueden estar en `es-CL` aunque vean un tenant en otro locale (caso explícito a resolver).

## Goal

- Extender el schema de tenant y user con campos de locale.
- Implementar la jerarquía completa de detección en runtime.
- Exponer API + UI básica para que el usuario cambie su preferencia.
- Dejar claro qué locale aplica en contextos cross-tenant (colaborador interno viendo un tenant cliente).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_I18N_ARCHITECTURE_V1.md` (creado por `TASK-428`)
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- Migraciones PostgreSQL siguen el protocolo: `pnpm migrate:create` → editar SQL → `pnpm migrate:up` → regenerar tipos.
- Columnas nullable primero, constraints después.
- Usar el perfil `ops` / `greenhouse_ops` para DDL.
- Los valores de locale deben validarse contra la lista de locales first-class de `TASK-428` (no permitir `xx-YY` inventado).

## Normative Docs

- `docs/tasks/complete/TASK-428-i18n-architecture-decision.md`
- `docs/tasks/complete/TASK-430-dictionary-foundation-activation.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-428` cerrada — lista de locales y detection hierarchy publicadas en `docs/architecture/GREENHOUSE_I18N_ARCHITECTURE_V1.md`.
- `TASK-430` cerrada — runtime `next-intl`, provider App Router, shell `en-US` y fallback `gh_locale` + `Accept-Language` ya disponibles.

### Blocks / Impacts

- Cierra la jerarquía de detección completa — habilita UX de settings real.
- Desbloquea localization de emails (que necesita saber el locale del destinatario persistente).
- Toca Identity V2: sesión debe incluir locale efectivo.

### Files owned

- Migración PostgreSQL nueva
- `src/types/db.d.ts` (regenerado)
- `src/lib/tenant/` — lectura de `default_locale`
- `src/lib/identity/` o similar — lectura de `preferred_locale`
- Session augmentation (NextAuth callback) para exponer locale efectivo
- API route para actualizar user preference
- UI mínima en settings para cambiar preferencia

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema migration

- Migración PG:
- Default locale de tenant/account según el owner real de Identity/Account vigente (nullable, string BCP 47, CHECK contra lista válida)
- `greenhouse_core.identity_profiles.preferred_locale` (nullable, mismo CHECK)
- Normalización/absorción del legacy `greenhouse_core.client_users.locale` (`es` → `es-CL`, `en` → `en-US`) antes de exponer la preferencia canónica.
- Regenerar tipos con `pnpm db:generate-types`.
- Seed values razonables para tenants existentes (probable `es-CL`).

### Slice 2 — Runtime resolution

- Implementar resolver: `identity_profiles.preferred_locale` → tenant/account default locale → cookie `gh_locale` → `Accept-Language` → fallback `es-CL`.
- Integrar con NextAuth callback para que la sesión incluya `effectiveLocale`.
- Actualizar `src/lib/format/locale-context.ts` (creado por `TASK-429`) para leer del resolver.

### Slice 3 — API + UI

- Route `PATCH /api/me/locale` — actualiza `preferred_locale` del usuario autenticado.
- Route `PATCH /api/admin/tenants/:id/locale` — actualiza `default_locale` del tenant (requiere entitlement de tenant admin).
- UI mínima en settings del usuario: dropdown con locales first-class.
- UI mínima en admin-tenants: dropdown para default del tenant.

### Slice 4 — Cross-tenant semantics

- Decidir qué locale aplica cuando un colaborador interno (`efeonce_internal`) ve un tenant cliente con otro locale default.
- Regla decidida por TASK-428: siempre gana la preferencia del usuario si existe; si no, gana el locale default del tenant/account cliente; si no, fallback.

## Out of Scope

- Historial de cambios de locale (si se necesita auditoría, derivar child task).
- Migración de superficies a locales nuevos (eso es rollout posterior).
- Multi-locale simultáneo (un usuario viendo dos locales a la vez).

## Acceptance Criteria

- [ ] Migración PG aplicada con CHECK contra locales válidos; tipos regenerados.
- [ ] Sesión incluye `effectiveLocale` resuelto con la jerarquía completa.
- [ ] APIs `PATCH /api/me/locale` y `PATCH /api/admin/tenants/:id/locale` funcionan con validación.
- [ ] UI de settings del usuario permite cambiar preferencia; persiste y se refleja en siguiente request.
- [ ] Verificación end-to-end: cambiar preferencia → refresh → locale aplicado.
- [ ] `pnpm build`, `pnpm lint`, `npx tsc --noEmit`, `pnpm test`, `pnpm pg:doctor` pasan.

## Verification

- Tests de integración: resolver con distintas combinaciones de user/tenant/headers.
- Verificación manual en staging con bypass SSO.
- `pnpm pg:doctor` confirma schema saludable.

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_IDENTITY_ACCESS_V2.md` con locale en sesión.
- [ ] Actualizar `GREENHOUSE_I18N_ARCHITECTURE_V1.md` con jerarquía efectiva.
- [ ] Notificar a umbrella `TASK-266` y a child tasks de emails que el locale del destinatario está disponible.

## Open Questions

- Resuelta por TASK-428: cross-tenant manda user preference si existe; si no, tenant/account default.
- Resuelta por TASK-428: agent-auth default `es-CL` hasta que el agente tenga preferencia persistida.
- Resuelta por TASK-428: destinatarios sin sesión usan locale explícito/recipient preference cuando exista; si no, fallback `es-CL`.
