# Producir una serie de briefs editoriales SEO/AEO en el Content Hub de un cliente

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 1.2
> **Creado:** 2026-08-25 por Claude
> **Última actualización:** 2026-08-25 por Claude
> **Módulo:** Growth / SEO — producción editorial para clientes
> **Ruta en portal:** ninguna. La operación ocurre en el sistema editorial del **cliente** (Notion u otro), no en Greenhouse. Greenhouse aporta el dato medido (Search Console).
> **Documentación relacionada:** [modelo operativo de priorización editorial](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md) · [estructura canónica del brief](../../operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md) · skill `seo-aeo` ([módulo 02 — contenido](../../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md), [módulo 07 — medición](../../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md)) · [plantilla del brief](../../../.codex/skills/seo-aeo/templates/content-brief-aeo.md) · [caso fuente](../../audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md)

## Para qué sirve

Un cliente tiene su calendario editorial en su propio sistema (Notion, en el caso fuente) y hay que dejar ahí una serie de briefs listos para que alguien los redacte. Este manual es la secuencia mecánica de esa entrega: leer el sistema del cliente sin romperlo, encontrar los espacios vacíos del calendario, preparar el insumo compartido, derivar la convención de assets del cliente cuando el brief lleva plan de distribución, escribir cada brief dentro de la página que le corresponde y **verificar con conteos** que quedó bien.

Sirve igual si escribes tú solo o si repartes el trabajo entre varios agentes. De hecho el runbook está diseñado para lo segundo: casi todos los pasos existen para que varias manos escribiendo en paralelo produzcan piezas **consistentes entre sí** y no cinco versiones distintas de los mismos números.

**Lo que este manual NO cubre, y dónde vive:**

| Pregunta | Dónde se responde |
|---|---|
| Por qué se prioriza un tema y no otro; los dos carriles; las trampas de medición de Search Console | Skill `seo-aeo`, [módulo 02](../../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md) y [módulo 07](../../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md) |
| El proceso de research de punta a punta (insumos, jerarquía de confianza, secuencia, antipatrones) | [`SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md) |
| Qué bloques lleva un brief, en qué orden y con qué techo de extensión | [`SEO_CONTENT_BRIEF_STRUCTURE_V1.md`](../../operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md) — 11 bloques, bloqueantes arriba, techo duro de 12.000 caracteres y la frontera brief/dossier |
| El checklist de oficio de citabilidad que va **dentro** de los bloques de estructura y descubribilidad | [`templates/content-brief-aeo.md`](../../../.codex/skills/seo-aeo/templates/content-brief-aeo.md) de la skill `seo-aeo` |
| El caso fuente con sus cifras y hallazgos | [`docs/audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](../../audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md) |

## Antes de empezar

### Accesos e insumos

| Necesitas | Para qué | Cómo confirmas que lo tienes |
|---|---|---|
| Acceso al **Content Hub del cliente** (Notion u otro), por MCP o por invitación al espacio | Leer el esquema, inventariar filas y escribir en las páginas | Una lectura de la base devuelve el esquema y las filas, no un error de permisos |
| **Search Console del cliente conectado en Greenhouse** | La línea base **medida** de cada tema (impresiones, clics, posición) | La marca aparece con conexión activa; ver [Conectar Search Console a una marca](conectar-search-console.md) |
| Una **herramienta de keywords** (volumen y dificultad de terceros) | La demanda que el cliente **todavía no tiene**, que por construcción no puede salir de Search Console | Un reporte de prueba devuelve datos |
| El **inventario del sitio del cliente** (URLs de contenido, fichas de producto, hubs) | Saber qué ya existe, qué canibaliza y a qué se enlaza | Una lista de URLs verificada contra el sitio, no contra un documento |
| El **repositorio de entregables del cliente** de ciclos anteriores (piezas gráficas, video, banners) — solo si el brief lleva plan de distribución | Derivar la convención de nombres y de slots del cliente en vez de inventar una propia | Puedes listar el contenido de las carpetas de los últimos ciclos, no solo buscar por nombre de archivo |

### La autorización, que no es un trámite

El Content Hub es **sistema del cliente**: ahí vive su calendario, sus estados y su forma de trabajar. Antes de la primera escritura tienes que tener del operador, por escrito y de forma explícita:

