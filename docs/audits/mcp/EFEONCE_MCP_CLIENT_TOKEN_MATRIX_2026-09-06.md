# Efeonce MCP — matriz de clientes y tokens del canary externo

> TASK-1832 · abierta 2026-09-06 · estado: **canary productivo en observación; helper, Playwright, Codex,
> ChatGPT hospedado, Claude Code `2.1.263`, Claude.ai y Claude Desktop `1.46388.4` certificados; sólo quedan
> observación y retiro**.

## Alcance y regla de evidencia

La corrida usa una organización canary dedicada y dos personas `smoke_test`. No contiene tokens, codes,
cookies, verifiers, secretos, correos completos ni `sub` crudo. Un verde prueba compatibilidad técnica; no
prueba adopción, usabilidad ni experiencia de una organización cliente.

La release productiva `fb5fc082aa92-3f2c8706-24fa-452d-be8f-6feea7b8cdd9` quedó `released`. El reader
Vercel sirve el SHA `fb5fc082aa92f6b65d0be0ff9e519ce648752f2f`; el emisor sirve ese SHA en
`auth-server-00043-ndg`; el gateway sirve `171965c9903490fe6fa6fde17f3c15e9646b149f` en
`efeonce-mcp-gateway-00046-6n2`. Ambos gates canary están `true` y el watchdog quedó `ok`; tres señales de
GitHub quedaron `unknown` por falta de `GITHUB_RELEASE_OBSERVER_TOKEN`, no verdes por inferencia.

El primer intento OAuth se ejecutó antes de que el reader productivo sirviera metadata canary: el gateway
ocultó la tool y el helper abortó cerrado. Se apagaron los gates, se completó la release y sólo entonces se
repitió. El fallo se conserva como evidencia de secuenciación; no produjo writes ni elevación.

Una repetición posterior encontró una sesión interna persistente en Chrome: el consentimiento decía `Efeonce`,
no el nombre completo del fixture, y la verificación negativa no la aceptó como canary. Sólo alcanzó readers
persistidos sin gasto de proveedor ni writes. Se cerró esa sesión y se volvió a entrar por el magic link M365
del perfil sintético; el consentimiento mostró la organización canary exacta. Como corrección permanente, el
helper ahora exige `--organization-id` y compara ese ID con la respuesta de `get_seo_entitlement` antes de
aceptar el recorrido. Sus DCR y artefactos OAuth fallidos siguen marcados con el `run_id` para el cleanup final.

## Identidad de la corrida

- `run_id`: `task-1832-canary-20260906-a`
- `canary_registration_id`: `xcr-48dacd1f-ad4b-4a73-b454-3d94574e7d09`
- `manifest`: `TASK-1832_CANARY_ASSET_MANIFEST_task-1832-canary-20260906-a.md`
- `environment`: `production`, issuer `https://auth.efeonce.org`, resource `https://mcp.efeonce.org/mcp`
- `organization`: `org-602d7057-7fd5-47e7-b73b-21892e3f06e7` — dedicada, inactiva y no cliente
- `profiles`: `2`, ambos `data_origin=smoke_test`; Person/Account 360 `0`
- `expires_at`: `2026-09-14T19:43:30Z`
- `delete_after`: `2026-09-13T19:43:30Z`, tras siete días de señales y preflight final verde
- `served Greenhouse SHA`: `fb5fc082aa92f6b65d0be0ff9e519ce648752f2f`
- `served auth-server revision`: `auth-server-00043-ndg`
- `served gateway version/SHA/revision`: `1.1.2` / `171965c9903490fe6fa6fde17f3c15e9646b149f` /
  `efeonce-mcp-gateway-00046-6n2`

### Incidente fail-closed del runtime compartido

