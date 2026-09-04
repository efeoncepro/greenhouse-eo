# Greenhouse API Platform Architecture V1

## Product API humano para recovery de assessment (TASK-1746/1747)

`POST /api/hiring/assessments/[id]/access-recovery` es un adapter Product API interno y delgado sobre
`recoverCandidateTestAccess`, no una API ecosystem/app ni un click handler con lógica propia. Autoriza capability
por canal antes de resolver la entidad, exige sesión humana de providers canónicos, lectura exacta de application
y assessment, Origin/JSON/idempotencia cerrados y devuelve un DTO anti-oracle `no-store/no-referrer`. El canal
`secure_link` puede revelar una URL una vez; nunca se expone a agent/app/service principals ni se serializa en
audit/outbox. El canal email devuelve aceptación/fallo/unknown de despacho, no entrega al inbox.

### El carril de LECTURA es propio, y su puerta es MÁS estrecha que la del write (TASK-1747)

`GET /api/hiring/assessments/[id]/access-recovery?applicationId=…[&reason=…]` devuelve
`{ availability, canRecoverByEmail, canRevealSecureLink }` desde el mismo reader que consume el POST. Existe
porque "explicar por qué NO se puede recuperar el acceso" es una capacidad, y sin contrato programático quedaba
UI-only: ni Nexa ni MCP ni un segundo consumidor la alcanzaban. La feature no estaba completa.

Es el caso donde **la lectura pide más autorización que la escritura**, y conviene tenerlo presente como patrón
antes de asumir que un GET siempre es la puerta barata:

- La puerta **no** puede ser `hiring.assessment.read`. Esa capability la porta todo tenant interno por el
  routeGroup `internal` —collaborator, designer, people_viewer incluidos—, y el DTO expone si la candidata
  retiró su consentimiento, si su decisión aún no se le comunicó y si el proveedor bloqueó su correo. La puerta
  real es `hiring.assessment.read` + `hiring.application.read` + **al menos una** de las dos capabilities de
  recuperación (`recover_access_email` / `reveal_access_link`).
- El binding a `applicationId` es **obligatorio** y se compara contra el aggregate, igual que en el POST. Un
  read que acepta un `assessmentId` suelto entrega el consentimiento y la entregabilidad de cualquier candidato
  del tenant. Un id que no pertenece a esa postulación se responde como inexistente, sin confirmar que existe
  en otro lado (anti-oracle).
- El `reason` es opcional pero validado contra el enum: la elegibilidad es reason-dependent, así que una lectura
  sin motivo no puede probar el caso más común (`token_expired_before_start`).
- El error 500 pasa por el contrato canónico (`error` es-CL + `actionable: true`); el cliente conserva
  `actionable` en `HiringClientError` para no ofrecer "Reintentar" sobre una causa estructural.

Full API Parity se conserva porque UI, CLI y futuros adapters gobernados delegan al mismo command/readers. El
write NO se publica en MCP: revelar un bearer link exige sesión humana. La lectura sí es candidata a lane
ecosystem cuando exista consumidor.

Runtime: capabilities y schema vivos desde el 2026-08-19; Application 360 es el consumidor. Contrato de dominio:
[`GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`](GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) §`Acceso al test del candidato`.

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-25
> **Ultima actualizacion:** 2026-06-03
> **Scope:** API platform interna, ecosystem-facing y futura external-facing de Greenhouse
> **Docs relacionados:** `GREENHOUSE_ARCHITECTURE_V1.md`, `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`, `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`, `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`, `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`, `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`, `GREENHOUSE_MCP_ARCHITECTURE_V1.md`, `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`, `TASK-040`

---

## Delta 2026-09-04 — el lane ecosystem que resuelve PERSONAS para el gateway, `internal`-only (TASK-1631)

`GET /api/platform/ecosystem/identity/binding?environment=<id>&subject=<sub>[&clientId=<azp>]` (+
`externalScopeType=other&externalScopeId=efeonce-mcp-gateway` del binding sister-platform del gateway). routeKey
`platform.ecosystem.identity.binding`, sobre `runEcosystemReadRoute`; payload helper en
`src/lib/api-platform/resources/ecosystem-identity-binding.ts`. Es el reader con el que el gateway MCP
(`TASK-1831`) convierte un token de un issuer externo —o del emisor propio de Efeonce— en "qué persona, en
nombre de qué organización cliente, con qué capabilities": el gateway valida el token; Greenhouse decide la
autoridad.

- **Sólo bindings `internal`**: para cualquier otro binding la ruta responde `404` anti-oráculo (mismo patrón
  que `mcp/skills` con `audience: internal`). Resolver personas es una capacidad del gateway, no de un cliente.
- **Params**: `environment` + `subject` obligatorios (faltantes ⇒ `400 bad_request`; formato inválido ⇒ `400`
  con `details`); `clientId` opcional y sólo se registra en el log de denegaciones — **nunca** es llave de
  resolución (contrato `Slice 0 gateway authorization-context` del ADR: la persona resuelve por
  `(environment, subject)`; `clientId` ausente significa ausente).
- **Respuesta** = passthrough de `resolveExternalAccess` —
  `{ outcome, environmentId, issuerClass, profileId, memberships[{ bindingId, organizationId, externalOrganizationRef, grantsVersion, grants[], designatedAdmin }], resolvedAt }`
  — más `cacheTtlSeconds: 60`; `Cache-Control: private, no-store`. Cero lógica de dominio en el lane. La
  respuesta nunca incluye el subject ni un email: el gateway ya tiene el token.
- **Outcomes**: `bound` \| `unbound` \| `revoked` \| `environment_inactive` \| `profile_inactive`. Sólo `bound`
  autoriza; el gateway compara `grantsVersion` por **igualdad estricta** con el claim `gv` del token y cachea la
  resolución ≤ 60 s. Toda denegación queda en `greenhouse_core.external_access_resolution_log` (subject
  hasheado) y alimenta las señales `identity.external_binding.*`.
- **No hay command en este lane**: las escrituras del dominio (bind, grant, invitar, revocar) viven en el lane
  admin `/api/admin/identity/external-access/**` con capability dedicada por command;
  `acceptExternalInvitation` la ejecuta el auth-server in-process (`TASK-1830`) y no tiene ruta pública todavía.
  Invalidación push de `grantsVersion` hacia el gateway = `TASK-1831`.

