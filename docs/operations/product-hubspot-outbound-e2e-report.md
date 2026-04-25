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
| 2026-04-22 | staging | sandbox | ❌ primer intento | 12.5s | timeout | - | El smoke original intentó `PATCH` dentro de la ventana anti-ping-pong de 60s tras el create. Greenhouse publicó `synced_out` como `noop`, `product_catalog` sí cambió localmente y HubSpot no debía reescribirse todavía. Se corrigió el script. |
| 2026-04-22 | staging | sandbox | ✅ validado | 9.0s | 11.5s | 31.7s | Script corregido con espera explícita de 65s entre writes para respetar anti-ping-pong. Product HubSpot `44106723437`, SKU `ECG-038`. |

## Hallazgos clave

- El bloqueo real de staging no era el projection runtime sino drift operativo de envs:
  - faltaba `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL` en `staging`
  - `GREENHOUSE_INTEGRATION_API_TOKEN` estaba contaminado en Vercel con comillas envolventes y `CRLF`
- La emisión de eventos de `sellable_roles` estaba incompleta en varios writes admin. Se cerró el gap en create, patch, delete, bulk, Excel apply y approval apply antes de repetir el smoke.
- El anti-ping-pong de products está funcionando como se diseñó: cualquier write dentro de 60s desde `hubspot_last_write_at` se degrada a `noop`.

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

## Evidencia capturada

```json
{
  "roleId": "sr-0a1018ce-77e1-481e-bd20-2bfccf78c425",
  "roleSku": "ECG-038",
  "hubspotProductId": "44106723437",
  "createLatencyMs": 8995,
  "updateLatencyMs": 11455,
  "archiveLatencyMs": 31665
}
```
