# GLOSSARY — Vocabulario SEO + AEO/GEO (2026)

> El vocabulario de este espacio colisiona y muta rápido. Esta es la referencia
> canónica de la skill. Sello: as-of 2026-06.

## Acrónimos del espacio "optimización para IA" (todos se solapan)
- **AEO** — *Answer Engine Optimization*. Optimizar para ser **la respuesta
  directa** en motores de respuesta. Énfasis: responder.
- **GEO** — *Generative Engine Optimization*. Optimizar para ser **citado/
  incluido** en respuestas generativas. Énfasis: ser fuente de la síntesis.
  (Término del paper Princeton/GaTech/Allen AI/IIT Delhi, KDD 2024.)
- **LLMO** — *LLM Optimization*. Sinónimo informal de lo anterior.
- **AI SEO / AI visibility / Search Everywhere Optimization** — etiquetas
  comerciales del mismo campo.
- **En esta skill:** los tratamos como un continuo. Lo que importa no es la sigla
  sino el motor concreto y la mecánica (recuperación + citabilidad).

## Motores y features
- **SGE** — *Search Generative Experience*. Nombre **viejo** (2023–24) del
  experimento de Google. Sustituido por "AI Overviews" + "AI Mode". Si alguien
  dice SGE, se refiere a esto; usa la nomenclatura actual.
- **AI Overviews (AIO)** — el bloque de respuesta IA *arriba* de la SERP de
  Google. Usa Googlebot + índice de Google. ~48–50% de queries (2026).
- **AI Mode** — modo conversacional dedicado de Google Search (pestaña/experiencia
  aparte) que usa **Query Fan-Out** de forma intensiva.
- **ChatGPT Search** — búsqueda de OpenAI (bots `OAI-SearchBot` + `ChatGPT-User`).
- **Perplexity** — answer engine con citas explícitas (bot `PerplexityBot`).
- **Gemini** — IA de Google, integra Knowledge Graph + ecosistema Google.
- **Copilot** — IA de Microsoft sobre índice de **Bing**.

## Mecánica IA
- **Query Fan-Out** — descomposición de una query en N sub-queries simultáneas
  para recuperar y sintetizar. Google lo llama internamente **"Scatter-Gather
  with Planning"**. 8–12 sub-queries típicas.
- **RAG** — *Retrieval-Augmented Generation*. El modelo recupera documentos y
  genera la respuesta sobre ellos (vs. solo memoria de entrenamiento).
- **Embeddings / vector search** — representación numérica del significado;
  permite recuperar pasajes por *similitud semántica*, no solo keyword match.
- **Chunk / passage** — fragmento de contenido que el motor recupera y cita. Se
  optimiza para que cada chunk sea autocontenido (`04_AEO_GEO.md`).
- **Answer capsule** — respuesta directa de 40–60 palabras bajo un H2; patrón de
  alta citabilidad.
- **Citation share / Share of Voice IA** — métricas de presencia/citas de marca
  en respuestas IA vs. competidores (`07_MEASUREMENT.md`).
- **Training bot vs retrieval bot** — bots que recolectan para *entrenar*
  (GPTBot, ClaudeBot, Google-Extended) vs. los que *fetch* en vivo para responder
  (OAI-SearchBot, PerplexityBot) (`01_SEO_TECHNICAL.md`).
- **llms.txt** — archivo markdown propuesto para "resumir" un sitio a LLMs.
  Google no lo usa; ROI marginal en 2026 (`04_AEO_GEO.md`).

## SEO clásico
- **E-E-A-T** — Experience, Expertise, Authoritativeness, Trust. Marco de calidad
  de las Quality Rater Guidelines (`03_EEAT_ENTITY.md`).
- **YMYL** — *Your Money or Your Life*. Contenido de alto impacto (salud,
  finanzas, seguridad) con listón de calidad elevado.
- **Core Web Vitals (CWV)** — LCP (≤2.5s), INP (≤200ms, reemplazó FID en 2024),
  CLS (≤0.1). Datos de campo vía **CrUX**.
- **Entidad / Knowledge Graph** — "cosa" del mundo con identidad propia que los
  motores reconocen; base del razonamiento entidad-céntrico 2026.
- **Topical authority** — autoridad temática que se gana cubriendo un tema
  completo (pillar + cluster).
- **Intención de búsqueda** — informacional / comercial / transaccional /
  navegacional.
- **Canibalización** — dos URLs compitiendo por la misma intención.
- **Content decay** — pérdida gradual de tráfico/posición con el tiempo.
- **NAP** — Name, Address, Phone; consistencia clave en local SEO.
- **hreflang** — atributo que indica versión por idioma/región.
- **Crawl budget** — recursos que un buscador dedica a rastrear un sitio.
- **SERP** — *Search Engine Results Page*. **SERP features** — rich snippets,
  PAA, local pack, image/video packs, sitelinks, AI Overview.
- **Zero-click** — búsqueda que termina sin click a un sitio externo (65% en
  2026; 83% con AI Overview).

## Producto Greenhouse (caso Efeonce)
- **AI Visibility Grader** — lead magnet público de Efeonce que puntúa cómo los
  answer engines representan una marca. Versión productizada de la medición de
  Share of Voice IA de esta skill.
- **AI Visibility Snapshot** — artefacto corto de ventas derivado del grader.
- **Surround Discovery Audit** — frame propietario interno / diagnóstico pagado;
  la capacidad durable más allá de la sigla AEO.
- **Greenhouse AI Visibility Monitor** — futura superficie recurrente de cliente.
- **Dominio `growth`** — dominio Greenhouse dueño de la inteligencia de
  adquisición / diagnóstico pre-pipeline (esquema `greenhouse_growth`, prefijo
  `growth.ai_visibility.*`). Distinto de `commercial` (revenue cualificado). Ver
  `efeonce/AI_VISIBILITY_GRADER.md`.

## Fuera de alcance v1 (mencionados, no cubiertos a fondo)
- **E-commerce SEO profundo** (faceted nav a escala, feeds de producto).
- **ASO** — *App Store Optimization* (otra disciplina).
- **Voice search** como tema aparte — absorbido en AEO (consultas conversacionales).
