# Reproductor de video Efeonce en AXIS

> Verificado contra: axis-design-system@f4dd2fe + candidato 0.5.0 local del reproductor — 2026-10-07.

## Solicitud y estado

El operador pidió skins portables para todo el ecosistema y confirmó tres usos: editorial, demos y revisión creativa. Implementación candidata local, sin aprobación visual, commit, push, publicación privada ni adopción en productos. No equivale a extender La órbita a toda la UI Greenhouse.

## Fuente canónica

En `../axis-design-system`: `docs/architecture/VIDEO_PLAYER_SKINS_DECISION_V1.md` (Proposed), `docs/agent-composition/video-player.md` (API y uso), `docs/quality/video-player.md` (evidencia). Preview local: `http://127.0.0.1:4348/references/video-player/`. La ruta pública homóloga no se declara publicada.

- Tokens `axisVideoPlayer`; contrato `efeonce.video-player` 0.5.0 candidate y `VideoPlayerModel`.
- Package `@efeoncepro/axis-ui-primitives/video-player`: `videoPlayerHtml`, `registerVideoPlayer`, `enhanceVideoPlayer`, `createVideoPlayer`, `validateVideoPlayer`, `videoTime`; hoja `/video-player.css`.
- Registry `compose-video-player`: export availability unreleased. Las versiones históricas no incluyen automáticamente estos exports.
- Tres skins: Cinema (dock flotante, también móvil), Editorial (barra y capítulos persistentes), Review (momentos de revisión, editor y estados del consumidor). Papel/navy y seis líneas; skin y superficie independientes.

## Criterio de marca e integración

El contenido manda. Color y tipografía salen de AXIS; la carga reutiliza la órbita de botones. La barra temporal mide tiempo real, no es una órbita decorativa. El reproductor no hornea otra firma sobre el video ni modifica sus assets. Familia funcional original de 13 glifos curvos, candidata y solicitada por el operador: play con vértices Bézier, pausa en cápsulas, altavoz de silueta suave, ondas por nivel, CC y PiP de radios amplios, fullscreen curvo y ajustes con mandos circulares. Catálogo único `packages/primitives/src/video-player-icons.ts`, compartido por skins y adapters mediante slots de Media Chrome. No es una promoción al catálogo canónico Trazo/Plastilina.

HTML/CSS y controles son portables entre frameworks web. La skin cambia sin desmontar video. El HTML SSR conserva controles nativos hasta el registro browser; el entrypoint portable no registra custom elements al importarse. Apps nativas comparten tokens/contrato, no DOM. HLS/DASH, DRM, proveedores embebidos, acceso, URLs firmadas, comentarios, aprobaciones y analítica pertenecen a adapters consumidores. No prometer soporte no probado ni calidad sin variantes reales.

Review incluye editor temporal con `onSubmitComment` (promesa: confirma guardado o conserva el borrador al fallar) y `onResolveMarker` (la proyección confirmada llega por `update({markers})`). `onComment` permite abrir un editor externo. El Lab sólo guarda en memoria de sesión, nunca en una plataforma. Cues fuera de duración se deshabilitan; review muestra centésimas, no garantiza precisión por frame. `duration` inicial sólo con duración real. Sin autoplay ni telemetría implícita. Las fuentes y pistas remotas exigen CORS.

## QA al continuar

Compilar AXIS y correr tests/types/lint/design:check/agent:check; Lab consume el mismo renderer. Suite `pnpm --filter @efeonce/axis-design-system-lab exec playwright test --config playwright.video.config.ts`: Chrome desktop y WebKit móvil; playback, continuidad, capítulos, captions, settings/rate, fallback, error/retry, 1440/768/390/320px y axe por superficie/línea. Teclado/fullscreen se verifica en Chrome; PiP, AT físico y adapters consumidores requieren evidencia propia.

