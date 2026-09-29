# Componer piezas de Marketing con Manzanitas — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.4
> **Creado:** 2026-09-28 por Claude
> **Ultima actualizacion:** 2026-09-29 por Claude (TASK-1939) (1.4: el vestuario del equipo lo decide la línea de la pieza; 1.3: las diez decisiones resueltas; el texto de cierre que cambia con el contexto y su extensión normalizada; las personas del equipo en las fotos, con su roster y su vestuario; los íconos `republicar` y `enviar`; AXIS `v0.3.29`. 1.2: componer con el comando `pnpm manzanitas:compose`, decisiones del operador del 2026-09-29 y regla del eslogan de los cierres)
> **Modulo:** Creative · Marketing con Manzanitas (registro complementario de «La órbita»)
> **Ruta en portal:** no aplica — las piezas se componen en el taller local con `pnpm manzanitas:compose` (catálogo `manzanitas` del Artifact Composer, TASK-1939) o en el canvas de la línea con los componentes del DS «Efeonce — La órbita»; la validación y los gráficos desde datos están en AXIS (`pnpm manzanitas:resolve`, `axis-graphic-line/charts`); la ruta productiva (API, worker y MCP) llega con TASK-1921
> **Documentacion tecnica:** [ADR del registro](../../architecture/MANZANITAS_REGISTER_DECISION_V1.md) · [Norma del registro](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md)
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/registro-marketing-con-manzanitas.md) · [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md) · [Producir una foto de marca Efeonce](../marketing/fotografia-de-marca-efeonce.md)

> **⚠️ Este manual es SÓLO para piezas de Marketing con Manzanitas.** El registro complementa a La órbita, no la
> reemplaza: todo lo que aquí no se dice, lo dice [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md).
> Para Glitch usa [Componer piezas de Glitch](./componer-piezas-glitch.md): los dos no se mezclan.

