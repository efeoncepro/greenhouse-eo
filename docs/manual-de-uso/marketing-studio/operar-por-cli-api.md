# Operar Marketing Studio por API desde Greenhouse

Fecha: 2026-10-04. Comando local: `pnpm studio` (Node 24, sin dependencias nuevas).
[Arquitectura y decisión](../../architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md) ·
[Funcionamiento del producto](../../documentation/marketing-studio/efeonce-marketing-studio.md) ·
[Verificación](../../audits/marketing-studio/2026-10-04-studio-api-cli.md).

## Contrato y alcance

La CLI consulta el OpenAPI y el manifiesto **del servidor elegido en cada ejecución**. Acepta tanto el
`operationId` de HTTP como el nombre `studio.*` usado por los agentes. No importa código del repo hermano,
no conecta a PostgreSQL y no crea una segunda lista de capacidades. Al verificar API 1.6.0 aparecieron
**64 operaciones HTTP: 59 con tool declarada y cinco transportes/metadatos excluidos de MCP con razón**.
El mismo nombre `studio.*` invocado por esta CLI usa HTTP directo, no una sesión MCP.

```bash
pnpm studio --help
pnpm studio doctor
pnpm studio list
pnpm studio list --filter copy
pnpm studio describe studio.copy.create
```

`describe` entrega parámetros, cuerpo JSON con sus definiciones, scope, riesgo y reglas de transporte.
La CLI valida campos raíz y transporte; la API conserva la validación completa y las reglas de negocio.
Una discrepancia de versión/ruta/método o una escritura sin metadata de riesgo detiene la ejecución.

| Trabajo | Operaciones para descubrir |
| --- | --- |
| Campañas, conceptos y piezas | `studio.campaign.*`, `studio.concept.*`, `studio.asset.*` |
| Copys y anuncios | `studio.copy.*`, `studio.ad.*` |
| Brief, vuelos y presupuesto | `studio.campaign.brief.*`, `studio.media_plan.*` |
| Calendario | `studio.calendar.*` |
| Catálogo, plataformas, formatos, límites y UTM | `studio.channels.list`, `studio.channel.get`, `studio.channel_catalog.*` |
| Aliases, hallazgos y audiencias | `studio.channel_alias*`, `studio.campaign.channel*`, `studio.campaign.audience.*` |
| Referencias del modelo de cliente | `studio.customer_model.get`, `studio.campaign.customer_model_version.set` |

Las operaciones futuras aparecen cuando Studio las publica con su contrato. Una entrada en el inventario
no certifica que las flags, dependencias o permisos necesarios estén habilitados.

## Credenciales y entorno

Origen predeterminado: `https://studio.efeonce.org`. Cambiarlo con `--base-url` o `STUDIO_API_URL`.
Se acepta HTTP sólo en localhost para pruebas. La CLI no sigue redirecciones de la API con credenciales.

Elige **una** fuente de credencial:

- `STUDIO_API_TOKEN`, inyectado por tu entorno autorizado.
- `--token-file /ruta/privada/token`: archivo de tu usuario, permisos `0600`.
- `--token-secret nombre --project proyecto`: lee una versión de Secret Manager con tu identidad gcloud
  vigente, directamente en memoria. No crea credenciales ni amplía permisos.

Para el cliente de cargas existente de producción:

```bash
pnpm studio doctor --token-secret marketing-studio-upload-cli-token --project efeonce-group
pnpm studio call studio.campaign.assets.list --param campaignId=CMP-004 --param limit=10 \
  --token-secret marketing-studio-upload-cli-token --project efeonce-group
```

Ese cliente permite cargas (`studio:assets:write`), **no escritura general** (`studio:write`). Para crear
copys, planes o campañas necesitas una credencial habilitada para esa operación. La CLI no transforma
un cliente de servicio en persona ni en `operator_cli`.

Estado al verificar el 04/10: la gestión global del catálogo rechaza los bearers de servicio/usuario
hasta habilitar su autoridad delegada; `--apply` no elude ese control. Las aprobaciones T2 requieren
persona autorizada en un carril habilitado: hoy la API rechaza T2 incluso con `--confirm`. Las campañas gobernadas por OneDrive pueden rechazar edición de sus datos maestros
con `campaign_not_studio_owned`; las cargas tienen su puerta específica.

