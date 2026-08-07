# TASK-1655 — Growth SEO: Historical Data Platform (backfill GSC→BQ + split OLTP/OLAP + semilla rank)

## Delta 2026-08-07 — ejecución (Slices 1-4 shipped)

- **Slice 1 ✅** Mirror `seo_gsc_history` (tabla creada vía `bq mk`, particionada+clustered)
  + espejo del batch diario con `bqMirror` reportado en el outcome.
- **Slice 2 ✅ (en curso el apply completo)** Backfill API→BQ shipped y verificado: smoke
  31/31 días de Berel (199.294 filas, 0 degradados) + **paridad exacta PG↔BQ** en
  2026-08-01 (6.582 filas · 450 clics · wpos 6,4601 idénticos). El apply de 16 meses es
  resumible; quedó interrumpido por un cuelgue de la máquina del operador (~66 días) y
  se relanzó.
- **Slice 3 ✅** Split de lectura por COBERTURA en `readSeoPerformance` (no por rango
  fijo): si el `MIN(capture_date)` de PG no alcanza el inicio de la ventana, la lectura
  completa va a BQ; con BQ vacío cae a PG. La pantalla ancla ya sirve la historia.
- **Slice 4 ✅** Semilla rank vía `historical_serps`. **Granularidad verificada en
  sandbox ANTES de gastar: snapshots dispersos (~mensuales/bimestrales), NO serie
  diaria** — se persisten con su fecha real y los huecos quedan a la vista.
  `source_run_id='labs-hist-<fecha>'` como procedencia (columna existente, sin
  migración). Corrida real Berel: **4 keywords con historia** (5-6 snapshots c/u, hasta
  2025-08/09) y **27 long-tail sin archivo del proveedor** (`no_history`, hecho
  declarado). Re-corrida = `already_seeded`, $0 (idempotencia pre-provider). Costo real
  ~$0.20.
- **Slice 5 ⏳ out-of-band**: activar el export nativo GSC→BQ en `sc-domain:berel.com`
  requiere permiso **Owner** en su Search Console (coordinación con el operador/cliente).
  Efeonce ya exporta desde 2025-12-10. Nota: Efeonce **no tiene conexión OAuth GSC en
  Greenhouse** (su dato entra por el export nativo), así que el backfill por API hoy solo
  aplica a Berel; si se quiere el pre-diciembre-2025 de Efeonce, conectar su OAuth
  primero.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `sync`
