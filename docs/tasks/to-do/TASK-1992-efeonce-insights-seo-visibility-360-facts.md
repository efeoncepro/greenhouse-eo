# TASK-1992 — Efeonce Insights: hechos nuevos del Search Visibility 360 (SERP, movimiento de keywords, pagado, enlaces, salud técnica, visibilidad por URL y competidores con gate)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `reader`
- Epic: `EPIC-045`
- Status real: `Diseño; inventario de tarjetas con isotipo aprobado por el operador el 2026-10-03`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-1990` (canales de plataforma y glifo por métrica); Slice 2 (citado dentro del AI Overview) bloqueado por `TASK-1993`; Slice 7 (competidores) bloqueado por decisión explícita del operador
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El módulo SEO (Search Visibility 360) ya captura mucho más de lo que llega al informe de Insights: qué keywords
muestran AI Overview y qué bloques tiene cada SERP, qué dominios ocupan el top de las keywords del cliente, cuántas
keywords son nuevas, suben, bajan o se pierden cada mes, el tráfico pagado estimado, los enlaces y la autoridad, la
salud técnica del sitio y la visibilidad por URL. Esta task convierte esas capturas en hechos del adapter SEO, cada
uno leído de su reader dueño, con su canal (AI Overview, Google, Google Ads, YouTube, Reddit…) o su glifo Trazo,
para las tarjetas aprobadas el 2026-10-03. La comparativa con competidores queda detrás de una decisión explícita del
operador porque la política vigente la prohíbe frente al cliente.

## Why This Task Exists

El tablero `Cifras-Canal-Inventario` del canvas <https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB> marca como
«existe, no llega a Insights» nueve cifras de búsqueda. Verificado en el repo el 2026-10-03:

- **AI Overview y bloques del SERP:** la captura diaria de ranking pide AI Overview (`load_async_ai_overview` en
  `src/lib/growth/seo/rank-capture.ts`) y guarda `serp_features` por keyword y día; `readRankEvolution`
  (`src/lib/growth/seo/rank-evolution-reader.ts`) ya expone `aiOverview` por punto. El adapter SEO no lo emite.
- **Plataformas que rankean:** `greenhouse_growth.seo_serp_top_results` (TASK-1699) guarda cada resultado del top-N con
  su dominio; no hay reader dueño para Insights (sólo `competitor-discovery.ts` la lee).
- **Movimiento de keywords y tráfico pagado:** `readDomainOverview`/`readDomainOverviewForTarget`
  (`src/lib/growth/seo/domain-overview/reader.ts`) devuelven `organic_is_new/up/down/lost` y `paid_etv`; el adapter
  sólo toma `organic_etv`.
- **Enlaces y autoridad:** `readBacklinkProfile` (`src/lib/growth/seo/backlinks/reader.ts`).
- **Salud técnica:** `readSiteAuditReport` (`src/lib/growth/seo/site-audit/reader.ts`), con el gate
  `GROWTH_SEO_SITE_FINDINGS_ENABLED`; el artefacto de la auditoría es de TASK-1672.
- **Visibilidad por URL:** `readUrlVisibility` (`src/lib/growth/seo/url-visibility/reader.ts`).
- **Competidores en tus keywords:** `readKeywordGap` (`src/lib/growth/seo/keyword-gap-reader.ts`) y la cobertura de
  competidores (`src/lib/growth/seo/competitor-coverage.ts`). El contrato de contenido la declara `policy_blocked`
  (pregunta 3): «la comparativa competitiva SEO nunca es client-facing (GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1,
  auditoría §7); decide el operador».

## Goal

- El adapter SEO emite, cuando el dato existe en la ventana: keywords con AI Overview, bloques del SERP por tipo,
  citado dentro del AI Overview (tras TASK-1993), plataformas que rankean en las keywords, keywords nuevas, que suben,
  bajan o se pierden, tráfico pagado estimado, dominios que enlazan y autoridad, salud técnica y visibilidad por URL.
- Cada hecho sale de un reader del dominio SEO, con `method`, `source`, `coverage` y `evidenceRef`; el adapter nunca
  lee tablas ajenas.
- Cada hecho nuevo tiene su regla en el contrato de contenido y el planner sabe en qué tablero va.
- Los competidores no llegan a ninguna edición de cliente sin una decisión explícita y registrada del operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§5 ventana, §15 contrato de contenido)
- `docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (auditoría §7: comparativa competitiva)
- `docs/epics/in-progress/EPIC-022-growth-seo-search-visibility-360-module.md`
- `.claude/rules/efeonce-insights.md` y la skill `efeonce-insights`

