# TASK-1832 — Efeonce MCP Synthetic External Canaries and Client Compatibility Certification

## Delta 2026-09-07 — Claude Code y Claude.ai completan la ceremonia real

La causa del fallo histórico quedó acotada al cliente Claude Code `2.1.186`: antes de `2.1.196`, Claude podía
solicitar el catálogo completo descubierto y provocar `invalid_scope`. El runtime local se actualizó mediante
Volta a `2.1.263` y el servidor `efeonce-mcp` quedó configurado con el recurso canónico y
`oauth.scopes="efeonce.mcp.read"`, sin `authServerMetadataUrl` ni scopes de escritura. Un login nuevo completó
PKCE S256, consentimiento visible sobre la organización canary exacta y emisión de token. Una sesión aislada,
sin herramientas ajenas al MCP Efeonce, vio exactamente `efeonce_gateway_status|get_seo_entitlement`, ejecutó
la segunda y obtuvo `no_entitlement`; `track_seo_keywords` no estuvo disponible. El warning local SEP-2352 sobre
una credencial todavía sin sello `issuer` queda como observación del cliente, no como fallo del servidor: la
conexión y el dispatch funcionaron.

Para conservar el contrato de borrado se registró un DCR público exclusivo de la corrida local,
`dcr-ErE3ZSUXL7ENeJh61BEWDw`, con `software_id=task-1832-canary-20260906-a`, callback fijo
`http://localhost:18432/callback` y allowlist sólo de lectura. Se descartó usar el client ID CIMD compartido de
Anthropic: un cliente compartido no es run-owned y no se debe borrar por haber sido observado por un sujeto
canary. Claude.ai se agregó como custom connector remoto y se configuró deliberadamente con otro DCR público
run-owned, `dcr-mLTiqIJmBQyvdQOtKRpdVw`, callback exacto `https://claude.ai/api/mcp/auth_callback`,
`software_id=run_id`, secret vacío, OAuth siempre requerido y Streamable HTTP. El consentimiento hospedado mostró
la misma organización y el único scope base; el catálogo visible tuvo las mismas dos tools read-only y una
invocación aprobada de SEO devolvió `no_entitlement` con todos los contadores en cero. No se usó el cliente CIMD
detectado porque no es borrable por esta corrida.

El dry-run posterior incorporó ambos DCR (`22` clientes), `21` codes/consents y, tras las renovaciones,
`29` refresh/access tokens,
`18` sesiones, `14` magic links, `2` passkeys, `5` challenges y `4` contexts. Conserva
`unexpectedRefs=0`; sus únicos blockers son los esperados
`registration_active|active_authority|active_auth`. Claude Code y Claude.ai repitieron la lectura después del
TTL: cada cliente quedó con dos access/refresh, un refresh rotado y uno activo, siempre base-only. La aplicación
nativa Claude Desktop `1.46388.4` abrió el chat remoto sincronizado, solicitó aprobación propia y ejecutó la
misma lectura desde su UI; comparte el DCR hospedado y no crea un tercer cliente OAuth. La fila `2.1.186 FAIL`
se conserva como historia y nunca se amplió la allowlist para convertirla en verde.

## Delta 2026-09-07 — ChatGPT hospedado verde y gateway MCP v2 endurecido

ChatGPT quedó certificado de punta a punta sobre la misma organización canary. La app `Efeonce`
(`asdk_app_6a9e8978ca2081919753589005e001bf`, versión
`asdk_app_v_6a9e8978ca2c8191b8bf92f0cf449988`) se registró por DCR como
`dcr-c5TpuN-SiPzBfm0fhTXcsA`, autenticó contra `auth.efeonce.org`, mostró la organización exacta y autorizó
únicamente `efeonce.mcp.read`. Después de actualizar la definición importó exactamente dos tools, ambas
read-only: `efeonce.gateway.status` y `get_seo_entitlement`. Las dos llamadas hospedadas respondieron desde el
gateway productivo; SEO devolvió `no_entitlement`, cero auditorías y presupuesto cero. No se importó ni ejecutó
ningún write.

La continuidad real reemplaza la hipótesis anterior sobre `offline_access`: el emisor rotó la familia de refresh
de ChatGPT dos veces después del TTL inicial. El readback final del cliente mostró tres access tokens, tres
refresh tokens, dos refresh usados/rotados y uno activo, siempre con el scope exacto
`efeonce.mcp.read`. El mismo profile externo `smoke_test` y el mismo `sub` redactado se observaron en loopback y
en el cliente hospedado.

La integración de OpenAI expuso además un probe `POST /mcp` con cuerpo JSON vacío. Fastify lo rechazaba antes de
la autenticación y el error global lo convertía en `500`. El gateway `v1.1.2`, commit
`171965c9903490fe6fa6fde17f3c15e9646b149f`, autentica primero ese caso: sin bearer responde el challenge
canónico `401`; con bearer válido y cuerpo vacío responde `400 invalid_request`. `pnpm check` pasó `153/153`,
CI `34111553554` y deploy `34111643880` terminaron verdes; producción sirve la revisión
`efeonce-mcp-gateway-00046-6n2`, 100 % del tráfico y SHA exacto. El gateway ya usa los paquetes estables MCP v2
`@modelcontextprotocol/server`, `@modelcontextprotocol/node` y `@modelcontextprotocol/fastify` `2.0.0`; no usa
el paquete monolítico v1 en mantenimiento. La metadata de tools sigue el contrato oficial de OpenAI con schemas,
annotations y el espejo de compatibilidad `_meta.securitySchemes`, sin ampliar scopes.

El dry-run posterior a ChatGPT conserva `unexpectedRefs=0` y agrega el DCR hospedado al grafo: `20` clientes,
`19` codes/consents, `25` access/refresh tokens, `18` sesiones, `14` magic links, `2` passkeys, `5` challenges y
`4` contexts. Los únicos blockers siguen siendo los deliberados de la ventana
`registration_active|active_authority|active_auth`. TASK-1832 continúa en observación hasta completar siete
días, ejecutar cleanup/readback cero desde `2026-09-13T19:43:30Z` y apagar ambos gates. TASK-1813 cerró después
el hardening `1.2.0` y la matriz post-cutover: Claude Code, Codex, Claude.ai, Claude Desktop y ChatGPT quedaron
verdes base-only. TASK-1832 permanece abierta sólo por observación, cleanup/readback cero y gates OFF; esa
certificación no acredita un cliente real ni autoridad multiorganización.

## Delta 2026-09-06 — producción activa, Codex verde y retiro programado

La organización dedicada `task-1832-canary-20260906-a` está activa exclusivamente como canary productivo.
Greenhouse/Vercel y el auth-server sirven `fb5fc082aa92`; el gateway sirve `8438c5fa87ed` en la revisión
`00044-4kj`; ambos gates canary están `true`. Invitación, M365, Gmail autorizado, magic link, sesiones,
passkey real Chrome/Safari, consentimiento, PKCE, refresh, revocación de familia, base-only, internal-only y
revocación de authority en `19.272 s` tienen evidencia live. El E2E Playwright productivo pasó `1/1` con un
listener loopback real, DCR+PKCE, consentimiento, JWT, MCP initialize/list/call, refresh, revocación y logout
`401`; Codex `0.153.4` completó OAuth y una lectura real sin gasto. Claude Code `2.1.186` quedó fail-closed antes
del consentimiento por pedir scopes desconocidos y writes; el defecto vuelve a `TASK-1813` y no se corrige
ampliando la allowlist.

