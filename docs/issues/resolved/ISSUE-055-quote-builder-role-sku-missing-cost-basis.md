# ISSUE-055 — Quote builder no puede cotizar `ECG-004` por gap canónico en cost basis del rol

## Ambiente

staging

## Detectado

2026-04-19, durante diagnóstico manual de `/finance/quotes/new` a partir de un reporte visual del usuario en staging (`dev-greenhouse.efeoncepro.com`).

## Síntoma

Al agregar el rol catálogo `PR Analyst` (`ECG-004`) en el quote builder, la línea quedaba sin precio unitario y subtotal en la preview. El engine de pricing no devolvía simulación para ese SKU.

Request reproducido por Codex el 2026-06-20:

```bash
pnpm staging:request POST /api/finance/quotes/pricing/simulate \
  '{"businessLineCode":"globe","commercialModel":"on_going","countryFactorCode":"chile_corporate","outputCurrency":"CLP","quoteDate":"2026-06-20","lines":[{"lineType":"role","roleSku":"ECG-004","hours":null,"fteFraction":1,"periods":1,"quantity":1,"employmentTypeCode":null}]}' \
  --pretty
```

Respuesta antes del fix:

```json
{"error":"Missing cost components for role ECG-004"}
```

Control de sanidad en el mismo ambiente:

- `ECG-001` respondía `HTTP 200` y calculaba normal.
- el problema no era una caída global del endpoint ni del pricing engine v2.

## Causa raíz

`ECG-004` existía en `greenhouse_commercial.sellable_roles` y tenía pricing por moneda en `sellable_role_pricing_currency`, pero no tenía contrato resoluble de costo:

- no tenía filas en `greenhouse_commercial.sellable_role_cost_components`;
- no tenía filas en `greenhouse_commercial.role_employment_compatibility`.

Sin eso, `pricing-engine-v2` no puede resolver ni `role_blended` ni `role_modeled`, y falla honestamente con `Missing cost components for role ECG-004`.

El gap venía de la canonicalización del catálogo de roles: `ECG-004` quedó marcado como caso ambiguo (`needs_review`) en [docs/tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md](../../tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md), porque mezcla `Fee Deel > 0` y `Gastos Previsionales > 0`; por eso no recibió seed automático confiable de employment type + cost components.

La revisión runtime del 2026-06-20 encontró la misma clase para `ECG-017` y `ECG-018`. `ECG-032` sigue siendo una ambigüedad distinta (`employment_type_requires_manual_review`) y queda fuera de este cierre.

## Impacto

- el quote builder no podía cotizar `ECG-004` en staging;
- cualquier otro SKU de rol con el mismo patrón `Staff + gastos previsionales + Fee Deel` podía fallar igual;
- la UI podía inducir a lectura de línea sin precio, aunque el shell actual ya ancla errores por SKU a la fila afectada cuando el engine devuelve un `422`.

## Solución

Resuelto el 2026-06-20 como `issue-only fix`.

Se agregó y aplicó la migración idempotente [20260620190000000_issue-055-reviewed-staff-role-cost-basis.sql](../../../migrations/20260620190000000_issue-055-reviewed-staff-role-cost-basis.sql), que:

- declara explícitamente `indefinido_clp` como `role_employment_compatibility` default para `ECG-004`, `ECG-017` y `ECG-018`;
- inserta/actualiza `sellable_role_cost_components` para esos tres SKUs usando el stack del CSV canónico `data/pricing/seed/sellable-roles-pricing.csv`;
- preserva `gastos_previsionales_usd` y `fee_deel_usd` como componentes explícitos del costo;
- marca la provenance como `source_kind='admin_manual'`, `source_ref='ISSUE-055 reviewed sellable-roles-pricing.csv staff override'`, `confidence_score=0.75`, para no confundirlo con inferencia automática del seeder.

No se cambió el pricing engine: su contrato correcto es fallar cuando el catálogo no tiene cost basis.

No se cambió JSX: `QuoteBuilderShell` ya sintetiza warnings por SKU/línea para errores como `Missing cost components for role ECG-004`.

## Verificación

Ejecutado por Codex el 2026-06-20:

- `pnpm exec vitest run src/lib/commercial/__tests__/sellable-roles-seed.test.ts src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts` → `2 passed`, `9 passed`.
- `pnpm pg:connect:migrate` → migración aplicada en Cloud SQL dev/staging y `src/types/db.d.ts` regenerado sin cambio estructural.
- `pnpm pg:connect:status` → `No migrations to run`.
- `pnpm staging:request POST /api/finance/quotes/pricing/simulate ... roleSku=ECG-004 ... --pretty` → `HTTP 200`, `costBasisKind="role_modeled"`, `employmentTypeCode="indefinido_clp"`, `costBasisSourceRef="ISSUE-055 reviewed sellable-roles-pricing.csv staff override"`, `unitPriceOutputCurrency=1498500`.
- No-regression: `pnpm staging:request ... roleSku=ECG-001 ...` → `HTTP 200`, conserva `costBasisKind="role_blended"`.
- Scope hermano: `ECG-017` y `ECG-018` → `HTTP 200`, `role_modeled`, `indefinido_clp`.
- `pnpm typecheck` → verde.
- `pnpm finance:e2e-gate` → skipped esperado (`No finance route handlers changed`).
- `pnpm qa:gates --changed --agent codex --finance --data --runtime --docs` → advisory sin blockers nuevos; finance/data/runtime/docs detectados y cubiertos por evidencia runtime + migración aplicada.
- `pnpm docs:closure-check -- ...` → warnings revisados: no se actualizó arquitectura/ADR porque el fix no cambia el contrato `role_modeled`; no se actualizó `project_context.md` porque no cambia reglas standing/runtime para agentes.
- `pnpm ops:lint --changed` → `errors=0 warnings=0`.
- `pnpm docs:context-check` → warnings preexistentes por tamaño histórico de `Handoff.md`, sin errores.
- `git diff --check` → verde.

Evidencia no cubierta:

- No se ejecutó GVC del quote builder porque no existía scenario reusable para agregar una línea de rol y el fix no modificó UI. La evidencia de UI queda inferida del contrato runtime: el builder consume el mismo `/api/finance/quotes/pricing/simulate` que ahora devuelve precio unitario/subtotal para `ECG-004`.

## Estado

resolved

## Relacionado

- [docs/tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md](../../tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md)
- [docs/tasks/complete/TASK-477-role-cost-assumptions-catalog.md](../../tasks/complete/TASK-477-role-cost-assumptions-catalog.md)
- [docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
- [docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md)
