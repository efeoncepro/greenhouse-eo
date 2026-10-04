# Greenhouse SEO — historial de entregas

Extraído el 2026-10-04 de [la arquitectura canónica](GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md), conservando los seis bloques íntegros. Cada afirmación de runtime corresponde a su fecha; los estados OFF, migraciones pendientes o cutovers por ejecutar pueden haber sido supersedidos. Estado vigente y evidencia: [reconciliación EPIC-022](../audits/seo/2026-10-04-epic-022-documentation-reconciliation.md).

## Delta 2026-08-28 — el carril de competencia y contexto de SERP está VIVO en producción (release `c983be7f18e6`)

El paso a producción `develop→main` `c983be7f18e68602404567a19ac8e7e0f157f742` (PR #208,
`release_id` `c983be7f18e6-92b1b327-a1c9-4e7a-85dc-6a5e300f4e32`, manifiesto `released`, run
`33178544139`) llevó a `main` el trabajo de `TASK-1696` (dimensión de consumidor del ledger),
`TASK-1662` (gap competitivo) y `TASK-1699` (top-N del SERP). El estado se declara **por runtime**,
porque decir «el flag está ON» sin nombrar en cuál de los 5 runtimes es exactamente el error que
este documento existe para evitar.

**Migraciones (4) — aplicadas en la instancia única Cloud SQL `greenhouse-pg-dev`** (verificado con
`pnpm pg:connect:status` → `No migrations to run!`): `20260828015655472_task-1696-seo-provider-spend-consumer-dimension`
· `20260828020728716_task-1696-seo-provider-spend-cost-basis-in-key`
· `20260828113457119_task-1662-seo-competitor-gap-foundation`
· `20260828124352232_task-1699-seo-serp-top-results`.

| Flag | Runtime donde SE LEE | Estado real 2026-08-28 |
|---|---|---|
| `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` (TASK-1699) | **dual-runtime**: `ops-worker` (escritura del top-N dentro del rank capture) + Vercel (lectura de lanes) | **ON en los dos.** Worker desde antes del release (revisión `ops-worker-00610-kc8`); Vercel `Production` prendido **con** este release + redeploy obligatorio `greenhouse-aj0ng1mfw` |
| `GROWTH_SEO_COMPETITOR_GAP_ENABLED` (TASK-1662) | **sólo `ops-worker`** — en Vercel es **inerte** | **ON y vivo** en el worker. Scheduler `ops-seo-competitor-coverage` **ENABLED desde 2026-08-29** (⚠️ esta fila decía «ENABLED» desde el 28 y era FALSO: estaba `PAUSED` con `lastAttemptTime` vacío) |
| `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED` + `..._ENFORCED` (TASK-1696) | dual (Vercel + `ops-worker`) | **OFF por diseño, ambos.** No se prendieron con este release y no deben prenderse sin decisión explícita del operador tras un ciclo mensual de shadow |

🔴 **Vercel congela las env vars al crear el build**: prender el flag no basta. Por eso el
`vercel env add … production` (el nombre del entorno va en **minúscula**) viene acompañado del
redeploy `greenhouse-aj0ng1mfw`, y la verificación es contra el **runtime**, nunca contra la env
var: el canary del lane `serp-top-results` contra `https://greenhouse.efeoncepro.com` devolvió
`serp-top-results read: {"ok":true,…,"rows":[]}` — `ok:true`, **no** `disabled`. El array vacío es
lo esperado y no es un fallo: **el día 1 de la serie es el 2026-08-29** (cron `ops-seo-rank-capture`,
05:00 CLT) y la serie **no es backfilleable**.

Los 4 lanes internal-only nuevos responden `ok` contra producción, con `404` anti-oracle en el deny
(`provider-spend` · `keyword-gap` · `serp-top-results` · `competitor-candidates`).

**Primera corrida real de cobertura competitiva** (Berel MX, 1 competidor declarado
`comex.com.mx`): **USD 0,1076**, con gap medido de **357 `content_gap` / 54 `ranks_worse` / 269
excluidas** por tener impresiones medidas en GSC.

