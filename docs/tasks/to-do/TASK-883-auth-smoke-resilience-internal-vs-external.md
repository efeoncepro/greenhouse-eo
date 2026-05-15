# TASK-883 — Auth Smoke Synthetic Monitor Resilience: Internal Critical vs External Dependency Severity Matrix

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-883-auth-smoke-resilience-internal-vs-external`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Rediseña el smoke synthetic monitor `/smoke/identity-auth-providers` (Capa 6 de TASK-742) para diferenciar fallos internos de Greenhouse vs degradación transient de dependencias externas (Microsoft Entra OAuth, Google OIDC discovery, portal `/api/auth/health`). Introduce taxonomía de probes (`internal_critical` vs `external_dependency`), retry+jitter+escalating timeout en probes externas, counter persistente PG anti single-shot noise, severity matrix per failure mode y 2 reliability signals canónicos. Cierra el bug class de fatiga de alertas que enmascararía un incidente real (e.g. el flip single-tenant del 2026-04-30).

## Why This Task Exists

El 2026-05-15 04:25:10 UTC, Sentry abrió un "New issue" `JAVASCRIPT-NEXTJS-5X` (`identity.auth.providers smoke failed: portal_auth_health, in_process_readiness`, level=error, environment=production). Solo fallaron las 2 probes que ejecutan [`probeAzureClientSecret`](src/lib/auth/readiness.ts#L110) (POST `https://login.microsoftonline.com/common/oauth2/v2.0/token` con timeout 5s). Las otras 3 (`microsoft_oidc_discovery`, `azure_authorize_endpoint`, `jwt_self_test`) pasaron. El portal `/api/auth/health` retornó `overallStatus='ready'` minutos después → autoresuelto, blip transient de Entra.

El detector funciona correctamente, pero **mezcla dos clases de fallo en una sola alerta**:

1. **Bugs internos de Greenhouse** (rotación mal hecha, secret content corruption, App Registration single-tenant flip, NEXTAUTH_SECRET roundtrip roto) — control 100% interno, steady=0 esperado, action immediate cuando emerge.
2. **Latency tail de dependencias externas** (Entra OAuth lento, Google OIDC parpadeando, Vercel cold start tail) — fuera de control de Greenhouse, latency p99 variable por design, NO debe alertar como `level=error` en single-shot.

Ambas clases disparan `captureMessageWithDomain` con `level: 'error'` y abren issue Sentry idéntico. El riesgo material: **fatiga de alertas** que entrene al operador a ignorar el detector cuando algún día emerja un bug real (caso histórico: TASK-742 nació justamente de un bug interno —`signInAudience` flippeado a `AzureADMyOrg`— que la Capa 6 hubiera detectado SI el operador no estaba ya saturado de alertas externas). Mejorar signal/noise del Capa 6 es load-bearing para que el contrato de TASK-742 escale.

## Goal

