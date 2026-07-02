# Fuentes + frescura — Growth Marketing + CRO

> **Regla de honestidad.** Este dominio se mueve cada trimestre. Antes de escribir
> como hecho cualquier cifra, umbral o regla marcada **VOLÁTIL**, reverifícala con
> WebSearch/WebFetch y marca el `as-of`. Los **principios** (loops, retención-primero,
> honestidad estadística) son estables; los **números** no.

## Núcleo verificado — as-of 2026-07

Datos-ancla capturados en la investigación de autoría (reverificar antes de citar):

| Dato | Valor (as-of 2026) | Volatilidad |
|---|---|---|
| Landing page conversion — mediana | ~4.0% (Unbounce 2026); top-cuartil >11.4% | ALTA |
| Free-trial sin tarjeta (SaaS) | mediana ~7.2% | ALTA |
| B2B SaaS visitor→lead | ~1.1% (método estricto); top-10% 8–15% | ALTA |
| Activation rate | mediana ~36–37.5%; AI ~54.8%, FinTech ~5% | ALTA |
| Free users que nunca activan | 40–60% ("zombie users") | MEDIA |
| Empresas PLG que trackean activación | ~34% | MEDIA |
| B2B SaaS PLG | ~58% lo usan; 91% planea aumentar 2026 | MEDIA |
| Churn mensual B2B SaaS | media ~3.5%; top <2%; enterprise 0.5–1%; SMB 3–7% | MEDIA |
| NRR mediana (privadas) | ~101% (2025); top >120% | MEDIA |
| Involuntary churn | hasta ~48% del churn total; dunning recupera 50–80% | MEDIA |
| CAC | +40–60% desde 2023; +222% en 8 años | MEDIA |
| Blended CAC de líderes | 6–9 canales, cada uno 5–20% | BAJA |
| Ciclo de venta B2B | ~134 días (era ~107 en 2022) | MEDIA |
| k-factor bueno | B2C 0.15–0.4 bueno / ~0.7 excelente; B2B típ. 0.2–0.8 | BAJA |
| CUPED | misma potencia con 30–40% menos muestra | BAJA |
| Velocidad → conversión | +100ms carga ≈ −1% conversión; 1s ≈ −7% | MEDIA |
| Core Web Vitals (2026) | LCP umbral bajó a 2.0s (mar-2026); INP <200ms señal plena; ~42% mobile pasa las 3 | ALTA |
| Reducir campos de form | 4→3 campos ≈ +50% conversión | BAJA |
| Checkout | media ~5.1 pasos / 11.3 campos; extra costs = 39% del abandono; 1-click +16–21% | MEDIA |
| Juicio de confianza | se forma en ~50ms | BAJA |
| Rating óptimo percibido | 4.2–4.5 estrellas convierte mejor que 5.0 | BAJA |
| Email spam rate (Gmail/Yahoo) | bloqueo ≥0.30%; apuntar <0.10%; one-click unsubscribe RFC 8058 obligatorio bulk | ALTA |
| MTA cobertura post-cookie | cayó de >90% a 30–60% | MEDIA |
| Agentic commerce | mercado ~$15B en 2026; proyección 90% del B2B buying agent-mediado hacia 2028 | ALTA |
| Personalización IA | +10–20% conversión (B2B y B2C) | ALTA |
| PLG adopción | ~58% de B2B SaaS lo usa; 91% planea aumentar; ~67% >$10M ARR es híbrido PLG+SLG | MEDIA |
| Free→paid por modelo | freemium ~5–12%; free trial opt-in ~18%; opt-out (tarjeta) ~40–49%; trial ≤7d ~40% vs >60d ~30% | ALTA |
| Free→paid elite | B2C 2–5%; B2B 8–15%; obsesos de activación 15–25% | ALTA |
| PQL vs MQL | PQL convierte 25–30% vs MQL 5–10% (3–5×); solo ~1/4 corre framework PQL formal | MEDIA |
| NRR PLG | bench 100–110%; best-in-class >130% | MEDIA |
| Expansión PLG | elite 30–50% del ARR nuevo (vs 10–20% SaaS tradicional) | MEDIA |
| Activación PLG | top 40–60%; best 70%+; solo ~34% la trackea | MEDIA |
| TTV PLG | PLG 2.0 ~minutos/60s; AI-native valor en primer touch; 98% churn en 2 semanas sin valor | ALTA |
| PLG en IA | ~27% del gasto en apps IA entra por PLG (4× el ~7% del SaaS tradicional) | ALTA |
| Upgrade trigger timing | mal puesto 2–5% conversión; bien puesto 15–30% | MEDIA |
| Reverse trial | default seguro moderno (distribución + urgencia + datos) | BAJA |

