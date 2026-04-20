# TASK-484 — FX Provider Adapter Platform

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `Despues de TASK-475, antes de TASK-466`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-484-fx-provider-adapter-platform`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir el sync de tipos de cambio de una implementación hardcoded USD↔CLP en una plataforma de **provider adapters** registry-driven. Suma cobertura automática para las monedas que TASK-475 dejó declaradas como `manual_only` (`CLF/COP/MXN/PEN`) via providers públicos gratuitos (Banxico SIE, TRM Colombia, SUNAT Perú, BCRP, Fawaz Ahmed, Frankfurter) sin romper el sync existente de USD↔CLP ni introducir workers nuevos: todo corre sobre Vercel cron + el mismo patrón que ya funciona hoy.

## Why This Task Exists

TASK-475 dejó la foundation de FX completa: matriz por dominio, policy enum, readiness contract, currency registry. Pero `currency-registry.ts` declara explícitamente `coverage: 'manual_only'` para `CLF/COP/MXN/PEN` — el pricing engine emite `fx_fallback — Crítico` cada vez que un Account Lead cotiza en esas monedas porque no hay tasas cargadas. Finance Admin tendría que hacer upsert manual todos los días, lo cual no escala.

La foundation previa decidió deliberadamente NO implementar providers nuevos porque primero había que asentar el contrato. Con ese contrato en producción, toca la fase operativa: **wirear los providers**. Sin esto, TASK-466 (multi-currency quote output) queda bloqueada porque no hay cómo enviar cotizaciones client-facing en MXN/COP/PEN sin cobertura FX auditable.

Adicionalmente, el código actual (`src/lib/finance/exchange-rates.ts`) tiene el par USD↔CLP hardcoded en `buildUsdClpRatePairs` + `syncDailyUsdClpExchangeRate` + `fetchMindicadorUsdToClp` + `fetchOpenExchangeRateUsdToClp`. Agregar una moneda nueva hoy exige tocar N lugares — exactamente lo que TASK-475 intentó evitar. Esta task refactoriza a un patrón plugin donde `CURRENCY_REGISTRY` declara provider + fallbacks y el orchestrator hace lo demás.

## Goal

- Transformar `src/lib/finance/exchange-rates.ts` en una plataforma de adapter plugins manteniendo USD↔CLP funcionando idéntico (cero regresión).
- Wirear 6 adapter providers nuevos (Banxico SIE, Socrata TRM, apis.net.pe SUNAT, BCRP, Fawaz Ahmed, Frankfurter) con tests unitarios, circuit breaker, timeouts y retries.
- Publicar 3 cron routes nuevas en Vercel que leen el registry y sincronizan por timezone del provider (COP 09:00 UTC, PEN 14:00 UTC, MXN 22:00 UTC).
- Flipear `CLF/COP/MXN/PEN` de `manual_only` a `auto_synced` sólo después de verificar 24–48h de sync estable en staging.
- Eliminar la emisión de `fx_fallback — Crítico` en el pricing engine para esas monedas cuando la tasa está fresca.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — spec canónica de la foundation; NO reabre ni expande `FinanceCurrency`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md` — patrón cron Vercel actual
- `docs/architecture/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` — higiene para el nuevo secret `BANXICO_SIE_TOKEN`

Reglas obligatorias:

- **NO expandir `FinanceCurrency`** — permanece `CLP | USD`. Cualquier expansion transaccional es otra task.
- **NO introducir un worker Cloud Run nuevo** — el sync FX es HTTP ligero (<5s), vive en Vercel como lo hace USD/CLP hoy. Workers quedan para TASK-483 (Commercial Cost Basis), no para FX.
- **`greenhouse_finance.exchange_rates` sigue siendo la única tabla de FX.** Dual-write PG + BQ se mantiene.
- **Cada adapter es autónomo**: timeouts (5s), retries (x3 exponential backoff para 5xx/network), circuit breaker (3 fallas en 5min → skip 15min). No retries para 4xx.
- **Upsert idempotente por `(from_currency, to_currency, rate_date)`**. Re-ejecutar el mismo día es no-op.
- **Transactional write**: PG upsert + outbox event en single transaction (patrón `upsertFinanceExchangeRateInPostgres` ya existe).
- **Secret nuevo `BANXICO_SIE_TOKEN`** publicado como scalar crudo (ver higiene en CLAUDE.md §Secret Manager Hygiene).
- **Flip `coverage` uno por vez**, verificando 24–48h de corridas exitosas antes del siguiente flip.
- **Validación por fila**: `rate > 0 && isFinite(rate)`. Rechazar + alertar vía outbox `finance.fx_sync.provider_failed` si el provider devuelve garbage.