## Delta 2026-08-27 — tier `prospect`: el módulo aprende a hablarle a quien no firmó (TASK-1709)

El SEO gana su carril de ADQUISICIÓN: `runProspectDiagnostic` corre un diagnóstico ÚNICO sobre
cualquier dominio usando sólo fuentes que no piden acceso a nadie (`ranked_keywords` con
`ai_overview_reference` · `competitors_domain` · `backlinks/competitors` + `domain_intersection` —
esta task estrena el colector de competidores; `TASK-1662` lo consume desde 2026-08-28 como
propuesta de declaración) + evidencia de sitio
**delegada** al sustrato (`@/lib/growth/site-substrate`: home/JSON-LD/robots/sitemap, USD 0) +
reads OnPage post-crawl gratis si ya existe crawl del dominio. Primitives en
`src/lib/growth/seo/prospect/**`; lanes app + ecosystem (`internal`-only ambos verbos) + MCP tools
`get_seo_prospect_diagnostic` / `run_seo_prospect_diagnostic` en el mismo PR.

**Reglas duras del carril (violarlas es regresión, no mejora):**

- **NUNCA captura recurrente sobre un prospecto**: sin `next_run_at`, sin cron, sin scheduler que
  lea `seo_prospect_diagnostics` (test fuente `prospect-boundary.test.ts` + DO guard en la
  migración). Re-correr = disparo humano que vuelve a pasar por todos los topes. La corrida V1 es
  **inline en Vercel** (todas las fuentes live) — el ops-worker NO participa.
- **Tope duro POR DIAGNÓSTICO**, no mensual: `enforceProspectDiagnosticBudget` valida el forecast
  del CONJUNTO antes de la primera llamada; presupuesto efectivo =
  `min(GROWTH_SEO_PROSPECT_DIAGNOSTIC_CEILING_USD (default 1,00), restante del mes de Efeonce)`.
  No cabe → `cost_blocked` con CERO llamadas. + tope diario por actor (default 10).
- **El gasto es costo de adquisición de Efeonce**: se atribuye a la org canónica `EO-ORG-0007`
  (resuelta server-side por `public_id`) en el ledger único `seo_provider_spend_daily`. Cero
  segundo almacén de gasto; el margen por cliente no se contamina.
- **Toda cifra es `◑ estimada` y lo dice**: `lens` con CHECK de un solo valor + `captured_at NOT
  NULL`; `magnitude: null` = no medido, JAMÁS 0. **El contrato de salida NO tiene campo de score,
  veredicto, salud, benchmark ni lift** — el diagnóstico enumera pérdida cuantificada, nunca
  certifica que un sitio está sano (un audit no detecta bloqueo a crawlers IA: un sitio invisible
  puede puntuar 95/100).
- **Un bloqueo es un hallazgo** (`site_crawl_blocked` / `extended_crawl_status` prohibido), nunca
  un obstáculo a evadir: cero `robots_txt_merge_mode: override`, cero proxy pools, UA siempre
  identificable (postura verificada por test negativo).
- **Idempotencia por (dominio, mercado, idioma, día)** vía índice único parcial: repetir el mismo
  día devuelve lo existente con USD 0. `SeoTier` gana `prospect` pero NO está en `VALID_TIERS`: un
  `module_assignment` jamás lo declara.

Señal: `growth.seo.prospect_diagnostic.cost_overrun` (steady 0). Evento:
`growth.seo.prospect_diagnostic.completed` (in-tx, sin consumer; hand-off HubSpot = task aparte).
La cara visible (artefacto/PDF/short-link) sigue fuera: `TASK-1672`/`TASK-1673`, bloqueadas tras
`TASK-1670` (§3.4 C8 de la auditoría). Capabilities en §9.

## Delta 2026-08-14 — el dato de mercado por keyword está VIVO (TASK-1661 `complete`, release `3754a17d3b1d`)

