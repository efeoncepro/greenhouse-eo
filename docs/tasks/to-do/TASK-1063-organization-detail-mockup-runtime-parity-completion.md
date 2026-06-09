# TASK-1063 — Organization Detail mockup→runtime parity completion

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `agency|organization|ui|data|delivery|api|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1063-organization-detail-mockup-runtime-parity`
- Legacy ID: `supersedes TASK-1060`
- GitHub Issue: `none`

## Summary

Cierra los gaps reales entre el mockup aprobado `/agency/organizations/mockup/enterprise-detail` y el runtime individual `/agency/organizations/[id]` (`OrganizationEnterpriseWorkspaceRuntime`). **Supersede a TASK-1060** (Compact Signals Projection, deprecada por el operador 2026-06-09) absorbiendo su scope de projection del sidecar, y suma los gaps adicionales que el discovery destapó: sección de bloqueadores del ciclo de vida, fechas en señales/acciones, gráfico de delivery real (no proxy), recency por facet y acciones admin faltantes.

## Why This Task Exists

El runtime de TASK-1059 promovió el mockup enterprise por copy-and-patch, pero un diff section-by-section (2026-06-09, post-fix de los tabs vacíos) mostró que **varias piezas del mockup aprobado no se cablearon o quedaron como proxy honesto**, y que la projection parcial de compact-signals (TASK-1060, ahora deprecada) no expone bloqueadores ni fechas. El operador quiere paridad real con el mockup aprobado, sin reintroducir las decisiones de diseño deliberadas (ver Out of Scope). Como TASK-1060 quedó deprecada, esta task consolida el backend del sidecar + los gaps de UI en un solo contrato.

## Goal

