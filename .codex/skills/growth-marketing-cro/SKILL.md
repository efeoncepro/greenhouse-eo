---
name: growth-marketing-cro
description: >-
  Skill experta y robusta de Growth Marketing + CRO (Conversion Rate
  Optimization) y optimización de sitios web, al estado del arte 2026. Úsala para
  diagnosticar, modelar, priorizar, experimentar y medir crecimiento pre-pipeline.
  Cubre growth strategy & modeling (growth loops vs funnels, North Star Metric,
  AARRR, growth-model math, ICE/RICE), adquisición (paid/organic, PLG vs SLG,
  content-led, referral/viral loops con k-factor, CAC/payback, multicanal),
  CRO + tácticas de conversión web (anatomía de landing, value proposition, trust
  signals/social proof, copy/CTA, friction audit, LIFT/Fogg/PXL/MECLABS,
  velocidad Core Web Vitals→conversión, formularios y checkout, mobile-first,
  message-market fit, personalización con IA, zero-party data), experimentación &
  A/B testing (hipótesis, MDE/sample size, frecuentista vs bayesiano, sequential,
  CUPED, guardrails, velocidad, pitfalls, tooling), activación & onboarding (aha
  moment, time-to-value, PQL), retención & lifecycle (cohortes, curvas, dunning,
  email/CRM, churn, engagement loops), Product-Led Growth (freemium/free trial/reverse
  trial, paywall/feature gating, free→paid, NRR/expansión, Product-Led Sales con
  PQL/PQA, PLG en la era IA) y medición (atribución post-cookie, MMM,
  incrementality, tracking plan/event taxonomy, GA4/server-side, north-star
  instrumentation) — más el impacto de la web agéntica en el funnel. Delega SEO/AEO
  a la skill seo-aeo, pipeline/ventas/pricing/RevOps a commercial-expert y doctrina
  de negocio a efeonce-agency. Incluye overlay Efeonce/Greenhouse (AEO grader como
  lead magnet, growth forms/HubSpot, tracking engine, party funnel, GSC, /aeo-2,
  Ley 21.719). Triggers: "growth", "growth marketing", "growth loop", "CRO",
  "conversion rate", "optimización de conversión", "optimizar sitio web", "landing
  page", "tasa de conversión", "A/B test", "experimento", "MDE", "sample size",
  "significancia", "bayesiano", "CUPED", "funnel", "embudo", "activación", "aha
  moment", "time-to-value", "PQL", "retención", "cohorte", "churn", "dunning",
  "lifecycle", "email marketing", "deliverability", "North Star Metric", "AARRR",
  "pirate metrics", "LTV", "CAC", "payback", "atribución", "MMM", "incrementality",
  "tracking plan", "event taxonomy", "GA4", "consent mode", "server-side tracking",
  "PLG", "lead magnet", "referral", "viral loop", "k-factor", "onboarding",
  "message-market fit", "value proposition", "trust signals", "social proof",
  "CTA", "checkout", "cart abandonment", "Core Web Vitals", "personalización".
user-invocable: true
argument-hint: "[área de growth/CRO o pregunta específica — ej: 'auditar conversión de /aeo-2', 'diseñar experimento del lead magnet', 'modelar el growth loop del grader']"
---

# Growth Marketing + CRO — Skill operativa 2026

> **Ecosistema digital Efeonce — layering canónico** (SSOT: `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`; índice `docs/public-site/`). Dos ejes ortogonales: **superficies** front-of-house (por audiencia/etapa de funnel — **adquisición** como continuo bow-tie: `Think` = demand-gen + nurturing top-of-funnel [blog *Marketing con Manzanitas* → *Glitch* newsletter semanal IA/Marketing/Negocios + tools *AI Visibility Grader*/ebooks/webinars] · sitio `efeoncepro.com` = demand-capture + conversión; **experiencia** con dos caras: cliente [sky → `experiencia.efeoncepro.com`] y operador [cockpit Greenhouse]) que consumen **plataformas/backbones** (runtime Greenhouse PG+BQ/360, **Kortex** = CRM peer system + producto, Verk). El grader es la costura top→bottom. Cargar PDR-003 al razonar sobre superficies, capas, hosts o dónde nace una capacidad del ecosistema.

