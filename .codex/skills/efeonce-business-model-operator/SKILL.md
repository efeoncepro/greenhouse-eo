---
name: efeonce-business-model-operator
description: >-
  Diseña, audita, compara y valida business models de Efeonce Group, sus capabilities, productos,
  plataformas y partnerships. Conecta propuesta de valor, ICP, delivery, packaging, pricing, revenue,
  costos, unit economics, retención, expansión, IP, software, riesgos, validación y capital. Usar para
  ASaaS, Creative Studio, AEO, Search Visibility 360, CRM/Kortex, Greenhouse, Verk, Globe, Reach, Wave,
  modelos recurrentes, créditos, licencias, usage, revenue share, spinouts y portfolio architecture.
  No reemplaza Finance, Legal, Product, Architecture, Commercial ni el business model canónico de
  `docs/business-models/`.
---

# Efeonce Business Model Operator

## Propósito

Esta skill responde cómo una oferta crea, entrega y captura valor de forma sostenible. No es un tarifario,
un canvas decorativo ni una hoja contable aislada. Es el puente entre:

```text
estrategia → cliente → oferta → delivery → monetización → economía → validación → escala → capital
```

Para diseñar o auditar el modelo de cliente (ICP, JTBD, buying group, decisión, procurement, validación, adopción y
expansión), cargar también `efeonce-customer-model-operator`. Para diseñar o auditar la arquitectura concreta de precios, cargar también `efeonce-pricing-operator`: esta skill
decide el modelo de negocio; el companion gobierna métrica de valor, packaging, unidades de cobro, descuentos,
versionado, guardrails y Pricing Integrity Pack.

La skill es transversal; los documentos de `docs/business-models/` son la fuente canónica de cada oferta.
La definición transversal de qué es un Product Service, sus niveles de productización y la separación entre
delivery model, operating mode y engagement vive en `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md`.
La dirección corporativa vigente exige que todo servicio client-facing llegue a 2028 como Product Service
productizado y AI-native; usar `docs/strategy/EFEONCE_2028_PRODUCTIZED_AI_NATIVE_SERVICES_STRATEGIC_DIRECTION_V1.md`
para sus gates, madurez y excepciones.

## Autoridad y composición

1. Leer `AGENTS.md`, `CLAUDE.md`, `project_context.md`, `Handoff.md`, `docs/business-models/README.md` y
   el modelo vigente antes de diseñar o auditar.
2. `efeonce-agency` aporta doctrina corporativa, ASaaS, marca y contexto.
3. `creative-practice` gobierna la venta y operación específica de Creative Studio.
4. `greenhouse-finance-accounting-operator` gobierna costos, reconocimiento, cash, P&L, margen y controles.
5. `legal-privacy-ip-operator` gobierna derechos, contratos, datos, privacidad y entidades.
6. `gtm-architect` y `commercial-expert` gobiernan ICP, category, motion, oferta comercial y venta.
7. `software-architect-2026` gobierna arquitectura cuando el modelo requiere plataforma, datos, APIs o runtime.
8. `efeonce-investor-readiness` consume este output para traducirlo a capital; no sustituye esta skill.
9. El modelo vigente manda sobre una hipótesis de la skill. Si hay conflicto, registrar contradicción y no
   improvisar una tercera taxonomía.

## Capas que nunca deben mezclarse

| Capa | Pregunta | Dueño principal |
|---|---|---|
| Market category | ¿Cómo se ubica en el mercado? | Strategy/GTM |
| Customer value | ¿Por qué paga el cliente? | Strategy/Commercial |
| Offer | ¿Qué compra exactamente? | Práctica dueña |
| Delivery | ¿Quién dirige, ejecuta y responde? | Operations/Practice |
| Revenue | ¿Cómo se cobra y devenga? | Business Model + Finance |
| Cost | ¿Qué consume margen y cash? | Finance |
| Contract | ¿Qué se promete, excluye y protege? | Legal/Commercial |
| Product | ¿Qué software/IP hace posible el modelo? | Product/Architecture |
| Capital | ¿Qué inversión acelera qué resultado? | Leadership/Investor Readiness |

ASaaS es un modelo de delivery/monetización. No es automáticamente SaaS, ARR, una entidad legal ni una ronda.

## Tipos de modelo soportados

