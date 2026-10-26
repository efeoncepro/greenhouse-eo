# Efeonce Rooms — imágenes privadas y procedencia versionada

- Status: **Accepted para implementación LOCAL** — raíz aprueba el plan R05A parcial el 2026-10-25; cloud y rollout conservan gates pendientes.
- Fecha: 2026-10-25.
- Dueño: Platform / Media / Product; implementación backend TASK-2070, consumidor UI dependiente separado.
- Alcance: EPIC-052 R05A. No supersede identidad, invitaciones ni el piloto cloud de TASK-2069.

## Continuidad cloud 2026-10-26

Este ADR conserva la decisión del primer corte local; su límite de despliegue fue extendido por el
[ADR cloud de medios](EFEONCE_ROOMS_CLOUD_MEDIA_BACKEND_DECISION_V1.md). Backend integrado en main
`e4b2e890`: GCS privado, ocho migraciones/26 tablas, Job propio y Scheduler OIDC por demanda. Un PNG
físico produjo dos WebP y se leyó con autoridad real; el canary de identidad/correo/imagen terminó con
revocación/archivo y flags humanos OFF. [Estado y evidencias](README.md).

La máquina dispatch está ON; la nueva UI de Claude Design y su recorrido integrado están pendientes.
No repetir el correo ni activar medios por este estado. Auth PR263/264 siguen sin merge/deploy.
El contexto siguiente describe el HEAD previo al inicio local, no el inventario actual.

## Contexto verificado al iniciar el corte local

HEAD Rooms `20f9fe9` conserva manifest/snapshot V2 synthetic, AssetVersionRef sin resolución,
publicación textual y lector privado. `content-validation.ts:86–91` mantiene todos los assets en pending;
`room-reader.tsx:19` muestra entrega pendiente. No existen tablas de medios, upload o worker.
La infraestructura futura ya tiene canon: GCS privado y worker separado; la base cloud actual sólo posee
DB/WIF/secretos de Rooms. Un bucket o worker de otro producto no se convierte en dependencia disponible.

## Decisión aceptada para el corte local

Construir un circuito de imágenes estáticas PNG/JPEG/WebP. Primer gate local sobre bytes reales de
fixtures explícitamente sintéticas y storage privado; adapter cloud y su activación conservan gates propios.
PDF/audio/video/animación/tiles y descarga del original permanecen fuera de R05A, con error unsupported
visible. Ningún decoder intenta contenido remoto, SVG/HTML ni un formato sólo porque coincida la extensión.

### 1. Procedencia y compatibilidad

- Nuevos `rooms.content.v3`, `rooms.room.v3` y `rooms.renderer.v3` permiten `dataOrigin: real | synthetic`.
  Es procedencia declarada del contenido; no valida derechos, fuente, resultados ni claims comerciales.
- Input V3 debe declarar origen y fuente (`user-authored | fixture`, referencia/nota acotada). El servidor
  añade autor/fecha e identidad del contexto. No acepta actor, readiness o metadata medida del caller.
- Importar/reabrir legacy no cambia origen por inferencia: V1/V2 y snapshots publicados permanecen byte-for-byte.
  Convertir un borrador a V3 es command explícito; real no se deriva del hostname, correo, logo ni formato de archivo.
- Un archivo generado usado en propuesta real sigue procedencia real de la propuesta, con su generación declarada
  en metadata; synthetic significa fixture/demostración, no la técnica utilizada para producir sus píxeles.
- Claims/evidence actuales conservan author-declared/unverified; permitir real no añade verified/measured ni crawling.
- AssetVersion registra source/provenance y autor server-side, además de metadata medida de bytes. Se congela al publicar.

### 2. Dominio y estados

Tablas propias propuestas: upload_sessions, assets, asset_versions, media_renditions, media_jobs y edition_assets.
Todas incluyen scope org/room y FKs compuestas donde corresponde. AssetVersion fija checksum SHA-256,
object generation, tamaño/tipo reales, dimensiones, orientación/alpha y versión de inspector.

Uploads: initiated → uploaded → completed, o cancelled/expired. AssetVersion: pending → processing → ready,
o failed/cancelled. Los errores se expresan con code/retryable y no contienen paths, buckets, tokens o stack.
La metadata/payload no puede declarar ready. Rendition fija perfil técnico/versionado/checksum/generación;
no representa una nueva variante editorial. Original y derivados nunca se sobrescriben.

Jobs únicos por `(assetVersionId, profileVersion)`, lease y fencing token monotónico. Un resultado de worker
con lease vencido no cambia estado ni publica objetos como actuales. Retry acotado, cancelación explícita,
receipts/audit/outbox y CAS como el dominio existente. I/O y decodificación fuera del lock/transacción SQL.

### 3. Transferencia y procesamiento

- initiate reconsulta autoridad content.edit sobre borrador; sesión fija owner/org/room, formato esperado,
  tamaño, expiración y destino generado por servidor. Descriptores bearer cloud no se persisten en receipts/logs; una URL local que exige sesión fresca no es un bearer y conserva compatibilidad del receipt local.
- Primer adapter local: filesystem privado fuera de public; endpoint streaming acotado con autenticación
  y sesión de transferencia limitada. Namespace sólo IDs generados, sin paths arbitrarios del caller.