> **Qué es esto.** Una skill de dos manos: **(1) conocimiento experto** del
> dominio *growth pre-pipeline* (adquisición, conversión, activación, retención,
> medición) al estado del arte 2026, y **(2) capacidad de ejecución**
> (diagnosticar un funnel, modelar loops, diseñar un experimento estadísticamente
> honesto, auditar una landing, escribir un tracking plan, emitir artefactos).
> No es un volcado de teoría: **diagnostica antes de prescribir**, **modela antes
> de optimizar** y **prioriza por impacto**.

> **Sello de frescura.** Núcleo verificado **as-of 2026-07**. Este dominio se
> mueve cada trimestre (plataformas de ads, GA4/privacy, reglas de deliverability,
> umbrales Core Web Vitals, tooling de experimentación, impacto de la web
> agéntica). Antes de afirmar algo volátil (un benchmark, un umbral, una regla de
> Gmail/Yahoo, qué tool lidera, el estado de agentic commerce), **reverifica con
> WebSearch/WebFetch**. Niveles de volatilidad por tema en `SOURCES.md`.

---

## 0. Cómo se usa esta skill (orden obligatorio)

`diagnose → model → prioritize → experiment → measure`

1. **Diagnostica primero.** Nunca prescribas una lista genérica de "10 growth
   hacks". Corre el **intake** (§2). Sin contexto (etapa, motion, funnel actual,
   NSM, dato disponible) la recomendación es ruido.
2. **Modela el crecimiento como un sistema, no como un embudo lineal.** ¿Cuál es
   el loop? ¿Cuál es la North Star Metric y sus inputs? (`01_GROWTH_STRATEGY_MODELING.md`).
   Optimizar una etapa suelta sin entender el loop produce máximos locales.
3. **Carga solo el módulo que aplica.** Esta skill es un router. Los módulos
   (`modules/*.md`) son load-on-demand. No los leas todos; abre el que el problema
   exige (mapa en §3).
4. **Prioriza.** Toda recomendación sale ordenada por **ICE/RICE** (§4), no como
   backlog plano. El operador quiere saber *qué hacer primero*.
5. **Experimenta con honestidad estadística.** Si propones un test, define
   hipótesis, métrica primaria, MDE, sample size y guardrails **antes** de correrlo
   (`04_EXPERIMENTATION.md`). Nada de "lo dejamos hasta que gane".
6. **Verifica lo volátil.** Si vas a citar una cifra 2026 (benchmark de conversión,
   umbral CWV, regla de deliverability), pásala por WebSearch/WebFetch antes de
   escribirla como hecho, y marca el `as-of`.
7. **Cierra con medición.** Ninguna recomendación está completa sin decir *cómo se
   instrumenta y se mide* (`07_MEASUREMENT_ANALYTICS.md`). Sin tracking plan, el
   experimento no existe.
8. **Respeta los guardrails.** Contrasta toda táctica agresiva con `ANTIPATTERNS.md`
   (p-hacking, vanity metrics, dark patterns, scarcity falsa). Efeonce no hace
   growth basura.

---

## 1. Modelo mental: el crecimiento es un LOOP, no un embudo

El funnel (AARRR / pirate metrics: Acquisition → Activation → Retention →
Referral → Revenue) sigue siendo un **lenguaje de diagnóstico** útil para hallar
la fuga. Pero el motor de crecimiento sostenible de 2026 es el **growth loop**: la
salida de un ciclo re-alimenta la entrada del siguiente.

```
┌──────────────────────────────────────────────────────────────┐
│  GROWTH LOOP  (el output re-alimenta el input)                │
│                                                                │
│   nuevos usuarios ──▶ acción que genera valor ──▶ output       │
│        ▲                (contenido, invitación, señal)         │
│        │                          │                            │
│        └──────────  atrae nuevos usuarios  ◀───────────────────┘
│                                                                │
│  Tipos: viral (invitación), content (UGC/SEO), paid           │
│  (LTV re-invertida en CAC), sales (expansión → referidos).     │
└──────────────────────────────────────────────────────────────┘
        │  Se DIAGNOSTICA con el funnel AARRR:                    
        ▼  ¿dónde está la fuga? adquisición · activación ·        
           retención · referral · revenue                        
```

**Tesis 2026:**
- **La retención es la base, no una etapa más.** Un funnel con buena adquisición y
  mala retención es un balde con fuga (*leaky bucket*): cuanto más echas, más
  desperdicias. Se arregla la retención **antes** de escalar adquisición.
- **La activación es el nuevo cuello de botella.** 40–60% de los free users nunca
  llegan a activarse ("zombie users"), y solo ~34% de las empresas PLG trackean
  activación (*as-of 2026*). La activación ya no es un detalle de UX de tope de
  embudo: es el borde de ataque de la Net Revenue Retention.
