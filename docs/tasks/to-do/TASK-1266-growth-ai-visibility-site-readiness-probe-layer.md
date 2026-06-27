# TASK-1266 — Growth AI Visibility: Site Readiness Probe Layer (Structural AEO + Agentic-Web Readiness)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|integrations|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1266-growth-ai-visibility-site-readiness-probe-layer`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy el grader mide **percepción** (qué dicen los answer engines de la marca) pero nunca hace fetch del sitio analizado para ver la **causa técnica** de la (in)visibilidad ni su **operabilidad agéntica**. Esta task agrega una capa de **probes técnicos read-only** sobre superficies públicas del sitio (robots.txt, JSON-LD, llms.txt, sitemap, Core Web Vitals, `.well-known/mcp`, WebMCP tools, DOM semántico) que produce dos ejes nuevos: **structural readiness** ("¿por qué no te citan?") y **agentic-web readiness** ("¿te pueden *usar* los agentes?").

## Why This Task Exists

Las 7 dimensiones actuales salen 100% del output de los answer engines: el informe dice *"eres invisible"* pero no *"porque bloqueas GPTBot y no tienes ni un structured data"*. Conectar **percepción → causa** vuelve las recomendaciones accionables. Y la dimensión **agentic-web readiness** (lente WebMCP, idea ya aprobada — memoria `project_aeo_grader_agentic_readiness`) mide algo ortogonal: si un agente de IA puede *entender y operar* el portal, no solo si lo menciona. Eslogan: *"¿te mencionan?" (AEO) vs "¿te pueden usar?" (agentic)*. Es el diferenciador frente al AEO Grader de HubSpot, que solo mide percepción. Ambos ejes comparten el mismo gatherer (fetch del sitio público) → se construyen juntos.

## Goal

- Construir un **gatherer de naturaleza distinta** a los prompt-packs: probes técnicos read-only sobre superficies públicas del sitio analizado (no LLM, no prompts).
- Producir dos scores ortogonales reportados **lado a lado** con el score de percepción, NUNCA fusionados en un solo número: `structural_readiness` (causas estructurales AEO) y `agentic_readiness` (operabilidad agéntica).
- Honest degradation por señal: un probe que no se pudo medir → `score=null` + razón, excluido del promedio; nunca reportar 0 cuando no se probó.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §6 providers/gatherers, §7 scoring, §13 privacy/security, §17 observability.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — signals + Platform Health probe pattern (TASK-672).
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — headless Chrome / Lighthouse runtime (Cloud Run, no Vercel).
- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — gatherer/adapter substrate + run-engine.
- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — scoring config (7 dimensiones, pesos suman 100) + `null≠0` honest degradation.
- Skill `webmcp` — rubric de agentic-web readiness (señales detectables + Lighthouse `registered-webmcp-tools`).
- Skill `seo-aeo` — módulo `01_SEO_TECHNICAL` (crawlers IA, JSON-LD, llms.txt) + `04_AEO_GEO`.

Reglas obligatorias:

- **No mezclar dimensiones ortogonales en un score (regla dura arch overlay).** Percepción ("¿te mencionan?") y readiness técnica ("¿te pueden usar?") son ejes distintos. Score de percepción `ai_visibility_score_v1` queda **intacto y puro**; los dos ejes nuevos viven como **score(s) paralelo(s)** reportados lado a lado, NO blended al overall. Rebalancear pesos dentro de cada eje, nunca inflar el de percepción.
- **Gatherer de naturaleza distinta:** estos scores NO vienen de findings normalizados de answer engines; vienen de **probes técnicos del portal** (HTTP GET de archivos públicos + render headless). Tratarlo como su propio gatherer/normalizer, NO forzarlo dentro del pipeline de prompt-packs.
- **Public-safe + read-only sobre terceros:** todos los probes son HTTP GET de superficies públicas (robots.txt, sitemap, llms.txt, `.well-known`, HTML) + render headless. NUNCA autenticar, mutar, ni tocar endpoints privados del sitio analizado. Respetar el cost/governance del run-engine y rate-limit cortés.
- **Honest degradation:** señal no medible → `null` + razón, excluida del promedio ponderado (consistente con `emptyDimension` de TASK-1227). Nunca 0 cuando no se probó.
- **Lighthouse / WebMCP necesitan headless Chrome con flags** → corre en Cloud Run (ops-worker o probe worker dedicado), NUNCA en el runtime Vercel. El probe async va por el path worker, no inline en un route handler.
- **Boundary:** esta dimensión describe la readiness *del sitio analizado*; es independiente de si Greenhouse adopta WebMCP. Un portal puede scorear alto sin WebMCP (vía MCP + structured data + DOM semántico); WebMCP es el techo de la escala, no el único camino.

