# Overlay Efeonce / efeoncepro.com

> **Ecosistema digital Efeonce — layering canónico** (SSOT: `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`; índice `docs/public-site/`). Dos ejes ortogonales: **superficies** front-of-house (por audiencia/etapa de funnel — **adquisición** como continuo bow-tie: `Think` = demand-gen + nurturing top-of-funnel [blog *Marketing con Manzanitas* → *Glitch* newsletter semanal IA/Marketing/Negocios + tools *AI Visibility Grader*/ebooks/webinars] · sitio `efeoncepro.com` = demand-capture + conversión; **experiencia** con dos caras: cliente [sky → `experiencia.efeoncepro.com`] y operador [cockpit Greenhouse]) que consumen **plataformas/backbones** (runtime Greenhouse PG+BQ/360, **Kortex** = CRM peer system + producto, Verk). El grader es la costura top→bottom. Cargar PDR-003 al razonar sobre superficies, capas, hosts o dónde nace una capacidad del ecosistema.

> Capa de aplicación del núcleo SEO+AEO al caso concreto de Efeonce. **No
> duplica** la operación del sitio: enlaza con las skills y docs canónicas y
> añade solo la guía SEO/AEO específica del caso. Sello: as-of 2026-06.

## Skills y fuentes canónicas a cargar (NO reimplementar)
- **`efeonce-public-site-wordpress`** — operación real del sitio público
  efeoncepro.com: Kinsta, WordPress REST/WP-CLI, WP Abilities, Ohio theme,
  Elementor, landing pages Greenhouse→WordPress, atribución HubSpot, AI Content
  Factory, EPIC-019/TASK-1111/1116/1122/1123. **Toda ejecución sobre el sitio
  pasa por aquí.**
- **Content hub/blog WordPress contract** —
  `docs/documentation/public-site/wordpress-blog-content-hub-search.md`
  (auditoria base:
  `docs/audits/public-site/2026-07-09-wordpress-blog-content-hub-search.md`).
  Cargarlo antes de recomendar retaxonomizacion, pillar/cluster, busqueda
  editorial, limpieza de tags o migracion/canonical del blog.
- **`commercial-expert`** (overlay Greenhouse) — ASaaS, Bow-tie, ICP Globe,
  posicionamiento de 4 productos, portal HubSpot 48713323.
- **`hubspot-ops` / `hubspot-greenhouse-bridge`** — atribución y CRM.
- **Business Context Pack** (`docs/context/`) — voz/tono (`05`), glosario/
  métricas (`06`), GTM (`08`), marca (`09`), experiencia cliente (`10`),
  HubSpot bowtie (`11`). Cargar antes de tocar copy, naming o GTM.

## Contexto del caso (lo que cambia la estrategia SEO/AEO)
- **Marca:** Efeonce (agencia, radicada en Chile, footprint internacional).
  Greenhouse es el subproducto/portal — "EO" es abreviatura del repo, **nunca
  copy visible**. No mezclar la marca del portal interno con el sitio público.
- **Stack del sitio (actual):** WordPress en Kinsta + Ohio/Elementor. → el SEO
  técnico se ejecuta con plugin SEO (Yoast/RankMath/Slim SEO — verificar cuál usa
  el sitio vía la skill WordPress) + WP-CLI/REST. No inventes; revisa el stack
  real.
- **Blog/content hub actual (verificado 2026-07-09):** posts nativos WordPress +
  Gutenberg; no hay `page_for_posts`; permalinks `/%category%/%postname%/`;
  archivos/search/singles los renderiza Ohio parent; search nativo mezcla posts,
  paginas, attachments, landings y portfolio, con Yoast `noindex, follow`. Antes
  de un refresh SEO de clusters, limpiar demo posts/tags/sidebar y definir
  taxonomia + canonical hub.
- **⚠️ Migración futura a Astro (planificada, as-of 2026-06):** Efeonce migrará
  eventualmente el sitio público a **Astro**. La guía WordPress de esta skill
  sigue vigente hasta que ocurra. Implicaciones SEO/AEO a tener listas para el
  cutover:
  - **Tratar como migración** (`../modules/08_PLAYBOOKS.md` → Playbook B):
    baseline pre-migración, **mapa de redirects 1:1 (301)**, paridad de contenido,
    schema/hreflang/CWV verificados en staging, monitoreo intensivo post-corte.
  - **Astro juega a favor del AEO:** SSG/SSR por defecto → contenido en el HTML
    inicial (mejor para crawlers IA que no ejecutan JS) y CWV excelentes. Mantener
    el JSON-LD (`../templates/jsonld/`) y la arquitectura de URLs al portar.
  - **No perder la entidad:** preservar `sameAs`, autoría, URLs canónicas y
    señales acumuladas. Una migración mal hecha es la causa #1 de caída de
    tráfico — preparar antes, no reparar después.
  - Cuando el cutover sea inminente, esta skill debe usar la skill de stack que
    corresponda a Astro (frontend) + el Playbook B, no la operación WordPress.
