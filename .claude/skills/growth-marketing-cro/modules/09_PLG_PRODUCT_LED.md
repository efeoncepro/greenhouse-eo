# 09 · Product-Led Growth (PLG) & Product-Led Sales

> PLG = el **producto** es el motor principal de adquisición, activación, conversión y
> expansión. No es "no tener ventas": es que el producto hace el trabajo pesado y las
> ventas se **suman** donde el producto solo no cierra. Vive en growth; el pipeline y
> el pricing profundo se coordinan con **`commercial-expert`**.

## 0. ¿Te conviene PLG? (gate honesto antes de todo)

PLG NO es para todo producto. Funciona cuando:
- **Time-to-value corto** (el usuario ve valor en minutos, no tras una implementación).
- **El usuario puede auto-onboardearse** sin un vendedor.
- **El valor se experimenta antes de comprar** (freemium/trial muestran el "aha").
- **Ticket compatible** con self-serve (o land pequeño + expand).
- Idealmente **loops** (colaboración, outputs compartibles, network effects).

Si el producto exige integración compleja, decisión de comité desde el día uno, o el
valor solo aparece tras semanas de setup → PLG puro no encaja; será sales-led o híbrido
tardío. **90% de las implementaciones de PLG fallan** por construir "lo de arriba de la
línea de flotación" (landing, signup) e ignorar lo de abajo (activación diseñada,
time-to-value, trigger de upgrade). No recomiendes PLG por moda.

## 1. Modelos de acceso: freemium vs free trial vs reverse trial

Elige el modelo por cómo se entrega el valor (benchmarks *as-of 2026*, reverificar):

| Modelo | Cómo funciona | Convierte free→paid | Cuándo usarlo |
|---|---|---|---|
| **Freemium** | tier gratis permanente + tiers pagos | ~5–12% (mediana freemium ~12% signup; ~5% a pago) | valor con **network effects / viral / uso recurrente** (Notion, Figma, Slack); el free alimenta el loop |
| **Free trial (opt-in, sin tarjeta)** | acceso completo por tiempo limitado | ~18% | "aha" claro en ventana corta; menos fricción de entrada |
| **Free trial (opt-out, con tarjeta)** | trial con tarjeta pre-cargada | ~40–49% | intención alta; filtra curiosos (pero baja el volumen de entrada) |
| **Reverse trial** | full premium 14–30 días → **cae a free** (no lockout) | híbrido | **default seguro moderno**: da distribución (freemium) + urgencia (trial) + datos para decidir |

Notas 2026:
- **Trials cortos ganan:** ≤7 días convierten ~40% vs ~30% para >60 días. La urgencia
  vence a la evaluación extendida.
- **Reverse trial** es el default recomendado cuando dudas: no encierra al usuario, y te
  da los datos para simplificar después.
- Freemium trae **más volumen de signup** (~6% vs 3–4% de visitantes) pero convierte más
  bajo a pago; free trial al revés. Elige por economía + loop, no por gusto.

## 2. Diseño del paywall / feature gating (dónde poner el muro)

La decisión de qué es gratis vs pago define el motor:
- **Mantén el "aha" accesible en gratis.** Si el usuario no puede alcanzar el primer
  valor sin pagar, no hay PLG.
- **Gatea lo que correlaciona con valor y willingness-to-pay:** seguridad, admin, escala,
  colaboración avanzada, límites de capacidad.
- **Cap de capacidad > muro de features.** Linear regala features marquesina pero capea
  issues (~250): se paga cuando el equipo *genuinamente supera* el workspace. Convierte
  mejor que esconder features.
- **El timing del upgrade trigger importa tanto como el límite:** un trigger mal puesto
  convierte 2–5%; bien puesto (en el momento de dolor/valor) 15–30%.

El **pricing/packaging profundo** (value metric, tiers, elasticidad) es de
`commercial-expert`; aquí decides el **gating como palanca de growth** (qué desbloquea
el loop y la expansión) y coordinas.

## 3. Métricas PLG (el stack que importa)

```
Signup rate            = signups / visitantes
Activation rate        = alcanzan el aha event / signups        (top 40–60%, best 70%+)
Time-to-value (TTV)    = tiempo al primer valor                 (PLG 2.0: minutos; AI-native: primer touch)
Free→paid conversion   = pagan / free users                     (B2C 2–5%; B2B 8–15%; elite hasta 15–25%)
PQL / PQA              = usuarios/cuentas calificados por producto
NRR / NDR              = expansión − churn                       (PLG bench 100–110%; best >130%)
Expansion % del ARR    = ARR nuevo por expansión                (elite PLG 30–50%)
```

- **Activación es el predictor #1 de conversión** y solo ~34% de las empresas PLG la
  trackea. **Cierra ese gap primero:** define el aha event, mide el % que lo alcanza
  (→ `05_ACTIVATION_ONBOARDING.md`).
- **NRR es el corazón del PLG:** el land es pequeño; la expansión (30–50% del ARR nuevo)
  es donde está el negocio. Instrumenta seats/uso/feature-adoption como señales de
  expansión.
- Cuidado 2026: land-and-expand explotó en 2024–25, pero muchos productos AI enfrentan
  su **primer ciclo de renovación** — la expansión sin retención real se revierte.

