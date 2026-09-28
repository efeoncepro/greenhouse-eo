# Marketing con Manzanitas — registro complementario de La órbita (sólo piezas de MCM)

> **Verificado contra: canvas v39 — 2026-09-28** («Marketing con Manzanitas · Línea v1»,
> https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG; los tableros `Grafico-*` y `Texto-*` se leyeron en su fuente,
> con la lógica `renderVals()` de cada lámina) · inventario de hechos de la sesión del 2026-09-28 ·
> [ledger.md](ledger.md) (filas del 2026-09-28) · [criteria.md](criteria.md) §3.4 y §8.
>
> **Estado: APROBADO por el operador (2026-09-28)** sobre la versión 39 del canvas: «Me encantan, queda aprobada toda
> la línea gráfica». Cubre los formatos Pizarra, Escena, Lente y Recreo; la cabecera y la firma; la contraportada A;
> los acentos por línea; los 9 gráficos y las 3 láminas de texto denso. Si otra referencia de esta skill todavía llama
> «propuesta» a los gráficos o al texto denso, es anterior a esta aprobación.
>
> **Canonización (operador, verbatim):** «esta línea gráfica no reemplaza The Orbit que es la /efeonce-graphic-line
> sino que la complementa con un nuevo registro para marketing con Manzanitas». **Complementa, no reemplaza:** La
> órbita sigue siendo la línea gráfica de Efeonce y manda en todo lo que este registro no dice. El registro suma
> reglas, estilos y piezas propias **sólo** para piezas de Marketing con Manzanitas.
>
> **Nada del registro existe todavía en AXIS.** No hay token `manzanitasRegister`, ni contrato
> `efeonce.manzanitas-register`, ni carpeta `assets/manzanitas/`, ni módulo `charts`: son el plan (§10.3). Hoy la
> fuente de lo propio es el canvas; lo heredado se lee de `efeonceGraphicLine` y nunca se transcribe. Los números de
> esta referencia son **referencia humana medida en el canvas**: cuando exista el token, manda el token.

**Nombre canónico:** «registro Marketing con Manzanitas» (abreviado «registro MCM» o «registro Manzanitas»). MCM es la
marca editorial evergreen del blog de Efeonce: marketing explicado simple.

## 0. Alcance — decide esto primero

- [ ] ¿La pieza es de **Marketing con Manzanitas** (carrusel, portada, lámina interior, contraportada, story, cabecera
      de blog o banner, miniatura de YouTube, portada de pódcast, cierre de video)? **Sí** → esta referencia **más** La
      órbita ([SKILL.md](../SKILL.md), [criteria.md](criteria.md), [qa-checklist.md](qa-checklist.md)). **No** → nada de
      aquí.
- [ ] ¿Es una pieza **de Efeonce** (deck, informe, social de marca, firma de correo, merch)? → sólo La órbita. Las
      recetas de gráficos de este registro están aprobadas **sólo para MCM** (pendiente 8, §13).
- [ ] ¿Es de **Glitch** (magazine semanal o Glitch Flash)? → [glitch.md](glitch.md). Nunca esta referencia.
- [ ] ¿Cuál es el **tema**? Decide la línea (§2) antes de abrir un tablero: la línea cambia el acento de todo.

**Hermanos que no se mezclan.** La sub-línea de Glitch (token `glitchLine`, contrato `efeonce.glitch-line`) y este
registro son hermanos. Ninguno usa elementos del otro:

| Glitch (sólo Glitch) | Registro Manzanitas (sólo MCM) |
|---|---|
| La manzana **LLENA** como esfera | La manzana en **CONTORNO** con tres puntos (burbuja escribiendo); **no** es esfera |
| Verde Glitch `#6ec207` como acento | El acento de la **línea del tema** (§2) |
| La falla en bytes, Guttery | Nada de bytes ni Guttery |
| Cabecera «EDICIÓN #N» | Cabecera con el logo de MCM arriba a la izquierda (§3) |

**«Registro» tiene dos sentidos.** La órbita ya usa «registro» para la **fotografía** (documental, puesta en escena,
respuesta, cine). El registro Manzanitas es un registro de **marca editorial**; dentro de él, las fotos siguen usando
los registros fotográficos de Efeonce (en MCM, **cine**). Cuando aparezcan juntos, acláralo.

## 1. Hereda, propio y nunca

| Tema | Hereda de La órbita (sin cambios) | Propio del registro | Nunca |
|---|---|---|---|
| Voz | Pregunta + respuesta con `EfeonceOrbit.Voice`: anillo abierto antes de la pregunta, respuesta en Bricolage 760 con la esfera que cierra; respuesta ≤ 3 palabras y ≥ 3 veces la pregunta (`answer-dominates-3x`) | Tamaños por lámina (§8.1, §9) | Una respuesta que no domine a la pregunta |
| Esfera | **Una esfera por pieza** (`one-sphere-per-piece`) | En la medida y la tendencia la esfera **es el dato**: esas láminas no llevan la voz con su esfera | Dos esferas; un círculo suelto en un gráfico; leer los tres puntos del logo como esferas (son ventanas de la nave, ADN de familia) |
| Órbita | Una órbita por pieza (`one-orbit-per-piece`); ningún texto la cruza; la medida en la órbita (`trajectory.measure`) y la Lente (`EfeonceOrbit.Lens`) | En la Escena, **la luz de la foto es la órbita** de la pieza | Dona de partes; una órbita dibujada en una Escena; la Lente combinada con otra órbita o con el foco |
| Acento | Por línea desde `efeonceGraphicLine.lines`: `accentOnLight` sobre papel, `accentOnDark` sobre navy; ≥ 3:1 contra su fondo; nunca en texto < 24 px (`accent-text-min-size`) | La manzana, sus tres puntos, el gráfico y la cifra destacada van en el acento de la **línea del tema**, con un solo selector (§2) | El acento como superficie (a sangre); la manzana en color fijo o en el acento de otra línea |
| Superficies | Navy `color.dark` (`#001a33`) y papel `color.paper` (`#f7f8f6`); texto `color.navy` (`#023c70`) | El selector de línea no cambia la superficie | Un campo entero de acento |
| Tipografía | Bricolage Grotesque (respuesta y cifras, 760, tracking −0,035em); Poppins (pregunta 300; texto 400/500) | Rótulos de 24–26 px; cuerpo de texto denso 28–32 px | Texto en acento bajo 24 px |
| Cabecera | — | Logo de MCM siempre arriba a la izquierda (§3) | Recortar la manzana hasta que no se lea (§14) |
| Firma | Logo de Efeonce centrado abajo; la burbuja URL sólo reemplaza al logo si el logo ya está en la imagen | Una sola altura de firma en todo el carrusel: y 1202 (§6) | La burbuja URL sobre la mesa de la estratega (no pasa contraste) |
| Eslogan | «Empower your Growth \| Brand \| Engine \| Voice \| Revenue» **sólo cierra**, en bloque con el logo: eslogan debajo al 64 % del ancho del logo (`motion.layout.sloganOfLogo`), separado 1,35 veces su fuente (`sloganGapOfFont`) | Su palabra es la línea del tema; logo de 400 px en el cierre para que llegue a 24 px | En portada, blog, miniatura o pódcast; como texto suelto |
| Íconos | Sólo del catálogo de AXIS (`resolveIcon`), en reposo, con la voz de la línea (`icons.voiceByLine`) | La mano «Desliza» en un sitio fijo (§5) | Íconos sociales o botones simulados en la contraportada |
| Foto | Lenguaje fotográfico de Efeonce | Registro cine; lecho nativo; Escena y Lente como formatos (§4) | Lecho agregado; la foto cargando sola el argumento |
| Datos | El arco mide un dato real con fuente | Gráficos calculados desde su dato; «Ejemplo ilustrativo · Fuente: [FUENTE, AÑO]» hasta tener la real (§8) | Una cifra sin fuente; una barra dibujada a mano |

