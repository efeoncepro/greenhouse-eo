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
| `DataForSeoSpendRecorder` | `(input: { organizationId; family; cost; consumer }) => Promise<void>` | hook de cost-tracking inyectable; `consumer` (TASK-1696) lo declara el caller y el transporte sólo lo transporta (`dataforseo.ts:110-118`) |
| `setDataForSeoSpendRecorder(recorder \| null)` | registra el hook a nivel de módulo (`dataforseo.ts:118`) | lo llena el dominio growth, no el cliente |
| `DATAFORSEO_SPEND_CONSUMERS` / `DataForSeoSpendConsumer` | `['seo','aeo'] as const` — vive en `dataforseo-families.ts` | TASK-1696: QUIÉN consumió el dólar. Vive junto al registry porque lo necesitan los dos extremos (transporte + writer del ledger); ponerlo en growth invertiría la dirección de dependencia que TASK-1300 fijó (growth→ai, nunca al revés). **NO es la familia**: la familia dice QUÉ se compró, el consumidor PARA QUÉ SERVICIO. Vocabulario CERRADO espejado por CHECK en la base, con test de paridad |
| `DataForSeoTaskInput` | union: `{ family: 'serp', endpoint, tasks: DataForSeoSerpTask[], timeoutMs?, organizationId?, consumer: REQUIRED }` \| `{ family: Exclude<...,'serp'>, endpoint, tasks: DataForSeoTaskPayload[], timeoutMs?, organizationId: REQUIRED, consumer: REQUIRED }` | el tipo hace imposible el gasto SEO sin org (`dataforseo.ts:135-160`); `consumer` es requerido en **las dos** variantes desde TASK-1696 — obligatorio también en las 4 familias SEO, donde hoy no hay ambigüedad, para que la próxima familia (p. ej. `ai_optimization`) no herede un default que ya no le corresponde |
| `postDataForSeoTask(input)` | `(DataForSeoTaskInput) => Promise<DataForSeoSerpResult>` | **transporte canónico único**: fetch POST + Basic auth + timeout (default 35s) + breaker + registro de costo (`dataforseo.ts:156`) |
| `postDataForSeoSerpLiveAdvanced({ endpoint, tasks, timeoutMs? })` | contrato histórico del AEO; delega en `postDataForSeoTask` con `family:'serp'` + `consumer:'aeo'` fijo; **NO agregar parámetros** — consumers nuevos usan `postDataForSeoTask`. 🔴 TASK-1696: **puerta que NO atribuye gasto** — no acepta `organizationId`, así que lo comprado por acá queda FUERA del ledger aunque el perfil tenga organización. Su único consumer productivo (el adapter de AI Mode del grader) migró a `postDataForSeoTask`; el guard `src/lib/ai/__tests__/dataforseo-legacy-wrapper-guard.test.ts` rompe el build si otro módulo productivo vuelve a comprar por ahí |
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
| `serp` | `/v3/serp/` | `false` **POR DISEÑO, ya no deuda (TASK-1696)**: la atribución existe (`ProviderAdapterContext` transporta la org derivada de `grader_profiles.organization_id` y el adapter la pasa), pero no se puede EXIGIR — el grader corre sobre prospectos públicos sin organización y ponerlo en `true` rompería el camino público del lead magnet. El gasto sin org queda contado como **no atribuible** en `growth.dataforseo.spend_ledger_drift`, nunca invisible | Familia **COMPARTIDA**: rank capture del módulo SEO + adapter de AI Mode del grader AEO — por eso `consumer` es requerido en el transporte |
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
- Tabla: `greenhouse_growth.seo_provider_spend_daily`; UPSERT con **incrementos atómicos en SQL** (`col = col + EXCLUDED.col`), nunca read-modify-write. Costos no finitos/≤0 se ignoran (no filas de gasto cero).
- 🔴 **TASK-1696 — clave única de SEIS columnas con `NULLS NOT DISTINCT`:** `(organization_id, family, spend_date, consumer, cost_basis, price_table_version)`. `consumer` (`seo|aeo`) responde QUIÉN gastó; `cost_basis` (`invoiced|estimated`) + `price_table_version` responden de qué TIPO es el dólar, acoplados por CHECK en las dos direcciones (`estimated` exige versión; `invoiced` la prohíbe). Es **UN ledger, nunca dos** — una factura de proveedor es una sola y dos tablas del mismo hecho serían dos verdades; lo que se separa es el **resolver de presupuesto**, no la tabla. La clave de 6 es forward fix de un defecto encontrado **ejercitando el SQL contra PG**, no leyéndolo: con la clave de 4, un dólar `estimated` colisionaba con la fila `invoiced` del mismo día/familia/consumidor y entraba por el `DO UPDATE`, que suma el monto pero **NO toca `cost_basis`** — quedaba reetiquetado como facturado, sin error y sin rastro. `NULLS NOT DISTINCT` permite meter `price_table_version` (NULL en las facturadas) a la clave sin que el UPSERT deje de acumular. Migración `20260828015655472` + forward fix `…task-1696-seo-provider-spend-cost-basis-in-key`; el down aborta si ya hay filas `consumer='aeo'` (fusionar dos consumidores en una fila perdería la dimensión en silencio). Sanity live: `scripts/growth/_sanity-provider-spend-consumer.ts`.
- 🔴 **`buildSeoProviderSpendMonthlySumSql` filtra `consumer = 'seo'`** — no es un filtro opcional, es lo que hace que el fragmento siga respondiendo la pregunta que dice responder: sin él, el primer dólar que el grader AEO atribuya a una organización se descontaría del presupuesto SEO de ESE cliente y el gate empezaría a bloquear capturas de rankings con un `budget_exhausted` que no se parece a su causa. El presupuesto AEO es `resolveAeoBudget` (§4b).
- **Readers del ledger:** `readSeoProviderSpendByFamily` agrega TODOS los consumidores y bases de costo — sirve para "cuánto le pagamos al proveedor por esta organización" (la factura), **jamás** para una pregunta de presupuesto ni para una cifra que se le muestre a alguien. Para eso está `readSeoProviderSpendByConsumer` (TASK-1696), que corta por consumidor + base de costo y **nunca colapsa `invoiced` y `estimated` en un total único** (un total mezclado no es un dato degradado, es un dato falso). Lo consumen el lane ecosystem `/api/platform/ecosystem/growth/seo/provider-spend` y su tool MCP `get_seo_provider_spend`, **sólo bindings `internal`** (404 anti-oracle, no 403): el gasto es lo que a Efeonce le CUESTA servir a un cliente, no consumo del cliente.
- Migración con CHECK de familia: `migrations/20260805194114467_task-1300-seo-provider-spend-daily.sql`; el test `src/lib/ai/__tests__/dataforseo-family-check-parity.test.ts` fuerza paridad TS↔CHECK (agregar familia sin migrar el CHECK rompe el build — sino cada llamada gastaría real, el INSERT fallaría y el gate leería cero para siempre).