## 4. Product-Led Sales (PLS): sumar ventas sin romper el self-serve

El motion dominante 2026 NO es PLG puro: es **híbrido**. ~67% de las empresas >$10M ARR
corren PLG+SLG. El producto **land**ea y califica a ~cero CAC; una capa de ventas
**expande** las cuentas de alta intención.

- **PQL (Product-Qualified Lead):** usuario que demostró valor real (milestones/uso
  premium). **PQA (Product-Qualified Account):** la *cuenta* dentro de un trial que
  ventas debe perseguir (en vez de prospectar en frío). PQLs convierten **25–30% vs
  5–10% de MQLs** (3–5×), pero solo ~1/4 de las empresas corre un framework PQL formal.
- **Cuándo layering sales:** típicamente entre **$10M–$50M ARR** se agrega sales-assist,
  no para reemplazar self-serve sino para cerrar cuentas de alto valor que el producto
  solo no cierra.
- **Modelo full-stack GTM (capital-eficiente):** self-serve para SMB, sales-assisted
  para mid-market, enterprise sales para estratégicas — **todos alimentados por el mismo
  data lake de uso de producto**.
- **Scoring PQL:** activación + profundidad de uso + señales de expansión de equipo +
  patrones de adopción de features. Instrúmentalo en el tracking plan (`07`).
- El **cierre** del PQL/PQA (outbound, demo, negociación, pricing) es de
  `commercial-expert`; growth **define y entrega** el PQL/PQA bien instrumentado. Ata el
  handoff con atribución en el CRM (overlay HubSpot).

## 5. Loops de PLG (por qué compone)

- **Viral/colaboración:** invitar compañeros, outputs compartibles con marca, network
  effects. El free tier existe para alimentar el loop (`02`). Prompt de invitación
  **post-aha** (`05`).
- **Community-led:** comunidades, librerías de templates, ecosistemas de partners,
  integraciones — no solo soportan adopción, la **escalan** (un usuario trae más; pagaste
  solo por el primero).
- **Bottoms-up:** el usuario-buyer adopta y difunde dentro de la organización; se vuelve
  enterprise vía land-and-expand, no vía top-down.

## 6. PLG en la era de la IA (2026)

- **AI-native scale vía PLG:** ~27% del gasto en apps de IA entra por PLG — **4× la tasa
  del SaaS tradicional (~7%)**. Los productos AI-native tienden a distribuirse self-serve.
- **TTV colapsa:** PLG 2.0 apunta a ~60s; **AI-native entrega valor en el primer touch,
  antes del signup**. 81% espera claridad instantánea; **98% churnea en 2 semanas si no
  ve valor**.
- **Onboarding con IA:** detección de intención + contenido personalizado + guía
  conversacional, invisible al usuario; adapta la secuencia según señales tempranas
  (qué exploró, si invitó equipo, a qué feature vuelve).
- **El "usuario" PLG se corre de humanos a agentes:** cambia métricas de activación,
  diseño de producto, soporte y monetización (token/outcome-based). Emergente — vigila
  (`02` web agéntica, `07` medición agéntica).

## 7. Cómo aplicar (loop de trabajo PLG)

1. **Gate honesto** (§0): ¿PLG encaja? Si no, dilo y ve a híbrido/sales-led.
2. **Elige el modelo de acceso** (§1) por entrega de valor + economía + loop.
3. **Diseña activación al aha** (`05`) — es el predictor #1; el 34% no lo trackea, no
   seas ese 34%.
4. **Diseña el gating/paywall** (§2) para desbloquear loop y expansión; timing del trigger.
5. **Instrumenta el stack PLG** (§3) + PQL/PQA scoring (§4) en el tracking plan (`07`).
6. **Layering de sales** cuando la escala/valor lo pida (§4) → handoff a `commercial-expert`.
7. **Optimiza los loops** (§5) y mide NRR/expansión, no solo adquisición.

## Checklist de salida

- [ ] Decidido honestamente si PLG encaja (no por moda).
- [ ] Modelo de acceso elegido con benchmark + razón (freemium/trial/reverse).
- [ ] Aha event definido y activación medida (>40% objetivo; TTV en minutos).
- [ ] Paywall que mantiene el aha gratis y gatea valor/expansión; trigger bien temporizado.
- [ ] PQL/PQA definidos e instrumentados; plan de layering de sales con handoff.
- [ ] NRR/expansión medidas; loops (viral/community/bottoms-up) diseñados.

## Cross-links

- Loops y NSM → `01`; adquisición y viral loop → `02`; CRO de la landing/signup → `03`
- Experimentar el modelo/paywall → `04`; activación/aha/PQL → `05`; retención/NRR → `06`
- Instrumentación PLG → `07`; playbooks → `08`
- Pricing/packaging profundo, cierre de PQL, pipeline → skill `commercial-expert`
- En el repo: el AEO grader como capability con tiers/entitlement PLG →
  `../efeonce/AEO_GRADER_AS_LEAD_MAGNET.md`
- Artefacto → `../templates/plg-motion-canvas.md`; errores → `../ANTIPATTERNS.md`