Reglas obligatorias:

- Readers sólo del dominio SEO (`src/lib/growth/seo/**`); si falta uno (top-N del SERP), se agrega allí, no en Insights.
- Un día sin captura de AI Overview es «no medido», nunca «sin AI Overview» (regla de TASK-1704).
- Conteos de keywords siempre sobre el set monitoreado declarado, con la cobertura en `coverage`.
- El tráfico pagado estimado y la autoridad son estimaciones de proveedor: llevan `estimated` y su método.
- La salud técnica respeta el gate `GROWTH_SEO_SITE_FINDINGS_ENABLED` y la frescura de la auditoría; sin auditoría
  fresca no hay hecho.
- Competidores: `policy_blocked` hasta la decisión del operador; sin ella, el adapter no emite hechos de
  competidores ni nombres de marcas competidoras.
- Las marcas competidoras se nombran sin logos (no existen como asset oficial); llevan el glifo «competencia».

## Normative Docs

- `docs/tasks/in-progress/TASK-1962-efeonce-insights-report-content-contract.md`
- `docs/tasks/to-do/TASK-1901-efeonce-insights-richer-evidence-for-chart-families.md` (mismo adapter: serie diaria y tramos)
- `docs/tasks/to-do/TASK-1672-growth-seo-audit-report-artifact.md` (dueña del artefacto de auditoría técnica)
- `docs/tasks/to-do/TASK-1704-growth-cadence-sampling-aio-weekly-n3.md` (cadencia de la captura de AI Overview)

## Dependencies & Impact

### Depends on

- `TASK-1990`: canales `google`, `google_ai_overview`, `google_ads`, `youtube`, `reddit`, `wikipedia`, `linkedin` y
  `channelForDomain`; glifos `keyword`, `competencia`, `enlace`, `web`, `buscador`.
- `TASK-1993`: captura de las referencias del AI Overview (sólo para el Slice 2).
- Readers SEO existentes listados en «Already exists».

### Blocks / Impacts

- `TASK-1996`: tableros de búsqueda con canal y glifo.
- `TASK-1901`: comparte `src/lib/efeonce-insights/adapters/seo-adapter.ts`; quien tome la segunda revisa los cambios
  de la primera antes de empezar (sin ejecución en paralelo sobre el mismo archivo).
- `TASK-1672`: la tarjeta de salud técnica usa el mismo reader y gate que el artefacto (Delta 2026-10-03 en esa task).

### Files owned

- `src/lib/efeonce-insights/adapters/seo-adapter.ts`
- `src/lib/efeonce-insights/adapters/adapters.test.ts`
- `src/lib/efeonce-insights/presentation/content-contract.ts`
- `src/lib/efeonce-insights/editorial/criterion-figures.ts`
- `src/lib/growth/seo/serp-top-results-reader.ts` (nuevo reader dueño del top-N por ventana)
- `src/lib/growth/seo/rank-evolution-reader.ts` (agregado de AI Overview y bloques por ventana, si no basta el actual)
- `src/lib/copy/insights.ts`

## Current Repo State

### Already exists

- Adapter SEO con clics, impresiones, CTR, posición, keywords monitoreadas y en primera página, ETV orgánico, clics
  por semana, causas (`driver.*`), plan de acción (`opportunity.*`) y GA4 (`site.*`) en
  `src/lib/efeonce-insights/adapters/seo-adapter.ts`, sobre `readSeoOverviewKpisForWindow`, `readRankEvolution`,
  `readDomainOverviewForTarget`, `readSeoWindowMovers` y `readSeoWorkQueue`.
