# Runbook técnico — certificación MCP con canary externo eliminable

> TASK-1832 · owner: Identity + MCP Platform · estado al 2026-09-07: **rollout productivo en observación**.
> Corrida activa `task-1832-canary-20260906-a`; helper, Playwright, Codex, ChatGPT hospedado, Claude Code
> `2.1.263`, Claude.ai y Claude Desktop `1.46388.4` están verdes. Code y web renovaron post-TTL sin widening;
> Desktop ejecutó desde la app nativa sobre el conector remoto. La matriz y el manifiesto acreditan el runtime;
> este runbook define el procedimiento.

## Objetivo y frontera

Este runbook certifica el camino productivo `auth.efeonce.org → mcp.efeonce.org` con una población externa
sintética controlada por Efeonce. No incorpora clientes reales, no habilita writes y no convierte la
organización temporal en cliente, prospecto, contrato ni ingreso.

El fixture existe únicamente mientras una fila exacta de
`greenhouse_core.external_canary_registrations` lo autoriza. La organización nace dedicada, `inactive`,
`active=false`, `organization_type=other`, `lifecycle_stage=disqualified`, sin tax ID, HubSpot, spaces,
memberships ni lifecycle history. Nunca se reutiliza una organización existente; `EO-ORG-0050` está
descartada porque su historia append-only impide garantizar el borrado.

La única capability de negocio V1 es `growth.seo.observation.read` y la única tool MCP que acepta el propósito
`canary` es `get_seo_entitlement`. El canary nunca puede ser `designated_admin`, usar la lane delegada ni recibir
otra capability.

Fuentes canónicas:

- decisión: `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`;
- schema/commands: `migrations/20260906180857734_task-1832-external-canary-binding-purpose.sql` y
  `src/lib/identity/external-access/canary.ts`;
- manual: `docs/manual-de-uso/identity/certificar-cliente-mcp-con-canary-sintetico.md`;
- manifiesto: `docs/audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md`;
- matriz: `docs/audits/mcp/EFEONCE_MCP_CLIENT_TOKEN_MATRIX_2026-09-06.md`.

## Kill switches y condiciones de entrada

Los dos gates son independientes y nacen `false`:

| Plano                  | Gate                                 | OFF significa                                              |
| ---------------------- | ------------------------------------ | ---------------------------------------------------------- |
| Greenhouse/auth-server | `EXTERNAL_IDENTITY_CANARY_ENABLED`   | no se emite ni resuelve autoridad canary                   |
| gateway `efeonce-mcp`  | `MCP_NATIVE_EXTERNAL_CANARY_ENABLED` | no se lista ni despacha ninguna tool para purpose `canary` |

El registry vacío conserva el carril cerrado aunque un gate se configure mal. Encender uno solo nunca es una
degradación aceptable; debe observarse como deny.

El SoT del flag del emisor es la variable GitHub de **repositorio** `EXTERNAL_IDENTITY_CANARY_ENABLED`.
`auth-server-deploy.yml` la pasa a `deploy.sh`, cuyo `--set-env-vars` vuelve a publicar el conjunto completo.
No debe existir un override del mismo nombre en los environments staging o production: ambos workflows apuntan
al mismo Cloud Run y valores distintos hacen que el último deploy reconfigure el runtime compartido. Esta regla
se comprobó cuando staging apagó el canary fail-closed en `auth-server-00042-hp5`; production lo restauró en
`00043-ndg`. Cambiar la variable sin ejecutar el workflow no modifica Cloud Run. Ausencia vuelve a `false` por
diseño. El change-gate compara la configuración servida y fuerza deploy ante drift. El valor se acredita leyendo
la revisión, no sólo GitHub. Vercel mantiene variables separadas porque sí tiene deployments por environment.

Antes de crear datos en una corrida nueva deben cumplirse todos estos puntos:

1. ADR aceptado, migraciones aplicadas y consumers compatibles desplegados con ambos gates OFF.
2. `external_canary_registrations` vacío o sin otra fila activa.
3. aprobación específica del operador para el fixture y para los buzones M365/Google controlados.
4. `run_id`, `canary_registration_id`, `organization_id` y `public_id` generados por
   `POST /api/admin/identity/external-access/canaries/plan`.
5. copia del template completada y versionada **antes del primer write**.
6. TTL entre 1 hora y 30 días, environment externo activo y external organization ref exacta.

