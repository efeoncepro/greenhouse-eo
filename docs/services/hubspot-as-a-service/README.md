# HubSpot as a Service — catálogo

> **Service owner:** Efeonce Group SpA
> **Practice:** HubSpot as a Service
> **Método:** configuración versionada, evidencia runtime, aprobación humana y operación gestionada
> **Caso de referencia:** ANAM, portal HubSpot `19893546`

## Servicios canónicos

| Servicio | Clave estable | Resultado principal | Evidencia ANAM |
|---|---|---|---|
| [Customer Agent gestionado](hubspot-customer-agent-managed-service.md) | `hubspot.customer-agent-managed` | Atención conversacional documentada, gobernada y transferible a humanos. | Configuración, 23 fuentes, catálogo técnico, QA, handoff y canal. |
| [Arquitectura RevOps, automatización y paneles](hubspot-revops-architecture-automation-and-dashboards.md) | `hubspot.revops-managed` | CRM observable y operable con modelo de datos, calidad, automatización y medición gobernada. | Growth, Data Quality, Service piloto, workflow y paneles Retención/Fidelización. |

Ambos son servicios, no tareas aisladas. Pueden contratarse como workstreams separados o como un programa
HubSpot as a Service coordinado. Customer Agent depende de conocimiento, gobierno y handoff; RevOps depende de
identidad, modelo de datos y disciplina de captura. Cuando se combinan, comparten discovery, control de cambios,
QA, reporting y cadencia de Managed Ops sin mezclar sus criterios de aceptación.

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
