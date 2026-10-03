# TASK-1961 — Efeonce Insights: visibilidad en IA por país (informe multimercado sin promedios)

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
- Backend impact: `reader`
- Epic: `EPIC-045`
- Status real: `Diseno; pedido del operador 2026-10-02`
- Rank: `TBD`
- Domain: `platform|growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El Grader ya mide por mercado (TASK-1863): Sky tiene siete (Chile, Perú, Argentina, Colombia, Estados Unidos en
es-US, Brasil y Uruguay), cada uno con su set de competidores y corrida mensual. El informe de Insights, en cambio, lee
un solo análisis (el último de la organización, de cualquier mercado). Esta task hace que la evidencia AEO de Insights
sea por país, y que el plan la presente como una lectura por mercado, sin promediar países.

## Why This Task Exists

Pedido del operador (2026-10-02): «El informe de Sky además debe contemplar múltiples países, como sucede con Efeonce».

- `src/lib/efeonce-insights/adapters/aeo-adapter.ts:34` llama `readClientGraderReport({ organizationId })` sin
  `runId` ni mercado ⇒ toma el último run de la organización, sea del país que sea; la comparación con el período
  anterior lee el mismo run (por eso casi siempre sale `unsupported_window`).
- El Grader ya expone la vista por mercado: `readGraderMarketMatrix` (`src/lib/growth/ai-visibility/markets/readers.ts:85`)
  devuelve, por mercado, su último run con score y el reporte público, con metodología (versión de score, pack, set de
  competidores). Regla de TASK-1863: matriz **sin promedio**.
- Configuración de Sky al 2026-10-02 (sets versión 2–3, regrade mensual activo en los siete): competidores por país
  investigados (p. ej. Argentina: Aerolíneas Argentinas, JetSMART, Flybondi, LATAM, Gol, Copa; Estados Unidos:
  American, LATAM, Delta, Copa, Avianca, United).

## Goal

- La evidencia AEO de una edición incluye, por cada mercado activo del perfil, el run cuyo corte cae en la ventana, con
  hechos dimensionados por mercado (`market`: código + locale + nombre legible).
- Share of Model, Share of Voice, mención por motor y citas se reportan por país; nunca un promedio entre países.
- Un mercado sin run en la ventana es un límite declarado por país, no un hueco silencioso.
- El plan arma una lectura por mercado (resumen comparativo de países + detalle por país) y el modelo web lleva el mercado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `TASK-1863`: mercados, sets versionados, snapshot por run y matriz sin promedio. Insights consume el reader dueño
  (`readGraderMarketMatrix` o un reader por mercado y ventana), nunca tablas del Grader.
- Insights: adapters sólo sobre readers dueños; ventanas `[start,end)`; snapshot sellado (`EFEONCE_INSIGHTS_ARCHITECTURE_V1.md`).
- `TASK-1957`: indicadores AEO estándar y gate client-fit aplican por país.

## Normative Docs

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md`
- `docs/tasks/in-progress/TASK-1863-aeo-grader-multi-market.md`

## Dependencies & Impact

### Depends on

- Runs por mercado de TASK-1863 (código en producción; flag multimercado ON en Vercel y ops-worker desde 2026-10-02).

### Blocks / Impacts

- `TASK-1958`: Think y PDF deben dibujar la lectura por país (comparativo de mercados + detalle).
- `TASK-1960`: el informe de un servicio SEO/AEO multimercado toma todos los mercados del perfil del servicio.
- `TASK-1959`: el Share of Voice por país depende de competidores declarados por mercado.

### Files owned

- `src/lib/efeonce-insights/adapters/aeo-adapter.ts`
- `src/lib/efeonce-insights/editorial/deterministic-planner.ts` (agrupación por mercado)
- `src/lib/efeonce-insights/contracts/web-model.ts` (mercado en hechos/figuras)

## Current Repo State

### Already exists

- Mercados y matriz por mercado en el Grader; Sky con siete mercados configurados.
- Hechos AEO con `channelId` y familias (`mention_rate`, `sov`, `single`) desde TASK-1957.

### Gap