## Lecturas y paginación

```bash
pnpm studio call studio.channels.list
pnpm studio call studio.campaign.copies.list --param campaignId=CMP-004 --param limit=20
pnpm studio call studio.campaign.assets.list --param campaignId=CMP-004 --param cursor='<nextCursor>'
pnpm studio describe studio.asset.preview
```

Las respuestas mantienen `items` y `nextCursor`; no se agregan páginas automáticamente. Los filtros
permitidos se consultan con `describe`. `organizationId`, donde exista, estrecha el alcance autorizado.

## Descargar un original o una vista previa

```bash
pnpm studio download --asset '<assetId>' --version 1 --output ./original.png
pnpm studio call studio.asset.preview --param assetId='<assetId>' --output ./preview.webp
```

`download` pide el enlace mediante la API y descarga directamente desde GCS, sin exponer la URL ni enviar
el bearer al almacenamiento. Verifica SHA-256 y tamaño; elimina un original incompleto o corrupto. Conserva
los derechos de uso en el recibo: descargar no concede licencia de reutilización. `--organization` puede
estrechar la consulta. `call studio.asset.download` devuelve sólo el recibo redactado del enlace; para obtener
los bytes se utiliza `download`.

## Crear o editar un copy

Crear `copy.json` con los datos de la campaña y un canal vigente. Ejemplo de cuerpo mínimo:

```json
{
  "channel": "organic_social_linkedin",
  "variant": "A",
  "primaryText": "Texto de la publicación.",
  "headline": "Título de la pieza"
}
```

```bash
# Valida con dryRun=true; usa una campaña editable y una credencial studio:write.
pnpm studio call studio.copy.create --param campaignId=CMP-900 --file copy.json
# Ejecuta; conserva esta llave para reintentar exactamente la misma operación.
pnpm studio call studio.copy.create --param campaignId=CMP-900 --file copy.json \
  --apply --key copy-cmp900-linkedin-a-001
# Actualiza con la revision vigente obtenida al leer el copy.
pnpm studio call studio.copy.update --param copyId='<copyId>' --file cambios.json \
  --if-match 3 --apply --key copy-cmp900-linkedin-a-002
```

Sin `--apply`, todas las escrituras con soporte remoto usan `dryRun=true`. Si una operación futura no
ofrece dryRun, devuelve `local_plan` sin enviar la mutación. `--dry-run` es un alias explícito del default.
No mezclarlo con `--apply`. Para T2 aplicado se exige además `--confirm`; sólo expresa intención local.

`--file -` lee JSON de stdin (hasta 10 MiB). La llave se genera si falta y se emite a stderr **antes** de
la solicitud. Ante timeout, conserva esa llave: no repitas una operación dudosa con una llave nueva.
Un 412 no se reintenta con otra revisión: vuelve a leer, resuelve el conflicto y prepara la edición.

## Subir piezas y versiones

```bash
# Primero valida destino, derechos y revisión, sin subir bytes.
pnpm studio upload ./pieza.png --campaign CMP-004 --asset '<assetId>' --license ai_generated \
  --token-secret marketing-studio-upload-cli-token --project efeonce-group
# Mismos argumentos + --apply reservan, transfieren y confirman la versión.
pnpm studio upload ./pieza.png --campaign CMP-004 --asset '<assetId>' --license ai_generated \
  --apply --token-secret marketing-studio-upload-cli-token --project efeonce-group
# Nueva pieza (una imagen o video, en un concepto existente):
pnpm studio upload ./pieza.mp4 --campaign CMP-900 --new-asset --concept '<conceptId>' \
  --title 'Video vertical' --ratio 9x16 --license owned --apply
# Archivos múltiples para una pieza existente: se procesan en orden.
pnpm studio upload ./v1.png ./v2.png --campaign CMP-900 --asset '<assetId>' --license owned --apply
```

