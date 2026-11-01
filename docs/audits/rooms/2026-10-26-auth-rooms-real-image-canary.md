# Rooms + Efeonce ID: canary real de una imagen

Completado el 2026-10-26. Alcance autorizado: un operador, una sala sintética, un archivo físico y un
correo con enlace y código. Sin clientes, rediseño, release completo de Greenhouse ni nuevas imágenes
de contenedor. [Recibo estructurado](2026-10-26-auth-rooms-real-image-canary.json).

## Resultado comprobado

| Paso | Evidencia real |
| --- | --- |
| Identidad interna | Microsoft y MFA aprobados por la persona; seis canjes first-party emitidos/consumidos durante renovaciones de sesión |
| Autoridad | Lectura de la sala autorizada; listado de workspace denegado, sin conceder acceso global |
| Archivo fuente | PNG de la demo sintética existente: 3.010.606 bytes, PUT firmado GCS y checksum confirmados |
| Procesamiento | Job `rooms-media-worker-nzxrg` exitoso, fuente real a dos WebP; generations fijadas |
| Preview | 304.540 bytes, 1122×1402, SHA SQL/bytes/ETag coincidentes; thumbnail 52.250 bytes, 384×480 |
| Entrega privada | GET/HEAD 200, Range 206, condicional 304 y `private, no-store` |
| Correo | Una entrega aceptada por Resend y recibida en Outlook; dominio exacto verificado sin tracking |
| Código | Código incorrecto 400; código recibido 200; reutilización 404; una prueba consumida |
| Invitado | Sala V3 e imagen 200; borrador y otro espacio 404 |
| Revocación | Sala e imagen 401; enlace revocado 404; invitación única revocada y sala archivada |

El enlace y el código se extrajeron del contenido recibido sin imprimirlos ni guardarlos en el repositorio.
El conector Outlook presenta el cuerpo como Markdown con un salto de línea en el hostname; se normalizó
únicamente esa presentación del dominio esperado. El flujo guest se verificó mediante HTTP real usando
las cookies emitidas por el servidor, separado del navegador de la sesión interna.

La edición V2 original y la edición V3 quedan inmutables. El archivo procede de una demo sintética;
«real» describe la transferencia, el procesamiento y la lectura efectivos, no datos de un cliente.

## Estado final

- Auth `auth-server-00168-vzb`, tráfico 100%; misma imagen que antes del canary. First-party/OTP OFF y
  montajes OTP/authority retirados. Health, readiness y discovery 200.
- Se corrigió la referencia efectiva de Resend a producción v1 y Sentry a `production`, comprobando
  antes que la credencial de producción accedía al dominio remitente exacto. No hubo rotación de claves.
- Rooms vuelve al deployment OFF `dpl_GACNzAvGSQVcjcMCCvjWj9BooizV`, main `a87852e`; proyecto con
  first-party/invitaciones false y media ausente/defaultOFF. Configuración GCS preparada permanece.
- Tipo de correo OTP OFF; una entrega, un challenge y un consumo. Sesiones del cliente de prueba
  cerradas y pestañas temporales retiradas. No se creó scheduler ni worker continuo.

Quedan separados el consumidor frontend de Claude Design, el disparo automático del Job y la activación
general. El workflow Auth que usa `staging` por defecto sigue requiriendo corrección propia antes de una
activación duradera. Este canary interno no cierra el assurance completo ni la migración de Greenhouse.
