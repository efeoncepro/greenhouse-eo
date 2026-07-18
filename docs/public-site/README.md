# Public Site — Producto (efeoncepro.com + think.efeoncepro.com)

> **Qué es esto.** El hogar-producto del sitio público de Efeonce: dónde viven
> las **decisiones de producto/posicionamiento** y el **roadmap de ejecución**
> del sitio público como superficie comercial. Es el índice descubrible por
> agentes: si conversamos sobre landings, posicionamiento GTM del sitio, orden
> de ejecución o qué se decidió y por qué, **se empieza por acá**.
>
> Sello: creado 2026-07-05. Idioma es-CL neutro (tuteo, sin voseo).

## Para qué sirve (y para qué NO)

Este espacio captura el **plano de producto** del sitio público: qué landings/
superficies existen o vienen, cómo se posicionan entre sí, en qué orden se
ejecutan y por qué. Es la capa narrativa que ata los EPICs, los ADR de
arquitectura y las skills en una sola historia de producto.

| Sí vive acá | NO vive acá → va a |
| --- | --- |
| Decisiones de producto/posicionamiento/GTM del sitio (PDR) | Decisiones de **arquitectura** (contratos técnicos) → `architecture/DECISIONS_INDEX.md` (ADR) |
| Roadmap/secuencia de ejecución del sitio (now/next/later) | Programas de trabajo ejecutables → `docs/epics/` (EPIC-###) |
| El "por qué" comercial de cada superficie | Unidades ejecutables → `docs/tasks/` (TASK-###) |
| Mapa de landings y su relación entre sí | Operación real del sitio (WP/Kinsta/Astro/deploy) → skill `efeonce-public-site-wordpress` |

**Regla de no-duplicación:** cuando un PDR obliga arquitectura, **cita** el ADR
de `DECISIONS_INDEX.md`; no copia su contenido. Cuando un PDR se baja a trabajo,
**cita** el EPIC/TASK; no lo reemplaza.

## Índice

- **[PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md)** — roadmap del sitio público
  (now / next / later) con enlaces a los EPICs y PDRs que lo sostienen.
- **[decisions/](decisions/)** — Product Decision Records (PDR). Log de
  decisiones de producto/posicionamiento, más blando que un ADR.
  - [PDR-001 — Landing SEO complementaria al AEO](decisions/PDR-001-seo-landing-complementaria-al-aeo.md)
  - [PDR-002 — Arquitectura de información de la sección de visibilidad](decisions/PDR-002-arquitectura-informacion-seccion-visibilidad.md)
  - [PDR-003 — Layering del ecosistema digital Efeonce](decisions/PDR-003-layering-ecosistema-digital-efeonce.md)
  - [PDR-004 — Posicionamiento de la landing "Agencia Creativa"](decisions/PDR-004-landing-agencia-creativa-posicionamiento.md)
  - [PDR-005 — Posicionamiento de la landing "Redes Sociales"](decisions/PDR-005-landing-redes-sociales-posicionamiento.md)
  - [PDR-006 — Posicionamiento de la landing "HubSpot" (Agentic Customer Platform + partnership)](decisions/PDR-006-landing-hubspot-agentic-platform-posicionamiento.md)
  - [PDR-007 — Posicionamiento del "HubSpot Portal Grader" (lead magnet + gancho a la venta)](decisions/PDR-007-hubspot-portal-grader-lead-magnet.md)
  - [PDR-008 — Posicionamiento de la landing "Agencia" (`/agencia`)](decisions/PDR-008-landing-agencia-marketing-digital-posicionamiento.md)
  - [PDR-009 — Booking nativo con HubSpot Scheduler API](decisions/PDR-009-hubspot-scheduler-native-booking.md)
  - [PDR-010 — La Home es el pitch; `/agencia` se pliega](decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md)
  - [PDR-011 — About Us como identidad Golden Circle](decisions/PDR-011-about-us-identidad-golden-circle.md)
  - [PDR-012 — Growth Operating System como posicionamiento global](decisions/PDR-012-growth-operating-system-global-positioning.md)
- [PDR-013](decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md) — **El Hub de HubSpot: pillar + cluster.** Migración a `/servicios/hubspot/*` con 301 (la URL actual tiene **0 rankings y 0 backlinks**, medido). `/precios/` es la única con demanda SEO real (~1.500/mes, 30× todos los Hubs juntos); `/agentes/` es la más diferenciada (caso ANAM + Agent CLI). 🔴 Los clusters se miden por **citación en LLM y uso en el canal**, NO por tráfico orgánico. Deroga el "sin 301" de PDR-006.
- [PDR-014 — Creative Workflows como territorio editorial: Pillar + satélites](decisions/PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md)
- **[Creative Workflows Pillar + Cluster Brief V1](CREATIVE_WORKFLOWS_PILLAR_CLUSTER_BRIEF_V1.md)** — brief maestro de audiencia, tesis, arquitectura editorial, prioridades, enlaces, medición y atomización.
- **[Web agéntica Pillar + Cluster Brief V1](WEB_AGENTICA_PILLAR_CLUSTER_BRIEF_V1.md)** — contrato editorial de la pillar que soporta `/desarrollo-sitios-web/`: definición citable, recorrido, cluster, enlaces, visuales, medición y gate de publicación.
- **[Web agéntica Pillar Gutenberg Spec V5](WEB_AGENTICA_PILLAR_GUTENBERG_SPEC_V5.json)** — corte privado vigente del post `249387`: siete infografías art-directed como `<picture>`, supuestos WebMCP/Chrome y mercado revalidados, evals por capas, madurez, readiness y cadena de autoridad. No autoriza publicación; QA contextual v7 sigue pendiente.
- **[Web agéntica — sistema visual editorial](WEB_AGENTICA_EDITORIAL_VISUAL_SYSTEM_V1.md)** / **[manifest de assets](WEB_AGENTICA_VISUAL_ASSET_MANIFEST_V1.json)** — contrato light/dark y desktop/móvil sin canvas decorativo, media WordPress, hashes, pruebas contextuales y gate automático de contención de texto.
- **[Creative Workflows Knowledge-to-Product Ladder V1](CREATIVE_WORKFLOWS_KNOWLEDGE_TO_PRODUCT_LADDER_V1.md)** — progresión gobernada Pillar→satélites→ebook/workbook→tool diagnóstica→Creative Studio, con jobs, evidencia, gates y fronteras de producto.
- **[Creative Workflows Pillar Research Dossier V1](CREATIVE_WORKFLOWS_PILLAR_RESEARCH_DOSSIER_V1.md)** — lectura SERP sin volúmenes inventados, claim ledger científico, evidencia de mercado y límites de publicación.
- **[Creative Workflows Pillar Gutenberg Spec V1](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V1.json)** — primera versión completa de la Pillar, estructurada para Content Factory. Originó el post `251363` como borrador privado; su [inspección profunda](../operations/public-site-content-factory/post-deep-inspection-251363-2026-07-15T05-25-14+00-00.json) conserva la evidencia de ese corte histórico. La versión pública vigente es V5.
- **[Creative Workflows Pillar Gutenberg Spec V5](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V5.json)** — corte live vigente: 114 bloques gobernados, cinco imágenes, seis captions, dos diagramas ampliables y un `core/table`; QA anónimo desktop/mobile sin overflow.
- **[Creative Workflows Pillar Visual Enrichment V5](CREATIVE_WORKFLOWS_PILLAR_VISUAL_ENRICHMENT_V5.md)** — diagnóstico de distribución, corrección V3 de diagramas, tabla nativa, media IDs, snapshots/hashes, normalización emoji, cache purge y QA final.
- **[Creative Workflows Pillar Gutenberg Spec V4](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V4.json)** — versión editorial publicada en `https://efeoncepro.com/creative/creative-workflows/`: 111 bloques, fuentes primarias inline, caso SKY medido, límites metodológicos, transparencia de uso de IA, tres imágenes de cuerpo y metadata Yoast. Está `index, follow`.
- **[Creative Workflows Pillar Gutenberg Spec V3](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V3.json)** — versión autoral/visual anterior, conservada como evidencia de iteración.
- **[Creative Workflows Pillar Editorial Audit V2](CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_AUDIT_V2.md)** — evaluación detallada de hook, voz, argumento, evidencia, ritmo, CTA y límites antes de publicación.
- **[Creative Workflows Pillar Visual System V1](CREATIVE_WORKFLOWS_PILLAR_VISUAL_SYSTEM_V1.md)** / **[Visual Audit V1](CREATIVE_WORKFLOWS_PILLAR_VISUAL_AUDIT_V1.md)** — concepto `La señal seleccionada`, cuatro assets GPT Image 2 y dos diagramas deterministas V3; body `251366–251368`, `251393`/`251392`, featured/OG `251370` y render live desktop/mobile verificado.
- **[Creative Workflows Pillar WordPress + SEO Audit V3](CREATIVE_WORKFLOWS_PILLAR_WORDPRESS_SEO_AUDIT_V3.md)** — snapshot/rollback, write V3, extracto, meta title separado del H1, meta description, categoría, featured, Open Graph, schema y readback anónimo/autenticado.
- **[Creative Workflows Pillar E-E-A-T Audit V4](CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md)** — evidencia de mercado/ciencia/caso SKY, Who/How/Why, disclosure de IA, entidad de autor corregida, publicación y readback live.
- **[Creative Workflows Agentic End-to-End Retrospective V1](CREATIVE_WORKFLOWS_AGENTIC_END_TO_END_RETROSPECTIVE_V1.md)** — cronología V1→V5, decisiones, incidentes, matriz humano/agente/sistema, artefactos, métricas finales, residuos y Definition of Done del primer blogpost operado integralmente por un agente.
- **[Runbook agentic de blogposts end to end](../operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md)** — canon reusable surgido de este primer ciclo completo: research, coautoría, voz, Gutenberg, visuales, media, SEO/E-E-A-T, autorización, publicación con rollback y QA live. Los archivos Creative Workflows son el caso de referencia; el runbook es el proceso.

## Contexto canónico (fuentes que este espacio NO reimplementa)

- **Arquitectura del sitio público** (ADR vigentes): estrategia Astro runtime,
  render headless del report, módulo SEO Search Visibility 360, forms/CTA
  engines → [`architecture/DECISIONS_INDEX.md`](../architecture/DECISIONS_INDEX.md).
- **Programas de trabajo:** EPIC-019 (public website landing control plane),
  EPIC-020 (public AI visibility lead magnet), EPIC-022 (growth SEO Search
  Visibility 360), EPIC-023 (growth CTA/popup CRO) → [`docs/epics/`](../epics/).
- **Operación real del sitio:** skill `efeonce-public-site-wordpress`
  (WP/Kinsta/Astro, WP-CLI/REST, Content Factory, Growth Forms, deploy).
- **Posicionamiento comercial:** skill `commercial-expert` (overlay Greenhouse) +
  Business Context Pack `docs/context/`.
- **SEO/AEO:** skill `seo-aeo` (+ framework propietario "5 niveles" y overlay
  Efeonce) — la doctrina de posicionamiento en búsqueda + IA.
- **Content hub/blog WordPress:** contrato operativo vigente en
  [`docs/documentation/public-site/wordpress-blog-content-hub-search.md`](../documentation/public-site/wordpress-blog-content-hub-search.md)
  y auditoria base
  [`docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`](../audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md).
  Layout candidato elegido: `Demo 35: Blog Magazine`, documentado en
  [`docs/audits/public-site/2026-07-09-demo35-blog-magazine-layout-review.md`](../audits/public-site/2026-07-09-demo35-blog-magazine-layout-review.md).
- **Grader / dominio growth:** `architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`.

## Convención de PDR

- ID estable `PDR-###`, kebab-case en el nombre de archivo.
- Estado: `Proposed` · `Accepted` · `Superseded` · `Deprecated`.
- Cada PDR declara: contexto, decisión, alternativas descartadas (una línea c/u),
  consecuencias, enlaces a ADR/EPIC/TASK, y reglas duras si aplica.
- Al aceptar/cambiar un PDR, actualizar el índice de arriba y, si toca el orden
  de ejecución, `PRODUCT_ROADMAP.md`.