- **ICP:** equipos de marketing enterprise (aerolíneas, bancos, manufactura) en
  las Américas y el mundo. → **multilingüe real (es/en/pt)** y verticales que
  rozan **YMYL** (banca/seguros) ⇒ listón E-E-A-T alto (`03`, `06`).
- **AI Content Factory:** capacidad de generar contenido. ⚠️ **Guardrail crítico
  (`ANTIPATTERNS.md`):** contenido a escala con IA *sin valor incremental* =
  riesgo de "scaled content abuse" + cero citas IA. Toda salida del factory debe
  pasar el filtro de *information gain*, E-E-A-T (autor real) y citabilidad GEO
  (datos propios, fuentes). El factory acelera producción; no exime calidad.

## Cómo aplicar el núcleo a Efeonce (mapeo)
1. **Técnico (`01`)** — ejecutar vía la skill WordPress: indexación, CWV en
   Kinsta (caché/CDN), JSON-LD (Organization de Efeonce + Article + Person de los
   autores), robots permitiendo retrieval bots IA.
2. **Entidad (`03`)** — construir la entidad **Efeonce** (no Greenhouse):
   Organization schema + `sameAs` (LinkedIn, redes, prensa), descripción canónica
   alineada al context pack `09_marca-agencia.md`. Verificar qué saben ChatGPT/
   Perplexity/Gemini de "Efeonce" hoy y corregir vía fuentes.
3. **Contenido + AEO (`02`,`04`)** — clusters por servicio/industria con answer
   capsules; el AI Content Factory produce el draft, pero con data propia y
   revisión experta. Copy SIEMPRE validado con `greenhouse-ux-writing` (es-CL
   tuteo, sin voseo) y el context pack `05_voz-tono-estilo.md`.
4. **Off-page (`05`)** — digital PR con data propia de la agencia (casos,
   resultados), presencia en comunidades, menciones. Atadas a la entidad Efeonce.
5. **Internacional (`06`)** — estrategia multilingüe para el footprint Américas;
   hreflang correcto; localización real por mercado (no traducción a máquina).
6. **Medición (`07`)** — GSC + GA4 del sitio público; export a **BigQuery**
   (`efeonce-group`) para histórico y joins; **atribución a leads en HubSpot
   (portal 48713323)** — el SEO/AEO de Efeonce se mide en pipeline, no en tráfico.
   Share of Voice IA de "Efeonce" + competidores de agencias.

## Reglas duras del caso
- **NUNCA** exponer la marca/nomenclatura del portal interno (Greenhouse, "EO",
  Nexa, etc.) en copy SEO público salvo decisión GTM explícita.
- **NUNCA** publicar salida del AI Content Factory sin pasar information gain +
  E-E-A-T + citabilidad (riesgo penalización + reputación).
- **SIEMPRE** ejecutar cambios en el sitio vía `efeonce-public-site-wordpress`
  (GitOps/WP-CLI/REST gobernado), no a mano fuera de ese flujo.
- **SIEMPRE** validar copy con `greenhouse-ux-writing` + context pack antes de
  publicar (voz es-CL, sin voseo).
- **Cross-repo safety:** si el trabajo toca el repo del sitio público vs.
  greenhouse-eo, respetar las reglas de cross-repo action safety del `CLAUDE.md`.

## Producto que operacionaliza esta skill en Efeonce
Greenhouse está construyendo el **AI Visibility Grader** (dominio `growth`,
TASK-1226/1227) — el lead magnet + instrumento de medición que productiza este
conocimiento AEO. Es la pieza GTM que convierte "diagnóstico de visibilidad IA"
en pipeline HubSpot. Cuando el trabajo toque el grader, su scoring, prompt packs
o recomendaciones, cargar **`AI_VISIBILITY_GRADER.md`** (mapeo completo skill ↔
producto + fronteras del dominio + estado de las tasks).

Think también hospeda la **Radiografía AEO** (`/muestras/<slug>-<token>`): una
muestra viva de trabajo que educa y habilita ventas SEO/AEO. No captura leads y
no reemplaza al Grader. La cadena correcta es: **Grader diagnostica → Radiografía
demuestra → propuesta/deck convierte → servicio opera**. Runtime en
`efeonce-think`; documentación y manual comercial en `greenhouse-eo`.

> **Cross-refs:** núcleo en `../SKILL.md` + `../modules/*`. Ejecución del sitio →
> skill `efeonce-public-site-wordpress`. Guardrails → `../ANTIPATTERNS.md`.
> Grader / dominio growth → `AI_VISIBILITY_GRADER.md`.
