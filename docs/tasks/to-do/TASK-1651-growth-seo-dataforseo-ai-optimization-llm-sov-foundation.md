# TASK-1651 — Growth SEO: familia `ai_optimization` (DataForSEO) + fundación SoV de marca en LLMs per-org

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Definida`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1303 (patrón spend fence + primer cableado register-provider-spend en ops-worker)`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Ampliar el allowlist DataForSEO con la familia **`ai_optimization`** (`/v3/ai_optimization/`) siguiendo
el proceso gobernado del ADR EPIC-022 (familia + CHECK + entitlement, nunca aflojar el candado), y
fundar sobre ella la capacidad **SoV de marca en LLMs per-org**: captura batch de **LLM Mentions**
(base longitudinal del proveedor desde 2025-08-01: menciones/citas de marca en ChatGPT y Google AI
Overview, con timeseries new/lost y top domains/pages/brands) hacia snapshots append-only en PG, con
readers per-org y **MCP tools en el mismo PR** (mandato lane ecosystem TASK-1645). Es la lente ◑
"lo que los LLMs de terceros responden y citan", complementaria — nunca fusionada — con el SoV que
el grader deriva de sus propias observaciones (TASK-1424).

## Why This Task Exists

El AI Visibility Grader observa superficies generando prompts propios (costoso, muestra puntual);
no existe hoy ninguna fuente **longitudinal** de menciones de marca en respuestas AI por cliente.
DataForSEO AI Optimization API la ofrece a ~$1.1 por 1.000 filas (LLM Mentions: $0.1/request +
$0.001/fila, sin mínimo mensual), con `fan_out_queries` y `brand_entities` gratis — insumo directo
para el entity work AEO y para prospección de dominios citados (digital PR). La familia está FUERA
del allowlist (candidata #1 declarada en la skill `dataforseo-operator`, references/08), así que hoy
no hay camino runtime legal para consumirla. Sin esta task, el SoV en LLMs por cliente se queda en
análisis manual no gobernado (sin entitlement, sin spend ledger, sin atribución per-org).

## Goal

- La familia `ai_optimization` existe en `DATAFORSEO_FAMILIES` con `requiresOrganization: true`,
  CHECK de `seo_provider_spend_daily` migrado en el mismo PR y paridad TS↔CHECK verde.
- Captura batch gobernada de LLM Mentions per-org (entitlement + budget + spend ledger + breaker)
  materializa snapshots append-only en PG vía Cloud Scheduler + ops-worker.
- Readers per-org (resumen SoV, timeseries, top domains/pages/brands) expuestos con sus MCP tools
  en el mismo PR; degradación honesta (`no_llm_sov_data`, jamás ceros fantasma).
- Semántica ◑ (estimado de mercado del proveedor) declarada en el contrato; cobertura real
  documentada (ChatGPT US/English + Google AI Overview solamente).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO, §6 DataForSEO
  governance, §7 Full API Parity + MCP, §8 scheduling async, §9 entitlements, §13 riesgos)
- `docs/architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md` (decisión #4: ampliar con
  allowlist cerrado; #8 honestidad ●/◑; #9 scheduling async)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `.claude/skills/dataforseo-operator/SKILL.md` + `references/08-ai-optimization.md` (deep-dive de la
  API con costos y gotchas as-of 2026-08-06) + `references/07-contrato-greenhouse.md`

Reglas obligatorias:

- TODO acceso al proveedor vía `postDataForSeoTask` (`src/lib/ai/dataforseo.ts`); NUNCA fetch directo
  ni cliente paralelo. La familia nueva se agrega al registry, no se abre el candado.
- Familia nueva ⇒ migración del CHECK de `greenhouse_growth.seo_provider_spend_daily` en el MISMO PR
  (el test `dataforseo-family-check-parity.test.ts` rompe el build si TS y CHECK divergen).
