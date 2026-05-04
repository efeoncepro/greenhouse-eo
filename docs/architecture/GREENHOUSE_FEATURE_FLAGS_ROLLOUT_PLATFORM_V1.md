# GREENHOUSE FEATURE FLAGS & ROLLOUT PLATFORM V1

> **Tipo de documento:** Spec de arquitectura canónica
> **Versión:** 1.0
> **Creado:** 2026-05-04 por TASK-780
> **Última actualización:** 2026-05-04
> **Tasks ancla:** TASK-696 (Smart Home v2 + `home_block_flags`), TASK-780 (`home_rollout_flags` + resolver canónico)
> **Doc funcional asociado:** `docs/documentation/plataforma/feature-flags-rollout.md`

## 1. Propósito

Definir el contrato canónico para feature flags y rollouts graduales en Greenhouse. Reemplaza la práctica anterior de declarar flags como env vars binarias (`*_ENABLED=true`), que no escalaba: requería redeploy para cambios, no permitía rollback granular, no soportaba rollout per-tenant para clientes Globe (Sky, airlines), y acumulaba complejidad en Vercel cada vez que aterrizaba una feature nueva.

La plataforma se sostiene en **dos primitivas declarativas en PostgreSQL**, un **resolver TS server-only resiliente**, **observabilidad embebida en el Reliability Control Plane**, y **endpoints admin** para mutaciones idempotentes con audit trail.

## 2. Alcance

Aplica a:

- Variantes de **shell / surface** (V2 vs legacy del módulo home, futuras variantes V3, layouts experimentales).
- **Kill-switches per-block** dentro de un shell (Hero AI, Pulse Strip, Tu Día, etc — gobernados por TASK-696).
- Cualquier **feature de UI/runtime gradualizable** que necesite scope precedence `user > role > tenant > global`, rollback en segundos sin redeploy, y observabilidad nativa.

NO aplica a:

- **Flags de infraestructura crítica** que deben ser inmutables por deploy (e.g. cron classification, async-critical paths). Esas viven en `vercel.json` o `services/ops-worker/deploy.sh` y son gobernadas por TASK-775.
- **Flags fiscales/contables** que cambian semánticas de cierre. Esas requieren migración + cutover formal, no flag dinámico.
- **Secret references** (`*_SECRET_REF`). Gobernados por GCP Secret Manager + TASK-742.

## 3. Modelo de datos

### 3.1 Tabla `greenhouse_serving.home_rollout_flags` (TASK-780)

Gobierna variantes de shell. Una fila representa una decisión `(flag_key, scope_type, scope_id) → enabled`.

| Columna | Tipo | Notas |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `flag_key` | TEXT NOT NULL | Whitelist via CHECK constraint (`home_v2_shell` hoy). |
| `scope_type` | TEXT NOT NULL | `'global' \| 'tenant' \| 'role' \| 'user'`. CHECK enforced. |
| `scope_id` | TEXT NULL | NULL solo cuando `scope_type='global'` (CHECK enforced). |
| `enabled` | BOOLEAN NOT NULL DEFAULT TRUE | TRUE = variante activa para subjects matching. |
| `reason` | TEXT NULL | Audit floor: opcional al INSERT pero validation TS exige ≥ 5 chars. |
| `created_at` / `updated_at` | TIMESTAMPTZ | Trigger `set_updated_at` BEFORE UPDATE. |

**Índices**:
- `home_rollout_flags_key_scope_idx UNIQUE (flag_key, scope_type, COALESCE(scope_id, ''))` — idempotency PK lógica.
- `home_rollout_flags_lookup_idx (flag_key, scope_type)` — hot path del resolver.

**Ownership**: `greenhouse_ops`. Runtime grants `SELECT/INSERT/UPDATE/DELETE` para `greenhouse_runtime`.

**Migración canónica**: `migrations/20260504102323120_task-780-home-rollout-flags.sql`.

### 3.2 Tabla `greenhouse_serving.home_block_flags` (TASK-696)

Gobierna kill-switches per-block dentro del shell V2. Mismo shape que `home_rollout_flags`. Concerns separados — esta tabla NO decide variantes de shell, decide qué bloque renderiza adentro de V2.

**Migración canónica**: `migrations/20260427003523101_home-block-flags.sql`.

### 3.3 Decisión: dos tablas, no una

Razón: las cardinalidades, expected churn y blast radius son distintos. Mezclarlos en una tabla habría forzado a:

- Convenciones tipo `block_id='_shell:v2'` (mezcla namespaces).
- Permisos compartidos entre dueños de UI (que tocan blocks) y dueños de plataforma (que tocan rollouts).
- Lectura única que paga el costo de ambos casos cuando el callsite solo necesita uno.

Mantener tablas separadas con resolvers separados (`resolveHomeBlockFlags` y `resolveHomeRolloutFlag`) preserva clarity del modelo.

## 4. Resolver canónico

### 4.1 Contrato

Un único resolver server-only:

```ts
// src/lib/home/rollout-flags.ts
export const resolveHomeRolloutFlag = async (
  flagKey: HomeRolloutFlagKey,
  subject: HomeRolloutSubject
): Promise<{ enabled: boolean; source: 'pg' | 'env_fallback' | 'default'; scopeType: ScopeType | null }>

export const isHomeV2EnabledForSubject = async (subject): Promise<boolean>
```

`HomeRolloutSubject = { userId, tenantId | null, roleCodes[] }`.

### 4.2 Resolución (orden estricto)

1. **Cache hit (in-memory, TTL 30s, key = flagKey + subject scope)** → return.
2. **PG round-trip único** que filtra `WHERE flag_key=$1 AND (scope_type='global' OR (tenant=$2) OR (role=ANY($3)) OR (user=$4))`. Single shot, batch all matching rows.
3. **Project to scope-precedence winner**: `user > role > tenant > global`. Una sola fila gana.
4. **Si PG retornó rows** y alguna matchea subject → return winner (`source='pg'`).
5. **Si PG retornó rows pero ninguna matchea** → return `enabled=false` (`source='default'`). Operadores deben opt-in explícito.
6. **Si PG falló** → leer `process.env.HOME_V2_ENABLED` (fallback graceful, `source='env_fallback'`).
7. **Si PG falló y env ausente** → return `enabled=false` (`source='default'`). Conservative — fail closed cuando el substrate de rollout es unobservable.

### 4.3 Garantías de resilencia

- **Render NUNCA crashea**. Todas las rutas fallidas terminan en un bool determinístico.
- **Single PG hit por uncached call**. Hot path optimizado.
- **Cache TTL 30s** balancea velocidad de propagación de cambios (≤ 30s) vs latencia (cache hit p99 < 1ms).
- **Cache es per-instance**. Vercel cold start miss = OK.
- **Cache invalidation post-mutation**: `__clearHomeRolloutFlagCache()` invocado por la mutation store al UPSERT/DELETE.
- **Subject-scoped keys**: dos usuarios distintos nunca comparten cache entry. Per-tenant rollouts no leakean cross-tenant.

### 4.4 Per-user opt-out (separado del resolver)

`greenhouse_core.client_users.home_v2_opt_out BOOLEAN` permite que un usuario individual prefiera legacy sin tocar la flag. Vive a nivel de page (`src/app/(dashboard)/home/page.tsx`):

```ts
const v2Enabled = rolloutFlag.enabled && preferences.home_v2_opt_out !== true
```

Mantener separado evita que la tabla de flags acumule rows per-user de opt-outs (que crecería sin techo). Opt-outs viven con el perfil del usuario.

## 5. Mutations + admin endpoint

### 5.1 Mutation store

`src/lib/home/rollout-flags-store.ts`:

- `upsertHomeRolloutFlag(input)` — `INSERT ... ON CONFLICT DO UPDATE`. Idempotente. Validación: `flag_key` whitelist, scope_id constraints, `reason ≥ 5 chars` (audit floor). Invalida cache post-write.
- `deleteHomeRolloutFlag({flagKey, scopeType, scopeId})` — DELETE filtrado, retorna `{deleted: count}`. Idempotente. Invalida cache.
- `listHomeRolloutFlags(flagKey?)` — read all rows con filtro opcional.

### 5.2 Endpoint admin REST

`src/app/api/admin/home/rollout-flags/route.ts`:

- `GET /api/admin/home/rollout-flags?flagKey=home_v2_shell`
- `POST /api/admin/home/rollout-flags` body `{flagKey, scopeType, scopeId, enabled, reason}`
- `DELETE /api/admin/home/rollout-flags` body `{flagKey, scopeType, scopeId}`

Auth: `requireAdminTenantContext` (EFEONCE_ADMIN tenant). Errores sanitizados (sin stack traces, sin env leakage).

Cuando emerjan más flags, factorizar capability granular `home.rollout.write` y gate per-flag editors. Hoy YAGNI.

