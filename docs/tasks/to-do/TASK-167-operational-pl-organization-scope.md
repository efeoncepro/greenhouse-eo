## Delta 2026-04-02
- `scope_type = 'organization'` ya existe en el repo real y quedó reforzado por `TASK-192` con inputs/materializers org-aware y consumers organization-first. Esta task debe tratarse como desactualizada y candidata a cierre/reclasificación.

# TASK-167 - Operational P&L: Organization Scope Materialization

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Bajo` |
| Status real | `Diseño` |
| Domain | Cost Intelligence / Account 360 |
| Sequence | Después de TASK-162 (commercial cost attribution) |

## Summary

`materializeOperationalPl()` produce snapshots con `scope_type = 'client'` solamente. El modelo canónico 360 define que todas las empresas son organizaciones (`greenhouse_core.organizations`) con tipos (`client`, `supplier`, `internal`, `partner`). Los snapshots deben materializarse también a nivel `scope_type = 'organization'` para que las vistas de Organization 360, Agency Intelligence y cualquier consumer que opere a nivel organización tenga acceso directo sin necesidad de resolver la cadena org→spaces→clients manualmente.

## Why This Task Exists

### Problema actual

```
Org 360 View necesita KPIs financieros de Sky Airline
  → busca scope_type='organization', scope_id='org-b9977f96-...'
  → NO ENCUENTRA (no existe)
  → workaround: buscar spaces de la org → client_ids → scope_type='client'
  → funciona pero es frágil y duplica lógica en cada consumer
```

### Modelo canónico

```
greenhouse_core.organizations (raíz de toda empresa)
  ├── tipo: client, supplier, internal, partner
  ├── tiene 1..N spaces (cada uno con client_id)
  └── los snapshots de P&L deberían existir a ESTE nivel

greenhouse_serving.operational_pl_snapshots
  ├── scope_type = 'client'        ✓ existe hoy
  ├── scope_type = 'space'         ✓ existe hoy (parcial)
  ├── scope_type = 'organization'  ✗ NO EXISTE ← esta task
  └── scope_id = organization_id
```

### Consumers que se benefician

| Consumer | Hoy | Con org scope |
|----------|-----|---------------|
| **Org 360 View** | Workaround via spaces→clients | Lectura directa por organization_id |
| **Agency Space 360** | Lee por client | Puede agregar a nivel org |
| **Agency Economics** | Lee por client | Agrupa orgs con múltiples spaces |
| **Organization Executive projection** | Recomputa | Lee materializado |
| **Nexa tools** | N/A | Puede responder "¿cómo le va a Sky Airline?" directo |

## Dependencies & Impact

- **Depende de:**
  - TASK-162 (commercial cost attribution) — ya complete
  - `compute-operational-pl.ts` — función `materializeOperationalPl()`
  - Mapping org→spaces→clients en `greenhouse_core`
- **Impacta a:**
  - Org 360 View — simplifica KPI resolution
  - Agency Economics — puede agregar por org
  - Cualquier future consumer que opere a nivel organización

## Scope

### Slice 1 — Materializar org-level snapshots (~2h)

En `materializeOperationalPl(year, month)`:

1. Después de materializar snapshots por client, agregar paso de aggregation:
   ```
   Para cada organization con al menos 1 client snapshot:
     - SUM(revenue_clp) de todos sus clients
     - SUM(labor_cost_clp, direct_expense_clp, overhead_clp, total_cost_clp)
     - Weighted AVG(gross_margin_pct) por revenue
     - SUM(headcount_fte)
     - scope_type = 'organization'
     - scope_id = organization_id
     - scope_name = organization_name
   ```

2. Upsert en `operational_pl_snapshots` con el `scope_type = 'organization'`

3. El mapping org→clients viene de:
   ```sql
   SELECT o.organization_id, o.organization_name, s.client_id
   FROM greenhouse_core.organizations o
   JOIN greenhouse_core.spaces s ON s.organization_id = o.organization_id AND s.active = TRUE
   WHERE s.client_id IS NOT NULL
   ```

### Slice 2 — Simplificar consumers (~1h)

1. **Org 360 View**: cambiar de workaround `spaces→clients→aggregate` a lectura directa `scope_type='organization', scope_id=org_id`
2. **Agency Economics**: si agrupa por org, usar org snapshots directamente

### Slice 3 — Reactive wiring (~30min)

La projection `operational-pl` ya se ejecuta reactivamente. Solo necesita que la función `materializeOperationalPl` incluya el paso de org aggregation — no se necesita nueva projection.

## Acceptance Criteria

- [ ] `materializeOperationalPl()` produce snapshots `scope_type='organization'` aggregando clients por org
- [ ] Org 360 View lee KPIs directamente del snapshot por `organization_id`
- [ ] `pnpm build` pasa
- [ ] `pnpm test` pasa

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/cost-intelligence/compute-operational-pl.ts` | Agregar org aggregation paso |
| `src/views/greenhouse/organizations/OrganizationView.tsx` | Simplificar KPI fetch |
| `src/app/api/finance/intelligence/operational-pl/route.ts` | Ya soporta `scope=organization` |
