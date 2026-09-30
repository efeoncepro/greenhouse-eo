---
name: seo-aeo
description: >-
  Skill operativa de SEO + AEO/GEO para diagnosticar, priorizar y ejecutar
  búsqueda orgánica y visibilidad en motores de respuesta IA. Cubre crawl e
  indexación, Core Web Vitals, schema/JSON-LD, contenido, topical authority,
  E-E-A-T, entidades, citabilidad, AI Overviews/AI Mode, ChatGPT, Claude,
  Perplexity, Gemini y Copilot, off-page, local/internacional, YMYL,
  GSC/GA4/BigQuery, auditorías, migraciones y recovery; también briefs,
  metadata, canonical/robots, publicación y QA live en WordPress/Kinsta.
  Incluye ASO y descubrimiento de apps. Triggers: SEO, AEO, GEO, LLMO,
  knowledge graph, llms.txt, backlinks, hreflang, tráfico orgánico, DataForSEO,
  keyword mining, SERP research, Semrush, GSC, ASO, App Store y Google Play.
---

# SEO + AEO/GEO — Skill operativa 2026

> **Naming Efeonce (2026-09-29):** **Efeonce AEO** = capacidad; **Efeonce AEO Assessment** = diagnóstico público; **Efeonce AI Visibility Report** = informe compartible. **Search Visibility 360** conserva la oferta amplia SEO + AEO. `AI Visibility Grader`, `Brand Visibility Grader` y `AEO Grader` son aliases técnicos/históricos para encontrar motor, rutas y contratos. Canon: `docs/architecture/EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md`; detalle técnico: `efeonce/AI_VISIBILITY_GRADER.md`.
>
> **Submarcas de producto con logo (2026-09-29):** **Efeonce | SV360**, **Efeonce | AEO**, **Efeonce | AEO Assessment** y **Efeonce | AI Visibility Report** son submarcas de producto de Efeonce con logos oficiales en `@efeoncepro/axis-brand-assets` 0.4.2 (publicado el 2026-09-29); acompañan a Efeonce y nunca firman solas. Referencia visual: Lab de AXIS `https://axis.efeonce.org/references/seo-aeo/` (publicados el 2026-09-29; responden 200). ADR de naming §Delta 2026-09-29; uso visual en la skill `efeonce-graphic-line`.
>
> **Canon visual del AI Visibility Report (AXIS `v0.3.30`, 2026-09-29):** el PDF vive en AXIS: página `https://axis.efeonce.org/references/ai-visibility-report/` y contrato `efeonce.ai-visibility-report` 0.1.0 (`candidate`). La órbita de la portada muestra la gravedad del puntaje (estela y esfera en el color del nivel, con etiqueta y escala visibles; sin dato, «—», nunca 0); los umbrales los pone el motor del Assessment. Greenhouse lo adopta con TASK-1938.

> **Qué es esto.** Una skill de dos manos: **(1) conocimiento experto** del
> dominio búsqueda+IA al estado del arte 2026, y **(2) capacidad de ejecución**
> (auditar con Semrush MCP si está disponible, verificar frescura con browsing
> Codex/WebSearch-WebFetch según el entorno, generar
> artefactos: JSON-LD, `llms.txt`, briefs, checklists). No es un volcado de
> teoría: **diagnostica antes de prescribir** y **prioriza por impacto**.

> **Sello de frescura.** Núcleo verificado **as-of 2026-06**. Este dominio se
> mueve cada trimestre. Antes de afirmar algo volátil (estado de AI Mode,
> cobertura de AI Overviews, umbrales CWV, qué bots existen, qué herramienta
> lidera), **reverifica con browsing Codex/WebSearch**. Ver `SOURCES.md` para niveles de
> volatilidad por tema.

> **Delta 2026-09-10 — ASO entra como superficie adyacente.** Las tiendas de apps se
> volvieron motores de respuesta (Ask Play, App Store tags generadas por LLM,
> Personalized Collections con App Notes). Módulo nuevo: `modules/10_ASO_APP_DISCOVERY.md`.
> Cómo se vende y empaqueta: skill `seo-aeo-practice`.

---

## 0. Cómo se usa esta skill (orden obligatorio)

1. **Diagnostica primero.** Nunca prescribas una lista genérica. Corre el
   **intake** (§2). Sin contexto (sitio, vertical, motor objetivo, estado
   actual, objetivo de negocio) la recomendación es ruido.
2. **Carga solo el módulo que aplica.** Esta skill es un router. Los módulos
   (`modules/*.md`) son load-on-demand. No los leas todos; abre el que el
   problema exige (mapa en §3).
3. **Prioriza.** Toda recomendación sale ordenada por **RICE** (§4), no como
   backlog plano. El operador quiere saber _qué hacer primero_.
4. **Verifica lo volátil.** Si vas a citar un dato 2026 (cifra, umbral, feature
   de un motor), pásalo por browsing Codex/WebSearch antes de escribirlo como hecho.
5. **Respeta los guardrails.** Antes de recomendar cualquier táctica agresiva,
   contrástala con `ANTIPATTERNS.md`. Greenhouse/Efeonce no hace black-hat.
6. **Cierra con medición.** Ninguna recomendación está completa sin decir _cómo
   se mide el resultado_ (`modules/07_MEASUREMENT.md`).
7. **Si entregas una auditoría al cliente**, carga `modules/09_CLIENT_AUDIT_REPORTING.md`
   antes de redactar: continuidad histórica, responsabilidad de la agencia, validez
   de las fuentes y lectura de vuelta del entregable forman parte del cierre.
