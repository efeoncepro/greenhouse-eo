# Plan — TASK-2096: autoridad y contexto por Space

## Discovery summary

Intake 2026-11-06 por pedido explícito del operador (`/implement-task 2096`), tras aceptar el ADR con el modelo B.
Nadie trabajaba la task (sin PR, sin ownership en Handoff). Se trabaja en `develop`, checkout compartido, sin push.
Discovery con dos exploradores de sólo lectura (inventario de consumidores y laboratorio de TASK-2094) y lectura
directa de `identity-store.ts`, `auth.ts`, `magic-link.ts`, `sign-agent-session-in-process.ts` y NextAuth 4.24.13.

Medición de sólo lectura en la base compartida (2026-11-06, transacción `READ ONLY`): 16 clientes con Space activo,
**ninguno con más de uno** (máximo 1); `session_360` devuelve 116 filas para 116 usuarios; 0 Spaces activos sin
client. H1 está latente: hoy no produce sesiones arbitrarias, pero lo hará el día que exista el segundo Space.

## Audit

**Supuestos correctos**

- H1: la vista vigente (`migrations/20260601194051024_task-987-…sql:154-206`) une `spaces` por `client_id` y agrupa
  por `space_id`; las cuatro lecturas de `identity-store.ts:249,260,273,288` hacen `LIMIT 1` sin `ORDER BY`.
- H2: `auth.ts:796-802` sólo avanza `accessClaimsRefreshedAt` cuando el usuario está inactivo y conserva los claims.
- La sesión App rechaza al inactivo en cada request (`app-sessions.ts:121-128`) y en el refresh (`:229-236`).
- El laboratorio carga `session_360` desde `scripts/setup-postgres-identity-v2.sql` (`run-local.mjs:45-49`).

**Supuestos desactualizados o incompletos**

- No existe tabla de membership ni de grants usuario↔Space. Las únicas tablas con `space_id` de gobernanza son
  `role_entitlement_defaults`/`user_entitlement_overrides` (TASK-404), particionadas por Space de gobierno
  (`__platform__` por defecto); `can()` no usa `spaceId` (`runtime.ts:3698-3711`). El grant por Space/verbo del
  laboratorio (`sky_experiment.space_grants`) no tiene equivalente persistido.
- No hay transporte de contexto por request: ni header, ni cookie de Space; `getTenantContext()` no recibe
  argumentos y lo llaman ~201 archivos. 27 rutas leen `spaceId` de query string con validaciones distintas.
- El laboratorio no puede aplicar una migración completa: extrae fragmentos por regex y su `baseline.sql` no tiene
  `identity_profiles`, `c.default_locale`, `u.locale` ni `org.default_locale`, que la vista vigente necesita.
- **Hallazgo nuevo (H2b):** `consumeMagicLink` (`magic-link.ts:263-268`) emite la sesión sin revisar `active` ni
  `status`, y `signAgentSessionInProcess` tampoco los revisa. Un enlace pedido antes de desactivar a la persona
  sirve hasta 15 minutos.
- Riesgo de corregir H2 vaciando claims: el callback `session` asigna `primaryRoleCode = CLIENT_EXECUTIVE`
  (o `EFEONCE_ACCOUNT`) cuando faltan roles (`auth.ts:895-900`). Vaciar el token no basta; hay que invalidarlo.

**Código reutilizable**

- NextAuth 4.24.13: si el callback `jwt` lanza, la ruta de sesión limpia la cookie y `getServerSession` devuelve
  `null` (`next-auth/core/routes/session.js:86-90`, `next/index.js:144-151`). Es la palanca de invalidación.
- `src/lib/auth/agent-session-refresh.test.ts`: arnés del callback `jwt` real con `getTenantAccessRecordByUserId`
  mockeado.
- `src/lib/tenant/current-internal-subject.ts`: precedente de reader estricto independiente de `session_360`.
- `getTenantAccessRecordFromPostgresByUserId` (`access.ts:437-441`): estricto, sin fallback a BigQuery; distingue
  "no existe" (`null`) de fallo (lanza).
- `space-context-candidate.ts` del laboratorio: predicado de grant y revalidación ya probado (204 casos).

**Dependencias faltantes**: ninguna bloquea H1/H2. El grant persistido por Space es diseño nuevo de esta task.

