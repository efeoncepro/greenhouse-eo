# PDR-005 — Posicionamiento de la landing "Redes Sociales" (Social Media Management)

> **Tipo:** Product Decision Record (posicionamiento/GTM de una superficie del sitio público).
> **Estado:** Accepted (posicionamiento) — sesión de diseño con el operador, 2026-07-06.
> **Skills:** `social-media-studio`, `growth-marketing-cro`, `digital-marketing`, `product-design-loop`, `commercial-expert`, `efeonce-agency`, `seo-aeo`, `efeonce-public-site-wordpress`.
> **Ejecución:** [`TASK-1351`](../../tasks/to-do/TASK-1351-landing-redes-sociales.md) (spoke de servicio). Epic: `EPIC-019`. Guía pillar "community manager" en Think = follow-up (ver §Consecuencias).
> **No-duplicación:** el sustrato estratégico vive en el context pack y en PDR-004 — este PDR **cita**, no copia: `docs/context/09_marca-agencia.md` (masterbrand Efeonce; Globe = Creatividad/Contenido, Reach = Amplificación), `docs/context/07_ico.md` (cadena de eficiencia → outcome medible), `docs/context/13_icp-buyer-personas-jtbd.md` (Globe ICP), [PDR-004](PDR-004-landing-agencia-creativa-posicionamiento.md) (paraguas creativo + doctrina de marca/CTA/prueba), [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md) (patrón hub `/servicios` + spoke por keyword real; pillar de autoridad va a Think).

## Contexto

Efeonce presta gestión de redes sociales (Community Management, Influencers/Creators, Trendjacking, contenido/reels modernos) como parte de su capability creativa (**Globe**, con pie en **Reach** para amplificación), pero **no tiene una landing pública** que la posicione y capture demanda. Hoy hay spokes de servicio para SEO (`TASK-1343`) y desarrollo web (`TASK-1345`), y el paraguas creativo (`PDR-004`/`TASK-1350`), pero el servicio social queda sin superficie de conversión propia.

**Demanda de búsqueda real (Semrush, base `cl`, as-of 2026-07)** que ancla la decisión de IA:

| Término | Vol/mes | Intención | Rol |
|---|---:|---|---|
| community manager | 4.400 | job / how-to (ambigua) | **Guía pillar en Think**, no página de servicio |
| agencia de marketing digital | 720 | comercial (broad) | Head term amplio, no específico |
| **agencia de redes sociales** | 170 | **comercial, alta intención** | **Head term de conversión de la spoke** |
| gestión / manejo de redes sociales | 140 c/u | comercial | Cluster secundario |
| agencia de influencers | 140 | comercial | Sub-bloque (Creators/Influencers) |
| community management | 110 | comercial | Sub-bloque (Community) |

Igual que PDR-002 mandó el término de alto volumen e intención informacional a Think y reservó la página de servicio para el head term comercial, esta spoke se ordena sobre **"agencia de redes sociales" + "gestión de redes sociales"**, y "community manager" (4.400) se captura como guía pillar en Think.

## Decisión — cuatro capas que se refuerzan

### 1. Ángulo: outcome + craft moderno + prueba (no "manejamos tus redes")

No liderar con la promesa commodity ("manejamos tus redes", el "todas las agencias suenan igual" de `09`). Liderar con **resultado de negocio (marca + demanda) producido con craft social 2026 y probado con el número**, coherente con el sello Efeonce (outcome medible + transparencia de `PDR-004`).

- Línea unificadora (dirección, no copy final — el craft lo pule `copywriting`/`greenhouse-ux-writing`): **"Redes que construyen marca y demanda —con contenido que la gente sí quiere ver— y con el número para probarlo."**
- Los sub-servicios (Community Management · Creators/Influencers · Trendjacking · Reels/Contenido · Social listening) van como **bloques de capability**, no como la promesa titular.
- Regla dura: liderar con el outcome + prueba, **nunca** con "publicamos todos los días" ni volumen de posts como valor.

### 2. Doctrina social 2026 encarnada, no descrita

