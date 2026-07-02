# TASK-1305 — Growth SEO: SEO↔AEO Gap Derived Read (report layer 360)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|data`
- Blocked by: `TASK-1303`
- Branch: `task/TASK-1305-growth-seo-aeo-gap-derived-read`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Expone `readSeoAeoGap(targetId)`: el **derived read cross-módulo** que cruza la serie de rank orgánico (`seo_rank_snapshots`, motor SEO) contra el veredicto de citabilidad IA (`grader_scores`, motor AEO) **por `organization_id`**, para responder la pregunta que ninguno de los dos motores contesta solo: *"¿rankeas pero no te citan? ¿te citan pero no rankeas?"*. Produce la **matriz quadrant 360** (rankeo × citabilidad: dominante / riesgo / oportunidad rara / invisible) que alimenta la UI cliente del report (TASK-1310). Es el punto de encuentro de los dos internets de búsqueda — y por eso es la task donde el **boundary duro SEO↔AEO** (§1.1 del doc maestro) es la regla load-bearing: el cruce es SOLO por `organization_id`, NUNCA un merge de tablas, NUNCA una FK cross-motor, NUNCA un promedio de las dos métricas. Con degradación honesta si una de las dos fuentes falta.

## Why This Task Exists

El AEO Grader dice si la IA te cita; el SEO Module dice si rankeas. Cada uno es una verdad de su propio provider. El **valor comercial del "Search Visibility 360"** (el diferenciador de categoría vs Semrush) no está en ninguno de los dos por separado, sino en el **cruce**: una keyword donde rankeas #1 pero 0 IA te cita es autoridad orgánica sin citabilidad (oportunidad de contenido answer-capsule); una donde te citan en AI Overview pero no rankeas es reconocimiento de entidad sin click clásico (oportunidad bottom-funnel). Ese cruce es intrínsecamente peligroso de modelar mal: la tentación es unir las tablas o promediar los scores, y ambas cosas **corrompen las dos verdades** (distintos providers, distinta cadencia, distinta unidad). Esta task fija el cruce como **derived read gobernado por el boundary**, para que la UI 360 (TASK-1310) consuma un contrato honesto en vez de re-inventar el join y romper el aislamiento entre motores.

## Goal

- `readSeoAeoGap(targetId)` en `src/lib/growth/seo/**`: derived read que cruza `seo_rank_snapshots` × `grader_scores` **por `organization_id`** (nunca FK/merge).
- Matriz quadrant 360 por keyword/dominio: `{ quadrant: 'dominante'|'riesgo'|'oportunidad'|'invisible', rankPosition, aeoCited/aeoScore, ... }`.
- Degradación honesta: org sin grader run reportable o sin rank snapshots → estado explícito (`{ ok: false, errorCode: 'no_aeo_data'|'no_seo_data', status }`), NUNCA ceros fantasma ni promedios.
- Gate de acceso: `growth.seo.observation.read` (SEO) + reuso del gate existente de lectura de `grader_scores` (AEO), sin duplicar lógica de autorización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§1.1 (boundary duro NUNCA/SIEMPRE — la regla load-bearing)**, §2 (complementariedad SEO↔AEO + matriz mental 360 + las 4 señales que se cruzan), §7 (`readSeoAeoGap` = derived read cross-módulo, result shape `{ ok }`).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — modelo del AEO: `grader_profiles → grader_runs (reportable) → grader_scores` (`overall_score`, `dimensions` JSONB) anclado a `organization_id`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — reader como primitive canónico consumible por UI + Nexa + MCP.
- `CLAUDE.md §"SQL Signal Reader Schema Validation Gate"` — validar el SQL del cruce contra PG real; `capture_date`=DATE, `*_at`=TIMESTAMPTZ.

Reglas obligatorias (§1.1 — **boundary duro, load-bearing**):

