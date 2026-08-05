# ISSUE-132 — Ajustes de payroll dejan deducciones derivadas stale o cruzadas

## Ambiente

Dev/staging; ajustes de porcentaje y exclusión de nómina, especialmente Chile.

## Detectado

2026-08-01, auditoría de fórmula sobre la ruta de materialización.

## Síntoma

El ajuste actualiza bruto/neto/totales, pero puede conservar AFP, salud, impuesto u otras deducciones naturales. La lógica de fallback con `0 || previous` también puede preservar valores anteriores cuando la exclusión debería producir cero.

## Causa raíz

El ajuste se aplica como parche sobre partes del entry en vez de recalcular un breakdown completo desde una única base natural + policy de ajuste.

## Impacto

El total puede parecer correcto mientras sus componentes no suman, el recibo puede mostrar deducciones contradictorias y los casos de exclusión/porcentaje pueden divergir entre moneda, bruto efectivo y neto.

## Solución

Definir un cálculo puro y versionado de breakdown efectivo que derive todos los campos desde la base natural y el ajuste; representar cero explícito, aplicar caps/progressive tax por contrato y persistir el mismo resultado en entry, history y receipt projection.

## Verificación

Property tests de suma de componentes, porcentaje 0/65/100, exclusión, CLP/USD, caps y deducciones nulas; reconciliar Felipe Zurita y María Fernanda en Dev sin cambiar datos de producción.

## Estado

open

## Relacionado

- `TASK-1625`
- `src/lib/payroll/apply-to-entry.ts`
- `src/lib/payroll/adjustments/recalculate-adjustment.ts`
