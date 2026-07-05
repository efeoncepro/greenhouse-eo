---
name: digital-marketing
description: >-
  Skill experta y robusta de Marketing Digital (canales, craft y campañas) al
  estado del arte 2026. Úsala para planear, ejecutar y auditar marketing por
  canal: marca y arquitectura de mensaje en digital, content marketing (estrategia
  editorial, formatos, distribución, thought leadership, GEO como canal), paid
  media / performance advertising (Google/Meta/LinkedIn/TikTok, PMax/Advantage+,
  programmatic, retargeting, estructura de cuenta, bidding, presupuesto/pacing,
  creative testing, signal loss post-cookie, IA en pauta), social orgánico +
  comunidad (creator/influencer economy, dark social, community-led), creatividad
  y video (creative-as-targeting, hooks, UGC, IA creativa), email marketing y
  marketing automation como canal (newsletters, nurture/drip, segmentación, MAP),
  campañas integradas y GTM launches (PR digital, influencer, ABM), martech y
  marketing ops (stack, CDP, first-party data, taxonomía UTM, tag management,
  reporting) e IA en marketing (generativo, agentes, gobernanza/brand safety).
  COMPLEMENTARIA pero DISTINTA de growth-marketing-cro: Digital Marketing TRAE y
  ENGANCHA a la audiencia por canales; Growth+CRO la CONVIERTE, ACTIVA, RETIENE y
  MIDE como sistema. Delega a growth-marketing-cro (CRO/conversión, experimentación,
  activación, retención, arquitectura de atribución/tracking, loops, PLG), a seo-aeo
  (SEO técnico/AEO/GEO por-motor/schema), a commercial-expert (pricing/pipeline/
  quote-to-cash), a efeonce-agency (doctrina marca/GTM/ASaaS), a efeonce-public-site-
  wordpress (publishing + AI Content Factory) y a greenhouse-email (plantillas/entrega
  runtime). Incluye overlay Efeonce/Greenhouse. Triggers: "marketing digital",
  "campaña", "campaign brief", "paid media", "pauta", "publicidad", "Google Ads",
  "Meta Ads", "Facebook Ads", "Instagram Ads", "LinkedIn Ads", "TikTok Ads",
  "programmatic", "PMax", "Performance Max", "Advantage+", "retargeting",
  "remarketing", "ROAS", "CPM", "CPC", "CPA", "content marketing", "calendario de
  contenido", "content calendar", "thought leadership", "social media", "redes
  sociales", "community", "comunidad", "influencer", "creator", "UGC", "creative",
  "ad creative", "video marketing", "email marketing", "newsletter", "nurture",
  "drip", "marketing automation", "MAP", "campaña integrada", "GTM launch",
  "lanzamiento", "ABM", "account-based marketing", "digital PR", "martech", "CDP",
  "first-party data", "UTM", "media mix", "brand awareness", "IA en marketing",
  "generative marketing", "agentic marketing".
user-invocable: true
argument-hint: "[canal/campaña o pregunta específica — ej: 'plan de paid media para /aeo-2', 'campaña de lanzamiento del grader', 'calendario de contenido del blog', 'estrategia de LinkedIn B2B']"
---

# Marketing Digital — Skill operativa 2026

> **Ecosistema digital Efeonce — layering canónico** (SSOT: `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`; índice `docs/public-site/`). Dos ejes ortogonales: **superficies** front-of-house (por audiencia/etapa de funnel — **adquisición** como continuo bow-tie: `Think` = demand-gen + nurturing top-of-funnel [blog *Marketing con Manzanitas* → *Glitch* newsletter semanal IA/Marketing/Negocios + tools *AI Visibility Grader*/ebooks/webinars] · sitio `efeoncepro.com` = demand-capture + conversión; **experiencia** con dos caras: cliente [sky → `experiencia.efeoncepro.com`] y operador [cockpit Greenhouse]) que consumen **plataformas/backbones** (runtime Greenhouse PG+BQ/360, **Kortex** = CRM peer system + producto, Verk). El grader es la costura top→bottom. Cargar PDR-003 al razonar sobre superficies, capas, hosts o dónde nace una capacidad del ecosistema.

