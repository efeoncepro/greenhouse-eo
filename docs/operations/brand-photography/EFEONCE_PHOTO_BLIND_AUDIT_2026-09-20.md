# Auditoría ciega del lenguaje fotográfico — 2026-09-20

> **Tipo de documento:** Evidencia de auditoría externa + plan derivado
> **Versión:** 1.0 · **Creado:** 2026-09-20 por Claude, a pedido del operador
> **Relacionado:** [maestro](./EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) · [catálogo de palancas](./EFEONCE_PHOTO_LEVERS_CATALOG_V1.md) · [prompts y pipeline](./EFEONCE_PHOTO_PROMPT_BLOCKS_AND_PIPELINE_V1.md)

## Qué se hizo y por qué vale

El maestro declara desde su origen un pendiente: el lenguaje es **consistente**, no un **activo distintivo
medido**. Un sistema mirándose a sí mismo no puede cerrar esa brecha. El operador pidió una lectura de afuera.

**Método.** Doce plates aprobados de seis rondas distintas se copiaron a un directorio neutral **con nombres
numerados** (`01.png`…`12.png`) fuera del árbol del repo. Dos evaluadores independientes los miraron **sin acceso
a ningún documento, skill ni nombre de archivo**: uno con el encargo de director de arte, el otro con el de una
persona que decide a quién contratar. No se hablaron entre sí y ninguno supo de qué marca se trataba.

Los nombres neutros no son un detalle: `quien-sostiene.png` le habría soplado la intención, y el directorio del
repo les habría auto-cargado la regla del canon.

**Limitación honesta del experimento.** La muestra eran **pruebas de palanca**, no piezas de campaña, y ninguna
llevaba la firma compuesta. Eso explica parte de los hallazgos 1 y 6; no explica los demás.

| # | Plate | Palanca |
|---|---|---|
| 01 | `F1` | `instrumento` |
| 02 | `F2` | `suelo-oblicuo` |
| 03 | `F4` | `ausencia` |
| 04 | `F5` | `fragmento` (Julio) |
| 05 | `F7` | `little-planet` |
| 06 | `G1` | `escucha` |
| 07 | `G3` | `entre-dos` |
| 08 | `G4` | `quien-sostiene` |
| 09 | `H1` | `variantes` |
| 10 | `H2` | `descarte` |
| 11 | `H3` | `marcado` |
| 12 | `H4` | `proyeccion` |

## Lo que coincidió sin que se hablaran

Una coincidencia entre dos lecturas independientes deja de ser opinión.

### 1. No hay trabajo terminado en ninguna pieza **[los dos, como defecto principal]**

> «Un portafolio que muestra el gesto de elegir pero nunca lo elegido.» — director de arte
> «Así se ve nuestro proceso. No me dice: esto le hicimos a alguien como tú. Y yo contrato lo segundo.» — evaluador

Ninguna pantalla muestra trabajo, y lo que se revisa son fotos de paisaje y arquitectura. Es el hallazgo de mayor
impacto comercial y el que abre el plan de abajo.

### 2. El sistema de color se lee como un tic **[contado: 9 de 12 y 12 de 12]**

> «La primera vez es identidad. A la novena es un tic, y me hace sospechar que las fotos se armaron juntas, con
> la misma receta, y no a lo largo de proyectos reales.» — evaluador
> «La taza y el post-it están puestos ahí sólo para cumplir la cuota de naranja.» — director de arte

**Hallazgo de sistema, no de pieza.** El azul portador es **estructura** y va en todas; el acento cálido es
**puntuación** y necesita **dosis**. Nótese la ironía útil: una corrección aplicada esa misma mañana —«les falta
el color de Efeonce»— produjo, llevada a todas las piezas, el defecto contrario. **Una regla correcta aplicada
sin dosis se convierte en su propio problema.**

### 3. `ausencia` es la peor de las doce **[los dos]**

«Foto de inmobiliaria», «banco de imágenes de corredora de bolsa», «no hay oficio, no hay persona, no hay
decisión: hay mobiliario». La palanca promete **«se fueron hace un minuto»** y lo que llegó fue un escritorio
vacío. Falló su propio contrato y nadie lo vio desde adentro.

### 4. `little-planet` es un truco **[los dos]**

