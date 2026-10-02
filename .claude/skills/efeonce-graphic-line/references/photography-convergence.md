# La foto y la órbita — contrato de convergencia

> Verificado contra: greenhouse-eo `develop` sobre `b0efd42a3` — 2026-10-02 (P-4 en el escenario del login, TASK-1964). Antes: axis-design-system@220fc23 y greenhouse-eo@e54a888c3 — 2026-09-26 (capa gráfica sobre la foto aprobada entera; banco y guía «El porqué» en AXIS). Antes: axis-design-system@e26bd85 y greenhouse-eo@051660d73 — 2026-09-26 (decisiones del operador D9 y
> D10 del 2026-09-26: reglas P1–P12 aprobadas y conflictos P-1 a P-9 resueltos). Ejemplo de §10 re-verificado ese día
> con `foto:prompt` y `creative:orbit:render`.
> Canon fotográfico: `docs/operations/brand-photography/` (maestro v1.3, reserva de espacio, firma, colorimetría) y
> `.claude/rules/brand-photography.md`. Canon de la línea: `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md`
> (§1.3, §1.4, §1.5, §9, §10) y su [ADR](../../../../docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md).
> Código: tokens `efeonceGraphicLine.lens`, `spotlight`, `pieces`, `signature` (`packages/tokens/src/tokens.ts`),
> chequeos del contrato (`packages/contracts/src/graphic-line.ts`), recetas (`packages/graphic-line/src/recipes.ts`),
> adapter de Greenhouse (`scripts/creative/layout-compiler/graphic-line.mjs`) y `scripts/foto/build-prompt.mjs`.

**Mandato del operador (2026-09-26):** el lenguaje fotográfico de Efeonce existe y sigue existiendo; la línea gráfica
converge con él, hace sinergia y los dos se enriquecen. Esta referencia **suma** puentes, reglas conjuntas, briefs y QA.
Las reglas conjuntas P1–P12 (§6) quedaron **aprobadas** y los conflictos P-1 a P-9 (§9) **resueltos** por el operador el
mismo 2026-09-26 (D9 y D10 del [registro](ledger.md)). Un choque nuevo entre los dos canon se escribe como pendiente del
operador; no se resuelve por cuenta propia.

Marcas: **[vigente]** = ya está en el canon o en el código (se cita dónde) · **[aprobada]** = regla conjunta aprobada
por el operador el 2026-09-26 (D9/D10) · **[código pendiente]** = aprobada, pero el comando o el chequeo todavía no la
aplica (task «foto:prompt y chequeos de la lente», sin ID) · **[cálculo]** = número derivado de los tokens y del código a
la fecha del sello; se recalcula si cambian.

---

