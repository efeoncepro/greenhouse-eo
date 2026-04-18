# TASK-464e — Quote Builder UI Exposure (Role/Tool/Addon Pickers + Cost Stack Gated)

## Delta 2026-04-18

Reconciliación vs TASK-469 (plano maestro, posterior a esta spec) + realidad del repo:

- **Pickers**: la spec original listó 4 autocompletes separados en `workspace/`. TASK-469 §B canoniza **un solo drawer con 4 tabs** en `src/components/greenhouse/pricing/SellableItemPickerDrawer.tsx` (reusable por TASK-465/467). Adopto la versión del plano — los 4 botones `[+ Rol]` `[+ Persona]` `[+ Herramienta]` `[+ Overhead]` del editor abren el drawer con `initialTab` preseleccionada. Persona sigue como variant separada (Autocomplete simple sobre `team_members`) porque no viene del catálogo sellable.
- **Role gating**: la spec usa `finance_manager` y `finance`. En `src/config/role-codes.ts` solo existen `FINANCE_ADMIN`, `FINANCE_ANALYST`, `EFEONCE_ADMIN`. Uso esos tres en `canViewCostStack()`; si luego aparece un rol `finance_manager` operativo, se agrega al helper sin tocar consumers.
- **Currencies**: drawer actual acepta `CLP|USD|CLF`. Extiendo a 6 (`CLP|USD|CLF|COP|MXN|PEN`) alineado con `PricingOutputCurrency` del engine v2. `CurrencySwitcher` ya refleja esto.
- **Line types**: el engine v2 usa `role|person|tool|overhead_addon|direct_cost`; la persistencia (`quotation_line_items`) usa `person|role|deliverable|direct_cost`. Para MVP, al persistir `tool` y `overhead_addon` los mapeo a `direct_cost` + `metadata.pricingV2LineType` + `metadata.sku` (stored en `description` JSON estructurado). Cero cambio de schema. La UI del builder mantiene los 4 modos visualmente; el flattening ocurre al submit.
- **Entitlement**: uso role check directo (Opción A, MVP). `finance.cost_stack.view` capability queda como follow-up si aparece necesidad de governance fina (ej. override por user).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-464a, TASK-464b, TASK-464c, TASK-464d`
- Branch: `task/TASK-464e-quote-builder-ui-exposure`
- Legacy ID: `parte de TASK-464 umbrella`
- GitHub Issue: `none`

## Summary

Refactorear `QuoteCreateDrawer` + `QuoteLineItemsEditor` para exponer los 4 modos de composición (role, person, tool, overhead addon) consumiendo el pricing engine v2 (TASK-464d) + foundation (TASK-464a/b/c). Incluye selector de `commercial_model` + `country_factor` + `output_currency` al nivel de quote, cost stack gated a finance/admin, y addon auto-resolver sugerido visible.

## Why This Task Exists

Hoy `QuoteLineItemsEditor` solo permite line items genéricos (label + quantity + unitPrice manual). El usuario manual escribe todo el pricing. Con TASK-464a/b/c/d ya canonicalizado el modelo completo de Efeonce, el UI puede:

- Ofrecer role picker → auto-populate hourly cost + suggested bill rate
- Ofrecer tool picker → auto-populate prorated price + provider info
- Sugerir addons aplicables automáticamente según contexto
- Mostrar tier compliance por línea (below_min / in_range / above_max)
- Calcular multi-currency output al vuelo

Permissions claras (confirmadas previamente): **todos pueden cotizar**, pero el **cost stack** (hourly cost interno, overhead breakdown, markup) queda gated a finance/admin.

## Goal

- `QuoteCreateDrawer` pide: cliente, commercial_model, country_factor, output_currency, BL
- `QuoteLineItemsEditor` tiene 4 botones "+ Agregar...": rol, persona, herramienta, overhead
- Cada línea muestra: label, unidad seleccionada, cantidad, suggested bill rate (all visible), cost stack (gated)
- Panel lateral con addons auto-resueltos que user puede toggle on/off
- Totales en tiempo real en la moneda del cliente + USD
- Tier compliance chip por línea + overall margin health chip

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Copy en español latam tuteo via `greenhouse-ux-writing` skill
- Vuexy primitives (CustomChip, CustomTextField, Autocomplete, Tooltip)
- Cost stack gated por `hasRoleCode('finance_manager') || hasRoleCode('efeonce_admin') || hasRoleCode('finance')`
- Engine calls async con debounce 300ms para no saturar endpoint
- Mobile: drawer responsive (pickers full-screen en mobile)

## Normative Docs

- TASK-464a/b/c/d specs (data y engine que consume)
- `src/views/greenhouse/finance/workspace/QuoteCreateDrawer.tsx`
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx`

