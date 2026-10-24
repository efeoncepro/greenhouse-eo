# RESEARCH-013 — Eventos y webinars: HubSpot Eventos de marketing y webinars de Teams

> **Estado:** Active · **Fecha:** 2026-10-24 · **Autor:** Claude (sesión «Portada del blog v3»), con dos subagentes de
> investigación · **Anexos:** [A — HubSpot y webinars de Teams](RESEARCH-013-annexes/A-hubspot-teams-webinars.md) ·
> [B — objeto Eventos de marketing](RESEARCH-013-annexes/B-hubspot-marketing-events-object.md) ·
> [C — diagnóstico: webinars de Teams que no llegan a HubSpot](RESEARCH-013-annexes/C-teams-hubspot-sync-diagnosis.md)
> (decisiones del operador y estado al 2026-10-24) ·
> [D — discovery: eventos con Greenhouse como dueño](RESEARCH-013-annexes/D-greenhouse-owned-events-discovery.md)

## Por qué existe

El 2026-10-24 se desplegó la reserva de eventos del blog (release `e593e3993bc3`): píldora en `/blog/`, formulario
`event_registration` de Greenhouse con cupo y lista de espera, copia a un formulario HubSpot compartido y correos propios
(confirmación con enlace privado y `.ics`, lista de espera, recordatorio). La prueba de punta a punta mostró dos cosas:

1. **Los correos no salen en producción.** El consumer y el SQL del recordatorio exigían `status = 'accepted'`, pero el
   dispatcher ya había pasado la reserva a `delivered`. Corregido localmente (`ACCEPTED_SUBMISSION_STATUSES`, prueba
   `event-emails-accepted-status.test.ts`), **sin release**.
2. **HubSpot no tiene el evento.** Cada reserva llega sólo como envío del formulario «Reserva de eventos | Blog Efeonce»
   más la propiedad `ef_event_key` («Último Evento Reservado», se sobrescribe). No se usa el objeto nativo Eventos de
   marketing (0-54): no hay inscritos por evento, ni asistencia, ni estado confirmado/en espera.

Decisión del operador: **diseñar bien la integración antes del próximo release** (un release es costoso) y no lanzar
eventos reales con el flujo actual. Este brief reúne lo investigado y lo que falta decidir.

## Hallazgos (verificados en documentación, salvo donde se indica)

**Objeto Eventos de marketing (anexo B)**

- API vigente `/marketing/marketing-events/2026-09` (v3 queda legacy). Alta por `POST /events/upsert` con `eventName`,
  `externalEventId`, `externalAccountId`, `eventOrganizer`; opcionales tipo, fechas, URL, descripción, cancelado,
  completado, propiedades propias. La doc se contradice en el nombre del campo de inicio: probar con un evento `prueba-`.
- Participación escribible: REGISTERED, ATTENDED, CANCELLED (NO_SHOW sólo lectura). Endpoint preferido
  `POST /{objectId}/attendance/{state}/email-create` (crea el contacto si falta, acepta `joinedAt`/`leftAt`, idempotente
  con el mismo `interactionDateTime`). Operar siempre por `objectId`: los endpoints por ids externos sólo sirven a la
  app que creó el evento.
- **Sin cupo ni lista de espera** en el objeto. Recomendación: no registrar a quien está en espera; pasa a REGISTERED
  cuando Greenhouse lo confirme.
- **Bloqueo de permisos:** el token es del project app «Efeonce Data Platform» (appId 33235280). Los scopes
  `crm.objects.marketing_events.read/write` están declarados como **opcionales** en
  `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/src/app/app-hsmeta.json`; hay que pasarlos a
  requeridos, `hs project upload` y reinstalar la app (super admin). No está documentado si el token cambia al
  reinstalar: verificar con introspección y rotar `hubspot-access-token` si cambió. Mutación externa: requiere OK.

**Webinars de Teams (anexo A)**