- managed service;
- productized service;
- ASaaS;
- platform-enabled service;
- SaaS/software, sólo si existe producto y economía separable;
- usage-based;
- credits;
- implementation;
- licensing/IP;
- revenue share;
- marketplace/partner;
- staff augmentation;
- strategic partnership;
- portfolio capability;
- spinout/ProductCo.

Una oferta híbrida debe mostrar la mezcla por lane, no ocultarla en una etiqueta única.

## Modos operativos

| Modo | Resultado |
|---|---|
| `discovery` | límites, owner, hipótesis y unknowns |
| `model-design` | business model map y alternativa seleccionada |
| `packaging-pricing` | tiers, unidad de valor, límites y guardrails |
| `unit-economics` | cost-to-serve, margen, cash y escenarios |
| `validation` | experimentos, cohortes, thresholds y stop conditions |
| `portfolio` | relación entre Group, capability, producto, plataforma y shared services |
| `scale` | qué estandarizar, automatizar, contratar o licenciar |
| `investability` | qué parte es cash-generative, productizable o financiable |
| `assurance` | estado, riesgos, gates y verdict |

## Operating loop

### 1. Enmarcar

Definir oferta, cliente, problema, resultado, alternativa desplazada, owner, estado, horizonte, geografía,
moneda, restricciones, capacidad y decisión que el modelo debe habilitar.

Separar hechos, decisiones aceptadas, hipótesis, preferencias y unknowns.

### 2. Mapear portfolio y boundaries

Clasificar cada elemento como:

- masterbrand;
- capability;
- servicio;
- producto;
- plataforma;
- IP;
- shared service;
- partner/provider;
- wedge;
- futura vertical.

Para Efeonce, mapear Efeonce Group, Efeonce Digital, Globe, Reach, Wave, Greenhouse, Kortex, Verk,
AEO, Search Visibility 360 y Creative Studio sin presentarlos como una lista desconectada. Para cualquier
decisión sobre Wave, cargar [`Wave Business Model V1`](../../docs/business-models/wave/WAVE_BUSINESS_MODEL_V1.md)
y el ADR de boundaries (`../../docs/architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md`). Wave tiene
cinco familias: Search Visibility 360, Web Experience 360, Measurement & Analytics, Agent Systems & Platforms y
Digital Automation & Integrations. CRM/RevOps permanece en Efeonce Digital/Kortex.

Media & Distribution es una línea de negocio de Efeonce. Su catálogo vigente está en
[`Media & Distribution — catálogo de servicios`](../../docs/services/media-distribution/README.md). Comercialmente se
presenta mediante tres soluciones: Distribution Strategy & Media Architecture; Performance & Commerce Distribution;
e Influence, Earned & Partnership Distribution. Paid media, retail media, ATL/OOH, influencers/creators/UGC, PR,
sponsorships/partnerships y dark channels son capacidades de delivery que se activan dentro de esas soluciones.
Reach es una product brand habilitadora, no una agencia ni un business unit contractual. Influencer/creator marketing
compra acceso y distribución ante una audiencia; UGC compra principalmente un activo y sus derechos, por lo que
deben modelarse como ofertas y economics distintos. Performance & Commerce debe modelarse como signal/data infrastructure,
media/commerce operations, creative performance y governance, no como simple configuración de plataformas. IMO y Managed Media Operations son capas operativas, no servicios
adicionales.

### 3. Definir customer/value

Registrar:

- ICP y buying committee;
- JTBD y trigger;
- dolor económico/operativo;
- alternativa actual;
- resultado prometido;
- mecanismo causal;
- proof point;
- qué no controla Efeonce;
- qué parte genera capacidad, memoria, datos o switching cost.

No llamar “outcome” a un output ni prometer una métrica que la oferta no controla.

### 4. Diseñar oferta y delivery

Separar tres ejes:

| Eje | Ejemplos |
|---|---|
| Delivery model | Managed Squad, Staff Augmentation, Studio Access, platform-enabled service |
| Engagement | On-Going, On-Demand, Sample Sprint |
| Operating mode | efeonce-managed, co-operated, client-operated |

Definir RACI, accountable owner, scope, exclusiones, SLA/telemetría, change order, refunds, degradación,
dependencias, onboarding y handoff. Nunca inferir autoridad desde el nombre comercial.

### 5. Diseñar revenue architecture

Para cada línea registrar:

| Campo | Pregunta |
|---|---|
| Revenue stream | ¿Qué se cobra? |
| Value trigger | ¿Qué evento genera valor? |
| Billing unit | ¿Qué unidad se factura? |
| Frequency | ¿Cuándo se cobra? |
| Contract | ¿Qué obligación se asume? |
| Included/excluded | ¿Qué queda fuera? |
| Cost driver | ¿Qué consume margen? |
| Recurrence | ¿Qué provoca renovación? |
| Expansion | ¿Cómo crece la cuenta? |
| Evidence | ¿Qué demuestra que funciona? |

Separar fee recurrente, proyecto, implementación, gobierno/plataforma, usage, credits, IP/licencias,
derechos, pass-through, comisión, revenue share y expansión.

### 6. Diseñar packaging y pricing

Elegir conscientemente la value metric:

- capacidad gobernada;
- acceso/gobierno;
- workspace/tenant;
- lane;
- outcome verificable;
- uso gobernado;
- licencia;
- implementación;
- mínimo comprometido;
- híbrido.

Definir tiers, límites, overage/top-up, rollover, refund, stop-loss, escaladores, descuentos, mínimo,
piloto y aprobación. No publicar precio por pieza si commoditiza el modelo. Credits nunca son dinero, horas,
tokens ni derechos de uso; deben tener ledger, política, expiración y owner.

### 7. Validar economía unitaria

Calcular por oferta, cuenta, capability, delivery model, operating mode, provider y cohorte:

- fully loaded cost;
- cost-to-serve;
- gross margin;
- contribution margin;
- utilization/capacity;
- realization;
- provider/compute/storage;
- retries/refunds/reserve;
- support/success;
- working capital/DSO/FX;
- CAC/payback cuando haya muestra;
- GRR/NRR/expansion;
- sensibilidad base/downside/upside.

Finance debe reconciliar la aritmética y el tratamiento. No usar margen agregado para esconder lanes
deficitarias ni mezclar costo humano con credits para crear margen artificial.

### 8. Validar demanda y comportamiento

Cada modelo debe tener hipótesis, experimento, muestra, métrica primaria, threshold de éxito, stop condition,
owner, plazo y evidencia.

Estados válidos:

- `Draft`;
- `Proposed`;
- `Approved for validation`;
- `Commercially approved`;
- `Deprecated`;
- `Superseded`.

`Approved for validation` sólo habilita pilotos gobernados; no habilita venta general, checkout ni claims de
tracción.

### 9. Diseñar escala

Explicitar qué crece proporcionalmente a personas y qué escala por:

- software;
- datos;
- templates;
- método;
- provider abstraction;
- distribución;
- partner;
- licenciamiento;
- memoria acumulada.

Registrar límites de capacidad, calidad, soporte, onboarding, geografía, idioma, moneda, regulación,
dependencia de fundador y riesgo de servicios custom.

### 10. Traducir a capital

Un modelo es financiable sólo si puede explicar:

- qué parte genera caja hoy;
- qué parte requiere inversión;
- qué parte puede productizarse;
- qué métrica demostraría repetibilidad;
- qué IP y datos son propios;
- qué capital acelera qué milestone;
- qué riesgo no debe financiarse todavía;
- cuándo una vertical merece entidad o spinout.

El output pasa a `efeonce-investor-readiness` con revenue, costos, evidencia y estados honestos.

## Portfolio de partners y providers

Un programa de partners no es automáticamente un canal comercial ni un activo estratégico. Clasificar cada relación
en una de estas funciones: **núcleo estratégico** (intelligence/cloud rail y enterprise delivery), **capability
creativa** (imagen, video, voz o producción), **habilitador de ejecución** (cloud/CRM/multi-cloud) o **experimento**
(prototipado, acceso temprano o creator-led).

Para cada provider o partner registrar, como mínimo:

- casos de uso vendibles y Product Service al que habilita;
- owner interno, delivery model, operating mode y RACI;
- revenue/canal real: co-selling, reseller, referral, pass-through, enablement o sólo acceso técnico;
- cost-to-serve, margen, mínimos, consumo, soporte y sensibilidad a cambios de precio;
- términos de datos, IP, entrenamiento, sublicencia, portfolio rights, jurisdicción y subprocesadores;
- SLA/support, continuidad, portabilidad, fallback y provider substitution;
- evidencia de demanda, referencias, certificaciones o acceso comercial conseguido.

