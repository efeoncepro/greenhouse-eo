# Salesforce Product & Offering Map V1

> **Estado:** `Approved for validation`
> **Owner:** Revenue Operations & CRM + Marketing Operations
> **As-of:** 2026-08-27
> **Uso:** routing de discovery, skills, scope y propuestas; no reemplaza contrato ni entitlement live.

La arquitectura comercial de la práctica —incluidos customer model, lifecycle, ofertas, delivery y gates de
madurez— vive en
[`Efeonce Salesforce Service Offer Architecture V1`](EFEONCE_SALESFORCE_SERVICE_OFFER_ARCHITECTURE_V1.md). Este
documento conserva únicamente el mapa de productos, boundaries y routing por problema.

## Mapa de productos

| Producto                           | Base / identidad operativa                  | Capabilities principales                                                                       | Skill dueña                                        |
| ---------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Agentforce Sales / Sales Cloud     | Salesforce core org                         | cuentas, contactos, leads, oportunidades, actividades, pipeline, forecast y territories        | `salesforce-crm-practice`                          |
| Agentforce Service / Service Cloud | Salesforce core org                         | casos, consola, routing, canales, knowledge, SLA/entitlements y service automation             | `salesforce-crm-practice`                          |
| Salesforce Platform                | metadata del core org                       | objetos, permisos, Flow, Apex, LWC, eventos, APIs y ALM                                        | `salesforce-crm-practice`                          |
| Data 360                           | Salesforce Platform/data services           | ingest/connect, harmonización, identity resolution, segmentación y activación                  | skill del caso consumidor; no es “la base del CRM” |
| Agentforce                         | capa transversal                            | agentes gobernados por permisos, grounding, acciones, pruebas y consumo                        | skill del producto donde actúa                     |
| Marketing Cloud Engagement         | tenant Engagement, EID/MID y Business Units | Journey Builder, Automation Studio, Email/Content/Contact/Mobile Studio, CloudPages, REST/SOAP | `salesforce-marketing-cloud-engagement`            |
| Marketing Cloud Next               | Salesforce Platform + Data 360              | campañas, Flow, contenido, segmentos, canales y Agentforce; ediciones Growth/Advanced          | `salesforce-marketing-cloud-next`                  |
| Marketing Cloud Account Engagement | producto B2B separado, antes Pardot         | prospects, lists, Engagement Studio y builders propios                                         | fuera de V1; se enruta explícitamente              |
| Marketing Cloud Personalization    | producto/licencia separada                  | decisioning y personalización en tiempo real                                                   | fuera de V1 salvo integración acotada              |
| Marketing Cloud Intelligence       | producto analítico separado                 | ingest, armonización y analytics de marketing                                                  | fuera de V1 salvo integración acotada              |

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