La aprobación de implementación local de TASK-1832 no satisface los puntos 1–3. La corrida activa sí los
cumplió antes del primer write y quedó documentada con registro
`xcr-48dacd1f-ad4b-4a73-b454-3d94574e7d09`; no se crea otra mientras ésta siga activa.

## Plano de control

Las rutas requieren sesión `efeonce_admin` y capabilities finas. Los writes usan commands con audit/outbox;
no se permite SQL manual.

| Operación                 | Ruta                                                                               | Capability                          |
| ------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| planear IDs, sin DB write | `POST /api/admin/identity/external-access/canaries/plan`                           | `identity.external_canary.register` |
| crear org + registro      | `POST /api/admin/identity/external-access/canaries`                                | `identity.external_canary.register` |
| listar registros          | `GET /api/admin/identity/external-access/canaries`                                 | `identity.external_binding.read`    |
| ligar purpose canary      | `POST /api/admin/identity/external-access/canaries/{id}/bind`                      | `identity.external_canary.bind`     |
| revocar autoridad canary  | `POST /api/admin/identity/external-access/canaries/{id}/revoke`                    | `identity.external_canary.revoke`   |
| inspección de cleanup     | `POST /api/admin/identity/external-access/canaries/{id}/cleanup` con `apply:false` | `identity.external_canary.revoke`   |

El endpoint de cleanup no puede aplicar hard delete bajo el rol runtime. El apply se ejecuta sólo con el wrapper
local y el perfil DB `greenhouse_migrator`:

```bash
pnpm identity:external-canary:cleanup -- \
  --registration <xcr-id> \
  --reason "TASK-1832 retiro después de certificación"

pnpm identity:external-canary:cleanup -- \
  --registration <xcr-id> \
  --reason "TASK-1832 retiro aprobado después de certificación" \
  --apply \
  --confirm-registration <mismo-xcr-id>
```

El primer comando es dry-run. El segundo exige simultáneamente confirmación exacta y membresía DB en
`greenhouse_migrator`; cualquier diferencia aborta antes del delete.

El readback agregado del carril es sólo lectura y puede ejecutarse con el perfil `greenhouse_ops`:

```bash
pnpm identity:external-canary:readback
```

Debe conservar `external_purpose_drift=0`, `internal_purpose_drift=0` y `smoke_in_person_360=0`. Antes de crear
el primer fixture, `registrations=0` y `canary_bindings=0`; después del retiro final, ambos deben volver a cero.
Este conteo agregado complementa, pero no reemplaza, el readback por todos los IDs exactos del manifiesto.

## Orden de provisionamiento

1. Planear IDs y escribir el manifiesto.
2. Crear la organización/registro exactos con el mismo conjunto de IDs.
3. Ligar la organización mediante el command canary.
4. Crear perfiles exclusivamente con `data_origin='smoke_test'` mediante invitación/aceptación canónica.
5. Otorgar sólo `growth.seo.observation.read`, con `expires_at` idéntico al binding.
6. Verificar que Person 360 y búsqueda Account 360 no devuelven esos perfiles y que ningún reader comercial
   presenta la organización como cliente.
7. Desplegar gateway/auth-server compatibles y encender los gates en staging; verificar readback de valores,
   revisión servida y registry exacto.
8. Ejecutar flujo browser/PKCE y clientes de la matriz. Repetir en producción sólo después del cleanup verde de
   staging y la autorización de rollout.

El helper `node scripts/mcp/external-client-canary.mjs` exige `--run-id`, lo persiste como
`metadata_json.dcr.software_id` del DCR, y exige `--organization-id` para comparar el sujeto solicitado y el
servido antes de aceptar la corrida. Usa DCR público, loopback `127.0.0.1`, PKCE S256,
consentimiento real, firma/JWKS, `tools/list`, `get_seo_entitlement`, refresh rotativo y revocación de la familia
OAuth. Mantiene códigos, verifier y tokens sólo en memoria. La revocación OAuth no sustituye el retiro de
authority: el binding/grant se revoca por su command y el gateway debe denegar el access token todavía vigente.
`--negative` prueba base-only e internal-only; `--wait-expiry` espera la expiración natural y exige
`401 invalid_token`; `--wait-grant-revocation` abre una ventana de 60 s para ejecutar el command de revocación y
medir el deny. Los dos modos de espera se ejecutan en ceremonias separadas.

