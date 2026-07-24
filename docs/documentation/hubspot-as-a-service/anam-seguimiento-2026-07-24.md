# ANAM HubSpot — Seguimiento de acuerdos y faltantes

> **Tipo de documento:** Documentación funcional y minuta de seguimiento
> **Versión:** 1.1
> **Creado:** 2026-07-24 por Codex
> **Última actualización:** 2026-07-24 por Codex
> **Documentación técnica:** [`../../architecture/kortex/hubspot-as-a-service/anam-follow-up-change-set-2026-07-24.md`](../../architecture/kortex/hubspot-as-a-service/anam-follow-up-change-set-2026-07-24.md)

## Minuta ejecutiva

Desde la reunión y los mensajes posteriores:

- Customer Agent volvió a operar.
- El flujo de seguimiento se acotó a resultados, programación y facturación.
- Los requerimientos de Calidad pedirán nombre, empresa, correo y detalle antes de derivar.
- La conversación ya no nombra a una ejecutiva específica; usa `una persona del equipo`.
- Se confirmó el inventario actual de licencias y puestos.
- Se prepararon instrucciones para `Paso siguiente` y Outlook web.
- El backlog comercial y sus metas ya están publicados como piloto; SLA, entrega y facturación conservan gates
  de fuente o definición.
- Se crearon metas nativas de adjudicación, correos y reuniones y nueve visualizaciones en el panel comercial.
- La capacitación quedó confirmada para el miércoles 12 de agosto de 2026, de 09:00 a 13:00.
- ANAM confirmó el pago del 100% del KPI del proyecto.

## Qué significa cada pendiente

### `Paso siguiente`

Es la acción comercial concreta que debe ocurrir después. No es una etapa del pipeline. Debe indicar acción,
responsable y fecha. Ejemplo: `Enviar propuesta corregida — Ana Pérez — 29/07/2026`.

### Licencias

La licencia define qué conjunto de herramientas puede usar una persona; los permisos definen qué puede ver o
hacer dentro de esas herramientas. Un puesto Core no sustituye un puesto Sales o Service cuando la persona
necesita todas las funciones profesionales de ese hub.

### Backlog

ANAM usa la palabra para tres colas distintas:

1. oportunidades comerciales abiertas;
2. trabajo vendido todavía pendiente de entrega;
3. trabajo entregado o facturable todavía pendiente de factura.

Se reportarán por separado para no mezclar ventas, operación y facturación.

### SLA

`Cumplimiento de plazos` debe indicar qué reloj mide: próxima acción comercial, entrega del servicio o atención
de un Ticket. Cada uno requiere fechas, denominador y dueño distintos.

## Borrador de correo consolidado

**Asunto:** Cierre de ajustes ANAM — agente, metas, paneles y próximos pasos

Hola Óscar, hola María Paz:

Gracias por las respuestas a la minuta y por los ajustes enviados por correo y Teams. Les comparto el estado
consolidado de lo realizado.

**Customer Agent y landing**

- El Customer Agent se encuentra operativo y sus directrices actualizadas ya fueron publicadas.
- `Seguimiento de servicio` quedó centrado en resultados, programación y facturación; ya no deriva hacia
  contenidos de residuos que no correspondan a esa intención.
- `Requerimientos de calidad` solicita nombre, empresa, correo y el detalle del caso antes de la derivación.
- El mensaje al usuario quedó neutral: indica que continuará `una persona del equipo`, sin depender del nombre de
  quien esté asignado internamente.
- Landing: https://anam-2.hubspotpagebuilder.com/agente-anam

**Metas y paneles**

- Creamos la meta mensual de adjudicación en Growth: 400 UF por ingeniero de venta y 150 UF por asistente
  comercial. El total es 2.050 UF mensuales y 24.600 UF anuales.
- Creamos las metas semanales de 50 correos y 5 reuniones por persona.
- Incorporamos nueve gráficos al panel comercial: indicador agregado, evolución temporal y barras por responsable
  para cada una de las tres metas.
- El backlog comercial contiene 575 Negocios abiertos, por 205.005,55 UF nominales y 77.134,72 UF ponderadas,
  según el corte verificado el 24 de julio.

Enlaces:

- Backlog comercial y gráficos de metas:
  https://app.hubspot.com/reports-dashboard/19893546/view/21329151
- Metas:
  https://app.hubspot.com/goals/19893546/overview
- Crecimiento:
  https://app.hubspot.com/reports-dashboard/19893546/view/19708354
- Calidad de Datos Comercial:
  https://app.hubspot.com/reports-dashboard/19893546/view/21144697
- Retención (piloto):
  https://app.hubspot.com/reports-dashboard/19893546/view/21152855
- Fidelización (piloto):
  https://app.hubspot.com/reports-dashboard/19893546/view/21152950

Las metas de llamadas filtradas por tipo, ofertas/oportunidades calificadas y tasa de cierre no se reemplazaron por
aproximaciones: la configuración nativa disponible no permite representarlas fielmente. Para Fidelización aún
falta definir la métrica, el valor, la periodicidad y la población.

**Cómo funciona `Paso siguiente`**

`Paso siguiente` muestra la acción vigente que debe mover cada Negocio. Debe escribirse como:
`acción + resultado esperado + responsable + fecha`.

Ejemplo: `Enviar propuesta corregida — Ricardo Miralles — 31/07/2026`.

No debe usarse para textos genéricos como `Pendiente`, `Llamar` o `Hacer seguimiento`. Tampoco reemplaza el
historial de actividades: los correos, llamadas, reuniones y notas registran lo ocurrido; `Paso siguiente` se
actualiza cada vez que cambia la próxima acción. Es obligatorio en las etapas comerciales abiertas definidas y
aparece como columna operativa del backlog.

**Otros avances**

- Confirmamos el inventario de licencias: 10 de 11 puestos Sales, 1 de 3 Service y 10 de 21 Core asignados.
- Dejamos documentada la instalación y el uso de HubSpot Sales en Outlook web.
- Registramos la capacitación confirmada para el miércoles 12 de agosto, de 09:00 a 13:00.
- Registramos la confirmación del pago del 100% del proyecto KPI.

Para cerrar los siguientes bloques necesitamos que ANAM confirme:

1. lista definitiva de asistentes;
2. responsables y reemplazos del routing del Customer Agent;
3. responsable y fecha mensual del archivo de facturación;
4. personas que deben conservar acceso a los paneles;
5. SLA priorizado, meta, calendario y exclusiones;
6. métrica y meta de Fidelización, o aprobación para que la comparación presupuestaria sea sólo Growth.

Saludos,

Julio

## Estado de preparación y envío

El texto se consolidó después de leer los dos hilos fuente del 22 de julio: la respuesta a la minuta de KPI y el
hilo de ajustes del Customer Agent. Outlook permitió leer ambos mensajes, pero devolvió `ErrorAccessDenied`
(`403`) al intentar crear un correo nuevo y también un borrador de respuesta a todos. No existe un borrador
guardado en el buzón y no se envió el mensaje. Este documento conserva el cuerpo listo para copiar o para reintentar
como borrador cuando se restablezca el permiso de escritura.