El helper exige además el `organization_id` exacto y valida el sujeto devuelto. Esta guarda nació al detectar
que una cookie interna persistente podía recorrer readers de Efeonce: la ceremonia fue rechazada como canary,
la sesión se cerró y la repetición por magic link M365 mostró el fixture correcto. No hubo writes ni gasto.
La ceremonia reforzada confirmó `organizationIdMatches=true`; una corrida independiente esperó `899 s` y
obtuvo `401 invalid_token` por expiración natural antes de rotar o revocar la familia OAuth.

El dry-run post-clientes conserva `unexpectedRefs=0` y enumera todo el grafo run-owned. `deletionReady=false`
es correcto durante la ventana porque registro, authority y auth siguen activos. Los DCR diagnósticos usados
por error con la sesión interna también llevan el `run_id`; su cleanup es client-scoped y conserva la sesión e
identidad compartidas. El cierre permanece abierto hasta clientes hospedados o decisión explícita de no
certificarlos, siete días de señales y cleanup/readback cero después de `2026-09-13T19:43:30Z`.

El preflight de ChatGPT hospedado encontró una diferencia que se debía medir, no ocultar: el discovery live
ofrece `refresh_token`, y el emisor entrega refresh rotativo, pero no publica `offline_access`. La ceremonia
hospedada y dos renovaciones reales posteriores al TTL, registradas el 2026-09-07, demostraron que el cliente
mantiene continuidad sin solicitar ese scope. La evidencia observada sustituye la hipótesis; no se cambió el
emisor ni se convirtió `offline_access` en capability del gateway.

El control plane de Vercel contradijo el ledger durante la observación: staging tenía el gate canary en `true`.
Se corrigió a `false` en el environment custom y se reconstruyó staging inicialmente en
`dpl_6UUXxsT7eS4EL44kkLWuDrHFqKDT`. La build final de `develop@c75a07f` quedó READY como
`dpl_D9mkjQLE1a26H4TXQ2HX7wXWMpLf` desde `2026-09-07T02:03:16.160Z`, tomó los aliases de staging y respondió
200 en `/api/auth/session`, sin modificar ni redeployar Production. La evidencia confirma configuración y build;
el deny flow-level de staging queda pendiente. El auth-server compartido continúa gobernado por una sola
variable GitHub de repositorio ON.

## Delta 2026-09-06 — certificación sintética separada del piloto con cliente real

Por decisión del operador, ninguna persona cliente participa en el QA técnico del emisor, el gateway o los
clientes MCP. Esta task conserva la matriz real de Claude Code, Claude Desktop/web, Codex y ChatGPT, pero la
ejecuta con una población externa sintética controlada por Efeonce. La primera organización cliente consentida
sale a `TASK-1841`, después de que esta task y `TASK-1833` cierren.

La separación es de evidencia, no un bypass: el canary sintético debe atravesar el mismo issuer, invitación,
sesión, consentimiento, code + PKCE, access/refresh token, gateway y policy que usaría un cliente. Para no
contaminar Person 360 ni Account 360 comercial, las personas llevan `data_origin='smoke_test'`, la organización
canary no se reclasifica como `client|both`, y el binding usa un propósito `canary` explícito, con vencimiento,
capabilities read-only, auditoría y revocación. Un resultado verde prueba readiness técnica para piloto; nunca
se presenta como adopción, usabilidad o validación de un cliente real.

## Delta 2026-09-06 — prerrequisitos de la cohorte que trae TASK-1837 (verificados en staging; queda release a producción + federación en el gateway)

- `TASK-1837` (commits `5518d868e…189148c6e`, **migración aplicada 2026-09-06 y verificado end-to-end en staging el
  2026-09-06 con los dos flags ON en staging** — `docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md`)
  deja probadas tres cosas que la primera cohorte necesita: entrega automática de la invitación por correo (flag
  `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED`, reenvío/rebote/revelación gobernados), el host del `redirect_uri`
  visible en la pantalla de consentimiento (sin flag, aditivo) y la lane delegada por la que el administrador
  designado del cliente invita a su propia gente (`GET/POST /api/platform/ecosystem/identity/invitations`, flag
  `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED`, OFF ⇒ 404).
- **Dependencia nueva para la cohorte:** la lane delegada exige federación en `efeonce-mcp` — el gateway verifica
  el JWT de la persona y llama a Greenhouse con `(environment, subject)` como ya hace para `identity/binding`;
  Greenhouse no conoce personas en ese harness. Sin esa federación (TASK-1831 + esta task) el cliente no puede
  invitar a nadie desde un cliente MCP y toda invitación sigue pasando por un operador de Efeonce. La lane ya
  respondió correcto en staging al token del consumer del gateway (`efeonce-mcp-gateway-greenhouse-token`) con el
  `subject` de una persona externa real: lista del binding propio 200, binding ajeno 403, auto-elevación 422 e
  invitación delegada 201 con correo real recibido; falta la tool MCP que la llame con el JWT de la persona.
- Antes de la cohorte, verificado en staging el 2026-09-06: migración `20260906004450748_task-1837-…` ✔ aplicada;
  flags ON en staging; remitente Efeonce funcionando en Resend (correo real de invitación y magic link recibidos);
  persona externa de prueba con sesión viva en `auth.efeonce.org` y muerta al revocar el binding; rebote forzado
  con `undelivered` encendiéndose; consentimiento con host del `redirect_uri` capturado en dev-UI (1440/390).
  Quedan sólo: promoción de `develop` → `main` con los flags en Vercel Production (24 h de observación) y la
  federación de la lane delegada en el gateway; la primera persona de un CLIENTE real sigue siendo decisión del
  operador.

## Delta 2026-09-04 — acceso interno nativo (TASK-1836)

La matriz incorpora empleados Efeonce por emisor nativo además de clientes externos y carril Entra existente. El canary interno depende de TASK-1836 + integración TASK-1831/1835; usar la identidad real indicada por operador y organización canónica, sin reclasificar Efeonce ni crear excepciones de prueba.

## Delta 2026-09-04 (TASK-1835)

- Las pantallas que los canaries y la primera cohorte verán (consentimiento, login, step-up, recuperación) son `TASK-1835` (EPIC-044 U06); esta task queda bloqueada también por ella para la cohorte real (los canaries de protocolo con `prompt=none` o clientes de prueba no la necesitan).

## Historia 2026-09-04 (TASK-1829) — estado anterior a activación

Registro conservado de ese momento; las menciones de flag OFF y personas pendientes no describen
el estado posterior. Ver actualización de readiness del 2026-09-05 al final.

