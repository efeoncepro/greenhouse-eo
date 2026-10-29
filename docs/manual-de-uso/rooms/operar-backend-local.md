# Operar el backend local de Rooms

Candidato29Oct2026. Owner Platform; runtime `/Users/jreye/Documents/efeonce-rooms`, rama
`codex/rooms-design-integration`. [Estado](../../architecture/rooms/README.md),
[contrato frontend](../../documentation/rooms/backend-api-for-claude-design.md) y
[recibo/gates finales](../../audits/rooms/2026-10-29-backend-local-completion.md).
No activa producción, clientes, correo ni Auth. Claude Design conserva la interfaz.

## Antes de empezar

1. Confirmar rama y `git status --short`; preservar WIP compartido. No ejecutar push a main: despliega Vercel.
2. Usar Node24/pnpm12 y paquetes exactos del lock existente. Las credenciales AXIS quedan fuera del repo.
3. Elegir la base local explícita. La base habitual55432 y el entorno de diseño55433 son distintos.
   Una suite puede escribir fixtures en la PG local configurada; no apuntarla a una base cloud.
4. No copiar dotenv, WIF, secretos de Production ni sesiones reales a Preview o al artifact de diseño.

El commit local3c7bcb5 contiene13migraciones; freshDDL, restore PG16/18 y337tests sin omisiones pasaron. El recibo
separa ese resultado del recovery histórico8 y del canary cloud26Oct. No ejecutar un down para borrar
features con datos: las migraciones nuevas deben conservarlos y rechazan el downgrade destructivo.

## Entorno para Claude Design

El entorno ya se construyó con origen3216, PG55433 e issuer sintético19338; personas y datos son fixtures.
Su [manual específico](integrar-claude-design-local.md) posee puertos, identidades, arranque y limpieza:

```sh
cd /Users/jreye/Documents/efeonce-rooms
pnpm integration:status
pnpm integration:up
pnpm integration:check
```

El bootstrap reconoce una allowlist exacta de13migraciones y reconcilia sólo sus tres actores sintéticos,
sin cambiar contenido/revisiones de salas. Multimedia es opt-in: `pnpm integration:up --multimedia`;
`--images-only` la desactiva y `up` sin opción conserva el modo guardado. Cambiar modo exige detener
primero. El supervisor procesa jobs de imagen/multimedia secuencialmente fuera de HTTP. `check` prueba
imágenes; `node --conditions=react-server --import tsx scripts/design-backend-check.ts` prueba el
backend nuevo con multimedia habilitada. Ninguno acepta UI ni habilita los puertos X-ray/CRM.

No extraer el token de una fixture de sus archivos privados ni imprimir el estado completo. El launcher
muestra sólo metadata segura. Al terminar:

```sh
pnpm integration:stop
```

Stop afecta únicamente procesos/PG propios comprobados. Durante multimedia espera el trabajo finito
activo: presupuesto240s más60s de cierre. No promete parada instantánea ni detiene Auth u otros productos.

## Elegir un consumidor

Browser: importar `createRoomsClient` de `src/client`; fijar `organizationId` y usar el mismo origin de
Rooms. La cookie HttpOnly viaja con el navegador; no bearer en localStorage/sessionStorage. Las DTOs y
permisos del servidor deciden qué acciones existen. Un rol nominal no concede acceso.

CLI/MCP: requieren un archivo0600 del operador, sin symlink, de una sesión ya existente del origen
exacto. Su formato es `{origin,sessionCookie}`; no crear otra identidad, copiar el contenido al chat o
registrarlo en un resultado. El login interactivo de CLI no está implementado. La sesión productiva
no acepta un bearer nativo por tener una variable `ROOMS_ACCESS_TOKEN`.

Ejemplo de lectura CLI, con archivo existente y la edición devuelta por el reader:

```sh
pnpm rooms questions --base-url http://127.0.0.1:3216 --session-file /ruta/privada/rooms-session.json --organization test-design-org-a --room test-design-room-a --edition EDITION_ID --limit 25
```

Otros readers: `steps`, `activity`, `tours`, `tour --tour ID`, `notes`,
`presentation --session ID`, `presentation-console --session ID`, `integrations` y
`xray-preview --source-edition ID`. En integraciones máximo25 por página; pasar el `nextCursor`
recibido a `--cursor`. Es metadata interna, no una consulta libre a un CRM.

## Escribir y comprobar

Todos los commands usan POST `/api/v1/commands`; SDK `api.command(operation,payload,{idempotencyKey})`
o CLI `execute --operation ID --input archivo.json --idempotency-key KEY`. Usar IDs y revisión actuales,
archivo de input privado y una key estable por intención. El servidor revalida grants, scope, estado y
expiración incluso al repetir una key. Un receipt de command no demuestra procesamiento o entrega.