- Probe taxonomy declarativa: cada probe del handler `/smoke/identity-auth-providers` se clasifica `internal_critical | external_dependency` en compile-time, no por convención.
- Resilience inherente per probe externa (retry exponencial + jitter + timeout escalado + telemetría per-attempt) sin tocar el contrato de las internas.
- Severity matrix per failure mode con counter persistente PG (no in-memory) que distingue single-shot de degradación sostenida.
- 2 reliability signals canónicos bajo subsystem `Identity & Access` (`identity.auth.smoke.internal_critical_failure` + `identity.auth.smoke.external_dependency_degraded`) wireados al rollup.
- Sentry routing diferenciado: internal critical mantiene `level=error` inmediato; external dependency emite Sentry solo cuando counter ≥ 4 consecutive (~20 min sostenido).
- Spec arquitectónica reusable cross-smoke-lane (pattern aplicable a futuros smokes `finance.web`, `delivery.web`, `identity.api`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (registry de módulos + signals + severity rollup; este task agrega "Synthetic Monitor Resilience Pattern" como sección nueva)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (Platform Health composer consume `/api/auth/health`; cambios deben preservar contract `auth-readiness.v1`)
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (TASK-742 Capa 6 vive bajo el modelo identity)

Reglas obligatorias (de CLAUDE.md):

- **Auth resilience invariants (TASK-742)**: NO usar `Sentry.captureException()` directo; usar `captureWithDomain(err, 'identity', { extra })`. NO computar SSO health en cliente (la UI lee `/api/auth/health`). NO publicar secretos sin pasar por `validateSecretFormat`. Estas 7 capas son canónicas — esta task extiende Capa 6 sin tocar 1-5 ni 7.
- **Cross-runtime observability invariant (TASK-844)**: el ops-worker debe seguir invocando `initSentryForService('ops-worker')` antes del primer createServer. Toda emisión a Sentry pasa por `captureWithDomain` / `captureMessageWithDomain` (no `@sentry/nextjs` directo).
- **Vercel cron classification (TASK-775)**: el smoke sigue clasificado como `tooling` (synthetic monitor read-only). Hosting permanece Cloud Scheduler `*/5 * * * *` → ops-worker. NO migrar a Vercel cron.
- **PostgreSQL connection management (TASK-846)**: helpers nuevos que toquen PG deben pasar por `getGreenhousePostgresConfig()` / `runGreenhousePostgresQuery`. Pool dedicado prohibido.
- **Database migration markers**: la migration nueva DEBE comenzar con `-- Up Migration` exacto. Incluir bloque DO con RAISE EXCEPTION post-DDL (anti pre-up-marker bug ISSUE-068).

## Normative Docs

- `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md` — Capa 6 actual (single-shot probe binary). Esta task extiende a V2.
- `docs/tasks/complete/TASK-849-production-release-watchdog-alerts.md` — pattern fuente de severity matrix per failure mode + counter persistente. La tabla `release_watchdog_alert_state` es el sibling canónico estructural.
- `docs/tasks/complete/TASK-870-secret-manager-normalizer-hardening.md` — pattern fuente del resolver canónico que diferencia "ref corruption" (silent degrade) vs "content corruption" (Sentry alert legítimo).
- `docs/tasks/complete/TASK-672-platform-health-api-contract.md` — pattern de degradación honesta (`degradedSources[]` vs `errors[]`).
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` — contrato canónico que motiva el rediseño completo en lugar de un parche local.

## Dependencies & Impact

### Depends on

- TASK-742 SHIPPED (Capa 6 base sobre la que extiende)
- `greenhouse_sync.smoke_lane_runs` table (existente, no se modifica)
- `services/ops-worker/server.ts` `handleIdentityAuthSmoke` handler (líneas 1680-1912)
- [`src/lib/auth/readiness.ts`](src/lib/auth/readiness.ts) `probeOidcDiscovery` + `probeAzureClientSecret` + `buildAuthReadinessSnapshot`
- [`src/lib/observability/capture.ts`](src/lib/observability/capture.ts) `captureWithDomain` / `captureMessageWithDomain`
- `src/lib/reliability/registry.ts` (modulo `identity` con `incidentDomainTag: 'identity'`)
- `src/lib/reliability/get-reliability-overview.ts` (composer del rollup)

### Blocks / Impacts

- Pattern reusable cross-smoke-lane: cuando emerja segundo smoke con la misma necesidad (`finance.web`, `delivery.web`, `identity.api`), reusar el helper canónico de Slice 3-4.
- TASK-742 spec se actualiza con Delta V2 para Capa 6 (el resto de 7 capas no cambian).
- Reliability dashboard `/admin/operations` mostrará 2 signals nuevos bajo Identity & Access drilldown.

### Files owned

- `services/ops-worker/server.ts` (refactor del handler `handleIdentityAuthSmoke` a registry-driven)
- `src/lib/smoke/probe-registry.ts` (nuevo helper canónico — single source of truth de probe taxonomy)
- `src/lib/smoke/probe-registry.test.ts` (nuevo)
- `src/lib/smoke/probe-retry.ts` (nuevo helper canónico — exponential backoff + jitter + escalating timeout)
- `src/lib/smoke/probe-retry.test.ts` (nuevo)
- `src/lib/smoke/consecutive-failures-store.ts` (nuevo helper canónico — counter PG)
- `src/lib/smoke/consecutive-failures-store.test.ts` (nuevo)
- `src/lib/smoke/consecutive-failures-store.live.test.ts` (nuevo, skipea sin PG)
- `src/lib/auth/readiness.ts` (extender `probeOidcDiscovery` + `probeAzureClientSecret` para aceptar opciones de retry)
- `src/lib/reliability/queries/auth-smoke-internal-critical.ts` (nuevo signal reader)
- `src/lib/reliability/queries/auth-smoke-internal-critical.test.ts` (nuevo)
- `src/lib/reliability/queries/auth-smoke-external-dependency.ts` (nuevo signal reader)
- `src/lib/reliability/queries/auth-smoke-external-dependency.test.ts` (nuevo)
- `src/lib/reliability/registry.ts` (extender `expectedSignalKinds` modulo `identity`)
- `src/lib/reliability/get-reliability-overview.ts` (compose 2 signals nuevos en source `identity[]`)
- `migrations/<timestamp>_task-883-smoke-probe-consecutive-failures.sql` (tabla nueva + GRANTs + DO block anti pre-up-marker)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (Delta + sección "Synthetic Monitor Resilience Pattern")
- `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md` (Delta V2 para Capa 6)
- `docs/documentation/identity/sistema-identidad-roles-acceso.md` (actualizar sección "Capas de defensa" con V2 Capa 6)

## Current Repo State

### Already exists

- `services/ops-worker/server.ts:1680-1912` — handler `handleIdentityAuthSmoke` con 5 probes inline (cada una con bloque `try/catch` propio + push a `probes[]`).
- `services/ops-worker/server.ts:1897-1903` — `captureMessageWithDomain` único call cuando `status='failed'`, lumpea TODAS las probes en una sola alerta `level=error`.
- `services/ops-worker/server.ts:1871-1895` — INSERT a `greenhouse_sync.smoke_lane_runs` con `summary_json={probes}`.
- `src/lib/auth/readiness.ts:32` — `OIDC_DISCOVERY_TIMEOUT_MS = 5_000` constante hardcoded para AMBAS probes externas (Microsoft + Google).
- `src/lib/auth/readiness.ts:71-80` — `fetchWithTimeout` helper (single-shot, sin retry).
- `src/lib/auth/readiness.ts:82-108` — `probeOidcDiscovery` (single-shot binary).
- `src/lib/auth/readiness.ts:110-165` — `probeAzureClientSecret` (single-shot binary, hace POST `client_credentials` real).
- `src/lib/auth/readiness.ts:198-206` — readiness cache TTL 30s in-memory (no PG counter).
- `src/lib/reliability/registry.ts:319-362` — modulo `identity` con `expectedSignalKinds: ['incident', 'drift', 'data_quality']` (sin `lag`; agregar al wire).
- `migrations/20260510122723670_task-849-watchdog-alert-state.sql` — sibling pattern canónico para tabla counter persistente (PK compuesta + CHECK enum + GRANTs).
- `services/ops-worker/deploy.sh:872` — Cloud Scheduler job `ops-identity-auth-smoke` con cron `*/5 * * * *` (no se modifica).

### Gap

- **No hay separación entre fallos internos vs externos**. Las 5 probes existen como bloques inline iguales; no hay metadata ni clasificación que permita routing diferenciado.
- **No hay retry**. Una corrida con timeout 5s contra Entra = veredicto binario inmediato. No tolera latency tail p99 legítimo.
- **No hay counter persistente**. Cada corrida es independiente. No hay forma de distinguir "1 blip" de "degradación sostenida 30 min".
- **Sentry routing es coarse**. `if (status === 'failed')` lumpea internal+external en mismo alert. No hay diferenciación de severity ni delay para externals.
- **Telemetría es binary per probe**. `summary_json={probes}` solo tiene `passed/durationMs/reason` por probe. No registra intentos individuales ni latency histogram.
- **Path `tests/e2e/smoke/auth-providers.spec.ts` referenciado en `registry.ts:348` no existe** [verificar] — el smoke real corre en ops-worker, no en Playwright. Limpieza fuera de alcance V1 pero anotada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Probe taxonomy declarativa

- Crear `src/lib/smoke/probe-registry.ts` con tipos canónicos:
  - `type ProbeCategory = 'internal_critical' | 'external_dependency'`
  - `interface ProbeDefinition<T = void> { name: string; category: ProbeCategory; execute(ctx: ProbeContext): Promise<ProbeResult>; description: string; }`
  - `interface ProbeResult { name: string; passed: boolean; durationMs: number; reason?: string; attempts?: ProbeAttempt[]; category: ProbeCategory; }`
- Extraer las 5 probes actuales del handler inline a definiciones `ProbeDefinition`:
  - `secret_format_validation` → `internal_critical` (probe nuevo Slice 1, derivado de invocar `validateSecretFormat` sobre `*_SECRET_REF` env vars)
  - `azure_app_registration_intact` → `internal_critical` (rename del `azure_authorize_endpoint` actual; semántica idéntica)
  - `nextauth_jwt_self_test` → `internal_critical` (rename del `jwt_self_test` actual; semántica idéntica)
  - `microsoft_oidc_discovery` → `external_dependency` (probe actual)
  - `microsoft_token_endpoint_responsiveness` → `external_dependency` (extracción del `probeAzureClientSecret` standalone, decoupled del snapshot completo)
  - `google_oidc_discovery` → `external_dependency` (probe actual del snapshot, extraído standalone)
  - `portal_auth_health_endpoint_reachable` → `external_dependency` (probe actual; valida HTTP 200, no `overallStatus`)
- Refactor `handleIdentityAuthSmoke` en `services/ops-worker/server.ts` para iterar `PROBE_REGISTRY.map(p => p.execute(ctx))` en paralelo via `Promise.all`.
- Tests anti-regresión per-probe en `src/lib/smoke/probe-registry.test.ts`:
  - shape del registry (cada `ProbeDefinition` tiene `category` válida)
  - count fijo (8 probes — refactor invariant)
  - assertion compile-time `category: never` para futuro probe sin clasificación
- Mantener INSERT a `smoke_lane_runs.summary_json={probes}` con shape extendido (`category`, `attempts[]` opcional). Backward-compat: readers legacy ignoran campos nuevos.

### Slice 2 — Resilience inherente per probe externa

- Crear `src/lib/smoke/probe-retry.ts` con helper canónico:
  - `interface RetryConfig { maxAttempts: number; baseTimeoutMs: number; backoffMs: number[]; jitterMs: number; }`
  - `const EXTERNAL_DEPENDENCY_RETRY_CONFIG: RetryConfig = { maxAttempts: 3, baseTimeoutMs: 5_000, backoffMs: [1_000, 3_000, 9_000], jitterMs: 500 }`
  - `async function executeWithRetry<T>(fn: (attemptNum: number, timeoutMs: number) => Promise<T>, config: RetryConfig): Promise<{ result: T; attempts: ProbeAttempt[] }>`
  - Timeout escalado: `attemptN_timeoutMs = baseTimeoutMs * (1 + 0.5 * (attemptN - 1))` → 5s / 7.5s / 10s (más conservador que el draft inicial; balance signal vs total smoke duration)
- Extender `src/lib/auth/readiness.ts`:
  - `probeOidcDiscovery(url, options?: { retryConfig?: RetryConfig })` — backward-compat default sin retry; opt-in via options.
  - `probeAzureClientSecret({ ..., retryConfig?: RetryConfig })` — idem.
- Wire `EXTERNAL_DEPENDENCY_RETRY_CONFIG` en las 4 probes externas del registry. Las internas siguen single-shot.
- Tests `src/lib/smoke/probe-retry.test.ts`:
  - retry exitoso en attempt 2 (mock fail-then-succeed)
  - max attempts respect (mock fail × 3 → falla con `attempts.length === 3`)
  - jitter dentro de rango esperado
  - timeout escalado correcto per attempt
- Probe internal NO recibe retry (action-immediate semantics preserved).

### Slice 3 — Persistent counter + helpers

- Generar migration via `pnpm migrate:create task-883-smoke-probe-consecutive-failures` (NUNCA timestamp manual). Contenido:
  ```sql
  -- Up Migration

  CREATE TABLE IF NOT EXISTS greenhouse_sync.smoke_probe_consecutive_failures (
    lane_key TEXT NOT NULL,
    probe_name TEXT NOT NULL,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    first_observed_at TIMESTAMPTZ,
    last_observed_at TIMESTAMPTZ,
    last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_severity TEXT CHECK (last_severity IN ('ok', 'warning', 'error')),
    last_reason TEXT,
    PRIMARY KEY (lane_key, probe_name)
  );

  CREATE INDEX IF NOT EXISTS smoke_probe_consecutive_failures_severity_idx
    ON greenhouse_sync.smoke_probe_consecutive_failures (last_severity, last_observed_at DESC)
    WHERE consecutive_failures > 0;

  -- Anti pre-up-marker check
  DO $$
  DECLARE table_exists BOOLEAN;
  BEGIN
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'greenhouse_sync' AND table_name = 'smoke_probe_consecutive_failures'
    ) INTO table_exists;
    IF NOT table_exists THEN
      RAISE EXCEPTION 'TASK-883 anti pre-up-marker: smoke_probe_consecutive_failures was NOT created.';
    END IF;
  END $$;

  GRANT SELECT, INSERT, UPDATE, DELETE ON greenhouse_sync.smoke_probe_consecutive_failures TO greenhouse_runtime;

  -- Down Migration
  DROP TABLE IF EXISTS greenhouse_sync.smoke_probe_consecutive_failures;
  ```
- Crear `src/lib/smoke/consecutive-failures-store.ts` con helpers:
  - `incrementConsecutiveFailure({ laneKey, probeName, severity, reason }) → Promise<{ consecutiveFailures, firstObservedAt }>` — UPSERT que incrementa o resetea `first_observed_at` si era 0.
  - `resetConsecutiveFailure({ laneKey, probeName }) → Promise<void>` — UPSERT a 0 + clear `first_observed_at`.
  - `readConsecutiveFailure({ laneKey, probeName }) → Promise<{ consecutiveFailures: number; firstObservedAt: Date | null; lastSeverity: string | null }>`
  - `listConsecutiveFailuresAboveThreshold({ laneKey, minConsecutive }) → Promise<Row[]>` — para readers de signal.
- Tests unit `src/lib/smoke/consecutive-failures-store.test.ts` (mocks `runGreenhousePostgresQuery`).
- Tests live `src/lib/smoke/consecutive-failures-store.live.test.ts` (skipea sin `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`):
  - increment → resetea → re-increment ciclo idempotente
  - PK uniqueness enforced
  - threshold query devuelve correctos rows
- Wire en `handleIdentityAuthSmoke` post-Slice 4.

### Slice 4 — 2 reliability signals canónicos

- Crear `src/lib/reliability/queries/auth-smoke-internal-critical.ts`:
  - Reader `getAuthSmokeInternalCriticalSignal()` consulta `smoke_probe_consecutive_failures WHERE lane_key='identity.auth.providers' AND probe_name IN (<internal_critical names>) AND consecutive_failures > 0`
  - Severity: `error` si count > 0; `ok` si count = 0; `unknown` si query falla.
  - kind: `drift`, steady=0.
- Crear `src/lib/reliability/queries/auth-smoke-external-dependency.ts`:
  - Reader `getAuthSmokeExternalDependencySignal()` consulta misma tabla con `probe_name IN (<external_dependency names>)`
  - Severity:
    - `ok` si max(consecutive_failures) = 0
    - `unknown` si max(consecutive_failures) = 1 (single-shot, no significativo)
    - `warning` si max(consecutive_failures) IN (2, 3)
    - `error` si max(consecutive_failures) >= 4 (~20 min sostenido)
  - kind: `drift`, steady=0.
  - extra: `{ degradedProbes: string[], firstObservedAt: ISOString | null, ageMs: number }`
- Wire ambos en `src/lib/reliability/registry.ts` modulo `identity` (extender `expectedSignalKinds` si necesario).
- Wire en `src/lib/reliability/get-reliability-overview.ts` source `identity[]` via `Promise.all` (mismo pattern que TASK-742 + TASK-844).
- Tests anti-regresión per signal (`auth-smoke-internal-critical.test.ts`, `auth-smoke-external-dependency.test.ts`):
  - shape (kind, severity transitions, extra fields)
  - SQL anti-regresión (assert WHERE clause matchea probe_name esperado)
  - degraded mode (DB query throws → severity=`unknown` + degraded extra)

### Slice 5 — Differentiated Sentry routing + counter wire-up

- Refactor `handleIdentityAuthSmoke` para usar el counter:
  - Per probe, post-execute:
    - si `passed === true` → `resetConsecutiveFailure({ laneKey: 'identity.auth.providers', probeName })`
    - si `passed === false` → `incrementConsecutiveFailure({...})` y leer `consecutive_failures` resultante.
- Sentry routing diferenciado:
  - **internal_critical** failure (single-shot) → `captureMessageWithDomain('identity.auth.smoke internal_critical failure: <probe>', 'identity', { level: 'error', extra: { probe, attempts } })` — comportamiento actual preservado.
  - **external_dependency** failure → emitir `captureMessageWithDomain` SOLO cuando `consecutive_failures >= 4`. En attempts 1-3 NO emitir Sentry (signal del Slice 4 ya cubre observabilidad).
  - Mensaje Sentry siempre incluye `consecutive_failures`, `first_observed_at`, `category`.
- Mantener INSERT a `smoke_lane_runs` con `summary_json` extendido para incluir `category`, `consecutiveFailures` per probe.
- Tests del handler (mocking PG + Sentry calls):
  - internal failure → Sentry inmediato + signal error
  - external failure attempt 1-3 → no Sentry, signal warning
  - external failure attempt 4 → Sentry + signal error
  - mixed (1 internal + 1 external) → ambos Sentry separados
  - all pass → counters reset + 0 Sentry

### Slice 6 — Spec arquitectónica + doc funcional

- Extender `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` con sección nueva "Synthetic Monitor Resilience Pattern":
  - Patrón canónico reusable cross-smoke-lane.
  - Contract: probe taxonomy + retry semantics + counter persistente + severity matrix.
  - Decision tree: cuándo agregar retry vs cuándo mantener single-shot.
  - Reglas duras (NUNCA emitir Sentry single-shot para external; NUNCA pasar internal por counter delay).
- Actualizar `docs/tasks/complete/TASK-742-auth-resilience-7-layers.md` con Delta V2 para Capa 6:
  - Estado pre-V2: 5 probes binary single-shot, Sentry coarse routing.
  - Estado post-V2: 8 probes con taxonomy, retry external, counter PG, signals diferenciados.
  - Backward-compat preservada: contract `auth-readiness.v1` intacto, `smoke_lane_runs` superset compatible.
- Actualizar `docs/documentation/identity/sistema-identidad-roles-acceso.md` sección "Capas de defensa" con V2 Capa 6 (lenguaje simple).
- Si emerge necesidad de runbook operativo cuando `external_dependency_degraded` alerta sostenida, agregar `docs/operations/runbooks/auth-smoke-external-degradation.md` (decisión Slice 6, no obligatorio).

## Out of Scope

- **Correlation con external status APIs** (Microsoft Status API, Google Workspace Status, Vercel Status). Útil pero agrega 3 dependencias externas más con su propio failure mode + parsing de incident URLs. Diferido a TASK derivada V1.1.
- **Outbox events + Teams notifications**. Cuando counter `external_dependency >= 4` sostenido por > 1h, podría escalar a Teams `production-release-alerts` channel. V1.1 si el operador reporta necesidad.
- **Cambios al hosting**. El cron sigue Cloud Scheduler `*/5` → ops-worker. NO migrar a Vercel cron (clasificado `tooling`, no `async_critical`).
- **UI de Login**. `/api/auth/health` es consumido por `src/views/login/...` con su propio TTL 30s — el counter no afecta esa surface. La UI sigue mostrando degraded state inmediatamente cuando `overallStatus !== 'ready'`.
- **Aplicar el pattern a OTROS smoke lanes** (`finance.web`, `delivery.web`, `identity.api`). Out of scope V1; la abstracción del helper en `src/lib/smoke/` queda lista para extensión sin refactor.
- **Lint rule** `greenhouse/probe-must-declare-category`. Útil para escalabilidad cuando emerja segundo lane, pero `ProbeDefinition` con `category: ProbeCategory` ya enforce compile-time. Diferida.
- **Cambios a las otras 6 capas de TASK-742** (validateSecretFormat, readiness snapshot, auth_attempts ledger, UI gate, magic-link, rotation playbook). NO se tocan.
- **Rotación o auditoría de secretos**. Esta task NO rota nada ni cambia formato de secretos.
- **Limpieza del path inexistente `tests/e2e/smoke/auth-providers.spec.ts`** referenciado en `registry.ts:348`. Anotado en gap; cleanup separado.

## Detailed Spec

### Probe taxonomy (8 probes canónicos)

| Probe name | Category | Single-shot Sentry? | Retry config | Justificación |
|---|---|---|---|---|
| `secret_format_validation` | internal_critical | sí (immediate) | none | `validateSecretFormat` sobre `NEXTAUTH_SECRET_SECRET_REF`, `AZURE_AD_CLIENT_SECRET_SECRET_REF`, `GOOGLE_CLIENT_SECRET_SECRET_REF`. Falla = secret corruption (root cause TASK-870). |
| `nextauth_jwt_self_test` | internal_critical | sí (immediate) | none | Sign+verify HS256 con NEXTAUTH_SECRET. Falla = secret corruption. |
| `azure_app_registration_intact` | internal_critical | sí (immediate) | none | GET `/common/oauth2/v2.0/authorize?client_id=...` anónimo. Detecta AADSTS50194/9002313/700016 (single-tenant flip, app deleted). Root cause 2026-04-30 incident. |
| `provider_catalog_consistency` | internal_critical | sí (immediate) | none | NUEVO. Verifica que cada provider con `*_CLIENT_ID` set tenga `*_CLIENT_SECRET` resolvable. Falla = misconfig deploy. |
| `microsoft_oidc_discovery` | external_dependency | NO (counter ≥ 4) | retry 3× | HEAD `https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration`. Falla = Microsoft side. |
| `microsoft_token_endpoint_responsiveness` | external_dependency | NO (counter ≥ 4) | retry 3× | POST `https://login.microsoftonline.com/common/oauth2/v2.0/token` `client_credentials`. Falla puede ser Microsoft latency O `invalid_client` (último merece special handling — ver decision matrix). |
| `google_oidc_discovery` | external_dependency | NO (counter ≥ 4) | retry 3× | HEAD `https://accounts.google.com/.well-known/openid-configuration`. |
| `portal_auth_health_endpoint_reachable` | external_dependency | NO (counter ≥ 4) | retry 3× | GET `https://greenhouse.efeoncepro.com/api/auth/health`. Solo verifica HTTP 200 + JSON parseable, NO `overallStatus` (porque ese path es derivado). |

