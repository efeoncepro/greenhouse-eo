# Producto, ediciones y fronteras

## Mapa de capacidades

Marketing Cloud Next combina Salesforce Platform, Data 360, Salesforce CMS, Flow, canales y Agentforce. El diseño debe mostrar para cada capability: sistema dueño, edición, add-on, permisos, consumo y evidencia.

### Growth y Advanced

- Trata Growth como base de campañas, contenido, segmentación, journeys/flows y capacidades AI según entitlement vigente.
- Trata Advanced como expansión, no como “todo incluido”. Verifica capacidades adicionales, business units, journeys/decisioning, canales y límites en la documentación de la release.
- Salesforce Enterprise o Unlimited, Data 360 y Foundations pueden ser prerrequisitos según la ruta. Confírmalo en contrato y org.

No copies tablas de features a una propuesta sin fecha. Usa un fit matrix:

| Capability | Necesidad | Growth | Advanced | Add-on/consumo | Evidencia |
|---|---|---|---|---|---|

## Dependencias

- **Data 360:** data streams, DLO/DMO, data model, identity resolution, data graphs, calculated insights, segmentation y activation.
- **Flow:** automatización y orquestación; define entry, decisiones, acciones, fault paths, versión y desactivación.
- **CMS/contenido:** workspace, permisos, marca, personalización y provenance.
- **Canales:** email, SMS, WhatsApp, mobile u otros sólo si SKU, región, sender y consentimiento lo permiten.
- **Agentforce/Einstein:** grounding, acciones, datos usados, modelo, revisión humana, créditos y observabilidad.

## Entitlements

Registra por función: `capacidad técnica → SKU/edición → permission set/license → allocation/crédito → configuración → prueba`. No infieras un eslabón desde otro.

Para cualquier operación productiva, lee también `implementation-and-operations.md`.
