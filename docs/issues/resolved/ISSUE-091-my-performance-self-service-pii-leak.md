# ISSUE-091 — `/api/my/performance` leaked compensation/cost fields to collaborators

- **Ambiente:** Production runtime (`/api/my/performance`, self-service surface gated by `mi_ficha.mi_desempeno`).
- **Detectado:** 2026-06-10 durante Discovery de TASK-1027.
- **Resuelto:** 2026-06-10 (TASK-1027 Slice 1).
- **Severidad:** Alta (exposición de PII de compensación a cualquier colaborador autenticado).

## Síntoma

`GET /api/my/performance` devolvía los objetos internos `intelligence` e `intelligenceTrend` tal cual (`PersonIntelligenceSnapshot`), que incluyen el bloque `cost` con `monthlyBaseSalary`, `monthlyTotalComp`, `compensationVersionId`, `loadedCostTarget`, `costPerHourTarget` y `suggestedBillRateTarget`.

## Causa raíz

El handler componía `readPersonIntelligence` / `readPersonIntelligenceTrend` (que pueblan `cost.*` sin filtro en `src/lib/person-intelligence/store.ts`) y serializaba el snapshot completo al cliente, sin DTO de redacción. El endpoint admin hermano (`/api/people/[memberId]/intelligence`) enriquece esos campos a propósito para operadores; el self-service nunca debió devolverlos. Anti-IDOR ya era correcto (`requireMyTenantContext()` resuelve `memberId` del JWT); la fuga era de **shape de respuesta**, no de sujeto.

## Impacto

Cualquier colaborador con acceso a `/my/performance` podía leer su propia compensación/costo cargado vía la respuesta del API (no mostrado en la UI vieja, pero presente en el payload).

## Solución

TASK-1027 Slice 1 reescribió el endpoint sobre un **DTO con redacción por construcción** (`src/lib/my-performance/dto.ts`): el composer **nunca importa** `readPersonIntelligence`/`readPersonIntelligenceTrend`; compone solo readers cost-free (`readMemberMetrics`/`computeMetricsByContext('member')`, `getPersonIcoProfile` para tendencia, `getPersonOperationalServing`, `readMemberAiLlmSummary`). El route ahora valida `year`/`month` (`invalid_period`), ignora cualquier `memberId` del cliente y sanitiza errores (`internal_error`, sin `error.message` crudo).

## Verificación

- Test `src/lib/my-performance/dto.test.ts` asserta que las keys prohibidas (`monthlyBaseSalary`, `monthlyTotalComp`, `compensationVersionId`, `loadedCostTarget`, `costPerHourTarget`, `suggestedBillRateTarget`, `cost`) **no aparecen** en el DTO serializado.
- Test `src/app/api/my/performance/route.test.ts` cubre anti-IDOR (un `memberId` del cliente se ignora) + validación + error sanitizado.

## Prevención

El patrón canónico para superficies self-service de analítica personal es **redacción por construcción** (no fetch-then-strip): no importar los readers con costo. Documentado en el ADR `GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1.md` (Delta 2026-06-10).
