# ISSUE-181 — El regrade recurrente AEO reclama mercados que el contrato no declara

## Ambiente

producción, Cloud Run `ops-worker`, job `ops-growth-grader-regrade` (`0 8 * * *`, `America/Santiago`).

## Detectado

2026-10-12, correo de Sentry `JAVASCRIPT-NEXTJS-9E` aportado por el operador
(`GraderMarketConfigError: aeo_market_not_included`, `POST /growth/grader/regrade`). Logs del
worker y base verificados directamente.

## Síntoma

Desde el 2026-10-03 el job falla el 100 % de lo que reclama fuera de los mercados principales.
El 12 de octubre: `claimed=5 enqueued=0 failed=5`. Cada mercado fallido se reagenda a +1 día y
vuelve a fallar: con 6 mercados y `batchSize=5` el ciclo no converge nunca.

## Causa raíz

Tres caminos respondían por separado la pregunta «¿este mercado está cubierto por el contrato?»:

- `requestRunBatchInternal` (chokepoint de corrida) exige que un mercado secundario figure en
  `module_assignments.metadata_json.aeo_markets_included`.
- `claimDueMarkets` (scheduler) reclamaba cualquier mercado activo con cadencia prendida.
- `configureGraderMarketRegrade` (command) dejaba prender la cadencia sin mirar el contrato.

Y no existía ningún camino gobernado para escribir `aeo_markets_included`: `assignAeoTier` sólo
grababa `aeo_tier`. Sky Airlines tenía AR, BR, CO, PE, UY y US con cadencia mensual prendida y
la clave ausente.

## Impacto

Sin gasto de proveedor (nunca se encoló una corrida). Los mercados secundarios de Sky no tuvieron
medición recurrente; los principales (Sky CL, Berel MX) corrieron bien el 2026-10-03. Un error
diario en Sentry.

## Solución

Triage: `issue-only fix`.

- Predicado único `markets/contract-coverage.ts` (TS + SQL), usado por el chokepoint, el scheduler
  y el command de cadencia. El scheduler deja de reclamar lo que el chokepoint rechazaría;
  prender la cadencia de un secundario no declarado responde `aeo_market_not_included` (403).
- `assignAeoTier` acepta `marketsIncluded` (sólo `contracted`, validado contra el catálogo de
  mercados): supersede el assignment, conserva el resto de su metadata y es idempotente. Lo expone
  la route `/api/admin/growth/ai-visibility/assign-tier` y el CLI `pnpm growth:aeo-contracted-markets`.
- Dato: el operador confirmó el 2026-10-12 que los 6 mercados están contratados. Declarados con el
  command gobernado: `cpma-9755492d-696d-45cc-b8cf-777af54b8aa8` supersede a `cpma-9525b6ce-…`,
  `aeo_markets_included = [AR, BR, CL, CO, PE, US, UY]`.

## Verificación

- Predicado SQL ejercitado contra PostgreSQL real, sólo lectura: antes de declarar, 2 de 8 mercados
  elegibles (los principales); con un escalar `"AR"` en vez de array, sigue en 2; tras declarar, 8 de 8.
- Readback del assignment y de `resolveAeoEntitlement`: `marketsIncluded` con los 7 países.
- `pnpm typecheck`, lint y 1.257 tests de `ai-visibility` + `seo` + contrato del worker en verde.

## Estado

Dato aplicado en producción: el chokepoint DESPLEGADO ya lee la declaración, así que la corrida del
2026-10-13 08:00 debería encolar 5 mercados de Sky y la del 14 el sexto. **Código: code complete,
rollout pendiente** — el fix del scheduler y del command sale con el próximo push de `develop`.
Cierre: confirmar `failed=0` en el log del 2026-10-13 y el deploy del `ops-worker`.

## Relacionado

`TASK-1863` · `GREENHOUSE_AEO_MULTI_MARKET_MEASUREMENT_DECISION_V1.md` · `TASK-1270`.
