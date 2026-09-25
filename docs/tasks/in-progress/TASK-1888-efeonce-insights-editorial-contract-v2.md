# TASK-1888 — Efeonce Insights: contrato editorial v2 (familias de gráfico, lectura por figura y portada por módulo)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-045`
- Status real: `Code complete; rollout pendiente (release con flag OFF, ediciones internas en staging, deploy efeonce-mcp#18)`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El diseño de los informes de Insights aprobado por el operador el 2026-09-25 (canvas «Gráficos de Efeonce Insights»)
necesita datos que el motor no produce: `ChartSpecV1` admite 7 familias y el planner emite sólo `bar` y
`bar_grouped`; el plan no trae la lectura de cada figura («Lo que significa / Próximo paso»), la cifra principal, la
apertura de capítulo ni «Lo esencial del mes»; no existe identidad de canal para los logos; y nada decide entre
portada navy y blanca. Esta task extiende el contrato de forma aditiva, sus productores y la preferencia de portada,
para que TASK-1889 sólo dibuje.

## Why This Task Exists

TASK-1847 dejó en producción los catálogos v1 y la geometría de 15 familias en
`src/lib/artifact-composer/chart-geometry.ts`, pero su propio cierre declara que 13 familias no tienen productor
(`docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §14.7, «Límite honesto de las familias») y que ampliarlo
«es trabajo nuevo del dominio». El rediseño aprobado es la demanda que 1847 pedía antes de abrir trabajo: ya no es
preventivo.

Hay cuatro huecos de contrato, verificados en código el 2026-09-25:

1. `CHART_FAMILIES` en `src/lib/efeonce-insights/contracts/chart-spec.ts` sólo lista `bar`, `bar_grouped`,
   `bar_stacked`, `line`, `pie`, `donut` y `scatter`. Bullet, cascada, embudo, medidor, heatmap, waffle, Venn y
   UpSet tienen geometría probada y ningún contrato que el planner pueda llenar.
2. `EditorialPlanV1` (`contracts/plan.ts`) tiene resumen, capítulos con claims/charts/tables, acciones, límites,
   metodología y referencias. Las páginas aprobadas piden campos que no existen: lectura por figura, cifra principal
   con su bajada, entrada de capítulo y los hechos esenciales del resumen.
3. Las facts del adapter AEO (`adapters/aeo-adapter.ts`) llevan el proveedor sólo dentro de `metricId`
   (`presence.<provider>`); no hay un identificador de canal estable que un catálogo pueda resolver a su isotipo.
4. `InsightBrandV1.clientBrandRef` se valida como string y nadie lo resuelve; el logo de la organización vive en
   `greenhouse_core.organizations.logo_asset_id` (TASK-999, `src/lib/account-360/organization-brand-assets.ts`) sin
   variante para fondo oscuro. Sin ese dato no se puede decidir de forma segura si la portada va navy o blanca.

Decisiones del operador (2026-09-25) que esta task materializa: la portada se elige **por cliente** con cambio
opcional **en el encargo**; con preferencia `auto` va navy sólo si el cliente tiene logo apto para fondo oscuro; las
primeras ediciones reales se generan como **informe interno** para Berel (SEO/AEO) y Sky (ICO) y no se comparten con
el cliente hasta su revisión.

## Goal

- `ChartSpec` admite las 15 familias con sus datos propios y valida las mismas invariantes que la geometría.
- El plan editorial trae la lectura de cada figura, la cifra principal, la entrada de capítulo, lo esencial del mes y
  la línea «Qué mide este informe» derivada de los módulos, sin inventar cifras.
- Los productores (planner determinista y autoría IA acotada) emiten una familia sólo cuando la evidencia la sostiene,
  según una matriz familia × evidencia versionada.
- Cada serie o dimensión que representa un canal lleva `channelId` estable.
- La portada se resuelve (navy o blanca) desde preferencia por cliente, cambio en el encargo y variante del logo, y
  queda sellada en la edición.

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
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` — §5 (datos y ventana), §6 (plan, gráficos y salidas),
  §7 (API/MCP/autorización), §10 (gates) y §14.4 (invariantes para agentes)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` (umbrales y lectura de métricas ICO)

Reglas obligatorias:

- Contrato **aditivo**: una edición sellada con `chart_spec_v1` / `editorial_plan_v1` sigue siendo legible y
  re-renderizable sin migración de datos. Ningún campo nuevo pasa a obligatorio para planes ya sellados.
- Cada cifra de texto, gráfico o tabla referencia un hecho; `editorial/plan-validation.ts` **no se relaja**. Los
  campos nuevos entran al mismo validador.
- Una familia se emite sólo si la evidencia la sostiene. Los datos del canvas son de ejemplo y no autorizan ninguna
  familia por sí mismos.
- Invariantes de familia (idénticas a `chart-geometry.ts`): barras con origen cero; pie/donut con 3 partes como máximo
  y partes no superpuestas del mismo total; Venn sólo de dos conjuntos con áreas reales (sin Venn de tres); UpSet
  ordenado de mayor a menor; embudo con etapas que son subconjunto de la anterior; medidor de 270° con valor anterior
  y meta como referencias; bullet con la meta como marca; heatmap con el valor impreso; dispersión con pares completos.
- Insights no calcula métricas: los umbrales ICO (OTD%, RpA) se leen del registro dueño, nunca como literales.
- La portada resuelta se **sella** en la edición al generarla; el render nunca la decide con datos vivos.
- La variante de portada no es un `VisualProfile` paralelo a TASK-1644: son dos plantillas del mismo catálogo
  elegidas por contenido.
- El LLM no escribe estado; la autoría IA sigue acotada por presupuesto, sin herramientas y con fallback determinista.

## Normative Docs

- `src/lib/ico-engine/metric-registry.ts` (`ICO_METRIC_REGISTRY`) — **fuente de los umbrales** que imprime el informe (OTD ≥ 90, FTR ≥ 80, RpA ≤ 1,5; umbral inferior de la zona `optimal`, o superior si la métrica mejora al bajar). El operador lo fijó como fuente única del semáforo el 2026-09-25 y los docs ICO (glosario, `Contrato_Metricas_ICO_v1.md` §7.1 como benchmark externo) quedaron alineados en `f1a41cda0`; los semáforos del portal escritos a mano migran en TASK-1900.
- `.claude/skills/efeonce-insights/SKILL.md` y `references/*` — memoria operativa del programa (espejo `.codex/`).
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Referencia visual aprobada (sólo para saber qué datos pide cada página): canvas
  <https://claude.ai/artifact/M2GiA4NdBfgGkiAvwPjZYb> y hojas durables en
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/`.

## Dependencies & Impact

### Depends on

- `TASK-1845` (complete) — contratos `InsightRequestV1`, `EvidenceSnapshotV1`, `ChartSpecV1`, `EditorialPlanV1`,
  adapters SEO/AEO/ICO y commands de generación.
- `TASK-1846` (complete) — render durable en el Job `artifact-worker`.
- `TASK-1847` (complete 2026-09-25) — catálogos v1 en producción y geometría de 15 familias.
- `TASK-999` — assets de marca de organizaciones (`greenhouse_core.organizations.logo_asset_id`,
  `src/lib/account-360/organization-brand-assets.ts`) [verificar lifecycle y dueño vigente].
- Schema `greenhouse_insights` (tablas vigentes en `src/types/db.d.ts`).

### Blocks / Impacts

- `TASK-1889` — consumer: dibuja las familias, la lectura por figura, las portadas por módulo y los logos de canal.
- `TASK-1849` — su builder expone el cambio de portada en el encargo y la preferencia por cliente como consumer de
  este contrato (sin lógica propia).
- `TASK-1875` — `InsightWebModelV1` recibe los campos nuevos como opcionales.
- `TASK-1672` — la auditoría SEO sobre el catálogo hereda el contrato ampliado.
- Repo `efeoncepro/efeonce-mcp` — federación de la tool de preferencia de portada (repo hermano: PR, no push a `main`).

### Files owned

- `src/lib/efeonce-insights/contracts/chart-spec.ts`
- `src/lib/efeonce-insights/contracts/plan.ts`
- `src/lib/efeonce-insights/contracts/request.ts`
- `src/lib/efeonce-insights/contracts/channels.ts` (nuevo)
- `src/lib/efeonce-insights/editorial/deterministic-planner.ts`
- `src/lib/efeonce-insights/editorial/ai-authoring.ts`
- `src/lib/efeonce-insights/editorial/author-plan.ts`
- `src/lib/efeonce-insights/editorial/plan-validation.ts`
- `src/lib/efeonce-insights/adapters/aeo-adapter.ts`, `seo-adapter.ts`, `ico-adapter.ts` (`channelId`, referencias y
  lectura de `ftr_pct` del snapshot ICO; sin métricas calculadas en Insights)
- `src/lib/efeonce-insights/commands/validate-request.ts`
- `src/lib/efeonce-insights/request-hash.ts`
- `src/lib/efeonce-insights/commands/cover-preference.ts` (nuevo) y su reader
- `src/lib/efeonce-insights/flags.ts`
- `migrations/<timestamp>_task-1888-insights-cover-preference.sql` (nuevo, vía `pnpm migrate:create`)
- `src/app/api/platform/app/insights/**` y `src/app/api/platform/ecosystem/insights/**` (sólo la preferencia)
- `src/lib/account-360/organization-brand-assets.ts` (variante para fondo oscuro, vía su command) [verificar dueño]
- `src/lib/copy/insights.ts` (líneas «Qué mide este informe» por módulo)
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `src/lib/artifact-composer/chart-geometry.ts` — geometría domain-free de 15 familias con tests
  (`__tests__/chart-geometry-extended.test.ts`); `barGeometry`, `lineGeometry`, `sliceGeometry` y `scatterGeometry`
  se consumían en `render/figure-pages.ts` (retirado por TASK-1889 en `85785e7fc`; hoy el consumer es
  `src/lib/efeonce-insights/render/figure-slots.ts`, compartido por `report-mapper` e `insights-deck-mapper`, que lee
  `chapter.readings`, `plan.essentials` y `bandFactId`) y en `src/lib/artifact-composer/bar-figure.ts`.
- `src/lib/efeonce-insights/contracts/chart-spec.ts` — `ChartSpecV1` con 7 familias, relaciones y validación.
- `src/lib/efeonce-insights/contracts/plan.ts` — `EditorialPlanV1` (`EDITORIAL_PLAN_VERSION = 'editorial_plan_v1'`).
- `src/lib/efeonce-insights/editorial/` — planner determinista, autoría IA acotada, validación de cifras y formato.
- Adapters: SEO emite `clicks`, `impressions`, `ctr`, `position`, `rank` y declara granularidades `day`, `month` y
  `period`; AEO emite puntajes por dimensión y `presence.<provider>` (sólo `period`); ICO emite `rpa` y `otd` (lee
  `otd_pct`) con granularidad `month`.
- El snapshot ICO (`ico_engine.metric_snapshots_monthly`) trae además `ftr_pct`, ciclo, throughput y conteos, que el
  adapter no lee. Verificado el 2026-09-25 en BigQuery: Sky Airlines tiene 11 meses seguidos (2025-11 a 2026-09,
  jul–sep recalculados ese día); los espacios de la org sandbox «Greenhouse Demo» no tienen ninguna fila.
- Proveedores AEO con nombre visible en `src/lib/copy/growth.ts` (`provider_display_label`: `openai`, `anthropic`,
  `perplexity`, `gemini`, `google_ai_overview`).
- `src/lib/efeonce-insights/request-hash.ts` e idempotencia por `(org, key)` + hash.
- Capabilities `insights.report.read`, `insights.edition.create|review|issue`, `insights.share.manage`,
  `insights.delivery.send`, `insights.schedule.manage` en `src/lib/entitlements/runtime.ts`.
- Lanes `src/app/api/platform/app/insights/*` y `src/app/api/platform/ecosystem/insights/*`.
- Logo de organización: `greenhouse_core.organizations.logo_asset_id` + `resolve-organization-logo.ts`.

### Gap

- 8 familias sin contrato y 13 sin productor.
- Sin lectura por figura, cifra principal, entrada de capítulo ni hechos esenciales en el plan.
- Sin `channelId`; los catálogos no pueden asociar un isotipo a una serie.
- Sin preferencia de portada, sin cambio en el encargo, sin variante de logo para fondo oscuro y sin resolución sellada.
- `clientBrandRef` no se resuelve a un asset: la portada no puede mostrar el logo del cliente.
- FTR ya está calculado por el dueño (ICO) y el adapter no lo lee: se incorpora en esta task (Slice 3), igual que OTD.
- Evidencia que el canvas usa y **no existe** hoy en los adapters (queda fuera, ver Follow-ups): métricas por página o
  por keyword de SEO, conjuntos por consulta de IA (Venn/UpSet), embudo hasta oportunidad (CRM). Las series temporales
  sí existen (SEO `day`/`month`, ICO `month`); falta que el planner las pida y que la matriz lo confirme.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/efeonce-insights/**` (contratos browser-safe, editorial, commands) + migración en
  `migrations/` + lanes `src/app/api/platform/{app,ecosystem}/insights/**`
- Future candidate home: `domain-package`
- Boundary: contratos `ChartSpec`/`EditorialPlan`/`InsightRequest` (browser-safe) + command
  `setInsightCoverPreference` y su reader; consumers: catálogos del Artifact Composer (vía mappers), builder de
  TASK-1849, lanes app/ecosystem, MCP y Nexa por construcción.
- Server/browser split: contratos y registro de canales browser-safe sin imports de DB, secretos ni providers; command,
  reader, store y resolución de logo quedan server-only.
- Build impact: `none` — sin dependencias nuevas ni filesystem inputs; los isotipos los incorpora TASK-1889 a los
  catálogos.
- Extraction blocker: `none` nuevo; la resolución de logo cruza a `account-360` sólo por su reader/command canónico.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `ChartSpec` y `EditorialPlan` sellados en `greenhouse_insights.insight_editorial_plans`;
  preferencia nueva en `greenhouse_insights`; variante de logo en assets de organización (account-360).
- Consumidores afectados: mappers `render/report-mapper.ts` e `render/insights-deck-mapper.ts`, `InsightWebModelV1`,
  lanes app/ecosystem, MCP, builder de TASK-1849.
- Runtime target: `staging` y `production` (Vercel para commands/API; `artifact-worker` para render) [verificar
  runtime de `runInsightGeneration` en `commands/generation.ts`].

### Contract surface

- Contrato existente a respetar: `chart_spec_v1`, `editorial_plan_v1`, `insight_request_v1`, request hash, catálogos
  v1 de TASK-1847.
- Contrato nuevo o modificado: familias y datos por familia en `ChartSpec`; campos opcionales del plan (lectura por
  figura, cifra principal, entrada de capítulo, hechos esenciales, líneas de alcance); `channelId`;
  `InsightBrandV1.coverTheme?: 'auto' | 'dark' | 'light'`; command `setInsightCoverPreference` + reader; resolución
  sellada de portada.
- Backward compatibility: `compatible` — campos opcionales; versión del plan/spec sube sólo si el mapper necesita
  distinguirla, y los v1 siguen válidos.
- Full API parity: la preferencia es un command gobernado con reader; UI (TASK-1849), app, ecosystem, MCP y Nexa la
  consumen igual. El cambio en el encargo viaja en el mismo `InsightRequestV1` que ya usan los tres carriles.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_insights.<preferencia de portada por organización>` (nueva, nombre en
  Discovery); `greenhouse_insights.insight_editorial_plans` (payload sellado, sin cambio de columnas)
  [verificar]; assets de organización en account-360 (variante para fondo oscuro, forma en Discovery).
- Invariantes que no se pueden romper:
  - Un plan o spec v1 ya sellado se sigue componiendo con el mismo resultado.
  - Toda cifra nueva (cifra principal, lectura, hechos esenciales) referencia `factIds` y pasa el validador.
  - Un `InsightRequestV1` sin `coverTheme` produce **el mismo hash** que antes de esta task.
  - `auto` sólo resuelve navy si el cliente tiene logo apto para fondo oscuro; sin esa variante, blanca.
  - La portada resuelta queda sellada en la edición; re-render de la misma edición = misma portada.
  - Una familia sin evidencia suficiente no se emite; nunca se rellena con datos sintéticos.
- Write-target allowlist: declarar la tabla nueva en el boundary test del dominio si existe
  (`src/lib/efeonce-insights/boundary-domain.test.ts`) en el mismo PR, con su justificación.
- Tenant/space boundary: preferencia por `organization_id` derivado de la autoridad autenticada, nunca del payload;
  lectura cross-org imposible por construcción (mismo patrón que ediciones).
- Idempotency/concurrency: upsert por `organization_id`; cambio sin efecto si el valor no cambia; última escritura gana
  con `updated_at` y actor.
- Audit/outbox/history: evento outbox de preferencia actualizada registrado en el catálogo de eventos; actor y valor
  anterior en el payload.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: flag OFF (`INSIGHTS_EDITORIAL_V2_ENABLED`); preferencia `auto` por defecto.
- Backfill plan: sin backfill; organizaciones sin fila se leen como `auto`.
- Rollback path: flag OFF + revert PR; la tabla nueva queda inerte (down migration disponible).
- External coordination: fila en el ledger de flags; flag en Vercel y en cada runtime que genere planes; carga de logos
  aptos para fondo oscuro por el operador; PR en `efeonce-mcp`.

### Security and access

- Auth/access gate: capability nueva para gestionar la preferencia (nombre en Discovery, por ejemplo
  `insights.cover_preference.manage`) con grant a ≥ 1 rol real en el mismo PR y coverage test; lectura con
  `insights.report.read`.
- Sensitive data posture: sin PII ni finanzas; logos de marca del cliente.
- Error contract: `canonicalErrorResponse` con códigos del enum; sin prosa en inglés ni detalle técnico.
- Abuse/rate-limit posture: command de baja frecuencia; sin rate limit propio, hereda el del lane.

### Runtime evidence

- Local checks: tests focales de contratos, validador, planner, adapters, hash y command; suite de Insights y
  Artifact Composer.
- DB/runtime checks: `pnpm migrate:up` en staging + verificación en `information_schema`; lectura de la preferencia
  por el reader.
- Integration checks: `scripts/insights/preview-edition.ts` con Berel y Sky; ediciones internas en staging.
- Reliability signals/logs: rechazos del validador y fallas de render por edición (señales existentes de Insights)
  [verificar nombres].
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumers nombrados con paths reales. — arquitectura §14.8.
- [x] Invariantes, frontera tenant e idempotencia explícitas y cubiertas por tests. — `cover-preference.test.ts`, `chart-spec.test.ts`, `editorial-v2-*.test.ts`, `adapters.test.ts`.
- [x] La tabla nueva queda en el allowlist de destinos de escritura del dominio (si existe) en el mismo PR. — `boundary-domain.test.ts`.
- [ ] Postura de migración y rollback explícita y ensayada en staging. — Aditiva, aplicada y verificada en `information_schema`; el `down` NO se ensayó (la instancia es única para dev/staging/prod y la tabla ya es contrato). Rollback operativo = flag OFF.
- [x] Evidencia runtime/DB listada para cada cambio más allá de docs. — §14.8 (readback de columnas, CHECKs, FK, grants y capability; preview v2 con datos reales).
- [x] Errores canónicos y sin fuga de datos crudos. — `InsightsInputError` 400 `invalid_request`, 404 anti-oráculo por `assertInsightsAccess`, payload de evento redactado.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en el primitive: resolución de portada y preferencia viven en `src/lib/efeonce-insights/**`, no en UI.
- [x] Preferencia modelada como command + reader, no como handler de pantalla.
- [x] Read por reader canónico; write con capability fina, idempotencia, outbox y errores canónicos.
- [x] Capability + grant + coverage test en el mismo PR. — `insights.cover_preference.manage` (Admin + Account), `capability-grant-coverage.test.ts` verde.
- [ ] Camino programático: lanes `api/platform/app` y `api/platform/ecosystem` + tool MCP federada en `efeonce-mcp`. — Lanes y tools en Greenhouse construidas; federación en PR efeonce-mcp#18 (sin merge ni deploy hasta el release).
- [x] Write apto para `propose → confirm → execute`; sin integración Nexa-específica. — un solo write idempotente y reversible (fijar el valor previo).
- [x] Un primitive, muchos consumers; sin lógica duplicada en TASK-1849. — delta en TASK-1849.
- [x] Parity check = SÍ.

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

### Slice 1 — Matriz familia × evidencia y `ChartSpec` ampliado

- Documento versionado (en la arquitectura §6) con, para cada una de las 15 familias: pregunta que responde, datos que
  exige, módulo y hechos que la sostienen hoy, y veredicto (`productor ahora` / `sin evidencia`).
- `CHART_FAMILIES` suma `bullet`, `waterfall`, `funnel`, `gauge`, `heatmap`, `waffle`, `venn_two`, `upset` con datos
  por familia (tipo discriminado) y validaciones idénticas a las invariantes de `chart-geometry.ts`.
- Equivalente tabular obligatorio también para las familias nuevas.

### Slice 2 — Plan editorial ampliado

- Campos opcionales: lectura por figura (`meaning`, `nextStep`, cada una con `factIds`), cifra principal con bajada,
  entrada de capítulo, hechos esenciales del resumen (máximo 5) y líneas «Qué mide este informe» derivadas de los
  módulos desde `src/lib/copy/insights.ts` (no las redacta el LLM).
- `plan-validation.ts` valida los campos nuevos con la misma regla de cifras.
- Variación de una métrica expresada en porcentaje (OTD%, FTR%, CTR…) se redacta en **puntos porcentuales**
  («+1,8 pp»), no como porcentaje relativo («+2,2 %»); la variación relativa queda para métricas absolutas. Caso
  observado en el render productivo de Sky (TASK-1847, 2026-09-25): OTD 80,1 % → 81,9 % se imprimió «+2,2 %».
- Planes v1 siguen validando y componiendo.

### Slice 3 — Productores

- Planner determinista y autoría IA emiten las familias que la matriz marca como `productor ahora`. Conjunto mínimo
  esperado, a confirmar en la matriz: bullet para OTD%, RpA y FTR% de ICO contra sus umbrales del registro; línea de
  tendencia mensual de ICO y, si el adapter entrega la serie, diaria de SEO; barras de
  presencia por motor de AEO con `channelId`; medidor para un puntaje AEO de 0 a 100 con el período anterior como
  referencia, si el reader entrega ese puntaje [verificar]; donut sólo con 3 partes o menos.
- Prompt de autoría versionado para la lectura por figura; fallback determinista redacta una lectura factual sin
  explicación inventada.

### Slice 4 — Identidad de canal

- `contracts/channels.ts`: registro browser-safe de `channelId` (`google`, `google_ai_overview`, `chatgpt`, `gemini`,
  `claude`, `perplexity`) con mapeo desde los proveedores AEO (`openai→chatgpt`, `anthropic→claude`, etc.) y desde SEO
  (`google`). Un proveedor desconocido no rompe: queda sin `channelId`.
- Series y dimensiones de los adapters que representan un canal llevan `channelId`.

### Slice 5 — Portada por cliente, encargo y logo

- Migración aditiva de la preferencia por organización (`auto|dark|light`, default `auto`) + command
  `setInsightCoverPreference` + reader + evento outbox + capability y grant.
- `InsightBrandV1.coverTheme` opcional en request, validación y hash (sin cambio de hash si falta).
- Variante de logo apta para fondo oscuro en los assets de organización, sólo mediante el command canónico de
  account-360 (forma exacta en Discovery).
- Resolver `resolveInsightCover`: cambio en el encargo > preferencia del cliente > `auto`; `auto` = navy sólo con logo
  apto para fondo oscuro. Resultado y asset del logo sellados en la edición.
- Lanes app/ecosystem para la preferencia y tool MCP federada (PR en `efeonce-mcp`).

### Slice 6 — Flag, documentación y skill

- `INSIGHTS_EDITORIAL_V2_ENABLED` (default OFF) con fila en el ledger y lectura mapeada por runtime.
- Arquitectura §6/§14, documentación funcional, manual de uso y skill `efeonce-insights` actualizados.

## Out of Scope

- Plantillas, tokens, logos dibujados, portadas y páginas visuales: `TASK-1889`.
- UI para elegir la preferencia o el cambio en el encargo: `TASK-1849` (consumer).
- Métricas nuevas en adapters (SEO por página o keyword, conjuntos por consulta de IA, embudo CRM): quedan como
  Follow-ups en el dominio dueño de cada fuente. Leer `ftr_pct` no cuenta: ya lo calcula ICO.
- Venn de tres conjuntos (no existe con áreas exactas), PPTX/DOCX, sangrado de imprenta.
- Cambiar `deck-axis`, Proposal Studio o `VisualProfile` (TASK-1644).

## Detailed Spec

### Matriz inicial familia × evidencia (verificada contra adapters el 2026-09-25; Slice 1 la confirma)

| Familia | Pregunta | Datos que exige | Evidencia hoy |
|---|---|---|---|
| `bar` / `bar_grouped` | comparar / contra período anterior | valores por dimensión | sí (ya emitidas) |
| `bar_stacked` | composición en el tiempo | partes por período | por confirmar: SEO declara `day`/`month`; faltan partes (marca/sin marca) [verificar] |
| `line` | tendencia | serie temporal | sí, a confirmar: SEO `day`/`month` y tendencia mensual ICO (Sky: 11 meses) |
| `pie` / `donut` | parte de un total (≤ 3) | partes no superpuestas | parcial: presencia AEO si el reader entrega conteos por categoría [verificar] |
| `scatter` | relación entre dos métricas | pares por observación | no: SEO sólo agregados |
| `bullet` | resultado contra meta | valor + meta oficial | sí: OTD%, RpA y FTR% de ICO contra el registro (FTR requiere que el adapter lea `ftr_pct`) |
| `gauge` | nivel en escala 0–100 | valor + anterior (+ meta opcional) | parcial: puntaje AEO [verificar] |
| `waterfall` | qué explica un cambio | aportes que suman | no |
| `funnel` | conversión por etapas | etapas subconjunto | no: requiere CRM |
| `heatmap` | cambio por categoría y tiempo | matriz categoría × período | no |
| `waffle` | proporción de un conjunto contable | conteos que suman 100 | no [verificar keywords del mercado] |
| `venn_two` | coincidencia de dos conjuntos | tamaños A, B, A∩B | no: requiere cruce por consulta |
| `upset` | combinaciones de conjuntos | conteo por combinación | no: requiere conjuntos por consulta |

### Resolución de portada

```text
coverTheme(edición) =
  request.brand.coverTheme          si viene y ≠ 'auto'
  preferencia(org)                  si ≠ 'auto'
  'dark'  si org tiene logo apto para fondo oscuro
  'light' en otro caso
```

La portada blanca además elige su variante por módulos (visibilidad con canales en la órbita / creativo sin canales);
eso lo resuelve el catálogo en TASK-1889 desde `modules` y `channelId`, sin campo nuevo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 (los productores necesitan contrato y plan).
- Slice 4 puede correr en paralelo a Slice 2 una vez cerrado Slice 1.
- Slice 5 es independiente de 1–4, pero su resolver se activa sólo con el flag.
- Slice 6 cierra; el flag se prende en producción **sólo** junto al release de TASK-1889.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ediciones selladas v1 dejan de componer | render / worker | medium | contrato aditivo + tests que componen fixtures v1 | render run fallido por edición |
| El planner emite una familia sin evidencia o con cifras no citadas | editorial | medium | matriz versionada + validador sin relajar + tests por familia | rechazos del validador |
| Cambia el hash de encargos existentes | commands / idempotencia | low | test de invariancia del hash sin `coverTheme` | conflictos de idempotencia |
| Logo del cliente invisible sobre navy | PDF al cliente | medium | `auto` cae a blanca sin variante oscura + revisión humana antes de emitir | revisión del operador |
| Escritura cruzada a account-360 fuera de su command | datos de organización | low | sólo command canónico + boundary test | test de frontera |
| Autoría IA más cara o lenta por campos nuevos | IA | low | presupuesto vigente + fallback determinista | timeout/costo de autoría |

### Feature flags / cutover

- `INSIGHTS_EDITORIAL_V2_ENABLED` (default `false`): con OFF el planner emite v1 y el resolver no se aplica; la
  preferencia se puede guardar igual. Se lee donde corre la generación [verificar runtime] y se declara en su SoT
  (`deploy.sh` si es Cloud Run). Revert: flag a `false` (+ redeploy si el runtime lo exige).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–3 | flag OFF; revert PR si un test v1 falla en staging | < 15 min | si |
| Slice 4 | revert PR (campo opcional) | < 15 min | si |
| Slice 5 | flag OFF; `pnpm migrate:down` de la tabla nueva ensayado en staging | < 30 min | si |
| Slice 6 | revert de docs | inmediato | si |

### Production verification sequence

1. Staging: `pnpm migrate:up` + verificación de la tabla y del evento outbox.
2. Deploy staging con flag OFF: ediciones existentes de Berel y Sky re-renderizan igual.
3. `scripts/insights/preview-edition.ts` local con Berel y Sky; inspección del plan JSON (familias, lectura, portada).
4. Flag ON en staging: ediciones **internas** de Berel (`seo`,`aeo`) y Sky (`ico`); validador verde; portada sellada.
5. Producción vía release control plane con flag OFF; prender el flag sólo junto al release de TASK-1889 y verificar
   con una edición interna en producción antes de compartir nada con clientes.

### Out-of-band coordination required

- Operador: fija la preferencia de portada de Berel y Sky y carga logos aptos para fondo oscuro si los hay.
- `efeoncepro/efeonce-mcp`: PR para la tool de preferencia (repo con despliegue propio; no push directo a `main`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] La matriz familia × evidencia existe en la arquitectura §6 con veredicto por familia. — `editorial/family-evidence-matrix.ts` (`family_evidence_matrix_v1`) + tabla en §6; producer_now: bar, bar_grouped, line, bullet.
- [x] `ChartSpec` admite las 15 familias; cada invariante de `chart-geometry.ts` tiene su validación y test de rechazo. — `contracts/chart-spec.test.ts` (16 tests, uno por invariante; los de valor llaman a la geometría vía `editorial/chart-values.ts`).
- [x] Un fixture de plan v1 sellado compone igual antes y después (test). — `editorial-v2-contract.test.ts` (plan v1 valida igual, incluido el texto «+2,2 %» sellado) + suites `render/report-mapper` y `insights-deck-mapper` verdes con planes v1; `preview-edition.ts --plan-only` sin `--editorial-v2` sobre Berel da el plan v1.
- [x] El plan trae lectura por figura, cifra principal, entrada de capítulo, hechos esenciales y líneas «Qué mide
  este informe»; el validador rechaza una cifra no citada en cualquiera de ellos. — `editorial-v2-contract.test.ts` («rechaza una cifra no citada en cada campo nuevo»); `decision`/`measurement`/`ask` existen en el contrato pero sin productor determinista (decisión documentada en §14.8).
- [x] El planner emite al menos las familias marcadas `productor ahora` y ninguna marcada `sin evidencia`. — `editorial-v2-producers.test.ts` + `assertChartsAllowed`; datos reales: Sky emite bar_grouped + 3 bullets, Berel bar/bar_grouped (sin línea: ventana de un mes).
- [x] Una variación de una métrica en porcentaje se imprime en puntos porcentuales («pp»); test con OTD 80,1 → 81,9
  que espera «+1,8 pp». — `editorial-v2-contract.test.ts`; además, bajo 0,05 pp dos decimales (caso real Berel CTR).
- [x] Las series de canal llevan `channelId`; un proveedor desconocido no rompe la generación. — `adapters.test.ts` (AEO `openai→chatgpt`, proveedor desconocido sin campo; SEO `google`) + `dimensionChannelIds` en el planner.
- [x] Un encargo sin `coverTheme` conserva su hash (test). — `cover-preference.test.ts`, hash fijado contra el validador de `05fd559c0` (previo a la task).
- [ ] La preferencia se guarda por command con capability, grant, outbox y errores canónicos, y se lee por reader; lanes
  app/ecosystem responden y la tool MCP está federada. — **Parcial:** command/reader/capability/grant/outbox/errores y lanes construidos con tests (`cover-preference.test.ts`, `capability-grant-coverage`); federación en [efeonce-mcp#18](https://github.com/efeoncepro/efeonce-mcp/pull/18) abierta. Falta: lanes respondiendo en un runtime desplegado y el PR mergeado + gateway desplegado (después del release).
- [x] `auto` resuelve blanca sin logo apto para fondo oscuro y navy con él; el resultado queda sellado en la edición. — `cover-preference.test.ts` + `plan.cover` en el plan congelado (validador impone coherencia tema↔logo); Sky y Berel resuelven blanca por `auto` con datos reales.
- [ ] Ediciones internas de Berel y Sky en staging pasan validación con flag ON; ninguna se comparte con el cliente. — **Pendiente de rollout** (requiere release a staging). Evidencia previa local, sólo lectura: Sky `EO-INS-000022` 9 hechos / 0 violaciones y Berel `EO-INS-000019` 24 hechos / 0 violaciones con `--editorial-v2`.
- [x] Flag en el ledger con runtime declarado. — Vercel + `ops-worker` (`deploy.sh` `:-false`); `pnpm flags:audit --strict --no-vercel` en 0.

## Verification

- `pnpm local:check`
- `pnpm test` (suite completa al cierre) y `pnpm build` con autorización del operador
- Tests focales: `src/lib/efeonce-insights/**`, `src/lib/artifact-composer/__tests__/chart-geometry*.test.ts`
- `pnpm migrate:up` + verificación en `information_schema`; `pnpm db:generate-types`
- `scripts/insights/preview-edition.ts --edition=<id> --org=<org>` con Berel y Sky
- `pnpm task:lint --task TASK-1888`, `pnpm docs:closure-check`, `pnpm flags:audit`

Ejecutado 2026-09-25 (evidencia local): `pnpm test` completo 15 395 passed / 0 failed; `pnpm build` exit 0 sobre
`4cec0f060` (corrida única coordinada con las sesiones de TASK-1889 y 1846, árbol `src/`+`services/` limpio;
compilación 68 s, 23 páginas estáticas); `pnpm typecheck` limpio; `docs:closure-check` y `flags:audit --strict` en
0; cuatro guardas falsificadas (pp, hash, matriz, logo sobre navy) se ponen rojas con el defecto; preview v2 en solo
lectura de Sky y Berel con 0 violaciones. `pnpm local:check` corta en lint por errores de `scripts/foto/**`, trabajo
ajeno sin commitear.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada (`program-ledger`, `architecture-map`, `contracts`, `operations`,
  `lessons`) y espejada a `.codex/` con `pnpm skills:mirrors` verde.
- [ ] EPIC-045 actualizado con el estado real de la unidad.

## Follow-ups

- Evidencia nueva por dominio dueño, sólo cuando un informe real la pida: métricas por página o keyword de SEO
  (Search Console), conjuntos por consulta de IA (grader), embudo hasta oportunidad (CRM).
  Cada una habilita familias de la matriz sin tocar este contrato.

## Open Questions

- Nombre final de la capability de preferencia y rol que la recibe.
- Forma de la variante de logo para fondo oscuro en account-360 (columna, tabla de variantes o metadata del asset) y
  quién la carga.
- Si el plan sube a `editorial_plan_v2` o conserva v1 con campos opcionales; decidir en Discovery según lo que
  necesite distinguir el mapper.
