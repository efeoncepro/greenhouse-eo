# Rooms — contrato backend para Claude Design

> Candidato local29Oct2026 en `codex/rooms-design-integration`: backend ampliado sin UI ni push/deploy.
> [Recibo y gates finales](../../audits/rooms/2026-10-29-backend-local-completion.md).
> El corte cloud26Oct publicó imágenes V3; no acredita las ampliaciones V4/R09/R11/R14/MCP descritas abajo.
> Canary único cerrado OFF y Auth retenido en PR, sin merge/deploy ni cambios de flags.

Responsabilidades ratificadas por el operador2026-10-26: **Codex backend; Claude Design interfaz**.
Este documento describe contratos ejecutables, no una composición visual ni una aceptación de la UI.

[Readback conjunto26Oct](../../audits/rooms/2026-10-26-docs-skills-state-readback.json). Los recibos previos conservan su alcance fechado.

## Estado y fuentes

- Corte cloud documentado26Oct: `https://efeonce-rooms.vercel.app`, main `e4b2e890`, despliegue entonces promovido
  `dpl_7JmMF7ZPBzR56wff83UyL4yFsXoS`; acceso/invitaciones/medios web OFF.
- Salas/ediciones V1/V2/V3, permisos, API/CLI, GCS privado y transferencia directa implementados.
  Ocho migraciones/26 tablas y Job con SA/rol propios; Scheduler OIDC cada minuto sólo lo inicia con
  demanda. Flag de máquina ON separado de todos los flags humanos.
- [Canary real](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md): PNG físico a dos WebP,
  lectura privada, correo único recibido, revocación comprobada y cierre OFF; no repetir el envío.
  [Scheduler](../../audits/rooms/2026-10-26-automatic-media-dispatch.json):200 en vacío sin contenedor,
  202 con demanda sintética archivada→Job exitoso→ack libre. Son dos verificaciones de distinto alcance.
- Schemas: `efeonce-rooms/src/domain/{contracts,persistence-contracts,content-contracts,content-v3,media-contracts}.ts`.
- Fuente de permisos: `can` y autoridad persistida servidor. Roles nominales/organizationId no conceden acceso.
- El scaffold UI2071 queda en su rama histórica; producción conserva la interfaz de20f9fe9.
  Diseño y experiencia definitivos pertenecen a Claude Design.

## Lo que falta para conectar la interfaz

| Entrega | Owner | Criterio de salida |
| --- | --- | --- |
| Entorno local aislado y conectores | Codex backend: preparado en rama local `codex/rooms-design-integration` | Next3216, PG55433, issuer fixture19338, dos organizaciones, SDKbrowser y18comprobaciones API PASS; nueva UI aún por conectar |
| Conectores de pantalla a DTO/readers/commands | Claude Design / integrador con apoyo backend | Listado, borrador, upload, estado, attach, preview, publicación y lector consumen la API existente; permisos vienen del servidor |
| Recorrido completo desde la nueva UI | Ambos | Cargar→verificar→procesar→adjuntar→publicar→leer; conflictos, expiración, denegación y revocación verificados |
| Acceso general de producción | Operador / Platform | Aceptación y decisión explícita de flags/cohorte; Auth permanece en PR hasta nueva instrucción |

Integrar el frontend dentro del runtime Rooms y su **mismo origen**. Un artifact o preview en otro
origin no es un consumidor autenticado habilitado: cookies, Origin exacto y CORS GCS no deben relajarse.
`cloud-production` exige Vercel Production/WIF exactos; Vercel Preview no puede heredar credenciales o
permisos de Production. El entorno local está preparado; no hay un staging cloud habilitado. [Arranque y SDK](../../manual-de-uso/rooms/integrar-claude-design-local.md).

Para el primer recorrido ya existen los servicios de backend; no depende de completar todo EPIC-052.
Las ampliaciones locales29Oct se detallan a continuación: no están desplegadas por haber pasado pruebas
locales. La entrega visual, la certificación conjunta y los conectores externos conservan sus gates.

## Paquete inicial para Claude Design — antecedente26Oct

