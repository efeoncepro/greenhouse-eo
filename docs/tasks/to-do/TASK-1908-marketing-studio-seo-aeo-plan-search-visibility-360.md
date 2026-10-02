# TASK-1908 — Marketing Studio: plan SEO/AEO con Search Visibility 360 (referencias, snapshots, seguimiento y rastreo por persona)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — decisiones del operador

- **Agentes en segundo plano y programados nunca leen datos competitivos `internal`** (decisión de Julio Reyes,
  operador, 2026-09-26; pregunta 8 del ADR de operación híbrida). Sólo el modo interactivo, con la persona presente,
  puede. El filtro de clasificación de esta task se extiende: además de actores no internos, `internal_competitive`
  nunca llega a un token con claim `act` (corrida delegada, TASK-1917/TASK-1915) ni a una identidad de servicio de
  agente (modo programado). No hay interruptor por organización: una excepción futura exige decisión nueva y explícita
  por organización.

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
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-09-26 desde el ADR de capa de estrategia (§4.5); resuelve las preguntas abiertas 2 y 3 del ADR para SEO/AEO`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-1907 (versión del plan y readinessContributors) · TASK-1892 (consumer y bindings de Studio en Greenhouse, ventana fija en la lectura SEO) · TASK-1899 (escritura MCP de Studio y proposalDigest)`
- Branch: `efeonce-marketing-studio main (bloque SEO/AEO, adapter, snapshots, seguimiento) · Greenhouse develop (proposalRef y carril delegado de rastreo, manifiesto, docs) · efeonce-mcp rama + PR (sync de Studio, cliente de canje SEO y ruta delegada de track/untrack); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agrega el bloque **SEO/AEO** al plan de campaña: palabras clave, temas y oportunidades objetivo, preguntas objetivo para
respuestas de IA, URLs objetivo y contenido de soporte, cada uno como **referencia** al sujeto de Search Visibility 360
más un **snapshot fechado** de lo que justificó la decisión (valor, métrica, fecha, lane y metodología). Después del
lanzamiento, Studio lee **en vivo** ranking, visibilidad por URL, desempeño en Search Console y visibilidad en respuestas
de IA y los compara con el snapshot sin presentarlo nunca como dato actual. Rastrear palabras clave es `T2` y **lo
ejecuta Greenhouse**: Studio guarda la propuesta; el command dueño `track_seo_keywords` corre con la autoridad delegada
de una persona por un carril app nuevo, con `proposalRef` que une ambos lados.

## Why This Task Exists

- SV360 (EPIC-022) mide en Greenhouse oportunidades, ranking, visibilidad por URL y citas en IA, pero Studio no sabe qué
  demanda ataca cada campaña ni vuelve a mirar el resultado (ADR de capa de estrategia §1 y §4.5).
- El ADR descarta copiar series (duplica métricas con dueño) y descarta leer sólo en vivo (el plan pierde el porqué);
  exige referencia + snapshot fechado y lectura en vivo para el seguimiento.
- Rastrear palabras clave gasta presupuesto del proveedor en cada ciclo. Hoy el gateway federa `track_seo_keywords` por el
  lane ecosystem con actor **máquina** (`mcp:<consumer>`) y sólo para bindings `internal`; el ADR exige `T2` con la
  persona como actor. Falta el carril con autoridad humana (ADR §11.3).
- Los lanes competitivos (brecha, top del SERP, candidatos, gasto) son sólo `internal`; si Studio guarda algo que vino de
  ahí, ese snapshot hereda la restricción y nunca puede llegar a una superficie que vea un cliente (ADR §4.5, §8).

## Goal

- El plan tiene un bloque SEO/AEO versionado con objetivos referenciados y snapshots fechados, clasificados como
  `org_visible` o `internal_competitive`.
- Studio captura snapshots él mismo desde los lanes org-visibles de SV360 con su consumer; los competitivos sólo entran
  declarados por una persona interna, marcados como no verificados por Studio.
- El seguimiento posterior al lanzamiento compara en vivo contra el snapshot, con `not_comparable` cuando cambió la
  metodología.
- Las propuestas de rastreo viven en Studio (`T1`) y se ejecutan en Greenhouse con persona y confirmación (`T2`).
- Todo operable por API y por agentes vía MCP.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (**gobernante**: §3.2
  opción C, §4.5, §5, §8, §11.2 y §11.3)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (lanes, entitlement `seo_v2`, anti-oráculo, `etvMethodology`,
  bindings `internal` para competitivos, commands de gasto)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3.1, §4.1)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md` §Delta 2026-09-10 (patrón del carril app con
  autoridad humana delegada, TASK-1852)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`

Reglas obligatorias:

- **Nunca SQL** contra Greenhouse; Studio lee SV360 sólo por lanes ecosystem con su consumer org-scoped (TASK-1892) o
  recibe snapshots declarados por una persona.
- **Nunca recalcular** en Studio una métrica que SV360 calcula (posición ponderada, CTR, ETV, visibilidad): se guarda y
  se muestra tal cual la devuelve el lane, con su `dataThrough` y su metodología.
- **Snapshot ≠ dato actual:** todo DTO distingue `planningSnapshot` (con `takenAt`) de `current` (con `dataThrough`).
- **Competitivo sólo interno:** un snapshot `internal_competitive` nunca aparece en un DTO servido a un actor que no sea
  interno, ni a un agente en segundo plano (token con `act`) o programado (identidad de servicio); el filtro vive en el
  reader y tiene test (decisión del operador 2026-09-26).
- **Studio no gasta:** ningún command de Studio llama a un lane o tool que gaste (rastrear, descubrir, declarar
  competidores, diagnóstico); la ejecución es del command dueño en Greenhouse con persona y confirmación.
- **Ausencia ≠ cero:** sin snapshot es «sin dato»; `found=false` de un lane es «sin captura», nunca 0.

## Normative Docs

- `.claude/skills/seo-aeo/SKILL.md` (método de objetivos, intención, fan-out, medición) y `seo-aeo-practice`.
- `.claude/skills/efeonce-campaign-planning/SKILL.md` (bloque SEO/AEO del plan).
- `.claude/skills/efeonce-agent-seo-aeo/SKILL.md` (rol del agente SEO/AEO dentro de una campaña: consumidor directo de las tools de esta task; las tools de gasto son sólo propuesta).
- `.claude/skills/efeonce-mcp-platform/SKILL.md` (tools SEO federadas, clase `efeonce.mcp.seo.write`, regla del cliente
  público, protocolo de federación) + `mcp-craft`.
- `docs/tasks/to-do/TASK-1892-marketing-studio-greenhouse-metrics.md` (consumer, bindings, ventana fija).
- `docs/tasks/to-do/TASK-1861-aeo-grader-mcp-operability.md` (fuente futura más rica para AEO; no bloquea).

## Dependencies & Impact

### Depends on

- `TASK-1907`: `strategy_plan_version`, `plan_content_item`, `readinessContributors`.
- `TASK-1892`: consumer `efeonce-marketing-studio`, bindings por organización y ventana fija en `seo/performance`.
- `TASK-1899`: escritura MCP de Studio (clase, canje, delegación, digest).
- Greenhouse SEO: lanes `/api/platform/ecosystem/growth/seo/{keyword-opportunities,keyword-market-data,rank-evolution,url-visibility,performance,visibility-360,dual-lens-visibility,grounded-queries,keywords}` y command `track_seo_keywords`/`untrack_seo_keywords` (TASK-1308/1659).

### Blocks / Impacts

- `TASK-1909` (IA): el brief SEO/AEO por agente parte de los objetivos y snapshots de esta task.
- `TASK-1912` (UI): pinta el bloque, el seguimiento y el estado de las propuestas.
- Gateway: cambia la ruta de ejecución de `track_seo_keywords`/`untrack_seo_keywords` detrás de flag.

### Files owned

- Repo Studio: `packages/contracts/src/seo-plan.ts` [nuevo], `packages/domain/src/seo-plan/**` [nuevo] (`greenhouse-seo-adapter.ts`, `snapshots.ts`, `follow-up.ts`, `classification.ts`, `readiness.ts`), `packages/domain/src/commands/seo-plan.ts` [nuevo], `packages/database/migrations/<ts>_seo-plan.sql` [nuevo], `packages/database/src/schema.ts`, `apps/web/src/app/api/v1/campaigns/[campaignId]/strategy-plan/drafts/[versionNo]/seo/**`, `apps/web/src/app/api/v1/campaigns/[campaignId]/seo/**`, `packages/contracts/src/operations.ts`, `packages/contracts/generated/tool-manifest.json`
- Greenhouse: `src/lib/growth/seo/keywords/**` (`proposalRef` en track/untrack) [verificar ruta exacta del command], `src/lib/api-platform/resources/app-growth-seo-keywords.ts` [nuevo], `src/app/api/platform/app/growth/seo/keywords/{track,untrack}/route.ts` [nuevo], `src/lib/sister-platforms/mcp-token-exchange.ts` (cliente y contrato), `migrations/<ts>_task-1908-mcp-growth-seo-write-client.sql` [nuevo], `src/mcp/greenhouse/tool-manifest.ts` (descripciones con `proposalRef`), `docs/mcp/skills/seo-spend-discipline/SKILL.md` (sección de ejecución delegada)
- Gateway `efeonce-mcp`: `src/providers/greenhouse-seo*.ts` (ruta delegada detrás de flag), contratos de canje, `deploy.yml` (flag), `package.json`, `surface-baseline.json`

## Current Repo State

### Already exists

- Lanes SEO ecosystem en `src/app/api/platform/ecosystem/growth/seo/*` (24 rutas, incluidas `dual-lens-visibility`,
  `grounded-queries`, `keywords`, `keyword-gap`, `serp-top-results`, `competitor-candidates`, `provider-spend`).
- Tools MCP de Greenhouse `get_seo_*`, `track_seo_keywords`, `untrack_seo_keywords`, `declare_seo_competitors` (esta
  última ya exige `proposalRef` y autoría humana) en `src/mcp/greenhouse/tool-manifest.ts`.
- Clase `efeonce.mcp.seo.write` existente y no cableada al cliente público (regla del gateway).
- `declare_seo_competitors` como precedente de propuesta humana con `proposalRef` verbatim.

### Gap

- Studio no tiene bloque SEO/AEO, ni snapshots, ni seguimiento, ni propuestas.
- `track_seo_keywords` no acepta `proposalRef` [verificar] y no tiene carril con autoridad humana.
- No hay filtro de clasificación competitiva en ningún consumidor de Studio.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` (`packages/domain/src/seo-plan/**`, rutas `/api/v1`) + Greenhouse (`src/lib/growth/seo/**`, lane app nuevo) + `efeonce-mcp` (provider SEO)
- Future candidate home: `remain-shared`
- Boundary: Studio posee referencias, snapshots, propuestas y seguimiento; Greenhouse posee las métricas y el command de gasto; el gateway sólo transporta
- Server/browser split: adapter, snapshots y commands en servidor; token de consumer en env sensible de Vercel de Studio; nada en el navegador
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (toca un command que gasta presupuesto de proveedor y su autoridad)
- Impacto principal: `integration`
- Source of truth afectado: Studio `studio.plan_seo_*` y `studio.seo_snapshot` (nuevos); Greenhouse `track_seo_keywords` (autoridad y `proposalRef`)
- Consumidores afectados: plan de campaña, agentes, UI de TASK-1912, gateway
- Runtime target: Studio staging/production, Greenhouse staging/production, gateway Cloud Run

### Contract surface

- Contrato existente a respetar: lanes SEO con `externalScopeType`/`externalScopeId`, 404 anti-oráculo, `seo_v2`; outcomes por keyword de `track_seo_keywords` (`tracked|already_tracked|intent_changed|capacity_exceeded|invalid`); `intent` sin default
- Contrato nuevo o modificado: operaciones Studio de Detailed Spec; lane app `POST /api/platform/app/growth/seo/keywords/{track,untrack}` con `dryRun` → digest; `proposalRef` opcional en track/untrack (ambos lanes)
- Backward compatibility: `gated` (la ruta delegada del gateway detrás de `GREENHOUSE_SEO_DELEGATED_WRITES_ENABLED`; `proposalRef` aditivo)
- Full API parity: proponer (Studio) y ejecutar (Greenhouse) tienen command, ruta y tool cada uno

### Data model and invariants

- Entidades/tablas/views afectadas: Studio `plan_seo_target`, `plan_aeo_question`, `seo_snapshot`, `seo_tracking_proposal` (nuevas); Greenhouse: columna/propiedad `proposal_ref` en la membresía de keywords rastreadas [verificar tabla en Discovery]
- Invariantes que no se pueden romper:
  - snapshot inmutable y append-only; nunca se reescribe con datos nuevos
  - `internal_competitive` nunca en un DTO para actor no interno, token con `act` o identidad de servicio de agente
  - Studio no invoca lanes o tools que gasten
  - rastrear exige persona + confirmación (digest) en Greenhouse; `intent` declarado, nunca por defecto
  - metodología distinta ⇒ `not_comparable`, sin delta
- Write-target allowlist: Greenhouse growth: declarar la columna nueva si existe boundary test del dominio SEO [verificar]; Studio N/A
- Tenant/space boundary: Studio consulta con `externalScopeId` = organización canónica de la campaña; el carril app de Greenhouse resuelve autoridad por persona y organización en cada llamada
- Idempotency/concurrency: Studio `Idempotency-Key` + `If-Match`; Greenhouse track/untrack idempotentes por keyword (existente) + `Idempotency-Key` en el carril app
- Audit/outbox/history: `audit_event` en Studio; audit y eventos existentes del command SEO en Greenhouse, con actor persona y `proposalRef`

### Migration, backfill and rollout

- Migration posture: `additive` en ambos repos
- Default state: `STUDIO_SEO_PLAN_ENABLED=false` (Studio); `GREENHOUSE_SEO_DELEGATED_WRITES_ENABLED=false` (gateway)
- Backfill plan: ninguno
- Rollback path: flags OFF; revert PR; el carril máquina anterior del gateway queda intacto mientras el flag esté OFF
- External coordination: allowlist del cliente de canje nuevo en Vercel production + redeploy; `deploy.yml` del gateway + dispatch

### Security and access

- Auth/access gate: Studio lectura `.campaign.read`; bloque y propuestas `.campaign.write` (`T1`); snapshot competitivo declarado sólo por persona interna con `.campaign.write` (un `api_client` no declara competitivos). Greenhouse: `growth.seo.target.configure` por persona en el carril app; clase `efeonce.mcp.seo.write` en el token
- Sensitive data posture: dato competitivo clasificado; sin PII
- Error contract: canónicos en ambos repos (`seo_source_unavailable`, `seo_snapshot_classification_forbidden`, `confirmation_required`, `confirmation_mismatch`)
- Abuse/rate-limit posture: capturas de snapshot limitadas a 50 objetivos por llamada y caché del adapter; el techo de keywords por objetivo (`GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET`) sigue mandando en Greenhouse

### Runtime evidence

- Local checks: tests de clasificación (filtro), comparación con metodología distinta, captura con lane caído (`seo_source_unavailable` y snapshot no creado), propuesta ↔ readback por `proposalRef`
- DB/runtime checks: migraciones verificadas; `proposal_ref` visible en la membresía rastreada tras una ejecución
- Integration checks: canary Studio ↔ Greenhouse staging (captura real de oportunidades y visibilidad para Efeonce); canary del gateway con persona: `track_seo_keywords` `dryRun` → digest → confirmación, actor persona en el audit; persona sin `growth.seo.target.configure` ⇒ `forbidden`
- Reliability signals/logs: frescura `seo_follow_up_stale` en Studio (seguimiento no leído en 7 días para campañas lanzadas); gasto visible en `get_seo_provider_spend` (Greenhouse, interno)
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica de referencias, snapshots y seguimiento en `packages/domain/src/seo-plan/**`; ejecución de gasto en el command dueño de Greenhouse.
- [ ] Commands, no handlers; snapshots como hechos append-only.
- [ ] Lecturas T0, bloque y propuestas T1, ejecución T2 con digest y persona.
- [ ] Sin capability nueva en Studio; en Greenhouse reutiliza `growth.seo.target.configure` (existente) con cliente de canje nuevo.
- [ ] Camino programático: `/api/v1` + tools `studio.*`; carril app + tool `track_seo_keywords` para ejecutar.
- [ ] Un primitive, muchos consumers.
- [ ] Parity check = SÍ.

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

### Slice 1 — Modelo del bloque y snapshots

- Migración `<ts>_seo-plan.sql` (Studio): tablas de Detailed Spec §«Modelo», trigger que rechaza `UPDATE`/`DELETE` en
  `seo_snapshot`, bloque `DO`.
- Discovery previo obligatorio: para cada lane de la tabla §«Fuentes», confirmar en Greenhouse si acepta binding
  org-scoped o sólo `internal`, y registrar la clasificación resultante en `classification.ts` (tabla cerrada
  lane → clasificación).

### Slice 2 — Adapter y captura de snapshots

- `greenhouse-seo-adapter.ts` sobre el consumer de TASK-1892 (timeout, correlación, validación de respuesta, 404 ⇒
  `not_entitled`, `found=false` ⇒ `not_captured`), sólo lanes de lectura sin gasto.
- Command `captureSeoSnapshots` (`T1`): por objetivo, lee el lane correspondiente y guarda exactamente lo devuelto
  (`value_json`, `metric`, `data_through`, `methodology`, `source_lane`, `classification = org_visible`,
  `verified_by_studio = true`).
- Command `declareCompetitiveSeoSnapshot` (`T1`, persona interna): guarda valores leídos por la persona o su agente
  desde una tool interna de Greenhouse (`get_seo_keyword_gap`, `get_seo_serp_top_results`,
  `get_seo_competitor_candidates`), con `source_tool`, `classification = internal_competitive`,
  `verified_by_studio = false`. Un `api_client` recibe `seo_snapshot_classification_forbidden`.

### Slice 3 — Bloque SEO/AEO del plan y regla de aprobación

- Command `setPlanSeoAeo` (`T1`, sobre la versión en borrador de TASK-1907): objetivos (`keyword`, `topic`,
  `opportunity`, `question`), URL objetivo o `content_item_id`, intención de búsqueda declarada, mercado
  (`locationCode`, `languageCode`) y `snapshot_ids` que los justifican.
- Contribuyente de `readiness`: todo objetivo tiene al menos un snapshot y una URL o un ítem de contenido; toda pregunta
  AEO tiene snapshot de la lente dual o de consultas fundamentadas; una campaña sin bloque SEO/AEO no se bloquea.

### Slice 4 — Seguimiento posterior al lanzamiento

- Reader `getSeoFollowUp(actor, campaignId)`: por objetivo, snapshot de planificación + lectura en vivo (ranking,
  visibilidad por URL, desempeño con ventana fija del vuelo, lente dual para AEO) con `dataThrough`; `comparison`
  = `improved | declined | unchanged | not_comparable | no_data` calculado sobre los valores tal cual (sin recalcular
  métricas); `not_comparable` si difiere `methodology` (p. ej. `etvMethodology`).
- Filtro de clasificación aplicado en este reader y en `getStrategyPlan` (test: actor no interno, token con `act` e
  identidad de servicio de agente nunca reciben `internal_competitive`).

### Slice 5 — Propuestas de rastreo (Studio)

- Commands `proposeSeoKeywordTracking` (`T1`: keywords, `intent` obligatorio por keyword, mercado, objetivo del plan;
  genera `proposal_ref = studio:seo-proposal:<id>`) y `withdrawSeoKeywordTracking` (`T1`, sólo si no se ejecutó).
- Reader `listSeoTrackingProposals`: estado derivado por readback del lane `keywords` filtrando `proposalRef`
  (`proposed | executed | partially_executed | rejected | withdrawn`), con los outcomes por keyword que devolvió
  Greenhouse; nunca marcado a mano.

### Slice 6 — Greenhouse: `proposalRef` y carril delegado de rastreo

- `track_seo_keywords` / `untrack_seo_keywords`: `proposalRef` opcional (formato validado, persistido con la membresía
  y devuelto en el lane `keywords`), sin cambiar outcomes ni techo.
- Lane app `POST /api/platform/app/growth/seo/keywords/{track,untrack}` con autoridad resuelta por llamada
  (`growth.seo.target.configure` + organización), `dryRun` que devuelve outcomes previstos + `proposalDigest`, y
  ejecución sólo con el digest; el audit registra la persona, `authority.kind` y `proposalRef`.
- Cliente de canje `efeonce-mcp-growth-seo-write` (input `efeonce.mcp.seo.write` → scope Greenhouse
  `growth.seo.target.configure`, `requireOnPrivilegedAction = true`) por migración + allowlist + redeploy.
- Descripciones de las dos tools en `tool-manifest.ts`: proponer la lista exacta, mostrar el digest, confirmar;
  `proposalRef` cuando viene de un plan de Studio. Manual servido `seo-spend-discipline` actualizado.

### Slice 7 — Gateway y canary

- `efeonce-mcp`: con `GREENHOUSE_SEO_DELEGATED_WRITES_ENABLED=true` (declarada en `deploy.yml`), `track_seo_keywords` y
  `untrack_seo_keywords` canjean el token de la persona y llaman el lane app (actor persona); con `false`, conducta
  actual. Sync del manifiesto de Studio (tools nuevas) y de Greenhouse, bump minor, `surface:baseline`, PR, dispatch.
- Canary: persona con capability ejecuta un rastreo de una keyword de prueba sobre la organización Efeonce en staging
  con `dryRun` → digest → confirmación y `proposalRef` de un plan de `CMP-900`; Studio muestra la propuesta `executed`;
  untrack inmediato para no dejar gasto recurrente (y registro del costo en `get_seo_provider_spend`).

### Slice 8 — Documentación

- Arquitectura de Studio §3.1 (estado vigente), `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (carril delegado +
  `proposalRef`), runbook de Studio, manuales servidos (`marketing-studio`, `seo-spend-discipline`), ledger de flags,
  skills `efeonce-marketing-studio`, `efeonce-campaign-planning` y `efeonce-mcp-platform`.

## Out of Scope

- Descubrir palabras clave, declarar competidores y diagnóstico de prospecto con autoridad delegada (siguen en el carril
  actual interno; follow-up con la misma receta).
- Un binding `internal` para Studio (decisión: Studio usa sólo su binding org-scoped; lo competitivo entra declarado
  por una persona interna).
- UI del bloque (TASK-1912); la UI de Studio **no** ejecuta rastreos (decisión de esta task, ver Detailed Spec).
- Correr el AEO Grader desde Studio (TASK-1861 lo hace operable por MCP; Studio sólo guardará referencias a sus runs en
  un follow-up).

## Detailed Spec

### Modelo (Studio)

| Tabla | Columnas clave |
|---|---|
| `plan_seo_target` | `(campaign_id, version_no, target_id) PK`, `kind keyword\|topic\|opportunity\|question`, `subject_ref jsonb` (texto de la keyword, `locationCode`, `languageCode`, id de oportunidad o de consulta fundamentada), `search_intent NULL`, `target_url NULL`, `content_item_id NULL`, `snapshot_ids text[]`, `priority` |
| `plan_aeo_question` | `(campaign_id, version_no, question_id) PK`, `question`, `engines text[]`, `target_url NULL`, `snapshot_ids text[]` |
| `seo_snapshot` | `snapshot_id PK`, `campaign_id`, `organization_id`, `target_ref`, `source_lane NULL`, `source_tool NULL`, `metric`, `value_json`, `data_through date NULL`, `methodology NULL`, `classification org_visible\|internal_competitive`, `verified_by_studio bool`, `taken_at`, `taken_by` |
| `seo_tracking_proposal` | `proposal_id PK`, `campaign_id`, `version_no`, `target_id`, `proposal_ref UNIQUE`, `keywords jsonb` (`text`, `intent target\|opportunity`, `locationCode`, `languageCode`), `status_declared proposed\|withdrawn`, `created_by`, `revision` |

### Fuentes (confirmar clasificación en Slice 1)

| Lane SV360 | Uso | Clasificación esperada |
|---|---|---|
| `keyword-opportunities`, `keyword-market-data` | justificar objetivos | `org_visible` |
| `rank-evolution`, `url-visibility`, `performance`, `visibility-360` | snapshot y seguimiento | `org_visible` |
| `dual-lens-visibility`, `grounded-queries` (lectura) | preguntas AEO | `org_visible` [verificar] |
| `keywords` | readback de propuestas | `org_visible` |
| `keyword-gap`, `serp-top-results`, `competitor-candidates` | sólo declarado por persona interna | `internal_competitive` |
| `provider-spend`, `work-queue` | no se usan | — |

### Resolución de las preguntas abiertas del ADR

- **§11.2 (binding):** Studio usa **sólo** su binding org-scoped de TASK-1892 para campañas de Efeonce y de clientes. Lo
  competitivo entra como snapshot declarado por una persona interna y queda `internal_competitive`; el reader lo filtra
  para todo actor que no sea interno (hoy todos los actores de Studio son internos; el filtro protege la futura
  superficie de cliente).
- **§11.3 (disparar un `T2` en Greenhouse con la identidad de la persona):** por la **tool de Greenhouse** con el carril
  app delegado (Slice 6–7). La UI de Studio no ejecuta rastreos: muestra la propuesta, su `proposalRef` y el estado
  leído, e indica que se ejecuta desde un agente (tool `track_seo_keywords`) o desde Greenhouse. Así el gasto tiene un
  solo command, un solo audit y la persona como actor, sin que Studio maneje tokens de otra plataforma.

### Operaciones y tools (Studio)

| operationId | Método y ruta | Tool | Nivel | Capability / scope |
|---|---|---|---|---|
| `getSeoPlan` | `GET /api/v1/campaigns/{campaignId}/seo/plan?version=` | `studio.campaign.seo_plan.get` | T0 | `.campaign.read` / `studio:read` |
| `getSeoFollowUp` | `GET /api/v1/campaigns/{campaignId}/seo/follow-up` | `studio.campaign.seo_follow_up.get` | T0 | ídem |
| `listSeoSnapshots` | `GET /api/v1/campaigns/{campaignId}/seo/snapshots` | `studio.campaign.seo_snapshots.list` | T0 | ídem |
| `listSeoTrackingProposals` | `GET /api/v1/campaigns/{campaignId}/seo/tracking-proposals` | `studio.campaign.seo_tracking_proposals.list` | T0 | ídem |
| `setPlanSeoAeo` | `PUT /api/v1/campaigns/{campaignId}/strategy-plan/drafts/{versionNo}/seo` | `studio.campaign.strategy_plan.seo.set` | T1 | `.campaign.write` / `studio:write` |
| `captureSeoSnapshots` | `POST /api/v1/campaigns/{campaignId}/seo/snapshots` | `studio.campaign.seo_snapshots.capture` | T1 | ídem |
| `declareCompetitiveSeoSnapshot` | `POST /api/v1/campaigns/{campaignId}/seo/snapshots/competitive` | `studio.campaign.seo_snapshot.declare_competitive` | T1 (persona interna) | `.campaign.write` / ninguno |
| `proposeSeoKeywordTracking` | `POST /api/v1/campaigns/{campaignId}/seo/tracking-proposals` | `studio.campaign.seo_tracking.propose` | T1 | `.campaign.write` / `studio:write` |
| `withdrawSeoKeywordTracking` | `POST /api/v1/campaigns/{campaignId}/seo/tracking-proposals/{proposalId}/withdraw` | `studio.campaign.seo_tracking.withdraw` | T1 | ídem |
| ejecutar rastreo | Greenhouse `POST /api/platform/app/growth/seo/keywords/track` | `track_seo_keywords` (Greenhouse) | T2 (persona) | `growth.seo.target.configure` + `efeonce.mcp.seo.write` |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1907 y TASK-1892 en producción → Slice 1 → 2 → 3 → 4 → 5 (Studio) · Slice 6 (Greenhouse) en paralelo → release de
  Greenhouse → Slice 7 (gateway) → Slice 8.
- `GREENHOUSE_SEO_DELEGATED_WRITES_ENABLED=true` sólo después del canary con persona en staging; mientras esté OFF el
  gateway conserva la conducta actual.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Rastreo ejecutado sin persona | gasto de proveedor | low | carril app con autoridad por llamada + digest; clase de escritura fuera del cliente público | audit sin persona (test) |
| Gasto recurrente olvidado tras el canary | gasto de proveedor | medium | untrack inmediato en el canary; revisión en `get_seo_provider_spend` | gasto del mes |
| Dato competitivo visible a cliente | confidencialidad | low | clasificación + filtro en reader con test | test de filtro |
| Snapshot presentado como actual | lectura | medium | DTO separa `planningSnapshot`/`current` | revisión del canary |
| Cambio de ruta rompe a consumidores del carril máquina | gateway SEO | low | flag; conducta anterior intacta con OFF | canary SEO existente |

### Feature flags / cutover

- `STUDIO_SEO_PLAN_ENABLED` (Vercel de Studio; default `false`).
- `GREENHOUSE_SEO_DELEGATED_WRITES_ENABLED` (gateway, `deploy.yml`; default `false`).
- Filas en `FEATURE_FLAG_STATE_LEDGER.md` con runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–5 | flag Studio OFF; revert PR; tablas quedan | < 15 min | sí |
| Slice 6 | quitar cliente de la allowlist + redeploy; `proposalRef` aditivo queda | < 15 min | sí |
| Slice 7 | flag del gateway OFF + dispatch | < 30 min | sí |

### Production verification sequence

1. Discovery de clasificación de lanes documentado en la task.
2. Staging: captura real para Efeonce (oportunidades y visibilidad); snapshot inmutable (un `UPDATE` falla).
3. Staging: seguimiento con un objetivo con metodología distinta ⇒ `not_comparable`.
4. Greenhouse release con el carril app; gateway con flag ON en staging; canary con persona: `dryRun` → digest →
   confirmación → Studio `executed` → untrack.
5. Production con flags OFF → ON; sesión MCP real.

### Out-of-band coordination required

- Allowlist del cliente `efeonce-mcp-growth-seo-write` en Vercel production + redeploy.
- Dispatch del gateway con el flag nuevo en `deploy.yml`.
- Operador aprueba el gasto del canary de rastreo (una keyword, desmontada en el mismo día).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Studio captura snapshots desde lanes org-visibles con su consumer y los guarda tal cual, con `data_through` y metodología.
- [ ] Un snapshot no se puede modificar ni borrar (trigger).
- [ ] Un actor no interno nunca recibe un snapshot `internal_competitive` (test en ambos readers).
- [ ] Un agente en segundo plano (token con `act`) o programado (identidad de servicio) nunca recibe un snapshot `internal_competitive` ni puede declararlo (test en ambos readers y en el command).
- [ ] Un `api_client` no puede declarar un snapshot competitivo.
- [ ] El seguimiento distingue snapshot de dato actual y marca `not_comparable` ante metodología distinta.
- [ ] El bloque SEO/AEO participa en `readiness` de la aprobación del plan.
- [ ] Ningún command de Studio llama a un lane o tool que gaste (test de allowlist de lanes del adapter).
- [ ] `track_seo_keywords` acepta `proposalRef` y el lane `keywords` lo devuelve.
- [ ] Con el flag del gateway ON, rastrear por MCP exige persona, digest y confirmación; el audit de Greenhouse registra a la persona y `proposalRef`.
- [ ] Una propuesta de Studio pasa a `executed` sólo por readback, nunca a mano.
- [ ] Canary de rastreo ejecutado y desmontado, con su costo visible.

## Verification

- Studio: `pnpm check` + `pnpm build`.
- Greenhouse: `pnpm local:check`, tests de `src/lib/growth/seo`, `pnpm mcp:manifest:check`, `pnpm mcp:skills:check`; `pnpm test` + `pnpm build` al cerrar.
- Gateway: tests + `pnpm surface:baseline`; canary SEO existente + canary delegado.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skills `efeonce-marketing-studio`, `efeonce-campaign-planning` y `efeonce-mcp-platform` actualizadas y espejadas.
- [ ] `EPIC-049` refleja el estado de esta task.

## Follow-ups

- Carril delegado para `discover_seo_keywords`, `declare_seo_competitors` y diagnóstico de prospecto.
- Referencias a runs del AEO Grader cuando TASK-1861 esté en producción.
- Retirar el carril máquina de escritura SEO del gateway cuando el delegado lleve un ciclo estable.

## Open Questions

- ¿El operador acepta que la UI de Studio no ejecute rastreos (sólo agentes o Greenhouse)? Decisión por defecto de esta task; si se quiere ejecutar desde Studio, requiere un ADR corto sobre tokens delegados entre plataformas.
