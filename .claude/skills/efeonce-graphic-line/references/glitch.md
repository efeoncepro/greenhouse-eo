# Glitch — sub-línea gráfica (sólo para Glitch)

> Verificado contra: greenhouse-eo@bc6fedc28 — 2026-09-27 · inventario de la sesión «Integrar Glitch en la línea
> gráfica» (2026-09-27) · decisiones del operador del 2026-09-27 (Delta del ADR: manzana y verde aprobados, línea
> Growth, próxima edición #17, alta de los 5 glifos aprobada) · motion en el repo taller (2026-09-27, commits sin push
> 38ac584…c2a08c3, sonido integrado en `2d411b8`, entregas `b40565e`), **APROBADO** por el operador el 2026-09-27: ver
> §12 · diseño sonoro de Glitch **aprobado, versión B** (greenhouse-eo
> `2fee1f487` y `556c83ae2`; aprobado por el operador el 2026-09-27): ver §13 · música de Glitch (tema B + cama
> post-punk) **aprobada** por el operador el 2026-09-27, másteres en `glitch/music/v1/` del bucket de AXIS: ver §13.7.
>
> **Canon humano:** norma [`GLITCH_GRAPHIC_LINE_V1.md`](../../../../docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
> + ADR [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](../../../../docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md)
> (ambos redactados el 2026-09-27). Si esta referencia y la norma no coinciden, manda la norma y se corrige aquí.
>
> **AXIS (publicado 2026-09-27):** página `https://axis.efeonce.org/references/glitch/`, gemelo para agentes
> `https://axis.efeonce.org/references/glitch.json` y guía `docs/agent-composition/glitch.md` del repo
> `efeoncepro/axis-design-system` (`main`, `d5846e8`). **No existen tokens ni contrato de Glitch
> en AXIS**: los valores de abajo salen de la norma. Nunca inventes un token `glitchLine`, un contrato
> `efeonce.glitch-line` ni un asset de `axis-brand-assets` para Glitch: están pendientes (§9).

## 0. Alcance — decide esto primero

Glitch es el **magazine semanal de Efeonce** de marketing, tecnología y creatividad **+ IA**. Su línea es una
**sub-línea complementaria de «La órbita» que aplica sólo a Glitch**. No es la línea de Efeonce ni se extiende a otra
pieza de la marca.

- [ ] ¿La pieza es de Glitch (portada, lámina del carrusel, contraportada, banner o bloque del blog, vlog, reel)?
      **Sí** → esta referencia **más** la línea madre (criterio, firma, contraste). **No** → nada de esta referencia.
- [ ] Efeonce firma Glitch: logo de Efeonce centrado abajo. Glitch es contexto, como un producto (manual §7).

| Glitch **hereda** de La órbita (no lo redefine) | **Sólo de Glitch** (nunca en una pieza de Efeonce) |
|---|---|
| «El anillo pregunta, la esfera responde»; los verbos rodea / mide / enfoca | La **manzana** como esfera |
| **Una sola esfera por pieza**; ningún texto cruza la órbita; el halo | El **verde Glitch** `#6ec207` como acento |
| La anatomía de la lente | El **navy Glitch** `#022a4e` (del wordmark) |
| Fondo oscuro `#001a33` | La **falla en bytes** |
| Bricolage Grotesque + Poppins | **Guttery** como voz del narrador |
| La firma de piezas (logo Efeonce centrado abajo) | La cabecera **«EDICIÓN #N»** |
| La regla de contraste del acento | «El micrófono se abre… / se cierra.» y el **Glitch Drop** |
| Iconografía AXIS (Trazo y Plastilina); territorio sonoro «Puntos suspensivos» | |

## 1. Identidad editorial (lo que la gráfica sirve)

- Top 8 semanal, pero **manda el POV del narrador**: la noticia es el pretexto. «La noticia pregunta, el narrador
  responde». Le habla a marketers, creativos y apasionados por la IA y la tecnología. El «+ IA» es grande, no menor.
- Se numera **«Edición #N»**. La próxima es la **#17** (decisión del operador, 2026-09-27): la serie sigue la del blog y
  la del ADR del pipeline. Los «#11»–«#14» de las maquetas del canvas son ejemplos de diseño; nunca los copies como
  número real.
- Línea de servicio: **Growth** (decisión del operador, 2026-09-27) → eslogan de la contraportada «Empower your Growth».
- Motivo: **«El micrófono se abre…»** (narrador de radio); cierra con **«El micrófono se cierra.»**.
- Fuentes de marca: guía de tono v3 en OneDrive `Alineación/5. Contenidos/09. Glitch/Marca/Glitch-Guia-Tono-Voz-Personalidad-v3.docx`;
  [PDR-020 §6](../../../../docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md); wordmark en
  `public/branding/glitch/glitch-{light,dark}.svg`; bloque Gutenberg
  [TASK-1337](../../../../docs/ui/wireframes/TASK-1337-glitch-gutenberg-block.md).
- Blog real `efeoncepro.com/glitch/…`: cita de fecha + «El micrófono se abre.», tabla de contenidos, 8 × (H2 numerado,
  imagen de la fuente con «Fuente:», párrafos, callout Glitch), «el hilo» al cierre y «— El equipo editorial de Glitch».

## 2. Elementos y valores (desde la norma; AXIS pendiente)

| Elemento | Valor / regla |
|---|---|
| Fondo | `#001a33` (el oscuro de La órbita) |
| Acento | verde `#6ec207`, **APROBADO** como acento de franquicia (2026-09-27). Teal `#36c8bf` y naranja `#ff6500` sólo como exploración del canvas |
| Navy Glitch | `#022a4e`: texto y tinta sobre claro en el blog |
| Texto sobre oscuro | `#ffffff` / `#e6edf3`; secundario `#9fb3c8`; líneas `#1d3a57` |
| Verde sobre blanco | ~2,25:1 → **nunca** texto, borde ni separador sobre claro; en claro, los momentos de marca van en bloques navy |
| La manzana | la esfera de Glitch (path oficial del wordmark; caja AB `{x:539,y:0,w:118,h:154}`). Cierra el titular o el POV como punto final. **Una por pieza o pantalla.** **APROBADA** como esfera de Glitch (2026-09-27); el token de franquicia en AXIS está pendiente (TASK-1922) |
| Falla en bytes | la foto de la noticia en navy apagado (duotono `#001a33`→`#cfe4fa`) se desarma en celdas por su borde (abajo o lateral), **nunca sobre un rostro**. La manzana también se arma o desarma en bytes (8 bits por celda) |
| Los tres puntos | «El micrófono se abre…»: dos puntos + el tercero se desarma en bytes. En los cierres, el tercero se resuelve en la manzana. Son las tres ventanas de la nave y el territorio sonoro «Puntos suspensivos» |
| Bricolage Grotesque | contraste de pesos: entrada 300 (wdth 100, 0,72 em) + remate 800 condensado (`font-stretch: 78%; font-variation-settings: 'wdth' 78`); tracking +0,01 em en titulares |
| Poppins | etiquetas (600, versalitas espaciadas), cuerpo y subtítulos |
| Guttery | muletillas del narrador («spoiler:», «sin anestesia.», «nos vemos el lunes.», «el #N+1 sale el lunes.»), en el acento, rotada −3/−5°. **Licencia para web y video confirmada por el operador (2026-09-27)**; úsala sólo para las muletillas |
| Cabecera | wordmark (290 px en 1080) a la izquierda + «EDICIÓN» (Poppins 600, 16 px, tracking 0,24 em) sobre «#N» (Bricolage 92 px: «#» 300 blanco, número 800 condensado en el acento), alineados a la derecha, en una fila centrada verticalmente. **Sin línea fina debajo** |
| Secciones | «MARKETING + IA», «CREATIVIDAD + IA», «TECNOLOGÍA + IA»: la IA es el cruce, no una sección aparte |
| Íconos | AXIS Trazo y **Plastilina** (elección del operador para Glitch). Cinco glifos Plastilina nuevos (guardar, compartir, recomendar, comentar, deslizar) en `ai-generations/2026-09-26_glitch-iconos/elegidos/*.json`: pasan `icons:check` (área 537–560 u²), **alta en `PLASTILINA_GLYPHS` aprobada (2026-09-27)**; la ejecuta TASK-1922 y hasta publicarse en AXIS no son catálogo |
| Firma | logo de Efeonce centrado abajo (negativo sobre oscuro). Eslogan «Empower your Growth» (Glitch es línea Growth) sólo en la contraportada, más chico que el logo, «Growth» en blanco o en el acento |

## 3. Sistema de portada — APROBADO (2026-09-27)

Fijo cada semana: cabecera, falla en bytes, firma. Variable: plantilla, foto, titular, muletilla y estado de la manzana.

| Plantilla | Cuándo | Qué lleva |
|---|---|---|
| **A · noticia con foto** | hay una foto fuerte | foto en navy arriba que se desarma en bytes; chip «PORTADA»; titular con contraste de pesos cerrado con la manzana; dos líneas de portada «+ IA»; pie con «Desliza» + mano Plastilina y la firma |
| **B · tipográfica** | un POV que pega solo, sin foto fuerte | muletilla en Guttery; titular entrada 300 + remate 800 en el acento; manzana en bytes con halo abajo a la derecha; dos líneas «+ IA» |
| **C · mosaico** | varias noticias del mismo peso | titular que las une; cuatro tarjetas con foto en navy y bytes, sección «+ IA» y POV en Bricolage 400 |

- [ ] **Rotación:** nunca dos semanas seguidas con la misma plantilla. La elige el contenido, no el gusto. El feed de
      nueve semanas está APROBADO.
- [ ] La cabecera va **sin** línea fina.
- [ ] «El micrófono se abre…» **no** va en la portada: abre la noticia 1.
- [ ] El pie de portada lleva «Desliza» con la mano Plastilina.

## 4. Carrusel de LinkedIn (1080×1350)

- **Lámina interior — APROBADA:** cabecera compacta; foto de la noticia en navy (176–626) que se desarma en bytes;
  chip «NOTICIA n» + medio y fecha; crédito de la foto; «SECCIÓN + IA · LA NOTICIA»; titular en Bricolage 300;
  «GLITCH DROP» con los puntos; POV en 800 condensado cerrado con la manzana; porqué en Poppins; avance n/8 en 8
  segmentos; «DESLIZA» + mano Plastilina.
- **Noticia 1 — ajuste del operador (aplicado):** la interior con una franja «EL MICRÓFONO SE ABRE» + puntos en el acento, entre la cabecera y
  la foto.
- **Variante con lente — PROPUESTA:** la lente de La órbita (token `lens`: anillo 1,9 px al 28 %, arco de 50° arriba a la
  izquierda y lejos de la cara, esfera 7,6 px, zoom 1,25, detalle a color y el resto en navy). Uso ocasional, cuando el
  POV trata de un detalle nítido de la foto. **La esfera ya está en la lente → el POV no cierra con la manzana.**
- **Contraportada — APROBADA:** «El micrófono se cierra» con contraste de pesos; los puntos se resuelven en la manzana;
  textura de manzana en bytes; fila Plastilina «SI TE SIRVIÓ» (guardar, compartir, recomendar, comentar); CTA en píldora
  blanca «Suscríbete a [wordmark]»; la misma cabecera; firma Efeonce 300 px + eslogan.
- Historia 9:16 y carrusel panorámico: exploración anterior, **no canon**.

## 5. Blog — PROPUESTA

- **Banners 16:9 (1920×1080)** con las plantillas A/B/C en horizontal, sin «Desliza». El archivo del blog recorta la
  destacada en cuadrado → hace falta una versión 1:1 (sirve la portada 4:5 recortada).
- **Maqueta del post** (blog claro): banner destacado → **apertura** navy «El micrófono se abre» + tesis + «Vamos.»
  (reemplaza la cita con fecha) → **la escaleta** (índice de las ocho, como en radio) → **banner interno de noticia**
  1600×900 (foto en navy + bytes + chip número/sección + wordmark; reemplaza la imagen cruda de la fuente) → **callout
  Glitch v2** → **banner de suscripción** a mitad del post → **vlog embebido** → **«El hilo de la semana»** (cierre navy)
  → **cierre** «El micrófono se cierra.» + «— El equipo editorial de Glitch» + íconos Plastilina versión papel.
- **Callout v2 vs v1:** el v1 de TASK-1337 está **publicado** (bloque `efeoncepro/glitch-drop`: panel claro navy 5 %,
  barra navy, wordmark 18 px). El v2 (pedido del operador: «más punch») es bloque navy con puntos + wordmark + «DROP»,
  remate Bricolage 800 con la manzana, porqué en Poppins y bytes en la esquina. Aplicarlo exige actualizar el bloque de
  WordPress; hasta la aprobación, **el v1 sigue vigente**.

## 6. Video — motion APROBADO (2026-09-27)

- **Vlog «Glitch en voz alta»:** tres de las ocho noticias en ~2:30. Un guion, dos formatos: 16:9 (YouTube y blog,
  miniatura 1280×720) y reel 9:16 (Instagram, TikTok, LinkedIn). Host a cámara con el micrófono en cuadro; se graba una
  vez en 4K horizontal con aire arriba y abajo y el reel sale del recorte vertical. Mnemónico y diseño sonoro al abrir y al
  cerrar: **aprobado, versión B** (2026-09-27; sólo de Glitch, §13); los `.mov` salen mudos y cada uno trae al lado su
  WAV con el mismo nombre. El motion (apertura y tarjeta final v2, kit, transiciones) y los tableros de video del canvas
  están **APROBADOS** (2026-09-27: «Si, el tuyo también está aprobado»).
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
  noticia arriba se desarma hacia el host, host reencuadrado abajo), Glitch Drop y última frase («el #N+1 sale el
  lunes.» + píldora «Sigue a Glitch»).
- **Tarjeta final** (16:9 y reel): centrada, espejo de la apertura (los puntos se resuelven en la manzana → el reel
  empalma en loop), un mensaje, una acción, firma; sin texturas finas (la compresión las ensucia).
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
- Dos esferas en la misma pieza o pantalla (manzana + esfera de la lente, o manzana + esfera de la órbita).
- El verde como texto, borde o separador sobre fondo claro.
- La falla sobre un rostro; un overlay sobre la cara del host o sobre la interfaz de la app.
- La órbita decorativa (la contraportada con órbita 8/8 se descartó: «no tiene nada que decir»).
- La URL como texto o la burbuja URL: en Glitch firma el logo (firma y burbuja nunca a la vez; la burbuja sólo reemplaza
  al logo si el logo ya está en la imagen).
- Descargar y resubir clips o imágenes de terceros: se embeben o se licencian.
- Presentar como reales los titulares y noticias de las maquetas: son de ejemplo.

## 8. Estado por pieza

| Pieza | Estado |
|---|---|
| Sistema de portada A/B/C + regla de rotación + feed de nueve semanas | **APROBADO** (2026-09-27) |
| Lámina interior y contraportada | **APROBADO** |
| Noticia 1 (franja «El micrófono se abre») | ajuste del operador, aplicado |
| Variante con lente | PROPUESTA |
| Blog: banners 16:9 (+1:1), maqueta del post, callout v2 | PROPUESTA (el callout v1 de TASK-1337 sigue publicado) |
| Vlog 16:9, kit de overlays del reel, tarjetas finales (y los tableros de video del canvas) | **APROBADO** (2026-09-27, con el motion) |
| La manzana como esfera y el verde como acento | **APROBADO** (2026-09-27); token de franquicia en AXIS pendiente (TASK-1922) |
| Línea de servicio Growth («Empower your Growth») | **APROBADO** (2026-09-27) |
| Historia 9:16, carrusel panorámico; teal y naranja como acento | EXPLORACIÓN (no canon) |
| Cinco glifos Plastilina nuevos | pasan `icons:check`; alta **APROBADA** (2026-09-27), publicación en AXIS pendiente (TASK-1922) |
| Guttery en video y web | licencia **confirmada por el operador** (2026-09-27) |
| Mnemónico del video | **APROBADO** como parte del diseño sonoro de Glitch, versión B (2026-09-27, §13) |
| Lower third del reel y del vlog | **APROBADO** (2026-09-27, §12) |
| Motion: apertura/tarjeta final v2, kit, transición de bytes entre piezas y entre escenas, héroe | **APROBADO** (2026-09-27, §12): «Si, el tuyo también está aprobado». La v1 queda como alternativa sin aprobar. Falta decidir a qué piezas va la transición de bytes |
| Subtítulos del video | pendiente (estilo de captions en Premiere, no hecho) |
| Diseño sonoro de Glitch (ronda 6: apertura, tarjeta final, kit, lower third, transiciones) | **APROBADO, versión B** (2026-09-27, §13): «La b me encanta más. Sus sonidos están aprobados». La A queda como alternativa descartada |
| Música de Glitch: tema B (intro, cortina, salida) y cama post-punk bajo la noticia | **APROBADO** (2026-09-27, §13.7): «Definitivamente la B es la decisión», «Me parecen bien todas», «Post-punk definitivamente». Pendientes: integración en el taller (con el motion del pre-roll de la intro por definir) y AXIS `#musica` |

Una PROPUESTA no se entrega como canon ni se publica: se muestra al operador para aprobar.

## 9. Flujo de composición — ACEPTADO (2026-09-27; hogar del movimiento: repo taller)

**Aceptado por el operador el 2026-09-27.** Hogar del movimiento **decidido**: el render de HyperFrames vive en el repo
taller privado `efeoncepro/efeonce-brand-workshop`, en `tools/glitch-motion/` (ADR
`docs/architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md`). AXIS define, Greenhouse compone los estáticos y guarda
el canon, Marketing Studio registra. Globe **no** es la ubicación (hibernado, CI en cada push, producto comercial): el
taller converge con Globe cuando se reactive. Seguimiento: cada edición se registra en Marketing Studio.

Objetivo: que ningún agente reinterprete. **Los agentes llenan datos; nunca eligen coordenadas ni plantilla a mano.**

1. **Canon humano en Greenhouse:** norma + ADR (arriba).
2. **Valores y contratos en AXIS:** página, JSON y guía (publicados 2026-09-27). Pendiente: tokens
   `glitchLine` en `@efeoncepro/axis-tokens` (color, tipo, cabecera, bytes, manzana, zonas seguras por formato, motion),
   assets en `@efeoncepro/axis-brand-assets` (wordmark claro/oscuro, manzana SVG, glifos Plastilina, Guttery si la
   licencia lo permite) y contrato `efeonce.glitch-line` 0.1.0 con reglas verificables (una esfera por pieza, verde
   nunca texto sobre claro, nada sobre la cara, rotación de plantillas, contraste).
3. **Composición con el Artifact Composer** (`src/lib/artifact-composer/**`, catálogos = dato, render en el Cloud Run
   Job `artifact-worker`): catálogo `glitch-edition` con portada A/B/C, interior, interior-noticia-1, interior-lente,
   contraportada, historia 9:16, banner blog A/B/C 16:9 (+1:1), banner interno 1600×900, portada de reel y miniatura.
   Entrada: un **manifiesto de edición** (número, fechas, tesis, 8 noticias con sección, titular, medio, foto + crédito
   + licencia, POV remate + porqué, foto fuerte sí/no, portada). El selector elige la portada por la regla de rotación
   (el autor no elige: `TemplateAuthorityError`). Salidas: PNG por lámina, PDF del carrusel, imágenes del blog. Gate
   visual a cero píxeles.
4. **Motion con HyperFrames** (skills `hyperframes`, `hyperframes-cli`, `motion-design-studio`): los overlays del reel
   y del 16:9 como composiciones del mismo catálogo, renderizadas por edición a video con alfa (ProRes 4444 `.mov` o
   WebM con alfa) para ponerlas sobre la toma; apertura y cierre (puntos → manzana) sincronizados con el mnemónico.
   Valores: `efeonceGraphicLine.motion` + spec de Glitch a registrar en AXIS. MOGRT de Premiere sólo si el editor
   necesita editar texto en su programa. **Dónde se produce:** en el taller, operado desde tu sesión de `greenhouse-eo`
   (el taller vive como hermano): `pnpm -C ../efeonce-brand-workshop --filter glitch-motion <doctor|render|kit|transiciones|heroe|test>` (§12).
   Nunca agregues HyperFrames ni scripts de video al `package.json` de Greenhouse, nunca copies esta skill al taller y
   nunca metas binarios (ProRes, WebM, PNG) ni rutas absolutas en git del taller: las corridas van a `corridas/` con
   `manifiesto.json` por sha256 y los binarios a GCS u OneDrive. El manifiesto de edición llega al taller como archivo
   JSON exportado por Greenhouse (TASK-1923); el taller no importa código de Greenhouse.
5. **Semana:** contenido (pipeline editorial PDR-020 / content factory) → manifiesto → el Composer renderiza todas las
   superficies → QA humano → publicación (LinkedIn vía Metricool, blog vía WordPress; ambas con confirmación humana) →
   grabación del host → el editor monta los overlays del mismo manifiesto.

**Encaje en el Artifact Composer (verificado 2026-09-27):** el carrusel NO necesita un «kind» nuevo en el motor. Un
catálogo es datos y los destinos ya existen: `pdf-merged` (carrusel de LinkedIn) y `png-set` (Instagram, post suelto,
banners; con `render.background: 'transparent'` para overlays con alfa). Como un catálogo tiene un solo `outputTarget`,
la propuesta son catálogos delgados sobre un mismo `templatesDir` (`glitch-carousel` PDF, `glitch-stills` y
`glitch-overlays` PNG) + extensión `glitch` del brand pack `axis` (Guttery) + selector de rotación + validadores. No va por
`brand-surfaces`. Detalle en el ADR, §«Encaje verificado en el Artifact Composer».

**Hoy 2 y 3 no están disponibles** (sin catálogo `glitch-edition`, sin tokens, sin contrato): no los cites como
existentes. **4 existe y está aprobado** (2026-09-27) en `tools/glitch-motion/` del taller, con la paleta y la manzana de
Glitch como propuesta espejada de AXIS Lab hasta TASK-1922: cómo operarlo en §12. El trabajo ya tiene tasks: (a) tokens, assets y contrato de Glitch en AXIS
→ TASK-1922 (incluye (e) el alta de los cinco glifos Plastilina, aprobada, y (f) la licencia de Guttery); (b) catálogos
de Glitch en el Composer → TASK-1923; (c) overlays HyperFrames + render con alfa → TASK-1924; (d) callout v2 en el
bloque de WordPress, sin task hasta que se apruebe.

**Resuelto por el operador el 2026-09-27:** manzana y verde aprobados; línea Growth; próxima edición #17; alta de los
cinco glifos aprobada; el diseño sonoro de Glitch (y con él el mnemónico): **versión B aprobada**, con sus cuatro
decisiones (§13.6); el motion de Glitch (apertura y tarjeta final v2, kit con el lower third, transiciones) con el vlog
16:9, el reel y las tarjetas finales: **aprobado**. **Pendientes del operador (no decidas por tu cuenta):** aprobación
de lente y blog; la licencia de Guttery (confirmada; registrar la referencia); y los pendientes del motion de §12.7. El flujo de composición ya está `Accepted` y
el hogar del movimiento ya está decidido (repo taller).

## 10. QA de una pieza de Glitch (además de [qa-checklist.md](qa-checklist.md))

- [ ] Es una pieza de Glitch (§0) y su estado (§8) permite entregarla como canon; si es PROPUESTA, va marcada así.
- [ ] Una sola esfera en la pieza o pantalla: manzana **o** lente, nunca las dos.
- [ ] El verde no aparece como texto, borde ni separador sobre claro; texto chico sobre oscuro en blanco o
      `#e6edf3`/`#9fb3c8`, no en el acento (regla de contraste de la línea madre).
- [ ] Los bytes salen del borde de la foto y no tocan ningún rostro.
- [ ] Portada: plantilla distinta a la de la semana anterior; cabecera sin línea fina; sin «El micrófono se abre…».
- [ ] Reel: nada en 0–220, desde 1500 ni desde x 940; la cara del host libre; subtítulos presentes.
- [ ] Firma: logo de Efeonce centrado abajo; sin burbuja URL ni URL como texto.
- [ ] Foto o clip de la fuente embebido o licenciado, con crédito.

## 11. Dónde se ve

- Canvas de diseño: https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS («Glitch en La órbita»): análisis, aplicaciones,
  punch #11, para evaluar, sistema de portada (APROBADO), blog y vlog, vlog en reel.
- AXIS Lab (publicado 2026-09-27): `/references/glitch/` y `/references/glitch.json` de
  `efeoncepro/axis-design-system`. Composición: TASK-1922 (AXIS), TASK-1923 (Composer), TASK-1924 (movimiento).
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
  (con `index.json`) y la misma sala de escucha, rondas 9, 10, 11 y 11b.

## 12. Editor agente — motion de Glitch (APROBADO, 2026-09-27)

> **Sólo Glitch.** Todo lo de esta sección es exclusivo de Glitch. **La transición de la manzana en bytes (entre piezas
> y entre escenas) es exclusiva de Glitch y nunca se usa en piezas de Efeonce ni de clientes.** Estado: **APROBADO** por
> el operador el 2026-09-27 («Si, el tuyo también está aprobado»): apertura y tarjeta final v2, kit de overlays,
> transición de bytes entre piezas y transición entre escenas (paquete y héroe). Los pendientes están en §12.7. Manual del editor humano (Premiere/AE):
> [`editar-video-glitch.md`](../../../../docs/manual-de-uso/creative/editar-video-glitch.md).

### 12.1 Motor y entorno

- Código en el taller `efeoncepro/efeonce-brand-workshop` → `tools/glitch-motion/` (paquete pnpm `glitch-motion`).
  Se opera **desde `greenhouse-eo`** con `pnpm -C ../efeonce-brand-workshop --filter glitch-motion …`.
- HyperFrames 0.6.69 (HTML + GSAP → video), GSAP 3.14.2 con CustomEase copiados al build (render sin red),
  `@efeoncepro/axis-tokens` 0.3.8 (curvas, sobrepasos, onda, pulso, letras), `@efeoncepro/axis-brand-assets` 0.3.4
  (logo de Efeonce). Paleta y manzana de Glitch: propuesta espejada de AXIS Lab hasta TASK-1922.
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
| Revisar el entorno antes de cualquier corrida | `doctor` |
| Apertura (4 s, 120 cuadros) + tarjeta final (3 s, 90 cuadros), reel y vlog, con verificación y manifiesto | `render -- --run <corrida> --edition 17 [--deliver "<carpeta>"]` |
| Kit de overlays (reel 1080×1920 y vlog 1920×1080) | `kit -- --run <corrida> --edition-file ejemplos/edicion-17.ejemplo.json --assets "<imágenes>" [--transition bytes] [--only a,b] [--skip-render] [--deliver "<carpeta>"]` |
| Cambiar una sola pieza (texto corregido) | `kit … --only <pieza>` (segundos; el kit completo ≈ 4 min) |
| Transición entre escenas (máscara + capa, orígenes centro/izquierda/marca, 0,5 s y 0,8 s) | `transiciones -- --run <corrida> [--a <imagen\|video>[@seg]] [--b …] [--deliver "<carpeta>"]` |
| Transición héroe para un corte puntual (1,2 s, 36 cuadros, opaca) | `heroe -- --run <corrida> --a <archivo>[@seg] --b <archivo>[@seg] [--origin centro\|izquierda\|marca] [--formats reel,vlog]` |
| Pruebas del paquete (registro de timelines, determinismo, sin red, datos de edición en pantalla) | `test` (7 pruebas) |

**Sonido:** `render`, `kit`, `transiciones` y `heroe` entregan el WAV junto a cada `.mov` (mismo nombre, duración
verificada) con `--sound b|a|off`: `b` por defecto (la aprobada), `a` la alternativa descartada (no se usa) y `off` sin
sonido. Los tiempos del sonido se leen del código del motion.

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
| `render` | apertura y tarjeta final; bucle exacto (último cuadro de la tarjeta = primero de la apertura) | 26/26 con sonido (22 del video, 11 por formato: códec, tamaño, 30 fps y cuadros, sin audio y alfa de entrada y salida por pieza, más el bucle con PSNR ∞) |
| `kit` | códec, cuadros, alfa de entrada y salida, y el WAV de cada pieza | 84/84 |
| `kit --transition bytes` (tarjeta y Drop) | ídem | 24/24 |
| `transiciones` | máscara + capa por formato, origen y duración, y su WAV | 84/84 |
| `heroe` | ídem | 8/8 |
| `test` | 7 pruebas del paquete | 7/7 |

- **Si una sola verificación falla, no se entrega**: se corrige y se vuelve a correr. Nunca entregues «casi verde» ni
  borres una verificación para que pase. Los cuatro comandos (`render`, `kit`, `transiciones`, `heroe`) se niegan
  solos a entregar con `--deliver` si hay una FALLA y salen con código distinto de cero.
- Además de la verificación mecánica, **mira cuadros reales** (golpes, bucle, que nada caiga sobre la cara del host).

### 12.5 Cómo entregar

1. Corre con `--deliver "<carpeta>"` apuntando a OneDrive `Alineación/5. Contenidos/09. Glitch/Motion/piloto/`, en la
   subcarpeta que toca: raíz (v1), `v2/`, `kit/{reel,vlog}/`, `kit-transicion-bytes/{reel,vlog}/`,
   `transiciones/{reel,vlog}/` (con su `LEEME.txt`), `transiciones/heroe/{reel,vlog}/`.
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
- **No decidas por el operador:** cadencia de grabación (hoy 30 fps) y prueba con los editores en una edición real,
  parámetro de ritmo (posible, no implementado), a qué piezas va la transición de bytes, subtítulos (estilo de captions
  en Premiere, no hecho), textos reales de la #17, formulario de autoservicio en Marketing Studio, excepción de rostros,
  subir valores a tokens (TASK-1922), archivo en GCS y push del repo taller siguen pendientes.
- **Si cambias tiempos del motion** (en `pieces.mjs`, `overlays.mjs` o `transitions.mjs` del taller), vuelve a correr
  el mismo comando del motion: el sonido lee los tiempos del código y sale de nuevo junto a cada `.mov` (§13.5).

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
> el tema completo** (intro, cortina, salida y cama bajo la noticia) el 2026-09-27. **Canon:** norma
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
- Los SFX del kit (cabecera, lower third, noticia…) van encima a su nivel del kit, sin atenuar (ya vienen suaves:
  −33/−34 LUFS).

**Lección medida: «arcade» = falta de cuerpo en los medios.** La intro aprobada tiene **45 %** de su energía entre
300 Hz y 3 kHz; la cama rechazada, **13 %** (sub + chisporroteo agudo); la cama post-punk aprobada, **38 %**. Causas:
maqueta sintetizada delgada + recorte de medios (EQ −6 dB a 700 Hz, −7 a 1,8 kHz, −3 a 3,2 kHz) para «dejar espacio a
la voz». Reglas: **nunca recortes los medios de la música de Glitch** para abrirle espacio a la voz (el espacio lo da
el **ducking**); **nunca síntesis pura** para la música de Glitch: instrumentos reales (grabación con IA desde texto o
re-grabación de maqueta). Control numérico (no reemplaza el oído del operador): medios 300 Hz–3 kHz ≥ ~35 % de la
energía.

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
git, scripts y LEEME en git; detalle en `audio-studio` → `efeonce/STUDIO_TOOLING.md`):

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
  sonido (§13.5), la música **no** se rehace corriendo el comando del motion: si algo cambia, es una ronda nueva que
  aprueba el operador.