Paquete inicial en `codex/rooms-design-integration@2cddc98a`, sin push ni deploy; el candidato vigente se
describe en la sección siguiente. Conectores browser-safe
`src/client`: readers, commands tipados/revisión/idempotencia, sesión/contexto, SHA y transferencia segura.
DTOs type-only derivados de las fuentes canónicas; bundle sin runtime server/fixtures. Prueba real con
navegador de los conectores: upload→worker local→attach→publish→lectura privada guest, negativas de
operador/cross-tenant/draft/workspace/anon y conflicto/replay. Esto verifica API en navegador, no la nueva UI.
[Manual](../../manual-de-uso/rooms/integrar-claude-design-local.md) y [evidencia](../../audits/rooms/2026-10-26-local-design-integration.json).
El launcher local es una fixture de acceso sin correo/Microsoft reales; no sustituye ni repite el canary cloud.

## Ampliaciones locales disponibles29Oct

Contrato ejecutable: `src/domain/{collaboration,presentation,integration,multimedia}-contracts.ts`.
Commit local3c7bcb5:13migraciones/43tablas,337tests sin omisiones, lint/types/build, restorePG16/18
y Chrome18+23checks PASS; no cambios de producción. [Operar y verificar](../../manual-de-uso/rooms/operar-backend-local.md).
No atribuir estos resultados al deployment cloud26Oct ni activar flags para diseñar.

### Preguntas, próximos pasos y actividad

Commands: `questions.create/answer/resolve`, `steps.create/update`; todos usan edición publicada,
`expectedRevision`, idempotencyKey, autoridad persistida y audit/outbox. Las anclas sólo apuntan a contenido
visible de esa edición; un bloque excluido no queda habilitado por existir en el manifest.
Una ancla con assetVersionId debe aparecer en el bloque de medios visible. timeMs sólo se acepta
para audio/video V4, entre0 y su duración medida en milisegundos; imágenes y PDF lo rechazan.
Responder y administrar pasos exige actor interno y capability explícita. Un externo sólo resuelve su
propia pregunta con permiso; no existe un bypass por nombre de rol. Una pregunta resuelta no admite
más respuestas. Responsable de paso es una persona interna activa o null.

SDK: `questions(roomId, editionId, page?)`, `steps(...)`, `activity(...)`. Respuestas contienen `items`,
`nextCursor` y revisión; la actividad es registro de operaciones reales, no prueba de atención, lectura
completa, intención de compra ni rendimiento comercial.

### Tours, notas propias y presentación

Commands: `tours.upsert`, `notes.upsert/delete`, `presentation.prepare/start/end/control/ack`.
Tours sólo admiten anclas visibles de edición publicada. Notes son propias incluso frente a administrador;
no van en edición, audiencia, receipt ni audit/outbox. Un invitado champion necesita permisos explícitos.

Prepare fija edición/hash y copia del tour, owner e instanceId. Cambiar el tour después no modifica esa
sesión. TTL máximo2h, limitado además por autoridad/grants/sesión; una renovación no extiende lo preparado.
Start/end usan revisión de sala y secuencia; control/ack usan secuencia exacta y no incrementan la revisión
de autoría. Control exige owner+instanceId; ningún admin toma otra consola por inferencia. Ack registra
un reporte de escena, nunca reproducción efectiva. Releer tras reconexión; no aplicar escenas antiguas
porque un receipt se haya repetido. Revoke/archivo/expiry se revalidan también en replay y readers.

SDK: `tours(roomId, editionId, page?)`, `tour(roomId, editionId, tourId)`, `ownNotes(...)`,
`presentation(roomId, editionId, sessionId)` y `presentationConsole(roomId, editionId, sessionId, page?)`.
Audiencia recibe estado/escena/secuencia/tour fijado; jamás notas o instanceId del controller. Console sólo
sirve al owner y pagina sus notas con `notesNextCursor`. El backend no implementa ventanas, BroadcastChannel,
WebSocket, sonido/fullscreen o sincronización remota: Claude Design implementará su adapter con QA propio.

### Derechos de invitación y actor guest

La migración13 permite pedir derechos adicionales explícitos de colaboración/notas/presentación sobre
la **edición inicial**, intersectados con autoridad vigente del emisor. Las invitaciones existentes
conservan sus capacidades guardadas. No concede estos derechos adicionales en futuras ediciones ni transforma al invitado en
miembro/principal interno. Receipts y referencias de notes/sessions/ack se ligan a sesión/invitación para
mantener sus FKs y revocación. El OTP sigue en Auth y su prueba local usa buzón sintético; no repetir correo.

