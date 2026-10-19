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
9. Con alcance comercial autorizado, completa una reserva y revisa la confirmación: debe reemplazar todo el calendario, mostrar fecha,
   rango horario, zona y Teams, y no volver a ofrecer selección ni otra acción de booking.
10. Comprueba que el foco llegue al título confirmado y que el email o receipt interno no aparezcan en DOM/dataLayer.
11. En un host ancho, revisa que “Conversemos” no corte letras, que el carril no muestre aros recortados y que la marca monocroma de Teams aparezca sin fondo morado. Repite a 820 px y 390 px verificando `scrollWidth === clientWidth`.
12. Revisa la cabecera del diálogo en el host real a 390 px y 820 px: el título no debe tomar la tipografía de los `h2` del
    tema y «Cerrar agenda» debe quedar en una sola línea (≈128×44 px), sin overflow. El diálogo vive en `<body>` y hereda el
    CSS del host, así que esta prueba sólo vale sobre la página real, no sobre el preview de `/growth/ctas`.

## Incrustar el launcher como botón compacto

Si el host necesita sólo el botón (un dock, una barra o una fila de acciones) y no el card completo, publica el CTA con
placement `embedded` y style `minimal`, y reduce el card a su botón desde el CSS del host, acotado al contenedor:

- oculta `.ghc-content` y `.ghc-dismiss`;
- deja `.ghc-card` en `display: flex; gap: 0`, sin padding, borde, fondo, sombra ni animación, y `.ghc-actions` sin márgenes;
- da al `.ghc-primary` el alto, radio y colores del host (área táctil ≥ 44 px) y fija `--gh-cta-reserve` al alto del botón
  para que el renderer no reserve el espacio del card.

Caso fuente: el dock móvil de `/servicios-contratar-hubspot/` (CTA `hubspot-discovery-meeting`, `cta-location=hubspot_mobile_dock`)
reduce el CTA a un botón de 48 px junto a «Ir al formulario»; `/contacto/` usa el mismo patrón. El botón sigue abriendo el
scheduler nativo en full-screen y la conversión sigue siendo el receipt `gh_meeting_*`, nunca el click. Si el host no tiene
surface/key, el hueco debe caer a un enlace a `/agenda/`.

## Problemas comunes

| Síntoma | Causa | Qué hacer |
| --- | --- | --- |
| En móvil, la cabecera del scheduler se ve partida: título con la tipografía del tema y «Cerrar agenda» en tres líneas | Renderer ≤ 1.3.0: el shorthand `font` con `inherit` (`font: 650 .84rem/1 inherit`) es inválido, el navegador descarta la declaración y el diálogo hereda el CSS del host | Corregido en el renderer **1.3.1** (longhands con `font-family: inherit`, botón `flex: none` + `nowrap`); code complete, llega a los hosts sólo con el release a producción de `renderer-latest.js` (pendiente al 2026-10-17) |
| El launcher compacto muestra el texto o el botón de descartar del card | El CSS del host no oculta `.ghc-content`/`.ghc-dismiss` o no está acotado al contenedor | Aplica las reglas de §Incrustar el launcher como botón compacto dentro del selector del contenedor |

## Comprobar medición y matching

El binding y la publicación del CTA habilitan la experiencia de reserva, no el matching por sí solos.
La autorización de matching es una policy publicada ligada al binding activo; el seed usa
`discovery`/`fhsf-efeonce-lead-gen-web`. La surface de ejemplo `efeonce-public-site` no amplía
ese alcance por sí sola. Para una agenda/surface nueva compatible, usar [configuración por
API/panel/CLI](configurar-medicion-conversiones.md): mapping tipado, destinos explícitos,
review/publish y lectura de confirmación. No cambiar una lista en código o GTM.

Después de una reserva real autorizada y confirmada, distinguir receipt/ledger server-side,
espejo GA4 `generate_lead`, entregas backend Meta/Google UPD y conversión Ads online.
Ninguno de estos estados prueba por sí solo recepción, matching o atribución en Ads.
El renderer toma categorías HubSpot/GPC al POST; sin publicidad explícita no hay matching, y
Google UPD exige también analítica e identificador GA4 real. La casilla para reservar no equivale a
consentimiento publicitario. El UUID de medición es independiente del recibo privado.

Meta Lead sale por el Client autenticado de GTM Server; el antiguo sender Lead basado en GA4 está
retirado. Google UPD no agrega eventos ni otra conversión. Nunca crear reservas ficticias ni repetir
booking para probar transporte. Usar Meta Test Events efímero para esa prueba aislada, siguiendo el
[manual CAPI](operar-meta-capi-servidor.md). Las pruebas controladas y sus límites están en el
[release vigente](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md); el procedimiento completo,
reintentos/retención y rollback en el [contrato runtime](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).

### Comprobar Google Ads y EC

1. Descubre la policy vigente del binding/surface/origen y confirma opt-in `meeting_booking`; el
   binding o CTA activo no la habilita por sí solo. Discovery es la agenda del sitio y no un tipo
   de campaña Ads. El corte publicado cubre Discovery junto a13 Forms comerciales.
2. Revisa flags de captura/Ads y consentimiento Google explícito (`analytics_storage`, `ad_storage`,
   `ad_user_data`, `ad_personalization`), sin GPC. El consentimiento para reservar no sustituye estos permisos.
3. Para una reserva legítima y fresca, verifica confirmación proveedor y persistencia del ledger y
   la proyección de medición. Sólo entonces aparece `googleAdsConversion` dedicado en la primera
   respuesta. Duplicados/replay no lo repiten; no crear otra reserva para probarlo.
4. Comprueba el circuito `gh_ads_conversion` → GTM Web → GTM Server → Ads, separado del espejo GA4.
   EC entrega hashes opcionales por el canal reservado `user_data`; no copiarlos a dataLayer, logs
   ni reportes. No fabricar GCLID/GBRAID/WBRAID. Ads online no tiene retry backend.
5. Conciliar recepción y atribución en la cuenta6862539491 con evidencia adecuada al proveedor y
   su ventana. Un tag fired, HTTP200 o recibo local no acreditan esos resultados.

El [release main2559e9242](../../audits/releases/2026-10-18-grader-commercial-measurement-production-release.md)
releyó Web6/Server10 y14 políticas sin nuevas publicaciones ni reservas de prueba. No quedó probada
una conversión Ads real. Para IDs/labels, controles y rollback de medición, usar el
[manual de activación Ads](activar-conversiones-google-ads.md) antes de cualquier cambio.

## Degradación y rollback

- Si no carga la agenda nativa, usa **Reintentar** y revisa bundle/CSP/origin binding si el problema persiste.
- Para rollback, desactiva el binding/flag de la surface, purga la caché del host o restaura la versión/backup anterior.
  Esto retira el launcher nativo de esa surface; no lo transforma en `book_meeting` ni abre una UI alternativa.
- `book_meeting` permanece navigation-only para superficies legacy. No lo reasignes como reemplazo automático de
  `open_meeting_scheduler` y no cambies la semántica de ninguno de los dos kinds durante un rollback.
- No agregues enlaces directos a HubSpot dentro del scheduler o su superficie de recuperación.

Contrato funcional: [Scheduler de reuniones nativo](../../documentation/growth/scheduler-reuniones-nativo.md). Arquitectura: [Growth Meetings Scheduler](../../architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md).