## 2. Acentos por línea

Regla del operador (2026-09-28, verbatim): «el marketing con manzanitas ajusta sus acentos como el color de la
manzana de los puntos de la orbita etc como dice la línea gráfica que es por linea de negocios».

| Línea | Clave AXIS | Sobre papel (`accentOnLight`) | Sobre navy (`accentOnDark`) | Palabra del eslogan | Voz de «Desliza» |
|---|---|---|---|---|---|
| Growth | `growth` | `#0e8c82` | `#36c8bf` | Growth | Trazo `swipe` (D28) |
| Brand | `brand` | `#bb1954` | `#ff6500` | Brand | Plastilina `mano` (D29) |
| Engine | `engine` | `#0375db` | `#0375db` | Engine | Trazo `swipe` |
| Voice | `voice` | `#f83902` | `#f83902` | Voice | **pendiente** (mientras, Trazo `swipe`) |
| Revenue (HubSpot) | `revenue-hubspot` | `#8e1b82` | `#e86bd0` | Revenue | Trazo `swipe` |

Los hex son referencia medida; al construir, el valor se lee del token (`efeonceGraphicLine.lines[].accentOnLight` /
`accentOnDark`), nunca se transcribe. El selector del canvas ofrece `growth`, `brand`, `engine`, `voice` y `revenue`
(este último resuelve a `revenue-hubspot`).

- **La línea la decide el TEMA, no la pieza.** Decididos: AEO / visibilidad en IA = **Engine**; creatividad = **Brand**
  (Creative Workflows). Para otro tema, la línea es la de servicio que lo trata (columna `scope` de
  `efeonceGraphicLine.lines`, en [package-and-tokens.md](package-and-tokens.md) §2.2); si cae entre dos, pregunta.
- **Un solo selector por lámina, «Línea del tema».** Al cambiarlo cambia todo a la vez: la manzana y los tres puntos
  (cabecera, portada, cierre), el arco, la esfera, la barra o la cifra destacada, la palabra del eslogan y la voz del
  ícono «Desliza». No cambian la superficie ni el texto del logo.
- **Texto del logo:** navy `#022a4e` (el del asset) sobre papel y blanco sobre navy.
- **Neutros de los gráficos:** lo que no destaca va en navy `color.navy` (`#023c70`) y gris `#c9d2dc` (el `before` de
  la receta de deck `decision-chart`, en `efeonceGraphicLine.surfaces`). Sobre navy, lo que no destaca va en
  `rgba(207, 228, 250, 0.22)` y el texto suave en `#cfe4fa`; sobre papel, el texto suave es `#6d6777` (tinta suave del
  DS `EfeonceOrbit`). Estos neutros no tienen token propio todavía: son valores del canvas.
- **El acento es luz, gráfico y palabra, nunca superficie** (el acento a sangre fue rechazado, §7).

## 3. Cabecera

- El logo de MCM (manzana en contorno con tres puntos arriba + «Marketing con Manzanitas») va **siempre arriba a la
  izquierda**, en todos los formatos. En el carrusel 1080 × 1350: x 80, y 72, 200 × 90 px. Otras piezas usan
  160 × 72, 180 × 81 o 240 × 108 según formato.
- **Sin manzana** (sólo el texto «Marketing con Manzanitas») en la **portada Pizarra** y en la **contraportada**,
  porque ahí la manzana grande está en la lámina.
- En la portada con foto, la pregunta va en **una línea** para que la voz termine sobre la cabeza.
- **El SVG oficial tiene 25 trazos; los cuatro últimos son la manzana y los tres puntos**: esos toman el acento, el
  resto la tinta del logo.
- SVG oficiales en OneDrive `Alineación/5. Contenidos/13- Branding/SVG`. Usan `<style>`: **inlinea los fills antes de
  subir**. Inventario y nombres exactos (ojo al prefijo `mkt-` vs `marketing-`) en la
  [biblioteca de recursos de MCM](../../../../docs/operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md).
  La biblioteca trae además la manzana suelta en colores fijos (naranja, verde, azul…): en este registro ninguno se
  usa como color fijo; la manzana toma el acento de la línea del tema.
- **La manzana se lee completa:** dos lóbulos, hendidura, hoja y tallo. Puede sangrar un borde; un recorte de sólo hoja
  + tallo se leyó como «orejas de conejo» y se rechazó.

## 4. Formatos de lámina (tablero `Formatos`)

### 4.1 Pizarra («Diseñado»)

La línea v1 tal como está: papel o navy, la manzana, la voz y los pasos. Sirve para la portada, los pasos, el dato y
el cierre. **El dato con fuente y el cierre van siempre en Pizarra.** Es la **única** que lleva la manzana grande.
Todos los gráficos y el texto denso son Pizarra.

### 4.2 Escena («Foto completa»)

