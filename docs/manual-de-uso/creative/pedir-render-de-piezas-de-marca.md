# Pedir el render de una pieza de marca

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-09-28 por Claude
> **Ultima actualizacion:** 2026-09-28 por Claude
> **Documentacion funcional:** [Render gobernado de piezas de marca](../../documentation/creative/render-gobernado-piezas-de-marca.md)
> **Documentacion tecnica:** [Artifact Render Pipeline §10](../../architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md)

## Para qué sirve

Para producir en Greenhouse una pieza de La órbita, un documento (brochure o propuesta) o una edición de Glitch, sin
correr nada en tu computador, y recibir los archivos guardados con su procedencia.

> **Hoy está apagado** (`BRAND_RENDER_ENABLED` OFF). Todo pedido responde `503` con código `render_disabled`. Este
> manual queda listo para cuando se prenda.

## Antes de empezar

- Tener el rol **designer** o **efeonce_admin** (o ser un agente con binding interno).
- Tener el intent o el manifiesto **que ya compone en local**: pruébalo primero con `pnpm brand:compose` o
  `pnpm glitch:compose`. Si no compone en local, tampoco va a componer acá.
- Tener cada imagen que el intent nombra (plates, fotos, logos) en **PNG, JPEG o WebP**.

## Paso a paso

### 1. Subir las fuentes

Sube cada imagen por el uploader privado con el contexto `brand_render_source_draft`:

```bash
curl -X POST https://<host>/api/assets/private \
  -F contextType=brand_render_source_draft \
  -F file=@plate-oficina.jpg
```

Anota el `assetId` que devuelve cada subida.

### 2. Armar el pedido

El pedido lleva la familia, el mismo JSON que el comando local y un mapa `sources` de **nombre usado en el intent →
assetId**:

```json
{
  "family": "graphic_line_piece",
  "intent": { "...": "el mismo intent de pnpm brand:compose" },
  "sources": { "plates/oficina.jpg": "<assetId>" }
}
```

Para un documento usa `graphic_line_document`; para Glitch, `glitch_edition` con `manifest` en vez de `intent`.
El Glitch Flash usa la misma familia `glitch_edition`: su manifiesto lleva `edition.kind: "flash"`, sin número, y
si su portada tiene foto propia (`cover.photo`), esa foto también va en `sources`.

### 3. Enviarlo

- Por el portal (lane App): `POST /api/platform/app/brand-render/requests`.
- Por un agente: tool MCP `request_brand_render` (mismos campos).

Respuesta `202`: pedido nuevo con un trabajo por catálogo. Respuesta `200` con `idempotent: true`: ya existía uno
igual; se devuelve ese.

### 4. Consultar y descargar

`GET /api/platform/app/brand-render/requests/{requestId}` (o la tool `get_brand_render_request`). Cuando un trabajo
está `completed`, trae sus archivos con un `downloadUrl` que exige sesión en Greenhouse.

## Qué significan los errores

| Código | Qué pasó | Qué hacer |
|---|---|---|
| `render_disabled` (503) | El render está apagado en ese entorno | Avisar y esperar; no reintentar en bucle |
| `invalid_request` (400) | El pedido no tiene la forma del contrato | Revisar `issues` |
| `render_rejected` (422) | La receta no está aprobada o no cumple el contrato de AXIS | Corregir el intent y probarlo en local |
| `missing_source` (422) | Falta una imagen o no es válida (tipo, cuarentena, contexto) | Subirla y agregarla a `sources` |
| `forbidden` (403) | Tu rol no puede pedir piezas de marca | Pedir el rol a un administrador |
| `not_found` (404) | El pedido no existe, o pediste otra organización | Revisar el id |

Y en los trabajos (`failureCode`): `missing_asset` (una imagen dejó de estar disponible), `semantic_rejected` o
`geometry_rejected` (la plantilla no acepta el contenido), `blank_slide` (una lámina salió vacía), `manifest_drift`
(el catálogo cambió desde que se pidió: pide de nuevo). Estos últimos no se reintentan solos.

## Qué no hacer

- No nombrar rutas del computador en el intent esperando que se lean: sólo cuentan las de `sources`.
- No reintentar un `render_rejected` sin cambiar el intent: va a fallar igual.
- No tomar un `completed` como aprobado ni publicado: producir no es aprobar.

## Problemas comunes

- **El pedido queda en `pending` mucho tiempo.** El despacho corre cada 2 minutos y atiende primero a Proposal e
  Insights. Si pasa más de una hora, la señal `brand.render.stuck_job` lo marca: revisar el flag en la revisión activa
  del ops-worker y del Job `artifact-worker`.
- **`partial_failed` en Glitch.** Un catálogo salió y otro no: los archivos listos sirven; revisa el `failureCode`
  del que falló.

## Referencias técnicas

- Command: `src/lib/brand-surfaces/production/commands.ts`
- Consumer del worker: `services/artifact-worker/consumers/brand-render.ts`
- Contrato: [GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md §10](../../architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md)
