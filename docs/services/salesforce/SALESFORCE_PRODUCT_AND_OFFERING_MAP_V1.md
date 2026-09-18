# Salesforce Product & Offering Map V1

> **Estado:** `Approved for validation`
> **Owner:** Revenue Operations & CRM + Marketing Operations
> **As-of:** 2026-09-18
> **Uso:** routing de discovery, skills, scope y propuestas; no reemplaza contrato ni entitlement live.

La arquitectura comercial de la práctica —incluidos customer model, lifecycle, ofertas, delivery y gates de
madurez— vive en
[`Efeonce Salesforce Service Offer Architecture V1`](EFEONCE_SALESFORCE_SERVICE_OFFER_ARCHITECTURE_V1.md). Este
documento conserva únicamente el mapa de productos, boundaries y routing por problema.

## Posicionamiento provider-fit

Salesforce y HubSpot no son sustitutos universales ni pertenecen al mismo centro de gravedad. Salesforce-first
adquiere sentido con una org instalada compleja, gobierno enterprise, service o procesos multi-equipo a escala,
extensibilidad profunda e integración amplia. HubSpot-first puede ser preferible para crecimiento B2B, equipos
mid-market y time-to-value. La zona de solapamiento incluye mid-market alto, agentes, integraciones y coexistencia.
Esta es una inferencia de Efeonce para discovery; no reemplaza la evidencia del cliente ni la cotización de ningún
proveedor. Las salidas válidas son `Salesforce-first`, `HubSpot-first`, `híbrida` y `no-fit`.

## Mapa de productos

| Producto                           | Base / identidad operativa                  | Capabilities principales                                                                       | Skill dueña                                        |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Agentforce Sales / Sales Cloud     | Salesforce core org                         | cuentas, contactos, leads, oportunidades, actividades, pipeline, forecast y territories        | `salesforce-crm-practice`                          |
| Agentforce Service / Service Cloud | Salesforce core org                         | casos, consola, routing, canales, knowledge, SLA/entitlements y service automation             | `salesforce-crm-practice`                          |
| Salesforce Platform                | metadata del core org                       | objetos, permisos, Flow, Apex, LWC, eventos, APIs y ALM                                        | `salesforce-crm-practice`                          |
| Data 360                           | Salesforce Platform/data services           | ingest/connect, harmonización, identity resolution, segmentación y activación                  | skill del caso consumidor; no es “la base del CRM” |
| Agentforce                         | capa transversal                            | agentes gobernados por permisos, grounding, acciones, pruebas y consumo                        | skill del producto donde actúa                     |
| AIforce                           | capa de interfaz / arquitectura headless    | expone contexto, datos, workflows, lógica, permisos, gobierno y acciones a interfaces y agentes | `salesforce-crm-practice`; skill dueña del producto consumidor |
| Marketing Cloud Engagement         | tenant Engagement, EID/MID y Business Units | Journey Builder, Automation Studio, Email/Content/Contact/Mobile Studio, CloudPages, REST/SOAP | `salesforce-marketing-cloud-engagement`            |
| Marketing Cloud Next               | Salesforce Platform + Data 360              | campañas, Flow, contenido, segmentos, canales y Agentforce; ediciones Growth/Advanced          | `salesforce-marketing-cloud-next`                  |
| Marketing Cloud Account Engagement | producto B2B separado, antes Pardot         | prospects, lists, Engagement Studio y builders propios                                         | fuera de V1; se enruta explícitamente              |
| Marketing Cloud Personalization    | producto/licencia separada                  | decisioning y personalización en tiempo real                                                   | fuera de V1 salvo integración acotada              |
| Marketing Cloud Intelligence       | producto analítico separado                 | ingest, armonización y analytics de marketing                                                  | fuera de V1 salvo integración acotada              |

## Delta Dreamforce 2026 — corte ampliado 2026-09-18

Salesforce está moviendo el punto de acceso de la plataforma: AIforce lleva el contexto gobernado, los workflows y
las acciones a interfaces como Claude, Slack y otras superficies, de modo que el usuario o un agente no siempre debe
entrar a Salesforce para operar. Esto no crea una edición única ni reemplaza Lightning, Marketing Cloud Engagement,
Marketing Cloud Next o los productos de datos; la disponibilidad se determina por superficie, producto, región,
permisos y contrato.

