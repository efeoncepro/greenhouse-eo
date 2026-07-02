# Glosario — Growth Marketing + CRO

Vocabulario canónico. Cuando un término tenga acepciones que se confunden, se
aclara la distinción.

## Estrategia y modelado

- **Growth loop** — ciclo cuyo output re-alimenta el input (viral, content, paid,
  sales/expansion). Motor sostenible; contrasta con el funnel lineal.
- **Funnel / AARRR (pirate metrics)** — Acquisition, Activation, Retention,
  Referral, Revenue (Dave McClure). Lenguaje de *diagnóstico* de fugas, no motor.
- **North Star Metric (NSM)** — la única métrica que mejor captura el valor
  entregado al cliente. Se mueve vía **input metrics** accionables.
- **Input vs output metric** — inputs son palancas que el equipo controla (ej.
  invitaciones enviadas); outputs son resultados (revenue). Optimizas inputs.
- **Growth model** — modelo cuantitativo que conecta inputs → NSM → revenue; permite
  simular el efecto de mover cada palanca.
- **Channel-market fit** — cuando un canal encaja con el producto/mercado/precio.
  No todo canal sirve para todo negocio.
- **PMF (product-market fit)** — señal principal: la curva de retención se **aplana**
  (no cae a cero). Sin PMF, growth amplifica el churn.

## Adquisición

- **CAC** — Customer Acquisition Cost. **Blended CAC** = todo el gasto / todos los
  clientes; **paid CAC** = solo canales pagados. **CAC payback** = meses para
  recuperar el CAC vía margen.
- **LTV / LTV:CAC** — Lifetime Value; ratio de salud (referencia común 3:1, validar
  por caso). **Payback < 12 meses** es el guardrail práctico moderno.
- **PLG (Product-Led Growth)** — el producto es el motor de adquisición/activación/
  expansión (free trial, freemium, self-serve). **SLG (Sales-Led)** — el equipo de
  ventas conduce. **Híbrido** — PLG + sales layer sobre PQLs.
- **Freemium / Free trial / Reverse trial** — freemium: tier gratis permanente. Free
  trial: acceso completo por tiempo limitado (opt-in sin tarjeta / opt-out con tarjeta).
  Reverse trial: full premium temporal que **cae a free** al expirar (no lockout);
  default moderno.
- **Feature gating / paywall** — qué es gratis vs pago. Regla: mantener el aha accesible
  y gatear valor/escala/colaboración. **Cap de capacidad** suele convertir mejor que
  muro de features.
- **PLS (Product-Led Sales)** — capa de ventas sobre PLG que persigue cuentas de alta
  intención identificadas por uso de producto. **PQA (Product-Qualified Account)** — la
  *cuenta* (no solo el usuario) dentro de un trial que ventas debe perseguir.
- **Free→paid conversion** — % de free users que pagan (B2C ~2–5%, B2B ~8–15%; varía
  fuerte por modelo de acceso). **Upgrade trigger** — el momento/límite que gatilla el
  paso a pago; su timing importa tanto como el límite.
- **k-factor / viral coefficient** — invitaciones por usuario × tasa de conversión de
  invitación. K>1 = viralidad genuina (raro). B2B típico 0.2–0.8. **Viral cycle
  time** — cuánto tarda el loop; a menudo importa más que la magnitud de K.
- **Dark social** — compartición no atribuible (DM, Slack, WhatsApp). Fuente real de
  demanda que la atribución no ve.

## Conversión / CRO

- **CRO** — Conversion Rate Optimization: aumentar la tasa de una acción deseada.
- **Value proposition** — la promesa de valor: por qué esto, por qué ahora, por qué a ti.
- **Message-market fit** — el mensaje resuena con el problema/deseo del segmento.
  Antecede al "page-market fit".
- **LIFT model** (Chris Goward) — 6 factores de conversión de una página: Value
  proposition, Relevance, Clarity, Anxiety, Distraction, Urgency (los dos últimos
  restan). Marco de *diagnóstico* heurístico.
- **Fogg Behavior Model** — B = MAP: una conducta ocurre cuando convergen Motivación,
  Ability (facilidad) y Prompt (disparador). Baja fricción o sube motivación o mejora
  el prompt.
- **MECLABS Conversion Sequence Heuristic** — C = 4m + 3v + 2(i−f) − 2a (motivación,
  claridad de la propuesta de valor, incentivo, fricción, ansiedad). Ponderación
  relativa, no fórmula literal: motivación y claridad de propuesta pesan más.
- **PXL** (CXL) — framework de priorización de tests que puntúa evidencia + impacto
  potencial (above-the-fold, notable en <5s, agrega/quita, alto tráfico, motivación).
- **Trust signals** — señales de confianza: reviews, seguridad de pago, certificaciones,
  UGC/social proof, transparencia. Su **placement** importa tanto como su presencia.
