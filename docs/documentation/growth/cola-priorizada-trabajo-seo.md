> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-08-28 por Claude (TASK-1700)
> **Ultima actualizacion:** 2026-08-28 por Claude (TASK-1700 — auditoria de drift contra el codigo final)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)

# Cola priorizada de trabajo SEO

## Qué problema resuelve

Antes de esta capacidad, el módulo SEO tenía **cuatro listas con cuatro criterios de orden que no se
podían comparar entre sí**:

| Lista | Cómo ordenaba |
|---|---|
| Mapa de oportunidades | un score calculado al vuelo, sin versión |
| Gap SEO ↔ IA | por cuadrante (dominante / riesgo / oportunidad / invisible) |
| Descubrimiento de keywords | un orden propio de ocho criterios encadenados |
| Gap competitivo | sin orden: hechos en orden alfabético neutral |

Cada una ordenaba bien **según su propia lógica**. El problema nunca fue que alguna ordenara mal: es
que el operador abría tres pantallas, veía cuatro "número 1" distintos y ninguna le decía cuál de
los cuatro iba primero. La pregunta que el módulo existe para contestar —*¿qué hago hoy?*— no tenía
dueño.

La cola priorizada es ese dueño. Es **una sola lista**, con un solo criterio de orden, que compone
las señales de los seis motores del módulo y las pone en la misma escala.

## Qué es el score y por qué está en clics

El score de una entrada de la cola no es un índice de 0 a 100. Es **una cantidad de clics**:

> "Estimamos 340 clics adicionales al mes si esta keyword llega a la posición 5."

Tres razones, y las tres son de oficio:

1. **Sale en la unidad que el cliente verifica.** Esa frase se comprueba en el propio Search Console
   del cliente en 60 días. Un índice de 0 a 100 no se comprueba con nada.
2. **Absorbe sola el efecto de las respuestas de IA.** La curva de "cuántos clics da cada posición"
   no se toma de una tabla de industria: se deriva del **propio sitio del cliente**, de su propia
   ventana de 28 días. Si en ese vertical la respuesta generativa deprime el clic, ya está adentro
   del número medido — no hay que estimarlo ni discutirlo.
3. **Es defendible.** Son los datos del cliente, de su propio dominio. Un volumen estimado por un
   tercero para un país entero no resiste la pregunta "¿de dónde salió ese número?".

### 🔴 Es un techo, no un pronóstico

El cálculo es `impresiones medidas × (CTR esperado en la posición objetivo − CTR actual)`. Eso supone
que la keyword **llegue** a la posición objetivo; no afirma que vaya a llegar. Se presenta siempre
como techo ("hasta N clics adicionales si llega a la posición 5"), nunca como proyección de
resultado.

Tampoco es una ventaja competitiva excluyente: varias suites del mercado conectan Search Console y
proyectan ganancia de clics. Lo distintivo es la **combinación** —curva del propio Search Console
aplicada a un cambio de posición— y que ese mismo número ordene seis orígenes distintos, incluido el
de visibilidad en motores de IA.

## Las tres bandas

No toda entrada se puede puntuar, y la cola **prefiere decirlo antes que inventar un número**. Por
eso cada entrada cae en una de tres bandas, y el orden es primero por banda y después por score
dentro de la banda.

| Banda | Cuándo | Qué trae |
|---|---|---|
| **1 — hay demanda medida y curva utilizable** | Search Console registra impresiones por ese término **y** la curva del sitio tiene muestra suficiente en la posición objetivo | clics adicionales estimados; se ordena por ese número |
| **2 — hay demanda medida, la curva no alcanza** | hay impresiones reales, pero el sitio todavía no acumuló suficientes clics en la posición objetivo para afirmar un CTR esperado | sin número; se ordena por impresiones (demanda medida) |
| **3 — nadie llega todavía por ese término** | cero impresiones en la ventana | sin número; el verbo honesto es **medir**; se ordena alfabéticamente |

### 🔴 Un vacío no es un cero

