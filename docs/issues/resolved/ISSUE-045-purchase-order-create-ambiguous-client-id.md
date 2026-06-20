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

Fix localizado aplicado y validado en staging:

- se calificaron las columnas del query con alias `cp.`
  - `cp.client_profile_id`
  - `cp.client_id`
  - `cp.hubspot_company_id`
- se auditó el resolver canónico de Finance para este carril y se confirmó que la ambigüedad estaba concentrada en ese lookup de `client_profiles`
- se agregó una prueba focalizada en `src/lib/finance/canonical.test.ts` para asegurar que el SQL del lookup quede aliasado y no vuelva a introducir referencias ambiguas
- se volvió a correr la suite de la route de purchase orders para confirmar que el flujo sigue cerrando con el contrato esperado del endpoint
- se repitió el boundary HTTP de staging que fallaba en el formulario (`POST /api/finance/purchase-orders`) usando scope `organizationId` + `clientProfileId`, sin `clientId` crudo, y dejó de responder 500

## Verificación

Ejecutada localmente el 2026-06-20:

1. `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/purchase-orders/route.test.ts`
   - Resultado: 2 archivos, 17 tests passed.

Ejecutada en staging el 2026-06-20:

1. `pnpm staging:request /api/finance/clients --grep Sky`
   - Resultado: HTTP 200; `Sky Airline` resuelto con `organizationId=org-b9977f96-f7ef-4afb-bb26-7355d78c981f` y `clientProfileId=hubspot-company-30825221458`.
2. `pnpm staging:request POST /api/finance/purchase-orders '{"poNumber":"GH-ISSUE-045-20260620-1427","organizationId":"org-b9977f96-f7ef-4afb-bb26-7355d78c981f","clientProfileId":"hubspot-company-30825221458","authorizedAmount":1000,"issueDate":"2026-06-20","currency":"CLP",...}' --pretty`
   - Resultado: HTTP 201; creada `PO-b254c2db`.
3. `pnpm staging:request '/api/finance/purchase-orders?organizationId=org-b9977f96-f7ef-4afb-bb26-7355d78c981f&status=active' --grep GH-ISSUE-045-20260620-1427`
   - Resultado: HTTP 200; la OC creada aparece en el listado.

Nota de alcance: no se repitió una segunda creación desde UI para evitar duplicar datos de staging; la causa raíz estaba en el boundary HTTP del endpoint consumido por el formulario y ese boundary quedó validado con create + read.

## Estado

resolved

## Relacionado

- `src/lib/finance/canonical.ts`
- `src/lib/finance/canonical.test.ts`
- `src/app/api/finance/purchase-orders/route.ts`
- `docs/mini-tasks/complete/MINI-001-po-client-contact-selector.md`
