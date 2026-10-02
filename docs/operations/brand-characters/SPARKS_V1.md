# Sparks V1 — los agentes de Efeonce

> **Tipo de documento:** Especificación canónica de marca (personajes)
> **Versión:** 1.5
> **Creado:** 2026-10-01 por Claude
> **Última actualización:** 2026-10-01 por Claude
> **Estado:** nombre, plantel y relato aprobados por el operador (Julio Reyes) el 2026-09-29; diseño elegido y Spark
> base aprobado el 2026-10-01 («Me encanta»). Kit producido (Spark base v02 y plantel v01, aprobado el 2026-10-01: «Aprobados») y catálogo de `foto:prompt`
> con guarda contra robots. Sin publicar en AXIS; sin prueba de reconocimiento.
> **Task:** [TASK-1941](../../tasks/complete/TASK-1941-sparks-agent-ops-characters.md)
> **Documentación relacionada:** [Lenguaje fotográfico](../brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) ·
> [Registro cine](../brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) ·
> [Ficha de Nexa](../brand-photography/NEXA_CHARACTER_BIBLE_FICHA_V1.md) ·
> [Canon de identidad de Nexa](../../architecture/nexa-intelligence/voice/nexa-identity-canon.md) ·
> [Transformación humano-agente (la oferta)](../../services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md) ·
> [Marca de agencia](../../context/09_marca-agencia.md) ·
> [Mascotas de partners](../social/PARTNER_MASCOT_POSE_LIBRARIES.md) ·
> [Manual de uso](../../manual-de-uso/creative/usar-sparks-en-fotos-de-marca.md) ·
> [Corrida y kit](../../../ai-generations/2026-10-01_sparks/LEEME.md)
> **Dónde viven los archivos del kit:** sellado en `scripts/foto/assets.lock.json` (su respaldo es el canon, vía `pnpm creative:assets:publish`); si falta en disco, `pnpm ai-gen:where` + `pnpm ai-gen:pull` ([contrato](../AI_GENERATIONS_STORAGE_V1.md)).

Convenciones, igual que en la fotografía de marca: **[medido]** = hecho leído en un archivo, una imagen o una prueba ·
**[decisión del operador]** = lo decidió Julio Reyes · **[criterio]** = recomendación propia, revisable ·
**[pendiente]** = no resuelto.

## 1. Qué son

Los **Sparks** (singular: **un Spark**) son los agentes de Efeonce representados como personajes propios de la marca.
Son la cara de **Agent Ops**, el rol de Efeonce que diseña, configura, evalúa y opera agentes dentro de la
[Transformación de equipos humano-agente](../../services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md).
**[decisión del operador, 2026-09-29]**

- **El nombre** sale de la chispa del Nexa Mark (arco + sparkle).
- **Son cinco**, uno por familia de trabajo de Agent Ops: investigación, contenido, CRM y datos, servicio y reportes.
  Comparten forma y color; los distingue un accesorio y un gesto.
- **No son Nexa.** Nexa es la personificación del Why de Efeonce ([09 · marca](../../context/09_marca-agencia.md));
  los Sparks son los agentes que trabajan con el equipo.
- **No son mascotas de partner.** Clawd, Codex y Gigi son criaturas de terceros con su propia gobernanza
  ([inventario](../social/PARTNER_MASCOT_POSE_LIBRARIES.md)); los Sparks son de Efeonce y no llevan aviso de uso
  interno.

**Por qué existen.** Antes de los Sparks, los agentes de las fotos cine eran texto dentro de cada ficha («small
friendly robot agents…») y salían distintos en cada imagen —cuerpo de balón, de gato, cara de pantalla o visor— y
con parecido a robots de terceros (Astro Bot, EVE) **[medido: `NX3`, `NX5b`, `AD2b`, `AD4f`, `BR2`]**. Un diseño
genérico no se puede registrar ni defender, y además contradecía el canon fotográfico, que prohíbe robots.

## 2. El relato

**[decisión del operador, 2026-09-29]**

