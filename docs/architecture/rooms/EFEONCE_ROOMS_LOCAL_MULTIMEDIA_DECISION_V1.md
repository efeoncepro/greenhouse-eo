# Rooms — pipeline multimedia local V4

- Status: Accepted para implementación LOCAL por goal EPIC-052 y pedido del operador2026-10-29 de terminar backend sin UI.
- Owner: Rooms Platform; TASK-2077, R05B. Producción/Auth/UI permanecen fuera del corte.

## Decisión

Crear V4 explícito y pipeline separado del corte V3 de imágenes. V1/V2/V3 publicados no cambian.
V4 usa mediaBlock schemaVersion3 y referencias assetVersionId. Una misma sala V4 combina imágenes
del pipeline existente con PDF/audio/video del pipeline nuevo. El snapshot usa kind=image/pdf/audio/video;
las filas de imágenes conservan exactamente su metadata V3. El resolver exige organización/sala/origen
y ready en su almacén; una referencia ambigua en ambos almacenes falla sin escoger uno. Publicar fija
los pins de cada pipeline en la misma edición. Máximo100imágenes+20archivos multimedia por sala.
No hay conversión implícita de ediciones V1/V2/V3. Original privado conservado con SHA256/size/generation;
no hay endpoint original.

Formatos admitidos: application/pdf, video/mp4(H264 y AAC opcional), audio/mpeg(MP3), audio/aac(AAC),
audio/ogg(Opus/Vorbis). PDF máximo40MiB/40páginas y20MP por página; audio máximo64MiB/1200segundos;
video máximo128MiB/300segundos/3840x2160/60fps. Ningún archivo supera el límite de su formato.
Derivados: PDF todas las páginas WebP(contain<=2048,<=3MiB/page); audio MP3 a128kbps más peaks JSON
medidos en muestras mono; video MP4H264/AAC faststart<=1920x1080/30fps más posterWebP. No estirar/crop.
Salida total máxima160MiB; job240s, cada tool60s y un job local por proceso; retries máximos2.
Si PDF tiene más páginas que el límite, falla el archivo completo; nunca ready parcial.

El decoder es proceso externo con comandos fijos/sin shell, toolchain FFmpeg8.1.1, Poppler26.04.0 y cwebp1.6.0
verificado al arrancar, environment mínimo y sandbox OS que niega red y lectura ajena a archivos de
trabajo/bibliotecas del sistema. Sólo formatos/protocolos locales allowlisted, sin listas ni URLs.
Todo decoder nativo, incluida la conversión WebP con cwebp, se ejecuta en el sandbox. El supervisor
usa parsers de contenedor simples y streaming SHA, sin Sharp nativo dentro del proceso con DB.
Los inputs se copian a una carpeta privada propia; el caller no selecciona binarios ni argumentos.
La ejecución local es explícita y OFF por defecto; Vercel/perfiles cloud rechazan configuración.

Upload streaming acotado comprueba size/hash contra intención del owner; complete crea job con CAS.
Worker lease/fencing publica metadata sólo al terminar todos los derivados con hash real. Cancelación,
reintento y fallos no publican material parcial. Un archivo ya ready no se sobreescribe.
Publish revalida ámbito, procedencia y assets ready y fija renditionId/generation/hash en pins de edición.
Toda referencia no excluida debe estar ubicada en un bloque multimedia visible; ready sin ubicación
sigue pending con asset_reference_unplaced. Excluir un bloque exige excluir sus referencias propias
explícitamente (required=false y razón) o moverlas a otro bloque visible. No omitir inventario silenciosamente.
Delivery sólo de derivados referidos por un bloque visible: imágenes por /media, otros tipos por
/multimedia; la ruta del pipeline contrario los rechaza. Preview/autoría V4 resuelven ambos almacenes;
la proyección de audiencia omite metadata y referencias de bloques excluidos o huérfanos.
Cada GET/HEAD/Range/304 revalida autoridad actual, verifica hash mediante
stream acotado y sirve desde descriptor privado sin URL bearer. No cache pública ni optimizer de imágenes.

## Límites y alternativas

- Extender MIME de imágenes: rechazado; límites/codecs/entrega distintos.
- Renderizar PDF desde el navegador: rechazado para este corte; decodificación no confiable pertenece al worker.
- Omitir páginas para cumplir un límite: rechazado; inventario debe ser íntegro.
- Auto-HLS, captions generados, stems y sincronización remota: fuera de alcance; no se inventa contenido.

## Evidencia y gate de release

Binarios locales disponibles en macOS; Dockerdaemon ausente al29Oct. Linux del workeractual no incluye
FFmpeg/Poppler ni aislamiento certificado. Construcción y prueba local no acreditan contenedorLinux,
cloudstorage/transcoding, throughput/costos productivos ni interfaz. Antes de habilitar cloud se necesita
pin binario/imagen exacto, sandbox Linux, Docker decoder smoke y restore de nuevos objetos/metadata.

La memoria nativa local tiene monitor RSS de1GiB con kill y timeout, no un límite duro de cgroup;
macOS rechazó RLIMIT_AS. El contenedor Linux con límite duro de memoria sigue siendo un gate de release.

Candidato local verificado3c7bcb5 y fronteras de release: [recibo29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
El cierre de la task local no certifica interfaz, proveedores reales ni producción.
