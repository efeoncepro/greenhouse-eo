# PDR-006 — Posicionamiento de la landing "HubSpot" (Agentic Customer Platform + partnership)

> **Tipo:** Product Decision Record (posicionamiento/GTM de una superficie del sitio público).
> **Estado:** Accepted (posicionamiento) — sesión de diseño con el operador, 2026-07-07. Las dos decisiones abiertas quedaron resueltas por el operador: (a) **reposicionar en sitio** la página existente; (b) claim público de Kortex = **producto validado y publicado en el HubSpot Marketplace** (§Consecuencias).
> **Skills:** `commercial-expert`, `growth-marketing-cro`, `digital-marketing`, `seo-aeo`, `efeonce-agency`, `product-design-loop`, `efeonce-public-site-wordpress`, `arch-architect` (narrativa de arquitectura de servicio, no software).
> **Ejecución:** [`TASK-1352`](../../tasks/to-do/TASK-1352-landing-hubspot-agentic-platform.md) (reposicionamiento de la página existente `/servicios-contratar-hubspot/`, WordPress id `244079`). Epic: `EPIC-019`. Pillar de categoría "CRM / Agentic CRM" en Think = follow-up (ver §Consecuencias).
> **No-duplicación:** el sustrato ya vive en el context pack y en PDR previos — este PDR **cita**, no copia: `docs/context/02_gtm.md` (CRM Solutions en 4 capas: licencia → implementación → managed ops → intelligence; Efeonce = Solutions Partner; co-sell con PDM), `docs/context/03_ecosistema-producto.md` (Kortex = CRM Intelligence Platform sobre HubSpot), `docs/context/08_estrategia-comercial.md` (Kortex = capacidad técnica que ningún competidor LATAM replica), `docs/context/09_marca-agencia.md` (masterbrand Efeonce; "tres productos de software, no informes"), `docs/context/11_hubspot-bowtie.md` (bow-tie dual, NRR reina, portal 48713323, pipeline HubSpot Shared Selling), `docs/context/14_modelo-negocio-asaas.md` (ASaaS + switching cost), [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md) (Kortex vive en el eje de plataformas, no front-of-house), [PDR-002](PDR-002-arquitectura-informacion-seccion-visibilidad.md) (patrón hub `/servicios` + demanda data-backed; pillar de autoridad va a Think).

## Contexto

Efeonce presta servicios de HubSpot en cuatro capas (`02_gtm.md`): **licencias** (Solutions Partner), **implementación** (onboarding, migración, pipelines, properties, workflows, integraciones, deployment programático con Kortex), **managed CRM ops** (operación continua, retainer) e **intelligence** (auditoría + agente sobre el portal). Ya existe una página pública — `https://efeoncepro.com/servicios-contratar-hubspot/` (WordPress id `244079`, `publish`), con un "Partner Proof Module" — pero fue escrita para el HubSpot **anterior**: el de "compra e implementa un CRM".

**El gap que cierra este PDR:** HubSpot dejó de venderse como CRM. Desde el Spring Spotlight 2026 se reposiciona como **Agentic Customer Platform** — Smart CRM (capa de datos unificada) + **Breeze** (agentes de IA que ejecutan trabajo dentro del flujo, no lo asisten desde afuera). *(HubSpot oficial + prensa especializada, as-of 2026-07; volatilidad alta — reverificar antes de publicar, ver regla dura.)* Hechos ancla verificados:

