# TASK-1777 — Growth SEO: perfil de enlaces accionable (quién enlazó, quién se cayó, con qué anchor)

## Delta 2026-08-27 — implementación (code complete, rollout pendiente)

Slices 1–6a implementados y verificados local + PG real (misma sesión que TASK-1775/1776).
Decisiones de ejecución que ajustan la spec:

- **Se agrega una TERCERA tabla no declarada: `seo_backlink_drilldowns`** (el veredicto de cada
  evaluación, una fila por snapshot). Sin persistir el veredicto no se puede (a) distinguir
  `skipped_no_movement` de `drilldown_failed` — los tres estados del reader son contrato — ni
  (b) anclar el "a lo sumo una vez por snapshot". Registra también los skips: "el perfil estuvo
  estable" queda con fecha, no como ausencia. `skipped_partial` existe como outcome propio en el
  veredicto (auditable) y colapsa a `skipped_no_movement` en el contrato del reader.
- **Gate bloqueado NO escribe veredicto**: el snapshot queda re-evaluable cuando el presupuesto
  mensual se renueve (escribirlo lo quemaría para siempre por la regla de una-vez).
- **OQ1 (umbrales):** knobs `GROWTH_SEO_BACKLINK_DRILLDOWN_MIN_BACKLINK_MOVEMENT=10`,
  `…_MIN_REFDOMAIN_MOVEMENT=3`, `GROWTH_SEO_BACKLINK_DETAIL_ROW_LIMIT=100`; el operador los
  confirma antes del flip (flag OFF igual).
- **OQ2 (espejo BQ de hijas):** diferido — el agregado ya se espeja y el detalle es ventana
  caliente PG; el follow-up declarado queda vigente.
- **OQ3 (primera vez al prender):** aplica de inmediato a toda la cartera — acotado (~USD 0.1 por
  target; hoy 2 targets) y escalonable con `maxSnapshots` si la cartera crece. Documentado en el
  runbook.
- **Regla de precedencia del movimiento** (no estaba en la spec y la fusión la exige): `new`
  manda sobre `present`; `lost` sólo si el dominio YA NO está en presentes; un dominio presente
  que perdió UN enlace sigue `present` y conserva la muestra del enlace caído como contexto —
  el delta del proveedor cuenta backlinks, no dominios.
- **`skipped_partial` vs primera vez:** el snapshot `partial` NO dispara ni siquiera en primera
  vez (la regla de partial va primero, a propósito).
- La migración en `Files owned` decía `task-1778` (typo): quedó
  `20260827203319906_task-1777-seo-backlink-detail.sql`. Se agregan la señal en
  `src/lib/reliability/**`, el sanity `scripts/growth/_sanity-task-1777-backlink-detail.ts`
  (con transacción + ROLLBACK deliberado — un snapshot sintético committeado contaminaría la
  serie real) y `src/lib/api-platform/resources/ecosystem-growth-seo.ts` (el lane vive ahí).
- Evento con prefijo del dominio: `growth.seo.backlink.detail_captured` (sólo outcome `drilled`;
  los skips/failed quedan en el veredicto + señal). Capability reutilizada
  `growth.seo.observation.read`; lane app no se crea (dominio ecosystem-only).
- **El drift de la skill `dataforseo-operator`** ("backlinks sin consumer") declarado en la nota
  de esta spec **ya fue corregido** en el cierre documental de TASK-1775 (2026-08-27, mismo día).

**Rollout pendiente (checkpoint del operador — gasta dinero real):** flag ON multi-runtime
(`deploy.sh` + `--update-env-vars`, sólo ops-worker; sin scheduler nuevo) + smoke con un target
CON movimiento (filas hijas + `cost` vs estimado) y otro SIN movimiento (USD 0 en el ledger) +
canary de la tool MCP en staging + federación `efeonce-mcp` + confirmar umbrales/limit. Hasta
entonces: flag OFF, cero gasto, el batch semanal intacto.

### Evidencia de rollout 2026-08-27 (smoke live autorizado por el operador)

- Flag ON (declarativo + `--update-env-vars`, revisión `ops-worker-00603-ngj` verificada).
  Drill-down sobre los snapshots del 2026-08-24 **ya pagados** (el capture hizo skip a USD 0):
  2 targets `drilled` por `first_time` — Efeonce USD 0.0739 (28 dominios, 9 anchors), Berel
  USD 0.1079 (197 dominios, 77 anchors). **Total USD 0.1818 vs ~0.19 estimado.**
- **Re-corrida: USD 0** (`detailPass.snapshots: 0` — el veredicto ancla la idempotencia).
  Filas verificadas en PG: 225 dominios (72 `present` / 120 `new` / 33 `lost` — Berel perdió
  `apps.apple.com`, un hallazgo nominal real), `rank` 100% en escala 0-100, 86 anchors.
- Lane canary verde en staging (`state=available`, `capturedAt=2026-08-24`). Señal
  `seo.backlink.detail_drilldown_failed` en steady `ok` (2 evaluados, 2 drilled, 0 fallidos).
- El caso `skipped_no_movement` a USD 0 no pudo producirse en el smoke (ambos targets eran
  `first_time`): se observa en el primer ciclo natural del lunes 2026-08-31 — anotado en el
  ledger como verificación pendiente, cubierto por test mientras tanto.
- Pendiente para `complete`: pase develop→main + federación de `get_seo_backlink_detail` en
  `efeonce-mcp` (post-release).

## Delta 2026-08-27 (4) — cierre por decisión del operador; F1 con fecha