- **qué páginas** se pueden tocar (nómbralas, una por una);
- si se pueden **llenar propiedades** o solo agregar contenido al cuerpo;
- si se pueden **cambiar títulos** (por defecto: **no**).

Sin eso, el alcance por defecto es el mínimo: **agregar contenido al cuerpo de las páginas que el operador nombró, y nada más**. Un campo mal llenado en el sistema de un cliente no es un bug tuyo: es trabajo del cliente que alguien va a tener que deshacer.

## Paso a paso

### 1. Leer el sistema editorial del cliente antes de escribir una sola línea

No asumas nombres de campos ni valores. El vocabulario es del cliente y cambia entre clientes.

**a) Obtén el esquema y las fuentes de datos.** Con Notion MCP, `notion-fetch` sobre la URL o el id de la base devuelve la estructura: las propiedades con su tipo y, cuando la base tiene varias, las *data sources* que la componen.

**b) Inventaria las filas.** Con `notion-query-data-sources` en **modo SQL** obtienes el listado completo con los campos que te interesan, en vez de ir página por página. Es la forma barata de ver el calendario entero.

**c) Anota, antes de tocar nada:**

- el **nombre exacto** de cada propiedad (mayúsculas, tildes y espacios incluidos);
- su **tipo** (texto, select, fecha, relación, persona);
- para los `select`/`multi-select`, la **lista de valores válidos** — no inventes uno nuevo;
- para las **relaciones**, a qué base apuntan realmente. Ojo acá: una relación puede estar apuntando a una base que no es del cliente (en el caso fuente, tres relaciones del hub apuntaban a bases internas de la agencia y ninguna fila del cliente las usaba). Si están vacías, déjalas vacías: llenarlas "para ordenar" es exactamente lo que no se hace sin autorización.

**d) El formato de las fechas.** Las propiedades de fecha **no se escriben con el nombre pelado**. Se usa el formato expandido:

```
date:<Nombre de la propiedad>:start
```

Por ejemplo, una propiedad llamada `Fecha de publicación` se escribe como `date:Fecha de publicación:start`. Escribirla sin el prefijo y el sufijo es el error que hace que la escritura "funcione" sin que la fecha aparezca.

### 2. Identificar los slots

Un **slot** es una fila del calendario que ya tiene fecha de publicación asignada pero **todavía no tiene tema definido**. Es el hueco donde va tu brief.

Cómo se reconocen, en orden de confianza:

1. **Título de relleno** — patrones tipo "Artículo nuevo", "Sin título", "Serie 1 / Serie 2", numeraciones sueltas.
2. **Estado inicial** — el primer valor del flujo del cliente (el equivalente a "Por definir" / "Backlog"), no un estado avanzado.
3. **Fecha de publicación futura** — coherente con el período que te encargaron.
4. **Cuerpo en blanco** — y este es el único que realmente prueba que está vacío.

⚠️ **Verifica el vacío antes de escribir, página por página.** La vista de tabla te muestra propiedades, **no el cuerpo**. Una fila puede verse como slot libre y tener adentro un borrador de otra persona. Haz `notion-fetch` sobre **cada** página candidata y confirma que no hay contenido. Si tiene algo, no es un slot: es trabajo de alguien y se pregunta antes de tocarlo.

Registra la correspondencia **slot ↔ tema** en tu propio archivo de trabajo, fuera del sistema del cliente. Ese mapa es tuyo; el cliente nunca debe ver tus números de slot (ver "Qué no hacer").

### 3. Construir el dossier de hechos verificados

Este es el paso que hace que todo lo demás funcione, y el que más se salta.

Es **un solo archivo** con **todos** los datos verificados que las piezas de la serie van a citar. Lo escribes una vez, antes de repartir el trabajo, y todos los que escriban un brief leen **ese** archivo.

Qué lleva:

- **Quién es el cliente**: qué fabrica o vende, catálogo, líneas de producto, geografía y perfil real del lector.
- **Panorama competitivo**: quién domina la categoría, con qué páginas y por qué; y qué compite de verdad en los resultados del país que importa (no el que asumes).
- **Línea base medida** por tema, desde Search Console: impresiones, clics, cantidad de consultas y posición, con la **ventana de fechas declarada**.
- **La curva de CTR del propio sitio**, si hay datos suficientes. Es lo que convierte una posición en clics esperables sin tener que estimar el sesgo del vertical.
- **Inventario del sitio**: qué páginas existen, cuáles capturan más, cuáles ya ganan, cuáles se canibalizan entre sí.
- **Defectos de arquitectura verificados** contra el sitio real, no contra un documento que los afirmaba.
- **Hechos de producto citados textualmente de ficha**, con su unidad y su idioma original. Con las advertencias explícitas de lo que la ficha **no** dice.
- **Hipótesis ya descartadas con datos**, para que nadie las reabra.
- **Errores de método ya cometidos y corregidos**, para que no se repitan.

Y una regla escrita **dentro** del archivo, en las primeras líneas:

> Todo lo de aquí está verificado, con su fuente. **No agregues cifras que no estén aquí.** Si algo falta, decláralo como no verificado.

**Por qué existe el dossier:** evita que cada persona o agente re-investigue lo mismo (y llegue a números levemente distintos), evita que alguien rellene un hueco con una cifra inventada, y hace que las piezas de la serie sean **comparables entre sí**, que es parte del entregable. Sin dossier, cinco briefs son cinco investigaciones sueltas que se contradicen en el pie de página.

> El detalle de qué insumo pesa más que cuál —incluido el marcado de evidencia MEDIDO / OBSERVADO / ESTIMADO / INFERIDO / REPORTADO, que **viaja al brief dato por dato**— y la secuencia del research que produce este archivo, están en el [modelo operativo](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md), §2 y §5.

### 4. Inventariar los entregables del cliente y derivar la convención de assets

**Solo si el brief lleva plan de distribución o atomización** (piezas derivadas: posts, carruseles,
banners, video corto). Si el encargo es únicamente el artículo, sáltate este paso.

La regla: **la convención la pone el cliente y tú la descubres**. No se inventa un esquema propio de
nombres ni de slots — un plan escrito en tu vocabulario obliga a traducir a quien produce y se abandona
en el primer ciclo.

**a) Barre por carpeta y por extensión, nunca por patrón de nombre.** Lista el contenido completo de las
carpetas de entregables de los últimos ciclos y agrúpalo por período. Un `grep` anclado a la convención
de nombres vieja devuelve **cero** para el mes que ya migró a otra, y te va a hacer concluir que los
entregables desaparecieron cuando están ahí, con otro nombre y otra extensión. Para afirmar una ausencia
hay que cambiar el eje de búsqueda y decir explícitamente dónde no miraste.

**b) Deriva la convención.** Qué código lleva cada slot, cuántas piezas trae un ciclo completo, cuál es
portada y cuál es cierre, a qué canal va cada una.

**c) Anota la degradación, si la hay** — y casi siempre la hay: un código de slot que desaparece, el
conteo de piezas que baja, dos o tres convenciones conviviendo el mismo mes, un canal que se encoge
mientras otro crece, la carpeta de un slot importante vacía. Es **un hallazgo para el operador, no una
corrección tuya**. Y antes de reportarlo, reverifícalo con el equipo dueño: una carpeta vacía puede ser
sincronización de almacenamiento pendiente y no una entrega incumplida. Un hallazgo de inventario local
no es una acusación de proceso.

**d) Amarra cada pieza derivada a la sección del brief de donde sale su contenido.** Sin esa referencia,
quien diseña inventa el mensaje. Y si la sección de origen es un H2 condicionado a un dato que todavía no
llegó, la pieza derivada queda condicionada igual.

**e) Si el canal lo publica otro** (otra agencia, el equipo del cliente), lo que entregas no es una
parrilla: es un **paquete de insumo**, campo por campo — imagen, título, descripción, URL de destino,
texto alternativo, tablero o categoría sugerida y fecha **sugerida**, no comprometida. Y no prometas
cobertura de publicación: tu objetivo medible es el insumo entregado. El fundamento y las consecuencias
de medición están en el [modelo operativo](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md) §9.

### 5. Escribir el brief en la página del slot

Un brief, una página, **una sola mano escribiendo**. Si repartes el trabajo, el paralelismo es **por pieza**, nunca por sección de una misma pieza.

