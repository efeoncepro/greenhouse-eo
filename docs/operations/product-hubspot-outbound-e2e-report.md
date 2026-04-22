# Product HubSpot Outbound E2E Report

Estado operativo del smoke inicial de `TASK-563` para el carril `sellable_role -> product_catalog -> HubSpot Products`.

## Scope actual

- Cubre `create -> update -> archive` contra staging Greenhouse y HubSpot sandbox.
- Reutiliza `scripts/staging-request.mjs` para auth headless a staging.
- Verifica HubSpot por `GET /products/reconcile` del servicio `hubspot-greenhouse-integration`.

## Cómo correr

```bash
pnpm tsx scripts/e2e-product-hubspot-outbound.ts
```

Flags opcionales:

```bash
pnpm tsx scripts/e2e-product-hubspot-outbound.ts --timeout-ms 240000 --interval-ms 15000
pnpm tsx scripts/e2e-product-hubspot-outbound.ts --suffix manual-smoke --keep-role
```

## Última ejecución

| Fecha | Ambiente Greenhouse | Ambiente HubSpot | Resultado | Create | Update | Archive | Observaciones |
|---|---|---|---|---|---|---|---|
| Pendiente | staging | sandbox | pendiente | - | - | - | Placeholder inicial de TASK-563 |

## Criterio de éxito

- El role creado en staging materializa un product HubSpot con `gh_product_code=<roleSku>`.
- `gh_source_kind = sellable_role`.
- El update del role cambia `description` en HubSpot.
- La desactivación del role deja el product como archivado en HubSpot.

## Limitaciones abiertas

- Anti-ping-pong live contra webhook inbound no está automatizado aquí; sigue cubierto por unit tests del bridge.
- Rate limit y burst de múltiples productos no están cubiertos por este smoke.
- Batch multi-product sigue **deferido**: el worker reactivo actual coalescea por `(projection, scope)` y meter batching real cruza cambios mayores del runtime.

## Evidencia esperada para cerrar el reporte

- Salida JSON del script con `roleId`, `roleSku`, `hubspotProductId` y latencias por etapa.
- Captura o enlace al product en HubSpot sandbox cuando se requiera evidencia operativa.
- Nota explícita si el reconcile devuelve `endpoint_not_deployed` o si el worker tarda más del budget esperado.