La landing debe *demostrar* que Efeonce hace social del estado del arte, no listarlo. Principios verificados (volatilidad en `social-media-studio/SOURCES.md`; reverificar antes de citar cifras): autenticidad > pulido; **social search** (TikTok/IG/YT como buscador); community management como **palanca de alcance** (no soporte); micro/nano creadores rinden más engagement por post; video corto con parity + long-form volviendo; **likes/followers demotados** → lo que importa es watch-time / saves / shares / dwell. La métrica de vanidad (seguidores, "posteamos X veces") queda fuera del argumento de valor.

### 3. Ejecución: spoke Ohio + sección firma "muro social vivo"

Build en el patrón de la familia de spokes (`posicionamiento-seo`/`desarrollo-sitios-web`): **Ohio nativo + CSS page-scoped + Growth Form + Turnstile**, **NO** `elementor_canvas`, sin header/wrapper overrides. La inversión de craft se concentra en **una** sección firma —un "muro social vivo" (reels/feed/motion real)— que hace el *show-don't-tell* propio de un servicio social, sin cargar toda la página como code-custom. Disciplina: art direction primero (evitar "AI slop"), color tokenizado, `prefers-reduced-motion`, contraste AA, CWV como señal de craft. Assets producidos con el stack IA propio (`fal.ai` / Higgsfield / Magnific / Adobe CC).

### 4. Marca, oferta y conversión

- **Lidera la masterbrand Efeonce** (`09`): Globe/Reach nunca solos; capabilities nombradas descriptivamente ("nuestro equipo de creatividad y contenido"). Tuteo es-CL neutro, sin voseo.
- **Oferta de dos escalones:** CTA primario **"Agenda una reunión"** (HubSpot Meetings + UTM, consistente con `PDR-004`); CTA secundario **"Pide una auditoría de tus redes"** como oferta liviana de captura para el que aún no quiere reunión. Reusa `<greenhouse-form>` + Turnstile + atribución HubSpot portal 48713323 (Full API Parity por reuso, no motor nuevo).
- **Solo casos/resultados citables.** Sky, Bresler, Berel, SSilva u otros con métrica real. **NUNCA GEA** ni cifras infladas. Si no hay resultado social citable, usar cifras **ilustrativas del modelo** declarándolo (mismo patrón que `PDR-004`).

## Consecuencias

- La landing es un **nodo de la capa de adquisición** (demand-capture) del ecosistema ([PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md)) en `efeoncepro.com`, spoke bajo el hub `/servicios` (patrón PDR-002).
- **Slug canónico:** `/servicios/redes-sociales`. Registrar en el landing registry de la skill `efeonce-public-site-wordpress` antes del segundo cambio.
- **Follow-up de contenido (Think):** guía pillar "community manager" (4.400/mes, intención job/how-to) como autoridad top-of-funnel que enlaza a la spoke — bajar a TASK aparte bajo el eje Think/EPIC-020, no bloquea el diseño de la landing.
- **Gap a resolver en ejecución:** confirmar qué resultados sociales citables existen; si no, cifras ilustrativas declaradas.
- Coherencia con el paraguas creativo (`PDR-004`): la spoke social es una capability *dentro* de la agencia creativa, no una marca paralela.

## Alternativas descartadas

- **Ángulo creativo/autenticidad puro** — fuerte para craft, débil en outcome de negocio para comprador enterprise.
- **Ángulo social-search-first** — diferenciador pero de nicho para el ICP.
- **Build code-custom completo (como Agencia Creativa)** — mejor medium-is-message pero más pesado/lento para un spoke de servicio; se concentra el craft en la sección firma.
- **Elementor estándar sin sección firma** — lo más rápido, pero contradice el mensaje de un servicio social/creativo.
- **Slug en inglés `/servicios/social-media`** — peor fit con la demanda de búsqueda en CL/LATAM (los términos con volumen son en español).
- **Sección/ancla dentro de `/agencia-creativa`** — menos superficie SEO; se prefiere spoke propia sobre el head term comercial.
- **Lead magnet self-serve nuevo ("grader social")** — es un producto aparte, no cabe en esta landing.

## No-goals

- No es self-serve, no expone el portal ni datos de cliente.
- No lidera con volumen de posts / seguidores ni con "somos ágiles" sin prueba.
- No usa `elementor_canvas`, custom sticky header, ni header/wrapper overrides.
- No migra a Astro ni cambia de host.
- No cita GEA ni cifras infladas; no inventa resultados sociales.
- No construye un motor de forms nuevo (reusa Growth Forms).