⚠️ **Antes de abrir el sistema del cliente, mide el largo del brief.** El techo es **12.000 caracteres** ([estructura canónica del brief](../../operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md)). Se cuenta sobre el texto que vas a escribir —mecánicamente, no a ojo— y se hace **antes** de la escritura. Si se pasa del techo, no recortes frases al final: lo que sobra es research infiltrado y su lugar es el anexo enlazado. Descubrirlo después obliga a reescribir la página completa en el sistema del cliente, que es justo el trabajo que este runbook trata de no generar. De referencia: un brief bien construido con esos once bloques cabe en ~10.000 caracteres sin recortar nada.

#### a) Confirma que la página está en blanco

`notion-fetch` sobre la página, otra vez, justo antes de escribir. Es barato y es la única forma de no pisar algo que apareció entremedio.

#### b) Todo el contenido va dentro de un encabezado desplegable de nivel 1

El brief es largo. Si lo escribes suelto, el calendario del cliente queda ilegible. La convención es meter todo el brief dentro de **un** desplegable, que se abre solo cuando alguien lo va a leer.

La sintaxis de Notion para eso es un encabezado con el atributo `toggle`:

```
Brief editorial de <título del artículo>. El contenido completo va en el desplegable.
# Brief editorial — <título del artículo> {toggle="true"}
	## 1. Definición del artículo
	Primer párrafo del brief.
	
	## 2. Demanda verificada
	| Keyword | Volumen | Fuente |
	|---|---|---|
	| … | … | … |
```

⚠️ **Los hijos van indentados con TABULADOR.** Es la regla que más se rompe y el error más común de todo este runbook. Lo que **no** está indentado queda **fuera** del desplegable: se ve como contenido suelto en la página, el desplegable aparece vacío, y **nada falla** — la escritura devuelve éxito igual.

Así se ve el error:

```
# Brief editorial — <título del artículo> {toggle="true"}
## 1. Definición del artículo     ← en columna cero: queda FUERA del desplegable
Primer párrafo del brief.         ← también fuera
```

Un tabulador por nivel. Si una sección tiene sub-bloques, se indenta lo que corresponda, pero **ninguna línea del brief puede quedar en columna cero** salvo dos: la línea de preámbulo que abre la página y la del propio encabezado desplegable (ver más abajo por qué el preámbulo es obligatorio).

⚠️ **Escribes la tabla en markdown de tuberías, pero Notion la guarda como HTML — y el envoltorio NO hereda el tabulador.** Esto es lo que hace la trampa invisible: tú escribes `| Campo | Quién |` correctamente indentado, la escritura devuelve éxito, y al releer la página aparece como `<table>` **en columna cero**. Desde ahí, todo lo que sigue quedó fuera del desplegable. **Después de insertar cualquier tabla dentro de un desplegable, relee y corrige el tabulador del envoltorio.** No es opcional y no hay aviso.

⚠️ **El tabulador lo llevan las etiquetas envolventes, no las filas.** `<table>` y `</table>` se indentan con TAB —son hijos del desplegable—; `<tr>` y `<td>` van en **columna cero**. Y cuidado con el alcance del error: quitarle el TAB al envoltorio de una tabla **no rompe solo esa tabla, dedenta todo lo que viene después de ella**. Media sección más abajo el brief sale del desplegable, y la escritura te devolvió éxito.

🔴 **Nunca edites el TEXTO de un encabezado desplegable con search-replace.** Es la trampa que más trabajo bueno destruye. Notion reescribe el bloque como **encabezado plano**, pierde el atributo `{toggle="true"}` y **deja huérfanos a todos los hijos**: el brief entero queda desplegado en el calendario del cliente. Y la escritura, otra vez, devuelve éxito.

- **Para renombrar, se cambia la propiedad `Nombre` de la página**, no el encabezado. Y eso es el paso 6: requiere autorización.
- **Si ya se rompió, la reparación es una sola escritura atómica** — un `replace_content` que reconstruya el encabezado desplegable y toda la indentación de una vez. **Nunca parches sucesivos** sobre los bloques sueltos: cada parche parcial deja la página en un estado intermedio distinto y termina siendo más difícil ver qué falta que reescribirla completa.

