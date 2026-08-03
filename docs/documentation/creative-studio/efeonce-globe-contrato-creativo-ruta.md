# Efeonce Globe — El contrato creativo de cada ruta

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-03 por Claude
> **Ultima actualizacion:** 2026-08-03 por Claude
> **Documentacion tecnica:** [ADR-022 — Contrato creativo versionado por ruta](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md) · [Creative Producer V1](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md) · [`TASK-1633`](../../tasks/in-progress/TASK-1633-globe-producer-operation-input-control-contract.md)

En Globe, una **ruta** es la combinación de un modelo y la forma concreta en que se usa (por ejemplo,
"Veo 3.1 para video a partir de cuadros"). Este documento explica qué declara hoy cada ruta sobre sí
misma, por qué esa declaración reemplazó a los botones por modelo del Producer, y qué parte de todo
esto ya funciona y cuál todavía no.

## Qué problema resuelve

El Producer tenía una fila de botones de modo: **Crear · Editar · Movimiento · Elementos · Escalar ·
Cuadros**. Parecían operaciones, pero no lo eran todas. "Elementos" era el botón de Gemini Omni y
"Movimiento" el de Seedance; ninguno de los dos nombraba algo que la persona quisiera hacer, sino la
forma de entrada que un modelo particular aceptaba.

Esos botones mezclaban cuatro preguntas distintas en una sola:

| La pregunta | Un ejemplo |
|---|---|
| ¿Qué quiero hacer? | crear algo nuevo · editar algo que ya existe · subir la resolución |
| ¿Qué archivos meto, y qué significa cada uno? | esta imagen es el producto · esta otra es sólo el estilo · esta es el primer cuadro del video |
| ¿Cómo lo dirijo? | "dolly in" · "hora dorada" · "ritmo pausado" |
| ¿Qué sale? | 8 segundos · 16:9 · MP4 con audio embebido |

Dos consecuencias concretas de esa mezcla:

- **"Elementos" no era una operación.** Era "meter imágenes de referencia" disfrazado de botón. Al
  elegirlo, el sistema buscaba entre las rutas compatibles y podía **cambiarte el modelo sin
  avisarte**; y si la única ruta de ese modo no estaba disponible, el botón completo quedaba inerte
  sin explicar por qué.
- **Cada modelo nuevo traía su propio botón.** Referencias, cámara, movimiento, estilo y audio son
  conceptos comunes, pero su implementación cambia por ruta. Sin un lenguaje neutral, el modelo
  número veinte iba a llegar con su vigésima taxonomía propia.

> Detalle técnico: la causa de UI está en `MODE_REQUIREMENTS` y la fila de modos de
> `ProducerComposer.tsx` (repo `efeonce-globe`, `apps/studio-client/src/surfaces/producer/composer/`).
> Diagnóstico completo en el [ADR-022 §Context](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md).

## Qué es ahora: una ficha técnica por ruta

Cada ruta publica una **ficha versionada** que declara, en un vocabulario común a todas: qué sabe
hacer, qué archivos acepta y en qué rol, qué controles entiende y de qué manera, y qué produce.

La aplicación **lee esa ficha** en lugar de tener botones a medida. Eso invierte quién manda: antes
la pantalla sabía cosas sobre cada modelo; ahora la ruta las declara y la pantalla obedece. **Un
modelo nuevo trae su ficha y no trae botones.**

Tres propiedades que hacen que la ficha sirva de verdad:

- **Es autocontenida.** La ficha viaja dentro de la revisión de la ruta, así que una corrida vieja se
  puede releer con las reglas que tenía ese día. Nadie cambia el pasado editando un catálogo central.
- **No revela nada del proveedor.** La ficha llega al navegador sin identificadores del proveedor, sin
  slugs, sin costos y sin secretos. Lo que el cliente ve es el modelo público; la traducción a la
  jerga de cada proveedor ocurre del lado del servidor.
