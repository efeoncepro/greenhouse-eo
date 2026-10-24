# Anexo D — Discovery: eventos con Greenhouse como dueño (sin depender del conector Teams↔HubSpot)

> **Fecha:** 2026-10-24 · **Autor:** Claude (sesión «Reservas de eventos, HubSpot y Teams») con tres subagentes de
> lectura · **Tipo:** discovery (sin cambios de código) · Marcas: **[V]** verificado en código, doc oficial o tenant;
> **[I]** inferido, a confirmar al implementar.

## Por qué

El conector nativo de HubSpot con Teams no lee ningún webinar del tenant (anexo C; ticket de soporte #50018204746
derivado a un agente). El operador pidió una alternativa **robusta, escalable y sin costo extra**: Greenhouse dueño del
evento y de la inscripción, hablando directo con HubSpot y Microsoft por sus API oficiales.

## Diseño propuesto

| Pieza | Dueño | Cómo |
|---|---|---|
| Reserva, cupo, lista de espera | Greenhouse | La píldora existente (`event_registration`, lock por formulario) |
| Sala | Teams | **Reunión normal** de Teams creada por el operador en Outlook/Teams (sala de espera activa). No es webinar: el conector de HubSpot no la sincroniza, así que no hay eventos duplicados. Las reuniones creadas por API no aparecen en el calendario del organizador [V], por eso la crea el operador |
| Confirmación + `.ics`, espera, recordatorio | Greenhouse | Correos existentes (arreglo `2a971d768` pendiente de release) + **enlace «ya no puedo ir»** |
| Evento de marketing y participación | Greenhouse → HubSpot | API Marketing Events `2026-09`: upsert del evento al lanzar; `REGISTERED` al confirmar, `CANCELLED` al cancelar, `ATTENDED` con `joinedAt`/`leftAt` |
| Asistencia | Greenhouse | **Fase 1:** importación del informe de asistencia de Teams (CSV). **Fase 2:** lectura automática por Microsoft Graph |
| Contacto, consentimiento, `ef_event_key` | HubSpot (formulario compartido) | Se mantiene el secure-submit actual |

Costo nuevo: **cero** (API de HubSpot en todos los planes, Graph sin costo, Resend ya contratado, M365 Business ya
pagado).

## Estado actual (verificado)

- **El evento no es una entidad:** vive en `form_version.ui_policy_json.eventRegistration`
  (`src/lib/growth/forms/contracts.ts:769-793`) y duplicado en metadatos de WordPress. No hay tabla de eventos [V].
- **Estados de la reserva:** solo `confirmed`/`waitlisted`, dentro de `normalized_fields_json`
  (`contracts.ts:738`, `store.ts:684-687`). **No hay cancelación ni paso desde la lista de espera:** quien queda en
  espera se queda ahí [V].
- Único evento de outbox: `growth.forms.submission_accepted` (`store.ts:732-747`). Correos por la proyección
  `growth_event_registration_email_from_submission`; recordatorio por el scheduler `ops-growth-event-reminders` [V].
- A HubSpot solo viajan `email`, `ef_event_key` y `ef_greenhouse_submission_id` (adapter secure-submit) [V].
- `joinUrl` es fijo por evento y server-only; cambiarlo exige una versión nueva y las reservas viejas conservan el
  anterior [V].
- No hay código de Marketing Events ni de Graph para reuniones o asistencia [V].
- El portal sí tiene workflows publicados (corrige el anexo C), pero el diseño no los necesita [V].

## Brechas a cerrar

1. **Entidad evento:** tabla `greenhouse_growth.growth_event` (clave `event_key`, formulario, inicio/zona/duración,
   `join_url` server-only, oid del organizador, `hubspot_marketing_event_object_id`, `teams_online_meeting_id`,
   estado `scheduled|cancelled|completed`). Evita el gotcha del dispatcher: un `form_destination` con `adapter_kind`
   desconocido manda la reserva a `dead_letter` (`dispatch.ts:216-231`) [V].
2. **Ciclo de vida de la reserva:** ledger append-only de transiciones
   (`confirmed`, `waitlisted`, `promoted`, `cancelled`, `attended`) con instante persistido. Da el
   `interactionDateTime` determinista que pide HubSpot para no duplicar [V anexo B].
