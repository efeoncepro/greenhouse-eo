# Efeonce MCP — matriz de clientes y tokens del canary externo

> TASK-1832 · abierta 2026-09-06 · estado: **canary productivo en observación; helper y Codex
> certificados, Claude Code bloqueado por interoperabilidad; clientes hospedados y retiro pendientes**.

## Alcance y regla de evidencia

La corrida usa una organización canary dedicada y dos personas `smoke_test`. No contiene tokens, codes,
cookies, verifiers, secretos, correos completos ni `sub` crudo. Un verde prueba compatibilidad técnica; no
prueba adopción, usabilidad ni experiencia de una organización cliente.

La release productiva `fb5fc082aa92-3f2c8706-24fa-452d-be8f-6feea7b8cdd9` quedó `released`. El reader
Vercel sirve el SHA `fb5fc082aa92f6b65d0be0ff9e519ce648752f2f`; el emisor sirve ese SHA en
`auth-server-00041-ltv`; el gateway sirve `8438c5fa87ed3386d5fc3f6752ac24573e2a3af3` en
`efeonce-mcp-gateway-00044-4kj`. Ambos gates canary están `true` y el watchdog quedó `ok`; tres señales de
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
- `served auth-server revision`: `auth-server-00041-ltv`
- `served gateway SHA/revision`: `8438c5fa87ed3386d5fc3f6752ac24573e2a3af3` /
  `efeonce-mcp-gateway-00044-4kj`

## Matriz de correo, sesión y passkey

| Superficie | Evidencia | Resultado |
| --- | --- | --- |
| M365 compartido | mensaje visible en `Creative - Efeonce`; delivery `2108c319-c433-4c82-90e0-e5304b6fde5c`, `delivered` | `PASS` |
| Magic link Chrome | consumo scanner-safe por POST; sesión `amr=magic_link`; logout/revocación en DB | `PASS` |
| Passkey Chrome | plataforma real; registro + login `primary` + step-up `passkey,uv`; logout | `PASS` |
| Passkey Safari | misma credencial descubrible; login `amr=passkey`; logout con razón `logout` | `PASS` |
| Gmail autorizado | cuenta personal del operador, alias plus aislado; invitación y magic link `delivered`, consumo POST y logout | `PASS`, no es evidencia laboral/corporativa |
| Marca del correo | objeto público compartido reparado; HTTP 200 `image/png` y wordmark visible al recargar Gmail | `PASS`; se conserva al retirar el canary |

## Matriz de compatibilidad

| Cliente | Revisión | Redirect | Registro | Discovery | Login + consentimiento | Claims redactados | Allow read | Refresh / revocación | Resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| helper TASK-1832 | `task-1832-v1` | loopback dinámico `/callback` | DCR públicos `dcr-UObj…` y `dcr-KyB…` | metadata/JWKS/PRM live | organización exacta, sólo `efeonce.mcp.read`; la guarda confirmó `organizationIdMatches=true` | `iss`/`aud`/`azp` válidos; fingerprint `75eb972f8b2f1eae`; `gv=6`; `exp` presente | `get_seo_entitlement` | refresh rotó; familia revocada; refresh posterior `invalid_grant` | `PASS` |
| Claude Code | `2.1.186` | `http://127.0.0.1:18432/callback` | pre-registrado DCR `dcr-PUG…` | descubrió PRM/AS | no llegó al consentimiento: solicitó catálogo completo, scopes cualificados duplicados y writes; emisor rechazó `invalid_scope` | no emitidos | no ejecutado | no emitidos | `FAIL — TASK-1813` |
| Claude Desktop/web | no operado | HTTPS hospedado | no verificado | no verificado | no verificado | no emitidos | no ejecutado | no emitidos | `PENDIENTE` |
| Codex | `0.153.4` | `http://127.0.0.1:<dinámico>/callback` | DCR público limitado `dcr-BUH…` | PRM/AS live | intento descubierto con scopes extra rechazado; retry sin scopes mostró la organización exacta y sólo lectura; autorizado | token aceptado por gateway; sin exponer token/subject | sesión nueva listó e invocó `get_seo_entitlement`; `no_entitlement`, cero gasto | OAuth del cliente válido; rotación/revocación cubierta por helper | `PASS` |
| ChatGPT | no operado | HTTPS hospedado | no verificado | no verificado | no verificado | no emitidos | no ejecutado | no emitidos | `PENDIENTE` |

