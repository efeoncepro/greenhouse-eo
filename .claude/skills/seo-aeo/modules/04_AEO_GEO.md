# 04 · AEO / GEO — Ser recuperado y citado por motores de respuesta IA ⭐

> El módulo de mayor valor diferencial y el más volátil. Carga para: cómo
> recuperan los answer engines, **Query Fan-Out**, estructura editorial,
> **citabilidad**, **prompt/answer-space research**, `llms.txt`, y tácticas
> **por-plataforma** (AI Overviews/AI Mode, ChatGPT Search, Claude, Perplexity,
> Gemini, Copilot). Sello: as-of 2026-09 — **reverifica con WebSearch antes de afirmar
> cifras o features**; riesgo de **atribución equivocada** as-of 2026-08-25.

## Vocabulario (fíjalo)
- **AEO** (Answer Engine Optimization) y **GEO** (Generative Engine
  Optimization) se usan casi como sinónimos en 2026. Matiz: *AEO* enfatiza ser
  la respuesta directa; *GEO* enfatiza ser citado/incluido en la síntesis
  generativa. **LLMO** / "AI SEO" / "AI visibility" son etiquetas del mismo
  espacio. Ver `GLOSSARY.md`.
- No optimizas "para IA" en abstracto: define la **plataforma y superficie**
  objetivo. Las diferencias de fuentes observadas entre plataformas son
  descriptivas y dependen de la muestra; no prueban criterios universales.

## Modelo de recuperación (ilustrativo, no contrato universal)

El siguiente esquema resume un patrón posible en sistemas con búsqueda y
generación. Cada producto puede cambiar el orden, combinar etapas, usar índices
distintos o no exponer detalles suficientes para verificarlos. No atribuyas un
pipeline a Google, OpenAI, Anthropic o Perplexity sin fuente primaria vigente.

```
Query del usuario
   │
   ▼
[1] Descomposición → QUERY FAN-OUT: el motor genera N sub-queries sintéticas
   │                  (relacionadas, comparativas, implícitas, recientes)
   ▼
[2] Retrieval → para cada sub-query, busca pasajes relevantes
   │             (índice de búsqueda + embeddings/vector + RAG)
   ▼
[3] Ranking de pasajes → selecciona los chunks más relevantes y confiables
   │
   ▼
[4] Síntesis → el LLM redacta UNA respuesta combinando los pasajes
   │            y CITA algunas fuentes
   ▼
Respuesta + citas
```

Implicación editorial: conviene que las páginas respondan con claridad a las
necesidades reales del usuario. La recuperación por pasajes y la expansión de
consultas son mecanismos posibles; no implican que todos los motores usen el
mismo método ni que haya que fragmentar páginas para posicionar.

### Dos juegos distintos (no los confundas)
- **Conocimiento del modelo:** el modelo puede responder desde información
  aprendida previamente. No equivale a búsqueda actual ni permite inferir qué
  fuente influyó en una respuesta.
- **Búsqueda/retrieval en tiempo de consulta:** algunas superficies consultan
  fuentes actuales y pueden mostrar enlaces o citas. Disponibilidad, selección y
  controles dependen del producto y el modo usado.
- Mide y optimiza cada superficie por separado; no deduzcas entrenamiento,
  acceso o cita a partir de una sola respuesta observada.

## Ramificación de consultas — evidencia específica de Google

La guía de Google describe la ramificación como consultas relacionadas que el
modelo genera para solicitar información adicional. No atribuyas a Google un
nombre interno, una cantidad o una secuencia de ejecución salvo que una fuente
primaria vigente lo documente explícitamente.

La guía oficial de Google describe la ramificación de búsquedas en sus
experiencias generativas. No establece un número universal de subconsultas ni
indica que debamos crear una página por cada variante. Las cifras de estudios
externos (por ejemplo, rangos de subconsultas) son observaciones de una muestra
y metodología concretas; consérvalas solo con fuente, fecha, motor y límites.