### Decision matrix: `microsoft_token_endpoint_responsiveness`

Caso especial: `probeAzureClientSecret` puede retornar `invalid_client` que NO es transient — significa secret rotado mal o expirado. Tratamiento:

- Response payload `error === 'invalid_client'` → escalar a `internal_critical` para esta corrida específica. Sentry inmediato. Counter NO se incrementa (es un fallo determinístico, no transient).
- Response timeout o response payload sin `error` field → tratar como external_dependency normal. Counter incrementa, retry corre.
- Response payload `error === 'invalid_grant'` o similar → external_dependency normal (Conditional Access bloqueando, no es bug del secret).

Implementar como branch dentro de `microsoft_token_endpoint_responsiveness.execute()` con override de category solo para `invalid_client`. Documentar en spec.

### Severity matrix (signal `external_dependency_degraded`)

| `max(consecutive_failures)` | Signal severity | Sentry emit? | Operator action |
|---|---|---|---|
| 0 | `ok` | no | none |
| 1 | `unknown` | no | observe (signal-only) |
| 2-3 | `warning` | no | check status APIs externos manualmente |
| 4-7 (~20-35 min) | `error` | sí (single Sentry per probe sustained) | escalate to runbook (V1.1) |
| 8+ (~40 min) | `error` + `extra.criticalDuration: true` | sí (incremental severity in Sentry extra) | manual investigation, possible incident response |

