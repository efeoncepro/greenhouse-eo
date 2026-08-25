# Producir una serie de briefs editoriales SEO/AEO en el Content Hub de un cliente

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 1.0
> **Creado:** 2026-08-25 por Claude
> **Última actualización:** 2026-08-25 por Claude
> **Módulo:** Growth / SEO — producción editorial para clientes
> **Ruta en portal:** ninguna. La operación ocurre en el sistema editorial del **cliente** (Notion u otro), no en Greenhouse. Greenhouse aporta el dato medido (Search Console).
> **Documentación relacionada:** [modelo operativo de priorización editorial](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md) · skill `seo-aeo` ([módulo 02 — contenido](../../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md), [módulo 07 — medición](../../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md)) · [plantilla del brief](../../../.codex/skills/seo-aeo/templates/content-brief-aeo.md) · [caso fuente](../../audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md)

## Para qué sirve

Un cliente tiene su calendario editorial en su propio sistema (Notion, en el caso fuente) y hay que dejar ahí una serie de briefs listos para que alguien los redacte. Este manual es la secuencia mecánica de esa entrega: leer el sistema del cliente sin romperlo, encontrar los espacios vacíos del calendario, preparar el insumo compartido, escribir cada brief dentro de la página que le corresponde y verificar que quedó bien.

Sirve igual si escribes tú solo o si repartes el trabajo entre varios agentes. De hecho el runbook está diseñado para lo segundo: casi todos los pasos existen para que varias manos escribiendo en paralelo produzcan piezas **consistentes entre sí** y no cinco versiones distintas de los mismos números.

**Lo que este manual NO cubre, y dónde vive:**

| Pregunta | Dónde se responde |
|---|---|
| Por qué se prioriza un tema y no otro; los dos carriles; las trampas de medición de Search Console | Skill `seo-aeo`, [módulo 02](../../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md) y [módulo 07](../../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md) |
| El proceso de research de punta a punta (insumos, jerarquía de confianza, secuencia, antipatrones) | [`SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md) |
| Qué secciones lleva un brief y en qué orden | [`templates/content-brief-aeo.md`](../../../.codex/skills/seo-aeo/templates/content-brief-aeo.md) de la skill `seo-aeo` |
| El caso fuente con sus cifras y hallazgos | [`docs/audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](../../audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md) |

## Antes de empezar

### Accesos e insumos

| Necesitas | Para qué | Cómo confirmas que lo tienes |
|---|---|---|
| Acceso al **Content Hub del cliente** (Notion u otro), por MCP o por invitación al espacio | Leer el esquema, inventariar filas y escribir en las páginas | Una lectura de la base devuelve el esquema y las filas, no un error de permisos |
| **Search Console del cliente conectado en Greenhouse** | La línea base **medida** de cada tema (impresiones, clics, posición) | La marca aparece con conexión activa; ver [Conectar Search Console a una marca](conectar-search-console.md) |
| Una **herramienta de keywords** (volumen y dificultad de terceros) | La demanda que el cliente **todavía no tiene**, que por construcción no puede salir de Search Console | Un reporte de prueba devuelve datos |
| El **inventario del sitio del cliente** (URLs de contenido, fichas de producto, hubs) | Saber qué ya existe, qué canibaliza y a qué se enlaza | Una lista de URLs verificada contra el sitio, no contra un documento |

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

> El detalle de qué insumo pesa más que cuál, y la secuencia del research que produce este archivo, están en el [modelo operativo](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md), §2 y §4.

### 4. Escribir el brief en la página del slot

Un brief, una página, **una sola manos escribiendo**. Si repartes el trabajo, el paralelismo es **por pieza**, nunca por sección de una misma pieza.

#### a) Confirma que la página está en blanco

`notion-fetch` sobre la página, otra vez, justo antes de escribir. Es barato y es la única forma de no pisar algo que apareció entremedio.

#### b) Todo el contenido va dentro de un encabezado desplegable de nivel 1

El brief es largo. Si lo escribes suelto, el calendario del cliente queda ilegible. La convención es meter todo el brief dentro de **un** desplegable, que se abre solo cuando alguien lo va a leer.

La sintaxis de Notion para eso es un encabezado con el atributo `toggle`:

```
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

Un tabulador por nivel. Si una sección tiene sub-bloques, se indenta lo que corresponda, pero **ninguna línea del brief puede quedar en columna cero** salvo la línea del propio encabezado desplegable.

#### c) Escribe con `notion-update-page`

El contenido completo del brief, en una sola escritura, sobre la página del slot.

#### d) Regla dura: **no cambies el título ni las propiedades**

Solo se agrega contenido al cuerpo. El título de relleno se queda como está y las propiedades no se tocan en este paso — aunque el título diga "Artículo nuevo" y a ti te duela. Cambiarlos es el paso 5, requiere autorización, y ocurre **después**.

#### e) Verificación obligatoria, en el momento

`notion-fetch` sobre la página que acabas de escribir y revisa dos cosas:

1. **El desplegable está bien formado**: existe un solo encabezado desplegable de nivel 1 y el contenido está adentro.
2. **Ninguna línea quedó en columna cero**: si ves secciones del brief como bloques de primer nivel de la página, la indentación se perdió y hay que reescribir.

No delegues esta verificación al final del lote. Se hace pieza por pieza, apenas escrita.

#### f) Limitación conocida: las tablas

Las tablas en texto se convierten a **tablas nativas de Notion**. El formato **dentro de las celdas** (negritas, código, enlaces) puede quedar como texto crudo, mostrando los caracteres de marcado en vez de aplicarlos. No es un error de tu escritura ni algo que se arregle reintentando. Si el contenido de una celda depende del formato para entenderse, cámbialo por texto plano que se lea bien sin él.

### 5. Llenar las propiedades

**Solo si el operador lo autorizó explícitamente** (paso "Antes de empezar"). Si no, sáltate esta sección: el entregable son los briefs en el cuerpo, y las propiedades las llena el cliente.

Si está autorizado, dos reglas:

⚠️ **Regla de concurrencia: se hace DESPUÉS de que terminen todas las escrituras de contenido. Nunca en paralelo.** Un agente escribiendo el cuerpo de una página mientras otro toca esa misma página es la forma más fácil de perder trabajo: la segunda escritura puede llegar con una versión de la página que ya no existe y borrar lo primero. La secuencia correcta es: **todos los briefs escritos y verificados → recién ahí, las propiedades.**

**Respeta las convenciones que el cliente ya usa.** Antes de escribir un valor, mira cómo están llenas las filas existentes del cliente: qué formato usa en los títulos, qué valor de estado corresponde a "brief listo", cómo escribe las fechas. Se sigue su convención, no la tuya, aunque la suya sea peor.

### 6. La pasada de verificación adversarial

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

Los puntos 2 a 7 son el checklist de cierre del [modelo operativo](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md) §7, donde está el fundamento de cada uno. Los puntos 1 y 8 son propios de esta entrega.

Se corre sobre el **set completo**, no pieza por pieza: la mitad de los hallazgos solo aparecen al comparar dos briefs entre sí.

## Qué significan los estados

| Lo que ves | Qué significa | Qué hacer |
|---|---|---|
| Fila con fecha, título de relleno y cuerpo vacío | **Slot disponible.** Es donde va un brief | Escribir, previa confirmación del vacío |
| Fila con título de relleno pero **con** contenido en el cuerpo | **No es un slot.** Hay trabajo de alguien adentro | Preguntar al operador. No escribir encima |
| Fila con tema ya definido y estado avanzado | Pieza en curso del cliente | No tocar |
| El desplegable aparece vacío y el brief se ve suelto debajo | **La indentación se perdió.** La escritura reportó éxito igual | Reescribir la página con los hijos indentados con tabulador |
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
- **No dejes metadata de producción dentro del brief entregable.** Números de slot, referencias al encargo, "según lo que me pediste", voz en primera persona del agente. El brief lo lee un redactor del cliente, no tú.
- **No confíes en que "la escritura devolvió éxito" significa "quedó bien".** En este flujo casi todos los errores devuelven éxito: la indentación perdida, la fecha sin el formato expandido, la tabla con formato crudo. Solo la relectura lo prueba.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El brief se ve completo pero el desplegable está vacío | Los hijos no se indentaron con tabulador | Reescribir la página completa con la indentación correcta. Verificar de nuevo con una relectura |
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

- Modelo operativo del research: [`docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md`](../../operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md) — §2 insumos y jerarquía de confianza, §3 los dos carriles, §4 secuencia, §6 producción con subagentes, §7 checklist de cierre, §9 antipatrones.
- Skill `seo-aeo`: [módulo 02 — contenido y topical authority](../../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md) · [módulo 07 — medición](../../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md).
- Plantilla del brief: [`templates/content-brief-aeo.md`](../../../.codex/skills/seo-aeo/templates/content-brief-aeo.md) de la skill `seo-aeo`.
- Caso fuente (auditoría del cliente, estado observado en su fecha): [`docs/audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](../../audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md). Una auditoría documenta un estado en una fecha y no se asume vigente por existir — ver [`docs/audits/README.md`](../../audits/README.md).
- Conectar la fuente del dato medido: [Conectar Search Console a una marca](conectar-search-console.md) · [Operar la serie diaria de Search Console](operar-serie-search-console.md).
