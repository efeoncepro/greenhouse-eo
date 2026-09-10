# Certificar un cliente MCP con un canary sintético

> Manual operativo · TASK-1832 · estado al 2026-09-06: **rollout productivo en observación**.
> Corrida activa: `task-1832-canary-20260906-a`; no crees una segunda. Su retiro no empieza antes de
> `2026-09-13T19:43:30Z` y exige dry-run verde más readback cero.

Este procedimiento comprueba que Claude, Codex o ChatGPT pueden usar Efeonce ID y el gateway MCP sin pedirle a
un cliente real que haga QA. El resultado es readiness técnica para un piloto; no es validación de usabilidad,
adopción ni autorización para abrir una cohorte.

Documentación relacionada: [binding externo](../../documentation/identity/binding-identidad-externa-mcp.md),
[runbook técnico](../../operations/runbooks/mcp-external-canary-certification.md),
[template de manifiesto](../../audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md) y
[matriz](../../audits/mcp/EFEONCE_MCP_CLIENT_TOKEN_MATRIX_2026-09-06.md).

## Separación de TASK-1844

La certificación interna multiorganización tiene [manual propio](usar-mcp-interno-multiorganizacion.md) y
[runbook de rollout](../../operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md). No usa clientes reales como
fixtures ni convierte los registros de este canary externo en targets internos. Reutiliza la evidencia de
compatibilidad existente antes de decidir una prueba nueva.

El 2026-09-08 se autorizó sustituir **solamente la conexión hospedada de Claude** por la conexión interna
Efeonce MCP. Se retiraron su consentimiento/familia bajo ese alcance; el registro y los demás activos de
TASK-1832 mantienen el ciclo global de retiro. Esa sustitución no acredita siete días ininterrumpidos de
observación de Claude hospedado. Ni un conector duplicado ni un cambio de usuario autoriza eliminar otro
canary sin verificar ownership y alcance exactos.

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

Elige un `run_id` no humano; en la corrida activa es `task-1832-canary-20260906-a`. Para una corrida futura,
llama:

```http
POST /api/admin/identity/external-access/canaries/plan
Content-Type: application/json

{"runId":"<run_id-nuevo>"}
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

Pasa los hosts explícitos sin guardar secretos. Para la corrida productiva activa:

```bash
node scripts/mcp/external-client-canary.mjs \
  --env=production \
  --issuer=https://auth.efeonce.org \
  --resource=https://mcp.efeonce.org/mcp \
  --run-id=task-1832-canary-20260906-a \
  --organization-id=org-602d7057-7fd5-47e7-b73b-21892e3f06e7 \
  --preflight

node scripts/mcp/external-client-canary.mjs \
  --env=production \
  --issuer=https://auth.efeonce.org \
  --resource=https://mcp.efeonce.org/mcp \
  --run-id=task-1832-canary-20260906-a \
  --organization-id=org-602d7057-7fd5-47e7-b73b-21892e3f06e7 \
  --negative
```

El segundo comando abre un loopback en `127.0.0.1`, registra un cliente público por DCR, genera PKCE S256,
espera login/consentimiento, valida el JWT con JWKS, llama `get_seo_entitlement`, rota refresh y revoca la familia
OAuth. No imprime tokens. Si usas `--no-open`, copia sólo la URL de autorización al navegador de la persona
canary; no la pegues en tickets o documentos.

Ejecuta las dos negativas temporales en ceremonias independientes:

```bash
# Espera la expiración natural del access token; puede tardar hasta 16 minutos.
node scripts/mcp/external-client-canary.mjs --env=production \
  --issuer=https://auth.efeonce.org --resource=https://mcp.efeonce.org/mcp \
  --run-id=task-1832-canary-20260906-a \
  --organization-id=org-602d7057-7fd5-47e7-b73b-21892e3f06e7 --negative --wait-expiry

# Mientras el script espera, revoca por command el grant exacto; exige deny en 60 s.
node scripts/mcp/external-client-canary.mjs --env=production \
  --issuer=https://auth.efeonce.org --resource=https://mcp.efeonce.org/mcp \
  --run-id=task-1832-canary-20260906-a \
  --organization-id=org-602d7057-7fd5-47e7-b73b-21892e3f06e7 --negative --wait-grant-revocation
