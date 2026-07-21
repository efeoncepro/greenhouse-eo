# Configurar un Growth CTA con scheduler nativo

## Antes de empezar

- Debe existir un `meeting_surface_binding` activo para la pareja `meetingSurfaceId + schedulerKey`.
- La surface debe autorizar el origin del host. HubSpot opera sólo detrás del adapter server-side.
- El renderer de meetings debe estar disponible en el mismo origen Greenhouse que sirve el CTA.

## Configuración

1. En el cockpit de Growth CTA, selecciona **Abrir agenda nativa**.
2. Ingresa la **Surface de reuniones**; por ejemplo, `efeonce-public-site`.
3. Ingresa el **Scheduler key**; por ejemplo, `efeonce-discovery-30`.
4. Ajusta el copy del launcher. No prometas una descarga, formulario o navegación si la acción abre la agenda.
5. Publica una versión nueva del CTA y asígnala sólo a una surface autorizada.
6. Verifica que el launcher no cambie de tamaño al abrir: desktop debe usar diálogo y móvil full-screen.
7. Selecciona fecha y horario, cierra y vuelve a abrir. La misma selección debe permanecer.
8. Verifica `greenhouse_cta_clicked`/`greenhouse_cta_action_started` y el funnel `gh_meeting_step_reached` sin PII. No debe existir conversión por abrir.
9. Completa una reserva controlada y revisa la confirmación: debe reemplazar todo el calendario, mostrar fecha,
   rango horario, zona y Teams, y no volver a ofrecer selección ni otra acción de booking.
10. Comprueba que el foco llegue al título confirmado y que el email o receipt interno no aparezcan en DOM/dataLayer.

## Degradación y rollback

- Si no carga la agenda nativa, usa **Reintentar** y revisa bundle/CSP/origin binding si el problema persiste.
- Para rollback, desactiva el binding/flag de la surface, purga la caché del host o restaura la versión/backup anterior.
  Esto retira el launcher nativo de esa surface; no lo transforma en `book_meeting` ni abre una UI alternativa.
- `book_meeting` permanece navigation-only para superficies legacy. No lo reasignes como reemplazo automático de
  `open_meeting_scheduler` y no cambies la semántica de ninguno de los dos kinds durante un rollback.
- No agregues enlaces directos a HubSpot dentro del scheduler o su superficie de recuperación.

Contrato funcional: [Scheduler de reuniones nativo](../../documentation/growth/scheduler-reuniones-nativo.md). Arquitectura: [Growth Meetings Scheduler](../../architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md).
