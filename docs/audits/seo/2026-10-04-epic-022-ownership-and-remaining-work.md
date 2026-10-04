# EPIC-022 — ownership y trabajo pendiente tras ajustes (2026-10-04)

- Alcance: redistribución documental autorizada por el operador entre SEO, Marketing Studio e Insights;
  sin implementación, cierre de tasks, cambio de datos, flags, gasto, push o deploy.
- Fuente de estado: campo `Epic` y carpeta de las tasks; arquitectura vigente y criterios de aceptación.
- Evidencia operativa preservada en la [auditoría previa](2026-10-04-epic-022-documentation-reconciliation.md).
  No hubo nuevos readbacks Cloud Run/PostgreSQL/Vercel/BigQuery en esta redistribución.

## Resultado de ownership

Canon: [SEO](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md),
[Marketing Studio](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md) e
[Insights](../../architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md). Estado coordinado en
[EPIC-022](../../epics/in-progress/EPIC-022-growth-seo-search-visibility-360-module.md).

| Owner de producto | Tasks | Alcance conservado |
| --- | --- | --- |
| Greenhouse / SV360 · EPIC-022 | TASK-1668 | Medición SEO/AEO, indexación, ventanas/baselines, cobertura y provenance. Consume refs de publicación, no maneja producción editorial. |
| Marketing Studio · EPIC-049 | TASK-1667, TASK-1669 | Work item/brief, continuidad a producción privada y plan diario advisory; QA/aprobación/calendario/iteraciones se integran con el programa Studio. |
| Efeonce Insights · EPIC-045 | TASK-1672, TASK-1673 | Auditoría técnica y vínculo corrida → edición para compartir/enviar; reuso de renderer, grants, delivery y schedules de Insights. |

Las cuatro reparentadas siguen **to-do**. Conservar sus IDs mantiene trazabilidad: no se eliminó trabajo
ni se acreditó implementación al cambiar su epic.

Studio integra TASK-1907 (plan), TASK-1908 (SEO/AEO), TASK-1913 (trabajo/asignación), TASK-1909/1915
(agentes), TASK-1911 (aprendizajes/calendario) y TASK-1912 (UI). Sus primitives de brief/copy, aprobación y
calendario no prueban un circuito editorial SEO completo ni autorización CMS. Greenhouse conserva las
mediciones y Studio almacena referencias y snapshots de decisión fechados.

Insights ya posee generación/distribución general. **TASK-1992 Slice 6** posee los hechos de auditoría,
binding de corrida/versiones y contrato client-safe; **TASK-1672** consume ese contrato para UI, plan
editorial, catálogos y Think, sin construir otro reader/schema backend. Su dependencia es Slice 6, no
el cierre de toda 1992. La tarjeta «Salud técnica» no sustituye el detalle técnico. **TASK-1673** posee
selección/distribución e idempotencia sobre TASK-1848, que conserva canaries operativos pendientes.
El adaptador SEO actual no consume `readSiteAuditReport`: queda integración, no otro motor de reportes.
Los requisitos anteriores de renderer/grants/sender SEO propios quedan supersedidos.

## Censo y límites

**80 hijas directas: 43 complete, 4 in-progress, 33 to-do; 37 abiertas.** Antes eran 84 = 43 + 3 + 38.
Los cuatro pendientes trasladados siguen abiertos bajo EPIC-049/045; sin cierres ni avance runtime por
reducir el denominador.

- **1284:** conexión/reader y panel entregados; canary histórico de Berel 02/10 y release 03/10.
  Conversions/segmento propio del reader, grader y token-health pendientes, más verificaciones residuales.
  13 pruebas focales PASS 04/10; no nuevo readback Google/PG/env ni nueva conexión.
- **1651:** A operativa; B (SoV longitudinal por org, captura/readers/MCP) no iniciada.
- **1655:** slices 1–4/backfill histórico entregados; export Berel o bloqueo formal con owner,
  commands/paridad MCP y medición de retención pendientes. Evidencia histórica no sustituye BQ actual.