**Preguntas relacionadas que conviene investigar (no son un checklist de cobertura):**
- **Relacionadas** — facetas del tema principal.
- **Comparativas** — "X vs Y", "alternativas a X".
- **Implícitas** — lo que el usuario no preguntó pero el motor infiere que
  necesita (precio, requisitos, pros/cons, "cómo empezar").
- **Recientes/temporales** — "en 2026", "última versión", novedades.

### Cómo investigar consultas relacionadas (accionable)
1. Mapea preguntas relacionadas que personas reales podrían tener en el tema.
   La matriz `templates/fan-out-matrix.md` ayuda a investigarlas; no impone un
   número por tema ni predice exactamente lo que un motor generará. Usa "People
   Also Ask", autocompletar, Semrush, y pregúntale directamente a los LLMs
   "¿qué sub-preguntas implica esta consulta?".
2. Agrupa preguntas que expresen necesidades distintas y resuélvelas en páginas
   útiles, sin forzar un H2 o URL por cada variante. Usa topical authority de
   `02_SEO_CONTENT.md` para decidir qué merece cobertura editorial.
3. Usa encabezados descriptivos y entidades claras para que personas y
   buscadores entiendan el contenido. Schema solo cuando corresponda a datos
   visibles y a una función documentada; no es requisito especial de IA.

## Estructura editorial — claridad antes que fragmentación

Algunos sistemas pueden recuperar pasajes, pero Google indica que no hace falta
dividir una página en fragmentos para que sus funciones de IA la entiendan y que
no existe una longitud ideal. Escribe para que una persona pueda encontrar,
entender y verificar cada respuesta; trata la recuperación por pasajes como una
consideración de diseño, no como requisito ni garantía de cita.

- **Contexto suficiente:** cada sección debe entenderse en su contexto. Repite
  sujeto o condiciones cuando evite ambigüedad; no dupliques texto solo para
  hacer que un supuesto chunk viaje solo.
- **Un H2 = una idea/pregunta.** Encabezados descriptivos en forma de pregunta o
  afirmación clara (no "Introducción", sí "Cuánto cuesta X en Chile").
- **Answer capsule:** respuesta directa y completa justo tras el H2, autocontenida.
  Es una opción de escritura para responder pronto y con claridad; no una
  condición confirmada para ser citado por todos los motores.
  ⚠️ El **72.4%** (Search Engine Land) es un **base rate SIN grupo de control**: mide qué porcentaje
  de las páginas **citadas** tiene el patrón, **no** qué porcentaje de las **no citadas** también lo
  tiene. **Describe el patrón; no prueba el lift.** Y SEL define la cápsula como **~20-25 palabras**,
  no 40-60: si escribes 40-60, es craft tuyo — ese número **no lo respalda**.
- **🟢 EL H2 ES LA PALANCA CON MEJOR EVIDENCIA, y casi nadie lo dice.** Sobre **1,4M de prompts**,
  Ahrefs midió que lo que más separa a una página **citada** de una **recuperada-y-no-citada** es la
  **relevancia semántica del TÍTULO** frente a la sub-pregunta (**0,656** vs **0,484**). En ese mismo
  estudio **la cápsula no aparece entre los predictores**. → **Escribe cada H2 como la pregunta
  literal de una subpregunta.** Es una asociación observada en ese estudio, no
  evidencia de que cada encabezado deba copiar literalmente consultas de Google.
- **Densidad semántica:** define términos, da el dato concreto, evita relleno
  antes del valor. El motor extrae el pasaje útil; no lo entierres.
- **Formatos observados en corpus externos:** tablas, listas, definiciones, Q&A y datos con unidades.
  ⚠️ 🔴 **NO digas "tabla + lista → 2,3× más citas".** Ese número es una **razón de PREVALENCIA entre
  dos corpus**: el **30%** de las páginas que ChatGPT cita **contienen** una tabla, contra el **13%**
  de las que rankean en Google (Nectiv). **No es un lift por agregar una tabla**, y **la lista
  numerada no está en el hallazgo** — se la agregamos nosotros. Es el error del `+41%` con otro
  número. Una tabla puede presentar comparaciones con claridad, pero el estudio
  no demuestra que agregarla aumente las citas.