> **Qué es esto.** Una skill de dos manos: **(1) conocimiento experto** del marketing
> digital por **canales, craft y campañas** al estado del arte 2026, y **(2) capacidad
> de ejecución** (planear una campaña integrada, estructurar una cuenta de paid media,
> armar un calendario editorial, escribir un brief creativo, definir un plan ABM,
> mapear el martech stack). **Complementaria pero distinta** de `growth-marketing-cro`.

> **La distinción de una frase.** **Marketing Digital TRAE y ENGANCHA a la audiencia
> por canales; Growth+CRO la CONVIERTE, ACTIVA, RETIENE y MIDE como sistema.** Si la
> pregunta es de conversión/experimentación/activación/retención/atribución/loops/PLG,
> **NO es esta skill** → `growth-marketing-cro`. Ver §6.

> **Sello de frescura.** Núcleo verificado **as-of 2026-07**. Este dominio se mueve
> cada trimestre (plataformas de ads, IA en pauta/creatividad, signal loss, martech
> consolidation, algoritmos sociales, GEO). Antes de afirmar algo volátil (un
> benchmark, un feature de plataforma, un umbral, qué tool lidera), **reverifica con
> WebSearch/WebFetch** y marca el `as-of`. Volatilidad por tema en `SOURCES.md`.

---

## 0. Cómo se usa esta skill (orden obligatorio)

`objetivo → audiencia/mensaje → canal-mix → creatividad → ejecución → medición`

1. **Objetivo de negocio primero.** ¿Awareness, demanda, leads, engagement, lanzamiento?
   Define el KPI del canal antes de elegir táctica. **Diagnostica antes de gastar.**
2. **Audiencia y mensaje antes que canal.** ¿A quién le hablas y qué le dices? El
   mensaje/insight antecede a la elección de plataforma (`01_BRAND_MESSAGING.md`).
3. **Canal-mix por fit, no por moda.** Elige canales por dónde está la audiencia + el
   objetivo + la economía, no por hype. Diversifica (`07_INTEGRATED_CAMPAIGNS.md`).
4. **Carga solo el módulo que aplica.** Esta skill es un router. Los módulos
   (`modules/*.md`) son load-on-demand. Abre el que el problema exige (mapa en §3).
5. **La creatividad es la palanca.** En 2026 el algoritmo optimiza la entrega; el
   diferencial es el volumen y calidad de creativos (`05_CREATIVE_VIDEO.md`).
6. **Ejecuta con brand safety y ética.** Contrasta toda táctica con `ANTIPATTERNS.md`
   (no comprar audiencias, no dark patterns, no engagement bait, no IA sin gobernanza).
7. **Mide por canal, cede la atribución.** Esta skill reporta performance por canal +
   taxonomía UTM; la **arquitectura de atribución/MMM/tracking plan es de
   `growth-marketing-cro`** (`08_MARTECH_MARKETING_OPS.md` explica la costura).

---

## 1. Modelo mental: brand + performance NO son dicotomía

El marketing digital eficaz de 2026 opera **dos velocidades como un solo sistema**:

```
┌──────────────────────────────────────────────────────────────┐
│  BRAND / DEMAND CREATION (largo plazo)                         │
│  awareness · mensaje · content · social · thought leadership   │
│  → crea demanda futura, memoria y confianza                    │
├──────────────────────────────────────────────────────────────┤
│  PERFORMANCE / DEMAND CAPTURE (corto plazo)                    │
│  paid media · retargeting · email · ABM                        │
│  → captura la demanda que ya existe                            │
└──────────────────────────────────────────────────────────────┘
        ambas alimentan el motor de GROWTH+CRO (conversión/retención)
```

**Tesis 2026:**
- **La IA se comió la operativa de pauta.** PMax (~91% adopción) y Advantage+ (~88%)
  concentran el gasto; el trabajo humano se corre a **audiencias (first-party), calidad
  de señal de conversión y creatividad**. Quien alimenta mal la señal, la IA optimiza
  hacia el resultado equivocado (`03`).
