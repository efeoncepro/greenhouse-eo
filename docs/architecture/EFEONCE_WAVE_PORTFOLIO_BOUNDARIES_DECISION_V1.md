# ADR — Wave como productora de ingeniería digital, visibilidad y sistemas de agentes

> **Status:** Accepted direction · 2026-07-25
> **Scope:** Portfolio / Commercial / Wave / Search Visibility 360 / Web / Measurement / Agent systems / CRM / Globe / Reach
> **Canonical business model:** [`docs/business-models/wave/WAVE_BUSINESS_MODEL_V1.md`](../business-models/wave/WAVE_BUSINESS_MODEL_V1.md)
> **Related:** [`EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md`](../business-models/EFEONCE_BUSINESS_MODEL_ARCHITECTURE_V1.md) · [`GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md`](GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md)

## Contexto

Wave es una **marca de producto de Efeonce** para servicios digitales productizados. La documentación
existente la reducía a infraestructura digital y mezclaba parcialmente CRM, SEO/AEO, analytics y agentes con
Efeonce Digital. La decisión de portfolio necesita distinguir con claridad quién vende/gobierna cada capability
sin fragmentar la relación del cliente: la cara, relación contractual y confianza frente al cliente siempre las
lidera Efeonce; Wave nombra el producto/capability que se entrega.

También se definió que **Search Visibility 360** es un producto 360 que integra SEO y AEO, pero no agota el
territorio de Wave. Wave además diseña, desarrolla, arquitecta y despliega web para humanos, buscadores y agentes;
construye measurement/analytics; y entrega sistemas de agentes propios o sobre plataformas administradas.

## Decisión

Wave queda definido como la productora de servicios de **ingeniería digital, visibilidad, medición y sistemas de
agentes**. Su cartera canónica tiene cinco familias:

1. **Search Visibility 360** — SEO + AEO, arquitectura de información y entidades, autoridad, search intelligence,
   optimización continua, recovery, migraciones y expansión internacional.
2. **Web Experience 360** — diseño, arquitectura, desarrollo y despliegue de experiencias web para humanos,
   buscadores y agentes; incluye performance, accesibilidad, conversión, datos estructurados y operaciones web.
3. **Measurement & Analytics** — tagging plans, data layer, GTM, GA4, eventos/conversiones, server-side tracking,
   dashboards, attribution, funnel analytics y governance de medición.
4. **Agent Systems & Platforms** — estrategia, arquitectura, construcción desde cero, integraciones, knowledge/RAG,
   orchestration, evaluación, observabilidad, guardrails y despliegue/operación sobre plataformas administradas de
   agentes. Los proveedores concretos son implementaciones posibles, no la taxonomía de Wave.
5. **Digital Automation & Integrations** — APIs, webhooks, workflows, data pipelines, automatización e integración
   entre web, analytics, agentes y sistemas empresariales.

## Boundaries de ownership

| Capability | Owner primario | Participación de Wave |
|---|---|---|
| Growth strategy, RevOps y CRM | Efeonce Digital | Integra web, datos o agentes cuando el scope lo requiere |
| Kortex / implementación CRM | Efeonce Digital + Kortex | Adaptadores técnicos o superficies conectadas, sin ownership comercial de CRM |
| Search Visibility 360 | Wave como productora | Coordina Globe/Reach cuando el plan lo requiere |
| Web, performance y arquitectura digital | Wave | Owner de diseño técnico, delivery y operación |
| Measurement & Analytics | Wave | Implementa y opera instrumentación bajo el contrato de medición |
| Sistemas de agentes | Wave | Owner de ingeniería y operación técnica; Efeonce Digital define el outcome de negocio cuando aplica |
| Contenido y producción creativa | Globe | Capability de Efeonce con plataforma, especialistas, Managed Squad y Staff Augmentation; partner de Wave cuando el plan necesita assets o producción |
| Medios, PR y amplificación | Reach | Partner de distribución cuando el plan lo necesita |

**CRM enablement no es una familia de Wave.** Puede existir una integración CRM dentro de una entrega Wave, pero la
estrategia, solución, contrato y ownership de CRM permanecen en Efeonce Digital/Kortex.

## Agent Systems & Platforms

La categoría incluye dos formas de delivery:

- **Custom Agent Systems:** agentes y runtimes diseñados y construidos desde cero.
- **Managed Agent Deployments:** arquitectura, configuración, integraciones, seguridad, evaluación y operación sobre
  plataformas gestionadas de terceros.

El término paraguas es **Agent Systems & Platforms**; no se crea una línea pública por proveedor. Copilot Studio,
Gemini Enterprise, Claude managed agents y equivalentes se documentan como adapters/providers dentro de una entrega,
no como marcas de portfolio.

## Consecuencias

- Wave deja de ser una etiqueta genérica de infraestructura y adquiere una cartera de productized services clara y
  nombrable como marca de producto.
- Search Visibility 360 es la propuesta 360 de SEO+AEO, no una capability separada de dos productos rivales.
- Globe conserva contenido/producción, personas y operación creativa; Wave conserva estrategia de visibilidad,
  ingeniería y medición.
- Efeonce Digital conserva CRM, RevOps y la decisión de negocio; Wave puede ejecutar la capa técnica conectada.
- Hacia el cliente Efeonce lidera la relación y Wave puede nombrar el producto/capability; Wave, Globe, Reach y
  Efeonce Digital no se presentan como agencias/proveedores contractuales separados.
- Un product service de Wave puede entregarse como Productized Service, Managed Squad, Staff Augmentation,
  Implementation, Advisory o Platform-enabled Service. No confundir la oferta con el delivery model.

## Taxonomía comercial obligatoria

Para cualquier propuesta de Wave se deben registrar por separado:

1. **Product service:** qué resultado/alcance compra el cliente.
2. **Delivery model:** cómo se aporta capacidad y quién responde por el delivery.
3. **Engagement:** duración y cadencia (`On-Going`, `On-Demand`, `Sample Sprint`).
4. **Operating mode:** quién opera cada lane (`efeonce-managed`, `co-operated`, `client-operated` cuando aplique).
5. **Ecosystem composition:** qué capabilities de Efeonce participan y cuáles son sus boundaries.

Wave puede operar una entrega sola o junto a Efeonce Digital/Kortex, Globe, Reach y Greenhouse. Un delivery
compuesto no cambia automáticamente el ownership del product service ni crea una nueva marca contractual.

## No decisiones

- Este ADR no aprueba pricing, claims públicos, ARR, margen, checkout ni venta self-serve.
- No convierte los proveedores de plataformas de agentes en partnerships, endorsements ni dependencias obligatorias.
- No crea un runtime nuevo ni cambia ownership técnico de Kortex, Globe, Greenhouse o Reach.

## Seguimiento

- El modelo económico y de packaging vive en `docs/business-models/wave/`.
- La taxonomía comercial derivada vive en `docs/services/README.md` y el context pack.
- Las skills de agencia y business model deben cargar este ADR antes de razonar sobre Wave.
