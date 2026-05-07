# Usar Sample Sprints

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-07
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
