# Reproductor de video Efeonce en AXIS

> Verificado contra: AXIS release `7fb549a4ee862f077a05e8ff6bc0fadc58f44ff0`, main documental `15b1898`; Think `cd428c789a4fea2feab3b4b0d08cf68c7f07efd5` — 2026-10-07.

## Distribución y adopción verificadas

El operador autorizó los tres usos, publicar el paquete y llevar AXIS y Think a `main`.
GitHub Packages publicó `@efeoncepro/axis-ui-primitives@0.6.3`, `axis-tokens@0.6.0` y
`axis-ui-contracts@0.7.0`: [release 37630788367 SUCCESS](https://github.com/efeoncepro/axis-design-system/actions/runs/37630788367).
Instalación limpia, exports DOM/React/integrations, SSR y comparación del JS/CSS instalado con el build verificado: PASS.
El número del paquete, el contrato `efeonce.video-player` 0.5.0 (`candidate`) y la aceptación visual son estados distintos.

| Superficie | Estado verificado |
| --- | --- |
| [AXIS Lab](https://axis.efeonce.org/references/video-player/) | `main`, Vercel Production Ready; demuestra el renderer del paquete |
| [Think](https://think.efeoncepro.com/preview/video-player) | `main`, Vercel Production Ready; adapter Astro, pin exacto 0.6.3 y lockfile desde registry privado, sin `link:` ni copia del reproductor |
| WordPress | Bloque Gutenberg candidato y prueba con copia del artículo 251941; sin activación ni modificación del artículo público |
| Otros productos | Sin adopción implícita; cada consumidor valida su integración antes de actualizar |

El incidente de **imagen azul intermitente en sesiones antiguas del navegador integrado sigue ABIERTO**.
Publicar y reproducir en una sesión nueva no acredita su resolución. Dispositivos físicos, tecnologías de asistencia,
PiP por plataforma y proveedores reales de streaming conservan verificación propia pendiente.
El paquete registry 0.7.2 conserva su inventario histórico: no inferir descubrimiento de video desde él.

## Fuente canónica y entradas

En el repo AXIS: `docs/architecture/VIDEO_PLAYER_SKINS_DECISION_V1.md` (Proposed),
`docs/agent-composition/video-player.md` (API), `docs/quality/video-player-0.5.0.md` (QA y pendientes).
Autenticación, instalación y rollback: [runbook de paquetes privados](../../../../docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).
Nunca incorporar valores de NPM_RC o tokens al repo; Think los recibe desde el entorno de build.

- Tokens `axisVideoPlayer`; contrato `efeonce.video-player` 0.5.0 y `VideoPlayerModel`.
- `@efeoncepro/axis-ui-primitives/video-player`: HTML SSR y API DOM (`videoPlayerHtml`, `registerVideoPlayer`, `enhanceVideoPlayer`, `createVideoPlayer`, `validateVideoPlayer`, `videoTime`).
- Importar `/video-player.css` una vez; React es optativo en `/video-player/react` → `AxisVideoPlayer`.
- `/video-player/integrations` expone extensiones consumidoras; su existencia no certifica un proveedor.
- Handle: `update(patch)`, `seek(seconds)`, `setSkin`, `destroy`; creación cancelable con AbortSignal.
  Cambiar metadata/presentación preserva reproducción; cambiar fuente limpia el contexto derivado anterior.

## Skins y presentación

Cinema, Editorial y Review comparten implementación; piel, superficie papel/navy y línea de negocio son independientes.
Cinema prioriza imagen y controles flotantes; Editorial añade capítulos/transcripción buscable; Review añade momentos,
autores, filtros pendiente/resuelto, versión y editor. Nunca crear otro motor dentro de Think o WordPress.

`presentation: 'embedded' | 'contextual'` es independiente de la skin. Por defecto Cinema es embedded;
Editorial/Review son contextual. Para blog usar embedded: sólo caja del video, sin franja permanente de título,
paneles externos ni reserva vacía. Contextual incorpora título y herramientas. `title` sigue siendo obligatorio
como nombre accesible. `update({presentation:undefined})` restaura el valor por skin.

Los controles superpuestos se ocultan tras 3 s de inactividad al reproducir, también en compacto/vertical;
pausa, foco de teclado deliberado y menú abierto conservan acceso. Editorial/Review contextual pueden mantener
herramientas fuera del fotograma. Subtítulos permanecen independientes del ocultamiento.

Responsive por ancho del contenedor, verificado entre 320 y 1440 px; proporciones 16:9, 9:16, 1:1 y 4:5.
Son puntos de prueba, no promesa de un máximo fijo ni certificación de todos los dispositivos.

## Criterio de marca e interacción

El contenido manda. Color/tipografía salen de AXIS; la carga reutiliza la órbita de botones y la barra mide tiempo real.
No añadir firma, logo u órbita decorativa sobre la imagen ni modificar sus assets. Replay usa la órbita canónica
estática y nombre accesible «Volver a ver» / «Watch again»; nunca animación de loader.

Familia funcional de 14 glifos curvos en `packages/primitives/src/video-player-icons.ts`, compartida por slots
Media Chrome 4.19.3: play Bézier, pausa en cápsulas, volumen suave, CC/PiP/fullscreen y ajustes redondeados, replay.
Distribuida con primitives 0.6.3; no promovida al catálogo de marca Trazo/Plastilina. CSS portable protege
`fill:none`, targets 44×44 e insets ante resets del host; no corregir únicamente el Lab.

El volumen expandido conserva espacio al thumb y no empuja otras islas. Compacto requiere separación externa
del marco y aire entre Play y thumb, no sólo padding interno. El hover del range enfatiza el riel, sin rectángulo
opaco; video vertical conserva continuidad de radios. Valores geométricos salen de tokens, nunca de estas notas.

## Funciones y autoridad del consumidor

Timeline con capítulos, miniaturas VTT y búsqueda fina cuando existen datos; transcripción buscable/navegable,
copia de fragmentos y seguimiento suspendido al explorar. Subtítulos reales con ajustes de tamaño, fondo y posición;
velocidad, fullscreen y PiP según capacidad. Sin CC vacío ni calidad ficticia cuando faltan tracks/variantes.

Review: `onSubmitComment` confirma persistencia por promesa o conserva el borrador al fallar;
`onResolveMarker` requiere proyección confirmada por `update({markers})`; `onComment` permite editor externo.
`enableAnnotations:true` incorpora puntos normalizados del video original con contain, no del viewport.
El consumidor guarda comentarios/estado; el Lab sólo conserva sesión. No edición colaborativa/backend implícito
ni precisión por fotograma. Cues fuera de duración se deshabilitan; `duration` inicial sólo con dato real.

SSR conserva controles nativos hasta registro browser; la entrada portable no registra custom elements al importarse.
Web comparte HTML/CSS; apps nativas requieren adapter propio aunque compartan tokens/contrato.
El host posee acceso, URLs firmadas, hosting, HLS/DASH/DRM, persistencia, aprobaciones y consentimiento analítico.
No autoplay, almacenamiento ni telemetría implícitos. Fuentes/pistas remotas requieren CORS correcto.

## Paridad al integrar

La skin cambia composición y color, no la identidad de replay, iconos, targets o estados comunes.
Comprobar versión y JS cargado antes de atribuir diferencias a una skin: una pestaña antigua del Lab
conservaba replay textual aunque el package 0.6.3 ya entregaba la órbita para todas.
Think y WordPress deben recibir tracks, thumbnails, chapters y transcript reales; no basta con fuente/poster.
Los adapters exponen `axis-video:configure` ({model,options}) y `axis-video:ready` ({player}); callbacks,
permisos y persistencia los conecta el host. El bloque WordPress sigue candidato sin activar.
Dirección WordPress confirmada: **Gutenberg + Elementor**. El bloque existe como candidato; el widget
Elementor es trabajo posterior, no capacidad implementada. Ambos adapters deben exponer el mismo modelo
validado y capacidades, consumir un único bundle AXIS y compartir hooks cliente; nunca copiar el core ni
crear otra línea visual. La preview/lifecycle de Elementor exige QA propia. Activación y artículo real siguen
pendientes; la orientación de arquitectura no los ejecuta.
Ejecutar la paridad focal de consumidores de AXIS; verificar datos de entrada antes de variar skins y exigir
miniaturas cargadas, captions activos, capítulos navegables y replay orbital en cada skin/superficie.
No ampliar a un release o CI completo cuando sólo cambia la conexión del consumidor.
La colisión con `button.css` mostró otra limitación: un SVG presente puede estar oculto. Exigir órbita, anillo y esfera visibles en píxeles, cargando ambas hojas en ambos órdenes; el parche 0.6.4 explicita su display.

## QA al continuar

El release verificó 78 browser PASS y 10 skips explícitos en Linux, además de build/types/unit/design y los gates
compartidos; consultar el dossier para alcance y skips. El fallo posterior de `agent:check` era el mapa de exports
del harness, corregido aparte: no confundir CI general con publicación. Volver a leer el run vigente antes de afirmar verde.

Para un cambio real, ejecutar los gates proporcionales de AXIS y suite `playwright.video.config.ts`; verificar
los píxeles del consumidor, CSS/reset, targets, captions, reproducción completa, replay y cambios de pestaña.
No repetir builds/releases por un cambio documental. El rediseño para reutilizar evidencia exacta de CI está pendiente,
no implementado. Ubuntu es el runner de QA, no una dependencia instalada por Think en sus usuarios.

- Decoder/canvas, `currentTime` y `readyState=4` no prueban imagen visible. Comparar captura pintada, video nativo
  y sesión prolongada; no cerrar el incidente azul por recargar ni añadir reloads sin causa comprobada.
- Miniaturas necesitan `#xywh=0,0,w,h` incluso con una imagen; comprobar imagen renderizada.
- Menús usan anclaje del motor y transición de opacidad, sin segundo desplazamiento ni dimensiones animadas.
- Foco residual de un clic no mantiene controles: usar estados públicos `userinactive`, `keyboardcontrol`,
  `autohideovercontrols`, sin temporizador paralelo. En WebKit preservar mousedown al cerrar Ajustes evita
  enviar el click al video; cancelar pointerdown puede suprimir el click táctil.
- Subtítulos: probar track cargado, preferencia/activo y cues multilínea junto al dock; respetar posición authored
  y restaurarla al desmontar. No declarar soporte por ver sólo el botón CC.
- No omitir reglas axe ni modificar upstream para pasar el gate; AT físico y streaming real siguen pendientes.

## Historia y correcciones del operador

Las propuestas locales 0.1–0.4 y sus primeras cifras de QA quedaron superadas por la distribución anterior;
[ledger](ledger.md#2026-10-07--skins-de-reproductor-compartido) conserva decisiones y rechazos.
La primera familia Tabler se sustituyó por glifos propios tras rechazo del operador; luego se corrigieron hover,
volumen, autoocultado, dock vertical, reset de Think y subtítulos. El replay orbital fue pedido expresamente.
El primer preview Think (`8a1c206`, deployment `dpl_3MAWPHcmSmkFtnHtFc6iKhRCp6ed`) falló por link al checkout
hermano inexistente en cloud. Lo sustituyó el consumo publicado exacto de `cd428c7`.

v0.6.1 y v0.6.2 no publicaron: presupuestos de casos agregados y un click tapado por header fijo en WebKit/Linux.
v0.6.3 separó casos y estabilizó interacción/presupuesto manteniendo assertions, sin retries, y publicó.
Los fallos históricos no son instrucciones de volver a publicar ni de restaurar links locales.
