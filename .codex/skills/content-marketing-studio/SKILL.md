---
name: content-marketing-studio
description: >-
  Studio de ejecución del motor de contenidos 2026. Operacionaliza estrategia editorial y produce, opera, atomiza, distribuye y mide blog/pillar, ebook/whitepaper, case study, newsletter, webinar, video y podcast. Incluye sistema visual editorial, infografías determinísticas SVG→PNG→WebP y Método de utilidad citable para link earning, backlinks, menciones y contenido que terceros puedan compartir, enlazar o citar. Encadena conversión a `growth-marketing-cro`, descubribilidad a `seo-aeo`, palabras a `copywriting`, social a `social-media-studio` y publicación a su skill dueña. Usar para estrategia/calendario editorial, pillar/cluster, topical authority, content ops, repurposing, distribución, content brief, newsletter, lead magnet, case study, thought leadership, infografía editorial, diagrama SVG, visualización exacta de datos/copy, linkable assets, contenido enlazable/citable, content ROI, AI content, content factory y content-led growth.
---

# Content Marketing Studio — el estudio del motor de contenidos (2026)

> **Studio de ejecución, no de estrategia de canal.** `digital-marketing` decide **qué rol juega el contenido en el mix** (módulo `02_CONTENT_MARKETING`) y le pasa la posta a **este studio** para la ejecución profunda — exactamente como su módulo `04` le pasa la posta a `social-media-studio`. Aquí se **produce, opera, atomiza, distribuye y mide** el contenido. La costura en una frase: **digital-marketing decide *qué contenido y dónde*; este studio *lo produce, opera y multiplica*; `copywriting` escribe las palabras; `seo-aeo` lo hace descubrible; `growth-marketing-cro` decide si convierte y los loops.**

## Cuándo invocar (y cuándo no)

**Invocar** para: operacionalizar una estrategia editorial (pillars→clusters→calendario), diseñar/operar el pipeline de producción, atomizar una pieza pilar en N átomos, decidir formato y su anatomía, planificar distribución de una pieza, montar la medición contenido→pipeline, o gobernar un content engine (roles, cadencia, brand safety, IA sin slop).

**No invocar** (delega): el *rol del contenido en el canal-mix / campaña integrada* → `digital-marketing`; *si convierte / loops / experimentos* → `growth-marketing-cro`; *el craft de las palabras* → `copywriting`; *táctica SEO/AEO técnica* → `seo-aeo`; *ejecución social por red* → `social-media-studio`; *publicar el contenido* → runtime (WordPress/Astro/email/forms).

## Cómo se usa (router)

1. Corre el **intake** (abajo) — sin objetivo + audiencia + etapa de funnel + capacidad, no recomiendes.
2. Carga **solo** el/los módulos de la etapa (árbol de decisión).
3. Aplica las **reglas duras** + la **tabla de sinergias** (nombra y encadena el hand-off).
4. Cierra con un **artefacto** (`templates/`) y el hand-off a la skill dueña del siguiente paso.

**Routing visual:** si una pieza necesita hero, imágenes de cuerpo, diagramas editoriales o derivados sociales/OG, carga `references/agentic-editorial-visual-system.md` **antes** de escribir prompts o generar assets. Este studio define función, sistema, manifest, selección e integración; la skill de imagen/diseño ejecuta el craft visual.

Antes de producir, cada `conceptId` debe declarar en el manifest un `deliveryContract` con decisiones explícitas
para `viewport`, `theme`, `canvas`, `skin` y su `rationale`. `skin` declara si la paleta es Efeonce core,
contextual de una plataforma/cliente o específica de campaña; nunca heredar el skin del precedente por omisión. Al cerrar una producción local, ejecutar
`pnpm content:visual-manifest:lint -- <manifest.json>`. No declarar un sistema visual completo si el gate falla o
si estas decisiones sólo aparecen en prosa.

**Routing de infografía determinística:** si el significado depende de texto, cifras, ejes, conectores, logos o
variantes responsive/theme exactas, carga `references/deterministic-editorial-infographics.md`. El método gobierna
`contrato → SVG → PNG master → WebP → QA → manifest`; `design-studio` dirige la composición y `dataviz-design`
gobierna el encoding cuando la visualización analítica lo requiere.
Para una portada/hero que “parece producto”, el mismo gate sigue vigente: si contiene gráficos o copy exactos,
usar SVG y cargar `../design-studio/modules/11_PRODUCT_STORY_SCENES.md`; la gramática es agnóstica y el skin se
decide por tema, sin convertir una paleta contextual de plataforma en branding Efeonce.