«De 2015», «un truco de lente sin idea detrás», «no pertenece a ninguna de las otras once». Se suma que es la
única cuadrada y la única sin lecho: **se sale del sistema por tres vías a la vez**.

### 5. `variantes` no sostiene lo que promete **[los dos, por razones opuestas]**

> «Las nueve son idénticas. Eso no es un proceso de decisión, es un patrón decorativo.» — evaluador
> «**No** son idénticas: el ángulo del muro y la proporción del cielo cambian de copia en copia. Nueve
> impresiones del mismo archivo no pueden diferir entre sí.» — director de arte

Se contradicen en el dato y coinciden en el veredicto. El contrato pedía «diferencias mínimas» y el resultado cae
en un doble filo: **si no se ven, no hay decisión; si se ven demasiado, delata la generación**.

### 6. Falta escala, cliente y gente que se repita **[los dos]**

Nadie presenta nada a nadie; ninguna cara aparece dos veces; el equipo más grande son tres personas. «No sé si
son cinco personas o cinco freelancers distintos contratados para la sesión de fotos.»

### 7. Lo que ambos salvaron

`instrumento` («oficio verdadero, específico, difícil de fingir»), `quien-sostiene` («hay dos cosas ocurriendo a
la vez, eso no se improvisa») y `suelo-oblicuo` («la única composición que se arriesga»).

## Lo que sólo vio el director de arte

### 8. Cero texto legible = el tell más grave **[nuevo]**

> «Doce imágenes, cero texto legible. Con lomos de libros, etiquetas de consola, prensa impresa y hojas de
> contacto en cuadro, eso es estadísticamente imposible. Sólo pasa si el sistema no sabe escribir.»

**La regla que protegía estaba delatando.** `No text, no letters, no numbers` existía para evitar marcas de
terceros y el texto deforme del modelo; su efecto acumulado es un mundo sin letras. **Corregido el mismo día** en
el bloque de realismo v3: el texto **existe** y queda ilegible **por causa física**, nunca por estar en blanco.

### 9. Cuatro piezas delatan la generación en menos de diez segundos — y son las que más presumen de técnica

| Pieza | Qué la delata |
|---|---|
| `instrumento` | Lo que se ve **dentro** de la lupa no se alinea con la trama de afuera, y el borde del vidrio no produce distorsión: «el interior es un parche pegado» |
| `little-planet` | La cúpula no cierra con ninguna geometría real; el objeto que carga una figura no es resoluble |
| `quien-sostiene` | Los faders se repiten sin lógica de canal; los medidores son manchas |
| `variantes` | Nueve copias del mismo archivo que difieren entre sí; un brazo sin puño de camisa |

Duele porque son **cuatro de las mejores por concepto**. El concepto no salva la ejecución.

### 10. El lecho pasó de firma a muletilla **[tensión sin resolver]**

Aplicado en **siete de doce**: «es el mismo recurso de profundidad siete veces». Y no se puede quitar sin más,
porque **el lecho ES la firma**: es donde va el logo. Es una tensión real del sistema, no un error de una pieza.

### 11. Inconsistencia geográfica

Mar y palmeras en `ausencia` contra la cordillera en `marcado`: «el registro ejecutivo con vista pelea con el
registro taller nocturno de las otras diez».

## 12. Faltaba la capa, no el espacio: las dos categorías de pieza **[medido y corregido el mismo día]**

Señalado por el operador al leer el hallazgo 8 —«lo del texto nos falta trabajar, así como espacios suficientes
en las composiciones para colocar esos textos»— y confirmado con el validador que ya existía:

```
pnpm foto:validar <plate> --zona-texto     # banda ≥ 0,28 del alto en vertical · columna ≥ 0,42 del ancho en 16:9
```

| Resultado sobre las doce piezas auditadas | |
|---|---|
| Reprueban la zona de texto | **12 de 12** |
| Mejor caso (`escucha`, `quien-sostiene`) | **0,10** del alto |
| Las otras diez | **0,00** |
| Mínimo exigido en 4:5 | **0,28** |

**Corrección del operador al leer esto, y cambia el marco entero:** que las doce reprueben **no es un defecto**.
Una pieza **sin capa gráfica es una categoría legítima del lenguaje** —sirve de **descanso visual**, para relajar
el feed de cualquier red entre piezas con voz— y estas doce están bien como están. El umbral sólo aplica a la
pieza que **va a llevar texto**.

