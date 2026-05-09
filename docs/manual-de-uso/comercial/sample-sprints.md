# Usar Sample Sprints

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-05-07
> **Ultima actualizacion:** 2026-05-09 por Claude (TASK-835 — troubleshooting de degraded states + convencion canonica de progreso)
> **Modulo:** Comercial / Agencia
> **Ruta en portal:** `/agency/sample-sprints`
> **Documentacion relacionada:** `docs/documentation/comercial/sample-sprints.md`

## Antes de empezar

Necesitas acceso a la vista `gestion.sample_sprints` y al menos `commercial.engagement.read`. Para crear, aprobar, registrar avance o cerrar outcomes se usan permisos separados.

## Declarar un Sample Sprint

1. Abre `/agency/sample-sprints`.
2. Entra a **Declare**.
3. Selecciona Space, tipo de sprint, fechas, costo interno esperado y criterios de exito.
4. Opcionalmente agrega un miembro propuesto y su FTE.
5. Guarda. El sprint queda `pending_approval`.

## Aprobar

1. Abre el sprint y entra a **Approve**.
2. Revisa el contexto del sprint y el equipo propuesto.
3. Confirma la aprobacion. Si hay sobrecapacidad, Greenhouse exigira motivo de override desde la regla backend.

## Registrar progreso

1. Abre **Record progress**.
2. Ingresa fecha de snapshot, metricas JSON y notas.
3. Guarda. Solo puede existir un snapshot por `service_id + snapshot_date`.

## Cerrar outcome

1. Abre **Record outcome**.
2. Selecciona outcome: adjusted, dropped, converted o cancelacion.
3. Escribe rationale; si es cancelacion, agrega motivo.
4. Adjunta el reporte si aplica.
5. Si es conversion, selecciona el servicio regular destino o la cotizacion destino cuando exista.

## Que no hacer

- No declarar un Sample Sprint en HubSpot como si fuera un service firmado.
- No crear services manuales `regular` para simular pilotos.
- No editar outcomes ni audit log directamente: son append-only por contrato.

## Problemas comunes

| Sintoma | Accion |
| --- | --- |
| No veo el menu | Revisar `gestion.sample_sprints` y `commercial.engagement.read`. |
| Duplicate snapshot | Cambia la fecha o abre el snapshot existente. |
| Conversion rechazada | `converted` requiere `nextServiceId` o `nextQuotationId`. |
| Upload rechazado | Usa PDF/JPG/PNG/WebP y respeta el maximo de 25 MB. |
| Update rechazado por `services_engagement_requires_decision_before_120d` | Registra outcome en `/agency/sample-sprints/[serviceId]/outcome` y reintenta. |
| Costo del sprint aparece como `—` en lugar de un valor | El reader de cost attribution no encontro datos del periodo o esta degradado. Revisar el banner amarillo en la portada y la senal `commercial.sample_sprint.projection_degraded` en `/admin/operations`. |
| Progreso aparece como "Sin progreso" para un sprint activo | Registra un snapshot semanal en `/agency/sample-sprints/[serviceId]/progress` con `Avance estimado` (la convencion canonica es `metrics_json.deliveryProgressPct`, el wizard ya lo escribe). |
| El equipo del sprint muestra `mem-...` en vez del nombre | Algun miembro propuesto fue archivado o el ID no resuelve en el directorio activo. Edita el sprint o archiva el sprint si ya no aplica. El banner de degraded confirma "Equipo parcialmente resuelto". |
| Banner amarillo "Datos parciales en este momento" | Una o mas fuentes downstream (cost attribution, salud comercial, capacidad) estan caidas. La operacion sigue funcionando. Revisa cada razon listada y `/admin/operations` para diagnostico. |
| Acabo de aprobar un sprint pero la portada todavia muestra `pending` | Refresca la pagina; el cache server-side de 30 segundos se invalida en cuanto entra el evento outbox de aprobacion. Si persiste mas de 1 minuto, revisar la senal `sync.outbox.unpublished_lag`. |
