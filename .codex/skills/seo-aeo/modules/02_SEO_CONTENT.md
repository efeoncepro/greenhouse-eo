# 02 · Contenido y Topical Authority

> Carga este módulo para: search intent, topical authority, pillar/cluster,
> contenido programático, content decay, canibalización, priorización por
> striking distance y operación editorial.
> Sello: as-of 2026-06; método de striking distance **medido** as-of 2026-08-05.

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
- Priorizar por volumen estimado de un tercero teniendo el GSC propio, donde la
  demanda ya está **medida** (striking distance, arriba).

> **Cross-refs:** estructura para ser citado → `04_AEO_GEO.md`. Autoría/E-E-A-T
> → `03_EEAT_ENTITY.md`. Medir decay/posiciones → `07_MEASUREMENT.md`. Calidad
> y borde de spam → `ANTIPATTERNS.md`.
