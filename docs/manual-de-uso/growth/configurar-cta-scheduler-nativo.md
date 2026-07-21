# Configurar un Growth CTA con scheduler nativo

## Antes de empezar

- Debe existir un `meeting_surface_binding` activo para la pareja `meetingSurfaceId + schedulerKey`.
- La surface debe autorizar el origin del host y mantener una URL fallback de HubSpot gobernada.
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

## Degradación y rollback

- Si no carga la agenda nativa, usa el enlace **Abrir agenda alternativa** y revisa bundle/CSP/origin binding.
- Para rollback, publica o reasigna la versión anterior `book_meeting`; no cambies la semántica de ese kind.
- No borres el fallback hasta completar piloto, booking controlado, observación GTM/GA4 y aprobación de rollout.

Contrato funcional: [Scheduler de reuniones nativo](../../documentation/growth/scheduler-reuniones-nativo.md). Arquitectura: [Growth Meetings Scheduler](../../architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md).