Counter resetea a 0 en la primera corrida `passed=true`. Counter persiste cross ops-worker restarts.

### Storage growth bounds

Cardinalidad fija: `lane_key × probe_name = 1 × 8 = 8 rows` máximo. Tabla NO crece. UPSERT en cada corrida = 0 INSERT crecimiento, solo UPDATE existing rows. Cleanup cron NO necesario.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (taxonomy refactor) ship + verify staging ANTES de Slice 2-5 (queman el shape compartido).
- Slice 3 (migration + helpers) ship + verify columna existe en staging ANTES de Slice 4-5 (helpers la consumen).
- Slice 4 (signals) puede ship en paralelo con Slice 5 una vez Slice 3 cerró, pero AMBOS dependen de Slice 3.
- Slice 5 (Sentry routing + counter wire) DEBE ship POST Slice 4 — sino los 2 signals quedan emitiendo `unknown` permanente y nadie los nota.
- Slice 6 (spec + doc) puede correr en paralelo con cualquiera, pero el merge final consolida la spec V2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Refactor probe loop introduce regresión silenciosa (probe que pasaba ahora falla por race condition con `Promise.all`) | identity / auth | medium | Tests anti-regresión per-probe + flag `SMOKE_RESILIENCE_V2_ENABLED` shadow 7d staging (corre ambos handlers en paralelo, compara resultados) | `identity.auth.smoke.internal_critical_failure` |
| Clasificación incorrecta (probe interna marcada `external_dependency` por error de copy) suprime alerta REAL del bug class TASK-742 | identity / auth | low | Separación tipada compile-time + tests boundary + revisión arch-architect del registry pre-merge + Sentry capture si counter resetea inesperadamente | Sentry inmediato si flag rollback |
| Counter PG corrupto bloquea state machine (e.g. `consecutive_failures` queda en `null` o `-1`) | identity / cron | low | CHECK constraint sobre columna + cardinalidad fija (1 row per `(lane,probe)`) + tests live PG end-to-end | Sentry tag `domain=identity, source=smoke_counter_corruption` |
| Migration deploy order roto (server.ts nuevo deployado antes que tabla existe) | release / migration | low | Slice ordering hard rule: Slice 3 (migration) ship + verify prod ANTES de Slice 5 deploy. Helper retorna `null` graceful si tabla no existe (degradation honest, NO crash) | Migration marker check + `pnpm pg:doctor` post-apply |
| Delay 20min de detección external podría enmascarar bug cross-class (e.g. App Registration deletada se manifiesta primero como `microsoft_token_endpoint_responsiveness` external) | identity / observability | medium | Decision matrix `invalid_client` → escalación a internal_critical para ese caso específico. Sentry inmediato. Counter no incrementa | Signal `internal_critical_failure` |
| Pattern del retry+jitter (1s/3s/9s con timeout escalado 5/7.5/10s) hace que el smoke total tarde > 60s y exceda Cloud Scheduler timeout | identity / cron | low | Total worst-case: 5+7.5+10 = 22.5s per probe externa × 4 = 90s paralelos via `Promise.all` = 22.5s wall-clock. Bien dentro del límite Cloud Scheduler 5min. Internal probes corren en <500ms total. | `smoke_lane_runs.duration_ms` outlier detection |
| Sentry burst si counter resetea + re-trigger ciclo rápido (Microsoft parpadea cada 6min) | identity / observability | low | Sentry routing solo emite cuando `consecutive_failures` cruza el threshold 4 (no en cada incremento). Sentry tiene su propio dedup. | Sentry rate metrics |
| TASK-742 spec diverge entre Capa 6 V1 (complete) y V2 (post-merge) | identity / docs | medium | Slice 6 incluye Delta V2 sobre la spec original — preserva trazabilidad histórica del cambio | Code review humano |