Esta es la confusión más costosa que puede tener alguien que lea la cola: en las bandas 2 y 3 el
score viene **vacío**, no en cero.

- **Vacío** significa "la cola se niega a fabricar un número que no puede sostener".
- **Cero** significaría "medimos, y no hay nada que ganar".

Son afirmaciones opuestas. Leer un vacío como un cero invierte el significado: entierra al fondo de
la lista trabajo que simplemente todavía no tiene medición, y le da estatus de conclusión a una
ausencia de evidencia.

El caso real que motivó el piso de muestra: un sitio con 75 impresiones y 0 clics en la posición
objetivo. Tomar ese 0 como "CTR esperado" da ganancia 0 para **toda** la lista, sin lanzar ningún
error — un orden arbitrario detrás de números perfectamente creíbles. Con 75 impresiones y un CTR
real cercano al 1%, observar cero clics es prácticamente una moneda al aire. Por eso la curva sólo
se considera utilizable con al menos 1.000 impresiones y 5 clics en el bucket objetivo.

## Por qué nunca se ordena por volumen estimado

Cuando hay demanda medida, **está prohibido ordenar por el volumen de búsqueda que estima el
proveedor**. Es el invariante `● medido / ◑ estimado` aplicado al orden, no sólo a lo que se muestra
en pantalla.

Dos motivos:

- En español-LATAM es justo donde el proveedor mide peor (`ISSUE-152`). Ordenar por ahí pone arriba
  lo que un tercero cree, por encima de lo que el sitio del cliente efectivamente recibe.
- Aunque el volumen fuera exacto, el más buscado puede ser el más ajeno al negocio: hoy nada declara
  todavía si un término tiene que ver con lo que el cliente vende.

Consecuencia práctica: una entrada sin demanda medida **no recibe un score fabricado desde el
volumen del proveedor**. Cae a banda 3, sin número, con el verbo `medir`. Y dentro de la banda 3 el
desempate es alfabético a propósito: el alfabeto no le insinúa prioridad a nadie.

## Los seis orígenes y sus cuatro verbos

Cada entrada declara **de dónde salió** y **qué acción propone**.

| Origen | Qué señala | Verbo típico |
|---|---|---|
| `gsc_striking_distance` | ya recibe búsquedas y está a un empujón de la primera página | optimizar |
| `consolidation` | varias páginas del sitio compiten por la misma búsqueda | consolidar |
| `declared_target` | un objetivo que un humano declaró, con autor y fecha | optimizar / crear |
| `aeo_gap` | la marca no es citada por los motores de IA para esa intención | optimizar / crear |
| `competitor_gap` | un competidor declarado cubre esa búsqueda y el cliente está ausente | crear / medir |
| `discovery_candidate` | un candidato que el descubrimiento encontró y nadie decidió | crear / medir |

Los cuatro verbos son **optimizar · crear · consolidar · medir**.

### Por qué la canibalización tiene verbo propio

La canibalización (varias páginas del mismo sitio compitiendo por la misma búsqueda) entra siempre
como `consolidar` y **jamás** se mezcla con `optimizar`.

No es un matiz de vocabulario: son dos trabajos distintos. "Optimizar" es empujar una keyword;
"consolidar" es fusionar dos URLs. Presentarlas en la misma fila de una lista hace que el operador
tome la acción equivocada — le pide más contenido a un problema causado por tener contenido de más.
Antes de esta capacidad la señal existía (el mapa marcaba la página duplicada) y moría ahí, sin
producir trabajo.

### Cuando dos motores señalan la misma keyword

Pasa, y es legítimo: una búsqueda puede estar canibalizada **y** tener brecha de citabilidad en IA.
Pero una cola de trabajo que dice dos cosas distintas sobre el mismo término falla justo la pregunta
que existe para contestar.

