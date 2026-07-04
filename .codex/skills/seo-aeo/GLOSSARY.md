# GLOSSARY — Vocabulario SEO + AEO/GEO (2026)

> Léxico técnico canónico de la categoría de visibilidad de marca en motores de
> respuesta + SEO clásico. Sirve para diagnóstico, copy, FAQ, schema y para hablar
> la categoría con precisión. El vocabulario de este espacio colisiona y muta
> rápido; reverificá lo volátil (ver `SOURCES.md`). Sello: as-of 2026-07.
> Cross-refs a módulos (`modules/*.md`) donde aplica.

## 1. Nombres de la categoría (las siglas que compiten)

- **AEO** — *Answer Engine Optimization*. Optimizar el contenido para que los
  motores de respuesta lo **extraigan y citen directamente** en sus respuestas
  generadas. Énfasis: ser la respuesta.
- **GEO** — *Generative Engine Optimization*. Optimizar para ser **citado/incluido**
  en respuestas generativas. Énfasis: ser fuente de la síntesis. Término del paper
  Princeton/GaTech/IIT Delhi (2023) que mostró que añadir estadísticas y citar
  fuentes elevaba la visibilidad ~30–40%. Es el más usado entre herramientas.
- **AI SEO / AI Search Optimization / Search Everywhere Optimization** — paraguas
  genérico para todas las tácticas de búsqueda con IA.
- **LLMO / LLM Optimization** — influir en cómo los modelos **entienden, recuerdan
  y representan** tu marca, tanto en datos de entrenamiento como en retrieval en vivo.
- **AIO** — ambiguo: "AI Optimization" (catch-all) o "AI Overviews Optimization"
  (específico de la función de Google). Verificar el contexto.
- **GSO** — *Generative Search Optimization*. Sinónimo menos común.
- **AI answer optimization / AI visibility optimization** — variantes descriptivas.
- **En esta skill:** los tratamos como un **continuo**. Lo que importa no es la sigla
  sino el motor concreto y la mecánica (recuperación + citabilidad).

## 2. Motores y superficies

- **Answer engine** — sistema que responde con una respuesta generada o extraída en
  vez de una lista de enlaces.
- **Generative engine** — el que **sintetiza** la respuesta a partir de fuentes
  recuperadas (término del paper de 2024).
- **SGE** — *Search Generative Experience*. Nombre **viejo** (2023–24) del experimento
  de Google; sustituido por "AI Overviews" + "AI Mode". Si alguien dice SGE, se refiere
  a esto; usá la nomenclatura actual.
- **AI Overviews (AIO)** — la respuesta generada de Google **arriba** de los resultados
  orgánicos; la superficie GEO más grande por volumen. Impulsada por Gemini; usa
  Googlebot + índice de Google; cita un panel de fuentes. ~48–50% de queries (2026).
- **AI Mode** — la interfaz **conversacional separada** de Google (2026): su propio
  destino, no un snippet embebido en la SERP. Usa **Query Fan-Out** de forma intensiva.
- **ChatGPT Search** — búsqueda de OpenAI (bots `OAI-SearchBot` + `ChatGPT-User`).
- **Perplexity** — answer engine con citas explícitas (bot `PerplexityBot`).
- **Gemini** — IA de Google; integra Knowledge Graph + ecosistema Google.
- **Copilot** — IA de Microsoft sobre índice de **Bing**.
- **Answer box / Featured snippet** — el antecesor "una sola fuente" del extracto
  mostrado arriba de los resultados.
- **Zero-click** — la sesión de búsqueda termina **sin clic** al sitio; el usuario se
  queda con la respuesta (65% en 2026; 83% con AI Overview).

## 3. Métricas (lo que se mide) — el núcleo

- **AI Visibility Score** — número compuesto (típicamente 0–100) que resume tu presencia
  across motores. Estándar de facto.
- **Share of Voice (AI SOV)** — tus menciones frente a las de tus competidores; posición
  relativa. Denominador = menciones totales de competidores.
- **Share of Model™** — % del set de prompts en que aparece tu marca (visibilidad
  absoluta). Denominador = el set de prompts. **Marca registrada** de shareofmodel.ai.
- **Share of Answer** — variante (Profound): cuánto de la respuesta generada es
  atribuible a tu marca.
- **Mention rate / Brand mentions** — con qué frecuencia te nombran dentro de la
  respuesta (con o sin enlace).
- **Citation rate / Citation coverage / Citation share** — con qué frecuencia te *citan*
  como fuente (con URL/atribución). (Ver `07_MEASUREMENT.md`.)
- **Citation probability** — probabilidad de que una URL específica sea citada para un
  prompt objetivo. Métrica a nivel de página.