Los ajustes accesibles del adapter usan extensiones públicas: captions como switch (el motor emite aria-checked), encabezados de menú por slots con retorno localizable. No omitir reglas axe ni editar dependencia upstream para pasar el gate. La suite global tiene un fallo previo en hashes de la proyección AI Visibility Report; el detalle y el estado final de pruebas están en el QA de AXIS.

## Segunda iteración — autorización del operador, 2026-10-07

«Vamos con todo», incorporando recursos de esta skill «sin forzar». Autorización de implementación, no aceptación visual ni release. La marca entra por Bricolage/Poppins, paletas, esfera de posición real y órbita de carga de botones. Sin otro anillo, logo ni foco superpuesto al contenido; se retiró el play central que tapaba la pieza. Cinema explora capítulos bajo demanda; Editorial añade texto temporizado buscable; Review añade autores, filtros pendientes/resueltos, versión y editor.

`VideoPlayerModel` suma `thumbnails` (VTT metadata), `transcript` (`id,time,end,label`), `versionLabel`; markers suman author/resolved. Handle: `update(patch)`, `seek(seconds)`, `setSkin`, `destroy`; creación con AbortSignal. Metadata conserva reproducción; una fuente nueva limpia el contexto derivado anterior. React explícito `@efeoncepro/axis-ui-primitives/video-player/react` → `AxisVideoPlayer`; import portable sigue sin React. Ejemplo `/references/video-player-adapters/` (DOM y React; no adopción productiva).

Miniaturas Media Chrome 4.19.3 requieren `#xywh=0,0,w,h` incluso con imagen individual. No dar el preview por válido porque el track cargó: verificar imagen renderizada. El menú usa el anclaje del motor, sin sumar un segundo desplazamiento vertical; se anima opacidad, no dimensiones, para evitar ciclos ResizeObserver en WebKit. Nunca suprimir el error ni mutar upstream.

Fixture local: Los Sparks corte 02, 49,583 s, texto temporizado existente y fotogramas extraídos; no se regenera ningún asset. Hashes y procedencia en AXIS `docs/evidence/video-player-2026-10-07/media-provenance.json`. Revisar autorización del fixture antes de cualquier deploy del Lab. La composición, los adapters, el tiempo largo editorial y los dispositivos/AT físicos conservan gates separados. QA actualizado en AXIS; no declarar clase mundial certificada ni precisión por frame.

## Redondez solicitada — 2026-10-07 (primera propuesta sustituida)

El operador pidió más redondez «en íconos y demás». Se aplican controles outline Tabler con uniones y remates redondos, pausa de esquinas curvas, volumen/CC/PiP/fullscreen coherentes y ajuste por engranaje del catálogo de botones. Geometría original del proveedor, licencia existente; no se dibuja iconografía dentro del Lab ni se promueven glifos Trazo/Plastilina. `video-player-icons.ts` guarda el catálogo funcional del componente; tokens `controlStroke`, `controlRadius`, `pillRadius` y radios del panel gobiernan la forma. Radios más suaves en dock, comentarios y campos; botones de transporte circulares y CTA/puntos temporales en cápsula. Los tooltips conservan overflow visible y los targets conservan 44px. Sello: AXIS `f4dd2fe` + V2 local — 2026-10-07.

La revisión del operador detectó SVG convertidos en bloques: Media Chrome aplica fill a los SVG slotted y pisa el atributo de contorno. `.axis-video__icon` declara `fill:none` y stroke explícitos en el CSS portable; se comprueba el fill computado y el render final. No corregirlo sólo en el Lab. QA V2: 13 browser PASS + 1 skip móvil explícito, 42 primitives y 169 Lab PASS; fallo global ajeno AI Visibility Report conserva su estado.

## Corrección V3 — geometrías propias y aire interior

