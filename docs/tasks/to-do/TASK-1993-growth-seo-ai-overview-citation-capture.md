# TASK-1993 — Growth SEO: capturar las referencias del AI Overview en la captura diaria de clientes («citado dentro del AI Overview»)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `sync`
- Epic: `EPIC-022`
- Status real: `Diseño; pedido del operador 2026-10-03 (inventario de tarjetas de Insights, ítem «Citado dentro del AI Overview»)`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La captura diaria de ranking de los clientes ya pide y paga el AI Overview de cada keyword, pero sólo guarda si
apareció (`serp_features ⊃ ai_overview`); las referencias que el AI Overview cita se descartan. Sólo el diagnóstico de
prospecto las lee (`ai_overview_reference` en `src/lib/growth/seo/prospect/`). Esta task parsea esas referencias en la
misma respuesta ya comprada, las guarda append-only por keyword y día, y expone un reader que responde «¿en qué
keywords el AI Overview enlazó al sitio del cliente en la ventana?». Costo de proveedor incremental: cero.

## Why This Task Exists

El inventario de tarjetas de Insights aprobado el 2026-10-03 (canvas
<https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>, tablero `Cifras-Canal-Inventario`) marca «Citado dentro del AI
Overview» como **falta capturarlo**: «sólo en el diagnóstico de prospecto; en clientes no se leen las referencias del
AIO». Verificado en el repo el 2026-10-03:

- `src/lib/growth/seo/rank-capture.ts` arma la tarea SERP con `load_async_ai_overview: true` (el costo ya está en el
  gate) y `parseSerpRankObservation` se queda con la fila propia; `serp_features` guarda el tipo de bloque.
- `src/lib/growth/seo/serp-top-results.ts` (TASK-1699) persiste cada item del SERP por `rank_absolute` y tipo, pero no
  desciende a las `references[]` anidadas del bloque AI Overview.
- `src/lib/growth/seo/prospect/derive.ts` y `prospect/collect.ts` ya cuentan citas `ai_overview_reference` para
  prospectos desde DataForSEO Labs; no hay equivalente para la captura diaria de clientes.

Doctrina del módulo (TASK-1699, TASK-1708): no se tira lo que ya se pagó.

## Goal

- Cada respuesta SERP de la captura diaria con bloque AI Overview deja sus referencias (dominio, URL, título, orden)
  persistidas append-only, con `is_own_domain` resuelto como en el resto de la captura.
- Un reader dueño entrega, por organización y ventana, las keywords donde el AI Overview citó el sitio, sobre los días
  en que el AI Overview fue medido, con su cobertura.
- Ningún cambio en el request comprado ni en su costo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/epics/in-progress/EPIC-022-growth-seo-search-visibility-360-module.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (migraciones y marcadores)
- skill `dataforseo-operator` (forma de la respuesta SERP avanzada y del bloque AI Overview)

Reglas obligatorias:

- El parser es hermano de `parseSerpTopResults`: lee la misma respuesta, no cambia `buildSerpTask` ni su firma
  (test de no regresión de costo existente en TASK-1699).
- Un día sin captura de AI Overview es «no medido», nunca «no citado» (misma regla que TASK-1704).
- Si la referencia viene envuelta en un redirect de Google (caso visto en AI Mode por TASK-1652), se desenvuelve sólo
  si el destino real viene en la respuesta; si no, se guarda como `wrapped` y no cuenta como cita propia.
- Frontera SEO ↔ AEO: esta es evidencia del SERP de Google (dominio SEO). Las citas de los motores del Grader siguen
  en `provider_observations` (TASK-1311); no se mezclan tablas ni se unen por JOIN.
- Migración con `-- Up Migration`, bloque `DO` de verificación y grants (CLAUDE.md, Database Migrations).

## Normative Docs

- `docs/tasks/complete/TASK-1699-growth-seo-persist-serp-top-n-already-paid.md`
- `docs/tasks/to-do/TASK-1704-growth-cadence-sampling-aio-weekly-n3.md`
- `docs/tasks/to-do/TASK-1311-growth-seo-aeo-citation-attribution-url-grounded-queries.md`

## Dependencies & Impact

### Depends on

- Captura diaria de ranking en producción (`rank-capture.ts`, `rank-capture-batch.ts`) con `load_async_ai_overview`.
- Tabla `greenhouse_growth.seo_serp_top_results` y su writer (TASK-1699).

### Blocks / Impacts

- `TASK-1992` Slice 2: hecho «citado dentro del AI Overview» en Insights.
- `TASK-1704`: si la cadencia del AI Overview deja de ser diaria, este reader cuenta sólo días medidos.
- `TASK-1313`: puede consumir la cita del AI Overview por URL en su lectura por página.

### Files owned