### X-ray y referencia comercial

SDK: `integrations(roomId, page?)` (máximo25) y `previewXrayImport(roomId, sourceEditionId)`.
Commands: `integrations.importXray/linkCrm/requestHandoff`. Preview convierte el contrato Think real a
bloques nativos con fuente/hash/revisión, cobertura y exclusiones; importar exige previewHash y exclusiones
aceptadas exactas, más CAS/idempotencia. No se acepta una URL/cookie/JSON de cliente como autoridad de fuente.
Los puertos fuente/CRM son server-owned y **están deshabilitados en la composición por defecto**.
Mostrar unavailable/not_configured; no convertir fixtures en conectores operativos.

La referencia HubSpot exige verificador autorizado del sistema dueño. RequestHandoff guarda edición/hash,
responsable y referencia como solicitud `pending`; ese estado no es envío, entrega ni sincronización CRM.
`integrations(...).data.imports` pagina por `nextCursor`; preserva evidencias/linaje/exclusiones.

### Imágenes, PDF, audio y video en una sala V4

V4 es opt-in explícito (`rooms.content.v4`/`rooms.room.v4`, mediaBlock schemaVersion3); no convierte
V1/V2/V3. Una misma sala V4 puede combinar imágenes del pipeline existente y PDF/audio/video.
El DTO V4 multimediaAssets discrimina kind=image/pdf/audio/video; /media entrega imágenes y /multimedia
los otros tipos. No cruzar endpoints. HTTP/SDK y worker local usan archivos físicos, sandbox macOS y codecs fijados.
`ROOMS_MULTIMEDIA_LOCAL_ENABLED=true` exige perfil local y rechaza Vercel/cloud; el entorno de diseño no
lo habilita por defecto. Docker/Linux/cloudstorage/transcodificación no están certificados.

1. Crear V4 con procedencia explícita y bloque multimedia sin referencia aún.
2. Calcular `sha256MultimediaBlob(file)` dentro del límite de su formato. `sha256Blob` sigue limitado
   a imágenes20MiB; ningún hash o dimensión browser acredita readiness.
3. `multimedia.initiate` fija tamaño/tipo/SHA/owner; `multimediaTransfer(roomId, uploadId)` devuelve descriptor.
4. `putMultimediaTransfer(transfer, blob, {origin})` hace PUT same-origin y exige tamaño/tipo/expiry exactos.
   No registrar el descriptor. El PUT aún necesita verificación.
5. `multimedia.complete`; consultar `multimediaUpload(...)` o `multimedia(roomId)` hasta ready/failed.
   `integration:up --multimedia` configura/supervisa el worker local y su storage. Fuera del launcher,
   `pnpm multimedia:worker` exige DB, perfil, flag y raíz privada explícitos; termina tras un trabajo.
6. `multimedia.attachAsset`, preview y `editions.publish` canónicos; publicación fija todos los derivados.
   `multimediaRenditionPath(...)` usa edición fija o draft, nunca ambos. GET/HEAD/Range/304 reautorizan.

PDF devuelve todas sus páginas o falla completo. Audio produce MP3+peaks; video MP4faststart+poster.
No HLS, contenido remoto, originales descargables o un fallback a parser del browser. El CLI genérico
`execute` puede operar commands JSON; su `upload-bytes/media-bytes` pertenece al corte de imágenes,
no es un transporte multimedia de128MiB. Para ello usar `multimedia-upload-bytes`/`multimedia-bytes`
del CLI, con streaming, o el SDK multimedia. MCP excluye las transferencias binarias explícitamente.

### Lecturas HTTP nuevas

Todas exigen sesión y `organizationId`; los readers de listas admiten `limit/cursor` según su contrato.

| Ruta | SDK |
| --- | --- |
| GET `/api/v1/rooms/:roomId/editions/:editionId/questions` | questions |
| GET `.../steps` y `.../activity` | steps/activity |
| GET `.../tours`, `.../tours/:tourId`, `.../notes` | tours/tour/ownNotes |
| GET `.../presentations/:sessionId` y `.../console` | presentation/presentationConsole |
| GET `/api/v1/rooms/:roomId/integrations` | integrations |
| POST `.../integrations/xray/preview` | previewXrayImport |
| GET `/api/v1/rooms/:roomId/multimedia` | multimedia |
| GET `.../multimedia/uploads/:uploadId` y `.../transfer` | multimediaUpload/multimediaTransfer |
| PUT `.../multimedia/uploads/:uploadId` | putMultimediaTransfer |
| GET/HEAD `.../multimedia/:assetVersionId/:renditionId` | multimediaRenditionPath |