## Normative Docs

- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md`
- `src/lib/growth/ai-visibility/scoring/config.ts` [verificar path de la ScoreDimensionConfig]
- `src/lib/growth/ai-visibility/report/contracts.ts`
- `src/lib/reliability/queries/` (patrón de signals)

## Dependencies & Impact

### Depends on

- `TASK-1226` — gatherer/adapter substrate + run-engine + flags.
- `TASK-1227` — scoring config + honest degradation `null≠0`.
- Runtime headless Chrome en Cloud Run (ops-worker o probe worker) [verificar disponibilidad].

### Blocks / Impacts

- Habilita `TASK-1267` (entity infra probes — comparte el substrate de probe gatherer).
- Habilita `TASK-1269` (fix-it artifacts — los findings de probe dicen qué falta: JSON-LD, llms.txt, robots).
- Sube el report de descriptivo a causal + agrega el eje diferenciador del lead magnet.
- Impacta el report contract (nuevos ejes/score paralelo) → coordinar con `TASK-1252` (report artifact design) para su render.

### Files owned

- `src/lib/growth/ai-visibility/probes/` [nuevo: gatherer + cada probe]
- `src/lib/growth/ai-visibility/scoring/readiness-config.ts` [nuevo: dims de readiness, eje paralelo]
- `src/lib/growth/ai-visibility/report/contracts.ts` [extender: score paralelo de readiness]
- `src/lib/growth/ai-visibility/flags.ts` [extender]
- `src/lib/reliability/queries/growth-grader-probe-*.ts` [nuevo signal]
- `migrations/` [si los probe results se persisten en tabla nueva — verificar]
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- Run-engine + gatherer/adapter substrate (TASK-1226).
- Scoring config con 7 dimensiones de percepción (pesos suman 100) + honest degradation `null≠0` (TASK-1227).
- Report contract con dimensiones + severidad nombrada + provenance (`report/contracts.ts`).

### Gap

- Cero probes del sitio analizado: el grader nunca hace fetch de robots.txt / JSON-LD / llms.txt / sitemap / CWV del dominio.
- Cero medición de agentic-web readiness (WebMCP tools, `.well-known/mcp`, API discoverability, DOM semántico).
- No hay runtime headless para Lighthouse/WebMCP en el pipeline del grader.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: nuevo probe gatherer + score de readiness (paralelo al de percepción)
- Consumidores afectados: run-engine, report builder, public lead magnet, client portal report
- Runtime target: `staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: gatherer/adapter substrate (TASK-1226), scoring honest degradation (TASK-1227), report contract.
- Contrato nuevo o modificado: probe gatherer interface + `readiness_score` paralelo (dos ejes: structural + agentic) + nuevos campos public-safe en el report.
- Backward compatibility: `gated` (probes detrás de flag; score de percepción intacto).
- Full API parity: el probe gatherer es un primitive server-side reusable por UI/Nexa/MCP; "diagnostica este dominio" es una capability gobernada, no lógica de pantalla.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.*` (probe results — tabla nueva append-only o columnas en run [verificar]).
- Invariantes que no se pueden romper:
  - Score de percepción `ai_visibility_score_v1` NO cambia ni se contamina con probes técnicos (ejes ortogonales separados).
  - Probe no medible → `null` + razón, excluido del promedio; nunca 0.
  - Probes son read-only sobre superficies públicas; cero auth/mutación/endpoint privado del sitio analizado.
  - WebMCP es el techo, no el único camino: un sitio sin WebMCP pero con MCP/structured-data/DOM semántico puede scorear alto.
- Tenant/space boundary: dominio público sin sesión; el probe corre sobre un dominio de tercero declarado por el lead.
- Idempotency/concurrency: probe por `(run_id, probe_kind)`; re-ejecución idempotente; rate-limit cortés al sitio analizado.
- Audit/outbox/history: probe results append-only; reliability signal de probe failure/lag.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla de probe results o columnas; sin destructivo).
- Default state: `flag OFF` (`GROWTH_AI_VISIBILITY_PROBES_ENABLED` / `..._AGENTIC_READINESS_ENABLED`) hasta shadow staging.
- Backfill plan: N/A (prospectivo).
- Rollback path: flags OFF + redeploy; el report omite los ejes de readiness y sigue con percepción.
- External coordination: runtime headless Chrome en Cloud Run; presupuesto de Lighthouse runs.

### Security and access

- Auth/access gate: probes server-side / worker; ningún surface client-side ejecuta probes.
- Sensitive data posture: sin PII; solo el dominio público del lead.
- Error contract: errores de probe sanitizados (`captureWithDomain(err, 'growth'...)`); honest degradation, no raw fetch error al cliente.
- Abuse/rate-limit posture: rate-limit cortés al sitio analizado (no martillar), timeout por probe, budget de Lighthouse runs, circuit breaker si el dominio no responde.

### Runtime evidence

- Local checks: `pnpm test` focal de cada probe + del scorer de readiness (incl. honest degradation `null`).
- DB/runtime checks: 1 run real contra un dominio conocido (p.ej. el propio greenhouse) + verificar probe results + score paralelo en PG.
- Integration checks: Lighthouse Node API con flag WebMCP (`registered-webmcp-tools`) sobre un dominio con tools registradas; fetch real de robots.txt/llms.txt/sitemap.
- Reliability signals/logs: `growth.grader.probe.failure_rate` / `..._lag` [verificar naming].
- Production verification sequence: shadow staging → probe de dominios de prueba → score paralelo correcto → flip flags → smoke prod.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
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
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Probe gatherer substrate + persistencia

- Crear el gatherer de probes (`probes/`) con un probe interface uniforme `(domain, ctx) → ProbeResult{ signal, value, score, reason }`; persistencia append-only por `(run_id, probe_kind)`.
- Flags `GROWTH_AI_VISIBILITY_PROBES_ENABLED` (default OFF); wiring al run-engine como gatherer paralelo (no en el pipeline de prompt-packs).

### Slice 2 — Structural AEO probes (GAP 2)

- Probes HTTP read-only: `robots.txt` (acceso de GPTBot/PerplexityBot/ClaudeBot/Google-Extended/OAI-SearchBot), JSON-LD/schema.org en el HTML, `llms.txt`/`llms-full.txt`, sitemap/canonical, answer-capsule heuristics, Core Web Vitals/render (vía Lighthouse).
- Scorer `structural_readiness` (eje paralelo) con honest degradation por señal.

### Slice 3 — Agentic-web readiness probes (GAP 3)

- Probes: Lighthouse `registered-webmcp-tools` (headless Chrome con flag WebMCP), `.well-known/mcp` / OpenAPI discoverability, DOM semántico/ARIA/landmarks, `potentialAction`/`SearchAction` en JSON-LD.
- Scorer `agentic_readiness` (eje paralelo) con la rubric de la skill `webmcp`; WebMCP = techo, MCP/structured-data/DOM = caminos parciales.

### Slice 4 — Report contract + signal + ledger

- Extender el report contract con el/los score(s) de readiness reportados **lado a lado** con el de percepción (public-safe).
- Reliability signal de probe failure/lag + fila por flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Out of Scope

- Render visual del nuevo eje en la página/portal/email (lo gobierna `TASK-1252` report artifact + `TASK-1241`/`TASK-1248`).
- Generar los artefactos fix-it (JSON-LD/llms.txt starter) — eso es `TASK-1269`.
- Cambiar el score de percepción ni sus pesos.
- Probes que requieran auth o muten el sitio analizado.

## Detailed Spec

El probe gatherer es un segundo tipo de "fuente de evidencia" del run-engine, hermano de los provider adapters pero de naturaleza distinta: en vez de preguntarle a un answer engine sobre la marca, le hace preguntas técnicas **al sitio de la marca**. Cada probe es una función pura-ish `(domain) → ProbeResult` con un `score` 0-100 o `null` (+ `reason`) y la evidencia cruda (status code, snippet de robots.txt, lista de tools WebMCP, etc.). Los probes HTTP (robots/sitemap/llms.txt/JSON-LD parse) son baratos y corren en cualquier runtime Node; los probes que necesitan render (Lighthouse, WebMCP detection, DOM semántico) requieren headless Chrome con flags → corren en Cloud Run (worker), nunca inline en Vercel.

Decisión arquitectónica central: **dos ejes ortogonales, no un número.** El overall de percepción (`ai_visibility_score_v1`) responde "¿te mencionan?"; el/los score(s) de readiness responden "¿te pueden usar?". Fusionarlos sería mezclar dimensiones ortogonales (regla dura del overlay). El report los muestra lado a lado. Internamente: una `ReadinessScore` con dos sub-ejes (`structural`, `agentic`), cada uno con sus dimensiones rebalanceadas a 100 dentro del eje, honest degradation por señal.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (substrate) → Slice 2 (structural) y Slice 3 (agentic) pueden ir en paralelo una vez cerrado Slice 1 → Slice 4 (report+signal) cierra al final.
- No exponer ningún eje de readiness en el report (Slice 4) antes de que su scorer tenga honest degradation testeada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Probes contaminan el score de percepción | data quality | medium | ejes ortogonales separados; percepción intacta; test de no-blend | score de percepción cambia sin causa |
| Probe martilla el sitio analizado (abuso) | reliability/legal | medium | rate-limit cortés + timeout + circuit breaker + read-only GET | probe failure/lag signal |
| Lighthouse/WebMCP sin runtime headless | integration | high | correr en Cloud Run worker, no Vercel; degradar a probes HTTP si headless no disponible | probe `skipped: no_headless` |
| Señal no medible reportada como 0 | data quality | medium | honest degradation `null`+razón, excluida del promedio | dimensión `null` rate |
| WebMCP es pre-estándar (API drift) | robustness | medium | detección tolerante a `navigator.modelContext`/`document.modelContext`; flag; degradar si no detecta | agentic probe skip rate |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_PROBES_ENABLED` (structural) + `GROWTH_AI_VISIBILITY_AGENTIC_READINESS_ENABLED` (agentic), ambos default `false`. Flip por eje tras shadow staging. Revert: flags OFF + redeploy; el report omite los ejes. Tiempo: <5 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + flag OFF (gatherer no se invoca) | <5 min | si |
| Slice 2 | flag structural OFF | <5 min | si |
| Slice 3 | flag agentic OFF | <5 min | si |
| Slice 4 | revert report fields (additive) + flags OFF | <5 min | si |

