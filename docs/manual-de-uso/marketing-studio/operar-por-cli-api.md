# Operar Marketing Studio por API desde Greenhouse

Fecha: 2026-10-04. Comando local: `pnpm studio` (Node 24, sin dependencias nuevas).
[Arquitectura y decisión](../../architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md) ·
[Funcionamiento del producto](../../documentation/marketing-studio/efeonce-marketing-studio.md) ·
[Verificación](../../audits/marketing-studio/2026-10-04-studio-api-cli.md).

## Contrato y alcance

La CLI consulta el OpenAPI y el manifiesto **del servidor elegido en cada ejecución**. Acepta tanto el
`operationId` de HTTP como el nombre `studio.*` usado por los agentes. No importa código del repo hermano,
no conecta a PostgreSQL y no crea una segunda lista de capacidades. El rollout de API 1.7.0 verifica
**80 operaciones HTTP: 75 con tool declarada y cinco transportes/metadatos excluidos de MCP con razón**.
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

## Activaciones — TASK-2001, contrato local 1.7.0

Verificado con Studio local y PostgreSQL real: **75 tools / 80 operaciones**, 31 comprobaciones HTTP de CLI. El
contrato productivo anterior no cambia hasta release. Usa `--base-url` del entorno autorizado; los ejemplos siguientes
requieren sus flags y una credencial con studio:read/studio:write. No envíes tokens como parámetros.

```bash
pnpm studio list --filter activation
pnpm studio describe studio.activation.plan
pnpm studio call studio.activation.accounts.list --param limit=100
pnpm studio call studio.activation.accounts.list --param cursor='<nextCursor>'
pnpm studio call studio.campaign.activations.list --param campaignId=CMP-001 --param market=CL
pnpm studio call studio.execution.unlinked.list
pnpm studio call studio.activation.get --param activationId=ACT-000001
pnpm studio call studio.activation.plan --param campaignId=CMP-001 --file plan.json
pnpm studio call studio.activation.plan --param campaignId=CMP-001 --file plan.json --apply --key '<llave-estable>'
pnpm studio call studio.activation.update --param activationId=ACT-000001 --file patch.json --if-match 1
pnpm studio call studio.activation.reschedule --param activationId=ACT-000001 --file fecha.json --if-match 1
```

`plan.json` incluye accountId, channelKey, catalogVersion, market, kind, plannedAt (punto) o plannedStartOn/plannedEndOn
(franja), y assetVersions con assetId/versionNo. Para blog añade draftUrl de Notion; cms/siteOrigin se registran en la
cuenta, no en el plan. Usa `describe` para los campos opcionales y límites. Los campos con default no son obligatorios.
Revisar el dry-run y agregar `--apply` aplica la misma operación. Reschedule/cancel nunca programan ni cancelan en el proveedor.

`studio.activation.tracking.preview` acepta campaignId, accountId, channelKey, catalogVersion y, si existen, destinationUrl,
placementKey, formatKey, adConfigurationId o assetId/versionNo. Canal/formato provienen del catálogo. Antes de crear el
id ACT devuelve params y requiresActivationId; la URL completa se lee en la activación creada. No inventes un id.
El destino debe pertenecer a dominios autorizados de la organización y venir sin UTM. Sin destino registrado devuelve null.

Para vincular/desvincular usa `studio.activation.execution.link` / `.unlink`: activationId, If-Match de la activación y
body con recordId/recordRevision. Para crear desde evidencia usa `studio.activation.from_execution`, recordId e If-Match
de esa evidencia: sin plan y en dry-run devuelve la precarga; aplicar exige campaignId y plan completo. Relee después.

### Backfill revisado y operaciones de persona

1. Registrar cuentas con `studio.activation.account.upsert`; no conecta ni concede acceso a proveedores.
2. Leer `studio.campaign.posts.list` y sus revisiones. `studio.execution.legacy.backfill` recibe campaignId, revisión de
   campaña y body `{ "accountId": "…", "posts": [{ "postId": "…", "revision": 1 }] }`. Dry-run conserva el origen y las
   fechas para revisión. Apply sólo migra evidencia; devuelve recordId, no crea activaciones.
3. Usar from_execution para revisar cada plan y pieza antes de aplicarlo. Preservar las llaves para reintentar y los posts
   originales. En producción los seis posts siguen pendientes de autorización; la prueba local usó seis fixtures.

Backfill, `studio.campaign.tracking_slug.set` (body slug, antes de activaciones) y
`studio.activation.publication.confirm` (body recordId/recordRevision/publishedAt) son T1 con requiresPerson. La CLI HTTP
los descubre y transporta, pero un bearer de servicio es rechazado. El carril humano HTTP/MCP depende de TASK-2003.
Mientras tanto, una persona autorizada dispone del CLI local del repositorio de Studio (`pnpm studio:write <operationId>`),
que usa los mismos commands y acceso PostgreSQL gobernado. No transforma el bearer de Greenhouse en persona.