- Una fotografía a sangre, con la voz en su reserva y la firma sobre el lecho. **Registro cine.**
- Sin manzana grande ni órbita dibujada: **la luz de la foto es la órbita de la pieza**.
- **La foto dice lo que dice el texto**, y el lecho sale de ella: es lo que de verdad hay entre la cámara y el sujeto
  (la mesa donde Nexa revisa, la mesa del cliente, la silla del visitante), **nativo, nunca agregado**. La firma va
  dentro de su materia, con aire sobre su borde.
- **Rechazados como lecho:** mesa «matte black» en estudio vacío, cabezas del público, dorso de un portátil,
  «consola», piso que corta las piernas.
- El isotipo del traje de Nexa **se compone** y el modelo sólo lo termina sobre su silueta (método en
  `.claude/rules/brand-photography.md` y skill `design-studio`).
- Cine con Nexa protagonista es el caso probado. **Personas del equipo en cine en redes: no aprobado** (pendiente 6);
  la estratega de la Escena interior es una persona por rol, generada. Registro cine:
  [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md).

### 4.3 Lente («Foto señalada»)

La foto apagada afuera y a color dentro del círculo, para señalar a una persona o un objeto (`EfeonceOrbit.Lens`).
**Sólo en láminas interiores** (la portada con foto es Escena). No se combina con otra órbita ni con el foco. La foto se
toma **para** la lente: la cara y el objeto caben en el círculo fijo del formato y **nadie mira al lente**.

### 4.4 Recreo (la mezcla del carrusel)

- Portada **Pizarra** → cerca de un tercio de las láminas lleva foto (≈ 2 de 7).
- Portada **Escena** → la foto ya es la promesa y el carrusel llega a casi la mitad (≈ 3 de 7).
- Nunca dos láminas con foto seguidas. Nunca más de tres Pizarras seguidas (si los gráficos cuentan: pendiente 2; la
  recomendación es que sí).
- El dato con fuente y el cierre, siempre en Pizarra.
- Todas las fotos de un carrusel comparten registro y luz.
- La lámina que sigue a una foto retoma la voz: la foto nunca carga sola el argumento.

### 4.5 Story, blog y banner

- **Story y blog: una sola pieza** (Escena o Pizarra, nunca las dos).
- **Story con foto:** la voz en la banda alta y la firma centrada sobre la mesa, dentro de la zona segura (cuál zona
  manda: pendiente 4). La story no lleva «Desliza». La story de cierre lleva el eslogan; su copy de cierre está
  pendiente (5; hoy «Guárdala», genérico).
- **Blog y banner:** la foto se genera en 16:9 y se lleva a 1,9:1 (1200 × 630). La voz va en el lado oscuro; la firma
  puede ir abajo a la izquierda, cerrando la columna del texto. Sin eslogan.

### 4.6 YouTube y pódcast

- **Miniatura de YouTube:** Escena 16:9 (1280 × 720 en el canvas), cabecera de MCM arriba a la izquierda y el logo de
  Efeonce abajo a la izquierda (tablero `Escena-youtube`). Sin eslogan. El **cierre del video** sí lo lleva
  (`YouTube-cierre`).
- **Pódcast (1:1):** la cabecera del programa en grande (**420 px**), porque la portada se ve a 160 px (ahí queda en
  62 px). Sin eslogan.

## 5. La mano «Desliza» (sitio fijo)

- Mismo lugar en todas las láminas que la llevan (Pizarra, Escena, Lente): pegada al margen derecho (80 px). En
  1080 × 1350: x 936, 64 × 64 px, a **1033 px** del borde superior en la **portada** y a **985 px** en los
  **interiores**. En piezas de MCM manda este sitio fijo del registro.
- Nunca junto a la voz cuando la voz va arriba, nunca en la fila de la firma, **nunca sobre el sujeto**: la foto se
  toma con ese rincón en calma; si el sujeto lo ocupa, se rehace la toma.
- **En reposo.** No va en la última lámina ni en la story.
- Voz por línea: Brand = Plastilina `mano` (D29); Growth, Engine y Revenue = Trazo `swipe` (D28); Voice = pendiente
  (mientras, Trazo). Se pinta con `resolveIcon({ glyph, size: 64, surface, label: 'Desliza' })` de
  `@efeoncepro/axis-graphic-line/icons`; la voz sale de `iconVoiceForLine(línea)`. Nunca un ícono dibujado a mano.
- En estudio (pendiente 3): la portada Pizarra con la mano **en respuesta** (dos esferas). Hasta que se decida, en
  reposo.

## 6. Firma y eslogan

- **Una sola altura de firma** en todo el carrusel: el logo de Efeonce arriba en **y 1202** (de 1350), 216 × 51 px, a
  97 px del borde inferior, en Pizarra, Escena y Lente (la Lente del sistema firma ahí). En la Escena queda dentro de
  la mesa.
- **El eslogan sólo cierra:** el cierre del carrusel, la story de cierre y el cierre del video. Su palabra es la línea
  del tema. **Nunca** en la portada, el blog, la miniatura ni el pódcast.
- En el cierre: logo de **400 px** para que el eslogan llegue a **24 px** (mínimo para que la palabra vaya en su
  acento; el componente `EfeonceOrbit.Slogan` la pinta siempre en el acento, ver [criteria.md](criteria.md) §5). El
  bloque termina en la línea de firma (**y 1253**).
- El eslogan acompaña al logo, no es texto suelto: nunca como una línea más de la columna de texto.
- **La burbuja URL sobre la mesa de la estratega no pasa** (1 % peor 3,80:1): esa lámina sigue con el logo.

## 7. Contraportada (aprobada: «A a escala», 2026-09-28)

- **Es una pieza social, no una hoja.** Pide **una sola conversión**: el comentario ligado a una acción que el lector
  hace hoy.
- **Voz:** pregunta + respuesta accionable + bajada en una línea «En los comentarios: …».
  - Engine: «¿Te nombra la IA? **Pregúntale.**» + «En los comentarios: cuéntanos si te nombró.»
  - Brand (Creative Workflows): bajada «En los comentarios: el primer ingrediente de tu receta.»
- **La manzana de la portada vuelve 3,8 veces más grande**, recortada por arriba y por la derecha: su cuerpo con los
  tres puntos queda como una burbuja escribiendo, en el acento de la línea, **sin astilla del tallo en el borde**.
  100 px de aire bajo la manzana y 120 px sobre el logo. La cabecera va sin manzana.