- **Agentes Breeze en GA:** Customer Agent (resolución de soporte tier-1), Prospecting Agent (señales de compra + outreach), Data Agent (preguntas sobre el CRM). En beta: Company Research, Customer Health. Nuevo eje 2026: **AEO/Answer Engine Optimization** dentro de HubSpot ("si la IA no te cita, no existes").
- **Cambio de pricing (14-abr-2026):** Customer y Prospecting Agent pasaron a **pay-per-result** (~US$0,50 por conversación resuelta, ~US$1 por lead recomendado, ~US$0,10 por respuesta del Data Agent). El pricing de agentes es volátil por diseño → **no hardcodear cifras en la página**.
- **Implicación estratégica (la tesis de venta):** encender esto **no es comprar una licencia** — es un cambio de modelo operativo. Requiere arquitectura de datos, calidad de datos ("no hay outcome de IA sin datos limpios"), gobierno de agentes (qué decisiones NO requieren juicio humano) e integraciones. *Las empresas que ganan en 2026 no son las que "experimentan con IA", son las que rearquitecturan alrededor del Smart CRM.* Ese trabajo es exactamente lo que un partner con software propio hace mejor que uno que solo configura.

**Alcance:** este servicio se presta a **todo el mundo de habla hispana** (LATAM + España como mercado hispano actual), no solo Chile — ver §Alcance regional. El copy nace **es-LATAM neutro** (pan-hispano), no es-CL.

**Demanda de búsqueda real (Semrush, muestra base `cl`, as-of 2026-07)** — y por qué **rompe el patrón de spoke SEO** de PDR-002/005:

| Término | Vol/mes | Intención | Lectura |
|---|---:|---|---|
| crm | 12.100 | categoría (informacional/navegacional) | Autoridad de categoría → **pillar en Think**, no página de servicio |
| hubspot | 14.800 | marca (navegacional) | Tráfico de marca, no intención de contratar partner |
| hubspot crm | 480 | categoría-marca | Secundario; pillar/comparativas |
| agencia de marketing digital | 720 | comercial broad | No específico de HubSpot |
| **partner hubspot / hubspot partner** | **20 c/u** | comercial, alta intención | Head term real pero **volumen mínimo** |
| agencia hubspot / hubspot chile | 20 c/u | comercial | Marginal |
| implementar / migrar / contratar / consultor hubspot | ~0 (sin data) | comercial transaccional | **No hay demanda de búsqueda bottom-funnel** |

El patrón **se sostiene en todo el mundo de habla hispana**, no solo en CL (Semrush, as-of 2026-07): `hubspot partner` es delgado en **todos** los mercados hispanos — México 30, Colombia 110, España 170, Argentina/Perú/Uruguay/Venezuela/Bolivia/Centroamérica ~20 c/u; sumados ≈ 600-700/mes en todo el bloque, muy por debajo de mercados de alta intención de partner (EEUU 1.600, Países Bajos 1.300, Suecia 1.900, UK 1.000). En cambio la **categoría escala masivamente**: en México `crm` y `hubspot` = **40.500 c/u**.

**Conclusión de arquitectura de información:** a diferencia de las spokes de SEO (`agencia seo` 880) y Redes Sociales (`agencia de redes sociales` 170), **no existe demanda de búsqueda bottom-funnel para "partner/agencia/implementación HubSpot" en ningún mercado hispano**. Esta superficie **no es una spoke de captura SEO**: es una **página de conversión + habilitación de venta + co-sell**, cuyo tráfico llega por el **canal partner** (deal registrations vía el PDM de HubSpot), el **HubSpot Solutions Directory**, **directo/marca**, **outbound** y **cross-sell** desde otras superficies Efeonce (grader AEO, otras spokes). Optimizarla por keyword sería resolver el problema equivocado. La captura de la demanda de **categoría** (masiva pan-hispana) se juega en **Think**, que enlaza a esta página (§Consecuencias).

## Decisión — cuatro capas que se refuerzan

### 1. Ángulo: "de comprar una licencia a operar una plataforma agéntica" (teach-first)

No liderar con "Somos HubSpot Solutions Partner" (lo dice todo partner) ni con un catálogo de features Breeze (es la historia de HubSpot, y su pricing/roster cambia cada trimestre). Liderar con un **reencuadre de categoría verificable** (movimiento *Challenger*, en registro sobrio — sin superlativos): HubSpot ya no es solo un CRM; incorpora agentes de IA que ejecutan tareas dentro de los procesos, y aprovecharlos exige una **base ordenada** (datos limpios, procesos definidos, permisos claros), no solo activar funciones. Efeonce ordena y **opera esa base como RevOps programático** — con software propio, no a mano.