**Registro (side-effect import):** `src/lib/growth/seo/register-provider-spend.ts` — `import '@/lib/growth/seo/register-provider-spend'` conecta `recordSeoProviderSpend` al hook `setDataForSeoSpendRecorder`. **TODO runtime que llame DataForSEO con org debe importarlo en su entrypoint**; si falta, `postDataForSeoTask` LANZA en la primera llamada con org. Estado as-of 2026-08-27: lo importan el **ops-worker** (`services/ops-worker/server.ts`, entrypoint del rank capture y del site audit), los scripts de sanity/seed **y, desde TASK-1696, el adapter `google-ai-overview-adapter.ts` por import de efecto**. Ese import es el único del dominio AEO hacia `growth/seo` y es deliberado: el ledger ES compartido por transporte entre los dos dominios, y el grader **también corre inline en Vercel** (`/api/admin/growth/ai-visibility/runs` → `runGraderDiagnostic` → `executeGraderRun`), donde el throw habría caído en el `catch` del adapter y se habría convertido en una observación `failed` — perdiendo AI Mode justo para los perfiles de cliente que la atribución existe para cubrir, sin que ningún test lo notara. O sea: ya no vale el atajo "Vercel no lo importa".

**Gate de presupuesto:** `src/lib/growth/seo/entitlement.ts` — `enforceSeoRunEntitlement(organizationId, { estimatedCostUsd? }?, env?)` es el **ÚNICO** gate de costo DataForSEO (chokepoint, riesgo §13.1). Cadena: entitlement (`module_assignments`, `module_key='seo_v2'` — la clave canónica desde el cutover de `TASK-1677`, 2026-08-09; `SEO_MODULE_KEY` para escritura y `SEO_MODULE_KEYS_READ` para lectura, ambos en `entitlement.ts`. `seo_v1` sigue existiendo como fila en `modules` (append-only) pero **ya no se lee**: consultar `seo_v1` para decidir entitlement da un falso `no_entitlement` en cualquier organización provisionada después del cutover) → expiración → allowance (site-audits/mes) → budget (USD/mes). `blockedReason ∈ {no_entitlement, expired, quota_exhausted, budget_exhausted}`. Fuente ÚNICA de gasto = `seo_provider_spend_daily` (sumarle el `provider_cost` de snapshots contaría doble). Knobs env con default: `GROWTH_SEO_{CONTRACTED|TRIAL|PILOT}_{AUDIT_RUNS_PER_MONTH|MONTHLY_BUDGET_USD}` (defaults: 8/1/2 runs; 50/2/10 USD — `entitlement.ts:103-110`). **Límite conocido documentado** (`entitlement.ts:288-307`): el gate se consulta UNA vez y el gasto se acumula DESPUÉS (sin reserva/claim; batch de 120 keywords sobregiró 3× un budget trial); mitigaciones del caller: `estimatedCostUsd` del batch completo, re-consultar cada K llamadas, acotar el batch; `quota_exhausted` NO aplica a rank capture (no crea audit runs). El spend fence real es trabajo de TASK-1303.

**Costo AEO (aparte):** `src/lib/growth/ai-visibility/cost.ts` — `estimateObservationCostUsd`/`estimateRunCostUsd`; para `google_ai_overview` el costo NO es por tokens: se lee `usage.dataforseo_cost_usd` que el adapter persiste desde `result.cost` (`cost.ts:46-50`). ⚠️ **Ya NO es cierto que el carril AEO no escriba en `seo_provider_spend_daily`** (lo era mientras el adapter compraba por el wrapper histórico): desde TASK-1696 el adapter compra por `postDataForSeoTask` declarando `consumer:'aeo'` + la organización del perfil cuando existe, así que su gasto entra al ledger.

**§4b Presupuesto AEO en dólares (TASK-1696):** `resolveAeoBudget` (`src/lib/growth/ai-visibility/budget.ts`) — resolver APARTE de `resolveAeoEntitlement`, que cuenta CORRIDAS y no acota dólares (20 runs/mes × el techo por run del modo `full` = USD 40/mes/org que nadie miraba). Lee la MISMA tabla con `consumer='aeo'` + `cost_basis='invoiced'`. 🔴 **Anti doble conteo:** `grader_runs.estimated_cost_usd` YA contiene los mismos dólares de DataForSEO que el ledger registra como facturados, así que la query **resta la porción DataForSEO de cada run** — lo estimado queda siendo lo que de verdad es, el gasto de los LLM propios. Sumar los dos lados crudos habría agotado el presupuesto a la mitad, en silencio. El gate **nace en shadow**, con dos flags independientes y **ambos default OFF**: `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED` (computa `wouldBlock`, registra, alimenta la señal, no bloquea) y `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED` (subordinado: sólo con las dos en ON se rechaza con `budget_exhausted`). Son dos porque el camino público del lead magnet comparte el motor: un tope mal calibrado no degrada un tablero, corta captación. **Dual-runtime** Vercel + ops-worker, declarativos en `services/ops-worker/deploy.sh`. Topes por tier = knobs **NO-flag**: `GROWTH_AI_VISIBILITY_{CONTRACTED,PILOT,TRIAL}_MONTHLY_BUDGET_USD` (60/10/3), holgados a propósito para que `wouldBlock` mida la realidad y no la restricción.

**§4c Señales de gasto (TASK-1696):** `growth.dataforseo.spend_ledger_drift` (`data_quality`, steady 0 — llamadas cobradas que no llegaron al ledger, separando drift atribuible de no atribuible) · `growth.ai_visibility.observation_yield` (`data_quality`, con corte POR PROVEEDOR: el promedio agregado esconde a un proveedor caído) · `seo.provider.cost_over_budget` (`cost_guard`, steady 0; avisa al 80% del tope y escala al 100%). Esta última la citaban **nueve tasks** como mitigación del riesgo #1 del módulo y no existía — la atribución era circular, cada una decía que la materializaba otra. Entra acá porque NECESITA la dimensión de consumidor: una alarma que sólo viera gasto `seo` sub-reportaría exactamente el gasto del grader recién atribuido.

