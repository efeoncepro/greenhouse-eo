# La foto y la órbita — contrato de convergencia

> Verificado contra: axis-design-system@e26bd85 y greenhouse-eo@051660d73 — 2026-09-26.
> Canon fotográfico: `docs/operations/brand-photography/` (maestro v1.3, reserva de espacio, firma, colorimetría) y
> `.claude/rules/brand-photography.md`. Canon de la línea: `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md`
> (§1.3, §1.4, §1.5, §9, §10) y su [ADR](../../../../docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md).
> Código: tokens `efeonceGraphicLine.lens`, `spotlight`, `pieces`, `signature` (`packages/tokens/src/tokens.ts`),
> chequeos del contrato (`packages/contracts/src/graphic-line.ts`), recetas (`packages/graphic-line/src/recipes.ts`),
> adapter de Greenhouse (`scripts/creative/layout-compiler/graphic-line.mjs`) y `scripts/foto/build-prompt.mjs`.

**Mandato del operador (2026-09-26):** el lenguaje fotográfico de Efeonce existe y sigue existiendo; la línea gráfica
converge con él, hace sinergia y los dos se enriquecen. Esta referencia **suma** puentes, reglas conjuntas, briefs y QA.
**No cambia ninguna regla aprobada de ninguno de los dos sistemas.** Cuando dos reglas parecen chocar, queda escrito
como **«pendiente del operador»** (§9), no resuelto.

Marcas: **[vigente]** = ya está en el canon o en el código (se cita dónde) · **[propuesta]** = nueva, necesita la
aprobación del operador antes de tratarse como regla · **[cálculo]** = número derivado de los tokens y del código a la
fecha del sello; se recalcula si cambian.

---

## 1. Qué es de cada uno, y la idea que comparten

| | Lenguaje fotográfico | Línea gráfica «La órbita» |
|---|---|---|
| **Es dueño de** | la composición · la luz · el sujeto · los tres planos · el color en la luz y en los materiales · el registro (A documental, B puesta en escena, C la respuesta) · las palancas · las seis reservas de la toma · el lecho (primer plano desenfocado planeado) | un dispositivo de atención: **rodea**, **mide** o **enfoca** · la voz (pregunta con anillo, respuesta con esfera) · la regla de la firma (logo centrado; burbuja sólo con la marca en la imagen) · el eslogan de cierre · el movimiento de la órbita |
| **Se decide en** | la ficha de la toma (`pnpm foto:prompt`) y el plate | el intent del contrato `efeonce.graphic-line-orbit` o la receta del paquete |
| **Valores en** | tablas de `build-prompt.mjs`, bloques de `scripts/foto/bloques/`, docs de la carpeta | tokens `efeonceGraphicLine` de AXIS |
| **Por defecto** | toda pieza con foto tiene su composición completa | **no hay órbita**: se declara a propósito ([vigente] línea §1.3; maestro fotográfico, delta 2026-09-26) |

**La idea compartida es literal, no una metáfora:** los dos canon se llaman igual en un punto. El maestro fotográfico
es «El oficio a la vista» (la foto **muestra el trabajo**) y la línea tiene su §6 «Oficio a la vista» (el trabajo se ve
mientras ocurre: guías, marcas de corte, selección y cursores AXIS). La foto muestra la obra; la órbita **señala lo que
importa dentro de ella**. Cuando la órbita no señala algo que la foto ya muestra, sobra.

## 2. Vocabulario común (sólo donde el puente es real)

