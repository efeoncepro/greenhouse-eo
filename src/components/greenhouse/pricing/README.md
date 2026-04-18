# Commercial Pricing Components

Esta carpeta es el destino canónico de los 9 componentes nuevos del programa de pricing comercial inventariados en TASK-469 §3:

1. `CostStackPanel.tsx` — TASK-464e (gated por `finance.cost_stack.view`)
2. `MarginIndicatorBadge.tsx` — TASK-464e
3. `SellableItemPickerDrawer.tsx` — TASK-464e
4. `SellableItemRow.tsx` — TASK-464e (renderer polimórfico: role/tool/overhead/service)
5. `CurrencySwitcher.tsx` — TASK-466
6. `ServiceCompositionEditor.tsx` — TASK-465
7. `QuickEntityFormDrawer.tsx` — TASK-467
8. `PriceChangeAuditTimeline.tsx` — TASK-467
9. `PricingCatalogNavCard.tsx` — TASK-467

Reglas:
- Copy SIEMPRE desde `GH_PRICING` en `src/config/greenhouse-nomenclature.ts` — no hardcoded strings.
- Cada componente aprueba el 13-row floor (modern-ui) antes de merge — checklist en TASK-469 §5.
- 🛑 Aislamiento payroll: ningún componente toca `src/views/greenhouse/hr/payroll/**` ni `src/components/hr/payroll/**`.
- Vuexy-first: antes de crear desde cero, verificar mapeo en TASK-469 §2 (full-version/apps/invoice + ecommerce/products).