## Normative Docs

- `docs/tasks/complete/TASK-475-greenhouse-fx-currency-platform-foundation.md` — foundation que esta task consume
- `docs/documentation/finance/monedas-y-tipos-de-cambio.md` — debe quedar actualizado al cierre
- `docs/tasks/to-do/TASK-466-multi-currency-quote-output.md` — consumer downstream; esta task lo desbloquea

## Dependencies & Impact

### Depends on

- TASK-475 (complete, foundation) — `currency-domain.ts`, `currency-registry.ts`, `fx-readiness.ts`, `/api/finance/exchange-rates/readiness` ya live en develop
- `src/lib/finance/exchange-rates.ts` — base del refactor
- `src/lib/finance/economic-indicators.ts` — para reusar la ingesta de UF (CLF wiring)
- `vercel.json` — cron schedule

### Blocks / Impacts

- TASK-466 (multi-currency quote output) — depende de que `CLF/COP/MXN/PEN` estén en `auto_synced` antes de permitir send client-facing en producción
- TASK-397 (management accounting FX/treasury) — consume la misma plataforma para costos financieros futuros
- Futuras tasks de nuevas monedas (BRL/ARS/etc.) — el diseño escalable permite que agregar una moneda sean 3 edits declarativos + 1 adapter si necesita provider nuevo

### Files owned

- `src/lib/finance/fx/` (nuevo directorio)
  - `src/lib/finance/fx/provider-adapter.ts`
  - `src/lib/finance/fx/provider-index.ts`
  - `src/lib/finance/fx/sync-orchestrator.ts`
  - `src/lib/finance/fx/circuit-breaker.ts`
  - `src/lib/finance/fx/providers/mindicador.ts`
  - `src/lib/finance/fx/providers/open-er-api.ts`
  - `src/lib/finance/fx/providers/banxico-sie.ts`
  - `src/lib/finance/fx/providers/datos-gov-co-trm.ts`
  - `src/lib/finance/fx/providers/apis-net-pe-sunat.ts`
  - `src/lib/finance/fx/providers/bcrp.ts`
  - `src/lib/finance/fx/providers/fawaz-ahmed.ts`
  - `src/lib/finance/fx/providers/frankfurter.ts`
  - `src/lib/finance/fx/providers/clf-from-indicators.ts`
  - `src/lib/finance/fx/__tests__/*.test.ts`