| Lenguaje fotográfico | Línea gráfica | ¿Puente real? |
|---|---|---|
| Sujeto dentro de un círculo del **55 % del lado corto con 15 % de aire** (línea §9, regla de la toma) | `lens.subjectCircleRatio: 0.55`, `lens.subjectAirRatio: 0.15` | **Sí, el mismo número.** Ojo con lo que la lente muestra de verdad por formato (§5.2) |
| Tres planos: primer plano desenfocado · **sujeto nítido** · fondo suave (maestro §4.2) | Lente: adentro a color y ampliada (`lens.zoom: 1.25`), afuera navy apagado (`lens.outside`) | **Sí.** El plano nítido de la foto tiene que caer dentro del círculo; el fondo suave queda afuera y se apaga |
| Luz con carácter **sobre el sujeto**; la reserva vive en la sombra que esa luz deja (design-studio, «la regla de la luz y la reserva») | Foco: penumbra afuera (`spotlight.outside.brightness: 0.32`), luz adentro (`inside.brightness: 1.12`) y la **lámpara** = arco y esfera sobre el anillo (`spotlight.lamp`, 265°→315°: arriba a la derecha) | **Sí.** El foco sólo refuerza una luz que la foto ya tiene sobre su sujeto |
| **Halo** | `orbit.halo` (radial, 13 % → 0) | **No sobre fotos.** La lente y el foco no llevan halo en el contrato ni en el adapter; la luz de una pieza con foto es la de la foto |
| **Lecho**: primer plano desenfocado planeado, 18 % (4:5) · 22 % (9:16) · 16 % (16:9) (reserva §1) | `signature`: centrada, anclada abajo, margen 0,09 del lado corto; en el adapter, zona `protect` de tipo `bed`, donde la firma **sí** puede posarse | **Sí.** La firma de la línea aterriza en el lecho de la foto (§5.3) |
| Registro A: **nadie mira al lente** (maestro, delta 2026-09-21) | «Registro documental: nadie mira al lente» (línea §9, regla de la toma para la lente) | **Sí, vigente en los dos** |
| Sin emblema legible cuando la pieza firma (firma §6: una sola marca protagonista) | «Sin emblema legible (el logo lo pone la pieza, no la ropa)» (línea §9) | **Sí, la misma regla vista desde los dos lados** |
| Azul `#0375DB` (la casa), naranja `#F55D01` (la idea), lima `#6EC207` (el resultado), **en la luz y los materiales** (colorimetría) | Acento de la línea por línea de servicio: Efeonce teal `#36C8BF` / `#0E8C82`; Wave `#0375DB`; Globe y Reach sus propios (línea §2 y §7) | **Parcial.** Son **capas distintas**: el color de la foto vive en la escena; el acento de la línea vive en el trazo. El teal no es un rol fotográfico y el naranja/lima no son acentos de la línea. Sólo coinciden en el azul de Wave. La selección colaborativa usa los colores de rol de la foto (firma §7) |
| «Hay mecanismo» (barra §2.3, criterio 3) | **Mide**: el arco es un dato real con fuente (línea §1.3; contrato: una medida exige fuente) · el foco «siempre va con su prueba» (§1.4) | **Sí, la misma exigencia de evidencia** |
| Selección colaborativa AXIS (~1 de 3 piezas, firma §7) | Oficio a la vista, herramienta 3 (línea §6), máximo dos por pieza además de la esfera | **Sí, el mismo dispositivo y el mismo contrato** (`efeonce.collaboration-selection` 0.3.0) |
| Formatos nativos 4:5 · 9:16 · 16:9 (`foto:prompt`; 1:1 sin validar) | Piezas de la lente: `post` y `campaign-post` 1080×1350 (4:5) · `story` 1080×1920 (9:16) · `wall` y `deck-cover` 1920×1080 (16:9) · `linkedin` 1200×627 | **Sí, salvo `linkedin`**, que no tiene formato nativo en `foto:prompt` (§9) |

## 3. Quién manda en cada tipo de pieza

Regla madre **[vigente]**: la foto conserva su composición; la órbita se suma sólo si hace uno de sus tres trabajos.
«Manda» significa quién decide la geometría de la pieza; el otro sistema se adapta sin romper sus reglas.

| Pieza | Manda | Qué hace el otro | Fuente |
|---|---|---|---|
| Post o anuncio con foto, sin dato ni foco (registros A, B o C) | **La foto** | Nada. Sin órbita; firma con el logo centrado | [vigente] línea §1.3; maestro delta 2026-09-26 |
| Pieza **muda** (sólo foto y firma, descanso del feed) | **La foto** | Nada | [vigente] README fotografía, «dos categorías de pieza» |
| Pieza con voz de la línea (pregunta + respuesta con esfera) sobre la foto | **La foto** | La voz ocupa la **reserva de texto** de la toma; ningún texto cruza una órbita | [vigente] voz línea §4; compositor CTA, «Voz de la línea gráfica sobre fotografía» (`graphicVoice: "efeonce"`, opt-in; en el árbol de trabajo al 2026-09-26, sin commit a la fecha del sello) |
| Pieza con un **dato real** junto a la foto (`measure`) | **La foto** | La órbita vive fuera del sujeto, de las reservas, del lecho y de la firma; exige fuente | [vigente] línea §1.3; chequeo `orbit-never-over-subject-or-reserves` |
| **Lente** (post de servicio, post de campaña, story, portada de deck, muro, banner) | **La órbita manda el layout; la foto manda el contenido del círculo** | La foto se briefea para la lente (§4) y se produce con el pipeline `foto:*` | [vigente] línea §1.5, §9, §10.1; ADR regla dura |
| **Foco** «Te hacemos visible» | **La órbita manda la luz de la pieza** | La foto trae su luz sobre el sujeto que quedará en el foco (§4.3) | [vigente] línea §1.4; [propuesta] alineación de la luz (§6) |
| Retrato con órbita (firma de correo, tarjeta de equipo, perfil) | **La órbita** (formato fijo `portrait`) | La foto es un retrato de la persona real, recortado en círculo | [vigente] línea §10.2; token `portrait`. El lenguaje fotográfico no define un registro para retratos de perfil: ver §9 |
| Oficina o merch **fotografiados** (láminas 4.8 y 4.9) | **La foto** (espacio, material y luz) | La línea es el objeto fotografiado: el arte plano es la referencia exacta y se compone, no se dibuja | [vigente] línea §10.8–§10.9; README fotografía, «componer lo sensible» |
| Deck: portada con lente (`deck-cover`) | **La órbita** | Igual que la lente | [vigente] línea §10.1 |
| Deck: progreso sobre una lámina con foto | **La foto** | El progreso es una órbita más: fuera de sujeto, reservas, lecho y firma | [vigente] línea §1.3 |
| Cierre de marca y animaciones del logo | **La órbita** | Sin foto: son marca sobre fondo de marca | [vigente] línea §10.1; norma de movimiento |

**Árbol corto:**