Los comandos nuevos conservan POST `/api/v1/commands`; no crear writers dentro de componentes.
Todos los DTOs se importan type-only desde `src/client`, no desde módulos SQL/worker al bundle del browser.
MCP local usa el mismo HTTP con sesión existente; no inicia OAuth ni concede autorización MCP remota.

## Identidad y límites de consumidor

Web usa la sesión HttpOnly del propio origin. Entrada interna por `/login?returnTo=/rooms`, callback del
servidor; no implementar OAuth ni guardar bearer/cookie/tokens en localStorage o sessionStorage.
Todas las peticiones autenticadas son same-origin con credenciales de sesión. Writes requieren Origin
exacto, enviado por el navegador. `organizationId` sólo selecciona contexto dentro de la autoridad efectiva.

Invitados: el enlace contiene un token en el fragmento. Limpiarlo antes de terceros/intercambios,
conservarlo sólo en memoria y usar el contrato de invitación existente. Abrir el enlace no manda correo;
un único correo inicial trae enlace+código. Verificación y resend explícito pertenecen al issuer;
no crear otro mailer. [Manual OTP](../../manual-de-uso/identity/operar-invitacion-rooms-email-otp.md).

CLI acepta `--session-file` privado0600, del operador y sin symlink: JSON
`{origin,sessionCookie}` con una sesión existente del origin exacto. Usa Cookie+Origin y el mismo resolver
canónico; no crea identidad ni evita expiración/revocación. Su obtención/login interactivo no está
implementado. El modo histórico `ROOMS_ACCESS_TOKEN` sirve para consumers bearer aprobados/fixtures;
**el resolver productivo actual no acepta bearer nativo**. No anunciar login CLI productivo certificado.

## Transporte común

Todos los commands: `POST /api/v1/commands`, JSON estricto, header `Idempotency-Key` estable por intención.

```json
{
  "organizationId": "org-ejemplo",
  "operation": "content.attachAsset",
  "payload": {
    "roomId": "room-ejemplo",
    "expectedRevision": 4,
    "blockId": "pieza-1",
    "assetRefId": "archivo-1",
    "assetVersionId": "version-ejemplo"
  }
}
```

Respuesta: `{data,correlationId}`; fallo: `{error:{code,message},correlationId}`. IDs de muestra no son
recursos vivos. Un receipt incluye revisión nueva y replayed; no equivale a imagen procesada/publicada.
Ante timeout de command, repetir la MISMA intención/Idempotency-Key. Ante409, releer estado y pedir una
resolución; no sobrescribir cambios ajenos ni generar otra carga para ocultar incertidumbre.

## Readers y permisos

Todos los readers de la tabla llevan `?organizationId=...`. IDs van codificados como segmentos.

| Ruta | Uso / autoridad |
| --- | --- |
| GET `/api/v1/operations` | Catálogo de operaciones implementadas; no afirma flagsON ni grants efectivos |
| GET `/api/v1/rooms` | Salas/contexto del actor; workspace.read |
| GET `/api/v1/rooms/:roomId/draft` | Proyección autorizada del borrador; puede omitir evidencia |
| GET `/api/v1/rooms/:roomId/authoring` | DTO V3/V4 de autoría; content.edit + rooms.read + evidence.read |
| GET `/api/v1/rooms/:roomId/preview` | Proyección de audiencia del borrador; content.edit, sin suplantar guest |
| GET `/api/v1/rooms/:roomId/media` | Assets y estados; content.edit |
| GET `/api/v1/rooms/:roomId/uploads/:uploadId` | Estado de carga y asset; content.edit |
| GET `/api/v1/rooms/:roomId/uploads/:uploadId/transfer` | Descriptor efímero de escritura; owner+content.edit+expiry |
| GET `/api/v1/rooms/:roomId/validation` | Cobertura real antes de publicar |
| GET `/api/v1/rooms/:roomId/editions/:editionId` | Edición fija autorizada; rooms.read |
| GET/HEAD `/api/v1/rooms/:roomId/media/:assetVersionId/:renditionId` | Bytes privados; añadir editionId O draft=true, nunca ambos |