- **Nada simula un botón** (post orgánico). Guardar, compartir y enviar se piden en el copy del post cuando hacen
  falta, nunca los cuatro a la vez. Por qué no van los íconos sociales: una conversión por carrusel; los botones ya
  existen en la interfaz de LinkedIn; un comentario con sustancia pesa más.
- Se mide en Metricool: comentarios con sustancia, guardados, envíos y clics al grader por UTM cuando aplique.
- En el teléfono (390 px): respuesta 69 px, bajada 11 px, logo 144 px, eslogan 9 px.
- **Descartados:** B (órbita, más sutil) quedó como prueba. **C (acento a sangre) rechazada** («Logo azul Efeonce
  acá??? … muchísima saturación»): el acento nunca es superficie y el logo positivo trae el isotipo azul.

## 8. Gráficos: cómo usarlos (9 láminas, aprobadas 2026-09-28)

### 8.1 Gramática común

- Todas son **Pizarra** (papel o navy), 1080 × 1350, con cabecera, «Desliza» en y 985 y firma en y 1202.
- **Se calculan desde su dato:** la lógica de la lámina (`renderVals()`) recibe `datos` (arreglo u objeto) o `valor`
  (entero 0–100) y calcula largos, posiciones, la esfera, el destacado y la respuesta cuando es un número. **La
  plantilla sólo pinta.**
- **Un acento, sólo donde está la idea.** El resto va en navy y gris (§2).
- **Las barras salen de su número** (`bars-from-values`) y parten de cero; ninguna se dibuja a mano.
- **Cifras con fuente** (`figures-with-source`) y datos de muestra marcados (`illustrative-data-marked`): la línea al
  pie dice «Ejemplo ilustrativo · Fuente: [FUENTE, AÑO]» (Poppins 500, 24 px, x 80, ancho 820, en texto suave; la
  fuente en negrita) hasta tener la real. **Sin fuente, la cifra no sale.**
- **Una esfera por pieza.** En la **medida** y la **tendencia** la esfera ES el dato: no llevan la voz con su esfera;
  llevan la pregunta arriba (Poppins 300, 44 px, x 80, y 222, ancho 900) y la fuente en y 1002. Las otras siete cierran
  con la voz (`EfeonceOrbit.Voice`, respuesta 150 px, pregunta 45 px, x 80, y 842, ancho 820); las que imprimen cifras
  llevan la fuente en y 1068. El Venn y la matriz no imprimen cifras y en el canvas no llevan línea de fuente.
- **No hay dona de partes:** tres segmentos en un anillo serían un arco que se llena (la órbita recorre, nunca se
  llena). La dona de la línea es la medida de la órbita. Las partes (hasta 3) van en una barra al 100 %.
- **Ningún círculo suelto** en un gráfico: el conteo va en cuadrados; el Venn en discos translúcidos sin anillo, para
  que nada se lea como esfera ni como órbita.
- Rótulos de 24–26 px, cifras en Bricolage 760; el texto en acento sólo desde 24 px.
- **Las respuestas en palabras son texto** y se editan en la lámina; **las numéricas salen del dato**. Numéricas:
  medida y tendencia (la cifra), ranking («N veces»), partes («1 de N»), de cada 100 («N de 100»). En palabras: antes y
  después, Venn, matriz, embudo. **Si cambias el dato, relee la respuesta en palabras: no se recalcula.**

### 8.2 Elige por la pregunta

| La pregunta de la lámina | Gráfico | Dato | Superficie | ¿Voz? |
|---|---|---|---|---|
| ¿Qué parte del total? | 1 · Medida en la órbita | `valor` 0–100 | navy | no (la esfera es el dato) |
| ¿Quién va primero y cuánto nos separa? | 2 · Ranking | `datos` [{label, v, rol}] | papel | sí |
| ¿Cuánto cambió? | 3 · Antes y después | `datos` {antes, despues} | papel | sí |
| ¿Hacia dónde va? | 4 · Tendencia | `datos` 12 valores mensuales | navy | no (la esfera es el dato) |
| ¿De qué está hecho? | 5 · Partes de un todo | `datos` hasta 3 [{label, v, tono}] | papel | sí |
| ¿Cuántos de cada 100? | 6 · De cada 100 | `valor` 0–100 | navy | sí |
| ¿Dónde se cruzan tres cosas? | 7 · Venn de tres | concepto, sin dato ni fuente | papel | sí |
| ¿Qué hago primero? | 8 · Matriz 2 × 2 | `datos` [{label, esfuerzo, impacto, foco?}] | navy | sí |
| ¿Dónde se pierde? | 9 · Embudo | `datos` [{label, v}] en orden | papel | sí |

Si la pregunta no está en la tabla, no fuerces un gráfico: la lámina va con voz y texto (Pizarra o texto denso, §9).

### 8.3 Fichas

Los ejemplos de cada ficha son los datos de muestra del canvas; sirven para comprobar tu cálculo, nunca para publicar.

**1 · Medida en la órbita** — tablero `Grafico-1`
- **Pregunta:** «¿Qué parte del total?» (muestra: «¿En cuántas respuestas de IA sobre tu categoría aparece tu marca?»).
- **Sí:** una sola proporción de un total, con fuente. **No:** para comparar actores (→ 2), la composición del total
  (→ 5), la evolución en el tiempo (→ 4).
- **Dato:** `valor` entero 0–100 (la lógica lo acota a 0–100).
- **Acento:** arco (estela) y esfera, en `accentOnDark`.
- **Respuesta:** la cifra es la respuesta: Bricolage 230 px (170 px al 100 %) + «te nombran» 32 px, dentro del anillo.
- **Superficie:** navy. Sin voz.
- **Medidas:** anillo r 300, centro (540, 680). La geometría (anillo `#72ded8` al 16 %, trazo 2,38; arco 3,81; esfera
  r 8,33; marca de partida al 60 %) sale de `measureSvg` de AXIS (sonda en Engine sobre oscuro).
