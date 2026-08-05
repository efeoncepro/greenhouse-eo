# ISSUE-133 — Payroll proyectado ignora ajustes manuales activos

## Ambiente

Dev/staging; `/hr/payroll` y reader de nómina proyectada.

## Detectado

2026-08-01, auditoría visual y API con sesión Chrome autenticada de `jreyes@efeonce.cl`.

## Síntoma

La nómina oficial reflejó a Felipe Zurita en 0 CLP y a María Fernanda Gonzalez en 390 USD, pero la vista proyectada mostró a Felipe con 650.000 CLP y a María con 600 USD. La UI no explica que está usando una semántica distinta.

## Causa raíz

El reader proyectado calcula desde compensación natural y no consume la proyección canónica de ajustes activos ni expone una versión/semántica que advierta la diferencia.

## Impacto

El operador puede tomar decisiones de caja o exportación sobre montos que no representan el cálculo que ya se materializó oficialmente.

## Solución

Hacer que la proyección consuma el mismo reader/command de breakdown efectivo, o declarar explícitamente una projection-only natural view con banner, timestamp/version y CTA de recalcular. No duplicar la fórmula en UI.

## Verificación

Comparar official/projected para fixtures con natural, percentage y exclude; exigir igualdad cuando ambos son “effective”; comprobar estado vacío y error degradado. Repetir smoke Chrome en Dev y staging.

## Estado

open

## Relacionado

- `TASK-1625`
- `.captures/2026-08-01-payroll-audit/`
- reader de payroll proyectado y `src/lib/payroll/**`
