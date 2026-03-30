# TASK-071 — Cost Intelligence Cross-Module Consumer Enrichment

## Delta 2026-03-30 — TASK-070 ya fijó la surface primaria

- `/finance/intelligence` ya quedó repivotada a `FinancePeriodClosureDashboardView`.
- `TASK-070` deja establecidos los patterns base reutilizables para este carril:
  - hero ejecutivo
  - chips semáforo por pata
  - tabla expandible con inline P&L
  - gating explícito por rol para `close/reopen`
- `TASK-071` ya no necesita definir la lectura primaria de Cost Intelligence; debe concentrarse en consumers distribuidos que lean el mismo serving.

## Delta 2026-03-30 — TASK-069 cerrada

- `operational_pl` ya quedó cerrada para su baseline:
  - snapshots materializados por `client`, `space` y `organization`
  - APIs de lectura estables
  - smoke reactivo E2E validado
  - health y alertas básicas ya conectadas
- Esta task deja de estar bloqueada por el carril P&L.
- El siguiente paso natural ya es ejecutar consumers distribuidos, no seguir endureciendo el engine base.

## Delta 2026-03-30 — TASK-068 cerrada

- `TASK-068` ya quedó cerrada:
  - closure status materializado
  - close/reopen operativo
  - calendario operativo ya integrado
  - smoke reactivo E2E validado
- Esta task deja de estar bloqueada por el carril de cierre de período.
- El blocker estructural real restante ya no es `TASK-068`; el trabajo pasa directo a consumers distribuidos.

## Delta 2026-03-30 — Foundation lista para continuidad

- `TASK-067` ya quedó cerrada y deja listo el carril base:
  - schema `greenhouse_cost_intelligence`
  - serving tables base
  - domain `cost_intelligence`
  - eventos `accounting.*`
  - cron route dedicada con smoke `200`
- Esta task ya no queda bloqueada por foundation técnica ni por el engine P&L base.

## Delta 2026-03-30 — Auditoría Finance + dependencias clarificadas

- **Desbloqueada** por cierre de `TASK-069` y `TASK-070`.
- Debe tomar `TASK-070` como patrón visual primario y `TASK-069` como serving canónico.
- Reemplaza on-demand compute de `organization-economics.ts` con reads del P&L materializado.
- TASK-138 Slice 3 (People finance bridge) y Slice 4 (Agency synergy) cubren parte del scope de esta task — coordinar para no duplicar.
- El Home/Nexa widget (Slice 4 de esta task) depende de TASK-009 (Home, ya `complete`).

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P2` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Lista para ejecución` |
| Rank | — |
| Domain | Cost Intelligence |

## Summary

Enriquecer módulos existentes (Agency, Organization 360, People 360, Home/Nexa) con datos de Cost Intelligence: margin % por space, P&L por organización, costo fully-loaded por persona con closure awareness, y widget de status financiero en Home.

## Why This Task Exists

Cost Intelligence materializa P&L y closure status (TASK-067, TASK-068), pero ese valor solo llega al usuario si las surfaces que ya usa lo muestran. Hoy Agency muestra economics on-demand, Organization 360 computa P&L en cada request, People no tiene closure awareness, y Home no tiene summary financiero.

## Goal

Que los 4 consumers principales lean de serving views pre-materializadas en vez de computar on-demand, con closure awareness visible.

## Architecture Alignment

- Fuente canónica: `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md` § 8
- Patrón: surfaces leen de `greenhouse_serving.*`, no computan
- No crear APIs nuevas innecesarias — los consumers leen serving views directamente o via APIs existentes enriquecidas

## Dependencies & Impact

- **Depende de:**
- TASK-069 (operational P&L snapshots) — **cerrada**
  - TASK-068 (period closure status) — **cerrada**
  - Agency module existente
  - Organization 360 existente (tab Rentabilidad)
  - People 360 existente (Person Finance tab)
  - TASK-009 Home/Nexa (si implementada) o dashboard existente