El push `b69f5297d` activó el workflow staging `34071542507`, que desplegó el mismo Cloud Run con
`EXTERNAL_IDENTITY_CANARY_ENABLED=false`: `auth-server-00042-hp5` sirvió 100 % desde 01:07:25Z. No hubo
elevación ni exposición; el carril canary quedó temporalmente indisponible. El dispatch production
`34072064873`, fijado al SHA released `fb5fc082aa92`, restauró a las 01:15:47Z la revisión
`auth-server-00043-ndg`, el gate `true`, 100 % de tráfico y `Ready=True`. `readyz` respondió 200 y el preflight
OAuth/MCP confirmó metadata, issuer nativo y dos llaves JWKS. Como ambos environments de GitHub despliegan el
servicio único, se eliminaron sus overrides y quedó una sola variable de repositorio en `true`; esto no cambia
Vercel staging. Una lectura posterior del control plane de Vercel encontró que la variable de staging estaba
incorrectamente en `true`, aunque el ledger la declaraba OFF. Se corrigió el valor exacto del environment custom
a `false` y se reconstruyó staging inicialmente en `dpl_6UUXxsT7eS4EL44kkLWuDrHFqKDT`. La posterior build de
`develop@c75a07f` quedó READY como `dpl_D9mkjQLE1a26H4TXQ2HX7wXWMpLf` desde
`2026-09-07T02:03:16.160Z`. Operación desde el checkout compartido `develop`, team `efeonce-7670142f`, proyecto
`greenhouse-eo` (`prj_d9v6gihlDq4k1EXazPvzWhSU0qbl`), target `staging`, URL
`greenhouse-9x1o1j4gn-efeonce-7670142f.vercel.app`; los aliases
`greenhouse-eo-env-staging-efeonce-7670142f.vercel.app` y `dev-greenhouse.efeoncepro.com` apuntan a este último
deployment. `vercel curl /api/auth/session` respondió 200 sobre su URL. Production conservó `true` y no se
redeployó. Esta evidencia confirma configuración, build y salud mínima, no
una prueba flow-level del carril apagado. El retiro debe cambiar también la variable GitHub a `false`.

## Matriz de correo, sesión y passkey

| Superficie        | Evidencia                                                                                                    | Resultado                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| M365 compartido   | mensaje visible en `Creative - Efeonce`; delivery `2108c319-c433-4c82-90e0-e5304b6fde5c`, `delivered`        | `PASS`                                      |
| Magic link Chrome | consumo scanner-safe por POST; sesión `amr=magic_link`; logout/revocación en DB                              | `PASS`                                      |
| Passkey Chrome    | plataforma real; registro + login `primary` + step-up `passkey,uv`; logout                                   | `PASS`                                      |
| Passkey Safari    | misma credencial descubrible; login `amr=passkey`; logout con razón `logout`                                 | `PASS`                                      |
| Gmail autorizado  | cuenta personal del operador, alias plus aislado; invitación y magic link `delivered`, consumo POST y logout | `PASS`, no es evidencia laboral/corporativa |
| Marca del correo  | objeto público compartido reparado; HTTP 200 `image/png` y wordmark visible al recargar Gmail                | `PASS`; se conserva al retirar el canary    |

## Matriz de compatibilidad