1. ¿La órbita **rodea, mide o enfoca** algo concreto de esta foto? No → pieza sin órbita. Fin.
2. ¿Enfoca? → **lente** (la decisión se ve ampliada) o **foco** (lo que importa sale de la penumbra, con prueba).
   Brief de la foto con §4.
3. ¿Mide? → hay dato con fuente y un lugar libre de sujeto, reservas, lecho y firma. Si no hay lugar, **se cambia la
   toma**, no se encima la órbita.
4. ¿Rodea? → un objeto o una palabra; nunca el logo ni una persona recortada. Un solo anillo alrededor del contenido.

## 4. Cómo briefear una foto que va a llevar la órbita

Se briefea **con los campos de `pnpm foto:prompt`**, nunca concatenando bloques a mano [vigente] (regla auto-load).
`foto:prompt` **no tiene hoy un campo para la lente ni para el foco**: el encuadre se escribe en la `escena`, como hizo el
banco de la lente del 2026-09-25 (`ai-generations/2026-09-25_banco-lente-orbita/fichas/_armar.mjs`). Un campo propio
queda como [propuesta] (§6, regla P9).

### 4.1 Tabla ficha ↔ necesidad de la órbita

| Necesidad de la pieza | Campo de la ficha | Qué escribir | Estado |
|---|---|---|---|
| Formato de la pieza final | `formato` | El **nativo** de la pieza: 4:5 para `post`/`campaign-post`, 9:16 para `story`, 16:9 para `wall`/`deck-cover`. **Nunca** se recorta un formato desde otro | [vigente] reserva §2, regla 4 |
| Un solo punto de interés, dentro del círculo | `escena` | La cláusula **LENS FRAMING** del banco (abajo), ajustada al círculo visible del formato (§5.2) | [vigente] como práctica del banco; la lente «exige una foto con un punto de interés claro» (línea §1.5) |
| Registro | `escena` | Registro A: «Nobody looks at the lens.» | [vigente] línea §9 |
| Sin emblema legible | `escena` / `identidad` | Prenda sin emblema a tamaño de consumo, o sin prenda de marca | [vigente] línea §9; firma §6 |
| Azul portador | `escena` | Un objeto del oficio, **nunca un muro de fondo** | [vigente] línea §9; colorimetría; maestro §6 |
| Azul y acento **dentro** del círculo | `escena` | Nombrar al portador azul y al acento cálido en el plano del sujeto | [propuesta] P2 (afuera, `lens.outside.grayscale: 1` los borra) |
| Acento cálido (naranja **o** lima) | `escena` | En una de cada dos fotos, nacido de la acción | [vigente] línea §9; colorimetría |
| Luz que alimenta el foco | `escena` | Luz dura sobre el sujeto que quedará en la luz del foco; si hay foco, entra desde arriba a la derecha | [vigente] luz sobre el sujeto (design-studio); [propuesta] P4 el lado de la lámpara |
| Tono del lecho para la firma | `lecho.objeto` + `lecho.tono` | Un objeto del oficio fuera de la luz, `DARK near black` si la firma puede terminar siendo la burbuja | [vigente] firma §2–§5.1; [pendiente] si la lente lo exige (§9, P-2) |
| Reserva de texto | `reservas.texto` (`muro`, `tinta`) | Sólo si la voz va **sobre la foto a color** (pieza sin lente). En la lente, ver §9, P-1 | [vigente] reserva §1; [pendiente] en la lente |
| Aire para una `measure` sobre la foto | `escena` | Nombrar la materia calma donde vivirá la órbita, igual que una reserva de texto | [propuesta] P8 |
| Selección colaborativa | `reservas.seleccion` | Sólo si la pieza **no** lleva lente ni foco | [vigente] el recurso; [propuesta] P6 la exclusión |

**La cláusula del banco, verbatim** (`_armar.mjs`, 2026-09-25):

```text
LENS FRAMING: everything essential sits inside a centred circle about 55% of the frame width, centred slightly
above the middle, with air around it; outside that circle the picture holds only calm secondary material.
Nobody looks at the lens.
```

Es **4:5**: «centred slightly above the middle» calza con `post` (centro al 44 % del alto) y `campaign-post` (37 %).
Para `story`, `wall`, `deck-cover` o `linkedin` el centro de la lente está en otro lugar (§5.2) y la cláusula se
reescribe con ese centro. Ejemplo de ficha completa en §8.

### 4.2 Reservas y lente: lo que ya se sabe

- **La lente no usa la reserva de texto de la toma en las recetas vigentes.** En `post`, `story` y `campaign-post` la
  pregunta y la respuesta van **debajo del anillo**, sobre la foto apagada; en `wall`, `deck-cover` y `linkedin`, al
  costado (`recipes.ts`, tabla `LENS`). Por eso el banco no pidió `reservas.texto`. Si eso basta o si la toma igual debe
  reservar, es la pendiente P-1 (§9).
- **La lente no puede llevar texto cruzando el anillo** [vigente]: la receta rechaza la pieza
  (`text-never-crosses-ring`) y el adapter la hace fallar con código 1.
- **La reserva del lecho sigue sirviendo:** el borde inferior de la pieza es donde el contrato ancla la firma (§5.3).

### 4.3 Foco: lo que la foto tiene que traer

- **Una sola luz** [vigente] (línea §1.4): la luz dura de la foto cae sobre el sujeto que quedará dentro del foco; nada
  brillante afuera del círculo, que la penumbra (`brightness 0.32`) apagaría a medias y leería como segunda luz.
