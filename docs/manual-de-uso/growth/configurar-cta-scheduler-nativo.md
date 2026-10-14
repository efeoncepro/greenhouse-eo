# Configurar un Growth CTA con scheduler nativo

## Antes de empezar

- Debe existir un `meeting_surface_binding` activo para la pareja `meetingSurfaceId + schedulerKey`.
- La surface debe autorizar el origin del host. HubSpot opera sólo detrás del adapter server-side.
- El renderer de meetings debe estar disponible en el mismo origen Greenhouse que sirve el CTA.

## Configuración

1. En el cockpit de Growth CTA, selecciona **Abrir agenda nativa**.
2. Ingresa la **Surface de reuniones**; por ejemplo, `efeonce-public-site`.
3. Ingresa el **Scheduler key**; por ejemplo, `discovery` si el catálogo/binding vigente confirma esa key.
4. Ajusta el copy del launcher. No prometas una descarga, formulario o navegación si la acción abre la agenda.
5. Publica una versión nueva del CTA y asígnala sólo a una surface autorizada.
6. Verifica que el launcher no cambie de tamaño al abrir: desktop debe usar diálogo y móvil full-screen.
7. Selecciona fecha y horario, cierra y vuelve a abrir. La misma selección debe permanecer.
8. Verifica `greenhouse_cta_clicked`/`greenhouse_cta_action_started` y el funnel `gh_meeting_step_reached` sin PII. No debe existir conversión por abrir.
9. Completa una reserva controlada y revisa la confirmación: debe reemplazar todo el calendario, mostrar fecha,
   rango horario, zona y Teams, y no volver a ofrecer selección ni otra acción de booking.
10. Comprueba que el foco llegue al título confirmado y que el email o receipt interno no aparezcan en DOM/dataLayer.
11. En un host ancho, revisa que “Conversemos” no corte letras, que el carril no muestre aros recortados y que la marca monocroma de Teams aparezca sin fondo morado. Repite a 820 px y 390 px verificando `scrollWidth === clientWidth`.

## Comprobar medición y matching

El binding y la publicación del CTA habilitan la experiencia de reserva, no el matching por sí solos.
La autorización de matching es una policy publicada ligada al binding activo; el seed usa
`discovery`/`fhsf-efeonce-lead-gen-web`. La surface de ejemplo `efeonce-public-site` no amplía
ese alcance por sí sola. Para una agenda/surface nueva compatible, usar [configuración por
API/panel/CLI](configurar-medicion-conversiones.md): mapping tipado, destinos explícitos,
review/publish y lectura de confirmación. No cambiar una lista en código o GTM.

Después de una reserva real autorizada y confirmada, distinguir tres evidencias: receipt/ledger
server-side, mirror GA4 `generate_lead`, y entrega backend a Meta/Google.
El renderer toma categorías HubSpot/GPC al POST; sin publicidad explícita no hay matching, y
Google UPD exige también analítica e identificador GA4 real. La casilla para reservar no equivale a
consentimiento publicitario. El UUID de medición es independiente del recibo privado.

Meta Lead sale por el Client autenticado de GTM Server; el antiguo sender Lead basado en GA4 está
retirado. Google UPD no agrega eventos ni otra conversión. Nunca crear reservas ficticias ni repetir
booking para probar transporte. Las pruebas controladas de TASK-2034 y sus límites están en el
[release](../../audits/releases/2026-10-13-full-develop-matching-release.md); el procedimiento completo,
reintentos/retención y rollback en el [contrato runtime](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).

## Degradación y rollback

- Si no carga la agenda nativa, usa **Reintentar** y revisa bundle/CSP/origin binding si el problema persiste.
- Para rollback, desactiva el binding/flag de la surface, purga la caché del host o restaura la versión/backup anterior.
  Esto retira el launcher nativo de esa surface; no lo transforma en `book_meeting` ni abre una UI alternativa.
- `book_meeting` permanece navigation-only para superficies legacy. No lo reasignes como reemplazo automático de
  `open_meeting_scheduler` y no cambies la semántica de ninguno de los dos kinds durante un rollback.
- No agregues enlaces directos a HubSpot dentro del scheduler o su superficie de recuperación.

Contrato funcional: [Scheduler de reuniones nativo](../../documentation/growth/scheduler-reuniones-nativo.md). Arquitectura: [Growth Meetings Scheduler](../../architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md).
