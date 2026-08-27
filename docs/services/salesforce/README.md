# Salesforce Practice — catálogo de servicios

> **Service owner:** Efeonce Group SpA
> **Practice:** Revenue Operations & CRM
> **Estado comercial:** servicios habilitables; partnership y facultad de reventa sujetos a readback
> **Método:** provider-fit, arquitectura verificable, source-driven delivery y operación gestionada

## Propósito

Esta carpeta define cómo Efeonce diagnostica, diseña, implementa y opera soluciones Salesforce sin convertir el
nombre del provider en sustituto de la práctica. La relación comercial es:

`Efeonce → Revenue Operations & CRM → servicio Salesforce → plataforma/producto Salesforce`.

La práctica tiene tres superficies distintas:

1. **Salesforce CRM:** Agentforce Sales/Sales Cloud, Agentforce Service/Service Cloud, Salesforce Platform,
   Agentforce y Data 360 cuando el caso lo justifica.
2. **Marketing Cloud Engagement:** journeys, automatización, contenido y mensajería sobre el runtime histórico de
   Engagement, con tenancy y APIs propios.
3. **Marketing Cloud Next:** marketing nativo sobre Salesforce Platform y Data 360, con Flow, Agentforce y
   ediciones Growth/Advanced.

No se usa “Marketing Cloud” sin identificar producto, edición, tenant y runtime. Engagement no está deprecado y
Next no lo reemplaza automáticamente. Engagement+, Account Engagement+ y una migración selectiva son decisiones de
coexistencia, no pruebas de paridad.

## Dos modos de la práctica

### Operar

`discover → inventory → architecture → propose → approve → configure/build → test/UAT → deploy → reconcile → enable → operate`

La operación exige ambientes identificados, source control, permisos mínimos, evidencia de pruebas, rollback,
readback y ownership posterior. Ningún agente activa flows, journeys, campañas, envíos, permisos, cargas, merges o
deletes productivos sin confirmación humana proporcional al riesgo.

### Vender

`account hypothesis → provider/product fit → discovery → disqualification → solution options → scope → live licensing validation → proposal → delivery handoff → expansion`

Cada propuesta separa licencia, referral/co-sell, eventual reventa, implementación, migración/integración, managed
operations, consumo de datos/IA/mensajes e IP propia. Un precio público no es una cotización contractual.

## Ofertas de entrada y expansión

| Superficie                 | Oferta de entrada                            | Core                                                                               | Expansión recurrente                                                      |
| -------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Salesforce CRM             | Salesforce CRM Fit & Architecture Diagnostic | Sales/Service Foundation, Integration/Migration o Agentforce Use Case              | Managed Salesforce Operations, Adoption, Data 360/Agentforce optimization |
| Marketing Cloud Engagement | MCE Fit & Architecture Assessment            | Foundation, Journey Activation, Connect o Deliverability                           | Managed Marketing Cloud Operations, Engagement+ roadmap                   |
| Marketing Cloud Next       | Next Fit & Readiness Diagnostic              | Data 360 + Consent Foundation, Greenfield Launch o Agentforce Campaign Accelerator | Managed Marketing Cloud Operations, selective coexistence/migration       |

Los diagnósticos venden una decisión informada, no una recomendación predeterminada de Salesforce. Un resultado
válido puede ser HubSpot-first, Salesforce-first, híbrido o mantener el stack actual.

## Gates comerciales y de partnership

- Efeonce tiene evidencia histórica de aceptación como `Provisional Consulting Partner` en 2025 y una declaración
  actual del CEO; el estado vigente del Partner Account, SPPA, tier y beneficios requiere readback primario.
- `Consulting Partner` no equivale a `Cloud Reseller`. Hasta verificar un acuerdo de reventa vigente, Efeonce vende
  servicios y puede acompañar compra/co-selling sólo dentro de la vía autorizada; no promete facturar licencias.
- Ninguna certificación, persona certificada, competencia, badge, caso o referencia se declara sin verificación
  oficial y autorización de uso.
- Demo/Dev de Engagement, trial de Next y org Salesforce core son entornos distintos. Acceso a uno no prueba
  entitlement o API del otro.
- Pricing, ediciones, créditos, mensajes, contactos, consumo, incentivos y disponibilidad regional se verifican
  contra contrato/cotización vigente antes de ofertar.

## Skills dueñas

- `salesforce-crm-practice`
- `salesforce-marketing-cloud-engagement`
- `salesforce-marketing-cloud-next`

Las skills aportan dominio Salesforce. `commercial-expert` conserva el método comercial transversal;
`legal-privacy-ip-operator` gobierna privacidad, consentimiento y contratos; arquitectura/runtime siguen sus skills
y ADRs dueños.

## Canon y evidencia

- [Salesforce Product & Offering Map V1](SALESFORCE_PRODUCT_AND_OFFERING_MAP_V1.md)
- [CRM Platform Positioning — Gartner + señal enterprise Chile](../../audits/commercial/CRM_PLATFORM_POSITIONING_GARTNER_CHILE_2026-08-27.md)
- [Efeonce Partnership Registry](../../operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md)
- [Partner & Provider Layer Operating Model](../../business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md)
- [ADR-020 — Globe → Marketing Cloud Content Builder](../../architecture/creative-studio/EFEONCE_GLOBE_MARKETING_CLOUD_CONTENT_BUILDER_EXPORT_DECISION_V1.md)
- [Salesforce Well-Architected](https://architect.salesforce.com/docs/architect/well-architected/guide/overview)
- [Marketing Cloud Next announcement](https://www.salesforce.com/news/stories/marketing-cloud-next-announcement/)
- [Marketing Cloud Engagement pricing and Engagement+ FAQ](https://www.salesforce.com/marketing/engagement/pricing/)
