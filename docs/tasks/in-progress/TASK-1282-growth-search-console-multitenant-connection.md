# TASK-1282 — Growth: Search Console Multi-Tenant Connection (OAuth + per-org token)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|integrations|identity|data`
- Blocked by: `none`
- Branch: `task/TASK-1282-growth-search-console-multitenant-connection`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye el **camino self-service para que cualquier marca cliente conecte SU propiedad de Google Search Console** a Greenhouse vía OAuth 3-legged, con **token por-org (el token ES el scope)** y un reader gobernado de Search Analytics. Es la fundación backend; la UI de "Conectar Search Console" es un follow-up `ui-ux` separado (split por contrato). Habilita medición SEO/AEO real por cliente sin hardcodear una propiedad.

## Why This Task Exists

Hoy no hay forma de leer datos de Search Console de un cliente. Habilitar la API de GSC (hecho en TASK-1267) NO da acceso a datos: cada propiedad requiere autorización del dueño. Para que el grador AI Visibility (EPIC-020) y el tracking/measurement (TASK-1260) usen señales reales de búsqueda por cliente, hace falta un **flujo multi-tenant gobernado**: un click de consentimiento del cliente → un refresh token scoped a SU propiedad → reads aislados por org. Es el mismo patrón canónico que el token Notion por-teamspace y HubSpot por-portal (el token = el scope).

## Goal

- Flujo OAuth 3-legged self-service: el dueño de la propiedad GSC del cliente da consentimiento (scope `webmasters.readonly`) desde un entrypoint gobernado.
- Token (refresh) persistido **por org**, aislado tenant-safe, con el secreto fuera de Postgres (Secret Manager) y metadata (siteUrl, estado, scopes, conectado_por) en PG.
- Reader canónico `readSearchConsoleAnalytics(orgId, …)` reusable por todos los consumers (grader, UI, Nexa/MCP) — Full API Parity.
- Capability gobernada `growth.search_console.connect` + grant; default OFF detrás de flag hasta verificación del consent de Google.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `Cliente`→`greenhouse.clients.client_id` / `greenhouse_core.organizations` (account-360).
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — patrón de **integración per-cliente (el token ES el scope)**; mirror del registro de tokens Notion scoped por cliente.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — consumidor de medición (EPIC-020).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el read/write como primitive gobernado, no botón ad hoc.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability + grant.

Reglas obligatorias:

- **El token ES el scope (per-org).** NUNCA un token compartido cross-org. Mirror del patrón Notion per-teamspace.
- **Aislamiento tenant duro:** org A NUNCA puede leer la propiedad de org B. El `orgId` se deriva server-side de la sesión/orgContext, NUNCA del browser.
- **Secret hygiene:** el refresh/access token vive en Secret Manager (o cifrado), NUNCA en texto plano en Postgres; PG guarda solo metadata + referencia. Nada de tokens en logs.
- **Read-only:** scope `webmasters.readonly`; cero scopes de escritura sobre la propiedad del cliente.
- **Full API Parity:** `connect`/`disconnect` = commands gobernados; `readSearchConsoleAnalytics` = reader canónico; capability fina (NO admin-coarse).

## Normative Docs

