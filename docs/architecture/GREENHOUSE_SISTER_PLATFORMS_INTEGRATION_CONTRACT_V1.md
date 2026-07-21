# Greenhouse Sister Platforms Integration Contract V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0 (deltas 2026-05-15 §9.5, 2026-05-28 §15, 2026-07-21 §15.5)
> **Creado:** 2026-04-11
> **Ultima actualizacion:** 2026-07-21 — TASK-1507 agrega clausula §15.5 administracion del redirect allowlist
> **Scope:** Greenhouse y plataformas hermanas del ecosistema Efeonce
> **Docs relacionados:** `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_REPO_ECOSYSTEM_V1.md`, `GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`, `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`, `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`, `TASK-265`, `TASK-039`

---

## Estado de implementación actual

Desde `TASK-375` y `TASK-376`, este contrato ya tiene una primera bajada runtime en Greenhouse:

- tabla `greenhouse_core.sister_platform_bindings`
- tabla `greenhouse_core.sister_platform_consumers`
- tabla `greenhouse_core.sister_platform_request_logs`
- secuencia `greenhouse_core.seq_sister_platform_binding_public_id`
- secuencia `greenhouse_core.seq_sister_platform_consumer_public_id`
- helper reusable `src/lib/sister-platforms/bindings.ts`
- helper reusable `src/lib/sister-platforms/external-auth.ts`
- rutas admin `/api/admin/integrations/sister-platform-bindings*`
- rutas read-only `/api/integrations/v1/sister-platforms/*`
- visibilidad mínima en `/admin/integrations`

La foundation implementada cubre:

- scopes `organization`, `client`, `space` e `internal`
- lifecycle `draft`, `active`, `suspended`, `deprecated`
- resolución explícita `external scope -> greenhouse scope`
- auth explícita por consumer para el carril sister-platform read-only
- request logging y rate limiting para el carril sister-platform read-only
- publicación de eventos outbox para consumers posteriores

---

## 1. Objetivo

Formalizar el contrato canónico con el que `greenhouse-eo` debe integrarse con plataformas hermanas del ecosistema Efeonce.

Este documento existe para evitar tres errores recurrentes:

- tratar una app hermana como si fuera un modulo interno de Greenhouse
- asumir que dos plataformas del mismo ecosistema deben compartir runtime, base de datos o secretos
- mezclar branding institucional reusable con UX, navegacion o ownership funcional de producto

La regla central es esta:

> Las plataformas hermanas de Greenhouse se integran como **peer systems** del mismo ecosistema, no como features embebidas por defecto.

---

## 2. Alcance

Aplica a:

- plataformas hermanas ya activas, por ejemplo `Kortex`
- plataformas futuras del mismo ecosistema, por ejemplo `Verk`
- cualquier app o control plane que necesite:
  - consumir contexto operativo de Greenhouse
  - compartir identidad institucional
  - intercambiar señales analiticas, eventos o enlaces profundos

No aplica a:

- integraciones third-party externas como `Notion`, `HubSpot`, `Frame.io` o `Nubox`
- packages internos compartidos de bajo nivel sin surface de producto propia
- shells demo o upstreams de framework como Vuexy

---

## 3. Definiciones

### 3.1 Sister platform

Plataforma del ecosistema Efeonce con:

- repo propio
- roadmap propio
- runtime y despliegue propios o aspiracion explicita a tenerlos
- ownership funcional propio

### 3.2 Peer system

Relacion entre dos plataformas que:

- no comparten runtime por defecto
- no comparten base de datos por defecto
- no comparten secretos por defecto
- se integran mediante contratos explicitos

### 3.3 Institutional layer

Capa compartible entre plataformas del ecosistema:

- preset visual institucional
- copy shared institucional
- iconografia institucional
- patrones shell compatibles

No incluye:

- navegacion Greenhouse
- nomenclatura de producto Greenhouse
- modulos funcionales del portal

### 3.4 Operational intelligence provider

Plataforma que expone señales operativas o analiticas para que otra plataforma las consuma sin apropiarse de su ownership funcional.

En el contexto actual:

- Greenhouse puede actuar como provider de contexto operativo cliente-facing o internal-facing
- una sister platform puede consumir ese contexto para enriquecer decisiones, recomendaciones o analisis