- **El mecanismo al lado** [vigente] (§1.4: «visible» siempre con el mecanismo): la foto dentro del foco muestra el
  mecanismo —la pantalla con la respuesta, el informe, el dato—, no sólo a una persona. [propuesta] P7: el registro C
  «la respuesta a la vista» es el candidato natural para la foto del foco.
- **Nunca nombres reales de competidores** en el campo en penumbra [vigente] (§1.4): tampoco en pantallas o carteles de
  la foto.

## 5. Cómo la órbita lee la foto, sin romperla

### 5.1 Lo que el adapter protege (`bindings.protect`)

`pnpm creative:orbit:render -- --intent <intent.json> --bindings <bindings.json> --out-dir <dir>` recibe
`protect: [{ id, kind: 'subject' | 'reserve' | 'bed', x, y, w, h }]` en píxeles del lienzo. Lo que el código hace hoy
(`graphic-line.mjs`, `runAdapterChecks`) **[vigente]**:

| Zona | Órbita (`orbit`, `measure`, `progress`, `family-map`) | Lente y foco | Firma |
|---|---|---|---|
| `subject` | **Falla** si el anillo la **cruza** (una zona entera dentro del anillo pasa) | **Exentas**: rodean al sujeto por diseño | **Falla** si la caja de la firma la toca |
| `reserve` | **Falla** si el anillo la cruza | **Exentas** | **Falla** si la toca |
| `bed` | **No se chequea** | No se chequea | **Puede** posarse en el lecho |

Además: `text-never-crosses-ring` (textos declarados en `bindings.texts`), `signature-centered` (±1 px) y
`signature-min-contrast` (≥ 4,5:1 sobre los píxeles finales). **Salen `manual`** y los mira una persona:
`lens-subject-inside-circle` (que el sujeto quepa en la lente), `answer-period-part-of-text`,
`accent-arc-never-reads-as-data` y `measure-shows-value-and-source`. En `pnpm creative:layout`, la capa `graphic_line: { intent, protect }`
suma el campo del copy como una reserva más (`compiler.mjs`).

Dos brechas entre el canon y el chequeo, **sin cambiar ninguna regla** (el canon ya dice «nunca cruza el lecho»):
el lecho no se chequea contra la órbita, y la lente y el foco no se chequean contra reservas ni lecho. Ver P5 (§6).

**El adapter de Greenhouse pinta la lente, no el foco.** `paintGraphicLine` resuelve `orbit`, `measure`, `progress`,
`lens` y `url-bubble`; el foco hoy sale de la receta del paquete AXIS (`spotlightRecipe`, que además **exige** la línea
de prueba). **[vigente]**, leído del código.

### 5.2 Lo que la lente muestra de la foto, por formato **[cálculo]**

La lente amplía 1,25× alrededor de su centro (`lens.zoom`): del plate se ve un círculo de radio
`radio de la foto ÷ 1,25`. En las recetas, el radio de la foto es `pieces.lens.<formato>.ring.r ÷ (1 + orbit.ringAirRatio)`
(`ringAirRatio: 0.12`). Calculado de los tokens al sello de este documento:

| Receta (`lensRecipe`) | Lienzo | Centro de la lente (ancho, alto) | Diámetro del plate visible, en % del lado corto |
|---|---|---|---|
| `post` | 1080×1350 | 0,51 · 0,44 | **≈ 35 %** |
| `campaign-post` | 1080×1350 | 0,50 · 0,37 | ≈ 51 % |
| `story` | 1080×1920 | 0,39 · 0,40 | ≈ 47 % |
| `wall` | 1920×1080 | 0,60 · 0,39 | ≈ 52 % |
| `deck-cover` | 1920×1080 | 0,74 · 0,56 | ≈ 53 % |
| `linkedin` | 1200×627 | 0,72 · 0,45 | ≈ 56 % |
| Adapter Greenhouse, `region: 'upper-center'`, 1080×1350 | — | 0,50 · 0,36 | ≈ 48 % (radio `orbit.radiusRatio.portraitOfWidth` 0,3 del ancho) |

Lectura:

- **El centro de la lente es fijo por formato**: ni la receta ni el adapter mueven la lente hacia el sujeto
  (`subjectRegion` viaja en el manifest, pero el círculo sale de `pieces` o de la región). **El sujeto de la foto tiene
  que estar en ese centro.** Por eso la ficha de la lente se escribe para un formato concreto.
- **En `post` la lente muestra poco del plate** (≈ 35 % del lado corto): un sujeto que llena un círculo del 55 % queda
  cortado. Ver la pendiente P-3 (§9).
- Los números salen del código; si cambian `pieces`, `lens.zoom` o `ringAirRatio`, se recalculan. Nunca se copian a un
  script (regla dura 10 de la skill).

### 5.3 La firma aterriza en el lecho

- El token dice que los adapters de foto **eligen la altura de la firma midiendo el lecho, nunca la inventan**
  (`signature`, comentario del token) **[vigente]**. En el adapter eso es `bindings.signature.y`; sin él, la firma queda
  en la grilla (margen 0,09 del lado corto).