- El operador decidió cerrar la task hoy: el rollout está completo (flag ON en revisión activa,
  lane en producción con el release `cc73c74789ce`, `get_seo_backlink_detail` entre las 21 tools
  observadas en el gateway) y el único criterio sin observar — el predicado de movimiento — pasa
  de bloqueante a **follow-up F1 con fecha y dueño** (lunes 2026-08-31; ver `## Follow-ups`).
  La cláusula del Delta (3) "sólo bloquea marcar esta task complete" queda superseded por esta
  decisión; la receta de verificación del Delta (3) sigue siendo la vigente.

## Delta 2026-08-27 (3) — veredicto de auditoría: `code complete, rollout parcialmente verificado`

- Auditoría del release (sesión coordinadora) sobre la evidencia del smoke: los criterios de costo
  se cumplieron **salvo uno** — el predicado de movimiento (`skipped_no_movement` a USD 0) nunca se
  ejercitó en runtime porque ambos targets eran `first_time`. La re-corrida a USD 0 falsa la
  compuerta de **idempotencia** (veredicto único por snapshot), que es un predicado DISTINTO al de
  movimiento: son dos compuertas y sólo una quedó observada. Exposición si el predicado estuviera
  roto: ~USD 0.18 por lunes (~USD 9/año), acotada y observable.
- **Decisión: el flag queda ON a propósito** — el ciclo natural del lunes **2026-08-31 07:00 CLT**
  (`ops-seo-backlink-capture`) es el experimento que falta. Verificación (cualquier sesión, 1 min):

  ```sql
  SELECT d.outcome, d.trigger_reason, d.provider_cost_usd, s.captured_at::date
  FROM greenhouse_growth.seo_backlink_drilldowns d
  JOIN greenhouse_growth.seo_backlink_snapshots s ON s.id = d.snapshot_id
  WHERE s.captured_at::date = '2026-08-31'
  ORDER BY d.created_at;
  ```

  Sano: `skipped_no_movement` (o `skipped_partial`) con `provider_cost_usd = 0` para targets sin
  delta vs la línea base drilleada del 24/27-08; `drilled` sólo con movimiento real sobre umbrales
  (10 dominios / 3 posiciones, knobs por env). Cross-check: `seo_provider_spend_daily` de ese día
  para backlinks suma 0 salvo drills legítimos. Si aparece `drilled` sin movimiento, el sospechoso
  es `shouldDrillDownBacklinks` (`src/lib/growth/seo/backlinks/should-drill-down.ts`, predicado
  puro con tests de tabla) — comparar contra el summary previo que recibió.
- Esta verificación NO bloquea el pase develop→main; sólo bloquea marcar esta task `complete`.
  Mientras tanto los criterios de arriba quedan con su estado real (uno pendiente, anotado).

## Delta 2026-08-27 (2) — federación al gateway ya escrita

- La federación de `get_seo_backlink_detail` en `efeonce-mcp` ya está escrita (bajo
  `efeonce.mcp.read`, con guard de paridad bidireccional y canary; code complete en `efeonce-mcp`
  local, deploy del gateway pendiente POST-release develop→main) — cerrado por trabajo en
  TASK-1658. Pendiente para `complete` de esta task: pase develop→main + deploy del gateway +
  verificación `tools/list` 13→21.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `complete — rollout ejecutado y verificado (flag ON, lane en producción, tool federada); verificación del predicado de movimiento diferida al follow-up F1 (2026-08-31) por decisión del operador`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El snapshot semanal de enlaces (`TASK-1304`, vivo desde 2026-08-06) guarda **cuántos** dominios
referentes hay y **cuántos** se ganaron o perdieron, pero no **cuáles**. Un cliente al que se le dice
"perdiste 12 dominios referentes esta semana" no puede hacer nada con esa frase. Esta task agrega el
detalle accionable —qué dominio enlazó, cuál se cayó, con qué anchor— con una disciplina de costo
dura: **el drill-down sólo corre donde el agregado se movió**.

## Why This Task Exists

**Un número sin nombre propio no es accionable.** El perfil de enlaces es el único bloque del módulo
donde Greenhouse mide la magnitud pero no la identidad. `seo_backlink_snapshots` guarda
`referring_domains`, `backlinks_total`, `domain_rank`, `toxic_share` y un `new_lost_delta` JSONB
agregado: sirve para dibujar una línea de tiempo, no para escribir un correo de recuperación de
enlace ni para armar una campaña de digital PR.

Hay además una deuda de calidad declarada en el propio código. `toxic_share` es hoy un **proxy**:
`backlinks_spam_score / 100`, el spam score promedio del perfil entrante
(`src/lib/growth/seo/backlinks/capture.ts:18-20`). Es una aproximación honesta, pero no distingue
"tengo enlaces de sitios malos" de "tengo un anchor sobre-optimizado repetido 400 veces", que son dos
problemas distintos con dos remedios distintos. El endpoint `anchors` da esa segunda lectura, y hoy
no se pide.

La economía de la familia `backlinks` hace que esto sea barato si se diseña bien: USD 0,024 por
request más USD 0,000036 por fila, y **filtrar y ordenar es gratis**. Un request lleno de 1.000 filas
cuesta USD 0,06. Lo caro no es el detalle: lo caro sería pedir el detalle de toda la cartera todas las
semanas, aunque nada se haya movido. Por eso el diseño central de esta task no es un endpoint nuevo,
es una **condición de disparo**: el snapshot agregado que ya existe decide si vale la pena bajar.

## Goal

- Detalle nominal del perfil de enlaces: qué dominios referentes existen, cuáles entraron y cuáles se
  cayeron en la ventana, y cuál es el perfil de anchors — colgando del snapshot semanal que ya corre.
- **Drill-down condicional al delta**: si el agregado no se movió, no se paga detalle. La condición se
  evalúa sobre `new_lost_delta`, que ya está persistido.
- Lectura de sobre-optimización de anchors que reemplace, para ese diagnóstico concreto, el proxy
  actual de `toxic_share` — sin borrar el proxy, que sigue midiendo otra cosa.
