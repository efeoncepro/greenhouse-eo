# Componer piezas de Marketing con Manzanitas — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-28 por Claude
> **Ultima actualizacion:** 2026-09-28 por Claude
> **Modulo:** Creative · Marketing con Manzanitas (registro complementario de «La órbita»)
> **Ruta en portal:** no aplica — hoy las piezas se componen en el canvas de la línea con los componentes del DS «Efeonce — La órbita»; la composición desde datos (AXIS y Artifact Composer) llega por una task aparte
> **Documentacion tecnica:** [ADR del registro](../../architecture/MANZANITAS_REGISTER_DECISION_V1.md) · [Norma del registro](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md)
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/registro-marketing-con-manzanitas.md) · [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md) · [Producir una foto de marca Efeonce](../marketing/fotografia-de-marca-efeonce.md)

> **⚠️ Este manual es SÓLO para piezas de Marketing con Manzanitas.** El registro complementa a La órbita, no la
> reemplaza: todo lo que aquí no se dice, lo dice [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md).
> Para Glitch usa [Componer piezas de Glitch](./componer-piezas-glitch.md): los dos no se mezclan.

> **Hoy se compone en el canvas, no con un comando.** Nada del registro está todavía en AXIS: no hay token, contrato,
> comando ni plantilla del Artifact Composer. Las piezas se arman en el canvas «Marketing con Manzanitas · Línea v1» con
> los componentes del DS «Efeonce — La órbita». Cuando el registro llegue a AXIS y a Greenhouse (por TASK-1936 y sus follow-ups),
> este manual se actualiza.

## Para qué sirve

Explica cómo armar un **carrusel de LinkedIn** de Marketing con Manzanitas (MCM), de 1080 × 1350, con su registro:
elegir la línea del tema, mezclar los formatos con el Recreo, elegir cada gráfico por la pregunta que responde,
preparar el dato con su fuente, cerrar con la contraportada y revisar antes de entregar. Al final resume las otras
piezas del registro: story, portada de blog y banner, miniatura de YouTube y portada del pódcast.

## Antes de empezar

- **Confirma que la pieza es de MCM.** Si es otra pieza de Efeonce, usa
  [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md); si es de Glitch,
  [Componer piezas de Glitch](./componer-piezas-glitch.md).
- **Abre el canvas** [«Marketing con Manzanitas · Línea v1»](https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG)
  (privado), **versión 39**, la aprobada. Los tableros que vas a usar:

  | Tablero | Para qué |
  |---|---|
  | `Formatos` | ver Pizarra, Escena, Lente y el Recreo |
  | `Grafico-1` a `Grafico-9` | las nueve láminas con gráficos |
  | `Graficos-resumen` | «cómo funcionan» los gráficos |
  | `Graficos-lineas` | los «acentos por línea» de los gráficos |
  | `Texto-1` a `Texto-3` | las tres láminas de texto denso |
  | `Cierre-acciones` | la contraportada |
  | `CW-*` | el carrusel de Creative Workflows (línea Brand) |
  | `Escena-*` y `Lente-interior` | láminas con foto |
  | `Story-cierre`, `Podcast-1x1` y `YouTube-cierre` | las otras piezas |

- **Abre el DS** [«Efeonce — La órbita»](https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc): ahí están los componentes
  `EfeonceOrbit.Voice` (la voz), `EfeonceOrbit.Measure` (la medida), `EfeonceOrbit.Lens` (la lente) y
  `EfeonceOrbit.Slogan` (el eslogan).
- **Ten el tema del carrusel** y a qué línea de servicio pertenece (paso 1).
- **Ten cada cifra con su fuente y su año.** Mientras no la tengas, la lámina la marca como ejemplo (paso 5); sin fuente,
  la cifra no sale.
- **Ten los logos oficiales:** los SVG de MCM están en OneDrive `Alineación/5. Contenidos/13- Branding/SVG`. Usan
  `<style>`: pasa los colores a cada trazo antes de subirlos. El inventario está en la
  [biblioteca de identidad gráfica de MCM](../../operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md).