### Feature flags / cutover

- Env var `SMOKE_RESILIENCE_V2_ENABLED` (default `false` en producción durante shadow 7d staging).
  - `false`: handler corre comportamiento actual TASK-742 V1 (5 probes binary single-shot, Sentry coarse).
  - `true`: handler corre V2 (8 probes con taxonomy + retry + counter + signals diferenciados).
  - Shadow mode (Slice 1-2): cuando `false`, handler V1 corre normal pero ADEMÁS ejecuta el registry V2 en background (sin emitir signals ni Sentry) y compara resultados, persistiendo divergencias en `smoke_lane_runs.summary_json.shadow_diff[]` para validación.
  - Cutover: flip a `true` post 7d shadow staging + 0 divergencias críticas + smoke manual external dependency.
- Revert: env var a `false` + redeploy ops-worker (~3 min via `bash services/ops-worker/deploy.sh`).
- Ningún flag adicional necesario (la migración del Slice 3 es additive y reversible via DROP TABLE).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR + redeploy ops-worker | <5 min | sí (refactor puro, comportamiento preservado) |
| Slice 2 | Pasar `retryConfig: undefined` a probes externas via env var | <5 min | sí (default behavior es no-retry) |
| Slice 3 | `pnpm migrate:down` (drop table) + revert PR | <10 min | sí (tabla solo agrega rows, no modifica schemas existentes) |
| Slice 4 | Comentar wire en `get-reliability-overview.ts` + redeploy Vercel | <10 min | sí (signals desaparecen del rollup, no afecta runtime) |
| Slice 5 | Flag `SMOKE_RESILIENCE_V2_ENABLED=false` + redeploy ops-worker | <5 min | sí (handler vuelve a V1 path completo) |
| Slice 6 | Revert commit de doc + revert PR | <5 min | sí (solo doc, sin runtime impact) |

