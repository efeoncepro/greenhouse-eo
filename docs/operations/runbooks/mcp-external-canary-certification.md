# Runbook técnico — certificación MCP con canary externo eliminable

> TASK-1832 · owner: Identity + MCP Platform · estado: **code complete, rollout pendiente** al 2026-09-06.
> Schema aplicado fuera del checkpoint por error operativo; registry vacío. Este documento no acredita flags
> activos, fixture creado ni certificación runtime. Readback: `TASK-1832_SCHEMA_APPLY_READBACK_2026-09-06.md`.

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

El SoT del flag del emisor es la variable `EXTERNAL_IDENTITY_CANARY_ENABLED` del GitHub Environment elegido por
`auth-server-deploy.yml`; el workflow la pasa explícitamente a `deploy.sh`, cuyo `--set-env-vars` vuelve a
publicar el conjunto completo. Cambiarla sin ejecutar el workflow no modifica Cloud Run. Un deploy posterior con
la variable ausente vuelve a `false` por diseño. El valor se acredita leyendo la revisión servida, no sólo GitHub.

Antes de crear datos deben cumplirse todos estos puntos:

1. ADR aceptado, migraciones aplicadas y consumers compatibles desplegados con ambos gates OFF. El schema ya
   quedó aplicado accidentalmente; todavía faltan los consumers y la decisión del operador sobre conservarlo.
2. `external_canary_registrations` vacío o sin otra fila activa.
3. aprobación específica del operador para el fixture y para los buzones M365/Google controlados.
4. `run_id`, `canary_registration_id`, `organization_id` y `public_id` generados por
   `POST /api/admin/identity/external-access/canaries/plan`.
5. copia del template completada y versionada **antes del primer write**.
6. TTL entre 1 hora y 30 días, environment externo activo y external organization ref exacta.

La aprobación de implementación local de TASK-1832 no satisface los puntos 1–3.

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

El helper `node scripts/mcp/external-client-canary.mjs` usa DCR público, loopback `127.0.0.1`, PKCE S256,
consentimiento real, firma/JWKS, `tools/list`, `get_seo_entitlement`, refresh rotativo y revocación de la familia
OAuth. Mantiene códigos, verifier y tokens sólo en memoria. La revocación OAuth no sustituye el retiro de
authority: el binding/grant se revoca por su command y el gateway debe denegar el access token todavía vigente.

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
5. El command elimina, en orden: grants → invitations → source links → profiles `smoke_test` → bindings →
   registro → organización.
6. El mismo transaction relee `organizations`, `registrations`, `bindings`, `profiles` y `source_links`; todos
   deben ser `0`, o hace rollback.
7. Releer aparte OAuth/sesiones/consents y superficies 360; actualizar el manifiesto a `deleted` sólo cuando todo
   el inventario run-owned quede en cero.

Audit y outbox se retienen de forma desacoplada. No se borran para forzar el cleanup. Los environments,
clientes OAuth o sesiones compartidas marcados `shared` tampoco se eliminan.

## Motivos de bloqueo del cleanup

El apply se niega sin mutar cuando aparece cualquiera de estos estados:

- registro aún activo, authority activa o postura de organización modificada;
- lifecycle history, space, membership, tax ID, HubSpot o referencia comercial;
- perfil no `smoke_test`, source link de otro environment o asset compartido;
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

Hasta completar esos siete puntos, TASK-1832 permanece `code complete, rollout pendiente`; nunca se presenta
como piloto ni adopción de cliente.