- Tesis central (registro sobrio, validado con `copywriting`; craft final lo pule `greenhouse-ux-writing`): **"HubSpot ya no es solo un CRM: incorpora agentes de IA que ejecutan tareas dentro de tus procesos. Aprovecharlos exige una base ordenada —datos limpios, procesos definidos, permisos claros—, no solo activar funciones."**
- Propuesta de valor (la **idea única = RevOps programático**): **"Ordenamos y operamos tu HubSpot como RevOps programático: tu operación de ingresos —pipelines, propiedades, workflows, permisos— definida como configuración versionada y desplegada con trazabilidad, no armada a mano. Queda documentada, repetible y se mantiene con software. Esa misma base ordenada es la que los agentes de HubSpot necesitan para funcionar."** Línea corta para hero: **"RevOps sobre HubSpot, hecho como software: tu operación de ingresos definida como configuración versionada y desplegada con trazabilidad —no reconstruida a mano en cada cambio."**
- El arco de la página son **las 4 capas de CRM Solutions como recorrido de valor**, no como lista de servicios sueltos: **Licencia → Implementación (RevOps programático) → Operación continua (managed ops) → Inteligencia (auditoría + agente sobre el portal)**. Es un flywheel, no un menú (`02_gtm.md:52`).
- Regla dura: liderar con el **mecanismo (RevOps hecho como software) + la prueba**, en registro sobrio; nunca con superlativos, ni con el tier de partner (que no está documentado), ni con features de HubSpot que no son nuestras.

### 2. Prueba / diferenciador medible: RevOps programático (Kortex)

El diferenciador no es "hacemos HubSpot" — es **cómo**. Kortex es una **plataforma RevOps**; lo distinto es que su RevOps es **programático**: la operación de ingresos se define como *manifests* declarativos → se despliega en el portal vía API **con trazabilidad** → queda versionada y reversible, más una capa de inteligencia (agente) que audita y recomienda sobre el portal. Internamente es la capacidad que la competencia regional no tiene instrumentada (`08_estrategia-comercial.md`); de cara al cliente se comunica **sin superlativos**, por sus mecanismos concretos (ver §Diferenciación).

- La prueba de diferenciación se encarna como **capability, no como demo del producto interno**: deployment trazable y auditable, migraciones controladas, portal audit continuo. En la era agéntica esto se traduce directo en el lenguaje del comprador: *arquitectura + calidad de datos + gobierno de agentes* — precisamente lo que HubSpot dice que separa a los ganadores.
- **Prueba verificable de tercero:** **Kortex es producto validado y está publicado en el HubSpot Marketplace** (confirmado por el operador, 2026-07-07). Esto es un proof point fuerte y checkeable — un partner con app propia listada en el Marketplace de HubSpot, no solo una consultora; y sostiene la jugada **B2B2B** (Kortex como producto vendible hacia otras agencias). Úsalo como ancla de credibilidad cerca de los CTA (con enlace al listing).
- **Estatus de partnership honesto:** Efeonce es **HubSpot Solutions Partner** con canal **co-sell activo** (deal registrations vía el PDM; pipeline "HubSpot Shared Selling"). **NUNCA afirmar un tier** (Diamond/Platinum/Gold) — no está documentado en ningún lado; afirmarlo es riesgo de credibilidad y de compliance del programa de partners.
- **Solo casos/resultados citables con métrica real:** Sky Airlines, Bresler, SSilva u otros verificables. **NUNCA GEA.** **Berel NO se usa como prueba de co-selling** (se cerró directo, sin PDM — `02_gtm.md:111`). Si no hay resultado HubSpot/CRM citable con número, usar cifras **ilustrativas del modelo declarándolo** (patrón PDR-004/005).

### 3. Ejecución: reposicionar la página existente (no fragmentar), Ohio nativo + sección firma