- **Se valida antes de gastar.** El servidor comprueba operación, archivos, controles y salida
  **antes** de cotizar y antes de reservar crédito.

Hoy el catálogo va en la versión `1.7.0` y **las 17 rutas publicadas tienen su ficha**.

> Detalle técnico: tipos en `packages/contracts/src/producer-catalog.ts` (`RouteCreativeContractV1`),
> catálogo y guards de carga en `packages/domain/src/producer-catalog.ts`, validación de ejecución en
> `apps/creative-runner/src/production-route-compiler.ts` — todo en el repo `efeonce-globe`. Cómo se
> lee el catálogo en general: [catálogo gobernado de rutas](./efeonce-globe-producer-catalog.md).

## Los cinco ejes de la ficha

### 1. La operación — qué quieres hacer

Ocho intenciones de producto, ninguna con nombre de modelo:
`crear` · `editar` · `extender` · `subir resolución` · `vectorizar` · `traducir` · `cambiar la voz` ·
`sintetizar`.

Una regla de producto se sigue de esto: **cambiar de operación no cambia el modelo**. Si la ruta
elegida no hace lo que pediste, la aplicación lo explica y ofrece una elección explícita. Nunca
sustituye el modelo en silencio.

### 2. Los archivos que metes, y qué significa cada uno

Aquí está el corazón del cambio. Una imagen no es "una imagen": puede ser cosas muy distintas, y el
sistema las distingue con nombre propio.

| Rol del archivo | Qué significa |
|---|---|
| `fuente` | el archivo que se va a transformar (por ejemplo, la imagen que se escala) |
| `referencia` | una guía visual: el sujeto, el producto, el estilo, la escena |
| `primer cuadro` / `último cuadro` | dónde empieza y dónde termina un video |
| `fuente de edición` | la pieza que se está editando |
| `fuente de movimiento` | un video del que se **hereda el movimiento**, no la imagen |
| `audio de origen` | la locución que se va a traducir o a la que se le cambia la voz |
| `máscara` | qué zona de la imagen se toca y cuál no |

Y dentro de "referencia" hay un segundo nivel de significado: **sujeto · personaje · producto · estilo
· escena · storyboard**. Tres imágenes como estilo no son lo mismo que tres imágenes como sujeto,
aunque el archivo tenga el mismo formato.

Cada casilla declara además cuántos archivos admite, qué formatos exactos acepta y **si el orden
importa** (importa en los cuadros de un video; no importa en una fuente única).

Dos distinciones que el sistema nunca vuelve a mezclar:

- **Referencia no es fuente.** Un primer cuadro, un video editable o una máscara tienen semántica
  distinta de "una imagen de referencia de estilo".
- **Dirigir el movimiento no es transferirlo.** Pedir "cámara que se acerca" es dirección creativa;
  entregar un video para que el nuevo herede su movimiento es un archivo con rol propio. Son cosas
  distintas y la ficha las separa.

### 3. Las combinaciones válidas

Una ruta declara **qué conjuntos de casillas forman un pedido legítimo**, y cuál es el
predeterminado. Una ruta puede aceptar "sólo prompt" **y** "prompt más imágenes" como dos formas
válidas, sin que una anule a la otra. Antes esto era irrepresentable: si una casilla exigía al menos
un archivo, lo exigía en todas las formas de uso de esa ruta.

### 4. Los controles creativos y su mecanismo

La ficha lista los controles comunes de dirección: **prompt · restricciones negativas · semilla ·
sujeto · estilo · iluminación · composición · atmósfera · paleta · cámara · lente · movimiento · ritmo
· dirección de audio**.

Lo importante no es la lista, sino que junto a cada control la ruta declara **cómo lo honraría**:

| Mecanismo | Qué significa |
|---|---|
| `parámetro nativo` | el proveedor tiene una perilla real para eso |
| `semántico por prompt` | se expresa como lenguaje dentro del texto que recibe el modelo |
| `condicionado por referencia` | se logra con los archivos que se entregan |
| `preprocesado` / `posprocesado` | ocurre antes o después de llamar al modelo |
| `no soportado` | esta ruta no lo hace, y lo dice |

