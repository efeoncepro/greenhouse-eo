# Certificar un cliente MCP con un canary sintético

> Manual operativo · TASK-1832 · estado al 2026-09-06: **code complete, rollout pendiente**.
> El schema quedó aplicado accidentalmente fuera del checkpoint, con registry vacío; no existe todavía una
> organización canary creada por esta ejecución.

Este procedimiento comprueba que Claude, Codex o ChatGPT pueden usar Efeonce ID y el gateway MCP sin pedirle a
un cliente real que haga QA. El resultado es readiness técnica para un piloto; no es validación de usabilidad,
adopción ni autorización para abrir una cohorte.

Documentación relacionada: [binding externo](../../documentation/identity/binding-identidad-externa-mcp.md),
[runbook técnico](../../operations/runbooks/mcp-external-canary-certification.md),
[template de manifiesto](../../audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md) y
[matriz](../../audits/mcp/EFEONCE_MCP_CLIENT_TOKEN_MATRIX_2026-09-06.md).

## Antes de empezar

Necesitas:

- aprobación específica para crear el fixture y los buzones M365/Google controlados;
- migraciones y consumers ya desplegados con los dos gates canary OFF;
- sesión `efeonce_admin` con `identity.external_canary.register|bind|revoke`;
- proxy PostgreSQL y perfil migrator sólo para el cleanup apply;
- una copia nueva del manifiesto por corrida.

Confirma el baseline agregado antes de crear datos:

```bash
pnpm identity:external-canary:readback
```

`external_purpose_drift`, `internal_purpose_drift` y `smoke_in_person_360` deben ser cero. Si no existe otra
corrida autorizada, también deben ser cero `registrations` y `canary_bindings`.

No reutilices una organización existente. No uses `EO-ORG-0050`, Efeonce ni una party cliente. No escribas un
correo, token, code, cookie, verifier, hash de sesión o secreto en el manifiesto.

## 1. Planea los IDs antes del primer write

Elige un `run_id` no humano, por ejemplo `task-1832-staging-20260906-a`, y llama:

```http
POST /api/admin/identity/external-access/canaries/plan
Content-Type: application/json

{"runId":"task-1832-staging-20260906-a"}
```

Copia el template a `docs/audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_<run_id>.md` y registra allí los cuatro
IDs devueltos. Versiona el manifiesto antes de continuar. Si algún ID cambia después, detén la corrida y crea
otra; no corrijas el manifiesto retroactivamente.

## 2. Crea y liga la organización efímera

Con TTL de 1 hora a 30 días:

```http
POST /api/admin/identity/external-access/canaries
Content-Type: application/json

{
  "runId":"<run_id>",
  "canaryRegistrationId":"<xcr-id>",
  "organizationId":"<org-id>",
  "organizationPublicId":"<EO-CANARY-id>",
  "environmentId":"efeonce-auth",
  "externalOrganizationRef":"task-1832:<run_id>",
  "expiresAt":"<ISO-8601>",
  "reason":"TASK-1832 certificación MCP externa sintética"
}
```

Después:

```http
POST /api/admin/identity/external-access/canaries/<xcr-id>/bind
Content-Type: application/json

{"reason":"TASK-1832 binding canary read-only"}
```

Relee la organización. Debe seguir `inactive`, `active=false`, `other`, `disqualified`, sin tax ID, HubSpot,
spaces, memberships ni lifecycle history. El binding debe decir `bindingPurpose=canary`, apuntar al registro
exacto y vencer al mismo tiempo.

## 3. Invita y otorga el único permiso

Usa el flujo de invitación normal, pero siempre con un perfil `data_origin='smoke_test'`, buzón controlado y
`designatedAdmin=false`. Otorga únicamente `growth.seo.observation.read`; cualquier otra capability debe fallar.

Comprueba antes de OAuth:

- el perfil no aparece en Person 360 ni en la búsqueda de Account 360;
- una coincidencia con perfil `real` falla como `identity_collision`, no se fusiona;
- la organización no aparece como cliente/prospecto ni entra en KPIs comerciales;
- la lane delegada rechaza el propósito canary.

## 4. Prueba navegador y PKCE

Configura los hosts sin guardar secretos:

```bash
export MCP_CANARY_STAGING_ISSUER=https://<issuer-aprobado>
export MCP_CANARY_STAGING_RESOURCE_URL=https://<gateway-aprobado>/mcp
node scripts/mcp/external-client-canary.mjs --env=staging --preflight
node scripts/mcp/external-client-canary.mjs --env=staging
```