Reescribir/evolucionar **`/servicios-contratar-hubspot/`** (id `244079`) en su URL actual — preservando equity y el "Partner Proof Module" ya presente, evolucionándolo del relato "compra e implementa" al relato "plataforma agéntica operada con software propio". **No** crear una spoke nueva ni gastar un 301 (la demanda de keyword no lo justifica; §Contexto).

- Build en el patrón de la familia de spokes: **Ohio nativo + CSS page-scoped + `<greenhouse-form>` + Turnstile**, `template default`, **NO** `elementor_canvas`, sin header/wrapper overrides. Mutación Elementor vía `Document::save()` (nunca `_elementor_data` directo), snapshot + Kinsta purge + verificación GVC desktop/mobile 390px, rollback documentado (contrato de la skill `efeonce-public-site-wordpress`).
- La inversión de craft se concentra en **una** sección firma que hace *show-don't-tell* del diferenciador: un **"stack agéntico / mapa de deployment"** — visualización del recorrido Smart CRM → agentes gobernados → operación continua (art direction primero, color tokenizado, `prefers-reduced-motion`, contraste AA, CWV como señal de craft). No cargar toda la página como code-custom.
- **Higiene de volatilidad:** el roster y el pricing de Breeze cambian por trimestre. La página describe **categorías de agentes y el trabajo de gobernarlos**, no una lista de precios ni un catálogo cerrado que quede stale. Cualquier cifra concreta de HubSpot se reverifica (WebSearch) el día de publicación.

### 4. Marca, oferta y conversión

- **Lidera la masterbrand Efeonce** (`09`): Kortex/Greenhouse/Verk se nombran como **el software propio que sostiene el servicio** ("desplegamos con nuestra propia plataforma"), no como productos que el cliente compra aparte; Wave/Efeonce Digital como capabilities descriptivas. **Tuteo es-LATAM neutro (pan-hispano), sin voseo ni chilenismos** — el servicio es para todo el mundo de habla hispana (§Alcance regional).
- **Oferta de dos escalones:** CTA primario **"Agenda una reunión"** (HubSpot Meetings + UTM, consistente con PDR-004/005); CTA secundario **"Solicita un diagnóstico de tu portal HubSpot"** como oferta liviana de captura — mapea 1:1 con la capability **Portal Audit** de Kortex y es un gancho más fuerte que "auditoría" genérica porque promete valor sobre *su* portal. Reusa `<greenhouse-form>` + Turnstile + atribución **portal 48713323** (Full API Parity por reuso, no motor nuevo; form instance nuevo = config del contrato existente, `delivery=disabled` hasta cutover). Fallback honesto (`/contacto`/mailto) si el embed no carga.
- **Prueba de confianza** cerca de los CTA: badge "HubSpot Solutions Partner" (sin tier), co-sell, casos citables, y —cuando exista— el sello del Solutions Directory.

### Diferenciación competitiva frente a partners de la región (el pedido explícito)

El comprador mid-market/enterprise en LATAM compara contra partners fuertes: **InboundCycle** (primer Elite LATAM+España), **Cebra** (Elite, nacido en Chile, 500+ implementaciones, premio de migración), **Revenue Hub Latam** (Platinum CL, RevOps con metodología FocusFlow®), **Loymark** (ciclo completo). El eje de diferenciación dominante de esa categoría es **metodología RevOps** o **velocidad de implementación**. Efeonce **no compite fuera del RevOps: compite dentro, con RevOps programático** — el mismo trabajo, hecho como software (definido como configuración versionada, desplegado con trazabilidad, operado por Kortex/Greenhouse). Cada fila es un mecanismo verificable, no un adjetivo:

| Dimensión | RevOps consultivo (partners típicos) | RevOps programático (Efeonce/Kortex) |
|---|---|---|
| Cómo se define | Workshops y documentos | Configuración declarativa (manifests), versionada |
| Cómo se despliega | Configuración manual en el portal | Despliegue vía API, con registro de cambios |
| Trazabilidad | Notas y memoria del consultor | Cada cambio queda registrado y es reversible |
| Cómo se mantiene | Horas de servicio ante cada ajuste | Se re-despliega desde la fuente; consistente entre ambientes |
| Repetibilidad | Se rehace por proyecto | Reutilizable y auditable |
| Modelo | Agencia / consultora | ASaaS — el servicio operado como software |