Además declara **qué forma puede tener el valor**: texto acotado (lo normal, porque estos modelos
responden al lenguaje de oficio —"contrapicado", "hora dorada"— que está en su corpus de
entrenamiento), un conjunto cerrado de opciones cuando el proveedor realmente lo expone así, o un
número con rango. Sin esa forma declarada no habría contra qué validar antes del gasto.

Ejemplo concreto de lo que esto describe bien: **las dos rutas de escalar resolución declaran cero
controles creativos**, y eso es exacto — un upscale no tiene dirección creativa que dar.

### 5. Lo que sale

Modalidad (imagen, video o audio), formatos exactos del archivo, y para video una declaración
explícita del audio: `sin audio` · `audio embebido` · `embebido u opcional` · `se preserva el del
origen`. Esto evita el caso de una ruta que promete sonido y entrega un archivo mudo.

**La forma de salida —duración, proporción, resolución— no es un control creativo**: viaja por su
propio camino, que ya la validaba contra la ruta desde antes.

> Detalle técnico: vocabularios `ROUTE_CREATIVE_OPERATIONS`, `ROUTE_INPUT_SLOT_ROLES`,
> `ROUTE_REFERENCE_ROLES`, `ROUTE_SUPPORT_MECHANISMS`, `ROUTE_CREATIVE_CONTROLS` y
> `RouteControlValueShapeV1` en `packages/contracts/src/producer-catalog.ts` (`efeonce-globe`).
> Decisión de retirar duración/proporción/resolución de los controles:
> [ADR-022 Delta (b)](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md).

## Dónde se escribe qué: tres canales que no se pisan

Esta es probablemente la parte más útil para entender el sistema, porque explica una decisión que no
es obvia: **la ficha de la ruta no recibe lo que pides**.

| Qué | Dónde se escribe | Quién manda |
|---|---|---|
| La dirección creativa (cámara, luz, estilo, ritmo…) | **un solo lugar**: el pedido de texto, ya sea un prompt libre o un brief estructurado por ingredientes | quien pide |
| Si esta ruta honra ese control, y cómo | la ficha de la ruta | la ruta |
| La forma de salida (duración, proporción, resolución) | su propio camino, validado contra la ruta | la ruta y quien pide, juntos |

**Por qué importa que la dirección creativa tenga un solo lugar.** Globe ya tenía la regla de que un
pedido trae **o** un prompt libre **o** un brief estructurado, nunca los dos: pedirlo con ambos se
rechaza con un error explícito. Si además existiera un tercer campo de "controles" con valores, un
pedido podría traer `prompt: "atardecer cálido"` junto a `iluminación: "luz dura frontal"` y **no
sería inválido por ninguna regla**: los dos compilan al mismo texto, los dos entran en la firma del
pedido, y uno ganaría por orden de precedencia sin dejar rastro.

Ese es el modo de falla que se evitó, y es el peor de todos porque **no produce un error que alguien
pueda observar**: produce una pieza distinta de la que se pidió, sin señal. Por eso los controles que
faltaban —cámara, lente, movimiento, ritmo, dirección de audio— se agregaron como ingredientes del
brief y no como un canal nuevo.

Para que ese diseño funcione, los dos lados tienen que nombrar los mismos conceptos. Hoy están
alineados uno a uno: donde había `light` y `lighting`, o `framing` y `composition`, quedó **un solo
nombre por concepto**, y hay una prueba automática que rompe la construcción si vuelven a divergir en
cualquiera de las dos direcciones (un ingrediente que se puede pedir sin que nadie declare si se
honra, o un control que se declara honrado sin que exista dónde pedirlo). Las tres excepciones —el
prompt, que es el brief entero; las restricciones negativas, que viajan en las notas; y la semilla,
que es determinismo y no dirección— están declaradas como tales y también verificadas.