- **Si una lámina lleva foto,** se produce con el lenguaje fotográfico de Efeonce, en el registro cine:
  [Producir una foto de marca Efeonce](../marketing/fotografia-de-marca-efeonce.md) (`pnpm foto:doctor`,
  `pnpm foto:prompt`, `pnpm foto:validar`; nunca armes el prompt a mano).
- **Si trabajas con un agente,** pídele que cargue la skill `efeonce-graphic-line` (`criteria.md` §3.4 y §8, y el
  `ledger.md` del 2026-09-28).

## Paso a paso — armar un carrusel

### Paso 1 · Elige la línea del tema

La línea la decide **el tema**, no la pieza. Como el carrusel tiene un solo tema, todas sus láminas llevan la misma
línea.

| Si el tema es… | Línea |
|---|---|
| AEO o visibilidad en IA | **Engine** |
| creatividad | **Brand** |
| otro tema | la línea de servicio a la que pertenece: Growth, Brand, Engine, Voice o Revenue |

En cada lámina del canvas pon el selector **«Línea del tema»** en esa línea. Es el único selector y cambia todo a la
vez: la manzana y sus tres puntos, el gráfico, la palabra del eslogan y la voz del ícono «Desliza». No cambies colores
a mano.

Si la línea es **Voice**, el ícono «Desliza» todavía no tiene voz propia: mientras se decide, usa el Trazo.

### Paso 2 · Arma la secuencia con el Recreo

1. **Decide la portada:** Pizarra (la lámina dibujada, con la manzana grande) o Escena (una foto a sangre).
2. **Reparte las fotos:**
   - con portada **Pizarra**, cerca de un tercio de las láminas lleva foto (unas 2 de 7);
   - con portada **Escena**, casi la mitad (unas 3 de 7), porque la foto ya es la promesa.
3. **Revisa las reglas del Recreo:**
   - nunca dos láminas con foto seguidas;
   - nunca más de tres Pizarras seguidas (si los gráficos cuentan o no está pendiente; mientras, la recomendación es
     contarlos);
   - el dato con fuente y el cierre, siempre en Pizarra;
   - todas las fotos del carrusel con el mismo registro y la misma luz;
   - la lámina que sigue a una foto retoma la voz.

### Paso 3 · Arma la portada

- **Portada Pizarra:** la cabecera **sin manzana** (sólo el texto «Marketing con Manzanitas»), porque la manzana
  grande está en la lámina; la voz con la pregunta y la respuesta, y «Desliza» en su sitio de portada.
- **Portada Escena:** la foto a sangre; la cabecera con la manzana arriba a la izquierda; la pregunta **en una sola
  línea**, para que la voz termine sobre la cabeza de la persona; la firma dentro del lecho de la foto; y «Desliza» en
  su sitio de portada.
- En las dos: **sin eslogan** (el eslogan sólo cierra) y **sin Lente** (la portada con foto es Escena).

### Paso 4 · Elige el gráfico por la pregunta

Para cada lámina con un dato, parte por la pregunta que quieres responder:

| Si la pregunta es… | Usa | Necesitas | Qué va en el acento | La respuesta | Fondo |
|---|---|---|---|---|---|
| ¿Qué parte del total? | **1 · Medida en la órbita** | `valor`, de 0 a 100 | la esfera y su estela | no lleva voz: la esfera es el dato | navy |
| ¿Quién va primero y cuánto nos separa? | **2 · Ranking** | `datos`: cada barra con `label`, `v` y el `rol` (`lider` o `tu`) | tu marca (rótulo en negrita y cifra en el acento); el líder en navy, el resto gris | «N veces» = líder ÷ tu marca, redondeado | papel |
| ¿Cuánto cambió? | **3 · Antes y después** | `datos`: `antes` y `despues` como índice (antes = 100) | la llave que marca la diferencia («+140 %») | en palabras («Te citan», en el ejemplo) | papel |
| ¿Hacia dónde va? | **4 · Tendencia** | `datos`: 12 valores mensuales | el último tramo, que termina en la esfera, y el último valor | no lleva voz: la esfera es el dato | navy |
| ¿De qué está hecho? | **5 · Partes de un todo** | `datos`: hasta 3 partes con `label`, `v` y `tono` (`navy`, `gris` o `acento`) | la parte destacada | «1 de N» = total ÷ la parte destacada | papel |
| ¿Cuántos de cada 100? | **6 · De cada 100** | `valor`, de 0 a 100 | los cuadrados llenos | «N de 100» | navy |
| ¿Dónde se cruzan tres cosas? | **7 · Venn de tres** | el concepto (sin dato ni fuente) | el centro donde se cruzan las tres | «Al centro» | papel |
| ¿Qué hago primero? | **8 · Matriz 2 × 2** | `datos`: tareas con `label`, `esfuerzo` e `impacto` de 0 a 1, y `foco` en la que importa | el cuadrante «Hazlo ya» y la tarea en foco | en palabras («Las FAQ», en el ejemplo) | navy |
| ¿Dónde se pierde? | **9 · Embudo** | `datos`: los pasos en orden, con `label` y `v` | el paso con peor conversión (barra y %) | en palabras («Al comprar», en el ejemplo) | papel |

