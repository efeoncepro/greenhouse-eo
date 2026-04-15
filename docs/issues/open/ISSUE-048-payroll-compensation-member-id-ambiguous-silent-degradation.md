# ISSUE-048 — Payroll compensation overview puede fallar o degradar por referencia ambigua a `member_id`

## Ambiente

staging + runtime general (Payroll Postgres)

## Detectado

2026-04-13, revisión reactiva a partir de reporte de ambigüedad en `member` dentro de Payroll.

## Síntoma

La surface `Payroll > Compensaciones vigentes` puede comportarse de forma inconsistente cuando el runtime PostgreSQL resuelve el overview de compensaciones:

- el reader de miembros de compensación puede fallar con una referencia ambigua a `member_id`
- dependiendo del carril exacto, la UI puede terminar en error o responder con datos parciales
- en el caso degradado, la tabla de compensaciones vigentes puede seguir mostrando compensaciones actuales, pero dejar vacía la lista de colaboradores elegibles o deshabilitar `Nueva compensación` sin explicar la causa real

## Causa raíz

`pgListPayrollCompensationMembers()` en `src/lib/payroll/postgres-store.ts` arma una CTE `current_compensation` que hace join entre:

- `greenhouse_payroll.compensation_versions AS cv`
- `greenhouse_core.members AS m`

Dentro de esa CTE, varias referencias usan `member_id` sin alias:

- `SELECT DISTINCT ON (member_id)`
- `SELECT member_id`
- `ORDER BY member_id, effective_from DESC, version DESC`

Como ambas tablas exponen `member_id`, PostgreSQL puede fallar con `column reference "member_id" is ambiguous`.

Además, `pgGetCompensationOverview()` consume ese reader vía `Promise.allSettled()` y, si falla el lookup de miembros, no corta el request: solo loguea el error y devuelve `members = []`. Eso convierte un fallo real del reader en una degradación silenciosa del payload de `GET /api/hr/payroll/compensation`.

## Impacto

- La gobernanza de compensaciones en Payroll puede quedar incompleta o engañosa.
- HR/Admin puede perder la lista real de colaboradores elegibles para crear nueva compensación.
- El incidente puede percibirse como “no hay miembros” en vez de un bug backend con SQL ambiguo.
- El mismo patrón deja a Payroll vulnerable a repetir la familia de bug ya vista en Finance con `ISSUE-045`.

## Solución

Fix localizado aplicado en repo:

- se calificaron explícitamente las referencias ambiguas dentro de la CTE `current_compensation` en `src/lib/payroll/postgres-store.ts`
  - `SELECT DISTINCT ON (cv.member_id)`
  - `SELECT cv.member_id`
  - `ORDER BY cv.member_id, cv.effective_from DESC, cv.version DESC`
- se agregó una regresión focalizada en `src/lib/payroll/postgres-store.test.ts` para asegurar que el SQL del reader quede aliasado y no vuelva a introducir referencias ambiguas a `member_id`

No se cambió en este lote el comportamiento de degradación de `pgGetCompensationOverview()` cuando falla el reader de miembros. Ese carril se dejó intacto para mantener backward compatibility del overview y limitar el diff al root cause confirmado.

## Verificación

Ejecutada localmente:

1. `pnpm exec vitest run src/lib/payroll/postgres-store.test.ts`
2. runtime local autenticado:
   - `POST /api/auth/agent-session` -> `200`
   - `GET /api/hr/payroll/compensation` -> `200`
   - payload observado post-fix:
     - `compensations = 6`
     - `members = 7`
     - `eligibleMembers = 1`
   - `GET /hr/payroll` -> `200`

Pendiente en runtime real / staging:

1. reproducir el carril contra runtime PostgreSQL real de Payroll
2. confirmar si el síntoma visible actual en staging era HTTP 500 o payload parcial en `/api/hr/payroll/compensation`
3. volver a validar `Payroll > Compensaciones vigentes` una vez desplegado el fix

## Estado

open

## Relacionado

- `src/lib/payroll/postgres-store.ts`
- `src/lib/payroll/get-compensation.ts`
- `src/app/api/hr/payroll/compensation/route.ts`
- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollCompensationTab.tsx`
- `docs/issues/open/ISSUE-045-purchase-order-create-ambiguous-client-id.md`