- **La creatividad es el nuevo targeting.** Con delivery automatizado, el diferencial es
  el **volumen y velocidad de creativos** (matriz 3×2×2 → 12 variantes, escalar
  ganadores). UGC/creator-style gana en confianza (`05`).
- **El descubrimiento ya no es Google-first.** GEO / AI-search (AI Overviews, ChatGPT,
  Perplexity) es un canal de contenido con referral +800% YoY; el content marketing se
  optimiza para "search everywhere" (`02`; táctica técnica → `seo-aeo`).
- **Social se mueve a comunidad y knowledge-creators.** Substack/Discord/Reddit/LinkedIn,
  personal brands ejecutivos, B2B creators (2.8× leads) por sobre el brand handle clásico
  (`04`).
- **Martech se consolida sobre first-party data.** CDP absorbido por las suites; stack
  componible sobre el data warehouse; first-party = el activo (+20% LTV / −15% CAC) (`08`).
- **Marketing agéntico:** la IA pasa de generar a **ejecutar** (McKinsey: ~2/3 de las
  actividades de marketing), pero con un gap de gobernanza brutal (22% del presupuesto en
  generación vs 3% en governance) → brand safety es infraestructura, no adorno (`09`).

---

## 2. Intake (correr SIEMPRE antes de recomendar)

| # | Pregunta | Por qué cambia la recomendación |
|---|----------|---------------------------------|
| 1 | **¿Objetivo?** awareness / demanda / leads / engagement / lanzamiento / retención de marca | Define KPI, canal-mix y si es brand o performance. |
| 2 | **¿Audiencia / ICP?** B2B comité de compra / B2C / segmento | B2B = ABM + LinkedIn + long cycle; B2C = volumen + social + video. |
| 3 | **¿Mensaje / insight?** ¿propuesta, ángulo, voz? | El mensaje antecede al canal; sin él, la campaña es ruido. |
| 4 | **¿Presupuesto y horizonte?** | Define media mix, brand vs performance split, y si hay para paid. |
| 5 | **¿Qué canales tiene/usa hoy?** owned/earned/paid | Punto de partida real; evita recomendar canales sin capacidad de ejecución. |
| 6 | **¿Creatividad disponible?** ¿equipo, UGC, video, IA? | La creatividad es la palanca; sin variantes, el paid se satura. |
| 7 | **¿Martech / medición?** CRM, MAP, GA4, CDP, UTM | Define qué se puede orquestar y reportar (atribución → growth). |
| 8 | **¿Objetivo de negocio downstream?** lead→pipeline / venta / uso | Ata el canal al funnel; el cierre y la conversión son de otras skills. |

**Salida:** lectura del caso + canal-mix propuesto + 3–5 movimientos priorizados + cómo se
mide cada canal. Nunca saltes a "hagamos TikTok" sin objetivo/audiencia/mensaje.

---

## 3. Mapa de módulos (load-on-demand)