- **Citability / AI citability** — qué tan "citable" es tu contenido: legible, extraíble
  y atribuible por el motor.
- **Answerability** — qué tan bien una página responde directamente una pregunta.
- **Sentiment** — el tono con que la IA describe tu marca. Se desglosa en general,
  contextual (según tema/uso) y basado en fuentes.
- **Mention depth / Presence quality** — cuán sustantivamente te discute el motor, no
  solo si te nombra.
- **Prompt set / Prompt volume** — el conjunto de preguntas que se monitorea (típico:
  50–500 queries, mezclando prompts de categoría, de problema y de comparación).
- **Prompt tracking** — seguimiento de tu visibilidad prompt por prompt.
- **Position / Rank within answer** — dónde apareces dentro de la respuesta (no hay
  posiciones 1–10; hay citas y menciones).
- **Index freshness** — cuán reciente es el re-crawl e indexación del motor (Perplexity
  rota a diario; AIO puede tardar semanas).

## 4. Contenido: cómo se gana la cita

- **Extractability / Extractable content** — qué tan fácil es "levantar" un bloque limpio
  y atribuible de tu página.
- **Retrievability** — qué tan fácil es que el sistema recupere tu página en tiempo de
  consulta.
- **Atomic answer** — la unidad mínima citable: una afirmación limpia y autocontenida que
  funciona fuera de contexto.
- **BLUF (Bottom Line Up Front) / Answer-first** — patrón de redacción que pone la
  conclusión en la primera frase o párrafo.
- **Direct answer / Answer capsule** — respuesta directa, autocontenida (40–60 palabras
  bajo un H2); patrón de alta citabilidad (`04_AEO_GEO.md`).
- **AI snippet** — extracto corto que un motor cita textualmente dentro de su respuesta.
- **Passage / Passage retrieval** — se recupera y cita a nivel de párrafo/pasaje, no de
  página completa (AIO y Perplexity muestran pasajes).
- **Chunk / Chunking** — el motor parte el contenido largo en pasajes (típico 200–500
  tokens con 10–20% de solape) antes de generar embeddings; los cortes afectan qué se
  cita. Se optimiza para que cada chunk sea autocontenido (`04_AEO_GEO.md`).
- **Answer graph / Answer-graph node** — red de contenido interconectado; el retrieval
  premia evidencia densa e interconectada.
- **Topic cluster / Pillar page** — página madre que cubre un concepto primario más
  sub-preguntas relacionadas (definiciones, procesos, comparaciones, FAQs). (Ver
  `02_SEO_CONTENT.md`.)
- **Statistical density / Self-contained definition** — datos concretos y definiciones
  claras al inicio; suben la citabilidad.
- **Third-party consensus** — validación externa (Reddit, sitios de reviews, roundups,
  Q&A de expertos) que refuerza las citas (`05_OFFPAGE_AUTHORITY.md`).

## 5. Técnico: cómo la IA te lee

- **RAG (Retrieval-Augmented Generation)** — arquitectura estándar de la búsqueda con IA:
  recuperar documentos relevantes y luego generar una respuesta anclada en ellos.
- **Grounding** — anclar la salida del modelo a fuentes reales (así lo llama Google). Es
  el reverso de la alucinación.
- **Hallucination** — salida del modelo confiada pero falsa o no respaldada por las
  fuentes recuperadas; se mitiga (no se elimina) con grounding.
- **Embeddings / Vector retrieval** — representación semántica del texto que permite
  recuperar por **significado**, no solo por keyword match.
- **Reranker / ColBERT** — modelos que reordenan por relevancia el set inicial recuperado
  (infraestructura de retrieval).
- **Query Fan-Out** — el motor descompone la query en N sub-consultas simultáneas, recupera
  fuentes para cada una y sintetiza una sola respuesta. Google lo llama internamente
  **"Scatter-Gather with Planning"**; 8–12 sub-queries típicas.
- **Structured data / Schema.org** — marcado semántico (FAQ, HowTo, Service, DefinedTerm,
  Organization) que hace el contenido legible por máquina (`01_SEO_TECHNICAL.md`).
- **Entity / Entity clarity / Entity home / Entity disambiguation / sameAs** — que el motor
  entienda "quién eres" como entidad y no te confunda con otra (nombres consistentes,
  schema, `sameAs`). Base del razonamiento entidad-céntrico 2026 (`03_EEAT_ENTITY.md`).
- **AI crawlers** — bots que recuperan páginas para **entrenar** (GPTBot de OpenAI,
  ClaudeBot de Anthropic, Google-Extended) o para **responder en vivo** (OAI-SearchBot,
  PerplexityBot); Googlebot para AIO. Crawlean de forma independiente (`01_SEO_TECHNICAL.md`).
