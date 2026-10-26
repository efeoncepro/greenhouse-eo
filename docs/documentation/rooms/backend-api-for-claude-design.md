# Rooms — contrato backend para Claude Design

> Canary real completado: Microsoft/MFA, un correo y un PNG por GCS→Job→WebP privado, con aislamiento y revocación comprobados. Flags restaurados OFF; consumidor frontend y disparo automático del Job pendientes. [Evidencia](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md).

> Release2026-10-26: backend integrado en `main@a87852e` mediante [PR2](https://github.com/efeoncepro/efeonce-rooms/pull/2). Se excluyeron los doce paths visuales2071; la interfaz actual sigue con placeholder. Bucket/IAM, migracionescloud y Job aplicados; ejecuciónvacíaPASS, flagsappOFF. El diseño debe conectar transferencia directa y entrega privada antes de activar medios. [Recibo](../../audits/rooms/2026-10-26-production-backend-release.json).

Responsabilidades ratificadas por el operador2026-10-26: **Codex backend; Claude Design interfaz**.
Este documento describe contratos ejecutables, no una composición visual ni una aceptación de la UI.

## Estado y fuentes

- Producción: `https://efeonce-rooms.vercel.app`, backend `main@a87852e`, acceso/invitaciones/mediosOFF.
- Backend de medios: TASK-2070/2072 integrado por [PR2](https://github.com/efeoncepro/efeonce-rooms/pull/2).
  Bucket/IAM/CORS, siete migraciones cloud y Job ya aplicados; imagen Linux probada por CI y una ejecución
  real con cola vacíaPASS. Variables GCS del proyecto preparadas para próximo deploy. Canary físico interno completado;
  consumidor y disparo automático del Job antes de mediaON permanecen pendientes. PR1 conserva el antecedente d056708.
- Schemas: `efeonce-rooms/src/domain/{contracts,persistence-contracts,content-contracts,content-v3,media-contracts}.ts`.
- Fuente de permisos: `can` y autoridad persistida servidor. Roles nominales/organizationId no conceden acceso.
- El scaffold UI2071 queda en su rama histórica; producción conserva la interfaz de20f9fe9.
  Diseño y experiencia definitivos pertenecen a Claude Design.

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
| GET `/api/v1/rooms/:roomId/authoring` | DTO V3 de autoría; content.edit + rooms.read + evidence.read |
| GET `/api/v1/rooms/:roomId/preview` | Proyección de audiencia del borrador; content.edit, sin suplantar guest |
| GET `/api/v1/rooms/:roomId/media` | Assets y estados; content.edit |
| GET `/api/v1/rooms/:roomId/uploads/:uploadId` | Estado de carga y asset; content.edit |
| GET `/api/v1/rooms/:roomId/uploads/:uploadId/transfer` | Descriptor efímero de escritura; owner+content.edit+expiry |
| GET `/api/v1/rooms/:roomId/validation` | Cobertura real antes de publicar |
| GET `/api/v1/rooms/:roomId/editions/:editionId` | Edición fija autorizada; rooms.read |
| GET/HEAD `/api/v1/rooms/:roomId/media/:assetVersionId/:renditionId` | Bytes privados; añadir editionId O draft=true, nunca ambos |

`authoring` devuelve `{organizationId,roomId,title,revision,draftId,permissions:{canEdit,canPublish},content,
coverage,assets}`. Cada asset devuelve id/assetVersionId/displayName/mimeType/byteSize,width/height/orientation,
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
8. Consultar estado hasta ready/failed/cancelled. Worker comprueba contenedor/animación/codec/límites y produce
   preview+thumbnail. En failed, mostrar problem.code y ofrecer únicamente acciones autorizadas.
9. `content.attachAsset` vincula asset al bloque/ref con revisión actual. El `assetRefId` debe ser nuevo o apuntar ya a esa misma versión; un ref existente con otro valor, incluso null, produce409. Mantener refs vacíos hasta el attach verificado. Título/alt/pie se guardan mediante
   `content.upsertBlock` sobre el bloque correspondiente. Lista para añadir y añadida son estados distintos.
10. Preview usa el mismo contenido proyectado. Publicar con `editions.publish` sólo con canPublish y cobertura
    válida; servidor vuelve a resolver ready/scope y fija generaciones. No transformar ready en publicado en UI.
11. Lector invitado usa DTO de la edición fija y la ruta privada de rendition con editionId. El servidor
    reautoriza GET/HEAD/Range/304; no hay download del original ni URL bearer de lectura.

Los writes de media incrementan revisión. Releer tras recuperación/conflicto. `uploads.cancel`,
`media.cancel` y `media.retry` son commands con expectedRevision/idempotencia. Cancelar no borra bytes ya
recibidos por otro actor; una URL de escritura ya emitida puede durar hasta5min, pero complete queda denegado.

## Formatos, errores y presentación de estados

Fuente ejecutable: MEDIA_LIMITS en media-contracts.ts. Corte actual: PNG/JPEG/WebP estáticos, original<=20MiB,
<=40MP; dos derivados WebP<=3MiB cada uno. APNG, WebP animado, SVG, HTML, GIF, PDF/audio/video no están
habilitados por este corte. No usar el nombre/extensión como validación. Alt obligatorio, ratio y alpha intactos.

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

Recuperación aislada PG16(fresh,siete migraciones) y PG18 DB+storage ya prueba2tenants/6salas,PNG/JPEG/WebP,hashes/generaciones/ACL/inmutabilidad,
legacy/down-up y corrupción/revocación: [evidencia](../../audits/rooms/2026-10-26-media-backend-recovery.md).
Dobles de GCS prueban contrato SDK/complete/CAS; no acreditan bucket/IAM/firma o entrega física.
Worker compila sin tsx/Next/React/AXIS; smoke prodclosure aislado y construcción Docker Linux con smoke CI PASS.
Recursos/roles/IAM/CORS/scheduler/memoria nativa/timeout, migración cloud y canary de medios pendientes;
acceso e invitación reales dependen del canary conjunto Auth–Rooms. No cambiar flags por conectar el diseño.
