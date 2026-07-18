# Overlay Efeonce — el ecosistema de contenidos real

El studio es genérico y reutilizable, pero Efeonce tiene un **motor de contenidos concreto**. Este overlay ancla las superficies, el motor y las reglas reales. La **doctrina de marca/voz/ICP/bow-tie NO se decide aquí** — es de `efeonce-agency` + `commercial-expert` + `docs/context/`. Aquí se opera el content engine sobre esa doctrina.

> **ICP:** Efeonce tiene **múltiples ICPs/segmentos** (no solo Globe). No hardcodees un ICP único en la estrategia de contenidos. La segmentación viene de `efeonce-agency`/`commercial-expert`; el contenido se produce para el segmento que el trabajo indique.

## Las superficies de contenido (dónde vive)

Layering canónico del ecosistema digital (SSOT: `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`). Dos ejes: **superficies** front-of-house por etapa de funnel × **plataformas/backbones**. El contenido vive en las superficies de **adquisición** (continuo bow-tie):

| Superficie | Rol en el funnel | Qué contenido |
|---|---|---|
| **Think** (`think.efeoncepro.com`) — hub Astro | demand-gen + nurturing top-of-funnel | El hogar del contenido editorial; render "tonto" de un modelo headless. Repo/Vercel dedicado (NO greenhouse-eo). Marca = tokens AXIS copiados. Ver skill `astro`/efeonce-think |
| **Marketing con Manzanitas** — blog | thought leadership / autoridad / demanda | El blog de contenido; pillars y clusters viven aquí |
| **Glitch** — newsletter semanal (IA / Marketing / Negocios) | audiencia propia / nurturing | Canal owned de mayor ROI; consume átomos del pillar y genera piezas |
| **Tools / lead magnets** (AI Visibility Grader, ebooks, webinars) | demand-capture / captura | Contenido gated que convierte audiencia en lead |
| **efeoncepro.com** (WordPress/Kinsta, recalibración a Astro) | demand-capture + conversión | Landings de servicio, comparison tables, páginas de conversión |
| **Experiencia** (cliente sky / cockpit Greenhouse) | post-venta | Contenido de enablement/retención cuando aplique |

El **AI Visibility Grader** es la costura top→bottom del ecosistema. Cargar PDR-003 al razonar sobre superficies/hosts/dónde nace una pieza.

## El motor: AI Content Factory (no reimplementar)

`src/lib/public-site/content-factory/` — planificación/validación Gutenberg, catálogo de patrones, patch/refresh de posts, deep-inspection. **Herramienta de producción/publicación; se opera vía `efeonce-public-site-wordpress`.**

- Docs: `docs/documentation/public-site/public-site-content-factory-end-to-end.md`, `content-factory-golden-examples/` (README + `gutenberg-post-ai-revops-draft.json`), `gutenberg-post-authoring-recipes.md`.
- **Refresh de evergreen** (`../modules/04`): `refresh-plan` / `existing-post-refresh-draft-plan` — opéralo vía la skill dueña.
- **Publicar al blog WP:** write path `wpcli eval-file` (writes normalmente OFF), autor WP user 1; gotchas: TOC Yoast anclas `h-{slug}`, UTF-8 nowdoc nunca `\uXXXX` (ver TASK-1123 / reference de publish).
- **Regla dura:** nunca publiques output crudo del factory — pasa por el gate de REVIEW (`../modules/02`) + barra de insight/voz.

## Ebooks / lead magnets (mecánica real)

- **Source:** todos los ebooks en OneDrive (`Alineación/5. Contenidos/07. Ebook/01. Entregables Ebook/`).
- **Entrega:** el PDF **NO** va al repo → bucket privado. Form corporativo → token → descarga on-screen **+ email con LINK** (no adjunto, el PDF pesa ~9MB). Playbook: `docs/reference/ebook-lead-magnet-playbook.md` (TASK-1374/1375).
- **Frontera:** el diseño de la mecánica de conversión del lead magnet (form/gating) es de `growth-marketing-cro` + `greenhouse-growth-forms`; el studio produce el **contenido** del ebook (`../modules/03`).

## AEO: servicio ≠ lead magnet (no confundir)