La regla es **un sujeto, una fila, una decisión**, y el verbo que gana se elige por **dependencia
entre acciones**, no por importancia: primero consolidar (empujar algo canibalizado es la acción
equivocada), después lo medido y cercano, después el compromiso declarado, después citabilidad,
después las lentes estimadas. Los orígenes que quedan suprimidos **no se pierden**: viajan dentro de
la entrada como "también lo señalan", con su verbo. Suprimir sin dejar rastro convertiría la
deduplicación en una pérdida silenciosa de información.

Y la banda manda por encima de todo eso: deduplicar nunca puede enterrar un término en una banda
peor de la que le corresponde por evidencia.

## Por qué es una foto y no un cálculo al vuelo

La cola no se recalcula cada vez que alguien la abre. Se **materializa** una vez al día y queda
guardada como una foto inmutable, con su fecha, su versión de score y el desglose de cómo se calculó
cada número.

La razón es de auditabilidad: si la lista se recalculara en cada llamada, *"la recomendación número
1 de la mañana"* sería indemostrable a las 3 de la tarde. Ni el operador podría explicar qué vio
cuando decidió, ni el cliente podría preguntar por qué algo dejó de ser prioridad.

Recomputar es escribir una foto **nueva**, nunca modificar la anterior. Nada se edita ni se borra: el
histórico completo de qué se recomendó y cuándo queda disponible.

De ahí salen dos propiedades más:

- **Cada entrada guarda su desglose.** Impresiones, clics, CTR actual, posición ponderada, posición
  objetivo, CTR esperado, tamaño de la muestra de la curva, ventana, cuántas páginas del sitio
  compiten por la intención (en las entradas de consolidación) y qué otros motores señalaron el mismo
  término. Eso permite contestar "¿por qué esto ya no es prioridad?" seis meses después sin recomputar
  nada. Los números se guardan **como dato**, no dentro de la frase explicativa: quien los necesite no
  tiene que parsear una prosa que mañana alguien mejora.
- **Cada foto guarda con qué versión de score se calculó.** Cambiar un peso, un umbral o la posición
  objetivo obliga a publicar una versión nueva. Antes, esos parámetros vivían como constantes sueltas
  y cambiar cualquiera reescribía el ranking histórico en silencio.

## Cuando un origen se cae

Si uno de los seis motores no responde, la cola **no rellena con ceros ni disimula**. Escribe la foto
con lo que sí tiene, y declara aparte el estado de cada origen: `ok`, `degradado` o `caído`, con la
razón.

Dos consecuencias que importan:

- **Un origen caído no baja el score de los demás.** Sus filas simplemente no existen en esa foto;
  las otras quedan intactas.
- **Al plan le falta trabajo, no es que no lo haya.** Quien lee la lista tiene que poder saber que la
  foto es parcial, para no concluir "no hay nada que hacer en competencia" cuando lo que pasó es que
  ese motor no corrió.

Si **todos** los orígenes caen no se escribe ninguna foto: eso es un error, no un plan vacío.

## Decidir sobre una entrada

Una persona puede marcar cada entrada como **aceptada · postergada · descartada · hecha**.

🔴 **Decidir no ejecuta nada.** La cola propone, el humano confirma, y el comando del dominio dueño
ejecuta después por su propio camino. Marcar "aceptada" no dispara seguimiento de rankings, no compra
datos al proveedor y no crea contenido. La razón no es purismo: encadenar la ejecución haría que
"acepté esta recomendación" y "comprometí gasto recurrente" fueran el mismo clic, sin que nadie
declarara el segundo.

Las decisiones se guardan ancladas al **término**, no a la fila: como las filas se regeneran en cada
foto, una decisión atada a la fila moriría al día siguiente y el operador volvería a ver lo que ya
descartó. `descartada` y `hecha` retiran el término de las fotos siguientes; `aceptada` y
`postergada` no — "después" sin fecha no es "nunca", y algo aceptado sigue siendo trabajo vivo hasta
que alguien lo marque hecho.

Cambiar de opinión también se registra: una decisión nueva sobre el mismo término es un registro
nuevo, y vale la más reciente.

## Qué ve el cliente y qué ve el operador

