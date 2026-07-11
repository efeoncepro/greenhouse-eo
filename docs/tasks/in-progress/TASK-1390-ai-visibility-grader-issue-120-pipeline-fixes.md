# TASK-1390 — AI Visibility Grader: fix ISSUE-120 (sourceType classifier + domain matching + fallback reason visible + retry backoff)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `task/TASK-1390-ai-visibility-grader-issue-120-pipeline-fixes`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra los 4 gaps de `ISSUE-120` en el pipeline de normalización/scoring del AI Visibility Grader: (A) clasificador determinista de `sourceType` para citas — hoy `citation_quality` sale **0 estructural para todos los clientes** porque nadie clasifica las fuentes; (B) matching de dominio del sujeto subdomain-aware (eTLD+1) — `www.`/subdominios no matchean; (C) el fallback reason de la extracción de prosa se persiste y se expone (hoy degrada silenciosa a `unknown`) + señal de reliability; (D) backoff exponencial en los retries del web-search-adapter + clasificación `rate_limited` para errores Vertex sin httpStatus.

## Why This Task Exists

Los runs reales `EO-GRUN-00044`/`EO-GRUN-00045` (SKY Airline, 2026-07-11) demostraron que 1 de las 7 dimensiones del score (`citation_quality`, peso 15) es una **dimensión muerta**: los provider adapters entregan citas `{url, title, domain}` sin `sourceType`, el normalizer mapea `?? 'unknown'` y el scoring exige `owned/earned/news` → 0/100 siempre, para cualquier marca. El informe público (que ahora se incrusta en propuestas comerciales — licitación SKY) muestra ese 0 como si fuera un hecho del cliente. Además: la presencia por dominio se pierde con `www.`/subdominios (igualdad exacta), la extracción de prosa degrada sin causa visible (el router produce metadata `disabled/not_configured/cost_exceeded/provider_error/schema_invalid` pero `enrichFindingWithLlm` la descarta → `sentiment unknown` indistinguible de "no corrió"), y un throttle transitorio de Vertex mata las 3 tentativas de una llamada porque los retries son inmediatos sin backoff y todo error colapsa al bucket genérico `provider_error`. Detalle completo con líneas de código: `docs/issues/open/ISSUE-120-ai-visibility-grader-citation-quality-structural-zero-and-silent-prose-degradation.md`.

## Goal

- `citation_quality` puntúa con datos reales: las citas se clasifican determinísticamente (owned/earned/news/social/directory/review) sin LLM.
- La presencia por dominio del sujeto matchea `www.` y subdominios (eTLD+1) preservando el detalle del subdominio.
- Cuando la extracción de prosa degrada, el finding/score/run detail dicen POR QUÉ (fallback reason persistido) y una señal de reliability lo hace visible en `/admin/operations`.
- Un throttle transitorio de un provider no mata la observación: retries con backoff exponencial + jitter, y los errores de cuota Vertex se clasifican `rate_limited`.
- Re-run real de SKY como evidencia: `citation_quality > 0` con las mismas citas de la clase observada; causa visible si la prosa degrada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (para la señal nueva)

Reglas obligatorias:

- **Score determinista y versionado:** cambiar la lógica de scoring/normalización que altera resultados EXIGE bump de versión (`score_version` y/o `schemaVersion` del finding). Recalcular el mismo run con la MISMA versión debe dar el mismo resultado; la versión nueva convive, no reescribe.
- **Snapshots publicados son inmutables:** ningún fix re-escribe reportes ya publicados (`grt-*`); un score corregido nace de un re-run o re-score versionado.
- **El LLM nunca asigna score ni clasifica fuentes:** el clasificador de `sourceType` es determinista (listas + reglas de dominio). Evidencia insuficiente = `unknown`, nunca precisión falsa.
- **Providers solo server-side**; errores crudos a `captureWithDomain('growth')`, nunca al caller.
- **Full API parity:** los cambios viven en los primitives (`normalizer`, `scoring/engine`, `web-search-adapter`) — endpoint admin, worker async, Nexa y smoke los consumen sin lógica paralela.

## Normative Docs

- `docs/issues/open/ISSUE-120-ai-visibility-grader-citation-quality-structural-zero-and-silent-prose-degradation.md` (causa raíz por línea)
- `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md` (cómo correr/verificar)
- `docs/issues/open/ISSUE-113-brand-intelligence-gemini-provider-error.md` (contexto Gemini/Vertex)

## Dependencies & Impact

### Depends on

