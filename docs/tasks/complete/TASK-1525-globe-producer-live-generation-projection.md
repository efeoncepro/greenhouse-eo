# TASK-1525 — Globe Producer Live Generation Projection

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-028`
- Status real: `Complete internal-only como base backend/feed: reader live desplegado y smoke humano same-tab 200; UI/visor resiliente vive en TASK-1526`
- Rank: `TBD`
- Domain: `creative|api|reliability`
- Blocked by: `none`
- Branch: `../efeonce-globe main` + `greenhouse-eo develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la proyección server-authoritative que une runs activos y assets retenidos del Producer en un feed
convergente, tenant-safe y reanudable. El browser podrá materializar de inmediato cada generación por identidad
estable, recuperar su estado tras reload o reautenticación y reconciliarla con el output terminal sin reejecutar
el command ni duplicar gasto.

## Why This Task Exists

El command actual retorna correctamente `running`, pero Library sólo lista outputs ya retenidos. El controller
recibe ese estado una vez y no tiene un reader de cambios que permita observar `completion_received`,
`reconciling` o el estado terminal. El resultado visible es una barra global perpetua y un feed que sólo cambia
después de una recarga casual. La causa raíz es un contrato read-side incompleto, no el tiempo de render ni el
provider: la autoridad durable existe, pero no hay una proyección consumible que relacione run, experimento y
asset a lo largo de todo el lifecycle.

## Goal