- El adapter lee un solo run; no hay dimensión de mercado en los hechos ni en el plan.
- Sin selección del run por mercado dentro de la ventana.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/efeonce-insights/` (Vercel + ops-worker para recurrencias)
- Future candidate home: `domain-package`
- Boundary: el adapter AEO consume un reader dueño del Grader por mercado; planner y render sólo ven hechos con mercado
- Server/browser split: `server-only`
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `snapshot de evidencia sellado de Insights (hechos AEO con dimensión de mercado)`
- Consumidores afectados: `plan editorial, modelo web (Think), PDF/deck, lanes y MCP de Insights`
- Runtime target: `production y staging (Vercel + ops-worker + Job artifact-worker)`

### Contract surface

- Contrato existente a respetar: `EvidenceFactV1` y `aeo_report_adapter_v2`
- Contrato nuevo o modificado: adapter AEO v3 con `dimension.market`; reader del Grader por mercado y ventana
- Backward compatibility: `compatible` — snapshots v2 sellados no cambian; perfiles de un solo mercado producen un único país
- Full API parity: `la lectura por país sale del adapter/plan canónico; ningún consumer recalcula`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna tabla nueva; lectura de grader_runs/grader_scores vía reader del Grader`
- Invariantes que no se pueden romper:
  - `Nunca un promedio, suma ni ranking agregado entre países.`
  - `Cada hecho por país cita su run, su set de competidores y su versión de score.`
  - `Un país sin run en la ventana se declara como límite de ese país.`
  - `Países con versión de score distinta no se comparan entre sí en una misma figura.`
- Write-target allowlist: `sin cambios`
- Tenant/space boundary: `mercados del perfil de la organización autorizada`
- Idempotency/concurrency: `determinista sobre los runs seleccionados`
- Audit/outbox/history: `sin eventos nuevos`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale — sin flag; perfiles de un mercado no cambian`
- Backfill plan: `ninguno; ediciones nuevas o revisadas`
- Rollback path: `revert + redeploy`
- External coordination: `release por el control plane; TASK-1863 en producción antes de usar mercados no primarios en producción`

### Security and access

- Auth/access gate: `sin cambio`
- Sensitive data posture: `sin datos nuevos`
- Error contract: `sin cambio`
- Abuse/rate-limit posture: `sin cambio`

### Runtime evidence

- Local checks: `tests del adapter con dos y siete mercados; país sin run ⇒ límite; sin promedio`
- DB/runtime checks: `borrador de Sky en staging con los siete países tras su primera corrida mensual`
- Integration checks: `modelo web con mercado por hecho y gate client-fit sin violaciones`
- Reliability signals/logs: `captureWithDomain('insights')`
- Production verification sequence: `release → borrador Sky → revisión del operador`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se completa al final. Esta task no crea tablas.
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

### Slice 1 — Reader por mercado y ventana

- Reader dueño del Grader: último run con score por mercado cuyo corte cae en `[start,end)`, con metodología.

### Slice 2 — Adapter AEO v3 por país

- Hechos AEO (Share of Model, mención por motor, Share of Voice, citas, dimensiones) con `dimension.market`; límites
  por país; comparación con el período anterior por país.

### Slice 3 — Plan y modelo web por mercado

- Lectura comparativa de países (sin promedio) + detalle por país; el modelo web lleva el mercado legible. Delta a
  TASK-1958 con la forma visual.

## Out of Scope

- SEO por país: Sky tiene un solo sitio SEO declarado (blog Chile, `seot-sky-blog-cl`); multipaís en SEO requiere
  propiedades/targets por país y es otra task.
- Cambiar el Grader o sus fórmulas (TASK-1959).

## Detailed Spec

Presentación sugerida: una figura comparativa por indicador con un país por fila (cada uno con su propio total de
respuestas), y un bloque por país con sus hallazgos. Nunca «Sky en LATAM: X %».

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → 2 → 3; el plan no consume mercados hasta que el adapter los selle.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Promedio implícito entre países | plan/render | Media | invariante + test + gate | tests |
| País sin corrida en el mes | Insights | Alta al inicio | límite por país | límites del borrador |
| Mercados no primarios sin corrida aún | Grader | Baja | primera corrida mensual 2026-10-03 08:00 | grader_runs por mercado |

### Feature flags / cutover

Sin flag: aditivo y compatible con perfiles de un mercado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
|---|---|---|---|
| 1–3 | revert + redeploy | < 30 min | sí |

### Production verification sequence

Release → primera corrida mensual de los siete mercados de Sky → borrador → revisión del operador.

### Out-of-band coordination required

Ninguna: TASK-1863 en producción con flag ON desde 2026-10-02.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una edición de Sky contiene hechos AEO de los siete países, cada uno citando su run.
- [ ] Ningún texto, figura ni resumen promedia países.
- [ ] Un país sin corrida en la ventana aparece como límite de ese país.
- [ ] El modelo web y el plan llevan el mercado legible y pasan el gate client-fit.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/lib/efeonce-insights`
- Borrador de Sky en staging revisado por el operador

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada y espejada a `.codex/`.

## Follow-ups

- SEO por país para Sky (propiedades y targets por mercado).

## Open Questions

- ¿El informe de Sky muestra los siete países en un solo informe o uno por país? Propuesta: uno solo con comparativo.