Combo full-rollback worst case: revert los 6 slices secuencialmente = ~40 min. Más probable: flag a `false` (5 min) cubre 90% de casos sin necesidad de revert código.

### Production verification sequence

1. `pnpm migrate:up` en staging + verify columna `smoke_probe_consecutive_failures` existe con CHECK + GRANTs correctos.
2. Deploy code a staging con `SMOKE_RESILIENCE_V2_ENABLED=false` + verify SCIM existente smoke V1 corre normal (corridas verdes en `smoke_lane_runs`).
3. Verify shadow mode: revisar `summary_json.shadow_diff[]` post 24h. 0 divergencias críticas esperado.
4. Flip `SMOKE_RESILIENCE_V2_ENABLED=true` en staging + verify 7d:
   - 5 corridas consecutive verdes (counter resetea correcto)
   - Inducir 1 fallo external sintético (e.g. block Entra DNS via egress firewall) + verify counter incrementa, signal pasa `unknown → warning → error` en cadencia esperada
   - Inducir fallo internal sintético (e.g. corruptar `NEXTAUTH_SECRET` env var temporalmente) + verify Sentry alert inmediato + signal error
5. Deploy migration + code a production con flag `false` por 24h cooldown + verify shadow_diff en prod.
6. Flip `SMOKE_RESILIENCE_V2_ENABLED=true` en production + monitor signals durante 7d:
   - signal `internal_critical_failure` steady = `ok`
   - signal `external_dependency_degraded` steady = `ok` o `unknown` ocasional
   - 0 Sentry burst inesperado
