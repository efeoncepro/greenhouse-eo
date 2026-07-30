# Business Models — índice y contrato documental

> **Estado:** categoría documental canónica
> **Owner:** Efeonce Strategy + Finance + Product + práctica dueña de cada modelo
> **Creado:** 2026-07-19

## Propósito

`docs/business-models/` contiene la lógica económica durable de una oferta, producto, plataforma o portfolio Efeonce:
quién compra, qué valor recibe, cómo se entrega, qué unidades se cobran, qué costos y riesgos se absorben, cómo
se protege el margen y qué evidencia habilita escalar.

Un business model no es un tarifario. Es un sistema de decisiones comprobables que conecta propuesta de valor,
operación, monetización, unit economics, riesgo y validación.

El método y los invariantes operativos viven en la skill `efeonce-business-model-operator`. Este directorio
mantiene los modelos concretos y sus versiones; no duplica la skill ni convierte una hipótesis en contrato.

El modelo transversal de cliente —ICP, segmentación, beachhead, JTBD, buying group, decision/procurement process,
evidence, adopción, retención y expansión— vive en `efeonce-customer-model-operator`. La arquitectura transversal de
packaging, pricing, billing, descuentos, economics y validación de monetización vive en `efeonce-pricing-operator`;
los modelos concretos sólo fijan las decisiones propias de cada línea.

Todo Business Model y Product Service debe instanciar el [`Efeonce Operator-First Product & Growth Contract V1`](../strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md)
con una sección `Operator & Buying Group Contract`: operador nombrado por función, JTBD, primer valor, recorrido
de champion, buying group, decision/paper process, evidencia de adopción y triggers de renovación/expansión.
El estado de cobertura se mantiene en [`Operator & Buying Group Registry V1`](OPERATOR_BUYING_GROUP_REGISTRY_V1.md).

La arquitectura que explica cómo se relacionan el modelo corporativo, la plataforma, las capabilities, el
packaging y los submodelos vive en [`EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md`](EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md).
La separación entre marca paraguas, línea de negocio/práctica, product brand, oferta y delivery vive en
[`EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md`](../architecture/EFEONCE_PORTFOLIO_BRAND_BUSINESS_LINE_ARCHITECTURE_V1.md).

La definición transversal de oferta, productización, delivery model, operating mode y engagement vive en
[`Efeonce Product Service Operating Model V1`](EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md). Los modelos de cada
línea deben referenciarlo y declarar sus diferencias; no deben redefinir `Product Service` localmente.

La capa transversal que gobierna partners, providers, licencias, pass-through, co-selling, capability enablement y
captura de valor vive en [`Efeonce Partner & Provider Layer Operating Model V1`](EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md).

## Social Media

- [`Efeonce Social Media — Business Model V1`](creative-services/EFEONCE_SOCIAL_MEDIA_BUSINESS_MODEL_V1.md)
- [`Efeonce Social Media — Product Service Contract V1`](../services/creative-services/EFEONCE_SOCIAL_MEDIA_PRODUCT_SERVICE_CONTRACT_V1.md)
- [`Efeonce Social Media — Pricing Integrity Pack V1`](creative-services/EFEONCE_SOCIAL_MEDIA_PRICING_INTEGRITY_PACK_V1.md)
- [`Efeonce Social Media — Customer Model Integrity Pack V1`](creative-services/EFEONCE_SOCIAL_MEDIA_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md)
- [`Efeonce Social Media — Differentiation & Positioning V1`](creative-services/EFEONCE_SOCIAL_MEDIA_DIFFERENTIATION_POSITIONING_V1.md)
- [`Efeonce Run & Gun Production — Offer V1`](../services/creative-services/EFEONCE_RUN_AND_GUN_PRODUCTION_OFFER_V1.md)
- [`Efeonce Social Media — Pricing Validation Addendum`](creative-services/EFEONCE_SOCIAL_MEDIA_PRICING_VALIDATION_ADDENDUM_2026-07-29.md)
- [`Efeonce Social Media — Operating Model V1`](../services/creative-services/EFEONCE_SOCIAL_MEDIA_OPERATING_MODEL_V1.md)
- [`Efeonce Social Media — Subservices Catalog V1`](../services/creative-services/EFEONCE_SOCIAL_MEDIA_SUBSERVICES_CATALOG_V1.md)
- [`Social Media Service Market Research 2026-07-29`](../audits/commercial/SOCIAL_MEDIA_SERVICE_MARKET_RESEARCH_2026-07-29.md)
- [`Search + Social Visibility Composition V1`](search-visibility-360/SEARCH_SOCIAL_VISIBILITY_COMPOSITION_V1.md)
- [`Search + Social Visibility — Measurement Contract V1`](search-visibility-360/SEARCH_SOCIAL_MEASUREMENT_CONTRACT_V1.md)

