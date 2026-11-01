# TASK-2089 — Rooms: fuentes de contenido (Radiografía AEO y CRM) vía Greenhouse

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `Diseno. ADR del carril de agentes Accepted (D5); puertos AuthorizedXraySourcePort y CrmReferenceVerifierPort existen en efeonce-rooms sin adapter; ningún código de esta task escrito.`
- Rank: `después de TASK-2084 y antes del primer cliente real que use Radiografía AEO o un deal como fuente`
- Domain: `platform|crm|content`
- Blocked by: `TASK-2084 (columnas de actor en source_imports y crm_handoffs); TASK-2086 (autoridad delegada de la persona hacia Greenhouse); TASK-2087 solo para el canal gateway`
- Branch: `efeonce-rooms: rama derivada de main, sin push a main hasta autorización; Greenhouse: develop, sin worktrees`

## Summary

Rooms ya sabe importar una edición de la Radiografía AEO y validar una referencia de HubSpot, pero sus dos puertos
(`AuthorizedXraySourcePort.readEdition` y `CrmReferenceVerifierPort.verify`) corren sin adapter y devuelven
`source_not_configured`. Esta task construye los adapters reales: Rooms lee a través de readers canónicos de
Greenhouse, nunca HubSpot directo, y cada lectura lleva la autoridad delegada de la persona para que Greenhouse
vuelva a correr `can(persona, …)`. Rooms recibe un snapshot, no una sincronización. Los flags
`ROOMS_XRAY_SOURCE_ENABLED` y `ROOMS_CRM_REFERENCE_ENABLED` quedan OFF hasta su canary.

## Why This Task Exists

El ADR del carril de agentes (D5) fija que el agente que arma una sala necesita insumos gobernados: hoy no los tiene.
`src/server/integrations/service.ts:170` crea el servicio con `createIntegrationService()` sin dependencias a
propósito («Configured source/CRM connectors need their own credential, authority and release review»), así que
`integrations.previewXrayImport` siempre informa `source_not_configured` y `integrations.linkCrm` siempre
`unavailable`. El riesgo de resolverlo mal es el confused deputy: si Rooms leyera Greenhouse con una identidad de
servicio, cualquier persona con `integrations.manage` en una sala podría leer, a través de Rooms, una Radiografía o
un deal que en Greenhouse no puede ver. Del lado de Greenhouse, `resolveXrayAuthority`
(`src/lib/aeo-xray/authz.ts:25`) rechaza hoy todo token federado (`sister_platform_oauth`) porque «OAuth federation
has no delegated X-Ray contract yet»: falta el contrato delegado, no solo el adapter.

## Goal

- Rooms importa una edición real de la Radiografía AEO y valida una referencia de deal/company con la autoridad
  exacta de la persona en cuyo nombre actúa (persona o su agente), verificada por Greenhouse en cada lectura.
- Greenhouse expone dos contratos gobernados (lectura de snapshot de edición X-ray y verificación de referencia CRM)
  que aceptan solo autoridad delegada con `act`, nunca una identidad de servicio.
- Ninguna sincronización: un snapshot por lectura, con hash y vencimiento de autoridad; una caída de Greenhouse no
  bloquea leer ni publicar una edición ya autorizada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (D1, D3, D5 y reglas duras)
- `docs/architecture/rooms/EFEONCE_ROOMS_SOURCE_IMPORT_AND_CRM_HANDOFF_DECISION_V1.md` (mapping `rooms.xray-native.v1`, referencia mínima HubSpot, handoff)
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (D10: toda clase delegada nueva exige autorización nueva)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lane `api/platform/app/*`)
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (HubSpot se lee desde Greenhouse, no directo)

Reglas obligatorias:

- **NUNCA** leer Greenhouse con una identidad de servicio en nombre de una persona o de su agente (confused deputy).
- **NUNCA** llamar a HubSpot desde Rooms; Greenhouse es el dueño del binding comercial.
- **NUNCA** aceptar URLs, bearers ni JSON exportados desde el navegador o el agente como prueba de autoridad
  (comentario de `src/server/integrations/ports.ts`).