| Si el trabajo es… | Carga |
|---|---|
| Posicionamiento en digital, **arquitectura de mensaje**, sistema de marca online, awareness, brand vs performance | `modules/01_BRAND_MESSAGING.md` |
| **Content marketing**: estrategia editorial, formatos, distribución, repurposing, thought leadership, content-led demand, GEO como canal | `modules/02_CONTENT_MARKETING.md` |
| **Paid media / performance advertising**: Google/Meta/LinkedIn/TikTok, PMax/Advantage+, programmatic, retargeting, cuentas, bidding, presupuesto, creative testing, signal loss, IA | `modules/03_PAID_MEDIA.md` ⭐ |
| **Social orgánico + comunidad** (nivel canal/estrategia): rol de social en el mix, calendario dentro de la campaña integrada | `modules/04_ORGANIC_SOCIAL_COMMUNITY.md` — para **ejecución profunda por red** (algoritmos/formatos/comunidad/creator/social commerce/producción + programar con Metricool) → skill **`social-media-studio`** |
| **Creatividad y video**: creative strategy, creative-as-targeting, hooks, formatos, video-first, UGC ads, IA creativa | `modules/05_CREATIVE_VIDEO.md` |
| **Email marketing / automation como canal**: newsletters, campañas, nurture/drip, segmentación, MAP | `modules/06_EMAIL_MARKETING_AUTOMATION.md` |
| **Campañas integradas / GTM launches**: orquestación multicanal, messaging architecture, calendarios, presupuesto, PR digital, influencer, **ABM** | `modules/07_INTEGRATED_CAMPAIGNS.md` |
| **Martech / marketing ops**: stack, CDP, first-party data, **taxonomía UTM/campaña**, tag management, reporting, consolidación | `modules/08_MARTECH_MARKETING_OPS.md` |
| **IA en marketing**: generativo (contenido/creativo), **agentes de marketing**, GEO/AI-search como canal, personalización a escala, gobernanza/brand safety | `modules/09_AI_IN_MARKETING.md` ⭐ |
| Qué **NO** hacer (spray-and-pray, vanity reach, comprar audiencias, engagement bait, IA sin gobernanza) | `ANTIPATTERNS.md` |
| Vocabulario (CPM/CPC/CPA/ROAS, PMax/Advantage+, MQL, MAP/CDP, GEO, share of voice, etc.) | `GLOSSARY.md` |
| Fuentes + benchmarks 2026 + qué reverificar | `SOURCES.md` |
| **Caso Efeonce/Greenhouse**: boundary con growth, marca/voz, content engine (AI Content Factory), email como canal, gaps de martech | `efeonce/` (empezar por `EFEONCE_OVERLAY.md`) |
| Artefactos listos | `templates/` (campaign brief, integrated campaign plan, content calendar, content brief, paid media plan, creative brief, social plan, UTM convention, ABM play, martech stack map) |

---

## 4. Presupuesto y canal-mix (cómo asignar)

- **Regla 95/5 / brand-performance split:** la mayoría de la demanda es futura (95% no
  está lista para comprar hoy). Un mix sano combina **demand creation** (brand/content/
  social, largo plazo) + **demand capture** (paid/retargeting/email/ABM, corto plazo).
  El split típico B2B ronda 40–60% brand / resto performance (validar por etapa/objetivo).
- **Diversifica canales:** los de menor costo-por-resultado combinan varios canales; el
  monocanal es frágil (riesgo de plataforma/algoritmo).
- **Prioriza por objetivo × fit × economía**, no por hype. Un canal sin audiencia ICP o
  sin creatividad para alimentarlo es gasto perdido.
- La **economía del canal (CAC/payback) y el channel-market fit estratégico** los decide
  `growth-marketing-cro` (02); esta skill ejecuta el canal elegido.

---

## 5. Herramientas (esta skill ejecuta, no solo asesora)

- **WebSearch / WebFetch** — frescura de benchmarks/features/algoritmos 2026; research de
  competidores y de voz de audiencia; teardown de campañas vivas. Cita fuente + `as-of`.
- **MCP disponibles (si el entorno los expone):** **HubSpot** (campañas/marketing/CRM),
  **Metricool** (social scheduling/analytics), **Semrush** (keyword/competencia/paid).
  Úsalos para datos reales; si no hay tool callable, declara la limitación.
- **Generación de artefactos** — campaign brief, plan de medios, calendario editorial,
  brief creativo, plan ABM, mapa de stack. Plantillas en `templates/`.
- **Skills del repo para ejecutar:** publishing + AI Content Factory →
  `efeonce-public-site-wordpress`; plantillas/entrega de email → `greenhouse-email`; lead
  forms → `greenhouse-growth-forms`; copy/UX-writing → `src/lib/copy/` +
  `greenhouse-ux-content-accessibility` (Codex); logos de medios de pago →
  `greenhouse-digital-brand-asset-designer` (NO para marca general).

**Regla de honestidad de datos:** si no puedes medir un canal (sin acceso, sin tag), dilo
explícito y marca el número como *estimado*. Nunca presentes benchmark de mercado como tu
resultado real.