- **1690:** ubicación in-progress, sin implementación iniciada; faltan población/cobertura,
  fixtures y representación honesta de clics/CTR.

## Orden por resultado, sin inventar gates universales

1. **Operación del servicio contratado:** TASK-1690 con EPIC-046 (1852/1853/1854/1855/1856),
   TASK-1660/1691 para objetivos y lente estimada, TASK-1655 para cierre histórico y TASK-1706 para
   compromisos recurrentes. Acceso, servicio y entitlements permanecen explícitos.
2. **Continuidad entre productos:** evidencia/handoff a Studio, outcomes TASK-1668 y auditoría técnica
   de Insights. No esperar todas las ampliaciones para ofrecer una ventana con evidencia suficiente;
   no presentar una integración como disponible sin pruebas.
3. **Calidad, medición y ampliaciones:** consumidor y cobertura identificados. El orden de valor de
   este documento no modifica prioridad ni dependency de ninguna task.
4. **Seis congelados TASK-1312–1317:** clusters requieren operación editorial con volumen real;
   E-E-A-T requiere TASK-1702 productiva y reformulación del juicio evaluado sin score automático.
   TASK-1311 no está congelada.

Esta separación secuencia entregas. No autoriza cerrar EPIC-022 con hijas abiertas ni retirar criterios:
el cierre exige aceptaciones, evidencia operativa y gates comerciales, o cambio formal de alcance.
Cada contrato cliente decide qué ampliaciones necesita. Agrupar una task como señal no la convierte en
blocker de todos los releases ni la elimina del backlog.

## Integraciones y señales — todas existentes; 1284 in-progress, otras 16 to-do

