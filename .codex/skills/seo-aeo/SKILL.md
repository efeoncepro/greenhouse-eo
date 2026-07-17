---
name: seo-aeo
description: >-
  Skill experta y robusta de SEO + AEO/GEO 2026 para diagnosticar, diseñar,
  auditar, priorizar y ejecutar búsqueda orgánica y visibilidad en motores de
  respuesta IA. Cubre SEO técnico (crawl/index, Core Web Vitals, JSON-LD y
  crawlers IA), contenido y topical authority, E-E-A-T y entidades, Query
  Fan-Out, chunking y citabilidad, AI Overviews/AI Mode, ChatGPT, Perplexity,
  Gemini y Copilot, off-page/digital PR, local e internacional, YMYL,
  GSC/GA4/BigQuery, Share of Voice, exactitud y playbooks de auditoría, migración
  y recovery, con overlay Efeonce WordPress/Kinsta. Úsala también para blogposts,
  pillars y guías: research dossier, intent/SERP, claim ledger, metadata,
  canonical/robots, author Person, Article schema, publicación y QA live.
  Triggers: SEO, AEO, GEO, LLMO, schema, JSON-LD, E-E-A-T, knowledge graph,
  citabilidad, llms.txt, Core Web Vitals, topical authority, backlinks, hreflang,
  auditoría SEO, rankear, posicionamiento, tráfico orgánico, Semrush y GSC.
---

# SEO + AEO/GEO — Skill operativa 2026

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

---

## 0. Cómo se usa esta skill (orden obligatorio)

1. **Diagnostica primero.** Nunca prescribas una lista genérica. Corre el
   **intake** (§2). Sin contexto (sitio, vertical, motor objetivo, estado
   actual, objetivo de negocio) la recomendación es ruido.
2. **Carga solo el módulo que aplica.** Esta skill es un router. Los módulos
   (`modules/*.md`) son load-on-demand. No los leas todos; abre el que el
   problema exige (mapa en §3).
3. **Prioriza.** Toda recomendación sale ordenada por **RICE** (§4), no como
   backlog plano. El operador quiere saber *qué hacer primero*.
4. **Verifica lo volátil.** Si vas a citar un dato 2026 (cifra, umbral, feature
   de un motor), pásalo por browsing Codex/WebSearch antes de escribirlo como hecho.
5. **Respeta los guardrails.** Antes de recomendar cualquier táctica agresiva,
   contrástala con `ANTIPATTERNS.md`. Greenhouse/Efeonce no hace black-hat.
6. **Cierra con medición.** Ninguna recomendación está completa sin decir *cómo
   se mide el resultado* (`modules/07_MEASUREMENT.md`).

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

**Tesis 2026:** el 90% del trabajo técnico/contenido sirve a las tres capas a la
vez. AEO **no reemplaza** SEO: lo *extiende*. Quien tiene fundamentos sólidos
(Capa 1) parte ganando en las tres. Lo verdaderamente nuevo de AEO es: cómo se
**recupera** (RAG/embeddings + Query Fan-Out), cómo se **estructura** para ser
citable (chunking, answer capsules) y cómo se **mide** (Share of Voice en LLMs).

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

| # | Pregunta | Por qué cambia la recomendación |
|---|----------|---------------------------------|
| 1 | **¿Qué motor objetivo?** Google orgánico / AI Overviews-AI Mode / ChatGPT / Perplexity / Gemini / todos | Cada motor cita fuentes distintas (Wikipedia vs Reddit vs YouTube). Define el playbook. |
| 2 | **¿Qué vertical?** YMYL (finanzas/salud/legal) vs no-YMYL | YMYL exige un listón E-E-A-T mucho más alto → `03_EEAT_ENTITY.md`. |
| 3 | **¿Tamaño/tipo de sitio?** Brochure / blog / SaaS / e-commerce / marketplace / multisitio | Define si el cuello es técnico (crawl budget), contenido o autoridad. |
| 4 | **¿Estado actual?** ¿Indexado? ¿Penalización/caída? ¿Sitio nuevo? ¿Migración? | Recovery, lanzamiento y crecimiento son playbooks distintos (`08_PLAYBOOKS.md`). |
| 5 | **¿Geografía/idioma?** Un país / multirregión / multilingüe | Activa `06_LOCAL_INTERNATIONAL.md` (hreflang, ccTLD, localización). |
| 6 | **¿Objetivo de negocio?** Tráfico / leads / ventas / brand / share of voice IA | SEO no termina en tráfico. Ata al embudo (HubSpot en overlay Efeonce). |
| 7 | **¿Qué datos/herramientas hay?** GSC, GA4, Semrush, BigQuery, herramienta SoV IA | Define qué se puede medir y auditar de verdad vs. estimar. |
| 8 | **¿Recursos?** ¿Hay dev? ¿Equipo de contenido? ¿Presupuesto de PR? | RICE realista: no recomiendes digital PR si no hay quién lo ejecute. |

**Salida del intake:** un párrafo de "lectura del caso" + el/los módulos a cargar
+ los 3–5 movimientos priorizados. Nunca saltes directo a tácticas.

---

## 3. Mapa de módulos (load-on-demand)

