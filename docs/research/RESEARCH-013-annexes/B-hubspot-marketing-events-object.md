# Anexo B — Objeto Marketing Events de HubSpot (0-54) para las reservas de eventos de Greenhouse

> **Fecha:** 2026-10-24 · **Autor:** subagente de investigación (Claude) · **Tipo:** investigación (sin cambios de código)
> **Fuentes oficiales consultadas el 2026-10-24** (lista al final). Marcas: **[V]** = verificado en documentación oficial
> o con una lectura real contra el portal 48713323; **[I]** = inferido, a confirmar antes de implementar.

## Resumen

- **El token de Greenhouse es el token estático del project app «Efeonce Data Platform» (appId `33235280`)**, no un
  private app heredado. Tiene exactamente los 42 `requiredScopes` del manifiesto; ninguno de los `optionalScopes`, y
  `crm.objects.marketing_events.read/write` están declarados justamente como opcionales. Por eso el 403 [V].
- Habilitarlo = mover esos dos scopes a `requiredScopes` en `app-hsmeta.json`, `hs project upload` y **reinstalar la app
  con la *Reinstall URL*** (pestaña Distribution, super admin). Es una mutación externa que no pasa por el release a
  `main` [V en docs; que el token no cambie al reinstalar es I].
- La API vigente es la **date-based `2026-09`** (`/marketing/marketing-events/2026-09/...`); `v3` sigue documentada como
  legacy y conviene no nacer sobre ella [V].
- Estados de participación escribibles: **`REGISTERED`, `ATTENDED`, `CANCELLED`**; `NO_SHOW` es un estado derivado que
  sólo se lee [V]. **No existe lista de espera ni cupo** en el objeto; la participación no admite propiedades propias [V].
- Recomendación: **la lista de espera NO se registra en HubSpot como participación**; un `waitlisted` sólo entra como
  `REGISTERED` cuando Greenhouse lo confirma. La espera se refleja en una lista estática por evento asociada al evento [I].
- El registro lo hace un **consumer reactivo en el `ops-worker`**, que lee el estado de PG y lo replica en HubSpot.
  Es idempotente porque `interactionDateTime` sale de PG (HubSpot no duplica con el mismo contacto + instante) [V].
- El envío al formulario compartido **se mantiene**: crea el contacto, deja la conversión y el recibo
  `ef_greenhouse_submission_id`. El evento nativo suma el historial por evento que `ef_event_key` no puede guardar [I].
- Antes de construir, el operador debe resolver cinco decisiones (§8). Las dos que más pesan son de dónde sale la
  asistencia y si una integración nativa (Zoom o Teams) ya crea eventos propios.

## 1. Estado actual verificado en el repo y en el portal

| Hecho | Evidencia |
|---|---|
| El launcher crea en HubSpot sólo la propiedad `ef_event_key` y el formulario compartido «Reserva de eventos \| Blog Efeonce»; no crea el evento | `scripts/growth/events/launch-event.ts` §1 [V] |
| El destino mapea sólo `email→email` y `event_key→ef_event_key` más `ef_greenhouse_submission_id`; `registration_status` no viaja | `hubspotMapping()` en el mismo archivo [V] |
| El adapter usa secure-submit de Forms v3. No es idempotente; el at-most-once lo da `form_destination_attempt` | `src/lib/growth/forms/destinations/hubspot/adapter.ts` [V] |
| El token sale de `HUBSPOT_ACCESS_TOKEN` o del secret `hubspot-access-token` | `src/lib/hubspot/access-token.ts` [V] |
| Introspección del token (`POST /oauth/v2/private-apps/get/access-token-info`, sólo lectura): `appId 33235280`, `hubId 48713323`, `isUserToken false`, 42 scopes; scopes otorgados = `requiredScopes` del manifiesto (diferencia vacía en los dos sentidos) | lectura 2026-10-24 [V] |
| `GET /marketing/v3/marketing-events`, `GET /crm/v3/objects/0-54` y `GET /crm/v3/properties/0-54` responden **403** | lectura 2026-10-24 [V] |
| Manifiesto `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/src/app/app-hsmeta.json`: `auth.type: static`, `distribution: private`, `platformVersion 2025.2`; marketing events en `optionalScopes` | archivo [V] |
| Greenhouse tiene `confirmed`/`waitlisted` (`registration_status`), pero **no** tiene cancelación, promoción desde la lista de espera ni captura de asistencia | `src/lib/growth/forms/store.ts`, `event-emails.ts` [V] |