⚠️ **El desplegable no puede ser el primer bloque de la página.** Notion se lo come como título y el brief queda sin contenedor. Necesita una línea de preámbulo antes; con una sola línea basta.

⚠️ **No prefijes con TAB una línea que empiece con sintaxis de lista numerada** (`1.`, `2.`) dentro de un bloque nuevo. Notion la reparsea, **descarta el tabulador y se lleva consigo la cola** de lo que venía detrás. Si necesitas esa numeración adentro del desplegable, conviértela en negrita: `**1.**` seguido del texto.

#### c) Escribe con `notion-update-page`

El contenido completo del brief, en una sola escritura, sobre la página del slot.

#### d) Regla dura: **no cambies el título ni las propiedades**

Solo se agrega contenido al cuerpo. El título de relleno se queda como está y las propiedades no se tocan en este paso — aunque el título diga "Artículo nuevo" y a ti te duela. Cambiarlos es el paso 6, requiere autorización, y ocurre **después**.

#### e) Verificación obligatoria, en el momento — y mecánica, no de confianza

`notion-fetch` sobre la página que acabas de escribir.

⚠️ **Primero, des-escapa los saltos de línea de la respuesta.** El fetch devuelve el contenido con los saltos como `\n` **literales, escapados**. Un regex que busque `^` o saltos reales va a reportar **cero secciones** y te va a hacer concluir que la página quedó vacía cuando está perfecta. Es un falso negativo que cuesta una reescritura completa e innecesaria.

Con el texto ya des-escapado, tres conteos. Los tres son mecánicos: esto no se revisa a ojo.

| Qué cuentas | Valor esperado |
|---|---|
| Secciones del brief **dentro** del desplegable | Todas las de la plantilla, ninguna menos |
| Líneas de texto **sin** tabulador | Solo dos —la de preámbulo y la del encabezado desplegable—, más lo que ya existía en la página antes de que escribieras |
| Filas de cada tabla | El mismo número que escribiste, tabla por tabla |

Si el conteo de líneas sin tabulador es mayor al esperado, la indentación se perdió en algún punto —casi siempre en el envoltorio de una tabla o en una lista numerada— y hay que **reescribir la página completa**, no parchar la sección que se ve mal.

No delegues esta verificación al final del lote. Se hace pieza por pieza, apenas escrita.

#### f) Limitación conocida: las tablas

Las tablas en texto se convierten a **tablas nativas de Notion**. El formato **dentro de las celdas** (negritas, código, enlaces) puede quedar como texto crudo, mostrando los caracteres de marcado en vez de aplicarlos. No es un error de tu escritura ni algo que se arregle reintentando. Si el contenido de una celda depende del formato para entenderse, cámbialo por texto plano que se lea bien sin él.

### 6. Llenar las propiedades

**Solo si el operador lo autorizó explícitamente** (paso "Antes de empezar"). Si no, sáltate esta sección: el entregable son los briefs en el cuerpo, y las propiedades las llena el cliente.

Si está autorizado, dos reglas:

⚠️ **Regla de concurrencia: se hace DESPUÉS de que terminen todas las escrituras de contenido. Nunca en paralelo.** Un agente escribiendo el cuerpo de una página mientras otro toca esa misma página es la forma más fácil de perder trabajo: la segunda escritura puede llegar con una versión de la página que ya no existe y borrar lo primero. La secuencia correcta es: **todos los briefs escritos y verificados → recién ahí, las propiedades.**

**Respeta las convenciones que el cliente ya usa.** Antes de escribir un valor, mira cómo están llenas las filas existentes del cliente: qué formato usa en los títulos, qué valor de estado corresponde a "brief listo", cómo escribe las fechas. Se sigue su convención, no la tuya, aunque la suya sea peor.

### 7. La pasada de verificación adversarial

La revisa **un agente o una persona distinta de quien escribió**, en **solo lectura**, contra una lista cerrada. El encargo es **refutar, no confirmar**: quien verifica no busca aprobar el trabajo, busca romperlo.

Que esto no suene a formalidad: en el caso fuente esta pasada encontró defectos reales en **todas** las piezas de la serie — incluidos varios que había introducido el encargo del propio orquestador, no los agentes que escribieron.

La lista cerrada:

| # | Qué se revisa | Qué es un hallazgo |
|---|---|---|
| 1 | **Estructura** | Alguna sección quedó fuera del desplegable, o hay líneas en columna cero |
| 2 | **Consistencia entre piezas de la serie** | El mismo tema aparece con dos líneas base distintas en dos briefs; o la ventana de fechas, el filtro de marca o la unidad de agregación cambian entre piezas |
| 3 | **Contradicciones internas** | Dentro de una misma pieza, dos afirmaciones que no pueden ser ambas verdaderas |
| 4 | **Claims de producto** | Una afirmación sobre el producto que la ficha del fabricante **no** declara, o que dice algo parecido pero distinto |
| 5 | **Afirmaciones sobre los resultados de búsqueda** | El texto declara más posiciones de las que enumera (dice "top 10" y lista nueve dominios, porque uno ocupa dos posiciones) |
| 6 | **Techos presentados como pronósticos** | Un "si todas subieran a la posición 3" rotulado como resultado esperado en vez de como techo aritmético |
| 7 | **Agregaciones infladas** | Pares singular/plural que son la misma demanda sumados como si fueran dos; valores idénticos repetidos que delatan agrupación por rangos de la fuente |
| 8 | **Metadata de producción filtrada** | Números de slot, referencias al encargo o voz en primera persona del agente dentro del brief |

Los puntos 2 a 7 son el checklist de cierre del [modelo operativo](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md) §10, donde está el fundamento de cada uno. Los puntos 1 y 8 son propios de esta entrega.

Se corre sobre el **set completo**, no pieza por pieza: la mitad de los hallazgos solo aparecen al comparar dos briefs entre sí.

## Qué significan los estados

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| Fila con fecha, título de relleno y cuerpo vacío | **Slot disponible.** Es donde va un brief | Escribir, previa confirmación del vacío |
| Fila con título de relleno pero **con** contenido en el cuerpo | **No es un slot.** Hay trabajo de alguien adentro | Preguntar al operador. No escribir encima |
| Fila con tema ya definido y estado avanzado | Pieza en curso del cliente | No tocar |
| El desplegable aparece vacío y el brief se ve suelto debajo | **La indentación se perdió.** La escritura reportó éxito igual | Reescribir la página con los hijos indentados con tabulador |
| El brief empieza dentro del desplegable y a media página se sale | Le faltó el tabulador al envoltorio `<table>`/`</table>` de una tabla, y eso dedentó todo lo que venía después | Reescribir la página completa con el envoltorio indentado y `<tr>`/`<td>` en columna cero |
| El desplegable desapareció y el brief quedó desplegado entero, con su título como texto plano | **Se editó el texto del encabezado desplegable.** Notion lo convirtió en encabezado plano, perdió `{toggle="true"}` y orfanó a los hijos | Reparar con **una sola escritura atómica** que reconstruya encabezado e indentación. Para renombrar, la propiedad `Nombre` de la página — nunca el encabezado |
| El primer bloque del brief se ve como título de la página en vez de como desplegable | El desplegable quedó como **primer bloque** y Notion lo absorbió | Reescribir con una línea de preámbulo antes del desplegable |
| El conteo de líneas sin tabulador da más de dos | **Hay contenido fuera del desplegable**, aunque a simple vista se vea bien | Reescribir la página completa. No parchar la sección visible |
| La carpeta de entregables de un slot del cliente está vacía | **Hallazgo, no incumplimiento.** Puede ser sincronización de almacenamiento pendiente | Reverificar con el equipo dueño antes de reportarlo al operador o al cliente |
| Una celda de tabla muestra caracteres de marcado en vez de formato | Limitación conocida de la conversión a tabla nativa | Reescribir esa celda en texto plano. No es un error a reintentar |
| Propiedad de relación vacía en todas las filas del cliente | El cliente no usa esa relación (puede incluso apuntar a una base que no es suya) | Dejarla vacía. Llenarla no está autorizado |
| Un dato que necesitas y no está en el dossier | **Estado válido**, no un hueco a rellenar | Escribir "no verificado" en el brief, o verificarlo y agregarlo al dossier antes de citarlo |

## Qué no hacer

