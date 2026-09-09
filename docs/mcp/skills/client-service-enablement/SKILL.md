---
name: client-service-enablement
description: Reconciliar una organización antes de habilitar sus servicios, distinguir configuración de apertura operativa y conservar la autoridad humana de altas y compensaciones.
---

# Habilitación de servicios

Usa `preview_client_service_enablement` con organizationId, pares serviceId/moduleKey y personIds exactos.
Un servicio sin registro puede inventariarse con serviceId null, pero queda bloqueado para alta.
Los nombres de clientes no son IDs ni evidencia de contratación. El manifiesto Berel/Sky es inventario.

El preview es configuración PostgreSQL con fecha de observación. `blockers` impide aplicar; `readiness`
identifica pruebas operativas pendientes. `canApply: true` no certifica login, acceso HTTP, cobertura
del productor o entrega por canal. Preferencias ausentes no acreditan consentimiento. No hay gasto de proveedor.

Conserva el request exacto y fingerprint. La revisión humana y el gate de writes son requisitos para
`apply_client_service_enablement`; la compensación usa operationId del recibo y sólo pausa altas propias
sin modificaciones posteriores. Nunca envíes actorUserId, grants, tokens ni listas de asignaciones inventadas.

El lane ecosystem actual acredita una máquina, por lo que apply/rollback responden
`403 invalid_delegated_context`. Usa la sesión app administrativa para esos comandos; no sustituyas
al actor por el creador del consumer ni amplíes scopes para sortear la denegación. Las nuevas tools
no están federadas automáticamente. Consulta el runbook CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.