**Blast radius**: alto. ~50 consumidores de `spaceId` de sesión, varios con decisión de autorización (Finance,
sample sprints, campaigns, sister platforms, ICO). `session_360` la leen además Insights delivery/schedules,
enablement del portal, `canonical-person` y readers de reliability. Hay **una sola base** para dev, staging y
producción: cualquier migración aplicada desde local es un cambio productivo inmediato.

## Connections map

- Outbox: `auth.login_success` (sin cambio). Ningún evento nuevo previsto en Slices 1–2.
- Crons: Insights schedules `tick.ts:70` lee `session_360` con `LIMIT 1` (consumidor; TASK-1848 dueña).
- Capabilities: el grant por Space se modela como autoridad operativa, no como capability nueva; si Slice 3
  agrega capability, va con grant en `runtime.ts` y `capability-grant-coverage.test` en el mismo cambio.
- Tests transversales: `agent-session-refresh.test.ts`, suites de `src/lib/tenant`, `src/lib/auth`, App sessions.
- Workers: `identity-store.ts`/`access.ts` se usan en workers; sin imports nuevos de `@core`.

## Decisiones que necesitan al operador

1. **Migraciones en la base compartida.** Slice 2 (vista) y Slice 3 (tabla de grants) exigen DDL. Propuesta:
   escribirlas y probarlas sólo en PostgreSQL efímero; **no** aplicarlas a la base compartida sin autorización
   explícita y con el código desplegado primero (`.claude/rules/migrations.md`).
2. **Grant por Space persistido.** Propuesta: tabla nueva `greenhouse_core.space_access_grants` (perfil, Space,
   verbos, versión, vigencia), conciliada con entitlements; descartado reutilizar `user_entitlement_overrides`
   porque su `space_id` es partición de gobierno, no membership.
3. **Transporte del contexto por request.** Propuesta: parámetro explícito validado por el resolver canónico
   (`spaceId` en ruta o query) en la primera ruta integrada; sin header global ni selector de UI (TASK-1854).

## Plan por slices

**Slice 1 — Revocación de sesión (H2, H2b). Sin migración.** Skill: `greenhouse-backend`.
- `auth.ts`: en el refresh, si el registro estricto no existe o está inactivo, lanzar `SessionAccessRevokedError`
  → NextAuth limpia la cookie y la sesión queda nula. Si la lectura falla, no avanzar `accessClaimsRefreshedAt`
  (reintenta en el siguiente request) en vez de cerrar sesiones por un corte transitorio.
- `magic-link.ts` y `sign-agent-session-in-process.ts`: exigir `active && status === 'active'` antes de emitir.
- Tests: refresh de inactivo, de usuario borrado, error transitorio, agente; magic link con usuario desactivado.

**Slice 2 — Sesión determinista (H1).** Skills: `greenhouse-postgres`, `greenhouse-backend`.
- Migración nueva de `session_360`: una fila por usuario; `space_id`/`organization_id` sólo si el client tiene
  exactamente un Space activo; si tiene más, `NULL` y `space_selection_required = true`. Sin orden por
  `updated_at`. Cambio de comportamiento hoy: ninguno (0 clientes multi-Space); verificable con el conteo.
- `identity-store.ts`: lecturas por clave única, falla si aparece más de una fila (guarda contra regresión).
- Laboratorio: cargar la vista desde la migración vigente y ampliar `baseline.sql` con las columnas que faltan.
- Probada en PostgreSQL efímero; aplicación a la base compartida sólo con autorización (decisión 1).

**Slice 3 — Contexto autorizado por request.** Skills: `greenhouse-backend`, `greenhouse-postgres`.
- Tabla de grants (decisión 2) + resolver canónico `resolveAuthorizedSpaceContext` (principal fresco + grant
  vigente + vínculo recurso/Space/Service) con resultados `authorized | denied | selection_required`.
- Errores canónicos nuevos en `CanonicalErrorCode` con copy es-CL.

**Slice 4 — Integración y matriz HTTP.** Una ruta real de lectura de Insights (lista y detalle) consume el
resolver; matriz Diseño/SEO/dual/sin relación/otra organización, dos pestañas, revocación SEO del dual y cambio
de `updated_at`, en PostgreSQL efímero. Evidencia transferida a EPIC-057 y TASK-2094.

Rollback: Slice 1 revertir código; Slices 2–3 la migración tiene Down y no toca datos; Slice 4 sólo código.
Gates por slice: `pnpm local:check` + tests focales; al cierre `pnpm test`, `pnpm build` (con autorización por
memoria del equipo) y gates documentales.
