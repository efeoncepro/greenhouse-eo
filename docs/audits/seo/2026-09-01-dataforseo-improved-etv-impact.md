# Auditoría DataForSEO Improved ETV — impacto en Greenhouse SEO

- Fecha: 2026-09-01
- Alcance: 14 familias ETV-capable, nueve con caller y seis familias/siete caminos consumidores; persistencia,
  readers, API/MCP, reporting y transición
- Tipo: discovery/documentación; sin cambio de código, schema, flags, scheduler, proveedor ni runtime
- Evidencia externa: aviso de cuenta + respuesta contractual de DataForSEO recibidos en Outlook + documentación pública
- Evidencia interna: código, migraciones, arquitectura, tests y ledger declarativo del checkout compartido
- Estado: contrato documentado; cutover no autorizado

## 1. Conclusión ejecutiva

DataForSEO anunció una nueva metodología para el campo existente `etv`. El cambio no rompe el shape: cambia la
semántica detrás del mismo número. Greenhouse no envía `use_improved_etv`, no persiste versión de fórmula y sus
claves append-only no permiten guardar legacy e improved para el mismo sujeto/mercado/fecha.

El riesgo P0 es una discontinuidad silenciosa: después del corte confirmado para 2026-11-01T00:00:00Z, una captura puede
seguir pasando parsing/tests y entrar a la trayectoria como si fuera performance orgánica. El mismo peligro
existe hacia atrás si Historical Rank Overview recalcula períodos pasados.

Siete integraciones consumen ETV directamente. La foto de dominio, la visibilidad por sujeto y el diagnóstico de
prospectos tienen caminos declarados activos/accesibles; backfill, bulk, relevant pages y subdomains son runners o
primitives manuales sin caller productivo adicional observado. Esta auditoría no hizo readback live de flags ni
llamadas pagadas: el estado de activación viene del ledger/código vigente y debe reverificarse al ejecutar.

## 2. Qué confirmó DataForSEO y qué sigue abierto

### Confirmado por respuesta directa del proveedor el 2026-09-02

- El flag está activo en producción para Google y Bing en 14 familias Labs; la matriz completa vive en el
  [registro del hilo](../communications/2026-09-01-dataforseo-improved-etv-provider-questions.md).
- Afecta todo campo ETV y `estimated_paid_traffic_cost`, incluidos organic, paid, featured snippet, local pack,
  AI Overview reference, items y SERP Competitors.
- El corte exacto es 2026-11-01T00:00:00Z. Después, `false` se ignora y no existe legacy fallback.
- No se expone una versión de fórmula en la respuesta; el cliente debe registrar flag y fecha.
- Julio de 2026 en adelante se recomputa completamente. Antes de julio se aplica una calibración por dominio
  derivada del ratio legacy/improved de julio; esos puntos son aproximaciones.
- `use_improved_etv` no tiene recargo. `include_clickstream_data` es independiente, combinable y conserva su
  precio doble; `clickstream_etv` no cambia con improved.

### Confirmado por el aviso de cuenta

- ETV improved usa CTR dinámico según layout/features exactas de la SERP e intención principal.
- Normaliza el volumen de búsqueda con datasets clickstream multi-fuente.
- Busca acercarse mejor a tráfico observado en GSC, especialmente con AIO, snippets, local packs y zero-click.
- Early access: `use_improved_etv: true`.
- Legacy continúa por default hasta 2026-11-01; improved pasa a default después según el aviso.

### Confirmado por documentación pública vigente

- El modelo legacy se documenta como `search volume × CTR coefficient` por `rank_group`.
- `include_clickstream_data` es otro flag, default `false`; devuelve `clickstream_etv` y campos adicionales y
  duplica el precio del request.
- `estimated_paid_traffic_cost` se documenta como ETV orgánico × CPC pagado.
- Historical Rank Overview ofrece ETV desde 2020-10; los campos clickstream históricos, desde 2024-05.

Fuentes:

- https://dataforseo.com/help-center/how-is-etv-calculated
- https://dataforseo.com/help-center/whats-clickstream-estimated-traffic-volume-and-how-is-it-calculated
- https://dataforseo.com/help-center/how-is-traffic-cost-calculated
- https://docs.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live/
- https://docs.dataforseo.com/v3/dataforseo_labs/google/historical_rank_overview/live/

### Brecha documental pública y pendientes al 2026-09-02

Las páginas revisadas todavía explicaban la fórmula legacy y DataForSEO indicó que OpenAPI/changelog estaban en
preparación. Sólo queda confirmar Sandbox y enlazar la documentación final. Esto no bloquea diseño/fixtures, pero
ninguna llamada pagada queda autorizada por la respuesta.