- **NUNCA computar citabilidad AEO desde rank SEO ni viceversa.** Son verdades independientes de providers distintos.
- **NUNCA mergear tablas `grader_*` con `seo_*`.** Cero FK cross-motor. El cruce es una **operación en memoria** sobre dos reads separados, unidos por `organization_id`.
- **NUNCA promediar las dos métricas** en un número único. La matriz quadrant las mantiene como **dos ejes ortogonales** (rankeo en un eje, citabilidad en el otro); jamás las colapsa.
- **NUNCA reconciliar** "rankeas #1 y 0 IA te cita" como un bug. Es una **señal** del producto, se reporta como tal.
- **SIEMPRE** exponer el cruce como **derived read (report layer)**, no como tabla compartida ni materialización.
- **SIEMPRE** degradar honesto si falta una fuente (org sin grader run → `no_aeo_data`; org sin rank snapshots → `no_seo_data`), NUNCA rellenar con `0`.

## Normative Docs

- `src/lib/growth/ai-visibility/store.ts` (`listOperatorCrossOrgAeoScores`, ~L427) — patrón canónico del join AEO `module_assignments → organizations → grader_profiles → último grader_run reportable → grader_scores`, con degradación honesta (`latestScore = null`, NUNCA `0`). Esta task **reusa** ese patrón de lectura de `grader_scores`, no lo re-implementa.
- `src/lib/growth/ai-visibility/scoring/store.ts` (`getGraderScore`, ~L195) — lectura del score por run + shape de `grader_scores` (`overall_score`, `dimensions` JSONB, `confidence`).
- `src/lib/growth/search-console/contracts.ts` — patrón result shape `{ ok: true, ... } | { ok: false, errorCode }` a espejar.
- `src/lib/growth/seo/**` (post TASK-1303) — `readRankEvolution`/`readRankSnapshotLatest` sobre `seo_rank_snapshots`; el lado SEO del cruce reusa esa lectura, no queryea `seo_rank_snapshots` crudo en paralelo si ya hay reader.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §2 (matriz mental 360 + 4 señales) — la semántica de los quadrants.

## Dependencies & Impact

### Depends on

- `TASK-1303` — rank capture command + `readRankEvolution`/`readRankSnapshotLatest` sobre `seo_rank_snapshots` (SoT del lado SEO del cruce). Bloqueador duro (sin rank snapshots no hay eje SEO).
- `TASK-1301` — capability `growth.seo.observation.read` + entitlement per-org (gate del lado SEO). Implícito (lo consume el reader) [verificar seed].
- `grader_scores` + el join AEO existente (`grader_profiles`/`grader_runs`) — ya en producción (motor AEO), reusado por `organization_id`.

### Blocks / Impacts

- Bloquea `TASK-1310` (Cliente + Report Artifact + **quadrant 360**) — consume `readSeoAeoGap`.
- Es el contrato que hace real el pitch comercial "Search Visibility 360" (§11 del doc maestro): el gráfico quadrant 2×2 SEO vs AEO.

### Files owned

- `src/lib/growth/seo/gap/read-seo-aeo-gap.ts` [nuevo — `readSeoAeoGap`]
- `src/lib/growth/seo/contracts.ts` [extendido — `SeoAeoGapResult`, tipo del quadrant]
- `src/lib/growth/seo/gap/__tests__/read-seo-aeo-gap.test.ts` [nuevo]

## Current Repo State

### Already exists

- Motor AEO completo: `grader_scores` (`overall_score`, `dimensions` JSONB, `confidence`, `coverage`), join `module_assignments → organizations → grader_profiles → grader_runs → grader_scores` con degradación honesta ya probado (`listOperatorCrossOrgAeoScores` en `src/lib/growth/ai-visibility/store.ts`).
- Patrón de result shape `{ ok }` (Search Console reader) y de reader gobernado por capability + org.
- Lado SEO (post TASK-1303): `seo_rank_snapshots` + `readRankEvolution`/`readRankSnapshotLatest`.

### Gap