- Pipeline existente TASK-1226/1227 (`src/lib/growth/ai-visibility/normalization/`, `scoring/`, `providers/`) — materializado.
- Tablas `greenhouse_growth.*` (runs/observations/findings/scores) — materializadas.

### Blocks / Impacts

- Calidad del informe público del grader (lead magnet EPIC-020/021) y del `AI Visibility Snapshot` comercial.
- Propuesta SKY (licitación blog): el informe vivo incrustado muestra hoy `citation_quality 0`; tras el fix, un re-run produce un informe corregido (nuevo token — actualizar el enlace es coordinación out-of-band).
- ISSUE-120 (se resuelve con esta task); ISSUE-113 queda abierto (config Vertex de brand-intelligence es otro path).

### Files owned

- `src/lib/growth/ai-visibility/normalization/source-type-classifier.ts` (nuevo)
- `src/lib/growth/ai-visibility/normalization/normalizer.ts`
- `src/lib/growth/ai-visibility/normalization/contracts.ts`
- `src/lib/growth/ai-visibility/normalization/llm-extraction.ts`
- `src/lib/growth/ai-visibility/scoring/engine.ts`
- `src/lib/growth/ai-visibility/scoring/command.ts`
- `src/lib/growth/ai-visibility/scoring/store.ts` `[verificar si el fallback reason requiere columna additive]`
- `src/lib/growth/ai-visibility/providers/web-search-adapter.ts`
- `src/lib/growth/ai-visibility/providers/observation-builders.ts`
- `src/lib/growth/ai-visibility/__tests__/**` (tests focales nuevos)
- `src/lib/reliability/**` (registro de la señal `growth.ai_visibility.prose_extraction_degraded`) `[verificar registry exacto]`
- `docs/issues/open/ISSUE-120-*.md` → `docs/issues/resolved/` al cierre

## Current Repo State

### Already exists

- Normalizer determinista + hook LLM aislado (`normalization/normalizer.ts`, `llm-extraction.ts`, `prose-extraction/router.ts` — el router YA produce metadata de fallback que hoy se descarta).
- Scoring engine con 7 dimensiones y `CREDIBLE_SOURCE_TYPES = {'owned','earned','news'}` (`scoring/engine.ts:27`).
- Retry acotado en `providers/web-search-adapter.ts` (`maxRetriesPerCall` 1–2 por policy) con `captureWithDomain` del error crudo.
- Clasificación de errores en `providers/observation-builders.ts` (`mapHttpStatusToErrorCode`, `mapThrownErrorToErrorCode`).
- Runs reales de referencia con evidencia: `EO-GRUN-00044`, `EO-GRUN-00045` (`greenhouse_growth`).

### Gap