**Routing knowledge-to-product:** si una Pillar puede evolucionar a ebook, workbook, tool o soporte intelectual
de un producto futuro, carga `references/knowledge-to-product-ladder.md`. Esa evolución exige trabajos y gates
distintos; una tool no se trata como repurposing ni el contenido como product spec.

**Routing link earning/citabilidad:** si el objetivo incluye backlinks, menciones, citación IA, autoridad o que
colegas compartan/enlacen la pieza, carga `references/citation-utility-method.md` antes del draft y completa
`templates/citation-utility-contract.md`. El studio diseña el objeto reutilizable; `seo-aeo` valida off-page,
recuperación y medición. Nunca prometas enlaces.

**Routing metadata/taxonomía:** al cerrar slug, H1, SEO/OG titles, excerpt, descriptions, categoría y tags,
carga `references/metadata-translation-method.md`. Separa el problema que el lector ya reconoce del concepto
técnico que la pieza enseña; no conviertas jerga ni taxonomía de una sola pieza en peaje de entrada.

## Intake (correr SIEMPRE antes de recomendar)

- **Objetivo**: ¿awareness, demanda/generación, autoridad/thought leadership, activación, retención? Cada uno cambia formato, tono y distribución.
- **Audiencia + JTBD + etapa de funnel**: qué pregunta/problema tiene el ICP en esa etapa. (La **definición de ICP/segmentos NO se decide aquí** — es de `efeonce-agency` + `commercial-expert`. Efeonce tiene **múltiples ICPs/segmentos**; no asumas uno solo.)
- **Ecosistema de destino**: ¿blog owned, newsletter, hub, redes, lead magnet, sales enablement?
- **Capacidad real**: equipo, cadencia sostenible, presupuesto de producción. Un calendario que no se puede sostener es deuda, no plan.
- **Medición disponible**: ¿hay analytics/UTM/atribución para cerrar el loop? Si no, decláralo.

## Árbol de decisión — qué módulo cargar

```
¿En qué estás?
├─ Estrategia editorial operacionalizada: pillars, clusters, calendario, cadencia ... 01_EDITORIAL_STRATEGY
├─ Operar el motor: workflow, roles, gobernanza, brand safety, SLAs de contenido .... 02_CONTENT_OPS_PIPELINE
├─ Elegir/armar un formato a fondo (blog, ebook, newsletter, webinar, video, pod) .. 03_FORMATS
├─ Multiplicar: atomizar 1 pilar en N átomos por canal, reciclar evergreen ......... 04_REPURPOSING_ENGINE
├─ Distribuir/amplificar una pieza (owned/earned/paid, syndication, comunidades) ... 05_DISTRIBUTION_AMPLIFICATION
├─ Medir contenido→pipeline (leading/lagging, influenced pipeline, content ROI) .... 06_MEASUREMENT
├─ Producir con IA sin slop (Content Factory, fidelidad de voz, gobernanza) ........ 07_AI_CONTENT
├─ Diseñar/producir el sistema visual editorial, hero/body/OG y Media Library ..... references/agentic-editorial-visual-system
├─ Producir infografía exacta SVG→PNG→WebP con QA y manifest ....................... references/deterministic-editorial-infographics
├─ Diseñar utilidad citable para links/menciones/citas ............................. references/citation-utility-method
├─ Traducir tesis técnica a metadata y taxonomía comprensibles ..................... references/metadata-translation-method
├─ Madurar Pillar→ebook→tool→producto sin mezclar sources of truth ................. references/knowledge-to-product-ladder
├─ Qué NO hacer .................................................................... ANTIPATTERNS
├─ Vocabulario .................................................................... GLOSSARY
├─ Fuentes/benchmarks 2026 ........................................................ SOURCES
├─ Caso Efeonce (Think/Glitch/Manzanitas/Content Factory/lead magnets/bow-tie) .... efeonce/EFEONCE_OVERLAY
└─ Artefacto de salida ............................................................ templates/
```

Carga selectiva: no traigas los 7 módulos de una.

## Reglas duras (hard rules)

