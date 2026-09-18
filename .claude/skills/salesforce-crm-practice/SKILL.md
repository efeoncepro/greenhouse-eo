---
name: salesforce-crm-practice
description: Diseña, opera y vende soluciones Salesforce CRM para ventas, servicio, plataforma, Data 360 y Agentforce. Úsala para discovery, arquitectura, implementación, migración, gobierno, propuesta o managed services; no para Marketing Cloud.
---

# Salesforce CRM Practice

Ayuda a usar Salesforce CRM con control operativo y a vender servicios según encaje verificable. Selecciona un modo antes de avanzar:

- `operate`: diagnosticar, diseñar, configurar, integrar, migrar, desplegar o mantener.
- `sell`: calificar, posicionar, dimensionar, proponer o expandir servicios.

Si el pedido combina ambos, completa primero el diagnóstico de encaje y separa claramente recomendación, alcance, licencias, consumo y servicios.

## Límites

Incluye Sales Cloud, Agentforce Service —también documentado históricamente como Service Cloud—, Salesforce Platform, Flow, Apex, Lightning, Experience Cloud, APIs e integraciones. Incluye Data 360 y Agentforce sólo cuando son parte de una solución CRM gobernada.

Excluye Marketing Cloud Engagement, Marketing Cloud Next, Account Engagement y la operación de campañas o journeys. Para decidir el límite exacto, lee [references/product-boundaries.md](references/product-boundaries.md).

## Provider-fit boundary

Salesforce is the first candidate for complex installed orgs, enterprise governance, multi-team or multi-country
processes, high-scale service, deep extensibility, and broad integration estates. HubSpot remains a first-class
candidate for growth-oriented B2B, mid-market teams, and faster time-to-value. Treat this as Efeonce positioning,
not a rigid vendor market boundary: discovery must be able to conclude `Salesforce-first`, `HubSpot-first`,
`híbrida` or `no-fit`, with TCO, adoption, data, governance and contract evidence.

## Reglas obligatorias

1. No presentes a Efeonce como Consulting Partner vigente, reseller, especialista certificado ni poseedor de una credencial sin readback primario actual. Lee [references/partner-and-claims.md](references/partner-and-claims.md).
2. No confundas Consulting Partner con Cloud Reseller. La capacidad de prestar servicios o co-vender no prueba autorización para revender licencias.
3. No inventes edición, SKU, disponibilidad, precio, límites, créditos ni derechos de uso. Verifica en fuente oficial y contrato aplicable con fecha `as-of`.
4. No ejecutes mutaciones por una solicitud de análisis, diseño, auditoría, estimación o propuesta. Una mutación requiere autorización explícita y un objetivo identificado.
5. Antes de mutar, confirma org y entorno, identidad, permisos, alcance, impacto, respaldo o recuperación, prueba, reconciliación y responsable de aprobación. Producción exige evidencia proporcional y una ruta de reversión.
6. No cargues datos masivamente sin muestra o dry run, claves de correspondencia, tratamiento de duplicados, control de automatizaciones, resultados por registro y reconciliación.
7. Protege secretos, tokens, cookies, PII y datos de clientes. Aplica mínimo privilegio y nunca copies credenciales a entregables.
8. Trata la adopción, calidad de datos, ownership y gobierno como parte de la solución; código o configuración no equivalen a resultado operativo.

## Modo `operate`

Lee [references/operate.md](references/operate.md). Produce evidencia del estado observado, arquitectura objetivo, riesgos, plan por olas, controles de seguridad/datos, verificación y estado honesto. Usa [templates/solution-blueprint.md](templates/solution-blueprint.md) y, si habrá cambios, [templates/mutation-plan.md](templates/mutation-plan.md).

## Modo `sell`

Lee [references/sell.md](references/sell.md) y usa [templates/discovery-guide.md](templates/discovery-guide.md), [templates/fit-assessment.md](templates/fit-assessment.md) o [templates/proposal.md](templates/proposal.md) según el entregable. Recomienda Salesforce sólo cuando el problema, complejidad y capacidad de adopción lo justifican; permite una conclusión `no-fit`, HubSpot-first o híbrida.

## Actualización Dreamforce 2026

Para lanzamientos de septiembre de 2026, estados de disponibilidad, integraciones y límites de claim, lee el ledger
con corte 2026-09-18 y
[references/dreamforce-2026.md](references/dreamforce-2026.md). AIforce, Claudeforce, Slackforce, Koa,
Missionforce y las alianzas AWS/Google/NVIDIA/OpenAI son superficies con estados y fechas distintos; no las trates
como una sola licencia ni como GA universal. Koa corresponde al 15/09; AIforce y Missionforce tienen publicaciones
del 16/09, con una diferencia de fecha visible entre páginas regionales y la newsroom USA.

## Fuentes

Antes de afirmar capacidades o condiciones comerciales perecibles, consulta [SOURCES.md](SOURCES.md). Usa [GLOSSARY.md](GLOSSARY.md) para nomenclatura y [ANTIPATTERNS.md](ANTIPATTERNS.md) durante revisión.
