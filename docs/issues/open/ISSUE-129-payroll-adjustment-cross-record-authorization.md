# ISSUE-129 — Payroll adjustments permiten referencias cruzadas sin guard de tenant/capability

## Ambiente

Dev/staging; cualquier runtime con payroll habilitado.

## Detectado

2026-08-01, auditoría estática y de API sobre payroll posterior a la corrección de materialización.

## Síntoma

Los comandos de aprobar o revertir reciben `entryId` y `adjustmentId`, pero no verifican que ambos pertenezcan al mismo registro, periodo y tenant. Además, varias rutas sensibles sólo validan el contexto HR grueso y no la capability fina de payroll.

## Causa raíz

La autorización y la integridad de referencias están repartidas entre route handlers y el store, sin un command único que cargue el agregado y compare sus límites antes de mutar.

## Impacto

Un caller autorizado para payroll podría intentar aprobar/revertir un ajuste ajeno o mutar un entry distinto del que la UI muestra. Es un riesgo de integridad financiera y aislamiento multi-tenant.

## Solución

Crear un command gobernado que resuelva el agregado por tenant, verifique `periodId + entryId + adjustmentId`, capability fina, estado del periodo e idempotencia; eliminar mutaciones directas desde handlers. Añadir tests negativos cross-record/cross-tenant y auditoría de denegación.

## Verificación

Tests de autorización y referencias cruzadas; smoke autenticado de crear/aprobar/revertir en Dev; confirmar que los casos legítimos siguen funcionando y que un periodo exportado devuelve error canónico sin mutar.

## Estado

open

## Relacionado

- `TASK-1625`
- `src/app/api/hr/payroll/**`
- `src/lib/payroll/authorization.ts`