## 3. Inventario de impacto Greenhouse

La matriz del proveedor contiene 14 familias. El repo llama nueve: seis familias/siete caminos consumen ETV y
tres lo ignoran. Las cinco restantes no tienen caller y no se habilitan preventivamente.

| Clasificación | Familias | Tratamiento |
| --- | --- | --- |
| `etv_consumed` | Ranked Keywords (URL visibility + prospect), Relevant Pages, Subdomains, Domain Rank Overview, Historical Rank Overview, Bulk Traffic Estimation | Policy, provenance, persistencia y A/B formula-aware |
| `etv_ignored` | Competitors by Domain, Domain Intersection, Historical SERPs | Guard conductual: no proyectar ETV sin reclasificar y versionar |
| `provider_supported_not_enabled` | SERP Competitors, Categories for Domain, Page Intersection, Historical Bulk Traffic Estimation, Domain Metrics by Categories | Sin caller ni habilitación preventiva |

Keyword Suggestions e Ideas quedan fuera: el proveedor confirmó que no devuelven ETV.

| #   | Consumer                         | Campos/derivados                | Estado observado               | Impacto                                                            |
| --- | -------------------------------- | ------------------------------- | ------------------------------ | ------------------------------------------------------------------ |
| 1   | `domain_rank_overview`           | ETV organic/paid + traffic cost | cron mensual declarado         | Valor y trayectoria cambian; parser no detecta metodología         |
| 2   | `historical_rank_overview`       | ETV/traffic cost por mes        | runner manual                  | Desde julio recomputa; antes aproxima por ratio de julio           |
| 3   | `bulk_traffic_estimation`        | ETV organic/paid                | primitive sin caller adicional | Screening y comparaciones de mercado cambian                       |
| 4   | `ranked_keywords` URL visibility | ETV agregado + ETV por keyword  | cron mensual declarado         | Snapshot, top keywords y comparaciones target/competidor cambian   |
| 5   | `relevant_pages`                 | ETV por página                  | primitive on-demand            | Cambia valor y membresía top-N porque ordena provider-side por ETV |
| 6   | `subdomains`                     | ETV por subdominio              | primitive on-demand            | Mismo doble efecto sobre concentración                             |
| 7   | `ranked_keywords` prospect       | suma ETV de muestra orgánica    | on-demand declarado activo     | Cambia magnitud comercial `estimated_monthly_traffic`              |

### 3.1 Foto de dominio