La passkey real se certifica en dos carriles distintos. El login normal puede crear una sesión `primary` con
`amr=passkey`; no se eleva por inferencia. El step-up explícito usa `/auth/passkeys/step-up/start|finish`, exige
UV real y actualiza esa misma sesión a `amr=passkey,uv` sin cambiar cookie ni `auth_time`. El runner
`pnpm auth-server:external-passkey:canary` valida registro, login, step-up, logout y readback sin emitir datos
biométricos, subject, cookies, credenciales WebAuthn ni challenges.

## Matriz de verificación mínima

Por cliente/redirect/registro registrar, sin tokens:

- discovery desde la URL canónica y mecanismo `CIMD | DCR | pre-registrado`;
- `iss`, `aud`, `azp`, `scope`, `gv`, presencia de `exp` y fingerprint SHA-256 truncado de `sub`;
- consentimiento visible con host de redirect;
- allow de `get_seo_entitlement`;
- deny base-only sobre scope superior, token expirado, grant revocado, cliente sin consentimiento y token
  externo sobre tool internal-only;
- refresh sin elevación y rotación del refresh token;
- revocación de authority observada por el gateway en ≤60 s;
- mismo fingerprint de `sub` para loopback y hospedado con la misma persona.

`skipped`, metadata 200, DCR 201, una captura, un token inyectado o una suite unitaria verde no cuentan como
certificación runtime.

### Perfiles de cliente que no se deben mezclar

- **Claude Code local:** versión mínima verificada `2.1.196`; fija `oauth.scopes` al scope base y no uses
  `authServerMetadataUrl`. Para un canary eliminable registra DCR propio con `software_id=run_id` y callback fijo.
  Un CIMD compartido por el vendor se conserva como `shared` y bloquea cualquier intento de borrarlo.
- **Claude hospedado:** Claude.ai, Desktop, Cowork y mobile comparten infraestructura cloud, pero cada superficie
  visible conserva una fila de ejecución. Usa el callback exacto `https://claude.ai/api/mcp/auth_callback`. Para
  un canary eliminable selecciona **Usa tu propio cliente OAuth**, aporta el DCR público run-owned, deja el secreto
  vacío y conserva **Siempre requerido** + **HTTP transmisible**; no adoptes el CIMD detectado como run-owned.
- **Codex local:** el callback puede mostrar `ERR_BLOCKED_BY_CLIENT` después de entregar el code. Sólo cuenta si
  el CLI confirma login y una sesión nueva hace la lectura.
- **ChatGPT hospedado:** la importación debe dejar visibles schemas, `structuredContent`, cuatro annotations y el
  mirror `_meta.securitySchemes`; además se ejecuta una lectura real y refresh post-TTL.

La versión exacta del cliente es parte de la evidencia. Conserva FAIL y PASS como filas distintas: nunca
reescribas una falla de una versión antigua como si no hubiera ocurrido.

### Transporte y serialización observables

Además de `tools/list`, inspecciona la respuesta serializada que ve el cliente. Debe incluir `inputSchema`,
`outputSchema`, `structuredContent` y las cuatro annotations explícitas; `content` de texto es un mirror de
compatibilidad, no una segunda verdad. `_meta.securitySchemes` se deriva de la policy canónica para clientes que
lo requieren y no crea autorización nueva.

El probe de bootstrap `POST /mcp` con JSON vacío debe cruzar autenticación antes de validación: anónimo devuelve
`401` con el challenge canónico; autenticado puede devolver `400 invalid_request`; `500` es regresión. La
renovación se prueba después del TTL y debe conservar el scope original cuando el cliente omite `scope`, rotar el
refresh e invalidar el anterior.

## Observación diaria y clasificación de señales

Cada muestra diaria es read-only y registra en el manifiesto, sin identificadores personales ni secretos:

1. `identity:external-canary:readback` y cleanup dry-run contra el registration ID exacto;
2. revisión Ready, tráfico, SHA servido y flags de Cloud Run, GitHub y Vercel para auth-server y gateway;
3. las nueve señales de binding/invitación y las señales OAuth de code reuse, CIMD rechazado y refresh reuse;
4. cualquier cambio en blockers lógicos, referencias inesperadas o contaminación 360.

