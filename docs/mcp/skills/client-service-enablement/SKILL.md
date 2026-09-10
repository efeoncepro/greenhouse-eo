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

El lane ecosystem acredita una máquina, por lo que apply/rollback responden `403 invalid_delegated_context`
por contrato. La autoridad humana delegada viaja por el lane App con un bearer emitido PARA la persona
(capability `client_services.enablement.write`, token exchange con el cliente `efeonce-mcp-client-services`);
el recibo registra `authority.kind`. No sustituyas al actor por el creador del consumer ni amplíes scopes para
sortear la denegación. Las tools no están federadas automáticamente: su presencia en el manifiesto interno
Greenhouse no prueba exposición en el gateway ni que exista el scope Entra. Consulta el runbook
CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1 y el dossier TASK-1852_CLAUDE_DISCOVERY_2026-09-09.md.