Lo que el número sí prueba es otra cosa: **el sistema no distinguía las dos categorías**, así que no había forma
de saber cuál es cuál hasta después de generar. Y para la segunda **faltaba la capa entera**.

**Las dos categorías, ahora declaradas:**

| | Pieza **muda** | Pieza **con voz** |
|---|---|---|
| Qué es | Sólo fotografía; la firma y nada más | Lleva titular, copy, cursores o selección |
| Para qué | **Descanso visual**: relaja el feed entre piezas que hablan | Dice algo concreto |
| Reserva | No necesita | **Obligatoria y declarada en la toma** |
| Se produce con | `foto:prompt` → `foto:validar` | `foto:prompt` con `reservas` → `foto:validar --zona-texto` → **`foto:componer`** |
| Estado | **Aprobada** desde el 2026-09-19 | **Capa sin aprobar**: es el trabajo abierto |

**El campo `reservas` sigue siendo opt-in a propósito** —forzarlo obligaría a reservar en piezas mudas, que no lo
necesitan— pero ahora **avisa**, para que la categoría sea una decisión declarada y no un olvido que se descubre
cuando el titular no cabe.

**Corregido el mismo día:** `pnpm foto:prompt` **avisa** cuando una ficha no declara `reservas`, con el texto que
importa: *reservar después de generar no existe; o está en la toma, o el texto no cabe*. Avisa en vez de
bloquear porque una pieza sin capa gráfica es legítima.

**No confundir los dos textos**, porque tienen dueños distintos:

| | Texto **de la escena** | Texto **de la pieza** |
|---|---|---|
| Qué es | Lomos, etiquetas, envases, pantallas | Titular, copy, CTA, legal |
| Quién lo pone | El modelo, dentro del plate | Composición determinística, encima |
| Regla | Existe y es **ilegible por causa física** (hallazgo 8, bloque v3) | **Nunca** se genera: se compone con la fuente real |
| Qué necesita | Nada más | **Zona reservada declarada y medida en la toma** |

**Y lo que sigue abierto:** la **capa de composición gráfica sobre la foto no está aprobada** desde el
2026-09-19; su canon es `efeonce-advertising-creative`, no esta carpeta. Los pendientes declarados sigan vivos:
aplicar la reserva a más cámaras (ojo de pez, tele, macro) antes de fijar reglas por toma, y el formato 1:1 sin
probar.

## Veredictos, en sus palabras

> «Gente con muy buen gusto, muy buen equipamiento y un miedo evidente a mostrar el trabajo que ha hecho para
> otros.» — evaluador
> «Hay un sistema visual coherente y una idea central defendible: nuestro valor está en decidir qué se descarta.
> Pero está dicha cinco veces y nunca se muestra el resultado de ninguna decisión. Eso deja un portafolio que se
> ve caro y no prueba nada.» — director de arte

**Conclusión de la auditoría:** el sistema **logró consistencia y todavía no logró credibilidad**. Los dos lo
reconocieron como un mismo autor —eso cierra la mitad del pendiente del maestro— y los dos desconfiaron de él.

## Plan derivado

### Aplicado el mismo día

| # | Acción | Estado |
|---|---|---|
| 1 | **Dosis del acento cálido: 1 de cada 2.** `pnpm foto:prompt` cuenta la tanda y avisa con el número, igual que con la acción suspendida. El azul portador sigue en todas | ✅ `DOSIS_ACENTO` |
| 2 | **Bloque de realismo v3**: el texto existe y es ilegible por causa física, nunca por estar en blanco | ✅ `bloque-realismo-v3.txt` |
| 3 | **Aviso de reserva de texto**: `foto:prompt` avisa si la ficha no declara `reservas`, para que la categoría sea una decisión y no un olvido | ✅ hallazgo 12 |
| 4 | **`pnpm foto:componer` promovido a comando canónico** desde `ai-generations/…/scripts/componer-foto.mjs`. No es un compositor nuevo —el canon lo prohíbe— es el de «Nivel de búsqueda» con su gramática de voces intacta, movido a donde se encuentra. Mismo motivo por el que se promovió `foto:validar` | ✅ |
| 5 | Esta auditoría, citable y con método reproducible | ✅ este documento |