8. **Si necesitas datos de mercado o superficies AI**, carga también la skill
   `dataforseo-operator` y usa `pnpm dataforseo`; no llames la API del proveedor,
   `curl` ni un SDK paralelo. El [manual de uso](../../../docs/manual-de-uso/growth/dataforseo-cli.md)
   explica los comandos y la [decisión técnica](../../../docs/architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md)
   gobierna transporte, allowlist, costos y lifecycle.

### SEO/AEO como competencia de selección

Cuando SEO/AEO se evalúa como parte de una contratación, esta skill aporta el oficio y la evidencia técnica; la
dueña del proceso es `greenhouse-talent-people-operator`. Carga `../greenhouse-talent-people-operator/references/assessment-interviewing.md`
y `../greenhouse-talent-people-operator/references/greenhouse-runtime.md` para diseñar, versionar y vincular el
instrumento. Evalúa razonamiento y trabajo observable con casos ficticios o autorizados: no uses promesas
comerciales, rankings inventados, datos de clientes ni acceso a herramientas de pago como proxy de seniority. El
resultado es advisory y la decisión permanece humana.

---

## 1. Modelo mental: SEO y AEO no son dos juegos, son tres capas

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 3 — AEO / GEO  (motores de respuesta: AI Overviews,    │
│           AI Mode, ChatGPT, Perplexity, Gemini, Copilot)      │
│           Objetivo: ser RECUPERADO y CITADO en la respuesta.  │
├─────────────────────────────────────────────────────────────┤
│  CAPA 2 — SEO clásico (Google/Bing 10 enlaces azules + SERP   │
│           features). Objetivo: RANKEAR y ganar el click.      │
├─────────────────────────────────────────────────────────────┤
│  CAPA 1 — FUNDAMENTOS compartidos: rastreabilidad, contenido  │
│           útil, entidad/autoridad, datos estructurados,       │
│           experiencia de página. Alimenta a las 3 capas.      │
└─────────────────────────────────────────────────────────────┘
```

**Tesis operativa:** gran parte del trabajo técnico y editorial beneficia a más
de una superficie, pero no hay un pipeline ni conjunto de señales universal
para Google, ChatGPT, Claude y Perplexity. AEO **no reemplaza** SEO: amplía el
trabajo de descubrimiento y presencia. Recuperación, crawlers, citas y medición
se verifican por plataforma; `04_AEO_GEO.md` separa evidencia primaria,
estudios externos e hipótesis de trabajo.

**Las tiendas de apps repiten las tres capas (delta 2026-09-10).** Fundamentos compartidos
(la misma entidad en la web, la ficha y las reseñas) · ASO clásico (rankear en la búsqueda de
la tienda y convertir la ficha) · descubrimiento por IA (Ask Play, Gemini, Personalized
Collections, Siri/Spotlight). Para un cliente con app, la tienda es una superficie más del
mismo trabajo, no otra disciplina → `modules/10_ASO_APP_DISCOVERY.md`.

**Por qué importa ahora (data verificada 2026-06):**

- AI Overviews aparecen en ~**48–50%** de las búsquedas en Google (Mar 2026).
- **65%** de las búsquedas terminan sin click; **83%** cuando hay AI Overview.
- Pero las marcas **citadas dentro** del AI Overview ganan ~**35% más** clicks
  orgánicos que el #1 orgánico debajo de la respuesta. → El juego pasó de
  "rankear #1" a "ser la fuente citada".
- Solo **~11%** de los dominios citados se solapan entre ChatGPT y Perplexity
  (sobre 680M citas). → No hay un único "AEO". Cada motor es un canal.

---

## 2. Intake diagnóstico (correr SIEMPRE antes de recomendar)

Si el operador no dio estos datos, pregúntalos o asume el caso Efeonce y
decláralo. Ramifica la recomendación según las respuestas.

| #   | Pregunta                                                                                                | Por qué cambia la recomendación                                                         |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | **¿Qué motor objetivo?** Google orgánico / AI Overviews-AI Mode / ChatGPT / Perplexity / Gemini / todos | Cada motor cita fuentes distintas (Wikipedia vs Reddit vs YouTube). Define el playbook. |
| 2   | **¿Qué vertical?** YMYL (finanzas/salud/legal) vs no-YMYL                                               | YMYL exige un listón E-E-A-T mucho más alto → `03_EEAT_ENTITY.md`.                      |
| 3   | **¿Tamaño/tipo de sitio?** Brochure / blog / SaaS / e-commerce / marketplace / multisitio               | Define si el cuello es técnico (crawl budget), contenido o autoridad.                   |
| 4   | **¿Estado actual?** ¿Indexado? ¿Penalización/caída? ¿Sitio nuevo? ¿Migración?                           | Recovery, lanzamiento y crecimiento son playbooks distintos (`08_PLAYBOOKS.md`).        |
| 5   | **¿Geografía/idioma?** Un país / multirregión / multilingüe                                             | Activa `06_LOCAL_INTERNATIONAL.md` (hreflang, ccTLD, localización).                     |
| 6   | **¿Objetivo de negocio?** Tráfico / leads / ventas / brand / share of voice IA                          | SEO no termina en tráfico. Ata al embudo (HubSpot en overlay Efeonce).                  |
| 7   | **¿Qué datos/herramientas hay?** GSC, GA4, Semrush, BigQuery, herramienta SoV IA                        | Define qué se puede medir y auditar de verdad vs. estimar.                              |
| 8   | **¿Recursos?** ¿Hay dev? ¿Equipo de contenido? ¿Presupuesto de PR?                                      | RICE realista: no recomiendes digital PR si no hay quién lo ejecute.                    |

**Salida del intake:** un párrafo de "lectura del caso" + el/los módulos a cargar

- los 3–5 movimientos priorizados. Nunca saltes directo a tácticas.

---

## 3. Mapa de módulos (load-on-demand)

| Si el problema es…                                                                                                                                                                                                                                                                                          | Carga                                                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rastreo, indexación, velocidad (CWV), JSON-LD, sitemaps, render JS, **crawlers IA**                                                                                                                                                                                                                         | `modules/01_SEO_TECHNICAL.md`                                                                                                                                                                                                                     |
| Home/landing: title, metadescripción, OG/Twitter, grafo existente, scope página/global y cierre con evidencia                                                                                                                                                                                               | `references/home-landing-metadata-schema.md` + `modules/01_SEO_TECHNICAL.md`; WordPress se ejecuta con su skill dueña                                                                                                                             |
| 404, búsqueda interna, categorías/tags/autor/fecha, paginación imposible y archivos vacíos                                                                                                                                                                                                                  | `modules/01_SEO_TECHNICAL.md` §Superficies especiales; en WordPress carga `../efeonce-public-site-wordpress/references/miscellaneous-surfaces.md`                                                                                                 |
| Intent, topical authority, pillar/cluster, programmatic, decay, canibalización                                                                                                                                                                                                                              | `modules/02_SEO_CONTENT.md`                                                                                                                                                                                                                       |
| Cobertura por categorías y prioridad de negocio antes de minar                                                                                                                                                                                                                                              | `modules/02_SEO_CONTENT.md` + `docs/operations/SEO_EDITORIAL_PRIORITIZATION_OPERATING_MODEL_V1.md` §2.3; para Berel, `berel-content-production/modules/14_PLANEACION_TEMATICA_Y_COBERTURA.md`                                                     |
| Confianza/autoridad de marca y autor, **entidad/Knowledge Graph**, YMYL; **autoría institucional** (`Organization`) cuando el cliente no quiere que firme una persona                                                                                                                                       | `modules/03_EEAT_ENTITY.md`                                                                                                                                                                                                                       |
| **Pieza-hito anual** (color del año, informe, ranking, premio): cadencia propia + de mercado, ventana de publicación y **claim perecedero** con tarea de retiro; **canibalización interna** (leyendo contenido, no slugs), **estacionalidad vinculante** y **pre-emptor de tesis** antes de fijar el ángulo | `modules/02_SEO_CONTENT.md` (+ `modules/04_AEO_GEO.md` si otra marca publicó el mismo concepto: **atribución equivocada**)                                                                                                                        |
| **Entidad de marca que se repite cada año** (color del año, informe anual, ranking, premio, índice): no es pieza de calendario, es un **clúster que compone** — kit de cadencia relativa al anuncio + bidireccionalidad año N ↔ N−1                                                                        | `modules/03_EEAT_ENTITY.md` ⭐ (+ `modules/05_OFFPAGE_AUTHORITY.md` para medir si el encadenamiento existe de verdad)                                                                                                                             |
| **El canal lo opera un tercero** (otra agencia / el equipo del cliente): medición no nativa, objetivo de _cobertura de insumo entregado_ y paquete de handoff                                                                                                                                               | `modules/07_MEASUREMENT.md` + `../content-marketing-studio/modules/05_DISTRIBUTION_AMPLIFICATION.md`                                                                                                                                              |
| **Ser citado por IA**: recuperación por plataforma, consultas relacionadas, citabilidad, prompt research, llms.txt                                                                                                                                                                                          | `modules/04_AEO_GEO.md` ⭐                                                                                                                                                                                                                        |
| Backlinks, digital PR, brand SERP, menciones, **Reddit/UGC**, y **capilaridad del grafo interno** (medir sólo enlaces editoriales: descartar lo que aparece en >50% de las páginas)                                                                                                                         | `modules/05_OFFPAGE_AUTHORITY.md`                                                                                                                                                                                                                 |
| Google Business Profile / local pack, multirregión, hreflang, localización                                                                                                                                                                                                                                  | `modules/06_LOCAL_INTERNATIONAL.md`                                                                                                                                                                                                               |
| Medir resultados: GSC/GA4/BigQuery + **Share of Voice IA** + tráfico IA + exactitud                                                                                                                                                                                                                         | `modules/07_MEASUREMENT.md`                                                                                                                                                                                                                       |
| **Nuevo filtro de Search Console `Web: multimodal`** (Lens, Circle to Search, imagen subida, Chrome “Search this image”): segmentar, comparar y reportar límites de interfaz/API                                                                                                                            | `modules/07_MEASUREMENT.md` + `modules/01_SEO_TECHNICAL.md` + `references/editorial-image-seo.md` (**verificado** as-of 2026-09-24)                                                                                                               |
| **Cambio de fórmula de una métrica de terceros** (ETV/DataForSEO, Semrush Traffic u otro proxy): versionar metodología, shadow, rebaseline/breakpoint y no atribuir el salto a performance                                                                                                                  | `modules/07_MEASUREMENT.md` + skill dueña del proveedor (`dataforseo-operator` para ETV)                                                                                                                                                          |
| **Priorizar sólo con datos propios de GSC**: striking distance 8–20, curva de CTR del propio sitio, canibalización como consolidación; y **frescura real de GSC** (no hay D-1) + posición ponderada por impresiones                                                                                         | `modules/02_SEO_CONTENT.md` + `modules/07_MEASUREMENT.md` (**medido** as-of 2026-08-05)                                                                                                                                                           |
| **Los dos carriles** (empujar página existente con GSC vs. cubrir demanda nueva con volumen de terceros — no se sustituyen) + **trampas de lectura de GSC**: piso mínimo de impresiones, doble conteo por sitelinks, curva de CTR propia deprimida, largo de la serie                                       | `modules/02_SEO_CONTENT.md` + `modules/07_MEASUREMENT.md` (**medido** as-of 2026-08)                                                                                                                                                              |
| Auditoría completa, migración, recuperación de penalización/caída, lanzamiento                                                                                                                                                                                                                              | `modules/08_PLAYBOOKS.md`                                                                                                                                                                                                                         |
| Informe de auditoría para cliente, cierre mensual, continuidad de hallazgos, voz de agencia y publicación Notion + Markdown                                                                                                                                                                                 | `modules/09_CLIENT_AUDIT_REPORTING.md` + `docs/operations/SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md`                                                                                                                                   |
| Incorporar un run del Grader a un informe: pertinencia de preguntas ejecutadas, menciones espontáneas/sugeridas, score y falsos positivos de probes                                                                                                                                                         | `modules/09_CLIENT_AUDIT_REPORTING.md` + `efeonce/AI_VISIBILITY_GRADER.md`                                                                                                                                                                        |
| Qué **NO** hacer (black-hat, spam IA, riesgos)                                                                                                                                                                                                                                                              | `ANTIPATTERNS.md`                                                                                                                                                                                                                                 |
| Vocabulario (AEO vs GEO vs LLMO vs SGE vs AI Mode, etc.)                                                                                                                                                                                                                                                    | `GLOSSARY.md`                                                                                                                                                                                                                                     |
| Fuentes canónicas + qué reverificar y cada cuánto                                                                                                                                                                                                                                                           | `SOURCES.md`                                                                                                                                                                                                                                      |
| GSC API, Platform Properties, URL Inspection, sitemaps, ping o aviso de una URL nueva                                                                                                                                                                                                                       | `references/google-search-console-api-indexing.md` + `modules/01_SEO_TECHNICAL.md`                                                                                                                                                                |
| Infografías, SVG directo, `<picture>`, image SEO, ALT/caption, featured/OG y descripción larga                                                                                                                                                                                                              | `references/editorial-image-seo.md` + `modules/01_SEO_TECHNICAL.md`                                                                                                                                                                               |
| **Fórmulas y cortes de terceros** (scoring de visibilidad IA, priorización de clusters, canibalización SERP-first, gap de backlinks, auditoría de cartera, índice de visibilidad, offer bank): qué método usa la competencia y **dónde contradice lo que ya medimos**                                       | `references/competitor-methodologies-2026-09.md` ⚠️ (fórmulas ajenas **no validadas con nuestros datos**; donde hay motor propio —canibalización sobre GSC, curvas de CTR— **manda el propio**; endpoints y costos → skill `dataforseo-operator`) |
| Blogposts, pillars y guías: dossier, traducción de metadata, E-E-A-T, publicación WordPress/Think, link health y verificación live; **revisión adversarial por lentes** para campañas o rondas de comentarios del cliente                                                                                   | `references/agentic-editorial-eeat.md` + `content-marketing-studio/references/metadata-translation-method.md`                                                                                                                                     |
| Pillar Experience Efeonce: canonical, mapa de cluster, `ItemList`, enlaces y placement Think/host                                                                                                                                                                                                           | `docs/public-site/decisions/PDR-018-pillar-experience-arquitectura-editorial-y-runtime.md`; esta skill valida semántica/schema, no elige el CMS por SEO                                                                                           |
| Cluster Experience federada: nodos owned/platform-native, indexación social y medición por superficie                                                                                                                                                                                                       | Canon editorial en `../content-marketing-studio/references/content-engineering.md`; aplicar contrato de búsqueda federada abajo y reverificar plataformas                                                                                         |
| **Content Engineering**: contenido como experiencia humana + computable, sin duplicar fuentes ni esconder conocimiento                                                                                                                                                                                      | Canon editorial en `../content-marketing-studio/references/content-engineering.md`; esta skill gobierna semántica, schema, entidades, recuperación y citabilidad                                                                                  |
| **Framework + metodología propietaria Efeonce** (los 5 niveles para existir en un internet de agentes: Be Found · Readable · Correct · Actionable · Intrinsic; narrativa pública + modelo de 2 ejes del grader)                                                                                             | `efeonce/EFEONCE_AGENTIC_READINESS_FRAMEWORK.md` ⭐                                                                                                                                                                                               |
| Caso Efeonce: WordPress/Kinsta + AI Content Factory + HubSpot + ICP Globe                                                                                                                                                                                                                                   | `efeonce/EFEONCE_OVERLAY.md`                                                                                                                                                                                                                      |
| **Producto Greenhouse que operacionaliza esta skill** (AI Visibility Grader / dominio `growth`, TASK-1226/1227)                                                                                                                                                                                             | `efeonce/AI_VISIBILITY_GRADER.md`                                                                                                                                                                                                                 |
| **Radiografía AEO** (Think): muestra viva que educa y demuestra ejecución SEO/AEO sobre un hueco medido; no reemplaza al Grader                                                                                                                                                                             | `docs/think/radiografia-aeo-architecture.md` + manual comercial `docs/manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md`                                                                                                                   |
| **Tiendas de apps (ASO) y descubrimiento de apps por IA**: metadata de App Store y Google Play, creativos, Custom Product Pages / Custom Store Listings, reseñas, Ask Play, Gemini, Personalized Collections, App Intents/Spotlight, puente web↔ficha↔IA y medición por fuente de adquisición             | `modules/10_ASO_APP_DISCOVERY.md` (venta y empaquetado → skill `seo-aeo-practice`; paid de tiendas → Reach)                                                                                                                                       |
| **Web agéntica**: WebMCP, exponer tools a agentes, agentic-web _readiness_ (¿los agentes pueden _usar_ el sitio, no solo _citarlo_?), Lighthouse API programática + audit `registered-webmcp-tools`                                                                                                         | **skill `webmcp`** (cross-skill)                                                                                                                                                                                                                  |
| Artefactos listos para usar                                                                                                                                                                                                                                                                                 | `templates/` (jsonld, llms-txt, briefs, checklists)                                                                                                                                                                                               |

### Contrato de búsqueda para Cluster Experience federada

Una pieza social puede ser un search node de primera clase, pero no por su formato. Debe resolver un JTBD, entregar
valor autónomo, tener URL/ID estable, relación gobernada y medición. Distingue:

1. **External search:** una URL owned o platform-native aparece en Google/Bing u otro buscador.
2. **Platform search / recommendation:** la pieza aparece en el buscador, feed o recomendador interno.
3. **Downstream progress:** la persona continúa a otro nodo, guarda, completa, se suscribe o inicia un handoff.

Google Search Console documenta un rollout gradual de
[Platform Properties](https://support.google.com/webmasters/answer/17148418?hl=en-GB) para Instagram, TikTok, X y
YouTube. Verifica disponibilidad por cuenta; no confundas soporte anunciado con propiedad ya habilitada. Para
medición nativa usa las fuentes oficiales de cada plataforma: [TikTok Creator Search Insights](https://support.tiktok.com/en/using-tiktok/growing-your-audience/creator-search-insights),
[YouTube Search](https://support.google.com/youtube/answer/16090438) y
[YouTube Analytics](https://support.google.com/youtube/answer/12220281),
[Pinterest Trends](https://help.pinterest.com/en/business/article/pinterest-trends) y
[Pin performance](https://help.pinterest.com/en/business/article/pin-performance-and-distribution), más
[LinkedIn Search Appearances](https://www.linkedin.com/help/linkedin/answer/a7473929) y
[Post Analytics](https://www.linkedin.com/help/linkedin/answer/a525196). La elegibilidad de contenido público de
Instagram para buscadores se valida contra la [documentación de Meta](https://www.facebook.com/help/147542625391305).

No sumes impresiones de external search, búsquedas internas, feeds y alcance: no comparten definición ni
denominador. El registry conserva `surface`, `platform`, `roles`, `search_intent`, `query_set`,
`indexing_eligibility`, `discovery_surfaces` y `measurement_sources`. Indexación social tampoco autoriza schema
inventado: `ItemList` y demás JSON-LD deben corresponder a relaciones visibles, tipos elegibles y la fuente
editorial gobernada; la Pillar conserva su canonical.

---

## 4. Priorización RICE (toda recomendación sale ordenada)

No entregues backlogs planos. Puntúa cada iniciativa:

```
RICE = (Reach × Impact × Confidence) / Effort