- Verificación sin oído (el agente no escucha): ebur128 de cada máster, tempo 150,00 por autocorrelación de ataques,
  juntura del bucle sin clic, medios 38 %, sha256 de los 17 archivos descargando del bucket. Cómo suena lo aprueba el
  operador. Sala de escucha: https://claude.ai/artifact/UdRvppSXKJmb8fP2g37Ap9 → rondas 9, 10, 11 y 11b.

**Pendiente (no bloquea la aprobación):**

- **Integración en el taller** (`efeoncepro/efeonce-brand-workshop`, `tools/glitch-motion`): cada render entrega la
  música junto a su pieza **consumiendo los másteres del bucket por URL + sha256** (no los regenera): intro con su
  pre-roll, cortina 1,6 s antes de la cabecera siguiente, salida con la tarjeta final, cama bajo cada noticia. **El
  motion del pre-roll de la intro** (3,2 s vlog / 9,6 s podcast antes de la apertura) **está por definir** (en la
  ronda 8 los puntos quietos se marcaron como provisorios).
- **AXIS:** `/references/glitch/#musica`, campo `music` (URL + sha256) en `/references/glitch.json` y la mención en «La
  familia: Glitch» de `/references/sonic-brand/` (PR en `efeoncepro/axis-design-system`, lo abre la sesión principal).
  Hasta entonces, usa el bucket y su `index.json`.
- Push: sólo con señal del operador.