## Dependencies & Impact

### Depends on

- TASK-464a/b/c shipped (catálogos seeded)
- TASK-464d shipped (engine v2 operativo)

### Blocks / Impacts

- TASK-463 (HubSpot bridge) — los quotes creados con el nuevo UI se propagan a HubSpot sin cambios en el bridge
- TASK-465 (service composition) — agregará un 5to botón "+ Agregar servicio" que auto-expande recipe
- TASK-348 (governance) — health check en UI usa tier compliance output del engine

### Files owned

- `src/views/greenhouse/finance/workspace/QuoteCreateDrawer.tsx` (refactor)
- `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx` (refactor mayor)
- `src/views/greenhouse/finance/workspace/RolePickerAutocomplete.tsx` (nuevo)
- `src/views/greenhouse/finance/workspace/ToolPickerAutocomplete.tsx` (nuevo)
- `src/views/greenhouse/finance/workspace/PersonPickerAutocomplete.tsx` (nuevo)
- `src/views/greenhouse/finance/workspace/AddonSuggestionsPanel.tsx` (nuevo)
- `src/views/greenhouse/finance/workspace/QuoteLineCostStack.tsx` (nuevo — display gated)
- `src/views/greenhouse/finance/workspace/QuoteTotalsFooter.tsx` (nuevo)
- `src/app/api/finance/quotes/pricing/simulate/route.ts` (nuevo — exposing engine v2)
- `src/app/api/finance/quotes/pricing/lookup/route.ts` (nuevo — roles/tools/addons catalogs)

## Current Repo State

### Already exists

- `QuoteCreateDrawer` con modos "Desde cero" / "Desde template"
- `QuoteLineItemsEditor` con line items genéricos
- `QuoteHealthCard` con margen chip

### Gap

- No hay role/tool/person/addon pickers
- No hay cost stack gated display
- No hay addon auto-suggestions
- No hay commercial_model + country_factor + output_currency selectors
- No hay live pricing engine call

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## UI Plan

Esta task implementa UI descrita en **[TASK-469](TASK-469-commercial-pricing-ui-interface-plan.md)**. Consumir en lugar de re-especificar:

- **Surface B — SellableItemPickerDrawer**: nuevo en `src/components/greenhouse/pricing/`, 4 tabs (Roles/Tools/Overhead/Servicios). Reusa patrón `ecommerce/products/list/ProductListTable.tsx` con `SellableItemRow.tsx` polimórfico. Props en TASK-469 §3.3/3.4.
- **Surface C — CostStackPanel**: gated por entitlement `finance.cost_stack.view`. Variant `quote-builder` (accordion collapsed). Props en TASK-469 §3.1.
- **Surface D — selectores commercial model / country factor / employment type**: dentro de `QuoteBuilderActions.tsx`. SELECT con helper text (ver TASK-469 §2 Surface D).
- **MarginIndicatorBadge**: TASK-469 §3.2 — icon + label + color, 4 tiers.
- **Copy**: `GH_PRICING.costStackTitle`, `marginLabels`, `pickerTabs`, `employmentTypeLabel` (TASK-469 §4).
- **A11y**: panel gated renderiza `<></>` si no hay acceso; 13-row floor TASK-469 §5.

