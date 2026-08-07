# Informe — DataForSEO en `greenhouse-eo` (as-of 2026-08-06, branch `develop`)

## §1 Cliente canónico (API + firmas)

Vive en `src/lib/ai/dataforseo.ts` (364 líneas, `import 'server-only'`). Base URL fija `https://api.dataforseo.com` (`src/lib/ai/dataforseo.ts:13`). Exports:

| Símbolo | Tipo/Firma | Notas |
|---|---|---|
| `DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT` | `'/v3/serp/google/ai_mode/live/advanced'` | `dataforseo.ts:15` |
| `DATAFORSEO_DEFAULT_ORGANIC_ENDPOINT` | `'/v3/serp/google/organic/live/advanced'` | `dataforseo.ts:16` |
| `DataForSeoSerpTask` | interface `{ keyword: string; location_name?; location_code?; language_code?; device?: 'desktop'\|'mobile'; os?; depth?; [key: string]: unknown }` | Solo para familia `serp`; OnPage/Backlinks usan `target`, Labs bulk `keywords[]` (`dataforseo.ts:25-34`) |
| `DataForSeoTaskPayload` | `Record<string, unknown>` | payload genérico de las demás familias (`dataforseo.ts:44`) |
| `DataForSeoSerpResult` | `{ ok, httpStatus, endpoint, tasks: unknown[], cost: number\|null, latencyMs, secretSource, family?, breakerOpen? }` | `breakerOpen=true` = no se llamó al proveedor (`dataforseo.ts:46-62`) |
| `DataForSeoConnectionCheck` | `{ ok, httpStatus, secretSource, latencyMs }` | `dataforseo.ts:64-69` |
| `isDataForSeoConfigured()` | `() => Promise<boolean>` | login env + password vía `resolveSecret`; nunca lanza (`dataforseo.ts:71`) |
| `DataForSeoSpendRecorder` | `(input: { organizationId; family; cost }) => Promise<void>` | hook de cost-tracking inyectable (`dataforseo.ts:110-114`) |
| `setDataForSeoSpendRecorder(recorder \| null)` | registra el hook a nivel de módulo (`dataforseo.ts:118`) | lo llena el dominio growth, no el cliente |
| `DataForSeoTaskInput` | union: `{ family: 'serp', endpoint, tasks: DataForSeoSerpTask[], timeoutMs?, organizationId? }` \| `{ family: Exclude<...,'serp'>, endpoint, tasks: DataForSeoTaskPayload[], timeoutMs?, organizationId: REQUIRED }` | el tipo hace imposible el gasto SEO sin org (`dataforseo.ts:135-150`) |
| `postDataForSeoTask(input)` | `(DataForSeoTaskInput) => Promise<DataForSeoSerpResult>` | **transporte canónico único**: fetch POST + Basic auth + timeout (default 35s) + breaker + registro de costo (`dataforseo.ts:156`) |
| `postDataForSeoSerpLiveAdvanced({ endpoint, tasks, timeoutMs? })` | contrato histórico del AEO; delega en `postDataForSeoTask` con `family:'serp'`; **NO agregar parámetros** — consumers nuevos usan `postDataForSeoTask` (`dataforseo.ts:303`) |
| `checkDataForSeoConnection({ timeoutMs? }?)` | health check GET a `/v3/appendix/user_data`, default 15s; carril aparte deliberado — sin familia, sin allowlist, sin breaker (`dataforseo.ts:315`) |
| `runDataForSeoGoogleAiModeSerp({ keyword, locationName?, languageCode?, device?, timeoutMs? })` | convenience sobre AI Mode; defaults `Chile`/`es`/`desktop` (`dataforseo.ts:346`) |