- Epic: `EPIC-022`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `growth|seo|data`
- Blocked by: `none`
- Branch: `develop (contrato del repositorio; sin worktrees)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El módulo SEO se construyó **forward-only**: los dos pipelines (materializer GSC y rank
capture) solo capturan "hoy", así que las superficies (`TASK-1306` Overview, `TASK-1307`
pantalla ancla, `TASK-1310` report cliente) muestran 5 y 2 días donde la tesis comercial
del EPIC-022 promete "la película en el tiempo". Esta task construye el camino de
historial: **mirror GSC→BigQuery + split PG-caliente/BQ-histórico en los readers**
(copiando el patrón que `readRankEvolution` ya canonizó), **backfill por API de hasta 16
meses por org hacia BQ**, **activación del export nativo de Search Console por propiedad**
y **semilla histórica de rank** vía DataForSEO Labs (`historical_serps`, familia ya en
allowlist).

## Why This Task Exists

Hallazgo de runtime del 2026-08-07 (durante TASK-1307, contra la base real):
`seo_gsc_daily` = 32.916 filas / **5 días** / 1 org; `seo_rank_snapshots` = **2 días**.
La API de GSC guarda 16 meses y nadie los trajo. Además el destino estaba mal
dimensionado: 5 días ya pesan **27 MB en Cloud SQL** (~0,82 KB/fila con índices); 180
días de UNA org ≈ ~1 GB en la instancia OLTP **compartida por dev/staging/prod**. El
contrato canónico (`GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`, arch SEO §4) ya declara
PG = ventana caliente / BQ = historia larga, y el carril de rank YA lo implementa
(`rank-history-bq-mirror.ts` + split en `readRankEvolution`); el carril GSC no tiene
mirror — esa asimetría es la deuda. Verificado también: el **export nativo GSC→BQ ya
corre para Efeonce** (`efeonce-group.searchconsole.searchdata_url_impression`, 238 días
desde 2025-12-10, particionada por `data_date`) — gratis, sin muestreo, pero forward-only
desde su activación y solo para `sc-domain:efeoncepro.com`.

## Goal

- Toda org con `seo_v1` puede servir **≥6 meses** de serie GSC (clics/impresiones/CTR/
  posición por query y por page) sin engordar Cloud SQL.
- Los readers del módulo (performance, overview KPIs, keyword opportunities) sirven
  rangos largos desde BigQuery con el mismo shape y la misma honestidad (`null` ≠ 0).
- La serie de posición exacta tiene semilla histórica (granularidad la que el proveedor
  dé — declarada, nunca disimulada).
- El futuro continuo de GSC queda en el export nativo por propiedad donde sea activable,
  con el fallback API para propiedades sin export.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §4 (SoT split PG/BQ), §5 (contrato de honestidad ●/◑), §6 (DataForSEO costos/allowlist), §8 (captura async).
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — Postgres first, BigQuery histórico.
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — patrón de sync/mirror.
- `.claude/rules/growth-seo.md` + skill `dataforseo-operator` (contrato del proveedor).
- `CLAUDE.md` §BigQuery DML Struct Timestamp Hard Rules (`toBigQueryStructTimestamp`, STRING+`TIMESTAMP(s.col)`; un run que ve data elegible y materializa 0 nunca es `succeeded`).

Reglas obligatorias:

- **El mirror GSC copia la forma del mirror de rank** (`src/lib/growth/seo/rank-history-bq-mirror.ts`): MERGE idempotente a `greenhouse_growth_analytics`, NUNCA `WHEN NOT MATCHED BY SOURCE THEN DELETE`.
- **El split de lectura copia `readRankEvolution`**: rango ≤ ventana caliente → PG; mayor → BQ. Un solo reader decide, ningún consumer elige fuente a mano.
- **Backfill idempotente y resumible**: `ON CONFLICT DO NOTHING`/MERGE por día; re-correr un día ya materializado no duplica ni gasta de nuevo.
- **Todo gasto DataForSEO** pasa por `postDataForSeoTask` + `enforceSeoRunEntitlement` con `estimatedCostUsd` del batch completo; el ledger lo escribe el transporte.
- **●/◑ nunca se promedian**: la semilla histórica de rank es ◑ estimado y su granularidad (probablemente mensual) se declara en el dato, jamás se interpola a diaria.
- **Reader nuevo ⇒ MCP tool en el mismo PR** (mandato del dominio 2026-08-05).

## Normative Docs

- `docs/manual-de-uso/growth/operar-captura-rankings-seo.md` (runbook del cron de rank)
- `.claude/skills/dataforseo-operator/references/02-labs.md` (endpoints históricos + costos)

## Dependencies & Impact

### Depends on

- `TASK-1302` — `materializeGscDailySnapshot(organizationId, captureDate)` ya acepta fecha arbitraria (el loop de backfill lo reutiliza; hoy escribe a PG — se le agrega destino BQ).
- `TASK-1303` — patrón mirror BQ + split de `readRankEvolution` (la forma a copiar).
- Export nativo GSC→BQ vivo para Efeonce: `efeonce-group.searchconsole.*` (verificado 2026-08-07).

### Blocks / Impacts

- `TASK-1307` (pantalla ancla) — su reader `readSeoPerformance` adopta el split y pasa de 5 días a la película real. La UI no cambia.
- `TASK-1306` (Overview) y `TASK-1310` (report cliente) — mismos beneficiarios.
- `readSeoOverviewKpis` / `readKeywordOpportunities` — candidatos al mismo split (evaluar en Discovery, no obligatorio en V1).

### Files owned

- `src/lib/growth/seo/gsc-history-bq-mirror.ts` (nuevo — espejo del de rank)
- `src/lib/growth/seo/gsc-backfill.ts` (nuevo — command de backfill por org)
- `src/lib/growth/seo/rank-history-seed.ts` (nuevo — semilla `historical_serps`)
- `src/lib/growth/seo/performance/read-performance.ts` (split PG/BQ)
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts` + `src/mcp/greenhouse/**` (tools de los commands nuevos)
- `services/ops-worker/server.ts` [verificar] (endpoints de backfill si corre async)
- `docs/manual-de-uso/growth/` (runbook de backfill + activación export nativo)