- `src/lib/growth/seo/serp-top-results.ts` (parser hermano de referencias) o un módulo hermano `src/lib/growth/seo/ai-overview-references.ts`
- `src/lib/growth/seo/rank-capture.ts` (sólo el punto donde se invoca el writer; sin cambio del request)
- `src/lib/growth/seo/ai-overview-citations-reader.ts` (nuevo reader)
- `migrations/<timestamp>_task-1993-seo-ai-overview-references.sql` (si Discovery elige tabla propia)
- `src/types/db.d.ts` (regenerado)

## Current Repo State

### Already exists

- Request SERP con AI Overview asíncrono (`rank-capture.ts`, `buildSerpTask`).
- Writer append-only del top-N por `rank_absolute` (`serp-top-results.ts`, tope `SERP_TOP_RESULTS_MAX_ROWS_PER_KEYWORD`).
- `serp_features` por keyword y día; `readRankEvolution` expone `aiOverview` por punto.
- Derivación de citas `ai_overview_reference` para prospectos (`prospect/derive.ts`).

### Gap

- Las `references[]` del bloque AI Overview de la captura diaria se descartan.
- No hay reader de «citado dentro del AI Overview» para clientes.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/seo/**` (captura diaria en el worker de ranking y reader en el portal)
- Future candidate home: `domain-package`
- Boundary: el dominio SEO captura y expone el reader; Insights (TASK-1992) y otros consumers sólo leen por ese reader
- Server/browser split: captura, persistencia y reader son server-only
- Build impact: `none`
- Extraction blocker: la captura comparte el pool Postgres y el job de ranking del portal

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `sync`
- Source of truth afectado: `respuesta SERP avanzada de DataForSEO ya comprada por la captura diaria; tabla nueva o filas nuevas en greenhouse_growth (decisión de Discovery)`
- Consumidores afectados: `adapter SEO de Insights (TASK-1992), lectura por página (TASK-1313), superficies del SV360`
- Runtime target: `worker/cron de la captura diaria de ranking + portal (reader)`

### Contract surface

- Contrato existente a respetar: `buildSerpTask`, `parseSerpRankObservation`, `parseSerpTopResults`, `seo_serp_top_results`
- Contrato nuevo o modificado: `parseAiOverviewReferences(response)` y `readAiOverviewCitationsForWindow({ organizationId, window })`
- Backward compatibility: `compatible` — aditivo; el request y las filas existentes no cambian
- Full API parity: `reader canónico del dominio SEO, disponible para Product API y MCP del SV360 sin lógica por consumer`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_ai_overview_references (propuesta) o filas item_type='ai_overview_reference' en seo_serp_top_results con ordinal propio`
- Invariantes que no se pueden romper:
  - append-only; una fila por referencia, keyword, día y dispositivo, con ordinal estable;
  - `is_own_domain` con el mismo predicado que la captura (`isOwnDomain`);
  - un día sin AI Overview medido no produce fila ni cuenta como «no citado»;
  - una referencia envuelta sin destino real no cuenta como cita propia;
  - cero llamadas nuevas al proveedor.
- Write-target allowlist: `si el dominio SEO tiene boundary test de destinos de escritura, la tabla nueva se declara allí en el mismo PR; si no, N/A`
- Tenant/space boundary: `seo_targets.organization_id`
- Idempotency/concurrency: `ON CONFLICT DO NOTHING sobre la clave natural; reintento de la captura no duplica`
- Audit/outbox/history: `la tabla append-only es el historial; sin eventos`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `enabled with rationale — escritura aditiva sobre una respuesta ya pagada; el reader no tiene consumer hasta TASK-1992`
- Backfill plan: `ninguno: la respuesta cruda histórica no se guarda; la serie empieza el día del deploy y el reader lo declara en coverage`
- Rollback path: `revert del writer + redeploy del worker; la tabla queda sin escrituras (drop con migración down si se decide)`
- External coordination: `deploy del worker de la captura de ranking por el release control plane`

### Security and access

- Auth/access gate: `reader server-side detrás del entitlement del módulo SEO`
- Sensitive data posture: `URLs y títulos públicos del SERP; keywords del cliente nunca al log`
- Error contract: `un fallo del parser no rompe la captura del ranking: se registra con captureWithDomain(err, 'integrations.dataforseo' o el dominio SEO vigente) y sigue`
- Abuse/rate-limit posture: `tope de referencias por keyword y día`

### Runtime evidence

- Local checks: `tests del parser con respuesta real anonimizada (con y sin AI Overview, con redirect envuelto)`
- DB/runtime checks: `migración aplicada y verificada con SELECT a information_schema; primera captura real con filas para un target`
- Integration checks: `reader sobre Berel después de una semana de captura`
- Reliability signals/logs: `conteo de referencias por corrida en el log de la captura`
- Production verification sequence: `ver Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se completa al final.
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
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Parser y persistencia

- `parseAiOverviewReferences(response)`: desciende a las `references[]` del bloque AI Overview (incluidos los
  anidados), desenvuelve redirects con destino real, resuelve `is_own_domain`.
- Persistencia append-only (tabla propia o filas en `seo_serp_top_results` con ordinal; decisión documentada en el
  plan) y migración si corresponde, con bloque `DO` de verificación.

### Slice 2 — Reader

- `readAiOverviewCitationsForWindow({ organizationId, window })`: keywords medidas con AI Overview, keywords donde el
  AI Overview citó el sitio, URLs propias citadas y cobertura (días medidos sobre días de la ventana).

### Slice 3 — Verificación real

- Deploy del worker; una semana de captura de Berel; reader con números revisados por el operador.

## Out of Scope

- El hecho de Insights y la tarjeta (TASK-1992, TASK-1996).
- Citas de los motores del Grader (TASK-1311).
- Cambiar la cadencia del AI Overview (TASK-1704).
- Backfill histórico: la respuesta cruda pasada no se conserva.

## Detailed Spec

Forma propuesta de la tabla (si Discovery elige tabla propia), append-only:

| Columna | Tipo | Nota |
|---|---|---|
| `seo_target_id` | text | FK lógica a `seo_targets` |
| `keyword` | text | keyword monitoreada |
| `captured_on` | date | día de la captura (zona del target) |
| `device` | text | `desktop` o `mobile` |
| `reference_ordinal` | integer | orden de la referencia dentro del bloque |
| `reference_domain`, `reference_url`, `reference_title` | text | destino real; `wrapped` si viene envuelto sin destino |
| `is_own_domain` | boolean | mismo predicado que la captura |
| `wrapped` | boolean | referencia envuelta en redirect sin destino real |

Clave natural `(seo_target_id, keyword, captured_on, device, reference_ordinal)` con `ON CONFLICT DO NOTHING`. El
reader agrega por ventana: keywords con AI Overview medido, keywords donde el AI Overview citó el sitio, URLs propias
citadas y días medidos sobre días de la ventana.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (parser + persistencia + migración aplicada y verificada) → Slice 2 (reader) → Slice 3 (verificación real).
- La migración se aplica antes del deploy del writer (expand antes del deploy).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un error del parser rompe la captura del ranking | cron / worker | medium | el parser corre aislado con try/catch; la fila de ranking se persiste igual | errores del dominio SEO en Sentry |
| Referencias envueltas en redirect contadas como cita propia | data | medium | sólo destino real; `wrapped` no cuenta | test con respuesta envuelta |
| Cambio accidental del request y su costo | proveedor / costo | low | test de no regresión de `buildSerpTask` | gasto del proveedor en el ledger |
| Tabla crece sin tope | Postgres | low | tope por keyword y día | tamaño de tabla en `pg:doctor` |
| Marcadores de migración invertidos | migration | low | `-- Up Migration` + bloque `DO` con RAISE | `migration-marker-gate` |

### Feature flags / cutover

- Sin flag: la escritura es aditiva sobre una respuesta ya pagada y no tiene consumer visible hasta TASK-1992.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del writer + redeploy del worker; migración down sólo si se decide borrar la tabla | < 30 min | si |
| Slice 2 | revert del reader | < 15 min | si |
| Slice 3 | sin cambio de estado: es verificación; si los números no cuadran se revierte el Slice 1 | inmediato | si |

### Production verification sequence

1. `pnpm migrate:up` en la instancia compartida y verificación de la tabla o columnas.
2. Deploy del worker de ranking por el release control plane; primera corrida con referencias para un target.
3. Una semana de captura; reader sobre Berel revisado por el operador.

### Out-of-band coordination required

- Release del worker de la captura de ranking por el control plane.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `parseAiOverviewReferences` extrae dominio, URL, título y ordinal de las referencias del bloque AI Overview, incluidas las anidadas (test con respuesta real anonimizada).
- [ ] Una referencia envuelta en redirect sin destino real se guarda como `wrapped` y no cuenta como cita propia (test).
- [ ] `buildSerpTask` no cambia y el test de no regresión de costo sigue verde.
- [ ] La persistencia es append-only e idempotente ante reintentos (test).
- [ ] `readAiOverviewCitationsForWindow` cuenta sólo días con AI Overview medido y devuelve la cobertura (test con un día sin medición).
- [ ] Migración aplicada y verificada en la instancia compartida (si hay tabla nueva) y tipos regenerados.
- [ ] Una semana de captura real de Berel produce filas y el reader devuelve números revisados por el operador.

## Verification

- `pnpm typecheck`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm migration-marker-gate`
- `pnpm test` (suite completa al cierre)
- `pnpm task:lint --task TASK-1993`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` documenta la captura de referencias y el reader.
- [ ] Delta en TASK-1992 avisando que el Slice 2 queda desbloqueado.

## Follow-ups

- Si el operador lo pide, la URL propia más citada por el AI Overview como hecho de Insights (TASK-1992 o una task
  hija).

## Open Questions

- ¿Tabla propia o filas en `seo_serp_top_results`? Propuesta: tabla propia, porque las referencias no tienen ranura
  `rank_absolute` y meterlas en esa clave obliga a inventar una.
