# TASK-1312 — Growth SEO: Topic Cluster Entity + Rollup

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
- Backend impact: `migration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|data`
- Blocked by: `TASK-1299`
- Branch: `task/TASK-1312-growth-seo-topic-cluster-entity-rollup`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formaliza el **Topic Cluster como entidad de primera clase** del módulo SEO: `seo_topic_clusters` (un cluster nombrado por tema, per target/org) + `seo_topic_cluster_members` (membership **append-only** de URLs + refs a keyword sets, con `effective_from`/`effective_to`). Hoy el primitive más cercano es `seo_keyword_sets` + `tags[]` (TASK-1299) — un bundle de keywords, no una entidad temática que agrupe también URLs y se pueda hacer roll-up. Esta task da al cluster identidad propia (agrupa URLs **y** keyword sets bajo un tema) y expone `readTopicClusterRollup(clusterId)`: reader que **agrega las métricas SEO** del cluster (rank/gsc: avg position, top-3/top-10, clicks/impresiones sobre el set de URLs+keywords del cluster) + un **hook para el eje AEO** (consumido por TASK-1313 para el 360 granular por-cluster). Migración **additive** con marker `-- Up Migration` + DO-block de verificación post-DDL + GRANTs, espejo del patrón de TASK-1299; **anti-mutation solo donde aplica** (la membership es append-only: nunca DELETE de una URL del cluster, se cierra con `effective_to`). Cero cruce de tablas SEO↔AEO (§1.1): el rollup SEO es sobre `seo_*`; el eje AEO es un hook que TASK-1313 resuelve por `org + url` en un derived read, no un JOIN acá.

## Why This Task Exists

§15 del doc maestro sube la resolución del 360 de **marca → página/cluster**: para un cluster temático completo el sistema debe responder, en el tiempo, *qué keywords rankea, avg position, clicks, qué grounded queries lo cita la IA, en qué motores y citation share* — el diferenciador más fuerte del producto. Ese roll-up necesita que el cluster **sea una entidad**: sin `seo_topic_clusters` no hay un `clusterId` estable al cual atribuir URLs+keywords ni sobre el cual agregar la serie temporal, y `readClusterVisibility360(clusterId)` (TASK-1313) no tiene de dónde leer el set del cluster. El `seo_keyword_sets` + `tags[]` de TASK-1299 agrupa keywords sueltas, pero un topic cluster es más: agrupa **URLs** (las landings del tema) **y** keyword sets bajo un tema nombrado, con historia de membership (una URL entra/sale del cluster sin borrar el hecho). Esta task fija esa entidad + su rollup SEO como fundación backend-data, para que TASK-1313 construya el 360 granular por-cluster encima sin re-decidir el modelo del cluster.

## Goal

- `greenhouse_growth.seo_topic_clusters` (per target/org: `name`, `theme`, `status`, `created_by`) + `seo_topic_cluster_members` (append-only: URLs + `keyword_set_id` refs + `role` `pillar`|`supporting` + `effective_from`/`effective_to`) como entidad de primera clase (la pillar page = el hub del cluster; un único pillar activo por cluster).
- Membership append-only: una URL/keyword-set entra con `effective_from`, sale con `effective_to`; NUNCA DELETE (espejo de `seo_keyword_set_members`/`seo_competitors`).
- `readTopicClusterRollup(clusterId)`: agrega métricas SEO (rank/gsc) del set del cluster + hook para el eje AEO (TASK-1313).
- Migración additive con marker `-- Up Migration` + DO-block de verificación + GRANTs runtime; `db.d.ts` regenerado + verificado contra PG.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — **§15 (Granularidad URL / Topic Cluster — fuente de verdad: "`seo_topic_clusters` como entidad de primera clase + rollup; hoy el primitive más cercano es `seo_keyword_sets` + `tags[]`")**, §4 (modelo de datos `greenhouse_growth`: config mutable + membership append-only con `effective_from/to`), §4.1 (config), §5 (métricas derivadas del rollup — visibility, top-3/top-10), §1.1 (boundary duro).
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — node-pg-migrate, markers, ownership, Kysely.
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — `Cliente` → `greenhouse_core.organizations` como ancla per-org (el cluster cuelga del target, que cuelga de la org).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — convenciones del dominio `growth` (append-only, anti-mutation triggers, sequence-based public IDs).
- `CLAUDE.md §"Database — Migration markers"` + `§"Database — SQL embebido"` — marker `-- Up Migration` exacto + DO-block RAISE EXCEPTION; validar el SQL del rollup contra PG real.

