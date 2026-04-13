# ISSUE-045 — Registrar OC falla por referencia ambigua a `client_id` en el resolver canónico de Finance

## Ambiente

staging

## Detectado

2026-04-13, reporte de usuario en el flujo `Finance > Purchase Orders > Registrar OC`, reproducido con `pnpm staging:request` y confirmado por Sentry.

## Síntoma

Al intentar registrar una orden de compra para un cliente como `Sky Airline`, la UI muestra `Error al registrar la OC` y la API `POST /api/finance/purchase-orders` responde HTTP 500.

Evidencia levantada durante el diagnóstico:

- `pnpm staging:request /api/finance/clients --grep Sky` resolvió correctamente el cliente objetivo
- `pnpm staging:request POST /api/finance/purchase-orders ...` devolvió HTTP 500
- Sentry reportó: `error: column reference "client_id" is ambiguous`

## Causa raíz

`resolveFinanceClientContext()` en `src/lib/finance/canonical.ts` arma un query sobre `greenhouse_finance.client_profiles cp` con `LEFT JOIN greenhouse_core.spaces s ON s.client_id = cp.client_id`.

En el `WHERE`, el segundo query del resolver usaba columnas sin alias:

- `client_profile_id = $1`
- `client_id = $2`
- `hubspot_company_id = $3`

Como el join incorpora también `s.client_id`, PostgreSQL falla con `column reference "client_id" is ambiguous`.

## Impacto

- No se pueden registrar nuevas órdenes de compra cuando el flujo resuelve el cliente vía el carril canónico de Finance.
- El mismo resolver puede degradar otras lecturas de Finance que dependan del mapeo `organization/client/client_profile`.
- La UI solo muestra un error genérico, por lo que el incidente se percibe como falla del formulario y no como regresión backend.

## Solución

Fix localizado ya aplicado en repo:

- se calificaron las columnas del query con alias `cp.`
  - `cp.client_profile_id`
  - `cp.client_id`
  - `cp.hubspot_company_id`
- se auditó el resolver canónico de Finance para este carril y se confirmó que la ambigüedad estaba concentrada en ese lookup de `client_profiles`
- se agregó una prueba focalizada en `src/lib/finance/canonical.test.ts` para asegurar que el SQL del lookup quede aliasado y no vuelva a introducir referencias ambiguas
- se volvió a correr la suite de la route de purchase orders para confirmar que el flujo sigue cerrando con el contrato esperado del endpoint

Pendiente para cerrar el issue:

- validar el flujo recuperado en staging una vez que el fix esté desplegado

## Verificación

Ejecutada localmente:

1. `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/purchase-orders/route.test.ts`

Pendiente en staging post-deploy:

1. repetir `POST /api/finance/purchase-orders` con el payload que hoy falla
2. confirmar que la respuesta deja de ser HTTP 500
3. validar desde la UI que `Registrar OC` crea la orden correctamente

## Estado

open

## Relacionado

- `src/lib/finance/canonical.ts`
- `src/lib/finance/canonical.test.ts`
- `src/app/api/finance/purchase-orders/route.ts`
- `docs/mini-tasks/complete/MINI-001-po-client-contact-selector.md`
