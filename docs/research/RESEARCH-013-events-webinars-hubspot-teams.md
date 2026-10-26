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

## Decisiones del operador (cerradas al 2026-10-24)

1. **Plataforma: webinar de Teams** (seminario web de la app Eventos), no reunión normal. Tenant **M365 Business**:
   inscripción básica, sin lista de espera ni aprobación en Teams; hasta 1.000 asistentes. Sin gasto nuevo: Teams se
   queda (alternativas pagadas evaluadas: GoTo Webinar, Zoom Webinars, Livestorm).
2. **Greenhouse es dueño de la reserva, el cupo y la lista de espera**; la espera no se registra en HubSpot.
3. **Reinstalar el app de HubSpot con `crm.objects.marketing_events.read/write`: autorizado** («Sí, solo Eventos»).
4. **Una sola fuente por Evento de marketing:** el conector Teams↔HubSpot si funciona; si no, Greenhouse por API.
5. **Sin release por ahora** (~3 h cada uno): todo se acumula y sale en un solo release cuando el operador lo decida.
6. El operador quiere que el agente ejecute (navegador, CLI); solo se le pide lo que exige su identidad.
8. **Los webinars se crean desde el Calendario de Teams (Nuevo → Webinar), no desde la app Eventos.** Verificado el
   2026-10-26 con el soporte de HubSpot: el conector descubre y sincroniza los del Calendario en minutos («Prueba sync
   HubSpot (calendario)», `b206c3ae-…`), y no ve los creados en la app Eventos (`a5c907d4-…`, `4d1e7c57-…`). Con eso la
   **fuente del Evento de marketing es el conector** por defecto; la escritura de Greenhouse por API queda de respaldo.
7. **La confirmación la manda Greenhouse** con la marca Efeonce y el **enlace personal de Teams** (`joinWebUrl` de la
   inscripción); **Teams en silencio** (correos a asistentes desactivados en cada webinar). Greenhouse también manda la
   lista de espera, el «ya tienes cupo» y el recordatorio.

## Decisiones abiertas

- **Cómo silenciar Teams en cada webinar:** confirmar si en M365 Business el organizador puede apagar los correos a
  asistentes en la app Eventos, o si hay que hacerlo por Graph (`settings.isAttendeeEmailNotificationEnabled=false`,
  que pide permiso delegado del organizador). Verificar en el primer webinar de prueba.
- **Nombre y apellido en la píldora:** Teams los exige para inscribir; hoy la píldora pide solo correo.
- **Cancelación en Teams:** por aplicación solo con RSC por evento; ¿basta liberar el cupo en Greenhouse o se suma
  permiso delegado del organizador?
- **Diseño final de los correos** (hoy provisionales) y del correo de bienvenida de Glitch.
- **Tipo de suscripción propio de Glitch** en HubSpot (hoy usa «Marketing Information», genérico).
- Fuente del Evento de marketing para cada evento mientras el ticket #50018204746 siga abierto.

## Backlog canónico para cerrar el módulo de eventos

> Fuente única del pendiente. Las demás piezas (skills, manuales, contratos, Handoff) apuntan aquí. Detalle técnico:
> [anexo D](RESEARCH-013-annexes/D-greenhouse-owned-events-discovery.md); diagnóstico del conector:
> [anexo C](RESEARCH-013-annexes/C-teams-hubspot-sync-diagnosis.md).

**A. Ya hecho, sin release**