- **No renombres ni toques propiedades del sistema del cliente sin autorización explícita.** Incluye títulos de relleno que te parezcan feos, estados que "obviamente" deberían avanzar y relaciones vacías que te gustaría ordenar.
- **No pongas dos agentes a escribir la misma página.** Un brief, una mano. El paralelismo es por pieza.
- **No toques las propiedades mientras alguien está escribiendo contenido.** Primero todas las escrituras de cuerpo, después las propiedades.
- **No dejes que nadie invente una cifra.** Si el dato no está en el dossier, en el brief se declara **no verificado**. Un número plausible es peor que un hueco declarado: nadie lo va a auditar.
- **No escribas un claim de producto que la ficha del fabricante no declare.** Y cuidado con los parecidos: dos propiedades técnicas con nombres similares no son la misma propiedad, y la diferencia llega al cliente.
- **No aceptes la causa que reporta el mensaje de error de una herramienta sin verificarla.** Los mensajes mienten sobre su propia causa. La regla práctica: si ese mismo reporte funcionó antes en la misma sesión, no es un problema de plan ni de permisos — es cuota.
- **No edites el texto de un encabezado desplegable con search-replace.** Notion lo convierte en encabezado plano y deja huérfano el brief completo. Para renombrar se cambia la propiedad `Nombre` de la página, y eso requiere autorización.
- **No arregles un desplegable roto con parches.** Una sola escritura atómica que reconstruya encabezado e indentación. Los parches sucesivos dejan estados intermedios y esconden lo que falta.
- **No escribas en el sistema del cliente un brief que no cabe.** Mide los caracteres antes: pasado el techo de 12.000, lo que sobra es research y su lugar es el anexo enlazado.
- **No dejes metadata de producción dentro del brief entregable.** Números de slot, referencias al encargo, "según lo que me pediste", voz en primera persona del agente. El brief lo lee un redactor del cliente, no tú.
- **No confíes en que "la escritura devolvió éxito" significa "quedó bien".** En este flujo casi todos los errores devuelven éxito: la indentación perdida, la fecha sin el formato expandido, la tabla con formato crudo. Solo la relectura **con conteo** lo prueba.
- **No inventes la convención de assets del cliente.** Se deriva de sus entregables reales, barriendo por carpeta y por extensión. Un plan de distribución escrito en tu vocabulario obliga a traducir a quien produce.
- **No concluyas una ausencia desde un `grep` por patrón de nombre.** Cambia el eje de búsqueda y di dónde no miraste. La convención pudo cambiar y tu regex está anclado a la vieja.
- **No reportes un hueco de inventario como incumplimiento del equipo.** Reverifícalo primero con quien lo produce: puede ser sincronización de almacenamiento.
- **No prometas cobertura de publicación en un canal que publica otro.** Lo que puedes comprometer es el insumo entregado; la fecha que propones es sugerida, no comprometida.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El brief se ve completo pero el desplegable está vacío | Los hijos no se indentaron con tabulador | Reescribir la página completa con la indentación correcta. Verificar de nuevo con una relectura |
| El fetch de verificación devuelve el brief, pero mi conteo dice cero secciones | La respuesta trae los saltos de línea como `\n` **escapados**, y el regex no encuentra ninguno | Des-escapar los saltos antes de contar. Es un falso negativo: no reescribas la página por esto |
| El brief entra bien al desplegable y a partir de cierta tabla todo queda afuera | Al envoltorio `<table>`/`</table>` le faltó el tabulador, y eso dedentó el resto del documento | Reescribir la página completa: envoltorio con TAB, `<tr>`/`<td>` en columna cero |
| El brief se ve completo pero el desplegable ya no existe y todo quedó plano | Se editó el **texto** del encabezado desplegable con search-replace | Una sola `replace_content` que reconstruya el desplegable y la indentación completa. No parchar bloque por bloque |
| El brief quedó enorme dentro del calendario del cliente | Se escribió el **dossier** en vez del brief: pasó el techo de 12.000 caracteres | Medir el largo antes de escribir, mover el detalle al anexo enlazado y reescribir la página completa |
| Una lista numerada perdió la indentación y arrastró lo que venía detrás | Notion reparsea una línea que empieza con `1.` dentro de un bloque nuevo y descarta el tabulador | Convertir la numeración a negrita (`**1.**`) y reescribir la página |
| El plan de distribución usa nombres de slots que el cliente no reconoce | Se inventó una convención en vez de derivarla de sus entregables | Inventariar por carpeta y extensión, derivar la convención real y reescribir el plan con su vocabulario |
| El inventario de assets dice que faltan los entregables de un mes | Se buscó por patrón de nombre y ese mes usa otra convención — o hay sincronización pendiente | Barrer por carpeta y extensión; si igual faltan, reverificar con el equipo dueño antes de reportarlo |
| La fecha no aparece en la fila aunque la escritura fue exitosa | Se escribió el nombre pelado de la propiedad en vez del formato expandido `date:<Propiedad>:start` | Reescribir la propiedad con el formato expandido |
| Un agente reporta que "el plan no incluye acceso" a la herramienta de keywords | **Cuota agotada**, no límite de plan. El mensaje de error miente sobre su causa | Verificar si el mismo reporte funcionó antes en la sesión. Si sí, es cuota: reintentar **en serie**, nunca relanzando la flota en paralelo |
| Se agotó la cuota a mitad del lote | Varios agentes pidiendo reportes caros a la vez (los que devuelven listas se cobran por línea) | Reintentar en serie, y en el próximo lote sacar los reportes caros al dossier, hechos una sola vez |
| Dos briefs de la misma serie citan cifras distintas para el mismo tema | Alguien no usó el dossier, o el dossier cambió a mitad de camino | Corregir contra el dossier, no contra el brief que "se ve mejor". Si el dossier estaba mal, corregirlo primero y después las piezas |
| Las propiedades de una página "cambiaron solas" | Alguien más estaba escribiendo en esa página al mismo tiempo — normalmente quien coordina | Avisar a todos los que escriben que nadie más toque esa página, reconstruir lo perdido y respetar el orden: contenido primero, propiedades después |
| Una celda de tabla muestra los caracteres de marcado | Limitación conocida de la conversión a tabla nativa | Reescribir la celda en texto plano |
| Un lote de agentes "terminó completo" pero faltan briefs | Un agente cayó y su salida se descartó en silencio | **Contar las salidas**, no confiar en el estado agregado del lote. Reponer las piezas faltantes una por una |
| Las herramientas del sistema del cliente no aparecen en la sesión | Los conectores se cargan al **iniciar** la sesión | Reiniciar la sesión con el conector ya configurado |
| Un enlace del calendario del cliente lleva a una página inexistente | El sistema del cliente tiene URLs mal registradas (pasa) | Anotarlo como hallazgo para el operador. No corregir el registro del cliente sin autorización |