- Readers SEO sin consumir por Insights: `readUrlVisibility`, `readBacklinkProfile`, `readSiteAuditReport`,
  `readKeywordGap`, y los campos `organic_is_*`/`paid_etv` de `readDomainOverview`.
- Tabla `greenhouse_growth.seo_serp_top_results` (TASK-1699) con `item_type`, `result_domain` y `rank_absolute`.

### Gap

- Ninguno de esos datos llega como hecho de Insights.
- No hay reader dueño del top-N del SERP agregado por ventana.
- No existe la captura de «citado dentro del AI Overview» (TASK-1993).
- No hay decisión registrada sobre competidores frente al cliente.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/efeonce-insights/adapters/seo-adapter.ts` y readers en `src/lib/growth/seo/**`, en el runtime del portal y del ops-worker
- Future candidate home: `domain-package`
- Boundary: los readers del dominio SEO son la única fuente; Insights los consume por su adapter y el planner arma los tableros
- Server/browser split: readers y adapter server-only (Postgres); contrato de contenido y planner sin I/O
- Build impact: `none`
- Extraction blocker: los readers del dominio SEO comparten el pool Postgres del portal

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_growth.seo_rank_snapshots (serp_features), seo_serp_top_results, snapshots de domain overview y url visibility, perfil de backlinks y auditoría OnPage (sólo lectura vía readers dueños)`
- Consumidores afectados: `plan editorial, modelo web (Think), PDF/deck, lanes y MCP de Insights, agente redactor`
- Runtime target: `Vercel + ops-worker (generación) + Job artifact-worker (render)`

### Contract surface

- Contrato existente a respetar: `EvidenceFactV1`, `seo_report_adapter` vigente, readers SEO listados
- Contrato nuevo o modificado: hechos `serp.ai_overview_keywords`, `serp_feature.<tipo>`, `serp.ai_overview_cited`, `serp_platform.<plataforma>`, `keyword_movement.<new|up|down|lost>`, `paid_etv`, `backlinks.<referring_domains|domain_rank>`, `site_health.<score|broken_pages>`, `url_visibility.<n>`, `competitor.<n>` (sólo con decisión); reader nuevo `readSerpTopResultsForWindow`
- Backward compatibility: `compatible` — hechos aditivos
- Full API parity: `los hechos viajan por el contrato de evidencia; el reader nuevo vive en el dominio SEO y queda disponible para otros consumers`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna tabla nueva; lectura`
- Invariantes que no se pueden romper:
  - un día sin captura de AI Overview no cuenta como «sin AI Overview»;
  - los conteos de keywords declaran el set monitoreado y su cobertura;
  - pagado y autoridad son estimados con su método;
  - salud técnica sólo con auditoría dentro de su frescura y con el gate ON;
  - sin decisión del operador, ningún hecho de competidor llega al snapshot;
  - los dominios del top-N se agregan por plataforma sólo con `channelForDomain`; el resto se agrega como «otros sitios».
- Write-target allowlist: `N/A — sólo lectura`
- Tenant/space boundary: `seo_targets.organization_id de la organización autorizada`
- Idempotency/concurrency: `determinista por ventana`
- Audit/outbox/history: `sin eventos nuevos`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale — aditivo detrás de INSIGHTS_EDITORIAL_V2_ENABLED; competidores apagados por política`
- Backfill plan: `ninguno`
- Rollback path: `revert + redeploy`
- External coordination: `decisión del operador sobre competidores (Slice 7)`

### Security and access

- Auth/access gate: `sin cambio`
- Sensitive data posture: `keywords y URLs del cliente: nunca al log; nombres de competidores sólo con decisión`
- Error contract: `rechazos con causa; captureWithDomain(err, 'insights', …) sin payload`
- Abuse/rate-limit posture: `topes por ventana y por set de keywords en los readers`

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/efeonce-insights src/lib/growth/seo`
- DB/runtime checks: `preview-edition --editorial-v2 --plan-only` de Berel (31 keywords) con el resumen de hechos nuevos
- Integration checks: `tableros de búsqueda con canal o glifo en el plan`
- Reliability signals/logs: `rechazos por fuente en rejections del snapshot`
- Production verification sequence: `ver Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se completa al final. Esta task no crea tablas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — AI Overview y bloques del SERP

- Keywords con AI Overview en la ventana (sobre días medidos) y conteo por bloque (AI Overview, preguntas
  relacionadas, fragmento destacado, imágenes, video, local) desde `serp_features`; canal `google_ai_overview` para AI
  Overview y `google` para los bloques.

### Slice 2 — Citado dentro del AI Overview (tras TASK-1993)

- Keywords donde el AI Overview enlaza al sitio, desde el reader que deja TASK-1993; canal `google_ai_overview`.

### Slice 3 — Plataformas que rankean en tus keywords

- Reader dueño `readSerpTopResultsForWindow` en `src/lib/growth/seo/`; hecho por plataforma (en cuántas keywords
  aparece YouTube, Reddit, Wikipedia, LinkedIn) con su canal.

### Slice 4 — Movimiento de keywords y tráfico pagado

- `keyword_movement.<new|up|down|lost>` del último mes medido en la ventana (glifo `keyword`) y `paid_etv` estimado
  (canal `google_ads`), desde `readDomainOverview`.

### Slice 5 — Enlaces y autoridad, visibilidad por URL

- Dominios que enlazan y domain rank (glifo `enlace`) desde `readBacklinkProfile`; top URLs por tráfico estimado
  (glifo `web`) desde `readUrlVisibility`.

### Slice 6 — Salud técnica

- Puntaje de salud y páginas rotas (glifo `checklist` o el que fije TASK-1990) desde `readSiteAuditReport`, con el gate
  `GROWTH_SEO_SITE_FINDINGS_ENABLED` y la frescura de la auditoría; la tarjeta remite al artefacto de TASK-1672 cuando
  exista.

### Slice 7 — Competidores en tus keywords (sólo con decisión del operador)

- Registrar la decisión del operador en el contrato de contenido (veredicto de la pregunta 3 para SEO) y en el
  documento de arquitectura del módulo SEO. Si la decisión es «sí»: cobertura y keyword gap de los competidores
  declarados (nombre de marca, glifo `competencia`, sin logos). Si es «no» o no hay decisión: el slice se cierra sin
  código y el veredicto queda `policy_blocked`.

### Slice 8 — Contrato de contenido, planner y verificación

- Reglas nuevas en `CONTENT_METRIC_RULES` y `CONTENT_CONTRACT_VERSION` subido; tableros en `criterion-figures.ts`;
  vista previa real de Berel con el resumen.

## Out of Scope

- Captura de referencias del AI Overview (TASK-1993) y Search Console por tipo de búsqueda (TASK-1426).
- Serie diaria de Search Console, tramos y keyword × semana (TASK-1901).
- Artefacto de la auditoría técnica (TASK-1672).
- Bing, Core Web Vitals e indexación (TASK-1995 decide las fuentes).
- Render de las tarjetas (TASK-1996).

## Detailed Spec

| Cifra | Hecho propuesto | Reader | Canal o glifo | Pregunta |
|---|---|---|---|---|
| Keywords con AI Overview | `serp.ai_overview_keywords` | `readRankEvolution` | AI Overview | outcome |
| Bloques del SERP | `serp_feature.<tipo>` | `readRankEvolution` | Google | outcome |
| Citado dentro del AI Overview | `serp.ai_overview_cited` | reader de TASK-1993 | AI Overview | outcome |
| Plataformas que rankean | `serp_platform.<plataforma>` | `readSerpTopResultsForWindow` (nuevo) | plataforma | drivers |
| Keywords nuevas, suben, bajan, se pierden | `keyword_movement.<estado>` | `readDomainOverview` | glifo keyword | drivers |
| Tráfico pagado estimado | `paid_etv` | `readDomainOverview` | Google Ads | outcome |
| Dominios que enlazan, autoridad | `backlinks.<métrica>` | `readBacklinkProfile` | glifo enlace | outcome |
| Salud técnica | `site_health.<métrica>` | `readSiteAuditReport` | glifo | outcome |
| Visibilidad por URL | `url_visibility.<n>` | `readUrlVisibility` | glifo web | drivers |
| Competidores | `competitor.<n>` | `readKeywordGap` + cobertura | glifo competencia | competition (`policy_blocked` hasta decidir) |

Nombres finales de hechos y de reglas se fijan en Discovery; el criterio es la raíz común entre adapter y contrato.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1990 en develop antes de cualquier slice con canal nuevo.
- Slices 1, 3, 4, 5 y 6 son independientes entre sí; Slice 2 espera a TASK-1993; Slice 7 espera la decisión; Slice 8
  cierra después de los anteriores que se entreguen.
- Ningún slice toca `seo-adapter.ts` mientras TASK-1901 esté en curso sobre el mismo archivo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Comparativa competitiva llega a un cliente sin decisión | política / cliente | medium | veredicto `policy_blocked` + test que falla si hay hechos `competitor.*` sin decisión registrada | test rojo |
| «No medido» de AI Overview leído como «sin AI Overview» | data | medium | contar sólo días medidos y declarar cobertura | lectura de la vista previa |
| Salud técnica con auditoría vieja | data | medium | frescura y gate del dominio SEO | rechazo `stale` en el snapshot |
| Estimaciones de proveedor presentadas como medidas | lectura | medium | `estimated` y método en cada hecho | revisión del operador |
| Snapshot más pesado | Postgres / Vercel | low | topes por ventana y por set | tiempo de generación |

### Feature flags / cutover

- Sin flag propio: aditivo detrás de `INSIGHTS_EDITORIAL_V2_ENABLED` (ON). Salud técnica además detrás de
  `GROWTH_SEO_SITE_FINDINGS_ENABLED`. Competidores apagados por política hasta la decisión.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–6 | revert del commit del hecho y su regla | < 15 min | si |
| Slice 7 | revert y veredicto vuelve a `policy_blocked` | < 15 min | si |
| Slice 8 | revert de planner y contrato | < 15 min | si |

### Production verification sequence

1. Local: vista previa de Berel con los hechos nuevos.
2. Staging: edición interna revisada por el operador.
3. Producción por el control plane; edición interna revisada antes de compartir.

### Out-of-band coordination required

- Decisión del operador sobre competidores frente al cliente (Slice 7), registrada con fecha.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El adapter SEO emite keywords con AI Overview y bloques del SERP contando sólo días medidos (test con un día sin medición).
- [ ] Existe `readSerpTopResultsForWindow` en `src/lib/growth/seo/` y el adapter emite plataformas que rankean con su canal (test).
- [ ] El adapter emite `keyword_movement.*` y `paid_etv` estimado desde `readDomainOverview` (test).
- [ ] El adapter emite dominios que enlazan, autoridad y visibilidad por URL desde sus readers dueños (test).
- [ ] La salud técnica sólo se emite con el gate ON y auditoría dentro de su frescura (test con gate OFF y con auditoría vieja).
- [ ] Sin decisión registrada del operador no existe ningún hecho `competitor.*` y el veredicto sigue `policy_blocked` (test).
- [ ] `CONTENT_CONTRACT_VERSION` sube; `content-contract.test.ts` y `adapters.test.ts` pasan.
- [ ] La vista previa de Berel muestra los tableros de búsqueda con canal o glifo; el resumen queda en la task.

## Verification

- `pnpm typecheck`
- `pnpm vitest run src/lib/efeonce-insights src/lib/growth/seo`
- `pnpm test` (suite completa al cierre)
- `scripts/insights/preview-edition.ts --editorial-v2` con Berel
- `pnpm task:lint --task TASK-1992`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada y espejada a `.codex/`.
- [ ] Decisión sobre competidores registrada (sí o no) con fecha en el contrato de contenido.

## Follow-ups

- Search Console por tipo de búsqueda (imágenes, video, noticias, Discover) como hechos, cuando TASK-1426 lo capture.

## Open Questions

- ¿Se muestran los competidores al cliente? La política vigente dice que no; sólo el operador puede cambiarla.
- ¿Qué glifo lleva la salud técnica: `checklist` o `web`? Propuesta: `checklist`.