Conclusión operativa: en un project app con auth estática los scopes opcionales **no se otorgan al instalar**. Así lo
muestra la comparación; la documentación no lo dice explícitamente para auth estática y sólo lo describe para OAuth
privado, donde quien instala puede desmarcarlos [V/I].

## 2. API de Marketing Events (versión `2026-09`)

Base `/marketing/marketing-events/2026-09`. Admite token estático u OAuth [V]. El evento es un objeto CRM (`0-54`) [V].

**Crear o actualizar evento** [V]
- `POST /events`: crea. Campos requeridos: `eventName`, `externalEventId`, `externalAccountId` y `eventOrganizer`.
- `POST /events/upsert` (`inputs[]`): crea o actualiza por par de ids externos. Úsalo desde el launcher, que se
  relanza.
- `PATCH /{objectId}` y `POST /batch/update` (`inputs[]` con `objectId`): actualizan por id de HubSpot.
- `GET /{objectId}`, `GET /{externalEventId}/identifiers` (resuelve el `objectId`), `GET /` y `DELETE /{objectId}` (204).
- Campos opcionales: `eventType` (`WEBINAR`, `CONFERENCE`, `WORKSHOP`…), `startDateTime`, `endDateTime` (ISO 8601),
  `eventUrl`, `eventDescription`, `eventCancelled` y `eventCompleted` (booleanos, por defecto `false`), y
  `customProperties[]` (`name`/`value`). Las custom properties **deben existir antes** en el objeto MarketingEvent; si no,
  se descartan en silencio [V].
- Inconsistencia de la documentación: la tabla de propiedades dice `eventStartTime`/`eventEndTime`, mientras que los
  ejemplos y la referencia del upsert usan `startDateTime`/`endDateTime` [V]. Usar los del endpoint y probar contra un
  evento `prueba-…` [I].
- Cancelar es `eventCancelled: true`; la respuesta trae `eventStatus: CANCELLED`. No hay endpoint de cancelación [V].
- La respuesta incluye los contadores `registrants`, `attendees`, `cancellations` y `noShows` [V].

**`objectId` frente a ids externos** [V]
- Los endpoints por `externalAccountId`/`externalEventId` **sólo funcionan en la app que creó el evento**; otra app
  recibe 404. Los endpoints por `objectId` funcionan para cualquier app con los scopes.
- Implicación: el evento que cree el token de Greenhouse queda ligado a la app 33235280. Si se rota a otra app, sólo
  siguen sirviendo los endpoints por `objectId`. **Guardar el `objectId` en Greenhouse** y operar por él [I, recomendado].
- No hace falta un public app ni asociar un app-id aparte. El *fallback* `POST /{appId}/settings` con
  `eventDetailsURL` existe para resolver eventos desconocidos, pero la documentación recomienda crear los eventos
  explícitamente [V].

## 3. Participación (asistentes)

Estados escribibles: `REGISTERED`, `ATTENDED` y `CANCELLED`. Sólo de lectura: `NO_SHOW` («se registró y no asistió») [V].

| Endpoint (preferido: por `objectId`) | Identifica al contacto | Notas |
|---|---|---|
| `POST /{objectId}/attendance/{state}/email-create` | `email` | crea el contacto si no existe; `contactProperties` sólo se aplica a contactos **nuevos** [V] |
| `POST /{objectId}/attendance/{state}/create` | `vid` (id del contacto) | [V] |
| `POST /attendance/{externalEventId}/{state}/email-create` · `/create` | email · vid | alternativa por id externo; **sin** `joinedAt`/`leftAt`, sin evento en el timeline y sin detalle de éxito [V] |

- Cuerpo: `inputs[]` con `email` o `vid`, `interactionDateTime` (epoch en ms) y `properties.joinedAt`/`leftAt` (ISO
  8601, para `ATTENDED`) [V].
- **Idempotencia** [V]: repetir la llamada con el mismo contacto y el mismo `interactionDateTime` no duplica la
  actividad. Es la base del diseño de §7.
- Los endpoints legacy `/upsert` y `/email-upsert` de v3 tienen alternativa recomendada; no usarlos [V].
- Lecturas [V]: `GET /participations/contacts/{contactIdentifier}/breakdown` (por contacto: `attendanceState`,
  `attendancePercentage`, `attendanceDurationSeconds`, `occurredAt`); `GET /participations/{externalAccountId}/{externalEventId}`
  (contadores) y `/breakdown` (filtros `state`, que admite `NO_SHOW`, y `limit` 1–100 con `after`). Los contadores
  reflejan el estado **actual** de cada persona y pueden diferir de los totales de actividad de la UI.
