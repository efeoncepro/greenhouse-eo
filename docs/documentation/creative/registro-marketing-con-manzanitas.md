# Registro Marketing con Manzanitas — registro complementario de La órbita

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-28 por Claude
> **Ultima actualizacion:** 2026-09-28 por Claude
> **Documentacion tecnica:** [ADR del registro Marketing con Manzanitas](../../architecture/MANZANITAS_REGISTER_DECISION_V1.md) · [Norma del registro](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md)
> **Manual de uso:** [Componer piezas de Marketing con Manzanitas](../../manual-de-uso/creative/componer-piezas-de-marketing-con-manzanitas.md)

> **⚠️ Este registro es SÓLO para piezas de Marketing con Manzanitas, y no reemplaza a La órbita: la complementa.**
> La línea gráfica de Efeonce sigue siendo [La órbita](./linea-grafica-efeonce.md) y manda en todo lo que este registro
> no dice. Lo propio del registro (la cabecera con la manzana en contorno, los formatos Pizarra, Escena, Lente y Recreo,
> la mano «Desliza» en su sitio fijo, la contraportada con la manzana a escala, los nueve gráficos y las tres láminas
> de texto denso) sólo se usa en piezas de Marketing con Manzanitas.

## Qué es

**Marketing con Manzanitas** (MCM) es la marca editorial del blog de Efeonce: **marketing explicado simple**, con
contenido que no pierde vigencia. El **registro Marketing con Manzanitas** (abreviado «registro MCM» o «registro
Manzanitas») es el conjunto de reglas, estilos y piezas que se suman a La órbita **sólo** para las piezas de esa marca:
carruseles, stories, portadas de blog y banners, miniaturas de YouTube y portadas del pódcast.

No es una línea nueva ni un reemplazo. El operador lo dejó dicho así el 2026-09-28: «esta línea gráfica no reemplaza
The Orbit […] sino que la complementa con un nuevo registro para marketing con Manzanitas». Ese mismo día aprobó todo el
registro sobre el canvas de la línea (versión 39): «Me encantan, queda aprobada toda la línea gráfica».

**Ojo con la palabra «registro».** La órbita ya la usa para la **fotografía** (los registros documental, puesta en
escena, respuesta y cine). Son cosas distintas: el registro Manzanitas es un registro de **marca editorial**, y dentro de
él las fotos siguen usando los registros fotográficos de Efeonce; en MCM, el de **cine**.

