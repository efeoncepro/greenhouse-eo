# Scheduler de reuniones nativo

## Qué resuelve

El scheduler nativo permite elegir fecha y horario, entregar datos corporativos y reservar una reunión sin abandonar la experiencia Efeonce. La disponibilidad se muestra en la zona horaria IANA del visitante; HubSpot Scheduler, Office 365 y Teams siguen siendo las autoridades de agenda y reunión.

## Relación con Growth CTA

Growth CTA puede publicar dos comportamientos distintos:

- `book_meeting`: enlace histórico a una agenda HubSpot gobernada.
- `open_meeting_scheduler`: abre la agenda nativa dentro de una task surface adaptativa.

El CTA permanece compacto. En desktop abre un diálogo bounded y en móvil una superficie full-screen. Cerrar no borra el flujo: al reabrir se conserva la selección, el formulario y cualquier confirmación en curso durante la sesión del documento.

## Reglas de confianza

- La agenda no consulta disponibilidad por una simple impresión del CTA.
- La task surface sólo recibe `surface`, `scheduler key` y un fallback ya validados.
- Los datos personales permanecen en memoria y nunca entran a URL, atributos de tracking o dataLayer.
- Abrir la agenda no cuenta como conversión. Sólo un recibo confirmado server-side habilita la conversión de meeting.
- Si el bundle falla antes de reservar, se ofrece el fallback HubSpot. Un booking ambiguo no habilita un segundo intento inmediato.

## Estados y adaptación

El mismo controlador proyecta recetas `guided`, `split` o `command` según la caja disponible. Cambiar tamaño o cerrar/reabrir no crea otro booking intent ni repite pasos del funnel.

El formulario valida progresivamente: no muestra errores antes de que la persona interactúe; al salir de un campo
incompleto explica cómo corregirlo y, después, confirma la recuperación mientras se escribe. El correo primero valida
su formato y luego verifica de forma asíncrona que sea corporativo. Los estados siempre combinan icono, texto y semántica
accesible, y la reserva permanece deshabilitada mientras el correo esté verificándose o rechazado.

Cuando el servidor confirma el booking, el calendario completo se recompone como comprobante: desaparecen
disponibilidad, stepper, fallback y acciones de reserva. La nueva superficie muestra el rango horario y la zona del
appointment confirmado, duración, Teams y tres próximos pasos. No expone correo, identificadores del proveedor ni
el receipt de conversión; tampoco afirma que el email ya fue entregado.

Arquitectura: [Growth Meetings Scheduler](../../architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md). Manual: [Configurar un CTA con scheduler nativo](../../manual-de-uso/growth/configurar-cta-scheduler-nativo.md).