- Reader `readBacklinkDetail` expuesto en los tres lanes (app · Nexa · ecosystem/MCP), con la
  degradación honesta que ya usa `readBacklinkProfile`.
- Cero cambio de shape en lo que hoy devuelve `readBacklinkProfile`: esta task agrega una capa, no
  reescribe la existente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §4.2 (serie append-only: los
  snapshots son mediciones inmutables, jamás supersede), §3 (mapa de capacidades), §5 (contrato de
  honestidad ●/◑), §6 (governance DataForSEO: breaker por familia, degradación honesta), §7 (Full API
  Parity), §8 (materialización async).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `CLAUDE.md §"Database — Migration markers"`
- `CLAUDE.md §"SQL embebido — type alignment + live testing"` y §`SQL Signal Reader Schema Validation Gate`
- `CLAUDE.md §"Runtime Rollout Completion Gate"` + `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

Reglas obligatorias:

- **NUNCA** correr el drill-down incondicionalmente sobre toda la cartera. La condición de disparo es
  parte del contrato, no una optimización opcional.
- **NUNCA** pedir `limit` alto sin filtro: cada fila cuesta, y los breakdowns internos se controlan
  con `internal_list_limit` (default 10).
- **NUNCA** mezclar la escala de `rank`. El módulo pide `rank_scale: one_hundred` (0–100, comparable a
  DR/DA); la escala default del proveedor es 0–1000 y mezclarlas produce cifras absurdas sin error.
- **NUNCA** hacer UPDATE o DELETE sobre las tablas de la serie: son append-only con trigger.
- **NUNCA** llamar el proveedor desde un route handler de Vercel: la captura vive en el ops-worker.
- **NUNCA** cambiar el shape que hoy devuelve `readBacklinkProfile`: hay consumers vivos.

## Normative Docs

- `.claude/skills/dataforseo-operator/SKILL.md` — regla cero del contrato Greenhouse.
- `.claude/skills/dataforseo-operator/references/03-backlinks.md` — §2 catálogo (paths exactos de
  `anchors`, `referring_domains`, `backlinks`), §3 métricas propias (`rank`, `spam_score` vs
  `backlinks_spam_score`), §4 params (`mode`, `backlinks_status_type`, filtros), §5 modelo de costo,
  §7 gotchas (incluido que el costo escala con `limit`), §8 oportunidades.
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `docs/tasks/complete/TASK-1304-*.md` — la task que dejó vivo el snapshot semanal que esta task
  extiende. `[confirmar el nombre exacto del archivo en Discovery]`

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_backlink_snapshots` (`migrations/20260805134439202_task-1299-growth-seo-schema.sql:144`) — el padre del que cuelga todo lo nuevo, con su `new_lost_delta` JSONB que provee la condición de disparo.
- `src/lib/growth/seo/backlinks/capture.ts` — colector semanal vivo (`BACKLINKS_SUMMARY_ENDPOINT`, `BACKLINKS_BULK_NEW_LOST_ENDPOINT`, `SEO_BACKLINK_CRON_ACTOR`).
- `src/lib/growth/seo/backlinks/reader.ts` — `readBacklinkProfile`, cuyo shape no cambia.
- `services/ops-worker/server.ts` endpoint `/seo/backlinks/capture-batch` + job `ops-seo-backlink-capture` (`services/ops-worker/deploy.sh:1338`, `0 7 * * 1`, ACTIVO desde 2026-08-06).
- `src/lib/ai/dataforseo.ts` + `dataforseo-families.ts` — familia `backlinks`, ya permitida. **Esta task NO amplía el allowlist.**
- `src/lib/growth/seo/entitlement.ts` — `enforceSeoRunEntitlement` con `consumesAuditAllowance: false`, tal como ya lo usa el snapshot semanal.

### Blocks / Impacts

- `TASK-1662` (keyword gap) y `TASK-1709` (prospecto) usan `backlinks/competitors` y `domain_intersection` para el **link gap** — eje distinto (comparar dos perfiles) del de esta task (describir uno). Si alguna entra primero, esta task reusa su cliente de familia sin duplicarlo.
- `TASK-1314` (pillar health) — gana el detalle de qué enlaza a la pillar, hoy invisible.
- `src/lib/growth/seo/backlinks/backlink-history-bq-mirror.ts` — el espejo BQ del snapshot; evaluar en Discovery si las tablas hijas también deben espejarse o si basta el agregado. `[confirmar en Discovery]`

### Files owned