- **Social proof** — evidencia de que otros ya confían (reviews, testimonios,
  contadores, logos). Video/foto > texto.
- **Above the fold** — lo visible sin scroll; donde se forman los juicios de confianza
  (~50ms).
- **Friction / anxiety** — fricción = esfuerzo/pasos; ansiedad = duda/miedo. Se reducen
  distinto: fricción con UX, ansiedad con confianza.
- **Core Web Vitals** — LCP (carga), INP (interactividad, reemplazó FID), CLS
  (estabilidad visual). Impactan ranking **y** conversión. (Táctica técnica → `seo-aeo`.)
- **Zero-party data** — datos que el usuario comparte deliberadamente (preferencias) a
  cambio de valor; clave post-cookie.

## Experimentación

- **A/B / A/B/n / MVT** — test de una variante vs control / múltiples variantes / test
  multivariado (combinaciones de factores; hambriento de tráfico).
- **MDE (Minimum Detectable Effect)** — el efecto más pequeño que el test puede
  detectar con el poder elegido. Define el sample size.
- **Sample size / power / significancia** — muestra necesaria; poder (típ. 80%) =
  prob. de detectar un efecto real; significancia (α, típ. 5%) = tolerancia de
  falso-positivo.
- **Frecuentista vs bayesiano** — frecuentista: p-value, confidence intervals, sample
  fijo. Bayesiano: "probabilidad de ser mejor", más intuitivo, permite framing de
  decisión con umbrales (90/95/99%).
- **Sequential testing** — permite monitorear/parar sin inflar el falso-positivo
  (confidence sequences / always-valid p-values). Resuelve el problema del *peeking*.
- **CUPED** (Controlled-experiment Using Pre-Experiment Data) — reduce varianza con
  datos previos del usuario; misma potencia con 30–40% menos muestra.
- **Guardrail metric** — métrica de salud que NO debe degradarse aunque gane la
  primaria (churn, latencia, margen, calidad del lead).
- **Peeking** — mirar resultados y decidir parar antes de tiempo; infla falsos
  positivos si el test es de sample fijo.
- **Warehouse-native** — el tool de experimentación calcula métricas directo en tu data
  warehouse (una sola fuente de verdad). Ej.: Eppo, GrowthBook.

## Activación / retención

- **Aha moment** — la realización emocional de que el producto vale. Cualitativo; se
  *aproxima* con un **activation event** medible.
- **Activation rate** — % de nuevos usuarios que alcanzan el activation event.
  Referencia 2026: <20% débil, 20–40% típico, >40% fuerte (varía por vertical).
- **TTFV / TTV / Time to Core Value** — Time to First Value (primer valor percibido);
  Time to Value; el punto donde el uso se vuelve patrón que predice renovación.
- **PQL (Product-Qualified Lead)** — usuario que demostró valor en el producto
  (milestones/uso premium en trial). **PQL velocity** — qué tan rápido cruzan el
  umbral; los rápidos convierten más.
- **Cohorte** — grupo definido por un evento en el tiempo (ej. signups de marzo).
  **Retention curve** — % activo por período desde M0; sana si se aplana.
- **NRR / GRR** — Net / Gross Revenue Retention. NRR incluye expansión; >100% = crece
  sin adquirir. GRR excluye expansión (piso de retención).
- **Dunning** — recuperación de pagos fallidos. La **involuntary churn** (tarjetas
  vencidas) puede ser ~48% del churn total.
- **"AI tourists"** — usuarios que se registran por curiosidad y se van sin activarse;
  inflan cohortes y distorsionan la retención temprana (medir M-n contra M3, no M0).

## Medición

- **MTA (Multi-Touch Attribution)** — reparte crédito entre touchpoints. Cobertura
  cayó a 30–60% post-cookie; hoy es capa táctica, no verdad única.
- **MMM (Marketing Mix Modeling)** — modelo estadístico top-down que estima la
  contribución de cada canal desde datos agregados; independiente de cookies. Tools
  ligeros: Robyn (Meta), Meridian (Google).
- **Incrementality / geo-holdout** — test que mide el efecto causal real (¿habría
  pasado igual sin el gasto?) vía grupos de control geográficos.
- **Consent Mode v2** — framework de Google para preservar medición con consentimiento.
  Alta adopción pero implementación frecuentemente incorrecta.
- **Server-side tracking** — enviar eventos desde el servidor (no el navegador) para
  resiliencia ante bloqueadores/ITP y control de datos.
- **Tracking plan / event taxonomy** — especificación de qué eventos y propiedades se
  capturan, con nombres consistentes. La base de todo dato confiable.

## Web agéntica (emergente 2026)

- **Agentic commerce** — agentes IA que descubren, comparan y compran por el usuario;
  comprimen el funnel de intención a transacción.
- **Agentic readiness** — qué tan preparado está un sitio para ser *usado* por agentes
  (feeds, schema, APIs de checkout), no solo *citado*. (Marco propietario en `seo-aeo`.)
