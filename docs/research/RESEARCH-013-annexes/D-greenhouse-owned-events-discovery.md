# Anexo D — Discovery: webinars de Teams con Greenhouse como dueño de la inscripción

> **Fecha:** 2026-10-24 · **Autor:** Claude (sesión «Reservas de eventos, HubSpot y Teams») con tres subagentes de
> lectura · **Tipo:** discovery (sin cambios de código) · Marcas: **[V]** verificado en código, doc oficial o tenant;
> **[I]** inferido, a confirmar al implementar.
>
> **Corrección del operador (2026-10-24):** la sesión **es un webinar de Teams**, no una reunión normal. El webinar
> tiene administración, convocatoria, roles (asistente sin micrófono ni cámara, presentadores), preguntas y respuestas,
> página del evento, correos e informe de asistencia propios. El diseño se apoya en el webinar; una primera versión de
> este anexo que proponía bajar a reunión normal queda descartada.

## Por qué

El conector nativo de HubSpot con Teams no lee ningún webinar del tenant (anexo C; ticket #50018204746 derivado a un
agente). La alternativa debe ser **robusta, escalable y sin costo extra**, y no depender de ese conector.

## Diseño propuesto

| Pieza | Dueño | Cómo |
|---|---|---|
| El webinar (sala, roles, Q&A, presentadores) | Teams | El operador lo crea y publica en la app Eventos de Teams, como hoy |
| Reserva, cupo, lista de espera | Greenhouse | La píldora del blog (`event_registration`, lock por formulario). Teams en plan Business no tiene lista de espera ni aprobación [V], así que el cupo sigue en Greenhouse |
| Inscripción en el webinar | Greenhouse → Teams | Al confirmar cupo, Greenhouse **inscribe a la persona en el webinar** con Microsoft Graph: `POST /solutions/virtualEvents/webinars/{id}/registrations` con permiso de aplicación `VirtualEventRegistration-Anon.ReadWrite.All` (nombre, apellido, correo, zona, idioma) [V]. Es el mismo permiso que usa la app de HubSpot para inscribir desde sus formularios [V, Entra] |
| Enlace personal y recordatorios | Teams | Cada inscrito tiene su **enlace único** [V]. Teams manda sus correos si `isAttendeeEmailNotificationEnabled` está activo [V]; si Greenhouse manda el suyo, obtiene el `joinWebUrl` personal desde `registrations/{id}/sessions` [V] y Teams queda en silencio para no duplicar (decisión abierta) |
| Cancelación y lista de espera | Greenhouse (+ Teams) | Enlace «ya no puedo ir» → Greenhouse libera el cupo e inscribe en Teams al primero de la espera. **Cancelar en Teams por aplicación** (`POST …/registrations/{id}/cancel`) solo admite `VirtualEventRegistration-Anon.ReadWrite.Chat`, que es consentimiento por chat del evento (RSC) [V]: no es práctico. Fase 1: la inscripción en Teams de quien cancela queda viva (sin efecto en cupo, Teams Business no limita bajo 1.000); el organizador puede cancelarla a mano. Alternativa futura: permiso delegado `VirtualEvent.ReadWrite` del organizador |
| Asistencia | Teams → Greenhouse | Informe de asistencia **por sesión del webinar**: `GET /solutions/virtualEvents/webinars/{id}/sessions/{sessionId}/attendanceReports` (+ `attendanceRecords`) [V] |
| Evento de marketing en HubSpot | Greenhouse → HubSpot **o** el conector | **Una sola fuente por evento.** Mientras el conector esté roto, Greenhouse crea el Evento de marketing y registra `REGISTERED`/`CANCELLED`/`ATTENDED` por la API `2026-09`. Si el soporte arregla el conector, Teams→HubSpot lo hace solo (inscritos y asistencia), y Greenhouse deja de escribir ese evento (switch por evento) |
| Contacto, consentimiento, `ef_event_key` | HubSpot (formulario compartido) | Se mantiene el secure-submit actual |

Costo nuevo: **cero** (Graph y la API de HubSpot no cobran; webinars con inscripción básica incluidos en M365 Business
hasta 1.000 asistentes [V]; Resend ya contratado).

## Estado actual (verificado)

- **El evento no es una entidad:** vive en `form_version.ui_policy_json.eventRegistration`
  (`src/lib/growth/forms/contracts.ts:769-793`) y duplicado en metadatos de WordPress [V].
- **Estados de la reserva:** solo `confirmed`/`waitlisted` dentro de `normalized_fields_json` (`contracts.ts:738`,
  `store.ts:684-687`). **No hay cancelación ni paso desde la lista de espera** [V].
- Único evento de outbox: `growth.forms.submission_accepted` (`store.ts:732-747`). Correos por la proyección
  `growth_event_registration_email_from_submission`; recordatorio por `ops-growth-event-reminders` [V].
- `joinUrl` hoy es **uno fijo por evento** (`contracts.ts:785-789`); con el webinar pasa a ser **uno por persona** [V].
- A HubSpot solo viajan `email`, `ef_event_key` y `ef_greenhouse_submission_id` [V].
- Greenhouse no tiene código de Graph para webinars ni asistencia; sus dos apps de Entra (login y bot) no tienen esos
  permisos y la regla pide **principal dedicado** (`IDENTITY_WORKFORCE_AGENT_INVARIANTS.md:40`) [V].
