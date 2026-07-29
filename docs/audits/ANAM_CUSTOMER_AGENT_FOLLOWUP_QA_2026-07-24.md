# ANAM Customer Agent — Follow-up QA

> **Fecha:** 2026-07-24
> **Portal:** ANAM `19893546`
> **Plano:** configuración publicada y previsualización de HubSpot
> **Estado:** `PASS WITH LIVE-PREVIEW LIMITATION` — publicación confirmada; simulador live sin respuesta en la prueba posterior

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
- Las cinco categorías de directrices y las pautas de transferencia pasaron la comprobación previa sin problemas
  y fueron publicadas el 2026-07-24.
- En la regresión posterior, el simulador `En directo` recibió el prompt de Seguimiento, pero no produjo respuesta
  dentro de 45 segundos. Esto deja esa prueba inconclusa y no revierte la publicación confirmada.
- La respuesta corta corregida de factura/OC está sincronizada y activa.

## Gate de publicación

1. Texto exacto, assignee interno y copy neutral: confirmados.
2. Publicación de directrices y handoff: completada.
3. Readback sin `Cambios no publicados`: completado.
4. Regresión live: pendiente de repetir en una conversación real o cuando el simulador vuelva a responder.

Estado correcto: `publicado; verificación live complementaria pendiente`.