- `src/lib/finance/exchange-rates.ts` (refactor)
- `src/lib/finance/currency-registry.ts` (extender `providers: {primary, fallbacks[], historical?}`)
- `src/app/api/cron/fx-sync-latam/route.ts` (nuevo)
- `src/app/api/admin/fx/sync-pair/route.ts` (nuevo)
- `scripts/backfill-fx-rates.ts` (nuevo)
- `vercel.json`
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/documentation/finance/monedas-y-tipos-de-cambio.md`

## Current Repo State

### Already exists

- TASK-475 foundation completa (`currency-domain.ts`, `currency-registry.ts`, `fx-readiness.ts`, `/api/finance/exchange-rates/readiness`) mergeada en develop (commit `69a18e48`).
- Pricing engine v2 llama `resolvePricingOutputFxReadiness` al inicio y emite `fx_fallback` structured warning (`src/lib/finance/pricing/pricing-engine-v2.ts`).
- `QuotePricingWarningsPanel` en el builder renderiza structured warnings por severidad (critical / warning / info).
- Sync USD↔CLP funcional vía `src/lib/finance/exchange-rates.ts` + `src/lib/finance/economic-indicators.ts` + cron Vercel 23:05 UTC en `/api/finance/economic-indicators/sync`.
- `greenhouse_finance.exchange_rates` tabla con dual-write PG + BQ + outbox event `finance.exchange_rate.upserted` ya publicados en cada upsert.
- UF (CLF) se sincroniza diario como indicator económico en `greenhouse_finance.economic_indicators` vía Mindicador `/api/uf`.
- `source_sync_runs` infrastructure existente para logging de runs (ver otros crons del repo).

### Gap

- `src/lib/finance/exchange-rates.ts` tiene el par USD↔CLP hardcoded en 4+ funciones (`buildUsdClpRatePairs`, `syncDailyUsdClpExchangeRate`, `fetchMindicadorUsdToClp`, `fetchOpenExchangeRateUsdToClp`). Agregar una moneda hoy significa duplicar cada una.
- `CURRENCY_REGISTRY.providers` es un string único (`'mindicador' | 'open_er_api' | 'manual' | null`). No soporta chain primary → fallbacks → historical.
- No hay `FxProviderAdapter` interface ni provider index.
- CLF no tiene wiring hacia `exchange_rates` — la UF existe sólo como indicator, no como par `CLP↔CLF` o `CLF↔CLP`, aunque la data ya está en PG.
- No hay cron para COP/MXN/PEN. El engine emite `fx_fallback — Crítico` para esas monedas en todas las simulaciones.
- No hay script de backfill histórico ni endpoint admin para forzar sync puntual de un pair.
- No hay secret `BANXICO_SIE_TOKEN` en Secret Manager.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Provider adapter interface + Mindicador/OpenER refactor

- Crear `src/lib/finance/fx/provider-adapter.ts` con la interface `FxProviderAdapter`: `code`, `displayName`, `fetchDailyRate(input)`, `fetchHistoricalRange(input)`, `ping()`.
- Crear `src/lib/finance/fx/provider-index.ts` que exporta el mapa `code → adapter instance`.
- Crear `src/lib/finance/fx/circuit-breaker.ts` — 3 fallas en 5min → skip 15min. Estado in-memory por proceso serverless (reset en cada cold start es aceptable para Vercel).
- Migrar `fetchMindicadorUsdToClp` + `fetchOpenExchangeRateUsdToClp` a `src/lib/finance/fx/providers/mindicador.ts` y `open-er-api.ts` implementando la interface.
- `src/lib/finance/exchange-rates.ts` pasa a ser una capa delgada que llama al orchestrator (Slice 3); mantiene exports existentes (`syncDailyUsdClpExchangeRate`, `upsertExchangeRates`, `getLatestStoredExchangeRatePair`, `buildUsdClpRatePairs`) como wrappers para NO romper consumers externos.
- **Regresión obligatoria**: el cron 23:05 UTC existente sigue produciendo el mismo efecto (upsert USD→CLP + CLP→USD) y la misma shape de respuesta en `/api/finance/exchange-rates/latest`.

### Slice 2 — Nuevos adapters (sin cron, testables vía admin endpoint)

- `providers/banxico-sie.ts` — serie `SF43718` (FIX). Header `Bmx-Token` con secret `BANXICO_SIE_TOKEN`. Endpoint base `https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/{from}/{to}`.
- `providers/datos-gov-co-trm.ts` — dataset Socrata `32sa-8pi3`. Sin auth (app-token opcional). Endpoint `https://www.datos.gov.co/resource/32sa-8pi3.json`. Expansión obligatoria: las filas TRM tienen ventanas `vigenciadesde → vigenciahasta` que cubren múltiples días (weekends/feriados); el adapter debe emitir una fila per-día al expandir.
- `providers/apis-net-pe-sunat.ts` — `https://api.apis.net.pe/v1/tipo-cambio-sunat` (SBS venta). Sin auth.
- `providers/bcrp.ts` — serie `PD04640PD`. Endpoint `https://estadisticas.bcrp.gob.pe/estadisticas/series/api/PD04640PD/json/{from}/{to}`. Parse del formato de fecha `DD.Mon.YY` ("18.Apr.26"). **Uso exclusivo para `fetchHistoricalRange` — no para daily**.
- `providers/fawaz-ahmed.ts` — fallback universal vía jsDelivr CDN. `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json` y `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date}/v1/currencies/usd.json`.
- `providers/frankfurter.ts` — fallback para MXN. `https://api.frankfurter.dev/v1/{date}?from=USD&to=MXN`. ECB-backed.
- `providers/clf-from-indicators.ts` — lee `greenhouse_finance.economic_indicators` para el indicador `UF` y emite filas `CLF↔CLP`. No hace fetch HTTP — la data ya existe.
- **Cada adapter trae su test unitario** en `src/lib/finance/fx/__tests__/` con fixture de respuesta real (capturada vía `pnpm staging:request` o curl de prueba).
- **Validación por adapter**: `rate > 0 && Number.isFinite(rate)`. Si falla, return null + log warning (circuit breaker cuenta como falla).
- **Published-day pattern**: cada adapter declara (en metadata estática) si publica solo weekdays, weekends también, o irregular. El orchestrator usa esto para marcar `is_carried=true` cuando aplique.
- `POST /api/admin/fx/sync-pair` — endpoint gated (finance_admin / efeonce_admin) que acepta `{from, to, rateDate, providerCode?, dryRun?}`. Permite probar cada adapter manualmente sin tocar cron.