- **`/aeo-2/`** = landing del **servicio AEO** → HubSpot **AEO Lead Form** (es venta de servicio, no self-serve).
- **AI Visibility Grader** = el **lead magnet self-serve** (eso es growth). Nunca confundas ambos en el contenido/CTA.

## Distribución en el ecosistema Efeonce

Cadena típica de un pillar de **Marketing con Manzanitas**:

```
Pillar (blog, vía Content Factory) 
  → Glitch (edición dedicada al insight)        [greenhouse-email]
  → LinkedIn/IG/X (átomos nativos)              [social-media-studio + Metricool]
  → Reel/clip (si aplica)                       [motion-design-studio]
  → Lead magnet gated (si el tema lo amerita)   [03 + growth-forms]
  → Slides sales enablement                     [commercial-expert]
  → citabilidad IA (answer-first, datos)        [seo-aeo]
```

- **Metricool** está conectado (MCP, 10 marcas) y **sí programa posts** (`createScheduledPost`; gotcha `dayOfWeek 1=lun..7=dom`). La ejecución social es de `social-media-studio`.
- **Redes sociales de Efeonce** y su calendario → `social-media-studio` + landing de redes (TASK-1351).

## Voz y contexto (delegado, citado)

- **Voz Efeonce** + slogan "Empower your Growth" + 7 creencias contrarias → `efeonce-agency` (+ `copywriting/efeonce/EFEONCE_VOICE_SYSTEM.md`). El studio **aplica** la voz, no la define.
- **Bow-tie / GTM / métricas / ICP** → `docs/context/` (`05` voz, `06` métricas, `08` comercial, `11` HubSpot bow-tie) + `efeonce-agency`.
- **es-CL neutro, tuteo**, sin voseo. El operador no es argentino.

## Baseline competitivo + jugada de autoridad (2026)

El baseline competitivo de la agencia vive en `docs/context/15_panorama-competitivo-benchmark-industria.md` (producido con `research-benchmark-operator`). Hallazgo que le toca directo a este studio: los competidores digitales de Efeonce (Milimetrix, Muller y Pérez, Bigbuda, Loup…) **ganan visibilidad de industria dominando su propio SERP de categoría** con contenido de autoridad ("mejores agencias / estado del marketing digital y AEO en Chile"), y **Efeonce está ausente** — irónico, porque vende AEO y es full-stack (Paid Media, CRO, contenidos, SEO/AEO, performance).

**Jugada canónica para este studio (quick win del baseline):** producir contenido de autoridad propio que gane ese SERP **con método creíble** (data study, no auto-bombo), apropiando el ángulo AEO/integración antes que la competencia lo consolide. Es literalmente vender lo que Efeonce vende. Cruza con `seo-aeo` (citabilidad/AI SoV) y `research-benchmark-operator` (el data study como munición). Meta: volver a Efeonce **fuente** que la prensa gremial (DF, Adlatina, Publimark, ANDA, IAB, AMDD) cite — no solo proveedor.

## Reglas duras del overlay

- **NUNCA** reimplementar el Content Factory ni el publishing (operar vía `efeonce-public-site-wordpress`).
- **NUNCA** hardcodear un ICP único (múltiples segmentos; delega la definición).
- **NUNCA** subir un PDF de ebook al repo (bucket privado + entrega por link).
- **NUNCA** confundir `/aeo-2/` (servicio) con el grader (lead magnet).
- **NUNCA** publicar output IA crudo (gate de REVIEW + barra de insight/voz).
- El contenido de Think vive en su **repo dedicado** (efeonce-think, Astro), no en greenhouse-eo.
- Las infografías editoriales usan `EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`: shell estable, arquetipo elegido por
  relación, sello canónico `efeoncepro.com` y SVG directo cuando gana por seguridad, fidelidad y peso.

## Cross-links

- Estrategia → `../modules/01`; ops → `../modules/02`; formatos/ebooks → `../modules/03`; atomizar → `../modules/04`; distribuir → `../modules/05`; medir → `../modules/06`; IA/factory → `../modules/07`; infografías Efeonce → `EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`.
- Publicar → `efeonce-public-site-wordpress` + `astro`; social → `social-media-studio`; email → `greenhouse-email`; lead forms → `greenhouse-growth-forms`; voz/ICP → `efeonce-agency`.