El módulo dejó de ser ciego a la demanda que no mide Search Console. `greenhouse_growth.seo_keyword_market_data`
(§4.2) es el SSOT del hecho de mercado, **multi-productor y desacoplado del target**; los primitives
(`captureKeywordMarketData` · `previewKeywordMarketDataCapture` · `readKeywordMarketData` · `deriveLinkBarrier`)
viven en `src/lib/growth/seo/keyword-market-data.ts` (§7); el scheduler mensual `ops-seo-keyword-market-data`
está **ACTIVO** y `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED` **ON** en el ops-worker (§8).

Tres correcciones que este delta hace al texto anterior del documento, porque hoy son falsas:

1. **`readKeywordOpportunities` ya NO cablea `market: 'unavailable'`** — pasa a `'available'` cuando hay captura,
   y cada oportunidad viaja con `linkBarrier` derivada server-side (§7, §10.4).
2. **La barrera de enlaces NO sale de `keyword_difficulty`.** Ese índice colapsa a `0` en SERPs es-LATAM
   (`pintura`, 135.000 búsquedas/mes en MX, daba KD 0). La derivación canónica es `deriveLinkBarrier` sobre el
   perfil de enlaces del top-10, ponderando **diversidad de dominios referentes + page rank, nunca el conteo**.
   `classifyLinkBarrier` fue eliminada (§7).
3. **El mercado (país) es dimensión EXPLÍCITA** en toda resolución de target (ISSUE-153, §7) y **corregirlo es
   crear un target nuevo, nunca un `UPDATE` de `location_code`** (ISSUE-152, §4.1).

---

## Delta 2026-08-08 — catálogo cliente TASK-1310: `seo_v2` pendiente de aplicar

`seo_v1` se creó con `view_codes=[]`. TASK-1310 necesita exponer dashboard e informe en el menú
compuesto del portal, pero `greenhouse_client_portal.modules` prohíbe mutar esos campos in-place.
La migración `20260808131441444_task-1310-seo-client-view-codes.sql` crea **`seo_v2`**, conserva
status/tier/metadata de cada assignment vigente, cierra `seo_v1` y registra
`cliente.growth_seo_dashboard` + `cliente.growth_seo_report` con denials explícitos por rol. El
acceso sigue siendo per-org (`module_assignment` + capability), nunca role-wide.

**Estado (actualizado 2026-08-09):** migración aplicada y código en producción. `seo_v2` existe con
sus dos viewCodes y las dos organizaciones asignadas, y desde el release `49f86c98cda6` el runtime
**lee y escribe sólo `seo_v2`** (`TASK-1677` — ver §10.7). **El cutover está CERRADO desde el
2026-08-09**: código y datos. Los assignments `seo_v1` quedaron superseded por `effective_to`
(migración `20260809163352129`), y la fila `seo_v1` sigue en el catálogo como historia append-only.
Sobre la navegación cliente: `TASK-1675` cableó el menú module-driven y se verificó con sesión de
Grupo Berel contra producción el 2026-08-09 — el ítem `SEO` aparece compuesto desde
`module_assignments` y la ruta abre con datos medidos.

---

## Delta 2026-08-07 — `get_seo_overview_kpis` verificada end-to-end (TASK-1306)

La tool y su lane (`/api/platform/ecosystem/growth/seo/overview-kpis`) quedaron **ejercitados
contra staging con datos reales**, no sólo cableados y cubiertos por tests:

- Berel → `200` con 2.596 clics, 136.146 impresiones, posición ponderada 5.783, CTR 1.91%,
  `previous: null` y 5 puntos de serie. **Coincide exactamente con lo que muestra la UI**,
  que es la prueba de parity: un solo cálculo, dos consumidores.
- Org sin `module_assignment` → `404 not_found` (anti-oracle: no revela si la org existe).
- Sin token → `401`. `rangeDays=99999` → clampeado a `365` server-side.

