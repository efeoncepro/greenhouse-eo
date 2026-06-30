# TASK-1281 — Growth AI Visibility: Headless Probe Runtime (Chromium en ops-worker · CWV + WebMCP)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|integrations|reliability|ops`
- Blocked by: `none`
- Branch: `task/TASK-1281-growth-ai-visibility-headless-probe-runtime`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

TASK-1266 dejó listos dos probes headless-dependientes (`core_web_vitals` y `webmcp_tools`) detrás de una seam de inyección `HeadlessRenderer` que hoy resuelve `null` → ambos degradan a `skipped/no_headless`. Esta task implementa el `HeadlessRenderer` concreto (Chromium + Lighthouse) en el ops-worker Cloud Run y lo inyecta en el path async del gatherer, activando la medición real de Core Web Vitals + detección de tools WebMCP. NO toca el substrate de probes, el scoring ni el report contract.

## Why This Task Exists

El probe gatherer de TASK-1266 cubre el eje structural casi completo y el eje agentic vía señales HTTP (`.well-known/mcp`, OpenAPI, potentialAction, DOM estático), pero dos señales de alto valor quedan sin medir porque requieren renderizar la página con JavaScript:

- **Core Web Vitals** (`core_web_vitals`, eje structural): rendimiento real de render (LCP/CLS/INP) — señal de calidad que los crawlers usan; sólo medible con Lighthouse sobre Chromium.
- **WebMCP tools** (`webmcp_tools`, eje agentic): `navigator.modelContext`/`document.modelContext` registradas — el **techo** de la operabilidad agéntica; sólo detectable ejecutando el JS de la página.

Sin runtime headless, `probe_headless_coverage` reporta ~2/10 probes sin medir por run (verificado en el rollout staging de TASK-1266). Esta task cierra esa brecha. La decisión de TASK-1266 fue explícita: **headless = seam, no infra** — el cableado de Chromium se difirió a un follow-up por costo de imagen (~200 MB), latencia de arranque y presupuesto de Lighthouse, que requieren sign-off. Esta es esa task.

## Goal

- Implementar un `HeadlessRenderer` concreto (`render(url) → { html, coreWebVitals, webmcpTools }`) sobre Chromium + Lighthouse, server-only, con timeout + presupuesto + degradación honesta.
- Disponer Chromium en la imagen del ops-worker Cloud Run e inyectar el renderer SOLO en el path async del gatherer (Vercel sigue pasando `null`).
- Activar `core_web_vitals` + `webmcp_tools` (dejan de ser `skipped/no_headless`) sin cambiar el substrate de probes, el scoring ni el report contract.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §Delta 2026-06-28 TASK-1266 (Site Readiness Probe Layer) + §Invariantes operativos para agentes (Site Readiness Probe Layer).
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — ops-worker Cloud Run (imagen, deploy, recursos).
- `docs/tasks/complete/TASK-1266-growth-ai-visibility-site-readiness-probe-layer.md` — la seam `HeadlessRenderer`, los probes headless-dependientes y el contrato `ProbeOutcome`.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — signals (`probe_failure_rate`, `probe_headless_coverage`).

Reglas obligatorias:

- **No tocar el substrate de probes, el scoring ni el report contract.** Esta task SOLO provee el `HeadlessRenderer` concreto y lo inyecta; `core_web_vitals.ts` y `webmcp-tools.ts` ya consumen `ctx.headless` y ya tienen su lógica de scoring. La readiness se recomputará automáticamente desde los probe results.
- **Headless SOLO en Cloud Run, NUNCA en Vercel.** El renderer se inyecta en el path del worker (drain). El path inline de Vercel sigue pasando `headless: null` (los probes degradan a skipped ahí). Regla dura del overlay TASK-1266.
- **Honest degradation se mantiene:** si el render falla (timeout, navegación, sin métricas), el probe degrada a `failed`/`skipped` con `reason`, NUNCA inventa un score. Cero crash del run de percepción (el gatherer ya es best-effort).
- **Read-only sobre el sitio analizado:** el render es navegación pasiva (GET + ejecución de su propio JS); cero interacción, cero auth, cero mutación. Rate-limit/cortesía + timeout + presupuesto de runs Lighthouse.
- **`@core` boundary:** el renderer vive en `src/lib/**` worker-bundled → NUNCA importar `@core/theme/*`/`@menu`/`@layouts`; toda dep nueva importada por código worker-bundled debe estar en `dependencies` (no `devDependencies`) — `pnpm worker:runtime-deps-gate`.