- Sidecar `AccountSidecar` renderiza la sección **"Bloqueadores del ciclo de vida"** (badge + ítems + empty honesto) desde la projection.
- `CompactRecentSignal` / `CompactNextAction` llevan **fecha** y el sidecar la muestra ("hace X" / vencimiento).
- El canvas de Delivery grafica la **velocidad/throughput real** (ICO/delivery materializado), no el proxy revenue/margen; degrada honesto si no hay tendencia.
- El facet rail muestra **recency real por facet** donde exista (no "360/parcial").
- Las acciones admin del masthead faltantes (**"Agregar relación"**, **"Exportar snapshot"**) quedan implementadas o con estado honesto de "diferido".
- TASK-1060 queda formalmente deprecada/supersedida; su trabajo de projection/reliability/API-lane aún relevante se ejecuta acá.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` (bloqueadores del ciclo de vida)
- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` (delivery/ICO trend)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` (signal opcional)

Reglas obligatorias:

- **Projection server-side, read-light, cacheable.** El sidecar consume la projection prebuilt; nunca recomputa en JSX. Mantener el patrón `withSourceTimeout` + degradación honesta (`degradedMode`/estados `loading|empty|degraded|healthy`).
- **Anti silent-catch (contrato 360, esta sesión):** cualquier reader nuevo usa `observeAndRethrow`/`observeAndDegrade`, no `.catch(() => [])`.
- **NO duplicar Finance Clients** ni inventar source-of-truth financiero (boundary TASK-1059).
- **Honest degrade siempre:** sin datos → estado honesto declarado, nunca `0`/`—` ambiguo ni dato inventado.
- Copy es-CL vía `src/lib/copy/agency.ts` (`GH_ORGANIZATION_WORKSPACE`); cero `fontSize`/hex inline; primitives/tokens.

## Normative Docs

- `docs/tasks/in-progress/TASK-1059-organization-workspace-enterprise-detail-runtime.md` (runtime base + boundaries)
- `docs/tasks/in-progress/TASK-1061-organization-workspace-enterprise-tokenization-visual-baseline.md` (tokenización/baseline GVC — ortogonal, no tocar su scope de chrome)
- `docs/tasks/complete/TASK-1060-organization-workspace-compact-signals-projection.md` (deprecada — heredar scope de projection)
- Mockup vinculante: `src/views/greenhouse/organizations/mockup/OrganizationWorkspaceEnterpriseDetailMockupView.tsx` + `organization-workspace-enterprise-detail-data.ts`

## Dependencies & Impact

### Depends on

- `src/lib/organization-workspace/compact-signals.ts` + `compact-signals-types.ts` + `compact-signals-mappers.ts` (projection parcial existente, de TASK-1060)
- `src/lib/account-360/account-complete-360.ts` + facets (`delivery.ts` ICO/trend ya cableado esta sesión)
- `src/lib/client-lifecycle/` (`ClientLifecycleCase`, bloqueadores) [verificar shape de blockers]
- `greenhouse_serving` / BigQuery `ico_engine.metrics_by_organization` (delivery trend) [verificar disponibilidad de serie temporal por org]
- API `GET /api/organizations/[id]/workspace/compact-signals` (route existente)

### Blocks / Impacts

- `OrganizationEnterpriseWorkspaceRuntime.tsx` (sidecar, facet rail, delivery canvas, masthead)
- TASK-1059 (consume el runtime), TASK-1061 (baseline GVC mockup→runtime se beneficia de la paridad)
- **Supersede TASK-1060** (su projection se extiende acá; deprecar formalmente)

### Files owned

- `src/lib/organization-workspace/compact-signals.ts` (extender: blockers + fechas)
- `src/lib/organization-workspace/compact-signals-types.ts` (extender: `CompactLifecycleBlocker[]`, `occurredAt`/`dueDate`)
- `src/lib/organization-workspace/compact-signals-mappers.ts`
- `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx` (sidecar blockers + dates + facet recency + delivery chart + masthead actions)
- `src/views/greenhouse/organizations/AgencyOrganizationWorkspaceClient.tsx` (admin actions nuevas si aplican)
- `src/lib/copy/agency.ts` (copy es-CL nuevo)
- `scripts/frontend/scenarios/organization-workspace-enterprise-detail-runtime.scenario.ts` (GVC paridad)
- `src/lib/reliability/queries/*` (signal opcional de projection degraded, heredado de TASK-1060)
- `docs/tasks/complete/TASK-1060-*` (deprecación)

## Current Repo State

### Already exists

- Runtime `OrganizationEnterpriseWorkspaceRuntime.tsx` con `AccountSidecar` consumiendo `compactSignals` (health/readiness/recentSignals/nextActions/provenance) + fallback desde `data360`.
- Projection parcial `compact-signals.ts` con `lifecycleCase: ClientLifecycleCase | null` (pero sin `blockers[]` expuesto).
- Delivery facet con ICO real (rpa/otd/ftr/throughput) + tendencia económica como **proxy** en el chart (`DeliveryCanvas` "Tendencia operacional").
- Facet rail con frescura "360/parcial" (no recency real).
- `adminActions` del parent = Editar + Sync HubSpot (faltan Agregar relación / Exportar snapshot).

### Gap

- Sin sección de bloqueadores en el sidecar (ni `blockers[]` en la projection).
- Señales/acciones sin fecha.
- Delivery chart usa proxy revenue/margen, no la serie real de delivery.
- Facet rail sin recency real.
- Acciones admin "Agregar relación" / "Exportar snapshot" no implementadas.
- Texto de referencia/disclosure al pie del canvas de delivery ausente (menor).

<!-- ZONE 2 — PLAN MODE: la llena el agente que toma la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Deprecación TASK-1060 + consolidación de projection

- Marcar TASK-1060 `Lifecycle` deprecada/supersedida por TASK-1063 (nota + mover a `complete/` con marcador "deprecated/superseded") + sincronizar README/registry.
- Inventario de lo que TASK-1060 dejó hecho (projection parcial, route, types) que se hereda acá.

### Slice 1 — Bloqueadores del ciclo de vida (projection + sidecar)

- Extender `compact-signals-types.ts` con `CompactLifecycleBlocker { id, label, severity, since? }` + `blockers: CompactLifecycleBlocker[]`.
- Derivar blockers del `ClientLifecycleCase` activo en `compact-signals.ts` (reader canónico de client-lifecycle; `observeAndDegrade`).
- Render en `AccountSidecar`: sección "Bloqueadores del ciclo de vida" con badge count + ítems (status dot + label + helper) + **empty honesto** ("Sin bloqueadores activos").

### Slice 2 — Fechas en señales recientes + próximas acciones

- Agregar `occurredAt`/`dueDate` (o equivalente) a `CompactRecentSignal` / `CompactNextAction` en types + mappers.
- Render relativo ("hace X" / vencimiento) en el sidecar con `formatDateTime`/helper de tiempo; degradar si no hay fecha.

### Slice 3 — Delivery chart real (no proxy)

- Reemplazar la tendencia revenue/margen del `DeliveryCanvas` por la **serie real de delivery** (throughput/committed-vs-delivered) desde el delivery facet / `ico_engine.metrics_by_organization`.
- Si no hay serie temporal materializada → `PartialState` honesto (no proxy disfrazado). Quitar/ajustar el copy "proxy ejecutivo".

### Slice 4 — Recency por facet en el facet rail

- Exponer last-updated por facet (desde `_meta`/serving) y mostrarlo en el rail donde exista; fallback honesto a frescura cuando no haya timestamp.

### Slice 5 — Acciones admin faltantes del masthead

- "Agregar relación" y "Exportar snapshot": implementar el flujo real si el endpoint existe, o dejar la acción con estado honesto "diferido/coming soon" gateada por capability admin (no botón muerto).
- Texto de referencia/disclosure al pie del canvas de delivery (menor).

### Slice 6 — Reliability + API parity (heredado de TASK-1060)

- Signal opcional `agency/organization.workspace.compact_signals_degraded` si aplica (heredar diseño de TASK-1060).
- Confirmar la app-lane/Product API del compact-signals si TASK-1060 la tenía planificada y sigue siendo relevante.

### Slice 7 — GVC paridad mockup→runtime + cierre

- Scenario GVC del runtime con frames del sidecar (con/ sin blockers), delivery chart, facet rail; comparar contra el mockup (`fe:capture:diff` baseline si aplica con TASK-1061).
- Cierre documental (changelog, Handoff, README, ADR/projection doc si cambia contrato).

## Out of Scope

**Decisiones de diseño deliberadas — NO "arreglar":**

- Finance: tabla de facturas/aging del mockup → el runtime usa profitabilidad por cliente + AR aging (boundary TASK-1059 "no duplica Finance Clients"). NO reintroducir invoice table.
- 4ª métrica top "Saldo pendiente" (vs "Spaces activos" del mockup) — señal financiera real, se mantiene.
- `FacetRecordsSection` (tablas reales por facet) — el runtime va más profundo que el mockup; es mejora, no se revierte al grid de evidencia.
- `DeliverySummaryGrid` (4 KPIs delivery) — extra del runtime, se mantiene.
- FTR% → RpA% en la tabla de proyectos — RpA es la métrica ICO real, se mantiene.
- Tokenización/chrome/density/baseline = **TASK-1061** (no tocar su scope).
- Fix de tabs vacíos (anti silent-catch) = **TASK-1059** (ya hecho esta sesión).

## Detailed Spec

Referencia vinculante: el mockup `OrganizationWorkspaceEnterpriseDetailMockupView.tsx` define la forma visual de cada sección (sidecar blockers, fechas, chart de pipeline). Mapear cada sección del mockup a su fuente real:

- **Bloqueadores:** mockup `Bloqueadores del ciclo de vida` (badge + 2 ítems con status). Fuente real = `ClientLifecycleCase` blockers (verificar shape en `src/lib/client-lifecycle/types.ts`; si los blockers no están modelados como array, derivarlos de los checklist items bloqueantes / `blocked` state del caso).
- **Fechas:** mockup muestra fechas en señales y acciones; mapear a `occurredAt` (de la señal upstream) y `dueDate` (de la acción / checklist item due).
- **Delivery trend:** mockup "Velocidad de pipeline" (committed vs delivered, 6m). Fuente = serie mensual de throughput/committed por org desde el ICO materializer; si solo hay el período actual, degradar honesto.
- **Recency facet:** `data360._meta` por facet o `materialized_at` de las tablas serving.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (deprecación 1060) primero — limpia el ownership de la projection.
- Slice 1 → 2 sobre la projection: types primero, luego mappers/reader, luego render. Slice 1 y 2 pueden compartir PR (mismo contrato `compact-signals-types.ts`).
- Slice 3 (delivery chart) independiente, puede correr en paralelo a 1/2.
- Slice 4 / 5 / 6 independientes entre sí, después de 1-3.
- Slice 7 (GVC + cierre) al final, requiere 1-5 mergeados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Projection nueva (blockers) lanza y rompe el sidecar | UI | low | `observeAndDegrade` + `degradedMode` honesto; el sidecar ya tiene fallback desde `data360` | sin signal — emerge en `_meta`/logs |
| Serie de delivery trend no existe por org → chart vacío | data/delivery | medium | honest `PartialState`, no proxy disfrazado | reusar signal de ICO materializer si aplica |
| Acción admin "Exportar snapshot" sin endpoint → botón muerto | UI/api | medium | gatear por capability + estado "diferido" honesto, no CTA falso | n/a |
| Drift de contrato con TASK-1061 (chrome) al tocar el sidecar/rail | UI | low | coordinar boundary: 1063 = datos/secciones; 1061 = tokens/chrome/density | n/a |

### Feature flags / cutover

Sin flag — cambios aditivos de UI/projection (read-light, gateados por la projection existente + capabilities admin). Cutover inmediato; revert = revert PR + redeploy. La projection degrada honesto, así que un fallo de datos no rompe la vista.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | revert deprecación (mover 1060 de vuelta) | <5 min | sí |
| 1-2 | revert PR projection+sidecar | <10 min | sí |
| 3 | revert PR delivery chart (vuelve al proxy) | <10 min | sí |
| 4-5 | revert PR | <10 min | sí |
| 6 | disable signal / revert reader | <10 min | sí |
| 7 | n/a (docs/GVC) | — | sí |

### Production verification sequence

1. Local: `pnpm local:check` + GVC runtime (`fe:capture organization-workspace-enterprise-detail-runtime`) con un org rico (Sky `org-b9977f96...`) y uno sin lifecycle case (empty honesto).
2. Verificar sidecar: blockers con/ sin caso activo; señales con fecha; delivery chart real o degradado honesto.
3. Deploy a develop/staging; verificar contra org real con lifecycle case activo.
4. Confirmar 0 errores en `_meta` de la projection + signal (si existe) en steady.

### Out-of-band coordination required

N/A — repo-only change. (Si "Exportar snapshot" necesita un endpoint/Product API nuevo, esa pieza puede derivar a su propia task.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El sidecar renderiza "Bloqueadores del ciclo de vida" con badge count + ítems cuando hay caso activo con blockers, y empty honesto ("Sin bloqueadores activos") cuando no.
- [ ] `CompactRecentSignal` y `CompactNextAction` exponen fecha y el sidecar la muestra (relativa); degrada si falta.
- [ ] El canvas de Delivery grafica la serie real de delivery (throughput/committed) cuando existe; `PartialState` honesto cuando no — sin proxy revenue/margen disfrazado.
- [ ] El facet rail muestra recency real por facet donde exista; fallback honesto cuando no hay timestamp.
- [ ] Las acciones admin "Agregar relación" y "Exportar snapshot" están implementadas o con estado honesto "diferido" gateado por capability — sin botón muerto.
- [ ] TASK-1060 queda `complete`/deprecada con nota de supersesión; README/registry sincronizados.
- [ ] Las secciones explícitamente Out of Scope NO fueron modificadas (Finance boundary, 4ª métrica, FacetRecords, etc).
- [ ] GVC desktop+mobile con evidencia de paridad mockup↔runtime; `qualityFindings` sin errores.
- [ ] `pnpm lint` 0 · `pnpm tsc --noEmit` 0 · tests focales verdes.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (focal: `src/lib/organization-workspace`, `src/lib/account-360`)
- `pnpm fe:capture organization-workspace-enterprise-detail-runtime --env=local` + lectura de frames (sidecar/delivery/rail)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1059/1060/1061)
- [ ] TASK-1060 deprecada formalmente + projection doc (`GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`) actualizada con el contrato extendido (blockers/dates)

## Follow-ups

- Si "Exportar snapshot" requiere un Product API / app-lane nuevo, derivar a task propia.
- Baseline GVC durable mockup→runtime: coordinar con TASK-1061.

## Open Questions

- ¿Los bloqueadores del ciclo de vida se modelan como array en `ClientLifecycleCase` o se derivan de los checklist items bloqueantes? (verificar en discovery).
- ¿Existe serie temporal de delivery throughput por org en el materializer, o solo período actual? (define si Slice 3 grafica o degrada).
- ¿"Agregar relación" / "Exportar snapshot" tienen endpoint existente, o se difieren con estado honesto?
