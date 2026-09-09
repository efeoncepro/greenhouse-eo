# Revisar una habilitación de servicios

1. Identifica la organización, el servicio, el módulo y las personas exactas. Evita elegir una cuenta
   sólo por su nombre; puede haber entidades distintas con nombres parecidos.
2. Solicita el preview por la API/CLI del [runbook](../../operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md).
   Nexa puede preparar la propuesta cuando sus acciones estén habilitadas.
3. Revisa las altas y asignaciones conservadas, así como las vistas revocadas a cada persona.
4. Resuelve los bloqueos de contrato, catálogo o pertenencia con su dueño. No agregues contratos o permisos
   ficticios para que el preview pase.
5. Comprueba login, fuente, ruta y canal antes de abrir el servicio. `canApply` sólo valida configuración.
6. Con aprobación de activación y permisos comprobados, aplica exactamente el preview revisado. Guarda
   el recibo; al reintentar conserva su clave de idempotencia y el mismo payload.
7. Si corresponde compensar, usa el recibo. Un conflicto por cambios posteriores necesita revisión del
   estado actual, no reintentos forzados.

El MCP de una máquina puede inventariar cuando tiene binding interno. Actualmente no puede aprobar altas
o compensaciones por una persona; usa una sesión administrativa app. Esta entrega no activa la cohorte.