### 3.5 Action boundary

Limite explicito entre:

- leer contexto de otra plataforma
- sugerir una accion basada en ese contexto
- ejecutar una mutacion real en la otra plataforma

La lectura puede ser cross-platform; la mutacion no.

---

## 4. Principios rectores

### 4.1 Peer-by-default

Greenhouse y cualquier sister platform del ecosistema deben tratarse como sistemas pares.

### 4.2 Runtime isolation first

La decision por defecto es separar:

- Cloud Run / Vercel / workers
- Cloud SQL / PostgreSQL
- Secret Manager
- service accounts
- observabilidad y alertas

### 4.3 Shared institutional layer, not shared product

Es valido compartir:

- look and feel institucional
- copy reusable
- conventions de shell

No es valido compartir por defecto:

- rutas
- layouts de producto
- logica de negocio
- taxonomias funcionales

### 4.4 Read before write

La primera integracion entre plataformas debe privilegiar:

- lectura
- contexto
- enrichment
- recomendaciones

Las mutaciones cross-platform requieren API explicita, ownership claro y reglas de aprobacion.

### 4.5 Explicit tenancy or nothing

Ninguna sister platform debe inferir tenancy o scope desde labels, nombres comerciales o heuristicas de UI.

Todo acceso cross-platform debe apoyarse en IDs estables y bindings explicitos.

### 4.6 Tenant safety is a hard rule

No cross-contamination entre tenants, clientes, organizaciones, spaces ni portales externos.

### 4.7 Versioned contracts

Todo contrato de integracion entre plataformas debe poder versionarse y evolucionar sin romper consumers de forma silenciosa.

---

## 5. Boundary model

### 5.1 Permitido por defecto

| Carril | Permitido | Nota |
| --- | --- | --- |
| Read API | Si | Server-to-server, tenant-safe |
| MCP read-only | Si | Para agentes y copilots |
| Deep links | Si | Con ownership visual local de cada app |
| BigQuery cross-project reads | Si | Solo cuando agregue valor real y con IAM minimo |
| Event bridge / PubSub | Si | Cuando haga falta asincronia o fan-out |
| Visual preset compartido | Si | Institucional, no product-specific |
| Shared copy institucional | Si | No product-specific |

### 5.2 No permitido por defecto

| Patron | Estado | Razon |
| --- | --- | --- |
| Compartir Cloud SQL | No | Acopla runtime, secretos y operacion |
| Reusar users runtime de otra app | No | Rompe boundaries de IAM y ownership |
| Compartir secretos en un namespace indistinto | No | Riesgo operativo y de compliance |
| Copiar componentes de producto cross-repo | No | Duplica UX y deriva en drift |
| Embeder rutas Greenhouse dentro de otra plataforma | No | Mezcla ownership de producto |
| Mutar Greenhouse desde una sister platform sin API explicita | No | Rompe action boundary |

### 5.3 Excepciones

Una excepcion solo es valida si:

- existe decision arquitectonica explicita
- el ownership funcional sigue claro
- la excepcion queda documentada en el anexo de la plataforma concreta

---

## 6. Ownership model

### 6.1 Greenhouse

Greenhouse mantiene ownership canico sobre:

- portal UX Greenhouse
- auth y route groups del portal
- Agency, Finance, HR, People, Admin y client portal
- serving operativo del cliente
- assigned team, delivery, capacity y health signals del portal
- contratos API y readers propios del portal

### 6.2 Sister platform

Cada sister platform mantiene ownership canico sobre:

- sus rutas
- su shell de producto
- su runtime de agentes o control plane
- su storage transaccional
- su modelo operativo y lifecycle propio
- su integracion externa primaria

### 6.3 Shared institutional layer

Su ownership vive en contratos documentales, no en un repo implicitamente dominante.

En el estado actual:

- Greenhouse ya formalizo el preset visual reusable hacia Kortex
- la capa verbal reusable queda explicitamente derivada a `TASK-265`

### 6.4 Source-of-truth rule

Si una capability tiene owner en una sister platform:

- Greenhouse no debe recrear una truth layer paralela

Si una señal operativa tiene owner en Greenhouse:

- la sister platform la consume como provider externo
- no la redefine como truth layer local salvo materializacion analitica derivada

---

## 7. Integration surfaces canonicas