Reglas obligatorias (§15 + §4 + §1.1 — load-bearing):

- **Membership append-only.** `seo_topic_cluster_members` NUNCA se DELETE: una URL o keyword set sale del cluster cerrando `effective_to` (término, no borrado), espejo de `seo_keyword_set_members`/`seo_competitors`. El cluster mismo (`seo_topic_clusters`) es config mutable current (se puede renombrar/archivar), NO append-only — anti-mutation trigger SOLO en la tabla de membership si el patrón del dominio lo usa allí [verificar el patrón exacto en TASK-1299: membership con effective_from/to suele NO llevar anti-mutation trigger, solo el "no DELETE" por convención; confirmar en Discovery].
- **Boundary duro contra AEO.** Cero FK desde `seo_topic_clusters`/`seo_topic_cluster_members` hacia `grader_*`/`provider_observations`. El eje AEO del cluster NO se materializa acá: es un **hook** que TASK-1313 resuelve por `org + url` en un derived read. El `readTopicClusterRollup` de esta task agrega SOLO métricas SEO (`seo_*`); si expone un placeholder AEO, es un slot vacío para que TASK-1313 lo llene, nunca un JOIN a `grader_*`.
- **Boundary duro contra Payroll/Finance.** Cero referencia/escritura a payroll/finance/compensación.
- **Migration markers.** `-- Up Migration` exacto + DO-block anti pre-up-marker con RAISE EXCEPTION que aborta si falta una tabla/constraint; Down solo DROP (cero CREATE bajo `-- Down Migration`).
- **Ownership.** `greenhouse_ops` dueño; GRANT read/write a `greenhouse_runtime`.
- **Anclaje per-org vía target.** `seo_topic_clusters.seo_target_id` FK a `seo_targets` (TASK-1299), que ancla a `greenhouse_core.organizations`. El cluster NO ancla a la org directo si el target ya lo hace [verificar el grain: target vs org directo — §15 dice "per target"].

## Normative Docs

- `migrations/<ts>_task-1299-growth-seo-schema.sql` (TASK-1299, pendiente de merge) — patrón de las tablas SEO: `seo_targets`, `seo_keyword_sets`, `seo_keyword_set_members` (membership append-only con `effective_from/to`), `seo_competitors`. Esta task **replica ese patrón** para clusters; NO re-decide el modelo de config del dominio. [verificar contra el DDL real cuando TASK-1299 esté merged].
- `migrations/20260624125140219_task-1226-greenhouse-growth-schema.sql` — patrón del schema `growth`: sequence-based public IDs, anti-mutation triggers (`block_observation_mutation`), `touch_updated_at` [referencia de convención].
- `migrations/20260628203847129_task-1282-search-console-connections.sql` — patrón additive del dominio growth con marker + DO-block + GRANTs [referencia].
- `src/lib/growth/seo/**` (post TASK-1303) — `readRankSnapshotLatest`/`readRankEvolution` sobre `seo_rank_snapshots`; el rollup SEO del cluster **reusa** esos readers/queries sobre el set de URLs+keywords del cluster, NO queryea `seo_rank_snapshots` crudo en paralelo si ya hay reader. [verificar readers disponibles].
- `src/lib/postgres/client.ts` — conexión canónica; `pnpm db:generate-types` para regenerar Kysely.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §5 — métricas derivadas (visibility score, top-3/top-10) que el rollup agrega a nivel cluster.

## Dependencies & Impact

### Depends on

