# Glitch — sub-línea gráfica (sólo para Glitch)

> Verificado contra: greenhouse-eo@24b165816 + árbol local (sin commit) — 2026-09-28 (noche) · **numeración resuelta:
> manda lo publicado en el blog, la próxima semanal es la #18** (`pnpm glitch:editions`, `--check-published`; §1) ·
> **muletilla del cierre del video como dato** (`video.closingLine`; §6, §9.1) · **excepción de licencia `press`
> gobernada, sólo en el Flash** (§9.1, §14.4) · antes: greenhouse-eo@24e4c72ee (local, sin push; `origin/develop` =
> `53002b352`) — 2026-09-28 · **el
> Glitch Flash compone** con `pnpm glitch:compose` (manifiesto `edition.kind: "flash"`, seis plantillas `Flash*`, estela
> generada desde el token; AXIS tag `v0.3.24` = `axis-tokens` 0.3.24 + `axis-ui-contracts` 0.3.22 con el contrato
> `efeonce.glitch-line` 0.2.0, fijados en Greenhouse por `53002b352`: §9, §9.1 y §14) y las portadas con foto del
> Composer pintan «LA NOTICIA» · barrido de consistencia (versiones de AXIS, 32 plantillas, pendientes reales del Flash) ·
> antes: greenhouse-eo@9b531b396 — 2026-09-28 · **Glitch Flash** (formato puntual sin número de edición;
> el primero, Claude Sonnet 5.5, se lanzó en producción el 2026-09-28 y el operador lo aprobó en uso real: §14) · chip «LA NOTICIA» en la portada productiva y muletilla de la contraportada que
> varía por edición (decisiones del operador del 2026-09-28) · **discrepancia de numeración abierta** (§1) · antes:
> greenhouse-eo@bc6fedc28 — 2026-09-27 · inventario de la sesión «Integrar Glitch en la línea
> gráfica» (2026-09-27) · decisiones del operador del 2026-09-27 (Delta del ADR: manzana y verde aprobados, línea
> Growth, próxima edición #17, alta de los 5 glifos aprobada) · motion en el repo taller (2026-09-27, empujado a
> `main` = `ed89a0b`: 38ac584…c2a08c3, sonido integrado en `2d411b8`, música y pre-roll en `2c8f36c`, entregas
> `b40565e` y `ed89a0b`), **APROBADO** por el operador el 2026-09-27: ver §12 · diseño sonoro de Glitch **aprobado, versión B** (greenhouse-eo
> `2fee1f487` y `556c83ae2`; aprobado por el operador el 2026-09-27): ver §13 · música de Glitch (tema B + cama
> post-punk) **aprobada** por el operador el 2026-09-27, másteres en `glitch/music/v1/` del bucket de AXIS, integrada
> al taller (`2c8f36c`, `ed89a0b`) y en producción en AXIS (`87c3298`, `#musica`): ver §13.7 · **el reel abre directo
> con la apertura, sin pre-roll** (decisión del operador del 2026-09-27; taller `1f323ca`, sin empujar): el pre-roll
> queda sólo en el vlog · **blog completo y lámina con lente APROBADOS** (operador, 2026-09-27: «Vamos en todas con tu
> recomendación»; norma v1.10): ya no quedan piezas estáticas en PROPUESTA · **tokens, contrato y assets de Glitch
> publicados en AXIS `v0.3.12`** (TASK-1922, 2026-09-27; Greenhouse los fija desde `4dfb147f7`).
>
> **Canon humano:** norma [`GLITCH_GRAPHIC_LINE_V1.md`](../../../../docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
> + ADR [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](../../../../docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md)
> (ambos redactados el 2026-09-27). Si esta referencia y la norma no coinciden, manda la norma y se corrige aquí.
>
> **AXIS (publicado 2026-09-27, tag `v0.3.12`, commit `29a40b5`; TASK-1922; el Glitch Flash, tag `v0.3.24`, commit
> `5b3056f`, 2026-09-28):** página `https://axis.efeonce.org/references/glitch/` (con la sección «El Glitch Flash»,
> `#flash`), gemelo para agentes `https://axis.efeonce.org/references/glitch.json` (con `tokens` —incluido
> `editions`—, `contract` y `assets`; schema `axis.glitch-line.v1`) y guía `docs/agent-composition/glitch.md` del repo
> `efeoncepro/axis-design-system`. **La fuente de verdad de los valores es el token `glitchLine`**
> (`@efeoncepro/axis-tokens`, export de primer nivel, tipo `GlitchLine`, `status: canonical` desde 0.3.37 —sub-línea de La órbita, estable el 2026-09-29—; desde 0.3.24 con
> `editions` y las piezas `flash-*`), el **contrato `efeonce.glitch-line`** (`@efeoncepro/axis-ui-contracts`; 0.2.0
> desde 0.3.22, `stable` desde 0.3.37, acepta intents 0.1.0) y los **assets `AXIS_GLITCH_ASSETS`** (`@efeoncepro/axis-brand-assets` 0.3.5).
> Greenhouse `develop` fija `axis-tokens` **0.3.24**, `axis-ui-contracts` **0.3.22** y `axis-brand-assets` 0.3.5 desde
> `53002b352` (antes, 0.3.12 / 0.3.10 desde `4dfb147f7`).
> Los números de esta referencia son **referencia humana**: si difieren del token, manda el token. **Nunca copies
> valores a mano** en una plantilla, overlay o script: léelos de `glitchLine` o resuelve la pieza con
> `pnpm glitch:resolve -- --input <intent.json> --out <manifest.json>` (repo AXIS; intent → manifiesto
> `axis.glitch-line-composition.v1`; §9).

## 0. Alcance — decide esto primero

Glitch es el **magazine semanal de Efeonce** de marketing, tecnología y creatividad **+ IA**. Su línea es una
**sub-línea complementaria de «La órbita» que aplica sólo a Glitch**. No es la línea de Efeonce ni se extiende a otra
pieza de la marca.

- [ ] ¿La pieza es de Glitch (portada, lámina del carrusel, contraportada, banner o bloque del blog, vlog, reel)?
      **Sí** → esta referencia **más** la línea madre (criterio, firma, contraste). **No** → nada de esta referencia.
- [ ] Efeonce firma Glitch: logo de Efeonce centrado abajo. Glitch es contexto, como un producto (manual §7).
- [ ] ¿Es la **edición semanal** (sale los lunes, «Edición #N», Top 8) o un **Glitch Flash** (una noticia puntual, sin
      número de edición)? Flash → además [§14](#14-glitch-flash--formato-puntual-lanzado-2026-09-28-compone-con-pnpm-glitchcompose).

| Glitch **hereda** de La órbita (no lo redefine) | **Sólo de Glitch** (nunca en una pieza de Efeonce) |
|---|---|
| «El anillo pregunta, la esfera responde»; los verbos rodea / mide / enfoca | La **manzana** como esfera |
| **Una sola esfera por pieza**; ningún texto cruza la órbita; el halo | El **verde Glitch** `#6ec207` como acento |
| La anatomía de la lente | El **navy** `#022a4e` del wordmark: **tinta compartida** con el logo de Marketing con Manzanitas, la otra marca editorial (operador, 2026-09-29; `glitchLine.scope.sharedWithEditorialFamily`), así que no es exclusivo de Glitch; sigue sin usarse en piezas de Efeonce |
| Fondo oscuro `#001a33` | La **falla en bytes** |
| Bricolage Grotesque + Poppins | **Guttery** como voz del narrador |
| La firma de piezas (logo Efeonce centrado abajo) | La cabecera **«EDICIÓN #N»** (en el Glitch Flash: «NO ESPERA AL LUNES» + estela de bytes + «FLASH», §14) |
| La regla de contraste del acento | «El micrófono se abre… / se cierra.» y el **Glitch Drop** |
| Iconografía AXIS (Trazo y Plastilina); territorio sonoro «Puntos suspensivos» | |

## 1. Identidad editorial (lo que la gráfica sirve)

- **Dos formatos** (decisión del operador, 2026-09-28): la **edición semanal** —sale los lunes, se numera «Edición #N»,
  Top 8— y el **Glitch Flash**, que «se dispara ante una noticia» puntual (el primero: el lanzamiento de Claude Sonnet
  5.5) y **no lleva número de edición** porque no es la edición entera. Lo que sigue describe la edición semanal; lo
  propio del Flash está en §14.
- Top 8 semanal, pero **manda el POV del narrador**: la noticia es el pretexto. «La noticia pregunta, el narrador
  responde». Le habla a marketers, creativos y apasionados por la IA y la tecnología. El «+ IA» es grande, no menor.
- Se numera **«Edición #N»**. **Numeración RESUELTA (2026-09-28, sesión autorizada por el operador):** la fuente de
  verdad es el registro de ediciones **publicadas** del blog (`efeoncepro.com/glitch/`, categoría Glitch de WordPress,
  term 183; títulos «Glitch #N: …»). El blog ya publicó «Glitch #16» (2026-07-21) y «Glitch #17» (2026-07-28, post
  251605), así que **la próxima semanal es la #18** (la «#17» del 2026-09-27 quedó superada). Antes de fijar el número
  de una edición real: `pnpm glitch:editions` (imprime la última publicada y la próxima) y compón con
  `pnpm glitch:compose -- --manifest … --check-published`, que falla con `edition-number-already-published` si el
  número ya salió. El Flash no lleva número y no cuenta. Los «#11»–«#14» de las maquetas del canvas son ejemplos de
  diseño; nunca los copies como número real. AXIS la registra como resuelta en `axis-tokens` 0.3.25
  (`glitchLine.resolvedDecisions` + `editions.weekly.numbering`, regla sin estado: nunca guarda el número); commit
  local `84e9588` en la rama `docs/glitch-flash-composer`, **publicación pendiente** (push a `main` + tag `v0.3.25`).
- Línea de servicio: **Growth** (decisión del operador, 2026-09-27) → eslogan de la contraportada «Empower your Growth».
- Motivo: **«El micrófono se abre…»** (narrador de radio); cierra con **«El micrófono se cierra.»**.
- Fuentes de marca: guía de tono v3 en OneDrive `Alineación/5. Contenidos/09. Glitch/Marca/Glitch-Guia-Tono-Voz-Personalidad-v3.docx`;
  [PDR-020 §6](../../../../docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md); wordmark
  canónico en AXIS (`AXIS_GLITCH_ASSETS`: `glitch-logo-positive` sobre claro, `glitch-logo-negative` sobre oscuro;
  `glitchLine.assets`), con copia de UI en `public/branding/glitch/glitch-{light,dark}.svg`; bloque Gutenberg
  [TASK-1337](../../../../docs/ui/wireframes/TASK-1337-glitch-gutenberg-block.md).
- Blog real `efeoncepro.com/glitch/…`: cita de fecha + «El micrófono se abre.», tabla de contenidos, 8 × (H2 numerado,
  imagen de la fuente con «Fuente:», párrafos, callout Glitch), «el hilo» al cierre y «— El equipo editorial de Glitch».

## 2. Elementos y valores (referencia humana; fuente de verdad: token `glitchLine`)

> Los valores de esta tabla son los de la norma y **coinciden con `glitchLine`** al 2026-09-27 (color, `type`,
> `masthead`, `bytes`, `apple`, `dots`, `signature`, `icons`, `formats`, `safeZones`). Para producir, **lee el token**
> o resuelve la pieza con el contrato; nunca transcribas estos números. Nada de `efeonceGraphicLine` ni de los contratos
> de La órbita referencia `glitchLine` (probado): es sólo de Glitch.

| Elemento | Valor / regla |
|---|---|
| Fondo | `#001a33` (el oscuro de La órbita) |
| Acento | verde `#6ec207`, **APROBADO** como acento de franquicia (2026-09-27). Teal `#36c8bf` y naranja `#ff6500` sólo como exploración del canvas |
| Navy Glitch | `#022a4e`: texto y tinta sobre claro en el blog |
| Texto sobre oscuro | `#ffffff` / `#e6edf3`; secundario `#9fb3c8`; líneas `#1d3a57` |
| Verde sobre blanco | ~2,25:1 → **nunca** texto, borde ni separador sobre claro; en claro, los momentos de marca van en bloques navy |
| La manzana | la esfera de Glitch (path oficial del wordmark; caja AB `{x:539,y:0,w:118,h:154}`). Cierra el titular o el POV como punto final. **Una por pieza o pantalla.** **APROBADA** como esfera de Glitch (2026-09-27). En AXIS: `glitchLine.apple` (`assetId: 'glitch-apple'`, viewBox `[539,0,118,154]`, `perPiece: 1`, halo = `efeonceGraphicLine.orbit.halo` por referencia) y el SVG `glitch-apple` de `AXIS_GLITCH_ASSETS` |
| Falla en bytes | la foto de la noticia en navy apagado (duotono `#001a33`→`#cfe4fa`) se desarma en celdas por su borde (abajo o lateral), **nunca sobre un rostro**. La manzana también se arma o desarma en bytes (8 bits por celda) |
| Los tres puntos | «El micrófono se abre…»: dos puntos + el tercero se desarma en bytes. En los cierres, el tercero se resuelve en la manzana. Son las tres ventanas de la nave y el territorio sonoro «Puntos suspensivos» |
| Bricolage Grotesque | contraste de pesos: entrada 300 (wdth 100, 0,72 em) + remate 800 condensado (`font-stretch: 78%; font-variation-settings: 'wdth' 78`); tracking +0,01 em en titulares. Token: `glitchLine.type.headlineEntry` / `headlineClose` / `headlineTracking`; el contrato exige el contraste (`headlineContrast`: entrada ≤ 400, remate ≥ 700 → si no, `headline-weight-contrast-missing`) |
| Poppins | etiquetas (600, versalitas espaciadas), cuerpo y subtítulos |
| Guttery | muletillas del narrador («spoiler:», «sin anestesia.», «nos vemos el lunes.», «el #N+1 sale el lunes.»), en el acento, rotada −3/−5°. **La muletilla de la contraportada varía por edición** (decisión del operador, 2026-09-28): es un gesto conversacional escrito para esa edición, nunca una frase fija. Aprobada en el Flash: «léelo completo / en nuestro blog.» en dos líneas («para que no esté tan pesado»). Rechazadas: «el #N+1 sale el lunes.» en un Flash (no hay número) y «el resto, el lunes» («no se escucha natural»). Prueba: leída en voz alta suena a alguien hablando. **Licencia para web y video confirmada por el operador (2026-09-27)**; úsala sólo para las muletillas. Token: `glitchLine.type.narrator` (licencia web + video, rotación −5..−3, instalada en la máquina de render). **AXIS nunca distribuye la fuente** |
| Cabecera | wordmark (290 px en 1080) a la izquierda + «EDICIÓN» (Poppins 600, 16 px, tracking 0,24 em) sobre «#N» (Bricolage 92 px: «#» 300 blanco, número 800 condensado en el acento), alineados a la derecha, en una fila centrada verticalmente. **Sin línea fina debajo**. En el Glitch Flash, «NO ESPERA AL LUNES» sobre estela de bytes + «FLASH» (§14) |
| Secciones | «MARKETING + IA», «CREATIVIDAD + IA», «TECNOLOGÍA + IA»: la IA es el cruce, no una sección aparte |
| Íconos | AXIS Trazo y **Plastilina** (elección del operador para Glitch). Los cinco glifos Plastilina de Glitch (guardar, compartir, recomendar, comentar y el gesto deslizar) **ya son catálogo**: `PLASTILINA_GLYPHS` de AXIS (decisión D27, 2026-09-27; set 36 Trazo + 48 Plastilina = 84). **En piezas de Glitch van siempre planos** (`glitchLine.icons.actions.rendering: 'flat'`, `volume: 'never'`): fila de la contraportada «SI TE SIRVIÓ» (guardar, compartir, recomendar, comentar) y «deslizar» en portadas y láminas interiores. Operador: «si es para la slide de cierre de glitch, prefiero los iconos plastilina en vectores que en 3d en esa lámina». Pedir volumen en Glitch = `icon-volume-not-applicable` |
| Firma | logo de Efeonce centrado abajo (negativo sobre oscuro). Eslogan «Empower your Growth» (Glitch es línea Growth) sólo en la contraportada, más chico que el logo, «Growth» en blanco o en el acento |

## 3. Sistema de portada — APROBADO (2026-09-27)

Fijo cada semana: cabecera, falla en bytes, firma. Variable: plantilla, foto, titular, muletilla y estado de la manzana.

| Plantilla | Cuándo | Qué lleva |
|---|---|---|
| **A · noticia con foto** | hay una foto fuerte | foto en navy arriba que se desarma en bytes; chip «LA NOTICIA» (decisión del operador, 2026-09-28; ver abajo); titular con contraste de pesos cerrado con la manzana; dos líneas de portada «+ IA»; pie con «Desliza» + mano Plastilina y la firma |
| **B · tipográfica** | un POV que pega solo, sin foto fuerte | muletilla en Guttery; titular entrada 300 + remate 800 en el acento; manzana en bytes con halo abajo a la derecha; dos líneas «+ IA» |
| **C · mosaico** | varias noticias del mismo peso | titular que las une; cuatro tarjetas con foto en navy y bytes, sección «+ IA» y POV en Bricolage 400 |

- [ ] **Rotación:** nunca dos semanas seguidas con la misma plantilla. La elige el contenido, no el gusto. El feed de
      nueve semanas está APROBADO.
- [ ] La cabecera va **sin** línea fina.
- [ ] «El micrófono se abre…» **no** va en la portada: abre la noticia 1.
- [ ] El pie de portada lleva «Desliza» con la mano Plastilina.
- [ ] **Chip de la portada con foto: «LA NOTICIA», no «PORTADA»** (decisión del operador, 2026-09-28: «PORTADA» sirvió
      para la prueba; «en una versión productiva hay que sustituir por "La noticia"»). Aplica a toda portada productiva
      (carrusel, banner 16:9 y 1:1 del blog, Threads). Las plantillas del Composer `CoverPhoto`, `BlogBannerPhoto` y
      `BlogSquarePhoto` ya lo pintan (`24e4c72ee`, sección (p) de `BASELINE_DELTAS.md`), igual que las del Flash. En
      AXIS el chip de la portada semanal sigue en `glitchLine.pendingDecisions` (`weekly-cover-chip`); el del Flash sí
      es token (`editions.flash.chips.cover`).

## 4. Carrusel de LinkedIn (1080×1350)

- **Lámina interior — APROBADA:** cabecera compacta; foto de la noticia en navy (176–626) que se desarma en bytes;
  chip «NOTICIA n» + medio y fecha; crédito de la foto; «SECCIÓN + IA · LA NOTICIA»; titular en Bricolage 300;
  «GLITCH DROP» con los puntos; POV en 800 condensado cerrado con la manzana; porqué en Poppins; avance n/8 en 8
  segmentos; «DESLIZA» + mano Plastilina.
- **Noticia 1 — ajuste del operador (aplicado):** la interior con una franja «EL MICRÓFONO SE ABRE» + puntos en el acento, entre la cabecera y
  la foto.
- **Variante con lente — APROBADA (2026-09-27) como variante ocasional:** la lente de La órbita (token `lens`: anillo
  1,9 px al 28 %, arco de 50° arriba a la izquierda y lejos de la cara, esfera 7,6 px, zoom 1,25, detalle a color y el
  resto en navy). **Sólo** cuando el POV trata de un detalle nítido de la foto; nunca por defecto. **La esfera ya está en
  la lente → esa lámina no cierra con la manzana** (una sola esfera por pieza).
- **Contraportada — APROBADA:** muletilla del narrador escrita para la edición (varía, §2); «El micrófono se cierra» con contraste de pesos; los puntos se resuelven en la manzana;
  textura de manzana en bytes; fila Plastilina **plana** «SI TE SIRVIÓ» (guardar, compartir, recomendar, comentar; nunca en volumen); CTA en píldora
  blanca «Suscríbete a [wordmark]»; la misma cabecera; firma Efeonce 300 px + eslogan.
- Historia 9:16 y carrusel panorámico: exploración anterior, **no canon**.

## 5. Blog — APROBADO (2026-09-27)

Aprobado todo por el operador el 2026-09-27 («Vamos en todas con tu recomendación»): la maqueta del post completa queda
aprobada (el vlog embebido ya lo estaba con el motion).

- **Banners 16:9 (1920×1080)** con las plantillas A/B/C en horizontal, sin «Desliza»: la imagen destacada. El archivo
  del blog recorta la destacada en cuadrado → la versión **1:1** es una **plantilla propia** derivada de las portadas
  (plantilla de TASK-1923). **Nunca** recortar la portada 4:5: pierde un quinto del alto y puede cortar el titular o la
  manzana.
- **Maqueta del post** (blog claro): banner destacado → **apertura** navy «El micrófono se abre» + tesis + «Vamos.»
  (reemplaza la cita con fecha) → **la escaleta** (índice de las ocho, como en radio) → **banner interno de noticia**
  1600×900 (foto en duotono navy + bytes + chip número/sección + wordmark; reemplaza la imagen cruda de la fuente;
  **crédito de la foto obligatorio**) → **callout «DROP» v2** → **banner de suscripción** a mitad del post → **vlog embebido** → **«El hilo de la semana»** (cierre navy)
  → **cierre** «El micrófono se cierra.» + «— El equipo editorial de Glitch» + íconos Plastilina versión papel.
- **Callout v2 vs v1:** el v1 de TASK-1337 está **publicado** (bloque `efeoncepro/glitch-drop`: panel claro navy 5 %,
  barra navy, wordmark 18 px). El v2 (pedido del operador: «más punch») es bloque navy con puntos + wordmark + «DROP»,
  remate Bricolage 800 con la manzana, porqué en Poppins y bytes en la esquina. **Aprobado desde la próxima edición** (se
  dijo «#17»; con la numeración resuelta es la **#18**, §1): el bloque de WordPress se actualiza al v2 **antes de
  publicarla**; los posts anteriores siguen con el v1. El v2 no es plantilla
  del Composer: vive sólo en el bloque. Hasta que el bloque se actualice, lo publicado es el v1.

## 6. Video — motion APROBADO (2026-09-27)

- **Vlog «Glitch en voz alta»:** tres de las ocho noticias en ~2:30. Un guion, dos formatos: 16:9 (YouTube y blog,
  miniatura 1280×720) y reel 9:16 (Instagram, TikTok, LinkedIn). Host a cámara con el micrófono en cuadro; se graba una
  vez en 4K horizontal con aire arriba y abajo y el reel sale del recorte vertical. Mnemónico y diseño sonoro al abrir y al
  cerrar: **aprobado, versión B** (2026-09-27; sólo de Glitch, §13); los `.mov` salen mudos y cada uno trae al lado su
  WAV con el mismo nombre. El motion (apertura y tarjeta final v2, kit, transiciones) y los tableros de video del canvas
  están **APROBADOS** (2026-09-27: «Si, el tuyo también está aprobado»). La **música** (tema B + cama post-punk, §13.7)
  y el **pre-roll de la intro** («los tres puntos al ritmo», 3,2 s; **sólo en el vlog**: el reel abre directo con la
  apertura) también están aprobados y el taller los entrega con el motion (§12).
  Subtítulos siempre (Poppins 600, blanco sobre navy 78 %, una palabra en el acento). Imagen de las fuentes embebida o
  licenciada, **nunca descargada**; en navy, con bytes en el borde y crédito.
- **Reel = overlays ENCIMA de la toma del host** (decisión del operador: el host está en cámara todo el tiempo).
  Pantalla completa sólo la portada del reel y la tarjeta final.

  | Zona (reel 9:16) | Uso |
  |---|---|
  | 0–220 | interfaz de la app (arriba): nada |
  | 240–440 | cabecera |
  | 1150–1480 | texto |
  | desde 1500 | interfaz de la app (abajo): nada |
  | desde x 940 | botones de la app: nada |
  | cara del host | **nunca se tapa** |

  Ocho piezas con fondo transparente: apertura, cabecera (noticia n/3 + wordmark), lower third (**aprobado**, §12;
  no inventes otro contenido), subtítulo, tarjeta de noticia, imagen de la fuente (plano dividido: la
  noticia arriba se desarma hacia el host, host reencuadrado abajo), Glitch Drop y última frase (la muletilla del
  narrador + píldora «Sigue a Glitch»). **La última frase varía por edición** (regla de §2): en el Composer
  (`overlay-cta-reel.html` / `overlay-cta-vlog.html`) es el slot `closingLine`, alimentado por `video.closingLine` del
  manifiesto (obligatoria si se piden overlays; §9.1). En el **taller** de motion, `closingLine` del archivo de
  edición reemplaza a `nextEdition` (y el taller ya compone un Flash) en la rama local `feat/glitch-flash-motion`
  (`8061c93`, `ce63091`), **sin merge a `main`**; el motion del Flash es PROPUESTA pendiente de aprobación.
- **Tarjeta final** (16:9 y reel): centrada, espejo de la apertura (los puntos se resuelven en la manzana → el reel
  empalma en loop; por eso el reel abre directo con la apertura, sin pre-roll), un mensaje, una acción, firma; sin texturas finas (la compresión las ensucia).
- En el 16:9 (kit del vlog aprobado), la tarjeta de noticia va como overlay y el Drop a pantalla completa con «SOBRE LA
  NOTICIA N · titular corto».
- Toma de prueba del host: `ai-generations/2026-09-21_copiloto/plates/G-podcast-v5.png` (generada con IA, sólo prueba).

## 7. NUNCA

- La manzana, el verde Glitch, los bytes, Guttery o la cabecera «EDICIÓN #N» en una pieza de Efeonce.
- La transición de la manzana en bytes (entre piezas o entre escenas) fuera de Glitch: es exclusiva de Glitch (§12).
- El sonido de Glitch (la falla sonora, los SFX de transición, el clic del micrófono, el aire del estudio) fuera de
  Glitch, mezclado con el kit sonoro de Efeonce, sobre la voz del host o con whooshes (§13).
- La música de Glitch (tema B y cama post-punk) fuera de Glitch; regenerarla con un modelo en vez de usar los másteres;
  música de Glitch en síntesis pura; recortarle los medios para abrirle espacio a la voz (§13.7).
- Sonido doble: soltar `apertura.wav` o `cierre.wav` junto a la intro o la salida con música (ya los traen montados);
  la cama bajo el Drop, bajo la tarjeta final o fuera del relato de una noticia (§13.7).
- Animar, sonorizar o mezclar una pieza de Glitch a mano cuando existe el comando del taller: se corre `glitch-motion`
  (§12) y se entrega lo que sale verificado.
- Dos esferas en la misma pieza o pantalla (manzana + esfera de la lente, o manzana + esfera de la órbita).
- El verde como texto, borde o separador sobre fondo claro.
- La falla sobre un rostro; un overlay sobre la cara del host o sobre la interfaz de la app.
- La órbita decorativa (la contraportada con órbita 8/8 se descartó: «no tiene nada que decir»).
- La URL como texto o la burbuja URL: en Glitch firma el logo (firma y burbuja nunca a la vez; la burbuja sólo reemplaza
  al logo si el logo ya está en la imagen).
- Descargar y resubir clips o imágenes de terceros: se embeben o se licencian. La única salida sin licencia es la
  excepción `press` del **Flash**, aprobada pieza por pieza por alguien del registro (§9.1, §14.4); nunca en la semanal.
- Fijar el número de una edición semanal de memoria o desde una maqueta: sale de `pnpm glitch:editions` (§1).
- Una frase fija en el cierre del video («el #N sale el lunes.» escrita en la plantilla): es `video.closingLine`, por
  edición (§6).
- Presentar como reales los titulares y noticias de las maquetas: son de ejemplo.
- Íconos Plastilina en volumen (3D) en una pieza de Glitch: van planos (`glitchLine.icons.actions.rendering: 'flat'`).
- Número de edición en un **Glitch Flash** («EDICIÓN», «#N», «el #N+1 sale el lunes.»): el Flash no es la edición entera
  (§14). Tampoco el avance n/8 ni «Desliza» en la portada de Threads.
- La misma muletilla fija en todas las contraportadas: el gesto del narrador cambia por edición (§2).
- «PORTADA» como chip en una pieza productiva: va «LA NOTICIA» (2026-09-28).
- La estela de bytes del Flash en cursiva, con skew o con círculos (la línea prohíbe la cursiva sintética; círculos
  serían otras esferas: la única es la manzana), ni fuera de Glitch.
- Copiar a mano un valor de Glitch (HEX, medida, tiempo) a una plantilla, overlay o script: se lee de `glitchLine` o se
  resuelve con `pnpm glitch:resolve`. Tampoco inventes claves que el token no tenga.

## 8. Estado por pieza

| Pieza | Estado |
|---|---|
| Sistema de portada A/B/C + regla de rotación + feed de nueve semanas | **APROBADO** (2026-09-27) |
| Lámina interior y contraportada | **APROBADO** |
| Noticia 1 (franja «El micrófono se abre») | ajuste del operador, aplicado |
| Variante con lente | **APROBADO** (2026-09-27) como variante ocasional (sólo POV sobre un detalle nítido de la foto; sin manzana en esa lámina) |
| Blog: banners 16:9 A/B/C, 1:1 con plantilla propia, maqueta del post completa, callout «DROP» v2 | **APROBADO** (2026-09-27). Callout v2 **desde la próxima edición (la #18, §1)**: el bloque de TASK-1337 se actualiza antes de publicarla; los posts anteriores siguen con el v1 |
| Vlog 16:9, kit de overlays del reel, tarjetas finales (y los tableros de video del canvas) | **APROBADO** (2026-09-27, con el motion) |
| La manzana como esfera y el verde como acento | **APROBADO** (2026-09-27); publicados en AXIS en `glitchLine.apple` y `glitchLine.color.accent` (v0.3.12) |
| Línea de servicio Growth («Empower your Growth») | **APROBADO** (2026-09-27) |
| Historia 9:16, carrusel panorámico; teal y naranja como acento | EXPLORACIÓN (no canon) |
| Cinco glifos Plastilina nuevos | **publicados** en `PLASTILINA_GLYPHS` (D27, AXIS v0.3.12); volúmenes aprobados por el operador antes de sellar, pero en Glitch siempre planos |
| Guttery en video y web | licencia **confirmada por el operador** (2026-09-27) |
| Mnemónico del video | **APROBADO** como parte del diseño sonoro de Glitch, versión B (2026-09-27, §13) |
| Lower third del reel y del vlog | **APROBADO** (2026-09-27, §12) |
| Motion: apertura/tarjeta final v2, kit, transición de bytes entre piezas y entre escenas, héroe | **APROBADO** (2026-09-27, §12): «Si, el tuyo también está aprobado». La v1 queda como alternativa sin aprobar. Falta decidir a qué piezas va la transición de bytes |
| Subtítulos del video | pendiente (estilo de captions en Premiere, no hecho) |
| Diseño sonoro de Glitch (ronda 6: apertura, tarjeta final, kit, lower third, transiciones) | **APROBADO, versión B** (2026-09-27, §13): «La b me encanta más. Sus sonidos están aprobados». La A queda como alternativa descartada |
| Composición de las piezas estáticas en el Artifact Composer (carrusel, sueltas del blog, portada del reel, miniatura del vlog, overlays PNG) | **EXISTE** como taller local (TASK-1923, 2026-09-27; el Flash, `24e4c72ee`, 2026-09-28): **32 plantillas** (26 de la edición semanal + 6 del Flash), todas `approval: approved`, en tres catálogos; se compone con `pnpm glitch:compose` (§9.1). La ruta productiva (API, `artifact-worker`, MCP, capability) es TASK-1921 (`in-progress`) y **sólo conoce la edición semanal** (`planGlitchEdition` en `src/lib/brand-surfaces/production/plan.ts`) |
| Música de Glitch: tema B (intro, cortina, salida) y cama post-punk bajo la noticia | **APROBADO** (2026-09-27, §13.7): «Definitivamente la B es la decisión», «Me parecen bien todas», «Post-punk definitivamente». **Integrada al taller** (`music.mjs`, pre-roll animado de la intro elegido por el operador) y **en producción en AXIS** (`#musica`, `glitch.json → music`). Único pendiente: probar la mezcla con la voz real del host |
| **Glitch Flash** (portada, noticia, contraportada, banner 16:9 del blog, banner de noticia 1600×900, portada de Threads) | **LANZADO EN PRODUCCIÓN** el 2026-09-28 (Claude Sonnet 5.5) y **aprobado por el operador en uso real**. En AXIS: `glitchLine.editions.flash` + seis piezas `flash-*` (`axis-tokens` 0.3.24) y contrato `efeonce.glitch-line` 0.2.0 (`axis-ui-contracts` 0.3.22). En el Composer: seis plantillas `Flash*` aprobadas; se compone **en local** con `pnpm glitch:compose` (§9.1, §14.4); la ruta productiva todavía no lo conoce (§14.7) |
| Chip «LA NOTICIA» en la portada con foto productiva | **DECIDIDO e IMPLEMENTADO** (2026-09-28): `CoverPhoto`, `BlogBannerPhoto` y `BlogSquarePhoto` lo pintan (§3) |
| Muletilla de la contraportada variable por edición | **DECIDIDO** (2026-09-28, §2) |
| Numeración de la edición semanal | **RESUELTA** (2026-09-28, §1): manda lo publicado en el blog; la próxima es la **#18**; `pnpm glitch:editions` y `glitch:compose --check-published` |
| Muletilla del cierre del video (overlays del Composer) | **IMPLEMENTADA** (2026-09-28): slot `closingLine` desde `video.closingLine`; el kit del taller sigue con `nextEdition` (TASK-1924) |
| Fotos de terceros sin licencia en el Flash | **EXCEPCIÓN GOBERNADA** (2026-09-28): `license.kind: "press"` con fuente https, crédito y aprobación por pieza; nunca en la semanal |

Una PROPUESTA no se entrega como canon ni se publica: se muestra al operador para aprobar. Desde el 2026-09-27 no queda
ninguna pieza estática en PROPUESTA; el estado sigue valiendo para piezas nuevas.

## 9. Flujo de composición — ACEPTADO (2026-09-27; hogar del movimiento: repo taller)

**Aceptado por el operador el 2026-09-27.** Hogar del movimiento **decidido**: el render de HyperFrames vive en el repo
taller privado `efeoncepro/efeonce-brand-workshop`, en `tools/glitch-motion/` (ADR
`docs/architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md`). AXIS define, Greenhouse compone los estáticos y guarda
el canon, Marketing Studio registra. Globe **no** es la ubicación (hibernado, CI en cada push, producto comercial): el
taller converge con Globe cuando se reactive. Seguimiento: cada edición se registra en Marketing Studio.

Objetivo: que ningún agente reinterprete. **Los agentes llenan datos; nunca eligen coordenadas ni plantilla a mano.**

1. **Canon humano en Greenhouse:** norma + ADR (arriba).
2. **Valores y contratos en AXIS — PUBLICADOS** (TASK-1922, tag `v0.3.12`, 2026-09-27; el Glitch Flash, tag
   `v0.3.24`, 2026-09-28; Greenhouse fija `axis-tokens` 0.3.24 y `axis-ui-contracts` 0.3.22):
   - **Token `glitchLine`** (`@efeoncepro/axis-tokens`, desde 0.3.12): `color` (el `ground` es `efeonceGraphicLine.color.dark`
     por referencia), `type`, `masthead`, `bytes`, `apple`, `assets`, `dots`, `signature`, `icons`, `formats`
     (`linkedin-4x5`, `landscape-16x9`, `square-1x1`, `blog-inline-16x9`, `reel-9x16`), `safeZones`, `motion`
     (aprobado: piezas, golpes, `mnemonicSync` f48, kit, transiciones), `pieces` (id → estado/superficie/formato/
     plantilla/esfera/titular), `coverRotation` y `pendingDecisions`. **Desde 0.3.24:** `editions` (`kinds: weekly |
     flash`, `default: weekly`; `editions.flash` con `status: approved`, `approvedOn: 2026-09-28`, cabecera, estela,
     chips, `progress: none`, `narratorCloser` con `rejected`), seis piezas `flash-*` en `pieces` (`derivesFrom`,
     `chip`, `coverTemplate: null`) y dos `pendingDecisions` nuevas: `edition-numbering-blog-vs-system` y
     `weekly-cover-chip`.
   - **Contrato `efeonce.glitch-line`** (0.1.0 en `@efeoncepro/axis-ui-contracts` 0.3.10; **0.2.0** desde 0.3.22,
     `AXIS_GLITCH_LINE_ACCEPTED_VERSIONS = ['0.1.0', '0.2.0']`: un intent 0.1.0 resuelve igual): `validateGlitchLineIntent` y
     `resolveGlitchLineIntent` → manifiesto `axis.glitch-line-composition.v1` (lienzo, paleta por superficie, tipo,
     titular, cabecera, wordmark, esfera, bytes, zonas seguras, caras, overlays, motion sólo para reel/vlog, portada,
     `actionIcons` planos, firma, `adapterChecks`). **Falla cerrado:** cualquier issue → `status: 'invalid'` sin cuerpo.
     28 códigos desde 0.2.0 (23 en 0.1.0; mensajes es-CL), entre ellos `piece-not-approved`, `sphere-count-exceeded`,
     `accent-text-on-light`, `overlay-over-host-face`, `overlay-over-app-ui`, `bytes-over-face`,
     `previous-cover-template-required`, `cover-template-repeated`, `headline-weight-contrast-missing`,
     `narrator-font-unlicensed`, `slogan-not-applicable`, `icon-volume-not-applicable`, `url-bubble-not-applicable` y
     los cinco de 0.2.0: `edition-kind-invalid`, `edition-kind-mismatch`, `flash-edition-number-not-allowed`,
     `flash-progress-not-allowed`, `progress-invalid`. En 0.2.0 `edition` acepta un número (la semanal #N) o
     `{ kind: 'weekly' | 'flash', number? }` y nace el campo `progress` (`n / 8`, sólo semanal).
   - **CLI** (repo AXIS): `pnpm glitch:resolve -- --input <intent.json> --out <manifest.json>`; schema
     `docs/agent-composition/glitch-line-intent.schema.json`; ejemplos `docs/examples/glitch/` (8 válidos con su
     manifiesto + 5 inválidos + `invalid-expected-issues.json`); ADR AXIS
     `docs/architecture/GLITCH_LINE_TOKEN_CONTRACT_DECISION_V1.md`.
   - **Assets** (`@efeoncepro/axis-brand-assets` 0.3.5): `AXIS_GLITCH_ASSETS`, `findGlitchAsset`, `glitchAssetUrl(id)`
     con `glitch-logo-positive`, `glitch-logo-negative` y `glitch-apple` (sellados en `GLITCH_ASSET_SEALS`), **fuera** de
     la familia `AXIS_BRAND_ASSETS`. Las fuentes (Guttery incluida) **nunca** viven en AXIS.
3. **Composición con el Artifact Composer — EXISTE como taller local** (TASK-1923, 2026-09-27; catálogos = dato):
   **una** carpeta `src/lib/artifact-composer/catalogs/glitch/` con **tres** catálogos — `glitch-carousel`
   (`pdf-merged`: portada A/B/C, interior, interior de la noticia 1, interior con lente, contraportada), `glitch-stills`
   (`png-set`: banners 16:9 A/B/C, 1:1 A/B/C con plantilla propia, banner interno 1600×900, portada del reel,
   miniatura del vlog) y `glitch-overlays` (`png-set` con alfa: cuadro fijo de cabecera, lower third, noticia, Drop y
   CTA, en reel y vlog). Entrada: el **manifiesto de edición** `GlitchEditionManifest` (`schemaVersion: 1`, zod
   `strict`: no admite `template` ni `coverTemplate`). La portada la decide `resolveCoverTemplate` (A > B > C por
   contenido, nunca la de `previousEdition.coverTemplate`). Salidas: PDF del carrusel, PNG por lámina, sueltas,
   overlays y procedencia sin reloj. Gate visual a cero píxeles. **El render hoy es local** (`pnpm glitch:compose`);
   el Cloud Run Job `artifact-worker` y la API son TASK-1921. Cómo operarlo: §9.1.
4. **Motion con HyperFrames** (skills `hyperframes`, `hyperframes-cli`, `motion-design-studio`): los overlays del reel
   y del 16:9 como composiciones del repo taller (su cuadro fijo también sale como PNG con alfa del catálogo
   `glitch-overlays`, §9.1), renderizadas por edición a video con alfa (ProRes 4444 `.mov` o
   WebM con alfa) para ponerlas sobre la toma; apertura y cierre (puntos → manzana) sincronizados con el mnemónico.
   Valores: `efeonceGraphicLine.motion` + spec de Glitch a registrar en AXIS. MOGRT de Premiere sólo si el editor
   necesita editar texto en su programa. **Dónde se produce:** en el taller, operado desde tu sesión de `greenhouse-eo`
   (el taller vive como hermano): `pnpm -C ../efeonce-brand-workshop --filter glitch-motion <doctor|render|kit|transiciones|heroe|test>` (§12).
   Nunca agregues HyperFrames ni scripts de video al `package.json` de Greenhouse, nunca copies esta skill al taller y
   nunca metas binarios (ProRes, WebM, PNG) ni rutas absolutas en git del taller: las corridas van a `corridas/` con
   `manifiesto.json` por sha256 y los binarios a GCS u OneDrive. Hoy el taller lee **su propio** archivo de edición; la
   sección `video` del manifiesto de TASK-1923 replica sus campos para que migre sin perder datos. El taller no importa
   código de Greenhouse.
5. **Semana:** contenido (pipeline editorial PDR-020 / content factory) → manifiesto → el Composer renderiza todas las
   superficies → QA humano → publicación (LinkedIn vía Metricool, blog vía WordPress; ambas con confirmación humana) →
   grabación del host → el editor monta los overlays del mismo manifiesto.

**Encaje en el Artifact Composer (implementado así en TASK-1923):** el carrusel NO necesitó un «kind» nuevo en el
motor. Un catálogo es datos y los destinos ya existían: `pdf-merged` (carrusel de LinkedIn) y `png-set` (sueltas y
overlays; con `render.background: 'transparent'` para el alfa). Como un catálogo tiene un solo `outputTarget`, son tres
catálogos delgados sobre un mismo `templatesDir` + extensión `glitch` del brand pack `axis` (Guttery) + selector de
rotación + validadores. No va por `brand-surfaces`. **Única desviación del motor:** un campo acotado del contrato de
plantilla, `render.minInkTileRatio` (piso ≥ 0,3 %, `MIN_INK_TILE_RATIO_FLOOR`), para capas pequeñas por diseño sobre
9:16 (lower third, cabecera), que el gate de lámina en blanco rechazaba. Detalle en el ADR, §«Encaje verificado en el
Artifact Composer».

**Estado:** **2 está publicado** (TASK-1922, AXIS `v0.3.12`; el Flash en `v0.3.24`; Greenhouse hoy fija
`@efeoncepro/axis-tokens` 0.3.24 y `@efeoncepro/axis-ui-contracts` 0.3.22, y `glitch-tokens.css` se compila de su
`glitchLine`). **3 existe como taller local** (TASK-1923 y el Flash de `24e4c72ee`): tres catálogos
(`glitch-carousel`, `glitch-stills`, `glitch-overlays`) con 32 plantillas, no un catálogo `glitch-edition`; su ruta
productiva (TASK-1921, `in-progress`) sólo conoce la edición semanal: no la cites como disponible ni para el Flash. **4 existe y está aprobado** (2026-09-27) en `tools/glitch-motion/` del taller; todavía
lleva la paleta y la manzana espejadas en `src/brand.mjs` y el wordmark desde `public/branding/glitch` de Greenhouse:
pasarlos a `glitchLine` y `AXIS_GLITCH_ASSETS` es trabajo de TASK-1924 (cómo operarlo hoy en §12). Tasks: (a) tokens,
assets y contrato de Glitch en AXIS → TASK-1922 (**publicado en AXIS `v0.3.12`**: incluye el alta de los cinco glifos Plastilina,
D27, y la licencia de Guttery declarada en `glitchLine.type.narrator`); (b) catálogos
de Glitch en el Composer → TASK-1923 (**taller local hecho**; ruta productiva → TASK-1921); (c) overlays HyperFrames + render con alfa → TASK-1924; (d) callout v2 en el
bloque de WordPress (aprobado el 2026-09-27 «desde la #17»; con la numeración resuelta, la #18) → bloque de TASK-1337, antes de publicarla.

**Resuelto por el operador el 2026-09-27:** manzana y verde aprobados; línea Growth; próxima edición #17 (superado el 2026-09-28: manda lo publicado, la próxima es la #18, §1); alta de los
cinco glifos aprobada; el diseño sonoro de Glitch (y con él el mnemónico): **versión B aprobada**, con sus cuatro
decisiones (§13.6); el motion de Glitch (apertura y tarjeta final v2, kit con el lower third, transiciones) con el vlog
16:9, el reel y las tarjetas finales: **aprobado**; el blog completo y la lámina con lente: **aprobados**.
**Pendientes del operador (no decidas por tu cuenta):** la licencia de Guttery (confirmada; registrar la referencia); y los pendientes del motion de §12.7. El flujo de composición ya está `Accepted` y
el hogar del movimiento ya está decidido (repo taller).

### 9.1 Componer una edición (taller local, TASK-1923)

Manual del operador: [`componer-una-edicion-de-glitch.md`](../../../../docs/manual-de-uso/creative/componer-una-edicion-de-glitch.md).
Norma: §9.1 de `GLITCH_GRAPHIC_LINE_V1.md`.

```bash
pnpm glitch:editions                      # última edición publicada en el blog y la próxima
pnpm glitch:compose -- --manifest <edicion.json> [--out <dir>] [--only carousel,stills,overlays] [--check-published]
```

- **Numeración (§1):** `--check-published` consulta la API REST pública del blog (categoría 183, timeout 10 s) y falla
  con `edition-number-already-published` si `edition.number` ≤ la última publicada, o con
  `published-editions-unavailable` si el blog no responde (nunca inventa). Sin el flag, la verificación es de mejor
  esfuerzo (5 s) y sólo avisa (`⚠`); un manifiesto `example: true` ni siquiera consulta. Saltarse números sólo avisa.
  El Flash no lleva número (`--check-published` no aplica). Nada de esto entra a la procedencia (el blog cambia, la
  edición no). Código: `src/lib/glitch-composition/published-editions.ts` (parser puro de títulos + fetch paginado).

- **Parte del ejemplo:** `src/lib/glitch-composition/examples/edition-17.example.json` (fotos sintéticas en
  `examples/fotos/`, regenerables con `pnpm tsx scripts/glitch/make-example-photos.ts [--check]`). `example: true` =
  nunca se publica. Las rutas de `photo.file` son relativas al manifiesto.
- **Manifiesto** (`src/lib/glitch-composition/manifest.ts`, estricto): `edition {number, publishDate, weekRange}`,
  `thesis`, `previousEdition {number, coverTemplate A|B|C|none}`, `cover {newsId, standalonePov|null, mosaic[4]|null,
  muletilla|null, headline {entry, punch}, lines[2]}`, `news[8]` (`n1`…`n8` en orden: `section`, `headline`, `outlet`,
  `date`, `photo {file, credit, license {kind licensed|owned|generated, ref}, strong, fractureEdge bottom|left|right,
  faceRegions[]}`, `pov`, `why`, `lens {region}|null` — nunca en `n1`), `back {closingLine}`, `video` (o `null`; con
  `closingLine`: la muletilla del cierre del video, **obligatoria si se piden overlays**, una línea, variable por
  edición; si anuncia un número debe ser `#<número + 1>`; rechaza `narratorCloser.rejected` del token y el marcador
  `#N`) y `outputs {stills[], overlays[reel|vlog]}`. Un manifiesto viejo con overlays y sin `video.closingLine` falla
  con `field-required` (sin migración automática: rellenarla con la frase fija de antes sería justo lo que la regla
  prohíbe). Stills: `cover`, `back`, `interior:nN`, `blog:banner`, `blog:square`,
  `blog:news:nN`, `reel:cover`, `video:thumbnail`; los dos últimos exigen `video.hostPhoto` y `video.cover`; los overlays
  exigen `video`. `faceRegions` es obligatorio (`[]` = sin rostros), normalizado a la foto ORIGINAL; el mapper lo lleva
  al recorte **centrado** del hueco (`fitRegion`). El kit de prensa **no** es licencia: `license.kind: "press"` en la
  semanal sale como `press-license-weekly-not-allowed` (la excepción existe sólo en el Flash, §14.4).
- **Tú llenas datos; el comando decide** plantilla, coordenadas, tokens y falla. Nunca agregues un campo para elegir
  la plantilla (se rechaza) ni cambies `previousEdition` para forzar una portada.
- **Salidas** (por defecto `.captures/glitch/edicion-<n>/`): `glitch-<n>-carrusel.pdf` (10 páginas, un tamaño,
  verificado contra LinkedIn: 100 MB, 300 páginas, tamaño único), `carrusel/` (PNG + manifiesto resuelto), `sueltas/`,
  `overlays/` (cuadros fijos con alfa, se sueltan en 0,0; el Drop del vlog es opaco) y `glitch-<n>.provenance.json`
  (sin reloj: misma edición → mismos archivos; sha256 de fuente y foto procesada, celdas de la falla por lámina,
  versiones AXIS, estado de Guttery, límites de LinkedIn). `--only` filtra lo que se pinta, no lo que se valida.
- **Errores** (`✗ …` + `- [código] ruta: mensaje`, exit 1; nada se entrega a medias):

  | Código | Qué hacer |
  |---|---|
  | `manifest-invalid` (`field-unknown` / `field-required` / `field-invalid`, con ruta del campo) | corregir el campo |
  | `cover-rotation-unsatisfiable` | cambiar el contenido de portada para que califique otra plantilla (lo decide un humano, nunca el composer) |
  | `font-license-missing` | Guttery sin licencia declarada en `fonts.json` del brand pack: avisar al operador, no quitar la letra |
  | `contract-issues` | el contrato `efeonce.glitch-line` (`validateGlitchLineIntent`; el Flash valida con 0.2.0 y `edition: { kind: 'flash' }`) rechaza una lámina; ruta `<lámina>.<campo>` con el código del contrato: corregir el dato |
  | `fracture-over-face` | otro `fractureEdge`, `faceRegions` bien medido u otra foto |
  | `carousel-too-heavy` | el PDF no cabe en los límites de LinkedIn |
  | `edition-number-already-published` | (`--check-published`) el número ya salió en el blog: usar el que imprime `pnpm glitch:editions` |
  | `published-editions-unavailable` | (`--check-published`) el blog no respondió: reintentar; nunca fijar el número a ciegas |
  | `press-license-weekly-not-allowed` · `press-license-approval-required` · `press-license-approver-unknown` · `press-license-approval-mismatch` | la excepción de prensa: sólo en el Flash, con aprobación de alguien de `approvers.json` para ESTE slug (§14.4) |
  | `glitch.*` del catálogo (`glitch.cover-rotation`, `glitch.single-sphere`, `glitch.headline-contrast`, `glitch.photo-credit`, `glitch.face-safe-fracture`, `glitch.accent-on-light`, `glitch.edition-structure`, `glitch.catalog-membership`, `glitch.piece-approval`) | segunda línea: repiten las reglas sobre el plan resuelto; si salta una, el plan llegó sin pasar por el mapper |

- **Dónde vive:** mapper puro `src/lib/glitch-composition/` (`planGlitchEdition`, `resolveCoverTemplate`,
  `attachFractures`, `fitRegion`; falla en bytes `byte-fracture.ts`, perfiles `band`/`side`/`host`/`card`; copy fijo
  `copy.ts`); catálogos y validadores `src/lib/artifact-composer/catalogs/glitch/` (`validators.ts`,
  `edition-validators.ts`, `glitch-tokens.css` compilado desde `glitchLine`; nunca HEX ni familias literales en
  plantillas); CLI `scripts/glitch/compose.ts` (+ `linkedin.ts`, `photos.ts`); tokens `pnpm glitch:tokens [--check]`;
  Guttery en `src/lib/artifact-composer/brand-packs/axis/fonts/guttery-400.ttf` (extensión `glitch`,
  `embedRights: true`; número de contrato pendiente).
- **Glitch Flash** (2026-09-28): el mismo comando compone un manifiesto con `edition.kind: "flash"`
  (`GlitchFlashManifest`: `edition {kind, slug, title, publishDate}` sin número, `news[1]` sin `id` ni lente ni
  `strong`, `cover {photo|null, headline, lines[2] {section, text}}`, `back {closingLine: línea | [línea, línea]}`,
  `outputs.stills` ⊂ `cover|interior|back|threads|blog:banner|blog:news`). Ejemplo:
  `src/lib/glitch-composition/examples/flash-sonnet-5-5.example.json`. Mapper `planGlitchFlash` (despachador
  `planGlitchManifest`, `parseGlitchManifest`); intents del contrato con `version: '0.2.0'` y `edition: { kind: 'flash' }`.
  Salidas `glitch-flash-<slug>-carrusel.pdf` (3 páginas), `sueltas/` y `glitch-flash-<slug>.provenance.json`
  (`edition: null`, `editionKind: "flash"`). Detalle en §14.4.
- **Gate:** `pnpm composer:visual-gate --catalog=glitch [--selftest|--freeze]`; 32 frames (26 hasta el
  2026-09-27) en `scripts/frontend/baselines/artifact-composer/templates-glitch/`; rebaseline sólo declarado en
  `BASELINE_DELTAS.md` (secciones g y p; la p, sellada, trae las seis del Flash y el chip «LA NOTICIA»).
- **Tras un bump de AXIS:** `pnpm glitch:tokens` **y** `pnpm brand:tokens`, los dos con `--check`, antes del commit
  ([lessons.md](lessons.md), 2026-09-28: el CI de `53002b352` falló por regenerar sólo uno).
- **Fuera del comando:** publicar (LinkedIn vía Metricool, blog vía WordPress, con confirmación humana), el motion
  animado (taller, §12) y la ruta productiva (TASK-1921).
- **Pendientes conocidos:** el token `portada-c` de AXIS dice esfera `apple` pero la portada C aprobada no lleva
  manzana (excepción explícita en el test; seguimiento: patch de AXIS); `VideoThumbnail` no tiene pieza propia en
  `glitchLine.pieces` (se valida con la de la portada del reel).

## 10. QA de una pieza de Glitch (además de [qa-checklist.md](qa-checklist.md))

- [ ] Es una pieza de Glitch (§0) y su estado (§8) permite entregarla como canon; si es PROPUESTA, va marcada así.
- [ ] Una sola esfera en la pieza o pantalla: manzana **o** lente, nunca las dos.
- [ ] El verde no aparece como texto, borde ni separador sobre claro; texto chico sobre oscuro en blanco o
      `#e6edf3`/`#9fb3c8`, no en el acento (regla de contraste de la línea madre).
- [ ] Los bytes salen del borde de la foto y no tocan ningún rostro.
- [ ] Portada: plantilla distinta a la de la semana anterior; cabecera sin línea fina; sin «El micrófono se abre…».
- [ ] Portada con foto productiva: chip «LA NOTICIA», nunca «PORTADA» (2026-09-28).
- [ ] Contraportada: la muletilla está escrita para esta edición (no copiada de la anterior) y suena natural leída en voz
      alta; en un Flash no promete un número ni «el lunes» forzado.
- [ ] Si es un **Glitch Flash**: además el QA de §14.5.
- [ ] Reel: nada en 0–220, desde 1500 ni desde x 940; la cara del host libre; subtítulos presentes.
- [ ] Firma: logo de Efeonce centrado abajo; sin burbuja URL ni URL como texto.
- [ ] Foto o clip de la fuente embebido o licenciado, con crédito.
- [ ] Blog: la 1:1 sale de su plantilla propia (nunca la portada 4:5 recortada); cada banner interno lleva el crédito
      de la foto; el callout «DROP» v2 sólo desde la #18 (§1) y con el bloque ya actualizado.
- [ ] Lámina con lente sólo si el POV trata de un detalle nítido de la foto; esa lámina no cierra con la manzana.
- [ ] Íconos de acción («SI TE SIRVIÓ», «deslizar») planos, nunca en volumen.
- [ ] Si la pieza sale de un intent, `validateGlitchLineIntent` (o `pnpm glitch:resolve`) no devuelve issues; un
      manifiesto `status: 'invalid'` no se renderiza ni se corrige a mano: se corrige el intent.

## 11. Dónde se ve

- Canvas de diseño: https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS («Glitch en La órbita»): análisis, aplicaciones,
  punch #11, para evaluar, sistema de portada (APROBADO), blog y vlog, vlog en reel.
- AXIS Lab (publicado 2026-09-27): `/references/glitch/` y `/references/glitch.json` de
  `efeoncepro/axis-design-system`; ambos leen el token `glitchLine` (`apps/lab/src/data/glitch.ts` no guarda HEX ni
  medidas de Glitch). Composición: TASK-1922 (AXIS, publicado), TASK-1923 (Composer), TASK-1924 (movimiento).
- Movimiento: repo taller `efeoncepro/efeonce-brand-workshop`, `tools/glitch-motion/` (**aprobado** el 2026-09-27;
  lo sigue TASK-1924) y sus corridas en `corridas/` del taller. Entregas en OneDrive
  `Alineación/5. Contenidos/09. Glitch/Motion/piloto/` (la carpeta conserva su nombre; cada `.mov` con su WAV al lado).
  Manual del editor humano:
  [`editar-video-glitch.md`](../../../../docs/manual-de-uso/creative/editar-video-glitch.md). Se opera desde `greenhouse-eo` con
  `pnpm -C ../efeonce-brand-workshop`.
- Sonido (APROBADO, versión B, §13): OneDrive `Alineación/5. Contenidos/09. Glitch/Motion/piloto/sonido-propuesta/b/`,
  AXIS `https://axis.efeonce.org/references/glitch/#sonido` (archivos en `glitch/sound/v1/`) y sala de escucha
  https://claude.ai/artifact/UdRvppSXKJmb8fP2g37Ap9 («Ronda 6 · Glitch»).
- Música (APROBADA, §13.7): másteres en `https://storage.googleapis.com/efeonce-group-axis-public-media/glitch/music/v1/`
  (con `index.json`), AXIS `https://axis.efeonce.org/references/glitch/#musica` (JSON `glitch.json → music`), el taller
  (`tools/glitch-motion/src/music.mjs`) y la misma sala de escucha, rondas 9, 10, 11 y 11b.

## 12. Editor agente — motion de Glitch (APROBADO, 2026-09-27)

> **Sólo Glitch.** Todo lo de esta sección es exclusivo de Glitch. **La transición de la manzana en bytes (entre piezas
> y entre escenas) es exclusiva de Glitch y nunca se usa en piezas de Efeonce ni de clientes.** Estado: **APROBADO** por
> el operador el 2026-09-27 («Si, el tuyo también está aprobado»): apertura y tarjeta final v2, kit de overlays,
> transición de bytes entre piezas y transición entre escenas (paquete y héroe), más el **pre-roll de la intro**
> («los tres puntos al ritmo», elegido por el operador). Con él salen su **sonido B** (§13) y su **música** (§13.7),
> ambos aprobados. Los pendientes están en §12.7. Manual del editor humano (Premiere/AE):
> [`editar-video-glitch.md`](../../../../docs/manual-de-uso/creative/editar-video-glitch.md). **Referencia completa de
> comandos, argumentos y variables de entorno:** norma §13.13 «Referencia de comandos y argumentos» (manda sobre esta
> sección; aquí va el mínimo operable).

### 12.1 Motor y entorno

- Código en el taller `efeoncepro/efeonce-brand-workshop` → `tools/glitch-motion/` (paquete pnpm `glitch-motion`).
  Se opera **desde `greenhouse-eo`** con `pnpm -C ../efeonce-brand-workshop --filter glitch-motion …`.
- HyperFrames 0.6.69 (HTML + GSAP → video), GSAP 3.14.2 con CustomEase copiados al build (render sin red),
  `@efeoncepro/axis-tokens` 0.3.8 (curvas, sobrepasos, onda, pulso, letras), `@efeoncepro/axis-brand-assets` 0.3.4
  (logo de Efeonce). Paleta y manzana de Glitch: **todavía espejadas** en `src/brand.mjs` (y el wordmark desde
  `public/branding/glitch` de Greenhouse). Ya existen en AXIS (`glitchLine` en tokens 0.3.12, `AXIS_GLITCH_ASSETS` en
  brand-assets 0.3.5): el taller debe leerlos y retirar el espejo (TASK-1924). `glitchLine.motion` ya guarda los tiempos
  aprobados (piezas, golpes, `mnemonicSync` f48, kit, transiciones): `TIMING`/`KIT_TIMING` del taller deben coincidir
  con él o leerse de él. Diferencia conocida por conciliar: la entrada del titular es 0,72 em en el token y 0,66 em
  (0,62/0,56 en el reel) en el taller. Hasta que TASK-1924 lo cierre, **no cambies valores del taller a mano**.
- Fuentes: Bricolage (font pack del Artifact Composer), Poppins 500/600/700, Guttery (licenciada, **instalada en la
  máquina, nunca en git**). Instalar dependencias: `NODE_AUTH_TOKEN=$(gh auth token) pnpm -C ../efeonce-brand-workshop install`.
- Salida: **ProRes 4444 con alfa** (`.mov`, `yuva444p12le`), **30 fps**, sin audio; al lado de cada `.mov` va su WAV
  (el sonido, APROBADO en su versión B) con el mismo nombre y duración: §13. Determinista: PRNG con semilla, sin
  reloj, sin red.
- Curvas por rol (AXIS): llegar = emphasized `cubic-bezier(0.2,0,0,1)`; transformar = standard `(0.4,0,0.2,1)`; salir =
  emphasizedAccelerate `(0.3,0,0.8,0.15)`. Sobrepasos: esfera 2, letras 1,6, default 1,2. Onda: escala 1,02→1,5, trazo
  9→1,5 px, opacidad 0,85, exponente de fade 1,6. Eco del pulso 0,55. Empujón de impacto 0,045. No los reemplaces por
  valores a ojo.

### 12.2 Qué comando usar

| Pedido | Comando (prefijo `pnpm -C ../efeonce-brand-workshop --filter glitch-motion`) |
|---|---|
| Revisar el entorno antes de cualquier corrida (fuentes, logo, wordmark, toma de prueba, ffmpeg, HyperFrames) | `doctor` |
| Apertura (4 s, 120 cuadros) + tarjeta final (3 s, 90 cuadros), reel y vlog, + **pre-roll** (3,2 s, sólo vlog), con `hyperframes lint`, verificación, WAV, música y manifiesto | `render -- --run <corrida> --edition 17 [--sound b\|a\|off] [--music on\|off] [--formats reel,vlog] [--workers <n>] [--deliver "<carpeta>"]` |
| Kit de overlays (reel 1080×1920 y vlog 1920×1080) | `kit -- --run <corrida> --edition-file ejemplos/edicion-17.ejemplo.json --assets "<imágenes>" [--transition bytes] [--only a,b] [--skip-render] [--deliver "<carpeta>"]` |
| Cambiar una sola pieza (texto corregido) | `kit … --only <pieza>` (segundos; el kit completo ≈ 4 min) |
| Transición entre escenas (máscara + capa, orígenes centro/izquierda/marca, 0,5 s y 0,8 s) | `transiciones -- --run <corrida> [--a <imagen\|video>[@seg]] [--b …] [--deliver "<carpeta>"]` |
| Transición héroe para un corte puntual (1,2 s, 36 cuadros, opaca) | `heroe -- --run <corrida> --a <archivo>[@seg] --b <archivo>[@seg] [--origin centro\|izquierda\|marca] [--formats reel,vlog]` |
| Sólo armar las composiciones HTML (incluye la del pre-roll del vlog si hay música), sin render | `build` |
| Rehacer la verificación, vistas previas, WAV y manifiesto de una corrida ya renderizada | `verify -- --run <corrida>` |
| Re-entregar una corrida ya verificada desde su manifiesto, **sin verificar ni renderizar** | `deliver -- --run <corrida> --deliver "<carpeta>"` |
| Sólo el set de WAV del sonido, sin render de video | `sonido -- --run <corrida> [--edition <n>] [--sound b\|a]` |
| Pruebas del paquete (timelines registradas, determinismo, sin red, datos de edición, pre-roll, huellas de la música, sonido completo y determinista, pre-roll sólo en el vlog) | `test` (13 pruebas, `node --test`) |

**Argumentos clave** (tabla completa en la norma §13.13): `--run <id>` (carpeta `out/<id>/` y `corridas/<id>/`;
defecto `<fecha>_glitch-motion` en `render`; `_glitch-kit`/`_glitch-transiciones`/`_glitch-heroe` en los otros) · `--edition <n>` (defecto 17) · `--edition-file <json>` · `--assets <carpeta>` (fotos,
nunca en git) · `--transition basic|bytes` · `--only a,b` · `--skip-render` (`kit`, `transiciones`: reutiliza los `.mov`
ya renderizados y rehace verificaciones, WAV, vistas previas y entrega) · `--opening-run <id>` (`kit`: corrida de donde
toma apertura, tarjeta final y pre-roll del vlog para el animatic; defecto `2026-09-27_glitch-motion-piloto-v2`) ·
`--formats reel,vlog` · `--workers <n>` (defecto 2) · `--deliver "<carpeta>"` · `--sound b|a|off` (**`b` por defecto,
la aprobada**) · `--music on|off` (**`on` por defecto, la aprobada**). Variables: `GREENHOUSE_DIR` (defecto
`../greenhouse-eo`), `GLITCH_FONTS_DIR` (Guttery; defecto `~/Library/Fonts`), `GLITCH_HOST_PLATE` (toma para las vistas
previas) y `NODE_AUTH_TOKEN` para instalar los paquetes `@efeoncepro`.

**Flujo del editor agente (una edición):** `doctor` → `render` (apertura, tarjeta final, pre-roll del vlog, intro/salida) →
`kit` con el archivo de edición y `--assets` → `transiciones` o `heroe` sólo si el montaje las pide → revisar cuadros y
verificaciones → volver a correr con `--deliver` (o con `--skip-render` si sólo cambia la entrega o el sonido; o
`deliver` para re-entregar una corrida ya verificada) →
commitear sólo el `manifiesto.json` y avisar al operador (§12.5).

**Sonido:** `render`, `kit`, `transiciones` y `heroe` entregan el WAV junto a cada `.mov` (mismo nombre, duración
verificada) con `--sound b|a|off`: `b` por defecto (la aprobada), `a` la alternativa descartada (no se usa) y `off` sin
sonido. Los tiempos del sonido se leen del código del motion.

**Música (integrada, §13.7):** `render` entrega además el pre-roll animado de la intro (sólo vlog), `glitch-intro-*.wav`
(vlog: pre-roll + apertura, 7,2 s; reel: sólo la apertura, 4,0 s; con sus efectos ya montados), `glitch-salida-*.wav` (con la tarjeta final) y las versiones de podcast; **con
música no entrega `apertura.wav` ni `cierre.wav`** (la intro y la salida ya los traen: sonarían doble). `kit` entrega
`glitch-kit-*-cama.wav` y `glitch-kit-*-cortina.wav` y mezcla el animatic (vlog 48,4 s; reel 45,2 s, sin pre-roll). **`--music off`** apaga
la música y entrega como antes.
El **reel usa los másteres de vlog**, pero **abre directo con la apertura, sin pre-roll** (decisión del operador del
2026-09-27: en un reel el primer segundo manda y así el bucle queda exacto): `glitch-intro-reel.wav` = la intro-vlog
desde 3,2 s (corte por muestra, sin retoque; ahí está en silencio, −90 dBFS), dura 4,0 s y va en 0 junto a
`glitch-apertura-reel.mov`; el final de la salida también cae en silencio (−55 dBFS), así que el bucle de audio no hace
clic. El pre-roll (`glitch-preroll-vlog.mov`, 96 cuadros; el del reel quedó en `v2/descartado/`) es **opaco** (fondo
navy) y su último cuadro es idéntico al primero de la apertura: se montan seguidos, sin corte visible. El podcast es
audio: sin motion propio.

Corridas (referencia de nombres; los nombres conservan «piloto»): `2026-09-27_glitch-motion-piloto`, `…-piloto-v2`,
`2026-09-27_glitch-kit-piloto`, `2026-09-27_glitch-kit-transicion`, `2026-09-27_glitch-transiciones`,
`2026-09-27_glitch-transicion-heroe`.

### 12.3 Archivo de edición (la única fuente del texto)

Esquema de `tools/glitch-motion/ejemplos/edicion-17.ejemplo.json`:

| Campo | Tipo / ejemplo |
|---|---|
| `edition` | número de la edición (`17`) |
| `nextEdition` | la siguiente (`18`) |
| `host` | `{ name, role }` — Julio Reyes · «Managing & GTM Director · Efeonce» |
| `guest` | `{ name, role }` o `null` (sin invitado no hay `lower-third-invitado`) |
| `news` | tres noticias `{ section, headline, shortHeadline, source, image: { file, credit } \| null }` (sin imagen no hay `fuente-N`) |
| `drop` | `{ newsIndex, lite, bold }`: la noticia, la frase liviana y el remate |
| `cta` | `{ reel, vlog }` |
| `transition` | opcional: `"basic"` o `"bytes"` |

- Las imágenes llegan por `--assets` y **nunca entran a git**; el motor las pasa a duotono navy (sombra `#001a33` → luz
  `#cfe4fa`, la de la norma §3.2; la primera entrega usó `#cfdcea`).
- El ejemplo trae textos entre corchetes: **nunca los entregues como reales**. Los textos reales de la #17 están
  pendientes del operador; no los inventes.
- Cambiar un texto = cambiar el archivo y volver a correr. **Nunca** se editan los `.mov` en Premiere. A futuro este
  archivo lo produce el dominio de ediciones (TASK-1442). Autoservicio evaluado: formulario en Marketing Studio
  (recomendado) vs `.mogrt` (descartado por duplicar el diseño a mano); ninguno está construido.

### 12.4 Verificaciones — una FALLA bloquea la entrega

| Corrida | Qué verifica | Debe dar |
|---|---|---|
| `render` | apertura y tarjeta final; bucle exacto (último cuadro de la tarjeta = primero de la apertura); con música, el pre-roll del vlog (96 cuadros, opaco, empalme con la apertura PSNR ∞), en el reel «intro reel: el corte del pre-roll cae en silencio» y «bucle de audio reel: el final de la salida cae en silencio», y las huellas sha256 de los másteres | **37/37** con sonido y música (2026-09-27; antes de la música, 26/26) |
| `kit` | códec, cuadros, alfa de entrada y salida, y el WAV de cada pieza; con música, cama y cortina | **95/95** con música (2026-09-27; antes, 84/84) |
| `kit --transition bytes` (tarjeta y Drop) | ídem | 24/24 |
| `transiciones` | máscara + capa por formato, origen y duración, y su WAV | 84/84 |
| `heroe` | ídem | 8/8 |
| `test` | 13 pruebas del paquete | 13/13 |

- **Si una sola verificación falla, no se entrega**: se corrige y se vuelve a correr. Nunca entregues «casi verde» ni
  borres una verificación para que pase. Los cuatro comandos (`render`, `kit`, `transiciones`, `heroe`) se niegan
  solos a entregar con `--deliver` si hay una FALLA y salen con código distinto de cero.
- Además de la verificación mecánica, **mira cuadros reales** (golpes, bucle, que nada caiga sobre la cara del host).

### 12.5 Cómo entregar

1. Corre con `--deliver "<carpeta>"` apuntando a OneDrive `Alineación/5. Contenidos/09. Glitch/Motion/piloto/`, en la
   subcarpeta que toca: raíz (v1, histórico), **`v2/` (la aprobada:** apertura, cierre, `glitch-preroll-vlog.mov` (sólo vlog),
   `glitch-intro-*.wav` (reel 4,0 s, vlog 7,2 s), `glitch-salida-*.wav`, `glitch-{intro,cortina,salida}-podcast.wav`, vistas previas; y
   `v2/sin-musica/` con los WAV de efectos de apertura y cierre + LEEME, para una edición sin música; `v2/descartado/` con `glitch-preroll-reel.mov` + LEEME, que no se usa**)**,
   `kit/{reel,vlog}/` (cada `.mov` con su `.wav`, más `glitch-kit-{fmt}-cama.wav`, `glitch-kit-{fmt}-cortina.wav` y
   `animatic_{fmt}.mp4`), `kit-transicion-bytes/{reel,vlog}/`, `transiciones/{reel,vlog}/` (con su `LEEME.txt`),
   `transiciones/heroe/{reel,vlog}/`. `sonido-propuesta/` es el histórico de la decisión del sonido (la B es la
   aprobada).
2. Cada corrida deja `corridas/<corrida>/manifiesto.json` en el taller: sha256 de cada binario, verificaciones,
   versiones, entrega y estado. **Commitea el manifiesto, nunca el binario.** Antes de commitear, confirma que el manifiesto
   no tenga rutas absolutas de la máquina. La entrega queda así: `"delivery": { "location": "OneDrive: Alineación/5.
   Contenidos/09. Glitch/Motion/piloto/kit", "files": ["reel/…", …] }` (ruta dentro de la biblioteca, nunca la de la máquina).
3. Avisa al operador qué se entregó, en qué estado y dónde. El motion está aprobado, pero **nunca** marques tú una pieza
   nueva como aprobada ni publiques sin el operador; los textos entre corchetes nunca salen como reales.

### 12.6 Piezas y reglas de montaje (resumen; detalle humano en el manual)

- **Apertura v2:** golpes f24 (bytes), **f48 = cuadro de sincronía** (manzana con aplaste, doble onda, halo), f69 («se
  abre»); termina transparente. **Tarjeta final v2:** golpes f6, f57, f74; entra desde transparente. v1 queda en la raíz.
- **Kit:** cada `.mov` es cuadro completo con alfa, ya ubicado en su zona → se suelta en 0,0. `cabecera-1` (2 s),
  `cabecera-2/-3` (1,2 s) con PNG `_fijo` para sostener, `cabecera-salida` (0,4 s), `lower-third-host` (5 s, sólo la
  primera aparición), `lower-third-invitado` (5 s, sólo si hay invitado), `noticia-1..3` (5 s), `fuente-N` (5 s, plano
  dividido; host reencuadrado: reel cabeza ~y 1050, vlog a la derecha), `drop` (4 s; 4,5 s con bytes), `cta` (4 s).
- **Zonas reel:** UI de la app 0–220 y desde 1500, botones desde x 940; cabecera y 250, lower third y 1150, tarjeta y
  1300, Drop y 1150, cierre y 1250. **Vlog:** cabecera y 60 (x 72), lower third y 818, tarjeta y 776 (ancho 1140),
  cierre y 872. Nunca muevas una zona a mano: si algo choca, se corrige en el motor.
- **Transición de piezas (`transition: "bytes"`):** aprobada (2026-09-27); falta decidir a qué piezas se aplica. La
  recomendación es sólo tarjetas y Drop; cabecera y lower third conservan su entrada propia.
- **Transición entre escenas:** paquete MÁSCARA (`…-mascara.mov`, track matte de ALFA) + CAPA (`…-capa.mov`, manzana
  y destellos). Orígenes centro/izquierda/marca (reel x 876 y 276; vlog x 1772 y 82). Celda reel 60 px, vlog 64 px.
  Montaje Premiere: A en V1; B en V2 desde el inicio; máscara en V3 con el ojo apagado; a B «Track Matte Key» →
  Matte: Video 3 → Composite using: Matte Alpha; cortar B donde termina la máscara y quitar el efecto al resto; capa en
  V4. After Effects: máscara sobre B con Track Matte «Alpha Matte»; capa arriba.
- **Pre-roll «los tres puntos al ritmo»** (`TIMING.preroll` en `pieces.mjs`): 3,2 s = 2 compases a 150 BPM, opaco; los
  puntos aparecen en los cuadros 0, 2 y 4, laten uno por tiempo (Mi · Mi · Mi), los tres juntos en el tiempo fuerte del
  segundo compás y el tercero tartamudea en el último tiempo (cuadros 84, 87, 90, 93; quieto en el 95).
- **Intro, salida, cortina y cama** (montaje): en el vlog, `glitch-preroll` + `glitch-apertura` seguidos en video y
  `glitch-intro-vlog.wav` desde el inicio del pre-roll (cubre ambos); en el reel, sin pre-roll: `glitch-apertura-reel`
  y `glitch-intro-reel.wav` los dos en 0 (bucle exacto); `glitch-cierre` con `glitch-salida-*.wav`; la
  cortina se suelta 1,6 s antes de la cabecera «NOTICIA n/3» siguiente; la cama en bucle bajo el relato de cada noticia,
  **−15 dB bajo la voz** con ducking por sidechain desde la voz (umbral 0,05, 3:1, 15 ms, 350 ms), cortada por la
  cortina, el Drop o la tarjeta final. En el animatic no hay voz: la cama va a −13 dB y el ducking lo aplica el editor.
  Qué efecto de Premiere usar para el sidechain no está documentado todavía `[verificar]`: se valida en la prueba con
  los editores.

### 12.7 Reglas duras del motion

- **Sólo Glitch.** Ninguna pieza de este motion (apertura, tarjeta final, kit, transición de bytes entre piezas o entre
  escenas, héroe) va a una pieza de Efeonce ni de clientes.
- **Rostros:** la falla nunca sobre un rostro. La transición entre escenas va entre imágenes de noticias, b-roll y
  pantallas; **hacia o desde la toma del host a cámara → corte seco o transición de tarjeta** (aplicado por defecto;
  excepción sólo con aprobación del operador). El borde en bytes de `fuente-N` nunca toca una cara.
- **Firma sin falla:** la firma de Efeonce nunca recibe la falla; sólo se corta.
- **Órbita = la esfera que recorre el anillo:** en el lower third del host, anillo fijo al 28 % y la manzana lo
  recorre con la estela de acento de 50°, siempre derecha. Nunca un arco suelto girando (el operador lo rechazó: «es
  una línea rotando»).
- **Una sola esfera en pantalla:** la manzana con onda del Drop es la única de su pantalla.
- **Voz:** si se suma locución, persona con **español latinoamericano neutro**.
- **Git:** nunca binarios (`.mov`, `.mp4`, PNG, imágenes de noticias, fuentes) ni rutas de máquina en git del taller;
  sólo código y `manifiesto.json`. Nunca agregues HyperFrames ni scripts de video a `greenhouse-eo`.
- **No decidas por el operador:** cadencia de grabación (hoy 30 fps) y prueba con los editores en una edición real con
  la voz del host (incluye validar el ducking de la cama), parámetro de ritmo (factible, no implementado), a qué piezas
  va la transición de bytes (recomendación: tarjetas y Drop), subtítulos (estilo de captions en Premiere, no hecho),
  textos reales de la #17, excepción de rostros. Ya **no** son pendientes: aprobar el motion, aprobar el sonido,
  integrar la música, definir el pre-roll, push del taller (empujado), si el reel abre con el pre-roll (no: abre directo
  con la apertura; el pre-roll es sólo del vlog).
- **Qué falta para el día a día** (no lo presentes como hecho): hoy cada edición la corre alguien con el taller, `gh`,
  ffmpeg, HyperFrames y Guttery instalados **en su máquina** (el kit completo ≈ 4 min). No hay autoservicio: el
  formulario en Marketing Studio (recomendado) y el dominio de ediciones (TASK-1442) están pendientes (pipeline
  editorial: EPIC-031). Plataforma: tokens, contrato y assets en AXIS ya publicados (TASK-1922, v0.3.12; el Flash en
  v0.3.24; falta que el taller los lea, TASK-1924), ruta productiva de las piezas estáticas (TASK-1921; los catálogos
  de TASK-1923 y los del Flash ya existen en local) y archivo de binarios en GCS (hoy sólo OneDrive + sha256 en los manifiestos).
- **Última frase del taller (pendiente, TASK-1924):** la pieza `cta` del kit del taller todavía dice «el #N+1 sale el
  lunes.» desde `nextEdition`. En el Composer ya es dato (`video.closingLine`, §6, §9.1); el taller debe leer la misma
  muletilla del manifiesto. No reescribas el taller por tu cuenta.
- **Si cambias tiempos del motion** (en `pieces.mjs`, `overlays.mjs` o `transitions.mjs` del taller), vuelve a correr
  el mismo comando del motion: el sonido lee los tiempos del código y sale de nuevo junto a cada `.mov` (§13.5). La
  música **no** se mueve con el motion: está amarrada a la grilla de 150 BPM y sus másteres son fijos (§13.7); cambiar
  tiempos que rompan esa grilla es una decisión del operador.
- **Nunca regeneres la música** ni sueltes `apertura.wav`/`cierre.wav` junto a la intro o la salida (sonaría doble);
  **nunca** la cama bajo el Drop, bajo la tarjeta final ni con la falla.

## 13. Sonido de Glitch — APROBADO (versión B), sólo Glitch (2026-09-27)

> **Sólo Glitch, nunca Efeonce.** El sonido de Glitch **no es parte de la identidad sonora de Efeonce** y no se usa en
> piezas de Efeonce, de su familia (Globe, Wave, Reach) ni de clientes. Toma el motivo de Efeonce y le pone «un bug»,
> igual que la manzana reemplaza a la esfera sólo en Glitch. La identidad sonora de Efeonce (logo sonoro, Brian,
> esfera por línea, dos registros) no cambia (sigue «recomendada»). **Está APROBADO en su versión B** (2026-09-27): el
> operador dijo «La b me encanta más. Sus sonidos están aprobados». La A queda como alternativa descartada. Es la
> aprobación del sonido; el motion (imagen) mantiene su propio estado (§12).
>
> **Canon:** norma [`GLITCH_GRAPHIC_LINE_V1.md`](../../../../docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
> §13.11 «Sonido — sólo Glitch (APROBADO, versión B)». Aquí va lo operativo; si no coincide, manda la norma. Oficio de audio:
> skill `audio-studio`.

### 13.1 Concepto: «el sonido de Efeonce, con un bug»

- En lo visual, dos puntos limpios y el tercero se rompe en bytes y se rearma como la manzana. El sonido hace lo mismo
  con el motivo de Efeonce: **Mi · Mi · Mi (el tercero se rompe en bytes) → La (la manzana)**.
- **La manzana da el único golpe grave:** La en campana (el timbre de Growth, la línea de Glitch) con golpe grave, halo
  breve de La mayor, destello agudo y un eco al 55 % que vuelve con la falla.
- **El video completo es el motivo en cámara lenta:** cabeceras «NOTICIA n/3» en Mi (la 1 y la 2 limpias, la 3 falla);
  el Glitch Drop es La (la manzana, segundo golpe grave del video).
- El sonido de la ronda 6 (apertura, tarjeta final, kit, transiciones) es **diseño sonoro, no música** (las versiones
  musicales de las rondas 4 y 5 no convencieron al operador). La frase describe esa ronda y no prohíbe la música:
  desde el 2026-09-27 Glitch tiene además **música aprobada** (tema B y cama post-punk, §13.7).

### 13.2 Principios (no los rompas)

- **La falla tiene afinación:** todo en La mayor (Mi y La; bytes en la pentatónica aguda). Suena a marca, no a ruido.
- **Radio actual, sin nostalgia:** cortes de búfer, granos, reducción de resolución dosificada. **Nunca** chiptune,
  módem, máquina de escribir, vinilo, estática larga, zumbidos láser ni voz robótica.
- **Un golpe grave por aparición de la manzana**; todo lo demás sin graves (los golpes de texto usan un cuerpo medio).
- **Nunca whooshes ni subidas de tráiler:** el corte es silencio digital en seco (medido −180 dBFS en la apertura).
- **La falla nunca sobre la voz del host** (espejo de «la falla nunca sobre un rostro»); nunca proceses la voz del
  host con la falla.
- **La firma de Efeonce no suena** y nunca recibe la falla.
- **Hacia o desde la toma del host no suena ninguna transición** (corte seco, igual que en la imagen).

### 13.3 Qué archivos existen

- **Sidecar WAV por `.mov`:** cada pieza del motion tiene su WAV con **el mismo nombre y duración**; se suelta en 0
  junto a su `.mov`. El mismo audio sirve para reel y vlog, **salvo las transiciones**, que tienen pista por formato.
- Piezas: `apertura.wav` (4 s), `cierre.wav` (3 s), `bucle.wav` (cierre + apertura, 7 s), `animatic.wav` (45,2 s),
  `kit/<overlay>.wav` (cabecera-1, cabecera-2, cabecera-3, cabecera-salida, lower-third-host, lower-third-invitado,
  noticia, fuente, drop, cta, noticia-bytes, drop-bytes),
  `transiciones/<reel|vlog>/glitch-transicion-<fmt>-<origen>-<rapida|normal>.wav` y `…-centro-heroe.wav`, y `demos/`.
- **Con la música activa** (por defecto en el taller), la intro y la salida de la música **reemplazan** a `apertura.wav`
  y `cierre.wav` en la entrega: ya los traen montados intactos (§13.7). Con `--music off` vuelven a entregarse.
- Las transiciones entre escenas se alinean al **mismo inicio que la máscara y la capa**.
- Dos intensidades producidas: **B** (más punch: más tartamudeo, cuerpo en los golpes de texto, campana al revés en la
  implosión de la tarjeta final) es **la aprobada**; **A** (contenida) es la alternativa descartada y no se usa.

### 13.4 Nivel

- El golpe de la manzana a **−1 dBFS de pico** fija la escala (≈ −19 LUFS integrados en la apertura, porque es casi
  todo transiente); todas las pistas usan la misma ganancia. **No se comprime el golpe.**
- La voz del host va encima (−14 LUFS video, −16 podcast); los SFX quedan bajo la voz y sin graves, salvo la manzana.

### 13.5 Motor (regenerar)

- Motor **migrado** al taller `efeonce-brand-workshop` (commit `2d411b8`, 2026-09-27): `tools/glitch-motion/src/sound.mjs`
  (antes `glitch-sfx.mjs`), sobre las primitivas de `tools/brand-sound` (el `dsp.mjs`, pasado sin cambios y con
  pruebas). Síntesis propia, sin muestras ni modelos. **Determinístico:** mismo comando, mismo archivo; la migración es
  fiel (los 30 WAV de la B salen idénticos byte a byte). Se agregó la transición héroe desde izquierda y marca (antes
  sólo centro) sin alterar la secuencia aprobada.
- **Regenerar = correr el mismo comando del motion** (§12): `render`, `kit`, `transiciones` y `heroe` de
  `glitch-motion` entregan el WAV B junto a cada `.mov` en OneDrive (`Motion/piloto/…`), con la duración verificada y
  las vistas previas con sonido; p. ej. `pnpm -C ../efeonce-brand-workshop --filter glitch-motion kit -- …`.
- **Lee todos los tiempos del código:** `TIMING` (`pieces.mjs`), `KIT_TIMING`, `APPLE_BYTES` y `ANIMATIC` (exportados
  desde `overlays.mjs`) y `schedule()` (`transitions.mjs`). No hay tiempos copiados: si cambian los tiempos del motion,
  basta con volver a correr su comando. Nunca retoques los WAV a mano.
- **Histórico:** la copia de `greenhouse-eo` (`ai-generations/2026-09-26_branding-sonoro/motor/glitch-sfx.mjs` y su
  `dsp.mjs`; comando `node …/motor/glitch-sfx.mjs --intensity b --outdir <dir>`) ya no es la fuente. Si algún día
  migra el motor de la identidad sonora de Efeonce, usa `tools/brand-sound` (una sola lógica).
- El agente no escucha: verifica con espectrograma y marcas de cuadro (cada golpe en su cuadro) y con LUFS; cómo suena
  lo decidió el operador (aprobó la B).

### 13.6 Dónde está y estado

- **AXIS:** página `https://axis.efeonce.org/references/glitch/#sonido` (dentro de Motion) y JSON para agentes
  `https://axis.efeonce.org/references/glitch.json` → campo **`sound`** (URL + SHA-256 de cada archivo), publicados
  2026-09-27. Archivos aprobados, **sólo la B**, en `gs://efeonce-group-axis-public-media/glitch/sound/v1/`
  (`https://storage.googleapis.com/efeonce-group-axis-public-media/glitch/sound/v1/`): `masters/` (`apertura.wav`,
  `cierre.wav`, `bucle.wav`, `animatic.wav`, `kit/<overlay>.wav`, `transiciones/<reel|vlog>/<…>.wav`) y `web/` (videos
  con sonido: `glitch-bucle-16x9.mp4`, `glitch-bucle-9x16.mp4`, `glitch-edicion-16x9.mp4`,
  `glitch-lower-third-bytes-16x9.mp4`, `glitch-transicion-{centro,izquierda,marca,heroe}-16x9.mp4`, con póster
  `.webp`). Usa los archivos por URL y verifica el SHA-256. En la página
  de identidad sonora de Efeonce (`/references/sonic-brand/`), Glitch sólo aparece como puntero, aclarando que no es de
  Efeonce.
- **OneDrive (editor):** `Alineación/5. Contenidos/09. Glitch/Motion/piloto/sonido-propuesta/` (la carpeta conserva
  su nombre): **`b/` es la aprobada**, `a/` la alternativa descartada (con `kit/` y `transiciones/reel|vlog/`),
  `vista-previa/` (videos del motion con el sonido montado) y `LEEME.txt`.
- **Sala de escucha:** https://claude.ai/artifact/UdRvppSXKJmb8fP2g37Ap9 → «Ronda 6 · Glitch».
- La música vive aparte (`#musica`, campo `music`, bucket `glitch/music/v1/`): §13.7.
- **Estado: APROBADO, versión B (2026-09-27).** El operador escuchó la ronda 6, dijo «Me gusta» y luego: «La b me
  encanta más. Sus sonidos están aprobados». Al aprobar lo producido en B quedaron **resueltas** las cuatro decisiones
  (ya no hay pendientes del sonido; la 3 se reemplazó después, el mismo día, con la música):
  1. **B**; la A queda como alternativa descartada.
  2. **Dos golpes graves** en el video (apertura y Drop), uno por aparición de la manzana, tal como se produjo.
  3. ~~**Voz sola bajo las noticias**, sin música.~~ **Reemplazada el 2026-09-27** (ronda 11b de la música): ahora va
     una **cama post-punk bajo la voz de las noticias, con sus reglas** (§13.7). Se deja trazada, no se borra.
  4. El **clic del micrófono y el trazo del plumón sintetizados se quedan**.
- **Observación (no bloqueante):** la sesión de motion midió que, en B, el golpe del cuadro 74 de la tarjeta final (el
  tercer punto que vuelve) queda más tapado que en A.
- Usa sólo la B y nunca lo mezcles con el kit sonoro de Efeonce.

### 13.7 Música de Glitch — APROBADA (tema B + cama post-punk), sólo Glitch (2026-09-27)

> **Sólo Glitch, nunca Efeonce** (ni su familia ni clientes; nunca mezclada con el kit sonoro de Efeonce). **APROBADO
> el tema completo** (intro, cortina, salida y cama bajo la noticia) el 2026-09-27; **integrada al taller** y **en
> producción en AXIS** el mismo día. **Canon:** norma
> [`GLITCH_GRAPHIC_LINE_V1.md`](../../../../docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
> §13.12 «Música — sólo Glitch». Aquí va lo operativo; si no coincide, manda la norma. Oficio: skill `audio-studio`.

**Cómo se decidió (textual del operador):**

- Ronda 9: «Definitivamente la B es la decisión» (dirección B del tema; la A, experta y oscura, descartada).
- Ronda 10: intro, cortina y salida del tema B: «Me parecen bien todas».
- Pidió música bajo la noticia: «mientras estén dando la noticia el oyente se va a aburrir si es voz sola». Ronda 11
  (cama sintetizada, bucle de 12,8 s desde la maqueta): **rechazada**, «Vuelvo a sentir en tono arcade». Ronda 11b
  (tres camas desde texto: post-punk, hip-hop tocado, tensión de redacción): «Post-punk definitivamente».
- Esto **reemplaza la decisión 3 del sonido** (§13.6): de «voz sola bajo las noticias» a «cama post-punk bajo la voz de
  las noticias, con sus reglas».
- **Descartado, no lo repitas:** rondas 4–5 (versiones musicales serena y rock de la identidad) · ronda 7 (Pulso y
  Club, síntesis: «no tiene el espíritu Glitch») · ronda 8 (tema en síntesis pura: «se escucha muy arcade; Glitch es
  irreverente, desafiante, experto») · ronda 9 A · ronda 11 (cama sintetizada).

**Concepto:** dirección B, **irreverente, desafiante**. Big beat de banda: batería breakbeat, bajo sucio saturado con
el motivo **Mi · Mi · Mi → La** (el de Efeonce «con un bug»), quintas sucias. **150 BPM amarrados al motion:** una
semicorchea = 0,1 s = 3 cuadros a 30 fps y todos los golpes del motion caen en la grilla (apertura: quiebre f24 =
semicorchea 8, manzana f48 = 16, «se abre» f69 = 23, corte f105, silencio f108; tarjeta final: «se cierra.» f6 =
0,2 s, corte f57 = 1,9 s, el punto vuelve f74). Respeta §13.2: La mayor (quintas, sin tercera en el tema), **un solo
golpe grave por aparición de la manzana** (sub propio sólo en la manzana), apertura y cierre B montados **intactos**
encima, silencio digital como ritmo, nunca whooshes, chiptune ni subidas de tráiler, nunca la falla sobre la voz del
host y la firma de Efeonce muda.

**Piezas:**

| Pieza | Vlog/redes (−14 LUFS) | Podcast (−16 LUFS) | Qué es y cómo se monta |
|---|---|---|---|
| Intro | `glitch-intro-vlog.wav` 7,2 s | `glitch-intro-podcast.wav` 13,6 s | Pre-roll de banda (vlog 2 compases = 3,2 s; podcast 6 compases = 9,6 s); el último tiempo tartamudea sobre la grabación y corta. La apertura B empieza en 3,2 s (vlog) / 9,6 s (podcast): silencio hasta el quiebre (f24), la banda entra desde el quiebre, la manzana (f48) es el drop con su sub, silencio digital desde f108 |
| Cortina entre noticias | `glitch-cortina-vlog.wav` 2 s | `glitch-cortina-podcast.wav` 2 s | Un compás con el motivo en el bajo; el último tiempo tartamudea y **corta en seco en 1,6 s**: empieza 1,6 s antes de la cabecera «NOTICIA n/3» siguiente, para que el corte caiga con ella |
| Salida | `glitch-salida-vlog.wav` 3 s | `glitch-salida-podcast.wav` 7 s | Con la tarjeta final: la banda entra con «se cierra.» (0,2 s), corta con la falla en f57 (1,9 s) y luego sólo suena el cierre B (la manzana implosiona sola). Podcast: dos compases más (el segundo tartamudea) y la respuesta en La, cortada en seco |
| Cama bajo la noticia | `glitch-cama-bucle.wav` 19,2 s (−16 LUFS) | el mismo | Post-punk instrumental: bajo eléctrico saturado con actitud, batería seca de sala, una guitarra rasgueada apagada en los contratiempos. Exacta a 150,00 BPM (medido); bucle sin costura de 12 compases |

**Reglas de montaje de la cama (editor y agentes):**

- Suena **sólo bajo el relato de cada noticia**: entra con la cabecera «NOTICIA n/3» (el archivo arranca en el tiempo
  fuerte) y **la corta la cortina** (o el Drop, o la tarjeta final). Se repite en bucle lo que dure la noticia.
- **Nivel: 15 dB bajo la voz** (voz −16 LUFS en podcast → cama −31 LUFS; voz −14 en video → cama −29).
- **Ducking por sidechain desde la voz:** umbral 0,05 (≈ −26 dBFS), razón 3:1, ataque 15 ms, relajación 350 ms. La
  cama baja cuando alguien habla y sube un poco en las pausas.
- **Sin EQ de recorte de medios** (ver la lección). Sin tartamudeos ni falla en la cama; no va bajo el Drop (la manzana
  es el único grave) ni bajo la tarjeta final.
- **Fuera de las noticias, la voz del host va sola:** la cama **no** va bajo el cierre sobre el host ni bajo ninguna toma
  del host fuera del relato de una noticia. La cama marca «el tiempo de la noticia».
- Los SFX del kit (cabecera, lower third, noticia…) van encima a su nivel del kit, sin atenuar (ya vienen suaves:
  −33/−34 LUFS).

**Lección medida: «arcade» = falta de cuerpo en los medios.** La intro aprobada tiene **45 %** de su energía entre
300 Hz y 3 kHz; la cama rechazada, **13 %** (sub + chisporroteo agudo); la cama post-punk aprobada, **38 %**. Causas:
maqueta sintetizada delgada + recorte de medios (EQ −6 dB a 700 Hz, −7 a 1,8 kHz, −3 a 3,2 kHz) para «dejar espacio a
la voz». Reglas: **nunca recortes los medios de la música de Glitch** para abrirle espacio a la voz (el espacio lo da
el **ducking**); **nunca síntesis pura** para la música de Glitch: instrumentos reales (grabación con IA desde texto o
re-grabación de maqueta). Control numérico (no reemplaza el oído del operador): medios 300 Hz–3 kHz ≥ ~35 % de la
energía.

**Por qué (para no reabrir ni repetir decisiones; detalle en la norma §13.12):**

| Decisión | Por qué |
|---|---|
| Música además del diseño sonoro | «El oyente se va a aburrir si es voz sola»: los golpes marcan eventos; la música sostiene el tiempo entre ellos |
| Dirección B, no A | Glitch es «irreverente, desafiante, experto»; A sonaba a thriller tecnológico serio, B a opinión con actitud de banda |
| 150 BPM | Semicorchea = 0,1 s = 3 cuadros a 30 fps: todos los golpes del motion caen en la grilla; nada se ajusta a ojo |
| Banda real, no síntesis | Tres rondas de síntesis rechazadas por sonar a videojuego (7, 8 y 11); la síntesis deja los medios vacíos |
| Tema = maqueta propia + regrabación (Stable Audio 2.5 audio a audio) | La maqueta fija motivo y tiempos; la regrabación conserva el tiempo (0–5 ms). Desde texto no respeta cortes al cuadro |
| Cortes, tartamudeo y silencio después, sobre la grabación | La falla es la firma y debe caer exacta; pedírsela al modelo la difumina |
| Apertura y cierre B intactos dentro de intro y salida | Ya aprobados; la manzana sigue siendo el único golpe grave |
| Cama post-punk | «Post-punk definitivamente»: es el tema en voz baja (misma banda); hip-hop sonaba a podcast genérico y tensión, a la A |
| Cama desde texto (ElevenLabs Music v2.5), sin maqueta | La maqueta sintetizada contagió su delgadez a la primera cama; desde texto salió con 38 % de medios |
| Ducking, no EQ | El recorte de medios volvió arcade la primera cama (13 % contra 45 % de la intro) |
| 15 dB bajo la voz | Cama con actitud: a 15 dB con ducking la voz queda al frente. El 18–20 dB genérico de `audio-studio` es para camas neutras; 15 dB es sólo de Glitch |
| Bucle de 12 compases (19,2 s) desde 0,83 s | Frase de mayor parecido fin-inicio (0,96); una noticia larga no oye la repetición; la juntura no hace clic |
| Bucket aparte `glitch/music/v1` | No cambiar los hashes de `glitch/sound/v1` que consumen AXIS y el taller |
| Nunca regenerar con un modelo | Otra corrida es otra toma; la fuente de verdad es el archivo aprobado (URL + sha256) |
| Intro y salida reemplazan `apertura.wav`/`cierre.wav` | Ya los traen mezclados; soltarlos además los duplica |
| Sin cama fuera de las noticias, bajo el Drop ni la tarjeta final | La cama marca el tiempo de la noticia; el Drop es el grave de la manzana; la tarjeta tiene su salida |
| Todo sólo de Glitch | Como la manzana: la música de Glitch nunca entra a Efeonce, su familia ni clientes; la identidad sonora de Efeonce no cambia |

**Archivos (bucket público, sólo de Glitch):** `gs://efeonce-group-axis-public-media/glitch/music/v1/`
(`https://storage.googleapis.com/efeonce-group-axis-public-media/glitch/music/v1/`) con `index.json` (path, bytes,
sha256, durationSec, lufs, truePeakDbfs). CORS permite `axis.efeonce.org`. Espacio separado de `glitch/sound/v1/`
(sus hashes no se tocaron). 17 archivos, sha256 verificados descargando. Másteres:

| path | s | LUFS | TP | sha256 |
|---|---|---|---|---|
| `masters/glitch-cama-bucle.wav` | 19,2 | −16,0 | −3,5 | `7fcfe7c7efe818a05a94d99a7496bd46336af0be024a080c408cec6544c9f8f0` |
| `masters/glitch-cortina-podcast.wav` | 2,0 | −16,0 | −11,2 | `7b8eeafe106e83d837667818a976afba7c4a00602ab96992e4ae45e761fb607d` |
| `masters/glitch-cortina-vlog.wav` | 2,0 | −14,0 | −9,1 | `f496f8ce8d3998d7111b9b509608c39f7510db664b121e0e62f18c25fe5a292b` |
| `masters/glitch-intro-podcast.wav` | 13,6 | −16,3 | −3,6 | `c15fe1da1ec7ac351617177e14a92f64a64c1099f0fc07d0daeff3a50a74f59b` |
| `masters/glitch-intro-vlog.wav` | 7,2 | −13,7 | −1,0 | `353b05bca5069ab09a40ffec663382b375e43555ecc52f1de0f39f61e0ae910d` |
| `masters/glitch-salida-podcast.wav` | 7,0 | −16,2 | −3,5 | `04e31a3030798d0cac101490b77b9a653c86a92e5a63069ae8a49fa7f9fda25b` |
| `masters/glitch-salida-vlog.wav` | 3,0 | −13,9 | −1,0 | `a4150f4c10b0217db1797df073b5d4de72c1eabd62589c91a4a286916b61ed61` |

En `web/` (hashes en `index.json`): MP3 de escucha (`glitch-cama-3-vueltas.mp3`, `glitch-cortina-vlog.mp3`,
`glitch-intro-{vlog,podcast}.mp3`, `glitch-salida-{vlog,podcast}.mp3`) y dos videos con póster `.webp`:
`glitch-tema-edicion-16x9.mp4` (15 s: intro → host sin voz → cortina → host → salida) y
`glitch-noticia-con-cama-16x9.mp4` (24 s, −14 LUFS), que es una **DEMO**: la voz es sintética y provisional (TTS
masculina «BRYAN LOCUTOR 2» de ElevenLabs sobre una foto de host); en producción va la voz del host real.

**Producción** (reproducible; `greenhouse-eo`, `ai-generations/2026-09-26_branding-sonoro/`, audio pesado fuera de
git, scripts y LEEME en git; si el audio no está en disco, `pnpm ai-gen:pull ai-generations/2026-09-26_branding-sonoro`; detalle en `audio-studio` → `efeonce/STUDIO_TOOLING.md`):

- `motor/glitch-theme.mjs`: `--stage maqueta` (banda propia) → re-grabación con IA → `--stage final --piece
  intro|cortina|salida --version vlog|podcast --from <regrabado> [--apertura|--cierre glitch-sfx/b/…]` (cortes,
  tartamudeo de búfer y silencio digital sobre la grabación real; apertura/cierre B intactos; sub sólo en la manzana).
- `motor/ai-music.ts` (vía fal, cliente canónico `src/lib/ai/fal.ts`): tema = `--route sa --plan tema-b --strength
  0.7–0.75` (Stable Audio 2.5 audio-to-audio); cama = `--route el-bed --plan cama-postpunk` (ElevenLabs Music v2.5
  desde texto, sin maqueta, seed 7, 32 s).
- `motor/glitch-cama-bucle.mjs`: arma el bucle (`--start 0.83 --bars 12`, fundido de potencia constante de 30 ms en la
  juntura: transiente 0,017 contra 0,018–0,028 de un tiempo fuerte normal) y masteriza a −16 LUFS con
  `motor/master.sh`. Determinista (dos corridas, mismo sha256).
- **La fuente de verdad son los archivos del bucket (URL + sha256), no los scripts:** las piezas son grabación
  re-interpretada + edición, no síntesis reproducible byte a byte. **Nunca regeneres con un modelo.** A diferencia del
  sonido (§13.5), el comando del motion **no rehace** la música: la baja del bucket y verifica su sha256 (ver «En el
  taller»). Si algo cambia, es una ronda nueva que aprueba el operador.
- Verificación sin oído (el agente no escucha): ebur128 de cada máster, tempo 150,00 por autocorrelación de ataques,
  juntura del bucle sin clic, medios 38 %, sha256 de los 17 archivos descargando del bucket. Cómo suena lo aprueba el
  operador. Sala de escucha: https://claude.ai/artifact/UdRvppSXKJmb8fP2g37Ap9 → rondas 9, 10, 11 y 11b.

**En el taller — INTEGRADA** (`efeoncepro/efeonce-brand-workshop`, `main`, commits `2c8f36c` y `ed89a0b`; README
`tools/glitch-motion/README.md` §«Música (aprobada: tema B + cama post-punk)»):

- `tools/glitch-motion/src/music.mjs` fija los **siete másteres** por URL y sha256 (`MUSIC_V1`, bucket
  `glitch/music/v1/`): se bajan, se verifican y **nunca se regeneran** (si el bucket cambia, falla).
- **Pre-roll animado de la intro** (`glitch-preroll-vlog.mov`, 3,2 s, 150 BPM; sólo vlog desde `1f323ca`), **elegido por el operador** entre las
  opciones de la sesión de motion: los tres puntos aparecen, laten en secuencia Mi · Mi · Mi, se juntan en el tiempo
  fuerte y el tercero tartamudea en semicorcheas en el último tiempo; su último cuadro es idéntico al primero de la
  apertura (PSNR ∞).
- `render` entrega el pre-roll del vlog, `glitch-intro-*.wav` (vlog: pre-roll + apertura con sus efectos; reel: la
  misma intro desde 3,2 s, 4,0 s), `glitch-salida-*.wav` (con
  la tarjeta final) y las versiones de podcast; **con música no entrega `apertura.wav` ni `cierre.wav`**. `kit` entrega
  `glitch-kit-*-cama.wav` y `glitch-kit-*-cortina.wav` y mezcla el **animatic** (vlog 48,4 s; reel 45,2 s) (intro en 0; cortinas 1,6 s
  antes de las cabeceras 2 y 3; cama bajo cada noticia, cortada por la cortina, el Drop o la tarjeta final, a −13 dB
  porque no hay voz: el ducking lo aplica el editor; salida). **`--music off`** apaga la música y entrega como antes.
- Niveles medidos en las entregas: intro −14, cama ≈ −31, cortinas −16, salida −14 LUFS. Verificaciones: v2 37/37 y
  kit 95/95. En OneDrive, las entregas anteriores sin música quedaron en `v2/sin-musica/` con un LEEME.

**En AXIS — EN PRODUCCIÓN** (PR #10 de `efeoncepro/axis-design-system`, commit `87c3298` en `main`, 2026-09-27):
sección 09 «Música» en `https://axis.efeonce.org/references/glitch/#musica` y campo **`music`** en
`/references/glitch.json` (17 archivos con URL y sha256, `index`, reglas, editor/agente, `never`); la página
`/references/sonic-brand/` («La familia: Glitch») enlaza a la música. Guía para agentes:
`docs/agent-composition/glitch.md` §«Música».

**Único pendiente:** **probar la mezcla con la voz real del host** en una edición real (la demo usa una voz TTS
provisional). El ducking lo aplica el editor con los valores de arriba.

## 14. Glitch Flash — formato puntual (LANZADO 2026-09-28, compone con `pnpm glitch:compose`)

> **Sólo Glitch.** Decisión del operador del 2026-09-28. **Estado:** el primero (Claude Sonnet 5.5) se produjo y se
> **lanzó en producción** el 2026-09-28 y el operador lo **aprobó en uso real**. Es canon de sistema: AXIS publicó
> `glitchLine.editions` (`weekly` | `flash`) y las seis piezas `flash-*` (`@efeoncepro/axis-tokens` 0.3.24, con
> `derivesFrom`, `chip` y `coverTemplate: null`) y el contrato `efeonce.glitch-line` 0.2.0
> (`@efeoncepro/axis-ui-contracts` 0.3.22: `edition: { kind: 'flash' }`, `flash-edition-number-not-allowed`,
> `flash-progress-not-allowed`); el Composer lo compone con seis plantillas `Flash*` (§14.4). Si un número de esta
> sección difiere del token, gana el token.

### 14.1 Qué es y cuándo se dispara

- Operador: «este es un glitch flash porque no es la edición entera, por tanto en este caso solamente no lleva edición
  con número, puede ponerse algo como flash en la imagen».
- **Se dispara ante una noticia puntual** que no espera al lunes (ejemplo: el lanzamiento de un modelo). Una noticia,
  no un Top 8. **Nunca lleva número de edición** y no consume el número de la serie semanal.
- La edición semanal sigue igual (lunes, «Edición #N», Top 8); el Flash no la reemplaza, y su nota de suscripción
  invita al semanal.
- **Más personalidad** que la edición (pedido del operador), dentro de la misma línea: mismos tokens, misma manzana,
  misma firma.

### 14.2 Diferencias con la edición semanal (tal como se publicó)

| Elemento | Edición semanal | Glitch Flash |
|---|---|---|
| Cabecera derecha | «EDICIÓN» sobre «#N» (# 300 blanco + número 800 condensado en el acento) | «NO ESPERA AL LUNES» (la misma etiqueta Poppins 600 con su tracking) sobre **estela de bytes + «FLASH»** (Bricolage 800 condensado en el acento, del mismo tamaño que el número) |
| Cabecera compacta (interior) | «EDICIÓN #N» en línea | «NO ESPERA AL LUNES» + estela + «FLASH» en línea |
| Chip de la portada | «LA NOTICIA» (antes «PORTADA», §3) | «LA NOTICIA» (portada, Threads y banner del blog) |
| Chip del interior | «NOTICIA n» | «ANUNCIO» (+ medio · fecha); banner interno: «ANUNCIO · Tecnología + IA» |
| Avance n/8 | 8 segmentos + «n / 8» | **se quita**: queda sólo «DESLIZA» + mano Plastilina a la derecha |
| «EL MICRÓFONO SE ABRE» | franja de la noticia 1 | se mantiene |
| Muletilla de la contraportada (Guttery) | escrita para la edición (varía, §2) | «léelo completo / en nuestro blog.» en dos líneas; también varía por Flash |
| Nota de suscripción | «Cada lunes en tu correo, gratis. El enlace, en el primer comentario.» | igual (invita al semanal) |
| Firma | logo de Efeonce centrado abajo; contraportada con «Empower your Growth» | igual |
| Threads | — | la portada **sola, sin «Desliza»** (no es carrusel) |

### 14.3 La estela de bytes

- SVG de **celdas cuadradas** en el acento, 13 columnas × 5 filas, celda 10 y paso 12, con densidad y opacidad que
  crecen hacia la palabra (0,18 → 1). Va a la **izquierda** de «FLASH» con un espacio de 14 px (cabecera grande); mide
  ~66 px de ancho en la cabecera compacta y ~96 px en el pie del banner de noticia.
- **Nunca cursiva ni skew** (la línea prohíbe la cursiva sintética) y **cuadrados, nunca círculos**: una sola esfera
  por pieza, la manzana.
- **Es token** (`glitchLine.editions.flash.masthead.trail`). El generador vive en Greenhouse
  (`src/lib/glitch-composition/flash-trail.ts`, `computeGlitchFlashTrail` / `buildGlitchFlashTrailSvg`: MT19937 con la
  siembra de `random` de Python) y reproduce **celda por celda** las 34 celdas del SVG publicado (test en
  `__tests__/flash.test.ts`). `pnpm glitch:tokens` lo escribe como `catalogs/glitch/assets/flash-trail.svg` en el
  acento. Ancho y separación salen del token **por contexto** (`trail.contexts`, axis-tokens ≥ 0.3.25): cabecera
  grande 150/14 px, cabecera compacta 66/8 px y pie del banner de noticia 96/10 px, como `--gx-flash-trail-*` en
  `glitch-tokens.css`; `glitch.css` no tiene medidas literales de la estela. Nunca dibujes la estela a mano.

### 14.4 Cómo se compone

- **Con `pnpm glitch:compose`**, igual que la edición:
  `pnpm glitch:compose -- --manifest src/lib/glitch-composition/examples/flash-sonnet-5-5.example.json [--out <dir>]`
  (campos del manifiesto en §9.1; manual
  [`componer-una-edicion-de-glitch.md`](../../../../docs/manual-de-uso/creative/componer-una-edicion-de-glitch.md#componer-un-glitch-flash)).
  Salen el documento de LinkedIn de **3 páginas** (`FlashCover`, `FlashInterior`, `FlashBackCover`), Threads
  (`FlashThreads`, sin «Desliza»), el banner 16:9 (`FlashBlogBanner`) y el banner interno 1600×900
  (`FlashNewsBanner`). Nunca armes un Flash inventando noticias de relleno en el manifiesto semanal ni en un canvas a
  mano: si falta algo, se corrige el manifiesto.
- Errores: el mismo formato `✗ [código] …` + `- [código] ruta: mensaje`. Propios del Flash: `flash-edition-number-not-allowed`
  (`edition.number`), `field-unknown` en `previousEdition`/`thesis`/`video`, `field-required` en `back.closingLine`,
  `field-invalid` si la muletilla es «el resto, el lunes» o anuncia un número; del catálogo, `glitch.edition-structure`
  si el carrusel no es portada + noticia + contraportada o trae número o avance.
- **Foto:** `processPhoto` (duotono) + `computeByteFracture` (bytes), funciones canónicas de
  `src/lib/glitch-composition/`. Una escena oscura se recorta y se le levanta la exposición **antes** de
  `processPhoto`, o se funde con el fondo navy ([lessons.md](lessons.md), 2026-09-28).
- **Imágenes de terceros:** con crédito siempre. En el Flash de Sonnet 5.5 el operador decidió publicar las imágenes de
  Anthropic **con crédito y sin licencia** para ESA pieza. Desde el 2026-09-28 esa excepción está **modelada y
  gobernada, no legalizada por defecto**: `photo.license = { kind: "press", ref: "<URL https de la fuente>", approval:
  { approvedBy, approvedOn, flash: "<slug de este Flash>", reason } }`, con `credit` visible no vacío. `approvedBy`
  debe estar en `src/lib/glitch-composition/approvers.json` (hoy sólo `julio-reyes`; agregar a alguien es decisión del
  operador, con commit) y `approval.flash` debe ser el slug del Flash (una aprobación no viaja a otra pieza). El plan
  la entrega como `licenseExceptions` y la procedencia la registra. Sin aprobación del operador para la pieza, **no**
  la escribas: pregunta. En la semanal no existe (`press-license-weekly-not-allowed`), y el catálogo sólo admite
  `press:` en las plantillas `Flash*` (`glitch.photo-credit` 1.1.0).
- **Copys:** el operador los revisa **antes** de programar («debo ver los copys antes de publicar»). El copy de la
  página de Efeonce usa la voz del narrador de Glitch; el LinkedIn personal de Julio busca thought leadership (opinión
  propia, primera persona, la noticia como pretexto, sin lista de specs).
- **Publicación** (Metricool, WordPress) queda fuera de esta skill: `social-media-studio` y
  `efeonce-public-site-wordpress`. Imágenes siempre en PNG.

### 14.5 QA del Flash (además de §10)

- [ ] Ningún número de edición en ninguna lámina ni en el copy de la pieza; la cabecera dice «NO ESPERA AL LUNES» +
      estela + «FLASH».
- [ ] Estela de celdas cuadradas, sin cursiva ni skew, a la izquierda de «FLASH».
- [ ] Chips: «LA NOTICIA» en la portada, «ANUNCIO» en el interior; sin avance n/8.
- [ ] Contraportada con una muletilla escrita para este Flash, natural leída en voz alta; nunca «el #N+1 sale el
      lunes.» ni «el resto, el lunes».
- [ ] Portada de Threads sin «Desliza».
- [ ] Una sola esfera por pieza (la manzana); crédito en cada foto de terceros.

### 14.6 El hito y dónde se ve

- **Hito (2026-09-28):** el Flash de Claude Sonnet 5.5 es el **primer Glitch producido y lanzado con la nueva línea
  gráfica**, consistente de punta a punta: **canvas → 4 redes → blog** (LinkedIn de la página de Efeonce, Instagram,
  Threads y el LinkedIn personal de Julio, programados en Metricool; post en el blog).
- Canvas de diseño (6 láminas: portada, noticia, contraportada, banner del blog 16:9, banner de noticia 1600×900,
  Threads): https://claude.ai/artifact/KjHuJNQXkH4vLA7pumUiaz
- Post del blog (251941): https://efeoncepro.com/glitch/glitch-flash-claude-sonnet-5-5/
- Medios publicados: `gs://efeonce-group-greenhouse-public-media-prod/campaigns/glitch-flash-sonnet-55-2026-09-28/`.

### 14.7 Pendiente (no lo decidas por tu cuenta)

- ~~Medidas de la estela en el token~~ → `trail.contexts` (AXIS 0.3.25; Greenhouse fija 0.3.28, `76376274a`).
- ~~Ruta productiva del Flash~~ → TASK-1921 acepta el Flash (`c43862008`); falta redesplegar el Job `artifact-worker`
  en staging con las plantillas `Flash*` y hacer un smoke real.
- ~~Imágenes de terceros sin licencia~~ → excepción `press` gobernada (§14.4); cada uso sigue siendo una aprobación
  del operador por pieza.
- ~~Numeración~~ → resuelta (§1) y registrada en AXIS 0.3.25 (`resolvedDecisions`).
- ~~Última frase del video~~ → `video.closingLine` en el Composer (§6); en el taller, `closingLine` en la rama local
  `feat/glitch-flash-motion` (sin merge).
- ~~Content Factory sin `kind` para el Drop~~ → `kind: 'glitchDrop'` (`c6f076e9f`).
- **Video del Flash:** el manifiesto Flash rechaza `video`, pero el taller ya compone un Flash en motion (PROPUESTA sin
  aprobar). Decide el operador si el Flash admite un reel opcional.
- **Chip de la tarjeta del kit** en el Flash: hoy «· LA NOTICIA»; propuesta «ANUNCIO» (como la lámina interior).