- Todo write provider-facing pasa por `enforceSeoRunEntitlement` con `estimatedCostUsd` del batch
  completo (límite documentado del gate: se consulta una vez, el gasto se acumula después).
- Materialización vía Cloud Scheduler + ops-worker (NUNCA Vercel cron); el entrypoint del worker
  importa `@/lib/growth/seo/register-provider-spend` (sin eso, el transporte LANZA).
- Boundary §1.1: NUNCA JOIN/VIEW/FK entre estas tablas nuevas y `grader_*`; cruce en memoria por
  `organization_id`; los ejes nunca se promedian entre sí.
- Todo reader nuevo del dominio expone su MCP tool en el MISMO PR (mandato 2026-08-05, TASK-1645).

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (el flag nuevo se registra en el mismo PR)
- `docs/tasks/in-progress/TASK-1303-growth-seo-rank-capture-evolution-reader.md` (patrón de captura
  batch + spend fence que esta task reutiliza)

## Dependencies & Impact

### Depends on

- `TASK-1300` (complete) — family registry + breaker + spend ledger.
- `TASK-1301` (complete) — `enforceSeoRunEntitlement` + capabilities `growth.seo.*`.
- `TASK-1303` (in-progress) — primer cableado de `register-provider-spend` en ops-worker + patrón de
  batch/spend fence. Esta task NO re-implementa ese cableado: lo reutiliza.
- `TASK-1645` (complete) — lane ecosystem `/api/platform/ecosystem/growth/seo/*` + patrón MCP tools.
- Tabla `greenhouse_growth.seo_provider_spend_daily` (migración `20260805194114467_task-1300-*`).

### Blocks / Impacts

- Task consumer `ui-ux` futura (panel SoV en LLMs per-org — crear al cerrar esta foundation; NO
  existe aún, ver Follow-ups).
- `TASK-1424`/`TASK-1425` (AEO SoV per-engine del grader, EPIC-020): NO se tocan. Son la lente
  "observación propia del grader"; esta task es la lente "base longitudinal del proveedor". Si ambas
  cierran, una vista podrá mostrarlas lado a lado (cruce en memoria, nunca fusión de scoring).
- `TASK-1311` (citation attribution URL-grounded): consumidor potencial de top domains/pages.
- Skill `dataforseo-operator` (references/08 y sección "Ampliar el allowlist"): actualizar al cierre
  (la familia deja de ser "candidata #1" y pasa a estar EN el allowlist).

### Files owned

- `src/lib/ai/dataforseo-families.ts` (familia nueva) + `src/lib/ai/__tests__/dataforseo-families.test.ts`
- `migrations/[timestamp]_task-1651-ai-optimization-family-llm-sov.sql` (CHECK + tablas nuevas)
- `src/lib/growth/seo/llm-sov/**` (contracts, captura, readers, MCP tools) `[verificar nombre final
  del sub-módulo en Discovery]`
- `services/ops-worker/server.ts` + `services/ops-worker/deploy.sh` (endpoint + flag, patrón TASK-1303)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (delta §6 familia nueva)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag nuevo)

## Current Repo State

### Already exists

- Cliente canónico + allowlist 5 familias + breaker + spend ledger + parity test (TASK-1300):
  `src/lib/ai/dataforseo.ts`, `dataforseo-families.ts`, `dataforseo-breaker.ts`,
  `src/lib/growth/seo/provider-spend.ts`, `register-provider-spend.ts`.
- Chokepoint de entitlement/budget: `src/lib/growth/seo/entitlement.ts` (`enforceSeoRunEntitlement`).
- Lane ecosystem + MCP tools del módulo SEO (TASK-1645, LIVE prod 2026-08-06).
- Investigación completa de la API con costos verificados as-of 2026-08-06:
  `.claude/skills/dataforseo-operator/references/08-ai-optimization.md` (26 URLs oficiales).
- Endpoints AI Optimization son POST-body → compatibles con el transporte canónico POST-only
  (verificado en el dossier; re-confirmar en Discovery contra sandbox).

