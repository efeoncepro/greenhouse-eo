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

El recorrido de oferta es:

1. **RevOps Diagnostic / Discovery & Assessment** — entender outcomes, procesos, stack, datos, riesgos y quick wins.
2. **CRM & HubSpot Architecture** — diseñar modelo de datos, lifecycle, pipelines, integraciones, gobierno y medición.
3. **HubSpot Implementation** — implementar por fases y workstreams aprobados, con migración, automatización,
   integraciones, documentación y enablement.
4. **Data, Automation & Lifecycle** — mejorar calidad, captura, routing, workflows, scoring, reporting y adopción.
5. **Managed CRM Operations** — operar, medir, mantener y optimizar el sistema con cadencia y backlog gobernado.
6. **Customer Agent / AI Operations** — servicio especializado para conocimiento, agentes, handoff, QA y gobierno.

Estas son etapas y composiciones comerciales, no seis promesas obligatorias ni un bundle cerrado. Los dos servicios
canónicos de abajo son los contratos documentados hoy; los demás funcionan como ofertas, workstreams o escalones de
entrada dentro de ellos.

La secuencia se adopta del brochure principal revisado, pero el material comercial es sólo insumo histórico. La
auditoría [`HUBSPOT_BROCHURE_REVIEW_2026-07-26.md`](../../audits/commercial/HUBSPOT_BROCHURE_REVIEW_2026-07-26.md) registra
qué se absorbió y qué claims, precios, nombres o capacidades no deben reutilizarse sin verificación.

## Servicios canónicos

| Servicio                                                                                                  | Clave estable                    | Resultado principal                                                                          | Evidencia ANAM                                                                   |
| --------------------------------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Customer Agent gestionado](hubspot-customer-agent-managed-service.md)                                    | `hubspot.customer-agent-managed` | Atención conversacional documentada, gobernada y transferible a humanos.                     | Configuración, 23 fuentes, catálogo técnico, QA, handoff y canal.                |
| [Arquitectura RevOps, automatización y paneles](hubspot-revops-architecture-automation-and-dashboards.md) | `hubspot.revops-managed`         | CRM observable y operable con modelo de datos, calidad, automatización y medición gobernada. | Growth, Data Quality, Service piloto, workflow y paneles Retención/Fidelización. |

Ambos son servicios, no tareas aisladas. Pueden contratarse como workstreams separados o como un programa
HubSpot as a Service coordinado. Customer Agent depende de conocimiento, gobierno y handoff; RevOps depende de
identidad, modelo de datos y disciplina de captura. Cuando se combinan, comparten discovery, control de cambios,
QA, reporting y cadencia de Managed Ops sin mezclar sus criterios de aceptación.

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

- [Canon técnico HubSpot as a Service](../../architecture/kortex/hubspot-as-a-service/README.md)
- [Documentación funcional ANAM](../../documentation/hubspot-as-a-service/anam-hubspot-managed-service-end-to-end.md)
- [Manual operativo ANAM](../../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md)
- [Skill operativa](../../../.codex/skills/hubspot-as-a-service/SKILL.md)