### Production verification sequence

1. Deploy con flags OFF + verificar runs existentes sin cambio (percepción intacta).
2. Flip `PROBES_ENABLED` en staging + run sobre dominio de prueba + verificar `structural_readiness` + honest degradation de una señal ausente.
3. Flip `AGENTIC_READINESS_ENABLED` en staging + run sobre dominio con WebMCP tools (demo) + verificar `agentic_readiness`.
4. Revisar costo de Lighthouse runs + signals steady.
5. Flip flags en prod + smoke low-volume.

### Out-of-band coordination required

- Confirmar runtime headless Chrome en Cloud Run (ops-worker o probe worker dedicado) + flag WebMCP del Chrome.
- `TASK-1252` (report artifact design) debe contemplar el eje de readiness en su sistema visual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El probe gatherer corre como fuente paralela del run-engine, separado del pipeline de prompt-packs.
- [ ] Probes structural (robots IA, JSON-LD, llms.txt, sitemap, CWV) producen `structural_readiness` con honest degradation `null≠0`.
- [ ] Probes agentic (WebMCP tools, `.well-known/mcp`/API, DOM semántico, `potentialAction`) producen `agentic_readiness`.
- [ ] El score de percepción `ai_visibility_score_v1` queda intacto y NO se fusiona con los ejes de readiness (test de no-blend verde).
- [ ] Todos los probes son read-only sobre superficies públicas; cero auth/mutación; rate-limit cortés + timeout.
- [ ] Lighthouse/WebMCP corren en Cloud Run worker, no en Vercel; degradan a `skipped` si no hay headless.
- [ ] Reliability signal de probe failure/lag + fila(s) por flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Run real sobre dominio de prueba en staging + verificación PG de probe results + score paralelo

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1252 report artifact, TASK-1267 entity probes, TASK-1269 fix-it)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado

## Follow-ups

- `TASK-1269` consume estos findings para generar artefactos fix-it.
- Si Greenhouse adopta WebMCP propio, exponer sus capabilities gobernadas como tools (loop `propose→confirm→execute`), separado de esta task.
- Evaluar un `agentic_readiness` benchmark público (percentil por industria) como gancho de marketing.

## Open Questions

1. ¿Los probe results se persisten en tabla nueva append-only o como columnas/JSONB en el run? Propuesta: tabla `grader_probe_results` append-only (consistente con `provider_observations`), por trazabilidad y re-score.
2. ¿El eje de readiness es un solo `readiness_score` con dos sub-ejes o dos scores separados en el report? Propuesta: un `ReadinessScore{ structural, agentic }` para mantenerlos juntos como "operabilidad" pero separados del de percepción.
