# Studio — reproducción compartida con AXIS y miniaturas temporales

- Estado: Accepted, 2026-10-07, por instrucción del operador «Bien, hazlo» tras discovery.
- Dueños: Studio (archivos, versiones, transporte y procesamiento); AXIS (reproductor portable).
- Alcance: reproducción de archivos propios en Studio. Distribución externa y providers quedan separados.
- Reversibilidad: adapter y flag de procesamiento; migración aditiva. Rollout no implícito.
- Estado operativo: Studio main `da2a02a` desplegado; migración, CORS, worker, backfill y QA productivo verificados.
- Confianza: código y runtime verificados en esta entrega; evidencia y límites en la auditoría.

## Contexto y decisión

Studio ya posee originales privados, upload directo a GCS, verificación de bytes, worker FFmpeg,
portadas y MP4 H.264/AAC. No se crea otro servicio ni biblioteca. `MediaVideo` será la única fachada
React de reproducción y consumirá el adaptador oficial de `@efeoncepro/axis-ui-primitives` publicado.

Las tres llamadas actuales (inspector story/feed y escenario de activaciones) comparten la fachada.
Tarjetas, búsqueda y vistas parciales de carrusel siguen siendo portadas. Los grupos de formatos pueden
abrir un visor; sólo el recurso activo monta el reproductor. Al cambiar pieza/cerrar, se libera la sesión.
Empezar otro video pausa el anterior. No hay autoplay ni descarga masiva de metadatos de la galería.

La identidad incluye asset y versión; el calendario preserva la versión fijada en su activación.
El cambio de controles no altera derechos, aprobación creativa, ni autorización de publicación.
Review sólo se habilitará cuando exista persistencia y callbacks autorizados; no se simulan comentarios.

## Fuente visual y comportamiento

Fuente: reproductor AXIS publicado 0.6.5, Cinema/embedded, con autoocultación, controles redondeados,
replay de órbita y menús comunes. Se integra al tema claro/oscuro del host. Es adopción de la dirección
aprobada, no un rediseño de Studio ni una nueva skin. Editorial con panel siempre visible se descarta
para el inspector por espacio; controles HTML nativos se sustituyen para lograr consistencia.

Se conserva la proporción real y el video completo (`contain`). En anchos pequeños se abre espacio de
reproducción legible en vez de comprimir controles dentro de una miniatura. Overlays sociales del host
no invaden controles ni subtítulos. QA: horizontal/vertical, desktop/390px, ambos temas, navegación,
foco, replay, autoocultación y error/reintento. El adaptador React de AXIS es cliente: no promete player SSR
interactivo ni fallback de reproducción sin JavaScript.

## Contrato de medios

- `PlaybackRendition` conserva URL, poster, MIME, dimensiones y peso; suma `thumbnailsUrl` opcional/null.
- El worker existente incorpora receta versionada `timeline_sprite_v1` + `timeline_vtt_v1`, con cantidad
  acotada de cuadros y una versión por corrida de reconciliación cuando está activo. No se regeneran MP4/posters ya existentes para completar miniaturas.
- El WebVTT persistido sólo refiere el sprite relativo de la misma versión. El transporte resuelve
  esas referencias a URLs autorizadas que no superan el vencimiento del índice; rechaza referencias ajenas o arbitrarias.
- Migración aditiva habilita nuevos kind/MIME. Generación desactivada por defecto hasta migración.
- `playback: null` conserva el estado honesto de no disponibilidad; no se infiere aprobación, error o
  procesamiento en curso sólo de la ausencia del derivado. Miniaturas ausentes no bloquean el video.
- API/UI comparten reader y DTO. No hay nuevo endpoint privado de UI ni operación de negocio exclusiva.
- No hay generación automática de subtítulos/capítulos en este alcance.

## Transporte y dependencias

El player recibe el endpoint estable de medios de Studio, nunca una URL GCS expirada persistida en UI.
La ruta de video sigue redirigiendo hacia GCS; Range no debe enviar el binario por Vercel.
AXIS pide CORS anonymous: verificar GET/Range del destino final desde cada host antes de promover.
Los enlaces temporales de revisión no son enlaces de distribución pública para WordPress/Think.

Se añade primitives 0.6.5 y se alinea tokens 0.6.0/contracts 0.7.0 en el catálogo. El paquete publicado
`axis-graphic-line` conserva dependencias antiguas: overrides de AXIS fijan un único set compatible,
sin excepción del gate de duplicados. La regeneración del tema debe resultar sin diferencias visuales.
Retirar overrides cuando las dependencias publicadas converjan. No copiar componentes del Lab.

## Alternativas y consecuencias

1. Reproductor por pantalla: rechazado por divergencia y mantenimiento duplicado.
2. Nuevo backend de video: rechazado porque Studio ya posee esa infraestructura y dominio.
3. Adoptar AXIS y extender derivados existentes: seleccionado; el cambio UI no depende de backfill.
4. Forzar AXIS dentro de todas las miniaturas: rechazado por coste de red y controles inaccesibles.

El worker aún maneja archivos en memoria. No aumentar tamaño/largo máximo ni añadir una escalera de
transcodificación sin medir memoria y costo. Idempotencia actual es por versión/kind/hash, no una
promesa de deduplicación global entre versiones diferentes.

## Verificación y rollout

Evidencia y pendientes: [auditoría de implementación](../../audits/marketing-studio/2026-10-07-axis-video-adoption.md).
Secuencia: checks locales → migración staging → worker con generación habilitada → backfill acotado de
faltantes → web → verificar archivo, Range, CORS y miniatura real. Repetir en producción sólo en su release.
Rollback: desactivar generación, volver al deployment anterior; no borrar originales ni derivados.
No ejecutar Down con datos nuevos aún referenciados. YouTube/Vimeo, UI de subida y distribución externa
son continuaciones independientes, no condiciones para reproducir los MP4 actuales.

## Referencias

- [Fuente única e ingest](EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md).
- [Arquitectura Studio](EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md).
- [API-first](../EFEONCE_STUDIO_API_FIRST_DECISION_V1.md).
- [Consumo AXIS](../../operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).