1. **Ninguna pieza nace sin distribución + medición.** Producir sin plan de distribución y sin métrica de éxito es el antipatrón #1 ("publicar y rezar"). La distribución es ≥50% del trabajo.
2. **Repurposing por defecto.** Ninguna pieza pilar se produce sin su **mapa de átomos** (a qué se atomiza y en qué canal). El multiplicador es la ventaja del studio.
3. **Insight original o nada.** Barra 2026: datos propios / expertise / POV. Nada de thin content regurgitado (ni humano ni IA). Sin insight, no se publica.
4. **No dupliques craft ni canal.** El studio **dirige y opera**; delega palabras (`copywriting`), descubribilidad (`seo-aeo`), conversión (`growth-marketing-cro`), social (`social-media-studio`), assets (studios de asset), publicación (runtime).
5. **IA con gobernanza.** Contenido asistido por IA con fidelidad de voz + barra de edición humana; nunca output crudo. Nunca reimplementar el Content Factory ni el publishing — operarlos vía su skill dueña.
6. **Todo mapea a etapa de funnel + ICP.** Contenido sin JTBD, etapa ni ICP es ruido. El *encaje al negocio/bow-tie* se valida con `efeonce-agency`/`commercial-expert`, no se inventa aquí.
7. **es-CL neutro, tuteo**, sin voseo. Copy visible se valida con `copywriting` / `greenhouse-ux-writing`. Para clientes internacionales, transcreación, no traducción literal.
8. **Contenido no es producto.** Una Pillar puede crear lenguaje, demanda e hipótesis; un ebook debe agregar
   método y una tool requiere PDR, modelo, privacidad, analytics, QA y ejecución formal. Nunca conviertas una
   buena respuesta editorial en feature o claim de disponibilidad por inferencia.
9. **Link earning necesita utilidad transferible.** Si una pieza busca enlaces/citas, debe declarar el usuario
   de la cita, un objeto reutilizable, evidencia/límites, superficie enlazable, validación por pares, distribución
   y medición. No confundas una historia interesante con una fuente referenciable ni garantices backlinks.
10. **Metadata es un sistema de superficies.** H1, SEO title, OG title, excerpt y descriptions comparten tesis,
    pero no se copian mecánicamente. Prioriza en la entrada el problema que la audiencia reconoce; enseña la
    jerga dentro, salvo que sea parte comprobada del intent. No crees categorías o tags para una sola pieza.

## Tabla de sinergias (nombra y encadena el hand-off)

| Terreno | Content Marketing Studio (esta skill) | Hand-off a |
|---|---|---|
| **Rol del contenido en el mix / campaña integrada / content-led demand como canal** | operacionaliza la decisión | **`digital-marketing`** (módulo 02 le hace hand-off a este studio) |
| **Conversión, loops de growth, experimentación, PLG, ¿el contenido convierte?** | produce la pieza que alimenta el loop | **`growth-marketing-cro`** |
| **Descubribilidad + citabilidad (SEO técnico, schema, AEO/GEO por motor, entidad)** | produce contenido answer-first/citable | **`seo-aeo`** |
| **El craft de las palabras (headline, narrativa, estructura, edición)** | define la pieza + brief editorial | **`copywriting`** |
| **Distribución social profunda por red + programar (Metricool)** | entrega el átomo social | **`social-media-studio`** (studio peer) |
| **Assets: visual / motion / audio / imagen IA de la pieza** | dirige el asset (brief creativo) | `design-studio` · `motion-design-studio` · `audio-studio` · `greenhouse-ai-image-generator` |
| **Voz/marca, ICP/segmentos, bow-tie, GTM, naming** | aplica la doctrina en el contenido | **`efeonce-agency`** + **`commercial-expert`** |
| **Publicar: WordPress/Astro/Content Factory, email, lead forms** | decide qué se publica | `efeonce-public-site-wordpress` · `astro`/efeonce-think · `greenhouse-email` · `greenhouse-growth-forms` |
| **Medición runtime / atribución / GA4-GTM / CRM** | define qué medir del contenido | `greenhouse-gtm-ga4-operator` + HubSpot |
| **Tono es-CL / tokenización de copy visible de producto** | craftea el contenido | `greenhouse-ux-writing` |