## Scope

### Slice 1 — Lookup API

- `GET /api/finance/quotes/pricing/lookup?type=role|tool|person|addon&bl=globe` → devuelve catálogo filtrado para picker autocomplete
- Responde `{ items: [{ id, label, category, tier, meta }] }`
- Tenant-safe via `requireFinanceTenantContext`
- Caching HTTP 5 min

### Slice 2 — Simulate API (engine v2 exposed)

- `POST /api/finance/quotes/pricing/simulate` → recibe `PricingEngineInputV2`, llama engine v2, retorna `PricingEngineOutputV2`
- Gate por role: el field `costStack` dentro del output solo se incluye si el viewer tiene `finance|finance_manager|efeonce_admin`
- Debounced 300ms del lado UI

### Slice 3 — Drawer header inputs

- `QuoteCreateDrawer` extendido:
  - **Cliente** (existing, required)
  - **Business line** (dropdown con opciones del repo)
  - **Commercial model** (radio: On-Going / On-Demand / Híbrido / Licencia-Consulting)
  - **Country factor** (dropdown; auto-preselect desde `client.country_code` + `lifecyclestage` si aplica)
  - **Currency output** (dropdown: USD / CLP / CLF / COP / MXN / PEN; default CLP)
  - **Duración contrato** (meses, required si retainer/hybrid)
  - **Válida hasta** (date)
  - **Descripción** (textarea, opcional)

### Slice 4 — Line items editor con 4 pickers

Botones: `[+ Rol]` `[+ Persona]` `[+ Herramienta]` `[+ Overhead]`

**Add Rol**:
- Autocomplete `RolePickerAutocomplete` con los 33 sellable roles, agrupados por categoría
- Al seleccionar, abre inline editor:
  - **Cantidad**: personas (ej. 2 diseñadores)
  - **Modalidad de contrato**: dropdown con los employment_types admitidos del rol (filtrado por `role_employment_compatibility.allowed=TRUE`). Default al `is_default=TRUE`. Ej. Senior Designer: indefinido_clp (default) / plazo_fijo_clp / contractor_deel_usd. Consultor HubSpot: honorarios_clp (default) / contractor_deel_usd.
  - **FTE** slider + input (0.1-1.0) con label "X horas/mes" auto desde `fte_hours_guide`
  - **Períodos** (meses): auto-disabled para on-demand, editable para retainer
  - **Override margin** (opcional, gated finance): slider entre `margin_min` y `margin_max` del tier, default `margin_opt`
- Al guardar, llama simulate endpoint → actualiza cost stack + bill rate (el stack varía según el employment_type seleccionado)

**Add Herramienta**:
- Autocomplete `ToolPickerAutocomplete` con 26 tools, filtrados por BL
- **Cantidad**, **Períodos**
- Auto-populate desde `prorated_price_usd`

**Add Persona**:
- Autocomplete `PersonPickerAutocomplete` con `greenhouse_core.team_members` activos
- Mismo input pattern que rol (FTE + periods)
- Lee cost desde `member_capacity_economics`

**Add Overhead**:
- Autocomplete con los 9 addons de `overhead_addons`
- Para addons tipo `fee_percentage`: slider del `pct_min` al `pct_max`
- Para addons tipo `fee_fixed`: input de monto

### Slice 5 — Cost stack display gated

- Componente `QuoteLineCostStack` que expande línea para mostrar:
  - Hourly cost USD
  - Hourly overhead breakdown (si person/role)
  - Margin % applied
  - Commercial multiplier applied
  - Country factor applied
  - Exchange rate used
- Hidden si no tiene permissions — en lugar de eso, ve un simple tier chip ("Saludable", "Atención", "Crítico")
- Toggle button "Ver detalle de costo" solo renderiza si finance/admin

### Slice 6 — Addon suggestions panel

- Al costado del editor (sticky right sidebar):
  - Lista de addons sugeridos por engine con `appliedReason`
  - Checkbox para incluir/excluir
  - Monto + moneda
  - Chip `visible_to_client` / `internal_only`