### 7.1 Institutional surface

Uso:

- visual preset
- copy shared
- iconografia institucional
- patrones shell compatibles

Mutabilidad:

- documental o packageada, pero nunca implicita

Auth:

- no aplica como runtime auth

### 7.2 Read API surface

Uso:

- lecturas servidor-a-servidor
- operational drilldowns
- scoped reads para control planes externos

Regla:

- endpoint explicito
- auth explicita
- tenancy explicita
- response shape estable

### 7.3 MCP / agent surface

Uso:

- agentes LLM
- copilots
- workflows de inteligencia

Regla:

- read-only por defecto
- no reemplaza la REST/API surface
- se monta sobre una read surface estable

### 7.4 Event / async surface

Uso:

- outbox
- Pub/Sub
- webhooks
- reconciliacion y materializacion asincrona

Regla:

- no usarlo como sustituto de un contrato de lectura

### 7.5 Analytical surface

Uso:

- BigQuery cross-project
- marts compartidos
- joins historicos
- benchmarks inter-plataforma

Regla:

- analytic convenience no equivale a source of truth transaccional

### 7.6 Deep link surface

Uso:

- navegacion entre plataformas
- handoff humano desde una app a otra

Regla:

- la plataforma destino mantiene ownership total de la experiencia que se abre

---

## 8. Identity and tenancy bridge contract

### 8.1 Principio

Todo bridge entre Greenhouse y una sister platform debe apoyarse en IDs canonicos y bindings explicitamente persistidos.

### 8.2 Identificadores Greenhouse relevantes

| Campo | Significado |
| --- | --- |
| `clientId` | Tenant comercial o cliente canico del portal |
| `organizationId` | Cuenta / organizacion canica |
| `spaceId` | Scope operativo o instancia de servicio |
| `memberId` | Identidad colaborador cuando aplique |
| `tenantType` | `client` o `efeonce_internal` |

### 8.3 Identificadores sister-platform

Cada app hermana define sus IDs propios, por ejemplo:

- `portal_id`
- `hubspot_portal_id`
- `workspace_id`
- `installation_id`
- `connector_id`

### 8.4 Binding contract minimo

Toda integracion durable debe poder responder:

- que sister platform es
- que tenant o cuenta Greenhouse representa
- que objeto local de la sister platform corresponde a ese tenant
- que scope operativo exacto aplica
- quien es owner del binding
- desde cuando esta activo
- si el binding es `draft`, `active`, `suspended` o `deprecated`

### 8.5 Anti-patterns prohibidos

- matchear por nombre comercial
- matchear por slug visible sin contrato estable
- inferir `space` desde una ruta o desde UX
- usar una API key sin binding explicito y asumir que ya representa al tenant correcto

### 8.6 Future implementation seam

El contrato no obliga hoy a una tabla especifica, pero si obliga a una capability futura de binding cross-platform dentro de Greenhouse.

---

## 9. Action boundary

### 9.1 Read

Una sister platform puede:

- leer contexto de Greenhouse
- usarlo para scorecards, recomendaciones o explicaciones
- combinarlo con su propia logica de producto

### 9.2 Recommend

Una sister platform puede:

- producir recomendaciones basadas en datos Greenhouse
- priorizar, explicar o advertir

Eso no equivale a mutar Greenhouse.

### 9.3 Write

Una sister platform solo puede mutar Greenhouse si:

- existe API explicita
- existe ownership funcional claro
- existe regla de auth y audit trail
- el anexo de la plataforma lo autoriza

### 9.4 Agent rule

Los carriles LLM/MCP deben asumir:

- read-only por defecto
- approval humana antes de cualquier mutacion cross-platform

### 9.5 Governance formal de acceso cross-platform

> Delta 2026-05-15 — `GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md` (TASK-884) formaliza el carril `Write` de §9.3 con un control plane explicito.

Cuando una mutacion cross-platform afecta **acceso de personas** (colaboradores Efeonce o client users) a una sister platform, NO basta con tener API explicita y ownership claro: la mutacion debe pasar por el Ecosystem Access Control Plane canonico. Reglas duras:

- Greenhouse mantiene el `desired_state` de acceso del ecosistema. Las sister platforms pueden tener provisioning local (modo `hybrid_approval` o `platform_managed_observed`) pero deben converger a Greenhouse o reportar drift explicito.
- Toda mutacion de acceso (grant / revoke / suspend / approve) se persiste en `greenhouse_core.ecosystem_access_assignments` antes de tocar la sister platform. NUNCA se llama a la API externa inline sin haber commiteado el desired state + outbox event en la misma tx PG.
- Cada binding declara su `provisioning_mode` (`greenhouse_managed | hybrid_approval | platform_managed_observed | read_only_observed`). El modo determina si Greenhouse puede emitir commands de provisioning y como se interpreta el drift.
- Sister platforms reportan `observed_state` via snapshot a `/api/platform/ecosystem/access/observed-state` (idempotente, scoped al binding) y `applied_state` via `/api/platform/ecosystem/access/provisioning-results` (idempotente, anti-spoof por `idempotencyKey`).
- Sensitive grants (capabilities con `requires_approval=true`) exigen segunda firma de un EFEONCE_ADMIN distinto del grantor.
- 7 drift types canonicos cubren los desvios posibles entre desired/observed: `pending_provisioning`, `pending_deprovisioning`, `unauthorized_local_access`, `missing_identity_link`, `scope_mismatch`, `capability_mismatch`, `platform_apply_failed`. La severity de cada drift depende del platform mode del binding (no es constante).

Esta clausula reemplaza interpretaciones laxas de §9.3: "API explicita + ownership claro" no es suficiente para mutaciones de acceso. El control plane es obligatorio. Mutaciones cross-platform de OTRAS dimensiones (e.g. operacion creativa, CRM intelligence) siguen el §9 original sin requerir el control plane.

---

## 10. Security and governance

### 10.1 Runtime separation

La configuracion preferida es:

- proyecto GCP propio por plataforma
- Secret Manager propio por plataforma
- Cloud SQL propio por plataforma
- service accounts propias por plataforma

### 10.2 Least privilege

Toda relacion cross-platform debe usar:

- IAM minimo
- tokens scoped
- auth diferenciada por audience
- rate limiting cuando aplique

### 10.3 Observability

Todo consumo cross-platform importante debe poder auditar:

- caller
- tenant o scope
- surface usada
- latencia
- errores
- fecha de ultimo uso

### 10.4 Data leakage

El contrato exige aislamiento tenant-safe en:

- responses
- logs
- retries
- caches
- tool outputs

---

## 11. Release and versioning model

### 11.1 Versioned baseline

El contrato marco vive versionado como `V1`, `V1.1`, etc.

### 11.2 Platform annexes

Cada sister platform activa debe tener su propio anexo cuando:

- ya existe repo o runtime real
- ya existe integracion o roadmap formal con Greenhouse

Ejemplo:

- `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`

### 11.3 Future annexes

Plataformas futuras, por ejemplo `Verk`, deben abrir anexo propio solo cuando exista baseline real de producto o repo.

### 11.4 Non-breaking evolution

Los contratos no deben romper consumers activos sin:

- decision explicita
- plan de transicion
- version o deprecacion clara

---

## 12. Onboarding checklist para nuevas sister platforms

Antes de abrir una integracion nueva, confirmar:

- existe ownership funcional propio de la plataforma
- existe decision de peer system, no de modulo embebido
- existe anexo o se justifica abrirlo
- existe identificacion canonica del tenant/scope
- existe surface de lectura clara
- se definio si la capa compartida es:
  - institucional
  - operativa
  - analitica
  - event-driven
- se documentaron las prohibiciones y el action boundary

---

## 13. Estado actual del ecosistema

### 13.1 Sister platform activa

- `Kortex` ya cumple el criterio de sister platform activa del ecosistema

### 13.2 Plataformas futuras

- `Verk` queda explicitamente contemplada como future sister platform consumer de este contrato
- no debe recibir anexo propio hasta tener baseline real de repo o arquitectura equivalente
- **Efeonce Globe** (Creative Studio) es una plataforma hermana agentic de producción creativa (EPIC-028). Desde 2026-07-19 existe como piloto interno no productivo: binding explícito, sesión humana federada independiente, callback propio, API privada y bridge SDK/WIF/ADC sin llaves. Greenhouse sigue siendo source of truth de identidad y desired access; Globe revalida capabilities namespaced y conserva su sesión local. Sus assets, créditos y provider secrets son de su propiedad y no se comparten por DB, cookie ni acceso administrativo implícito. Production, clientes externos, storage y providers creativos continúan ausentes. El contrato cross-format futuro usa una solicitud minimizada de composición y un `artifact_manifest` versionado; no replica RFPs, diagnósticos internos ni storage de Tender.