## Normative Docs

- `services/ops-worker/Dockerfile` — imagen del worker (base `node:22-slim`, esbuild bundle, shims).
- `services/ops-worker/deploy.sh` — env vars + recursos Cloud Run (memoria/CPU/timeout).
- `services/ops-worker/server.ts` — handler del drain (`handleGrowthGraderDrain`).
- `src/lib/growth/ai-visibility/probes/contracts.ts` — `HeadlessRenderer`, `HeadlessRenderResult`, `HeadlessCoreWebVitals`.

## Dependencies & Impact

### Depends on

- `TASK-1266` (complete) — seam `HeadlessRenderer` + probes `core_web_vitals`/`webmcp_tools` + gatherer + flags `GROWTH_AI_VISIBILITY_PROBES_ENABLED`/`..._AGENTIC_READINESS_ENABLED` (staging ON).
- Runtime Cloud Run ops-worker con capacidad de instalar Chromium (memoria suficiente; hoy 2Gi/2CPU [verificar en `deploy.sh`]).

### Blocks / Impacts

- Sube la cobertura de los dos ejes de readiness (CWV en structural, WebMCP en agentic) — el report de TASK-1252 mostrará esas dims medidas en vez de `sin_dato`.
- Impacta la imagen + recursos del ops-worker (tamaño, arranque, memoria) — compartido staging+prod (TASK-930).

### Files owned

- `src/lib/growth/ai-visibility/probes/headless/` [nuevo: renderer concreto + helpers]
- `services/ops-worker/Dockerfile` [extender: Chromium en la imagen]
- `services/ops-worker/server.ts` [extender: inyectar el renderer en el drain]
- `services/ops-worker/deploy.sh` [verificar: memoria/CPU/timeout + flag de presupuesto headless]
- `src/lib/growth/ai-visibility/run-engine.ts` o `probes/command.ts` [extender: pasar el renderer a `gatherRunProbes` en el path worker]
- `package.json` [dependency del stack headless]

## Current Repo State

### Already exists

- Seam `HeadlessRenderer` + `HeadlessRenderResult { html, coreWebVitals, webmcpTools }` (`probes/contracts.ts`).
- Probes `core_web_vitals` (lee `ctx.headless.render().coreWebVitals`) y `webmcp_tools` (lee `ctx.headless.render().webmcpTools`); ambos degradan a `skipped/no_headless` sin renderer.
- `gatherRunProbes(runId, { headless })` acepta el renderer inyectado (default null).
- Probes corriendo en el ops-worker (path async) — `GROWTH_AI_VISIBILITY_PROBES_ENABLED` ON en staging.
- `@playwright/test` en `devDependencies` (E2E); Chromium NO está en la imagen del ops-worker.

### Gap

- No existe `HeadlessRenderer` concreto: la implementación real de render + Lighthouse CWV + detección WebMCP.
- La imagen del ops-worker (`node:22-slim`) no trae Chromium ni un stack headless en `dependencies`.
- El drain del worker no inyecta un renderer → `gatherRunProbes` recibe `null` también en el worker.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: probe results (`greenhouse_growth.grader_probe_results`) — ya existente; esta task sólo cambia que 2 probe kinds pasen de `skipped` a `succeeded`/`failed` medido.
- Consumidores afectados: probe gatherer (worker), readiness engine, report builder, reliability signals.
- Runtime target: `worker` (Cloud Run ops-worker), `staging|production`.

### Contract surface