**Tests:** `src/lib/ai/__tests__/` — `dataforseo.test.ts`, `dataforseo-families.test.ts`, `dataforseo-breaker.test.ts`, `dataforseo-spend-guard.test.ts` (el transporte no deja gastar sin contabilizar), `dataforseo-family-check-parity.test.ts`. Sanity live: `scripts/growth/_sanity-seo-provider-spend.ts`, `_sanity-seo-entitlement.ts`.

## §5 Consumers

Importadores directos de `@/lib/ai/dataforseo*`:
- `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts` — **único consumer productivo hoy**. Provider AEO `google_ai_overview` sobre DataForSEO Google AI Mode Live Advanced (`GOOGLE_AI_OVERVIEW_PROVIDER_MODEL = 'dataforseo/google-ai-mode-live-advanced'`); usa `isDataForSeoConfigured` + **`postDataForSeoTask`** (`family:'serp'`, `consumer:'aeo'`, `organizationId` del perfil cuando existe — migró del wrapper histórico en TASK-1696) + `DATAFORSEO_DEFAULT_AI_MODE_ENDPOINT`, e importa `@/lib/growth/seo/register-provider-spend` por efecto (§4); degrada honesto `skipped:no_ai_overview_block`; manda `language_code='en'` (AI Mode English-only); persiste `dataforseo_cost_usd/_endpoint/_tasks_count/_status_code` en `usage`.
- `src/lib/growth/ai-visibility/__tests__/google-ai-overview-adapter.test.ts` — tests del adapter.
- `src/lib/growth/seo/provider-spend.ts` y `register-provider-spend.ts` — solo importan el tipo `DataForSeoFamily` / el setter del hook (§4).

Menciones sin llamada (comentarios/contratos): `src/lib/growth/seo/{entitlement,contracts,keyword-opportunities-reader}.ts`, `src/lib/growth/seo/gap/read-seo-aeo-gap.ts`, `src/config/entitlements-catalog.ts:2189`, `src/lib/growth/ai-visibility/contracts.ts`, `cost.ts`.

⚠️ **Delta 2026-08-14 — `labs/onpage` YA tienen consumer runtime productivo** (esta sección decía lo contrario hasta TASK-1303/1304), y `labs` ya tiene **DOS**: `src/lib/growth/seo/rank-history-seed.ts` (semilla histórica) y `src/lib/growth/seo/keyword-market-data.ts` (TASK-1661, mensual — §5c). `onpage` = `src/lib/growth/seo/site-audit/**`; `serp` lo consume `rank-capture.ts` (cron `ops-seo-rank-capture`, 05:00 CLT en ops-worker). `backlinks` estrenó su primer consumer productivo el 2026-08-27 (carril `prospect`, §5d); `domain` sigue sin consumer — y ojo: el perfil de enlaces que Greenhouse usa para keywords **NO** sale de la familia `backlinks`, sale del `avg_backlinks_info` que `labs` regala en la misma respuesta ya pagada (§5c).

⚠️ **Delta 2026-08-28 — TASK-1699:** `rank-capture.ts` ganó un parser hermano (`parseSerpTopResults`, `src/lib/growth/seo/serp-top-results.ts`) que persiste el top-N COMPLETO del SERP ya pagado en `greenhouse_growth.seo_serp_top_results` a costo marginal cero (misma transacción, fallback que jamás pierde la medición de rank; ranura de clave `rank_absolute`, jamás `rank_group`); `readSerpCompetitorCandidates` propone competidores por recurrencia medida y el execute es `declareCompetitors` (TASK-1662) con confirmación humana. Detalle completo en el estado de runtime del SKILL.md.

## §5b El write que compromete gasto SIN llamar al proveedor (TASK-1308 · TASK-1659)

`src/lib/growth/seo/track-keywords.ts` — `trackKeywords()` / `untrackKeywords()`. **No llama a DataForSEO ni escribe una sola fila del ledger**, y por eso es el consumer más peligroso del contrato de costo:

🔴 **Seguir una keyword es un COMPROMISO DE GASTO DIFERIDO, no un INSERT.** El write es gratis; lo que cuesta es el **ciclo siguiente**: `rank-capture.ts` le paga a DataForSEO por cada keyword vigente del set, todos los días, hasta que alguien la deje de seguir. El gate de costo (`enforceSeoRunEntitlement`) protege la CORRIDA que gasta, no la decisión que la agranda — un `capability check` sobre "Seguir" ve una acción barata. De ahí las defensas que este command tiene y un INSERT normal no:

| Defensa | Por qué |
|---|---|
| **Techo gobernado por target** — `GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET` (default 200), `resolveTrackedKeywordCapacity` | El freno del gasto futuro. El exceso se rechaza con outcome tipado `capacity_exceeded`, **nunca en silencio ni con excepción**: el operador tiene que poder leer "el set está lleno" y decidir qué sacar. |
| **Entitlement per-ORG `seo_v2`** vigente | Mismo chokepoint conceptual que `enforceSeoRunEntitlement`, pero **sin consumir allowance ni budget**: seguir no gasta hoy, gasta mañana. Cobrar allowance de site-audit por seguir una keyword sería cobrar dos veces por cosas distintas. |
| **Outcome POR keyword** (`tracked\|already_tracked\|intent_changed\|capacity_exceeded\|invalid`), nunca booleano | Un caller que sólo ve `ok: true` no distingue "agregué 3" de "rebotaron 40 contra el techo". |
| **Idempotencia + `FOR UPDATE OF`** | Un bucle de reintentos o dos agentes concurrentes no deben poder sobrepasar el techo. |
| **`untrackKeywords` en el mismo PR** | Sin reverso el compromiso es permanente. Es **append-only**: cierra `effective_to`, **NUNCA borra** (la tabla tiene trigger anti-DELETE de TASK-1299 e índice único parcial `(keyword_set_id, keyword) WHERE effective_to IS NULL`). |

🔴 **Hallazgo `clock_timestamp()` vs `NOW()` (gate TASK-893).** Cerrar una membresía con `NOW()` produce `effective_to = effective_from` y revienta el CHECK `effective_to > effective_from` (SQLSTATE 23514): `NOW()` devuelve el timestamp de **inicio de la transacción**, y el `>` es estricto. `clock_timestamp()` avanza dentro de la transacción. **Los mocks de Vitest daban el bug por bueno**; lo encontró el sanity contra PG real (`scripts/growth/_sanity-task-1308-track-keywords.ts`, 16 checks). Caso ejemplar del gate de `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`: un reader/command nuevo se ejercita al menos una vez contra PG real antes de mergear.