⚠️ **Todavía no hay pantalla de cliente para la cola.** El redactor que recorta el lado cliente ya
está construido y probado, pero ninguna superficie lo usa aún: hoy la cola sólo la ven el operador y
los carriles programáticos internos. Esta sección describe **qué recortará** ese redactor cuando la
superficie cliente aterrice — es el contrato, no algo que un cliente ya esté viendo.

Cuando exista, los dos leerán exactamente la misma lista, con el mismo orden. La única diferencia
será ese redactor.

| Dato | Operador | Cliente |
|---|---|---|
| Keyword, verbo, banda, orden | sí | sí |
| Clics adicionales estimados (marcados `◑ estimado`) | sí | sí |
| Impresiones de Search Console (marcadas `● medido`) | sí | sí |
| Fecha de la foto y si está vencida | sí | sí |
| Aviso de que la foto es parcial | sí, con el detalle por origen | sí, sólo cuántas fuentes están parciales |
| Dificultad de la keyword | sí | **no** |
| Volumen estimado del proveedor | sí | **no** |
| Costo de proveedor | sí | **no** |
| Origen (etiqueta del motor que la señaló) | sí | sí |
| Procedencia interna cruda (de qué registro exacto salió: ids y topología) | sí | **no** |
| Desglose completo del método (umbrales, percentiles, tamaños de muestra) | sí | **no** |

Los tres primeros recortes son la lente ◑ de un tercero y lo que a Efeonce le cuesta servir; los dos
últimos exponen la topología interna y el método, no el resultado. La razón que ve el cliente está
escrita en su idioma ("ya recibes búsquedas por este término y estás cerca de la primera página"),
no en el del motor.

> Detalle técnico: el redactor se construye por **construcción explícita**, nunca por omisión de
> campos. Con un redactor por sustracción, cualquier campo nuevo llegaría al cliente por defecto y la
> fuga sería silenciosa. Ver `src/lib/growth/seo/work-queue/client-dto.ts`.

## Dónde se ve hoy

Hoy la cola **manda el orden de la lente de oportunidades vigente** en `Growth > SEO > Keywords`. La
pantalla no cambió de forma: mismas columnas, mismo copy, misma interacción. Lo único que cambió es
quién manda el orden — pasó de un score calculado al vuelo a una foto inmutable con versión.

🔴 **Con una condición, y es la misma regla de arriba:** la cola manda esa lente **sólo si puede
hacerlo sin fabricar un número**. La lista antigua muestra "clics adicionales estimados" como un
número siempre presente, donde un **0 significa "ya convierte mejor que el promedio"** — una
afirmación positiva, no un vacío. Si alguna entrada que llegaría a esa lista no tiene número (curva
del sitio no utilizable), la cola **no sirve la lista**: la pantalla vuelve al orden anterior, que
sabe decir honestamente que está ordenando por demanda medida. En la práctica es una condición **por
cliente**, no por fila: la curva se evalúa a nivel del sitio, así que o todas las entradas tienen
número o ninguna. La foto de la cola se guarda completa igual en los dos casos.

La superficie propia de la cola —bandas visibles, verbos en pantalla, filtros por origen, estado de
frescura y salud de orígenes a la vista— es una entrega de interfaz posterior. Todavía no existe.

Además de la pantalla, la misma lista se sirve por la ruta de administración, por el carril
`ecosystem` de la plataforma y por una consulta interna de MCP, sin lógica de orden duplicada en
ninguno de los tres.

> Detalle técnico: contrato en `src/lib/growth/seo/work-queue/{reader,materialize,record-decision}.ts`;
> orden canónico y precedencia entre orígenes en `materialize.ts`; score y curva de CTR en
> `priority-score.ts`; versiones del score en `score-versions.ts`. Spec de la task:
> [TASK-1700](../../tasks/in-progress/TASK-1700-growth-seo-prioritized-work-queue-aggregate.md).
> Operación paso a paso: [Operar la cola priorizada de trabajo SEO](../../manual-de-uso/growth/operar-cola-priorizada-seo.md).
