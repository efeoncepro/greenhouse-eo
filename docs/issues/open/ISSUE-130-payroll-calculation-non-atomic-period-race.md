# ISSUE-130 — Payroll puede publicar cálculo parcial durante errores o carreras de periodo

## Ambiente

Dev/staging/production; cálculo, aprobación y exportación de payroll.

## Detectado

2026-08-01, auditoría de lifecycle y concurrencia.

## Síntoma

El cálculo persiste entries durante un loop antes de marcar el periodo como calculado. Un fallo intermedio puede dejar proyecciones parciales; calculate puede correr concurrentemente con approve/export y una exportación puede observar o publicar datos incompletos.

## Causa raíz

No existe una frontera transaccional única con lock/CAS que cubra lectura de inputs, materialización de entries, actualización de estado y emisión de export.

## Impacto

Riesgo de nóminas incoherentes, totales que cambian después de exportar, duplicación de notificaciones y dificultad para recuperar un periodo sin saber qué parte se escribió.

## Solución

Definir una máquina de estados con transición condicional, lock de periodo y transaction boundary para materialización; hacer el comando retry-safe e idempotente, bloquear approve/export mientras calcula y registrar un receipt/version de cálculo. Añadir rollback lógico o staging projection antes de publicar.

## Verificación

Tests de fallo en cada paso, doble calculate, calculate+approve/export concurrentes, timeout de lock y retry; reconciliación read-only de period totals/entries; canary de un periodo Dev y staging.

## Estado

open

## Relacionado

- `TASK-1625`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/close-payroll-period.ts`
- `src/lib/payroll/postgres-store.ts`