El operador rechazó la propuesta anterior y autorizó construir nuevos íconos de UI moderna. Familia funcional original de 13 glifos curvos, candidata y solicitada por el operador: play con vértices Bézier, pausa en cápsulas, altavoz de silueta suave, ondas por nivel, CC y PiP de radios amplios, fullscreen curvo y ajustes con mandos circulares. Catálogo único `packages/primitives/src/video-player-icons.ts`, compartido por skins y adapters mediante slots de Media Chrome. No es una promoción al catálogo canónico Trazo/Plastilina. El dock suma `dockInsetInline` de 16 px y `dockInsetBlock` de 12 px desde tokens. La reserva de altura incluye ambos márgenes verticales, también en Review y móvil; los fondos circulares de hover quedan dentro del panel y los targets siguen en 44 px. Se conserva la protección CSS `fill:none` ante el estilo de SVG del motor.

Evidencia actual: build y types PASS, primitives 42/42, browser 13 PASS y 1 skip físico móvil. Regresión de márgenes y fill a 1440/768/390/320 px; capturas V3 en el QA de AXIS. Candidato local, sin aprobación ni publicación.

## V4 — conjunto autorizado, 2026-10-07

Operador: «Vamos con todos» sobre islas flotantes, profundidad, motion, timeline, menús y diferencias por uso. Implementado en AXIS, contrato 0.3.0 candidate: Cinema con islas navy/papel al 96% y blur localizado (fallback sólido), volumen con hover/foco y transiciones desde tokens; timeline con miniatura/capítulo real y búsqueda fina ±5 s en pasos de 0,1 s; Ajustes como bandeja dentro del player móvil. Editorial con transcripción lateral desde 920 px y seguimiento que se suspende al explorar la lista. Review con anterior/siguiente y señal puntual opcional en el fotograma.

`enableAnnotations:true` + `onSubmitComment` permite marcar `{x,y}` normalizado 0–1; el callback recibe `annotation?`, el consumidor persiste y entrega `markers[].annotation` por update. Click/touch/flechas; falla conserva texto y punto; fuente nueva/cancelar limpian. Coordenadas del video original con contain, nunca del viewport. No dibujo libre ni precisión por frame. Sin publicación/adopción automática. El observer de layout y listeners se retiran al destruir.

QA: build/types/design/agent PASS; 43 primitives, 169 Lab, 15 browser PASS y un skip móvil de teclado físico. 1440/1024/960/768/390/320 px; contraste, foco, menú, guardado fallido, resize y revisión visual. Las capturas V4 y límites están en el QA de AXIS. No usar la apariencia para inferir aprobación visual ni release.

### Corrección del volumen expandido — 2026-10-07

El operador detectó el thumb pegado al borde al hacer hover. Se restituye el padding interno del range (8 px al inicio y 16 px al final, desde tokens), target 44 px y recorte únicamente dentro del range durante la transición de ancho. El thumb al máximo queda a 15 px del extremo de la isla. El control conserva apertura con foco de teclado y hover.

La regresión también detectó overflow de las islas en anchos intermedios al expandir. `transportAt:760` simplifica retroceso/PiP y capítulo por ancho real del controller; el tiempo conserva espacio y el capítulo puede truncarse en el resto de tamaños. El deslizador se mantiene oculto sólo en compacto/touch. QA añade extremos 0/1, apertura con foco y no colisión de las tres islas en Cinema/Editorial/Review a nueve anchos entre 620 y 1440 px. La corrección vive en tokens/primitives, no en el Lab.

### Corrección del autoocultado — 2026-10-07

Cinema oculta las islas y la línea de tiempo tras 3 segundos sin actividad durante reproducción, también con el puntero quieto sobre los controles. El foco residual de un clic no bloquea el ocultado: sólo el foco de teclado deliberado o un menú abierto mantienen visible la barra. Se usan los estados públicos `userinactive`, `keyboardcontrol` y `autohideovercontrols` del motor, sin otro temporizador. La barra invisible no captura clics; puntero, toque y teclado permiten recuperarla. Pausa conserva controles y los subtítulos permanecen independientes. Editorial y Review conservan su barra fuera del video.

Verificado contra: AXIS `f4dd2fe` + candidato local V4 — 2026-10-07. Sin release.

