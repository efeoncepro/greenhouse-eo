# Scheduler de reuniones nativo

## Qué resuelve

El scheduler nativo permite elegir fecha y horario, entregar datos corporativos y reservar una reunión sin abandonar la experiencia Efeonce. La disponibilidad se muestra en la zona horaria IANA del visitante; HubSpot Scheduler, Office 365 y Teams siguen siendo las autoridades de agenda y reunión.

## Relación con Growth CTA

Growth CTA puede publicar dos comportamientos distintos:

- `book_meeting`: enlace histórico a una agenda HubSpot gobernada.
- `open_meeting_scheduler`: abre la agenda nativa dentro de una task surface adaptativa.

El CTA permanece compacto. En desktop abre un diálogo bounded y en móvil una superficie full-screen. Cerrar no borra el flujo: al reabrir se conserva la selección, el formulario y cualquier confirmación en curso durante la sesión del documento.

Además del diálogo, el agendador puede vivir en línea dentro de una página. Desde el 2026-10-20, `/agenda/` es la
landing de agenda del sitio, indexable y con la línea gráfica «La órbita»: monta el mismo agendador del piloto (misma
surface, misma agenda y mismo comportamiento) y sólo lo enmarca y le ajusta colores con las variables del agendador.
No usa el botón de Growth CTA y no cambió cómo se reserva ni cómo se mide.

## Reglas de confianza

- La agenda no consulta disponibilidad por una simple impresión del CTA.
- La task surface sólo recibe `surface` y `scheduler key` ya validados; no recibe ni construye enlaces del provider.
- Los datos personales permanecen en memoria y nunca entran a URL, atributos de tracking o dataLayer.
- Abrir la agenda no cuenta como conversión. Sólo un recibo confirmado server-side habilita la conversión de meeting.
- Si el bundle o la disponibilidad fallan antes de reservar, la experiencia ofrece `Reintentar` y navegación mensual sin salir del scheduler. Un booking ambiguo no habilita un segundo intento inmediato.

## Medición y matching publicitario

La reserva confirmada produce el espejo GA4 `generate_lead` con `lead_source=meeting_booking`.
Abrir el calendario, seleccionar horario, fallar o repetir una confirmación no crea otra conversión.

TASK-2034 agregó un carril backend para Meta y Google: después de la confirmación válida se guarda
una proyección cifrada, con UUID independiente de la reserva y su recibo privado. El worker la
entrega a Meta por GTM Server y, si corresponde, a Google como datos de usuario sin otro evento GA4.
Sólo se prepara con consentimiento publicitario vigente y sin GPC; Google requiere además analítica
consentida y un identificador GA4 real. Los datos de contacto y hashes no van al dataLayer.

La cobertura la autoriza una policy publicada sobre el binding activo, no una constante.
El seed equivalente usa `discovery`/`fhsf-efeonce-lead-gen-web`, en los dos hosts Efeonce.
Una agenda/surface nueva puede reservar sin estar habilitada para publicidad: se configura
mapping/destinos por datos y se publica desde el panel o la CLI de agentes, sin otro release
para una fuente compatible. El fingerprint detecta cambios del binding. [Manual](../../manual-de-uso/growth/configurar-medicion-conversiones.md).

El matching no bloquea el booking si falla; reintenta como máximo 5 veces/24 h y elimina el
material cifrado a 48 h. La confirmación de transporte no acredita audiencia publicitaria utilizable.
[Contrato runtime](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md) ·
[release vigente y límites de Test Events](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).
La primera reserva comercial consentida y su conciliación con cada proveedor siguen pendientes
de observar; las pruebas aisladas no crean bookings ni contactos comerciales.

### Google Ads online y conversiones mejoradas

La conversión Ads `meeting_booking` requiere una respuesta válida del proveedor, la transición
persistida `provider_dispatched → succeeded` y la proyección de medición guardada. Sólo entonces
la primera respuesta puede incluir el recibo dedicado `googleAdsConversion`; replay, apertura del
calendario o un booking ambiguo no lo emiten. El recibo comercial de la reserva conserva su
contrato independiente.

La policy publicada debe corresponder al binding, surface y origen vigentes, con captura y Ads
habilitados, los cuatro permisos Google explícitos y sin veto GPC. El navegador transporta
`gh_ads_conversion` por GTM Web hacia el tag Ads de GTM Server; no deriva esta conversión del
`generate_lead` genérico. Los hashes EC opcionales usan el canal reservado `user_data`, no dataLayer;
GCLID/GBRAID/WBRAID se observan con consentimiento, nunca se fabrican. Este envío online depende
del navegador y no usa los reintentos backend de Meta/UPD descritos arriba.

El [cierre del release](../../audits/releases/2026-10-18-grader-commercial-measurement-production-release.md)
releyó Web6/Server10, Ads6862539491 y13 Forms comerciales+Discovery sin modificar esas políticas.
Discovery es la agenda del sitio, no un tipo de campaña Ads. La recepción, matching y atribución de
una reserva real no quedaron verificadas con esos canarios; no se crearon reservas ficticias.
[Activación y verificación](../../manual-de-uso/growth/activar-conversiones-google-ads.md).

## Estados y adaptación

El mismo controlador proyecta recetas `guided`, `split` o `command` según la caja disponible. Cambiar tamaño o cerrar/reabrir no crea otro booking intent ni repite pasos del funnel.

En la receta amplia, el carril contextual conserva palabras completas —incluido “Conversemos”— y usa la marca monocroma oficial de Microsoft Teams en el mismo acento turquesa del carril, sin disco morado. El fondo oscuro puede llevar un resplandor tonal estático, pero no órbitas recortadas ni animación decorativa.

Un mes sin disponibilidad no colapsa el calendario. La grilla conserva el mes solicitado y todos sus días como no
disponibles, junto con un estado vacío específico y navegación acotada hacia otros meses. En la verificación live del
2026-07-21 HubSpot devolvió cero slots para agosto, y `/agenda/` mantuvo `Agosto de 2026` y sus 31 días.

El formulario valida progresivamente: no muestra errores antes de que la persona interactúe; al salir de un campo
incompleto explica cómo corregirlo y, después, confirma la recuperación mientras se escribe. El correo primero valida
su formato y luego verifica de forma asíncrona que sea corporativo. Los estados siempre combinan icono, texto y semántica
accesible, y la reserva permanece deshabilitada mientras el correo esté verificándose o rechazado.

Cuando el servidor confirma el booking, el calendario completo se recompone como comprobante: desaparecen
disponibilidad, stepper, recuperación y acciones de reserva. La nueva superficie muestra el rango horario y la zona del
appointment confirmado, duración, Teams y tres próximos pasos. No expone correo, identificadores del proveedor ni
el receipt de conversión; tampoco afirma que el email ya fue entregado.

Arquitectura: [Growth Meetings Scheduler](../../architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md). Manual: [Configurar un CTA con scheduler nativo](../../manual-de-uso/growth/configurar-cta-scheduler-nativo.md).