## Current Repo State

### Already exists

- Mirror BQ de rank: `rank-history-bq-mirror.ts` → `greenhouse_growth_analytics.seo_rank_history` (MERGE reactivo vía outbox).
- Split PG/BQ en `readRankEvolution` (`RANK_EVOLUTION_HOT_WINDOW_DAYS = 180`).
- `materializeGscDailySnapshot(org, fecha)` parametrizado por fecha, con paginación real.
- Export nativo GSC en BQ para Efeonce (238 días, particionado por `data_date`, schema con `sum_position`).
- Familia `labs` en el allowlist DataForSEO (`dataforseo-families.ts`).
- Entitlement chokepoint `enforceSeoRunEntitlement` + spend ledger.

### Gap

- `seo_gsc_daily` no tiene mirror BQ ni política de retención; crece sin techo en OLTP.
- Ningún reader GSC sirve más allá de lo que PG tenga.
- El pasado (16 meses API) nunca se trajo para ninguna org.
- El export nativo no está activado en la propiedad de Berel (`sc-domain:berel.com`).
- No hay camino de semilla histórica de rank. **[verificar]** granularidad y shape real de `/dataforseo_labs/google/historical_serps/live/` contra sandbox ANTES de diseñar el mapeo (la reference no declara si es mensual).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `sync` (mirror + backfill) con `reader` derivado (split PG/BQ)
- Source of truth afectado: **BigQuery `greenhouse_growth_analytics.seo_gsc_history` pasa a ser el SoT del histórico GSC**; PG `seo_gsc_daily` queda como ventana caliente operativa. El SoT de rank no cambia (PG caliente + `seo_rank_history` BQ, TASK-1303).
- Consumidores afectados: `readSeoPerformance` (UI 1307 + lane + MCP), y como candidatos futuros `readSeoOverviewKpis`/`readKeywordOpportunities`.
- Runtime target: `local|staging|prod` (la base y BQ son compartidos).

### Contract surface

- Contrato existente a respetar: shape de fila GSC (org, site_url, capture_date, query, page, clicks, impressions, ctr, position) idéntico en ambos stores; fórmula de posición ponderada por impresiones idéntica a `read-overview-kpis`.
- Contrato nuevo: `backfillGscHistory(org,{fromDate,toDate})` + `mirrorGscDailyToBq(org,date)` + `seedRankHistory(targetId)` — commands de operador (runners en `scripts/growth/`); el split de lectura es interno al reader (ningún consumer elige store).
- Backward compatibility: total — con BQ vacío el reader sirve lo que PG tenga (comportamiento previo).
- Full API parity: los readers ya exponen su lane/MCP (TASK-1307); los commands de backfill/seed son one-shot de operador — exponerlos como MCP tools queda declarado como follow-up (una corrida de 490 días no cabe en request-response).

### Data model and invariants