```

No combines ambos `--wait-*`. Un timeout causado porque el command de revocación no se ejecutó a tiempo no
cuenta; reotorga únicamente la capability base mediante el command canary y repite una ceremonia nueva.

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
se pudo verificar el deny. Un `ERR_BLOCKED_BY_CLIENT` visible después del callback loopback no invalida por sí
solo el flujo: confirma primero que el CLI recibió el code y que una sesión nueva pudo invocar la lectura. Si no,
la fila queda roja.

### Claude Code y conectores hospedados

Para Claude Code usa una versión `>=2.1.196`; la corrida vigente usa `2.1.263`. Fija
`oauth.scopes="efeonce.mcp.read"` y no declares `authServerMetadataUrl`: versiones anteriores podían pedir todo
el catálogo y provocar `invalid_scope`. Durante una corrida eliminable registra un DCR público propio con
`software_id=run_id`, callback loopback fijo y allowlist base. No uses el client ID CIMD compartido de Anthropic
como asset del canary: se puede observar, pero no borrar ni reclamar como run-owned.

El preflight de la URL de autorización sólo acredita bootstrap. La fila pasa cuando el consentimiento muestra la
organización exacta y sólo lectura, una sesión nueva invoca una tool read-only, el write falla cerrado, el refresh
posterior al TTL conserva el scope y rota la familia, y la revocación invalida el token anterior. Conserva por
separado la evidencia histórica de cada versión del cliente.

Claude.ai, Claude Desktop, Cowork y mobile usan el conector remoto hospedado de Anthropic; no se certifican con el
CLI local. Agrega `https://mcp.efeonce.org/mcp` como custom connector y valida el callback HTTPS oficial
`https://claude.ai/api/mcp/auth_callback`. En Team/Enterprise el alta la hace un Owner y cada persona conecta su
cuenta; Pro/Max permite alta individual. Para un canary eliminable elige **Usa tu propio cliente OAuth**, registra
un DCR público con `software_id=run_id` y ese callback, deja el secreto vacío y conserva **Siempre requerido** con
**HTTP transmisible**. El CIMD que Claude detecta automáticamente es compartido y no entra al cleanup. Ejecuta
una llamada en Claude.ai y otra desde Desktop antes de afirmar compatibilidad de ambas superficies.

### ChatGPT y metadata visible

Después de crear o actualizar la app, relee el catálogo hospedado: una definición importada no prueba que las
tools se serializaron. Para cada tool exige `inputSchema`, `outputSchema`, `structuredContent`, las cuatro
annotations explícitas y el mirror `_meta.securitySchemes` derivado de la misma policy. Ejecuta una lectura real
y espera al menos una renovación post-TTL. Un probe `POST /mcp` con JSON vacío y sin bearer debe recibir el
challenge `401`; con bearer válido puede recibir `400 invalid_request`, pero nunca `500`.

## 6. Observa sin crear actividad nueva

Una vez certificada la matriz, la muestra diaria es sólo lectura: ejecuta el readback agregado y el cleanup
dry-run del registro exacto; relee revisiones Ready, tráfico, SHA y flags en Cloud Run, GitHub y Vercel; y revisa
las nueve señales de binding/invitación más code reuse, CIMD rechazado y refresh reuse. Registra el resultado
redactado en el manifiesto.

Un negativo de refresh reuse ejecutado por la propia corrida puede mantener esa señal roja durante 24 horas.
Clasifícalo por timestamp y DCR run-owned, confirma familia revocada y ausencia de eventos posteriores. No lo
marques `ok`, pero tampoco lo declares drift inexplicado si cumple esas tres condiciones. Cualquier evento nuevo,
cliente ajeno o familia activa bloquea el retiro. No abras nuevos consentimientos, clientes o sesiones sólo para
mantener viva la observación.

## 7. Revoca antes de borrar

Primero revoca la familia OAuth, consentimientos, contextos y sesiones. Después revoca invitaciones, grants y el
registro:

```http
POST /api/admin/identity/external-access/canaries/<xcr-id>/revoke
Content-Type: application/json

{"reason":"TASK-1832 certificación terminada; retirar authority"}
```

Con un access token emitido antes del corte, verifica que el gateway deniega en ≤60 s. Si sigue despachando,
apaga ambos gates, conserva la evidencia y trata el caso como incidente; no avances al delete.

## 8. Prueba que se puede eliminar

El dry-run es el modo por defecto:

```bash
pnpm identity:external-canary:cleanup -- \
  --registration <xcr-id> \
  --reason "TASK-1832 inspección de retiro"
```

No borres si `deletionReady` no es `true`, `unexpectedRefs` no es `0`, hay `logicalBlockers` o aparece un asset
shared. Corrige la dependencia mediante su command dueño y repite el dry-run.

Si aparece `oauth_client_not_run_owned`, no reclames el cliente como propio ni retires el blocker. Al
2026-09-10, el cleanup vigente no puede separar con seguridad los artefactos de sujetos canary que viven bajo
un CIMD compartido: su helper borra hijos por `client_id`. Antes de aplicar se debe implementar una partición
end-to-end en planner/delete/readback: conservar el cliente compartido y los hijos de otros sujetos, borrar sólo
las filas del environment/sujeto canary exactos (más binding para contexts) y verificar ambas cosas al final.
Hasta entonces, el dry-run bloqueado es el resultado correcto incluso después de `delete_after`.

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
| `oauth_client_not_run_owned` | un sujeto canary usó un cliente compartido  | no apliques; implementa cleanup sujeto-específico    |
| `forbidden` al apply      | no se está usando el perfil migrator            | no cambies roles runtime; usa el wrapper autorizado  |
| canary visible en 360/CRM | contaminación de proyección                     | apaga gates, revoca y abre incidente antes de seguir |

## Criterio de cierre

El trabajo queda técnicamente certificado sólo con matriz completa, producción allow/deny/revocación
acreditada, siete días de señales estables y cleanup/readback final cero. Durante la ventana el estado correcto
es `rollout productivo en observación`.