**Regla de oro:** si la pregunta es *cómo producir, operar, atomizar, distribuir o medir la pieza de contenido* → es esta skill. Si es *si convierte, en qué canal vive, cómo se escribe la palabra, cómo se hace descubrible, o la doctrina de marca/negocio* → es la skill dueña. Cuando cruza (siempre en marketing), **nómbralo y encadena**.

## Herramientas (este studio ejecuta, no solo asesora)

- **WebSearch / WebFetch** — frescura de benchmarks/formatos 2026, voz de audiencia, teardown de contenido vivo. Cita fuente + `as-of`.
- **MCP (si el entorno los expone):** HubSpot (contenido/campañas/CRM), Metricool (social scheduling/analytics), Semrush (temas/competencia/keyword), Notion (editorial calendar/content ops). Si no hay tool callable, declara la limitación.
- **Skills del repo para ejecutar:** publicación + Content Factory → `efeonce-public-site-wordpress`; hub Astro → `astro`/efeonce-think; email → `greenhouse-email`; lead forms → `greenhouse-growth-forms`; social → `social-media-studio`; assets → studios de asset.
- **Honestidad de datos:** si no puedes medir una pieza (sin tag/acceso), dilo y marca el número como estimado. Nunca presentes benchmark de mercado como resultado propio.

## Voz, idioma y entrega

- **es-CL neutro, tuteo** por defecto; transcreación para clientes internacionales.
- **Entrega con el porqué**: la pieza/plan + una nota de qué objetivo, qué etapa de funnel, cómo se distribuye y cómo se mide. No entregues contenido sin el pensamiento detrás.
- **Cierra con un artefacto** de `templates/` y el hand-off nombrado.

## Mapa de módulos

| Archivo | Contenido |
|---|---|
| `modules/01_EDITORIAL_STRATEGY.md` | Content-market fit, pillars→clusters, calendario editorial, cadencia, temas por etapa de funnel |
| `modules/02_CONTENT_OPS_PIPELINE.md` | Workflow brief→draft→asset→review→publish→distribute→measure, roles (RACI), gobernanza, brand safety, SLAs |
| `modules/03_FORMATS.md` | Deep-dive por formato: blog/pillar, ebook/whitepaper/lead magnet, case study, newsletter, webinar, video, podcast |
| `modules/04_REPURPOSING_ENGINE.md` | Atomización 1 pilar → N átomos por canal; sistema de reciclaje y refresh de evergreen |
| `modules/05_DISTRIBUTION_AMPLIFICATION.md` | Owned/earned/paid content distribution, syndication, comunidades, PR de contenido — con hand-offs |
| `modules/06_MEASUREMENT.md` | Leading/lagging, engagement→influenced pipeline, content ROI, atribución — hand-off a gtm-ga4/growth |
| `modules/07_AI_CONTENT.md` | Content Factory/Media Foundry, contenido asistido por IA, anti AI-slop, fidelidad de voz, gobernanza |
| `references/agentic-editorial-visual-system.md` | Flujo visual editorial: función contextual→sistema coherente→concept IDs/manifest→GPT Image 2→masters/derivados→Media Library→QA público |
| `references/deterministic-editorial-infographics.md` | Método exacto: contrato editorial/datos→SVG accesible→Chromium/PNG master→WebP→QA original/contextual→manifest |
| `references/citation-utility-method.md` | Método de utilidad citable: caso→objeto reutilizable→evidencia/límites→anchors→validación por pares→link earning/medición |
| `references/metadata-translation-method.md` | Traducción editorial de metadata: problema reconocido→gate de jerga→trabajo por superficie→taxonomía→snapshot/readback |
| `references/knowledge-to-product-ladder.md` | Escalera Pillar→satélites→ebook/workbook→tool diagnóstica→producto, con separación de evidencia y gates |
| `ANTIPATTERNS.md` · `GLOSSARY.md` · `SOURCES.md` | Antipatrones, vocabulario, fuentes/benchmarks 2026 |
| `efeonce/EFEONCE_OVERLAY.md` | Ecosistema Efeonce: Think, Marketing con Manzanitas, Glitch, Content Factory, ebooks/lead magnets, bow-tie, ICPs |
| `templates/` | content-strategy-brief, pillar-cluster-map, editorial-calendar, content-brief, citation-utility-contract, repurposing-map, distribution-plan, measurement-dashboard |