### Slice 3 — Sync orchestrator + registry extension

- Extender `CurrencyRegistryEntry`:

  ```ts
  providers: {
    primary: ProviderCode
    fallbacks: readonly ProviderCode[]
    historical?: ProviderCode  // opcional, para backfills largos
  }
  ```

  El campo legacy `provider: ProviderCode | null` queda deprecado pero se preserva temporalmente para backwards-compat (derivado de `primary`). Marcar con `@deprecated` JSDoc.
- Actualizar las 6 entradas del registry:
  - `CLP`: `{primary: 'mindicador', fallbacks: ['open_er_api']}`
  - `USD`: `{primary: 'mindicador', fallbacks: ['open_er_api']}`
  - `CLF`: `{primary: 'clf_from_indicators', fallbacks: ['fawaz_ahmed']}`
  - `COP`: `{primary: 'datos_gov_co_trm', fallbacks: ['fawaz_ahmed']}`
  - `MXN`: `{primary: 'banxico_sie', fallbacks: ['frankfurter', 'fawaz_ahmed']}`
  - `PEN`: `{primary: 'apis_net_pe_sunat', fallbacks: ['fawaz_ahmed'], historical: 'bcrp'}`
- Crear `src/lib/finance/fx/sync-orchestrator.ts` con `syncCurrencyPair({from, to, rateDate, dryRun?})`:
  1. Leer entrada del registry (del lado `to` = moneda destino; siempre sync desde USD o CLP).
  2. Try `primary` adapter con circuit breaker chequeado.
  3. Si falla o circuit abierto, iterar `fallbacks` en orden.
  4. Si alguno tuvo éxito: upsert transaccional en `exchange_rates` (PG + BQ fallback, outbox event `finance.exchange_rate.upserted` incluido).
  5. Emitir `finance.fx_sync.provider_fallback` al outbox si `primary` falló pero un fallback respondió — payload `{from, to, rateDate, primaryProvider, winningProvider, primaryErrorMessage}`.
  6. Log corrida a `source_sync_runs` con `source_system: 'fx_sync_orchestrator'`.
  7. Return `{success, providerUsed, rate, isCarried, runId}` o `{success: false, reason, attemptedProviders}`.