- Cambios toggles dispara nuevo simulate

### Slice 7 — Totals footer

- Footer sticky abajo del drawer:
  - Subtotal (USD y moneda output)
  - Overheads (USD y moneda output)
  - Total (USD y moneda output)
  - Commercial multiplier aplicado
  - Country factor aplicado
  - Margin chip global (healthy/warning/critical)
  - Warnings count (click → lista)

### Slice 8 — Copy + UX polish

- Todos los labels, tooltips, empty states, errors via `greenhouse-ux-writing` skill
- Loading states durante simulate (skeleton en totals)
- Error states si engine falla (graceful fallback, no bloquea guardado)
- Accessibility (aria-labels, keyboard nav en pickers)

## Out of Scope

- Service composition picker (TASK-465 lo agrega como 5to botón)
- Edit de quote existente con el nuevo UI (V1 solo creates; edit queda en V2 con el mismo refactor)
- Drag-drop reorder de líneas (ya existe, preservar)
- Template management (TASK-348 ya lo tiene)

## Detailed Spec

### Permission gating rule

```typescript
const canViewCostStack = (tenant: TenantContext): boolean =>
  hasRoleCode(tenant, 'efeonce_admin') ||
  hasRoleCode(tenant, 'finance_manager') ||
  hasRoleCode(tenant, 'finance')

// Default viewers (account/ops): NO ven costStack
// Sí ven: suggested bill rate, tier chip, commercial model, totals finales
```

### Flujo de creación (Staff Aug 1 designer)

1. Click "+ Nueva cotización"
2. Drawer abre con header fields (cliente, BL, commercial_model=on_going, country=chile_corporate, currency=CLP)
3. Click "+ Rol" → Autocomplete "Senior Visual Designer"
4. Inline editor: FTE=1.0 (= 180h/mes), Períodos=6
5. Simulate dispara → engine retorna:
   - Bill rate suggested CLP $37,297/h (ya pre-calculado desde sellable_role_pricing_currency)
   - Total CLP $1,359,000/mes × 6 = $8,154,000 CLP
   - Tier 2 margin opt 40% → chip "Saludable"
6. Addon suggestions panel: "Ninguno sugerido para este contexto"
7. Totals footer: "Total: $8,154,000 CLP"
8. Click "Guardar" → POST `/api/finance/quotes` → Se crea canonical + propaga a HubSpot (via TASK-463)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] 4 pickers funcionales (Rol, Persona, Herramienta, Overhead)
- [ ] Autocomplete es rápido (<200ms)
- [ ] Cost stack solo visible a finance/admin (regression test con agent-session de role 'client_manager' y 'efeonce_admin')
- [ ] Tier compliance chip aparece por línea
- [ ] Addon suggestions se actualizan on context change
- [ ] Totals en moneda output coinciden con Excel para casos de referencia
- [ ] Staff aug de 1 diseñador senior × 6 meses en CLP genera quote correcta sin intervención manual
- [ ] Retainer Paid Media Managed con múltiples roles + tools + overheads se calcula correctamente
- [ ] Mobile: drawer usable en iPad

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test`
- `pnpm build`
- Playwright E2E: crear quote end-to-end con los 4 modos
- Manual staging: verificar propagación a HubSpot (TASK-463)

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con "Quote builder v2 con full model live"
- [ ] Chequeo impacto cruzado con TASK-463, TASK-465
- [ ] Documentación funcional en `docs/documentation/finance/cotizador.md`

## Follow-ups

- Edit de quote existente con el nuevo UI (V2)
- Drag-drop entre categorías de addons
- Save quote as service module template (feed a TASK-465)
- Realtime collaboration (multi-user edit simultáneo)

## Open Questions

- ¿Override margin por línea disponible a non-finance? Propuesta: override visible pero solo puede aumentar margen (nunca bajar bajo `margin_min`). Finance/admin puede bajar hasta `margin_min` con audit trail (TASK-348 governance).
