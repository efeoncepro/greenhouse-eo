# HubSpot as a Service — arquitectura de oferta V2

> **Estado:** vigente
> **Fecha de verificación:** 2026-08-30
> **Owner:** RevOps & CRM / práctica HubSpot
> **Evidencia de mercado:**
> [`HUBSPOT_SERVICES_MARKET_BENCHMARK_2026-08-30.md`](../../audits/commercial/HUBSPOT_SERVICES_MARKET_BENCHMARK_2026-08-30.md)
> **Regla de producto:** toda disponibilidad, tier, seat, crédito, beta y limitación se vuelve a verificar contra
> fuente primaria al cotizar y antes de publicar.

## 1. Decisión

Efeonce organiza su práctica HubSpot por **resultados operativos del cliente**, no por una lista de Hubs ni por un
solo agente. La arquitectura tiene tres ejes ortogonales:

1. **Familia de solución:** qué resultado se transforma.
2. **Modo de entrega:** cómo se diagnostica, implementa y opera.
3. **Especialización sectorial:** qué workflow, modelo de datos, integración y riesgo cambian por industria.

Smart CRM y el contexto de negocio son la base compartida. Marketing, Sales, Service, Content, Data y Revenue son
los seis productos de la plataforma; Agent Hub, los workspaces, los agentes, los objetos CRM y la extensibilidad
cruzan esos productos. Por eso no se publican como una séptima lista equivalente de servicios.

## 2. Familias de solución

| Familia pública | Resultado que compra el cliente | Superficies HubSpot que puede componer |
| --- | --- | --- |
| **Marketing, Content & AEO** | Crear demanda, mejorar visibilidad y convertirla con una operación medible. | Marketing Hub, Content Hub, Marketing Studio, campañas, segmentos, automatización, atribución, AEO y agentes de contenido/campaña/nurture cuando sean elegibles. |
| **Sales & AI Pipeline** | Volver visible y operable el pipeline, priorizar cuentas y mejorar ejecución comercial. | Sales Hub, Sales Workspace, leads, targets, secuencias, conversation intelligence, forecasting, coaching, Prospecting Agent y progresión inteligente de deals. |
| **Revenue Lifecycle** | Gobernar desde producto, cotización y contrato hasta facturación, renovación y expansión. | Revenue Hub, catálogo, CPQ/quotes, Contracts, change/renewal quotes, billing, invoices, payments, orders y reporting de revenue, sujetos a elegibilidad territorial y financiera. |
| **Service, Customer Success & Delivery** | Resolver atención y operar adopción, salud, entrega, renovación y expansión. | Service Hub, Help Desk, tickets, SLA, knowledge base, feedback, Customer Agent, Customer Success Workspace, health scores y los objetos Projects/Services cuando correspondan. |
| **Data, Integration & CRM Intelligence** | Unificar datos confiables y convertirlos en contexto, automatización y decisión. | Smart CRM, Data Hub, Data Studio, sync, datasets, calidad, scoring, reporting, Data Agent, APIs, webhooks, custom workflow actions, UI extensions, MCP e integraciones. |
| **Agent Hub & Agentic Operations** | Diseñar, desplegar y gobernar agentes y workflows agentic con resultados, costo y escalamiento observables. | Agent Hub, agentes preconstruidos, agentes custom, Agent Builder, agentic workflows, knowledge/context, herramientas, permisos, créditos, evaluación, observabilidad y human handoff. |

### Reglas de clasificación

- **Customer Agent no es una familia comercial.** Es un componente de Service/Customer Success y, en algunos
  casos, de captura o calificación conversacional.
- **AEO no es toda la oferta de marketing.** Es una capability dentro de Marketing/Content y una cuña comercial
  hacia una operación de demanda más amplia.
- **Agent Hub no reemplaza los Hubs.** Coordina agentes y workflows que actúan sobre la plataforma y su contexto.
- **Projects y Services son objetos CRM**, no nombres de servicios de Efeonce. Projects estructura trabajo;
  Services representa ofertas entregadas. Se usan cuando el modelo del cliente lo justifica.
- **Contracts pertenece al ciclo de Revenue Hub.** Es la fuente de verdad del revenue comprometido dentro de
  HubSpot; no se vende como una landing aislada.
- **Managed Operations es transversal.** Puede operar una o varias familias y no constituye un séptimo silo.

## 3. Modos de entrega

| Modo | Cuándo se usa | Salida mínima |
| --- | --- | --- |
| **Evaluación inicial sin costo** | Puerta comercial normal para determinar fit y preparar una cotización. | Fit/no-fit, problema priorizado, riesgos visibles y siguiente alcance recomendado. No incluye arquitectura detallada ni backlog explotable por terceros. |
| **Blueprint o auditoría técnica pagada** | Cuando el cliente necesita un artefacto independiente antes de contratar la ejecución. | Inventario verificable, modelo objetivo, decisiones, roadmap, estimación, riesgos y criterios de aceptación. El entregable conserva valor aunque Efeonce no implemente. |
| **Implementación o migración** | Para construir el estado objetivo por fases. | Configuración, datos, integraciones, automatización, QA, enablement, documentación y readback. |
| **Sprint de optimización** | Para resolver un cuello de botella o deuda acotada. | Baseline, change set, prueba, medición y backlog residual. |
| **Managed HubSpot Operations** | Cuando existe backlog recurrente, owner, cadencia y costo de servir sostenible. | Operación continua, releases, calidad, adopción, reporting, QBR y expansión gobernada. |
| **Managed Agentic Operations** | Cuando agentes o workflows agentic requieren evaluación y mejora continua. | Catálogo de agentes, autonomía/handoff, knowledge/context, tests, consumo, observabilidad, incidentes y optimización. |