La confirmación de publicación requiere evidencia pública reciente (máximo dos horas) y URL 200, misma cuenta y sitio,
revisiones vigentes y fecha no posterior a la observación; el actor sale de la identidad. Conserva la fecha observada del
CMS separada de la confirmada. Los avisos de robots/canonical/sitemap no inventan un gate SEO ni una autorización para publicar.

## Activaciones en producción — 2026-10-04

`doctor`, `call getCalendarRange`, `call getActivation` y `call listUnlinkedExecutions` verificados contra producción 1.7.0. Seis activaciones históricas CL visibles; cada operación nueva se descubre con `describe`. Las escrituras siguen requiriendo su scope y actor: confirmación de publicación, slug legacy y backfill exigen persona; su carril HTTP delegado depende de TASK-2003. El backfill productivo se ejecutó por el command CLI autorizado de Studio, no por esta CLI HTTP. [Release y límites](../../audits/marketing-studio/TASK-2001-release-2026-10-04.md).


## Conexiones owned: corte local API 1.8.0

El contrato local amplía los providers email; producción conserva API 1.7.0 hasta el siguiente rollout autorizado.
La CLI descubre la versión del servidor elegido. Las operaciones son comunes a HubSpot, Resend y los dos
Marketing Cloud; no hay comandos paralelos por proveedor.

```bash
pnpm studio describe studio.activation.account.upsert --base-url http://127.0.0.1:3101
pnpm studio call studio.activation.accounts.list --base-url http://127.0.0.1:3101
pnpm studio describe studio.activation.plan --base-url http://127.0.0.1:3101
pnpm studio call studio.execution.unlinked.list --base-url http://127.0.0.1:3101
pnpm studio describe studio.activation.reschedule --base-url http://127.0.0.1:3101
pnpm studio describe studio.activation.from_execution --base-url http://127.0.0.1:3101
```

Para cuenta Resend: provider y platform `resend`; providerAccountRef es el alias de cuenta que Greenhouse tenga
vinculado a la credencial. HubSpot usa provider/platform `hubspot` y portal ID como providerAccountRef. Para el
sitio público: provider `wordpress`, platform `website`, cms `wordpress`, siteOrigin y providerAccountRef
`https://efeoncepro.com`. Registrar una cuenta no instala credenciales ni habilita el worker. Todas las escrituras
usan `--file`, dryRun por defecto, `--apply`, Idempotency-Key e If-Match según `describe`.

Los canales nuevos se publican como nueva versión: `owned_email_resend`, `owned_email_sfmc_engagement`,
`owned_email_sfmc_next`. El archivo Studio `packages/database/seeds/channel-catalog-email-additions.json` contiene
sólo las tres adiciones: crear draft basado en la versión vigente, upsert de cada canal, revisión y publicación
por el carril de operador autorizado. Nunca editar v1. El gobierno global aún rechaza bearers de servicio:
la CLI no convierte una credencial en operador ni elude esa decisión.

`emailEvidence.completion=partial|unknown` no equivale a published; sentCount/expectedCount pueden ser null.
Marketing Cloud devuelve readerAvailability=not_implemented; no hay conexión ni evidencia simulada. Para un CMS
sin lector, `studio.activation.publication.confirm` requiere persona y fecha explícita: la CLI de servicio es
rechazada. draftUrl es una referencia Notion y ningún comando abre ni modifica ese borrador.

[Evidencia, límites y rollout](../../audits/marketing-studio/TASK-2001-owned-connections-2026-10-04.md).


## Leer email, landing y Growth Forms (API 1.9.0; local, rollout pendiente)

1. Seleccionar explícitamente el servidor y ejecutar `pnpm studio doctor`; verificar API 1.9.0 o superior.
2. `pnpm studio describe studio.activation.get` y `pnpm studio call studio.activation.get --param activationId=ACT-000001`
   (sustituir el ID por uno real autorizado). El resultado incluye `email` / `web` cuando existe la lectura.
3. `pnpm studio call studio.calendar.get --param from=2026-10-01 --param to=2026-11-01` sirve los mismos campos;
   seguir nextCursor para terminar el rango. No se requiere actualizar la CLI ni importar código de Studio.
4. Leer fuente y observedAt de audiencias/métricas; null no es cero. copyLimits null significa que el catálogo
   fijado no aporta límite, no que el copy sea válido sin restricción.
5. En `web.connectedForms`, provider es `growth_forms` e id es el form_key público. `formReadStatus=unavailable`
   exige revisar el aviso/reader y el contrato público; no cambiar el GUID HubSpot ni inferir envío de leads.

[Tabla completa de campos y limitaciones](../../audits/marketing-studio/TASK-2001-activation-reader-sheets-2026-10-05.md).
