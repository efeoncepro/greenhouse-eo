# ISSUE-055 — Quote builder no puede cotizar `ECG-004` por gap canónico en cost basis del rol

## Ambiente

staging

## Detectado

2026-04-19, durante diagnóstico manual de `/finance/quotes/new` a partir de un reporte visual del usuario en staging (`dev-greenhouse.efeoncepro.com`).

## Síntoma

Al agregar el rol catálogo `PR Analyst` (`ECG-004`) en el quote builder, la línea queda sin precio unitario y subtotal en la preview. El engine de pricing no devuelve simulación para ese SKU.

Request verificado contra staging:

```bash
pnpm staging:request POST /api/finance/quotes/pricing/simulate \
  '{"businessLineCode":"globe","commercialModel":"on_going","countryFactorCode":"chile_corporate","outputCurrency":"CLP","quoteDate":"2026-04-19","lines":[{"lineType":"role","roleSku":"ECG-004","hours":null,"fteFraction":1,"periods":1,"quantity":1,"employmentTypeCode":null}]}' \
  --pretty
```

Respuesta:

```json
{"error":"Missing cost components for role ECG-004"}
```

Control de sanidad en el mismo ambiente:

- `ECG-001` responde `HTTP 200` y calcula normal con `costBasisKind: "role_modeled"`
- el problema no es una caída global del endpoint ni del pricing engine v2

## Causa raíz

`ECG-004` existe en `greenhouse_commercial.sellable_roles`, pero hoy no tiene contrato resoluble de costo:

- no tiene filas en `greenhouse_commercial.sellable_role_cost_components`
- no tiene filas en `greenhouse_commercial.role_employment_compatibility`

Sin eso, `pricing-engine-v2` no puede resolver ni `role_blended` ni `role_modeled`, y falla con `Missing cost components for role ECG-004`.

El gap viene de la canonicalización del catálogo de roles: `ECG-004` ya había quedado marcado como caso ambiguo (`needs_review`) en [docs/tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md](../../tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md), porque mezcla `Fee Deel > 0` y `Gastos Previsionales > 0`, por lo que no recibió seed automático confiable de employment type + cost components.

## Impacto

- el quote builder no puede cotizar `ECG-004` en staging
- cualquier otro SKU de rol con el mismo patrón de canonicalización incompleta puede fallar igual
- la UI puede inducir a lectura incorrecta del problema: el builder deja la línea en `$0` y el footer no explica claramente que el fallo es un `422` del engine para un SKU específico

## Solución

Resolver esto en dos carriles, ambos sobre `develop`:

1. **Datos canónicos del rol**
   - definir el `employment_type_code` válido/default para `ECG-004`
   - insertar sus `sellable_role_cost_components`
   - insertar su `role_employment_compatibility`
   - verificar que `getPreferredRoleModeledCostBasisByRoleId()` ya pueda resolver snapshot o fallback ad hoc para ese SKU

2. **Observabilidad del quote builder**
   - endurecer la superficie para que un `422` de `/api/finance/quotes/pricing/simulate` no se perciba como “no hay ítems”
   - mostrar error explícito por SKU o por línea cuando el engine no puede resolver cost basis

## Verificación

Antes de cerrar este issue:

- [ ] `pnpm staging:request ... roleSku=ECG-004 ...` responde `HTTP 200`
- [ ] la respuesta incluye `lines[0].costStack.costBasisKind` resoluble (`role_modeled` o `role_blended`)
- [ ] el quote builder muestra precio unitario y subtotal para `ECG-004`
- [ ] la UI deja mensaje explícito cuando un SKU falla por falta de cost basis

## Estado

open

## Relacionado

- [docs/tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md](../../tasks/complete/TASK-464a-sellable-roles-catalog-canonical.md)
- [docs/tasks/complete/TASK-477-role-cost-assumptions-catalog.md](../../tasks/complete/TASK-477-role-cost-assumptions-catalog.md)
- [docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
- [docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md)