- `TASK-1829` quedó `code complete, rollout pendiente` en `develop` (commits `263ee3a74`, `19d1658de`,
  `d31e6e913`): metadata RFC 8414/OIDC (`issuer` idéntico al origen, `client_id_metadata_document_supported:
true`, S256 único), CIMD como registro primario, DCR (`POST /oauth/register`) como compatibilidad para
  públicos, clientes confidenciales por command, `authorize`/`token`/`revoke`/`introspect` y consentimiento
  persistido, todo detrás de `AUTH_SERVER_OAUTH_ENABLED=false`; contrato en
  `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` — cerrado por trabajo en `TASK-1829`.
- **Mecanismos de registro disponibles para los canaries:** CIMD (`client_id` = URL https del documento,
  validado con guard anti-SSRF y cacheado 24 h), DCR (`dcr-…`, sólo `token_endpoint_auth_method: none`, 10/min
  por IP) y cliente confidencial pre-registrado vía `pnpm auth-server:register-client` o
  `POST /api/admin/auth-server/oauth-clients` (capability `identity.auth_client.register`; secreto una sola vez).
  La fila «cliente no soporta CIMD ni DCR» de la matriz de riesgos ya tiene camino.
- **Política de redirect decidida por el operador (2026-09-04):** públicos = loopback `127.0.0.1`/`[::1]`/alias
  `localhost` en cualquier puerto (Claude Code lo necesita) o HTTPS exacto; confidenciales/hospedados = HTTPS
  exacto y `localhost` por nombre rechazado. La matriz de tokens debe registrar la forma de redirect por cliente
  contra esa política.
- Revocación operativa que los canaries de allow/deny/expiración/revocación deben ejercitar: `POST /oauth/revoke`
  (familia completa) y `POST /api/admin/auth-server/consents/revoke` (capability
  `identity.auth_consent.revoke`; mata todas las familias de `(subject, client)`). Señales a observar en
  `/admin/operations`: `auth.oauth.code_reuse_detected`, `auth.oauth.refresh_reuse_detected`,
  `auth.oauth.cimd_rejected` (steady 0).
- **Pendientes registrados entonces (históricos):** flag ON en staging (environment `efeonce-auth` `active` +
  metadata validada), `TASK-1830` (`authorize` responde `login_required` hasta entonces: ningún code para una
  persona), `TASK-1831` (gateway multi-issuer) y la task ui-ux. `Blocked by` se precisa en consecuencia.

## Historia 2026-09-04 — bootstrap inicial

La lista de bloqueos siguiente corresponde al bootstrap; fue superada parcialmente por la activación
de OAuth/personas y no debe utilizarse como inventario actual.

- `TASK-1828` dejó el runtime del emisor vivo en staging: `https://auth.efeonce.org/readyz` 200 y
  `/.well-known/jwks.json` con dos `kid` (KMS HSM ES256), publicado en el mismo front door del gateway. Los
  canaries de esta task ya tienen un issuer real contra el que verificar JWT — cerrado por trabajo en `TASK-1828`.
- `TASK-1631` Slice 1 (commands de binding/invitación/grant y 4 señales) quedó code complete y verificado en
  staging el mismo día.
- **En ese momento quedaba bloqueada** por `TASK-1829` (metadata, CIMD/DCR y tokens), `TASK-1830` (autenticación de personas),
  `TASK-1631` (release a producción), `TASK-1831` (gateway multi-issuer) y la task ui-ux de login/consentimiento.

## Delta 2026-09-05 — entrega de la invitación (TASK-1837)

La cohorte no puede abrirse con el recorrido de alta actual. Medido sobre el código: `issueExternalInvitation`
devuelve el token en claro en la respuesta de la ruta admin y el evento `identity.external_invitation.issued`
no tiene ningún consumidor, así que **el último tramo del alta lo hace una persona de Efeonce copiando un
secreto**. Investigación de mercado del 2026-09-05 (8 productos, 2 vendors de identidad): en los ocho productos
la invitación nominal la envía el sistema, y mostrarle el secreto de otra persona a un administrador contradice
NIST SP 800-63A-4 §3.8, NIST SP 800-63B-4 §3.1.3.1 e ISO/IEC 27002:2022 §5.17.

Además, la pantalla de consentimiento **no muestra el host del `redirect_uri`** (verificado en
`src/lib/auth-server/oauth/pages/render.ts`): la persona autoriza sin ver a dónde va el código. Es un MUST del
protocolo y una cohorte real no debería abrirse incumpliéndolo.

`TASK-1837` cierra ambos, más el ciclo de vida de la entrega y la autoridad delegada del administrador del
cliente. Los canaries de protocolo (clientes de prueba, `prompt=none`) no dependen de ella; **la primera
organización cliente real, sí**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-044`
- Status real: `Observación productiva activa. La matriz histórica M365/Gmail, passkeys, helper/Playwright, Codex, ChatGPT, Claude Code 2.1.263 y Claude.ai/Desktop se conserva en el manifest; Claude Code 2.1.186 sigue FAIL histórico. El 2026-09-08 el operador autorizó reemplazar sólo la conexión hospedada de Claude por el acceso interno TASK-1844: conector retirado, consentimiento/familia revocados a 19:41:17Z, readback cero; su observación continua termina por decisión explícita. Registro, binding, grants, organización, perfiles y otros clientes permanecen activos. ChatGPT releyó el canary con éxito tras el deploy compatible TASK-1844: gateway ready y SEO no_entitlement, sin gasto. Faltan completar la observación restante, cleanup/readback cero y apagar los gates; no se anticipa el cleanup global ni se afirma siete días ininterrumpidos para Claude hospedado.`
- Rank: `TBD`
- Domain: `platform|identity|integration|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-mcp main; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Certificar el emisor propio y el gateway contra clientes MCP reales usando exclusivamente una organización
canary y personas sintéticas controladas por Efeonce. La matriz cubre loopback y HTTPS hospedado, CIMD/DCR/
pre-registro, correo real, passkeys, consentimiento, tokens, allow/deny, expiración, refresh y revocación sin
incorporar ni afectar a un cliente. Cierra la prueba base-only de `TASK-1626` y habilita `TASK-1841`.

## Why This Task Exists

Un authorization server correcto en el papel no prueba interoperabilidad. Los clientes divergen en discovery,
registro y redirects, y los mocks no ejercitan correo, navegador, cookies, consentimientos, tokens ni dispatch.
Esa prueba no necesita trasladar riesgo técnico a una persona cliente: una población `smoke_test` puede recorrer
el contrato productivo completo si su procedencia, authority boundary, vencimiento y limpieza son explícitos.

## Goal

- Matriz de tokens redactada por cliente: `iss`, `aud`, `sub`, `azp`, `scope`, `gv`, `exp`, forma de redirect, mecanismo de registro (CIMD/DCR/pre-registrado), resultado.
- Confirmación de que el mismo `sub` se obtiene desde loopback y desde hospedado para la misma persona.
- Carril canary externo gobernado: organización no-cliente, binding `canary`, perfiles `smoke_test`,
  capabilities read-only, vencimiento, auditoría y revocación por commands.
