# Simular el precio de un servicio (estimado referencial)

> **Tipo:** Manual de uso (operador)
> **Creado:** 2026-06-21 por Claude (TASK-1211)
> **Para qué sirve:** estimar cuánto cuesta un servicio sin armar la cotización a mano, y entender quién ve qué.
> **Referencia técnica:** [GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1](../../architecture/GREENHOUSE_QUOTE_API_PARITY_MULTI_CONSUMER_V1.md) · [cotizador.md](../../documentation/finance/cotizador.md)

## Para qué sirve

Permite obtener un **estimado de precio** de un servicio del catálogo preguntando por su nombre (ej. "diseño digital"), sin tener que abrir el cotizador y armar la cotización línea por línea. El resultado es **referencial, no una oferta vinculante**.

## Antes de empezar

- El servicio tiene que existir en el catálogo con su **receta** (roles/horas/tools). Un servicio sin receta no es priceable y no aparece.
- El precio se calcula sobre el **paquete estándar** del servicio (horas/tier por defecto). Para una cotización ajustada al alcance real, usá el cotizador completo.

## Cómo se usa

### Desde Nexa (asistente)

Preguntale directo: *"¿Cuánto cuesta un servicio de diseño digital?"* (opcionalmente "…en CLP").

- Si hay un solo servicio que coincide → responde el estimado + moneda.
- Si hay varios → te pregunta a cuál te referís (elegís y repreguntás).
- Si no existe → te lo dice; no inventa un precio.

### Desde un agente externo (MCP)

Dos herramientas read-only: `search_services` (resuelve el nombre → servicio) y luego `quote_price` (estima con el `serviceSku`). Siempre con perfil cliente por defecto: **no devuelve costo ni margen**.

### Desde la API Platform (integraciones)

Lane `quotation`: `GET /api/platform/app/quotation/services?q=...` (resolver) y `POST /api/platform/app/quotation/simulate` (estimar). Equivalente ecosystem para sister-platforms. Requiere la capability `commercial.quote.simulate`.

## Qué significan los perfiles (quién ve qué)

| Quién pregunta | Costo | Margen | Precio de venta + IVA |
|---|---|---|---|
| Interno finance (admin / finance) | Sí | Sí | Sí |
| Interno comercial (no finance) | No | Sí | Sí |
| Cliente / público | No | No | Sí |

La regla la aplica el servidor: un cliente **no puede** pedir el perfil interno.

## Qué NO hacer

- No tratar el estimado como una oferta cerrada: es referencial, sujeto a alcance final.
- No esperar que un cliente o un agente externo vean el margen o el costo: por diseño, nunca cruzan al comprador.
- No usar este flujo para **crear/emitir** una cotización: eso es el cotizador (autoría) y, a futuro, su acción gobernada en Nexa (TASK-1212).

## Problemas comunes

- **"No encontré un servicio que coincida"**: el nombre no matchea ningún servicio activo con receta. Probá el nombre exacto o el SKU, o verificá que el servicio tenga receta en el catálogo.
- **Pide aclaración siempre**: hay varios servicios con nombres parecidos; afina el nombre.
- **403 / forbidden en la API**: falta la capability `commercial.quote.simulate` para ese rol.