Comportamiento interno clave del transporte:
- Valida endpoint contra la familia (`normalizeEndpoint`) **antes** de resolver credenciales (`dataforseo.ts:188`).
- Si el breaker de la familia está abierto → retorna `{ ok:false, httpStatus:0, breakerOpen:true, secretSource:'unconfigured' }` sin llamar (`dataforseo.ts:192-207`).
- **Falla fuerte** (`throw`) si `input.organizationId` está presente y no hay spend recorder registrado — la condición es "¿HAY organización?", no "¿la familia lo exige?" (`dataforseo.ts:179-184`, lección TASK-1302).
- Registra el costo **en el transporte**, no en el caller (`dataforseo.ts:260-272`); un fallo del recorder se observa (`captureWithDomain(err,'growth')`) pero NO invalida el resultado ya cobrado.
- `cost` se lee de `json.cost` raíz — es del **batch**, no per-task (límite #2 de `dataforseo-families.ts:81-84`).
- Solo fallos de salud del proveedor (`isProviderHealthFailure`) alimentan el breaker en respuestas no-OK; excepciones de red/timeout (`catch`) siempre lo alimentan y re-lanzan (`dataforseo.ts:235-237, 285-292`).

## §2 Allowlist de familias

`src/lib/ai/dataforseo-families.ts` — **allowlist CERRADO, nunca prefijo libre del caller** (riesgo §13.3 de la arquitectura SEO). Sin `server-only` (solo datos/tipos). Exports: `DataForSeoFamilyDefinition`, `DATAFORSEO_FAMILIES`, `DataForSeoFamily`, `DATAFORSEO_FAMILY_NAMES`, `isDataForSeoFamily(value)`, `normalizeEndpoint(endpoint, family)` (lanza en mismatch, no degrada).

| Familia | Prefijo | `requiresOrganization` | Uso |
|---|---|---|---|
| `serp` | `/v3/serp/` | `false` (limitación ACTUAL: `ProviderAdapterContext` del AEO no transporta la org; `grader_profiles.organization_id` es nullable — follow-up TASK-1300) | AEO grader (AI Mode / organic) |
| `labs` | `/v3/dataforseo_labs/` | `true` | keyword research, ranked keywords, competitors |
| `backlinks` | `/v3/backlinks/` | `true` | perfil de enlaces |
| `onpage` | `/v3/on_page/` | `true` | site audit, task-based async (POST crea, poll aparte) |
| `domain` | `/v3/domain_analytics/` | `true` | tecnologías/Whois |

Límites conocidos documentados en el propio registry (`dataforseo-families.ts:70-94`): (1) transporte POST-only con body `JSON.stringify(tasks)` — `task_get/$id`/`tasks_ready` (GET, id en path) NO funcionan aunque el prefijo calce (Lighthouse y SERP task-based excluidos); (2) `cost` del batch, no por fila; (3) breaker por FAMILIA, no por operación (polls fallando apagan también la creación); (4) `checkDataForSeoConnection` es carril aparte; (5) familias ausentes a propósito: `keywords_data` (usar `labs`) y `business_data` (fuera de alcance).

## §3 Breaker

`src/lib/ai/dataforseo-breaker.ts` — circuit breaker **por familia**, in-memory por proceso, best-effort (la defensa dura del gasto es el presupuesto persistido). Exports: `BreakerState` (`'closed'|'open'|'half-open'`), `DataForSeoBreakerOptions`, `DataForSeoBreaker` (interface: `canAttempt/state/recordSuccess/recordFailure/reset`), `createDataForSeoBreaker(options?)`, singleton `dataForSeoBreaker`, `isProviderHealthFailure(httpStatus)`.

- Umbral: `DEFAULT_FAILURE_THRESHOLD = 5` fallos consecutivos abre (`dataforseo-breaker.ts:20`).
- Cooldown: `DEFAULT_COOLDOWN_MS = 60_000`; pasado el cooldown → `half-open` (`dataforseo-breaker.ts:23`).
- `half-open` deja pasar **una sola sonda** (`probeInFlight`, anti-estampida en crons concurrentes); éxito cierra, fallo reinicia cooldown (`dataforseo-breaker.ts:89-102`).
- Cuentan como fallo de salud: `429`, `402`, `403`, `>=500`. NO cuentan: `400`/`404` de caller (deterministas — abrirlo castigaría al AEO que comparte `serp`) (`dataforseo-breaker.ts:145-146`).
- Razón de existir: AEO (`serp`) y SEO (`labs/onpage/backlinks/domain`) comparten credenciales y transporte; el aislamiento evita que un provider SEO roto hunda el grader en producción (riesgo §13.4).

## §4 Spend guard y costos

**Ledger (writer):** `src/lib/growth/seo/provider-spend.ts` — vive en growth, NO en `src/lib/ai/` (la dependencia apunta growth→ai, nunca al revés). Exports: `RecordSeoProviderSpendInput`, `SEO_PROVIDER_SPEND_UPSERT_SQL` (exportado para que el sanity live ejercite el MISMO statement), `buildSeoProviderSpendMonthlySumSql(organizationPlaceholder)` (placeholder parametrizado — anti bug de posición fija silencioso), `recordSeoProviderSpend(input)`, `SeoProviderSpendByFamily`, `readSeoProviderSpendByFamily(organizationId)`.
- Tabla: `greenhouse_growth.seo_provider_spend_daily` (PK `organization_id × family × spend_date`); UPSERT con **incrementos atómicos en SQL** (`col = col + EXCLUDED.col`), nunca read-modify-write (`provider-spend.ts:37-44`). Costos no finitos/≤0 se ignoran (no filas de gasto cero).
- Migración con CHECK de familia: `migrations/20260805194114467_task-1300-seo-provider-spend-daily.sql`; el test `src/lib/ai/__tests__/dataforseo-family-check-parity.test.ts` fuerza paridad TS↔CHECK (agregar familia sin migrar el CHECK rompe el build — sino cada llamada gastaría real, el INSERT fallaría y el gate leería cero para siempre).

**Registro (side-effect import):** `src/lib/growth/seo/register-provider-spend.ts` — `import '@/lib/growth/seo/register-provider-spend'` conecta `recordSeoProviderSpend` al hook `setDataForSeoSpendRecorder`. **TODO runtime que llame familias SEO debe importarlo en su entrypoint**; si falta, `postDataForSeoTask` LANZA en la primera llamada con org. Estado as-of 2026-08-07: lo importan el **ops-worker** (`services/ops-worker/server.ts:142`, entrypoint del rank capture y del site audit) y los scripts de sanity/seed. **Vercel NO lo importa** — y no lo necesita hoy porque ningún route handler llama familias SEO; el día que uno lo haga, el throw es el recordatorio.

**Gate de presupuesto:** `src/lib/growth/seo/entitlement.ts` — `enforceSeoRunEntitlement(organizationId, { estimatedCostUsd? }?, env?)` es el **ÚNICO** gate de costo DataForSEO (chokepoint, riesgo §13.1). Cadena: entitlement (`module_assignments`, `module_key='seo_v1'`) → expiración → allowance (site-audits/mes) → budget (USD/mes). `blockedReason ∈ {no_entitlement, expired, quota_exhausted, budget_exhausted}`. Fuente ÚNICA de gasto = `seo_provider_spend_daily` (sumarle el `provider_cost` de snapshots contaría doble). Knobs env con default: `GROWTH_SEO_{CONTRACTED|TRIAL|PILOT}_{AUDIT_RUNS_PER_MONTH|MONTHLY_BUDGET_USD}` (defaults: 8/1/2 runs; 50/2/10 USD — `entitlement.ts:103-110`). **Límite conocido documentado** (`entitlement.ts:288-307`): el gate se consulta UNA vez y el gasto se acumula DESPUÉS (sin reserva/claim; batch de 120 keywords sobregiró 3× un budget trial); mitigaciones del caller: `estimatedCostUsd` del batch completo, re-consultar cada K llamadas, acotar el batch; `quota_exhausted` NO aplica a rank capture (no crea audit runs). El spend fence real es trabajo de TASK-1303.

**Costo AEO (aparte):** `src/lib/growth/ai-visibility/cost.ts` — `estimateObservationCostUsd`/`estimateRunCostUsd`; para `google_ai_overview` el costo NO es por tokens: se lee `usage.dataforseo_cost_usd` que el adapter persiste desde `result.cost` (`cost.ts:46-50`). Este carril AEO no escribe en `seo_provider_spend_daily` (limitación `serp` sin org, ver §2).

**Tests:** `src/lib/ai/__tests__/` — `dataforseo.test.ts`, `dataforseo-families.test.ts`, `dataforseo-breaker.test.ts`, `dataforseo-spend-guard.test.ts` (el transporte no deja gastar sin contabilizar), `dataforseo-family-check-parity.test.ts`. Sanity live: `scripts/growth/_sanity-seo-provider-spend.ts`, `_sanity-seo-entitlement.ts`.

## §5 Consumers

Importadores directos de `@/lib/ai/dataforseo*`:
- `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts` — **único consumer productivo hoy**. Provider AEO `google_ai_overview` sobre DataForSEO Google AI Mode Live Advanced (`GOOGLE_AI_OVERVIEW_PROVIDER_MODEL = 'dataforseo/google-ai-mode-live-advanced'`); usa `isDataForSeoConfigured` + `postDataForSeoSerpLiveAdvanced` + `DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT`; degrada honesto `skipped:no_ai_overview_block`; manda `language_code='en'` (AI Mode English-only); persiste `dataforseo_cost_usd/_endpoint/_tasks_count/_status_code` en `usage`.
- `src/lib/growth/ai-visibility/__tests__/google-ai-overview-adapter.test.ts` — tests del adapter.
- `src/lib/growth/seo/provider-spend.ts` y `register-provider-spend.ts` — solo importan el tipo `DataForSeoFamily` / el setter del hook (§4).

Menciones sin llamada (comentarios/contratos): `src/lib/growth/seo/{entitlement,contracts,keyword-opportunities-reader}.ts`, `src/lib/growth/seo/gap/read-seo-aeo-gap.ts`, `src/config/entitlements-catalog.ts:2189`, `src/lib/growth/ai-visibility/contracts.ts`, `cost.ts`.

⚠️ **Delta 2026-08-07 — `labs/onpage` YA tienen consumer runtime productivo** (esta sección decía lo contrario hasta TASK-1303/1304): `src/lib/growth/seo/rank-capture.ts` (cron `ops-seo-rank-capture`, 05:00 CLT en ops-worker) y `src/lib/growth/seo/site-audit/**`. `backlinks`/`domain` siguen sin consumer productivo.

## §5b El write que compromete gasto SIN llamar al proveedor (TASK-1308)

`src/lib/growth/seo/track-keywords.ts` — `trackKeywords()` / `untrackKeywords()`. **No llama a DataForSEO ni escribe una sola fila del ledger**, y por eso es el consumer más peligroso del contrato de costo:

🔴 **Seguir una keyword es un COMPROMISO DE GASTO DIFERIDO, no un INSERT.** El write es gratis; lo que cuesta es el **ciclo siguiente**: `rank-capture.ts` le paga a DataForSEO por cada keyword vigente del set, todos los días, hasta que alguien la deje de seguir. El gate de costo (`enforceSeoRunEntitlement`) protege la CORRIDA que gasta, no la decisión que la agranda — un `capability check` sobre "Seguir" ve una acción barata. De ahí las defensas que este command tiene y un INSERT normal no:

| Defensa | Por qué |
|---|---|
| **Techo gobernado por target** — `GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET` (default 200), `resolveTrackedKeywordCapacity` | El freno del gasto futuro. El exceso se rechaza con outcome tipado `capacity_exceeded`, **nunca en silencio ni con excepción**: el operador tiene que poder leer "el set está lleno" y decidir qué sacar. |
| **Entitlement per-ORG `seo_v1`** vigente | Mismo chokepoint conceptual que `enforceSeoRunEntitlement`, pero **sin consumir allowance ni budget**: seguir no gasta hoy, gasta mañana. Cobrar allowance de site-audit por seguir una keyword sería cobrar dos veces por cosas distintas. |
| **Outcome POR keyword** (`tracked\|already_tracked\|capacity_exceeded\|invalid`), nunca booleano | Un caller que sólo ve `ok: true` no distingue "agregué 3" de "rebotaron 40 contra el techo". |
| **Idempotencia + `FOR UPDATE OF`** | Un bucle de reintentos o dos agentes concurrentes no deben poder sobrepasar el techo. |
| **`untrackKeywords` en el mismo PR** | Sin reverso el compromiso es permanente. Es **append-only**: cierra `effective_to`, **NUNCA borra** (la tabla tiene trigger anti-DELETE de TASK-1299 e índice único parcial `(keyword_set_id, keyword) WHERE effective_to IS NULL`). |

🔴 **Hallazgo `clock_timestamp()` vs `NOW()` (gate TASK-893).** Cerrar una membresía con `NOW()` produce `effective_to = effective_from` y revienta el CHECK `effective_to > effective_from` (SQLSTATE 23514): `NOW()` devuelve el timestamp de **inicio de la transacción**, y el `>` es estricto. `clock_timestamp()` avanza dentro de la transacción. **Los mocks de Vitest daban el bug por bueno**; lo encontró el sanity contra PG real (`scripts/growth/_sanity-task-1308-track-keywords.ts`, 16 checks). Caso ejemplar del gate de `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`: un reader/command nuevo se ejercita al menos una vez contra PG real antes de mergear.

Migración `20260807173706557_task-1308-keyword-set-member-provenance.sql`: `created_by` + `source` en `seo_keyword_set_members` (nullable, sin backfill, CHECK de vocabulario cerrado). Un write gobernado con tres consumers necesita rastro de **quién comprometió el gasto**.

**Contratos programáticos (Full API Parity, los tres sobre el MISMO command):** app-lane `POST /api/admin/growth/seo/keywords/{track,untrack}` (capability `growth.seo.target.configure`) · lane ecosystem `POST /api/platform/ecosystem/growth/seo/keywords/{track,untrack}` (**sólo bindings de scope `internal`** — un binding cliente lee sus oportunidades pero no hace crecer su propia factura) · tools MCP `track_seo_keywords` / `untrack_seo_keywords`, federadas al gateway bajo el scope de dominio `efeonce.mcp.seo.write`. **La frontera de grant es load-bearing y vive en la skill `efeonce-mcp-platform`**: ese scope existe en Entra pero NO está cableado al cliente PKCE público compartido, y nunca debe estarlo.

## §6 Secretos / env

- `DATAFORSEO_API_LOGIN` — env var plana (login Basic auth). En Vercel staging+production; en ops-worker viene del **GitHub Actions secret** `DATAFORSEO_API_LOGIN` inyectado por `.github/workflows/ops-worker-deploy.yml:333` y solo se appendea al deploy si viene poblado (`services/ops-worker/deploy.sh:572-574`).
- `DATAFORSEO_API_PASSWORD` / `DATAFORSEO_API_PASSWORD_SECRET_REF` — resuelto con `resolveSecret({ envVarName: 'DATAFORSEO_API_PASSWORD' })` (`dataforseo.ts:74,84`), o sea el patrón `*_SECRET_REF` server-side. Secret GCP: **`greenhouse-dataforseo-api-password`** (default en `services/ops-worker/deploy.sh:545`; `ensure_secret_accessor_binding` en `:575`; SA `greenhouse-portal@` con `secretAccessor`). `.env.example:14-15` declara ambos vacíos. NUNCA poner el password en `.env.local` (manual `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md:77`).
- Riesgo residual documentado: la credencial vino de una captura/chat compartida; la rotación pre-producción sigue pendiente (TASK-1265 changelog, TASK-1341 external coordination).
- Drift conocido: Vercel env NO basta — el grader async corre en Cloud Run `ops-worker`; sin login en la revisión viva, `google_ai_overview` degrada `skipped:missing_secret` (TASK-1341, delta 2026-07-05 del grader arch doc).

## §7 Invariantes de arquitectura (doc + sección)

`docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`:
- **§1.1 Boundary duro:** NUNCA computar citabilidad AEO desde rank SEO ni viceversa; NUNCA mergear tablas `grader_*` con `seo_*` (cruce en memoria por `organization_id`, jamás FK/JOIN/VIEW cross-motor); **NUNCA reads SEO live-per-view contra DataForSEO en el render de un dashboard** (reads pegan a snapshots PG); SIEMPRE GSC = verdad de primera parte (●) y DataForSEO = estimado de mercado (◑), lentes complementarias nunca promediadas.
- **§1.2:** el cliente `src/lib/ai/dataforseo.ts` se **amplía, nunca se duplica/forkea**.
- **§6 DataForSEO governance:** un cliente, familias como config; `seo_provider_spend_daily` es la FUENTE ÚNICA de presupuesto (el contador lo escribe el transporte); atribución obligatoria por tipo (4 familias exigen `organizationId`, throw si no hay recorder); breaker por familia; honest degradation (audit con 0 findings ≠ crawl fallido; nunca fabricar snapshot); OnPage async va a ops-worker, no a route handler Vercel. Costos verificados 2026-06: Labs ~$0.0001/item + ~$0.01/task; OnPage $0.000125/pág (JS render $0.00125, Lighthouse $0.00425); Backlinks $0.02/req + $0.00003/fila.
- **§7:** cada capacidad = primitive `src/lib/growth/seo/**` reusable UI+Nexa+MCP; lane ecosystem implementada (TASK-1645, `/api/platform/ecosystem/growth/seo/*`).
- **§8:** materialización vía Cloud Scheduler + ops-worker (nunca Vercel cron); rank diario idempotente por `capture_date`; `GROWTH_SEO_ENABLED` lo leen DOS runtimes y el flip es de TRES pasos (worker + Vercel + scheduler).
- **§9:** entitlement per-ORG vía `module_assignments` (`seo_v1`), NO por rol (lección TASK-1248); capabilities `growth.seo.*`; chokepoint `enforceSeoRunEntitlement`.
- **§13 Riesgos:** #1 costo (quota cap por org, batched Labs, GSC-first, signal `seo.provider.cost_over_budget`); #3 nunca ampliar el candado (allowlist de 5 familias nombradas); #4 secreto compartido con AEO mitigado por breakers+budgets por familia.
- Regla auto-load `.claude/rules/growth-seo.md`: todo write provider-facing pasa por `enforceSeoRunEntitlement`; todo reader nuevo del dominio expone su MCP tool **en el mismo PR** (mandato 2026-08-05, lane ecosystem).

`docs/architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md` (ADR, EPIC-022): decisión #4 "ampliar con allowlist cerrado, no aflojar el candado"; rechazados: un cliente por familia, rank tracking live-per-view; #8 honestidad de datos (badges ●/◑, nunca `$0` fantasma); #9 scheduling async.

`docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`: fuente gobernada = DataForSEO AI Mode vía cliente canónico, sin scraping directo de Google ni llamadas desde browser/UI (`:1410`); flag `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED` default OFF (`:1412`); HTTP 200 sin bloque AI = `skipped:no_ai_overview_block`, nunca `succeeded` vacío, conservando costo por request (`:1413`); AI Mode English-only → `language_code='en'` (`:1414`); **Delta 2026-07-05 (§TASK-1341):** el run async corre en ops-worker → las creds deben existir AHÍ; guard pendiente para no desplegar AIO ON sin login + secret ref (`:463-481`).

Docs funcionales: `docs/documentation/growth/modulo-seo-search-visibility-360.md` (chokepoint + familias aisladas por breaker, `:51,114`), `docs/documentation/growth/ai-visibility-grader.md`, manual `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`.

## §8 Tasks relacionadas

EPIC-022 (SEO) + EPIC-020 (grader). ⚠️ Esta sección se escribió as-of 2026-08-06 y quedó desactualizada en un día — **verifica la carpeta real (`docs/tasks/{to-do,in-progress,complete}/`) antes de citar un estado**, no esta lista.

**Complete:** `TASK-1265` (provider `google_ai_overview` sobre DataForSEO AI Mode, activado en staging; EPIC-020) · `TASK-1299` (schema `greenhouse_growth` time-series foundation) · `TASK-1300` (**family registry DataForSEO**: allowlist 5 familias + breaker + spend ledger) · `TASK-1301` (capabilities `growth.seo.*` + entitlement per-org + `enforceSeoRunEntitlement`) · `TASK-1302` (GSC daily snapshot materializer + keyword opportunities) · `TASK-1305` (SEO↔AEO gap derived read) · `TASK-1645` (ecosystem lane + MCP tools, LIVE prod 2026-08-06) · **`TASK-1303`** (rank capture `labs`/`serp` por target×keyword, cron `ops-seo-rank-capture` 05:00 CLT en ops-worker — cerró el spend fence y el import de `register-provider-spend`) · **`TASK-1304`** (site audit OnPage queue+poll) · **`TASK-1306`** (cockpit SEO: shell, tabs, viewCode `administracion.growth_seo`, Space picker) · **`TASK-1307`** (rank/URL performance) · **`TASK-1308`** (keyword opportunities UI + **el primer write del dominio**: `trackKeywords`/`untrackKeywords`, ver §5b).

**In-progress:** `TASK-1631` (cliente OAuth con grant revocable por tenant y capability — **es lo que desbloquea el uso real de las tools de escritura**, hoy federadas y fail-closed).

**To-do:** `TASK-1311` (AEO citation attribution URL-level) · `TASK-1312` (topic clusters) · `TASK-1313` (page/cluster visibility 360 read) · `TASK-1314` (pillar-cluster health, keyword gap Labs) · `TASK-1317` (E-E-A-T scorecard) · `TASK-1341` (**guard runtime DataForSEO/AIO en ops-worker** — no desplegar AIO ON sin login+secret ref; EPIC-020) · `TASK-1411` (Shutterstock — cita `dataforseo.ts` como "el precedente exacto" de adapter de tercero) · `TASK-1657` (causa raíz de los dos defectos de plataforma que TASK-1308 parcheó local: mismatch de hidratación por `useId` en surfaces adaptativas + findings de `ui:code-lint` en charts a canvas).

## §9 Convenciones de skill dual Claude/Codex

Estructura observada en `greenhouse-documentation-governor` (existe en ambos árboles):

**Claude** (`.claude/skills/<name>/SKILL.md`):
- Un solo archivo `SKILL.md` (repo tiene legacy lowercase `skill.md` en algunas — p.ej. `codex-skill-creator/skill.md`; para skills nuevas preferir `SKILL.md` oficial).
- Frontmatter YAML: `name`, `description` (larga, con triggers "Use after/when..."), y opcionales oficiales usados en el repo: `argument-hint`, `user-invocable`, `disable-model-invocation`. Ejemplo real: el governor Claude agrega `argument-hint: '[implemented change, task id, docs/closure concern]'`.
- Sin carpeta `agents/`. Soporte opcional: `references/`, `scripts/`.
- Autoría gobernada por `.codex/skills/claude-skill-creator/SKILL.md`: no inventar campos de frontmatter; `SKILL.md` <500 líneas, detalle pesado a supporting files; decisión deliberada de invocación (auto-load vs `disable-model-invocation: true` para workflows con side effects vs `user-invocable: false` para background-only).

**Codex** (`.codex/skills/<name>/`):
- `SKILL.md` (mismo cuerpo markdown; frontmatter mínimo **solo `name` + `description`** — sin `argument-hint`) **+ `agents/openai.yaml`** (recomendado), con shape:
  ```yaml
  interface:
    display_name: "..."
    short_description: "..."
    default_prompt: "Use $<skill-name> to ..."
  policy:
    allow_implicit_invocation: true
  ```
- Opcionales: `references/`, `scripts/`, `assets/`. Autoría gobernada por `.claude/skills/codex-skill-creator/skill.md` (estructura canónica mínima = `SKILL.md`; recomendada = + `agents/openai.yaml`).
- En este repo el cuerpo del SKILL.md se mantiene esencialmente idéntico entre ambos árboles; las diferencias son (a) frontmatter (Claude lleva los campos de invocación; Codex solo name/description), (b) `agents/openai.yaml` solo en Codex, (c) naming del entrypoint (Claude tiene legacy `skill.md` minúscula en algunas skills viejas).

**Notas de precisión para la capa "contrato Greenhouse" de la skill:** el hook de spend está registrado en el ops-worker (`services/ops-worker/server.ts`) desde TASK-1303, **no en Vercel** — un route handler que llame una familia SEO con org lanza en la primera llamada; `postDataForSeoSerpLiveAdvanced` es contrato congelado del AEO; `checkDataForSeoConnection` no pasa por allowlist/breaker a propósito; y el flip de `GROWTH_SEO_ENABLED` es multi-runtime (worker + Vercel + scheduler).

**Nota de precisión sobre el gasto (TASK-1308):** el gate de costo protege la corrida que gasta, **no la decisión que la agranda**. Al auditar costo DataForSEO, mira también `track-keywords.ts` (§5b): ahí se decide cuántas keywords paga el cron de mañana, y ese archivo no aparece en ningún grep de `postDataForSeoTask`.