- Pruebas negativas: base-only deny, token expirado, grant revocado, cliente no consentido, issuer externo sobre tool interna.
- Expediente de readiness técnica para que `TASK-1841` pueda elegir un cliente sin pedirle hacer QA.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (§Rollout gates 5 y 6)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`

Reglas obligatorias:

- Un canary NUNCA se clasifica como cliente, prospecto, contrato o ingreso. La procedencia no se infiere por
  dominio, nombre ni plus-addressing.
- La organización canary es dedicada y efímera: nace inactiva/disqualified, sin historia comercial, y cada
  referencia queda en un manifiesto por corrida. No se reutiliza una party existente.
- `bindExternalOrganization` conserva intacta su elegibilidad `client|both` + `active_client`; el canary usa un
  command separado sobre la misma primitive transaccional y no introduce un bypass en el command comercial.
- Una capability read-only; ninguna escritura de negocio, gasto, dato cliente ni derecho sensible.
- Evidencia siempre redactada: nunca pegar tokens, códigos ni correos completos en docs o Handoff.
- Personas `smoke_test` y buzones controlados por Efeonce prueban el mecanismo, nunca una cohorte.
- Antes de implementar `binding_purpose` y el registro canary, aceptar un Delta del ADR de identidad/federación
  que fije la separación `customer|canary`, su retención y sus consumers.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md` (§Estado de rollout, prueba base-only pendiente)
- `docs/audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`

## Dependencies & Impact

### Depends on

- `TASK-1829` (emisor activo), `TASK-1830` (autenticación activa), `TASK-1631` (binding/invitación/grant),
  `TASK-1831` (gateway multi-issuer) y `TASK-1837` (entrega/autoridad delegada en producción).
- Buzón M365 gobernado por Efeonce y Gmail personal que el operador autorizó expresamente para esta corrida;
  plus-addressing aísla el fixture dentro de la segunda infraestructura y no acredita ownership corporativo.

### Blocks / Impacts

- Habilita `TASK-1841`, que posee el primer piloto consentido con una organización cliente existente.
- Aporta evidencia técnica a `TASK-1834` y al cierre de `TASK-1829/1830/1831`, sin sustituir sus gates propios.
- Los writes federados conservan tasks y gates por dominio; esta task no los habilita.

### Files owned

- `src/lib/identity/external-access/**` (primitive/command/store canary y boundary tests)
- `migrations/<timestamp>_task-1832-external-canary-binding-purpose.sql`
- `src/app/api/admin/identity/external-access/canaries/**` y capacidades runtime/registry correspondientes
- `src/lib/account-360/organization-store.ts` y la definición vigente de `greenhouse_serving.person_360`
  únicamente para excluir `data_origin='smoke_test'` de los readers 360; sin cambiar la raíz de identidad
- `services/auth-server/**` y su workflow sólo para el gate canary fail-closed en emisión
- `/Users/jreye/Documents/efeonce-mcp/src/**` y workflow de deploy sólo para contrato/policy/gate del gateway;
  cualquier commit, push, PR o deploy en el repo hermano conserva autorización separada
- `docs/operations/runbooks/mcp-external-canary-certification.md` (nuevo)
- `docs/audits/mcp/EFEONCE_MCP_CLIENT_TOKEN_MATRIX_<fecha>.md` (nuevo, redactado)
- `docs/audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md` y un manifest por `run_id`
- `scripts/mcp/external-client-canary.mjs` (nuevo: flujo PKCE automatizable con cliente CIMD de prueba)
- `tests/e2e/smoke/auth-server-oauth.spec.ts` (nuevo)

## Current Repo State

> Actualizado 2026-09-07: los bullets siguientes describen la base que ya existe; la sección `Gap` conserva sólo
> el trabajo realmente abierto de la corrida productiva.

### Already exists

- Canary interno Entra y prueba manual con Claude Code (ADR gateway §Delta 2026-08-06).
- Commands de binding de `TASK-1631` (Slice 1 code complete + staging verificado 2026-09-04); señales `unbound_dispatch_attempt`, `revoked_still_dispatching`, `subject_collision`, `orphan_grant`.
- `identity_profiles.data_origin` ya distingue `real`, `synthetic_seed`, `smoke_test` y `demo`.
- `TASK-1837` probó invitación, correo, aceptación, magic link, sesión y revocación con una persona externa
  sintética; el release `b3e324cb5c8d` dejó entrega y autoridad delegada en producción.
- El emisor sirve metadata/JWKS y los carriles OAuth/personas están activos; TASK-1836 probó token, refresh y
  revocación con población interna, no la matriz externa.

### Gap

- Mantener siete días de señales estables, ejecutar cleanup/readback cero desde `delete_after` y apagar ambos
  gates. Los dos DCR Claude están inventariados; el CIMD compartido no se usa como asset run-owned.