Trampa de WebKit: el foco al presionar el cierre de Ajustes podía cerrar el menú antes del click y enviar el gesto al video. Se conserva el foco durante `mousedown`, se cierra en click y se devuelve al invocador. No cancelar `pointerdown`: en touch puede suprimir el click. Regresión con tap real en WebKit verifica que cerrar no pause y que vuelva el autoocultado.

### Compacto/vertical: continuidad de radios y timeline — 2026-10-07

El operador señaló el hover rectangular del range y el corte recto entre video y dock en el ejemplo vertical. El timeline conserva su cápsula, borde e insets de 16 px también en Cinema compacto; el hover sólo enfatiza el riel, sin pintar el target como rectángulo. El video compacto conserva radios inferiores de 24 px, con fondo del controller alineado al shell y controles fuera del contenido. Fullscreen conserva bordes rectos. Valores existentes de tokens; corrección portable, sin CSS exclusivo del Lab.

Verificado contra: AXIS `f4dd2fe` + candidato local V4 — 2026-10-07. Sin release.

## Presentación para inserciones — contrato 0.4.0, 2026-10-07

`presentation?: 'embedded' | 'contextual'` es independiente de la skin. Omitido: Cinema usa embedded; Editorial y Review usan contextual. Para conservar el pie anterior de Cinema, indicar `presentation:'contextual'`.

- **Embedded:** ocupa sólo la caja del video, también en móvil y vertical. Sin franja de título/versión, capítulos externos, transcripción, ayuda ni panel de revisión. Controles sobre el video y autoocultado tras 3 s; nunca queda una reserva de altura vacía bajo el video. Capítulos/miniaturas siguen disponibles en el timeline; captions y ajustes siguen accesibles.
- **Contextual:** conserva título, versión y las herramientas correspondientes a cada skin. Adecuado para lectura editorial o revisión con observaciones.
- `title` sigue siendo obligatorio y alimenta el nombre accesible del reproductor y del video; ocultarlo visualmente no elimina su contexto para lectores de pantalla.
- `update({presentation:'embedded'})` o `update({presentation:'contextual'})` preserva media, tiempo, volumen y tracks. `update({presentation:undefined})` vuelve al comportamiento según skin. Los adapters DOM/SSR y React comparten el contrato; ningún consumidor necesita selectores CSS particulares.
- La documentación técnica del Lab está en un disclosure cerrado por defecto y nunca se incluye en el renderer. El selector de presentación es una herramienta del Lab, no parte del embed.

Para un blog: `createVideoPlayer(host, {id:'articulo-video', title:'Título accesible', src:'/video.mp4', skin:'cinema', presentation:'embedded'})`.

Verificado contra AXIS `f4dd2fe` + candidato local 0.4.0 — 2026-10-07. Sin publicación ni adopción en productos.

## 0.5.0 — auditoría y primeras integraciones locales

Autorización «Hazlos todos»; consumidor elegido: Think y último artículo del blog público. Compacto 68 px, targets 44×44 y barra embedded flotante a 12 px del marco; separación real del thumb respecto de Play. Sin controles CC vacíos; captions/capítulos/sonido en Ajustes según ancho. Contexto móvil por panel, búsqueda con acentos y resaltados, copia de fragmento, subtítulos configurables, filtros/foco coherentes, borrador protegido por asset/version y callbacks actualizables sin remontar. Estados, retry/continuidad, carga por visibilidad y extensiones explícitas de streaming/analítica. No almacenamiento ni telemetría implícitos.

Think tiene adapter Astro + preview noindex usando el package real mediante link local (requiere pin de release antes de deploy). WordPress tiene bloque Gutenberg candidato y copia local del artículo 251941 con estilos reales; no activación ni escritura al blog. Media de prueba rotulada. 34 browser PASS + 2 skips explícitos, corrección final de borde 2 PASS adicionales, 12 comprobaciones consumidoras, 48 primitives; detalles y límites en AXIS `docs/quality/video-player-0.5.0.md`. Bundle aislado ~72 KB gzip estimados incluyendo motor/CSS, sin fuentes/media. Tokens ligeros generados del canon, sin duplicación manual.