`authoring` devuelve `{organizationId,roomId,title,revision,draftId,permissions:{canEdit,canPublish},content,
coverage,assets,multimediaAssets?}`. assets conserva el DTO de imágenes; V4 añade multimediaAssets
para los estados de PDF/audio/video y content.assets resuelve el inventario combinado. Cada asset devuelve id/assetVersionId/displayName/mimeType/byteSize,width/height/orientation,
state,preview,problem y acciones canRetry/canCancel/canAttach. Valores nulos significan no medidos aún.
No inferir ready de dimensiones browser o de que PUT devolvió200.

No reenviar un borrador proyectado/filtrado como reemplazo completo: puede perder evidencia oculta.
Usar commands acotados para bloques/assets/orden. V1/V2 publicados permanecen inmutables. Crear V3 exige
procedencia explícita; convertir legacy requiere mapping revisado y conserva sus fuentes. La conversión
V2 sin medios del scaffold exige permisos completos; V1 y V2 con medios no se migran automáticamente.

## Flujo de imagen completo

1. Crear sala mediante `rooms.create` con manifest `rooms.content.v3`, dataOrigin real/synthetic y
   provenance `{sourceType:user-authored|fixture,reference}`. El servidor añade actor/fecha. No enviar ready.
2. Añadir bloque mediaV3 `schemaVersion:2`, id,title,alt,caption,required y assetRefIds inicialmente vacío.
   Una imagen por bloque; se pueden añadir múltiples bloques/piezas. `content.upsertBlock` preserva el resto.
3. Calcular SHA-256 local del archivo. `uploads.initiate`: roomId,expectedRevision,displayName,mimeType,
   byteSize,sha256,dataOrigin,provenance. Guardar IDs/revisión del receipt; no guardar un descriptor secreto.
4. Solicitar GET `.../uploads/:uploadId/transfer` con sesión. Descriptor: method PUT,url,headers,expiresAt,
   maxBytes. **No registrar la respuesta completa, URL ni firma**. En local, URL same-origin; en GCS,
   destino único del bucket privado y TTL máximo5min. Reconsultar después de vencer.
5. PUT del Blob a descriptor.url con `redirect:error` y headers firmados: para GCS usar `credentials:omit`;
   para URL local usar credenciales same-origin. **No copiar Cookie ni Authorization de la aplicación a GCS**.
   El navegador envía Origin automáticamente para CORS y coloca Content-Length automáticamente;
   omitir ese header al construir Headers JS, conservando Blob/File del tamaño exacto firmado.
6. Si PUT devuelve200, aún falta verificar. Si devuelve412 tras una respuesta incierta, puede existir el
   mismo objeto: ejecutar complete para reconciliar, sin afirmar éxito ni subir otra versión silenciosamente.
7. `uploads.complete` con uploadId y expectedRevision. Backend inspecciona metadata/generación/tamaño/tipo/SHA
   fuera de SQL y vuelve a comprobar autoridad/CAS. Respuesta no implica que el worker haya terminado.
8. Consultar estado hasta ready/failed/cancelled. Scheduler revisa cada minuto: no hay promesa de arranque inmediato ni porcentaje de progreso. Worker comprueba contenedor/animación/codec/límites y produce
   preview+thumbnail. En failed, mostrar problem.code y ofrecer únicamente acciones autorizadas.
9. `content.attachAsset` vincula asset al bloque/ref con revisión actual. El `assetRefId` debe ser nuevo o apuntar ya a esa misma versión; un ref existente con otro valor, incluso null, produce409. Mantener refs vacíos hasta el attach verificado. Título/alt/pie se guardan mediante
   `content.upsertBlock` sobre el bloque correspondiente. Lista para añadir y añadida son estados distintos.
10. Preview usa el mismo contenido proyectado. Publicar con `editions.publish` sólo con canPublish y cobertura
    válida; servidor vuelve a resolver ready/scope y fija generaciones. No transformar ready en publicado en UI.
11. Lector invitado usa DTO de la edición fija y la ruta privada de rendition con editionId. El servidor
    reautoriza GET/HEAD/Range/304; no hay download del original ni URL bearer de lectura.

