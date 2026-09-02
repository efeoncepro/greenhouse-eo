# Catálogo de servicios Efeonce

> **Propietario:** Efeonce Group SpA — RUT 77.357.182-1
> **Sitio:** <https://efeoncepro.com>
> **Estado:** categoría documental activa
> **Última actualización:** 2026-08-30

## Propósito

`docs/services/` define las capacidades que Efeonce entrega y opera como servicio para clientes. Una ficha de
servicio explica el resultado contratado, alcance, entregables, forma de trabajo, responsabilidades, evidencia,
límites y continuidad gestionada. La implementación de un cliente puede servir como referencia comprobada, pero
no convierte sus datos en datos de Greenhouse.

Esta categoría complementa las tres capas documentales obligatorias:

| Capa | Pregunta que responde |
|---|---|
| `docs/services/` | ¿Qué servicio ofrece y asume Efeonce, con qué resultado, alcance y gobierno? |
| `docs/architecture/` | ¿Cuál es el contrato técnico y qué no se debe romper? |
| `docs/documentation/` | ¿Cómo funciona la capacidad desde producto y operación? |
| `docs/manual-de-uso/` | ¿Cómo se ejecuta, verifica, diagnostica y escala? |

El foco comercial transversal —beachheads, ofertas de entrada, expansión y proof— vive en [`EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md`](../strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md). Las fichas de servicio mantienen el alcance y la accountability; no deben convertirse en un catálogo de adquisición sin buyer, trigger y motion.

## Fronteras

- No es un tarifario. Precios, descuentos y condiciones comerciales pertenecen a propuestas y contratos.
- No es un catálogo de componentes de software ni reemplaza `service_modules` o `/agency/services`.
- No es el objeto nativo `Service` de HubSpot. Ese objeto representa una instancia contratada/entregada dentro
  del CRM del cliente.
- No duplica arquitectura, manuales, auditorías ni informes. Cada ficha enlaza sus fuentes canónicas.
- Una referencia de cliente sólo puede reutilizarse externamente con la autorización correspondiente.

## Modelo de una ficha

Cada servicio debe declarar como mínimo:

1. promesa y resultado esperado;
2. problema y comprador/owner operativo;
3. alcance incluido, opcional y excluido;
4. entregables y evidencia de aceptación;
5. ciclo `intake -> inventory -> design -> propose -> approve -> execute -> verify -> document -> measure`;
6. responsabilidades Efeonce/cliente/plataforma;
7. dependencias, riesgos y estados degradados;
8. métricas con definición, período, baseline y denominador;
9. continuidad, soporte, cadence y procedimiento de cambio;
10. arquitectura, documentación funcional, manual y casos de referencia.

## Familias disponibles

- [HubSpot as a Service](hubspot-as-a-service/README.md)
- [Salesforce Practice](salesforce/README.md) — arquitectura de oferta por outcomes y lifecycle para CRM core,
  Marketing Cloud Engagement y Marketing Cloud Next, con operación, venta y coexistencia separadas.
- [Creative Services](creative-services/README.md) — incluye Social Media, su operación recurrente y la capability
  **Efeonce Run & Gun Studio**, que se comercializa mediante **Efeonce Run & Gun Production** con alcance propio.
- [Media & Distribution](media-distribution/README.md)

HubSpot as a Service pertenece a **RevOps & CRM**. Su arquitectura vigente usa seis familias por outcome, modos de
entrega transversales y overlays sectoriales; la evaluación inicial para fit/cotización es sin costo y un blueprint
pagado requiere entregable autónomo. Canon:
[`HUBSPOT_OFFER_ARCHITECTURE_V2.md`](hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md). Evidencia:
[`HUBSPOT_SERVICES_MARKET_BENCHMARK_2026-08-30.md`](../audits/commercial/HUBSPOT_SERVICES_MARKET_BENCHMARK_2026-08-30.md).
Los brochures históricos siguen gobernados por
[`HUBSPOT_BROCHURE_REVIEW_2026-07-26.md`](../audits/commercial/HUBSPOT_BROCHURE_REVIEW_2026-07-26.md).

Media & Distribution se vende mediante tres soluciones principales y una capa operativa: Distribution Strategy &
Media Architecture; Performance & Commerce Distribution; Influence, Earned & Partnership Distribution; y Managed
Media Operations como modalidad de operación, no como cuarta solución.
Performance & Commerce se estructura alrededor de Measurement & Signal Foundation, Performance Media Operations,
Commerce Media Operations, Creative Performance System y Algorithmic Media Governance; Incrementality & Marketing
Effectiveness queda como capability avanzada condicionada por madurez.

## Wave — cartera de servicios productizados

Wave es una marca de producto de Efeonce. El cliente contrata y se relaciona con Efeonce; Wave nombra la solución
que diseña, construye y opera la capa digital inteligente. El catálogo económico canónico está en
[`Wave Business Model V1`](../business-models/wave/WAVE_BUSINESS_MODEL_V1.md) y el boundary de ownership en
[`ADR Wave Portfolio Boundaries`](../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md).

| Familia | Servicios productizados |
|---|---|
| **Search Visibility 360** | Search Visibility Diagnostic · AEO Readiness Sprint · SEO Foundation Sprint · Search Architecture & Entity Authority · Search Visibility Operating System · Search Recovery & Migration |
| **Web Experience 360** | Web Foundation Sprint · Conversion Website · Agent-Ready Website · Website Rebuild & Migration · Web Performance Operations |
| **Measurement & Analytics** | Measurement Audit · Tagging/Data Layer · GTM/GA4 Implementation · Dashboard & Attribution · Analytics Operations |
| **Agent Systems & Platforms** | Agent Strategy & Architecture · Custom Agent System · Managed Agent Deployment · Agent Integrations · Agent Evaluation & Operations |
| **Digital Automation & Integrations** | API/Workflow Sprint · Data Pipeline · Automation Build · Integration Operations |

La composición de un proyecto puede incorporar capacidades de RevOps & CRM/Kortex, Creative Services/Globe o
Media & Distribution (con Reach cuando aplique) según el resultado contratado y el RACI definido. Wave conserva el ownership de sus
familias de servicio.

La composición propuesta [`Search + Social Visibility`](../business-models/search-visibility-360/SEARCH_SOCIAL_VISIBILITY_COMPOSITION_V1.md) conecta Search Visibility 360 con Social Media sin fusionar ownership, pricing o accountability.

### Delivery models de Wave

Las familias anteriores son product services; el modelo de delivery se cotiza y gobierna por separado. Wave puede
entregar mediante Productized Service, Managed Squad, Staff Augmentation, Implementation, Advisory o
Platform-enabled Service, con engagements On-Going, On-Demand o Sample Sprint. Un proyecto puede combinar Wave con
RevOps & CRM/Kortex, Creative Services/Globe, Media & Distribution (con Reach cuando aplique) o Greenhouse sin mezclar ownership.