Estado: `Approved for validation`. El servicio es humano y recurrente; Efeonce Run & Gun Studio es una capability real
componible, mientras Globe / Creative Studio no forma parte de la promesa base actual. `Approved for validation` habilita
pilotos y SOW gobernados, no venta self-serve ni aprobación comercial definitiva.

## Creative Services offer architecture

- [`Creative Services — Offer Architecture V2`](../services/creative-services/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md)
- [`Creative Services — Operating Model V1`](../services/creative-services/EFEONCE_CREATIVE_SERVICES_OPERATING_MODEL_V1.md)
- [`Creative Services Offer Architecture Decision V1`](../architecture/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_DECISION_V1.md)
- [`Creative Services Market Benchmark 2026-07-30`](../audits/commercial/CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-30.md)
- [`Creative Velocity — Modular Production Addendum V1`](../services/creative-services/EFEONCE_CREATIVE_VELOCITY_MODULAR_PRODUCTION_ADDENDUM_V1.md)
- [`Embedded Creative Pod Operating Model V1`](../services/creative-services/EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1.md)

`Fully Managed Creative Capacity` es la modalidad en la que Efeonce absorbe equipo, infraestructura, licencias,
costos laborales, provisionales, continuidad y soporte, mientras el cliente paga un fee mensual por una capacidad
definida. Aplica globalmente, con parametrización legal, laboral, fiscal, monetaria y de procurement por país.

La arquitectura V2 organiza el catálogo en cuatro rutas de compra —Creative Velocity, Brand & Campaign Systems,
Content Production System y AI Creative Operations— y conserva los Product Services, delivery models, engagement,
rights y economics separados. No habilita pricing público, checkout ni venta self-serve; el estado general sigue
`Approved for validation`.

El addendum de Creative Velocity documenta la capacidad modular observada en SKY, su separación entre servicio, IP
y producto, y los gates para evolucionar de Modular Production Lane a una experiencia productizada.

## Fronteras con las demás categorías

| Categoría | Pregunta que responde | No debe contener como canon |
| --- | --- | --- |
| `docs/strategy/` | ¿Qué creemos y hacia dónde compite Efeonce? | Pricing o mecánica económica detallada de una oferta |
| `docs/context/` | ¿Qué contexto de negocio necesita un agente para decidir bien? | El modelo completo ni sus hojas de cálculo |
| `docs/business-models/` | ¿Cómo crea, entrega y captura valor esta oferta de forma sostenible? | Cotizaciones de clientes o contratos firmados |
| `docs/services/` | ¿Qué resultado asume Efeonce y con qué alcance operativo? | Unit economics internos, costos o pricing confidencial |
| `docs/architecture/` | ¿Qué contrato técnico y decisiones estructurales soportan el modelo? | La estrategia comercial completa |
| `docs/commercial/` | ¿Qué propuesta, licitación o investigación comercial concreta se ejecutó? | Una regla corporativa nacida de un solo deal |
| Finance/CPQ runtime | ¿Cuál es el costo, precio, margen y aprobación vigente de una cotización? | Narrativa estratégica no ejecutable |

## Estructura canónica

```text
docs/business-models/
  README.md
  BUSINESS_MODEL_TEMPLATE.md
  PORTFOLIO_BUSINESS_MODEL_TEMPLATE.md
  efeonce-group/
    EFEONCE_GROUP_BUSINESS_MODEL_V1.md
  <oferta-o-producto>/
    <NOMBRE>_BUSINESS_MODEL_V<n>.md
    <NOMBRE>_<SUBMODELO>_V<n>.md       # sólo si merece contrato propio
    evidence/                          # research, experimentos y cohorts anonimizados
```

Reglas:

- una oferta tiene un solo business model vigente por versión;
- un submodelo —por ejemplo créditos, marketplace o revenue share— puede separarse si tiene lifecycle,
  riesgos o owners propios;
- costos, márgenes y pricing por cliente viven en sistemas financieros, propuestas o contratos; el modelo sólo
  conserva fórmulas, pisos, bandas autorizadas y gates;
- no guardar PII, secretos, credenciales, provider keys ni términos confidenciales de clientes en esta carpeta;
- toda cifra externa lleva fuente y fecha; toda cifra interna identifica su fuente de costo y nivel de confianza;
- una versión aprobada no se reescribe para ocultar una decisión material: se crea V2 o una decisión que la
  superseda.
- un modelo de portfolio no reemplaza los modelos de las ofertas; declara boundaries, shared services,
  cross-sell, asignación de costos y reglas de capital.

## Estados

| Estado | Significado | Puede venderse |
| --- | --- | --- |
| `Draft` | Estructura incompleta; hipótesis no revisadas | No |
| `Proposed` | Lista para revisión de Strategy/Finance/Product/Legal | No, salvo piloto explícito |
| `Approved for validation` | Tesis y guardrails aprobados; faltan cohorts o parámetros comerciales | Sólo pilotos/SOW gobernados |
| `Commercially approved` | Pricing, costos, contrato, impuestos, soporte y controles aprobados | Sí, dentro del alcance declarado |
| `Deprecated` | No usar para negocio nuevo | No |
| `Superseded` | Reemplazado por otra versión enlazada | No |

`Approved for validation` no equivale a `Commercially approved`. Ningún documento puede habilitar checkout,
top-ups, facturación o clientes externos por sí solo.

## Taxonomía obligatoria del modelo

Todo business model debe separar al menos estas dimensiones:

1. **Oferta / value proposition:** problema, ICP, buyer, resultado y alternativa desplazada.
2. **Modelo de delivery:** quién dirige, quién aporta capacidad y quién responde por el outcome.
3. **Forma de engagement:** duración y forma contractual/comercial de la relación.
4. **Modo operativo:** asignación de autoridad en una ejecución concreta; no se infiere del contrato.
5. **Arquitectura de ingresos:** líneas recurrentes, variables, implementación, derechos y pass-through.
6. **Unidad de medición y cobro:** qué evento devenga valor y qué queda fuera.
7. **Costos y unit economics:** fully loaded cost, margen, riesgo, working capital y sensibilidad.
8. **Scope y accountability:** incluidos, exclusiones, SLA/telemetría, change order y refunds.
9. **Derechos, compliance y datos:** IP, licencias, consentimiento, privacidad, territorio y retención.
10. **Validación:** hipótesis, experimentos, cohortes, métricas, gates y condiciones de abandono.

## Gobierno y aprobaciones

| Plano | Owner mínimo | Gate |
| --- | --- | --- |
| Propuesta de valor y packaging | Strategy + práctica | ICP/JTBD y frontera de oferta claros |
| Delivery y SLA | Práctica + Operations | RACI, capacidad, estados degradados y medición |
| Costos, margen, créditos y refunds | Finance | fully loaded cost, reconocimiento y piso de margen |
| Derechos, privacidad y contrato | Legal/IP/Privacy | licencias, consentimiento, DPA y cláusulas aprobadas |
| Plataforma, ledger y entitlement | Product + Architecture + Security | ADR/spec/runtime y auditoría verificables |
| Lanzamiento comercial | Leadership + owners anteriores | todos los gates y rollback/stop conditions |

## Modelos disponibles

- [Efeonce Product Service Operating Model V1](EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md) — contrato transversal
  para nombrar, empaquetar, entregar, medir y gobernar Product Services; no autoriza pricing o venta por sí solo.

- [Portfolio Business Model Template](PORTFOLIO_BUSINESS_MODEL_TEMPLATE.md) — contrato para el modelo de
  Efeonce Group y sus capabilities; no autoriza por sí solo pricing, venta, inversión ni spinout.
- [Efeonce Group Business Model V1](efeonce-group/EFEONCE_GROUP_BUSINESS_MODEL_V1.md) — draft portfolio-level,
  todavía requiere reconciliación de Finance, Commercial, Product y Legal/IP.