Si lo que quieres explicar es un concepto sin cifras, usa el **Venn** o una lámina de **texto denso** (paso 6).

Qué tiene cada gráfico, para revisarlo en el canvas:

- **Medida:** la esfera en el valor × 360° desde las 12, en sentido horario, con una estela de 50° y la marca de
  partida; al 100 % vuelve arriba y se queda; al 0 %, queda en la partida sin estela. La cifra va grande (230 px; 170 px
  al 100 %) con un rótulo corto dentro del anillo («te nombran» en el canvas). La geometría sale de `measureSvg` de AXIS.
- **Ranking:** barras de 44 px, de 760 px como máximo, con sus cifras.
- **Antes y después:** dos columnas; la de antes en gris y la de después en navy.
- **Tendencia:** sin rejilla, sólo la base; la línea en blanco, el primer valor suave y el último en el acento; los meses
  a 24 px.
- **Partes de un todo:** una barra al 100 % con 6 px entre partes y una leyenda de tres columnas.
- **De cada 100:** 10 × 10 cuadrados redondeados, llenos por filas, con una clave de dos estados («sin clic / con
  clic» en el canvas).
- **Venn:** tres discos translúcidos en navy, sin anillo; los rótulos van fuera de los discos.
- **Matriz 2 × 2:** los ejes al centro y los cuadrantes «Hazlo ya», «Planifícalo», «Si sobra tiempo» y «Evítalo»; las
  tareas en píldoras; la tarea en foco con fondo en el acento y el texto en navy oscuro, en negrita.
- **Embudo:** barras centradas con su valor y una columna «Pasa» con la conversión de cada paso.

En los nueve: son Pizarra, llevan la cabecera, «Desliza» en su sitio interior y la firma en su altura. La medida y la
tendencia llevan sólo la pregunta arriba (Poppins 300 a 44 px, en y 222). Las otras siete cierran con la voz (respuesta
de 150 px y pregunta de 45 px, en y 842, con un ancho de 820 px) y la línea de la fuente en y 1068. Los rótulos van
entre 24 y 26 px y las cifras en Bricolage 760.

### Paso 5 · Prepara el dato con su fuente

1. **Escribe el dato, no el dibujo.** Cada lámina de gráfico recibe `datos` (un arreglo o un objeto) o `valor` (un
   entero de 0 a 100) y calcula sola los largos, las posiciones, la esfera, lo destacado y, cuando es un número, la
   respuesta. No dibujes barras ni muevas la esfera a mano: las barras salen de su número y parten de cero.
2. **Pon la fuente.** El pie dice «Fuente: [FUENTE, AÑO]». Si todavía no tienes el dato real, la lámina lleva
   «Ejemplo ilustrativo · Fuente: [FUENTE, AÑO]» hasta que lo tengas. **Sin fuente, la cifra no sale.** El Venn es la
   única excepción: no lleva dato ni fuente.
3. **Escribe la respuesta si es en palabras.** Las respuestas en palabras son texto y se editan en la lámina (una a
   tres palabras); las numéricas («N veces», «1 de N», «N de 100») salen del dato y no se escriben a mano.
4. **Un solo acento, sólo donde está la idea.** Lo demás queda en navy y gris sobre papel; sobre navy, lo que no destaca
   va tenue y el texto suave, más claro.