- Entidades: `seo_gsc_history` (BQ, nueva), `seo_rank_snapshots` (PG, filas semilla con `source_run_id='labs-hist-*'`), `seo_rank_history` (BQ, espejo existente).
- Invariantes: MERGE idempotente por la clave del UPSERT de PG; NUNCA `WHEN NOT MATCHED BY SOURCE THEN DELETE`; huecos = ausencia de fila (jamás ceros); semilla NUNCA pisa una medición del cron (`ON CONFLICT DO NOTHING`; triggers append-only vigentes); posición SIEMPRE ponderada por impresiones.
- Tenant/space boundary: todo keyed por `organization_id`; particiones/filtros por org en toda query BQ.
- Idempotency/concurrency: backfill resumible (salta días presentes); no correr dos backfills de la misma org en paralelo (cuota QPS por propiedad).
- Audit/outbox/history: el espejo GSC corre como paso del batch (no outbox — decisión declarada: fetch y espejo comparten el ciclo de vida del día); el de rank sigue en su consumer reactivo.

### Migration, backfill and rollout

- Migration posture: `none` en PG (columna `source_run_id` existía); tabla BQ creada como paso de rollout (`bq mk`, 2026-08-07, documentado en runbook).
- Default state: aditivo; con BQ vacío nada cambia.
- Backfill plan: por org con conexión GSC activa (hoy Berel; Efeonce va por export nativo), 16 meses, ejecutado por runner de operador.
- Rollback path: drop tabla BQ + revert PR (PG intacto); semilla identificable por `source_run_id` (remoción exigiría bypass admin del trigger append-only — documentado, no automatizado).
- External coordination: export nativo GSC→BQ en la propiedad de Berel (permiso Owner).

### Security and access

- Auth/access gate: commands server-only, runners de operador con ADC; el gasto DataForSEO pasa por `enforceSeoRunEntitlement` + spend fence + ledger del transporte.
- Sensitive data posture: datos SEO del cliente (no PII).
- Error contract: degradación honesta por día/keyword (`degraded`/`no_history` con errorCode), nunca días a medias.
- Abuse/rate-limit posture: throttle 250ms/día contra GSC; batch Labs con gate + fence.

### Runtime evidence

- Paridad PG↔BQ verificada con datos reales (2026-08-01: 6.582 filas / 450 clics / wpos 6,4601 idénticos).
- Smoke backfill 31/31 días; corrida completa 16 meses en curso (resumible).
- Sandbox `historical_serps` verificado ANTES de gastar (granularidad dispersa); seed real: 4 keywords con historia, re-corrida idempotente $0.
- `pnpm worker:runtime-deps-gate` + `worker:build-contract-gate` verdes (el batch es worker-bundled).

### Acceptance criteria additions