| Cliente            | Revisión                                         | Redirect                                 | Registro                              | Discovery                                  | Login + consentimiento                                                                                                          | Claims redactados                                                                     | Allow read                                                                      | Refresh / revocación                                                            | Resultado          |
| ------------------ | ------------------------------------------------ | ---------------------------------------- | ------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------ |
| helper TASK-1832   | `task-1832-v1`                                   | loopback dinámico `/callback`            | DCR públicos `dcr-UObj…` y `dcr-KyB…` | metadata/JWKS/PRM live                     | organización exacta, sólo `efeonce.mcp.read`; la guarda confirmó `organizationIdMatches=true`                                   | `iss`/`aud`/`azp` válidos; fingerprint `75eb972f8b2f1eae`; `gv=6`; `exp` presente     | `get_seo_entitlement`                                                           | refresh rotó; familia revocada; refresh posterior `invalid_grant`               | `PASS`             |
| Playwright Chrome  | `task-1832-playwright-v1`                        | loopback dinámico con listener HTTP real | DCR público con `software_id=run_id`  | metadata/JWKS/PRM live                     | storage state efímera de `EO-ID0651`; consentimiento visible con host exacto y scope base                                       | JWT `iss`/`aud`/`azp`/`gv` verificado; fingerprint sólo en attachment local redactado | `initialize`, `tools/list`, `get_seo_entitlement`                               | refresh rotó; familia revocada; refresh posterior `invalid_grant`; logout `401` | `PASS — 1/1`       |
| Claude Code        | `2.1.186`                                        | `http://127.0.0.1:18432/callback`        | pre-registrado DCR `dcr-PUG…`         | descubrió PRM/AS                           | no llegó al consentimiento: solicitó catálogo completo, scopes cualificados duplicados y writes; emisor rechazó `invalid_scope` | no emitidos                                                                           | no ejecutado                                                                    | no emitidos                                                                     | `FAIL — TASK-1813` |
| Claude Code        | `2.1.263`                                        | `http://localhost:18432/callback`        | DCR run-owned `dcr-ErE…`, scope base  | PRM/AS live; solicitud mínima              | organización exacta; consentimiento único `efeonce.mcp.read`; login nuevo completado                                            | token aceptado; sin exponer token/subject                                              | catálogo exacto de 2 read-only; SEO `no_entitlement`; write oculto              | post-TTL: 2 access/refresh, 1 rotado y 1 activo; scope base único                | `PASS`              |
| Claude.ai web      | custom connector, 2026-09-07                     | `https://claude.ai/api/mcp/auth_callback` | DCR público run-owned `dcr-mLT…`     | PRM/AS live; Streamable HTTP                | organización exacta; consentimiento único `efeonce.mcp.read`; OAuth siempre requerido                                          | token aceptado; sin exponer token/subject                                              | catálogo exacto de 2 read-only; SEO `no_entitlement`, contadores `0`            | post-TTL: 2 access/refresh, 1 rotado y 1 activo; scope base único                | `PASS`              |
| Claude Desktop     | app `1.46388.4`, UI nativa                       | conector remoto vinculado a la cuenta    | reutiliza DCR hospedado `dcr-mLT…`    | infraestructura hospedada compartida        | chat sincronizado abierto desde `Claude.app`; aprobación propia de una sola invocación                                          | mismo contexto hospedado; sin exponer token/subject                                    | SEO `no_entitlement`, contadores `0`, ejecutado desde Desktop                    | usa la familia hospedada ya renovada                                             | `PASS`              |
| Codex              | `0.153.4`                                        | `http://127.0.0.1:<dinámico>/callback`   | DCR público limitado `dcr-BUH…`       | PRM/AS live                                | intento descubierto con scopes extra rechazado; retry sin scopes mostró la organización exacta y sólo lectura; autorizado       | token aceptado por gateway; sin exponer token/subject                                 | sesión nueva listó e invocó `get_seo_entitlement`; `no_entitlement`, cero gasto | OAuth del cliente válido; rotación/revocación cubierta por helper               | `PASS`             |
| ChatGPT            | app `asdk_app_6a9e…`, versión `asdk_app_v_6a9e…` | HTTPS hospedado                          | DCR `dcr-c5TpuN…`                     | PRM/AS live; exactamente 2 tools read-only | organización canary exacta; consentimiento único `efeonce.mcp.read`; sin `offline_access`                                       | mismo subject/fingerprint redactado que loopback; issuer/audience válidos             | `get_seo_entitlement` → `no_entitlement`; `efeonce.gateway.status` → `ready`    | dos rotaciones post-TTL; 3 refresh, 2 usados y 1 activo; scope base único       | `PASS`             |