| Task | Prioridad | Grupo | Resultado | Dependencia / límite real |
| --- | --- | --- | --- | --- |
| [TASK-1284](../../tasks/in-progress/TASK-1284-growth-ga4-multitenant-connection-signal.md) | P2 | Conexión | GA4 multiorganización | Conexión/reader entregados, canary histórico 02/10 y release 03/10; conversions/grader/token-health y verificación residual pendientes. |
| [TASK-1426](../../tasks/to-do/TASK-1426-search-console-multi-property-discovery.md) | P1 | Conexión | GSC multi-property y URL Inspection | Extiende TASK-1282; disponibilidad de propiedades según API. HTTP 200 no demuestra indexación. |
| [TASK-1787](../../tasks/to-do/TASK-1787-growth-seo-ai-referral-traffic-attribution.md) | P1 | Atribución | Referrals IA | Consume slice conexión/reader 1284 ya entregado; no espera grader/token-health; sin conexión válida por org devuelve no_ga4_connection, no cero. |
| [TASK-1705](../../tasks/to-do/TASK-1705-growth-seo-onpage-free-post-crawl-harvest.md) | P1 | Crawl | Cosecha OnPage post-crawl | Reutiliza crawl comprado/endpoints disponibles; sin comprar un nuevo crawl on-read. |
| [TASK-1708](../../tasks/to-do/TASK-1708-growth-seo-keyword-seasonality-twelve-month-series.md) | P1 | Mercado | Estacionalidad mensual | Persiste los 12 meses incluidos en keyword_info; no vuelve a comprar el escalar existente. |
| [TASK-1786](../../tasks/to-do/TASK-1786-growth-seo-hreflang-international-consistency.md) | P1 | Crawl | Consistencia hreflang | Crawl/sustrato con cobertura acotada y robots respetado; cobertura ausente no acredita sitio sano. |
| [TASK-1788](../../tasks/to-do/TASK-1788-growth-seo-brand-mentions-unlinked.md) | P2 | Señal | Menciones sin enlace | Nueva familia content_analysis con allowlist y gasto gobernados. |
| [TASK-1789](../../tasks/to-do/TASK-1789-growth-seo-content-decay-detection.md) | P2 | Señal | Content decay | Reader derivado de GSC materializado con ventana suficiente; sin captura nueva. |
| [TASK-1870](../../tasks/to-do/TASK-1870-growth-seo-serp-rotation-signal.md) | P2 | Señal | Rotación de URL SERP | Top-N TASK-1699; serie desde 29/08 no retroactiva; sin GSC ni provider on-read. |
| [TASK-1871](../../tasks/to-do/TASK-1871-growth-seo-bulk-spam-screening.md) | P2 | Señal | Screening bulk de spam | Captura gobernada bulk_spam_score; diagnóstico, sin disavow. |
| [TASK-1808](../../tasks/to-do/TASK-1808-growth-seo-category-market-intelligence.md) | P1 | Mercado | Categorías/mercado temático | ETV TASK-1805/1806 entregado; binding a clusters depende de TASK-1312, no toda adquisición. |
| [TASK-1809](../../tasks/to-do/TASK-1809-growth-seo-serp-competitor-market-sov.md) | P2 | Mercado | SoV orgánico por keyword set | Captura versionada; complementa TASK-1699/1662 sin declarar competidores automáticamente. |
| [TASK-1810](../../tasks/to-do/TASK-1810-growth-seo-page-intersection-coverage.md) | P2 | Mercado | Intersección de páginas | Captura page-pair ETV versionado; TASK-1314 consume evidencia, no posee adquisición. |
| [TASK-1811](../../tasks/to-do/TASK-1811-growth-seo-historical-bulk-traffic-benchmarking.md) | P2 | Mercado | Benchmark histórico bulk | Domain overview TASK-1775 y método TASK-1805/1806; cohortes allowlisted, sin recomprar historia suficiente. |
| [TASK-1791](../../tasks/to-do/TASK-1791-growth-seo-candidate-relevance-signal.md) | P1 | Calidad | Pertinencia de candidatos | Advertencia con evidencia sobre productores actuales; no descarte automático. |
| [TASK-1797](../../tasks/to-do/TASK-1797-growth-seo-impressions-threshold-does-not-discriminate.md) | P2 | Calidad | Umbral de impresiones | Instrumentar elegibles/pedidos/cap antes de modificar constantes. |
| [TASK-1706](../../tasks/to-do/TASK-1706-growth-seo-keyword-tracking-is-recurring-spend-commitment.md) | P1 | Control | Gasto recurrente de tracking | Presupuesto/envelope por org y proyección sobre ledger TASK-1696 entregado. |

## Resto abierto, sin ocultarlo detrás de «integraciones»

| Tasks | Resultado pendiente |
| --- | --- |
| TASK-1284, TASK-1651, TASK-1655, TASK-1690 | Cuatro en curso con límites descritos arriba. |
| TASK-1660, TASK-1691, TASK-1798 | Objetivos, fuente/fecha de mercado y dirección visual del canvas de discovery. |
| TASK-1668 | Outcomes e indexación sobre publicación referenciada por Studio. |
| TASK-1311, TASK-1695 | Atribución de citas por URL y cobertura/higiene del authoring grounded. |
| TASK-1701, TASK-1702 | Hechos por URL y recomendaciones de citabilidad ancladas, sin score LLM. |
| TASK-1704, TASK-1993 | Cadencia/muestreo AIO y referencias de AI Overview ya incluido en SERP; 1993 alimenta 1992. |
| TASK-1713 | Guard de imports cross-dominio y barrel AEO; dependencia TASK-1695. |
| TASK-1312, TASK-1313, TASK-1314 | Clusters/unificado/topical authority, congelados con disparador. |
| TASK-1315, TASK-1316, TASK-1317 | E-E-A-T, congelados con disparador/reformulación pendiente. |

## Inventario exhaustivo de hijas abiertas

Cada una de las 37 hijas abiertas figura una vez, lifecycle por carpeta y prioridad del documento.
No certifica disponibilidad runtime.

