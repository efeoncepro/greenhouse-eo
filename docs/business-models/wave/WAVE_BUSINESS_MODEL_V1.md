# Wave Business Model V1

> **Estado:** `Draft` — estructura y boundaries definidos; pricing, costos, evidencia y aprobación comercial pendientes.
> **Owner:** Strategy + Wave + Product/Architecture + Finance + Legal/IP
> **ADR:** [`EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md)
> **Pricing Integrity Pack:** [`WAVE_PRICING_INTEGRITY_PACK_V1.md`](WAVE_PRICING_INTEGRITY_PACK_V1.md)

## Tesis

Wave es una marca de producto de Efeonce que diseña, construye y opera la capa digital inteligente de una organización:
su visibilidad en búsqueda, sus experiencias web, su medición y sus sistemas de agentes.

La relación y contrato se lideran con Efeonce. Wave puede aparecer como nombre del producto/capability contratado,
pero no se presenta como una agencia o proveedor contractual separado.

## Portfolio

| Familia | Qué compra el cliente | Engagements iniciales |
|---|---|---|
| **Search Visibility 360** | SEO + AEO integrado, autoridad, intelligence y operación orgánica | Diagnostic, AEO Readiness, SEO Foundation, Architecture & Authority, Operating System, Recovery/Migration |
| **Web Experience 360** | Web diseñada para humanos, buscadores y agentes | Web Foundation, Conversion Website, Agent-Ready Website, Rebuild/Migration, Performance Operations |
| **Measurement & Analytics** | Instrumentación, calidad de datos y lectura de performance | Measurement Audit, Tagging/Data Layer, GTM/GA4 Implementation, Dashboard & Attribution, Analytics Operations |
| **Agent Systems & Platforms** | Agentes propios o desplegados sobre plataformas gestionadas | Agent Strategy, Custom Agent System, Managed Agent Deployment, Integrations, Evaluation & Operations |
| **Digital Automation & Integrations** | Workflows e integración de sistemas | API/Workflow Sprint, Data Pipeline, Automation Build, Integration Operations |

## Boundaries

- Globe posee contenido y producción creativa; puede ser partner de Wave.
- Reach posee medios, PR y distribución.
- Wave puede integrar cualquiera de esas capacidades en un delivery compuesto sin absorber su ownership.

## Offer versus delivery

Las cinco familias de Wave describen **qué compra el cliente**. No fijan por sí solas cómo se entrega. La misma
familia puede contratarse bajo distintos modelos de delivery:

| Capa | Opciones Wave | Pregunta que responde |
|---|---|---|
| **Product service / oferta** | Search Visibility 360, Web Experience 360, Measurement & Analytics, Agent Systems & Platforms, Digital Automation & Integrations | ¿Qué problema y resultado aborda Wave? |
| **Delivery model** | **Productized Service**, **Managed Squad**, **Staff Augmentation**, **Implementation**, **Advisory**, **Platform-enabled Service** | ¿Quién aporta capacidad, cómo se gobierna y quién responde por el delivery? |
| **Engagement** | **On-Going**, **On-Demand**, **Sample Sprint** | ¿Cuál es la duración y cadencia comercial? |
| **Operating mode** | `efeonce-managed`, `co-operated`, `client-operated` cuando el scope lo permita | ¿Quién opera cada lane y conserva la autoridad? |
| **Ecosystem composition** | Wave sola o Wave + Efeonce Digital/Kortex + Globe + Reach + Greenhouse | ¿Qué capabilities del ecosistema participan? |

Un **Managed Squad** de Wave puede operar Search Visibility 360, una plataforma web, measurement o agentes. Un
**Staff Augmentation** puede asignar developers, architects, tracking specialists o agent engineers al equipo del
cliente. En ambos casos, el product service define el alcance/resultado y el delivery model define la capacidad,
accountability, SLA y economics.

Cuando participan otras capabilities, Efeonce conserva la relación principal y el SOW debe declarar owner,
RACI, interfaces, dependencias y límites por lane. El ecosistema no convierte automáticamente el engagement en un
producto nuevo ni transfiere ownership entre Wave, Efeonce Digital, Globe, Reach o Greenhouse.

## Delivery

Wave puede operar como managed service, productized service, implementation, advisory o platform-enabled service.
La oferta debe separar modelo de delivery, engagement y modo operativo. Cada SOW debe declarar RACI, alcance,
exclusiones, dependencias, evidencia, soporte y cambio de scope.

## Revenue y validación

La value metric puede ser implementación, sprint, lane, capacidad gobernada, retainer recurrente o resultado
verificable según familia. No se publican precios desde este draft. Antes de `Commercially approved` deben existir
baseline/after evidence, cost-to-serve, margen, capacidad, derechos/IP, límites de claims y señales de renovación.

La primera aplicación del método transversal de pricing está documentada en el
[`Wave Pricing Integrity Pack`](WAVE_PRICING_INTEGRITY_PACK_V1.md). Su verdict actual es `hypothesis_only`.

## No confundir

- Search Visibility 360 no es sólo SEO ni sólo AEO.
- Measurement & Analytics no es únicamente reporting; incluye tagging, data layer, instrumentación y governance.
- Agent Systems & Platforms no es una colección de vendors: los vendors son adapters de delivery.

## Gates pendientes

- [ ] ICP, buyer, triggers y claims por familia.
- [ ] packaging, pricing y unidad de valor por engagement.
- [ ] cost-to-serve, capacidad y margen por lane.
- [ ] contratos, privacidad, IP y límites de responsabilidad de agentes.
- [ ] evidencia de repetibilidad y renovación.
- [ ] catálogo público aprobado por Strategy/Commercial/Legal.