- Contrato existente a respetar: interface `HeadlessRenderer` + `HeadlessRenderResult`/`HeadlessCoreWebVitals` (TASK-1266); contrato `ProbeOutcome` (status/score/reason/evidence); gatherer best-effort.
- Contrato nuevo o modificado: implementación concreta de `HeadlessRenderer` (no cambia la interface) + inyección en el path worker.
- Backward compatibility: `compatible` (additive; sin renderer el comportamiento es el actual — skipped).
- Full API parity: el renderer es un detalle de runtime del gatherer (primitive server-side ya canónico); no introduce una capability nueva. `N/A — no capability` (no es una acción de negocio nueva; es runtime de una fuente de evidencia existente).

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.grader_probe_results` (sin cambio de schema; cambian valores: `core_web_vitals`/`webmcp_tools` con `score` medido en vez de `null`).
- Invariantes que no se pueden romper:
  - El render NUNCA muta el sitio analizado ni autentica (navegación pasiva read-only).
  - Honest degradation: render fallido → `failed`/`skipped` + reason, NUNCA score inventado.
  - El renderer headless SÓLO se inyecta en el path Cloud Run; Vercel sigue con `null`.
  - El run de percepción NUNCA se degrada por el headless (gatherer best-effort; presupuesto/timeout acotan el costo).
- Tenant/space boundary: dominio público de tercero declarado por el lead; sin sesión.
- Idempotency/concurrency: por `(run_id, probe_kind)` (upsert existente); un render por probe; presupuesto/concurrencia acotada en el worker.
- Audit/outbox/history: probe results (upsert recomputable, ya existente); reliability signals de probe.

### Migration, backfill and rollout

- Migration posture: `none` (sin cambio de schema).
- Default state: `flag OFF` — gateado por `GROWTH_AI_VISIBILITY_PROBES_ENABLED` (ya existe) + un flag/config nuevo de presupuesto headless (default conservador) para activar el render por separado del resto de los probes.
- Backfill plan: N/A (prospectivo; runs nuevos miden CWV/WebMCP).
- Rollback path: deshabilitar el render (flag/config a OFF → el renderer no se inyecta → vuelve a `skipped/no_headless`) + revert del Dockerfile si la imagen rompe; redeploy ops-worker.
- External coordination: tamaño de imagen + recursos Cloud Run (memoria para Chromium) + presupuesto de Lighthouse runs — sign-off de ops/budget.

### Security and access

- Auth/access gate: worker-side; ningún surface client-side ejecuta render.
- Sensitive data posture: sin PII; sólo el dominio público del lead. El HTML renderizado NO se persiste crudo (sólo métricas/conteos en `evidence`).
- Error contract: errores de render sanitizados (`captureWithDomain(err,'growth',...)`); honest degradation, nunca raw error al cliente.
- Abuse/rate-limit posture: timeout por render + presupuesto de runs Lighthouse + concurrencia acotada en el worker + circuit breaker si el dominio no responde.

### Runtime evidence

- Local checks: `pnpm test` focal del `HeadlessRenderer` (con browser fake/inyectado) + de los probes CWV/WebMCP con un renderer real-ish.
- DB/runtime checks: 1 run real en staging sobre un dominio conocido → `grader_probe_results` con `core_web_vitals`/`webmcp_tools` en `succeeded`/`failed` (no `skipped/no_headless`).
- Integration checks: Chromium arranca en la imagen del ops-worker (smoke de arranque); Lighthouse devuelve métricas; `navigator.modelContext` evaluado en un dominio con tools (demo).
- Reliability signals/logs: `growth.ai_visibility.probe_headless_coverage` debe caer (menos `no_headless`); `probe_failure_rate` steady.
- Production verification sequence: deploy staging → run real → CWV/WebMCP medidos → revisar costo/latencia + memoria del worker → prod vía release control plane.

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

### Slice 1 — HeadlessRenderer concreto + tests

- Implementar `src/lib/growth/ai-visibility/probes/headless/*`: un `HeadlessRenderer` que lance Chromium, navegue al `url`, devuelva `{ html, coreWebVitals, webmcpTools }`. CWV vía Lighthouse (o métricas equivalentes); WebMCP vía `page.evaluate` de `navigator.modelContext`/`document.modelContext` (detección tolerante a pre-estándar). Timeout + presupuesto + degradación honesta (devuelve `coreWebVitals: null` / `webmcpTools: null` si no pudo medir, sin lanzar).
- Tests con un browser/launcher inyectado (sin Chromium real): el renderer mapea correctamente métricas → `HeadlessCoreWebVitals` y tools → `string[]`, y degrada a null ante fallo.

### Slice 2 — Chromium en la imagen + inyección en el worker

- Extender `services/ops-worker/Dockerfile` para disponer Chromium (apt o `@sparticuz/chromium`/`playwright-core` — decisión en Discovery) + agregar el stack headless a `dependencies` (no `devDependencies`); pasar `pnpm worker:runtime-deps-gate`.
- Inyectar el `HeadlessRenderer` concreto SOLO en el path del worker (`handleGrowthGraderDrain` → `drainPendingGraderRuns`/`executeClaimedGraderRun` → `gatherRunProbes({ headless })`). Vercel/inline sigue con `null`.
- Verificar memoria/CPU/timeout en `deploy.sh` suficientes para Chromium; ajustar si hace falta.

### Slice 3 — Presupuesto/observabilidad + rollout

- Flag/config de presupuesto headless (default conservador) para activar el render por separado; timeout + concurrencia + circuit breaker.
- Verificar que `probe_headless_coverage` cae (menos `no_headless`) y `probe_failure_rate` steady; fila en `FEATURE_FLAG_STATE_LEDGER.md` si se agrega flag nuevo.
- Rollout staging (run real → CWV/WebMCP medidos + costo/memoria revisados) → prod vía release control plane.

## Out of Scope

- Cambiar el substrate de probes, el scoring (`readiness-config`/`readiness-engine`) o el report contract (TASK-1266 ya los cerró).
- Agregar probe kinds nuevos (eso es TASK-1267 entity probes).
- Render visual del eje de readiness (TASK-1252).
- Headless en Vercel (prohibido por diseño).
- Backfill de runs viejos (prospectivo).

## Detailed Spec

El render es navegación pasiva: el worker lanza Chromium, navega al dominio del sujeto (mismo dominio que ya resuelve `resolveSubjectSite`), ejecuta el JS de la página, corre Lighthouse para CWV y evalúa `navigator.modelContext` para WebMCP, y cierra el browser. Devuelve un `HeadlessRenderResult`; el resto (scoring de CWV desde `performanceScore`, scoring de WebMCP desde `toolCount`) ya vive en los probes de TASK-1266. La decisión central es **dónde corre**: SOLO en el ops-worker (path async), nunca en Vercel. El renderer es inyectable (el worker pasa el concreto; tests pasan un fake; Vercel pasa null). Costo: Lighthouse es caro (CPU + tiempo); acotar con timeout por render, presupuesto de runs y concurrencia baja en el worker (el drain ya es secuencial por run).

Decisión de stack headless (Discovery): opciones (a) `playwright-core` + Chromium del sistema (apt en Dockerfile), (b) `puppeteer-core` + `@sparticuz/chromium` (patrón Cloud Run serverless), (c) `lighthouse` Node API sobre un Chromium lanzado. Preferir el que minimice tamaño de imagen + arranque y dé CWV confiables; documentar el rationale.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (renderer + tests) → Slice 2 (imagen + inyección worker) → Slice 3 (presupuesto + rollout). Slice 2 NO puede shipear sin Slice 1 (el worker inyectaría algo inexistente). El render real en prod NO se activa hasta Slice 3 (presupuesto + verificación de costo/memoria en staging).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Imagen del worker crece ~200 MB / arranque lento | ops/cloud | high | medir tamaño + cold start; `@sparticuz/chromium` o Chromium apt slim; min-instances/timeout en deploy.sh | deploy health / cold-start latency |
| Lighthouse satura CPU/memoria del worker | reliability | medium | timeout por render + concurrencia baja + presupuesto de runs; el drain es secuencial | `probe_failure_rate` sube / OOM en logs Cloud Run |
| Render rompe el run de percepción | data quality | low | gatherer best-effort (no lanza); render degrada a null/skipped | run sigue `succeeded`; `probe_headless_coverage` |
| Costo de Lighthouse por run alto | reliability/budget | medium | flag/config de presupuesto headless default conservador; activar gradual | costo runs / signal de presupuesto |
| Dep headless en devDependencies rompe el bundle worker | integration | medium | dependency en `dependencies` + `pnpm worker:runtime-deps-gate` | worker startup crash / gate rojo |
| Chromium compartido staging+prod (TASK-930) | ops | low | flag/config gateado; deploy.sh declarativo staging ON/prod OFF | config drift signal |

### Feature flags / cutover

- Reusa `GROWTH_AI_VISIBILITY_PROBES_ENABLED` (gate maestro existente) + un flag/config nuevo de presupuesto headless (p.ej. `GROWTH_AI_VISIBILITY_HEADLESS_PROBES_ENABLED`, default OFF) para activar el render por separado del resto de los probes HTTP. Default OFF en prod hasta verificar costo/memoria en staging. Revert: flag/config a OFF → no se inyecta el renderer → vuelve a `skipped/no_headless`. Tiempo: <5 min (Vercel env + redeploy worker / o gcloud env update).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (código nuevo aislado, no inyectado aún) | <5 min | si |
| Slice 2 | revert Dockerfile + no inyectar renderer (flag OFF) + redeploy worker | <10 min | si |
| Slice 3 | flag de presupuesto headless a OFF + redeploy | <5 min | si |

### Production verification sequence

1. Deploy staging con el flag headless OFF → verificar que el worker arranca con la imagen nueva (Chromium presente) y los probes HTTP siguen midiendo igual.
2. Flip flag headless ON en staging → run real sobre dominio conocido → `grader_probe_results` con `core_web_vitals`/`webmcp_tools` medidos (no `skipped/no_headless`).
3. Revisar costo/latencia/memoria del worker + `probe_failure_rate` steady + `probe_headless_coverage` cae.
4. Run sobre un dominio con tools WebMCP (demo) → `webmcp_tools` con `toolCount > 0`.
5. Flip en prod vía release control plane (EPIC-020) + monitor de signals + costo.

### Out-of-band coordination required

- Sign-off de ops/budget: tamaño de imagen del ops-worker + recursos Cloud Run (memoria para Chromium) + presupuesto de Lighthouse runs.
- Coordinar con TASK-930 (ops-worker comparte servicio staging/prod): el flag headless debe quedar declarativo staging ON / prod OFF en `deploy.sh`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `HeadlessRenderer` concreto implementado (`render(url) → { html, coreWebVitals, webmcpTools }`), server-only, con timeout + degradación honesta (devuelve null sin lanzar ante fallo).
- [ ] Chromium disponible en la imagen del ops-worker; stack headless en `dependencies`; `pnpm worker:runtime-deps-gate` verde; sin import `@core` worker-bundled.
- [ ] El renderer se inyecta SOLO en el path del worker; Vercel/inline sigue con `headless: null`.
- [ ] `core_web_vitals` y `webmcp_tools` pasan de `skipped/no_headless` a `succeeded`/`failed` medido en un run real de staging (evidencia en `grader_probe_results`).
- [ ] El run de percepción NO se degrada por el headless (sigue `succeeded`); `probe_failure_rate` steady; `probe_headless_coverage` cae.
- [ ] Substrate de probes, scoring y report contract de TASK-1266 sin cambios (no-regresión).
- [ ] Flag/config de presupuesto headless default OFF en prod; fila en `FEATURE_FLAG_STATE_LEDGER.md` si se agrega flag nuevo.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm worker:runtime-deps-gate`
- Run real en staging + verificación de `grader_probe_results` (CWV/WebMCP medidos) + signals

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] chequeo de impacto cruzado (TASK-1266 substrate, TASK-1252 render, TASK-930 ops-worker config)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado si se agregó flag

## Follow-ups

- Si Greenhouse adopta WebMCP propio, exponer sus capabilities gobernadas como tools (separado de esta task; es readiness del sitio analizado, no del portal).
- Evaluar reusar el renderer headless para otros probes futuros (screenshots, render-diff) sin reabrir esta infra.

## Open Questions

1. ¿Stack headless: `playwright-core` + Chromium apt, `puppeteer-core` + `@sparticuz/chromium`, o `lighthouse` Node API sobre Chromium lanzado? Propuesta: el que minimice tamaño de imagen + cold start y dé CWV confiables; decidir en Discovery con medición de imagen.
2. ¿Flag nuevo dedicado (`GROWTH_AI_VISIBILITY_HEADLESS_PROBES_ENABLED`) o reusar sólo `GROWTH_AI_VISIBILITY_PROBES_ENABLED`? Propuesta: flag dedicado para activar el costo headless por separado del resto de los probes (baratos), con default OFF.
3. ¿Recursos del ops-worker (2Gi/2CPU [verificar]) alcanzan para Lighthouse + Chromium concurrente, o hace falta subir memoria? Resolver con smoke de arranque + 1 run real en staging.