### Lo que falta, en orden de impacto

| # | Qué | Por qué | Cómo se sabe que se logró |
|---|---|---|---|
| 5 | **Ronda «obra real»** (abajo) | Cierra el hallazgo 1, el de mayor impacto comercial | Un evaluador ciego nombra qué trabajo se hizo |
| 6 | **Reabrir `ausencia`** con marcadores de «se fueron hace un minuto» —silla girada, taza a medias, lámpara encendida, algo a mitad— o descartarla | Falla su contrato **[medido]** | Un evaluador ciego dice «acaban de salir», no «oficina vacía» |
| 7 | **Corregir el contrato de `variantes`**: diferencias **mínimas pero comparables** en UN eje declarado (el mismo encuadre, cambiando sólo el color / sólo el peso) | Hoy cae en el doble filo del hallazgo 5 | Se puede señalar en qué se diferencian sin que parezcan archivos distintos |
| 8 | **Decidir sobre `little-planet`** | Dos lecturas independientes la llamaron truco | Decisión del operador, registrada |
| 9 | **Variar el lecho o declararlo explícito** | Hallazgo 10, tensión con la firma | Una serie donde el lecho no sea el mismo recurso siete veces |
| 10 | **Aprobar la capa de la pieza con voz**: plates que reserven desde la toma + `foto:componer` encima, iterando hasta que el operador la apruebe | Es el trabajo que el operador puso como siguiente: *«me gustan como están; sólo tenemos que construir la capa para piezas que con el mismo lenguaje tendrán texto»*. La capa sigue **sin aprobar** desde el 2026-09-19 | Una serie con voz aprobada por el operador, con contraste medido bajo cada caja |
| 11 | **Repetir esta auditoría después de 5 y 6** | Sin segunda medición no se sabe si mejoró | Comparar contra este documento |
| 12 | **Prueba de reconocimiento** (pendiente desde el maestro) | Consistente ≠ distintivo | Alguien reconoce las piezas como Efeonce sin logo |

## La ronda «obra real» — cómo se hace sin romper nada

**El insumo existe.** En OneDrive hay trabajo entregado de clientes reales: **1.016 piezas rasterizadas** de Berel
(artículos, infografías, banners) y los KV y el banco de imágenes de Sky, además de Bresler y Motogas.

**El problema que hay que resolver primero.** Meter la pieza de un cliente dentro de un plate **generado** choca
con tres cosas a la vez: el modelo deformaría el logo del cliente, el canon prohíbe marcas de terceros, y la
regla dura dice **nunca anclar la serie en la categoría de un cliente** (`pintura = Berel`).

**La salida es la misma que ya usa la firma: composición determinística.** El plate nace con una **superficie
vacía declarada** —un pliego en blanco sobre la mesa, una pantalla apagada, un afiche sin arte en la pared— y la
obra real se **compone encima después**, con su perspectiva, nunca se le pide al modelo que la dibuje. Así el
trabajo aparece **exacto**, el logo del cliente no se deforma jamás y la foto sigue siendo sobre el oficio.

Eso pide una capacidad nueva, hermana de las seis reservas existentes:

> **Reserva de obra [propuesta]** — una superficie del plate declarada **plana, vacía, de tono y ángulo
> conocidos**, medible con `pnpm foto:validar`, destinada a recibir una pieza real compuesta después. Es a la
> obra lo que el lecho es a la firma.

**Y la regla anti-categoría se conserva con una distinción que hay que escribir:** la pieza entra como **objeto
del oficio** (se revisa, se marca, se elige, se cuelga), **nunca como tema**. La foto sigue siendo sobre la
decisión. Si la serie empieza a tratarse de pintura, volvió a fallar.

**Gate de derechos: resuelto.** El operador confirmó el 2026-09-20 que **los contratos cubren el derecho de uso
de todos los clientes**, así que la ronda puede producirse para publicar y no sólo para uso interno. Si en alguna
cuenta futura el contrato no lo cubriera, vuelve a aplicar el gate: se consultan `creative-practice` (derechos de
uso en el SOW) y `legal-privacy-ip-operator` **antes** de producir.