1. Releer sala/edición y revisión; elegir la acción permitida.
2. Construir payload estricto desde el schema canónico. No añadir owner, ready o privilegios inventados.
3. Ejecutar una vez y conservar receipt/correlationId sin credenciales.
4. Releer el agregado para confirmar el cambio. Ante timeout, reconciliar con la misma intención/key.
5. Ante409, releer y resolver el conflicto; no sobrescribir ni fabricar otra key para ocultarlo.

Colaboración: `questions.create/answer/resolve` y `steps.create/update`; anclas sólo de la edición visible.
Activity registra hechos operativos; no convertirla en intención comercial o reproducción comprobada.

Presentación: `tours.upsert`, `notes.upsert/delete`, `presentation.prepare/start/end/control/ack`.
Las notas son propias incluso ante administrador. Prepare fija edición/tour/owner/instance y TTL;
start/end usan revisión y secuencia, control/ack sólo su secuencia. Console es del owner, audiencia no
recibe notas o controller instanceId. Ack significa reporte declarado; no reproducción ni atención.
Una reconexión relee el estado actual antes de actuar. No hay control remoto o adapter de ventanas aún.

Invitado: los derechos adicionales deben pedirse expresamente y quedan limitados a la edición inicial.
Una invitación vieja no gana permisos por actualizar el software. Guest receipts/notas/sesiones/ack
referencian sesión/invitación; nunca se crea una identidad interna para que pase una FK. Revoke y archivo
siguen denegando lectura, write, replay y bytes. El único canary/correo real ya está cerrado y no se repite.

## Multimedia V4 local

El circuito de imágenes V3 y su worker cloud siguen separados. V4 requiere activación explícita **sólo
local**, `ROOMS_RUNTIME_PROFILE=local` y `ROOMS_MULTIMEDIA_LOCAL_ENABLED=true`. Vercel/cloud se rechazan.
El decoder exige macOS, sandbox y binarios exactos: FFmpeg8.1.1, Poppler26.04.0 y cwebp1.6.0.
No instalar otra versión por inferencia ni suponer que Docker/Linux dispone de esos codecs.

En una ejecución local configurada: crear manifestV4 → initiate con SHA/tamaño/tipo/procedencia → pedir
`multimediaTransfer` → `putMultimediaTransfer` del SDK → complete → consultar estado → worker → attach
→ validar/publicar → leer derivado privado. La configuración del entorno y las pruebas están en el
[ADR multimedia](../../architecture/rooms/EFEONCE_ROOMS_LOCAL_MULTIMEDIA_DECISION_V1.md).

El worker finito sobre la base local seleccionada se ejecuta con:

```sh
ROOMS_RUNTIME_PROFILE=local ROOMS_MULTIMEDIA_LOCAL_ENABLED=true ROOMS_LOCAL_MULTIMEDIA_ROOT=/ruta/privada/multimedia pnpm multimedia:worker
```

Ese comando procesa un trabajo y termina; no configura DB, no arranca scheduler ni convierte el flag
en acceso web. API y worker deben apuntar a la misma base/storage locales autorizados; el comando no proporciona credenciales DB.
El launcher ya configura y supervisa su worker con storage propio. Para V4 usar `sha256MultimediaBlob`
y `putMultimediaTransfer`; validan MIME/tamaño/TTL y origen. El cálculo SHA usa un ArrayBuffer
acotado al límite del formato. `sha256Blob` continúa limitado a imágenes20MiB.

PDF<=40MiB/40páginas, audio<=64MiB/1200s, MP4<=128MiB/300s/4K/60fps. El servidor mide bytes y codecs;
la extensión no valida el contenido. PDF produce todas las páginas o falla; audio MP3+peaks y video
MP4faststart+poster. Ready no es attach ni publicación. Nunca original, URL remota, HLS o PDF parcial.

La prueba física local ya ejercitó PDF/audio/video y entrega privada. Dockerdaemon está ausente y el
sandbox/cgroup Linux, imagen del worker y operación cloud de V4 siguen bloqueados. No publicar V4 en
producción por esta evidencia. El CLI añade `multimedia`, `multimedia-upload`, `multimedia-upload-bytes` y `multimedia-bytes`,
con streaming/archivos0600; no relaja los límites de `upload-bytes/media-bytes` de imágenes.
La nueva UI aún no ha sido conectada/aceptada.

## Importación X-ray y CRM