- No hay tope documentado de `inputs` por llamada [V]. Usar lotes de ≤ 100, como el resto de HubSpot [I].

## 4. Lista de espera y cupo

HubSpot no tiene concepto de cupo ni de lista de espera en el evento, y **la participación no admite propiedades
propias** (la documentación sólo describe `joinedAt`, `leftAt` e `interactionDateTime`) [V]. Opciones:

| Opción | Pro | Contra |
|---|---|---|
| **A. No registrar al `waitlisted`; pasa a `REGISTERED` cuando Greenhouse lo confirme** (recomendada) | los contadores de HubSpot = lugares reales; el no-show tiene sentido | hace falta un lugar donde ver la espera (ver C) [I] |
| B. Registrar al `waitlisted` como `REGISTERED` | simple | infla registrados y no-shows; ensucia la atribución [I] |
| **C. Lista estática por evento «Lista de espera · <evento>» asociada al evento** (`PUT /associations/{marketingEventId}/lists/{listId}`), complemento de A | la espera se ve y se segmenta en HubSpot; usa `crm.lists.write`, que ya está otorgado | la documentación no explica qué hace HubSpot con una lista asociada [I] |
| D. Propiedad de contacto con las claves en espera | sin objetos extra | multivalor frágil; repite el problema de `ef_event_key` [I] |
| E. Un segundo marketing event «… (espera)» | contadores separados | duplica eventos en reportes y campañas [I] |

## 5. Asociaciones, segmentos y reportes

- **Contactos**: no se asocian a mano desde el registro del contacto. Se vinculan por los cambios de estado de la
  participación (importación, workflow o app conectada) [V, KB].
- **Segmentos**: en el constructor, pestaña Events → Marketing events, hay filtros por *Registered*, *Canceled
  registration*, *Attended* y *Attendance duration*. La KB no menciona un filtro de no-show [V].
- **Campañas**: se asocian desde la tarjeta Campaigns del evento (Marketing Hub Pro/Enterprise) o por API con
  `PUT /marketing/campaigns/2026-09/{campaignGuid}/assets/MARKETING_EVENT/{assetId}`, que exige
  `marketing.campaigns.read/write`. Esos scopes **no** están en el manifiesto. Un asset recién creado puede dar 400:
  reintentar a los minutos [V].
- **Listas**: asociación por `objectId` o por ids externos (`PUT`/`GET`/`DELETE /associations/.../lists/{listId}`) [V].
- **Reportes**: el report builder tiene las fuentes *Marketing event analytics*, *participations* y *events*
  (Pro/Enterprise); la atribución usa los toggles «Marketing event registered/attended» (Enterprise) y entra en los
  journey reports [V, KB].
- **Formularios**: la API de eventos no asocia un form submission con un evento [V, ausencia en la doc]. El vínculo
  sale de compartir contacto e instante [I]. HubSpot tiene una acción de workflow para registrar contactos en un evento
  (Pro/Enterprise) [V, KB]. **No usarla** como camino principal: deja la lógica en HubSpot, fuera de Greenhouse [I].

## 6. Scopes, cambio en la app y límites

**Scopes** [V]: `crm.objects.marketing_events.read` (leer eventos y asistencia) y `crm.objects.marketing_events.write`
(crear, cambiar y borrar). Opcionales según §8: `marketing.campaigns.read/write`.

**Procedimiento propuesto** (mutación externa: requiere autorización explícita del operador antes de correrlo):
1. En `app-hsmeta.json`, mover los dos scopes de `optionalScopes` a `requiredScopes`. **No** mezclar en el mismo cambio
   el salto de `platformVersion` de 2025.2 a 2026.09; va aparte [I].
2. `hs project upload --account=48713323` desde `services/hubspot_greenhouse_integration/hubspot-app/hubspot-bigquery/`
   (mismo carril que los webhooks; memoria `reference_hubspot_webhooks`) [V precedente].
3. Reinstalar la app con la **Reinstall URL** de la pestaña Distribution. Sin reinstalar, los scopes nuevos no rigen
   [V]. Hace falta super admin o asiento de desarrollador [V].
4. Repetir la introspección y confirmar los 44 scopes, el mismo `appId` y que `GET .../2026-09` responde 200 [V
   método]. Si el token cambió (la documentación no lo aclara) [I]: publicar el nuevo con
   `printf %s "$T" | gcloud secrets versions add hubspot-access-token --data-file=-` y verificar los consumidores
   (adapter de Forms, `launch-event`, webhooks) en todos los runtimes que lo leen (Vercel y ops-worker).
