---
name: efeonce-pricing-operator
description: >-
  Diseña, audita y valida packaging, pricing, revenue architecture y unit economics para cualquier oferta de Efeonce: servicios, productos, plataformas, software, créditos, managed services, Productized Services, Managed Squads, Staff Augmentation, implementation, advisory, usage, licensing o modelos híbridos. Usar ante decisiones sobre precio, tiers, rate cards, mínimos, descuentos, retainers, pass-through, proveedores, márgenes, cotizaciones, approval gates o monetización de nuevas capabilities.
---

# Efeonce Pricing Operator

Companion general de `efeonce-business-model-operator`. Convierte una oferta en una arquitectura comercial
defendible: packaging, métrica de valor, unidad de cobro, revenue streams, economics, guardrails y validación.

Es agnóstica a la línea de negocio: sirve para Efeonce Digital, Wave, Globe, Reach, Greenhouse, Kortex, Verk,
Creative Studio y futuras capabilities. No reemplaza Strategy/Commercial, Finance, Legal/IP, Operations, Product
ni Architecture; coordina sus decisiones y deja explícito qué está aprobado, qué es hipótesis y qué requiere gate.

Antes de fijar packaging o pricing, usar `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` para
separar Product Service, nivel de productización, delivery model, operating mode y engagement. Pricing no debe
convertir un delivery model —por ejemplo Managed Squad o Staff Augmentation— en una oferta distinta sin decisión
de negocio explícita.
Tampoco debe convertir toda venta en Product Service: cargar
`docs/business-models/EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md`, clasificar primero oferta/servicio,
capability, engagement, project/campaign, deliverable/asset y nivel de productización, y pricear la categoría real.
Una campaña audiovisual, un plan de medios o un brandbook pueden ser servicio, project o deliverable sin ser Product
Service.

Para Creator Influence & Content, cargar además `docs/business-models/media-distribution/CREATOR_INFLUENCE_CONTENT_PRICING_INTEGRITY_PACK_V1.md` y el benchmark fechado `docs/audits/commercial/CREATOR_INFLUENCE_CONTENT_MARKET_RESEARCH_2026-07-29.md`. Sus bandas y porcentajes son hipótesis de validación: no sustituyen Finance, Legal ni el cost-to-serve real.
El pricing de servicios 2028 debe poder operar sobre Product Services AI-native: separar people capacity, platform,
agent/provider usage, governance, implementation, risk, rights y recurring economics; no asumir que AI-native implica
self-service o eliminar personas.

## Fuentes y ownership

Leer primero el modelo concreto en `docs/business-models/`, después:

- `docs/business-models/README.md` y `efeonce-business-model-operator`;
- `docs/documentation/finance/pricing-comercial.md` para el catálogo, engine y quote runtime;
- `.codex/skills/gtm-architect/modules/03_OFFER_PACKAGING_PRICING.md` para packaging y motion;
- `.codex/skills/commercial-expert/` para negociación y venta;
- `.codex/skills/greenhouse-finance-accounting-operator/` para costos, margen, cash y reconocimiento;
- `.codex/skills/legal-privacy-ip-operator/` para derechos, providers, datos y liability.

| Decisión | Owner |
|---|---|
| Oferta, buyer, packaging y motion | Strategy + Commercial + práctica |
| Cost-to-serve, margen, cash y reconocimiento | Finance |
| Derechos, pass-through, providers y liability | Legal/IP + Commercial |
| Catálogo, cotización, approval y snapshots | Product + Finance + Architecture |
| Delivery, capacidad, SLA y RACI | Practice + Operations |

## Invariante central: separar capas

Nunca inferir una capa desde otra:

| Capa | Pregunta |
|---|---|
| Market category | ¿Cómo se ubica? |
| Product service / offer | ¿Qué compra y qué resultado controlable recibe? |
| Delivery model | ¿Cómo se entrega y quién responde? |
| Engagement | ¿Por cuánto tiempo y con qué cadencia? |
| Operating mode | ¿Quién opera cada lane? |
| Value metric | ¿Qué unidad representa el valor? |
| Billing unit | ¿Qué se factura? |
| Revenue stream | ¿Cómo se reconoce y renueva? |
| Economics | ¿Qué consume margen, capacidad y cash? |
| Contract | ¿Qué se promete, excluye y protege? |

Ejemplos de delivery: Productized Service, Managed Squad, Staff Augmentation, Studio Access, Implementation,
Advisory y Platform-enabled Service. Ejemplos de engagement: On-Going, On-Demand y Sample Sprint. Un cambio de
delivery no crea automáticamente un producto nuevo.

## Workflow obligatorio

### 1. Enmarcar

Registrar oferta, ICP, buyer, JTBD, trigger, resultado controlable, alternativa desplazada, owner, geografía,
moneda, capacidad, estado y decisión que el pricing debe habilitar. Si ICP, JTBD, buying group o decision process
no están modelados, cargar `efeonce-customer-model-operator`. Separar hechos, decisiones, hipótesis y unknowns.

### 2. Elegir la métrica de valor

Evaluar, según la oferta:

- capacidad gobernada o lane;
- implementación, sprint o milestone;
- retainer por scope y cadencia;
- uso gobernado;
- workspace, tenant, seat o acceso;
- outcome verificable;
- licencia/IP;
- mínimo comprometido;
- híbrido base + variable.

La métrica debe crecer con el valor del cliente y ser explicable. No usar horas, piezas, artículos, prompts o
tokens como unidad pública principal si eso commoditiza la oferta; pueden ser inputs internos de capacity/costing.

### 3. Diseñar packaging

Construir `wedge → core → expansion`. Usar hasta tres tiers sólo cuando haya evidencia de segmentos o willingness-
to-pay distintos. Cada tier debe declarar:

- alcance incluido y excluido;
- capacidad, límites, cadence y SLA;
- dependencias y responsabilidades del cliente;
- overage, change order, pause, refund y stop-loss;
- renovación, expansión y downgrade;
- riesgos, rights y providers incluidos/pass-through.

No crear fences artificiales por features si no cambian valor, capacidad, riesgo o governance.

### Creative Velocity y modular production

La unidad pública recomendada es capacity envelope/outcome gobernado, no horas ni piezas. Separar Diagnostic,
Sprint, Flex/Managed Capacity, Dedicated Creative Pod, Performance Creative Lane y Modular Production Lane. Una
experiencia modular puede tener líneas distintas para capacidad, implementación/IP, gobierno/plataforma, derechos y
pass-through; no convertir templates, assets o créditos en una calculadora de piezas.

En SKY, Adobe Express y SharePoint son evidencia de delivery y herramientas de una implementación; no autorizan por
sí solos precio de producto, equivalencias por asset o margin assumptions. Validar tiempo de configuración, template
maintenance, QA, derechos, portabilidad, cost-to-serve y capacidad antes de pricear un producto independiente.

`Embedded Managed Pod` no puede pricearse como Staff Augmentation. La capacidad reservada debe incluir integration
cost: immersion, rituales, coordinación, memoria, continuidad, backup, soporte y governance. Separar fee de
capacidad, implementación/immersion, platform/governance, rights y pass-through; validar margen y cost-to-serve por
cuenta.

Cuando Efeonce absorbe equipo, infraestructura, computadores, licencias, contratación, payroll, provisionales,
reemplazos y soporte, el modelo es `Fully Managed Creative Capacity`: un fee mensual integral por una capacity
envelope definida. No usar “llave en mano” para ocultar límites ni convertirlo en unlimited.

La economía se calcula por país y pod: costo humano, infraestructura, licencias, administración laboral, impuestos,
FX, proveedores, seguros, DPA, working capital, soporte y reserva de riesgo. La cobertura global de Efeonce no elimina
la parametrización jurídica, fiscal y laboral local.