- **Impacta a:**
  - `organization-economics.ts` — puede simplificarse leyendo P&L materializado
  - `person_intelligence` projection — puede leer closure flag
  - Agency space cards — agregan margin badge
- **Archivos owned:**
  - Cambios en views/components existentes (no archivos nuevos dedicados)

## Current Repo State

### Agency
- Space cards muestran FTE, usuarios, proyectos
- No muestran margin % ni economics
- `src/lib/agency/agency-queries.ts` lee clients + assignments

### Organization 360
- Tab "Rentabilidad" existe en org detail
- `src/lib/account-360/organization-economics.ts` computa on-demand desde `client_economics` + `client_labor_cost_allocation`
- Muestra trend chart + breakdown table
- No tiene closure awareness

### People 360
- Person Finance tab existe
- `src/lib/person-360/get-person-finance.ts` lee payroll + compensation + expenses
- No muestra "costo fully-loaded" como número final
- No tiene closure awareness

### Home
- Dashboard cliente actual no tiene summary financiero
- TASK-009 (Home/Nexa) está en diseño
- No hay widget de período/margen

## Scope

### Slice 1 — Agency: margin badge por space
1. En space cards de Agency, agregar chip de margin %:
   - Leer `operational_pl_snapshots` para el space del mes actual (o último mes cerrado)
   - Mostrar: `Margen: XX%` con color (verde/amarillo/rojo)
   - Si no hay P&L para el space: no mostrar badge
2. Enriquecer `agency-queries.ts` para incluir margin data del serving

### Slice 2 — Organization 360: P&L materializado
1. Reemplazar `organization-economics.ts` compute on-demand por lectura de `operational_pl_snapshots`:
   - Filter: `scope_type = 'organization'`, `scope_id = orgId`
   - Últimos N períodos para trend
2. Agregar badge de closure status por período en trend chart
3. Si P&L materializado no existe (org sin actividad), fallback al compute actual

### Slice 3 — People 360: costo fully-loaded con closure
1. En Person Finance tab, agregar card "Costo Total del Período":
   - Leer `member_capacity_economics` para el miembro + período actual
   - Mostrar: `loaded_cost_target` como número principal
   - Desglose: labor + direct overhead + shared overhead
   - Badge: `Cerrado` o `Provisional` según `period_closure_status`
2. No crear API nueva — leer serving views existentes

### Slice 4 — Home/Nexa: financial status widget
1. Card de status financiero en Home:
   - Período actual: nombre + closure status (semáforo)
   - Margin trend: últimos 3 meses (spark line o 3 números)
   - Alertas activas: count de margin alerts sin resolver
   - CTA: "Ver cierre de período" → link a Finance tab
2. Si Home/Nexa (TASK-009) no está implementada aún:
   - Agregar widget al dashboard interno existente
   - Visible para `efeonce_admin`, `finance_manager`, `efeonce_operations`

## Out of Scope

- Creación de nuevas serving views (ya existen de TASK-067 y TASK-068)
- APIs nuevas (consumers leen serving views o APIs existentes)
- Capabilities module ROI (fase 3)
- Projected margin (fase 3)

## Acceptance Criteria

- [ ] Agency space cards muestran margin % badge cuando hay P&L disponible
- [ ] Organization 360 Rentabilidad lee P&L materializado en vez de computar on-demand
- [ ] Organization 360 muestra badge de closure status por período
- [ ] People Finance tab muestra "Costo Total del Período" con desglose y closure badge
- [ ] Home/dashboard muestra widget de status financiero con período actual + trend
- [ ] Fallbacks funcionan cuando no hay P&L materializado
- [ ] `pnpm build` pasa
- [ ] Validación visual en preview

## Verification

- `pnpm build`
- `pnpm lint`
- Validación visual local/preview:
  - Agency → space con datos → margin badge visible
  - Organization detail → Rentabilidad → datos de serving, no on-demand
  - People → Person → Finance → costo fully-loaded + closure badge
  - Home → widget financiero con semáforo