- La app de Teams en HubSpot soporta webinars: sincroniza el webinar como Evento de marketing, con inscritos,
  asistentes, cancelaciones y duración en la línea de tiempo. Requiere admin install, una application access policy por
  PowerShell y Professional/Enterprise para workflows.
- HubSpot puede inscribir en Teams sin la página de Teams: form automation (sólo formularios en páginas HubSpot) o la
  acción de workflow «Add Contact to Microsoft Teams webinar». El formulario de Teams sólo admite nombre, apellido y
  correo como obligatorios.
- **No documentado:** si un envío por la Forms API (lo que hace Greenhouse) dispara ese workflow. Hay que probarlo.
- Enlace único y recordatorios los manda Teams (inferido); HubSpot no expone el enlace de Teams.
- Microsoft Graph (v1.0, GA 2024-08-30): crear el webinar exige permiso **delegado** del organizador; inscribir externos
  funciona con permiso de aplicación `VirtualEventRegistration-Anon.ReadWrite.All`; el enlace personal sale de
  `registrations/{id}/sessions` (`joinWebUrl`). Teams sí tiene `waitlisted` y `pendingApproval`.
- Licencias (cambio 2026-04-01): lista de espera, aprobación manual y correos personalizados de Teams son «avanzados»
  (E1/E3/E5/E7); los planes Microsoft 365 Business sólo traen inscripción básica. **Falta confirmar el plan de Efeonce.**

## Opciones

| Opción | Quién es dueño de la inscripción | Correos y enlace | Pros | Contras |
|---|---|---|---|---|
| **1. Greenhouse + Eventos de marketing** (sin Teams automatizado) | Greenhouse | Greenhouse (enlace fijo de la sala) | Mínimo cambio sobre lo construido; HubSpot gana el evento y los inscritos | Enlace compartido, asistencia manual |
| **2. Piloto híbrido** | Greenhouse captura; sólo confirmados van a HubSpot | Teams (enlace único, recordatorio) vía workflow | Enlace personal y asistencia automática de Teams | Depende de que el envío por API dispare el workflow; Greenhouse deja de mandar el enlace |
| **3. Greenhouse dueño completo** | Greenhouse | Greenhouse con `joinWebUrl` de Teams vía Graph | Control total, lista de espera propia, asistencia por Graph | Permisos Entra (delegado para crear), más desarrollo |
| 4. Todo nativo HubSpot/Teams | HubSpot/Teams | Teams | Cero código | Rompe la píldora del blog y la lista de espera — no recomendada |

Recomendación preliminar: **1 como base** (es lo que el release siguiente puede llevar con la corrección de correos) y
**2 o 3 según** el plan de M365 y la prueba del workflow. 1 es compatible con ambas: el evento y los REGISTERED en HubSpot
se necesitan en cualquier caso, y si Teams sincroniza su propio evento hay que evitar duplicados (decidir qué evento
manda).

## Decisiones pendientes del operador

1. Plataforma de las sesiones (Teams, Zoom, Meet) y plan de Microsoft 365 / tier de HubSpot.
2. Autorizar la reinstalación del app de HubSpot con los scopes de Eventos de marketing (¿y `marketing.campaigns.*`?).
3. Quién envía el enlace y los recordatorios: Greenhouse o Teams.
4. Lista de espera: ¿se mantiene en Greenhouse y se registra en HubSpot sólo al confirmar?
5. Asistencia: ¿se automatiza en esta etapa?
6. Diseño final de los correos (hoy provisionales).

## Próximo paso

Sesión nueva: cerrar estas decisiones, convertir la opción elegida en task(s) `backend-data` (destino o consumer de
participación, flag `GROWTH_EVENT_HUBSPOT_PARTICIPATION_ENABLED` sólo en el ops-worker, backfill, señal de drift,
rollback) y llevar en **un solo release** la corrección de correos más la integración. Re-verificar con el formulario de
prueba `prueba-e2e-eventos-2026-10-24` y deprecarlo al terminar.