La evaluación sin costo es el default de adquisición y cotización. No debe disfrazar consultoría extensa gratuita.
La auditoría pagada existe solo cuando su salida es un producto intelectual autónomo.

## 4. Especialización por sector

Las páginas sectoriales son **overlays** sobre las seis familias: cambian el job, los objetos, las integraciones,
los riesgos y la prueba; no crean una taxonomía paralela de Hubs.

### Sectores de lanzamiento

1. **Servicios profesionales y B2B.** Mejor ajuste con evidencia propia y con los objetos Projects/Services.
   Workflow: referral o demanda → oportunidad → quote/contract → proyecto/servicio → salud → renovación/expansión.
   Anti-fit: el cliente exige PSA completo de resource planning, timesheets o reconocimiento de ingresos.
2. **SaaS y tecnología.** Ajuste alto si se integra el uso de producto y el sistema de billing.
   Workflow: demanda → pipeline → contrato/suscripción → onboarding → adopción → health → renewal.
   Anti-fit: HubSpot debe sustituir telemetría de producto de alto volumen, CDP o billing engine.
3. **Manufactura y distribución.** Ajuste condicionado a que ERP siga siendo la fuente operativa.
   Workflow: cuenta/canal → oportunidad → producto/quote → orden/contrato → entrega → servicio/installed base.
   Anti-fit: se pretende reemplazar ERP, MRP, WMS o CPQ industrial complejo solo con HubSpot.

### Sectores de incubación

Educación, salud, servicios financieros, real estate/construcción, retail/ecommerce y nonprofit requieren antes
un patrón repetible, un owner y evidencia sectorial. Salud y finanzas añaden un gate explícito de compliance,
residencia, datos sensibles e integración con el sistema regulado; HubSpot nunca se presenta como EHR, core bancario,
SIS/LMS, ERP o motor contable.

### Contrato mínimo de una página sectorial

Toda página o one-pager sectorial debe declarar:

1. trigger y job del comprador;
2. buying group y operadores diarios;
3. workflow end-to-end;
4. objetos, Hubs, workspaces y agentes que lo soportan;
5. integraciones y source of truth;
6. gobierno, seguridad y limitaciones;
7. evidencia propia o del vendor claramente atribuida;
8. anti-fit y alternativa;
9. CTA hacia evaluación inicial.

Un logo o una mención de industria no prueba especialización. Sin workflow, integración, riesgo y evidencia, el
sector permanece en incubación.

## 5. Arquitectura de la landing pública

El pillar `/servicios/hubspot/` debe resolver en este orden:

```text
problema del comprador
  → familia de solución
    → modo de entrega
      → especialización sectorial cuando aporte contexto
        → evaluación inicial sin costo
```

Navegación recomendada:

- Soluciones: las seis familias.
- Cómo trabajamos: evaluación, blueprint, implementación, optimización y operación gestionada.
- Industrias: los tres sectores de lanzamiento.
- Recursos: precios/TCO, cuándo no usar HubSpot, agentes y comparativas.

La landing no publica una cuadrícula de cada feature disponible. Cada familia explica outcome, alcance típico,
señales de fit, anti-fit, prueba y siguiente paso; la nomenclatura del producto respalda la solución, no la dirige.

## 6. Readiness comercial de Efeonce

| Estado | Qué puede afirmarse |
| --- | --- |
| **Vendible con evidencia actual** | evaluación provider-fit; arquitectura RevOps/CRM; datos, automatización, reporting; implementación; Marketing/Content/AEO dentro de alcance; Customer Agent gestionado cuando se delimita al caso probado. |
| **Vendible con discovery y alcance reforzado** | Sales & AI Pipeline; Customer Success Workspace; Projects/Services; integraciones; Managed HubSpot Operations cuando se prueban backlog, owner, cadencia y economics. |
| **Pilot-first / no prometer end-to-end** | Agent Hub y agentes custom mientras la superficie sea beta; Revenue Hub/Contracts/billing/payments en Chile sin validación de SII, ERP, Finance y Legal; PSA completo; verticales sin caso propio. |

El perfil público de Efeonce en el Solutions Directory confirma Gold y amplitud de servicios, pero tiene cero
reviews al corte. Claims propios como cantidad de implementaciones, certificaciones o industrias no sustituyen
casos estructurados, reviews ni acreditaciones visibles. El plan de prueba debe priorizar esas brechas.

## 7. Fuentes primarias de producto

- [HubSpot Customer Platform](https://www.hubspot.com/products/customer-platform)
- [Agent Hub](https://knowledge.hubspot.com/ai/understand-agent-hub)
- [Revenue Hub](https://www.hubspot.com/products/revenue)
- [Contracts](https://knowledge.hubspot.com/contracts/create-contracts)
- [Customer Success Workspace](https://knowledge.hubspot.com/customer-success/set-up-and-manage-the-customer-success-workspace)
- [Marketing Studio](https://www.hubspot.com/products/marketing/studio)
- [Projects API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/projects/guide)
- [Services API](https://developers.hubspot.com/docs/api-reference/latest/crm/objects/services/guide)
- [Industry Solutions](https://www.hubspot.com/industry-solutions)