- Parser: `src/lib/growth/seo/domain-overview/capture.ts:59-124`.
- Request sin fórmula: `capture.ts:437-451`.
- Persistencia: `domain-overview/persist.ts:157-205`.
- Reader/serie: `domain-overview/reader.ts:117-224`.
- Flag/scheduler declarativo: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md:140`.

`estimated_paid_traffic_cost` llega calculado por el proveedor; Greenhouse no lo recompone. Si DataForSEO
conserva su identidad ETV × CPC, cambia junto a ETV y requiere la misma versión metodológica.

### 3.2 Histórico y bulk

- Historical request: `domain-overview/history-backfill.ts:510-526`.
- Meses existentes/pre-check: `history-backfill.ts:264-287`.
- Bulk request: `domain-overview/traffic-estimation.ts:247-263`.
- Bulk parser/outcome: `traffic-estimation.ts:37-91,303-332`.

El backfill considera sembrado un mes por endpoint/fecha, no por fórmula. Un histórico legacy no puede
recomprarse como improved bajo el contrato actual. `correlate: true` relaciona datasets del proveedor, pero no
versiona metodología ni garantiza continuidad estadística.

### 3.3 Visibilidad por dominio/URL/subfolder

- Shape agregado/item: `src/lib/growth/seo/url-visibility/capture.ts:92-118`.
- Proyección ETV/top-N: `capture.ts:136-199`.
- Request sin fórmula: `capture.ts:414-442`.
- Persistencia: `url-visibility/persist.ts:126-174`.
- Flag/scheduler declarativo: `FEATURE_FLAG_STATE_LEDGER.md:139`.

`ranked_keywords` compra detalle ordenado por search volume; la fórmula cambia el ETV de los ítems, pero no su
membresía por ese `order_by` particular. El agregado `metrics` sí cambia.

### 3.4 Concentración de páginas/subdominios

- Request compartido: `url-visibility/relevant-pages.ts:214-229`.
- Exports: `relevant-pages.ts:344-370`.
- Reader, orden y recorte: `url-visibility/reader.ts:281-345`.

Estas primitives piden un límite ordenado por `metrics.organic.etv DESC`. La fórmula puede cambiar tanto el ETV
como qué páginas/subdominios son devueltos y persistidos. El reader vuelve a ordenar por ETV: hay efecto doble.

### 3.5 Diagnóstico SEO de prospectos

- Request: `src/lib/growth/seo/prospect/collect.ts:131-144`.
- Extracción/suma: `prospect/derive.ts:29-39,60-108`.
- Persistencia: `prospect/store.ts:175-203`.
- Flag declarativo: `FEATURE_FLAG_STATE_LEDGER.md:137`.

El hecho `estimated_monthly_traffic` suma hasta 1.000 filas orgánicas. El diagnóstico declara que la muestra puede
estar capped para conteos, pero el hecho de tráfico conserva `basis: etv_sum_organic` sin metodología ni señal
explícita de truncamiento. Formula versioning debe resolver ambos defectos, no sólo agregar el flag.

## 4. Persistencia: por qué el shadow no cabe hoy

### `seo_domain_overview_snapshots`

Clave única:

```text
(normalized_domain, location_code, language_code, capture_date)
```

Fuente: `migrations/20260827190156045_task-1775-seo-domain-overview.sql:35-121`.

No incluye fórmula, source endpoint ni instante. `ON CONFLICT DO NOTHING` descartaría uno de los modelos y el
trigger impide `UPDATE/DELETE`. El pre-check considera fresca una fila legacy aunque cambie la policy.

### `seo_url_visibility_snapshots`

Clave única:

```text
(subject_kind, normalized_subject, location_code, language_code, capture_date)
```

Fuente: `migrations/20260827194219636_task-1776-seo-url-visibility.sql:46-99`.

Tampoco versiona fórmula en snapshot, top keywords o clave.

### Prospect diagnostic/facts

La idempotencia diaria no distingue fórmula (`20260827185848695_task-1709-seo-prospect-diagnostic.sql:40-45`).
`detail_json` permite metadata aditiva, pero hoy sólo guarda la base de cálculo, no metodología (`:53-85`).

## 5. Readers, API y MCP

- Domain reader prioriza source endpoint, no fórmula: `domain-overview/reader.ts:117-203`.
- URL reader hace lo mismo: `url-visibility/reader.ts:105-208`.
- Lanes passthrough: `src/lib/api-platform/resources/ecosystem-growth-seo.ts:393-570`.
- MCP presenta ETV/trayectoria sin versión: `src/mcp/greenhouse/tools.ts:445-475`.
- Tipos DB no tienen metodología: `src/types/db.d.ts:7553-7587,7836-7871`.

Si se agregan dos modelos sin resolver el reader, una línea puede mezclar meses y no podrá explicar el salto.
API/MCP/provenance deben transportar la versión; no basta con conservarla sólo en PG.

## 6. Superficies sin consumo ETV actual

- No existe consumo/persistencia de `clickstream_etv`.
- `keyword_overview` y discovery usan volumen/CPC/KD, no ETV.
- `domain_intersection` y otros endpoints de la matriz pueden devolver ETV, pero el parser actual usa posiciones,
  URL, features y keyword market data; no los consume. La policy futura debe clasificarlos como `etv_ignored`
  explícito o volverlos formula-aware antes de leer cualquier ETV.
- `competitors_domain` del prospect deriva dominio, posición e intersecciones, no ETV.
- `historical_serps` persiste `estimated_traffic = NULL`.
- SERP rank diario/top-N, GSC, Backlinks, OnPage y AEO no dependen del ETV Labs.
- La columna legacy `seo_rank_snapshots.estimated_traffic` no se puebla en el camino vigente.

## 7. Cobertura existente y huecos

Hay tests de parsing para domain, historical, bulk, URL, concentration y prospect. No existen pruebas de:

- selección explícita de fórmula;
- construcción de payload con la versión;
- provenance/clave formula-aware;
- convivencia legacy/improved;
- reader de una serie mixta;
- rebaseline/breakpoint;
- cambio de membresía provider-side;
- propagación API/MCP;
- detección de snapshots sin versión después del cutover.

Las pruebas futuras deben ejercer builders/readers y constraints reales. Un grep que busca el texto
`use_improved_etv` no verifica el comportamiento.

## 8. Qué hay que hacer

### P0 — antes de experimentar

1. **Incorporar la respuesta contractual.** La matriz y semántica ya están confirmadas; Sandbox/OpenAPI son
   seguimiento no bloqueante. Una prueba live sigue requiriendo aprobación y presupuesto.
2. **Abrir ADR + task propia.** Cambian API externa, schema append-only, proyecciones y metodología compartida.
3. **Definir policy canónica** `legacy_v1|improved_v2`; no inyectar el flag en el transporte genérico ni copiarlo
   en siete callsites.
4. **Diseñar provenance/schema formula-aware** para domain, URL y prospect; incluir pre-checks, idempotencia,
   readers, DTO, API y MCP.
5. **Elegir dónde vive el shadow.** Tabla experimental separada o clave productiva que incluya versión; jamás las
   tablas actuales sin migración.

### P0 — antes del corte, con autorización de gasto

6. Ejecutar legacy/improved sobre cohorte representativa: Efeonce CL, Berel MX, competidores, dominios grandes y
   pequeños, intención informational/commercial/local y SERPs con/sin AIO.
7. Comparar contra GSC con período, propiedad, país y cobertura equivalentes: error, correlación, dirección y
   estabilidad. No promediar fuentes.
8. Probar valores y **membresía** de relevant pages/subdomains; revisar traffic cost y suma truncada de prospect.
9. Decidir con evidencia entre:
   - rebaseline versionado, distinguiendo recomputación completa desde julio de 2026 y aproximación calibrada antes; o
   - breakpoint visible desde una fecha explícita, conservando legacy sin comparar el salto.

### P2 — hardening y cutover

10. Tests conductuales de policy, payload, schema, reader, API/MCP y mixed-series failure.
11. Señales: filas sin versión, mezcla de versiones, configured/requested/effective drift y legacy solicitado
    después del corte.
12. Runbook/copy: toda cifra muestra lente estimada, versión/cutover y comparabilidad.
13. Cutover controlado antes del corte obligatorio. Después del 1 de noviembre no existe rollback legacy: el
    procedimiento seguro es congelar capturas y servir la última serie coherente.

## 9. Criterio de cierre futuro

No se considera resuelto por agregar `use_improved_etv: true`. El cierre exige contrato oficial suficiente,
ADR aceptado, schema/provenance, shadow medido, decisión histórica, tests, rollout/readback y series que no
conviertan una revisión de modelo en performance SEO.

## 10. Artefactos de gobierno creados

- ADR aceptado, con implementación/costo/cutover gated:
  `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`.
- Tasks canónicas `to-do`: `TASK-1805` para foundation formula-aware y `TASK-1806` para evaluación/cutover.
- Runbook de evaluación futura: `docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md`.
- Correo de aclaración: `docs/audits/communications/2026-09-01-dataforseo-improved-etv-provider-questions.md`.

Estos artefactos cierran discovery y diseño pre-implementación. No son evidencia de código, migración, llamada al
proveedor, gasto, envío, deploy ni runtime.

## Estado post-implementación 2026-09-03

`TASK-1805` está en producción (release `5ec4cf769977-18572878-583b-43f0-aad0-01eb7b394aba`, run `33698245254`,
PR #217; Slice 3 en PR #216). Cierre punto por punto de §8:

| § 8 | Estado | Qué existe hoy |
|---|---|---|
| 1. Respuesta contractual | Resuelto (1805) | Constantes en `src/lib/growth/seo/etv-methodology/contracts.ts`: corte `ETV_PROVIDER_CUTOFF_ISO = 2026-11-01T00:00:00.000Z`, evidencia `explicit_request \| contract_default_pre_cutoff`, base histórica `fully_recomputed` (desde 2026-07) \| `calibrated_approximation`, `AI_OVERVIEW_ETV_ATTRIBUTION = modeled_uniform_share_among_cited_domains`. Sandbox/OpenAPI públicos siguen como seguimiento no bloqueante. |
| 2. ADR + task propia | Resuelto | ADR `GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md` (§Runtime Contract); `TASK-1805` (foundation) y `TASK-1806` (evaluación/cutover). |
| 3. Policy canónica | Resuelto (1805) | `etv-methodology/policy.ts`: `buildEtvMethodologyRequest` es el único punto que emite `use_improved_etv`; los siete caminos consumidores lo piden por la policy, el transporte genérico no lo conoce y `competitors_domain` no lo recibe. Versiones `legacy_static_v1 \| improved_layout_clickstream_v2`; `ETV_METHODOLOGY_POLICY_VERSION = etv-policy.v1`; selector `GROWTH_SEO_ETV_METHODOLOGY_VERSION`. |
| 4. Provenance/schema formula-aware | Resuelto (1805, fase expand) | Migración `20260902221432772_task-1805-etv-methodology-expand`: columnas `etv_methodology_version` / `etv_methodology_evidence` / `etv_requested_at` / `etv_policy_version` (+ `etv_historical_basis` en domain overview) con CHECKs cerrados y de consistencia; UNIQUE formula-aware `seo_domain_overview_capture_method_unique` y `seo_url_visibility_capture_method_unique`; trigger `guard_seo_etv_methodology_cutoff()`; pre-checks, writers, readers (`etvMethodology` + `not_available_for_method`), lane ecosystem (`errorCode`) y tools MCP (`get_seo_domain_overview`, `get_seo_url_visibility`, `get_seo_prospect_diagnostic`) actualizados. Prospecto: método fijado antes del claim, `estimated_monthly_traffic.detail.etvMethodologyVersion`. **Contract parqueado** en `docs/tasks/pending-migrations/TASK-1805-etv-methodology-contract.sql.pending` (retira DEFAULT transitorios y UNIQUE legacy; CHECK `NOT VALID` en `seo_prospect_diagnostic_facts`); condición: release en `main` (cumplida) + 7 días sin filas con evidencia contractual (cuenta desde 2026-09-03) + selectores explícitos en ambos runtimes (cumplida). |
| 5. Dónde vive el shadow | Resuelto por diseño (1805); ejecución en 1806 | La clave productiva incluye `etv_methodology_version`: legacy e improved coexisten por sujeto/mercado/fecha sin tabla experimental. La coexistencia real por sujeto/día exige el contract (retiro de la UNIQUE legacy), precondición 4 de `TASK-1806`. |
| 6. Cohorte legacy/improved | Pendiente (1806) | Evaluador puro `etv-methodology/evaluator.ts` con gate `GROWTH_SEO_ETV_EVALUATOR_ENABLED` (OFF) y knobs `_SUBJECT_ALLOWLIST` / `_MAX_REQUESTS` / `_BUDGET_USD` (fail-closed por default); `planEtvEvaluation` (`exact_ab` = 2 requests por celda), `dryRunEtvEvaluation` (`providerCalls: 0`). Sin gasto ejecutado. |
| 7. Comparación con GSC | Pendiente (1806) | `compareEtvWithGscBenchmark` compara y nunca promedia; falta la corrida con período/propiedad/país equivalentes. |
| 8. Membresía relevant pages/subdomains, traffic cost, suma truncada | Pendiente (1806) | `compareEtvSnapshots` cubre Jaccard/entradas/salidas/rank del top-N, traffic cost y tráfico del prospecto con truncamiento; `replay.ts` proyecta fixtures con los parsers de producción (fixtures sintéticos en `__fixtures__/`). Sin dato real todavía. |
| 9. Decisión rebaseline vs breakpoint | Pendiente (1806) | `etvMethodology.breakpointDate` viaja en `null`; `resolveEtvHistoricalCalculationBasis` ya distingue `fully_recomputed` / `calibrated_approximation`. |
| 10. Tests conductuales | Resuelto (1805) | Suites en `etv-methodology/__tests__/`, `deploy-contract.test.ts`, `seo-etv-methodology-drift.test.ts`; sanity contra PG real `scripts/growth/_sanity-task-1805-etv-schema.ts` (17/17) y `_sanity-task-1805-etv-evaluator.ts` (8/8). |
| 11. Señales | Resuelto (1805) | `seo.etv_methodology.drift` (steady 0; `awaiting_data` sin evidencia explícita; `error` por drift configurado↔solicitado, legacy post-corte o config inválida; `warning` por evidencia contractual reciente junto a explícita). Filas sin versión no existen por CHECK NOT NULL; la mezcla la rechaza el reader (`mixed_etv_methodology`). |
| 12. Runbook/copy | Parcial | Runbook `docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md` y manuales MCP servidos; el copy de superficie visible con versión/cutover queda para la cara visible del módulo. |
| 13. Cutover controlado | Pendiente (1806) | Selectores explícitos en `legacy_static_v1` en Vercel Production + staging y `services/ops-worker/deploy.sh`; `/health` del worker expone `etvMethodology`. Desde el corte la policy falla cerrado con `legacy_requested_after_cutoff`. |

Estado runtime verificado 2026-09-03: lanes de producción (Berel MX) sirven `etvMethodology.version = legacy_static_v1`
con evidencia `contract_default_pre_cutoff`; señal en `awaiting_data` hasta la primera captura explícita del worker
(día 16/17). Improved NO activado.