## Fuentes de autoridad por tópico

- **Growth strategy / loops / NSM / PLG:** Reforge (growth models, loops, NSM),
  Lenny's Newsletter, Amplitude/Mixpanel (product analytics + benchmarks), Elena
  Verna, Andrew Chen ("The Cold Start Problem", loops), OpenView (histórico PLG).
- **CRO / conversión web:** CXL (PXL, metodología de research), Chris Goward /
  Widerfunnel (LIFT), MECLABS / MarketingExperiments (Conversion Sequence Heuristic),
  BJ Fogg (Behavior Model), Baymard Institute (checkout/UX e-commerce, benchmarks de
  abandono), Nielsen Norman Group (usabilidad), GoodUI (patrones testeados), Unbounce
  (Conversion Benchmark Report).
- **Experimentación / estadística:** Ronny Kohavi ("Trustworthy Online Controlled
  Experiments"), Evan Miller (calculadoras sample size / sequential), Optimizely /
  VWO / AB Tasty / Kameleoon (metodología), Statsig / Eppo / GrowthBook (warehouse-
  native, docs técnicos), Microsoft/Airbnb/Netflix experimentation papers.
- **Activación / onboarding:** Appcues, Userpilot, Chameleon, Reforge (activation),
  Pendo.
- **Retención / lifecycle:** Reforge (retention/engagement), ProfitWell/Paddle
  (churn/dunning/pricing), Recurly (dunning), Customer.io / Braze / Iterable
  (lifecycle messaging).
- **Email deliverability:** Gmail Sender Guidelines (support.google.com), Yahoo Sender
  Hub, RFC 8058 (one-click unsubscribe), Postmark/SparkPost blogs, Litmus.
- **Medición / privacy:** Google (GA4, Consent Mode v2, Meridian MMM), Meta (Robyn
  MMM, CAPI), Snowplow / dbt (warehouse-native), Segment (tracking plan), IAB
  (privacy). MMM/incrementality: Recast, Northbeam, Measured.
- **Agentic commerce:** McKinsey, BCG, commercetools, MetaRouter (state of agentic
  commerce). Para *agentic readiness* del sitio: skill `seo-aeo` (marco propietario)
  y skill `webmcp`.

## Qué reverificar y cada cuánto

- **Cada consulta que cite un número:** benchmarks de conversión/activación/churn/CAC,
  umbrales Core Web Vitals, reglas de deliverability Gmail/Yahoo, tamaño de mercado
  agentic. Todos VOLÁTILES.
- **Cada trimestre:** landscape de tooling de experimentación (M&A frecuente — ej.
  Statsig fue absorbido por Amplitude en 2026), features de GA4/Consent Mode,
  cambios de política de plataformas de ads.
- **Estable (no urge reverificar):** frameworks (LIFT, Fogg, MECLABS, PXL, AARRR),
  matemática de sample size/CUPED/k-factor, principios de loops y retención.

## Cómo citar

Al afirmar un dato de mercado: **valor + fuente + `as-of`**. Ej.: "la mediana de
conversión de landing ~4% (Unbounce, *as-of 2026-07*)". Si no pudiste reverificar,
dilo: "dato de núcleo 2026-07, conviene revalidar".