En Codex el callback local termina visualmente en `ERR_BLOCKED_BY_CLIENT` dentro del Chrome controlado por
ChatGPT. El listener ya había recibido el code: el CLI reportó `Successfully logged in` y una sesión nueva
completó la lectura. Es una deuda de cierre visual del cliente local, no un fallo OAuth del emisor.

La fila Claude permanece roja. No se amplió la allowlist ni se autorizó ningún write para forzar un verde. El
hallazgo vuelve a `TASK-1813`, dueña de interoperabilidad de clientes.

## Pruebas negativas de protocolo y policy

| Caso | Evidencia live productiva | Resultado |
| --- | --- | --- |
| Base-only sobre write | `track_seo_keywords` oculto; llamada directa `403 insufficient_scope`; challenge anuncia `efeonce.mcp.seo.write` | `PASS` |
| Externo sobre internal-only | `get_seo_keyword_opportunities` oculto; llamada directa rechazada antes de dispatch | `PASS` |
| Authority revocada | grant temporal revocado por command; token anterior pasó a `401 invalid_token` en `19.272 s` | `PASS` |
| Sin consentimiento | cada DCR nuevo mostró consentimiento; no hubo `prompt=none` ni grant implícito | `PASS` |
| Access token expirado | ceremonia independiente `dcr-N7Q…`, fingerprint `75eb972f8b2f1eae`, `gv=6`; esperó `899 s` y recibió `401 invalid_token` con challenge canónico antes de rotar o revocar la familia | `PASS` |
| Refresh/familia | refresh rotativo; `/oauth/revoke` invalidó la familia y el refresh viejo devolvió `invalid_grant` | `PASS` |

El primer ensayo de tiempo de revocación agotó 60 s mientras el operador DB aún no había ejecutado el command;
no cuenta como evidencia. Se revocó esa authority, se otorgó un grant temporal nuevo y se repitió de punta a
punta; sólo la segunda medición de `19.272 s` cuenta.

## Igualdad de sujeto

| Persona `smoke_test` | Fingerprint loopback | Fingerprint hospedado | Resultado |
| --- | --- | --- | --- |
| M365 canary | `75eb972f8b2f1eae` | no operado | `PENDIENTE`: no se infiere igualdad sin cliente hospedado |

## Cleanup y observación

Dry-run post-clientes, sin mutación:

- grafo exacto: `2` profiles, `2` source links, `5` invitaciones y `14` clientes DCR run-owned;
- auth: `12` sesiones, `8` magic links, `2` passkeys, `5` challenges, `13` codes/consents, `18` refresh,
  `18` access tokens y `4` contexts client-scoped;
- sesiones humanas canary activas `0`; la credencial passkey activa se conserva para la ventana;
- authority: tres grants inventariados, dos revocados y uno activo read-only; binding `gv=6`;
- `unexpectedRefs=0`; lifecycle/comercial/360/hiring/finance y demás FKs no esperadas en `0`;
- los cuatro DCR usados durante el diagnóstico de la sesión interna están marcados con el `run_id`; su retiro
  borra sólo hijos OAuth por `client_id` y conserva la sesión/identidad compartida;
- `deletionReady=false` sólo por blockers esperados durante la observación:
  `registration_active|active_authority|active_auth`.

No se ejecuta `--apply` antes de `delete_after`. El cierre exige cortar authority, releer deny, obtener
`deletionReady=true`, aplicar con el ID exacto y confirmar cero para todo el grafo run-owned. El environment,
los buzones, deliveries/audit y el wordmark público son compartidos o evidencia retenida y nunca se borran.

## Veredicto

`NO CERTIFICADO AÚN — runtime productivo, helper/Codex y las cinco negativas están verdes; Claude Code,
clientes hospedados, siete días de observación y cleanup/readback final siguen abiertos.`