- La política de acceso de Teams `MY-APP-POLICY` (AppId de HubSpot) está asignada como Global y, desde 2026-10-24
  14:09, a jreyes@efeoncepro.com [V]. Un usuario solo puede tener una: la app de Greenhouse se **agrega** a esa misma
  política (`Set-CsApplicationAccessPolicy -AppIds @{Add=…}`) [V doc].
- El portal de HubSpot sí tiene workflows (corrige el anexo C); este diseño no los necesita [V].

## Brechas a cerrar

1. **Entidad evento:** `greenhouse_growth.growth_event` (`event_key`, formulario, inicio/zona/duración, **id del
   webinar de Teams**, oid del organizador, `hubspot_marketing_event_object_id`, fuente del evento de marketing
   `greenhouse|teams_connector`, estado `scheduled|cancelled|completed`). Evita el gotcha del dispatcher (un
   `form_destination` con `adapter_kind` desconocido manda la reserva a `dead_letter`, `dispatch.ts:216-231`) [V].
2. **Ciclo de vida de la reserva:** ledger append-only de transiciones (`confirmed`, `waitlisted`, `promoted`,
   `cancelled`, `attended`) con instante persistido, **id de inscripción en Teams** y `joinWebUrl` personal (server-only).
   Da el `interactionDateTime` determinista que HubSpot usa para no duplicar [V anexo B].
3. **Inscripción en Teams:** proyección en el ops-worker que, al confirmar o promover, inscribe por Graph; idempotente
   (antes de inscribir busca por correo en `registrations` del webinar) [I]; reintentos y dead-letter del consumer.
4. **Cancelar y promover:** enlace firmado en el correo → command → libera cupo → promueve FIFO → inscribe en Teams →
   correo «ya tienes cupo». Evento outbox `growth.events.registration_changed`. La cancelación en Teams por aplicación
   requiere RSC (ver tabla): fuera de la fase 1.
5. **App de Entra dedicada** single-tenant («Greenhouse Webinars») con `VirtualEventRegistration-Anon.ReadWrite.All`,
   `VirtualEvent.Read.All` y `OnlineMeetingArtifact.Read.All`; consentimiento de administrador; secreto blob en Secret
   Manager; AppId agregado a `MY-APP-POLICY`. Coordinar con TASK-1769 (agenda de entrevistas por Graph). Mutaciones en
   Entra y Teams: con autorización explícita del operador.
6. **HubSpot Marketing Events** (mientras el conector no funcione): scopes `crm.objects.marketing_events.read/write` a
   `requiredScopes` + upload + reinstalación (autorizado: «Sí, solo Eventos»; precedente PDR-009 sin rotar token [V]);
   cliente in-app con el patrón de `growth/ai-visibility/hubspot/crm-client.ts`; upsert al lanzar; proyección de
   participación; backfill; señal de drift; flag `GROWTH_EVENT_HUBSPOT_PARTICIPATION_ENABLED` solo en ops-worker.
7. **Asistencia:** al cerrar la sesión, el ops-worker lee el informe de asistencia del webinar, empareja por correo
   (registrante ↔ registro de asistencia) y escribe `attended` con entrada/salida; si la fuente HubSpot es Greenhouse,
   la proyección escribe `ATTENDED`.
8. **Lanzador:** recibe el id del webinar (o lo busca con `getByUserIdAndRole`), lo valida por Graph (publicado,
   fecha, sin aprobación manual) y deja de pedir `joinUrl`.
9. **Pruebas:** smoke del SQL contra PG real; tests de cliente Graph/HubSpot (classify), mapper, execute y lanzador;
   prueba real en un webinar `prueba-`.

## Riesgos y decisiones abiertas

- **Correos dobles — decidido (2026-10-24):** confirma Greenhouse con su marca y el `joinWebUrl` personal; Teams en
  silencio. Falta verificar cómo se apagan los correos de Teams por webinar en plan Business (app Eventos o Graph con
  permiso delegado). Si no se pudieran apagar, la persona recibiría también el correo y el recordatorio de Teams.
- **Cancelación en Teams:** por aplicación solo con RSC por chat del evento [V]; en fase 1 la persona que cancela sigue
  inscrita en Teams y puede recibir su recordatorio. Decidir si basta o si se suma permiso delegado del organizador.
- **Duplicado de Evento de marketing** si el conector vuelve a funcionar: el switch por evento lo evita.
- Formulario de inscripción de Teams: solo nombre, apellido y correo obligatorios [V]; la píldora hoy pide solo correo,
  así que habrá que pedir nombre y apellido o derivarlos (decisión de UX).
- `startDateTime` vs `eventStartTime` en HubSpot: probar con un evento `prueba-` [anexo B].

## Cortes de task propuestos (backend-data primero)

1. **Evento y ciclo de vida de la reserva** (entidad, ledger, cancelar/promover, correos): `backend-data`, UI `copy`.
2. **Inscripción y asistencia en el webinar de Teams por Graph** (app dedicada, inscribir/cancelar, asistencia,
   lanzador): `backend-data`.
3. **HubSpot Marketing Events** (scopes, cliente, proyección, backfill, señal, flag, switch de fuente): `backend-data`.
4. Ajuste de la píldora para nombre y apellido si se decide: `ui-ux`.

Todo en **un solo release** junto con los arreglos ya listos (`2a971d768` correos, `a5b028461` píldora); luego
re-verificación con `prueba-e2e-eventos-2026-10-24` y deprecación.
