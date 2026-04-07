# TASK-279 — Labor Cost Attribution Pipeline: cerrar brecha entre payroll y client_economics

<!-- ===================================================================
     ZONE 0 — IDENTITY & TRIAGE
     =================================================================== -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance, payroll, cost-attribution`
- Blocked by: `none`
- Branch: `task/TASK-279-labor-cost-attribution-pipeline`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Los margenes de rentabilidad por organizacion muestran "—" en la vista Organization Detail > Finanzas porque el pipeline de cost attribution no fluye correctamente desde payroll hasta `client_economics`. Los datos de costo laboral EXISTEN en las tablas serving (`member_capacity_economics`, `client_labor_cost_allocation`) pero no llegan a `client_economics` porque: (1) `computeCommercialCostAttributionForPeriod` silencia errores con `.catch(() => [])`, (2) los snapshots se materializaron antes de que los costos estuvieran disponibles y quedaron stale con costos = 0, y (3) no hay re-materializacion automatica cuando los datos de costo cambian.

## Why This Task Exists

Sky Airline tiene 3 team_members asignados (Andres Carlosama, Daniela Ferreira, Melkin Hernandez) con ~$2.5M CLP en costos laborales para marzo 2026 y $6.9M CLP en revenue. Sin embargo, la vista de Finanzas muestra margen "—" porque `greenhouse_finance.client_economics` tiene `direct_costs_clp = 0`. La cadena es:

1. `greenhouse_payroll.payroll_entries` — OK, tiene datos (Deel USD convertidos a CLP)
2. `greenhouse_serving.member_capacity_economics` — OK, tiene `total_labor_cost_target` para los 3 members (mar-2026)
3. `greenhouse_serving.client_labor_cost_allocation` — OK, tiene allocacion por client_id (Sky = hubspot-company-30825221458)
4. `greenhouse_serving.commercial_cost_attribution` — VACIA (0 rows). El pipeline `computeCommercialCostAttributionForPeriod` deberia materializarla pero falla silenciosamente
5. `greenhouse_finance.client_economics` — Tiene snapshot con costos = 0 porque se computo cuando no habia datos de costo disponibles

El resultado es que las decisiones de negocio se toman con margenes invisibles, cuando la data para calcularlos ya existe.

## Goal

- `client_economics` refleja costos laborales reales derivados de payroll + FTE allocation
- Margenes bruto y neto se muestran correctamente en Organization Detail > Finanzas
- El pipeline se re-ejecuta automaticamente cuando cambian datos de payroll o asignaciones
- Los errores en el pipeline de cost attribution se logean en vez de silenciarse

<!-- ===================================================================
     ZONE 1 — CONTEXT & CONSTRAINTS
     =================================================================== -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- Costos fluyen via serving tables, no queries directos a payroll desde finance
- `sanitizeSnapshotForPresentation` es un guardrail valido — no debe removerse, los datos deben llegar correctos
- Outbox events deben triggerar re-materializacion cuando payroll cierra un periodo

## Normative Docs

| Documento | Relevancia |
|-----------|-----------|
| `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` | P&L engine, client_economics contract |
| `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` | Projection materialization patterns |
| `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` | Serving layer conventions |

## Dependencies & Impact

### Depende de

- `greenhouse_serving.member_capacity_economics` — tabla/view que materializa costo laboral total por member/periodo (ya existe, 42 rows)
- `greenhouse_serving.client_labor_cost_allocation` — tabla/view que distribuye costo laboral por client_id segun FTE (ya existe, 5 rows)
- `greenhouse_payroll.payroll_entries` — fuente de costo (ya existe, datos presentes)
- `greenhouse_finance.exchange_rates` — conversion USD → CLP para Deel contractors (ya existe)

### Impacta a

- Organization Detail > Finanzas (tab): margenes dejaran de mostrar "—"
- Organization Detail > Operaciones (header KPIs): Equipo mostrara FTE real
- Account 360 economics facet: `grossMarginPct` tendra valores reales
- Finance Intelligence dashboard: client economics con costos reales
- Cron `economics-materialize`: debe re-materializar cuando payroll cambia

### Archivos owned

- `src/lib/commercial-cost-attribution/member-period-attribution.ts`
- `src/lib/finance/postgres-store-intelligence.ts` (funcion `computeClientEconomicsSnapshots`)
- `src/lib/finance/client-economics-presentation.ts`
- `src/app/api/cron/economics-materialize/route.ts`
- `src/lib/sync/projections/client-economics.ts`

## Current Repo State

### Already exists

- `greenhouse_serving.member_capacity_economics` — 42 rows, tiene `total_labor_cost_target` para Sky members marzo 2026
- `greenhouse_serving.client_labor_cost_allocation` — 5 rows, tiene allocacion Sky con `allocated_labor_clp`
- `greenhouse_serving.commercial_cost_attribution` — tabla existe pero 0 rows (nunca materializada)
- `src/lib/commercial-cost-attribution/member-period-attribution.ts` — `computeCommercialCostAttributionForPeriod()` con `.catch(() => [])` en ambos queries
- `src/lib/commercial-cost-attribution/store.ts` — `ensureCommercialCostAttributionSchema()`, upsert, read, purge
- `src/lib/finance/postgres-store-intelligence.ts` — `computeClientEconomicsSnapshots()` con `try/catch` silencioso en `readCommercialCostAttributionByClientForPeriod`
- `src/lib/finance/client-economics-presentation.ts` — `sanitizeSnapshotForPresentation()` anula margenes cuando costos = 0 (`lacksCostCoverage`)
- `src/app/api/cron/economics-materialize/route.ts` — cron que invoca `computeClientEconomicsSnapshots`

### Gap

- **Error silencing**: `.catch(() => [])` en `computeCommercialCostAttributionForPeriod` (lineas 191, 221) y `try/catch { commercialCostRows = [] }` en `computeClientEconomicsSnapshots` (linea 534) ocultan fallos del pipeline
- **No re-materializacion reactiva**: cuando payroll cierra un periodo o se actualiza `member_capacity_economics`, no se triggerea re-compute de `client_economics`
- **Snapshots stale**: snapshots de `client_economics` se computan una vez y no se invalidan cuando llegan datos de costo nuevos
- **commercial_cost_attribution vacia**: nunca se materializo, lo que impide que `readCommercialCostAttributionForPeriod` use el fast path (stored rows)

<!-- ===================================================================
     ZONE 2 — DISCOVERY LOG
     Se llena al tomar la task, no al crearla.
     =================================================================== -->

<!-- ===================================================================
     ZONE 3 — SCOPE & SPEC
     =================================================================== -->

## Scope

### Slice 1 — Remove silent error swallowing, add structured logging

Reemplazar `.catch(() => [])` en `computeCommercialCostAttributionForPeriod` con logging real. Reemplazar `try/catch { commercialCostRows = [] }` en `computeClientEconomicsSnapshots` con log + fallback. El agente que toma la task debe poder diagnosticar fallos sin acceso a la DB.

**Entregable**: commit con logging estructurado (console.error con contexto: member_id, period, error message).

### Slice 2 — Materialize commercial_cost_attribution for all periods with data

Ejecutar `materializeCommercialCostAttributionForPeriod` para todos los periodos que tienen datos en `member_capacity_economics`. Esto llena `greenhouse_serving.commercial_cost_attribution` y habilita el fast-path de lectura.

**Entregable**: script o endpoint que materializa todos los periodos pendientes + verificacion de que `commercial_cost_attribution` tiene rows.

### Slice 3 — Re-compute client_economics snapshots with labor costs

Triggear `computeClientEconomicsSnapshots` para los periodos afectados (feb-2026, mar-2026, abr-2026 al menos). Los snapshots deben ahora incluir `direct_costs_clp > 0` para clientes con team_members asignados.

**Entregable**: client_economics de Sky Airline marzo 2026 muestra `direct_costs_clp ~= 2,511,764` (suma de los 3 members) y `gross_margin_percent ~= 0.636`.

### Slice 4 — Reactive re-materialization via outbox events

Registrar eventos outbox que triggeren re-materializacion de `commercial_cost_attribution` y `client_economics` cuando:
- `payroll.period.closed` — un periodo de nomina se cierra
- `payroll.entry.updated` — una entry de payroll cambia
- `team.assignment.changed` — un `client_team_assignment` cambia

**Entregable**: projection en `src/lib/sync/projections/client-economics.ts` maneja los nuevos eventos.

### Slice 5 — Add economics-materialize to cron schedule

Asegurar que el cron `economics-materialize` re-ejecuta periodicamente (no solo on-demand). Si ya corre, verificar que invoca el pipeline completo incluyendo `materializeCommercialCostAttributionForPeriod`.

**Entregable**: cron materializa costos laborales automaticamente sin intervencion manual.

## Out of Scope

- Cambios a `sanitizeSnapshotForPresentation` — la logica de "ocultar margenes sin costos" es correcta como guardrail; los datos deben llegar bien
- Rediseno del modelo de cost attribution — el modelo actual (member economics → FTE allocation → client attribution) es correcto
- Conversiones de moneda — ya funciona (Deel USD → CLP via exchange_rates)
- UI changes en Organization Detail — la vista ya muestra los datos correctamente cuando estan disponibles
- Historical backfill para periodos anteriores a 2025-11 — esos periodos no tienen `member_capacity_economics`

## Detailed Spec

### Cadena de datos (estado actual diagnosticado)

```
payroll_entries (OK)
  → [cron: capacity-materialize] →