⚠️ **El lane ecosystem NO se puede probar en `localhost`**: devuelve `500` por un `ENOENT` de
`@opentelemetry/instrumentation` en `node_modules`, y falla igual para endpoints sanos en
producción (verificado contra `rank-evolution`). Un 500 local no dice nada del endpoint —
la verificación válida es contra el deployment de staging. Receta con `curl`:
`docs/manual-de-uso/plataforma/operar-provider-greenhouse-seo-mcp.md`.

## Delta 2026-09-03 — identidad metodológica ETV formula-aware en producción (TASK-1805)

Release `5ec4cf769977-18572878-583b-43f0-aad0-01eb7b394aba` (run `33698245254`, PR #217; el Slice 3 salió antes
en PR #216). Lo que cambió por capa, con el detalle en su sección:

- **Schema (§4.2):** columnas `etv_methodology_version` / `etv_methodology_evidence` / `etv_requested_at` /
  `etv_policy_version` (+ `etv_historical_basis` en domain overview), UNIQUE formula-aware
  `seo_domain_overview_capture_method_unique` y `seo_url_visibility_capture_method_unique`, trigger
  `guard_seo_etv_methodology_cutoff()`; contract parqueado en
  `docs/tasks/pending-migrations/TASK-1805-etv-methodology-contract.sql.pending` con condición de tres puntos.
- **Policy (§6):** `src/lib/growth/seo/etv-methodology/**` (`contracts` · `families` · `policy` · `provenance` ·
  `persisted` · `evaluator` · `replay`); selectores `GROWTH_SEO_ETV_METHODOLOGY_VERSION` (escritura) y
  `GROWTH_SEO_ETV_READ_METHODOLOGY_VERSION` (lectura), ausentes = `legacy_static_v1` explícito.
- **Lectura (§5):** `etvMethodology` en todo `ok: true` de `readDomainOverview` / `readUrlVisibility` /
  `readVisibilityConcentration`; `not_available_for_method` como `reason` del reader y `errorCode` del lane.
- **Prospecto:** `runProspectDiagnostic` fija el método ANTES del claim (errorCode de dominio
  `etv_methodology_rejected` → canónico `seo_etv_methodology_rejected`, 409); `claimProspectDiagnostic`
  persiste la identidad en la cabecera y `finalizeProspectDiagnostic` actualiza `etv_requested_at`. El hecho
  `estimated_monthly_traffic.detail` = `{ basis: 'etv_sum_organic', etvMethodologyVersion, sampleRows,
  rowsWithEtv, rowLimit, truncated }`; el hecho `ai_overview_citations.detail` =
  `{ etvAttribution: 'modeled_uniform_share_among_cited_domains', etvSummed: false }`.
- **Observabilidad (§8):** señal `seo.etv_methodology.drift`; `/health` del ops-worker con bloque `etvMethodology`.
- **Eventos:** los payloads de `growth.seo.domain_overview.snapshot_captured`,
  `growth.seo.url_visibility.snapshot_captured` y `growth.seo.prospect_diagnostic.completed` **no cambian**
  (coordenadas y resumen; el consumer re-lee PG, donde la metodología ya vive por fila).
- **Sanity contra PG real:** `scripts/growth/_sanity-task-1805-etv-schema.ts` (17/17 en transacción con rollback,
  incluye el contract) y `scripts/growth/_sanity-task-1805-etv-evaluator.ts` (dry-run + replay + ledger intacto, 8/8).

**Estado runtime verificado 2026-09-03:** los lanes de producción (Berel MX) sirven
`etvMethodology.version = legacy_static_v1` con evidencia `contract_default_pre_cutoff`; `/health` del worker
reporta `configuredWriteSource: env`; selectores presentes en Vercel Production + staging y en `deploy.sh`. La
señal permanece en `awaiting_data` hasta la primera captura explícita del worker (crons `ops-seo-domain-overview`
día 16 y `ops-seo-url-visibility` día 17). **Improved NO está activado.** Shadow pagado, decisión
rebaseline/breakpoint, cutover y aplicación del contract quedan en `TASK-1806`. ADR:
`GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md` (§Runtime Contract); runbook:
`docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md`.