- Idempotencia: upsert por `(from_currency, to_currency, rate_date)`. Si la fila ya existe y el rate nuevo es idéntico (tolerancia 0.0001), return success sin UPDATE.

### Slice 4 — Cron routes (registry-driven, TZ-aware)

- `src/app/api/cron/fx-sync-latam/route.ts`:
  - Handler `GET` (Vercel cron estándar).
  - Lee query param `?window=morning|midday|evening` (validado enum).
  - Cada window mapea a una lista de currencies desde una constante interna (para que agregar BRL solo requiera extender la constante + nueva entrada en registry, sin tocar cron).
  - Itera currencies → para cada una llama `syncCurrencyPair({from: 'USD', to: currency, rateDate: todayInCurrencyTimezone})`.
  - Retorna `{window, results: [{currency, success, providerUsed, rateDateResolved, error?}]}`.
  - Timeout total < 10s (Vercel hobby) — 3 currencies × 5s max cada una con fail-fast.
- Entradas nuevas en `vercel.json`:
  ```json
  { "path": "/api/cron/fx-sync-latam?window=morning", "schedule": "0 9 * * *" },
  { "path": "/api/cron/fx-sync-latam?window=midday",  "schedule": "0 14 * * *" },
  { "path": "/api/cron/fx-sync-latam?window=evening", "schedule": "0 22 * * *" }
  ```
- Mapping window → currencies:
  - `morning` → `['COP']`
  - `midday` → `['PEN']`
  - `evening` → `['MXN']` + reconciliation sweep que re-intenta cualquier par `COP/PEN/MXN` que haya fallado en ventanas previas del día (lee `source_sync_runs` del día para detectar).
- **Cron existente 23:05 UTC (`/api/finance/economic-indicators/sync`) se mantiene intocado**. Sigue cubriendo USD/CLP/UF/UTM/IPC con el patrón actual.
- CLF wiring: al terminar la sync diaria de indicators, ejecutar `clf_from_indicators` adapter que materializa el par `CLP↔CLF` en `exchange_rates` leyendo el último valor del indicator `UF`. Se invoca desde el handler actual de economic-indicators al finalizar (no cron nuevo).

### Slice 5 — Registry flip + backfill

- **Modo dry-run primero**: las primeras 24–48h los cron nuevos corren con `DRY_RUN=true` (flag en env o query param al route). Logean a `source_sync_runs` pero NO upsertan. Se valida que cada adapter responde, que el parsing es correcto, que los rates son sanos.
- **Flip incremental de `coverage`**: cambiar `CURRENCY_REGISTRY[code].coverage` de `'manual_only'` a `'auto_synced'` uno por vez en el siguiente orden:
  1. `CLF` (menor riesgo — lee indicator ya estable)
  2. `COP` (TRM es oficial + stable desde 2013)
  3. `MXN` (Banxico FIX es canónico para settlement)
  4. `PEN` (SUNAT SBS es canónico para facturación)
- Cada flip espera 24h de corridas exitosas sin `finance.fx_sync.provider_fallback` crítico.
- `scripts/backfill-fx-rates.ts --currency=X --from=YYYY-MM-DD --to=YYYY-MM-DD [--provider=...]`:
  - One-shot script ejecutable contra Cloud SQL Proxy (patrón `pg:connect`).
  - Usa el `historical` adapter del registry si existe (ej. BCRP para PEN); si no, el `primary`.
  - Itera días en el rango, llama al orchestrator con `dryRun: false`.
  - Reporta contadores al final: upserts creados / saltos idempotentes / errores.
  - Backfill inicial recomendado: 90 días previos al flip por moneda.
- Post-flip verification: smoke test via `pnpm staging:request POST /api/finance/quotes/pricing/simulate` con cada moneda output. `structuredWarnings` NO debe contener `fx_fallback` para la moneda flipeada si la tasa está fresca.

### Slice 6 — Docs + observability

- Actualizar `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`:
  - Sección nueva "Provider adapters" con tabla de adapters + endpoints + auth + fallback strategy.
  - Sección "Sync schedule" con los crons y sus windows.
  - Evidencia de rollout: tabla con fechas de flip por moneda.