Migración `20260807173706557_task-1308-keyword-set-member-provenance.sql`: `created_by` + `source` en `seo_keyword_set_members` (nullable, sin backfill, CHECK de vocabulario cerrado). Un write gobernado con tres consumers necesita rastro de **quién comprometió el gasto**.

### La intención declarada (TASK-1659) — el otro eje de la misma membresía

Migración `20260814221022082_task-1659-keyword-target-intent.sql`: `intent` (CHECK cerrado `target|opportunity`) + `intent_declared_by` + `intent_declared_at`, nullable y **sin backfill**, con un CHECK extra que **acopla autoría a declaración** (`intent` NULL ⇔ ambas columnas de autoría NULL). Vocabulario en runtime: `SEO_KEYWORD_INTENTS` / `isSeoKeywordIntent` en `contracts.ts`, para validar bodies que llegan por HTTP o MCP como `unknown`.

| Regla | Por qué |
|---|---|
| 🔴 **Sin backfill, sin default** — quien no declara escribe `NULL` | `NULL` significa "nadie la clasificó". Backfillear a `opportunity`, o defaultear en el command, afirma que alguien clasificó esas filas cuando nadie lo hizo, e **infla el KPI de oportunidades** con keywords que nadie miró. Declara el **caller**: la lente Oportunidades manda `intent: 'opportunity'` explícito. |
| 🔴 **Cambiar de intención NO es un `UPDATE`** — cierra la membresía vigente y abre otra | El dato que sostiene el reporte de avance no es "esta keyword es objetivo" sino "es objetivo **desde marzo**, y en marzo estaba en la 45". Un `UPDATE intent = 'target'` destruye exactamente eso. La tabla ya es append-only con ventanas: se reusa ese mecanismo. El cierre va **antes** del INSERT y en la MISMA transacción — el índice único parcial no admite dos vigentes. |
| 🔴 El cierre usa `clock_timestamp()`, **NUNCA `NOW()`** | Mismo hallazgo que `untrackKeywords` (ver arriba): la membresía puede haber nacido en esa transacción, y `NOW()` daría `effective_to = effective_from` → CHECK 23514. Los mocks no lo atrapan. |
| **El cambio de intención NO consume cupo** del techo | El conteo vigente no se mueve (cierra una, abre una), así que reclasificar sigue siendo posible **con el set lleno** — que es cuando más falta hace. Cobrarle techo bloquearía justo el caso útil. |
| **Ortogonal a `source`** | `source` = procedencia del write (`operator_ui\|nexa\|mcp\|seed\|backfill`); `intent` = motivo del compromiso. Fusionarlas daría un producto cartesiano ilegible. Tampoco es el `intent` de los candidatos de discovery, que es el **search intent estimado del proveedor**. |
| **`intentDeclaredBy` ≠ `actor`** cuando alguien declara por encargo | `actor` ejecutó el INSERT; `intentDeclaredBy` asumió el compromiso. Es el caso de un agente que agrega la keyword por pedido de una persona. Por defecto es `actor`. |
| Outcome propio **`intent_changed`** (con `intent` y `previousIntent`) | Reportarlo como `already_tracked` sería mentira —sí pasó algo— y como `tracked` sugeriría gasto nuevo, cuando el conteo vigente no se movió. |

El payload del outbox `growth.seo.keyword_set.updated` gana `intentChangedCount` + `declaredIntent`, y **se emite también cuando sólo cambió la intención**, aunque `activeKeywordCount` no se mueva: cerró una membresía y abrió otra, y emitir sólo por `inserted > 0` dejaría esa transición invisible para todo downstream. **Sin capability nueva** (reusa `growth.seo.target.configure`), sin scope nuevo en Entra, sin flag nuevo y sin señal de reliability nueva.

**Contratos programáticos (Full API Parity, los tres sobre el MISMO command):** app-lane `POST /api/admin/growth/seo/keywords/{track,untrack}` (capability `growth.seo.target.configure`) · lane ecosystem `POST /api/platform/ecosystem/growth/seo/keywords/{track,untrack}` (**sólo bindings de scope `internal`** — un binding cliente lee sus oportunidades pero no hace crecer su propia factura) · tools MCP `track_seo_keywords` / `untrack_seo_keywords`, federadas al gateway bajo el scope de dominio `efeonce.mcp.seo.write`. **La frontera de grant es load-bearing y vive en la skill `efeonce-mcp-platform`**: ese scope existe en Entra pero NO está cableado al cliente PKCE público compartido, y nunca debe estarlo.

## §5c El gasto que se repite por CICLO, no por fila (TASK-1661 — `labs` productivo)

`src/lib/growth/seo/keyword-market-data.ts` — `captureKeywordMarketData()` / `previewKeywordMarketDataCapture()` / lectura `readKeywordMarketData()`. Segundo consumer productivo de la familia `labs`, sobre `/v3/dataforseo_labs/google/keyword_overview/live` (volumen + dificultad + competencia + CPC + intención + `core_keyword` + `avg_backlinks_info` en UNA llamada; `bulk_keyword_difficulty` + `search_intent` por separado cuesta más y trae menos). Runtime: **ops-worker únicamente**, mensual (Cloud Scheduler `ops-seo-keyword-market-data`, `0 8 15 * *`, ACTIVO desde 2026-08-14), flag `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED` — en Vercel el flag es **inerte**, prenderlo ahí no hace nada.

🔴 **La frescura ES el contrato de gasto.** El proveedor refresca las métricas de keyword **una vez al mes** (ciclo Google Ads): re-comprar antes de 30 días paga de nuevo por el mismo número. Por eso el pre-check del patrón TASK-1303 aquí no es de **existencia** sino de **frescura** (`MARKET_DATA_FRESHNESS_DAYS = 30`), y una corrida repetida dentro del mismo ciclo cuesta **cero**. Al diseñar un consumer nuevo, la pregunta correcta no es "¿ya tengo esta fila?" sino "¿el proveedor ya cambió este número desde que lo compré?".

🔴 **Fuga encontrada en el smoke real y cerrada — TRES estados, no dos.** Cuando el proveedor responde OK pero **no tiene** la keyword, hay que **escribir igual la fila con NULLs**:

| Estado de la fila | Significa |
|---|---|
| **ausente** | nunca preguntamos |
| **presente con NULL** | preguntamos y el proveedor no tiene el dato |
| **presente con 0** | el proveedor dice demanda cero |

La primera versión no escribía nada en el caso del medio. Como el pre-check mira **filas**, esas keywords nunca quedaban "frescas" y **se re-compraban en CADA corrida, para siempre**: el smoke lo mostró cobrando USD 0.012 en una corrida que capturó cero. Los tests con mocks daban la versión con fuga por buena. Registrar el intento cierra el agujero y además es más honesto — "preguntamos y no hay" es un hecho que merece su fecha. Nota adyacente del mismo archivo: el `cost` del proveedor es **por batch**, así que se atribuye a la PRIMERA fila escrita del chunk y las demás van en 0 — sumar `provider_cost` fila a fila multiplicaría el gasto.

🔴 **`keyword_difficulty` NO deriva la barrera de enlaces.** Su fórmula tiene un piso duro y colapsa a 0 en SERPs es-LATAM (`pintura` MX: KD 0 con 135.000 búsquedas/mes) — con la KD, `pintura` y `pintura para piso` caían las dos en "Baja" pese a tener top-10 opuestos. La derivación canónica es **`deriveLinkBarrier()`** en este mismo archivo, sobre el `avg_backlinks_info` que viene **GRATIS en la respuesta ya pagada**, ponderando la **DIVERSIDAD de dominios referentes + page rank, NUNCA el conteo de enlaces** (`berel` tiene 5.125 backlinks contra 232 de `pintura` pero MENOS dominios: 30,4 vs 52,6 — ordenar por conteo invierte el ranking). `classifyLinkBarrier` fue **eliminada**: dos fuentes de la misma regla, y la vieja era la que engañaba. `unknown` es estado propio ("no capturado") y se pinta "Sin dato", jamás "Baja". Detalle de la fórmula oficial y el contraste link-based vs blended: `references/02-labs.md` §7 gotcha 8.

**Tabla multi-productor.** `greenhouse_growth.seo_keyword_market_data` es append-only (triggers de TASK-1299, `ON CONFLICT ... DO NOTHING`) y la escriben **cuatro productores vivos**: TASK-1661 desde `keyword_overview`, TASK-1664 (discovery), TASK-1776 (`ranked_keywords`) y, desde 2026-08-28, TASK-1662 (keyword gap: el `keyword_data` inline de `domain_intersection`) — los tres últimos con el `keyword_info` que ya viene **inline y pagado** en SUS respuestas, a costo 0 vía `persistKeywordMarketData`. **NUNCA abrir un segundo almacén del mismo hecho estimado** — el hecho es "qué dice el mercado sobre esta keyword en este mercado", no "qué devolvió mi endpoint".

🔴 **Mercado explícito (ISSUE-153).** Resolver el target de una organización pasa SIEMPRE por `src/lib/growth/seo/resolve-target.ts` (`resolveSeoTargetForMarket` / `resolveUnambiguousSeoTarget`); **NUNCA** SQL inline con `ORDER BY created_at DESC LIMIT 1` en un consumer — eso servía un país al azar sin declararlo, y con Berel operando CL+MX el mismo reader devolvía dos verdades distintas según el orden de inserción. Con varios mercados activos y sin selector el lane responde `409 multiple_markets` con la lista; toda respuesta declara `meta.servedMarket`.

**Contratos programáticos (Full API Parity):** lane ecosystem `GET /api/platform/ecosystem/growth/seo/keyword-market-data` + tool MCP **`get_seo_keyword_market_data`** federada en el gateway `mcp.efeonce.org` (lectura, scope `efeonce.mcp.read` — **sin scope nuevo en Entra**, por la cláusula 2 de la regla auto-load: el scope es por CLASE de blast-radius, no por capability). Señal de fiabilidad: `src/lib/reliability/queries/seo-market-data-freshness.ts` (con el flag OFF, cobertura parcial es lo ESPERADO, no una alerta).

## §5d Delta 2026-08-27 — carril `prospect` (TASK-1709): consumer nuevo, corrida única inline

`src/lib/growth/seo/prospect/**` — command `runProspectDiagnostic`. Diagnóstico SEO de prospecto (org NO cliente): **corrida ÚNICA inline en Vercel, JAMÁS scheduler/cron sobre prospectos** — nada recurrente toca `seo_prospect_diagnostics`. Estrena 4 endpoints que el repo no usaba, sobre familias YA permitidas (`labs`, `backlinks` — cero familias nuevas en el allowlist):

| Endpoint | Límites / params clave |
|---|---|
| `/v3/dataforseo_labs/google/ranked_keywords/live` | `item_types: ['organic','ai_overview_reference']`, limit 1000 |
| `/v3/dataforseo_labs/google/competitors_domain/live` | limit 25 |
| `/v3/backlinks/competitors/live` | limit 100, `exclude_large_domains: true` |
| `/v3/backlinks/domain_intersection/live` | `targets` = hasta 5 competidores, `exclude_targets` = el prospecto, limit 500 |

Reglas del carril (detalle en el delta canónico, no acá):

- 🔴 **Tope duro POR DIAGNÓSTICO, distinto del tope mensual per-org de §4:** `enforceProspectDiagnosticBudget` (`src/lib/growth/seo/entitlement.ts`) valida **ANTES de la primera llamada** contra el **forecast del CONJUNTO** de las 4 llamadas (~USD 0,205) — no llamada a llamada. Presupuesto efectivo = min(`GROWTH_SEO_PROSPECT_DIAGNOSTIC_CEILING_USD`, default 1.00; restante mensual de Efeonce). Corrida real medida: USD 0,1991 (skyairline.com CL, 2026-08-27).
- **Atribución = ADQUISICIÓN de Efeonce:** el ledger (§4) recibe el gasto en la org canónica `EO-ORG-0007`, resuelta server-side por public_id — **NUNCA** atribuido al prospecto (no es cliente, no tiene entitlement).
- **Pricing backlinks** agregado a `src/lib/growth/seo/provider-pricing.ts`: `BACKLINKS_TASK_SETUP_USD = 0.02`, `BACKLINKS_RESULT_ROW_USD = 0.00003`.
- **Idempotencia** por (dominio, mercado, idioma, día): repetir el mismo día devuelve lo existente con USD 0.
- **Cortesía:** cero `robots_txt_merge_mode: override`, cero `switch_pool`/`ip_pool_for_scan`, UA identificable; un bloqueo del sitio es un **HALLAZGO persistido**, no un obstáculo. La evidencia de sitio se delega al sustrato `@/lib/growth/site-substrate` — jamás fetch propio.
- **Salida sin juicio:** toda cifra es lente `estimated` con `captured_at` (CHECK de un solo valor); el contrato de salida NO tiene score/veredicto/benchmark/lift.

