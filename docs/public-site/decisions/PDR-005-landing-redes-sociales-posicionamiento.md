# PDR-005 — Posicionamiento de la landing "Redes Sociales" (Social Media Management)

> **Tipo:** Product Decision Record (posicionamiento/GTM de una superficie del sitio público).
> **Estado:** Accepted (posicionamiento) — sesión de diseño con el operador, 2026-07-06.
> **Skills:** `social-media-studio`, `growth-marketing-cro`, `digital-marketing`, `product-design-loop`, `commercial-expert`, `efeonce-agency`, `seo-aeo`, `efeonce-public-site-wordpress`.
> **Ejecución:** [`TASK-1351`](././tasks/to-do/TASK-1351-landing-redes-sociales.md) (spoke de servicio; v1 live/noindex en WordPress page `251300`, cierre formal de lifecycle pendiente). Epic: `EPIC-019`. Guía pillar "community manager" en Think = follow-up (ver §Consecuencias).
> **No-duplicación:** el sustrato estratégico vive en el context pack y en PDR-004 — este PDR **cita**, no copia: `docs/context/09_marca-agencia.md` (masterbrand Efeonce; Globe = Creatividad/Contenido, Reach = Amplificación), `docs/context/07_ico.md` (cadena de eficiencia → outcome medible), `docs/context/13_icp-buyer-personas-jtbd.md` (Globe ICP), [PDR-004](PDR-004-landing-agencia-creativa-posicionamiento.md) (paraguas creativo + doctrina de marca/CTA/prueba), [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md) (patrón hub `/servicios` + spoke por keyword real; pillar de autoridad va a Think).

## Contexto

Efeonce presta un servicio humano y recurrente de Social Media, operado por un squad gestionado por Efeonce. La oferta puede apoyarse en contenido profesional producido mediante **Efeonce Run & Gun Studio**, pero no depende de Globe ni debe prometer creación automatizada mientras esa capacidad no esté disponible para este servicio. La landing pública debe posicionar y capturar demanda para esta oferta, dentro del paraguas creativo y del ecosistema de crecimiento de Efeonce.

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

### 1.1 Diferenciador y beachhead

La categoría que Efeonce debe ocupar es:

> **Social Media para empresas expertas: convertimos conocimiento, conversación y contenido social en un sistema medible de autoridad y demanda.**

El ICP prioritario es B2B experto —tecnología, SaaS, consultoría, servicios profesionales, educación especializada, minería, energía, infraestructura y otras ofertas complejas— con responsable interno de marketing, acceso a expertos/voceros y capacidad de comprometer al menos un trimestre. Consumo especializado y ecommerce son un segundo beachhead; multi-marca y regulados son expansiones condicionadas.

El diferenciador se prueba mediante cinco elementos: estrategia conectada al negocio, activación de conocimiento experto y voces ejecutivas, operación social gobernada por squad, Social Search conectado con SEO/AEO, y medición que distingue outputs, señales de demanda y resultados atribuibles. Run & Gun es una ventaja de delivery que hace ejecutable esa estrategia; no reemplaza el diferenciador ni convierte el retainer en producción ilimitada.

### 1.2 Search + Social Visibility

Social Search no es una promesa aislada ni una tercera línea de servicio. Es una capability de Social Media que compone inmediatamente con Search Visibility 360: las preguntas, temas, entidades y señales de conversación alimentan contenidos, páginas, FAQs y oportunidades SEO/AEO; la investigación de búsqueda informa hooks, formatos y prioridades sociales. La landing puede presentar esta composición como **Search + Social Visibility**, manteniendo contratos, owners y economics separados.

### 2. Doctrina social 2026 encarnada, no descrita

La landing debe *demostrar* que Efeonce hace social del estado del arte, no listarlo. Principios verificados (volatilidad en `social-media-studio/SOURCES.md`; reverificar antes de citar cifras): autenticidad > pulido; **social search** (TikTok/IG/YT como buscador); community management como **palanca de alcance** (no soporte); micro/nano creadores rinden más engagement por post; video corto con parity + long-form volviendo; **likes/followers demotados** → lo que importa es watch-time / saves / shares / dwell. La métrica de vanidad (seguidores, "posteamos X veces") queda fuera del argumento de valor.

### 3. Ejecución: spoke Ohio + sección firma "muro social vivo"

Build en el patrón de la familia de spokes (`posicionamiento-seo`/`desarrollo-sitios-web`): **Ohio nativo + CSS page-scoped + Growth Form + Turnstile**, **NO** `elementor_canvas`, sin header/wrapper overrides. La inversión de craft se concentra en **una** sección firma —un "muro social vivo" (reels/feed/motion real)— que hace el *show-don't-tell* propio de un servicio social, sin cargar toda la página como code-custom. Disciplina: art direction primero (evitar "AI slop"), color tokenizado, `prefers-reduced-motion`, contraste AA, CWV como señal de craft. Assets producidos con el stack IA propio (`fal.ai` / Higgsfield / Magnific / Adobe CC).

### 4. Marca, oferta y conversión