No confundir emulación con iPhone/Android/Safari/AT físicos ni contrato de streaming con HLS/DASH real. Respuestas, edición/borrado e historial colaborativo siguen siendo extensiones de producto que la auditoría dejó condicionadas a su contrato; no hay backend inventado. Sin commit, push, release ni aprobación visual.

### Corrección de reset consumidor (2026-10-07)

El reset universal de Think anuló el padding `:host` del motor: botones no compactos a 22×22 y cápsulas comprimidas. La geometría de todos los controles del dock debe declararse en el CSS portable de AXIS (targets, padding, flex), no depender del shadow default. Regresión primero roja en Think; después 16 comprobaciones en Chrome/WebKit y 1440/768/390/320 con medición de cada target 44×44. Comprobar reproducción/desborde solamente no acredita composición visual.

### Subtítulos en Think (2026-10-07)

La vista local debe conectar también la pista `sparks-es.vtt` del mismo clip: CC se oculta legítimamente si el modelo omite tracks. Validar carga y cue activo en desktop y menú compacto, no sólo presencia del control. Posición automática de cues: snapping nativo con margen inferior al ocultar controles; con dock visible, porcentaje anclado al inicio que reserva el bloque completo de texto; porcentaje + lineAlign=end no evitó recortes multilínea en el navegador observado. Respetar posición authored y restaurarla al desmontar.

### Replay orbital, push y reproducción intermitente (2026-10-07)

El operador pidió reemplazar el CTA textual por replay dentro de La órbita y autorizó documentar/pushear lo implementado. La acción usa la órbita SVG canónica de botones estática, un nuevo glifo curvo (familia de 14) y nombre accesible «Volver a ver» / «Watch again». No confundir una acción con el loader animado.

Estado de entrega: ramas de revisión en AXIS, Think, WordPress y Greenhouse; sin package release, merge, deploy ni activación. Think conserva link local hasta disponer de un pin publicado verificable. QA previa: 36 browser PASS + 2 skips; consumidores 16 PASS y primitives 48 PASS. Consultar AXIS `docs/quality/video-player-0.5.0.md` para evidencia vigente y cambios posteriores.

**Pendiente real:** Think volvió a mostrar superficie azul con tiempo/subtítulos avanzando. Se verificó que el decoder entregaba imágenes y que un video nativo, dos instancias AXIS frescas y un run nuevo de Think completaban con imagen. No se aisló el disparador del estado de pintura: no declararlo resuelto por recargar, tener readyState=4 o pasar canvas/tests breves. Reproducir sesión prolongada y cambios de pestaña antes del release.

### Registro de push verificado — 2026-10-07

Rama `codex/video-player-20261007`, con HEAD remoto contrastado por `git ls-remote`:

| Repositorio | Commit inicial de esta entrega |
|---|---|
| AXIS | `df338d1130d9e25cfc2e122f2c7fc82a2586fb4a` |
| Think | `8a1c2066b615ddcc80d072b504d7503fd7a08acc` |
| WordPress runtime | `da97cf9ee3f4fbb3ce5abda64c63c7ed8eda6868` |
| Greenhouse documentación | `87e7097be6060786733f862e158d832d12845f59` |

Push no equivale a release: no merge ni publicación de paquetes. El push de Think disparó automáticamente Vercel Preview y **falló**: no resuelve `@efeoncepro/axis-ui-primitives/video-player`, porque el link al checkout hermano no existe en cloud. Confirmado en logs de `dpl_3MAWPHcmSmkFtnHtFc6iKhRCp6ed`. Requiere pin exacto de una distribución AXIS verificable antes de desplegar; no se publicó el package para evadir ese límite. AXIS y Greenhouse no registraron runs GitHub Actions para esta rama en el readback. El incidente intermitente de pintura azul sigue abierto e independiente del build cloud.
