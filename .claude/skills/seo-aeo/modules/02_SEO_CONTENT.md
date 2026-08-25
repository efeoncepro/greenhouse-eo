# 02 · Contenido y Topical Authority

> Carga este módulo para: search intent, topical authority, pillar/cluster,
> contenido programático, content decay, canibalización, **los dos carriles de
> priorización** (empujar lo que existe vs. cubrir lo que falta), inflación de
> totales de clúster, lectura de SERP por eje y operación editorial.
> Sello: as-of 2026-06; método de striking distance **medido** as-of 2026-08-05;
> doctrina de los dos carriles y trampas de agregación **medidas** as-of 2026-08.

## Principio raíz: intención > keyword

Google y los motores IA resuelven **intención**, no cadenas de texto. Antes de
escribir, clasifica la intención de la query objetivo:

| Intención | Qué busca el usuario | Formato que gana |
|---|---|---|
| **Informacional** | aprender/entender | guía, explicación, definición, how-to |
| **Comercial** (investigation) | comparar antes de comprar | comparativas, "mejores X", reviews, alternativas |
| **Transaccional** | hacer/comprar ya | página de producto/servicio, pricing, demo |
| **Navegacional** | llegar a una marca/página | home, landing de marca |

**Regla:** mira la SERP actual de la query — Google ya te dice qué intención
premia (¿muestra blogs? ¿productos? ¿videos? ¿local pack?). No pelees contra el
formato que la SERP recompensa.

## Topical authority (la palanca estructural de fondo)

Rankear consistentemente en un tema no se gana con una página, sino **cubriendo
el tema completo** con profundidad y enlazado coherente. Modelo **pillar +
cluster**:

```
        ┌────────────────────────┐
        │   PILLAR (guía madre)  │  ← término amplio, enlaza a todo el cluster
        │   /guia-tema/          │
        └───────────┬────────────┘
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   /tema/sub-a  /tema/sub-b  /tema/sub-c   ← cada uno cubre una sub-intención
   (cluster)    (cluster)    (cluster)        y enlaza de vuelta al pillar
```

- **Information gain:** Google premia contenido que *agrega* algo nuevo al corpus
  (dato propio, ángulo, experiencia), no que reescribe lo que ya existe. En 2026
  esto es doblemente cierto para AEO: el contenido derivativo no se cita.
- **Cobertura de sub-intenciones = cobertura del Query Fan-Out** (ver
  `04_AEO_GEO.md`): el mismo trabajo de cluster que da topical authority es el
  que te hace recuperable cuando la IA descompone una query en sub-queries.

## Anatomía de una página que rankea Y se cita (2026)

1. **Answer capsule arriba** — respuesta directa en 40–60 palabras bajo un H2 con
   la pregunta.
   ⚠️ El **72.4%** (Search Engine Land) es un **base rate sin grupo de control**: describe el
   patrón de las páginas citadas, **no prueba el lift**. Lo que sostiene la cápsula es el
   **mecanismo** (el motor recupera pasajes). Y la palanca con **mejor evidencia primaria** es
   otra: la **relevancia semántica del TÍTULO** frente a la sub-pregunta (Ahrefs, 1,4M de
   prompts: 0,656 en citadas vs 0,484 en no citadas). Escribe el H2 como la pregunta del fan-out.
2. **Estructura escaneable** — H2/H3 como preguntas, párrafos cortos, listas,
   **tablas**. 🔴 NO digas «2,3× más citas»: ese número es una razón de PREVALENCIA entre
   corpus (30% de las citadas por ChatGPT contienen una tabla vs 13% de las que rankean en
   Google — Nectiv), **no un lift por agregar una tabla**, y **la lista no está en el
   hallazgo**. El argumento honesto es el mecanismo: una fila tabulada ES la respuesta.
3. **Densidad de hechos** — estadística/dato cada ~150–200 palabras, con fuente.
4. **Fuentes y citas** — enlaza a autoridades; las citas/quotes aumentan la
   citabilidad IA (ver tácticas GEO en `04`).
5. **Profundidad real** — cubre la pregunta y sus derivadas, no relleno. La
   longitud no es factor; la *completitud* sí.
6. **Autoría visible** — byline con credenciales (`03_EEAT_ENTITY.md`).
7. **Frescura** — fecha de actualización honesta; contenido <2 meses gana ~28%
   más citas IA.

## Contenido programático (programmatic SEO)