Preview de X-ray usa un puerto server-owned autorizado, no una URL o JSON arbitrario del navegador.
Valida mapping, hash/revisión, coverage y exclusiones. Importar exige previewHash y aceptación exacta;
el servidor vuelve a leer la fuente y ejecuta el import canónico con CAS. Fuentes cambiadas dan conflicto.

Los puertos X-ray y verificador CRM están OFF en la composición por defecto. `source_not_configured`
o unavailable es un resultado real; las fixtures de tests no autorizan conectores ni tokens externos.
`linkCrm` sólo conserva una referencia validada y owner; `requestHandoff` conserva una solicitud `pending`.
Ese evento no prueba envío, entrega, recepción o sincronización en HubSpot. Configurar un writer externo
requiere su propia decisión, credenciales y verificación.

## MCP stdio local

El SDKoficial atiende MCP local sobre el mismo HTTP con el archivo de sesión existente. Default `read`
publica sólo lecturas; elegir `--toolset presentation`, `collaboration`, `media`, `multimedia`,
`invitations`, `integrations`, `authoring` o `all` es una configuración explícita de superficie. Autoridad
permanece en Rooms. Para un host stdio usar Node directo, como en la prueba SDK, evitando banners de pnpm:

```sh
node --conditions=react-server --import tsx scripts/rooms-mcp.ts --base-url http://127.0.0.1:3216 --session-file /ruta/privada/rooms-session.json --toolset read
```

Alternativa de consola: `pnpm --silent rooms:mcp` con los mismos argumentos. No configurar conexiones
en aplicaciones ni extraer cookies por este manual. El adapter no inicia OAuth/login ni concede un
consentimiento MCP remoto. La federación pública sigue en el gateway hermano y requiere otro gate.

Los schemas derivan del catálogo canónico y las cuatro annotations se emiten en tools/list. Los toolsets
evitan cargar toda la autoría en cada sesión; el recibo publica su presupuesto medido. Las URLs firmadas,
OTP, bytes y rutas arbitrarias de filesystem están excluidos. Transferir por UI/CLI autorizado, no pegar
un descriptor o un archivo base64 al modelo. Responses>256KiB fallan explícitamente: reducir página o
usar reader más específico. Errores upstream no se imprimen ni se presentan como éxito.

## Verificar y cerrar

`pnpm verify` combina lint, tipos, suite y build; confirmar antes la PG local elegida y revisar skips.
`pnpm test:e2e` prueba la interfaz que existe, no acepta el nuevo diseño. Pruebas focales SDK/HTTP/MCP,
PostgreSQL, guest y codecs se enumeran en el recibo. No repetir email/Microsoft/MFA por una continuación.

`node --conditions=react-server --import tsx scripts/media-capacity-check.ts` mide decoder de imágenes
con fixtures40MP/20MiB y ráfaga serial finita; CPU/RSS locales no son capacidad/coste cloud.
`pnpm media:recovery --fresh` y `pnpm media:recovery:pg16` verifican el corte publicado de8migraciones;
no representan restore de13/V4. El restore ampliado se reproduce con `node --conditions=react-server --import tsx scripts/backend-recovery.ts`
(default PG18) o `--pg16`; usa bases/storage desechables propios y ninguna credencial cloud.

FreshDDL/restore/global del candidato pasaron. Antes de rollout siguen: nueva UI y recorrido completo,
Linux/cloudV4, puertos externos y federación MCP si se decide habilitarlos, autorización y readback de release.
Auth permanece en PR; no merge/deploy/flags desde este manual.

## Salas con medios combinados

Crear V4 de forma explícita permite combinar imágenes, PDF, audio y video en una edición. Las imágenes
usarán uploads/media y content.attachAsset; los demás formatos multimedia.initiate/complete y
multimedia.attachAsset. El authoring/preview resuelve ambos almacenes bajo la misma revisión.
El snapshot de audiencia multimediaAssets usa kind para elegir /media (image) o /multimedia
(pdf/audio/video); nunca entrega originales ni referencias de bloques excluidos. Los límites de
imagen20MiB/40MP permanecen independientes. Una pregunta puede usar timeMs sólo en audio/video
publicado, dentro de su duración medida; no inferir duración desde el cliente.

Una referencia de archivo no excluida necesita un bloque de medios visible. Si falta, coverage devuelve
asset_reference_unplaced y publicación falla aunque los bytes estén ready. Para omitir un archivo,
excluir explícitamente su referencia con required=false y una razón, o ubicarla en otro bloque visible.

Las suites PostgreSQL comparten colas globales; pnpm test ejecuta sus archivos en serie. No lanzar
varias suites de workers a la vez contra la misma base con raíces privadas distintas. Cada recovery
crea su propia base y storage, y puede ejecutarse independientemente.