Reach      = nº de páginas/queries/usuarios afectados por período
Impact     = 3 masivo · 2 alto · 1 medio · 0.5 bajo · 0.25 mínimo
Confidence = 100% probado · 80% razonable · 50% especulativo
Effort     = persona-semanas (dev + contenido + PR)
```

**Atajos de impacto típicos (orientativos, validar por caso):**

- **Alto impacto / bajo esfuerzo (hacer ya):** corregir indexación rota, title/H1
  por intención, respuestas directas y encabezados descriptivos cuando ayuden al
  lector, JSON-LD faltante cuando corresponda,
  arreglar INP/LCP regresivos, internal linking a páginas dinero.
- **Alto impacto / alto esfuerzo (planificar):** topical authority (cluster
  completo), construcción de entidad/Knowledge Graph, digital PR sostenido,
  migración limpia, refactor de arquitectura de información.
- **Bajo impacto (cuestionar):** `llms.txt` (Google no lo usa; ROI marginal —
  ver `04_AEO_GEO.md`), microajustes de keyword density, meta keywords (muertas).

### Ordenar hallazgos que ya vienen de un crawler (≠ ordenar iniciativas)

RICE ordena **iniciativas**. Una auditoría técnica entrega **hallazgos**, y ahí el
orden necesita tres ejes y un corte (verificado 2026-08-08 sobre la auditoría de
Grupo Berel):

1. **La severidad es un corte ABSOLUTO, no un sumando.** Un 5xx y 400 imágenes sin
   `alt` no compiten en el mismo score: fundidos en un número, el volumen entierra
   lo que rompe indexación. Ordena _dentro_ de cada nivel, nunca entre niveles.
2. **Dentro del nivel: (páginas afectadas × valor de búsqueda) ÷ esfuerzo.**
3. **El valor de búsqueda es un eje propio, ortogonal a la severidad.** La severidad
   mide qué tan roto está algo; el valor mide cuánto importa arreglarlo. Dentro de
   `notice` conviven higiene cosmética y señales reales, y sin este eje el alcance
   premia a lo que toca todo el sitio: un favicon ausente en 91 páginas encabezaba
   su tier por encima de `alt` ausente en 50 — y el segundo sí mueve tráfico
   (búsqueda de imágenes + accesibilidad). Escala: `high` rastreo, indexación,
   canonical, contenido, datos estructurados · `medium` CTR, experiencia de página,
   búsqueda de imágenes · `low` higiene sin efecto de búsqueda medible.
4. **Valor `low` no es 0.** Se hunde, no desaparece. Esconder un issue de higiene es
   la otra forma de mentir sobre el diagnóstico.
5. **El esfuerzo es tuyo, no del crawler.** Ningún proveedor reporta costo de arreglo.
   Etiqueta el tier como estimación propia en el entregable; si el cliente lo lee
   como medición, le vendiste una precisión que no tienes.

---

## 5. Herramientas (esta skill ejecuta, no solo asesora)

- **DataForSEO CLI local gobernada (`pnpm dataforseo`)** — es el acceso disponible
  en este repo a SERP, Labs, Backlinks, OnPage, Domain Analytics y AI Optimization.
  Carga primero `dataforseo-operator`; la CLI reutiliza el transporte canónico,
  allowlist, breaker, entitlement y ledger. Selecciona el modo según la pregunta:
  - `catalog info|list|search|describe`: descubre rutas, estado ejecutable y shape
    antes de preparar un payload. `catalog_only` significa conocida pero no autorizada;
    nunca la eludas con una llamada directa. Para evaluar una capacidad futura, consulta el
    registro exhaustivo `docs/architecture/GREENHOUSE_DATAFORSEO_CATALOG_ONLY_ENABLEMENT_REGISTER_V1.md`:
    prioriza Content Analysis para brand monitoring y Business Data acotada para local/reputación;
    Keywords Data sólo para paid/trends/clickstream cuando Labs no alcance; Merchant y App Data
    esperan un caso e-commerce/app. El registro orienta discovery, no habilita gasto.
  - `quick keywords-for-site` / `site-keywords`: investiga relevancia de contenido por URL o host para
    preparar/actualizar briefs. Declara `--target-kind domain|subdomain|url`; URL con https o www conserva
    path/query. Sólo compra Keywords for Site, sin Overview/Competitors/SERP. Usa preview, org/ceiling y
    checkpoint/resume para el compuesto; JSON conserva scope/cobertura/provenance y acompaña al CSV.
    Relevancia no es ranking ni consultas GSC; CPC/competition son métricas Ads. Verifica país/idioma y
    propiedad del cliente antes del preview; filtra editorialmente ruido y separa comparativas de productos
    de intención local de tiendas. `totalCount` no representa demanda propia. Método de selección en
    `modules/02_SEO_CONTENT.md`; contrato/caso live en manual CLI + Labs §2.1a.
  - `research`: keyword mining compuesto. Usa Suggestions + Related, agrega
    Keywords for Site y competidores con `--target`, enriquece candidatas con Labs y
    reserva SERP Standard para finalistas gobernadas. Revisa la matriz candidata y
    entrega `--finalists-file` con intención, categoría, prioridad y cobertura; `--yes`
    no reemplaza esa aprobación. Usa `--checkpoint`/`--resume`, TTL y paginación
    acotada para no recomprar. Las seeds manuales se conservan aunque no tengan volumen.
    Para decidir qué redactar, combina finalistas comerciales e informativas, lee PAA y
    URLs competidoras, y contrasta cobertura/GSC/canibalización. Live y AI Overview son opt-in.
  - `ai-research`: ejecuta un panel reproducible multi-plataforma y conserva lanes
    separadas de API y consumer surface. Normaliza citas, fan-out, entidades, modelo,
    mercado, costo y procedencia; no lo presentes como captura recurrente de producto.
  - `serp-compare`: compara transversalmente marcas o entidades definidas por aliases y
    uno o más dominios. Reutiliza cada SERP por query/dispositivo para todas las entidades
    y separa orgánico, mención, enlace AI, cita AI y Shopping opcional. Organic Live Advanced
    se serializa a una task por request y se agrega sin multiplicar capturas por entidad. No presupone retail.
  - `quick`: usa un preset para preguntas rutinarias y revisables como organic SERP,
    keyword overview, ranked keywords, competidores, backlinks, OnPage, AI Mode,
    LLM Responses/Scraper, AI Keyword Data o LLM Mentions. Empieza con `--dry-run`.
  - `run`: opera una ruta ejecutable por ID/path cuando no existe preset. Primero
    usa `catalog describe`; para tasks asíncronas conserva el ID y continúa con
    `task wait`, sin repetir `task_post`.
  - AI Optimization: consulta modelos vivos con los GET de `llm_responses/models`;
    no hardcodees modelos. Declara plataforma en LLM Mentions, y conserva resultados
    de ChatGPT, Claude, Gemini, Perplexity, Google AI Mode y AI Overviews como
    observaciones separadas por motor, superficie, mercado, idioma y fecha.

  Toda operación pagada se previsualiza antes de usar `--yes`, organización y
  `--max-usd`; los comandos compuestos revalidan costo observado + siguiente estimación
  y entitlement antes de cada POST. El techo no limita un request ya aceptado por el
  proveedor. Conserva JSON/CSV y checkpoint como evidencia, incluyendo procedencia y vacíos honestos. Manual
  completo: `docs/manual-de-uso/growth/dataforseo-cli.md`. Contrato técnico:
  `docs/architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`.

  **Versión de la herramienta:** antes de cambiar la CLI, lee `pnpm dataforseo -- version --json`. Toda mejora
  material debe terminar con `dataforseo:version:bump` (`major` incompatible, `minor` capacidad compatible,
  `patch` fix compatible) y `dataforseo:version:check`; los recibos JSON conservan `cliVersion`. No uses la
  versión de `package.json` como identidad de esta herramienta ni crees releases por correcciones editoriales.

  **Separación de lentes:** GSC es medición de primera parte del sitio (clicks,
  impresiones, CTR y posición observados); DataForSEO es estimación de mercado y
  observación del proveedor. No las promedies, fusiones ni uses una para rellenar la
  otra. Del mismo modo, una mención/cita en un motor o superficie AI no prueba
  presencia en otro: compara plataformas sólo con paneles equivalentes y reporta
  cobertura y limitaciones de cada fuente.

  **Caso de validación retail (2026-09-28):** dos capturas Live Advanced para
  `iphone 18 pro max` en Chile/desktop mostraron a Falabella moviéndose de orgánico
  #3 a #4 en cinco minutos; Paris no apareció entre los ocho orgánicos capturados,
  aunque sí como enlace del AI Overview y oferta Shopping. Por eso un entregable debe
  separar posición orgánica (`rank_group`), posición absoluta, enlace AI, cita AI y
  Shopping. “No observado en el depth capturado” no es una posición ni ausencia en Google.
  El AI Overview de esas capturas llegó con `asynchronous_ai_overview=false` y sin
  `load_async_ai_overview`: rotúlalo como caché del proveedor, no como UI actual.
  En el smoke final multidispositivo posterior sí se pidió carga asíncrona y ambos bloques
  devolvieron `asynchronous_ai_overview=false`. Por eso la frescura correcta fue
  `cached_provider_result`; el flag pedido queda separado en `aiOverviewAsyncRequested`.
  Una task fallida nunca se interpreta como ausencia orgánica.
  Una conclusión competitiva requiere panel branded/unbranded, mobile/desktop y serie temporal.
  La misma lectura aplica a cualquier sector mediante entidades, aliases y dominios; Shopping
  es una señal opcional, no parte obligatoria del modelo.
  La batería completa —retail, categorías SEO/creativa y research editorial— está en
  `docs/audits/seo/2026-09-28-dataforseo-cli-production-validation.md`. Conserva su corrección de identidad:
  una corrida que no declara `efeoncepro.com` como target no prueba cobertura propia.

- **Semrush MCP** — keyword research, organic research, backlink research, site
  audit, trends, overview. Úsalo para _datos reales_ en vez de estimar cuando
  el MCP/plugin esté instalado; si no existe herramienta Semrush callable,
  declara la limitación y usa fuentes primarias/exports disponibles. Flujo:
  discovery tool → `get_report_schema` → `execute_report`. Default database `us`
  salvo que el caso sea otro país (Chile = `cl`).
  🔴 **Su mensaje de error miente sobre la causa.** Al agotarse la cuota de unidades
  API responde que **el plan no incluye acceso MCP**, que es falso. Regla de
  distinción: **si el mismo reporte funcionó antes en esta misma sesión, es cuota,
  no plan.** Reportes como `phrase_related`/`phrase_questions` cuestan ~40 unidades
  por línea y agotan la cuota rápido. Reintenta **en serie**, nunca en paralelo, y
  no reportes "el plan no lo permite" sin aplicar esta prueba (caso fuente: research
  de cliente, 2026-08 — tres subagentes lo reportaron de buena fe copiando el
  mensaje).
- **Browsing Codex / WebSearch / WebFetch** — (a) frescura de algoritmo/feature; (b) **medición
  de Share of Voice IA** (correr un panel de prompts y registrar si la marca
  aparece/se cita/sentimiento — método en `07_MEASUREMENT.md`); (c) auditar
  páginas y SERPs vivas.
- **Generación de artefactos** — JSON-LD válido, `llms.txt`, content briefs
  AEO-ready, checklists rellenadas. Plantillas en `templates/`.
- **(Overlay Efeonce)** — WordPress REST/WP-CLI vía la skill
  `efeonce-public-site-wordpress`; BigQuery para export GSC; HubSpot MCP para
  atribución a leads. No dupliques esa lógica: enlaza.
- **Radiografía AEO (Think)** — si el trabajo pasa de diagnóstico a demostración,
  recuerda la cadena: **Grader mide el hueco; Radiografía muestra el método**.
  Runtime en `efeonce-think`, documentación/governance en `greenhouse-eo`.
  Nunca la trates como lead magnet ni como promesa de ranking/cita.

### Secuencia de evidencia para propuestas

Cuando SEO/AEO se presenta en una propuesta comercial, los artefactos deben cumplir
roles distintos y aparecer en este orden:

1. **AEO Grader = diagnóstico.** Expone la línea base y las brechas del cliente.
   Nunca inventes un score, una cita o un resultado; si no se ejecutó el diagnóstico,
   etiqueta la vista como conceptual.
2. **X-Ray = demostración de recuperabilidad.** Descompone una página o solución en
   intención, entidad, estructura, answer capsules, schema, evidencia y CTA. Demuestra
   cómo se vuelve recuperable y accionable; no reemplaza una auditoría live.
3. **Greenhouse = operación mensual.** Conecta backlog, páginas, contenidos, visibilidad
   orgánica/AEO y conversiones (cotización, formulario o agendamiento) en un ciclo de
   medición, aprendizaje y siguiente acción.

La narrativa mínima es **diagnosticar → demostrar → operar → medir conversión**. No
introduzcas estos artefactos como una galería de herramientas desconectadas.

**Regla de honestidad de datos:** si no puedes medir algo (no hay GSC, no hay
herramienta SoV), dilo explícito y marca el dato como _estimado_. Nunca presentes
una estimación como medición.

---

## 6. Voz, idioma y entrega

- **Idioma:** responde en el idioma del operador. Por defecto **es-CL neutro,
  tuteo** (puedes/quieres/dime), **sin voseo** (nunca podés/querés). Términos
  técnicos en inglés cuando son el estándar (crawl budget, answer capsule,
  fan-out). Cambia a en-US si la tarea está en inglés.
- **Entregables siempre accionables:** diagnóstico → 3–5 movimientos RICE →
  cómo medir. Conserva el inventario completo de hallazgos en el anexo; priorizar
  la síntesis no autoriza a omitir pendientes históricos.
- **Informe al cliente:** escribe desde el rol real de la agencia. Si redactamos
  y publicamos, asumimos esos actos y sus correcciones; no narramos nuestra
  producción como observadores externos. Aplica `modules/09_CLIENT_AUDIT_REPORTING.md`.
- **Cita tus fuentes** cuando afirmes datos de mercado (la skill se sostiene en
  evidencia, no en opinión). Marca el `as-of`.

---

## 7. Principios cross-cutting (válidos en todos los módulos)

1. **Entidad > keyword.** En 2026 los motores (clásicos e IA) razonan por
   entidades. Construir la entidad de marca (`03_EEAT_ENTITY.md`) es el
   multiplicador de fondo de todo lo demás.
2. **Claridad editorial.** Encabezados descriptivos, respuestas directas y
   contexto suficiente ayudan a las personas. Los mecanismos de recuperación y
   las señales de cita se verifican por plataforma; no hay estructura universal
   que garantice ser citado (`04_AEO_GEO.md`).
3. **Las menciones de marca pesan ~3× más que los backlinks** para visibilidad
   IA (data 2026). Off-page moderno ≠ solo links (`05_OFFPAGE_AUTHORITY.md`).
4. **La frescura es una señal que se prueba por motor, query set y vertical.** El contenido no se
   publica y se olvida; se mantiene, pero no uses el claim retirado «<2 meses → +28% citas»:
   `SOURCES.md` no pudo localizar una fuente reproducible para esa cifra.
5. **Cada plataforma y superficie tiene su evidencia.** No transfieras una
   observación de Google a Perplexity, ChatGPT o Claude; declara qué motor y
   modo verificaste, y separa documentación oficial de estudios externos.
6. **Mide o no existió.** GSC/GA4 para clásico; Share of Voice + tráfico IA para
   AEO. Sin medición, no hay caso.
7. **Una verdad, dos interfaces.** En Content Engineering, la experiencia humana y la representación computable
   deben derivar del mismo contenido gobernado. Schema, FAQ, entidades y respuestas nunca mantienen una versión
   manual paralela a lo visible.

## Promesa creativa AEO en anuncios

El [método completo SEO/AEO](../../../docs/operations/social/2026-09-22-seo-aeo-paid-media-production-method.md) aplica el objetivo deseado de ser **fuente preferida en la respuesta** y los riesgos de ausencia o representación incorrecta. Es una aspiración estratégica, no una posición 1 garantizada ni evidencia de que un motor describa mal una marca concreta. Mantener la diferencia entre aparecer, ser citado, ser elegido por el usuario y convertir. El lote TOFU documentado usa diagnóstico SEO+AEO como siguiente paso; no sustituirlo automáticamente por un grader ni prometer gratuidad. En MOFU/BOFU, usar la acción y el destino del brief vigente según el avance del comprador.

## Continuidad de campañas CMP

Canon: [registro y contrato de brief](../../../docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md#8-contrato-del-brief-ampliado-y-templates).
El pensamiento vive en `Alineación/2. Campañas/CMP-###_…`; los assets, en la carpeta del canal.