> **Hay dos caminos para componer, y las reglas son las mismas.** Los valores, las reglas y los gráficos viven en AXIS
> (token `manzanitasRegister`, contrato `efeonce.manzanitas-register`, gráficos en `@efeoncepro/axis-graphic-line/charts`;
> ver [El registro en AXIS](#el-registro-en-axis-cómo-usarlo-hoy)). Desde el 2026-09-29, Greenhouse tiene el catálogo
> `manzanitas` del Artifact Composer: describes la pieza como datos y el comando `pnpm manzanitas:compose` la compone en
> PDF y PNG (ver [Componer con el comando](#componer-con-el-comando)). El canvas «Marketing con Manzanitas · Línea v1»,
> con los componentes del DS «Efeonce — La órbita», sigue sirviendo para explorar y revisar; los pasos 1 a 9 explican las
> decisiones que tomas en cualquiera de los dos caminos. El comando es el taller local: la pieza sale para revisión
> humana, no se publica.

## Para qué sirve

Explica cómo armar un **carrusel de LinkedIn** de Marketing con Manzanitas (MCM), de 1080 × 1350, con su registro:
elegir la línea del tema, mezclar los formatos con el Recreo, elegir cada gráfico por la pregunta que responde,
preparar el dato con su fuente, cerrar con la contraportada y revisar antes de entregar. Al final resume las otras
piezas del registro (story, portada de blog y banner, miniatura y cierre de YouTube, y portada del pódcast) y explica
cómo componer cualquiera de ellas con el comando `pnpm manzanitas:compose`.

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
  `pnpm foto:prompt`, `pnpm foto:validar`; nunca armes el prompt a mano). Si la foto muestra a personas del equipo,
  ten a mano el [roster del equipo](../../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md) (paso 7).
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

Si la línea es **Voice**, el ícono «Desliza» va en **Trazo** (decisión del operador del 2026-09-29).

Si el tema es de **Revenue**, el acento depende de la plataforma: un tema de Salesforce lleva `revenue-salesforce`; uno de
HubSpot o genérico, `revenue-hubspot` (decisión del 2026-09-29).

### Paso 2 · Arma la secuencia con el Recreo

1. **Decide la portada:** Pizarra (la lámina dibujada, con la manzana grande) o Escena (una foto a sangre).
2. **Reparte las fotos:**
   - con portada **Pizarra**, cerca de un tercio de las láminas lleva foto (unas 2 de 7);
   - con portada **Escena**, casi la mitad (unas 3 de 7), porque la foto ya es la promesa.
3. **Revisa las reglas del Recreo:**
   - nunca dos láminas con foto seguidas;
   - nunca más de tres Pizarras seguidas; los gráficos, la lámina de dato y el texto denso **no cuentan** para esta
     regla ni rompen la racha (decisión del 2026-09-29);
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
- **La mano en respuesta, sólo en la portada Pizarra.** La portada Pizarra puede llevar la mano «Desliza» en respuesta,
  con su esfera: es una excepción registrada (decisión del 2026-09-29) y es la única pieza con dos esferas. En cualquier
  otra lámina la mano va en reposo.

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

**Personas del equipo en la foto (decisión del operador del 2026-09-29):** las fotos cine de MCM pueden mostrar a
personas reales del equipo actual, pero sólo desde el
[roster del equipo](../../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md), que es la lista que mantiene
Greenhouse (AXIS no nombra a nadie).

1. **Elige a la persona en el roster.** Si no está ahí, no sale. María Fernanda ya no está en el equipo actual: su foto
   no se usa.
2. **Vístela según la línea de la pieza**, no según la persona: **hoodie** Efeonce en Servicios creativos (`brand`);
   **bomber o softshell** del uniforme corporativo en las líneas de negocio (Growth, Engine, Voice, Revenue), con el polo
   debajo si quieres, nunca el polo solo. Vale para todo el equipo, Julio y Valentina incluidos. En la ficha, declara
   `"linea"` y la prenda en `objetos` (`hoodie-efeonce`, `chaqueta-bomber-efeonce` o `chaqueta-softshell-efeonce`), y
   descríbela en la escena: si no calzan con la línea, `pnpm foto:prompt` se detiene y te dice cuál corresponde.
3. **Declara su identidad en la ficha** (`"identidad": ["<clave>"]`) y genera con los comandos de la foto: la identidad
   se regenera con sus referencias, nunca se pega una cara.
4. **Revisa la identidad** en una hoja de contacto, al lado de su foto de referencia.
5. **Las seis identidades del equipo están aprobadas** (operador, 2026-09-29, ronda piloto en
   `ai-generations/2026-09-29_manzanitas-equipo/`). Una persona que entre después al equipo pasa por su propia ronda
   antes de publicarse.

La estratega de la Escena interior aprobada sigue siendo una persona por rol, generada.

### Paso 8 · Cierra con la contraportada: una sola conversión

1. **Pizarra**, con la cabecera **sin manzana**.
2. **La manzana a escala:** la de la portada, 3,8 veces más grande, recortada por arriba y por la derecha, de modo que su
   cuerpo con los tres puntos quede como una burbuja escribiendo, en el acento de la línea y sin astillas del tallo en el
   borde. Deja 100 px de aire bajo la manzana y 120 px sobre el logo.
3. **La voz pide una sola cosa:** la pregunta, una respuesta accionable y una bajada de una línea que empiece con «En los
   comentarios: …». Ejemplos aprobados:
   - Engine: «¿Te nombra la IA? Pregúntale.» + «En los comentarios: cuéntanos si te nombró.»
   - Brand (Creative Workflows): bajada «En los comentarios: el primer ingrediente de tu receta.»

   **El texto del cierre cambia con cada pieza** (decisión del operador del 2026-09-29): escríbelo para el tema de este
   carrusel; los ejemplos no son una fórmula para repetir. Lo que no cambia es su **extensión**, para que no rompa el
   diseño:

   | Parte | Máximo |
   |---|---|
   | Pregunta | 44 caracteres |
   | Respuesta | 10 caracteres |
   | Bajada | 56 caracteres |

   Vale igual para la story de cierre. Si una parte se pasa, el contrato responde `close-copy-too-long`: acórtala.
4. **Nada simula un botón.** Ni íconos sociales ni botones dibujados: si hace falta pedir guardar, compartir o enviar, se
   pide en el texto del post, y nunca los cuatro a la vez.
5. **La firma con el eslogan:** el logo de Efeonce de 400 px con el eslogan **debajo**, en bloque, al 64 % del ancho
   del logo y separado 1,35 veces su cuerpo (regla del operador del 2026-09-29); el bloque termina en la línea de firma
   (y 1253). La palabra de la línea va en su acento **sólo si el eslogan llega a 24 px**; si no, va en la tinta de la
   superficie (blanco sobre navy). Con el logo de 400 px, el eslogan mide 22,1 px en Growth, 23,5 en Brand, 22,7 en
   Engine, 24,06 en Voice y 20,9 en Revenue: **sólo Voice conserva la palabra en el acento**. Es la consecuencia visible
   de la regla y se le presenta al operador; no agrandes el logo por tu cuenta.
6. **Sin «Desliza»:** es la última lámina.

Después de publicar, se mide en Metricool: comentarios con sustancia, guardados, envíos y clics al grader por UTM cuando
aplique.

### Paso 9 · Revisa antes de entregar

- [ ] **Acento:** todas las láminas en la línea del tema; la manzana, los puntos, el gráfico, la palabra del eslogan y
  la voz de «Desliza» cambiaron juntos con el selector; nada en un color fijo ni en el de otra línea.
- [ ] **Contraste:** el acento mide al menos 3:1 contra su fondo; no hay texto en el acento de menos de 24 px (ahí va
  navy sobre papel y blanco sobre navy, también la palabra del eslogan); el acento no es fondo de ninguna lámina.
- [ ] **Una esfera por pieza:** la medida y la tendencia no llevan la voz con su esfera; la Lente no se combina con otra
  órbita; los tres puntos de la manzana no cuentan como esfera. La única excepción es la portada Pizarra con la mano en
  respuesta.
- [ ] **Voz:** respuesta de una a tres palabras y al menos tres veces más grande que la pregunta; ningún texto cruza la
  órbita.
- [ ] **«Desliza»:** en su sitio fijo (x 936, 64 × 64 px; en y 1033 en la portada y en y 985 en las interiores), en
  reposo (salvo la portada Pizarra en respuesta); nunca junto a la voz arriba, en la fila de la firma, sobre la persona
  o el objeto, en la última lámina ni en la story.
- [ ] **Firma:** el logo de Efeonce en la misma altura en todas las láminas (arriba en y 1202, 216 × 51 px); la burbuja
  de la dirección web sólo si el logo ya está en la imagen y pasa el contraste de La órbita (4,5:1); el eslogan sólo en
  el cierre, siempre debajo del logo.
- [ ] **Cabecera:** el logo de MCM arriba a la izquierda (x 80, y 72, 200 × 90 px); sin manzana en la portada Pizarra y
  en la contraportada; la manzana, cuando va, se ve entera.
- [ ] **Fuente:** cada cifra con «Fuente: [FUENTE, AÑO]»; los datos de muestra marcados «Ejemplo ilustrativo»; ninguna
  cifra sin fuente.
- [ ] **Gráficos:** las barras salen de su número y parten de cero; un solo acento; ninguna dona de partes; ningún
  círculo suelto.
- [ ] **Recreo:** no hay dos fotos seguidas ni más de tres Pizarras seguidas (los gráficos, el dato y el texto denso no
  cuentan); el dato con fuente y el cierre van en Pizarra; las fotos comparten registro y luz.
- [ ] **Contraportada:** una sola conversión y nada que simule un botón.
- [ ] **Texto del cierre:** propio de esta pieza, no copiado de otra; pregunta de hasta 44 caracteres, respuesta de
  hasta 10 y bajada de hasta 56.
- [ ] **Personas del equipo:** si aparecen, están en el roster, con la prenda de la línea de la pieza, y su identidad
  está aprobada por el operador.
- [ ] **Nada de Glitch:** ni la manzana llena, ni el verde, ni los bytes, ni Guttery, ni la cabecera «EDICIÓN #N».
- [ ] **En el teléfono:** mira cada lámina a 390 px de ancho. Como referencia, en la contraportada del canvas v39 la
  respuesta queda en 69 px, la bajada en 11 px, el logo en 144 px y el eslogan en 9 px.

Componer no es publicar: publicar requiere la autorización del operador, y este manual no la reemplaza.

## Otras piezas del registro

| Pieza | Formato | Cómo va |
|---|---|---|
| **Story** | una sola pieza, Escena o Pizarra (nunca las dos) | con foto, la voz en la banda alta y la firma centrada sobre la mesa, dentro de la zona segura de AXIS (el 87 %: nada importante en el 13 % de arriba ni de abajo; decisión del 2026-09-29); sin «Desliza»; el eslogan sólo en la story de cierre, debajo del logo. La story de cierre siempre lleva su voz, con un texto de cierre propio de la pieza y la misma extensión que la contraportada (44, 10 y 56 caracteres; decisión del 2026-09-29) |
| **Portada de blog y banner** | una sola pieza, Escena o Pizarra | la foto se genera en 16:9 y se lleva a 1,9:1 (1200 × 630); la voz en el lado oscuro; la firma puede ir abajo a la izquierda, cerrando la columna del texto; sin eslogan |
| **Miniatura de YouTube** | Escena 16:9 | el logo abajo a la izquierda; sin eslogan (el eslogan va en el cierre del video) |
| **Cierre de YouTube** | Pizarra 16:9 | el logo de Efeonce de 260 px con el eslogan **debajo** (regla del 2026-09-29; el cierre del canvas v39 lo tenía encima y quedó superado); con ese logo el eslogan queda en unos 14–15 px, así que la palabra de la línea va en blanco |
| **Portada del pódcast** | 1:1 | la cabecera del programa en grande (420 px), porque la portada se ve a 160 px; sin eslogan |

## Qué significan los estados y las señales

**Estados de las piezas:**

| Estado | Qué significa |
|---|---|
| **Aprobado** (2026-09-28, canvas versión 39) | se usa como pieza final: formatos Pizarra, Escena, Lente y Recreo; cabecera y firma; acentos por línea; contraportada «A a escala»; los nueve gráficos y las tres láminas de texto denso |
| **Prueba** | se conserva para comparar, no se usa: la contraportada B, con la órbita |
| **Rechazado** | no se usa: la contraportada C (el acento a sangre) y el recorte de la manzana que deja sólo la hoja y el tallo |
| **Excepción registrada** (2026-09-29) | la portada Pizarra con la mano en respuesta (dos esferas): se usa, pero sólo en esa portada |
| **Identidad aprobada** (2026-09-29) | la persona del equipo está en el roster, con su identidad declarada y aprobada por el operador: se puede publicar. Quien entre después al equipo, primero su ronda de identidad |
| **Pendiente** | desde el 2026-09-29 no queda ninguna decisión abierta; si surge una nueva, la decide el operador (ver «Decisiones del operador») |
| **Taller local, pendiente de aprobación visual** | el catálogo `manzanitas` del Artifact Composer y `pnpm manzanitas:compose` (TASK-1939): componen en local con las versiones de AXIS que fija Greenhouse; falta que el operador apruebe los carruseles de ejemplo, y la ruta productiva llega con TASK-1921 |

**Señales dentro de la pieza:**

| Señal | Qué dice |
|---|---|
| El color de la manzana y de sus puntos | la línea de servicio del tema |
| La esfera al final de la respuesta | la respuesta, decidida |
| La esfera en un gráfico (medida o tendencia) | el dato: por eso esa lámina no lleva la voz con su esfera |
| La mano «Desliza» | hay más láminas; en la última no va |
| «Ejemplo ilustrativo · Fuente: …» | el dato es de muestra: se cambia por el real antes de publicar |
| La manzana a escala, recortada | es el cierre del carrusel |
| El eslogan debajo del logo | es un cierre |
| La palabra del eslogan en blanco, no en el acento | el eslogan quedó bajo 24 px: es la regla, no un error |

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
- No pongas el eslogan en la portada, el blog, la miniatura ni el pódcast, ni encima del logo.
- No simules botones ni pongas íconos sociales en la contraportada, ni pidas más de una conversión.
- No agregues un lecho a una Escena: sale de la foto.
- No recortes la manzana dejando sólo la hoja y el tallo.
- No uses a una persona que no esté en el roster del equipo actual ni la vistas con otra prenda que la de la línea
  (hoodie en una línea de negocio, chaqueta corporativa en Servicios creativos, o el polo solo); a alguien nuevo en el
  equipo, primero su ronda de identidad aprobada.
- No repitas un texto de cierre fijo de pieza en pieza ni lo alargues más allá de su extensión.
- No decidas por tu cuenta una pregunta nueva de la línea: llévasela al operador.

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
| La palabra del eslogan salió en blanco y no en el acento | el eslogan mide el 64 % del ancho del logo y quedó bajo 24 px (con el logo de 400 px, todas las líneas menos Voice; en el cierre de YouTube, todas) | es la regla del 2026-09-29: bajo 24 px la palabra va en la tinta. No la pintes a mano ni agrandes el logo; para que vaya en el acento el logo tendría que medir unos 435 px o más, y eso lo decide el operador |
| La contraportada con el acento de fondo se ve saturada | es la contraportada C, rechazada | usa la A: la manzana a escala sobre Pizarra; el acento nunca es superficie |
| Hay dos fotos seguidas o cuatro Pizarras seguidas | no se revisó el Recreo | reordena: intercala una Pizarra entre fotos y una foto cada tres Pizarras como máximo |
| La firma de la Escena story cae en la franja de la interfaz | la story no respetó la zona segura | usa la zona segura de AXIS (el 87 %, decidida el 2026-09-29): la firma sube de y 1620 a y 1619 y termina dentro |
| El cierre sale rechazado con `close-copy-too-long` | la pregunta pasa de 44 caracteres, la respuesta de 10 o la bajada de 56 | acorta esa parte; la extensión es fija aunque el texto cambie en cada pieza |
| La persona del equipo no se parece a sí misma, o sale con otra ropa | la ficha no declaró su identidad, su `linea` o su vestuario, o se usó un retrato viejo | declara `identidad`, `linea` y la prenda de esa línea; los retratos antiguos del repo pueden no ser la foto actual |
| `foto:prompt` se detiene con «En la línea … el equipo va con …» | la prenda de `objetos` no es la de la línea de la pieza | cambia la prenda (hoodie en `brand`; bomber o softshell en las demás) o corrige la `linea` si estaba mal |

## Decisiones del operador

El operador resolvió **las diez** el 2026-09-29, en dos rondas: siete primero y, después, las tres que quedaban (5, 6 y
7). **No queda ninguna abierta.** La numeración se mantiene para no romper las referencias. Todas están publicadas en AXIS
(`resolvedDecisions`): las siete primeras en `axis-tokens` 0.3.28 (contrato `efeonce.manzanitas-register` 0.2.0) y las
tres últimas en `axis-tokens` 0.3.29 (contrato 0.3.0, tag `v0.3.29`).

| # | Decisión | Estado |
|---|---|---|
| 1 | La voz del ícono «Desliza» en la línea Voice | **resuelta**: Trazo |
| 2 | Si los gráficos cuentan para «nunca más de tres Pizarras seguidas» | **resuelta**: los gráficos, la lámina de dato y el texto denso no cuentan y no rompen la racha |
| 3 | La portada Pizarra con la mano en respuesta (dos esferas) | **resuelta**: excepción registrada, sólo en esa portada |
| 4 | La zona segura de la story | **resuelta**: el 87 % de AXIS (nada importante en el 13 % de arriba ni de abajo) |
| 5 | El texto del cierre (story de cierre y contraportada) | **resuelta**: cambia con el contexto y nunca queda fijo; su extensión se normaliza (pregunta 44, respuesta 10 y bajada 56 caracteres). El «Guárdala» provisional quedó retirado |
| 6 | Personas del equipo en fotos de cine para redes | **resuelta**: permitidas en las fotos de MCM, sólo las del equipo actual y desde el [roster](../../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md) |
| 7 | Los íconos de Trazo `republicar` y `enviar` | **resuelta**: entraron al catálogo de AXIS (ahora 88 íconos); no cambian la contraportada, que sigue sin íconos sociales |
| 8 | Si las recetas de gráficos pasan a La órbita para piezas de Efeonce | **resuelta**: sólo para MCM por ahora; llevarlas a La órbita sería otra decisión |
| 9 | El navy `#022a4e` del texto del logo de Manzanitas, que Glitch declaraba suyo | **resuelta**: es tinta compartida de la familia Manzanitas (Glitch lo declaró compartido) |
| 10 | El acento de un tema de Revenue en Salesforce | **resuelta**: `revenue-salesforce`; un tema de HubSpot o genérico, `revenue-hubspot` |

Lo que sí espera al operador no son decisiones del registro sino aprobaciones: los carruseles de ejemplo del comando, la
consecuencia del eslogan en los cierres (con el logo de 400 px sólo Voice lleva la palabra en el acento). Las
identidades del equipo quedaron aprobadas el 2026-09-29.

## El registro en AXIS: cómo usarlo hoy

Está publicado desde el 2026-09-28 en el repositorio `efeoncepro/axis-design-system` (tag `v0.3.26`); las decisiones del
2026-09-29 llegaron en dos releases, y la última, tag `v0.3.29` (`axis-tokens` 0.3.29, contrato
`efeonce.manzanitas-register` 0.3.0 en `axis-ui-contracts` 0.3.29 y `axis-graphic-line` 0.11.0), es la que fija
Greenhouse. Sirve para **revisar** un carrusel antes de entregarlo y para **dibujar** sus gráficos desde el dato.

1. **Consulta la página de referencia:** [axis.efeonce.org/references/manzanitas/](https://axis.efeonce.org/references/manzanitas/).
   Elige la línea del tema en el selector y verás la manzana, el eslogan, «Desliza» y los gráficos en el acento de esa
   línea. Los agentes leen lo mismo en `/references/manzanitas.json`.
2. **Describe el carrusel como datos** en un archivo JSON (intent): canal, línea del tema y, por lámina, la pieza, la voz
   y, si es un gráfico, su dato con la fuente. Parte de un ejemplo de `docs/examples/manzanitas/` (en AXIS), por ejemplo
   `carrusel-recreo-engine-intent.json`.
3. **Revísalo** desde la raíz del repositorio de AXIS:

   ```bash
   pnpm manzanitas:resolve -- --input carrusel.json --out manifest.json
   ```

   Si sale `status: "resolved"`, el carrusel cumple el registro y `manifest.json` trae cada lámina resuelta (acento,
   cabecera, «Desliza», firma, voz y la respuesta del gráfico calculada del dato). Si sale `invalid`, el comando termina
   con error y dice qué regla falla, con su código y un mensaje en español: corrige el intent, no la regla.
4. **Dibuja los gráficos** con `manzanitasChartSvg` de `@efeoncepro/axis-graphic-line/charts` y revisa el resultado con
   `runManzanitasChartChecks`: no debe quedar ningún chequeo en falso. También puedes probar un dato en el editor de la
   página de referencia («Editar el dato»).
5. **Compón** con el comando de Greenhouse (ver [Componer con el comando](#componer-con-el-comando)), que toma el mismo
   intent, o en el canvas; los números vienen del manifiesto o del token, nunca copiados a ojo.

**Qué significa `pending-decision`:** la pieza o la regla depende de una decisión abierta del operador. Desde
`axis-tokens` 0.3.29 no queda ninguna (`pendingDecisions` va vacío): si aparece, no es un error tuyo; avisa al operador.

**Lo que todavía no existe en Greenhouse:** la ruta productiva de las piezas (API, `artifact-worker` y MCP), que llega
con TASK-1921. Hoy el comando es el taller local: no lo cites como un servicio del portal.

## Componer con el comando

### Para qué sirve

`pnpm manzanitas:compose` compone una pieza de Marketing con Manzanitas con el Artifact Composer (TASK-1939): recibe la
pieza descrita como datos y entrega el carrusel en PDF, cada lámina en PNG y la procedencia de la pieza. Cubre las 26
piezas aprobadas del registro (carrusel, story, portada de blog y banner, miniatura y cierre de YouTube, y portada del
pódcast) con 18 plantillas en dos catálogos: `manzanitas-carousel` (el documento del carrusel) y `manzanitas-stills`
(las láminas sueltas y las piezas únicas). Story, blog, YouTube y pódcast salen sólo como láminas sueltas.

**Tú describes, el registro decide.** No eliges plantilla, coordenadas ni colores: el contrato resuelve la pieza, la
superficie, el «Desliza», la cabecera y la firma; el catálogo elige la plantilla; el acento sale de la línea del tema.

### Antes de empezar

- **Ten el intent de la pieza:** un archivo JSON del contrato `efeonce.manzanitas-register` 0.3.0 (acepta también 0.1.x y
  0.2.0; canal, línea del tema
  y, por lámina, la pieza, la voz y, si corresponde, el dato del gráfico con su fuente o el contenido del texto denso).
  Las claves del dato van en inglés, como en el contrato (por ejemplo, `rows`, `value`, `role`). `artifactId` es
  opcional: si falta, la pieza se llama `MCM-<canal>-<línea>`.
- **Agrega lo que el contrato no trae:** en cada lámina con foto, `photo.path` (el archivo de la foto real, relativo al
  archivo del intent) y `photo.alt` (qué se ve en la foto).
- **Los rótulos del gráfico son parte del contrato desde la 0.3.0:** si los necesitas, van en `chart` (`caption`,
  `figureLabel`, `columnLabels`, `keyLabels` y `rateHeader`); si no tienen la forma correcta, el contrato responde
  `chart-labels-invalid`.
- **Parte de un ejemplo versionado** de
  [`src/lib/manzanitas-composition/examples/`](../../../src/lib/manzanitas-composition/examples/): carrusel con Recreo en
  Engine, texto denso en Growth, gráficos en Brand, voz en Revenue (HubSpot), story Escena y portada del pódcast. Sus
  fotos son **sintéticas** (SVG en `examples/fotos/`), llevan `example: true` y nunca se publican.
- **La foto real** se produce con el lenguaje fotográfico de Efeonce, en el registro cine
  ([Producir una foto de marca Efeonce](../marketing/fotografia-de-marca-efeonce.md)). Si muestra a personas del equipo,
  sólo las del [roster](../../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md), con la prenda de la línea de la
  pieza y su identidad aprobada por el operador antes de publicar (paso 7).
- **Escribe el copy corto.** La respuesta va en una línea y, en varias láminas, la pregunta también (ver
  [Reglas que fallan cerradas](#reglas-que-fallan-cerradas)). En la contraportada y la story de cierre, el texto del
  cierre tiene su extensión fija: pregunta 44, respuesta 10 y bajada 56 caracteres (paso 8).

### Paso a paso

1. **Copia un ejemplo** que se parezca a tu pieza y cambia el canal, la línea del tema, la voz, los datos con su fuente y
   las rutas de las fotos.
2. **Compón** desde la raíz del repositorio:

   ```bash
   pnpm manzanitas:compose -- --intent ruta/a/pieza.json
   ```

   Opciones: `--out <carpeta>` para elegir dónde sale y `--only carousel` o `--only stills` para componer sólo el
   carrusel o sólo las láminas sueltas (por omisión, las dos).
3. **Busca la salida** en `.captures/manzanitas/<artifactId>/` (o en la carpeta de `--out`):

   | Qué | Dónde |
   |---|---|
   | El documento del carrusel, para revisar y, con autorización, subir a LinkedIn | `<artifactId>-carrusel.pdf`, con fechas internas fijas y verificado contra los límites de LinkedIn para documentos (100 MB, 300 páginas y un solo tamaño de página) |
   | Las láminas del carrusel | `carrusel/`: el PNG y el PDF de cada lámina y el manifiesto resuelto |
   | Las láminas sueltas | `sueltas/`: el PNG de cada lámina, o de la pieza única de story, blog, YouTube o pódcast |
   | La procedencia | `<artifactId>.provenance.json` |

4. **Revisa la procedencia.** `<artifactId>.provenance.json` (schema `manzanitas.piece-provenance.v1`) dice qué entró y
   qué salió: la pieza, el canal, la línea del tema, el hash del intent, las versiones de AXIS, cada foto con el hash de
   la fuente y el del archivo procesado, y cada salida con su hash. No lleva reloj: el mismo intent produce el mismo
   archivo, así que dos composiciones se comparan por sus hashes.
5. **Revisa las láminas** con el checklist del [paso 9](#paso-9--revisa-antes-de-entregar), sobre los PNG, y míralas a
   390 px de ancho.
6. **Entrega para revisión humana.** El comando no publica ni agenda: publicar requiere la autorización del operador.

### Qué significan los errores

Si algo no cumple el registro, el comando se detiene con un error: dice el código y qué falla, en español, con la lámina
o el campo cuando aplica. Corrige el intent, nunca la regla, y vuelve a componer.

| Código | Qué significa | Qué hacer |
|---|---|---|
| `intent-invalid` | el archivo no es JSON válido | revisa comas, comillas y llaves |
| `contract-issues` | el intent no pasa el contrato del registro o un gráfico no pasa sus chequeos; trae los códigos del contrato (por ejemplo, `slogan-not-allowed`, `chart-source-required`, `close-copy-too-long` o `chart-labels-invalid`) | lee cada código: pon la fuente del dato, quita el eslogan de una pieza que no cierra, cambia el gráfico por el que responde la pregunta, acorta el texto del cierre o corrige los rótulos del gráfico |
| `photo-missing` | una lámina con foto no trae `photo.path` o `photo.alt`, o el archivo no existe | declara la ruta (relativa al intent) y el texto alternativo, y revisa que el archivo esté ahí |
| `dense-text-invalid` | una lámina de texto denso no trae lo que su plantilla pide | concepto: un párrafo y tres puntos con título y cuerpo; comparación: dos columnas, cuatro filas y el remate; paso a paso: cuatro pasos con título y cuerpo |
| `piece-not-approved` | la pieza no está aprobada (está en propuesta) | no se compone como canon: usa una pieza aprobada o espera la decisión del operador |
| `carousel-too-heavy` | el PDF del carrusel pasa los límites de LinkedIn (100 MB, 300 páginas o tamaños de página mezclados) | reduce las láminas o el peso de las fotos |
| «no cabe en su lienzo» | un texto no cabe en su lámina (el mensaje nombra la lámina, el campo y cuántos px sobran) | **acorta el copy**: el motor nunca recorta ni parte el texto |

### Reglas que fallan cerradas

El motor mide cada lámina después de componerla; si un texto queda fuera de su caja, falla con «no cabe en su lienzo» en
vez de entregar una pieza rota. Nunca recorta ni parte el texto:

- **La respuesta va en una línea.** La esfera nunca queda sola en la línea siguiente.
- **La respuesta le deja espacio al «Desliza»** donde comparten línea (portada Pizarra, paso, dato en manzanas, gráficos
  con voz y Lente).
- **La pregunta va en una línea** donde hay contenido fijo bajo la voz (gráficos con voz, Lente, paso, las tres láminas de
  texto denso y pódcast): una segunda línea empujaría la respuesta sobre la fuente, la firma o el contenido.

Los gráficos también fallan cerrados, pero con otro código: se dibujan desde el dato y pasan los chequeos del registro;
si un chequeo falla, la lámina no sale y el comando responde `contract-issues`.

Antes de AXIS `v0.3.29`, tres ejemplos de AXIS traían copy que no cabía («Todavía no», «Quién responde» y «¿Cuántos
leads llegan ya informados?»). Desde esa versión dicen lo mismo que los de Greenhouse: «Aún no», «Quién cita» y la
pregunta de «De cada 100» sin «leads».

### El eslogan de los cierres

Los tres cierres (la contraportada A, la story de cierre y el cierre de YouTube) llevan el eslogan con la regla del
operador del 2026-09-29: es un elemento gráfico que acompaña la marca, así que va **siempre debajo del logo de Efeonce**,
en bloque, al 64 % del ancho del logo y separado 1,35 veces su cuerpo. La palabra de la línea va en el acento **sólo si el
eslogan llega a 24 px**; si no, va en la tinta de la superficie (blanco sobre navy). El comando lo mide en cada cierre:
el ancho del eslogan de cada línea sale del token de AXIS (`efeonceGraphicLine.slogan.widthEmByWord`) y el cuerpo que
pinta la plantilla coincide con el que resuelve el contrato (`slogan.px`).

| Cierre | Logo | Eslogan | La palabra |
|---|---|---|---|
| Contraportada A y story de cierre | 400 px | Growth 22,1 px · Brand 23,5 · Engine 22,7 · Voice 24,06 · Revenue 20,9 | en el acento sólo en Voice; en las demás, en blanco |
| Cierre de YouTube | 260 px | unos 14–15 px | en blanco |

El cierre de YouTube del canvas v39 tenía el eslogan **encima** del logo; la regla del 2026-09-29 es posterior y lo deja
debajo. Que la palabra vaya en el acento en todas las líneas pediría un logo de unos 460 px o más (Revenue, la palabra
más ancha; Growth pide unos 435 px): eso se le presenta al operador, no se decide en la pieza.

### Qué no hacer

- No elijas plantilla, coordenadas ni colores en el intent: los decide el registro.
- No edites la salida a mano (ni los PNG ni el PDF): corrige el intent y vuelve a componer. Una pieza editada ya no
  coincide con su procedencia.
- No uses fotos de personas del equipo que no estén en el roster; a alguien nuevo, primero su ronda de identidad
  aprobada.
- No publiques ni agendes desde el taller, ni publiques un ejemplo (`example: true`) o un dato de muestra como real.
- No fuerces el copy para que «entre»: si no cabe, acórtalo.
- No mezcles Glitch en una pieza de MCM.

### Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| «no cabe en su lienzo» en la respuesta | la respuesta no entra en una línea o pisa el «Desliza» | acórtala (una a tres palabras) |
| «no cabe en su lienzo» en la pregunta de un gráfico, la Lente o el texto denso | la pregunta ocupa dos líneas donde hay contenido fijo debajo | acórtala hasta una línea |
| Un ejemplo copiado de AXIS no compone | es de antes de `v0.3.29` y su copy no cabe en la geometría del canvas | usa los ejemplos de AXIS `v0.3.29` o los de Greenhouse |
| `contract-issues` con `close-copy-too-long` | el texto del cierre pasa de su extensión (44, 10 o 56 caracteres) | acorta esa parte |
| `contract-issues` con `voice-missing` en la story de cierre | la story de cierre no trae su pregunta y su respuesta | escríbelas: la story de cierre siempre lleva su voz |
| `photo-missing` con la foto en la carpeta | `photo.path` se escribió relativo a otra carpeta | escríbelo relativo al archivo del intent |
| `contract-issues` con `chart-source-required` | el gráfico no trae fuente | pon la fuente; si el dato es de muestra, márcalo como ilustrativo |
| `contract-issues` con `slogan-not-allowed` | se pidió eslogan en una pieza que no cierra | quítalo: el eslogan sólo va en los tres cierres |
| La palabra del eslogan salió en blanco | el eslogan quedó bajo 24 px | es la regla; no la cambies a mano |
| El PDF no se genera y sale `carousel-too-heavy` | el carrusel pasa los límites de LinkedIn | reduce láminas o el peso de las fotos |

### Referencias del comando

- Comando: [`scripts/manzanitas/compose.ts`](../../../scripts/manzanitas/compose.ts) (`pnpm manzanitas:compose`)
- Mapper del intent: [`src/lib/manzanitas-composition/index.ts`](../../../src/lib/manzanitas-composition/index.ts)
  (`planManzanitasIntent`) y [`materialize.ts`](../../../src/lib/manzanitas-composition/materialize.ts) (fotos, Lente y
  órbita del paso)
- Ejemplos: [`src/lib/manzanitas-composition/examples/`](../../../src/lib/manzanitas-composition/examples/)
- Catálogos y plantillas: [`src/lib/artifact-composer/catalogs/manzanitas/`](../../../src/lib/artifact-composer/catalogs/manzanitas/)
  (eslogan: `slogan-hook.ts`)
- Tokens compilados: `pnpm manzanitas:tokens` (y `--check` para saber si AXIS publicó y falta recompilar)
- Gate visual: `pnpm composer:visual-gate --catalog=manzanitas`
- Ruta productiva (pendiente): TASK-1921

## Referencias técnicas

- Documentación funcional: [Registro Marketing con Manzanitas](../../documentation/creative/registro-marketing-con-manzanitas.md)
- Norma del registro: [`docs/operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md`](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md) — [§9.2 guía de selección de gráficos](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#92-guía-de-selección), [§12 QA antes de entregar](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#12-qa-antes-de-entregar), [§7.2 el eslogan](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#72-el-eslogan-sólo-cierra), [§13 decisiones del operador](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#13-decisiones-del-operador) y [§14 del canvas a AXIS](../../operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md#14-del-canvas-a-axis-estado-y-plan) (§14.5, el Composer)
- Comando y catálogo: [Componer con el comando](#componer-con-el-comando) · [`scripts/manzanitas/compose.ts`](../../../scripts/manzanitas/compose.ts) · [`src/lib/artifact-composer/catalogs/manzanitas/`](../../../src/lib/artifact-composer/catalogs/manzanitas/) · [`src/lib/manzanitas-composition/`](../../../src/lib/manzanitas-composition/) · TASK-1939 (catálogo) y TASK-1921 (ruta productiva)
- Decisión: [`docs/architecture/MANZANITAS_REGISTER_DECISION_V1.md`](../../architecture/MANZANITAS_REGISTER_DECISION_V1.md)
- Línea madre: [`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) · [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md)
- Registro fotográfico cine: [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) · [Producir una foto de marca Efeonce](../marketing/fotografia-de-marca-efeonce.md) · [Roster del equipo](../../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md)
- Identidad gráfica de MCM: [`MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md`](../../operations/social/MARKETING_CON_MANZANITAS_BRAND_RESOURCE_LIBRARY.md)
- Canvas: [«Marketing con Manzanitas · Línea v1»](https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG), versión 39 (privado)
- DS: [«Efeonce — La órbita»](https://claude.ai/artifact/2ubRm8vTLamJukRCXR1xpc) (`EfeonceOrbit.Voice`, `Measure`, `Lens`, `Slogan`)
- Skill para agentes: `efeonce-graphic-line` (`criteria.md` §3.4 y §8, `ledger.md` del 2026-09-28)
- La hermana que no se mezcla: [Componer piezas de Glitch](./componer-piezas-glitch.md)
