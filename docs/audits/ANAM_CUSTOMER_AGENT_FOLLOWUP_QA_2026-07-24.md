# ANAM Customer Agent — Follow-up QA

> **Fecha:** 2026-07-24
> **Portal:** ANAM `19893546`
> **Plano:** configuración en borrador y previsualización de HubSpot
> **Estado:** `CONDITIONAL PASS` — QA aprobada; publicación pendiente

## Alcance

Se verificaron los ajustes solicitados después de la reunión:

- seguimiento enfocado en resultados, programación y facturación;
- Calidad con captura de nombre, empresa, correo y detalle;
- mensajes de transferencia sin nombrar a una ejecutiva específica.

## Evidencia

| Escenario | Prompt resumido | Resultado observado | Veredicto |
|---|---|---|---|
| Seguimiento de resultado | Pregunta por resultado de muestra y disponibilidad | Solicitó referencia de cotización/OT/muestra; no abrió un flujo de residuos ni prometió fecha | PASS |
| Calidad | Resultado de informe no coincide; cotización `12345` | Conservó la referencia y pidió nombre, empresa, correo y resultado específico | PASS |
| Handoff disponible | Mensaje configurado | `una persona del equipo` continúa; no expone assignee | PASS |
| Handoff no disponible | Mensaje configurado | Indica continuidad posterior por `una persona del equipo`; chat abierto | PASS |
| Respuesta corta activa | Revisión factura/OC | Actualizada, leída y sincronizada a las 04:07 GMT-4 con `una persona del equipo` | PASS |

## Separación copy–routing

La ruta interna todavía asigna el Ticket a Maria Paz Haeger dentro de `Asistencia al cliente`. Esto no se
considera una falla del copy: el visitante no ve ese nombre en los dos mensajes configurados. La asignación se
debe cambiar sólo cuando ANAM confirme propietarios y fallback.

## Riesgos

- HubSpot puede activar su transferencia nativa antes de completar preguntas en determinadas formulaciones.
- La prueba se hizo en previsualización, no con una identidad real de cliente.
- Los cambios siguen en borrador. No representan el comportamiento live hasta `Publicar instrucciones`.
- Excepción: la respuesta corta corregida de factura/OC ya está sincronizada y activa.

## Gate de publicación

1. aprobación del texto exacto;
2. confirmación de que el assignee interno actual sigue siendo válido;
3. publicación única;
4. regresión live de los tres escenarios;
5. registro de timestamp, versión y rollback.

Hasta completar ese gate, el estado correcto es `configuración preparada, rollout pendiente`.