- Cloud futuro: cuarentena GCS propia y transferencia directa; CORS al origin exacto, sin wildcard. Una
  resumable session URI es un bearer de escritura: cancelarla/rechazar complete y limpiar bytes huérfanos
  son controles separados. Expiración lógica de Rooms no implica cancelación física del proveedor.
- complete reconsulta autoridad fresca, revocación/expiry y generación; inspección de bytes verifica checksum,
  formato, límites y pertenencia. Worker no reutiliza cookies/sesiones humanas ni bases de otros productos.
- Propuesta inicial a medir: original <=20 MiB, <=40 millones de píxeles; proceso con CPU/RAM/tiempo limitados,
  concurrencia local1, máximo3 intentos. Derivados preview/thumb <=3 MiB, orientación aplicada y ratio íntegro;
  no crop/stretch. Si no se obtiene un derivado legible dentro del perfil, failed explícito, no ready parcial.
- Sharp/decoder vive en worker, nunca en bundle browser ni carga de prerender. Las versiones se pinnean
  después de resolver compatibilidad y cuando termine la ventana de freeze de dependencias del canary.

### 4. Publicación y DTO

publish resuelve AssetVersion/renditions ready en el mismo scope y congela IDs, generations, checksums,
dimensiones y profileVersion. No acepta un resolver callback público que permita al caller afirmar readiness.
Cada request de bytes verifica pertenencia del asset/rendition a la edición elegida, además de rooms.read;
un grant a una edición no abre assets de otro borrador ni de otra sala en la misma organización.

`content.attachAsset` vincula assetRef a bloque bajo expectedRevision sin reemplazar silenciosamente inventario.
Preview de audiencia del borrador requiere content.edit, usa el mismo proyector que la lectura publicada y
no suplanta una sesión guest. Upload/readback/attach/publish son operaciones independientes y observables.

DTO autor previsto: assetVersionId, displayName, mimeType, byteSize, width/height/orientation, state,
preview {renditionId,width,height,mimeType}|null, problem {code,retryable}|null y acciones autorizadas.
DTO lector: IDs de versión/rendition y metadata visual con alt/caption; sin bucket/key/URL persistida.
Autoría expone revision, permisos efectivos y coverage. Frontend nunca deriva permisos del rol nominal.

### 5. Entrega privada

R05A usa endpoint same-origin para derivados con GET/HEAD/Range, streaming/backpressure y no-store.
Revalida sesión/grants y snapshot en cada petición; no entrega un bearer de lectura externo ni usa Next
image optimization/cache para contenido privado. Cache y error bodies no revelan existencia entre scopes.
Original download queda denegado; una futura capability/grant separada deberá aprobarlo.

Una respuesta admitida puede finalizar y el receptor puede conservar bytes: revocación niega nuevas
peticiones, no retira bytes recibidos. Las URLs firmadas GCS serían alternativa para archivos mayores,
pero son bearer válidos hasta TTL; introducirlas requeriría cambio explícito y pruebas del margen de revocación.

### 6. Operación y límites de autoridad

`ROOMS_MEDIA_ENABLED=false` por defecto. Local no modifica el canary remoto20f9fe9 ni sus dependencias
hasta aviso de raíz. El perfil cloud-production debe fallar cerrado para medios: nunca filesystem efímero Vercel. Cloud requiere bucket propio, region/coste/retención/cleanup/IAM/worker y readback;
no nuevas SA keys, ADC humano de Production ni credencial migrator en runtime.
Worker tendrá privilegios mínimos sobre planes/estados propios; no capabilities humanas por rol técnico.
Restore debe reconciliar SQL+objetos/generaciones, no sólo conteos. Ningún cleanup borra objetos de una
edición conservada ni dependencias de otro producto. Gate de recursos previo a cualquier aprovisionamiento.

## Alternativas y razones

- Habilitar ready en manifest: rechazado; confianza en caller rompería validación y aislamiento.
- Reusar /public/demo: rechazado; activos públicos no prueban entrega privada ni revocación.
- Reescribir V2 para llamarlo real: rechazado; cambia significado de snapshots aceptados.
- Procesar dentro del request Next/lock SQL: rechazado; acopla recursos y tiempos de codec al pool y a identidad.
- Completar PDF/audio/video ahora: diferido; parsers/transcodificación y Range/HLS necesitan límites y QA propios.
- URLs firmadas de lectura en R05A: diferidas; el endpoint same-origin acotado conserva revalidación por request.

## Evidencia exigida y reapertura

Dos organizaciones/marcas y fixtures de ratios variados, alpha/orientación/imagen larga; corrupción,
MIME falso, oversized/decompression, replays, fencing, falta de storage, revoke y cancel. Legacy V1/V2,
coverage negativo/positivo, API/CLI y restore mixto. Reabrir límites si formatos/volumen/calidad exigen
nuevos perfiles o infraestructura; medir costo antes de prometerlo. Este documento no acredita implementación.

## Fuentes primarias consultadas

- [GCS resumable uploads](https://docs.cloud.google.com/storage/docs/resumable-uploads): session URI es bearer,
  puede durar una semana y admite cancelación; cancel lógico y proveedor son diferentes.
- [GCS signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls): quien posee URL puede
  usarla hasta expiración; no existe revocación de bytes ya guardados.
- [Sharp constructor](https://sharp.pixelplumbing.com/api-constructor/): failOn, límites de píxeles/canales y
  autoOrient disponibles; estos controles no sustituyen aislamiento de recursos del proceso.