member_capacity_economics (OK, 42 rows)
  → [computeCommercialCostAttributionForPeriod] →
commercial_cost_attribution (VACIA — .catch(() => []) silencia error)
  → [readCommercialCostAttributionByClientForPeriod] →
computeClientEconomicsSnapshots (recibe [], costos = 0)
  → [MERGE into client_economics] →
client_economics (snapshot stale, costos = 0)
  → [sanitizeSnapshotForPresentation] →
UI muestra "—" (correcto dado costos = 0)
```

### Cadena de datos (estado target)

```
payroll_entries
  → [cron: capacity-materialize] →
member_capacity_economics
  → [materializeCommercialCostAttributionForPeriod] →
commercial_cost_attribution (materializada, con rows)
  → [readCommercialCostAttributionByClientForPeriod] →
computeClientEconomicsSnapshots (recibe costos reales)
  → [MERGE into client_economics] →
client_economics (snapshot con costos laborales reales)
  → [sanitizeSnapshotForPresentation] →
UI muestra margenes reales (ej: 63.6% para Sky)
```

### Datos de verificacion para Sky Airline, marzo 2026

| Member | Labor cost CLP | FTE | Client |
|--------|---------------|-----|--------|
| andres-carlosama | 745,452 | 1.0 | hubspot-company-30825221458 |
| daniela-ferreira | 1,044,346 | 1.0 | hubspot-company-30825221458 |
| melkin-hernandez | 721,967 | 1.0 | hubspot-company-30825221458 |
| **Total** | **2,511,764** | **3.0** | |

Revenue: $6,902,000 CLP
Expected gross margin: ($6,902,000 - $2,511,764) / $6,902,000 = **63.6%**

<!-- ===================================================================
     ZONE 4 — ACCEPTANCE & CLOSURE
     =================================================================== -->

## Acceptance Criteria

- [ ] `greenhouse_serving.commercial_cost_attribution` tiene rows para periodos feb-2026 en adelante
- [ ] `greenhouse_finance.client_economics` para Sky Airline marzo 2026 muestra `direct_costs_clp >= 2,400,000`
- [ ] Organization Detail > Finanzas > Sky Airline muestra "Margen bruto prom." con un porcentaje real (no "—")
- [ ] Organization Detail > Finanzas > tabla Rentabilidad por Space muestra costos laborales reales
- [ ] Errores en `computeCommercialCostAttributionForPeriod` se logean con contexto (no se silencian)
- [ ] Cuando se cierra un periodo de payroll, `client_economics` se re-materializa automaticamente
- [ ] `pnpm build` y `pnpm lint` pasan sin errores
- [ ] Tests existentes en `client-economics-presentation.test.ts` siguen pasando

## Verification

```bash
pnpm tsc --noEmit
pnpm lint
pnpm test -- src/lib/finance/client-economics-presentation.test.ts
pnpm test -- src/lib/commercial-cost-attribution/

# E2E en staging:
pnpm staging:request '/api/organizations/org-b9977f96-f7ef-4afb-bb26-7355d78c981f/finance?year=2026&month=3' --pretty
# → avgGrossMarginPercent ~= 0.636, avgNetMarginPercent ~= 0.636
# → clients[0].directCostsClp >= 2400000
```

## Closing Protocol

1. Mover task de `in-progress/` a `complete/`
2. Actualizar `docs/tasks/README.md`
3. Registrar en `Handoff.md` y `changelog.md`
4. Verificar impacto en Account 360 economics facet (debe reflejar costos actualizados)

## Follow-ups

- Materializar `commercial_cost_attribution` para periodos historicos (2025-11 a 2026-01) si se requiere analisis retroactivo
- Considerar alerta en Admin Ops cuando `client_economics` tiene costos = 0 para clientes con team_members asignados
- Evaluar si `sanitizeSnapshotForPresentation` necesita un tercer estado ("costos parciales") para clientes donde solo hay labor pero no overhead