7. Update TASK_742 spec + this task → `complete/`.

### Out-of-band coordination required

- N/A — repo-only change. No tocar Azure AD App Registration, no rotar secretos, no cambiar HubSpot config, no notificar operadores HR/Finance (smoke es interno al equipo plataforma).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/lib/smoke/probe-registry.ts` define `PROBE_REGISTRY` con 8 probes tipados; refactor `services/ops-worker/server.ts` consume el registry via `Promise.all`
- [ ] Cada `ProbeDefinition` declara `category: 'internal_critical' | 'external_dependency'` (compile-time enforced)
- [ ] `src/lib/smoke/probe-retry.ts` implementa exponential backoff + jitter + escalating timeout con tests unit + integration
- [ ] Las 4 probes externas usan `EXTERNAL_DEPENDENCY_RETRY_CONFIG`; las 4 internas siguen single-shot
- [ ] Migration `task-883-smoke-probe-consecutive-failures.sql` aplicada en staging + production con DO block anti pre-up-marker validado
- [ ] Helpers `incrementConsecutiveFailure` / `resetConsecutiveFailure` / `readConsecutiveFailure` con tests live verde end-to-end
- [ ] Reliability signal `identity.auth.smoke.internal_critical_failure` registrado en `get-reliability-overview.ts` + visible en `/admin/operations`
- [ ] Reliability signal `identity.auth.smoke.external_dependency_degraded` con severity matrix declarada (`ok / unknown / warning / error`) operacional
- [ ] Sentry routing diferenciado: internal failure emite `level=error` inmediato; external failure emite solo cuando `consecutive_failures >= 4`
- [ ] Decision matrix `invalid_client` → internal_critical implementada en `microsoft_token_endpoint_responsiveness`
- [ ] Spec `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` extendida con sección "Synthetic Monitor Resilience Pattern"
- [ ] Spec `TASK-742-auth-resilience-7-layers.md` con Delta V2 para Capa 6
- [ ] Doc funcional `docs/documentation/identity/sistema-identidad-roles-acceso.md` actualizada con V2 Capa 6 (lenguaje simple)
- [ ] Flag `SMOKE_RESILIENCE_V2_ENABLED` ship en `false` por default; flip a `true` en production post 7d shadow + 7d enabled-staging verification
- [ ] CLAUDE.md actualizado con sección "Synthetic Monitor Resilience invariants" referenciando esta task
- [ ] 0 regresión en `smoke_lane_runs` con `lane_key='identity.auth.providers'` durante 14 días post-flip (status='passed' rate >= rate pre-flip)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/smoke src/lib/auth src/lib/reliability/queries/auth-smoke-*`
- `pnpm test --run src/lib/smoke/consecutive-failures-store.live.test.ts` (con PG proxy activo)
- `pnpm build` (gate canónico TASK-827, atrapa boundary violations server-only/client-only)
- Manual: `pnpm pg:connect:status` post-migration + verify `\\d greenhouse_sync.smoke_probe_consecutive_failures` en `pnpm pg:connect:shell`
- Manual: trigger Cloud Scheduler `ops-identity-auth-smoke` manualmente post-deploy staging + revisar `smoke_lane_runs.summary_json` shape extendido
- Manual: revisar Sentry post 14d para confirmar 0 burst external + alerts internas si aplica

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo vive en carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con cierre
- [ ] `Handoff.md` actualizado con aprendizajes (especialmente decision matrix `invalid_client` y observaciones del shadow period)
- [ ] `changelog.md` actualizado (Capa 6 V2 ship)
- [ ] chequeo de impacto cruzado sobre TASK-742 (Delta V2 aplicada), TASK-849 (pattern fuente sigue válido), TASK-672 (Platform Health composer no afectado), TASK-844 (Sentry init invariant preservado)