| Task | Lifecycle | Prioridad |
| --- | --- | --- |
| [TASK-1284](../../tasks/in-progress/TASK-1284-growth-ga4-multitenant-connection-signal.md) | in-progress | P2 |
| [TASK-1311](../../tasks/to-do/TASK-1311-growth-seo-aeo-citation-attribution-url-grounded-queries.md) | to-do | P3 |
| [TASK-1312](../../tasks/to-do/TASK-1312-growth-seo-topic-cluster-entity-rollup.md) | to-do | P3 |
| [TASK-1313](../../tasks/to-do/TASK-1313-growth-seo-unified-page-cluster-visibility-360-read.md) | to-do | P3 |
| [TASK-1314](../../tasks/to-do/TASK-1314-growth-seo-pillar-cluster-health-topical-authority.md) | to-do | P3 |
| [TASK-1315](../../tasks/to-do/TASK-1315-growth-eeat-signal-extraction-entity-author-trust.md) | to-do | P3 |
| [TASK-1316](../../tasks/to-do/TASK-1316-growth-eeat-rater-rubric-4-pillars-ymyl.md) | to-do | P3 |
| [TASK-1317](../../tasks/to-do/TASK-1317-growth-eeat-scorecard-reader-integration.md) | to-do | P3 |
| [TASK-1426](../../tasks/to-do/TASK-1426-search-console-multi-property-discovery.md) | to-do | P1 |
| [TASK-1651](../../tasks/in-progress/TASK-1651-growth-seo-dataforseo-ai-optimization-llm-sov-foundation.md) | in-progress | P1 (1651-A) · P3 (1651-B) |
| [TASK-1655](../../tasks/in-progress/TASK-1655-growth-seo-historical-data-platform.md) | in-progress | P1 |
| [TASK-1660](../../tasks/to-do/TASK-1660-growth-seo-keyword-targets-surface.md) | to-do | P1 |
| [TASK-1668](../../tasks/to-do/TASK-1668-growth-seo-editorial-qa-outcome-iteration-loop.md) | to-do | P1 |
| [TASK-1690](../../tasks/in-progress/TASK-1690-growth-seo-client-surface-population-states.md) | in-progress | P1 |
| [TASK-1691](../../tasks/to-do/TASK-1691-seo-keywords-lente-de-mercado.md) | to-do | P2 |
| [TASK-1695](../../tasks/to-do/TASK-1695-aeo-grounded-author-coverage-register-hygiene.md) | to-do | P2 |
| [TASK-1701](../../tasks/to-do/TASK-1701-growth-analyze-url-content-facts-no-score.md) | to-do | P1 |
| [TASK-1702](../../tasks/to-do/TASK-1702-growth-deterministic-citability-signals-url-anchored-recommendation.md) | to-do | P1 |
| [TASK-1704](../../tasks/to-do/TASK-1704-growth-cadence-sampling-aio-weekly-n3.md) | to-do | P1 |
| [TASK-1705](../../tasks/to-do/TASK-1705-growth-seo-onpage-free-post-crawl-harvest.md) | to-do | P1 |
| [TASK-1706](../../tasks/to-do/TASK-1706-growth-seo-keyword-tracking-is-recurring-spend-commitment.md) | to-do | P1 |
| [TASK-1708](../../tasks/to-do/TASK-1708-growth-seo-keyword-seasonality-twelve-month-series.md) | to-do | P1 |
| [TASK-1713](../../tasks/to-do/TASK-1713-growth-cross-domain-import-lint-and-aeo-barrel.md) | to-do | P2 |
| [TASK-1786](../../tasks/to-do/TASK-1786-growth-seo-hreflang-international-consistency.md) | to-do | P1 |
| [TASK-1787](../../tasks/to-do/TASK-1787-growth-seo-ai-referral-traffic-attribution.md) | to-do | P1 |
| [TASK-1788](../../tasks/to-do/TASK-1788-growth-seo-brand-mentions-unlinked.md) | to-do | P2 |
| [TASK-1789](../../tasks/to-do/TASK-1789-growth-seo-content-decay-detection.md) | to-do | P2 |
| [TASK-1791](../../tasks/to-do/TASK-1791-growth-seo-candidate-relevance-signal.md) | to-do | P1 |
| [TASK-1797](../../tasks/to-do/TASK-1797-growth-seo-impressions-threshold-does-not-discriminate.md) | to-do | P2 |
| [TASK-1798](../../tasks/to-do/TASK-1798-growth-seo-discovery-canvas-visual-direction.md) | to-do | P3 |
| [TASK-1808](../../tasks/to-do/TASK-1808-growth-seo-category-market-intelligence.md) | to-do | P1 |
| [TASK-1809](../../tasks/to-do/TASK-1809-growth-seo-serp-competitor-market-sov.md) | to-do | P2 |
| [TASK-1810](../../tasks/to-do/TASK-1810-growth-seo-page-intersection-coverage.md) | to-do | P2 |
| [TASK-1811](../../tasks/to-do/TASK-1811-growth-seo-historical-bulk-traffic-benchmarking.md) | to-do | P2 |
| [TASK-1870](../../tasks/to-do/TASK-1870-growth-seo-serp-rotation-signal.md) | to-do | P2 |
| [TASK-1871](../../tasks/to-do/TASK-1871-growth-seo-bulk-spam-screening.md) | to-do | P2 |
| [TASK-1993](../../tasks/to-do/TASK-1993-growth-seo-ai-overview-citation-capture.md) | to-do | P1 |