- No existe ningún cruce SEO↔AEO. Hoy los dos motores son islas: nadie responde "rankeas pero no te citan" ni produce la matriz quadrant 360. La UI cliente del report (TASK-1310) no tiene contrato del cual leer el quadrant.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (derived read cross-módulo, read-only, sin persistencia nueva)
- Source of truth afectado: NINGUNO nuevo. Lee `seo_rank_snapshots` (SoT SEO) + `grader_scores` (SoT AEO), cada uno por su propio path; el cruce es efímero (en memoria), NO se materializa.
- Consumidores afectados: UI cliente Report Artifact + quadrant 360 (TASK-1310), Nexa/MCP.
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: boundary SEO↔AEO (§1.1), patrón de lectura de `grader_scores` (`store.ts`), reader SEO (`readRankEvolution`, TASK-1303), result shape `{ ok }`, gate `growth.seo.observation.read` + gate existente de `grader_scores`.
- Contrato nuevo o modificado: `readSeoAeoGap(targetId)` → `{ ok: true, quadrants, seoLens, aeoLens } | { ok: false, errorCode: 'no_aeo_data'|'no_seo_data'|'disabled'|'forbidden'|'query_failed', status }`. Sin nuevo endpoint/tabla obligatorio en esta task (el reader lo consume TASK-1310).
- Backward compatibility: `compatible` (reader additive, read-only, cero cambio en schema/consumers existentes; gated por `GROWTH_SEO_ENABLED`).
- Full API parity: reader canónico en `src/lib/growth/seo/**`, un primitive, muchos consumers (UI + Nexa + MCP). Ver `## Capability Definition of Done` (touch-it de capability existente).

### Data model and invariants

- Entidades/tablas/views afectadas (SOLO lectura, sin escritura): `greenhouse_growth.seo_rank_snapshots` (vía reader SEO), `greenhouse_growth.grader_scores` + `grader_runs` + `grader_profiles` (vía patrón AEO), `greenhouse_core.organizations` (ancla del cruce).
- Invariantes que no se pueden romper (**boundary, load-bearing**):
  - El cruce se resuelve por `organization_id` — el `targetId` resuelve su `organization_id`, y con ESE org se lee el lado AEO. Cero JOIN SQL entre `seo_*` y `grader_*`; son **dos reads separados unidos en memoria**.
  - Cero FK cross-motor, cero VIEW/tabla que mergee `seo_*` con `grader_*`.
  - Cero promedio/número único: los dos ejes (rankeo, citabilidad) se mantienen ortogonales en el quadrant.
  - Derived read efímero: NO se materializa el resultado (no hay `seo_aeo_gap_snapshots`); es report layer, se computa on-read.
  - Degradación honesta: falta AEO → `no_aeo_data`; falta SEO → `no_seo_data`; NUNCA `0` ni quadrant fabricado.
  - Cero escritura, cero payroll/finance.
- Tenant/space boundary: `targetId → seo_targets.organization_id` server-side; el lado AEO se lee con ESE `organization_id` (no con otro). Ambos gates de acceso (SEO + AEO) se validan; un caller con acceso SEO pero sin acceso a los scores AEO de esa org degrada honesto, no expone datos AEO ajenos.
- Idempotency/concurrency: N/A (read-only puro, sin write, sin lock).
- Audit/outbox/history: N/A (read-only; sin outbox). La observabilidad es logging + `captureWithDomain` en el catch.

### Migration, backfill and rollout

- Migration posture: `none` (reader puro; sin schema, sin migración, sin backfill).
- Default state: `flag OFF` (`GROWTH_SEO_ENABLED`); el reader existe pero ningún consumer lo llama hasta TASK-1310.
- Backfill plan: N/A.
- Rollback path: revert PR (read-only, sin efecto persistente).
- External coordination: ninguna (sin provider, sin secret, sin cron, sin cutover).

### Security and access

- Auth/access gate: `growth.seo.observation.read` (lado SEO) + el gate existente de lectura de `grader_scores` (lado AEO) — reusar, NO duplicar autorización. Ambos por-org (`module_assignments`), no por rol.
- Sensitive data posture: sin PII, sin secretos, sin finance. Métricas SEO + scores AEO de la propia org.
- Error contract: `{ ok: false, errorCode, status }` canónico (es-CL en la UI); errores capturados con `captureWithDomain(err, 'growth'|'ai', ...)`, NUNCA raw error al cliente ni `Sentry.captureException` directo.
- Abuse/rate-limit posture: N/A adicional (read-only sobre snapshots ya materializados; sin call a provider externo — no gasta cuota DataForSEO ni LLM).

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes; unit tests del cruce (quadrant correcto por combinación rank×cita), de la degradación honesta (falta AEO → `no_aeo_data`; falta SEO → `no_seo_data`), y de que el resultado NUNCA promedia ni fabrica `0`.
- DB/runtime checks: si el reader lleva SQL propio (más allá de reusar readers), validarlo contra PG real (gate TASK-893, cuidado DATE vs TIMESTAMPTZ). Ejercer `readSeoAeoGap` en staging contra una org con ambos lados y contra una org con solo uno.
- Integration checks: N/A (sin provider externo).
- Reliability signals/logs: sin signal nueva (read-only); log del path de degradación.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task **toca capabilities existentes** (`growth.seo.observation.read` del lado SEO + el gate de lectura de `grader_scores` del lado AEO). Aplica el gate con regla *touch-it/fix-it*:

- [ ] **Lógica en el primitive, no en la UI.** El cruce y la clasificación quadrant viven en `readSeoAeoGap` (`src/lib/growth/seo/**`), NUNCA en el componente del quadrant 360 (TASK-1310). La UI solo pinta el resultado.
- [ ] **Modelada como reader canónico**, no como fetch acoplado a la pantalla del report.
- [ ] **Read** expuesto como reader canónico con shape + latencia estables (`{ ok }`); sin write (esta task no muta nada), así que el sub-check de command semantics es N/A por diseño.
- [ ] **Capability + grant:** reusa `growth.seo.observation.read` (grant lo seedea TASK-1301) + el gate existente de `grader_scores`; verificar que ambos gates aplican y que el coverage test de `growth.seo.observation.read` sigue verde. NO introduce capability nueva.
- [ ] **Camino programático declarado:** reader consumible por UI (TASK-1310) + Nexa + MCP; el quadrant 360 es un consumer, no el SoT del cruce.
- [ ] **`propose → confirm → execute`:** N/A (read-only; sin write gobernado).
- [ ] **Un primitive, muchos consumers:** UI, Nexa, MCP leen el mismo `readSeoAeoGap`; cero re-implementación del join en la UI.
- [ ] **Parity check = SÍ:** el cruce SEO↔AEO tiene contrato gobernado (reader por-org, ambos gates) → todos los consumers lo operan por construcción, sin romper el boundary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract + boundary-safe cross read

- `SeoAeoGapResult` + tipo quadrant en `src/lib/growth/seo/contracts.ts`: `{ ok: true, quadrants: [{ keyword|domain, rankPosition, aeoScore, aeoCited, quadrant }], seoLens, aeoLens } | { ok: false, errorCode, status }`.
- `readSeoAeoGap(targetId)` en `src/lib/growth/seo/gap/read-seo-aeo-gap.ts`:
  1. Resolver `targetId → seo_targets.organization_id` server-side + validar `growth.seo.observation.read`.
  2. **Lado SEO:** leer rank standings por keyword/dominio vía el reader SEO (`readRankSnapshotLatest`/`readRankEvolution`, TASK-1303). Si vacío → `{ ok: false, errorCode: 'no_seo_data' }`.
  3. **Lado AEO:** con ESE `organization_id`, leer el último `grader_scores` reportable reusando el patrón de `store.ts` (`grader_profiles → grader_runs reportable → grader_scores`) + su gate. Si no hay run reportable → `{ ok: false, errorCode: 'no_aeo_data' }`.
  4. **Cruce en memoria por `organization_id`** — dos reads separados, cero JOIN SQL entre `seo_*` y `grader_*`.
- Tests: boundary (cero SQL que una las tablas), degradación honesta por lado faltante, gate aplicado.

### Slice 2 — Quadrant classification (matriz 360)

- Clasificador puro: `(rankPosition, aeoScore|aeoCited) → quadrant`:
  - rankeo alto + citación IA alta → `dominante`.
  - rankeo alto + citación IA baja → `riesgo` (autoridad orgánica sin citabilidad → CTA cruzado al AEO).
  - rankeo bajo + citación IA alta → `oportunidad` (entidad reconocida sin click clásico → bottom-funnel).
  - rankeo bajo + citación IA baja → `invisible`.
- Umbrales de "alto/bajo" declarados como constantes documentadas (rank top-N; score AEO ≥ umbral), NUNCA promediando los dos ejes.
- Tests: cada uno de los 4 quadrants desde combinaciones controladas; verificación de que dos métricas ortogonales nunca colapsan a un número.

## Out of Scope