Escalar páginas desde plantilla + datos (p.ej. "X en {ciudad}", "{producto} vs
{competidor}"). Funciona cuando:
- Hay **demanda real** por cada variante (validar volumen, no generar al voleo).
- Cada página aporta **valor único** (datos propios por variante), no solo
  swap de tokens → si no, es thin content y Google lo entierra (o peor,
  penaliza por "scaled content abuse", política reforzada 2024).
- Hay control de calidad e indexación selectiva (no indexar las variantes vacías).

⚠️ En la era IA, el contenido programático **genérico generado por LLM a escala**
es exactamente lo que Google y los answer engines descartan. Programmatic sí, pero
con data propietaria y valor incremental. Ver `ANTIPATTERNS.md`.

## Content operations: mantener, no solo publicar

- **Content decay** — el tráfico de una página decae con el tiempo (competencia,
  desactualización). Audita trimestralmente las páginas que perdieron
  posiciones/clicks y **actualízalas** (refresh suele rendir más que publicar
  nuevo). La frescura es factor IA explícito.
- **Canibalización** — dos URLs compitiendo por la misma intención se diluyen.
  Diagnóstico: GSC → misma query rankeando con URLs que rotan. Fix: consolidar
  (301 + merge), diferenciar intención, o canonical. **Es una acción distinta de
  "empujar una keyword"** — ver *Striking distance* abajo.
- **Pruning** — contenido thin/obsoleto sin tráfico ni enlaces puede *bajar* la
  calidad percibida del dominio. Opciones: mejorar, consolidar, o `noindex`/
  eliminar (con 301 si tenía valor). Hazlo con datos, no por corazonada.
- **Cadencia de refresh** — define un ciclo (p.ej. revisar top-20 páginas dinero
  cada trimestre). El contenido es un activo que se mantiene.

## Los dos carriles de priorización (no se sustituyen)

> Doctrina **medida** as-of 2026-08 cruzando GSC real contra volumen de terceros
> del mismo sitio. Es el error de método más caro del oficio, y se comete
> **creyendo que se está siendo riguroso**.

Priorizar contenido son **dos preguntas distintas**, con **dos fuentes distintas**,
y ninguna contesta la de la otra:

| | **Carril A — empujar** | **Carril B — cubrir** |
|---|---|---|
| **Pregunta** | ¿Qué **página existente** empujo? | ¿Dónde hay **demanda que no tengo**? |
| **Fuente** | GSC propio (striking distance 8–20) | volumen/SERP de terceros + análisis competitivo |
| **Produce** | backlog de optimización sobre URLs vivas | backlog editorial de piezas nuevas |
| **Unidad de éxito** | clics incrementales sobre impresiones ya medidas | cobertura de una intención que hoy es cero |
| **NO puede contestar** | qué tema **crear** | qué página ya está al borde de la página 1 |

🔴 **Usar impresiones de GSC para descartar contenido NUEVO es razonamiento
circular.** El filtro de striking distance exige **por construcción** que ya
rankees (posición 8–20 ⇒ existe página y existe relevancia). Un tema sin contenido
**no puede aparecer** en ese filtro: su ausencia no es evidencia de falta de
demanda, es el filtro funcionando. Descartar un tema greenfield "porque tiene 363
impresiones" es leer la salida del propio filtro como si fuera el mercado.

⚠️ **Acotación de la regla "no priorices por volumen de un tercero teniendo GSC
propio"** (abajo, en *Errores frecuentes*): esa regla gobierna **la priorización de
páginas existentes** — ahí el GSC propio gana siempre, porque la demanda ya está
medida en tu SERP, con tu país y tu mezcla real de queries. **No** dice que el
volumen de terceros no sirva: para decidir **temas nuevos** es la única fuente que
existe, porque el GSC propio todavía no tiene nada que medir. Leerla como
prohibición general es exactamente el error cometido en el caso fuente (research de
cliente, 2026-08), donde un tema con **12.100** de volumen estimado casi se descarta
por tener **363** impresiones propias.

## Striking distance: priorizar con datos propios (sin volumen ni dificultad de terceros)

> **Método medido** (as-of 2026-08-05) contra la **API real** de Search Console
> sobre una propiedad `sc-domain:` conectada (levantada trabajando TASK-1302 de
> Greenhouse). Es método verificado sobre datos reales, no una receta de blog.

No necesitas Semrush ni Ahrefs para priorizar contenido: **con el GSC del propio
sitio alcanza**. Y el resultado es **más defendible** frente al cliente — son sus
datos medidos, no la estimación de un tercero para un mercado promedio.

### Los parámetros del filtro

| Parámetro | Valor | Por qué |
|---|---|---|
| **Rango de posición** | **8–20** | Ya rankeas: existe página y existe relevancia, falta empujar. **8–10 es el mejor ratio esfuerzo/retorno** — ya estás en página 1 |
| **Umbral de "alta impresión"** | **percentil de la propia distribución del sitio (P75 por defecto)** + un **piso mínimo absoluto** de impresiones | No es un número absoluto: un sitio de 100 impresiones/día y uno de 1M **no pueden compartir umbral**. El piso existe aparte, para que la posición media sea **estadísticamente interpretable** — con 3 impresiones, "posición 9,0" no significa nada |
| **Ventana** | **28 días** | Cubre **4 ciclos semanales completos**. Las queries B2B tienen estacionalidad de día hábil; 30 días corta la serie a mitad de semana |
| **Score** | **clics incrementales estimados** | Ver abajo |

### El score: clics incrementales, no un índice inventado

```
score = impresiones × max(0, CTR_esperado_en_posición_objetivo − CTR_actual)
```

- Las **impresiones de GSC ya son demanda medida** — y de **tu propia SERP**, con
  tu país, tu dispositivo y tu mezcla real de queries.
- El resultado sale en **clics**, no en puntos de un índice: es la unidad que el
  cliente entiende y que después se puede verificar contra el mismo GSC.

### La curva de CTR se deriva del propio sitio

**No uses una tabla de CTR por posición de la industria.** Calcula la curva con
los datos del sitio (CTR observado por posición sobre la misma ventana).

🎯 **Ventaja concreta:** una curva propia **absorbe automáticamente cuánto están
deprimiendo el CTR los AI Overviews EN ESE sitio y ESE vertical**, sin tener que
estimarlo ni discutirlo. Si hoy la posición 3 de ese sitio rinde la mitad que en
una tabla vieja, el score ya lo refleja.

### Canibalización: no se descarta, se separa

Una query que rankea con **más de una página** no es una oportunidad de
optimización: es una oportunidad de **CONSOLIDACIÓN** (unificar, 301, canonical o
diferenciar intención — ver *Content operations* arriba). **Es otra acción, no
una variante de la misma.** Sácala del backlog de "empujar" y ponla en el de
"consolidar", con su propio dueño y su propio criterio de éxito.

📏 **La señal mecánica del corte es el conteo de páginas por query.** Con
dimensiones `[query, page]`, cuenta cuántas URLs distintas del sitio aparecen para
la misma query: **1 página ⇒ carril "empujar"; 2 o más ⇒ carril "consolidar"**. No
hace falta juicio editorial para separar los dos backlogs. Medido en el caso fuente
(research de cliente, 2026-08): una query genérica de cabecera rankeaba con
**26 páginas del mismo sitio**, y otras cinco queries con 3–4 páginas cada una.
Ninguna de esas seis es una oportunidad de "subir posiciones": son seis decisiones
de arquitectura.

### La inflación de los totales de clúster de terceros

Cuando el **carril B** suma el volumen de un clúster para justificar una pieza, ese
total **se infla por dos vías medibles**:

1. **Pares singular/plural que son la misma demanda.** Aparecen como dos filas con
   volumen propio, pero son una sola búsqueda agrupada por la fuente. Medido en el
   caso fuente: una familia de **14 keywords sumaba 11.150** nominal; un solo par
   singular/plural de **4.400 cada uno** era la misma demanda → **~6.750**
   descontado: **~40% menos**.
2. **Valores idénticos repetidos ⇒ agrupación por bucket de la fuente.** Si dentro
   de un clúster varias keywords distintas declaran exactamente el mismo volumen,
   la fuente no está midiendo cada una: las está metiendo en un balde. Medido: en un
   clúster de 14 keywords, **6 repetían valor** (dos en 880, cuatro en 720).

⚠️ **Regla: no presentes la suma bruta como demanda limpia.** Declara el descuento
(o el rango) en el mismo lugar donde muestras el total. Es exactamente el punto
donde el cliente va a preguntar, y perder ahí la conversación cuesta el caso entero.

🎯 **Y el caso no se defiende con el agregado.** Se defiende con **cobertura de
intención** (cuántas sub-intenciones distintas resuelve la pieza) y **conteo de
posiciones** (cuántas queries rankean y dónde) — dos métricas que no se inflan
porque no se suman.

### Verifica el SERP del eje que vas a atacar, no el de su prima léxica

Una familia léxica puede contener **dos intenciones distintas**, y matarlas juntas
por el SERP de una sola es un descarte falso. Medido en el caso fuente sobre una
misma familia de color:

| Query | SERP real | Veredicto |
|---|---|---|
| el **código** de color (`<color> claro`) | herramientas de diseño gráfico, bancos de imágenes, enciclopedia | descartar — no es la intención del negocio |
| el **producto** de color (`pintura <color>`) | intención de hogar/producto; el sitio **ya rankeaba en 8,5** y su página de esa familia era la **6.ª del sitio en impresiones no-marca** | atacar |

**Regla:** antes de descartar una familia entera, corre el SERP de **la query exacta
que vas a atacar**, no el de la que se le parece.

No lo leas al revés: hay familias que **sí** son trampa completa. En el mismo caso,
dos queries de altísimo volumen (**90.500** y **14.800**) tenían SERP de diseño
gráfico y de educación, no de la categoría — su demanda pertenece al hub de catálogo
del sitio, no al blog. La regla no es "todo sirve": es **verifica el eje**.

### Replicar el formato que el propio sitio ya demostró

Antes de inventar un formato, busca si el sitio **ya tiene un activo que sostiene
muchas posiciones no-marca**. Si existe, ese formato es una **hipótesis validada por
el propio sitio, en su propio mercado y con su propia autoridad** — evidencia más
fuerte que cualquier best practice genérica. Escalarlo a las demás variantes del eje
(espacio, superficie, tarea, material) suele rendir más que diseñar algo nuevo.

Medido en el caso fuente: **un solo tutorial sostenía 14 keywords no-marca en top 3,
dos de ellas en #1** — y ese formato existía **para una sola variante** del eje, sin
replicarse nunca. El movimiento de mayor retorno no era un formato nuevo: era el
mismo formato, para las otras variantes.

⚠️ Replicar el formato **no** es replicar el texto (`ANTIPATTERNS.md`, *scaled
content abuse*). Se replica la **estructura de respuesta**: qué sub-intenciones
cubre, en qué orden, con qué densidad de hecho, y qué decisión le resuelve al lector.

### Evidencia de que el método produce señal

Sobre **26.192 filas** de una propiedad real: **375 keywords** en striking
distance. Las de mayor score salieron **todas en posición 8–10**, y **varias
marcadas como canibalizadas**. Es decir: el filtro no devolvió ruido — devolvió
el borde donde el trabajo rinde, y apartó el trabajo que es de otro tipo.

⚠️ **Al agregar varios días, la posición se pondera por impresiones**
(`SUM(position × impressions) / SUM(impressions)`, nunca `AVG(position)`) y la
cola de días recientes **todavía se está consolidando** → `07_MEASUREMENT.md`.

## Keyword research que sigue sirviendo en 2026

- Usa **Semrush MCP** (`keyword_research`, `organic_research`) para volumen,
  dificultad, intención y gaps vs. competidores. Database `cl` para Chile.
- **Keyword gap** vs competidores = mapa de oportunidades de cluster.
- Pero complementa con **prompt/answer-space research** (qué le preguntan a los
  LLMs, no solo qué teclean en Google) → `04_AEO_GEO.md`. Son disciplinas
  hermanas: keyword research para la SERP, prompt research para la respuesta IA.

## Errores frecuentes de contenido
- Escribir para el keyword y no para la intención real de la SERP.
- Publicar sin answer capsule (pierdes citabilidad gratis).
- "Más palabras = mejor": no. Completitud, no longitud.
- No actualizar nunca (decay garantizado).
- Generar a escala con IA sin valor incremental (riesgo de penalización + cero
  citas).
- Ignorar canibalización (auto-competencia silenciosa) — o peor, tratarla como
  una keyword más que "hay que empujar" cuando la acción es consolidar.
- Priorizar **páginas existentes** por volumen estimado de un tercero teniendo el
  GSC propio, donde la demanda ya está **medida** (striking distance, arriba).
- El error inverso, más caro: **descartar un tema nuevo por sus impresiones de
  GSC**. El filtro exige que ya rankees; un tema sin página no puede aparecer ahí
  (*Los dos carriles*, arriba).
- Presentar la suma bruta de un clúster de terceros como demanda limpia, sin
  descontar pares singular/plural ni buckets de la fuente.
- Descartar una familia entera por el SERP de una query prima, en vez del SERP de
  la query que efectivamente se va a atacar.
- Inventar un formato nuevo cuando el propio sitio ya tiene un activo que sostiene
  posiciones no-marca y nadie lo replicó a las demás variantes del eje.

> **Cross-refs:** estructura para ser citado → `04_AEO_GEO.md`. Autoría/E-E-A-T
> → `03_EEAT_ENTITY.md`. Medir decay/posiciones → `07_MEASUREMENT.md`. Trampas de
> lectura de GSC que rompen estos dos carriles (piso mínimo de impresiones, doble
> conteo por sitelinks, curva de CTR propia, largo de la serie) →
> `07_MEASUREMENT.md`. Calidad y borde de spam → `ANTIPATTERNS.md`.
