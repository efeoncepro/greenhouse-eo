# ISSUE-131 — Payroll oficial degrada silenciosamente ante readiness y datos legales incompletos

## Ambiente

Dev/staging/production; cálculo oficial Chile y contratos con participación.

## Detectado

2026-08-01, auditoría de fórmulas, readiness y lifecycle.

## Síntoma

Si falla el resolver de participación, el cálculo puede caer a semántica legacy. Readiness puede convertirse en lista vacía. Tablas tributarias sin brackets, caps/SIS ausentes y años SII desconocidos pueden terminar en cero/default en vez de bloquear el cálculo oficial. La comprobación de evidencia Previred para reabrir aparece como placeholder.

## Causa raíz

Se confunden “cero legal explícito” y “dato faltante”, y varios fallos se convierten en defaults o fallback para mantener el flujo.

## Impacto

Payroll puede calcular y exportar una liquidación aparentemente válida con impuestos, previsión o reglas de participación incorrectas; el error aparece después como diferencia financiera/legal.

## Solución

Separar `missing` de `legal zero`, exigir brackets/versiones/caps/SIS y policy SII soportados, hacer fail-closed para cálculo oficial y reservar fallback sólo para projections read-only. Implementar la evidencia real de Previred y un guard de reabrir con auditoría.

## Verificación

Fixtures de cada input faltante, cero legal, año no soportado, resolver caído y Previred ausente; comprobar que no se escribe ningún entry oficial. Smoke Dev/staging con un caso válido y uno bloqueado, incluyendo error canónico y signal operativa.

## Estado

open

## Relacionado

- `TASK-1625`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/compute-chile-tax.ts`
- `src/lib/payroll/chile-previsional-helpers.ts`
- `src/lib/payroll/reopen-guards.ts`