- No existe clasificador `sourceType` (ni determinista ni LLM) → `citation_quality` estructural 0.
- `resolveBrandPresence` compara `citationDomains.includes(subjectDomain)` por igualdad exacta (normalizer.ts:97).
- `enrichFindingWithLlm` descarta la metadata de fallback del router; no hay señal de reliability de degradación de prosa.
- Retries inmediatos sin backoff; Vertex sin httpStatus colapsa todo a `provider_error` (un 429 es indistinguible).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/ai-visibility/**` (dominio growth, server-only)
- Future candidate home: `domain-package`
- Boundary: primitives de normalización/scoring/providers del grader; consumers autorizados: `run-engine`, `scoring/command`, endpoint admin, worker async, smoke CLI
- Server/browser split: `server-only` (ya lo es; nada cruza al browser)
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: pipeline de normalización/scoring del grader (`normalized_finding` + `grader_score` en `greenhouse_growth`) y adapter de providers
- Consumidores afectados: endpoint admin `/api/admin/growth/ai-visibility/runs/*`, worker async (drain), report builder/snapshot público, smoke CLI, Nexa/MCP vía readers
- Runtime target: `local + staging (verificación live); production vía release control plane`

### Contract surface

- Contrato existente a respetar: `NormalizedFinding` (`normalization/contracts.ts`), `PersistedGraderScore` (`scoring/engine.ts`), `ProviderAdapter` (`providers/types.ts`)
- Contrato nuevo o modificado: campo opcional de fallback de prosa en el finding (p.ej. `proseExtraction: { ran, fallbackReason, provider } | null`) + `sourceTypes` ahora poblados + `score_version` bump
- Backward compatibility: `compatible` (campos additive/opcionales; findings/scores viejos conviven por versión)
- Full API parity: el fix vive en los primitives; todos los consumers (admin, worker, snapshot, smoke) lo reciben por construcción

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.normalized_finding` `[verificar nombre exacto y si el campo nuevo requiere columna additive o cabe en jsonb existente]`, `greenhouse_growth.grader_score`
- Invariantes que no se pueden romper:
  - Mismo run + misma `score_version` = mismo resultado (determinismo reproducible) → la lógica nueva SIEMPRE va con versión nueva.
  - Snapshots públicos (`grt-*`) inmutables.
  - `unknown` se preserva cuando no hay evidencia; el clasificador nunca inventa tipo.
- Tenant/space boundary: sin cambios (runs internos/operator; el detalle es capability-gated)
- Idempotency/concurrency: `scoreGraderRun` sigue idempotente por (runId, score_version); recompute reemplaza, no duplica
- Audit/outbox/history: señal reliability nueva `growth.ai_visibility.prose_extraction_degraded` (steady=0); errores crudos siguen en `captureWithDomain('growth')`

### Migration, backfill and rollout

- Migration posture: `additive si se necesita columna para el fallback reason ([verificar]; si el finding persiste en jsonb, none)`
- Default state: `enabled with rationale — fix determinista del pipeline; sin flag nueva (ver Rollout)`
- Backfill plan: `none — findings/scores históricos quedan como historia versionada; runs nuevos usan la versión nueva`
- Rollback path: `revert PR (+ reverse migration additive si aplicó); scores versionados conviven`
- External coordination: `re-publicar informe SKY (nuevo token) + actualizar el enlace en la propuesta (operador)`

### Security and access

- Auth/access gate: sin cambios (capabilities `growth.ai_visibility.*` existentes)
- Sensitive data posture: sin datos sensibles nuevos; el fallback reason es enum técnico, no texto crudo del provider
- Error contract: `canonical error codes; raw errors solo a captureWithDomain('growth')`
- Abuse/rate-limit posture: backoff exponencial + jitter acotado en retries (mismo `maxRetriesPerCall`; no aumenta el número de intentos)

### Runtime evidence

- Local checks: tests focales nuevos (clasificador, matching eTLD+1, merge de fallback reason, backoff/clasificación de error) + suites existentes de normalización/scoring verdes
- DB/runtime checks: re-score de `EO-GRUN-00045` con la versión nueva → `citation_quality > 0` y `sourceTypes` poblados (query read-only a `greenhouse_growth`)
- Integration checks: re-run real low-volume vía endpoint staging (camino canónico del runbook) → observaciones nuevas + score nuevo + fallback reason visible si degrada
- Reliability signals/logs: `growth.ai_visibility.prose_extraction_degraded` visible; Sentry `domain=growth` sin errores nuevos
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

`N/A — no capability nueva`: la task corrige primitives internos de un pipeline existente ya gateado por capabilities `growth.ai_visibility.*`; no introduce acción de negocio nueva ni surface nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (la llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Clasificador determinista de `sourceType` (Gap A)

- Nuevo `normalization/source-type-classifier.ts`: clasifica cada cita por dominio — `owned` (subjectDomain por eTLD+1, incl. subdominios), `news` (lista curada CL/LATAM: biobiochile, df.cl, latercera, forbes, emol, t13, ladevi, aviacionline…), `social` (instagram/youtube/facebook/tiktok/reddit/x), `review` (trustpilot, reclamos.cl, tripadvisor), `directory`/OTA (despegar, turismocity, esky, edestinos, kayak), `earned` (prensa/medios no-owned que citan a la marca — regla explícita), resto `unknown`.
- `normalizer.ts` usa el clasificador cuando la cita no trae `sourceType` del provider (el valor del provider, si existe, manda).
- Revisar `CREDIBLE_SOURCE_TYPES` del engine con la taxonomía resultante (mantener `owned/earned/news` salvo decisión documentada).
- Tests focales: dominios reales del run SKY (skyairline.com→owned incl. subdominios; biobiochile.cl→news; despegar.cl→directory; trustpilot→review; desconocido→unknown).

### Slice 2 — Matching de dominio del sujeto subdomain-aware (Gap B)

- `resolveBrandPresence`: comparar por eTLD+1 (`www.skyairline.com` ≡ `skyairline.com` ≡ `blog.skyairline.com`), preservando el subdominio exacto citado en el finding.
- Reusar/extender `normalizeDomain` existente (`../observation`) — no crear helper paralelo.
- Tests: www vs apex vs subdominio; dominios distintos NO matchean (skyairline.cl ≠ skyairline.com).

### Slice 3 — Fallback reason de la extracción de prosa visible + señal (Gap C)

- `enrichFindingWithLlm` deja de descartar la metadata del router: el finding lleva `proseExtraction: { ran: boolean, fallbackReason: enum|null, provider: string|null }` (campo additive).
- `scoring/command.ts` agrega al response del score el agregado de degradación (p.ej. `proseExtractionDegraded: { count, reasons }`); el run detail lo expone.
- Señal de reliability `growth.ai_visibility.prose_extraction_degraded` (kind data_quality, steady=0) registrada donde viven las señales growth `[verificar registry]`.
- Persistencia: columna/campo additive en `normalized_finding` si hace falta (migración additive con marker `-- Up Migration` + bloque DO de verificación).

### Slice 4 — Retry con backoff + clasificación `rate_limited` Vertex (Gap D)

- `web-search-adapter.ts`: backoff exponencial + jitter entre intentos (p.ej. 500ms → 1.5s → 4s, cap acotado; mismo número de intentos del policy).
- `observation-builders.ts` / adapter: inspeccionar `error.message`/`error.code` de Vertex (RESOURCE_EXHAUSTED/429/quota) para clasificar `rate_limited` aunque `httpStatus` sea null.
- Tests: throttle simulado → `rate_limited` + backoff aplicado; error genérico → `provider_error`.

### Slice 5 — Bump de versión + verificación live + cierre de ISSUE-120

- Bump `score_version` (y `schemaVersion` del finding si cambió el shape) — misma versión = mismo resultado, versión nueva = lógica nueva.
- Re-score de `EO-GRUN-00045` con versión nueva (staging) → evidencia: `citation_quality > 0`, `sourceTypes` poblados, fallback reason visible.
- Re-run real low-volume (camino canónico del runbook) → run limpio; opcionalmente re-publicar informe SKY (nuevo `grt-*`) — el swap del enlace en la propuesta es del operador.
- Mover `ISSUE-120` a `resolved/` con verificación documentada; actualizar runbook del grader + memoria/skill si cambió la operación.

## Out of Scope

- Arreglar la config Vertex de **brand-intelligence** (ISSUE-113 — path distinto, sigue abierto).
- Cualquier cambio de UI/report renderer (Think es render tonto; el modelo public-safe ya expone dimensiones).
- Backfill/re-score masivo de runs históricos (quedan como historia versionada).
- Cambiar pesos de las 7 dimensiones o el diseño del score (solo la dimensión muerta cobra vida con datos).
- El drift de flags multi-runtime (gobernado por el ledger/TASK-1341); esta task solo hace VISIBLE la degradación.

## Detailed Spec

La causa raíz por línea de código, la evidencia de los runs `EO-GRUN-00044/45` y el fix propuesto por gap viven en `docs/issues/open/ISSUE-120-ai-visibility-grader-citation-quality-structural-zero-and-silent-prose-degradation.md` — es la spec de referencia de esta task; no se duplica aquí.

Decisión de diseño load-bearing: el clasificador es **determinista y curable** (listas de dominios versionadas en código, extensibles por PR), con `unknown` como fallback honesto. La distinción `earned` vs `news`/`review` se define en Slice 1 con regla explícita documentada en el propio módulo (no ad-hoc por callsite).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 pueden desarrollarse en ese orden (1 y 2 tocan el mismo módulo; 3 depende del shape de contracts tocado en 1; 4 es independiente pero se verifica junto).
- **Slice 5 (bump de versión + verificación live) SIEMPRE al final** y DESPUÉS de que 1–4 estén verdes: el bump de `score_version` debe capturar TODA la lógica nueva de una vez (no bumps parciales por slice).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Score nuevo rompe comparabilidad con snapshots/scores históricos | grader scoring | medium | bump `score_version`; versiones conviven; snapshots `grt-*` inmutables; sin re-score retroactivo masivo | diff de score en re-score staging antes de prod |
| Clasificador etiqueta mal un dominio (falso owned/news) | grader normalización | medium | listas curadas + tests con dominios reales del run SKY + `unknown` como fallback; el valor del provider manda si existe | review de findings del re-run staging |
| Campo nuevo en findings rompe consumers existentes | report builder / admin API | low | campo additive/opcional; tests de no-leak del modelo público existentes deben seguir verdes | suite growth verde + smoke report público |
| Backoff alarga el run async | worker Cloud Run (drain) | low | backoff acotado (~6s extra worst-case por llamada); el worker no tiene timeout de request | duración del run en detail |
| Migración additive falla o queda pre-up-marker | greenhouse_growth | low | `pnpm migrate:create` + bloque DO de verificación + verify post-apply | `pnpm migrate:status` + query information_schema |

### Feature flags / cutover

Sin flag nueva — fix determinista de primitives con **versionado como mecanismo de cutover**: la lógica nueva solo aplica a scores computados con la `score_version` nueva; los históricos no cambian. Revert = revert PR (los scores versionados viejos siguen siendo válidos). La señal de reliability nueva es observabilidad pura (no gatea comportamiento).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–2 (clasificador + matching) | revert PR | <10 min | sí |
| Slice 3 (fallback reason + señal) | revert PR (+ reverse migration additive si aplicó — la columna nullable puede quedar huérfana sin daño) | <15 min | sí |
| Slice 4 (backoff + clasificación) | revert PR | <10 min | sí |
| Slice 5 (version bump) | revert PR; scores de la versión nueva quedan como historia versionada (no requieren limpieza) | <10 min | sí |

### Production verification sequence

1. Local: suites de normalización/scoring/providers verdes + tests focales nuevos.
2. Staging: si hay migración, `pnpm migrate:up` + verify; re-score `EO-GRUN-00045` con versión nueva → `citation_quality > 0`, `sourceTypes` poblados, `proseExtraction` presente.
3. Staging: re-run real low-volume vía endpoint canónico → run limpio end-to-end (drain → score → publish opcional).
4. Verificar señal `growth.ai_visibility.prose_extraction_degraded` visible (o steady=0 si la prosa corrió).
5. Producción: vía release control plane (promoción develop→main estándar); el grader prod sigue gobernado por sus flags existentes.
6. Post-prod: monitorear Sentry `domain=growth` + señal nueva 7d.

### Out-of-band coordination required

- Re-publicar el informe de SKY con la versión corregida (nuevo token `grt-*`) y **actualizar el enlace incrustado en la propuesta de la licitación** (operador; la propuesta vive en OneDrive, fuera del repo).
- Si el re-run evidencia que la extracción de prosa degrada por secret/flag en un runtime específico, coordinar el fix de env con el ledger (`FEATURE_FLAG_STATE_LEDGER.md`) — no es código de esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las citas del re-run/re-score llevan `sourceType` poblado (owned/news/social/review/directory/earned/unknown) — verificable en findings.
- [ ] `citation_quality` del re-score de `EO-GRUN-00045` (versión nueva) es `> 0` con las citas existentes (incluye skyairline.com→owned y biobiochile.cl→news).
- [ ] `www.<domain>` y subdominios del sujeto cuentan como dominio citado en `resolveBrandPresence` (test verde) y el finding preserva el subdominio exacto.
- [ ] Cuando la extracción de prosa degrada, el finding registra `fallbackReason` y el response del score/run detail lo expone agregado — `sentiment unknown` ya no es indistinguible de "no corrió".
- [ ] Existe la señal `growth.ai_visibility.prose_extraction_degraded` (steady=0) y aparece en la superficie de reliability.
- [ ] Los retries del web-search-adapter aplican backoff exponencial + jitter (test) y un error de cuota Vertex clasifica `rate_limited`, no `provider_error`.
- [ ] `score_version` fue bumpeada; recomputar un run con la versión vieja sigue dando el resultado viejo (determinismo por versión).
- [ ] Snapshots públicos existentes no cambiaron (inmutabilidad verificada — el token SKY viejo sigue sirviendo su contenido original).
- [ ] `ISSUE-120` movido a `resolved/` con verificación documentada y README de issues sincronizado.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (full al cierre; focal por slice)
- Re-score + re-run live en staging (camino canónico del runbook `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`) con evidencia en la task/Handoff
- `pnpm build` (gate de cierre)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `ISSUE-120` movido a `docs/issues/resolved/` + README de issues actualizado
- [ ] Runbook del grader + memoria/skill actualizados si cambió la operación (documentación viva)

## Follow-ups

- ISSUE-113: arreglar de raíz la config Vertex del path brand-intelligence (mitigado por fallthrough).
- Evaluar exposición del desglose `partial` (qué provider×prompt faltó) en el reporte público (hoy solo en run detail).
- Re-publicar informe SKY + swap del enlace en la propuesta (operador, out-of-band).

## Open Questions

- ¿La distinción `earned` (medio que habla de la marca) vs `news` (medio general) aporta al score o basta `news`? Resolver en Slice 1 con regla documentada; default conservador: tratarlas equivalentes para `CREDIBLE_SOURCE_TYPES`.
