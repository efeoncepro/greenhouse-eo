# 04 · AEO / GEO — Ser recuperado y citado por motores de respuesta IA ⭐

> El módulo de mayor valor diferencial y el más volátil. Carga para: cómo
> recuperan los answer engines, **Query Fan-Out**, **chunking** semántico,
> **citabilidad**, **prompt/answer-space research**, `llms.txt`, y tácticas
> **por-motor** (AI Overviews/AI Mode, ChatGPT Search, Perplexity, Gemini,
> Copilot). Sello: as-of 2026-06 — **reverifica con WebSearch antes de afirmar
> cifras o features**.

## Vocabulario (fíjalo)
- **AEO** (Answer Engine Optimization) y **GEO** (Generative Engine
  Optimization) se usan casi como sinónimos en 2026. Matiz: *AEO* enfatiza ser
  la respuesta directa; *GEO* enfatiza ser citado/incluido en la síntesis
  generativa. **LLMO** / "AI SEO" / "AI visibility" son etiquetas del mismo
  espacio. Ver `GLOSSARY.md`.
- No optimizas "para IA" en abstracto: optimizas **para un motor concreto**.
  Solo ~**11%** de los dominios citados se solapan entre ChatGPT y Perplexity.

## Cómo funciona un answer engine (modelo mental)

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

Implicación: **te recuperan por pasajes, no por páginas**, y debes existir en el
espacio de **sub-queries** del fan-out, no solo en la keyword principal.

### Dos juegos distintos (no los confundas)
- **Memorización (training):** el modelo "sabe" de tu marca porque estuvo en su
  corpus de entrenamiento. Se gana con presencia amplia y consistente a lo largo
  del tiempo (entidad + menciones). Lento, estructural.
- **Retrieval (en query):** el motor *busca en vivo* y cita lo que encuentra.
  Se gana con contenido estructurado, fresco y recuperable. Rápido, accionable.
- AEO ataca **ambos**, pero el retrieval es donde mueves la aguja este trimestre.

## QUERY FAN-OUT — el concepto central de AI Mode

Google AI Mode (y en parte AI Overviews) usa fan-out: descompone tu pregunta en
**múltiples sub-queries simultáneas**. Internamente Google lo llama
**"Scatter-Gather with Planning"** (*scatter* = lanza sub-queries a varias
fuentes a la vez; *gather* = recolecta y fusiona).

**Data verificada (as-of 2026-06):** una query de AI Mode genera típicamente
**8–12 sub-queries**; ~**59%** de los prompts disparan 5–11 sub-queries
simultáneas (~9–11 en consultas complejas).

**Tipos de sub-query del fan-out (cúbrelos para ser recuperable):**
- **Relacionadas** — facetas del tema principal.
- **Comparativas** — "X vs Y", "alternativas a X".
- **Implícitas** — lo que el usuario no preguntó pero el motor infiere que
  necesita (precio, requisitos, pros/cons, "cómo empezar").
- **Recientes/temporales** — "en 2026", "última versión", novedades.

### Cómo optimizar para fan-out (accionable)
1. **Mapea el espacio de fan-out** de tu tema: lista 8–15 sub-preguntas que un
   motor generaría. (Plantilla: `templates/fan-out-matrix.md`.) Usa "People
   Also Ask", autocompletar, Semrush, y pregúntale directamente a los LLMs
   "¿qué sub-preguntas implica esta consulta?".
2. **Cubre cada sub-query con un pasaje autocontenido** — un H2 = una
   sub-pregunta = una answer capsule. Esto es exactamente la **topical
   authority** de `02_SEO_CONTENT.md`: el cluster que cubre el tema completo es
   lo que te hace recuperable en el fan-out.
3. **Estructura entidad-céntrica** — schema + lenguaje claro de entidades ayuda
   al matching durante el fan-out.

## CHUNKING — escribir para que te recuperen por pasajes

Los motores trocean el contenido en **chunks** (pasajes) y recuperan/citan a ese
nivel. Tu trabajo: que cada chunk sea **autosuficiente y citable**.

- **Auto-contención:** cada sección debe entenderse *sin el resto de la página*.
  No "como vimos arriba"; repite el sujeto. El chunk viaja solo.
- **Un H2 = una idea/pregunta.** Encabezados descriptivos en forma de pregunta o
  afirmación clara (no "Introducción", sí "Cuánto cuesta X en Chile").
- **Answer capsule:** primeras **40–60 palabras** tras el H2 = respuesta directa
  y completa. El **72.4%** de páginas citadas por ChatGPT tienen este patrón.
- **Densidad semántica:** define términos, da el dato concreto, evita relleno
  antes del valor. El motor extrae el pasaje útil; no lo entierres.
- **Formatos que se citan más:** tablas (≥1 tabla + ≥1 lista numerada → ~2.3× más
  citas en ChatGPT browsing), listas, definiciones, Q&A, datos con unidades.

## CITABILIDAD — las tácticas GEO con evidencia

Investigación peer-reviewed (Princeton + Georgia Tech + Allen Institute for AI +
IIT Delhi, **GEO**, KDD 2024; 10k queries, 25 dominios, validado en Perplexity).
**Lift de visibilidad por táctica:**

| Táctica | Lift medido | Cómo aplicarla |
|---|---|---|
| **Quotation Addition** (citas textuales) | **+41%** | incluir citas de expertos/fuentes entre comillas |
| **Statistics Addition** (estadísticas) | **+32%** | datos numéricos con unidad y fuente, cada 150–200 palabras |
| **Cite Sources** (citar fuentes) | **+30%** | enlazar a fuentes autoritativas a lo largo del texto |
| **Fluency Optimization** | **+28%** | redacción clara, autoritativa, bien estructurada |