> Detalle técnico: `packages/contracts/src/structured-briefs.ts` (`BRIEF_INGREDIENT_KINDS`),
> `structured-brief-vocabulary.test.ts` y la guardia `producer_prompt_contract_invalid` del cliente
> del Producer, en `efeonce-globe`. Razonamiento completo en
> [ADR-022 Delta (b)](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md).

## Qué pasa cuando pides algo que la ruta no hace

Antes, el pedido viajaba igual y el resultado dependía del proveedor. **Ahora el sistema avisa y no
cobra.**

El caso real y verificable: eliges **subir la resolución** de una imagen y tienes activo un **preset
de estilo** en el composer.

| | Antes | Ahora |
|---|---|---|
| Qué viajaba | el estilo se sumaba al pedido | el pedido se detiene antes de cotizar |
| Qué hacía el modelo | lo ignoraba (agrandar no es reinterpretar) | no llega a correr |
| Qué pasaba con el crédito | se cobraba igual | no se reserva ni se gasta |
| Qué recibías | una pieza sin el estilo que pediste, y el cargo | un error que nombra el control que esa ruta no honra |

La elección fue deliberada: **el error explícito es mejor que el cobro silencioso**. Es cierto que
esto "rompe" un flujo que antes parecía funcionar; lo que hacía en realidad era cobrarte por aplicar
algo que nunca se aplicó. La pantalla que va a impedir que el caso siquiera se plantee —ofreciendo
sólo lo que la ruta honra— es trabajo de `TASK-1552` y todavía no existe.

El rechazo ocurre en la preparación del pedido, es decir **antes del estimado y antes de reservar
crédito**. Y no se degrada en silencio: degradarlo sería exactamente lo que este contrato existe
para evitar.

> Detalle técnico: `UnsupportedBriefControlError` en `packages/domain/src/structured-briefs.ts`, con
> el rechazo dentro de `prepareExperiment` (`packages/domain/src/model-lab.ts`), en `efeonce-globe`.

## Cuando algo se rechaza, ahora dice qué

Antes, **nueve causas distintas daban el mismo mensaje** (`route_creative_contract_mismatch`). El
operador sabía que "algo del contrato no calzó", nunca cuál — y el remedio de cada una es distinto:

| La causa | Qué tiene que hacer quien la recibe |
|---|---|
| la ficha de la ruta cambió de revisión | volver a cotizar contra la revisión vigente |
| esa ruta no hace esa operación | elegir otra operación u otra ruta |
| la casilla de entrada no existe en esa ruta | corregir a qué casilla va el archivo |
| el archivo va con un rol que no corresponde | cambiar el rol declarado |
| el tipo de medio no sirve | conseguir **otro** archivo |
| el formato exacto no sirve | **convertir** el que ya tienes |
| el archivo no se pudo resolver | revisar el asset referido |
| el pedido llegó a medias | volver a prepararlo |

Ocho códigos, uno por causa, con una prueba que impide que vuelvan a colapsarse.

Junto con eso se corrigió algo que estaba oculto: de las 35 razones de rechazo que el compilador sabía
nombrar, **sólo dos estaban clasificadas**. Las otras 33 se trataban como "no sé qué pasó" y por lo
tanto se reintentaban tres veces, gastando tres entregas en un error que es determinista por
definición. Hoy 38 razones están marcadas como **terminales** (no se arreglan reintentando), 3 como
**transitorias** (esas sí se recuperan solas) y 2 se quedan declaradamente en "desconocido", porque
nombran literalmente "algo falló y no sé qué" y ahí reintentar es lo prudente. Una prueba rompe la
construcción si una razón nueva nace sin clasificar.

> Detalle técnico: `PRODUCTION_ROUTE_DEPENDENCY_REASONS` en
> `apps/creative-runner/src/production-route-compiler.ts`, clasificación en
> `packages/domain/src/governed-run-failure-policy.ts`, y
> `production-route-failure-classification.test.ts` como candado — en `efeonce-globe`.