## Citabilidad — evidencia externa, no reglas de plataforma

Investigación peer-reviewed (Princeton + Georgia Tech + Allen Institute for AI +
IIT Delhi, **GEO**, KDD 2024; 10k queries, 25 dominios, validado en Perplexity).
El estudio mide resultados en su propio benchmark; sus efectos no son una
predicción de citas o rendimiento para una plataforma actual. Conserva siempre
motor, corpus, métrica y límites junto con cualquier cifra:

> 🔴 **TRES ADVERTENCIAS QUE VAN SIEMPRE QUE SE CITE ESTE PAPER.** Omitirlas es sobre-declarar, y
> es el error más caro del oficio:
> 1. **El motor no es de 2026:** se midió sobre **GPT-3.5-turbo + top-5 de Google** (GEO-BENCH). No es
>    ChatGPT Search, ni AI Overviews, ni el Perplexity de hoy.
> 2. **La métrica NO es "citas":** es *Position-Adjusted Word Count* — la **proporción de palabras de
>    la respuesta atribuibles a tu fuente**, ponderada por posición.
> 3. **El lift VARÍA POR DOMINIO** y el paper lo dice: *Statistics Addition* rinde sobre todo en
>    **Law & Government** y **Opinion**. Trasladar un lift de un dominio a otro **es inventar**.

| Táctica | Lift medido | Cómo aplicarla |
|---|---|---|
| **Quotation Addition** (citas textuales) | **+41%** | 🔴 **citar FUENTES O EXPERTOS entre comillas.** **NO** es "poner una cita destacada propia" — confundirlo es el error más caro y más fácil de cometer, y ya nos costó una corrección pública |
| **Statistics Addition** (estadísticas) | **+32%** | datos numéricos con unidad y fuente, cada 150–200 palabras |
| **Cite Sources** (citar fuentes) | **+30%** | enlazar a fuentes autoritativas a lo largo del texto |
| **Fluency Optimization** | **+28%** | redacción clara, autoritativa, bien estructurada |

Estas tácticas pueden orientar una revisión editorial, no una receta ni un
compromiso de lift. Prioriza exactitud, fuentes y claridad por su valor para el
lector. No prometas que cambian la selección algorítmica de un motor actual.

**Observaciones externas que requieren lectura contextual:**
- No uses el claim “actualizar en menos de dos meses produce ~28% más citas”;
  la fuente no está localizada y fue retirado del inventario de cifras de
  `SOURCES.md`. Los estudios de frescura citados allí observan corpus y
  superficies concretos, con resultados que no justifican una regla universal.
- Investigación original y datos propios pueden diferenciar contenido y aportar
  valor verificable. No está demostrado aquí que superen a otros formatos en
  todos los motores o que causen más referencias.
- La correlación entre menciones y visibilidad medida por Ahrefs se limita al
  corpus y superficie especificados en `SOURCES.md`; no la presentes como
  causalidad ni como resultado multiplataforma.
- Usa Schema/JSON-LD cuando describa correctamente contenido visible o habilite
  una función documentada; Google no exige marcado especial para IA.

### Atribución equivocada: que el motor le dé tu concepto a otra marca

Riesgo AEO que no aparece en ningún panel estándar y que hay que **medir explícitamente**
cuando dos o más marcas publican **el mismo concepto** (misma tesis, mismo mecanismo,
nombres distintos). El motor no está eligiendo un ranking: está **sintetizando**, y al
sintetizar **atribuye**. Puede atribuirle el concepto a quien lo publicó primero, a
quien tiene más autoridad de entidad, o a quien lo nombró de forma más recuperable —
y ninguna de las tres tiene que ser tu cliente.