- **robots.txt / llms.txt** — archivos que permiten o bloquean el acceso de esos bots.
  `llms.txt` (markdown para "resumir" un sitio a LLMs): Google no lo usa; ROI marginal en
  2026 (`04_AEO_GEO.md`).
- **Accessibility tree** — representación estructural de la página que facilita (o
  dificulta) la lectura automática.
- **Extractive vs. abstractive** — extractivo = cita texto verbatim; abstractivo = redacta
  frases nuevas sintetizando. Las Overviews suelen sintetizar (abstractivo) pero anclado
  en fuentes.

## 6. SEO clásico (fundamentos que alimentan las 3 capas)

- **E-E-A-T** — Experience, Expertise, Authoritativeness, Trustworthiness: señales de
  credibilidad de fuente de las Quality Rater Guidelines; correlacionan con lo que los
  modelos premian (`03_EEAT_ENTITY.md`).
- **YMYL** — *Your Money or Your Life*. Temas sensibles (salud, finanzas, seguridad) con
  listón de calidad más alto.
- **Core Web Vitals (CWV)** — LCP (≤2.5s), INP (≤200ms, reemplazó FID en 2024), CLS (≤0.1).
  Datos de campo vía **CrUX**.
- **Entidad / Knowledge Graph** — "cosa" del mundo con identidad propia que los motores
  reconocen.
- **Topical authority** — autoridad temática que se gana cubriendo un tema completo
  (pillar + cluster).
- **Intención de búsqueda** — informacional / comercial / transaccional / navegacional.
- **Canibalización** — dos URLs compitiendo por la misma intención.
- **Content decay** — pérdida gradual de tráfico/posición con el tiempo.
- **NAP** — Name, Address, Phone; consistencia clave en local SEO.
- **hreflang** — atributo que indica versión por idioma/región.
- **Crawl budget** — recursos que un buscador dedica a rastrear un sitio.
- **SERP** — *Search Engine Results Page*. **SERP features** — rich snippets, PAA, local
  pack, image/video packs, sitelinks, AI Overview.

## 7. Competitivo y de negocio

- **Citation gap / Citation gap analysis** — no solo si te citan, sino *por qué citaron a
  tu competidor en tu lugar*.
- **Source attribution / Sources panel** — qué dominios y fuentes alimentan la respuesta
  generada.
- **Category ownership** — cuánto "posees" tu categoría en las respuestas de IA (vs.
  aparecer fragmentado).
- **Competitive share of voice** — tu SOV medido contra rivales nombrados.
- **Agentic / Agent-ready / Agent Experience (AXP) / Agentic commerce** — si un agente de
  IA puede comparar, reservar o comprar en tu sitio sin fricción. (Readiness agéntica:
  cross-skill `webmcp` + `efeonce/EFEONCE_AGENTIC_READINESS_FRAMEWORK.md`.)
- **Revenue intent coverage** — si apareces en preguntas de compra e implementación, no
  solo informativas.

## 8. Producto Greenhouse (caso Efeonce)

De este léxico, el **AI Visibility Grader** de Greenhouse ya produce directamente:
**AI Visibility Score · Share of Voice · Citability + mapa de citas y riesgo de dependencia
(citation gap / source attribution) · Sentiment · Entity Clarity · Category Ownership ·
Competitive Share of Voice · Revenue Intent Coverage · capa agéntica (operabilidad /
agent-ready).**

- **AI Visibility Grader** — lead magnet público de Efeonce que puntúa cómo los answer
  engines representan una marca. Versión productizada de la medición de Share of Voice IA.
- **AI Visibility Snapshot** — artefacto corto de ventas derivado del grader.
- **Surround Discovery Audit** — frame propietario interno / diagnóstico pagado; la
  capacidad durable más allá de la sigla AEO.
- **Greenhouse AI Visibility Monitor** — futura superficie recurrente de cliente.
- **Dominio `growth`** — dominio Greenhouse dueño de la inteligencia de adquisición /
  diagnóstico pre-pipeline (esquema `greenhouse_growth`, prefijo `growth.ai_visibility.*`).
  Distinto de `commercial` (revenue cualificado). Ver `efeonce/AI_VISIBILITY_GRADER.md`.

## 9. Fuera de alcance v1 (mencionados, no cubiertos a fondo)

- **E-commerce SEO profundo** (faceted nav a escala, feeds de producto).
- **ASO** — *App Store Optimization* (otra disciplina).
- **Voice search** como tema aparte — absorbido en AEO (consultas conversacionales).