- `TASK-1299` — schema/foundation SEO: `seo_targets` (FK del cluster), `seo_keyword_sets` (ref del member), `seo_rank_snapshots`/`seo_gsc_daily` (fuente del rollup SEO), y el patrón de membership append-only a replicar. **Bloqueador duro** (sin `seo_targets` no hay a qué FK-ear el cluster; sin snapshots no hay rollup real).
- `greenhouse_core.organizations` (org canónica) como ancla transitiva vía `seo_targets`.
- `TASK-1301` — capability `growth.seo.target.configure` (write gobernado de config: targets/keywords/competitors → **clusters**) + `growth.seo.observation.read` (read del rollup). El cluster es config, así que su write cabe bajo `target.configure` (touch-it); el rollup cae bajo `observation.read`. Implícito (lo consumen los primitives) [verificar seed].

### Blocks / Impacts

- Bloquea `TASK-1313` (`readClusterVisibility360(clusterId)`) — consume la entidad cluster + su rollup SEO + el hook AEO.
- Impacta el modelo dimensional analítico downstream (BQ mirror del rollup si se materializa — fuera de scope de esta task).

### Files owned

- `migrations/<ts>_task-1312-growth-seo-topic-clusters.sql` [nuevo]
- `src/types/db.d.ts` [regenerado — additive]
- `src/lib/growth/seo/clusters/read-topic-cluster-rollup.ts` [nuevo — `readTopicClusterRollup`] [verificar carpeta `clusters/` en Discovery]
- `src/lib/growth/seo/contracts.ts` [extendido — `TopicClusterRollupResult`, tipos de cluster/member]
- `src/lib/growth/seo/clusters/__tests__/read-topic-cluster-rollup.test.ts` [nuevo]

## Current Repo State

### Already exists

- (Post TASK-1299) Schema SEO: `seo_targets`, `seo_keyword_sets`, `seo_keyword_set_members` (membership append-only con `effective_from/to`), `seo_competitors`, `seo_rank_snapshots`, `seo_gsc_daily`. Convención de dominio growth: append-only, membership versionada, anti-mutation triggers, sequence-based public IDs, FK a org canónica.
- (Post TASK-1303) Readers de rank: `readRankSnapshotLatest`/`readRankEvolution` sobre `seo_rank_snapshots`.

### Gap