### Paso 6 · Si hay que explicar un concepto, usa una lámina de texto denso

La voz va arriba (respuesta de 130 px, en y 216) y el texto debajo.

| Lámina | Fondo | Qué lleva | Ejemplo |
|---|---|---|---|
| **Concepto y tres puntos** | papel | un párrafo de 32 px y tres puntos: número en el acento (Bricolage 56), título (30, peso 600) y texto (28) | «¿Qué es el AEO? Que te citen.» |
| **Comparación en dos columnas** | navy | dos encabezados en Bricolage 60 (el segundo en el acento), cuatro filas (rótulo de 24, peso 600, suave, y celdas de 30) y un remate de 28 px | «¿SEO o AEO? Las dos.» — «Sin SEO, la IA no te encuentra. Sin AEO, no te cita.» |
| **Paso a paso** | papel | cuatro pasos: número en el acento (56), título (30) y texto (28) | «¿Cómo empiezo con el AEO? En 4 pasos.» |

Mírala a 390 px de ancho, el tamaño de un teléfono: el texto queda entre 10 y 11,5 px y los rótulos en 9 px.

### Paso 7 · Láminas con foto: Escena y Lente

**Escena (foto completa):**

- La foto dice lo mismo que dice el texto y va en el registro cine.
- No lleva manzana grande ni órbita dibujada: **la luz de la foto es la órbita de la pieza**.
- El **lecho** sale de la foto: es lo que de verdad hay entre la cámara y la persona (la mesa donde Nexa revisa, la
  mesa del cliente, la silla del visitante). Nunca lo agregues. La firma va dentro de esa materia, con aire sobre su
  borde.
- Si aparece Nexa, el isotipo de su traje se compone con el archivo oficial y el modelo sólo lo termina sobre su
  silueta.

**Lente (foto señalada):**

- Sólo en láminas interiores, para señalar a una persona o un objeto.
- No se combina con otra órbita ni con el foco.
- La foto se toma para la lente: la cara y el objeto caben en el círculo fijo del formato y nadie mira al lente.

**En las dos:**

- El rincón de «Desliza» queda en calma: si la persona o el objeto lo ocupa, se rehace la toma.
- No uses personas del equipo en fotos de cine para redes: todavía no está aprobado (la estratega de la Escena
  interior es una persona por rol, generada).

### Paso 8 · Cierra con la contraportada: una sola conversión

1. **Pizarra**, con la cabecera **sin manzana**.
2. **La manzana a escala:** la de la portada, 3,8 veces más grande, recortada por arriba y por la derecha, de modo que su
   cuerpo con los tres puntos quede como una burbuja escribiendo, en el acento de la línea y sin astillas del tallo en el
   borde. Deja 100 px de aire bajo la manzana y 120 px sobre el logo.
3. **La voz pide una sola cosa:** la pregunta, una respuesta accionable y una bajada de una línea que empiece con «En los
   comentarios: …». Ejemplos aprobados:
   - Engine: «¿Te nombra la IA? Pregúntale.» + «En los comentarios: cuéntanos si te nombró.»
   - Brand (Creative Workflows): bajada «En los comentarios: el primer ingrediente de tu receta.»
4. **Nada simula un botón.** Ni íconos sociales ni botones dibujados: si hace falta pedir guardar, compartir o enviar, se
   pide en el texto del post, y nunca los cuatro a la vez.
5. **La firma con el eslogan:** el logo de Efeonce de 400 px con el eslogan debajo (64 % del ancho del logo, a 24 px),
   con la palabra de la línea en su acento; el bloque termina en la línea de firma (y 1253).
6. **Sin «Desliza»:** es la última lámina.

Después de publicar, se mide en Metricool: comentarios con sustancia, guardados, envíos y clics al grader por UTM cuando
aplique.

### Paso 9 · Revisa antes de entregar

- [ ] **Acento:** todas las láminas en la línea del tema; la manzana, los puntos, el gráfico, la palabra del eslogan y
  la voz de «Desliza» cambiaron juntos con el selector; nada en un color fijo ni en el de otra línea.
