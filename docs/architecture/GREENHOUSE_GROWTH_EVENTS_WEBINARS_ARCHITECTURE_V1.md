# Greenhouse Growth Events — Webinars de Teams V1

> **Tipo:** spec de arquitectura canónica + ADR
> **Versión:** 1.0
> **Creado:** 2026-10-26 por Claude (arch-architect), con el operador
> **Estado:** Proposed — diseño aprobado en conversación; **nada implementado**. Las verificaciones marcadas **[I]** se
> cierran en el Slice 0.
> **Owner:** Growth (formularios públicos) · operador Julio Reyes
> **Dominio:** Growth / Forms / Events · integraciones Microsoft Teams (Graph) y HubSpot
> **Fuentes:** [RESEARCH-013](../research/RESEARCH-013-events-webinars-hubspot-teams.md) y anexos
> [B](../research/RESEARCH-013-annexes/B-hubspot-marketing-events-object.md),
> [C](../research/RESEARCH-013-annexes/C-teams-hubspot-sync-diagnosis.md),
> [D](../research/RESEARCH-013-annexes/D-greenhouse-owned-events-discovery.md)

## 1. Decisión

Un evento de Efeonce es un **webinar de Microsoft Teams creado desde el Calendario** (Nuevo → Webinar). **Greenhouse
es dueño de la reserva**: la píldora del blog, el cupo, la lista de espera, la cancelación y los correos. **Teams es
dueño de la sala** (roles, Q&A, presentadores, enlace personal, asistencia). **HubSpot recibe el Evento de marketing por
su conector nativo con Teams**, que sí descubre los webinars del Calendario (verificado 2026-10-26).

El puente es uno solo: cuando una reserva queda confirmada, **Greenhouse inscribe a la persona en el webinar** por
Microsoft Graph y le manda **su propia confirmación con el enlace personal de Teams**. Teams queda en silencio. Sin
costo nuevo.

**4 pilares (resumen):** Seguridad 4/5 · Robustez 4/5 · Resiliencia 4/5 · Escalabilidad 5/5 (detalle en §17).

### Alternativas rechazadas