---

## 6. Boundary: qué es de esta skill y qué NO (la costura con Growth+CRO)

**Complementarias, no iguales.** Donde tocan el mismo terreno, esta es la repartición
(detalle + regla de precedencia en `efeonce/DIGITAL_MARKETING_BOUNDARY.md`):

| Terreno | Digital Marketing (esta skill) | Hand-off a |
|---|---|---|
| **Email** | craft de canal: newsletters, campañas, nurture, segmentación, MAP | triggers lifecycle/retención → `growth-marketing-cro`; plantillas/entrega → `greenhouse-email` |
| **Medición** | reporting por canal, **taxonomía UTM**, tag management | atribución/MMM/incrementality/tracking plan → `growth-marketing-cro` |
| **Landing pages** | pauta/creatividad que trae el tráfico + coordina la landing | **optimización de conversión** de esa landing → `growth-marketing-cro` (CRO) |
| **Contenido** | estrategia/producción/distribución de content marketing | táctica SEO/schema/AEO por-motor → `seo-aeo`; content *loop* → `growth-marketing-cro` |
| **Canales de adquisición** | ejecución del canal (cuentas, creativos, bidding) | channel-market fit + CAC/payback → `growth-marketing-cro` |
| **Marca / GTM / ICP** | expresión de marca en campañas | doctrina marca/ASaaS/GTM → `efeonce-agency`; pricing/pipeline → `commercial-expert` |
| **Sitio público** | qué publicar / qué campaña | publishing WP/Astro + AI Content Factory → `efeonce-public-site-wordpress` |

**Regla de oro:** si la pregunta es **cómo convertir, experimentar, activar, retener,
atribuir o modelar loops/PLG** → es `growth-marketing-cro`. Si es **cómo traer, enganchar,
crear demanda y ejecutar campañas por canal** → es esta. Cuando cruza (siempre en
marketing), **nómbralo y encadena** a la skill dueña.

---

## 7. Voz, idioma y entrega

- **Idioma:** por defecto **es-CL neutro, tuteo** (puedes/quieres/dime), **sin voseo**.
  Términos técnicos en inglés cuando son estándar (paid media, PMax, hook, ROAS, MAP, ABM,
  GEO). Cambia a en-US si la tarea está en inglés.
- **Copy visible** del sitio/campañas se valida con `greenhouse-ux-content-accessibility`
  (Codex) + `docs/context/05_voz-tono-estilo.md`; esta skill decide el *ángulo/mensaje*.
- **Entregables accionables:** objetivo → canal-mix → 3–5 movimientos → cómo se mide.
- **Cita fuentes y `as-of`** en todo dato de mercado.

---

## 8. Principios cross-cutting

1. **Audiencia y mensaje antes que canal.** El canal es el "dónde"; el insight es el "qué"
   y el "porqué". Sin mensaje, más gasto = más ruido.
2. **Brand + performance como sistema.** Demand creation (futuro) + demand capture (hoy).
   Sacrificar brand por performance vacía el pipeline futuro.
3. **La creatividad es la palanca de 2026.** El algoritmo optimiza la entrega; tú aportas
   volumen y calidad de creativos. Pocas variantes = techo de resultados.
4. **Alimenta bien a la IA o te optimiza mal.** Señal de conversión y first-party data son
   el combustible de PMax/Advantage+; basura entra, basura sale.
5. **Mide por canal, cede la atribución.** Reporta performance + UTM; la verdad de
   asignación cross-canal es de `growth-marketing-cro` (MMM/incrementality).
6. **First-party data es el activo.** Post-cookie, la ventaja es el dato propio y
   consentido, no el identificador de terceros.
7. **Brand safety y gobernanza de IA no son opcionales.** Contenido/creatividad agéntica
   sin oversight = riesgo de marca, legal y de confianza. Ética por diseño (`ANTIPATTERNS`).
8. **Diversifica canales.** El monocanal es frágil. Portafolio > apuesta única al algoritmo
   de una plataforma.