- Actualizar `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`:
  - Cron schedule actualizado con las 3 nuevas entradas.
  - Coverage flip log (fecha por moneda).
  - Circuit breaker semantics explicadas.
- Actualizar `docs/documentation/finance/monedas-y-tipos-de-cambio.md`:
  - Tabla "Cobertura actual" refleja `auto_synced` para CLF/COP/MXN/PEN.
  - Sección nueva "Cómo diagnosticar un par que no sincroniza" (runbook).
  - Sección "Cómo agregar una moneda nueva" actualizada con el flujo real plugin.
- Opcional (follow-up si el tiempo lo permite): endpoint read-only `GET /api/admin/fx/health` devolviendo estado actual por par (última sync, provider ganador, age, stale flag, circuit breaker state).

## Out of Scope

- **Expandir `FinanceCurrency`** — permanece `CLP | USD` per TASK-475 compliance rule. Consumers CLP-normalized (`operational_pl`, `member_capacity_economics`, tool-cost-reader target) no se tocan.
- **UI client-facing de estado FX** — no se crea dashboard visible al AE. `QuotePricingWarningsPanel` ya cubre el caso en el builder.
- **Multi-currency output en el envío de cotizaciones** — eso es TASK-466 (depende de esta task para que producción tenga FX coverage).
- **Worker Cloud Run** — el sync FX sigue siendo serverless en Vercel. Workers son para Commercial Cost Basis (TASK-483), no para FX.
- **Management accounting / factoring / treasury FX** — TASK-397.
- **Locale-aware formatting** — TASK-429.
- **Providers nuevos para monedas no listadas** (BRL, ARS, etc.) — se pueden agregar trivialmente post-task con el patrón plugin, pero no caen en este scope.
- **Admin UI para ver/manipular tasas FX** — el endpoint `POST /api/admin/fx/sync-pair` es suficiente para ops ahora; UI queda como follow-up.

## Detailed Spec

### Provider adapter interface

```ts
// src/lib/finance/fx/provider-adapter.ts

export type FxProviderCode =
  | 'mindicador'
  | 'open_er_api'
  | 'banxico_sie'
  | 'datos_gov_co_trm'
  | 'apis_net_pe_sunat'
  | 'bcrp'
  | 'fawaz_ahmed'
  | 'frankfurter'
  | 'clf_from_indicators'
  | 'manual'

export type FxPublishedDayPattern =
  | 'weekdays_only'   // BCCh, Banxico, BanRep, SBS
  | 'all_days'         // Fawaz / aggregators publican diario
  | 'irregular'        // UF / UTM tiene patrón histórico

export interface FxRateFetchResult {
  fromCurrency: string
  toCurrency: string
  rate: number
  rateDate: string       // ISO YYYY-MM-DD de la tasa (del provider)
  requestedDate: string  // ISO de lo que pedimos (para detectar carry)
  isCarried: boolean     // requestedDate > rateDate (weekend/holiday carry)
  source: string         // código provider + sufijo si aplica (ej. 'banxico_sie:SF43718')
  publishedAt: string | null  // ISO datetime cuando el provider publicó
  rawPayload?: unknown
}

export interface FxProviderAdapter {
  readonly code: FxProviderCode
  readonly displayName: string
  readonly publishedDayPattern: FxPublishedDayPattern
  readonly supportsHistorical: boolean

  fetchDailyRate(input: {
    fromCurrency: string
    toCurrency: string
    rateDate: string  // ISO YYYY-MM-DD
  }): Promise<FxRateFetchResult | null>

  fetchHistoricalRange(input: {
    fromCurrency: string
    toCurrency: string
    startDate: string
    endDate: string
  }): Promise<FxRateFetchResult[]>

  ping(): Promise<{ reachable: boolean; latencyMs: number | null }>
}
```

### Orchestrator contract