- **CAC sube estructuralmente** (+40–60% desde 2023; +222% en 8 años *as-of 2026*):
  competencia, privacy, costo de ads, ciclos B2B más largos (~134 días). La defensa
  no es "un canal mágico" sino **diversificación** (los de menor CAC combinan 6–9
  canales, cada uno 5–20% de la adquisición) + **loops propios** (referral, content).
- **La web agéntica comprime el funnel.** Agentes IA saltan el "scroll → click →
  convert": van de intención a transacción. Esto mueve el trabajo de conversión
  hacia datos estructurados, feeds, schema y *ser citado/recuperado* (→ overlay
  agentic-readiness + skill `seo-aeo`), no solo hacia la landing humana.

---

## 2. Intake diagnóstico (correr SIEMPRE antes de recomendar)

Si el operador no dio estos datos, pregúntalos o asume el caso Efeonce/Greenhouse
y decláralo. Ramifica la recomendación según las respuestas.

| # | Pregunta | Por qué cambia la recomendación |
|---|----------|---------------------------------|
| 1 | **¿Qué etapa/objetivo?** Pre-PMF / escalar adquisición / arreglar activación / frenar churn / abrir un canal | Define el módulo y si el problema es de loop, de conversión o de retención. |
| 2 | **¿Qué motion?** PLG self-serve / sales-led / híbrido / lead-gen a servicio | PLG optimiza producto+activación; sales-led optimiza pipeline (→ `commercial-expert`). |
| 3 | **¿Cuál es la North Star Metric y su funnel actual?** ¿Números por etapa? | Sin NSM ni funnel numérico no hay diagnóstico: hay opinión. |
| 4 | **¿Dónde está la fuga?** ¿Adquisición cara / activación baja / churn alto / referral inexistente? | Se ataca la fuga mayor primero, no la etapa más "sexy". |
| 5 | **¿B2B o B2C? ¿Ticket/ciclo?** | B2B = comité de compra, ciclo largo, PQL/MQL; B2C = volumen, velocidad de loop. |
| 6 | **¿Qué superficie se optimiza?** Landing pública / signup / onboarding / checkout / email | Cambia el módulo (CRO vs activación vs lifecycle) y las tácticas. |
| 7 | **¿Qué dato/tooling hay?** GA4, warehouse, tool de experimentación, tráfico real | Define qué se puede medir/testear de verdad vs estimar, y si hay tráfico para A/B. |
| 8 | **¿Recursos?** ¿Dev? ¿Contenido? ¿Presupuesto de ads? ¿Velocidad de release? | ICE/RICE realista: no propongas experimentación continua sin bandwidth de ejecución. |

**Salida del intake:** un párrafo de "lectura del caso" + el/los módulos a cargar +
los 3–5 movimientos priorizados. Nunca saltes directo a tácticas.

**Regla de tráfico para experimentar:** si el volumen no da para significancia en
≤4 semanas, NO recomiendes A/B clásico como primer paso — usa research cualitativo,
heurísticas (LIFT/MECLABS), CUPED o cambios de alta confianza. Detalle en `04`.

---

## 3. Mapa de módulos (load-on-demand)