- **Cero entidad de cluster.** No hay `seo_topic_clusters` ni `seo_topic_cluster_members`. `seo_keyword_sets` + `tags[]` agrupa keywords sueltas, pero no existe una entidad temática que agrupe **URLs** (las landings del tema) **y** keyword sets bajo un `clusterId` estable, con historia de membership. Sin ella, no hay roll-up por cluster ni un ancla para el 360 granular por-cluster de TASK-1313.
- Cero `readTopicClusterRollup`: nadie agrega la serie SEO del set de un cluster ni deja el hook AEO para el cruce granular.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration` (2 tablas nuevas + índices + GRANTs; + un reader de rollup aditivo).
- Source of truth afectado: nuevas tablas `greenhouse_growth.seo_topic_clusters` (config mutable current, SoT del cluster) + `seo_topic_cluster_members` (membership append-only, SoT del set del cluster). El rollup NO es SoT: agrega on-read desde `seo_rank_snapshots`/`seo_gsc_daily`.
- Consumidores afectados: `readClusterVisibility360` (TASK-1313), readers/UI SEO granular (follow-up), Nexa/MCP.
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: convenciones de schema `growth` (append-only membership, ownership `greenhouse_ops`, FK a `seo_targets`→org), patrón `seo_keyword_set_members`/`seo_competitors` (membership `effective_from/to`), readers de rank (TASK-1303), boundary §1.1.
- Contrato nuevo o modificado: 2 tablas + índices + (membership append-only). Reader `readTopicClusterRollup(clusterId)` → `{ ok: true, cluster, seoRollup: { keywords, avgPosition, top3, top10, clicks?, impressions? }, aeoHook } | { ok: false, errorCode: 'no_cluster'|'no_seo_data'|'disabled'|'forbidden'|'query_failed', status }`. Write de cluster/membership = command gobernado bajo `growth.seo.target.configure` (touch-it) [el command puede vivir en TASK-1301 o declararse follow-up; ver Capability DoD].
- Backward compatibility: `additive` (2 tablas nuevas + reader additive; cero impacto en tablas/consumers existentes). Gated por `GROWTH_SEO_ENABLED` a nivel feature.
- Full API parity: cluster = config gobernada por command bajo `growth.seo.target.configure`; rollup = reader canónico bajo `growth.seo.observation.read` (un primitive, muchos consumers). Ver `## Capability Definition of Done`.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_topic_clusters` (`cluster_id` PK, `public_id` sequence, `seo_target_id` FK, `name`, `theme`, `status`, `created_by`, `created_at`, `updated_at`), `greenhouse_growth.seo_topic_cluster_members` (`member_id` PK, `cluster_id` FK, `url` NULLABLE, `keyword_set_id` FK NULLABLE, `role` TEXT NOT NULL DEFAULT `supporting` CHECK `role IN ('pillar','supporting')`, `effective_from`, `effective_to` NULLABLE, `created_at`; CHECK que al menos uno de `url`/`keyword_set_id` esté presente; índice único parcial `WHERE role='pillar' AND effective_to IS NULL` = un solo pillar activo por cluster).
- Invariantes que no se pueden romper:
  - **Membership append-only:** `seo_topic_cluster_members` NUNCA DELETE; una URL/keyword-set sale cerrando `effective_to` (término). Espejo de `seo_keyword_set_members`.
  - **Cluster per-target:** `seo_topic_clusters.seo_target_id` FK a `seo_targets`; UNIQUE lógico `(seo_target_id, name)` [verificar] — no dos clusters con el mismo nombre en el mismo target activo.
  - **Un solo pillar activo por cluster:** índice único parcial `WHERE role='pillar' AND effective_to IS NULL`. Un cluster tiene exactamente una pillar page (el hub); las demás URLs son `supporting`. La pillar se reasigna cerrando el member pillar viejo (`effective_to`) y abriendo el nuevo con `role='pillar'` (append-only, sin DELETE).
  - **Cero FK cross-motor:** cero FK/columna que apunte a `grader_*`/`provider_observations`. El eje AEO es un hook resuelto por TASK-1313, no una relación de schema.
  - **Rollup on-read, no materializado:** `readTopicClusterRollup` agrega desde `seo_rank_snapshots`/`seo_gsc_daily` en memoria/SQL; NO se crea una tabla `seo_topic_cluster_rollup_snapshots` en esta task.
  - **`status` acotado por CHECK** (`active|archived` [verificar enum]).
  - Cero payroll/finance.
- Tenant/space boundary: el cluster hereda la org vía `seo_target_id → seo_targets.organization_id`; los reads derivan `organization_id` server-side. Un caller sin acceso al target no ve sus clusters.
- Idempotency/concurrency: a nivel schema, UNIQUE lógico del cluster + de la membership abierta evita duplicados; el UPSERT vive en el command de config (TASK-1301/follow-up), acá solo el constraint. El reader es read-only.
- Audit/outbox/history: la membership append-only con `effective_from/to` ES el historial del cluster; sin outbox nuevo en esta task (el command de config lo agrega si aplica).

### Migration, backfill and rollout

- Migration posture: `additive` (2 tablas + índices + triggers `touch_updated_at`/membership según patrón + GRANTs; marker + DO-block).
- Default state: `read-only`/inerte — el schema existe pero ninguna feature lo consume hasta que el command de cluster (TASK-1301/follow-up) y TASK-1313 aterricen. Gated por `GROWTH_SEO_ENABLED`.
- Backfill plan: N/A (feature nueva, sin datos legacy de clusters).
- Rollback path: reverse migration (`DROP` de las 2 tablas — sin filas de producción todavía) + revert PR.
- External coordination: ninguna (solo DDL en `greenhouse-pg-dev`, que dev/staging comparten; sin secret, sin provider, sin cron).

### Security and access