- **Lidera la masterbrand Efeonce** (`09`): Globe/Reach nunca solos; capabilities nombradas descriptivamente ("nuestro equipo de creatividad y contenido"). Tuteo es-CL neutro, sin voseo.
- **Oferta comercial:** CTA primario **"Agenda una reunión"**. La alternativa de **auditoría gratuita** frente a **Social Operating Diagnostic pagado** y piloto de 90 días permanece como decisión comercial pendiente; la landing no debe presentar una auditoría gratuita como equivalente al diagnóstico estratégico hasta que Commercial/Finance aprueben el modelo. Reusa `<greenhouse-form>` + Turnstile + atribución HubSpot portal 48713323 (Full API Parity por reuso, no motor nuevo).
- **Ventaja de delivery:** **Efeonce Run & Gun Studio** cuenta con equipos profesionales para capturar contenido en terreno, entrevistas, reels, liderazgo ejecutivo y social-first production. El servicio comprable se nombra **Efeonce Run & Gun Production**, con paquetes como Content Capture Day, Executive/Interview Capture, Social-First Production Sprint y Brand Story/Campaign Capture. Cada producción mantiene SOW, jornada, crew, movilidad, edición, derechos y rondas propios.
- **Solo casos/resultados citables.** Sky, Bresler, Berel u otros con métrica real. Si no hay resultado social citable, usar cifras **ilustrativas del modelo** declarándolo (mismo patrón que `PDR-004`).

### 4.1 Módulos y exclusiones que la landing debe hacer explícitos

El retainer puede incluir, según tier y alcance: estrategia y diagnóstico; sistema editorial y copy; adaptación nativa y publicación; community management; listening, tendencias y trendjacking caso a caso; Social Search; reporting y aprendizaje. Son módulos o proyectos separados cuando aplican: Paid Social y media spend; creators, influencers y UGC; Efeonce Run & Gun Production; derechos de imagen, música y licencias; cobertura de eventos; producción audiovisual especial; localización profesional; crisis/war room; atención 24/7; CRM, customer care completo y resolución de pedidos, pagos, entregas o soporte técnico.

Community/Social Care significa responder, clasificar, moderar y derivar conversaciones dentro del SLA contratado. La resolución de casos transaccionales o privados permanece con el cliente, salvo que exista un alcance específico con sistema de casos, base de conocimiento, autoridad, SLA y governance propios.

## Consecuencias

- La landing es un **nodo de la capa de adquisición** (demand-capture) del ecosistema ([PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md)) en `efeoncepro.com`, spoke bajo el hub `/servicios` (patrón PDR-002).
- **Slug canónico:** `/servicios/redes-sociales`. Registrar en el landing registry de la skill `efeonce-public-site-wordpress` antes del segundo cambio.
- **Follow-up de contenido (Think):** guía pillar "community manager" (4.400/mes, intención job/how-to) como autoridad top-of-funnel que enlaza a la spoke — bajar a TASK aparte bajo el eje Think/EPIC-020, no bloquea el diseño de la landing.
- **Gap a resolver en ejecución:** confirmar qué resultados sociales citables existen; si no, cifras ilustrativas declaradas.
- **Decisión comercial pendiente:** definir si la auditoría introductoria permanece gratuita y acotada o si la entrada comercial pasa a un Social Operating Diagnostic pagado seguido de un piloto de 90 días. La etiqueta runtime `Auditoría` no resuelve por sí sola esta decisión.
- Coherencia con el paraguas creativo (`PDR-004`): la spoke social es una capability *dentro* de la agencia creativa, no una marca paralela. **Efeonce Run & Gun Studio** es una capability interna/comercial habilitadora; **Efeonce Run & Gun Production** es el servicio cotizable.
- La página mantiene `publish + noindex, follow` hasta aprobar explícitamente el cutover de indexación, canonical y la decisión de auditoría/diagnóstico. No retirar `noindex` como parte de esta actualización documental.

## Execution delta 2026-07-08

- La página `/servicios/redes-sociales/` existe como WordPress page `251300`, publicada con `noindex` mientras se aprueba el cutover SEO/canonical.
- La dirección artística aprobada para el hero pivotó desde la metáfora de viaje/warp a un concepto más social-first: **"El mural que alza vuelo"**, una guacamaya azul/verde de mural urbano que cobra vida. El master web vive en el runtime como paquete `assets/video/social/art-macaws/v1/`.
- La sección firma "muro social vivo" quedó poblada con 8 assets WebP ficticios premium (`assets/img/social/wall/v1/`) mapeados por slot semántico, no como backgrounds CSS opacos.
- Aprendizaje operativo canonizado: en un muro ya animado, los placeholders `Reel`/`Historia`/`UGC` no obligan a video; WebP tipo cover/frame puede entregar mejor performance, control visual y QA mobile. Nota completa: `docs/operations/public-site-social-wall-media-production-20260708.md`.
- La decisión de producto no cambia: la landing sigue siendo outcome + craft moderno + prueba. El video/los assets son evidencia visual de craft, no una nueva marca ni una campaña real atribuida a cliente.

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
- No se dirige primero a cualquier marca que necesite publicaciones: el beachhead es B2B experto con conocimiento y voceros activables.
- No presenta Globe como dependencia ni promete creación de contenido automatizada no disponible.
- No presenta Run & Gun Studio como arriendo de equipos ni incluye producción ilimitada en el retainer.
- No confunde Community/Social Care con customer care transaccional o soporte 24/7.
- No presenta auditoría gratuita, diagnóstico pagado y piloto como la misma oferta antes de decisión comercial.
- No usa `elementor_canvas`, custom sticky header, ni header/wrapper overrides.
- No migra a Astro ni cambia de host.
- No infla cifras; no inventa resultados sociales.
- No construye un motor de forms nuevo (reusa Growth Forms).