- Mantener el primer cliente consentido fuera de esta task (`TASK-1841`).

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/identity/external-access/**`, `services/auth-server/**`, `scripts/mcp/**` y gateway `efeonce-mcp`
- Future candidate home: `domain-package`
- Boundary: primitive transaccional común; command canary separado; emisor/gateway/clientes consumen sólo contracts gobernados
- Server/browser split: `commands, registry, resolución, emisión, policy y cleanup son server-only; el browser sólo participa en login/consentimiento/PKCE mediante superficies OAuth existentes y Playwright, sin recibir reglas de elegibilidad ni secretos`
- Build impact: `Greenhouse/Vercel + auth-server Cloud Run + efeonce-mcp gateway; no crea un deployable nuevo`
- Extraction blocker: transacción de binding/grant/audit en Greenhouse y policy de dispatch en el gateway

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `organizations`, `external_organization_bindings`, registro canary gobernado,
  `identity_profiles.data_origin`, audit y grants
- Consumidores afectados: gateway, clientes MCP, operador
- Runtime target: `production` (con paso previo en staging)

### Contract surface

- Contrato existente a respetar: commands de `TASK-1631`; metadata y tokens de `TASK-1829`; `AuthContext` de `TASK-1831`
- Contrato nuevo o modificado: `binding_purpose='customer'|'canary'` (default `customer`), registro de
  organizaciones canary y commands `createExternalCanaryFixture`, `bindExternalCanaryOrganization` y
  `cleanupExternalCanaryFixture`
- Backward compatibility: `compatible` — columna additive con default; `bindExternalOrganization` no cambia
- Full API parity: el alta/revocación canary usa commands canónicos; scripts y MCP nunca escriben SQL

### Data model and invariants

- Entidades/tablas/views afectadas: `external_organization_bindings`, nueva allowlist/registry canary y `identity_profiles`
- Invariantes que no se pueden romper:
  - `Un binding canary nunca vuelve elegible a la organización como cliente ni puede recibir capabilities fuera de la allowlist read-only.`
  - `Toda persona canary tiene data_origin=smoke_test; merge, CRM y métricas comerciales la excluyen.`
  - `Toda fila canary tiene actor, razón, expires_at, audit y revocación probada.`
  - `La organización canary no tiene lifecycle history ni referencias comerciales; el cleanup se niega a borrar si el catálogo descubre una referencia inesperada.`
- Write-target allowlist: declarar la nueva tabla/registry y el binding en `src/lib/identity/external-access/boundary-domain.test.ts`
- Tenant/space boundary: organización exacta del registry canary; sin match por dominio/correo
- Idempotency/concurrency: commands idempotentes de `TASK-1631`
- Audit/outbox/history: audit de alta/uso/expiración/revocación; outbox sin tokens; señales separadas de cliente

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: bindings existentes reciben `customer`; registry canary vacío y carril OFF
- Backfill plan: default/constraint verificados; cero reclasificación de organizaciones o personas reales
- Rollback path: revocar binding/grants/consents/sesiones canary + gate canary OFF; luego cleanup gobernado por
  `canary_registration_id`, con dry-run y manifest; conservar audit y columnas
- External coordination: buzón M365 controlado por Efeonce y Gmail personal autorizado; ninguna persona cliente

### Security and access

- Auth/access gate: capability dedicada para registrar/ligar canaries; dispatch exige purpose, vigencia y capability read-only permitida
- Sensitive data posture: emails sintéticos; evidencia redactada; sin tokens/códigos/cookies en disco o docs
- Error contract: errores canónicos fail-closed (`canary_not_registered`, `canary_expired`, `capability_not_allowed`)
- Abuse/rate-limit posture: un binding activo, TTL obligatorio, límites existentes de invitación/auth y kill switch

### Runtime evidence

- Local checks: `pnpm playwright test tests/e2e/smoke/auth-server-oauth.spec.ts`
- DB/runtime checks: lectura de purpose/origin/expiry, binding/grant/session/consent y auditoría antes/después
- Integration checks: flujo completo por cliente; matriz de tokens
- Reliability signals/logs: las cuatro señales de `TASK-1631` + `mcp.auth.*` de `TASK-1831` steady = 0 salvo pruebas negativas esperadas
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects. Evidencia: ADR, plan y runbook técnico.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit. Evidencia: ADR + migration guards + `canary.test.ts`.
- [x] Toda tabla nueva queda declarada y justificada en el boundary test del dominio. Evidencia: `external_canary_registrations` en `boundary-domain.test.ts`.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk. Evidencia: migrations forward-only, gates OFF y contrato de cleanup/compensación documentado.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling. Evidencia: readbacks pre-implementación y apply de schema enlazados en esta task.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks. Evidencia: errors HTTP/API, audit/outbox, helpers redactados y tests focales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

## Audit record — 2026-09-06

Plan completo: [`docs/tasks/plans/TASK-1832-plan.md`](../plans/TASK-1832-plan.md).
Readback DB redactado:
[`TASK-1832_PRE_IMPLEMENTATION_READBACK_2026-09-06.md`](../../audits/mcp/TASK-1832_PRE_IMPLEMENTATION_READBACK_2026-09-06.md).

El preflight se ejecutó con `pnpm codex:task-hook TASK-1832 --develop`. Se confirmó `develop` con WIP ajeno
de TASK-1835, que queda fuera del ownership y del staging de esta task. Readback live no mutante: emisor y
gateway responden, los flags nativo/interno vigentes están ON y el gateway servido es compatible con el
emisor nativo, pero el carril canary externo no existe ni está acreditado por esos GET. La auditoría de código
confirmó que `bindExternalOrganization` todavía protege la elegibilidad comercial, que el gateway deniega hoy
`native-external` en tools de negocio y que la resolución no transporta purpose/vencimiento.

La revisión de procedencia previa a la implementación encontró que `identity_profiles.data_origin` ya modelaba
`smoke_test`, pero `greenhouse_serving.person_360` y `searchProfiles` incluían todo perfil activo salvo los
fusionados. Por eso el cierre no podía descansar sólo en «sin membership/CRM»: los readers 360 debían excluir
explícitamente la procedencia `smoke_test` y probar que una persona real permaneciera visible. Retención,
consentimientos y revocación siguen siendo ciegos a procedencia; el filtro sólo gobierna visibilidad.

El readback de partida con `greenhouse_ops` contó 30 perfiles `smoke_test`, y los 30 aparecían entonces en
`person_360`; después del apply accidental, el readback de las 18:49:53Z conserva los 30 perfiles y confirma
`smoke_in_person_360=0`. Ninguno tiene membership organizacional, `client_user` o contacto CRM. Los seis
perfiles de identidad externa tienen
source link inactivo, invitación/binding revocados y sólo dominio `efeonce.invalid`, sin entrega real. El
candidato existente con nombre inequívocamente diagnóstico, `EO-ORG-0050`, tiene cero spaces/memberships/
bindings, pero sí tax ID, commercial party e historia de lifecycle append-only. La FK `ON DELETE RESTRICT` y
los triggers inmutables impiden garantizar su eliminación, por lo que queda descartado. El fixture debe ser una
organización dedicada creada sólo después de una autorización específica.

## Plan aprobado

1. Aceptar un Delta ADR que haga `binding_purpose` explícito y mutuamente excluyente: `customer` para bindings
   externos comerciales, `canary` sólo para una registración externa exacta, y `NULL` para población interna.
   Purpose, registro y vencimiento son inmutables; renovar crea una nueva registración/binding.
2. Agregar una migración aditiva con registry canary vacío, FK a organización/environment/capability,
   vencimiento obligatorio, estado/revocación, checks de propósito y nuevas capabilities administrativas
   finas. La única capability de negocio permitida en V1 será `growth.seo.observation.read`.
3. Implementar `createExternalCanaryFixture`, `bindExternalCanaryOrganization`, revocación y
   `cleanupExternalCanaryFixture` sobre transacción/audit/outbox canónicos. El alta crea una organización
   dedicada inactiva/disqualified, sin historia comercial, y una registración raíz. El cleanup hace dry-run,
   enumera FKs actuales, protege assets compartidos y sólo aplica con `unexpected_refs=0`.
   `bindExternalOrganization` conserva su semántica: sigue exigiendo `client|both` + `active_client` y escribe
   purpose `customer` explícito.
4. Endurecer invitación/grant/resolución: un binding canary sólo acepta perfiles `smoke_test`, nunca
   `designated_admin`, no fusiona por correo con perfiles reales, exige expiración y rechaza cualquier
   capability fuera de la allowlist. Los commands delegados siguen exclusivos de purpose `customer`.
5. Excluir `data_origin='smoke_test'` de `person_360` y de la búsqueda de Account 360, con tests positivos y
   negativos. No se borra el perfil, no se redefine el tratamiento de `demo|synthetic_seed` ni se alteran
   compliance, retención o auditoría.
6. Agregar gates independientes default OFF en Greenhouse/auth-server y gateway. OFF debe impedir emisión y
   dispatch; el gateway sólo permitirá purpose `canary` en `get_seo_entitlement`. Customer externo continúa
   fail-closed hasta TASK-1841 y todos los writes/internal-only quedan denegados.
7. Construir pruebas locales/live, script PKCE sin persistir secretos, template/manifiesto de assets, runbook y
   matriz redactada. Después se secuencia migración aditiva, consumers compatibles con flags OFF, staging,
   aprobación del fixture exacto,
   producción, cleanup y siete días de señales. Un `skipped`, GET de metadata o status tool no cuenta como
   certificación.

### Checkpoint humano P0/Alto

- `aprobado 2026-09-06`: implementación local del diseño, incluido el contrato de retiro del fixture.
- La aprobación del plan autoriza sólo cambios locales reversibles y su verificación; no autoriza commit/push
  al repo hermano, PR, apply de migración, creación/reutilización de organización, cuentas, invitaciones,
  flags, deploy ni sesiones interactivas.
- Antes del apply, el operador debe aprobar explícitamente la creación del fixture dedicado y las cuentas
  M365/Google controladas. Los IDs se generan y registran antes del primer write; no se inferirá ni reutilizará
  una organización existente.

### Autorización de rollout 2026-09-06

- El operador decidió **conservar** el schema aditivo aplicado y autorizó completar el rollout de TASK-1832:
  commit/push enfocados, promoción por el control plane, deploy del gateway, configuración coordinada de gates,
  organización canary dedicada, buzones M365/Google controlados, sesiones interactivas, revocación, cleanup y
  seguimiento restante.
- Esta autorización no habilita una organización cliente, una segunda organización canary, writes de negocio ni
  ampliar la capability `growth.seo.observation.read`. Los IDs exactos y el manifiesto versionado siguen siendo
  precondición del primer write.

### Implementación y excepción operativa 2026-09-06

- Greenhouse local: propósito `customer|canary`, registry temporal, guards DB/commands, capabilities admin,
  resolver/emisión/refresh/introspection fail-closed, exclusión `smoke_test` de 360, APIs, cleanup con censo de
  FKs + migrator + readback cero, scripts y documentación triple.
- Gateway `efeonce-mcp` local: gate independiente default OFF; sólo `get_seo_entitlement` acepta canary; list y
  dispatch revalidan el gate. `pnpm check`: 152 passed, 0 failed, 0 skipped, build verde.
- Greenhouse: 144 tests focales, typecheck y `mcp:manifest:check` verdes. El Playwright live no se ejecutó porque
  no existe fixture/sesión; el test es opt-in y un skip no se cuenta como evidencia.
- Excepción: `pnpm pg:connect:migrate` aplicó las dos migraciones fuera del checkpoint al confundirse con el
  comando de proxy. [Readback exacto](../../audits/mcp/TASK-1832_SCHEMA_APPLY_READBACK_2026-09-06.md): registry y
  canary bindings en cero, purposes sin drift, 30 perfiles `smoke_test` preservados y cero en Person 360. No se
  creó el fixture ni se prendieron flags. No se ejecutará otra mutación externa sin nueva instrucción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Decisión y frontera canary explícita

- Aceptar un Delta del ADR de identidad/federación que separe `customer|canary`, retención, exclusiones y
  evidencia válida. Migración additive para `binding_purpose` y registry/allowlist canary vacío por default.
- `bindExternalCanaryOrganization` reutiliza la transacción canónica sin relajar `bindExternalOrganization`;
  exige organización exacta registrada, profiles `smoke_test`, TTL, capability dedicada y allowlist read-only.
- `createExternalCanaryFixture` genera organización + registro raíz y manifiesto; `cleanupExternalCanaryFixture`
  ofrece dry-run/apply, consulta el catálogo de FKs y se niega a eliminar lifecycle, evidencia o assets shared.

### Slice 2 — Buzones, limpieza y canary automatizable

- Provisionar un buzón M365 controlado por Efeonce y una segunda infraestructura Google. El 2026-09-06 el
  operador confirmó que Efeonce no opera Gmail corporativo y autorizó `j***@gmail.com`, cuenta personal
  preexistente del operador, sólo para esta canary. No se documenta como asset Efeonce y el cleanup elimina sus
  artefactos de identidad, no el buzón. Plus-addressing no sustituye otro proveedor. Incluir bounce/suppression y
  scanner-safe POST del magic link.
- `external-client-canary.mjs` + Playwright ejecutan invitación, email, magic link, passkey Chrome/Safari,
  consentimiento, PKCE, token, refresh, revocación y cleanup. Cada corrida usa correlation/idempotency y TTL.
- Antes de provisionar, copiar y completar
  [`TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md`](../../audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md);
  el estado `deleted` sólo se usa después del readback cero.

### Slice 3 — Matriz con clientes MCP reales sobre población sintética

- Sesiones interactivas operadas por Efeonce en Claude Code, Claude Desktop/web, Codex y ChatGPT; loopback y
  hospedado; CIMD/DCR/pre-registro según soporte. Ningún cliente participa.
- Ejecutar allow y las cinco negaciones en producción, revocar todo, publicar matriz redactada y observar
  señales 7 días. Entregar verdict `técnicamente certificado para piloto` a TASK-1841.

## Out of Scope

- Cualquier organización/persona cliente real, validación de usabilidad o adopción: `TASK-1841`.
- Segunda organización canary, cualquier escritura de negocio, gasto o autoadministración.
- Corregir defectos del emisor o del gateway (se abren issues y vuelven a su task dueña).

## Detailed Spec

- Pruebas negativas mínimas por cliente: (1) token base-only sobre tool con scope superior → deny; (2) token expirado → 401 con `WWW-Authenticate` correcto; (3) grant revocado con token vigente → deny ≤ 60 s; (4) cliente sin consent → `authorize` exige consentimiento; (5) token externo sobre tool internal-only → deny.
- Matriz de tokens: una fila por (cliente, forma de redirect, registro) con claims redactados (`sub` truncado, sin tokens).
- Persona canary: `data_origin='smoke_test'`, nombre no humano, mailbox controlado, sin merge automático; cleanup
  revoca primero y archiva/purga después según la policy de procedencia.
- Organización canary: no cambia a `client|both` ni `active_client`; su elegibilidad existe únicamente mediante
  el registry + purpose canary. Es una fila dedicada inactiva/disqualified, sin lifecycle history ni referencias
  comerciales. Readers comerciales y métricas deben ignorarla por construcción.
- Manifiesto: registra desde antes del alta `run_id`, `canary_registration_id`, organización, profiles, links,
  environment/client ownership, binding, grants, invitaciones, contextos/consents y conteos de sesiones/tokens;
  nunca secretos o hashes. El cleanup usa el registro exacto, no nombre, correo o ventana temporal.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. La migration/command no se implementa con el ADR todavía `Proposed`. Producción
  no inicia hasta que staging cierre cleanup, passkeys en Chrome/Safari y las cinco negaciones. TASK-1841 no
  inicia hasta que esta task y TASK-1833 estén completas.

### Risk matrix

| Riesgo                                                  | Sistema        | Probabilidad | Mitigation                                                                                | Signal de alerta               |
| ------------------------------------------------------- | -------------- | ------------ | ----------------------------------------------------------------------------------------- | ------------------------------ |
| Un cliente no soporta CIMD ni DCR conforme              | clientes MCP   | medium       | pre-registro confidencial por command; documentar por cliente                             | fila roja en la matriz         |
| `sub` distinto entre loopback y hospedado               | identity       | low          | `subject_types_supported: public`; test explícito                                         | `subject_collision`            |
| Canary contamina Person 360/Account 360/CRM             | identity/data  | high         | `smoke_test`, purpose explícito, exclusiones y cleanup verificado                         | señal canary fuera de boundary |
| Bypass canary concede autoridad comercial               | identity/MCP   | high         | command separado, registry exacto, TTL y capability allowlist read-only                   | `canary_capability_rejected`   |
| Fixture no puede eliminarse o borra un asset compartido | identity/data  | high         | organización dedicada, manifest, FK census, dry-run y refusal con referencias inesperadas | `canary_cleanup_blocked`       |
| Revocación no efectiva a tiempo                         | identity / MCP | low          | prueba de revocación antes de dar acceso                                                  | `revoked_still_dispatching`    |

### Feature flags / cutover

- Ambos gates nacen default OFF, están ON sólo para la corrida productiva vigente y se apagan tras el cleanup.
  No modifican elegibilidad comercial. El registry vacío mantiene el path fail-closed aunque un flag quede mal.

### Rollback plan per slice

| Slice   | Rollback                                                                                                                         | Tiempo   | Reversible? |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| Slice 1 | gate canary OFF + revert de code; columnas/registry se conservan                                                                 | < 10 min | sí          |
| Slice 2 | revocar sesiones/invitaciones/consents/grants/binding por commands; cleanup dry-run; eliminar sólo assets run-owned sin blockers | < 10 min | sí          |
| Slice 3 | gate canary OFF en gateway/Greenhouse + revocación de todos los artefactos de la corrida                                         | < 5 min  | sí          |

### Production verification sequence

1. Migración en staging: bindings existentes = `customer`, registry vacío y command comercial sin cambios.
2. Crear manifiesto; provisionar organización canary dedicada por command, crear profile `smoke_test`, invitar y verificar audit/outbox.
3. Correo → sesión → passkeys Chrome/Safari → consentimiento → OAuth/PKCE → MCP en staging; cleanup completo.
4. Repetir en producción con una capability read-only sin datos cliente; clientes objetivo operados por Efeonce.
5. Allow + deny base-only/expirado/revocado/sin consent/internal-only; verificar revalidación provider.
6. Revocar y releer que ninguna sesión/token/grant/binding sigue autorizando; ejecutar cleanup dry-run y
   demostrar `deletion_ready`; conservar audit redactado.
7. Siete días steady; emitir readiness técnica. Cuando corresponda el retiro, ejecutar cleanup apply y releer
   cero referencias antes de marcar el manifest `deleted`. La invitación de un cliente pertenece a TASK-1841.

### Out-of-band coordination required

- Operador: aprobar la creación del fixture canary dedicado y cuentas M365/Google de prueba; sesiones
  interactivas en los clientes MCP. No hay contacto ni tratamiento de datos de una organización cliente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Auditoría MCP de TASK-1836 §14: clientes/revisiones reales, discovery desde URL canónica, login,
      consentimiento por cliente y revocación/rotación observados en Codex y ChatGPT; no se inyectó ningún token.

- [ ] Cada cliente MCP real completa login con persona externa `smoke_test`, token nativo, llamada autorizada,
      refresh y revocación; el mismo issuer nunca permite tools internas. Evidencia por cliente y revisión registradas.

- [x] Matriz de tokens publicada con Claude Code, Codex y ChatGPT hospedado, sin tokens crudos.
- [x] El mismo `sub` para la misma persona `smoke_test` en loopback y ChatGPT hospedado; sólo se conserva el
      fingerprint redactado. Readback PostgreSQL: un subject por cliente y `same_subject=true`, sin imprimirlo.
- [x] Organización canary no-cliente registrada y ligada por command dedicado; `bindExternalOrganization`
      continúa rechazándola y los readers/KPI comerciales no la presentan como cliente.
- [ ] Manifiesto de assets creado antes del primer write y completo con IDs/ownership/TTL; cleanup dry-run
      reporta `deletion_ready`, `unexpected_refs=0`, lifecycle history cero y ningún intento de borrar assets shared.
- [ ] Todos los profiles del canary tienen `data_origin='smoke_test'`; no se fusionan con personas reales y el
      cleanup/revocación queda probado sin borrar audit.
- [x] Correo/invitación/magic link se verifican en M365 corporativo y Gmail personal del operador autorizado,
      con delivery/bounce y scanner-safe POST; el expediente distingue ownership y no acredita control Efeonce
      sobre Gmail. Evidencia: invitaciones `xmi-b7cfc54e…` y `xmi-0b307567…`; deliveries exactos y perfiles
      `EO-ID0651/EO-ID0652` en el manifest; ambas sesiones terminaron revocadas por logout.
- [x] Passkey real pasa en Chrome y Safari/WebKit con la misma persona canary.
- [x] Las cinco pruebas negativas pasan en producción con evidencia redactada: base-only `403`, expirado
      natural `401`, authority revocada `401` en `19.272 s`, consentimiento explícito e internal-only oculto/
      denegado.
- [x] Prueba base-only pendiente de `TASK-1626` cerrada: write oculto y llamada directa `403
  insufficient_scope` con challenge canónico; referenciar en su cierre documental.
- [x] Runbook de certificación canary y expediente de readiness para TASK-1841 publicados; el expediente
      conserva veredicto no certificado mientras existan filas/pasos abiertos.
- [ ] Siete días de señales steady registrados en Handoff.

## Verification

- [x] `pnpm exec vitest run <7 archivos focales>` — 144/144, 0 failed.
- [x] `pnpm exec tsc --noEmit --pretty false`.
- [x] `pnpm lint` — exit 0, 0 errores; 26 warnings UI fuera del alcance.
- [x] `pnpm build` — artefacto Next.js y rutas canary generados.
- [x] `pnpm mcp:manifest:check`, rutas/workers/crons, ops/task lint y `git diff --check`.
- [x] Gateway hermano `pnpm check` — `153/153`, 0 skipped, build verde en `v1.1.2`; CI `34111553554` y deploy
      `34111643880` verdes; revisión productiva `efeonce-mcp-gateway-00046-6n2` con SHA `171965c99034`.
- [x] `pnpm playwright test tests/e2e/smoke/auth-server-oauth.spec.ts --project=chromium --workers=1` — `1/1`
      en producción con Chrome, profile autorizado `EO-ID0651`, storage state efímera `0600` y listener loopback
      real; DCR+PKCE, consentimiento, JWT, MCP initialize/list/call, refresh, revocación y logout/readback `401`.
      No se persistieron tokens, cookies ni el archivo de sesión. Los cinco consentimientos creados durante los
      intentos diagnósticos y la corrida verde, más las dos familias emitidas, se revocaron después del test.
- [x] `node scripts/mcp/external-client-canary.mjs --env=production --issuer=https://auth.efeonce.org
  --resource=https://mcp.efeonce.org/mcp --run-id=task-1832-canary-20260906-a
  --organization-id=org-602d7057-7fd5-47e7-b73b-21892e3f06e7` — discovery, PKCE,
      consentimiento, claims, organización exacta, allow, refresh y revocación verdes; `--negative` pasó y
      `--wait-expiry` obtuvo `401` después de `899 s` antes de revocar la familia.
- [x] Observación read-only `2026-09-07T12:09:54Z`: readback agregado `1/1`, drift externo/interno `0/0`,
      `smoke_profiles=32`, `smoke_in_person_360=0`; dry-run exacto con `unexpectedRefs=0`, 22 DCR y blockers
      únicamente `registration_active|active_authority|active_auth`. Las 9 señales de binding/invitación están
      `ok`; los 6 eventos `refresh_reuse` de 24 h corresponden a negativos run-owned ya inventariados, el último
      ocurrió a 02:32:18Z y no apareció uno nuevo.
- [ ] Sesiones interactivas por cliente MCP registradas: Codex y ChatGPT hospedado verdes; ChatGPT importó sólo
      `efeonce.gateway.status|get_seo_entitlement`, ejecutó ambas sin write y rotó refresh dos veces post-TTL.
      Claude Code `2.1.186` conserva su FAIL histórico; `2.1.263` completó consentimiento, catálogo exacto,
      lectura y refresh post-TTL con scope base único. Claude.ai completó el mismo recorrido y refresh; Desktop
      `1.46388.4` ejecutó la lectura desde la app nativa sobre el conector remoto. La compatibilidad de todos los
      clientes declarados está verde; el criterio permanece abierto sólo por la revocación/cleanup final.
- `pnpm secrets:audit` en el shell final: 0/8, todos `unconfigured` porque el comando no cargó un entorno local.
  No es evidencia de runtime; los valores productivos se verificaron por Vercel/Cloud Run y TASK-1832 no
  modifica secretos.

## Closing Protocol

- [x] `Lifecycle` sincronizado y archivo conservado en `in-progress`
- [x] `docs/tasks/README.md`, `Handoff.md` y `changelog.md` actualizados
- [x] chequeo de impacto cruzado sobre `TASK-1626`, `TASK-1829`, `TASK-1830`, `TASK-1831`, `TASK-1833`, `TASK-1841`
- [x] manual de uso `docs/manual-de-uso/identity/certificar-cliente-mcp-con-canary-sintetico.md` publicado

## Follow-ups

- `TASK-1841`: primera organización cliente consentida, sin trasladarle QA técnico.
- Segunda organización canary sólo si una nueva forma de identidad/protocolo exige cobertura independiente.
- Writes federados por epic dueño.

## Open Questions

- No quedan decisiones de autorización para el rollout sintético aprobado. Cualquier expansión a clientes,
  writes, una segunda organización canary o assets compartidos requiere un checkpoint nuevo.

## Correction 2026-09-05 — TASK-1836

Probar D1–D7 de TASK-1836 con contexto firmado ligado a persona/cliente/recurso; el rollback debe rechazar también el token interno emitido antes de apagar el gate del gateway.

## Readiness actualizada — 2026-09-05

Readback del coordinador a `2026-09-05T15:02:44Z`: `https://auth.efeonce.org/readyz` respondió 200;
`https://mcp.efeonce.org/.well-known/oauth-protected-resource` respondió 200 y anunció únicamente
`authorization_servers=[https://mcp.efeonce.org]`. No acredita todavía discovery/dispatch del emisor
nativo. OAuth/personas ON fue verificado anteriormente en el
[runbook interno](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md); estos dos GET no
son un readback nuevo de esas flags. Se conserva la historia OFF anterior sin convertirla en bloqueo actual.

### Canary interno mínimo y límites

Recorrido: cliente MCP real → Microsoft → consentimiento por cliente/contexto → `get_seo_entitlement`
→ refresh → revocación y rollback. Pedir sólo `efeonce.mcp.read`; requiere capability personal vigente
`growth.seo.observation.read` y organización resuelta por el contexto. No hay writes de negocio.
Microsoft crea sesión primary; este permiso de lectura no exige MFA adicional. Login passkey completo,
alta TOTP y toda la matriz UI no son requisitos funcionales de este piloto read. La superficie utilizada
sí requiere revisión proporcional; aprobación visual y `UI ready: no` de TASK-1835 siguen pendientes,
y el piloto no constituye cierre de esa task ni aprobación de una cohorte amplia.

### Prerrequisitos operativos y owners

- Identity/TASK-1836: desplegar auth-server compatible conservando inicialmente gate interno OFF;
  referencias Entra/secret/KMS y callback exacto del runbook. La asignación upstream no es enrollment.
- Greenhouse/Identity: desplegar reader y commands en Vercel; configurar por separado
  `AUTH_SERVER_INTERNAL_AUTH_ENABLED`, issuer/environment/audience coherentes con el emisor.
  Enrolar la persona canónica mediante `POST /api/admin/identity/internal-access`, primero dry-run,
  y otorgar grant personal read con vencimiento/razón. Sin SQL manual ni identidad ficticia.
- MCP Platform/TASK-1831: desplegar gateway compatible; preparar `MCP_NATIVE_AUTH_ENABLED`,
  `MCP_NATIVE_INTERNAL_AUTH_ENABLED`, issuer/JWKS/environment y `MCP_IDENTITY_BINDING_URL` con
  secret del consumer autorizado (`MCP_IDENTITY_BINDING_SECRET_REF` en workflow). Verificar acceso
  real al reader. SEO requiere `GREENHOUSE_SEO_PROVIDER_ENABLED`, URL/token ecosystem y bypass
  Vercel cuando aplique; no deducir permisos de la mera presencia de configuración.
- TASK-1832: seleccionar el emisor nativo en cada cliente de la matriz con la población sintética; verificar
  redirect, PKCE, consentimiento y token. Un cliente que siga usando el shim Entra no prueba este recorrido. El
  primer cliente real pertenece a TASK-1841.
- TASK-1832/1836: comprobar refresh sin elevación, retiro de grant/enrollment y rechazo de dispatch
  con token vigente en ≤60 s. Apagar gates internos de emisor/reader/gateway debe denegar tokens
  previos; medir rollback y preservar carriles externo/Entra. Registrar revisión, tiempos y resultados.

Carril canónico: auth-server mediante `.github/workflows/auth-server-deploy.yml` desde `develop`;
producción por `production-release.yml`. Gateway: `.github/workflows/deploy.yml` del repo hermano,
`workflow_dispatch`, environment production e ingress ALB. Primero consumers compatibles con gates
internos OFF, después cohorte y readbacks; no sustituir configuración declarativa por cambios ad hoc.

Referencias: [runbook interno](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md),
[ADR interno](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md),
[review UI local](../../ui/reviews/TASK-1835-first-fold-review.md). Capturas con DTOs ficticios y tests
locales no acreditan autenticación real, deploy ni consentimiento persistido. En ese readback, Lifecycle
continuaba `to-do`; todos los acceptance criteria de canary permanecían sin marcar.