### Gap

- Familia `ai_optimization` no existe en el registry ni en el CHECK del spend ledger.
- No hay tablas de snapshots de menciones LLM per-org, ni captura, ni readers, ni MCP tools.
- No hay flag ni fila en el ledger para la captura.
- La frecuencia de refresh de la base LLM Mentions NO está publicada por el proveedor — la cadencia
  de captura debe validarse empíricamente en staging antes de prometer cadencia a clientes.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/**` (primitives) + `services/ops-worker` (runtime de captura) +
  `migrations/` (DDL)
- Future candidate home: `domain-package`
- Boundary: captura = command batch gobernado (nombre final se fija en el plan); reads = readers canónicos + MCP tools; consumers autorizados: ops-worker (cron), lane ecosystem y futura UI; nadie llama al proveedor fuera del transporte canónico.
- Server/browser split: captura y readers son server-only (`import 'server-only'`); el browser consumirá únicamente VMs de la futura task UI.
- Build impact: none (sin SDK nuevo; reutiliza fetch del cliente canónico)
- Extraction blocker: transacciones PG del spend ledger + secreto DataForSEO compartido con AEO
  (mismo blocker ya declarado por TASK-1300/1303; no empeora)

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration` (+ `migration`, `cron`, `reader` secundarios)
- Source of truth afectado: allowlist `DATAFORSEO_FAMILIES`; CHECK de
  `greenhouse_growth.seo_provider_spend_daily`; tablas nuevas de snapshots LLM SoV (append-only)
- Consumidores afectados: ops-worker (captura), MCP/ecosystem lane (reads), futura UI, Nexa (por
  parity)
- Runtime target: `worker` (captura) + `staging→production` (rollout)

### Contract surface

- Contrato existente a respetar: `postDataForSeoTask` (`src/lib/ai/dataforseo.ts`),
  `enforceSeoRunEntitlement`, `SEO_PROVIDER_SPEND_UPSERT_SQL`, patrón MCP tools TASK-1645.
- Contrato nuevo: familia `ai_optimization`; command de captura batch; readers `readLlmSovSummary` /
  `readLlmSovTimeseries` / `readLlmSovTopSources` `[verificar nombres en Discovery]` + sus MCP tools.
- Backward compatibility: `compatible` (familia y tablas aditivas; cero cambio a familias/consumers
  existentes).
- Full API parity: reads como readers canónicos consumidos por MCP/UI/Nexa; la captura es command
  batch de sistema (cron), no acción de usuario.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_provider_spend_daily` (CHECK) + tablas
  nuevas `greenhouse_growth.llm_sov_*` `[verificar naming exacto — ver Open Questions]`.
- Invariantes que no se pueden romper:
  - Append-only por `organization_id × surface × capture_date` (idempotente por fecha; re-run del
    mismo día = upsert, nunca duplicado).
  - Semántica ◑ (estimado del proveedor) en el contrato; NUNCA presentar como verdad de primera
    parte ni promediar con el SoV del grader (boundary §1.1).
  - Paridad TS↔CHECK de familias (test existente la fuerza).
  - Cobertura declarada por superficie: `chatgpt` (US/English) y `google_ai_overview`; ninguna otra
    superficie se inventa.
- Tenant/space boundary: todo keyed por `organization_id`; captura solo para orgs con entitlement
  `seo_v1` activo (`module_assignments`).
- Idempotency/concurrency: batch por org con `capture_date` como clave de idempotencia; breaker por
  familia ya aísla fallos; el cron no solapa (mismo patrón de lock/ventana que TASK-1303
  `[verificar]`).
- Audit/outbox/history: snapshots append-only SON la historia; spend va al ledger canónico; señal de
  reliability nueva (ver abajo).

### Migration, backfill and rollout

- Migration posture: `additive` (CHECK ampliado + tablas nuevas con GRANTs; marker `-- Up Migration`
  + bloque DO anti pre-up-marker).
- Default state: `flag OFF` (`GROWTH_SEO_LLM_SOV_CAPTURE_ENABLED`, default false, registrado en el
  ledger en el mismo PR; multi-runtime: se lee en ops-worker → declararlo en `deploy.sh`).
- Backfill plan: N/A (la base del proveedor arranca 2025-08-01 pero la captura nuestra arranca en
  cero; sin backfill histórico en V1 — el histórico del proveedor se consulta on-demand vía reader si
  se decide, ver Open Questions).
- Rollback path: flag OFF (captura muere; tablas quedan, aditivas); revert PR para el resto.
- External coordination: ninguna nueva (secreto DataForSEO ya existe en ops-worker vía TASK-1341/
  deploy.sh; verificar revisión activa).

### Security and access

- Auth/access gate: captura = cron interno del worker (HMAC/scheduler auth existente); reads = lane
  ecosystem con su auth + capability `growth.seo.read` `[verificar capability exacta en el catálogo]`.
- Sensitive data posture: sin PII; nombres de marca/dominios públicos + métricas de mercado.
- Error contract: `canonicalErrorResponse` en surfaces API; `captureWithDomain(err,'growth')` en
  captura; degradación honesta `no_llm_sov_data`.
- Abuse/rate-limit posture: presupuesto por org vía `enforceSeoRunEntitlement` (pasar
  `estimatedCostUsd` = requests × $0.1 + filas estimadas × $0.001); breaker de familia; límites de
  batch acotados (máx N orgs por corrida `[definir en plan]`).

### Runtime evidence

- Local checks: tests de familia/paridad + tests del command/readers (Vitest).
- DB/runtime checks: migración verificada con SELECT a `information_schema` + bloque DO; sandbox del
  proveedor para validar shape de parsing SIN gastar (estructura idéntica, data dummy).
- Integration checks: primera corrida real acotada en staging (1 org allowlist, presupuesto trial)
  con costo real observado vs estimado.
- Reliability signals/logs: señal nueva `seo.llm_sov.capture_stale` (steady = snapshots frescos por
  org con entitlement) `[nombre final en plan]`; spend visible en `seo_provider_spend_daily` familia
  `ai_optimization`.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] Lógica en primitives `src/lib/growth/seo/llm-sov/**`, no en consumer alguno.
- [ ] Reads como readers canónicos + MCP tools en el MISMO PR (mandato TASK-1645).
- [ ] Si se gatea con capability nueva: registry + grant a ≥1 rol real + coverage test en el mismo PR
  (TASK-873/935); si reutiliza `growth.seo.*` existente, declararlo.
- [ ] Camino programático declarado: lane ecosystem (MCP) desde el día uno; UI es follow-up.
- [ ] La captura es command batch idempotente apto para reintento; sin lógica duplicada por consumer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Familia `ai_optimization` en el allowlist (gobernada)

- Agregar `ai_optimization` a `DATAFORSEO_FAMILIES` (`prefix: '/v3/ai_optimization/'`,
  `requiresOrganization: true`, purpose con cobertura real declarada).
- Migración que amplía el CHECK de `seo_provider_spend_daily` + verificación DO post-DDL.
- Tests de familia + paridad TS↔CHECK verdes; delta en arch doc §6 (costos as-of 2026-08-06).

### Slice 2 — Schema de snapshots LLM SoV (append-only)

- Migración de tablas nuevas bajo `greenhouse_growth` (naming final según Open Question #1):
  snapshot diario por `organization_id × surface × capture_date` con métricas de menciones (brand
  mentions, total answers, share) + tabla hija o JSONB para top domains/pages/brands `[decidir en
  plan]`; GRANTs runtime; tipos regenerados (`pnpm db:generate-types`).
- Contracts TS en `src/lib/growth/seo/llm-sov/contracts.ts` con semántica ◑ documentada.

### Slice 3 — Captura batch gobernada (ops-worker + Cloud Scheduler)

- Command `captureLlmSovForOrganizations` `[nombre final en plan]`: resuelve orgs con entitlement →
  `enforceSeoRunEntitlement` con `estimatedCostUsd` del batch → llama LLM Mentions vía
  `postDataForSeoTask` (familia `ai_optimization`) → upsert snapshots idempotente.
- Endpoint en `services/ops-worker/server.ts` + flag `GROWTH_SEO_LLM_SOV_CAPTURE_ENABLED` (default
  OFF, declarado en `deploy.sh` + ledger) + Cloud Scheduler job (cadencia inicial semanal hasta
  validar refresh de la base; ver Open Question #2).
- Validación de parsing contra sandbox ANTES de la primera llamada pagada.

### Slice 4 — Readers per-org + MCP tools (mismo PR)

- Readers: resumen SoV actual, timeseries new/lost, top domains/pages/brands — degradación honesta
  `no_llm_sov_data`.
- MCP tools correspondientes en la lane ecosystem (patrón TASK-1645), registradas en el mismo PR.

### Slice 5 — Señal de reliability + cierre documental

- Señal `seo.llm_sov.capture_stale` `[nombre final]` en el reliability control plane.
- Delta en skill `dataforseo-operator` (references/08 + sección allowlist: candidata #1 → integrada).
- Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md`; triple documentación proporcional (delta arch +
  doc funcional growth + manual si aplica).

## Out of Scope

- **UI visible** (panel SoV en LLMs): task `ui-ux` consumer separada, a crear al cerrar esta
  foundation (split canónico backend-data → ui-ux).
- **LLM Responses / LLM Scraper / AI Keyword Data como capacidades**: la familia queda habilitada
  para toda la sección, pero esta task solo construye la capacidad Mentions. Consolidar los 4
  providers LLM del grader sobre LLM Responses es decisión de arquitectura de EPIC-020 (follow-up,
  requiere `arch-architect`).
- **Tocar `competitiveSov`/`competitiveSovByEngine` del grader** (TASK-1424): lente distinta, cero
  overlap de archivos.
- **Backfill histórico** de la base del proveedor.
- **Superficies no cubiertas por el proveedor** (Claude/Perplexity/Gemini en Mentions): no se
  inventan; esa cobertura sigue siendo del grader.

## Detailed Spec

El detalle operativo de la API (endpoints exactos, params, costos, gotchas, variantes Lite) vive en
`.claude/skills/dataforseo-operator/references/08-ai-optimization.md` — NO se duplica acá. Puntos de
diseño que el plan debe respetar:

- **Costo Mentions**: $0.1/request + $0.001/fila. Estimación de batch: `orgs × requests_por_org ×
  ($0.1 + filas_esperadas × $0.001)`; pasar al gate como `estimatedCostUsd`.
- **Cobertura**: solo `chatgpt` (US/English) + `google_ai_overview`. Para marcas es-CL la señal
  fuerte es el lado google; documentarlo en el contrato y en el reader (campo `surface`).
- **Variantes Lite**: evaluar en el plan si bastan para el snapshot diario (más baratas); full para
  el drill de top sources.
- **`fan_out_queries` + `brand_entities`**: persistirlos (vienen gratis) — insumo entity work AEO.
- **Transporte**: endpoints POST-body (compatibles con el cliente POST-only); si Discovery encuentra
  un endpoint GET-por-path necesario, STOP y resolver primero el límite del transporte (no hackear).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (familia + CHECK) → Slice 2 (schema) → Slice 3 (captura) → Slice 4 (readers/MCP) →
  Slice 5 (señal + docs).
- Slice 1 y 2 pueden ir en la MISMA migración pero el CHECK debe migrar ANTES o JUNTO a cualquier
  código que registre gasto de la familia (sino: gasto real + INSERT fallido + gate leyendo cero —
  bug class documentado en el parity test).
- Slice 3 NO se prende (flag OFF) hasta que Slice 4 tenga readers con qué verificar el dato.
- Prohibido ejecutar la primera llamada pagada antes de validar parsing contra sandbox.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Sobregiro de presupuesto por org (gate se consulta una vez, gasto se acumula después) | finance/spend ledger | medium | `estimatedCostUsd` del batch completo + batch acotado por corrida + re-consulta del gate cada K orgs | `seo.provider.cost_over_budget` |
| Familia en TS sin CHECK migrado → gasto real + INSERT fallido silencioso | migration/outbox | low | parity test rompe build; migración en el mismo PR; bloque DO | test CI + `seo.llm_sov.capture_stale` |
| Cadencia de captura desalineada con refresh de la base (frecuencia NO publicada) | cron | high | arrancar semanal en staging; medir delta entre corridas antes de prometer cadencia; ajustar scheduler | comparación de snapshots consecutivos (plan) |
| Breaker de `ai_optimization` abierto apaga captura completa | cron | low | diseño ya aislado por familia (no afecta serp/labs); reintento en corrida siguiente | `seo.llm_sov.capture_stale` |
| Costo real > estimado (variantes full vs Lite, filas mayores a lo esperado) | finance | medium | primera corrida staging con 1 org allowlist; comparar `cost` real del batch vs estimación; ajustar fórmula | spend diario familia `ai_optimization` en ledger |
| Confusión de lentes SoV (proveedor ◑ vs grader) en consumers futuros | UI/reporting | medium | semántica ◑ en el contrato + naming `llm_sov_*` explícito + Out of Scope declarado | review humana en la task UI |

### Feature flags / cutover

- `GROWTH_SEO_LLM_SOV_CAPTURE_ENABLED` (env, default `false`) — se lee SOLO en ops-worker →
  declararlo en `services/ops-worker/deploy.sh` (SoT; `--set-env-vars` destructivo) Y aplicarlo live
  con `--update-env-vars`; fila en `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR. Flip: staging
  primero, prod tras evidencia. Revert: flag OFF (<5 min).
- El módulo sigue gateado por entitlement per-org `seo_v1` (sin entitlement no hay captura aunque el
  flag esté ON).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (familia+CHECK) | revert PR; CHECK ampliado es aditivo (no rompe filas existentes) | <10 min | sí |
| Slice 2 (schema) | tablas aditivas quedan vacías; revert PR del código; DROP solo vía down migration si se decide | <10 min | sí |
| Slice 3 (captura) | flag OFF + pause del Cloud Scheduler job | <5 min | sí |
| Slice 4 (readers/MCP) | revert PR (reads aditivos) | <10 min | sí |
| Slice 5 (señal/docs) | revert PR | <10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` staging + verify CHECK y tablas (SELECT `information_schema` + DO block).
2. Validar parsing contra sandbox (cero gasto) — shape de Mentions/variantes Lite.
3. Deploy worker staging con flag OFF → verify cero llamadas.
4. Flip flag ON staging con allowlist de 1 org (Efeonce misma, EO-ORG-0007 dogfooding) → corrida →
   verify snapshot + spend ledger familia `ai_optimization` + costo real vs estimado.
5. Segunda corrida (cadencia) → verify idempotencia por `capture_date` + delta de la base.
6. Readers + MCP tools contra staging → verify contrato y degradación honesta.
7. Prod: migración → deploy (flag OFF) → flip con allowlist acotada → monitor señal + spend 7 días.

### Out-of-band coordination required

- Verificar que la revisión ACTIVA de ops-worker tiene `DATAFORSEO_API_LOGIN` + secret ref (drift
  conocido TASK-1341). Sin eso, la captura degrada `missing_secret`.
- Rotación pendiente del password DataForSEO (pre-producción, TASK-1265/1341) — no bloquea staging;
  bloquea declarar GA.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `DATAFORSEO_FAMILIES` incluye `ai_optimization` con `requiresOrganization: true` y el parity
      test TS↔CHECK pasa contra la migración aplicada.
- [ ] Un intento de endpoint fuera del prefijo `/v3/ai_optimization/` con esa familia lanza
      (`normalizeEndpoint`), verificado por test.
- [ ] La captura con flag OFF no ejecuta ninguna llamada al proveedor (verificado en staging logs).
- [ ] Una corrida real en staging (1 org) materializa snapshot append-only, registra gasto en
      `seo_provider_spend_daily` con familia `ai_optimization`, y una segunda corrida el mismo día
      NO duplica filas (idempotencia por `capture_date`).
- [ ] Org sin entitlement `seo_v1` queda excluida de la captura (verificado con org de control).
- [ ] `enforceSeoRunEntitlement` recibe `estimatedCostUsd` > 0 del batch (test del command).
- [ ] Readers devuelven `no_llm_sov_data` honesto para org sin snapshots (sin ceros fantasma).
- [ ] MCP tools de los readers registradas y respondiendo en la lane ecosystem (staging).
- [ ] El contrato/typedoc declara semántica ◑ y cobertura (`chatgpt` US/EN + `google_ai_overview`).
- [ ] Flag registrado en `FEATURE_FLAG_STATE_LEDGER.md` con runtime `ops-worker` declarado.
- [ ] Cero imports/JOIN entre `llm_sov_*` y tablas `grader_*` (grep + review).
- [ ] Delta aplicado en arch doc §6 y en la skill `dataforseo-operator` (candidata #1 → integrada).

## Verification

- `pnpm local:check` (lint + tsc)
- `pnpm test` (full — incluye parity test y suites de growth/seo)
- `pnpm migrate:up` + verificación DO/SELECT contra `information_schema`
- Sandbox smoke (parsing sin gasto) + corrida staging acotada con evidencia de spend real
- `pnpm flags:audit --strict --no-vercel` (flag en ledger)
- `pnpm docs:closure-check` al cierre

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] delta en la skill `dataforseo-operator` aplicado (allowlist actualizado)
- [ ] runtime rollout completo verificado (flag multi-runtime, scheduler, revisión activa del worker)
      o el cierre declara `code complete, rollout pendiente`

## Follow-ups

- Task `ui-ux` consumer: panel SoV en LLMs per-org (cockpit del módulo SEO o vista propia) — crear
  al cerrar esta foundation con wireframe real.
- Evaluación de arquitectura (EPIC-020 + `arch-architect`): consolidar los providers LLM del grader
  sobre LLM Responses (73 modelos unificados, `annotations[]`, `money_spent`) vs mantener las
  integraciones propias.
- Evaluar familia/capacidad `content_analysis` (candidata #2: menciones web + sentiment) con el
  mismo proceso gobernado.
- Prospección digital PR sobre top cited domains (posible capability comercial para
  `research-benchmark-operator`).

## Open Questions

1. **Naming del lane de datos**: propuesta `greenhouse_growth.llm_sov_*` (ni `seo_*` ni `grader_*`,
   para que el boundary §1.1 quede tipográficamente obvio). Alternativa: `seo_llm_mentions_*` bajo el
   paraguas SEO. Decidir con `arch-architect` en el plan ANTES del DDL.
2. **Cadencia de captura**: la frecuencia de refresh de la base Mentions no está publicada. Arrancar
   semanal y medir deltas entre corridas en staging; decidir cadencia final con evidencia empírica.
3. **Histórico del proveedor**: ¿exponer on-demand el histórico (desde 2025-08-01) vía reader live
   acotado, o solo acumular snapshots propios? Default V1: solo snapshots propios.
4. **Capability**: ¿reutilizar `growth.seo.*` existente para los reads o acuñar
   `growth.seo.llm_sov.read`? Decidir en plan contra el catálogo real (si se acuña: grant + coverage
   test en el mismo PR).