> **Banco y guía [operador, 2026-09-26]:** las fotos aprobadas y el porqué de cada regla fotográfica, incluido el
> capítulo «La foto y La órbita», viven en [axis.efeonce.org/references/photography/why/](https://axis.efeonce.org/references/photography/why/)
> (`why.json` para agentes). Allí quedó escrito que cada canon es dueño de lo suyo y que la foto tiene que funcionar sola.

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
| Sujeto dentro de un círculo del **55 % con 15 % de aire** (línea §9, regla de la toma) | `lens.subjectCircleRatio: 0.55`, `lens.subjectAirRatio: 0.15` | **Sí, el mismo número**, medido sobre **el círculo visible de la lente** en ese formato, no sobre el lado corto del plate (§5.2): se ajusta la toma [aprobada, P-3] |
| Tres planos: primer plano desenfocado · **sujeto nítido** · fondo suave (maestro §4.2) | Lente: adentro a color y ampliada (`lens.zoom: 1.25`), afuera navy apagado (`lens.outside`) | **Sí.** El plano nítido de la foto tiene que caer dentro del círculo; el fondo suave queda afuera y se apaga |
| Luz con carácter **sobre el sujeto**; la reserva vive en la sombra que esa luz deja (design-studio, «la regla de la luz y la reserva») | Foco: penumbra afuera (`spotlight.outside.brightness: 0.32`), luz adentro (`inside.brightness: 1.12`) y la **lámpara** = arco y esfera sobre el anillo (`spotlight.lamp`, 265°→315°: arriba a la derecha) | **Sí.** El foco sólo refuerza una luz que la foto ya tiene sobre su sujeto |
| **Halo** | `orbit.halo` (radial, 13 % → 0) | **No sobre fotos.** La lente y el foco no llevan halo en el contrato ni en el adapter; la luz de una pieza con foto es la de la foto |
| **Lecho**: primer plano desenfocado planeado, 18 % (4:5) · 22 % (9:16) · 16 % (16:9) (reserva §1) | `signature`: centrada, anclada abajo, margen 0,09 del lado corto; en el adapter, zona `protect` de tipo `bed`, donde la firma **sí** puede posarse | **Sí.** La firma de la línea aterriza en el lecho de la foto (§5.3) |
| Registro A: **nadie mira al lente** (maestro, delta 2026-09-21) | «Registro documental: nadie mira al lente» (línea §9, regla de la toma para la lente) | **Sí, vigente en los dos** |
| Sin emblema legible cuando la pieza firma (firma §6: una sola marca protagonista) | «Sin emblema legible (el logo lo pone la pieza, no la ropa)» (línea §9) | **Sí, la misma regla vista desde los dos lados** |
| Azul `#0375DB` (la casa), naranja `#F55D01` (la idea), lima `#6EC207` (el resultado), **en la luz y los materiales** (colorimetría) | Acento de la línea por línea de servicio: Efeonce teal `#36C8BF` / `#0E8C82`; Wave `#0375DB`; Globe y Reach sus propios (línea §2 y §7) | **Parcial.** Son **capas distintas**: el color de la foto vive en la escena; el acento de la línea vive en el trazo. El teal no es un rol fotográfico y el naranja/lima no son acentos de la línea. Sólo coinciden en el azul de Wave. La selección colaborativa usa los colores de rol de la foto (firma §7) |
| «Hay mecanismo» (barra §2.3, criterio 3) | **Mide**: el arco es un dato real con fuente (línea §1.3; contrato: una medida exige fuente) · el foco «siempre va con su prueba» (§1.4) | **Sí, la misma exigencia de evidencia** |
| Selección colaborativa AXIS (~1 de 3 piezas, firma §7) | Oficio a la vista, herramienta 3 (línea §6), máximo dos por pieza además de la esfera | **Sí, el mismo dispositivo y el mismo contrato** (`efeonce.collaboration-selection` 0.3.0) |
| Formatos nativos 4:5 · 9:16 · 16:9 (`foto:prompt`; 1:1 sin validar) | Piezas de la lente: `post` y `campaign-post` 1080×1350 (4:5) · `story` 1080×1920 (9:16) · `wall` y `deck-cover` 1920×1080 (16:9) · `linkedin` 1200×627 | **Sí.** `linkedin` tendrá su formato nativo 1200×627 en `foto:prompt` y nunca se recorta de un 16:9 [aprobada, P-6; código pendiente] |

## 3. Quién manda en cada tipo de pieza

Regla madre **[vigente]**: la foto conserva su composición; la órbita se suma sólo si hace uno de sus tres trabajos.
«Manda» significa quién decide la geometría de la pieza; el otro sistema se adapta sin romper sus reglas.

| Pieza | Manda | Qué hace el otro | Fuente |
|---|---|---|---|
| Post o anuncio con foto, sin dato ni foco (registros A, B o C) | **La foto** | Nada. Sin órbita; firma con el logo centrado | [vigente] línea §1.3; maestro delta 2026-09-26 |
| Pieza **muda** (sólo foto y firma, descanso del feed) | **La foto** | Nada | [vigente] README fotografía, «dos categorías de pieza» |
| Pieza con voz de la línea (pregunta + respuesta con esfera) sobre la foto | **La foto** | La voz ocupa la **reserva de texto** de la toma; ningún texto cruza una órbita. La capa gráfica sobre foto está aprobada sólo en los casos de la línea: voz, lente y medida con fuente [aprobada, P-5] | [vigente] voz línea §4; compositor CTA, «Voz de la línea gráfica sobre fotografía» (`graphicVoice: "efeonce"`, opt-in; en el árbol de trabajo al 2026-09-26, sin commit a la fecha del sello) |
| Pieza con un **dato real** junto a la foto (`measure`) | **La foto** | La órbita vive fuera del sujeto, de las reservas, del lecho y de la firma; exige fuente | [vigente] línea §1.3; chequeo `orbit-never-over-subject-or-reserves` |
| **Lente** (post de servicio, post de campaña, story, portada de deck, muro, banner) | **La órbita manda el layout; la foto manda el contenido del círculo** | La foto se briefea para la lente (§4) y se produce con el pipeline `foto:*` | [vigente] línea §1.5, §9, §10.1; ADR regla dura |
| **Foco** «Te hacemos visible» | **La órbita manda la luz de la pieza** | La foto trae su luz sobre el sujeto que quedará en el foco (§4.3) | [vigente] línea §1.4; [aprobada] alineación de la luz (P3, P4) |
| Retrato con órbita (firma de correo, tarjeta de equipo, perfil) | **La órbita** (formato fijo `portrait`) | La foto es un retrato de la persona real, recortado en círculo | [vigente] línea §10.2; token `portrait`. [aprobada, P-7] el retrato de perfil es **categoría propia** del lenguaje fotográfico y **puede mirar a cámara**; su barra está por escribir en el canon fotográfico |
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
banco de la lente del 2026-09-25 (`ai-generations/2026-09-25_banco-lente-orbita/fichas/_armar.mjs`, en git; sus
plates, con `pnpm ai-gen:pull` si faltan). El campo propio
`reservas.lente` está aprobado (§6, P9) y es [código pendiente].

### 4.1 Tabla ficha ↔ necesidad de la órbita

| Necesidad de la pieza | Campo de la ficha | Qué escribir | Estado |
|---|---|---|---|
| Formato de la pieza final | `formato` | El **nativo** de la pieza: 4:5 para `post`/`campaign-post`, 9:16 para `story`, 16:9 para `wall`/`deck-cover`, 1200×627 para `linkedin`. **Nunca** se recorta un formato desde otro | [vigente] reserva §2, regla 4; `linkedin` [aprobada, P-6; código pendiente: hoy `foto:prompt` no lo genera] |
| Un solo punto de interés, dentro del círculo | `escena` | La cláusula **LENS FRAMING** del banco (abajo), ajustada al círculo visible del formato (§5.2) | [vigente] como práctica del banco; la lente «exige una foto con un punto de interés claro» (línea §1.5); [aprobada] P1, P-3 |
| Palanca | `palanca` | Una que **concentre** (`sombra`, `quien-sostiene`, `cenital`, `escucha`, `proyeccion`, `ausencia`…). Las que llenan el cuadro (`manos`, `variantes`) sólo en piezas sólo foto: en la lente manda el encuadre | [aprobada, P-9] |
| Sin otro anillo en la escena | `escena` | Nada circular dibujado o impreso que se lea como órbita (un anillo en una pizarra, un aro); si la toma lo trae, se pide otro plate | [aprobada, P-4] |
| Registro | `escena` | Registro A: «Nobody looks at the lens.» | [vigente] línea §9 |
| Sin emblema legible | `escena` / `identidad` | Prenda sin emblema a tamaño de consumo, o sin prenda de marca | [vigente] línea §9; firma §6 |
| Azul portador | `escena` | Un objeto del oficio, **nunca un muro de fondo** | [vigente] línea §9; colorimetría; maestro §6 |
| Azul y acento **dentro** del círculo | `escena` | Nombrar al portador azul y al acento cálido en el plano del sujeto | [aprobada] P2 (afuera, `lens.outside.grayscale: 1` los borra) |
| Acento cálido (naranja **o** lima) | `escena` | En una de cada dos fotos, nacido de la acción | [vigente] línea §9; colorimetría |
| Luz que alimenta el foco | `escena` | Luz dura sobre el sujeto que quedará en la luz del foco; si hay foco, entra desde arriba a la derecha | [vigente] luz sobre el sujeto (design-studio); [aprobada] P4 el lado de la lámpara |
| Tono del lecho para la firma | `lecho.objeto` + `lecho.tono` | Un objeto del oficio fuera de la luz, `DARK near black` si la firma puede terminar siendo la burbuja. **También en la lente**: se pide igual | [vigente] firma §2–§5.1; [aprobada] P-2 = P12 |
| Reserva de texto | `reservas.texto` (`muro`, `tinta`) | Sólo si la voz va **sobre la foto a color** (pieza sin lente). En la lente **no se pide**: el oscurecimiento de afuera del círculo es la reserva del texto | [vigente] reserva §1; [aprobada] P-1 en la lente |
| Aire para una `measure` sobre la foto | `escena` | Nombrar la materia calma donde vivirá la órbita, igual que una reserva de texto | [aprobada] P8 |
| Selección colaborativa | `reservas.seleccion` | Sólo si la pieza **no** lleva lente ni foco | [vigente] el recurso; [aprobada] P6 la exclusión |

**La cláusula del banco, verbatim** (`_armar.mjs`, 2026-09-25):

```text
LENS FRAMING: everything essential sits inside a centred circle about 55% of the frame width, centred slightly
above the middle, with air around it; outside that circle the picture holds only calm secondary material.
Nobody looks at the lens.
```

Es **4:5**: «centred slightly above the middle» calza con `post` (centro al 44 % del alto) y `campaign-post` (37 %).
Para `story`, `wall`, `deck-cover` o `linkedin` el centro de la lente está en otro lugar (§5.2) y la cláusula se
reescribe con ese centro, y el «55 % of the frame width» se reemplaza por el diámetro visible del formato (P1, P-3).
Ejemplo de ficha completa en §10.

### 4.2 Reservas y lente: lo que ya se sabe

- **La lente no usa la reserva de texto de la toma.** En `post`, `story` y `campaign-post` la pregunta y la respuesta
  van **debajo del anillo**, sobre la foto apagada; en `wall`, `deck-cover` y `linkedin`, al costado (`recipes.ts`,
  tabla `LENS`). **El oscurecimiento de la lente cuenta como la reserva del texto** [aprobada, P-1]: la toma para lente
  no pide `reservas.texto`. El «nunca scrim» del lenguaje fotográfico sigue intacto en toda pieza sin lente.
- **La lente no puede llevar texto cruzando el anillo** [vigente]: la receta rechaza la pieza
  (`text-never-crosses-ring`) y el adapter la hace fallar con código 1.
- **La reserva del lecho sigue sirviendo:** el borde inferior de la pieza es donde el contrato ancla la firma (§5.3).

### 4.3 Foco: lo que la foto tiene que traer

- **Una sola luz** [vigente] (línea §1.4): la luz dura de la foto cae sobre el sujeto que quedará dentro del foco; nada
  brillante afuera del círculo, que la penumbra (`brightness 0.32`) apagaría a medias y leería como segunda luz.
- **El mecanismo al lado** [vigente] (§1.4: «visible» siempre con el mecanismo): la foto dentro del foco muestra el
  mecanismo —la pantalla con la respuesta, el informe, el dato—, no sólo a una persona. [aprobada] P7: la foto del foco
  sale del registro C, «la respuesta a la vista».
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
el lecho no se chequea contra la órbita, y la lente y el foco no se chequean contra reservas ni lecho. P5 las cierra:
aprobada, [código pendiente] (task «foto:prompt y chequeos de la lente»). Hasta que llegue, se revisan a ojo.

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
- **En `post` la lente muestra poco del plate** (≈ 35 % del lado corto): un sujeto que llena un círculo del 55 % **del
  plate** queda cortado. Por eso el 55 % se mide sobre el círculo visible de la lente y **se ajusta la toma**, no la
  pieza `post` [aprobada, P-3].
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

P1–P12 aprobadas por el operador el 2026-09-26 (D9). P5 y P9 necesitan código: task «foto:prompt y chequeos de la
lente» (sin ID todavía); mientras tanto se aplican a mano.

| # | Regla | Estado |
|---|---|---|
| V1 | **La lente pide una foto con un solo punto de interés claro**, así que la ficha de una foto para lente nace con la cláusula LENS FRAMING y una palanca que concentre (el banco usó `sombra`, `quien-sostiene`, `cenital`, `escucha`, `proyeccion`, `ausencia`; también `manos` y `variantes`, que llenan el cuadro y desde el 2026-09-26 quedan sólo para piezas sólo foto, P-9) | [vigente] línea §1.5; maestro delta 2026-09-26; banco 2026-09-25 |
| V2 | **La lente da una segunda vida a la foto documental** sin cambiarla: el banco de 8 tomas reemplazó a las tres fotos repetidas en lente, ventana, foco y prueba sin logo | [vigente] línea §9 |
| V3 | **La foto de la lente se produce con el pipeline** (`foto:prompt` → `foto:generar` → `foto:validar`), nunca con prompts a mano ni banco de imágenes | [vigente] línea §9; ADR regla dura |
| V4 | **Una sola marca protagonista**: la foto de la lente va sin emblema legible porque la pieza firma; si el logo ya está en la imagen, firma la burbuja sola | [vigente] línea §9 y §8.5; firma §5.1 y §6 |
| V5 | **La firma de la línea se posa en el lecho de la foto**, a la altura medida (`signature.y`), no a la de la grilla | [vigente] token `signature`; adapter; reserva, delta 2026-09-23 |
| V6 | **La luz de la foto va sobre el sujeto** y el foco la refuerza, no la inventa: una sola luz por pieza | [vigente] design-studio «la regla de la luz y la reserva»; línea §1.4 |
| V7 | **Formato nativo en los dos lados**: la foto se genera en el formato de la pieza de la órbita | [vigente] reserva §2, regla 4 |
| V8 | **El mecanismo como puente**: la barra fotográfica pide mecanismo y la órbita mide con fuente; ninguna de las dos acepta un dato inventado | [vigente] maestro §2.3; línea §1.3 |
| P1 | **Briefear la foto para el círculo visible de su formato** (§5.2), no sólo para el 55 %: centro de la lente del formato y diámetro visible | [aprobada] |
| P2 | **El azul portador y el acento cálido van dentro del círculo visible**: afuera, `lens.outside.grayscale: 1` los borra y la foto pierde su firma de color | [aprobada] (evidencia: token) |
| P3 | **Movimiento: el barrido del foco nace del lado de donde entra la luz de la foto y se posa donde esa luz cae.** El barrido ya es vigente («el foco barre la escena y se posa sobre el cliente», §1.4); lo nuevo es atarlo a la luz. Sigue las siete reglas de la norma de movimiento (un protagonista a la vez, llegar con golpe) | [aprobada] |
| P4 | **Con foco, la luz dura de la foto entra desde arriba a la derecha**, el lado de la lámpara (`spotlight.lamp` 265°→315°; `pieces.spotlight.photo` y `event`), para que lámpara y luz cuenten la misma historia. Se ajusta la foto, nunca el token | [aprobada] |
| P5 | **Cerrar las brechas del chequeo** sin cambiar la regla: la órbita contra `bed`; la lente y el foco contra `reserve` y `bed` (no contra `subject`); y medir `lens-subject-inside-circle` con la caja `subject` de `protect` contra el círculo visible | [aprobada] [código pendiente] (AXIS y Greenhouse; task «foto:prompt y chequeos de la lente», sin ID) |
| P6 | **Una sola señal de atención por pieza**: lente o foco, **o** selección colaborativa, no las dos. Base: el recorrido de la vista del operador (entra por el titular, baja por el eje, sale por la firma; design-studio, 2026-09-21) y «una sola luz» | [aprobada] |
| P7 | **La foto del foco sale del registro C** («la respuesta a la vista»): el foco promete visibilidad y el registro C pone en cuadro al actor del problema | [aprobada] |
| P8 | **Una `measure` sobre foto reserva su aire en la toma**, con materia nombrada, igual que una reserva de texto; si la toma no lo trae, se rehace la toma | [aprobada] |
| P9 | **Campo `reservas.lente` en `foto:prompt`** (formato de la pieza, centro y diámetro visible leídos de los tokens) que reemplace la cláusula escrita a mano en la escena | [aprobada] [código pendiente] (misma task) |
| P10 | **La lente amplía 1,25×**: la revisión al 100 % del interior se hace sobre la pieza compuesta, no sólo sobre el plate, porque el zoom agranda manos, texto fantasma e inscripciones | [aprobada] |
| P11 | **Cadencia en el feed**: alternar piezas con lente y piezas sólo foto, igual que se alternan lechos claros y oscuros (firma §4.4), para que la lente no se vuelva plantilla | [aprobada] |
| P12 | **En una pieza con lente, pedir el lecho igual** aunque la firma quede sobre la foto apagada: la foto sigue sirviendo sola y el pie queda listo si la pieza cambia de receta (= P-2) | [aprobada] |

## 7. Lo que no se hace (conjunto)

- **Órbita por defecto**, o una órbita que cruce sujeto, reserva de texto, lecho o firma [vigente].
- **Oscurecer o velar la foto** para que la órbita o el texto se lean, fuera del tratamiento propio de la lente y del
  foco [vigente] (reserva §2, regla 5; ADR: velo navy descartado). Si no da el contraste, se rehace la toma.
- **Poner en la lente una foto débil** (sin punto de interés) o con **emblema legible** [vigente].
- **Traer el azul con un muro o panel azul de fondo** «para la paleta» [vigente] (maestro §6; línea §9).
- **Pedirle al modelo de imagen que dibuje la órbita, el logo o la burbuja**: la órbita sale del contrato o del
  paquete, la marca del archivo oficial [vigente] (lo sensible se compone; línea regla dura 10 de la skill).
- **Recortar un plate de otro formato** para una lente [vigente], tampoco para `linkedin` 1200×627 (P-6).
- **Un anillo dentro de la escena** en una pieza con órbita: cuenta como la órbita de la pieza; se pide otro plate
  [aprobada, P-4].
- **Una palanca que llena el cuadro** (`manos`, `variantes`) en una foto para lente [aprobada, P-9].
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
- [ ] Azul portador y acento dentro de ese círculo (P2).
- [ ] Ningún anillo dibujado o impreso en la escena (P-4) y palanca que concentra, no una que llena el cuadro (P-9).
- [ ] Con foco: la luz dura cae sobre el sujeto del foco y nada brilla afuera.
- [ ] Lecho: objeto del oficio fuera de la luz, tono declarado, canto por encima de la banda de la firma.

**Sobre la pieza compuesta** (línea gráfica):

- [ ] `pnpm creative:orbit:render …` sale 0 y `qa.json` dice `pass`: `text-never-crosses-ring`, `signature-centered`,
  `signature-min-contrast` (≥ 4,5:1) y `orbit-never-over-subject-or-reserves` con `protect` declarado (sujeto, reservas
  **y** lecho).
- [ ] `lens-subject-inside-circle` (sale `manual`): mirar que el sujeto entero quede dentro de la lente.
- [ ] Una sola órbita o lente en la pieza; un anillo dibujado en la escena cuenta como órbita: otro plate (P-4).
- [ ] Firma sobre la materia calma del lecho, no sobre su canto; logo o burbuja, nunca los dos.
- [ ] Interior de la lente al 100 % (el zoom 1,25× agranda defectos) y la pieza entera a **390 px** de ancho
  (maestro §2.3 criterio 5; línea §1.3, redes).
- [ ] Sin nombres reales de clientes ni de competidores en cuadro ni en cursores.
- [ ] Ninguna herramienta verde reemplaza mirar: un validador que pasa no valida el concepto (regla auto-load).

## 9. Conflictos entre los dos canon — resueltos por el operador (2026-09-26, D10)

| # | Las dos reglas | Decisión | Qué cambia en la práctica |
|---|---|---|---|
| **P-1** | Fotografía: «**NUNCA un scrim** … oscurecer la foto está prohibido» (reserva §2, regla 5). Línea: la lente pone la foto «en navy apagado» afuera del círculo y las recetas colocan pregunta y respuesta sobre esa zona | **El oscurecimiento de la lente cuenta como la reserva del texto.** El «nunca scrim» sigue en toda pieza sin lente | La toma para lente no pide `reservas.texto`; en una pieza sin lente, el texto sigue viviendo en la reserva de la toma |
| **P-2** | Fotografía: «la firma **SIEMPRE** necesita su lecho». Banco de la lente: «lecho y cursores no aplican» (`LEEME.md`) | **Se pide el lecho igual** (= P12) | Toda ficha para lente declara `lecho` (salvo una toma que no lo admita, como la cenital del banco, que se justifica) |
| **P-3** | Línea §9: el sujeto cabe en un círculo del 55 %. Receta `post`: la lente muestra ≈ 35 % del lado corto del plate (§5.2) | **El 55 % es del círculo visible de la lente**; se ajusta la toma, no la pieza | Se briefea por el centro y el diámetro visible del formato (P1, §5.2) |
| **P-4** | Línea: «una sola órbita por pieza». Banco: la toma L3 trae un anillo dibujado a mano en la pizarra | **Un anillo dentro de la escena cuenta como órbita** | Esa toma no sirve para una pieza con órbita: se pide otro plate |
| **P-5** | Fotografía: capa gráfica sobre la foto no aprobada (maestro §9). Línea: la voz y la lente se componen sobre fotos | **La capa gráfica sobre foto está aprobada sólo en los casos de la línea**: voz (pregunta y respuesta), lente y medida con fuente | **Ampliado el mismo día (operador, 2026-09-26): la capa gráfica sobre foto queda aprobada también fuera de esos casos** (maestro §9) |
| **P-6** | Fotografía: «NUNCA se recorta un formato desde otro». Línea: pieza `linkedin` 1200×627, que `foto:prompt` no genera | **Formato nativo 1200×627 en `foto:prompt`**, nunca recortado de 16:9 | [código pendiente] (task «foto:prompt y chequeos de la lente»). Hasta que llegue, la lente `linkedin` no tiene camino fotográfico canónico |
| **P-7** | La línea fija la geometría del retrato (`portrait`); el lenguaje fotográfico no define un registro para el retrato de perfil | **El retrato de perfil es categoría propia del lenguaje fotográfico**; se permite mirar a cámara | Su barra está por escribir en el canon fotográfico; mientras tanto, retrato real de la persona, sin emblema legible |
| **P-8** | `foto:prompt` emite siempre «All heads and hands stay BELOW 36% of the frame height» en 4:5 y 9:16. La lente se centra entre el 36 % y el 44 % del alto | **El límite del 36 % sólo aplica con reserva de texto** | [código pendiente] (misma task). Hasta que llegue, el comando lo sigue emitiendo en toda ficha 4:5 y 9:16: en una ficha para lente, esa línea del prompt contradice la decisión y hay que tenerlo presente al mirar el plate |
| **P-9** | Palancas que **llenan el cuadro** (`variantes`, `manos`). Línea: lo esencial en un círculo, afuera la foto se apaga | **En piezas con lente manda el encuadre**; las palancas que llenan el cuadro, sólo en piezas sólo foto | Para lente, una palanca que concentre (`sombra`, `quien-sostiene`, `cenital`, `escucha`, `proyeccion`, `ausencia`) |

**P-4 en el registro cine (2026-09-27).** El cuarto registro del lenguaje fotográfico
([`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md),
fuente vigente; sólo Nexa protagonista, la receta `proposal-cinematic` y, por excepción aprobada el 2026-09-27, las
láminas de sección y «about» del deck; issue AXIS `cine-requires-nexa-or-proposal`, que aún no conoce la excepción)
**fabrica** su fuente de luz con el color de la línea: anillo, esfera, moño de partículas, esferas de acento. Ahí P-4
se lee al revés: ese fenómeno **es** la órbita de la pieza, así que no se pide otro plate, **se renuncia a la órbita
gráfica** encima (registro cine §9.4: el anillo de la portada y la contraportada del brochure por decisión del
operador; el moño de RevOps, la órbita de pantallas y las cinco esferas de la lámina de líneas, por extensión). Una
sola órbita por pieza, venga de la foto o de la línea. Las cinco esferas de color de la lámina de líneas son luz de la
foto, no la esfera de la voz.

**P-4 en el escenario del login (2026-10-02, TASK-1964).** Lo mismo en una pantalla: las novedades del carrusel cuya
foto cine ya trae la luz de la línea, que cuenta como su órbita (`LG1`, el haz que elige una tarjeta; `LG2e`, la órbita
naranja cerrada), van **sin lente**; la foto en registro B (`LG3e`) la lleva. El operador lo aceptó. [applications.md](applications.md) §A12.

Estas decisiones se escriben también en la sección recíproca de los dos canon (manual de la línea y maestro
fotográfico); esta referencia no los edita.

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
  "palanca": "quien-sostiene",
  "escena": "SCENE (on-location shoot inside a specialty coffee shop, 10 am, filming a barista for a café chain launch): in focus, a camera operator in a plain dark grey sweater sits on an apple box at a small field monitor mounted on the rig, one hand on the focus wheel, watching the take; the cool light of the monitor lifts their cheek and hand. Behind them, SMALL, SOFT and out of focus, the barista pours at the counter against deep ink-blue glazed tiles. Hard morning sun from a high window falls on the operator's hand and the monitor. 85mm f/1.8. LENS FRAMING: the operator's hand, the monitor and the ink-blue tiles all sit inside a circle about 50% of the frame width, centred on the horizontal middle and at about 37% of the frame height, with air around it; outside that circle the picture holds only calm secondary material. Nobody looks at the lens.",
  "lecho": { "objeto": "the black hard case of the camera kit on the floor at the lens, completely out of focus", "tono": "DARK near black" }
}
```

Escena y lecho vienen de la ficha L4 del banco (`fichas/L4-quien-sostiene-rodaje.json`), con la luz dura sobre la mano
y el monitor y la cláusula de encuadre reescrita para el centro y el diámetro visible de `campaign-post` (P1, P-3). La
palanca `quien-sostiene` concentra; las que llenan el cuadro (`variantes`, `manos`) no van en una lente (P-9). Sin
`reservas.texto`: en la lente, el oscurecimiento de afuera es la reserva del texto (P-1). Con lecho igual (P-2).
Esta ficha arma el prompt sin errores (verificado con `foto:prompt` el 2026-09-26); el comando avisa que la pieza es
«muda» porque no declara reservas (esperado en una lente), y el prompt todavía lleva el límite de cabezas y manos del
36 %, que por P-8 no aplica sin reserva de texto: el comando lo emitirá sólo con reserva cuando llegue la task.

**3. Revisar el prompt, generar y validar.**

```bash
pnpm foto:doctor
pnpm foto:prompt $RUN/fichas/lente-decision.json              # revisar el prompt armado
pnpm foto:generar $RUN/fichas/lente-decision.json --quality high --out $RUN/plates
pnpm foto:validar $RUN/plates/lente-decision.png              # sombras no azules, lecho
```

Mirar el plate al 100 %: un solo punto de interés, en el centro de la lente; nadie mira al lente; ninguna marca de
terceros; el azul portador dentro del círculo (P2); ningún anillo en la escena (P-4). Si falla, **se rehace la toma**
(nunca se oscurece ni se recorta).

**4. Medir y declarar lo que la foto protege.** Sobre el plate, en píxeles del lienzo 1080×1350: la caja del sujeto
(`subject`) y la banda del lecho (`bed`, ≈ el 18 % inferior, con el canto medido). El texto (pregunta y respuesta) lo
mide y lo pinta quien llama, debajo del anillo.

**5. Componer con la órbita.** `intent.json`:

```json
{
  "canvas": { "width": 1080, "height": 1350, "line": "growth", "surface": "dark", "channel": "social" },
  "elements": [
    { "kind": "lens", "id": "lens", "photoId": "photo", "alt": "Un camarógrafo sigue la toma en el monitor mientras, desenfocada al fondo, una barista sirve", "region": "upper-center" },
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
de 1152×1440 el 2026-09-26 (re-verificado tras el cambio de ficha), salen 0 con `status: pass` y la firma a 17,6:1: el
ejemplo es ejecutable, no ilustrativo. Con el adapter de Greenhouse la lente de `upper-center` queda en
0,50 · 0,36 con ≈ 48 % de diámetro visible (§5.2): si se usa la receta del paquete en vez del adapter, los números son
los de `campaign-post`. Se briefea para el camino que se va a usar.

**6. QA.** La lista de §8 completa, en especial: `lens-subject-inside-circle` a ojo, la firma sobre la materia calma del
lecho, el interior de la lente al 100 % y la pieza a 390 px. La publicación y la pauta necesitan la autorización del
operador por separado.

---

**Mantener esta referencia:** todo cambio de `lens`, `spotlight`, `pieces`, `signature`, de los chequeos del adapter o
de `foto:prompt` que toque la lente, el foco o la firma sobre foto actualiza §2, §5 y §6, recalcula §5.2 y renueva el
sello. Cuando el operador decida un conflicto nuevo o una regla conjunta nueva, se marca aquí, se registra en
`ledger.md` y se escribe en los dos canon (sección recíproca de cada uno). Cuando la task «foto:prompt y chequeos de la
lente» cierre P5, P9, P-6 y P-8, se quita la marca [código pendiente] y se actualizan §4, §5.1 y §10.
