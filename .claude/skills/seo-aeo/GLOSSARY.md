# GLOSSARY — Vocabulario SEO + AEO/GEO (2026)

> Léxico técnico canónico de la categoría de visibilidad de marca en motores de
> respuesta + SEO clásico. Sirve para diagnóstico, copy, FAQ, schema y para hablar
> la categoría con precisión. El vocabulario de este espacio colisiona y muta
> rápido; reverifica lo volátil (ver `SOURCES.md`). Sello: as-of 2026-09.
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
  a esto; usa la nomenclatura actual.
- **AI Overviews (AIO)** — respuesta generada en Google Search con enlaces de apoyo;
  elegibilidad y controles según la documentación vigente de Google.
- **AI Mode** — experiencia conversacional de Google Search. Google documenta que
  puede usar ramificación de consultas; su mecánica y respuestas pueden diferir de AIO.
- **ChatGPT Search** — superficie de búsqueda web de OpenAI. `OAI-SearchBot` controla
  descubrimiento en Search; `ChatGPT-User` corresponde a ciertas acciones iniciadas
  por usuarios y no determina inclusión en Search.
- **Claude Search** — búsqueda de Anthropic cuando está disponible en el producto
  utilizado. Distingue `Claude-SearchBot` de `Claude-User` y `ClaudeBot`.
- **Perplexity** — búsqueda de Perplexity; distingue `PerplexityBot` de
  `Perplexity-User` y de cualquier crawler de entrenamiento de terceros.
- **Gemini** — IA de Google; integra Knowledge Graph + ecosistema Google.
- **Copilot** — IA de Microsoft sobre índice de **Bing**.
- **Answer box / Featured snippet** — el antecesor "una sola fuente" del extracto
  mostrado arriba de los resultados.
- **Zero-click** — la sesión de búsqueda termina **sin clic** al sitio; el usuario se
  queda con la respuesta (65% en 2026; 83% con AI Overview).

## 3. Métricas (lo que se mide) — el núcleo

- **AI Visibility Score** — número compuesto definido por un proveedor o metodología;
  no existe una escala estándar comparable entre herramientas.
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
- **Index freshness** — recencia del rastreo/indexación observada o documentada para
  una plataforma y URL. No atribuyas una cadencia fija al motor sin evidencia actual.

## 4. Contenido: cómo se gana la cita

- **Extractability / Extractable content** — qué tan fácil es "levantar" un bloque limpio
  y atribuible de tu página.
- **Retrievability** — qué tan fácil es que el sistema recupere tu página en tiempo de
  consulta.
- **Atomic answer** — la unidad mínima citable: una afirmación limpia y autocontenida que
  funciona fuera de contexto.
- **BLUF (Bottom Line Up Front) / Answer-first** — patrón de redacción que pone la
  conclusión en la primera frase o párrafo.
- **Direct answer / Answer capsule** — respuesta directa y contextual cuando
  sirve al lector. No tiene longitud fija ni es requisito universal de cita
  (`04_AEO_GEO.md`).
- **AI snippet** — extracto corto que un motor cita textualmente dentro de su respuesta.
- **Passage / Passage retrieval** — algunos sistemas recuperan o presentan pasajes;
  no asumir que todos lo hacen igual ni que la cita se decide solo a ese nivel.
- **Chunk / Chunking** — división de documentos en fragmentos usada por algunos
  sistemas de recuperación. Tamaño, solapamiento y método dependen de la
  implementación y normalmente no son configurables por quien publica. Google
  dice que no hace falta fragmentar páginas para sus funciones de IA.
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

- **RAG (Retrieval-Augmented Generation)** — patrón arquitectónico que recupera
  fuentes y las aporta como contexto a la generación. No es una descripción
  confirmada de todos los modos de todos los productos.
- **Grounding** — anclar la salida del modelo a fuentes reales (así lo llama Google). Es
  el reverso de la alucinación.
- **Hallucination** — salida del modelo confiada pero falsa o no respaldada por las
  fuentes recuperadas; se mitiga (no se elimina) con grounding.