- [ ] **Contraste:** el acento mide al menos 3:1 contra su fondo; no hay texto en el acento de menos de 24 px (ahí va
  navy sobre papel y blanco sobre navy); el acento no es fondo de ninguna lámina.
- [ ] **Una esfera por pieza:** la medida y la tendencia no llevan la voz con su esfera; la Lente no se combina con otra
  órbita; los tres puntos de la manzana no cuentan como esfera.
- [ ] **Voz:** respuesta de una a tres palabras y al menos tres veces más grande que la pregunta; ningún texto cruza la
  órbita.
- [ ] **«Desliza»:** en su sitio fijo (x 936, 64 × 64 px; en y 1033 en la portada y en y 985 en las interiores), en
  reposo; nunca junto a la voz arriba, en la fila de la firma, sobre la persona o el objeto, en la última lámina ni en
  la story.
- [ ] **Firma:** el logo de Efeonce en la misma altura en todas las láminas (arriba en y 1202, 216 × 51 px); la burbuja
  de la dirección web sólo si el logo ya está en la imagen y pasa el contraste de La órbita (4,5:1); el eslogan sólo en
  el cierre.
- [ ] **Cabecera:** el logo de MCM arriba a la izquierda (x 80, y 72, 200 × 90 px); sin manzana en la portada Pizarra y
  en la contraportada; la manzana, cuando va, se ve entera.
- [ ] **Fuente:** cada cifra con «Fuente: [FUENTE, AÑO]»; los datos de muestra marcados «Ejemplo ilustrativo»; ninguna
  cifra sin fuente.
- [ ] **Gráficos:** las barras salen de su número y parten de cero; un solo acento; ninguna dona de partes; ningún
  círculo suelto.
- [ ] **Recreo:** no hay dos fotos seguidas ni más de tres Pizarras seguidas; el dato con fuente y el cierre van en
  Pizarra; las fotos comparten registro y luz.
- [ ] **Contraportada:** una sola conversión y nada que simule un botón.
- [ ] **Nada de Glitch:** ni la manzana llena, ni el verde, ni los bytes, ni Guttery, ni la cabecera «EDICIÓN #N».
- [ ] **En el teléfono:** mira cada lámina a 390 px de ancho. Como referencia, en la contraportada la respuesta queda en
  69 px, la bajada en 11 px, el logo en 144 px y el eslogan en 9 px.

Componer no es publicar: publicar requiere la autorización del operador, y este manual no la reemplaza.

## Otras piezas del registro

| Pieza | Formato | Cómo va |
|---|---|---|
| **Story** | una sola pieza, Escena o Pizarra (nunca las dos) | con foto, la voz en la banda alta y la firma centrada sobre la mesa, dentro de la zona segura; sin «Desliza»; el eslogan sólo en la story de cierre. La zona segura y el texto del cierre están pendientes |
| **Portada de blog y banner** | una sola pieza, Escena o Pizarra | la foto se genera en 16:9 y se lleva a 1,9:1 (1200 × 630); la voz en el lado oscuro; la firma puede ir abajo a la izquierda, cerrando la columna del texto; sin eslogan |
| **Miniatura de YouTube** | Escena 16:9 | el logo abajo a la izquierda; sin eslogan (el eslogan va en el cierre del video) |
| **Portada del pódcast** | 1:1 | la cabecera del programa en grande (420 px), porque la portada se ve a 160 px; sin eslogan |

## Qué significan los estados y las señales

**Estados de las piezas:**

| Estado | Qué significa |
|---|---|
| **Aprobado** (2026-09-28, canvas versión 39) | se usa como pieza final: formatos Pizarra, Escena, Lente y Recreo; cabecera y firma; acentos por línea; contraportada «A a escala»; los nueve gráficos y las tres láminas de texto denso |
| **Prueba** | se conserva para comparar, no se usa: la contraportada B, con la órbita |
| **Rechazado** | no se usa: la contraportada C (el acento a sangre) y el recorte de la manzana que deja sólo la hoja y el tallo |
| **En estudio** | todavía no es canon: la portada Pizarra con la mano en respuesta (dos esferas) |
| **Borrador** | no se usa en una pieza final: los íconos de Trazo `republicar` y `enviar` |
| **Pendiente** | lo decide el operador (ver «Pendientes») |
| **Próximamente en AXIS** | el token, el contrato, las recetas de gráficos y la página del Lab del registro: todavía no existen |