- `src/lib/google-credentials.ts` — helpers de credenciales Google existentes [verificar si reusable para OAuth de usuario vs ADC].
- `src/lib/secrets/secret-manager.ts` — `resolveSecret` / escritura de secrets per-cliente (patrón `runtime SA secret-write` acotado).
- `src/lib/auth.ts` — precedente de OAuth (azure-ad) en NextAuth [referencia de patrón, no reuso directo].
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` — capability + grant.

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (canonical org) como ancla del binding por-cliente [verificar tabla/columna canónica].
- API `searchconsole.googleapis.com` habilitada en `efeonce-group` (hecho en TASK-1267).
- **Out-of-band:** OAuth client + consent screen de Google verificados (ver §Out-of-band coordination).

### Blocks / Impacts

- Desbloquea la TASK `ui-ux` follow-up "Conectar Search Console" (botón + flow self-service) — debe autorarse a continuación.
- Alimenta señales de medición SEO/AEO del grader (EPIC-020) y del tracking engine (TASK-1260).

### Files owned

- `src/lib/growth/search-console/**` [nuevo — client OAuth + token store + reader + command]
- `src/app/api/admin/growth/search-console/oauth/start/route.ts` [nuevo — verificar lane admin vs client-portal]
- `src/app/api/admin/growth/search-console/oauth/callback/route.ts` [nuevo]
- `migrations/<ts>_task-1282-search-console-connections.sql` [nuevo]
- `src/config/entitlements-catalog.ts` · `src/lib/entitlements/runtime.ts` [extender — capability + grant]
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` [extender — flag nuevo]

## Current Repo State

### Already exists

- API GSC habilitada en `efeonce-group` (TASK-1267).
- Patrón per-cliente token (Notion) + `resolveSecret` + capability/grant + canonical org.

### Gap

- Cero flujo OAuth de Search Console, cero storage per-org de token GSC, cero reader de Search Analytics. No hay OAuth client de Google para usuarios (solo azure-ad para login + ADC/WIF para servicios).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: nueva tabla de conexiones GSC per-org + token en Secret Manager; reader de Search Analytics (proxy a la API, no SoT propio de los datos).
- Consumidores afectados: UI (follow-up), grader AI Visibility, Nexa/MCP, tracking engine.
- Runtime target: `staging|production|external`

### Contract surface

- Contrato existente a respetar: capability model (`can()`), canonical org, secret-manager, per-cliente token pattern.
- Contrato nuevo o modificado: command `connectSearchConsoleProperty(orgId, code, siteUrl)` / `disconnectSearchConsoleProperty(orgId)` + reader `readSearchConsoleAnalytics(orgId, { range, dimensions })` + 2 routes OAuth (start/callback) + capability `growth.search_console.connect`.
- Backward compatibility: `gated` (feature nueva detrás de flag; cero impacto si OFF).
- Full API parity: read = reader canónico; write (connect/disconnect) = commands gobernados con capability fina + audit; la UI y Nexa son consumers del mismo primitive.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.search_console_connections` [nuevo — verificar schema destino: growth vs crm] (`organization_id` UNIQUE, `site_url`, `scopes`, `status` enum `active|revoked|expired|pending`, `token_secret_ref`, `connected_by_user_id`, `connected_at`, `last_verified_at`).
- Invariantes que no se pueden romper:
  - El token (refresh/access) NUNCA se persiste crudo en PG ni se loggea — solo `token_secret_ref` a Secret Manager.
  - `organization_id` UNIQUE: una conexión activa por org (re-conectar reemplaza, append-only audit del cambio).
  - Reads SIEMPRE scoped por `organization_id` derivado server-side; un read sin org resuelta → `not_found` (no revela existencia de otra org).
  - Scope `webmasters.readonly` únicamente; rechazar cualquier grant con scope adicional.
- Tenant/space boundary: `organization_id` desde `orgContext` de sesión (NUNCA del browser). El `state` del OAuth va firmado + bound a la org + single-use (anti-CSRF/confused-deputy).
- Idempotency/concurrency: el callback es idempotente por `state`; reconectar es upsert por `organization_id` dentro de transacción (write token a SM → upsert metadata o rollback).
- Audit/outbox/history: log append-only de connect/disconnect (`connected_by`, timestamp, resultado); reliability signal de salud del token.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla nueva + capability seed + grant; marker `-- Up Migration` + DO-block anti pre-up-marker).
- Default state: `flag OFF` (`GROWTH_SEARCH_CONSOLE_ENABLED`) — el flujo OAuth y el reader resuelven disabled (no exponen el entrypoint) hasta verificación del consent de Google.
- Backfill plan: N/A (feature nueva).
- Rollback path: flag OFF + redeploy (<5 min); revert PR; la tabla queda inerte sin filas.
- External coordination: OAuth client + consent screen verificados en Google (scope sensible) — ver §Out-of-band.

### Security and access

- Auth/access gate: sesión + capability `growth.search_console.connect`; el callback valida el `state` firmado bound a la org.
- Sensitive data posture: tokens OAuth (secretos) — Secret Manager + grant `secretAccessor` a `greenhouse-portal@`; cero PII del lead; cero token en logs/Sentry.
- Error contract: `canonicalErrorResponse` es-CL; errores de Google sanitizados vía `captureWithDomain(err, 'growth'|'integrations', …)`.
- Abuse/rate-limit posture: respetar quotas de la GSC API (Search Analytics tiene límites diarios); cachear reads; circuit breaker + honest degradation si la propiedad fue revocada (`status=revoked`).

### Runtime evidence

- Local checks: tests del state firmado (anti-CSRF), del store (no token crudo en PG), del reader (tenant isolation org A≠B), del command (upsert idempotente).
- DB/runtime checks: migración aplicada + verificación `information_schema`; smoke del reader contra una propiedad de prueba real (cuenta Google interna) en staging.
- Integration checks: OAuth round-trip real en staging con una propiedad GSC de prueba (test user del consent screen) → token guardado → Search Analytics devuelve filas.
- Reliability signals/logs: `growth.search_console.token_unhealthy` (conexiones `expired`/`revoked` > 0).
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive (`src/lib/growth/search-console/**`), no en la UI.
- [ ] Modelada como recurso/command (`connect`/`disconnect`/`readSearchConsoleAnalytics`), no click-handler.
- [ ] Read = reader canónico; write = command con authorization fina (`growth.search_console.connect`), idempotencia, audit, errores canónicos, observabilidad.
- [ ] Capability + grant a ≥1 rol real en el MISMO PR + coverage test.
- [ ] Camino programático declarado (Product API + reader reusable por grader/Nexa/UI).
- [ ] Write apto para gobernanza (connect/disconnect explícitos; el LLM nunca conecta directo).
- [ ] Un primitive, muchos consumers (UI follow-up + grader + Nexa consumen el mismo reader).
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — OAuth connection contract + per-org token storage

- Migración `search_console_connections` (per-org, token_secret_ref, status enum) + capability `growth.search_console.connect` seed + grant.
- Cliente OAuth Google (start URL con `state` firmado bound a org + scope `webmasters.readonly`) + route `oauth/start`.
- Route `oauth/callback`: valida `state`, intercambia `code`→tokens, escribe token a Secret Manager, upsert metadata (transacción), audit. Idempotente.
- Command `connectSearchConsoleProperty` / `disconnectSearchConsoleProperty`. Flag `GROWTH_SEARCH_CONSOLE_ENABLED` default OFF.

### Slice 2 — Search Analytics reader + token health signal

- Reader `readSearchConsoleAnalytics(orgId, { range, dimensions })`: resuelve el token per-org (refresh→access), llama Search Analytics, honest degradation si `revoked`/`expired`.
- Reliability signal `growth.search_console.token_unhealthy` + reader de la signal.
- Fila por flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Out of Scope

- **UI de "Conectar Search Console"** (botón + flow self-service): es la TASK `ui-ux` follow-up secuenciada (consume este contrato).
- URL Inspection API (solo Search Analytics en v1).
- Verificación del OAuth consent screen de Google (out-of-band, no es código).
- Integrar las señales GSC al scoring del grader (consumer posterior; este task expone el reader).
- Habilitar en producción (gated EPIC-020 + verificación Google).

## Detailed Spec

Flujo: `oauth/start` (capability-gated) genera la consent URL de Google con `access_type=offline`, `prompt=consent` (para garantizar refresh token), scope `webmasters.readonly` y un `state` firmado (HMAC) que incluye `organizationId` + nonce single-use. El cliente consiente en Google → redirect a `oauth/callback` con `code`+`state`. El callback valida el `state` (firma + nonce no usado + org de la sesión == org del state), intercambia `code` por `{access_token, refresh_token}`, persiste el `refresh_token` en Secret Manager (`searchconsole-refresh-token-<org>` [verificar convención]) y hace upsert de la fila `search_console_connections` (status `active`, `site_url` elegido, `scopes`, `connected_by_user_id`). El reader resuelve el `refresh_token` per-org, obtiene un `access_token` fresco (cacheado por TTL), y llama Search Analytics Query API para el `site_url` de la org. Si Google responde `invalid_grant` (revocado) → marca `status=revoked` + signal + honest degradation (no inventa datos).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (connection contract + storage) → Slice 2 (reader + signal). El reader (Slice 2) NO puede shippear sin el storage (Slice 1). El flag `GROWTH_SEARCH_CONSOLE_ENABLED` gatea el entrypoint OAuth en ambos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Token cross-org leak (org A lee propiedad de org B) | identity/integration | low | reader scoped server-side por `organization_id` + test A≠B; `state` bound a org | `growth.search_console.token_unhealthy` + audit |
| `state` forjado (CSRF / confused deputy) | identity | medium | `state` firmado HMAC + nonce single-use + org-match con la sesión | reject loggeado |
| Token crudo persistido/loggeado | security | medium | token solo en Secret Manager + `token_secret_ref` en PG; lint/grep no-token-in-pg | revisión + no signal |
| Consent screen sin verificar (Google bloquea externos) | integration | high | flag OFF hasta verificación Google; test users mientras tanto | flujo bloqueado en prod |
| Quota Search Analytics excedida | integration | medium | cache de reads + backoff + honest degradation | error rate del reader |

### Feature flags / cutover

- `GROWTH_SEARCH_CONSOLE_ENABLED` (default `false`). Con OFF: `oauth/start` y el reader resuelven disabled (404/skip), nadie puede conectar. Flip a `true` tras verificación del consent screen + smoke staging. Revert: flag `false` + redeploy (<5 min).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag OFF + revert PR (tabla queda inerte sin filas) | <5 min | si |
| Slice 2 | flag OFF + revert PR | <5 min | si |

### Production verification sequence

1. `pnpm migrate:up` staging + verificar tabla + capability seed + grant.
2. Deploy con flag OFF + verificar entrypoint OAuth no expuesto.
3. Registrar test user en el consent screen de Google + flip flag staging.
4. OAuth round-trip real con una propiedad GSC de prueba (cuenta interna) → token en Secret Manager + fila `active`.
5. Reader devuelve filas de Search Analytics para esa propiedad; revocar el acceso en Google → verificar `status=revoked` + signal + honest degradation.
6. Prod: solo tras verificación del consent screen de Google (external user type) + sign-off. Flag OFF→ON controlado.

### Out-of-band coordination required

- **Google OAuth client + consent screen** en `efeonce-group`: crear OAuth 2.0 Client ID (web), branding Efeonce/Greenhouse, redirect URIs (staging+prod), y **verificación de Google del scope sensible `webmasters.readonly`** para external user type (toma días). Client id/secret → Secret Manager.
- Definir la convención de `site_url` que el cliente selecciona (propiedad dominio vs prefijo URL).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Source of truth nombrado: `greenhouse_growth.search_console_connections` [verificar schema] + token en Secret Manager.
- [ ] Contract surface nombrado: commands `connect`/`disconnect` + reader `readSearchConsoleAnalytics` + routes `oauth/start`+`oauth/callback` + capability `growth.search_console.connect`.
- [ ] Token OAuth NUNCA en PG crudo ni en logs (solo `token_secret_ref`); verificado por test/grep.
- [ ] Aislamiento tenant: test org A ≠ org B sobre el reader; `state` firmado bound a org + single-use.
- [ ] Scope solo `webmasters.readonly`; reconectar = upsert idempotente por `organization_id`.
- [ ] Capability + grant a ≥1 rol real en el mismo PR + coverage test.
- [ ] Migration additive con marker + DO-block; rollback = flag OFF + revert.
- [ ] Flag `GROWTH_SEARCH_CONSOLE_ENABLED` default OFF + fila en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Evidence de integración: OAuth round-trip real + Search Analytics en staging (test user).
- [ ] Signal `growth.search_console.token_unhealthy` wired (steady 0).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- OAuth round-trip + Search Analytics real en staging con propiedad de prueba + verificación PG (token NO crudo, fila scoped).

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1260 tracking engine, EPIC-020 grader, UI follow-up)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado
- [ ] autorar la TASK `ui-ux` follow-up "Conectar Search Console" (botón + flow) bloqueada por esta

## Follow-ups

- **TASK `ui-ux` (autorar):** "Conectar Search Console" — botón + flow self-service en la superficie de cuenta/cliente, consume `oauth/start` + muestra estado de conexión (`active`/`revoked`); GVC desktop+mobile.
- Integrar las señales GSC al scoring/medición del grader (EPIC-020) + tracking engine (TASK-1260).
- URL Inspection API (cobertura de indexación) como segunda fuente GSC.

## Open Questions

1. ¿Schema destino de la tabla: `greenhouse_growth` (cerca del grader) o `greenhouse_crm` (cerca de la org/cliente)? Propuesta: `greenhouse_growth` (consumer principal = grader/medición). Resolver en Discovery.
2. ¿La conexión se ofrece en el lane admin (operador conecta en nombre del cliente) o client-portal (el cliente se autoconecta), o ambos? Propuesta: ambos como consumers del mismo command; v1 entrypoint admin + el client-portal en la UI follow-up.
3. ¿Storage del token: Secret Manager per-org (consistente con Notion per-cliente) vs columna cifrada con KMS? Propuesta: Secret Manager per-org (reusa el grant acotado de `greenhouse-portal@`).

## Delta 2026-06-28 — code-complete, rollout pendiente (Claude)

Implementado local-first en `develop` (sin push). **Open Questions resueltas según propuesta:** Q1 → `greenhouse_growth`; Q2 → ambos lanes consumen el mismo command, v1 entrypoint admin; Q3 → Secret Manager per-org.

**Slices entregados:**

- **Slice 1 — connection contract + per-org token storage.** Migraciones `…_task-1282-search-console-connections.sql` (tablas `search_console_connections` UNIQUE por org + `search_console_oauth_states` single-use firmado, FK a `greenhouse_core.organizations`, marker + DO-block + GRANTs) y `…_task-1282-search-console-capability.sql` (seed `growth.search_console.connect` en `capabilities_registry`). Aplicadas a `greenhouse-pg-dev` (dev/staging comparten instancia) + `db.d.ts` regenerado. Primitive `src/lib/growth/search-console/**` (oauth-client con `OAuth2Client`, state-store anti-CSRF, connection-store, secret-naming, api-client REST, command `start/complete/disconnect`, flag `GROWTH_SEARCH_CONSOLE_ENABLED` default OFF). Routes `GET /api/admin/growth/search-console/oauth/{start,callback}` (dual-gate `requireInternalTenantContext` + `can(...,'growth.search_console.connect',...)`). Capability en catálogo TS + grant runtime (set operador) + seed registry. 4 errores canónicos nuevos es-CL.
- **Slice 2 — reader + signal.** `readSearchConsoleAnalytics(orgId, params)` (refresh→access, honest degradation `invalid_grant`/403 → `revoked` + signal). Signal `growth.search_console.token_unhealthy` (moduleKey growth, data_quality, steady 0) wired en `get-reliability-overview.ts` + glob en registry. Fila en `FEATURE_FLAG_STATE_LEDGER.md`.

**Gates verdes:** full suite `8386 passed`, `pnpm build` (Turbopack) exit 0, `pnpm lint` 0 err, `pnpm typecheck` limpio, `pnpm pg:doctor` sano, `flags:audit --strict` (flag registrado), coverage + parity de entitlements. 33 tests focales nuevos.

**Rollout pendiente (out-of-band, Runtime Rollout Completion Gate — por eso NO se mueve a `complete/`):**

1. Crear OAuth 2.0 Client ID (web) en `efeonce-group` + consent screen branding + redirect URIs staging/prod → secrets `GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID(_SECRET_REF)` / `_CLIENT_SECRET(_SECRET_REF)`.
2. Verificación de Google del scope sensible `webmasters.readonly` (external user type, días) — test users mientras tanto.
3. **Ampliar el grant IAM de secret-write** del SA `greenhouse-portal@` al prefijo `search-console-token-*` (hoy sólo `notion-integration-token-greenhouse-*`; sin esto `createOrAddSecretVersion` → `permission_denied`, que el command degrada honesto).
4. Flip flag staging + OAuth round-trip real con propiedad de prueba → token en Secret Manager + fila `active` + reader devuelve filas + revocar → `revoked` + signal.
5. Prod vía release control plane (migración + capability seed + env) tras sign-off.

**Acceptance cubierta:** SoT/contract/consumers nombrados; token NUNCA en PG (test `command` verifica que el upsert recibe `tokenSecretRef`, no el token crudo); tenant isolation (test reader org A≠B); state firmado single-use; scope sólo `webmasters.readonly`; capability + grant + coverage; migración additive con marker + DO-block; flag default OFF + ledger; signal wired steady 0. Pendiente sólo el **#9** (OAuth round-trip real en staging) por la coordinación out-of-band.

**Nota de concurrencia:** comparte worktree `develop` con WIP sin commitear de TASK-1269 (otro agente) en archivos compartidos (`entitlements-catalog.ts`, `runtime.ts`, `FEATURE_FLAG_STATE_LEDGER.md`, README/registry, grader arch/doc/manual). Mis cambios son aditivos en zonas distintas; no commiteado para no bundlear su WIP — el operador secuencia los commits.

## Delta 2026-06-29 — rollout staging + redesign property-picker (Claude)

**Rollout staging aplicado** (commits previos + config out-of-band): IAM grant secret-write ampliado a `search-console-token-*` (condición `client-integration-tokens`); OAuth client web "Greenhouse Search Console" creado en `efeonce-group`; secret `greenhouse-search-console-oauth-client-secret` + grant secretAccessor a `greenhouse-portal@`; Vercel staging `GOOGLE_SEARCH_CONSOLE_OAUTH_CLIENT_ID` + `_CLIENT_SECRET_SECRET_REF` + `GROWTH_SEARCH_CONSOLE_ENABLED=true`. Wiring smoke verde (oauth/start → consent URL válida → Google account chooser; fila de state persistida).

**Decisión de modelo (consent):** la app pasó a **External + En producción** (no Internal/Testing). Internal sólo acepta cuentas `@efeonce.org` → bloquea el self-service de clientes (cuentas externas). Testing expira los refresh tokens a 7 días → rompería la conexión persistente. External+Producción sin verificación de Google = aviso "app no verificada" durante el consentimiento (aceptable en onboarding guiado; ~100 grants hasta verificar, suficiente para la escala B2B). **NO** se creó proyecto GCP dedicado (descartado: el consent screen compartido con el Google-login del portal no es problema porque el login es Microsoft).

**Redesign property-picker (feedback del operador), commit `714a78175`:** el flujo original exigía **tipear el `site_url` exacto** antes de consentir → reemplazado por el patrón Semrush. Cambios:

- **Token de OPERADOR** (`search-console-token-operator-<userId>`): un solo refresh token reusable entre todas las orgs que el operador conecta (resuelve la redundancia "secret per-org"). Las filas per-org sólo apuntan a ese secret.
- **Property-picker:** `oauth/start` ya no pide propiedad; el callback guarda el token y deja la conexión `pending`; el reader `listSearchConsoleSitesForOrg` lista TODAS las propiedades de la cuenta (`sites.list`); el operador elige del **desplegable**; el command `selectSearchConsoleProperty` valida server-side que la propiedad esté en la cuenta (anti-binding ajeno) y marca `active`.
- **Endpoints nuevos:** `GET /api/admin/growth/search-console/sites` + `POST /api/admin/growth/search-console/select-property`.
- **Migración aditiva:** `site_url` nullable (la conexión vive `pending` hasta elegir).
- **Errores canónicos específicos:** `search_console_token_unhealthy` / `search_console_property_not_accessible` / `search_console_sites_unavailable` — el panel ahora distingue la causa (ya no un genérico opaco).
- **UI:** el panel (`SearchConsoleConnectionPanel`) reemplaza el input de texto por un `<Select>` poblado del desplegable.

**Gates:** tsc, lint, `pnpm test` full **8399**, build — verdes. 23 tests focales del dominio. Pusheado a `develop`; deploy staging live (oauth/start sin siteUrl → 302 Google confirmado).

**Pendiente:** smoke humano del flujo nuevo (operador consiente con `@efeoncepro.com` → elige propiedad → backend verifica token de operador en Secret Manager + fila `active` + reader); prod vía release control plane + (opcional) verificación de Google para quitar el aviso. Follow-up opcional: reusar el token de operador para 2.ª+ org sin re-consentir.