## Estado real: qué funciona hoy y qué falta

De los 17 criterios de aceptación de la task, **10 están cerrados y 7 siguen abiertos**. La task
sigue `in-progress`. Esto **no está terminado**.

### Funciona hoy, desplegado y verificado

- Las 17 rutas publican su ficha; el catálogo va en `1.7.0` y no deja cargar una ruta con la ficha
  incompleta o contradictoria.
- La ficha llega al navegador sin identificadores de proveedor, costos ni secretos.
- Los roles de los archivos (referencia, primer cuadro, fuente de edición, fuente de movimiento)
  conservan su significado hasta el registro de linaje de la pieza.
- Pedir un control que la ruta no honra falla **antes** de cotizar y de reservar crédito.
- Cada rechazo de contrato tiene su razón nombrada y su clasificación.
- Hay un solo dueño por cada valor de dirección creativa, con prueba que lo sostiene.
- Cambiar la ruta, la operación, la combinación elegida, el rol de un archivo o su orden **sí**
  invalida una cotización ya aprobada.
- El peso de un ingrediente ordena el texto pero ya no se imprime dentro de él: antes viajaba al
  proveedor como texto (`[weight=0.820]`), gastaba tokens y no condicionaba nada.

### Falta

- **La compilación del texto todavía no vive detrás del adaptador de cada proveedor.** Ya recibe la
  ficha de la ruta y rechaza lo que la ruta no honra, pero sigue siendo una función única compartida
  por todos los modelos. Su revisión tampoco entra todavía en la firma del pedido, así que dos textos
  distintos para el mismo brief podrían compartir una aprobación.
- **13 de las 17 rutas heredan el mecanismo de sus controles del valor por defecto**, sin evidencia
  propia del contrato oficial de su proveedor. El caso más claro es `restricciones negativas`: se
  declara como "semántico por prompt" en esas 13 rutas, pero **ningún adaptador envía hoy un campo
  negativo nativo** (verificado: cero ocurrencias). Donde no exista ese campo, la salida honesta es
  reformular en positivo o declararlo no soportado — no prometerlo por herencia.
- **Falta la comparación entre la ficha nueva y la declaración legacy** de cada ruta existente, y el
  candado que impida registrar una ruta nueva sin ficha.
- **Falta la evidencia por corrida** de qué controles se aplicaron y cuáles se rechazaron.
- **La pantalla del Producer no cambió.** La fila de seis modos sigue ahí, con "Elementos" y
  "Movimiento" incluidos, y el prompt puede quedar fuera de la vista por scroll. Esa migración es de
  `TASK-1552` y depende de que esta base esté estable.
- **Falta la prueba facturable de Gemini Omni.** La de Seedance ya está registrada. La de Omni está
  bloqueada por un problema propio de transporte que resuelve `TASK-1504`: la identidad aprobada
  declara un proveedor y el runtime inyecta otro, así que cobraría por una identidad distinta de la
  aprobada.

> Detalle técnico: el estado por criterio, con el commit que cerró cada uno, está en los Deltas de
> [`TASK-1633`](../../tasks/in-progress/TASK-1633-globe-producer-operation-input-control-contract.md).
> Lo que falta del eje de compilación está declarado en
> [ADR-022 Delta (c)](../../architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md).

## Relacionados

- [Creative Producer](./efeonce-globe-creative-producer.md) — la consola completa: composer, feed,
  créditos y estado vigente.
- [Catálogo gobernado de rutas](./efeonce-globe-producer-catalog.md) — qué declara cada ruta sobre
  capacidad, forma de salida y modelo público.
- [Flota de modelos del Producer](./efeonce-globe-producer-flota-modelos.md) — por qué una ruta puede
  existir en el catálogo y aun así no estar disponible para ti.