| Alternativa | Por qué no |
|---|---|
| Reunión normal de Teams con enlace fijo | Pierde lo propio del webinar (roles, Q&A, página, informe por sesión). Rechazada por el operador. |
| Webinar creado en la **app Eventos** | El conector de HubSpot no lo descubre (anexo C, ticket #50018204746). |
| Formulario de HubSpot en página de HubSpot con «Form automation» | Rompe la píldora del blog y la lista de espera; la automatización vive en el módulo de la página, no en el formulario. |
| Workflow de HubSpot «Agregar contacto al webinario» disparado por el envío de Greenhouse | Teams mandaría el enlace (contra la decisión de que confirma Greenhouse); el uso de workflows por créditos está en pausa en el portal; un workflow por webinar a mano; la espera exigiría retener el envío. Queda como **plan B sin código**. |
| Greenhouse escribe el Evento de marketing por la API `2026-09` | Duplicaría el evento que ya crea el conector. Queda como **respaldo** detrás de un flag, solo si el conector falla. |
| GoTo Webinar / Zoom / Livestorm | Costo adicional; el operador pidió no gastar. |

## 2. Casos de uso

1. El operador crea el webinar en el Calendario de Teams y lo lanza con `pnpm events:launch` (blog + formulario +
   vínculo con el webinar).
2. Una persona reserva en la píldora: queda **confirmada** (recibe correo de Greenhouse con su enlace personal y `.ics`)
   o en **espera** (recibe aviso de espera).
3. Una persona confirmada usa «ya no puedo ir»: se libera su cupo y **el primero en espera pasa a confirmado**,
   inscrito en Teams, con su correo.
4. Recordatorio antes de la sesión, desde Greenhouse, con el enlace personal.
5. Después de la sesión, HubSpot muestra inscritos y asistencia (conector); Greenhouse puede leer la asistencia para sus
   propios reportes (opcional, Slice 6).

## 3. Modelo

### 3.1 Identidad y frontera (sin identidades paralelas)

- La persona que reserva **no es un objeto 360** (no es Persona, Colaborador ni Cliente): es un lead del motor de
  formularios. Su ancla es `greenhouse_growth.form_submission` (existente). En HubSpot es un contacto (envío del
  formulario compartido, existente).
- El evento se ancla a `greenhouse_growth.form_definition.form_id` (`form_kind='event_registration'`).
- No se crea ninguna identidad nueva de persona: la inscripción referencia `submission_id`.

### 3.2 Tablas nuevas (`greenhouse_growth`)

```sql
-- Evento: SSOT de horario y vínculo con Teams/HubSpot. La presentación pública y el cupo siguen en
-- form_version.ui_policy_json.eventRegistration (existente); el lanzador escribe ambos y un test de drift los compara.
CREATE TABLE greenhouse_growth.growth_event (
  event_id              text PRIMARY KEY,                -- 'gev-<ulid>'
  event_key             text NOT NULL UNIQUE,            -- = staticValue de event_key en el formulario (slug)
  form_id               text NOT NULL REFERENCES greenhouse_growth.form_definition(form_id),
  title                 text NOT NULL,
  start_at              timestamptz NOT NULL,
  timezone              text NOT NULL,                   -- IANA
  duration_min          integer NOT NULL CHECK (duration_min BETWEEN 5 AND 600),
  teams_webinar_id      text,                            -- '<guid>@<tenant>' (webinar del Calendario)
  teams_organizer_oid   text,                            -- Entra object id del organizador
  marketing_event_source text NOT NULL DEFAULT 'teams_connector'
                        CHECK (marketing_event_source IN ('teams_connector','greenhouse_api','none')),
  hubspot_marketing_event_object_id text,                -- solo si source = greenhouse_api
  status                text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT growth_event_teams_bound CHECK (status <> 'scheduled' OR teams_webinar_id IS NOT NULL)
);

-- Estado actual de cada reserva (proyección del ledger; una fila por submission).
CREATE TABLE greenhouse_growth.growth_event_registration (
  registration_id     text PRIMARY KEY,                  -- 'ger-<ulid>'
  event_id            text NOT NULL REFERENCES greenhouse_growth.growth_event(event_id),
  submission_id       text NOT NULL UNIQUE REFERENCES greenhouse_growth.form_submission(submission_id),
  lead_email_hash     text NOT NULL,
  status              text NOT NULL CHECK (status IN ('confirmed','waitlisted','cancelled','attended')),
  waitlisted_at       timestamptz,                       -- orden FIFO de la espera
  teams_state         text NOT NULL DEFAULT 'not_requested'
                      CHECK (teams_state IN ('not_requested','pending','registered','failed','orphaned')),
  teams_registration_id text,
  teams_join_url      text,                              -- PERSONAL y secreto: server-only, nunca en logs ni contratos públicos
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ger_join_url_only_when_registered CHECK (teams_join_url IS NULL OR teams_state = 'registered')
);
CREATE INDEX ger_event_status_idx ON greenhouse_growth.growth_event_registration (event_id, status, waitlisted_at);
CREATE UNIQUE INDEX ger_event_email_active_uidx ON greenhouse_growth.growth_event_registration (event_id, lead_email_hash)
  WHERE status IN ('confirmed','waitlisted','attended');

-- Ledger append-only de transiciones (trigger anti-UPDATE/anti-DELETE).
CREATE TABLE greenhouse_growth.growth_event_registration_transition (
  transition_id    text PRIMARY KEY,
  registration_id  text NOT NULL REFERENCES greenhouse_growth.growth_event_registration(registration_id),
  from_status      text,
  to_status        text NOT NULL,
  reason           text NOT NULL CHECK (reason IN ('submitted','capacity_full','self_cancel','promoted',
                                                  'operator_cancel','attendance_import','backfill')),
  occurred_at      timestamptz NOT NULL DEFAULT now(),   -- instante determinista para integraciones
  actor            text NOT NULL                         -- 'public' | 'system' | user id del operador
);
```

### 3.3 Máquina de estados de la reserva

```
(submitted) ──► confirmed ──► cancelled
     │              │  ▲
     │              ▼  │ promoted (FIFO, bajo el mismo advisory lock del formulario)
     └──────► waitlisted ──► cancelled
confirmed ──► attended   (solo por import de asistencia)
```

Transiciones permitidas en código (tabla) y en DB (trigger que valida `from→to`). `cancelled` y `attended` son
terminales. Cada transición: fila en el ledger + actualización de la proyección + evento outbox, **en la misma
transacción**.

### 3.4 Eventos outbox (catálogo)

| Evento | Cuándo | Consumidores |
|---|---|---|
| `growth.forms.submission_accepted` (existente) | Reserva aceptada | Proyección nueva que crea `growth_event_registration` + correos de espera |
| `growth.events.registration_changed` v1 | Toda transición | Inscripción en Teams (al confirmar/promover), correos, respaldo HubSpot |
| `growth.events.teams_registration_completed` v1 | Teams devolvió el enlace personal | Correo de confirmación con el enlace |

Payload sin PII: `{ schemaVersion, registrationId, eventId, toStatus, reason }`. Los consumidores **re-leen PG**.

### 3.5 Integración Teams (Graph)

- **Principal dedicado** «Greenhouse Webinars» (Entra, single-tenant), permisos de aplicación
  `VirtualEventRegistration-Anon.ReadWrite.All` (inscribir), `VirtualEvent.Read.All` (leer webinar, sesiones e
  inscripciones), `OnlineMeetingArtifact.Read.All` (asistencia, Slice 6). Secreto blob en Secret Manager
  `greenhouse-webinars-client-credentials`. Su AppId se **agrega** a `MY-APP-POLICY` (una política por usuario).
- Cliente: `src/lib/growth/events/teams/graph-client.ts` (server-only), mint de token con el patrón de
  `src/lib/integrations/teams/bot-framework/token-cache.ts`; `classify` (400/401/403/404 no reintentables; 409/429/5xx
  sí); timeout 15 s; `captureWithDomain(err,'integrations.teams',…)` sin PII.
- Inscribir: `POST /solutions/virtualEvents/webinars/{id}/registrations` con `firstName`, `lastName`, `email`,
  `preferredTimezone`, `preferredLanguage`, `externalRegistrationInformation.registrationId = registration_id`
  (idempotencia de negocio). Enlace personal: `GET …/registrations/{id}/sessions` → `joinWebUrl`.
- Idempotencia: antes de crear, buscar por correo en `GET …/webinars/{id}/registrations`; si existe, adoptarla.
- Cancelar en Teams por aplicación **solo con RSC** (`VirtualEventRegistration-Anon.ReadWrite.Chat`): **fuera de V1**. Al
  cancelar en Greenhouse, la inscripción de Teams queda `orphaned` y aparece en el reader de operación.

### 3.6 HubSpot

- **Fuente por defecto del Evento de marketing: el conector Teams↔HubSpot** (`marketing_event_source='teams_connector'`).
  Greenhouse **no** escribe el evento.
- Se mantiene el secure-submit del formulario compartido (contacto, consentimiento, `ef_event_key`).
- Respaldo `greenhouse_api` (anexo B): solo si el conector deja de funcionar, detrás de
  `GROWTH_EVENT_HUBSPOT_PARTICIPATION_ENABLED`, con los scopes `crm.objects.marketing_events.*` ya autorizados por el
  operador. **Nunca** las dos fuentes en el mismo evento (CHECK + guard en el lanzador).

## 4. Flujos

**Reserva confirmada:** submit (Vercel, transacción con lock: submission + registration + transition + outbox) →
proyección `growth_event_teams_registration` (ops-worker): `teams_state=pending` → Graph → `registered` + `join_url` +
outbox `teams_registration_completed` → proyección de correo: confirmación con enlace y `.ics`.

**Espera:** submit → registration `waitlisted` → correo de espera (sin Teams).

**Cancelación:** enlace firmado (HMAC, expira al inicio del evento) → `POST /api/public/growth/events/registrations/cancel`
→ command `cancelEventRegistration` (transacción con lock: `cancelled` + promoción FIFO del primer `waitlisted` →
`confirmed` reason `promoted`) → outbox → inscripción en Teams del promovido → correo «ya tienes cupo».

**Recordatorio:** cron existente `ops-growth-event-reminders`, solo `confirmed` con `teams_state='registered'`, con el
enlace personal.

**Asistencia (Slice 6, opcional):** al cerrar la sesión (+30 min), job lee `attendanceReports` del webinar, empareja por
correo y transiciona `confirmed → attended` (reason `attendance_import`).

## 5. Gobierno

- **Full API Parity:** commands `launchEvent`, `cancelEventRegistration`, `retryTeamsRegistration`,
  `markEventCompleted`; readers `listEventRegistrations`, `getEventOperationalState` (incluye `orphaned` y `failed`).
  Expuestos por CLI (`pnpm events:*`) y API interna; operables por Nexa vía propose→confirm→execute.
- **Capabilities:** `growth.events.manage` (lanzar/cancelar/reintentar), `growth.events.read`. Grant a `efeonce_admin`
  y `efeonce_operations` en el mismo PR (gate de cobertura).
- **Ruta pública de cancelación:** sin sesión; la autoridad es el token firmado (un solo uso por estado; idempotente).

## 6. Observabilidad y costo

Señales de confiabilidad (`src/lib/reliability/queries/growth-events-*`):

| Señal | Steady | Alerta |
|---|---|---|
| `growth.events.teams_registration_lag` | 0 | `confirmed` con `teams_state` ≠ `registered` > 15 min |
| `growth.events.teams_registration_dead_letter` | 0 | handler en dead-letter |
| `growth.events.confirmation_without_link` | 0 | correo de confirmación pendiente > 30 min |
| `growth.events.teams_orphaned_registrations` | informativo | inscripciones vivas en Teams de gente que canceló |

Costo: cero (Graph y conector HubSpot sin costo; Resend existente; M365 Business incluye webinars hasta 1.000).

## 7. Superficie

- Píldora existente (`inline_pill`) — **necesita nombre y apellido** (Teams los exige): segundo paso de la píldora tras
  el correo (task `ui-ux`). Sin nombre no se inscribe en Teams (no se derivan nombres falsos).
- Página pública mínima de cancelación (copy).
- Correos de marca: confirmación con enlace personal, espera, «ya tienes cupo», recordatorio.

## 8. Interacciones con sistemas vecinos

- **Teams:** el webinar lo crea el operador desde el Calendario; el lanzador valida por Graph que exista, esté publicado,
  pertenezca al organizador y no use aprobación manual.
- **HubSpot:** conector nativo crea y sincroniza el evento; Greenhouse sigue enviando el formulario compartido.
- **WordPress:** el lanzador publica la entrada del evento (existente).
- **TASK-1769** (agenda de entrevistas por Graph): coordinar el principal de calendario con «Greenhouse Webinars».

## 9. Métricas

Tasa de confirmación con enlace < 5 min (objetivo p95), promociones desde espera, asistencia/inscritos (HubSpot),
inscripciones `failed` = 0.

## 10. Dependencias e impacto

- **Depende de:** motor Growth Forms (TASK-1229/1230, TASK-2053), correos de evento (`event-emails.ts`, arreglo
  `2a971d768` sin release), conector Teams↔HubSpot, app Entra dedicada (operador), outbox + reactive consumer.
- **Impacta:** `src/lib/growth/forms/store.ts` (decisión de cupo pasa a escribir `growth_event_registration`),
  `event-emails.ts`, `launch-event.ts`, ops-worker `deploy.sh`, ledger de flags, catálogo de eventos.
- **Archivos a crear:** `src/lib/growth/events/**`, proyecciones en `src/lib/sync/projections/growth-event-*`, señales
  en `src/lib/reliability/queries/growth-events-*`, migración, ruta pública de cancelación.

### Modular Placement Contract

- **Current home:** `src/lib/growth/events/**` (dominio growth), proyecciones en el ops-worker, ruta pública en Next.
- **Future candidate home:** paquete de dominio growth (EPIC-027), sin deployable propio.
- **Boundary:** consumidores llaman commands/readers de `src/lib/growth/events`; nadie toca las tablas directo.
- **Server/browser split:** todo server-only salvo la píldora (renderer existente) y la página de cancelación.
- **Build impact:** sin dependencias pesadas nuevas (fetch a Graph).
- **Extraction blocker:** comparte transacción y lock con `form_submission` (mismo schema); se extrae junto con Growth Forms.

## 11. Roadmap por slices

| Slice | Contenido | Tipo |
|---|---|---|
| **0. Verificación** | App Entra dedicada (OK del operador) + AppId a `MY-APP-POLICY`; sobre un webinar del Calendario `prueba-`: **[I]** inscribir externo por Graph, **[I]** obtener `joinWebUrl`, **[I]** que el conector de HubSpot sincronice esa inscripción, **[I]** cómo silenciar los correos de Teams en plan Business, **[I]** que la inscripción no exija campos extra | spike, sin código productivo |
| 1. Esquema | 3 tablas + triggers + backfill de reservas existentes + readers | backend-data |
| 2. Inscripción en Teams | Cliente Graph, proyección, flag `GROWTH_EVENT_TEAMS_REGISTRATION_ENABLED` (ops-worker), señales | backend-data |
| 3. Correos | Confirmación espera el enlace; recordatorio con enlace personal | backend-data |
| 4. Cancelar y promover | Token firmado, ruta pública, command, promoción FIFO, correo «ya tienes cupo» | backend-data + copy |
| 5. Píldora | Nombre y apellido; página de cancelación | ui-ux |
| 6. Asistencia | Import desde `attendanceReports` (opcional; HubSpot ya la tiene) | backend-data |
| 7. Release y E2E | Un solo release con correos (`2a971d768`) y píldora (`a5b028461`); verificación con `prueba-e2e-eventos-2026-10-24` | release |

## 12. Reglas duras

- **NUNCA** crear webinars desde la app Eventos: el conector de HubSpot no los ve. **SIEMPRE** desde el Calendario.
- **NUNCA** dos fuentes de Evento de marketing para el mismo evento (`marketing_event_source` es una sola).
- **NUNCA** exponer `teams_join_url` en contratos públicos, logs, Sentry ni outbox: es un enlace personal.
- **NUNCA** inscribir en Teams a alguien en espera; solo `confirmed` (incluido `promoted`).
- **NUNCA** mutar el ledger de transiciones (append-only); el estado actual se corrige con una transición nueva.
- **NUNCA** dar permisos de webinars a la app de login ni a la del bot: principal dedicado.
- **NUNCA** derivar nombres falsos para Teams: sin nombre, no se inscribe.
- **SIEMPRE** promover desde la espera bajo el mismo advisory lock que decide el cupo.
- **SIEMPRE** que un consumidor actúe, re-leer PG; el payload outbox no es autoridad.

## 13. Documentos relacionados

`growth-public-forms-runtime-contract.md` · `GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` ·
`GREENHOUSE_EVENT_CATALOG_V1.md` · `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` · `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` ·
`docs/manual-de-uso/public-site/lanzar-evento-o-webinar.md` · RESEARCH-013 y anexos.

## 14. Patrones reutilizados

| Patrón | Fuente |
|---|---|
| Outbox + reactive consumer en ops-worker | TASK-773, lead handoff TASK-1242 |
| State machine + CHECK + audit append-only | TASK-700 / TASK-765 |
| Cupo bajo `pg_advisory_xact_lock` por formulario | `store.ts:625-641` |
| Principal dedicado least-privilege | `IDENTITY_WORKFORCE_AGENT_INVARIANTS.md:40` |
| Token cache Graph | `bot-framework/token-cache.ts` |
| Señal VIEW + helper | overlay arch-architect #4 |

## 15. Smoke tests

1. Dos reservas concurrentes con un cupo: una `confirmed`, otra `waitlisted` (PG real).
2. Reintento de la proyección de Teams con la misma reserva: una sola inscripción en Teams.
3. Cancelación de un confirmado con espera no vacía: el primero en espera pasa a `confirmed` con su correo.
4. Token de cancelación vencido o reutilizado: 4xx sin efectos.
5. Ningún contrato público ni log contiene `joinWebUrl` (test de serialización).
6. Lanzador rechaza un webinar de la app Eventos o con aprobación manual.

## 16. Preguntas abiertas

- Cómo silenciar los correos de Teams por webinar en plan Business (app o Graph con permiso delegado) — Slice 0.
- Si basta dejar `orphaned` la inscripción de Teams al cancelar, o se suma permiso delegado del organizador.
- Si la asistencia en Greenhouse (Slice 6) se necesita, dado que HubSpot ya la recibe del conector.
- Respuesta de HubSpot sobre soporte de la app Eventos (ticket #50018204746).
- Diseño final de los correos.

## 17. Puntaje de 4 pilares

### Seguridad — 4/5
- Riesgos: fuga del enlace personal; abuso de la ruta pública de cancelación; permisos amplios de Graph a nivel tenant.
- Gates: `join_url` server-only (CHECK + test de serialización); token HMAC con expiración; app Entra dedicada
  limitada al organizador vía access policy; capabilities `growth.events.*`.
- Radio de impacto: un webinar; el permiso `.All` de inscripción es tenant-wide pero acotado por la política al
  organizador. Residual: el enlace personal se puede reenviar (aceptado, igual que en Teams nativo).

### Robustez — 4/5
- Idempotencia: `externalRegistrationInformation.registrationId` + búsqueda por correo antes de crear; ledger reactivo.
- Atomicidad: submission + registration + transition + outbox en una transacción; promoción bajo el mismo lock.
- Restricciones: CHECKs de estado, índice único parcial por correo activo, trigger de transiciones válidas.
- Residual: inconsistencia temporal entre Greenhouse y Teams mientras la proyección corre (cubierta por señal).

### Resiliencia — 4/5
- Reintento: `maxRetries 3` del consumer + `retryTeamsRegistration` manual.
- Dead letter y señales `teams_registration_lag`, `dead_letter`, `confirmation_without_link`.
- Auditoría: ledger append-only. Rollback: apagar `GROWTH_EVENT_TEAMS_REGISTRATION_ENABLED` (las reservas siguen; el
  operador inscribe a mano). Residual: si el conector de HubSpot falla, existe el respaldo `greenhouse_api` documentado.

### Escalabilidad — 5/5
- Camino caliente: O(1) por reserva con lock por formulario; índices `(event_id,status,waitlisted_at)`.
- Asíncrono: todo lo externo va por outbox. Límites de Graph y HubSpot muy por encima de 1.000 inscritos por webinar.
- Costo a 10x: cero incremental.

## 18. Changelog

| Fecha | Versión | Autor | Cambio |
|---|---|---|---|
| 2026-10-26 | 1.0 | Claude (arch-architect) | Versión inicial |