- **Embeddings / Vector retrieval** — representación semántica del texto que permite
  recuperar por **significado**, no solo por keyword match.
- **Reranker / ColBERT** — modelos que reordenan por relevancia el set inicial recuperado
  (infraestructura de retrieval).
- **Query fan-out / ramificación de consultas** — técnica que descompone una
  consulta en búsquedas relacionadas. Google documenta su uso posible en AI
  Overviews y AI Mode; no publica un número universal ni establece que otros
  productos compartan su implementación.
- **Structured data / Schema.org** — marcado semántico (FAQ, HowTo, Service, DefinedTerm,
  Organization) que hace el contenido legible por máquina (`01_SEO_TECHNICAL.md`).
- **Entity / Entity clarity / Entity home / Entity disambiguation / sameAs** — que el motor
  entienda "quién eres" como entidad y no te confunda con otra (nombres consistentes,
  schema, `sameAs`). Base del razonamiento entidad-céntrico 2026 (`03_EEAT_ENTITY.md`).
- **AI crawlers** — identifica cada agente por proveedor y finalidad documentada:
  entrenamiento/desarrollo, búsqueda/indexación o acceso iniciado por usuario.
  No agrupes `ClaudeBot` con `Claude-SearchBot`, ni `Google-Extended` con
  Googlebot. Ver `01_SEO_TECHNICAL.md` y `SOURCES.md`.
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
- ~~**ASO**~~ — salió de esta lista el 2026-09-10: ahora es superficie adyacente, ver §10 y
  `modules/10_ASO_APP_DISCOVERY.md`.
- **Voice search** como tema aparte — absorbido en AEO (consultas conversacionales).

## 10. Tiendas de apps (ASO) — delta 2026-09-10

- **ASO** — *App Store Optimization*. Visibilidad y conversión de una app dentro de App Store y
  Google Play. Desde 2025-26 incluye el descubrimiento por IA dentro y fuera de la tienda.
- **Ficha** — *product page* (Apple) o *store listing* (Google). La página de la app en la tienda.
- **Campo de keywords** — 100 caracteres ocultos al usuario, separados por coma sin espacios.
  Solo existe en Apple; Google Play no tiene campo equivalente e indexa la descripción larga.
- **App Store tags** — etiquetas que Apple muestra en los resultados de búsqueda, generadas con
  LLM a partir de la metadata cargada en App Store Connect.
- **CPP** — *Custom Product Page* (Apple). Hasta 70 versiones alternativas de la ficha, con deep
  link propio. Se les pueden asignar keywords para que aparezcan en la búsqueda orgánica.
- **CSL** — *Custom Store Listing* (Google Play). Ficha alternativa por país, estado del usuario,
  campaña o keyword.
- **PPO** — *Product Page Optimization* (Apple). A/B test nativo de la ficha por defecto.
- **Store Listing Experiments** — el equivalente de Google Play.
- **Personalized Collections / App Notes** — recomendaciones personalizadas de Apple en las
  pestañas Apps, Games y Search (WWDC 2026). Cada una trae una nota que explica por qué se sugiere.
- **Ask Play** — chat con Gemini dentro de Google Play (I/O 2026) que responde preguntas sobre las
  apps y muestra resúmenes (*Ask Play highlights*) en los resultados. Es el AI Overview de la tienda.
- **App Intents** — framework de Apple con el que la app declara acciones y entidades que Siri,
  Spotlight, Shortcuts y widgets pueden descubrir y ejecutar sin abrir la app.
- **Engage SDK** — SDK de Google que lleva contenido de la app a superficies de Android fuera de la
  app (y, desde 2026, a la ficha para usuarios existentes).
- **Source type** — fuente de adquisición que reporta la tienda: App Store Search, App Store Browse,
  App Referrer, Web Referrer y App Clips en Apple; Search, Explore, Google Search, Google Ads, UTM y
  referidos de terceros en Google Play.