- **Trabajan con contexto.** Son el reverso de «Tu IA no conoce tu negocio»: un Spark sabe con qué trabaja.
- **Siempre hay una persona que supervisa.** Los Sparks nunca reemplazan personas ni aparecen solos decidiendo.
- **Nexa puede liderarlos en la ficción.** En las piezas de Nexa, los Sparks pueden acompañarla y seguirla.
- **Las piezas de venta de Agent Ops llevan al equipo humano.** Cuando la pieza vende el servicio, aparece la persona
  de Efeonce o del cliente que supervisa, no sólo Nexa con los Sparks.

El relato no cambia los límites de la oferta: Efeonce no vende «un organigrama de bots», cada agente tiene ficha de
rol y dueño humano, y el agente no tiene accountability corporativa
([oferta, «Diseño del equipo híbrido»](../../services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md#diseño-del-equipo-híbrido)).
Un Spark es un **personaje**, no un producto ni un agente que exista en el tenant de un cliente.

## 3. El diseño (invariantes)

**[decisión del operador, 2026-10-01]** Ante el parecido del Spark de la destacada «Agents» (`PH7`) con Astro Bot, el
operador eligió «Agents refinado» y, entre tres refinamientos (A, la marca en la cara; B, la órbita; C, la nave),
**B + las tres ventanas de C**. Láminas de las direcciones: `ai-generations/2026-10-01_sparks/direcciones/`.

| Rasgo | Cómo es | De dónde viene |
|---|---|---|
| Cuerpo | Esfera blanca brillante del tamaño de una pelota de fútbol (≈ 22 cm), con paneles y respiraderos navy | La esfera de la marca |
| Sin piernas | **Flota** unos centímetros sobre la superficie, con un brillo azul debajo | — |
| Visor | Navy y ovalado, con **exactamente dos ojos** y una **sonrisa en arco** de LED azul | La sonrisa del Nexa Mark |
| Antena | La **chispa de cuatro puntas** del Nexa Mark, encendida | El Nexa Mark |
| Órbita | **Anillo** blanco inclinado ≈ 25°, más alto en su lado izquierdo, con **una esfera** pequeña | La órbita de la línea gráfica |
| Panza | **Tres ventanas** redondas | La nave Efeonce |
| Brazos | Cortos y blancos, articulaciones navy, manos oscuras de cuatro dedos | — |
| Color | Sólo blanco, navy `#001A33` y azul `#0375DB` (ojos, ventanas, antena y costuras) | El acento del traje de Nexa |

Lo que **no** puede pasar: que se parezca a Astro Bot, EVE o BB-8; que cambie de forma o color entre Sparks; que el
anillo se espeje (por eso el perfil derecho es una vista propia y no un reflejo del izquierdo **[medido]**).

## 4. El plantel

Mismo cuerpo y mismo color en los cinco. Los distingue un **accesorio físico** (un objeto real, sin texto, que el
Spark siempre está tocando) y un **gesto**. **[decisión del operador; accesorios fijados en el kit del 2026-10-01]**

La ficha de cada personaje refleja la **ficha de rol** de la oferta, que gradúa la autoridad de un agente en
`leer y resumir → proponer → ejecutar dentro de límites reversibles → acciones externas o sensibles bajo aprobación
específica`. La columna «qué ejecuta» es el **techo del personaje en el relato**, no una promesa comercial: en un
cliente, lo fija su ficha de rol real **[criterio, derivado de la oferta]**.

| Spark | Familia | Qué lee | Qué propone | Qué ejecuta | Accesorio | Gesto | Catálogo |
|---|---|---|---|---|---|---|---|
| **Spark de investigación** | Lee y resume fuentes | Las fuentes autorizadas del trabajo | Un resumen para quien decide | Nada por su cuenta: entrega el resumen a su dueño humano | Lupa de mango blanco y aro navy, lente apenas azul, **siempre al costado, nunca delante del visor** | Examina de cerca | `spark-investigacion` |
| **Spark de contenido** | Propone borradores | El brief y los insumos autorizados | Borradores y variantes | Nada externo: publicar o enviar lo autoriza la persona, por separado | Tarjeta blanca delgada con un trazo azul de pincel | La ofrece con las dos manos | `spark-contenido` |
| **Spark de CRM y datos** | Ordena registros | Los registros y sus fuentes | Correcciones y orden | Sólo cambios reversibles dentro de los límites acordados; modificar una oportunidad tiene su propia regla de permiso | Pila ordenada de fichas redondeadas blancas y navy | Pone una ficha más encima | `spark-crm-datos` |
| **Spark de servicio** | Responde y deriva | La consulta y el conocimiento aprobado | Una respuesta | Resuelve lo rutinario, elegible y reversible; lo demás lo deriva al especialista humano con resumen y evidencia | Objeto blanco con forma de burbuja de conversación y tres puntos azules | Saluda con la otra mano | `spark-servicio` |
| **Spark de reportes** | Mide y reporta | Las métricas con su baseline | La lectura del período | Entrega el reporte a su dueño; no decide qué se hace con él | Maqueta de escritorio de un gráfico de tres barras crecientes, la más alta azul | Señala la barra más alta | `spark-reportes` |

Los casos de servicio y contenido siguen los dos ejemplos de la oferta (servicio posventa e instancia de marketing).

## 5. Reglas de uso

| Regla | Qué significa | Fuente |
|---|---|---|
| **Escala** | Nunca más grande que la cabeza de la persona; siempre por encima de la cintura (sobre el hombro, junto a la cabeza, sobre el escritorio, en la palma) | [decisión del operador] |
| **Registro** | Cine y puesta en escena; **nunca documental**. El documental retrata el oficio real de Efeonce y un personaje de ficción no cabe ahí | [decisión del operador] · guarda §7 |
| **Nunca solos decidiendo** | Siempre hay una persona que supervisa en la escena o en el relato de la pieza | [decisión del operador] |
| **Venta de Agent Ops** | La pieza lleva al equipo humano | [decisión del operador] |
| **Referencias en una toma cine** | **Dos Sparks con referencia como máximo**, los del plano cercano. El resto entra sin imagen propia («the same figures as the Spark references»), lejos y fuera de foco. Cinco con referencia salen nítidos, del mismo tamaño y con luz propia: stickers | [decisión del operador, 2026-10-02, `NX7d` aprobada] · [registro cine, delta 2026-10-02](../brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md) |
| **Uno o varios** | Un Spark o varios. Con varios, cada uno con su accesorio o su acción: un grupo idéntico se lee como relleno. Con tres el flujo se lee; cinco ya es escuadrón | [criterio del registro cine §8] |
| **Los cinco juntos** | Sus anillos de órbita nunca se cruzan | Catálogo `sparks-plantel` |
| **El accesorio** | Siempre tocándolo, sin texto, y **nunca delante del visor** | [decisión del operador] |
| **Nunca en la reserva** | Igual que cualquier objeto del registro cine: la reserva del texto queda limpia | [registro cine §8 y §9.1] |
| **No abren el registro cine** | Usar un Spark no habilita el cine en una pieza que no lo tenía: siguen valiendo los casos del registro cine | [criterio] · [registro cine §2](../brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#2-cuándo-se-usa--y-cuándo-no) |
| **Plantel y Spark base** | Para un ángulo o una expresión que el plantel no tiene, se usa el Spark base (mismo cuerpo) | [criterio] |

## 6. Cómo se usa en `foto:prompt`

Un Spark **se declara desde el catálogo**, nunca se describe a mano. En la ficha de toma:

```json
"objetos": [{ "objeto": "spark-servicio", "vista": "heroe" }]
```

El catálogo vive en [`scripts/foto/build-prompt.mjs`](../../../scripts/foto/build-prompt.mjs). Cada entrada copia la
forma exacta desde la imagen de referencia y lleva en su instrucción la escala y la regla de supervisión humana.

| Objeto | Qué es | Vistas |
|---|---|---|
| `spark` | El Spark base | **26:** `frente`, `tres-cuartos-izq` (defecto), `tres-cuartos-der`, `perfil`, `perfil-der`, `espalda`, `espalda-recta`, `trasero-izq`, `contrapicado`, `picado`, `mira-arriba`, `mira-abajo` · expresiones `atento`, `trabajando`, `pide-revision`, `listo`, `sorprendido`, `pensando` · luz cine `cine-frente`, `cine-tres-cuartos`, `cine-mira-arriba` · acciones `volando`, `senalando`, `presenta`, `entrega-tarjeta` · `grupo` (tres) |
| `spark-investigacion` · `spark-contenido` · `spark-crm-datos` · `spark-servicio` · `spark-reportes` | Un Spark del plantel, con su accesorio | `heroe` (defecto), `frente`, `tres-cuartos-der`, `mira-arriba`, `cine` |
| `sparks-plantel` | Los cinco juntos | `frente` |

Las cuatro escenas de escala con Nexa (`ai-generations/2026-10-01_sparks/fichas/SPK-E1` a `SPK-E4`: hombro, palma y
antebrazo, escritorio, entrega de tarjeta) son las fichas de ejemplo: registro cine, Nexa con la chaqueta del
uniforme y el bordado verificado al 100 % **[medido]**.

### 6.1 El Spark en el color de una línea de negocio **[operador, 2026-10-01: «Aprobados todos»]**

El **mismo** Spark puede llevar el LED en el acento de una línea de negocio (tokens `efeonceGraphicLine.lines`): no es
un personaje nuevo ni cambia el plantel, sólo el color de toda su luz —ojos, sonrisa, ventanas, antena, costuras y el
brillo bajo la esfera—, siempre de un solo color. El azul de **Engine** (`#0375DB`) es el defecto.

| Línea | Acento | `color` en la ficha |
|---|---|---|
| Engine (defecto) | `#0375DB` | `engine` |
| Growth | `#36C8BF` | `growth` |
| Brand | `#FF6500` | `brand` |
| Voice | `#F83902` | `voice` |
| Revenue HubSpot | `#E86BD0` | `revenue-hubspot` |
| Revenue Salesforce | `#2FB8FF` | `revenue-salesforce` |

```json
"objetos": [{ "objeto": "spark", "vista": "mira-arriba", "color": "growth" }]
```

- **Sólo cuando la pieza es de esa línea**; en cualquier otra, el azul de Engine.
- **Brand y Voice son cálidos:** en estudio no tiñen la escena, pero en una foto cine oscura el LED puede llevar la cara
  de la persona al ámbar (la trampa de la criatura cálida, `.claude/rules/brand-photography.md`). Se prueban en cine
  antes de usarse en una foto oscura.
- **Salesforce y Engine casi no se distinguen** en un LED pequeño (celeste contra azul): en una pieza de Salesforce, el
  Spark no carga la identificación de la línea; la pieza la da por otro lado. Lo mismo, en menor medida, Brand y Voice.
- Disponible para las 26 vistas del Spark base (en el paquete `@efeoncepro/axis-brand-assets` ≥ 0.4.10, `spark-<línea>-<NN>-<vista>.png`);
  el plantel de cinco sigue en azul.

## 7. La guarda contra robots

`foto:prompt` (y `foto:generar`, que lo usa) aborta en dos casos, con la función `validarRobots`:

1. **La escena describe un robot sin declarar un Spark.** Busca *robot, robotic, droid, droide, bot, android,
   androide, cyborg, mecha* (singular o plural) y aborta si ningún objeto de la ficha empieza por `spark`. Las
   negaciones («no robots», «sin robots», «never a robot») no cuentan.
2. **Un Spark en el registro documental.** Aborta si la ficha declara `registro: "documental"` o usa una palanca
   documental: `escucha`, `manos`, `sombra`, `silueta`, `marcado` o `quien-sostiene`.

**Medido sobre 301 fichas existentes:** frena 13, todas con robots descritos a mano (`NX3`–`NX5`, `RV1`, `WB1`, `AD2`,
`AD4*`, `BR2`, `BR4`, `PH7`), sin falsos positivos. Pruebas en `scripts/foto/build-prompt.test.ts`. Esas 13 fichas
son historia: regenerarlas con Sparks es una decisión aparte (§11).

## 8. Dónde están los archivos

| Qué | Dónde |
|---|---|
| Corrida, prompts, fichas y LEEME (las imágenes no se versionan) | Repo: [`ai-generations/2026-10-01_sparks/`](../../../ai-generations/2026-10-01_sparks/LEEME.md) |
| Spark base con fondo de estudio · transparente | `angulos/` · `transparente/` (masters de 1600 px; el catálogo lee el paquete, ver abajo) |
| Fuentes editadas para recortar | `fuente-recorte/` |
| Escenas con Nexa | `escenas/` |
| Plantel con fondo de estudio · transparente | `plantel/` · `plantel-transparente/` (masters de 1600 px) |
| **Fuente del catálogo de `foto:prompt`** (desde 2026-10-01) | Paquete versionado y sellado `@efeoncepro/axis-brand-assets` 0.4.10, fijado en Greenhouse: `node_modules/@efeoncepro/axis-brand-assets/assets/sparks/` (recortes de 1024 px, mismos nombres). Lab: [axis.efeonce.org/references/sparks/](https://axis.efeonce.org/references/sparks/) · masters en el bucket `sparks/v1/` |
| Direcciones de diseño y vistas base de la v01 | `direcciones/` · `base/` |
| Copia del equipo, Spark base | OneDrive `Alineación/5. Contenidos/13- Branding/Sparks/2026-10 Spark base/v02/`: 59 archivos en «Fondo de estudio», «Transparente», «Con Nexa» y «Diseño», con LEEME y manifiesto |
| Copia del equipo, plantel | OneDrive `…/Sparks/2026-10 Plantel/v01/`, con LEEME y manifiesto |

**Qué se produjo [medido]:** Spark base con 26 vistas a 1600 px, cada una con fondo de estudio y transparente, y 4
escenas de escala con Nexa; cada Spark del plantel en 5 vistas (estudio y transparente) y una foto de los cinco
juntos. Costo total del día ≈ USD 8.

**Lección del recorte [medido].** El blanco del cuerpo en sombra queda del mismo gris que el fondo de estudio y el
matting lo vuelve semitransparente (100 a 200 mil píxeles). Se corrige editando la fuente a un fondo gris medio
`#7F7F7F` antes de recortar: quedan cerca de 20 mil, sólo el borde. En «volando» la estela de luz no sobrevive al
recorte; está en la versión de estudio.

### 8.1 El rig: el Spark que mira **[operador, 2026-10-01: «me encantó»; v2 por capas: «vamos con todo»; canónico el 2026-10-02: «canonicemoslo»]**

**Canónico y en paquetes versionados de AXIS** (tag `v0.4.12`): el componente en `@efeoncepro/axis-graphic-line`
0.14.0 (`/spark-rig` → `defineSparkRigElement()` registra `<efeonce-spark-rig>`; `/react` → `<SparkRig line expression />`),
el contrato `efeonce.spark-rig` 0.1.0 `stable` en `@efeoncepro/axis-ui-contracts` 0.3.41 (`resolveSparkRigIntent`: el
acento de la línea sale de los tokens, nunca a mano) y las capas en `@efeoncepro/axis-brand-assets` 0.4.12
(`AXIS_SPARK_RIG`, `sparkRigBase`). Para páginas sin empaquetador, el archivo único
`https://axis.efeonce.org/references/sparks/rig/spark-rig.js` se genera del paquete. Una versión de capas nunca se
pisa: un cambio es versión nueva. La adopción en Greenhouse (primitive propia y primeros usos) va por task aparte.


Para superficies interactivas (el Lab, Greenhouse, sitios, demos) existe un rig 2.5D por capas: el componente web
`<efeonce-spark-rig>`, publicado en el Lab de AXIS ([`/references/sparks/#rig`](https://axis.efeonce.org/references/sparks/#rig);
datos en `/references/sparks.json` → `rig`).

- **Piezas:** el render aprobado del Spark base separado en 14 capas alineadas: cuerpo, mitades trasera y delantera
  del anillo, antena, dos brazos y cuatro poses de mano por lado (palma, abierta, señala, puño). Una carpeta por línea
  (bucket `sparks/v1/web/rig/v2/<línea>/`).
- **Movimiento:** cada pieza gira desde su pivote con resortes (inercia y rebote). Además, inclinación al girar,
  estiramiento al flotar, salto con anticipación, antena que se sacude y chispa que pulsa.
- **Lenguaje corporal:** saluda al aparecer, salta con un clic y señala el puntero cuando se queda quieto a un lado.
  Cada expresión tiene su gesto: atento, trabajando (tecleando), sorprendido, pensando (índice arriba) y listo (puños
  arriba). La cara de LED se dibuja en vivo; los ojos se adelantan al cuerpo. Respeta el movimiento reducido.
- **Color:** el componente no escribe colores; quien lo usa le pasa el acento de la línea desde los tokens.
- **Reglas:** es el mismo Spark del kit (no se le agregan formas, poses, expresiones ni colores fuera del componente;
  una pose nueva se produce como capa alineada y se publica en AXIS); un rig por pantalla; en una foto, el Spark sale
  del catálogo de `foto:prompt`, nunca de una captura del rig.
- **Límite:** es 2.5D, gira poco a propósito. El Spark en 3D real (giro completo) está en exploración
  (`ai-generations/2026-10-01_sparks/3d/`).
- Producción y receta en `ai-generations/2026-10-01_sparks/rig/LEEME.md`.

## 9. El nombre: revisión de colisión

Búsqueda web del 2026-10-01 **[medido]**:

| Uso existente | Qué es | Fuente |
|---|---|---|
| «Sparks AI» | Plataforma de agentes de IA (2025) | <https://www.producthunt.com/products/sparks-ai> |
| «Gemini Spark» | Agente de Google | <https://gemini.google/overview/agent/spark/> |
| «SPARK AI» | Marca registrada de LogicGate en software (serie 98914802) | <https://www.trademarkia.com/spark-ai-98914802> |
| Spark Mail (Readdle) | Correo con agentes y personas | <https://sparkmailapp.com/blog/introducing-spark-cli> |

La task nombraba también Adobe Spark (hoy Adobe Express); no está entre los resultados registrados de esta búsqueda.

**Recomendación [criterio]:**

- «Sparks» sirve como **nombre interno de los personajes**.
- En uso público, siempre **«los Sparks de Efeonce»**, nunca «Sparks» solo.
- **No** usarlo como nombre de producto, servicio o SKU, ni registrarlo como marca sin revisión de Legal. El trámite es
  de Legal, no de esta especificación.

## 10. Qué no hacer

- **No describir un robot a mano** en una ficha: la guarda aborta y, si se esquiva, sale un robot distinto en cada foto.
- **No poner un Spark solo decidiendo** ni como reemplazo de una persona.
- **No vender Agent Ops sin el equipo humano** en la pieza.
- **No agrandarlo:** nunca más grande que la cabeza de la persona, nunca por debajo de la cintura.
- **No usarlo en el registro documental.**
- **No cambiarle forma ni color** entre Sparks; sólo cambian accesorio y gesto.
- **No poner el accesorio delante del visor** ni agregarle texto.
- **No llamarlo «Sparks» a secas en público** ni usar el nombre como producto.
- **No presentarlo como un agente real** del cliente ni como promesa de autonomía: es un personaje.
- **No espejar una vista** para obtener el lado contrario: el anillo se invierte.

## 11. Pendiente

| # | Pendiente | Tipo |
|---|---|---|
| 1 | Regenerar con Sparks las fotos aprobadas que llevan robots genéricos (`NX5b` y derivadas, la destacada «Agents» `PH7`) | Decisión del operador |
| 2 | El Spark en 3D real (que gire completo): en exploración con un modelo generado desde las vistas del kit. Rive no sirve para esto, porque es 2D | Producción + aprobación del operador |
| 3 | Adoptar el rig en Greenhouse: subir los paquetes de AXIS, primitive `GreenhouseSparkRig` y primeros usos (task aparte) | Greenhouse |
| 4 | Revisión de Legal si se decide registrar el nombre | Legal |
| 5 | ¿Las cinco familias calzan con lo que Agent Ops vende hoy? (pregunta abierta de la task) | Operador |
| 6 | Prueba de reconocimiento: son un sistema consistente, no un activo distintivo medido | Operador |
| 7 | ~~Exportar el Spark 2D a SVG y publicarlo en AXIS~~ — hecho el 2026-10-01 (`axis-brand-assets` 0.4.11). Queda: que Greenhouse fije 0.4.11 cuando una pieza lo use | Greenhouse |