- [ ] CLAUDE.md sección "Synthetic Monitor Resilience invariants" agregada con reglas duras (NO emitir Sentry single-shot para external; NO bypass decision matrix `invalid_client`; NO modificar `consecutive_failures` directo via SQL)
- [ ] Migration `task-883-smoke-probe-consecutive-failures.sql` aplicada en production y verified
- [ ] Flag `SMOKE_RESILIENCE_V2_ENABLED=true` ship en producción + 14 días monitoring sin incidente

## Follow-ups

- TASK derivada V1.1: correlation con Microsoft Status API / Google Workspace Status / Vercel Status (downgrade severity a `unknown` cuando provider externo declara incident vigente)
- TASK derivada V1.2: outbox event `platform.smoke.external_dependency_degraded_alert v1` + Teams notification a `production-release-alerts` cuando counter sostenido > 1h
- TASK derivada V1.3: aplicar el pattern a otros smoke lanes (`finance.web`, `delivery.web`, `identity.api`) reusando `src/lib/smoke/`
- Cleanup `tests/e2e/smoke/auth-providers.spec.ts` referencia rota en `src/lib/reliability/registry.ts:348` (path no existe; smoke real corre en ops-worker)
- Lint rule `greenhouse/smoke-probe-must-declare-category` (defense-in-depth para escalabilidad cross-lane)

## Open Questions

- ¿El threshold de 4 consecutive (~20 min sostenido) para emitir Sentry external es correcto para el SLA del operador, o debería ser más agresivo (3 = 15 min) o más relajado (6 = 30 min)? Decisión final post-evidencia 7d shadow staging.
- ¿La decision matrix `invalid_client` debería incluir más AADSTS codes (e.g. `AADSTS7000222` expired secret) como internal_critical? Investigar durante Slice 1 discovery.
- Shadow mode requiere correr ambos handlers en paralelo durante 7d staging — ¿overhead aceptable? Estimación: +0 PG calls (V2 solo lee), +1 outbound HTTP per probe externa (de 4 a 8 total). Bien dentro del Cloud Run quota.