El segundo comando abre un loopback en `127.0.0.1`, registra un cliente público por DCR, genera PKCE S256,
espera login/consentimiento, valida el JWT con JWKS, llama `get_seo_entitlement`, rota refresh y revoca la familia
OAuth. No imprime tokens. Si usas `--no-open`, copia sólo la URL de autorización al navegador de la persona
canary; no la pegues en tickets o documentos.

La suite Playwright es opt-in y exige una sesión canary preautorizada:

```bash
EXTERNAL_CANARY_E2E_ENABLED=true \
AUTH_SERVER_CANARY_ISSUER=https://<issuer-aprobado> \
MCP_CANARY_RESOURCE_URL=https://<gateway-aprobado>/mcp \
AUTH_SERVER_CANARY_STORAGE_STATE=.auth/auth-server-canary.json \
pnpm playwright test tests/e2e/smoke/auth-server-oauth.spec.ts
```

Un test `skipped` no acredita nada. El storage state es local/ignorado y no se adjunta como evidencia.

## 5. Completa la matriz de clientes

Opera Claude Code, Claude Desktop/web, Codex y ChatGPT con el mismo fixture. Para cada combinación registra:

- mecanismo de registro y redirect exacto;
- fingerprint truncado del mismo `sub`, nunca el subject crudo;
- claims no sensibles y resultado de allow;
- cinco negativas: scope superior, expirado, authority revocada, sin consentimiento e internal-only;
- refresh, revocación y tiempo hasta deny.

Una fila queda `pending` si requirió inyección manual de token, no llegó al consentimiento, omitió refresh o no
se pudo verificar el deny.

## 6. Revoca antes de borrar

Primero revoca la familia OAuth, consentimientos, contextos y sesiones. Después revoca invitaciones, grants y el
registro:

```http
POST /api/admin/identity/external-access/canaries/<xcr-id>/revoke
Content-Type: application/json

{"reason":"TASK-1832 certificación terminada; retirar authority"}
```

Con un access token emitido antes del corte, verifica que el gateway deniega en ≤60 s. Si sigue despachando,
apaga ambos gates, conserva la evidencia y trata el caso como incidente; no avances al delete.

## 7. Prueba que se puede eliminar

El dry-run es el modo por defecto:

```bash
pnpm identity:external-canary:cleanup -- \
  --registration <xcr-id> \
  --reason "TASK-1832 inspección de retiro"
```

No borres si `deletionReady` no es `true`, `unexpectedRefs` no es `0`, hay `logicalBlockers` o aparece un asset
shared. Corrige la dependencia mediante su command dueño y repite el dry-run.

Después de la ventana de observación y con aprobación de retiro:

```bash
pnpm identity:external-canary:cleanup -- \
  --registration <xcr-id> \
  --reason "TASK-1832 retiro aprobado después de observación" \
  --apply \
  --confirm-registration <mismo-xcr-id>
```

El apply sólo funciona con el perfil DB migrator. El endpoint admin de cleanup sirve para inspección; no puede
hacer hard delete con el rol runtime por diseño.

Marca el manifiesto `deleted` únicamente después de comprobar cero en organización, registro, binding, grants,
invitaciones, profiles, links, contextos, consents, codes, tokens, sesiones y superficies 360. El audit/outbox
redactado permanece: es evidencia retenida, no un blocker ni un asset que se deba borrar.

Repite `pnpm identity:external-canary:readback` y conserva el resultado redactado junto al manifiesto; el
conteo agregado no sustituye las consultas por los IDs exactos de la corrida.

## Problemas comunes

| Síntoma                   | Significado                                     | Acción                                               |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `canary_not_registered`   | ID ausente o distinto del manifiesto            | detén la corrida; no busques por nombre              |
| `canary_expired`          | registro/binding revocado o vencido             | crea una registración nueva; no reactives            |
| `capability_not_allowed`  | permiso fuera de la única allowlist             | elimina la solicitud; no amplíes el canary           |
| `canary_cleanup_blocked`  | authority, postura, FK o readback impide borrar | revisa el plan y resuelve el owner exacto            |
| `forbidden` al apply      | no se está usando el perfil migrator            | no cambies roles runtime; usa el wrapper autorizado  |
| canary visible en 360/CRM | contaminación de proyección                     | apaga gates, revoca y abre incidente antes de seguir |

## Criterio de cierre

El trabajo queda técnicamente certificado sólo con matriz completa, cleanup de staging probado, producción
allow/deny/revocación acreditada y siete días de señales estables. Hasta entonces el estado correcto es
`code complete, rollout pendiente`.
