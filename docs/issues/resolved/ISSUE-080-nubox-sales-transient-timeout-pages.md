# ISSUE-080 — Nubox /sales timeout transitorio paginea el cron quotes-hot

## Ambiente

production

## Detectado

2026-05-22, Sentry (JAVASCRIPT-NEXTJS-6E), proyecto `javascript-nextjs`, env `production`. `Error: Nubox API GET /sales request failed: The operation was aborted due to timeout` en `POST /nubox/quotes-hot-sync` (ops-worker Cloud Run). Stack: `nuboxFetch → fetchAllPages → syncNuboxQuotesHot → runNuboxQuotesHotSync`.

## Síntoma

El cron `ops-nubox-quotes-hot-sync` (cada 15 min) fallaba con error duro (502) y paginaba al operador cuando la API de Nubox `/sales` estaba transitoriamente lenta. (El operador creía que se había arreglado el día anterior pero reapareció — no había fix commiteado; la brecha de resiliencia persistía.)

## Causa raíz

`listNuboxSales` usaba el timeout default genérico de 15s por página. `fetchAllPages` pagina el endpoint `/sales` (el más pesado y paginado). Cuando Nubox responde lento (se observó una corrida legítima de 45s), una página agotaba los 4 intentos (`TimeoutError` ES retryable: 1 inicial + 3 reintentos con backoff 1s/2s/4s) y `syncNuboxQuotesHot` re-lanzaba. `wrapCronHandler` captura cualquier throw como error duro → 502 → Sentry error level → email de alta prioridad.

Doble brecha: (1) timeout de 15s demasiado corto para `/sales`; (2) un timeout transitorio de una dependencia externa no debería paginar como error duro en un sync idempotente que corre cada 15 min y se autorecupera.

## Impacto

- Path: cron `ops-nubox-quotes-hot-sync` (ops-worker, producción).
- Ruido de alertas Sentry de alta prioridad por lentitud transitoria de Nubox (no un bug real del portal).
- Sin pérdida de datos: el sync es idempotente (advisory lock + UPSERT); el siguiente ciclo recupera.

## Solución

Fix de fondo (no parche), 2 capas + 1 backstop:

1. **Right-sizing del timeout**: `/sales` ahora usa timeout propio env-tunable `NUBOX_SALES_LIST_TIMEOUT_MS` (default 30s, clamp 5s–120s) en vez del default genérico de 15s. La corrida observada de 45s confirma que Nubox `/sales` es genuinamente lento a veces.
2. **Error tipado + degradación honesta**: `nuboxFetch` lanza `NuboxApiError { kind, transient, status }` (timeout/connectivity/429/5xx = transient; 4xx = real; message preservado verbatim). `syncNuboxQuotesHot`: ante falla transient registra el run `failed` (visible en Ops Health), captura **WARNING** (no paginea) y retorna resultado `skipped` → cron 200. Fallas reales (auth/4xx/schema/PG) siguen paginando.
3. **Per-period isolation** (`e50c4811`): cada período se aísla; una falla transient en uno no hunde los demás (los buenos persisten, run `partial`, warning). Si todos fallan transient → degrada. Non-transient sistémico → paginea.

Backstop de staleness: la señal de freshness Nubox (TASK-841) escala si el sync queda stale de forma sostenida — la ruta de escalación sigue viva, solo se elimina el ruido por blips transitorios.

Commits: `c7eadf2c` (timeout + error tipado + degradación) + `e50c4811` (per-period isolation). Tests: typed-error transient timeout + non-transient 4xx en `src/lib/nubox/client.test.ts`.

## Verificación

- Deploy ops-worker runs `26304906137` + (per-period) deploy posterior — success.
- Corrida manual post-deploy: `sales=3 quoteSales=1 created=0 updated=1 skipped=0` sin error; una corrida tardó 45s y completó (habría fallado con 15s).
- Gate: tsc + lint + full suite + next build + esbuild ops-worker bundle.

## Estado

resolved

## Relacionado

- `src/lib/nubox/client.ts` (`NuboxApiError`, `NUBOX_SALES_LIST_TIMEOUT_MS`)
- `src/lib/nubox/sync-nubox-quotes-hot.ts` (degradación + per-period isolation)
- Backstop: `src/lib/reliability/queries/nubox-source-freshness.ts` (TASK-841)
- Patrón canónico validado vía skill `greenhouse-cron-sync-ops` (degradación honesta + reliability signal).
