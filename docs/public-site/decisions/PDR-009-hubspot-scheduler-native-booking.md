# PDR-009 — Booking nativo con HubSpot Scheduler API

> **Tipo:** Product Decision Record para conversiones del sitio publico.
> **Estado:** Accepted — scheduler nativo activo; HubSpot queda como proveedor server-side, no como UI alternativa.
> **Fecha:** 2026-07-08.
> **Task:** [`TASK-1366`](../../tasks/complete/TASK-1366-hubspot-scheduler-booking-equivalence.md).
> **Superficies afectadas:** `efeoncepro.com`, `think.efeoncepro.com`, Growth CTA engine, landings publicas con CTA "Agenda una reunion".

## Contexto

La landing `/servicios/redes-sociales/` ya usa el widget oficial de HubSpot Meetings dentro de un shell Efeonce. Ese camino conserva el valor nativo de HubSpot: disponibilidad, reserva, calendario, Teams, contacto/timeline y medicion basica. El problema es CRO/UX: al ser iframe, HubSpot controla pasos, scroll interno, privacidad extensa y fit visual.

El operador pregunto si el widget es la unica via o si Greenhouse puede crear un booking propio y enviarlo a HubSpot por API, manteniendo lo que hoy hace HubSpot por detras: separar calendario, crear Teams, enviar invitacion y conectar con los objetos internos de Meetings/CRM.

## Decision

Efeonce usa una UI propia de booking que llama server-side a **HubSpot Scheduler API** sobre la misma scheduling page. HubSpot conserva configuración, disponibilidad, calendario, Teams y CRM como fuente técnica; su iframe o scheduling page no forman parte de la experiencia de recuperación del scheduler nativo.

La decisión inicial autorizó un spike controlado. La evidencia de TASK-1366 y el rollout de TASK-1509/1510 cerraron esa condición el 2026-07-21. Desde esa fecha, los estados vacío, degradado o de carga se resuelven dentro del scheduler mediante navegación mensual, reintento y mensajes explícitos. El rollback es operativo por flags/versiones, no una salida visible a HubSpot.

## Research sintetico

- HubSpot expone un endpoint oficial para reservar una reunion desde una scheduling page: `POST /scheduler/2026-03/meetings/meeting-links/book`.
- La respuesta documentada incluye `calendarEventId`, `contactId`, `isOffline`, `webConferenceMeetingId` y `webConferenceUrl`.
- Las scheduling pages sincronizan reuniones con el calendario conectado; si no hay calendario, HubSpot entra en modo offline y no agrega automaticamente al calendario.
- Microsoft Teams puede configurarse como videoconferencia en la scheduling page de HubSpot Meetings.
- La API de CRM Meetings (`/crm/v3/objects/meetings`) no reemplaza scheduling: registra/administra actividad de reunion, pero no debe asumirse como reserva de calendario ni generacion de Teams.
- La Scheduler API no preserva por si sola el tracking nativo de UTK/UTM/content tracking como un embed/form HubSpot. La mitigacion propuesta es medicion Greenhouse/GTM + envio complementario por Forms API con `context.hutk` cuando aplique.

## Evidencia final TASK-1366 — 2026-07-21

- El app `Efeonce Data Platform` fue desplegado/reinstalado con el scope mínimo
  `scheduler.meetings.meeting-link.read`; el token estático gobernado existente adquirió el permiso sin rotación.
- El slug API canónico es `efeoncepro/agenda-discovery` codificado como un solo segmento de path. El leaf
  `agenda-discovery` aislado responde `slug does not exist`.
- Details + availability están runtime-verificados: `GROUP_CALENDAR`, `isOffline=false`, un calendario
  `OFFICE365`, duración 30 minutos, campo `company` obligatorio, consentimiento legal habilitado y slots reales.
- El primer email aprobado fue rechazado por política de HubSpot con `MeetingsBookingCreatedError.BLOCKED_EMAIl`;
  el harness expone subcategoría/context keys sin registrar valores. Un destinatario alternativo fue aprobado.
- El booking controlado devolvió `isOffline=false`, `calendarEventId` y `contactId` presentes, start/end correctos
  y `webConferenceUrl` con host `teams.microsoft.com`; `webConferenceMeetingId` no fue necesario.
- El read-back CRM confirmó contacto, reunión asociada, outcome `SCHEDULED` y Teams como location.
- Outlook autenticado confirmó el evento 09:15–09:45 en el calendario del organizador, el invitado correcto en
  estado `sin respuesta`, Teams y links nativos de reprogramación/cancelación en notas.

### Postura de atribución

- Scheduler API no acepta `hubspotutk`, UTM ni content tracking en el payload, y tampoco expone una operación de
  reprogramación. No se debe prometer paridad de atribución HubSpot nativa con el embed.