- **[cálculo]** Posición por defecto de la firma frente al lecho de la toma: en **4:5** la caja va de ≈ 89 % a 93 % del
  alto (lecho desde el 82 %); en **9:16**, de ≈ 92 % a 95 % (lecho desde el 78 %); en **16:9** (ancho 25 %), de
  ≈ 85 % a 91 %, **pegada al canto** de un lecho que empieza en el 84 %. En 16:9, medir el canto y pasar
  `signature.y` es obligatorio en la práctica: la regla del canto ya existe [vigente] (reserva, delta tramo 16:
  «la toma deja el canto del lecho por encima de la banda de la firma»).
- La burbuja como firma sólo con la marca en la imagen y sobre lecho **muy oscuro** [vigente] (firma §5.1): una foto que
  mostrará merch u oficina con el logo pide lecho `DARK near black`.

### 5.4 Lente y foco sobre la foto: los valores

| | Lente (`lens`) | Foco (`spotlight`) |
|---|---|---|
| Afuera | `grayscale 1`, `contrast 1.1`, `brightness 0.5`, multiplicado navy `#001a33` al 80 % | `grayscale 0.85`, `brightness 0.32`, multiplicado navy `#021a33` al 60 % |
| Adentro | la foto a color, ampliada `zoom 1.25` | `brightness 1.12`, `contrast 1.05`, borde suave desde el 78 % del radio |
| La órbita | anillo 1,4 px al 28 %, arco de 50°, esfera r 5,6 px por 794 px de ancho (`lens.anatomy`), arco arriba a la izquierda | anillo a 1,1× la luz al 22 %, lámpara = arco de 50° desde 265° con la esfera en la punta |

Consecuencia directa: **todo lo que la foto dice tiene que estar dentro del círculo**. Afuera queda textura navy.

## 6. Cómo se enriquecen (reglas de sinergia)

| # | Regla | Estado |
|---|---|---|
| V1 | **La lente pide una foto con un solo punto de interés claro**, así que la ficha de una foto para lente nace con la cláusula LENS FRAMING y una palanca que concentre (el banco usó `manos`, `variantes`, `sombra`, `quien-sostiene`, `cenital`, `escucha`, `proyeccion`, `ausencia`) | [vigente] línea §1.5; maestro delta 2026-09-26; banco 2026-09-25 |
| V2 | **La lente da una segunda vida a la foto documental** sin cambiarla: el banco de 8 tomas reemplazó a las tres fotos repetidas en lente, ventana, foco y prueba sin logo | [vigente] línea §9 |
| V3 | **La foto de la lente se produce con el pipeline** (`foto:prompt` → `foto:generar` → `foto:validar`), nunca con prompts a mano ni banco de imágenes | [vigente] línea §9; ADR regla dura |
| V4 | **Una sola marca protagonista**: la foto de la lente va sin emblema legible porque la pieza firma; si el logo ya está en la imagen, firma la burbuja sola | [vigente] línea §9 y §8.5; firma §5.1 y §6 |
| V5 | **La firma de la línea se posa en el lecho de la foto**, a la altura medida (`signature.y`), no a la de la grilla | [vigente] token `signature`; adapter; reserva, delta 2026-09-23 |
| V6 | **La luz de la foto va sobre el sujeto** y el foco la refuerza, no la inventa: una sola luz por pieza | [vigente] design-studio «la regla de la luz y la reserva»; línea §1.4 |
| V7 | **Formato nativo en los dos lados**: la foto se genera en el formato de la pieza de la órbita | [vigente] reserva §2, regla 4 |
| V8 | **El mecanismo como puente**: la barra fotográfica pide mecanismo y la órbita mide con fuente; ninguna de las dos acepta un dato inventado | [vigente] maestro §2.3; línea §1.3 |
| P1 | **Briefear la foto para el círculo visible de su formato** (§5.2), no sólo para el 55 %: centro de la lente del formato y diámetro visible | [propuesta] |
| P2 | **El azul portador y el acento cálido van dentro del círculo visible**: afuera, `lens.outside.grayscale: 1` los borra y la foto pierde su firma de color | [propuesta] (evidencia: token) |
| P3 | **Movimiento: el barrido del foco nace del lado de donde entra la luz de la foto y se posa donde esa luz cae.** El barrido ya es vigente («el foco barre la escena y se posa sobre el cliente», §1.4); lo nuevo es atarlo a la luz. Sigue las siete reglas de la norma de movimiento (un protagonista a la vez, llegar con golpe) | [propuesta] |
| P4 | **Con foco, la luz dura de la foto entra desde arriba a la derecha**, el lado de la lámpara (`spotlight.lamp` 265°→315°; `pieces.spotlight.photo` y `event`), para que lámpara y luz cuenten la misma historia. Se ajusta la foto, nunca el token | [propuesta] |
| P5 | **Cerrar las brechas del chequeo** sin cambiar la regla: la órbita contra `bed`; la lente y el foco contra `reserve` y `bed` (no contra `subject`); y medir `lens-subject-inside-circle` con la caja `subject` de `protect` contra el círculo visible | [propuesta] (cambio de código en AXIS y Greenhouse) |
| P6 | **Una sola señal de atención por pieza**: lente o foco, **o** selección colaborativa, no las dos. Base: el recorrido de la vista del operador (entra por el titular, baja por el eje, sale por la firma; design-studio, 2026-09-21) y «una sola luz» | [propuesta] |
| P7 | **La foto del foco sale del registro C** («la respuesta a la vista»): el foco promete visibilidad y el registro C pone en cuadro al actor del problema | [propuesta] |
| P8 | **Una `measure` sobre foto reserva su aire en la toma**, con materia nombrada, igual que una reserva de texto; si la toma no lo trae, se rehace la toma | [propuesta] |
| P9 | **Campo `reservas.lente` en `foto:prompt`** (formato de la pieza, centro y diámetro visible leídos de los tokens) que reemplace la cláusula escrita a mano en la escena | [propuesta] (cambio de código) |
| P10 | **La lente amplía 1,25×**: la revisión al 100 % del interior se hace sobre la pieza compuesta, no sólo sobre el plate, porque el zoom agranda manos, texto fantasma e inscripciones | [propuesta] |
| P11 | **Cadencia en el feed**: alternar piezas con lente y piezas sólo foto, igual que se alternan lechos claros y oscuros (firma §4.4), para que la lente no se vuelva plantilla | [propuesta] |
| P12 | **En una pieza con lente, pedir el lecho igual** aunque la firma quede sobre la foto apagada: la foto sigue sirviendo sola y el pie queda listo si la pieza cambia de receta. Depende de P-2 | [propuesta] |