- `migrations/<timestamp>_task-1778-seo-backlink-detail.sql`
- `src/lib/growth/seo/backlinks/detail-capture.ts`
- `src/lib/growth/seo/backlinks/anchors.ts`
- `src/lib/growth/seo/backlinks/detail-reader.ts`
- `src/lib/growth/seo/backlinks/should-drill-down.ts`
- `src/lib/growth/seo/backlinks/__tests__/*.test.ts`
- `src/lib/growth/seo/contracts.ts` (aditivo)
- `src/lib/growth/seo/flags.ts` (aditivo)
- `services/ops-worker/server.ts` (aditivo: paso de drill-down dentro del batch existente)
- `services/ops-worker/deploy.sh` (aditivo: env var)
- `src/app/api/platform/ecosystem/growth/seo/backlink-detail/route.ts`
- `src/mcp/greenhouse/{tools.ts,server.ts,http-client.ts}` (aditivo: `get_seo_backlink_detail`)
- `docs/manual-de-uso/growth/operar-perfil-de-enlaces-seo.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- **Colector semanal vivo y en producción**: `src/lib/growth/seo/backlinks/capture.ts` con
  `summary/live` + `bulk_new_lost_backlinks/live`, snapshot idempotente por
  `(seo_target_id, capture_date)`, pre-check antes de pegar el proveedor, gate con
  `consumesAuditAllowance: false`, degradación honesta (`partial` si sólo falla el delta) y
  `rank_scale: one_hundred` explícito.
- Cron activo: `ops-seo-backlink-capture`, `0 7 * * 1` (`services/ops-worker/deploy.sh:1338`,
  despausado el 2026-08-06).
- Reader `readBacklinkProfile` (`src/lib/growth/seo/backlinks/reader.ts`) y tool MCP
  `get_seo_backlink_profile` ya federada.
- Espejo BQ del snapshot: `backlink-history-bq-mirror.ts`.
- Tabla `seo_backlink_snapshots` con `new_lost_delta` JSONB — **la condición de disparo ya está
  persistida**, sólo falta leerla.

> ⚠️ Nota de drift para quien tome esta task: la skill `dataforseo-operator` afirma (as-of 2026-08-14)
> que "`backlinks`/`domain` siguen sin consumer". Es **incorrecto** para `backlinks`: `TASK-1304` está
> `complete` y el cron corre semanalmente. `domain` sí sigue sin consumer. Corregir esa línea de la
> skill es follow-up de esta task.

### Gap

- `anchors/live`, `referring_domains/live` y `backlinks/live` no aparecen en `src/` ni en `services/`:
  el módulo sólo usa dos de los ~15 endpoints de la familia.
- No existe ninguna tabla con el detalle nominal: no se puede responder "qué dominio se cayó".
- `toxic_share` es un proxy declarado sobre el spam score promedio; no hay lectura de
  sobre-optimización de anchors.
- `new_lost_delta` se persiste pero **ningún código lo lee** para decidir nada.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/backlinks/**` con captura en `services/ops-worker` y lectura servida desde el portal Next.js
- Future candidate home: `domain-package`
- Boundary: primitives `shouldDrillDownBacklinks` · `captureBacklinkDetail` · `readBacklinkDetail`; consumers autorizados son ops-worker (escritura), route handlers de `api/platform/**` y la tool MCP `get_seo_backlink_detail` (lectura)
- Server/browser split: transporte, secreto del proveedor y stores quedan server-only; al browser sólo viaja el DTO del reader
- Build impact: `none` — reusa transporte y cliente PostgreSQL existentes
- Extraction blocker: FK de las tablas hijas a `seo_backlink_snapshots`, que obliga a mover la serie de enlaces completa como una unidad

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: tablas nuevas `greenhouse_growth.seo_backlink_referring_domains` y `seo_backlink_anchors`, hijas de `seo_backlink_snapshots`; más `seo_provider_spend_daily`
- Consumidores afectados: `ops-worker`, `api/platform/ecosystem`, MCP, Nexa
- Runtime target: `worker` + `production`

### Contract surface

- Contrato existente a respetar: `postDataForSeoTask` con `family: 'backlinks'`, `enforceSeoRunEntitlement` con `consumesAuditAllowance: false`, el shape actual de `readBacklinkProfile` (**inmutable**), el resultado `SeoBacklinkCaptureResult` de `contracts.ts`.
- Contrato nuevo o modificado: reader `readBacklinkDetail`; command `captureBacklinkDetail`; predicado `shouldDrillDownBacklinks`; evento outbox `seo.backlink.detail_captured`; tool MCP `get_seo_backlink_detail`. `SeoBacklinkCaptureResult` gana un campo **aditivo y opcional** con el outcome del drill-down.
- Backward compatibility: `compatible` — aditivo en todos los planos.
- Full API parity: un primitive, tres lanes en la misma task.

### Data model and invariants

- Entidades/tablas/views afectadas: `seo_backlink_referring_domains` (nueva), `seo_backlink_anchors` (nueva), `seo_backlink_snapshots` (lectura y FK), `seo_provider_spend_daily` (escritura por el transporte).
- Invariantes que no se pueden romper:
  - Ambas tablas son **hijas por FK de `seo_backlink_snapshots`**, no de `seo_targets`. El detalle es la ampliación de una medición concreta; anclarlo al target lo dejaría huérfano de su `capture_date` y de su procedencia.
  - Append-only con trigger anti UPDATE/DELETE, igual que el padre.
  - Clave única `(seo_backlink_snapshot_id, normalized_referring_domain)` y `(seo_backlink_snapshot_id, anchor_text_hash)`. El hash del anchor evita una clave sobre texto libre de longitud arbitraria; el texto crudo se guarda en su columna.
  - `movement` con **CHECK de vocabulario cerrado** (`present | new | lost`): un cuarto valor debe romper el INSERT, no colarse invisible en toda lectura que agrupe por movimiento.
  - `rank` se persiste **siempre en escala 0–100** (`rank_scale: one_hundred`), coherente con el padre. Mezclar escalas produce cifras absurdas sin lanzar error.
  - Una semana sin drill-down **no es un hueco de datos**: es la afirmación "el agregado no se movió". El reader lo declara explícitamente y jamás lo presenta como cero.
  - `toxic_share` del padre **no se recalcula ni se sobrescribe**: sigue midiendo el spam score promedio del perfil. La sobre-optimización de anchors es una métrica nueva y separada.
- Write-target allowlist: si Discovery encuentra boundary test vigente en el dominio `growth/seo`, declarar ambas tablas ahí en el mismo PR. `[confirmar en Discovery]`
- Tenant/space boundary: heredado del padre vía `seo_target_id`; lectura por `organization_id` + entitlement `seo_v2`.
- Idempotency/concurrency: el drill-down se ejecuta a lo sumo una vez por snapshot; pre-check por `seo_backlink_snapshot_id` antes de pegar el proveedor, `ON CONFLICT DO NOTHING` como guardia de carrera.
- Audit/outbox/history: evento outbox por drill-down ejecutado, con el motivo del disparo; gasto en el ledger por construcción.

