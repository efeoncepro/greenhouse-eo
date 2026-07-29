# Wave Business Model V1

> **Estado:** `Proposed` — tesis, portfolio y boundaries definidos; listo para revisión de Strategy/Finance/Product/Legal. Pricing, costos, evidencia y aprobación comercial siguen pendientes.
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

## Wedge prioritario para validación

**Agentic Readiness Audit** es el wedge de entrada propuesto para Wave. Evalúa si la capa digital de una organización
puede ser descubierta, interpretada y operada por agentes, y entrega un baseline priorizado de remediación.

No crea una sexta familia: cruza **Search Visibility 360** y **Web Experience 360** como entrada, y puede expandirse
hacia **Agent Systems & Platforms**, **Measurement & Analytics** y **Digital Automation & Integrations** según los gaps
encontrados. Lighthouse es un componente técnico del diagnóstico, no una oferta independiente.

## Product Services compuestos

Las cinco familias anteriores son las capabilities base de Wave. Sobre ellas Wave puede construir **Product Services
compuestos**, con una experiencia, método, contracts, evidence y outcome propios:

| Product Service | Composición principal | Rol en Wave |
|---|---|---|
| **Experience LaunchOps** | Web Experience 360 + Search Visibility 360 + Measurement & Analytics + Agent Systems + Automation | Sistema operativo para diseñar, producir, aprobar, publicar, medir y mejorar experiencias digitales launch-ready |
| **Agentic Readiness** | Search Visibility 360 + Web Experience 360 + Agent Systems + Measurement + Automation | Diagnóstico/wedge para descubrir, interpretar y operar la capa digital de una organización mediante agentes |

Un Product Service compuesto no crea una nueva familia ni transfiere ownership entre capabilities. Wave conserva el
ownership del producto; Globe, Reach, Efeonce Digital/Kortex o Greenhouse participan sólo por interfaces y RACI
explícitos.

## Arquitectura de puertas de entrada

Wave no debe presentar un único mega-diagnostic que intente cubrir todo el portfolio. La adquisición se organiza en
puertas especializadas, cada una con su propio problema, evidencia y ruta de expansión:

| Puerta | Diagnóstico | Product Service primario | Expansión natural |
|---|---|---|---|
| **AI Visibility & Search** | Brand Visibility Snapshot / Grader | Search Visibility 360 | Web Experience, Measurement, Content/Creative |
| **Agentic Readiness** | Agentic Readiness Snapshot / Audit | Web Experience 360 + Agent Systems & Platforms | Automation, Measurement, Search Visibility |
| **Launch Readiness** | Experience / Launch Diagnostic | Experience LaunchOps | Search, Web, Measurement, Agents, Automation y Globe cuando corresponda |

El Brand Visibility Grader es la primera puerta de Wave y permanece especializado en cómo la IA y los motores de
búsqueda representan a la marca. Agentic Readiness es una segunda puerta para evaluar si la capa digital puede ser
descubierta, interpretada y operada por agentes. Experience LaunchOps es una entrada posterior para organizaciones
que necesitan coordinar la producción, aprobación, publicación, medición y mejora de experiencias digitales.

Cada diagnóstico debe terminar en una decisión concreta —Snapshot, Audit, sesión de lectura o remediación— y recomendar
la ruta de Wave correspondiente. No se mide sólo por leads: se mide por cuentas calificadas, conversión a Audit,
conversión a Product Service, pipeline contribution, costo por diagnóstico, tiempo a primer valor y expansión.

## Boundaries

- Globe posee contenido y producción creativa; puede ser partner de Wave.
- Reach posee medios, PR y distribución.
- Wave puede integrar cualquiera de esas capacidades en un delivery compuesto sin absorber su ownership.

## Offer versus delivery

Las cinco familias de Wave describen las **capabilities base** que el cliente puede comprar o que componen un Product
Service. Los Product Services compuestos describen un resultado integrado. Ninguna de estas capas fija por sí sola cómo
se entrega. La misma familia puede contratarse bajo distintos modelos de delivery:

| Capa | Opciones Wave | Pregunta que responde |
|---|---|---|
| **Capability / familia base** | Search Visibility 360, Web Experience 360, Measurement & Analytics, Agent Systems & Platforms, Digital Automation & Integrations | ¿Qué capability aporta Wave? |
| **Product service / oferta** | Experience LaunchOps, Agentic Readiness u otra composición aprobada | ¿Qué problema y resultado integrado compra el cliente? |
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
verificable según familia. No se publican precios desde este modelo propuesto. Antes de `Commercially approved` deben existir
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