- UI del quadrant 360 / Report Artifact cliente (TASK-1310).
- Materializar el gap (NO se crea `seo_aeo_gap_snapshots`; es derived read efímero por diseño).
- Cualquier escritura, cron o provider externo.
- `readKeywordOpportunities` (join SEO↔GSC, TASK-1302) — es otro cruce, distinto motor.
- Rank capture / grader run — dependencias, no scope.
- Cambios en el motor AEO o su gate (se reusa tal cual).

## Detailed Spec

Ver el contrato en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §1.1 (boundary), §2 (complementariedad + matriz mental 360 + 4 señales) y §7 (`readSeoAeoGap`). Puntos load-bearing:

- **El boundary ES la task.** El error más caro que un agente puede cometer acá es "optimizar" el cruce con un `JOIN` SQL entre `seo_rank_snapshots` y `grader_scores`, o materializar una VIEW `seo_aeo_gap`. Ambos violan §1.1 y acoplan dos motores que deben permanecer aislados (distintos providers, distinta cadencia, breakers separados). El cruce canónico son **dos reads independientes** (uno por motor, cada uno con su gate) **unidos en memoria por `organization_id`**. El `targetId` resuelve su `organization_id`; con ese org se pide el lado AEO. Nada de FK, nada de merge, nada de promedio.
- **Dos verdades, dos ejes.** El quadrant es una matriz 2×2: eje X = rankeo (SEO, posición), eje Y = citabilidad (AEO, score/citación). NUNCA se colapsan a un score combinado. "Rankeas #1 y 0 IA te cita" es una celda de la matriz (`riesgo`), no un dato a reconciliar.
- **Degradación honesta.** Una org puede tener SEO sin AEO (nunca corrió el grader) o AEO sin SEO (nunca configuró rank tracking). El reader devuelve `no_aeo_data` / `no_seo_data` explícito con `ok: false`, y la UI (TASK-1310) muestra un empty state accionable ("Corre un grader run para completar el 360"), NUNCA un quadrant con ceros que mentiría.
- **Reuso, no re-implementación.** El lado AEO reusa el patrón de `listOperatorCrossOrgAeoScores`/`getGraderScore` (join reportable + degradación `null`), y el lado SEO reusa `readRankSnapshotLatest`/`readRankEvolution` (TASK-1303). Esta task es principalmente **composición gobernada**, no SQL nuevo — y si emerge SQL, se valida contra PG real (gate TASK-893).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract + cross read boundary-safe) → Slice 2 (quadrant classification). El clasificador (Slice 2) consume los dos lentes que Slice 1 arma. Ambos slices son read-only y aditivos; el orden es de composición, no de riesgo runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente une `seo_*` × `grader_*` con JOIN/VIEW → viola boundary §1.1 | growth | medium | regla dura documentada + test que verifica cero SQL cross-tabla (cruce en memoria por `organization_id`) + review | code review + test de boundary |
| Promediar rank+cita en un score único → corrompe las dos verdades | growth | medium | quadrant 2×2 ortogonal; test que falla si el output es un número combinado | test + review |
| Ceros fantasma cuando falta una fuente | data | medium | degradación honesta `no_aeo_data`/`no_seo_data` con `ok:false`; NUNCA `0` | test dedicado |
| Exponer scores AEO de una org ajena por mal binding de `organization_id` | growth | low | `targetId → organization_id` server-side + ambos gates por-org; el lado AEO usa ESE org | test de tenant boundary |
| SQL nuevo con `EXTRACT(EPOCH FROM DATE-DATE)` si el reader queryea directo | data | low | preferir reuso de readers; si hay SQL, `capture_date`=DATE/`*_at`=TIMESTAMPTZ validado contra PG real | Sentry + lint rule |

### Feature flags / cutover

- Behind `GROWTH_SEO_ENABLED` (default OFF, ya en el ledger por las tasks previas). Reader read-only sin cutover propio; se habilita cuando el módulo SEO se activa. Ningún consumer lo llama hasta TASK-1310.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (reader read-only, sin efecto persistente) | <5 min | si |
| Slice 2 | revert PR (clasificador puro) | <5 min | si |

### Production verification sequence