- **Cálculo:** barrido = valor ÷ 100 × 360°, desde las 12 en sentido horario; la esfera en (540 + 300 · sen barrido,
  680 − 300 · cos barrido); la estela = min(50°, barrido) detrás de la esfera (50° = `trajectory.measure.trailDeg`).
  0 %: la esfera en la partida, sin estela. 100 %: vuelve arriba y se queda. Verificado contra `measureSvg` en 0,05 /
  0,38 / 0,62 / 0,9 / 1 (el generador del canvas se detiene si no coincide). Muestra: 38 → «38 %».

**2 · Ranking** — tablero `Grafico-2`
- **Pregunta:** «¿Quién va primero y cuánto nos separa?» (muestra: rótulo «Menciones en respuestas de IA, % del
  total»; voz «¿Cuánto más nombran al líder?»).
- **Sí:** varios actores medidos con la misma vara, con un líder y tu marca. **No:** si no hay tu marca o no hay
  líder, la respuesta «N veces» no tiene sentido; un solo actor → 1.
- **Dato:** `datos` [{label, v, rol: 'lider' | 'tu'}]; `v` en % del total.
- **Acento:** tu marca (barra y cifra en el acento, rótulo en negrita); el líder en navy; el resto gris.
- **Respuesta:** «N veces» = líder ÷ tu marca, redondeado.
- **Superficie:** papel.
- **Medidas:** barras de 44 px, largo máx. 760, rótulo de 26 px sobre cada barra, cifra Bricolage 40 a su derecha.
- **Cálculo:** largo = v ÷ máx × 760 (mínimo visible 4 px). Sin `rol: 'lider'`, toma el primero como líder; sin
  `rol: 'tu'`, el último como tu marca. «N» = redondeo de líder ÷ tu marca, mínimo 1. Muestra: 46, 31, **12**, 7, 4 →
  «4 veces».

**3 · Antes y después** — tablero `Grafico-3`
- **Pregunta:** «¿Cuánto cambió?» (muestra: «¿Y si la IA te entiende?»).
- **Sí:** un solo indicador en dos momentos. **No:** una serie de muchos momentos (→ 4).
- **Dato:** `datos` {antes, despues} en índice (antes = 100).
- **Acento:** la llave que marca la diferencia y su anotación («+140 %», Bricolage 96).
- **Respuesta:** en palabras («Te citan»).
- **Superficie:** papel.
- **Medidas:** dos columnas de 240 px (x 80 y x 360), alto máx. 400, base en y 740; antes gris, después navy; cifras
  Bricolage 56 sobre cada columna; «Antes» / «Después» a 28 px.
- **Cálculo:** alto = valor ÷ máx(antes, después) × 400; diferencia = (después − antes) ÷ antes × 100, redondeada, con
  «+» si es ≥ 0. Muestra: 100 → 240 → «+140 %».

**4 · Tendencia** — tablero `Grafico-4`
- **Pregunta:** «¿Hacia dónde va?» (muestra: «¿Cómo crece tu marca en las respuestas de IA?»).
- **Sí:** una serie mensual de un indicador. **No:** dos momentos (→ 3); varias series.
- **Dato:** `datos` 12 valores mensuales. **Los rótulos de mes salen fijos de «ene» a «dic»**: la serie tiene que ir
  de enero a diciembre o los rótulos mienten.
- **Acento:** el último tramo como estela, la esfera y el último valor (Bricolage 110). El primero va suave (40).
- **Respuesta:** la cifra del último punto. Sin voz.
- **Superficie:** navy.
- **Medidas:** sin rejilla, sólo la base; la línea en blanco al 90 % con el doble del trazo del arco (7,62); la esfera
  al doble de la de la órbita (r 16,66); meses de 24 px.
- **Cálculo:** x repartida de 180 a 900; y = 900 − v ÷ máx × 420 (el eje parte de cero). El último tramo (del
  penúltimo al último punto) es la estela en el acento y termina en la esfera, en el último punto. Muestra: 12 → 38.

**5 · Partes de un todo** — tablero `Grafico-5`
- **Pregunta:** «¿De qué está hecho?» (muestra: «¿Cuánto tráfico te trae la IA?»).
- **Sí:** hasta 3 partes que suman un todo. **No:** más de tres (la lógica sólo pinta las tres primeras: la
  agrupación es una decisión editorial, no de la lámina); una dona (no existe en el registro).
- **Dato:** `datos` hasta 3 [{label, v, tono: 'navy' | 'gris' | 'acento'}].
- **Acento:** la parte con `tono: 'acento'` (su barra y su cifra).
- **Respuesta:** «1 de N» = total ÷ la parte destacada.
- **Superficie:** papel.
- **Medidas:** barra al 100 % de 220 px de alto (920 de ancho) con 6 px entre partes; leyenda en 3 columnas (muestra
  de 28 px + cifra Bricolage 72 + rótulo 26).
- **Cálculo:** ancho = v ÷ total × (920 − 6 × (partes − 1)); cifra = v ÷ total × 100; «N» = redondeo de total ÷ parte
  destacada (sin `tono: 'acento'`, la última). Muestra: 62 / 26 / **12** → «1 de 8».

**6 · De cada 100** — tablero `Grafico-6`
- **Pregunta:** «¿Cuántos de cada 100?» (muestra: «¿Cuántas búsquedas no dan clic?»).
- **Sí:** una proporción que se entiende mejor contada. **No:** cuando lo que importa es la parte de un total sobre
  la órbita (→ 1).
- **Dato:** `valor` 0–100.
- **Acento:** las celdas llenas.
- **Respuesta:** «N de 100».
- **Superficie:** navy.
- **Medidas:** 10 × 10 cuadrados redondeados de 44 px con 10 px entre ellos (cuadrados, nunca círculos); clave «sin
  clic» (acento) / «con clic» (tenue) debajo.
- **Cálculo:** las celdas 1 a `valor` se llenan en el acento **por filas** (de izquierda a derecha, de arriba abajo);
  el resto en `rgba(207, 228, 250, 0.22)`. Muestra: 58 → «58 de 100».

**7 · Venn de tres** — tablero `Grafico-7`
- **Pregunta:** «¿Dónde se cruzan tres cosas?» (muestra: «¿Dónde te nombra la IA?»; rótulos «Lo que tu cliente
  pregunta», «Lo que publicas», «Lo que la IA sabe de ti»).
- **Sí:** un concepto. **No:** cuando hay cifras (no las lleva y no lleva fuente).
- **Dato:** ninguno.
- **Acento:** el centro triple.
- **Respuesta:** en palabras («Al centro»).
- **Superficie:** papel.
- **Medidas:** tres discos de r 190 en navy al 12 % (multiplicar), sin anillo; rótulos fuera de los discos (26 px).