Para Marketing Cloud Next, la actualización de Dreamforce añade una agenda de capacidades agentic y headless:
Campaign Agent (GA anunciada para octubre de 2026), Headless Marketing con MCP, Data Guardian, Budget Optimization,
Palmata/discoverability, Adaptive Web: Quick Setup, Personalized Paths, Account Discovery y Account-Based
Recommendations. RCS Messaging aparece como GA ahora; Mobile Flash Sending y Event Management tienen fechas
posteriores. Cada capacidad debe evaluarse por separado y no entra automáticamente en una oferta o SOW.

Koa es un lanzamiento del 15/09, no del 16/09: modelo de razonamiento CRM de Salesforce/NVIDIA para Agentforce,
en pilotos seleccionados y con GA prevista para invierno de 2026 en regiones de EE. UU. Missionforce/OpenAI y la
expansión de Missionforce son anuncios del 16/09 orientados a gobierno y entornos regulados; no se extrapolan al CRM
estándar. El catálogo público concentra las sesiones de producto en el 15 y 16/09; no se añadió un lanzamiento nuevo
en el media hub oficial el 17 o 18/09 al corte de esta revisión.

Los agentes job-ready Casey, Paige, Carter, Marshall, Piper y Fin fueron presentados como GA, mientras Hunter quedó
en piloto con GA prevista para noviembre; Multi-Agent Orchestration se presentó como GA y AI Skills/Agent Optimizer
quedaron para estados posteriores. Los casos Adecco, Siemens y Live Nation prueban adopción concreta, no entitlement
universal.

## Reglas de coexistencia

1. Engagement y Next son productos y runtimes distintos; sus APIs no son intercambiables.
2. Engagement+ conserva Engagement y agrega acceso a Next; no migra automáticamente journeys, Data Extensions,
   assets, scripts, dominios, IPs, suppressions ni integraciones.
3. Una decisión de transición usa la matriz `retain | bridge | rebuild | retire` por caso y canal.
4. Una trial de Next no se trata como equivalente a una Demo/Dev de Engagement ni prueba acceso a Content Builder
   API del ADR-020.
5. Features beta, pilot, developer preview o release preview no entran como compromiso contractual.

## Routing por problema

| Trigger dominante                                         | Primer diagnóstico                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Pipeline, forecast, territories, productividad comercial  | Salesforce CRM Fit & Architecture Diagnostic                           |
| Casos, contact center, knowledge, routing, SLA            | Service Cloud / Agentforce Service assessment                          |
| Journeys B2C complejos, alto volumen, multi-marca, mobile | MCE Fit & Architecture Assessment                                      |
| Greenfield sobre Salesforce Platform, Data 360 y Flow     | Marketing Cloud Next Fit & Readiness Diagnostic                        |
| Engagement instalado y presión por “migrar a Next”        | Engagement+ / Next Coexistence Assessment                              |
| Identidad/consentimiento no resueltos                     | Data & Consent Foundation antes de plataforma/canales                  |
| Compra motivada sólo por IA o badge                       | Descalificar hasta definir outcome, owner, datos, gobierno y economics |

## Invariantes de propuesta

- Nombrar producto, edición, tenant/org, región y `as-of`.
- Declarar qué es licencia, add-on, consumo, servicio, soporte e IP Efeonce.
- Verificar partnership, Cloud Reseller, certificaciones y referencias antes de claim.
- Cotizar desde quote vigente, nunca desde una tabla pública guardada.
- Definir source of truth, identidad, consentimiento, retención, ambientes, ALM, observabilidad y owner operativo.
- No comprometer migración, throughput, ROI, deliverability o autonomía de agentes sin baseline, pruebas y condiciones.

## Señales de aceptación de la práctica

Una oferta pasa de `Approved for validation` a `Commercially approved` sólo cuando tiene:

1. oferta y scope repetibles;
2. personas/certificaciones verificadas para el rol requerido;
3. org/tenant de prueba y método de delivery;
4. contrato de partner/licensing aplicable;
5. loaded cost, margen, FX, soporte y working capital;
6. caso o forward-test representativo con evidencia;
7. approvals Finance, Legal/Privacy y práctica dueña.