## 7. Lo que no se hace (conjunto)

- **Órbita por defecto**, o una órbita que cruce sujeto, reserva de texto, lecho o firma [vigente].
- **Oscurecer o velar la foto** para que la órbita o el texto se lean, fuera del tratamiento propio de la lente y del
  foco [vigente] (reserva §2, regla 5; ADR: velo navy descartado). Si no da el contraste, se rehace la toma.
- **Poner en la lente una foto débil** (sin punto de interés) o con **emblema legible** [vigente].
- **Traer el azul con un muro o panel azul de fondo** «para la paleta» [vigente] (maestro §6; línea §9).
- **Pedirle al modelo de imagen que dibuje la órbita, el logo o la burbuja**: la órbita sale del contrato o del
  paquete, la marca del archivo oficial [vigente] (lo sensible se compone; línea regla dura 10 de la skill).
- **Recortar un plate de otro formato** para una lente [vigente].
- **Esfera o arco de la lente sobre la cara**: el arco va arriba a la izquierda, lejos de la cara [vigente] (§1.5, §10.1).
- **Dos luces**: el foco y otra luz dura fuera del círculo [vigente] (§1.4, «una sola luz por pieza»).
- **Texto que cruce un anillo**, cursores o etiquetas incluidos [vigente].
- **Halo sobre una foto**: la luz de una pieza con foto es la de la foto [vigente] (el contrato no da halo a lente ni foco).
- **Usar lente, foco u órbita en trabajo de clientes o en trendjacking con estética ajena** [vigente]: fuera del alcance
  de los dos sistemas.

## 8. QA conjunto (antes de mostrar o entregar)

**Sobre el plate limpio** (lenguaje fotográfico):

- [ ] `pnpm foto:validar <plate.png>` en verde para las reservas pedidas (y `--zona-texto` si la voz va sobre la foto).
- [ ] Sombras no azules (b\* del cuartil oscuro; lo mide `foto:validar`).
- [ ] Registro correcto: en la lente, **nadie mira al lente**.
- [ ] `pnpm foto:emblema <plate.png>` si hay prenda: **ningún emblema legible**.
- [ ] Un solo punto de interés, en el **centro de la lente de ese formato** y dentro del diámetro visible (§5.2).
- [ ] Azul portador y acento dentro de ese círculo (P2, mientras sea propuesta: se reporta, no bloquea).
- [ ] Con foco: la luz dura cae sobre el sujeto del foco y nada brilla afuera.
- [ ] Lecho: objeto del oficio fuera de la luz, tono declarado, canto por encima de la banda de la firma.

**Sobre la pieza compuesta** (línea gráfica):

- [ ] `pnpm creative:orbit:render …` sale 0 y `qa.json` dice `pass`: `text-never-crosses-ring`, `signature-centered`,
  `signature-min-contrast` (≥ 4,5:1) y `orbit-never-over-subject-or-reserves` con `protect` declarado (sujeto, reservas
  **y** lecho).
- [ ] `lens-subject-inside-circle` (sale `manual`): mirar que el sujeto entero quede dentro de la lente.
- [ ] Una sola órbita o lente en la pieza; si la foto ya tiene un anillo dibujado en la escena, ver P-4 (§9).
- [ ] Firma sobre la materia calma del lecho, no sobre su canto; logo o burbuja, nunca los dos.
- [ ] Interior de la lente al 100 % (el zoom 1,25× agranda defectos) y la pieza entera a **390 px** de ancho
  (maestro §2.3 criterio 5; línea §1.3, redes).
- [ ] Sin nombres reales de clientes ni de competidores en cuadro ni en cursores.
- [ ] Ninguna herramienta verde reemplaza mirar: un validador que pasa no valida el concepto (regla auto-load).

## 9. Pendientes del operador (conflictos aparentes, sin resolver)