1. En staging con `GROWTH_SEO_ENABLED=true`: `readSeoAeoGap(targetId)` sobre una org con **ambos** lados (rank snapshots + grader run reportable) → verificar quadrants correctos + cero SQL cross-tabla (revisar el query plan / código).
2. `readSeoAeoGap` sobre una org con **solo SEO** (sin grader run) → `{ ok: false, errorCode: 'no_aeo_data' }`, NUNCA ceros.
3. `readSeoAeoGap` sobre una org con **solo AEO** (sin rank snapshots) → `{ ok: false, errorCode: 'no_seo_data' }`.
4. Verificar que el binding `targetId → organization_id` es server-side y que un caller sin gate de `grader_scores` no ve datos AEO ajenos (degrada honesto).
5. Verificar los 4 quadrants (`dominante`/`riesgo`/`oportunidad`/`invisible`) desde datos reales.
6. Prod vía release control plane cuando EPIC-022 se secuencie (read-only, additive).

### Out-of-band coordination required

- Ninguna (read-only; sin provider, sin secret, sin cron, sin migración, sin consent). Solo confirmar que `growth.seo.observation.read` (TASK-1301) y el gate de `grader_scores` están vigentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `readSeoAeoGap(targetId)` existe en `src/lib/growth/seo/**`, gateado por `growth.seo.observation.read` + el gate existente de `grader_scores`, con shape `{ ok: true, quadrants, seoLens, aeoLens } | { ok: false, errorCode, status }`.
- [ ] **Boundary duro verificado:** el cruce es por `organization_id` con **dos reads separados unidos en memoria**; CERO JOIN SQL / VIEW / FK entre `seo_*` y `grader_*` (verificado por test + review).
- [ ] **Cero promedio:** los dos ejes (rankeo, citabilidad) se mantienen ortogonales en la matriz quadrant; NUNCA un score combinado único.
- [ ] Matriz quadrant 360 clasifica los 4 estados (`dominante`/`riesgo`/`oportunidad`/`invisible`) desde `(rankPosition, aeoScore|aeoCited)` con umbrales documentados.
- [ ] Degradación honesta: org sin grader run reportable → `no_aeo_data`; org sin rank snapshots → `no_seo_data`; NUNCA `0` ni quadrant fabricado.
- [ ] Reusa el patrón de lectura de `grader_scores` (`store.ts`) y los readers SEO (TASK-1303); no re-implementa el join AEO ni duplica autorización.
- [ ] Tenant boundary: `targetId → organization_id` server-side; sin fuga de scores AEO de orgs ajenas.
- [ ] Read-only puro: sin escritura, sin migración, sin materialización del gap.
- [ ] `GROWTH_SEO_ENABLED` respetado (default OFF).
- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes; si hay SQL propio, validado contra PG real (gate TASK-893).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Ejercer `readSeoAeoGap` en staging contra una org con ambos lados, una con solo SEO y una con solo AEO; verificar boundary (cero cross-tabla SQL), quadrants correctos y degradación honesta.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1310 quadrant 360 consume este reader)
- [ ] documentación técnica del boundary SEO↔AEO + del derived read (arquitectura del dominio SEO §7)

## Follow-ups

- `TASK-1310` — Cliente + Report Artifact + quadrant 360 (consume `readSeoAeoGap`).
- Evaluar exponer `readSeoAeoGap` como recurso `api/platform/app` explícito para Nexa/MCP si el consumo lo justifica.
- Definir si las 4 señales cruzadas (§2) generan recomendaciones accionables (CTA cruzado AEO↔SEO) — posible task de recommendation layer.

## Open Questions

1. ¿Umbrales exactos de "rankeo alto/bajo" (top-3 vs top-10) y "citabilidad alta/baja" (score AEO ≥ X) para los quadrants? Propuesta: rank top-3 = alto; score AEO ≥ mediana de `grader_scores.overall_score` o umbral fijo — resolver con la 4 lentes en Discovery.
2. ¿El eje AEO usa `overall_score` o citación por-keyword? `grader_scores` es por-run (dominio), no por-keyword; el cruce por-keyword puede requerir `dimensions` JSONB o degradar a nivel dominio. Resolver contra el shape real de `grader_scores` en Discovery.
3. ¿El gate del lado AEO es el mismo `growth.ai_visibility.observation.read` o basta el binding per-org de `module_assignments`? Confirmar el gate existente de lectura de `grader_scores` en Discovery.