## 6. Observabilidad

### 6.1 Reliability signal `home.rollout.drift`

Reader: `src/lib/reliability/queries/home-rollout-drift.ts`. Wired al composer en `get-reliability-overview.ts`.

Detección triple (cualquiera dispara `severity=error`):

1. **Falta fila global** en `home_rollout_flags` para `home_v2_shell` — operador olvidó re-aplicar el seed después de un truncate o restore.
2. **PG flag global diverge de `process.env.HOME_V2_ENABLED`** — riesgo de variante inconsistente durante PG outage (env fallback rendería distinto a lo intencional).
3. **Opt-out rate > 5%** sobre `client_users WHERE active=TRUE` — regresión UX en V2 que empuja a usuarios a legacy. Threshold conservador.

Steady state esperado: 0 issues, severity `ok`. Cualquier valor > 0 → `error`.

Degrada honestamente a `severity=unknown` con `captureWithDomain(error, 'home', ...)` cuando PG falla — single signal roto NO envenena el overview entero.

### 6.2 Sentry tags

`captureHomeError(err, blockId, extra, homeVersion)` y `captureHomeShellError(err, homeVersion, extra)` en `src/lib/home/observability.ts` taggean cada error con `home_version: 'v2' | 'legacy'`. Lets reliability dashboards comparar incident rate por variante.

`recordHomeRender({homeVersion})` deja la variante en log structured `event=home.render.completed` para query analítico (split V2/legacy por audience sin join contra el flag resolver state).

### 6.3 Defensive try/catch en el page

`src/app/(dashboard)/home/page.tsx` envuelve el render V2 en try/catch:

```ts
try {
  return await renderV2(user, preferences, identity)
} catch (error) {
  captureHomeShellError(error, 'v2', { stage: 'render_v2_shell', flagSource, ... })
  return <HomeViewLegacy />
}
```

V2 falla → degrade graceful a legacy con Sentry tagged. NUNCA dejar la página en estado roto: la mejor experiencia de fallback es la home legacy que ya corre estable hace meses.

### 6.4 Reliability registry

```ts
// src/lib/reliability/registry.ts (módulo `home`)
expectedSignalKinds: ['runtime', 'incident', 'drift'],
incidentDomainTag: 'home'
dependencies: [
  'greenhouse_serving.home_block_flags',
  'greenhouse_serving.home_rollout_flags',
  ...
]
filesOwned: [
  'src/lib/home/**',
  'src/views/greenhouse/home/v2/**',
  'src/app/api/home/snapshot/v2/**',
  'src/app/api/admin/home/rollout-flags/**'
]
```

## 7. Operator runbook

### 7.1 Activar / desactivar globalmente

```sql
INSERT INTO greenhouse_serving.home_rollout_flags (flag_key, scope_type, scope_id, enabled, reason)
VALUES ('home_v2_shell', 'global', NULL, TRUE, 'Reason text required ≥ 5 chars')
ON CONFLICT (flag_key, scope_type, COALESCE(scope_id, ''))
DO UPDATE SET enabled = EXCLUDED.enabled, reason = EXCLUDED.reason;
```

### 7.2 Disable per-tenant (e.g. cliente piloto Globe Sky)

```sql
INSERT INTO greenhouse_serving.home_rollout_flags VALUES
  (DEFAULT, 'home_v2_shell', 'tenant', '<tenant-id>', FALSE, 'Sky pilot legacy preference', NOW(), NOW())
ON CONFLICT (flag_key, scope_type, COALESCE(scope_id, ''))
DO UPDATE SET enabled = FALSE, reason = EXCLUDED.reason;
```

### 7.3 Disable per-user (rollback de emergencia)

```sql
INSERT INTO greenhouse_serving.home_rollout_flags VALUES
  (DEFAULT, 'home_v2_shell', 'user', '<user-id>', FALSE, 'Emergency rollback — bug X reported', NOW(), NOW())
ON CONFLICT (flag_key, scope_type, COALESCE(scope_id, ''))
DO UPDATE SET enabled = FALSE;
```

### 7.4 Via admin endpoint REST

```bash
curl -X POST https://greenhouse.efeoncepro.com/api/admin/home/rollout-flags \
  -H 'Content-Type: application/json' \
  -H 'Cookie: __Secure-next-auth.session-token=...' \
  -d '{
    "flagKey": "home_v2_shell",
    "scopeType": "tenant",
    "scopeId": "client-globe-sky",
    "enabled": false,
    "reason": "Sky pilot rollback"
  }'
```