Regla de mensaje (registro sobrio): no competir en "somos más Elite / más rápidos" (no tenemos el tier ni conviene). Competir en el **mecanismo** — RevOps hecho como software: versionado, trazable, reversible, operado por Kortex/Greenhouse. La prueba la cargan el mecanismo + Kortex publicado en el HubSpot Marketplace, no el adjetivo. Debajo opera el argumento *JOLT* contra la indecisión (miedo a elegir mal / migración fallida): trazabilidad y reversibilidad reducen el riesgo percibido del cambio, sin prometer de más.

### Alcance regional (todo el mundo de habla hispana, ahora)

El servicio HubSpot se presta a **toda LATAM + mercados hispanos (España incluida como mercado hispano)** desde el inicio, no CL-first. Coherente con `PRODUCT_ROADMAP.md` §Later (Internacionalización LATAM-first → EEUU → mundo), pero adelantado a **"ahora, pan-hispano"** para esta superficie porque su demanda no es de búsqueda local sino de canal (co-sell, Solutions Directory, directo) — que ya es multi-país. Reglas de alcance:

- **Copy es-LATAM neutro** (tuteo pan-hispano, sin voseo ni chilenismos); moneda/ejemplos neutros o en USD; nada país-específico en la promesa.
- **`hreflang`-ready desde el build:** dejar la estructura preparada para una variante `en-US` futura (EEUU tiene la demanda de partner real: 1.600/mes) sin re-migrar. No se construye `en-US` en este PDR; solo no se bloquea.
- **Prueba y compliance sin geo-lock:** casos citables de cualquier mercado hispano; el badge de partner y el co-sell aplican regionalmente (confirmar cobertura del PDM por país en ejecución).
- **Think pan-hispano:** el pillar de categoría ("CRM"/"Agentic CRM") se escribe para el bloque hispano completo (México solo ya son 40.500/mes en `crm`), no para CL.

## Consecuencias

- La landing es un **nodo de la capa de adquisición** (demand-capture + habilitación de venta) del ecosistema ([PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md)) en `efeoncepro.com`, con alcance **pan-hispano** (§Alcance regional). **No** es una spoke SEO: su embudo es co-sell (PDM) + Solutions Directory + directo/marca + cross-sell. Instrumentar UTMs por canal (y por país cuando aplique) para medirlo.
- **Slug canónico:** mantener **`/servicios-contratar-hubspot/`** (id `244079`). Actualizar la fila en el landing registry de `efeonce-public-site-wordpress` y su `references/landings/hubspot-services.md` antes del segundo cambio.
- **Decisión (a) — reposicionar vs. spoke nueva → RESUELTA (operador, 2026-07-07): reposicionar en sitio** `/servicios-contratar-hubspot/` (equity + cero riesgo 301 + sin fragmentación).
- **Decisión (b) — claim público de Kortex → RESUELTA (operador, 2026-07-07):** se puede afirmar que **Kortex es producto validado y está en el HubSpot Marketplace** (prueba verificable, con enlace al listing). Se sigue **sin** presentar como productiva la integración interna Greenhouse↔Kortex (staging-only, SSO broker OFF — `docs/architecture/kortex/README.md`): el claim público es sobre **el producto y su presencia en el Marketplace**, no sobre el runtime interno.
- **Follow-up de contenido (Think):** pillar de **categoría** — "CRM" (12.100) / "Agentic CRM" / "HubSpot vs Salesforce" / "HubSpot" — es donde vive el volumen real; captura autoridad top-of-funnel que enlaza a la página de servicio. TASK aparte bajo el eje Think/EPIC-020; no bloquea el diseño.
- **Gaps a resolver en ejecución:** (1) confirmar resultados HubSpot/CRM citables con métrica; (2) reverificar el estado de Breeze (roster/pricing) el día de publicación; (3) confirmar si Efeonce ya figura en el HubSpot Solutions Directory para el badge.
- **Ejecución:** `TASK-1352` bajo `EPIC-019`, `Execution profile: ui-ux`, `Domain: public-site`, `Backend impact: none`, con wireframe/flow/motion robustos en `docs/ui/`.