```ts
// src/lib/finance/fx/sync-orchestrator.ts

export interface SyncCurrencyPairInput {
  fromCurrency: string
  toCurrency: string
  rateDate?: string | null  // default: today
  dryRun?: boolean
  overrideProviderCode?: FxProviderCode  // para admin endpoint
}

export interface SyncCurrencyPairResult {
  success: boolean
  rate: number | null
  rateDate: string | null
  providerUsed: FxProviderCode | null
  providersAttempted: FxProviderCode[]
  isCarried: boolean
  runId: string
  error?: string
}

export const syncCurrencyPair: (input: SyncCurrencyPairInput) => Promise<SyncCurrencyPairResult>
```

### Cron window → currency mapping

```ts
// src/app/api/cron/fx-sync-latam/route.ts
const WINDOW_CURRENCIES: Record<'morning' | 'midday' | 'evening', readonly string[]> = {
  morning: ['COP'],
  midday:  ['PEN'],
  evening: ['MXN']  // + reconciliation sweep for today's failures
}
```

### Outbox events

| Evento | Cuándo | Payload |
|---|---|---|
| `finance.exchange_rate.upserted` | Cada upsert exitoso (existente) | `{fromCurrency, toCurrency, rate, rateDate, source}` |
| `finance.fx_sync.provider_fallback` | Primary falló pero un fallback respondió | `{fromCurrency, toCurrency, rateDate, primaryProvider, winningProvider, primaryErrorMessage, runId}` |
| `finance.fx_sync.all_providers_failed` | Todos los providers fallaron para un pair | `{fromCurrency, toCurrency, rateDate, providersAttempted, errors, runId}` |

### Banxico SIE example

```
GET https://www.banxico.org.mx/SieAPIRest/service/v1/series/SF43718/datos/2026-04-18/2026-04-19
Header: Bmx-Token: <BANXICO_SIE_TOKEN>
Response: {"bmx":{"series":[{"datos":[{"fecha":"18/04/2026","dato":"17.2250"}]}]}}
```

Parse: `rate = parseFloat(dato)`, `rateDate = '2026-04-18'` (convert `DD/MM/YYYY`).

### TRM expansion example

```
GET https://www.datos.gov.co/resource/32sa-8pi3.json?$where=vigenciadesde%20%3E=%20%272026-04-17%27&$order=vigenciadesde
Response: [
  {"valor":"3593.14","vigenciadesde":"2026-04-18","vigenciahasta":"2026-04-20"}
]
```

Expand: 3 filas emitidas con `rateDate` 2026-04-18, 2026-04-19, 2026-04-20. Las del 19 y 20 llevan `isCarried: true`.

### Circuit breaker state