## Referencias técnicas

- Modelo operativo del research: [`docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md) — §2 insumos, jerarquía de confianza y marcado de evidencia · §3 los dos carriles · §4 intake del sistema editorial · §5 secuencia del research (gate de canibalización a nivel de contenido, 5.2 la pieza-hito anual y su claim perecedero —5.2.1 el hito como clúster que compone y su kit reutilizable—, 5.3 el pre-emptor de tesis, 5.4 el grafo de enlaces editoriales, 5.5 la estacionalidad vinculante) · §6 respaldo de producto (6.2 cuando se cae el porqué de una pieza) · §7 producción con subagentes · §9 atomización y distribución · §10 checklist de cierre · §12 antipatrones.
- Skill `seo-aeo`: [módulo 02 — contenido y topical authority](../../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md) · [módulo 07 — medición](../../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md).
- Estructura del brief (bloques, techo de extensión y frontera con el dossier): [`docs/operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md`](../../operations/SEO_CONTENT_BRIEF_STRUCTURE_V1.md).
- Checklist de citabilidad que va dentro de esos bloques: [`templates/content-brief-aeo.md`](../../../.codex/skills/seo-aeo/templates/content-brief-aeo.md) de la skill `seo-aeo`.
- Caso fuente (auditoría del cliente, estado observado en su fecha): [`docs/audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](../../audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md). Una auditoría documenta un estado en una fecha y no se asume vigente por existir — ver [`docs/audits/README.md`](../../audits/README.md).
- Conectar la fuente del dato medido: [Conectar Search Console a una marca](conectar-search-console.md) · [Operar la serie diaria de Search Console](operar-serie-search-console.md).