Sin `--asset`/`--new-asset`, Studio intenta deducir el destino desde el nombre canónico del archivo.
No se inventa el destino si la inferencia falla. Derechos: `--license`, `--reference`, `--from`, `--until`,
`--territory` y `--channel` repetibles; nota de versión con `--note`. También puede usarse
`--metadata metadata.json` con `assetId`, `newAsset`, `rights` y `note`, con las formas que muestra
`describe studio.asset.upload.request`. Los flags específicos prevalecen sobre ese archivo.

La CLI calcula SHA-256, obtiene la revisión de la pieza explícita y solicita el ticket vía API. Transfiere
hasta 1 GiB en streaming a GCS (PUT o inicio de sesión reanudable), sin enviar el bearer de Studio.
El worker verifica contenido, tamaño y hash antes de crear la versión. PNG/JPEG/WebP/MP4/MOV y los tipos
adicionales audio/PDF dependen del contrato y del destino; una pieza nueva sólo admite imagen/video.
Un archivo duplicado no crea otra versión. La versión nueva queda pendiente de revisión, **sin aprobar**.

El recibo en stderr incluye `uploadId` antes de transferir. Si la confirmación sigue pendiente tras
`--wait-seconds` (600 por defecto, 0–3600), sale con código 2 y entrega datos para continuar:

```bash
pnpm studio upload --campaign CMP-900 --resume '<uploadId>' --apply
```

`--resume` retoma **la confirmación**, no los bytes de una transferencia interrumpida. Para repetir la
transferencia, usa el mismo archivo y metadatos: la llave determinista permite recuperar el ticket
mientras siga vigente. Si el ticket expiró o Studio rechazó el archivo, sigue el error del servidor.

## Definir canales y plataformas

```bash
pnpm studio describe studio.channel_catalog.draft.create
pnpm studio describe studio.channel_catalog.draft.channel.upsert
pnpm studio describe studio.channel_catalog.version.publish
pnpm studio describe studio.channel_alias.map
pnpm studio describe studio.campaign.audience.upsert
```

El flujo del catálogo es borrador → editar canales con su revisión → publicar con su revisión. El cuerpo
del canal define `modality`, `family`, `buyingPlatform`, `appearancePlatforms`, `placements`, `formats`,
`copyLimits`, objetivos y tracking. Obtén el esquema con `describe`; no mezcles plataforma de compra con
plataformas de aparición. Las audiencias son de campaña. Requiere que el servidor habilite cada autoridad.

## Salidas y diagnóstico

- JSON por stdout, progreso/llaves por stderr. Para pipes limpios usa `pnpm -s studio` o `node scripts/marketing-studio/cli.mjs`.
- `--output resultado.json` guarda un recibo redactado; en lecturas binarias guarda los bytes.
  Archivos nuevos con permisos `0600`; nunca sobrescribe. `download` elimina originales incompletos o corruptos;
  una lectura binaria genérica interrumpida puede dejar salida parcial y requiere verificarla antes de usarla.
- Tokens y URLs firmadas/de medios se ocultan en recibos. No hay flag para volcarlos sin redactar.
- `0`: solicitud completada o validación/plan; revisa `data.status` para distinguirlos. `1`: error.
  `2`: carga todavía en verificación. HTTP 202 no acredita una versión creada.
- 401/403: identidad, scope o autoridad. 409: conflicto de negocio/fuente maestra. 412: revisión obsoleta.
  La CLI no reintenta mutaciones fallidas ni vuelca mensajes internos del proveedor.
- `doctor` verifica contrato y salud, y reporta si recibió una credencial. No prueba todos sus permisos.

Verificación local: `pnpm studio:test` y `pnpm exec eslint scripts/marketing-studio/*.mjs`.

Evidencia del 04/10: 18 tests y ESLint PASS; `doctor`, catálogo v1 con 52 canales, lectura autenticada y upload
real en dry-run verificados contra producción. Upload aplicado, transferencia GCS y reanudación de confirmación
se probaron con HTTP local/fetch controlado. No se aplicó una carga productiva desde este cliente ni se habilitó
ningún permiso nuevo. [Dossier](../../audits/marketing-studio/2026-10-04-studio-api-cli.md).