En Codex el callback local termina visualmente en `ERR_BLOCKED_BY_CLIENT` dentro del Chrome controlado por
ChatGPT. El listener ya había recibido el code: el CLI reportó `Successfully logged in` y una sesión nueva
completó la lectura. Recargar no lo corrige porque el listener efímero ya cerró. Es una deuda de cierre visual
del cliente local, no un fallo OAuth del emisor. Un cliente hospedado debe volver a su callback HTTPS y no se
puede certificar con esta pantalla.

El E2E confirma la diferencia: con un listener loopback real y todavía activo, Chrome recibió una página 200 en
el callback y la ceremonia terminó sin pantalla de error. Cuatro intentos previos que trataban de interceptar el
redirect en Playwright no capturaron la navegación; no cuentan como evidencia positiva. Sus cuatro DCR y el de
la corrida verde están inventariados. Los cinco consentimientos y las dos familias emitidas durante esos ensayos
se revocaron con el store canónico; ninguna storage state ni token quedó persistida.

La fila histórica Claude `2.1.186` permanece roja. En `2.1.263` el bootstrap queda corregido y fijado al scope
base; el login nuevo completó consentimiento y dispatch real. Una sesión mínima vio sólo las dos tools de
lectura, devolvió `no_entitlement` y no expuso el write. Después del TTL, la misma llamada rotó la familia:
dos access/refresh totales, un refresh rotado y uno activo, siempre con `efeonce.mcp.read`. El warning SEP-2352
del cliente sobre una credencial sin sello `issuer` se conserva como observación de compatibilidad, pero no
impidió conexión, llamada ni renovación.

Claude.ai agregó el mismo resource como custom connector remoto. Para preservar el retiro se eligió «usar tu
propio cliente OAuth» y un DCR público con `software_id=run_id`, callback hospedado exacto y secret vacío, en
vez del CIMD compartido detectado por Anthropic. El consentimiento mostró sólo la organización canary y el scope
base; una invocación aprobada una vez devolvió el mismo `no_entitlement` y cero gasto. Después del TTL, otra
invocación dejó dos access/refresh, un refresh rotado y uno activo, sin ampliar el scope. La app nativa Claude
Desktop `1.46388.4` abrió el chat sincronizado, pidió una aprobación propia y ejecutó una tercera lectura con el
mismo resultado. Desktop comparte la infraestructura y el DCR hospedados; no se inventa una tercera familia.