> Detalle técnico: [norma §1 Qué es y qué no es](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#1-qué-es-y-qué-no-es) ·
> [ADR](../../architecture/MANZANITAS_REGISTER_DECISION_V1.md) · canvas «Marketing con Manzanitas · Línea v1»,
> versión 39 ([claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG](https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG), privado) ·
> skill `efeonce-graphic-line` (`criteria.md` §3.4 y §8, `ledger.md` del 2026-09-28)

## Cómo se relaciona con La órbita y con Glitch

La órbita es la línea gráfica de Efeonce. Dos marcas editoriales de Efeonce la usan con identidad propia: **Glitch**,
el magazine semanal, con su sub-línea, y **Marketing con Manzanitas**, el blog, con este registro. Son hermanas y **no
se mezclan**: ninguna usa elementos de la otra.

| | La órbita | Registro Marketing con Manzanitas | Sub-línea Glitch |
|---|---|---|---|
| **Qué es** | la línea gráfica de Efeonce | un registro que la complementa, sólo para MCM | la sub-línea del magazine semanal |
| **La manzana** | no la tiene | **en contorno**, con tres puntos arriba (como una burbuja escribiendo) | **llena**, y es la esfera de Glitch |
| **La esfera** | la esfera de la órbita | la misma de La órbita: la manzana y sus puntos **no** son esferas | la manzana |
| **El color de acento** | el de la línea de servicio de la pieza | el de la **línea del tema** | el verde Glitch |
| **La cabecera** | — | el logo de MCM, siempre arriba a la izquierda | «EDICIÓN #N» con el logo de Glitch |
| **Lo propio** | la órbita, la lente, la voz, la firma (y las comparte) | formatos, «Desliza», contraportada a escala, gráficos y texto denso | la falla en bytes, la letra Guttery |

> Detalle técnico: [norma §1.2 MCM y Glitch](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#12-mcm-y-glitch-hermanos-que-no-se-mezclan) · [Línea gráfica de Glitch](./linea-grafica-glitch.md) (token `glitchLine`, contrato
> `efeonce.glitch-line`) · [La órbita](./linea-grafica-efeonce.md) · [ADR del registro](../../architecture/MANZANITAS_REGISTER_DECISION_V1.md)

## Qué toma de La órbita, sin cambios

Todo esto funciona igual que en cualquier pieza de Efeonce:

- **La voz pregunta y respuesta:** la pregunta chica, con el anillo abierto delante; la respuesta grande, de una a tres
  palabras, al menos tres veces más grande que la pregunta y cerrada con la esfera.
- **Una esfera y una órbita por pieza.** Ningún texto cruza la órbita.
- **La medida en la órbita** (la esfera avanza hasta el valor, con una estela corta) y **la lente**.
- **Los acentos de las cinco líneas de servicio** (Growth, Brand, Engine, Voice y Revenue), uno para papel y otro para
  navy.
- **La regla del acento:** se usa en gráficos y en textos de 24 px o más, siempre con contraste de al menos 3 a 1 contra
  su fondo. Nunca en texto más chico (ahí va navy sobre papel y blanco sobre navy) y **nunca como superficie**.
- **El eslogan sólo cierra**, en bloque con el logo de Efeonce: el logo arriba y el eslogan debajo.
- **La firma:** el logo de Efeonce centrado abajo; la burbuja de la dirección web sólo reemplaza al logo si el logo ya
  aparece dentro de la imagen.
- **Los íconos de la marca**, del catálogo de AXIS, en reposo y con la voz de la línea: Plastilina en Brand; Trazo en
  Growth, Engine y Revenue; Voice todavía no tiene voz definida.
- **Las superficies** navy y papel, con el texto en navy.
- **Las letras:** Bricolage Grotesque para la respuesta y las cifras, y Poppins para la pregunta y el texto.
- **El lenguaje fotográfico de Efeonce**, en el registro cine.

> Detalle técnico: [norma §2 Qué hereda de La órbita](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#2-qué-hereda-de-la-órbita) · componentes `EfeonceOrbit.Voice`, `EfeonceOrbit.Measure`, `EfeonceOrbit.Lens` y
> `EfeonceOrbit.Slogan` del DS «Efeonce — La órbita»
> ([claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc](https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc)) · tokens
> `efeonceGraphicLine.lines`, `efeonceGraphicLine.trajectory.measure`, `efeonceGraphicLine.color.dark` / `color.paper`,
> `efeonceGraphicLine.motion.layout.sloganOfLogo` / `sloganGapOfFont` y `efeonceGraphicLine.icons.voiceByLine` ·
> chequeos `answer-dominates-3x`, `one-sphere-per-piece`, `one-orbit-per-piece` y `accent-text-min-size` ·
> [manual de La órbita](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md)

## Los acentos van por la línea del tema

Una pieza de MCM toma el color de acento de la **línea de servicio a la que pertenece su tema**. Lo decidió el operador
el 2026-09-28: «el marketing con manzanitas ajusta sus acentos como el color de la manzana de los puntos de la orbita
etc como dice la línea gráfica que es por linea de negocios».

- **La línea la decide el tema, no la pieza.** Un carrusel sobre AEO o visibilidad en IA va en **Engine**; uno sobre
  creatividad, en **Brand**.
- **Qué toma el acento:** la manzana y sus tres puntos (en la cabecera, la portada y el cierre), el arco, la esfera, la
  barra o la cifra destacada de un gráfico, la palabra del eslogan y la voz del ícono «Desliza».
- **Qué no lo toma:** el texto del logo de MCM, que va en navy sobre papel y en blanco sobre navy.
- **Un solo selector.** Cada lámina tiene un único selector, **«Línea del tema»**: al cambiarlo, cambia todo a la vez.
- **Nunca** la manzana en un color fijo ni en el acento de otra línea.

> Detalle técnico: [norma §3](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#3-qué-es-propio-el-acento-de-la-línea-del-tema) · los acentos salen de `efeonceGraphicLine.lines` (`accentOnLight` sobre papel, `accentOnDark` sobre
> navy); al construir se toma el valor del token, nunca se transcribe. Referencia medida, sólo para reconocerlos:
>
> | Línea | Sobre papel | Sobre navy |
> |---|---|---|
> | Growth | `#0e8c82` | `#36c8bf` |
> | Brand | `#bb1954` | `#ff6500` |
> | Engine | `#0375db` | `#0375db` |
> | Voice | `#f83902` | `#f83902` |
> | Revenue (HubSpot) | `#8e1b82` | `#e86bd0` |

## La cabecera y la manzana

- El **logo de MCM** (la manzana en contorno con tres puntos arriba y el texto «Marketing con Manzanitas») va **siempre
  arriba a la izquierda**, en todos los formatos.
- **En la portada Pizarra y en la contraportada va sin manzana** (sólo el texto), porque ahí la manzana grande ya está
  en la lámina.
- **Sólo la manzana y los tres puntos toman el acento**; el resto del logo queda en navy o en blanco.
- **La manzana se ve entera:** los dos lóbulos, la hendidura, la hoja y el tallo. Puede salirse por un borde, pero un
  recorte que deja sólo la hoja y el tallo se leyó como «orejas de conejo» y quedó rechazado.
- **Los tres puntos no son esferas:** son el ADN de la familia, como las ventanas de la nave del logo de Efeonce.
- En la portada con foto, la pregunta va en una sola línea, para que la voz termine sobre la cabeza de la persona.

> Detalle técnico: [norma §4 Cabecera](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#4-cabecera) · en el carrusel de 1080 × 1350 el logo va en x 80, y 72, a 200 × 90 px; otras piezas usan 160 × 72,
> 180 × 81 o 240 × 108 según el formato. El SVG oficial tiene 25 trazos y los cuatro últimos (la manzana y los tres
> puntos) son los que toman el acento. Los SVG oficiales están en OneDrive `Alineación/5. Contenidos/13- Branding/SVG`
> y usan `<style>`: hay que pasar los colores a cada trazo antes de subirlos. Inventario completo en la
> [biblioteca de identidad gráfica de MCM](../../operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md).

## Los formatos de lámina

Una lámina de MCM puede ir en uno de tres formatos, y el cuarto, el Recreo, es la regla para mezclarlos en un carrusel.

| Formato | Qué es | Para qué sirve |
|---|---|---|
| **Pizarra** («Diseñado») | la lámina dibujada: papel o navy, la manzana, la voz y los pasos | portada, pasos, dato y cierre. **El dato con fuente y el cierre van siempre en Pizarra.** Es la única que lleva la manzana grande |
| **Escena** («Foto completa») | una fotografía a sangre, con la voz en el espacio que la foto le reserva y la firma sobre el lecho | portada con foto o lámina interior. Sin manzana grande ni órbita dibujada: **la luz de la foto es la órbita de la pieza** |
| **Lente** («Foto señalada») | la foto apagada afuera y a todo color dentro del círculo, para señalar a una persona o un objeto | sólo láminas interiores (la portada con foto es Escena). No se combina con otra órbita ni con el foco |
| **Recreo** | la mezcla de formatos dentro de un carrusel | que el carrusel respire entre láminas dibujadas y fotos |

**La Escena, en detalle.** La foto dice lo mismo que dice el texto, y el **lecho** (la zona donde se apoya la firma) sale
de la propia foto: es lo que de verdad hay entre la cámara y la persona, como la mesa donde Nexa revisa, la mesa del
cliente o la silla del visitante. Nunca se agrega. La firma va dentro de esa materia, con aire sobre su borde. Se
rechazaron como lecho una mesa negra mate en un estudio vacío, las cabezas del público, el dorso de un portátil, una
«consola» y un piso que cortaba las piernas. Cuando aparece Nexa, el isotipo de su traje se compone con el archivo
oficial y el modelo sólo lo termina sobre su silueta.

**La Lente, en detalle.** La foto se toma pensando en la lente: la cara y el objeto caben en el círculo fijo del
formato y nadie mira al lente.

**El Recreo, en detalle.**

- Si la portada es **Pizarra**, cerca de un tercio de las láminas lleva foto (unas 2 de 7).
- Si la portada es **Escena**, la foto ya es la promesa y las fotos llegan a casi la mitad (unas 3 de 7).
- Nunca dos láminas con foto seguidas, y nunca más de tres Pizarras seguidas.
- El dato con fuente y el cierre, siempre en Pizarra.
- Todas las fotos de un carrusel comparten registro y luz.
- La lámina que sigue a una foto retoma la voz: la foto nunca carga sola el argumento.

**Otras piezas.**

| Pieza | Cómo va |
|---|---|
| **Story** | una sola pieza, Escena o Pizarra (nunca las dos). Con foto: la voz en la banda alta y la firma centrada sobre la mesa, dentro de la zona segura |
| **Blog y banner** | una sola pieza, Escena o Pizarra. La foto se genera en 16:9 y se lleva a 1,9:1 (1200 × 630); la voz va en el lado oscuro y la firma puede ir abajo a la izquierda, cerrando la columna del texto |
| **YouTube** | la miniatura es una Escena 16:9 con el logo abajo a la izquierda |
| **Pódcast (1:1)** | la cabecera del programa en grande (420 px), porque la portada se ve a 160 px |

> Detalle técnico: [norma §5 Formatos](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#5-formatos) · tablero `Formatos` del canvas; la Lente es `EfeonceOrbit.Lens`; registro fotográfico
> [cine](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) · la zona segura de la story sigue
> pendiente (ver «Estado y pendientes»)

## La mano «Desliza»

La mano que invita a deslizar el carrusel tiene **un sitio fijo**, el mismo en todas las láminas que la llevan
(Pizarra, Escena y Lente): pegada al margen derecho y un poco más abajo en la portada que en las interiores.

- Nunca va junto a la voz cuando la voz va arriba, nunca en la fila de la firma y nunca sobre la persona o el objeto de
  la foto. La foto se toma con ese rincón en calma; si el sujeto lo ocupa, se rehace la toma.
- Va en reposo, sin esfera.
- **No va en la última lámina ni en la story.**
- Su voz cambia con la línea: en Brand es la mano de Plastilina; en Growth, Engine y Revenue es el Trazo de deslizar; en
  Voice, mientras se decide, va el Trazo.

> Detalle técnico: [norma §6](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#6-la-mano-desliza) · en 1080 × 1350, a 80 px del margen derecho (x 936, 64 × 64 px), a 1033 px del borde superior en la
> portada y a 985 px en los interiores. Íconos: Plastilina `mano` (D29) y Trazo `swipe` (D28), del catálogo de AXIS
> (`resolveIcon`) · la voz de Voice sigue pendiente (`voiceByLine.voice` vacío)

## La firma y el eslogan

- **Una sola altura de firma en todo el carrusel.** El logo de Efeonce va en el mismo lugar en Pizarra, Escena y Lente;
  en la Escena queda dentro de la mesa.
- **El eslogan sólo cierra:** en el cierre del carrusel, la story de cierre y el cierre del video, y su palabra final es
  la línea del tema («Empower your Engine», por ejemplo). **Nunca** en la portada, el blog, la miniatura ni el pódcast.
- En el cierre, el logo va grande para que el eslogan llegue al tamaño mínimo en que su palabra puede ir en el acento.
- En la lámina de la estratega, la burbuja de la dirección web sobre la mesa **no pasa el contraste**, así que esa
  lámina sigue firmando con el logo.

> Detalle técnico: [norma §7 Firma y eslogan](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#7-firma-y-eslogan) · logo de Efeonce arriba en y 1202 de 1350 (216 × 51 px, a 97 px del borde inferior). En el cierre,
> logo de 400 px para que el eslogan llegue a 24 px; el eslogan mide el 64 % del ancho del logo y va separado 1,35 veces
> su fuente; el bloque termina en la línea de firma (y 1253). La burbuja sobre la mesa de la estratega dio 3,80:1 en su
> 1 % peor.

## La contraportada

Aprobada el 2026-09-28 como **«A a escala»**. Es una pieza social, no una hoja: pide **una sola conversión**, un
comentario ligado a algo que quien lee puede hacer hoy.

- **La voz:** la pregunta, una respuesta accionable y una bajada de una línea que empieza con «En los comentarios: …».
  En Engine: «¿Te nombra la IA? Pregúntale.» y «En los comentarios: cuéntanos si te nombró.». En Brand (Creative
  Workflows), la bajada es «En los comentarios: el primer ingrediente de tu receta.».
- **La manzana vuelve a escala:** la de la portada, 3,8 veces más grande, recortada por arriba y por la derecha, de modo
  que su cuerpo con los tres puntos queda como una burbuja escribiendo, en el acento de la línea y sin astillas del tallo
  en el borde. La cabecera va sin manzana.
- **Nada simula un botón**, porque es un post orgánico. Guardar, compartir y enviar se piden en el texto del post cuando
  hacen falta, nunca los cuatro a la vez.

**Por qué no van los íconos sociales:** una conversión por carrusel; los botones ya existen en la interfaz de LinkedIn;
y un comentario con sustancia pesa más. Se mide en Metricool: comentarios con sustancia, guardados, envíos y clics al
grader (con UTM, cuando aplica).

**Caminos descartados.** La **B** (con la órbita, más sutil) quedó como prueba. La **C** (el acento a sangre, como fondo)
se **rechazó** por saturación y porque el logo positivo trae el isotipo azul: el acento nunca es superficie.

> Detalle técnico: [norma §8 Contraportada](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#8-contraportada) · 100 px de aire bajo la manzana y 120 px sobre el logo. A 390 px de ancho (el teléfono) la respuesta
> queda en 69 px, la bajada en 11 px, el logo en 144 px y el eslogan en 9 px · tablero `Cierre-acciones` del canvas

## Las láminas con gráficos

El registro tiene **nueve láminas interiores con gráficos**, aprobadas el 2026-09-28. Todas siguen la misma gramática:

- **Son Pizarra** (papel o navy), con la cabecera, «Desliza» y la firma en su sitio.
- **Se calculan desde su dato.** La lámina recibe los números y calcula sola los largos, las posiciones, la esfera, lo
  destacado y, cuando es un número, la respuesta. Nada se dibuja a mano.
- **Un solo acento, sólo donde está la idea.** Lo demás va en navy y gris.
- **Las barras salen de su número y parten de cero.**
- **Toda cifra lleva su fuente.** Mientras no está la real, el pie dice «Ejemplo ilustrativo · Fuente: [FUENTE, AÑO]».
  Sin fuente, la cifra no sale.
- **Una esfera por pieza.** En la medida y en la tendencia la esfera **es** el dato, así que esas dos no llevan la voz
  con su esfera: llevan sólo la pregunta arriba. Las otras siete cierran con la voz.
- **No hay dona de partes.** Tres segmentos en un anillo serían un arco que se llena, y la órbita recorre, nunca se llena.
  La única dona es la medida de la órbita; las partes (hasta tres) van en una barra al 100 %.
- **Ningún círculo suelto.** Los conteos van en cuadrados y el Venn en discos translúcidos sin anillo, para que nada se
  lea como esfera ni como órbita.

**Cómo elegir el gráfico: por la pregunta que responde.**

| # | Gráfico | Qué pregunta responde | Elígelo cuando… | Qué destaca | Respuesta | Fondo |
|---|---|---|---|---|---|---|
| 1 | **Medida en la órbita** | ¿Qué parte del total? | tienes un solo porcentaje de 0 a 100 | la esfera, que avanza hasta el valor | no lleva voz: la esfera es el dato | navy |
| 2 | **Ranking** | ¿Quién va primero y cuánto nos separa? | comparas a tu marca con el líder y con otros | tu marca en el acento; el líder en navy | «N veces» (el líder dividido por tu marca), sale del dato | papel |
| 3 | **Antes y después** | ¿Cuánto cambió? | tienes un valor de antes y uno de después | una llave en el acento con la diferencia («+140 %») | en palabras («Te citan», en el ejemplo) | papel |
| 4 | **Tendencia** | ¿Hacia dónde va? | tienes doce valores mensuales | el último tramo, que termina en la esfera, y el último valor | no lleva voz: la esfera es el dato | navy |
| 5 | **Partes de un todo** | ¿De qué está hecho? | el total se reparte en hasta tres partes | la parte que importa, en el acento | «1 de N» (el total dividido por la parte destacada), sale del dato | papel |
| 6 | **De cada 100** | ¿Cuántos de cada 100? | quieres que un porcentaje se lea como casos contados | los cuadrados llenos, en el acento | «N de 100», sale del dato | navy |
| 7 | **Venn de tres** | ¿Dónde se cruzan tres cosas? | explicas un concepto, sin cifras | el centro donde se cruzan las tres | «Al centro» | papel |
| 8 | **Matriz 2 × 2** | ¿Qué hago primero? | priorizas tareas por esfuerzo e impacto | el cuadrante «Hazlo ya» y la tarea en foco | en palabras («Las FAQ», en el ejemplo) | navy |
| 9 | **Embudo** | ¿Dónde se pierde? | tienes los pasos de un proceso en orden, con su valor | el paso que peor convierte | en palabras («Al comprar», en el ejemplo) | papel |

**Dos que se parecen.** La medida y «De cada 100» usan el mismo tipo de número (de 0 a 100). La medida responde qué
parte del total es, con la esfera en la órbita; «De cada 100» lo muestra como cien cuadrados contados. El **Venn** es el
único que no lleva dato ni fuente: es un concepto.

**Las respuestas.** Las que son palabras se escriben y se editan en la lámina; las que son números salen del dato.

> Detalle técnico: [norma §9](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#9-láminas-interiores-con-gráficos) (guía de selección y una ficha por gráfico) · tableros `Grafico-1` a `Grafico-9`, `Graficos-resumen` («cómo funcionan») y `Graficos-lineas`
> («acentos por línea») del canvas. La lámina recibe `datos` (un arreglo o un objeto) o `valor` (entero de 0 a 100);
> chequeos `bars-from-values`, `figures-with-source` e `illustrative-data-marked`. Lo que no destaca va en navy
> `#023c70` y gris `#c9d2dc` (el `before` de la receta de deck `decision-chart`); sobre navy, en
> `rgba(207, 228, 250, 0.22)` y el texto suave en `#cfe4fa`. La geometría de la medida sale de `measureSvg` de AXIS y se
> verificó contra él en cinco valores (0,05 / 0,38 / 0,62 / 0,9 / 1). Medidas de cada gráfico en la
> [norma del registro](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) y en el
> [manual de uso](../../manual-de-uso/creative/componer-piezas-de-marketing-con-manzanitas.md#paso-4--elige-el-gráfico-por-la-pregunta)

## Las láminas de texto denso

Para **explicar un concepto complejo** hay tres láminas, aprobadas el 2026-09-28. En las tres la voz va arriba y el
texto debajo.

| Lámina | Fondo | Qué lleva | Ejemplo aprobado |
|---|---|---|---|
| **Concepto y tres puntos** | papel | un párrafo y tres puntos, cada uno con su número en el acento, un título y un texto | «¿Qué es el AEO? Que te citen.» |
| **Comparación en dos columnas** | navy | dos encabezados (el segundo en el acento), cuatro filas y un remate | «¿SEO o AEO? Las dos.» — «Sin SEO, la IA no te encuentra. Sin AEO, no te cita.» |
| **Paso a paso** | papel | cuatro pasos, cada uno con su número en el acento, un título y un texto | «¿Cómo empiezo con el AEO? En 4 pasos.» |

> Detalle técnico: [norma §10](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#10-láminas-de-texto-denso) · tableros `Texto-1` a `Texto-3`. Voz en y 216 con la respuesta a 130 px; en un teléfono de 390 px el
> cuerpo queda entre 10 y 11,5 px (28 a 32 px en la lámina) y los rótulos en 9 px (24 px en la lámina)

## Qué está aprobado y qué no

| Pieza o decisión | Estado |
|---|---|
| Formatos Pizarra, Escena, Lente y Recreo | **aprobados** el 2026-09-28 (canvas, versión 39) |
| Cabecera y firma | **aprobadas** el 2026-09-28 |
| Acentos por línea del tema | **aprobados** el 2026-09-28 |
| Contraportada «A a escala» | **aprobada** el 2026-09-28 |
| Los nueve gráficos y las tres láminas de texto denso | **aprobados** el 2026-09-28 |
| Contraportada B (con la órbita) | quedó como **prueba** |
| Contraportada C (el acento a sangre) | **rechazada** |
| Portada Pizarra con la mano en respuesta (dos esferas) | **en estudio**, pendiente de decisión |
| Íconos de Trazo `republicar` y `enviar` | en **borrador** |
| Personas del equipo en fotos de cine para redes | **no aprobado** todavía |
| Las recetas de gráficos para piezas de Efeonce fuera de MCM | **no aprobado**: hoy sólo valen para MCM |
| El registro en el sistema de diseño AXIS | **todavía no existe**: es el plan (ver abajo) |

## Reglas que nunca se rompen

- **El registro no reemplaza a La órbita.** Lo que el registro no dice, lo dice La órbita.
- **Nada de Glitch en MCM, ni de MCM en Glitch:** ni la manzana llena, ni el verde, ni los bytes, ni Guttery, ni la
  cabecera «EDICIÓN #N».
- **La manzana va en el acento de la línea del tema**, nunca en un color fijo ni en el de otra línea.
- **Una esfera por pieza.** Los tres puntos de la manzana no cuentan como esferas.
- **El acento nunca es superficie** y nunca va en texto de menos de 24 px.
- **Sin fuente, la cifra no sale**; los datos de muestra se marcan como ejemplo.
- **El eslogan sólo cierra.**
- **La contraportada pide una sola conversión** y nada simula un botón.
- **El lecho de una Escena sale de la foto**, nunca se agrega.

> Detalle técnico: [norma §11 Nunca](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#11-nunca) · [§12 QA antes de entregar](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#12-qa-antes-de-entregar)

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Norma del registro (fuente de verdad) | [`MANZANITAS_REGISTER_V1.md`](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) |
| Decisión (ADR) | [`MANZANITAS_REGISTER_DECISION_V1.md`](../../architecture/MANZANITAS_REGISTER_DECISION_V1.md) |
| Canvas «Marketing con Manzanitas · Línea v1» (versión 39, privado) | [claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG](https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG): tableros `Formatos`, `Grafico-1…9`, `Texto-1…3`, `Graficos-resumen`, `Graficos-lineas`, `Cierre-acciones`, `CW-*`, `Escena-*`, `Lente-interior`, `Story-cierre`, `Podcast-1x1` y `YouTube-cierre` |
| DS «Efeonce — La órbita» (componentes de la voz, la medida, la lente y el eslogan) | [claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc](https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc) |
| Logos SVG oficiales de MCM | OneDrive `Alineación/5. Contenidos/13- Branding/SVG` |
| Inventario de la identidad gráfica de MCM | [biblioteca de MCM](../../operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md) |
| Reglas para agentes | skill `efeonce-graphic-line` (`criteria.md` §3.4 y §8, `ledger.md` del 2026-09-28) |
| Cómo componer una pieza | [Componer piezas de Marketing con Manzanitas](../../manual-de-uso/creative/componer-piezas-de-marketing-con-manzanitas.md) |
| La línea madre | [La órbita](./linea-grafica-efeonce.md) |
| La sub-línea hermana (no se mezcla) | [Glitch](./linea-grafica-glitch.md) |

## Estado y pendientes

**Estado:** aprobado el 2026-09-28 en el canvas de la línea (versión 39). Hoy vive en el canvas, en el DS «Efeonce — La
órbita» y en la skill `efeonce-graphic-line`: **nada del registro está todavía en AXIS**.

Pendientes (los decide el operador; nadie los decide por su cuenta):

| # | Pendiente | Qué falta |
|---|---|---|
| 1 | La voz del ícono «Desliza» en la línea Voice | no hay voz definida; mientras, se usa el Trazo |
| 2 | Si los gráficos cuentan para «nunca más de tres Pizarras seguidas» | la recomendación es que sí |
| 3 | La portada Pizarra con la mano en respuesta (dos esferas) | decidir si queda como excepción registrada o vuelve a reposo |
| 4 | La zona segura de la story | la firma de la Escena story (entre y 1620 y 1671) cae en la franja de la interfaz; falta fijar la franja (desde y 1580 o el 87 % que usa AXIS) |
| 5 | El texto del cierre de la story | hoy es un «Guárdala» genérico |
| 6 | Personas del equipo en fotos de cine para redes | no está aprobado; la estratega de la Escena interior es una persona por rol, generada |
| 7 | Íconos de Trazo `republicar` y `enviar` | siguen en borrador |
| 8 | Si las recetas de gráficos pasan a La órbita para piezas de Efeonce | hoy están aprobadas sólo para MCM |
| 9 | El navy del texto del logo de Manzanitas, que Glitch declara suyo en su wordmark | hoy va el del archivo oficial |
| 10 | El acento de un tema de Revenue en Salesforce | sin decidir |

### Lo que viene: el registro en AXIS (propuesto, por TASK-1936)

El plan, todavía sin ejecutar, sigue el mismo camino que ya recorrió Glitch:

- **En AXIS:** una decisión (ADR) propia; un token `manzanitasRegister` que toma de La órbita por referencia las líneas,
  las superficies, la voz, la trayectoria y el eslogan, y que se prueba aislado de Glitch y de La órbita; los archivos de
  la marca (el logo con la manzana y los puntos preparados para tomar el acento, el texto solo y la manzana en contorno);
  las nueve recetas de gráficos como un módulo que convierte un dato en una imagen con sus chequeos; un contrato
  `efeonce.manzanitas-register` en prueba (`candidate`) que revisa la pieza y se niega a resolverla si algo falla; y una
  página del Lab en `/references/manzanitas/`.
- **Después, en Greenhouse** (tareas aparte): actualizar las versiones de AXIS que usa Greenhouse, un catálogo
  `manzanitas` en el Artifact Composer para componer carruseles desde datos y que la skill use el paquete.

Publicar en AXIS y crear versiones es un cambio externo: requiere la autorización explícita del operador. Hasta que
exista, las piezas se componen en el canvas, como explica el
[manual de uso](../../manual-de-uso/creative/componer-piezas-de-marketing-con-manzanitas.md).

> Detalle técnico: [norma §13 Pendientes](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#13-pendientes-del-operador) y [§14 Del canvas a AXIS](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#14-del-canvas-a-axis-estado-y-plan) · plan completo en el [ADR del registro](../../architecture/MANZANITAS_REGISTER_DECISION_V1.md) ·
> precedente: [ADR de Glitch](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md) (token `glitchLine`, contrato
> `efeonce.glitch-line`, `pnpm glitch:resolve`, Lab `/references/glitch/`) · AXIS ADR previsto
> `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`, contrato `efeonce.manzanitas-register` 0.1.0 y
> comando `pnpm manzanitas:resolve` (todavía no existen)