Las tres primeras dominan. Síntesis operativa: **datos + citas textuales +
fuentes + redacción autoritativa**. (Keyword stuffing y trucos clásicos NO
mueven la aguja en GEO; algunos la bajan.)

**Otras señales de citabilidad (data 2026):**
- **Frescura:** contenido actualizado <2 meses → ~**+28%** citas. La IA cita
  contenido ~25.7% más fresco que la búsqueda clásica. → fecha visible + refresh.
- **Original research / data propietaria** = el tipo de contenido de mayor
  leverage en los 3 motores. Case studies y páginas de **pricing** superan a
  guías top-of-funnel para tráfico IA referido.
- **Menciones de marca off-site** correlacionan ~3× más que backlinks con
  visibilidad IA (`05_OFFPAGE_AUTHORITY.md`).
- **Schema/JSON-LD** como hechos legibles por máquina (`01` + `templates/`).

## PROMPT / ANSWER-SPACE RESEARCH (la nueva keyword research)

La gente le *pregunta* a los LLMs distinto de cómo *teclea* en Google (más
conversacional, más largo, más contexto). Disciplina nueva:
1. Lista los **prompts reales** que tu cliente ideal haría a un LLM sobre tu
   categoría (no keywords: preguntas completas).
2. Córrelos en cada motor y registra: ¿aparece la marca? ¿se cita el sitio?
   ¿qué fuentes gana el competidor? (esto ES la medición de Share of Voice →
   `07_MEASUREMENT.md`).
3. Mapea los gaps a contenido (answer capsules para los prompts donde no
   apareces).
- Herramientas que descubren prompts: Profound, Peec, Otterly (ver `07`). Sin
  herramienta: usa WebSearch + correr los prompts manualmente.
- **En Efeonce:** los "prompt packs" del AI Visibility Grader (dominio `growth`,
  TASK-1226/1227) SON este espacio de fan-out + prompt research, versionado e
  inmutable. La matriz de `../templates/fan-out-matrix.md` es la herramienta de
  diseño de esos packs. Detalle → `../efeonce/AI_VISIBILITY_GRADER.md`.

## llms.txt — qué es y por qué es ROI marginal (as-of 2026-06)

`llms.txt` es un archivo markdown propuesto en la raíz que "resume" el sitio para
LLMs. **Realidad 2026, sin endulzar:**
- **Google NO lo usa ni lo endorsa.** John Mueller lo comparó con la difunta meta
  keywords ("lo que el dueño *dice* que es su sitio"); Gary Illyes confirmó que
  Google no lo soporta ni planea hacerlo. OpenAI, Anthropic, Meta, Mistral
  tampoco lo consumen para ranking/recomendación.
- **Adopción/uso real:** análisis Ahrefs de 137k dominios → **97%** de los
  `llms.txt` recibieron **cero requests** en mayo 2026; solo ~28% de dominios lo
  publican.
- **Veredicto:** es barato de poner y no hace daño, pero **no esperes impacto**.
  **No lo priorices** sobre estructura de contenido, entidad o frescura. Si el
  operador lo pide, ponlo (`templates/llms-txt.md`) y sé honesto sobre el ROI.
  El juego real es el contenido recuperable, no un archivo declarativo.

## Tácticas POR MOTOR (cada uno es un canal distinto)

| Motor | Qué fuentes favorece (2026) | Palancas específicas |
|---|---|---|
| **Google AI Overviews / AI Mode** | usa Googlebot + índice de Google; favorece contenido que ya rankea + fan-out | gana en orgánico clásico, cubre el fan-out, answer capsules, schema |
| **ChatGPT Search** | **Wikipedia (47.9%)**, contenido estructurado; bot `OAI-SearchBot` | answer capsules (72.4% de citados), entidad fuerte, presencia en Wikipedia |
| **Perplexity** | **Reddit (~46.7%)**, fuentes frescas y citables; `PerplexityBot` | frescura, citas/datos, presencia en Reddit/foros, estructura Q&A |
| **Gemini** | ecosistema Google + Knowledge Graph | entidad/Knowledge Graph, orgánico Google, datos estructurados |
| **Copilot (Bing)** | índice de Bing | no descuidar **Bing Webmaster Tools** + IndexNow |

**Patrones transversales:**
- **Reddit es la fuente #1 citada** across engines (~1 de cada 5 citas en
  Perplexity). **YouTube superó a Reddit** como plataforma social más citada a
  inicios de 2026. → presencia genuina en comunidades + video (`05`).
- **El fundamento es común:** contenido estructurado + autoridad verificada +
  publicación consistente + presencia de marca más allá de tu sitio. Lo
  específico por motor es la *capa fina*; los fundamentos son el 80%.

## Errores AEO frecuentes
- Tratar "AEO" como un canal único en vez de optimizar por motor.
- Obsesionarse con `llms.txt` y descuidar estructura/frescura.
- Contenido sin answer capsules (pierdes citabilidad medible).
- No cubrir el espacio de fan-out (solo la keyword principal).
- Generar a escala con IA sin datos propios (cero citas + riesgo penalización).
- No medir Share of Voice IA (no sabes si funciona).

> **Cross-refs:** topical authority que alimenta el fan-out → `02_SEO_CONTENT.md`.
> Entidad/Knowledge Graph → `03_EEAT_ENTITY.md`. Reddit/UGC/menciones → `05`.
> Crawlers IA (acceso) → `01_SEO_TECHNICAL.md`. Medir SoV/citas/exactitud →
> `07_MEASUREMENT.md`. Plantillas → `templates/` (fan-out-matrix, llms-txt,
> content brief AEO).