### Migration, backfill and rollout

- Migration posture: `additive` — dos tablas nuevas con sus FK, índices, triggers y GRANT. Cero cambios a `seo_backlink_snapshots`.
- Default state: `flag OFF` — `GROWTH_SEO_BACKLINK_DETAIL_ENABLED` default `false`. **No hay scheduler nuevo**: el drill-down es un paso dentro del batch semanal que ya corre.
- Backfill plan: sin backfill. El detalle de una semana pasada ya no es recuperable con la misma ventana del proveedor; forzarlo produciría filas fechadas con un `capture_date` que no corresponde a lo observado.
- Rollback path: flag a `false`. El batch semanal vuelve a su comportamiento actual sin tocar el cron ni redeployar.
- External coordination: declarar la env var en `services/ops-worker/deploy.sh` **y** aplicarla con `--update-env-vars`, porque `--set-env-vars` es destructivo.

### Security and access

- Auth/access gate: capability de lectura del módulo SEO (`[confirmar nombre exacto en Discovery contra src/config/entitlements-catalog.ts]`) + entitlement `seo_v2`; escritura sólo desde ops-worker con `SEO_BACKLINK_CRON_ACTOR`.
- Sensitive data posture: sin PII. Dominios y anchors son datos públicos de la web.
- Error contract: `canonicalErrorResponse` + `captureWithDomain`; degradación honesta heredada del padre (un drill-down fallido deja el snapshot `partial`, jamás fabrica filas).
- Abuse/rate-limit posture: breaker de la familia `backlinks` (aislado del de `labs` y `serp`), condición de disparo, `limit` acotado e `internal_list_limit` explícito.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`.
- DB/runtime checks: `pnpm pg:connect:migrate` + verificación por `information_schema` de ambas tablas, sus FK, CHECK de `movement`, índices únicos y triggers; live test del reader contra PG real recordando que `runGreenhousePostgresQuery` devuelve un **array pelado**.
- Integration checks: smoke real sobre un target con movimiento conocido, confirmando (a) que el drill-down disparó, (b) el `cost` real contra el estimado, (c) que un target **sin** movimiento no gastó nada.
- Reliability signals/logs: `seo.backlink.detail_drilldown_failed` (drill-down disparado que no completó; steady = 0).
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumidores nombrados con paths reales.
- [x] Invariantes, boundary de tenant e idempotencia explícitos.
- [x] Tablas nuevas declaradas en el allowlist de destinos de escritura del dominio si existe boundary test.
- [x] Postura de migración/backfill/rollback explícita.
- [x] Evidencia runtime/DB listada.
- [x] Errores canónicos, degradación honesta y cero fuga de datos sensibles.

## Capability Definition of Done — Full API Parity gate

- [x] Lógica en el primitive, no en la UI.
- [x] Modelada como command/reader sobre el snapshot, no como handler de pantalla.
- [x] Read como reader canónico; write como command con entitlement, idempotencia, outbox y errores canónicos.
- [x] Capability + grant a ≥1 rol real en el MISMO PR con coverage test verde. (Se reutiliza `growth.seo.observation.read`, ya granteada.)
- [x] Camino programático declarado: ecosystem + MCP en esta misma task.
- [x] Write apto para `propose → confirm → execute`.
- [x] Un primitive, muchos consumers.
- [x] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — La condición de disparo

- `shouldDrillDownBacklinks(snapshot, previous, config)` en `backlinks/should-drill-down.ts`: predicado
  puro, sin acceso a red ni a DB, que lee `new_lost_delta` y el delta de `referring_domains` contra el
  snapshot anterior.
- Umbrales por configuración con defaults conservadores, más una regla de **primera vez**: un target
  sin ningún drill-down previo lo dispara una vez, porque sin línea base no hay delta que medir.
- Tests de tabla: sin movimiento, movimiento bajo el umbral, movimiento sobre el umbral, primera vez,
  snapshot `partial` cuyo delta no es confiable.

### Slice 2 — Tablas hijas + writer

- Migración `additive`: `seo_backlink_referring_domains` y `seo_backlink_anchors`, ambas con FK al
  snapshot, CHECK cerrado de `movement`, claves únicas, triggers anti mutación, índices y GRANT.
- Bloque DO anti pre-up-marker que aborta si tablas, FK, CHECK, índices o triggers no quedaron creados.
- Writer compartido que persiste ambos conjuntos dentro de la misma transacción del drill-down.
- Regeneración de `src/types/db.d.ts`.

### Slice 3 — Captura del detalle

- `captureBacklinkDetail` sobre `/v3/backlinks/referring_domains/live` y `/v3/backlinks/anchors/live`,
  con `rank_scale: one_hundred`, `limit` acotado por configuración e `internal_list_limit` explícito.
- Movimiento nominal desde `/v3/backlinks/backlinks/live` filtrado por `is_new` / `is_lost`, pedido
  **sólo** cuando el delta indica que hubo movimiento en esa dirección.
- Cableado como paso del batch semanal existente en `services/ops-worker/server.ts`, detrás del flag.
- Degradación honesta: un drill-down que falla deja el snapshot `partial` y emite la señal; jamás
  fabrica filas ni marca el snapshot como completo.

### Slice 4 — Lectura de sobre-optimización de anchors

- Derivación server-side sobre `seo_backlink_anchors`: concentración del anchor dominante, proporción
  de anchors de marca contra genéricos contra exactos.
- Expuesta como métrica **nueva y separada**; `toxic_share` del padre no se toca.
- La derivación vive en el primitive, nunca en el consumer.

### Slice 5 — Reader + contrato gobernado + lanes

- `readBacklinkDetail({ organizationId, seoTargetId, captureDate })` con tres estados distinguibles:
  detalle disponible · sin drill-down porque no hubo movimiento · drill-down fallido.
- Route handler ecosystem + tool MCP `get_seo_backlink_detail` + capability con grant en el mismo PR.
- Flag con fila en el ledger.

### Slice 6 — Evidencia real, señal y cierre documental

- Smoke real sobre un target con movimiento y otro sin movimiento, adjuntando el `cost` de ambos: el
  segundo debe ser USD 0.
- Signal `seo.backlink.detail_drilldown_failed` + fila en el dashboard de reliability.
- Deltas en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §3 y §4.2, runbook, doc funcional,
  `Handoff.md`, `changelog.md`.
- Corrección del drift de la skill `dataforseo-operator` sobre el consumer de la familia `backlinks`.

## Out of Scope

- **Cualquier superficie visible.** La cara la construye una task `ui-ux` posterior.
- **Link gap contra competidores** (`backlinks/competitors`, `domain_intersection`) — pertenece a
  `TASK-1662` y `TASK-1709`. Describir un perfil y comparar dos perfiles son ejes distintos.
- **Desautorización o disavow de enlaces tóxicos.** Esta task mide; actuar sobre Google es trabajo
  manual del especialista y una decisión con consecuencias que no se automatiza acá.
- **Cambiar `toxic_share`.** Sigue midiendo lo que mide. La sobre-optimización de anchors es una
  métrica adicional, no un reemplazo.
- **Backfill del detalle histórico.** La ventana del proveedor ya pasó y fabricar filas con un
  `capture_date` que no corresponde a lo observado sería inventar historia.
- **Espejo BQ de las tablas hijas.** Se evalúa en Discovery y, si procede, se registra como follow-up.
- **Ampliar el allowlist de familias.** Los tres endpoints son `backlinks`.

## Detailed Spec

### 1. El corazón de la task es la condición de disparo, no el endpoint

Pedir `referring_domains` + `anchors` para un target cuesta del orden de USD 0,05–0,10 según el
`limit`. Para un target, cada semana, es irrelevante. Para una cartera de 40 targets, todas las
semanas, son ~USD 150–200 al año en detalle que **nadie mira cuando nada se movió**.

El dato para evitarlo ya está persistido: `new_lost_delta` del snapshot semanal. La regla:

- Si el snapshot es `partial` (el delta no llegó), **no** disparar: sin delta confiable no se puede
  decidir, y disparar "por si acaso" convierte una falla del proveedor en gasto.
- Si es la primera vez para ese target, disparar una vez: hace falta una línea base.
- Si el movimiento de dominios referentes supera el umbral configurado, disparar.
- Si no, registrar el outcome `skipped_no_movement`. **Eso es información, no un hueco**: significa
  "el perfil estuvo estable", y el reader debe poder decirlo con esas palabras.

### 2. Por qué las tablas cuelgan del snapshot y no del target

El detalle es la ampliación de **una medición concreta**, no una propiedad del target. Colgarlo del
target obligaría a duplicar `capture_date` y a resolver a mano de qué corrida vino cada fila, con el
riesgo clásico de mezclar dos semanas en la misma lectura.

Colgando del snapshot: el `capture_date`, la procedencia y el `source_run_id` se heredan por FK, el
borrado en cascada es imposible (ambas son append-only con trigger) y toda lectura por semana es un
JOIN trivial contra la fila padre que el reader ya carga.

### 3. Los tres endpoints y qué contesta cada uno

| Endpoint | Familia | Cuándo | Qué contesta |
|---|---|---|---|
| `backlinks/referring_domains/live` | `backlinks` | drill-down disparado | Quiénes te enlazan hoy, con su rank y su spam score |
| `backlinks/anchors/live` | `backlinks` | drill-down disparado | Con qué texto te enlazan — la lectura de sobre-optimización |
| `backlinks/backlinks/live` filtrado `is_new` / `is_lost` | `backlinks` | sólo si el delta indica movimiento en esa dirección | Qué enlace exacto entró o se cayó |

Costo uniforme de la familia: USD 0,024 por request + USD 0,000036 por fila. Un request lleno de 1.000
filas son USD 0,06. **Filtrar y ordenar es gratis**, así que el filtro `is_new` / `is_lost` no encarece
nada y evita traer el perfil completo cuando sólo interesa el movimiento.

⚠️ `spam_score` (de un enlace individual) y `backlinks_spam_score` (promedio del perfil) son métricas
distintas del proveedor. El padre usa la segunda para su `toxic_share`; las filas hijas guardan la
primera. Confundirlas produciría un `toxic_share` recalculado sobre otra población.

### 4. Sobre-optimización de anchors: qué mide y qué no

El proxy actual (`backlinks_spam_score / 100`) responde "¿de qué barrio vienen mis enlaces?". El perfil
de anchors responde otra pregunta: "¿parece natural cómo me enlazan?". Un sitio puede tener enlaces de
dominios impecables y un perfil de anchors artificial —el 60% de sus enlaces con el mismo texto exacto
de dinero— que es señal clásica de manipulación.

Son dos diagnósticos con dos remedios distintos: uno se arregla desautorizando, el otro diversificando
el anchor de las campañas futuras. Por eso conviven como métricas separadas y por eso `toxic_share`
**no se sobrescribe**.

La derivación (concentración del dominante, mezcla marca/genérico/exacto) vive server-side en el
primitive. Ponerla en el consumer garantizaría que la UI, Nexa y el MCP calculen tres cifras distintas
para el mismo perfil.

### 5. Tres estados, no dos

`readBacklinkDetail` distingue:

- `available` — hubo drill-down y hay filas.
- `skipped_no_movement` — no hubo drill-down **porque el perfil estuvo estable**. Es una afirmación
  positiva sobre el perfil, no una falta de datos.
- `drilldown_failed` — se intentó y falló. El snapshot padre quedó `partial` y la señal está en rojo.

Colapsar los dos últimos en "sin datos" borraría justamente la distinción que le importa al
especialista: "no pasó nada" y "no sabemos qué pasó" son conclusiones opuestas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (condición de disparo) va **primero** y es predicado puro: es la pieza que controla el gasto,
  y debe existir y estar testeada antes de que exista código capaz de gastar.
- Slice 2 (tablas) → Slice 3 (captura) → Slice 5 (reader + lanes) es la cadena obligatoria.
- Slice 4 (anchors) depende de Slice 3 y puede correr en paralelo con Slice 5.
- Slice 6 cierra al final. Sin smoke live que demuestre que un target sin movimiento gasta USD 0, esta
  task es `code complete, rollout pendiente`.
- 🔴 El flag nace apagado en Slice 3 y se prende sólo en Slice 6.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El drill-down se cablea incondicional y multiplica el costo semanal de enlaces por toda la cartera | provider budget | **high** | Slice 1 va primero como predicado puro y testeado; el paso del batch lo invoca obligatoriamente; test que afirma coste 0 sin movimiento | salto escalonado en `seo_provider_spend_daily` para `family='backlinks'` |
| Snapshot `partial` dispara el drill-down "por si acaso" y convierte una falla del proveedor en gasto | provider budget | medium | Regla explícita: `partial` no dispara; test del caso | gasto de detalle en semanas con snapshots `partial` |
| `limit` alto sin filtro trae el perfil completo cuando sólo interesaba el movimiento | provider budget | medium | `limit` por configuración, `internal_list_limit` explícito, filtros `is_new`/`is_lost` obligatorios en el endpoint de movimiento | filas por drill-down muy por encima del delta reportado |
| Escala de `rank` mezclada (0–100 del padre vs 0–1000 default) → cifras absurdas sin error | data quality | medium | `rank_scale: one_hundred` explícito en cada request, igual que el colector padre; test sobre el rango del valor persistido | `rank` de tres cifras largas en las tablas hijas |
| `spam_score` de enlace confundido con `backlinks_spam_score` del perfil al derivar toxicidad | data quality | medium | Columnas separadas y nombradas distinto; `toxic_share` del padre no se recalcula | dos cifras de toxicidad divergentes en la misma vista |
| `skipped_no_movement` renderizado como "sin datos" y el cliente cree que el módulo se rompió | credibilidad | medium | Tres estados distinguibles en el contrato del reader; la task de UI hereda el contrato | consulta del cliente sobre datos faltantes en semanas estables |
| Un drill-down fallido marca el snapshot como completo y esconde el hueco | data quality | low | Degradación honesta heredada: `partial` + señal; nunca fabricar filas | señal `detail_drilldown_failed` en 0 mientras faltan filas |
| `--set-env-vars` destructivo borra el flag y el drill-down deja de correr en silencio | worker / flags | medium | Declarar en `deploy.sh` **y** aplicar con `--update-env-vars`; verificar en la revisión activa | ausencia sostenida de filas hijas pese a deltas visibles |
| Migración registrada sin ejecutar SQL (markers invertidos) | migration | low | Bloque DO con `RAISE EXCEPTION` + verificación por `information_schema` | `migrate:status` verde con tablas inexistentes |

### Feature flags / cutover

- `GROWTH_SEO_BACKLINK_DETAIL_ENABLED` (default `false`), subordinado a `GROWTH_SEO_ENABLED`.
- **Se lee sólo en el ops-worker.** El drill-down es un paso del batch semanal que ya corre ahí; en
  Vercel el flag sería inerte y creerlo prendido porque aparece en Vercel es el fallo silencioso que
  documenta el ledger.
- **No se crea scheduler nuevo**: se reusa `ops-seo-backlink-capture` (`0 7 * * 1`, activo). Un cron
  aparte desincronizaría el detalle de su snapshot padre.
- Source of truth en Cloud Run es `services/ops-worker/deploy.sh`; declarar el flag ahí **y** aplicarlo
  con `--update-env-vars`.
- Fila obligatoria en `FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.
- Cutover: flag `true`. Revert: flag `false`, efecto inmediato, sin tocar el cron ni redeployar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR — predicado puro sin efectos | < 5 min | sí |
| Slice 2 | `pnpm migrate:down` de la migración aditiva (tablas nuevas, sin dependientes) | < 10 min | sí |
| Slice 3 | Flag a `false` — el batch semanal vuelve a su comportamiento actual | < 5 min | sí |
| Slice 4 | Revert PR — derivación de lectura, sin escritura | < 10 min | sí |
| Slice 5 | Revert PR de la ruta + retirar la tool del registro MCP | < 10 min | sí |
| Slice 6 | Retirar la señal del registry | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` + verificar por `information_schema` ambas tablas, sus FK al snapshot, el CHECK de
   `movement`, los índices únicos y los triggers.
2. Deploy del worker con flag `false`; confirmar que el job `ops-seo-backlink-capture` sigue verde y
   que el snapshot semanal no cambió de shape.
3. Prender el flag en la revisión activa del ops-worker y verificarlo **en la revisión activa**.
4. Disparar `/seo/backlinks/capture-batch` a mano sobre un target **con** movimiento conocido:
   confirmar filas hijas y comparar `cost` contra el estimado.
5. Disparar sobre un target **sin** movimiento: confirmar outcome `skipped_no_movement` y **USD 0** en
   el ledger.
6. Confirmar que `readBacklinkProfile` devuelve exactamente el mismo shape que antes del cambio.
7. Esperar el ciclo semanal real y confirmar que la señal queda en 0.

### Out-of-band coordination required

- Declarar y aplicar la env var del flag en el servicio Cloud Run del ops-worker.
- Confirmar con el operador los umbrales de la condición de disparo y el `limit` por drill-down: entre
  los dos fijan el costo anual de esta capacidad.
- Sin cambios en Cloud Scheduler: se reusa el job existente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `shouldDrillDownBacklinks` es un predicado puro sin acceso a red ni DB, con tests de tabla sobre los cinco casos: sin movimiento, bajo umbral, sobre umbral, primera vez y snapshot `partial`.
- [x] Un snapshot `partial` **no** dispara drill-down.
- [x] La migración crea ambas tablas con FK a `seo_backlink_snapshots`, CHECK cerrado de `movement`, claves únicas, triggers anti UPDATE/DELETE y GRANT; el bloque DO aborta si algo no quedó creado.
- [ ] Un target sin movimiento registra **USD 0** en `seo_provider_spend_daily`, verificado en el smoke real y no sólo con mocks. *(No pudo producirse en el smoke del 2026-08-27 — ambos targets eran `first_time`; cubierto por tests de tabla del predicado puro. **Diferido por decisión del operador (2026-08-27) al follow-up F1**: se observa en el primer ciclo natural del lunes 2026-08-31 con la receta del Delta (3). Precedente del patrón: TASK-1775 cerró con su criterio de fila NULL igualmente diferido a observación natural.)*
- [x] Un target con movimiento deja filas en ambas tablas hijas y su `cost` real coincide con el estimado dentro del margen declarado. *(Smoke 2026-08-27: 225 referring domains + 86 anchors; USD 0.1818 real vs ~0.19 estimado.)*
- [x] Todo `rank` persistido está en escala 0–100.
- [x] `spam_score` de enlace y `backlinks_spam_score` de perfil viven en columnas distintas y `toxic_share` del padre no se recalcula.
- [x] `readBacklinkDetail` distingue `available`, `skipped_no_movement` y `drilldown_failed` como estados separados.
- [x] `readBacklinkProfile` devuelve exactamente el mismo shape que antes de esta task, probado con test de regresión.
- [x] Un drill-down fallido deja veredicto `failed`, emite la señal y no fabrica filas. (El snapshot padre es append-only y no muta; el veredicto persistido es lo que lo declara.)
- [x] La derivación de sobre-optimización de anchors vive en el primitive, no en ningún consumer.
- [x] La tool `get_seo_backlink_detail` responde por el lane ecosystem con canary verde en staging. *(Smoke 2026-08-27: `state=available`, `capturedAt=2026-08-24`.)*
- [x] Cierre operativo: pase develop→main con los lanes en producción + deploy del gateway con la federación de `TASK-1658` (dueña) verificado con `tools/list` 13→21. *(2026-08-27: release `cc73c74789ce` → lanes en producción; gateway `efeonce-mcp-gateway-00023-zt2` desplegado; `tools/list` autenticado observado: **21 tools SEO** — `get_seo_backlink_detail` incluida. Lo único que mantiene la task abierta es el criterio del predicado de movimiento, lunes 2026-08-31.)*
- [x] La capability tiene grant a ≥1 rol real en el mismo PR y el coverage test pasa.
- [x] El flag tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` y `pnpm docs:closure-check` pasa.
- [x] No se creó ningún Cloud Scheduler job nuevo.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (gate de cierre; pedir autorización al operador antes de correrlo)
- `pnpm migrate:status` + verificación por `information_schema`
- Live test del reader contra PG real vía proxy
- Smoke real contra DataForSEO con un target con movimiento y otro sin movimiento

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` quedó sincronizado con el cierre
- [x] `Handoff.md` quedó actualizado
- [x] `changelog.md` quedó actualizado
- [x] se ejecutó chequeo de impacto cruzado sobre `TASK-1662`, `TASK-1709`, `TASK-1314` y `TASK-1775` (deltas dejados el 2026-08-27 durante la implementación)
- [x] delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §3 y §4.2
- [x] runbook `docs/manual-de-uso/growth/operar-perfil-de-enlaces-seo.md` creado
- [x] doc funcional del módulo actualizada
- [x] corregida la línea de la skill `dataforseo-operator` que afirma que la familia `backlinks` no tiene consumer

## Follow-ups

- **F1 (con fecha, dueño: operador/primera sesión del lunes 2026-08-31):** verificar el primer
  ciclo natural con el flag ON — targets sin movimiento deben salir `skipped_no_movement` con
  `provider_cost_usd = 0` (query lista en el Delta (3); cross-check `seo_provider_spend_daily`).
  Si aparece `drilled` sin movimiento: abrir `ISSUE-###`, apagar `GROWTH_SEO_BACKLINK_DETAIL_ENABLED`
  (rollback <5 min declarado en el runbook) y corregir `shouldDrillDownBacklinks` con sus tests
  de tabla como red. Exposición si se ignora: ~USD 0.18/semana.
- Task `ui-ux` que dibuje el detalle de enlaces con sus tres estados y el perfil de anchors.
- Evaluar el espejo BQ de las tablas hijas si el histórico caliente en PostgreSQL crece por encima de la ventana declarada.
- Evaluar `timeseries_new_lost_summary` para la línea de tiempo larga del perfil, que el proveedor sirve desde 2019 y hoy no se usa.
- Evaluar si la lectura de sobre-optimización de anchors debería alimentar una señal de reliability propia cuando cruza un umbral crítico.

## Open Questions

- ¿Cuáles son los umbrales de la condición de disparo? Requiere decisión del operador junto con el `limit` por drill-down: entre ambos fijan el costo anual.
- ¿El detalle debe espejarse a BigQuery como el snapshot padre, o basta el agregado para el histórico largo?
- ¿La regla de "primera vez" debe aplicar a todos los targets activos al prender el flag, lo que dispararía un gasto inicial proporcional a la cartera, o escalonarse por semanas?
