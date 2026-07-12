---
name: social-media-studio
description: >-
  Skill experta y de EJECUCIÓN de Social Media al estado del arte 2026 — el
  "estudio" que idea, produce, publica, escucha, gestiona comunidad y mide social
  plataforma-por-plataforma. Dos manos: (1) conocimiento profundo de la mecánica
  real de cada red (algoritmos y señales de ranking, formatos y su craft, social
  search/AEO-social, social commerce, creator/UGC, community management, escucha
  y trend-jacking, analítica nativa), y (2) capacidad de producción (orquesta
  Metricool para programar/analizar, Higgsfield para video/imagen/audio/UGC,
  greenhouse-ai-image-generator + Figma/Express para estáticos y carruseles),
  cerrando el loop idear→producir→programar→medir→iterar. COMPLEMENTARIA pero
  DISTINTA de digital-marketing: digital-marketing decide social como UN canal
  del mix (nivel estrategia/campaña); social-media-studio es el ESPECIALISTA de
  ejecución profunda por red. Delega a digital-marketing (mix de canales, campaña
  integrada, paid programático), a growth-marketing-cro (conversión/CRO,
  experimentación, atribución/funnel, retención), a copywriting (craft fino de
  texto/voz), a seo-aeo (SEO técnico + AEO por-motor LLM/schema), a
  commercial-expert (pricing/pipeline), a efeonce-agency (doctrina marca/GTM/ASaaS)
  y a los generadores visuales (greenhouse-ai-image-generator / higgsfield-* /
  greenhouse-digital-brand-asset-designer) para producir el asset concreto.
  Incluye overlay Efeonce (canales propios Think/Glitch/grader) y capa de delivery
  para clientes Globe. Triggers: "social media", "redes sociales", "Instagram",
  "Reels", "TikTok", "LinkedIn", "YouTube", "Shorts", "carrusel", "carousel",
  "story", "stories", "community management", "comunidad", "engagement", "hook",
  "guion de video", "video corto", "short-form", "long-form", "UGC", "creator",
  "influencer", "trend", "trend-jacking", "social listening", "escucha social",
  "social search", "AEO social", "social commerce", "TikTok Shop", "live shopping",
  "calendario de redes", "programar posts", "Metricool", "reporte de redes",
  "share of voice social", "algoritmo de Instagram/TikTok/LinkedIn", "cadencia de
  publicación", "content pillars", "batch de contenido".
user-invocable: true
argument-hint: "[red/tarea o pregunta — ej: 'plan de 30 días para LinkedIn del grader', 'guion de Reel para el lanzamiento', 'auditar nuestro Instagram', 'estrategia de TikTok Shop', 'matriz de community management']"
---

# Social Media Studio — Skill operativa 2026

> **Qué es esto.** Una skill de **dos manos**: **(1) conocimiento experto** de social
> media al estado del arte 2026 — la mecánica *real* de cada plataforma, no lugares
> comunes — y **(2) un estudio de ejecución** que produce, programa, escucha, gestiona
> comunidad y mide. No es un PDF de "buenas prácticas": es el brazo que *hace* el
> contenido social y lo pone en la calle con las herramientas conectadas.

> **La distinción de una frase.** **`digital-marketing` piensa el mix de canales y la
> campaña integrada; `social-media-studio` OPERA el canal social por dentro,
> plataforma por plataforma.** Si la pregunta es de mezcla de medios, campaña
> integrada, paid programático o presupuesto/pacing → **NO es esta skill** →
> `digital-marketing`. Si es de conversión/funnel/atribución/retención →
> `growth-marketing-cro`. Ver §5 (Boundaries) y `efeonce/SOCIAL_BOUNDARY.md`.

> **Sello de frescura.** Núcleo verificado **as-of 2026-07**. Este es el dominio de
> marketing que **más rápido se mueve**: features de plataforma, umbrales de algoritmo,
> cadencias óptimas, políticas de IA, social commerce y qué red lidera cambian **cada
> trimestre**. Antes de afirmar cualquier dato volátil (un número, un feature, un
> umbral, una cadencia, qué formato gana, qué política rige), **reverifica con
> WebSearch/WebFetch y marca el `as-of`**. La tabla de volatilidad-por-tema vive en
> `SOURCES.md`. **Regla dura: nunca cites de memoria algo con fecha.**

---

## 1. Cómo se usa esta skill (router)

1. **Clasifica la intención** con el árbol de §2. ¿Es realmente social de ejecución
   profunda, o pertenece a una skill hermana? Si pertenece a otra, **delega explícito**
   (§5) y para.