**Señales dentro de la pieza:**

| Señal | Qué dice |
|---|---|
| El color de la manzana y de sus puntos | la línea de servicio del tema |
| La esfera al final de la respuesta | la respuesta, decidida |
| La esfera en un gráfico (medida o tendencia) | el dato: por eso esa lámina no lleva la voz con su esfera |
| La mano «Desliza» | hay más láminas; en la última no va |
| «Ejemplo ilustrativo · Fuente: …» | el dato es de muestra: se cambia por el real antes de publicar |
| La manzana a escala, recortada | es el cierre del carrusel |
| El eslogan con el logo | es un cierre |

## Qué no hacer

- No uses el registro para piezas de Efeonce que no son de MCM, ni lo mezcles con Glitch.
- No pongas la manzana en un color fijo (por ejemplo, un símbolo de color del kit de SVG) ni en el acento de otra línea:
  cambia el selector «Línea del tema».
- No uses el acento como fondo de una lámina ni en textos de menos de 24 px.
- No pongas dos esferas en una pieza: ni la voz con su esfera en la medida o la tendencia, ni la Lente con otra órbita o
  con el foco.
- No hagas una dona de partes: las partes van en una barra al 100 %.
- No dibujes círculos sueltos en un gráfico: los conteos van en cuadrados y el Venn en discos sin anillo.
- No dibujes barras a mano ni muevas la esfera: todo sale del dato.
- No publiques una cifra sin fuente ni un dato de ejemplo como si fuera real.
- No pongas el eslogan en la portada, el blog, la miniatura ni el pódcast.
- No simules botones ni pongas íconos sociales en la contraportada, ni pidas más de una conversión.
- No agregues un lecho a una Escena: sale de la foto.
- No recortes la manzana dejando sólo la hoja y el tallo.
- No uses personas del equipo en fotos de cine para redes hasta que esté aprobado.
- No decidas por tu cuenta ninguno de los pendientes.

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La manzana se lee como «orejas de conejo» | el recorte dejó sólo la hoja y el tallo | muestra la silueta completa (dos lóbulos, hendidura, hoja y tallo); puede salirse por un borde |
| La manzana o el gráfico quedaron en un color que no es el de la línea | se cambió un color a mano o se usó un símbolo de color fijo | vuelve al selector «Línea del tema»: cambia todo a la vez |
| La medida o la tendencia tienen dos esferas | se les puso la voz con su esfera | quita la voz: en esas dos, la esfera es el dato; deja sólo la pregunta arriba |
| Alguien propone una dona para mostrar partes | tres segmentos en un anillo se leen como un arco que se llena | usa «Partes de un todo»: una barra al 100 %, hasta tres partes |
| Un punto o un círculo del gráfico se lee como esfera o como órbita | hay un círculo suelto | pasa el conteo a cuadrados; en el Venn, discos translúcidos sin anillo |
| Una etiqueta chica en el acento no se lee | el acento no alcanza el contraste en texto chico | ponla en navy sobre papel o en blanco sobre navy; el acento sólo desde 24 px |
| La cifra no tiene fuente | falta el dato real | marca «Ejemplo ilustrativo · Fuente: [FUENTE, AÑO]» mientras tanto; sin fuente no se publica |
| La mano «Desliza» cae sobre la persona de la foto | la toma no dejó ese rincón en calma | rehaz la toma con el rincón libre; no muevas la mano |
| El lecho de la Escena se ve pegado (una mesa en un estudio vacío, las cabezas del público, el dorso de un portátil, un piso que corta las piernas) | se agregó un lecho que no es de la escena | usa lo que de verdad hay entre la cámara y la persona, como la mesa donde trabaja |
| La burbuja de la dirección web no pasa el contraste sobre la mesa de la estratega | dio 3,80:1 en su 1 % peor | esa lámina sigue firmando con el logo |
| El eslogan queda demasiado chico para que su palabra vaya en el acento | el logo del cierre es chico | usa el logo de 400 px: el eslogan llega a 24 px |
| La contraportada con el acento de fondo se ve saturada | es la contraportada C, rechazada | usa la A: la manzana a escala sobre Pizarra; el acento nunca es superficie |
| Hay dos fotos seguidas o cuatro Pizarras seguidas | no se revisó el Recreo | reordena: intercala una Pizarra entre fotos y una foto cada tres Pizarras como máximo |
| La firma de la Escena story cae en la franja de la interfaz | la zona segura de la story sigue pendiente | no la resuelvas por tu cuenta: avisa al operador (pendiente 4) |