Delta canónico completo: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` → "## Delta 2026-08-27 — tier `prospect`".

## §5e Delta 2026-09-02 — ETV es metodología versionada, no default de proveedor

Semántica y evidencia contractual: `02-labs.md` §3.1. Impacto focal completo:
`docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md`.

DataForSEO confirmó 14 familias ETV-capable, corte global `2026-11-01T00:00:00Z`, ausencia de fallback legacy y
cero premium por improved. El repo llama nueve familias: seis familias/siete caminos consumen ETV, tres callers
lo ignoran y cinco familias no tienen caller. Ninguna escritura actual declara fórmula.

Contrato obligatorio para una implementación futura:

1. **Policy única, nunca flags dispersos.** Un módulo dueño de adquisición Labs resuelve
   `legacy_static_v1|improved_layout_clickstream_v2`, inventaría las 14 familias y sólo habilita las nueve con
   caller. Cada una queda `etv_consumed`, `etv_ignored` o `provider_supported_not_enabled`; un ignored no puede
   comenzar a proyectar ETV sin pasar a formula-aware. No inyectar el flag en el transporte genérico.
2. **Provenance persistida.** La fórmula viaja junto a ETV, traffic cost, cada punto histórico, top-N y prospecto.
   Como la respuesta no expone versión, guardar requested method, request UTC, policy version y effective method
   derivado. Para historia improved agregar `fully_recomputed` desde julio de 2026 o
   `calibrated_approximation` antes; para evidencia antigua sin request suficiente, `unknown_methodology`.
3. **Idempotencia formula-aware.** Las UNIQUE actuales de `seo_domain_overview_snapshots`,
   `seo_url_visibility_snapshots` y el diagnóstico diario omiten metodología. Antes de shadow/rebaseline, el
   ADR debe decidir si la versión entra a la clave/tabla productiva o si el experimento vive en un almacén
   separado. Un `ON CONFLICT DO NOTHING` que descarta una de las dos fórmulas invalida la comparación.
4. **Shadow fuera de la serie servida.** Legacy e improved se comparan con dos requests normales sobre la misma
   cohorte/mercado; improved no tiene premium, pero duplicar calls requiere autorización y tope. Clickstream data
   es independiente, combinable y conserva su multiplicador; no se activa para evaluar improved por defecto.
5. **Cutover explícito y deadline-bound.** Elegir rebaseline/breakpoint antes del corte. Después, `false` se ignora:
   legacy configurado falla antes del request y el safe mode congela capturas/serve la última serie coherente.
6. **Readers fail-honest.** Una fila sin versión queda `unknown_methodology`; una serie mixta se segmenta o se
   rechaza. Toda respuesta/API/MCP expone metodología y fecha de corte suficientes para explicar la cifra.
7. **GSC conserva autoridad.** El shadow mide error/correlación/dirección contra clicks first-party comparables,
   pero no promedia ETV con GSC ni convierte la promesa de "alineación" del proveedor en dato medido.
8. **Derivados se recalibran.** Traffic cost se recalcula como improved ETV × CPC por item y agregado. Revisar
   sumas, thresholds y membresía de relevant pages/subdomains. AIO reparte estimación entre dominios únicos
   citados: nunca rotularlo como tráfico observado por cita.

El contrato externo está confirmado; Sandbox y OpenAPI/changelog siguen pendientes no bloqueantes.

**Implementado el 2026-09-02 por `TASK-1805` (code complete, rollout pendiente).** Los ocho puntos de arriba tienen
mecanismo: policy pura `src/lib/growth/seo/etv-methodology/**` (`buildEtvMethodologyRequest`, matriz de 14 familias,
selectores `GROWTH_SEO_ETV_METHODOLOGY_VERSION`/`_READ_`), expand aplicado (columnas `etv_methodology_*`, UNIQUE
formula-aware junto a la legacy, guard de corte en la base; filas previas `legacy_static_v1` con evidencia
`contract_default_pre_cutoff`), siete writers explícitos, readers/API/MCP con `etvMethodology` y
`not_available_for_method`, señal `seo.etv_methodology.drift`, `/health` del worker con readback, evaluador dry-run
(`scripts/growth/_sanity-task-1805-etv-evaluator.ts`, `providerCalls=0`) y sanity del schema con rollback
(`_sanity-task-1805-etv-schema.ts`). **Foundation en producción desde el 2026-09-03 (release `5ec4cf769977`)** y el
**contract** (retirar UNIQUE legacy + defaults + CHECK del hecho del prospecto) **aplicado el 2026-09-03** por
`TASK-1806` (migración `20260903103858964_task-1806-etv-methodology-contract`): la coexistencia real legacy/improved
por sujeto/día ya está abierta. Shadow, rebaseline y cutover **ejecutados el 2026-09-03** por `TASK-1806` — estado
vigente y cifras en §5f.

## §5f Shadow legacy/improved (TASK-1806) — ejecutado, evaluado y CUTOVER a improved (2026-09-03)

**Estado vigente (2026-09-03).** La versión servida por writers, readers, API y MCP es
`improved_layout_clickstream_v2`: ops-worker vivo (revisión `ops-worker-00636-h6w`, `deploy.sh` con
`:-improved_layout_clickstream_v2` en `GROWTH_SEO_ETV_METHODOLOGY_VERSION` y `_READ_`, commit `d2ebdb8f3`;
`/health.etvMethodology` `source=env`, `valid=true`); Vercel `production`+`staging` con los dos selectores en
improved (valores verificados con `vercel env pull`); staging sirve improved tras redeploy
(`evidence=explicit_request`, `availableMethodologies=[improved, legacy]`, `comparability=single_methodology`);
producción Vercel efectiva al `READY` del release `bda12be7e33a-4bb99ca1-8077-451a-9611-5929f933a990` (run `33758619690`, manifest `released` 13:14Z, canary 13:15:26Z). Tratamiento histórico: **rebaseline
versionado** (`breakpointDate` null; `etv_historical_basis` `fully_recomputed` desde 2026-07 /
`calibrated_approximation` antes). `legacy_static_v1` queda **sólo como rollback pre-corte** (selectores a legacy en
Vercel prod+staging y en `deploy.sh` + redeploy/deploy; drill ejercitado en staging el 2026-09-03 sin borrar nada);
desde `2026-11-01T00:00:00Z` el rollback es safe mode. Un sujeto sin fila improved degrada
`not_available_for_method` hasta su próxima captura (cron 16/17).

**Corrida y evaluación.** Run `etvshadow-f3fef9b3c2a8` (2026-09-03 ~11:05Z, autorización explícita del operador),
`exact_ab`, 26/26 requests `20000`, USD 1,09536 real (forecast 1,14384), ledger `labs` cuadra. Contra GSC en
berel.com (30.898 clics/mes): improved err. rel. 49,4 % vs legacy 321,3 %; Jaccard 1,0 en
`relevant_pages`/`subdomains`; historia 2026-04..09 continua (salto 0,1 % vs mediana 8,1 %); efecto de escala
≈ −60 % (Berel −64,5 %, Comex −52 %); prospecto Comex −43,9 %. Decisión mecánica `hold` **sólo** por la regla §5.2
(dispara por construcción en un A/B exacto: el `organic.count` es idéntico); memo → `go_rebaseline`; el operador
aprobó rebaseline y cutover. Artefactos:
`docs/audits/seo/etv-shadow/2026-09-03-2026-09-03-preregistered-{results,decision-memo}.md`.

**Cohorte vigente v2** `scripts/growth/etv-shadow-cohorts/2026-09-03-preregistered-v2.json`: **cada sujeto se mide
APARTE por organización y mercado** — `efeoncepro.com` es Efeonce (CL, su propio GSC) y NUNCA viaja dentro de una
consulta de un cliente; la celda bulk v1 que lo metió en MX bajo la org de Berel quedó anulada como evidencia
(append-only) y `assertEtvShadowCohort` rechaza un bulk que mezcle organizaciones. Bulk en día distinto a la foto de
dominio (misma tabla/clave).

75 tests verdes en `src/lib/growth/seo/etv-methodology/`. Runbook operador-facing:
`docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md` (§«Comandos del shadow», «Resultado y
decisión ejecutada», «Cutover ejecutado», «Rollback vigente»). Preregistro (cohorte, umbrales, caps):
`docs/audits/seo/2026-09-03-dataforseo-improved-etv-shadow-preregistration.md`.

- **Qué CLI.** Ejecutor `scripts/growth/dataforseo-etv-shadow.ts` (`--dry-run` default; `--execute` compra;
  `--cohort`, `--artifact-dir`) sobre `src/lib/growth/seo/etv-methodology/shadow-runner.ts` (`preflightEtvShadow`,
  `runEtvShadow`; server-only). Cohorte committeada `scripts/growth/etv-shadow-cohorts/2026-09-03-preregistered.json`
  (13 celdas → 26 requests, forecast USD 1,14384). Evaluador `scripts/growth/dataforseo-etv-shadow-evaluate.ts`
  (`--cohort`, `--capture-date`, `--summary`, `--out`, `--json`; exige `GROWTH_SEARCH_CONSOLE_ENABLED=true` en su
  env) sobre `shadow-report.ts` (lector; GSC 28 días terminando D-2, ×30/28, sólo dominios propios) +
  `shadow-decision.ts` (puro; `PREREGISTERED_ETV_SHADOW_THRESHOLDS_2026_09_03`, una función por regla del §5;
  `decideEtvShadow` → `go_rebaseline | go_breakpoint | hold | no_go`) + `shadow-report-markdown.ts`.
- **Por qué NO reutiliza `captureDomainOverview`/`captureUrlVisibility`.** Esos comandos filtran por frescura contra
  el selector del ENV (legacy): la mitad legacy «fresca» se saltaría y el A/B quedaría como canary temporal. El
  ejecutor es la ÚNICA pieza del dominio autorizada a pedir `improved_layout_clickstream_v2` antes del cutover, y
  reutiliza sólo parsers/proyecciones y los writers canónicos de `TASK-1805`.
- **Orden improved → legacy por celda.** La señal `seo.etv_methodology.drift` compara el selector configurado con la
  ÚLTIMA request explícita del día; dejar legacy al final la mantiene en steady 0. No lo inviertas.
- **Qué NO hacer.** NUNCA `--execute` sin el gate `GROWTH_SEO_ETV_EVALUATOR_ENABLED=true` + allowlist + caps
  aprobados (30 requests / USD 2,00) exportados en el proceso del script; NUNCA prender esos knobs en Vercel ni en
  el ops-worker (la corrida es un proceso local acotado del operador, no un runtime); NUNCA describir un canary
  temporal como A/B (`exact_ab` exige ambas fórmulas por celda con inputs idénticos salvo el flag — el hash
  `taskHashWithoutFlag` lo prueba); NUNCA cambiar umbrales tras ver resultados (versión nueva del preregistro);
  NUNCA reutilizar la corrida para decidir cutover: rebaseline/breakpoint y cutover son sign-offs separados (ambos
  otorgados el 2026-09-03); NUNCA volver un selector a `legacy_static_v1` fuera de un rollback pre-corte aprobado, ni
  presentar la baja de ≈60 % como pérdida de tráfico.
- **Cómo leer `summary.json`.** `executed`, `reasons[]`, `totals` (`requests`, `costUsd`, `forecastUsd`, `aborted`,
  `abortReason`) y `requests[]` por request (`methodology`, `requested`/`providerEffective`/`requestedAt`,
  `taskHashWithoutFlag`, `status` `executed | already_captured | skipped_after_abort`, `statusCode`, `costUsd`,
  `latencyMs`, `persisted`, `prospectTraffic`, `errorCode`). `aborted=true` es evidencia conservada, no un fallo
  silencioso; el CLI además reconcilia el ledger `labs` del día antes/después (tolerancia 0,000001) y sale ≠ 0 si
  no cuadra.
- **Cómo leer `evaluation.json` / el Markdown** (`docs/audits/seo/etv-shadow/<capture-date>-<cohortId>-results.md`).
  `decision.decision` + `historicalTreatment` + `findings[]` + `rationale[]`; `inputsEquivalent`; `cells[]` por
  celda (validez y métricas, no sólo promedio); `cost` forecast vs real; `latency`; `declarations[]`. Efeonce CL es
  celda de borde: sólo hallazgos `info`, no veta ni certifica. `hold`/`no_go` son resultados (exit 0).

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
- **§9:** entitlement per-ORG vía `module_assignments` (`seo_v2` desde `TASK-1677`; sembrado como `seo_v1`), NO por rol (lección TASK-1248); capabilities `growth.seo.*`; chokepoint `enforceSeoRunEntitlement`.
- **§13 Riesgos:** #1 costo (quota cap por org, batched Labs, GSC-first, signal `seo.provider.cost_over_budget` — **materializada por fin en TASK-1696**, tras nueve tasks que la citaban sin que existiera); #3 nunca ampliar el candado (allowlist de 5 familias nombradas); #4 secreto compartido con AEO mitigado por breakers+budgets por familia.
- Regla auto-load `.claude/rules/growth-seo.md`: todo write provider-facing pasa por `enforceSeoRunEntitlement`; todo reader nuevo del dominio expone su MCP tool **en el mismo PR** (mandato 2026-08-05, lane ecosystem).

`docs/architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md` (ADR, EPIC-022): decisión #4 "ampliar con allowlist cerrado, no aflojar el candado"; rechazados: un cliente por familia, rank tracking live-per-view; #8 honestidad de datos (badges ●/◑, nunca `$0` fantasma); #9 scheduling async.

`docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`: fuente gobernada = DataForSEO AI Mode vía cliente canónico, sin scraping directo de Google ni llamadas desde browser/UI (`:1410`); flag `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED` default OFF (`:1412`); HTTP 200 sin bloque AI = `skipped:no_ai_overview_block`, nunca `succeeded` vacío, conservando costo por request (`:1413`); AI Mode English-only → `language_code='en'` (`:1414`); **Delta 2026-07-05 (§TASK-1341):** el run async corre en ops-worker → las creds deben existir AHÍ; guard pendiente para no desplegar AIO ON sin login + secret ref (`:463-481`).

Docs funcionales: `docs/documentation/growth/modulo-seo-search-visibility-360.md` (chokepoint + familias aisladas por breaker, `:51,114`), `docs/documentation/growth/ai-visibility-grader.md`, manual `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`.

## §8 Tasks relacionadas

EPIC-022 (SEO) + EPIC-020 (grader). ⚠️ Esta sección se escribió as-of 2026-08-06 y quedó desactualizada en un día — **verifica la carpeta real (`docs/tasks/{to-do,in-progress,complete}/`) antes de citar un estado**, no esta lista.

**Complete:** `TASK-1265` (provider `google_ai_overview` sobre DataForSEO AI Mode, activado en staging; EPIC-020) · `TASK-1299` (schema `greenhouse_growth` time-series foundation) · `TASK-1300` (**family registry DataForSEO**: allowlist 5 familias + breaker + spend ledger) · `TASK-1301` (capabilities `growth.seo.*` + entitlement per-org + `enforceSeoRunEntitlement`) · `TASK-1302` (GSC daily snapshot materializer + keyword opportunities) · `TASK-1305` (SEO↔AEO gap derived read) · `TASK-1645` (ecosystem lane + MCP tools, LIVE prod 2026-08-06) · **`TASK-1303`** (rank capture `labs`/`serp` por target×keyword, cron `ops-seo-rank-capture` 05:00 CLT en ops-worker — cerró el spend fence y el import de `register-provider-spend`) · **`TASK-1304`** (site audit OnPage queue+poll) · **`TASK-1306`** (cockpit SEO: shell, tabs, viewCode `administracion.growth_seo`, Space picker) · **`TASK-1307`** (rank/URL performance) · **`TASK-1308`** (keyword opportunities UI + **el primer write del dominio**: `trackKeywords`/`untrackKeywords`, ver §5b) · **`TASK-1659`** (intención declarada de la membresía — `intent` `target|opportunity` con autoría acoplada, sin backfill ni default, cambio = cerrar+abrir sin consumir cupo; ver §5b) · **`TASK-1661`** (keyword market data vía Labs `keyword_overview`; segundo consumer productivo de `labs`, cron mensual + tool MCP `get_seo_keyword_market_data` — ver §5c) · **`TASK-1670`** (hallazgos de **SITIO** en el site audit: acceso de crawlers IA por familia —retrieval `critical` ⊥ training `notice`—, bloqueo de **borde/WAF** con tipo propio, JSON-LD ausente y salud de sitemap; evaluados con el fetcher propio `@/lib/growth/site-substrate`, **cero gasto de proveedor**. 🔴 `code complete, rollout pendiente`: `GROWTH_SEO_SITE_FINDINGS_ENABLED` **OFF** en ops-worker hasta que `TASK-1671` despliegue la superficie — **el punto ciego sigue abierto hasta ese flip**) · **`TASK-1677`** (cutover del entitlement `seo_v1 → seo_v2`; la ventana de lectura de `seo_v1` quedó CERRADA en código el 2026-08-09 — ver §4).

**Follow-ups directos de TASK-1661** (escriben la MISMA tabla `seo_keyword_market_data`, con el `keyword_info` que ya viene pagado inline en sus respuestas — no abrir almacén nuevo) — **ambos ya aterrizaron**: `TASK-1664` (keyword discovery / seed expansion, productor vivo) · `TASK-1662` (keyword gap vía `domain_intersection`, productor #4 vivo desde 2026-08-28; rollout con el deploy del worker post-release — ver el estado de runtime del SKILL.md). `ISSUE-153` (mercado explícito) quedó cerrado con `resolve-target.ts`.

**In-progress:** `TASK-1631` (cliente OAuth con grant revocable por tenant y capability — **es lo que desbloquea el uso real de las tools de escritura**, hoy federadas y fail-closed).

**To-do:** **`TASK-1671`** (superficie de los hallazgos de sitio de `TASK-1670` en `/admin/growth/seo/audit` — **es el flip que cierra el punto ciego**, no el merge de 1670) · `TASK-1311` (AEO citation attribution URL-level) · `TASK-1312` (topic clusters) · `TASK-1313` (page/cluster visibility 360 read) · `TASK-1314` (pillar-cluster health, keyword gap Labs) · `TASK-1317` (E-E-A-T scorecard) · `TASK-1341` (**guard runtime DataForSEO/AIO en ops-worker** — no desplegar AIO ON sin login+secret ref; EPIC-020) · `TASK-1411` (Shutterstock — cita `dataforseo.ts` como "el precedente exacto" de adapter de tercero) · `TASK-1657` (causa raíz de los dos defectos de plataforma que TASK-1308 parcheó local: mismatch de hidratación por `useId` en surfaces adaptativas + findings de `ui:code-lint` en charts a canvas).

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