### 13.3 Contratos ya conectados a este marco

- visual preset reusable hacia Kortex:
  - `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md`
- copy contract reusable:
  - `docs/tasks/to-do/TASK-265-greenhouse-nomenclature-dictionary-kortex-copy-contract.md`
- data node / read API / MCP downstream:
  - `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
  - `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`

---

## 14. Decisiones canonicas resumidas

1. Greenhouse y las sister platforms se integran como peer systems.
2. Runtime compartido no es el default.
3. Shared institutional layer si; shared product logic no.
4. Todo bridge cross-platform requiere tenancy explicita.
5. MCP y agentes son read-only por defecto.
6. Cada plataforma activa del ecosistema debe tener anexo propio sobre este contrato marco.

---

## 15. Delta 2026-05-28 — Identity broker lane for sister-platform SSO

El contrato marco agrega un carril interactivo de identidad para sister platforms: Greenhouse puede actuar como identity broker / authorization server para plataformas hermanas aprobadas.

Este carril no convierte a una sister platform en modulo embebido del portal. La plataforma consumidora conserva su runtime y su sesion local; Greenhouse conserva el source of truth de identidad, access checks y auditoria.

Este carril es aditivo. No autoriza cambios al SSO existente de Greenhouse, SCIM, Microsoft Entra provisioning, Graph sync, callbacks de sesion, cookies ni reglas globales de identidad.

### 15.1 Contrato canonico

- La sister platform redirige al usuario a Greenhouse con una solicitud authorization-code style.
- Greenhouse autentica al usuario con sus providers existentes: Microsoft SSO, Google o credenciales.
- Greenhouse emite un authorization code corto, one-time-use, bound a client, redirect URI y PKCE.
- La sister platform intercambia el code server-to-server.
- Greenhouse devuelve solo un payload minimo de identidad/acceso autorizado para esa platform.

### 15.2 Prohibiciones

- No compartir password, password hash, cookies Greenhouse, Microsoft access tokens, Microsoft refresh tokens ni upstream provider secrets.
- No wildcard redirect URIs.
- No usar este carril para acceso machine-to-machine; eso sigue usando tokens server-to-server scoped.
- No generalizar a terceros arbitrarios sin una nueva decision de arquitectura.
- No modificar SCIM, Entra provisioning, Graph sync, providers SSO existentes ni callback/session semantics del portal para implementar una sister-platform SSO.

### 15.3 Estado V1

Kortex fue el primer consumer de este carril. TASK-1454 generalizó la elegibilidad mediante `SisterPlatformOAuthPolicy` validada por client y añadió Globe como segundo consumer internal-only, sin condicionales por producto en el broker. La implementación Kortex y su rollout independiente siguen en `docs/tasks/in-progress/TASK-948-greenhouse-identity-broker-kortex-sso.md`.

El piloto Globe usa authorization code + PKCE S256, redirect exacto, consumo atómico one-time, claims mínimos sin roles Greenhouse y revocación explícita/convergente. La identidad de workload es un plano separado: Vercel OIDC → WIF → service-account impersonation → Google ID token de audience exacto para Cloud Run. Ningún plano admite service-account JSON keys.

El endpoint password-based `/api/integrations/v1/sister-platforms/identity` queda como bridge transicional/break-glass mientras se valida el SSO broker; su hardening sigue separado en TASK-413.

### 15.4 Gate de no-regresion

Antes de habilitar este carril en produccion, la task consumidora debe verificar:

- login Greenhouse con Microsoft SSO sigue funcionando sin cambios visibles.
- login Greenhouse con credenciales/otros providers existentes sigue funcionando.
- SCIM/Entra provisioning contract sigue sano en modo read-only o smoke controlado.
- no hay diff no documentado en provider config, callbacks, cookies, claims globales ni app registration.

### 15.5 Administracion del redirect allowlist

> Delta 2026-07-21 — TASK-1507 agrega la primitive canónica para mover el allowlist de redirect URIs de un cliente OAuth de plataforma hermana ya vivo. Es una capacidad de Greenhouse, no de una plataforma consumidora concreta.

El §15.2 prohíbe wildcards, así que el allowlist es una lista exacta: cambiar el origen desde el que una plataforma hermana hace login exige un write en `greenhouse_core.sister_platform_oauth_clients.redirect_uris`. Hasta esta task ese write sólo existía dentro de los seed scripts de provisioning (`scripts/seed-globe-internal-pilot.ts`, `scripts/seed-kortex-sister-platform-pilot.ts`), y ninguno sirve para un cliente en uso.

**Por qué no el upsert completo.** `upsertSisterPlatformOAuthClient` reemplaza la fila entera: el caller debe reafirmar `policy_json`, `allowed_scopes`, `code_ttl_seconds`, `access_token_ttl_seconds`, `require_pkce` e `issue_identity_inline`. Cualquiera de esos valores que haya derivado desde el último seed se reescribe en silencio con lo que el caller creía vigente. Un cambio de allowlist no puede tener ese blast radius.

**Por qué no el seed.** Además de reemplazar la fila, los seeds pasan el allowlist como reemplazo total del array de redirect URIs: `scripts/seed-globe-internal-pilot.ts` lo fija a `redirectUris: [uri]` (borraría el callback todavía en uso) y `scripts/seed-kortex-sister-platform-pilot.ts` lo reemplaza con lo que traiga `KORTEX_OAUTH_REDIRECT_URIS`. La rotación de token no es simétrica: `seed-globe-internal-pilot.ts` además rota el token (`rotateToken: true` fijo), lo que invalidaría el client secret vivo justo durante el cutover; `seed-kortex-sister-platform-pilot.ts` sólo rota con `KORTEX_ROTATE_CONSUMER_TOKEN=true`. El argumento que vale para ambos es el reemplazo total del array de redirect URIs.

**La primitive.** `updateSisterPlatformOAuthRedirectUris` (`src/lib/sister-platforms/oauth-broker.ts`) es aditiva/sustractiva y opera sobre un cliente existente:

- Una sola transacción: `SELECT ... FOR UPDATE` sobre la fila del cliente y un `UPDATE` que toca exclusivamente `redirect_uris` y `updated_at`. Nunca `policy_json`, `allowed_scopes`, TTLs, `require_pkce`, `client_status` ni el token del consumer.
- `normalizeRedirectUris` queda como única autoridad de validación, la misma que aplica el upsert: rechaza wildcards, exige HTTPS salvo `localhost`/`127.0.0.1`, deduplica y nunca deja el allowlist vacío.
- Agregar un URI ya presente es no-op (`changed=false`), lo que hace seguro re-ejecutar.
- Quitar un URI que **no** está en el allowlist falla fuerte (`invalid_redirect_uri`) en vez de hacer no-op silencioso: durante un cutover, un no-op sobre una vista stale es exactamente cómo sobrevive el callback equivocado.
- Agregar y quitar el mismo URI en una llamada falla (`invalid_redirect_uri`); un cliente inexistente devuelve 404 `invalid_client` y nunca lo crea.
- Devuelve `{ client, previousRedirectUris, redirectUris, changed }`, de modo que el caller puede diffear lo que había contra lo que quedó sin releer.

Cobertura: `src/lib/sister-platforms/oauth-redirect-uris.test.ts` (11 casos).

**Reglas duras:**

- **NUNCA** mover el allowlist de un cliente OAuth vivo con `upsertSisterPlatformOAuthClient` ni re-corriendo un seed de provisioning. Los seeds son para parir un cliente desde cero.
- **NUNCA** reemplazar el array completo durante un cutover de origen. El allowlist crece primero (origen nuevo aditivo), y el origen viejo se retira recién cuando el smoke del nuevo está verde.
- **NUNCA** relajar la validación para un caso puntual: el §15.2 no admite wildcards. `normalizeRedirectUris` es la única autoridad de validación en la capa de aplicación; la DB la respalda con `sister_platform_oauth_clients_redirects_check` (`cardinality > 0` + sin `*`, migración `20260528163738200`) y el signal `getSisterPlatformOAuthStaleClientConfigSignal` observa allowlists vacíos. Relajar una capa sin la otra rompe el trío.
- **SIEMPRE** verificar el allowlist contra el broker y no contra la DB. `GET /api/auth/sister-platforms/authorize` valida el `redirect_uri` **antes** de mirar la sesión, así que discrimina sin necesitar login, pero el probe debe ser una authorize request completa (`response_type=code`, `state`, `nonce`, `code_challenge` + `code_challenge_method=S256`, scope permitido) contra un deployment con `GREENHOUSE_SISTER_PLATFORM_OAUTH_ENABLED=true` y el cliente incluido en `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS`. La señal discriminante es el `errorCode`, no el status: `invalid_redirect_uri` = no allowlisted; con request completa y URI allowlisted la respuesta es `303` (a `/login` si no hay sesión), y un probe de control con wildcard (`https://*.<dominio>/auth/callback`) debe seguir devolviendo `400 invalid_redirect_uri` después del write — es la prueba de que el allowlist quedó exacto y no permisivo. Las tres vías son un solo control: sin la del wildcard, alguien que relajara la validación obtendría `303` en las dos primeras y concluiría que quedó bien. Un probe mínimo cuyo `redirect_uri` **ya** está allowlisted no devuelve `303` sino `400 unsupported_response_type` (`validateSisterPlatformAuthorizeRequest` valida `response_type` justo después del `redirect_uri`), y con el broker apagado toda la secuencia devuelve `404 broker_disabled` sin relación con el allowlist. Ese es el contrato observable del allowlist.
- **SIEMPRE** conservar el origen anterior en el allowlist mientras exista como camino de rollback documentado, y retirarlo por un write explícito cuando deje de serlo.

