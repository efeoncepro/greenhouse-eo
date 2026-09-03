# TASK-1808 — Growth SEO: inteligencia de categorías y mercado temático

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno; no implementada ni habilitada`
- Rank: `TBD`
- Domain: `growth|seo|data|integration|ops`
- Blocked by: `el binding contra clusters también por TASK-1312`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Incorpora `categories_for_domain` y `domain_metrics_by_categories` de DataForSEO Labs como una capacidad
gobernada de Category Market Intelligence. La primera explica la huella de visibilidad de un dominio por
categoría; la segunda descubre el universo competitivo y su dinámica para categorías declaradas. Ambas alimentan
topic clusters y topical authority como evidencia externa estimada, pero nunca sustituyen ni crean automáticamente
la entidad `seo_topic_clusters`.

La task entrega adquisición async con gasto gobernado, persistencia append-only y formula-aware, bindings
temporales bajo `propose → confirm → execute`, readers canónicos, API Platform y MCP. Su registro no autoriza
migraciones, llamadas pagadas, flags, schedulers, deploy ni activación productiva.

## Why This Task Exists

El módulo SEO ya observa keywords, dominios, páginas y competidores, pero no posee una lectura estable de dos
preguntas de mercado: **«¿en qué categorías ya tiene visibilidad este dominio?»** y **«¿qué dominios ganan o
pierden terreno dentro de la categoría que queremos desarrollar?»**. DataForSEO expone esas dos direcciones con
grains distintos: dominio → categorías mediante `categories_for_domain`, y conjunto de categorías → dominios con
historia mediante `domain_metrics_by_categories`.

Usar esos resultados directamente como topic clusters sería incorrecto. DataForSEO emplea categorías externas de
productos y servicios de Google; un category code no conoce nuestra arquitectura editorial, la intención del
cliente, la relación pillar/supporting ni la autoría de una decisión. `TASK-1312` conserva el source of truth de
clusters y membresías. Esta task sólo propone bindings trazables entre ambas taxonomías y exige confirmación humana
antes de volverlos configuración vigente.

El cambio también está atravesado por Improved ETV. Ambos endpoints devuelven ETV, traffic cost y métricas por
item type. Después de `2026-11-01T00:00:00Z` DataForSEO no ofrece legacy como opt-out, y la respuesta no incluye un
identificador de fórmula. Habilitar estos endpoints sin la foundation de `TASK-1805` y el cutover verificado de
`TASK-1806` produciría observaciones imposibles de comparar y podría alterar el top-N de dominios o categorías sin
explicación.

## Goal

- Capturar y persistir la huella de categorías de targets y competidores declarados mediante
  `categories_for_domain`, con mercado, cobertura, coste y metodología ETV explícitos.
- Capturar y persistir paisajes competitivos por conjuntos de hasta cinco categorías mediante
  `domain_metrics_by_categories`, incluyendo historia, muestra/truncamiento y método de cálculo histórico.
- Mantener la taxonomía externa separada de `seo_topic_clusters`; proponer bindings y escribirlos sólo tras
  confirmación autorizada, con autoría y vigencia temporal.
- Exponer readers canónicos reutilizables por API Platform, MCP, Nexa y `TASK-1314`, sin llamadas live-per-view ni
  lógica duplicada en consumers.
- Operar la capacidad en ops-worker con entitlement, forecast, tope USD, spend ledger, breaker, dry-run, flags
  default OFF y señales de confiabilidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Las categorías DataForSEO son **evidencia externa**, no source of truth ni auto-creador de topic clusters.
- `seo_topic_clusters` y su membership conservan ownership en `TASK-1312`; esta task sólo agrega bindings
  temporales con autoría y evidencia.
- El binding siempre sigue `propose → confirm → execute`; una respuesta del proveedor nunca escribe configuración
  de cluster por sí sola.
- `categories_for_domain` y `domain_metrics_by_categories` son dos hechos con grains distintos. No se fuerzan en
  una tabla plana ni se suman sus ETV.
- Toda medición es append-only. Un run fallido no consume freshness; un run capturado con cero filas sí es un
  veredicto persistido y evita recompra infinita.
- ETV lleva `configured_method`, `requested_method`, `provider_effective_method`, base de evidencia y timestamp
  UTC. La API del proveedor no devuelve fórmula aplicada.
- Desde `2026-11-01T00:00:00Z`, pedir legacy falla antes de la llamada; `use_improved_etv:false` no es rollback.
- `include_clickstream_data` permanece `false`; no se compra `clickstream_etv` para habilitar Improved ETV.
- Categorías pueden solaparse. ETV, count y traffic cost por categoría no se agregan como particiones exhaustivas
  del dominio ni como sustituto de GSC.
- GSC es primera parte para el dominio propio; DataForSEO sigue siendo lente `estimated`. Nunca se promedian.
- Un límite o filtro provider-side declara `total_count`, `items_count`, `limit` y truncamiento. Ausencia en top-N
  no equivale a cero ni a inexistencia.
- El dato competitivo crudo permanece internal-only con 404 anti-oracle; cualquier proyección client-facing
  futura requiere task UI/UX y redacción separada.
- Todo request sale por `postDataForSeoTask`, `family:'labs'`, `consumer:'seo'`, con `organizationId`, entitlement,
  forecast, spend ledger y breaker. Nunca se crea un fetch o SDK paralelo.
- La adquisición corre async en ops-worker; ningún dashboard, API de lectura o tool MCP dispara gasto al leer.

## Normative Docs

- `docs/tasks/to-do/TASK-1805-growth-seo-dataforseo-improved-etv-versioned-transition.md`
- `docs/tasks/to-do/TASK-1806-growth-seo-dataforseo-improved-etv-evaluation-cutover.md`
- `docs/tasks/complete/TASK-1775-growth-seo-domain-overview-competitive-history.md`
- `docs/tasks/to-do/TASK-1312-growth-seo-topic-cluster-entity-rollup.md`
- `docs/tasks/to-do/TASK-1314-growth-seo-pillar-cluster-health-topical-authority.md`
- `docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md`
- `docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md`
- `.codex/skills/dataforseo-operator/SKILL.md`
- `.claude/skills/dataforseo-operator/references/02-labs.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `.codex/skills/seo-aeo/SKILL.md`
- `.codex/skills/seo-aeo/modules/07_MEASUREMENT.md`
- [DataForSEO Categories For Domain](https://docs.dataforseo.com/v3/dataforseo_labs-google-categories_for_domain-live/)
- [DataForSEO Domain Metrics By Categories](https://docs.dataforseo.com/v3/dataforseo_labs-google-domain_metrics_by_categories-live/)
- [DataForSEO Labs Categories](https://docs.dataforseo.com/v3/dataforseo_labs-categories/)
- [DataForSEO Labs Google pricing](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api)

## Dependencies & Impact

### Depends on

- `TASK-1805` — policy y persistencia formula-aware. Bloqueador duro para cualquier writer ETV nuevo.
- `TASK-1806` — Improved ETV activado y verificado antes de habilitar estos dos endpoints; no existe fallback
  legacy posterior al corte.
- `TASK-1775` — patrón existente de domain overview, adquisición Labs, pricing, freshness, runner y lectura de
  targets/competidores. Se reusa; no se reabre ni se mezcla su grain con categoría.
- `TASK-1312` — `seo_topic_clusters`, membership pillar/supporting y reader de rollup. Bloqueador del binding
  cluster-category, aunque la captura de huella externa sea conceptualmente independiente.
- `TASK-1299`, `TASK-1300`, `TASK-1301`, `TASK-1662` y `TASK-1696` completas como foundation de targets,
  capabilities, competitors, entitlement y spend por consumer.
- `src/lib/ai/dataforseo.ts`, `src/lib/growth/seo/entitlement.ts`,
  `src/lib/growth/seo/provider-pricing.ts` y `src/lib/growth/seo/register-provider-spend.ts`.

### Blocks / Impacts

- Alimenta `TASK-1314` con `readSeoTopicClusterMarketEvidence`; `TASK-1314` compone el diagnóstico y nunca llama
  al proveedor.
- Amplía el endpoint inventory formula-aware de `TASK-1805` y la cobertura del cutover de `TASK-1806` para toda
  captura que exista después de esta implementación.
- Impacta ops-worker, PostgreSQL, API Platform, MCP manifest/federación, spend reporting y Platform Health.
- Puede habilitar una futura task UI/UX de topical authority, pero esta task no crea ruta, componente ni copy.

### Files owned

- `src/lib/growth/seo/category-market/**` [nuevo]
- `migrations/*_task-1808-*.sql` [nuevo]
- `src/types/db.d.ts` sólo mediante generación canónica.
- `src/lib/growth/seo/provider-pricing.ts`
- `src/lib/growth/seo/flags.ts`
- `src/lib/growth/seo/lens-surface-manifest.ts`
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts`
- `src/mcp/greenhouse/tool-manifest.ts`
- `src/mcp/greenhouse/tool-manifest.generated.json`
- `src/mcp/greenhouse/server.ts`
- `src/mcp/greenhouse/tools.ts`
- `services/ops-worker/server.ts`
- `services/ops-worker/deploy.sh`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/manual-de-uso/growth/operar-category-market-intelligence-seo.md` [nuevo]

## Current Repo State

### Already exists

- Cliente DataForSEO único con familia `labs`, Basic auth, timeout, breaker y spend ledger.
- Targets y competidores declarados con organización, autoría y entitlement `seo_v2`.
- `seo_domain_overview_snapshots` y sus captures/readers como patrón de observación Labs multi-productor.
- `seo_keyword_market_data` como hecho compartido multi-productor para keyword data ya pagada.
- API Platform/MCP/ops-worker y manifest de lentes como consumers canónicos del módulo SEO.
- ADR de ETV y tasks `TASK-1805`/`TASK-1806` que separan foundation, shadow y cutover.
- Diseño de `seo_topic_clusters` en `TASK-1312` y del derived read de topical authority en `TASK-1314`.

### Gap

- No hay caller para `categories_for_domain` ni `domain_metrics_by_categories`.
- No hay SoT append-only para huella dominio-categoría, paisajes category-domain, request cohort, cobertura,
  método ETV, coste o histórico recalibrado.
- No existe un binding gobernado entre category codes externos y topic clusters internos.
- `TASK-1314` sólo puede usar keyword gap genérico; carece de evidencia externa de huella y competencia por
  categoría.
- No hay reader/API/MCP para responder qué categorías gana un dominio ni quién gana una categoría.
- Los precios y shapes públicos siguen sin exponer `use_improved_etv`; la compatibilidad viene de la respuesta
  contractual del proveedor y requiere tests/smoke propios antes del rollout.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/category-market/**` como dominio canónico; ops-worker adquiere y API/MCP leen.
- Future candidate home: `domain-package`
- Boundary: commands de captura/binding y readers `readSeoDomainCategoryFootprint`,
  `readSeoCategoryLandscape` y `readSeoTopicClusterMarketEvidence`; API, MCP, Nexa y worker son adapters.
- Server/browser split: provider, DB, policy ETV, spend y commands son server-only; contratos/DTO pueden vivir en
  un archivo browser-safe sin imports de DB, secrets o `server-only`.
- Build impact: sin SDK nuevo ni filesystem input; el worker y Vercel compilan el mismo contrato de dominio.
- Extraction blocker: transacciones PostgreSQL, entitlement/spend compartidos, provider credentials y coordinación
  cross-runtime del flag/ETV impiden extracción independiente hoy.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: nuevas observaciones y bindings de `greenhouse_growth`; `seo_topic_clusters` sigue
  siendo el SoT del cluster y DataForSEO el proveedor de evidencia externa.
- Consumidores afectados: `ops-worker|API Platform|MCP|Nexa|TASK-1314|Platform Health|spend reporting`
- Runtime target: `local|staging|production|worker|cron|external`

### Contract surface

- Contrato existente a respetar: transporte `src/lib/ai/dataforseo.ts`, policy de `TASK-1805`, cutover
  `TASK-1806`, target/competitor model, `growth.seo.target.configure`, `growth.seo.observation.read`, API Platform
  y MCP manifest.
- Contrato nuevo o modificado: captures `captureDomainCategoryFootprint`/
  `captureCategoryMarketLandscape`; commands `confirmTopicClusterCategoryBindings`/
  `retireTopicClusterCategoryBindings`; readers `readSeoDomainCategoryFootprint`, `readSeoCategoryLandscape`,
  `proposeTopicClusterCategoryBindings` y `readSeoTopicClusterMarketEvidence`; tablas append-only y proyecciones
  API/MCP correspondientes.
- Backward compatibility: `gated`; todo es aditivo, default OFF y no altera readers/captures vigentes.
- Full API parity: la lógica vive en primitives server-side. Ops-worker ejecuta captures; API/Nexa/MCP consumen
  los mismos readers/commands. Ningún consumer escribe tablas o arma payloads DataForSEO por su cuenta.

### Data model and invariants

- Entidades/tablas/views afectadas:
  - `greenhouse_growth.seo_category_intelligence_runs` — run ledger append-only para catálogo,
    `categories_for_domain` y `domain_metrics_by_categories`;
  - `greenhouse_growth.seo_market_category_taxonomy_items` — taxonomía externa versionada por run;
  - `greenhouse_growth.seo_domain_category_observations` — dominio×mercado×categoría×item type×captura×método;
  - `greenhouse_growth.seo_category_domain_observations` — category set×mercado×período×dominio×item type×método;
  - `greenhouse_growth.seo_topic_cluster_category_bindings` — config temporal confirmada, con actor/source,
    `proposal_ref`, role y `effective_from/to`.
- Invariantes que no se pueden romper:
  - category code externo nunca es `cluster_id`, no crea cluster ni membership pillar/supporting;
  - observaciones/runs bloquean `UPDATE` y `DELETE`; bindings se retiran cerrando vigencia, nunca DELETE;
  - un run `captured` con cero filas es éxito persistido; `failed` lleva error sanitizado y no satisface freshness;
  - una observación referencia exactamente un run y hereda mercado, endpoint, captura y método ETV;
  - mismo subject/request/mercado/período/método admite a lo sumo un run capturado fresco; fallos reintentan;
  - el category set se guarda canónico y con hash; orden de los mismos códigos no crea otra identidad;
  - `domain_metrics_by_categories` admite como máximo cinco códigos y dos meses distintos;
  - `total_count`, `items_count`, `limit`, sample coverage, `correlate` y truncation permanecen auditables;
  - no se suma ETV de categorías solapadas ni se interpreta ausencia en top-N como valor cero;
  - `estimated_paid_traffic_cost` comparte la metodología ETV y permanece en USD;
  - historia desde julio de 2026 declara `full_recomputation`; períodos anteriores declaran
    `july_2026_ratio_approximation`; ningún reader los presenta como una sola precisión homogénea;
  - valores inexistentes se persisten como `NULL`/estado explícito, nunca como cero fabricado.
- Write-target allowlist: todas las tablas nuevas se agregan, con justificación, al boundary test/allowlist de
  destinos Growth SEO en el mismo PR; ningún wildcard autoriza todo `greenhouse_growth`.
- Tenant/space boundary: organization se deriva server-side desde target/cluster; raw category landscape y spend
  son internal-only. `captured_by_organization_id` atribuye gasto y nunca vuelve client-facing.
- Idempotency/concurrency: request hash canónico + índice único parcial sobre runs capturados; lock/advisory lock
  por subject/category set y ciclo; un fallo no consume la ranura; writer de run y observations usa una
  transacción por respuesta válida.
- Audit/outbox/history: runs y observations son append-only; binding conserva actor, source, propuesta y vigencia.
  Emitir outbox sólo para binding confirmado/retirado si Plan Mode verifica un consumer reactivo real; las
  capturas se observan mediante signal/reader, no por evento decorativo.

### Migration, backfill and rollout

- Migration posture: `additive` — tablas, constraints, índices, grants y triggers nuevos; tipos DB regenerados.
- Default state: `GROWTH_SEO_CATEGORY_MARKET_INTELLIGENCE_ENABLED=false` en Vercel y ops-worker; scheduler nuevo
  nace pausado; readers devuelven `disabled|not_available` sin fallback live.
- Backfill plan: sin backfill automático. Taxonomía gratuita primero; después dry-run de huella y landscape con
  targets/category sets allowlisted, máximo de filas y tope USD; apply sólo con aprobación explícita.
- Rollback path: flag OFF + scheduler pausado + revert del código. Evidencia append-only queda legible; no borrar
  runs, observations ni bindings confirmados. Reverse migration sólo antes de datos reales y con verificación.
- External coordination: verificar tarifas reales con `/v3/appendix/user_data`; aprobar budget/cadencia; comprobar
  payload Improved ETV en sandbox si el proveedor lo habilita y con un smoke productivo mínimo autorizado si no.

### Security and access

- Auth/access gate: captures internos con entitlement `seo_v2` + budget; readers bajo
  `growth.seo.observation.read`; confirmar/retirar bindings bajo `growth.seo.target.configure`; tools de write con
  `efeonce.mcp.seo.write`; landscapes competitivos sólo binding `internal` y 404 anti-oracle.
- Sensitive data posture: sin PII ni secretos en tablas; contiene inteligencia competitiva y estructura de costos
  internas. Credenciales quedan en el resolver DataForSEO vigente y nunca en logs/payloads persistidos.
- Error contract: `disabled|target_not_found|cluster_not_found|no_entitlement|budget_exhausted|quota_exhausted|`
  `invalid_category_set|invalid_period|not_available_for_method|provider_error|no_market_data|query_failed`;
  errores externos sanitizados y `captureWithDomain` server-side.
- Abuse/rate-limit posture: límite máximo 1.000 items, máximo cinco categorías, batch/cadencia acotados,
  entitlement, spend forecast, breaker de familia `labs`, lock de ciclo y prohibición de read-triggered capture.

### Runtime evidence

- Local checks: tests puros de payload/parser/cost/hash, policy ETV, overlap de categorías, cap/truncation,
  propose-confirm-execute, acceso y mixed-method rejection; `pnpm typecheck` y lint focal.
- DB/runtime checks: aplicar migración en staging, inspeccionar constraints/triggers/grants, probar transacción y
  anti-mutation contra PostgreSQL real, regenerar `src/types/db.d.ts` y ejecutar sanity con rollback.
- Integration checks: fixture/replay primero; sandbox sin gasto cuando soporte el flag; después dry-run y smoke
  bounded en staging con autorización de gasto, verificando task-level `status_code=20000`, costo real y rows.
- Reliability signals/logs: `seo.category_intelligence.stale`, `seo.category_intelligence.capture_failed`,
  `seo.category_intelligence.method_mismatch`, `seo.category_intelligence.truncated` y spend existente por
  `consumer='seo'`.
- Production verification sequence: migración → deploy flag OFF → taxonomy sync → dry-run allowlisted → writer
  staging → reader/API/MCP readback → signals → deploy prod flag OFF → bounded canary → scheduler/cadencia
  explícitamente aprobados.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio,
      en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime and DB evidence includes PostgreSQL real plus provider fixture/sandbox/canary bounded.
- [ ] Errores, inteligencia competitiva, spend y secretos respetan redacción, acceso y anti-oracle.

## Capability Definition of Done — Full API Parity gate

- [ ] La adquisición, parsing, policy, binding y composición viven en primitives `src/lib/growth/seo/**`, no en
      route handlers, tools o componentes.
- [ ] Category footprint, category landscape y cluster-category binding están modelados como recursos/aggregate,
      commands y readers, no como click handlers.
- [ ] Reads usan readers canónicos; writes usan commands con capability fina, idempotencia, autoría, errores
      sanitizados, observabilidad y audit/history.
- [ ] Capabilities/grants existentes se verifican en el mismo PR; cualquier capability nueva incluye registry,
      grant a un rol real y coverage test.
- [ ] API Platform y MCP consumen los mismos primitives, con raw landscape internal-only y 404 anti-oracle.
- [ ] `proposeTopicClusterCategoryBindings` no escribe; `confirmTopicClusterCategoryBindings` requiere actor y
      autorización; `retireTopicClusterCategoryBindings` conserva historia.
- [ ] UI, Nexa, MCP, API y worker no duplican decisión de taxonomy, fórmula ETV, acceso ni gasto.
- [ ] Parity check = SÍ: cada lectura y binding tiene contrato gobernado a nivel capability.

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

### Slice 1 — Contrato de proveedor, categorías y coste

- Cerrar shapes tipados de catálogo, `categories_for_domain` y `domain_metrics_by_categories`, incluyendo status
  por task, caps, filtros, item types, historia, ETV/traffic cost y estados nulos.
- Ampliar la policy endpoint-aware de `TASK-1805` y pricing preview; verificar tarifa real en `user_data` antes de
  cualquier presupuesto o request pagado.
- Implementar estimadores deterministas: ordinary Labs para huella y historical/market-analysis para landscape.

### Slice 2 — Foundation PostgreSQL append-only

- Crear migración additive con run ledger, taxonomy items, observations de ambos grains y bindings temporales.
- Agregar constraints, índices únicos parciales, foreign keys, grants, triggers anti-mutation y verificación
  post-DDL; declarar destinos en el write-target allowlist del dominio.
- Regenerar tipos desde PostgreSQL y probar coexistencia de métodos/period bases sin overwrite.

### Slice 3 — Primitives de adquisición y binding

- Implementar sync gratuito de taxonomía y captures server-only con entitlement, forecast, spend, breaker,
  freshness, transacción y resultado por subject/category set.
- Implementar `proposeTopicClusterCategoryBindings` como read puro y los commands confirm/retire con actor,
  proposal ref, autorización, idempotencia y vigencia.
- Mantener `include_clickstream_data=false`, ordenamientos/filtros estables y cobertura/truncamiento explícitos.

### Slice 4 — Readers y evidencia para topical authority

- Implementar `readSeoDomainCategoryFootprint`, `readSeoCategoryLandscape` y
  `readSeoTopicClusterMarketEvidence` con una metodología por lectura, bases históricas visibles y degradación
  honesta.
- Entregar a `TASK-1314` señales nombradas de market coverage/competition; no calcular aquí un score de topical
  authority ni capturar AEO/GSC.
- Probar categorías solapadas, dominio fuera de muestra, no-market-data, serie mixta y pre-julio aproximado.

### Slice 5 — API Platform, MCP y provenance

- Exponer recursos/commands por API Platform con capability fina y projections allowlisted.
- Registrar tools MCP, manifest generado, scopes y lane internal-only para inteligencia competitiva cruda.
- Ampliar lens/provenance coverage para cada cifra; ningún numeric field queda sin source, capturedAt, método o
  unidad.

### Slice 6 — Ops-worker, signals y rollout

- Integrar runners async, flags dual-runtime y scheduler mensual nacido pausado; evitar read-triggered provider
  calls.
- Implementar dry-run de cohorte/costes y señales de stale, failure, method mismatch y truncation.
- Ejecutar rollout backend-critical en orden, con aprobación separada para provider spend, canary y scheduler.

## Out of Scope

- Crear, renombrar, fusionar o poblar topic clusters automáticamente desde category codes.
- Implementar `TASK-1312`, `TASK-1314` o una UI de topical authority.
- Activar Improved ETV, ejecutar su shadow o reabrir decisiones de `TASK-1805`/`TASK-1806`.
- Habilitar `page_intersection`, `serp_competitors` o `historical_bulk_traffic_estimation`; pertenecen a unidades
  posteriores de Competitive Search Topology y Portfolio Historical Intelligence.
- Comprar clickstream data, guardar demografía o usar `clickstream_etv`.
- Hacer llamadas provider desde Vercel, UI, API read o MCP read.
- Exponer raw competitor landscape, spend o `captured_by_organization_id` al portal cliente.
- Crear una tabla/materialización de topical-authority score o mezclar tablas `seo_*` con `grader_*`.

## Detailed Spec

### Semántica de los dos endpoints

`categories_for_domain` responde desde un dominio hacia categorías. V1 usa `organic` como item type principal,
ordena por `metrics.organic.count DESC` y evita filtros/order por ETV para que la membresía de la muestra no cambie
por metodología. ETV y traffic cost se conservan como valores formula-aware secundarios. El reader declara que
las categorías pueden ser jerárquicas y solapadas.

`domain_metrics_by_categories` responde desde uno a cinco category codes hacia dominios relevantes entre dos
meses distintos. V1 usa un category set canónico, `correlate:true`, `include_subdomains:false` salvo caso aprobado,
límites gobernados y orden no dependiente de ETV. `top_categories_count` no expande el scope silenciosamente: el
request y el reader distinguen categorías solicitadas de categorías adicionales reportadas.

### Binding externo → interno

El proposal reader compone:

- category footprint del target y competidores declarados;
- category landscape y su cobertura/truncamiento;
- `seo_topic_clusters` y membership vigente de `TASK-1312`;
- evidencia/captura/método del run fuente.

Devuelve candidatos con `categoryCode`, nombre/path de taxonomía, rol sugerido, evidencia, confianza explicada y
`proposalRef` opaca. No crea clusters ni bindings. El command de confirmación recibe cluster existente, códigos
seleccionados y actor; comprueba tenant/capability y abre bindings vigentes. Retirar cierra `effective_to` con
actor; nunca borra la decisión histórica.

### Costo y cadencia inicial

- Sync de catálogo: gratuito, mensual o cuando cambie su hash.
- Category footprint: onboarding + mensual para target y competidores declarados; costo máximo estimado ordinary
  Labs de `USD 0.012 + items × 0.00012` por dominio/mercado, sujeto a `user_data` vigente.
- Category landscape: onboarding + mensual sólo para clusters estratégicos; trimestral para los demás. Forecast
  historical/market-analysis de `USD 0.12 + domains × 0.0012` por category set/mercado, sujeto a `user_data`.
- El scheduler nace pausado y no se despausa hasta que dry-run, canary, gasto y readback estén aprobados.

## Rollout Plan & Risk Matrix

La entrega es additive y default OFF, pero backend-critical por introducir integración pagada, migración, commands
de configuración, cron y un nuevo hecho competitivo. Implementación lista no equivale a activación.

### Slice ordering hard rule

- `TASK-1805 complete → TASK-1806 cutover verificado → TASK-1312 complete` antes de habilitar cualquier path.
- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6.
- La migración y policy deben estar desplegadas antes del primer writer.
- Readers/API/MCP permanecen disabled hasta que existan filas canary verificadas.
- Signals y dry-run deben cerrar antes de cualquier request pagado o scheduler enable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Category code externo se vuelve cluster automático | config/SEO | medium | binding propose-confirm-execute; FK a cluster existente; cero auto-create | audit de binding sin actor/proposal |
| Fórmula ETV cambia valor o top-N sin explicación | DataForSEO/series | high | policy TASK-1805, método en identidad, orden no-ETV, mixed-series reject | `seo.category_intelligence.method_mismatch` |
| Categorías solapadas inflan coverage/ETV | reader/reporting | high | prohibir sumas exhaustivas; señales por categoría y caveat estructural | test overlap + data-quality log |
| Top-1.000 oculta dominio y se interpreta como cero | provider/data | medium | total/items/limit/truncated; estado outside sample | `seo.category_intelligence.truncated` |
| Cron recompra datos frescos o excede presupuesto | ops-worker/cost | medium | freshness por método, forecast batch, entitlement, lock y scheduler pausado | spend guard + capture count |
| Raw competitive intelligence cruza tenant | API/MCP | low | internal binding, 404 anti-oracle, redaction y auth coverage | access-denied audit |
| Historia pre-julio se presenta como recomputación completa | reporting | medium | calculation basis por punto; no YoY homogéneo | contract/mixed-basis test |
| Catálogo externo cambia nombre/padre | taxonomy | medium | snapshots versionados por hash/run; bindings por code+evidence | taxonomy drift signal |

### Feature flags / cutover

- `GROWTH_SEO_CATEGORY_MARKET_INTELLIGENCE_ENABLED` default `false` en Vercel y ops-worker. En worker controla
  sync/capture; en Vercel controla readers/projections, no proveedor.
- Subordinado a `GROWTH_SEO_ENABLED` y al método efectivo Improved ETV de `TASK-1806`.
- Scheduler nace `PAUSED`. Enable exige canary verde, aprobación de gasto y estado documentado en
  `FEATURE_FLAG_STATE_LEDGER.md`.
- Revert operativo: flag `false` en ambos runtimes + scheduler pausado. Las filas existentes siguen legibles y
  etiquetadas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revertir contratos/policy antes de writers | <30 min | sí |
| 2 | reverse migration sólo sin datos; con datos, conservar schema additive y deshabilitar | <60 min | parcial |
| 3 | flag OFF; conservar runs/observations/bindings append-only | <10 min | sí para comportamiento |
| 4 | revertir reader/projection a `not_available`; no tocar evidencia | <30 min | sí |
| 5 | retirar tools/routes del manifest y redeploy; conservar primitive | <60 min | sí |
| 6 | pausar scheduler + flag OFF en worker/Vercel | <10 min + redeploy | sí |

### Production verification sequence

1. Verificar `TASK-1805`, `TASK-1806` y `TASK-1312` contra runtime/DB, no sólo sus documentos.
2. Correr tests de contrato, pricing, ETV, access y cost preview sin proveedor.
3. Aplicar migración en staging y verificar tablas, constraints, grants, triggers y write allowlist contra PG.
4. Desplegar worker/Vercel con flag OFF; verificar que ninguna lectura dispara provider ni cambia superficies.
5. Sincronizar catálogo gratuito y validar hash, jerarquía, rows y reader.
6. Ejecutar dry-run allowlisted de footprint/landscape; comparar forecast contra límites aprobados.
7. Con autorización, ejecutar canary mínimo en staging; verificar task status, costo, método efectivo, rows,
   truncation y persistencia append-only.
8. Verificar readers, API y MCP con binding internal y negative access cross-org.
9. Repetir deploy prod flag OFF; ejecutar canary productivo mínimo autorizado y readback DB/API/MCP.
10. Activar flag y scheduler sólo tras sign-off; monitorear signals y spend durante un ciclo completo.

### Out-of-band coordination required

- Aprobación explícita del gasto y de la cohorte/categorías del canary.
- Confirmación de tarifas vigentes mediante `/v3/appendix/user_data`.
- Confirmación o prueba de sandbox para `use_improved_etv`; si no existe, smoke productivo mínimo aprobado.
- Aprobación separada para habilitar scheduler y cadencia productiva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `categories_for_domain` y `domain_metrics_by_categories` usan el transporte DataForSEO canónico con
      `family:'labs'`, `consumer:'seo'`, org, entitlement, forecast, ledger y breaker.
- [ ] La policy ETV de `TASK-1805` allowlistea ambos endpoints y toda observación persiste método solicitado,
      método efectivo, base de evidencia y timestamp UTC.
- [ ] Ningún request omite la selección metodológica ni acepta legacy después de `2026-11-01T00:00:00Z`.
- [ ] `include_clickstream_data` permanece `false`; ninguna tabla/DTO nuevo contiene `clickstream_etv` o demografía.
- [ ] Migración additive crea run ledger, taxonomía, ambos grains de observación y bindings con constraints,
      índices, grants y triggers verificados contra PostgreSQL real.
- [ ] Runs/observations rechazan UPDATE/DELETE; binding se retira cerrando vigencia y conserva actor/source.
- [ ] Failed runs no satisfacen freshness; captured con cero filas sí evita recompra y comunica `no_market_data`.
- [ ] Category set, período, mercado, `correlate`, item types, total/items/limit y truncation quedan auditables.
- [ ] Readers no suman categorías solapadas, no convierten ausencia en cero y rechazan/segmentan mixed methods.
- [ ] Historia pre-julio de 2026 se marca `july_2026_ratio_approximation`; julio en adelante,
      `full_recomputation`.
- [ ] DataForSEO categories nunca crea ni muta `seo_topic_clusters` o sus members automáticamente.
- [ ] Proposal reader no escribe; confirm/retire exigen actor, capability, tenant, idempotencia y audit history.
- [ ] `readSeoDomainCategoryFootprint`, `readSeoCategoryLandscape` y `readSeoTopicClusterMarketEvidence` tienen
      contracts estables, lens/provenance por cifra y degradación honesta.
- [ ] `TASK-1314` consume `readSeoTopicClusterMarketEvidence` como señal nombrada; no captura proveedor ni fusiona
      SEO/AEO.
- [ ] API Platform, Nexa y MCP consumen los mismos primitives; raw landscape es internal-only con 404 anti-oracle.
- [ ] Tool manifest vivo y generado permanecen sincronizados; `pnpm mcp:manifest:check` pasa.
- [ ] Nuevas tablas están en el write-target allowlist/boundary test con justificación y sin wildcard.
- [ ] Dry-run informa subjects/category sets, provider calls, rows máximas, método y tope USD sin gastar.
- [ ] Signals de stale, failure, method mismatch y truncation están registradas y verificadas.
- [ ] Flag está OFF y scheduler PAUSED por default; enable requiere canary, aprobación y ledger documental.
- [ ] Fixture/replay, PostgreSQL sanity, sandbox o canary autorizado y readback DB/API/MCP están adjuntos a la task.
- [ ] No existe provider call live-per-view, fetch paralelo, SDK nuevo ni secreto expuesto.
- [ ] `pnpm task:lint --task TASK-1808` reporta `scanned=1 template=1 legacy=0 errors=0 warnings=0`.

## Verification

- `pnpm task:lint --task TASK-1808`
- tests focales de `src/lib/growth/seo/category-market/**`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm mcp:manifest:check`
- `pnpm qa:gates --changed`
- `pnpm task:lint --task TASK-1805`
- `pnpm task:lint --task TASK-1806`
- PostgreSQL migration/sanity con rollback transaccional y verificación de grants/triggers/constraints.
- Fixture/replay y sandbox; canary bounded sólo con autorización explícita de gasto.
- Readback en staging y producción de flag, worker, DB, API, MCP, signals y spend ledger.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre `TASK-1805`, `TASK-1806`, `TASK-1775`, `TASK-1312` y
      `TASK-1314`.
- [ ] Se ejecutaron `pnpm docs:closure-check` y, como último gate tras cualquier rotación,
      `pnpm docs:context-check:strict`.
- [ ] Estado de flags/scheduler/cadencia y evidencia live quedaron registrados sin confundir code complete con
      rollout.

## Follow-ups

- `TASK-1314` — consumir la evidencia de mercado por cluster dentro del derived read de topical authority.
- Task futura **Competitive Search Topology** — `page_intersection` + `serp_competitors`, fuera de este scope.
- Task futura **Portfolio Historical Intelligence** — `historical_bulk_traffic_estimation`, fuera de este scope.
- Task UI/UX futura sólo si aparece un consumer visible real de category footprint/landscape.

## Open Questions

- ¿Qué categorías/mercados entran a la primera cohorte y cuál es el tope USD aprobado?
- ¿El scheduler mensual comparte batch con domain overview o necesita un job separado tras medir duración/costo?
- ¿DataForSEO habilita `use_improved_etv` en sandbox para estos dos endpoints o el contrato requiere canary mínimo
  productivo?
- ¿Qué roles además de operador interno podrán confirmar bindings en la primera versión?