- Auth/access gate: a nivel schema N/A; el gate vive en el command de config (`growth.seo.target.configure`) y en el reader (`growth.seo.observation.read`), per-org vía `module_assignments`.
- Sensitive data posture: sin PII, sin secretos, sin finance. Solo config SEO (nombres de tema + URLs) + métricas de rollup.
- Error contract: N/A a nivel DDL (verificación con RAISE EXCEPTION en el DO-block). El reader usa `{ ok: false, errorCode, status }` canónico + `captureWithDomain('growth', ...)`, NUNCA raw error al cliente.
- Abuse/rate-limit posture: N/A a nivel schema (el rollup lee snapshots ya materializados; sin call a provider externo — no gasta cuota DataForSEO).

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` verdes tras regenerar `db.d.ts`; unit tests del rollup (agregación correcta del set del cluster: avg position/top-3/top-10 sobre URLs+keywords miembros; membership vigente respetada — solo miembros con `effective_to IS NULL OR effective_to > now`), de la degradación (`no_cluster`, `no_seo_data`), y del hook AEO vacío (no JOIN a `grader_*`).
- DB/runtime checks: `pnpm migrate:up` + verificación con SELECT contra `information_schema.tables`/`.columns`/`pg_constraint`/`pg_trigger` de que las 2 tablas, FKs, UNIQUE, CHECK y (si aplica) trigger existen; el DO-block aborta si falta algún objeto. Smoke de "no DELETE de membership" (cerrar con `effective_to` en vez de borrar). Validar el SQL del rollup contra PG real (gate TASK-893; `capture_date`=DATE, `effective_from/to`=DATE, `created_at`=TIMESTAMPTZ).
- Integration checks: N/A (sin provider externo).
- Reliability signals/logs: N/A a nivel schema; log del path de degradación del reader.
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

Esta task introduce schema + un reader de rollup, y **toca capabilities existentes** de TASK-1301 (`growth.seo.target.configure` para el write del cluster/membership; `growth.seo.observation.read` para el rollup). Aplica el gate con regla *touch-it/fix-it*:

- [ ] **Lógica en el primitive, no en la UI.** La agregación del rollup vive en `readTopicClusterRollup` (`src/lib/growth/seo/**`), NUNCA en un componente. El write de cluster/membership vive en un command gobernado (bajo `growth.seo.target.configure`), NUNCA como INSERT inline desde una pantalla.
- [ ] **Modelada como entidad/aggregate + reader**, no como click-handler. El cluster es un aggregate de config; el rollup es un reader.
- [ ] **Read** (`readTopicClusterRollup`) expuesto como reader canónico con shape estable (`{ ok }`). **Write** de cluster/membership como command con authorization fina (`growth.seo.target.configure`), append-only en membership, errores canónicos. **Deuda declarada:** esta task se enfoca en el schema + el reader; el command de autoría del cluster puede vivir en TASK-1301 (config authoring) o declararse como follow-up explícito — NO dejar el write como INSERT ad-hoc sin command.
- [ ] **Capability + grant:** reusa `growth.seo.target.configure` (write) + `growth.seo.observation.read` (read), ambas seedeadas por TASK-1301 [verificar]; NO introduce capability nueva. Si el command de cluster necesita un grain distinto, evaluarlo contra el catálogo antes de crear una capability.
- [ ] **Camino programático declarado:** reader consumible por TASK-1313 + Nexa + MCP; el 360 por-cluster es un consumer, no el SoT del rollup.
- [ ] **`propose → confirm → execute`:** el write de cluster/membership (config) es apto para el runtime de acción gobernada (Nexa propone crear/editar cluster → humano confirma → command ejecuta).
- [ ] **Un primitive, muchos consumers:** cero lógica de rollup duplicada por consumer.
- [ ] **Parity check = SÍ:** cluster (config, command gobernado) + rollup (reader por-org) tienen contrato gobernado → todos los consumers los operan por construcción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Topic cluster entity (migration)

- `seo_topic_clusters` (`cluster_id` PK + `public_id` sequence, `seo_target_id` FK a `seo_targets`, `name`, `theme`, `status` CHECK, `created_by`, `created_at`, `updated_at` + `touch_updated_at` trigger; UNIQUE lógico `(seo_target_id, name)` [verificar]).
- `seo_topic_cluster_members` (`member_id` PK, `cluster_id` FK, `url` NULLABLE, `keyword_set_id` FK NULLABLE a `seo_keyword_sets`, `effective_from`, `effective_to` NULLABLE, `created_at`; CHECK `url IS NOT NULL OR keyword_set_id IS NOT NULL`; membership append-only — sin DELETE por convención, espejo de `seo_keyword_set_members`).
- Índices (`seo_topic_clusters(seo_target_id)`, `seo_topic_cluster_members(cluster_id)`, índice de membership vigente). GRANTs read/write a `greenhouse_runtime`. Marker `-- Up Migration` + DO-block de verificación post-DDL + Down solo DROP. Regenerar `db.d.ts`.

### Slice 2 — `readTopicClusterRollup(clusterId)`

- `TopicClusterRollupResult` + tipos de cluster/member en `src/lib/growth/seo/contracts.ts`.
- `readTopicClusterRollup(clusterId)`:
  1. Resolver `clusterId → cluster → seo_target_id → organization_id` server-side + validar `growth.seo.observation.read`. Cluster inexistente → `{ ok: false, errorCode: 'no_cluster' }`.
  2. Resolver la **membership vigente** del cluster (miembros con `effective_to IS NULL OR effective_to > CURRENT_DATE`): el set de URLs + los keyword sets → sus keywords.
  3. **Rollup SEO:** agregar sobre ese set desde `seo_rank_snapshots`/`seo_gsc_daily` (reusando los readers de rank de TASK-1303, no query crudo paralelo): avg position, top-3/top-10, clicks/impresiones si GSC disponible. Set sin snapshots → `no_seo_data` honesto (no ceros).
  4. **Hook AEO:** exponer un slot `aeoHook` (el set de URLs del cluster + su org) que TASK-1313 consume para atribuir citas por-URL — SIN JOIN a `grader_*` en esta task.
- Tests: rollup correcto sobre membership vigente (miembros cerrados por `effective_to` excluidos), degradación (`no_cluster`, `no_seo_data`), hook AEO no toca `grader_*`, gate + tenant boundary.

## Out of Scope

- El cruce SEO↔AEO por-cluster / quadrant granular / `readClusterVisibility360` (TASK-1313) — esta task deja el hook, no lo cruza.
- La atribución de citas AEO por-URL (`readUrlCitationAttribution`, TASK-1311).
- Materializar el rollup (`seo_topic_cluster_rollup_snapshots`) — es on-read por diseño.
- El command de autoría del cluster si se decide ubicarlo en TASK-1301 (config authoring) — declararlo como follow-up si no cabe acá; pero NUNCA dejar el write como INSERT inline sin command.
- Cualquier UI (vista granular por cluster — follow-up ui-ux posterior).
- BQ mart/mirror del rollup.
- Rank capture / GSC materialization — dependencias (TASK-1303/1302), no scope.

## Detailed Spec

Ver el modelo en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15 (topic cluster como entidad de primera clase + rollup), §4 (config mutable + membership append-only) y §5 (métricas del rollup). Puntos load-bearing:

- **El cluster es una entidad, no un `tags[]`.** El error de modelado a evitar es tratar el cluster como otro `seo_keyword_sets` o como un array de tags: un topic cluster agrupa **URLs** (las landings del tema) **y** keyword sets bajo un `clusterId` estable, con historia de membership. Ese `clusterId` es el ancla que TASK-1313 necesita para el 360 por-cluster.
- **Membership append-only, cluster mutable.** La membership (`seo_topic_cluster_members`) es append-only con `effective_from/to` — una URL sale del cluster cerrando `effective_to`, NUNCA con DELETE (espejo de `seo_keyword_set_members`/`seo_competitors`). El cluster mismo (`seo_topic_clusters`) es config current mutable (rename/archive). No confundir los dos regímenes.
- **Rollup on-read, reusando readers.** `readTopicClusterRollup` agrega la serie SEO del set del cluster reusando `readRankSnapshotLatest`/`readRankEvolution` (TASK-1303) sobre las URLs+keywords de la membership vigente; NO queryea `seo_rank_snapshots` crudo en paralelo si ya hay reader, y NO materializa el rollup. Cualquier SQL propio se valida contra PG real (gate TASK-893).
- **Boundary intacto — el AEO es un hook, no un JOIN.** El eje AEO del cluster NO se resuelve acá: `readTopicClusterRollup` deja un `aeoHook` (set de URLs + org) que TASK-1313 usa para el derived read por `org + url` contra la atribución de citas (TASK-1311). Cero FK, cero JOIN, cero materialización cross-motor en esta task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema: `seo_topic_clusters` → `seo_topic_cluster_members` FK) → Slice 2 (reader que lee esas tablas + los snapshots). El reader depende del schema de Slice 1. Ambas tablas en una migración additive ordenada (cluster → members).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Marker invertido → sección Up vacía, tablas nunca creadas | data | medium | marker `-- Up Migration` exacto + DO-block RAISE EXCEPTION que aborta si falta una tabla/constraint | migración falla loud |
| Modelar el cluster como `tags[]`/keyword_set en vez de entidad con URLs+membership | growth | medium | §15 + este spec: entidad de primera clase con membership append-only de URLs+keyword sets; review | code review |
| FK accidental a `grader_*` rompe el boundary §1.1 | growth | low | regla dura: cero FK cross-motor; el AEO es un hook resuelto por TASK-1313 | code review |
| DELETE de membership corrompe la historia del cluster | data | low | membership append-only (`effective_to`), espejo `seo_keyword_set_members`; test "no DELETE, cerrar con effective_to" | review + test |
| Rollup incluye miembros ya cerrados (`effective_to` pasado) | data | medium | filtro de membership vigente (`effective_to IS NULL OR > now`) en el reader; test dedicado | test |
| Tipo DATE vs TIMESTAMP mal declarado (bug class EXTRACT) | data | medium | `effective_from/to`=DATE; `created_at`/`updated_at`=TIMESTAMPTZ; verificar `information_schema` + validar SQL rollup contra PG real | smoke query + Sentry |

### Feature flags / cutover

- Sin flag propio a nivel schema (inerte). El módulo se gatea con `GROWTH_SEO_ENABLED` en las tasks que lo consumen (el command de cluster + TASK-1313). El schema puede existir sin que ninguna feature lo lea.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (schema) | reverse migration (DROP `seo_topic_cluster_members`, `seo_topic_clusters`) + revert PR | <5 min | si (sin filas prod) |
| Slice 2 (reader) | revert PR (reader read-only, sin efecto persistente) | <5 min | si |

### Production verification sequence

1. `pnpm migrate:up` en staging (dev/staging comparten `greenhouse-pg-dev`) → el DO-block confirma las 2 tablas + FKs + UNIQUE + CHECK + trigger.
2. SELECT contra `information_schema.columns` verificando `effective_from`/`effective_to` = DATE y `created_at`/`updated_at` = TIMESTAMPTZ; `pg_constraint` para el CHECK `url IS NOT NULL OR keyword_set_id IS NOT NULL`.
3. Insertar un cluster de prueba + 2 miembros (1 URL, 1 keyword_set), cerrar 1 con `effective_to` → verificar que sigue en la tabla (no DELETE) y que el reader lo excluye del rollup vigente. Borrar el cluster de prueba.
4. Ejercer `readTopicClusterRollup(clusterId)` sobre un cluster con snapshots → rollup SEO correcto (avg position/top-3/top-10 sobre la membership vigente) + `aeoHook` presente sin tocar `grader_*`.
5. `readTopicClusterRollup` sobre un cluster sin snapshots → `{ ok: false, errorCode: 'no_seo_data' }`; sobre un clusterId inexistente → `no_cluster`.
6. Regenerar `db.d.ts` + `pnpm typecheck` verde.
7. Prod vía release control plane (migración additive) cuando EPIC-022 se secuencie.

### Out-of-band coordination required

- Ninguna (solo DDL en la instancia compartida dev/staging; sin secret, sin provider, sin consent). Coordinar con TASK-1299 (dependencia de `seo_targets`/`seo_keyword_sets`) y con TASK-1301 (dónde vive el command de autoría del cluster: config authoring vs follow-up).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `seo_topic_clusters` + `seo_topic_cluster_members` creadas en `greenhouse_growth`, ancladas per-target (`seo_target_id` FK a `seo_targets`), con `public_id` sequence + `status` CHECK + `touch_updated_at`.
- [ ] Membership append-only: `seo_topic_cluster_members` con `effective_from`/`effective_to` (DATE), CHECK `url IS NOT NULL OR keyword_set_id IS NOT NULL`; una URL/keyword-set sale cerrando `effective_to`, NUNCA con DELETE (espejo de `seo_keyword_set_members`; verificado por smoke).
- [ ] Migración additive con marker `-- Up Migration` + DO-block que aborta si falta cualquier tabla/constraint/trigger; Down solo DROP (cero CREATE bajo `-- Down Migration`).
- [ ] Boundary: cero FK a `grader_*`/`provider_observations`, payroll o finance; el eje AEO es un `aeoHook` (set URLs+org), no un JOIN.
- [ ] `readTopicClusterRollup(clusterId)` existe en `src/lib/growth/seo/**`, gateado por `growth.seo.observation.read`, con shape `{ ok: true, cluster, seoRollup, aeoHook } | { ok: false, errorCode, status }`; agrega SOLO la membership **vigente** (miembros cerrados por `effective_to` excluidos), reusando los readers de rank (TASK-1303).
- [ ] Rollup on-read (no materializado): cero tabla `seo_topic_cluster_rollup_snapshots`.
- [ ] Degradación honesta: cluster inexistente → `no_cluster`; set sin snapshots → `no_seo_data`; NUNCA ceros fantasma.
- [ ] Tenant boundary: `clusterId → seo_target_id → organization_id` server-side; sin fuga de clusters/rollups de orgs ajenas.
- [ ] `capture_date`/`effective_from`/`effective_to` = DATE, `created_at`/`updated_at` = TIMESTAMPTZ (verificado en `information_schema`); SQL del rollup validado contra PG real (gate TASK-893).
- [ ] GRANT read/write a `greenhouse_runtime`; ownership `greenhouse_ops`.
- [ ] `db.d.ts` regenerado; `pnpm typecheck` + `pnpm lint` + `pnpm test` verdes.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm migrate:up` en staging + verificación SQL contra `information_schema`/`pg_constraint`/`pg_trigger` (tablas, FKs, UNIQUE, CHECK, trigger) + smoke de membership append-only (cerrar con `effective_to`, no DELETE).
- Ejercer `readTopicClusterRollup` en staging sobre un cluster con snapshots (rollup correcto + membership vigente respetada + `aeoHook` sin tocar `grader_*`), uno sin snapshots (`no_seo_data`) y un id inexistente (`no_cluster`).

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1313 `readClusterVisibility360` consume la entidad cluster + rollup)
- [ ] documentación técnica del topic cluster + rollup (arch doc §15 + §4)

## Follow-ups

- `TASK-1313` — Unified Page/Cluster Visibility 360 read (`readClusterVisibility360(clusterId)` consume la entidad cluster, el rollup SEO y el `aeoHook`).
- Command de autoría del cluster (crear/editar/cerrar membership) bajo `growth.seo.target.configure` — ubicar en TASK-1301 (config authoring) o task derivada explícita si no cabe allí.
- Evaluar materializar el rollup por-cluster (`seo_topic_cluster_rollup_snapshots` + BQ mirror) si el on-read no rinde a escala — task derivada de performance.
- UI de gestión de clusters + vista granular por-cluster — follow-up ui-ux posterior.

## Open Questions

1. ¿El cluster ancla per-target (`seo_target_id`) o per-org directo? §15 dice "per target"; confirmar el grain contra el modelo de TASK-1299 en Discovery (propuesta: per-target, hereda org vía `seo_targets`).
2. ¿La membership append-only lleva anti-mutation trigger o basta la convención "no DELETE" + `effective_to` (como `seo_keyword_set_members`)? Confirmar el patrón exacto de TASK-1299 en Discovery.
3. ¿El command de autoría del cluster vive en TASK-1301 (config authoring, junto a targets/keywords/competitors) o es un follow-up explícito? Resolver el ownership del write antes de cerrar (NO dejar INSERT inline).
4. ¿Un miembro del cluster puede ser a la vez URL y keyword_set, o son filas separadas (una por URL, una por keyword_set)? Propuesta: filas separadas con CHECK `url IS NOT NULL OR keyword_set_id IS NOT NULL`; confirmar en Discovery.
5. ¿El rollup GSC (clicks/impresiones) sale de `seo_gsc_daily` (TASK-1302) o de un reader GSC? Confirmar la fuente del eje GSC del rollup en Discovery.