- Los eventos de CTA/embed existentes siguen siendo mid-funnel. Una reserva solo se considera conversión cuando
  el servidor recibe confirmación exitosa de Scheduler; al productizar, esa evidencia debe mapear a
  `generate_lead` de GA4, no a un evento browser autorreportado ni a una nueva key event paralela.
- El adapter futuro debe conservar server-side solo campaña allowlisted (`utm_*`, referrer, page, surface y
  correlation), sin PII en `dataLayer`.
- Forms API + `context.hutk` queda como mitigación opcional, no default: requiere consentimiento vigente,
  deduplicación y una decisión explícita porque agrega actividad de form además del booking. Los hosts públicos
  hoy no tienen CMP/Consent Mode default, por lo que no puede asumirse ese gate.
- No se cambia `TRACKING-PLAN.md` todavía: esta task no crea runtime ni evento nuevo. La task de productización
  deberá registrar el rail server-confirmed antes de publicar GTM/Measurement Protocol.

### Veredicto

`CONDITIONAL PASS`. La Scheduler API preserva los side effects core que justificaban el spike: calendario,
Teams, contacto y actividad CRM. La evidencia del organizador muestra al invitado y los links nativos; el inbox
del destinatario no se inspeccionó directamente. La condición de productización es implementar un adapter
server-side con idempotencia, abuso/rate-limit, consentimiento/atribución, observabilidad y QA de entrega.

Este veredicto habilita planificar el adapter; no autoriza insertar booking nativo ni retirar el iframe.

Fuentes:

- `https://developers.hubspot.com/docs/api-reference/latest/scheduler/meetings/create-meeting`
- `https://knowledge.hubspot.com/meetings-tool/create-and-edit-scheduling-pages`
- `https://knowledge.hubspot.com/integrations/connect-hubspot-and-microsoft-teams`
- `https://knowledge.hubspot.com/meetings-tool/use-meetings`
- `https://developers.hubspot.com/docs/api-reference/legacy/crm/activities/meetings/guide`
- `https://developers.hubspot.es/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-authenticated`
- `https://support.google.com/analytics/answer/9267735?hl=es-419`

## Pass/fail para reemplazar el widget

La UI nativa solo puede avanzar si `TASK-1366` prueba con una reunion controlada que:

- HubSpot responde `isOffline=false`.
- HubSpot devuelve `calendarEventId`.
- HubSpot devuelve `webConferenceUrl` o `webConferenceMeetingId` compatible con Teams.
- El calendario del organizador queda reservado.
- El invitado recibe invitacion con link de Teams.
- El contacto queda creado/actualizado y la reunion aparece en el timeline/objeto esperado de HubSpot.
- El comportamiento de cancelacion/reprogramacion queda entendido y documentado.
- La medicion no manda PII al `dataLayer`.

Si cualquiera de los puntos core deja de cumplirse, se desactiva o revierte el scheduler nativo mediante el control plane. No se deriva al visitante al widget de HubSpot desde el flujo.

## Guardrails

- No exponer tokens HubSpot en cliente.
- No llamar Scheduler API directo desde WordPress/Think.
- No construir un calendario propio que reserve fuera de HubSpot si el objetivo es mantener Teams/calendario/CRM nativos.
- No usar CRM Meetings API como sustituto de booking.
- No crear reuniones reales con leads/clientes durante el spike; usar cuenta de prueba y horario aprobado.
- No insertar UI nativa en landings hasta tener veredicto y task posterior.
- Capturar `hubspotutk`/UTM solo si existe consentimiento y sin enviar PII al browser telemetry.

## Consecuencias

- `HubSpotMeetingEmbed` deja de ser fallback de la experiencia nativa. Puede persistir únicamente en superficies legacy todavía no migradas.
- El action router futuro de `growth.cta` puede agregar un adapter nuevo (`native_booking`/`hubspot_handoff`),
  sin cambiar el `book_meeting` navigation-only existente.
- Las landings con open question de mecanismo CTA (`/agencia`, creativa, HubSpot, redes) ganan una decision comun en vez de resolver meeting por pagina.
- La medicion de booking debe ser Greenhouse-first: `gh_cta_clicked`, eventos de meeting, conversion server-confirmed y reconciliacion con HubSpot/GA4.

## Alternativas descartadas

- **Pegar el snippet raw de HubSpot en cada landing.** Rapido, pero degrada estetica, tracking, scroll y ownership.
- **CRM meeting object API como booking.** No garantiza calendario, Teams ni invite; sirve para actividad CRM, no para reserva.
- **Calendario propio fuera de HubSpot.** Duplicaria la fuente de verdad y perderia el valor principal del Meetings tool.
- **Reemplazo inmediato del iframe.** Riesgoso sin probar side effects reales del portal Efeonce.

## Links

- Growth CTA engine: `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_DECISION_V1.md`
- Public Site primitives: `docs/architecture/public-site/PRIMITIVES.md`
- Tracking plan: `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- Task de validacion: `docs/tasks/complete/TASK-1366-hubspot-scheduler-booking-equivalence.md`