## Pendientes (no los decidas por tu cuenta)

1. La voz del ícono «Desliza» en la línea Voice (mientras, Trazo).
2. Si los gráficos cuentan para «nunca más de tres Pizarras seguidas» (la recomendación es que sí).
3. La portada Pizarra con la mano en respuesta (dos esferas): ¿excepción registrada o vuelve a reposo?
4. La zona segura de la story: la firma de la Escena story (entre y 1620 y 1671) cae en la franja de la interfaz; falta
   fijar la franja (desde y 1580 o el 87 % que usa AXIS).
5. El texto del cierre de la story (hoy es un «Guárdala» genérico).
6. Personas del equipo en fotos de cine para redes (no aprobado todavía).
7. Los íconos de Trazo `republicar` y `enviar` (en borrador).
8. Si las recetas de gráficos pasan a La órbita para piezas de Efeonce (hoy, sólo para MCM).
9. El navy del texto del logo de Manzanitas, que Glitch declara suyo en su wordmark (hoy va el del archivo oficial).
10. El acento de un tema de Revenue en Salesforce (hoy se usa Revenue en HubSpot).

## Próximamente: el registro en AXIS

Está propuesto, todavía sin ejecutar, y llega por [TASK-1936](../../tasks/to-do/TASK-1936-manzanitas-register-axis-token-contract-charts-lab.md). Cuando exista:

- un token `manzanitasRegister` en AXIS con la cabecera, los formatos, «Desliza», la firma, la contraportada, el Recreo,
  los gráficos y el texto denso;
- los archivos de MCM en el paquete de marca de AXIS, con la manzana y sus puntos listos para tomar el acento;
- las nueve recetas de gráficos, que convierten un dato en la lámina y revisan sus reglas;
- un contrato `efeonce.manzanitas-register` que revisa la pieza y se niega a resolverla si algo falla, con el comando
  `pnpm manzanitas:resolve`;
- una página del Lab en `/references/manzanitas/`;
- y en Greenhouse, un catálogo `manzanitas` en el Artifact Composer para componer carruseles desde los datos.

Hasta entonces, nada de eso existe: no lo cites como disponible ni intentes correr esos comandos.

## Referencias técnicas

- Documentación funcional: [Registro Marketing con Manzanitas](../../documentation/creative/registro-marketing-con-manzanitas.md)
- Norma del registro: [`docs/operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md`](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) — [§9.2 guía de selección de gráficos](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#92-guía-de-selección), [§12 QA antes de entregar](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#12-qa-antes-de-entregar), [§13 pendientes](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#13-pendientes-del-operador) y [§14 del canvas a AXIS](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#14-del-canvas-a-axis-estado-y-plan)
- Decisión: [`docs/architecture/MANZANITAS_REGISTER_DECISION_V1.md`](../../architecture/MANZANITAS_REGISTER_DECISION_V1.md)
- Línea madre: [`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) · [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md)
- Registro fotográfico cine: [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) · [Producir una foto de marca Efeonce](../marketing/fotografia-de-marca-efeonce.md)
- Identidad gráfica de MCM: [`MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md`](../../operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md)
- Canvas: [«Marketing con Manzanitas · Línea v1»](https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG), versión 39 (privado)
- DS: [«Efeonce — La órbita»](https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc) (`EfeonceOrbit.Voice`, `Measure`, `Lens`, `Slogan`)
- Skill para agentes: `efeonce-graphic-line` (`criteria.md` §3.4 y §8, `ledger.md` del 2026-09-28)
- La hermana que no se mezcla: [Componer piezas de Glitch](./componer-piezas-glitch.md)
