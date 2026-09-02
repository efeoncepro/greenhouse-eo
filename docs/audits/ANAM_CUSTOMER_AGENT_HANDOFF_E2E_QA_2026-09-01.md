# ANAM Customer Agent — QA E2E de handoff

> **Fecha:** 2026-09-01
> **Portal:** `19893546`
> **Agente:** `Emma`
> **Workflow:** `1876744588`
> **Estado final:** activo, conectado a Emma y sin problemas reportados por HubSpot

## Contrato probado

| Intención | Principal | Reemplazo por disponibilidad |
|---|---|---|
| Cotización o nuevo negocio | Pablo Puga | Maria Paz Haeger |
| Seguimiento de servicios | Marco Jiménez Venegas | Pablo Puga |
| Calidad, facturación y otros | Maria Paz Haeger | Marco Jiménez Venegas |

El workflow resume y clasifica el ticket, borra a Emma como propietaria y ejecuta dos asignaciones secuenciales.
Ambas respetan disponibilidad; la segunda conserva `Sobrescribir` desactivado, por lo que sólo completa el owner
cuando la primaria no pudo hacerlo.

## Hallazgo y corrección

La primera conversación pública (`48103382175`) no pasó: el ticket ya tenía a Emma como propietaria, por lo que
las acciones sin sobrescritura se omitieron, y el marcador `PRUEBA QA INTERNA` sesgó la clasificación hacia
Calidad. Se restauró temporalmente el handoff directo a María Paz, se insertó el borrado del propietario antes de
la ramificación y se reforzó el prompt para ignorar marcadores administrativos/de prueba. El workflow se reactivó
y se volvió a conectar sólo después de guardar esas correcciones.

## Evidencia E2E pública

| Ticket | Mensaje sustantivo | Ramificación | Resultado observado |
|---|---|---|---|
| `48103069613` | Cotización para análisis de agua potable | `COTIZACION_NUEVO_NEGOCIO` | Asignado a Pablo Puga; fallback a María Paz omitido porque ya existía propietario. El widget mostró `Pablo`. |
| `48105602378` | Estado y programación de servicio en curso | `SEGUIMIENTO_SERVICIO` | Marco no estaba disponible; la primaria asignó a ninguno y el reemplazo asignó a Pablo Puga. El widget mostró `Pablo`. |
| `48094218332` | Queja por dato incorrecto en informe | `CALIDAD_FACTURACION_OTROS` | Asignado a Maria Paz Haeger; fallback a Marco omitido porque ya existía propietaria. El widget mostró `Maria Paz`. |

Cada prueba comenzó en `https://anam-2.hubspotpagebuilder.com/agente-anam`, pidió explícitamente una persona y
esperó el mensaje de transferencia de Emma. Los tres historiales mostraron clasificación, borrado del propietario,
asignación y `Workflow terminado`. Los chats de prueba se terminaron después de la lectura; los tickets se
conservaron como evidencia.

## Límite de la evidencia

Este ejercicio prueba el trigger explícito, la clasificación, el owner efectivo, el reemplazo por disponibilidad
y el nombre mostrado en el widget. No prueba que Pablo, Marco o María Paz hayan respondido como humanos ni que el
primer owner haya reasignado el mismo chat abierto a una segunda persona.

HubSpot documenta que un live handoff mantiene el chat abierto y que el owner humano puede reasignar el ticket en
Help Desk para que otra persona continúe en el mismo hilo. Esa continuidad y la respuesta del segundo humano
quedan como `vendor-documented`, no `runtime-verified` para ANAM. Los chats usados aquí se terminaron y no pueden
reabrirse; los tickets se conservaron para auditoría.

La matriz probada clasifica por intención, no por nombres libres. Una solicitud como “quiero hablar con Pablo”
debe disparar atención humana, pero no demuestra que el workflow asigne a Pablo. La asignación nominal requiere
una condición estructurada o una reasignación manual comprobada.

## Readback final

- Emma usa `Reasignar tickets para la transferencia de agentes de clientes` para las conversaciones del centro
  de ayuda.
- Workflow `1876744588`: `Workflow activado` y `Workflow sin problemas`.
- El copy público sigue siendo neutral respecto del assignee.
- La clasificación usa acciones de IA y consume créditos de HubSpot; corresponde monitorear costo y excepciones.