Cache TTL 30s — el cambio se ve en máximo 30 segundos sin redeploy.

## 8. Reglas duras (anti-regresión)

- **NUNCA** crear env vars binarias `*_ENABLED=true` para feature flags nuevas de UI/shell. Usar `home_rollout_flags` (variantes de shell) o `home_block_flags` (kill-switches per-block).
- **NUNCA** leer `process.env.HOME_V2_ENABLED` directo en código nuevo. Solo el resolver canónico (`src/lib/home/rollout-flags.ts`) lo hace, y solo como fallback graceful cuando PG falla.
- **NUNCA** componer la decisión de variant en cliente. Server-only (`import 'server-only'`).
- **NUNCA** reportar 5xx desde el endpoint admin con stack traces. Errores sanitizados (sin env leakage).
- **NUNCA** hardcodear `homeVersion='v2'` cuando el flag dice `legacy`. El tag tiene que reflejar la variante real renderizada para distinguir correctamente.
- **NUNCA** invalidar el cache desde mutations sin invocar `__clearHomeRolloutFlagCache`. La store helper ya lo hace — los consumers nunca tocan el cache directo.
- **NUNCA** mover lógica de opt-out per-user a la tabla `home_rollout_flags`. Vive con el perfil (`client_users.home_v2_opt_out`).
- Cuando emerja flag nueva (`home_v3_shell`, `home_layout_experimental`), extender CHECK constraint `home_rollout_flags_key_check` + agregar al type union `HomeRolloutFlagKey` + agregar tests + considerar admin UI eventualmente.

## 9. Deprecación de variantes legacy

**Trigger**: 30 días corridos donde `home.rollout.drift` reporte severity=ok Y `home_version=v2` errors ≤ legacy errors en Sentry.

**Acciones al cutover**:

1. DELETE `import HomeViewLegacy` y `<HomeViewLegacy />` de `page.tsx`
2. DELETE `src/views/greenhouse/home/HomeView.tsx` y dependencias exclusivas
3. DELETE env var `HOME_V2_ENABLED` de Vercel (los 3 environments) si seteada
4. DELETE función `isHomeV2GloballyEnabled` deprecated en `flags.ts`
5. UPDATE CHECK `home_rollout_flags_key_check` (mantener `home_v2_shell` por compat audit, agregar nueva flag si emerge)
6. Outbox event `home.v2_rollout_completed` con audit trail

Cutover SIEMPRE en TASK derivada, no en parche silencioso.

## 10. Trade-offs documentados

- **Cache TTL 30s vs propagación instantánea**: elegimos 30s. Latencia cache hit < 1ms vs propagar cambio admin en máximo 30s. Si emerge necesidad de propagación instantánea (e.g. rollback emergency p0), considerar pub/sub al cache invalidator. Hoy no lo justifica el churn esperado.
- **PG single instance vs multi-region replica**: usamos `greenhouse-pg-dev` única (compartida staging+prod). Cualquier outage del primary deja al resolver en env fallback graceful → conservative default disabled. Aceptable mientras la SLA de la instancia se mantenga > 99.9% con backups Cloud SQL HA.
- **Whitelist `flag_key` via CHECK vs catálogo**: elegimos CHECK constraint. Cada flag nueva requiere migración explícita. Costo: migration friction. Beneficio: blast radius cero de typos en flag keys + fail-fast en SQL antes de llegar al resolver.
- **Reliability signal threshold opt-out 5%**: conservador. Si llega a `error`, hay que investigar regresión UX. Threshold ajustable (constante en el reader); cualquier cambio debe quedar versionado en este doc.

## 11. Cross-references

- TASK-696: Smart Home v2 + `home_block_flags`
- TASK-780: `home_rollout_flags` + resolver canónico (esta spec)
- TASK-742: Auth Resilience 7 Layers — patrón de readiness contract reusado
- TASK-635: Reliability Module Registry — wiring del signal
- TASK-775: Vercel Cron Classification — counter-example de qué NO va en flags dinámicos
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry y signal lifecycle
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI compartido con home V2
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` — anti-parche, primitives canónicas

## 12. Versioning

- **V1.0 (2026-05-04)** — Initial release. Tabla `home_rollout_flags`, resolver canónico con scope precedence + fallback + cache, reliability signal, Sentry tags, admin REST endpoint. Una flag activa: `home_v2_shell`.