| Si el problema es… | Carga |
|---|---|
| Modelar el crecimiento: growth loops vs funnel, **North Star Metric** + inputs, AARRR, growth-model math, channel-market fit, priorización | `modules/01_GROWTH_STRATEGY_MODELING.md` |
| Traer usuarios: canales paid/organic, **PLG vs SLG**, content-led, **referral/viral loops (k-factor)**, CAC/payback, blended CAC, multicanal | `modules/02_ACQUISITION.md` |
| **Convertir tráfico y optimizar el sitio**: value prop, trust/social proof, copy/CTA, LIFT/Fogg/PXL/MECLABS, **velocidad→conversión (CWV)**, **formularios/checkout**, mobile, personalización IA | `modules/03_CRO.md` ⭐ |
| Testear en serio: hipótesis, **MDE/sample size**, frecuentista vs bayesiano, **sequential**, **CUPED**, guardrails, velocidad, pitfalls, tooling | `modules/04_EXPERIMENTATION.md` |
| Que el usuario llegue al valor: **aha moment**, time-to-value, activation metric, onboarding, PQL, empty states | `modules/05_ACTIVATION_ONBOARDING.md` |
| Que se quede y se expanda: **cohortes**, curvas de retención, dunning, lifecycle/email, churn, engagement loops, NRR | `modules/06_RETENTION_LIFECYCLE.md` |
| Medir sin cookies: **atribución post-cookie**, MMM, incrementality, **tracking plan/event taxonomy**, GA4/server-side, consent, north-star instrumentation | `modules/07_MEASUREMENT_ANALYTICS.md` |
| Ejecutar end-to-end: lanzar lead magnet, **teardown de landing**, construir growth model, correr experimento, diagnosticar funnel con fugas, **optimizar un sitio web** | `modules/08_PLAYBOOKS.md` |
| **Product-Led Growth**: ¿PLG encaja?, freemium/free trial/**reverse trial**, paywall/feature gating, métricas PLG (free→paid, NRR, TTV), **Product-Led Sales (PQL/PQA)**, PLG en la era IA | `modules/09_PLG_PRODUCT_LED.md` ⭐ |
| Qué **NO** hacer (vanity metrics, p-hacking, dark patterns, scarcity falsa, atribución ingenua) | `ANTIPATTERNS.md` |
| Vocabulario (NSM, AARRR, MDE, CUPED, k-factor, PQL, NRR, MMM, etc.) | `GLOSSARY.md` |
| Fuentes canónicas + qué reverificar y cada cuánto | `SOURCES.md` |
| **Caso Efeonce/Greenhouse**: boundary del dominio growth, el AEO grader como lead magnet, growth forms/HubSpot, medición en el repo, CRO del sitio público | `efeonce/` (empezar por `EFEONCE_OVERLAY.md`) |
| Artefactos listos para usar | `templates/` (growth model, experiment brief, CRO audit, funnel diagnosis, landing teardown, tracking plan, lifecycle email map, NSM worksheet, message-market fit) |

---

## 4. Priorización ICE / RICE (toda recomendación sale ordenada)

No entregues backlogs planos. Para growth rápido usa **ICE**; para roadmap
plurianual o cross-equipo usa **RICE**.

```
ICE  = (Impact × Confidence × Ease) / 3           # rápido, para volumen de tests
RICE = (Reach × Impact × Confidence) / Effort     # roadmap, cross-team

Reach      = usuarios/eventos afectados por período
Impact     = 3 masivo · 2 alto · 1 medio · 0.5 bajo · 0.25 mínimo
Confidence = 100% probado · 80% razonable · 50% especulativo
Effort/Ease= persona-semanas (Effort) o escala 1–10 inversa (Ease)
```

**Regla de oro de priorización:** ataca **primero la fuga con mayor `impacto ×
tráfico`**, no la etapa más visible. Un +2pp en un paso con 100k visitas/mes vence
a duplicar la conversión de un paso con 300 visitas/mes. Y si la retención está
rota, ninguna optimización de adquisición compone — arréglala primero.

**Para CRO específicamente**, prioriza con **PXL** (framework de CXL: puntúa si el
cambio está above-the-fold, es notable en <5s, agrega/quita elementos, corre en
páginas de alto tráfico, ataca motivación) en lugar de ICE puro — reduce el sesgo
optimista. Ver `03_CRO.md`.

---

## 5. Herramientas (esta skill ejecuta, no solo asesora)

- **WebSearch / WebFetch** — (a) frescura de benchmarks/umbrales/reglas 2026; (b)
  teardown de landings y competidores vivos; (c) research de mensaje (voz del
  cliente, reviews). Regla: cita fuente y `as-of` para toda cifra de mercado.
- **Analítica del repo (overlay)** — GA4/GSC/warehouse cuando existan; el `growth`
  domain de Greenhouse (`src/lib/growth/**`) y el `tracking-engine` (propuesto).
  No dupliques esa lógica: enlaza (`efeonce/MEASUREMENT_IN_GREENHOUSE.md`).
- **HubSpot MCP** — para atribución a leads/deals y funnel comercial cuando esté
  disponible; la escritura canónica a HubSpot va por el cliente in-app, no por el
  bridge legacy (ver overlay + skill `hubspot-greenhouse-bridge`).
- **Generación de artefactos** — growth model, experiment brief, tracking plan,
  CRO audit, landing teardown, lifecycle email map. Plantillas en `templates/`.
- **Skills UI del repo** — para *implementar* cambios de conversión en el portal o
  el sitio, invoca `greenhouse-ux`, `modern-ui`, `forms-ux`, `state-design`,
  `motion-design`, `greenhouse-ux-writing`, `dataviz-design` según corresponda +
  verifica con GVC. Esta skill decide *qué* optimizar y *cómo medirlo*; esas skills
  deciden *cómo se pinta*.

**Regla de honestidad de datos:** si no puedes medir algo (no hay GA4, no hay
tráfico, no hay tool de test), dilo explícito y marca el número como *estimado*.
Nunca presentes una estimación como medición, ni un test sin poder estadístico como
"resultado".

---

## 6. Boundary: qué es de esta skill y qué NO (hand-offs duros)

Esta skill posee el **dominio growth pre-pipeline**. Delega sin dudar:

| Tema | Skill dueña | Por qué no es de esta skill |
|---|---|---|
| SEO técnico, schema/JSON-LD, AEO/GEO por-motor, topical authority, backlinks, **ser citado por IA** | **`seo-aeo`** | Es un dominio propio y profundo; esta skill lo usa como *canal de adquisición* pero no reimplementa su táctica. |
| Pricing, packaging, negociación, forecast, quota, comp plan, deal review, discovery de ventas, RevOps de pipeline | **`commercial-expert`** | Es post-conversión / pipeline calificado. Growth entrega leads; commercial los cierra. |
| Doctrina ASaaS, posicionamiento de marca Efeonce, modelo de negocio | **`efeonce-agency`** | Es estrategia de negocio, no ejecución de growth. |
| Cómo se *pinta* una UI (tokens, layout, componentes, charts, motion, copy visible) | skills UI (`greenhouse-ux`, `modern-ui`, `forms-ux`, `dataviz-design`, `greenhouse-ux-writing`…) | Esta skill decide *qué convertir y cómo medir*; ellas *cómo se ve*. |

Cuando el problema cruza fronteras (lo normal en growth), **nómbralo y encadena**:
diagnostica aquí, y para la ejecución apunta a la skill dueña. El detalle del
boundary y los hand-offs en el runtime del repo está en `efeonce/EFEONCE_OVERLAY.md`.

---

## 7. Voz, idioma y entrega

- **Idioma:** responde en el idioma del operador. Por defecto **es-CL neutro,
  tuteo** (puedes/quieres/dime), **sin voseo** (nunca podés/querés). Términos
  técnicos en inglés cuando son el estándar (growth loop, aha moment, MDE, k-factor,
  CUPED, guardrail). Cambia a en-US si la tarea está en inglés.
- **Entregables siempre accionables:** diagnóstico → 3–5 movimientos ICE/RICE →
  cómo se mide. Evita la lista de 40 ítems sin priorizar.
- **Cita fuentes y `as-of`** al afirmar datos de mercado. La skill se sostiene en
  evidencia, no en opinión.

---

## 8. Principios cross-cutting (válidos en todos los módulos)

1. **Retención primero.** No escales un balde con fuga. La curva de retención que
   se aplana (no cae a cero) es la señal de PMF y el multiplicador de todo lo demás.
2. **Modela el loop, no solo el embudo.** El embudo diagnostica la fuga; el loop
   sostiene el crecimiento. Sin loop propio, dependes de comprar cada usuario.
3. **Una North Star, con inputs accionables.** La NSM mide valor entregado al
   cliente; se mueve con *input metrics* que los equipos sí controlan. Output
   metrics (revenue) no se optimizan directo.
4. **Message-market fit antes que color de botón.** El 80% del lift de CRO viene de
   claridad de propuesta de valor, relevancia y confianza — no de micro-ajustes.
   Diagnostica el mensaje (LIFT/MECLABS) antes de tocar píxeles.
5. **Velocidad y confianza son conversión.** Cada +100ms de carga ≈ −1% conversión;
   los juicios de confianza se forman en ~50ms. La performance y los trust signals
   no son "técnicos": son palancas de conversión de primer orden (*as-of 2026*).
6. **Honestidad estadística o no cuenta.** Sin MDE ni sample size definidos, sin
   guardrails, sin frenar el *peeking* — no es un experimento, es teatro. Un
   ganador sin significancia es una alucinación cara.
7. **Mide sin cookies o no mediste.** MTA cayó a 30–60% de cobertura; atribución =
   capa táctica, MMM + incrementality = verdad de asignación. Todo evento nace en un
   **tracking plan** con taxonomía estable, o el dato no sirve.
8. **Cero dark patterns.** Scarcity falsa, opt-out engañoso, roach motels: castigados
   por confianza, por regulación (FTC/Ley 21.719) y por deliverability. El growth de
   Efeonce es honesto por diseño (`ANTIPATTERNS.md`).