**8 · Matriz 2 × 2** — tablero `Grafico-8`
- **Pregunta:** «¿Qué hago primero?» (muestra: «¿Qué conviene hacer primero?»).
- **Sí:** priorizar tareas por esfuerzo e impacto, con una recomendada. **No:** sin una tarea `foco`, la lámina no
  responde.
- **Dato:** `datos` [{label, esfuerzo 0..1, impacto 0..1, foco?}] (la lógica acota a 0..1).
- **Acento:** el cuadrante «Hazlo ya» (Bricolage 40) y la píldora de `foco` (fondo en el acento, texto navy oscuro
  `color.dark` `#001a33` en negrita). Las demás píldoras, fondo `rgba(207, 228, 250, 0.14)` y texto blanco.
- **Respuesta:** en palabras («Las FAQ»).
- **Superficie:** navy.
- **Medidas:** ejes al centro (x 540, y 505); cuadrantes «Hazlo ya» (arriba a la izquierda: poco esfuerzo, mucho
  impacto), «Planifícalo», «Si sobra tiempo», «Evítalo»; tareas en píldoras de 26 px.
- **Cálculo:** posición x = 170 + esfuerzo × 740; y = 330 + (1 − impacto) × 380 (centro de la píldora). Muestra: «FAQ
  con datos» (foco) en esfuerzo 0,2 e impacto 0,84.

**9 · Embudo** — tablero `Grafico-9`
- **Pregunta:** «¿Dónde se pierde?» (muestra: «¿Dónde se te caen los clientes?»).
- **Sí:** etapas en orden, cada una contenida en la anterior. **No:** etapas sin orden o que no se contienen (→ 2).
- **Dato:** `datos` [{label, v}] en orden.
- **Acento:** el paso con peor conversión (su barra y su %).
- **Respuesta:** en palabras («Al comprar»); tiene que nombrar el paso destacado.
- **Superficie:** papel.
- **Medidas:** barras centradas (máx. 760, alto 70) con su rótulo y valor encima; columna «Pasa» a la derecha con la
  conversión de cada paso (Bricolage 48).
- **Cálculo:** ancho = v ÷ máx × 760 (mínimo 6 px); conversión de cada etapa = etapa ÷ anterior (la primera no lleva
  %); se destaca la etapa con la menor conversión. Muestra: 1.000 → 420 → 190 → 60 = 42 %, 45 %, **32 %** → «Al
  comprar».

### 8.4 Reglas comunes de la lógica (trampas)

- **Dato inválido = muestra en silencio.** Si `datos` no es un arreglo (o el objeto no trae `antes`), la lámina pinta
  **los datos de muestra** sin avisar. Comprueba que las cifras en pantalla son las tuyas.
- Porcentajes redondeados al entero con **espacio duro antes de «%»**; miles en formato es-CL («1.000»).
- Mínimo visible: 4 px en las barras (6 px en el embudo), para que un valor chico no desaparezca.
- La geometría de la órbita (medida) y el trazo y la esfera de la tendencia se leen de `measureSvg`; nunca se
  escriben a mano.

## 9. Texto denso (3 láminas, aprobadas 2026-09-28)

Para explicar un concepto complejo: la voz arriba (y 216, respuesta 130 px) y el texto debajo. En un teléfono de 390 px
el cuerpo queda en 10 a 11,5 px (28 a 32 px en la lámina) y los rótulos en 9 px (24 px).

| Lámina | Superficie | Composición | Ejemplo |
|---|---|---|---|
| `Texto-1` · Concepto y tres puntos | papel | párrafo de 32 px + 3 puntos (cifra Bricolage 56 en el acento, título 30/600, cuerpo 28) | «¿Qué es el AEO? Que te citen.» |
| `Texto-2` · Comparación en dos columnas | navy | encabezados Bricolage 60 (el segundo en el acento), 4 filas (rótulo 24/600 suave + celdas 30) y un remate de 28 px | «¿SEO o AEO? Las dos.» — «Sin SEO, la IA no te encuentra. Sin AEO, no te cita.» |
| `Texto-3` · Paso a paso | papel | 4 pasos (cifra en el acento 56 + título 30 + cuerpo 28) | «¿Cómo empiezo con el AEO? En 4 pasos.» |

## 10. Cómo se compone hoy (y a dónde va)

### 10.1 En el canvas de la línea

Mientras AXIS no tenga el registro, **las piezas se componen en el canvas** «Marketing con Manzanitas · Línea v1»
(https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG, v39), montando los componentes del DS «Efeonce — La órbita»
(https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc): `EfeonceOrbit.Voice`, `EfeonceOrbit.Measure`,
`EfeonceOrbit.Lens` y `EfeonceOrbit.Slogan`.

- **Tableros canónicos:** `Grafico-1…9`, `Texto-1…3`, `Graficos-resumen` («Gráficos · cómo funcionan»),
  `Graficos-lineas` («Gráficos · acentos por línea»), `Formatos`, `Cierre-acciones`, `CW-*` (Creative Workflows, en
  Brand), `Escena-*`, `Lente-interior`, `Story-cierre`, `Podcast-1x1`, `YouTube-cierre`. Los `Antes-*` y `Prueba-*`
  quedan como historia: nunca partas de ellos.
- **Props de cada lámina:** `line` (selector «Línea del tema»: `growth`, `brand`, `engine`, `voice`, `revenue`) y el
  dato en la sección «Dato (de muestra)»: `valor` (medida, de cada 100) o `datos` (el resto). La lógica devuelve el
  acento claro y oscuro, la clave AXIS, la palabra del eslogan y la voz del ícono.
- **La voz se monta así:** `<x-import component-from-global-scope="EfeonceOrbit.Voice" question="…" answer="…"
  line="<clave AXIS>" surface="light|dark" answer-size="150">` (130 en texto denso).
- **El logo de MCM** se pinta en línea con sus 25 trazos: los cuatro últimos en el acento de la línea, el resto en la
  tinta del logo (§3).

### 10.2 Una pieza nueva, paso a paso

1. **Tema → línea** (§2). Si no está decidida para ese tema, pregunta.
2. **Plan del carrusel** con Recreo (§4.4): portada (Pizarra o Escena), interiores, el dato con fuente y el cierre en
   Pizarra, contraportada A (§7).