Un negativo deliberado de reutilización puede mantener `auth.oauth.refresh_reuse_detected` en rojo durante su ventana de
24 horas. No lo renombres `ok`: atribúyelo por timestamp y DCR marcado con el `run_id`, confirma que la familia
quedó revocada y que no aparecieron eventos posteriores al baseline. Un evento nuevo, una familia no revocada o
un cliente que no sea run-owned es drift no explicado y bloquea el retiro.

La observación no crea clientes, consentimientos, grants, sesiones ni tokens. `delete_after` es sólo la fecha
mínima: el apply también exige siete días estables, precondiciones de retiro y aprobación explícita.

## Retiro en dos fases

### Fase A — cortar autoridad

1. Apagar `MCP_NATIVE_EXTERNAL_CANARY_ENABLED` y `EXTERNAL_IDENTITY_CANARY_ENABLED` si el retiro es de emergencia;
   en cierre normal, revocar primero mientras se mide el deny.
2. Revocar familia OAuth, consentimientos, contextos y sesiones de la corrida.
3. Revocar invitaciones/memberships y grants.
4. Ejecutar `POST .../canaries/{id}/revoke`: revoca primero el binding y después el registro, con audit/outbox.
5. Probar con un access token aún vigente que el gateway deniega en ≤60 s.

### Fase B — borrar sólo el grafo run-owned

1. Esperar la ventana de observación o registrar aprobación de retiro anticipado.
2. Ejecutar el dry-run del wrapper. Debe devolver:
   `registrationRevoked=true`, `activeAuthorityCount=0`, `logicalBlockers=[]`, `unexpectedRefs=0` y
   `deletionReady=true`.
3. Revisar el censo dinámico de FKs. Toda referencia no allowlisted bloquea; nunca se desactiva una FK o trigger.
4. Ejecutar apply con el ID confirmado exactamente.
5. El command elimina primero los artefactos auth/OAuth run-owned en orden de dependencias: access/refresh/code
   → consents/contextos → cliente DCR marcado con `software_id=run_id` → challenges/TOTP/passkeys/magic links/
   sesiones. Después elimina grants → invitations → source links → profiles `smoke_test` → bindings → registro
   → organización. Un cliente observado por la persona pero no marcado con el `run_id` bloquea el apply; no se
   presume ownership. En cambio, los hijos OAuth de un DCR correctamente marcado siguen el ownership del
   cliente aunque un diagnóstico haya usado otro sujeto: se eliminan por `client_id` sin borrar la sesión ni la
   identidad compartida de ese sujeto.
6. El mismo transaction relee organización, registro, bindings, perfiles, links y todos los artefactos
   auth/OAuth anteriores; cualquier conteo distinto de `0` hace rollback.
7. Releer aparte superficies 360 y actualizar el manifiesto a `deleted` sólo cuando todo el inventario run-owned
   quede en cero. El audit append-only desacoplado se conserva.

Audit y outbox se retienen de forma desacoplada. No se borran para forzar el cleanup. Los environments,
clientes OAuth o sesiones compartidas marcados `shared` tampoco se eliminan.

## Motivos de bloqueo del cleanup

El apply se niega sin mutar cuando aparece cualquiera de estos estados:

- registro aún activo, authority/auth activa o postura de organización modificada;
- lifecycle history, space, membership, tax ID, HubSpot o referencia comercial;
- perfil no `smoke_test`, source link de otro environment o asset compartido;
- cliente OAuth observado por el canary que no sea DCR o no tenga `software_id=run_id`;
- FK nueva/no inventariada con conteo positivo;
- rol DB distinto de migrator;
- readback final distinto de cero.

Se registra el blocker exacto en el manifiesto y se resuelve mediante el owner del dominio. Nunca se busca ni
borra por nombre, correo, fecha aproximada o prefijo.

## Evidencia y cierre

Una corrida deja:

1. manifiesto exacto por `run_id`;
2. matriz de tokens redactada;
3. resultado Playwright/cliente por revisión;
4. eventos audit/outbox y conteos DB sin payload sensible;
5. tiempos de revocación;
6. cleanup dry-run y, al retiro, apply + readback cero;
7. siete días de señales estables.

Hasta completar esos siete puntos, TASK-1832 permanece `rollout productivo en observación`; nunca se presenta
como piloto ni adopción de cliente. Para la corrida activa, `delete_after=2026-09-13T19:43:30Z`: antes de esa
fecha el dry-run debe negarse por authority/auth activas y `--apply` no se ejecuta.
