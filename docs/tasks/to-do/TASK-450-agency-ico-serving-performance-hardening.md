# TASK-450 — Agency ICO Serving & Performance Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-450-agency-ico-serving-performance-hardening`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Endurecer `Agency > ICO Engine` para que deje de sentirse lenta por composición de lecturas pesadas, bootstrap de infraestructura en el hot path y fetches encadenados. La lane debe bajar la latencia real y percibida sin cambiar fórmulas ICO, sin recalcular métricas en la UI y sin romper la cadena de fallback serving -> materialized -> live.

## Why This Task Exists

Hoy la tab `ico` de Agency se carga on-demand desde el cliente y no trae un snapshot server-side inicial. Al abrirla, `AgencyWorkspace` dispara `GET /api/ico-engine/metrics/agency`, y esa route:

- ejecuta `ensureIcoEngineInfrastructure()` en el camino interactivo del usuario
- compone múltiples lecturas paralelas entre BigQuery y PostgreSQL
- puede caer a un fallback más caro en `readAgencyPerformanceReport()`
- deja la tendencia de RpA para una segunda llamada posterior desde `AgencyIcoEngineView`

El resultado no es un bug semántico sino un costo estructural acumulado: tiempo de red + tiempo de BigQuery + tiempo de Postgres + posible cold start + un roundtrip adicional para el chart. La experiencia se degrada justo en una de las vistas más ejecutivas del portal.

La solución correcta no es “hacer live compute más rápido” ni recalcular cosas en el frontend. La solución debe endurecer el serving interactivo: observabilidad de latencia, hot path sin bootstrap infra, menos roundtrips y preferencia explícita por read models/materializaciones aptas para consumo de UI.

## Goal

- Quitar trabajo de bootstrap/inicialización de infraestructura del hot path interactivo de `Agency > ICO Engine`.
- Reducir la latencia percibida y real de la tab con una estrategia serving-first, cacheable y auditable.
- Dejar explícito y robusto el contrato de fallback e invalidación para Agency ICO sin cambiar las fórmulas del engine.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`

Reglas obligatorias:

- Las métricas ICO se leen desde el engine y sus materializaciones/read models; nunca se recalculan inline en la UI.
- Ningún GET user-facing del portal debe ejecutar DDL, introspección de `INFORMATION_SCHEMA` o recreación de views como parte del hot path normal.
- La degradación debe seguir siendo explícita y auditable: `serving -> BigQuery materialized -> live compute`, sin drift semántico entre capas.
- Si se introduce cache o un read model adicional, su invalidación debe quedar anclada a la materialización/reactive pipeline existente y no a refresh manual opaco.

## Normative Docs

- `docs/documentation/delivery/motor-ico-metricas-operativas.md`

## Dependencies & Impact

### Depends on

- `src/app/api/ico-engine/metrics/agency/route.ts`
- `src/app/api/ico-engine/trends/rpa/route.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/performance-report.ts`
- `src/lib/ico-engine/ai/read-signals.ts`
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
- `src/views/agency/AgencyWorkspace.tsx`
- `src/views/agency/AgencyIcoEngineView.tsx`
- `services/ico-batch/`

### Blocks / Impacts

- `docs/tasks/in-progress/TASK-237-agency-ico-engine-tab-ux-redesign.md` — debe consumir una base más rápida, pero esta lane no sustituye el rediseño visual.
- `docs/tasks/to-do/TASK-160-agency-enterprise-hardening.md` — esta task adelanta una porción acotada del hardening de serving/observabilidad para una surface crítica.
- `src/views/greenhouse/agency/space-360/tabs/IcoTab.tsx` — puede beneficiarse si readers compartidos quedan más robustos.
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` y consumers Nexa/ICO que reutilicen readers compartidos.

### Files owned