Para Efeonce, la regla de composición es **provider-neutral, provider-transparent**: Claude, OpenAI y Google
Cloud/Vertex AI forman el núcleo enterprise; ElevenLabs y BytePlus son apuestas de capability/canal con potencial
comercial; Runway y FLUX son una segunda capa creativa; AWS, Salesforce, Lovable y HeyGen se activan por oportunidad
concreta. Esta clasificación es una hipótesis de portafolio, no evidencia de partnership aprobado. La evidencia
fechada de postulaciones vive en `docs/audits/commercial/AI_PARTNER_PROGRAM_APPLICATIONS_2026-07-26.md`.

No ampliar el portafolio por acumulación de logos. Un partner sube de prioridad sólo cuando existe una oferta,
owner, economics, ruta contractual y evidencia de demanda; si no, permanece como experimento o capability opcional.

### Regla de economics para providers de IA

Para cada capability separar `prototype`, `production-scale` y `fallback`. Fal puede funcionar como gateway de
prototipo y multi-provider, pero no se asume que sea la ruta más barata. Para volumen, comparar precio efectivo,
cuotas, SLA, soporte, derechos, residencia de datos, observabilidad y portabilidad del endpoint directo frente a Fal.
En la evaluación vigente: Google nativo va directo por AI Studio/Vertex; OpenAI va directo; BytePlus directo es la
ruta de referencia para volumen Seedance/Seedream; BFL/Fal y Recraft/Fal se comparan por paridad pública y control
operativo. FLUX 3 permanece en early access, sin API pública general ni precio público al 2026-07-26, por lo que no
entra en compromisos de producción ni en unit economics aprobados. Toda cifra debe conservar fuente, fecha, modelo,
resolución/duración, reintentos y costo efectivo por output.

## Invariantes obligatorios

1. Un business model no es un tarifario.
2. ASaaS no equivale a SaaS.
3. Revenue recurrente necesita trigger contractual y evidencia.
4. Proyecto, retainer, plataforma, usage, IP y pass-through se separan.
5. No hay pricing sin cost-to-serve, margen objetivo y sensibilidad.
6. No hay margen agregado sin margen por oferta/cuenta/capability cuando el riesgo lo exige.
7. Delivery, engagement y operating mode son ejes distintos.
8. Credits no son dinero, horas, tokens, assets ni derechos.
9. `Approved for validation` no habilita venta general.
10. Todo KPI declara fórmula, período, denominador, moneda, fuente y owner.
11. Toda cifra externa tiene fuente y fecha; toda cifra interna tiene fuente y confidence.
12. No se afirma adopción, ARR, NRR, margen SaaS o producto live sin evidencia.
13. El costo humano no se oculta dentro de usage o credits.
14. El cliente no debe quedar retenido por opacidad o falta de portabilidad.
15. Una vertical no merece spinout por tener nombre, demo o roadmap.
16. IP, datos, derechos y shared services tienen owner y boundary.
17. Capital para producto, crecimiento y rescate operativo se separa.
18. La categoría pública, el modelo económico y la visión estratégica permanecen separados.
19. Finance valida economía; Legal valida derechos; Commercial valida venta; Product valida runtime.
20. Si la evidencia contradice la narrativa, gana la evidencia.

## Artefactos de salida

- Business Model Integrity Pack.
- Portfolio/business model map.
- Offer brief.
- Revenue architecture.
- Packaging/pricing matrix.
- Delivery/RACI map.
- Unit economics pack.
- Validation plan.
- Evidence ledger.
- Scale constraints register.
- IP/data/rights map.
- Risk and governance register.
- Investor translation brief.
- Decision record and review date.

## Verdicts

- `model_incomplete`;
- `hypothesis_only`;
- `approved_for_validation`;
- `commercially_approved`;
- `scale_constrained`;
- `capital_translation_ready`;
- `blocked_by_finance`;
- `blocked_by_legal`;
- `superseded`.

No decir “listo para escalar” si faltan economics, capacidad, rights, soporte o evidencia.

## Mantenimiento

- La fuente de verdad del modelo concreto vive en `docs/business-models/`.
- Revisar cada cambio material de precio, delivery, provider, derechos, revenue, margen o estado runtime.
- Crear V2 o una decisión que superseda; no reescribir historia para ocultar un cambio.
- Ejecutar `checklists/business-model-review.md`, `quick_validate.py` y el protocolo ciego de `evals/protocol.md`
  para cambios sustantivos antes de cierre.