2. **Carga el módulo o módulos** que apliquen (§3). No cargues los 10 — carga lo justo.
3. **Chequea frescura**: si vas a afirmar algo de la tabla `volátil`/`trimestral` de
   `SOURCES.md`, reverifica primero.
4. **Si hay que ejecutar** (producir/programar/medir), abre `efeonce/STUDIO_TOOLING.md`
   y usa el pipeline con las herramientas conectadas — **con confirmación humana antes
   de publicar** (§4).
5. **Aterriza a Efeonce** si el trabajo es de canales propios o de un cliente Globe:
   `efeonce/EFEONCE_OVERLAY.md` / `efeonce/CLIENT_DELIVERY.md`.
6. **Cierra con un artefacto** de `templates/` (brief, calendario, guion, reporte…),
   no con prosa suelta.

## 2. Árbol de decisión (a qué skill pertenece)

- ¿Mezcla de canales, campaña integrada multi-canal, paid programático/PMax, media mix,
  presupuesto/pacing? → **`digital-marketing`**.
- ¿Convertir, medir funnel, atribución, experimento A/B, activación, retención, PLG? →
  **`growth-marketing-cro`**.
- ¿El texto necesita craft persuasivo fino, sistema de voz/tono, headline bank? →
  **`copywriting`** (esta skill da la *estructura* del hook/caption; el craft lo pule copy).
- ¿SEO técnico, AEO por-motor LLM (ChatGPT/Perplexity/AI Overviews), schema, llms.txt? →
  **`seo-aeo`** (esta skill cubre *social search* — TikTok/IG/YT como buscador — no el SEO web).
- ¿Pricing, pipeline, quote-to-cash? → **`commercial-expert`**.
- ¿Doctrina de marca/GTM/ASaaS, arquitectura de mensaje institucional? → **`efeonce-agency`**.
- ¿Producir el asset visual/video concreto? → **generadores** (`greenhouse-ai-image-generator`,
  `higgsfield-*`, `greenhouse-digital-brand-asset-designer`) — esta skill dirige, ellos ejecutan.
- **Todo lo demás de social** (mecánica de red, formato, comunidad, escucha, creator/UGC,
  social commerce, analítica nativa, calendario/cadencia, producción social) → **acá**.

## 3. Módulos (carga selectiva)

| # | Módulo | Cárgalo cuando… |
|---|---|---|
| 01 | `modules/01_PLATFORM_MECHANICS.md` | necesites señales de ranking / algoritmo por red |
| 02 | `modules/02_FORMATS_CRAFT.md` | trabajes un formato: Reel/Short/carrusel/foto/live/long-form |
| 03 | `modules/03_CONTENT_STRATEGY_PILLARS.md` | pilares, series, batching, calendario, cadencia |
| 04 | `modules/04_COMMUNITY_MANAGEMENT.md` | engagement, DM ops, moderación, crisis, dark social |
| 05 | `modules/05_SOCIAL_LISTENING_TRENDS.md` | escucha, trend-jacking, social search/AEO-social, SoV |
| 06 | `modules/06_CREATOR_UGC_INFLUENCER.md` | UGC, creadores, whitelisting, contratos, micro/nano |
| 07 | `modules/07_PAID_SOCIAL_AMPLIFY.md` | boosting/amplificación nativa (borde con digital-marketing) |
| 08 | `modules/08_SOCIAL_COMMERCE.md` | TikTok Shop, IG/FB Shops, live shopping, shoppable video |
| 09 | `modules/09_ANALYTICS_MEASUREMENT.md` | métricas nativas, reporting, qué mirar por objetivo |
| 10 | `modules/10_AI_AND_PRODUCTION_STUDIO.md` | producir con IA + orquestar herramientas del estudio |

## 4. La mano de ejecución (por qué es "studio")

El estudio cierra el loop **idear → producir → programar → medir → iterar** con las
herramientas conectadas (detalle en `efeonce/STUDIO_TOOLING.md`):

- **Producir**: `higgsfield-*` (video/imagen/audio/UGC), `greenhouse-ai-image-generator`
  y `greenhouse-digital-brand-asset-designer` (estáticos), Figma/Adobe Express.