3. **Por lámina**, parte del tablero aprobado que responde su pregunta (§8.2); fija `line`; carga el dato real y su
   fuente real; reescribe las respuestas en palabras para que digan lo que el dato dice.
4. **Fotos** (Escena, Lente): registro cine, lecho nativo, reserva de la voz y el rincón de «Desliza» en calma; en la
   Lente, cara u objeto dentro del círculo y nadie mirando al lente. Dirección y generación con `design-studio` y
   `.claude/rules/brand-photography.md`.
5. **Revisa en el canvas**, donde corre la lógica de cada lámina, y pasa el QA (§12).
6. Aprobar la línea no autoriza publicar una pieza: la publicación la decide el operador.

### 10.3 Plan de AXIS (propuesto, pendiente de ejecutar)

> Se ejecuta por [TASK-1936](../../../../docs/tasks/to-do/TASK-1936-manzanitas-register-axis-token-contract-charts-lab.md), que fija el orden: ADR, token, assets, **contrato antes que gráficos** (`axis-graphic-line` depende de `axis-ui-contracts`), Lab y release. Plan visual y maqueta del Lab: https://claude.ai/artifact/WdEJAsC6HGkKdvyNvkDbvk.

Precedente: Glitch (ADR [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](../../../../docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md)
+ norma [`GLITCH_GRAPHIC_LINE_V1.md`](../../../../docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) →
ADR de AXIS `GLITCH_LINE_TOKEN_CONTRACT_DECISION_V1.md`, token `glitchLine`, contrato `efeonce.glitch-line` con
validador y resolver que falla cerrado, `pnpm glitch:resolve`, assets en `assets/glitch/`, Lab `/references/glitch/`).

1. ADR de AXIS `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`.
2. Token top-level **`manzanitasRegister`** en `@efeoncepro/axis-tokens` (no rama de `efeonceGraphicLine`): hereda por
   **referencia** (test de identidad) líneas, superficies, voz, trayectoria y eslogan; test de aislamiento contra
   `glitchLine` y contra `efeonceGraphicLine` (nada de La órbita referencia al registro).
3. Assets en `@efeoncepro/axis-brand-assets`, `assets/manzanitas/` (logo con el grupo manzana + puntos como atributo de
   color, texto solo, manzana en contorno), sellados como `MANZANITAS_ASSET_SEALS` y declarados en
   `AXIS_MANZANITAS_ASSETS`, fuera de `AXIS_BRAND_ASSETS`; colores como atributos, nunca `<style>`.
4. Módulo **`charts`** en `@efeoncepro/axis-graphic-line` con las 9 recetas (dato → SVG + manifiesto; la medida
   reutiliza `measureSvg`) y sus chequeos (barras desde el valor, un acento, una esfera, fuente, marca de ejemplo,
   ≤ 3 partes, sin dona de partes, texto en acento ≥ 24 px). Genérico por línea; aprobado sólo para MCM.
5. Contrato **`efeonce.manzanitas-register` 0.1.0 (`candidate`)** en `@efeoncepro/axis-ui-contracts`: intent (pieza,
   formato, línea del tema, superficie, datos), validador con issues en es-CL y resolver que falla cerrado;
   `pnpm manzanitas:resolve`; ejemplos válidos e inválidos en `docs/examples/manzanitas/`.
6. Lab **`/references/manzanitas/`** + `/references/manzanitas.json`, con tests unitarios y e2e y entrada en la
   navegación.
7. Release con tag de tokens, contracts, graphic-line y brand-assets; `pnpm design:check`.
8. Después, en Greenhouse (tareas aparte): subir los pins de AXIS, catálogo `manzanitas` del Artifact Composer para
   componer carruseles desde datos, y que esta skill consuma el paquete.

**Coordinación:** el checkout de AXIS es compartido (hoy lo usa la sesión de Insights, rama `docs/insights-lab`, y hay
una rama local `docs/glitch-flash-composer` con 2 commits de otra sesión). El trabajo de MCM va en rama propia desde
`main` cuando el checkout se libere, y los releases se secuencian para no chocar versiones. **Empujar a `main` de AXIS
y crear tags es una mutación externa: requiere autorización explícita del operador.**

## 11. NUNCA