- [Efeonce Growth Platform Business Model V1](growth-platform/EFEONCE_GROWTH_PLATFORM_BUSINESS_MODEL_V1.md) —
  draft de la hipótesis de plataforma; no afirma SaaS, ARR ni PMF.
- [Efeonce AEO Business Model V1](aeo/EFEONCE_AEO_BUSINESS_MODEL_V1.md) — draft de wedge/capability.
- [Search Visibility 360 Business Model V1](search-visibility-360/SEARCH_VISIBILITY_360_BUSINESS_MODEL_V1.md) + [Business Model Integrity Pack](search-visibility-360/SEARCH_VISIBILITY_360_BUSINESS_MODEL_INTEGRITY_PACK_V1.md) + [Customer Model Integrity Pack](search-visibility-360/SEARCH_VISIBILITY_360_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md) —
  draft de capability en construcción; alcance comercial mid-market y enterprise.
- [Search + Social Visibility Composition V1](search-visibility-360/SEARCH_SOCIAL_VISIBILITY_COMPOSITION_V1.md) — composición propuesta entre Search Visibility 360 y Social Media; no es una tercera línea contractual.
- [Wave Business Model V1](wave/WAVE_BUSINESS_MODEL_V1.md) — `Proposed`; productora/capability con cinco familias y
  Agentic Readiness Audit como wedge prioritario de validación:
  Search Visibility 360, Web Experience 360, Measurement & Analytics, Agent Systems & Platforms y Digital
  Automation & Integrations.
- [Media & Distribution Business Model V1](media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md) —
  `Approved for validation`; tres soluciones comerciales, siete capacidades de delivery y Reach como product brand
  habilitadora. No autoriza pricing público ni venta general.
- [Creator Influence & Content Business Model V1](media-distribution/CREATOR_INFLUENCE_CONTENT_BUSINESS_MODEL_V1.md) —
  submodelo de Influencers, Creators & UGC; separa intelligence, activation, content, partnerships y whitelisting.
  `Approved for validation`; no autoriza pricing público ni venta general.
- [Creator Influence & Content Pricing Integrity Pack V1](media-distribution/CREATOR_INFLUENCE_CONTENT_PRICING_INTEGRITY_PACK_V1.md) —
  bandas de validación, fee fijo, pass-through, coordinación de terceros, performance fee, mínimos y condiciones de pago.
- [Creator Influence & Content Market Research 2026-07-29](../audits/commercial/CREATOR_INFLUENCE_CONTENT_MARKET_RESEARCH_2026-07-29.md) —
  benchmark de agencias/plataformas, best practices, prácticas descartadas y modelo propio escalable.

- [Efeonce Creative Studio V1.1](creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md) —
  `Approved for validation`; incorpora la doctrina de autoría humana y mantiene B2B2B como hipótesis gateada.
- [Studio Credits](creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md) — política económica V1,
  todavía sin precio público ni venta self-serve.
- [Efeonce Partner & Provider Layer V1](EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md) — `Approved for validation`; modelo transversal para relaciones comerciales y tecnológicas, sin declarar por sí solo partnerships aprobados ni pricing.
- [Creative Studio Skill Adoption Matrix](creative-studio/EFEONCE_CREATIVE_STUDIO_SKILL_ADOPTION_V1.md) —
  cobertura de skills, fronteras de ownership, validación y dominios auditados sin cambio.
- [Higgsfield Partnership & Vertical Expansion Research 2026-07-29](../audits/commercial/HIGGSFIELD_PARTNERSHIP_AND_VERTICAL_EXPANSION_RESEARCH_2026-07-29.md) —
  benchmark de partnerships, advertising beachhead, enablement y expansión vertical; evidencia direccional, no aprobación comercial.
- [Magnific Go-to-Market & Platform Expansion Research 2026-07-29](../audits/commercial/MAGNIFIC_GO_TO_MARKET_AND_PLATFORM_EXPANSION_RESEARCH_2026-07-29.md) —
  benchmark de wedge visual, workflow productization, ecosystem distribution, expansión Business/Enterprise y límites de evidencia.
- [Globe Market, Distribution & Monetization Strategy V1](../strategy/EFEONCE_GLOBE_MARKET_DISTRIBUTION_AND_MONETIZATION_STRATEGY_V1.md) —
  arquitectura de segmentos, distribución masiva, ventas B2B/enterprise, canales, packaging y validación; `Approved for validation`.