- Snapshot, no sync: Rooms nunca consulta Greenhouse al abrir una sala ni reconcilia en segundo plano.
- `rooms.source_imports` guarda metadata del mapping (IDs, revisión, hash, exclusiones, actor), nunca el payload.
- La referencia CRM no transporta URLs, correos, importes, fases ni propiedades externas.

## Normative Docs

- `.claude/skills/efeonce-rooms/SKILL.md` y `.claude/skills/efeonce-rooms/references/program-ledger.md`
- `docs/documentation/rooms/backend-api-for-claude-design.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- `TASK-2084` (`docs/tasks/in-progress/TASK-2084-rooms-agent-attribution-reversal-quotas.md`): columnas `actor_kind`,
  `agent_client_id` y `channel` en `rooms.source_imports` y `rooms.crm_handoffs`, más la clasificación D2 de
  `integrations.*`.
- `TASK-2086` (`docs/tasks/to-do/TASK-2086-efeonce-id-interactive-agent-delegation-second-resource.md`): canje RFC 8693
  en Efeonce ID. Esta task necesita que el canje entregue un token con audiencia Greenhouse, `sub` = persona y
  `act` = Rooms (+ agente). Si TASK-2086 solo cubre la audiencia Rooms, el tramo Rooms → Greenhouse queda como
  follow-up de EPIC-044 [verificar alcance de TASK-2086].
- `TASK-2087` (verificador del bearer en Rooms): solo para el canal `gateway`.
- Greenhouse existente: `src/lib/aeo-xray/authz.ts` (`resolveXrayAuthority`), `src/lib/aeo-xray/types.ts`
  (`XraySharedResponse`), `src/lib/aeo-xray/store.ts`, `src/lib/commercial/deals-store.ts`
  (`getCommercialDealByHubSpotId`), `src/lib/api-platform/core/app-auth.ts` (`authSource: 'sister_platform_oauth'`).

### Blocks / Impacts

- `TASK-2091`: la skill de oficio usa Radiografía y deal como insumo cuando existen; sin esta task trabaja con el
  brief.
- `TASK-2088`: el provider `rooms` de `efeonce-mcp` expone `integrations.*` con la clase que fije TASK-2084.
- Greenhouse Radiografía AEO: gana un consumidor delegado; el contrato humano existente no cambia.

### Files owned

- `../efeonce-rooms/src/server/integrations/greenhouse-xray-source.ts` (nuevo)
- `../efeonce-rooms/src/server/integrations/greenhouse-crm-verifier.ts` (nuevo)
- `../efeonce-rooms/src/server/integrations/greenhouse-client.ts` (nuevo: transporte con token delegado)
- `../efeonce-rooms/src/server/integrations/service.ts` (wiring condicionado por flag en la línea del `runtimeIntegrationService`)
- `src/lib/aeo-xray/delegated-snapshot-reader.ts` (nuevo)
- `src/lib/commercial/crm-reference-verifier.ts` (nuevo)
- `src/app/api/platform/app/growth/aeo-xray/editions/[editionId]/snapshot/route.ts` (nuevo) [verificar nombre]
- `src/app/api/platform/app/commercial/crm-references/verify/route.ts` (nuevo) [verificar nombre]
- `src/lib/aeo-xray/authz.ts` (rama delegada explícita; la rama humana no cambia)

## Current Repo State

### Already exists

- `efeonce-rooms/src/server/integrations/ports.ts`: `AuthorizedXraySourcePort.readEdition` y
  `CrmReferenceVerifierPort.verify`, con el resultado `ok | not_found | unavailable`.
- `efeonce-rooms/src/server/integrations/service.ts`: `createIntegrationService({ xraySource?, crmReferenceVerifier? })`;
  autoriza `integrations.manage` + `content.edit` + `evidence.read` en el borrador, no deja transacción SQL abierta
  durante la lectura externa y comprueba que `organizationId`, `actorId` y `sourceEditionId` devueltos coincidan.
- `efeonce-rooms/src/server/integrations/xray-mapper.ts`: mapping `rooms.xray-native.v1`.
- `efeonce-rooms/scripts/backend-recovery.ts:134`: puertos fake explícitos solo para pruebas.
- Operaciones `integrations.importXray`, `integrations.linkCrm`, `integrations.requestHandoff`, `integrations.get`
  e `integrations.previewXrayImport` (`src/domain/integration-contracts.ts`).
- Greenhouse: rutas app de Radiografía (`src/app/api/platform/app/growth/aeo-xray/**`), autoridad
  `growth.xray.case.read` en `resolveXrayAuthority`, y `greenhouse_commercial.deals` con `hubspot_deal_id`.

### Gap

- Ningún adapter real; los dos flags no existen en el código de Rooms.
- Greenhouse no tiene contrato delegado para X-ray: `resolveXrayAuthority` rechaza `sister_platform_oauth`.
- Greenhouse no tiene un verificador de referencia CRM de solo lectura con la forma del puerto de Rooms.
- No existe la clase delegada (D10) que autorice a Rooms a leer estos dos contratos en nombre de una persona.
- No hay señales de rechazo o indisponibilidad de fuentes.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-rooms` (`src/server/integrations/**`, Vercel) + Greenhouse (`src/lib/aeo-xray/**`, `src/lib/commercial/**`, rutas `api/platform/app/*`)
- Future candidate home: `api`
- Boundary: dos contratos de solo lectura de Greenhouse (snapshot de edición X-ray, verificación de referencia CRM) consumidos solo por los adapters de los puertos de Rooms; la UI de Greenhouse sigue en sus readers humanos
- Server/browser split: server-only en ambos repos; el token delegado y la respuesta de Greenhouse nunca llegan al navegador ni al contexto del modelo
- Build impact: ninguno; sin SDK nuevo (fetch del runtime) y sin inputs de filesystem
- Extraction blocker: depende del canje de Efeonce ID (TASK-2086) y de la clase delegada D10; no comparte transacción entre repos

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (autoridad cruzada entre sistemas y datos comerciales de prospectos)
- Impacto principal: `integration`
- Source of truth afectado: Greenhouse (ediciones de Radiografía AEO en el store de `src/lib/aeo-xray/store.ts`; `greenhouse_commercial.deals` y organizaciones con su id HubSpot); Rooms solo guarda `rooms.source_imports` y `rooms.crm_links`/`rooms.crm_handoffs` [verificar nombres de tabla]
- Consumidores afectados: `integrations.previewXrayImport`, `integrations.importXray`, `integrations.linkCrm` por API, SDK, CLI, MCP stdio y, con TASK-2088, el gateway
- Runtime target: local y staging en esta task; producción con autorización aparte

### Contract surface

- Contrato existente a respetar: puertos de `ports.ts`, mapping `rooms.xray-native.v1`, `XraySharedResponse`
  (`modelVersion 1.0`, contract `efeonce.aeo-xray` 0.1.0/0.2.0), referencia mínima HubSpot del ADR de importación,
  `resolveXrayAuthority` para humanos.
- Contrato nuevo:
  - Greenhouse `GET /api/platform/app/growth/aeo-xray/editions/{editionId}/snapshot` [verificar nombre]:
    `{ editionId, revision, contentHash, dataOrigin, authorizationExpiresAt, snapshot: XraySharedResponse }` o
    `not_found` / `unavailable`.
  - Greenhouse `POST /api/platform/app/commercial/crm-references/verify` [verificar nombre]: recibe
    `{ provider: 'hubspot', portalId, objectType: 'deal'|'company', objectId }` y responde
    `{ status: 'ok', authorizationExpiresAt }` o `not_found`; nunca devuelve correos, importes, fase ni dueño.
  - Rooms: adapters que implementan los dos puertos y el cliente de transporte con token delegado.
- Backward compatibility: `gated` (flags OFF; sin flag, el comportamiento actual `source_not_configured` no cambia).
- Full API parity: la capability humana de Greenhouse ya tiene contrato (rutas app de X-ray); esta task agrega el
  consumidor delegado sobre los mismos readers, sin lógica paralela. En Rooms, API/SDK/CLI/MCP ya comparten
  `integrations.*`.

### Data model and invariants

- Entidades/tablas/views afectadas: lectura en Greenhouse (store de X-ray, `greenhouse_commercial.deals`,
  `greenhouse_core.organizations`); escritura solo en Rooms (`rooms.source_imports`, links CRM y handoffs, ya existentes).
- Invariantes que no se pueden romper:
  - Cada lectura vuelve a correr `can(persona, …)` en Greenhouse con el registro de acceso vigente de la persona
    (mismo patrón que `resolveXrayAuthority`: `getTenantAccessRecordFromPostgresByUserId`), no con lo que trae el token.
  - Rooms solo acepta el resultado si `actorId` coincide con el principal que pidió y `organizationId` con la
    organización de Rooms (chequeo existente en `service.ts`).
  - Un token sin `act` o con `sub` de una persona externa o invitada se rechaza en Greenhouse.
  - El snapshot se re-lee y se re-autoriza al aplicar; un hash distinto invalida la revisión (contrato vigente).
  - Ninguna respuesta de Greenhouse contiene correos, importes, fases ni propiedades HubSpot hacia Rooms.
- Write-target allowlist: N/A en Greenhouse (solo lectura; ninguna tabla nueva). En Rooms no se agregan tablas.
- Tenant/space boundary: Greenhouse deriva la organización dueña del registro de acceso vigente de la persona, nunca
  del payload («The prospect in a case is not the owning organization»); Rooms deriva su organización de la sesión.
- Idempotency/concurrency: lecturas idempotentes; la escritura en Rooms usa el executor canónico con
  `idempotencyKey` y `expectedRevision`. No hay transacción SQL abierta durante la llamada a Greenhouse.
- Audit/outbox/history: `rooms.source_imports` registra actor y canal (TASK-2084); Greenhouse registra la lectura
  delegada con `oauthClientId` y `act` en su auditoría de API Platform [verificar dónde se audita hoy el lane app].

### Migration, backfill and rollout

- Migration posture: `none` en ambos repos (las columnas de actor llegan con TASK-2084).
- Default state: `flag OFF` (`ROOMS_XRAY_SOURCE_ENABLED=false`, `ROOMS_CRM_REFERENCE_ENABLED=false`); la clase
  delegada no existe en Efeonce ID hasta su autorización D10.
- Backfill plan: N/A — sin datos previos que migrar.
- Rollback path: flag OFF en Rooms + redeploy + reasignar el alias manual; revocar la clase delegada en Efeonce ID.
- External coordination: autorización D10 de la clase delegada; registro de Greenhouse como audiencia del canje
  para Rooms en Efeonce ID; variables de Rooms en Vercel (`efeonce-rooms`, scope `efeonce-7670142f`).

### Security and access

- Auth/access gate: Greenhouse acepta solo `authSource: 'sister_platform_oauth'` con la clase delegada nueva y `act`
  que nombra a Rooms; vuelve a correr `can(persona, 'growth.xray.case.read', 'read', 'tenant')` para X-ray y la
  capability de lectura comercial del deal o company [verificar nombre de capability]. Rooms exige
  `integrations.manage` + `content.edit` + `evidence.read` sobre el borrador (vigente).
- Sensitive data posture: datos comerciales de prospectos; el snapshot no pasa al contexto del modelo más allá de
  la vista previa de mapping que ya define el ADR de importación; sin PII en logs, audit ni outbox.
- Error contract: Greenhouse `ApiPlatformError` con `forbidden`/`not_found`/`unavailable`; Rooms traduce a
  `RoomsError('not_found' | 'unavailable')` sin filtrar la causa; `captureWithDomain` en Greenhouse.
- Abuse/rate-limit posture: cuotas por persona de TASK-2084; timeout corto y sin reintento automático desde Rooms;
  la indisponibilidad responde `unavailable` y no bloquea publicar.

### Runtime evidence

- Local checks: pruebas de los adapters con Greenhouse simulado (ok, not_found, unavailable, `actorId` distinto,
  organización distinta, token sin `act`); pruebas de las dos rutas Greenhouse con token delegado y con token humano.
- DB/runtime checks: lectura real contra PG de Greenhouse vía proxy de los dos readers nuevos.
- Integration checks: canary de staging con una edición real de la Radiografía y un deal real, por canal `cli` y,
  con TASK-2087/2088, por canal `gateway`.
- Reliability signals/logs: `rooms.sources.read_denied` y `rooms.sources.unavailable` [propuestos] en Rooms;
  rechazos delegados en Greenhouse vía `captureWithDomain`.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: N/A, la task no crea tablas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Decisión sobre un diseño interino

Se evaluó un camino interino solo interno mientras TASK-2086 no existe. Se descarta, por tres razones:

1. Rooms llamando a Greenhouse con su identidad de workload y una afirmación propia del `sub` de la persona es el
   confused deputy que prohíbe la regla dura del ADR («NUNCA leer Greenhouse con una identidad de servicio»).
2. Que la persona exporte el JSON de Greenhouse y lo suba a Rooms tampoco prueba autoridad: el contrato del puerto
   lo descarta de forma explícita.
3. Un token de Efeonce ID con audiencia Rooms no sirve para Greenhouse sin canje (`aud` exacto).

Por eso la task queda bloqueada para el canary. Sí puede avanzar antes de TASK-2086: los slices 1 y 2 (contratos de
Greenhouse probados con tokens de prueba y adapters de Rooms con un canje simulado), todos detrás de flags OFF.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contratos delegados en Greenhouse

- Reader `src/lib/aeo-xray/delegated-snapshot-reader.ts`: resuelve la edición emitida, re-autoriza a la persona y
  devuelve snapshot + revisión + hash + vencimiento de autoridad; reutiliza el store de X-ray, sin consulta paralela.
- Verificador `src/lib/commercial/crm-reference-verifier.ts`: resuelve deal o company por id HubSpot desde los readers
  de Greenhouse (`getCommercialDealByHubSpotId` y el reader de organizaciones) y responde ok/not_found.
- Rama delegada explícita en la autorización: acepta `sister_platform_oauth` solo con la clase nueva y `act` de
  Rooms; la rama humana de `resolveXrayAuthority` no cambia.
- Dos rutas en `api/platform/app/*` con errores canónicos y pruebas de token humano, delegado y sin `act`.

### Slice 2 — Adapters de Rooms detrás de flags

- `greenhouse-client.ts`: obtiene el token delegado de la persona (canje de TASK-2086, simulado en pruebas), llama con
  timeout y sin reintento, y nunca guarda el token ni la respuesta en logs.
- `greenhouse-xray-source.ts` y `greenhouse-crm-verifier.ts` implementan los puertos.
- `service.ts`: el servicio de runtime recibe los adapters solo si su flag está en `true`; con flag OFF, el resultado
  sigue siendo `source_not_configured` / `unavailable`.
- Señales `rooms.sources.read_denied` y `rooms.sources.unavailable`.

### Slice 3 — Atribución e integración con el carril de agentes

- `source_imports` y links CRM registran `actor_kind`, `agent_client_id` y `channel` con las columnas de TASK-2084.
- La lectura delegada usa el principal del canal (`cli`, `browser` o `gateway`); si un canal no puede presentar
  autoridad delegada de la persona, la operación responde `unavailable` con motivo, nunca degrada a otra identidad.

### Slice 4 — Canary y documentación

- Canary de staging con una edición real y un deal real; luego producción con autorización aparte.
- Manual de operación de fuentes en `docs/manual-de-uso/rooms/` y ledger de la skill `efeonce-rooms`.

## Out of Scope

- Escribir en HubSpot o en Greenhouse desde Rooms (writer outbound del handoff sigue `not_configured`).
- Sincronización, webhooks o refresco en segundo plano de una fuente.
- Mapping de medios, tablas o experiencia especializada de la Radiografía (siguen excluidos con motivo).
- Leer contactos o correos del deal (el eval de TASK-2091 usa los correos declarados en el brief).
- El canje de Efeonce ID (TASK-2086) y el verificador del bearer (TASK-2087).
- UI nueva.

## Detailed Spec

Flujo de una lectura (X-ray; CRM es análogo):

1. Rooms recibe `integrations.previewXrayImport` de una persona o de su agente y autoriza en su base (vigente).
2. Sin transacción abierta, el adapter pide a Efeonce ID un token para la audiencia Greenhouse con `sub` = persona y
   `act` = Rooms (+ agente cuando aplica), TTL ≤ 5 min.
3. Greenhouse valida firma, `iss`, `aud`, `exp` y la clase delegada; resuelve el registro de acceso vigente de la
   persona; corre `can(persona, …)`; lee el snapshot con el store canónico; responde.
4. Rooms compara `actorId`, `organizationId` y `sourceEditionId`, mapea con `rooms.xray-native.v1` y presenta la vista
   previa; al aplicar, re-lee y compara el hash (contrato vigente).

Canal sin autoridad delegada disponible: respuesta `unavailable` con motivo `delegation_unavailable` [propuesto].
Si el login first-party de Rooms no retiene un token de la persona, el canal `browser`/`cli` no puede leer fuentes en
V1 y solo opera el canal `gateway` [verificar qué guarda Rooms de la sesión de Efeonce ID].

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-2084 cerrada antes del slice 3; TASK-2086 cerrada (con audiencia Greenhouse) antes del slice 4.
- Slice 1 (Greenhouse) antes que slice 2 (Rooms): el adapter no se escribe contra un contrato inexistente.
- Slice 4 en producción solo con autorización D10 firmada y los dos canaries de staging en verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Confused deputy: Rooms lee con una autoridad que la persona no tiene | identity | medium sin esta task, low con ella | Solo token delegado con `act`; Greenhouse re-corre `can(persona, …)` con el registro vigente; sin identidad de servicio | rechazos `forbidden` en Greenhouse; `rooms.sources.read_denied` |
| Un agente lee datos de un prospecto ajeno a la sala | identity | low | Doble autorización (Rooms en la sala + Greenhouse en la fuente); cuotas de TASK-2084 | `rooms.sources.read_denied` |
| Revocación tardía de la persona | identity | low | TTL ≤ 5 min del token delegado; Greenhouse lee el acceso vigente en cada lectura | auditoría de lectura delegada |
| Fuga de datos comerciales (correos, importes) a Rooms o al modelo | integration | low | Contrato CRM solo ok/not_found; snapshot sin campos HubSpot; prueba de forma de respuesta | test de contrato |
| Greenhouse caído bloquea a Rooms | integration | medium | Timeout corto, `unavailable` explícito, lectura/publicación de ediciones no depende de la fuente | `rooms.sources.unavailable` |
| Snapshot obsoleto aplicado | integration | low | Re-lectura y hash al aplicar (vigente) | conflicto de hash en el receipt |
| Alguien agrega una llamada directa a HubSpot desde Rooms | integration | low | Regla dura del ADR; revisión de código; el adapter solo conoce el host de Greenhouse | revisión de dependencias |
| Flag prendido en Vercel sin reasignar el alias manual | release | medium | Paso explícito en la secuencia; readback del deploy servido | `/api/auth/session` + readback de flags |

### Feature flags / cutover

- `ROOMS_XRAY_SOURCE_ENABLED` y `ROOMS_CRM_REFERENCE_ENABLED` (Rooms, default `false`): sin flag, el servicio recibe
  puertos ausentes. Revert: flag a `false` + redeploy + alias; menos de 10 min.
- La clase delegada en Efeonce ID es el segundo interruptor: revocarla corta la lectura en Greenhouse antes de 5 min.
- Sin flag en Greenhouse: la ruta no sirve a nadie mientras la clase delegada no exista.
- Registrar los dos flags en el ledger de la skill `efeonce-rooms` [verificar si `FEATURE_FLAG_STATE_LEDGER.md` cubre repos hermanos].

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir PR en Greenhouse; las rutas no tienen consumidores sin la clase delegada | minutos | sí |
| Slice 2 | Flags OFF + redeploy de Rooms + reasignar alias | < 10 min | sí |
| Slice 3 | Revertir commit; las columnas de actor pertenecen a TASK-2084 y quedan | minutos | sí |
| Slice 4 | Flags OFF y revocar la clase delegada; los `source_imports` creados quedan como historia válida | < 10 min | sí |

### Production verification sequence

1. Staging Greenhouse: ruta con token humano → 403; con token delegado sin `act` → 403; con token delegado válido de
   una persona sin `growth.xray.case.read` → 403; con persona autorizada → snapshot.
2. Staging Rooms con flags ON: vista previa de una edición real por canal `cli`; `actorId` y organización coinciden.
3. Aplicar la importación a un borrador de una sala sintética; `rooms.source_imports` registra actor y canal.
4. `integrations.linkCrm` con un deal real → ok; con un deal de otra organización → `not_found`.
5. Revocar la clase delegada en staging y comprobar `unavailable` antes de 5 min.
6. Producción con autorización: repetir 2–4 sobre una sala interna; reasignar el alias tras el deploy; observar
   señales 7 días antes de usarlo con un cliente real.

### Out-of-band coordination required

- Autorización del operador para la clase delegada nueva (D10 de autoridad interna nativa).
- Efeonce ID: Greenhouse como audiencia del canje originado en Rooms (TASK-2086 o follow-up de EPIC-044).
- Vercel `efeonce-rooms`: flags y reasignación manual del alias `efeonce-rooms.vercel.app`.
- Commercial: confirmar qué deals y ediciones pueden usarse en el canary.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Con los dos flags OFF, `integrations.previewXrayImport` responde `source_not_configured` y `integrations.linkCrm` responde `unavailable`, igual que hoy (test).
- [ ] Ninguna línea de `efeonce-rooms` llama a un host de HubSpot (búsqueda en el diff y test del cliente con host fijo de Greenhouse).
- [ ] Las rutas de Greenhouse rechazan token humano, token delegado sin `act` y token delegado de una persona sin la capability (tres tests con 403).
- [ ] El reader delegado de X-ray re-lee el registro de acceso vigente de la persona en cada llamada (test que cambia el acceso entre dos lecturas).
- [ ] La respuesta del verificador CRM no contiene correos, importes, fase ni dueño (test de forma).
- [ ] Rooms descarta un resultado cuyo `actorId` u `organizationId` no coincide (test existente sigue verde con el adapter real).
- [ ] `rooms.source_imports` y los links CRM creados por esta vía registran `actor_kind`, `agent_client_id` y `channel`.
- [ ] Un canal sin autoridad delegada responde `unavailable` con motivo y no usa otra identidad (test).
- [ ] Canary de staging con edición y deal reales en verde y registrado en `docs/audits/rooms/`.
- [ ] Revocar la clase delegada corta la lectura en menos de 5 minutos (evidencia de staging).

## Verification

- `efeonce-rooms`: `LC_ALL=en_US.UTF-8 pnpm verify`
- Greenhouse: `pnpm lint`, `pnpm typecheck`, tests focales de `src/lib/aeo-xray` y `src/lib/commercial`
- Lectura real de los dos readers contra PG vía `pnpm pg:connect`
- `pnpm task:lint --task TASK-2089`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `references/program-ledger.md` de la skill `efeonce-rooms` actualizado (flags, canary, recibo) y espejo `.codex` sincronizado.
- [ ] ADR de importación de fuentes con un delta que diga que los puertos tienen adapter real.

## Follow-ups

- Si TASK-2086 no cubre la audiencia Greenhouse: task de EPIC-044 para el canje Rooms → Greenhouse.
- Lectura de contactos del deal para invitar, si Commercial la aprueba (hoy fuera del contrato CRM).
- Writer outbound del handoff (sigue `not_configured`).

## Open Questions

- ¿El canje de TASK-2086 entrega audiencia Greenhouse o solo Rooms?
- ¿Rooms conserva algún token de la persona tras el login first-party, o las fuentes quedan solo para el canal gateway en V1?
- Nombre exacto de la capability comercial que autoriza leer un deal o una company por persona.