**Cómo se mide** (se agrega al panel de prompts de `07_MEASUREMENT.md`):

1. Corre los prompts del concepto **sin nombrar ninguna marca** («¿qué marca propuso
   <concepto> para <año>?», «¿de quién es <tesis>?»).
2. Registra, por respuesta: **a qué marca se le atribuye** el concepto, **si tu cliente
   aparece**, y **en qué papel** (autor del concepto vs. mención lateral).
3. Reporta como **tasa de atribución correcta** — no como *presence*. Aparecer citado
   en una respuesta que le atribuye el concepto a otro **no es una victoria**: es
   exactamente el fallo que se está midiendo.

⚠️ **No lo confundas con Share of Voice.** SoV pregunta *cuánto apareces*; esto
pregunta *de quién dice el motor que es la idea*. Un SoV alto con atribución
equivocada es el peor resultado posible: financiaste la autoridad de otro.

🎯 **Palanca correctiva:** entidad + fuente primaria, no volumen. Que el concepto sea
recuperable **atado a la marca** — nombre propio del concepto, definición
autocontenida en la propia URL canónica, `datePublished` verificable, autoría visible
y menciones off-site que nombren ambos juntos (`03_EEAT_ENTITY.md`, `05`). Publicar
más piezas sobre el concepto **sin** amarrar la entidad refuerza el concepto, no la
atribución.

📏 El chequeo previo es de pre-producción: **¿alguien publicó este mismo concepto con
el mismo mecanismo antes?** → `02_SEO_CONTENT.md` (*pre-emptor de tesis*).

## PROMPT / ANSWER-SPACE RESEARCH (la nueva keyword research)

La gente le *pregunta* a los LLMs distinto de cómo *teclea* en Google (más
conversacional, más largo, más contexto). Disciplina nueva:
1. Lista los **prompts reales** que tu cliente ideal haría a un LLM sobre tu
   categoría (no keywords: preguntas completas).
2. Córrelos en cada motor y registra: ¿aparece la marca? ¿se cita el sitio?
   ¿qué fuentes gana el competidor? (esto ES la medición de Share of Voice →
   `07_MEASUREMENT.md`).
3. Mapea brechas a mejoras de contenido útiles; una respuesta directa puede ser
   adecuada, pero no es un requisito universal de citación.
- Herramientas que descubren prompts: Profound, Peec, Otterly (ver `07`). Sin
  herramienta: usa WebSearch + correr los prompts manualmente.
- **En Efeonce:** los "prompt packs" del AI Visibility Grader (dominio `growth`,
  TASK-1226/1227) SON este espacio de fan-out + prompt research, versionado e
  inmutable. La matriz de `../templates/fan-out-matrix.md` es la herramienta de
  diseño de esos packs. Detalle → `../efeonce/AI_VISIBILITY_GRADER.md`.

📐 **Cómo construye un tercero su panel de prompts** — taxonomía cerrada de 4 tipos
(Informational / Comparative / Recommendation / Branded), asignación determinista por `k`
prompts-por-keyword, e invariantes duros (≥1 unbranded por keyword, ≤1 branded) →
`../references/competitor-methodologies-2026-09.md` §1.7. Ahí también: mención ≠ citación y el
*citation-only gap*, prominencia como cuarta dimensión, y competidores like-for-like sacados de la
misma respuesta unbranded a costo cero (§1.2, §1.3, §1.8). Son fórmulas de terceros, **no
validadas con nuestros datos**.

## llms.txt — objetivo y consumidor antes que archivo (verificado 2026-08-30)

