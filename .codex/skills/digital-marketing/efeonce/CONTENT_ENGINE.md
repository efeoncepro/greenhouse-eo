# Content Engine de Efeonce (AI Content Factory + sitio público)

> El content marketing de Efeonce tiene un motor real en el repo. Esta skill decide la
> *estrategia/distribución*; la *ejecución de publicación* es de `efeonce-public-site-wordpress`;
> la *táctica SEO/GEO técnica* de `seo-aeo`.

## AI Content Factory (el motor)

`src/lib/public-site/content-factory/`:
- `contracts.ts` — contratos de tipos del content factory.
- `intelligence-map.ts` — mapa de inteligencia de contenido.
- `gutenberg-planner.ts` / `gutenberg-validator.ts` — planificación + validación de posts Gutenberg.
- `gutenberg-capability-registry.ts` / `gutenberg-pattern-catalog.ts` — registry + catálogo de patrones.
- `patch-plan.ts` / `refresh-plan.ts` / `existing-post-refresh-draft-plan.ts` — patch/refresh de posts.
- `post-deep-inspection.ts`, `draft-smoke-plan.ts`.

Docs: `docs/documentation/public-site/public-site-content-factory-end-to-end.md`,
`content-factory-golden-examples/` (README + `gutenberg-post-ai-revops-draft.json`),
`gutenberg-post-authoring-recipes.md`.

## Sitio público (dónde vive el contenido)

- WordPress/Elementor (efeoncepro.com, Kinsta) con recalibración hacia Astro
  (`GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`). Landing del **servicio AEO**:
  `/aeo-2/` (`docs/documentation/public-site/aeo-landing-elementor.md`).
- **Comparison table widget** — pieza de conversión para páginas de servicio.

## Cómo aplica el content marketing (`../modules/02`)

- **Estrategia editorial + topical authority + distribución** las decide esta skill; el
  content factory es la *herramienta de producción/publicación* que opera
  `efeonce-public-site-wordpress`.
- **GEO / AI-search como canal:** el contenido del blog debe ser citable (answer-first, datos,
  fuentes) — decisión de canal de esta skill; la táctica técnica (schema, chunking, entidad) es
  de `seo-aeo`.
- **Pillar/Cluster Experience federada:** la Pillar es el hogar canónico, no necesariamente un
  "post activo" del que todo deriva. Artículos, tools y piezas platform-native pueden ser nodos
  heterogéneos del cluster. `content-marketing-studio` gobierna pertenencia y relación; esta skill
  diseña el mix/distribución y `social-media-studio` el craft y search nativo.
- **Distribución + adaptación:** planifica owned/earned/paid y piezas nativas por JTBD; no reduzcas
  reels/carruseles/posts a recortes promocionales. Un nodo social requiere valor autónomo, URL/ID,
  owner y medición; un teaser sigue siendo activación (`../modules/02, 04, 06`).
- **Governance de IA:** el content factory genera con IA → aplica brand safety + revisión humana
  (`../modules/09`); no publiques output crudo (barra de insight original).

## Reglas duras

- **NUNCA** reimplementar el content factory ni el publishing: opéralo vía
  `efeonce-public-site-wordpress`.
- **NUNCA** confundir `/aeo-2/` (landing del **servicio** AEO → HubSpot AEO Lead Form) con el
  **lead magnet** self-serve del grader (eso es growth; ver `growth-marketing-cro/efeonce/`).
- La estrategia de contenido y su distribución son de esta skill; la publicación y la táctica SEO,
  de sus skills dueñas.
- **NUNCA** sumes impresiones de Search Console, búsqueda/recomendación in-platform y progreso
  downstream: son planos distintos y tienen owners/métodos distintos.