Los writes del corte de imágenes incrementan revisión. Releer tras recuperación/conflicto. `uploads.cancel`,
`media.cancel` y `media.retry` son commands con expectedRevision/idempotencia. Cancelar no borra bytes ya
recibidos por otro actor; una URL de escritura ya emitida puede durar hasta5min, pero complete queda denegado.

## Formatos, errores y presentación de estados

Fuente ejecutable: MEDIA_LIMITS en media-contracts.ts. Corte de imágenes V3: PNG/JPEG/WebP estáticos, original<=20MiB,
<=40MP; dos derivados WebP<=3MiB cada uno. APNG, WebP animado, SVG, HTML, GIF, PDF/audio/video no están
habilitados por el corte V3. El V4 local separado usa MULTIMEDIA_LIMITS y su ADR; no ampliar esta allowlist. No usar el nombre/extensión como validación. Alt obligatorio, ratio y alpha intactos.

| Estado | Significado para el consumidor |
| --- | --- |
| awaiting_upload | Intención creada; solicitar transfer y subir |
| uploaded | Bytes recibidos; falta complete |
| processing / pending | Verificación/proceso pendiente; no inventar porcentaje |
| ready | Derivados verificados; todavía puede faltar attach/publicación |
| failed | Error saneado; retry sólo si actions.canRetry |
| cancelled | No reactivar; nueva intención explícita si corresponde |

401 sesión requerida;404 recurso ausente/no autorizado para readers;403 write denegado;409 revisión/estado
cambiado;400 input inválido;413 tamaño;415 tipo de transporte;416 Range inválido;503 configuración/storage
indisponible. Nunca mostrar al cliente stack, bucket, key, URL firmada o causas de SDK. correlationId sirve
para soporte. No reinterpretar404 como invitación a probar otra organización.

## Bytes privados, caché y lifecycle

- No usar next/image optimizer ni cache pública. URL de rendition necesita sesión/grants actuales.
- HEAD/304 también comprueban SHA; corrupción de mismo tamaño devuelve fallo, sin ETag legítimo.
- Range único soporta inicio/fin,sufijo y final abierto; HEAD ignora Range. No multipart-range en este corte.
- Retirar contenido/inspector del DOM al terminar autoridad; manejar visibility/retorno sin snapshots entre actores.
- Archivar/revocar niega nuevas peticiones; una respuesta admitida y bytes guardados no pueden retirarse.
- CSP permite únicamente el namespace GCS propio cuando cloudmedia está configurado; CORS del bucket sigue
  siendo requisito externo antes de usar el flujo real.

## Verificación y pendientes operativos

Histórico26Oct: backend234/234,9pruebas focales de dispatch,lint/types/build y CI Linux PASS. Playwright53PASS/3skip
acredita la interfaz/scaffold existente y sus pruebas automáticas; no certifica el nuevo diseño.
[Recovery aislado PG16/18](../../audits/rooms/2026-10-26-media-backend-recovery.md) conserva evidencia de
su corte de siete migraciones, hashes/generaciones, ACL e inmutabilidad; la
[migración8](../../audits/rooms/2026-10-26-media-dispatch-database.json) añadió coordinación y preservó
salas/publicaciones. No convertir esa combinación en una nueva prueba física de restore cloud.

Bucket/IAM/CORS, SA/rol y Job están desplegados, y el PNG físico con entrega privada ya está probado.
La prueba automática de transporte no decodifica otra imagen: una sala archivada debe rechazarla antes
de storage. Memoria de peor caso/formato máximo, coste/throughput bajo carga y rollout general no se
acreditan con una imagen de canary o un contenedor vacío. [Manual worker](../../manual-de-uso/rooms/operar-worker-medios.md).

Auth conserva el runtime previo y flags OFF. Las correcciones de su deploy-control están sólo en
[PR263/264](../../audits/rooms/2026-10-26-auth-deploy-control.md), por decisión humana. No fusionar,
encender flags ni enviar correos por conectar el diseño. El canary completado no se repite por inferencia.

Una referencia de archivo no excluida necesita un bloque de medios visible. Si falta, coverage devuelve
asset_reference_unplaced y publicación falla aunque los bytes estén ready. Para omitir un archivo,
excluir explícitamente su referencia con required=false y una razón, o ubicarla en otro bloque visible.