5. Riesgo bajo: los webhooks, el bridge y los formularios no se tocan. Un scope requerido de más no rompe nada [I].

**Límites** [V]: app privada: 100 solicitudes/10 s (Free/Starter) o 190/10 s (Pro/Enterprise) **por app**; el diario
(250 k / 625 k / 1 M) es **compartido por la cuenta**. Ante 429 o 5xx por volumen, retroceder; vigilar las cabeceras
`X-HubSpot-RateLimit-*`. Los errores deben quedar bajo el 5 % del volumen diario. El volumen de un evento (cientos de
reservas) es despreciable; el riesgo real son los backfills en ráfaga, que deben ir en lotes con espera [I].

## 7. Diseño propuesto para Greenhouse

Principio: **Greenhouse es el dueño del estado de la reserva**. HubSpot recibe una réplica de ese estado. Toda
capacidad nace con su contrato programático (Full API Parity): command y reader en `src/lib/growth/events/**` (o
`forms/`), y la CLI como cliente.

**7.1 Evento (launcher, `pnpm events:launch`)**
- Paso nuevo «1b», después del formulario compartido: `POST /events/upsert` con `externalAccountId =
  "efeonce-greenhouse"` (constante), `externalEventId = <slug>` (= `event_key`), `eventName`, `eventOrganizer = "Efeonce"`,
  `eventType` (WEBINAR si `modality=online`) [I], `startDateTime`/`endDateTime` (inicio + duración), `eventUrl` =
  página pública `/eventos/<slug>/` (**nunca** el `joinUrl` privado) y `eventDescription` = `excerpt`.
- Resolver el `objectId` (`GET /{slug}/identifiers`) y persistirlo **server-side** en un destino nuevo de la versión:
  `provider: 'hubspot'`, `adapterKind: 'hubspot_marketing_event_participation'`, `mapping_json: { portalId,
  marketingEventObjectId, externalAccountId, externalEventId, waitlistListId? }`. No va en `ui_policy`: es un dato
  del proveedor, y así queda en el registry de destinos, que ya es contrato gobernado [I].
- El dry-run muestra el plan; `--apply` escribe. El relanzamiento actualiza el mismo evento (upsert) y no duplica.

**7.2 Participación (asíncrona, `ops-worker`)**
- Consumer reactivo `growth_event_participation_to_hubspot`. Escucha `growth.forms.submission_accepted` y un evento
  nuevo `growth.events.registration_changed`, emitido por los commands futuros de promoción, cancelación y asistencia.
- **Reconcilia estado, no reenvía eventos**: re-lee la submission y su destino desde PG y empuja el estado vigente. El
  payload del outbox no se usa como fuente. No-op si la versión no tiene el destino o el flag está apagado.
- Mapeo:

| Estado Greenhouse | HubSpot | `interactionDateTime` |
|---|---|---|
| `confirmed` | `REGISTERED` (`email-create` por `objectId`) | instante de aceptación (o de promoción) en PG |
| `waitlisted` | nada en la participación; alta en la lista «espera» si se elige la opción C | — |
| `waitlisted → confirmed` (promoción, command nuevo) | baja de la lista + `REGISTERED` | instante de la promoción |
| `cancelled` (command nuevo: enlace «no puedo ir» del correo) | `CANCELLED` | instante de la cancelación |
| `attended` (importación de asistencia, §8) | `ATTENDED` con `joinedAt`/`leftAt` | `joinedAt` |
| evento cancelado | `PATCH {objectId}` con `eventCancelled: true` | — |
| evento terminado (job post-evento) | `eventCompleted: true`; HubSpot deriva el `NO_SHOW` [I] | — |

- **Idempotencia** en tres capas: ledger reactivo por `(submissionId, estado)`, `interactionDateTime` determinista
  desde PG (HubSpot no duplica [V]) y cero lecturas del payload.
- **Orden con el formulario**: `email-create` crea el contacto si no existe [V], así que no depende de que el
  secure-submit llegue antes. El riesgo de un contacto duplicado por creación simultánea se considera bajo, porque
  HubSpot deduplica por correo [I]. Si se quiere eliminar, el consumer puede esperar a que el intento del formulario
  esté `succeeded` y diferir con reintento [I].
- Errores: reusar `classify` del adapter (400/403/404 no reintentables; 429/5xx con retroceso) y
  `captureWithDomain('integrations.hubspot', …)`. Resultados sanitizados, sin correo en los logs.

