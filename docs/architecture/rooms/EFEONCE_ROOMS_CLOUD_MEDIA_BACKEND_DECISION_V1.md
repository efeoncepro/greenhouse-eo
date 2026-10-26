# Rooms — backend cloud de imágenes y worker propio

- Status: **Accepted para implementación**, 2026-10-26. Operador asigna backend a Codex y diseño a Claude Design; la construcción continúa sobre EPIC-052. Aprovisionamiento, costes y activación conservan gates específicos.
- Owner: TASK-2072, Platform / Media. TASK-2070 conserva recuperación del corte local;2071 conserva UI histórica sin aceptación visual.
- Reemplaza únicamente la limitación de código local del ADR de imágenes; preserva semántica V3, fuente inmutable y permisos.

## Contexto y decisión

Base7ca5fd3 en rama task/2070-2071-private-media. El pipeline local está recuperado con207tests
registrados. Producción20f9fe9 sigue OFF. El límite de4,5MB de request de Vercel obliga a transferir
originales hasta20MiB directamente al storage; no reducir el límite del producto para ocultar el gap.

Se usa GCS privado propio, SDK oficial exacto8.4.0, y un port MediaStorage común para local/cloud.
Bucket candidato `efeonce-rooms-production-media`, proyecto `efeonce-group`, prefijo `rooms-media/`.
Estos nombres no prueban existencia ni autorización de un recurso vivo. Cloud debe fallar cerrado si
no coincide el perfil exacto; nada de filesystem efímero Vercel ni bucket de otro producto.

## Transferencia y generación

uploads.initiate registra intención y destino generado; receipts cloud no contienen credenciales de
transferencia. uploads.getTransfer reconsulta sesión/owner/room/expiry y entrega un descriptor de escritura
V4 PUT efímero, TTL máximo5min y nunca mayor que la sesión upload. Firma content-type/content-length y
precondición generation0; nunca lectura. Browser envía Blob de tamaño conocido; Content-Length lo coloca
el navegador, no un header JS. El descriptor jamás se registra en logs/audit/browser persistente.

Una URL de escritura emitida puede sobrevivir a una revocación hasta su TTL; cancel/expire impiden
complete y publicación, y la cuarentena se limpia posteriormente. No afirmar revocación física instantánea.
Repetir getTransfer no crea una intención nueva; sólo puede escribir el destino inmutable asignado,
que existe a lo sumo una vez por generation0. Complete verifica metadata, tamaño/tipo y checksum
incremental acotado fuera de SQL, después revalida autoridad y CAS antes de confirmar generación/cola.

El UUID de dominio y generation física GCS son entidades distintas. Columnas aditivas
source_storage_generation y media_renditions.storage_generation guardan generación decimal; NULL sólo
para el legado local. Lecturas y borrados usan esa generación y precondición; no resolver latest a ciegas.

## Entrega privada

GET/HEAD/Range/304 conservan sesión/grants frescos y pertenencia a edición. Sólo derivados <=3MiB:
openDelivery verifica tamaño+SHA antes de responder metadatos o ETag; buffer acotado verificado evita
corrupción de mismo tamaño y TOCTOU local. Stream en fragmentos con backpressure. Originales no tienen
ruta de lectura. Headers private,no-store/no-referrer/nosniff; sin URLs firmadas de lectura ni optimizador
público. Una petición ya admitida y bytes guardados no se recuperan mediante revocación.

## Worker y autoridad

Worker compilado Node24, decoder aislado por proceso con tiempo/heap/stdout/threads acotados. Artefacto
propio y lock mínimo público, versiones exactas verificadas contra manifest raíz, sin tsx ni paquetes web.
Cloud Run Job candidato `rooms-media-worker`; una invocación drena un lote acotado y termina. Programación,
concurrencia/capacidad/coste/retención y triggers se deciden y verifican antes de desplegar.

Perfil `cloud-worker` explícito: Compute metadata de la SA exclusiva
`rooms-media-worker-production@efeonce-group.iam.gserviceaccount.com`, sin ADC de archivos ni claves JSON,
sin variables Vercel falsas. Pool y usuario `rooms_media_worker` propios, máximo2, secreto de DB exclusivo;
sólo tablas/estados y lectura de Rooms imprescindibles. Nada de autoridad humana, login/OTP, bases ajenas ni
credencial migrator. Perfil de app cloud-production conserva WIF Vercel y su validación anterior intacta.

Firma V4 exige signBlob acotado a la identidad de app; IAM se prepara sin conceder TokenCreator de proyecto.
Worker no firma uploads. GCS requiere acceso uniforme, PublicAccessPrevention, CORS al origin exacto para
PUT/headers concretos, originales/derivados privados y políticas de cleanup/backup medidas. Toda propuesta
IAM/costes tiene readback previo y no se aplica por ejecutar build/tests.

## Compatibilidad y consumidor

No cambiar layouts, componentes ni copy visible: Claude Design posee diseño. HTTP/CLI usan mismos
servicios/capabilities, expectedRevision/idempotencia y errorCodes saneados. Documentar la secuencia y DTOs
para el nuevo frontend. Legacy V1/V2/V3 conserva significado/hashes. UI existente necesita conectar
getTransfer para modo GCS; no activar el perfil cloud-media antes de comprobar el consumer aplicable.

## Verificación y rollout

Negativas de tamaño/tipo/hash/tenant/originals, generation mismatch y cancel/retry/fencing; pruebas SDK
con fakes explícitos, nunca presentadas como GCS vivo. Ensayo aislado restore SQL+objetos, hashes/generaciones/
ACL/inmutabilidad y down sólo en clones. Worker build/smoke sobre prod closure. Lint/types/tests/build.
Cloud después de capacidad/IAM/config/migración/backup/readbacks. Canary de identidad sigue único,
con destinatario autorizado existente y coordinaciónAuth; no enviar clientes por completar backend.

## Rollout acotado ejecutado 2026-10-26

El operador autorizó infraestructura, migraciones y worker con subagentes, manteniendo Auth/correo/UI
fuera del bloque. Bucket/IAM/CORS y SA aplicados; siete migraciones y rol SQL dedicado verificados.
Cloud Run Job finito: CPU1/RAM1Gi, timeout240s, reintentos0, una tarea y paralelismo1; imagen inmutable,
una ejecución con cola vacía completada. No scheduler ni loop. El límite de memoria cubre también el
decoder nativo; todavía no se ha medido el peor caso de una imagen real en cloud.

Tres variables GCS se guardaron en Vercel Production para el próximo deploy; no se cambiaron flags web
ni se reconstruyó la aplicación. El canary real y el consumidor conservan su gate separado.
[Manual y evidencias](../../manual-de-uso/rooms/operar-worker-medios.md).

## Alternativas

- Proxy de originales20MiB por Vercel: rechazada por límite de plataforma.
- Storage público o URL bearer de lectura: rechazados por revocación/tenancy.
- Worker fingiendo identidad Vercel/SA compartida: rechazado; perfil dedicado verificable.
- Transformar V2 en V3 automáticamente: rechazado, conservar conversión explícita.
- Pipeline nuevo por frontend: rechazado; una API de producto reutilizable.

## Fuentes primarias verificadas2026-10-26

- [Vercel Functions limits](https://vercel.com/docs/functions/limitations).
- [GCS V4 PUT](https://docs.cloud.google.com/storage/docs/samples/storage-generate-upload-signed-url-v4).
- [GCS signed URLs](https://docs.cloud.google.com/storage/docs/access-control/signed-urls).
- npm @google-cloud/storage8.4.0 y esbuild0.28.2 verificados por registry; pins del runtime son la autoridad ejecutable.