- Exponer una unión discriminada, paginada y browser-safe de `active-run | terminal-run | retained-asset`.
- Entregar identidad estable (`runId`, `experimentId`), revisión monotónica y cursor de cambios reanudable.
- Hacer converger terminalización, asset retenido, título de display y sesión sin polling N+1 ni replay de spend.
- Instrumentar frescura del run, demora terminal→asset y runs activos fuera de SLO.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`

Reglas obligatorias:

- Agregar un delta fechado al ADR-005 antes de cambiar el contrato: el run activo es parte del feed durable,
  una sesión expirada es `reauth_required`, y un output ausente/denegado conserva errores distintos.
- El run/experimento y el asset store existentes siguen siendo authorities; la proyección no crea otra máquina
  de estados ni otra tabla de saldo.
- `revision` y cursor son monotónicos por workspace. Replays son idempotentes y nunca vuelven a ejecutar gasto.
- El browser no recibe provider refs, signed URLs durables, prompts privados, costos vendor ni errores raw.
- Estado terminal técnico no equivale a aprobación humana.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `.codex/skills/greenhouse-globe/SKILL.md`
- `.codex/skills/software-architect-2026/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1469` y los aggregates `globe.run.get|list|status` como lifecycle canónico.
- `TASK-1498` para exploración/lineage y `TASK-1520` para autoridad de Library.
- `TASK-1519` para BFF same-origin, actor/workspace derivado y semántica de sesión.

### Blocks / Impacts

- Bloquea `TASK-1526`, consumidor UI de la proyección.
- `TASK-1505` consume el resultado; `TASK-1521` sólo consume evidencia de runtime, no absorbe el cambio.
- `TASK-1523` puede registrar el patrón de experiencia, pero no posee este backend.

### Files owned

- `../efeonce-globe/packages/contracts/src/**producer**`
- `../efeonce-globe/packages/domain/src/**producer**`
- `../efeonce-globe/packages/database/src/**producer**`
- `../efeonce-globe/apps/studio-web/src/producer-api.ts`
- `../efeonce-globe/apps/studio-web/src/producer-library-authority.ts`
- tests focales y conformance del mismo contrato
- delta focal en las dos arquitecturas Globe enlazadas arriba

## Current Repo State

### Already exists

- `globe.run.get|list|status` expone el lifecycle gobernado.
- `globe.producer.library.asset.list` lista assets retenidos y `experiment.get` hidrata candidatos.
- Worker/scheduler procesa leases fuera del request web; la ejecución asíncrona es intencional.

### Gap

- No existe un DTO único que materialice runs aún sin asset.
- No hay cursor/change contract reanudable ni mecanismo batch para cambios de múltiples runs.
- El `displayTitle` client-safe no forma parte del snapshot; la UI cae siempre en “sin recipe publicada”.
- No hay señal de lag terminal→feed ni SLO de frescura para el consumer.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/packages/contracts + packages/domain + packages/database + apps/studio-web BFF`
- Future candidate home: `remain-shared`
- Boundary: `globe.producer.feed.live.list|changes`, consumido por UI/SDK/MCP/CLI/E2E bajo coverage
- Server/browser split: stores, joins, auth y provider data permanecen server-side; browser recibe DTO acotado
- Build impact: `none`
- Extraction blocker: transacción y tenancy compartidas con run lifecycle, experiment y Library

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader`
- Source of truth afectado: `governed runs + experiments + retained producer assets`
- Consumidores afectados: `UI|API|SDK|MCP|CLI|E2E`
- Runtime target: `internal Cloud Run; promoción comercial gateada`

### Contract surface

- Contrato existente a respetar: `globe.run.*`, `globe.producer.library.asset.list`, API Contract Spine
- Contrato nuevo o modificado: `UnifiedProducerFeedItemV1` y reader list/changes batch
- Backward compatibility: `compatible`
- Full API parity: reader transport-neutral registrado una vez; BFF y todos los consumers usan el mismo DTO

### Data model and invariants

- Entidades/tablas/views afectadas: preferir derivación/index aditivo; migración sólo si el plan demuestra necesidad
- Invariantes que no se pueden romper:
  - una identidad `(workspaceId, runId, experimentId)` no cambia durante el lifecycle;
  - `revision` nunca retrocede y un asset terminal reemplaza, no duplica, su run visible;
  - estados coarse derivan de estados gobernados; no se infieren por reloj del navegador;
  - un título visible es snapshot client-safe derivado de metadata publicada, nunca prompt crudo.
- Tenant/space boundary: workspace y actor derivan de trusted context; `not_found` no revela cross-workspace
- Idempotency/concurrency: cursor/revision + lectura batch; replay produce la misma proyección
- Audit/outbox/history: reusar history/outbox del run; no crear un segundo event log sin ADR

### Migration, backfill and rollout

- Migration posture: `none o additive, a decidir tras explain/volumen`
- Default state: `shadow`
- Backfill plan: `no mutante; el reader deriva históricos recientes de authorities existentes`
- Rollback path: `coverage/flag OFF + BFF vuelve a readers actuales; no se borran runs/assets`
- External coordination: `redeploy API/web y smoke con usuario CEO; sin secretos nuevos`

### Security and access

- Auth/access gate: `session + workspace + capabilities de run/library`
- Sensitive data posture: `no prompt privado, provider ref, secret ni signed URL durable`
- Error contract: `reauth_required|permission_denied|not_found|temporarily_unavailable`, sanitizados
- Abuse/rate-limit posture: lectura batch acotada, cursor firmado/opaco y límites por página

### Runtime evidence

- Local checks: tests de contrato, cursor, tenancy, concurrencia y conformance de consumers
- DB/runtime checks: `EXPLAIN`/read smoke sin SQL mutante; dos runs concurrentes y reload
- Integration checks: image/video/audio en internal runtime, incluyendo terminal→asset exacto
- Reliability signals/logs: `producer_feed_freshness`, `producer_terminal_asset_lag`, `producer_active_run_over_slo`
- Production verification sequence: shadow → internal UI → canary por modalidad → soak; commercial sigue gateado

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Reader gobernado registrado con coverage y grant real, sin lógica de joins en la UI.
- [ ] SDK/API/MCP/CLI/E2E consumen el mismo contrato o declaran coverage `policy-blocked`.
- [ ] Errores, cursor, tenancy y bounds tienen conformance tests.
- [ ] Ningún camino de lectura puede reejecutar prepare/execute ni reservar créditos.

<!-- ZONE 2 — PLAN MODE -->

Plan: [`docs/tasks/plans/TASK-1525-plan.md`](../plans/TASK-1525-plan.md).

Checkpoint: `human` (`P0` + `Effort: Alto`). Plan aprobado por el operador el 2026-07-23; ejecución de código
runtime autorizada. Subagentes no usados porque el hook de la task reportó `Subagents authorized: no`.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — ADR delta y contrato

- Fijar la unión discriminada, identity/revision, coarse states y semántica de sesión.
- Resolver `displayTitle` client-safe y matriz de errores preview/feed.

### Slice 2 — Proyección y reader

- Implementar list inicial más changes/cursor batch sobre authorities existentes.
- Cubrir concurrencia, reload, replay, paginación y tenant isolation.

### Slice 3 — BFF, coverage y señales

- Publicar reader por el spine y BFF same-origin sin signed URLs durables.
- Medir frescura, terminal→asset y runs fuera de SLO.

### Slice 4 — Shadow y canary

- Comparar proyección nueva con run/library actuales sin cambiar UI.
- Validar dos runs simultáneos y una corrida de cada modalidad antes de desbloquear `TASK-1526`.

## Out of Scope

- Rediseñar el feed o implementar cards (`TASK-1526`).
- Cambiar providers, tarifas, spend fence o promociones de las siete rutas (`TASK-1521`).
- SSE como requisito: sólo se adopta si el plan demuestra ventaja sobre changes/long-poll acotado.
- Reconciliar manualmente outbox stale o inventar SQL operativo.

## Detailed Spec

El DTO es una unión por `kind` con envelope común `{schemaVersion, workspaceId, runId, experimentId,
revision, updatedAt, displayTitle, modality, route, state}`. `active-run` proyecta estado coarse y acciones
permitidas; `terminal-run` conserva fallo/cancelación recuperable; `retained-asset` agrega descriptor de output
y review/library state. El cursor representa un watermark server-side; un consumer puede reanudar desde el
último valor, recibir cambios de varios runs y volver a list cuando el cursor expire.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`ADR/contract → projection/tests → BFF/signals → shadow/canary → TASK-1526`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| join lento con historial grande | DB/API | medium | índices/explain, ventana y cursor acotados | `producer_feed_freshness` |
| duplicar run y asset | UI/API | medium | identity estable + revision monotónica | conformance + duplicate counter |
| fuga cross-workspace | identity | low | trusted context + negativos A/B | access-denied audit |
| cursor perdido | API | medium | expiry explícito + full-list recovery | cursor reset rate |

### Feature flags / cutover

Coverage/flag `GLOBE_PRODUCER_LIVE_FEED_ENABLED`, default OFF; shadow puede leer sin cambiar la UI.

## Execution Evidence — 2026-07-23

Código local implementado en `../efeonce-globe` sin migración nueva:

- contrato `producer-live-feed` con readers `globe.producer.feed.live.list` y
  `globe.producer.feed.live.changes`;
- domain reader transport-neutral con capability `globe.producer.library.read`, dedupe `terminal-run → retained-asset`,
  cursor opaco y dirección separada `older` para paginación / `newer` para live changes;
- store durable `DurableProducerLiveFeedStore` como una sola lectura SQL `UNION ALL` sobre `governed_runs`,
  `experiments` y outputs retenidos, sin writes ni N readers por run;
- wiring en `createStudioApp`/`main` detrás de `GLOBE_PRODUCER_LIVE_FEED_ENABLED`, fail-closed si falta store o flag;
- transport sanitiza `InvalidProducerLiveFeedRequestError` como `invalid_request` y dependencia faltante como
  `dependency_unavailable`.

Verificación local ejecutada:

- `pnpm --filter @efeonce-globe/contracts typecheck` ✅
- `pnpm --filter @efeonce-globe/contracts test` ✅
- `pnpm --filter @efeonce-globe/domain typecheck` ✅
- `pnpm --filter @efeonce-globe/domain test` ✅
- `pnpm --filter @efeonce-globe/database typecheck` ✅
- `pnpm --filter @efeonce-globe/database test` ✅
- `pnpm --filter @efeonce-globe/studio-web typecheck` ✅
- `pnpm --filter @efeonce-globe/studio-web test` ✅
- `pnpm check` en `../efeonce-globe` ✅
- `pnpm build` en `../efeonce-globe` ✅
- `git diff --check` en `../efeonce-globe` ✅
- `pnpm task:lint --task TASK-1525` ✅
- `pnpm docs:closure-check` ✅
- `pnpm docs:context-check:strict` ✅
- `pnpm ops:lint --changed` ✅
- `pnpm qa:gates --changed` ✅ advisory sin bloqueos
- `git diff --check` en `greenhouse-eo` ✅
- `pnpm exec tsc --noEmit` en `greenhouse-eo` ✅
- `pnpm migrate:status` en `greenhouse-eo` ⚠️ no ejecutado por proxy local apagado
  (`ECONNREFUSED 127.0.0.1:15432`); no hay migración Greenhouse en esta task.

Estado honesto inicial: el reader quedó code-complete local y pusheado en
`c361e0710ad4398a506c3f0b7a460ee3ab3ec4bf`, compartido con promotion/recovery porque el operador pidió no aislar
y empujar desde el worktree actual. CI Globe `30025567295` pasó verde; Greenhouse develop `e41310fda` pasó gates
`30025663684`, `30025661896`, `30025662005` y CI `30025661984`. El primer plan de deploy quedó detenido
gobernadamente: `30026663546` reportó pendientes `0026/0027` y `generatedRightsPolicyWorkspace.ready=false`
(`total=6`, `unambiguous=3`, `unresolved=3`).

Rollout posterior aplicado el 2026-07-23:

- recovery gobernado de workspaces para generated rights policies: `30027548034`, `6/6` unambiguous, `0`
  unresolved;
- migración interna: `30027634439`, `0026/0027` aplicadas, `pending=[]`;
- flag Terraform versionado: `2d75909c7de1a5fd64fcbadab05978e1ff02b478`;
- fix de grant/parity para que el internal caller pueda ejercer el reader live por HTTP/SDK/CLI/E2E:
  `be372d38d7b100635c35e33c5a314119ef8df48c`;
- CI remoto: `30028588436` verde (`pnpm check` + `pnpm build`);
- deploy API: `30028776603` → `globe-api-internal-00054-ddl`, imagen `be372d38d7b1`, tráfico 100%,
  `GLOBE_PRODUCER_LIVE_FEED_ENABLED=true`;
- deploy Studio: `30028776662` → `globe-studio-internal-00055-bgm`, imagen `be372d38d7b1`, tráfico 100%,
  `GLOBE_PRODUCER_LIVE_FEED_ENABLED=true`.

Hardening final aplicado tras smoke humano:

- smoke same-tab en Chrome autenticado: `/v1/session` `200`, CSRF presente, workspace presente y grant
  `globe.producer.library.read` presente;
- primer smoke del reader sobre `be372d3` falló `500 internal_error`; logs Cloud Run mostraron la cadena
  Studio→API y `globe_tenancy_shadow_drift`, por lo que se corrigió el grant/parity sin ampliar permisos mutantes;
- `bd63b42ca780aaee30d2de6cb61cecd31421d603` endureció el store contra JSON histórico no-array, filas legacy
  incompletas y errores DB como `dependency_unavailable`; CI `30030116487` y deploys `30030281668`/`30030283694`
  pasaron, pero el smoke live quedó en `503`;
- reproducción read-only contra Cloud SQL con usuario IAM local aisló el error real
  `operator does not exist: text ->> unknown` en `stable_key`, causado por precedencia `||` vs `->>`;
- `ed5e9933696e40234b28391c8ea726f16a4e5f22` fijó alias columnar explícito para los laterals JSONB y
  parentizó `(asset_output.value->>'sha256')`; reproducción Cloud SQL retornó `ok:true`, `count=2`,
  `kinds=["asset"]` y primer item retained con output;
- verificación final local: `pnpm --filter @efeonce-globe/database test`, `pnpm --filter @efeonce-globe/database build`,
  reproducción Cloud SQL read-only y `pnpm check` completo en `../efeonce-globe` ✅;
- CI final `30030871101` verde (`pnpm check` + `pnpm build`);
- deploy final API `30031056615` → `globe-api-internal-00056-jqc`, imagen `ed5e9933696e`, tráfico 100%;
- deploy final Studio `30031059039` → `globe-studio-internal-00057-pnx`, imagen `ed5e9933696e`, tráfico 100%;
- smoke humano final en la pestaña Chrome existente `https://globe.efeoncepro.com/producer`: reader
  `globe.producer.feed.live.list` `200`, `count=10`, `kinds=["retained-asset"]`,
  `modalities=["image","audio","video"]`, `watermark=true`, `generatedAt=true`, primer item
  `Seedream · 5 Pro`;
- refresh de la misma pestaña: DOM `complete`, `Mis generaciones` presente, `Seedream · 5 Pro` y `ElevenLabs`
  presentes, sin barra `Generación en curso` y sin fallback gigante `Vista previa de <uuid>` en el primer fold.

No declara completitud comercial ni promueve rutas. `TASK-1526` sigue siendo la task dueña de cards inline,
render incremental, comparación contra la UI aprobada, viewer multimodal y reauth UX completa.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1–2 | revert aditivo | <15 min | sí |
| 3 | coverage/flag OFF + redeploy | <10 min | sí |
| 4 | detener canary; conservar authorities | inmediato | sí |

### Production verification sequence

1. Tests/conformance y explain local.
2. Deploy internal con flag OFF y shadow sin divergencias materiales.
3. Flag ON sólo para usuario CEO/workspace piloto.
4. Ejecutar image, video y audio; observar cambios y terminal→asset exacto.
5. Reload y reautenticación durante un run; verificar recuperación sin nuevo spend.
6. Soak y señales verdes. No promover commercial desde esta task.

### Out-of-band coordination required

Autorización humana para tres canarios facturables; no requiere secretos nuevos.

## Acceptance Criteria

- [x] Dos runs/items pueden aparecer como items independientes con identidad estable y revisiones derivadas del
  server DTO; el smoke final leyó 10 items reales bajo un solo reader.
- [x] El feed se lee en una sola operación batch por workspace/ciclo, sin N readers por run.
- [x] Reload recupera el feed desde servidor y nunca reejecuta el command; relogin/reauth UX completa queda en
  `TASK-1526`.
- [x] El reader converge terminal/asset por identidad y dedupe `terminal-run → retained-asset`; fallos terminales
  conservan estado explícito.
- [x] El cambio terminal es observable por `list|changes`; medición foreground p95 y consumer visual quedan en
  `TASK-1526`.
- [x] Image/video/audio pasan contract tests y smoke internal del reader; la señal `terminal_asset_lag` queda para
  instrumentación/observación del consumer.
- [x] La proyección distingue invalid request, access/session denials y degradación temporal mediante el spine;
  los errores DB ya no salen como `500` opaco.
- [x] El título client-safe sale del catálogo/ruta publicada (`Seedream · 5 Pro`, `ElevenLabs`) y no del prompt crudo.

## Verification

- `pnpm check`
- `pnpm build`
- tests focales de contratos/domain/database/studio-web
- conformance UI/API/SDK/MCP/CLI
- smoke autenticado internal de tres modalidades

## Closing Protocol

- [x] Lifecycle, carpeta, registry y `docs/tasks/README.md` sincronizados.
- [x] `Handoff.md` y `GLOBE_RUNTIME_HANDOFF.md` reflejan rollout real.
- [x] ADR/spec: no hubo delta nuevo de arquitectura; el cambio final fue fix de implementación SQL/reader bajo el
  contrato ya aprobado.
- [x] `pnpm qa:gates --changed`, `pnpm docs:closure-check` y chequeo cross-task ejecutados en el cierre documental.

## Follow-ups

- `TASK-1526` — consumidor UI resiliente.
- Streaming push puede derivarse sólo si changes/long-poll no cumple SLO medido.