In-memory `Map<FxProviderCode, {failures: number, firstFailureAt: number, skipUntil: number}>`. Reset por cold start es aceptable (Vercel serverless). 3 fallas en 5min → `skipUntil = now + 15min`. Siguiente invocación del adapter chequea `now < skipUntil` y retorna null inmediatamente sin HTTP.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `FxProviderAdapter` interface existe en `src/lib/finance/fx/provider-adapter.ts` y los 10 providers declarados implementan la interface con tests unitarios
- [ ] `src/lib/finance/exchange-rates.ts` refactorizado delega al orchestrator; los exports existentes siguen funcionando (backwards-compat verificado)
- [ ] Sync USD↔CLP cron 23:05 UTC sigue produciendo el mismo efecto pre-task (regresión verificada por smoke test comparando output pre/post)
- [ ] `CurrencyRegistryEntry.providers` soporta `{primary, fallbacks[], historical?}` con las 6 entradas actualizadas
- [ ] `sync-orchestrator.ts` prueba primary → fallbacks en orden, emite `finance.fx_sync.provider_fallback` cuando primary falla + respalda fallback, emite `finance.fx_sync.all_providers_failed` cuando todos fallan
- [ ] Circuit breaker per-provider funcional (3 fallas en 5min → skip 15min) verificado por test unitario
- [ ] Idempotencia del upsert verificada (re-run mismo pair + fecha = no-op, tolerancia 0.0001)
- [ ] `POST /api/admin/fx/sync-pair` endpoint gated funciona con dry-run y apply-mode
- [ ] 3 cron routes nuevas registradas en `vercel.json` y verificadas en staging logs durante 24–48h en dry-run sin errores
- [ ] `BANXICO_SIE_TOKEN` publicado en Secret Manager con higiene del repo (scalar crudo, sin whitespace, sin `\n`)
- [ ] `CURRENCY_REGISTRY.coverage` flipeado a `auto_synced` para `CLF/COP/MXN/PEN` uno por vez con 24h mínimo entre flips
- [ ] Smoke test en staging: `POST /api/finance/quotes/pricing/simulate` para `outputCurrency='MXN'/'COP'/'PEN'` NO emite `fx_fallback — critical` cuando la tasa existe fresca
- [ ] `scripts/backfill-fx-rates.ts` ejecutado para CLF/COP/MXN/PEN cubriendo últimos 90 días por moneda
- [ ] `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` + `GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md` + `docs/documentation/finance/monedas-y-tipos-de-cambio.md` sincronizados con el estado final
- [ ] `Handoff.md` + `changelog.md` reflejan el cierre
- [ ] Zero regresión en `pnpm test` + `pnpm build` + `pnpm lint` + `npx tsc --noEmit`

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` — con foco en `src/lib/finance/fx/__tests__/`
- `pnpm build` — verifica que las 3 cron routes nuevas aparecen en el manifest
- Manual en staging autenticado vía `pnpm staging:request`:
  - `POST /api/admin/fx/sync-pair` con dry-run para cada adapter nuevo
  - `GET /api/cron/fx-sync-latam?window=morning` (staging cron emulation)
  - `POST /api/finance/quotes/pricing/simulate` con outputCurrency MXN/COP/PEN post-flip
  - `GET /api/finance/exchange-rates/readiness?from=USD&to=MXN&domain=pricing_output` → esperado `state: 'supported'`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas — TASK-466 debe marcar esta como desbloqueante en su propia spec
- [ ] `TASK-466` reanclada con nota de que la foundation FX está cubierta end-to-end
- [ ] Secret `BANXICO_SIE_TOKEN` documentado en el runbook operativo (quién lo registra, cómo rotarlo)

## Follow-ups

- `TASK-466` — multi-currency quote output desbloqueado (send gate puede usar `GET /api/finance/exchange-rates/readiness` con threshold estricto 3d)
- Admin UI `GET /api/admin/fx/health` + dashboard para ver estado por pair (optional follow-up si ops lo pide)
- Wire provider nuevo si el negocio agrega BRL/ARS/UYU/PYG al portafolio — patrón plugin cubre casi todo, solo falta un adapter nuevo por moneda
- Evaluar si `getLatestExchangeRate` / `resolveExchangeRateToClp` de `src/lib/finance/shared.ts` deben consolidarse contra el orchestrator en vez de tener su propio auto-sync USD/CLP (hoy duplica lógica pero funciona; refactor puede ser otra task)
- Monitoring alerts en Sentry cuando `finance.fx_sync.all_providers_failed` se dispare (todos los providers cayeron para un pair)

## Open Questions

- ¿Quién registra el `BANXICO_SIE_TOKEN` en Secret Manager? El token es free self-register pero necesita una cuenta. Asumo que el agente tomador coordina con un admin de Efeonce para registrarlo antes de Slice 2 (no lo publica con una cuenta personal).
- ¿Cron windows UTC son los correctos para la realidad operativa? Asumo que sí (Banxico FIX publica ~18:00 UTC, SUNAT ~14:00 UTC, TRM noche previa). Si un pair consistentemente necesita reintento, ajustar el schedule post-flip.
- ¿Historical backfill de 90 días es suficiente o el negocio quiere 1–2 años para analytics? El script es reutilizable; si se necesita más, es cosa de correrlo con rango más amplio (considerar rate-limiting del provider en ese caso).
