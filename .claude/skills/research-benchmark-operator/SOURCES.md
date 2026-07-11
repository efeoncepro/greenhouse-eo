# Fuentes y Tendencias 2026 — research-benchmark-operator

> **Regla:** el research/benchmark se mueve rápido. **Reverifica SIEMPRE** con WebSearch/WebFetch y cita `as-of`. Lo de abajo fue verificado vía web **as-of 2026-07**; trátalo como snapshot, no como verdad congelada.

## Tendencias 2026 verificadas (as-of 2026-07)

### AI research agéntico + inteligencia competitiva
- Los agentes de IA mueven el research de "prompt a prompt" a **ejecución goal-driven**; Gartner proyecta ~40% de apps enterprise con agentes task-specific a fin de 2026 (vs <5% en 2025). BCG estima que agentes aceleran procesos 30–50%. (Ampcome, Greenbook, OpenDataScience, IBM, OneReach/McKinsey/Omdia citados.)
- **Gap de gobernanza:** solo ~21% de las empresas tienen gobernanza madura de agentic AI (Deloitte) → el cuello de botella es el despliegue controlado, no el modelo.
- **CI en tiempo real:** la inteligencia decae rápido (pricing, job posts, patentes, sentiment se mueven antes que los reportes).

### Research sintético
- Entrevistas AI-moderadas / synthetic users escalan el cualitativo (p. ej. Outset: cientos de entrevistas simultáneas). **NN/g:** dan feedback más rápido a escala **pero no reemplazan** la entrevista humana profunda. Trátalo como hipótesis a validar.

### Rigor / alucinación (crítico)
- Herramientas de research IA **alucinan 17–33% de las citas**; validación multicapa → <1%. RAG + screening riguroso reduce alucinación ~71% (Stanford 2026). "Extended thinking" ~halved la tasa en varios modelos. La verificación es un **requisito estructural**. Incluso papers peer-reviewed tuvieron ~1% de citas alucinadas (NeurIPS 2025). (INRA.AI, arXiv claim-level auditability, GPTZero/ICLR 2026, DigitalApplied.)

### AI Search Visibility / Share of Voice (benchmark)
- **AI SoV = (citas de marca ÷ total de la categoría) × 100.** Subtipos: share of answer / citation / mention.
- Diferencias enormes por motor (tracker de 8.400 prompts): un motor citó marca en ~84% de respuestas, otro en ~58%; misma marca 22% vs 6% de share la misma semana → **benchmarkea por motor**.
- Ganar una cita en AI Overview/LLM se asoció a ~23% de lift en búsqueda de marca a 30 días. Semrush 2026 AI Visibility Index (126M prompts): solo 36 de 1.200 marcas consistentes en todos los motores. Herramientas: LLM Pulse, Semrush AI Visibility, etc. (LLM Pulse, GrowthOS, Visionary Marketing, DigitalApplied, Semrush.)

### Benchmarking metodología (fundacional + 2026)
- Framework primero (blueprint de consistencia). **Peer set: 6–12 pares que el cliente cross-shop + 1–3 best-in-class;** NAICS 4 dígitos > 2 para grupos limpios. **Normalizar** (moneda, estacionalidad, mix, definiciones; unidades comparables). 5–8 métricas primarias. Ubicar vs **mediana y top quartile**; descomponer gaps en drivers → iniciativas con owner/timeline. (Companysights, VantaInsights, Brandwatch, Umbrex, Ivalua.)

## Bases fundacionales (estables, validar aplicación)

- **Métodos de research:** primario/secundario, cuali/cuanti, exploratorio/concluyente; diseño de encuesta y muestreo; entrevistas cualitativas.
- **Frameworks:** TAM/SAM/SOM, PESTEL, Porter (5 fuerzas), JTBD (Christensen), VoC, personas basadas en evidencia.
- **Credibilidad:** CRAAP; triangulación; control de sesgo (confirmación, disponibilidad, autoselección).
- **Benchmarking:** ciclo de benchmarking, análisis de brechas, best-practice benchmarking.
- **CI:** ciclo de inteligencia (planificar→recolectar→analizar→diseminar), KITs, win-loss, war-gaming; ética CI (SCIP-style).

## Fuentes vecinas dentro del repo (alinear, no duplicar)

- `deep-research` (harness) — el motor de ejecución.
- `seo-aeo` — búsqueda/keywords + AI Visibility Grader (benchmark AEO).
- `commercial-expert` — win-loss, battlecards, ICP, sizing GTM.
- `content-marketing-studio` — trend/topic research → data study; SOURCES con benchmarks.
- `digital-marketing` — benchmarks de canal/performance; SOURCES.
- `dataviz` / `dataviz-design` — visualización.
- `efeonce-agency` + `docs/context/` — negocio, ICP, casos, métricas (`06_glosario-metricas`).
- `greenhouse-ico` — métricas de delivery internas.
- `legal-privacy-ip-operator` — privacidad al recolectar datos personales; publicidad comparativa.

## Herramientas de verificación

- **WebSearch / WebFetch** — el paso 2026 obligatorio.
- **`deep-research`** — verificación adversarial para claims críticos.
- **MCP (si el entorno los expone):** Semrush, HubSpot, BigQuery, Notion.
- **Honestidad:** si no puedes verificar, dilo y baja el confidence. Nunca un benchmark de mercado como resultado propio.
