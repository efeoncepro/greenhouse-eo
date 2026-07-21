# PDR-009 — Booking nativo con HubSpot Scheduler API

> **Tipo:** Product Decision Record para conversiones del sitio publico.
> **Estado:** Accepted — direction for validation, no runtime cutover.
> **Fecha:** 2026-07-08.
> **Task:** [`TASK-1366`](../../tasks/in-progress/TASK-1366-hubspot-scheduler-booking-equivalence.md).
> **Superficies afectadas:** `efeoncepro.com`, `think.efeoncepro.com`, Growth CTA engine, landings publicas con CTA "Agenda una reunion".

## Contexto

La landing `/servicios/redes-sociales/` ya usa el widget oficial de HubSpot Meetings dentro de un shell Efeonce. Ese camino conserva el valor nativo de HubSpot: disponibilidad, reserva, calendario, Teams, contacto/timeline y medicion basica. El problema es CRO/UX: al ser iframe, HubSpot controla pasos, scroll interno, privacidad extensa y fit visual.

El operador pregunto si el widget es la unica via o si Greenhouse puede crear un booking propio y enviarlo a HubSpot por API, manteniendo lo que hoy hace HubSpot por detras: separar calendario, crear Teams, enviar invitacion y conectar con los objetos internos de Meetings/CRM.

## Decision

Efeonce tratara el widget oficial como **fallback seguro vigente**, pero validara una alternativa preferida: una UI propia de booking que llame server-side a **HubSpot Scheduler API** sobre la misma scheduling page.

La decision no autoriza reemplazar el iframe en ninguna landing todavia. Autoriza un spike controlado para confirmar equivalencia operativa real en el portal Efeonce.

## Research sintetico

- HubSpot expone un endpoint oficial para reservar una reunion desde una scheduling page: `POST /scheduler/2026-03/meetings/meeting-links/book`.
- La respuesta documentada incluye `calendarEventId`, `contactId`, `isOffline`, `webConferenceMeetingId` y `webConferenceUrl`.
- Las scheduling pages sincronizan reuniones con el calendario conectado; si no hay calendario, HubSpot entra en modo offline y no agrega automaticamente al calendario.
- Microsoft Teams puede configurarse como videoconferencia en la scheduling page de HubSpot Meetings.
- La API de CRM Meetings (`/crm/v3/objects/meetings`) no reemplaza scheduling: registra/administra actividad de reunion, pero no debe asumirse como reserva de calendario ni generacion de Teams.
- La Scheduler API no preserva por si sola el tracking nativo de UTK/UTM/content tracking como un embed/form HubSpot. La mitigacion propuesta es medicion Greenhouse/GTM + envio complementario por Forms API con `context.hutk` cuando aplique.

## Evidencia intermedia TASK-1366 — 2026-07-21

- El app `Efeonce Data Platform` fue desplegado/reinstalado con el scope mínimo
  `scheduler.meetings.meeting-link.read`; el token estático gobernado existente adquirió el permiso sin rotación.
- El slug API canónico es `efeoncepro/agenda-discovery` codificado como un solo segmento de path. El leaf
  `agenda-discovery` aislado responde `slug does not exist`.
- Details + availability están runtime-verificados: `GROUP_CALENDAR`, `isOffline=false`, un calendario
  `OFFICE365`, duración 30 minutos, campo `company` obligatorio, consentimiento legal habilitado y slots reales.
- Un POST vacío deliberadamente inválido llegó a `VALIDATION_ERROR`, no a `MISSING_SCOPES`: el token alcanza el
  contrato write sin que esa prueba haya creado una reunión.
- El booking válido, Teams, invite, timeline y cancel/reschedule siguen pendientes de una identidad/slot de
  prueba aprobados; por eso aún no hay veredicto final.

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

Si cualquiera de los puntos core falla, se mantiene el widget oficial y se invierte en mejorar su contenedor/scroll/fallback.

## Guardrails

- No exponer tokens HubSpot en cliente.
- No llamar Scheduler API directo desde WordPress/Think.
- No construir un calendario propio que reserve fuera de HubSpot si el objetivo es mantener Teams/calendario/CRM nativos.
- No usar CRM Meetings API como sustituto de booking.
- No crear reuniones reales con leads/clientes durante el spike; usar cuenta de prueba y horario aprobado.
- No insertar UI nativa en landings hasta tener veredicto y task posterior.
- Capturar `hubspotutk`/UTM solo si existe consentimiento y sin enviar PII al browser telemetry.

## Consecuencias

- `HubSpotMeetingEmbed` sigue vigente como primitive candidata/fallback.
- El action router futuro de `growth.cta` puede graduar `book_meeting` solo despues del spike.
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
- Task de validacion: `docs/tasks/in-progress/TASK-1366-hubspot-scheduler-booking-equivalence.md`
