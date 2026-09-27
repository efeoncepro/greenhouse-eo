# Glitch — sub-línea gráfica (sólo para Glitch)

> Verificado contra: greenhouse-eo@bc6fedc28 — 2026-09-27 · inventario de la sesión «Integrar Glitch en la línea
> gráfica» (2026-09-27) · decisiones del operador del 2026-09-27 (Delta del ADR: manzana y verde aprobados, línea
> Growth, próxima edición #17, alta de los 5 glifos aprobada).
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

## 6. Video — PROPUESTA

- **Vlog «Glitch en voz alta»:** tres de las ocho noticias en ~2:30. Un guion, dos formatos: 16:9 (YouTube y blog,
  miniatura 1280×720) y reel 9:16 (Instagram, TikTok, LinkedIn). Host a cámara con el micrófono en cuadro; se graba una
  vez en 4K horizontal con aire arriba y abajo y el reel sale del recorte vertical. Mnemónico al abrir y al cerrar:
  **pendiente**, el operador pidió evaluarlo y aprobarlo en una evaluación dedicada; no uses ninguno como canon.
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

  Ocho piezas con fondo transparente: apertura, cabecera (noticia n/3 + wordmark), lower third (contenido **en
  definición con el operador**: no lo inventes), subtítulo, tarjeta de noticia, imagen de la fuente (plano dividido: la
  noticia arriba se desarma hacia el host, host reencuadrado abajo), Glitch Drop y última frase («el #N+1 sale el
  lunes.» + píldora «Sigue a Glitch»).
- **Tarjeta final** (16:9 y reel): centrada, espejo de la apertura (los puntos se resuelven en la manzana → el reel
  empalma en loop), un mensaje, una acción, firma; sin texturas finas (la compresión las ensucia).
- En el 16:9, la noticia y el Drop siguen como pantallas completas; se revisan con la lógica de overlays si el host
  está siempre en cámara.
- Toma de prueba del host: `ai-generations/2026-09-21_copiloto/plates/G-podcast-v5.png` (generada con IA, sólo prueba).

## 7. NUNCA

- La manzana, el verde Glitch, los bytes, Guttery o la cabecera «EDICIÓN #N» en una pieza de Efeonce.
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
| Vlog 16:9, kit de overlays del reel, tarjetas finales | PROPUESTA |
| La manzana como esfera y el verde como acento | **APROBADO** (2026-09-27); token de franquicia en AXIS pendiente (TASK-1922) |
| Línea de servicio Growth («Empower your Growth») | **APROBADO** (2026-09-27) |
| Historia 9:16, carrusel panorámico; teal y naranja como acento | EXPLORACIÓN (no canon) |
| Cinco glifos Plastilina nuevos | pasan `icons:check`; alta **APROBADA** (2026-09-27), publicación en AXIS pendiente (TASK-1922) |
| Guttery en video y web | licencia **confirmada por el operador** (2026-09-27) |
| Mnemónico del video | pendiente: evaluarlo y aprobarlo (evaluación dedicada) |
| Lower third del reel y del vlog | en definición con el operador |

Una PROPUESTA no se entrega como canon ni se publica: se muestra al operador para aprobar.

## 9. Flujo de composición — ACEPTADO (2026-09-27; hogar del movimiento abierto)

**Aceptado por el operador el 2026-09-27.** Hogar del movimiento abierto (recomendación: Globe produce, AXIS define,
Marketing Studio registra; ver el Delta del ADR). Seguimiento: cada edición se registra en Marketing Studio.

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
   necesita editar texto en su programa.
5. **Semana:** contenido (pipeline editorial PDR-020 / content factory) → manifiesto → el Composer renderiza todas las
   superficies → QA humano → publicación (LinkedIn vía Metricool, blog vía WordPress; ambas con confirmación humana) →
   grabación del host → el editor monta los overlays del mismo manifiesto.

**Encaje en el Artifact Composer (verificado 2026-09-27):** el carrusel NO necesita un «kind» nuevo en el motor. Un
catálogo es datos y los destinos ya existen: `pdf-merged` (carrusel de LinkedIn) y `png-set` (Instagram, post suelto,
banners; con `render.background: 'transparent'` para overlays con alfa). Como un catálogo tiene un solo `outputTarget`,
la propuesta son catálogos delgados sobre un mismo `templatesDir` (`glitch-carousel` PDF, `glitch-stills` y
`glitch-overlays` PNG) + extensión `glitch` del brand pack `axis` (Guttery) + selector de rotación + validadores. No va por
`brand-surfaces`. Detalle en el ADR, §«Encaje verificado en el Artifact Composer».

**Hoy nada de 2–4 está disponible** (sin catálogo `glitch-edition`, sin tokens, sin contrato, sin composiciones
HyperFrames). No los cites como existentes. El trabajo ya tiene tasks: (a) tokens, assets y contrato de Glitch en AXIS
→ TASK-1922 (incluye (e) el alta de los cinco glifos Plastilina, aprobada, y (f) la licencia de Guttery); (b) catálogos
de Glitch en el Composer → TASK-1923; (c) overlays HyperFrames + render con alfa → TASK-1924; (d) callout v2 en el
bloque de WordPress, sin task hasta que se apruebe.

**Resuelto por el operador el 2026-09-27:** manzana y verde aprobados; línea Growth; próxima edición #17; alta de los
cinco glifos aprobada. **Pendientes del operador (no decidas por tu cuenta):** aprobación de lente, blog, vlog 16:9,
reel y tarjetas finales; el mnemónico (evaluarlo y aprobarlo); el contenido del lower third (en definición con el
operador); la licencia de Guttery (confirmada; registrar la referencia); pasar el flujo de composición a ADR
`Accepted`.

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