- Elementos de Glitch en una pieza de MCM (manzana llena, verde `#6ec207`, bytes, Guttery, «EDICIÓN #N»), ni elementos
  de MCM en Glitch o en una pieza de Efeonce.
- La manzana en un color fijo, en el acento de otra línea o recortada hasta no leerse.
- El acento como superficie (a sangre) o en texto de menos de 24 px.
- Dos esferas en una pieza: la voz con su esfera en la medida o la tendencia; la mano en respuesta sin decisión del
  operador (pendiente 3).
- Una dona de partes, un círculo suelto en un gráfico, una barra dibujada a mano, una cifra sin fuente.
- Un dato de muestra publicado como real.
- El eslogan en la portada, el blog, la miniatura o el pódcast; el eslogan separado del logo.
- La burbuja URL sobre la mesa de la estratega.
- Botones o íconos sociales simulados en la contraportada; pedir las cuatro acciones a la vez.
- «Desliza» en la última lámina, en la story, junto a la voz de arriba, en la fila de la firma o sobre el sujeto.
- Dos láminas con foto seguidas; más de tres Pizarras seguidas; el dato con fuente o el cierre fuera de Pizarra.
- La Lente en la portada o combinada con otra órbita o con el foco.
- Un lecho agregado (estudio vacío, cabezas del público, dorso de un portátil, «consola», piso que corta las piernas).
- Escribir como si `manzanitasRegister`, `efeonce.manzanitas-register`, `assets/manzanitas/` o `charts` ya existieran.
- Copiar a mano un valor heredado de La órbita (acento, superficie, geometría de la órbita): se lee del token o de
  `measureSvg`.

## 12. QA antes de entregar (además de [qa-checklist.md](qa-checklist.md))

- [ ] Es una pieza de MCM (§0) y la línea del tema está decidida (§2).
- [ ] Un solo selector: la manzana, los puntos, el gráfico, la palabra del eslogan y la voz de «Desliza» están en la
      misma línea.
- [ ] Una esfera en la pieza (cuenta la de la voz antes de poner otra) y una órbita.
- [ ] La manzana se lee completa; la cabecera va sin manzana en la portada Pizarra y en la contraportada.
- [ ] Recreo: sin dos fotos seguidas, sin más de tres Pizarras seguidas, dato con fuente y cierre en Pizarra, todas
      las fotos con el mismo registro y luz.
- [ ] Gráficos: las cifras en pantalla son **tus** datos (no la muestra, §8.4); las barras salen del número; la línea de
      fuente dice la fuente real o «Ejemplo ilustrativo»; las respuestas en palabras siguen diciendo lo que el dato
      dice; en la tendencia, la serie va de enero a diciembre.
- [ ] Acento ≥ 3:1 contra su fondo y ningún texto en acento bajo 24 px, medido sobre los píxeles finales.
- [ ] «Desliza» en su sitio fijo (y 1033 portada, y 985 interiores), en reposo, con la voz de la línea; ausente en la
      última lámina y en la story.
- [ ] Firma en y 1202 en todo el carrusel; el eslogan sólo en el cierre, con logo de 400 px y eslogan ≥ 24 px.
- [ ] Contraportada: una sola conversión, bajada «En los comentarios: …», manzana 3,8× sin astilla del tallo, nada que
      simule un botón.
- [ ] Escena: lecho nativo, firma dentro de su materia con aire, rincón de «Desliza» libre; Lente sólo en interiores.
- [ ] Revisada en el canvas (o en un renderizador que ejecute `renderVals()`), en papel y en navy, y a 390 px.

## 13. Pendientes del operador (no los decidas por tu cuenta)

1. La voz del ícono «Desliza» en la línea Voice (`voiceByLine.voice` vacío en AXIS; mientras, Trazo).
2. Si los gráficos cuentan para «nunca más de tres Pizarras seguidas» (recomendación: sí).
3. La portada Pizarra con la mano en respuesta (dos esferas): ¿excepción registrada o vuelve a reposo?
4. La zona segura de la story: la firma de la Escena story (1620–1671) cae en la franja de interfaz (franja desde
   y 1580 o el 87 % de AXIS).
5. El copy de cierre de la story (hoy «Guárdala», genérico).
6. El registro cine con personas del equipo en redes aún no está aprobado (la estratega de la Escena interior es una
   persona por rol, generada).
7. Los Trazo candidatos `republicar` y `enviar` siguen en borrador.
8. Si las recetas de gráficos pasan a La órbita para piezas de Efeonce (hoy aprobadas sólo para MCM).
9. El navy `#022a4e` del texto del logo de MCM: viene del archivo oficial y la sub-línea de Glitch lo declara exclusivo de su wordmark (`glitchLine.scope.exclusive: navy-wordmark`). ¿Es la tinta compartida de la familia Manzanitas o el logo de MCM pasa al navy de Efeonce (`#023c70`)? Hoy va el del archivo oficial.
10. El acento de un tema de Revenue en Salesforce: el selector usa Revenue (HubSpot, `revenue-hubspot`); AXIS define también `revenue-salesforce` y falta decidir cuándo aplica en MCM.

## 14. Lecciones de esta sesión (no las repitas)

- **La manzana completa y legible.** Un recorte de sólo hoja + tallo se leyó como «orejas de conejo». Puede sangrar un
  borde, pero los dos lóbulos, la hendidura, la hoja y el tallo tienen que leerse.
- **El acento nunca es superficie.** La contraportada C (acento a sangre) se rechazó por saturación y porque el logo
  positivo de Efeonce trae su isotipo azul, que choca sobre un campo de color.
- **La burbuja URL no pasa sobre la mesa de la estratega** (1 % peor 3,80:1). Mide sobre los píxeles de la foto real,
  no sobre la paleta; si no pasa, firma el logo.
- **Un renderizador local que no ejecuta `renderVals()` no sirve para gráficos calculados:** pinta la plantilla sin
  largos, posiciones ni respuestas. Sólo vale uno que ejecute la lógica de la lámina (el de la sesión, v2, lo hacía);
  si no, revisa en el canvas.
- **Cuenta la esfera de la voz antes de poner otra.** La medida y la tendencia no llevan la voz porque su esfera ya es
  el dato; la mano en respuesta de la portada sumaría una segunda (pendiente 3).
- **La firma se unifica en la altura del sistema, no al revés:** bajar las Pizarras a y 1237 no unificaba, porque la
  Lente del sistema firma en y 1202 y no se mueve desde el tablero.
- **La contraportada es la de un post social, no una hoja de documento:** una conversión, conversacional, sin botones
  falsos.
- **Tres partes en un anillo son un arco que se llena:** por eso no hay dona de partes.
- **El dato inválido cae a la muestra sin avisar** y **los meses de la tendencia son fijos**: verifica las cifras en
  pantalla contra tu fuente (§8.4).
- **Los SVG oficiales usan `<style>`:** inlinea los fills antes de subir; y los cuatro últimos trazos del logo son los
  que toman el acento.

## 15. Fuentes

- Canvas de la línea: «Marketing con Manzanitas · Línea v1», https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG
  (versión 39, aprobada 2026-09-28).
- DS «Efeonce — La órbita»: https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc (`EfeonceOrbit.Voice`, `Measure`,
  `Lens`, `Slogan`).
- [ledger.md](ledger.md), filas del 2026-09-28 (Manzanitas: cine y lecho; firma, cabecera, canales y eslogan;
  contraportada social; contraportada A; acentos por línea, gráficos y texto denso) y sus pendientes.
- [criteria.md](criteria.md) §3.4 (estela; la lámina de gráficos), §5 (eslogan en bloque; acento a sangre) y §8
  (Manzanitas toma el acento de la línea del tema).
- [iconography.md](iconography.md) §13 (D28 `swipe`, D29 `mano`).
- [package-and-tokens.md](package-and-tokens.md) §2.2 (`efeonceGraphicLine.lines`) e `icons.voiceByLine`.
- Biblioteca de recursos de MCM:
  [`MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md`](../../../../docs/operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md).
- Canon social de la contraportada (una conversión, ningún botón falso):
  [`2026-07-28-carousel-storytelling-platform-research.md`](../../../../docs/audits/social/2026-07-28-carousel-storytelling-platform-research.md).
- Registro cine: [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md);
  método del isotipo de Nexa: `.claude/rules/brand-photography.md`.
- Sub-línea hermana (no se mezcla): [glitch.md](glitch.md).