| Si el problema es… | Carga |
|---|---|
| Rastreo, indexación, velocidad (CWV), JSON-LD, sitemaps, render JS, **crawlers IA** | `modules/01_SEO_TECHNICAL.md` |
| Intent, topical authority, pillar/cluster, programmatic, decay, canibalización | `modules/02_SEO_CONTENT.md` |
| Confianza/autoridad de marca y autor, **entidad/Knowledge Graph**, YMYL | `modules/03_EEAT_ENTITY.md` |
| **Ser citado por IA**: fan-out, chunking, citabilidad, prompt research, llms.txt, por-motor | `modules/04_AEO_GEO.md` ⭐ |
| Backlinks, digital PR, brand SERP, menciones, **Reddit/UGC** | `modules/05_OFFPAGE_AUTHORITY.md` |
| Google Business Profile / local pack, multirregión, hreflang, localización | `modules/06_LOCAL_INTERNATIONAL.md` |
| Medir resultados: GSC/GA4/BigQuery + **Share of Voice IA** + tráfico IA + exactitud | `modules/07_MEASUREMENT.md` |
| Auditoría completa, migración, recuperación de penalización/caída, lanzamiento | `modules/08_PLAYBOOKS.md` |
| Qué **NO** hacer (black-hat, spam IA, riesgos) | `ANTIPATTERNS.md` |
| Vocabulario (AEO vs GEO vs LLMO vs SGE vs AI Mode, etc.) | `GLOSSARY.md` |
| Fuentes canónicas + qué reverificar y cada cuánto | `SOURCES.md` |
| Blogposts, pillars y guías: dossier, traducción de metadata, E-E-A-T, publicación WordPress/Think, link health y verificación live | `references/agentic-editorial-eeat.md` + `content-marketing-studio/references/metadata-translation-method.md` |
| **Framework + metodología propietaria Efeonce** (los 5 niveles para existir en un internet de agentes: Be Found · Readable · Correct · Actionable · Intrinsic; narrativa pública + modelo de 2 ejes del grader) | `efeonce/EFEONCE_AGENTIC_READINESS_FRAMEWORK.md` ⭐ |
| Caso Efeonce: WordPress/Kinsta + AI Content Factory + HubSpot + ICP Globe | `efeonce/EFEONCE_OVERLAY.md` |
| **Producto Greenhouse que operacionaliza esta skill** (AI Visibility Grader / dominio `growth`, TASK-1226/1227) | `efeonce/AI_VISIBILITY_GRADER.md` |
| **Radiografía AEO** (Think): muestra viva que educa y demuestra ejecución SEO/AEO sobre un hueco medido; no reemplaza al Grader | `docs/think/radiografia-aeo-architecture.md` + manual comercial `docs/manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md` |
| **Web agéntica**: WebMCP, exponer tools a agentes, agentic-web *readiness* (¿los agentes pueden *usar* el sitio, no solo *citarlo*?), Lighthouse API programática + audit `registered-webmcp-tools` | **skill `webmcp`** (cross-skill) |
| Artefactos listos para usar | `templates/` (jsonld, llms-txt, briefs, checklists) |

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
  por intención, `answer capsules` 40–60 palabras bajo H2, JSON-LD faltante,
  arreglar INP/LCP regresivos, internal linking a páginas dinero.
- **Alto impacto / alto esfuerzo (planificar):** topical authority (cluster
  completo), construcción de entidad/Knowledge Graph, digital PR sostenido,
  migración limpia, refactor de arquitectura de información.
- **Bajo impacto (cuestionar):** `llms.txt` (Google no lo usa; ROI marginal —
  ver `04_AEO_GEO.md`), microajustes de keyword density, meta keywords (muertas).

---

## 5. Herramientas (esta skill ejecuta, no solo asesora)

- **Semrush MCP** — keyword research, organic research, backlink research, site
  audit, trends, overview. Úsalo para *datos reales* en vez de estimar cuando
  el MCP/plugin esté instalado; si no existe herramienta Semrush callable,
  declara la limitación y usa fuentes primarias/exports disponibles. Flujo:
  discovery tool → `get_report_schema` → `execute_report`. Default database `us`
  salvo que el caso sea otro país (Chile = `cl`).
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

**Regla de honestidad de datos:** si no puedes medir algo (no hay GSC, no hay
herramienta SoV), dilo explícito y marca el dato como *estimado*. Nunca presentes
una estimación como medición.

---

## 6. Voz, idioma y entrega

- **Idioma:** responde en el idioma del operador. Por defecto **es-CL neutro,
  tuteo** (puedes/quieres/dime), **sin voseo** (nunca podés/querés). Términos
  técnicos en inglés cuando son el estándar (crawl budget, answer capsule,
  fan-out). Cambia a en-US si la tarea está en inglés.
- **Entregables siempre accionables:** diagnóstico → 3–5 movimientos RICE →
  cómo medir. Evita la lista de 40 ítems sin priorizar.
- **Cita tus fuentes** cuando afirmes datos de mercado (la skill se sostiene en
  evidencia, no en opinión). Marca el `as-of`.

---

## 7. Principios cross-cutting (válidos en todos los módulos)

1. **Entidad > keyword.** En 2026 los motores (clásicos e IA) razonan por
   entidades. Construir la entidad de marca (`03_EEAT_ENTITY.md`) es el
   multiplicador de fondo de todo lo demás.
2. **Estructura para recuperación.** El contenido se cita por *pasajes*, no por
   páginas. Answer-first, autocontenido, con datos y fuentes (`04_AEO_GEO.md`).
3. **Las menciones de marca pesan ~3× más que los backlinks** para visibilidad
   IA (data 2026). Off-page moderno ≠ solo links (`05_OFFPAGE_AUTHORITY.md`).
4. **Frescura es ranking factor IA.** Contenido actualizado <2 meses gana ~28%
   más citas. El contenido no se publica y se olvida; se mantiene.
5. **Cada motor es un canal distinto.** Optimizar "para IA" en abstracto no
   existe; optimizas para AI Overviews, o Perplexity, o ChatGPT — fuentes y
   mecánicas difieren.
6. **Mide o no existió.** GSC/GA4 para clásico; Share of Voice + tráfico IA para
   AEO. Sin medición, no hay caso.