- [x] Correos de reserva salen con reservas ya entregadas (`2a971d768`, `ACCEPTED_SUBMISSION_STATUSES`).
- [x] Píldora: autocompletado y «¡Listo!» centrado (`a5b028461`, gate `inline-pill.scenario.mjs` verde).
- [x] Política de acceso de Teams `MY-APP-POLICY` asignada también a jreyes@efeoncepro.com (2026-10-24 14:09).
- [x] Caso al soporte de HubSpot por el conector (#50018204746, derivado a agente humano).

**B. Externo / del operador (con su OK)**

- [x] Causa del conector aislada con el soporte (2026-10-26): los webinars de la app Eventos no se descubren; los del
      Calendario sí. Pendiente: respuesta de HubSpot sobre soporte de la app Eventos o forzar la lectura de los dos
      identificadores (ticket #50018204746).
- [ ] Pasar `crm.objects.marketing_events.read/write` a `requiredScopes`, `hs project upload`, reinstalar el app
      «Efeonce Data Platform» e introspeccionar el token (precedente PDR-009: no rota). Actualizar el snapshot
      `docs/operations/hubspot-app-manifest/`.
- [ ] Crear la app de Entra dedicada «Greenhouse Webinars» (single-tenant) con `VirtualEventRegistration-Anon.ReadWrite.All`,
      `VirtualEvent.Read.All` y `OnlineMeetingArtifact.Read.All`; consentimiento de administrador; secreto blob en
      Secret Manager; agregar su AppId a `MY-APP-POLICY` (`Set-CsApplicationAccessPolicy -AppIds @{Add=…}`).
      Coordinar con TASK-1769.
- [ ] Cancelar o despublicar los webinars de prueba «La IA no conoce tu negocio» (24-oct), «La IA y la busqueda» (26-oct)
      y «Prueba sync HubSpot (calendario)» (26-oct), cuando el soporte ya no los necesite.

**C. Construcción (tasks por crear con greenhouse-task-planner, `backend-data` primero)**

- [ ] **Evento y ciclo de vida:** tabla `growth_event` (id del webinar, organizador, `objectId` de HubSpot, fuente del
      evento, estado); ledger append-only de transiciones (`confirmed`, `waitlisted`, `promoted`, `cancelled`,
      `attended`) con instante, id de inscripción en Teams y `joinWebUrl` personal; enlace firmado «ya no puedo ir»;
      promoción FIFO desde la espera bajo el mismo lock; correo «ya tienes cupo»; evento outbox
      `growth.events.registration_changed`.
- [ ] **Inscripción y asistencia en Teams por Graph:** cliente Graph (patrón token-cache del bot, principal dedicado);
      proyección que inscribe al confirmar/promover (idempotente); lectura del informe de asistencia por sesión del
      webinar y transición `attended` con entrada/salida; lanzador recibe el id del webinar y lo valida.
- [ ] **HubSpot Marketing Events — solo respaldo** (el conector cubre los webinars del Calendario; construir solo si
      se necesita sin conector): cliente in-app API `2026-09`; upsert al lanzar y
      `objectId` persistido; proyección `REGISTERED`/`CANCELLED`/`ATTENDED`; backfill `pnpm events:hubspot-sync`;
      señal `growth.events.hubspot_participation_drift`; flag `GROWTH_EVENT_HUBSPOT_PARTICIPATION_ENABLED` solo en el
      ops-worker (`deploy.sh` + ledger).
- [ ] **Píldora (`ui-ux`):** pedir nombre y apellido si se decide; página de confirmación de cancelación.
- [ ] **Glitch:** correo de bienvenida desde Greenhouse y tipo de suscripción propio (publicar versión nueva con
      `pnpm growth:forms:publish-glitch-pill`).
- [ ] Pruebas: smoke de SQL contra PG real, tests de clientes (classify), mapper, execute y lanzador; prueba real en un
      webinar `prueba-`.

**D. Release y verificación (un solo release, cuando el operador lo decida)**

- [ ] Gates locales (`pnpm local:check`, `pnpm test`, build) y release con `greenhouse-production-release`.
- [ ] Flags por runtime (ops-worker: `GROWTH_EVENT_EMAILS_ENABLED` ya ON; nuevo de HubSpot y de Teams en `deploy.sh`).
- [ ] Re-verificación de punta a punta con `prueba-e2e-eventos-2026-10-24` (form_key
      `517e06bf-9d37-4394-801b-2f4c9ac782e6`, superficie `fhsf-efeonce-blog-events`): confirmación con `.ics`,
      inscripción en Teams con enlace personal, lista de espera, recordatorio, asistencia y Evento de marketing.
      Después deprecar ese formulario.
- [ ] Visto bueno visual de la píldora del pie (desvío 13) en vivo a 1440 y 390.
- [ ] Mandar a la papelera la página de revisión 252046 cuando el operador lo confirme.
- [ ] Recién entonces lanzar eventos reales.