- `src/app/api/ico-engine/metrics/agency/route.ts`
- `src/app/api/ico-engine/trends/rpa/route.ts`
- `src/lib/ico-engine/schema.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/performance-report.ts`
- `src/views/agency/AgencyWorkspace.tsx`
- `src/views/agency/AgencyIcoEngineView.tsx`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/documentation/delivery/motor-ico-metricas-operativas.md`

## Current Repo State

### Already exists

- `AgencyWorkspace` hace lazy fetch de la tab ICO recién al activarse.
- `GET /api/ico-engine/metrics/agency` compone snapshots, performance report, signals AI y summary LLM en una sola respuesta.
- `readAgencyPerformanceReport()` ya tiene fallback `greenhouse_serving -> BigQuery materialized -> live`.
- `GET /api/ico-engine/trends/rpa` sirve la tendencia en una segunda llamada separada.
- `Greenhouse_ICO_Engine_v1.md` ya documenta una cadena de fallback y reconoce explícitamente el costo del live compute.

### Gap

- `ensureIcoEngineInfrastructure()` sigue en rutas user-facing, aun cuando su trabajo es de bootstrap y no de serving interactivo.
- No existe budget/telemetría clara por etapa para saber cuánto tarda cada segmento del request.
- La tab requiere al menos dos roundtrips para verse “completa” (`metrics/agency` + `trends/rpa`).
- La experiencia default sigue anclada al mes actual del calendario del browser, aunque el serving más confiable suele vivir en el último período materializado.
- No existe todavía un contrato explícito de cache/invalidation para Agency ICO como surface interactiva.

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

### Slice 1 — Latency observability and budget

- Instrumentar `Agency ICO` con timings por segmento (`Server-Timing`, structured logs o equivalente) para separar:
  - auth/context
  - infrastructure bootstrap
  - snapshots
  - performance report
  - AI summaries
  - trend payload
- Formalizar un budget de latencia para la surface interactiva y documentar qué capa lo rompe cuando se degrada.
- Extender el diagnóstico operativo existente del engine para que la investigación de performance no dependa de inspección manual de código.

### Slice 2 — Hot path hardening and request topology

- Sacar `ensureIcoEngineInfrastructure()` de `GET /api/ico-engine/metrics/agency` y `GET /api/ico-engine/trends/rpa`.
- Reubicar el bootstrap de infraestructura a un carril no interactivo: deploy, cron, diagnostics o admin-only health path.
- Reducir roundtrips innecesarios de Agency ICO:
  - bundlear el trend en el payload principal, o
  - prefetch/paralelizar sin bloquear el first meaningful paint
- Evaluar el default period del tab para preferir el último snapshot materializado cuando eso reduzca fallback cost y ambigüedad.

### Slice 3 — Serving-first read path and cache contract

- Endurecer la lectura principal para que Agency ICO consuma serving/read models aptos para UI antes de tocar BigQuery interactivo.
- Diseñar e implementar el contrato de cache/invalidation por período/tenant para Agency ICO.
- Mantener `live=true` solo como carril explícito de recovery/debug o fallback consciente, no como dependencia normal del usuario final.
- Si hace falta una proyección/read model nueva para `rpa_trend` o un payload consolidado de Agency ICO, materializarla con invalidación alineada al pipeline existente.

## Out of Scope

- Rediseñar la jerarquía visual o el layout de la tab ICO (`TASK-237` cubre UX/redesign).
- Cambiar fórmulas, thresholds o semántica de métricas del ICO Engine.
- Reescribir Nexa Insights, prompts LLM o la lane advisory más allá de cómo se cargan/entregan.
- Convertir la tab a live compute por defecto.

## Detailed Spec

La solución debe respetar esta dirección:

1. **Infra bootstrap fuera del request del usuario**  
   `ensureIcoEngineInfrastructure()` es bootstrap resiliente, no serving interactivo. Si el engine requiere esa garantía, debe vivir en un carril operativo separado.

2. **Serving interactivo con capas explícitas**  
   Agency ICO debe leer primero desde serving/Postgres o snapshots materializados listos para consumo. BigQuery interactivo queda como fallback auditable, no como costo normal en cada apertura.

3. **Contrato único de payload**  
   La tab no debería depender de un fetch inicial “principal” y otro fetch “secundario” que llega después para sentirse completa si ambos pertenecen a la misma narrativa operativa del período.

4. **Medición antes de optimizar a ciegas**  
   La task debe dejar diagnósticos que permitan distinguir si la latencia viene de:
   - cold start / auth
   - bootstrap infra
   - BigQuery materialized read
   - BigQuery live fallback
   - PostgreSQL serving
   - serialización JSON / payload size
   - waterfall client-side

5. **Invalidación y freshness defendibles**  
   Si se cachea o se materializa más serving, la frescura debe depender de las materializaciones/reactive projections del engine, no de heurísticas temporales sueltas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GET /api/ico-engine/metrics/agency` ya no ejecuta `ensureIcoEngineInfrastructure()` en el hot path user-facing.
- [ ] `GET /api/ico-engine/trends/rpa` ya no ejecuta `ensureIcoEngineInfrastructure()` en el hot path user-facing.
- [ ] La surface Agency ICO expone timings o diagnósticos suficientes para distinguir cuánto tarda cada segmento principal del request.
- [ ] La tab ICO ya no depende de un waterfall de dos requests seriales para llegar a su estado operativo principal.
- [ ] El default path de Agency ICO prioriza serving/materialized data antes de live compute y eso queda documentado.
- [ ] El contrato de cache o invalidación de Agency ICO queda explícito y alineado al pipeline de materialización existente.
- [ ] La documentación de arquitectura/funcional del ICO Engine queda actualizada con la nueva topología de serving interactivo.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual en `Agency > ICO Engine` comparando primera carga, reload y navegación desde `Pulse`
- revisión de logs/timings para confirmar que el hot path ya no ejecuta bootstrap infra

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/Greenhouse_ICO_Engine_v1.md` y `docs/documentation/delivery/motor-ico-metricas-operativas.md` quedaron sincronizados con el serving path final

## Follow-ups

- `docs/tasks/in-progress/TASK-237-agency-ico-engine-tab-ux-redesign.md` — consumir la surface ya endurecida sin mezclar rediseño y performance.
- `docs/tasks/to-do/TASK-160-agency-enterprise-hardening.md` — absorber el patrón resultante de cache/read model/observabilidad hacia otras surfaces Agency.
- evaluar un follow-on específico si el `rpa_trend` requiere proyección propia en `greenhouse_serving` en vez de bundling en el payload principal.

## Open Questions

- ¿El período default de Agency ICO debe seguir siendo “mes actual” o pasar al último período materializado por defecto?
- ¿La tendencia de RpA debe quedar dentro del payload principal de Agency ICO o vivir como recurso separado pero prefetcheado/streamed?
- ¿Conviene publicar un read model único de Agency ICO en `greenhouse_serving` o endurecer por etapas (`performance report`, `rpa trend`, `ai summaries`)?