- [x] SoT nombrado + contrato de fila idéntico entre stores (test de paridad con datos reales).
- [x] Invariantes (MERGE sin DELETE, huecos honestos, semilla no pisa cron) explícitos.
- [x] Migration/rollback posture explícito (aditivo; BQ por rollout step).
- [ ] Evidencia final del backfill completo (MIN fecha ≈ 16 meses) — corrida en curso.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/**` (dominio) + `services/ops-worker` (ejecución async) + BigQuery `greenhouse_growth_analytics`
- Future candidate home: `worker`
- Boundary: commands de backfill/mirror del dominio SEO; consumers = ops-worker (cron/one-shot), lane ecosystem y MCP tools. Ningún consumer escribe BQ directo.
- Server/browser split: `server-only` en todos los archivos nuevos; nada llega al browser.
- Build impact: `none` (cliente BQ ya es dependencia del worker)
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Mirror GSC → BigQuery + retención

- Tabla `greenhouse_growth_analytics.seo_gsc_history` (particionada por fecha, clustered por org) + helper MERGE espejo de `rank-history-bq-mirror.ts`.
- Consumer reactivo: cada día materializado en PG se espeja a BQ (mismo trigger/outbox que el carril de rank o paso del batch — decidir en Discovery).
- Política de retención PG declarada (ventana caliente ~180d); el purge físico puede ser follow-up, pero la política queda escrita.

### Slice 2 — Backfill API → BQ por org

- Command `backfillGscHistory(organizationId, { fromDate, toDate })`: loop sobre `materializeGscDailySnapshot` con destino BQ (los días dentro de la ventana caliente también a PG), idempotente y resumible, con reporte por día (`materialized|skipped|failed`).
- Ejecución para TODAS las orgs con `seo_v1` (hoy Berel + Efeonce), profundidad 16 meses o lo que la API entregue.
- Para Efeonce: reconciliar con el export nativo existente (238 días) — el backfill API solo rellena ANTES de `2025-12-10`; el export nativo es autoridad desde su activación.

### Slice 3 — Split PG/BQ en `readSeoPerformance`

- Mismo contrato de `readRankEvolution`: rango ≤ caliente → PG; mayor → BQ; `source` reportado.
- Selector de rango de TASK-1307 puede crecer (365d) como consecuencia — coordinar delta, no implementarlo acá.

### Slice 4 — Semilla histórica de rank (`historical_serps`)

- Verificar en sandbox granularidad/shape → mapear a `seo_rank_snapshots`/`seo_rank_history` con marca de procedencia (`source='labs_historical'` o equivalente que Discovery decida) para no confundir con mediciones diarias del cron.
- Batch con `enforceSeoRunEntitlement` + costo estimado (~$0,02 para 31 kw × 6 meses de Berel).

### Slice 5 — Export nativo por propiedad + runbook

- Activar export nativo en `sc-domain:berel.com` → `efeonce-group` (requiere permiso Owner — coordinación out-of-band).
- Runbook `docs/manual-de-uso/growth/`: activar export para un cliente nuevo + correr backfill + verificar.
- MCP tools de los commands nuevos (parity).

## Out of Scope

- Cambios de UI (TASK-1307 ya rinde lo que el reader le dé).
- Purge físico de PG (política declarada; ejecución puede ser follow-up).
- Ampliar el allowlist DataForSEO (todo usa familias existentes).
- Ingesta del export nativo como reemplazo del materializer API (el export complementa; el fallback API queda para propiedades sin export).

## Detailed Spec

Ver diseño discutido el 2026-08-07 en TASK-1307 (`## Delta` que esta task referencia) y el
patrón fuente en `rank-history-bq-mirror.ts`. Puntos load-bearing:

- **Posición del export nativo**: el schema trae `sum_position` (suma), no `position` —
  el promedio ponderado es `SUM(sum_position)/SUM(impressions)`. Documentar el mapeo en el
  mirror para que ningún consumer lo recalcule mal.
- **El backfill escribe BQ como destino primario** del histórico; PG solo recibe la
  ventana caliente. Nunca 1,2M filas a Cloud SQL.
- **Costo**: GSC API $0; BQ ~150 MB/org/año ≈ centavos; `historical_serps`
  $0,00012/SERP.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (mirror) → Slice 2 (backfill; escribe sobre la tabla del mirror) → Slice 3 (split de lectura; lee lo que 1-2 poblaron).
- Slice 4 (semilla rank) es independiente de 1-3; requiere solo la verificación sandbox previa.
- Slice 5 (export nativo Berel) puede correr en paralelo desde el día 1 — es coordinación externa.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Backfill duplica días ya materializados | data quality | medium | MERGE/`ON CONFLICT` por (org, fecha, query, page); dry-run primero | conteo por día pre/post |
| Cuota API GSC agotada en el loop de 16 meses | sync | medium | throttle + resumible por día; el skip se reporta, no se silencia | reporte del command |
| Mapeo `sum_position` mal hecho (posición inflada) | correctness/trust | medium | test de paridad contra la fórmula ponderada de `read-overview-kpis` con datos reales | sanity live pre-merge |
| `historical_serps` con granularidad distinta a la asumida | correctness | high | verificación sandbox ANTES de diseñar el mapeo; granularidad declarada en el dato | Discovery gate |
| Costo BQ por scan sin partición | costo | low | tablas particionadas por fecha + clustered por org; queries siempre con rango | billing export |
| Backfill corre contra la base compartida en horario de uso | ops | low | correr por lotes con pausa; BQ es el destino pesado, PG solo caliente | `pg:doctor` |

### Feature flags / cutover

- Reutiliza `GROWTH_SEO_ENABLED` (ya ON en Production para el lane). El split de lectura es transparente: con BQ vacío el reader sirve lo que PG tenga (comportamiento actual). Sin flag nuevo — cutover por presencia de datos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | drop tabla BQ + revert PR (PG intacto) | <10 min | sí |
| Slice 2 | `DELETE` por rango de fechas en BQ (el backfill es re-ejecutable) | <10 min | sí |
| Slice 3 | revert PR (el reader vuelve a PG-only) | <5 min | sí |
| Slice 4 | `DELETE WHERE source='labs_historical'` (la marca de procedencia lo permite) | <10 min | sí |
| Slice 5 | desactivar export en Search Console | <5 min | sí |

### Production verification sequence

1. Sandbox `historical_serps` → shape/granularidad documentados.
2. Slice 1 en develop + mirror de los días vivos → conteo PG == BQ.
3. Backfill dry-run Berel 30 días → plan esperado; apply → verificar conteos + spot-check contra GSC UI.
4. Backfill completo Berel + Efeonce (pre-export-nativo).
5. Split de lectura: `readSeoPerformance` con rango 365 sirve desde BQ y declara `source='bigquery'`.
6. Pantalla ancla (1307) muestra la serie larga sin cambio de código UI.

### Out-of-band coordination required

- **Activación del export nativo en `sc-domain:berel.com`**: requiere permiso Owner en la propiedad de Search Console. Si la cuenta OAuth de Efeonce no es Owner, pedirlo al cliente. (Único paso no-código.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `greenhouse_growth_analytics.seo_gsc_history` existe, particionada por fecha + clustered por org, poblada por MERGE idempotente (nunca DELETE by source).
- [ ] Backfill ejecutado para TODAS las orgs con `seo_v1`; profundidad ≥6 meses (objetivo 16) verificada con `SELECT MIN(capture_date)` por org.
- [ ] `readSeoPerformance` sirve rango > ventana caliente desde BQ con `source='bigquery'`; shape y honestidad (`null` ≠ 0) idénticos.
- [ ] Paridad de posición: fórmula ponderada del mirror == fórmula de `read-overview-kpis` sobre el mismo día (test con datos reales).
- [ ] Semilla `historical_serps` aplicada con marca de procedencia y granularidad declarada; gasto registrado en el ledger.
- [ ] Export nativo activo en la propiedad de Berel O bloqueo documentado con owner y siguiente paso.
- [ ] MCP tools de los commands nuevos registradas en el mismo PR.
- [ ] Cloud SQL no creció más allá de la ventana caliente (política de retención declarada).

## Verification

- `pnpm local:check` + `pnpm test`
- Sanity live contra PG + BQ reales (gate TASK-893)
- `bq query` de conteos por org/fecha pre/post backfill
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` actualizado
- [ ] Delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §4 (el carril GSC ahora tiene su mirror + política de retención)
- [ ] Runbook en `docs/manual-de-uso/growth/`
- [ ] Chequeo de impacto cruzado: TASK-1306/1307/1310 (sus specs citan "5 días"/"no_data como primera pantalla" — actualizar)

## Follow-ups

- Purge físico de la ventana fría en PG (cuando la política lo pida).
- Split BQ para `readSeoOverviewKpis` / `readKeywordOpportunities` si el patrón de uso lo justifica.
- Selector de rango de la pantalla ancla ampliado (365d) — delta de TASK-1307.

## Open Questions

1. ¿Granularidad real de `historical_serps`? (verificar en sandbox — condiciona el Slice 4).
2. ¿El mirror GSC va por outbox reactivo (como rank) o como paso del batch diario? (Discovery; el batch es más simple, el outbox es el patrón canónico).
3. ¿La cuenta OAuth de Efeonce tiene permiso Owner en la propiedad GSC de Berel?
