# Fuentes + frescura — Growth Marketing + CRO

> **Revisión de alcance 2026-09-21 (Codex):** para decisiones operativas y definiciones de métricas,
> cargar [el playbook de atención visual](../efeonce-advertising-creative/references/paid-visual-attention-playbook.md).
> Este antecedente conserva la investigación previa; sus cifras no revalidadas con URL primaria,
> fecha y metodología **no son benchmarks aprobados**. Premios no demuestran eficacia paid;
> ausencia de hallazgo no prueba inexistencia; CTR no mide atención. La referencia STFO fechada
> octubre de 2026 es posterior a esta revisión y queda excluida como evidencia vigente.

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

## Creatividad publicitaria — evidencia medida · as-of 2026-09-21

🔴 **Canon:** [`efeonce-advertising-creative/references/ad-creative-evidence-2026.md`](../efeonce-advertising-creative/references/ad-creative-evidence-2026.md)
(caduca **2027-03**). Tres frentes de investigación web con fuentes verificadas. **Cárgalo antes de citar
cualquier número de creatividad publicitaria**, y en especial su **§5 — las once cifras que NO se citan**.

| Dato | Valor | Fuente · muestra | Volatilidad |
|---|---|---|---|
| Aviso aburrido: penalización de inversión | **2,6×** para igual crecimiento de cuota; **2×** para beneficio | System1 + Peter Field, ene-2025 · >100.000 ads × IPA Databank | BAJA |
| Neutralidad emocional B2B vs general | **60% vs 52%** (UK) | ídem | BAJA |
| Publicidad B2B que no mueve nada | **75% ≤1 estrella**; 0 de 1.600 llegó a 5 | LinkedIn B2B Institute + System1 · 1.600 ads, 6M personas, 4 años | BAJA |
| Atribución de marca | **48%** con 3+ menciones vs **32%** con una | B2B Institute × MediaScience, oct-2024 · 109 ads, biometría | MEDIA |
| Atención real B2B | **3,7 s** de 12,3 s en pantalla; pico en los primeros 4 s | ídem | MEDIA |
| Umbral atención→memoria | **2,5 s**; **1,5 s** con activos distintivos | Amplified Intelligence · VCCP × Nelson-Field 2025 | MEDIA |
| **Lift en ESTÁTICOS: alto contraste de color** | **+41% engagement** | VidMob × LinkedIn · 13.600 assets, 2.900M impresiones | MEDIA |
| Lift en estáticos: múltiples personas | **+14% engagement** | ídem | MEDIA |
| 🎯 Mención de IA en el mensaje | **−46% VTR si es genérica**; **+31% CTR / +229% conversión si trae valor concreto** | ídem | MEDIA |
| CTR mediana LinkedIn | **0,47%** (top 10% ≥0,74%) | Cognism 2026 · 761 creatividades, TLA excluidos | ALTA |
| Dwell mediana LinkedIn | **4,21 s** | ídem | ALTA |
| CPL LinkedIn por región | NA $200-250 · EU $120-150 · **LATAM $60-90** | ZenABM 2026 · 161.256 anuncios | ALTA |
| CTR/CPC/CPL LinkedIn ponderado | 0,67% · $9,39 · $202 | Metadata 2026 · 153 anunciantes, $57,6M | ALTA |
| Percepción de avisos hechos con IA | **71% cree haberlos visto** (54% en 2024); **57% sentimiento negativo** (+12 pts) | IAB, «The AI Ad Gap Widens», oct-2025 a ene-2026 | ALTA |
| Marcas B2B sin activo distintivo | **80% genérico o invisible**; 1 de 100 «ownable» | EXCLUIDO por fecha futura: STFO, oct-2026 · 100 empresas (no peer-review) | MEDIA |

🔴 **Tres correcciones que ahorran errores caros:**
1. **El «thumb-stop ratio» no existe para un estático** — `hook_rate_3s` es una convención custom de vistas calificadas de 3 s ÷ impresiones,
   métrica de **video**. Para imagen fija la ratio temporal es N/A; clic saliente/visitas miden respuesta, no atención.
2. **La regla del 20% de texto de Meta murió en septiembre de 2020.** Hoy no hay restricción porcentual ni
   penalización de subasta; lo vinculante es **geometría** (zonas seguras de Reels/Stories), no cantidad.
3. **«Thought Leader Ads: 2,68% CTR / $2,29 CPC / 6,4× mejor» es un artefacto de medición.** Kiin Labs ($31M,
   comparaciones pareadas): **el 91% de esos clics nunca llega a la landing**. CTR real **0,43%**, CPC real
   **$13,51** — igual que un single image. Medirlo por CPC total subestima el costo real **~80%**.

⚠️ La búsqueda previa **no localizó evidencia específica de creatividad SEO/AEO/GEO**. No demuestra
inexistencia: verificar fuente y metodología antes de aceptar un benchmark de esa categoría.

📏 **Norma vigente:** IAB + MRC, *Attention Measurement Guidelines v1.0* (**noviembre 2025**), primer estándar
industrial: viewability + filtrado de tráfico inválido + presencia humana son **prerequisitos** de cualquier
métrica de atención.