**7.3 Convivencia con el formulario compartido.** Se mantiene sin cambios: crea o actualiza el contacto, deja la
conversión del formulario y el recibo `ef_greenhouse_submission_id`, y `ef_event_key` sirve como «último evento». El
evento nativo aporta el historial por evento, los contadores y los segmentos. Opcional, a decidir: sumar
`registration_status` al formulario como propiedad «último estado». Es redundante si el evento existe [I].

**7.4 Reconciliación y backfill.** Comando `pnpm events:hubspot-sync -- --event <slug> [--apply]`, dry-run por
defecto: crea el evento si falta y re-empuja el estado vigente de cada reserva (idempotente por §7.2), en lotes de
≤ 100 con espera. Señal de reliability `growth.events.hubspot_participation_drift`: compara las confirmadas en PG con
`registered + attended + noShows` de `GET /participations/{extAcc}/{extEvt}`. Severidad *warning* si hay diferencia
fuera de una ventana de 15 min; *steady* = 0 [I].

**7.5 Flag y despliegue.** `GROWTH_EVENT_HUBSPOT_PARTICIPATION_ENABLED`, que se lee **sólo en el `ops-worker`**: se
declara en su `deploy.sh` y en el ledger de flags del mismo PR. Orden: (1) scopes y reinstalación (§6), (2) código con
el flag apagado en un solo release a `main`, (3) evento `prueba-…` con `--skip-wordpress` y verificación por lectura
de contadores, (4) prender el flag, (5) backfill de los eventos vivos.

**7.6 Rollback.** Apagar el flag detiene las escrituras; el formulario sigue igual. Lo escrito en HubSpot queda y es
inofensivo. Borrar un evento (`DELETE /{objectId}`) requiere aprobación explícita: se pierde el historial de
participación [I].

## 8. Decisiones del operador (antes de implementar)

1. **Fuente de la asistencia (`ATTENDED`)**: ¿qué plataforma usa el `joinUrl` (Meet, Teams, Zoom)? ¿Exportación manual
   a un command de importación o integración por API? Sin esto, sólo existen `REGISTERED`/`CANCELLED`.
2. **¿Hay una integración nativa HubSpot↔Zoom/Teams/GoTo instalada o prevista?** Esas integraciones crean sus propios
   marketing events con otros ids [I]. Si se usan, se duplicaría el evento: elegir una sola fuente por evento.
3. **Lista de espera**: opción A + C (recomendada), A sola o B (§4).
4. **¿Asociar a campañas por API?** Exige agregar `marketing.campaigns.read/write` en la misma reinstalación y Marketing
   Hub Pro/Enterprise. ¿Qué tier tiene el portal? Afecta también los límites de §6 [I].
5. **Autorizar la mutación externa de §6** (upload + reinstalación por un super admin) y, si cambia el token, la
   rotación del secret.
6. Menores: `eventOrganizer` («Efeonce» o la línea de servicio), valor de `externalAccountId`, si existirán los commands
   de cancelación y promoción (también afectan correos y cupo) y si `ef_event_key` se queda como «último evento».

## Fuentes (consultadas el 2026-10-24)

- Guía Marketing Events, versión vigente `2026-09`: <https://developers.hubspot.com/docs/api-reference/latest/marketing/marketing-events/guide>
- Upsert de eventos por lote (`2026-09`): <https://developers.hubspot.com/docs/api-reference/latest/marketing/marketing-events/batch/upsert-marketing-events.md>
- Guía legacy `v3`: <https://developers.hubspot.com/docs/api-reference/legacy/marketing/marketing-events/guide>
- Cambio de estado por correo (`2026-03`): <https://developers.hubspot.com/docs/api-reference/2026-03/marketing/marketing-events/subscriber-state-changes/set-subscriber-state.md>
- Límites de uso: <https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines>
- Gestión de apps (reinstalación y rotación del token estático): <https://developers.hubspot.com/docs/apps/developer-platform/build-apps/manage-apps-in-hubspot>
- Autenticación del Developer Platform: <https://developers.hubspot.com/docs/apps/developer-platform/build-apps/authentication/overview>
- Campaigns API (asset `MARKETING_EVENT`): <https://developers.hubspot.com/docs/api-reference/latest/marketing/campaigns/guide>
- KB «Use marketing events» (segmentos, campañas, reportes y tiers): <https://knowledge.hubspot.com/integrations/use-marketing-events>