## Alternativas descartadas

- **Spoke nueva `/servicios/hubspot` + 301 desde la página actual** — sin upside de demanda (`partner hubspot` ~20/mes), agrega riesgo SEO y fragmenta el equity existente.
- **Ángulo SEO keyword-led** (como SEO/Redes Sociales) — la data de demanda lo mata: no hay búsqueda bottom-funnel de partner HubSpot en CL. Sería optimizar para tráfico que no existe.
- **Liderar con "Somos HubSpot Solutions Partner"** — commodity; lo dice todo partner y no podemos reforzarlo con un tier documentado.
- **Liderar con catálogo de agentes Breeze / features** — es la historia de HubSpot, no el diferenciador de Efeonce; y su pricing/roster cambia cada trimestre (quedaría stale).
- **Posicionar como consultora RevOps pura** (terreno de Revenue Hub Latam / AriseGTM) — fuerte, pero concede el wedge: no apalanca el software propio (Kortex/Greenhouse), que es lo único que la región no replica.
- **Afirmar tier Diamond/Platinum/Gold** — no hay dato que lo respalde; riesgo de credibilidad y de compliance del programa.
- **Build code-custom completo** — mejor medium-is-message pero más pesado; se reusa la página existente y se concentra el craft en la sección firma.
- **Nuevo lead magnet self-serve ("grader de HubSpot")** — es un producto aparte (como el grader AEO), no cabe en esta landing; el gancho liviano acá es el diagnóstico de portal atado a Kortex Portal Audit.

## No-goals

- No es self-serve; no expone el portal Greenhouse ni datos de cliente.
- No afirma un tier de partner (Diamond/Platinum/Gold) no documentado.
- No presenta la integración interna Greenhouse↔Kortex como productiva (es staging); posiciona el **producto Kortex —validado y publicado en el HubSpot Marketplace—** y su capability de deployment.
- No hardcodea el roster ni el pricing de Breeze (volátiles); describe categorías de agentes y el trabajo de gobernarlos.
- No lidera con features de HubSpot como si fueran de Efeonce.
- No usa `elementor_canvas`, custom sticky header ni header/wrapper overrides. No migra a Astro ni cambia de host.
- No cita GEA ni cifras infladas; no usa Berel como prueba de co-selling.
- No construye un motor de forms nuevo (reusa Growth Forms + portal 48713323).

## Delta 2026-07-07 — el "diagnóstico de portal" pasa de form a producto (EPIC-024)

El CTA secundario "Solicita un diagnóstico de tu portal HubSpot" deja de ser un simple `<greenhouse-form>` y se convierte en un **lead magnet propio** — el **HubSpot Portal Grader** — con motor en Kortex, contrato gobernado en Greenhouse y superficie pública en Think (modelo híbrido de dos puertas: self-assessment público + auditoría conectada). Posicionamiento en [PDR-007](PDR-007-hubspot-portal-grader-lead-magnet.md); arquitectura en [`GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md`](../../architecture/GREENHOUSE_HUBSPOT_PORTAL_GRADER_DECISION_V1.md); programa en [EPIC-024](../../epics/to-do/EPIC-024-hubspot-portal-grader.md). Consecuencia para esta landing: el CTA secundario **apuntará a la superficie de Think** (patrón del AI Visibility Grader) una vez que la Fase 1 (puerta pública) esté live; hasta entonces, el `<greenhouse-form>`/fallback de TASK-1352 sigue siendo el interino. No cambia el posicionamiento de la landing (este PDR), solo el destino del gancho.