**Estado 2026-07-21.** El cliente `globe` tiene dos redirect URIs: el callback del dominio del front door interno y el callback `run.app` previo, conservado deliberadamente como camino de rollback (con el ingress endurecido ese origen ya no es alcanzable por browser, así que quitarlo obligaría a un segundo write en DB bajo presión durante un rollback).

**Camino de Full API Parity.** Hoy la primitive se opera por CLI (`pnpm sister-platform:redirect`, `scripts/sister-platform-oauth-redirect-uris.ts`), genérico por `--client` y con dry-run por defecto. No existe route admin de clientes OAuth: `/api/admin/integrations/sister-platform-bindings*` cubre bindings, no clientes del broker. La lógica vive deliberadamente en el broker y no en el script, así que una route, un tool MCP o Nexa pueden ejecutar el mismo cambio por la misma primitive sin reimplementar validación ni semántica transaccional; el script sólo parsea flags, imprime la proyección y delega. Para exponerla como contrato programático faltan dos piezas declaradas y no implementadas:

1. **Audit trail persistido.** La primitive acepta `actorUserId` y el CLI lo puebla desde `SISTER_PLATFORM_ACTOR_USER_ID` (default `system`), pero el parámetro es **inerte**: `updateSisterPlatformOAuthRedirectUris` no lo escribe en ninguna columna ni emite `recordSisterPlatformOAuthAuditEvent`. Sus vecinas sí lo hacen — `revokeSisterPlatformOAuthAccessTokens` persiste `revoked_by_user_id` y `setSisterPlatformOAuthClientStatus` persiste `suspended_by_user_id`/`deprecated_by_user_id`, y ambas emiten evento a `greenhouse_core.sister_platform_oauth_audit_log`. Cerrarlo no es sólo cablear el parámetro: el `eventType` de ese log es un enum cerrado sin miembro para un cambio de allowlist. §10.3 exige poder auditar el caller de todo consumo cross-platform relevante, así que hoy la trazabilidad del cambio es extrínseca (el shell del operador), no de la plataforma.
2. **Capability/entitlement de gobierno.** No existe capability que declare quién puede mover un allowlist. Sin ella no hay `can(subject, ...)` que chequear en una route, y el guardrail de `capability-grant-coverage` no tiene nada que cubrir.

Ambas son requisito de la route/MCP, no del CLI, que corre con credenciales de operador. **Hueco declarado y sin dueño:** persistir el audit trail, declarar la capability y exponer la route/MCP requieren una task de follow-up que **todavía no está creada**; hasta entonces esta primitive es CLI-only por diseño, no por omisión, y ese estado debe declararse así al cerrar cualquier trabajo que la toque.
