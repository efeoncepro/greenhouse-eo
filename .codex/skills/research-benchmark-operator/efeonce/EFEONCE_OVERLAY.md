# Overlay Efeonce — research & benchmark en el negocio real

La skill es genérica y reutilizable, pero Efeonce tiene fuentes, un producto de benchmark real y una doble audiencia concretos. Este overlay los ancla. La doctrina de negocio/ICP/casos vive en `efeonce-agency` + `docs/context/`; acá se **usa**, no se inventa.

## Doble audiencia (recordatorio)

- **Para Efeonce (interno):** pitch, GTM, inteligencia competitiva vs. otras agencias, decisiones de servicio/pricing, tendencias.
- **Para clientes (servicio billable):** benchmark competitivo, AI visibility, market research, VoC, CI continua, data studies. Aplica `./modules/11_RESEARCH_AS_A_SERVICE`.

## El producto de benchmark real: AI Visibility Grader

Efeonce ya tiene un **benchmark productizado**: el **AI Visibility Grader** (scoring AEO brand-aware — dónde te cita la IA vs. competidores). Es la materialización runtime del carril Benchmark tipo `07` (AI Share of Voice).
- **La metodología** (peer set, prompts, por-motor, subtipos de SoV) es de esta skill (`06`, `07`, `08`); el **runtime/producto** es de `seo-aeo` + su arquitectura (`GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`).
- **NUNCA** reimplementes el Grader; consúmelo/aliméntalo. Para el research de visibilidad IA de un cliente, el Grader es la herramienta; esta skill aporta el rigor metodológico y la lectura de negocio.
- **Frontera EPIC-021/EPIC-020** (brand-aware live; lead magnet): ver memoria del proyecto AEO.

## Fuentes disponibles en el ecosistema Efeonce

| Fuente | Qué da | Vía |
|---|---|---|
| **BigQuery** (`efeonce-group`) | first-party analytics, histórico, conformed | `gcp-bigquery` |
| **HubSpot** (portal 48713323) | pipeline, deals, win-loss, contactos, campañas | HubSpot MCP / bridge |
| **ICO / delivery metrics** | RpA, OTD, FTR (benchmark operacional interno) | `greenhouse-ico` |
| **Semrush** (MCP) | keywords, tráfico, competencia, AI Visibility Index | Semrush MCP |
| **AI Visibility Grader** | AI Share of Voice brand-aware | `seo-aeo` |
| **Notion** | knowledge interno como fuente | Notion MCP |
| **Prospección B2B** (Apollo, Lusha) | contactos/firmografía (¡privacidad!) | terceros → `legal-privacy-ip-operator` |

**Regla:** para lo propio, first-party (BigQuery/HubSpot/ICO) es la fuente más creíble; para el mercado, triangula con externas. Prospección con Apollo/Lusha activa deberes de privacidad (GDPR Art. 14) → `legal-privacy-ip-operator`.

## Casos y contexto (delegado)

- **ICP/segmentos, casos citables (Sky/Bresler/Berel), naming de métricas** → `efeonce-agency` + `docs/context/` (`06_glosario-metricas`, `13_icp-buyer-personas-jtbd`). (nunca usarlo como prueba).
- **Business lines (Globe/Reach/Wave/Digital)** para segmentar research por unidad → `efeonce-agency`.

## Research/benchmark como diferenciador comercial

El research/benchmark riguroso posiciona a Efeonce como **partner estratégico**, no solo ejecutor — y suele **abrir la puerta** a un engagement mayor (el gap revelado justifica el servicio que lo cierra). Encájalo en el modelo comercial (proyecto/retainer) con `commercial-expert`. El AI Visibility benchmark es la punta de lanza (ties al Grader como lead magnet / servicio AEO).

## Baseline competitivo real de Efeonce (caso vivo — 2026)

El primer benchmark/CI real producido con esta skill es el **baseline competitivo de la agencia**: análisis del **Barómetro del Marketing Chileno 2026 (La Vulca)** + panorama de competidores en Chile + gap analysis + ruta para entrar al ranking. **SSOT:** `docs/context/15_panorama-competitivo-benchmark-industria.md`. Es el baseline vivo para mejorar la agencia — **actualízalo** (paso 2026: re-WebSearch competidores + pedir el informe completo a La Vulca) cuando se corra una nueva ola o cambie el mercado.

Aprendizajes canónicos de ese caso (aplican a futuros benchmarks de industria):
- Rankings tipo Barómetro son **recall + rating** (percepción), no postulación → entrar es un juego de **notoriedad/prensa gremial/participación**, no de "subir tu agencia a una lista".
- Los "rankings de mejores agencias" que circulan en la web suelen ser **auto-publicados** por las propias agencias (se auto-rankean #1) → válidos como **set competitivo**, no como jerarquía objetiva. Márcalos con esa salvedad.
- Efeonce compite **full-stack** (Paid Media, CRO, Marketing de Contenidos, SEO/AEO, performance, CRM) como sistema integrado (Growth OS); su ventaja es la **integración**, no un servicio suelto.
- Hallazgo CI reutilizable: los competidores ganan visibilidad **dominando su propio SERP de categoría** con contenido de autoridad; medir la ausencia/presencia ahí es un benchmark en sí (ties `07` AI SoV + `seo-aeo`).

## Reglas duras del overlay

- **NUNCA** reimplementar el AI Visibility Grader ni el harness `deep-research`.
- **NUNCA** citar de memoria: paso 2026 (WebSearch + `as-of`) obligatorio; verificar contra fuente primaria.
- **NUNCA** hardcodear un ICP único (múltiples segmentos → `efeonce-agency`).
- **NUNCA** reusar CI/research de un cliente para otro (conflicto de interés); confidencialidad por cliente (`11`).
- **NUNCA** recolectar datos personales (Apollo/Lusha/scraping) sin cumplir `legal-privacy-ip-operator`.
- Para lo propio, priorizar first-party (BigQuery/HubSpot/ICO) sobre estimaciones externas.

## Cross-links

- Método → `./modules/01`–`11`; AI SoV → `./modules/07`; CI → `./modules/10`; servicio a cliente → `./modules/11`.
- Grader/AEO → `seo-aeo`; datos → `gcp-bigquery`/`greenhouse-ico`/HubSpot; comercial → `commercial-expert`; privacidad → `legal-privacy-ip-operator`; visual → `dataviz`; negocio/ICP → `efeonce-agency`.
