# Revisar una habilitación de servicios

1. Identifica la organización, el servicio, el módulo y las personas exactas. Evita elegir una cuenta
   sólo por su nombre; puede haber entidades distintas con nombres parecidos.
2. Solicita el preview por la API/CLI del [runbook](../../operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md).
   Nexa puede preparar la propuesta cuando sus acciones estén habilitadas.
3. Revisa las altas y asignaciones conservadas, así como las vistas revocadas a cada persona.
4. Resuelve los bloqueos de contrato, catálogo o pertenencia con su dueño. El mapping servicio → módulos se
   declara con `POST /api/platform/app/commercial/services/{serviceId}/terms` (o la CLI
   `scripts/commercial/declare-commercial-terms.ts`) indicando `bundledModules`; las personas se provisionan por el
   checklist de onboarding (`portal-users/invite`, con `delivery: 'deferred'` si aún no corresponde enviar correo).
   No agregues contratos o permisos ficticios para que el preview pase.
5. Comprueba login, fuente, ruta y canal antes de abrir el servicio. `canApply` sólo valida configuración.
6. Con aprobación de activación y permisos comprobados, aplica exactamente el preview revisado. Guarda
   el recibo; al reintentar conserva su clave de idempotencia y el mismo payload.
7. Si corresponde compensar, usa el recibo. Un conflicto por cambios posteriores necesita revisión del
   estado actual, no reintentos forzados.

El MCP de una máquina puede inventariar cuando tiene binding interno, pero nunca aprueba altas o compensaciones
por sí solo. La aprobación llega por la sesión administrativa app de la persona o por un bearer delegado que esa
persona autorizó (capability `client_services.enablement.write`; el gateway lo obtiene por token exchange con el
cliente `efeonce-mcp-client-services`). Desde el 2026-09-10 el canal está federado y vivo: el gateway `efeonce-mcp` 1.4.0
expone `preview_client_service_enablement`, `apply_client_service_enablement` y `rollback_client_service_enablement`
(provider `greenhouse-client-services`, listado `enabled` en `efeonce.gateway.status`) y el scope Entra
`efeonce.mcp.client_services.write` está consentido. El primer canary de escritura exige un bearer Entra de una persona con
ese scope (`pnpm client-services:canary`, PKCE interactivo; no corre desatendido) y aún no se ha ejecutado.

Para esta cohorte, consulta primero el
[dossier de discovery](../../audits/client-portal/TASK-1852_CLAUDE_DISCOVERY_2026-09-09.md). Berel tiene tres
personas provisionadas con invitación diferida: hasta entregarla y que activen su acceso, el preview las bloquea
como `person_invitation_pending`. Sky tiene tres personas cliente activas, con password reset pendiente y sin
login observado, y un preview limpio listo para que una persona administradora lo aplique. No uses el usuario técnico Berel ni el equipo interno Sky
como destinatarios. Los nombres, emails e IDs exactos viven sólo en el handoff privado local señalado allí.

El flag `CLIENT_SERVICE_ENABLEMENT_WRITES_ENABLED` está ON en producción desde el 2026-09-10, pero ninguna alta se ha
aplicado: la de Sky espera una sesión humana administrativa con el preview exacto; Berel sigue bloqueado por sus
invitaciones diferidas. Aplica sólo con preview limpio, aprobación humana, compensación disponible y evidencia de
login/ruta/canal; apagar el flag bloquea altas y compensaciones. El módulo contratado por Sky es Creative Hub y su ruta
`/creative-hub` la construye TASK-1857.
