# Reproductor de video Efeonce en AXIS

> Verificado contra: AXIS release `88f1ecc9c529d1d2cbeb3b24efb5f41199740f2d`, main documental `d33ed9a`; Think `474250195059ad0db42ec3aa3f2d24ad60f3e7fc` — 2026-10-07.
>
> Delta «página suelta de muestra en Think» verificado contra: Think `main` en `9a36dac`
> (`src/pages/muestras/sika-posible-dde148ea051c.astro`, en producción) — 2026-10-12; sin cambios en AXIS.

## Última actualización — 0.6.6

Replay aprobado: órbita centrada sobre la imagen, halo/velo suaves, anillo 1,25 px y arco 2 px
sin escalar su grosor, esfera proporcional y póster final. Package primitives 0.6.6 / tokens 0.6.1
publicados; API/modelo y contrato 0.5.0 sin cambios. Los cortes siguientes conservan su historia.
La publicación incremental se opera con `pnpm release:packages <version>` en AXIS; leer
`axis-design-system/references/agent-consumption.md` para CI/baseline y límites de reutilización.

## Distribución y adopción verificadas

El operador autorizó los tres usos, publicar el paquete y llevar AXIS y Think a `main`.
GitHub Packages publicó `@efeoncepro/axis-ui-primitives@0.6.5`, `axis-tokens@0.6.0` y
`axis-ui-contracts@0.7.0`: [release 37669427070 SUCCESS](https://github.com/efeoncepro/axis-design-system/actions/runs/37669427070).
Instalación limpia, exports DOM/React/integrations, SSR y comparación del JS/CSS instalado con el build verificado: PASS.
El número del paquete, el contrato `efeonce.video-player` 0.5.0 (`candidate`) y la aceptación visual son estados distintos.

| Superficie | Estado verificado |
| --- | --- |
| [AXIS Lab](https://axis.efeonce.org/references/video-player/) | `main`, Vercel Production Ready; demuestra el renderer del paquete |
| [Think](https://think.efeoncepro.com/preview/video-player) | `main`, Vercel Production Ready; adapter Astro, pin exacto 0.6.5 y lockfile desde registry privado, sin `link:` ni copia del reproductor |
| Think · [página suelta de muestra](#página-suelta-de-muestra-en-think-2026-10-12) | `main` `9a36dac`, en producción desde 2026-10-12; primer uso con el medio de una propuesta (reel 9:16, Cinema embedded, línea Brand, subtítulos VTT) |
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

**Replay centrado (aprobado y publicado 0.6.6, 2026-10-07):** centrar la acción
sobre la imagen, excluyendo dock/paneles. Usar `axisVideoPlayer.replay` para diámetro responsive,
halo translúcido y velo final. Anillo y arco conservan grosor óptico fino (`non-scaling-stroke`),
con esfera proporcional; no ampliar el grosor del loader al aumentar el botón. El póster del modelo reaparece al terminar; sin póster válido se conserva
el último fotograma. Replay y seek retiran la capa. Estructura idéntica para los tres skins;
no duplicar la composición en Think, Studio o WordPress. Release `37696704305` SUCCESS; tokens 0.6.1. Think `d36ba40` y Studio `3ba7cff` adoptan 0.6.6
desde registry con despliegues Vercel SUCCESS. WordPress conserva bundle candidato sin activar.

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
La colisión con `button.css` mostró otra limitación: un SVG presente puede estar oculto. Exigir órbita, anillo y esfera visibles en píxeles, cargando ambas hojas en ambos órdenes; la corrección CSS se distribuye en 0.6.5 (0.6.4 no publicó).

## Página suelta de muestra en Think (2026-10-12)

Uso: una página sin índice para **ver un video de muestra de una propuesta**; se llega por el enlace o el QR del
documento. Caso fuente: reel 9:16 de 25 s de una campaña de cliente (Sika Mexicana, Wherex N.º 1164),
`https://think.efeoncepro.com/muestras/sika-posible-dde148ea051c`. El operador pidió «una página en Think con el
reproductor canónico de Efeonce… con el video al centro… premium, con el logo de la campaña». La ruta, el layout, el
retiro y el despliegue están en la skill `astro` →
[efeonce-overlay.md](../../astro/efeonce-overlay.md#página-suelta-de-video-de-muestra-2026-10-12); aquí va sólo el
reproductor.

```ts
const model: VideoPlayerModel = {
  id: 'sika-posible-reel',
  title: 'SikaSeal-170 · El agua siempre busca una entrada', // nombre accesible; embedded no lo pinta
  src: `${media}/reel.mp4`,
  poster: `${media}/poster.webp`,
  skin: 'cinema', presentation: 'embedded', surface: 'dark', line: 'brand',
  locale: 'es', aspectRatio: '9:16', preload: 'metadata', duration: 25,
  tracks: [{ src: `${media}/reel.es.vtt`, language: 'es', label: 'Español', kind: 'subtitles' }],
}
// <AxisVideoPlayer model={model} options={{ loading: 'eager', doubleTapSeek: true }} />
```

- **`line` y `aspectRatio` se declaran siempre.** Sin ellos el modelo cae en `growth` y `16:9` (leído en AXIS
  `packages/primitives/src/video-player.ts`, 2026-10-12). `line: 'brand'` es la línea de quien firma la muestra
  (Efeonce Creative Studio), no un color del cliente. `skin`, `presentation` y `surface` coinciden con el default de
  Cinema; la página los escribe igual.
- **9:16: el ancho del marco sale del alto de la ventana.** El contenedor usa `width: min(78dvh * 9 / 16, 26rem)` para
  que el video vertical entre completo sin scroll; bajo 60rem la página pasa a una columna y el marco a
  `min(100%, 24rem)`. El reproductor responde al ancho de ese contenedor, no al viewport.
- **Subtítulos:** un track `subtitles` en VTT, servido junto al MP4, con el texto de la locución. `duration` lleva el
  dato real (25 s). El readback confirmó VTT y póster en 200 y la reproducción en navegador a tamaño de teléfono; no
  quedó registrado que se mirara el subtítulo activo en pantalla: comprobarlo como pide «QA al continuar».
- **Póster:** WebP en la misma carpeta; con `preload: 'metadata'` es lo que se ve antes de reproducir y lo que
  reaparece al terminar (replay).
- **Los colores de la campaña del cliente son constantes locales comentadas, no tokens de Efeonce.** En el frontmatter:
  `// Colores de la campaña del cliente (manual de identidad POSIBLE); no son tokens de Efeonce.` y
  `const campaign = { yellow: '#FCC500', ink: '#0b0b0c' }`, pasadas a la página como propiedades locales (`--y`,
  `--ink`). Porqué: AXIS posee los valores de Efeonce; un color de la marca de otro no entra a AXIS ni se disfraza de
  token. Esos colores visten la página (fondo, kicker, resplandor del marco); el reproductor queda en su línea.
- **Marca fuera del fotograma.** La firma de la campaña (render del generador del manual, `gen.firma(200, 'negro')`,
  no redibujada) y el logo de Efeonce Creative Studio van en el encabezado y a un costado del marco; nada se superpone
  al video («Criterio de marca e interacción»).
- **No certifica:** el escaneo del QR con un teléfono real no se hizo; el incidente de imagen azul, AT y dispositivos
  físicos siguen como arriba. El agente no oye: la sincronía de voz y música la juzgó el operador.

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