Contrato completo: [`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
§`Slice 1 binding foundation — applied`.

## Delta 2026-09-02 — la lane de manuales de uso MCP: el lane sirve documentación, no sólo datos (TASK-1804)

`GET /api/platform/ecosystem/mcp/skills` (catálogo: `skills[] {name, description, audience, appliesTo, uri}` +
`count`, nunca cuerpos) y `GET /api/platform/ecosystem/mcp/skills/{name}` (`name, description, audience,
appliesTo, uri, contentHash, body`). routeKeys `platform.ecosystem.mcp.skills` / `platform.ecosystem.mcp.skill`,
sobre `runEcosystemReadRoute`; payload helpers en `src/lib/api-platform/resources/ecosystem-mcp-skills.ts`. Es
la primera lane cuyo recurso es **prosa operativa** (el manual de uso de la superficie MCP) y no un aggregate
de dominio, y la razón de que exista es de contexto: el agente carga el manual que gobierna la tool que va a
usar, cuando la va a usar, en vez de recibirlo entero en la nota del handshake.

- **Fuente = artefacto generado, nunca filesystem.** El lane construye el catálogo desde
  `src/mcp/greenhouse/skill-catalog.generated.json` (`pnpm mcp:skills:generate` / `pnpm mcp:skills:check`, en
  `local:check` y CI) y re-verifica `catalogHash`/`contentHash` contra el manifiesto puro
  `src/mcp/greenhouse/skill-manifest.ts`; con drift **lanza**. 🔴 **NUNCA `node:fs` en un módulo alcanzable
  desde una ruta**: Vercel rechazó el build (`api/mcp/greenhouse` de 397 MB > 250 MB) cuando un módulo leía
  `docs/mcp/skills/**` con fs dinámico — Turbopack arrastró el proyecto entero; `outputFileTracingIncludes`
  no era la causa y **no** es la solución. La lectura de disco vive sólo en `skill-catalog-fs.ts`
  (generador + tests).
- **Anti-oráculo por audiencia.** `audience: internal` sólo es visible para bindings
  `greenhouseScopeType=internal`; para cualquier otro binding el manual **no existe** — catálogo vacío, detalle
  `404`, nunca `403` — y un `name` malformado responde el mismo `404`. Mismo boundary que el work-queue
  (delta 2026-08-28) y que el read-detail de Knowledge.
- **Freshness declarada.** `Cache-Control: private, max-age=300, must-revalidate` + `ETag` (del
  `contentHash`; el ETag del catálogo depende del subconjunto visible, así que un binding nunca revalida
  contra el de otro) + `If-None-Match` → `304`.
- **Tres consumers del mismo primitive**, cero contenido duplicado: la tool interna `get_greenhouse_skill`
  (dominio `platform`, `writes:false`, `spendsProviderBudget:false`; 44.ª del manifiesto) y el recurso
  `skill://efeonce/{name}/SKILL.md` en `src/mcp/greenhouse/server.ts` piden el cuerpo a esta lane vía
  `http-client`; el gateway `mcp.efeonce.org` la delega desde su provider `greenhouse-skills`
  (`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`, delta 2026-09-02). Nunca se sirve `.claude/skills/**`; un
  test de fuga rechaza UUIDs, ids `org-`, rutas del repo, ids de task, secretos y correos internos.

Verificado contra producción el 2026-09-02 (releases `375f56e24` y `4379c495013f`): count exacto, cuerpos
byte-idénticos al artefacto, `304`/`404`/`401`, provider del gateway N/N. Contrato HTTP completo con ejemplos =
`TASK-1793`. Invariantes: `agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` §8;
`GREENHOUSE_MCP_ARCHITECTURE_V1.md` §23.

## Delta 2026-08-28 — la cola priorizada de trabajo entra al lane SEO, `internal`-only (TASK-1700)

`GET /api/platform/ecosystem/growth/seo/work-queue` publica la cola priorizada del target: el snapshot
vigente con sus items ordenados, `originHealth`, `priorityScoreVersion`, `asOf` y `staleness`. Acepta
`origin` (repetible, del vocabulario cerrado), `limit` y `cursor` — la paginación es keyset **sobre un
snapshot inmutable**, así que el universo no crece bajo el cursor. Ruta en
`src/app/api/platform/ecosystem/growth/seo/work-queue/route.ts`, handler en el builder del lane
(`src/lib/api-platform/resources/ecosystem-growth-seo.ts`), sobre `runEcosystemReadRoute`. Payload =
passthrough del reader canónico `readSeoWorkQueue`; cero lógica de orden en el lane.

🔴 **Sólo bindings `internal` sin organización, con `404 not_found` anti-oracle** — el mismo boundary
que `provider-spend`, y por la misma clase de razón: no es una restricción de permisos sino de
naturaleza del dato. La cola compone la lente competitiva (`origin='competitor_gap'`) y el cruce con
citabilidad IA del lado AEO, y §7 de la auditoría 2026-08-15 **prohíbe la comparativa competitiva
client-facing**. El camino del cliente no es este lane con otro scope: es el **DTO redactado** de su
propia superficie, que sale del mismo reader por `toClientWorkQueueDto` y no lleva dificultad, volumen
estimado, costo de proveedor, `evidence_ref` cruda ni el breakdown completo. Un `internal` sin
`organizationId` recibe `400 bad_request`: la diferencia entre "no te corresponde saberlo" y "te falta
un parámetro".

**Mismo payload que la ruta app `GET /api/admin/growth/seo/work-queue` y que la tool MCP interna
`get_seo_work_queue`** — un primitive (`readSeoWorkQueue`), tres consumers, **cero lógica de orden
duplicada**. El orden, el score y la composición de orígenes viven en
`src/lib/growth/seo/work-queue/**`; ningún consumer reordena ni recompone.

**La federación al gateway externo `mcp.efeonce.org` está explícitamente FUERA de alcance**
(auditoría §6), no pendiente por olvido: primero el read tool interno. Semántica del aggregate,
vocabularios cerrados, bandas de score y política de versionado en
[`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) §18 (canónico);
acá sólo vive lo que es contrato del lane. Estado: code complete en `develop`, flag
`GROWTH_SEO_WORK_QUEUE_ENABLED` **OFF en los dos runtimes**. Con el flag apagado, un binding `internal`
recibe el payload `{ ok: false, errorCode: 'disabled' }` que devuelve el propio reader —no un 404, que
es lo que ve un binding que no debía llegar acá—: el orden de las dos puertas importa y no se puede
invertir.

---

## Delta 2026-08-27 — el lane SEO que NO resuelve la organización desde el binding (TASK-1696)

`GET /api/platform/ecosystem/growth/seo/provider-spend` publica el gasto de proveedor del mes por
organización, cortado por **consumidor** (`seo` | `aeo`) y por **base de costo** (facturado |
estimado). Ruta en `src/app/api/platform/ecosystem/growth/seo/provider-spend/route.ts`, handler en
el mismo builder del lane (`src/lib/api-platform/resources/ecosystem-growth-seo.ts`), sobre
`runEcosystemReadRoute`. Payload = passthrough del reader canónico
`readSeoProviderSpendByConsumer`; cero lógica de dominio en el lane. Su tool de lectura es
`get_seo_provider_spend`.

🔴 **Es el único endpoint del lane SEO que RECHAZA los bindings org-scoped, y no es una restricción
de permisos sino de naturaleza del dato.** El resto del lane resuelve la organización desde el
binding cuando es org-scoped (delta TASK-1645, abajo); acá esa misma resolución **sería la fuga**:
lo que este recurso devuelve es lo que a Efeonce le **cuesta** servir a un cliente, no algo que el
cliente haya consumido. Un binding de cliente leyendo su propia fila estaría leyendo nuestra
estructura de costos. Por eso exige `greenhouseScopeType === 'internal'` con `organizationId`
explícito como query param, y rechaza **antes de tocar el dominio**.

**Rechaza con `404 not_found`, nunca con 403.** Es deliberado y distinto del boundary de los
commands del mismo lane (TASK-1308, que responde `403 scope_not_allowed`): allá el binding cliente
puede leer sus oportunidades y sólo se le niega hacer crecer su propia factura, así que decirle "no
puedes" no le enseña nada. Acá un 403 confirmaría que el recurso existe, y un binding de cliente no
debe aprender siquiera eso. Un `internal` sin `organizationId` sí recibe `400 bad_request` — la
diferencia entre "no te corresponde saberlo" y "te falta un parámetro".

**El payload nunca colapsa `invoiced` con `estimated` en un total único.** Las filas viajan cortadas
por `consumer` × `family` × `costBasis`, y los totales por consumidor llevan `invoicedUsd` y
`estimatedUsd` en campos separados. Hoy todo el ledger es facturado, así que la separación se ve
redundante — y es justo antes de que entre el primer dólar estimado cuando el contrato tiene que
nacer separado: una cifra única que mezcle un dólar que se pagó con uno que se estimó no es un dato
degradado, es un dato falso. Un consumer que sume las dos monedas para mostrar "el gasto" está
rompiendo el contrato, no simplificándolo.

Con el flag del módulo apagado el lane responde `{ ok: false, errorCode: 'disabled' }` como el resto
del lane SEO, sin filtrar si la organización existe. Modelo de datos, invariantes del ledger y
resolver de presupuesto: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (canónico); acá sólo vive lo que
es contrato del lane.

⚠️ **Orden de federación.** La tool quedó en `main` de `efeonce-mcp`, pero el deploy del gateway es
`workflow_dispatch` manual y el lane que consume viaja en `develop`: disparar el deploy de
`mcp.efeonce.org` **antes** del release que lleve este lane a `main` deja la tool respondiendo 404
upstream con el guard de paridad en verde. El deploy del gateway va **después** del release.

---

## Delta 2026-08-26 — el eje de desenlace de Hiring gana carril gobernado (TASK-1773)

Tres rutas nuevas bajo `src/app/api/platform/app/hiring/applications/[applicationId]/`:
`GET outcome`, `POST decision/propose` y `POST decision/confirm`. Cierran una brecha de Full API
Parity: el cierre de una postulación se entregó completo y operable **sólo desde el portal** — ni
`api/platform/app/**`, ni MCP, ni Nexa lo alcanzaban.

Capability: `hiring.application.decide`, la que ya existía. Sin capability nueva, sin migración, sin
evento nuevo, sin feature flag sobre las rutas.

### El guard es un digest, no una entidad

El lane `app` de Hiring ya tenía un `propose`/`confirm`: el del Banco de Talento, que **persiste** su
propuesta en `talent_pool_invitation`. Este NO. La diferencia no es de estilo:

- Una invitación **es** una entidad con ciclo de vida propio, así que tiene fila.
- Una propuesta de decisión **no lo es**: nace y muere dentro de un gesto humano.

Por eso el guard es una huella del **estado actual más el efecto propuesto**: `propose` la calcula,
`confirm` la recalcula contra el estado de AHORA y falla si no coincide. Nada se persiste, y la task
conserva `Migration: none`. La huella incluye el estado actual a propósito: si otra persona decide
entre medio, la confirmación falla en vez de pisar en silencio una decisión ajena.

La revalidación va **antes** de abrir transacción; el `FOR UPDATE` y el replay por `idempotencyKey`
del command canónico siguen cubriendo la carrera fina donde siempre estuvieron.

🔴 **Ese 409 tiene código propio.** `hiring_decision_proposal_stale` se agregó al enum
`ApiPlatformErrorCode` (`src/lib/api-platform/core/errors.ts`) en vez de aplanarse a `bad_request`,
porque son dos cosas distintas para el consumer: «tu payload está mal» se corrige reescribiendo el
request; «el mundo cambió» se corrige volviendo a proponer. Un solo código habría hecho indistinguible
el reintento correcto del inútil.

Contrapartida a tener presente: el adapter traduce **todo** 409 del dominio a ese código, así que
también llegan con él la reutilización de una clave de idempotencia con otro payload y la selección
contra un opening cerrado.

### Confirmar es fail-closed para agentes delegados

Un bearer `sister_platform_oauth` puede LEER el desenlace y PROPONER una decisión; **no puede
confirmar**. El motivo es mecánico y no de criterio: `efeonce.mcp.hiring.write` no existe en código y
queda bloqueado hasta el grant revocable de TASK-1631. La confirmación exige sesión humana
(`cookie_session` o `first_party_app`).

Es el mismo reparto que ya rige en el resto de Hiring —el agente propone y lee, el humano confirma— y
es la forma correcta de expresar una capacidad todavía no federable: el carril existe, y la puerta de
escritura está cerrada explícitamente en vez de ausente.

### El lane es adaptador, no dueño de reglas

`src/lib/api-platform/resources/app-hiring-application-decision.ts` valida transporte y autorización y
delega. Toda la validación de decisión —causa obligatoria en `not_selected` y prohibida en el resto,
destino, idempotencia, historial append-only— vive en `decideHiringApplication` y ahí se queda. Un
efecto verificable de esa disciplina: la validación del par desenlace/causa aparece en `confirm`
(422 con código `bad_request`), nunca en `propose`, porque `propose` no reimplementa el command.

El adapter mapea los errores por CÓDIGO de dominio, no por status: los tres 409 del command
—propuesta caducada, conflicto de idempotencia y vacante cerrada— conservan cada uno el suyo. Mapear
por `statusCode` los colapsaba en uno, que es la misma clase de defecto que TASK-1751 corrigió del lado
del candidato; se detectó justamente al documentar este contrato.

**Orden obligatorio al federar un lane nuevo hacia MCP** (lección `TASK-1661`): la tool se registra en el
gateway `efeonce-mcp` **DESPUÉS** de que el release lleve la ruta a `main`, nunca antes. Registrarla contra un
lane que sólo existe en `develop` no falla al registrar: falla al usarse, con **404 upstream**. Aplica a
cualquier ruta de este documento que se federe, no sólo a las de Hiring.

### El guard que impide que la clase vuelva

El hueco no fue que faltara una ruta: fue que **nadie se hizo la pregunta de parity**, ni las cuatro
tasks del eje ni la auditoría que las revisó. `src/lib/hiring/capability-parity-manifest.ts` convierte
esa pregunta en un paso obligatorio: toda capability `hiring.*` chequeada con `can()` debe aparecer
con estado `federated` (con evidencia de ruta), `deliberately-internal` (con razón) o `pending` (con
la task dueña o el bloqueo). Agregar una capability sin declararlo rompe el test.

No declara si algo *debe* federarse — declara que alguien lo pensó y dejó escrito el porqué. Sólo
capabilities de `can()`, nunca scopes OAuth delegados: son dos planos de autorización distintos.

### Consumers y estado

Nexa recibió la acción gobernada `decide_hiring_application`
(`src/lib/nexa/actions/hiring-decision.ts`), que delega en el mismo primitive. Su autoridad es
deliberadamente **más angosta que la del portal**: se niega a re-decidir una postulación que ya tiene
desenlace, porque el contrato compartido `NexaActionPreviewResult` no puede cargar el digest del
preview al execute. El flag `NEXA_HIRING_ACTIONS_ENABLED` nace OFF y su fila está en el ledger.

El cierre MASIVO por capacidad **no** se federa (decisión de TASK-1762): esta capacidad decide UNA
postulación.

Estado: code complete en `develop` y **sin desplegar**. No hay evidencia de runtime contra staging ni
producción, y el flag de Nexa está apagado en todos los environments. Contrato publicado en
[`docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`](../api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml),
que es el registro real de este lane.

---

## Delta 2026-08-14 — intención declarada en el body de `keywords/track` (TASK-1659)

`POST /api/platform/ecosystem/growth/seo/keywords/track` acepta dos campos opcionales más:
`intent` (`target` | `opportunity`) e `intentDeclaredBy`. El contrato del lane no cambia de forma —
sigue siendo el mismo command route, el mismo boundary `internal` y el mismo command canónico— pero
sí gana dos reglas de frontera que un consumer programático tiene que conocer:

🔴 **Un `intent` fuera del enum es `400 bad_request`, nunca un `undefined` silencioso.** Es la
diferencia entre "no declaré intención" (omitir el campo, legítimo y frecuente) y "declaré una y se
perdió en el camino". Descartar en silencio un valor inválido dejaría al consumer creyendo que
clasificó algo que quedó sin clasificar, y ese error solo se descubre semanas después leyendo un
reporte que no cuadra.

**El `actor` sigue siendo `mcp:<consumer>` — la máquina.** `intentDeclaredBy` no lo reemplaza: la
procedencia del write (quién comprometió el gasto) y la autoría de la declaración (por encargo de
quién se clasificó) son dos hechos distintos y se auditan por separado. Una autoría sin intención se
descarta, porque no hay a qué atribuirla.

El outcome por keyword que el lane hace passthrough suma un valor: `intent_changed`. Un consumer que
solo conozca `tracked|already_tracked|capacity_exceeded|invalid` lo leerá como desconocido, y
fundirlo en `already_tracked` diría que no pasó nada cuando sí se cerró una membresía y se abrió
otra. Semántica completa del eje, invariantes de reporte y modelo de datos en
`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (canónico); acá solo vive lo que es contrato del lane.

---

## Delta 2026-08-07 — los dos primeros COMMANDS del lane SEO (TASK-1308)

El lane ecosystem de Growth SEO nació read-only (delta TASK-1645, abajo). TASK-1308 le suma sus
**dos primeros writes**: `POST /api/platform/ecosystem/growth/seo/keywords/track` y
`.../keywords/untrack`, sobre `runEcosystemCommandRoute` (nunca el helper de lectura: sin
idempotencia por `Idempotency-Key` ni command audit, un reintento del gateway sobre un timeout de
red volvería a comprometer gasto). Handlers en el mismo builder del lane,
`src/lib/api-platform/resources/ecosystem-growth-seo.ts`; el dominio vive entero en el command
canónico `src/lib/growth/seo/track-keywords.ts` — el lane no decide nada.

🔴 **Boundary duro: sólo bindings de `greenhouseScopeType === 'internal'`** (`403
scope_not_allowed`). Es la diferencia deliberada con los readers del mismo lane, donde un binding
org-scoped SÍ resuelve su propia organización: **seguir una keyword es un compromiso de gasto
diferido** — el rank capture diario le paga al proveedor por cada keyword vigente, en cada ciclo —
así que un binding cliente puede **leer** sus oportunidades pero no **hacer crecer su propia
factura**. El mismo boundary aplica a `untrack` aunque bajar el gasto suene inofensivo: quien no
decide qué se mide tampoco decide qué se deja de medir, y un boundary asimétrico sería una excepción
que hay que explicar cada vez que alguien lea el builder.

Detalles del contrato que un lane de write nuevo debe copiar:

- **El actor es la máquina**: `mcp:<consumer.publicId>`. En este lane **no hay chequeo de capability
  por humano** (el app-lane sí exige `growth.seo.target.configure`) — a propósito, porque su sujeto
  es un consumer. La consecuencia de seguridad es que la única puerta que depende de la persona
  queda fuera de Greenhouse, en el scope OAuth del gateway (`efeonce.mcp.seo.write`); por eso ese
  scope **no** se cablea al cliente público compartido. Ver
  `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` §"El scope de escritura NO se cablea al cliente
  público compartido".
- **La autorización de dominio sigue abajo, no en el lane**: entitlement per-org `seo_v2` vigente +
  techo gobernado por target + outcome POR keyword. El lane hace passthrough del resultado del
  command; **NUNCA** colapsa ese outcome a un booleano — un caller que sólo ve `ok: true` no puede
  distinguir "agregué 3" de "rebotaron 40 contra el techo".

## Delta 2026-08-07 — verificar una tool del lane sin OAuth (TASK-1306)

Al agregar `get_seo_overview_kpis` quedó documentado el camino corto para responder "¿este
endpoint del lane responde de verdad o sólo está cableado?", sin montar el canary OAuth:

1. Token del consumer desde Secret Manager (`efeonce-mcp-gateway-greenhouse-token`) como
   `Authorization: Bearer`.
2. **`externalScopeType` + `externalScopeId` son obligatorios** y son lo que casi siempre
   falta la primera vez: sin ellos el lane responde `400 missing_external_scope_type`, que
   se lee como "el endpoint no existe" cuando en realidad significa que llegó bien y le
   falta el binding. Para el gateway: `other` / `efeonce-mcp-gateway`.
3. Contra staging, agregar `x-vercel-protection-bypass` (Deployment Protection).

⚠️ **El lane NO se puede ejercitar en `localhost`**: devuelve `500` por un `ENOENT` de
`@opentelemetry/instrumentation` en `node_modules`, y falla igual para endpoints que llevan
meses sanos en producción. Un 500 local **no** es evidencia sobre el endpoint nuevo — antes
de depurarlo, comparar con un endpoint hermano del mismo lane; si ambos fallan, es el
entorno. Receta completa: `docs/manual-de-uso/plataforma/operar-provider-greenhouse-seo-mcp.md`.

## Delta 2026-08-05 — Lane ecosystem de Growth SEO (TASK-1645)

El módulo SEO (EPIC-022) suma su lane ecosystem espejo del de Knowledge (TASK-1086), con una
diferencia deliberada: la autorización no es scope-only sino **entitlement per-org** —
`/api/platform/ecosystem/growth/seo/{keyword-opportunities,visibility-360,entitlement}` resuelve la
organización desde el binding (org-scoped manda; `internal` exige `organizationId` como query param)
y exige el módulo `seo_v2` vigente en `module_assignments` o responde **404 anti-oracle**. Payloads =
passthrough de los readers canónicos (`readKeywordOpportunities`, `readSeoAeoGap`,
`resolveSeoEntitlement` como lectura) — cero lógica de dominio en el lane. Consumido por 3 MCP tools
read-only del server greenhouse (`get_seo_keyword_opportunities`, `get_seo_visibility_360`,
`get_seo_entitlement`). Federación al gateway `mcp.efeonce.org` = `TASK-1647`. Builder:
`src/lib/api-platform/resources/ecosystem-growth-seo.ts`. ⚠️ **El lane dejó de ser read-only el
2026-08-07** (TASK-1308, delta arriba): sus dos primeros commands corren por
`runEcosystemCommandRoute` y sólo aceptan bindings `internal`.

## Delta 2026-06-15 — Command & Idempotency Foundation (TASK-655)

Aterriza la capability shared de idempotencia + command audit que §12 y §8.5/§24.3 declaraban como pendiente. Cierra la brecha "writes seguros, idempotentes y auditables" del objetivo RESTful — primer proving ground: el event control plane.

- **Store + audit canónico**: `greenhouse_core.api_platform_command_executions` (migración `20260615181918477`). **Una sola tabla** sirve los dos propósitos (SSOT, no dos tablas que se desincronizan): toda ejecución de command = 1 fila (audit trail); las idempotentes comparten `(principal_id, idempotency_key)` vía partial UNIQUE index `WHERE idempotency_key IS NOT NULL`. State machine `processing → completed | failed`. CHECK `idempotency_key IS NULL OR request_fingerprint IS NOT NULL` (sin fingerprint no se puede detectar reuse con payload distinto). Lane-agnostic (`principal_kind` + `principal_id`): hoy lo adopta el lane `ecosystem` (principal = sister platform consumer); `app`/`internal` quedan como follow-up.
- **Helpers** (`src/lib/api-platform/core/`):
  - `idempotency.ts` — store + lógica **pura** testeable: `computeRequestFingerprint` (stable JSON: ordena keys recursivamente → un retry con distinto orden de keys NO false-triggerea conflict), `resolveIdempotencyDecision` (`replay | conflict | in_progress`), `parseIdempotencyKey` (opt-in; 400 si malformada, nunca downgrade silencioso a "sin key"). Claim atómico `INSERT … ON CONFLICT … DO UPDATE … WHERE status='failed' AND fingerprint match` (re-claim de fallidas) + `RETURNING`-empty ⇒ read + decide.
  - `commands.ts` — `runEcosystemCommandRoute` = `runEcosystemReadRoute` (**reuse total** de auth + binding + rate-limit + request-log — cero auth paralela) con idempotencia + command audit envueltos alrededor del handler. Replay → response guardada + header `Idempotency-Replayed: true`. Conflict/in-progress → `ApiPlatformError` 409. Failure del handler → `failCommandExecution` (retry permitido) + rethrow.
- **Error taxonomy**: `ApiPlatformErrorCode` suma `idempotency_conflict` (key reusada con payload distinto) y `idempotency_in_progress` (otra request corre la misma key) — ambos 409 (§14.3 + §23.3).
- **Header contract**: `Idempotency-Key` (request, opcional, ≤255, scoped por principal, TTL 24h) + `Idempotency-Replayed: true` (response en replay). Documentados como parámetro reusable `IdempotencyKey` + respuesta 409 en los 3 commands del OpenAPI.
- **Adopción (event control plane)**: `POST/PATCH /webhook-subscriptions` + `POST /webhook-deliveries/:id/retry` corren por `runEcosystemCommandRoute`. Verificado por `route-contract.test.ts` (los 3 routeKeys salen por el command harness, nunca el read harness).
- **Observabilidad**: reliability signal `platform.command.stuck_processing` (kind=`drift`, moduleKey `platform`, steady=0) — detecta commands en `processing` pasado su TTL (un runtime crasheó entre claim y cierre → la key queda wedge / 409 in-progress perpetuo). Reader `src/lib/reliability/queries/api-platform-command-stuck-processing.ts`, wired en `getReliabilityOverview`.
- **Out of scope / follow-ups**: writes amplios de dominio; adopción del lane `app` (su `runAppRoute` reusaría el mismo store cambiando `principalKind`); barrido/cleanup de keys expiradas (hoy el TTL es lógico — la fila persiste para forensic); MCP write-safe tools (downstream desbloqueado por esta foundation).

**Reglas duras**:

- **NUNCA** un command nuevo de `api/platform/*` se monta sobre `runEcosystemReadRoute` cuando muta estado — usa `runEcosystemCommandRoute` (o el equivalente por lane). El read helper no audita ni idempotiza.
- **NUNCA** duplicar la pipeline de auth/binding/rate-limit para un command. El command helper la reusa por composición.
- **NUNCA** persistir un `idempotency_key` sin `request_fingerprint` (CHECK lo bloquea) — sin fingerprint el conflict por payload-mismatch es indetectable.
- **NUNCA** crear una segunda tabla de "command audit" separada del idempotency store. Es una sola tabla; el audit puro (sin key) es la misma fila con `idempotency_key IS NULL`.
- **SIEMPRE** que emerja un command que pueda reintentarse o venga de integración/agente, aceptar `Idempotency-Key` (§12.2). El replay debe devolver el mismo resultado + `Idempotency-Replayed: true`.

---

## Delta 2026-06-12 — Lane ecosystem de Knowledge (TASK-1086)

El reader SSOT `searchKnowledge` (TASK-1083) ahora sirve **tres lanes** con cero lógica de dominio duplicada (Full API Parity en acción): `app` (UI/Nexa, session-authed), `ecosystem` (MCP, machine-authed) y, vía el tool de Nexa, el agente conversacional. TASK-1086 agregó el lane **ecosystem**:

- `GET /api/platform/ecosystem/knowledge/search` + `GET /api/platform/ecosystem/knowledge/documents/[id]` vía `runEcosystemReadRoute`. Resource builders en `src/lib/api-platform/resources/ecosystem-knowledge.ts`.
- **Subject derivado del binding** (no hay sesión/roleCodes): `buildEcosystemKnowledgeSubject(context)` construye el `KnowledgeSearchSubject` desde el binding sister-platform. Es la **única diferencia** con el lane `app` (que lo deriva de `TenantContext`); el reader, el filtrado pre-LLM y el contrato `knowledge-search.v1` son idénticos.
- **Governance gate default-DENY**: solo bindings de `greenhouseScopeType='internal'` recuperan conocimiento agéntico (corpus interno-only MVP) → si no, `403 scope_not_allowed`. Defensa en profundidad: el reader en modo `agentic` ya excluye `agent_excluded`/`restricted`/`quarantined` (un binding autorizado NUNCA ve docs sensibles).
- Read-detail con **anti-oracle 404** (predicado local `isDocumentAgenticallyVisible` que espeja el filtro agéntico del SQL). Read-only V1. Sin SQL/Notion directo (lint `greenhouse/no-direct-knowledge-chunk-query`).

El MCP server (`src/mcp/greenhouse/**`) consume este lane (2 tools + 1 resource) — ver `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md` Delta 2026-06-12 (MCP).

## Delta 2026-06-03 — Full API parity como principio de producto/plataforma

ADR canonico: `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

Greenhouse adopta **full API parity** como principio rector:

> Toda capacidad que pueda ejecutarse dentro de Greenhouse debe poder ejecutarse, o tener un camino planificado para ejecutarse, mediante un contrato programatico gobernado.

La decision no significa exponer cada boton de la UI como endpoint. Significa que la UI, futuras apps, agentes, MCP adapters, sister platforms, CLIs y runbooks deben converger sobre primitives canonicas server-side y contratos API versionables.

Reglas:

- La UI no es source of truth de logica de negocio; debe consumir commands/readers/projections canonicos.
- Una capacidad nueva debe declarar el camino programatico esperado: Product API interna, `api/platform/app/*`, `api/platform/ecosystem/*`, MCP downstream, CLI/runbook, o follow-up explicito si queda temporalmente UI-only.
- Un write programatico debe tener command semantics explicita, authorization tenant-safe, audit/outbox cuando aplique, idempotencia si puede reintentarse, errores sanitizados y observabilidad.
- Los contratos API modelan aggregates, resources y commands; no componentes, tabs, botones ni handlers visuales.
- Las excepciones UI-only deben ser temporales, justificadas, reversibles y trazables a task/ADR si la capacidad tiene valor operativo.

Consecuencia practica:

- Las nuevas features no estan "cerradas" si solo existen como UI y su dominio requiere automatizacion, integracion, agente, recovery o app client.
- Las rutas de producto existentes pueden seguir conviviendo, pero las capacidades estables y reutilizables deben migrar progresivamente hacia API Platform contracts y adapters downstream.

---

## Delta 2026-04-26 — TASK-672 aterriza Platform Health V1 contract

Aterriza el contrato `platform-health.v1`, primer endpoint API Platform pensado para preflight programático de agentes (MCP, Teams bot, CI). Compone Reliability Control Plane + Operations Overview + runtime checks + integration readiness + synthetic monitoring + webhook delivery + posture en una sola respuesta read-only con timeouts per-source.

- **Rutas**: `GET /api/admin/platform-health` (admin lane, payload completo) + `GET /api/platform/ecosystem/health` (ecosystem lane, summary redactado).
- **Composer**: `src/lib/platform-health/composer.ts`. 7 sources via `Promise.all` con `withSourceTimeout` per-source. Cache in-process 30s per audience. Una fuente caída → `degradedSources[]` honesto, NUNCA 5xx.
- **Helpers reusables**: `src/lib/observability/redact.ts` (sanitizer canónico — usar antes de exponer cualquier `last_error`), `src/lib/platform-health/with-source-timeout.ts` (wrapper timeout/fallback que TASK-657 hereda), `safe-modes.ts` (6 booleanos determinísticos), `recommended-checks.ts` (catálogo declarativo de runbooks).
- **Audience-aware**: la lane admin devuelve evidencia + degraded source error details. La ecosystem trim a 160 chars por issue + `evidenceRefs[]` vacío hasta que TASK-658 cierre el bridge `platform.health.detail`.
- **Entitlements**: `platform.health.read` y `platform.health.detail` declarados en `ENTITLEMENT_CAPABILITY_CATALOG`. V1 enforcement vía route group + scope binding (sin runtime cap check hasta TASK-658).
- **Documentación**: ver §22 abajo, doc funcional en `docs/documentation/plataforma/platform-health-api.md`, schema OpenAPI en `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml#components.schemas.PlatformHealthV1`.
- **Tests**: 47 nuevos cubriendo composer, safe-modes, redaction, with-source-timeout, recommended-checks. Suite completa 2277/2282 pass tras el merge.

Habilitadores downstream:

- TASK-647 (MCP read-only adapter) puede agregar tool `get_platform_health` envolviendo el contrato.
- TASK-657 (degraded modes / dependency health) hereda `withSourceTimeout` y la taxonomía `confidence`/`sourceFreshness`.
- TASK-658 (resource authorization bridge) activa enforcement de las dos capability keys ya declaradas.
- TASK-660 (OpenAPI stable contract) promueve este schema a stable.
- TASK-671 (Teams bot) consume `safeModes.notifySafe` antes de enviar alertas.

---

## Delta 2026-04-26 — TASK-617.4 publica Developer API Documentation Portal

- `/developers/api` pasa a ser el entrypoint publico developer-facing de la API Platform.
- El framing canonico cambia de `Integrations API` a `Greenhouse API Platform`, con lanes explicitas:
  - `ecosystem`
  - `app`
  - event control plane
  - legacy `integrations/v1`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md` y `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml` nacen como artefactos derivados developer-facing para el estado runtime actual.
- El OpenAPI de platform se marca como preview: cubre rutas y auth principales, pero schema generation automatica queda como follow-up.
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml` sigue siendo el contrato machine-readable estable del carril legacy/transicional.

## Delta 2026-04-26 — TASK-617.1/617.2 recupera hardening REST y lane first-party app

- `api/platform/ecosystem/*` ya usa metadata de paginación uniforme (`meta.pagination`), headers de rate limit con `remaining/reset`, soporte selectivo de freshness (`ETag` / `Last-Modified`) y tests de contrato focalizados.
- Nace la lane first-party `api/platform/app/*`:
  - `POST /api/platform/app/sessions` crea una sesión app user-scoped con access token corto y refresh token durable hasheado.
  - `PATCH /api/platform/app/sessions` rota el refresh token.
  - `DELETE /api/platform/app/sessions/current` revoca la sesión actual.
  - `GET /api/platform/app/context`, `/home` y `/notifications` exponen los primeros resources compactos para mobile.
  - `POST /api/platform/app/notifications/:id/read` y `/notifications/mark-all-read` son commands explícitos acotados.
- Runtime persistente nuevo:
  - `greenhouse_core.first_party_app_sessions`
  - `greenhouse_core.api_platform_request_logs`
- Regla canónica:
  - `ecosystem` sigue siendo server-to-server con `sister_platform_consumers`.
  - `app` es first-party user-authenticated, rehidrata tenant/access por usuario y no consume rutas web internas como contrato móvil.
  - La app móvil prevista (`React Native`) debe usar `api/platform/app/*` y no `/api/home/*` ni rutas SSR/web internas.

## Delta 2026-04-26 — TASK-617.3 aterriza el Event Control Plane ecosystem-facing

- `api/platform/ecosystem/*` ya expone el plano de control de eventos sin mover el transport raw:
  - `GET /event-types`
  - `GET/POST /webhook-subscriptions`
  - `GET/PATCH /webhook-subscriptions/:id`
  - `GET /webhook-deliveries`
  - `GET /webhook-deliveries/:id`
  - `POST /webhook-deliveries/:id/retry`
- El transport sigue siendo `src/lib/webhooks/**`, `/api/webhooks/*` y `/api/cron/webhook-dispatch`.
- Las subscriptions creadas por el control plane guardan ownership ecosystem-facing en `greenhouse_sync.webhook_subscriptions`:
  - `sister_platform_consumer_id`
  - `sister_platform_binding_id`
  - `greenhouse_scope_type`
  - `organization_id`, `client_id`, `space_id`
- Regla canónica:
  - consumers externos solo ven subscriptions/deliveries propias del consumer + binding resuelto
  - legacy/internal subscriptions sin owner quedan fuera del control plane ecosystem-facing
  - retry es un command de control plane que reprograma delivery; no envía HTTP inline ni reemplaza al dispatcher

## 1. Objetivo

Formalizar la arquitectura canónica de la `API platform` de Greenhouse para que el portal deje de crecer como una suma de rutas aisladas y pase a operar una capa de contratos consistente, robusta, resiliente, segura y escalable para:

- surfaces internas del propio portal
- first-party clients como futuras apps `iOS` y `Android`
- consumers ecosystem/server-to-server
- sister platforms como `Kortex`
- futuros adapters `MCP`
- una futura API pública selectiva cuando el dominio realmente lo justifique

La idea central es esta:

> Greenhouse no debe tratar la API como un detalle de cada módulo. Debe tratarla como una capability de plataforma con reglas uniformes de auth, versionado, observabilidad, resiliencia, tenancy safety y evolución contractual.

---

## 2. Estado actual del repo

Hoy el repo ya tiene piezas reales de una API platform, pero aún no una capa uniforme.

### 2.1 Lo que sí existe

- Rutas machine-to-machine bajo `/api/integrations/v1/*`
- Un carril endurecido y binding-aware para sister platforms bajo `/api/integrations/v1/sister-platforms/*`
- Auth reusable de integración en:
  - `src/lib/integrations/integration-auth.ts`
- Auth reusable de sister platforms en:
  - `src/lib/sister-platforms/external-auth.ts`
- Runtime persistente para bindings, consumers, request logs y rate limiting en:
  - `greenhouse_core.sister_platform_bindings`
  - `greenhouse_core.sister_platform_consumers`
  - `greenhouse_core.sister_platform_request_logs`
- Shared layer de API Platform en:
  - `src/lib/api-platform/core/**`
  - `src/lib/api-platform/resources/**`
- Lane canonica `ecosystem` en:
  - `src/app/api/platform/ecosystem/**`
- Lane first-party `app` en:
  - `src/app/api/platform/app/**`
- Event control plane en:
  - `src/app/api/platform/ecosystem/event-types`
  - `src/app/api/platform/ecosystem/webhook-subscriptions/**`
  - `src/app/api/platform/ecosystem/webhook-deliveries/**`
- Developer entrypoint publico en:
  - `src/app/(blank-layout-pages)/developers/api/page.tsx`
- Muchas rutas de dominio consolidadas para UI interna y producto

### 2.2 Lo que todavía no existe

- una `API platform` shared y uniforme para todos los dominios de Greenhouse
- una taxonomía completa y granular de degraded modes por dominio
- una capability shared de idempotencia para writes
- generacion automatica de OpenAPI desde schemas runtime
- una API publica anonima o self-service para developers externos
- adapters MCP downstream sobre todos los contratos estables

### 2.3 Lectura del codebase

El estado actual del código muestra tres realidades distintas:

1. `api/platform/ecosystem/*` ya funciona como lane canonica binding-aware.
2. `api/platform/app/*` ya funciona como foundation first-party user-authenticated.
3. `integrations/sister-platforms` sigue funcionando como carril legacy endurecido.
4. muchas rutas internas siguen resolviendo auth + payload + errores inline
5. los backends de lectura no son homogéneos:
   - `PostgreSQL / greenhouse_serving` domina en dominios nuevos o ya consolidados
   - `BigQuery` todavía aparece en carriles externos legacy como `integrations/v1`

Consecuencia:

> La `API platform` nueva no debe nacer como proxy de rutas existentes ni como rename cosmético de `/api/integrations/v1/*`. Debe nacer como una capa shared nueva montada sobre readers/adapters por aggregate.

---

## 3. Documentos absorbidos por esta arquitectura

Desde este documento:

- `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`

quedan absorbidos a nivel de source of truth por esta spec.

Eso significa:

- la decisión arquitectónica canónica de API vive aquí
- `docs/api/*` pasan a ser documentos derivados, de referencia operativa o handoff para consumers puntuales
- el OpenAPI YAML existente:
  - `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
  sigue siendo un artefacto machine-readable válido del carril actual, pero ya no debe tomarse como sustituto de la arquitectura general de la plataforma

Regla nueva:

> Si un documento API futuro contradice esta spec, debe tratarse como documento derivado desalineado y corregirse; no al revés.

---

## 4. Problemas que esta arquitectura corrige

Sin una `API platform` explícita, Greenhouse corre estos riesgos:

- crecimiento de rutas con auth inconsistente
- payloads atados a una surface UI en vez de a aggregates canónicos
- observabilidad desigual entre familias de API
- retries inseguros en writes mutativos
- polling excesivo o contratos sin cursores/versionado claros
- acoplar adapters `MCP` a rutas ad hoc en vez de a contratos estables
- reexponer drift interno de `BigQuery` / `Postgres` / mirrors externos como si fuera contrato público

La `API platform` existe para prevenir eso.

---

## 5. Principios rectores

### 5.1 Contract-first, not route-first

La unidad de diseño no es la ruta aislada, sino el contrato estable.

### 5.2 Aggregate-first, not table-first

La platform API no debe exponer tablas, mirrors ni joins raw como contrato.

Debe exponer resource models canónicos de aggregates como:

- `organization`
- `organization_workspace`
- `person`
- `capability_surface`
- `operational_readiness`
- futuros `artifact`, `issue`, `task` para `Ops Registry`

### 5.3 Read before write

Las primeras lanes ecosystem-facing deben ser read-only por defecto.

Los writes cross-system requieren:

- command semantics explícita
- idempotencia
- auditabilidad
- tenancy-safe authorization

### 5.4 MCP is downstream

`MCP` no es la foundation de la plataforma.

El orden correcto es:

1. resource adapters
2. stable API contract
3. observability + auth + degraded modes
4. MCP adapter downstream

### 5.5 Tenant safety is a hard rule

Ningún consumer ecosystem-facing debe resolver tenancy por labels, nombres visibles o heurísticas comerciales.

### 5.6 Degraded > opaque 500

Cuando una dependencia falle o un backend no esté listo, la platform API debe intentar responder de forma explícita y degradada si el caso lo permite, en vez de colapsar en un error opaco.

### 5.7 Versioning is explicit

La evolución del contrato debe ser gobernada; no implícita.

### 5.8 Full API parity

Toda capacidad que pueda ejecutarse dentro de Greenhouse debe tener o planificar un equivalente programatico. La paridad se evalua contra la capacidad de negocio, no contra la forma visual de la pantalla.

Por lo tanto:

- primero se diseña la primitive server-side y su command/read contract;
- luego la UI, apps, integraciones, agentes y MCP adapters consumen ese contrato segun su lane;
- cualquier excepcion UI-only queda documentada como deuda temporal, no como estado objetivo.

---

## 6. Modelo de capas

La plataforma debe operar sobre cuatro capas claras.

### 6.1 Product API layer

Rutas orientadas a UI o workflows internos del portal, por ejemplo:

- `/api/organizations/*`
- `/api/finance/*`
- `/api/hr/*`
- `/api/admin/*`

Estas rutas pueden seguir existiendo aunque no todas sean ecosystem-facing.

### 6.2 API Platform shared layer

Capability shared nueva:

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`

Responsabilidades:

- auth/context platform-wide
- version negotiation
- response envelope
- error taxonomy
- idempotency
- pagination/cursor helpers
- request logging
- degraded-mode contracts

### 6.3 Platform route layer

Surface estable de la API platform:

- `src/app/api/platform/**`

Aquí viven las rutas que sí son contrato de plataforma y no detalle accidental de un módulo.

### 6.4 MCP / agent adapters

Adapters downstream montados sobre la API platform o sobre sus adapters shared, no sobre rutas de producto ad hoc.

---

## 7. Namespaces canónicos

La `API platform` debe separar explícitamente sus lanes.

### 7.1 Internal

`/api/platform/internal/*`

Uso:

- portal interno
- operators
- services internos
- tooling operacional controlado

Auth:

- sesión Greenhouse / service auth interno según el caso

### 7.2 Ecosystem

`/api/platform/ecosystem/*`

Uso:

- sister platforms
- workers externos controlados
- integraciones ecosystem-facing
- futuros adapters MCP read-only

Auth:

- consumer credentials
- scope explícito
- bindings explícitos cuando aplique

### 7.3 App

`/api/platform/app/*`

Uso:

- apps first-party `iOS`
- apps first-party `Android`
- futuros clients first-party no web que necesiten un contrato estable y desacoplado del portal

Contexto actual:

- la app móvil prevista hoy para Greenhouse es `React Native`
- esta spec lo trata como supuesto vigente de consumer, no como dependencia rígida del contrato API

Auth:

- auth de usuario first-party
- sesión o tokens móviles gobernados por Identity Access
- tenancy y permisos resueltos por usuario autenticado, no por consumer token ecosystem

Regla:

- la app móvil no debe depender de rutas internas pensadas para server components o UI web del portal
- debe depender de contratos estables de `api/platform/*`

### 7.4 Public

`/api/platform/public/*`

No se declara como lane V1 inmediata.

Solo debe existir cuando haya:

- ownership de producto claro
- SLA de contrato
- scopes y billing/governance definidos

---

## 8. Objetivo RESTful

### 8.1 Posición canónica

La `API platform` de Greenhouse debe evolucionar hacia una API **RESTful**.

Eso significa, en términos prácticos:

- recursos identificables por URL
- métodos HTTP con semántica consistente
- contratos uniformes de request/response
- stateless auth por request
- uso correcto de status codes, headers y paginación
- writes seguros, idempotentes y auditables

Greenhouse no necesita perseguir una REST “académicamente pura” si eso complica la operación.

Sí necesita una API:

- resource-oriented
- predecible
- tenant-safe
- auditable
- evolutiva sin romper consumers

### 8.2 Estado actual

Hoy la lane `api/platform/ecosystem/*` ya es **REST-like** pero todavía no es una REST API madura completa.

Lo que ya cumple:

- recursos legibles por URL
- lane stateless y machine-to-machine
- `GET` read-only consistente
- versionado por header
- envelope uniforme
- auth/context por request
- request IDs y headers operativos

Lo que todavía falta para llamarla RESTful de forma fuerte:

- métodos mutativos (`POST`, `PUT`, `PATCH`, `DELETE`) con semántica estable
- política uniforme de status codes para create/update/delete
- paginación consistente en todas las colecciones
- headers/contratos de rate limiting más completos
- soporte explícito para conditional requests y caching donde tenga sentido
- deprecación/versionado operado end-to-end

### 8.3 Regla de diseño

Greenhouse debe modelar primero recursos y después comandos.

Eso implica:

- evitar rutas RPC disfrazadas como si fueran resources
- no usar `POST` genérico para todo
- usar `PATCH` para cambios parciales cuando la semántica sea clara
- reservar `DELETE` para delete real o deprecación claramente documentada

Cuando una operación sea más comando que recurso, debe quedar explícita como command endpoint auditable y no fingirse como un CRUD trivial.

### 8.4 Métodos HTTP objetivo

La `API platform` debe soportar esta semántica objetivo:

- `GET`
  - lectura de resources o colecciones
- `POST`
  - create o command explícito con idempotencia
- `PUT`
  - replace completo cuando el recurso realmente lo soporte
- `PATCH`
  - actualización parcial
- `DELETE`
  - eliminación lógica o física solo cuando el contrato sea inequívoco
- `HEAD`
  - opcional cuando aporte valor a consumers o tooling
- `OPTIONS`
  - soporte técnico/CORS cuando aplique

### 8.5 Brechas actuales para llegar a RESTful

Las brechas concretas hoy son:

1. **Writes de negocio siguen cerrados**
   - `ecosystem` ya tiene commands acotados de event control plane
   - todavía no existen command endpoints amplios para mutar recursos de negocio

2. **Idempotencia transversal pendiente**
   - los futuros writes de dominio deben exigir idempotency key y auditabilidad
   - aun no existe helper/runtime compartido en `src/lib/api-platform/**`

3. **OpenAPI de platform todavia es preview**
   - existe documentacion developer-facing y un YAML preview
   - falta generacion automatica o validacion schema-first para todos los payloads

4. **Freshness selectiva**
   - `ETag` / `Last-Modified` existe donde la frescura es segura
   - no debe prometerse como universal para app o event control plane

5. **Semántica mutativa no definida**
   - el event control plane ya usa create/update/retry commands
   - la semantica de writes de negocio queda pendiente antes de abrir mas dominios

6. **Relación legacy vs REST nueva aún transicional**
   - `/api/integrations/v1/*` sigue viva y no toda su semántica está alineada todavía con el carril nuevo

### 8.6 Secuencia correcta para cerrar la brecha

Greenhouse no debe intentar “volverse RESTful” de golpe.

La secuencia correcta es:

1. consolidar read resources y paginación
2. cerrar error/status code policy
3. abrir `POST` idempotentes y auditables
4. abrir `PATCH` donde el dominio ya sea estable
5. agregar conditional requests y caching selectivo
6. recién después evaluar `DELETE`, public API amplia o MCP downstream más rico

### 8.7 Criterio de salida

Greenhouse podrá decir que su `API platform` es RESTful de forma sólida cuando:

- la lane nueva ya no sea solo read-only
- los resources principales tengan semántica uniforme de colección y detalle
- los writes sean idempotentes y auditables
- la paginación y status code policy sean consistentes
- el carril nuevo sea la referencia principal para consumers ecosystem-facing

### 8.8 Objetivo completo de plataforma API

El objetivo canónico de Greenhouse no es solo una REST API de lectura/escritura.

El objetivo completo es una **API platform convergida** con cuatro piezas:

1. `RESTful resource API`
   - resources y command endpoints HTTP claros
2. `First-party client surface`
   - contrato estable para mobile app y futuros clients propios
3. `Event delivery / webhooks`
   - delivery outbound y recepción inbound gobernados como capability de plataforma
4. `MCP downstream`
   - adapters montados sobre contratos ya estabilizados

En otras palabras:

- REST es una parte del objetivo
- first-party app support es otra parte del objetivo
- webhooks/event delivery son otra parte del objetivo
- MCP viene después, no antes

### 8.8.1 First-party mobile rule

Si Greenhouse lanza app `iOS` o `Android`, esa app debe tratarse como consumer oficial de la `API platform`.

Eso implica:

- no acoplarla a rutas internas del portal diseñadas para la web
- no usar payloads accidentales de UI como contrato móvil
- diseñar resources y commands explícitos para mobile workflows
- garantizar auth, caching, paginación y performance compatibles con redes móviles

El hecho de que la app prevista hoy sea `React Native` refuerza además:

- la conveniencia de contratos HTTP predecibles
- OpenAPI usable
- generación o compartición de types TypeScript
- payloads compactos y ergonómicos para clientes JS/TS móviles

La `API platform` existe también para servir de backend contract de first-party clients, no solo de integraciones externas.

### 8.9 Estado actual del objetivo completo

Hoy Greenhouse ya tiene partes importantes de ese objetivo, pero todavía distribuidas en capas distintas.

#### Ya existe

- lane nueva `api/platform/ecosystem/*` read-only y REST-like
- outbox canónico en `greenhouse_sync.outbox_events`
- inbound webhooks con endpoint genérico
- outbound webhook delivery con subscriptions, deliveries, attempts y dead-letter semantics
- observabilidad interna básica de inbox/deliveries

#### Todavía falta converger

- que exista una lane first-party clara para mobile app
- que la estrategia de auth móvil quede separada del lane ecosystem server-to-server
- que webhooks/event delivery queden modelados explícitamente como parte de la `API platform`
- que exista un contrato canónico ecosystem-facing para subscriptions, deliveries y firmas
- que REST y event delivery compartan de forma explícita:
  - versionado
  - error taxonomy
  - observabilidad
  - reglas de seguridad
  - lifecycle/deprecación

### 8.10 Brechas concretas para alcanzar el objetivo completo

Además de las brechas REST descritas arriba, faltan estas:

1. **First-party mobile lane todavía no existe**
   - la arquitectura ya la necesita
   - el runtime todavía no la implementa

2. **Auth móvil first-party todavía no está formalizada dentro de la platform**
   - falta definir estrategia de sesión/tokens para mobile
   - falta cerrar cómo se resuelven refresh, revocación y device posture cuando aplique

3. **Webhooks todavía no viven bajo `api/platform/*`**
   - existen como capability operativa del repo
   - todavía no son una lane convergida de platform API

4. **Subscriptions y deliveries no están expuestos como resources canónicos de plataforma**
   - el runtime existe
   - el contrato ecosystem-facing todavía no

5. **Event contract no está gobernado junto a la lane nueva**
   - faltan reglas más explícitas para:
     - envelope versioning
     - firma y auth outbound
     - retry policy declarada como contrato
     - dead-letter semantics canónicas

6. **REST y webhooks aún no comparten un control plane unificado**
   - hoy se apoyan en foundations sanas pero separadas
   - todavía falta una historia única de platform API para consumers externos

### 8.11 Secuencia correcta para cerrar el objetivo completo

La secuencia canónica debería ser:

1. cerrar la madurez REST del lane `api/platform/ecosystem/*`
2. definir la lane `app` y la estrategia first-party mobile
3. formalizar webhooks/event delivery como parte de `api-platform`
4. converger observabilidad, seguridad, errores y versionado entre esas capas
5. recién después expandir commands amplios, public API o MCP más rico

### 8.12 Regla operativa

Greenhouse no debe tratar “REST” y “webhooks” como programas separados y competidores.

Debe tratar la `API platform` como una capability que sirve tres clases de consumers:

- first-party apps para experiencias propias como mobile
- REST para consultar y comandar
- webhooks/event delivery para reaccionar a cambios

El objetivo no se considera completo mientras una de esas capas siga viviendo como capability útil pero todavía no convergida bajo la disciplina de plataforma nueva.

---

## 9. Política de versionado

### 9.1 Regla canónica

Greenhouse debe preferir versionado explícito por header para la API platform, con una default version documentada.

Header recomendado:

- `X-Greenhouse-Api-Version: 2026-04-25`

### 9.2 Por qué no solo `/v1`

El repo todavía está convergiendo múltiples lanes y backends. Un header versionado por fecha permite:

- congelar comportamiento breaking sin multiplicar paths prematuramente
- mantener additive changes sin forks innecesarios
- alinear SDK/types/tests por versión

### 9.3 Reglas de cambio

Se consideran `breaking changes`:

- remover o renombrar un campo de respuesta
- volver obligatorio un parámetro antes opcional
- cambiar auth/scopes requeridos
- cambiar el tipo de un campo
- cambiar semántica de tenancy o visibility

Se consideran `additive changes`:

- agregar un campo opcional
- agregar un endpoint
- agregar headers opcionales
- agregar enum values no disruptivos

### 9.4 Soporte

Cada nueva versión breaking de la API platform debe declarar explícitamente:

- versión nueva
- versión default
- ventana de soporte de la versión anterior

---

## 10. Modelo de autenticación

La platform API no debe mezclar auth humana del portal con auth machine-to-machine.

### 10.1 Internal auth

Usa:

- sesión NextAuth
- tenant context
- role codes / route groups / views / entitlements según corresponda

### 10.2 Ecosystem auth

Debe generalizar el patrón ya implementado en `sister-platforms`:

- token por consumer
- hash persistido, no token en claro
- `credential_status`
- expiración opcional
- allowlist de scope types
- rate limits por consumer

### 10.3 Binding-aware auth

Para requests ecosystem-facing que necesiten resolver tenancy externa:

- `externalScopeType`
- `externalScopeId`

La request solo puede servirse si:

- el consumer es válido y activo
- el binding resuelve un scope activo
- ese scope está permitido para el consumer

### 10.4 Public auth

No aprobada por defecto en V1.

Si aparece, debe usar credenciales, scopes y observabilidad propias, no reciclar tokens legacy de integración.

---

## 11. Response contract

La platform API debe usar un envelope uniforme.

### 11.1 Response envelope

Shape recomendada:

```json
{
  "requestId": "req_...",
  "servedAt": "2026-04-25T18:30:00.000Z",
  "apiVersion": "2026-04-25",
  "status": "ok",
  "data": {},
  "meta": {},
  "errors": []
}
```

### 11.2 Headers mínimos

- `x-greenhouse-request-id`
- `cache-control`
- `x-greenhouse-api-version`
- rate limit headers cuando aplique:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### 11.3 Error contract

Los errores deben ser machine-readable.

Shape recomendada:

```json
{
  "requestId": "req_...",
  "servedAt": "2026-04-25T18:30:00.000Z",
  "apiVersion": "2026-04-25",
  "status": "error",
  "data": null,
  "meta": {},
  "errors": [
    {
      "code": "scope_not_allowed",
      "message": "Resolved binding scope is not allowed for this consumer.",
      "retryable": false
    }
  ]
}
```

---

## 12. Idempotencia

Para que los writes sean robustos y seguros, la platform API debe tratar la idempotencia como contrato nativo.

### 12.1 Header

- `Idempotency-Key`

### 12.2 Regla

Todos los `POST`, `PUT` o `PATCH` mutativos de la API platform deben poder aceptar idempotency key.

### 12.3 Semántica

La plataforma debe:

- persistir la primera respuesta final asociada a la key
- devolver el mismo resultado si llega el mismo request otra vez
- rechazar el reuse de una key con payload distinto
- expirar las keys según política documentada

### 12.4 Alcance V1

No es obligatorio retrofitear todas las rutas históricas del repo.

Sí es obligatorio en nuevos command endpoints de `api/platform/*`.

---

## 13. Paginación y cursores

Los endpoints de colección deben evitar dumps sin control.

### 13.1 Regla

Toda colección ecosystem-facing debe soportar paginación explícita.

### 13.2 Contratos aceptados

- cursor-based preferido
- page/per_page permitido como compat temporal donde ya exista ese patrón

### 13.3 Respuesta

El contrato debe incluir:

- items
- page info / next cursor
- link headers cuando aplique

### 13.4 No-goal

Los consumers no deben inferir o construir manualmente URLs futuras; deben consumir cursores o links devueltos por la plataforma.

---

## 14. Observabilidad

La API platform debe ser observable desde el día 1.

### 14.1 Mínimos por request

- request ID
- consumer principal o tenant actor
- route key
- auth lane usada
- scope resuelto
- response status
- duration
- degraded flag
- backend provenance

### 14.2 Provenance

Toda response debería poder declarar, si aporta valor operativo:

- `postgres_serving`
- `postgres_truth`
- `bigquery`
- `external_facade`
- `derived_cache`

### 14.3 Error taxonomy

Los errores deben tipificarse de forma estable, por ejemplo:

- `unauthorized`
- `forbidden`
- `missing_scope`
- `scope_not_allowed`
- `not_found`
- `rate_limited`
- `dependency_timeout`
- `backend_unavailable`
- `schema_drift`
- `validation_failed`
- `idempotency_conflict`
- `internal_error`

---

## 15. Resiliencia y degraded modes

### 15.1 Regla

La platform API no debe fingir consistencia cuando una dependencia no está lista, pero tampoco debe colapsar innecesariamente en `500`.

### 15.2 Patrones admitidos

- fallback de serving materializado a truth reader cuando sea seguro
- respuesta parcial/degradada con metadata explícita
- timeouts conservadores hacia providers externos
- no bloquear un resource completo por metadata secundaria no crítica

### 15.3 Patrones no admitidos

- silent fallback que cambie semántica sin avisar
- mezclar en una misma response datos frescos y stale sin metadata
- esconder schema drift tras mensajes genéricos

---

## 16. Política de backend

La platform API debe desacoplar el contrato externo del backend real.

### 16.1 Prioridad de lectura

1. `PostgreSQL / greenhouse_serving` cuando exista serving canónico
2. `PostgreSQL truth layer` cuando el aggregate aún no tenga serving derivado
3. `BigQuery` solo como carril legacy o transición explícita
4. facades externas dedicadas cuando el dato deba leerse live desde un sistema hermano o integración dedicada

### 16.2 Regla dura

Un consumer de plataforma no debe tener que saber si un resource vino de `BigQuery` o `Postgres` para usar el contrato.

### 16.3 Consecuencia

La platform API debe montarse sobre resource adapters propios, no sobre SQL inline en cada route ni sobre proxies de rutas legacy.

---

## 17. Resource adapters canónicos

La capa técnica objetivo es:

- `src/lib/api-platform/core/**`
- `src/lib/api-platform/resources/**`

### 17.1 `core`

Debe incluir al menos:

- auth
- request context
- version negotiation
- response helpers
- error types
- idempotency
- pagination
- observability
- rate limit helpers

### 17.2 `resources`

Debe incluir adapters por aggregate, por ejemplo:

- `organizations`
- `organization-workspaces`
- `people`
- `capabilities`
- `readiness`
- futuro `ops-registry`

Cada adapter decide:

- qué store/reader consume
- qué backend usa
- cómo normaliza el resource model
- cómo declara degraded mode

---

## 18. Lanes vigentes y migración

### 18.1 Lane legacy vigente

`/api/integrations/v1/*` sigue siendo un carril válido y operativo.

### 18.2 Nueva regla

No debe seguir creciendo como namespace catch-all de la plataforma.

### 18.3 Camino correcto

1. mantener `integrations/v1` estable mientras tenga consumers
2. crear `api/platform/ecosystem/*` como lane nueva y aditiva
3. mover nuevos contratos de plataforma a esa lane
4. dejar `integrations/v1` como surface legacy/transicional hasta convergencia real

---

## 19. Primer slice recomendado

La primera iteración de la platform API debe ser deliberadamente chica.

### 19.1 Foundation

- request context shared
- version header
- response envelope
- error taxonomy
- observability/rate limit headers
- idempotency foundation para futuros writes

### 19.2 Endpoints iniciales

- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/integration-readiness`

### 19.3 No-goals del primer slice

- abrir una API pública genérica
- retrofitear todas las rutas históricas del repo
- exponer writes cross-platform amplios
- construir el MCP completo antes de estabilizar la API

---

## 20. Relación con sister platforms y Kortex

Esta arquitectura no reemplaza:

- `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`

Las complementa.

Distribución correcta:

- `SISTER_PLATFORMS_*`
  - define peer-system contract, tenancy binding y governance cross-platform
- `KORTEX_*`
  - define el anexo concreto de esa integración
- `API_PLATFORM_ARCHITECTURE_V1`
  - define cómo Greenhouse expone sus contratos API como capability de plataforma reusable

---

## 21. Relación con Data Node y Ops Registry

### 21.1 Data Node

`TASK-040` sigue vigente en su regla clave:

> `MCP` es downstream de una API estable.

Esta arquitectura la reafirma.

### 21.2 Ops Registry

`EPIC-003` y `GREENHOUSE_OPS_REGISTRY_ARCHITECTURE_V1.md` quedan alineados así:

- `Ops Registry` es un dominio/platform capability
- su surface humana vive en el portal
- su surface agente/API/MCP debe montarse sobre esta disciplina de platform API

### 21.3 MCP

La arquitectura específica del server MCP vive en:

- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`

Regla canónica:

- esta spec define la dependencia y la secuencia
- la spec de MCP define el server, sus surfaces y su write policy

---

## 22. Plano de eventos canónico

La convergencia de webhooks y event delivery dentro de la `API platform` no debe rehacer el transport layer que ya existe.

Debe agregar un control plane canónico ecosystem-facing encima del runtime descrito en `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`.

### 22.1 Distinción obligatoria

Greenhouse debe separar explícitamente:

- `transport boundary`
  - recepción y entrega HTTP real de webhooks
- `event control plane`
  - resources y commands para administrar subscriptions, deliveries, retries y observabilidad

Regla:

- el transport inbound puede seguir viviendo en `/api/webhooks/*`
- el control plane nuevo debe vivir en `/api/platform/*`

### 22.2 Resources canónicos de event plane

La `API platform` debe tratar como resources oficiales, al menos:

- `event-types`
- `webhook-subscriptions`
- `webhook-deliveries`
- `webhook-delivery-attempts`
- `webhook-endpoints` cuando la recepción inbound deba administrarse como asset del consumer

Los nombres finales pueden refinarse, pero el modelo debe mantenerse resource-oriented.

### 22.3 Surface ecosystem recomendada

El carril `ecosystem` debería converger a algo como:

- `GET /api/platform/ecosystem/event-types`
- `GET /api/platform/ecosystem/webhook-subscriptions`
- `GET /api/platform/ecosystem/webhook-subscriptions/:id`
- `POST /api/platform/ecosystem/webhook-subscriptions`
- `PATCH /api/platform/ecosystem/webhook-subscriptions/:id`
- `GET /api/platform/ecosystem/webhook-deliveries`
- `GET /api/platform/ecosystem/webhook-deliveries/:id`
- `POST /api/platform/ecosystem/webhook-deliveries/:id/retry`

Regla:

- `POST` y `PATCH` viven en el control plane
- el POST real del webhook transport no reemplaza a esos resources

### 22.4 Envelope de evento

El contract de evento debe seguir una disciplina uniforme con la platform API.

Campos mínimos esperados:

- `eventId`
- `eventType`
- `eventVersion`
- `occurredAt`
- `publishedAt`
- `scope`
- `data`
- `meta`

`eventVersion` y `apiVersion` pueden evolucionar por separado si hace falta, pero ambos deben ser explícitos.

### 22.5 Seguridad y retries

La convergencia del event plane debe preservar estas reglas:

- firma outbound obligatoria cuando exista secreto configurado
- retries declarados como contrato operativo documentado
- dead-letter visible y reintenable desde control plane
- ningún consumer externo debe leer tablas `greenhouse_sync.*` como integración oficial

### 22.6 Regla canónica nueva

Webhooks y event delivery sí son parte de la `API platform`, pero solo a través de su control plane convergido; no a través del transport raw ni de acceso directo a tablas.

---

## 23. Cierre de diseño pendiente ya resuelto

Para evitar que la `API platform` siga creciendo con ambigüedad, desde esta spec quedan resueltas estas decisiones arquitectónicas.

### 23.1 Resource canon V1.1

Los resources canónicos base de la plataforma son:

- `context`
- `organization`
- `organization-workspace`
- `person`
- `capability-surface`
- `integration-readiness`
- `event-type`
- `webhook-subscription`
- `webhook-delivery`

Eso significa:

- `capabilities` expresa catálogo/asignación de capability surface, no UI payload arbitrario
- `integration-readiness` expresa estado operativo de integraciones y bindings, no KPIs analíticos inline
- el event plane también entra al canon de plataforma, no queda como subsistema aparte

### 23.2 Write model V1.1

La política canónica de mutaciones queda así:

- `POST`
  - create o command explícito
- `PATCH`
  - cambios parciales de estado o metadata
- `PUT`
  - excepcional; solo para replace completo de recursos verdaderamente reemplazables
- `DELETE`
  - desaconsejado por defecto; preferir `archive`, `suspend`, `deprecate` o `disable` cuando esa sea la semántica real

Greenhouse no debe perseguir CRUD completo como objetivo; debe perseguir commands y resources semánticamente correctos.

### 23.3 Status code policy V1.1

La política uniforme objetivo queda así:

- `200 OK`
  - lectura exitosa o mutación que devuelve representación inmediata
- `201 Created`
  - create exitoso de recurso nuevo
- `202 Accepted`
  - command aceptado pero todavía asíncrono
- `204 No Content`
  - mutación exitosa sin body
- `304 Not Modified`
  - conditional request sin cambios
- `400 Bad Request`
  - request mal formada
- `401 Unauthorized`
  - credencial inválida o ausente
- `403 Forbidden`
  - actor autenticado pero sin permiso/scope
- `404 Not Found`
  - recurso no visible o inexistente dentro del scope
- `409 Conflict`
  - conflicto de estado o idempotencia
- `422 Unprocessable Entity`
  - payload válido sintácticamente pero rechazado por reglas de dominio
- `429 Too Many Requests`
  - rate limit
- `503 Service Unavailable`
  - dependencia o backend no disponible

### 23.4 Deprecation policy V1.1

La convivencia con lanes legacy debe seguir esta disciplina:

- todo contrato nuevo nace en `api/platform/*`
- `integrations/v1` solo crece por compatibilidad o transición explícita
- un endpoint legacy no se considera deprecado hasta que:
  - exista surface equivalente o superior en `api/platform/*`
  - el consumer haya sido identificado
  - exista ventana de migración documentada

### 23.5 SLO y frescura

La `API platform` debe documentar por resource cuál es su expectativa de frescura:

- `live`
- `near-real-time`
- `periodic-materialized`
- `derived-cache`

Regla:

- Greenhouse no debe prometer frescura implícita
- si un resource puede degradarse o venir materializado, eso debe declararse en metadata y documentación

### 23.6 Regla canónica nueva

La `API platform` de Greenhouse queda definida no solo por sus routes, sino por cinco contratos obligatorios:

- resource canon
- write model
- status code policy
- event control plane
- deprecation y freshness discipline

---

## 24. Reglas canónicas nuevas

Desde 2026-04-25 Greenhouse debe operar con estas reglas:

1. Ningún documento en `docs/api/*` es ya la source of truth arquitectónica principal de la plataforma; la arquitectura API canónica vive en `docs/architecture/`.
2. Nuevos contratos ecosystem-facing deben nacer en `api/platform/*`, no seguir engordando `integrations/v1` salvo compat o transición explícita.
3. Nuevos command endpoints de platform API deben soportar idempotencia.
4. Nuevos resources de platform API deben montarse sobre adapters shared por aggregate, no sobre proxies de rutas legacy.
5. `MCP` debe seguir siendo downstream de contratos API estables.
6. `BigQuery` puede seguir existiendo como backend transicional o analítico, pero no debe filtrarse como shape contractual del consumer.
7. Toda capacidad Greenhouse nueva debe evaluar full API parity: si es accionable en UI, debe tener primitive server-side reusable y camino API/app/MCP/CLI o follow-up explicito.

---

## 25. Delta 2026-06-03 — Full API parity queda aceptado

ADR canonico: `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

La decision full API parity queda aceptada como principio transversal de producto/plataforma.

Scope:

- UI interna del portal
- first-party app lane
- ecosystem/server-to-server lane
- MCP adapters
- CLIs y runbooks operativos
- sister platforms y futuras integraciones

No cambia runtime por si sola. Cambia el criterio de diseño y cierre:

- una capacidad visible debe declarar como se automatiza o integra;
- un command debe vivir en primitive canonica antes de exponerse por UI/API;
- el backlog API Platform existente (`TASK-650` a `TASK-661` y tasks hijas) es el carril natural para materializar paridad por dominio.

## 26. Delta 2026-04-25 — Nace la arquitectura canónica de API platform

Se crea `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` como source of truth para la plataforma de APIs de Greenhouse.

Decisiones explícitas:

- `docs/api/GREENHOUSE_API_REFERENCE_V1.md` y `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md` quedan absorbidos por esta arquitectura a nivel canónico
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml` se conserva como artefacto machine-readable del carril vigente, no como spec arquitectónica superior
- la plataforma API correcta para Greenhouse debe nacer como capability shared nueva (`src/lib/api-platform/**` + `src/app/api/platform/**`)
- `integrations/v1` sigue vivo como lane legacy/transicional
- `MCP` queda reafirmado como adapter downstream de una API estable y no como punto de partida

## 27. Delta 2026-04-25 — TASK-616 implementa el primer slice runtime

Ya existe una primera implementación runtime aditiva de la arquitectura:

- foundation nueva en `src/lib/api-platform/**`
- lane nueva read-only en `src/app/api/platform/ecosystem/**`

Endpoints implementados:

- `GET /api/platform/ecosystem/context`
- `GET /api/platform/ecosystem/organizations`
- `GET /api/platform/ecosystem/organizations/:id`
- `GET /api/platform/ecosystem/capabilities`
- `GET /api/platform/ecosystem/integration-readiness`

Decisiones explícitas de este slice:

- `context` queda definido como contexto ecosystem binding-aware del consumer autenticado
- `capabilities` en esta V1 significa catálogo/asignación de tenant capabilities, no runtime data de módulos UI
- `integration-readiness` expresa health/readiness de integraciones y bindings; no pretende ser readiness transversal de toda la plataforma
- el auth/context nuevo reutiliza el modelo seguro de `sister_platform_consumers` + `sister_platform_bindings` + `sister_platform_request_logs` sin romper `/api/integrations/v1/*`
- `integrations/v1` y `integrations/v1/sister-platforms/*` siguen intactos y verificados como lanes legacy/transicionales

## 28. Platform Health V1 contract — preflight programático canónico (TASK-672)

Primer endpoint API Platform pensado para ser consumido por agentes (MCP, Teams bot, CI, scripts, dashboards externos) **antes** de ejecutar acciones sensibles. Reemplaza el patrón anterior donde cada consumer tenía que inferir el estado leyendo 7 endpoints distintos y hacer su propio rollup.

### Por qué existe como contrato y no como query

Antes de TASK-672 había observabilidad pero no contrato:

- `/api/admin/reliability` devolvía datos crudos del Reliability Control Plane, útiles para la UI admin pero no versionados ni redactados.
- `/api/internal/health` devolvía runtime telemetry de bajo nivel (Postgres/BigQuery), pensado para Cloud Run probes — expone secrets indirectos.
- `integration-readiness` devolvía readiness por integración pero no health global ni safe modes.
- Degraded modes existían como principio pero no como respuesta uniforme.

Un agente que quisiera "saber si la plataforma está sana antes de actuar" tenía que:

1. Llamar 4-7 endpoints separados.
2. Manejar cada formato de error distinto.
3. Inferir su propio rollup (cuál módulo importa, cómo combinar señales).
4. Decidir empíricamente qué secrets/PII filtrar.
5. Reintentar cada endpoint independientemente cuando alguno fallaba.

Eso no escala. La solución canónica es exponer **un solo contrato versionado** que componga todas esas fuentes con una semántica operativa (status + safe modes + recommended checks).

### Shape canónica

`PlatformHealthV1` (definido en `src/types/platform-health.ts`):

```typescript
type PlatformHealthV1 = {
  contractVersion: 'platform-health.v1'
  generatedAt: string
  environment: 'development' | 'preview' | 'staging' | 'production' | 'unknown'
  overallStatus: 'healthy' | 'degraded' | 'blocked' | 'unknown'
  confidence: 'high' | 'medium' | 'low' | 'unknown'
  safeModes: {
    readSafe: boolean
    writeSafe: boolean
    deploySafe: boolean
    backfillSafe: boolean
    notifySafe: boolean
    agentAutomationSafe: boolean
  }
  modules: PlatformHealthModule[]
  blockingIssues: PlatformHealthIssue[]
  warnings: PlatformHealthIssue[]
  recommendedChecks: PlatformHealthRecommendedCheck[]
  degradedSources: PlatformHealthDegradedSource[]
}
```

**Garantía de versionado**: solo `contractVersion: 'platform-health.v1'` es estable. Cambios incompatibles bumpean a `v2`. Nuevos campos opcionales se agregan dentro de `v1` sin bump.

### Composer y degradación honesta

El composer (`src/lib/platform-health/composer.ts`) llama 7 fuentes en paralelo con `Promise.all`:

|Fuente|Aporta|Timeout|
|---|---|---|
|`reliability_control_plane`|Modules + signals agregadas|6s|
|`operations_overview`|KPIs operacionales|5s|
|`internal_runtime_health`|Probes Postgres + BigQuery|5s|
|`observability_posture`|Sentry + Slack config|2s|
|`sentry_incidents`|Issues abiertas tagged por dominio|3s|
|`synthetic_monitoring`|Última corrida de probes|3s|
|`integration_readiness`|Estado por integración|4s|

Cada fuente se envuelve en `withSourceTimeout` (ver §15 sobre degraded modes — esta task implementa el patrón concreto). Una fuente caída produce un `SourceResult<T>` con `status='timeout'|'error'|'not_configured'` que el composer traduce a una entrada en `degradedSources[]`. La respuesta nunca es 5xx por una sola fuente.

Cuando el composer detecta `degradedSourceCount >= 3` baja `confidence` a `'low'`. Cuando `>= 1` lo baja a `'medium'`. Esa es la única política de confidence — explícita y testeable.

### Audience-aware redaction

El composer toma un parámetro `audience: 'admin' | 'ecosystem'`:

- **admin**: 5 topIssues por módulo, summary completo (redactado de secrets), `evidenceRefs[]` con paths de evidencia, degraded source error details.
- **ecosystem**: 3 topIssues por módulo, summary trimmed a 160 chars, `evidenceRefs: []`. Esta restricción se levantará cuando TASK-658 cierre el bridge `platform.health.detail`.

La redacción se aplica vía `src/lib/observability/redact.ts`:

- Patterns: JWT, Bearer, GCP secret URI, Sentry DSN, generic `user:pass@host`, query-param secrets, email user portion.
- Helpers: `redactSensitive(string)`, `redactObjectStrings(obj, depth)`, `redactErrorForResponse(err)` (drops stack trace).
- **Reusable más allá de Platform Health**: cualquier endpoint que persista o devuelva strings de error debe pasarlas por aquí. NUNCA loggear `error.stack` directo en payload que cruce un boundary externo.

### Safe modes determinísticos

`src/lib/platform-health/safe-modes.ts` deriva 6 booleanos a partir del estado por módulo + blocking issues:

|Bandera|Regla|
|---|---|
|`readSafe`|cloud module ≤ degraded + sin blocking issues|
|`writeSafe`|readSafe + delivery ≤ degraded + sin blocking en cloud/delivery|
|`deploySafe`|writeSafe + overallStatus ≠ blocked|
|`backfillSafe`|writeSafe + delivery exactamente healthy|
|`notifySafe`|readSafe + sin blocking en webhook_delivery / integration_readiness / cloud|
|`agentAutomationSafe`|overallStatus healthy + cloud healthy + finance/delivery/notion ≤ degraded + zero blocking|

Conservador por diseño: cualquier ambigüedad (módulo missing, fuente unknown) defaultea a `false`. Falsos negativos (decir "no seguro" cuando lo es) son aceptables; falsos positivos (decir "seguro" cuando está roto) no lo son.

### Recommended checks

`src/lib/platform-health/recommended-checks.ts` mantiene un catálogo declarativo de runbooks operativos. Cada check tiene `appliesWhen[]` (set de triggers). El composer construye el set de triggers desde el estado observado (`overall:degraded`, `module:cloud:blocked`, `safe-mode:writeSafe:false`, etc.) y filtra el catálogo. Resultado: la respuesta dice exactamente qué comandos correr.

Patrón reusable: cualquier dashboard futuro que necesite "trigger → catálogo de remediaciones" puede replicarlo.

### Cache in-process

`src/lib/platform-health/cache.ts`. TTL 30s per audience. Razón: agentes y MCP pueden polear agresivamente; sin cache, los 7 readers se vuelven cuello de botella. V1 es per-instance — distribuido (Redis) es overkill hasta observar thundering herd cross-instance real.

### Rutas y autenticación

|Ruta|Auth|Audience|Envelope|
|---|---|---|---|
|`GET /api/admin/platform-health`|`requireAdminTenantContext` (admin route group + EFEONCE_ADMIN role)|`admin`|NextResponse JSON directo + `x-platform-health-contract` header|
|`GET /api/platform/ecosystem/health`|`runEcosystemReadRoute` (ecosystem bearer + scope binding)|`ecosystem`|API Platform envelope (`requestId`, `servedAt`, `version`, `data`, `meta`) con etag/freshness|

Ambas rutas son `export const dynamic = 'force-dynamic'`. La ecosystem soporta `If-None-Match` (etag construido sobre `contractVersion + overallStatus + safeModes + module statuses + degraded count`).

Cada hit a la ruta ecosystem persiste en `greenhouse_core.api_platform_request_logs` vía `recordApiPlatformRequestLog` (helper existente). Auditoría sin tooling adicional.

### Entitlements declarados

`src/config/entitlements-catalog.ts` agrega:

```typescript
{ key: 'platform.health.read', module: 'admin', actions: ['read'], defaultScope: 'all' }
{ key: 'platform.health.detail', module: 'admin', actions: ['read'], defaultScope: 'all' }
```

V1 son **declarativas** — el enforcement runtime real lo agregará TASK-658. Por ahora el gating efectivo viene del route group (admin) y del scope binding (ecosystem). Esto evita inventar un helper paralelo de `tenantHasEntitlement()` antes de que el bridge canónico aterrice.

### Tests cubiertos

47 unit tests entre 5 archivos:

- `redact.test.ts` (15) — patrones, idempotencia, deep walk, ciclos, error normalization
- `with-source-timeout.test.ts` (5) — ok / timeout / error / sentinel / duration tracking
- `safe-modes.test.ts` (8) — table-driven cubriendo healthy / blocked / degraded / empty
- `recommended-checks.test.ts` (6) — filtrado por trigger, dedup, invariantes del catálogo
- `composer.test.ts` (8) — payload shape, blocked rollup, degraded source, redaction, audience trimming, immutabilidad

Todos passing. Suite completa post-merge: 2277/2282 (5 saltados deliberadamente por gates externos: cutover Finance + parity SQL que requiere PG, ninguno relacionado).

### Reglas canónicas

- **NO** crear endpoints paralelos de health en otros módulos. Si un módulo nuevo necesita exponer salud, registrarlo en `RELIABILITY_REGISTRY` y el composer lo recoge automáticamente.
- **NO** exponer payload sin pasar por `redactSensitive`. Aplica a cualquier campo que contenga strings de error o de fuente externa.
- **NO** computar safe modes ni rollup en el cliente. Consumir las banderas como vienen del contrato.
- **NO** agregar fuentes al composer sin envolverlas en `withSourceTimeout`.
- **NO** interpretar `degraded` como `healthy`. Si el contrato dice `degraded`, hay un warning real.
- **NO** cachear en el cliente más de 30s. El composer ya cachea in-process.
- **NO** depender de campos no documentados. Solo `contractVersion: "platform-health.v1"` garantiza shape estable.

### Documentación cruzada

- Doc funcional en español: `docs/documentation/plataforma/platform-health-api.md`
- Schema OpenAPI: `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml#components.schemas.PlatformHealthV1`
- Markdown developer-facing: `docs/api/GREENHOUSE_API_PLATFORM_V1.md` + mirror público `public/docs/greenhouse-api-platform-v1.md`
- CLAUDE.md y AGENTS.md tienen sección "Platform Health API Contract" con reglas duras.

### Tareas relacionadas

- TASK-647 — MCP read-only adapter agregará tool `get_platform_health` envolviendo este contrato (follow-up).
- TASK-657 — degraded modes / dependency health hereda `withSourceTimeout` y la taxonomía `confidence`/`sourceFreshness` (parallel).
- TASK-658 — resource authorization bridge activará enforcement de las dos capability keys ya declaradas.
- TASK-660 — OpenAPI stable contract promueve este schema a stable junto con el resto.
- TASK-671 — Teams bot consume `safeModes.notifySafe` antes de cada alerta.