### 4. Construir revenue architecture

Separar fee de diagnóstico, implementación, recurrente, squad/capacity, staff augmentation, platform/governance,
usage, provider pass-through, IP/licensing, rights, comisión y revenue share. Registrar por línea:

`value_trigger`, `billing_unit`, `frequency`, `minimum_commitment`, `included`, `excluded`, `cost_driver`,
`renewal_trigger`, `expansion_trigger`, `recognition_boundary` y `evidence`.

### 5. Costear y validar economics

Calcular por oferta × cuenta × delivery model × operating mode × provider × cohorte:

- fully loaded cost y cost-to-serve;
- gross margin y contribution margin;
- utilization, realization, capacity y bench;
- provider/compute/storage/licensing;
- retries, support, reserve, refunds y bad debt;
- DSO, FX y working capital;
- CAC/payback cuando exista muestra;
- GRR, NRR, expansion y sensitivity base/downside/upside.

No esconder costo humano dentro de usage, credits o pass-through. Separar capacidad operacional de horas billable
de pricing. Finance debe reconciliar la aritmética y el tratamiento contable.

### 6. Aplicar governance

Validar mínimo comprometido, piso de margen, bandas de descuento, maker-checker, effective dates, versionado de
cotización, FX snapshot, audit trail y blast radius sobre quotes/contratos activos. Un cambio de catálogo no
reescribe cotizaciones históricas.

### 7. Validar demanda

Entregar hipótesis, experimento, muestra, métrica primaria, threshold, stop condition, owner, plazo y evidence
ledger. `Approved for validation` permite sólo pilotos/SOW gobernados; no venta general, checkout ni claims de
tracción.

## Guardrails transversales

- ASaaS no equivale a SaaS, ARR ni producto software.
- No hay pricing defendible sin cost-to-serve, margen objetivo y sensibilidad.
- Revenue recurrente necesita trigger contractual y evidencia de renovación.
- Project, recurring, platform, usage, IP, pass-through y credits se separan.
- Product Service no es sinónimo de oferta, proyecto ni entregable; pricing no puede otorgar esa madurez por etiqueta.
- Credits nunca son dinero, horas, tokens, piezas ni derechos; requieren ledger, policy, expiración y owner.
- Un servicio compuesto no transfiere ownership ni permite doble cobro de shared services.
- Providers de agentes son adapters/pass-through gobernados, no automáticamente productos o partnerships.
- La cara contractual y relacional puede ser Efeonce aunque una marca de producto nombre la solución.
- Ningún precio se considera aprobado por aparecer en un documento, CSV, deck o seed.
- Una cifra externa necesita fuente y fecha; una cifra interna necesita fuente de costos y confidence.

## Output: Pricing Integrity Pack

Emitir:

1. offer/packaging matrix;
2. delivery and engagement matrix;
3. value metric/billing unit decision;
4. revenue architecture;
5. cost-to-serve and margin scenarios;
6. discount, approval and effective-date guardrails;
7. quote/version/snapshot policy;
8. validation plan and evidence ledger;
9. open decisions, owners and review date;
10. verdict: `hypothesis_only`, `approved_for_validation`, `commercially_approved`, `blocked_by_finance`,
    `blocked_by_legal`, `scale_constrained` o `superseded`.

## Referencias load-on-demand

- [General pricing patterns](references/general-pricing-patterns.md) — métodos, métricas, packaging, delivery,
  governance y economics.
- `docs/documentation/finance/pricing-comercial.md` — catálogo, engine y quote builder de Greenhouse.
- `.codex/skills/gtm-architect/modules/03_OFFER_PACKAGING_PRICING.md` — estrategia de packaging.
- `.codex/skills/creative-practice/modules/04_PRICING.md` — Creative Studio cuando aplique.
- Modelo concreto de la oferta en `docs/business-models/` — la skill no lo sustituye.