| # | Las dos reglas | Por qué parecen chocar | Mientras tanto |
|---|---|---|---|
| **P-1** | Fotografía: «**NUNCA un scrim** … oscurecer la foto está prohibido» (reserva §2, regla 5), el texto vive en una reserva planeada en la toma. Línea: la lente pone la foto «en navy apagado» afuera del círculo (§1.5) y las recetas colocan pregunta y respuesta **sobre esa zona apagada** | En la lente el texto se lee gracias a un oscurecimiento de la foto, no a una reserva de la toma | Las recetas vigentes siguen como están; esta referencia **no** extiende ese uso a piezas sin lente. Decisión: ¿el tratamiento de la lente cuenta como la reserva del texto, o la toma debe reservar igual? |
| **P-2** | Fotografía: «la firma **SIEMPRE** necesita su lecho» (`foto:prompt`) y «la puesta en escena también debe tener lecho» (operador, 2026-09-21). Banco de la lente: «lecho y cursores no aplican porque la pieza firma fuera de la foto» (`LEEME.md`) | En la lente, la firma cae sobre la foto apagada; no está claro si el lecho es obligatorio | El banco igual pidió lecho en 7 de 8 fichas (la 5 es `sin-lecho` por cenital). P12 propone seguir pidiéndolo |
| **P-3** | Línea §9: el sujeto cabe en un círculo del **55 % del lado corto**. Receta `post`: la lente muestra ≈ **35 %** del lado corto del plate (§5.2) | Un sujeto que llena el 55 % queda cortado en `post` | Briefear por el círculo visible del formato (P1, propuesta). Decisión: ¿el 55 % es de la toma o de la lente, y se ajusta la toma o la pieza `post`? |
| **P-4** | Línea: «**una sola órbita por pieza**» (§1.3). Banco: la toma L3 tiene **un anillo dibujado a mano** en la pizarra (`sombra-orbita`) | Con lente, la pieza muestra dos anillos: el de la escena y el de la línea | Decisión: ¿un anillo dentro de la escena cuenta para «una órbita por pieza»? |
| **P-5** | Fotografía: capa gráfica sobre la foto **no aprobada** y la contradicción abierta del maestro §9 (el registro B la usa). Línea (canónica): la voz pregunta–respuesta y la lente se componen sobre fotos | Una pieza con lente y voz es una capa gráfica sobre foto | Esta referencia no la resuelve: la órbita sobre foto está permitida en sus casos por el delta 2026-09-26; el estado de la capa de texto sigue siendo la decisión abierta del maestro §9 |
| **P-6** | Fotografía: «**NUNCA** se recorta un formato desde otro» (reserva §2, regla 4). Línea: pieza de lente `linkedin` 1200×627, formato que `foto:prompt` no genera | O se agrega el formato a la tabla de `foto:prompt` o la pieza parte de un 16:9 recortado | Decisión: ¿formato nativo nuevo, o se acepta el recorte desde 16:9 para este banner? |
| **P-7** | Retrato con órbita (firma de correo, tarjetas): la línea fija la geometría (`portrait`). El lenguaje fotográfico no define un registro ni una barra para un retrato de perfil | No hay regla fotográfica que diga cómo se toma esa foto | Decisión: ¿el retrato de perfil entra al lenguaje fotográfico (con qué registro) o queda fuera de su alcance? |
| **P-8** | Fotografía: en 4:5 y 9:16, `foto:prompt` emite siempre «All heads and hands stay BELOW 36% of the frame height» (reserva §2, regla 2, pensada para la reserva de texto de arriba). Línea: la lente de 4:5 y 9:16 se centra entre el 36 % y el 44 % del alto (§5.2) | La mitad superior del círculo de la lente queda por encima de la línea del 36 %: una cabeza o una mano en el centro de la lente choca con el límite | El comando lo emite igual con o sin `reservas.texto`, y el banco convivió con eso. Decisión: ¿el límite aplica a una foto para lente sin reserva de texto? |
| **P-9** | Palancas que **llenan el cuadro** (`variantes`: «a REGULAR GRID that fills the frame»; `manos`: «the frame is filled by HANDS»). Línea §9: el sujeto cabe en un círculo del 55 % con aire, y afuera la foto se apaga | La palanca pide ocupar todo el cuadro y la lente pide concentrar lo esencial en un círculo | El banco usó las dos combinaciones (L1 y L2) y sus plates se aceptaron. Decisión: ¿qué palancas sirven para la lente, o la cláusula de encuadre manda sobre la palanca? |

## 10. Ejemplo completo: post de campaña con lente, de la ficha a la pieza

Pieza: **post de campaña 4:5 con lente** (`campaign-post`), línea Efeonce (Growth), superficie oscura. La órbita
manda el layout; la foto manda lo que hay dentro del círculo. Copy de ejemplo tomado del **banco de pares, que es
candidato y no está aprobado** (línea §4): «¿Quién decide?» / «Tú, con evidencia». El ejemplo es de método; nada de esto
aprueba ni publica una pieza.

**1. Decidir.** ¿Rodea, mide o enfoca? Enfoca la decisión → lente. Registro A. Formato nativo 4:5.

**2. Ficha** (`$RUN/fichas/lente-decision.json`). Centro de `campaign-post`: 0,50 del ancho y 0,37 del alto; diámetro
visible ≈ 51 % del lado corto (§5.2).