En campañas, separar mención, cita de URL, exactitud/atribución, recomendación, preferencia del usuario y
conversión. Fuente preferida es aspiración, no posición garantizada. Auditar contenido+técnica+entidad/autoridad
según la brecha; no prometer más citas por publicar más. La campaña gobierna el siguiente paso: diagnóstico
para entrada, demostración/evaluación para MOFU, alcance/conversación para BOFU cuando corresponda.

## Manifiesto de pauta y continuidad MCP

Canon: [manifiesto compartido y handoff MCP](../../../docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md).
Revisar correspondencia entre claim, diagnóstico y destino antes de entregar copy de pauta. Aparición, cita, representación, preferencia y oportunidad son hechos distintos; no convertir estudios ajenos en lift prometido. Los datos del manifiesto no certifican el servicio ni su atribución.

## Lanzamiento del grader y programación aprobada

Para copy de lanzamiento del grader, cargar [framework BeX](efeonce/EFEONCE_AGENTIC_READINESS_FRAMEWORK.md) y [producto](efeonce/AI_VISIBILITY_GRADER.md). Explicar muestra de respuestas, señales públicas y prioridades; separar percepción y operabilidad. No presentar monitoreo recurrente o auditoría completa como incluido en un diagnóstico gratuito, ni inferioridad de competidores sin verificación actual. Caso: [CMP-001](../../../docs/operations/social/2026-09-22-cmp-001-campaign-brief-handoff.md).