ChatGPT cerró la incertidumbre con evidencia del cliente hospedado. La app `Efeonce`
(`asdk_app_6a9e8978ca2081919753589005e001bf`, versión
`asdk_app_v_6a9e8978ca2c8191b8bf92f0cf449988`) importó exactamente `efeonce.gateway.status` y
`get_seo_entitlement`, ambas marcadas `readOnlyHint=true` y protegidas únicamente por `efeonce.mcp.read`. Tras
el login/consentimiento real ejecutó ambas sin write; la familia de tokens rotó dos veces después del TTL
inicial y mantuvo un único refresh activo. La ausencia de `offline_access` no impidió la continuidad observada,
por lo que no se amplió discovery ni scopes. La metadata sigue la [referencia oficial de plugins de
OpenAI](https://developers.openai.com/plugins/reference) y su [guía de autenticación
OAuth](https://developers.openai.com/plugins/build/auth).

La primera actualización de ChatGPT envió un `POST /mcp` con JSON vacío. Fastify lo rechazó antes de la ruta y
el handler global devolvía `500`. El gateway `v1.1.2` (`171965c99034`, CI `34111553554`, deploy `34111643880`)
autentica ese probe primero: `401` con challenge sin bearer y `400 invalid_request` con bearer válido. La llamada
hospedada posterior sobre `efeonce-mcp-gateway-00046-6n2` respondió 200 y no dejó nuevos 500. El servidor usa
los paquetes estables MCP v2 `2.0.0`; no se hizo downgrade al SDK monolítico v1.

## Pruebas negativas de protocolo y policy

| Caso                        | Evidencia live productiva                                                                                                                                                           | Resultado |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| Base-only sobre write       | `track_seo_keywords` oculto; llamada directa `403 insufficient_scope`; challenge anuncia `efeonce.mcp.seo.write`                                                                    | `PASS`    |
| Externo sobre internal-only | `get_seo_keyword_opportunities` oculto; llamada directa rechazada antes de dispatch                                                                                                 | `PASS`    |
| Authority revocada          | grant temporal revocado por command; token anterior pasó a `401 invalid_token` en `19.272 s`                                                                                        | `PASS`    |
| Sin consentimiento          | cada DCR nuevo mostró consentimiento; no hubo `prompt=none` ni grant implícito                                                                                                      | `PASS`    |
| Access token expirado       | ceremonia independiente `dcr-N7Q…`, fingerprint `75eb972f8b2f1eae`, `gv=6`; esperó `899 s` y recibió `401 invalid_token` con challenge canónico antes de rotar o revocar la familia | `PASS`    |
| Refresh/familia             | refresh rotativo; `/oauth/revoke` invalidó la familia y el refresh viejo devolvió `invalid_grant`                                                                                   | `PASS`    |

El primer ensayo de tiempo de revocación agotó 60 s mientras el operador DB aún no había ejecutado el command;
no cuenta como evidencia. Se revocó esa authority, se otorgó un grant temporal nuevo y se repitió de punta a
punta; sólo la segunda medición de `19.272 s` cuenta.

## Igualdad de sujeto

| Persona `smoke_test` | Fingerprint loopback | Fingerprint hospedado              | Resultado                                           |
| -------------------- | -------------------- | ---------------------------------- | --------------------------------------------------- |
| M365 canary          | `75eb972f8b2f1eae`   | mismo subject redactado en ChatGPT | `PASS`: mismo profile externo y organización exacta |

Readback PostgreSQL del 2026-09-07: cada cliente tuvo un único subject y la comparación directa devolvió
`same_subject=true`; la consulta no imprimió el identificador.

## Cleanup y observación

Dry-run post-clientes, sin mutación:

- grafo exacto: `2` profiles, `2` source links, `5` invitaciones y `20` clientes DCR run-owned;
- auth: `18` sesiones, `14` magic links, `2` passkeys, `5` challenges, `19` codes/consents, `25` refresh,
  `25` access tokens y `4` contexts client-scoped;
- la sesión/consentimiento ChatGPT y la credencial passkey se conservan para la ventana;
- authority: tres grants inventariados, dos revocados y uno activo read-only; binding `gv=6`;
- `unexpectedRefs=0`; lifecycle/comercial/360/hiring/finance y demás FKs no esperadas en `0`;
- los cuatro DCR usados durante el diagnóstico de la sesión interna y los cinco de Playwright están enumerados
  por ID exacto en el manifest; su retiro borra sólo hijos OAuth por `client_id` y conserva cualquier
  sesión/identidad compartida;
- `deletionReady=false` sólo por blockers esperados durante la observación:
  `registration_active|active_authority|active_auth`.

No se ejecuta `--apply` antes de `delete_after`. El cierre exige cortar authority, releer deny, obtener
`deletionReady=true`, aplicar con el ID exacto y confirmar cero para todo el grafo run-owned. El environment,
los buzones, deliveries/audit y el wordmark público son compartidos o evidencia retenida y nunca se borran.

## Veredicto

`CERTIFICACIÓN TÉCNICA DE CLIENTES PASS — runtime productivo, helper/Playwright/Codex/ChatGPT hospedado, Claude
Code 2.1.263, Claude.ai web, Claude Desktop 1.46388.4 y las cinco negativas están verdes. Los dos clientes OAuth
Claude renovaron post-TTL sin widening; Desktop ejecutó sobre el conector remoto. Permanecen abiertos siete días
de observación y el cleanup/readback final; TASK-1832 no está completa.`
