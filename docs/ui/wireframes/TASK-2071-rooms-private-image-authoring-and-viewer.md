# TASK-2071 — Una imagen, del borrador a la lectura

Diseño aprobado para implementación local, 2026-10-25; no es runtime ni aceptación visual. UI ready=yes: DTO/rutas 2070 congelados; integración espera servicios locales. Scope: una imagen por bloque y operación, repetible para varias piezas de una sala, sin sustituir el editor completo.

## Visual Direction Contract

- Visual direction mode: source-led
- Product Design asset: `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`
- Durable source: `docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md`, consumidor20f9fe9 `src/components/room-reader.tsx` y galería 2059 `src/components/room-experience.tsx`.
- Target: La órbita de Rooms; Bricolage editorial, Poppins de controles/lectura; navy/papel, acento Growth mediante tokens AXIS y logo oficial existente. Arte de cliente íntegro.
- Reuse: estructura de lectura real, estados de invitaciones, Dialog/Buttons/Tabs/Field/FileField AXIS instalados. No nueva marca, dashboard de widgets ni editor de imagen.

## Desktop Target

Editor contextual: título de sala/estado Borrador arriba; guardar/vista de lectura/publicar separados por intención y permiso. Izquierda, estructura completa de bloques con selección; centro, escenario real del bloque y contexto de lectura; derecha, propiedades título/alt/pie. Sólo el bloque de imagen es editable en este corte; el resto se conserva y puede inspeccionarse sin acciones falsas. La imagen domina el espacio; propiedades se pueden plegar.

Subir un archivo por intención. Su fila muestra nombre legible, estado y acción permitida. Una imagen verificada pero aún no adjunta permanece visible como Lista para añadir, no como contenido publicado. Error vive junto al archivo; el resumen de coverage enlaza el bloqueo concreto.

## Mobile Target

A 390/320 px usar Tabs Contenido/Imagen/Vista de lectura; una región principal por vez. Guardar nunca tapa la imagen ni el teclado. Inspector ocupa viewport disponible, título y cierre visibles, controles de zoom/reset accesibles sin hover. Long portrait puede inspeccionarse con pan; al salir se recupera pieza/scroll. A 200% no se fuerzan tres columnas ni overflow oculto.

## Action Hierarchy

Añadir imagen es primaria en vacío; Guardar propiedades al editar; Ver propuesta abre preview explícito. Publicar aparece sólo con editions.publish y coverage válida. Reintentar/Cancelar/Comprobar carga son acciones contextualizadas por servidor; no auto-publicación ni nuevo upload para resolver incertidumbre. Zoom y reset no cambian el archivo.

## Visual Fidelity Mapping

| Fuente | Aplicación | Verificación |
|---|---|---|
| Rooms20f9fe9 header/lectura | shell, tipografía, navegación, fuente y evidencia | comparación mismo viewport |
| Visor2059 | escenario oscuro, imagen completa, cierre superior y retorno | ratio y bounds reales |
| AXIS FileField/fields/Button/Badge/Dialog/Tabs | controls y estados | exports reales, foco/contraste |
| Byte original autorizado | contenido de imagen | dimensiones,alpha,color,checksum server |

## Copy Ledger

Fuente nueva `../efeonce-rooms/src/lib/copy/media.ts`. Títulos: Añadir imagen, Título de la pieza, Texto alternativo, Pie de imagen, Vista de lectura, Guardar cambios. Estados: Cargando, Verificando, Lista para añadir, Añadida a la propuesta, No se pudo cargar, Archivo no admitido, Acceso no disponible. Límites/formatos salen del servidor; no mostrar IDs técnicos, bucket, codecstack ni transfer tokens. La procedencia real nunca lleva Contenido de ejemplo.

## State Copy

| Estado | Copy / efecto |
|---|---|
| ready | Imagen lista para añadir / Cambios guardados según readback, no publicar implícito |
| loading | Cargando imagen con bytes reales; después Verificando imagen sin porcentaje inventado |
| empty | Añade una imagen a esta propuesta, selector nativo accesible |
| partial | La imagen está lista, pero aún no se añadió a la propuesta; recuperar attach sin subir otra vez |
| error | No pudimos completar la carga / Este archivo no está admitido; recuperación según el problemCode saneado |
| denied | Tu acceso a este contenido terminó; quitar arte y cerrar inspector |

## Accessibility Contract

FileField permite teclado; no dropzone exclusiva. Alt útil requerido o decorativa explícita si el contrato lo admite; no inventar descripción desde el nombre del archivo. Progreso semántico y anuncios sólo por cambio de fase. Botones de zoom/pan/reset, Escape y retorno al elemento; target44px táctil,24px mínimo. Foco al título si el disparador desaparece. Reduced motion sin desplazamiento; snapshots prohibidos entre roles/ediciones no autorizadas. Inputs y error asociados, contraste medido durante todas las fases.

## Implementation Mapping

- `/rooms/:roomId/edit`: ImageAuthoring+UploadStatus+ImageProperties; source de autoría2070, nunca consultaSQL en cliente.
- `/rooms/:roomId/preview`: RSC content.edit → audience projection borrador → mismo RoomReader, etiqueta Preview fuera del contenido.
- ReadingBlock.media[]: descriptor2070; ProtectedImage usa URL sameorigin de bytes autorizados con optimización pública desactivada.
- ImageInspector: Dialog AXIS, dimensiones del descriptor, contain y zoom/pan/reset; permisos fresh al entregar bytes.
- FileField no prueba MIME/ready. Archivo y descriptor efímeros; limpieza al salir/cancelar segúnservice; cache/no-store del dueño backend.

## GVC Scenario Plan

- Quality profile: `premium`
- Baseline surface ID: `rooms-private-images-v1`
- Review dossier: `docs/ui/reviews/TASK-2071-rooms-private-image-authoring-and-viewer/`
- Desktop: 1440x900 y 1024x768, con estados vacío, listo e inspector abierto.
- Mobile: 390x844 y 320x740, selector de archivo y propiedades con teclado.

qualityProfile: premium. Cuatro anchos1440/1024/390/320,200%, states ready/loading/empty/partial/error/denied; JPEGpaisaje,PNGalpha,WebPretrato e imagenalta permitidas. Flujo upload→attach→preview→coverage→publish→guest→zoom→Escape→revoke; negativos interrupted/413/rejected/409/expired. Capturar sólo fixtures propias, nunca transfer token/cookie. DSL público si viable; focused harness local documentado para autenticación/transferencia.

Dossier `docs/ui/reviews/TASK-2071-rooms-private-image-authoring-and-viewer/`; baseline nueva rooms-private-images-v1 contra fuentes existentes, pendiente revisión humana. Medir scrollWidth<=innerWidth, imagen natural/displayratio, axe/foco, noCSScrop, noAPI ViewTransitions/reduce, CSP y no-store.

## Design Decision Log

Decisión: una imagen con ciclo íntegro; tres regiones desktop del canon y una región móvil. Se descartan mock ready, galería sin autoría y editor completo. Reusar AXIS y reader; propiedad de imagen en producto, valores en tokens. Contrato técnico congelado en TASK-2071; ejecutar hook antes de JSX; producción es un gate separado.