```json
{
  "id": "lente-decision",
  "formato": "4:5",
  "impacto": true,
  "palanca": "variantes",
  "eje": "the warmth of one small orange colour field on the label, and nothing else",
  "escena": "SCENE (packaging studio for a craft soda, late morning, the art director choosing the final label): TWELVE printed proofs of the same label pinned in a tidy grid on a pale warm-white plaster wall, each with the same deep ink-blue field and the same small orange field; at the instant of decision ONE proof in the centre of the grid is lifted off its pin by a hand entering from the right edge. Hard morning sun from a high window falls on the lifted proof. 50mm f/4, focus on the lifted proof. LENS FRAMING: the lifted proof, the hand and the ink-blue and orange fields all sit inside a circle about 50% of the frame width, centred on the horizontal middle and at about 37% of the frame height, with air around it; outside that circle the picture holds only calm secondary material. Nobody looks at the lens.",
  "lecho": { "objeto": "the back of a dark office chair at the lens, completely out of focus", "tono": "DARK near black" }
}
```

Escena y lecho vienen de la ficha L2 del banco (`fichas/L2-variantes-etiqueta.json`); sólo cambia la cláusula de
encuadre, reescrita para el centro y el diámetro de `campaign-post`. Sin `reservas.texto` (P-1). Esta ficha arma el
prompt sin errores (verificado con `foto:prompt` el 2026-09-26); el comando avisa que la pieza es «muda» porque no
declara reservas, y el prompt lleva el límite de cabezas y manos del 36 % (P-8) y la grilla que llena el cuadro de
`variantes` (P-9): son las dos tensiones abiertas de este tipo de toma, no errores de la ficha.

**3. Revisar el prompt, generar y validar.**

```bash
pnpm foto:doctor
pnpm foto:prompt $RUN/fichas/lente-decision.json              # revisar el prompt armado
pnpm foto:generar $RUN/fichas/lente-decision.json --quality high --out $RUN/plates
pnpm foto:validar $RUN/plates/lente-decision.png              # sombras no azules, lecho
```

Mirar el plate al 100 %: un solo punto de interés, en el centro de la lente; nadie mira al lente; ninguna marca de
terceros; azul y naranja dentro del círculo. Si falla, **se rehace la toma** (nunca se oscurece ni se recorta).

**4. Medir y declarar lo que la foto protege.** Sobre el plate, en píxeles del lienzo 1080×1350: la caja del sujeto
(`subject`) y la banda del lecho (`bed`, ≈ el 18 % inferior, con el canto medido). El texto (pregunta y respuesta) lo
mide y lo pinta quien llama, debajo del anillo.

**5. Componer con la órbita.** `intent.json`:

```json
{
  "canvas": { "width": 1080, "height": 1350, "line": "growth", "surface": "dark", "channel": "social" },
  "elements": [
    { "kind": "lens", "id": "lens", "photoId": "photo", "alt": "Una directora de arte levanta la etiqueta elegida entre doce pruebas", "region": "upper-center" },
    { "kind": "voice", "id": "voice", "questionId": "q", "answerId": "a", "answerText": "Tú, con evidencia" },
    { "kind": "signature", "id": "firma" }
  ]
}
```

`bindings.json` (valores de ejemplo; se reemplazan por los medidos):

```json
{
  "photos": { "photo": "../plates/lente-decision.png" },
  "texts": [
    { "id": "q", "x": 97, "y": 880, "w": 886, "h": 52, "content": "¿Quién decide?" },
    { "id": "a", "x": 97, "y": 940, "w": 760, "h": 150, "content": "Tú, con evidencia", "fontSize": 120, "baseline": 1060, "lastChar": "a" }
  ],
  "signature": { "y": 1196 },
  "protect": [
    { "id": "sujeto", "kind": "subject", "x": 380, "y": 330, "w": 320, "h": 330 },
    { "id": "lecho", "kind": "bed", "x": 0, "y": 1107, "w": 1080, "h": 243 }
  ]
}
```

```bash
pnpm creative:orbit:render -- --intent $RUN/orbita/intent.json --bindings $RUN/orbita/bindings.json --out-dir $RUN/orbita/out
```

Sale 1 si falla un chequeo; `out/qa.json` los lista. Este intent y estos bindings, corridos sobre un plate sintético
de 1152×1440 el 2026-09-26, salen 0 con la firma a 17,6:1: el ejemplo es ejecutable, no ilustrativo. Con el adapter de Greenhouse la lente de `upper-center` queda en
0,50 · 0,36 con ≈ 48 % de diámetro visible (§5.2): si se usa la receta del paquete en vez del adapter, los números son
los de `campaign-post`. Se briefea para el camino que se va a usar.

**6. QA.** La lista de §8 completa, en especial: `lens-subject-inside-circle` a ojo, la firma sobre la materia calma del
lecho, el interior de la lente al 100 % y la pieza a 390 px. La publicación y la pauta necesitan la autorización del
operador por separado.

---

**Mantener esta referencia:** todo cambio de `lens`, `spotlight`, `pieces`, `signature`, de los chequeos del adapter o
de `foto:prompt` que toque la lente, el foco o la firma sobre foto actualiza §2, §5 y §6, recalcula §5.2 y renueva el
sello. Cuando el operador decida una pendiente de §9 o apruebe una propuesta de §6, se mueve a [vigente] aquí, se
registra en `ledger.md` y se escribe en los dos canon (sección recíproca de cada uno).