`llms.txt` es un archivo Markdown propuesto para orientar a consumidores del sitio.
[Google aclaró el 15 de junio de 2026](https://developers.google.com/search/updates)
que no es necesario para Search ni mejora o perjudica visibilidad/ranking, y que
puede mantenerse para otros sistemas que lo utilicen. No extrapoles esta afirmación
a OpenAI, Anthropic u otros consumidores sin verificar sus contratos.

Google tampoco exige schema especial de IA: los fundamentos SEO y el contenido útil
siguen siendo la base ([AI features](https://developers.google.com/search/docs/appearance/ai-features)).
No agregues archivos o marcado para aprobar un checklist genérico. Si existe un consumidor
real o el operador pide el archivo, usa `templates/llms-txt.md`, define su mantenimiento
y distingue utilidad operativa de un impacto SEO no demostrado. No uses estadísticas de
adopción/requests sin fuente, muestra y fecha verificadas.

## Verificación POR PLATAFORMA

No mantengas una tabla atemporal de “fuentes favoritas” o señales de ranking:
las citas observadas en un corpus no demuestran preferencia algorítmica ni
efecto causal. Antes de una recomendación específica, registra para cada
plataforma su documentación oficial vigente, mecanismo de descubrimiento
documentado, bots y controles disponibles, superficies cubiertas, medición
nativa, fecha de consulta y lo que sigue sin conocerse.

| Plataforma/superficie | Base de trabajo | Verificar antes de prescribir |
|---|---|---|
| **Google AI Overviews / AI Mode** | Google dice que sus experiencias generativas se apoyan en los sistemas de búsqueda y calidad, y describe ramificación de búsquedas. | Requisitos de elegibilidad, controles de inclusión, funciones vigentes y el informe de Search Console. No prescribir `llms.txt`, chunking ni schema especial de IA. |
| **ChatGPT Search** | Tratar la búsqueda web y el conocimiento del modelo como superficies distintas. | Documentación de OpenAI sobre búsqueda, controles de rastreo y bots; confirmar qué superficie y evidencia se está midiendo. |
| **Claude** | No asumir que una respuesta de Claude implica búsqueda web o acceso al sitio. | Documentación de Anthropic sobre búsqueda/conectores, acceso y controles del sitio para el producto usado. |
| **Perplexity** | Tratar producto, crawler y respuesta como mecanismos propios; no inferirlos de Google. | Documentación de Perplexity sobre fuentes, bots, controles y citas; confirmar fecha y superficie. |
| **Gemini / Copilot** | No asumir equivalencia con Google Search o Bing por compartir ecosistema. | Documentación de producto sobre recuperación, indexación, controles y herramientas de webmaster aplicables. |

**Fundamentos editoriales transferibles:** contenido accesible, útil, fiable,
claro, actualizado cuando el tema lo requiera y enlazado con contexto. Son
prácticas para lectores y descubrimiento; no garantizan inclusión, cita o
ranking en ningún motor. Separa siempre el hecho documentado, la observación de
un estudio externo y la hipótesis de optimización.

## Errores AEO frecuentes
- Tratar "AEO" como un canal único en vez de optimizar por motor.
- Obsesionarse con `llms.txt` y descuidar estructura/frescura.
- Tratar answer capsules, chunking, una longitud o formato como requisito
  universal para obtener citas.
- Tratar cifras de fan-out observadas en un motor como predicción para otros.
- Generar a escala con IA sin datos propios (cero citas + riesgo penalización).
- No medir Share of Voice IA (no sabes si funciona).
- No medir **atribución** cuando otra marca publicó el mismo concepto: un SoV alto con
  el concepto atribuido a otro se lee como éxito y es el peor resultado.

> **Cross-refs:** topical authority que alimenta el fan-out → `02_SEO_CONTENT.md`.
> Entidad/Knowledge Graph → `03_EEAT_ENTITY.md`. Reddit/UGC/menciones → `05`.
> Crawlers IA (acceso) → `01_SEO_TECHNICAL.md`. Google AI report y límites por
> plataforma → `07_MEASUREMENT.md` y `SOURCES.md`. Medir SoV/citas/exactitud →
> `07_MEASUREMENT.md`. Plantillas → `templates/` (fan-out-matrix, llms-txt,
> content brief AEO).