- **Componer un carrusel con plantillas** → **Artifact Composer** (ADR
  `GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`, Accepted 2026-07-12). El carrusel **no se dibuja
  lámina por lámina**: es un **catálogo** del motor de composición que ya existe (el mismo que produce los
  decks de licitación). Se escribe un `Plan` (láminas + slots) y el motor lo materializa.
  - **NUNCA** copies/forkees el composer para social. **Un catálogo, no un fork** — un segundo motor
    obliga a arreglar cada bug de geometría dos veces.
  - Ganas gratis lo que ya está probado: **`overflow: reject`** (un texto que no cabe en el 4:5 **no se
    recorta**: falla) y la **verificación de geometría antes de renderizar**.
  - **La marca es un INPUT (brand pack)**, no una constante → el mismo catálogo sirve para Efeonce **y
    para un cliente Globe** (as-a-service). **NUNCA** hardcodees un HEX de marca en una plantilla.
  - Frontera con **Media Foundry**: Foundry **genera** el pixel (IA); el Composer **compone** el frame. Un
    carrusel puede usar los dos. **NO** se fusionan.
- **Programar y medir**: **Metricool** MCP (`getBestTimeToPostByNetwork`,
  `createScheduledPost`, `getAnalyticsDataByMetrics`, `getBrandSettings`).
- **Publicar y HubSpot**: atribución/lead capture social → `growth-marketing-cro` +
  `greenhouse-growth-forms`; publicación al blog/sitio → `efeonce-public-site-wordpress`.

> **Regla dura de publicación (propose → confirm → execute).** El estudio **propone y
> produce**, pero **programar o publicar en vivo pasa SIEMPRE por confirmación humana**.
> Nunca dispares un post, un DM masivo ni una programación sin aprobación explícita del
> operador. Es la misma doctrina Full API Parity del portal: el agente muta solo en el
> paso de confirmación humana.

## 5. Boundaries duros (lo que esta skill NO hace)

- **NUNCA** planifiques el mix de canales completo ni una campaña integrada multi-canal
  acá — eso es `digital-marketing`. Acá se ejecuta el *canal social* por dentro.
- **NUNCA** diseñes atribución/tracking/experimentos de conversión acá — `growth-marketing-cro`.
- **NUNCA** inventes datos de plataforma de memoria. Reverifica (§Sello de frescura).
- **NUNCA** publiques/programes sin confirmación humana (§4).
- **NUNCA** produzcas copy visible en el portal Greenhouse sin pasar por
  `greenhouse-ux-writing` + `src/lib/copy/*` (eso es copy de producto, no social).
- **NUNCA** transcribas la marca: Efeonce ≠ Greenhouse. Ver `efeonce/EFEONCE_OVERLAY.md`.

## 6. Doctrina 2026 (lo que hay que creer este año)

Estas son las apuestas verificadas hoy; cada una con su volatilidad en `SOURCES.md`:

1. **Video corto tiene parity entre redes** — pero el **long-form vuelve** (más views y
   saves por pieza). El formato se elige por *objetivo*, no por moda.
2. **Likes y followers están demotados** a señal débil en todas las redes. Lo que rankea
   es **watch time / completion, saves, shares/sends y dwell time**.
3. **Social search vence a Google** para <30 años (>50% en Gen Z): TikTok/IG/YT como
   buscador → hay que optimizar para **AEO-social** (captions, alt, on-screen text, keywords).
4. **Autenticidad > pulido**: saturación de IA → gana lo humano, imperfecto, serializado.
   **IA que un espectador razonable confunda con real debe etiquetarse** ("ante la duda, revela").
5. **Community management es palanca de alcance**, no soporte: el algoritmo premia *cómo*
   interactúas, no solo *qué* publicas. Incluye **dark social** (DM/WhatsApp/Discord).
6. **Social commerce explota** (mercado ~$2.1T; TikTok Shop ~$23B US 2026, convierte ~4.7%;
   live shopping 12–30%). **Contenido de creador convierte más que el de marca**;
   partnerships por performance, no fee plano.
7. **Micro/nano creadores** rinden 2.4×–6.7× más engagement por post que los grandes.
8. **"Estar en todas" murió**: gana elegir *una* red primaria, *un* formato, *una* cadencia
   sostenible. Consistencia + engagement > volumen.

## 7. Artefactos (cierra con uno)

`templates/social-brief.md` · `content-calendar-30d.md` · `reel-script.md` ·
`carousel-outline.md` · `platform-launch-playbook.md` · `community-response-matrix.md` ·
`ugc-creator-brief.md` · `social-report.md` · `trend-jack-checklist.md`

## 8. Archivos de apoyo

- `SOURCES.md` — fuentes + **tabla de volatilidad-por-tema** + `as-of`.
- `GLOSSARY.md` — vocabulario social 2026 (dwell, sends, SoV, whitelisting, dark social…).
- `ANTIPATTERNS.md` — los errores que matan cuentas y campañas.
- `efeonce/` — overlay: `EFEONCE_OVERLAY.md`, `STUDIO_TOOLING.md`, `SOCIAL_BOUNDARY.md`,
  `CLIENT_DELIVERY.md`.
