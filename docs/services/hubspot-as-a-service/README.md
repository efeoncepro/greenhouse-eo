# HubSpot as a Service — catálogo

> **Service owner:** Efeonce Group SpA
> **Practice:** HubSpot as a Service
> **Método:** configuración versionada, evidencia runtime, aprobación humana y operación gestionada
> **Caso de referencia:** ANAM, portal HubSpot `19893546`

## Arquitectura comercial vigente

La relación comercial se ordena así: **Efeonce** (marca paraguas) → **RevOps & CRM** (línea de negocio) → **Kortex**
(product brand, cuando aplica) → **HubSpot** (plataforma/provider). Greenhouse puede actuar como control plane de
observabilidad cuando forma parte del engagement. HubSpot no reemplaza a Efeonce y Kortex no equivale a toda la
práctica.

HubSpot as a Service es el carril **HubSpot-first** de la práctica, no la taxonomía completa de RevOps & CRM. Debe
entrar después de un diagnóstico provider-fit. Si el cliente requiere continuidad de una base Salesforce,
complejidad enterprise o marketing B2C multicanal, la recomendación puede ser Salesforce-first; una arquitectura
híbrida HubSpot Marketing Hub + Salesforce CRM exige source of truth, lifecycle, consentimiento, attribution,
deduplicación y sync explícitos. Canon de posicionamiento:
[`CRM_PLATFORM_POSITIONING_GARTNER_CHILE_2026-08-27.md`](../../audits/commercial/CRM_PLATFORM_POSITIONING_GARTNER_CHILE_2026-08-27.md).

La arquitectura vigente se define en
[`HUBSPOT_OFFER_ARCHITECTURE_V2.md`](HUBSPOT_OFFER_ARCHITECTURE_V2.md). Separa tres ejes que no deben colapsarse:

1. **Familia de solución:** Marketing, Content & AEO; Sales & AI Pipeline; Revenue Lifecycle; Service, Customer
   Success & Delivery; Data, Integration & CRM Intelligence; Agent Hub & Agentic Operations.
2. **Modo de entrega:** evaluación inicial sin costo; blueprint/auditoría pagada opcional; implementación o
   migración; sprint de optimización; Managed HubSpot Operations; Managed Agentic Operations.
3. **Overlay sectorial:** workflow, modelo de datos, integraciones, compliance, evidencia y anti-fit propios de una
   industria.

La evaluación inicial sin costo es la puerta normal para determinar fit y preparar la cotización. Solo se cobra un
blueprint o audit cuando produce un artefacto técnico autónomo que conserva valor si Efeonce no ejecuta el proyecto.

Smart CRM es la base compartida; los seis Hubs, Agent Hub, workspaces, agentes, objetos y extensibilidad son
superficies que se componen. **Un Hub, un workspace, un agente o un objeto CRM no equivale automáticamente a un
servicio comercial.**

La secuencia se adopta del brochure principal revisado, pero el material comercial es sólo insumo histórico. La
auditoría [`HUBSPOT_BROCHURE_REVIEW_2026-07-26.md`](../../audits/commercial/HUBSPOT_BROCHURE_REVIEW_2026-07-26.md) registra
qué se absorbió y qué claims, precios, nombres o capacidades no deben reutilizarse sin verificación.

## Familias canónicas

| Familia | Clave estable | Resultado principal |
| --- | --- | --- |
| Marketing, Content & AEO | `hubspot.solution.marketing-content-aeo` | Demanda y visibilidad conectadas a conversión y revenue. |
| Sales & AI Pipeline | `hubspot.solution.sales-ai-pipeline` | Pipeline visible, priorizado y ejecutable. |
| Revenue Lifecycle | `hubspot.solution.revenue-lifecycle` | Quote-to-revenue, contratos, renovación y expansión gobernados. |
| Service, Customer Success & Delivery | `hubspot.solution.service-success-delivery` | Atención, adopción, salud, entrega y retención operables. |
| Data, Integration & CRM Intelligence | `hubspot.solution.data-integration-intelligence` | Contexto confiable, integrado y medible para equipos y agentes. |
| Agent Hub & Agentic Operations | `hubspot.solution.agentic-operations` | Agentes y workflows agentic gobernados, evaluados y optimizados. |

Los contratos existentes siguen siendo evidencia y subtipos reutilizables:

- [Customer Agent gestionado](hubspot-customer-agent-managed-service.md) pertenece a Service/Customer Success y a
  Agentic Operations; ya no define la categoría completa de agentes.
- [Arquitectura RevOps, automatización y paneles](hubspot-revops-architecture-automation-and-dashboards.md)
  pertenece a Data/Integration/CRM Intelligence y puede componer Sales, Service o Revenue.

Projects y Services son objetos CRM; Contracts forma parte de Revenue Hub. Su aparición en una solución depende del
workflow y del source of truth del cliente, no de una obligación de usar cada novedad de la plataforma.

## Especialización sectorial

La primera ola prioriza **servicios profesionales/B2B, SaaS/tecnología y manufactura/distribución**. Las fichas
sectoriales viven en [`sectors/`](sectors/) y deben pasar sus gates de evidencia antes de transformarse en claims o
landings. Educación, salud, finanzas, real estate/construcción, retail/ecommerce y nonprofit permanecen en
incubación hasta contar con patrón, owner y prueba suficientes.

## Artefacto reusable

- [Glosario operativo de HubSpot — PDF](glosario-operativo-hubspot.pdf)
- [Fuente Markdown del glosario](glosario-operativo-hubspot.md)
- [Primitivas de badges HubSpot Solutions Partner](../../../public/branding/partners/hubspot/solution-partner/README.md)
- [Logo ANAM para fondos claros — exportación Figma](../../../src/lib/artifact-composer/catalogs/deck-axis/assets/clients/anam-figma-light.svg)

El PDF se regenera desde el Markdown con `pnpm hubspot:glossary:render`. El
renderer admite `--variant dark`, `--variant light` y `--variant orange`; el
artefacto versionado usa `orange` por su contraste con la portada clara.

## Contrato común de prestación

- El cliente conserva la propiedad del portal, registros, paneles y decisiones de negocio.
- Efeonce es responsable por método, diseño, change sets, ejecución aprobada, verificación, documentación y
  continuidad acordada.
- La plataforma HubSpot conserva sus límites, licencias, créditos, disponibilidad y cambios de producto.
- Todo write productivo sigue `propose -> confirmación humana -> execute -> readback` y debe ser reversible o
  declarar explícitamente su recuperación.
- Una configuración guardada no prueba funcionamiento. La aceptación exige evidencia runtime positiva y
  negativa cuando corresponda.
- Pilotos, datos sintéticos, diagnósticos parciales y dependencias administrativas deben permanecer visibles.

## Fuentes transversales

- [Arquitectura de oferta V2](HUBSPOT_OFFER_ARCHITECTURE_V2.md)
- [Benchmark de mercado 2026-08-30](../../audits/commercial/HUBSPOT_SERVICES_MARKET_BENCHMARK_2026-08-30.md)
- [Canon técnico HubSpot as a Service](../../architecture/kortex/hubspot-as-a-service/README.md)
- [Documentación funcional ANAM](../../documentation/hubspot-as-a-service/anam-hubspot-managed-service-end-to-end.md)
- [Manual operativo ANAM](../../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md)
- [Skill operativa](../../../.codex/skills/hubspot-as-a-service/SKILL.md)
