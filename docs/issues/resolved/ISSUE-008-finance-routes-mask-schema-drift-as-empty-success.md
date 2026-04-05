# ISSUE-008 — Finance routes mask schema drift as empty success

## Ambiente

preview + production

## Detectado

2026-04-05, auditoría de código del módulo Finance

## Síntoma

Varias routes de Finance devolvían `200` con arrays vacíos cuando el backend fallaba por relaciones o columnas inexistentes. Desde la UI parecía que no había datos, pero en realidad la surface estaba degradada por drift de schema o infraestructura.

## Causa raíz

El módulo tenía handlers que capturaban errores `does not exist` y respondían payload vacío sin distinguir entre “no hay data” y “la surface está rota”.

Carriles afectados antes del fix:

- `src/app/api/finance/purchase-orders/route.ts`
- `src/app/api/finance/hes/route.ts`
- `src/app/api/finance/quotes/route.ts`
- `src/app/api/finance/intelligence/operational-pl/route.ts`

El patrón ocultaba incidentes reales. `ISSUE-004` ya había demostrado que en Finance el drift de schema no era hipotético.

## Impacto

- Las vistas Finance podían verse vacías aunque el problema real fuera una regresión de schema o runtime.
- Operación y QA recibían una falsa señal de “sin datos” en lugar de un incidente explícito.
- El diagnóstico se retrasaba porque la API no distinguía ausencia real de datos versus surface degradada.

## Solución

Se agregó un helper compartido de schema drift en:

- `src/lib/finance/schema-drift.ts`

Y se actualizó el contrato de las routes afectadas para devolver payload degradado explícito, manteniendo compatibilidad con consumers que esperan listas:

- `items` / `total` o `snapshots` se preservan
- se agrega `degraded: true`
- se agrega `errorCode: 'FINANCE_SCHEMA_DRIFT'`
- se agrega `message` explicando que la data está temporalmente indisponible por schema drift

Con esto ya no existe el falso “vacío sano”; el consumidor puede seguir recibiendo una forma compatible, pero con una señal operativa explícita.

## Verificación

1. `pnpm exec vitest run src/app/api/finance/purchase-orders/route.test.ts src/app/api/finance/schema-drift-response.test.ts`
2. `pnpm exec vitest run src/lib/finance/**/*.test.ts src/app/api/finance/**/*.test.ts`

Resultado local:

- suite focalizada de ISSUE-008: OK
- suite completa de Finance: `24` archivos, `102` tests passing, `2` skipped

## Estado

resolved (2026-04-05)

## Relacionado

- `src/lib/finance/schema-drift.ts`
- `src/app/api/finance/purchase-orders/route.ts`
- `src/app/api/finance/hes/route.ts`
- `src/app/api/finance/quotes/route.ts`
- `src/app/api/finance/intelligence/operational-pl/route.ts`
- `src/app/api/finance/schema-drift-response.test.ts`
- `docs/issues/resolved/ISSUE-004-finance-organization-id-column-missing.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