## Verificación documental

- Censo canónico sólo `docs/tasks/{to-do,in-progress,complete}` por campo Epic/carpeta: **80 = 43 complete + 4 in-progress + 33 to-do**, 37 abiertas, confirmado tras los cuatro reparentings.
- Inventario exhaustivo: **37 IDs únicos**, conjunto idéntico a las hijas abiertas actuales; excluye planes y duplicados no canónicos.
- `pnpm epic:lint --item EPIC-022`: **0 errores / 0 warnings**.
- **81 enlaces locales** de epic/auditoría resuelven; `git diff --check` focal: **PASS**.
- Sin nueva validación runtime, env, BQ, login cliente, correo ni informe final.

### Revisión final integrada

- Tres subagentes con ownership separado; integración y revisión cruzada en el checkout compartido.
- `pnpm task:lint --changed`: 19 tasks, 0 errores / 0 warnings tras sincronizar el traslado de TASK-1284.
- `pnpm epic:lint --item <EPIC-022|045|049|046>`: cada epic focal 0 errores / 0 warnings.
- `pnpm ops:lint --changed`: exit 0; 13 avisos globales preexistentes de paridad en otros epics, iguales al preflight y fuera del alcance.
- `pnpm skills:mirrors`: PASS; sólo paths explícitos editados, WIP ajeno preservado.
- `node scripts/check-documentation-closure.mjs --strict -- <scope>`: 0 warnings sobre 66 paths propios antes de la rotación de contexto; el wrapper global no propaga el pathspec al primer comando.
- Enlaces locales añadidos/nuevos: 165 comprobados, 0 rotos. Seis snapshots históricos comparados byte-for-byte contra HEAD: PASS.
- `git diff --check -- <scope>`: PASS. TASK-1284 registra 13 tests focales PASS y evidencia histórica 02–03/10; sin nuevo consentimiento ni readback productivo.
- `pnpm docs:context-check:strict`: 0 errores / 0 warnings después de rotar una entrada de changelog al historial 2026-09 y acortar el puntero SEO de Handoff. Historia preservada por el rotador y su gate.

**Resultado:** reconciliación documental y de ownership; ningún cierre de implementación, informe emitido, publicación, commit, push ni deploy por este cambio. Las 37 tareas SEO abiertas siguen teniendo dueño e inventario explícito.