3. **Cancelar y promover:** enlace firmado «ya no puedo ir» en la confirmación → command `cancelEventRegistration` →
   libera cupo → promueve al primero de la espera (FIFO, mismo lock) → correo «ya tienes cupo» con enlace y `.ics`.
   Evento outbox nuevo `growth.events.registration_changed`. Página pública mínima de confirmación (copy, sin flujo).
4. **HubSpot Marketing Events:** cliente in-app (no el bridge legacy) en `src/lib/growth/events/hubspot-marketing-events/`
   con el patrón de `growth/ai-visibility/hubspot/crm-client.ts`; paso «1b» del lanzador (upsert + `objectId`
   persistido); proyección `growth_event_participation_to_hubspot` en `ops-reactive-growth`; backfill
   `pnpm events:hubspot-sync`; señal `growth.events.hubspot_participation_drift`; flag
   `GROWTH_EVENT_HUBSPOT_PARTICIPATION_ENABLED` solo en el ops-worker (`deploy.sh` + ledger).
5. **Permisos de HubSpot:** pasar `crm.objects.marketing_events.read/write` a `requiredScopes` en
   `app-hsmeta.json`, `hs project upload` y reinstalar (operador ya lo autorizó: «Sí, solo Eventos»). Precedente PDR-009:
   el token estático adquirió el scope sin rotar [V]; igual se introspecciona después. Actualizar el snapshot
   desactualizado de `docs/operations/hubspot-app-manifest/`.
6. **Asistencia fase 1:** CLI `pnpm events:attendance-import -- --event <slug> --csv <archivo> [--apply]` que empareja
   por correo (hash) y escribe transiciones `attended` con entrada/salida. Sin permisos nuevos.
7. **Asistencia fase 2 (task aparte):** app de Entra **dedicada** single-tenant (regla de principal dedicado,
   `IDENTITY_WORKFORCE_AGENT_INVARIANTS.md:40`) con `OnlineMeetings.Read.All` +
   `OnlineMeetingArtifact.Read.All`, consentimiento de administrador, y su AppId **agregado a `MY-APP-POLICY`** (el
   organizador solo puede tener una política; hoy la tiene asignada con el AppId de HubSpot) [V]. Flujo:
   `GET /users/{oid}/onlineMeetings?$filter=JoinWebUrl eq '…'` → `attendanceReports` → `attendanceRecords`. Microsoft
   guarda los últimos 50 informes por reunión [V]; los externos pueden venir sin correo [I]. Coordinar con TASK-1769
   (agenda de entrevistas por Graph) para no crear dos apps de calendario sin plan.
8. **Pruebas:** smoke del SQL de recordatorio y del nuevo ledger contra PG real; tests de cliente (classify), mapper,
   execute y del lanzador.

## Riesgos y decisiones abiertas

- Enlace compartido: con reunión normal todos reciben el mismo enlace; mitigación: solo llega a confirmados y la sala
  de espera controla el ingreso. El enlace personal exigiría webinar + Graph (descartado en este diseño).
- Si algún día se usa webinar de Teams, el conector podría crear un segundo evento: regla «un evento, una fuente».
- `startDateTime` vs `eventStartTime`: la doc de HubSpot se contradice; probar con un evento `prueba-` [anexo B].
- Lista de espera en HubSpot: no se registra (decisión del operador); opcional lista estática por evento.

## Cortes de task propuestos (backend-data primero)

1. **Ciclo de vida del evento y la reserva** (entidad evento, ledger, cancelar/promover, correo de promoción, página de
   confirmación): `backend-data` con UI `copy`.
2. **HubSpot Marketing Events** (scopes, cliente, lanzador 1b, proyección, backfill, señal, flag): `backend-data`.
3. **Importación de asistencia por CSV:** `backend-data`.
4. **Asistencia automática por Graph:** `backend-data`, después y coordinada con TASK-1769.

1 a 3 salen en el **mismo release** que los arreglos ya listos (`2a971d768` correos, `a5b028461` píldora). Después se
re-verifica de punta a punta con `prueba-e2e-eventos-2026-10-24` y se depreca.
